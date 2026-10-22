/* Khởi động ứng dụng: đăng nhập, phân quyền, thanh menu, điều hướng (hash router) */
(function () {
  const { esc, icon, refreshIcons, initials, on } = UI;
  window.PAGES = window.PAGES || {};

  const Auth = {
    user: null,
    has(code) { return !!(Auth.user && (Auth.user.permissions || []).includes(code)); },
    async load() {
      const s = await API.session();
      if (!s) { Auth.user = null; return; }
      let acc = null;
      try { acc = await API.getAccount(s.user.id); } catch (e) { acc = null; }
      if (!acc || !acc.active) { await API.signOut(); Auth.user = null; return; }
      Auth.user = acc;
    },
    async login(username, password) {
      const { error } = await API.signIn(username, password);
      if (error) {
        if (/banned/i.test(error.message)) return 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.';
        if (/fetch|network/i.test(error.message)) return 'Không thể đăng nhập. Vui lòng kiểm tra kết nối và thử lại.';
        return 'Tên đăng nhập hoặc mật khẩu không đúng.';
      }
      await Auth.load();
      return Auth.user ? null : 'Tài khoản đã bị khóa hoặc chưa được cấp quyền.';
    },
    async logout() { await API.signOut(); Auth.user = null; location.hash = '#/login'; },
  };
  window.Auth = Auth;

  // ---------- Menu ----------
  function homePath() {
    if (Auth.has('VIEW_REPORT')) return '/';
    if (Auth.has('REPORT_PROGRESS')) return '/progress';
    if (Auth.has('MANAGE_PRODUCT')) return '/products';
    if (Auth.has('MANAGE_ACCOUNT')) return '/accounts';
    if (Auth.has('MANAGE_ORG')) return '/org-units';
    return '/profile';
  }

  function navbar(path) {
    const u = Auth.user;
    const admin = [
      Auth.has('MANAGE_ORG') && ['/org-units', 'building-2', 'Quản trị tổ chức'],
      Auth.has('MANAGE_ACCOUNT') && ['/accounts', 'id-card', 'Quản trị tài khoản'],
      Auth.has('MANAGE_ACCOUNT') && ['/roles', 'shield', 'Quản trị vai trò'],
      Auth.has('MANAGE_PRODUCT') && ['/products', 'qr-code', 'Quản trị mã hàng'],
    ].filter(Boolean);
    const report = [
      Auth.has('REPORT_PROGRESS') && ['/progress', 'clipboard-pen-line', 'Báo cáo tiến độ'],
      (Auth.has('VIEW_REPORT') || Auth.has('REPORT_PROGRESS')) && ['/history', 'history', 'Lịch sử báo cáo'],
    ].filter(Boolean);
    const ddItems = (list) => list.map(([p, ic, l]) =>
      `<a class="dd-item ${p === path ? 'active' : ''}" href="#${p}">${icon(ic)} ${esc(l)}</a>`).join('');
    const group = (label, ic, list) => list.length ? `
      <div class="nav-item">
        <button class="nav-btn ${list.some((x) => x[0] === path) ? 'active' : ''}" data-act="toggle-dd">${icon(ic)} ${label} ${icon('chevron-down')}</button>
        <div class="dropdown">${ddItems(list)}</div>
      </div>` : '';
    return `
      <header class="navbar">
        <button class="btn btn-ghost btn-icon menu-toggle" data-act="toggle-menu">${icon('menu')}</button>
        <a class="brand" href="#${homePath()}"><img src="assets/logo.png" alt="FOMECO"><span>Mini-MES</span></a>
        <nav class="nav" id="main-nav">
          ${Auth.has('VIEW_REPORT') ? `<div class="nav-item"><a class="nav-btn ${path === '/' ? 'active' : ''}" href="#/">${icon('house')} Dashboard</a></div>` : ''}
          ${group('Quản trị', 'settings-2', admin)}
          ${group('Báo cáo sản xuất', 'factory', report)}
        </nav>
        <div class="nav-item" style="margin-left:auto">
          <button class="user-btn" data-act="toggle-dd" data-testid="user-menu">
            <span class="avatar">${esc(initials(u.full_name))}</span>
            <span class="user-meta" style="text-align:left"><div class="bold sm">${esc(u.full_name)}</div><div class="xs muted">${esc(u.role_name || '')}</div></span>
            ${icon('chevron-down')}
          </button>
          <div class="dropdown right">
            <a class="dd-item" href="#/profile">${icon('user')} Hồ sơ & đổi mật khẩu</a>
            <div class="dd-sep"></div>
            <button class="dd-item" data-act="logout">${icon('log-out')} Đăng xuất</button>
          </div>
        </div>
      </header>`;
  }

  // ---------- Đăng nhập ----------
  function renderLogin(app) {
    document.title = 'Đăng nhập | FOMECO Mini-MES';
    app.innerHTML = `
      <div class="login-wrap">
        <form class="card login-card stack" id="login-form" autocomplete="on">
          <div class="center">
            <img class="logo" src="assets/logo.png" alt="FOMECO">
            <h1 style="font-size:22px">FOMECO Mini-MES</h1>
            <p class="muted">Báo cáo sản xuất BTP theo công đoạn</p>
          </div>
          <div class="field"><label>Tài khoản <span class="req">*</span></label>
            <input class="input" name="username" placeholder="Nhập tên đăng nhập..." autofocus autocomplete="username"></div>
          <div class="field"><label>Mật khẩu <span class="req">*</span></label>
            <input class="input" type="password" name="password" placeholder="Nhập mật khẩu..." autocomplete="current-password"></div>
          <div id="login-err"></div>
          <button class="btn btn-lg" type="submit">${icon('log-in')} Đăng nhập</button>
          <p class="center xs muted">Quên mật khẩu? Liên hệ quản trị viên để được cấp lại.</p>
        </form>
      </div>`;
    refreshIcons();
    const f = document.getElementById('login-form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = f.username.value.trim(), password = f.password.value;
      const box = document.getElementById('login-err');
      const show = (m) => { box.innerHTML = `<div class="alert alert-error">${icon('circle-alert')} ${esc(m)}</div>`; refreshIcons(); };
      if (!username) return show('Vui lòng nhập tên đăng nhập.');
      if (!password) return show('Vui lòng nhập mật khẩu.');
      const btn = f.querySelector('button[type=submit]');
      const msg = await UI.busy(btn, () => Auth.login(username, password));
      if (msg) return show(msg);
      const back = sessionStorage.getItem('fomeco.redirect');
      sessionStorage.removeItem('fomeco.redirect');
      location.hash = '#' + (back && back !== '/login' ? back : homePath());
    });
  }

  // ---------- Dọn kết nối realtime khi rời trang ----------
  let cleanups = [];
  function onLeave(fn) { cleanups.push(fn); }
  function runCleanups() { cleanups.forEach((f) => { try { f(); } catch (e) { /* bỏ qua */ } }); cleanups = []; }

  /** Đăng ký nghe báo cáo thay đổi cho trang hiện tại: gọi reload (gộp nhiều thay đổi liên tiếp) + hiện chấm "Trực tiếp" */
  function live(root, reload, opts = {}) {
    const dot = root.querySelector('[data-live]');
    const setDot = (ok) => { if (dot) dot.innerHTML = ok ? '<span class="live on"></span> Trực tiếp' : '<span class="live"></span> Đang kết nối...'; };
    setDot(false);
    let t = null;
    const unsub = API.subscribeReports((p) => {
      clearTimeout(t);
      t = setTimeout(() => {
        reload();
        if (opts.notify && p.eventType === 'INSERT') UI.toast('info', 'Có báo cáo mới', 'Số liệu vừa được cập nhật.', 2500);
      }, 400);
    }, setDot);
    onLeave(() => { clearTimeout(t); unsub(); });
  }

  // ---------- Router ----------
  let initialized = false;
  async function route() {
    const app = document.getElementById('app');
    const [path, qs] = (location.hash.slice(1) || '/').split('?');
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    if (!initialized) { await Auth.load(); initialized = true; }

    if (path === '/login') {
      runCleanups();
      if (Auth.user) { location.hash = '#' + homePath(); return; }
      return renderLogin(app);
    }
    if (!Auth.user) {
      try { sessionStorage.setItem('fomeco.redirect', path); } catch (e) { /* bỏ qua */ }
      location.hash = '#/login';
      return;
    }
    const page = window.PAGES[path];
    if (!page) { location.hash = '#' + homePath(); return; }
    const allowed = (!page.perm || Auth.has(page.perm)) && (!page.any || page.any.some((p) => Auth.has(p)));
    if (!allowed) {
      if (path === '/') { location.hash = '#' + homePath(); return; }
      app.innerHTML = navbar(path) + `<main class="main"><div class="card center stack" style="max-width:520px;margin:60px auto">
        ${icon('shield-x', 'ic-xl text-error')}<h2>Bạn không có quyền thực hiện thao tác này.</h2>
        <p class="muted">Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
        <div><a class="btn" href="#${homePath()}">${icon('house')} Về trang chủ</a></div></div></main>`;
      refreshIcons();
      return;
    }
    document.title = `${page.title} | FOMECO Mini-MES`;
    runCleanups();
    app.innerHTML = navbar(path) + '<main class="main" id="page"></main>';
    const root = document.getElementById('page');
    refreshIcons();
    try {
      await page.render(root, query);
    } catch (e) {
      console.error(e);
      root.innerHTML = `<div class="alert alert-error">${icon('circle-alert')} ${esc(e.message || 'Không tải được trang.')}</div>`;
    }
    refreshIcons();
  }

  // Sự kiện chung của thanh menu
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    const openItems = document.querySelectorAll('.nav-item.open');
    if (t && t.dataset.act === 'toggle-dd') {
      const item = t.closest('.nav-item');
      const was = item.classList.contains('open');
      openItems.forEach((x) => x.classList.remove('open'));
      if (!was) item.classList.add('open');
      return;
    }
    if (t && t.dataset.act === 'toggle-menu') { document.getElementById('main-nav').classList.toggle('show'); return; }
    if (t && t.dataset.act === 'logout') { Auth.logout(); return; }
    openItems.forEach((x) => x.classList.remove('open'));
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('online', () => UI.toast('success', 'Đã khôi phục kết nối internet'));
  window.addEventListener('offline', () => UI.toast('error', 'Mất kết nối internet', '', 5000));
  API.client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && Auth.user) { Auth.user = null; location.hash = '#/login'; }
  });

  window.App = { route, homePath, on, live, onLeave };
  document.addEventListener('DOMContentLoaded', route);
})();
