// Kiểm tra số lượng theo spec mục 6, 7

export const QTY_FIELDS = {
  ok_qty: 'Sản lượng OK',
  ng_qty: 'Sản lượng NG',
  received_qty: 'Nhận BTP',
  transferred_qty: 'Chuyển BTP',
} as const
export type QtyKey = keyof typeof QTY_FIELDS
export type QtyForm = Record<QtyKey, string>

export const emptyQty = (): QtyForm => ({ ok_qty: '', ng_qty: '0', received_qty: '', transferred_qty: '' })

export const toInt = (v: string | number | null | undefined) => {
  const s = String(v ?? '').trim()
  return s === '' ? 0 : Number(s)
}

/** Trả về thông báo lỗi đầu tiên, hoặc null nếu hợp lệ */
export function validateQty(q: QtyForm): string | null {
  if (String(q.ok_qty).trim() === '') return 'Vui lòng nhập sản lượng OK. Nhập 0 nếu không phát sinh.'
  if (String(q.ng_qty).trim() === '') return 'Vui lòng nhập sản lượng NG. Nhập 0 nếu không phát sinh.'
  for (const key of Object.keys(QTY_FIELDS) as QtyKey[]) {
    const s = String(q[key] ?? '').trim()
    if (s === '') continue
    if (!/^\d+$/.test(s) || !Number.isSafeInteger(Number(s))) {
      return `${QTY_FIELDS[key]} phải là số nguyên không âm.`
    }
  }
  const sum = (Object.keys(QTY_FIELDS) as QtyKey[]).reduce((a, k) => a + toInt(q[k]), 0)
  if (sum === 0) {
    return 'Vui lòng nhập ít nhất một số lượng lớn hơn 0 tại các trường OK, NG, Nhận BTP hoặc Chuyển BTP.'
  }
  return null
}

export const qtyPayload = (q: QtyForm) => ({
  ok_qty: toInt(q.ok_qty),
  ng_qty: toInt(q.ng_qty),
  received_qty: toInt(q.received_qty),
  transferred_qty: toInt(q.transferred_qty),
})
