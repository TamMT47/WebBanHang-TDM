/**
 * Category Tagging & Classification Helper
 * TD Mobile Store
 */

export type CategoryTag =
  | 'IPHONE'
  | 'IPAD'
  | 'MACBOOK'
  | 'ACCESSORY'
  | 'SERVICE'
  | 'LINHKIEN'
  | 'OTHER';

/**
 * Normalizes string for keyword matching (lowercased, accents removed optional, trimmed)
 */
function normalizeText(text: any): string {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().trim();
}

/**
 * CHUẨN HÓA THUẬT TOÁN PHÂN LOẠI & GẮN THẺ (TAGGING) SẢN PHẨM TRONG HÓA ĐƠN:
 * Kiểm tra linh hoạt trên tên sản phẩm (item.name, item.productName, item.product_name):
 * - Nếu thuộc nhóm sửa chữa/thay thế hoặc chứa: "thay pin", "thay màn hình", "ép kính", "sửa", "dịch vụ" -> Gắn tag: SERVICE
 * - Nếu tên chứa từ khóa: "iphone" -> Gắn tag: IPHONE
 * - Nếu tên chứa từ khóa: "ipad" -> Gắn tag: IPAD
 * - Nếu tên chứa từ khóa: "macbook", "imac", "mac" -> Gắn tag: MACBOOK
 * - Nếu tên chứa từ khóa: "airpods", "apple watch", "watch" -> Gắn tag: ACCESSORY
 * - Các trường hợp còn lại: phụ kiện, linh kiện -> Gắn tag: LINHKIEN hoặc OTHER
 */
export function getCategoryTag(item: any): CategoryTag {
  if (!item) return 'OTHER';

  const rawName = normalizeText(
    item.name ||
    item.productName ||
    item.product_name ||
    item.prod_name ||
    item.title ||
    ''
  );

  const rawCat = normalizeText(item.category || item.category_name || item.prod_cat || '');
  const itemType = normalizeText(item.item_type || item.type || '');
  const note = normalizeText(item.note || '');

  // 1. KIỂM TRA DỊCH VỤ SỬA CHỮA / THAY THẾ (ƯU TIÊN CAO NHẤT ĐỂ TRÁNH NHẦM THAY PIN IPHONE THÀNH IPHONE)
  const isServiceByKeyword =
    rawName.includes('thay pin') ||
    rawName.includes('thay màn hình') ||
    rawName.includes('thay màn') ||
    rawName.includes('thay man') ||
    rawName.includes('ép kính') ||
    rawName.includes('ep kinh') ||
    rawName.includes('sửa chữa') ||
    rawName.includes('sua chua') ||
    rawName.includes('sửa ') ||
    rawName.startsWith('sửa') ||
    rawName.includes('sua ') ||
    rawName.includes('dịch vụ') ||
    rawName.includes('dich vu') ||
    rawName.includes('thay thế') ||
    rawName.includes('thay the') ||
    rawName.includes('cứu máy') ||
    rawName.includes('chạy phần mềm') ||
    rawName.includes('bẻ icloud') ||
    rawName.includes('vệ sinh máy') ||
    note.includes('dịch vụ') ||
    note.includes('sửa chữa');

  const isServiceByType =
    itemType === 'service' ||
    rawCat === 'dichvu' ||
    rawCat === 'service';

  if (isServiceByKeyword || isServiceByType) {
    return 'SERVICE';
  }

  // 2. IPHONE (Chỉ áp dụng khi KHÔNG PHẢI là dịch vụ sửa chữa)
  if (
    rawName.includes('iphone') ||
    rawCat === 'iphone'
  ) {
    return 'IPHONE';
  }

  // 3. IPAD
  if (
    rawName.includes('ipad') ||
    rawCat === 'ipad'
  ) {
    return 'IPAD';
  }

  // 4. MACBOOK / IMAC / MAC
  const isMac =
    rawName.includes('macbook') ||
    rawName.includes('imac') ||
    /\bmac\b/.test(rawName) ||
    rawName.includes('mac mini') ||
    rawName.includes('mac studio') ||
    rawName.includes('mac pro') ||
    rawCat === 'macbook' ||
    rawCat === 'mac';

  if (isMac) {
    return 'MACBOOK';
  }

  // 5. ACCESSORY: AIRPODS / APPLE WATCH
  const isAppleAccessory =
    rawName.includes('airpods') ||
    rawName.includes('airpod') ||
    rawName.includes('apple watch') ||
    rawName.includes('watch') ||
    rawCat === 'airpods' ||
    rawCat === 'airpod' ||
    rawCat === 'applewatch' ||
    rawCat === 'watch';

  if (isAppleAccessory) {
    return 'ACCESSORY';
  }

  // 6. LINH KIỆN & PHỤ KIỆN KHÁC (Cáp, sạc, ốp, tai nghe, pin rời, cường lực)
  const isLinhKien =
    itemType === 'accessory' ||
    rawCat.includes('phukien') ||
    rawCat.includes('linhkien') ||
    rawCat.includes('accessory') ||
    rawName.includes('cáp') ||
    rawName.includes('cap ') ||
    rawName.includes('sạc') ||
    rawName.includes('sac ') ||
    rawName.includes('củ sạc') ||
    rawName.includes('tai nghe') ||
    rawName.includes('ốp') ||
    rawName.includes('op lung') ||
    rawName.includes('cường lực') ||
    rawName.includes('dán') ||
    rawName.includes('linh kiện') ||
    rawName.includes('phụ kiện');

  if (isLinhKien) {
    return 'LINHKIEN';
  }

  // Fallback category check if name was empty/generic
  if (rawCat.includes('iphone')) return 'IPHONE';
  if (rawCat.includes('ipad')) return 'IPAD';
  if (rawCat.includes('mac')) return 'MACBOOK';
  if (rawCat.includes('airpod') || rawCat.includes('watch')) return 'ACCESSORY';
  if (rawCat.includes('dichvu') || rawCat.includes('service')) return 'SERVICE';
  if (rawCat.includes('phukien') || rawCat.includes('linhkien')) return 'LINHKIEN';

  return 'OTHER';
}

/**
 * Kiểm tra xem 1 item con có thuộc nhóm/danh mục đang lọc hay không
 */
export function isItemMatchingCategory(item: any, selectedCategory: string): boolean {
  if (!selectedCategory || selectedCategory === 'all' || selectedCategory === 'ALL') {
    return true;
  }

  const tag = getCategoryTag(item);
  const sel = selectedCategory.trim().toUpperCase();

  switch (sel) {
    case 'IPHONE':
      return tag === 'IPHONE';
    case 'IPAD':
      return tag === 'IPAD';
    case 'MACBOOK':
      return tag === 'MACBOOK';
    case 'AIRPODS_WATCH':
    case 'ACCESSORY':
    case 'AIRPODS':
    case 'APPLEWATCH':
      return tag === 'ACCESSORY';
    case 'PHUKIEN':
    case 'LINHKIEN':
      return tag === 'LINHKIEN';
    case 'DICHVU':
    case 'SERVICE':
      return tag === 'SERVICE';
    case 'OTHER':
      return tag === 'OTHER';
    default:
      return tag === (sel as CategoryTag);
  }
}

/**
 * Một hóa đơn được tính vào danh mục khi ÍT NHẤT MỘT SẢN PHẨM trong hóa đơn thỏa mãn điều kiện lọc.
 */
export function doesOrderMatchCategory(order: any, selectedCategory: string): boolean {
  if (!selectedCategory || selectedCategory === 'all' || selectedCategory === 'ALL') {
    return true;
  }

  const items = order.items || order.products || [];
  if (!items || !Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some((item: any) => isItemMatchingCategory(item, selectedCategory));
}

/**
 * Tự động gán nhãn/gắn thẻ chuẩn xác cho các bản ghi hóa đơn cũ chưa có category (Backward Compatibility)
 */
export function normalizeInvoiceData<T = any>(invoices: T[]): T[] {
  if (!Array.isArray(invoices)) return [];

  return invoices.map((inv: any) => {
    const rawItems = inv.items || inv.products || [];
    const normalizedItems = rawItems.map((item: any) => {
      const tag = getCategoryTag(item);
      const friendlyCategory =
        tag === 'IPHONE'
          ? 'iPhone'
          : tag === 'IPAD'
          ? 'iPad'
          : tag === 'MACBOOK'
          ? 'MacBook'
          : tag === 'ACCESSORY'
          ? 'AirPods / Apple Watch'
          : tag === 'SERVICE'
          ? 'DichVu'
          : tag === 'LINHKIEN'
          ? 'PhuKien'
          : item.category || 'Khác';

      const productName = item.product_name || item.name || item.productName || 'Sản phẩm';

      return {
        ...item,
        category: item.category || friendlyCategory,
        category_tag: tag,
        product_name: productName,
        name: item.name || productName,
      };
    });

    return {
      ...inv,
      items: normalizedItems,
      products: normalizedItems,
    };
  });
}

/**
 * Tính toán số liệu thống kê chuẩn xác 100% dựa trên các item con khớp điều kiện danh mục
 */
export function calculateCategoryFilteredMetrics(orders: any[], selectedCategory: string) {
  let matchingOrdersCount = 0;
  let matchingUnitsCount = 0;
  let matchingRevenue = 0;
  let matchingGrossProfit = 0;

  for (const order of orders) {
    const items = order.items || order.products || [];
    const matchingItems = items.filter((it: any) => isItemMatchingCategory(it, selectedCategory));

    if (matchingItems.length > 0) {
      matchingOrdersCount += 1;
      for (const it of matchingItems) {
        const qty = parseInt(it.quantity, 10) || 1;
        const price = parseFloat(it.price || 0);
        const costPrice = parseFloat(it.cost_price || 0);

        matchingUnitsCount += qty;
        matchingRevenue += price * qty;
        matchingGrossProfit += (price - costPrice) * qty;
      }
    }
  }

  return {
    matchingOrdersCount,
    matchingUnitsCount,
    matchingRevenue,
    matchingGrossProfit,
  };
}
