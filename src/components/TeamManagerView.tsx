import React, { useState, useMemo, useEffect } from 'react';
import {
  StoreMember,
  UserRole,
  RolePermissions,
  DEFAULT_STAFF_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
} from '../types/pos';
import {
  Users,
  UserPlus,
  Shield,
  Crown,
  User,
  Check,
  X,
  Edit2,
  Trash2,
  Mail,
  Lock,
  Sparkles,
  Info,
  ShoppingCart,
  Package,
  History,
  BarChart3,
  LayoutDashboard,
  Settings,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Copy,
  AtSign,
  KeyRound,
  Camera,
  Upload,
  Link as LinkIcon,
  RotateCcw,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { useTranslation } from '../context/LanguageContext';
import { getAvatarUrl, AVATAR_PRESETS, compressAvatarFile } from '../utils/avatar';

export interface AddMemberPayload extends Omit<StoreMember, 'id' | 'createdAt'> {
  username?: string;
  password?: string;
  avatarUrl?: string;
}

interface TeamManagerViewProps {
  members: StoreMember[];
  currentUserId: string;
  currentUserRole: UserRole;
  currentUserName?: string | null;
  currentUserEmail?: string | null;
  currentUserAvatar?: string | null;
  storeName: string;
  storeId: string;
  onAddMember: (
    member: AddMemberPayload
  ) => Promise<{
    success: boolean;
    message?: string;
    createdAuthAccount?: boolean;
    existingAuthAccount?: boolean;
  } | void>;
  onUpdateMember: (member: StoreMember) => Promise<void>;
  onDeleteMember: (memberId: string, email: string, username?: string) => Promise<void>;
  onUpdateProfile?: (updates: { displayName?: string; avatarUrl?: string }) => Promise<void>;
}

export const TeamManagerView: React.FC<TeamManagerViewProps> = ({
  members,
  currentUserId,
  currentUserRole,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  storeName,
  storeId,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onUpdateProfile,
}) => {
  const { t, language } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StoreMember | null>(null);

  // My Profile Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState(currentUserName || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(currentUserAvatar || '');
  const [profileAvatarTab, setProfileAvatarTab] = useState<'email' | 'upload' | 'preset' | 'url'>('email');
  const [isCompressingProfile, setIsCompressingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(currentUserName || '');
    setProfileAvatarUrl(currentUserAvatar || '');
  }, [currentUserName, currentUserAvatar]);

  // Form states (Add/Edit Team Member)
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [memberAvatarUrl, setMemberAvatarUrl] = useState('');
  const [memberAvatarTab, setMemberAvatarTab] = useState<'email' | 'upload' | 'preset' | 'url'>('email');
  const [isCompressingMember, setIsCompressingMember] = useState(false);
  const [role, setRole] = useState<UserRole>('pengguna');
  const [permissions, setPermissions] = useState<RolePermissions>({
    dashboard: true,
    pos: true,
    inventory: false,
    transactions: true,
    reports: false,
    team: false,
    settings: false,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Success summary modal after adding member
  const [successInfo, setSuccessInfo] = useState<{
    username: string;
    email: string;
    password?: string;
    authAccountCreated: boolean;
    existingAuthAccount: boolean;
    name: string;
    role: UserRole;
    message?: string;
  } | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const isOwner = currentUserRole === 'owner';

  // Strictly enforce only 1 Owner: prioritize the active logged-in user if they are an owner,
  // and only consider genuine members with a valid email.
  const soleOwnerId = useMemo(() => {
    if (!Array.isArray(members)) return null;
    const owners = members.filter(
      (m) => m && m.role === 'owner' && m.email && m.email.includes('@') && m.name !== 'Anggota Tim'
    );
    if (owners.length === 0) return null;
    const currentOwner = owners.find((m) => m.uid === currentUserId || m.id === currentUserId);
    if (currentOwner) return currentOwner.id;
    if (owners.length === 1) return owners[0].id;
    const sorted = [...owners].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
      return timeA - timeB;
    });
    return sorted[0].id;
  }, [members, currentUserId]);

  // Clean list: only genuine manually-registered members with a valid email are displayed
  const sanitizedMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    return members
      .filter((m): m is StoreMember => Boolean(m))
      // Strictly exclude invalid, ghost, or placeholder records
      .filter((m) => {
        const email = (m.email || '').trim().toLowerCase();
        const name = (m.name || '').trim();
        const username = (m.username || '').trim().toLowerCase();
        // A genuine member MUST have a valid email containing '@'
        if (!email || !email.includes('@')) return false;
        // Purge placeholder 'Anggota Tim' records
        if (name === 'Anggota Tim' && (username === 'pengguna' || !username)) return false;
        return true;
      })
      .map((m) => {
        const id = m.id || (m as unknown as { uid?: string }).uid || `member-${Math.random()}`;
        const email = (m.email || '').trim().toLowerCase();
        const emailPrefix = email.split('@')[0];
        const name = m.name?.trim() || emailPrefix;
        const username = m.username?.trim().toLowerCase() || emailPrefix;
        const rawRole = m.role || 'pengguna';
        const role: UserRole = rawRole === 'owner' && id !== soleOwnerId ? 'admin' : rawRole;
        const defaultPerms: RolePermissions = {
          dashboard: role === 'owner' || role === 'admin',
          pos: true,
          inventory: role === 'owner' || role === 'admin',
          transactions: true,
          reports: role === 'owner' || role === 'admin',
          team: role === 'owner' || role === 'admin',
          settings: role === 'owner',
        };
        const permissions: RolePermissions = {
          ...defaultPerms,
          ...(m.permissions || {}),
        };

        return {
          ...m,
          id,
          name,
          email,
          username,
          role,
          permissions,
          avatarUrl: m.avatarUrl || (m.permissions as any)?.avatarUrl || undefined,
        };
      });
  }, [members, soleOwnerId]);

  // Auto-clean Firestore if duplicate owners are found
  useEffect(() => {
    if (!Array.isArray(members)) return;
    const owners = members.filter((m) => m && m.role === 'owner');
    if (owners.length > 1 && soleOwnerId) {
      owners.forEach((dup) => {
        if (dup.id !== soleOwnerId) {
          onUpdateMember({ ...dup, role: 'admin' });
        }
      });
    }
  }, [members, soleOwnerId, onUpdateMember]);

  const handleOpenAdd = () => {
    soundFx.playTap();
    setEditingMember(null);
    setUsername('');
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setMemberAvatarUrl('');
    setMemberAvatarTab('email');
    setFormError(null);
    setRole('pengguna');
    setPermissions({
      dashboard: true,
      pos: true,
      inventory: false,
      transactions: true,
      reports: false,
      team: false,
      settings: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: StoreMember) => {
    soundFx.playTap();
    setEditingMember(member);
    const emailPrefix = member.email && member.email.includes('@') ? member.email.split('@')[0] : (member.email || '');
    setUsername(member.username || emailPrefix || '');
    setName(member.name || '');
    setEmail(member.email || '');
    setPassword('');
    const existingAvatar = member.avatarUrl || (member.permissions as any)?.avatarUrl || '';
    setMemberAvatarUrl(existingAvatar);
    setMemberAvatarTab(existingAvatar ? 'upload' : 'email');
    setFormError(null);
    // If this member is not the sole owner, role cannot be owner
    const safeRole = member.id === soleOwnerId ? 'owner' : (member.role === 'owner' ? 'admin' : member.role);
    setRole(safeRole || 'pengguna');
    const defaultPerms: RolePermissions = {
      dashboard: safeRole === 'owner' || safeRole === 'admin',
      pos: true,
      inventory: safeRole === 'owner' || safeRole === 'admin',
      transactions: true,
      reports: safeRole === 'owner' || safeRole === 'admin',
      team: safeRole === 'owner' || safeRole === 'admin',
      settings: safeRole === 'owner',
    };
    setPermissions({
      ...defaultPerms,
      ...(member.permissions || {}),
    });
    setIsModalOpen(true);
  };

  // Presets helper
  const applyPreset = (preset: 'kasir' | 'gudang' | 'laporan' | 'all') => {
    soundFx.playTap();
    if (preset === 'kasir') {
      setRole('pengguna');
      setPermissions({
        dashboard: false,
        pos: true,
        inventory: false,
        transactions: true,
        reports: false,
        team: false,
        settings: false,
      });
    } else if (preset === 'gudang') {
      setRole('pengguna');
      setPermissions({
        dashboard: true,
        pos: false,
        inventory: true,
        transactions: false,
        reports: false,
        team: false,
        settings: false,
      });
    } else if (preset === 'laporan') {
      setRole('pengguna');
      setPermissions({
        dashboard: true,
        pos: false,
        inventory: false,
        transactions: true,
        reports: true,
        team: false,
        settings: false,
      });
    } else if (preset === 'all') {
      setRole('admin');
      setPermissions({
        dashboard: true,
        pos: true,
        inventory: true,
        transactions: true,
        reports: true,
        team: false,
        settings: true,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail || !cleanName) {
      setFormError('Nama dan Email wajib diisi.');
      return;
    }

    if (!editingMember) {
      if (!cleanUsername) {
        setFormError('Username wajib diisi.');
        return;
      }
      if (!cleanPassword || cleanPassword.length < 6) {
        setFormError('Kata sandi (password) wajib diisi minimal 6 karakter.');
        return;
      }
    }

    setIsSaving(true);
    soundFx.playTap();

    try {
      if (editingMember) {
        const updatedPerms: any = {
          ...permissions,
        };
        if (cleanPassword) {
          updatedPerms._auth_password = cleanPassword;
        } else if ((editingMember.permissions as any)?._auth_password) {
          updatedPerms._auth_password = (editingMember.permissions as any)._auth_password;
        }
        if (memberAvatarUrl) {
          updatedPerms.avatarUrl = memberAvatarUrl;
        }

        await onUpdateMember({
          ...editingMember,
          name: cleanName,
          email: cleanEmail,
          username: cleanUsername || editingMember.username,
          avatarUrl: memberAvatarUrl || editingMember.avatarUrl,
          role,
          permissions: updatedPerms,
        });
        setIsModalOpen(false);
      } else {
        const result = await onAddMember({
          storeId,
          email: cleanEmail,
          username: cleanUsername,
          name: cleanName,
          password: cleanPassword,
          avatarUrl: memberAvatarUrl || undefined,
          role,
          permissions,
          invitedBy: currentUserId,
        });

        setIsModalOpen(false);

        // Show success info card with login details
        setSuccessInfo({
          username: cleanUsername,
          email: cleanEmail,
          password: cleanPassword,
          authAccountCreated: result?.createdAuthAccount === true,
          existingAuthAccount: result?.existingAuthAccount === true,
          name: cleanName,
          role,
          message: result && result.message ? result.message : undefined,
        });
      }
    } catch (err: unknown) {
      console.error('Error saving member:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan data anggota tim.';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      soundFx.playWarning();
      return;
    }
    soundFx.playTap();
    setIsSaving(true);
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          displayName: profileName.trim(),
          avatarUrl: profileAvatarUrl.trim(),
        });
      }
      soundFx.playSuccessChime();
      setProfileSuccessMsg('Profil dan foto berhasil diperbarui!');
      setTimeout(() => {
        setProfileSuccessMsg(null);
        setIsProfileModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Gagal memperbarui profil: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!successInfo) return;
    const passwordLine = successInfo.password
      ? `- Password: ${successInfo.password}`
      : successInfo.existingAuthAccount
      ? '- Password: gunakan password yang sudah terdaftar sebelumnya; password baru tidak dibuat.'
      : '- Login password belum tersedia; lihat petunjuk pada aplikasi.';
    const textToCopy = `Halo ${successInfo.name},\nBerikut akun akses kasir untuk toko ${storeName}:\n- Username: ${successInfo.username}\n- Email: ${successInfo.email}\n${passwordLine}\n- Peran: ${successInfo.role === 'admin' ? 'Admin' : 'Kasir / Staff'}\nSilakan login ke aplikasi.`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedNotice(true);
    soundFx.playSuccessChime();
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const handleDelete = async (member: StoreMember) => {
    if (member.id === soleOwnerId && (member.uid === currentUserId || member.id === currentUserId)) {
      alert('Akun Owner utama yang sedang aktif tidak dapat dihapus.');
      return;
    }
    const displayName = member.name || member.username || member.email || 'anggota ini';
    const displayEmail = member.email ? ` (${member.email})` : '';
    if (
      confirm(
        `Apakah Anda yakin ingin menghapus akses tim untuk "${displayName}"${displayEmail}?`
      )
    ) {
      soundFx.playTap();
      await onDeleteMember(member.id, member.email || '', member.username || '');
    }
  };

  const filteredMembers = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return sanitizedMembers.filter((m) => {
      if (!q) return true;
      const name = (m.name || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const uname = (m.username || '').toLowerCase();
      return name.includes(q) || email.includes(q) || uname.includes(q);
    });
  }, [sanitizedMembers, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              {language === 'en' ? 'Multi-User Collaboration' : 'Kolaborasi Multi-User'}
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              {language === 'en' ? 'Store: ' : 'Toko: '}<strong className="text-neutral-900 dark:text-white">{storeName}</strong>
            </span>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mt-1 truncate">
            {t.team.title}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t.team.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 w-full sm:w-auto">
          {isOwner && (
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.team.addMember}</span>
            </button>
          )}
        </div>
      </div>

      {/* Profil Saya: Quick Card & Opsi Ganti Profil */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={getAvatarUrl({
                email: currentUserEmail,
                avatarUrl: currentUserAvatar,
                name: currentUserName || 'Pengguna',
              })}
              alt={currentUserName || 'Profil Saya'}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xs bg-white dark:bg-neutral-800"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  currentUserName || 'User'
                )}&radius=50`;
              }}
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-xs border-2 border-white dark:border-neutral-900">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                {currentUserName || 'Pengguna KasirKu'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {currentUserRole === 'owner' ? 'Owner Utama' : currentUserRole === 'admin' ? 'Admin' : 'Kasir'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="truncate">{currentUserEmail || 'Tidak ada email'}</span>
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">·</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Gambar profil tersinkron dengan email
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundFx.playTap();
            setIsProfileModalOpen(true);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Camera className="w-4 h-4 text-emerald-600" />
          <span>Ganti Profil & Foto</span>
        </button>
      </div>

      {/* Info Card: Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Crown className="w-4 h-4 text-amber-600" />
            <span>Role: Owner ({language === 'en' ? 'Sole Store Owner' : 'Satu-Satunya Pemilik'})</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-snug">
            {language === 'en'
              ? 'Assigned automatically to the first account registered. Strictly 1 owner with permanent full control.'
              : 'Otomatis disematkan khusus pada akun yang pertama kali login/mendaftar toko. Hanya ada 1 Owner (tidak ada duanya) dengan kontrol kepemilikan penuh.'}
          </p>
        </div>

        <div className="p-4 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
            <Shield className="w-4 h-4 text-sky-600" />
            <span>Role: Admin</span>
          </div>
          <p className="text-[11px] text-sky-800 leading-snug">
            {language === 'en'
              ? 'Helps manage store operations, items, sales transactions, and receipt settings.'
              : 'Membantu mengelola operasional toko, produk, transaksi penjualan, dan pengaturan nota.'}
          </p>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Role: {language === 'en' ? 'Staff Cashier / Operator' : 'Pengguna (Kasir / Staff)'}</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-snug">
            {language === 'en'
              ? 'Permissions customized by Owner (e.g. cashier-only, warehouse inventory, or report analyst).'
              : 'Fitur dibatasi spesifik oleh Owner (misal: User A hanya kasir, User B urus stok, User C analisis laporan).'}
          </p>
        </div>
      </div>

      {/* Success Notification Modal when a member is added */}
      {successInfo && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {language === 'en' ? 'Team Member Successfully Added' : 'Anggota Tim Berhasil Ditambahkan'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {successInfo.authAccountCreated
                    ? (language === 'en' ? 'Account ready with credentials below.' : 'Akun siap digunakan dengan email dan password di bawah.')
                    : (language === 'en' ? 'Store access granted. Review instructions below.' : 'Akses toko ditambahkan. Periksa petunjuk di bawah sebelum login.')}
                </p>
              </div>
            </div>

            {successInfo.message && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">{successInfo.message}</p>
              </div>
            )}

            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">{language === 'en' ? 'Staff Name:' : 'Nama Petugas:'}</span>
                <span className="font-bold text-neutral-900">{successInfo.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">Username:</span>
                <span className="font-mono font-bold text-emerald-700">@{successInfo.username}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-neutral-200/60">
                <span className="text-neutral-500">Email:</span>
                <span className="font-mono text-neutral-900 font-semibold">{successInfo.email}</span>
              </div>
              {successInfo.password && (
                <div className="flex justify-between items-center py-1 border-b border-neutral-200/60">
                  <span className="text-neutral-500">{language === 'en' ? 'Password:' : 'Password:'}</span>
                  <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    {successInfo.password}
                  </span>
                </div>
              )}
              {successInfo.existingAuthAccount && (
                <p className="py-1 text-amber-800">
                  {language === 'en'
                    ? 'Use the existing registered password for this email. Newly entered password does not override existing Auth.'
                    : 'Gunakan password yang sudah terdaftar untuk email ini. Password yang baru dimasukkan owner tidak mengubah password Firebase.'}
                </p>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-500">{t.team.colRole}:</span>
                <span className="font-semibold text-neutral-900 capitalize">
                  {successInfo.role === 'admin' ? t.nav.roleAdmin : t.nav.roleCashier}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 text-neutral-600" />
                <span>{copiedNotice ? (language === 'en' ? 'Copied to Clipboard!' : 'Tersalin ke Clipboard!') : (language === 'en' ? 'Copy Account Info' : 'Salin Info Akun')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSuccessInfo(null)}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Done' : 'Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'en' ? `Team Members (${sanitizedMembers.length})` : `Daftar Anggota Tim (${sanitizedMembers.length})`}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'en' ? `Users with authorized access to ${storeName}` : `Pengguna yang memiliki akses ke database toko ${storeName}`}
            </p>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'en' ? 'Search name, username, or email...' : 'Cari nama, username, atau email...'}
            className="px-3.5 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"
          />
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {filteredMembers.map((member) => {
            const isSelf = member.uid === currentUserId;

            return (
              <div
                key={member.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
              >
                {/* Member Identity with Email Avatar */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={getAvatarUrl({
                        email: member.email,
                        avatarUrl: member.avatarUrl || (member.permissions as any)?.avatarUrl,
                        name: member.name || member.username,
                      })}
                      alt={member.name || 'Member Avatar'}
                      className="w-11 h-11 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-2xs bg-white dark:bg-neutral-800"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          member.name || member.username || 'User'
                        )}&radius=50`;
                      }}
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-2xs ${
                        member.role === 'owner'
                          ? 'bg-amber-500 text-white'
                          : member.role === 'admin'
                          ? 'bg-sky-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {member.role === 'owner' ? (
                        <Crown className="w-2.5 h-2.5" />
                      ) : member.role === 'admin' ? (
                        <Shield className="w-2.5 h-2.5" />
                      ) : (
                        <User className="w-2.5 h-2.5" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {member.name || member.username || member.email}
                      </h4>
                      {member.username && (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono font-medium bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          @{member.username}
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold px-2 py-0.2 rounded-full">
                          {language === 'en' ? 'Your Account' : 'Akun Anda'}
                        </span>
                      )}
                      {member.role === 'owner' ? (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 dark:border-amber-700 shadow-2xs">
                          <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          {language === 'en' ? 'Owner (Sole Owner)' : 'Owner (Pemilik Utama)'}
                        </span>
                      ) : member.role === 'admin' ? (
                        <span className="text-[10px] bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-bold px-2 py-0.2 rounded-full flex items-center gap-1 border border-sky-200 dark:border-sky-800">
                          <Shield className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          {t.nav.roleAdmin}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.2 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                          <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {t.nav.roleCashier}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex-wrap">
                      {member.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-neutral-400" />
                          <span>{member.email}</span>
                        </span>
                      )}
                      {member.email && <span className="text-neutral-300 dark:text-neutral-700">·</span>}
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        {member.uid
                          ? (language === 'en' ? 'Status: Active' : 'Status: Terhubung (Aktif)')
                          : (language === 'en' ? 'Status: Ready to login' : 'Status: Siap Login')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Permissions Pills */}
                <div className="flex flex-wrap items-center gap-1.5 lg:max-w-md">
                  {member.permissions?.pos && (
                    <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3 text-emerald-600" />
                      {t.nav.pos}
                    </span>
                  )}
                  {member.permissions?.inventory && (
                    <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <Package className="w-3 h-3 text-amber-600" />
                      {t.nav.inventory}
                    </span>
                  )}
                  {member.permissions?.reports && (
                    <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <BarChart3 className="w-3 h-3 text-indigo-600" />
                      {t.nav.reports}
                    </span>
                  )}
                  {member.permissions?.transactions && (
                    <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <History className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                      {t.nav.transactions}
                    </span>
                  )}
                  {member.permissions?.dashboard && (
                    <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <LayoutDashboard className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                      {t.nav.dashboard}
                    </span>
                  )}
                  {member.permissions?.settings && (
                    <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <Settings className="w-3 h-3 text-neutral-600 dark:text-neutral-400" />
                      {t.nav.settings}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {isOwner && (
                  <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title={language === 'en' ? 'Manage Role & Permissions' : 'Atur Hak Akses & Peran'}
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{language === 'en' ? 'Manage Access' : 'Atur Akses'}</span>
                    </button>
                    {!isSelf && (
                      <button
                        onClick={() => handleDelete(member)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title={language === 'en' ? 'Remove Team Member' : 'Hapus Anggota Tim'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                  {editingMember?.role === 'owner'
                    ? t.team.modalTitleEditOwner
                    : editingMember
                    ? t.team.modalTitleEdit
                    : t.team.modalTitleAdd}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Banner info when editing the single Owner */}
            {editingMember?.role === 'owner' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">{t.team.ownerBannerTitle}</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-snug">
                    {t.team.ownerBannerDesc}
                  </p>
                </div>
              </div>
            )}

            {/* Error Banner inside Modal */}
            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-rose-900 dark:text-rose-200">{t.team.failAddMember}</p>
                  <p className="text-[11px] leading-relaxed">{formError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Row: Username & Nama Lengkap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1">
                    <AtSign className="w-3.5 h-3.5 text-neutral-500" />
                    {t.team.labelUsername} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    placeholder={t.team.placeholderUsername}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {t.team.labelUsernameDesc}
                  </p>
                </div>

                {/* Nama Petugas */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-neutral-500" />
                    {t.team.labelName} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.team.placeholderName}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {t.team.labelNameDesc}
                  </p>
                </div>
              </div>

              {/* Row: Email & Kata Sandi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email Anggota */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-neutral-500" />
                    {t.team.labelEmail} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.team.placeholderEmail}
                    disabled={editingMember?.role === 'owner'}
                    className="w-full px-3.5 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-neutral-100 dark:disabled:bg-neutral-800/40 disabled:text-neutral-500"
                  />
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {t.team.labelEmailDesc}
                  </p>
                </div>

                {/* Password (Wajib untuk Tambah Anggota Baru) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
                    {t.team.labelPassword} {!editingMember && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingMember}
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingMember ? t.team.placeholderPasswordEdit : t.team.placeholderPasswordNew}
                      className="w-full pl-3.5 pr-8 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {t.team.labelPasswordDesc}
                  </p>
                </div>
              </div>

              {/* Foto Profil Anggota Tim */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    Foto Profil Anggota
                  </span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    Otomatis sinkron dengan email
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={getAvatarUrl({ email, avatarUrl: memberAvatarUrl, name: name || username })}
                      alt="Preview Foto Anggota"
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-850 shadow-2xs"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          name || username || 'Member'
                        )}&radius=50`;
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setMemberAvatarUrl('');
                          setMemberAvatarTab('email');
                        }}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-colors cursor-pointer ${
                          memberAvatarTab === 'email' && !memberAvatarUrl
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        Auto Email
                      </button>

                      <label className="px-2.5 py-1 text-[11px] rounded-lg font-medium bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-emerald-500 flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>{isCompressingMember ? 'Memproses...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsCompressingMember(true);
                              try {
                                const base64 = await compressAvatarFile(file);
                                setMemberAvatarUrl(base64);
                                setMemberAvatarTab('upload');
                              } finally {
                                setIsCompressingMember(false);
                              }
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setMemberAvatarTab('preset')}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-colors cursor-pointer ${
                          memberAvatarTab === 'preset'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        Pilih Karakter
                      </button>

                      {memberAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setMemberAvatarUrl('');
                            setMemberAvatarTab('email');
                          }}
                          className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Hapus foto kustom"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {memberAvatarTab === 'preset' && (
                  <div className="grid grid-cols-6 gap-1.5 pt-1.5 max-h-28 overflow-y-auto p-1 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    {AVATAR_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setMemberAvatarUrl(p.url)}
                        className={`p-0.5 rounded-lg border transition-all cursor-pointer ${
                          memberAvatarUrl === p.url
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-transparent hover:border-neutral-300'
                        }`}
                        title={p.name}
                      >
                        <img src={p.url} alt={p.name} className="w-9 h-9 rounded-md object-cover mx-auto" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pilihan Role */}
              {editingMember?.role !== 'owner' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
                    {t.team.labelRole}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRole('admin');
                        setPermissions({ ...permissions, team: false, settings: true });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        role === 'admin'
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-900 dark:text-sky-300 ring-1 ring-sky-500'
                          : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5 mb-0.5">
                        <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        {t.team.roleAdminTitle}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                        {t.team.roleAdminDesc}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('pengguna')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        role === 'pengguna'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-500'
                          : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center gap-1.5 mb-0.5">
                        <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {t.team.roleCashierTitle}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                        {t.team.roleCashierDesc}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Preset Tombol Cepat */}
              {editingMember?.role !== 'owner' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {t.team.quickPresets}
                    </label>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{t.team.quickPresetsDesc}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset('kasir')}
                      className="px-2 py-1.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-center cursor-pointer transition-colors"
                    >
                      {t.team.presetCashier}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('gudang')}
                      className="px-2 py-1.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-center cursor-pointer transition-colors"
                    >
                      {t.team.presetWarehouse}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('laporan')}
                      className="px-2 py-1.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-center cursor-pointer transition-colors"
                    >
                      {t.team.presetReports}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('all')}
                      className="px-2 py-1.5 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-center cursor-pointer transition-colors"
                    >
                      {t.team.presetAll}
                    </button>
                  </div>
                </div>
              )}

              {/* Rincian Hak Akses Fitur (Feature Permissions Checkboxes) */}
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-500" />
                    {t.team.permScopeTitle}
                  </label>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-400">
                    {editingMember?.role === 'owner'
                      ? t.team.permOwnerFull
                      : t.team.permCheckNotice}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Kasir POS */}
                  <label className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      {t.team.permPOS}
                    </span>
                    <input
                      type="checkbox"
                      disabled={editingMember?.role === 'owner'}
                      checked={permissions.pos}
                      onChange={(e) => setPermissions({ ...permissions, pos: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                  </label>

                  {/* Stok Barang */}
                  <label className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      {t.team.permInventory}
                    </span>
                    <input
                      type="checkbox"
                      disabled={editingMember?.role === 'owner'}
                      checked={permissions.inventory}
                      onChange={(e) =>
                        setPermissions({ ...permissions, inventory: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                  </label>

                  {/* Laporan */}
                  <label className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      {t.team.permReports}
                    </span>
                    <input
                      type="checkbox"
                      disabled={editingMember?.role === 'owner'}
                      checked={permissions.reports}
                      onChange={(e) =>
                        setPermissions({ ...permissions, reports: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                  </label>

                  {/* Riwayat */}
                  <label className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                    <span className="flex items-center gap-2">
                      <History className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      {t.team.permTransactions}
                    </span>
                    <input
                      type="checkbox"
                      disabled={editingMember?.role === 'owner'}
                      checked={permissions.transactions}
                      onChange={(e) =>
                        setPermissions({ ...permissions, transactions: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                  </label>

                  {/* Dashboard */}
                  <label className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      {t.team.permDashboard}
                    </span>
                    <input
                      type="checkbox"
                      disabled={editingMember?.role === 'owner'}
                      checked={permissions.dashboard}
                      onChange={(e) =>
                        setPermissions({ ...permissions, dashboard: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                  </label>

                  {/* Pengaturan */}
                  <label className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      {t.team.permSettings}
                    </span>
                    <input
                      type="checkbox"
                      disabled={editingMember?.role === 'owner'}
                      checked={permissions.settings}
                      onChange={(e) =>
                        setPermissions({ ...permissions, settings: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? t.team.btnSaving
                      : editingMember
                      ? t.team.btnSaveChanges
                      : t.team.btnCreateAccount}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ganti Profil & Foto Pengguna Saya */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Ganti Profil & Foto Saya
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Perbarui nama tampilan dan foto profil akun Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success message banner */}
            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold">{profileSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Profile Avatar Live Preview & Mode Switcher */}
              <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="relative">
                  <img
                    src={getAvatarUrl({
                      email: currentUserEmail,
                      avatarUrl: profileAvatarUrl,
                      name: profileName,
                    })}
                    alt={profileName || 'Avatar'}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-md bg-white dark:bg-neutral-800"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        profileName || 'User'
                      )}&radius=50`;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-xs border-2 border-white dark:border-neutral-900">
                    <Sparkles className="w-3 h-3" />
                  </div>
                </div>

                <div className="text-center">
                  <p className="font-bold text-sm text-neutral-900 dark:text-white">
                    {profileName || 'Pengguna'}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {currentUserEmail}
                  </p>
                </div>

                {/* Avatar Source Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-neutral-200/60 dark:bg-neutral-800 rounded-xl w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileAvatarTab('email');
                      setProfileAvatarUrl('');
                    }}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      profileAvatarTab === 'email' && !profileAvatarUrl
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Foto Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileAvatarTab('upload')}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      profileAvatarTab === 'upload'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileAvatarTab('preset')}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      profileAvatarTab === 'preset'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Karakter
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileAvatarTab('url')}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      profileAvatarTab === 'url'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Link URL
                  </button>
                </div>

                {/* Tab: Email Photo Sync */}
                {profileAvatarTab === 'email' && (
                  <div className="w-full text-center space-y-1 py-1">
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Foto profil otomatis diambil langsung dari profil akun email Anda (Google / Gravatar).
                    </p>
                    <button
                      type="button"
                      onClick={() => setProfileAvatarUrl('')}
                      className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Sinkronkan Ulang dengan Email</span>
                    </button>
                  </div>
                )}

                {/* Tab: Upload Photo */}
                {profileAvatarTab === 'upload' && (
                  <div className="w-full space-y-2">
                    <label className="block w-full p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl text-center cursor-pointer transition-colors bg-white dark:bg-neutral-850">
                      <Upload className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                      <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 block">
                        {isCompressingProfile ? 'Sedang Mengompres Gambar...' : 'Pilih Foto dari Galeri / Laptop'}
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        Format JPG, PNG, WEBP (Otomatis dikompres &lt; 60KB)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIsCompressingProfile(true);
                            try {
                              const base64 = await compressAvatarFile(file);
                              setProfileAvatarUrl(base64);
                            } catch (err) {
                              alert('Gagal mengunggah foto.');
                            } finally {
                              setIsCompressingProfile(false);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                )}

                {/* Tab: Presets */}
                {profileAvatarTab === 'preset' && (
                  <div className="w-full space-y-1">
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Pilih salah satu karakter avatar siap pakai di bawah:
                    </p>
                    <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setProfileAvatarUrl(preset.url)}
                          className={`p-1 rounded-xl border transition-all cursor-pointer ${
                            profileAvatarUrl === preset.url
                              ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                          title={preset.name}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-10 h-10 rounded-lg object-cover mx-auto"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Direct URL */}
                {profileAvatarTab === 'url' && (
                  <div className="w-full space-y-1">
                    <input
                      type="url"
                      value={profileAvatarUrl}
                      onChange={(e) => setProfileAvatarUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... atau URL gambar lainnya"
                      className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-850 text-neutral-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-neutral-400">
                      Tempel tautan langsung gambar publik Anda
                    </p>
                  </div>
                )}
              </div>

              {/* Input: Nama Tampilan */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  Nama Tampilan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  className="w-full px-3.5 py-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Profil'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
