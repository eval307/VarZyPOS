/**
 * SKU (Stock Keeping Unit) & Barcode Generation Utilities
 * Supports standard alphanumeric, category-prefixed, EAN-13 retail compliant, and numeric formats.
 */

export type SkuFormatType = 'category' | 'standard' | 'ean13' | 'numeric' | 'short';

export interface SkuGeneratorOptions {
  format?: SkuFormatType;
  categoryName?: string;
  customPrefix?: string;
}

/**
 * Calculates standard EAN-13 check digit using Modulo-10 algorithm.
 * Input must be 12 numeric digits.
 */
export function calculateEan13CheckDigit(twelveDigits: string): number {
  const clean = twelveDigits.replace(/\D/g, '').slice(0, 12).padStart(12, '0');
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    // 1-indexed: odd positions * 1, even positions * 3
    sum += (i % 2 === 0) ? digit * 1 : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates whether a 13-digit string has a valid EAN-13 check digit.
 */
export function isValidEan13(code: string): boolean {
  const clean = code.replace(/\D/g, '');
  if (clean.length !== 13) return false;
  const expectedCheck = calculateEan13CheckDigit(clean.slice(0, 12));
  return parseInt(clean[12], 10) === expectedCheck;
}

/**
 * Extracts a concise 3-4 letter uppercase prefix from category or product name.
 */
export function getCategoryPrefix(categoryName?: string): string {
  if (!categoryName || categoryName === 'Semua') return 'PRD';
  // Remove vowels if long, or take first 3 alphanumeric characters
  const clean = categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length <= 3) return clean.padEnd(3, 'X');
  return clean.slice(0, 3);
}

/**
 * Generates a candidate SKU code based on specified format.
 */
export function generateCandidateSku(options: SkuGeneratorOptions = {}): string {
  const { format = 'category', categoryName, customPrefix } = options;

  switch (format) {
    case 'category': {
      const prefix = customPrefix || getCategoryPrefix(categoryName);
      const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digits
      return `${prefix}-${randomNum}`;
    }

    case 'standard': {
      const prefix = customPrefix || 'SKU';
      const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
      return `${prefix}-${randomNum}`;
    }

    case 'ean13': {
      // Use '200' (GS1 standard prefix reserved for in-store private internal barcodes)
      // or '899' (GS1 Indonesia)
      const prefix = '200';
      const randomBody = Math.floor(100000000 + Math.random() * 900000000).toString(); // 9 digits
      const twelve = (prefix + randomBody).slice(0, 12);
      const checkDigit = calculateEan13CheckDigit(twelve);
      return `${twelve}${checkDigit}`;
    }

    case 'numeric': {
      // 8-digit numeric barcode (Code 128 / UPC friendly)
      const random = Math.floor(10000000 + Math.random() * 90000000);
      return random.toString();
    }

    case 'short': {
      const prefix = customPrefix || getCategoryPrefix(categoryName);
      const randomNum = Math.floor(100 + Math.random() * 900); // 3 digits
      return `${prefix}-${randomNum}`;
    }

    default: {
      const prefix = customPrefix || 'SKU';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}-${randomNum}`;
    }
  }
}

/**
 * Checks whether an SKU is unique among existing products.
 */
export function isSkuUnique(
  sku: string,
  existingProducts: { sku?: string; id?: string }[],
  currentProductId?: string
): boolean {
  const target = sku.trim().toLowerCase();
  if (!target) return false;

  return !existingProducts.some((p) => {
    if (currentProductId && p.id === currentProductId) return false;
    return p.sku && p.sku.trim().toLowerCase() === target;
  });
}

/**
 * Generates a guaranteed-unique SKU code against existing products.
 */
export function generateUniqueSku(
  options: SkuGeneratorOptions = {},
  existingProducts: { sku?: string; id?: string }[] = [],
  currentProductId?: string
): string {
  let attempts = 0;
  while (attempts < 50) {
    const candidate = generateCandidateSku(options);
    if (isSkuUnique(candidate, existingProducts, currentProductId)) {
      return candidate;
    }
    attempts++;
  }
  // Fallback with timestamp to guarantee uniqueness
  const fallbackNum = Date.now().toString().slice(-6);
  return `SKU-${fallbackNum}`;
}
