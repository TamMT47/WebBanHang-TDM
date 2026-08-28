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
  // Extract number tokens like 11, 12, 13, 14, 15, 16, 8, 7, 6, X, XS, XR, SE
  const modelNumbers = ['16', '15', '14', '13', '12', '11', 'xs max', 'xs', 'xr', 'se', 'x', '8 plus', '8', '7 plus', '7'];

  for (const num of modelNumbers) {
    // Check if query mentions this specific model number as a distinct word
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

      // If user specifically asked for "Pro Max"
      if (qHasMax) {
        return tHasMax;
      }

      // If user asked for "Pro" (without Max)
      if (qHasPro && !qHasMax) {
        return tHasPro && !tHasMax;
      }

      // If user asked for "Plus"
      if (qHasPlus) {
        return tHasPlus;
      }

      // If user asked for "Mini"
      if (qHasMini) {
        return tHasMini;
      }

      // Base model request (e.g. "iPhone 11"): MUST NOT have Pro, Max, Plus, Mini
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
