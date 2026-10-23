-- 05: Câu chữ đầy đủ, dễ hiểu (không viết tắt, không xưng hô)
alter table public.roles disable trigger trg_roles_protect;
update public.roles set description = 'Toàn quyền: phân quyền, đặt lại mật khẩu, quản lý tổ chức, mã hàng và báo cáo' where name = 'Quản trị hệ thống';
update public.roles set description = 'Tạo tài khoản công nhân, quản lý mã hàng và mã QR, xem tiến độ, sửa hoặc hủy báo cáo' where name = 'Nhân viên quản lý';
update public.roles set description = 'Nhập báo cáo sản xuất; xem, sửa hoặc hủy báo cáo của chính mình trong ngày' where name = 'Công nhân';
alter table public.roles enable trigger trg_roles_protect;
update public.profiles set full_name = 'Quản trị viên' where username = 'admin' and full_name = 'Admin';
select r.name, r.description, (select full_name from public.profiles where username = 'admin') as admin_name from public.roles r order by r.name;
