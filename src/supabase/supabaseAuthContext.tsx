import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import {
  UserRole,
  RolePermissions,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  StoreMember,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
} from '../types/pos';
import {
  saveProductToSupabase,
  saveCategoryToSupabase,
  saveStoreSettingsToSupabase,
} from './supabaseDbService';

// Session timeout: 5 hours inactivity limit (18,000,000 ms = 5 * 60 * 60 * 1000)
export const SESSION_MAX_INACTIVITY_MS = 5 * 60 * 60 * 1000;
export const SESSION_LAST_ACTIVE_KEY = 'kasirku_session_last_active';
export const SESSION_EXPIRED_NOTICE_KEY = 'kasirku_session_expired_notice';

export const isSessionActiveAndValid = (): boolean => {
  try {
    const lastActiveStr = localStorage.getItem(SESSION_LAST_ACTIVE_KEY);
    if (!lastActiveStr) {
      return true;
    }
    const lastActive = parseInt(lastActiveStr, 10);
    if (isNaN(lastActive)) return true;
    return Date.now() - lastActive < SESSION_MAX_INACTIVITY_MS;
  } catch {
    return true;
  }
};

export const updateSessionActivity = () => {
  try {
    localStorage.setItem(SESSION_LAST_ACTIVE_KEY, Date.now().toString());
  } catch {}
};

export const clearSessionStorage = () => {
  try {
    localStorage.removeItem('kasirku_cached_user_profile');
    localStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
  } catch {}
};

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  permissions: RolePermissions;
  activeStoreId: string;
  storeName: string;
  memberId?: string;
  createdAt: string;
}

interface AuthContextType {
  currentUser: SupabaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  sessionExpired: boolean;
  isPasswordRecovery: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  cancelPasswordRecovery: () => void;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  logout: (isExpired?: boolean) => Promise<void>;
  clearError: () => void;
  refreshUserProfile: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Seed store default settings into Supabase if empty (starts clean from zero: no products, no demo catalog)
async function seedDefaultStoreIfEmpty(storeId: string, storeName: string) {
  try {
    // 1. Check & seed default store settings
    const { data: settingsData } = await supabase
      .from('store_settings')
      .select('store_id')
      .eq('store_id', storeId)
      .single();

    if (!settingsData) {
      await saveStoreSettingsToSupabase(storeId, {
        ...INITIAL_STORE_SETTINGS,
        storeName: storeName || 'VarzyPos',
      });
    }

    // New stores start completely from zero:
    // No demo products and no demo categories are seeded, giving the new owner a clean slate.
  } catch (err) {
    console.warn('[Supabase Seed Notice]:', err);
  }
}

// Resolves or creates user store profile in Supabase
async function resolveUserProfileFromSupabase(
  user: SupabaseUser,
  customName?: string,
  customStoreName?: string
): Promise<UserProfile> {
  const emailNorm = (user.email || '').toLowerCase().trim();
  const displayName =
    customName ||
    user.user_metadata?.full_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.name ||
    (emailNorm ? emailNorm.split('@')[0] : 'Pengguna KasirKu');

  const metaAvatar =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    user.user_metadata?.photo_url ||
    null;

  // 1. Try to read from user_profiles table in Supabase
  const { data: existingProfile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('uid', user.id)
    .single();

  if (existingProfile && !profileErr) {
    // SECURITY & MEMBERSHIP CHECK:
    // If the profile role is NOT owner, verify that the member is still active in store_members for this store!
    if (existingProfile.role !== 'owner') {
      const targetStoreId = existingProfile.active_store_id;
      const { data: memActive } = await supabase
        .from('store_members')
        .select('*')
        .eq('store_id', targetStoreId)
        .or(`email.eq.${emailNorm},uid.eq.${user.id}`)
        .limit(1);

      if (!memActive || memActive.length === 0) {
        // The member was DELETED by the store owner!
        // Delete stale user_profile and sign out so they cannot access the store
        await supabase.from('user_profiles').delete().eq('uid', user.id).catch(() => {});
        await supabase.auth.signOut().catch(() => {});
        throw new Error(
          'Akses akun Anda telah dinonaktifkan atau dihapus dari tim oleh pemilik toko. Hubungi pemilik toko untuk mendapatkan akses kembali.'
        );
      }

      // Member is active: take the latest name, permissions and avatar from store_members!
      const activeMem = memActive[0];
      const resolvedAvatar =
        activeMem.avatar_url ||
        activeMem.permissions?.avatarUrl ||
        existingProfile.permissions?.avatarUrl ||
        metaAvatar;

      const profile: UserProfile = {
        uid: user.id,
        email: existingProfile.email || emailNorm,
        displayName: activeMem.name || existingProfile.display_name || displayName,
        avatarUrl: resolvedAvatar || undefined,
        role: (activeMem.role as UserRole) || (existingProfile.role as UserRole) || 'kasir',
        permissions: activeMem.permissions || existingProfile.permissions || DEFAULT_STAFF_PERMISSIONS,
        activeStoreId: targetStoreId,
        storeName: existingProfile.store_name || customStoreName || 'VarzyPos',
        memberId: activeMem.id || existingProfile.member_id,
        createdAt: activeMem.created_at || existingProfile.created_at || new Date().toISOString(),
      };
      return profile;
    }

    // Role is owner:
    const avatarUrl =
      existingProfile.permissions?.avatarUrl ||
      existingProfile.avatar_url ||
      metaAvatar;

    const profile: UserProfile = {
      uid: user.id,
      email: existingProfile.email || emailNorm,
      displayName: existingProfile.display_name || displayName,
      avatarUrl: avatarUrl || undefined,
      role: 'owner',
      permissions: existingProfile.permissions || DEFAULT_OWNER_PERMISSIONS,
      activeStoreId: existingProfile.active_store_id || `store-${user.id}`,
      storeName: existingProfile.store_name || customStoreName || 'VarzyPos',
      memberId: existingProfile.member_id || `member-${user.id}`,
      createdAt: existingProfile.created_at || new Date().toISOString(),
    };

    // Ensure store catalog is seeded
    seedDefaultStoreIfEmpty(profile.activeStoreId, profile.storeName).catch(() => {});
    return profile;
  }

  // 2. Check if user is an invited member in store_members
  const { data: memberRows } = await supabase
    .from('store_members')
    .select('*')
    .or(`email.eq.${emailNorm},uid.eq.${user.id}`)
    .limit(1);

  if (memberRows && memberRows.length > 0) {
    const member = memberRows[0];
    const role: UserRole = (member.role as UserRole) || 'kasir';
    const permissions: RolePermissions =
      member.permissions || (role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS);

    const avatarUrl =
      member.avatar_url ||
      member.permissions?.avatarUrl ||
      metaAvatar;

    // Get store name
    const { data: storeRow } = await supabase
      .from('stores')
      .select('name')
      .eq('id', member.store_id)
      .single();

    const storeName = storeRow?.name || 'VarzyPos';

    const profile: UserProfile = {
      uid: user.id,
      email: emailNorm,
      displayName: member.name || displayName,
      avatarUrl: avatarUrl || undefined,
      role,
      permissions,
      activeStoreId: member.store_id,
      storeName,
      memberId: member.id,
      createdAt: member.created_at || new Date().toISOString(),
    };

    // Update member record with user's Supabase auth UID
    await supabase.from('store_members').update({ uid: user.id }).eq('id', member.id);

    // Save profile to user_profiles table
    await supabase.from('user_profiles').upsert({
      uid: user.id,
      email: emailNorm,
      display_name: profile.displayName,
      role,
      active_store_id: profile.activeStoreId,
      store_name: profile.storeName,
      member_id: member.id,
      permissions: { ...permissions, avatarUrl },
      updated_at: new Date().toISOString(),
    });

    seedDefaultStoreIfEmpty(profile.activeStoreId, profile.storeName).catch(() => {});
    return profile;
  }

  // 3. User is a new Store Owner
  // If user metadata indicates they are an employee account that was removed, reject
  if (user.user_metadata?.role && user.user_metadata.role !== 'owner') {
    await supabase.auth.signOut().catch(() => {});
    throw new Error(
      'Akses akun Anda telah dinonaktifkan atau dihapus dari tim oleh pemilik toko. Hubungi pemilik toko untuk mendapatkan akses kembali.'
    );
  }

  const storeId = `store-${user.id}`;
  const storeName = customStoreName || 'VarzyPos';
  const memberId = `member-${user.id}`;
  const initialAvatar = metaAvatar;

  // Insert store
  await supabase.from('stores').upsert(
    {
      id: storeId,
      name: storeName,
      owner_uid: user.id,
      owner_email: emailNorm,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  // Insert owner member
  await supabase.from('store_members').upsert(
    {
      id: memberId,
      store_id: storeId,
      uid: user.id,
      email: emailNorm,
      name: displayName,
      username: emailNorm ? emailNorm.split('@')[0] : 'owner',
      role: 'owner',
      permissions: { ...DEFAULT_OWNER_PERMISSIONS, avatarUrl: initialAvatar },
      invited_by: 'System',
    },
    { onConflict: 'id' }
  );

  // Insert user profile
  const profile: UserProfile = {
    uid: user.id,
    email: emailNorm,
    displayName,
    avatarUrl: initialAvatar || undefined,
    role: 'owner',
    permissions: DEFAULT_OWNER_PERMISSIONS,
    activeStoreId: storeId,
    storeName,
    memberId,
    createdAt: new Date().toISOString(),
  };

  await supabase.from('user_profiles').upsert(
    {
      uid: user.id,
      email: emailNorm,
      display_name: displayName,
      role: 'owner',
      active_store_id: storeId,
      store_name: storeName,
      member_id: memberId,
      permissions: { ...DEFAULT_OWNER_PERMISSIONS, avatarUrl: initialAvatar },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'uid' }
  );

  // Seed default catalog & settings into Supabase
  seedDefaultStoreIfEmpty(storeId, storeName).catch(() => {});

  return profile;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('kasirku_cached_user_profile');
      if (cached && isSessionActiveAndValid()) {
        return JSON.parse(cached);
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Check if URL contains password recovery hash/query
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setIsPasswordRecovery(true);
      }
    } catch {}

    // Check if session was previously flagged as expired
    try {
      if (localStorage.getItem(SESSION_EXPIRED_NOTICE_KEY) === 'true') {
        setSessionExpired(true);
      }
    } catch {}

    // Initial Supabase Session Check
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.warn('[Supabase Auth getSession error]:', sessionError);
      }

      if (session?.user) {
        if (!isSessionActiveAndValid()) {
          console.warn('[Session] Session expired due to 5h inactivity on initial load.');
          logout(true);
          setLoading(false);
          return;
        }

        updateSessionActivity();
        setCurrentUser(session.user);
        resolveUserProfileFromSupabase(session.user)
          .then((profile) => {
            setUserProfile(profile);
            try {
              localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(profile));
            } catch {}
          })
          .catch((e) => console.warn('Profile resolution notice:', e))
          .finally(() => setLoading(false));
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Listen for auth state changes from Supabase (sign in, sign out, token refresh, recovery, OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        if (session?.user) {
          setCurrentUser(session.user);
        }
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          if (!isSessionActiveAndValid()) {
            logout(true);
            return;
          }

          updateSessionActivity();
          setSessionExpired(false);
          try {
            localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
          } catch {}

          setCurrentUser(session.user);
          const profile = await resolveUserProfileFromSupabase(session.user);
          setUserProfile(profile);
          try {
            localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(profile));
          } catch {}
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserProfile(null);
        clearSessionStorage();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 5-Hour Inactivity Session Tracking
  useEffect(() => {
    if (!currentUser && !userProfile) return;

    let lastRecorded = Date.now();
    updateSessionActivity();

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 15000) {
        lastRecorded = now;
        updateSessionActivity();
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Periodic check every 30 seconds
    const interval = setInterval(async () => {
      if (!isSessionActiveAndValid()) {
        console.warn('[Session] 5 hours inactivity reached. Auto logging out.');
        events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
        await logout(true);
      }
    }, 30000);

    // Tab visibility check
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (!isSessionActiveAndValid()) {
          console.warn('[Session] 5 hours inactivity detected on tab return. Auto logging out.');
          await logout(true);
        } else {
          handleUserActivity();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, userProfile]);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const msg = err instanceof Error ? err.message : 'Gagal login dengan Google';
      setError(msg);
      throw err;
    }
  };

  const signInWithEmail = async (emailOrUsername: string, pass: string) => {
    setError(null);
    const cleanInput = emailOrUsername.trim().toLowerCase();

    // 1. Direct Employee / Staff Login from Supabase store_members
    try {
      const { data: memberRows } = await supabase
        .from('store_members')
        .select('*')
        .or(`email.eq.${cleanInput},username.eq.${cleanInput}`);

      if (memberRows && memberRows.length > 0) {
        // If the same username/email belongs to multiple stores, match by password to isolate the exact tenant/store
        const matchedMember =
          memberRows.find((m) => {
            const saved = m.permissions?._auth_password;
            return saved && saved === pass;
          }) || memberRows[0];

        const mem = matchedMember;
        const savedPass = mem.permissions?._auth_password;

        // Also check local registry if present
        let localPass: string | null = null;
        try {
          const reg = JSON.parse(localStorage.getItem('kasirku_member_auth_registry') || '{}');
          const entry =
            reg[mem.username] ||
            reg[mem.email] ||
            Object.values(reg).find((i: any) => i?.email === mem.email || i?.username === mem.username);
          if (entry?.password) localPass = entry.password;
        } catch {}

        const effectivePass = savedPass || localPass;

        // If password matches, or if no password was saved yet for this member (adopt entered pass):
        if (effectivePass === pass || !effectivePass) {
          if (!savedPass) {
            const updatedPerms = { ...(mem.permissions || {}), _auth_password: pass };
            await supabase.from('store_members').update({ permissions: updatedPerms }).eq('id', mem.id);
          }

          // Get store name
          const { data: storeRow } = await supabase
            .from('stores')
            .select('name')
            .eq('id', mem.store_id)
            .single();

          const role: UserRole = (mem.role as UserRole) || 'kasir';
          const permissions: RolePermissions =
            mem.permissions || (role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS);

          const profile: UserProfile = {
            uid: mem.uid || mem.id,
            email: mem.email,
            displayName: mem.name || mem.username,
            avatarUrl: mem.avatar_url || (mem.permissions as any)?.avatarUrl || undefined,
            role,
            permissions,
            activeStoreId: mem.store_id,
            storeName: storeRow?.name || 'VarzyPos',
            memberId: mem.id,
            createdAt: mem.created_at || new Date().toISOString(),
          };

          updateSessionActivity();
          setSessionExpired(false);
          try {
            localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
          } catch {}

          setUserProfile(profile);
          try {
            localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(profile));
          } catch {}
          return;
        } else {
          const msg = 'Kata sandi akun karyawan salah. Silakan periksa kembali kata sandi Anda.';
          setError(msg);
          throw new Error(msg);
        }
      }
    } catch (staffErr: any) {
      if (staffErr.message?.includes('Kata sandi')) {
        throw staffErr;
      }
      console.warn('[Staff login check notice]:', staffErr);
    }

    // 2. Standard login via Supabase Auth (for Owner / Admin with Supabase Auth credentials)
    let resolvedEmail = cleanInput;
    if (!resolvedEmail.includes('@')) {
      const message = `Username "${emailOrUsername}" tidak ditemukan di daftar anggota tim. Masukkan email lengkap akun Anda.`;
      setError(message);
      throw new Error(message);
    }

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: pass,
      });

      if (signInErr) {
        let msg = signInErr.message;
        if (msg.includes('Invalid login credentials')) {
          const { data: profileRows } = await supabase
            .from('user_profiles')
            .select('uid, email')
            .eq('email', resolvedEmail)
            .limit(1);

          if (profileRows && profileRows.length > 0) {
            msg = `Email "${resolvedEmail}" terdaftar menggunakan akun Google (belum memiliki password terpisah). Silakan masuk dengan tombol "Lanjutkan dengan Google", atau gunakan tautan "Lupa password?" di bawah untuk membuat password email akun ini.`;
          } else {
            msg = 'Email atau password yang Anda masukkan salah. Jika belum memiliki akun, silakan pilih tab "Daftar" untuk mendaftar akun baru.';
          }
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Email belum diverifikasi. Buka kotak masuk email Anda dan klik tautan konfirmasi dari Supabase, atau matikan opsi "Confirm email" di Supabase Dashboard (Authentication > Providers > Email).';
        }
        setError(msg);
        throw new Error(msg);
      }

      if (data.user) {
        updateSessionActivity();
        setSessionExpired(false);
        try {
          localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
        } catch {}

        setCurrentUser(data.user);
        const profile = await resolveUserProfileFromSupabase(data.user);
        setUserProfile(profile);
        try {
          localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(profile));
        } catch {}
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Gagal login';
      setError(msg);
      throw err;
    }
  };

  const updateUserPassword = async (newPassword: string) => {
    setError(null);
    try {
      const { data, error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) {
        throw updateErr;
      }
      setIsPasswordRecovery(false);
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}

      if (data.user) {
        updateSessionActivity();
        setSessionExpired(false);
        setCurrentUser(data.user);
        const profile = await resolveUserProfileFromSupabase(data.user);
        setUserProfile(profile);
        try {
          localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(profile));
        } catch {}
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui kata sandi';
      setError(msg);
      throw err;
    }
  };

  const cancelPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch {}
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            display_name: name.trim(),
            full_name: name.trim(),
          },
        },
      });

      if (signUpErr) {
        let msg = signUpErr.message;
        if (msg.includes('already registered')) {
          msg = 'Alamat email ini sudah terdaftar. Silakan login atau gunakan email lain.';
        }
        setError(msg);
        throw new Error(msg);
      }

      if (data.user) {
        if (!data.session) {
          // Email confirmation is required by Supabase project settings
          const msg = 'Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan verifikasi email Anda atau matikan opsi "Confirm email" di Supabase Dashboard agar bisa langsung masuk.';
          setError(msg);
          return;
        }

        updateSessionActivity();
        setSessionExpired(false);
        setCurrentUser(data.user);
        const profile = await resolveUserProfileFromSupabase(data.user, name.trim(), 'VarzyPos');
        setUserProfile(profile);
        try {
          localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(profile));
        } catch {}
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftar';
      setError(msg);
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    setError(null);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });
      if (resetErr) {
        throw resetErr;
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim email reset password';
      setError(msg);
      throw err;
    }
  };

  const logout = async (isExpired: boolean = false) => {
    try {
      await supabase.auth.signOut();
    } catch {}

    setCurrentUser(null);
    setUserProfile(null);
    clearSessionStorage();

    if (isExpired) {
      setSessionExpired(true);
      try {
        localStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, 'true');
      } catch {}
    } else {
      setSessionExpired(false);
      try {
        localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
      } catch {}
    }

    // Completely lock browser history to prevent browser back navigation
    try {
      window.history.replaceState({ loggedOut: true }, '', window.location.pathname);
      window.history.pushState({ loggedOut: true }, '', window.location.pathname);
    } catch {}
  };

  const clearError = () => setError(null);

  const refreshUserProfile = async () => {
    if (!currentUser && !userProfile) return;
    try {
      if (currentUser) {
        const updated = await resolveUserProfileFromSupabase(currentUser);
        setUserProfile(updated);
        try {
          localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(updated));
        } catch {}
      } else if (userProfile) {
        // Staff user authenticated via store_members
        const { data: memberRows } = await supabase
          .from('store_members')
          .select('*')
          .eq('store_id', userProfile.activeStoreId)
          .or(`id.eq.${userProfile.memberId},email.eq.${userProfile.email}`);

        if (memberRows && memberRows.length > 0) {
          const mem = memberRows[0];
          const updated: UserProfile = {
            ...userProfile,
            displayName: mem.name || userProfile.displayName,
            avatarUrl: mem.avatar_url || (mem.permissions as any)?.avatarUrl || undefined,
            role: (mem.role as UserRole) || userProfile.role,
            permissions: mem.permissions || userProfile.permissions,
          };
          setUserProfile(updated);
          try {
            localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(updated));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  const updateProfile = async (updates: { displayName?: string; avatarUrl?: string }) => {
    if (!userProfile) return;
    try {
      const cleanName = updates.displayName?.trim();
      const cleanAvatar = updates.avatarUrl !== undefined ? updates.avatarUrl.trim() : undefined;

      // 1. Update Supabase Auth user metadata if currentUser exists
      if (currentUser) {
        await supabase.auth.updateUser({
          data: {
            ...(cleanName ? { full_name: cleanName, display_name: cleanName } : {}),
            ...(cleanAvatar !== undefined ? { avatar_url: cleanAvatar } : {}),
          },
        }).catch(() => {});
      }

      // 2. Update user_profiles table in Supabase
      const updatedPerms: any = {
        ...(userProfile.permissions || {}),
        ...(cleanAvatar !== undefined ? { avatarUrl: cleanAvatar } : {}),
      };

      if (userProfile.uid) {
        await supabase
          .from('user_profiles')
          .update({
            ...(cleanName ? { display_name: cleanName } : {}),
            permissions: updatedPerms,
            updated_at: new Date().toISOString(),
          })
          .eq('uid', userProfile.uid);
      } else if (userProfile.email) {
        await supabase
          .from('user_profiles')
          .update({
            ...(cleanName ? { display_name: cleanName } : {}),
            permissions: updatedPerms,
            updated_at: new Date().toISOString(),
          })
          .eq('email', userProfile.email.toLowerCase().trim());
      }

      // 3. Update store_members table in Supabase (isolated to activeStoreId!)
      const storeId = userProfile.activeStoreId;
      if (storeId) {
        let memberFilter = supabase
          .from('store_members')
          .select('id, permissions')
          .eq('store_id', storeId);

        if (userProfile.memberId) {
          memberFilter = memberFilter.eq('id', userProfile.memberId);
        } else if (userProfile.uid) {
          memberFilter = memberFilter.or(`uid.eq.${userProfile.uid},email.eq.${userProfile.email}`);
        } else if (userProfile.email) {
          memberFilter = memberFilter.eq('email', userProfile.email);
        }

        const { data: memberRows } = await memberFilter;
        if (memberRows && memberRows.length > 0) {
          const targetMem = memberRows[0];
          const memberPerms: any = {
            ...(targetMem.permissions || userProfile.permissions || {}),
            ...(cleanAvatar !== undefined ? { avatarUrl: cleanAvatar } : {}),
          };

          await supabase
            .from('store_members')
            .update({
              ...(cleanName ? { name: cleanName } : {}),
              permissions: memberPerms,
            })
            .eq('store_id', storeId)
            .eq('id', targetMem.id);
        }
      }

      const newProfile: UserProfile = {
        ...userProfile,
        displayName: cleanName || userProfile.displayName,
        avatarUrl: cleanAvatar !== undefined ? (cleanAvatar || null) : userProfile.avatarUrl,
        permissions: updatedPerms,
      };

      setUserProfile(newProfile);
      try {
        localStorage.setItem('kasirku_cached_user_profile', JSON.stringify(newProfile));
      } catch {}
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        error,
        sessionExpired,
        isPasswordRecovery,
        signInWithGoogle,
        signInWithEmail,
        sendPasswordReset,
        updateUserPassword,
        cancelPasswordRecovery,
        registerWithEmail,
        logout,
        clearError,
        refreshUserProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
