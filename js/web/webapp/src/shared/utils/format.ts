import dayjs from 'dayjs'

export const fmtQty = (n: number | null | undefined) =>
  new Intl.NumberFormat('vi-VN').format(Number(n ?? 0))

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? dayjs(iso).format('HH:mm DD/MM/YYYY') : ''

export const fmtDate = (iso: string | null | undefined) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '')

/** yyyy-mm-dd (theo giờ máy) → ISO đầu ngày / cuối ngày */
export const startOfDayIso = (d: string | null | undefined) =>
  d ? dayjs(d).startOf('day').toISOString() : null
export const endOfDayIso = (d: string | null | undefined) =>
  d ? dayjs(d).endOf('day').toISOString() : null

export const today = () => dayjs().format('YYYY-MM-DD')
export const daysAgo = (n: number) => dayjs().subtract(n, 'day').format('YYYY-MM-DD')
export const startOfMonth = () => dayjs().startOf('month').format('YYYY-MM-DD')

export const initials = (name?: string | null) =>
  name?.trim().split(' ').pop()?.charAt(0).toUpperCase() || 'U'

export const METHOD_LABEL = { manual: 'Thủ công', qr: 'QR' } as const
export const STATUS_LABEL = { active: 'Đã ghi nhận', cancelled: 'Đã hủy' } as const
export const SOURCE_LABEL = { erp: 'ERP', manual: 'Thủ công', excel: 'Excel' } as const

/** Bỏ dấu tiếng Việt để tìm kiếm */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
