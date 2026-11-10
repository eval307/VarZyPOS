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
  Clock,
  CheckCircle2,
  Zap,
  Users,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../supabase/supabaseAuthContext';
import { soundFx } from '../utils/audio';
import { DEFAULT_EMERALD_VARS } from '../utils/theme';

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
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

  const variantStyles = {
    default:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 active:scale-95',
    outline:
      'border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800',
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
      className={`flex h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`}
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

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
    <div
      className="public-theme-locked min-h-screen w-full flex items-center justify-center bg-neutral-50 p-4 relative selection:bg-emerald-500 selection:text-white"
      style={DEFAULT_EMERALD_VARS}
    >
      {/* Decorative Glow (Fixed Default Emerald Green) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-gradient-to-b from-emerald-100/70 via-emerald-50/40 to-transparent blur-3xl pointer-events-none" />

      {/* Top Left: Back to Landing button */}
      {onBackToLanding && (
        <div className="absolute top-4 left-4 sm:left-8 z-20">
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-50 px-3.5 py-2 rounded-xl border border-neutral-200 shadow-2xs hover:shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>&larr; Kembali ke Beranda</span>
          </button>
        </div>
      )}

      {/* Main Modal Card (Clean Light Emerald Theme) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl overflow-hidden rounded-3xl flex bg-white border border-neutral-200/90 shadow-2xl relative z-10"
      >
        {/* Left Side: Brand Visual Showcase */}
        <div className="hidden md:flex w-1/2 p-8 flex-col justify-between relative overflow-hidden border-r border-neutral-200/80 bg-neutral-100/60">
          {/* Top Brand Tag */}
          <div>
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
                V
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-neutral-900 block leading-none">
                  VarzyPos
                </span>
                <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">
                  Cloud POS System
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight mb-3">
              Solusi Kasir &amp; Inventaris Real-Time untuk Bisnis Anda
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              Satu akun terintegrasi untuk seluruh perangkat kasir, scanner barcode, manajemen tim toko, dan laporan omset otomatis.
            </p>

            {/* Feature Highlights List */}
            <div className="space-y-2.5 text-xs font-semibold text-neutral-700">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 border border-neutral-200/70 shadow-2xs">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Transaksi Kasir Cepat &lt; 1 Detik</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 border border-neutral-200/70 shadow-2xs">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Multi-Kasir dengan Izin Akses Spesifik</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 border border-neutral-200/70 shadow-2xs">
                <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cetak Struk Thermal 58mm &amp; 80mm</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 border border-neutral-200/70 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Data Cloud Supabase Terenkripsi &amp; Terisolasi</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="pt-6 border-t border-neutral-200 text-[11px] text-neutral-500 flex items-center justify-between">
            <span>&copy; {new Date().getFullYear()} VarzyPos</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Sesi Terenkripsi
            </span>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-white max-h-[640px] overflow-y-auto">
          <div className="space-y-4">
            {/* Header Titles */}
            <div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                {tab === 'login' ? 'Selamat Datang' : 'Buat Toko Baru'}
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                {tab === 'login'
                  ? 'Masuk ke dashboard kasir atau akun pemilik toko Anda'
                  : 'Daftarkan workspace toko baru Anda — 100% gratis'}
              </p>
            </div>

            {/* Segmented Tab */}
            <div className="flex p-1 bg-neutral-100 rounded-xl text-xs font-bold border border-neutral-200/60">
              <button
                type="button"
                onClick={() => {
                  soundFx.playTap();
                  setTab('login');
                  clearError();
                }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
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
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Daftar Akun</span>
              </button>
            </div>

            {/* Google Sign-in button */}
            <div>
              <button
                type="button"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-white border border-neutral-200 rounded-xl p-2.5 hover:bg-neutral-50 transition-all text-xs font-bold text-neutral-700 shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
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
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2.5 bg-white text-neutral-400 font-medium">
                  atau dengan email &amp; kata sandi
                </span>
              </div>
            </div>

            {/* 5-hour Session Expiry Notice */}
            {sessionExpired && (
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl flex items-start gap-2.5 shadow-2xs">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Sesi Login Berakhir (5 Jam)</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Sesi Anda telah kedaluwarsa demi keamanan data kasir. Silakan masuk kembali.
                  </p>
                </div>
              </div>
            )}

            {/* Error / Provider not enabled banner */}
            {isOperationNotAllowed && (
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Provider Google Belum Diaktifkan di Supabase</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Provider Google perlu diaktifkan di Supabase Dashboard (Authentication &rarr; Providers &rarr; Google).
                      Silakan masuk menggunakan formulir <strong>Email &amp; Kata Sandi</strong> di bawah.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && !isOperationNotAllowed && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {tab === 'register' && (
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-bold text-neutral-700 mb-1"
                  >
                    Nama Pemilik / Toko <span className="text-emerald-600">*</span>
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
                  className="block text-xs font-bold text-neutral-700 mb-1"
                >
                  {tab === 'login' ? 'Email atau Username Kasir' : 'Email Akun'}{' '}
                  <span className="text-emerald-600">*</span>
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
                  className="block text-xs font-bold text-neutral-700 mb-1"
                >
                  Kata Sandi <span className="text-emerald-600">*</span>
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
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
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
                    className="mt-1.5 text-xs font-bold text-emerald-600 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    Lupa password? Kirim tautan reset ke email
                  </button>
                )}
              </div>

              {resetMessage && (
                <p
                  className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200"
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