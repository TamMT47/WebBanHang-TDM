import { InvoiceSettings } from './invoiceSettings';

/**
 * Utility to convert Vietnamese accented characters to plain unaccented ASCII
 * Ensures perfect, clean text rendering without garbled characters on ESC/POS thermal printers.
 */
export function removeVietnameseTones(str: string | null | undefined): string {
  if (!str) return '';
  let result = str;
  result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  result = result.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  result = result.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  result = result.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  result = result.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  result = result.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  result = result.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  result = result.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  result = result.replace(/đ/g, 'd');
  result = result.replace(/Đ/g, 'D');
  return result;
}

/**
 * Format a 2-column line for ESC/POS: Left text + spaces + Right text
 */
export function formatTwoColumns(left: string, right: string, maxCols = 48): string {
  const l = removeVietnameseTones(left);
  const r = removeVietnameseTones(right);
  const totalLen = l.length + r.length;
  if (totalLen >= maxCols) {
    // If too long, truncate left or put on new line
    const availableLeft = maxCols - r.length - 1;
    if (availableLeft > 5) {
      return l.substring(0, availableLeft) + ' ' + r;
    }
    return l + '\n' + ' '.repeat(Math.max(0, maxCols - r.length)) + r;
  }
  const spaces = maxCols - totalLen;
  return l + ' '.repeat(spaces) + r;
}

/**
 * Format currency to string without special currency symbol for thermal printer: e.g. 15.000.000 d
 */
export function formatPriceForEscpos(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0 d';
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) || 0 : val;
  return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' d';
}

/**
 * ESC/POS Command Constants
 */
export const ESC = '\x1B';
export const GS = '\x1D';
export const DLE = '\x10';

export const CMD = {
  INIT: `${ESC}@`, // Initialize printer
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_ON: `${GS}!\x11`, // 2x width and 2x height
  DOUBLE_WIDTH: `${GS}!\x20`,
  DOUBLE_HEIGHT: `${GS}!\x01`,
  NORMAL_SIZE: `${GS}!\x00`,
  FEED_3: `${ESC}d\x03`,
  FEED_5: `${ESC}d\x05`,
  CUT_FULL: `${GS}V\x00`, // GS V 0 (Full Cut)
  CUT_PARTIAL: `${GS}V\x01`, // GS V 1 (Partial Cut)
  CUT_FEED: `${GS}V\x41\x10`, // Feed 16 units and cut
  OPEN_DRAWER_1: `${DLE}\x14\x01\x01\x01`, // DLE DC4 1 1 1 (Pulse cash drawer)
  OPEN_DRAWER_2: `${ESC}p\x00\x19\xFA`, // ESC p 0 25 250
};

/**
 * Build ESC/POS QR Code Commands (Model 2, Module Size 6, Error Correction L)
 */
export function buildQrCodeEscpos(qrData: string, size = 6): Buffer {
  const dataBuf = Buffer.from(qrData, 'utf-8');
  const storeLen = dataBuf.length + 3;
  const pL = storeLen % 256;
  const pH = Math.floor(storeLen / 256);

  const chunks: Buffer[] = [];
  // 1. Select QR Model (Model 2)
  chunks.push(Buffer.from([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]));
  // 2. Set Module Size (1 to 16)
  chunks.push(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]));
  // 3. Set Error Correction Level (48 = L, 49 = M, 50 = Q, 51 = H)
  chunks.push(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]));
  // 4. Store QR Data
  chunks.push(Buffer.from([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]));
  chunks.push(dataBuf);
  // 5. Print QR Code
  chunks.push(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]));

  return Buffer.concat(chunks);
}

/**
 * Generate Test Receipt ESC/POS buffer for Xprinter XP-Q80BS
 */
export function generateTestReceiptEscpos(settings: InvoiceSettings): Buffer {
  const maxCols = settings.printerPaperSize === 'k57' ? 32 : 48;
  const divider = '-'.repeat(maxCols);
  const doubleDivider = '='.repeat(maxCols);

  const parts: (string | Buffer)[] = [];

  // Init & Open drawer if configured
  parts.push(CMD.INIT);
  if (settings.printerOpenDrawer) {
    parts.push(CMD.OPEN_DRAWER_1);
    parts.push(CMD.OPEN_DRAWER_2);
  }

  // Header Center
  parts.push(CMD.ALIGN_CENTER);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_ON);
  parts.push(removeVietnameseTones(settings.shopName || 'TD MOBILE STORE') + '\n');
  parts.push(CMD.NORMAL_SIZE);
  parts.push(CMD.BOLD_OFF);

  parts.push(removeVietnameseTones(settings.shopSlogan || 'Chat luong tao niem tin - Dich vu dinh cao') + '\n');
  parts.push(removeVietnameseTones(`Dia chi: ${settings.shopAddress}`) + '\n');
  parts.push(removeVietnameseTones(`Hotline: ${settings.shopHotline}`) + '\n');
  parts.push(doubleDivider + '\n');

  // Title
  parts.push(CMD.BOLD_ON);
  parts.push('*** IN KIEM TRA KET NOI MAY IN ***\n');
  parts.push('MAY IN NHIET LAN / WIFI XPRINTER XP-Q80BS\n');
  parts.push(CMD.BOLD_OFF);
  parts.push(divider + '\n');

  // Info
  parts.push(CMD.ALIGN_LEFT);
  parts.push(formatTwoColumns('Dia chi IP May In:', `${settings.printerIp}:${settings.printerPort}`, maxCols) + '\n');
  parts.push(formatTwoColumns('Kho giay in:', `${settings.printerPaperSize.toUpperCase()} (${maxCols} cot)`, maxCols) + '\n');
  parts.push(formatTwoColumns('Ngay gio test:', new Date().toLocaleString('vi-VN'), maxCols) + '\n');
  parts.push(formatTwoColumns('Trang thai ket noi:', 'HOAN HAO (OK)', maxCols) + '\n');
  parts.push(divider + '\n');

  parts.push(CMD.ALIGN_CENTER);
  parts.push(CMD.BOLD_ON);
  parts.push('TAT CA LENH IN & CAT GIAY DA HOAT DONG!\n');
  parts.push(CMD.BOLD_OFF);
  parts.push('San sang in hoa don ban hang & phieu bao hanh.\n');
  parts.push(doubleDivider + '\n');

  // Test QR Code
  parts.push(CMD.ALIGN_CENTER);
  parts.push('QUET MA QR KIEM TRA:\n');
  const qrTest = buildQrCodeEscpos(`https://tdmobilestore.vn?test=printer_${Date.now()}`, 5);
  parts.push(qrTest);
  parts.push('\n');

  parts.push(removeVietnameseTones(settings.footerNote || 'Cam on Quy Khach da tin tuong TD Mobile Store!') + '\n');
  
  // Feed lines & Cut Paper
  parts.push(CMD.FEED_5);
  if (settings.printerAutoCut) {
    parts.push(CMD.CUT_FULL);
  }

  // Convert string parts to Buffer
  const buffers: Buffer[] = parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'ascii') : p));
  return Buffer.concat(buffers);
}

/**
 * Generate Order Invoice / Warranty ESC/POS buffer
 */
export function generateOrderReceiptEscpos(
  order: any,
  settings: InvoiceSettings,
  docType: 'invoice' | 'warranty' = 'invoice'
): Buffer {
  const maxCols = settings.printerPaperSize === 'k57' ? 32 : 48;
  const divider = '-'.repeat(maxCols);
  const doubleDivider = '='.repeat(maxCols);

  const parts: (string | Buffer)[] = [];

  // Init
  parts.push(CMD.INIT);

  // Open Drawer on sale if configured
  if (settings.printerOpenDrawer && docType === 'invoice') {
    parts.push(CMD.OPEN_DRAWER_1);
    parts.push(CMD.OPEN_DRAWER_2);
  }

  // 1. Header
  parts.push(CMD.ALIGN_CENTER);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_ON);
  parts.push(removeVietnameseTones(settings.shopName || 'TD MOBILE STORE') + '\n');
  parts.push(CMD.NORMAL_SIZE);
  parts.push(CMD.BOLD_OFF);

  if (settings.shopSlogan) {
    parts.push(removeVietnameseTones(settings.shopSlogan) + '\n');
  }
  parts.push(removeVietnameseTones(`DC: ${settings.shopAddress}`) + '\n');
  parts.push(removeVietnameseTones(`Hotline: ${settings.shopHotline} | BH: ${settings.warrantyHotline || settings.shopHotline}`) + '\n');
  parts.push(doubleDivider + '\n');

  // 2. Title
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_HEIGHT);
  if (docType === 'warranty') {
    parts.push('*** PHIEU BAO HANH CHINH HANG ***\n');
  } else {
    parts.push('*** HOA DON BAN HANG ***\n');
  }
  parts.push(CMD.NORMAL_SIZE);
  parts.push(CMD.BOLD_OFF);

  const orderDate = order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
  parts.push(formatTwoColumns('Ma don hang:', `#${order.code || 'POS'}`, maxCols) + '\n');
  parts.push(formatTwoColumns('Ngay tao:', orderDate, maxCols) + '\n');
  if (order.creator_name) {
    parts.push(formatTwoColumns('Nhan vien:', order.creator_name, maxCols) + '\n');
  }
  parts.push(divider + '\n');

  // 3. Customer Info
  parts.push(CMD.ALIGN_LEFT);
  const custName = order.partner_name || 'Khach le';
  const custPhone = order.partner_phone || '---';
  parts.push(formatTwoColumns('Khach hang:', custName, maxCols) + '\n');
  parts.push(formatTwoColumns('So dien thoai:', custPhone, maxCols) + '\n');
  if (order.partner_address) {
    parts.push(removeVietnameseTones(`Dia chi: ${order.partner_address}`) + '\n');
  }
  if (order.partner_cccd) {
    parts.push(formatTwoColumns('CCCD/CMND:', order.partner_cccd, maxCols) + '\n');
  }
  parts.push(divider + '\n');

  // 4. Products Table
  parts.push(CMD.BOLD_ON);
  parts.push(formatTwoColumns('TEN SAN PHAM / QUY CACH', 'THANH TIEN', maxCols) + '\n');
  parts.push(CMD.BOLD_OFF);
  parts.push(divider + '\n');

  const items = order.items || [];
  if (items.length > 0) {
    items.forEach((item: any, idx: number) => {
      const prodName = item.product_name || item.name || `San pham ${idx + 1}`;
      const specs = [item.storage, item.color, item.condition].filter(Boolean).join(' | ');
      const titleLine = `${idx + 1}. ${prodName}${specs ? ` (${specs})` : ''}`;
      const priceStr = formatPriceForEscpos(item.price);

      parts.push(CMD.BOLD_ON);
      parts.push(formatTwoColumns(titleLine, priceStr, maxCols) + '\n');
      parts.push(CMD.BOLD_OFF);

      // IMEI & Pin
      if (settings.showImei && item.imei) {
        let imeiLine = `   IMEI: ${item.imei}`;
        if (settings.showBatteryHealth && item.battery_health) {
          imeiLine += ` (Pin: ${item.battery_health}%)`;
        }
        parts.push(removeVietnameseTones(imeiLine) + '\n');
      }

      // Warranty period
      const warrantyMonths = item.warranty_months ?? 12;
      const warrantyText = warrantyMonths > 0 ? `Bao hanh: ${warrantyMonths} thang` : 'Khong BH';
      parts.push(removeVietnameseTones(`   BH: ${warrantyText}`) + '\n');
    });
  } else {
    parts.push('Khong co san pham trong hoa don\n');
  }

  // Trade-in item if any
  if (order.trade_in_item) {
    parts.push(divider + '\n');
    parts.push(CMD.BOLD_ON);
    parts.push(formatTwoColumns('THU CU DOI MOI (TRADE-IN):', `-${formatPriceForEscpos(order.trade_in_item.value)}`, maxCols) + '\n');
    parts.push(CMD.BOLD_OFF);
    const tiLine = `   May: ${order.trade_in_item.name} | IMEI: ${order.trade_in_item.imei || '---'}`;
    parts.push(removeVietnameseTones(tiLine) + '\n');
  }

  parts.push(doubleDivider + '\n');

  // 5. Totals & Payments
  parts.push(CMD.ALIGN_LEFT);
  const totalAmount = order.total_amount || 0;
  const discount = order.discount || 0;
  const tradeInVal = order.trade_in_value || 0;
  const finalPayment = order.final_payment ?? (totalAmount - discount - tradeInVal);
  const paidAmount = order.paid_amount ?? finalPayment;
  const debtAdded = order.debt_added || 0;

  parts.push(formatTwoColumns('Tong tien hang:', formatPriceForEscpos(totalAmount), maxCols) + '\n');
  if (discount > 0) {
    parts.push(formatTwoColumns('Giam gia / Khuyen mai:', `-${formatPriceForEscpos(discount)}`, maxCols) + '\n');
  }
  if (tradeInVal > 0) {
    parts.push(formatTwoColumns('Gia tri thu cu:', `-${formatPriceForEscpos(tradeInVal)}`, maxCols) + '\n');
  }

  parts.push(divider + '\n');
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_HEIGHT);
  parts.push(formatTwoColumns('KHACH PHAI TRA:', formatPriceForEscpos(finalPayment), maxCols) + '\n');
  parts.push(CMD.NORMAL_SIZE);
  parts.push(CMD.BOLD_OFF);
  parts.push(divider + '\n');

  const payMethodName =
    order.payment_method === 'transfer'
      ? 'Chuyen khoan'
      : order.payment_method === 'card'
      ? 'Quet the POS'
      : order.payment_method === 'debt'
      ? 'Ghi no'
      : 'Tien mat';

  parts.push(formatTwoColumns('Hinh thuc thanh toan:', payMethodName, maxCols) + '\n');
  parts.push(formatTwoColumns('Tien khach da tra:', formatPriceForEscpos(paidAmount), maxCols) + '\n');

  if (debtAdded > 0) {
    parts.push(CMD.BOLD_ON);
    parts.push(formatTwoColumns('CON NO LAI:', formatPriceForEscpos(debtAdded), maxCols) + '\n');
    parts.push(CMD.BOLD_OFF);
  } else {
    const excess = Math.max(0, paidAmount - finalPayment);
    if (excess > 0) {
      parts.push(formatTwoColumns('Tien thua tra khach:', formatPriceForEscpos(excess), maxCols) + '\n');
    }
  }

  // 6. QR Code Banking Transfer
  if (finalPayment > 0) {
    parts.push(doubleDivider + '\n');
    parts.push(CMD.ALIGN_CENTER);
    parts.push(CMD.BOLD_ON);
    parts.push('QUET MA QR CHUYEN KHOAN (VIETQR)\n');
    parts.push(CMD.BOLD_OFF);
    parts.push(removeVietnameseTones(`Ngan hang: ${settings.bankName || 'MB Bank'}`) + '\n');
    parts.push(removeVietnameseTones(`STK: ${settings.bankAccount || '0364848960'} | ${settings.bankAccountHolder || 'TRUONG MINH TAM'}`) + '\n');
    parts.push(removeVietnameseTones(`Noi dung: TT DON ${order.code}`) + '\n');

    // Generate VietQR URL string for QR Code
    const vietQrData = `https://img.vietqr.io/image/MB-${settings.bankAccount || '0364848960'}-compact2.png?amount=${finalPayment}&addInfo=TT%20DON%20${order.code}&accountName=TRUONG%20MINH%20TAM`;
    const qrBuffer = buildQrCodeEscpos(vietQrData, 5);
    parts.push(qrBuffer);
    parts.push('\n');
  }

  // 7. Warranty Terms / Policies
  if (settings.showWarrantyTerms && settings.warrantyPolicies && settings.warrantyPolicies.length > 0) {
    parts.push(divider + '\n');
    parts.push(CMD.ALIGN_LEFT);
    parts.push(CMD.BOLD_ON);
    parts.push('CHINH SACH & CAM KET BAO HANH:\n');
    parts.push(CMD.BOLD_OFF);
    settings.warrantyPolicies.forEach((p) => {
      if (p.trim()) {
        parts.push(removeVietnameseTones(`- ${p}`) + '\n');
      }
    });
  }

  // 8. Footer
  parts.push(doubleDivider + '\n');
  parts.push(CMD.ALIGN_CENTER);
  parts.push(removeVietnameseTones(settings.footerNote || 'Xin cam on Quy Khach da tin tuong TD Mobile Store!') + '\n');
  parts.push('Hotline ho tro ky thuat: 0364848960\n');

  // Feed lines & Auto Cut
  parts.push(CMD.FEED_5);
  if (settings.printerAutoCut) {
    parts.push(CMD.CUT_FULL);
  }

  const buffers: Buffer[] = parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'ascii') : p));
  return Buffer.concat(buffers);
}
