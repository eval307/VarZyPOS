import React from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
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

export const DEFAULT_EMERALD_VARS: React.CSSProperties = {
  ['--color-emerald-50' as any]: '#f0fdfa',
  ['--color-emerald-100' as any]: '#ccfbf1',
  ['--color-emerald-200' as any]: '#99f6e4',
  ['--color-emerald-300' as any]: '#5eead4',
  ['--color-emerald-400' as any]: '#2dd4bf',
  ['--color-emerald-500' as any]: '#10b981',
  ['--color-emerald-600' as any]: '#059669',
  ['--color-emerald-700' as any]: '#047857',
  ['--color-emerald-800' as any]: '#065f46',
  ['--color-emerald-900' as any]: '#064e3b',
  ['--color-emerald-950' as any]: '#022c22',
  ['--color-teal-600' as any]: '#0d9488',
  ['--color-teal-700' as any]: '#0f766e',
};

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'light';
}

export function getStoredThemeAccent(): ThemeAccent {
  try {
    const saved = localStorage.getItem('app_theme_accent');
    if (
      saved === 'emerald' ||
      saved === 'indigo' ||
      saved === 'violet' ||
      saved === 'rose' ||
      saved === 'amber' ||
      saved === 'slate'
    ) {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'emerald';
}

export function getStoredBackgroundTheme(): BackgroundTheme {
  try {
    const saved = localStorage.getItem('app_background_theme');
    if (
      saved === 'default' ||
      saved === 'slate' ||
      saved === 'zinc' ||
      saved === 'warm' ||
      saved === 'cool' ||
      saved === 'mesh' ||
      saved === 'dots' ||
      saved === 'custom'
    ) {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'default';
}

export function getStoredCustomBgUrl(): string {
  try {
    return localStorage.getItem('app_custom_bg_url') || '';
  } catch {
    return '';
  }
}

/**
 * Completely clean the global document root (html, body)
 * Guarantees Landing page, Login, and Register always render in the default light green theme.
 */
export function resetGlobalRootTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark');
  root.removeAttribute('data-theme');
  root.removeAttribute('data-accent');
  root.removeAttribute('data-background');

  const varsToClear = [
    '--color-emerald-50',
    '--color-emerald-100',
    '--color-emerald-200',
    '--color-emerald-300',
    '--color-emerald-400',
    '--color-emerald-500',
    '--color-emerald-600',
    '--color-emerald-700',
    '--color-emerald-800',
    '--color-emerald-900',
    '--color-emerald-950',
    '--color-teal-600',
    '--color-teal-700',
  ];
  varsToClear.forEach((prop) => root.style.removeProperty(prop));

  if (document.body) {
    document.body.classList.remove('dark');
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  }
}

export function applyTheme(theme: ThemeMode = 'light', persist: boolean = true) {
  const systemPrefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);

  // Apply to internal POS container if present in DOM
  const target = document.getElementById('pos-app-root');
  if (target) {
    if (isDark) {
      target.classList.add('dark');
      target.setAttribute('data-theme', 'dark');
    } else {
      target.classList.remove('dark');
      target.setAttribute('data-theme', 'light');
    }
  }

  // Ensure document.documentElement is never permanently locked in dark mode
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
  }

  if (persist && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('app_theme', theme);
    } catch {}
  }
}

export const ACCENT_PALETTES: Record<ThemeAccent, Record<string, string>> = {
  emerald: {
    '--color-emerald-50': '#f0fdfa',
    '--color-emerald-100': '#ccfbf1',
    '--color-emerald-200': '#99f6e4',
    '--color-emerald-300': '#5eead4',
    '--color-emerald-400': '#2dd4bf',
    '--color-emerald-500': '#10b981',
    '--color-emerald-600': '#059669',
    '--color-emerald-700': '#047857',
    '--color-emerald-800': '#065f46',
    '--color-emerald-900': '#064e3b',
    '--color-emerald-950': '#022c22',
    '--color-teal-600': '#0d9488',
    '--color-teal-700': '#0f766e',
  },
  indigo: {
    '--color-emerald-50': '#eef2ff',
    '--color-emerald-100': '#e0e7ff',
    '--color-emerald-200': '#c7d2fe',
    '--color-emerald-300': '#a5b4fc',
    '--color-emerald-400': '#818cf8',
    '--color-emerald-500': '#6366f1',
    '--color-emerald-600': '#4f46e5',
    '--color-emerald-700': '#4338ca',
    '--color-emerald-800': '#3730a3',
    '--color-emerald-900': '#312e81',
    '--color-emerald-950': '#1e1b4b',
    '--color-teal-600': '#4f46e5',
    '--color-teal-700': '#3730a3',
  },
  violet: {
    '--color-emerald-50': '#f5f3ff',
    '--color-emerald-100': '#ede9fe',
    '--color-emerald-200': '#ddd6fe',
    '--color-emerald-300': '#c4b5fd',
    '--color-emerald-400': '#a78bfa',
    '--color-emerald-500': '#8b5cf6',
    '--color-emerald-600': '#7c3aed',
    '--color-emerald-700': '#6d28d9',
    '--color-emerald-800': '#5b21b6',
    '--color-emerald-900': '#4c1d95',
    '--color-emerald-950': '#2e1065',
    '--color-teal-600': '#7c3aed',
    '--color-teal-700': '#5b21b6',
  },
  rose: {
    '--color-emerald-50': '#fff1f2',
    '--color-emerald-100': '#ffe4e6',
    '--color-emerald-200': '#fecdd3',
    '--color-emerald-300': '#fda4af',
    '--color-emerald-400': '#fb7185',
    '--color-emerald-500': '#f43f5e',
    '--color-emerald-600': '#e11d48',
    '--color-emerald-700': '#be123c',
    '--color-emerald-800': '#9f1239',
    '--color-emerald-900': '#881337',
    '--color-emerald-950': '#4c0519',
    '--color-teal-600': '#e11d48',
    '--color-teal-700': '#9f1239',
  },
  amber: {
    '--color-emerald-50': '#fffbeb',
    '--color-emerald-100': '#fef3c7',
    '--color-emerald-200': '#fde68a',
    '--color-emerald-300': '#fcd34d',
    '--color-emerald-400': '#fbbf24',
    '--color-emerald-500': '#f59e0b',
    '--color-emerald-600': '#d97706',
    '--color-emerald-700': '#b45309',
    '--color-emerald-800': '#92400e',
    '--color-emerald-900': '#78350f',
    '--color-emerald-950': '#451a03',
    '--color-teal-600': '#d97706',
    '--color-teal-700': '#92400e',
  },
  slate: {
    '--color-emerald-50': '#f8fafc',
    '--color-emerald-100': '#f1f5f9',
    '--color-emerald-200': '#e2e8f0',
    '--color-emerald-300': '#cbd5e1',
    '--color-emerald-400': '#94a3b8',
    '--color-emerald-500': '#64748b',
    '--color-emerald-600': '#475569',
    '--color-emerald-700': '#334155',
    '--color-emerald-800': '#1e293b',
    '--color-emerald-900': '#0f172a',
    '--color-emerald-950': '#020617',
    '--color-teal-600': '#475569',
    '--color-teal-700': '#1e293b',
  },
};

export function applyThemeAccent(accent: ThemeAccent = 'emerald', persist: boolean = true) {
  // Apply only to internal POS container if present
  const target = typeof document !== 'undefined' ? document.getElementById('pos-app-root') : null;
  if (target) {
    target.setAttribute('data-accent', accent);
    const palette = ACCENT_PALETTES[accent] || ACCENT_PALETTES.emerald;
    Object.entries(palette).forEach(([varName, colorVal]) => {
      target.style.setProperty(varName, colorVal);
    });
  }

  if (persist && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('app_theme_accent', accent);
    } catch {}
  }
}

export function applyBackgroundTheme(
  bg: BackgroundTheme = 'default',
  customUrl: string = '',
  persist: boolean = true
) {
  const target = typeof document !== 'undefined' ? document.getElementById('pos-app-root') : null;
  if (target) {
    target.setAttribute('data-background', bg);
  }

  if (persist && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('app_background_theme', bg);
      if (customUrl) {
        localStorage.setItem('app_custom_bg_url', customUrl);
      }
    } catch {}
  }
}

export function getBackgroundThemeStyles(
  bg: BackgroundTheme = 'default',
  customBgUrl: string = ''
): {
  containerClass: string;
  inlineStyle?: React.CSSProperties;
  overlayClass?: string;
} {
  switch (bg) {
    case 'slate':
      return {
        containerClass: 'bg-slate-100 text-slate-900',
      };
    case 'zinc':
      return {
        containerClass: 'bg-zinc-100 text-zinc-900',
      };
    case 'warm':
      return {
        containerClass: 'bg-amber-50/50 text-stone-900',
      };
    case 'cool':
      return {
        containerClass: 'bg-sky-50/50 text-slate-900',
      };
    case 'mesh':
      return {
        containerClass: 'text-neutral-900 bg-neutral-100',
        inlineStyle: {
          backgroundImage:
            'radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.09) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(244, 63, 94, 0.06) 0px, transparent 50%)',
        },
      };
    case 'dots':
      return {
        containerClass: 'text-neutral-900 bg-neutral-100',
        inlineStyle: {
          backgroundImage:
            'radial-gradient(rgba(100, 116, 139, 0.18) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        },
      };
    case 'custom':
      if (customBgUrl && customBgUrl.trim()) {
        return {
          containerClass: 'text-neutral-900 relative',
          inlineStyle: {
            backgroundImage: `url("${customBgUrl.trim()}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          overlayClass: 'bg-neutral-100/90',
        };
      }
      return {
        containerClass: 'bg-neutral-100 text-neutral-900',
      };
    case 'default':
    default:
      return {
        containerClass: 'bg-neutral-100 text-neutral-900',
      };
  }
}

export function initTheme(
  savedTheme?: ThemeMode,
  savedAccent?: ThemeAccent,
  savedBg?: BackgroundTheme,
  savedCustomBg?: string
) {
  const effectiveTheme = savedTheme || getStoredTheme();
  const effectiveAccent = savedAccent || getStoredThemeAccent();
  const effectiveBg = savedBg || getStoredBackgroundTheme();
  const effectiveCustomBg = savedCustomBg || getStoredCustomBgUrl();

  applyTheme(effectiveTheme, true);
  applyThemeAccent(effectiveAccent, true);
  applyBackgroundTheme(effectiveBg, effectiveCustomBg, true);
}