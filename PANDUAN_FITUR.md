# 📖 Panduan Lengkap Fitur KasirKu Real-Time POS

**KasirKu Real-Time POS** adalah aplikasi kasir (*Point of Sale*) modern, responsif, dan berbasis komputasi awan real-time (Cloud Firestore). Aplikasi ini dirancang khusus untuk mempermudah operasional ritel, toko kelontong, kafe, grosir, maupun UMKM dengan analitik keuangan sekelas terminal profesional.

---

## 📑 Daftar Isi
1. [Ringkasan Teknologi & Arsitektur](#-ringkasan-teknologi--arsitektur)
2. [Sistem Akun, Keamanan & Single-Owner](#-sistem-akun-keamanan--single-owner)
3. [Manajemen Tim & Hak Akses (RBAC)](#-manajemen-tim--hak-akses-rbac)
4. [Dashboard & Analitik Produk Terlaris](#-dashboard--analitik-produk-terlaris)
5. [Point of Sale (Kasir & Transaksi Cepat)](#-point-of-sale-kasir--transaksi-cepat)
6. [Inventaris & Manajemen Stok Produk](#-inventaris--manajemen-stok-produk)
7. [Riwayat & Pembatalan Transaksi (Void)](#-riwayat--pembatalan-transaksi-void)
8. [Laporan Keuangan & Grafik Forex Candlestick](#-laporan-keuangan--grafik-forex-candlestick)
9. [Pengaturan Toko, Tema & Bahasa](#-pengaturan-toko-tema--bahasa)
10. [Desain Nota, Pratinjau Struk & Manajemen Printer](#-desain-nota-pratinjau-struk--manajemen-printer)
11. [Integrasi Google Stitch via MCP](#-integrasi-google-stitch-via-mcp)

---

## 🛠 Ringkasan Teknologi & Arsitektur
- **Frontend Framework**: React 19 + TypeScript + Vite.
- **Styling**: Tailwind CSS v4 dengan dukungan adaptif penuh **Dark Mode** & **Light Mode**.
- **Database & Auth**: Google Firebase (Cloud Firestore untuk sinkronisasi real-time & Firebase Authentication).
- **Audio Feedback**: Web Audio API sintetis (beep scanner kasir & success payment chime).
- **Visualisasi Data**: Pure SVG Canvas responsif (Diagram Batang Rangking & Grafik Forex Candlestick tanpa dependensi eksternal berat).
- **Internasionalisasi (i18n)**: Dukungan dwibahasa (Bahasa Indonesia & English).

---

## 🔐 Sistem Akun, Keamanan & Single-Owner
KasirKu menerapkan model keamanan ketat untuk toko:
- **Prinsip Single Owner**: Pengguna pertama yang mendaftar atau pertama kali login otomatis diakui sebagai **Owner satu-satunya** toko. Tidak akan ada duplikasi owner untuk mencegah perebutan hak akses toko.
- **Isolasi Data Toko**: Setiap toko memiliki koleksi data independen di Firestore berdasarkan identitas Owner.
- **Penyimpanan Lokal Persisten**: Pengaturan preferensi tema dan bahasa disimpan secara aman di `localStorage` dan tidak akan ter-reset saat halaman di-refresh.

---

## 👥 Manajemen Tim & Hak Akses (RBAC)
Menu **Tim & Akses** memungkinkan pemilik toko mengelola staf dan kasir dengan aman tanpa membagikan kata sandi utama.
- **Peran Pengguna (*Roles*)**:
  1. **Owner**: Akses penuh ke seluruh menu, laporan, pengaturan, dan manajemen anggota tim.
  2. **Admin**: Mengelola transaksi, inventaris stok, laporan keuangan, dan pengaturan toko (tidak dapat menghapus Owner).
  3. **Pengguna / Kasir**: Terbatas pada menu operasional kasir (POS) dan riwayat transaksi harian.
- **Hak Akses Granular**: Setiap peran dapat diatur centang izin aksesnya secara spesifik:
  - *Dashboard*
  - *Point of Sale (POS)*
  - *Inventaris & Stok*
  - *Riwayat Transaksi*
  - *Laporan Keuangan*
  - *Tim & Akses*
  - *Pengaturan Sistem*

---

## 📊 Dashboard & Analitik Produk Terlaris
Dashboard menyajikan ringkasan performa bisnis secara seketika:
- **Kartu Indikator Kinerja Utama (KPI)**:
  - Total Omzet Hari Ini (dengan persentase perbandingan).
  - Jumlah Transaksi Berhasil.
  - Estimasi Keuntungan Bersih Hari Ini.
  - Jumlah Produk dengan Stok Menipis / Kritis.
- **Diagram Batang Produk Terlaris (`TopProductsBarChart`)**:
  - **Filter Waktu Fleksibel**: Pilihan rentang *Harian (Hari Ini)*, *Mingguan (7 Hari)*, *Bulanan (Bulan Ini)*, dan *Semua Waktu*.
  - **Metrik Ganda**: Beralih antara **Unit Terjual (Qty)** atau **Nilai Omzet (Rp)**.
  - **Dua Pilihan Tampilan**:
    - *Ranked Horizontal Bars*: Kartu peringkat dengan lencana emas (#1), perak (#2), perunggu (#3), progres bar gradient, dan persentase kontribusi.
    - *Vertical Column Chart*: Grafik batang tegak interaktif dengan tooltip hover lengkap.
  - **Ticker Ringkasan**: Volume unit terjual, produk juara satu, dan transaksi periode.
- **Feed Transaksi Terkini & Watchlist Stok Menipis**: Memantau langsung kasir yang sedang bertransaksi dan peringatan produk yang harus segera di-restock.

---

## 🛒 Point of Sale (Kasir & Transaksi Cepat)
Modul utama untuk kasir dengan alur kerja cepat dan minim klik:
- **⚡ Mode Scan Langsung Bayar (Express Scan-to-Payment)**:
  - Sakelar toggle cepat pada bilah kasir: saat diaktifkan, kasir hanya perlu menembakkan scanner barcode ke produk fisik; sistem seketika memasukkan produk ke keranjang dan langsung membuka jendela langkah pembayaran dengan nominal uang pas telah otomatis terpilih. Kasir tinggal menekan Enter / konfirmasi tunai / QRIS tanpa perlu klik tombol bayar manual.
- **Katalog & Pencarian Cepat**:
  - Cari instan berdasarkan nama produk atau barcode / SKU.
  - Filter cepat per kategori produk (Sembako, Makanan, Minuman, Snack, dll.).
  - Indikator badge stok langsung pada kartu barang (produk habis otomatis nonaktif).
- **Keranjang Belanja Cerdas & Barcode Aksi Cepat (Hands-Free Cashier)**:
  - Dukungan barcode perintah kasir (*Action Barcodes*):
    - `CMD-PAY` / `BAYAR`: Membuka modal pembayaran secara hands-free.
    - `CMD-CASH` / `TUNAI`: Selesaikan transaksi tunai uang pas seketika.
    - `CMD-CLEAR` / `BATAL`: Hapus dan kosongkan isi keranjang.
  - Tambah, ubah kuantitas, atau hapus item seketika.
  - Diskon per item (nominal atau persentase).
  - Penghitungan subtotal, diskon nota, dan pajak PPN otomatis.
- **Metode Pembayaran Lengkap**:
  - **Tunai (Cash)**: Dilengkapi tombol nominal uang pas dan pecahan cepat (misal Rp 10.000, Rp 50.000, Rp 100.000) serta kalkulasi uang kembalian otomatis.
  - **QRIS / E-Wallet**: Pembayaran nontunai instan (GoPay, OVO, Dana, ShopeePay).
  - **Transfer Bank**: Catatan transfer rekening.
  - **Kartu Debit / EDC**: Pembayaran gesek kartu.
- **Fitur Suara Interaktif**: Suara *beep* scanner saat barang masuk keranjang dan alunan nada koin (*chime*) saat pembayaran berhasil.
- **Opsi Pasca Transaksi**: Tombol langsung untuk mencetak struk thermal atau transaksi baru tanpa cetak.

---

## 📦 Inventaris, Generator SKU & Cetak Label Barcode Produk
Kelola ribuan SKU barang dagangan secara rapi, akurat, dan siap tempel stiker fisik:
- **🏷️ Generator Kode SKU Cerdas**:
  - Pilihan format SKU otomatis:
    - *Singkatan Kategori + Nomor Urut/Acak* (contoh: `SEM-1048`, `MIN-2091`).
    - *Standar Barcode Ritel EAN-13 (13 Digit)*: Menghasilkan barcode ritel global dengan algoritma checksum Modulo-10 standar GS1 (awalan in-store `200...`).
    - *Standar Alphanumerik* (contoh: `SKU-829104`).
    - *Numerik 8 Digit*: Format angka murni ramah scanner laser lama.
    - *Format Ringkas* (contoh: `BEV-301`).
  - **Validasi Keunikan Real-Time**: Otomatis memperingatkan kasir/admin apabila kode SKU sudah pernah digunakan oleh barang lain.
  - **Pratinjau Barcode Langsung (*Live Form Preview*)**: Barcode langsung ter-render seketika saat menambah atau mengedit produk di form modal.
- **🖨️ Cetak Label Stiker Barcode Produk (Satuan & Massal)**:
  - **Cetak Satuan**: Tombol cetak barcode langsung pada baris tabel dan kartu produk di inventaris.
  - **Cetak Massal (*Batch Label Printing*)**: Pilih beberapa produk sekaligus atau filter per kategori, lalu cetak lembaran stiker barcode dengan satu klik.
  - **Atur Kuantitas Cetak**: Opsi cetak 1 label per produk, atur kuantitas kustom, atau cetak otomatis sebanyak stok fisik produk saat ini (misal stok 15 pcs = langsung cetak 15 lembar stiker untuk ditempel ke semua produk fisik).
  - **Pilihan Kertas & Ukuran Stiker**:
    - *Stiker Thermal Roll 40mm x 30mm* (standar minimarket/UMKM).
    - *Stiker Thermal Roll 50mm x 30mm*.
    - *Kertas Thermal Kasir 58mm & 80mm*.
    - *Kertas Lembaran Stiker A4 Grid* (multi-kolom seperti Tom & Jerry / Camel).
  - **Tipe Barcode Simbologi**: Pilihan Barcode 1D (*Code 128 / EAN-13*) untuk scanner kasir laser/CCD atau *QR Code (2D)* untuk scan kamera smartphone.
  - **Kustomisasi Elemen Stiker**: Sakelar tampil/sembunyi nama toko, nama barang, harga jual (Rupiah besar & tebal), dan teks SKU.
- **Data Produk Komprehensif**: Nama barang, SKU/Barcode, Kategori, Harga Beli/HPP, Harga Jual, Stok Saat Ini, Batas Minimum Stok, dan Satuan (pcs, kg, botol, karung, dll.).
- **Manajemen Kategori Terpadu**: Tambah, ubah, dan kelola kategori produk melalui modal khusus.
- **Kalkulasi Margin Otomatis**: Menampilkan persentase selisih keuntungan (*profit margin*) dari setiap produk yang didaftarkan.
- **Riwayat Penyesuaian Stok (*Stock Adjustments*)**: Catatan mutasi stok otomatis ketika terjadi penjualan, restock/kulakan, barang rusak (*damaged*), kedaluwarsa (*expired*), atau retur.
- **Peringatan Stok Menipis**: Penandaan visual warna kuning untuk stok menipis dan merah untuk stok habis.

---

## 🧾 Riwayat & Pembatalan Transaksi (Void)
Kelola dan audit seluruh nota yang telah diterbitkan:
- **Daftar Transaksi Lengkap**: Nomor faktur transaksi unik, tanggal & waktu, nama pelanggan/walk-in, kasir yang melayani, metode pembayaran, total belanja, dan laba kotor.
- **Filter Berdasarkan Rentang Waktu**: Harian, Mingguan, Bulanan, atau rentang tanggal kustom (*Custom Date Range*).
- **Fitur Void / Pembatalan Transaksi**: Fasilitas membatalkan transaksi yang keliru disertai alasan pembatalan; stok barang otomatis dikembalikan ke inventaris.
- **Cetak Ulang Struk (*Reprint Receipt*)**: Cetak kembali nota belanja lama kapan saja.

---

## 📈 Laporan Keuangan & Grafik Forex Candlestick
Analisis keuntungan dan arus kas usaha dengan tampilan ala pasar saham/forex profesional:
- **Kartu Rangkuman Finansial**: Total Omzet, Total Laba Kotor, Rata-rata Nilai Belanja (*Basket Size*), dan Rata-rata Margin %.
- **Grafik Forex Candlestick (`StockFinancialChart`)**:
  - **Batang Lilin (*Japanese Candlesticks*)**:
    - **Bullish (Hijau `#10b981`)**: Candle naik ketika penutupan harga/omzet lebih tinggi dari pembukaan.
    - **Bearish (Merah `#f43f5e`)**: Candle turun ketika penutupan lebih rendah dari pembukaan.
    - Memiliki sumbu atas (*High*) dan sumbu bawah (*Low*) yang merepresentasikan volatilitas transaksi.
  - **Bilah Timeframe Lengkap**: Pilihan resolusi lilin `15m` (15 menit), `1H` (1 jam), `4H` (4 jam), `1D` (harian), dan `1W` (mingguan).
  - **Indikator Teknikal**:
    - Garis tren **MA(7)** (Moving Average 7 periode) warna emas.
    - Garis tren **EMA(21)** (Exponential Moving Average 21 periode) warna cyan.
    - **Volume Histogram**: Bar frekuensi jumlah nota transaksi di bagian bawah grafik.
  - **Harga Dinamis saat Grafik di-Hover (*Crosshair Cursor*)**:
    - **Sumbu Kanan Dinamis (*Right-Axis Price Tag*)**: Badge harga yang bergerak vertikal mengikuti kursor mouse dan menampilkan nilai Rupiah persis pada titik ketinggian mouse.
    - **Sumbu Bawah Dinamis**: Mengunci waktu dan tanggal candle yang sedang disorot.
    - **Forex HUD Real-Time**: Bar atas yang seketika mengabarkan data `O (Open)`, `H (High)`, `L (Low)`, `C (Close)`, `Vol`, dan persentase kenaikan/penurunan.
    - **Tooltip Mengambang**: Kartu transparan berisi detail laba kotor, persentase margin, omzet interval, dan status *Bullish/Bearish*.
  - **Opsi Mode Tampilan**: Pilihan berganti antara mode *Candlestick* atau *Garis Area*.
  - **Opsi Metrik**: Pilihan *Omzet Penjualan* atau *Nilai Tiket Transaksi*.
- **Pola Pembayaran**: Grafik persentase pembagian omzet per metode bayar (Tunai, QRIS, Transfer, Debit).
- **Peringkat Barang Terlaris Periode**: Daftar barang paling berkontribusi terhadap pendapatan pada rentang tanggal yang dipilih.

---

## ⚙️ Pengaturan Toko, Tema & Bahasa
Menu Pengaturan disajikan dalam **halaman mandiri (*Full Page*)** yang komprehensif:
- **Profil Usaha**: Nama toko, slogan/tagline, alamat lengkap, nomor telepon kontak, nama kasir default, dan catatan kaki (*footer*) struk.
- **Pengaturan Pajak PPN**: Opsi sakelar mengaktifkan/menonaktifkan pajak serta mengatur persentase tarif PPN (misal 11%).
- **Tema Visual (Dark & Light Mode)**:
  - *Light Mode*: Bersih, cerah, dan kontras tinggi untuk ruangan kasir yang terang.
  - *Dark Mode*: Elegan, minim silau mata untuk kasir malam hari atau ruang bernuansa modern.
  - *System*: Menyesuaikan otomatis dengan tema sistem operasi perangkat.
- **Pilihan Bahasa Dwibahasa**:
  - Bahasa Indonesia (ID)
  - English (EN)
- **Efek Suara Audio**: Sakelar untuk mengaktifkan atau membisukan seluruh efek suara kasir.

---

## 🖨 Desain Nota, Pratinjau Struk & Manajemen Printer
Kustomisasi tampilan nota belanja agar sesuai dengan branding toko Anda:
- **Pilihan Template Siap Pakai**:
  1. *Classic*: Gaya kasir minimarket tradisional dengan garis putus-putus.
  2. *Minimal*: Tampilan ringkas, bersih, dan hemat kertas.
  3. *Modern*: Desain elegan dengan pemisah tegas dan tata letak seimbang.
  4. *Invoice*: Format faktur formal untuk toko grosir/toko bangunan.
  5. *Cafe*: Tampilan estetik dengan badge nomor meja dan catatan pesanan.
  6. *Kustom*: Tata letak bebas yang bisa diatur sendiri dari nol.
- **Mode Kustom Tata Letak (*Custom Layout Mode*)**:
  - Pengguna dapat mengatur urutan tampilan seksi struk (Header, Informasi Transaksi, Daftar Item, Total Pembayaran, Detail Bayar, Catatan Khusus, Footer, Barcode).
  - Sembunyikan atau tampilkan seksi tertentu sesuai kebutuhan.
- **Pilihan Kertas Struk Responsif**:
  - Ukuran `58mm` (printer kasir mini / mobile Bluetooth).
  - Ukuran `80mm` (printer thermal standar kasir desktop).
  - Ukuran `100mm` (printer thermal lebar / faktur ringkas).
- **Pratinjau Langsung (*Live Receipt Preview*)**:
  - Pratinjau struk tampil secara proporsional sesuai ukuran kertas asli yang dipilih tanpa terpotong.
- **Tipografi & Gaya**:
  - Pilihan jenis font: *Monospace* (ala mesin kasir), *Sans-Serif*, atau *Serif*.
  - Pilihan kerapatan spasi: *Compact*, *Normal*, atau *Spacious*.
  - Pilihan gaya garis pemisah: *Dashed* (putus-putus), *Dotted* (titik-titik), *Solid* (garis lurus), *Double* (garis ganda), atau *None*.
  - Sakelar elemen nota: Logo toko, nomor telepon, alamat, nama kasir, nama pelanggan, barcode nomor faktur, dan harga satuan item.
- **Manajemen Perangkat Printer**:
  - Tambah daftar printer thermal (Bluetooth, USB, Network LAN/Wi-Fi, dan System Print Dialog).
  - Atur printer *Default* untuk pencetakan langsung.

---

## 🔌 Integrasi Google Stitch via MCP
KasirKu mendukung koneksi ke platform desain **Google Stitch** menggunakan protokol standar **Model Context Protocol (MCP)**:
- **File Konfigurasi**: Tersedia di [`mcp_config.json`](file:///C:/Users/eval5/antigravity/KasirKu-Real-Time-POS/mcp_config.json) dan file global [`~/.gemini/config/mcp_config.json`](file:///C:/Users/eval5/.gemini/config/mcp_config.json).
- **Keuntungan**: Coding assistant dapat langsung membaca desain UI dari proyek Google Stitch Anda, mengambil token warna/tata letak, dan mengonversikannya menjadi kode React + Tailwind CSS secara otomatis.

---

## 🚀 Panduan Memulai Cepat (Quick Start)
1. **Jalankan Aplikasi Lokal**:
   ```bash
   npm install
   npm run dev
   ```
2. **Login / Daftarkan Akun Pertama**:
   - Akun yang pertama kali didaftarkan otomatis menjadi **Owner**.
3. **Mulai Bertransaksi**:
   - Tambah produk di menu **Inventaris**, lalu buka menu **Kasir (POS)** untuk mencatat penjualan perdana Anda.
4. **Pantau Analitik**:
   - Buka menu **Dashboard** untuk melihat produk terlaris dan menu **Laporan** untuk grafik candlestick harian.

---
*Dokumentasi ini dibuat otomatis untuk KasirKu Real-Time POS — Sistem Kasir Cerdas & Analisis Keuangan Terpadu.*
