import React, { useRef, useEffect, useState } from "react";
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
  Globe,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { soundFx } from "../utils/audio";

interface LandingViewProps {
  onOpenAuth?: (mode: 'login' | 'register') => void;
  onGetStarted?: () => void;
  onSignIn?: () => void;
}

const DotMapBg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const initialWidth = parent.clientWidth || window.innerWidth || 800;
    const initialHeight = parent.clientHeight || window.innerHeight || 600;
    setDimensions({ width: initialWidth, height: initialHeight });
    canvas.width = initialWidth;
    canvas.height = initialHeight;

    const resizeObserver = new ResizeObserver((entries) => {
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
      console.warn('Landing DotMapBg observe notice:', e);
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

    let animationFrameId: number;
    let isCancelled = false;
    let angle = 0;

    const dots: { x: number; y: number; radius: number; opacity: number }[] = [];
    const gap = 30;
    for (let x = 0; x < dimensions.width; x += gap) {
      for (let y = 0; y < dimensions.height; y += gap) {
        dots.push({
          x,
          y,
          radius: 1.2,
          opacity: Math.random() * 0.4 + 0.1,
        });
      }
    }

    function animate() {
      if (isCancelled || !canvasRef.current) return;
      context.clearRect(0, 0, dimensions.width, dimensions.height);
      angle += 0.003;

      dots.forEach((dot) => {
        context.beginPath();
        const wave = Math.sin(angle + dot.x * 0.01) * 1.5;
        context.arc(dot.x, dot.y + wave, dot.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(16, 185, 129, ${dot.opacity})`;
        context.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
    </div>
  );
};

export const LandingView: React.FC<LandingViewProps> = ({ onOpenAuth, onGetStarted, onSignIn }) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

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

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Animated Background Canvas */}
      <DotMapBg />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-200">
              V
            </div>
            <span className="font-bold text-lg tracking-tight text-neutral-900">
              VarzyPos
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => handleAuth('login')}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk (Login)</span>
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAuth('register')}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm shadow-emerald-200 flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Gratis</span>
            </motion.button>
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 lg:pt-32 lg:pb-36 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Sistem Kasir Cloud Real-Time untuk UMKM & Tim Toko</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-neutral-900 max-w-4xl mx-auto leading-[1.1]"
          >
            Kelola Transaksi & Stok Toko <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Real-Time</span> Bersama Tim.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl mx-auto"
          >
            VarzyPos menghubungkan seluruh perangkat kasir dan inventaris Anda dalam satu workspace Cloud Supabase Real-Time. Bekerja serentak saat toko ramai tanpa khawatir selisih stok.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4"
          >
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAuth('register')}
              className="w-full sm:w-auto px-7 py-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Mulai Toko Gratis Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAuth('login')}
              className="w-full sm:w-auto px-7 py-4 text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sudah Punya Akun? Masuk</span>
            </motion.button>
          </motion.div>

          {/* Interactive Feature Cards Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          >
            {[
              {
                icon: Zap,
                title: 'Sinkronisasi Real-Time',
                desc: 'Kasir melayani di depan, stok berkurang seketika di semua perangkat tim dan dashboard owner tanpa refresh.',
                color: 'from-emerald-500 to-teal-600',
                bg: 'bg-emerald-50',
              },
              {
                icon: Users,
                title: 'Manajemen Tim & Hak Akses',
                desc: 'Undang kasir dan admin dengan peran serta izin fitur yang dapat dikustomisasi secara spesifik per anggota.',
                color: 'from-blue-500 to-indigo-600',
                bg: 'bg-blue-50',
              },
              {
                icon: BarChart3,
                title: 'Laporan & Analitik Omset',
                desc: 'Pantau laba kotor, produk terlaris, riwayat transaksi, hingga cetak struk penjualan profesional dengan mudah.',
                color: 'from-amber-500 to-orange-600',
                bg: 'bg-amber-50',
              },
            ].map((card, idx) => {
              const IconComp = card.icon;
              const isHovered = hoveredCard === idx;
              return (
                <motion.div
                  key={idx}
                  onHoverStart={() => setHoveredCard(idx)}
                  onHoverEnd={() => setHoveredCard(null)}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white p-7 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden group cursor-pointer"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-5 rounded-bl-full transition-transform duration-500 group-hover:scale-110`} />
                  
                  <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-5 shadow-xs`}>
                    <IconComp className="w-5 h-5 text-neutral-800" />
                  </div>
                  <h3 className="font-bold text-base text-neutral-900 mb-2">{card.title}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">{card.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-8 bg-neutral-50/80 text-center text-xs text-neutral-500 z-10 relative">
        <p>&copy; {new Date().getFullYear()} VarzyPos Real-Time POS System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingView;
