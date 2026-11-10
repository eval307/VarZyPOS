import React, { useState } from 'react';
import { StoreSettings, UserRole, RolePermissions } from '../types/pos';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Printer,
  Crown,
  Shield,
  User,
  MoreVertical,
  X,
  Edit2,
  Camera,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { useTranslation } from '../context/LanguageContext';
import { getAvatarUrl } from '../utils/avatar';

export type ActiveTab = 'dashboard' | 'pos' | 'inventory' | 'transactions' | 'reports' | 'team' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  storeSettings: StoreSettings;
  onOpenSettings?: () => void;
  cartItemCount: number;
  lowStockCount: number;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: UserRole;
  userAvatar?: string | null;
  permissions?: RolePermissions;
  teamMemberCount?: number;
  onLogout?: () => void;
  onEditProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  storeSettings,
  onOpenSettings,
  cartItemCount,
  lowStockCount,
  userEmail,
  userName,
  userRole = 'owner',
  userAvatar,
  permissions = {
    dashboard: true,
    pos: true,
    inventory: true,
    transactions: true,
    reports: true,
    team: true,
    settings: true,
  },
  teamMemberCount = 1,
  onLogout,
  onEditProfile,
}) => {
  const { t, language } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleTabClick = (tab: ActiveTab) => {
    soundFx.playTap();
    onTabChange(tab);
  };

  const safePerms: RolePermissions = permissions || {
    dashboard: true,
    pos: true,
    inventory: true,
    transactions: true,
    reports: true,
    team: true,
    settings: true,
  };

  const allNavItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: t.nav.dashboard,
      shortLabel: language === 'en' ? 'Home' : 'Beranda',
      icon: LayoutDashboard,
      badge: null,
      desc: 'Ringkasan & Metrik',
      visible: Boolean(userRole === 'owner' || safePerms?.dashboard),
    },
    {
      id: 'pos' as ActiveTab,
      label: t.nav.pos,
      shortLabel: language === 'en' ? 'POS' : 'Kasir',
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? cartItemCount : null,
      badgeType: 'emerald',
      desc: 'Transaksi & Penjualan',
      visible: Boolean(userRole === 'owner' || safePerms?.pos),
    },
    {
      id: 'inventory' as ActiveTab,
      label: t.nav.inventory,
      shortLabel: language === 'en' ? 'Stock' : 'Produk',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeType: 'amber',
      desc: 'Katalog & Jumlah Stok',
      visible: Boolean(userRole === 'owner' || safePerms?.inventory),
    },
    {
      id: 'transactions' as ActiveTab,
      label: t.nav.transactions,
      shortLabel: language === 'en' ? 'Orders' : 'Riwayat',
      icon: History,
      badge: null,
      desc: 'Daftar Nota Transaksi',
      visible: Boolean(userRole === 'owner' || safePerms?.transactions),
    },
    {
      id: 'reports' as ActiveTab,
      label: t.nav.reports,
      shortLabel: language === 'en' ? 'Reports' : 'Laporan',
      icon: BarChart3,
      badge: null,
      desc: 'Analisis Pendapatan',
      visible: Boolean(userRole === 'owner' || safePerms?.reports),
    },
    {
      id: 'team' as ActiveTab,
      label: t.nav.team,
      shortLabel: language === 'en' ? 'Team' : 'Tim',
      icon: Users,
      badge: teamMemberCount > 1 ? teamMemberCount : null,
      badgeType: 'emerald',
      desc: 'Kolaborasi & Peran',
      visible: Boolean(userRole === 'owner' || safePerms?.team),
    },
    {
      id: 'settings' as ActiveTab,
      label: t.nav.settings,
      shortLabel: language === 'en' ? 'Settings' : 'Setting',
      icon: Settings,
      badge: null,
      desc: 'Profil, Nota, Tema & Bahasa',
      visible: Boolean(userRole === 'owner' || safePerms?.settings !== false),
    },
  ];

  // Only render tabs that the current user has permission to see
  const visibleNavItems = allNavItems.filter((item) => item.visible);

  const defaultPrinter =
    storeSettings.printers?.find((p) => p.isDefault) || storeSettings.printers?.[0];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-200">
            <Crown className="w-2.5 h-2.5 text-amber-600" />
            Owner
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-sky-100 text-sky-900 font-bold px-1.5 py-0.2 rounded border border-sky-200">
            <Shield className="w-2.5 h-2.5 text-sky-600" />
            Admin
          </span>
        );
      case 'pengguna':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
            <User className="w-2.5 h-2.5 text-emerald-600" />
            Kasir
          </span>
        );
    }
  };

  return (
    <>
      {/* ======================================================== */}
      {/* DESKTOP ONLY: FIXED LENGTH FLOATING SIDEBAR (1024px+)    */}
      {/* Panjang/tinggi fiks viewport, tidak mengikuti isi konten  */}
      {/* ======================================================== */}
      <aside
        className="hidden lg:flex fixed top-4 left-4 z-40 w-64 h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-xl shadow-neutral-900/5 border border-neutral-200/90 dark:border-neutral-800 flex-col justify-between p-3.5 select-none transition-all duration-300 overflow-hidden"
        aria-label="Floating Navigation Sidebar"
      >
        {/* Top: Store Profile Brand Card & Navigation */}
        <div className="flex flex-col min-h-0 flex-1 space-y-3 overflow-hidden">
          <div className="flex items-center gap-3 p-2 bg-neutral-50/80 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-xs overflow-hidden shrink-0">
              {storeSettings.logoUrl ? (
                <img
                  src={storeSettings.logoUrl}
                  alt={storeSettings.storeName || 'VarzyPos'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>V</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate tracking-tight">
                {storeSettings.storeName || 'VarzyPos'}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="truncate">Ruang Kerja Toko</span>
              </div>
            </div>
          </div>

          {/* Section Divider */}
          <div className="px-2 pt-1 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Menu Utama
            </span>
            {userRole && getRoleBadge(userRole)}
          </div>

          {/* Navigation Links List (Scrollable if height is constrained, preserving fixed sidebar height) */}
          <nav className="space-y-1.5 overflow-y-auto min-h-0 flex-1 pr-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  title={item.label}
                  className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer relative ${
                    isActive
                      ? 'bg-emerald-600 dark:bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors relative ${
                        isActive
                          ? 'bg-emerald-700/80 text-white'
                          : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white group-hover:bg-neutral-200/60 dark:group-hover:bg-neutral-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {/* Badges for desktop view */}
                  {item.badge !== null && (
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.badgeType === 'amber'
                          ? isActive
                            ? 'bg-amber-400 text-neutral-950'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Active Printer, User Profile & Settings */}
        <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0 mt-auto">
          {/* Active Printer Badge */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-[11px] text-neutral-500 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-800">
            <span className="flex items-center gap-1.5 truncate">
              <Printer className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">{defaultPrinter?.name || 'Printer Kasir'}</span>
            </span>
            <span className="text-[10px] font-semibold bg-neutral-200/80 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 px-1.5 py-0.2 rounded shrink-0">
              {storeSettings.receiptLayout?.paperWidth || '80mm'}
            </span>
          </div>

          {/* Cashier / User Info Card with Email Avatar */}
          <div
            onClick={onEditProfile}
            className={`flex items-center justify-between p-2 rounded-xl bg-neutral-50/70 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 transition-all ${
              onEditProfile ? 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-emerald-300 dark:hover:border-emerald-700' : ''
            }`}
            title="Klik untuk ganti profil"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={getAvatarUrl({
                    email: userEmail,
                    avatarUrl: userAvatar,
                    name: userName || 'Kasir',
                  })}
                  alt={userName || 'Kasir'}
                  className="w-8 h-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      userName || 'K'
                    )}&radius=50`;
                  }}
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-neutral-900 ${
                    userRole === 'owner'
                      ? 'bg-amber-500 text-white'
                      : userRole === 'admin'
                      ? 'bg-sky-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {userRole === 'owner' ? (
                    <Crown className="w-2 h-2" />
                  ) : userRole === 'admin' ? (
                    <Shield className="w-2 h-2" />
                  ) : (
                    <User className="w-2 h-2" />
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {userName || storeSettings.cashierName || 'Kasir'}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {userEmail || 'Petugas Toko'}
                </p>
              </div>
            </div>
            {onEditProfile && (
              <span className="p-1 text-neutral-400 hover:text-emerald-600 transition-colors shrink-0">
                <Edit2 className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {/* Action Row: Settings & Logout */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {permissions.settings !== false ? (
              <button
                onClick={() => handleTabClick('settings')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-neutral-900 dark:bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title={t.nav.settings}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{t.nav.settings}</span>
              </button>
            ) : (
              <div />
            )}

            {onLogout && (
              <button
                onClick={() => {
                  soundFx.playTap();
                  onLogout();
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title={t.nav.logout}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.nav.logout}</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE & TABLET: SLIDE-OVER SIDEBAR DRAWER (< lg)        */}
      {/* Buka-tutup dengan klik tombol titik 3 (MoreVertical)     */}
      {/* ======================================================== */}
      {/* Backdrop overlay */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel - Translucent Frosted Glass on Tablet & Mobile */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 sm:w-80 h-screen max-h-screen bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-r border-neutral-200/60 dark:border-neutral-800/60 shadow-2xl flex flex-col justify-between p-4 select-none transform transition-transform duration-300 ease-out overflow-hidden ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile and Tablet Sidebar Navigation"
      >
        <div className="flex flex-col min-h-0 flex-1 space-y-4 overflow-hidden">
          {/* Drawer Header: Store Info & Close X Button */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-200/50 dark:border-neutral-800/60 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-xs overflow-hidden shrink-0">
                {storeSettings.logoUrl ? (
                  <img
                    src={storeSettings.logoUrl}
                    alt={storeSettings.storeName || 'VarzyPos'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>V</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate tracking-tight">
                  {storeSettings.storeName || 'VarzyPos'}
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="truncate">Ruang Kerja Toko</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Divider with User Role */}
          <div className="px-1 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Menu Utama
            </span>
            {userRole && getRoleBadge(userRole)}
          </div>

          {/* Navigation Links List */}
          <nav className="space-y-1 overflow-y-auto min-h-0 flex-1 pr-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleTabClick(item.id);
                    setIsDrawerOpen(false);
                  }}
                  title={item.label}
                  className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-emerald-700/80 text-white'
                          : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white group-hover:bg-neutral-200/60 dark:group-hover:bg-neutral-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="truncate block font-semibold">{item.label}</span>
                      <span
                        className={`text-[10px] font-normal truncate block ${
                          isActive ? 'text-emerald-100' : 'text-neutral-400 dark:text-neutral-500'
                        }`}
                      >
                        {item.desc}
                      </span>
                    </div>
                  </div>

                  {/* Badge */}
                  {item.badge !== null && (
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.badgeType === 'amber'
                          ? isActive
                            ? 'bg-amber-400 text-neutral-950'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Drawer Footer: Printer, User Profile & Settings/Logout */}
        <div className="space-y-2 pt-3 border-t border-neutral-200/50 dark:border-neutral-800/60 shrink-0 mt-auto">
          {/* Active Printer Badge */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-100/60 dark:bg-neutral-800/50 backdrop-blur-xs rounded-lg text-[11px] text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-750/50">
            <span className="flex items-center gap-1.5 truncate">
              <Printer className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">{defaultPrinter?.name || 'Printer Kasir'}</span>
            </span>
            <span className="text-[10px] font-semibold bg-neutral-200/80 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 px-1.5 py-0.2 rounded shrink-0">
              {storeSettings.receiptLayout?.paperWidth || '80mm'}
            </span>
          </div>

          {/* Cashier / User Info Card */}
          <div
            onClick={() => {
              if (onEditProfile) {
                setIsDrawerOpen(false);
                onEditProfile();
              }
            }}
            className={`flex items-center justify-between p-2 rounded-xl bg-neutral-100/60 dark:bg-neutral-800/50 backdrop-blur-xs border border-neutral-200/60 dark:border-neutral-750/50 ${
              onEditProfile ? 'cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={getAvatarUrl({
                    email: userEmail,
                    avatarUrl: userAvatar,
                    name: userName || 'Kasir',
                  })}
                  alt={userName || 'Kasir'}
                  className="w-8 h-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-2xs"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      userName || 'K'
                    )}&radius=50`;
                  }}
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-neutral-900 ${
                    userRole === 'owner'
                      ? 'bg-amber-500 text-white'
                      : userRole === 'admin'
                      ? 'bg-sky-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {userRole === 'owner' ? (
                    <Crown className="w-2 h-2" />
                  ) : userRole === 'admin' ? (
                    <Shield className="w-2 h-2" />
                  ) : (
                    <User className="w-2 h-2" />
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {userName || storeSettings.cashierName || 'Kasir'}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {userEmail || 'Petugas Toko'}
                </p>
              </div>
            </div>
            {onEditProfile && (
              <span className="p-1 text-neutral-400 hover:text-emerald-600 transition-colors shrink-0">
                <Edit2 className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {/* Action Row: Settings & Logout */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {permissions.settings !== false ? (
              <button
                onClick={() => {
                  handleTabClick('settings');
                  setIsDrawerOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-neutral-900 dark:bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title={t.nav.settings}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{t.nav.settings}</span>
              </button>
            ) : (
              <div />
            )}

            {onLogout && (
              <button
                onClick={() => {
                  soundFx.playTap();
                  setIsDrawerOpen(false);
                  onLogout();
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title={t.nav.logout}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.nav.logout}</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE & TABLET: FULL-WIDTH LOCKED TOP HEADER            */}
      {/* Ada tombol titik 3 (MoreVertical) untuk buka sidebar    */}
      {/* ======================================================== */}
      <div className="lg:hidden sticky top-0 inset-x-0 w-full shrink-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg border-b border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
        <header className="w-full px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Tombol Titik Tiga (MoreVertical) untuk buka Sidebar */}
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                setIsDrawerOpen(true);
              }}
              className="p-2 -ml-1 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0 border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs"
              title="Buka Menu Sidebar (Titik 3)"
              aria-label="Buka Menu Sidebar"
            >
              <MoreVertical className="w-5 h-5 text-neutral-800 dark:text-neutral-100" />
            </button>

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs overflow-hidden shrink-0">
              {storeSettings.logoUrl ? (
                <img
                  src={storeSettings.logoUrl}
                  alt={storeSettings.storeName || 'VarzyPos'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>V</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight truncate">
                  {storeSettings.storeName || 'VarzyPos'}
                </h1>
                <div className="shrink-0">{userRole && getRoleBadge(userRole)}</div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                {userName || 'Kasir'} · <span className="font-mono-numbers">{defaultPrinter?.name || 'Printer Kasir'}</span>
              </p>
            </div>
          </div>

          {/* Right Header: Active Tab Badge / Quick Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono uppercase tracking-wide">
              {allNavItems.find(i => i.id === activeTab)?.label || activeTab}
            </span>

            {permissions.settings !== false && (
              <button
                onClick={() => handleTabClick('settings')}
                className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title={t.nav.settings}
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>
      </div>
    </>
  );
};
