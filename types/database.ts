export type UserRole = 'admin' | 'owner' | 'manager' | 'staff';

export interface User {
  id: string;
  username: string;
  password_hash?: string;
  full_name: string;
  role: UserRole;
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
  created_at: string;
  // Joined fields
  partner_name?: string;
  partner_phone?: string;
  creator_name?: string;
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

export type CashFlowType = 'thu' | 'chi';
export type CashFlowCategory = 'ban_hang' | 'nhap_hang' | 'thu_no' | 'tra_no' | 'chi_phi_khac';

export interface CashFlow {
  id: string;
  code: string;
  type: CashFlowType;
  amount: number;
  payment_method: 'cash' | 'transfer';
  category: CashFlowCategory;
  partner_id?: string | null;
  order_id?: string | null;
  note?: string | null;
  created_by?: string | null;
  created_at: string;
  // Joined fields
  partner_name?: string;
  partner_phone?: string;
  creator_name?: string;
}

export interface TradeInItemInput {
  name: string;
  category: string;
  condition: ProductCondition;
  color: string;
  storage: string;
  imei: string;
  battery_health: number;
  trade_in_value: number;
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
