import { createClient } from '@supabase/supabase-js'

// Publishable key: an toàn khi để trên trình duyệt vì mọi bảng đều bật RLS.
// Có thể ghi đè bằng file .env (VITE_SUPABASE_URL, VITE_SUPABASE_KEY).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zcevfcmpijgkaorzxxkv.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_dM_y8dtI3Z_UZAv_rtF4aQ_WV9M3o2Q'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
)

/** Tài khoản đăng nhập bằng username → email nội bộ (khớp hàm _create_auth_user) */
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@fomeco-mes.local`

/** Lấy câu thông báo tiếng Việt từ lỗi Supabase/Postgres */
export function errorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  const msg = (error as { message?: string } | null)?.message
  if (!msg) return fallback
  if (/JWT|session/i.test(msg)) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (/row-level security|permission denied/i.test(msg)) return 'Bạn không có quyền thực hiện thao tác này.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.'
  if (/violates foreign key constraint/i.test(msg)) return 'Dữ liệu đang được sử dụng ở nơi khác, không thể xóa.'
  if (/duplicate key/i.test(msg)) return 'Mã đã tồn tại. Vui lòng nhập mã khác.'
  return msg
}

/** Ném lỗi nếu Supabase trả về error, ngược lại trả data */
export function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw new Error(errorMessage(res.error))
  return res.data as T
}
