import { supabase } from './supabaseClient';
import {
  Product,
  Category,
  Transaction,
  StockAdjustment,
  StoreSettings,
  StoreMember,
  UserRole,
  RolePermissions,
  DEFAULT_STAFF_PERMISSIONS,
} from '../types/pos';

export interface SupabaseHealthStatus {
  connected: boolean;
  tablesReady: boolean;
  tableDetails: {
    stores: boolean;
    store_settings: boolean;
    categories: boolean;
    products: boolean;
    transactions: boolean;
    stock_adjustments: boolean;
    store_members: boolean;
    user_profiles: boolean;
  };
  message: string;
}

/**
 * Checks if Supabase is reachable and if required POS tables are created.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const tableDetails = {
    stores: false,
    store_settings: false,
    categories: false,
    products: false,
    transactions: false,
    stock_adjustments: false,
    store_members: false,
    user_profiles: false,
  };

  try {
    const tableKeys = Object.keys(tableDetails) as (keyof typeof tableDetails)[];
    let allReady = true;

    for (const tbl of tableKeys) {
      const { error } = await supabase.from(tbl).select('*').limit(1);
      if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
        tableDetails[tbl] = false;
        allReady = false;
      } else {
        tableDetails[tbl] = true;
      }
    }

    return {
      connected: true,
      tablesReady: allReady,
      tableDetails,
      message: allReady
        ? 'Semua tabel Supabase siap digunakan untuk POS.'
        : 'Tabel database di Supabase belum dibuat.',
    };
  } catch (err) {
    return {
      connected: false,
      tablesReady: false,
      tableDetails,
      message: err instanceof Error ? err.message : 'Gagal terhubung ke Supabase.',
    };
  }
}

// ---------------------------------------------------------------------------
// PRODUCTS
// ---------------------------------------------------------------------------

export async function fetchProductsSupabase(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    price: Number(row.price),
    costPrice: Number(row.cost_price || 0),
    stock: Number(row.stock),
    minStock: Number(row.min_stock || 1),
    unit: row.unit || 'pcs',
    imageUrl: row.image_url || undefined,
    updatedAt: row.updated_at,
  }));
}

export function subscribeProductsSupabase(
  storeId: string,
  onUpdate: (products: Product[]) => void,
  onError?: (err: unknown) => void
): () => void {
  fetchProductsSupabase(storeId)
    .then(onUpdate)
    .catch((err) => onError && onError(err));

  const channel = supabase
    .channel(`products-${storeId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        fetchProductsSupabase(storeId)
          .then(onUpdate)
          .catch((err) => onError && onError(err));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function saveProductToSupabase(storeId: string, product: Product): Promise<void> {
  const payload = {
    id: product.id,
    store_id: storeId,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    cost_price: product.costPrice || 0,
    stock: product.stock,
    min_stock: product.minStock || 1,
    unit: product.unit || 'pcs',
    image_url: product.imageUrl || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteProductFromSupabase(storeId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('store_id', storeId)
    .eq('id', productId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------

export async function fetchCategoriesSupabase(storeId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color || '#10b981',
  }));
}

export function subscribeCategoriesSupabase(
  storeId: string,
  onUpdate: (categories: Category[]) => void,
  onError?: (err: unknown) => void
): () => void {
  fetchCategoriesSupabase(storeId)
    .then(onUpdate)
    .catch((err) => onError && onError(err));

  const channel = supabase
    .channel(`categories-${storeId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        fetchCategoriesSupabase(storeId)
          .then(onUpdate)
          .catch((err) => onError && onError(err));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function saveCategoryToSupabase(storeId: string, category: Category): Promise<void> {
  const payload = {
    id: category.id,
    store_id: storeId,
    name: category.name,
    color: category.color || '#10b981',
  };

  const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteCategoryFromSupabase(storeId: string, categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('store_id', storeId)
    .eq('id', categoryId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------

export async function fetchTransactionsSupabase(storeId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('store_id', storeId)
    .order('timestamp', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => {
    const total = Number(row.total || 0);
    const subtotal = Number(row.subtotal || 0);
    const discount = Number(row.discount || 0);
    const items = row.items || [];

    let totalCost = 0;
    items.forEach((item: any) => {
      const cost = Number(item?.costPrice || 0);
      const qty = Number(item?.quantity || 1);
      totalCost += cost * qty;
    });

    const profit = Math.max(0, total - totalCost);

    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      items,
      subtotal,
      discount,
      discountAmount: discount,
      taxAmount: 0,
      taxRate: 0,
      total,
      totalAmount: total,
      totalCost,
      profit,
      paymentMethod: row.payment_method,
      cashGiven: Number(row.cash_given || 0),
      change: Number(row.change || 0),
      customerName: row.customer_name || undefined,
      cashierName: row.cashier_name || undefined,
      timestamp: row.timestamp,
      dateStr: row.date_str,
      status: row.status,
    };
  });
}

export function subscribeTransactionsSupabase(
  storeId: string,
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: unknown) => void
): () => void {
  fetchTransactionsSupabase(storeId)
    .then(onUpdate)
    .catch((err) => onError && onError(err));

  const channel = supabase
    .channel(`transactions-${storeId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        fetchTransactionsSupabase(storeId)
          .then(onUpdate)
          .catch((err) => onError && onError(err));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function recordSaleTransactionInSupabase(
  storeId: string,
  transaction: Transaction,
  stockUpdates: { productId: string; newStock: number }[],
  adjustments: StockAdjustment[]
): Promise<void> {
  // 1. Insert transaction
  const total = Number(transaction.totalAmount ?? (transaction as any).total ?? 0);
  const discount = Number(transaction.discountAmount ?? (transaction as any).discount ?? 0);
  const subtotal = Number(transaction.subtotal || total);

  const txPayload = {
    id: transaction.id,
    store_id: storeId,
    invoice_number: transaction.invoiceNumber,
    items: transaction.items,
    subtotal,
    discount,
    total,
    payment_method: transaction.paymentMethod,
    cash_given: Number(transaction.cashGiven || 0),
    change: Number(transaction.change || 0),
    customer_name: transaction.customerName || null,
    cashier_name: transaction.cashierName || null,
    timestamp: transaction.timestamp,
    date_str: transaction.dateStr || transaction.timestamp.split('T')[0],
    status: transaction.status || 'completed',
  };

  const { error: txError } = await supabase.from('transactions').insert(txPayload);
  if (txError) throw txError;

  // 2. Update stock for each product
  for (const update of stockUpdates) {
    const { error: stockErr } = await supabase
      .from('products')
      .update({
        stock: update.newStock,
        updated_at: transaction.timestamp,
      })
      .eq('store_id', storeId)
      .eq('id', update.productId);
    if (stockErr) {
      console.warn('Failed to update product stock in Supabase:', stockErr);
    }
  }

  // 3. Record adjustments
  if (adjustments.length > 0) {
    const adjPayloads = adjustments.map((a) => ({
      id: a.id,
      store_id: storeId,
      product_id: a.productId,
      product_name: a.productName,
      product_sku: a.productSku,
      reason: a.reason,
      amount: a.amount,
      previous_stock: a.previousStock,
      new_stock: a.newStock,
      notes: a.notes || '',
      timestamp: a.timestamp,
    }));
    const { error: adjErr } = await supabase.from('stock_adjustments').insert(adjPayloads);
    if (adjErr) {
      console.warn('Failed to record stock adjustments in Supabase:', adjErr);
    }
  }
}

export async function cancelTransactionInSupabase(
  storeId: string,
  transaction: Transaction,
  cancellationReason: string,
  stockRestorations: { productId: string; restoredStock: number }[],
  adjustments: StockAdjustment[]
): Promise<void> {
  await supabase
    .from('transactions')
    .update({ status: 'cancelled' })
    .eq('store_id', storeId)
    .eq('id', transaction.id);

  for (const item of stockRestorations) {
    await supabase
      .from('products')
      .update({ stock: item.restoredStock, updated_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('id', item.productId);
  }

  if (adjustments.length > 0) {
    const adjPayloads = adjustments.map((a) => ({
      id: a.id,
      store_id: storeId,
      product_id: a.productId,
      product_name: a.productName,
      product_sku: a.productSku,
      reason: a.reason,
      amount: a.amount,
      previous_stock: a.previousStock,
      new_stock: a.newStock,
      notes: a.notes || '',
      timestamp: a.timestamp,
    }));
    await supabase.from('stock_adjustments').insert(adjPayloads);
  }
}

// ---------------------------------------------------------------------------
// STOCK ADJUSTMENTS
// ---------------------------------------------------------------------------

export async function fetchStockAdjustmentsSupabase(storeId: string): Promise<StockAdjustment[]> {
  const { data, error } = await supabase
    .from('stock_adjustments')
    .select('*')
    .eq('store_id', storeId)
    .order('timestamp', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    reason: row.reason,
    amount: Number(row.amount),
    previousStock: Number(row.previous_stock || 0),
    newStock: Number(row.new_stock || 0),
    notes: row.notes,
    timestamp: row.timestamp,
  }));
}

export function subscribeStockAdjustmentsSupabase(
  storeId: string,
  onUpdate: (adjustments: StockAdjustment[]) => void,
  onError?: (err: unknown) => void
): () => void {
  fetchStockAdjustmentsSupabase(storeId)
    .then(onUpdate)
    .catch((err) => onError && onError(err));

  const channel = supabase
    .channel(`stock_adjustments-${storeId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stock_adjustments',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        fetchStockAdjustmentsSupabase(storeId)
          .then(onUpdate)
          .catch((err) => onError && onError(err));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function adjustStockInSupabase(
  storeId: string,
  productId: string,
  newStock: number,
  adjustment: StockAdjustment
): Promise<void> {
  const { error: prodErr } = await supabase
    .from('products')
    .update({ stock: newStock, updated_at: adjustment.timestamp })
    .eq('store_id', storeId)
    .eq('id', productId);

  if (prodErr) throw prodErr;

  const adjPayload = {
    id: adjustment.id,
    store_id: storeId,
    product_id: adjustment.productId,
    product_name: adjustment.productName,
    product_sku: adjustment.productSku,
    reason: adjustment.reason,
    amount: adjustment.amount,
    previous_stock: adjustment.previousStock,
    new_stock: adjustment.newStock,
    notes: adjustment.notes || '',
    timestamp: adjustment.timestamp,
  };

  const { error: adjErr } = await supabase.from('stock_adjustments').insert(adjPayload);
  if (adjErr) throw adjErr;
}

// ---------------------------------------------------------------------------
// STORE SETTINGS
// ---------------------------------------------------------------------------

export async function fetchStoreSettingsSupabase(storeId: string): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('store_id', storeId)
    .single();

  if (error || !data) return null;

  const layout = (data.receipt_layout || {}) as any;
  let soundEnabled = true;
  if (layout.soundEnabled !== undefined) {
    soundEnabled = Boolean(layout.soundEnabled);
  } else {
    try {
      const local = localStorage.getItem('kasirku_sound_enabled');
      if (local !== null) soundEnabled = JSON.parse(local);
    } catch {}
  }

  const taxEnabled = layout.taxEnabled !== undefined ? Boolean(layout.taxEnabled) : false;
  const taxRate = layout.taxRate !== undefined ? Number(layout.taxRate) : 11;
  const themeAccent = layout.themeAccent || 'emerald';
  const backgroundTheme = layout.backgroundTheme || 'default';
  const customBgUrl = layout.customBgUrl || '';

  return {
    storeName: data.store_name || 'VarzyPos',
    tagline: data.tagline || '',
    address: data.address || '',
    phone: data.phone || '',
    cashierName: data.cashier_name || 'Kasir 01',
    receiptFooter: data.footer_message || '',
    footerMessage: data.footer_message,
    logoUrl: data.logo_url || '',
    receiptLayout: layout,
    printers: data.printers || [],
    theme: data.theme || 'light',
    themeAccent,
    backgroundTheme,
    customBgUrl,
    language: data.language || 'id',
    soundEnabled,
    taxEnabled,
    taxRate,
  };
}

export async function saveStoreSettingsToSupabase(
  storeId: string,
  settings: StoreSettings
): Promise<void> {
  const soundEnabled = settings.soundEnabled !== undefined ? Boolean(settings.soundEnabled) : true;
  const themeAccent = settings.themeAccent || 'emerald';
  const backgroundTheme = settings.backgroundTheme || 'default';
  const customBgUrl = settings.customBgUrl || '';

  const receiptLayout = {
    ...(settings.receiptLayout || {}),
    soundEnabled,
    taxEnabled: Boolean(settings.taxEnabled),
    taxRate: Number(settings.taxRate || 11),
    themeAccent,
    backgroundTheme,
    customBgUrl,
  };

  try {
    localStorage.setItem('kasirku_sound_enabled', JSON.stringify(soundEnabled));
    localStorage.setItem('app_theme_accent', themeAccent);
    localStorage.setItem('app_background_theme', backgroundTheme);
    if (customBgUrl) {
      localStorage.setItem('app_custom_bg_url', customBgUrl);
    }
  } catch {}

  const payload = {
    store_id: storeId,
    store_name: settings.storeName || 'VarzyPos',
    tagline: settings.tagline || '',
    address: settings.address || '',
    phone: settings.phone || '',
    footer_message: settings.receiptFooter || settings.footerMessage || '',
    logo_url: settings.logoUrl || '',
    cashier_name: settings.cashierName || 'Kasir 01',
    receipt_layout: receiptLayout,
    printers: settings.printers || [],
    theme: settings.theme || 'light',
    language: settings.language || 'id',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('store_settings').upsert(payload, { onConflict: 'store_id' });
  if (error) throw error;
}

export function subscribeStoreSettingsSupabase(
  storeId: string,
  onUpdate: (settings: StoreSettings) => void,
  onError?: (err: unknown) => void
): () => void {
  fetchStoreSettingsSupabase(storeId)
    .then((sett) => {
      if (sett) onUpdate(sett);
    })
    .catch((err) => onError && onError(err));

  const channel = supabase
    .channel(`store_settings-${storeId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'store_settings',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        fetchStoreSettingsSupabase(storeId)
          .then((sett) => {
            if (sett) onUpdate(sett);
          })
          .catch((err) => onError && onError(err));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// STORE MEMBERS
// ---------------------------------------------------------------------------

export async function fetchStoreMembersSupabase(storeId: string): Promise<StoreMember[]> {
  const { data, error } = await supabase
    .from('store_members')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    uid: row.uid,
    email: row.email,
    name: row.name,
    username: row.username,
    role: row.role,
    permissions: row.permissions,
    avatarUrl: row.avatar_url || row.permissions?.avatarUrl || undefined,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  }));
}

export function subscribeTeamMembersSupabase(
  storeId: string,
  onUpdate: (members: StoreMember[]) => void,
  onError?: (err: unknown) => void
): () => void {
  fetchStoreMembersSupabase(storeId)
    .then(onUpdate)
    .catch((err) => onError && onError(err));

  const channel = supabase
    .channel(`store_members-${storeId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'store_members',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        fetchStoreMembersSupabase(storeId)
          .then(onUpdate)
          .catch((err) => onError && onError(err));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function purgeGhostMembersSupabase(storeId: string): Promise<number> {
  const { data } = await supabase
    .from('store_members')
    .delete()
    .eq('store_id', storeId)
    .or('email.is.null,name.eq.Anggota Tim')
    .select();
  return data?.length || 0;
}

export interface CreateTeamMemberParams {
  storeId: string;
  storeName: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  permissions?: RolePermissions;
  password?: string;
  invitedBy?: string;
  avatarUrl?: string;
}

export async function createTeamMemberInSupabase(
  params: CreateTeamMemberParams
): Promise<StoreMember> {
  const emailNorm = params.email.toLowerCase().trim();
  const usernameNorm = (params.username || '').toLowerCase().trim() || emailNorm.split('@')[0];
  const displayName = params.name.trim() || usernameNorm;
  const safeRole: UserRole = params.role === 'owner' ? 'admin' : params.role;
  const memberId = 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const memberPermissions: any = {
    ...(params.permissions || DEFAULT_STAFF_PERMISSIONS),
  };
  if (params.password) {
    memberPermissions._auth_password = params.password;
  }
  if (params.avatarUrl) {
    memberPermissions.avatarUrl = params.avatarUrl;
  }

  const member: StoreMember = {
    id: memberId,
    storeId: params.storeId,
    email: emailNorm,
    username: usernameNorm,
    name: displayName,
    role: safeRole,
    permissions: memberPermissions,
    avatarUrl: params.avatarUrl,
    invitedBy: params.invitedBy || 'Owner',
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('store_members').upsert({
    id: member.id,
    store_id: member.storeId,
    email: member.email,
    username: member.username,
    name: member.name,
    role: member.role,
    permissions: member.permissions,
    invited_by: member.invitedBy,
    created_at: member.createdAt,
  });

  if (error) throw error;

  if (params.password) {
    try {
      const registryKey = 'kasirku_member_auth_registry';
      const reg = JSON.parse(localStorage.getItem(registryKey) || '{}');
      reg[usernameNorm] = {
        email: emailNorm,
        username: usernameNorm,
        name: displayName,
        password: params.password,
      };
      localStorage.setItem(registryKey, JSON.stringify(reg));
    } catch {}
  }

  return member;
}

export async function updateTeamMemberInSupabase(
  storeId: string,
  member: StoreMember
): Promise<void> {
  const safeRole: UserRole = member.role === 'owner' ? 'admin' : member.role;
  const updatedPerms: any = {
    ...(member.permissions || {}),
  };
  if (member.avatarUrl !== undefined) {
    updatedPerms.avatarUrl = member.avatarUrl;
  }

  const { error } = await supabase
    .from('store_members')
    .update({
      name: member.name,
      username: member.username,
      role: safeRole,
      permissions: updatedPerms,
    })
    .eq('store_id', storeId)
    .eq('id', member.id);

  if (error) throw error;

  // Also sync to user_profiles table if this member has an account
  try {
    if (member.email) {
      await supabase
        .from('user_profiles')
        .update({
          display_name: member.name,
          role: safeRole,
          permissions: updatedPerms,
          updated_at: new Date().toISOString(),
        })
        .eq('active_store_id', storeId)
        .eq('email', member.email.toLowerCase().trim());
    }
  } catch {}
}

export async function deleteTeamMemberInSupabase(
  storeId: string,
  memberId: string,
  email?: string,
  username?: string
): Promise<void> {
  // 1. Delete from store_members
  const { error } = await supabase
    .from('store_members')
    .delete()
    .eq('store_id', storeId)
    .eq('id', memberId);

  if (error) throw error;

  // 2. Also delete from user_profiles table to immediately remove their access to this store
  try {
    if (email) {
      await supabase
        .from('user_profiles')
        .delete()
        .eq('active_store_id', storeId)
        .eq('email', email.toLowerCase().trim());
    }
    await supabase
      .from('user_profiles')
      .delete()
      .eq('active_store_id', storeId)
      .eq('member_id', memberId);
  } catch {}

  // 3. Purge from local member auth registry if stored locally
  try {
    const registryKey = 'kasirku_member_auth_registry';
    const reg = JSON.parse(localStorage.getItem(registryKey) || '{}');
    let changed = false;
    if (username && reg[username.toLowerCase().trim()]) {
      delete reg[username.toLowerCase().trim()];
      changed = true;
    }
    if (email && reg[email.toLowerCase().trim()]) {
      delete reg[email.toLowerCase().trim()];
      changed = true;
    }
    Object.keys(reg).forEach((k) => {
      const entry = reg[k];
      if (
        (email && entry?.email?.toLowerCase().trim() === email.toLowerCase().trim()) ||
        (username && entry?.username?.toLowerCase().trim() === username.toLowerCase().trim())
      ) {
        delete reg[k];
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(registryKey, JSON.stringify(reg));
    }
  } catch {}
}
