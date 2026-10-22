# FOMECO Mini-MES — Báo cáo sản xuất BTP (demo)

Giao diện dựa trên khung **MesSource (Vue 3 + Nuxt UI + Tailwind)**, bố cục theo mockup
`fomeco-mini-mes.netlify.app` và spec *2.2. Báo cáo sản xuất*. Backend: **Supabase** (không cần server riêng).

## Chức năng
| Màn hình | Quyền | Nội dung |
|---|---|---|
| Dashboard | Xem báo cáo | KPI OK/NG/%NG, nhận/chuyển/tồn BTP, biểu đồ theo ngày, tồn theo xí nghiệp, tự cập nhật 60s |
| Quản trị tổ chức | Quản lý tổ chức | Công ty (cấp 1) / xí nghiệp (cấp 2), ngừng sử dụng |
| Quản trị tài khoản | Quản lý tài khoản | Tạo tài khoản (tên đăng nhập), gán đơn vị + vai trò, khóa, đặt lại mật khẩu |
| Quản trị vai trò | Quản lý tài khoản | 5 quyền, vai trò hệ thống không sửa được |
| Quản trị mã hàng | Quản lý mã hàng | Danh mục mã hàng–công đoạn, **tạo mã QR**, xem/tải SVG/**in tem A4**, nhập Excel (từ Bravo) |
| Báo cáo tiến độ | Báo cáo tiến độ | Thủ công / **QR (camera điện thoại hoặc máy quét cầm tay)**, cảnh báo tồn âm |
| Lịch sử báo cáo | Xem / Báo cáo tiến độ | Lọc, phân trang, sửa, hủy (có lý do), nhật ký thay đổi, **Xem tồn BTP**, xuất Excel |

Quy tắc nghiệp vụ (người báo cáo/đơn vị/thời gian tự ghi, không sửa báo cáo đã hủy, phân quyền theo đơn vị…)
được kiểm tra **trong database** (trigger + RLS), giao diện chỉ hiển thị.

## Chạy thử trên máy
```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # ra thư mục dist/ (web tĩnh, đưa lên GitHub Pages / Netlify)
```
Cấu hình Supabase trong `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` = publishable key).

## Tài khoản demo
`admin`, `nv.ck1`, `nv.vongbi`, `nv.ck2`, `nv.rendap`, `xembaocao` — mật khẩu được đặt bằng:
```sql
-- Supabase → SQL Editor (chỉ chạy được ở đây, app không gọi được hàm này)
select public.setup_password('admin', '<mật khẩu>');
```
Sau đó đăng nhập admin → Quản trị tài khoản → biểu tượng chìa khóa để đặt mật khẩu cho các tài khoản khác.

## Nội dung QR
Cố định `MÃ HÀNG|MÃ CÔNG ĐOẠN` (vd. `VB-6204|NL-01`). Máy quét cầm tay: để con trỏ ở ô "Nội dung QR" trong cửa sổ quét.

## Kết nối Bravo sau này
Mọi truy cập dữ liệu nằm trong `webapp/src/lib/api.ts`. Bảng `items`, `operations`, `org_units` có cột
`erp_code`, `source` để chương trình đồng bộ (chạy trong LAN FOMECO, đọc SQL Server chỉ-đọc) đẩy dữ liệu lên.
