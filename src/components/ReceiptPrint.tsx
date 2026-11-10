import React, { useState, useEffect } from 'react';
import {
  Transaction,
  StoreSettings,
  ReceiptLayoutConfig,
  PaperWidth,
  ReceiptSectionKey,
} from '../types/pos';
import { formatRupiah, formatTanggal } from '../utils/format';
import { Printer, X, Check, Utensils } from 'lucide-react';
import { sanitizeReceiptLayout, DEFAULT_SECTIONS_ORDER } from '../utils/receiptTemplates';
import { useTranslation } from '../context/LanguageContext';

interface ReceiptPrintProps {
  transaction: Transaction;
  storeSettings: StoreSettings;
  customLayout?: ReceiptLayoutConfig;
  onClose?: () => void;
  showModalControls?: boolean;
}

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({
  transaction,
  storeSettings,
  customLayout,
  onClose,
  showModalControls = false,
}) => {
  const { language } = useTranslation();
  const activeLayout = sanitizeReceiptLayout(customLayout || storeSettings.receiptLayout);

  // Local state for modal preview so modal can test different sizes independently
  const [modalPaperWidth, setModalPaperWidth] = useState<PaperWidth>(activeLayout.paperWidth || '80mm');

  // Sync if customLayout or storeSettings change
  useEffect(() => {
    if (customLayout?.paperWidth) {
      setModalPaperWidth(customLayout.paperWidth);
    } else if (storeSettings.receiptLayout?.paperWidth) {
      setModalPaperWidth(storeSettings.receiptLayout.paperWidth);
    }
  }, [customLayout?.paperWidth, storeSettings.receiptLayout?.paperWidth]);

  // In direct preview mode (SettingsModal), always use activeLayout.paperWidth immediately for zero-delay reactivity
  const effectivePaperWidth = showModalControls ? modalPaperWidth : (activeLayout.paperWidth || '80mm');

  const layout: ReceiptLayoutConfig = {
    ...activeLayout,
    paperWidth: effectivePaperWidth,
  };

  const defaultPrinter = storeSettings.printers?.find((p) => p.isDefault) || storeSettings.printers?.[0];

  const handlePrint = () => {
    window.print();
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'TUNAI';
      case 'qris':
        return 'QRIS (GOPAY/OVO/DANA/SHOPEEPAY)';
      case 'transfer':
        return 'TRANSFER BANK';
      case 'debit':
        return 'KARTU DEBIT';
      default:
        return method.toUpperCase();
    }
  };

  // Font family styles
  const fontFamilyClass =
    layout.fontFamily === 'sans'
      ? 'font-sans'
      : layout.fontFamily === 'serif'
      ? 'font-serif'
      : 'font-mono-numbers font-mono';

  // Font sizing styles - optimized for high legibility and responsive scaling
  const fontClass =
    layout.fontSize === 'compact'
      ? 'text-[10px] leading-snug'
      : layout.fontSize === 'large'
      ? 'text-[12.5px] sm:text-[13px] leading-relaxed'
      : 'text-[11.5px] leading-normal';

  const headingClass =
    layout.fontSize === 'compact'
      ? 'text-xs font-bold'
      : layout.fontSize === 'large'
      ? 'text-base font-bold'
      : 'text-sm sm:text-base font-bold';

  // Border divider style
  const borderClass =
    layout.borderStyle === 'dotted'
      ? 'border-dotted border-neutral-300'
      : layout.borderStyle === 'solid'
      ? 'border-solid border-neutral-300'
      : layout.borderStyle === 'double'
      ? 'border-b-4 border-double border-neutral-400'
      : layout.borderStyle === 'none'
      ? 'border-transparent'
      : 'border-dashed border-neutral-300';

  // Spacing / Density class
  const densityClass =
    layout.density === 'compact'
      ? 'py-1.5 space-y-1'
      : layout.density === 'spacious'
      ? 'py-3.5 space-y-2'
      : 'py-2.5 space-y-1.5';

  const is58mm = layout.paperWidth === '58mm';
  const is100mm = layout.paperWidth === '100mm';

  // Responsive thermal paper widths: perfectly fits within preview panels and guarantees all contents remain covered
  const widthContainerClass = is58mm
    ? 'receipt-58mm w-full max-w-[290px] sm:max-w-[310px]'
    : is100mm
    ? 'receipt-100mm w-full max-w-[420px] sm:max-w-[460px]'
    : 'receipt-80mm w-full max-w-[340px] sm:max-w-[380px]';

  // Check section visibility
  const hidden = layout.hiddenSections || [];
  const isVisible = (secKey: ReceiptSectionKey) => !hidden.includes(secKey);

  // 1. Header Section
  const renderHeader = () => {
    if (!isVisible('header')) return null;

    const alignClass =
      layout.headerAlign === 'left'
        ? 'text-left items-start'
        : layout.headerAlign === 'right'
        ? 'text-right items-end'
        : 'text-center items-center';

    const justifyClass =
      layout.headerAlign === 'left'
        ? 'justify-start'
        : layout.headerAlign === 'right'
        ? 'justify-end'
        : 'justify-center';

    return (
      <div key="header" className={`pb-3 border-b ${borderClass} ${alignClass}`}>
        {/* Store Logo / Profile Photo */}
        {layout.showLogo && storeSettings.logoUrl && (
          <div className={`mb-2 flex ${justifyClass}`}>
            <img
              src={storeSettings.logoUrl}
              alt={storeSettings.storeName}
              className="h-10 sm:h-11 w-auto max-w-[120px] object-contain rounded filter grayscale contrast-125"
            />
          </div>
        )}

        <h2 className={`${headingClass} tracking-tight uppercase text-neutral-950 break-words leading-tight`}>
          {storeSettings.storeName || 'VarzyPos'}
        </h2>

        {layout.showTagline !== false && storeSettings.tagline && (
          <p className="text-[10.5px] text-neutral-600 mt-0.5 break-words leading-tight">
            {storeSettings.tagline}
          </p>
        )}

        {layout.showAddress !== false && storeSettings.address && (
          <p className="text-[10.5px] text-neutral-500 mt-0.5 leading-tight break-words">
            {storeSettings.address}
          </p>
        )}

        {layout.showPhone !== false && storeSettings.phone && (
          <p className="text-[10.5px] text-neutral-500 break-words leading-tight">
            Telp: {storeSettings.phone}
          </p>
        )}

        {layout.customHeaderNotes && (
          <p className={`text-[10px] text-neutral-600 italic mt-1.5 border-t border-dotted border-neutral-200 pt-1.5 break-words leading-tight ${
            layout.templateId === 'invoice' ? 'font-bold uppercase tracking-wider text-neutral-800' : ''
          }`}>
            {layout.customHeaderNotes}
          </p>
        )}
      </div>
    );
  };

  // 2. Order Badge (Table / Queue / Dine-in)
  const renderOrderBadge = () => {
    if (!isVisible('order_badge')) return null;

    const badgeText = layout.orderBadgeText || (layout.templateId === 'cafe' ? 'MEJA 04 · DINE IN' : '');
    if (!badgeText) return null;

    return (
      <div key="order_badge" className={`py-2 border-b ${borderClass} flex justify-center items-center`}>
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-900 text-white rounded-md font-bold tracking-wider text-[11px] uppercase shadow-2xs">
          <Utensils className="w-3 h-3 text-amber-400" />
          <span>{badgeText}</span>
        </div>
      </div>
    );
  };

  // 3. Transaction Info Section
  const renderTransactionInfo = () => {
    if (!isVisible('transaction_info')) return null;

    return (
      <div key="transaction_info" className={`${densityClass} border-b ${borderClass} space-y-1`}>
        {layout.showInvoiceNumber !== false && (
          <div className="flex justify-between items-center gap-2 min-w-0">
            <span className="text-neutral-500 shrink-0">No. Faktur:</span>
            <span className="font-semibold text-neutral-900 break-all text-right min-w-0">
              {transaction.invoiceNumber}
            </span>
          </div>
        )}

        {layout.showDateTime !== false && (
          <div className="flex justify-between items-center gap-2 min-w-0">
            <span className="text-neutral-500 shrink-0">Waktu:</span>
            <span className="text-neutral-800 text-right min-w-0">{formatTanggal(transaction.timestamp)}</span>
          </div>
        )}

        {layout.showCashier && (
          <div className="flex justify-between items-center gap-2 min-w-0">
            <span className="text-neutral-500 shrink-0">Kasir:</span>
            <span className="text-neutral-800 text-right truncate min-w-0">
              {transaction.cashierName || storeSettings.cashierName || 'Kasir'}
            </span>
          </div>
        )}

        {layout.showCustomer && transaction.customerName && (
          <div className="flex justify-between items-center gap-2 min-w-0">
            <span className="text-neutral-500 shrink-0">Pelanggan:</span>
            <span className="text-neutral-800 text-right truncate min-w-0">{transaction.customerName}</span>
          </div>
        )}
      </div>
    );
  };

  // 4. Items List Section
  const renderItems = () => {
    if (!isVisible('items')) return null;

    const isInvoiceStyle = layout.templateId === 'invoice';

    return (
      <div key="items" className={`${densityClass} border-b ${borderClass}`}>
        {/* Table Header for Formal Invoice */}
        {isInvoiceStyle && (
          <div className="flex justify-between items-center text-[10px] font-bold text-neutral-600 uppercase border-b border-neutral-200 pb-1 mb-1.5">
            <span className="flex-1">Barang / Deskripsi</span>
            <span className="w-16 text-center">Qty</span>
            <span className="w-20 text-right">Subtotal</span>
          </div>
        )}

        <div className="space-y-2">
          {(transaction.items || []).map((item, index) => {
            if (layout.itemRowStyle === 'single-line') {
              return (
                <div key={index} className="flex justify-between items-baseline gap-2 py-0.5 min-w-0">
                  <span className="font-medium text-neutral-900 flex-1 min-w-0 break-words leading-tight">
                    {item.name}
                  </span>
                  <span className="text-neutral-500 text-[10.5px] shrink-0 text-center">
                    {item.quantity} {item.unit || 'x'}
                    {layout.showUnitPrice && !isInvoiceStyle ? ` @${formatRupiah(item.price)}` : ''}
                  </span>
                  <span className="font-semibold text-neutral-900 text-right shrink-0">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              );
            }

            // Two-line layout (default, best for thermal paper)
            return (
              <div key={index} className="space-y-0.5 min-w-0">
                <div className="font-medium text-neutral-900 break-words leading-tight">
                  {item.name}
                </div>
                <div className="flex justify-between items-baseline gap-2 min-w-0 text-neutral-600">
                  <span className="text-[10.5px] sm:text-[11px] shrink min-w-0 truncate">
                    {item.quantity} {item.unit} {layout.showUnitPrice !== false ? `x ${formatRupiah(item.price)}` : ''}
                  </span>
                  <span className="font-semibold text-neutral-900 shrink-0 text-right">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 5. Payment Summary Section
  const renderPaymentSummary = () => {
    if (!isVisible('payment_summary')) return null;

    const isModern = layout.templateId === 'modern';
    const isInvoice = layout.templateId === 'invoice';

    return (
      <div key="payment_summary" className={`${densityClass} border-b ${borderClass} space-y-1`}>
        <div className="flex justify-between items-center gap-2 min-w-0 text-neutral-600">
          <span className="shrink-0">Subtotal</span>
          <span className="font-medium text-neutral-900 text-right shrink-0">{formatRupiah(transaction.subtotal)}</span>
        </div>

        {transaction.discountAmount > 0 && (
          <div className="flex justify-between items-center gap-2 min-w-0 text-rose-600 font-medium">
            <span className="shrink-0">Potongan Diskon</span>
            <span className="text-right shrink-0">-{formatRupiah(transaction.discountAmount)}</span>
          </div>
        )}

        {transaction.taxAmount > 0 && (
          <div className="flex justify-between items-center gap-2 min-w-0 text-neutral-600">
            <span className="shrink-0">PPN ({transaction.taxRate}%)</span>
            <span className="font-medium text-neutral-900 text-right shrink-0">{formatRupiah(transaction.taxAmount)}</span>
          </div>
        )}

        {/* Total Row */}
        {isModern ? (
          <div className="flex justify-between items-center gap-2 min-w-0 bg-neutral-950 text-white p-2 rounded-lg mt-2 font-bold text-sm sm:text-base">
            <span className="shrink-0 tracking-wide">TOTAL TAGIHAN</span>
            <span className="text-right shrink-0 text-emerald-300 font-mono-numbers">{formatRupiah(transaction.totalAmount ?? (transaction as any).total ?? 0)}</span>
          </div>
        ) : isInvoice ? (
          <div className="flex justify-between items-center gap-2 min-w-0 text-sm sm:text-base font-bold text-neutral-950 pt-1.5 mt-1 border-t-2 border-b-2 border-neutral-900">
            <span className="shrink-0 uppercase">TOTAL AKHIR</span>
            <span className="text-right shrink-0">{formatRupiah(transaction.totalAmount ?? (transaction as any).total ?? 0)}</span>
          </div>
        ) : (
          <div className="flex justify-between items-center gap-2 min-w-0 text-sm sm:text-base font-bold text-neutral-950 pt-1.5 border-t border-dotted border-neutral-300">
            <span className="shrink-0">TOTAL</span>
            <span className="text-right shrink-0">{formatRupiah(transaction.totalAmount ?? (transaction as any).total ?? 0)}</span>
          </div>
        )}
      </div>
    );
  };

  // 6. Payment Details Section
  const renderPaymentDetails = () => {
    if (!isVisible('payment_details')) return null;

    return (
      <div key="payment_details" className={`${densityClass} border-b ${borderClass} space-y-1`}>
        <div className="flex justify-between items-start gap-2 min-w-0">
          <span className="text-neutral-500 shrink-0">Metode Bayar:</span>
          <span className="font-semibold text-neutral-900 text-right break-words flex-1 min-w-0">
            {getPaymentLabel(transaction.paymentMethod)}
          </span>
        </div>

        {transaction.paymentMethod === 'cash' && (
          <>
            <div className="flex justify-between items-center gap-2 min-w-0">
              <span className="text-neutral-500 shrink-0">Tunai Diterima:</span>
              <span className="text-neutral-800 text-right shrink-0">{formatRupiah(transaction.cashGiven)}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 font-bold text-neutral-900 pt-0.5">
              <span className="shrink-0">Kembalian:</span>
              <span className="text-emerald-700 text-right shrink-0">{formatRupiah(transaction.change)}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // 7. Custom Notes Box
  const renderCustomNotes = () => {
    if (!isVisible('custom_notes')) return null;
    if (!layout.customNotes) return null;

    return (
      <div key="custom_notes" className={`${densityClass} border-b ${borderClass} text-center`}>
        <div className="bg-neutral-50 border border-neutral-200/90 rounded-lg p-2 text-[10px] text-neutral-700 leading-snug break-words">
          {layout.customNotes}
        </div>
      </div>
    );
  };

  // 8. Footer Section
  const renderFooter = () => {
    if (!isVisible('footer')) return null;

    return (
      <div key="footer" className={`pt-3 text-center text-[10.5px] text-neutral-500 space-y-1.5`}>
        {storeSettings.receiptFooter && (
          <p className="leading-tight break-words">{storeSettings.receiptFooter}</p>
        )}
        {layout.customFooterNotes && (
          <p className="text-[9.5px] text-neutral-400 italic break-words">
            {layout.customFooterNotes}
          </p>
        )}
      </div>
    );
  };

  // 9. Barcode Section
  const renderBarcode = () => {
    if (!isVisible('barcode')) return null;
    if (!layout.showBarcode) return null;

    return (
      <div key="barcode" className="pt-2 text-center text-[10px] text-neutral-400 space-y-1">
        <div className="flex flex-col items-center justify-center pt-1 opacity-75">
          <div
            className={`h-5 max-w-full bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_7px,transparent_7px,transparent_9px)] ${
              is58mm ? 'w-28 sm:w-32' : is100mm ? 'w-44 sm:w-48' : 'w-32 sm:w-36'
            }`}
          />
          <span className="text-[9.5px] tracking-widest mt-0.5 font-mono-numbers">{transaction.invoiceNumber}</span>
        </div>
        <p className="text-[9px] text-neutral-400">--- SIMPAN STRUK SEBAGAI BUKTI ---</p>
      </div>
    );
  };

  // Registry of all section renderers
  const sectionRenderers: Record<ReceiptSectionKey, () => React.ReactNode> = {
    header: renderHeader,
    order_badge: renderOrderBadge,
    transaction_info: renderTransactionInfo,
    items: renderItems,
    payment_summary: renderPaymentSummary,
    payment_details: renderPaymentDetails,
    custom_notes: renderCustomNotes,
    footer: renderFooter,
    barcode: renderBarcode,
  };

  // Ordered sections to render
  const sectionsToRender = (layout.sectionsOrder || DEFAULT_SECTIONS_ORDER).filter(
    (key) => sectionRenderers[key] !== undefined
  );

  const receiptContent = (
    <div
      id="receipt-print-area"
      className={`bg-white text-neutral-900 p-4 sm:p-5 pb-6 sm:pb-7 rounded-2xl mx-auto shadow-lg border border-neutral-300/80 box-border overflow-hidden self-start shrink-0 print:border-none print:shadow-none print:p-2 print:max-w-none transition-all duration-150 ${widthContainerClass} ${fontClass} ${fontFamilyClass}`}
    >
      {sectionsToRender.map((sectionKey) => sectionRenderers[sectionKey]())}
    </div>
  );

  if (!showModalControls) {
    return receiptContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 max-w-xl w-full relative shadow-2xl my-auto border border-neutral-300 dark:border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                {language === 'en' ? 'Sales Receipt Preview' : 'Pratinjau Nota Penjualan'}
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-full">
                {layout.paperWidth}
              </span>
              {layout.templateId && layout.templateId !== 'custom' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded-full capitalize">
                  {layout.templateId}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
              <span>Printer: {defaultPrinter?.name || (language === 'en' ? 'Browser System' : 'Sistem Browser')}</span>
              <span>·</span>
              <span>{(transaction.items || []).length} {language === 'en' ? 'Items' : 'Barang'}</span>
            </p>
          </div>

          {/* Quick Paper Width Selector & Close */}
          <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs self-start sm:self-auto">
            <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 px-1.5">
              {language === 'en' ? 'Paper:' : 'Kertas:'}
            </span>
            <button
              type="button"
              onClick={() => setModalPaperWidth('58mm')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                effectivePaperWidth === '58mm'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              58mm
            </button>
            <button
              type="button"
              onClick={() => setModalPaperWidth('80mm')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                effectivePaperWidth === '80mm'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setModalPaperWidth('100mm')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                effectivePaperWidth === '100mm'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              100mm
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors ml-1 cursor-pointer"
              title={language === 'en' ? 'Close' : 'Tutup'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The receipt preview surface */}
        <div className="max-h-[72vh] overflow-y-auto overflow-x-hidden py-4 px-2 sm:px-4 flex justify-center items-start bg-neutral-200/70 dark:bg-neutral-950/70 rounded-xl border border-neutral-300/70 dark:border-neutral-800 shadow-inner">
          {receiptContent}
        </div>

        {/* Modal footer buttons */}
        <div className="flex items-center justify-between gap-2.5 mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">
              {language === 'en'
                ? 'Paper dimensions fit all transaction details'
                : 'Ukuran kertas memuat seluruh rincian transaksi'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Close' : 'Tutup'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {language === 'en' ? 'Print Receipt' : 'Cetak Struk'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
