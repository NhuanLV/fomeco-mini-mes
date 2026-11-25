/* Báo cáo tồn kho: nhúng báo cáo Power BI (link "Publish to web" cấu hình trong config.js).
   Khung báo cáo tự co giãn lấp đầy phần còn lại của màn hình (rộng 100%, cao tới đáy cửa sổ),
   có nút Toàn màn hình. Cách Power BI co trang bên trong khung do chế độ "Xem trang" của
   từng trang trong file .pbix quyết định (nên đặt "Vừa với trang" để luôn thấy trọn trang). */
(function () {
  const { esc, icon, refreshIcons } = UI;
  const BOTTOM_GAP = 12; // khoảng cách dưới cùng (px)

  function render(root) {
    const url = APP_CONFIG.POWERBI_INVENTORY_URL;
    const title = APP_CONFIG.POWERBI_INVENTORY_TITLE || 'Báo cáo tồn kho';
    root.classList.add('main-wide');
    if (!url) {
      root.innerHTML = `<div class="stack">${UI.pageHead('Báo cáo tồn kho', 'warehouse')}
        <div class="alert alert-info">${icon('info')} Chưa cấu hình đường dẫn báo cáo Power BI (POWERBI_INVENTORY_URL trong js/config.js).</div></div>`;
      return;
    }
    root.innerHTML = `<div class="pbi-page">
      ${UI.pageHead('Báo cáo tồn kho', 'warehouse', `
        <button class="btn btn-outline" data-act="pbi-fs" title="Phóng to toàn màn hình (nhấn Esc để thoát)">${icon('maximize')} Toàn màn hình</button>
        <button class="btn btn-outline btn-icon" data-act="pbi-reload" title="Tải lại báo cáo">${icon('refresh-cw')}</button>
        <a class="btn btn-outline btn-icon" href="${esc(url)}" target="_blank" rel="noopener" title="Mở trong tab mới">${icon('external-link')}</a>`)}
      <div class="pbi-wrap" id="pbi-wrap">
        <button class="btn btn-icon pbi-close" data-act="pbi-exit" title="Thu nhỏ (Esc)">${icon('minimize')}</button>
        <iframe title="${esc(title)}" src="${esc(url)}" frameborder="0" allowfullscreen="true"></iframe>
      </div>
    </div>`;
    refreshIcons();

    const wrap = root.querySelector('#pbi-wrap');
    const frame = wrap.querySelector('iframe');
    // Chiều cao khung = từ mép trên khung tới đáy cửa sổ (tự tính lại khi đổi cỡ cửa sổ / xoay điện thoại)
    const fit = () => {
      if (document.fullscreenElement === wrap || document.webkitFullscreenElement === wrap || wrap.classList.contains('pbi-max')) { wrap.style.height = ''; return; }
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const h = Math.max(420, Math.floor(window.innerHeight - top - BOTTOM_GAP));
      wrap.style.height = h + 'px';
    };
    fit();
    let t = null;
    const onResize = () => { clearTimeout(t); t = setTimeout(fit, 120); };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', fit);
    document.addEventListener('webkitfullscreenchange', fit);

    root.querySelector('[data-act="pbi-reload"]').addEventListener('click', () => { frame.src = url; });
    // Toàn màn hình: ưu tiên chế độ toàn màn hình của trình duyệt; nếu không được (iPhone, trình duyệt chặn)
    // thì phủ kín cửa sổ trình duyệt. Thoát bằng Esc hoặc nút thu nhỏ ở góc.
    const setMax = (on) => { wrap.classList.toggle('pbi-max', on); document.body.classList.toggle('pbi-lock', on); fit(); };
    root.querySelector('[data-act="pbi-fs"]').addEventListener('click', () => {
      const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
      if (!req) return setMax(true);
      try { Promise.resolve(req.call(wrap)).catch(() => setMax(true)); } catch (e) { setMax(true); }
    });
    root.querySelector('[data-act="pbi-exit"]').addEventListener('click', () => {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setMax(false);
    });
    const onKey = (e) => { if (e.key === 'Escape' && wrap.classList.contains('pbi-max')) setMax(false); };
    document.addEventListener('keydown', onKey);

    App.onLeave(() => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', fit);
      document.removeEventListener('webkitfullscreenchange', fit);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('pbi-lock');
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    });
  }

  PAGES['/inventory'] = { title: 'Báo cáo tồn kho', perm: 'VIEW_REPORT', render };
})();
