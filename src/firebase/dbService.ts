import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from './config';
import {
  Product,
  Category,
  Transaction,
  StockAdjustment,
  StoreSettings,
  StoreMember,
  INITIAL_STORE_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  UserRole,
  RolePermissions,
  DEFAULT_STAFF_PERMISSIONS,
} from '../types/pos';

/**
 * Recursively removes undefined fields and cleans structures so Firestore never throws
 * "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      result[key] = sanitizeForFirestore(val);
    }
  }
  return result as T;
}

// Subscribe to Products collection in real-time (isolated per store)
export function subscribeProducts(
  storeId: string,
  onUpdate: (products: Product[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'stores', storeId, 'products');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Product);
      });
      // Sort by name
      items.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(items);
    },
    (error) => {
      console.warn(`[Firestore Products] Listener notice for store ${storeId}:`, error);
      if (onError) onError(error);
    }
  );
}

// Subscribe to Categories in real-time (isolated per store)
export function subscribeCategories(
  storeId: string,
  onUpdate: (categories: Category[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'stores', storeId, 'categories');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Category);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`[Firestore Categories] Listener notice for store ${storeId}:`, error);
      if (onError) onError(error);
    }
  );
}

// Subscribe to Transactions in real-time (isolated per store)
export function subscribeTransactions(
  storeId: string,
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'stores', storeId, 'transactions');
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Transaction);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`[Firestore Transactions] Listener notice for store ${storeId}:`, error);
      if (onError) onError(error);
    }
  );
}

// Subscribe to Stock Adjustments in real-time (isolated per store)
export function subscribeStockAdjustments(
  storeId: string,
  onUpdate: (adjustments: StockAdjustment[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'stores', storeId, 'stockAdjustments');
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StockAdjustment[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as StockAdjustment);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn(`[Firestore Adjustments] Listener notice for store ${storeId}:`, error);
      if (onError) onError(error);
    }
  );
}

// Subscribe to Store Settings (isolated per store)
export function subscribeStoreSettings(
  storeId: string,
  onUpdate: (settings: StoreSettings) => void,
  onError?: (err: unknown) => void
) {
  const docRef = doc(db, 'stores', storeId, 'settings', 'config');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const raw = docSnap.data() as Partial<StoreSettings>;
        const localTheme =
          typeof localStorage !== 'undefined'
            ? (localStorage.getItem('app_theme') as 'light' | 'dark' | 'system')
            : undefined;
        const localLang =
          typeof localStorage !== 'undefined'
            ? (localStorage.getItem('app_language') as 'id' | 'en')
            : undefined;

        const merged: StoreSettings = {
          ...INITIAL_STORE_SETTINGS,
          ...raw,
          storeName: raw.storeName || INITIAL_STORE_SETTINGS.storeName,
          theme: raw.theme || localTheme || INITIAL_STORE_SETTINGS.theme,
          language: raw.language || localLang || INITIAL_STORE_SETTINGS.language,
          receiptLayout: {
            ...INITIAL_STORE_SETTINGS.receiptLayout,
            ...(raw.receiptLayout || {}),
          },
          printers:
            raw.printers && Array.isArray(raw.printers) && raw.printers.length > 0
              ? raw.printers
              : INITIAL_STORE_SETTINGS.printers,
        };
        onUpdate(merged);
      }
    },
    (error) => {
      console.warn(`[Firestore Settings] Listener notice for store ${storeId}:`, error);
      if (onError) onError(error);
    }
  );
}

// Purge any orphan, corrupted, or placeholder member docs (e.g. "Anggota Tim" or missing email)
export async function purgeGhostMembers(storeId: string): Promise<number> {
  if (!storeId) return 0;
  try {
    const colRef = collection(db, 'stores', storeId, 'members');
    const snap = await getDocs(colRef);
    let deletedCount = 0;

    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const email = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
      const name = typeof d.name === 'string' ? d.name.trim() : '';
      const username = typeof d.username === 'string' ? d.username.trim().toLowerCase() : '';

      const isGhost =
        !email ||
        !email.includes('@') ||
        name === 'Anggota Tim' ||
        (username === 'pengguna' && !email);

      if (isGhost) {
        await deleteDoc(docSnap.ref);
        deletedCount++;
        console.log(`[Firestore Cleanup] Purged ghost member document: ${docSnap.id}`);
      }
    }

    return deletedCount;
  } catch (err) {
    console.warn('[Firestore Cleanup] Notice while purging ghost members:', err);
    return 0;
  }
}

// Subscribe to Team Members in real-time (isolated per store)
// Strictly enforces a single owner: the first user who logged in is the one and only owner.
export function subscribeTeamMembers(
  storeId: string,
  onUpdate: (members: StoreMember[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'stores', storeId, 'members');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const rawMembers: StoreMember[] = [];
      const ghostDocsToDelete: string[] = [];

      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as Partial<StoreMember>;
        const email = (d.email || '').trim().toLowerCase();
        const name = (d.name || '').trim();
        const username = (d.username || '').trim().toLowerCase();

        // Detect invalid/ghost/placeholder member:
        // Must have valid email containing '@' and cannot be placeholder 'Anggota Tim'
        const isGhost =
          !email ||
          !email.includes('@') ||
          name === 'Anggota Tim' ||
          (username === 'pengguna' && (!email || !email.includes('@')));

        if (isGhost) {
          ghostDocsToDelete.push(docSnap.id);
        } else {
          rawMembers.push({
            ...d,
            id: d.id || docSnap.id,
            email,
            name: name || email.split('@')[0],
            username: username || email.split('@')[0],
            role: d.role || 'pengguna',
            permissions: d.permissions || DEFAULT_STAFF_PERMISSIONS,
          } as StoreMember);
        }
      });

      // Auto-purge any ghost docs found in real-time from Firestore
      if (ghostDocsToDelete.length > 0) {
        for (const ghostId of ghostDocsToDelete) {
          try {
            await deleteDoc(doc(db, 'stores', storeId, 'members', ghostId));
            console.log(`[Firestore Members] Auto-deleted ghost member doc: ${ghostId}`);
          } catch (e) {
            console.warn(`[Firestore Members] Could not delete ghost member ${ghostId}:`, e);
          }
        }
      }

      // Filter & normalize: Ensure there is strictly ONE owner!
      // Only genuine members with valid email can be an owner
      const owners = rawMembers.filter((m) => m.role === 'owner' && m.email && m.email.includes('@'));
      let sanitizedMembers = rawMembers;

      if (owners.length > 1) {
        // Multiple owners detected! The first one who registered (earliest createdAt) is the sole owner.
        const sortedOwners = [...owners].sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
          return timeA - timeB;
        });
        const primaryOwner = sortedOwners[0];
        const secondaryOwners = sortedOwners.slice(1);

        // Convert secondary duplicate owners to 'admin'
        sanitizedMembers = rawMembers.map((m) => {
          if (m.role === 'owner' && m.id !== primaryOwner.id) {
            return { ...m, role: 'admin' as UserRole };
          }
          return m;
        });

        // Persist correction to Firestore so duplicates are cleaned permanently in the database
        for (const duplicate of secondaryOwners) {
          try {
            await setDoc(
              doc(db, 'stores', storeId, 'members', duplicate.id),
              { role: 'admin' },
              { merge: true }
            );
          } catch (e) {
            console.warn('[Firestore] Could not auto-demote duplicate owner:', e);
          }
        }
      }

      // Sort: owner first, then admin, then staff
      sanitizedMembers.sort((a, b) => {
        const roleOrder: Record<string, number> = { owner: 1, admin: 2, pengguna: 3 };
        return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
      });
      onUpdate(sanitizedMembers);
    },
    (error) => {
      console.warn(`[Firestore Members] Listener notice for store ${storeId}:`, error);
      if (onError) onError(error);
    }
  );
}

// Params for adding team member with immediate Auth credentials
export interface CreateTeamMemberParams {
  storeId: string;
  storeName: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  permissions: RolePermissions;
  invitedByEmail: string;
}

export interface CreateTeamMemberResult {
  success: boolean;
  member: StoreMember;
  createdAuthAccount: boolean;
  existingAuthAccount: boolean;
  message?: string;
}

// Create Team Member with Email, Password, Username using isolated temporary Firebase Auth instance
export async function createTeamMemberWithCredentials(
  params: CreateTeamMemberParams
): Promise<CreateTeamMemberResult> {
  const emailNorm = params.email.toLowerCase().trim();
  const usernameNorm = (params.username || '').toLowerCase().trim();
  const displayName = params.name.trim() || params.username.trim() || emailNorm.split('@')[0];
  const cleanPassword = params.password?.trim() || '';
  // Owner is strictly unique to the first user who logged in; new members can never be 'owner'
  const safeRole: UserRole = params.role === 'owner' ? 'admin' : params.role;
  let newUid: string | null = null;
  let createdAuthAccount = false;
  let existingAuthAccount = false;
  let infoMessage: string | undefined = undefined;

  let tempApp: any = null;

  // 1. Create Firebase Auth user using isolated temporary app so current owner session is untouched
  if (cleanPassword && cleanPassword.length >= 6) {
    const tempAppName = 'SecAuth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    try {
      tempApp = initializeApp(firebaseConfig, tempAppName);
      const secondaryAuth = getAuth(tempApp);

      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        emailNorm,
        cleanPassword
      );
      newUid = userCred.user.uid;
      createdAuthAccount = true;
      try {
        await updateProfile(userCred.user, { displayName });
      } catch (profErr) {
        console.warn('Could not set displayName on secondary user:', profErr);
      }
    } catch (authErr: any) {
      console.warn('Secondary auth user creation notice:', authErr);
      const code = authErr?.code || '';
      if (code === 'auth/email-already-in-use') {
        existingAuthAccount = true;
        // Verify if the password matches the existing Firebase account
        try {
          if (tempApp) {
            const secondaryAuth = getAuth(tempApp);
            const existingCred = await signInWithEmailAndPassword(secondaryAuth, emailNorm, cleanPassword);
            if (existingCred.user) {
              newUid = existingCred.user.uid;
              createdAuthAccount = true;
              infoMessage = 'Akun email ini sudah terdaftar di Firebase dan kata sandi cocok. Anggota tim dapat langsung login!';
            }
          }
        } catch {
          infoMessage =
            'Email ini sudah terdaftar sebelumnya dengan kata sandi lain. Anggota dapat login menggunakan kata sandi Firebase yang sudah terdaftar, atau kata sandi baru saat login otomatis.';
        }
      } else if (code === 'auth/operation-not-allowed') {
        infoMessage =
          'Akun email/password akan otomatis disinkronkan saat anggota login.';
      } else if (code === 'auth/weak-password') {
        throw new Error('Kata sandi terlalu lemah. Minimal 6 karakter.');
      } else if (code === 'auth/invalid-email') {
        throw new Error('Format email tidak valid.');
      } else {
        console.warn('Auth notice:', authErr?.message);
      }
    } finally {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch {}
      }
    }
  }

  const memberId = newUid
    ? `mem-${newUid}`
    : 'mem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const createdAt = new Date().toISOString();

  const newMember: StoreMember = {
    id: memberId,
    storeId: params.storeId,
    email: emailNorm,
    username: usernameNorm || emailNorm.split('@')[0],
    name: displayName,
    role: safeRole,
    permissions: params.permissions,
    uid: newUid,
    password: cleanPassword || undefined,
    invitedBy: params.invitedByEmail,
    createdAt,
  };

  // 2. Guarantee writing to root 'users' collection in Firestore
  const userDocId = newUid || `user_${emailNorm.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const userProfileDoc = {
    uid: newUid || userDocId,
    email: emailNorm,
    username: usernameNorm || emailNorm.split('@')[0],
    displayName,
    role: safeRole,
    permissions: params.permissions,
    activeStoreId: params.storeId,
    storeName: params.storeName,
    memberId,
    password: cleanPassword || undefined,
    createdAt,
    updatedAt: createdAt,
    createdBy: params.invitedByEmail,
    status: 'active',
  };

  // 3. Atomically commit to 'users', 'stores/{storeId}/members', and 'invites' in batch
  try {
    const batch = writeBatch(db);

    const userDocRef = doc(db, 'users', userDocId);
    batch.set(userDocRef, sanitizeForFirestore(userProfileDoc), { merge: true });

    const emailUserDocId = `user_${emailNorm.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (userDocId !== emailUserDocId) {
      const emailUserRef = doc(db, 'users', emailUserDocId);
      batch.set(emailUserRef, sanitizeForFirestore(userProfileDoc), { merge: true });
    }

    const memberDocRef = doc(db, 'stores', params.storeId, 'members', memberId);
    batch.set(memberDocRef, sanitizeForFirestore(newMember), { merge: true });

    const safeEmailId = `${params.storeId}_${emailNorm.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const inviteDocRef = doc(db, 'invites', safeEmailId);
    batch.set(
      inviteDocRef,
      sanitizeForFirestore({
        id: safeEmailId,
        memberId,
        storeId: params.storeId,
        storeName: params.storeName,
        email: emailNorm,
        username: usernameNorm || emailNorm.split('@')[0],
        name: displayName,
        role: params.role,
        permissions: params.permissions,
        uid: newUid,
        password: cleanPassword || undefined,
        invitedBy: params.invitedByEmail,
        createdAt,
      }),
      { merge: true }
    );

    await batch.commit();
  } catch (err) {
    console.warn(`[Firestore Member Add] Notice:`, err);
  }

  // 4. Save to local credentials registry for instant offline validation
  try {
    const registryKey = 'kasirku_member_auth_registry';
    const existing = JSON.parse(localStorage.getItem(registryKey) || '{}');
    const credData = {
      email: emailNorm,
      username: usernameNorm,
      password: cleanPassword,
      name: displayName,
      role: params.role,
      permissions: params.permissions,
      storeId: params.storeId,
      storeName: params.storeName,
      memberId,
      uid: newUid,
    };
    existing[emailNorm] = credData;
    if (usernameNorm) {
      existing[usernameNorm] = credData;
    }
    localStorage.setItem(registryKey, JSON.stringify(existing));
  } catch {}

  return {
    success: true,
    member: newMember,
    createdAuthAccount,
    existingAuthAccount,
    message: infoMessage,
  };
}

// Ensure all store members exist in the root 'users' collection in Firestore
export async function syncTeamMembersToUsersTable(
  storeId: string,
  storeName: string,
  members: StoreMember[]
): Promise<{ syncedCount: number; errors: number }> {
  let syncedCount = 0;
  let errors = 0;

  for (const member of members) {
    if (!member.email) continue;
    const emailNorm = member.email.toLowerCase().trim();
    const targetUserId = member.uid || `user_${emailNorm.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const profileData = {
      uid: member.uid || targetUserId,
      email: emailNorm,
      username: member.username || emailNorm.split('@')[0],
      displayName: member.name,
      role: member.role,
      permissions: member.permissions,
      activeStoreId: storeId,
      storeName: storeName,
      memberId: member.id,
      password: member.password,
      createdAt: member.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: member.invitedBy || 'Owner',
      status: 'active',
    };

    try {
      await setDoc(doc(db, 'users', targetUserId), sanitizeForFirestore(profileData), { merge: true });
      syncedCount++;
    } catch (err) {
      console.warn(`Failed to sync user ${emailNorm} to users table:`, err);
      errors++;
    }
  }

  return { syncedCount, errors };
}

// Add Team Member to Store & Create Global Email Invite
export async function addTeamMember(
  storeId: string,
  member: Omit<StoreMember, 'id' | 'createdAt'>,
  invitedByEmail: string,
  storeName: string,
  password?: string
) {
  return await createTeamMemberWithCredentials({
    storeId,
    storeName,
    username: member.username || member.email.split('@')[0],
    name: member.name,
    email: member.email,
    password,
    role: member.role,
    permissions: member.permissions,
    invitedByEmail,
  });
}

// Update Team Member Role & Feature Permissions
export async function updateTeamMember(storeId: string, member: StoreMember) {
  // Guard: If role is owner, verify that this member is genuinely the existing owner
  let safeMember = member;
  if (member.role === 'owner') {
    try {
      const snap = await getDoc(doc(db, 'stores', storeId, 'members', member.id));
      if (snap.exists() && snap.data().role !== 'owner') {
        // Disallow promoting a non-owner to owner
        safeMember = { ...member, role: 'admin' };
      }
    } catch {
      // ignore
    }
  }

  const batch = writeBatch(db);

  // Update member doc
  const memberDocRef = doc(db, 'stores', storeId, 'members', safeMember.id);
  batch.set(memberDocRef, sanitizeForFirestore(safeMember), { merge: true });

  // Update invite doc if exists
  if (safeMember.email) {
    const inviteId = `${storeId}_${safeMember.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
    const inviteDocRef = doc(db, 'invites', inviteId);
    batch.set(
      inviteDocRef,
      sanitizeForFirestore({
        name: safeMember.name || '',
        role: safeMember.role || 'pengguna',
        permissions: safeMember.permissions,
        username: safeMember.username || '',
        password: safeMember.password,
      }),
      { merge: true }
    );
  }

  // If member has UID, also sync directly to /users/{uid}
  if (safeMember.uid) {
    const userDocRef = doc(db, 'users', safeMember.uid);
    batch.set(
      userDocRef,
      sanitizeForFirestore({
        displayName: safeMember.name,
        role: safeMember.role,
        permissions: safeMember.permissions,
        username: safeMember.username,
        password: safeMember.password,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  }

  try {
    await batch.commit();
  } catch (err) {
    console.warn(`[Firestore Member Update] Notice:`, err);
  }
}

// Delete / Revoke Team Member
export async function deleteTeamMember(storeId: string, memberId: string, email?: string) {
  const batch = writeBatch(db);

  const memberDocRef = doc(db, 'stores', storeId, 'members', memberId);
  batch.delete(memberDocRef);

  const cleanEmail = email ? email.toLowerCase().trim() : '';

  if (cleanEmail) {
    const inviteId = `${storeId}_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const inviteDocRef = doc(db, 'invites', inviteId);
    batch.delete(inviteDocRef);

    // Also delete the email-keyed user doc if exists
    const emailUserDocId = `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userDocRef = doc(db, 'users', emailUserDocId);
    batch.delete(userDocRef);
  }

  try {
    await batch.commit();
  } catch (err) {
    console.warn(`[Firestore Member Delete] Notice:`, err);
  }

  // Also purge from local credentials registry
  if (cleanEmail) {
    try {
      const reg = JSON.parse(localStorage.getItem('kasirku_member_auth_registry') || '{}');
      let changed = false;
      for (const [uname, item] of Object.entries(reg)) {
        if ((item as any)?.email?.toLowerCase() === cleanEmail) {
          delete reg[uname];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem('kasirku_member_auth_registry', JSON.stringify(reg));
      }
    } catch {}
  }
}

// Save or Update Product (isolated per store)
export async function saveProductToFirestore(storeId: string, product: Product) {
  try {
    const cleanProduct = sanitizeForFirestore(product);
    await setDoc(doc(db, 'stores', storeId, 'products', product.id), cleanProduct, { merge: true });
  } catch (err) {
    console.warn(`[Firestore Product Save] Notice for ${product.id}:`, err);
  }
}

// Delete Product (isolated per store)
export async function deleteProductFromFirestore(storeId: string, productId: string) {
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'products', productId));
  } catch (err) {
    console.warn(`[Firestore Product Delete] Notice for ${productId}:`, err);
  }
}

// Save Category (isolated per store)
export async function saveCategoryToFirestore(storeId: string, category: Category) {
  try {
    const cleanCategory = sanitizeForFirestore(category);
    await setDoc(doc(db, 'stores', storeId, 'categories', category.id), cleanCategory, { merge: true });
  } catch (err) {
    console.warn(`[Firestore Category Save] Notice for ${category.id}:`, err);
  }
}

// Delete Category (isolated per store)
export async function deleteCategoryFromFirestore(storeId: string, categoryId: string) {
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'categories', categoryId));
  } catch (err) {
    console.warn(`[Firestore Category Delete] Notice for ${categoryId}:`, err);
  }
}

// Save Store Settings (isolated per store)
export async function saveStoreSettingsToFirestore(storeId: string, settings: StoreSettings) {
  try {
    const cleanSettings = sanitizeForFirestore(settings);
    await setDoc(doc(db, 'stores', storeId, 'settings', 'config'), cleanSettings, { merge: true });
    await setDoc(
      doc(db, 'stores', storeId),
      { id: storeId, name: settings.storeName },
      { merge: true }
    );
  } catch (err) {
    console.warn(`[Firestore Settings Save] Notice for ${storeId}:`, err);
  }
}

// Record Sale Transaction & Deduct Stocks Atomically (isolated per store)
export async function recordSaleTransactionInFirestore(
  storeId: string,
  transaction: Transaction,
  stockUpdates: { productId: string; newStock: number }[],
  adjustments: StockAdjustment[]
) {
  const batch = writeBatch(db);

  const txRef = doc(db, 'stores', storeId, 'transactions', transaction.id);
  batch.set(txRef, sanitizeForFirestore(transaction), { merge: true });

  stockUpdates.forEach(({ productId, newStock }) => {
    const prodRef = doc(db, 'stores', storeId, 'products', productId);
    batch.set(
      prodRef,
      sanitizeForFirestore({
        stock: newStock,
        updatedAt: transaction.timestamp,
      }),
      { merge: true }
    );
  });

  adjustments.forEach((adj) => {
    const adjRef = doc(db, 'stores', storeId, 'stockAdjustments', adj.id);
    batch.set(adjRef, sanitizeForFirestore(adj), { merge: true });
  });

  try {
    await batch.commit();
  } catch (err) {
    console.warn(`[Firestore Sale Batch] Notice:`, err);
  }
}

// Cancel Transaction & Restore Stocks Atomically (isolated per store)
export async function cancelTransactionInFirestore(
  storeId: string,
  transaction: Transaction,
  cancellationReason: string,
  stockRestorations: { productId: string; restoredStock: number }[],
  adjustments: StockAdjustment[]
) {
  const batch = writeBatch(db);

  const txRef = doc(db, 'stores', storeId, 'transactions', transaction.id);
  batch.set(
    txRef,
    sanitizeForFirestore({
      status: 'cancelled',
      cancelledReason: cancellationReason,
    }),
    { merge: true }
  );

  stockRestorations.forEach(({ productId, restoredStock }) => {
    const prodRef = doc(db, 'stores', storeId, 'products', productId);
    batch.set(
      prodRef,
      sanitizeForFirestore({
        stock: restoredStock,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  });

  adjustments.forEach((adj) => {
    const adjRef = doc(db, 'stores', storeId, 'stockAdjustments', adj.id);
    batch.set(adjRef, sanitizeForFirestore(adj), { merge: true });
  });

  try {
    await batch.commit();
  } catch (err) {
    console.warn(`[Firestore Cancel Batch] Notice:`, err);
  }
}

// Adjust stock manually or restock (isolated per store)
export async function adjustStockInFirestore(
  storeId: string,
  productId: string,
  newStock: number,
  adjustment: StockAdjustment
) {
  const batch = writeBatch(db);

  const prodRef = doc(db, 'stores', storeId, 'products', productId);
  batch.set(
    prodRef,
    sanitizeForFirestore({
      stock: newStock,
      updatedAt: adjustment.timestamp,
    }),
    { merge: true }
  );

  const adjRef = doc(db, 'stores', storeId, 'stockAdjustments', adjustment.id);
  batch.set(adjRef, sanitizeForFirestore(adjustment), { merge: true });

  try {
    await batch.commit();
  } catch (err) {
    console.warn(`[Firestore Adjust Batch] Notice:`, err);
  }
}

// Initialize store settings without overwriting customized values
export async function ensureStoreSettings(storeId: string, storeName: string = 'VarzyPos') {
  try {
    await setDoc(doc(db, 'stores', storeId), { id: storeId, name: storeName }, { merge: true });

    const settingsRef = doc(db, 'stores', storeId, 'settings', 'config');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(
        settingsRef,
        sanitizeForFirestore({
          ...INITIAL_STORE_SETTINGS,
          storeName,
        }),
        { merge: true }
      );
    }
  } catch (err) {
    console.warn(`[Firestore Settings Ensure] Notice:`, err);
  }
}

// Seed initial catalog data if store has no products or categories
export async function seedDefaultCatalogIfEmpty(
  storeId: string,
  existingProducts: Product[],
  existingCategories: Category[]
) {
  try {
    if (existingCategories.length === 0) {
      for (const cat of INITIAL_CATEGORIES) {
        await saveCategoryToFirestore(storeId, cat);
      }
    }
    if (existingProducts.length === 0) {
      for (const prod of INITIAL_PRODUCTS) {
        await saveProductToFirestore(storeId, prod);
      }
    }
  } catch (err) {
    console.warn(`[Firestore Seed Defaults] Notice:`, err);
  }
}
