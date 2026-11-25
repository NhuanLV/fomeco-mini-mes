# FOMECO Mini-MES — Báo cáo sản xuất bán thành phẩm (BTP)

Hệ thống ghi nhận sản lượng **bán thành phẩm theo mã hàng × công đoạn** cho Công ty CP Cơ khí Phổ Yên (FOMECO).
Công nhân báo cáo bằng điện thoại (nhập tay hoặc **quét mã QR** dán tại công đoạn), quản lý xem tiến độ, tồn BTP và dashboard theo thời gian thực.
Đặc tả nghiệp vụ gốc: *2.2. Báo cáo sản xuất* (nằm ở thư mục cha `3. CODE/`).

| | |
|---|---|
| Trạng thái | **Demo / thử nghiệm** — chưa kết nối trực tiếp ERP Bravo |
| Repo chính | https://github.com/FINTECH-BK/FOMECO — gọn, đủ `app/` + `supabase/` + `web/` · chạy tại https://fintech-bk.github.io/FOMECO/ |
| Repo thử nghiệm | https://github.com/NhuanLV/fomeco-mini-mes — cùng mã nguồn nhưng lẫn nhiều file thừa (xem mục 6) · https://nhuanlv.github.io/fomeco-mini-mes/ |
| Backend | Supabase (PostgreSQL + Auth + RLS + Realtime), project `fomeco-mes-demo`, region Sydney |

---

## 1. Cấu trúc thư mục

```
fomeco-mes-demo/
├── app/                      ★ FRONTEND ĐANG DÙNG — HTML/CSS/JS thuần, không cần build
│   ├── index.html            trang duy nhất, router theo #/...; nạp thư viện từ CDN
│   ├── css/app.css
│   ├── assets/               logo, favicon, apple-touch-icon
│   └── js/
│       ├── config.js         URL + publishable key Supabase, tên công ty, domain email nội bộ
│       ├── api.js            TẦNG DỮ LIỆU — mọi lệnh gọi Supabase (đổi backend / nối Bravo chỉ sửa ở đây)
│       ├── ui.js             esc, icon, toast, modal, confirm, busy...
│       ├── shared.js         ô số lượng, kiểm tra, QR (tạo/đọc/in tem), máy quét camera, Excel
│       ├── app.js            đăng nhập, phân quyền, navbar, giao diện điện thoại, router, realtime
│       └── pages/
│           ├── dashboard.js  /            KPI, biểu đồ theo ngày, tồn theo xí nghiệp (realtime)
│           ├── progress.js   /progress    Báo cáo tiến độ (thủ công / QR) trên máy tính
│           ├── history.js    /history, /mine   Lịch sử, sửa, hủy, nhật ký, xem tồn BTP, xuất Excel
│           ├── products.js   /products    Mã hàng – công đoạn, tạo QR, in tem A4, nhập Excel
│           ├── admin.js      /accounts, /roles, /org-units, /profile
│           ├── inventory.js  /inventory   Báo cáo tồn kho — nhúng Power BI (link trong config.js)
│           └── worker.js     /w, /w/new, /w/mine, /w/me   Giao diện điện thoại cho công nhân
│
├── web/                      Bản Vue 3 + Nuxt UI + Tailwind (dựng từ khung MesSource) — BẢN CŨ, chưa theo kịp DB
├── supabase/                 Script SQL tạo database (chạy theo thứ tự 01 → 06)
├── CAU-TRUC-CSDL-FOMECO-MES.md   Tài liệu chi tiết 9 bảng, view, hàm, ánh xạ BravoDW
├── bao-cao/                  Báo cáo kiểm thử (.docx, 24/10/2026)
├── video/                    Video giới thiệu + ảnh trước/sau (≈79 MB — KHÔNG đưa lên git)
├── CHAY-DEMO.command         (macOS) chạy bản Vue `web/` ở http://localhost:5173
├── DAY-LEN-GITHUB.command    (macOS) chép `app/` sang repo NhuanLV/fomeco-mini-mes rồi push
└── *.tgz                     3 file giống hệt nhau (mã nguồn MesSource nén) — KHÔNG đưa lên git
```

> `app/` là bản đang triển khai và được cập nhật mới nhất (24/10). `web/` dừng ở 22/10, còn dùng mô hình phân quyền cũ (5 quyền, chưa có `MANAGE_REPORT`, dashboard làm mới 60 s thay vì realtime).

---

## 2. Chạy trên máy

### Frontend `app/` (khuyến nghị)
Không cần cài gì. Mở bằng một web server tĩnh bất kỳ:
```bash
python3 -m http.server 8765 --directory app
# mở http://localhost:8765
```
(Bấm đúp `index.html` cũng chạy, nhưng camera quét QR trên điện thoại chỉ hoạt động qua **HTTPS** hoặc `localhost`.)

Mẹo kiểm thử nhiều vai trò cùng lúc: thêm `?phien=rieng` vào URL → mỗi tab giữ một phiên đăng nhập riêng.

### Frontend `web/` (Vue)
```bash
cd web
pnpm install          # hoặc npm install
pnpm dev              # http://localhost:5173
pnpm build            # ra web/dist/
```
Có thể ghi đè Supabase bằng `web/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`.
Thư viện `xlsx` được cài từ file `web/vendor/xlsx-0.20.3.tgz`.

---

## 3. Dựng database Supabase

Tạo project Supabase mới → **SQL Editor** → chạy lần lượt:

| File | Nội dung |
|---|---|
| `01_schema.sql` | Bảng, trigger kiểm tra nghiệp vụ, RLS, view, hàm tổng hợp, hàm quản trị tài khoản |
| `02_seed_demo.sql` | Dữ liệu mẫu: xí nghiệp, công đoạn, mã hàng mẫu, báo cáo mẫu, tài khoản demo |
| `03_realtime.sql` | Bật Realtime cho `production_reports` |
| `04_phan_quyen_3_tang.sql` | Phân quyền 3 tầng (ghi đè một số hàm/policy của 01), thêm quyền `MANAGE_REPORT`, vai trò mới |
| `05_cau_chu_day_du.sql` | Chuẩn hóa câu chữ mô tả vai trò |
| `06_du_lieu_that_5_ma.sql` | 5 mã hàng thật từ Bravo + báo cáo **mô phỏng** 21 ngày (sao lưu dữ liệu cũ vào schema `demo_backup`) |

Sau đó đặt mật khẩu admin (hàm này chỉ chạy được trong SQL Editor, app không gọi được):
```sql
select public.setup_password('admin', '<mật khẩu>');
```
Đăng nhập `admin` → Quản trị tài khoản → biểu tượng chìa khóa để đặt mật khẩu cho tài khoản khác.

Tài khoản demo: `admin`, `quanly`, `nv.ck1`, `nv.ck2`, `nv.vongbi`, `nv.rendap`, `xembaocao`.
Đăng nhập bằng **tên**; hệ thống tự đổi thành email nội bộ `<tên>@fomeco-mes.local`.

Đổi sang project Supabase khác: sửa `app/js/config.js` (và `web/webapp/src/lib/supabase.ts` hoặc `web/.env`).
Publishable key được phép để trên trình duyệt vì **mọi bảng đều bật RLS**. Tuyệt đối không đưa `service_role` key vào repo.

---

## 4. Nghiệp vụ chính

### Dữ liệu
`permissions` · `roles` · `org_units` (công ty cấp 1 / xí nghiệp cấp 2) · `profiles` · `items` (mã hàng) · `operations` (công đoạn) · `item_operations` (quy trình + mã QR) · `production_reports` · `report_logs`.
Chi tiết từng cột: xem **`CAU-TRUC-CSDL-FOMECO-MES.md`**.

- **Báo cáo tồn kho** (`/inventory`, quyền `VIEW_REPORT`): nhúng báo cáo Power BI *Fomeco199_V21* bằng link "Publish to web". Đổi báo cáo chỉ cần sửa `POWERBI_INVENTORY_URL` trong `app/js/config.js`. Lưu ý: link này công khai — ai có link đều xem được, phân quyền trong app chỉ ẩn/hiện tab.
- Báo cáo gồm: **Đạt (OK)**, **Không đạt (NG)**, **Tổng** (tự tính), **Nhận BTP**, **Chuyển BTP**.
- **Tồn BTP = Nhận − Chuyển** (hàm `get_btp_stock`); báo cáo đã hủy không được tính.
- Người báo cáo, xí nghiệp, thời gian do **database tự ghi** (trigger), client không gửi được.
- Mọi tạo / sửa / hủy được ghi vào `report_logs` (trước – sau). Hủy bắt buộc có lý do.
- Nội dung QR cố định: `MÃ HÀNG|MÃ CÔNG ĐOẠN` (vd. `1.2.01.0106|NVT`). Máy quét cầm tay: đặt con trỏ vào ô "Nội dung QR" trong cửa sổ quét.

### Phân quyền (kiểm tra ở cả giao diện **và** database)
| Mã quyền | Ý nghĩa |
|---|---|
| `SYSTEM_ADMIN` | Quản trị vai trò, đặt lại mật khẩu, xóa tài khoản |
| `MANAGE_ACCOUNT` | Tạo/sửa tài khoản (chỉ gán vai trò không vượt quyền của mình) |
| `MANAGE_ORG` | Quản trị tổ chức |
| `MANAGE_PRODUCT` | Mã hàng, công đoạn, QR, nhập Excel |
| `REPORT_PROGRESS` | Nhập báo cáo |
| `VIEW_REPORT` | Dashboard, lịch sử, tồn BTP |
| `MANAGE_REPORT` | Sửa/hủy báo cáo của người khác |

| Vai trò | Được làm |
|---|---|
| Quản trị hệ thống | Toàn quyền |
| Nhân viên quản lý | Tài khoản công nhân, mã hàng & QR, xem toàn bộ, sửa/hủy báo cáo công nhân |
| Công nhân | Nhập báo cáo; chỉ xem/sửa/hủy báo cáo **của mình, trong ngày đã nhập** |
| Người xem báo cáo | Dashboard, lịch sử, tồn BTP |

### Hướng kết nối ERP Bravo (chưa làm)
Chương trình đồng bộ đặt trong LAN FOMECO, đọc SQL Server Bravo bằng tài khoản **chỉ đọc**, định kỳ 5–15 phút đẩy mã hàng / công đoạn / xí nghiệp lên (upsert theo `code`, cột `erp_code`, `source`, `synced_at` đã có sẵn). Trong lúc chờ: dùng **Nhập Excel** từ file xuất của Bravo (hàm `import_catalog`).
Ánh xạ BravoDW: `DimItem` → `items`; `FactBOM.WorkProcessCode/Name` → `operations`; `FactBOM.ItemProductCode + WorkProcessCode` → `item_operations`.

---

## 5. Triển khai

Cả hai repo đang trỏ GitHub Pages vào nhánh `main`, file `index.html` ở gốc tự chuyển sang `app/`.
Mã nguồn `app/` và `supabase/` trên hai repo **giống hệt** bản trên Drive (đối chiếu ngày 25/11/2026).

Bấm đúp `DAY-LEN-GITHUB.command`: đồng bộ `app/`, `supabase/`, `README.md` lên repo đặt ở biến `REPO` (mặc định repo thử NhuanLV; đổi sang `FINTECH-BK/FOMECO` khi muốn cập nhật bản chính), hỏi nội dung commit rồi push (cần Personal Access Token).

Từ nay nên làm việc trên `FINTECH-BK/FOMECO` bằng `git clone` → sửa → commit → push (thay vì "Add files via upload" trên web), và cân nhắc deploy Pages từ thư mục `app/` bằng GitHub Actions (xem mục 6).

---

## 6. Việc cần sửa / bổ sung (backlog)

### Dọn repo trước khi push
- [ ] Repo `NhuanLV/fomeco-mini-mes` đang có thư mục `js/` là **bản sao cũ** của cả dự án (do upload nhầm: `js/app`, `js/web`, `js/supabase` chỉ có 01–03, kèm `js/*.tgz`) và 3 file `.tgz` ở gốc → xóa, hoặc archive repo này và chỉ dùng `FINTECH-BK/FOMECO`.
- [ ] Commit message trên NhuanLV phần lớn là "Add files via upload" → khó truy vết; dùng git và viết message rõ ràng.
- [ ] Thêm `.gitignore` ở gốc:
  ```gitignore
  .DS_Store
  node_modules/
  dist/
  .env
  *.tgz
  !web/vendor/*.tgz
  video/
  .claude/
  *.log
  ```
- [ ] Xóa 3 file `_messource_src.tgz`, `m.tgz`, `src.tgz` (trùng nhau, 1,2 MB mỗi file — là mã nguồn MesSource, không thuộc dự án này).
- [ ] Không commit `video/` (79 MB, có thư mục `.tmp`) → để trên Drive hoặc GitHub Releases.
- [ ] Gỡ email cá nhân đang ghi cứng trong `DAY-LEN-GITHUB.command`; sửa script để đẩy lên `FINTECH-BK/FOMECO` (đang trỏ NhuanLV và chỉ chép `app/`).
- [ ] Supabase gói miễn phí sẽ **tạm dừng project nếu 7 ngày không có truy cập** → trước buổi demo nên mở thử, hoặc lên gói trả phí / tự host khi chạy thật.

### Kiến trúc
- [ ] **Quyết định giữ một frontend**: `app/` (thuần JS, đang chạy) hay `web/` (Vue/TS). Nếu giữ `app/` → chuyển `web/` vào nhánh/thư mục `archive/`; nếu chọn `web/` → phải cập nhật theo phân quyền 3 tầng (`MANAGE_REPORT`, quyền theo "của mình / trong ngày"), realtime, giao diện điện thoại `/w`.
- [ ] Gộp các script SQL thành **migration có đánh số rõ ràng**: `04` đang ghi đè hàm/policy của `01`, `05` sửa câu chữ của `04`. Cài mới phải chạy đủ 01→06 mới đúng. Cân nhắc Supabase CLI (`supabase/migrations/`) và tách riêng dữ liệu mô phỏng khỏi schema.
- [ ] Cập nhật `supabase/README.md` (đang lỗi thời: còn ghi `role_code`, 3 vai trò admin/reporter/viewer, QR dạng `FMC|...`).
- [ ] Thư viện CDN không đồng nhất: `app/` dùng `xlsx@0.18.5` (bản cũ trên npm, có lỗ hổng đã biết) trong khi `web/` dùng 0.20.3 → tải `xlsx` từ cdn.sheetjs.com hoặc tự host. Cân nhắc tự host toàn bộ thư viện (tránh phụ thuộc jsDelivr trong mạng nhà máy).
- [ ] Cache-busting `?v=` chỉ gắn cho `app.css` và `shared.js` — các file JS khác dễ bị trình duyệt giữ bản cũ sau khi deploy. Nên gắn chung một version hoặc build bằng Vite.

### Bảo mật
- [ ] `_create_auth_user` ghi thẳng vào `auth.users` — dễ vỡ khi Supabase nâng cấp schema Auth; nên chuyển sang Edge Function dùng Admin API.
- [ ] Rà lại `setup_password` (đã revoke khỏi `anon/authenticated`) — xóa hẳn khi lên bản thật.
- [ ] Mật khẩu tối thiểu 6 ký tự → tăng lên và thêm khóa tạm khi nhập sai nhiều lần.
- [ ] Bản chạy thật tại FOMECO: dựng lại cùng schema trên PostgreSQL/Supabase tự host, không dùng project demo ở Sydney.

### Nghiệp vụ / dữ liệu
- [ ] Xác nhận **thứ tự công đoạn (`seq`)** của 5 mã thật — đang tạm sắp vì file Bravo xếp theo chữ cái.
- [ ] Xin mã ERP chính thức cho các công đoạn mã tạm `TAM-...`.
- [ ] Xác nhận công đoạn nào thuộc xí nghiệp nào (`FactBOMDetail.DeptName`).
- [ ] Viết chương trình đồng bộ Bravo (mục 4) và thay hộp thoại "Đồng bộ ERP" giả lập trong `products.js`.
- [ ] Đẩy ngược sản lượng đã xác nhận về Bravo (nếu yêu cầu).

### Chất lượng
- [ ] Chưa có test và CI cho `app/`. Gợi ý: Playwright e2e cho luồng đăng nhập → báo cáo thủ công → báo cáo QR → sửa/hủy → xem tồn; chạy với một Supabase test project.
- [ ] GitHub Actions: deploy Pages từ `app/` khi push `main`.
- [ ] Đối chiếu lại toàn bộ thông báo lỗi với mục 7 của đặc tả *2.2. Báo cáo sản xuất* (một phần đang được viết lại ở client trong `api.js → message()`).

---

## 7. Quy ước khi sửa code

- Mọi truy cập dữ liệu chỉ qua `app/js/api.js` — trang không gọi `supabase` trực tiếp.
- Quy tắc nghiệp vụ đặt ở **database** (trigger + RLS + hàm); giao diện chỉ hiển thị và kiểm tra sơ bộ.
- Thêm trang mới: tạo `app/js/pages/<ten>.js`, đăng ký `PAGES['/duong-dan'] = { title, perm | any, mobile?, render }`, thêm `<script>` vào `index.html`, thêm mục menu trong `app.js → navbar()`.
- Câu chữ giao diện: tiếng Việt đầy đủ, không viết tắt (OK → Đạt, NG → Không đạt, BTP → bán thành phẩm), không xưng hô "bạn".
- Thay đổi schema: viết file SQL mới đánh số tiếp theo, chạy lại được nhiều lần (`create or replace`, `on conflict`), cập nhật `CAU-TRUC-CSDL-FOMECO-MES.md`.

---

## 8. Nhóm thực hiện
Lê Văn Nhuận cùng Phương Anh, anh Việt Hà.
