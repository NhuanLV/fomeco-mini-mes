-- =====================================================================
-- DỮ LIỆU DEMO giống mockup (Công ty CP Cơ khí Phổ Yên)
-- Tài khoản được tạo với mật khẩu ngẫu nhiên. Đặt mật khẩu admin bằng:
--   select public.setup_password('admin', '<mật khẩu của bạn>');
-- rồi đăng nhập admin → Quản trị tài khoản → Đổi mật khẩu cho các tài khoản khác.
-- =====================================================================

-- Vai trò
insert into public.roles (name, description, permissions, is_system) values
  ('Quản trị hệ thống', 'Toàn quyền: phân quyền, đặt lại mật khẩu, quản lý tổ chức, mã hàng và báo cáo',
   '{SYSTEM_ADMIN,MANAGE_ACCOUNT,MANAGE_ORG,MANAGE_PRODUCT,REPORT_PROGRESS,VIEW_REPORT,MANAGE_REPORT}', true),
  ('Nhân viên quản lý', 'Tạo tài khoản công nhân, quản lý mã hàng và mã QR, xem tiến độ, sửa hoặc hủy báo cáo',
   '{MANAGE_ACCOUNT,MANAGE_PRODUCT,REPORT_PROGRESS,VIEW_REPORT,MANAGE_REPORT}', false),
  ('Công nhân', 'Nhập báo cáo sản xuất; xem, sửa hoặc hủy báo cáo của chính mình trong ngày', '{REPORT_PROGRESS}', false),
  ('Người xem báo cáo', 'Theo dõi lịch sử báo cáo sản xuất', '{VIEW_REPORT}', false)
on conflict (name) do nothing;

-- Tổ chức
insert into public.org_units (code, name, level, source) values
  ('FOMECO', 'Công ty CP Cơ khí Phổ Yên', 1, 'erp')
on conflict (code) do nothing;

insert into public.org_units (code, name, level, parent_id, source, active)
select x.code, x.name, 2, (select id from public.org_units where code = 'FOMECO'), 'erp', x.active
from (values
  ('CK1',  'Xí nghiệp Cơ khí 1',    true),
  ('CK2',  'Xí nghiệp Cơ khí 2',    true),
  ('CK3',  'Xí nghiệp Cơ khí 3',    true),
  ('VB',   'Xí nghiệp Vòng bi',     true),
  ('RD',   'Xí nghiệp Rèn dập',     true),
  ('KG',   'Xí nghiệp Khuôn gá',    true),
  ('NL',   'Xí nghiệp Nhiệt luyện', true),
  ('SC',   'Xí nghiệp Sửa chữa',    true),
  ('XK',   'Xí nghiệp Xuất khẩu',   true),
  ('KHTH', 'Kho thiết bị thu hồi',  true),
  ('KSD',  'XN Không sử dụng',      false)
) as x(code, name, active)
on conflict (code) do nothing;

-- Công đoạn
insert into public.operations (code, name, erp_code, source) values
  ('TIEN-01', 'Tiện thô',            'TIEN-01', 'erp'),
  ('TIEN-02', 'Tiện tinh',           'TIEN-02', 'erp'),
  ('TIEN-03', 'Tiện vòng bi',        'TIEN-03', 'erp'),
  ('MAI-01',  'Mài tròn',            'MAI-01',  'erp'),
  ('MAI-02',  'Mài rãnh',            'MAI-02',  'erp'),
  ('PHAY-01', 'Phay răng',           'PHAY-01', 'erp'),
  ('NL-01',   'Nhiệt luyện',         'NL-01',   'erp'),
  ('LR-01',   'Lắp ráp',             'LR-01',   'erp'),
  ('RD-01',   'Rèn phôi',            'RD-01',   'erp'),
  ('KT-01',   'Kiểm tra thành phẩm', 'KT-01',   'erp')
on conflict (code) do nothing;

-- Mã hàng
insert into public.items (code, name, erp_code, source, synced_at) values
  ('TR-125',  'Trục truyền động Ø25', 'TR-125',  'erp', now()),
  ('VB-6204', 'Vòng bi 6204',         'VB-6204', 'erp', now()),
  ('BR-028',  'Bánh răng 28 răng',    'BR-028',  'erp', now()),
  ('BC-110',  'Bạc chặn Ø110',        'BC-110',  'erp', now())
on conflict (code) do nothing;

-- Công đoạn theo mã hàng
insert into public.item_operations (item_id, operation_id, seq)
select i.id, o.id, x.seq
from (values
  ('TR-125','TIEN-01',1),('TR-125','TIEN-02',2),('TR-125','MAI-01',3),('TR-125','KT-01',4),
  ('VB-6204','TIEN-03',1),('VB-6204','NL-01',2),('VB-6204','MAI-02',3),('VB-6204','LR-01',4),
  ('BR-028','TIEN-01',1),('BR-028','PHAY-01',2),('BR-028','NL-01',3),('BR-028','KT-01',4),
  ('BC-110','RD-01',1),('BC-110','TIEN-02',2),('BC-110','KT-01',3)
) as x(item_code, op_code, seq)
join public.items i on i.code = x.item_code
join public.operations o on o.code = x.op_code
on conflict (item_id, operation_id) do nothing;

-- Tài khoản (mật khẩu ngẫu nhiên — đặt lại sau)
do $$
declare a record; v_id uuid;
begin
  for a in select * from (values
    ('admin',     'Quản trị viên',  'FOMECO', 'Quản trị hệ thống'),
    ('nv.ck1',    'Nguyễn Văn An',  'CK1',    'Công nhân'),
    ('nv.vongbi', 'Trần Thị Bình',  'VB',     'Công nhân'),
    ('xembaocao', 'Lê Minh Hải',    'FOMECO', 'Người xem báo cáo'),
    ('nv.ck2',    'Phạm Văn Hùng',  'CK2',    'Công nhân'),
    ('nv.rendap', 'Vũ Thị Lan',     'RD',     'Công nhân')
  ) as t(username, full_name, unit_code, role_name)
  loop
    select id into v_id from public.profiles where username = a.username;
    if v_id is null then
      v_id := public._create_auth_user(a.username, encode(extensions.gen_random_bytes(12), 'hex'), a.full_name);
    end if;
    update public.profiles
       set full_name = a.full_name,
           unit_id = coalesce(unit_id, (select id from public.org_units where code = a.unit_code)),
           role_id = coalesce(role_id, (select id from public.roles where name = a.role_name))
     where id = v_id;
  end loop;
end $$;

-- Báo cáo mẫu (7 ngày gần đây), chỉ thêm khi bảng trống
insert into public.production_reports
  (item_id, operation_id, unit_id, reporter_id, reported_at, method, ok_qty, ng_qty, received_qty, transferred_qty)
select i.id, o.id, p.unit_id, p.id,
       date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
         - (x.days_ago || ' days')::interval + (x.hhmm || ':00')::interval,
       x.method, x.ok, x.ng, x.rcv, x.trf
from (values
  ('nv.vongbi', 'VB-6204', 'TIEN-03', 0, '08:00', 'manual',  45,  3,  50,  40),
  ('nv.vongbi', 'VB-6204', 'NL-01',   0, '09:30', 'qr',      35,  2,  40,   0),
  ('nv.rendap', 'BC-110',  'KT-01',   1, '15:45', 'manual',  38,  2,  40,   0),
  ('nv.ck2',    'BR-028',  'NL-01',   1, '14:30', 'manual',  90,  5, 100,   0),
  ('nv.vongbi', 'VB-6204', 'NL-01',   1, '14:00', 'qr',     140,  5, 150,   0),
  ('nv.vongbi', 'VB-6204', 'TIEN-03', 1, '13:00', 'manual', 170, 10, 200, 150),
  ('nv.rendap', 'BC-110',  'TIEN-02', 1, '11:45', 'qr',      55,  2,  60,  40),
  ('nv.ck1',    'TR-125',  'KT-01',   1, '11:00', 'manual',  60,  2,  60,  30),
  ('nv.ck1',    'TR-125',  'MAI-01',  2, '16:00', 'qr',      70,  3,  80,  70),
  ('nv.ck1',    'TR-125',  'TIEN-02', 2, '10:15', 'manual',  95,  4, 100,  80),
  ('nv.ck1',    'TR-125',  'TIEN-01', 3, '09:00', 'manual', 118,  6, 120,  80),
  ('nv.rendap', 'BC-110',  'RD-01',   3, '08:30', 'manual',  75,  3,  80,  60),
  ('nv.ck2',    'BR-028',  'TIEN-01', 4, '10:00', 'qr',     130,  4, 140, 100),
  ('nv.ck2',    'BR-028',  'PHAY-01', 5, '14:20', 'manual', 100,  6, 110, 100)
) as x(username, item_code, op_code, days_ago, hhmm, method, ok, ng, rcv, trf)
join public.profiles p   on p.username = x.username
join public.items i      on i.code = x.item_code
join public.operations o on o.code = x.op_code
where not exists (select 1 from public.production_reports);

-- Tạo sẵn QR cho mã hàng VB-6204 (để thử Báo cáo QR)
update public.item_operations io
   set qr_value = i.code || '|' || o.code, qr_created_at = now(),
       qr_created_by = (select id from public.profiles where username = 'admin')
  from public.items i, public.operations o
 where i.id = io.item_id and o.id = io.operation_id and i.code = 'VB-6204' and io.qr_value is null;
