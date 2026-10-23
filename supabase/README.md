# FOMECO demo — Database Supabase

Project Supabase: `fomeco-mes-demo` (NhuanLV's Org, region Sydney)
URL API: https://zcevfcmpijgkaorzxxkv.supabase.co

## File
- `01_schema.sql` — bảng, trigger, RLS, view, hàm tổng hợp (chạy lại được nhiều lần)
- `02_seed_demo.sql` — dữ liệu mẫu: 3 xí nghiệp, 7 công đoạn, 3 mã hàng, 12 báo cáo

## Bảng chính
| Bảng | Nội dung |
|---|---|
| roles | admin / reporter (Nhân viên báo cáo) / viewer (Ban lãnh đạo) |
| org_units | Xí nghiệp |
| profiles | Người dùng (tự tạo khi đăng ký; mặc định role viewer, chưa có đơn vị) |
| items, operations | Mã hàng, công đoạn — có cột `erp_code`, `source` để sau đồng bộ Bravo |
| item_operations | Công đoạn thuộc mã hàng + `qr_value` (FMC\|mã hàng\|mã công đoạn) |
| production_reports | Báo cáo: OK, NG, tổng (tự tính), Nhận/Chuyển BTP, trạng thái, sửa/hủy |

## Dùng từ JS (supabase-js)
- Danh sách công đoạn theo mã hàng / tra QR: `from('v_item_operations')`
- Lịch sử báo cáo: `from('v_report_history')`
- Tạo báo cáo: `from('production_reports').insert({item_id, operation_id, method, ok_qty, ng_qty, received_qty, transferred_qty})`
  (người báo cáo, đơn vị, thời gian do database tự điền)
- Sửa: `.update({ok_qty, ng_qty, received_qty, transferred_qty}).eq('id', id)`
- Hủy: `.update({status:'cancelled', cancel_reason}).eq('id', id)`
- Tồn BTP: `rpc('get_btp_stock', {p_from, p_to, p_unit_id, p_item_id})`
- Dashboard: `rpc('get_daily_output', {p_from, p_to, p_unit_id})`

Lỗi nghiệp vụ trả về đúng câu thông báo trong spec (mục 7), hiển thị thẳng `error.message`.

## Tạo tài khoản admin
1. Authentication → Users → Add user (email + mật khẩu)
2. SQL Editor:
```sql
update public.profiles
set role_code = 'admin', unit_id = (select id from public.org_units where code = 'XN1')
where email = 'email-cua-ban@...';
```
