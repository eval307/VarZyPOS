import React, { useState, useMemo } from 'react';
import { Transaction, Product } from '../../types/pos';
import { formatRupiah, formatNumber } from '../../utils/format';
import { soundFx } from '../../utils/audio';
import { useTranslation } from '../../context/LanguageContext';
import {
  BarChart3,
  Calendar,
  Flame,
  Award,
  Crown,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';

export type ChartTimeframe = 'daily' | 'weekly' | 'monthly' | 'all';
export type ChartSortMetric = 'qty' | 'revenue';

interface TopProductsBarChartProps {
  transactions: Transaction[];
  products: Product[];
  onNavigateToInventory?: () => void;
  className?: string;
}

export const TopProductsBarChart: React.FC<TopProductsBarChartProps> = ({
  transactions,
  products,
  onNavigateToInventory,
  className = '',
}) => {
  const { t, language } = useTranslation();
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('weekly');
  const [metric, setMetric] = useState<ChartSortMetric>('qty');
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [chartLayout, setChartLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  // Filter completed transactions based on selected timeframe
  const filteredTx = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const monthAgo = new Date();
    monthAgo.setDate(now.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    return transactions.filter((tx) => {
      if (tx.status !== 'completed') return false;
      const txDate = tx.timestamp.split('T')[0];

      if (timeframe === 'daily') {
        return txDate === todayStr;
      }
      if (timeframe === 'weekly') {
        return txDate >= weekAgoStr;
      }
      if (timeframe === 'monthly') {
        return txDate >= monthAgoStr;
      }
      return true; // 'all'
    });
  }, [transactions, timeframe]);

  // Map products to quick lookup
  const productMetaMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Aggregate item sales
  const { rankedProducts, totalQtySold, totalRevenueSold, maxMetricValue } = useMemo(() => {
    const agg: Record<
      string,
      {
        id: string;
        name: string;
        sku: string;
        category: string;
        unit: string;
        qty: number;
        revenue: number;
        profit: number;
      }
    > = {};

    let totalQty = 0;
    let totalRev = 0;

    (filteredTx || []).forEach((tx) => {
      (tx.items || []).forEach((item) => {
        if (!item) return;
        totalQty += (item.quantity || 0);
        totalRev += (item.subtotal || 0);

        const meta = productMetaMap.get(item.productId);
        const category = meta?.category || 'Lainnya';
        const unit = meta?.unit || 'pcs';

        if (!agg[item.productId]) {
          agg[item.productId] = {
            id: item.productId,
            name: item.name || 'Produk',
            sku: item.sku || '',
            category,
            unit,
            qty: 0,
            revenue: 0,
            profit: 0,
          };
        }

        agg[item.productId].qty += (item.quantity || 0);
        agg[item.productId].revenue += (item.subtotal || 0);
        agg[item.productId].profit += (item.subtotal || 0) - (item.costPrice || 0) * (item.quantity || 0);
      });
    });

    const list = Object.values(agg).sort((a, b) => {
      if (metric === 'qty') {
        return b.qty - a.qty || b.revenue - a.revenue;
      }
      return b.revenue - a.revenue || b.qty - a.qty;
    });

    const topList = list.slice(0, 6);
    const maxVal = topList.length > 0 ? (metric === 'qty' ? topList[0].qty : topList[0].revenue) : 1;

    return {
      rankedProducts: topList,
      totalQtySold: totalQty,
      totalRevenueSold: totalRev,
      maxMetricValue: maxVal,
    };
  }, [filteredTx, metric, productMetaMap]);

  const getTimeframeLabel = (tf: ChartTimeframe) => {
    switch (tf) {
      case 'daily':
        return language === 'en' ? 'Today' : 'Hari Ini';
      case 'weekly':
        return language === 'en' ? 'Last 7 Days' : '7 Hari';
      case 'monthly':
        return language === 'en' ? 'This Month' : 'Bulan Ini';
      case 'all':
        return language === 'en' ? 'All Time' : 'Semua';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-4 sm:p-6 shadow-xs space-y-4 transition-colors ${className}`}
    >
      {/* Chart Header with Filter Tabs & Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
              {language === 'en' ? 'Best-Selling Products Bar Chart' : 'Diagram Batang Produk Terlaris'}
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              {getTimeframeLabel(timeframe)}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {language === 'en'
              ? 'Real-time sales volume and revenue comparison across product catalog'
              : 'Perbandingan volume terjual dan perolehan omzet per produk dalam periode terpilih'}
          </p>
        </div>

        {/* Timeframe Controls & View Mode */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Timeframe Selector Pills */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 text-xs">
            {(['daily', 'weekly', 'monthly', 'all'] as ChartTimeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setTimeframe(tf);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {getTimeframeLabel(tf)}
              </button>
            ))}
          </div>

          {/* Metric Selector: Qty vs Revenue */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 text-xs">
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                setMetric('qty');
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                metric === 'qty'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {language === 'en' ? 'Qty' : 'Jumlah (Qty)'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                setMetric('revenue');
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                metric === 'revenue'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {language === 'en' ? 'Revenue' : 'Omzet (Rp)'}
            </button>
          </div>

          {/* View Toggle: Horizontal Rows vs Vertical Columns */}
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setChartLayout((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
            }}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200/80 dark:border-neutral-700 transition-colors cursor-pointer"
            title={
              chartLayout === 'horizontal'
                ? language === 'en'
                  ? 'Switch to Column Chart'
                  : 'Ganti ke Diagram Kolom Vertikal'
                : language === 'en'
                ? 'Switch to Bar Rows'
                : 'Ganti ke Diagram Batang Horizontal'
            }
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini Ticker Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
            {language === 'en' ? 'Period Transactions' : 'Transaksi Terverifikasi'}
          </span>
          <span className="font-bold text-neutral-900 dark:text-white font-mono-numbers">
            {filteredTx.length} {language === 'en' ? 'sales' : 'nota'}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
            {language === 'en' ? 'Total Volume Sold' : 'Total Fisik Terjual'}
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers">
            {formatNumber(totalQtySold)} unit
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
            {language === 'en' ? 'Period Revenue' : 'Omzet Penjualan'}
          </span>
          <span className="font-bold text-neutral-900 dark:text-white font-mono-numbers">
            {formatRupiah(totalRevenueSold)}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">
            {language === 'en' ? 'Top SKU Leader' : 'Produk Juara #1'}
          </span>
          <span className="font-bold text-amber-600 dark:text-amber-400 truncate block">
            {rankedProducts[0]?.name || '—'}
          </span>
        </div>
      </div>

      {/* Main Chart Body */}
      {rankedProducts.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl bg-neutral-50/70 dark:bg-neutral-800/30 border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
          <Package className="w-9 h-9 mx-auto text-neutral-400 dark:text-neutral-500 opacity-60" />
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {language === 'en'
              ? 'No sales recorded in this timeframe'
              : 'Belum ada transaksi penjualan pada rentang waktu ini'}
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto">
            {language === 'en'
              ? 'Try selecting "Last 7 Days" or "All Time" to view your catalog best-seller performance.'
              : 'Coba pilih rentang "7 Hari" atau "Semua" untuk melihat produk terlaris di tokomu.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Show All-Time Best Sellers' : 'Tampilkan Data Semua Waktu'}
            </button>
          </div>
        </div>
      ) : chartLayout === 'horizontal' ? (
        /* HORIZONTAL BARS VIEW */
        <div className="space-y-3 pt-1">
          {rankedProducts.map((item, idx) => {
            const currentValue = metric === 'qty' ? item.qty : item.revenue;
            const barPct = Math.max(6, Math.round((currentValue / maxMetricValue) * 100));
            const sharePct =
              totalQtySold > 0
                ? Math.round(
                    ((metric === 'qty' ? item.qty : item.revenue) /
                      (metric === 'qty' ? totalQtySold : totalRevenueSold || 1)) *
                      100
                  )
                : 0;

            const isHovered = hoveredProduct === item.id;

            // Palette gradients based on rank
            const rankStyle =
              idx === 0
                ? {
                    badgeBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                    barGrad: 'from-emerald-500 via-emerald-600 to-teal-500',
                    icon: <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
                  }
                : idx === 1
                ? {
                    badgeBg: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700',
                    barGrad: 'from-sky-500 to-indigo-500',
                    icon: <Award className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />,
                  }
                : idx === 2
                ? {
                    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
                    barGrad: 'from-indigo-500 to-purple-500',
                    icon: <Flame className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />,
                  }
                : {
                    badgeBg: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700',
                    barGrad: 'from-neutral-500 to-emerald-600',
                    icon: null,
                  };

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredProduct(item.id)}
                onMouseLeave={() => setHoveredProduct(null)}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all space-y-1.5 cursor-pointer ${
                  isHovered
                    ? 'bg-emerald-50/40 dark:bg-neutral-800/80 border-emerald-300 dark:border-neutral-700 shadow-2xs'
                    : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800/80 hover:border-neutral-200'
                }`}
              >
                {/* Product Info Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg border text-[11px] font-bold font-mono flex items-center justify-center shrink-0 ${rankStyle.badgeBg}`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        {rankStyle.icon}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono-numbers truncate">
                        {item.sku} · {item.category}
                      </div>
                    </div>
                  </div>

                  {/* Quantitative Values */}
                  <div className="text-right font-mono-numbers shrink-0">
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">
                      {metric === 'qty' ? `${formatNumber(item.qty)} ${item.unit}` : formatRupiah(item.revenue)}
                    </div>
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {metric === 'qty' ? formatRupiah(item.revenue) : `${formatNumber(item.qty)} ${item.unit}`}{' '}
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">({sharePct}%)</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${rankStyle.barGrad} transition-all duration-500 ease-out`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VERTICAL SVG COLUMN CHART VIEW */
        <div className="pt-2 pb-1 space-y-2">
          <div className="h-48 w-full flex items-end gap-2 sm:gap-4 px-2 sm:px-4 bg-neutral-50/50 dark:bg-neutral-950/40 rounded-xl border border-neutral-100 dark:border-neutral-800 pt-6">
            {rankedProducts.map((item, idx) => {
              const currentValue = metric === 'qty' ? item.qty : item.revenue;
              const heightPct = Math.max(12, Math.round((currentValue / maxMetricValue) * 100));
              const isHovered = hoveredProduct === item.id;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredProduct(item.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                >
                  {/* Floating Tooltip Bubble */}
                  <div
                    className={`absolute -top-7 z-20 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shadow-sm transition-opacity pointer-events-none ${
                      isHovered
                        ? 'opacity-100 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'opacity-0'
                    }`}
                  >
                    {metric === 'qty' ? `${formatNumber(item.qty)} ${item.unit}` : formatRupiah(item.revenue)}
                  </div>

                  {/* The Vertical Bar */}
                  <div className="w-full max-w-[48px] bg-neutral-200/50 dark:bg-neutral-800 rounded-t-lg flex items-end h-full p-0.5">
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        idx === 0
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
                          : idx === 1
                          ? 'bg-gradient-to-t from-sky-600 to-blue-400'
                          : idx === 2
                          ? 'bg-gradient-to-t from-indigo-600 to-purple-400'
                          : 'bg-emerald-600/80 dark:bg-emerald-500/80'
                      } ${isHovered ? 'ring-2 ring-emerald-400 dark:ring-emerald-300 brightness-110' : ''}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Rank & Short Name Label */}
                  <div className="w-full text-center mt-1.5">
                    <span className="text-[10px] font-mono-numbers font-bold text-neutral-500 dark:text-neutral-400 block truncate">
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-300 font-medium block truncate max-w-[65px] mx-auto">
                      {item.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Navigation Link */}
      {onNavigateToInventory && (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">
            {language === 'en'
              ? `Displaying top ${rankedProducts.length} high-velocity SKUs`
              : `Menampilkan ${rankedProducts.length} produk terlaris dengan perputaran tertinggi`}
          </span>
          <button
            type="button"
            onClick={onNavigateToInventory}
            className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer transition-colors"
          >
            <span>{language === 'en' ? 'View All Catalog' : 'Kelola Stok di Inventaris'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
