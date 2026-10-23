/* Thành phần dùng chung giữa các màn: ô số lượng, QR, quét QR, Excel */
(function () {
  const { esc, icon, fmtQty, refreshIcons } = UI;

  // ---------- Số lượng (spec mục 6, 7) ----------
  const QTY = { ok_qty: 'Sản lượng đạt', ng_qty: 'Sản lượng không đạt', received_qty: 'Nhận bán thành phẩm', transferred_qty: 'Chuyển bán thành phẩm' };
  const toInt = (v) => { const s = String(v ?? '').trim(); return s === '' ? 0 : Number(s); };

  function qtyFieldsHtml(v = {}, large = false) {
    const cls = large ? 'input input-lg' : 'input';
    const f = (key, label, req, ph) => `
      <div class="field"><label>${label} ${req ? '<span class="req">*</span>' : '<span class="xs muted">(Tùy chọn)</span>'}</label>
        <div class="input-wrap"><input class="${cls}" inputmode="numeric" name="${key}" data-testid="${key}" placeholder="${ph}" value="${esc(v[key] ?? '')}"><span class="suffix">chiếc</span></div>
      </div>`;
    return `<div class="grid g2">
      ${f('ok_qty', 'Sản lượng đạt', true, 'Ví dụ: 100')}
      ${f('ng_qty', 'Sản lượng không đạt', true, '0')}
      ${f('received_qty', 'Nhận bán thành phẩm', false, '0')}
      ${f('transferred_qty', 'Chuyển bán thành phẩm', false, '0')}
      <div class="total-box span2"><div><div class="bold">Tổng sản lượng</div><div class="xs muted">Đạt + Không đạt</div></div>
        <div><span class="num" data-total>${fmtQty(toInt(v.ok_qty) + toInt(v.ng_qty))}</span> <span class="muted sm">chiếc</span></div></div>
    </div>`;
  }
  function readQty(root) {
    const o = {};
    for (const k of Object.keys(QTY)) o[k] = (root.querySelector(`[name=${k}]`) || {}).value ?? '';
    return o;
  }
  function bindTotal(root) {
    const upd = () => { const q = readQty(root); root.querySelector('[data-total]').textContent = fmtQty(toInt(q.ok_qty) + toInt(q.ng_qty)); };
    root.querySelectorAll('[name=ok_qty],[name=ng_qty]').forEach((el) => el.addEventListener('input', upd));
  }
  function validateQty(q) {
    if (String(q.ok_qty).trim() === '') return 'Vui lòng nhập sản lượng đạt. Nhập 0 nếu không phát sinh.';
    if (String(q.ng_qty).trim() === '') return 'Vui lòng nhập sản lượng không đạt. Nhập 0 nếu không phát sinh.';
    for (const k of Object.keys(QTY)) {
      const s = String(q[k] ?? '').trim();
      if (s && (!/^\d+$/.test(s) || !Number.isSafeInteger(Number(s)))) return `${QTY[k]} phải là số nguyên không âm.`;
    }
    if (Object.keys(QTY).reduce((a, k) => a + toInt(q[k]), 0) === 0)
      return 'Vui lòng nhập ít nhất một số lượng lớn hơn 0 tại các ô Đạt, Không đạt, Nhận bán thành phẩm hoặc Chuyển bán thành phẩm.';
    return null;
  }
  const qtyPayload = (q) => Object.fromEntries(Object.keys(QTY).map((k) => [k, toInt(q[k])]));

  // ---------- QR ----------
  function parseQr(text) {
    const parts = String(text || '').trim().split('|');
    if (parts.length !== 2) return null;
    const [itemCode, opCode] = parts.map((p) => p.trim());
    return itemCode && opCode ? { itemCode, opCode } : null;
  }
  function qrSvg(value, size = 150) {
    const qr = window.qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }).replace('<svg ', `<svg width="${size}" height="${size}" `);
  }
  function labelSvg(d) {
    const inner = qrSvg(d.qr_value, 180).replace(/<svg /, '<svg x="30" y="38" ');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="330" viewBox="0 0 240 330" font-family="Arial, sans-serif">
  <rect width="240" height="330" fill="#fff" stroke="#d4d4d8" rx="10"/>
  <text x="120" y="28" text-anchor="middle" font-size="15" font-weight="700" fill="#0f5fa8">FOMECO</text>
  ${inner}
  <text x="120" y="244" text-anchor="middle" font-size="18" font-weight="700">${esc(d.item_code)}</text>
  <text x="120" y="264" text-anchor="middle" font-size="12" fill="#52525b">${esc(d.item_name)}</text>
  <text x="120" y="286" text-anchor="middle" font-size="13">${esc(d.operation_code)} · ${esc(d.operation_name)}</text>
  <text x="120" y="310" text-anchor="middle" font-size="11" font-family="monospace" fill="#71717a">${esc(d.qr_value)}</text>
</svg>`;
  }
  function downloadLabel(d) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([labelSvg(d)], { type: 'image/svg+xml' }));
    a.download = `QR_${d.item_code}_${d.operation_code}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function printLabels(list) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { UI.warn('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên (pop-up) và thử lại.'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>In tem QR</title>
      <style>@page{size:A4;margin:10mm}body{margin:0;font-family:Arial}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.g>svg{width:100%;height:auto;break-inside:avoid}</style>
      </head><body><div class="g">${list.map(labelSvg).join('')}</div><script>window.onload=()=>{window.focus();window.print()}<\/script></body></html>`);
    w.document.close();
  }
  function previewQr(list) {
    if (!list.length) return UI.warn('Chưa có mã QR để hiển thị.');
    const cards = list.map((d, i) => `
      <div class="qr-card">
        <div class="qr-brand">FOMECO</div>
        <div class="qr">${qrSvg(d.qr_value)}</div>
        <div class="bold" style="font-size:17px">${esc(d.item_code)}</div>
        <div class="xs muted">${esc(d.item_name)}</div>
        <div class="sm">${esc(d.operation_code)} · ${esc(d.operation_name)}</div>
        <div class="xs muted mono">${esc(d.qr_value)}</div>
        <button class="btn btn-outline btn-sm" data-dl="${i}" style="margin-top:6px">${icon('download')} Tải SVG</button>
      </div>`).join('');
    const m = UI.modal({
      title: 'Mã QR mã hàng và công đoạn', size: 'lg', body: `<div class="qr-grid">${cards}</div>`,
      footer: `<span class="muted sm" style="margin-right:auto">${list.length} tem QR</span>
        <button class="btn btn-ghost" data-close>${icon('x')} Đóng</button>
        <button class="btn" data-print data-testid="print-qr">${icon('printer')} In tem QR</button>`,
    });
    m.el.addEventListener('click', (e) => {
      const dl = e.target.closest('[data-dl]');
      if (dl) downloadLabel(list[Number(dl.dataset.dl)]);
      if (e.target.closest('[data-print]')) printLabels(list);
    });
  }
  const toLabel = (o) => ({ qr_value: o.qr_value, item_code: o.item_code, item_name: o.item_name, operation_code: o.operation_code, operation_name: o.operation_name });

  /** Cửa sổ quét QR: camera + ô nhập cho máy quét cầm tay. onDetect(text) trả true để đóng. */
  // ---------- Camera: xin quyền 1 lần, đã cho phép thì mở thẳng ----------
  const CAM_KEY = 'fomeco.camera.ok';
  const camOkSaved = () => { try { return localStorage.getItem(CAM_KEY) === '1'; } catch (e) { return false; } };
  const saveCamOk = (v) => { try { v ? localStorage.setItem(CAM_KEY, '1') : localStorage.removeItem(CAM_KEY); } catch (e) { /* bỏ qua */ } };
  /** 'granted' | 'denied' | 'prompt' | 'unknown' */
  async function cameraPermission() {
    try { return (await navigator.permissions.query({ name: 'camera' })).state; } catch (e) { return 'unknown'; }
  }
  const inAppBrowser = () => /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger/i.test(navigator.userAgent);
  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function deniedHelp() {
    return isIOS()
      ? 'Trên iPhone: mở <b>Cài đặt → Safari → Camera</b> chọn <b>Cho phép</b> (hoặc bấm <b>aA</b> trên thanh địa chỉ → Cài đặt trang web → Camera → Cho phép), rồi tải lại trang.'
      : 'Trên Android: bấm biểu tượng <b>ổ khóa / ⓘ</b> cạnh địa chỉ web → <b>Quyền</b> → <b>Máy ảnh</b> → <b>Cho phép</b>, rồi tải lại trang.';
  }

  function openScanner(onDetect) {
    const m = UI.modal({
      title: 'Quét mã QR',
      body: `<div class="stack">
        <div class="scan-box"><div id="qr-reader"></div><div class="scan-msg" id="scan-msg"></div></div>
        <div class="field"><label>Hoặc nhập nội dung QR</label>
          <div class="row" style="flex-wrap:nowrap">
            <div class="input-wrap has-prefix" style="flex:1"><span class="prefix">${icon('scan-line')}</span>
              <input class="input" id="qr-text" placeholder="Ví dụ: VB-6204|NL-01" data-testid="qr-input" autocomplete="off" autocapitalize="characters"></div>
            <button class="btn" id="qr-ok">${icon('check')} Xác nhận</button>
          </div>
          <div class="help">Dùng máy quét cầm tay (tự gõ vào ô) hoặc nhập tay rồi nhấn Enter.</div>
        </div></div>`,
      footer: `<button class="btn btn-outline" data-close>${icon('x')} Đóng</button>`,
      onClose: () => stop(),
    });
    let scanner = null, last = '', lastAt = 0, stopped = false;
    const input = m.el.querySelector('#qr-text');
    const msg = m.el.querySelector('#scan-msg');
    const show = (html) => { msg.classList.remove('hidden'); msg.innerHTML = html; refreshIcons(); };
    setTimeout(() => { if (matchMedia('(pointer: fine)').matches) input.focus(); }, 50); // điện thoại: không bật bàn phím che camera
    const handle = async (text) => { if (await onDetect(text)) m.close(); };
    const submit = () => { const v = input.value; input.value = ''; handle(v); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    m.el.querySelector('#qr-ok').addEventListener('click', submit);
    function stop() {
      stopped = true;
      if (scanner) { const s = scanner; scanner = null; s.stop().then(() => s.clear()).catch(() => {}); }
    }

    const fail = (title, detail, retry) => show(`${icon('camera-off', 'ic-xl')}<div class="bold">${title}</div>
      <div class="sm" style="opacity:.9;line-height:1.5">${detail}</div>
      ${retry ? `<button class="btn btn-sm" data-retry style="margin-top:6px">${icon('rotate-ccw')} Thử lại</button>` : ''}`);
    msg.addEventListener('click', (e) => {
      if (e.target.closest('[data-allow]')) askPermission();
      if (e.target.closest('[data-retry]')) begin();
    });

    function explainError(err) {
      const n = (err && (err.name || err)) + '';
      if (/NotAllowed|Permission|denied/i.test(n) || /denied|permission/i.test(err && err.message)) {
        saveCamOk(false);
        return fail('Chưa được cấp quyền camera', `${deniedHelp()}<br>Trong lúc chờ, có thể nhập nội dung mã QR ở ô bên dưới.`, true);
      }
      if (/NotFound|Overconstrained/i.test(n)) return fail('Không tìm thấy camera', 'Thiết bị không có camera phù hợp. Vui lòng nhập nội dung mã QR ở ô bên dưới.', true);
      if (/NotReadable|TrackStart|Abort/i.test(n)) return fail('Camera đang bận', 'Hãy tắt các ứng dụng khác đang dùng camera (Zalo, máy ảnh...) rồi bấm Thử lại.', true);
      return fail('Không thể mở camera', `Vui lòng kiểm tra quyền truy cập camera hoặc nhập nội dung mã QR. <span class="xs" style="opacity:.7">(${UI.esc(n)})</span>`, true);
    }

    // Bước 1: hỏi quyền — gọi getUserMedia ngay trong lần chạm của người dùng để trình duyệt hiện hộp thoại "Cho phép"
    async function askPermission() {
      show(`${icon('loader-circle', 'ic-xl')}<div>Hãy chọn <b>Cho phép</b> trên hộp thoại của trình duyệt...</div>`);
      try {
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        st.getTracks().forEach((t) => t.stop());
        saveCamOk(true);
        startScan();
      } catch (err) { explainError(err); }
    }

    // Bước 2: bật camera sau và quét liên tục
    function startScan() {
      if (stopped) return;
      if (!window.Html5Qrcode) return fail('Chưa tải được bộ quét QR', 'Kiểm tra kết nối mạng rồi tải lại trang, hoặc nhập nội dung mã QR ở ô bên dưới.', true);
      show(`${icon('loader-circle', 'ic-xl')}<div>Đang mở camera...</div>`);
      try {
        scanner = new window.Html5Qrcode('qr-reader', { verbose: false });
        scanner.start({ facingMode: 'environment' }, {
          fps: 10, aspectRatio: 1.333,
          qrbox: (w, h) => { const s = Math.max(160, Math.floor(Math.min(w, h) * 0.7)); return { width: s, height: s }; },
        }, (text) => {
          const now = Date.now();
          if (text === last && now - lastAt < 2500) return;
          last = text; lastAt = now;
          if (navigator.vibrate) navigator.vibrate(80);
          handle(text);
        }).then(() => { saveCamOk(true); if (stopped) stop(); else msg.classList.add('hidden'); })
          .catch((err) => { scanner = null; explainError(err); });
      } catch (err) { explainError(err); }
    }

    async function begin() {
      if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return fail('Trình duyệt không cho dùng camera ở đây', 'Hãy mở web bằng link <b>https://</b> trên Chrome (Android) hoặc Safari (iPhone).', false);
      }
      if (inAppBrowser()) {
        return show(`${icon('external-link', 'ic-xl')}<div class="bold">Đang mở trong Zalo/Facebook</div>
          <div class="sm" style="opacity:.9;line-height:1.5">Trình duyệt trong Zalo thường chặn camera. Bấm <b>⋯</b> (góc trên) → <b>Mở bằng trình duyệt</b> (Chrome/Safari).</div>
          <button class="btn btn-sm" data-allow style="margin-top:6px">${icon('camera')} Vẫn thử mở camera</button>`);
      }
      const state = await cameraPermission();
      if (state === 'denied') return explainError({ name: 'NotAllowedError' });
      if (state === 'granted' || camOkSaved()) return startScan();   // đã cho phép trước đó: mở thẳng, không hỏi lại
      show(`${icon('camera', 'ic-xl')}<div class="bold" style="font-size:16px">Cho phép dùng camera để quét mã QR</div>
        <div class="sm" style="opacity:.9">Chỉ cần cho phép một lần, lần sau sẽ mở camera ngay.</div>
        <button class="btn btn-lg" data-allow data-testid="allow-camera" style="margin-top:8px">${icon('camera')} Cho phép dùng camera</button>`);
    }
    begin();
    return m;
  }

  // ---------- Excel ----------
  function exportExcel(fileName, sheet, headers, rows) {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h, i) => ({ wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)) + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, fileName);
  }
  async function readExcel(file) {
    const wb = XLSX.read(await file.arrayBuffer());
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  }

  window.Shared = {
    qtyFieldsHtml, readQty, bindTotal, validateQty, qtyPayload, toInt,
    parseQr, qrSvg, labelSvg, downloadLabel, printLabels, previewQr, toLabel, openScanner,
    exportExcel, readExcel,
  };
})();
