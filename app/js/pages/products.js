/* Quản trị mã hàng: danh mục, công đoạn, tạo QR, xem/in tem, nhập Excel */
(function () {
  const { esc, icon, fmtDateTime, badge, refreshIcons, options, SOURCE, normalize } = UI;

  function erpInfo(subject) {
    UI.modal({
      title: 'Đồng bộ ERP (Bravo)',
      body: `<div class="stack sm" style="line-height:1.7">
        <div class="alert alert-info">${icon('info')}<div><b>Bản demo chưa kết nối trực tiếp Bravo</b><div>Danh mục ${esc(subject)} đang dùng dữ liệu mẫu, đã có cột Mã ERP và Nguồn dữ liệu để sẵn sàng đồng bộ.</div></div></div>
        <p>Khi triển khai thật, đồng bộ chạy theo luồng:</p>
        <ol style="margin:0;padding-left:20px">
          <li>Chương trình đồng bộ đặt trong mạng nội bộ FOMECO, đọc Bravo (SQL Server) bằng tài khoản <b>chỉ đọc</b>.</li>
          <li>Định kỳ 5–15 phút đẩy mã hàng, công đoạn, xí nghiệp lên hệ thống (không mở cổng ra internet).</li>
          <li>Trong lúc chờ: dùng <b>Nhập Excel</b> với file xuất từ Bravo.</li></ol></div>`,
      footer: '<button class="btn btn-outline" data-close>Đóng</button>',
    });
  }
  window.ErpInfo = erpInfo;

  async function render(root) {
    let items = [], ops = [], operations = [], tab = 'catalog', search = '', qrSearch = '';

    root.innerHTML = `<div class="stack">
      ${UI.pageHead('Quản trị mã hàng', 'qr-code', `
        <button class="btn btn-outline" data-act="import">${icon('file-up')} Nhập Excel</button>
        <button class="btn btn-outline" data-act="new-item">${icon('plus')} Thêm mã hàng</button>
        <button class="btn" data-act="create-qr" data-testid="open-create-qr">${icon('plus')} Tạo mã QR</button>`)}
      <div class="card"><div class="row between"><div class="tabs" style="flex:1;margin-bottom:0" id="tabs"></div>
        <button class="btn btn-link" data-act="erp">${icon('refresh-cw')} Đồng bộ ERP</button></div>
        <div id="body" style="margin-top:16px"></div></div></div>`;

    const load = async () => {
      [items, ops, operations] = await Promise.all([API.listItems(), API.listItemOps(), API.listOperations()]);
      draw();
    };
    const opsOf = (id) => ops.filter((o) => o.item_id === id).sort((a, b) => a.seq - b.seq);
    const qrList = () => ops.filter((o) => o.qr_value)
      .filter((o) => !qrSearch || normalize(`${o.item_code} ${o.item_name} ${o.operation_code} ${o.operation_name}`).includes(normalize(qrSearch)))
      .sort((a, b) => String(b.qr_created_at).localeCompare(String(a.qr_created_at)));

    function draw() {
      root.querySelector('#tabs').innerHTML = `
        <button class="tab ${tab === 'catalog' ? 'active' : ''}" data-act="tab" data-t="catalog">${icon('package')} Danh mục mã hàng</button>
        <button class="tab ${tab === 'qr' ? 'active' : ''}" data-act="tab" data-t="qr">${icon('qr-code')} Mã QR đã tạo <span class="count">${ops.filter((o) => o.qr_value).length}</span></button>`;
      const body = root.querySelector('#body');
      if (tab === 'catalog') {
        const list = items.filter((i) => !search || normalize(`${i.code} ${i.name}`).includes(normalize(search)));
        body.innerHTML = `
          <div class="input-wrap has-prefix" style="max-width:340px;margin-bottom:12px"><span class="prefix">${icon('search')}</span><input class="input" name="search" value="${esc(search)}" placeholder="Tìm mã hàng hoặc tên sản phẩm"></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Mã hàng</th><th>Tên sản phẩm</th><th>Công đoạn từ ERP</th><th>Mã QR đã tạo</th><th>Nguồn dữ liệu</th><th>Thao tác</th></tr></thead><tbody>
          ${list.map((i) => { const o = opsOf(i.id), q = o.filter((x) => x.qr_value).length; return `<tr class="${i.active ? '' : 'dim'}">
            <td class="mono bold">${esc(i.code)}</td><td>${esc(i.name)} ${i.active ? '' : badge('Ngừng dùng')}</td>
            <td>${badge(o.length + ' công đoạn')}</td><td>${badge(`${q} / ${o.length}`, o.length && q === o.length ? 'success' : 'neutral')}</td>
            <td>${badge(SOURCE[i.source], 'info')}</td>
            <td class="nowrap"><button class="btn btn-sm" data-act="create-qr" data-id="${i.id}">${icon('qr-code')} Tạo QR</button>
              <button class="btn btn-outline btn-sm" data-act="detail" data-id="${i.id}">${icon('clipboard-list')} Chi tiết</button></td></tr>`; }).join('')
            || '<tr><td colspan="6" class="empty">Không tìm thấy mã hàng.</td></tr>'}
          </tbody></table></div>
          <p class="xs muted" style="margin-top:10px">Hiển thị ${list.length} / ${items.length} mã hàng · ${ops.length} công đoạn theo mã hàng</p>`;
      } else {
        const list = qrList();
        body.innerHTML = `
          <div class="input-wrap has-prefix" style="max-width:340px;margin-bottom:12px"><span class="prefix">${icon('search')}</span><input class="input" name="qrsearch" value="${esc(qrSearch)}" placeholder="Tìm mã hàng, công đoạn"></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Mã hàng / Sản phẩm</th><th>Công đoạn</th><th>Nội dung QR</th><th>Thời gian tạo</th><th>Người tạo</th><th>Thao tác</th></tr></thead><tbody>
          ${list.map((o) => `<tr><td><div class="mono bold">${esc(o.item_code)}</div><div class="sub">${esc(o.item_name)}</div></td>
            <td>${esc(o.operation_code)} · ${esc(o.operation_name)}</td><td class="mono xs">${esc(o.qr_value)}</td>
            <td class="nowrap">${fmtDateTime(o.qr_created_at)}</td><td>${esc(o.qr_created_by_name || '')}</td>
            <td class="nowrap"><button class="btn btn-outline btn-sm" data-act="view-qr" data-io="${o.id}">${icon('eye')} Xem QR</button>
              <button class="btn btn-outline btn-sm" data-act="dl-qr" data-io="${o.id}">${icon('download')} Tải SVG</button></td></tr>`).join('')
            || '<tr><td colspan="6" class="empty">Chưa có mã QR nào.</td></tr>'}
          </tbody></table></div>
          <div class="row between" style="margin-top:10px"><p class="xs muted">${list.length} mã QR · Nội dung QR cố định theo mã hàng và công đoạn</p>
            <button class="btn btn-outline" data-act="print-all" ${list.length ? '' : 'disabled'}>${icon('printer')} In danh sách</button></div>`;
      }
      refreshIcons();
    }

    root.addEventListener('input', UI.debounce((e) => {
      if (e.target.name === 'search') { search = e.target.value; draw(); root.querySelector('[name=search]').focus(); }
      if (e.target.name === 'qrsearch') { qrSearch = e.target.value; draw(); root.querySelector('[name=qrsearch]').focus(); }
    }, 300));

    // ---------- Tạo QR ----------
    function createQr(presetId) {
      const itemsWithOps = items.filter((i) => opsOf(i.id).length);
      const m = UI.modal({
        title: 'Tạo mã QR cho mã hàng và công đoạn',
        body: `<div class="stack">
          <div class="field"><label>Mã hàng <span class="req">*</span></label><select class="select" name="item" data-testid="qr-item"><option value="">Chọn mã hàng</option>${options(itemsWithOps.map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` })), presetId)}</select></div>
          <div class="field"><label>Công đoạn <span class="req">*</span></label><select class="select" name="op"></select></div>
          <div class="total-box"><span>Số mã QR sẽ tạo</span><b class="text-primary" style="font-size:18px" id="n">0 mã</b></div>
          <p class="xs muted">Nội dung QR cố định theo mã hàng và công đoạn: <code>MÃ HÀNG|MÃ CÔNG ĐOẠN</code>.</p></div>`,
        footer: `<button class="btn btn-ghost" data-close>Hủy</button><button class="btn" data-ok data-testid="create-qr">${icon('qr-code')} Tạo mã QR</button>`,
      });
      const sItem = m.el.querySelector('[name=item]'), sOp = m.el.querySelector('[name=op]');
      const target = () => { const o = opsOf(sItem.value); return sOp.value === 'all' ? o : o.filter((x) => x.operation_id === sOp.value); };
      const fill = () => {
        const o = opsOf(sItem.value);
        sOp.disabled = !sItem.value;
        sOp.innerHTML = sItem.value ? `<option value="all">Tất cả công đoạn (${o.length})</option>${options(o.map((x) => ({ value: x.operation_id, label: `${x.operation_code} · ${x.operation_name}${x.qr_value ? ' (đã tạo)' : ''}` })))}` : '<option>Chọn mã hàng trước</option>';
        upd();
      };
      const upd = () => { m.el.querySelector('#n').textContent = (sItem.value ? target().filter((x) => !x.qr_value).length : 0) + ' mã'; };
      sItem.addEventListener('change', fill); sOp.addEventListener('change', upd); fill();
      m.el.querySelector('[data-ok]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
        if (!sItem.value) return UI.warn('Vui lòng chọn mã hàng.');
        const t = target(), ids = t.map((x) => x.operation_id);
        try {
          const n = t.some((x) => !x.qr_value) ? await API.createQr(sItem.value, sOp.value === 'all' ? null : ids) : 0;
          UI.ok(n ? `Đã tạo ${n} mã QR.` : 'Các công đoạn đã có mã QR, hiển thị để in lại.');
          m.close();
          await load();
          tab = 'qr'; draw();
          Shared.previewQr(ops.filter((o) => o.item_id === sItem.value && ids.includes(o.operation_id) && o.qr_value).map(Shared.toLabel));
        } catch (e2) { UI.err(e2.message); }
      }));
    }

    // ---------- Chi tiết mã hàng ----------
    function detail(itemId) {
      const it = items.find((i) => i.id === itemId);
      const m = UI.modal({ title: 'Chi tiết mã hàng', size: 'lg', body: '<div id="d"></div>',
        footer: `<button class="btn btn-ghost" data-close>Đóng</button><button class="btn" data-all>${icon('qr-code')} Tạo mã QR</button>` });
      const d = m.el.querySelector('#d');
      const paint = () => {
        const o = opsOf(it.id), miss = o.filter((x) => !x.qr_value).length;
        m.el.querySelector('[data-all]').innerHTML = `${icon('qr-code')} ${miss ? `Tạo mã QR (${miss})` : 'Xem tất cả QR'}`;
        d.innerHTML = `<div class="stack">
          <div class="grid" style="grid-template-columns:1fr 2fr auto;align-items:end">
            <div class="field"><label>Mã hàng</label><input class="input" value="${esc(it.code)}" disabled></div>
            <div class="field"><label>Tên sản phẩm</label><input class="input" name="iname" value="${esc(it.name)}"></div>
            <div class="row"><label class="check"><input type="checkbox" name="iactive" ${it.active ? 'checked' : ''}> Đang dùng</label>
              <button class="btn btn-outline btn-sm" data-a="save">Lưu</button></div>
          </div>
          <div><div class="row between" style="margin-bottom:6px"><h3>Công đoạn tương ứng</h3>${badge(SOURCE[it.source], 'info')}</div>
          <table class="table"><thead><tr><th>#</th><th>Mã công đoạn</th><th>Tên công đoạn</th><th>Trạng thái QR</th><th class="right">Thao tác</th></tr></thead><tbody>
          ${o.map((x) => `<tr><td class="muted">${x.seq}</td><td class="mono">${esc(x.operation_code)}</td><td>${esc(x.operation_name)}</td>
            <td>${x.qr_value ? `<span title="${fmtDateTime(x.qr_created_at)}">${badge('Đã tạo', 'success')}</span>` : badge('Chưa tạo')}</td>
            <td class="right nowrap">${x.qr_value ? `<button class="btn btn-outline btn-sm" data-a="view" data-io="${x.id}">${icon('eye')} Xem QR</button>` : `<button class="btn btn-sm" data-a="qr1" data-op="${x.operation_id}">${icon('qr-code')} Tạo QR</button>`}
              <button class="btn btn-ghost btn-icon danger" data-a="rm" data-io="${x.id}" title="Xóa khỏi mã hàng">${icon('trash-2')}</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Chưa có công đoạn.</td></tr>'}
          </tbody></table></div>
          <div class="card" style="border-style:dashed;padding:14px"><div class="bold sm" style="margin-bottom:8px">Thêm công đoạn</div>
            <div class="grid" style="grid-template-columns:1fr 1.5fr auto">
              <input class="input" name="ocode" list="op-list" placeholder="Mã công đoạn, ví dụ: TIEN-01">
              <datalist id="op-list">${operations.map((x) => `<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('')}</datalist>
              <input class="input" name="oname" placeholder="Tên công đoạn">
              <button class="btn" data-a="add">${icon('plus')} Thêm</button></div></div></div>`;
        refreshIcons();
      };
      d.addEventListener('input', (e) => {
        if (e.target.name === 'ocode') { const f = operations.find((x) => x.code === e.target.value.trim().toUpperCase()); if (f) d.querySelector('[name=oname]').value = f.name; }
      });
      const reload = async () => { await load(); Object.assign(it, items.find((i) => i.id === it.id)); paint(); };
      d.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        try {
          if (a === 'save') {
            const name = d.querySelector('[name=iname]').value.trim();
            if (!name) return UI.warn('Vui lòng nhập tên sản phẩm.');
            await UI.busy(b, () => API.saveItem({ id: it.id, code: it.code, name, active: d.querySelector('[name=iactive]').checked }));
            UI.ok('Đã cập nhật mã hàng.'); reload();
          }
          if (a === 'view') Shared.previewQr([Shared.toLabel(ops.find((x) => x.id === b.dataset.io))]);
          if (a === 'qr1') { const n = await UI.busy(b, () => API.createQr(it.id, [b.dataset.op])); UI.ok(`Đã tạo ${n} mã QR.`); reload(); }
          if (a === 'rm') {
            const x = ops.find((y) => y.id === b.dataset.io);
            if (await UI.confirmDialog({ title: 'Xóa công đoạn khỏi mã hàng', message: `Xóa công đoạn ${x.operation_code} khỏi mã hàng ${x.item_code}? Không thể xóa nếu đã có báo cáo.`, okLabel: 'Xóa', danger: true })) {
              await API.removeItemOp(x.id); UI.ok('Đã xóa công đoạn.'); reload();
            }
          }
          if (a === 'add') {
            const code = d.querySelector('[name=ocode]').value.trim().toUpperCase(), name = d.querySelector('[name=oname]').value.trim();
            if (!code) return UI.warn('Vui lòng nhập mã công đoạn.');
            if (!name) return UI.warn('Vui lòng nhập tên công đoạn.');
            const cur = opsOf(it.id);
            if (cur.some((x) => x.operation_code === code)) return UI.warn('Công đoạn đã có trong mã hàng.');
            await UI.busy(b, async () => { const id = await API.upsertOperation(code, name); await API.addItemOp(it.id, id, (cur.at(-1)?.seq || 0) + 1); });
            UI.ok('Đã thêm công đoạn.'); reload();
          }
        } catch (e2) { UI.err(e2.message); }
      });
      m.el.querySelector('[data-all]').addEventListener('click', async (e) => {
        const o = opsOf(it.id);
        if (o.some((x) => !x.qr_value)) {
          try { const n = await UI.busy(e.currentTarget, () => API.createQr(it.id, null)); UI.ok(`Đã tạo ${n} mã QR.`); await reload(); } catch (e2) { return UI.err(e2.message); }
        }
        Shared.previewQr(opsOf(it.id).filter((x) => x.qr_value).map(Shared.toLabel));
      });
      paint();
    }

    // ---------- Thêm mã hàng ----------
    function newItem() {
      const m = UI.modal({
        title: 'Thêm mã hàng',
        body: `<div class="stack"><div class="alert alert-info">${icon('info')} Khi kết nối Bravo, mã hàng sẽ được đồng bộ tự động. Thêm tay chỉ dùng cho demo hoặc hàng chưa có trên ERP.</div>
          <div class="field"><label>Mã hàng <span class="req">*</span></label><input class="input" name="code" placeholder="Ví dụ: TR-125"></div>
          <div class="field"><label>Tên sản phẩm <span class="req">*</span></label><input class="input" name="name" placeholder="Ví dụ: Trục truyền động Ø25"></div></div>`,
        footer: `<button class="btn btn-ghost" data-close>Hủy</button><button class="btn" data-ok>${icon('check')} Lưu</button>`,
      });
      m.el.querySelector('[data-ok]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
        const code = m.el.querySelector('[name=code]').value.trim().toUpperCase(), name = m.el.querySelector('[name=name]').value.trim();
        if (!code) return UI.warn('Vui lòng nhập mã hàng.');
        if (!name) return UI.warn('Vui lòng nhập tên sản phẩm.');
        try { const id = await API.saveItem({ code, name }); UI.ok('Đã thêm mã hàng. Hãy thêm công đoạn cho mã hàng.'); m.close(); await load(); detail(id); }
        catch (e2) { UI.err(e2.message); }
      }));
    }

    // ---------- Nhập Excel ----------
    function importExcel() {
      let rows = [];
      const m = UI.modal({
        title: 'Nhập mã hàng và công đoạn từ Excel', size: 'lg',
        body: `<div class="stack sm"><p>File cần các cột: <b>Mã hàng, Tên sản phẩm, Mã công đoạn, Tên công đoạn, Thứ tự</b> (mỗi dòng là một công đoạn). Có thể dùng file xuất từ Bravo sau khi đổi tên cột.</p>
          <div class="row"><button class="btn btn-outline" data-tpl>${icon('download')} Tải file mẫu</button>
          <label class="btn">${icon('upload')} Chọn file Excel<input type="file" accept=".xlsx,.xls,.csv" hidden></label><span class="muted" id="fn"></span></div>
          <div id="pv"></div></div>`,
        footer: `<span class="muted sm" id="cnt" style="margin-right:auto">0 dòng hợp lệ</span><button class="btn btn-ghost" data-close>Hủy</button><button class="btn" data-ok disabled>${icon('upload')} Nhập dữ liệu</button>`,
      });
      m.el.querySelector('[data-tpl]').addEventListener('click', () => Shared.exportExcel('mau-nhap-ma-hang-cong-doan.xlsx', 'Danh muc',
        ['Mã hàng', 'Tên sản phẩm', 'Mã công đoạn', 'Tên công đoạn', 'Thứ tự'], [['TR-125', 'Trục truyền động Ø25', 'TIEN-01', 'Tiện thô', 1], ['TR-125', 'Trục truyền động Ø25', 'TIEN-02', 'Tiện tinh', 2]]));
      const pick = (r, keys) => { for (const k of Object.keys(r)) if (keys.includes(normalize(k).trim())) return String(r[k] ?? '').trim(); return ''; };
      m.el.querySelector('input[type=file]').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        m.el.querySelector('#fn').textContent = file.name;
        try {
          rows = (await Shared.readExcel(file)).map((r, i) => ({
            item_code: pick(r, ['ma hang', 'item_code']), item_name: pick(r, ['ten san pham', 'item_name', 'ten hang']),
            op_code: pick(r, ['ma cong doan', 'op_code']), op_name: pick(r, ['ten cong doan', 'op_name']),
            seq: Number(pick(r, ['thu tu', 'seq', 'stt'])) || i + 1,
          })).filter((r) => r.item_code && r.op_code);
        } catch (e2) { rows = []; UI.err('Không đọc được file Excel.'); }
        if (!rows.length) UI.warn('Không đọc được dòng hợp lệ. Kiểm tra lại tên cột theo file mẫu.');
        m.el.querySelector('#cnt').textContent = rows.length + ' dòng hợp lệ';
        m.el.querySelector('[data-ok]').disabled = !rows.length;
        m.el.querySelector('#pv').innerHTML = rows.length ? `<div class="table-wrap" style="max-height:300px"><table class="table"><thead><tr><th>Mã hàng</th><th>Tên sản phẩm</th><th>Mã CĐ</th><th>Tên công đoạn</th><th>TT</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><td class="mono">${esc(r.item_code)}</td><td>${esc(r.item_name)}</td><td class="mono">${esc(r.op_code)}</td><td>${esc(r.op_name)}</td><td>${r.seq}</td></tr>`).join('')}</tbody></table></div>` : '';
      });
      m.el.querySelector('[data-ok]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
        try { const r = await API.importCatalog(rows); UI.ok(`Đã nhập ${r.rows} dòng mã hàng – công đoạn.`); m.close(); load(); }
        catch (e2) { UI.err(e2.message); }
      }));
      refreshIcons();
    }

    UI.on(root, 'click', {
      tab: (t) => { tab = t.dataset.t; draw(); },
      erp: () => erpInfo('mã hàng và công đoạn'),
      'create-qr': (t) => createQr(t.dataset.id || ''),
      detail: (t) => detail(t.dataset.id),
      'new-item': () => newItem(),
      import: () => importExcel(),
      'view-qr': (t) => Shared.previewQr([Shared.toLabel(ops.find((o) => o.id === t.dataset.io))]),
      'dl-qr': (t) => Shared.downloadLabel(Shared.toLabel(ops.find((o) => o.id === t.dataset.io))),
      'print-all': () => Shared.previewQr(qrList().map(Shared.toLabel)),
    });
    await load();
  }

  PAGES['/products'] = { title: 'Quản trị mã hàng', perm: 'MANAGE_PRODUCT', render };
})();
