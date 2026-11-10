import React, { useState, useEffect } from 'react';
import {
  Product,
  CartItem,
  Transaction,
  StockAdjustment,
  StoreSettings,
  Category,
  StoreMember,
  UserRole,
  RolePermissions,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  INITIAL_STORE_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
} from './types/pos';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { TransactionsView } from './components/TransactionsView';
import { ReportsView } from './components/ReportsView';
import { TeamManagerView, AddMemberPayload } from './components/TeamManagerView';
import { ReceiptPrint } from './components/ReceiptPrint';
import { SettingsView } from './components/SettingsView';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { CalculatorPopup } from './components/CalculatorPopup';
import { AuthView } from './components/AuthView';
import { LandingView } from './components/LandingView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth, isSessionActiveAndValid } from './supabase/supabaseAuthContext';
import { LanguageProvider, useTranslation, getStoredLanguage } from './context/LanguageContext';
import {
  subscribeProductsSupabase,
  subscribeCategoriesSupabase,
  subscribeTransactionsSupabase,
  subscribeStockAdjustmentsSupabase,
  subscribeStoreSettingsSupabase,
  subscribeTeamMembersSupabase,
  saveProductToSupabase,
  deleteProductFromSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  recordSaleTransactionInSupabase,
  cancelTransactionInSupabase,
  adjustStockInSupabase,
  saveStoreSettingsToSupabase,
  createTeamMemberInSupabase,
  updateTeamMemberInSupabase,
  deleteTeamMemberInSupabase,
  purgeGhostMembersSupabase,
} from './supabase/supabaseDbService';
import { getStoreStorage, setStoreStorage, removeStoreStorage } from './utils/storage';
import { soundFx } from './utils/audio';
import {
  applyTheme,
  initTheme,
  getStoredTheme,
  applyThemeAccent,
  applyBackgroundTheme,
  getBackgroundThemeStyles,
} from './utils/theme';

function POSAppContent() {
  const { userProfile, loading: authLoading, logout, updateProfile, refreshUserProfile } = useAuth();
  const { language, setLanguage } = useTranslation();
  const storeId = userProfile?.activeStoreId || 'store-default';
  const isOwner = userProfile?.role === 'owner';
  const effectivePermissions: RolePermissions = isOwner
    ? DEFAULT_OWNER_PERMISSIONS
    : { ...DEFAULT_STAFF_PERMISSIONS, ...(userProfile?.permissions || {}) };

  const handleLogout = async () => {
    setActiveTab('dashboard');
    setIsCategoryModalOpen(false);
    setCart([]);
    setActiveReceipt(null);
    setProducts([]);
    setCategories([]);
    setTransactions([]);
    setStockAdjustments([]);
    setTeamMembers([]);
    if (storeId) {
      setStoreStorage(storeId, 'active_tab', 'dashboard');
    }
    await logout(false);
  };

  // Browser History & Undo Lock:
  // When user is logged out, completely prevent browser Back/Forward (undo) from bypassing login
  useEffect(() => {
    const handlePopState = () => {
      if (!userProfile) {
        try {
          window.history.pushState({ loggedOut: true }, '', window.location.pathname);
        } catch {}
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        if (!userProfile || !isSessionActiveAndValid()) {
          logout(true);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [userProfile]);

  // Active tab starts directly on Dashboard upon login
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [products, setProducts] = useState<Product[]>(() =>
    getStoreStorage(storeId, 'products', [])
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    getStoreStorage(storeId, 'categories', [])
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    getStoreStorage(storeId, 'transactions', [])
  );
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() =>
    getStoreStorage(storeId, 'adjustments', [])
  );
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = getStoreStorage(storeId, 'settings', INITIAL_STORE_SETTINGS);
    const theme = getStoredTheme();
    const lang = getStoredLanguage();
    return {
      ...saved,
      theme: saved.theme || theme,
      themeAccent: saved.themeAccent || 'emerald',
      backgroundTheme: saved.backgroundTheme || 'default',
      customBgUrl: saved.customBgUrl || '',
      language: saved.language || lang,
    };
  });
  const [cart, setCart] = useState<CartItem[]>(() =>
    getStoreStorage(storeId, 'cart', [])
  );

  // Active receipt for print preview modal
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Quick category manager modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Team members list
  const [teamMembers, setTeamMembers] = useState<StoreMember[]>(() =>
    getStoreStorage(storeId, 'members', [])
  );

  // Handle switching active tab and save tab preference per store
  useEffect(() => {
    if (storeId) {
      setStoreStorage(storeId, 'active_tab', activeTab);
    }
  }, [activeTab, storeId]);

  // Re-read local store storage when storeId changes
  useEffect(() => {
    if (!storeId) return;
    setProducts(getStoreStorage(storeId, 'products', []));
    setCategories(getStoreStorage(storeId, 'categories', []));
    setTransactions(getStoreStorage(storeId, 'transactions', []));
    setStockAdjustments(getStoreStorage(storeId, 'adjustments', []));
    setStoreSettings(getStoreStorage(storeId, 'settings', INITIAL_STORE_SETTINGS));
    setCart(getStoreStorage(storeId, 'cart', []));
    setTeamMembers(getStoreStorage(storeId, 'members', []));
  }, [storeId]);

  // Real-time Supabase listeners (100% Supabase PostgreSQL Engine)
  useEffect(() => {
    if (!userProfile || !userProfile.activeStoreId) return;

    const currentStoreId = userProfile.activeStoreId;

    // Purge ghost/placeholder members in Supabase
    purgeGhostMembersSupabase(currentStoreId).catch(() => {});

    // Attach real-time Supabase subscriptions (strictly isolated per storeId)
    const unsubProducts = subscribeProductsSupabase(currentStoreId, (items) => {
      setProducts(items);
      setStoreStorage(currentStoreId, 'products', items);
    });

    const unsubCategories = subscribeCategoriesSupabase(currentStoreId, (cats) => {
      setCategories(cats);
      setStoreStorage(currentStoreId, 'categories', cats);
    });

    const unsubTransactions = subscribeTransactionsSupabase(currentStoreId, (txs) => {
      setTransactions(txs);
      setStoreStorage(currentStoreId, 'transactions', txs);
    });

    const unsubAdjustments = subscribeStockAdjustmentsSupabase(currentStoreId, (adjs) => {
      setStockAdjustments(adjs);
      setStoreStorage(currentStoreId, 'adjustments', adjs);
    });

    const unsubSettings = subscribeStoreSettingsSupabase(currentStoreId, (sett) => {
      if (sett) {
        const theme = getStoredTheme();
        const lang = getStoredLanguage();
        const isSound = sett.soundEnabled !== undefined ? Boolean(sett.soundEnabled) : soundFx.enabled;
        const resolvedSettings: StoreSettings = {
          ...sett,
          theme: sett.theme || theme,
          language: sett.language || lang,
          soundEnabled: isSound,
        };
        setStoreSettings(resolvedSettings);
        setStoreStorage(currentStoreId, 'settings', resolvedSettings);
        soundFx.enabled = isSound;
        try {
          localStorage.setItem('kasirku_sound_enabled', JSON.stringify(isSound));
        } catch {}
      }
    });

    const unsubMembers = subscribeTeamMembersSupabase(currentStoreId, (mems) => {
      const cleanMems = mems.filter(
        (m) => m && m.email && m.email.includes('@') && m.name !== 'Anggota Tim'
      );
      setTeamMembers(cleanMems);
      setStoreStorage(currentStoreId, 'members', cleanMems);

      // 1. Real-time Member Revocation:
      // If currently logged-in user is an employee/staff, check if they were deleted by owner
      if (userProfile && userProfile.role !== 'owner' && cleanMems.length > 0) {
        const myEmail = (userProfile.email || '').toLowerCase().trim();
        const myUid = userProfile.uid;
        const myMemId = userProfile.memberId;
        const isStillMember = cleanMems.some(
          (m) =>
            (myMemId && m.id === myMemId) ||
            (myUid && (m.uid === myUid || m.id === myUid)) ||
            (myEmail && (m.email || '').toLowerCase().trim() === myEmail)
        );

        if (!isStillMember) {
          console.warn('[Membership Revoked] Logged in member was removed from store_members.');
          alert('Akses akun Anda telah dinonaktifkan atau dihapus dari tim oleh pemilik toko.');
          handleLogout();
          return;
        }
      }

      // 2. Real-time Member Profile & Avatar Sync:
      if (userProfile && cleanMems.length > 0) {
        const myEmail = (userProfile.email || '').toLowerCase().trim();
        const myUid = userProfile.uid;
        const myMemId = userProfile.memberId;
        const myRecord = cleanMems.find(
          (m) =>
            (myMemId && m.id === myMemId) ||
            (myUid && (m.uid === myUid || m.id === myUid)) ||
            (myEmail && (m.email || '').toLowerCase().trim() === myEmail)
        );

        if (myRecord) {
          const memAvatar = myRecord.avatarUrl || (myRecord.permissions as any)?.avatarUrl;
          if (
            (memAvatar !== undefined && memAvatar !== userProfile.avatarUrl) ||
            (myRecord.name && myRecord.name !== userProfile.displayName)
          ) {
            refreshUserProfile().catch(() => {});
          }
        }
      }
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubTransactions();
      unsubAdjustments();
      unsubSettings();
      unsubMembers();
    };
  }, [userProfile?.activeStoreId]);

  // Sync theme, accent, background & language when settings change
  useEffect(() => {
    if (storeSettings.theme) {
      applyTheme(storeSettings.theme, true);
    } else {
      initTheme();
    }
    applyThemeAccent(storeSettings.themeAccent || 'emerald', true);
    applyBackgroundTheme(storeSettings.backgroundTheme || 'default', storeSettings.customBgUrl || '', true);

    if (storeSettings.language) {
      setLanguage(storeSettings.language);
      document.documentElement.setAttribute('lang', storeSettings.language);
    }
  }, [
    storeSettings.theme,
    storeSettings.themeAccent,
    storeSettings.backgroundTheme,
    storeSettings.customBgUrl,
    storeSettings.language,
  ]);

  // Check role-based permission for active tab
  useEffect(() => {
    if (!userProfile) return;
    const tabPermissions: Record<ActiveTab, boolean | undefined> = {
      dashboard: effectivePermissions.dashboard,
      pos: effectivePermissions.pos,
      inventory: effectivePermissions.inventory,
      transactions: effectivePermissions.transactions,
      reports: effectivePermissions.reports,
      team: isOwner || effectivePermissions.team,
      settings: isOwner || effectivePermissions.settings !== false,
    };

    if (tabPermissions[activeTab] === false) {
      if (effectivePermissions.pos) setActiveTab('pos');
      else if (effectivePermissions.dashboard) setActiveTab('dashboard');
      else if (effectivePermissions.inventory) setActiveTab('inventory');
      else if (effectivePermissions.transactions) setActiveTab('transactions');
      else if (effectivePermissions.reports) setActiveTab('reports');
    }
  }, [activeTab, effectivePermissions, isOwner, userProfile]);

  // Cart operations
  const handleAddToCart = (product: Product) => {
    soundFx.playTap();
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      let updatedCart: CartItem[];
      if (existing) {
        if (existing.quantity >= product.stock) {
          soundFx.playError();
          return prevCart;
        }
        updatedCart = prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        if (product.stock < 1) {
          soundFx.playError();
          return prevCart;
        }
        updatedCart = [...prevCart, { product, quantity: 1 }];
      }
      setStoreStorage(storeId, 'cart', updatedCart);
      return updatedCart;
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    soundFx.playTap();
    setCart((prevCart) => {
      const updated =
        quantity <= 0
          ? prevCart.filter((item) => item.product.id !== productId)
          : prevCart.map((item) => (item.product.id === productId ? { ...item, quantity } : item));
      setStoreStorage(storeId, 'cart', updated);
      return updated;
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    soundFx.playTap();
    setCart((prevCart) => {
      const updated = prevCart.filter((item) => item.product.id !== productId);
      setStoreStorage(storeId, 'cart', updated);
      return updated;
    });
  };

  const handleClearCart = () => {
    soundFx.playTap();
    setCart([]);
    setStoreStorage(storeId, 'cart', []);
  };

  // Transaction Checkout: Deducts product stock and inserts transaction into Supabase
  const handleCheckout = async (transactionData: Omit<Transaction, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString();
    const newTx: Transaction = {
      ...transactionData,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp,
      dateStr: timestamp.split('T')[0],
      status: 'completed',
    };

    const stockUpdates: { productId: string; newStock: number }[] = [];
    const adjustments: StockAdjustment[] = [];

    cart.forEach((item) => {
      const p = item.product;
      const oldStock = p.stock;
      const newStock = Math.max(0, oldStock - item.quantity);
      stockUpdates.push({ productId: p.id, newStock });
      adjustments.push({
        id: 'adj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        productId: p.id,
        productName: p.name,
        sku: p.sku || '',
        previousStock: oldStock,
        newStock,
        difference: -item.quantity,
        reason: 'sale',
        notes: `Penjualan kasir (${newTx.invoiceNumber})`,
        timestamp,
      });
    });

    const updatedProducts = products.map((p) => {
      const match = stockUpdates.find((u) => u.productId === p.id);
      return match ? { ...p, stock: match.newStock } : p;
    });
    const updatedTransactions = [newTx, ...transactions];
    const updatedAdjustments = [...adjustments, ...stockAdjustments];

    setProducts(updatedProducts);
    setTransactions(updatedTransactions);
    setStockAdjustments(updatedAdjustments);
    setCart([]);

    setStoreStorage(storeId, 'products', updatedProducts);
    setStoreStorage(storeId, 'transactions', updatedTransactions);
    setStoreStorage(storeId, 'adjustments', updatedAdjustments);
    setStoreStorage(storeId, 'cart', []);

    // Atomic insert and stock updates in Supabase
    try {
      await recordSaleTransactionInSupabase(storeId, newTx, stockUpdates, adjustments);
    } catch (err) {
      console.warn('[Sale transaction Supabase sync notice]:', err);
    }
  };

  // Transaction Cancellation: Restores stock atomically in Supabase
  const handleCancelTransaction = async (txId: string, reason: string) => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx || targetTx.status === 'cancelled') return;

    const timestamp = new Date().toISOString();
    const stockRestorations: { productId: string; restoredStock: number }[] = [];
    const adjustments: StockAdjustment[] = [];

    targetTx.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const currentStock = prod ? prod.stock : 0;
      const restoredStock = currentStock + item.quantity;

      stockRestorations.push({ productId: item.productId, restoredStock });
      adjustments.push({
        id: 'adj-cancel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        productId: item.productId,
        productName: item.name,
        sku: item.sku,
        previousStock: currentStock,
        newStock: restoredStock,
        difference: item.quantity,
        reason: 'cancelled',
        notes: `Pembatalan struk (${targetTx.invoiceNumber}): ${reason}`,
        timestamp,
      });
    });

    const updatedProducts = products.map((p) => {
      const match = stockRestorations.find((u) => u.productId === p.id);
      return match ? { ...p, stock: match.restoredStock } : p;
    });

    const updatedTransactions = transactions.map((t) =>
      t.id === txId ? { ...t, status: 'cancelled' as const, cancelledReason: reason } : t
    );
    const updatedAdjustments = [...adjustments, ...stockAdjustments];

    setProducts(updatedProducts);
    setTransactions(updatedTransactions);
    setStockAdjustments(updatedAdjustments);

    setStoreStorage(storeId, 'products', updatedProducts);
    setStoreStorage(storeId, 'transactions', updatedTransactions);
    setStoreStorage(storeId, 'adjustments', updatedAdjustments);

    await cancelTransactionInSupabase(storeId, targetTx, reason, stockRestorations, adjustments);
  };

  // Stock Adjustment in Supabase
  const handleAdjustStock = async (adjData: Omit<StockAdjustment, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString();
    const adjustment: StockAdjustment = {
      ...adjData,
      id: 'adj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp,
    };

    const updatedProducts = products.map((p) =>
      p.id === adjData.productId ? { ...p, stock: adjData.newStock } : p
    );
    const updatedAdjustments = [adjustment, ...stockAdjustments];

    setProducts(updatedProducts);
    setStockAdjustments(updatedAdjustments);

    setStoreStorage(storeId, 'products', updatedProducts);
    setStoreStorage(storeId, 'adjustments', updatedAdjustments);

    await adjustStockInSupabase(storeId, adjData.productId, adjData.newStock, adjustment);
  };

  // Product CRUD in Supabase
  const handleAddProduct = async (newProduct: Product) => {
    const updated = [newProduct, ...products];
    setProducts(updated);
    setStoreStorage(storeId, 'products', updated);
    await saveProductToSupabase(storeId, newProduct);
  };

  const handleUpdateProduct = async (updated: Product) => {
    const updatedList = products.map((p) => (p.id === updated.id ? updated : p));
    setProducts(updatedList);
    setStoreStorage(storeId, 'products', updatedList);
    await saveProductToSupabase(storeId, updated);
  };

  const handleDeleteProduct = async (productId: string) => {
    const updatedList = products.filter((p) => p.id !== productId);
    const updatedCart = cart.filter((item) => item.product.id !== productId);

    setProducts(updatedList);
    setCart(updatedCart);

    setStoreStorage(storeId, 'products', updatedList);
    setStoreStorage(storeId, 'cart', updatedCart);

    await deleteProductFromSupabase(storeId, productId);
  };

  // Category CRUD in Supabase
  const handleAddCategory = async (newCat: Category) => {
    const updatedCats = [...categories, newCat];
    setCategories(updatedCats);
    setStoreStorage(storeId, 'categories', updatedCats);
    await saveCategoryToSupabase(storeId, newCat);
  };

  const handleUpdateCategory = async (oldName: string, updated: Category) => {
    const updatedCats = categories.map((c) => (c.name === oldName ? updated : c));
    setCategories(updatedCats);
    setStoreStorage(storeId, 'categories', updatedCats);
    await saveCategoryToSupabase(storeId, updated);

    if (oldName !== updated.name) {
      const updatedProducts = products.map((p) =>
        p.category === oldName ? { ...p, category: updated.name } : p
      );
      setProducts(updatedProducts);
      setStoreStorage(storeId, 'products', updatedProducts);

      await Promise.all(
        products
          .filter((p) => p.category === oldName)
          .map((p) => saveProductToSupabase(storeId, { ...p, category: updated.name }))
      );
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string, fallbackCategoryName: string) => {
    const updatedCats = categories.filter((c) => c.id !== catId);
    setCategories(updatedCats);
    setStoreStorage(storeId, 'categories', updatedCats);
    await deleteCategoryFromSupabase(storeId, catId);

    const updatedProducts = products.map((p) =>
      p.category === catName ? { ...p, category: fallbackCategoryName } : p
    );
    setProducts(updatedProducts);
    setStoreStorage(storeId, 'products', updatedProducts);

    await Promise.all(
      products
        .filter((p) => p.category === catName)
        .map((p) => saveProductToSupabase(storeId, { ...p, category: fallbackCategoryName }))
    );
  };

  // Save Settings to Supabase
  const handleSaveStoreSettings = async (newSettings: StoreSettings) => {
    const updatedTheme = newSettings.theme || getStoredTheme();
    const updatedLang = newSettings.language || getStoredLanguage();
    const settingsToSave: StoreSettings = {
      ...newSettings,
      theme: updatedTheme,
      language: updatedLang,
    };
    setStoreSettings(settingsToSave);
    setStoreStorage(storeId, 'settings', settingsToSave);
    applyTheme(updatedTheme, true);
    applyThemeAccent(settingsToSave.themeAccent || 'emerald', true);
    applyBackgroundTheme(settingsToSave.backgroundTheme || 'default', settingsToSave.customBgUrl || '', true);
    setLanguage(updatedLang);
    document.documentElement.setAttribute('lang', updatedLang);
    await saveStoreSettingsToSupabase(storeId, settingsToSave);
  };

  // Team Management Handlers in Supabase
  const handleAddTeamMember = async (memberData: AddMemberPayload) => {
    const safeRole: UserRole = memberData.role === 'owner' ? 'admin' : memberData.role;
    const member = await createTeamMemberInSupabase({
      storeId,
      storeName: storeSettings.storeName,
      username: memberData.username || memberData.email.split('@')[0],
      name: memberData.name,
      email: memberData.email,
      password: memberData.password,
      avatarUrl: memberData.avatarUrl,
      role: safeRole,
      permissions: memberData.permissions,
      invitedBy: userProfile?.displayName || 'Owner',
    });

    const targetEmail = (memberData.email || '').toLowerCase().trim();
    const filtered = teamMembers.filter(
      (m) => (m.email || '').toLowerCase().trim() !== targetEmail
    );
    const updatedMembers = [...filtered, member];
    setTeamMembers(updatedMembers);
    setStoreStorage(storeId, 'members', updatedMembers);

    return { success: true, member };
  };

  const handleUpdateTeamMember = async (member: StoreMember) => {
    const existingOwner = teamMembers.find((m) => m.role === 'owner');
    let finalRole = member.role;
    if (finalRole === 'owner' && existingOwner && existingOwner.id !== member.id) {
      finalRole = 'admin';
    }
    const safeMember = { ...member, role: finalRole };
    const updated = teamMembers.map((m) => (m.id === safeMember.id ? safeMember : m));
    setTeamMembers(updated);
    setStoreStorage(storeId, 'members', updated);
    await updateTeamMemberInSupabase(storeId, safeMember);
  };

  const handleDeleteTeamMember = async (memberId: string, email?: string, username?: string) => {
    const updated = teamMembers.filter((m) => m.id !== memberId);
    setTeamMembers(updated);
    setStoreStorage(storeId, 'members', updated);
    await deleteTeamMemberInSupabase(storeId, memberId, email, username);
  };

  // Reset store data to clean zero in Supabase
  const handleResetData = async () => {
    for (const p of products) {
      await deleteProductFromSupabase(storeId, p.id);
    }
    for (const c of categories) {
      await deleteCategoryFromSupabase(storeId, c.id);
    }
    removeStoreStorage(storeId, 'products');
    removeStoreStorage(storeId, 'categories');
    removeStoreStorage(storeId, 'transactions');
    removeStoreStorage(storeId, 'adjustments');
    removeStoreStorage(storeId, 'cart');

    setProducts([]);
    setCategories([]);
    setTransactions([]);
    setStockAdjustments([]);
    setCart([]);

    setStoreStorage(storeId, 'products', []);
    setStoreStorage(storeId, 'categories', []);
    setStoreStorage(storeId, 'transactions', []);
    setStoreStorage(storeId, 'adjustments', []);
    setStoreStorage(storeId, 'cart', []);
  };

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const bgStyles = getBackgroundThemeStyles(storeSettings.backgroundTheme, storeSettings.customBgUrl);

  return (
    <div
      className={`min-h-screen w-full min-w-0 font-sans flex flex-col transition-colors overflow-x-hidden ${bgStyles.containerClass}`}
      style={bgStyles.inlineStyle}
    >
      {/* Background wallpaper overlay - rendered as a fixed background layer so it NEVER creates a containing block for fixed elements */}
      {bgStyles.overlayClass && (
        <div
          className={`fixed inset-0 pointer-events-none z-0 ${bgStyles.overlayClass}`}
          aria-hidden="true"
        />
      )}

      <div className="w-full min-h-screen flex flex-col relative z-10">
        {/* Floating Navigation Sidebar with Permissions & Role Badging */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          storeSettings={storeSettings}
          onOpenSettings={() => setActiveTab('settings')}
          cartItemCount={cartItemCount}
          lowStockCount={lowStockCount}
          userName={userProfile?.displayName || 'Pengguna'}
          userEmail={userProfile?.email || ''}
          userRole={userProfile?.role || 'owner'}
          userAvatar={userProfile?.avatarUrl}
          permissions={effectivePermissions}
          teamMemberCount={teamMembers.length}
          onLogout={handleLogout}
          onEditProfile={() => setActiveTab('team')}
        />

        {/* Main View Port with Floating Sidebar Margin */}
        <main className="flex-1 w-full min-w-0 pl-0 lg:pl-72 pb-6 sm:pb-8 lg:pb-8 transition-all duration-300">
        {activeTab === 'dashboard' && effectivePermissions.dashboard && (
          <DashboardView
            products={products}
            transactions={transactions}
            storeSettings={storeSettings}
            cashierName={userProfile?.displayName || storeSettings.cashierName}
            onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
          />
        )}

        {activeTab === 'pos' && effectivePermissions.pos && (
          <POSView
            products={products}
            categories={categories}
            cart={cart}
            setCart={setCart}
            storeSettings={storeSettings}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onCompleteTransaction={handleCheckout}
            onViewReceipt={(tx) => setActiveReceipt(tx)}
            onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
          />
        )}

        {activeTab === 'inventory' && effectivePermissions.inventory && (
          <InventoryView
            products={products}
            categories={categories}
            storeSettings={storeSettings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
            onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
          />
        )}

        {activeTab === 'transactions' && effectivePermissions.transactions && (
          <TransactionsView
            transactions={transactions}
            products={products}
            storeSettings={storeSettings}
            onPrintReceipt={(tx) => setActiveReceipt(tx)}
            onCancelTransaction={handleCancelTransaction}
          />
        )}

        {activeTab === 'reports' && effectivePermissions.reports && (
          <ReportsView
            transactions={transactions}
            products={products}
            stockAdjustments={stockAdjustments}
            storeSettings={storeSettings}
          />
        )}

        {activeTab === 'team' && (isOwner || effectivePermissions.team) && (
          <TeamManagerView
            members={teamMembers}
            currentUserId={userProfile?.uid || ''}
            currentUserRole={userProfile?.role || 'owner'}
            currentUserName={userProfile?.displayName}
            currentUserEmail={userProfile?.email}
            currentUserAvatar={userProfile?.avatarUrl}
            storeName={storeSettings.storeName}
            storeId={storeId}
            onAddMember={handleAddTeamMember}
            onUpdateMember={handleUpdateTeamMember}
            onDeleteMember={handleDeleteTeamMember}
            onUpdateProfile={updateProfile}
          />
        )}

        {activeTab === 'settings' && (isOwner || effectivePermissions.settings !== false) && (
          <SettingsView
            settings={storeSettings}
            onSave={handleSaveStoreSettings}
            onResetData={handleResetData}
            onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
          />
        )}
      </main>

      {/* Modal: Receipt Preview & Physical Thermal Printing */}
      {activeReceipt && (
        <ReceiptPrint
          transaction={activeReceipt}
          storeSettings={storeSettings}
          showModalControls={true}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Modal: Category Quick Manager */}
      {isCategoryModalOpen && (
        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories}
          products={products}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {/* Floating Popup Retail Calculator */}
      <CalculatorPopup />
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AppWithAuth />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

function AppWithAuth() {
  const {
    userProfile,
    loading,
    isPasswordRecovery,
    updateUserPassword,
    cancelPasswordRecovery,
  } = useAuth();
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Whenever unauthenticated, ALWAYS ensure the main landing page is shown first
  useEffect(() => {
    if (!userProfile) {
      setShowLanding(true);
    }
  }, [userProfile]);

  return (
    <>
      {isPasswordRecovery && (
        <ResetPasswordModal
          isOpen={isPasswordRecovery}
          onSave={updateUserPassword}
          onClose={cancelPasswordRecovery}
        />
      )}

      {loading ? (
        <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-white text-base font-semibold tracking-wide">Memuat KasirKu POS...</h2>
          <p className="text-neutral-400 text-xs mt-1">Menghubungkan ke Supabase Cloud</p>
        </div>
      ) : !userProfile ? (
        showLanding ? (
          <LandingView
            onOpenAuth={(mode) => {
              setAuthMode(mode);
              setShowLanding(false);
            }}
            onGetStarted={() => {
              setAuthMode('register');
              setShowLanding(false);
            }}
            onSignIn={() => {
              setAuthMode('login');
              setShowLanding(false);
            }}
          />
        ) : (
          <AuthView
            initialMode={authMode}
            onBackToLanding={() => setShowLanding(true)}
          />
        )
      ) : (
        <POSAppContent />
      )}
    </>
  );
}

export default App;
