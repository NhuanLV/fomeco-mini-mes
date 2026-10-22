import QRCode from 'qrcode'

export interface QrLabelData {
  qr_value: string
  item_code: string
  item_name: string
  operation_code: string
  operation_name: string
}

/** Nội dung QR cố định: <mã hàng>|<mã công đoạn> */
export const buildQrValue = (itemCode: string, opCode: string) => `${itemCode}|${opCode}`

/** Tách nội dung QR, trả null nếu sai định dạng */
export function parseQrValue(text: string): { itemCode: string; opCode: string } | null {
  const parts = text.trim().split('|')
  if (parts.length !== 2) return null
  const [itemCode, opCode] = parts.map((p) => p.trim())
  if (!itemCode || !opCode) return null
  return { itemCode, opCode }
}

export const qrSvg = (value: string, size = 160) =>
  QRCode.toString(value, { type: 'svg', margin: 1, width: size, errorCorrectionLevel: 'M' })

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Tem QR hoàn chỉnh (SVG) để tải về */
export async function labelSvg(d: QrLabelData) {
  const inner = (await qrSvg(d.qr_value, 180)).replace(/<\?xml[^>]*>/, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="330" viewBox="0 0 240 330" font-family="Arial, sans-serif">
  <rect width="240" height="330" fill="#fff" stroke="#d4d4d8" rx="10"/>
  <text x="120" y="28" text-anchor="middle" font-size="15" font-weight="700" fill="#0f5fa8">FOMECO <tspan font-size="11" fill="#059669">Mini-MES</tspan></text>
  <g transform="translate(30,38)">${inner.replace('<svg', '<svg width="180" height="180"')}</g>
  <text x="120" y="244" text-anchor="middle" font-size="18" font-weight="700">${esc(d.item_code)}</text>
  <text x="120" y="264" text-anchor="middle" font-size="12" fill="#52525b">${esc(d.item_name)}</text>
  <text x="120" y="286" text-anchor="middle" font-size="13">${esc(d.operation_code)} · ${esc(d.operation_name)}</text>
  <text x="120" y="310" text-anchor="middle" font-size="11" font-family="monospace" fill="#71717a">${esc(d.qr_value)}</text>
</svg>`
}

export async function downloadLabelSvg(d: QrLabelData) {
  const blob = new Blob([await labelSvg(d)], { type: 'image/svg+xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `QR_${d.item_code}_${d.operation_code}.svg`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** In nhiều tem trên khổ A4 (mở cửa sổ in của trình duyệt) */
export async function printLabels(list: QrLabelData[]) {
  const svgs = await Promise.all(list.map(labelSvg))
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return false
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>In tem QR</title>
<style>
  @page { size: A4; margin: 10mm; }
  body { margin: 0; font-family: Arial, sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  .grid > svg { width: 100%; height: auto; break-inside: avoid; }
</style></head><body><div class="grid">${svgs.join('')}</div>
<script>window.onload = () => { window.focus(); window.print(); }<\/script></body></html>`)
  w.document.close()
  return true
}
