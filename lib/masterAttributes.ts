/**
 * Master Attributes & Strict Product Matching Engine for TD MOBILE STORE
 */

export interface MasterAttributesConfig {
  colors: string[];
  storages: string[];
  conditions: { id: string; label: string }[];
  categories: string[];
}

export const DEFAULT_MASTER_COLORS = [
  'Titan Tự Nhiên (Natural Titanium)',
  'Titan Sa Mạc (Desert Titanium)',
  'Titan Đen (Black Titanium)',
  'Titan Trắng (White Titanium)',
  'Titan Xanh (Blue Titanium)',
  'Midnight (Đen Đêm)',
  'Starlight (Trắng Ánh Sao)',
  'Deep Purple (Tím Đậm)',
  'Space Black (Đen Không Gian)',
  'Space Gray (Xám Không Gian)',
  'Silver (Bạc)',
  'Gold (Vàng Gold)',
  'Sierra Blue (Xanh Sierra)',
  'Pacific Blue (Xanh Thái Bình Dương)',
  'Alpine Green (Xanh Rừng)',
  'Green (Xanh Lá)',
  'Blue (Xanh Dương)',
  'Pink (Hồng)',
  'Yellow (Vàng)',
  'Purple (Tím)',
  'Red (Đỏ Product RED)',
  'Black (Đen)',
  'White (Trắng)',
];

export const DEFAULT_MASTER_STORAGES = [
  '64GB',
  '128GB',
  '256GB',
  '512GB',
  '1TB',
  '32GB',
  '2TB',
  'Không có / Mặc định',
];

export const DEFAULT_MASTER_CONDITIONS = [
  { id: '99%', label: '99% (Keng như mới, Zin all)' },
  { id: 'new', label: 'Mới 100% (Nguyên Seal)' },
  { id: '98%', label: '98% (Phẩy nhẹ theo thời gian)' },
  { id: '97%', label: '97% (Cấn xước nhẹ, giá tốt)' },
  { id: 'thanh_ly', label: 'Thanh lý / Kính vỡ / Thay pin' },
];

export const DEFAULT_MASTER_CATEGORIES = [
  'iPhone',
  'iPad',
  'Macbook',
  'Airpods',
  'AppleWatch',
  'PhuKien',
];

/**
 * Standardized Clean Master Models (Tên dòng máy độc lập)
 */
export const DEFAULT_MASTER_MODELS = [
  'iPhone 16 Pro Max',
  'iPhone 16 Pro',
  'iPhone 16 Plus',
  'iPhone 16',
  'iPhone 15 Pro Max',
  'iPhone 15 Pro',
  'iPhone 15 Plus',
  'iPhone 15',
  'iPhone 14 Pro Max',
  'iPhone 14 Pro',
  'iPhone 14 Plus',
  'iPhone 14',
  'iPhone 13 Pro Max',
  'iPhone 13 Pro',
  'iPhone 13',
  'iPhone 13 mini',
  'iPhone 12 Pro Max',
  'iPhone 12 Pro',
  'iPhone 12',
  'iPhone 12 mini',
  'iPhone 11 Pro Max',
  'iPhone 11 Pro',
  'iPhone 11',
  'iPhone XS Max',
  'iPhone XS',
  'iPhone XR',
  'iPhone X',
  'iPhone 8 Plus',
  'iPhone 8',
  'iPhone SE',
  'iPad Pro 12.9 M2',
  'iPad Pro 11 M2',
  'iPad Pro 11 M1',
  'iPad Air 5 M1',
  'iPad Air 4',
  'iPad Gen 10',
  'iPad Gen 9',
  'iPad mini 6',
  'Macbook Pro 14 M3',
  'Macbook Pro 16 M3',
  'Macbook Pro 14 M2',
  'Macbook Air 15 M2',
  'Macbook Air 13 M2',
  'Macbook Air 13 M1',
  'Airpods Pro 2 Type-C',
  'Airpods Pro 2 Lightning',
  'Airpods 3',
  'Airpods 2',
  'Airpods Max',
  'Apple Watch Ultra 2',
  'Apple Watch Ultra',
  'Apple Watch Series 9',
  'Apple Watch Series 8',
  'Apple Watch SE 2',
];

/**
 * Get custom saved colors from LocalStorage (browser-safe)
 */
export function getSavedCustomColors(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('tdm_custom_colors');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save new custom color to Master list
 */
export function saveCustomColor(colorName: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedCustomColors();
    const clean = colorName.trim();
    if (clean && !existing.includes(clean) && !DEFAULT_MASTER_COLORS.includes(clean)) {
      const updated = [...existing, clean];
      localStorage.setItem('tdm_custom_colors', JSON.stringify(updated));
      return updated;
    }
    return existing;
  } catch (e) {
    return [];
  }
}

/**
 * Get all available colors combined
 */
export function getAllMasterColors(): string[] {
  const custom = getSavedCustomColors();
  return Array.from(new Set([...DEFAULT_MASTER_COLORS, ...custom]));
}

/**
 * Helper to sort array A-Z by Vietnamese locale
 */
export function sortItemsAZ<T>(items: T[], keyExtractor: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const strA = (keyExtractor(a) || '').trim();
    const strB = (keyExtractor(b) || '').trim();
    return strA.localeCompare(strB, 'vi', { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Format Full Product Display Label cleanly
 */
export function formatProductTitle(name: string, storage?: string | null, condition?: string | null): string {
  const parts: string[] = [name.trim()];
  if (storage && storage !== 'Không có / Mặc định' && !name.toLowerCase().includes(storage.toLowerCase())) {
    parts.push(storage);
  }
  if (condition && condition !== 'Mặc định' && !name.toLowerCase().includes(condition.toLowerCase())) {
    parts.push(condition);
  }
  return parts.join(' - ');
}

/**
 * Strict Apple Product Search Engine
 */
export function strictProductMatch(
  targetName: string,
  targetImei: string | undefined,
  targetColor: string | undefined,
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const q = query.toLowerCase().trim();
  const name = (targetName || '').toLowerCase().trim();
  const imei = (targetImei || '').toLowerCase().trim();
  const color = (targetColor || '').toLowerCase().trim();

  // 1. Direct IMEI match or color match
  if (imei && imei.includes(q)) return true;
  if (color && color.includes(q)) return true;

  // 2. Strict Apple Model Matching Logic
  const modelNumbers = ['16', '15', '14', '13', '12', '11', 'xs max', 'xs', 'xr', 'se', 'x', '8 plus', '8', '7 plus', '7'];

  for (const num of modelNumbers) {
    const queryHasNum = new RegExp(`\\b${num}\\b`, 'i').test(q);
    const targetHasNum = new RegExp(`\\b${num}\\b`, 'i').test(name);

    if (queryHasNum) {
      if (!targetHasNum) return false;

      const qHasMax = /\b(max|promax)\b/i.test(q);
      const qHasPro = /\bpro\b/i.test(q);
      const qHasPlus = /\bplus\b/i.test(q);
      const qHasMini = /\bmini\b/i.test(q);

      const tHasMax = /\b(max|promax)\b/i.test(name);
      const tHasPro = /\bpro\b/i.test(name);
      const tHasPlus = /\bplus\b/i.test(name);
      const tHasMini = /\bmini\b/i.test(name);

      if (qHasMax) {
        return tHasMax;
      }

      if (qHasPro && !qHasMax) {
        return tHasPro && !tHasMax;
      }

      if (qHasPlus) {
        return tHasPlus;
      }

      if (qHasMini) {
        return tHasMini;
      }

      if (!qHasPro && !qHasMax && !qHasPlus && !qHasMini) {
        if (tHasPro || tHasMax || tHasPlus || tHasMini) {
          return false;
        }
        return true;
      }
    }
  }

  // Fallback to token matching
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => name.includes(t) || imei.includes(t) || color.includes(t));
}
