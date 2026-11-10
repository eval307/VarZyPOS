/**
 * Avatar & Profile Utility
 * Provides automatic email profile resolution (Google/Gravatar/Unavatar),
 * curated avatar presets, and client-side image compression for user profiles.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
  category: 'business' | 'character' | 'modern';
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'avatar-1',
    name: 'Kasir Profesional',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    category: 'business',
  },
  {
    id: 'avatar-2',
    name: 'Staff Kasir Pria',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    category: 'business',
  },
  {
    id: 'avatar-3',
    name: 'Store Manager',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    category: 'business',
  },
  {
    id: 'avatar-4',
    name: 'Staff Toko Modern',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    category: 'business',
  },
  {
    id: 'avatar-5',
    name: 'Barista / F&B',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    category: 'modern',
  },
  {
    id: 'avatar-6',
    name: 'Chef / Dapur',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    category: 'modern',
  },
  {
    id: 'avatar-7',
    name: 'Karakter Biru',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BlueBot&backgroundColor=0284c7',
    category: 'character',
  },
  {
    id: 'avatar-8',
    name: 'Karakter Hijau',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GreenBot&backgroundColor=059669',
    category: 'character',
  },
  {
    id: 'avatar-9',
    name: 'Karakter Ungu',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PurpleBot&backgroundColor=7c3aed',
    category: 'character',
  },
  {
    id: 'avatar-10',
    name: 'Karakter Emas',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GoldBot&backgroundColor=d97706',
    category: 'character',
  },
  {
    id: 'avatar-11',
    name: 'Avatar Minimalis A',
    url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Alex&backgroundColor=bbf7d0',
    category: 'modern',
  },
  {
    id: 'avatar-12',
    name: 'Avatar Minimalis B',
    url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Sam&backgroundColor=fed7aa',
    category: 'modern',
  },
];

/**
 * Resolves avatar image for an email.
 * 1. If explicit custom avatar (uploaded Base64 or custom URL) is present, use it.
 * 2. If email is provided, resolves via unavatar.io which automatically syncs Google OAuth profile,
 *    Gravatar, and other social accounts linked to the email.
 * 3. Falls back to DiceBear SVG initials avatar with consistent seed color.
 */
export function getAvatarUrl(options: {
  email?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
}): string {
  const { email, avatarUrl, name } = options;

  // 1. Explicit avatar chosen by user
  if (avatarUrl && avatarUrl.trim().length > 0) {
    return avatarUrl.trim();
  }

  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  // 2. Email-based avatar (Google / Gravatar / Social Profile)
  if (cleanEmail && cleanEmail.includes('@')) {
    const fallbackSeed = encodeURIComponent(cleanName || cleanEmail.split('@')[0]);
    const dicebearFallback = encodeURIComponent(
      `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackSeed}&radius=50`
    );
    return `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=${dicebearFallback}`;
  }

  // 3. Fallback to Initials
  const seed = encodeURIComponent(cleanName || 'KasirKu');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&radius=50`;
}

/**
 * Compresses an uploaded image file client-side using HTML5 Canvas.
 * Keeps output under maxSizeKB (default 60KB) as Base64 data URL.
 */
export async function compressAvatarFile(
  file: File,
  maxDimension: number = 320,
  maxSizeKB: number = 60
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale proportionally
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress JPEG quality
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // If file is still larger than target, reduce quality
        while (dataUrl.length > maxSizeKB * 1024 * 1.33 && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
