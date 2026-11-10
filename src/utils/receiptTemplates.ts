import {
  ReceiptLayoutConfig,
  ReceiptTemplateId,
  ReceiptSectionKey,
  PaperWidth,
} from '../types/pos';

export interface ReceiptSectionMeta {
  id: ReceiptSectionKey;
  label: string;
  description: string;
  category: 'identitas' | 'transaksi' | 'produk' | 'pembayaran' | 'penutup';
}

export const ALL_RECEIPT_SECTIONS: ReceiptSectionMeta[] = [
  {
    id: 'header',
    label: 'Header & Profil Toko',
    description: 'Logo, nama toko, slogan/tagline, alamat toko, dan no telepon',
    category: 'identitas',
  },
  {
    id: 'order_badge',
    label: 'Badge Nomor Meja / Antrean',
    description: 'Tanda nomor meja, antrean pelanggan, atau jenis pesanan (Dine-in / Take Away)',
    category: 'transaksi',
  },
  {
    id: 'transaction_info',
    label: 'Informasi Transaksi',
    description: 'Nomor faktur/invoice, tanggal & waktu transaksi, nama kasir, dan nama pelanggan',
    category: 'transaksi',
  },
  {
    id: 'items',
    label: 'Daftar Barang & Rincian Pesanan',
    description: 'Daftar produk yang dibeli, kuantitas/satuan, harga per unit, dan subtotal',
    category: 'produk',
  },
  {
    id: 'payment_summary',
    label: 'Rincian Perhitungan & Total',
    description: 'Subtotal kotor, potongan diskon, pajak PPN, dan total akhir yang harus dibayar',
    category: 'pembayaran',
  },
  {
    id: 'payment_details',
    label: 'Status & Metode Pembayaran',
    description: 'Metode pembayaran (Tunai/QRIS/Transfer), nominal uang diterima, dan kembalian',
    category: 'pembayaran',
  },
  {
    id: 'custom_notes',
    label: 'Catatan Khusus / Promo / WiFi',
    description: 'Kotak catatan tambahan, password WiFi kasir, info garansi, atau instruksi pesanan',
    category: 'penutup',
  },
  {
    id: 'footer',
    label: 'Catatan Kaki & Ucapan Penutup',
    description: 'Pesan terima kasih toko, ketentuan retur barang, atau kontak sosial media',
    category: 'penutup',
  },
  {
    id: 'barcode',
    label: 'Barcode Struk & Nomor Faktur',
    description: 'Garis barcode struk kasir untuk scanning cepat dan verifikasi struk fisik',
    category: 'penutup',
  },
];

export const DEFAULT_SECTIONS_ORDER: ReceiptSectionKey[] = [
  'header',
  'order_badge',
  'transaction_info',
  'items',
  'payment_summary',
  'payment_details',
  'custom_notes',
  'footer',
  'barcode',
];

export interface ReceiptTemplateDefinition {
  id: ReceiptTemplateId;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  badgeColor: string; // Tailwind class
  accentBg: string;
  recommendedPaper: PaperWidth;
  config: Partial<ReceiptLayoutConfig>;
}

export const RECEIPT_TEMPLATES: ReceiptTemplateDefinition[] = [
  {
    id: 'classic',
    name: 'Klasik Kasir Thermal',
    tagline: 'Standar Kasir & Minimarket',
    description: 'Tata letak struk kasir thermal konvensional yang seimbang, rapi, dan mudah dibaca dengan garis putus-putus klasik.',
    badge: 'Paling Populer',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accentBg: 'from-emerald-50 to-teal-50',
    recommendedPaper: '80mm',
    config: {
      templateId: 'classic',
      paperWidth: '80mm',
      fontSize: 'normal',
      fontFamily: 'mono',
      borderStyle: 'dashed',
      density: 'normal',
      headerAlign: 'center',
      showLogo: true,
      showTagline: true,
      showAddress: true,
      showPhone: true,
      showCashier: true,
      showCustomer: true,
      showDateTime: true,
      showInvoiceNumber: true,
      showBarcode: true,
      showUnitPrice: true,
      itemRowStyle: 'two-line',
      customHeaderNotes: '',
      customFooterNotes: '',
      customNotes: '',
      orderBadgeText: '',
      sectionsOrder: [
        'header',
        'transaction_info',
        'items',
        'payment_summary',
        'payment_details',
        'custom_notes',
        'footer',
        'barcode',
      ],
      hiddenSections: ['order_badge'],
    },
  },
  {
    id: 'minimal',
    name: 'Minimalis Hemat Kertas',
    tagline: 'Ringkas, Cepat & Efisien',
    description: 'Dirancang khusus untuk printer mini thermal 58mm. Format 1-baris yang menghemat kertas tanpa mengurangi informasi penting.',
    badge: 'Hemat Kertas',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    accentBg: 'from-blue-50 to-indigo-50',
    recommendedPaper: '58mm',
    config: {
      templateId: 'minimal',
      paperWidth: '58mm',
      fontSize: 'compact',
      fontFamily: 'mono',
      borderStyle: 'dotted',
      density: 'compact',
      headerAlign: 'center',
      showLogo: false,
      showTagline: false,
      showAddress: false,
      showPhone: true,
      showCashier: true,
      showCustomer: false,
      showDateTime: true,
      showInvoiceNumber: true,
      showBarcode: false,
      showUnitPrice: false,
      itemRowStyle: 'single-line',
      customHeaderNotes: '',
      customFooterNotes: '',
      customNotes: '',
      orderBadgeText: '',
      sectionsOrder: [
        'header',
        'transaction_info',
        'items',
        'payment_summary',
        'payment_details',
        'footer',
      ],
      hiddenSections: ['order_badge', 'custom_notes', 'barcode'],
    },
  },
  {
    id: 'modern',
    name: 'Ritel Modern & Elegan',
    tagline: 'Boutique, Fashion & Lifestyle',
    description: 'Gaya visual kontemporer dengan tipografi sans-serif yang bersih, pembatas garis tegas, dan visual hierarki yang elegan.',
    badge: 'Tampilan Modern',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    accentBg: 'from-purple-50 to-pink-50',
    recommendedPaper: '80mm',
    config: {
      templateId: 'modern',
      paperWidth: '80mm',
      fontSize: 'normal',
      fontFamily: 'sans',
      borderStyle: 'solid',
      density: 'normal',
      headerAlign: 'center',
      showLogo: true,
      showTagline: true,
      showAddress: true,
      showPhone: true,
      showCashier: true,
      showCustomer: true,
      showDateTime: true,
      showInvoiceNumber: true,
      showBarcode: true,
      showUnitPrice: true,
      itemRowStyle: 'two-line',
      customHeaderNotes: '',
      customFooterNotes: 'Simpan struk ini sebagai bukti pembayaran yang sah.',
      customNotes: '',
      orderBadgeText: '',
      sectionsOrder: [
        'header',
        'transaction_info',
        'items',
        'payment_summary',
        'payment_details',
        'custom_notes',
        'barcode',
        'footer',
      ],
      hiddenSections: ['order_badge'],
    },
  },
  {
    id: 'invoice',
    name: 'Faktur & Invoice Formal',
    tagline: 'Grosir, Toko Elektronik & B2B',
    description: 'Format faktur terstruktur formal dengan header rata kiri, tabel rincian harga transparan, rincian pajak PPN, dan garis total ganda.',
    badge: 'Resmi & Detail',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    accentBg: 'from-amber-50 to-orange-50',
    recommendedPaper: '100mm',
    config: {
      templateId: 'invoice',
      paperWidth: '100mm',
      fontSize: 'normal',
      fontFamily: 'sans',
      borderStyle: 'double',
      density: 'spacious',
      headerAlign: 'left',
      showLogo: true,
      showTagline: true,
      showAddress: true,
      showPhone: true,
      showCashier: true,
      showCustomer: true,
      showDateTime: true,
      showInvoiceNumber: true,
      showBarcode: true,
      showUnitPrice: true,
      itemRowStyle: 'single-line',
      customHeaderNotes: 'FAKTUR PENJUALAN RESMI',
      customFooterNotes: 'Garansi resmi toko 7 hari dengan menunjukkan faktur fisik ini.',
      customNotes: 'Barang yang telah dibeli sesuai faktur tidak dapat diuangkan kembali.',
      orderBadgeText: '',
      sectionsOrder: [
        'header',
        'transaction_info',
        'items',
        'payment_summary',
        'payment_details',
        'custom_notes',
        'footer',
        'barcode',
      ],
      hiddenSections: ['order_badge'],
    },
  },
  {
    id: 'cafe',
    name: 'Kafe & Resto (F&B)',
    tagline: 'Kuliner, Kedai Kopi & Restoran',
    description: 'Dioptimalkan untuk bisnis makanan dan minuman dengan highlight nomor meja / antrean, catatan pesanan lapang, dan info WiFi.',
    badge: 'Khusus Kuliner',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    accentBg: 'from-rose-50 to-amber-50',
    recommendedPaper: '80mm',
    config: {
      templateId: 'cafe',
      paperWidth: '80mm',
      fontSize: 'normal',
      fontFamily: 'sans',
      borderStyle: 'dashed',
      density: 'spacious',
      headerAlign: 'center',
      showLogo: true,
      showTagline: true,
      showAddress: true,
      showPhone: true,
      showCashier: true,
      showCustomer: true,
      showDateTime: true,
      showInvoiceNumber: true,
      showBarcode: false,
      showUnitPrice: true,
      itemRowStyle: 'two-line',
      customHeaderNotes: 'Selamat Menikmati Hidangan Kami',
      customFooterNotes: 'Terima kasih atas kunjungannya, kami nantikan kedatangan Anda kembali!',
      customNotes: 'WiFi: KafeKu-Free | Sandi: ngopiyuk123',
      orderBadgeText: 'MEJA 04 · DINE IN',
      sectionsOrder: [
        'order_badge',
        'header',
        'transaction_info',
        'items',
        'payment_summary',
        'payment_details',
        'custom_notes',
        'footer',
      ],
      hiddenSections: ['barcode'],
    },
  },
];

/**
 * Sanitizes any existing or incomplete ReceiptLayoutConfig into a fully valid config object.
 */
export function sanitizeReceiptLayout(raw?: Partial<ReceiptLayoutConfig>): ReceiptLayoutConfig {
  const fallback = RECEIPT_TEMPLATES[0].config;

  const validSections = raw?.sectionsOrder && Array.isArray(raw.sectionsOrder) && raw.sectionsOrder.length > 0
    ? raw.sectionsOrder.filter((s) => DEFAULT_SECTIONS_ORDER.includes(s))
    : DEFAULT_SECTIONS_ORDER;

  // Ensure all sections exist in the order list
  const missingSections = DEFAULT_SECTIONS_ORDER.filter((s) => !validSections.includes(s));
  const fullOrder = [...validSections, ...missingSections];

  const hidden = raw?.hiddenSections && Array.isArray(raw.hiddenSections)
    ? raw.hiddenSections
    : (!raw?.orderBadgeText ? ['order_badge'] as ReceiptSectionKey[] : []);

  return {
    templateId: raw?.templateId || fallback.templateId || 'classic',
    paperWidth: raw?.paperWidth || '80mm',
    fontSize: raw?.fontSize || 'normal',
    fontFamily: raw?.fontFamily || 'mono',
    borderStyle: raw?.borderStyle || 'dashed',
    density: raw?.density || 'normal',
    headerAlign: raw?.headerAlign || 'center',
    showLogo: raw?.showLogo !== undefined ? raw.showLogo : true,
    showTagline: raw?.showTagline !== undefined ? raw.showTagline : true,
    showAddress: raw?.showAddress !== undefined ? raw.showAddress : true,
    showPhone: raw?.showPhone !== undefined ? raw.showPhone : true,
    showCashier: raw?.showCashier !== undefined ? raw.showCashier : true,
    showCustomer: raw?.showCustomer !== undefined ? raw.showCustomer : true,
    showDateTime: raw?.showDateTime !== undefined ? raw.showDateTime : true,
    showInvoiceNumber: raw?.showInvoiceNumber !== undefined ? raw.showInvoiceNumber : true,
    showBarcode: raw?.showBarcode !== undefined ? raw.showBarcode : true,
    showUnitPrice: raw?.showUnitPrice !== undefined ? raw.showUnitPrice : true,
    itemRowStyle: raw?.itemRowStyle || 'two-line',
    customHeaderNotes: raw?.customHeaderNotes || '',
    customFooterNotes: raw?.customFooterNotes || '',
    customNotes: raw?.customNotes || '',
    orderBadgeText: raw?.orderBadgeText || '',
    sectionsOrder: fullOrder,
    hiddenSections: hidden,
  };
}

/**
 * Creates a blank custom layout from scratch (blank canvas).
 */
export function createBlankReceiptConfig(paperWidth: PaperWidth = '80mm'): ReceiptLayoutConfig {
  return {
    templateId: 'custom',
    paperWidth,
    fontSize: 'normal',
    fontFamily: 'mono',
    borderStyle: 'dashed',
    density: 'normal',
    headerAlign: 'center',
    showLogo: true,
    showTagline: true,
    showAddress: true,
    showPhone: true,
    showCashier: true,
    showCustomer: true,
    showDateTime: true,
    showInvoiceNumber: true,
    showBarcode: true,
    showUnitPrice: true,
    itemRowStyle: 'two-line',
    customHeaderNotes: '',
    customFooterNotes: '',
    customNotes: '',
    orderBadgeText: '',
    sectionsOrder: [...DEFAULT_SECTIONS_ORDER],
    // In blank mode, everything except the basic essential blocks is hidden initially so user can build up
    hiddenSections: [
      'order_badge',
      'custom_notes',
      'barcode',
    ],
  };
}

/**
 * Applies a chosen template onto current settings, preserving paper width or applying recommended.
 */
export function applyReceiptTemplate(
  templateId: ReceiptTemplateId,
  current?: Partial<ReceiptLayoutConfig>,
  forceRecommendedPaper: boolean = false
): ReceiptLayoutConfig {
  const template = RECEIPT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return sanitizeReceiptLayout(current);
  }

  const paperWidth = forceRecommendedPaper
    ? template.recommendedPaper
    : current?.paperWidth || template.recommendedPaper;

  return sanitizeReceiptLayout({
    ...template.config,
    paperWidth,
    templateId,
  });
}
