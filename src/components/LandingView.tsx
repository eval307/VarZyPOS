import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Zap,
  Users,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  LogIn,
  UserPlus,
  Store,
  Smartphone,
  Printer,
  Calculator,
  ScanBarcode,
  Moon,
  Sun,
  Palette,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import {
  applyTheme,
  applyThemeAccent,
  getStoredTheme,
  getStoredThemeAccent,
  ThemeAccent,
  ThemeMode,
} from '../utils/theme';

interface LandingViewProps {
  onOpenAuth?: (mode: 'login' | 'register') => void;
  onGetStarted?: () => void;
  onSignIn?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenAuth,
  onGetStarted,
  onSignIn,
}) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [currentAccent, setCurrentAccent] = useState<ThemeAccent>(() => getStoredThemeAccent());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Synchronize theme on load
  useEffect(() => {
    applyTheme(currentTheme, true);
    applyThemeAccent(currentAccent, true);
  }, [currentTheme, currentAccent]);

  const toggleTheme = () => {
    soundFx.playTap();
    const next: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(next);
    applyTheme(next, true);
  };

  const changeAccent = (accent: ThemeAccent) => {
    soundFx.playTap();
    setCurrentAccent(accent);
    applyThemeAccent(accent, true);
  };

  const handleAuth = (mode: 'login' | 'register') => {
    soundFx.playTap();
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else if (mode === 'register' && onGetStarted) {
      onGetStarted();
    } else if (mode === 'login' && onSignIn) {
      onSignIn();
    }
  };

  const accentOptions: { id: ThemeAccent; label: string; colorClass: string }[] = [
    { id: 'emerald', label: 'Emerald Mint', colorClass: 'bg-emerald-500' },
    { id: 'indigo', label: 'Ocean Indigo', colorClass: 'bg-indigo-500' },
    { id: 'violet', label: 'Royal Violet', colorClass: 'bg-violet-500' },
    { id: 'rose', label: 'Rose Pink', colorClass: 'bg-rose-500' },
    { id: 'amber', label: 'Sunset Amber', colorClass: 'bg-amber-500' },
    { id: 'slate', label: 'Monochrome Slate', colorClass: 'bg-slate-500' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-300 relative overflow-hidden">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-96 left-10 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              V
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-neutral-900 dark:text-white block leading-none">
                VarzyPos
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                Cloud Retail POS
              </span>
            </div>
          </div>

          {/* Controls & Auth Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Accent Selector on Landing */}
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80">
              <Palette className="w-3.5 h-3.5 text-neutral-400 mr-1" />
              {accentOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => changeAccent(opt.id)}
                  className={`w-4 h-4 rounded-full ${opt.colorClass} transition-transform ${
                    currentAccent === opt.id
                      ? 'scale-125 ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-neutral-900'
                      : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  title={`Ganti Aksen: ${opt.label}`}
                />
              ))}
            </div>

            {/* Dark/Light Mode Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-all shadow-2xs cursor-pointer"
              title={currentTheme === 'dark' ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap'}
              aria-label="Toggle Theme"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600" />
              )}
            </button>

            {/* Login Button */}
            <button
              type="button"
              onClick={() => handleAuth('login')}
              className="px-3.5 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Masuk</span>
            </button>

            {/* Register Button */}
            <button
              type="button"
              onClick={() => handleAuth('register')}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Gratis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-2xs mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>Sistem Kasir Cloud Real-Time Generasi Baru</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 dark:text-white max-w-4xl mx-auto leading-[1.15] mb-5">
          Kelola Transaksi, Stok & Tim Toko{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
            Real-Time Bersama.
          </span>
        </h1>

        {/* Hero Description */}
        <p className="text-sm sm:text-base lg:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed mb-8">
          VarzyPos menghubungkan seluruh perangkat kasir, tablet, dan smartphone Anda dalam satu ekosistem Cloud
          Supabase. Bekerja serentak saat toko ramai tanpa selisih stok dan repot rekap data.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-12">
          <button
            type="button"
            onClick={() => handleAuth('register')}
            className="w-full sm:w-auto px-7 py-3.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Mulai Toko Gratis Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleAuth('login')}
            className="w-full sm:w-auto px-7 py-3.5 text-sm font-bold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <LogIn className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>Sudah Punya Akun? Masuk</span>
          </button>
        </div>

        {/* Trust Badges Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 border-t border-neutral-200/60 dark:border-neutral-800/80 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-neutral-100/50 dark:bg-neutral-900/50">
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Transaksi &lt; 1 Detik</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-neutral-100/50 dark:bg-neutral-900/50">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Multi-Kasir Terisolasi</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-neutral-100/50 dark:bg-neutral-900/50">
            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Struk 58mm & 80mm</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-neutral-100/50 dark:bg-neutral-900/50">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Cloud Supabase Aman</span>
          </div>
        </div>

        {/* Live Visual POS Interface Mockup */}
        <div className="mt-14 max-w-4xl mx-auto rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-4 sm:p-6 text-left relative overflow-hidden group">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-2 text-xs font-bold text-neutral-500 dark:text-neutral-400">
                VarzyPos • Antarmuka Kasir POS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Sync Online
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* Catalog Preview */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                <span>Daftar Menu / Produk Populer</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                  Kategori: Kopi & Makanan
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Kopi Susu Gula Aren', price: 'Rp 18.000', cat: 'Minuman' },
                  { name: 'Croissant Cokelat', price: 'Rp 22.000', cat: 'Pastry' },
                  { name: 'Matcha Latte Ice', price: 'Rp 24.000', cat: 'Minuman' },
                  { name: 'Toast Roti Bakar', price: 'Rp 15.000', cat: 'Makanan' },
                  { name: 'Americano Double', price: 'Rp 16.000', cat: 'Minuman' },
                  { name: 'Kentang Goreng Keju', price: 'Rp 20.000', cat: 'Snack' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 hover:border-emerald-500/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      {item.cat}
                    </div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300 mt-1">
                      {item.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Bill Preview */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                  <span>Keranjang Aktif</span>
                  <span className="text-[10px] text-neutral-400 font-mono">#ORD-9021</span>
                </div>
                <div className="py-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                    <span className="truncate">2x Kopi Susu Aren</span>
                    <span className="font-mono font-semibold">Rp 36.000</span>
                  </div>
                  <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                    <span className="truncate">1x Croissant Cokelat</span>
                    <span className="font-mono font-semibold">Rp 22.000</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Subtotal</span>
                  <span className="font-mono">Rp 58.000</span>
                </div>
                <div className="flex justify-between text-sm font-black text-neutral-900 dark:text-white">
                  <span>Total Tagihan</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">Rp 58.000</span>
                </div>
                <div className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold text-center shadow-xs mt-1">
                  Bayar Tunai / QRIS (Selesai)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-16 bg-white dark:bg-neutral-900 border-t border-neutral-200/80 dark:border-neutral-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
              Fitur Lengkap Toko Ritel & UMKM
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              Semua yang Anda Butuhkan untuk Operasional Kasir Modern
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: 'Sinkronisasi Real-Time',
                desc: 'Kasir di depan melayani pelanggan, stok barang langsung berkurang di semua perangkat tim dan dashboard owner tanpa refresh.',
              },
              {
                icon: ScanBarcode,
                title: 'Scanner Barcode & Generator SKU',
                desc: 'Cari produk secara instan menggunakan barcode scanner fisik atau kamera smartphone, serta buat kode SKU unik otomatis.',
              },
              {
                icon: Users,
                title: 'Manajemen Tim & Hak Akses',
                desc: 'Undang kasir dan staf dengan peran tersendiri. Hak akses menu stok, laporan, dan pengaturan toko dapat diisolasi penuh.',
              },
              {
                icon: Printer,
                title: 'Cetak Struk Thermal 58mm & 80mm',
                desc: 'Cetak nota penjualan ke printer thermal Bluetooth/USB dengan format rapi, logo toko, QRIS, dan catatan khusus.',
              },
              {
                icon: Calculator,
                title: 'Kalkulator Kasir Mengambang',
                desc: 'Popup kalkulator praktis di pojok kanan bawah dengan pecahan rupiah instan (+10rb, +20rb, +50rb, +100rb) dan tombol triple zero.',
              },
              {
                icon: BarChart3,
                title: 'Laporan Laba & Analitik Finansial',
                desc: 'Pantau grafik omset harian, laba kotor, produk terlaris, serta radar metode pembayaran untuk evaluasi bisnis yang akurat.',
              },
            ].map((f, idx) => {
              const IconComp = f.icon;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredCard(idx)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200/90 dark:border-neutral-800 transition-all duration-200 cursor-pointer ${
                    hoveredCard === idx
                      ? 'shadow-lg border-emerald-500/50 -translate-y-1'
                      : 'hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-2xs">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
                    {f.title}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-2xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              Mulai Toko Digital Anda Hari Ini
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              Daftar akun pemilik toko secara instan, undang staf kasir Anda, dan nikmati sistem kasir terintegrasi tanpa instalasi rumit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAuth('register')}
            className="px-8 py-4 rounded-xl bg-white text-emerald-800 font-bold text-sm shadow-xl hover:bg-neutral-100 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>Daftar Akun Toko Gratis</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950 text-center text-xs text-neutral-500 dark:text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              V
            </div>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">VarzyPos</span>
            <span>&copy; {new Date().getFullYear()} Sistem Kasir &amp; Stok Real-Time</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleAuth('login')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
            >
              Masuk Kasir
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => handleAuth('register')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
            >
              Buat Toko Baru
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
