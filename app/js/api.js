/* Tầng dữ liệu: mọi lệnh gọi Supabase nằm ở đây.
   Sau này nối Bravo hoặc đổi backend chỉ cần sửa file này. */
(function () {
  const cfg = window.APP_CONFIG;
  // Chế độ test: link có ?phien=rieng → mỗi tab giữ phiên đăng nhập riêng (đóng tab là hết phiên).
  // Link thường vẫn dùng phiên chung như cũ.
  const rieng = new URLSearchParams(location.search).get('phien') === 'rieng';
  window.FOMECO_STORE = rieng ? window.sessionStorage : window.localStorage;
  // Mỗi tab một khóa phiên riêng: tránh việc đăng xuất ở tab này báo sang (BroadcastChannel) và đăng xuất các tab khác.
  function tabKey() {
    try {
      let k = sessionStorage.getItem('fomeco.tabkey');
      if (!k) { k = 'fomeco-auth-' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('fomeco.tabkey', k); }
      return k;
    } catch (e) { return 'fomeco-auth-tab'; }
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
    auth: Object.assign({ persistSession: true, autoRefreshToken: true }, rieng ? { storage: window.sessionStorage, storageKey: tabKey() } : {}),
  });

  function message(error, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
    const m = error && error.message;
    if (!m) return fallback;
    if (/JWT|session/i.test(m)) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (/row-level security|permission denied/i.test(m)) return 'Tài khoản không có quyền thực hiện thao tác này.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.';
    if (/violates foreign key constraint/i.test(m)) return 'Dữ liệu đang được sử dụng ở nơi khác, không thể xóa.';
    if (/duplicate key/i.test(m)) return 'Mã đã tồn tại. Vui lòng nhập mã khác.';
    // Chuẩn hóa câu chữ thông báo từ cơ sở dữ liệu: không xưng hô, không viết tắt
    return m
      .replace(/^Bạn không có quyền/, 'Tài khoản không có quyền')
      .replace(/^Bạn chỉ được/, 'Chỉ được')
      .replace('các trường OK, NG, Nhận BTP hoặc Chuyển BTP', 'các ô Đạt, Không đạt, Nhận bán thành phẩm hoặc Chuyển bán thành phẩm')
      .replace(/\bBTP\b/g, 'bán thành phẩm');
  }
  async function run(promise) {
    const { data, error } = await promise;
    if (error) throw new Error(message(error));
    return data;
  }

  const API = {
    client: sb,
    message,
    emailOf: (username) => `${String(username).trim().toLowerCase()}@${cfg.EMAIL_DOMAIN}`,

    // ---------- Phiên đăng nhập ----------
    async session() { return (await sb.auth.getSession()).data.session; },
    signIn: (username, password) => sb.auth.signInWithPassword({ email: API.emailOf(username), password }),
    signOut: () => sb.auth.signOut(),
    async changeMyPassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw new Error(message(error));
    },

    // ---------- Tài khoản / phân quyền ----------
    getAccount: (id) => run(sb.from('v_accounts').select('*').eq('id', id).maybeSingle()),
    listAccounts: () => run(sb.from('v_accounts').select('*').order('full_name')),
    createAccount: (a) => run(sb.rpc('admin_create_account', {
      p_username: a.username, p_password: a.password, p_full_name: a.fullName, p_unit_id: a.unitId, p_role_id: a.roleId,
    })),
    updateAccount: (a) => run(sb.rpc('admin_update_account', {
      p_id: a.id, p_full_name: a.fullName, p_unit_id: a.unitId, p_role_id: a.roleId, p_active: a.active,
    })),
    setPassword: (id, pw) => run(sb.rpc('admin_set_password', { p_id: id, p_password: pw })),
    deleteAccount: (id) => run(sb.rpc('admin_delete_account', { p_id: id })),
    listPermissions: () => run(sb.from('permissions').select('*').order('sort')),
    listRoles: () => run(sb.from('roles').select('*').order('name')),
    saveRole: (r) => {
      const p = { name: r.name, description: r.description, permissions: r.permissions };
      return r.id ? run(sb.from('roles').update(p).eq('id', r.id)) : run(sb.from('roles').insert(p));
    },
    deleteRole: (id) => run(sb.from('roles').delete().eq('id', id)),

    // ---------- Tổ chức ----------
    listUnits: () => run(sb.from('org_units').select('*').order('level').order('name')),
    saveUnit: (u) => {
      const p = { code: u.code, name: u.name, level: u.level, parent_id: u.parent_id || null, active: u.active };
      return u.id ? run(sb.from('org_units').update(p).eq('id', u.id)) : run(sb.from('org_units').insert({ ...p, source: 'manual' }));
    },
    deleteUnit: (id) => run(sb.from('org_units').delete().eq('id', id)),

    // ---------- Mã hàng / công đoạn / QR ----------
    listItems: () => run(sb.from('items').select('*').order('code')),
    listOperations: () => run(sb.from('operations').select('*').order('code')),
    listItemOps: (itemId) => {
      let q = sb.from('v_item_operations').select('*').order('item_code').order('seq');
      if (itemId) q = q.eq('item_id', itemId);
      return run(q);
    },
    findByCodes: (itemCode, opCode) => run(sb.from('v_item_operations').select('*')
      .eq('item_code', itemCode).eq('operation_code', opCode).maybeSingle()),
    createQr: (itemId, opIds) => run(sb.rpc('create_qr_codes', { p_item_id: itemId, p_operation_ids: opIds })),
    async saveItem(it) {
      const p = { code: it.code, name: it.name, active: it.active !== false };
      if (it.id) { await run(sb.from('items').update(p).eq('id', it.id)); return it.id; }
      const row = await run(sb.from('items').insert({ ...p, erp_code: p.code, source: 'manual' }).select('id').single());
      return row.id;
    },
    async upsertOperation(code, name) {
      const ex = await run(sb.from('operations').select('id').eq('code', code).maybeSingle());
      if (ex) return ex.id;
      const row = await run(sb.from('operations').insert({ code, name, erp_code: code, source: 'manual' }).select('id').single());
      return row.id;
    },
    addItemOp: (itemId, opId, seq) => run(sb.from('item_operations').insert({ item_id: itemId, operation_id: opId, seq })),
    removeItemOp: (id) => run(sb.from('item_operations').delete().eq('id', id)),
    importCatalog: (rows) => run(sb.rpc('import_catalog', { p_rows: rows })),

    // ---------- Báo cáo ----------
    createReport: (r) => run(sb.from('production_reports').insert(r)),
    async updateReport(id, q) {
      const rows = await run(sb.from('production_reports').update(q).eq('id', id).select('id'));
      if (!rows.length) throw new Error('Tài khoản không có quyền thực hiện thao tác này.');
    },
    async cancelReport(id, reason) {
      const rows = await run(sb.from('production_reports').update({ status: 'cancelled', cancel_reason: reason }).eq('id', id).select('id'));
      if (!rows.length) throw new Error('Tài khoản không có quyền thực hiện thao tác này.');
    },
    async listReports(f = {}) {
      const page = f.page || 1, size = f.pageSize || 20;
      let q = sb.from('v_report_history').select('*', { count: 'exact' })
        .order('reported_at', { ascending: false }).range((page - 1) * size, page * size - 1);
      if (f.unitId) q = q.eq('unit_id', f.unitId);
      if (f.reporterId) q = q.eq('reporter_id', f.reporterId);
      if (f.status) q = q.eq('status', f.status);
      if (f.method) q = q.eq('method', f.method);
      if (f.from) q = q.gte('reported_at', f.from);
      if (f.to) q = q.lte('reported_at', f.to);
      const s = (f.search || '').trim().replace(/[%,()]/g, ' ');
      if (s) q = q.or(['item_code', 'item_name', 'operation_code', 'operation_name', 'reporter_name', 'unit_name']
        .map((c) => `${c}.ilike.%${s}%`).join(','));
      const { data, error, count } = await q;
      if (error) throw new Error(message(error));
      return { rows: data || [], total: count || 0 };
    },
    listLogs: (reportId) => run(sb.from('report_logs')
      .select('id, action, at, before, after, reason, actor:profiles!report_logs_actor_id_fkey(full_name)')
      .eq('report_id', reportId).order('at')),
    getStock: (p = {}) => run(sb.rpc('get_btp_stock', {
      p_from: p.from || null, p_to: p.to || new Date().toISOString(), p_unit_id: p.unitId || null, p_item_id: p.itemId || null,
    })),
    getDaily: (from, to, unitId) => run(sb.rpc('get_daily_output', { p_from: from, p_to: to, p_unit_id: unitId || null })),

    // ---------- Realtime: báo cáo mới / sửa / hủy đẩy ngay tới mọi màn hình đang mở ----------
    /** Gọi onChange(payload) mỗi khi có báo cáo thay đổi. onStatus(true/false) báo trạng thái kết nối. Trả về hàm hủy. */
    subscribeReports(onChange, onStatus) {
      const ch = sb.channel('reports-' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'production_reports' }, (p) => onChange(p))
        .subscribe((status) => onStatus && onStatus(status === 'SUBSCRIBED'));
      return () => { sb.removeChannel(ch); };
    },
  };

  window.API = API;
})();
