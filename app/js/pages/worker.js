/* Giao diện điện thoại cho công nhân:
   Trang chủ (sản lượng hôm nay + ô chức năng), Nhập báo cáo (thủ công / QR),
   Báo cáo của tôi (xem, sửa, hủy trong ngày), Tài khoản.
   Công nhân chỉ thấy báo cáo do chính mình nhập (RLS trên Supabase bảo đảm). */
(function () {
  const { esc, icon, fmtQty, fmtDateTime, METHOD, badge, refreshIcons, options, initials } = UI;
  const firstName = (n) => String(n || '').trim().split(' ').pop();
  const hhmm = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  async function myReports(from, to) {
    const { rows } = await API.listReports({ reporterId: Auth.user.id, from: UI.startIso(from), to: UI.endIso(to), pageSize: 200 });
    return rows;
  }

  function repCard(r, withActions) {
    const can = withActions && ReportDialogs.canEdit(r);
    return `<div class="m-rep ${r.status}" data-act="detail" data-id="${r.id}">
      <div class="top"><div><div class="code">${esc(r.item_code)}</div><div class="op">${esc(r.operation_code)} · ${esc(r.operation_name)}</div></div>
        ${r.status === 'cancelled' ? badge('Đã hủy', 'error') : badge(METHOD[r.method], r.method === 'qr' ? 'info' : 'neutral')}</div>
      <div class="nums"><div><b class="text-success">${fmtQty(r.ok_qty)}</b><span>Đạt</span></div>
        <div><b class="text-error">${fmtQty(r.ng_qty)}</b><span>Không đạt</span></div><div><b>${fmtQty(r.total_qty)}</b><span>Tổng</span></div></div>
      <div class="meta"><span>${icon('clock', 'ic-sm')} ${UI.isToday(r.reported_at) ? 'Hôm nay ' + hhmm(r.reported_at) : fmtDateTime(r.reported_at)}</span>
        ${r.received_qty || r.transferred_qty ? `<span>Nhận ${fmtQty(r.received_qty)} · Chuyển ${fmtQty(r.transferred_qty)}</span>` : ''}</div>
      ${can ? `<div class="acts"><button class="btn btn-outline" data-act="edit" data-id="${r.id}">${icon('pencil')} Sửa</button>
        <button class="btn btn-outline" style="color:var(--error)" data-act="cancel" data-id="${r.id}">${icon('ban')} Hủy</button></div>` : ''}
    </div>`;
  }

  // Bắt sự kiện xem chi tiết / sửa / hủy trên danh sách thẻ
  function bindCards(root, getRows, reload) {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !['detail', 'edit', 'cancel'].includes(t.dataset.act)) return;
      const r = getRows().find((x) => x.id === t.dataset.id);
      if (!r) return;
      e.stopPropagation();
      if (t.dataset.act === 'edit') ReportDialogs.openEdit(r, reload);
      else if (t.dataset.act === 'cancel') ReportDialogs.openCancel(r, reload);
      else ReportDialogs.openDetail(r);
    });
  }

  // ---------------- Trang chủ ----------------
  async function home(root) {
    const u = Auth.user;
    const rp = Auth.has('REPORT_PROGRESS');
    let rows = [];
    // Ô chức năng theo quyền (quản lý / admin có thêm các mục quản trị, mở trang web co giãn theo màn hình)
    const tiles = [
      rp && ['#/w/new?mode=manual', 'pencil-line', '', 'Báo cáo thủ công', 'tile-manual'],
      rp && ['#/w/new?mode=qr&scan=1', 'scan-qr-code', 'blue', 'Quét mã QR', 'tile-qr'],
      rp && ['#/w/mine', 'clipboard-list', 'amber', 'Báo cáo của tôi'],
      Auth.has('VIEW_REPORT') && ['#/', 'chart-column', 'blue', 'Dashboard'],
      (Auth.has('VIEW_REPORT') || Auth.has('MANAGE_REPORT')) && ['#/history', 'history', 'amber', 'Lịch sử báo cáo'],
      Auth.has('MANAGE_PRODUCT') && ['#/products', 'qr-code', '', 'Mã hàng và mã QR'],
      Auth.has('MANAGE_ACCOUNT') && ['#/accounts', 'id-card', 'blue', 'Quản lý tài khoản'],
      Auth.has('MANAGE_ORG') && ['#/org-units', 'building-2', 'amber', 'Tổ chức'],
      Auth.has('SYSTEM_ADMIN') && ['#/roles', 'shield', 'red', 'Vai trò'],
      ['#/w/me', 'user-round', 'red', 'Tài khoản của tôi'],
    ].filter(Boolean);
    root.innerHTML = `
      <div class="m-top">
        <div class="brand-sm"><img src="assets/logo.png?v=2" alt="FOMECO"><div>FOMECO<small>Báo cáo sản xuất</small></div></div>
        <div class="row" style="gap:10px"><span class="live-tag" data-live></span>
          <button class="m-round" data-act="to-web" title="Chuyển sang giao diện web">${icon('monitor')}</button>
          <a class="m-round" href="#/w/me" title="Tài khoản">${icon('settings')}</a></div>
      </div>
      <div class="m-hello"><div class="m-ava">${esc(initials(u.full_name))}</div>
        <div><div class="name">${esc(u.full_name)}</div>
          ${rp ? `<a class="m-chip" href="#/w/new?mode=qr&scan=1">${icon('scan-qr-code')} Báo cáo ngay ${icon('arrow-right')}</a>` : `<div class="muted sm">${esc(u.role_name || '')}</div>`}</div></div>
      ${rp ? `<a class="m-card m-today" href="#/w/mine" style="display:flex">
        <div><div class="lbl">Sản lượng hôm nay của tôi · ${esc(u.unit_name || 'Chưa phân công')}</div>
          <div class="val" id="t-ok">—</div><div class="sub" id="t-sub"></div></div>
        <div class="m-arrow">${icon('arrow-right')}</div></a>
      ${u.unit_id ? '' : `<div class="alert alert-warning" style="margin-top:12px">${icon('triangle-alert')} Tài khoản chưa được phân công đơn vị. Vui lòng liên hệ quản lý.</div>`}` : ''}
      <div class="m-sec"><h2>Chức năng</h2></div>
      <div class="m-card m-tiles" style="padding:10px">
        ${tiles.map(([h, ic, c, l, tid]) => `<a class="m-tile" href="${h}" ${tid ? `data-testid="${tid}"` : ''}><span class="ic ${c}">${icon(ic)}</span>${l}</a>`).join('')}
      </div>
      ${rp ? `<div class="m-sec"><h2>Gần đây</h2><a href="#/w/mine">Xem tất cả</a></div>
      <div class="m-list" id="recent"><div class="skeleton" style="height:120px;border-radius:16px"></div></div>` : ''}
      <button class="btn btn-outline btn-lg" data-act="to-web" style="width:100%;margin-top:16px;height:50px">${icon('monitor')} Chuyển sang giao diện web</button>`;
    if (!rp) return;
    const load = async () => {
      try { rows = await myReports(UI.daysAgo(6), UI.today()); } catch (e) { UI.err(e.message); rows = []; }
      const today = rows.filter((r) => r.status === 'active' && UI.isToday(r.reported_at));
      const sum = (k) => today.reduce((a, r) => a + Number(r[k]), 0);
      root.querySelector('#t-ok').innerHTML = `${fmtQty(sum('ok_qty'))} <small>chiếc đạt</small>`;
      root.querySelector('#t-sub').innerHTML = `<span class="text-error">Không đạt ${fmtQty(sum('ng_qty'))}</span><span>Tổng ${fmtQty(sum('total_qty'))}</span><span class="muted">${today.length} báo cáo</span>`;
      const recent = rows.slice(0, 3);
      root.querySelector('#recent').innerHTML = recent.length ? recent.map((r) => repCard(r, true)).join('')
        : `<div class="m-card m-empty">${icon('inbox', 'ic-xl')}<div>Chưa có báo cáo nào trong 7 ngày qua.<br>Bấm nút QR ở giữa để báo cáo.</div></div>`;
      refreshIcons();
    };
    bindCards(root, () => rows, load);
    await load();
    App.live(root, load);
  }

  // ---------------- Nhập báo cáo ----------------
  async function entry(root, query) {
    const u = Auth.user;
    const mode = query.mode === 'qr' ? 'qr' : 'manual';
    const itemOps = (await API.listItemOps()).filter((o) => o.active);
    const items = [...new Map(itemOps.map((o) => [o.item_id, o])).values()];
    let sel = { item: '', op: '' }, scanned = null;

    root.innerHTML = `
      <div class="m-head"><a class="m-round" href="#/w" title="Quay lại">${icon('arrow-left')}</a>
        <h1>${mode === 'qr' ? 'Báo cáo bằng QR' : 'Báo cáo thủ công'}</h1></div>
      <div class="m-seg"><button class="${mode === 'manual' ? 'on' : ''}" data-go="manual">${icon('pencil-line', 'ic-sm')} Thủ công</button>
        <button class="${mode === 'qr' ? 'on' : ''}" data-go="qr">${icon('scan-qr-code', 'ic-sm')} Quét QR</button></div>
      <div class="m-card m-form stack" id="form"></div>
      <p class="m-note">${icon('info')} Người báo cáo, xí nghiệp và thời gian được ghi tự động: ${esc(u.full_name)} · ${esc(u.unit_name || 'Chưa phân công')}.</p>
      <div class="m-save"><button class="btn" data-save data-testid="save-report">${icon('check')} Lưu báo cáo</button></div>`;
    const form = root.querySelector('#form');

    const draw = () => {
      const q = form.querySelector('[name=ok_qty]') ? Shared.readQty(form) : { ng_qty: '0' };
      const ops = itemOps.filter((o) => o.item_id === sel.item);
      const picked = itemOps.find((o) => o.item_id === sel.item && o.operation_id === sel.op);
      form.innerHTML = `
        ${mode === 'qr' ? (picked ? `<div class="m-picked"><span class="ic">${icon('check')}</span>
              <div style="flex:1;min-width:0"><div class="bold" style="font-size:18px">${esc(picked.item_code)}</div>
                <div class="sm muted">${esc(picked.operation_code)} · ${esc(picked.operation_name)}</div></div>
              <button class="btn btn-outline btn-sm" data-scan>${icon('scan-line')} Quét lại</button></div>`
          : `<button class="m-scan" data-scan data-testid="open-scan">${icon('scan-qr-code')}Chạm để quét mã QR công đoạn<span class="sm muted" style="font-weight:500">Mã hàng và công đoạn sẽ tự điền</span></button>`)
        : `<div class="field"><label>Mã hàng <span class="req">*</span></label>
            <select class="select" name="item" data-testid="item-select"><option value="">Chọn mã hàng</option>
              ${options(items.map((o) => ({ value: o.item_id, label: `${o.item_code} — ${o.item_name}` })), sel.item)}</select></div>
          <div class="field"><label>Công đoạn <span class="req">*</span></label>
            <select class="select" name="op" data-testid="op-select" ${sel.item ? '' : 'disabled'}><option value="">${sel.item ? 'Chọn công đoạn' : 'Chọn mã hàng trước'}</option>
              ${options(ops.map((o) => ({ value: o.operation_id, label: `${o.operation_code} · ${o.operation_name}` })), sel.op)}</select></div>`}
        ${Shared.qtyFieldsHtml(q, true)}`;
      Shared.bindTotal(form);
      refreshIcons();
    };

    async function onDetect(text) {
      if (!String(text).trim()) { UI.warn('Vui lòng quét hoặc nhập nội dung mã QR.'); return false; }
      const p = Shared.parseQr(text);
      if (!p) { UI.err('Mã QR không hợp lệ. Vui lòng kiểm tra và quét lại.'); return false; }
      try {
        const f = await API.findByCodes(p.itemCode, p.opCode);
        if (!f || !f.active) { UI.err('Không tìm thấy mã hàng hoặc công đoạn tương ứng trong danh mục ERP.'); return false; }
        scanned = f; sel = { item: f.item_id, op: f.operation_id };
        draw();
        UI.ok(`Đã nhận diện ${f.item_code} · ${f.operation_code}. Nhập số lượng rồi bấm Lưu.`);
        return true;
      } catch (e) { UI.err(e.message); return false; }
    }

    async function checkNegative(itemId, opId) {
      try {
        const r = (await API.getStock({ unitId: u.unit_id, itemId })).find((x) => x.operation_id === opId);
        if (r && Number(r.closing_qty) < 0)
          UI.toast('warning', 'Cảnh báo tồn bán thành phẩm âm', `Tồn bán thành phẩm tại mã hàng ${r.item_code}, công đoạn ${r.operation_code} (${r.unit_name}) đang âm ${fmtQty(Math.abs(r.closing_qty))} chiếc. Vui lòng kiểm tra dữ liệu nhận và chuyển bán thành phẩm.`, 9000);
      } catch (e) { /* không chặn */ }
    }

    form.addEventListener('change', (e) => {
      if (e.target.name === 'item') { sel.item = e.target.value; sel.op = ''; draw(); }
      if (e.target.name === 'op') sel.op = e.target.value;
    });
    root.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) { location.hash = `#/w/new?mode=${go.dataset.go}${go.dataset.go === 'qr' ? '&scan=1' : ''}`; return; }
      if (e.target.closest('[data-scan]')) Shared.openScanner(onDetect);
    });
    root.querySelector('[data-save]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
      if (!u.unit_id) return UI.warn('Tài khoản chưa được phân công đơn vị. Vui lòng liên hệ quản lý.');
      if (!sel.item) return UI.warn(mode === 'qr' ? 'Vui lòng quét mã QR công đoạn.' : 'Vui lòng chọn mã hàng.');
      if (!sel.op) return UI.warn('Vui lòng chọn công đoạn.');
      const q = Shared.readQty(form);
      const v = Shared.validateQty(q);
      if (v) return UI.warn(v);
      try {
        await API.createReport({ item_id: sel.item, operation_id: sel.op, method: mode, ...Shared.qtyPayload(q) });
        const it = sel.item, op = sel.op;
        UI.ok('Đã lưu báo cáo sản xuất thành công.');
        form.innerHTML = '';               // giữ mã hàng & công đoạn, xóa số lượng
        draw();
        checkNegative(it, op);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      } catch (e2) {
        UI.err(e2.message && !/kết nối/.test(e2.message) ? e2.message : 'Không thể lưu báo cáo. Vui lòng thử lại.');
      }
    }));

    draw();
    if (mode === 'qr' && query.scan === '1') {
      history.replaceState(null, '', '#/w/new?mode=qr');   // tránh mở lại camera khi tải lại trang
      setTimeout(() => Shared.openScanner(onDetect), 150);
    }
  }

  // ---------------- Báo cáo của tôi ----------------
  async function mine(root) {
    const ranges = { today: ['Hôm nay', 0, 0], yesterday: ['Hôm qua', 1, 1], week: ['7 ngày', 6, 0], month: ['30 ngày', 29, 0] };
    let range = 'today', rows = [];
    root.innerHTML = `
      <div class="m-head"><a class="m-round" href="#/w" title="Quay lại">${icon('arrow-left')}</a><h1 style="flex:1">Báo cáo của tôi</h1><span class="live-tag" data-live></span></div>
      <div class="m-seg">${Object.entries(ranges).map(([k, [l]]) => `<button data-r="${k}" class="${k === range ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="m-card m-today" style="margin-bottom:10px"><div><div class="lbl" id="s-lbl"></div><div class="val" id="s-ok">—</div><div class="sub" id="s-sub"></div></div></div>
      <p class="m-note">${icon('info')} Chỉ sửa hoặc hủy được báo cáo của mình trong ngày đã nhập. Báo cáo ngày cũ cần điều chỉnh, vui lòng liên hệ quản lý.</p>
      <div class="m-list" id="list"><div class="skeleton" style="height:120px;border-radius:16px"></div></div>`;
    const load = async () => {
      const [l, a, b] = ranges[range];
      try { rows = await myReports(UI.daysAgo(a), UI.daysAgo(b)); } catch (e) { UI.err(e.message); rows = []; }
      const act = rows.filter((r) => r.status === 'active');
      const sum = (k) => act.reduce((x, r) => x + Number(r[k]), 0);
      root.querySelector('#s-lbl').textContent = `Tổng sản lượng · ${l}`;
      root.querySelector('#s-ok').innerHTML = `${fmtQty(sum('ok_qty'))} <small>chiếc đạt</small>`;
      root.querySelector('#s-sub').innerHTML = `<span class="text-error">Không đạt ${fmtQty(sum('ng_qty'))}</span><span>Tổng ${fmtQty(sum('total_qty'))}</span><span class="muted">${act.length} báo cáo${rows.length > act.length ? ` · ${rows.length - act.length} đã hủy` : ''}</span>`;
      root.querySelector('#list').innerHTML = rows.length ? rows.map((r) => repCard(r, true)).join('')
        : `<div class="m-card m-empty">${icon('inbox', 'ic-xl')}<div>Không có báo cáo nào trong khoảng thời gian này.</div></div>`;
      refreshIcons();
    };
    root.querySelector('.m-seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      range = b.dataset.r;
      root.querySelectorAll('.m-seg button').forEach((x) => x.classList.toggle('on', x === b));
      load();
    });
    bindCards(root, () => rows, load);
    await load();
    App.live(root, load);
  }

  // ---------------- Tài khoản ----------------
  function me(root) {
    const u = Auth.user;
    root.innerHTML = `
      <div class="m-head"><a class="m-round" href="#/w" title="Quay lại">${icon('arrow-left')}</a><h1>Tài khoản</h1></div>
      <div class="m-hello"><div class="m-ava">${esc(initials(u.full_name))}</div>
        <div><div class="name">${esc(u.full_name)}</div><div class="muted">Xin chào ${esc(firstName(u.full_name))}!</div></div></div>
      <div class="m-card"><dl class="m-info">
        <dt>Tên đăng nhập</dt><dd class="mono">${esc(u.username)}</dd>
        <dt>Xí nghiệp</dt><dd>${esc(u.unit_name || 'Chưa phân công')}</dd>
        <dt>Vai trò</dt><dd>${esc(u.role_name || '')}</dd></dl></div>
      <div class="stack" style="margin-top:16px">
        <button class="btn btn-outline btn-lg" data-pw style="height:52px">${icon('key-round')} Đổi mật khẩu</button>
        <button class="btn btn-outline btn-lg" data-act="to-web" style="height:52px">${icon('monitor')} Chuyển sang giao diện web</button>
        <button class="btn btn-danger btn-lg" data-act="logout" style="height:52px">${icon('log-out')} Đăng xuất</button>
      </div>
      <p class="m-note" style="margin-top:14px">${icon('info')} Quên mật khẩu? Liên hệ quản trị hệ thống để được đặt lại.</p>`;
    root.querySelector('[data-pw]').addEventListener('click', () => {
      const m = UI.modal({
        title: 'Đổi mật khẩu',
        body: `<div class="stack">
          <div class="field"><label>Mật khẩu mới <span class="req">*</span></label><input class="input" type="password" name="p1" autocomplete="new-password"><span class="help">Ít nhất 6 ký tự</span></div>
          <div class="field"><label>Nhập lại mật khẩu mới <span class="req">*</span></label><input class="input" type="password" name="p2" autocomplete="new-password"></div></div>`,
        footer: `<button class="btn btn-ghost" data-close>Hủy</button><button class="btn" data-ok>${icon('key-round')} Đổi mật khẩu</button>`,
      });
      m.el.querySelector('[data-ok]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
        const p1 = m.el.querySelector('[name=p1]').value, p2 = m.el.querySelector('[name=p2]').value;
        if (p1.length < 6) return UI.warn('Mật khẩu phải có ít nhất 6 ký tự.');
        if (p1 !== p2) return UI.warn('Mật khẩu nhập lại không khớp.');
        try { await API.changeMyPassword(p1); UI.ok('Đã đổi mật khẩu.'); m.close(); } catch (e2) { UI.err(e2.message); }
      }));
    });
  }

  const P = { perm: 'REPORT_PROGRESS', mobile: true };
  PAGES['/w'] = { title: 'Trang chủ', mobile: true, render: home };
  PAGES['/w/new'] = { ...P, title: 'Nhập báo cáo', render: entry };
  PAGES['/w/mine'] = { ...P, title: 'Báo cáo của tôi', render: mine };
  PAGES['/w/me'] = { title: 'Tài khoản', mobile: true, render: me };
})();
