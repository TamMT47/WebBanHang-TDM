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
  const link = document.createElement('a');

  const today = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', customFilename || `TD_Mobile_DanhSach_KhachHang_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Export Monthly Payroll to CSV / Excel File
 */
export function exportPayrollToCSV(records: any[], month: string) {
  if (!records || records.length === 0) {
    alert('Không có dữ liệu bảng lương để xuất file!');
    return false;
  }

  const headers = [
    'STT',
    'Tháng',
    'Họ và Tên Nhân Viên',
    'Vai Trò',
    'Loại Hợp Đồng',
    'Lương Cơ Bản (đ)',
    'Công Chuẩn (ngày)',
    'Công Thực Tế (ngày)',
    'Lương Theo Ngày Công (đ)',
    'Số Giờ Tăng Ca (OT 11h)',
    'Tiền Lương OT 150% (đ)',
    'Hoa Hồng Nhóm (đ)',
    'Hoa Hồng Cá Nhân (đ)',
    'Tổng Phụ Cấp / Thưởng (đ)',
    'Tổng Khoản Trừ / Phạt (đ)',
    'TỔNG THỰC LĨNH (đ)',
    'Trạng Thái Thanh Toán',
    'Ghi Chú',
  ];

  const rows = records.map((r, index) => {
    const contractTypeLabel =
      r.contract_type === 'probation'
        ? 'Thử việc (85%)'
        : r.contract_type === 'marketing'
        ? 'Sale Marketing (100%)'
        : r.contract_type === 'manager'
        ? 'Quản lý (100%)'
        : 'Bán hàng (100%)';

    return [
      escapeCSVCell(index + 1),
      escapeCSVCell(r.month || month),
      escapeCSVCell(r.user_name || ''),
      escapeCSVCell(r.user_role || ''),
      escapeCSVCell(contractTypeLabel),
      escapeCSVCell(r.base_salary || 0),
      escapeCSVCell(r.standard_days || 26),
      escapeCSVCell(r.actual_days || 0),
      escapeCSVCell(r.salary_by_days || 0),
      escapeCSVCell(r.ot_hours || 0),
      escapeCSVCell(r.ot_salary || 0),
      escapeCSVCell(r.shared_commission || 0),
      escapeCSVCell(r.personal_commission || 0),
      escapeCSVCell(r.total_allowance || 0),
      escapeCSVCell(r.total_deduction || 0),
      escapeCSVCell(r.final_salary || 0),
      escapeCSVCell(r.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'),
      escapeCSVCell(r.note || ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `TD_Mobile_BangLuong_Thang_${month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
