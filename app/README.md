# FOMECO — Báo cáo sản xuất BTP

Web báo cáo sản lượng bán thành phẩm (BTP) theo mã hàng và công đoạn cho FOMECO.
Viết bằng **HTML / CSS / JavaScript thuần**, không cần build. Dữ liệu lưu trên **Supabase** (có phân quyền RLS và realtime).

## Chạy
- Trên mạng: mở link GitHub Pages của repo.
- Trên máy: bấm đúp `index.html` (camera quét QR trên điện thoại cần link HTTPS).

## Chức năng
| Màn hình | Quyền | Nội dung |
|---|---|---|
| Dashboard | Xem báo cáo | KPI OK/NG/%NG, nhận/chuyển/tồn BTP, biểu đồ theo ngày, tồn theo xí nghiệp — **cập nhật realtime** |
| Báo cáo tiến độ | Báo cáo tiến độ | Thủ công hoặc **quét QR** (camera điện thoại / máy quét cầm tay), cảnh báo tồn âm |
| Lịch sử báo cáo | Xem / Báo cáo | Lọc, phân trang, sửa, hủy có lý do, nhật ký, **Xem tồn BTP**, xuất Excel |
| Quản trị mã hàng | Quản lý mã hàng | Mã hàng – công đoạn, **tạo QR**, xem / tải SVG / in tem A4, nhập Excel (từ Bravo) |
| Quản trị tài khoản / vai trò / tổ chức | Quản lý tài khoản / Quản trị hệ thống | Tạo tài khoản đăng nhập bằng tên, khóa; **chỉ admin** đặt lại mật khẩu, xóa tài khoản, sửa vai trò |
| Giao diện điện thoại (công nhân) | Báo cáo tiến độ | Trang chủ ô lớn, nút QR tròn ở giữa, **Báo cáo của tôi** (chỉ thấy báo cáo mình nhập, sửa/hủy trong ngày) |

## Phân quyền 3 tầng
| Vai trò | Được làm |
|---|---|
| Quản trị hệ thống | Toàn quyền: vai trò, đặt lại mật khẩu, xóa tài khoản, tổ chức, mã hàng, báo cáo |
| Nhân viên quản lý | Tạo/sửa tài khoản công nhân, mã hàng & QR, xem toàn bộ tiến độ/dashboard, sửa/hủy báo cáo của công nhân |
| Công nhân | Nhập báo cáo (thủ công/QR); chỉ xem báo cáo của mình; sửa/hủy (có lý do) trong ngày đã nhập |
| Người xem báo cáo | Xem dashboard, lịch sử, tồn BTP |

Quyền được kiểm tra ở cả giao diện và database (RLS + hàm Supabase), file `supabase/04_phan_quyen_3_tang.sql`.

Nội dung QR: `MÃ HÀNG|MÃ CÔNG ĐOẠN` (vd. `VB-6204|NL-01`).

## Cấu trúc
```
index.html          trang duy nhất (router theo #/…)
css/app.css         giao diện
js/config.js        URL + publishable key Supabase
js/api.js           mọi lệnh gọi dữ liệu (đổi backend / nối Bravo chỉ sửa ở đây)
js/ui.js, shared.js tiện ích, modal, toast, QR, Excel
js/app.js           đăng nhập, menu, phân quyền, realtime
js/pages/*.js       từng màn hình
```
