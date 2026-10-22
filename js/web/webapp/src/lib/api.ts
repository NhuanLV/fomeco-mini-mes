// Tầng dữ liệu: mọi lệnh gọi Supabase nằm ở đây.
// Sau này nối Bravo / đổi backend chỉ cần sửa file này.
import { supabase, unwrap } from './supabase'
import type {
  Account,
  DailyRow,
  Item,
  ItemOperation,
  Operation,
  OrgUnit,
  Permission,
  ReportLog,
  ReportMethod,
  ReportRow,
  ReportStatus,
  Role,
  StockRow,
} from './types'

// ---------- Tài khoản / phân quyền ----------

export async function getMyAccount(userId: string): Promise<Account | null> {
  return unwrap(await supabase.from('v_accounts').select('*').eq('id', userId).maybeSingle())
}

export async function listAccounts(): Promise<Account[]> {
  return unwrap(await supabase.from('v_accounts').select('*').order('full_name'))
}

export async function createAccount(input: {
  username: string
  password: string
  fullName: string
  unitId: string | null
  roleId: string | null
}) {
  return unwrap(
    await supabase.rpc('admin_create_account', {
      p_username: input.username,
      p_password: input.password,
      p_full_name: input.fullName,
      p_unit_id: input.unitId,
      p_role_id: input.roleId,
    }),
  )
}

export async function updateAccount(input: {
  id: string
  fullName: string
  unitId: string | null
  roleId: string | null
  active: boolean
}) {
  unwrap(
    await supabase.rpc('admin_update_account', {
      p_id: input.id,
      p_full_name: input.fullName,
      p_unit_id: input.unitId,
      p_role_id: input.roleId,
      p_active: input.active,
    }),
  )
}

export async function setAccountPassword(id: string, password: string) {
  unwrap(await supabase.rpc('admin_set_password', { p_id: id, p_password: password }))
}

export async function deleteAccount(id: string) {
  unwrap(await supabase.rpc('admin_delete_account', { p_id: id }))
}

export async function changeMyPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

export async function listPermissions(): Promise<Permission[]> {
  return unwrap(await supabase.from('permissions').select('*').order('sort'))
}

export async function listRoles(): Promise<Role[]> {
  return unwrap(await supabase.from('roles').select('*').order('name'))
}

export async function saveRole(role: Partial<Role> & Pick<Role, 'name' | 'description' | 'permissions'>) {
  const payload = { name: role.name, description: role.description, permissions: role.permissions }
  if (role.id) unwrap(await supabase.from('roles').update(payload).eq('id', role.id))
  else unwrap(await supabase.from('roles').insert(payload))
}

export async function deleteRole(id: string) {
  unwrap(await supabase.from('roles').delete().eq('id', id))
}

// ---------- Tổ chức ----------

export async function listOrgUnits(): Promise<OrgUnit[]> {
  return unwrap(await supabase.from('org_units').select('*').order('level').order('name'))
}

export async function saveOrgUnit(unit: Partial<OrgUnit> & Pick<OrgUnit, 'code' | 'name'>) {
  const payload = {
    code: unit.code.trim(),
    name: unit.name.trim(),
    level: unit.level ?? 2,
    parent_id: unit.parent_id ?? null,
    active: unit.active ?? true,
  }
  if (unit.id) unwrap(await supabase.from('org_units').update(payload).eq('id', unit.id))
  else unwrap(await supabase.from('org_units').insert({ ...payload, source: 'manual' }))
}

export async function deleteOrgUnit(id: string) {
  unwrap(await supabase.from('org_units').delete().eq('id', id))
}

// ---------- Mã hàng / công đoạn / QR ----------

export async function listItems(): Promise<Item[]> {
  return unwrap(await supabase.from('items').select('*').order('code'))
}

export async function listOperations(): Promise<Operation[]> {
  return unwrap(await supabase.from('operations').select('*').order('code'))
}

export async function listItemOperations(itemId?: string): Promise<ItemOperation[]> {
  let q = supabase.from('v_item_operations').select('*').order('item_code').order('seq')
  if (itemId) q = q.eq('item_id', itemId)
  return unwrap(await q)
}

export async function findByQr(qr: string): Promise<ItemOperation | null> {
  return unwrap(
    await supabase.from('v_item_operations').select('*').eq('qr_value', qr.trim()).maybeSingle(),
  )
}

export async function findByCodes(itemCode: string, opCode: string): Promise<ItemOperation | null> {
  return unwrap(
    await supabase
      .from('v_item_operations')
      .select('*')
      .eq('item_code', itemCode.trim())
      .eq('operation_code', opCode.trim())
      .maybeSingle(),
  )
}

export async function createQrCodes(itemId: string, operationIds: string[] | null) {
  return unwrap(
    await supabase.rpc('create_qr_codes', { p_item_id: itemId, p_operation_ids: operationIds }),
  ) as number
}

export async function saveItem(item: { id?: string; code: string; name: string; active?: boolean }) {
  const payload = { code: item.code.trim(), name: item.name.trim(), active: item.active ?? true }
  if (item.id) {
    unwrap(await supabase.from('items').update(payload).eq('id', item.id))
    return item.id
  }
  const row = unwrap(
    await supabase
      .from('items')
      .insert({ ...payload, erp_code: payload.code, source: 'manual' })
      .select('id')
      .single(),
  ) as { id: string }
  return row.id
}

export async function upsertOperation(code: string, name: string): Promise<string> {
  const existing = unwrap(
    await supabase.from('operations').select('id').eq('code', code.trim()).maybeSingle(),
  ) as { id: string } | null
  if (existing) return existing.id
  const row = unwrap(
    await supabase
      .from('operations')
      .insert({ code: code.trim(), name: name.trim(), erp_code: code.trim(), source: 'manual' })
      .select('id')
      .single(),
  ) as { id: string }
  return row.id
}

export async function addItemOperation(itemId: string, operationId: string, seq: number) {
  unwrap(
    await supabase.from('item_operations').insert({ item_id: itemId, operation_id: operationId, seq }),
  )
}

export async function removeItemOperation(id: string) {
  unwrap(await supabase.from('item_operations').delete().eq('id', id))
}

export async function importCatalog(
  rows: { item_code: string; item_name: string; op_code: string; op_name: string; seq: number }[],
) {
  return unwrap(await supabase.rpc('import_catalog', { p_rows: rows })) as { rows: number }
}

// ---------- Báo cáo sản xuất ----------

export interface ReportInput {
  item_id: string
  operation_id: string
  method: ReportMethod
  ok_qty: number
  ng_qty: number
  received_qty: number
  transferred_qty: number
}

export async function createReport(input: ReportInput) {
  unwrap(await supabase.from('production_reports').insert(input))
}

export async function updateReport(
  id: string,
  qty: Pick<ReportInput, 'ok_qty' | 'ng_qty' | 'received_qty' | 'transferred_qty'>,
) {
  const res = await supabase.from('production_reports').update(qty).eq('id', id).select('id')
  const rows = unwrap(res) as unknown[]
  if (!rows.length) throw new Error('Bạn không có quyền thực hiện thao tác này.')
}

export async function cancelReport(id: string, reason: string) {
  const res = await supabase
    .from('production_reports')
    .update({ status: 'cancelled', cancel_reason: reason })
    .eq('id', id)
    .select('id')
  const rows = unwrap(res) as unknown[]
  if (!rows.length) throw new Error('Bạn không có quyền thực hiện thao tác này.')
}

export interface ReportFilter {
  search?: string
  unitId?: string | null
  status?: ReportStatus | null
  method?: ReportMethod | null
  from?: string | null // ISO
  to?: string | null // ISO
  page?: number // bắt đầu từ 1
  pageSize?: number
}

export async function listReports(f: ReportFilter = {}): Promise<{ rows: ReportRow[]; total: number }> {
  const page = f.page ?? 1
  const size = f.pageSize ?? 20
  let q = supabase
    .from('v_report_history')
    .select('*', { count: 'exact' })
    .order('reported_at', { ascending: false })
    .range((page - 1) * size, page * size - 1)
  if (f.unitId) q = q.eq('unit_id', f.unitId)
  if (f.status) q = q.eq('status', f.status)
  if (f.method) q = q.eq('method', f.method)
  if (f.from) q = q.gte('reported_at', f.from)
  if (f.to) q = q.lte('reported_at', f.to)
  const s = f.search?.trim().replace(/[%,()]/g, ' ')
  if (s) {
    q = q.or(
      ['item_code', 'item_name', 'operation_code', 'operation_name', 'reporter_name', 'unit_name']
        .map((c) => `${c}.ilike.%${s}%`)
        .join(','),
    )
  }
  const { data, error, count } = await q
  if (error) throw error
  return { rows: (data ?? []) as ReportRow[], total: count ?? 0 }
}

/** Lấy toàn bộ (tối đa 5000 dòng) để xuất Excel */
export async function listReportsForExport(f: ReportFilter): Promise<ReportRow[]> {
  return (await listReports({ ...f, page: 1, pageSize: 5000 })).rows
}

export async function listReportLogs(reportId: string): Promise<ReportLog[]> {
  return unwrap(
    await supabase
      .from('report_logs')
      .select('id, action, at, before, after, reason, actor:profiles!report_logs_actor_id_fkey(full_name)')
      .eq('report_id', reportId)
      .order('at'),
  ) as unknown as ReportLog[]
}

export async function getStock(p: {
  from?: string | null
  to?: string | null
  unitId?: string | null
  itemId?: string | null
}): Promise<StockRow[]> {
  return unwrap(
    await supabase.rpc('get_btp_stock', {
      p_from: p.from ?? null,
      p_to: p.to ?? new Date().toISOString(),
      p_unit_id: p.unitId ?? null,
      p_item_id: p.itemId ?? null,
    }),
  )
}

export async function getDailyOutput(from: string, to: string, unitId?: string | null): Promise<DailyRow[]> {
  return unwrap(
    await supabase.rpc('get_daily_output', { p_from: from, p_to: to, p_unit_id: unitId ?? null }),
  )
}
