-- =====================================================================
-- FOMECO (demo) — Báo cáo sản xuất BTP — SCHEMA v2
-- Chạy trong Supabase → SQL Editor. Script tự xóa bản v1 (nếu có) rồi tạo lại.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- 0. XÓA BẢN CŨ -----------------------------------------------
drop view if exists public.v_report_history cascade;
drop view if exists public.v_item_operations cascade;
drop view if exists public.v_accounts cascade;
drop table if exists public.report_logs cascade;
drop table if exists public.production_reports cascade;
drop table if exists public.item_operations cascade;
drop table if exists public.operations cascade;
drop table if exists public.items cascade;
drop table if exists public.profiles cascade;
drop table if exists public.org_units cascade;
drop table if exists public.roles cascade;
drop table if exists public.permissions cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.has_perm(text) cascade;
drop function if exists public.my_unit_id() cascade;
drop function if exists public.get_btp_stock(timestamptz, timestamptz, uuid, uuid) cascade;
drop function if exists public.get_daily_output(date, date, uuid) cascade;
drop function if exists public.reports_before_insert() cascade;
drop function if exists public.reports_before_update() cascade;
drop function if exists public.item_operations_fill_qr() cascade;
drop function if exists public.touch_updated_at() cascade;

-- ---------- 1. PHÂN QUYỀN ----------------------------------------------

create table public.permissions (
  code       text primary key,
  name       text not null,
  group_name text not null,
  sort       int  not null default 0
);

insert into public.permissions (code, name, group_name, sort) values
  ('MANAGE_ACCOUNT',  'Quản lý tài khoản', 'Quản trị',          1),
  ('MANAGE_ORG',      'Quản lý tổ chức',   'Quản trị',          2),
  ('MANAGE_PRODUCT',  'Quản lý mã hàng',   'Quản trị',          3),
  ('REPORT_PROGRESS', 'Báo cáo tiến độ',   'Báo cáo sản xuất',  4),
  ('VIEW_REPORT',     'Xem báo cáo',       'Báo cáo sản xuất',  5);

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text not null default '',
  permissions text[] not null default '{}',
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.org_units (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  level      int  not null default 2 check (level in (1, 2)),
  parent_id  uuid references public.org_units(id),
  source     text not null default 'manual' check (source in ('erp', 'manual')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  full_name  text not null default '',
  unit_id    uuid references public.org_units(id),
  role_id    uuid references public.roles(id),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 2. DANH MỤC MÃ HÀNG / CÔNG ĐOẠN ---------------------------

create table public.items (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  erp_code   text,
  source     text not null default 'manual' check (source in ('erp', 'manual', 'excel')),
  active     boolean not null default true,
  synced_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operations (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  erp_code   text,
  source     text not null default 'manual' check (source in ('erp', 'manual', 'excel')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Công đoạn theo mã hàng + mã QR (nội dung QR cố định: <mã hàng>|<mã công đoạn>)
create table public.item_operations (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id) on delete cascade,
  operation_id  uuid not null references public.operations(id),
  seq           int  not null default 1,
  active        boolean not null default true,
  qr_value      text unique,
  qr_created_at timestamptz,
  qr_created_by uuid references public.profiles(id),
  unique (item_id, operation_id)
);

-- ---------- 3. BÁO CÁO SẢN XUẤT ---------------------------------------

create table public.production_reports (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.items(id),
  operation_id    uuid not null references public.operations(id),
  unit_id         uuid not null references public.org_units(id),
  reporter_id     uuid references public.profiles(id),
  reported_at     timestamptz not null default now(),
  method          text not null default 'manual' check (method in ('manual', 'qr')),
  ok_qty          int  not null default 0 check (ok_qty >= 0),
  ng_qty          int  not null default 0 check (ng_qty >= 0),
  total_qty       int  generated always as (ok_qty + ng_qty) stored,
  received_qty    int  not null default 0 check (received_qty >= 0),
  transferred_qty int  not null default 0 check (transferred_qty >= 0),
  status          text not null default 'active' check (status in ('active', 'cancelled')),
  updated_by      uuid references public.profiles(id),
  updated_at      timestamptz,
  cancelled_by    uuid references public.profiles(id),
  cancelled_at    timestamptz,
  cancel_reason   text,
  foreign key (item_id, operation_id) references public.item_operations(item_id, operation_id),
  constraint chk_any_qty check (ok_qty + ng_qty + received_qty + transferred_qty > 0),
  constraint chk_cancel_reason check (status <> 'cancelled' or coalesce(btrim(cancel_reason), '') <> '')
);
create index idx_reports_reported_at on public.production_reports (reported_at desc);
create index idx_reports_unit_item_op on public.production_reports (unit_id, item_id, operation_id);

-- Nhật ký tạo / sửa / hủy (giá trị trước và sau)
create table public.report_logs (
  id        bigint generated always as identity primary key,
  report_id uuid not null references public.production_reports(id) on delete cascade,
  action    text not null check (action in ('create', 'update', 'cancel')),
  actor_id  uuid references public.profiles(id),
  at        timestamptz not null default now(),
  before    jsonb,
  after     jsonb,
  reason    text
);
create index idx_report_logs_report on public.report_logs (report_id, at);

-- ---------- 4. HÀM PHÂN QUYỀN -----------------------------------------

create or replace function public.has_perm(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles pr
    join public.roles r on r.id = pr.role_id
    where pr.id = auth.uid() and pr.active and p = any (r.permissions)
  );
$$;

create or replace function public.my_unit_id()
returns uuid language sql stable security definer set search_path = public as $$
  select unit_id from public.profiles where id = auth.uid();
$$;

-- Tài khoản thuộc đơn vị cấp 1 (công ty) được thao tác báo cáo của mọi xí nghiệp
create or replace function public.my_unit_is_company()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select u.level = 1 from public.profiles p join public.org_units u on u.id = p.unit_id
                   where p.id = auth.uid()), false);
$$;

-- ---------- 5. TÀI KHOẢN ----------------------------------------------

-- Tự tạo profile khi có user mới (username = phần trước @ của email)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name)
  values (new.id, split_part(new.email, '@', 1),
          coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tạo tài khoản đăng nhập bằng tên đăng nhập (email nội bộ: <username>@fomeco-mes.local)
create or replace function public._create_auth_user(p_username text, p_password text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id    uuid := gen_random_uuid();
  v_email text := lower(p_username) || '@fomeco-mes.local';
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', p_full_name), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());
  return v_id;
end $$;
revoke all on function public._create_auth_user(text, text, text) from public, anon, authenticated;

create or replace function public.admin_create_account(
  p_username text, p_password text, p_full_name text, p_unit_id uuid, p_role_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.has_perm('MANAGE_ACCOUNT') then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
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
  if p_id = auth.uid() and (p_active = false) then
    raise exception 'Không thể tự khóa tài khoản đang đăng nhập.';
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
  if not public.has_perm('MANAGE_ACCOUNT') then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
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
  if not public.has_perm('MANAGE_ACCOUNT') then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
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

-- Dùng MỘT LẦN trong SQL Editor để đặt mật khẩu ban đầu cho tài khoản admin
-- Ví dụ:  select public.setup_password('admin', 'mat-khau-cua-ban');
create or replace function public.setup_password(p_username text, p_password text)
returns text language plpgsql security definer set search_path = public, extensions as $$
begin
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = (select id from public.profiles where username = lower(p_username));
  if not found then return 'Không tìm thấy tài khoản ' || p_username; end if;
  return 'Đã đặt mật khẩu cho ' || p_username;
end $$;
revoke all on function public.setup_password(text, text) from public, anon, authenticated;

-- Hệ thống: không cho sửa/xóa vai trò hệ thống
create or replace function public.roles_protect_system()
returns trigger language plpgsql as $$
begin
  if old.is_system then
    raise exception 'Đây là vai trò hệ thống, không thể chỉnh sửa hoặc xóa.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger trg_roles_protect before update or delete on public.roles
  for each row execute function public.roles_protect_system();

-- ---------- 6. MÃ HÀNG / QR -------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger trg_items_touch before update on public.items
  for each row execute function public.touch_updated_at();

-- Tạo mã QR cho các công đoạn của 1 mã hàng (null = tất cả công đoạn)
create or replace function public.create_qr_codes(p_item_id uuid, p_operation_ids uuid[] default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.has_perm('MANAGE_PRODUCT') then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
  end if;
  update public.item_operations io
     set qr_value = i.code || '|' || o.code, qr_created_at = now(), qr_created_by = auth.uid()
    from public.items i, public.operations o
   where io.item_id = p_item_id and i.id = io.item_id and o.id = io.operation_id
     and io.qr_value is null
     and (p_operation_ids is null or io.operation_id = any (p_operation_ids));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Nhập danh mục từ Excel (dữ liệu xuất từ Bravo):
-- [{item_code, item_name, op_code, op_name, seq}, ...]
create or replace function public.import_catalog(p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; v_item uuid; v_op uuid; n_links int := 0;
begin
  if not public.has_perm('MANAGE_PRODUCT') then
    raise exception 'Bạn không có quyền thực hiện thao tác này.';
  end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if coalesce(btrim(r ->> 'item_code'), '') = '' or coalesce(btrim(r ->> 'op_code'), '') = '' then
      continue;
    end if;
    insert into public.items (code, name, erp_code, source)
    values (btrim(r ->> 'item_code'), coalesce(nullif(btrim(r ->> 'item_name'), ''), btrim(r ->> 'item_code')),
            btrim(r ->> 'item_code'), 'excel')
    on conflict (code) do update set name = excluded.name, synced_at = now()
    returning id into v_item;
    insert into public.operations (code, name, erp_code, source)
    values (btrim(r ->> 'op_code'), coalesce(nullif(btrim(r ->> 'op_name'), ''), btrim(r ->> 'op_code')),
            btrim(r ->> 'op_code'), 'excel')
    on conflict (code) do update set name = excluded.name
    returning id into v_op;
    insert into public.item_operations (item_id, operation_id, seq)
    values (v_item, v_op, coalesce((r ->> 'seq')::int, 1))
    on conflict (item_id, operation_id) do update set seq = excluded.seq;
    n_links := n_links + 1;
  end loop;
  return jsonb_build_object('rows', n_links);
end $$;

-- ---------- 7. TRIGGER BÁO CÁO ----------------------------------------

create or replace function public.reports_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_unit uuid;
begin
  if new.item_id is null then raise exception 'Vui lòng chọn mã hàng.'; end if;
  if new.operation_id is null then raise exception 'Vui lòng chọn công đoạn.'; end if;
  if not exists (select 1 from public.item_operations
                 where item_id = new.item_id and operation_id = new.operation_id) then
    raise exception 'Công đoạn không thuộc mã hàng đã chọn. Vui lòng chọn lại.';
  end if;
  if coalesce(new.ok_qty, 0) + coalesce(new.ng_qty, 0)
     + coalesce(new.received_qty, 0) + coalesce(new.transferred_qty, 0) = 0 then
    raise exception 'Vui lòng nhập ít nhất một số lượng lớn hơn 0 tại các trường OK, NG, Nhận BTP hoặc Chuyển BTP.';
  end if;
  if auth.uid() is not null then
    select unit_id into v_unit from public.profiles where id = auth.uid();
    if v_unit is null then
      raise exception 'Tài khoản chưa được phân công đơn vị. Vui lòng liên hệ quản trị viên.';
    end if;
    new.reporter_id := auth.uid();
    new.unit_id     := v_unit;
    new.reported_at := now();
  end if;
  new.status := 'active';
  new.updated_by := null; new.updated_at := null;
  new.cancelled_by := null; new.cancelled_at := null; new.cancel_reason := null;
  return new;
end $$;
create trigger trg_reports_before_insert before insert on public.production_reports
  for each row execute function public.reports_before_insert();

create or replace function public.reports_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'cancelled' then
    raise exception 'Báo cáo đã hủy, không thể chỉnh sửa.';
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
create trigger trg_reports_before_update before update on public.production_reports
  for each row execute function public.reports_before_update();

create or replace function public.reports_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare q_old jsonb; q_new jsonb;
begin
  q_new := jsonb_build_object('ok', new.ok_qty, 'ng', new.ng_qty,
                              'received', new.received_qty, 'transferred', new.transferred_qty);
  if tg_op = 'INSERT' then
    insert into public.report_logs (report_id, action, actor_id, after)
    values (new.id, 'create', coalesce(auth.uid(), new.reporter_id), q_new);
  else
    q_old := jsonb_build_object('ok', old.ok_qty, 'ng', old.ng_qty,
                                'received', old.received_qty, 'transferred', old.transferred_qty);
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      insert into public.report_logs (report_id, action, actor_id, before, reason)
      values (new.id, 'cancel', auth.uid(), q_old, new.cancel_reason);
    elsif q_old <> q_new then
      insert into public.report_logs (report_id, action, actor_id, before, after)
      values (new.id, 'update', auth.uid(), q_old, q_new);
    end if;
  end if;
  return null;
end $$;
create trigger trg_reports_after_write after insert or update on public.production_reports
  for each row execute function public.reports_after_write();

-- ---------- 8. RLS ------------------------------------------------------

alter table public.permissions        enable row level security;
alter table public.roles              enable row level security;
alter table public.org_units          enable row level security;
alter table public.profiles           enable row level security;
alter table public.items              enable row level security;
alter table public.operations         enable row level security;
alter table public.item_operations    enable row level security;
alter table public.production_reports enable row level security;
alter table public.report_logs        enable row level security;

create policy permissions_select on public.permissions for select to authenticated using (true);

create policy roles_select on public.roles for select to authenticated using (true);
create policy roles_write  on public.roles for all to authenticated
  using (public.has_perm('MANAGE_ACCOUNT')) with check (public.has_perm('MANAGE_ACCOUNT'));

create policy org_units_select on public.org_units for select to authenticated using (true);
create policy org_units_write  on public.org_units for all to authenticated
  using (public.has_perm('MANAGE_ORG')) with check (public.has_perm('MANAGE_ORG'));

-- Profiles chỉ đọc; thay đổi qua các hàm admin_*
create policy profiles_select on public.profiles for select to authenticated using (true);

create policy items_select on public.items for select to authenticated using (true);
create policy items_write  on public.items for all to authenticated
  using (public.has_perm('MANAGE_PRODUCT')) with check (public.has_perm('MANAGE_PRODUCT'));

create policy operations_select on public.operations for select to authenticated using (true);
create policy operations_write  on public.operations for all to authenticated
  using (public.has_perm('MANAGE_PRODUCT')) with check (public.has_perm('MANAGE_PRODUCT'));

create policy item_operations_select on public.item_operations for select to authenticated using (true);
create policy item_operations_write  on public.item_operations for all to authenticated
  using (public.has_perm('MANAGE_PRODUCT')) with check (public.has_perm('MANAGE_PRODUCT'));

create policy reports_select on public.production_reports for select to authenticated
  using (public.has_perm('VIEW_REPORT') or public.has_perm('REPORT_PROGRESS'));
create policy reports_insert on public.production_reports for insert to authenticated
  with check (public.has_perm('REPORT_PROGRESS'));
create policy reports_update on public.production_reports for update to authenticated
  using (public.has_perm('REPORT_PROGRESS') and (unit_id = public.my_unit_id() or public.my_unit_is_company()))
  with check (public.has_perm('REPORT_PROGRESS') and (unit_id = public.my_unit_id() or public.my_unit_is_company()));

create policy report_logs_select on public.report_logs for select to authenticated
  using (public.has_perm('VIEW_REPORT') or public.has_perm('REPORT_PROGRESS'));

-- ---------- 9. VIEW & HÀM TỔNG HỢP ------------------------------------

create view public.v_accounts with (security_invoker = true) as
select p.id, p.username, p.full_name, p.active, p.created_at,
       p.unit_id, u.code as unit_code, u.name as unit_name, u.level as unit_level,
       p.role_id, r.name as role_name, r.permissions
from public.profiles p
left join public.org_units u on u.id = p.unit_id
left join public.roles r on r.id = p.role_id;

create view public.v_item_operations with (security_invoker = true) as
select io.id, io.item_id, i.code as item_code, i.name as item_name, i.source as item_source,
       io.operation_id, o.code as operation_code, o.name as operation_name,
       io.seq, io.qr_value, io.qr_created_at, qp.full_name as qr_created_by_name,
       (io.active and i.active and o.active) as active
from public.item_operations io
join public.items i on i.id = io.item_id
join public.operations o on o.id = io.operation_id
left join public.profiles qp on qp.id = io.qr_created_by;

create view public.v_report_history with (security_invoker = true) as
select r.id, r.reported_at, r.method, r.status,
       r.unit_id, u.code as unit_code, u.name as unit_name,
       r.item_id, i.code as item_code, i.name as item_name,
       r.operation_id, o.code as operation_code, o.name as operation_name,
       r.ok_qty, r.ng_qty, r.total_qty, r.received_qty, r.transferred_qty,
       r.reporter_id, pr.full_name as reporter_name,
       r.updated_at, pu.full_name as updated_by_name,
       r.cancelled_at, pc.full_name as cancelled_by_name, r.cancel_reason
from public.production_reports r
join public.org_units u  on u.id = r.unit_id
join public.items i      on i.id = r.item_id
join public.operations o on o.id = r.operation_id
left join public.profiles pr on pr.id = r.reporter_id
left join public.profiles pu on pu.id = r.updated_by
left join public.profiles pc on pc.id = r.cancelled_by;

-- Tồn BTP = Nhận − Chuyển (có số dư đầu kỳ), bỏ qua báo cáo đã hủy
create or replace function public.get_btp_stock(
  p_from timestamptz default null, p_to timestamptz default now(),
  p_unit_id uuid default null, p_item_id uuid default null)
returns table (
  unit_id uuid, unit_code text, unit_name text,
  item_id uuid, item_code text, item_name text,
  operation_id uuid, operation_code text, operation_name text, seq int,
  opening_qty bigint, received_qty bigint, transferred_qty bigint, closing_qty bigint,
  ok_qty bigint, ng_qty bigint, report_count bigint)
language plpgsql stable security invoker set search_path = public as $$
begin
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

-- Sản lượng theo ngày (giờ Việt Nam) cho Dashboard
create or replace function public.get_daily_output(
  p_from date, p_to date, p_unit_id uuid default null)
returns table (day date, unit_id uuid, unit_name text,
               ok_qty bigint, ng_qty bigint, total_qty bigint,
               received_qty bigint, transferred_qty bigint, report_count bigint)
language plpgsql stable security invoker set search_path = public as $$
begin
  if p_from > p_to then raise exception 'Từ ngày không được lớn hơn Đến ngày.'; end if;
  return query
  select (r.reported_at at time zone 'Asia/Ho_Chi_Minh')::date as d, r.unit_id, u.name,
         sum(r.ok_qty)::bigint, sum(r.ng_qty)::bigint, sum(r.total_qty)::bigint,
         sum(r.received_qty)::bigint, sum(r.transferred_qty)::bigint, count(*)::bigint
  from public.production_reports r
  join public.org_units u on u.id = r.unit_id
  where r.status = 'active'
    and (r.reported_at at time zone 'Asia/Ho_Chi_Minh')::date between p_from and p_to
    and (p_unit_id is null or r.unit_id = p_unit_id)
  group by d, r.unit_id, u.name
  order by d, u.name;
end $$;

revoke execute on function public.get_btp_stock(timestamptz, timestamptz, uuid, uuid) from anon, public;
revoke execute on function public.get_daily_output(date, date, uuid) from anon, public;
revoke execute on function public.admin_create_account(text, text, text, uuid, uuid) from anon, public;
revoke execute on function public.admin_update_account(uuid, text, uuid, uuid, boolean) from anon, public;
revoke execute on function public.admin_set_password(uuid, text) from anon, public;
revoke execute on function public.admin_delete_account(uuid) from anon, public;
revoke execute on function public.create_qr_codes(uuid, uuid[]) from anon, public;
revoke execute on function public.import_catalog(jsonb) from anon, public;
grant execute on function public.get_btp_stock(timestamptz, timestamptz, uuid, uuid) to authenticated;
grant execute on function public.get_daily_output(date, date, uuid) to authenticated;
grant execute on function public.admin_create_account(text, text, text, uuid, uuid) to authenticated;
grant execute on function public.admin_update_account(uuid, text, uuid, uuid, boolean) to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_account(uuid) to authenticated;
grant execute on function public.create_qr_codes(uuid, uuid[]) to authenticated;
grant execute on function public.import_catalog(jsonb) to authenticated;

-- Tạo lại profile cho tài khoản đã có (khi chạy lại script)
insert into public.profiles (id, username, full_name)
select id, split_part(email, '@', 1), coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
from auth.users
on conflict do nothing;
