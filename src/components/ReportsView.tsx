import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Product, StockAdjustment } from '../types/pos';
import { formatRupiah, formatNumber, formatTanggal, formatTanggalPendek } from '../utils/format';
import { soundFx } from '../utils/audio';
import { useTranslation } from '../context/LanguageContext';
import { StockFinancialChart } from './charts/StockFinancialChart';
import { PaymentRadarChart } from './charts/PaymentRadarChart';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  Download,
  Calendar,
  Layers,
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart2,
} from 'lucide-react';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';

interface ReportsViewProps {
  transactions: Transaction[];
  products: Product[];
  stockAdjustments: StockAdjustment[];
  onViewReceipt?: (transaction: Transaction) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  products,
  stockAdjustments,
  onViewReceipt,
}) => {
  const { t, language } = useTranslation();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');

  // Format today's date YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // Table Pagination State
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Filter completed transactions based on selected period
  const { filteredCompletedTx, periodLabel, dateRangeDescription } = useMemo(() => {
    const completed = transactions.filter((tx) => tx.status === 'completed');
    const now = new Date();

    if (period === 'daily') {
      // Specific day
      const targetDay = selectedDate || todayStr;
      const filtered = completed.filter((tx) => {
        const txDate = tx.timestamp.split('T')[0];
        return txDate === targetDay;
      });

      const isToday = targetDay === todayStr;
      return {
        filteredCompletedTx: filtered,
        periodLabel: language === 'en'
          ? (isToday ? 'Daily Report (Today)' : `Daily Report (${targetDay})`)
          : (isToday ? 'Laporan Harian (Hari Ini)' : `Laporan Harian (${targetDay})`),
        dateRangeDescription: language === 'en'
          ? `Transactions on ${targetDay}`
          : `Transaksi pada tanggal ${targetDay}`,
      };
    }

    if (period === 'weekly') {
      // Last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const filtered = completed.filter((tx) => {
        const txTime = new Date(tx.timestamp).getTime();
        return txTime >= sevenDaysAgo.getTime();
      });

      return {
        filteredCompletedTx: filtered,
        periodLabel: language === 'en'
          ? 'Weekly Report (Last 7 Days)'
          : 'Laporan Mingguan (7 Hari Terakhir)',
        dateRangeDescription: language === 'en'
          ? 'Transactions in the last 7 days'
          : 'Transaksi dalam rentang 7 hari terakhir',
      };
    }

    if (period === 'monthly') {
      // Current calendar month (same year & month)
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const filtered = completed.filter((tx) => {
        const d = new Date(tx.timestamp);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });

      const locale = language === 'en' ? 'en-US' : 'id-ID';
      const monthName = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(now);
      return {
        filteredCompletedTx: filtered,
        periodLabel: language === 'en' ? `Monthly Report (${monthName})` : `Laporan Bulanan (${monthName})`,
        dateRangeDescription: language === 'en' ? `All sales in ${monthName}` : `Seluruh transaksi pada bulan ${monthName}`,
      };
    }

    if (period === 'custom') {
      const start = new Date(customStartDate + 'T00:00:00').getTime();
      const end = new Date(customEndDate + 'T23:59:59').getTime();

      const filtered = completed.filter((tx) => {
        const txTime = new Date(tx.timestamp).getTime();
        return txTime >= start && txTime <= end;
      });

      return {
        filteredCompletedTx: filtered,
        periodLabel: language === 'en'
          ? `Custom Report (${customStartDate} to ${customEndDate})`
          : `Laporan Kustom (${customStartDate} s/d ${customEndDate})`,
        dateRangeDescription: language === 'en'
          ? `Period ${customStartDate} to ${customEndDate}`
          : `Periode ${customStartDate} sampai ${customEndDate}`,
      };
    }

    // Default 'all'
    return {
      filteredCompletedTx: completed,
      periodLabel: language === 'en'
        ? 'All-Time Sales Report'
        : 'Laporan Keseluruhan (Semua Waktu)',
      dateRangeDescription: language === 'en'
        ? 'All recorded transactions from launch'
        : 'Seluruh transaksi dari awal toko beroperasi',
    };
  }, [transactions, period, selectedDate, todayStr, customStartDate, customEndDate]);

  // Compute metrics for the active filtered period
  const analytics = useMemo(() => {
    const totalRevenue = filteredCompletedTx.reduce((sum, tx) => {
      const amt = Number(tx.totalAmount ?? (tx as any).total ?? 0);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);
    const totalProfit = filteredCompletedTx.reduce((sum, tx) => {
      const p = Number(tx.profit ?? 0);
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);
    const totalTxCount = filteredCompletedTx.length;
    const avgBasketSize = totalTxCount > 0 ? Math.round(totalRevenue / totalTxCount) : 0;

    let totalItemsSold = 0;
    const productSalesMap: Record<
      string,
      {
        id: string;
        name: string;
        sku: string;
        unit: string;
        quantity: number;
        revenue: number;
        profit: number;
      }
    > = {};

    const paymentMap: Record<string, number> = {
      cash: 0,
      qris: 0,
      transfer: 0,
      debit: 0,
    };

    // Daily breakdown for visual chart
    const dailyMap: Record<string, { date: string; revenue: number; txCount: number }> = {};

    filteredCompletedTx.forEach((tx) => {
      const txAmt = Number(tx.totalAmount ?? (tx as any).total ?? 0);
      paymentMap[tx.paymentMethod] = (paymentMap[tx.paymentMethod] || 0) + txAmt;

      const dateKey = (tx.timestamp || '').split('T')[0] || todayStr;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, revenue: 0, txCount: 0 };
      }
      dailyMap[dateKey].revenue += txAmt;
      dailyMap[dateKey].txCount += 1;

      (tx.items || []).forEach((item) => {
        if (!item) return;
        const q = Number(item.quantity || 0);
        const sub = Number(item.subtotal ?? (Number(item.price || 0) * q));
        const cost = Number(item.costPrice || 0);
        const itemProfit = sub - (cost * q);

        totalItemsSold += q;
        const pId = item.productId || item.name || 'prod';
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = {
            id: pId,
            name: item.name || 'Produk',
            sku: item.sku || '',
            unit: item.unit || 'pcs',
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productSalesMap[pId].quantity += q;
        productSalesMap[pId].revenue += sub;
        productSalesMap[pId].profit += (Number.isFinite(itemProfit) ? itemProfit : 0);
      });
    });

    const topProducts = Object.values(productSalesMap).sort(
      (a, b) => b.quantity - a.quantity || b.revenue - a.revenue
    );

    const maxSold = topProducts.length > 0 ? topProducts[0].quantity : 1;

    const dailyTrends = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const maxDailyRevenue = dailyTrends.reduce((max, d) => Math.max(max, d.revenue), 0) || 1;

    return {
      totalRevenue,
      totalProfit,
      totalTxCount,
      avgBasketSize,
      totalItemsSold,
      topProducts,
      maxSold,
      paymentMap,
      dailyTrends,
      maxDailyRevenue,
    };
  }, [filteredCompletedTx]);

  // Export Period Report to CSV
  const exportPeriodReportCSV = () => {
    soundFx.playTap();
    const headers = [
      'No Faktur',
      'Waktu Transaksi',
      'Pelanggan',
      'Metode Bayar',
      'Subtotal',
      'Diskon',
      'PPN',
      'Total Belanja',
      'Laba Bersih',
      'Kasir',
    ];

    const rows = filteredCompletedTx.map((t) => [
      t.invoiceNumber,
      `"${formatTanggal(t.timestamp)}"`,
      `"${t.customerName || 'Umum'}"`,
      t.paymentMethod.toUpperCase(),
      t.subtotal,
      t.discountAmount,
      t.taxAmount,
      t.totalAmount,
      t.profit,
      `"${t.cashierName}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"LAPORAN PENJUALAN - ${periodLabel}"`,
        `"Rentang: ${dateRangeDescription}"`,
        `"Total Pendapatan: ${analytics.totalRevenue}"`,
        `"Jumlah Transaksi: ${analytics.totalTxCount}"`,
        `"Total Laba Bersih: ${analytics.totalProfit}"`,
        '',
        headers.join(','),
        ...rows.map((e) => e.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan-penjualan-${period}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset pagination when period or date range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [period, selectedDate, customStartDate, customEndDate]);

  const totalTx = filteredCompletedTx.length;
  const effectiveLimit = rowsPerPage === 'all' ? totalTx : rowsPerPage;
  const totalPages = rowsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(totalTx / effectiveLimit));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = rowsPerPage === 'all' ? 0 : (safeCurrentPage - 1) * effectiveLimit;
  const endIndex = rowsPerPage === 'all' ? totalTx : Math.min(startIndex + effectiveLimit, totalTx);

  const paginatedTx = useMemo(() => {
    if (rowsPerPage === 'all') return filteredCompletedTx;
    return filteredCompletedTx.slice(startIndex, endIndex);
  }, [filteredCompletedTx, startIndex, endIndex, rowsPerPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - 1 && i <= safeCurrentPage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Top Header & Period Selector Bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded">
                {t.reports.title}
              </span>
              <span className="text-xs text-neutral-400 font-mono-numbers">·</span>
              <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                {dateRangeDescription}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white mt-1">
              {periodLabel}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportPeriodReportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Export CSV' : 'Ekspor Laporan (.CSV)'}</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs">
            <button
              onClick={() => {
                soundFx.playTap();
                setPeriod('daily');
              }}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                period === 'daily'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.reports.today}
            </button>
            <button
              onClick={() => {
                soundFx.playTap();
                setPeriod('weekly');
              }}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                period === 'weekly'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.reports.thisWeek}
            </button>
            <button
              onClick={() => {
                soundFx.playTap();
                setPeriod('monthly');
              }}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                period === 'monthly'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.reports.thisMonth}
            </button>
            <button
              onClick={() => {
                soundFx.playTap();
                setPeriod('custom');
              }}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                period === 'custom'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {language === 'en' ? 'Date Range' : 'Rentang Tanggal'}
            </button>
            <button
              onClick={() => {
                soundFx.playTap();
                setPeriod('all');
              }}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                period === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.reports.allTime}
            </button>
          </div>

          {/* Contextual Date Picker Inputs */}
          {period === 'daily' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                {language === 'en' ? 'Select Date:' : 'Pilih Tanggal:'}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg text-xs font-mono-numbers focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded cursor-pointer"
                >
                  {t.reports.today}
                </button>
              )}
            </div>
          )}

          {period === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg text-xs font-mono-numbers focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-neutral-400">{language === 'en' ? 'to' : 's/d'}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg text-xs font-mono-numbers focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Primary KPI Metrics: Total Pendapatan, Jumlah Transaksi, Laba Bersih, Rata-rata */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pendapatan */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">{t.reports.totalRevenue}</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {formatRupiah(analytics.totalRevenue)}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers pt-0.5 truncate">
            {language === 'en' ? `Gross turnover for ${period}` : `Omzet bruto periode ${period === 'daily' ? 'hari ini' : period}`}
          </div>
        </div>

        {/* Jumlah Transaksi */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">
              {language === 'en' ? 'Transaction Count' : 'Jumlah Transaksi'}
            </span>
            <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {formatNumber(analytics.totalTxCount)}{' '}
            <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {language === 'en' ? 'receipts' : 'struk'}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers pt-0.5 truncate">
            {formatNumber(analytics.totalItemsSold)} {language === 'en' ? 'items sold' : 'unit barang'}
          </div>
        </div>

        {/* Total Keuntungan Bersih */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">{t.reports.grossProfit}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-emerald-700 dark:text-emerald-400 truncate">
            {formatRupiah(analytics.totalProfit)}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers pt-0.5 truncate">
            Margin:{' '}
            {analytics.totalRevenue > 0
              ? Math.round((analytics.totalProfit / analytics.totalRevenue) * 100)
              : 0}
            % {language === 'en' ? 'margin' : 'omzet'}
          </div>
        </div>

        {/* Rata-rata Transaksi */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 sm:p-4 md:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold truncate">{t.reports.averageOrder}</span>
            <Percent className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono-numbers text-neutral-900 dark:text-white truncate">
            {formatRupiah(analytics.avgBasketSize)}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers pt-0.5 truncate">
            {language === 'en' ? 'Per transaction' : 'Per transaksi'}
          </div>
        </div>
      </div>

      {/* Grafik Tren Finansial & Omzet */}
      <StockFinancialChart
        transactions={filteredCompletedTx}
        defaultTimeframe={
          period === 'daily'
            ? '1H'
            : period === 'weekly'
            ? '4H'
            : '1D'
        }
        periodLabel={periodLabel}
      />

      {/* Radar Chart: Frekuensi & Pola Metode Pembayaran */}
      <PaymentRadarChart
        transactions={filteredCompletedTx}
        periodLabel={periodLabel}
      />

      {/* Barang Terlaris (Top Selling Items) during this Period */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {language === 'en' ? 'Best Selling Items This Period' : 'Barang Terlaris pada Periode Ini'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {language === 'en'
                  ? 'Products ranked by total volume sold'
                  : 'Peringkat produk berdasarkan jumlah volume penjualan terbanyak'}
              </p>
            </div>
          </div>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono-numbers">
            {analytics.topProducts.length} {language === 'en' ? 'products sold' : 'produk terjual'}
          </span>
        </div>

        {analytics.topProducts.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 dark:text-neutral-500">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {language === 'en' ? 'No sales data for this period' : 'Tidak ada data penjualan pada periode ini'}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              {language === 'en'
                ? 'Select another date range or record sales at checkout.'
                : 'Pilih periode waktu lain atau lakukan transaksi baru di kasir.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
            {analytics.topProducts.map((prod, index) => {
              const percent = Math.round((prod.quantity / analytics.maxSold) * 100);
              const revenueShare =
                analytics.totalRevenue > 0
                  ? Math.round((prod.revenue / analytics.totalRevenue) * 100)
                  : 0;

              return (
                <div key={prod.id} className="space-y-1.5 text-xs group p-2.5 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-800/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] font-mono-numbers ${
                          index === 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                            : index === 1
                            ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                            : index === 2
                            ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-500'
                            : 'text-neutral-400 dark:text-neutral-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-neutral-900 dark:text-white truncate block">
                          {prod.name}
                        </span>
                        <span className="font-mono-numbers text-[10px] text-neutral-400 dark:text-neutral-500">
                          {prod.sku}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono-numbers shrink-0">
                      <div className="font-bold text-neutral-900 dark:text-white">
                        {formatNumber(prod.quantity)} {prod.unit}
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        {formatRupiah(prod.revenue)}{' '}
                        <span className="text-neutral-400 dark:text-neutral-500 font-normal">({revenueShare}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full bg-neutral-200/60 dark:bg-neutral-700/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rincian Transaksi pada Periode Terpilih */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {language === 'en' ? `Transaction Invoices (${totalTx})` : `Daftar Transaksi (${totalTx} transaksi)`}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'en'
                ? `All completed transactions in ${periodLabel.toLowerCase()}`
                : `Semua transaksi sukses dalam periode ${periodLabel.toLowerCase()}`}
            </p>
          </div>

          {/* Rows Per Page Options (25, 50, 100, Semua) */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">
              {language === 'en' ? 'Show:' : 'Tampilkan:'}
            </span>
            <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              {([25, 50, 100, 'all'] as const).map((opt) => {
                const isActive = rowsPerPage === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      soundFx.playTap();
                      setRowsPerPage(opt);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {opt === 'all' ? (language === 'en' ? 'All' : 'Semua') : opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-neutral-50/80 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">{language === 'en' ? 'Invoice No.' : 'No. Faktur'}</th>
                <th className="py-3 px-4">{language === 'en' ? 'Time' : 'Waktu'}</th>
                <th className="py-3 px-4">{language === 'en' ? 'Customer' : 'Pelanggan'}</th>
                <th className="py-3 px-4">{t.transactions.method}</th>
                <th className="py-3 px-4 text-center">{t.common.items}</th>
                <th className="py-3 px-4 text-right">{language === 'en' ? 'Total' : 'Total Belanja'}</th>
                <th className="py-3 px-4 text-right">{t.reports.grossProfit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono-numbers">
              {filteredCompletedTx.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400 dark:text-neutral-500 font-sans">
                    {language === 'en' ? 'No transactions in this period.' : 'Tidak ada transaksi pada periode ini.'}
                  </td>
                </tr>
              ) : (
                paginatedTx.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => onViewReceipt && onViewReceipt(tx)}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-white">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-500 dark:text-neutral-400">
                      {formatTanggalPendek(tx.timestamp)}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-neutral-700 dark:text-neutral-300">
                      {tx.customerName || <span className="text-neutral-400 dark:text-neutral-500">{language === 'en' ? 'Walk-in' : 'Umum'}</span>}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-[11px] font-sans text-neutral-600 dark:text-neutral-400">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-2.5 px-4 text-center text-neutral-600 dark:text-neutral-300">
                      {(tx.items || []).reduce((a, b) => a + (b?.quantity || 0), 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-neutral-900 dark:text-white">
                      {formatRupiah(tx.totalAmount ?? (tx as any).total ?? 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                      +{formatRupiah(tx.profit ?? 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls when totalTx > 50 or totalPages > 1 */}
        {(totalTx > 50 || totalPages > 1) && (
          <div className="p-3.5 sm:p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-neutral-500 dark:text-neutral-400 font-medium text-center sm:text-left">
              {totalTx === 0 ? (
                <span>0 transaksi</span>
              ) : (
                <span>
                  {language === 'en'
                    ? `Showing ${startIndex + 1} - ${endIndex} of ${totalTx} transactions`
                    : `Menampilkan ${startIndex + 1} - ${endIndex} dari ${totalTx} transaksi`}
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => {
                    soundFx.playTap();
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    safeCurrentPage <= 1
                      ? 'opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-800 text-neutral-400'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{language === 'en' ? 'Prev' : 'Sebelumnya'}</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {pageNumbers.map((item, idx) => {
                    if (typeof item === 'string') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1 text-neutral-400">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = item === safeCurrentPage;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          soundFx.playTap();
                          setCurrentPage(item);
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => {
                    soundFx.playTap();
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    safeCurrentPage >= totalPages
                      ? 'opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-800 text-neutral-400'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="hidden sm:inline">{language === 'en' ? 'Next' : 'Berikutnya'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
