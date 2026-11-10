import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMethod } from '../../types/pos';
import { formatRupiah, formatNumber } from '../../utils/format';
import { soundFx } from '../../utils/audio';
import { useTranslation } from '../../context/LanguageContext';
import {
  PieChart,
  Wallet,
  QrCode,
  Building2,
  CreditCard,
  Award,
  TrendingUp,
  Hash,
  DollarSign,
  Layers,
} from 'lucide-react';

interface PaymentRadarChartProps {
  transactions: Transaction[];
  className?: string;
  periodLabel?: string;
}

export type RadarMetricMode = 'frequency' | 'revenue' | 'both';

interface MethodStat {
  key: PaymentMethod;
  label: string;
  icon: React.ElementType;
  color: string;
  strokeColor: string;
  fillColor: string;
  count: number;
  revenue: number;
  avgBasket: number;
  freqPct: number; // 0 - 100
  revPct: number; // 0 - 100
  score: number; // normalized 0 - 100 for current metric
}

export const PaymentRadarChart: React.FC<PaymentRadarChartProps> = ({
  transactions,
  className = '',
  periodLabel,
}) => {
  const { language } = useTranslation();
  const [metricMode, setMetricMode] = useState<RadarMetricMode>('both');
  const [hoveredKey, setHoveredKey] = useState<PaymentMethod | null>(null);

  // Compute stats per payment method
  const {
    methodStats,
    totalTxCount,
    totalRevenue,
    mostFrequentMethod,
    highestRevenueMethod,
  } = useMemo(() => {
    const completed = (transactions || []).filter((tx) => tx && tx.status === 'completed');
    const totCount = completed.length;
    const totRev = completed.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);

    const counts: Record<PaymentMethod, number> = { cash: 0, qris: 0, transfer: 0, debit: 0 };
    const revenues: Record<PaymentMethod, number> = { cash: 0, qris: 0, transfer: 0, debit: 0 };

    completed.forEach((tx) => {
      const method = (tx.paymentMethod || 'cash') as PaymentMethod;
      if (counts[method] !== undefined) {
        counts[method] += 1;
        revenues[method] += tx.totalAmount || 0;
      }
    });

    const definitions: {
      key: PaymentMethod;
      label: string;
      icon: React.ElementType;
      color: string;
      strokeColor: string;
      fillColor: string;
    }[] = [
      {
        key: 'cash',
        label: language === 'en' ? 'Cash' : 'Tunai',
        icon: Wallet,
        color: '#10b981',
        strokeColor: '#059669',
        fillColor: 'rgba(16, 185, 129, 0.25)',
      },
      {
        key: 'qris',
        label: 'QRIS / E-Wallet',
        icon: QrCode,
        color: '#6366f1',
        strokeColor: '#4f46e5',
        fillColor: 'rgba(99, 102, 241, 0.25)',
      },
      {
        key: 'transfer',
        label: language === 'en' ? 'Bank Transfer' : 'Transfer Bank',
        icon: Building2,
        color: '#06b6d4',
        strokeColor: '#0891b2',
        fillColor: 'rgba(6, 182, 212, 0.25)',
      },
      {
        key: 'debit',
        label: language === 'en' ? 'Debit Card' : 'Kartu Debit',
        icon: CreditCard,
        color: '#8b5cf6',
        strokeColor: '#7c3aed',
        fillColor: 'rgba(139, 92, 246, 0.25)',
      },
    ];

    const stats: MethodStat[] = definitions.map((def) => {
      const count = counts[def.key];
      const revenue = revenues[def.key];
      const avgBasket = count > 0 ? Math.round(revenue / count) : 0;
      const freqPct = totCount > 0 ? Math.round((count / totCount) * 100) : 0;
      const revPct = totRev > 0 ? Math.round((revenue / totRev) * 100) : 0;

      return {
        ...def,
        count,
        revenue,
        avgBasket,
        freqPct,
        revPct,
        score: freqPct,
      };
    });

    // Find most frequent and highest revenue methods
    const sortedByCount = [...stats].sort((a, b) => b.count - a.count || b.revenue - a.revenue);
    const sortedByRev = [...stats].sort((a, b) => b.revenue - a.revenue || b.count - a.count);

    const mostFreq = totCount > 0 ? sortedByCount[0] : null;
    const highestRev = totRev > 0 ? sortedByRev[0] : null;

    return {
      methodStats: stats,
      totalTxCount: totCount,
      totalRevenue: totRev,
      mostFrequentMethod: mostFreq,
      highestRevenueMethod: highestRev,
    };
  }, [transactions, language]);

  // Radar Geometry
  const size = 300;
  const center = size / 2;
  const radius = 95;
  const levels = [0.25, 0.5, 0.75, 1];

  // 4 spokes (North, East, South, West)
  const angleSlice = (Math.PI * 2) / 4;
  const startAngle = -Math.PI / 2; // North (Tunai at 12 o'clock)

  // Compute coordinates on the radar
  const getCoordinates = (index: number, valueRatio: number) => {
    const angle = startAngle + index * angleSlice;
    const r = Math.max(8, radius * Math.min(1, Math.max(0, valueRatio)));
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Build polygon path string
  const buildPolygonPath = (values: number[]) => {
    return values
      .map((val, idx) => {
        const { x, y } = getCoordinates(idx, val);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .concat('Z')
      .join(' ');
  };

  // Scaled values (relative to highest so polygon uses full dynamic range)
  const maxFreq = Math.max(...methodStats.map((m) => m.count), 1);
  const maxRev = Math.max(...methodStats.map((m) => m.revenue), 1);

  const freqValues = methodStats.map((m) =>
    totalTxCount > 0 ? Math.max(0.12, m.count / maxFreq) : 0.12
  );
  const revValues = methodStats.map((m) =>
    totalRevenue > 0 ? Math.max(0.12, m.revenue / maxRev) : 0.12
  );

  const freqPath = buildPolygonPath(freqValues);
  const revPath = buildPolygonPath(revValues);

  // Active hovered stat detail
  const activeStat = useMemo(() => {
    if (!hoveredKey) return mostFrequentMethod;
    return methodStats.find((m) => m.key === hoveredKey) || mostFrequentMethod;
  }, [hoveredKey, methodStats, mostFrequentMethod]);

  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-5 shadow-xs space-y-4 transition-colors ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {language === 'en' ? 'PAYMENT RADAR' : 'RADAR PEMBAYARAN'}
            </span>
            {periodLabel && (
              <span className="text-[10px] font-medium px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-mono">
                {periodLabel}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight mt-1">
            {language === 'en' ? 'Payment Method Popularity' : 'Analisis Frekuensi Metode Pembayaran'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {language === 'en'
              ? 'Identify which payment channels customers choose most frequently'
              : 'Ketahui kanal pembayaran yang paling sering digunakan pelanggan'}
          </p>
        </div>

        {/* Metric Mode Switcher */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setMetricMode('frequency');
            }}
            className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
              metricMode === 'frequency'
                ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {language === 'en' ? 'Frequency' : 'Frekuensi'}
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setMetricMode('revenue');
            }}
            className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
              metricMode === 'revenue'
                ? 'bg-white dark:bg-neutral-900 text-indigo-700 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {language === 'en' ? 'Revenue' : 'Nominal'}
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setMetricMode('both');
            }}
            className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
              metricMode === 'both'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-bold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {language === 'en' ? 'Both' : 'Semua'}
          </button>
        </div>
      </div>

      {/* Highlight Pill: Most Frequent Channel */}
      {mostFrequentMethod && totalTxCount > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 border border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10.5px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-400 block font-mono">
                {language === 'en' ? 'MOST FREQUENT PAYMENT METHOD' : 'METODE PALING SERING DIGUNAKAN'}
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                  {mostFrequentMethod.label}
                </span>
                <span className="font-mono-numbers font-semibold text-emerald-700 dark:text-emerald-400">
                  {mostFrequentMethod.count} {language === 'en' ? 'tx' : 'transaksi'} ({mostFrequentMethod.freqPct}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono-numbers text-xs text-neutral-600 dark:text-neutral-300">
            <span>Omzet:</span>
            <strong className="text-neutral-900 dark:text-white">
              {formatRupiah(mostFrequentMethod.revenue)}
            </strong>
          </div>
        </div>
      ) : null}

      {/* Radar SVG Visual Area */}
      {totalTxCount === 0 ? (
        <div className="py-16 text-center text-neutral-400 dark:text-neutral-500 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/40 border border-dashed border-neutral-200 dark:border-neutral-800">
          <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {language === 'en' ? 'No transactions recorded' : 'Belum ada data transaksi yang tercatat'}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {language === 'en'
              ? 'Complete checkout sales to see payment method radar distribution'
              : 'Lakukan transaksi kasir untuk melihat sebaran radar metode pembayaran'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Radar Polygon Canvas */}
          <div className="md:col-span-7 flex flex-col items-center justify-center relative select-none">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full max-w-[280px] h-auto overflow-visible"
            >
              <defs>
                {/* Frequency Polygon Gradient */}
                <linearGradient id="radarFreqGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
                </linearGradient>

                {/* Revenue Polygon Gradient */}
                <linearGradient id="radarRevGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {/* Concentric Grid Circles & Labels */}
              {levels.map((level, idx) => (
                <g key={idx}>
                  <circle
                    cx={center}
                    cy={center}
                    r={radius * level}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray={idx === levels.length - 1 ? 'none' : '3,3'}
                    className="text-neutral-200 dark:text-neutral-800"
                  />
                  <text
                    x={center + 3}
                    y={center - radius * level - 2}
                    className="fill-neutral-400 dark:fill-neutral-600 font-mono text-[8px]"
                  >
                    {Math.round(level * 100)}%
                  </text>
                </g>
              ))}

              {/* Radial Axis Spokes */}
              {methodStats.map((_, idx) => {
                const { x, y } = getCoordinates(idx, 1);
                return (
                  <line
                    key={`spoke-${idx}`}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-neutral-200 dark:text-neutral-800"
                  />
                );
              })}

              {/* Revenue Layer Polygon */}
              {(metricMode === 'revenue' || metricMode === 'both') && (
                <path
                  d={revPath}
                  fill="url(#radarRevGrad)"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* Frequency Layer Polygon */}
              {(metricMode === 'frequency' || metricMode === 'both') && (
                <path
                  d={freqPath}
                  fill="url(#radarFreqGrad)"
                  stroke="#10b981"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* Data Nodes on Vertices */}
              {methodStats.map((stat, idx) => {
                const fCoord = getCoordinates(idx, freqValues[idx]);
                const rCoord = getCoordinates(idx, revValues[idx]);
                const isHovered = hoveredKey === stat.key;
                const isMostFrequent = mostFrequentMethod?.key === stat.key;

                return (
                  <g
                    key={`node-${stat.key}`}
                    onMouseEnter={() => setHoveredKey(stat.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className="cursor-pointer transition-transform duration-150"
                  >
                    {/* Revenue Node dot */}
                    {(metricMode === 'revenue' || metricMode === 'both') && (
                      <circle
                        cx={rCoord.x}
                        cy={rCoord.y}
                        r={isHovered ? 5.5 : 4}
                        fill="#6366f1"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-all"
                      />
                    )}

                    {/* Frequency Node dot */}
                    {(metricMode === 'frequency' || metricMode === 'both') && (
                      <circle
                        cx={fCoord.x}
                        cy={fCoord.y}
                        r={isHovered ? 6 : isMostFrequent ? 5 : 4}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="transition-all"
                      />
                    )}
                  </g>
                );
              })}

              {/* Axis Labels (Tunai, QRIS, Transfer, Debit) */}
              {methodStats.map((stat, idx) => {
                const labelCoord = getCoordinates(idx, 1.25);
                const isHovered = hoveredKey === stat.key;
                const isMostFrequent = mostFrequentMethod?.key === stat.key;

                let anchor: 'middle' | 'start' | 'end' = 'middle';
                if (idx === 1) anchor = 'start'; // QRIS right
                if (idx === 3) anchor = 'end'; // Debit left

                return (
                  <g
                    key={`axis-label-${stat.key}`}
                    onClick={() => {
                      soundFx.playTap();
                      setHoveredKey(isHovered ? null : stat.key);
                    }}
                    className="cursor-pointer"
                  >
                    <text
                      x={labelCoord.x}
                      y={idx === 0 ? labelCoord.y - 4 : idx === 2 ? labelCoord.y + 12 : labelCoord.y + 3}
                      textAnchor={anchor}
                      className={`font-semibold text-[10.5px] transition-colors ${
                        isHovered || isMostFrequent
                          ? 'fill-emerald-600 dark:fill-emerald-400 font-bold'
                          : 'fill-neutral-700 dark:fill-neutral-300'
                      }`}
                    >
                      {stat.label}
                    </text>
                    <text
                      x={labelCoord.x}
                      y={idx === 0 ? labelCoord.y + 8 : idx === 2 ? labelCoord.y + 24 : labelCoord.y + 15}
                      textAnchor={anchor}
                      className="fill-neutral-400 dark:fill-neutral-500 font-mono text-[9px]"
                    >
                      {stat.count} tx ({stat.freqPct}%)
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Radar Legend */}
            <div className="flex items-center justify-center gap-4 pt-2 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
              {(metricMode === 'frequency' || metricMode === 'both') && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>{language === 'en' ? 'Frequency (Transaction Count)' : 'Frekuensi (Jumlah Nota)'}</span>
                </div>
              )}
              {(metricMode === 'revenue' || metricMode === 'both') && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  <span>{language === 'en' ? 'Revenue Share' : 'Porsi Omzet'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ranking & Frequency Breakdown Cards */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'en' ? 'Channel Ranking by Frequency' : 'Peringkat Frekuensi Penggunaan'}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {totalTxCount} {language === 'en' ? 'total orders' : 'total nota'}
              </span>
            </div>

            <div className="space-y-2">
              {[...methodStats]
                .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
                .map((stat, rank) => {
                  const Icon = stat.icon;
                  const isHovered = hoveredKey === stat.key;
                  const isTop1 = rank === 0 && stat.count > 0;

                  return (
                    <div
                      key={stat.key}
                      onMouseEnter={() => setHoveredKey(stat.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                        isHovered
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                          : isTop1
                          ? 'bg-neutral-50/80 dark:bg-neutral-800/60 border-emerald-500/30 dark:border-emerald-500/20'
                          : 'bg-neutral-50/50 dark:bg-neutral-800/30 border-neutral-200/70 dark:border-neutral-700/60 hover:bg-neutral-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] font-mono shrink-0 ${
                              isTop1
                                ? 'bg-emerald-600 text-white'
                                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            #{rank + 1}
                          </span>
                          <Icon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
                          <span className="font-semibold text-neutral-900 dark:text-white truncate">
                            {stat.label}
                          </span>
                        </div>

                        <div className="text-right shrink-0 font-mono-numbers">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {stat.count} {language === 'en' ? 'tx' : 'nota'}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1.5">
                            ({stat.freqPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Frequency Progress Bar */}
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-emerald-600 dark:bg-emerald-500"
                          style={{ width: `${stat.freqPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-neutral-500 dark:text-neutral-400 pt-1 font-mono-numbers">
                        <span>Omzet: {formatRupiah(stat.revenue)}</span>
                        <span>Avg: {formatRupiah(stat.avgBasket)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
