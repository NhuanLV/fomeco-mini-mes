/* Lịch sử báo cáo: lọc, phân trang, sửa, hủy, chi tiết + nhật ký, tồn bán thành phẩm, xuất Excel (spec 4.3–4.5) */
(function () {
  const { esc, icon, fmtQty, fmtDateTime, METHOD, STATUS, badge, refreshIcons, options } = UI;

  // Quản lý (MANAGE_REPORT): sửa/hủy báo cáo trong phạm vi đơn vị (Công ty = mọi xí nghiệp).
  // Công nhân: chỉ báo cáo của mình, trong ngày đã nhập.
  function canEdit(r) {
    const u = Auth.user;
    if (r.status !== 'active') return false;
    if (Auth.has('MANAGE_REPORT') && (r.unit_id === u.unit_id || u.unit_level === 1)) return true;
    return Auth.has('REPORT_PROGRESS') && r.reporter_id === u.id && UI.isToday(r.reported_at);
  }

  // ---------- Sửa ----------
  function openEdit(r, onSaved) {
    const m = UI.modal({
      title: 'Chỉnh sửa báo cáo', size: 'lg',
      body: `<div class="stack">
        <div class="info-grid sm">
          <div><div class="xs muted">Mã hàng</div><b>${esc(r.item_code)}</b> — ${esc(r.item_name)}</div>
          <div><div class="xs muted">Công đoạn</div><b>${esc(r.operation_code)}</b> · ${esc(r.operation_name)}</div>
          <div><div class="xs muted">Người báo cáo</div>${esc(r.reporter_name)} — ${esc(r.unit_name)}</div>
          <div><div class="xs muted">Thời gian báo cáo</div>${fmtDateTime(r.reported_at)}</div>
        </div>
        <p class="xs muted">Người báo cáo, thời gian báo cáo gốc, mã hàng và công đoạn được giữ nguyên.</p>
        <div id="q">${Shared.qtyFieldsHtml({ ok_qty: r.ok_qty, ng_qty: r.ng_qty, received_qty: r.received_qty || '', transferred_qty: r.transferred_qty || '' })}</div></div>`,
      footer: `<button class="btn btn-ghost" data-close>Đóng</button><button class="btn" data-save data-testid="save-edit">${icon('check')} Lưu thay đổi</button>`,
    });
    const q = m.el.querySelector('#q');
    Shared.bindTotal(q);
    m.el.querySelector('[data-save]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
      const v = Shared.validateQty(Shared.readQty(q));
      if (v) return UI.warn(v);
      try {
        await API.updateReport(r.id, Shared.qtyPayload(Shared.readQty(q)));
        UI.ok('Đã cập nhật báo cáo sản xuất thành công.');
        m.close(); onSaved();
      } catch (e2) { UI.err(e2.message || 'Không thể cập nhật báo cáo. Vui lòng thử lại.'); }
    }));
  }

  // ---------- Hủy ----------
  function openCancel(r, onSaved) {
    const m = UI.modal({
      title: 'Hủy báo cáo',
      body: `<div class="stack"><div class="center">${icon('triangle-alert', 'ic-xl')}</div>
        <p style="line-height:1.7">Hủy báo cáo mã hàng <b>${esc(r.item_code)}</b>, công đoạn <b>${esc(r.operation_code)}</b>, lúc <b>${fmtDateTime(r.reported_at)}</b>? Báo cáo sau khi hủy sẽ không được tính vào sản lượng và tồn bán thành phẩm.</p>
        <div class="field"><label>Lý do hủy <span class="req">*</span></label><textarea class="textarea" rows="3" id="reason" placeholder="Nhập lý do hủy..." data-testid="cancel-reason"></textarea></div></div>`,
      footer: `<button class="btn btn-outline" data-close>Không hủy</button><button class="btn btn-danger" data-ok data-testid="confirm-cancel">${icon('ban')} Xác nhận hủy</button>`,
    });
    m.el.querySelector('[data-ok]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
      const reason = m.el.querySelector('#reason').value.trim();
      if (!reason) return UI.warn('Vui lòng nhập lý do hủy báo cáo.');
      try { await API.cancelReport(r.id, reason); UI.ok('Đã hủy báo cáo sản xuất thành công.'); m.close(); onSaved(); }
      catch (e2) { UI.err(e2.message || 'Không thể hủy báo cáo. Vui lòng thử lại.'); }
    }));
  }

  // ---------- Chi tiết + nhật ký ----------
  async function openDetail(r) {
    const set = (q) => (q ? `Đạt ${fmtQty(q.ok)} · Không đạt ${fmtQty(q.ng)} · Nhận ${fmtQty(q.received)} · Chuyển ${fmtQty(q.transferred)}` : '');
    const m = UI.modal({
      title: 'Chi tiết báo cáo', size: 'lg',
      body: `<div class="stack sm">
        <div class="grid g3">
          <div><div class="xs muted">Mã hàng</div><b>${esc(r.item_code)}</b> — ${esc(r.item_name)}</div>
          <div><div class="xs muted">Công đoạn</div><b>${esc(r.operation_code)}</b> · ${esc(r.operation_name)}</div>
          <div><div class="xs muted">Xí nghiệp</div>${esc(r.unit_name)}</div>
          <div><div class="xs muted">Người báo cáo</div>${esc(r.reporter_name)}</div>
          <div><div class="xs muted">Thời gian</div>${fmtDateTime(r.reported_at)}</div>
          <div><div class="xs muted">Hình thức / Trạng thái</div>${METHOD[r.method]} · ${badge(STATUS[r.status], r.status === 'active' ? 'success' : 'error')}</div>
        </div>
        <div class="grid g6 center info-grid" style="grid-template-columns:repeat(5,1fr)">
          <div><div class="xs muted">Đạt</div><b class="text-success">${fmtQty(r.ok_qty)}</b></div>
          <div><div class="xs muted">Không đạt</div><b class="text-error">${fmtQty(r.ng_qty)}</b></div>
          <div><div class="xs muted">Tổng</div><b>${fmtQty(r.total_qty)}</b></div>
          <div><div class="xs muted">Nhận bán thành phẩm</div><b>${fmtQty(r.received_qty)}</b></div>
          <div><div class="xs muted">Chuyển bán thành phẩm</div><b>${fmtQty(r.transferred_qty)}</b></div>
        </div>
        ${r.status === 'cancelled' ? `<div class="alert alert-error">${icon('ban')}<div><b>Đã hủy bởi ${esc(r.cancelled_by_name || '')} lúc ${fmtDateTime(r.cancelled_at)}</b><div>Lý do: ${esc(r.cancel_reason || '')}</div></div></div>` : ''}
        <div><h3 style="margin-bottom:10px">Nhật ký thay đổi</h3><div id="logs"><div class="skeleton"></div></div></div></div>`,
      footer: `<button class="btn btn-outline" data-close>Đóng</button>`,
    });
    try {
      const logs = await API.listLogs(r.id);
      const L = { create: 'Tạo báo cáo', update: 'Chỉnh sửa', cancel: 'Hủy báo cáo' };
      m.el.querySelector('#logs').innerHTML = `<ul class="timeline">${logs.map((l) => `
        <li class="${l.action}"><div class="bold">${L[l.action]} <span class="muted" style="font-weight:400">· ${esc(l.actor?.full_name || '')} · ${fmtDateTime(l.at)}</span></div>
        <div class="xs muted">${l.action === 'update' ? `Trước: ${set(l.before)}<br>Sau: ${set(l.after)}` : l.action === 'create' ? set(l.after) : `Lý do: ${esc(l.reason)}`}</div></li>`).join('')}</ul>`;
    } catch (e) { m.el.querySelector('#logs').textContent = e.message; }
  }

  // ---------- Tồn bán thành phẩm ----------
  async function openStock() {
    const items = await API.listItems();
    let rows = [], loadedAt = '';
    const m = UI.modal({
      title: 'Xem tồn bán thành phẩm', size: 'full',
      body: `<div class="stack">
        <div class="grid" style="grid-template-columns:repeat(4,1fr) auto;align-items:end">
          <div class="field"><label>Từ ngày</label><input class="input" type="date" name="from" disabled></div>
          <div class="field"><label>Đến ngày</label><input class="input" type="date" name="to" value="${UI.today()}"></div>
          <div class="field"><label>Chiều xem báo cáo</label><select class="select" name="view"><option value="unit">Theo xí nghiệp</option><option value="item">Theo mã hàng</option></select></div>
          <div class="field" id="item-f" style="visibility:hidden"><label>Mã hàng</label><select class="select" name="item"><option value="">Chọn mã hàng</option>${options(items.map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` })))}</select></div>
          <div class="row"><button class="btn btn-outline btn-icon" data-r title="Tải lại">${icon('refresh-cw')}</button><button class="btn btn-outline" data-x>${icon('file-spreadsheet')} Xuất Excel</button></div>
        </div>
        <label class="check"><input type="checkbox" name="all" checked> Tính tồn từ đầu đến thời điểm hiện tại</label>
        <div id="out"></div></div>`,
      footer: `<button class="btn btn-outline" data-close>${icon('x')} Đóng</button>`,
    });
    const el = (n) => m.el.querySelector(`[name=${n}]`);
    const out = m.el.querySelector('#out');
    const aggUnit = () => {
      const map = new Map();
      for (const r of rows) {
        const k = r.unit_id + r.operation_id, c = map.get(k);
        if (!c) map.set(k, { ...r });
        else ['opening_qty', 'received_qty', 'transferred_qty', 'closing_qty', 'report_count'].forEach((f) => (c[f] = Number(c[f]) + Number(r[f])));
      }
      return [...map.values()].sort((a, b) => a.unit_name.localeCompare(b.unit_name, 'vi') || a.operation_name.localeCompare(b.operation_name, 'vi'));
    };
    const aggItem = () => {
      const map = new Map();
      for (const r of rows) {
        const c = map.get(r.operation_id);
        if (!c) map.set(r.operation_id, { ...r });
        else ['opening_qty', 'received_qty', 'transferred_qty', 'closing_qty'].forEach((f) => (c[f] = Number(c[f]) + Number(r[f])));
      }
      const list = [...map.values()].sort((a, b) => a.seq - b.seq);
      return list.map((r, i) => ({ ...r, next: list[i + 1]?.operation_code, gap: list[i + 1] ? Number(r.transferred_qty) - Number(list[i + 1].received_qty) : null }));
    };
    const draw = () => {
      const all = el('all').checked, view = el('view').value;
      const negs = rows.filter((r) => Number(r.closing_qty) < 0);
      const count = rows.reduce((a, r) => a + Number(r.report_count), 0);
      let html = negs.map((r) => `<div class="alert alert-warning" style="margin-bottom:8px">${icon('triangle-alert')} Tồn bán thành phẩm tại mã hàng ${esc(r.item_code)}, công đoạn ${esc(r.operation_code)} (${esc(r.unit_name)}) đang âm ${fmtQty(Math.abs(r.closing_qty))} chiếc. Vui lòng kiểm tra dữ liệu nhận và chuyển bán thành phẩm.</div>`).join('');
      html += `<div class="row between" style="margin:8px 0"><div><h3>${view === 'unit' ? 'Tồn bán thành phẩm theo xí nghiệp' : 'Tồn bán thành phẩm theo mã hàng'}</h3>
        <p class="xs muted">${all ? 'Từ đầu' : 'Từ ' + UI.fmtDate(el('from').value)} đến ${fmtDateTime(loadedAt)} · ${count} báo cáo đã ghi nhận</p></div>${badge('Đơn vị: chiếc')}</div>`;
      if (view === 'item' && !el('item').value) html += '<p class="muted center" style="padding:40px">Vui lòng chọn mã hàng để xem tồn bán thành phẩm.</p>';
      else if (!rows.length) html += '<p class="muted center" style="padding:40px">Không có dữ liệu tồn bán thành phẩm phù hợp với điều kiện đã chọn.</p>';
      else if (view === 'unit') {
        html += `<div class="table-wrap"><table class="table"><thead><tr><th>Tên xí nghiệp</th><th>Tên công đoạn</th>${all ? '' : '<th class="num">Tồn đầu kỳ</th>'}<th class="num">Nhận bán thành phẩm</th><th class="num">Chuyển bán thành phẩm</th><th class="num">Tồn cuối kỳ</th></tr></thead><tbody>
          ${aggUnit().map((r) => `<tr><td>${icon('factory', 'muted')} ${esc(r.unit_name)}</td><td><div class="bold">${esc(r.operation_name)}</div><div class="sub mono">${esc(r.operation_code)}</div></td>
          ${all ? '' : `<td class="num">${fmtQty(r.opening_qty)}</td>`}<td class="num">${fmtQty(r.received_qty)}</td><td class="num">${fmtQty(r.transferred_qty)}</td>
          <td class="num bold ${Number(r.closing_qty) < 0 ? 'text-error' : ''}">${fmtQty(r.closing_qty)}</td></tr>`).join('')}</tbody></table></div>`;
      } else {
        html += `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Công đoạn</th>${all ? '' : '<th class="num">Tồn đầu kỳ</th>'}<th class="num">Nhận bán thành phẩm</th><th class="num">Chuyển bán thành phẩm</th><th class="num">Tồn cuối kỳ</th><th class="num">Lệch chuyển → nhận công đoạn sau</th></tr></thead><tbody>
          ${aggItem().map((r) => `<tr><td class="muted">${r.seq}</td><td><div class="bold">${esc(r.operation_name)}</div><div class="sub mono">${esc(r.operation_code)}</div></td>
          ${all ? '' : `<td class="num">${fmtQty(r.opening_qty)}</td>`}<td class="num">${fmtQty(r.received_qty)}</td><td class="num">${fmtQty(r.transferred_qty)}</td>
          <td class="num bold ${Number(r.closing_qty) < 0 ? 'text-error' : ''}">${fmtQty(r.closing_qty)}</td>
          <td class="num">${r.gap === null ? '<span class="muted">—</span>' : r.gap === 0 ? badge('Khớp ' + r.next, 'success') : badge(`${r.gap > 0 ? '+' : ''}${fmtQty(r.gap)} so với ${r.next}`, 'warning')}</td></tr>`).join('')}</tbody></table></div>
          <p class="xs muted" style="margin-top:8px">Lệch dương: công đoạn trước đã chuyển nhiều hơn số công đoạn sau đã ghi nhận — kiểm tra hàng đang trên đường hoặc báo cáo thiếu.</p>`;
      }
      out.innerHTML = html; refreshIcons();
    };
    const load = async () => {
      const all = el('all').checked, view = el('view').value;
      el('from').disabled = all;
      m.el.querySelector('#item-f').style.visibility = view === 'item' ? 'visible' : 'hidden';
      if (!all && el('from').value && el('to').value && el('from').value > el('to').value) return UI.warn('Từ ngày không được lớn hơn Đến ngày.');
      if (view === 'item' && !el('item').value) { rows = []; return draw(); }
      out.innerHTML = '<div class="skeleton" style="height:80px"></div>';
      try {
        const to = el('to').value === UI.today() ? new Date().toISOString() : UI.endIso(el('to').value);
        rows = await API.getStock({ from: all ? null : UI.startIso(el('from').value), to, itemId: view === 'item' ? el('item').value : null });
        loadedAt = new Date().toISOString();
        draw();
      } catch (e) { UI.err(e.message); out.innerHTML = ''; }
    };
    m.el.addEventListener('change', load);
    m.el.querySelector('[data-r]').addEventListener('click', load);
    m.el.querySelector('[data-x]').addEventListener('click', () => {
      if (!rows.length) return UI.warn('Không có dữ liệu để xuất.');
      if (el('view').value === 'unit')
        Shared.exportExcel(`ton-ban-thanh-pham-theo-xi-nghiep-${UI.today()}.xlsx`, 'Tồn bán thành phẩm', ['Xí nghiệp', 'Mã công đoạn', 'Tên công đoạn', 'Tồn đầu kỳ', 'Nhận bán thành phẩm', 'Chuyển bán thành phẩm', 'Tồn cuối kỳ'],
          aggUnit().map((r) => [r.unit_name, r.operation_code, r.operation_name, +r.opening_qty, +r.received_qty, +r.transferred_qty, +r.closing_qty]));
      else
        Shared.exportExcel(`ton-ban-thanh-pham-${rows[0].item_code}-${UI.today()}.xlsx`, 'Tồn bán thành phẩm', ['Thứ tự', 'Mã công đoạn', 'Tên công đoạn', 'Tồn đầu kỳ', 'Nhận bán thành phẩm', 'Chuyển bán thành phẩm', 'Tồn cuối kỳ', 'Lệch chuyển → nhận công đoạn sau'],
          aggItem().map((r) => [r.seq, r.operation_code, r.operation_name, +r.opening_qty, +r.received_qty, +r.transferred_qty, +r.closing_qty, r.gap]));
    });
    load();
  }

  // ---------- Trang ----------
  async function render(root, query, opts = {}) {
    const mine = !!opts.mine;                       // "Báo cáo của tôi" (công nhân trên máy tính)
    const me = mine ? Auth.user.id : undefined;
    const units = await API.listUnits();
    const f = { search: '', unit: query.unit || '', status: '', method: '', from: query.from || '', to: query.to || '', page: 1, size: 20 };
    let data = { rows: [], total: 0 };

    root.innerHTML = `<div class="stack">
      ${UI.pageHead(mine ? 'Báo cáo của tôi' : 'Lịch sử báo cáo', mine ? 'clipboard-list' : 'history', `
        ${mine ? '' : `<button class="btn btn-outline" data-act="stock" data-testid="open-stock">${icon('chart-column')} Xem tồn bán thành phẩm</button>`}
        <button class="btn btn-outline" data-act="export">${icon('file-spreadsheet')} Xuất Excel</button>
        ${Auth.has('REPORT_PROGRESS') ? `<a class="btn" href="#/progress">${icon('plus')} Báo cáo tiến độ</a>` : ''}`)}
      <div class="card">
        <div class="card-title"><div><h2>${mine ? 'Báo cáo sản xuất của tôi' : 'Lịch sử báo cáo sản xuất'}</h2><p class="sm muted">${mine ? 'Chỉ hiển thị báo cáo do chính tài khoản này nhập. Sửa hoặc hủy được trong ngày đã nhập.' : 'Theo dõi sản lượng theo mã hàng và công đoạn'}</p></div><div class="row"><span class="live-tag" data-live></span>${badge('Đơn vị: chiếc')}</div></div>
        <div class="grid g4">
          <div class="input-wrap has-prefix"><span class="prefix">${icon('search')}</span><input class="input" name="search" placeholder="Tìm mã hàng, công đoạn, người báo cáo..."></div>
          <select class="select" name="unit"><option value="">Tất cả đơn vị</option>${options(units.map((u) => ({ value: u.id, label: u.name })), f.unit)}</select>
          <select class="select" name="status"><option value="">Tất cả trạng thái</option><option value="active">Đã ghi nhận</option><option value="cancelled">Đã hủy</option></select>
          <select class="select" name="method"><option value="">Tất cả hình thức</option><option value="manual">Thủ công</option><option value="qr">QR</option></select>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr auto;align-items:end;margin-top:12px">
          <div class="field"><label>Từ ngày</label><input class="input" type="date" name="from" value="${esc(f.from)}"></div>
          <div class="field"><label>Đến ngày</label><input class="input" type="date" name="to" value="${esc(f.to)}"></div>
          <button class="btn btn-outline btn-icon" data-act="reset" title="Bỏ lọc và tải lại">${icon('rotate-ccw')}</button>
        </div>
        <div id="date-err"></div>
        <div class="table-wrap" style="margin-top:14px"><table class="table"><thead><tr>
          <th>Thời gian báo cáo</th><th>Người báo cáo</th><th>Mã hàng / Công đoạn</th><th class="num">Sản lượng đạt</th><th class="num">Sản lượng không đạt</th>
          <th class="num">Tổng sản lượng</th><th class="num">Nhận bán thành phẩm</th><th class="num">Chuyển bán thành phẩm</th><th>Hình thức</th><th>Trạng thái</th><th>Thao tác</th>
        </tr></thead><tbody id="tb"></tbody></table></div>
        <div class="row between" style="margin-top:14px"><span class="sm muted" id="info"></span><div class="pager" id="pager"></div></div>
      </div></div>`;

    const tb = root.querySelector('#tb');
    const load = async () => {
      const de = root.querySelector('#date-err');
      if (f.from && f.to && f.from > f.to) { de.innerHTML = `<div class="alert alert-warning" style="margin-top:10px">${icon('triangle-alert')} Từ ngày không được lớn hơn Đến ngày.</div>`; refreshIcons(); return; }
      de.innerHTML = '';
      if (!tb.children.length) tb.innerHTML = '<tr><td colspan="11"><div class="skeleton"></div></td></tr>';
      try {
        data = await API.listReports({ reporterId: me, search: f.search, unitId: f.unit, status: f.status, method: f.method, from: UI.startIso(f.from), to: UI.endIso(f.to), page: f.page, pageSize: f.size });
      } catch (e) { UI.err(e.message); data = { rows: [], total: 0 }; }
      tb.innerHTML = data.rows.length ? data.rows.map((r, i) => `<tr>
        <td class="nowrap">${fmtDateTime(r.reported_at)}</td>
        <td><div class="bold">${esc(r.reporter_name)}</div><div class="sub">${esc(r.unit_name)}</div></td>
        <td><div class="bold">${esc(r.item_code)}</div><div class="sub">${esc(r.operation_code)} · ${esc(r.operation_name)}</div></td>
        <td class="num text-success">${fmtQty(r.ok_qty)}</td><td class="num text-error">${fmtQty(r.ng_qty)}</td>
        <td class="num bold">${fmtQty(r.total_qty)}</td><td class="num">${fmtQty(r.received_qty)}</td><td class="num">${fmtQty(r.transferred_qty)}</td>
        <td>${badge(METHOD[r.method], r.method === 'qr' ? 'info' : 'neutral')}</td>
        <td><span title="${esc(r.cancel_reason || '')}">${badge(STATUS[r.status], r.status === 'active' ? 'success' : 'error')}</span></td>
        <td class="nowrap"><button class="btn btn-ghost btn-icon" data-act="detail" data-i="${i}" title="Chi tiết">${icon('eye')}</button>
          ${canEdit(r) ? `<button class="btn btn-ghost btn-icon" data-act="edit" data-i="${i}" title="Chỉnh sửa" data-testid="edit-report">${icon('pencil')}</button>
          <button class="btn btn-ghost btn-icon danger" data-act="cancel" data-i="${i}" title="Hủy báo cáo" data-testid="cancel-report">${icon('x')}</button>` : ''}</td></tr>`).join('')
        : '<tr><td colspan="11" class="empty">Không tìm thấy báo cáo phù hợp với điều kiện tìm kiếm.</td></tr>';
      const pages = Math.max(1, Math.ceil(data.total / f.size));
      root.querySelector('#info').textContent = `Hiển thị ${data.total ? (f.page - 1) * f.size + 1 : 0} - ${Math.min(f.page * f.size, data.total)} trong tổng số ${data.total} báo cáo`;
      const nums = [...new Set([1, f.page - 1, f.page, f.page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
      root.querySelector('#pager').innerHTML = `<button class="btn btn-outline btn-sm" data-act="page" data-p="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''}>${icon('chevron-left')}</button>
        ${nums.map((n) => `<button class="btn btn-outline btn-sm ${n === f.page ? 'cur' : ''}" data-act="page" data-p="${n}">${n}</button>`).join('')}
        <button class="btn btn-outline btn-sm" data-act="page" data-p="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''}>${icon('chevron-right')}</button>
        <select class="select" style="width:auto" name="size">${options([10, 20, 50, 100].map((n) => ({ value: n, label: n })), f.size)}</select>`;
      refreshIcons();
    };

    const refresh = () => { f.page = 1; load(); };
    root.querySelector('[name=search]').addEventListener('input', UI.debounce((e) => { f.search = e.target.value; refresh(); }, 350));
    root.addEventListener('change', (e) => {
      const n = e.target.name;
      if (['unit', 'status', 'method', 'from', 'to'].includes(n)) { f[n] = e.target.value; refresh(); }
      if (n === 'size') { f.size = Number(e.target.value); refresh(); }
    });
    const row = (t) => data.rows[Number(t.dataset.i)];
    UI.on(root, 'click', {
      page: (t) => { f.page = Number(t.dataset.p); load(); },
      reset: () => { Object.assign(f, { search: '', unit: '', status: '', method: '', from: '', to: '', page: 1 });
        root.querySelectorAll('.card input, .card select').forEach((el) => { if (el.name !== 'size') el.value = ''; }); load(); },
      detail: (t) => openDetail(row(t)),
      edit: (t) => openEdit(row(t), load),
      cancel: (t) => openCancel(row(t), load),
      stock: () => openStock(),
      export: (btn) => UI.busy(btn, async () => {
        try {
          const { rows } = await API.listReports({ reporterId: me, search: f.search, unitId: f.unit, status: f.status, method: f.method, from: UI.startIso(f.from), to: UI.endIso(f.to), page: 1, pageSize: 5000 });
          Shared.exportExcel(`lich-su-bao-cao-${UI.today()}.xlsx`, 'Báo cáo',
            ['Thời gian', 'Người báo cáo', 'Xí nghiệp', 'Mã hàng', 'Tên sản phẩm', 'Mã công đoạn', 'Tên công đoạn', 'Đạt', 'Không đạt', 'Tổng', 'Nhận bán thành phẩm', 'Chuyển bán thành phẩm', 'Hình thức', 'Trạng thái', 'Lý do hủy'],
            rows.map((r) => [fmtDateTime(r.reported_at), r.reporter_name, r.unit_name, r.item_code, r.item_name, r.operation_code, r.operation_name, r.ok_qty, r.ng_qty, r.total_qty, r.received_qty, r.transferred_qty, METHOD[r.method], STATUS[r.status], r.cancel_reason || '']));
          UI.ok(`Đã xuất ${rows.length} báo cáo ra Excel.`);
        } catch (e) { UI.err(e.message); }
      }),
    });
    load();
    App.live(root, load, { notify: true });
  }

  PAGES['/history'] = { title: 'Lịch sử báo cáo', any: ['VIEW_REPORT', 'MANAGE_REPORT'], render };
  PAGES['/mine'] = { title: 'Báo cáo của tôi', perm: 'REPORT_PROGRESS', render: (root, q) => render(root, q, { mine: true }) };
  window.ReportDialogs = { canEdit, openEdit, openCancel, openDetail };
})();
