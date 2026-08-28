/**
 * Currency and Number Formatting Utilities for TD MOBILE STORE
 */

/**
 * Format number to Vietnamese Currency string: e.g. 15.000.000 VNĐ
 */
export function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 VNĐ';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0 : amount;
  return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' VNĐ';
}

/**
 * Format number with dot thousand separators: e.g. 15000000 -> 15.000.000
 */
export function formatNumberDots(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const clean = val.toString().replace(/[^0-9]/g, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse string with dots back to plain numeric value: e.g. "15.000.000" -> 15000000
 */
export function parseNumberDots(val: string | null | undefined): number {
  if (!val) return 0;
  const clean = val.toString().replace(/[^0-9]/g, '');
  return parseInt(clean, 10) || 0;
}
