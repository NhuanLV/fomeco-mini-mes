// Kiểu dữ liệu tương ứng bảng/view trên Supabase (xem supabase/01_schema.sql)

export type PermissionCode =
  | 'MANAGE_ACCOUNT'
  | 'MANAGE_ORG'
  | 'MANAGE_PRODUCT'
  | 'REPORT_PROGRESS'
  | 'VIEW_REPORT'

export interface Permission {
  code: PermissionCode
  name: string
  group_name: string
  sort: number
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: PermissionCode[]
  is_system: boolean
}

export interface OrgUnit {
  id: string
  code: string
  name: string
  level: 1 | 2
  parent_id: string | null
  source: 'erp' | 'manual'
  active: boolean
}

export interface Account {
  id: string
  username: string
  full_name: string
  active: boolean
  created_at: string
  unit_id: string | null
  unit_code: string | null
  unit_name: string | null
  unit_level: number | null
  role_id: string | null
  role_name: string | null
  permissions: PermissionCode[] | null
}

export interface Item {
  id: string
  code: string
  name: string
  erp_code: string | null
  source: 'erp' | 'manual' | 'excel'
  active: boolean
  synced_at: string | null
}

export interface Operation {
  id: string
  code: string
  name: string
  source: 'erp' | 'manual' | 'excel'
  active: boolean
}

export interface ItemOperation {
  id: string
  item_id: string
  item_code: string
  item_name: string
  item_source: Item['source']
  operation_id: string
  operation_code: string
  operation_name: string
  seq: number
  qr_value: string | null
  qr_created_at: string | null
  qr_created_by_name: string | null
  active: boolean
}

export type ReportMethod = 'manual' | 'qr'
export type ReportStatus = 'active' | 'cancelled'

export interface ReportRow {
  id: string
  reported_at: string
  method: ReportMethod
  status: ReportStatus
  unit_id: string
  unit_code: string
  unit_name: string
  item_id: string
  item_code: string
  item_name: string
  operation_id: string
  operation_code: string
  operation_name: string
  ok_qty: number
  ng_qty: number
  total_qty: number
  received_qty: number
  transferred_qty: number
  reporter_id: string | null
  reporter_name: string | null
  updated_at: string | null
  updated_by_name: string | null
  cancelled_at: string | null
  cancelled_by_name: string | null
  cancel_reason: string | null
}

export interface ReportLog {
  id: number
  action: 'create' | 'update' | 'cancel'
  at: string
  before: QtySet | null
  after: QtySet | null
  reason: string | null
  actor: { full_name: string } | null
}

export interface QtySet {
  ok: number
  ng: number
  received: number
  transferred: number
}

export interface StockRow {
  unit_id: string
  unit_code: string
  unit_name: string
  item_id: string
  item_code: string
  item_name: string
  operation_id: string
  operation_code: string
  operation_name: string
  seq: number
  opening_qty: number
  received_qty: number
  transferred_qty: number
  closing_qty: number
  ok_qty: number
  ng_qty: number
  report_count: number
}

export interface DailyRow {
  day: string
  unit_id: string
  unit_name: string
  ok_qty: number
  ng_qty: number
  total_qty: number
  received_qty: number
  transferred_qty: number
  report_count: number
}
