import React, { useMemo } from 'react';
import { Product, Transaction, StoreSettings } from '../types/pos';
import { formatRupiah, formatNumber, formatTanggalPendek } from '../utils/format';
import { soundFx } from '../utils/audio';
import { ActiveTab } from './Sidebar';
import { useTranslation } from '../context/LanguageContext';
import { TopProductsBarChart } from './charts/TopProductsBarChart';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowRight,
  History,
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  transactions: Transaction[];
  storeSettings: StoreSettings;
  cashierName: string;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenAddProduct?: () => void;
  onViewReceipt: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  transactions,
  storeSettings,
  cashierName,
  onNavigateTab,
  onOpenAddProduct,
  onViewReceipt,
}) => {
  const { t, language } = useTranslation();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's completed transactions
  const todayCompletedTx = useMemo(() => {
    return transactions.filter(
      (tx) => tx.status === 'completed' && tx.timestamp.split('T')[0] === todayStr
    );
  }, [transactions, todayStr]);

  // Overall analytics
  const {
    todayRevenue,
    todayTxCount,
    todayProfit,
    totalAssetValue,
    lowStockItems,
    outOfStockItems,
    topProducts,
  } = useMemo(() => {
    const rev = todayCompletedTx.reduce((sum, t) => {
      const amt = Number(t.totalAmount ?? (t as any).total ?? 0);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);
    const prof = todayCompletedTx.reduce((sum, t) => {
      const p = Number(t.profit ?? 0);
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);
    const asset = products.reduce((sum, p) => {
      const val = Number(p.stock || 0) * Number(p.costPrice || 0);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);

    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
    const outOfStock = products.filter((p) => p.stock <= 0);

    // Sales map across all transactions
    const salesMap: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {};
    (transactions || [])
      .filter((t) => t && t.status === 'completed')
      .forEach((t) => {
        (t.items || []).forEach((item) => {
          if (!item) return;
          const pid = item.productId || item.sku || item.name;
          if (!pid) return;
          if (!salesMap[pid]) {
            salesMap[pid] = {
              name: item.name || 'Produk',
              sku: item.sku || '',
              qty: 0,
              revenue: 0,
            };
          }
          salesMap[pid].qty += (item.quantity || 0);
          salesMap[pid].revenue += (item.subtotal || 0);
        });
      });

    const top = Object.values(salesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      todayRevenue: rev,
      todayTxCount: todayCompletedTx.length,
      todayProfit: prof,
      totalAssetValue: asset,
      lowStockItems: lowStock,
      outOfStockItems: outOfStock,
      topProducts: top,
    };
  }, [todayCompletedTx, products, transactions]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Welcome Banner with Firebase Live Status */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-xs overflow-hidden shrink-0 mt-0.5 sm:mt-1">
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
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">
                Toko: <strong className="text-neutral-900 dark:text-white">{storeSettings.storeName || 'VarzyPos'}</strong>
              </span>
              <span className="text-xs text-neutral-400">·</span>
              <span className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Petugas: <strong className="text-neutral-900 dark:text-white">{cashierName}</strong>
              </span>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mt-1 truncate">
              Dashboard {storeSettings.storeName || 'VarzyPos'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
              {storeSettings.tagline || 'Sistem Kasir & Stok Real-Time'} — Transaksi dan inventaris stok tersinkronisasi.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards: Revenue Today, Transactions, Stock Value, Stock Warnings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Revenue */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">{t.dashboard.todayRevenue}</span>
            <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {formatRupiah(todayRevenue)}
          </div>
          <div className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-medium font-mono-numbers pt-0.5 truncate">
            {t.dashboard.todayProfit}: +{formatRupiah(todayProfit)}
          </div>
        </div>

        {/* Today's Transactions Count */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">{t.dashboard.todayTransactions}</span>
            <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {formatNumber(todayTxCount)}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">transaksi</span>
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 pt-0.5 truncate">
            Tersimpan aman di cloud
          </div>
        </div>

        {/* Inventory Physical Asset Value */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">{t.dashboard.totalAssetValue}</span>
            <Package className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {formatRupiah(totalAssetValue)}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers pt-0.5 truncate">
            {language === 'en' ? `From ${products.length} product SKUs` : `Dari ${products.length} SKU barang`}
          </div>
        </div>

        {/* Stock Alert */}
        <div
          onClick={() => {
            soundFx.playTap();
            onNavigateTab('inventory');
          }}
          className={`p-3.5 sm:p-4 md:p-5 rounded-xl border shadow-xs cursor-pointer transition-all space-y-1 sm:space-y-1.5 ${
            outOfStockItems.length > 0 || lowStockItems.length > 0
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 hover:border-amber-400'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate">{t.dashboard.lowStockAlert}</span>
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                outOfStockItems.length > 0 ? 'text-rose-600' : 'text-amber-600'
              }`}
            />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {outOfStockItems.length + lowStockItems.length}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">{t.dashboard.restockNow}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 pt-0.5 flex items-center gap-1 truncate">
            <span>{outOfStockItems.length} {t.dashboard.outOfStockAlert}</span>
            <span>·</span>
            <span>{lowStockItems.length} {t.inventory.lowStockOnly}</span>
          </div>
        </div>
      </div>

      {/* Diagram Batang: Produk Paling Laris Berdasarkan Waktu (Harian, Mingguan, Bulanan) */}
      <TopProductsBarChart
        transactions={transactions}
        products={products}
        onNavigateToInventory={() => onNavigateTab('inventory')}
      />

      {/* Grid: Recent Live Transactions & Low Stock Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Recent Transactions Feed (7 cols) */}
        <div className="md:col-span-7 bg-white dark:bg-neutral-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {t.dashboard.recentTransactions}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {language === 'en' ? 'Latest completed checkout orders' : 'Data penjualan yang baru saja diselesaikan di kasir'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                soundFx.playTap();
                onNavigateTab('transactions');
              }}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>{t.dashboard.viewAllTransactions}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {transactions.length === 0 ? (
              <p className="text-neutral-400 dark:text-neutral-500 text-center py-6 text-xs">{t.dashboard.noTransactionsToday}</p>
            ) : (
              transactions.slice(0, 5).map((tx) => {
                const totalItems = (tx.items || []).reduce((sum, i) => sum + (i?.quantity || 0), 0);
                const isCancelled = tx.status === 'cancelled';

                return (
                  <div
                    key={tx.id}
                    onClick={() => onViewReceipt(tx)}
                    className="p-3 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-emerald-50/40 dark:hover:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold font-mono-numbers text-neutral-900 dark:text-white">
                          {tx.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase font-sans">
                          · {tx.paymentMethod}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span>{tx.customerName || (language === 'en' ? 'Walk-in' : 'Umum')}</span>
                        <span>·</span>
                        <span>{totalItems} {t.common.items}</span>
                        <span>·</span>
                        <span>{formatTanggalPendek(tx.timestamp)}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono-numbers shrink-0">
                      <div className="font-bold text-neutral-900 dark:text-white">
                        {formatRupiah(tx.totalAmount ?? (tx as any).total ?? 0)}
                      </div>
                      {!isCancelled ? (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          +{formatRupiah(tx.profit ?? 0)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400">{t.transactions.cancelled}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Low Stock Watchlist (5 cols) */}
        <div className="md:col-span-5 bg-white dark:bg-neutral-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{t.dashboard.lowStockAlert}</span>
            </h3>
            <button
              onClick={() => {
                soundFx.playTap();
                onNavigateTab('inventory');
              }}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 cursor-pointer"
            >
              {language === 'en' ? 'Manage Stock' : 'Kelola Stok'}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {[...outOfStockItems, ...lowStockItems].length === 0 ? (
              <div className="p-6 text-center text-neutral-400 dark:text-neutral-500 text-xs">
                {t.dashboard.noLowStock}
              </div>
            ) : (
              [...outOfStockItems, ...lowStockItems].slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl flex items-center justify-between border border-neutral-100 dark:border-neutral-800"
                >
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white">{p.name}</div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono-numbers">
                      {p.sku} · {p.category}
                    </div>
                  </div>
                  <div className="text-right font-mono-numbers">
                    {p.stock <= 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold text-xs">{t.dashboard.outOfStockAlert}</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 font-bold text-xs">
                        {language === 'en' ? `Left ${p.stock} ${p.unit}` : `Sisa ${p.stock} ${p.unit}`}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
