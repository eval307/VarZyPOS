import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calculator,
  X,
  Copy,
  Check,
  Delete,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { formatNumber, formatRupiah } from '../utils/format';

export const CalculatorPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [expression, setExpression] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [copied, setCopied] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Play tap sound on button interactions
  const tap = () => {
    soundFx.playTap();
  };

  // Safe number parsing
  const getDisplayNumber = (): number => {
    const clean = display.replace(/,/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Input single digit
  const handleDigit = (digit: string) => {
    tap();
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      if (display === '0' && digit !== '.') {
        setDisplay(digit);
      } else {
        if (display.length < 14) {
          setDisplay(display + digit);
        }
      }
    }
  };

  // Input triple zero (000) - highly useful for Indonesian Rupiah
  const handleTripleZero = () => {
    tap();
    if (waitingForOperand || display === '0') {
      setDisplay('0');
      setWaitingForOperand(false);
      return;
    }
    if (display.length <= 11) {
      setDisplay(display + '000');
    }
  };

  // Decimal dot
  const handleDecimal = () => {
    tap();
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  // Operators: +, -, ×, ÷
  const handleOperator = (nextOperator: string) => {
    tap();
    const inputValue = getDisplayNumber();

    if (prevValue === null) {
      setPrevValue(inputValue);
      setExpression(`${formatNumber(inputValue)} ${nextOperator}`);
    } else if (operator && !waitingForOperand) {
      const result = calculate(prevValue, inputValue, operator);
      setPrevValue(result);
      setDisplay(String(result));
      setExpression(`${formatNumber(result)} ${nextOperator}`);
    } else {
      setExpression(`${formatNumber(prevValue)} ${nextOperator}`);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  // Perform calculation
  const calculate = (first: number, second: number, op: string): number => {
    let res = 0;
    switch (op) {
      case '+':
        res = first + second;
        break;
      case '-':
        res = first - second;
        break;
      case '×':
      case '*':
        res = first * second;
        break;
      case '÷':
      case '/':
        res = second !== 0 ? first / second : 0;
        break;
      default:
        res = second;
    }
    // Round to avoid IEEE 754 precision issues (e.g. 0.1 + 0.2)
    return Math.round(res * 1000000) / 1000000;
  };

  // Equal (=)
  const handleEquals = () => {
    const inputValue = getDisplayNumber();

    if (prevValue !== null && operator) {
      soundFx.playSuccessChime();
      const result = calculate(prevValue, inputValue, operator);
      setExpression(`${formatNumber(prevValue)} ${operator} ${formatNumber(inputValue)} =`);
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    } else {
      tap();
    }
  };

  // Percentage (%)
  const handlePercentage = () => {
    tap();
    const current = getDisplayNumber();
    if (prevValue !== null && (operator === '+' || operator === '-')) {
      // e.g. 100,000 - 10% => 10,000
      const percentVal = (prevValue * current) / 100;
      setDisplay(String(percentVal));
    } else {
      const percentVal = current / 100;
      setDisplay(String(percentVal));
    }
    setWaitingForOperand(true);
  };

  // Toggle plus/minus (±)
  const handleToggleSign = () => {
    tap();
    const current = getDisplayNumber();
    setDisplay(String(-current));
  };

  // Clear All (AC)
  const handleClearAll = () => {
    tap();
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setExpression('');
    setWaitingForOperand(false);
  };

  // Backspace (⌫)
  const handleBackspace = () => {
    tap();
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  // Quick cash additions (convenient for cashiers)
  const handleQuickAdd = (amount: number) => {
    tap();
    const current = getDisplayNumber();
    const updated = current + amount;
    setDisplay(String(updated));
    setWaitingForOperand(false);
  };

  // Copy result to clipboard
  const handleCopyResult = async () => {
    tap();
    try {
      await navigator.clipboard.writeText(display);
      soundFx.playSuccessChime();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing in an input or textarea, don't hijack keyboard
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        handleOperator(e.key);
      } else if (e.key === '*') {
        e.preventDefault();
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, prevValue, operator, waitingForOperand]);

  const currentNum = getDisplayNumber();

  return (
    <>
      {/* Floating Toggle Button in Bottom Right Corner */}
      <div className="fixed bottom-5 right-5 z-40 select-none">
        <button
          type="button"
          onClick={() => {
            soundFx.playTap();
            setIsOpen((prev) => !prev);
          }}
          className={`flex items-center gap-2 p-3.5 sm:px-4 sm:py-3 rounded-2xl shadow-xl transition-all duration-300 cursor-pointer ${
            isOpen
              ? 'bg-neutral-900 dark:bg-neutral-800 text-white ring-2 ring-emerald-500/50 shadow-emerald-500/20'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95 shadow-emerald-600/30'
          }`}
          title={isOpen ? 'Tutup Kalkulator' : 'Buka Kalkulator Kasir'}
          aria-label="Kalkulator Kasir"
        >
          <Calculator className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-12' : ''}`} />
          <span className="hidden sm:inline text-xs font-bold tracking-wide">
            {isOpen ? 'Tutup' : 'Kalkulator'}
          </span>
          {isOpen && <X className="w-3.5 h-3.5 text-neutral-400 -ml-0.5" />}
        </button>
      </div>

      {/* Calculator Popup Panel */}
      {isOpen && (
        <div
          ref={calculatorRef}
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-80 sm:w-88 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50/90 dark:bg-neutral-850/80 border-b border-neutral-200/80 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                  Kalkulator Kasir
                </h3>
                <span className="text-[10px] text-neutral-400">KasirKu POS</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyResult}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Salin Angka ke Clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setIsOpen(false);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calculator Digital Screen Display */}
          <div className="p-4 bg-neutral-900 text-white flex flex-col justify-end min-h-24 border-b border-neutral-800">
            {/* Expression History */}
            <div className="text-[11px] font-mono text-neutral-400 text-right truncate min-h-4">
              {expression || '\u00A0'}
            </div>

            {/* Main Number Display */}
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-right text-white truncate my-1">
              {display}
            </div>

            {/* Live Rupiah Equivalent Preview */}
            <div className="text-[11px] text-emerald-400 font-mono text-right flex items-center justify-end gap-1">
              <Sparkles className="w-2.5 h-2.5 opacity-80" />
              <span>≈ {formatRupiah(currentNum)}</span>
            </div>
          </div>

          {/* Quick Cash Presets (Indonesian Rupiah Denominations) */}
          <div className="px-3 pt-2.5 pb-1 grid grid-cols-4 gap-1.5 bg-neutral-50/60 dark:bg-neutral-850/40 border-b border-neutral-100 dark:border-neutral-800">
            {[
              { label: '+10rb', val: 10000 },
              { label: '+20rb', val: 20000 },
              { label: '+50rb', val: 50000 },
              { label: '+100rb', val: 100000 },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => handleQuickAdd(q.val)}
                className="py-1 text-[10px] font-bold text-neutral-600 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-300 bg-white dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-neutral-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-800 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Keypad Grid */}
          <div className="p-3 grid grid-cols-4 gap-1.5 bg-white dark:bg-neutral-900">
            {/* Row 1: AC, ⌫, %, ÷ */}
            <button
              type="button"
              onClick={handleClearAll}
              className="py-2.5 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900 transition-colors active:scale-95 cursor-pointer"
            >
              AC
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2.5 rounded-xl font-bold text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Hapus Satu Karakter"
            >
              <Delete className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handlePercentage}
              className="py-2.5 rounded-xl font-bold text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700 transition-colors active:scale-95 cursor-pointer"
            >
              %
            </button>
            <button
              type="button"
              onClick={() => handleOperator('÷')}
              className={`py-2.5 rounded-xl font-bold text-sm transition-colors active:scale-95 cursor-pointer border ${
                operator === '÷' && waitingForOperand
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              ÷
            </button>

            {/* Row 2: 7, 8, 9, × */}
            <button
              type="button"
              onClick={() => handleDigit('7')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleDigit('8')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleDigit('9')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handleOperator('×')}
              className={`py-2.5 rounded-xl font-bold text-sm transition-colors active:scale-95 cursor-pointer border ${
                operator === '×' && waitingForOperand
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              ×
            </button>

            {/* Row 3: 4, 5, 6, - */}
            <button
              type="button"
              onClick={() => handleDigit('4')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleDigit('5')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleDigit('6')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handleOperator('-')}
              className={`py-2.5 rounded-xl font-bold text-sm transition-colors active:scale-95 cursor-pointer border ${
                operator === '-' && waitingForOperand
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              -
            </button>

            {/* Row 4: 1, 2, 3, + */}
            <button
              type="button"
              onClick={() => handleDigit('1')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleDigit('2')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleDigit('3')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              3
            </button>
            <button
              type="button"
              onClick={() => handleOperator('+')}
              className={`py-2.5 rounded-xl font-bold text-sm transition-colors active:scale-95 cursor-pointer border ${
                operator === '+' && waitingForOperand
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              +
            </button>

            {/* Row 5: ±, 0, 000, = */}
            <button
              type="button"
              onClick={handleToggleSign}
              className="py-2.5 rounded-xl font-semibold text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700 transition-colors active:scale-95 cursor-pointer"
              title="Plus / Minus"
            >
              ±
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="py-2.5 rounded-xl font-semibold text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200/70 dark:border-neutral-750 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleTripleZero}
              className="py-2.5 rounded-xl font-bold text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700 transition-colors active:scale-95 cursor-pointer"
              title="Tambah Tiga Nol (000)"
            >
              000
            </button>
            <button
              type="button"
              onClick={handleEquals}
              className="py-2.5 rounded-xl font-bold text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              =
            </button>
          </div>
        </div>
      )}
    </>
  );
};
