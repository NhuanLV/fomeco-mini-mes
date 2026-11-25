/* Cấu hình kết nối Supabase.
   Publishable key được phép để trên trình duyệt vì mọi bảng đều bật RLS (phân quyền trong database). */
window.APP_CONFIG = {
  SUPABASE_URL: 'https://zcevfcmpijgkaorzxxkv.supabase.co',
  SUPABASE_KEY: 'sb_publishable_dM_y8dtI3Z_UZAv_rtF4aQ_WV9M3o2Q',
  COMPANY_NAME: 'Công ty CP Cơ khí Phổ Yên',
  EMAIL_DOMAIN: 'fomeco-mes.local', // tài khoản đăng nhập bằng tên → <ten>@fomeco-mes.local
  // Báo cáo tồn kho (Power BI → File → Embed report → Publish to web). Đổi báo cáo: chỉ sửa link ở đây.
  POWERBI_INVENTORY_TITLE: 'Fomeco199_V21',
  POWERBI_INVENTORY_URL: 'https://app.powerbi.com/view?r=eyJrIjoiZTliYmU3MTAtYTZjMS00NGExLTkzODAtNDMxMTg0MTUxYjEyIiwidCI6IjhjYmNlMTA1LTZlZTItNGNlYy1hNWIwLWFkYjgzNWY5ZWIxNyIsImMiOjEwfQ%3D%3D',
};
