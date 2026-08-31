/**
 * Helper utility to export formatted tabular data to CSV / Excel compatible format with UTF-8 BOM
 */

export interface ExportCustomerData {
  name: string;
  phone: string;
  type: string;
  cccd?: string | null;
  address?: string | null;
  debt: number;
  days_in_debt?: number;
  total_orders?: number;
  total_spent?: number;
  last_order_date?: string | null;
  created_at?: string;
}

/**
 * Clean cell content for CSV escaping
 */
function escapeCSVCell(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Format date for Excel
 */
function formatDateVN(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN');
  } catch (e) {
    return '';
  }
}

/**
 * Export Customer List to CSV / Excel File on personal computer
 */
export function exportCustomersToCSV(customers: ExportCustomerData[], customFilename?: string) {
  if (!customers || customers.length === 0) {
    alert('Không có dữ liệu khách hàng để xuất file!');
    return false;
  }

  // Headers in Vietnamese
  const headers = [
    'STT',
    'Tên Khách Hàng / Đối Tác',
    'Số Điện Thoại',
    'Phân Loại',
    'Số CCCD / CMND',
    'Địa Chỉ',
    'Công Nợ Hiện Tại (đ)',
    'Trạng Thái Nợ',
    'Số Ngày Nợ',
    'Tổng Số Đơn Hàng',
    'Tổng Tiền Đã Mua (đ)',
    'Đơn Gần Nhất',
    'Ngày Tạo Hồ Sơ',
  ];

  const rows = customers.map((c, index) => {
    const isCustomer = c.type === 'customer' || c.debt >= 0;
    const debtVal = c.debt || 0;
    let debtStatus = 'Không có nợ';
    if (debtVal > 0) debtStatus = 'Khách đang nợ cửa hàng';
    else if (debtVal < 0) debtStatus = 'Cửa hàng nợ nhà cung cấp';

    const partnerTypeLabel =
      c.type === 'customer'
        ? 'Khách Hàng'
        : c.type === 'supplier'
        ? 'Nhà Cung Cấp'
        : 'Khách Hàng / NCC';

    return [
      escapeCSVCell(index + 1),
      escapeCSVCell(c.name || 'Khách lẻ'),
      escapeCSVCell(c.phone || ''),
      escapeCSVCell(partnerTypeLabel),
      escapeCSVCell(c.cccd || ''),
      escapeCSVCell(c.address || ''),
      escapeCSVCell(debtVal),
      escapeCSVCell(debtStatus),
      escapeCSVCell(c.days_in_debt || 0),
      escapeCSVCell(c.total_orders || 0),
      escapeCSVCell(c.total_spent || 0),
      escapeCSVCell(formatDateVN(c.last_order_date)),
      escapeCSVCell(formatDateVN(c.created_at)),
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel properly opens Vietnamese diacritics
  const csvContent = '\uFEFF' + [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateTag = new Date().toISOString().split('T')[0];
  const filename = customFilename || `DanhSach_KhachHang_TDMobile_${dateTag}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
