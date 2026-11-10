import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Transaction } from '../../types/pos';
import { formatRupiah, formatNumber } from '../../utils/format';
import { soundFx } from '../../utils/audio';
import { useTranslation } from '../../context/LanguageContext';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react';

export type ChartTimeframe = '15m' | '1H' | '4H' | '1D' | '1W';
export type ForexTimeframe = ChartTimeframe; // backward compatibility
export type MetricMode = 'turnover' | 'ticket';

export interface TrendDataPoint {
  id: string;
  timeLabel: string;
  dateLabel: string;
  timestamp: number;
  value: number; // current value (turnover or ticket)
  volume: number; // transaction count
  turnover: number;
  profit: number;
  margin: number;
  change: number;
  changePct: number;
  isUp: boolean;
}

// Keep ForexCandle type alias so existing types don't break if referenced
export type ForexCandle = TrendDataPoint & {
  open: number;
  high: number;
  low: number;
  close: number;
  isBullish: boolean;
};

interface StockFinancialChartProps {
  transactions: Transaction[];
  className?: string;
  periodLabel?: string;
  defaultTimeframe?: ChartTimeframe;
}

export const StockFinancialChart: React.FC<StockFinancialChartProps> = ({
  transactions,
  className = '',
  periodLabel,
  defaultTimeframe,
}) => {
  const { language } = useTranslation();

  // State
  const [timeframe, setTimeframe] = useState<ChartTimeframe>(defaultTimeframe || '1D');
  const [metricMode, setMetricMode] = useState<MetricMode>('turnover');
  const [showMA7, setShowMA7] = useState<boolean>(true);
  const [showAVG, setShowAVG] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  // Sync defaultTimeframe if parent period changes
  useEffect(() => {
    if (defaultTimeframe) {
      setTimeframe(defaultTimeframe);
    }
  }, [defaultTimeframe]);

  // Mouse interaction state
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cursorY, setCursorY] = useState<number | null>(null);
  const [cursorPrice, setCursorPrice] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafId = useRef<number | null>(null);
  const tooltipSideRef = useRef<'left' | 'right'>('right');
  const isFirstMoveRef = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Filter completed transactions & sort chronologically
  const sortedCompletedTx = useMemo(() => {
    return (transactions || [])
      .filter((tx) => tx && tx.status === 'completed')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [transactions]);

  // Determine smart default timeframe based on transaction spread
  const smartTimeframe = useMemo(() => {
    if (sortedCompletedTx.length <= 1) return '1H';
    const firstT = new Date(sortedCompletedTx[0].timestamp).getTime();
    const lastT = new Date(sortedCompletedTx[sortedCompletedTx.length - 1].timestamp).getTime();
    const spanMs = lastT - firstT;
    const spanDays = spanMs / (24 * 3600 * 1000);

    if (spanDays <= 1) return '1H';
    if (spanDays <= 7) return '4H';
    return '1D';
  }, [sortedCompletedTx]);

  const activeTimeframe = timeframe || smartTimeframe;

  // Build Continuous Trend Data Points starting from left to right
  const trendPoints: TrendDataPoint[] = useMemo(() => {
    if (sortedCompletedTx.length === 0) return [];

    let intervalMs = 24 * 60 * 60 * 1000;
    let minPoints = 21;

    if (activeTimeframe === '15m') {
      intervalMs = 15 * 60 * 1000;
      minPoints = 32;
    } else if (activeTimeframe === '1H') {
      intervalMs = 60 * 60 * 1000;
      minPoints = 24;
    } else if (activeTimeframe === '4H') {
      intervalMs = 4 * 60 * 60 * 1000;
      minPoints = 24;
    } else if (activeTimeframe === '1D') {
      intervalMs = 24 * 60 * 60 * 1000;
      minPoints = 21;
    } else if (activeTimeframe === '1W') {
      intervalMs = 7 * 24 * 60 * 60 * 1000;
      minPoints = 16;
    }

    // Group transactions into interval buckets
    const bucketMap: Record<number, Transaction[]> = {};
    sortedCompletedTx.forEach((tx) => {
      const time = new Date(tx.timestamp).getTime();
      const bucketKey = Math.floor(time / intervalMs) * intervalMs;
      if (!bucketMap[bucketKey]) {
        bucketMap[bucketKey] = [];
      }
      bucketMap[bucketKey].push(tx);
    });

    const now = Date.now();
    const sortedTxTimestamps = sortedCompletedTx.map((tx) => new Date(tx.timestamp).getTime());
    const minTxTime = sortedTxTimestamps[0];
    const maxTxTime = sortedTxTimestamps[sortedTxTimestamps.length - 1];

    let endBucket = Math.floor(Math.max(maxTxTime, now) / intervalMs) * intervalMs;
    let startBucket = Math.floor(minTxTime / intervalMs) * intervalMs;

    // Ensure we have at least minPoints continuous periods for a smooth dense curve
    const spanCount = Math.floor((endBucket - startBucket) / intervalMs) + 1;
    if (spanCount < minPoints) {
      startBucket = endBucket - (minPoints - 1) * intervalMs;
    }

    // Cap maximum points to 48 for clean readability
    const maxPoints = 48;
    if (Math.floor((endBucket - startBucket) / intervalMs) + 1 > maxPoints) {
      startBucket = endBucket - (maxPoints - 1) * intervalMs;
    }

    const bucketTimestamps: number[] = [];
    for (let ts = startBucket; ts <= endBucket; ts += intervalMs) {
      bucketTimestamps.push(ts);
    }

    const firstTxAmount = sortedCompletedTx[0]?.totalAmount || 100000;
    let prevVal = firstTxAmount;

    // Pre-calculate baseline from first active bucket
    const firstActiveBucketKey = bucketTimestamps.find((ts) => bucketMap[ts]?.length > 0);
    if (firstActiveBucketKey && bucketMap[firstActiveBucketKey]) {
      const firstActiveTxs = bucketMap[firstActiveBucketKey];
      if (metricMode === 'turnover') {
        prevVal = firstActiveTxs.reduce((s, t) => s + t.totalAmount, 0);
      } else {
        prevVal = firstActiveTxs[0].totalAmount;
      }
    }

    const result: TrendDataPoint[] = [];

    bucketTimestamps.forEach((ts, idx) => {
      const bTxs = bucketMap[ts] || [];
      const hasTrades = bTxs.length > 0;
      const turnover = bTxs.reduce((sum, tx) => sum + tx.totalAmount, 0);
      const profit = bTxs.reduce((sum, tx) => sum + tx.profit, 0);
      const volume = bTxs.length;
      const margin = turnover > 0 ? Math.round((profit / turnover) * 100) : 0;

      // Date & Time labels formatting
      const dateObj = new Date(ts);
      let timeLabel = '';
      let dateLabel = '';

      if (activeTimeframe === '15m' || activeTimeframe === '1H') {
        const timeStr = dateObj.toLocaleTimeString(language === 'en' ? 'en-US' : 'id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        timeLabel = timeStr;
        dateLabel = `${dateObj.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
          day: 'numeric',
          month: 'short',
        })}, ${timeStr}`;
      } else if (activeTimeframe === '4H') {
        const hours = dateObj.getHours().toString().padStart(2, '0');
        timeLabel = `${hours}:00`;
        dateLabel = `${dateObj.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
          day: 'numeric',
          month: 'short',
        })} (${timeLabel})`;
      } else if (activeTimeframe === '1D') {
        timeLabel = dateObj.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
          day: 'numeric',
          month: 'short',
        });
        dateLabel = dateObj.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      } else {
        const weekNum = Math.ceil(dateObj.getDate() / 7);
        timeLabel = `W${weekNum} ${dateObj.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'short' })}`;
        dateLabel = dateObj.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
          month: 'long',
          year: 'numeric',
        });
      }

      let currentVal = prevVal;
      if (hasTrades) {
        if (metricMode === 'turnover') {
          currentVal = turnover;
        } else {
          currentVal = bTxs[bTxs.length - 1].totalAmount;
        }
        prevVal = currentVal;
      }

      const change = currentVal - prevVal;
      const changePct = prevVal > 0 ? (change / prevVal) * 100 : 0;
      const isUp = currentVal >= prevVal;

      result.push({
        id: `point-${ts}-${idx}`,
        timeLabel,
        dateLabel,
        timestamp: ts,
        value: currentVal,
        volume,
        turnover,
        profit,
        margin,
        change,
        changePct,
        isUp,
      });
    });

    return result;
  }, [sortedCompletedTx, activeTimeframe, metricMode, language]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totTurnover = 0;
    let totProfit = 0;
    let totVolume = 0;
    let maxV = 0;
    let minV = Infinity;
    let maxVol = 0;

    trendPoints.forEach((p) => {
      totTurnover += p.turnover;
      totProfit += p.profit;
      totVolume += p.volume;
      if (p.value > maxV) maxV = p.value;
      if (p.value < minV && p.value > 0) minV = p.value;
      if (p.volume > maxVol) maxVol = p.volume;
    });

    if (minV === Infinity) minV = 0;
    const margin = totTurnover > 0 ? Math.round((totProfit / totTurnover) * 100) : 0;

    let overallChangePct = 0;
    let isUp = true;
    if (trendPoints.length >= 2) {
      const firstVal = trendPoints[0].value || 1;
      const lastVal = trendPoints[trendPoints.length - 1].value;
      overallChangePct = Math.round(((lastVal - firstVal) / firstVal) * 100);
      isUp = overallChangePct >= 0;
    }

    return {
      totalTurnover: totTurnover,
      totalProfit: totProfit,
      totalVolume: totVolume,
      overallMargin: margin,
      maxValue: maxV || 1000,
      minValue: minV,
      maxVolume: maxVol || 1,
      overallChangePct: Math.abs(overallChangePct),
      isUp,
    };
  }, [trendPoints]);

  // Highlighted Point (Hovered or Latest active)
  const activePoint = useMemo(() => {
    if (trendPoints.length === 0) return null;
    if (hoveredIndex !== null && trendPoints[hoveredIndex]) {
      return trendPoints[hoveredIndex];
    }
    const lastActive = [...trendPoints].reverse().find((p) => p.volume > 0);
    return lastActive || trendPoints[trendPoints.length - 1];
  }, [trendPoints, hoveredIndex]);

  // SVG Chart Dimensions
  const width = 800;
  const height = 320;
  const padding = { top: 25, right: 80, bottom: 45, left: 15 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Space reserved for volume histogram at bottom: 40px
  const volumeAreaHeight = showVolume ? 40 : 0;
  const trendAreaHeight = graphHeight - volumeAreaHeight;

  // Scaling limits
  const { minPrice, maxPrice } = useMemo(() => {
    if (trendPoints.length === 0) return { minPrice: 0, maxPrice: 1000 };
    const range = stats.maxValue - stats.minValue;
    const buffer = Math.max(range * 0.08, 100);
    return {
      minPrice: Math.max(0, stats.minValue - buffer),
      maxPrice: stats.maxValue + buffer,
    };
  }, [trendPoints, stats]);

  // Y Coordinate scale
  const scaleY = useCallback(
    (val: number) => {
      const range = maxPrice - minPrice || 1;
      const clamped = Math.max(minPrice, Math.min(maxPrice, val));
      const ratio = (clamped - minPrice) / range;
      return padding.top + trendAreaHeight - ratio * trendAreaHeight;
    },
    [minPrice, maxPrice, padding.top, trendAreaHeight]
  );

  // Compute points with SVG Coordinates
  const pointsWithCoords = useMemo(() => {
    if (trendPoints.length === 0) return [];
    const count = trendPoints.length;
    const slotWidth = graphWidth / count;

    return trendPoints.map((p, idx) => {
      const x = padding.left + (idx + 0.5) * slotWidth;
      const y = scaleY(p.value);

      // Volume bar height
      const volHeight =
        p.volume > 0 ? Math.max(3, (p.volume / stats.maxVolume) * (volumeAreaHeight - 6)) : 0;
      const yVol = padding.top + graphHeight - volHeight;
      const barWidth = Math.max(3, slotWidth * 0.7);

      return {
        ...p,
        index: idx,
        x,
        y,
        volHeight,
        yVol,
        barWidth,
      };
    });
  }, [trendPoints, graphWidth, padding.left, padding.top, graphHeight, scaleY, stats.maxVolume, volumeAreaHeight]);

  // Moving Average (MA 7) & Benchmark Average (AVG)
  const { ma7Points, ma7Path } = useMemo(() => {
    if (pointsWithCoords.length === 0) {
      return { ma7Points: [], ma7Path: '' };
    }

    const ma7Pts: { x: number; y: number }[] = [];

    pointsWithCoords.forEach((p, idx) => {
      // MA 7: simple moving average for smoothing local trends
      const windowStart = Math.max(0, idx - 6);
      const slice = pointsWithCoords.slice(windowStart, idx + 1);
      const avg = slice.reduce((s, item) => s + item.value, 0) / slice.length;
      ma7Pts.push({ x: p.x, y: scaleY(avg) });
    });

    const buildPath = (pts: { x: number; y: number }[]) => {
      if (pts.length <= 1) return '';
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const midX = (p1.x + p2.x) / 2;
        d += ` Q ${p1.x} ${p1.y}, ${midX} ${(p1.y + p2.y) / 2} T ${p2.x} ${p2.y}`;
      }
      return d;
    };

    return {
      ma7Points: ma7Pts,
      ma7Path: buildPath(ma7Pts),
    };
  }, [pointsWithCoords, scaleY]);

  // Period Average Benchmark (AVG) - Essential retail KPI line
  const avgValue = useMemo(() => {
    if (pointsWithCoords.length === 0) return 0;
    const sum = pointsWithCoords.reduce((acc, p) => acc + p.value, 0);
    return Math.round(sum / pointsWithCoords.length);
  }, [pointsWithCoords]);

  const avgY = useMemo(() => {
    return scaleY(avgValue);
  }, [avgValue, scaleY]);

  // Clean Area Path (Starts flush on the left border, flows seamlessly to the right border)
  const { areaLinePath, areaFillPath } = useMemo(() => {
    if (pointsWithCoords.length === 0) return { areaLinePath: '', areaFillPath: '' };

    const startX = padding.left;
    const endX = width - padding.right;
    const bottomY = padding.top + trendAreaHeight;

    const firstY = pointsWithCoords[0].y;
    const lastY = pointsWithCoords[pointsWithCoords.length - 1].y;

    let line = `M ${startX} ${firstY}`;
    pointsWithCoords.forEach((p) => {
      line += ` L ${p.x} ${p.y}`;
    });
    line += ` L ${endX} ${lastY}`;

    const fill = `${line} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;

    return { areaLinePath: line, areaFillPath: fill };
  }, [pointsWithCoords, padding.left, padding.right, padding.top, trendAreaHeight, width]);

  // Y-Axis Ticks (5 Price benchmark levels)
  const yAxisTicks = useMemo(() => {
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    const range = maxPrice - minPrice;
    return ticks.map((ratio) => {
      const val = minPrice + ratio * range;
      const y = padding.top + trendAreaHeight - ratio * trendAreaHeight;
      let label = `Rp ${(val / 1_000_000).toFixed(1)}jt`;
      if (val < 1_000_000) {
        label = `Rp ${(val / 1_000).toFixed(0)}rb`;
      }
      return { y, label, val };
    });
  }, [minPrice, maxPrice, padding.top, trendAreaHeight]);

  // Mouse & Touch interaction handler with rAF throttling & smooth positioning
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
      if (!svgRef.current || !chartWrapperRef.current || pointsWithCoords.length === 0) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        if (!svgRef.current || !chartWrapperRef.current) return;
        const svgRect = svgRef.current.getBoundingClientRect();
        const wrapRect = chartWrapperRef.current.getBoundingClientRect();

        const svgX = ((clientX - svgRect.left) / svgRect.width) * width;
        const svgY = ((clientY - svgRect.top) / svgRect.height) * height;

        const clampedY = Math.max(padding.top, Math.min(padding.top + trendAreaHeight, svgY));

        const priceRatio = (padding.top + trendAreaHeight - clampedY) / (trendAreaHeight || 1);
        const calculatedPrice = minPrice + priceRatio * (maxPrice - minPrice);

        setCursorY(clampedY);
        setCursorPrice(Math.round(calculatedPrice));

        // Find nearest point
        let closestIdx = 0;
        let minDist = Infinity;
        pointsWithCoords.forEach((p, idx) => {
          const dist = Math.abs(p.x - svgX);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = idx;
          }
        });

        setHoveredIndex(closestIdx);

        // Exact tooltip position relative to chartWrapperRef
        const relX = clientX - wrapRect.left;
        const relY = clientY - wrapRect.top;

        const cardWidth = 220;
        const cardHeight = 150;

        // Smooth side switching with hysteresis to eliminate border jitter
        if (tooltipSideRef.current === 'right') {
          if (relX > wrapRect.width - cardWidth - 25) {
            tooltipSideRef.current = 'left';
          }
        } else {
          if (relX < wrapRect.width - cardWidth - 75) {
            tooltipSideRef.current = 'right';
          }
        }

        const side = tooltipSideRef.current;
        let posX = side === 'right' ? relX + 16 : relX - cardWidth - 16;
        let posY = relY - 45; // Centered comfortably with cursor

        posX = Math.max(8, Math.min(wrapRect.width - cardWidth - 8, posX));
        posY = Math.max(8, Math.min(wrapRect.height - cardHeight - 8, posY));

        setTooltipPos({ x: Math.round(posX), y: Math.round(posY) });

        if (isFirstMoveRef.current) {
          isFirstMoveRef.current = false;
        }
      });
    },
    [pointsWithCoords, width, height, padding.top, trendAreaHeight, minPrice, maxPrice]
  );

  const handleMouseLeave = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    isFirstMoveRef.current = true;
    setHoveredIndex(null);
    setCursorY(null);
    setCursorPrice(null);
    setTooltipPos(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-4 sm:p-6 shadow-xs space-y-4 transition-colors ${className}`}
    >
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          {/* Ticker Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {language === 'en' ? 'LIVE REVENUE' : 'OMZET REAL-TIME'}
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {language === 'en' ? 'Revenue & Sales Trend' : 'Tren Pendapatan & Omzet Penjualan'}
            </span>
            {periodLabel && (
              <span className="text-[10px] font-medium px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-mono">
                {periodLabel}
              </span>
            )}
          </div>

          {/* Value Display & Growth Pill */}
          <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-mono-numbers text-neutral-900 dark:text-white tracking-tight">
              {formatRupiah(activePoint ? activePoint.value : stats.totalTurnover)}
            </h2>

            {activePoint && (
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono-numbers border shadow-2xs ${
                  activePoint.isUp
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                }`}
              >
                {activePoint.isUp ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>
                  {activePoint.isUp ? '+' : ''}
                  {formatRupiah(activePoint.change)} ({activePoint.changePct.toFixed(1)}%)
                </span>
                <span className="text-[10px] font-normal opacity-80">
                  {activePoint.isUp
                    ? language === 'en' ? 'Up' : 'Naik'
                    : language === 'en' ? 'Down' : 'Turun'}
                </span>
              </div>
            )}

            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono-numbers">
              {activePoint ? activePoint.dateLabel : `${trendPoints.length} titik waktu`}
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 text-xs">
            {(['15m', '1H', '4H', '1D', '1W'] as ChartTimeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setTimeframe(tf);
                }}
                className={`px-2.5 py-1 font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  activeTimeframe === tf
                    ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Metric Mode Switcher */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 text-xs">
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                setMetricMode('turnover');
              }}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                metricMode === 'turnover'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {language === 'en' ? 'Revenue' : 'Omzet'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                setMetricMode('ticket');
              }}
              className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                metricMode === 'ticket'
                  ? 'bg-white dark:bg-neutral-900 text-sky-700 dark:text-sky-400 shadow-2xs font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {language === 'en' ? 'Avg Order' : 'Rata-rata Nota'}
            </button>
          </div>
        </div>
      </div>

      {/* Clean HUD Status Bar */}
      <div className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 text-xs font-mono overflow-x-auto">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-mono-numbers">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 dark:text-neutral-500">
              {language === 'en' ? 'Active Val:' : 'Nilai:'}
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">
              {formatRupiah(activePoint ? activePoint.value : 0)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 dark:text-neutral-500">
              {language === 'en' ? 'Volume:' : 'Transaksi:'}
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {activePoint ? activePoint.volume : 0} {language === 'en' ? 'orders' : 'nota'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-neutral-400 dark:text-neutral-500">
              {language === 'en' ? 'Profit:' : 'Laba Kotor:'}
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              +{formatRupiah(activePoint ? activePoint.profit : 0)}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-neutral-400 dark:text-neutral-500">Margin:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {activePoint ? activePoint.margin : 0}%
            </span>
          </div>
        </div>

        {/* Technical Indicators Toggle */}
        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setShowMA7(!showMA7);
            }}
            className={`px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
              showMA7
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
          >
            MA(7)
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setShowAVG(!showAVG);
            }}
            className={`px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
              showAVG
                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
            title={language === 'en' ? 'Toggle Average Benchmark' : 'Garis Acuan Rata-rata Penjualan'}
          >
            AVG (Rata-rata)
          </button>
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setShowVolume(!showVolume);
            }}
            className={`px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
              showVolume
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
          >
            VOL
          </button>
        </div>
      </div>

      {/* Main SVG Area Chart Canvas */}
      {trendPoints.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 dark:text-neutral-500 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/40 border border-dashed border-neutral-200 dark:border-neutral-800">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {language === 'en'
              ? 'No transaction data available for this period'
              : 'Belum ada data transaksi pada periode ini'}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            {language === 'en'
              ? 'Select another timeframe or record sales at checkout.'
              : 'Pilih rentang tanggal lain atau selesaikan transaksi baru di kasir.'}
          </p>
        </div>
      ) : (
        <div
          ref={chartWrapperRef}
          className="relative w-full overflow-hidden select-none"
        >
          {/* Peak & Average Benchmark Indicators on canvas */}
          <div className="absolute top-2 left-3 z-10 flex items-center gap-2 pointer-events-none text-[10px] font-mono-numbers flex-wrap">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
              ▲ Tertinggi: {formatRupiah(stats.maxValue)}
            </span>
            <span className="px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-700 dark:text-neutral-400 border border-neutral-500/20 font-bold">
              ▼ Terendah: {formatRupiah(stats.minValue)}
            </span>
            {showAVG && avgValue > 0 && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-bold">
                ● Rata-rata: {formatRupiah(avgValue)}
              </span>
            )}
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-64 sm:h-72 lg:h-80 overflow-visible cursor-crosshair"
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Clean Area Gradient */}
              <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="85%" stopColor="#10b981" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>

              {/* Volume Bars Gradient */}
              <linearGradient id="volumeBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels (Right Axis) */}
            {yAxisTicks.map((tick, idx) => (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={width - padding.right}
                  y2={tick.y}
                  stroke="currentColor"
                  strokeDasharray="4,4"
                  className="text-neutral-200 dark:text-neutral-800"
                  strokeWidth="1"
                />
                <text
                  x={width - padding.right + 8}
                  y={tick.y + 3.5}
                  className="fill-neutral-400 dark:fill-neutral-500 font-mono text-[9.5px]"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Volume Histogram Separator Line */}
            {showVolume && (
              <line
                x1={padding.left}
                y1={padding.top + trendAreaHeight}
                x2={width - padding.right}
                y2={padding.top + trendAreaHeight}
                stroke="currentColor"
                strokeDasharray="2,2"
                className="text-neutral-300 dark:text-neutral-700 opacity-60"
                strokeWidth="1"
              />
            )}

            {/* Volume Histogram Bars */}
            {showVolume &&
              pointsWithCoords.map((p) => {
                if (p.volume === 0) return null;
                return (
                  <rect
                    key={`vol-${p.id}`}
                    x={p.x - p.barWidth / 2}
                    y={p.yVol}
                    width={p.barWidth}
                    height={p.volHeight}
                    rx="1.5"
                    fill="url(#volumeBarGrad)"
                    className="opacity-75 transition-opacity hover:opacity-100"
                  />
                );
              })}

            {/* Smooth Area Gradient & Curve Line (Flush from left to right) */}
            <path d={areaFillPath} fill="url(#revenueAreaGrad)" className="pointer-events-none" />
            <path
              d={areaLinePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none filter drop-shadow-xs"
            />

            {/* Moving Average Overlays */}
            {showMA7 && ma7Path && (
              <path
                d={ma7Path}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="pointer-events-none opacity-90"
              />
            )}

            {/* Average Benchmark Reference Line (AVG) */}
            {showAVG && avgValue > 0 && (
              <g className="pointer-events-none">
                <line
                  x1={padding.left}
                  y1={avgY}
                  x2={width - padding.right}
                  y2={avgY}
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  className="opacity-80"
                />
                <rect
                  x={width - padding.right + 2}
                  y={avgY - 9}
                  width={padding.right - 6}
                  height={18}
                  rx="4"
                  className="fill-blue-600 dark:fill-blue-500 filter drop-shadow-sm"
                />
                <text
                  x={width - padding.right + (padding.right - 6) / 2 + 2}
                  y={avgY + 3.5}
                  textAnchor="middle"
                  className="fill-white font-mono text-[8.5px] font-bold"
                >
                  AVG
                </text>
              </g>
            )}

            {/* Data Point Nodes */}
            {pointsWithCoords.map((p) => {
              const isHovered = hoveredIndex === p.index;
              const hasSales = p.volume > 0;

              return (
                <g key={`point-${p.id}`}>
                  {isHovered && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={7}
                      fill="#10b981"
                      fillOpacity="0.25"
                      stroke="#10b981"
                      strokeWidth="1.5"
                    />
                  )}
                  {hasSales && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 4.5 : 2.5}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="transition-all duration-150"
                    />
                  )}
                </g>
              );
            })}

            {/* X-Axis Date/Time Labels */}
            {pointsWithCoords.map((p, idx) => {
              const step = Math.max(1, Math.ceil(pointsWithCoords.length / 8));
              const showLabel = idx % step === 0 || idx === pointsWithCoords.length - 1;
              if (!showLabel) return null;

              const anchor = idx === 0 ? 'start' : idx === pointsWithCoords.length - 1 ? 'end' : 'middle';
              const labelX =
                idx === 0
                  ? Math.max(padding.left, p.x - 10)
                  : idx === pointsWithCoords.length - 1
                  ? Math.min(width - padding.right, p.x + 10)
                  : p.x;

              return (
                <text
                  key={`label-${p.id}`}
                  x={labelX}
                  y={height - 12}
                  textAnchor={anchor}
                  className="fill-neutral-400 dark:fill-neutral-500 font-mono text-[9.5px]"
                >
                  {p.timeLabel}
                </text>
              );
            })}

            {/* Hover Crosshairs & Live Price Badges */}
            {hoveredIndex !== null && pointsWithCoords[hoveredIndex] && (
              <g className="pointer-events-none">
                {/* Vertical Crosshair Line */}
                <line
                  x1={pointsWithCoords[hoveredIndex].x}
                  y1={padding.top}
                  x2={pointsWithCoords[hoveredIndex].x}
                  y2={padding.top + graphHeight}
                  stroke="#71717a"
                  strokeWidth="1.2"
                  strokeDasharray="3,3"
                  className="opacity-75"
                />

                {/* Bottom Time Badge */}
                <rect
                  x={pointsWithCoords[hoveredIndex].x - 32}
                  y={padding.top + graphHeight + 4}
                  width={64}
                  height={18}
                  rx="4"
                  className="fill-neutral-900 dark:fill-neutral-100"
                />
                <text
                  x={pointsWithCoords[hoveredIndex].x}
                  y={padding.top + graphHeight + 16.5}
                  textAnchor="middle"
                  className="fill-white dark:fill-neutral-900 font-mono text-[9px] font-bold"
                >
                  {pointsWithCoords[hoveredIndex].timeLabel}
                </text>
              </g>
            )}

            {/* Horizontal Crosshair & Price Tag on Right Axis */}
            {cursorY !== null && cursorPrice !== null && (
              <g className="pointer-events-none">
                <line
                  x1={padding.left}
                  y1={cursorY}
                  x2={width - padding.right}
                  y2={cursorY}
                  stroke="#71717a"
                  strokeWidth="1.2"
                  strokeDasharray="3,3"
                  className="opacity-75"
                />

                <rect
                  x={width - padding.right + 2}
                  y={cursorY - 9}
                  width={padding.right - 6}
                  height={18}
                  rx="4"
                  className="fill-neutral-900 dark:fill-neutral-100 filter drop-shadow-sm"
                />
                <text
                  x={width - padding.right + (padding.right - 6) / 2 + 2}
                  y={cursorY + 3.5}
                  textAnchor="middle"
                  className="fill-white dark:fill-neutral-900 font-mono text-[9px] font-bold"
                >
                  {formatRupiah(Math.max(0, cursorPrice))}
                </text>
              </g>
            )}
          </svg>

          {/* Floating Tooltip Card smoothly following cursor */}
          {activePoint && hoveredIndex !== null && tooltipPos && (
            <div
              className={`absolute top-0 left-0 z-30 pointer-events-none p-3 rounded-xl bg-neutral-950/95 dark:bg-black/95 backdrop-blur-md border border-neutral-700/80 shadow-2xl text-white text-xs space-y-2 w-[220px] will-change-transform ${
                isFirstMoveRef.current
                  ? 'transition-none'
                  : 'transition-transform duration-100 ease-out'
              }`}
              style={{
                transform: `translate3d(${tooltipPos.x}px, ${tooltipPos.y}px, 0)`,
              }}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                <span className="font-semibold text-[11px] text-neutral-300">
                  {activePoint.dateLabel}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    activePoint.volume === 0
                      ? 'bg-neutral-800 text-neutral-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {activePoint.volume === 0
                    ? 'STABIL'
                    : language === 'en' ? 'ACTIVE SALES' : 'PENJUALAN AKTIF'}
                </span>
              </div>

              {/* Metrics Detail */}
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-sans">
                    {language === 'en' ? 'Revenue:' : 'Total Omzet:'}
                  </span>
                  <span className="font-bold text-white">
                    {formatRupiah(activePoint.turnover)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-sans">
                    {language === 'en' ? 'Orders:' : 'Jumlah Nota:'}
                  </span>
                  <span className="font-bold text-amber-400">
                    {activePoint.volume} {language === 'en' ? 'tx' : 'nota'}
                  </span>
                </div>
                {activePoint.volume > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-sans">
                      {language === 'en' ? 'Gross Profit:' : 'Laba Kotor:'}
                    </span>
                    <span className="font-bold text-emerald-400">
                      +{formatRupiah(activePoint.profit)}{' '}
                      <span className="text-neutral-400 font-normal">({activePoint.margin}%)</span>
                    </span>
                  </div>
                )}
                {showAVG && avgValue > 0 && activePoint.turnover > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-sans">
                      {language === 'en' ? 'vs Average:' : 'vs Rata-rata:'}
                    </span>
                    <span
                      className={`font-bold ${
                        activePoint.turnover >= avgValue
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {activePoint.turnover >= avgValue ? '+' : ''}
                      {(
                        ((activePoint.turnover - avgValue) / (avgValue || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
                {cursorPrice !== null && (
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] text-cyan-400">
                    <span className="font-sans">{language === 'en' ? 'Cursor Value:' : 'Nilai Kursor:'}</span>
                    <span className="font-bold">{formatRupiah(cursorPrice)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend & Indicators Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-emerald-500 inline-block" />
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {language === 'en' ? 'Revenue Trend (Area)' : 'Tren Omzet Penjualan'}
            </span>
          </div>
          {showMA7 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-amber-500 inline-block" />
              <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold">
                MA(7)
              </span>
            </div>
          )}
          {showAVG && avgValue > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-blue-500 inline-block" />
              <span className="font-mono text-blue-700 dark:text-blue-400 font-semibold">
                AVG ({formatRupiah(avgValue)})
              </span>
            </div>
          )}
          {showVolume && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded-xs bg-emerald-600/70 inline-block" />
              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                {language === 'en' ? 'Sales Volume' : 'Volume Nota Penjualan'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-neutral-400">
          <Zap className="w-3 h-3 text-emerald-500" />
          <span>
            {language === 'en'
              ? 'Hover across the chart to inspect live sales data'
              : 'Arahkan kursor pada grafik untuk memeriksa omzet per periode'}
          </span>
        </div>
      </div>
    </div>
  );
};
