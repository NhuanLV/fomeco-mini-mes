/* Quản trị tài khoản, vai trò, tổ chức và hồ sơ cá nhân */
(function () {
  const { esc, icon, badge, refreshIcons, options, initials, normalize, SOURCE } = UI;

  // ---------- Đổi mật khẩu (của mình hoặc admin đặt lại) ----------
  function passwordDialog(account, self) {
    const m = UI.modal({
      title: self ? 'Đổi mật khẩu' : `Đặt lại mật khẩu — ${account.full_name}`,
      body: `<div class="stack">
        <div class="field"><label>Mật khẩu mới <span class="req">*</span></label><input class="input" type="password" name="p1" autocomplete="new-password"><span class="help">Ít nhất 6 ký tự</span></div>
        <div class="field"><label>Nhập lại mật khẩu mới <span class="req">*</span></label><input class="input" type="password" name="p2" autocomplete="new-password"></div></div>`,
      footer: `<button class="btn btn-ghost" data-close>Hủy</button><button class="btn" data-ok>${icon('key-round')} Đổi mật khẩu</button>`,
    });
    m.el.querySelector('[data-ok]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
      const p1 = m.el.querySelector('[name=p1]').value, p2 = m.el.querySelector('[name=p2]').value;
      if (p1.length < 6) return UI.warn('Mật khẩu phải có ít nhất 6 ký tự.');
      if (p1 !== p2) return UI.warn('Mật khẩu nhập lại không khớp.');
      try { self ? await API.changeMyPassword(p1) : await API.setPassword(account.id, p1); UI.ok('Đã đổi mật khẩu.'); m.close(); }
      catch (e2) { UI.err(e2.message); }
    }));
  }

  // ---------- Tài khoản ----------
  async function accounts(root) {
    const [units, allRoles] = await Promise.all([API.listUnits(), API.listRoles()]);
    // Admin (SYSTEM_ADMIN) toàn quyền; nhân viên quản lý chỉ gán/sửa vai trò không vượt quyền của mình
    const sys = Auth.has('SYSTEM_ADMIN');
    const roleById = Object.fromEntries(allRoles.map((r) => [r.id, r]));
    const within = (roleId) => sys || !roleId || (roleById[roleId] && !roleById[roleId].permissions.includes('SYSTEM_ADMIN')
      && roleById[roleId].permissions.every((p) => Auth.has(p)));
    const roles = allRoles.filter((r) => within(r.id));
    let list = [], search = '', unit = '';
    root.innerHTML = `<div class="stack">
      ${UI.pageHead('Quản trị tài khoản', 'id-card', `<button class="btn" data-act="new" data-testid="new-account">${icon('plus')} Thêm mới</button>`)}
      <div class="card">
        <div class="row" style="margin-bottom:12px">
          <div class="input-wrap has-prefix" style="width:300px"><span class="prefix">${icon('search')}</span><input class="input" name="search" placeholder="Tìm theo tên hoặc tài khoản..."></div>
          <select class="select" name="unit" style="width:300px"><option value="">Tất cả đơn vị</option>${options(units.map((u) => ({ value: u.id, label: u.name })))}</select>
        </div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Tên người dùng</th><th>Tài khoản</th><th>Đơn vị phân công</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody id="tb"></tbody></table></div>
        <p class="sm muted" style="margin-top:10px" id="info"></p>
        ${sys ? '' : `<p class="xs muted">${icon('info')} Vai trò hiện tại chỉ được tạo và sửa tài khoản có vai trò không vượt quá quyền của mình. Đặt lại mật khẩu và xóa tài khoản do quản trị hệ thống thực hiện.</p>`}</div></div>`;
    const draw = () => {
      const rows = list.filter((a) => (!unit || a.unit_id === unit) && (!search || normalize(a.full_name + ' ' + a.username).includes(normalize(search))));
      root.querySelector('#tb').innerHTML = rows.map((a) => `<tr class="${a.active ? '' : 'dim'}">
        <td><div class="row" style="flex-wrap:nowrap"><span class="avatar">${esc(initials(a.full_name))}</span><div><div class="bold">${esc(a.full_name)}</div><div class="sub">${esc(a.role_name || '')}</div></div></div></td>
        <td class="mono xs muted">${esc(a.username)}</td>
        <td>${a.unit_name ? badge(a.unit_name) : '<i class="muted">Chưa phân công</i>'}</td>
        <td>${a.role_name ? badge(a.role_name, 'info') : '<i class="muted">Chưa có vai trò</i>'}</td>
        <td>${badge(a.active ? 'Đang hoạt động' : 'Đã khóa', a.active ? 'success' : 'error')}</td>
        <td class="nowrap">${sys ? `<button class="btn btn-ghost btn-icon" data-act="pw" data-id="${a.id}" title="Đặt lại mật khẩu">${icon('key-round')}</button>` : ''}
          ${within(a.role_id) ? `<button class="btn btn-ghost btn-icon" data-act="edit" data-id="${a.id}" title="Sửa">${icon('pencil')}</button>` : `<span class="xs muted" title="Chỉ quản trị hệ thống được sửa tài khoản này">${icon('lock')}</span>`}
          ${sys ? `<button class="btn btn-ghost btn-icon danger" data-act="del" data-id="${a.id}" title="Xóa" ${a.id === Auth.user.id ? 'disabled' : ''}>${icon('trash-2')}</button>` : ''}</td></tr>`).join('')
        || '<tr><td colspan="6" class="empty">Không tìm thấy tài khoản nào.</td></tr>';
      root.querySelector('#info').textContent = `Hiển thị ${rows.length} trong tổng số ${list.length} tài khoản`;
      refreshIcons();
    };
    const load = async () => { list = await API.listAccounts(); draw(); };
    root.querySelector('[name=search]').addEventListener('input', UI.debounce((e) => { search = e.target.value; draw(); }, 250));
    root.querySelector('[name=unit]').addEventListener('change', (e) => { unit = e.target.value; draw(); });

    function form(a) {
      const isEdit = !!a;
      const m = UI.modal({
        title: isEdit ? 'Sửa thông tin tài khoản' : 'Tạo tài khoản mới',
        body: `<div class="stack">
          <div class="field"><label>Họ và tên <span class="req">*</span></label><input class="input" name="name" value="${esc(a?.full_name || '')}" placeholder="Ví dụ: Nguyễn Văn An"></div>
          <div class="grid g2">
            <div class="field"><label>Tên đăng nhập ${isEdit ? '' : '<span class="req">*</span>'}</label><input class="input" name="user" value="${esc(a?.username || '')}" ${isEdit ? 'disabled' : ''} placeholder="Ví dụ: nv.ck1" autocomplete="off"></div>
            ${isEdit ? '' : '<div class="field"><label>Mật khẩu <span class="req">*</span></label><input class="input" type="password" name="pw" autocomplete="new-password"><span class="help">Ít nhất 6 ký tự</span></div>'}
          </div>
          <div class="field"><label>Đơn vị phân công <span class="req">*</span></label><select class="select" name="unit"><option value="">Chọn đơn vị</option>
            ${options(units.filter((u) => u.active || u.id === a?.unit_id).map((u) => ({ value: u.id, label: u.level === 1 ? u.name + ' (Công ty)' : u.name })), a?.unit_id)}</select>
            <span class="help">Tài khoản thuộc Công ty được thao tác báo cáo của mọi xí nghiệp.</span></div>
          <div class="field"><label>Vai trò <span class="req">*</span></label><select class="select" name="role"><option value="">Chọn vai trò</option>${options(roles.map((r) => ({ value: r.id, label: r.name })), a?.role_id)}</select></div>
          ${isEdit ? `<label class="check"><input type="checkbox" name="active" ${a.active ? 'checked' : ''} ${a.id === Auth.user.id ? 'disabled' : ''}> Đang hoạt động <span class="xs muted">(bỏ chọn để khóa tài khoản, dữ liệu báo cáo vẫn giữ nguyên)</span></label>` : ''}
        </div>`,
        footer: `<button class="btn btn-ghost" data-close>Hủy</button><button class="btn" data-ok>${icon('check')} Lưu</button>`,
      });
      const v = (n) => m.el.querySelector(`[name=${n}]`);
      m.el.querySelector('[data-ok]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
        const name = v('name').value.trim();
        if (!name) return UI.warn('Vui lòng nhập họ và tên.');
        if (!isEdit) {
          if (!/^[a-z0-9._-]{3,32}$/.test(v('user').value.trim().toLowerCase())) return UI.warn('Tên đăng nhập chỉ gồm chữ thường không dấu, số, dấu chấm, gạch (3–32 ký tự).');
          if (v('pw').value.length < 6) return UI.warn('Mật khẩu phải có ít nhất 6 ký tự.');
        }
        if (!v('unit').value) return UI.warn('Vui lòng chọn đơn vị phân công.');
        if (!v('role').value) return UI.warn('Vui lòng chọn vai trò.');
        try {
          if (isEdit) {
            await API.updateAccount({ id: a.id, fullName: name, unitId: v('unit').value, roleId: v('role').value, active: v('active').checked });
            UI.ok('Đã cập nhật tài khoản.');
          } else {
            await API.createAccount({ username: v('user').value.trim().toLowerCase(), password: v('pw').value, fullName: name, unitId: v('unit').value, roleId: v('role').value });
            UI.ok(`Đã tạo tài khoản ${v('user').value.trim().toLowerCase()}.`);
          }
          m.close(); await load();
          if (isEdit && a.id === Auth.user.id) await Auth.load();
        } catch (e2) { UI.err(e2.message); }
      }));
    }
    const find = (t) => list.find((a) => a.id === t.dataset.id);
    UI.on(root, 'click', {
      new: () => form(null),
      edit: (t) => form(find(t)),
      pw: (t) => passwordDialog(find(t), false),
      del: async (t) => {
        const a = find(t);
        if (!(await UI.confirmDialog({ title: 'Xác nhận xóa tài khoản', message: `Xóa tài khoản "${a.full_name}"?\nTài khoản đã có báo cáo chỉ có thể khóa, không xóa được.`, okLabel: 'Xóa', danger: true }))) return;
        try { await API.deleteAccount(a.id); UI.ok('Tài khoản đã được xóa'); load(); } catch (e) { UI.err(e.message); }
      },
    });
    await load();
  }

  // ---------- Vai trò ----------
  async function roles(root) {
    const perms = await API.listPermissions();
    const pname = Object.fromEntries(perms.map((p) => [p.code, p.name]));
    let list = [];
    root.innerHTML = `<div class="stack">
      ${UI.pageHead('Quản trị vai trò', 'shield', `<button class="btn" data-act="new">${icon('plus')} Thêm mới</button>`)}
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Tên vai trò</th><th>Mô tả</th><th>Quyền hạn</th><th>Thao tác</th></tr></thead><tbody id="tb"></tbody></table></div>
      <p class="xs muted" style="margin-top:10px" id="info"></p></div></div>`;
    const load = async () => {
      list = await API.listRoles();
      root.querySelector('#tb').innerHTML = list.map((r) => `<tr>
        <td><span class="bold">${esc(r.name)}</span> ${r.is_system ? badge('Hệ thống') : ''}</td><td>${esc(r.description)}</td>
        <td><div class="row" style="gap:4px">${r.permissions.map((p) => badge(pname[p] || p, 'info')).join('') || '<i class="xs muted">Không có quyền</i>'}</div></td>
        <td class="nowrap">${r.is_system ? `<button class="btn btn-ghost btn-icon" data-act="edit" data-id="${r.id}" title="Xem">${icon('eye')}</button>`
          : `<button class="btn btn-ghost btn-icon" data-act="edit" data-id="${r.id}">${icon('pencil')}</button><button class="btn btn-ghost btn-icon danger" data-act="del" data-id="${r.id}">${icon('trash-2')}</button>`}</td></tr>`).join('');
      root.querySelector('#info').textContent = `${list.length} vai trò · ${new Set(perms.map((p) => p.group_name)).size} nhóm quyền · ${perms.length} quyền hạn`;
      refreshIcons();
    };
    function form(r) {
      const view = !!r?.is_system;
      const groups = [...new Set(perms.map((p) => p.group_name))];
      const m = UI.modal({
        title: view ? 'Chi tiết vai trò' : r ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới', size: 'lg',
        body: `<div class="stack">
          ${view ? `<div class="alert alert-warning"><b>Đây là vai trò hệ thống, không thể chỉnh sửa hoặc xóa.</b></div>` : ''}
          <div class="grid g2">
            <div class="field"><label>Tên vai trò ${view ? '' : '<span class="req">*</span>'}</label><input class="input" name="name" value="${esc(r?.name || '')}" ${view ? 'disabled' : ''} placeholder="Ví dụ: Tổ trưởng"></div>
            <div class="field"><label>Mô tả</label><textarea class="textarea" name="desc" rows="2" ${view ? 'disabled' : ''}>${esc(r?.description || '')}</textarea></div>
          </div>
          <div class="row between"><b>Quyền hạn</b><label class="check"><input type="checkbox" data-all ${view ? 'disabled' : ''}> Chọn tất cả</label></div>
          ${groups.map((g) => `<div><div class="bold sm" style="margin:6px 0">${esc(g)}</div><div class="grid g2" style="gap:8px">
            ${perms.filter((p) => p.group_name === g).map((p) => `<label class="check check-card"><input type="checkbox" name="perm" value="${p.code}" ${r?.permissions.includes(p.code) ? 'checked' : ''} ${view ? 'disabled' : ''}>
              <span><div>${esc(p.name)}</div></span></label>`).join('')}</div></div>`).join('')}
        </div>`,
        footer: view ? '<button class="btn btn-outline" data-close>Đóng</button>' : `<button class="btn btn-ghost" data-close>Hủy</button><button class="btn" data-ok>${icon('check')} Lưu</button>`,
      });
      const boxes = () => [...m.el.querySelectorAll('[name=perm]')];
      m.el.querySelector('[data-all]').addEventListener('change', (e) => boxes().forEach((b) => (b.checked = e.target.checked)));
      const okb = m.el.querySelector('[data-ok]');
      okb && okb.addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
        const name = m.el.querySelector('[name=name]').value.trim();
        if (!name) return UI.warn('Vui lòng nhập tên vai trò');
        try {
          await API.saveRole({ id: r?.id, name, description: m.el.querySelector('[name=desc]').value.trim(), permissions: boxes().filter((b) => b.checked).map((b) => b.value) });
          UI.ok(r ? 'Cập nhật vai trò thành công' : 'Tạo vai trò thành công'); m.close(); load();
        } catch (e2) { UI.err(e2.message); }
      }));
    }
    UI.on(root, 'click', {
      new: () => form(null),
      edit: (t) => form(list.find((r) => r.id === t.dataset.id)),
      del: async (t) => {
        const r = list.find((x) => x.id === t.dataset.id);
        if (!(await UI.confirmDialog({ title: 'Xác nhận xóa', message: `Xóa vai trò "${r.name}"?`, okLabel: 'Xóa', danger: true }))) return;
        try { await API.deleteRole(r.id); UI.ok('Xóa vai trò thành công'); load(); } catch (e) { UI.err(e.message); }
      },
    });
    await load();
  }

  // ---------- Tổ chức ----------
  async function orgUnits(root) {
    let list = [];
    root.innerHTML = `<div class="stack">
      ${UI.pageHead('Quản trị tổ chức', 'building-2', `<button class="btn btn-outline" data-act="erp">${icon('refresh-cw')} Đồng bộ ERP</button><button class="btn" data-act="new">${icon('plus')} Thêm đơn vị</button>`)}
      <div class="card"><h2 style="margin-bottom:10px">Cơ cấu tổ chức</h2>
      <div class="table-wrap"><table class="table"><thead><tr><th>Tên đơn vị</th><th>Mã đơn vị</th><th>Cấp đơn vị</th><th>Nguồn dữ liệu</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody id="tb"></tbody></table></div>
      <p class="xs muted" style="margin-top:10px" id="info"></p></div></div>`;
    const load = async () => {
      list = await API.listUnits();
      const tree = [];
      list.filter((u) => u.level === 1).forEach((c) => { tree.push(c); tree.push(...list.filter((u) => u.parent_id === c.id).sort((a, b) => b.active - a.active)); });
      tree.push(...list.filter((u) => u.level === 2 && !list.some((c) => c.id === u.parent_id)));
      root.querySelector('#tb').innerHTML = tree.map((u) => `<tr>
        <td style="${u.level === 2 ? 'padding-left:36px' : ''}" class="${u.level === 1 ? 'bold' : ''}">${icon(u.level === 1 ? 'building-2' : 'factory', 'muted')} ${esc(u.name)}</td>
        <td class="mono">${esc(u.code)}</td><td>Cấp ${u.level}</td><td>${badge(SOURCE[u.source], 'info')}</td>
        <td>${badge(u.active ? 'Đang hoạt động' : 'Ngừng sử dụng', u.active ? 'success' : 'neutral')}</td>
        <td class="nowrap"><button class="btn btn-ghost btn-icon" data-act="edit" data-id="${u.id}">${icon('pencil')}</button><button class="btn btn-ghost btn-icon danger" data-act="del" data-id="${u.id}">${icon('trash-2')}</button></td></tr>`).join('');
      root.querySelector('#info').textContent = `${list.filter((u) => u.level === 1).length} công ty · ${list.filter((u) => u.level === 2).length} đơn vị cấp 2`;
      refreshIcons();
    };
    function form(u) {
      const companies = list.filter((x) => x.level === 1);
      const m = UI.modal({
        title: u ? 'Sửa đơn vị' : 'Thêm đơn vị',
        body: `<div class="stack">
          <div class="field"><label>Tên đơn vị <span class="req">*</span></label><input class="input" name="name" value="${esc(u?.name || '')}" placeholder="Ví dụ: Xí nghiệp Cơ khí 4"></div>
          <div class="grid g2"><div class="field"><label>Mã đơn vị <span class="req">*</span></label><input class="input" name="code" value="${esc(u?.code || '')}" placeholder="Ví dụ: CK4"></div>
            <div class="field"><label>Cấp đơn vị</label><select class="select" name="level">${options([{ value: 1, label: 'Cấp 1 — Công ty' }, { value: 2, label: 'Cấp 2 — Xí nghiệp/Kho' }], u?.level || 2)}</select></div></div>
          <div class="field" id="pf"><label>Thuộc công ty</label><select class="select" name="parent">${options(companies.map((c) => ({ value: c.id, label: c.name })), u?.parent_id || companies[0]?.id)}</select></div>
          <label class="check"><input type="checkbox" name="active" ${u ? (u.active ? 'checked' : '') : 'checked'}> Đang hoạt động</label></div>`,
        footer: `<button class="btn btn-ghost" data-close>Hủy</button><button class="btn" data-ok>${icon('check')} Lưu</button>`,
      });
      const v = (n) => m.el.querySelector(`[name=${n}]`);
      const tog = () => { m.el.querySelector('#pf').style.display = v('level').value === '2' ? '' : 'none'; };
      v('level').addEventListener('change', tog); tog();
      m.el.querySelector('[data-ok]').addEventListener('click', (e) => UI.busy(e.currentTarget, async () => {
        if (!v('name').value.trim()) return UI.warn('Vui lòng nhập tên đơn vị.');
        if (!v('code').value.trim()) return UI.warn('Vui lòng nhập mã đơn vị.');
        const level = Number(v('level').value);
        try {
          await API.saveUnit({ id: u?.id, name: v('name').value.trim(), code: v('code').value.trim().toUpperCase(), level, parent_id: level === 2 ? v('parent').value : null, active: v('active').checked });
          UI.ok(u ? 'Đã cập nhật đơn vị.' : 'Đã thêm đơn vị.'); m.close(); load();
        } catch (e2) { UI.err(e2.message); }
      }));
    }
    UI.on(root, 'click', {
      erp: () => window.ErpInfo('tổ chức'),
      new: () => form(null),
      edit: (t) => form(list.find((u) => u.id === t.dataset.id)),
      del: async (t) => {
        const u = list.find((x) => x.id === t.dataset.id);
        if (!(await UI.confirmDialog({ title: 'Xóa đơn vị', message: `Xóa đơn vị "${u.name}"? Đơn vị đã có tài khoản hoặc báo cáo không thể xóa — hãy chuyển sang Ngừng sử dụng.`, okLabel: 'Xóa', danger: true }))) return;
        try { await API.deleteUnit(u.id); UI.ok('Đã xóa đơn vị.'); load(); } catch (e) { UI.err(e.message); }
      },
    });
    await load();
  }

  // ---------- Hồ sơ ----------
  async function profile(root) {
    const u = Auth.user;
    const perms = await API.listPermissions().catch(() => []);
    const pname = Object.fromEntries(perms.map((p) => [p.code, p.name]));
    root.innerHTML = `<div class="stack">${UI.pageHead('Hồ sơ', 'user')}
      <div class="card stack" style="max-width:640px">
        <div class="row"><span class="avatar" style="width:48px;height:48px;font-size:20px">${esc(initials(u.full_name))}</span>
          <div><div class="bold" style="font-size:18px">${esc(u.full_name)}</div><div class="muted mono sm">${esc(u.username)}</div></div></div>
        <div class="grid g2 sm"><div><div class="xs muted">Đơn vị phân công</div>${esc(u.unit_name || 'Chưa phân công')}</div><div><div class="xs muted">Vai trò</div>${esc(u.role_name || 'Chưa có vai trò')}</div></div>
        <div><div class="xs muted" style="margin-bottom:4px">Quyền hạn</div><div class="row" style="gap:4px">${(u.permissions || []).map((p) => badge(pname[p] || p, 'info')).join('')}</div></div>
        <div><button class="btn" data-act="pw">${icon('key-round')} Đổi mật khẩu</button></div></div></div>`;
    UI.on(root, 'click', { pw: () => passwordDialog(u, true) });
  }

  PAGES['/accounts'] = { title: 'Quản trị tài khoản', perm: 'MANAGE_ACCOUNT', render: accounts };
  PAGES['/roles'] = { title: 'Quản trị vai trò', perm: 'SYSTEM_ADMIN', render: roles };
  PAGES['/org-units'] = { title: 'Quản trị tổ chức', perm: 'MANAGE_ORG', render: orgUnits };
  PAGES['/profile'] = { title: 'Hồ sơ', render: profile };
})();
