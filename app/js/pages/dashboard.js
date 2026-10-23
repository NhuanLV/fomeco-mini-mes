/* Dashboard: tổng hợp sản lượng, nhận/chuyển, tồn bán thành phẩm theo xí nghiệp */
(function () {
  const { esc, icon, fmtQty, fmtDateTime, fmtDate, badge, refreshIcons, options } = UI;
  let chart = null, timer = null;

  async function render(root) {
    if (timer) clearInterval(timer);
    const units = (await API.listUnits()).filter((u) => u.level === 2 && u.active);
    const s = { from: UI.daysAgo(6), to: UI.today(), unit: '', preset: '7d' };

    root.innerHTML = `<div class="stack">
      ${UI.pageHead('Dashboard', 'house', `<a class="btn btn-outline" href="#/history">${icon('history')} Lịch sử báo cáo</a>`)}
      <div class="row between" style="align-items:flex-end">
        <div><h1>Tổng quan sản xuất</h1><p class="muted">${esc(APP_CONFIG.COMPANY_NAME)}</p></div>
        <div style="text-align:right"><div class="live-tag" data-live></div><div class="xs muted" id="upd"></div></div>
      </div>
      <div class="card stack">
        <div class="row">
          <button class="btn btn-outline" data-act="preset" data-p="today">${icon('calendar')} Hôm nay</button>
          <button class="btn btn-outline" data-act="preset" data-p="7d">${icon('history')} 7 ngày qua</button>
          <button class="btn btn-outline" data-act="preset" data-p="month">${icon('calendar-days')} Tháng này</button>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr 1fr auto;align-items:end">
          <div class="field"><label>Từ ngày</label><input class="input" type="date" name="from"></div>
          <div class="field"><label>Đến ngày</label><input class="input" type="date" name="to"></div>
          <div class="field"><label>Xí nghiệp</label><select class="select" name="unit"><option value="">Tất cả xí nghiệp</option>${options(units.map((u) => ({ value: u.id, label: u.name })))}</select></div>
          <button class="btn btn-outline btn-icon" data-act="refresh" title="Tải lại">${icon('refresh-cw')}</button>
        </div>
        <div id="derr"></div>
      </div>
      <div class="grid g6" id="kpis"></div>
      <div class="dash-charts">
        <div class="card"><div class="card-title"><h2>Sản lượng theo thời gian</h2><span class="xs muted" id="range"></span></div><div style="height:290px"><canvas id="chart"></canvas></div></div>
        <div class="card"><div class="card-title"><h2>Tồn bán thành phẩm theo xí nghiệp</h2>${badge('chiếc')}</div><div id="stockbars" class="stack" style="gap:12px"></div></div>
      </div>
      <div class="card"><h2 style="margin-bottom:10px">Tổng hợp theo xí nghiệp</h2>
        <div class="table-wrap"><table class="table"><thead><tr><th>Xí nghiệp</th><th class="num">Đạt</th><th class="num">Không đạt</th><th class="num">Tỷ lệ không đạt</th>
        <th class="num">Nhận bán thành phẩm</th><th class="num">Chuyển bán thành phẩm</th><th class="num">Tồn bán thành phẩm</th><th class="num">Số báo cáo</th><th></th></tr></thead><tbody id="tbu"></tbody></table></div>
        <p class="xs muted" style="margin-top:8px">Tỷ lệ không đạt trên 5% được đánh dấu vàng. Số liệu cập nhật ngay khi có báo cáo mới, sửa hoặc hủy (cập nhật trực tiếp).</p></div>
    </div>`;

    const el = (n) => root.querySelector(`[name=${n}]`);
    const syncInputs = () => {
      el('from').value = s.from; el('to').value = s.to;
      root.querySelectorAll('[data-act=preset]').forEach((b) => b.classList.toggle('btn-soft', b.dataset.p === s.preset));
    };

    let loadSeq = 0; // chống kết quả cũ ghi đè khi đổi bộ lọc liên tiếp
    async function load() {
      const my = ++loadSeq;
      const derr = root.querySelector('#derr');
      if (s.from > s.to) { derr.innerHTML = `<div class="alert alert-warning">${icon('triangle-alert')} Từ ngày không được lớn hơn Đến ngày.</div>`; refreshIcons(); return; }
      derr.innerHTML = '';
      const kp = root.querySelector('#kpis');
      if (!kp.children.length) kp.innerHTML = Array(6).fill('<div class="card kpi"><div class="skeleton" style="height:50px"></div></div>').join('');
      let daily = [], stock = [];
      try {
        const toIso = s.to === UI.today() ? new Date().toISOString() : UI.endIso(s.to);
        [daily, stock] = await Promise.all([API.getDaily(s.from, s.to, s.unit), API.getStock({ to: toIso, unitId: s.unit })]);
      } catch (e) { if (my === loadSeq) UI.err(e.message); }
      if (my !== loadSeq) return;
      root.querySelector('#upd').textContent = 'Cập nhật ' + fmtDateTime(new Date().toISOString());
      root.querySelector('#range').textContent = `${fmtDate(s.from)} – ${fmtDate(s.to)}`;

      const sum = (k) => daily.reduce((a, r) => a + Number(r[k]), 0);
      const ok = sum('ok_qty'), ng = sum('ng_qty');
      const k = [
        ['Sản lượng đạt', ok, 'chiếc', 'check', 'emerald'],
        ['Sản lượng không đạt', ng, `chiếc · ${(ok + ng ? (ng / (ok + ng)) * 100 : 0).toFixed(1)}% không đạt`, 'x', 'red'],
        ['Nhận bán thành phẩm trong kỳ', sum('received_qty'), 'chiếc', 'arrow-down-to-line', 'blue'],
        ['Chuyển bán thành phẩm trong kỳ', sum('transferred_qty'), 'chiếc', 'arrow-up-from-line', 'blue'],
        ['Tồn bán thành phẩm cuối kỳ', stock.reduce((a, r) => a + Number(r.closing_qty), 0), 'chiếc', 'package', 'emerald'],
        ['Có báo cáo trong kỳ', new Set(daily.map((r) => r.unit_id)).size, `xí nghiệp · ${sum('report_count')} báo cáo`, 'factory', 'amber'],
      ];
      root.querySelector('#kpis').innerHTML = k.map(([l, v, u, ic, c]) => `<div class="card kpi ${c}"><div class="k-label">${l}${icon(ic)}</div><div class="k-val">${fmtQty(v)}</div><div class="xs muted">${u}</div></div>`).join('');

      // Biểu đồ
      const days = [];
      for (let d = new Date(s.from + 'T00:00:00'); d <= new Date(s.to + 'T00:00:00') && days.length < 92; d.setDate(d.getDate() + 1))
        days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      const by = {};
      daily.forEach((r) => { by[r.day] = by[r.day] || { ok: 0, ng: 0 }; by[r.day].ok += +r.ok_qty; by[r.day].ng += +r.ng_qty; });
      if (chart) chart.destroy();
      if (window.Chart) {
        chart = new Chart(root.querySelector('#chart'), {
          type: 'bar',
          data: { labels: days.map((d) => d.slice(8) + '/' + d.slice(5, 7)), datasets: [
            { label: 'Đạt', data: days.map((d) => by[d]?.ok || 0), backgroundColor: '#10b981', stack: 's', borderRadius: 4 },
            { label: 'Không đạt', data: days.map((d) => by[d]?.ng || 0), backgroundColor: '#f87171', stack: 's', borderRadius: 4 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', align: 'end' } },
            scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } } },
        });
      }

      // Theo xí nghiệp
      const map = new Map();
      const get = (id, name) => { if (!map.has(id)) map.set(id, { id, name, ok: 0, ng: 0, rc: 0, tr: 0, n: 0, st: 0 }); return map.get(id); };
      units.filter((u) => !s.unit || u.id === s.unit).forEach((u) => get(u.id, u.name));
      daily.forEach((d) => { const r = get(d.unit_id, d.unit_name); r.ok += +d.ok_qty; r.ng += +d.ng_qty; r.rc += +d.received_qty; r.tr += +d.transferred_qty; r.n += +d.report_count; });
      stock.forEach((x) => { get(x.unit_id, x.unit_name).st += +x.closing_qty; });
      const list = [...map.values()].sort((a, b) => b.ok + b.ng - (a.ok + a.ng) || a.name.localeCompare(b.name, 'vi'));
      const max = Math.max(1, ...list.map((r) => Math.abs(r.st)));
      const withStock = list.filter((r) => r.st !== 0);
      root.querySelector('#stockbars').innerHTML = withStock.length ? withStock.map((r) => `<div class="sm">
          <div class="row between"><span>${esc(r.name)}</span><b class="${r.st < 0 ? 'text-error' : ''}">${fmtQty(r.st)}</b></div>
          <div class="bar"><span class="${r.st < 0 ? 'neg' : ''}" style="width:${(Math.abs(r.st) / max) * 100}%"></span></div></div>`).join('')
        : '<p class="muted center" style="padding:24px">Không có dữ liệu tồn bán thành phẩm phù hợp với điều kiện đã chọn.</p>';
      root.querySelector('#tbu').innerHTML = list.map((r) => `<tr><td class="bold">${esc(r.name)}</td>
        <td class="num text-success">${fmtQty(r.ok)}</td><td class="num text-error">${fmtQty(r.ng)}</td>
        <td class="num">${r.ok + r.ng ? badge(((r.ng / (r.ok + r.ng)) * 100).toFixed(1) + '%', r.ng / (r.ok + r.ng) > 0.05 ? 'warning' : 'neutral') : '<span class="muted">—</span>'}</td>
        <td class="num">${fmtQty(r.rc)}</td><td class="num">${fmtQty(r.tr)}</td><td class="num bold ${r.st < 0 ? 'text-error' : ''}">${fmtQty(r.st)}</td><td class="num">${r.n}</td>
        <td class="right"><a class="btn btn-outline btn-sm" href="#/history?unit=${r.id}&from=${s.from}&to=${s.to}">Chi tiết</a></td></tr>`).join('');
      refreshIcons();
    }

    root.addEventListener('change', (e) => {
      if (['from', 'to', 'unit'].includes(e.target.name)) { s[e.target.name] = e.target.value; if (e.target.name !== 'unit') s.preset = ''; syncInputs(); load(); }
    });
    UI.on(root, 'click', {
      preset: (t) => { s.preset = t.dataset.p; s.to = UI.today(); s.from = s.preset === 'today' ? UI.today() : s.preset === '7d' ? UI.daysAgo(6) : UI.startOfMonth(); syncInputs(); load(); },
      refresh: () => load(),
    });
    syncInputs();
    await load();
    App.live(root, load, { notify: true });
    // Dự phòng: tải lại mỗi 5 phút nếu mất kết nối realtime
    timer = setInterval(() => { if (document.getElementById('kpis')) load(); else clearInterval(timer); }, 300000);
    App.onLeave(() => clearInterval(timer));
  }

  PAGES['/'] = { title: 'Dashboard', perm: 'VIEW_REPORT', render };
})();
