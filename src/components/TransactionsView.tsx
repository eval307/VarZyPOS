import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMethod } from '../types/pos';
import { formatRupiah, formatTanggal } from '../utils/format';
import { soundFx } from '../utils/audio';
import { useTranslation } from '../context/LanguageContext';
import {
  History,
  Search,
  Printer,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  Trash2,
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  onViewReceipt: (transaction: Transaction) => void;
  onCancelTransaction: (transactionId: string, reason: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onViewReceipt,
  onCancelTransaction,
}) => {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);
  const [cancellingTxId, setCancellingTxId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState(() =>
    language === 'en'
      ? 'Customer cancelled order / input error'
      : 'Pelanggan membatalkan pesanan / salah input'
  );

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        tx.invoiceNumber.toLowerCase().includes(q) ||
        (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
        (tx.items || []).some((i) => i.name && i.name.toLowerCase().includes(q));

      const matchMethod = methodFilter === 'all' || tx.paymentMethod === methodFilter;

      return matchQuery && matchMethod;
    });
  }, [transactions, searchQuery, methodFilter]);

  // Payment badge renderer
  const renderPaymentMethod = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            {t.pos.cash}
          </span>
        );
      case 'qris':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-800">
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            {t.pos.qris}
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-800">
            <CreditCard className="w-3.5 h-3.5 text-sky-600" />
            {t.pos.transfer}
          </span>
        );
      case 'debit':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-800">
            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
            {t.pos.debit}
          </span>
        );
      default:
        return method;
    }
  };

  const handleConfirmCancel = () => {
    if (!cancellingTxId) return;
    soundFx.playTap();
    onCancelTransaction(cancellingTxId, cancelReason);
    setCancellingTxId(null);
  };

  const totalCompletedAmount = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.status !== 'cancelled')
      .reduce((acc, t) => {
        const amt = Number(t.totalAmount ?? (t as any).total ?? 0);
        return acc + (Number.isFinite(amt) ? amt : 0);
      }, 0);
  }, [filteredTransactions]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Page Header Banner */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 md:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'en' ? 'Sales History' : 'Catatan Penjualan'}
              </span>
              <span className="text-xs text-neutral-400">·</span>
              <span className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers">
                {filteredTransactions.length} {language === 'en' ? 'receipts' : 'struk transaksi'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mt-1 truncate">
              {t.transactions.title}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
              {language === 'en'
                ? 'Review, reprint receipts, or cancel cashier transactions in real-time.'
                : 'Pantau riwayat pembayaran kasir, cetak ulang nota pelanggan, dan kelola transaksi.'}
            </p>
          </div>
        </div>

        {/* Total Turnover Metric Banner */}
        <div className="flex items-center gap-3 w-full sm:w-auto bg-neutral-50 dark:bg-neutral-800/60 p-3 sm:p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 justify-between sm:justify-start">
          <div>
            <div className="text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {language === 'en' ? 'Total Turnover' : 'Total Omzet Saring'}
            </div>
            <div className="text-base sm:text-lg font-bold font-mono-numbers text-emerald-700 dark:text-emerald-400">
              {formatRupiah(totalCompletedAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Top Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.transactions.searchInvoice}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-neutral-400 text-xs shrink-0 font-medium">
              {t.transactions.method}:
            </span>
            {['all', 'cash', 'qris', 'transfer', 'debit'].map((method) => {
              const labels: Record<string, string> = {
                all: t.common.all,
                cash: t.pos.cash,
                qris: t.pos.qris,
                transfer: t.pos.transfer,
                debit: t.pos.debit,
              };
              const isActive = methodFilter === method;
              return (
                <button
                  key={method}
                  onClick={() => {
                    soundFx.playTap();
                    setMethodFilter(method);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {labels[method]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile-Friendly Transaction Cards (< md) */}
      <div className="md:hidden space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center text-neutral-400 shadow-xs">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {t.transactions.noTransactions}
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isCancelled = tx.status === 'cancelled';
            const totalItems = (tx.items || []).reduce((acc, i) => acc + (i?.quantity || 0), 0);

            return (
              <div
                key={tx.id}
                className={`bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2.5 transition-colors ${
                  isCancelled ? 'opacity-60 bg-neutral-50/50 dark:bg-neutral-950/40' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold font-mono-numbers text-xs text-neutral-900 dark:text-white">
                      {tx.invoiceNumber}
                    </span>
                    <span className="text-[10px] text-neutral-400">·</span>
                    <span className="text-[11px]">{renderPaymentMethod(tx.paymentMethod)}</span>
                  </div>
                  <div>
                    {!isCancelled ? (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t.transactions.completed}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {t.transactions.cancelled}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="space-y-0.5 min-w-0">
                    <p className="truncate text-neutral-800 dark:text-neutral-200 font-medium">
                      {tx.customerName || (language === 'en' ? 'Walk-in Customer' : 'Pelanggan Umum')}
                    </p>
                    <p className="text-[10px] font-mono-numbers">
                      {formatTanggal(tx.timestamp)} · {totalItems} {t.common.items}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold font-mono-numbers text-sm text-neutral-900 dark:text-white">
                      {formatRupiah(tx.totalAmount ?? (tx as any).total ?? 0)}
                    </p>
                    {!isCancelled && (
                      <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono-numbers">
                        +{formatRupiah(tx.profit ?? 0)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => setSelectedTxDetail(tx)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Details' : 'Detail'}</span>
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playTap();
                      onViewReceipt(tx);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Print' : 'Cetak'}</span>
                  </button>
                  {!isCancelled && (
                    <button
                      onClick={() => {
                        soundFx.playTap();
                        setCancellingTxId(tx.id);
                        setCancelReason('');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Cancel' : 'Batal'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transactions Full Table (Tablet & Desktop: md+) */}
      <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-neutral-50/80 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">{language === 'en' ? 'Invoice No.' : 'No. Faktur'}</th>
                <th className="py-3 px-4">{language === 'en' ? 'Time' : 'Waktu'}</th>
                <th className="py-3 px-4">{language === 'en' ? 'Customer' : 'Pelanggan'}</th>
                <th className="py-3 px-4">{t.pos.paymentMethod}</th>
                <th className="py-3 px-4 text-center">{t.common.items}</th>
                <th className="py-3 px-4 text-right">{t.transactions.totalTurnover}</th>
                <th className="py-3 px-4 text-right">{language === 'en' ? 'Profit' : 'Keuntungan (Profit)'}</th>
                <th className="py-3 px-4 text-center">{t.common.status}</th>
                <th className="py-3 px-4 text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                      {t.transactions.noTransactions}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {language === 'en'
                        ? 'Transactions processed at checkout will automatically appear here.'
                        : 'Transaksi yang diproses di kasir akan tercatat secara otomatis di sini.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCancelled = tx.status === 'cancelled';
                  const totalItems = (tx.items || []).reduce((acc, i) => acc + (i?.quantity || 0), 0);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/60 transition-colors ${
                        isCancelled ? 'opacity-60 bg-neutral-50/40 dark:bg-neutral-950/40' : ''
                      }`}
                    >
                      {/* Invoice */}
                      <td className="py-3 px-4 font-mono-numbers font-semibold text-neutral-900 dark:text-white">
                        {tx.invoiceNumber}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 font-mono-numbers">
                        {formatTanggal(tx.timestamp)}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                        {tx.customerName || <span className="text-neutral-400 dark:text-neutral-500">{language === 'en' ? 'Walk-in' : 'Umum'}</span>}
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderPaymentMethod(tx.paymentMethod)}
                      </td>

                      {/* Item count */}
                      <td className="py-3 px-4 text-center font-mono-numbers text-neutral-600 dark:text-neutral-400">
                        {totalItems}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-mono-numbers font-bold text-neutral-900 dark:text-white">
                        {formatRupiah(tx.totalAmount ?? (tx as any).total ?? 0)}
                      </td>

                      {/* Profit */}
                      <td className="py-3 px-4 text-right font-mono-numbers">
                        {!isCancelled ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            +{formatRupiah(tx.profit ?? 0)}
                          </span>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-600">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {!isCancelled ? (
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.transactions.completed}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 inline-flex items-center gap-1" title={tx.cancelledReason}>
                            <XCircle className="w-3.5 h-3.5" />
                            {t.transactions.cancelled}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTxDetail(tx)}
                            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                            title={language === 'en' ? 'Transaction Details' : 'Rincian Transaksi'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              soundFx.playTap();
                              onViewReceipt(tx);
                            }}
                            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors cursor-pointer"
                            title={language === 'en' ? 'Reprint Receipt' : 'Cetak Ulang Struk'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                soundFx.playTap();
                                setCancellingTxId(tx.id);
                              }}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                              title={language === 'en' ? 'Cancel & Return Stock' : 'Batalkan & Retur Stok'}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full relative shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-auto">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {language === 'en' ? 'Invoice Details ' : 'Rincian Transaksi '}
                  {selectedTxDetail.invoiceNumber}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono-numbers">
                  {formatTanggal(selectedTxDetail.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Customer and Cashier Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">{language === 'en' ? 'Cashier:' : 'Kasir:'}</span>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {selectedTxDetail.cashierName}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">{language === 'en' ? 'Customer:' : 'Pelanggan:'}</span>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {selectedTxDetail.customerName || (language === 'en' ? 'Walk-in' : 'Umum')}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 block text-xs">
                  {language === 'en' ? 'Purchased Items List:' : 'Daftar Barang Belanja:'}
                </span>
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
                  {(selectedTxDetail.items || []).map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between bg-white dark:bg-neutral-900">
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-white">{item.name}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono-numbers">
                          {item.quantity} {item.unit} x {formatRupiah(item.price)}
                        </div>
                      </div>
                      <div className="font-mono-numbers font-bold text-neutral-900 dark:text-white">
                        {formatRupiah(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-1.5 font-mono-numbers">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                  <span>{t.common.subtotal}:</span>
                  <span>{formatRupiah(selectedTxDetail.subtotal)}</span>
                </div>
                {selectedTxDetail.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>{t.common.discount}:</span>
                    <span>-{formatRupiah(selectedTxDetail.discountAmount)}</span>
                  </div>
                )}
                {selectedTxDetail.taxAmount > 0 && (
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                    <span>{t.common.tax} ({selectedTxDetail.taxRate}%):</span>
                    <span>{formatRupiah(selectedTxDetail.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-neutral-900 dark:text-white pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <span>{language === 'en' ? 'Total Amount:' : 'Total Tagihan:'}</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {formatRupiah(selectedTxDetail.totalAmount ?? (selectedTxDetail as any).total ?? 0)}
                  </span>
                </div>
                {selectedTxDetail.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-300 pt-1">
                      <span>{language === 'en' ? 'Cash Received:' : 'Tunai Diterima:'}</span>
                      <span>{formatRupiah(selectedTxDetail.cashGiven)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-700 dark:text-neutral-200 font-semibold">
                      <span>{t.pos.changeAmount}:</span>
                      <span>{formatRupiah(selectedTxDetail.change)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5 bg-neutral-50 dark:bg-neutral-900/80">
              <button
                type="button"
                onClick={() => setSelectedTxDetail(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.common.close}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  onViewReceipt(selectedTxDetail);
                  setSelectedTxDetail(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                {t.pos.printReceipt}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel & Return Confirmation Modal */}
      {cancellingTxId && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'en'
                ? 'Cancel Transaction & Restore Stock?'
                : 'Batalkan Transaksi & Kembalikan Stok (Retur)?'}
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {t.transactions.cancelConfirm}
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {language === 'en' ? 'Cancellation / Return Reason:' : 'Alasan Pembatalan / Retur:'}
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setCancellingTxId(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                {t.common.close}
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                {language === 'en' ? 'Yes, Cancel & Restore Stock' : 'Ya, Batalkan & Kembalikan Stok'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
