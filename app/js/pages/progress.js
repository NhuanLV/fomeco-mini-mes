/* Báo cáo tiến độ: thủ công / QR (spec 4.1, 4.2) */
(function () {
  const { esc, icon, fmtQty, fmtDateTime, METHOD, badge, refreshIcons, options } = UI;

  async function renderRecent(box) {
    const u = Auth.user;
    box.innerHTML = '<div class="skeleton" style="height:60px"></div>';
    try {
      const { rows } = await API.listReports({ unitId: u.unit_level === 1 ? null : u.unit_id, status: 'active', pageSize: 6 });
      box.innerHTML = rows.length ? `<ul class="list-recent">${rows.map((r) => `
        <li><div class="row between"><b>${esc(r.item_code)}</b>${badge(METHOD[r.method], r.method === 'qr' ? 'info' : 'neutral')}</div>
          <div class="xs muted">${esc(r.operation_code)} · ${esc(r.operation_name)}</div>
          <div><span class="big-num">${fmtQty(r.total_qty)}</span> <span class="xs muted">chiếc</span></div>
          <div class="xs muted">${fmtDateTime(r.reported_at)} · ${esc(r.reporter_name)}</div></li>`).join('')}</ul>`
        : '<p class="muted center" style="padding:24px">Chưa có báo cáo nào.</p>';
    } catch (e) { box.innerHTML = `<p class="text-error sm">${esc(e.message)}</p>`; }
  }

  async function render(root) {
    const u = Auth.user;
    let mode = localStorage.getItem('fomeco.report.tab') === 'qr' ? 'qr' : 'manual';
    let keep = localStorage.getItem('fomeco.report.keep') !== '0';
    const itemOps = (await API.listItemOps()).filter((o) => o.active);
    const items = [...new Map(itemOps.map((o) => [o.item_id, o])).values()];
    let sel = { item: '', op: '' };
    let scanned = null;

    root.innerHTML = `<div class="stack">
      ${UI.pageHead('Báo cáo tiến độ', 'clipboard-pen-line', (Auth.has('VIEW_REPORT') || Auth.has('MANAGE_REPORT')) ? `<a class="btn btn-outline" href="#/history">${icon('history')} Lịch sử báo cáo</a>` : `<a class="btn btn-outline" href="#/mine">${icon('clipboard-list')} Báo cáo của tôi</a>`)}
      ${u.unit_id ? '' : `<div class="alert alert-warning">${icon('triangle-alert')} Tài khoản chưa được phân công đơn vị. Vui lòng liên hệ quản trị viên.</div>`}
      <div class="side-layout">
        <div class="card">
          <div class="tabs">
            <button class="tab" data-act="tab" data-mode="manual">${icon('pencil')} Báo cáo thủ công</button>
            <button class="tab" data-act="tab" data-mode="qr">${icon('qr-code')} Báo cáo QR</button>
          </div>
          <div id="form"></div>
        </div>
        <div class="card"><div class="row between" style="margin-bottom:6px"><h2>Báo cáo gần đây</h2><span class="live-tag" data-live></span></div><div id="recent"></div>
          <a class="sm bold" href="${(Auth.has('VIEW_REPORT') || Auth.has('MANAGE_REPORT')) ? '#/history' : '#/mine'}">Xem tất cả báo cáo →</a></div>
      </div></div>`;

    const form = root.querySelector('#form');
    const draw = () => {
      root.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
      const ops = itemOps.filter((o) => o.item_id === sel.item);
      const q = form.querySelector('[name=ok_qty]') ? Shared.readQty(form) : { ng_qty: '0' };
      form.innerHTML = `<div class="stack">
        <div class="card-title" style="margin:0"><div><h2>Thông tin báo cáo sản xuất</h2><p class="sm muted">Sản lượng theo công đoạn</p></div>${badge('Đơn vị: chiếc')}</div>
        ${mode === 'qr' ? `<div class="row">
            <button class="btn btn-lg" data-act="scan" data-testid="open-scan">${icon('scan-qr-code')} Quét mã QR</button>
            ${scanned ? badge(`✓ ${scanned.item_code} · ${scanned.operation_code} — ${scanned.operation_name}`, 'success', 'badge-lg') : '<span class="muted sm">Chưa quét mã QR</span>'}
          </div>` : ''}
        <div class="grid g2">
          <div class="field"><label>Mã hàng <span class="req">*</span></label>
            <select class="select ${mode === 'qr' ? 'input-lg' : ''}" name="item" data-testid="item-select" ${mode === 'qr' ? 'disabled' : ''}>
              <option value="">Chọn mã hàng</option>${options(items.map((o) => ({ value: o.item_id, label: `${o.item_code} — ${o.item_name}` })), sel.item)}
            </select></div>
          <div class="field"><label>Công đoạn <span class="req">*</span></label>
            <select class="select ${mode === 'qr' ? 'input-lg' : ''}" name="op" data-testid="op-select" ${mode === 'qr' || !sel.item ? 'disabled' : ''}>
              <option value="">${sel.item ? 'Chọn công đoạn' : 'Chọn mã hàng trước'}</option>${options(ops.map((o) => ({ value: o.operation_id, label: `${o.operation_code} · ${o.operation_name}` })), sel.op)}
            </select></div>
        </div>
        ${Shared.qtyFieldsHtml(q, mode === 'qr')}
        <div class="sep"></div>
        <div class="row between">
          <div class="sm muted">
            <div>Người báo cáo: <b style="color:var(--text)">${esc(u.full_name)}</b></div>
            <div>${esc(u.unit_name || 'Chưa phân công đơn vị')}</div>
            <label class="check" style="margin-top:6px"><input type="checkbox" name="keep" ${keep ? 'checked' : ''}> Giữ mã hàng và công đoạn sau khi lưu</label>
          </div>
          <div class="row">
            <button class="btn btn-outline btn-lg" data-act="reset">${icon('rotate-ccw')} Nhập lại</button>
            <button class="btn btn-lg" data-act="save" data-testid="save-report">${icon('check')} Lưu báo cáo</button>
          </div>
        </div></div>`;
      Shared.bindTotal(form);
      refreshIcons();
    };

    form.addEventListener('change', (e) => {
      if (e.target.name === 'item') { sel.item = e.target.value; sel.op = ''; draw(); }
      if (e.target.name === 'op') sel.op = e.target.value;
      if (e.target.name === 'keep') { keep = e.target.checked; localStorage.setItem('fomeco.report.keep', keep ? '1' : '0'); }
    });

    async function onDetect(text) {
      if (!String(text).trim()) { UI.warn('Vui lòng quét hoặc nhập nội dung mã QR.'); return false; }
      const p = Shared.parseQr(text);
      if (!p) { UI.err('Mã QR không hợp lệ. Vui lòng kiểm tra và quét lại.'); return false; }
      try {
        const f = await API.findByCodes(p.itemCode, p.opCode);
        if (!f || !f.active) { UI.err('Không tìm thấy mã hàng hoặc công đoạn tương ứng trong danh mục ERP.'); return false; }
        scanned = f; sel = { item: f.item_id, op: f.operation_id };
        draw();
        UI.ok(`Đã nhận diện mã hàng ${f.item_code} và công đoạn ${f.operation_code}.`);
        setTimeout(() => { const el = form.querySelector('[name=ok_qty]'); el && el.focus(); }, 50);
        return true;
      } catch (e) { UI.err(e.message); return false; }
    }

    async function checkNegative(itemId, opId) {
      if (!u.unit_id) return;
      try {
        const r = (await API.getStock({ unitId: u.unit_id, itemId })).find((x) => x.operation_id === opId);
        if (r && Number(r.closing_qty) < 0)
          UI.toast('warning', 'Cảnh báo tồn bán thành phẩm âm', `Tồn bán thành phẩm tại mã hàng ${r.item_code}, công đoạn ${r.operation_code} (${r.unit_name}) đang âm ${fmtQty(Math.abs(r.closing_qty))} chiếc. Vui lòng kiểm tra dữ liệu nhận và chuyển bán thành phẩm.`, 9000);
      } catch (e) { /* không chặn */ }
    }

    UI.on(root, 'click', {
      tab: (t) => { mode = t.dataset.mode; localStorage.setItem('fomeco.report.tab', mode); if (mode === 'qr') { sel = { item: '', op: '' }; scanned = null; } draw(); },
      scan: () => Shared.openScanner(onDetect),
      reset: () => { sel = { item: '', op: '' }; scanned = null; form.innerHTML = ''; draw(); },
      save: async (btn) => {
        if (!sel.item) return UI.warn('Vui lòng chọn mã hàng.');
        if (!sel.op) return UI.warn('Vui lòng chọn công đoạn.');
        if (!itemOps.some((o) => o.item_id === sel.item && o.operation_id === sel.op)) return UI.warn('Công đoạn không thuộc mã hàng đã chọn. Vui lòng chọn lại.');
        const q = Shared.readQty(form);
        const v = Shared.validateQty(q);
        if (v) return UI.warn(v);
        await UI.busy(btn, async () => {
          try {
            await API.createReport({ item_id: sel.item, operation_id: sel.op, method: mode, ...Shared.qtyPayload(q) });
            UI.ok('Đã lưu báo cáo sản xuất thành công.');
            const it = sel.item, op = sel.op;
            if (!keep) { sel = { item: '', op: '' }; scanned = null; }
            form.innerHTML = '';
            draw();
            renderRecent(root.querySelector('#recent'));
            checkNegative(it, op);
          } catch (e) {
            UI.err(e.message && !/kết nối/.test(e.message) ? e.message : 'Không thể lưu báo cáo. Vui lòng thử lại.');
          }
        });
      },
    });

    draw();
    renderRecent(root.querySelector('#recent'));
    App.live(root, () => renderRecent(root.querySelector('#recent')));
  }

  PAGES['/progress'] = { title: 'Báo cáo tiến độ', perm: 'REPORT_PROGRESS', render };
})();
