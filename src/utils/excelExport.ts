import { Transaction, Product, Category, StoreSettings } from '../types/pos';
import { formatTanggal, formatNumber } from './format';

/**
 * Utility to trigger browser download of Excel (.xls) file
 */
function downloadExcelBlob(htmlContent: string, filename: string) {
  const cleanFilename = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  const blob = new Blob([htmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format a number as safe integer for Excel
 */
function safeNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wrap content inside Excel XML/HTML container with professional stylesheet
 */
function buildExcelDocument(sheetName: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${escapeHtml(sheetName)}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Print>
              <x:ValidPrinterInfo/>
              <x:PaperSizeIndex>9</x:PaperSizeIndex>
              <x:HorizontalResolution>600</x:HorizontalResolution>
              <x:VerticalResolution>600</x:VerticalResolution>
            </x:Print>
            <x:Selected/>
            <x:DoNotDisplayGridlines>False</x:DoNotDisplayGridlines>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      font-size: 10pt;
      color: #1e293b;
      margin: 12px;
    }
    table {
      border-collapse: collapse;
      mso-displayed-decimal-separator: ",";
      mso-displayed-thousand-separator: ".";
      width: 100%;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    
    /* Excel number formatting */
    .num-curr {
      mso-number-format: "\\#\\,\\#\\#0";
      text-align: right;
    }
    .num-qty {
      mso-number-format: "\\#\\,\\#\\#0";
      text-align: right;
    }
    .num-pct {
      mso-number-format: "0\\.0%";
      text-align: right;
    }
    .text-str {
      mso-number-format: "\\@";
    }
    .date-fmt {
      mso-number-format: "yyyy\\-mm\\-dd\\ hh\\:mm";
      text-align: center;
    }

    /* Table & Card Styles */
    .border-cell {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: middle;
    }
    .header-primary {
      background-color: #047857;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      border: 1px solid #065f46;
      padding: 8px;
    }
    .header-col {
      background-color: #047857;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      border: 1px solid #065f46;
      padding: 8px 6px;
      font-size: 10pt;
    }
    .header-sub {
      background-color: #0d9488;
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      border: 1px solid #0f766e;
      padding: 6px;
    }
    .row-even {
      background-color: #ffffff;
    }
    .row-odd {
      background-color: #f8fafc;
    }
    .row-total {
      background-color: #d1fae5;
      font-weight: bold;
      color: #065f46;
      border-top: 1px solid #059669;
      border-bottom: 3px double #047857;
      padding: 8px;
    }

    /* KPI Cards */
    .kpi-box {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: center;
      vertical-align: middle;
    }
    .badge-qris {
      background-color: #e0e7ff;
      color: #3730a3;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-cash {
      background-color: #dcfce7;
      color: #166534;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-transfer {
      background-color: #fef3c7;
      color: #92400e;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-debit {
      background-color: #ede9fe;
      color: #5b21b6;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

/**
 * Generate store branding header block for Excel
 */
function buildStoreHeaderHtml(storeSettings?: StoreSettings, colspan: number = 11): string {
  const storeName = storeSettings?.storeName || 'VarzyPos Retail';
  const tagline = storeSettings?.tagline || 'Sistem Kasir &amp; Manajemen Stok Real-Time';
  const address = storeSettings?.address || 'Jl. Raya Utama No. 01';
  const phone = storeSettings?.phone || '';
  const logoUrl = storeSettings?.logoUrl;

  const hasLogo = Boolean(logoUrl && (logoUrl.startsWith('data:image') || logoUrl.startsWith('http')));

  return `
    <!-- STORE BRANDING HEADER -->
    <tr style="height: 20px;"><td colspan="${colspan}"></td></tr>
    <tr style="height: 75px;">
      <td style="width: 80px; text-align: center; vertical-align: middle; padding: 4px; border: none;">
        ${
          hasLogo
            ? `<img src="${escapeHtml(logoUrl)}" width="65" height="65" style="max-width: 65px; max-height: 65px; object-fit: contain; vertical-align: middle;" alt="Logo Toko" />`
            : `<table style="width:60px; height:60px; background-color:#047857; border-radius:12px; text-align:center;"><tr><td style="color:#ffffff; font-size:24pt; font-weight:bold; text-align:center; vertical-align:middle; font-family:'Segoe UI', Arial;">V</td></tr></table>`
        }
      </td>
      <td colspan="${colspan - 1}" style="vertical-align: middle; padding-left: 12px; border: none;">
        <div style="font-size: 17pt; font-weight: bold; color: #047857; line-height: 1.2;">
          ${escapeHtml(storeName)}
        </div>
        <div style="font-size: 10pt; color: #475569; font-style: italic; margin-top: 2px;">
          ${escapeHtml(tagline)}
        </div>
        <div style="font-size: 9pt; color: #64748b; margin-top: 2px;">
          ${escapeHtml(address)}${phone ? ` &nbsp;•&nbsp; Telp: <b>${escapeHtml(phone)}</b>` : ''}
        </div>
      </td>
    </tr>
    <tr style="height: 12px;"><td colspan="${colspan}"></td></tr>
  `;
}

export interface ExportSalesReportOptions {
  transactions: Transaction[];
  periodLabel: string;
  dateRangeDescription: string;
  storeSettings?: StoreSettings;
  analytics?: {
    totalRevenue: number;
    totalProfit: number;
    totalTxCount: number;
    avgBasketSize: number;
    totalItemsSold: number;
    paymentMap: Record<string, number>;
    topProducts?: Array<{
      id: string;
      name: string;
      sku: string;
      unit: string;
      quantity: number;
      revenue: number;
      profit: number;
    }>;
  };
}

/**
 * Export Detailed Sales Report to Styled Excel (.xls)
 */
export function exportSalesReportToExcel({
  transactions,
  periodLabel,
  dateRangeDescription,
  storeSettings,
  analytics,
}: ExportSalesReportOptions) {
  const completedTx = transactions.filter((t) => t.status === 'completed');
  const totalRevenue = analytics?.totalRevenue ?? completedTx.reduce((sum, t) => sum + safeNum(t.totalAmount), 0);
  const totalProfit = analytics?.totalProfit ?? completedTx.reduce((sum, t) => sum + safeNum(t.profit), 0);
  const totalTxCount = analytics?.totalTxCount ?? completedTx.length;
  const avgBasketSize = analytics?.avgBasketSize ?? (totalTxCount > 0 ? Math.round(totalRevenue / totalTxCount) : 0);
  const totalItemsSold = analytics?.totalItemsSold ?? completedTx.reduce((acc, t) => acc + (t.items || []).reduce((q, it) => q + safeNum(it.quantity), 0), 0);

  const paymentMap = analytics?.paymentMap || {
    cash: completedTx.filter((t) => t.paymentMethod === 'cash').reduce((sum, t) => sum + safeNum(t.totalAmount), 0),
    qris: completedTx.filter((t) => t.paymentMethod === 'qris').reduce((sum, t) => sum + safeNum(t.totalAmount), 0),
    transfer: completedTx.filter((t) => t.paymentMethod === 'transfer').reduce((sum, t) => sum + safeNum(t.totalAmount), 0),
    debit: completedTx.filter((t) => t.paymentMethod === 'debit').reduce((sum, t) => sum + safeNum(t.totalAmount), 0),
  };

  const topProducts = analytics?.topProducts || [];
  const exportTimestamp = formatTanggal(new Date().toISOString());
  const cashierName = storeSettings?.cashierName || 'Kasir Toko';

  // Calculate sum totals for table footer
  const sumSubtotal = completedTx.reduce((s, t) => s + safeNum(t.subtotal), 0);
  const sumDiscount = completedTx.reduce((s, t) => s + safeNum(t.discountAmount), 0);
  const sumTax = completedTx.reduce((s, t) => s + safeNum(t.taxAmount), 0);
  const sumTotal = completedTx.reduce((s, t) => s + safeNum(t.totalAmount), 0);
  const sumProfit = completedTx.reduce((s, t) => s + safeNum(t.profit), 0);

  const body = `
    <table>
      ${buildStoreHeaderHtml(storeSettings, 11)}

      <!-- REPORT TITLE BANNER -->
      <tr style="height: 34px;">
        <td colspan="11" class="header-primary" style="font-size: 13pt; letter-spacing: 0.5px;">
          LAPORAN PENJUALAN &amp; KINERJA KASIR &mdash; ${escapeHtml(periodLabel.toUpperCase())}
        </td>
      </tr>
      <tr style="height: 24px;">
        <td colspan="11" style="background-color: #ecfdf5; color: #065f46; font-size: 9pt; text-align: center; font-weight: 600; border: 1px solid #a7f3d0;">
          Rentang Data: <b>${escapeHtml(dateRangeDescription)}</b> &nbsp;|&nbsp;
          Dicetak Pada: <b>${escapeHtml(exportTimestamp)}</b> &nbsp;|&nbsp;
          Sistem: <b>VarzyPos Cloud POS</b>
        </td>
      </tr>
      <tr style="height: 14px;"><td colspan="11"></td></tr>

      <!-- KPI METRIC SUMMARY CARDS -->
      <tr style="height: 26px;">
        <td colspan="2" class="kpi-box" style="background-color: #f0fdf4; border: 1px solid #bbf7d0;">
          <div style="font-size: 8pt; font-weight: bold; color: #166534; text-transform: uppercase;">Total Pendapatan (Omset)</div>
        </td>
        <td colspan="2" class="kpi-box" style="background-color: #ecfdf5; border: 1px solid #a7f3d0;">
          <div style="font-size: 8pt; font-weight: bold; color: #065f46; text-transform: uppercase;">Total Laba Bersih</div>
        </td>
        <td colspan="2" class="kpi-box" style="background-color: #eff6ff; border: 1px solid #bfdbfe;">
          <div style="font-size: 8pt; font-weight: bold; color: #1e40af; text-transform: uppercase;">Jumlah Transaksi</div>
        </td>
        <td colspan="2" class="kpi-box" style="background-color: #f5f3ff; border: 1px solid #ddd6fe;">
          <div style="font-size: 8pt; font-weight: bold; color: #5b21b6; text-transform: uppercase;">Rata-rata Transaksi</div>
        </td>
        <td colspan="3" class="kpi-box" style="background-color: #fffbeb; border: 1px solid #fde68a;">
          <div style="font-size: 8pt; font-weight: bold; color: #92400e; text-transform: uppercase;">Total Produk Terjual</div>
        </td>
      </tr>
      <tr style="height: 38px;">
        <td colspan="2" class="kpi-box num-curr" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; font-size: 14pt; font-weight: bold; color: #15803d; text-align: center;">
          ${totalRevenue}
        </td>
        <td colspan="2" class="kpi-box num-curr" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; font-size: 14pt; font-weight: bold; color: #047857; text-align: center;">
          ${totalProfit}
        </td>
        <td colspan="2" class="kpi-box" style="background-color: #eff6ff; border: 1px solid #bfdbfe; font-size: 14pt; font-weight: bold; color: #1d4ed8; text-align: center;">
          ${formatNumber(totalTxCount)} Transaksi
        </td>
        <td colspan="2" class="kpi-box num-curr" style="background-color: #f5f3ff; border: 1px solid #ddd6fe; font-size: 14pt; font-weight: bold; color: #6d28d9; text-align: center;">
          ${avgBasketSize}
        </td>
        <td colspan="3" class="kpi-box" style="background-color: #fffbeb; border: 1px solid #fde68a; font-size: 14pt; font-weight: bold; color: #b45309; text-align: center;">
          ${formatNumber(totalItemsSold)} Pcs
        </td>
      </tr>
      <tr style="height: 18px;"><td colspan="11"></td></tr>

      <!-- MINI SUMMARY: METODE PEMBAYARAN & TOP PRODUK -->
      <tr style="height: 28px;">
        <td colspan="4" class="header-sub">RINGKASAN METODE PEMBAYARAN</td>
        <td style="width: 20px;"></td>
        <td colspan="6" class="header-sub">TOP PRODUK TERLARIS</td>
      </tr>
      <tr style="background-color: #f8fafc; font-weight: bold; font-size: 9pt;">
        <td colspan="2" class="border-cell">Metode</td>
        <td colspan="2" class="border-cell text-right">Nominal (Rp)</td>
        <td></td>
        <td colspan="3" class="border-cell">Nama Produk</td>
        <td class="border-cell text-center">SKU</td>
        <td class="border-cell text-right">Qty Terjual</td>
        <td class="border-cell text-right">Total Omset (Rp)</td>
      </tr>
      <tr>
        <td colspan="2" class="border-cell"><span class="badge-cash">TUNAI (CASH)</span></td>
        <td colspan="2" class="border-cell num-curr">${safeNum(paymentMap.cash)}</td>
        <td></td>
        <td colspan="3" class="border-cell">${escapeHtml(topProducts[0]?.name || '-')}</td>
        <td class="border-cell text-center text-str">${escapeHtml(topProducts[0]?.sku || '-')}</td>
        <td class="border-cell num-qty">${safeNum(topProducts[0]?.quantity)}</td>
        <td class="border-cell num-curr">${safeNum(topProducts[0]?.revenue)}</td>
      </tr>
      <tr>
        <td colspan="2" class="border-cell"><span class="badge-qris">QRIS (DIGITAL)</span></td>
        <td colspan="2" class="border-cell num-curr">${safeNum(paymentMap.qris)}</td>
        <td></td>
        <td colspan="3" class="border-cell">${escapeHtml(topProducts[1]?.name || '-')}</td>
        <td class="border-cell text-center text-str">${escapeHtml(topProducts[1]?.sku || '-')}</td>
        <td class="border-cell num-qty">${safeNum(topProducts[1]?.quantity)}</td>
        <td class="border-cell num-curr">${safeNum(topProducts[1]?.revenue)}</td>
      </tr>
      <tr>
        <td colspan="2" class="border-cell"><span class="badge-transfer">TRANSFER BANK</span></td>
        <td colspan="2" class="border-cell num-curr">${safeNum(paymentMap.transfer)}</td>
        <td></td>
        <td colspan="3" class="border-cell">${escapeHtml(topProducts[2]?.name || '-')}</td>
        <td class="border-cell text-center text-str">${escapeHtml(topProducts[2]?.sku || '-')}</td>
        <td class="border-cell num-qty">${safeNum(topProducts[2]?.quantity)}</td>
        <td class="border-cell num-curr">${safeNum(topProducts[2]?.revenue)}</td>
      </tr>
      <tr>
        <td colspan="2" class="border-cell"><span class="badge-debit">KARTU DEBIT</span></td>
        <td colspan="2" class="border-cell num-curr">${safeNum(paymentMap.debit)}</td>
        <td></td>
        <td colspan="3" class="border-cell">${escapeHtml(topProducts[3]?.name || '-')}</td>
        <td class="border-cell text-center text-str">${escapeHtml(topProducts[3]?.sku || '-')}</td>
        <td class="border-cell num-qty">${safeNum(topProducts[3]?.quantity)}</td>
        <td class="border-cell num-curr">${safeNum(topProducts[3]?.revenue)}</td>
      </tr>
      <tr style="height: 20px;"><td colspan="11"></td></tr>

      <!-- TABLE TRANSAKSI SECTION TITLE -->
      <tr style="height: 28px;">
        <td colspan="11" class="header-primary" style="font-size: 11pt; text-align: left; padding-left: 10px;">
          RINCIAN DATA TRANSAKSI PENJUALAN (${completedTx.length} Transaksi Selesai)
        </td>
      </tr>

      <!-- TABLE HEADERS -->
      <tr style="height: 32px;">
        <th class="header-col" style="width: 45px;">No</th>
        <th class="header-col" style="width: 140px;">No Faktur</th>
        <th class="header-col" style="width: 130px;">Waktu Transaksi</th>
        <th class="header-col" style="width: 130px;">Pelanggan</th>
        <th class="header-col" style="width: 100px;">Metode</th>
        <th class="header-col" style="width: 105px;">Subtotal (Rp)</th>
        <th class="header-col" style="width: 90px;">Diskon (Rp)</th>
        <th class="header-col" style="width: 90px;">PPN (Rp)</th>
        <th class="header-col" style="width: 120px;">Total Belanja (Rp)</th>
        <th class="header-col" style="width: 110px;">Laba Bersih (Rp)</th>
        <th class="header-col" style="width: 100px;">Kasir</th>
      </tr>

      <!-- TABLE ROWS -->
      ${
        completedTx.length === 0
          ? `<tr><td colspan="11" class="border-cell text-center" style="padding: 24px; color: #64748b; font-style: italic;">Tidak ada transaksi penjualan pada periode ini.</td></tr>`
          : completedTx
              .map((t, idx) => {
                const rowClass = idx % 2 === 0 ? 'row-even' : 'row-odd';
                let badgeClass = 'badge-cash';
                if (t.paymentMethod === 'qris') badgeClass = 'badge-qris';
                else if (t.paymentMethod === 'transfer') badgeClass = 'badge-transfer';
                else if (t.paymentMethod === 'debit') badgeClass = 'badge-debit';

                return `
                  <tr class="${rowClass}">
                    <td class="border-cell text-center">${idx + 1}</td>
                    <td class="border-cell text-str font-bold" style="color: #047857;">${escapeHtml(t.invoiceNumber)}</td>
                    <td class="border-cell date-fmt">${escapeHtml(formatTanggal(t.timestamp))}</td>
                    <td class="border-cell text-left">${escapeHtml(t.customerName || 'Pelanggan Umum')}</td>
                    <td class="border-cell text-center"><span class="${badgeClass}">${escapeHtml(t.paymentMethod.toUpperCase())}</span></td>
                    <td class="border-cell num-curr">${safeNum(t.subtotal)}</td>
                    <td class="border-cell num-curr" style="color: #dc2626;">${safeNum(t.discountAmount)}</td>
                    <td class="border-cell num-curr">${safeNum(t.taxAmount)}</td>
                    <td class="border-cell num-curr font-bold" style="color: #047857; background-color: #f0fdf4;">${safeNum(t.totalAmount)}</td>
                    <td class="border-cell num-curr font-bold" style="color: #059669;">${safeNum(t.profit)}</td>
                    <td class="border-cell text-left">${escapeHtml(t.cashierName || cashierName)}</td>
                  </tr>
                `;
              })
              .join('')
      }

      <!-- TOTAL SUMMARY FOOTER ROW -->
      <tr class="row-total" style="height: 34px;">
        <td colspan="5" class="border-cell text-right" style="font-size: 11pt;">TOTAL KESELURUHAN (${completedTx.length} Transaksi):</td>
        <td class="border-cell num-curr font-bold">${sumSubtotal}</td>
        <td class="border-cell num-curr font-bold" style="color: #dc2626;">${sumDiscount}</td>
        <td class="border-cell num-curr font-bold">${sumTax}</td>
        <td class="border-cell num-curr font-bold" style="font-size: 11pt; color: #047857;">${sumTotal}</td>
        <td class="border-cell num-curr font-bold" style="font-size: 11pt; color: #059669;">${sumProfit}</td>
        <td class="border-cell"></td>
      </tr>

      <tr style="height: 25px;"><td colspan="11"></td></tr>

      <!-- SIGN-OFF / FOOTER -->
      <tr style="font-size: 9pt; color: #64748b;">
        <td colspan="4" style="text-align: left; vertical-align: top; border: none;">
          <div><b>Catatan Laporan:</b></div>
          <div>1. Data transaksi di atas bersifat sah dan tercatat secara real-time di cloud.</div>
          <div>2. Format mata uang nominal dalam Rupiah (IDR).</div>
          <div>3. Dicetak otomatis melalui sistem <b>VarzyPos</b>.</div>
        </td>
        <td colspan="3" style="text-align: center; vertical-align: top; border: none;">
          <div>Kasir / Petugas Pelapor:</div>
          <br /><br /><br />
          <div><b>( ${escapeHtml(cashierName)} )</b></div>
        </td>
        <td colspan="4" style="text-align: center; vertical-align: top; border: none;">
          <div>Mengetahui, Pemilik Toko:</div>
          <br /><br /><br />
          <div><b>( ${escapeHtml(storeSettings?.storeName || 'Pimpinan Toko')} )</b></div>
        </td>
      </tr>
      <tr style="height: 20px;"><td colspan="11"></td></tr>
    </table>
  `;

  const excelDoc = buildExcelDocument('Laporan Penjualan', body);
  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  downloadExcelBlob(excelDoc, `Laporan-Penjualan-${safePeriod}-${Date.now()}.xls`);
}

/**
 * Export Transactions List to Excel (.xls) with Store Branding
 */
export function exportTransactionsToExcel(
  transactions: Transaction[],
  storeSettings?: StoreSettings,
  reportTitle = 'RIWAYAT TRANSAKSI PENJUALAN'
) {
  const completedTx = transactions.filter((t) => t.status === 'completed');
  const sumTotal = completedTx.reduce((s, t) => s + safeNum(t.totalAmount), 0);
  const sumProfit = completedTx.reduce((s, t) => s + safeNum(t.profit), 0);
  const exportTimestamp = formatTanggal(new Date().toISOString());

  const body = `
    <table>
      ${buildStoreHeaderHtml(storeSettings, 10)}

      <tr style="height: 32px;">
        <td colspan="10" class="header-primary" style="font-size: 12pt;">
          ${escapeHtml(reportTitle.toUpperCase())}
        </td>
      </tr>
      <tr style="height: 22px;">
        <td colspan="10" style="background-color: #ecfdf5; color: #065f46; font-size: 9pt; text-align: center; font-weight: 600; border: 1px solid #a7f3d0;">
          Total Transaksi: <b>${completedTx.length}</b> &nbsp;|&nbsp;
          Total Omset: <b>Rp ${formatNumber(sumTotal)}</b> &nbsp;|&nbsp;
          Dicetak Pada: <b>${escapeHtml(exportTimestamp)}</b>
        </td>
      </tr>
      <tr style="height: 14px;"><td colspan="10"></td></tr>

      <tr style="height: 30px;">
        <th class="header-col" style="width: 45px;">No</th>
        <th class="header-col" style="width: 140px;">No Faktur</th>
        <th class="header-col" style="width: 130px;">Waktu</th>
        <th class="header-col" style="width: 130px;">Pelanggan</th>
        <th class="header-col" style="width: 100px;">Metode</th>
        <th class="header-col" style="width: 100px;">Item (Qty)</th>
        <th class="header-col" style="width: 120px;">Total (Rp)</th>
        <th class="header-col" style="width: 110px;">Laba (Rp)</th>
        <th class="header-col" style="width: 100px;">Status</th>
        <th class="header-col" style="width: 100px;">Kasir</th>
      </tr>

      ${completedTx
        .map((t, idx) => {
          const rowClass = idx % 2 === 0 ? 'row-even' : 'row-odd';
          const totalQty = (t.items || []).reduce((q, it) => q + safeNum(it.quantity), 0);
          return `
            <tr class="${rowClass}">
              <td class="border-cell text-center">${idx + 1}</td>
              <td class="border-cell text-str font-bold" style="color: #047857;">${escapeHtml(t.invoiceNumber)}</td>
              <td class="border-cell date-fmt">${escapeHtml(formatTanggal(t.timestamp))}</td>
              <td class="border-cell text-left">${escapeHtml(t.customerName || 'Umum')}</td>
              <td class="border-cell text-center font-bold">${escapeHtml(t.paymentMethod.toUpperCase())}</td>
              <td class="border-cell num-qty">${totalQty} pcs</td>
              <td class="border-cell num-curr font-bold" style="color: #047857;">${safeNum(t.totalAmount)}</td>
              <td class="border-cell num-curr" style="color: #059669;">${safeNum(t.profit)}</td>
              <td class="border-cell text-center" style="color: #166534; font-weight: bold;">SELESAI</td>
              <td class="border-cell text-left">${escapeHtml(t.cashierName)}</td>
            </tr>
          `;
        })
        .join('')}

      <tr class="row-total" style="height: 32px;">
        <td colspan="6" class="border-cell text-right" style="font-size: 11pt;">TOTAL (${completedTx.length} Transaksi):</td>
        <td class="border-cell num-curr font-bold" style="font-size: 11pt; color: #047857;">${sumTotal}</td>
        <td class="border-cell num-curr font-bold" style="font-size: 11pt; color: #059669;">${sumProfit}</td>
        <td colspan="2" class="border-cell"></td>
      </tr>
    </table>
  `;

  const excelDoc = buildExcelDocument('Riwayat Transaksi', body);
  downloadExcelBlob(excelDoc, `Riwayat-Transaksi-${Date.now()}.xls`);
}

/**
 * Export Inventory Stock List to Excel (.xls) with Store Branding
 */
export function exportInventoryToExcel(
  products: Product[],
  categories: Category[],
  storeSettings?: StoreSettings
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const totalStock = products.reduce((acc, p) => acc + safeNum(p.stock), 0);
  const totalAssetValue = products.reduce((acc, p) => acc + safeNum(p.stock) * safeNum(p.costPrice), 0);
  const totalPotentialRevenue = products.reduce((acc, p) => acc + safeNum(p.stock) * safeNum(p.price), 0);
  const exportTimestamp = formatTanggal(new Date().toISOString());

  const body = `
    <table>
      ${buildStoreHeaderHtml(storeSettings, 9)}

      <tr style="height: 34px;">
        <td colspan="9" class="header-primary" style="font-size: 13pt;">
          LAPORAN STOK &amp; INVENTARIS PRODUK
        </td>
      </tr>
      <tr style="height: 24px;">
        <td colspan="9" style="background-color: #ecfdf5; color: #065f46; font-size: 9pt; text-align: center; font-weight: 600; border: 1px solid #a7f3d0;">
          Total Produk: <b>${products.length} Item</b> &nbsp;|&nbsp;
          Total Kuantitas: <b>${formatNumber(totalStock)} Pcs</b> &nbsp;|&nbsp;
          Nilai Modal Aset: <b>Rp ${formatNumber(totalAssetValue)}</b> &nbsp;|&nbsp;
          Waktu Cetak: <b>${escapeHtml(exportTimestamp)}</b>
        </td>
      </tr>
      <tr style="height: 14px;"><td colspan="9"></td></tr>

      <tr style="height: 32px;">
        <th class="header-col" style="width: 45px;">No</th>
        <th class="header-col" style="width: 130px;">SKU / Barcode</th>
        <th class="header-col" style="width: 220px;">Nama Produk</th>
        <th class="header-col" style="width: 120px;">Kategori</th>
        <th class="header-col" style="width: 100px;">Harga Beli (Modal)</th>
        <th class="header-col" style="width: 100px;">Harga Jual</th>
        <th class="header-col" style="width: 75px;">Stok</th>
        <th class="header-col" style="width: 70px;">Satuan</th>
        <th class="header-col" style="width: 120px;">Nilai Stok Modal (Rp)</th>
      </tr>

      ${products
        .map((p, idx) => {
          const rowClass = idx % 2 === 0 ? 'row-even' : 'row-odd';
          const catName = catMap.get(p.category) || p.category || 'Umum';
          const valModal = safeNum(p.stock) * safeNum(p.costPrice);
          const isLow = safeNum(p.stock) <= safeNum(p.minStock);

          return `
            <tr class="${rowClass}">
              <td class="border-cell text-center">${idx + 1}</td>
              <td class="border-cell text-str font-bold">${escapeHtml(p.sku || '-')}</td>
              <td class="border-cell text-left font-bold" style="color: #0f172a;">${escapeHtml(p.name)}</td>
              <td class="border-cell text-left">${escapeHtml(catName)}</td>
              <td class="border-cell num-curr">${safeNum(p.costPrice)}</td>
              <td class="border-cell num-curr font-bold" style="color: #047857;">${safeNum(p.price)}</td>
              <td class="border-cell num-qty font-bold" style="${isLow ? 'color: #dc2626; background-color: #fee2e2;' : ''}">${safeNum(p.stock)}</td>
              <td class="border-cell text-center">${escapeHtml(p.unit || 'pcs')}</td>
              <td class="border-cell num-curr font-bold">${valModal}</td>
            </tr>
          `;
        })
        .join('')}

      <tr class="row-total" style="height: 34px;">
        <td colspan="6" class="border-cell text-right" style="font-size: 11pt;">TOTAL KESELURUHAN (${products.length} Produk):</td>
        <td class="border-cell num-qty font-bold" style="font-size: 11pt;">${totalStock}</td>
        <td class="border-cell"></td>
        <td class="border-cell num-curr font-bold" style="font-size: 11pt; color: #047857;">${totalAssetValue}</td>
      </tr>
    </table>
  `;

  const excelDoc = buildExcelDocument('Stok Inventaris', body);
  downloadExcelBlob(excelDoc, `Stok-Inventaris-${Date.now()}.xls`);
}
