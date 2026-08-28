/**
 * Telegram Notification Service for TD MOBILE STORE
 */

interface SendTelegramOptions {
  message: string;
  parse_mode?: 'HTML' | 'MarkdownV2' | 'Markdown';
}

export async function sendTelegramMessage(options: SendTelegramOptions): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8738371073:AAHUIUVfvJ3kyBJJ7FnjrnmUEcgFHSglzA0';
  const chatId = process.env.TELEGRAM_CHAT_ID || '-1004286915679';

  if (!token || !chatId) {
    console.warn('⚠️ Telegram bot token hoặc chat ID chưa được cấu hình.');
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: options.message,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('❌ Lỗi gửi tin nhắn Telegram:', data);
      return false;
    }
    console.log('✅ Đã gửi thông báo Telegram thành công!');
    return true;
  } catch (error) {
    console.error('❌ Lỗi kết nối Telegram API:', error);
    return false;
  }
}

/**
 * Format currency VND (e.g. 15.000.000 VNĐ)
 */
export function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 VNĐ';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0 : amount;
  return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' VNĐ';
}

/**
 * Send notification for a successful POS Sale Order
 */
export async function notifySaleOrder(orderData: {
  orderCode: string;
  customerName: string;
  customerPhone: string;
  sellerName: string;
  items: Array<{ name: string; imei: string; price: number; warranty: number }>;
  totalAmount: number;
  discount: number;
  tradeInValue?: number;
  finalPayment: number;
  paidAmount: number;
  debtAdded: number;
  paymentMethod: string;
  tradeInItem?: { name: string; imei: string; value: number } | null;
}) {
  const methodLabel =
    orderData.paymentMethod === 'cash'
      ? 'Tiền mặt 💵'
      : orderData.paymentMethod === 'transfer'
      ? 'Chuyển khoản 💳'
      : 'Kết hợp 💵💳';

  let itemsHtml = orderData.items
    .map(
      (item, idx) =>
        `   ${idx + 1}. <b>${item.name}</b>\n      IMEI: <code>${item.imei}</code> | BH: ${item.warranty}T | ${formatVND(item.price)}`
    )
    .join('\n');

  let tradeInHtml = '';
  if (orderData.tradeInItem && orderData.tradeInValue && orderData.tradeInValue > 0) {
    tradeInHtml = `\n🔄 <b>MÁY THU CŨ (TRADE-IN):</b>\n   • Máy: <b>${orderData.tradeInItem.name}</b>\n   • IMEI: <code>${orderData.tradeInItem.imei}</code>\n   • Giá thu: <b>${formatVND(orderData.tradeInItem.value)}</b>\n`;
  }

  let debtHtml = '';
  if (orderData.debtAdded > 0) {
    debtHtml = `\n⚠️ <b>GHI NỢ KHÁCH HÀNG:</b> <code>+${formatVND(orderData.debtAdded)}</code>`;
  }

  const message = `
🔥 <b>[TD MOBILE STORE] - ĐƠN BÁN HÀNG MỚI</b> 🔥
━━━━━━━━━━━━━━━━━━━━
🧾 Mã đơn: <b>#${orderData.orderCode}</b>
👤 Khách hàng: <b>${orderData.customerName}</b> (📱 <code>${orderData.customerPhone}</code>)
👨‍💼 Nhân viên: <b>${orderData.sellerName}</b>
⏰ Thời gian: <b>${new Date().toLocaleString('vi-VN')}</b>

📱 <b>SẢN PHẨM BÁN RA:</b>
${itemsHtml}
${tradeInHtml}
━━━━━━━━━━━━━━━━━━━━
💰 <b>Tổng tiền hàng:</b> ${formatVND(orderData.totalAmount)}
🎁 <b>Giảm giá:</b> -${formatVND(orderData.discount)}
${orderData.tradeInValue ? `🔄 <b>Trừ máy cũ:</b> -${formatVND(orderData.tradeInValue)}\n` : ''}💵 <b>Khách cần trả:</b> <b>${formatVND(orderData.finalPayment)}</b>
✅ <b>Đã thanh toán:</b> <b>${formatVND(orderData.paidAmount)}</b> (${methodLabel})${debtHtml}
━━━━━━━━━━━━━━━━━━━━
<i>Hệ thống quản lý bán hàng TD Mobile Store</i>
`.trim();

  return await sendTelegramMessage({ message, parse_mode: 'HTML' });
}

/**
 * Send notification for a new Import Order
 */
export async function notifyImportOrder(importData: {
  orderCode: string;
  supplierName: string;
  staffName: string;
  totalAmount: number;
  paidAmount: number;
  debtAdded: number;
  itemCount: number;
}) {
  const message = `
📦 <b>[TD MOBILE STORE] - ĐƠN NHẬP KHO MỚI</b> 📦
━━━━━━━━━━━━━━━━━━━━
🧾 Mã đơn nhập: <b>#${importData.orderCode}</b>
🏢 Nhà cung cấp: <b>${importData.supplierName}</b>
👨‍💼 Người nhập: <b>${importData.staffName}</b>
📱 Số lượng máy: <b>${importData.itemCount} sản phẩm</b>
💰 Tổng tiền nhập: <b>${formatVND(importData.totalAmount)}</b>
✅ Đã thanh toán NCC: <b>${formatVND(importData.paidAmount)}</b>
${importData.debtAdded > 0 ? `⚠️ Cửa hàng ghi nợ NCC: <b>${formatVND(importData.debtAdded)}</b>\n` : ''}⏰ Thời gian: <b>${new Date().toLocaleString('vi-VN')}</b>
━━━━━━━━━━━━━━━━━━━━
<i>Hệ thống quản lý bán hàng TD Mobile Store</i>
`.trim();

  return await sendTelegramMessage({ message, parse_mode: 'HTML' });
}
