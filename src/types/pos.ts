export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number; // Harga Modal/Beli
  price: number;     // Harga Jual
  stock: number;     // Stok saat ini
  minStock: number;  // Batas minimum peringatan
  unit: string;      // pcs, botol, kg, bungkus, dll
  imageUrl?: string; // URL gambar atau Base64 data URL
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number; // 0 - 100%
}

export interface TransactionItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debit';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  items: TransactionItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  totalCost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  cashGiven: number;
  change: number;
  cashierName: string;
  customerName?: string;
  status: 'completed' | 'cancelled';
  cancelledReason?: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  previousStock: number;
  newStock: number;
  difference: number;
  reason: 'restock' | 'sale' | 'damaged' | 'expired' | 'return' | 'manual';
  notes?: string;
  timestamp: string;
}

export type PrinterConnectionType = 'bluetooth' | 'usb' | 'network' | 'system';
export type PaperWidth = '58mm' | '80mm' | '100mm';

export interface PrinterDevice {
  id: string;
  name: string;
  type: PrinterConnectionType;
  paperWidth: PaperWidth;
  ipAddress?: string;
  isDefault: boolean;
  createdAt: string;
}

export type ReceiptTemplateId = 'classic' | 'minimal' | 'modern' | 'invoice' | 'cafe' | 'custom';

export type ReceiptSectionKey =
  | 'header'
  | 'order_badge'
  | 'transaction_info'
  | 'items'
  | 'payment_summary'
  | 'payment_details'
  | 'custom_notes'
  | 'footer'
  | 'barcode';

export type ReceiptBorderStyle = 'dashed' | 'dotted' | 'solid' | 'double' | 'none';
export type ReceiptFontFamily = 'mono' | 'sans' | 'serif';
export type ReceiptDensity = 'compact' | 'normal' | 'spacious';

export type LabelPaperSize =
  | 'thermal_40x30' // 40mm x 30mm Roll Sticker
  | 'thermal_50x30' // 50mm x 30mm Roll Sticker
  | 'receipt_58mm'  // 58mm Thermal Receipt Paper
  | 'receipt_80mm'  // 80mm Thermal Receipt Paper
  | 'a4_grid';      // A4 Sheet Multi-label Grid

export interface SkuLabelConfig {
  paperSize: LabelPaperSize;
  barcodeType: 'barcode' | 'qrcode';
  showStoreName: boolean;
  showProductName: boolean;
  showPrice: boolean;
  showSkuText: boolean;
  showCategory: boolean;
  customFooterText?: string;
  copiesPerProduct: number;
  useStockAsCopies?: boolean;
}

export const DEFAULT_SKU_LABEL_CONFIG: SkuLabelConfig = {
  paperSize: 'thermal_40x30',
  barcodeType: 'barcode',
  showStoreName: true,
  showProductName: true,
  showPrice: true,
  showSkuText: true,
  showCategory: false,
  customFooterText: '',
  copiesPerProduct: 1,
  useStockAsCopies: false,
};

export interface ReceiptLayoutConfig {
  templateId?: ReceiptTemplateId;
  paperWidth: PaperWidth;
  fontSize: 'compact' | 'normal' | 'large'; // 10px, 11px, 12px
  fontFamily?: ReceiptFontFamily;
  borderStyle?: ReceiptBorderStyle;
  density?: ReceiptDensity;
  headerAlign: 'center' | 'left' | 'right';
  showLogo: boolean;
  showTagline?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showDateTime?: boolean;
  showInvoiceNumber?: boolean;
  showBarcode: boolean;
  showUnitPrice?: boolean;
  itemRowStyle: 'single-line' | 'two-line';
  customHeaderNotes?: string;
  customFooterNotes?: string;
  customNotes?: string;
  orderBadgeText?: string;
  sectionsOrder?: ReceiptSectionKey[];
  hiddenSections?: ReceiptSectionKey[];
}

export type ThemeAccent = 'emerald' | 'indigo' | 'violet' | 'rose' | 'amber' | 'slate';
export type BackgroundTheme =
  | 'default'
  | 'slate'
  | 'zinc'
  | 'warm'
  | 'cool'
  | 'mesh'
  | 'dots'
  | 'custom';

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  cashierName: string;
  receiptFooter: string;
  taxEnabled: boolean;
  taxRate: number; // e.g. 11 for 11%
  soundEnabled: boolean;
  logoUrl?: string; // Foto profil / logo toko (Base64 atau URL)
  theme?: 'light' | 'dark' | 'system';
  themeAccent?: ThemeAccent;
  backgroundTheme?: BackgroundTheme;
  customBgUrl?: string;
  language?: 'id' | 'en';
  receiptLayout: ReceiptLayoutConfig;
  printers: PrinterDevice[];
}

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: 'VarzyPos',
  tagline: 'Sistem Kasir & Stok Real-Time',
  address: 'Jl. Merdeka Raya No. 45, Jakarta Pusat',
  phone: '0812-3456-7890',
  cashierName: 'Kasir 01',
  receiptFooter: 'Barang yang sudah dibeli tidak dapat ditukar kembali tanpa struk. Terima kasih atas kunjungan Anda!',
  taxEnabled: false,
  taxRate: 11,
  soundEnabled: true,
  logoUrl: '',
  theme: 'light',
  themeAccent: 'emerald',
  backgroundTheme: 'default',
  customBgUrl: '',
  language: 'id',
  receiptLayout: {
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
      'order_badge',
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
  printers: [
    {
      id: 'print-default-1',
      name: 'Printer Kasir Utama (Thermal 80mm)',
      type: 'system',
      paperWidth: '80mm',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'print-default-2',
      name: 'Mobile POS Bluetooth (58mm)',
      type: 'bluetooth',
      paperWidth: '58mm',
      isDefault: false,
      createdAt: new Date().toISOString(),
    },
  ],
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Sembako', description: 'Kebutuhan pokok seperti beras, minyak, gula, dan telur' },
  { id: 'cat-2', name: 'Makanan', description: 'Makanan instan, bumbu, dan mie' },
  { id: 'cat-3', name: 'Minuman', description: 'Air mineral, teh, kopi, dan minuman kemasan' },
  { id: 'cat-4', name: 'Snack', description: 'Camilan ringan, keripik, dan biskuit' },
  { id: 'cat-5', name: 'Kebersihan', description: 'Sabun, sampo, pembersih lantai, dan deterjen' },
  { id: 'cat-6', name: 'Kesehatan', description: 'Obat-obatan ringan, vitamin, dan suplemen' },
  { id: 'cat-7', name: 'Lainnya', description: 'Barang serbaguna lainnya' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Beras Pandan Wangi 5kg',
    sku: 'BRS-001',
    category: 'Sembako',
    costPrice: 65000,
    price: 74000,
    stock: 25,
    minStock: 5,
    unit: 'karung',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Minyak Goreng Bimoli 2L',
    sku: 'MYK-002',
    category: 'Sembako',
    costPrice: 32000,
    price: 36500,
    stock: 18,
    minStock: 5,
    unit: 'pouch',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Gula Pasir Gulaku 1kg',
    sku: 'GLA-003',
    category: 'Sembako',
    costPrice: 14500,
    price: 17500,
    stock: 30,
    minStock: 8,
    unit: 'kg',
    imageUrl: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Indomie Goreng Original',
    sku: 'MIE-004',
    category: 'Makanan',
    costPrice: 2800,
    price: 3500,
    stock: 120,
    minStock: 20,
    unit: 'bungkus',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-5',
    name: 'Indomie Soto Mie 70g',
    sku: 'MIE-005',
    category: 'Makanan',
    costPrice: 2700,
    price: 3300,
    stock: 4, // low stock test
    minStock: 10,
    unit: 'bungkus',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-6',
    name: 'Telur Ayam Negeri 1kg',
    sku: 'TLR-006',
    category: 'Sembako',
    costPrice: 25000,
    price: 29000,
    stock: 15,
    minStock: 5,
    unit: 'kg',
    imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-7',
    name: 'Aqua Botol 600ml',
    sku: 'AQU-007',
    category: 'Minuman',
    costPrice: 2800,
    price: 4000,
    stock: 48,
    minStock: 12,
    unit: 'botol',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-8',
    name: 'Teh Pucuk Harum 350ml',
    sku: 'TPC-008',
    category: 'Minuman',
    costPrice: 2900,
    price: 4000,
    stock: 36,
    minStock: 10,
    unit: 'botol',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-9',
    name: 'Kopi Kapal Api Special Mix 10s',
    sku: 'KPI-009',
    category: 'Minuman',
    costPrice: 12500,
    price: 15000,
    stock: 20,
    minStock: 5,
    unit: 'renceng',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-10',
    name: 'Susu UHT Ultra Milk Cokelat 250ml',
    sku: 'SSU-010',
    category: 'Minuman',
    costPrice: 5800,
    price: 7200,
    stock: 22,
    minStock: 6,
    unit: 'kotak',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-11',
    name: 'Chitato Sapi Panggang 68g',
    sku: 'SNK-011',
    category: 'Snack',
    costPrice: 8500,
    price: 11000,
    stock: 14,
    minStock: 5,
    unit: 'bungkus',
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-12',
    name: 'Oreo Vanilla 133g',
    sku: 'SNK-012',
    category: 'Snack',
    costPrice: 8000,
    price: 10500,
    stock: 0, // out of stock test
    minStock: 5,
    unit: 'pack',
    imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-13',
    name: 'Sabun Mandi Lifebuoy Total 10 110g',
    sku: 'SBN-013',
    category: 'Kebersihan',
    costPrice: 4200,
    price: 5500,
    stock: 28,
    minStock: 8,
    unit: 'batang',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-14',
    name: 'Sunlight Jeruk Nipis 700ml',
    sku: 'SNL-014',
    category: 'Kebersihan',
    costPrice: 12000,
    price: 15000,
    stock: 16,
    minStock: 5,
    unit: 'pouch',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-15',
    name: 'Tolak Angin Cair 12s',
    sku: 'TLK-015',
    category: 'Kesehatan',
    costPrice: 40000,
    price: 48000,
    stock: 12,
    minStock: 4,
    unit: 'kotak',
    updatedAt: new Date().toISOString(),
  },
];

export type UserRole = 'owner' | 'admin' | 'pengguna';

export interface RolePermissions {
  dashboard: boolean;
  pos: boolean;
  inventory: boolean;
  transactions: boolean;
  reports: boolean;
  team: boolean;
  settings: boolean;
}

export const DEFAULT_OWNER_PERMISSIONS: RolePermissions = {
  dashboard: true,
  pos: true,
  inventory: true,
  transactions: true,
  reports: true,
  team: true,
  settings: true,
};

export const DEFAULT_ADMIN_PERMISSIONS: RolePermissions = {
  dashboard: true,
  pos: true,
  inventory: true,
  transactions: true,
  reports: true,
  team: false,
  settings: true,
};

export const DEFAULT_STAFF_PERMISSIONS: RolePermissions = {
  dashboard: true,
  pos: true,
  inventory: false,
  transactions: true,
  reports: false,
  team: false,
  settings: false,
};

export interface StoreMember {
  id: string;
  storeId: string;
  email: string;
  username?: string;
  name: string;
  role: UserRole;
  permissions: RolePermissions;
  uid?: string | null;
  invitedBy: string;
  password?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  ownerUid: string;
  ownerEmail: string;
  createdAt: string;
}
