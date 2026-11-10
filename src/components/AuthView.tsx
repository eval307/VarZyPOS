import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Store,
  LogIn,
  UserPlus,
  Sparkles,
  ExternalLink,
  Clock,
  Moon,
  Sun,
  Palette,
  CheckCircle2,
  Zap,
  Users,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../supabase/supabaseAuthContext';
import { soundFx } from '../utils/audio';
import {
  applyTheme,
  applyThemeAccent,
  getStoredTheme,
  getStoredThemeAccent,
  ThemeAccent,
  ThemeMode,
} from '../utils/theme';

const cn = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
}

const Button = ({
  children,
  variant = 'default',
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

  const variantStyles = {
    default:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 active:scale-95',
    outline:
      'border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200',
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input = ({ className = '', ...props }: InputProps) => {
  return (
    <input
      className={`flex h-10 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`}
      {...props}
    />
  );
};

interface AuthViewProps {
  initialMode?: 'login' | 'register';
  onBackToLanding?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onBackToLanding,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Theme & Accent state for AuthView
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [currentAccent, setCurrentAccent] = useState<ThemeAccent>(() => getStoredThemeAccent());

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

  const accentOptions: { id: ThemeAccent; label: string; colorClass: string }[] = [
    { id: 'emerald', label: 'Emerald Mint', colorClass: 'bg-emerald-500' },
    { id: 'indigo', label: 'Ocean Indigo', colorClass: 'bg-indigo-500' },
    { id: 'violet', label: 'Royal Violet', colorClass: 'bg-violet-500' },
    { id: 'rose', label: 'Rose Pink', colorClass: 'bg-rose-500' },
    { id: 'amber', label: 'Sunset Amber', colorClass: 'bg-amber-500' },
    { id: 'slate', label: 'Monochrome Slate', colorClass: 'bg-slate-500' },
  ];

  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    error,
    clearError,
    sessionExpired,
  } = useAuth();

  const isOperationNotAllowed =
    error?.toLowerCase().includes('operation not allowed') ||
    error?.toLowerCase().includes('provider is not enabled') ||
    error?.toLowerCase().includes('configuration') ||
    error?.toLowerCase().includes('unauthorized client');

  useEffect(() => {
    setTab(initialMode);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResetMessage(null);
    setIsSubmitting(true);
    soundFx.playTap();

    try {
      if (tab === 'login') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(name, email, password);
      }
    } catch {
      soundFx.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setIsSubmitting(true);
    soundFx.playTap();
    try {
      await signInWithGoogle();
    } catch {
      // Handled in authContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    clearError();
    setResetMessage(null);
    if (!email.trim()) {
      setResetMessage('Ketikkan alamat email Anda pada kolom formulir di atas terlebih dahulu.');
      soundFx.playError();
      return;
    }
    setIsSubmitting(true);
    soundFx.playTap();
    try {
      await sendPasswordReset(email);
      setResetMessage(
        `Tautan atur ulang kata sandi telah dikirim ke "${email.trim()}". Buka kotak masuk email Anda dan klik tautan untuk membuat kata sandi baru.`
      );
    } catch {
      // Handled in authContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4 relative transition-colors duration-300 selection:bg-emerald-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Left: Back to Landing button */}
      {onBackToLanding && (
        <div className="absolute top-4 left-4 sm:left-8 z-20">
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-850 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-750 shadow-2xs hover:shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>&larr; Kembali ke Beranda</span>
          </button>
        </div>
      )}

      {/* Top Right: Theme & Accent Controls */}
      <div className="absolute top-4 right-4 sm:right-8 z-20 flex items-center gap-2">
        {/* Accent Palette Picker */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white dark:bg-neutral-850 rounded-xl border border-neutral-200 dark:border-neutral-750 shadow-2xs">
          <Palette className="w-3.5 h-3.5 text-neutral-400 mr-0.5" />
          {accentOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => changeAccent(opt.id)}
              className={`w-3.5 h-3.5 rounded-full ${opt.colorClass} transition-transform ${
                currentAccent === opt.id
                  ? 'scale-125 ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-neutral-900'
                  : 'hover:scale-110 opacity-70 hover:opacity-100'
              }`}
              title={`Ganti Aksen: ${opt.label}`}
            />
          ))}
        </div>

        {/* Dark/Light Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-750 border border-neutral-200 dark:border-neutral-750 rounded-xl transition-all shadow-2xs cursor-pointer"
          title={currentTheme === 'dark' ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap'}
          aria-label="Toggle Theme"
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-neutral-600" />
          )}
        </button>
      </div>

      {/* Main Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl overflow-hidden rounded-3xl flex bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xl transition-colors duration-300"
      >
        {/* Left Side: Brand Visual Showcase */}
        <div className="hidden md:flex w-1/2 p-8 flex-col justify-between relative overflow-hidden border-r border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-850/60">
          {/* Top Brand Tag */}
          <div>
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
                V
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-neutral-900 dark:text-white block leading-none">
                  VarzyPos
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                  Cloud POS System
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-3">
              Solusi Kasir &amp; Inventaris Real-Time untuk Bisnis Anda
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
              Satu akun terintegrasi untuk seluruh perangkat kasir, scanner barcode, manajemen tim toko, dan laporan omset otomatis.
            </p>

            {/* Feature Highlights List */}
            <div className="space-y-2.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/70">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Transaksi Kasir Cepat &lt; 1 Detik</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/70">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Multi-Kasir dengan Izin Akses Spesifik</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/70">
                <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Cetak Struk Thermal 58mm &amp; 80mm</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/70">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Data Cloud Supabase Terenkripsi &amp; Terisolasi</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
            <span>&copy; {new Date().getFullYear()} VarzyPos</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Sesi Terenkripsi
            </span>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-white dark:bg-neutral-900 transition-colors duration-300 max-h-[640px] overflow-y-auto">
          <div className="space-y-4">
            {/* Header Titles */}
            <div>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                {tab === 'login' ? 'Selamat Datang' : 'Buat Toko Baru'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {tab === 'login'
                  ? 'Masuk ke dashboard kasir atau akun pemilik toko Anda'
                  : 'Daftarkan workspace toko baru Anda — 100% gratis'}
              </p>
            </div>

            {/* Segmented Tab */}
            <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-bold border border-neutral-200/60 dark:border-neutral-700/60">
              <button
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setTab('login');
                  clearError();
                }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Masuk (Login)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setTab('register');
                  clearError();
                }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'register'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Daftar Akun</span>
              </button>
            </div>

            {/* Google Sign-in button */}
            <div>
              <button
                type="button"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-all text-xs font-bold text-neutral-700 dark:text-neutral-200 shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                onClick={handleGoogleSignIn}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Lanjutkan dengan Akun Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2.5 bg-white dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 font-medium">
                  atau dengan email &amp; kata sandi
                </span>
              </div>
            </div>

            {/* 5-hour Session Expiry Notice */}
            {sessionExpired && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-xl flex items-start gap-2.5 shadow-2xs">
                <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Sesi Login Berakhir (5 Jam)</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                    Sesi Anda telah kedaluwarsa demi keamanan data kasir. Silakan masuk kembali.
                  </p>
                </div>
              </div>
            )}

            {/* Error / Provider not enabled banner */}
            {isOperationNotAllowed && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-xl space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Provider Google Belum Diaktifkan di Supabase</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                      Provider Google perlu diaktifkan di Supabase Dashboard (Authentication → Providers → Google).
                      Silakan masuk menggunakan formulir <strong>Email &amp; Kata Sandi</strong> di bawah.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && !isOperationNotAllowed && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {tab === 'register' && (
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Nama Pemilik / Toko <span className="text-emerald-600 dark:text-emerald-400">*</span>
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    required
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {tab === 'login' ? 'Email atau Username Kasir' : 'Email Akun'}{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </label>
                <Input
                  id="email"
                  type={tab === 'login' ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    tab === 'login'
                      ? 'Masukkan email atau username (contoh: kasir1)'
                      : 'Masukkan alamat email Anda'
                  }
                  autoComplete={tab === 'login' ? 'username' : 'email'}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Kata Sandi <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {tab === 'login' && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handlePasswordReset}
                    className="mt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    Lupa password? Kirim tautan reset ke email
                  </button>
                )}
              </div>

              {resetMessage && (
                <p
                  className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800"
                  role="status"
                >
                  {resetMessage}
                </p>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{tab === 'login' ? 'Masuk ke Dashboard' : 'Buat Akun Toko Sekarang'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthView;
