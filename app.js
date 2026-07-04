/* ═══════════════════════════════════════════════════════════════
   BIFlow — Main Application JavaScript
   Full-featured BI Dashboard: Auth, Dashboard, KPIs, Import, Reports
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

const State = {
  currentUser: null,
  currentPage: 'dashboard',
  currentTab: 0,
  dashboardTabs: [],
  widgets: {},          // tabId -> Widget[]
  kpis: [],
  datasets: [],
  savedReports: [],
  previewData: null,
  previewFile: null,
  reportChart: null,
  reportChartType: 'bar',
  reportColorTheme: 'violet',
  widgetChartType: 'bar',
  widgetSize: 'md',
  kpiColor: '#6366f1',
  widgetCharts: {},     // widgetId -> Chart instance
  kpiCharts: {},        // kpiId -> D3 sparkline data
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

const DB = {
  get: (key, def = null) => {
    try { return JSON.parse(localStorage.getItem(`biflow_${key}`)) ?? def; }
    catch { return def; }
  },
  set: (key, val) => localStorage.setItem(`biflow_${key}`, JSON.stringify(val)),
  del: (key) => localStorage.removeItem(`biflow_${key}`),
};

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_DATASETS = {
  sales: {
    name: 'Sales Data',
    rows: (() => {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months.flatMap((m, i) => [
        { month: m, year: 2024, revenue: Math.round(38000 + i * 3200 + Math.random() * 8000), orders: Math.round(280 + i * 22 + Math.random() * 60), aov: Math.round(130 + Math.random() * 40), returns: Math.round(10 + Math.random() * 20), region: 'North' },
        { month: m, year: 2024, revenue: Math.round(22000 + i * 1800 + Math.random() * 5000), orders: Math.round(160 + i * 14 + Math.random() * 40), aov: Math.round(115 + Math.random() * 35), returns: Math.round(8 + Math.random() * 15), region: 'South' },
        { month: m, year: 2024, revenue: Math.round(18000 + i * 1400 + Math.random() * 4000), orders: Math.round(130 + i * 11 + Math.random() * 30), aov: Math.round(105 + Math.random() * 30), returns: Math.round(6 + Math.random() * 12), region: 'West' },
      ]);
    })(),
  },
  traffic: {
    name: 'Web Traffic',
    rows: Array.from({ length: 90 }, (_, i) => {
      const d = new Date(2024, 9, 1); d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        sessions: Math.round(4200 + i * 18 + Math.random() * 800),
        pageviews: Math.round(12000 + i * 55 + Math.random() * 2000),
        bounce_rate: +(42 - i * 0.1 + (Math.random() * 6 - 3)).toFixed(1),
        conversions: Math.round(120 + i * 1.2 + Math.random() * 30),
        avg_duration: Math.round(180 + i * 0.5 + Math.random() * 40),
      };
    }),
  },
  finance: {
    name: 'Financial KPIs',
    rows: (() => {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months.flatMap((m, i) => [
        { month: m, year: 2023, revenue: Math.round(420000 + i * 18000 + Math.random() * 30000), expenses: Math.round(310000 + i * 9000 + Math.random() * 20000), profit: 0, margin: 0, cash_flow: Math.round(80000 + Math.random() * 20000) },
        { month: m, year: 2024, revenue: Math.round(510000 + i * 22000 + Math.random() * 35000), expenses: Math.round(350000 + i * 10000 + Math.random() * 22000), profit: 0, margin: 0, cash_flow: Math.round(110000 + Math.random() * 25000) },
      ]).map(r => ({ ...r, profit: r.revenue - r.expenses, margin: +((r.revenue - r.expenses) / r.revenue * 100).toFixed(1) }));
    })(),
  },
  product: {
    name: 'Product Metrics',
    rows: (() => {
      const cats = ['Electronics','Clothing','Home & Garden','Sports','Beauty','Books','Toys','Food'];
      return cats.flatMap((cat, i) => Array.from({ length: 7 }, (_, m) => ({
        category: cat,
        month: ['Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m],
        units_sold: Math.round(200 + i * 50 + Math.random() * 200),
        revenue: Math.round(8000 + i * 2000 + Math.random() * 5000),
        inventory: Math.round(500 + Math.random() * 1000),
        returns_pct: +(2 + Math.random() * 8).toFixed(1),
        rating: +(3.5 + Math.random() * 1.5).toFixed(1),
      })));
    })(),
  },
};

// ─── Chart Colors ──────────────────────────────────────────────────────────────

const CHART_THEMES = {
  violet: ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#7c3aed','#4f46e5'],
  blue:   ['#3b82f6','#06b6d4','#0ea5e9','#38bdf8','#2563eb','#0284c7'],
  green:  ['#10b981','#84cc16','#22c55e','#34d399','#059669','#4ade80'],
  amber:  ['#f59e0b','#ef4444','#f97316','#fb923c','#dc2626','#d97706'],
  pink:   ['#ec4899','#8b5cf6','#f472b6','#d946ef','#be185d','#7c3aed'],
};

const getThemeColors = (theme) => CHART_THEMES[theme] || CHART_THEMES.violet;

const CHART_DEFAULTS = {
  animation: { duration: 800, easing: 'easeInOutQuart' },
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 17, 28, 0.9)',
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(99,102,241,0.3)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
    },
  },
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

function initAuth() {
  // Seed demo user if none
  const users = DB.get('users', []);
  if (!users.find(u => u.email === 'admin@biflow.io')) {
    users.push({ id: uid(), name: 'Admin', email: 'admin@biflow.io', password: 'admin123', createdAt: new Date().toISOString() });
    DB.set('users', users);
  }

  const session = DB.get('session');
  if (session) {
    const users = DB.get('users', []);
    const user = users.find(u => u.id === session.userId);
    if (user) { loginSuccess(user); return; }
  }
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

function loginSuccess(user) {
  State.currentUser = user;
  DB.set('session', { userId: user.id });
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  updateUserDisplay();
  loadUserData();
  initApp();
  lucide.createIcons();
}

function logout() {
  DB.del('session');
  State.currentUser = null;
  Object.values(State.widgetCharts).forEach(c => { try { c.destroy(); } catch {} });
  State.widgetCharts = {};
  if (State.reportChart) { try { State.reportChart.destroy(); } catch {} State.reportChart = null; }
  showLoginScreen();
}

function updateUserDisplay() {
  const u = State.currentUser;
  if (!u) return;
  document.getElementById('user-name-display').textContent = u.name;
  document.getElementById('user-email-display').textContent = u.email;
  document.getElementById('user-avatar').textContent = u.name.charAt(0).toUpperCase();
  document.getElementById('settings-name').value = u.name;
  document.getElementById('settings-email').value = u.email;
}

function loadUserData() {
  const userId = State.currentUser.id;
  State.dashboardTabs = DB.get(`tabs_${userId}`, [{ id: uid(), name: 'Overview' }, { id: uid(), name: 'Sales' }]);
  State.widgets = DB.get(`widgets_${userId}`, {});
  State.kpis = DB.get(`kpis_${userId}`, []);
  State.datasets = DB.get(`datasets_${userId}`, []);
  State.savedReports = DB.get(`reports_${userId}`, []);

  // Seed default KPIs if none
  if (State.kpis.length === 0) {
    loadDefaultKPIs();
  }
}

function saveUserData() {
  const userId = State.currentUser.id;
  DB.set(`tabs_${userId}`, State.dashboardTabs);
  DB.set(`widgets_${userId}`, State.widgets);
  DB.set(`kpis_${userId}`, State.kpis);
  DB.set(`datasets_${userId}`, State.datasets);
  DB.set(`reports_${userId}`, State.savedReports);
}

// ─── Default KPIs ─────────────────────────────────────────────────────────────

function loadDefaultKPIs() {
  State.kpis = [
    { id: uid(), name: 'Total Revenue', value: 1284500, unit: '$', target: 1500000, warn: 75, crit: 60, color: '#6366f1', trend: 12.4, aggregation: 'static', sparkData: genSparkData(1284500, 12) },
    { id: uid(), name: 'Monthly Orders', value: 8432, unit: '', target: 10000, warn: 80, crit: 60, color: '#10b981', trend: 8.2, aggregation: 'static', sparkData: genSparkData(8432, 12) },
    { id: uid(), name: 'Avg. Order Value', value: 152.40, unit: '$', target: 200, warn: 70, crit: 50, color: '#f59e0b', trend: -2.1, aggregation: 'static', sparkData: genSparkData(152, 12) },
    { id: uid(), name: 'Customer Sat. Score', value: 4.6, unit: '/5', target: 5, warn: 80, crit: 60, color: '#ec4899', trend: 3.8, aggregation: 'static', sparkData: genSparkData(4.6, 12) },
    { id: uid(), name: 'Net Profit Margin', value: 24.3, unit: '%', target: 30, warn: 70, crit: 50, color: '#3b82f6', trend: 1.9, aggregation: 'static', sparkData: genSparkData(24.3, 12) },
    { id: uid(), name: 'Active Users', value: 34280, unit: '', target: 40000, warn: 75, crit: 55, color: '#06b6d4', trend: 18.7, aggregation: 'static', sparkData: genSparkData(34280, 12) },
  ];
  saveUserData();
}

function genSparkData(base, n) {
  const vals = [];
  let cur = base * 0.7;
  for (let i = 0; i < n; i++) {
    cur = cur * (0.92 + Math.random() * 0.16);
    vals.push(+cur.toFixed(2));
  }
  vals.push(base);
  return vals;
}

// ─── App Init ─────────────────────────────────────────────────────────────────

function initApp() {
  renderDashboardTabs();
  renderDashboard();
  renderKPIs();
  renderDatasets();
  renderSavedReports();
  updateDatasetSelects();
  setupNotifBadge();
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.getElementById(`nav-${page}`);
  if (pageEl) pageEl.classList.remove('hidden');
  if (navEl) navEl.classList.add('active');

  State.currentPage = page;
  document.getElementById('page-title').textContent = {
    dashboard: 'Dashboard',
    kpi: 'KPI Monitor',
    import: 'Data Import',
    reports: 'Reports',
    settings: 'Settings',
  }[page] || page;

  // Show/hide Add Widget button in topbar
  document.getElementById('btn-add-widget').style.display = page === 'dashboard' ? 'flex' : 'none';

  lucide.createIcons();
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function renderDashboardTabs() {
  const container = document.getElementById('dashboard-tabs');
  container.innerHTML = '';
  State.dashboardTabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = `dash-tab${i === State.currentTab ? ' active' : ''}`;
    btn.innerHTML = `<span>${tab.name}</span><span class="dash-tab-close" data-close="${i}"><i data-lucide="x" style="width:10px;height:10px;"></i></span>`;
    btn.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) {
        if (State.dashboardTabs.length === 1) return;
        State.dashboardTabs.splice(i, 1);
        if (State.currentTab >= State.dashboardTabs.length) State.currentTab = State.dashboardTabs.length - 1;
        saveUserData();
        renderDashboardTabs();
        renderDashboard();
      } else {
        State.currentTab = i;
        renderDashboardTabs();
        renderDashboard();
      }
    });
    container.appendChild(btn);
  });
  lucide.createIcons();
}

function renderDashboard() {
  const grid = document.getElementById('widget-grid');
  const empty = document.getElementById('empty-dashboard');
  const tab = State.dashboardTabs[State.currentTab];
  if (!tab) return;

  const widgets = State.widgets[tab.id] || [];

  // Destroy old charts
  Object.keys(State.widgetCharts).forEach(wid => {
    if (!widgets.find(w => w.id === wid)) {
      try { State.widgetCharts[wid].destroy(); } catch {}
      delete State.widgetCharts[wid];
    }
  });

  grid.innerHTML = '';
  if (widgets.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  widgets.forEach(widget => {
    const card = createWidgetCard(widget);
    grid.appendChild(card);
  });
  lucide.createIcons();

  // Render charts after DOM is ready
  setTimeout(() => {
    widgets.forEach(widget => renderWidgetChart(widget));
  }, 50);
}

function createWidgetCard(widget) {
  const card = document.createElement('div');
  card.className = `widget-card size-${widget.size || 'md'}`;
  card.id = `widget-card-${widget.id}`;
  card.innerHTML = `
    <div class="widget-header">
      <span class="widget-title">${escHtml(widget.title)}</span>
      <div class="widget-actions">
        <button class="btn-icon" title="Edit" onclick="editWidget('${widget.id}')"><i data-lucide="settings-2"></i></button>
        <button class="btn-icon" title="Download PNG" onclick="exportWidgetPNG('${widget.id}')"><i data-lucide="download"></i></button>
        <button class="btn-icon" title="Remove" onclick="removeWidget('${widget.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
    <div class="widget-chart" id="widget-body-${widget.id}">
      ${widget.type === 'kpi' ? renderKPIWidgetHTML(widget) : `<canvas id="chart-${widget.id}" height="200"></canvas>`}
    </div>
  `;
  return card;
}

function renderKPIWidgetHTML(widget) {
  const val = widget.kpiValue || 0;
  const trend = widget.trend || 0;
  const up = trend >= 0;
  return `
    <div class="kpi-widget">
      <div class="kpi-value">${widget.unit || ''}${fmtNum(val)}</div>
      <div class="kpi-meta">
        <span class="kpi-trend ${up ? 'up' : 'down'}">
          <i data-lucide="${up ? 'trending-up' : 'trending-down'}"></i>
          ${up ? '+' : ''}${trend}%
        </span>
        <span class="kpi-subtitle">vs last period</span>
      </div>
    </div>
  `;
}

function renderWidgetChart(widget) {
  if (widget.type === 'kpi') return;

  const canvas = document.getElementById(`chart-${widget.id}`);
  if (!canvas) return;

  if (State.widgetCharts[widget.id]) {
    try { State.widgetCharts[widget.id].destroy(); } catch {}
  }

  const { labels, data } = getChartData(widget);
  const colors = getThemeColors('violet');

  const ctx = canvas.getContext('2d');
  const type = widget.type === 'area' ? 'line' : widget.type;
  const isRadial = ['pie', 'doughnut'].includes(type);

  const dataset = {
    label: widget.yAxis || 'Value',
    data,
    backgroundColor: isRadial ? colors : (type === 'line' ? 'transparent' : colors[0] + '99'),
    borderColor: isRadial ? colors : colors[0],
    borderWidth: 2,
    borderRadius: type === 'bar' ? 6 : 0,
    pointBackgroundColor: colors[0],
    pointRadius: 4,
    pointHoverRadius: 6,
    fill: widget.type === 'area',
    tension: 0.4,
  };

  if (widget.type === 'area') {
    dataset.backgroundColor = `${colors[0]}22`;
  }

  const config = {
    type,
    data: { labels, datasets: [dataset] },
    options: {
      ...CHART_DEFAULTS,
      responsive: true,
      maintainAspectRatio: true,
      plugins: { ...CHART_DEFAULTS.plugins },
      scales: isRadial ? {} : CHART_DEFAULTS.scales,
    },
  };

  State.widgetCharts[widget.id] = new Chart(ctx, config);
}

function getChartData(widget) {
  if (widget.datasetId && widget.datasetId !== 'demo') {
    const ds = State.datasets.find(d => d.id === widget.datasetId);
    if (ds && ds.rows.length > 0) {
      const xCol = widget.xAxis;
      const yCol = widget.yAxis;
      const slice = ds.rows.slice(0, 20);
      return {
        labels: slice.map(r => String(r[xCol] || '')),
        data: slice.map(r => +r[yCol] || 0),
      };
    }
  }
  // Demo data
  return {
    labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    data: Array.from({ length: 12 }, (_, i) => Math.round(20000 + i * 3500 + Math.random() * 8000)),
  };
}

function addWidget(config) {
  const tab = State.dashboardTabs[State.currentTab];
  if (!tab) return;
  if (!State.widgets[tab.id]) State.widgets[tab.id] = [];

  const widget = {
    id: uid(),
    title: config.title || 'New Widget',
    type: config.type || 'bar',
    size: config.size || 'md',
    datasetId: config.datasetId || 'demo',
    xAxis: config.xAxis || null,
    yAxis: config.yAxis || null,
    kpiValue: config.kpiValue || 0,
    trend: config.trend || (Math.random() * 20 - 5).toFixed(1),
    unit: config.unit || '',
    createdAt: new Date().toISOString(),
  };
  State.widgets[tab.id].push(widget);
  saveUserData();
  renderDashboard();
  toast('Widget added!', 'success');
}

function removeWidget(widgetId) {
  const tab = State.dashboardTabs[State.currentTab];
  if (!tab) return;
  const arr = State.widgets[tab.id] || [];
  const idx = arr.findIndex(w => w.id === widgetId);
  if (idx !== -1) {
    arr.splice(idx, 1);
    State.widgets[tab.id] = arr;
    if (State.widgetCharts[widgetId]) {
      try { State.widgetCharts[widgetId].destroy(); } catch {}
      delete State.widgetCharts[widgetId];
    }
    saveUserData();
    renderDashboard();
    toast('Widget removed', 'info');
  }
}

function editWidget(widgetId) {
  const tab = State.dashboardTabs[State.currentTab];
  const widget = (State.widgets[tab?.id] || []).find(w => w.id === widgetId);
  if (!widget) return;
  // Simply populate and open the modal in edit mode
  document.getElementById('widget-title').value = widget.title;
  setActiveBtn('#widget-chart-types .chart-type-btn', widget.type);
  State.widgetChartType = widget.type;
  State.widgetSize = widget.size;
  setActiveBtn('.size-btn', widget.size);
  openModal('modal-add-widget');
  // Store edit id
  document.getElementById('btn-confirm-widget').dataset.editId = widgetId;
}

function exportWidgetPNG(widgetId) {
  const card = document.getElementById(`widget-card-${widgetId}`);
  if (!card) return;
  html2canvas(card, { backgroundColor: '#13152a', scale: 2 }).then(canvas => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `widget-${widgetId}.png`;
    a.click();
    toast('Widget exported as PNG', 'success');
  });
}

// ─── KPI Monitor ─────────────────────────────────────────────────────────────

function renderKPIs() {
  const grid = document.getElementById('kpi-grid');
  const trendArea = document.getElementById('kpi-trend-charts');
  grid.innerHTML = '';
  trendArea.innerHTML = '';

  State.kpis.forEach(kpi => {
    grid.appendChild(createKPICard(kpi));
    trendArea.appendChild(createKPITrendCard(kpi));
  });
  lucide.createIcons();
  setTimeout(() => State.kpis.forEach(kpi => renderSparkline(kpi)), 50);
}

function createKPICard(kpi) {
  const pct = kpi.target ? Math.min(100, (kpi.value / kpi.target) * 100) : 80;
  const status = pct >= kpi.warn ? 'success' : pct >= kpi.crit ? 'warning' : 'danger';
  const statusColor = { success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' }[status];
  const up = kpi.trend >= 0;

  const card = document.createElement('div');
  card.className = 'kpi-card';
  card.style.setProperty('--kpi-color', kpi.color);
  card.id = `kpi-card-${kpi.id}`;
  card.innerHTML = `
    <div class="kpi-actions">
      <button class="btn-icon" title="Edit" onclick="editKPI('${kpi.id}')"><i data-lucide="edit-2"></i></button>
      <button class="btn-icon" title="Remove" onclick="removeKPI('${kpi.id}')"><i data-lucide="trash-2"></i></button>
    </div>
    <div class="kpi-card-header">
      <span class="kpi-card-label">${escHtml(kpi.name)}</span>
      <div class="kpi-card-icon"><i data-lucide="trending-up"></i></div>
    </div>
    <div class="kpi-card-value">${kpi.unit}${fmtNum(kpi.value)}</div>
    <div class="kpi-card-footer">
      <span class="kpi-trend ${up ? 'up' : 'down'}">
        <i data-lucide="${up ? 'arrow-up' : 'arrow-down'}"></i>
        ${up ? '+' : ''}${kpi.trend}%
      </span>
      ${kpi.target ? `<span style="font-size:0.75rem;color:var(--text-muted);">Target: ${kpi.unit}${fmtNum(kpi.target)}</span>` : ''}
    </div>
    <div class="kpi-progress-bar">
      <div class="kpi-progress-fill" style="width:${pct}%;background:${statusColor};"></div>
    </div>
    <div class="kpi-sparkline" id="sparkline-${kpi.id}"></div>
  `;
  return card;
}

function createKPITrendCard(kpi) {
  const card = document.createElement('div');
  card.className = 'kpi-trend-card';
  card.innerHTML = `
    <div class="kpi-trend-title">${escHtml(kpi.name)} — Trend</div>
    <canvas id="trend-chart-${kpi.id}" height="120"></canvas>
  `;
  setTimeout(() => {
    const canvas = document.getElementById(`trend-chart-${kpi.id}`);
    if (!canvas) return;
    const colors = [kpi.color];
    new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Now'],
        datasets: [{
          data: kpi.sparkData || genSparkData(kpi.value, 12),
          borderColor: kpi.color,
          backgroundColor: kpi.color + '18',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: kpi.color,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 1000 },
        plugins: { legend: { display: false }, tooltip: CHART_DEFAULTS.plugins.tooltip },
        scales: CHART_DEFAULTS.scales,
      },
    });
  }, 100);
  return card;
}

function renderSparkline(kpi) {
  const el = document.getElementById(`sparkline-${kpi.id}`);
  if (!el) return;
  const data = kpi.sparkData || genSparkData(kpi.value, 12);
  const W = el.offsetWidth || 200, H = 36;
  const margin = { top: 2, right: 2, bottom: 2, left: 2 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain([0, data.length - 1]).range([0, w]);
  const y = d3.scaleLinear().domain([d3.min(data) * 0.9, d3.max(data) * 1.05]).range([h, 0]);
  const line = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveCatmullRom);
  const area = d3.area().x((d, i) => x(i)).y0(h).y1(d => y(d)).curve(d3.curveCatmullRom);

  el.innerHTML = '';
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const gradId = `sg-${kpi.id}`;
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', gradId).attr('x1','0').attr('y1','0').attr('x2','0').attr('y2','1');
  grad.append('stop').attr('offset','0%').attr('stop-color', kpi.color).attr('stop-opacity', 0.3);
  grad.append('stop').attr('offset','100%').attr('stop-color', kpi.color).attr('stop-opacity', 0);

  g.append('path').datum(data).attr('d', area).attr('fill', `url(#${gradId})`);
  g.append('path').datum(data).attr('d', line).attr('fill', 'none').attr('stroke', kpi.color).attr('stroke-width', 2);
}

function removeKPI(kpiId) {
  State.kpis = State.kpis.filter(k => k.id !== kpiId);
  saveUserData();
  renderKPIs();
  toast('KPI removed', 'info');
}

function editKPI(kpiId) {
  const kpi = State.kpis.find(k => k.id === kpiId);
  if (!kpi) return;
  document.getElementById('kpi-name').value = kpi.name;
  document.getElementById('kpi-target').value = kpi.target || '';
  document.getElementById('kpi-warn').value = kpi.warn || 80;
  document.getElementById('kpi-crit').value = kpi.crit || 60;
  document.getElementById('kpi-unit').value = kpi.unit || '';
  document.getElementById('kpi-aggregation').value = kpi.aggregation || 'sum';
  State.kpiColor = kpi.color;
  document.querySelectorAll('.color-dot').forEach(b => {
    b.classList.toggle('active', b.dataset.color === kpi.color);
  });
  openModal('modal-add-kpi');
  document.getElementById('btn-confirm-kpi').dataset.editId = kpiId;
}

function computeKPIValue(kpi) {
  if (kpi.aggregation === 'static') return kpi.value;
  const ds = State.datasets.find(d => d.id === kpi.datasetId);
  if (!ds || !kpi.valueCol) return 0;
  const vals = ds.rows.map(r => +r[kpi.valueCol]).filter(v => !isNaN(v));
  if (!vals.length) return 0;
  const agg = kpi.aggregation;
  if (agg === 'sum') return vals.reduce((a, b) => a + b, 0);
  if (agg === 'avg') return vals.reduce((a, b) => a + b, 0) / vals.length;
  if (agg === 'max') return Math.max(...vals);
  if (agg === 'min') return Math.min(...vals);
  if (agg === 'count') return vals.length;
  if (agg === 'last') return vals[vals.length - 1];
  return 0;
}

// ─── Data Import ──────────────────────────────────────────────────────────────

let _pendingImportData = null;

function renderDatasets() {
  const list = document.getElementById('datasets-list');
  const count = document.getElementById('dataset-count');
  list.innerHTML = '';
  count.textContent = `${State.datasets.length} dataset${State.datasets.length !== 1 ? 's' : ''}`;

  if (State.datasets.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="database"></i></div><h3>No datasets yet</h3><p>Import data from a file, API, or use sample data</p></div>`;
    lucide.createIcons();
    return;
  }

  State.datasets.forEach(ds => {
    const card = document.createElement('div');
    card.className = 'dataset-card';
    card.innerHTML = `
      <div class="dataset-card-header">
        <div>
          <div class="dataset-name">${escHtml(ds.name)}</div>
          <div class="dataset-meta">${ds.rows.length} rows · ${ds.cols.length} columns · ${ds.source}</div>
        </div>
        <div style="display:flex;gap:4px;">
          <button class="btn-icon" title="Preview" onclick="previewDataset('${ds.id}')"><i data-lucide="eye"></i></button>
          <button class="btn-icon" title="Download CSV" onclick="downloadDatasetCSV('${ds.id}')"><i data-lucide="download"></i></button>
          <button class="btn-icon" title="Delete" onclick="deleteDataset('${ds.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="dataset-tags">
        ${ds.cols.slice(0, 5).map(c => `<span class="dataset-tag">${escHtml(c)}</span>`).join('')}
        ${ds.cols.length > 5 ? `<span class="dataset-tag">+${ds.cols.length - 5}</span>` : ''}
      </div>
      <div class="dataset-footer">
        <span style="font-size:0.75rem;color:var(--text-muted);">Imported ${formatDate(ds.importedAt)}</span>
        <button class="btn btn-ghost sm" onclick="useDatasetInDashboard('${ds.id}')">
          <i data-lucide="plus"></i> Use in Dashboard
        </button>
      </div>
    `;
    list.appendChild(card);
  });
  lucide.createIcons();
}

function showImportPreview(rows, name) {
  if (!rows || rows.length === 0) { toast('No data found', 'error'); return; }
  _pendingImportData = rows;
  const cols = Object.keys(rows[0]);
  const preview = document.getElementById('import-preview');
  preview.classList.remove('hidden');
  document.getElementById('preview-title').textContent = 'Data Preview';
  document.getElementById('preview-meta').textContent = `${rows.length} rows × ${cols.length} columns`;
  document.getElementById('import-dataset-name').value = name || 'My Dataset';

  const tableWrap = document.getElementById('preview-table-wrap');
  const previewRows = rows.slice(0, 50);
  const isNumeric = col => previewRows.every(r => !isNaN(+r[col]) && r[col] !== '');

  tableWrap.innerHTML = `
    <table>
      <thead><tr>${cols.map(c => `<th>${escHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>${previewRows.map(row =>
        `<tr>${cols.map(c => `<td class="${isNumeric(c) ? 'numeric' : ''}">${escHtml(String(row[c] ?? ''))}</td>`).join('')}</tr>`
      ).join('')}</tbody>
    </table>
  `;
}

function confirmImport() {
  if (!_pendingImportData) return;
  const name = document.getElementById('import-dataset-name').value.trim() || 'Dataset';
  const cols = Object.keys(_pendingImportData[0]);
  const ds = {
    id: uid(),
    name,
    rows: _pendingImportData,
    cols,
    source: State._importSource || 'File',
    importedAt: new Date().toISOString(),
  };
  State.datasets.push(ds);
  saveUserData();
  _pendingImportData = null;
  document.getElementById('import-preview').classList.add('hidden');
  renderDatasets();
  updateDatasetSelects();
  toast(`Dataset "${name}" imported (${ds.rows.length} rows)`, 'success');
}

function deleteDataset(dsId) {
  State.datasets = State.datasets.filter(d => d.id !== dsId);
  saveUserData();
  renderDatasets();
  updateDatasetSelects();
  toast('Dataset deleted', 'info');
}

function previewDataset(dsId) {
  const ds = State.datasets.find(d => d.id === dsId);
  if (!ds) return;
  showImportPreview(ds.rows, ds.name);
  document.getElementById('btn-confirm-import').style.display = 'none';
  document.getElementById('import-dataset-name').disabled = true;
}

function downloadDatasetCSV(dsId) {
  const ds = State.datasets.find(d => d.id === dsId);
  if (!ds) return;
  const csv = Papa.unparse(ds.rows);
  downloadFile(csv, `${ds.name.replace(/\s+/g, '_')}.csv`, 'text/csv');
  toast('CSV downloaded', 'success');
}

function useDatasetInDashboard(dsId) {
  navigateTo('dashboard');
  setTimeout(() => {
    const ds = State.datasets.find(d => d.id === dsId);
    if (!ds) return;
    document.getElementById('widget-dataset').value = dsId;
    populateAxisSelects('widget', dsId);
    openModal('modal-add-widget');
  }, 100);
}

function loadSampleDataset(name) {
  const sample = SAMPLE_DATASETS[name];
  if (!sample) return;
  // Re-generate for fresh randomness
  const freshSample = SAMPLE_DATASETS[name];
  showImportPreview(freshSample.rows, freshSample.name);
  State._importSource = 'Sample';
  document.getElementById('btn-confirm-import').style.display = '';
  document.getElementById('import-dataset-name').disabled = false;
  document.getElementById('import-preview').classList.remove('hidden');
  toast('Sample data loaded — review and confirm import', 'info');
}

// ─── API Import ───────────────────────────────────────────────────────────────

async function fetchAPIData() {
  const url = document.getElementById('api-url').value.trim();
  const method = document.getElementById('api-method').value;
  const headersTxt = document.getElementById('api-headers').value.trim();
  const path = document.getElementById('api-path').value.trim();
  const name = document.getElementById('api-dataset-name').value.trim() || 'API Dataset';

  if (!url) { toast('Please enter an endpoint URL', 'error'); return; }

  let headers = {};
  if (headersTxt) {
    try { headers = JSON.parse(headersTxt); }
    catch { toast('Invalid JSON in headers', 'error'); return; }
  }

  toast('Fetching data...', 'info');
  try {
    const res = await fetch(url, { method, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let json = await res.json();

    if (path) {
      for (const key of path.split('.')) json = json[key];
    }
    if (!Array.isArray(json)) json = [json];
    State._importSource = 'REST API';
    showImportPreview(json, name);
    document.getElementById('btn-confirm-import').style.display = '';
    document.getElementById('import-dataset-name').disabled = false;
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
  }
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function renderSavedReports() {
  const list = document.getElementById('saved-reports-list');
  list.innerHTML = '';
  if (!State.savedReports.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem;">No saved reports yet. Generate one above!</p>';
    return;
  }
  State.savedReports.forEach(r => {
    const card = document.createElement('div');
    card.className = 'saved-report-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
        <strong style="font-size:0.9375rem;">${escHtml(r.name)}</strong>
        <button class="btn-icon" title="Delete" onclick="deleteSavedReport('${r.id}')"><i data-lucide="trash-2"></i></button>
      </div>
      <p style="font-size:0.8125rem;color:var(--text-muted);">Dataset: ${escHtml(r.datasetName || 'N/A')} · ${r.chartType} chart · ${formatDate(r.createdAt)}</p>
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
        <button class="btn btn-ghost sm" onclick="loadSavedReport('${r.id}')"><i data-lucide="eye"></i> View</button>
      </div>
    `;
    list.appendChild(card);
  });
  lucide.createIcons();
}

function deleteSavedReport(id) {
  State.savedReports = State.savedReports.filter(r => r.id !== id);
  saveUserData();
  renderSavedReports();
}

function loadSavedReport(id) {
  const r = State.savedReports.find(rep => rep.id === id);
  if (!r) return;
  generateReport({
    name: r.name,
    datasetId: r.datasetId,
    chartType: r.chartType,
    xAxis: r.xAxis,
    yAxis: r.yAxis,
    theme: r.theme,
  });
}

function generateReport(config) {
  const { datasetId, chartType, xAxis, yAxis, theme, name } = config;

  if (!datasetId) { toast('Please select a dataset', 'error'); return; }

  const ds = State.datasets.find(d => d.id === datasetId);
  if (!ds) { toast('Dataset not found', 'error'); return; }

  const labels = ds.rows.slice(0, 30).map(r => String(r[xAxis] || ''));
  const data = ds.rows.slice(0, 30).map(r => +r[yAxis] || 0);
  const colors = getThemeColors(theme || 'violet');

  const container = document.getElementById('report-chart-container');
  container.innerHTML = '<canvas id="report-main-chart"></canvas>';

  if (State.reportChart) { try { State.reportChart.destroy(); } catch {} }

  const type = chartType === 'area' ? 'line' : chartType;
  const isRadial = ['pie', 'doughnut'].includes(type);

  const dataset = {
    label: yAxis || 'Value',
    data,
    backgroundColor: isRadial ? colors : colors[0] + '88',
    borderColor: isRadial ? colors : colors[0],
    borderWidth: 2,
    borderRadius: type === 'bar' ? 8 : 0,
    fill: chartType === 'area',
    tension: 0.4,
    pointRadius: 4,
    pointBackgroundColor: colors[0],
  };
  if (chartType === 'area') dataset.backgroundColor = colors[0] + '22';

  State.reportChart = new Chart(document.getElementById('report-main-chart').getContext('2d'), {
    type,
    data: { labels, datasets: [dataset] },
    options: {
      ...CHART_DEFAULTS,
      responsive: true,
      maintainAspectRatio: false,
      plugins: { ...CHART_DEFAULTS.plugins, title: { display: !!name, text: name, color: '#e2e8f0', font: { size: 16, family: 'Inter', weight: '600' } } },
      scales: isRadial ? {} : CHART_DEFAULTS.scales,
    },
  });

  document.getElementById('export-actions').style.display = 'flex';

  // Show data table
  const tableDiv = document.getElementById('report-data-table');
  tableDiv.classList.remove('hidden');
  tableDiv.innerHTML = `
    <div style="margin-top:1.5rem;overflow-x:auto;max-height:200px;">
      <table>
        <thead><tr><th>${escHtml(xAxis)}</th><th>${escHtml(yAxis)}</th></tr></thead>
        <tbody>${ds.rows.slice(0, 30).map(r => `<tr><td>${escHtml(String(r[xAxis] || ''))}</td><td class="numeric">${escHtml(String(r[yAxis] || ''))}</td></tr>`).join('')}</tbody>
      </table>
    </div>
  `;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

function exportReportPNG() {
  const container = document.getElementById('report-chart-container');
  html2canvas(container, { backgroundColor: '#0d0f1a', scale: 2 }).then(canvas => {
    const name = document.getElementById('report-name').value || 'report';
    downloadFile(canvas.toDataURL('image/png'), `${name}.png`);
    toast('Chart exported as PNG', 'success');
  });
}

function exportReportPDF() {
  const name = document.getElementById('report-name').value || 'report';
  const container = document.getElementById('report-chart-container');
  html2canvas(container, { backgroundColor: '#0d0f1a', scale: 2 }).then(canvas => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(13, 15, 26);
    pdf.rect(0, 0, W, H, 'F');
    const imgRatio = canvas.width / canvas.height;
    const pdfW = W - 40;
    const pdfH = pdfW / imgRatio;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 20, 40, pdfW, pdfH);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.text(name, 20, 25);
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated by BIFlow · ${new Date().toLocaleDateString()}`, 20, H - 15);
    pdf.save(`${name}.pdf`);
    toast('PDF exported!', 'success');
  });
}

function exportReportCSV() {
  const dsId = document.getElementById('report-dataset').value;
  const ds = State.datasets.find(d => d.id === dsId);
  if (!ds) { toast('No dataset selected', 'error'); return; }
  const csv = Papa.unparse(ds.rows);
  const name = document.getElementById('report-name').value || 'report';
  downloadFile(csv, `${name}.csv`, 'text/csv');
  toast('CSV downloaded', 'success');
}

function exportReportXLSX() {
  const dsId = document.getElementById('report-dataset').value;
  const ds = State.datasets.find(d => d.id === dsId);
  if (!ds) { toast('No dataset selected', 'error'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(ds.rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const name = document.getElementById('report-name').value || 'report';
  XLSX.writeFile(wb, `${name}.xlsx`);
  toast('Excel file downloaded', 'success');
}

// ─── Dataset Selects Update ────────────────────────────────────────────────────

function updateDatasetSelects() {
  const selects = ['widget-dataset', 'kpi-dataset', 'report-dataset'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    const opts = sel.id === 'widget-dataset'
      ? `<option value="">— Select dataset —</option><option value="demo">Demo: Sales Data</option>`
      : `<option value="">— Select dataset —</option>`;
    sel.innerHTML = opts + State.datasets.map(ds => `<option value="${ds.id}">${escHtml(ds.name)}</option>`).join('');
    if (cur) sel.value = cur;
  });
}

function populateAxisSelects(prefix, datasetId) {
  const xSel = document.getElementById(`${prefix}-x-axis`);
  const ySel = document.getElementById(`${prefix}-y-axis`);
  if (!xSel || !ySel) return;

  let cols = [];
  if (datasetId === 'demo') {
    cols = ['month', 'revenue', 'orders', 'aov', 'returns', 'region'];
  } else {
    const ds = State.datasets.find(d => d.id === datasetId);
    cols = ds ? ds.cols : [];
  }

  const opts = cols.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  xSel.innerHTML = `<option value="">— Select —</option>${opts}`;
  ySel.innerHTML = `<option value="">— Select —</option>${opts}`;

  // Auto-select first text col for X, first numeric col for Y
  const ds = datasetId === 'demo'
    ? { rows: [{ month: 'Jan', revenue: 1, orders: 1 }] }
    : State.datasets.find(d => d.id === datasetId);

  if (ds && ds.rows[0]) {
    const r = ds.rows[0];
    const textCols = cols.filter(c => isNaN(+r[c]));
    const numCols = cols.filter(c => !isNaN(+r[c]) && r[c] !== '');
    if (textCols[0]) xSel.value = textCols[0];
    if (numCols[0]) ySel.value = numCols[0];
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

function setupNotifBadge() {
  const alerts = State.kpis.filter(kpi => {
    if (!kpi.target) return false;
    const pct = (kpi.value / kpi.target) * 100;
    return pct < kpi.warn;
  });
  const badge = document.getElementById('notif-badge');
  badge.textContent = alerts.length || '';
  badge.style.display = alerts.length ? 'flex' : 'none';
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  lucide.createIcons();
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function setActiveBtn(selector, value) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === value || btn.dataset.size === value);
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtNum(n) {
  const num = +n;
  if (isNaN(num)) return n;
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function downloadFile(content, filename, type = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: 'check-circle', error: 'alert-circle', info: 'info', warning: 'alert-triangle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}"></i>
    <span class="toast-text">${escHtml(message)}</span>
    <button class="toast-close btn-icon" onclick="this.closest('.toast').remove()"><i data-lucide="x"></i></button>
  `;
  container.appendChild(el);
  lucide.createIcons();
  setTimeout(() => {
    el.classList.add('leaving');
    el.addEventListener('animationend', () => el.remove());
  }, 4000);
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Init Lucide icons
  lucide.createIcons();

  // Auth
  initAuth();

  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('login-form').classList.toggle('hidden', target !== 'login');
      document.getElementById('register-form').classList.toggle('hidden', target !== 'register');
    });
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const users = DB.get('users', []);
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      document.getElementById('login-error').classList.add('hidden');
      loginSuccess(user);
    } else {
      const err = document.getElementById('login-error');
      err.textContent = 'Invalid email or password';
      err.classList.remove('hidden');
    }
  });

  // Register form
  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const users = DB.get('users', []);
    if (users.find(u => u.email === email)) {
      document.getElementById('register-error').textContent = 'Email already registered';
      document.getElementById('register-error').classList.remove('hidden');
      return;
    }
    const user = { id: uid(), name, email, password: pass, createdAt: new Date().toISOString() };
    users.push(user);
    DB.set('users', users);
    document.getElementById('register-error').classList.add('hidden');
    loginSuccess(user);
    toast(`Welcome, ${name}!`, 'success');
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    logout();
    lucide.createIcons();
  });

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('main-content');
    sidebar.classList.toggle('collapsed');
    content.classList.toggle('sidebar-collapsed');
    lucide.createIcons();
  });

  // Mobile menu
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
  });

  // Topbar Add Widget
  document.getElementById('btn-add-widget').addEventListener('click', () => openModal('modal-add-widget'));

  // Dashboard: Add tab
  document.getElementById('btn-add-tab').addEventListener('click', () => {
    const name = prompt('Tab name:', `Tab ${State.dashboardTabs.length + 1}`);
    if (name) {
      State.dashboardTabs.push({ id: uid(), name });
      State.currentTab = State.dashboardTabs.length - 1;
      saveUserData();
      renderDashboardTabs();
      renderDashboard();
    }
  });

  // Dashboard: Save layout
  document.getElementById('btn-save-layout').addEventListener('click', () => {
    saveUserData();
    toast('Dashboard saved!', 'success');
  });

  // Dashboard: Add widget (dashboard page button)
  document.getElementById('btn-add-widget-dash').addEventListener('click', () => openModal('modal-add-widget'));
  document.getElementById('btn-first-widget').addEventListener('click', () => openModal('modal-add-widget'));

  // KPI period selector
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Update sparkline scale (re-render with same data — in real app would refetch)
      renderKPIs();
    });
  });

  // Add KPI button
  document.getElementById('btn-add-kpi').addEventListener('click', () => {
    document.getElementById('btn-confirm-kpi').dataset.editId = '';
    document.getElementById('kpi-name').value = '';
    document.getElementById('kpi-target').value = '';
    document.getElementById('kpi-unit').value = '';
    updateDatasetSelects();
    openModal('modal-add-kpi');
  });

  // KPI dataset select
  document.getElementById('kpi-dataset').addEventListener('change', (e) => {
    populateAxisSelects('kpi', e.target.value);
    // Rename y-axis select to value col
    const ySel = document.getElementById('kpi-y-axis');
    if (ySel) document.getElementById('kpi-value-col').innerHTML = ySel.innerHTML;
  });

  document.getElementById('kpi-dataset').addEventListener('change', (e) => {
    const dsId = e.target.value;
    const ds = State.datasets.find(d => d.id === dsId);
    if (!ds) { document.getElementById('kpi-value-col').innerHTML = '<option>— Select —</option>'; return; }
    document.getElementById('kpi-value-col').innerHTML = ds.cols.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  });

  // KPI color dots
  document.querySelectorAll('#modal-add-kpi .color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('#modal-add-kpi .color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      State.kpiColor = dot.dataset.color;
    });
  });

  // Confirm KPI
  document.getElementById('btn-confirm-kpi').addEventListener('click', () => {
    const name = document.getElementById('kpi-name').value.trim();
    if (!name) { toast('Please enter a KPI name', 'error'); return; }

    const editId = document.getElementById('btn-confirm-kpi').dataset.editId;
    const dsId = document.getElementById('kpi-dataset').value;
    const valueCol = document.getElementById('kpi-value-col').value;
    const agg = document.getElementById('kpi-aggregation').value;
    const unit = document.getElementById('kpi-unit').value;
    const target = +document.getElementById('kpi-target').value || 0;
    const warn = +document.getElementById('kpi-warn').value || 80;
    const crit = +document.getElementById('kpi-crit').value || 60;

    let computedVal = 0;
    if (dsId && valueCol) {
      const tmpKpi = { datasetId: dsId, valueCol, aggregation: agg };
      computedVal = computeKPIValue(tmpKpi);
    } else {
      computedVal = target * 0.85 || 1000;
    }

    const kpiData = {
      name, unit, target, warn, crit,
      color: State.kpiColor,
      aggregation: dsId ? agg : 'static',
      datasetId: dsId || null,
      valueCol: valueCol || null,
      value: computedVal,
      trend: +(Math.random() * 20 - 5).toFixed(1),
      sparkData: genSparkData(computedVal, 12),
    };

    if (editId) {
      const idx = State.kpis.findIndex(k => k.id === editId);
      if (idx !== -1) State.kpis[idx] = { ...State.kpis[idx], ...kpiData };
    } else {
      State.kpis.push({ id: uid(), ...kpiData });
    }

    saveUserData();
    renderKPIs();
    closeModal('modal-add-kpi');
    setupNotifBadge();
    toast(`KPI "${name}" ${editId ? 'updated' : 'added'}!`, 'success');
  });

  // Widget chart type buttons
  document.querySelectorAll('#widget-chart-types .chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#widget-chart-types .chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.widgetChartType = btn.dataset.type;
      const axisRow = document.getElementById('widget-axis-row');
      axisRow.style.display = btn.dataset.type === 'kpi' ? 'none' : '';
    });
  });

  // Widget size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.widgetSize = btn.dataset.size;
    });
  });

  // Widget dataset select
  document.getElementById('widget-dataset').addEventListener('change', (e) => {
    populateAxisSelects('widget', e.target.value);
  });

  // Confirm Widget
  document.getElementById('btn-confirm-widget').addEventListener('click', () => {
    const title = document.getElementById('widget-title').value.trim() || 'New Widget';
    const type = State.widgetChartType;
    const size = State.widgetSize;
    const dsId = document.getElementById('widget-dataset').value;
    const xAxis = document.getElementById('widget-x-axis').value;
    const yAxis = document.getElementById('widget-y-axis').value;
    const editId = document.getElementById('btn-confirm-widget').dataset.editId;

    if (editId) {
      const tab = State.dashboardTabs[State.currentTab];
      const widgets = State.widgets[tab?.id] || [];
      const idx = widgets.findIndex(w => w.id === editId);
      if (idx !== -1) {
        widgets[idx] = { ...widgets[idx], title, type, size, datasetId: dsId, xAxis, yAxis };
        State.widgets[tab.id] = widgets;
        saveUserData();
        renderDashboard();
        closeModal('modal-add-widget');
        document.getElementById('btn-confirm-widget').dataset.editId = '';
        toast('Widget updated!', 'success');
        return;
      }
    }

    addWidget({ title, type, size, datasetId: dsId, xAxis, yAxis });
    closeModal('modal-add-widget');
    document.getElementById('btn-confirm-widget').dataset.editId = '';
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modal;
      if (id) closeModal(id);
    });
  });

  // Click outside modal to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Import source tabs
  document.querySelectorAll('.source-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.source-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const src = card.dataset.source;
      document.querySelectorAll('.import-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`panel-${src}`).classList.remove('hidden');
      document.getElementById('import-preview').classList.add('hidden');
      _pendingImportData = null;
      State._importSource = src;
    });
  });

  // File drop zone
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', () => fileInput.click());
  document.getElementById('btn-browse-file').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    State._importSource = 'File Upload';
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          showImportPreview(result.data, file.name.replace(/\.\w+$/, ''));
          document.getElementById('btn-confirm-import').style.display = '';
          document.getElementById('import-dataset-name').disabled = false;
        },
        error: (e) => toast(`Parse error: ${e.message}`, 'error'),
      });
    } else if (['xls', 'xlsx'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        showImportPreview(data, file.name.replace(/\.\w+$/, ''));
        document.getElementById('btn-confirm-import').style.display = '';
        document.getElementById('import-dataset-name').disabled = false;
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast('Unsupported file type. Use CSV or Excel.', 'error');
    }
  }

  // Confirm / Cancel import
  document.getElementById('btn-confirm-import').addEventListener('click', confirmImport);
  document.getElementById('btn-cancel-import').addEventListener('click', () => {
    document.getElementById('import-preview').classList.add('hidden');
    _pendingImportData = null;
  });

  // JSON import
  document.getElementById('btn-import-json').addEventListener('click', () => {
    const txt = document.getElementById('json-data').value.trim();
    const name = document.getElementById('json-dataset-name').value.trim() || 'JSON Dataset';
    try {
      const data = JSON.parse(txt);
      const rows = Array.isArray(data) ? data : [data];
      State._importSource = 'JSON Entry';
      showImportPreview(rows, name);
      document.getElementById('btn-confirm-import').style.display = '';
      document.getElementById('import-dataset-name').disabled = false;
    } catch {
      toast('Invalid JSON', 'error');
    }
  });

  // API fetch
  document.getElementById('btn-fetch-api').addEventListener('click', fetchAPIData);

  // Sample data
  document.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sample = btn.dataset.sample;
      if (['sales', 'traffic', 'finance', 'product'].includes(sample)) {
        loadSampleDataset(sample);
      }
    });
  });

  // Reports page
  document.getElementById('report-dataset').addEventListener('change', (e) => {
    const dsId = e.target.value;
    populateAxisSelects('report', dsId);
  });

  // Report chart type
  document.querySelectorAll('#report-chart-types .chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#report-chart-types .chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.reportChartType = btn.dataset.type;
    });
  });

  // Report color theme
  document.querySelectorAll('#report-color-themes .color-theme').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#report-color-themes .color-theme').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.reportColorTheme = btn.dataset.theme;
    });
  });

  // Generate report
  document.getElementById('btn-generate-report').addEventListener('click', () => {
    const name = document.getElementById('report-name').value.trim();
    const dsId = document.getElementById('report-dataset').value;
    const xAxis = document.getElementById('report-x-axis').value;
    const yAxis = document.getElementById('report-y-axis').value;

    if (!dsId) { toast('Select a dataset first', 'error'); return; }
    if (!xAxis || !yAxis) { toast('Select X and Y axes', 'error'); return; }

    generateReport({ name, datasetId: dsId, chartType: State.reportChartType, xAxis, yAxis, theme: State.reportColorTheme });

    // Save report
    const ds = State.datasets.find(d => d.id === dsId);
    const savedReport = {
      id: uid(),
      name: name || 'Untitled Report',
      datasetId: dsId,
      datasetName: ds?.name,
      chartType: State.reportChartType,
      xAxis, yAxis,
      theme: State.reportColorTheme,
      createdAt: new Date().toISOString(),
    };
    State.savedReports.unshift(savedReport);
    if (State.savedReports.length > 20) State.savedReports = State.savedReports.slice(0, 20);
    saveUserData();
    renderSavedReports();
    toast('Report generated!', 'success');
  });

  // Export buttons
  document.getElementById('btn-export-png').addEventListener('click', exportReportPNG);
  document.getElementById('btn-export-pdf').addEventListener('click', exportReportPDF);
  document.getElementById('btn-export-csv').addEventListener('click', exportReportCSV);
  document.getElementById('btn-export-xlsx').addEventListener('click', exportReportXLSX);

  // New report
  document.getElementById('btn-new-report').addEventListener('click', () => {
    document.getElementById('report-name').value = '';
    document.getElementById('report-dataset').value = '';
    document.getElementById('report-chart-container').innerHTML = `<div class="chart-placeholder"><i data-lucide="bar-chart-2"></i><p>Configure and generate your report</p></div>`;
    document.getElementById('report-data-table').classList.add('hidden');
    document.getElementById('export-actions').style.display = 'none';
    if (State.reportChart) { try { State.reportChart.destroy(); } catch {} State.reportChart = null; }
    lucide.createIcons();
  });

  // Settings
  document.getElementById('btn-save-profile').addEventListener('click', () => {
    const name = document.getElementById('settings-name').value.trim();
    const email = document.getElementById('settings-email').value.trim();
    if (!name || !email) { toast('Fill in all fields', 'error'); return; }
    const users = DB.get('users', []);
    const idx = users.findIndex(u => u.id === State.currentUser.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], name, email };
      DB.set('users', users);
      State.currentUser = users[idx];
      updateUserDisplay();
      toast('Profile saved!', 'success');
    }
  });

  document.getElementById('btn-save-appearance').addEventListener('click', () => {
    toast('Appearance settings applied', 'success');
  });

  // Accent colors
  document.querySelectorAll('.accent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const colorMap = {
        violet: ['hsl(239, 84%, 67%)', 'hsl(252, 83%, 58%)'],
        blue:   ['hsl(217, 91%, 60%)', 'hsl(199, 89%, 48%)'],
        teal:   ['hsl(174, 84%, 40%)', 'hsl(180, 84%, 35%)'],
        rose:   ['hsl(351, 89%, 60%)', 'hsl(330, 81%, 52%)'],
        amber:  ['hsl(43, 96%, 56%)', 'hsl(32, 95%, 44%)'],
      };
      const [a, b] = colorMap[btn.dataset.color] || colorMap.violet;
      document.documentElement.style.setProperty('--accent', a);
      document.documentElement.style.setProperty('--accent-dark', b);
      document.documentElement.style.setProperty('--accent-light', a.replace('hsl', 'hsla').replace(')', ', 0.15)'));
      document.documentElement.style.setProperty('--accent-glow', a.replace('hsl', 'hsla').replace(')', ', 0.35)'));
      toast('Accent color changed', 'success');
    });
  });

  // Clear all data
  document.getElementById('btn-clear-all-data').addEventListener('click', () => {
    if (confirm('Delete ALL data? This cannot be undone.')) {
      const userId = State.currentUser.id;
      ['tabs','widgets','kpis','datasets','reports'].forEach(k => DB.del(`${k}_${userId}`));
      Object.values(State.widgetCharts).forEach(c => { try { c.destroy(); } catch {} });
      State.widgetCharts = {};
      if (State.reportChart) { try { State.reportChart.destroy(); } catch {} State.reportChart = null; }
      loadUserData();
      initApp();
      toast('All data cleared', 'info');
    }
  });

  // Seed default dashboard widgets on first load
  setTimeout(seedDefaultDashboard, 200);
});

// ─── Default Dashboard Seeding ────────────────────────────────────────────────

function seedDefaultDashboard() {
  if (!State.currentUser) return;
  const tab = State.dashboardTabs[0];
  if (!tab || (State.widgets[tab.id] && State.widgets[tab.id].length > 0)) return;

  // Seed with demo widgets
  State.widgets[tab.id] = [
    { id: uid(), title: 'Monthly Revenue', type: 'area', size: 'lg', datasetId: 'demo', xAxis: 'month', yAxis: 'revenue', trend: 12.4, unit: '$', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Orders by Month', type: 'bar', size: 'md', datasetId: 'demo', xAxis: 'month', yAxis: 'orders', trend: 8.1, unit: '', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Revenue Split', type: 'doughnut', size: 'md', datasetId: 'demo', xAxis: 'month', yAxis: 'revenue', trend: 5.2, unit: '$', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Total Revenue (YTD)', type: 'kpi', size: 'sm', datasetId: 'demo', kpiValue: 1284500, trend: 18.3, unit: '$', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Order Trend', type: 'line', size: 'md', datasetId: 'demo', xAxis: 'month', yAxis: 'orders', trend: -2.1, unit: '', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Monthly Orders (YTD)', type: 'kpi', size: 'sm', datasetId: 'demo', kpiValue: 8432, trend: 8.2, unit: '', createdAt: new Date().toISOString() },
  ];

  const tab2 = State.dashboardTabs[1];
  if (tab2 && (!State.widgets[tab2.id] || State.widgets[tab2.id].length === 0)) {
    State.widgets[tab2.id] = [
      { id: uid(), title: 'Sales Performance', type: 'bar', size: 'lg', datasetId: 'demo', xAxis: 'month', yAxis: 'revenue', trend: 15.7, unit: '$', createdAt: new Date().toISOString() },
      { id: uid(), title: 'Avg. Order Value', type: 'line', size: 'md', datasetId: 'demo', xAxis: 'month', yAxis: 'aov', trend: 3.2, unit: '$', createdAt: new Date().toISOString() },
      { id: uid(), title: 'Return Rate', type: 'area', size: 'md', datasetId: 'demo', xAxis: 'month', yAxis: 'returns', trend: -5.1, unit: '', createdAt: new Date().toISOString() },
    ];
  }

  saveUserData();
  renderDashboard();
}
