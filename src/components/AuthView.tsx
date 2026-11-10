import React, { useRef, useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, ArrowRight, Store, LogIn, UserPlus, Sparkles, ExternalLink, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../supabase/supabaseAuthContext";
import { soundFx } from "../utils/audio";

const cn = (...classes: string[]) => {
  return classes.filter(Boolean).join(" ");
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}

const Button = ({ 
  children, 
  variant = "default", 
  className = "", 
  ...props 
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
  
  const variantStyles = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    outline: "border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800"
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input = ({ className = "", ...props }: InputProps) => {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

type RoutePoint = {
  x: number;
  y: number;
  delay: number;
};

const DotMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const routes: { start: RoutePoint; end: RoutePoint; color: string }[] = [
    {
      start: { x: 100, y: 150, delay: 0 },
      end: { x: 200, y: 80, delay: 2 },
      color: "#059669",
    },
    {
      start: { x: 200, y: 80, delay: 2 },
      end: { x: 260, y: 120, delay: 4 },
      color: "#059669",
    },
    {
      start: { x: 50, y: 50, delay: 1 },
      end: { x: 150, y: 180, delay: 3 },
      color: "#059669",
    },
    {
      start: { x: 280, y: 60, delay: 0.5 },
      end: { x: 180, y: 180, delay: 2.5 },
      color: "#059669",
    },
  ];

  const generateDots = (width: number, height: number) => {
    const dots = [];
    const gap = 12;
    const dotRadius = 1;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const isInMapShape =
          ((x < width * 0.25 && x > width * 0.05) && (y < height * 0.4 && y > height * 0.1)) ||
          ((x < width * 0.25 && x > width * 0.15) && (y < height * 0.8 && y > height * 0.4)) ||
          ((x < width * 0.45 && x > width * 0.3) && (y < height * 0.35 && y > height * 0.15)) ||
          ((x < width * 0.5 && x > width * 0.35) && (y < height * 0.65 && y > height * 0.35)) ||
          ((x < width * 0.7 && x > width * 0.45) && (y < height * 0.5 && y > height * 0.1)) ||
          ((x < width * 0.8 && x > width * 0.65) && (y < height * 0.8 && y > height * 0.6));

        if (isInMapShape && Math.random() > 0.3) {
          dots.push({
            x,
            y,
            radius: dotRadius,
            opacity: Math.random() * 0.5 + 0.2,
          });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const initialWidth = parent.clientWidth || 400;
    const initialHeight = parent.clientHeight || 600;
    setDimensions({ width: initialWidth, height: initialHeight });
    canvas.width = initialWidth;
    canvas.height = initialHeight;

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      setDimensions({ width: rect.width, height: rect.height });
      if (canvasRef.current) {
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    });

    try {
      resizeObserver.observe(parent);
    } catch (e) {
      console.warn('Auth DotMap observe notice:', e);
    }

    return () => {
      try {
        resizeObserver.disconnect();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context = ctx;

    const dots = generateDots(dimensions.width, dimensions.height);
    let animationFrameId: number;
    let isCancelled = false;
    let startTime = Date.now();

    function drawDots() {
      context.clearRect(0, 0, dimensions.width, dimensions.height);
      dots.forEach(dot => {
        context.beginPath();
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(5, 150, 105, ${dot.opacity})`;
        context.fill();
      });
    }

    function drawRoutes() {
      const currentTime = (Date.now() - startTime) / 1000;
      
      routes.forEach(route => {
        const elapsed = currentTime - route.start.delay;
        if (elapsed <= 0) return;
        
        const duration = 3;
        const progress = Math.min(elapsed / duration, 1);
        
        const x = route.start.x + (route.end.x - route.start.x) * progress;
        const y = route.start.y + (route.end.y - route.start.y) * progress;
        
        context.beginPath();
        context.moveTo(route.start.x, route.start.y);
        context.lineTo(x, y);
        context.strokeStyle = route.color;
        context.lineWidth = 1.5;
        context.stroke();
        
        context.beginPath();
        context.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
        context.fillStyle = route.color;
        context.fill();
        
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fillStyle = "#10b981";
        context.fill();
        
        context.beginPath();
        context.arc(x, y, 6, 0, Math.PI * 2);
        context.fillStyle = "rgba(16, 185, 129, 0.4)";
        context.fill();
        
        if (progress === 1) {
          context.beginPath();
          context.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
          context.fillStyle = route.color;
          context.fill();
        }
      });
    }
    
    function animate() {
      if (isCancelled || !canvasRef.current) return;
      drawDots();
      drawRoutes();
      
      const currentTime = (Date.now() - startTime) / 1000;
      if (currentTime > 15) {
        startTime = Date.now();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    }
    
    animate();

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
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
  const {
    signInWithGoogle,
    signInWithEmail,
    sendPasswordReset,
    registerWithEmail,
    error,
    clearError,
    sessionExpired,
  } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(initialMode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const isOperationNotAllowed =
    error &&
    (error.includes('operation-not-allowed') ||
      error.includes('belum diaktifkan') ||
      error.includes('provider is not enabled') ||
      error.includes('validation_failed'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    soundFx.playTap();

    try {
      if (tab === 'login') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(name, email, password);
      }
    } catch {
      // Handled in authContext
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
      setResetMessage(`Tautan atur ulang kata sandi telah dikirim ke "${email.trim()}". Buka kotak masuk email Anda dan klik tautan untuk membuat kata sandi baru.`);
    } catch {
      // The authentication context exposes the error to the form.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4 relative">
      {onBackToLanding && (
        <div className="absolute top-4 left-4 sm:left-8 z-20">
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white px-3 py-1.5 rounded-lg border border-neutral-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>&larr; Kembali ke Beranda</span>
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl overflow-hidden rounded-2xl flex bg-white shadow-xl"
      >
        {/* Left side - Animated Dot Map */}
        <div className="hidden md:block w-1/2 h-[620px] relative overflow-hidden border-r border-neutral-100">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-100">
            <DotMap />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 text-center">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mb-6"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200 text-white font-bold text-xl">
                  V
                </div>
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600"
              >
                VarzyPos Real-Time
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="text-xs text-neutral-600 max-w-xs leading-relaxed"
              >
                Sinkronisasi kasir dan inventaris toko real-time ke seluruh anggota tim dalam satu akun workspace.
              </motion.p>
            </div>
          </div>
        </div>
        
        {/* Right side - Form */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-white max-h-[620px] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">
                {tab === 'login' ? 'Selamat Datang' : 'Buat Akun Toko'}
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                {tab === 'login' ? 'Masuk ke dashboard kasir toko Anda' : 'Daftarkan workspace toko baru Anda'}
              </p>
            </div>

                {/* Segmented Tab */}
                <div className="flex p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playTap();
                      setTab('login');
                      clearError();
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      tab === 'login'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playTap();
                      setTab('register');
                      clearError();
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      tab === 'register'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Daftar</span>
                  </button>
                </div>

                {/* Google Sign-in button */}
                <div>
                  <button 
                    type="button"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-neutral-200 rounded-lg p-2.5 hover:bg-neutral-50 transition-all text-xs font-semibold text-neutral-700 shadow-2xs cursor-pointer"
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
                    <span>Lanjutkan dengan Google</span>
                  </button>
                </div>
                
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-neutral-400">atau dengan email & password</span>
                  </div>
                </div>

                {/* 5-hour Session Expiry Notice */}
                {sessionExpired && (
                  <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl flex items-start gap-2.5 shadow-2xs">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Sesi Login Berakhir (5 Jam)</p>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        Sesi Anda telah kedaluwarsa karena tidak ada aktivitas selama lebih dari 5 jam demi keamanan data kasir dan toko. Silakan masuk kembali.
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
                          Provider Google perlu diaktifkan di Supabase Dashboard (Authentication → Providers → Google). Untuk saat ini, silakan langsung masuk atau mendaftar menggunakan formulir <strong>Email & Password</strong> di bawah.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && !isOperationNotAllowed && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{error}</span>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-3">
                  {tab === 'register' && (
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-neutral-700 mb-1">
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
                    <label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1">
                      {tab === 'login' ? 'Email atau Username' : 'Email'} <span className="text-emerald-600">*</span>
                    </label>
                    <Input
                      id="email"
                      type={tab === 'login' ? 'text' : 'email'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        tab === 'login'
                          ? 'Masukkan email atau username akun (contoh: kasir1)'
                          : 'Masukkan alamat email akun'
                      }
                      autoComplete={tab === 'login' ? 'username' : 'email'}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Kata Sandi <span className="text-emerald-600">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={isPasswordVisible ? "text" : "password"}
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
                        className="mt-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50 cursor-pointer"
                      >
                        Lupa password? Kirim tautan reset ke email
                      </button>
                    )}
                  </div>
                  {resetMessage && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200" role="status">
                      {resetMessage}
                    </p>
                  )}
                  
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onHoverStart={() => setIsHovered(true)}
                    onHoverEnd={() => setIsHovered(false)}
                    className="pt-2"
                  >
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full bg-gradient-to-r relative overflow-hidden from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2 rounded-lg transition-all duration-300 font-semibold text-xs",
                        isHovered ? "shadow-md shadow-emerald-200" : ""
                      )}
                    >
                      <span className="flex items-center justify-center">
                        {tab === 'login' ? 'Masuk ke Akun' : 'Daftar Akun Baru'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                      {isHovered && (
                        <motion.span
                          initial={{ left: "-100%" }}
                          animate={{ left: "100%" }}
                          transition={{ duration: 1, ease: "easeInOut" }}
                          className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          style={{ filter: "blur(8px)" }}
                        />
                      )}
                    </Button>
                  </motion.div>
                  
                </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthView;
