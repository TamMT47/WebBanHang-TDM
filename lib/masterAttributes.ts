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
  '32GB',
  '64GB',
  '128GB',
  '256GB',
  '512GB',
  '1TB',
  '2TB',
];

export const DEFAULT_MASTER_CONDITIONS = [
  { id: 'new', label: 'Mới 100% (Nguyên Seal)' },
  { id: '99%', label: '99% (Keng như mới, Zin all)' },
  { id: '98%', label: '98% (Phẩy nhẹ theo thời gian)' },
  { id: '97%', label: '97% (Cấn xước nhẹ, giá tốt)' },
  { id: 'trade_in', label: 'Hàng Thu Cũ Đổi Mới (Trade-in)' },
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
 * Standardized Master SKU Examples (Tên + Dung lượng + Tình trạng)
 */
export const DEFAULT_MASTER_SKUS = [
  'iPhone 11 - 64GB - 99%',
  'iPhone 11 - 128GB - 99%',
  'iPhone 11 Pro Max - 64GB - 99%',
  'iPhone 11 Pro Max - 256GB - 99%',
  'iPhone 12 - 64GB - 99%',
  'iPhone 12 - 128GB - 99%',
  'iPhone 12 Pro - 128GB - 99%',
  'iPhone 12 Pro Max - 128GB - 99%',
  'iPhone 12 Pro Max - 256GB - 99%',
  'iPhone 13 - 128GB - 99%',
  'iPhone 13 - 256GB - 99%',
  'iPhone 13 Pro - 128GB - 99%',
  'iPhone 13 Pro Max - 128GB - 99%',
  'iPhone 13 Pro Max - 256GB - 99%',
  'iPhone 14 - 128GB - 99%',
  'iPhone 14 Plus - 128GB - 99%',
  'iPhone 14 Pro - 128GB - 99%',
  'iPhone 14 Pro Max - 128GB - 99%',
  'iPhone 14 Pro Max - 256GB - 99%',
  'iPhone 15 - 128GB - 99%',
  'iPhone 15 Plus - 128GB - 99%',
  'iPhone 15 Pro - 128GB - 99%',
  'iPhone 15 Pro - 256GB - 99%',
  'iPhone 15 Pro Max - 256GB - 99%',
  'iPhone 15 Pro Max - 512GB - 99%',
  'iPhone 16 - 128GB - Mới 100%',
  'iPhone 16 Plus - 128GB - Mới 100%',
  'iPhone 16 Pro - 128GB - Mới 100%',
  'iPhone 16 Pro Max - 256GB - Mới 100%',
  'iPhone 16 Pro Max - 512GB - Mới 100%',
  'iPad Air 5 M1 - 64GB WiFi - 99%',
  'iPad Pro 11 M2 - 128GB WiFi - 99%',
  'Macbook Air M1 - 8GB/256GB - 99%',
  'Macbook Air M2 - 8GB/256GB - 99%',
  'Airpods Pro 2 Type-C - Mới 100%',
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
 * Strict Apple Product Search Engine
 * 
 * Rules:
 * - If user searches "11" or "iPhone 11", do NOT match "11 Pro", "11 Pro Max", "11 Plus", "11 Mini"
 * - If user searches "11 Pro", do NOT match "11 Pro Max" or base "11"
 * - If user searches "11 Pro Max", match "11 Pro Max"
 * - If user searches by IMEI, matches by substring
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
