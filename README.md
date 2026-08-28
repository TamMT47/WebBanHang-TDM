# TD Mobile Store - Hệ thống Quản lý Bán hàng & Bảo hành Apple

Hệ thống Web Quản lý bán hàng, tồn kho theo mã IMEI, bảo hành, trade-in thu cũ đổi mới và sổ quỹ chuyên nghiệp dành riêng cho các dòng sản phẩm Apple (iPhone, iPad, Macbook, Airpods).

---

## 🌟 Tính Năng Nổi Bật

1. **Giao Diện Mobile-First Đa Năng**:
   - Thanh điều hướng Bottom Bar 5 Tab chuẩn KiotViet:
     - 🛒 **Bán hàng (POS)**: Tìm kiếm sản phẩm, Camera quét Barcode/QR mã IMEI, thanh toán nhanh.
     - 📦 **Kho hàng**: Quản lý từng mã IMEI độc nhất, % Pin, tình trạng máy (99%, 98%, new), tạo mẫu máy mới.
     - 🛡️ **Bảo hành**: Tra cứu thời hạn bảo hành 1 đổi 1, lịch sử mua máy theo 15 số IMEI hoặc Số điện thoại.
     - 📥 **Nhập hàng**: Nhập kho theo danh sách IMEI từ Nhà cung cấp, ghi nhận phiếu chi và công nợ NCC.
     - ⚙️ **Tiện ích**: Hub trung tâm quản lý Khách hàng, Sổ quỹ, Báo cáo doanh thu & lợi nhuận, Phân quyền tài khoản.

2. **Xử Lý Thanh Toán, Công Nợ & Tiền Thừa**:
   - **Tự động định dạng tiền tệ VND** có dấu chấm phân cách hàng nghìn (VD: `15.000.000 VNĐ`) trực tiếp theo thời gian thực khi gõ phím.
   - **Trade-in (Thu cũ đổi mới)**: Trừ tiền trực tiếp vào đơn và tự động nhập máy cũ vào kho.
   - **Xử lý tiền thừa khách đưa**:
     - *Thối lại tiền mặt*: Ghi nhận tiền thối lại cho khách, phiếu thu đúng bằng giá trị đơn hàng.
     - *Tính trừ vào công nợ*: Trừ vào nợ cũ hoặc lưu số dư thừa vào tài khoản khách.
   - **Khách trả thiếu**: Phần chênh lệch tự động ghi nhận vào công nợ khách hàng.

3. **Quản Lý Công Nợ Chuyên Sâu**:
   - Thống kê tổng tiền khách nợ cửa hàng & cửa hàng nợ nhà cung cấp.
   - Bộ lọc quá hạn công nợ (Nợ > 30 ngày, > 60 ngày, > 90 ngày cần ưu tiên thu hồi).
   - Nút 1-chạm "Thu Nợ" / "Trả Nợ" tự động cập nhật công nợ và sinh phiếu thu/chi vào Sổ Quỹ.

4. **Sổ Quỹ Thu Chi (Cash Flow)**:
   - Theo dõi dòng tiền theo Ngày, Khoảng ngày hoặc Toàn thời gian.
   - Hiển thị đầy đủ: Số dư đầu kỳ, Tổng Thu trong kỳ, Tổng Chi trong kỳ, Số dư cuối kỳ.
   - Quản lý riêng biệt Quỹ Tiền Mặt (tại két) và Quỹ Chuyển Khoản (ngân hàng).

5. **Mẫu In Hóa Đơn Khổ A4 & K80 Chuẩn**:
   - **Tên cửa hàng**: TD Mobile Store
   - **Slogan**: Giá tốt - Dịch vụ đỉnh cao
   - **Địa chỉ**: 06 Nguyễn Trãi, Phường Gò Công, Đồng Tháp
   - **Hotline / Zalo**: 0364848960
   - Đầy đủ thông tin khách hàng, bảng chi tiết IMEI, % pin, bảo hành, máy thu cũ, cam kết chất lượng và chữ ký 2 bên.

6. **Phân Quyền RBAC 4 Cấp Bậc**:
   - `admin` / `owner` / `manager`: Toàn quyền xem báo cáo doanh thu, lợi nhuận gộp, sổ quỹ.
   - `staff`: Nhân viên bán hàng, bị ẩn hoàn toàn Giá vốn (`cost_price = 0`), Lợi nhuận và Sổ quỹ.

7. **Thông Báo Telegram Tự Động**:
   - Tự động gửi tin nhắn HTML về Telegram Bot mỗi khi có đơn bán hàng mới hoặc giao dịch trade-in.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend / Backend**: Next.js 14 (App Router), React, TypeScript.
- **Styling**: TailwindCSS, Lucide Icons, Canvas Confetti.
- **Database**: PostgreSQL (Supabase Cloud) kết nối thông qua `pg.Pool`.
- **Quét mã vạch / QR**: `html5-qrcode` (Tích hợp Camera điện thoại).
- **Font chữ**: Google Fonts (`Nunito` & `Roboto Mono`).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Cài đặt dependencies:
```bash
npm install
```

### 2. Cấu hình biến môi trường:
Tạo file `.env.local` với nội dung tương tự `.env.example`:
```env
DATABASE_URL="postgresql://postgres.oowsibtlhvgtqzyenkaw:Tam04072001%40%23%24@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
JWT_SECRET="td-mobile-store-jwt-super-secret-key-2026"
TELEGRAM_BOT_TOKEN="8738371073:AAHUIUVfvJ3kyBJJ7FnjrnmUEcgFHSglzA0"
TELEGRAM_CHAT_ID="-1004286915679"
```

### 3. Chạy Migration Database (Khởi tạo CSDL Supabase):
```bash
node scripts/migrate.js
```

### 4. Khởi chạy môi trường Development:
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

---

## 🔑 Tài Khoản Demo Mặc Định

- **Admin (Quản trị viên)**: `admin` / `admin123`
- **Owner (Chủ cửa hàng)**: `owner` / `owner123`
- **Manager (Quản lý)**: `manager` / `manager123`
- **Staff (Nhân viên bán hàng)**: `staff` / `staff123`

---

© 2026 TD Mobile Store. All rights reserved.
