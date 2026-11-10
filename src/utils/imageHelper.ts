/**
 * Helper utility for compressing image files to compact Base64 WebP/JPEG data URLs
 * and providing popular preset product images for grocery and retail stores.
 */

export interface ImagePreset {
  label: string;
  category: string;
  url: string;
}

export const PRODUCT_IMAGE_PRESETS: ImagePreset[] = [
  {
    label: 'Beras / Karung',
    category: 'Sembako',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Minyak Goreng',
    category: 'Sembako',
    url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Gula Pasir',
    category: 'Sembako',
    url: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Mi Instan',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Telur Ayam',
    category: 'Sembako',
    url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Air Mineral',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Kopi / Teh',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Susu Kemasan',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Snack / Biskuit',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80',
  },
  {
    label: 'Sabun / Shampoo',
    category: 'Kebersihan',
    url: 'https://images.unsplash.com/photo-1607006314144-8cb38544e2b0?w=400&auto=format&fit=crop&q=80',
  },
];

/**
 * Compresses an image file client-side to a compact WebP/JPEG data URL (< 60KB).
 * This eliminates dependencies on cloud storage buckets/billing and works 100% offline.
 */
export function compressImageFile(file: File, maxDimension = 480, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File yang dipilih bukan berkas gambar.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Gagal memuat gambar.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Scale down if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result as string);
        }

        // Fill background with white to handle transparency cleanly
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first for ultra-compact size, fallback to JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
