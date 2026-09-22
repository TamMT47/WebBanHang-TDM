export type UserRole = 'admin' | 'owner' | 'manager' | 'staff';

export type ContractType = 'probation' | 'sales' | 'marketing' | 'manager';

export interface User {
  id: string;
  username: string;
  password_hash?: string;
  full_name: string;
  role: UserRole;
  contract_type?: ContractType;
  base_salary?: number;
  created_at: string;
}

export type PartnerType = 'customer' | 'supplier' | 'both';

export interface Partner {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  cccd?: string | null;
  type: PartnerType;
  debt: number; // + khách nợ cửa hàng, - cửa hàng nợ NCC
  created_at: string;
}

export type ProductCategory = 'iPhone' | 'iPad' | 'Macbook' | 'Airpods' | 'AppleWatch' | 'PhuKien' | 'DichVu' | string;
export type ProductCondition = 'new' | '99%' | '98%' | '97%' | 'thanh_ly' | string;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  condition?: ProductCondition;
  color?: string | null;
  storage?: string | null;
  base_price?: number;
  created_at: string;
}

export type InventoryStatus = 'in_stock' | 'sold' | 'trade_in_pending';

export interface InventoryItem {
  id: string;
  product_id: string;
  imei: string;
  cost_price: number; // ẩn với staff
  selling_price: number;
  battery_health: number;
  status: InventoryStatus;
  supplier_id?: string | null;
  created_at: string;
  // Joined fields
  product_name?: string;
  category?: string;
  condition?: string;
  color?: string;
  storage?: string;
  supplier_name?: string;
}

export type OrderType = 'sell' | 'import';
export type PaymentMethod = 'cash' | 'transfer' | 'both';

export interface Order {
  id: string;
  code: string;
  type: OrderType;
  partner_id?: string | null;
  total_amount: number;
  discount: number;
  trade_in_value: number;
  final_payment: number;
  paid_amount: number;
  payment_method: PaymentMethod;
  debt_added: number;
  created_by?: string | null;
  seller_id?: string | null;
  created_at: string;
  // Joined fields
  partner_name?: string;
  partner_phone?: string;
  creator_name?: string;
  seller_name?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  inventory_id?: string | null;
  price: number;
  warranty_months: number;
  warranty_until?: string | null;
  // Joined fields
  imei?: string;
  product_name?: string;
  category?: string;
  condition?: string;
  color?: string;
  storage?: string;
  battery_health?: number;
  cost_price?: number;
}

export interface CashFlow {
  id: string;
  code: string;
  type: 'thu' | 'chi';
  amount: number;
  payment_method: 'cash' | 'transfer';
  category: 'ban_hang' | 'nhap_hang' | 'thu_no' | 'tra_no' | 'chi_phi_khac';
  partner_id?: string | null;
  order_id?: string | null;
  note?: string | null;
  created_by?: string | null;
  created_at: string;
  partner_name?: string;
  creator_name?: string;
}

export interface TradeInItemInput {
  name: string;
  category: string;
  condition: string;
  color: string;
  storage: string;
  battery_health: number;
  imei: string;
  trade_in_value: number;
  selling_price?: number;
}

export interface POSSalePayload {
  customer: {
    id?: string;
    name: string;
    phone: string;
    address?: string;
    cccd?: string;
  };
  items: {
    inventory_id: string;
    price: number;
    warranty_months: number;
  }[];
  discount: number;
  trade_in?: TradeInItemInput | null;
  paid_amount: number;
  overpaid_action?: 'refund' | 'debt';
  payment_method: PaymentMethod;
  note?: string;
}

export interface ImportOrderPayload {
  supplier: {
    id?: string;
    name: string;
    phone: string;
    address?: string;
  };
  items: {
    product_name: string;
    category: string;
    condition: ProductCondition;
    color: string;
    storage: string;
    imei: string;
    cost_price: number;
    selling_price: number;
    battery_health: number;
  }[];
  paid_amount: number;
  payment_method: PaymentMethod;
  note?: string;
}

// Attendance & Wifi IP Types
export type ShiftType = 'shift1' | 'shift2' | 'manager' | 'morning' | 'afternoon' | 'evening';

export interface ShiftConfig {
  id: ShiftType;
  name: string;
  timeRange: string; // e.g. "09:00 - 21:00"
  lunchBreak?: string; // e.g. "12:00 - 13:00"
  standardHours: number; // 11.0
  isStaffShift: boolean;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  check_in: string;
  check_out?: string | null;
  ip_address?: string | null;
  late_minutes?: number;
  early_minutes?: number;
  work_hours: number;
  ot_hours: number;
  is_off_day?: boolean;
  note?: string | null;
  status: 'present' | 'working' | 'completed';
  created_at: string;
  // Joined fields
  user_name?: string;
  user_role?: UserRole;
}

export interface EmployeeOffDay {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  week_str: string; // e.g. "2026-W38"
  created_at: string;
  user_name?: string;
}

// Payroll & Salary History Types
export interface AllowanceItem {
  id: string;
  title: string;
  amount: number;
}

export interface DeductionItem {
  id: string;
  reason: string;
  amount: number;
}

export interface MonthlyPayrollItem {
  user_id: string;
  user_name: string;
  user_role: UserRole;
  contract_type: ContractType;
  base_salary: number;
  effective_base_salary: number; // base_salary * (probation ? 0.85 : 1.0)
  standard_days: number; // 26 (30-day month) or 27 (31-day month)
  unit_daily_salary: number; // effective_base_salary / standard_days
  actual_days: number;   // Calculated from attendance (+1 if worked on registered off day)
  off_days_worked?: number;
  salary_by_days: number; // unit_daily_salary * actual_days
  ot_hours: number;      // Calculated from attendance (>21:00)
  ot_salary: number;      // (unit_daily_salary / 11) * ot_hours * 1.5
  shared_commission: number; // (total main devices / eligible staff) * 50,000
  personal_commission: number; // calculated from seller_id on orders
  main_devices_count?: number;
  allowances: AllowanceItem[];
  deductions: DeductionItem[];
  total_allowance: number;
  total_deduction: number;
  final_salary: number;
  is_locked?: boolean;
  status?: 'pending' | 'paid';
  locked_at?: string;
  note?: string;
}

export interface SalaryHistoryRecord {
  id: string;
  month: string; // YYYY-MM
  user_id: string;
  user_name: string;
  user_role: UserRole;
  contract_type?: string;
  base_salary: number;
  standard_days: number;
  actual_days: number;
  ot_hours: number;
  salary_by_days: number;
  ot_salary: number;
  shared_commission?: number;
  personal_commission?: number;
  allowances: AllowanceItem[];
  deductions: DeductionItem[];
  total_allowance: number;
  total_deduction: number;
  final_salary: number;
  status: 'pending' | 'paid';
  note?: string | null;
  locked_at: string;
  created_by?: string | null;
}

// Training & Onboarding Module Types
export type TrainingSection = 'regulations' | 'operations' | 'promotions';

export type TrainingFileType = 'pdf' | 'doc' | 'excel' | 'image' | 'video' | 'link' | 'none';

export interface TrainingMaterial {
  id: string;
  section: TrainingSection;
  title: string;
  description?: string;
  content?: string;
  file_url?: string;
  file_type?: TrainingFileType;
  file_name?: string;
  file_size?: string;
  video_url?: string;
  order_index: number;
  is_mandatory: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Progress joined fields
  is_completed?: boolean;
  completed_at?: string;
}

export interface TrainingUserProgress {
  user_id: string;
  user_name: string;
  username?: string;
  user_role: UserRole;
  contract_type?: string;
  total_materials: number;
  completed_materials: number;
  completion_percentage: number;
  last_activity?: string;
}
