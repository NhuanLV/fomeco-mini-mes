-- =====================================================================
-- 06: DỮ LIỆU THẬT – 5 MÃ HÀNG TIÊU BIỂU (nguồn: danh mục Bravo "kiểu trình bay2.csv", 23/10/2026)
--   1.2.01.0106 FRAME HA (15 công đoạn)            → Xí nghiệp Cơ khí 1 (nv.ck1)
--   1.4.03.0283 RACE, STEERING INNER LOWER (12)    → Xí nghiệp Vòng bi (nv.vongbi)
--   1.2.01.0175 Floor Support BB-H300(F) (11)      → Xí nghiệp Cơ khí 2 (nv.ck2)
--   1.1.04.0029 Nắp đậy 13001-74009 CAP (10)       → Xí nghiệp Rèn dập (nv.rendap)
--   1.1.06.0004 4393154701 NT-INS/M6/041 (7)       → Xí nghiệp Cơ khí 1 (nv.ck1)
-- Lưu ý:
--   * Thứ tự công đoạn (seq) là TẠM SẮP theo lô-gic sản xuất, vì file nguồn xếp theo chữ cái.
--     Cần xác nhận lại với quy trình công nghệ / FactBOM.
--   * Công đoạn chưa có mã trên ERP được đặt mã tạm "TAM-…" (source = 'manual').
--   * Báo cáo sản xuất là dữ liệu MÔ PHỎNG 21 ngày gần nhất (trừ Chủ nhật), có dòng chảy
--     nhận/chuyển giữa các công đoạn; dữ liệu mẫu cũ được sao lưu vào schema demo_backup.
-- Chạy lại được: phần danh mục dùng on conflict; phần báo cáo xóa báo cáo của 5 mã rồi tạo lại.
-- =====================================================================

-- ---------- 1. Công đoạn ----------
insert into public.operations (code, name, erp_code, source) values
  ('NVT',   'Công đoạn nhập vật tư',      'NVT',   'erp'),
  ('CDCD',  'Công đoạn cắt đoạn',         'CDCD',  'erp'),
  ('CBDT',  'Cắt bao + Đột lỗ',           'CBDT',  'erp'),
  ('TARO',  'Ta rô ren 9/16-18',          'TARO',  'erp'),
  ('CDCTD', 'Công đoạn chi tiết đơn',     'CDCTD', 'erp'),
  ('CDHHC', 'Công đoạn Hàn hoàn chỉnh',   'CDHHC', 'erp'),
  ('CDPB',  'Công đoạn phun bi',          'CDPB',  'erp'),
  ('LR',    'Lắp ráp',                    'LR',    'erp'),
  ('BGNK',  'Bao gói, nhập kho',          'BGNK',  'erp'),
  ('TTC',   'Tiện tạo chuẩn',             'TTC',   'erp'),
  ('TTHRL', 'Tiện thô R lăn',             'TTHRL', 'erp'),
  ('XLN',   'Xử lý nhiệt',                'XLN',   'erp'),
  ('PBI',   'Phun bi',                    'PBI, PHUNBI', 'erp'),
  ('TR',    'Tẩy rửa',                    'TR',    'erp'),
  ('TNTC',  'Tiện ngoài tạo chuẩn',       'TNTC',  'erp'),
  ('SV',    'Công đoạn sửa via',          'SV',    'erp'),
  ('TRM6',  'Taro ren, làm sạch ren M6X1','TRM6',  'erp'),
  ('TAM-CHONTOP',  'Công đoạn chồn tóp',                              null, 'manual'),
  ('TAM-KHOAN65',  'Khoan lỗ F6.5',                                   null, 'manual'),
  ('TAM-VMLO',     'Công đoạn vát mép lỗ',                            null, 'manual'),
  ('TAM-TAROM16',  'Ta ro M16',                                       null, 'manual'),
  ('TAM-LAMNGUOI', 'Công đoạn làm nguội sản phẩm',                    null, 'manual'),
  ('TAM-LAMSACH',  'Làm sạch',                                        null, 'manual'),
  ('TAM-KMTBTRL',  'Khỏa mặt, tiện bán tinh R lăn',                   null, 'manual'),
  ('TAM-KMTNVM',   'Khỏa mặt, tiện ngoài, vát mép',                   null, 'manual'),
  ('TAM-TR5N',     'Tiện R5 ngoài',                                   null, 'manual'),
  ('TAM-TTRL',     'Tiện tinh R lăn',                                 null, 'manual'),
  ('TAM-MT2MD',    'Mài tinh 2 mặt đầu',                              null, 'manual'),
  ('TAM-MVTT',     'Mài vô tâm tinh',                                 null, 'manual'),
  ('TAM-TBF202',   'Tiện bậc F20.2',                                  null, 'manual'),
  ('TAM-TAROM12',  'Ta ro M12x1.75',                                  null, 'manual'),
  ('TAM-SONDAC',   'Sơn Dacromet',                                    null, 'manual'),
  ('TAM-BANRENM12','Bắn lại ren M12',                                 null, 'manual'),
  ('TAM-KMBDA',    'Khỏa mặt + Tiện biên dạng đầu A',                 null, 'manual'),
  ('TAM-KMBDR',    'Khỏa mặt + Tiện biên dạng + Tiện rãnh',           null, 'manual'),
  ('TAM-KMTBT',    'Khỏa mặt, tiện bán tinh',                         null, 'manual'),
  ('TAM-CANREN',   'Cán ren M25x1-6g',                                null, 'manual'),
  ('TAM-NHUOMDEN', 'Công đoạn nhuộm đen',                             null, 'manual'),
  ('TAM-KMTNN',    'Khoả mặt, tiện nền nhám',                         null, 'manual'),
  ('TAM-CANNHAM',  'Cán nhám',                                        null, 'manual'),
  ('TAM-KMKL',     'Khoả mặt, tiện F14, khoan F5.2, tiện lỗ F6.2',    null, 'manual'),
  ('TAM-MVTF10',   'Mài vô tâm F10',                                  null, 'manual')
on conflict (code) do update set name = excluded.name, erp_code = excluded.erp_code,
                                 source = excluded.source, active = true;

-- ---------- 2. Mã hàng ----------
insert into public.items (code, name, erp_code, source, synced_at) values
  ('1.2.01.0106', 'FRAME HA',                                    '1.2.01.0106', 'erp', now()),
  ('1.4.03.0283', '50302-SYM-50CC / RACE, STEERING INNER LOWER', '1.4.03.0283', 'erp', now()),
  ('1.2.01.0175', 'Floor Support BB-H300(F)',                    '1.2.01.0175', 'erp', now()),
  ('1.1.04.0029', 'Nắp đậy 13001-74009 (CAP)',                   '1.1.04.0029', 'erp', now()),
  ('1.1.06.0004', '4393154701 (NT-INS/M6/041)',                  '1.1.06.0004', 'erp', now())
on conflict (code) do update set name = excluded.name, active = true, synced_at = now();

-- ---------- 3. Công đoạn theo mã hàng (thứ tự tạm sắp) ----------
delete from public.item_operations io using public.items i
 where i.id = io.item_id and i.code in ('1.2.01.0106','1.4.03.0283','1.2.01.0175','1.1.04.0029','1.1.06.0004')
   and not exists (select 1 from public.production_reports r where r.item_id = io.item_id and r.operation_id = io.operation_id);

insert into public.item_operations (item_id, operation_id, seq, qr_value, qr_created_at)
select i.id, o.id, x.seq, i.code || '|' || o.code, now()
from (values
  ('1.2.01.0106','NVT',1),('1.2.01.0106','CDCD',2),('1.2.01.0106','CBDT',3),('1.2.01.0106','TAM-CHONTOP',4),
  ('1.2.01.0106','TAM-KHOAN65',5),('1.2.01.0106','TAM-VMLO',6),('1.2.01.0106','TARO',7),('1.2.01.0106','TAM-TAROM16',8),
  ('1.2.01.0106','CDCTD',9),('1.2.01.0106','CDHHC',10),('1.2.01.0106','TAM-LAMNGUOI',11),('1.2.01.0106','CDPB',12),
  ('1.2.01.0106','TAM-LAMSACH',13),('1.2.01.0106','LR',14),('1.2.01.0106','BGNK',15),

  ('1.4.03.0283','NVT',1),('1.4.03.0283','TTC',2),('1.4.03.0283','TTHRL',3),('1.4.03.0283','TAM-KMTBTRL',4),
  ('1.4.03.0283','TAM-KMTNVM',5),('1.4.03.0283','TAM-TR5N',6),('1.4.03.0283','TAM-TTRL',7),('1.4.03.0283','XLN',8),
  ('1.4.03.0283','PBI',9),('1.4.03.0283','TAM-MT2MD',10),('1.4.03.0283','TAM-MVTT',11),('1.4.03.0283','TR',12),

  ('1.2.01.0175','NVT',1),('1.2.01.0175','CDCD',2),('1.2.01.0175','CBDT',3),('1.2.01.0175','TAM-CHONTOP',4),
  ('1.2.01.0175','TAM-TBF202',5),('1.2.01.0175','TAM-TAROM12',6),('1.2.01.0175','CDHHC',7),('1.2.01.0175','CDPB',8),
  ('1.2.01.0175','TAM-SONDAC',9),('1.2.01.0175','TAM-BANRENM12',10),('1.2.01.0175','BGNK',11),

  ('1.1.04.0029','NVT',1),('1.1.04.0029','TNTC',2),('1.1.04.0029','TAM-KMBDA',3),('1.1.04.0029','TAM-KMBDR',4),
  ('1.1.04.0029','TAM-KMTBT',5),('1.1.04.0029','TAM-CANREN',6),('1.1.04.0029','SV',7),('1.1.04.0029','PBI',8),
  ('1.1.04.0029','TAM-NHUOMDEN',9),('1.1.04.0029','BGNK',10),

  ('1.1.06.0004','TAM-KMTNN',1),('1.1.06.0004','TAM-CANNHAM',2),('1.1.06.0004','TAM-KMKL',3),('1.1.06.0004','TRM6',4),
  ('1.1.06.0004','TAM-MVTF10',5),('1.1.06.0004','PBI',6),('1.1.06.0004','BGNK',7)
) as x(item_code, op_code, seq)
join public.items i on i.code = x.item_code
join public.operations o on o.code = x.op_code
on conflict (item_id, operation_id) do update set seq = excluded.seq, active = true,
  qr_value = excluded.qr_value, qr_created_at = coalesce(public.item_operations.qr_created_at, excluded.qr_created_at);

-- ---------- 4. Sao lưu và gỡ dữ liệu mẫu cũ ----------
create schema if not exists demo_backup;
do $$ begin
  if to_regclass('demo_backup.production_reports_truoc_06') is null then
    create table demo_backup.production_reports_truoc_06 as select * from public.production_reports;
    create table demo_backup.report_logs_truoc_06 as select * from public.report_logs;
  end if;
end $$;
delete from public.production_reports r using public.items i
 where i.id = r.item_id and i.code not in ('1.2.01.0106','1.4.03.0283','1.2.01.0175','1.1.04.0029','1.1.06.0004');
update public.items set active = false
 where code not in ('1.2.01.0106','1.4.03.0283','1.2.01.0175','1.1.04.0029','1.1.06.0004');

-- ---------- 5. Báo cáo mô phỏng 21 ngày ----------
do $$
declare
  p record; ops uuid[]; n int; d date; k int; t0 date; t1 date;
  stock int[]; pending int[]; rec int; proc int; ng int; ok int; batch int;
  v_unit uuid; v_rep uuid; v_item uuid; v_at timestamptz; ngr numeric;
begin
  perform setseed(0.2026);
  t1 := (now() at time zone 'Asia/Ho_Chi_Minh')::date;   -- gồm cả hôm nay
  t0 := t1 - 20;
  delete from public.production_reports r using public.items i
   where i.id = r.item_id and i.code in ('1.2.01.0106','1.4.03.0283','1.2.01.0175','1.1.04.0029','1.1.06.0004');

  for p in select * from (values
      ('1.2.01.0106', 'nv.ck1',    60, 0.025),
      ('1.4.03.0283', 'nv.vongbi', 220, 0.035),
      ('1.2.01.0175', 'nv.ck2',    90, 0.020),
      ('1.1.04.0029', 'nv.rendap', 150, 0.030),
      ('1.1.06.0004', 'nv.ck1',    300, 0.015)) as t(code, username, base, ngbase)
  loop
    select id into v_item from public.items where code = p.code;
    select id, unit_id into v_rep, v_unit from public.profiles where username = p.username;
    select array_agg(operation_id order by seq) into ops from public.item_operations where item_id = v_item;
    n := array_length(ops, 1);
    stock := array_fill(0, array[n]); pending := array_fill(0, array[n]);
    d := t0;
    while d <= t1 loop
      if extract(dow from d) <> 0 then
        batch := round(p.base * (0.75 + random() * 0.5));
        for k in 1..n loop
          v_at := ((d + time '07:20' + make_interval(mins => k * 22 + floor(random() * 40)::int))
                   at time zone 'Asia/Ho_Chi_Minh');
          exit when v_at > now();                                   -- hôm nay: chỉ tạo báo cáo đã tới giờ
          rec := case when k = 1 then batch else pending[k] end;
          pending[k] := 0;
          stock[k] := stock[k] + rec;
          proc := floor(stock[k] * (0.72 + random() * 0.23));
          ngr := p.ngbase * (0.3 + random() * 1.4);
          if random() < 0.05 then ngr := ngr * 3; end if;           -- vài ngày tỷ lệ lỗi cao
          ng := least(proc, round(proc * ngr));
          ok := proc - ng;
          stock[k] := stock[k] - proc;
          if k < n then pending[k + 1] := pending[k + 1] + ok; end if;  -- công đoạn sau nhận vào ngày kế tiếp
          if rec + proc > 0 then
            insert into public.production_reports
              (item_id, operation_id, unit_id, reporter_id, reported_at, method, ok_qty, ng_qty, received_qty, transferred_qty)
            values (v_item, ops[k], v_unit, v_rep, v_at,
                    case when random() < 0.6 then 'qr' else 'manual' end,
                    ok, ng, rec, ok);
          end if;
        end loop;
      end if;
      d := d + 1;
    end loop;
  end loop;
end $$;

-- nhật ký "tạo" lấy đúng thời điểm báo cáo mô phỏng
update public.report_logs l set at = r.reported_at
  from public.production_reports r join public.items i on i.id = r.item_id
 where l.report_id = r.id and l.action = 'create'
   and i.code in ('1.2.01.0106','1.4.03.0283','1.2.01.0175','1.1.04.0029','1.1.06.0004');

-- ---------- 6. Kiểm tra nhanh ----------
select i.code, i.name, count(distinct io.operation_id) as so_cong_doan, count(r.id) as so_bao_cao,
       sum(r.ok_qty) as tong_dat, sum(r.ng_qty) as tong_khong_dat
from public.items i
join public.item_operations io on io.item_id = i.id
left join public.production_reports r on r.item_id = i.id and r.operation_id = io.operation_id and r.status = 'active'
where i.active
group by i.code, i.name order by i.code;
