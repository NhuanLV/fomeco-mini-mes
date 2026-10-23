-- =====================================================================
-- PHÂN QUYỀN 3 TẦNG: Quản trị hệ thống / Nhân viên quản lý / Công nhân
-- Chạy SAU 01, 02, 03 (database đang dùng). Cài mới từ đầu: chạy 01 → 02 → 03 → 04.
--  * Admin (SYSTEM_ADMIN): toàn quyền, duy nhất được đặt lại mật khẩu,
--    xóa tài khoản, sửa vai trò.
--  * Nhân viên quản lý: tạo tài khoản công nhân, quản lý mã hàng/QR,
--    xem toàn bộ tiến độ, sửa/hủy báo cáo của công nhân.
--  * Công nhân: chỉ nhập báo cáo; chỉ xem, sửa, hủy báo cáo CỦA MÌNH,
--    và chỉ trong ngày đã nhập.
-- =====================================================================

-- 1. Quyền mới ---------------------------------------------------------
insert into public.permissions (code, name, group_name, sort) values
  ('SYSTEM_ADMIN',    'Quản trị hệ thống (vai trò, đặt lại mật khẩu, xóa tài khoản)', 'Quản trị', 0),
  ('MANAGE_ACCOUNT',  'Quản lý tài khoản',  'Quản trị', 1),
  ('MANAGE_ORG',      'Quản lý tổ chức',    'Quản trị', 2),
  ('MANAGE_PRODUCT',  'Quản lý mã hàng',    'Quản trị', 3),
  ('REPORT_PROGRESS', 'Báo cáo tiến độ (nhập, sửa/hủy báo cáo của mình trong ngày)', 'Báo cáo sản xuất', 4),
  ('VIEW_REPORT',     'Xem toàn bộ báo cáo và dashboard', 'Báo cáo sản xuất', 5),
  ('MANAGE_REPORT',   'Sửa/hủy báo cáo của người khác',   'Báo cáo sản xuất', 6)
on conflict (code) do update set name = excluded.name, group_name = excluded.group_name, sort = excluded.sort;

-- 2. Hàm hỗ trợ ---------------------------------------------------------
create or replace function public.my_perms()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce((select r.permissions from public.profiles p join public.roles r on r.id = p.role_id
                   where p.id = auth.uid() and p.active), '{}');
$$;

-- Vai trò p_role_id có nằm trong quyền của người đang thao tác không
-- (nhân viên quản lý không thể tạo/sửa tài khoản có quyền cao hơn mình)
create or replace function public.role_within_mine(p_role_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_perm('SYSTEM_ADMIN')
      or p_role_id is null
      or coalesce((select not ('SYSTEM_ADMIN' = any (r.permissions)) and r.permissions <@ public.my_perms()
                   from public.roles r where r.id = p_role_id), false);
$$;

-- 3. Tài khoản ----------------------------------------------------------
create or replace function public.admin_create_account(
  p_username text, p_password text, p_full_name text, p_unit_id uuid, p_role_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.has_perm('MANAGE_ACCOUNT') then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
  end if;
  if not public.role_within_mine(p_role_id) then
    raise exception 'Bạn chỉ được tạo tài khoản có vai trò không vượt quá quyền của mình.';
  end if;
  p_username := lower(btrim(p_username));
  if p_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'Tên đăng nhập chỉ gồm chữ thường không dấu, số, dấu chấm, gạch (3–32 ký tự).';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Mật khẩu phải có ít nhất 6 ký tự.';
  end if;
  if coalesce(btrim(p_full_name), '') = '' then
    raise exception 'Vui lòng nhập họ và tên.';
  end if;
  if exists (select 1 from public.profiles where username = p_username) then
    raise exception 'Tên đăng nhập "%" đã tồn tại.', p_username;
  end if;
  v_id := public._create_auth_user(p_username, p_password, btrim(p_full_name));
  update public.profiles
     set username = p_username, full_name = btrim(p_full_name), unit_id = p_unit_id, role_id = p_role_id
   where id = v_id;
  return v_id;
end $$;

create or replace function public.admin_update_account(
  p_id uuid, p_full_name text, p_unit_id uuid, p_role_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('MANAGE_ACCOUNT') then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
  end if;
  if not public.role_within_mine((select role_id from public.profiles where id = p_id))
     or not public.role_within_mine(p_role_id) then
    raise exception 'Bạn chỉ được sửa tài khoản có vai trò không vượt quá quyền của mình.';
  end if;
  if p_id = auth.uid() and (p_active = false) then
    raise exception 'Không thể tự khóa tài khoản đang đăng nhập.';
  end if;
  if p_id = auth.uid() and p_role_id is distinct from (select role_id from public.profiles where id = p_id)
     and not public.has_perm('SYSTEM_ADMIN') then
    raise exception 'Không thể tự đổi vai trò của mình.';
  end if;
  if coalesce(btrim(p_full_name), '') = '' then
    raise exception 'Vui lòng nhập họ và tên.';
  end if;
  update public.profiles
     set full_name = btrim(p_full_name), unit_id = p_unit_id, role_id = p_role_id, active = p_active
   where id = p_id;
  update auth.users
     set banned_until = case when p_active then null else 'infinity'::timestamptz end
   where id = p_id;
end $$;

create or replace function public.admin_set_password(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.has_perm('SYSTEM_ADMIN') then
    raise exception 'Chỉ quản trị hệ thống mới được đặt lại mật khẩu.';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Mật khẩu phải có ít nhất 6 ký tự.';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_id;
end $$;

create or replace function public.admin_delete_account(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('SYSTEM_ADMIN') then
    raise exception 'Chỉ quản trị hệ thống mới được xóa tài khoản.';
  end if;
  if p_id = auth.uid() then
    raise exception 'Không thể xóa tài khoản đang đăng nhập.';
  end if;
  if exists (select 1 from public.production_reports
             where reporter_id = p_id or updated_by = p_id or cancelled_by = p_id)
     or exists (select 1 from public.item_operations where qr_created_by = p_id) then
    raise exception 'Tài khoản đã phát sinh dữ liệu báo cáo, chỉ có thể khóa tài khoản.';
  end if;
  delete from auth.users where id = p_id;
end $$;

-- 4. Báo cáo: công nhân chỉ sửa/hủy báo cáo của mình trong ngày ----------
create or replace function public.reports_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'cancelled' then
    raise exception 'Báo cáo đã hủy, không thể chỉnh sửa.';
  end if;
  if auth.uid() is not null and not public.has_perm('MANAGE_REPORT') then
    if old.reporter_id is distinct from auth.uid() then
      raise exception 'Bạn chỉ được sửa hoặc hủy báo cáo do chính mình nhập.';
    end if;
    if (old.reported_at at time zone 'Asia/Ho_Chi_Minh')::date
       <> (now() at time zone 'Asia/Ho_Chi_Minh')::date then
      raise exception 'Chỉ được sửa hoặc hủy báo cáo trong ngày đã nhập. Vui lòng liên hệ quản lý để điều chỉnh.';
    end if;
  end if;
  new.item_id := old.item_id; new.operation_id := old.operation_id; new.unit_id := old.unit_id;
  new.reporter_id := old.reporter_id; new.reported_at := old.reported_at; new.method := old.method;
  if new.status = 'cancelled' then
    if coalesce(btrim(new.cancel_reason), '') = '' then
      raise exception 'Vui lòng nhập lý do hủy báo cáo.';
    end if;
    new.ok_qty := old.ok_qty; new.ng_qty := old.ng_qty;
    new.received_qty := old.received_qty; new.transferred_qty := old.transferred_qty;
    new.cancelled_by := auth.uid(); new.cancelled_at := now();
  else
    if new.ok_qty + new.ng_qty + new.received_qty + new.transferred_qty = 0 then
      raise exception 'Vui lòng nhập ít nhất một số lượng lớn hơn 0 tại các trường OK, NG, Nhận BTP hoặc Chuyển BTP.';
    end if;
    new.cancel_reason := null; new.cancelled_by := null; new.cancelled_at := null;
    new.updated_by := auth.uid(); new.updated_at := now();
  end if;
  return new;
end $$;

-- 5. RLS ----------------------------------------------------------------
drop policy if exists roles_write on public.roles;
create policy roles_write on public.roles for all to authenticated
  using (public.has_perm('SYSTEM_ADMIN')) with check (public.has_perm('SYSTEM_ADMIN'));

drop policy if exists reports_select on public.production_reports;
create policy reports_select on public.production_reports for select to authenticated
  using (public.has_perm('VIEW_REPORT') or public.has_perm('MANAGE_REPORT') or reporter_id = auth.uid());

drop policy if exists reports_update on public.production_reports;
create policy reports_update on public.production_reports for update to authenticated
  using ((public.has_perm('MANAGE_REPORT') and (unit_id = public.my_unit_id() or public.my_unit_is_company()))
         or (public.has_perm('REPORT_PROGRESS') and reporter_id = auth.uid()))
  with check ((public.has_perm('MANAGE_REPORT') and (unit_id = public.my_unit_id() or public.my_unit_is_company()))
         or (public.has_perm('REPORT_PROGRESS') and reporter_id = auth.uid()));

drop policy if exists report_logs_select on public.report_logs;
create policy report_logs_select on public.report_logs for select to authenticated
  using (public.has_perm('VIEW_REPORT') or public.has_perm('MANAGE_REPORT')
         or exists (select 1 from public.production_reports r
                    where r.id = report_id and r.reporter_id = auth.uid()));

-- 6. Tồn BTP: công nhân chỉ dùng để cảnh báo tồn âm tại xí nghiệp của mình
create or replace function public.get_btp_stock(
  p_from timestamptz default null, p_to timestamptz default now(),
  p_unit_id uuid default null, p_item_id uuid default null)
returns table (
  unit_id uuid, unit_code text, unit_name text,
  item_id uuid, item_code text, item_name text,
  operation_id uuid, operation_code text, operation_name text, seq int,
  opening_qty bigint, received_qty bigint, transferred_qty bigint, closing_qty bigint,
  ok_qty bigint, ng_qty bigint, report_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_perm('VIEW_REPORT') or public.has_perm('MANAGE_REPORT')) then
    if not public.has_perm('REPORT_PROGRESS') then
      raise exception 'Bạn không có quyền thực hiện thao tác này.';
    end if;
    p_unit_id := public.my_unit_id();
    if p_unit_id is null then return; end if;
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'Từ ngày không được lớn hơn Đến ngày.';
  end if;
  return query
  select r.unit_id, u.code, u.name, r.item_id, i.code, i.name,
         r.operation_id, o.code, o.name, io.seq,
         coalesce(sum(r.received_qty - r.transferred_qty) filter (where p_from is not null and r.reported_at < p_from), 0)::bigint,
         coalesce(sum(r.received_qty)    filter (where p_from is null or r.reported_at >= p_from), 0)::bigint,
         coalesce(sum(r.transferred_qty) filter (where p_from is null or r.reported_at >= p_from), 0)::bigint,
         coalesce(sum(r.received_qty - r.transferred_qty), 0)::bigint,
         coalesce(sum(r.ok_qty) filter (where p_from is null or r.reported_at >= p_from), 0)::bigint,
         coalesce(sum(r.ng_qty) filter (where p_from is null or r.reported_at >= p_from), 0)::bigint,
         count(*) filter (where p_from is null or r.reported_at >= p_from)
  from public.production_reports r
  join public.org_units u  on u.id = r.unit_id
  join public.items i      on i.id = r.item_id
  join public.operations o on o.id = r.operation_id
  join public.item_operations io on io.item_id = r.item_id and io.operation_id = r.operation_id
  where r.status = 'active'
    and (p_to is null or r.reported_at <= p_to)
    and (p_unit_id is null or r.unit_id = p_unit_id)
    and (p_item_id is null or r.item_id = p_item_id)
  group by r.unit_id, u.code, u.name, r.item_id, i.code, i.name, r.operation_id, o.code, o.name, io.seq
  order by u.name, i.code, io.seq;
end $$;
revoke execute on function public.get_btp_stock(timestamptz, timestamptz, uuid, uuid) from anon, public;
grant execute on function public.get_btp_stock(timestamptz, timestamptz, uuid, uuid) to authenticated;
revoke execute on function public.role_within_mine(uuid) from anon, public;
grant execute on function public.role_within_mine(uuid) to authenticated;

-- 7. Vai trò ------------------------------------------------------------
alter table public.roles disable trigger trg_roles_protect;
update public.roles
   set permissions = '{SYSTEM_ADMIN,MANAGE_ACCOUNT,MANAGE_ORG,MANAGE_PRODUCT,REPORT_PROGRESS,VIEW_REPORT,MANAGE_REPORT}',
       description = 'Toàn quyền: phân quyền, đặt lại mật khẩu, quản lý tổ chức, mã hàng và báo cáo'
 where name = 'Quản trị hệ thống';
update public.roles
   set name = 'Công nhân', permissions = '{REPORT_PROGRESS}',
       description = 'Nhập báo cáo sản xuất; xem, sửa hoặc hủy báo cáo của chính mình trong ngày'
 where name = 'Nhân viên báo cáo'
   and not exists (select 1 from public.roles where name = 'Công nhân');
alter table public.roles enable trigger trg_roles_protect;

insert into public.roles (name, description, permissions, is_system) values
  ('Nhân viên quản lý', 'Tạo tài khoản công nhân, quản lý mã hàng và mã QR, xem tiến độ, sửa hoặc hủy báo cáo',
   '{MANAGE_ACCOUNT,MANAGE_PRODUCT,REPORT_PROGRESS,VIEW_REPORT,MANAGE_REPORT}', false),
  ('Công nhân', 'Nhập báo cáo sản xuất; xem, sửa hoặc hủy báo cáo của chính mình trong ngày', '{REPORT_PROGRESS}', false)
on conflict (name) do nothing;

-- 8. Tài khoản demo cho nhân viên quản lý (mật khẩu ngẫu nhiên, admin đặt lại)
do $$
declare v_id uuid;
begin
  if not exists (select 1 from public.profiles where username = 'quanly') then
    v_id := public._create_auth_user('quanly', encode(extensions.gen_random_bytes(12), 'hex'), 'Đỗ Quang Minh');
  end if;
  update public.profiles
     set full_name = 'Đỗ Quang Minh',
         unit_id = (select id from public.org_units where code = 'FOMECO'),
         role_id = (select id from public.roles where name = 'Nhân viên quản lý')
   where username = 'quanly';
end $$;

select r.name, r.permissions, count(p.id) as so_tai_khoan
from public.roles r left join public.profiles p on p.role_id = r.id
group by r.name, r.permissions order by r.name;
