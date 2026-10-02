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
  'DichVu',
];

export interface MasterServiceItem {
  id: string;
  name: string;
  defaultPrice: number;
  defaultWarrantyMonths: number;
  category: string;
}

export const DEFAULT_MASTER_SERVICES: MasterServiceItem[] = [
  { id: 'thay_pin', name: 'Thay Pin (Pin Zin / EU / Pisen / Deji)', defaultPrice: 0, defaultWarrantyMonths: 12, category: 'DichVu' },
  { id: 'thay_man_hinh', name: 'Thay Màn Hình (Màn Zin / OLED GX / JK)', defaultPrice: 0, defaultWarrantyMonths: 6, category: 'DichVu' },
  { id: 'ep_kinh', name: 'Ép Kính Màn Hình / Ép Cảm Ứng', defaultPrice: 0, defaultWarrantyMonths: 12, category: 'DichVu' },
  { id: 'ep_kinh_lung', name: 'Thay Kính Lưng / Thay Nắp Lưng', defaultPrice: 0, defaultWarrantyMonths: 12, category: 'DichVu' },
  { id: 'sua_faceid', name: 'Sửa Face ID / Touch ID / Cảm biến', defaultPrice: 0, defaultWarrantyMonths: 3, category: 'DichVu' },
  { id: 'sua_nguon', name: 'Sửa Nguồn / Hao Pin / Nóng Máy', defaultPrice: 0, defaultWarrantyMonths: 3, category: 'DichVu' },
  { id: 'thay_camera', name: 'Thay Camera Trước / Sau / Kính Cam', defaultPrice: 0, defaultWarrantyMonths: 6, category: 'DichVu' },
  { id: 'thay_chan_sac', name: 'Thay Cụm Chân Sạc / Cáp Sạc / Mic', defaultPrice: 0, defaultWarrantyMonths: 6, category: 'DichVu' },
  { id: 'thay_loa', name: 'Thay Loa Trong / Loa Ngoài / Rè Loa', defaultPrice: 0, defaultWarrantyMonths: 6, category: 'DichVu' },
  { id: 'thay_vo_suon', name: 'Thay Vỏ / Độ Vỏ / Thay Sườn Máy', defaultPrice: 0, defaultWarrantyMonths: 6, category: 'DichVu' },
  { id: 've_sinh_may', name: 'Vệ Sinh Máy / Tra Keo / Kháng Nước', defaultPrice: 0, defaultWarrantyMonths: 0, category: 'DichVu' },
  { id: 'chay_phan_mem', name: 'Chạy Lại Phần Mềm / Cứu Dữ Liệu', defaultPrice: 0, defaultWarrantyMonths: 0, category: 'DichVu' },
  { id: 'dan_cuong_luc_ppf', name: 'Dán Cường Lực / Dán PPF Full Body', defaultPrice: 0, defaultWarrantyMonths: 0, category: 'DichVu' },
  { id: 'sua_chua_khac', name: 'Dịch Vụ Sửa Chữa Khác (Theo Báo Giá)', defaultPrice: 0, defaultWarrantyMonths: 3, category: 'DichVu' },
];

/**
 * Get custom saved services from LocalStorage
 */
export function getSavedCustomServices(): MasterServiceItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('tdm_custom_services');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save new custom service
 */
export function saveCustomService(serviceName: string, warrantyMonths: number = 12): MasterServiceItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedCustomServices();
    const clean = serviceName.trim();
    if (!clean) return existing;
    const newId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newItem: MasterServiceItem = {
      id: newId,
      name: clean,
      defaultPrice: 0,
      defaultWarrantyMonths: warrantyMonths,
      category: 'DichVu',
    };
    const updated = [...existing, newItem];
    localStorage.setItem('tdm_custom_services', JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Update custom service
 */
export function updateCustomService(id: string, newName: string, warrantyMonths: number = 12): MasterServiceItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedCustomServices();
    const clean = newName.trim();
    const updated = existing.map((item) =>
      item.id === id ? { ...item, name: clean || item.name, defaultWarrantyMonths: warrantyMonths } : item
    );
    localStorage.setItem('tdm_custom_services', JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Delete custom service
 */
export function deleteCustomService(id: string): MasterServiceItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedCustomServices();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem('tdm_custom_services', JSON.stringify(updated));
    
    // Save hidden default service IDs
    const hiddenRaw = localStorage.getItem('tdm_hidden_default_services');
    const hiddenList: string[] = hiddenRaw ? JSON.parse(hiddenRaw) : [];
    if (!hiddenList.includes(id) && DEFAULT_MASTER_SERVICES.some((s) => s.id === id)) {
      hiddenList.push(id);
      localStorage.setItem('tdm_hidden_default_services', JSON.stringify(hiddenList));
    }

    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Get all available services combined
 */
export function getAllMasterServices(): MasterServiceItem[] {
  const custom = getSavedCustomServices();
  let hiddenList: string[] = [];
  if (typeof window !== 'undefined') {
    try {
      const hiddenRaw = localStorage.getItem('tdm_hidden_default_services');
      hiddenList = hiddenRaw ? JSON.parse(hiddenRaw) : [];
    } catch (e) {}
  }
  const filteredDefaults = DEFAULT_MASTER_SERVICES.filter((s) => !hiddenList.includes(s.id));
  return [...filteredDefaults, ...custom];
}

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
}export function getAllMasterColors(): string[] {
  const custom = getSavedCustomColors();
  return Array.from(new Set([...DEFAULT_MASTER_COLORS, ...custom]));
}

/**
 * Get custom saved models from LocalStorage (browser-safe)
 */
export function getSavedCustomModels(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('tdm_custom_models');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save new custom model to Master list
 */
export function saveCustomModel(modelName: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getSavedCustomModels();
    const clean = modelName.trim();
    if (clean && !existing.includes(clean) && !DEFAULT_MASTER_MODELS.includes(clean)) {
      const updated = [...existing, clean];
      localStorage.setItem('tdm_custom_models', JSON.stringify(updated));
      return updated;
    }
    return existing;
  } catch (e) {
    return [];
  }
}

/**
 * Get all available models combined
 */
export function getAllMasterModels(): string[] {
  const custom = getSavedCustomModels();
  return Array.from(new Set([...DEFAULT_MASTER_MODELS, ...custom]));
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
