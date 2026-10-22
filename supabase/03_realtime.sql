-- Bật Realtime cho báo cáo sản xuất: Dashboard / Lịch sử / Báo cáo gần đây tự cập nhật ngay
-- (Realtime vẫn tuân theo RLS: ai không có quyền xem báo cáo sẽ không nhận được dữ liệu)
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'production_reports') then
    alter publication supabase_realtime add table public.production_reports;
  end if;
end $$;
