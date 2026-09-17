import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';
import { TrainingSection, TrainingFileType } from '@/types/database';

export const dynamic = 'force-dynamic';

// Helper to auto-create tables and seed default materials if empty
async function ensureTrainingTablesExist() {
  await query(`
    CREATE TABLE IF NOT EXISTS training_materials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      section VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      content TEXT,
      file_url TEXT,
      file_type VARCHAR(50) DEFAULT 'none',
      file_name VARCHAR(255),
      file_size VARCHAR(50),
      video_url TEXT,
      order_index INT DEFAULT 0,
      is_mandatory BOOLEAN DEFAULT true,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS training_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      material_id UUID NOT NULL REFERENCES training_materials(id) ON DELETE CASCADE,
      is_completed BOOLEAN DEFAULT true,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, material_id)
    );
  `);

  // Fix any legacy mock unsplash pdf urls to real valid pdf urls
  await query(`
    UPDATE training_materials 
    SET file_url = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf'
    WHERE file_type = 'pdf' AND file_url LIKE '%unsplash.com%'
  `);

  // Check if sample data exists
  const countRes = await query(`SELECT COUNT(*) AS total FROM training_materials`);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);

  if (total === 0) {
    // Seed initial high-quality training documents for the 3 blocks
    const initialMaterials = [
      // KHỐI 1: Quy định & Tác phong làm việc
      {
        section: 'regulations',
        title: 'Nội quy Cửa hàng & Quy chuẩn Tác phong Tiếp Khách TD Mobile',
        description: 'Bộ quy tắc chuẩn 5S, tác phong chào đón, trang phục áo đen lịch sự và quy định giờ giấc chấm công 3 ca chuẩn.',
        content: `1. NỤ CƯỜI & CHÀO ĐÓN: Luôn đứng dậy, cúi chào mỉm cười "TD Mobile xin chào!" khi khách vừa bước vào cửa.\n2. TRANG PHỤC: Áo thun đen có logo TD Mobile, quần dài lịch sự, mang giày kín mũi.\n3. GIỜ GIẤC: Đến trước 10 phút ca làm để nhận bàn giao, kiểm tra vệ sinh quầy tủ và chuẩn bị tiền lẻ.\n4. ĐIỆN THOẠI CÁ NHÂN: Để chế độ rung trong giờ làm việc, không dùng điện thoại làm việc riêng khi có khách trong shop.\n5. TÍNH TRUNG THỰC: Báo đúng giá niêm yết, xuất đủ hóa đơn và bảo hành điện tử 100% đơn hàng.`,
        file_url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
        file_type: 'pdf',
        file_name: 'Noi_Quy_Va_Tac_Phong_TD_Mobile_2026.pdf',
        file_size: '1.2 MB',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        order_index: 1,
        is_mandatory: true,
      },
      {
        section: 'regulations',
        title: 'Quy trình Bàn Giao Ca, Kiểm Đếm Két Tiền & Tài Sản Cửa Hàng',
        description: 'Hướng dẫn kiểm đếm tiền mặt, kiểm tra tồn kho tủ kính và bàn giao sổ sách giữa ca Sáng - ca Chiều.',
        content: `1. Đếm tiền mặt thực tế trong két và đối soát với số dư trên phần mềm TD Mobile (Mục Sổ Quỹ).\n2. Kiểm đếm số lượng máy thực tế trong tủ trưng bày so với số lượng tồn kho trên hệ thống.\n3. Kiểm tra các đơn máy thu cũ, máy chờ kiểm tra bảo hành và ghi chú vào sổ bàn giao.\n4. Cả nhân viên ca trước và ca sau cùng ký nhận vào biên bản bàn giao.`,
        file_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop',
        file_type: 'image',
        file_name: 'Mau_Ban_Giao_Ca_Kiem_Ke_Ket_Tien.png',
        file_size: '450 KB',
        video_url: '',
        order_index: 2,
        is_mandatory: true,
      },

      // KHỐI 2: Nghiệp vụ kỹ thuật & Thao tác phần mềm POS
      {
        section: 'operations',
        title: 'Hướng dẫn Sử dụng Phần mềm POS Bán Hàng & In Hóa Đơn K80',
        description: 'Các bước chọn máy theo IMEI, áp dụng khuyến mãi, chọn phương thức thanh toán và in phiếu bảo hành.',
        content: `1. BƯỚC 1: Vào mục Bán Hàng (POS), tìm kiếm dòng máy hoặc quét/chọn đúng IMEI máy.\n2. BƯỚC 2: Nhập thông tin Khách hàng (Tên, SĐT, Địa chỉ để tra cứu bảo hành sau này).\n3. BƯỚC 3: Chọn phương thức thanh toán (Tiền mặt / Chuyển khoản / Thu cũ đổi mới).\n4. BƯỚC 4: Bấm Hoàn tất đơn -> Chọn In hóa đơn khổ K80 hoặc A5 giao cho khách.`,
        file_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1200&auto=format&fit=crop',
        file_type: 'image',
        file_name: 'Huong_Dan_Ban_Hang_POS.png',
        file_size: '1.8 MB',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        order_index: 1,
        is_mandatory: true,
      },
      {
        section: 'operations',
        title: 'Quy trình Test Máy Cũ 30 Bước Chuẩn TD Mobile Store',
        description: 'Tài liệu chi tiết các bước kiểm tra ngoại quan, màn hình TrueTone, FaceID, Camera, Pin và chức năng máy thu cũ/máy nhập.',
        content: `1. Ngoại quan: Khung viền, mặt kính, khay sim, cổng sạc, lỗ loa.\n2. Màn hình: True Tone, cảm ứng đa điểm, điểm chết, sọc phản quang.\n3. Bảo mật: FaceID / TouchID, tài khoản iCloud ẩn (reset dòng 2).\n4. Camera & Mic: Cam trước/sau, zoom quang học 0.5x 1x 3x 5x, mic thu âm video.\n5. Kết nối: Wifi, Bluetooth, sóng 4G/5G nghe gọi 2 chiều, loa thoại & loa ngoài.\n6. Pin & Hiệu năng: % Pin 3uTools/i4, chu kỳ sạc, test sạc nhanh.`,
        file_url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
        file_type: 'pdf',
        file_name: 'Quy_Trinh_Test_May_30_Buoc_Chuan.pdf',
        file_size: '820 KB',
        video_url: '',
        order_index: 2,
        is_mandatory: true,
      },

      // KHỐI 3: Chương trình đang chạy (Bảng giá, Khuyến mãi tháng)
      {
        section: 'promotions',
        title: 'Bảng Giá Niêm Yết & Chính Sách Bảo Hành Tháng 09/2026',
        description: 'Cập nhật bảng giá bán lẻ iPhone 12/13/14/15/16 Series, gói bảo hành vàng VIP 1 đổi 1 trong 12 tháng.',
        content: `1. BẢNG GIÁ MÁY 99%: iPhone 12 Pro Max (từ 11.5tr), iPhone 13 Pro Max (từ 14.8tr), iPhone 14 Pro Max (từ 18.5tr), iPhone 15 Pro Max (từ 23.5tr).\n2. GÓI BẢO HÀNH TIÊU CHUẨN: Bao test 30 ngày 1 đổi 1, bảo hành phần cứng 12 tháng.\n3. QUÀ TẶNG KÈM MỖI MÁY: Bộ sạc nhanh 20W PD, Cường lực KingKong cao cấp, Ốp lưng chống sốc, Vệ sinh máy trọn đời.`,
        file_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop',
        file_type: 'image',
        file_name: 'Bang_Gia_Khuyen_Mai_Thang_09_2026.png',
        file_size: '2.4 MB',
        video_url: '',
        order_index: 1,
        is_mandatory: true,
      },
      {
        section: 'promotions',
        title: 'Chương Trình Trợ Giá "Thu Cũ Đổi Mới Lên Đời iPhone Đến 1.500.000đ"',
        description: 'Chính sách định giá máy cũ của khách, mức trợ giá đổi máy mới và ưu đãi mua kèm phụ kiện giảm 30%.',
        content: `1. ĐIỀU KIỆN ÁP DỤNG: Khách hàng mang máy cũ bất kỳ (kể cả máy vỡ kính, chai pin) đến TD Mobile Store để lên đời máy cao hơn.\n2. MỨC TRỢ GIÁ:\n   - Lên đời iPhone 13/14 Series: Trợ giá thêm 500.000đ vào giá thu máy cũ.\n   - Lên đời iPhone 15/16 Series: Trợ giá thêm 1.000.000đ - 1.500.000đ.\n3. ƯU ĐÃI KÈM THEO: Giảm ngay 30% khi mua kèm Tai nghe Airpods hoặc Combo sạc MagSafe chính hãng.`,
        file_url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
        file_type: 'pdf',
        file_name: 'Chinh_Sach_Thu_Cu_Doi_Moi_Tro_Gia.pdf',
        file_size: '1.5 MB',
        video_url: '',
        order_index: 2,
        is_mandatory: true,
      }
    ];

    for (const item of initialMaterials) {
      await query(
        `INSERT INTO training_materials (
          section, title, description, content, file_url, file_type, file_name, file_size, video_url, order_index, is_mandatory
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          item.section,
          item.title,
          item.description,
          item.content,
          item.file_url,
          item.file_type,
          item.file_name,
          item.file_size,
          item.video_url,
          item.order_index,
          item.is_mandatory,
        ]
      );
    }
  }
}

// GET: Lấy danh sách tài liệu đào tạo kèm tiến độ hoàn thành của người dùng
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    await ensureTrainingTablesExist();

    const isManagerOrAbove = canViewSensitiveFinancials(user.role);
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section'); // 'regulations' | 'operations' | 'promotions' | 'all'

    let sql = `
      SELECT 
        tm.*,
        CASE WHEN tp.is_completed IS TRUE THEN true ELSE false END AS is_completed,
        tp.completed_at
      FROM training_materials tm
      LEFT JOIN training_progress tp ON tp.material_id = tm.id AND tp.user_id = $1
    `;
    const params: any[] = [user.id];

    if (section && section !== 'all') {
      params.push(section);
      sql += ` WHERE tm.section = $${params.length}`;
    }

    sql += ` ORDER BY tm.section ASC, tm.order_index ASC, tm.created_at DESC`;

    const res = await query(sql, params);

    // If Manager/Admin, compute progress report for all staff
    let userProgressList: any[] = [];
    if (isManagerOrAbove) {
      const allUsersRes = await query(`
        SELECT id, username, full_name, role, contract_type
        FROM users
        ORDER BY role = 'admin' DESC, role = 'owner' DESC, role = 'manager' DESC, full_name ASC
      `);

      const totalMatRes = await query(`SELECT COUNT(*) as total FROM training_materials`);
      const totalMatCount = parseInt(totalMatRes.rows[0]?.total || '0', 10);

      const progressRes = await query(`
        SELECT user_id, COUNT(*) as completed_count, MAX(completed_at) as last_activity
        FROM training_progress
        WHERE is_completed = true
        GROUP BY user_id
      `);

      const progressMap = new Map<string, any>();
      for (const p of progressRes.rows) {
        progressMap.set(p.user_id, {
          completed_count: parseInt(p.completed_count, 10),
          last_activity: p.last_activity,
        });
      }

      userProgressList = allUsersRes.rows.map((u) => {
        const p = progressMap.get(u.id) || { completed_count: 0, last_activity: null };
        const completedCount = p.completed_count;
        const pct = totalMatCount > 0 ? Math.round((completedCount / totalMatCount) * 100) : 0;
        return {
          user_id: u.id,
          user_name: u.full_name,
          username: u.username,
          user_role: u.role,
          contract_type: u.contract_type,
          total_materials: totalMatCount,
          completed_materials: completedCount,
          completion_percentage: pct,
          last_activity: p.last_activity,
        };
      });
    }

    return NextResponse.json({
      materials: res.rows,
      userProgress: userProgressList,
      isManagerOrAbove,
    });
  } catch (err: any) {
    console.error('Training GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Tạo tài liệu đào tạo mới (Admin/Quản lý)
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Chỉ Quản lý, Admin hoặc Chủ cửa hàng mới có quyền thêm tài liệu' },
        { status: 403 }
      );
    }

    await ensureTrainingTablesExist();

    const body = await request.json();
    const {
      section,
      title,
      description,
      content,
      file_url,
      file_type = 'none',
      file_name,
      file_size,
      video_url,
      order_index = 0,
      is_mandatory = true,
    } = body;

    if (!section || !title?.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng chọn khối danh mục và nhập tiêu đề bài học' },
        { status: 400 }
      );
    }

    const insertRes = await query(
      `INSERT INTO training_materials (
        section, title, description, content, file_url, file_type, file_name, file_size, video_url, order_index, is_mandatory, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        section,
        title.trim(),
        description?.trim() || null,
        content?.trim() || null,
        file_url || null,
        file_type,
        file_name || null,
        file_size || null,
        video_url?.trim() || null,
        parseInt(order_index, 10) || 0,
        is_mandatory === true,
        user.id,
      ]
    );

    return NextResponse.json({
      success: true,
      material: insertRes.rows[0],
      message: 'Đã thêm tài liệu đào tạo thành công!',
    });
  } catch (err: any) {
    console.error('Training POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Cập nhật tài liệu đào tạo HOẶC Xác nhận đã đọc & hiểu bài học
export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    await ensureTrainingTablesExist();

    const body = await request.json();
    const { action } = body;

    // 1. Action: Xác nhận đã đọc / Hủy xác nhận (Dành cho tất cả nhân viên)
    if (action === 'toggle_complete') {
      const { material_id, completed } = body;
      if (!material_id) {
        return NextResponse.json({ error: 'Thiếu material_id' }, { status: 400 });
      }

      if (completed) {
        await query(
          `INSERT INTO training_progress (user_id, material_id, is_completed, completed_at)
           VALUES ($1, $2, true, NOW())
           ON CONFLICT (user_id, material_id) DO UPDATE SET is_completed = true, completed_at = NOW()`,
          [user.id, material_id]
        );
      } else {
        await query(
          `DELETE FROM training_progress WHERE user_id = $1 AND material_id = $2`,
          [user.id, material_id]
        );
      }

      return NextResponse.json({
        success: true,
        is_completed: completed,
        message: completed
          ? 'Đã xác nhận đọc & hiểu tài liệu thành công!'
          : 'Đã hủy trạng thái hoàn thành tài liệu',
      });
    }

    // 2. Action: Chỉnh sửa nội dung tài liệu (Chỉ Admin/Quản lý)
    if (action === 'update_material') {
      if (!['admin', 'owner', 'manager'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Chỉ Quản lý, Admin hoặc Chủ cửa hàng mới có quyền chỉnh sửa tài liệu' },
          { status: 403 }
        );
      }

      const {
        id,
        section,
        title,
        description,
        content,
        file_url,
        file_type,
        file_name,
        file_size,
        video_url,
        order_index,
        is_mandatory,
      } = body;

      if (!id || !title?.trim()) {
        return NextResponse.json({ error: 'Thiếu ID hoặc tiêu đề bài học' }, { status: 400 });
      }

      await query(
        `UPDATE training_materials
         SET 
          section = COALESCE($1, section),
          title = $2,
          description = $3,
          content = $4,
          file_url = $5,
          file_type = COALESCE($6, file_type),
          file_name = $7,
          file_size = $8,
          video_url = $9,
          order_index = COALESCE($10, order_index),
          is_mandatory = COALESCE($11, is_mandatory),
          updated_at = NOW()
         WHERE id = $12`,
        [
          section,
          title.trim(),
          description?.trim() || null,
          content?.trim() || null,
          file_url || null,
          file_type,
          file_name || null,
          file_size || null,
          video_url?.trim() || null,
          order_index !== undefined ? parseInt(order_index, 10) : 0,
          is_mandatory !== undefined ? is_mandatory : true,
          id,
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Đã cập nhật bài học đào tạo thành công!',
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    console.error('Training PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa tài liệu đào tạo (Admin/Quản lý)
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Chỉ Quản lý, Admin hoặc Chủ cửa hàng mới có quyền xóa tài liệu' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id tài liệu cần xóa' }, { status: 400 });
    }

    await query(`DELETE FROM training_materials WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tài liệu đào tạo thành công!',
    });
  } catch (err: any) {
    console.error('Training DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
