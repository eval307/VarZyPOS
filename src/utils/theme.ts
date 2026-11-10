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

export function applyTheme(theme: ThemeMode = 'light', persist: boolean = true) {
  const root = document.documentElement;
  const systemPrefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);

  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  if (persist && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('app_theme', theme);
    } catch {
      // ignore quota / access errors
    }
  }
}

export const ACCENT_PALETTES: Record<ThemeAccent, Record<string, string>> = {
  emerald: {
    '--color-emerald-50': '#f0fdfa',
    '--color-emerald-100': '#ccfbf1',
    '--color-emerald-200': '#99f6e4',
    '--color-emerald-300': '#5eead4',
    '--color-emerald-400': '#2dd4bf',
    '--color-emerald-500': '#14b8a6',
    '--color-emerald-600': '#0d9488',
    '--color-emerald-700': '#0f766e',
    '--color-emerald-800': '#115e59',
    '--color-emerald-900': '#134e4a',
    '--color-emerald-950': '#042f2e',
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
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-accent', accent);

  const palette = ACCENT_PALETTES[accent] || ACCENT_PALETTES.emerald;
  Object.entries(palette).forEach(([varName, colorVal]) => {
    root.style.setProperty(varName, colorVal);
  });

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
  const root = document.documentElement;
  root.setAttribute('data-background', bg);

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
        containerClass: 'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100',
      };
    case 'zinc':
      return {
        containerClass: 'bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100',
      };
    case 'warm':
      return {
        containerClass: 'bg-amber-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100',
      };
    case 'cool':
      return {
        containerClass: 'bg-sky-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100',
      };
    case 'mesh':
      return {
        containerClass: 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-950',
        inlineStyle: {
          backgroundImage:
            'radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.09) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(244, 63, 94, 0.06) 0px, transparent 50%)',
        },
      };
    case 'dots':
      return {
        containerClass: 'text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-950',
        inlineStyle: {
          backgroundImage:
            'radial-gradient(rgba(100, 116, 139, 0.18) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        },
      };
    case 'custom':
      if (customBgUrl && customBgUrl.trim()) {
        return {
          containerClass: 'text-neutral-900 dark:text-neutral-100 relative',
          inlineStyle: {
            backgroundImage: `url("${customBgUrl.trim()}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          },
          overlayClass: 'bg-neutral-100/90 dark:bg-neutral-950/90',
        };
      }
      return {
        containerClass: 'bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100',
      };
    case 'default':
    default:
      return {
        containerClass: 'bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100',
      };
  }
}

let listenerAttached = false;

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

  // Listen to system changes if in system mode
  if (!listenerAttached && typeof window !== 'undefined' && window.matchMedia) {
    listenerAttached = true;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = getStoredTheme();
      if (current === 'system') {
        applyTheme('system', false);
      }
    });
  }
}
