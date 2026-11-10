export type AppLanguage = 'id' | 'en';

export interface Translations {
  common: {
    search: string;
    filter: string;
    all: string;
    actions: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    total: string;
    subtotal: string;
    cash: string;
    change: string;
    payment: string;
    date: string;
    status: string;
    items: string;
    qty: string;
    price: string;
    discount: string;
    tax: string;
    print: string;
    yes: string;
    no: string;
    loading: string;
    notes: string;
    optional: string;
    confirm: string;
    back: string;
  };
  nav: {
    dashboard: string;
    pos: string;
    inventory: string;
    transactions: string;
    reports: string;
    team: string;
    settings: string;
    logout: string;
    roleOwner: string;
    roleAdmin: string;
    roleCashier: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    todayRevenue: string;
    todayTransactions: string;
    todayProfit: string;
    totalAssetValue: string;
    quickActionNewTx: string;
    quickActionAddProduct: string;
    quickActionHistory: string;
    quickActionReports: string;
    recentTransactions: string;
    viewAllTransactions: string;
    topProducts: string;
    lowStockAlert: string;
    outOfStockAlert: string;
    restockNow: string;
    noTransactionsToday: string;
    noLowStock: string;
    cashier: string;
    greeting: string;
  };
  pos: {
    title: string;
    allCategories: string;
    searchPlaceholder: string;
    cartTitle: string;
    clearCart: string;
    emptyCart: string;
    emptyCartSub: string;
    customerName: string;
    paymentMethod: string;
    cash: string;
    qris: string;
    transfer: string;
    debit: string;
    cashGiven: string;
    exactMoney: string;
    processPayment: string;
    insufficientCash: string;
    transactionSuccess: string;
    changeAmount: string;
    printReceipt: string;
    newTransaction: string;
    stock: string;
  };
  inventory: {
    title: string;
    subtitle: string;
    addProduct: string;
    manageCategories: string;
    searchProduct: string;
    filterCategory: string;
    stockStatus: string;
    allStock: string;
    lowStockOnly: string;
    outOfStockOnly: string;
    colProduct: string;
    colCategory: string;
    colCost: string;
    colPrice: string;
    colStock: string;
    colActions: string;
    adjustStock: string;
    editProduct: string;
    deleteProduct: string;
    confirmDelete: string;
    noProducts: string;
  };
  transactions: {
    title: string;
    subtitle: string;
    searchInvoice: string;
    filterStatus: string;
    allStatus: string;
    completed: string;
    cancelled: string;
    totalTransactions: string;
    totalTurnover: string;
    viewReceipt: string;
    cancelTransaction: string;
    cancelConfirm: string;
    noTransactions: string;
    method: string;
  };
  reports: {
    title: string;
    subtitle: string;
    period: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    allTime: string;
    totalRevenue: string;
    grossProfit: string;
    averageOrder: string;
    salesTrend: string;
    paymentBreakdown: string;
    topCategories: string;
    revenueVsCost: string;
  };
  team: {
    title: string;
    subtitle: string;
    addMember: string;
    colName: string;
    colEmail: string;
    colRole: string;
    colPermissions: string;
    ownerNote: string;
    deleteConfirm: string;
    modalTitleEditOwner: string;
    modalTitleEdit: string;
    modalTitleAdd: string;
    ownerBannerTitle: string;
    ownerBannerDesc: string;
    failAddMember: string;
    labelUsername: string;
    labelUsernameDesc: string;
    placeholderUsername: string;
    labelName: string;
    labelNameDesc: string;
    placeholderName: string;
    labelEmail: string;
    labelEmailDesc: string;
    placeholderEmail: string;
    labelPassword: string;
    labelPasswordDesc: string;
    placeholderPasswordEdit: string;
    placeholderPasswordNew: string;
    labelRole: string;
    roleAdminTitle: string;
    roleAdminDesc: string;
    roleCashierTitle: string;
    roleCashierDesc: string;
    quickPresets: string;
    quickPresetsDesc: string;
    presetCashier: string;
    presetWarehouse: string;
    presetReports: string;
    presetAll: string;
    permScopeTitle: string;
    permOwnerFull: string;
    permCheckNotice: string;
    permPOS: string;
    permInventory: string;
    permReports: string;
    permTransactions: string;
    permDashboard: string;
    permSettings: string;
    btnSaving: string;
    btnSaveChanges: string;
    btnCreateAccount: string;
    manageAccess: string;
    deleteMember: string;
  };
  categories: {
    manageTitle: string;
    manageSubtitle: string;
    addCategory: string;
    catNamePlaceholder: string;
    catDescPlaceholder: string;
    btnAdd: string;
    listTitle: string;
    relatedItems: string;
    itemsCount: string;
    editTitle: string;
    deleteTitle: string;
    deleteModalTitle: string;
    deleteWarning: string;
    moveItemsTo: string;
    noItemsWarning: string;
    btnConfirmDelete: string;
    done: string;
  };
  settings: {
    pageTitle: string;
    pageSubtitle: string;
    tabProfile: string;
    tabReceipt: string;
    tabPrinters: string;
    tabPreferences: string;
    tabSystem: string;
    themeTitle: string;
    themeSubtitle: string;
    themeLight: string;
    themeLightDesc: string;
    themeDark: string;
    themeDarkDesc: string;
    themeSystem: string;
    themeSystemDesc: string;
    langTitle: string;
    langSubtitle: string;
    langId: string;
    langIdDesc: string;
    langEn: string;
    langEnDesc: string;
    saveButton: string;
    savedAlert: string;
  };
}

export const translations: Record<AppLanguage, Translations> = {
  id: {
    common: {
      search: 'Cari...',
      filter: 'Filter',
      all: 'Semua',
      actions: 'Aksi',
      save: 'Simpan',
      cancel: 'Batal',
      delete: 'Hapus',
      edit: 'Edit',
      close: 'Tutup',
      total: 'Total',
      subtotal: 'Subtotal',
      cash: 'Tunai',
      change: 'Kembalian',
      payment: 'Pembayaran',
      date: 'Tanggal',
      status: 'Status',
      items: 'Barang',
      qty: 'Qty',
      price: 'Harga',
      discount: 'Diskon',
      tax: 'Pajak',
      print: 'Cetak',
      yes: 'Ya',
      no: 'Tidak',
      loading: 'Memuat data...',
      notes: 'Catatan',
      optional: 'Opsional',
      confirm: 'Konfirmasi',
      back: 'Kembali',
    },
    nav: {
      dashboard: 'Dashboard',
      pos: 'Kasir',
      inventory: 'Stok Barang',
      transactions: 'Riwayat',
      reports: 'Laporan',
      team: 'Tim & Akses',
      settings: 'Pengaturan',
      logout: 'Keluar',
      roleOwner: 'Owner',
      roleAdmin: 'Admin',
      roleCashier: 'Kasir',
    },
    dashboard: {
      title: 'Dashboard Penjualan',
      subtitle: 'Ringkasan performa penjualan toko real-time',
      todayRevenue: 'Penjualan Hari Ini',
      todayTransactions: 'Transaksi Hari Ini',
      todayProfit: 'Estimasi Laba Kotor',
      totalAssetValue: 'Nilai Aset Stok',
      quickActionNewTx: 'Transaksi Kasir Baru',
      quickActionAddProduct: 'Tambah Produk Baru',
      quickActionHistory: 'Riwayat Nota',
      quickActionReports: 'Laporan Penjualan',
      recentTransactions: 'Transaksi Terkini',
      viewAllTransactions: 'Lihat Semua Transaksi',
      topProducts: 'Produk Paling Laris',
      lowStockAlert: 'Peringatan Stok Menipis',
      outOfStockAlert: 'Stok Habis',
      restockNow: 'Restok',
      noTransactionsToday: 'Belum ada transaksi pada hari ini.',
      noLowStock: 'Semua stok produk dalam kondisi aman dan mencukupi.',
      cashier: 'Kasir',
      greeting: 'Selamat bertugas',
    },
    pos: {
      title: 'Kasir Penjualan',
      allCategories: 'Semua Kategori',
      searchPlaceholder: 'Cari nama produk, ketik SKU, atau scan barcode...',
      cartTitle: 'Keranjang Transaksi',
      clearCart: 'Kosongkan',
      emptyCart: 'Keranjang Masih Kosong',
      emptyCartSub: 'Pilih produk dari katalog di sebelah kiri untuk memulai penjualan',
      customerName: 'Nama Pelanggan (Opsional)',
      paymentMethod: 'Metode Pembayaran',
      cash: 'Tunai (Cash)',
      qris: 'QRIS Digital',
      transfer: 'Transfer Bank',
      debit: 'Kartu Debit',
      cashGiven: 'Nominal Tunai Diterima',
      exactMoney: 'Uang Pas',
      processPayment: 'Selesaikan & Cetak Struk',
      insufficientCash: 'Nominal uang diterima kurang dari total tagihan',
      transactionSuccess: 'Transaksi Berhasil!',
      changeAmount: 'Kembalian',
      printReceipt: 'Cetak Struk',
      newTransaction: 'Transaksi Baru',
      stock: 'Stok',
    },
    inventory: {
      title: 'Katalog & Stok Barang',
      subtitle: 'Kelola master produk, harga modal, harga jual, dan sisa stok barang',
      addProduct: 'Tambah Produk',
      manageCategories: 'Kelola Kategori',
      searchProduct: 'Cari nama barang, kode SKU...',
      filterCategory: 'Kategori',
      stockStatus: 'Status Stok',
      allStock: 'Semua Stok',
      lowStockOnly: 'Stok Menipis',
      outOfStockOnly: 'Stok Habis',
      colProduct: 'Nama Produk',
      colCategory: 'Kategori',
      colCost: 'Harga Modal',
      colPrice: 'Harga Jual',
      colStock: 'Sisa Stok',
      colActions: 'Aksi',
      adjustStock: 'Sesuaikan Stok',
      editProduct: 'Edit',
      deleteProduct: 'Hapus',
      confirmDelete: 'Apakah Anda yakin ingin menghapus produk ini?',
      noProducts: 'Tidak ada produk yang sesuai dengan pencarian.',
    },
    transactions: {
      title: 'Riwayat Transaksi Penjualan',
      subtitle: 'Daftar semua nota dan pembayaran transaksi yang tercatat',
      searchInvoice: 'Cari nomor nota, kasir, atau nama pelanggan...',
      filterStatus: 'Status Nota',
      allStatus: 'Semua Status',
      completed: 'Selesai / Sah',
      cancelled: 'Dibatalkan',
      totalTransactions: 'Total Transaksi',
      totalTurnover: 'Total Omset',
      viewReceipt: 'Lihat Struk',
      cancelTransaction: 'Batalkan Transaksi',
      cancelConfirm: 'Apakah Anda yakin ingin membatalkan nota transaksi ini? Stok barang akan dikembalikan otomatis.',
      noTransactions: 'Tidak ada riwayat transaksi yang ditemukan.',
      method: 'Metode',
    },
    reports: {
      title: 'Laporan Keuangan & Penjualan',
      subtitle: 'Analisis pendapatan, perolehan laba kotor, dan tren performa penjualan',
      period: 'Periode Analisis',
      today: 'Hari Ini',
      thisWeek: '7 Hari Terakhir',
      thisMonth: 'Bulan Ini',
      allTime: 'Semua Waktu',
      totalRevenue: 'Total Pendapatan',
      grossProfit: 'Laba Kotor',
      averageOrder: 'Rata-rata Transaksi',
      salesTrend: 'Tren Omset Penjualan',
      paymentBreakdown: 'Porsi Metode Pembayaran',
      topCategories: 'Kategori Produk Terlaris',
      revenueVsCost: 'Perbandingan Omset vs Modal',
    },
    team: {
      title: 'Manajemen Tim & Hak Akses',
      subtitle: 'Kelola akun staf kasir, admin, dan hak akses fitur toko',
      addMember: 'Tambah Anggota Tim',
      colName: 'Nama Staf',
      colEmail: 'Email / Username',
      colRole: 'Peran',
      colPermissions: 'Hak Akses',
      ownerNote: 'Owner toko hanya satu dan memiliki hak akses penuh secara permanen.',
      deleteConfirm: 'Apakah Anda yakin ingin menghapus anggota tim ini?',
      modalTitleEditOwner: 'Atur Profil Pemilik Toko (Owner Utama)',
      modalTitleEdit: 'Atur Peran & Akses Pengguna',
      modalTitleAdd: 'Tambah Anggota Tim Baru',
      ownerBannerTitle: 'Pemilik Toko Utama (Owner Pertama)',
      ownerBannerDesc: 'Akun ini adalah pemilik sah pertama toko yang login. Peran Owner bersifat tunggal (hanya 1 akun, tidak ada duanya) dan tidak dapat digandakan demi keamanan toko.',
      failAddMember: 'Gagal menambahkan anggota:',
      labelUsername: 'Username Pengguna',
      labelUsernameDesc: 'ID login unik (huruf kecil & angka)',
      placeholderUsername: 'Contoh: kasir1',
      labelName: 'Nama Lengkap Petugas',
      labelNameDesc: 'Nama display di kasir & nota',
      placeholderName: 'Contoh: Budi Santoso',
      labelEmail: 'Alamat Email',
      labelEmailDesc: 'Akun email untuk autentikasi',
      placeholderEmail: 'kasir1@gmail.com',
      labelPassword: 'Kata Sandi (Password)',
      labelPasswordDesc: 'Anggota bisa langsung login dengan kata sandi ini',
      placeholderPasswordEdit: 'Kosongkan jika tak diubah',
      placeholderPasswordNew: 'Min. 6 karakter',
      labelRole: 'Peran (Role)',
      roleAdminTitle: 'Admin Toko',
      roleAdminDesc: 'Mengelola produk, stok, laporan, dan nota penjualan',
      roleCashierTitle: 'Pengguna (Staff)',
      roleCashierDesc: 'Fitur dibatasi sesuai pembagian tugas (kasir / gudang)',
      quickPresets: 'Pilihan Cepat Pembagian Tugas',
      quickPresetsDesc: 'Klik untuk menerapkan izin',
      presetCashier: '🛒 Khusus Kasir',
      presetWarehouse: '📦 Khusus Gudang',
      presetReports: '📊 Khusus Laporan',
      presetAll: '⚡ Semua Fitur',
      permScopeTitle: 'Pembatasan Fitur Per Pengguna',
      permOwnerFull: 'Owner Akses Penuh',
      permCheckNotice: 'Centang fitur yang diizinkan',
      permPOS: 'Akses Kasir (POS)',
      permInventory: 'Akses Stok Barang',
      permReports: 'Akses Laporan & Keuangan',
      permTransactions: 'Akses Riwayat Transaksi',
      permDashboard: 'Akses Dashboard',
      permSettings: 'Akses Pengaturan & Printer',
      btnSaving: 'Menyimpan...',
      btnSaveChanges: 'Simpan Perubahan',
      btnCreateAccount: 'Tambahkan Anggota & Buat Akun',
      manageAccess: 'Atur Akses',
      deleteMember: 'Hapus Anggota',
    },
    categories: {
      manageTitle: 'Kelola Kategori Barang',
      manageSubtitle: 'Buat, ubah nama, dan hapus kategori pengelompokan barang',
      addCategory: 'Tambah Kategori Baru',
      catNamePlaceholder: 'Nama Kategori (contoh: Frozen Food)',
      catDescPlaceholder: 'Deskripsi singkat (opsional)',
      btnAdd: 'Tambah',
      listTitle: 'Daftar Kategori',
      relatedItems: 'Barang Terkait',
      itemsCount: 'barang',
      editTitle: 'Edit Kategori',
      deleteTitle: 'Hapus Kategori',
      deleteModalTitle: 'Hapus Kategori',
      deleteWarning: 'Terdapat {n} barang yang saat ini menggunakan kategori ini.',
      moveItemsTo: 'Pindahkan barang tersebut ke kategori:',
      noItemsWarning: 'Tidak ada barang yang menggunakan kategori ini. Kategori akan langsung dihapus.',
      btnConfirmDelete: 'Ya, Hapus Kategori',
      done: 'Selesai',
    },
    settings: {
      pageTitle: 'Pengaturan Toko & Sistem',
      pageSubtitle: 'Kelola identitas usaha, format nota kasir, printer thermal, preferensi bahasa & tema sistem.',
      tabProfile: 'Profil Toko & Logo',
      tabReceipt: 'Format & Tata Letak Nota',
      tabPrinters: 'Manajemen Printer',
      tabPreferences: 'Bahasa & Tema Tampilan',
      tabSystem: 'Sistem & Data',
      themeTitle: 'Tema Tampilan Sistem',
      themeSubtitle: 'Pilih nuansa warna antarmuka yang nyaman untuk aktivitas kasir Anda:',
      themeLight: 'Terang (Light Mode)',
      themeLightDesc: 'Tampilan bersih & cerah, ideal untuk operasional toko di siang hari.',
      themeDark: 'Gelap (Dark Mode)',
      themeDarkDesc: 'Mengurangi ketegangan mata, hemat energi & ideal untuk shift malam.',
      themeSystem: 'Otomatis (Sesuai Sistem)',
      themeSystemDesc: 'Menyesuaikan mode tema secara otomatis dengan preferensi perangkat Anda.',
      langTitle: 'Bahasa Aplikasi (Language)',
      langSubtitle: 'Pilih bahasa antarmuka kasir dan laporan transaksi:',
      langId: 'Bahasa Indonesia',
      langIdDesc: 'Antarmuka penuh dalam Bahasa Indonesia (Default)',
      langEn: 'English (US)',
      langEnDesc: 'Complete user interface in English',
      saveButton: 'Simpan Perubahan',
      savedAlert: 'Pengaturan berhasil disimpan!',
    },
  },
  en: {
    common: {
      search: 'Search...',
      filter: 'Filter',
      all: 'All',
      actions: 'Actions',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      total: 'Total',
      subtotal: 'Subtotal',
      cash: 'Cash',
      change: 'Change',
      payment: 'Payment',
      date: 'Date',
      status: 'Status',
      items: 'Items',
      qty: 'Qty',
      price: 'Price',
      discount: 'Discount',
      tax: 'Tax',
      print: 'Print',
      yes: 'Yes',
      no: 'No',
      loading: 'Loading data...',
      notes: 'Notes',
      optional: 'Optional',
      confirm: 'Confirm',
      back: 'Back',
    },
    nav: {
      dashboard: 'Dashboard',
      pos: 'POS Cashier',
      inventory: 'Inventory',
      transactions: 'Transactions',
      reports: 'Reports',
      team: 'Team & Access',
      settings: 'Settings',
      logout: 'Log Out',
      roleOwner: 'Owner',
      roleAdmin: 'Admin',
      roleCashier: 'Cashier',
    },
    dashboard: {
      title: 'Sales Dashboard',
      subtitle: 'Real-time store sales and revenue performance summary',
      todayRevenue: "Today's Sales",
      todayTransactions: "Today's Transactions",
      todayProfit: 'Gross Profit',
      totalAssetValue: 'Stock Asset Value',
      quickActionNewTx: 'New POS Sale',
      quickActionAddProduct: 'Add New Product',
      quickActionHistory: 'Sales History',
      quickActionReports: 'Financial Reports',
      recentTransactions: 'Recent Transactions',
      viewAllTransactions: 'View All Transactions',
      topProducts: 'Top Selling Products',
      lowStockAlert: 'Low Stock Alerts',
      outOfStockAlert: 'Out of stock',
      restockNow: 'Restock',
      noTransactionsToday: 'No transactions recorded today yet.',
      noLowStock: 'All product stock levels are healthy and sufficient.',
      cashier: 'Cashier',
      greeting: 'Have a great shift',
    },
    pos: {
      title: 'Point of Sale',
      allCategories: 'All Categories',
      searchPlaceholder: 'Search product name, SKU or scan barcode...',
      cartTitle: 'Order Summary',
      clearCart: 'Clear',
      emptyCart: 'Cart is Empty',
      emptyCartSub: 'Select items from the catalog on the left to start selling',
      customerName: 'Customer Name (Optional)',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      qris: 'QRIS Digital',
      transfer: 'Bank Transfer',
      debit: 'Debit Card',
      cashGiven: 'Cash Amount Received',
      exactMoney: 'Exact Amount',
      processPayment: 'Charge & Print Receipt',
      insufficientCash: 'Cash received is less than total amount',
      transactionSuccess: 'Payment Successful!',
      changeAmount: 'Change',
      printReceipt: 'Print Receipt',
      newTransaction: 'New Transaction',
      stock: 'Stock',
    },
    inventory: {
      title: 'Inventory & Stock Catalog',
      subtitle: 'Manage products, cost prices, retail selling prices, and stock quantities',
      addProduct: 'Add Product',
      manageCategories: 'Manage Categories',
      searchProduct: 'Search item name, SKU code...',
      filterCategory: 'Category',
      stockStatus: 'Stock Status',
      allStock: 'All Stock',
      lowStockOnly: 'Low Stock Only',
      outOfStockOnly: 'Out of Stock',
      colProduct: 'Product Name',
      colCategory: 'Category',
      colCost: 'Cost Price',
      colPrice: 'Retail Price',
      colStock: 'In Stock',
      colActions: 'Actions',
      adjustStock: 'Adjust Stock',
      editProduct: 'Edit',
      deleteProduct: 'Delete',
      confirmDelete: 'Are you sure you want to delete this product?',
      noProducts: 'No products found matching your search.',
    },
    transactions: {
      title: 'Sales Transaction History',
      subtitle: 'Complete list of all recorded invoices, receipts, and payments',
      searchInvoice: 'Search invoice number, cashier, customer name...',
      filterStatus: 'Status',
      allStatus: 'All Statuses',
      completed: 'Completed',
      cancelled: 'Cancelled',
      totalTransactions: 'Total Invoices',
      totalTurnover: 'Total Revenue',
      viewReceipt: 'View Receipt',
      cancelTransaction: 'Cancel Invoice',
      cancelConfirm: 'Are you sure you want to cancel this transaction? Product stocks will be restored automatically.',
      noTransactions: 'No transaction records found.',
      method: 'Method',
    },
    reports: {
      title: 'Financial & Sales Reports',
      subtitle: 'In-depth revenue breakdown, gross profits, and sales trends',
      period: 'Report Period',
      today: 'Today',
      thisWeek: 'Last 7 Days',
      thisMonth: 'This Month',
      allTime: 'All Time',
      totalRevenue: 'Total Revenue',
      grossProfit: 'Gross Profit',
      averageOrder: 'Average Basket',
      salesTrend: 'Sales Revenue Trend',
      paymentBreakdown: 'Payment Method Breakdown',
      topCategories: 'Best Performing Categories',
      revenueVsCost: 'Revenue vs COGS Comparison',
    },
    team: {
      title: 'Team & Role Access Management',
      subtitle: 'Manage staff cashier accounts, administrators, and feature access permissions',
      addMember: 'Add Team Member',
      colName: 'Staff Name',
      colEmail: 'Email / Username',
      colRole: 'Role',
      colPermissions: 'Permissions',
      ownerNote: 'The store owner is unique and holds permanent full system permissions.',
      deleteConfirm: 'Are you sure you want to remove this team member?',
      modalTitleEditOwner: 'Manage Primary Store Owner Profile',
      modalTitleEdit: 'Manage User Role & Permissions',
      modalTitleAdd: 'Add New Team Member',
      ownerBannerTitle: 'Primary Store Owner (First Account)',
      ownerBannerDesc: 'This account is the store first authenticated owner. The Owner role is unique (only 1 single account) and cannot be duplicated for store security.',
      failAddMember: 'Failed to add member:',
      labelUsername: 'Account Username',
      labelUsernameDesc: 'Unique login ID (lowercase & numbers)',
      placeholderUsername: 'e.g. cashier1',
      labelName: 'Full Staff Name',
      labelNameDesc: 'Display name on cashier & receipts',
      placeholderName: 'e.g. John Doe',
      labelEmail: 'Email Address',
      labelEmailDesc: 'Email address for authentication',
      placeholderEmail: 'cashier1@example.com',
      labelPassword: 'Password',
      labelPasswordDesc: 'Staff member can log in directly using this password',
      placeholderPasswordEdit: 'Leave blank if unchanged',
      placeholderPasswordNew: 'Min. 6 characters',
      labelRole: 'Role',
      roleAdminTitle: 'Store Admin',
      roleAdminDesc: 'Manage products, stock, reports, and receipts',
      roleCashierTitle: 'Staff Member',
      roleCashierDesc: 'Features limited based on assigned duty (cashier / inventory)',
      quickPresets: 'Quick Role Presets',
      quickPresetsDesc: 'Click to apply permissions',
      presetCashier: '🛒 Cashier Only',
      presetWarehouse: '📦 Warehouse Only',
      presetReports: '📊 Reports Only',
      presetAll: '⚡ All Features',
      permScopeTitle: 'User Feature Access Scope',
      permOwnerFull: 'Owner Full Access',
      permCheckNotice: 'Check permitted features',
      permPOS: 'POS Cashier Access',
      permInventory: 'Inventory Stock Access',
      permReports: 'Financial Reports Access',
      permTransactions: 'Transaction History Access',
      permDashboard: 'Dashboard Overview Access',
      permSettings: 'Settings & Printer Access',
      btnSaving: 'Saving...',
      btnSaveChanges: 'Save Changes',
      btnCreateAccount: 'Add Member & Create Account',
      manageAccess: 'Manage Access',
      deleteMember: 'Remove Member',
    },
    categories: {
      manageTitle: 'Manage Item Categories',
      manageSubtitle: 'Create, rename, and delete item category groupings',
      addCategory: 'Add New Category',
      catNamePlaceholder: 'Category Name (e.g. Frozen Food)',
      catDescPlaceholder: 'Brief description (optional)',
      btnAdd: 'Add',
      listTitle: 'Category List',
      relatedItems: 'Linked Items',
      itemsCount: 'items',
      editTitle: 'Edit Category',
      deleteTitle: 'Delete Category',
      deleteModalTitle: 'Delete Category',
      deleteWarning: 'There are {n} items currently using this category.',
      moveItemsTo: 'Move those items to category:',
      noItemsWarning: 'No items use this category. It will be removed immediately.',
      btnConfirmDelete: 'Yes, Delete Category',
      done: 'Done',
    },
    settings: {
      pageTitle: 'Store & System Settings',
      pageSubtitle: 'Manage business identity, receipt layout, thermal printers, language & theme preferences.',
      tabProfile: 'Store Profile & Logo',
      tabReceipt: 'Receipt Layout & Format',
      tabPrinters: 'Printer Management',
      tabPreferences: 'Language & Theme',
      tabSystem: 'System & Data',
      themeTitle: 'System Appearance Theme',
      themeSubtitle: 'Choose the visual color scheme comfortable for your checkout cashier activities:',
      themeLight: 'Light Mode',
      themeLightDesc: 'Crisp & bright design, ideal for daytime store operations.',
      themeDark: 'Dark Mode',
      themeDarkDesc: 'Reduced eye strain, power efficient & perfect for night shifts.',
      themeSystem: 'System Default',
      themeSystemDesc: 'Automatically follows your operating system theme settings.',
      langTitle: 'Interface Language',
      langSubtitle: 'Select the primary language for system navigation and reports:',
      langId: 'Indonesian (Bahasa Indonesia)',
      langIdDesc: 'Lokal Indonesia lengkap untuk toko & UMKM',
      langEn: 'English (US)',
      langEnDesc: 'Complete user interface in English',
      saveButton: 'Save Changes',
      savedAlert: 'Settings saved successfully!',
    },
  },
};

export function getTranslation(lang: AppLanguage = 'id'): Translations {
  return translations[lang] || translations.id;
}
