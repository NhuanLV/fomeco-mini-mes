import * as XLSX from 'xlsx'

/** Xuất mảng dữ liệu ra file Excel (.xlsx) và tải về */
export function exportExcel(
  fileName: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][],
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.min(
      40,
      Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)) + 2,
    ),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}

/** Đọc sheet đầu tiên của file Excel thành mảng object theo dòng tiêu đề */
export async function readExcel(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf)
  const ws = wb.Sheets[wb.SheetNames[0]!]!
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

/** Tạo file Excel mẫu để nhập danh mục mã hàng/công đoạn */
export function downloadCatalogTemplate() {
  exportExcel(
    'mau-nhap-ma-hang-cong-doan.xlsx',
    'Danh muc',
    ['Mã hàng', 'Tên sản phẩm', 'Mã công đoạn', 'Tên công đoạn', 'Thứ tự'],
    [
      ['TR-125', 'Trục truyền động Ø25', 'TIEN-01', 'Tiện thô', 1],
      ['TR-125', 'Trục truyền động Ø25', 'TIEN-02', 'Tiện tinh', 2],
    ],
  )
}
