/* Báo cáo tồn kho: nhúng báo cáo Power BI (link "Publish to web" cấu hình trong config.js) */
(function () {
  const { esc, icon } = UI;

  function render(root) {
    const url = APP_CONFIG.POWERBI_INVENTORY_URL;
    const title = APP_CONFIG.POWERBI_INVENTORY_TITLE || 'Báo cáo tồn kho';
    const openBtn = url ? `<a class="btn btn-outline" href="${esc(url)}" target="_blank" rel="noopener">${icon('external-link')} Mở trong tab mới</a>` : '';
    root.innerHTML = `<div class="stack">
      ${UI.pageHead('Báo cáo tồn kho', 'warehouse', openBtn)}
      ${url ? `<div class="card pbi-card">
          <div class="pbi-wrap"><iframe title="${esc(title)}" src="${esc(url)}" frameborder="0" allowfullscreen="true" loading="lazy"></iframe></div>
        </div>
        <p class="xs muted">Số liệu do báo cáo Power BI cung cấp. Nếu báo cáo không hiển thị, bấm "Mở trong tab mới" hoặc tải lại trang.</p>`
      : `<div class="alert alert-info">${icon('info')} Chưa cấu hình đường dẫn báo cáo Power BI (POWERBI_INVENTORY_URL trong js/config.js).</div>`}
    </div>`;
  }

  PAGES['/inventory'] = { title: 'Báo cáo tồn kho', perm: 'VIEW_REPORT', render };
})();
