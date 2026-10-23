/* Tiện ích giao diện dùng chung: escape, icon, toast, modal, confirm, định dạng */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const icon = (name, cls = '') => `<i data-lucide="${name}" class="ic ${cls}"></i>`;
  const refreshIcons = () => {
    try { window.lucide && window.lucide.createIcons(); } catch (e) { /* bỏ qua */ }
  };

  // ---------- Định dạng ----------
  const pad = (n) => String(n).padStart(2, '0');
  const fmtQty = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
  const fmtDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const fmtDate = (ymd) => (ymd ? ymd.split('-').reverse().join('/') : '');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const isToday = (iso) => !!iso && ymd(new Date(iso)) === today();
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
  const startOfMonth = () => { const d = new Date(); d.setDate(1); return ymd(d); };
  const startIso = (s) => (s ? new Date(`${s}T00:00:00`).toISOString() : null);
  const endIso = (s) => (s ? new Date(`${s}T23:59:59.999`).toISOString() : null);
  const initials = (name) => (String(name || '').trim().split(' ').pop() || 'U').charAt(0).toUpperCase();
  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const METHOD = { manual: 'Thủ công', qr: 'QR' };
  const STATUS = { active: 'Đã ghi nhận', cancelled: 'Đã hủy' };
  const SOURCE = { erp: 'ERP', manual: 'Thủ công', excel: 'Excel' };
  const badge = (text, kind = 'neutral', extra = '') => `<span class="badge b-${kind} ${extra}">${esc(text)}</span>`;

  // ---------- Toast ----------
  function toast(type, title, message, life = 3500) {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const icons = { success: 'circle-check', error: 'circle-x', warning: 'triangle-alert', info: 'info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icon(icons[type] || 'info', 'ic-lg')}<div><div class="t-title">${esc(title)}</div>${message ? `<div class="sm">${esc(message)}</div>` : ''}</div>`;
    box.appendChild(el);
    refreshIcons();
    setTimeout(() => el.remove(), life);
  }
  const ok = (m) => toast('success', 'Thành công', m);
  const err = (m) => toast('error', 'Lỗi', m, 5000);
  const warn = (m) => toast('warning', 'Cảnh báo', m, 4500);

  // ---------- Modal ----------
  /** Mở hộp thoại. body/footer là HTML. Trả về { el, close }. */
  function modal({ title, body, footer = '', size = '', onClose } = {}) {
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true">
      <div class="modal-head"><h2>${esc(title)}</h2><button class="btn btn-ghost btn-icon" data-close title="Đóng">${icon('x')}</button></div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
    document.body.appendChild(bd);
    const close = () => { bd.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    bd.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    refreshIcons();
    return { el: bd, close };
  }

  function confirmDialog({ title = 'Xác nhận', message = '', okLabel = 'Đồng ý', danger = false, html = false }) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal({
        title,
        body: `<div class="center" style="margin-bottom:12px">${icon('triangle-alert', 'ic-xl text-' + (danger ? 'error' : 'primary'))}</div>
               <p style="white-space:pre-line;line-height:1.7">${html ? message : esc(message)}</p>`,
        footer: `<button class="btn btn-outline" data-close>Hủy</button><button class="btn ${danger ? 'btn-danger' : ''}" data-ok>${esc(okLabel)}</button>`,
        onClose: () => { if (!done) resolve(false); },
      });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { done = true; m.close(); resolve(true); });
    });
  }

  /** Bật/tắt trạng thái đang xử lý cho nút */
  async function busy(btn, fn) {
    if (!btn) return fn();
    btn.classList.add('loading'); btn.disabled = true;
    try { return await fn(); } finally { btn.classList.remove('loading'); btn.disabled = false; }
  }

  /** Ủy quyền sự kiện theo data-act */
  function on(root, type, handlers) {
    root.addEventListener(type, (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !root.contains(t)) return;
      const fn = handlers[t.dataset.act];
      if (fn) fn(t, e);
    });
  }

  const pageHead = (title, iconName, actions = '') => `
    <div class="page-head">
      <div class="crumb"><a href="#/">${icon('house')}</a>${icon('chevron-right')}<span class="cur">${icon(iconName)} ${esc(title)}</span></div>
      <div class="row">${actions}</div>
    </div>`;

  const options = (list, selected) =>
    list.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(selected ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('');

  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  window.UI = {
    $, $$, esc, icon, refreshIcons, fmtQty, fmtDateTime, fmtDate, today, isToday, daysAgo, startOfMonth, startIso, endIso,
    initials, normalize, METHOD, STATUS, SOURCE, badge, toast, ok, err, warn, modal, confirmDialog, busy, on,
    pageHead, options, debounce,
  };
})();
