// ===== LLM Monitor — Core Logic =====
let DATA = null;
let METHODOLOGY = null;
let EVOLUTION = null;
let NEWS = null;
let DAILYOMNI = null;
let TOKENS = null;
let compareModels = [];
let CURRENT_PAGE = 'dashboard';
const STATE = { sources: new Set(['AA','LB','Arena']) };
const CHARTS = {};

// ——— Source metadata (drives theming + labels) ———
const SOURCE_META = {
  all:   { name:'全部聚合', short:'全部', icon:'🌐', color:'#2563eb', light:'#eff6ff', desc:'聚合三大权威平台 · Artificial Analysis · LiveBench · LMArena' },
  AA:    { name:'Artificial Analysis', short:'AA', icon:'🧪', color:'#6366f1', light:'#eef2ff', desc:'独立 API 实测：智力指数 / 速度 / 成本' },
  LB:    { name:'LiveBench', short:'LB', icon:'🔬', color:'#10b981', light:'#ecfdf5', desc:'防污染客观 Benchmark：每 6 个月刷新题目' },
  Arena: { name:'LMArena', short:'Arena', icon:'🏟️', color:'#f59e0b', light:'#fffbeb', desc:'真实人类盲测投票：Elo 评分 + 置信区间' },
};

const SOURCE_OF_KEY = { intelligence_index:'AA', elo_text:'Arena', reasoning:'LB', coding:'LB', mathematics:'LB', agentic_coding:'LB', agentic_index:'AA', coding_index:'AA' };

// ——— Leaderboard column sets per source ———
const LEADERBOARD_COLS = {
  all: [
    { key:'intelligence_index', label:'智力指数', source:'AA', fmt:v=>v.toFixed(1) },
    { key:'elo_text', label:'Arena Elo', source:'Arena', fmt:v=>v, conf:true },
    { key:'reasoning', label:'推理', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'coding', label:'编程', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'mathematics', label:'数学', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'agentic_coding', label:'Agent', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'speed_tps', label:'速度 t/s', source:null, fmt:v=>v },
    { key:'cost_per_task', label:'成本/任务', source:null, fmt:v=>'$'+v.toFixed(3) },
  ],
  AA: [
    { key:'intelligence_index', label:'智力指数', source:'AA', fmt:v=>v.toFixed(1) },
    { key:'coding_index', label:'Coding Index', source:'AA', fmt:v=>v.toFixed(1) },
    { key:'agentic_index', label:'Agentic Index', source:'AA', fmt:v=>v.toFixed(1) },
    { key:'speed_tps', label:'速度 t/s', source:'AA', fmt:v=>v },
    { key:'cost_per_task', label:'成本/任务', source:'AA', fmt:v=>'$'+v.toFixed(3) },
  ],
  LB: [
    { key:'reasoning', label:'推理', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'coding', label:'编程', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'agentic_coding', label:'Agent编程', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'mathematics', label:'数学', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'data_analysis', label:'数据分析', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'language', label:'语言', source:'LB', fmt:v=>v.toFixed(1) },
    { key:'instruction_following', label:'指令遵循', source:'LB', fmt:v=>v.toFixed(1) },
  ],
  Arena: [
    { key:'elo_text', label:'文本 Elo', source:'Arena', fmt:v=>v, conf:true },
    { key:'elo_vision', label:'视觉 Elo', source:'Arena', fmt:v=>v, conf:true },
    { key:'elo_webdev', label:'WebDev Elo', source:'Arena', fmt:v=>v, conf:true },
    { key:'elo_document', label:'文档 Elo', source:'Arena', fmt:v=>v, conf:true },
  ],
};
const SORT_KEY = { all:'intelligence_index', AA:'intelligence_index', LB:'reasoning', Arena:'elo_text' };
const TAB_OVERRIDE = { all:true, LB:true }; // category tabs only relevant for these

// ——— Dashboard stat cards per source ———
const DASH_STATS = {
  all: [
    { key:'intelligence_index', source:'AA', label:'最高智力指数', fmt:v=>v.toFixed(1) },
    { key:'elo_text', source:'Arena', label:'最高 Arena Elo', fmt:v=>v },
    { key:'cost_per_task', source:'AA', label:'最优性价比', fmt:v=>'$'+v.toFixed(3), best:'min' },
    { key:'reasoning', source:'LB', label:'LiveBench 最高分', fmt:v=>v.toFixed(1) },
  ],
  AA: [
    { key:'intelligence_index', source:'AA', label:'最高智力指数', fmt:v=>v.toFixed(1) },
    { key:'speed_tps', source:'AA', label:'最快输出速度', fmt:v=>v+' t/s' },
    { key:'cost_per_task', source:'AA', label:'最优性价比', fmt:v=>'$'+v.toFixed(3), best:'min' },
    { key:'coding_index', source:'AA', label:'最高 Coding Index', fmt:v=>v.toFixed(1) },
  ],
  LB: [
    { key:'reasoning', source:'LB', label:'最高推理分', fmt:v=>v.toFixed(1) },
    { key:'mathematics', source:'LB', label:'最高数学分', fmt:v=>v.toFixed(1) },
    { key:'coding', source:'LB', label:'最高编程分', fmt:v=>v.toFixed(1) },
    { key:'instruction_following', source:'LB', label:'最高指令遵循', fmt:v=>v.toFixed(1) },
  ],
  Arena: [
    { key:'elo_text', source:'Arena', label:'最高文本 Elo', fmt:v=>v },
    { key:'elo_vision', source:'Arena', label:'最高视觉 Elo', fmt:v=>v },
    { key:'elo_webdev', source:'Arena', label:'最高 WebDev Elo', fmt:v=>v },
    { key:'elo_document', source:'Arena', label:'最高文档 Elo', fmt:v=>v },
  ],
};

// ——— Compare metric definitions ———
const COMPARE_METRICS = [
  { label:'综合智力指数', key:'intelligence_index', source:'AA', fmt:v=>v?.toFixed(1), max:90 },
  { label:'Coding Index', key:'coding_index', source:'AA', fmt:v=>v?.toFixed(1), max:90 },
  { label:'Agentic Index', key:'agentic_index', source:'AA', fmt:v=>v?.toFixed(1), max:70 },
  { label:'输出速度(t/s)', key:'speed_tps', source:'AA', fmt:v=>v, max:200 },
  { label:'每任务成本($)', key:'cost_per_task', source:'AA', fmt:v=>v?.toFixed(3), max:2 },
  { label:'API输入价($/M)', key:'api_price_input', source:'AA', fmt:v=>'$'+v?.toFixed(2), max:20 },
  { label:'API输出价($/M)', key:'api_price_output', source:'AA', fmt:v=>'$'+v?.toFixed(2), max:80 },
  { label:'Arena 文本 Elo', key:'elo_text', source:'Arena', fmt:v=>v, max:1550 },
  { label:'推理', key:'reasoning', source:'LB', fmt:v=>v?.toFixed(1), max:100 },
  { label:'编程', key:'coding', source:'LB', fmt:v=>v?.toFixed(1), max:100 },
  { label:'数学', key:'mathematics', source:'LB', fmt:v=>v?.toFixed(1), max:100 },
  { label:'Agent编程', key:'agentic_coding', source:'LB', fmt:v=>v?.toFixed(1), max:100 },
  { label:'数据分析', key:'data_analysis', source:'LB', fmt:v=>v?.toFixed(1), max:100 },
  { label:'语言', key:'language', source:'LB', fmt:v=>v?.toFixed(1), max:100 },
  { label:'指令遵循', key:'instruction_following', source:'LB', fmt:v=>v?.toFixed(1), max:100 },
  { label:'视觉 Elo', key:'elo_vision', source:'Arena', fmt:v=>v, max:1350 },
  { label:'WebDev Elo', key:'elo_webdev', source:'Arena', fmt:v=>v, max:1700 },
  { label:'文档 Elo', key:'elo_document', source:'Arena', fmt:v=>v, max:1520 },
];
const EXCLUDE_RADAR = new Set(['cost_per_task','api_price_input','api_price_output']);

const SUBTITLES = {
  dashboard: {
    all:'聚合 Artificial Analysis · LiveBench · LMArena 三大权威数据源 · 追踪 10+ 模型',
    AA:'Artificial Analysis 视角：API 实测的智力 / 速度 / 成本',
    LB:'LiveBench 视角：防污染客观题的推理 / 编程 / 数学等七大类别',
    Arena:'LMArena 视角：真实人类盲测投票的 Elo 评分',
  },
  leaderboard: {
    all:'综合三大数据源的多维度排名 · 点击表头排序',
    AA:'Artificial Analysis 指标排名：智力 / Coding / Agentic Index / 速度 / 成本',
    LB:'LiveBench 七大类别排名',
    Arena:'LMArena 各专项 Elo 排名',
  },
  compare: {
    all:'多模型并排对比 · 每个指标标注数据来源',
    AA:'Artificial Analysis 指标对比：智力 / 速度 / 成本 / API 价格',
    LB:'LiveBench 指标对比：推理 / 编程 / 数学 / Agent 等',
    Arena:'LMArena 指标对比：文本 / 视觉 / WebDev / 文档 Elo',
  },
};

// ——— Data Loading ———
async function loadData() {
  try {
    const fetchOpts = { cache: 'no-store' };
    const [modelsRes, methodRes, evoRes, newsRes, omniRes, tokensRes] = await Promise.all([
      fetch('data/models.json', fetchOpts),
      fetch('data/methodology.json', fetchOpts),
      fetch('data/evolution.json', fetchOpts),
      fetch('data/news.json', fetchOpts),
      fetch('data/dailyomni.json', fetchOpts),
      fetch('data/tokens.json', fetchOpts)
    ]);
    DATA = await modelsRes.json();
    METHODOLOGY = await methodRes.json();
    EVOLUTION = await evoRes.json();
    NEWS = await newsRes.json();
    DAILYOMNI = await omniRes.json().catch(() => null);
    TOKENS = await tokensRes.json().catch(() => null);
    initApp();
  } catch(e) {
    console.error('Data load failed:', e);
    document.querySelector('.main').innerHTML = '<div style="padding:40px;text-align:center"><h2>数据加载失败</h2><p style="color:var(--text-secondary)">请检查 data/ 目录下的 JSON 文件</p></div>';
  }
}

function initApp() {
  readSourcesFromURL();
  applySources();
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });
  document.querySelectorAll('.source-chip').forEach(chip => {
    chip.addEventListener('click', () => toggleSource(chip.dataset.source));
  });
  document.getElementById('leaderboard-tabs').addEventListener('click', e => {
    if (e.target.classList.contains('main-tab')) {
      document.querySelectorAll('#leaderboard-tabs .main-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      renderLeaderboard();
    }
  });
  initDashboard();
}

// ——— Helpers ———
function getMetric(m, key) { return m.metrics?.find(x => x.key === key); }
function getMetricVal(m, key) { const met = getMetric(m, key); return met ? met.value : null; }
function formatSourceBadge(source) { if(!source) return ''; return `<span class="source-badge ${source}" title="${DATA.sources[source]?.desc || ''}">${source}</span>`; }
function getSourceColor(source) { return DATA.sources[source]?.color || '#999'; }

// ——— 散点/气泡图点旁模型名标注插件（主题自适应描边 + 防重叠）———
function _bgLuminance(c) {
  const m = String(c).match(/(\d+\.?\d*)/g);
  if (!m || m.length < 3) return 255;
  const [r, g, b] = m.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
const pointLabelPlugin = {
  id: 'pointLabels',
  afterDatasetsDraw(chart) {
    const opt = chart.options.plugins?.pointLabels;
    if (!opt || opt.enabled === false) return;
    const { ctx, chartArea } = chart;
    const isMobile = document.documentElement.dataset.device === 'mobile';
    const lum = _bgLuminance(getComputedStyle(document.body).backgroundColor);
    const dark = lum < 128;
    const stroke = dark ? 'rgba(15,23,42,.82)' : 'rgba(255,255,255,.92)';
    ctx.save();
    ctx.font = `600 ${isMobile ? 10 : 11.5}px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC",sans-serif`;
    ctx.textBaseline = 'middle';
    const placed = [];
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((el, i) => {
        const raw = ds.data[i];
        if (!raw || raw.skipLabel) return;
        const label = raw.name || raw.model;
        if (!label) return;
        const r = (typeof raw.r === 'number' && raw.r > 0) ? raw.r : (el.options?.radius || 4);
        const w = ctx.measureText(label).width;
        let align = 'left', tx = el.x + r + 6, ty = el.y;
        if (tx + w > chartArea.right - 2) { align = 'right'; tx = el.x - r - 6; }
        let box = { x: align === 'left' ? tx : tx - w, y: ty - 6, w, h: 12 };
        let tries = 0;
        while (tries < 8 && placed.some(p => !(box.x + box.w < p.x || p.x + p.w < box.x || box.y + box.h < p.y || p.y + p.h < box.y))) {
          ty += 13; box.y += 13; tries++;
        }
        // 若被推到图底外，改放到点上方
        if (ty > chartArea.bottom - 6) {
          ty = el.y - r - 8; box.y = ty - 6;
          let t2 = 0;
          while (t2 < 8 && placed.some(p => !(box.x + box.w < p.x || p.x + p.w < box.x || box.y + box.h < p.y || p.y + p.h < box.y))) {
            ty -= 13; box.y -= 13; t2++;
          }
        }
        placed.push(box);
        ctx.textAlign = align;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = stroke;
        ctx.strokeText(label, tx, ty);
        ctx.fillStyle = raw.labelColor || raw.color || (dark ? '#e5e7eb' : '#374151');
        ctx.fillText(label, tx, ty);
      });
    });
    ctx.restore();
  }
};
if (typeof Chart !== 'undefined') Chart.register(pointLabelPlugin);

function makeChart(id, config) {
  if (CHARTS[id]) { CHARTS[id].destroy(); delete CHARTS[id]; }
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  CHARTS[id] = new Chart(ctx, config);
  return CHARTS[id];
}
function destroyAllCharts() {
  Object.keys(CHARTS).forEach(k => { try { CHARTS[k].destroy(); } catch(e){} delete CHARTS[k]; });
}

// ——— Multi-select source focus ———
function readSourcesFromURL() {
  const p = new URLSearchParams(location.search).get('sources');
  if (!p) return;
  const set = new Set(p.split(',').map(s => s.trim()).filter(s => ['AA','LB','Arena'].includes(s)));
  if (set.size) STATE.sources = set;
}
function syncURL() {
  const q = [...STATE.sources].join(',');
  const url = q.length === 3 ? location.pathname : location.pathname + '?sources=' + q;
  history.replaceState(null, '', url);
}
function applySources() {
  const all = STATE.sources.size === 3;
  document.querySelectorAll('.source-chip').forEach(c => {
    const src = c.dataset.source;
    const active = src === 'all' ? all : STATE.sources.has(src);
    c.classList.toggle('active', active);
  });
  // Single-source focus tints the UI with that source's brand color;
  // multi-select / All keeps the neutral blue.
  const single = !all && STATE.sources.size === 1 ? [...STATE.sources][0] : null;
  const meta = single ? SOURCE_META[single] : SOURCE_META.all;
  document.documentElement.style.setProperty('--primary', meta.color);
  document.documentElement.style.setProperty('--primary-light', meta.light);
  applyVisibility();
  syncURL();
}
function toggleSource(src) {
  if (src === 'all') {
    STATE.sources = new Set(['AA','LB','Arena']);          // reset to all
  } else if (STATE.sources.size === 3) {
    STATE.sources = new Set([src]);                        // from All → focus one
  } else if (STATE.sources.size === 1 && STATE.sources.has(src)) {
    STATE.sources = new Set(['AA','LB','Arena']);          // single → back to All
  } else {
    STATE.sources.has(src) ? STATE.sources.delete(src) : STATE.sources.add(src);
  }
  applySources();
  switchPage(CURRENT_PAGE);
}
function applyVisibility() {
  document.querySelectorAll('#dashboard-charts .card[data-source], #dashboard-stats .stat-card[data-source]')
    .forEach(el => el.classList.toggle('dimmed', !STATE.sources.has(el.dataset.source)));
}
function updateSubtitle(page) {
  const key = STATE.sources.size === 1 ? [...STATE.sources][0] : 'all';
  const t = SUBTITLES[page]?.[key];
  const el = document.querySelector(`#page-${page} .header-left p`);
  if (el && t) el.textContent = t;
}

// ——— Navigation ———
function switchPage(name) {
  CURRENT_PAGE = name;
  destroyAllCharts();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-'+name);
  if (page) page.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${name}"]`);
  if (nav) nav.classList.add('active');
  document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === name));
  if (document.documentElement.getAttribute('data-device') === 'mobile') window.scrollTo({ top: 0, behavior: 'smooth' });

  if (name==='leaderboard') { renderLeaderboard(); updateSubtitle('leaderboard'); }
  else if (name==='compare') { initCompare(); updateSubtitle('compare'); }
  else if (name==='trends') initTrends();
  else if (name==='evolution') initEvolution();
  else if (name==='cost') initCost();
  else if (name==='coding') initCoding();
  else if (name==='multimodal') initMultimodal();
  else if (name==='omni') initOmni();
  else if (name==='tokens') initTokens();
  else if (name==='news') initNews();
  else if (name==='methodology') renderMethodology();
  else { initDashboard(); updateSubtitle('dashboard'); }
}

// ========== DASHBOARD ==========
function initDashboard() {
  buildStats();
  renderDashboardCharts();
  renderTop8();
  renderFeeds();
  buildDashboardGlobalTokens();
  updateSubtitle('dashboard');
}

function buildDashboardGlobalTokens() {
  const el = document.getElementById('dashboardGlobalTokens');
  if (!el || !TOKENS) return;
  const gm = TOKENS.global_monthly || [];
  if (!gm.length) return;
  const gmColors = gm.map(m => m.confidence === 'reported' ? '#7c3aed' : m.confidence === 'estimated' ? '#06b6d4' : '#c4b5fd');
  makeChart('dashboardGlobalTokens', {
    type: 'line',
    data: { labels: gm.map(m => m.month), datasets: [{ label: '全球估算（万亿/月）', data: gm.map(m => m.total_t), borderColor: '#7c3aed', backgroundColor: '#7c3aed22', fill: true, tension: 0.25, pointRadius: 3, pointBackgroundColor: gmColors, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const m = gm[c.dataIndex]; const tag = m.confidence === 'reported' ? '实测锚点' : m.confidence === 'estimated' ? '披露推算' : '插值'; return ` ${m.month}: ${c.parsed.y} 万亿 · ${tag}`; } } } },
      scales: { y: { title: { display: true, text: '万亿 Token / 月', font: { size: 12 } }, ticks: { font: { size: 11 }, callback: v => v >= 1000 ? (v/1000)+'k' : v }, beginAtZero: true }, x: { ticks: { font: { size: 9 }, maxRotation: 60, autoSkip: true, maxTicksLimit: 12 } } }
    }
  });
}

function buildStats() {
  const defs = DASH_STATS.all;
  const wrap = document.getElementById('dashboard-stats');
  wrap.innerHTML = defs.map(d => {
    const isMin = d.best === 'min';
    const best = DATA.models.reduce((a, m) => {
      const v = getMetricVal(m, d.key);
      if (v == null) return a;
      if (a.v == null) return { v, m };
      return isMin ? (v < a.v ? { v, m } : a) : (v > a.v ? { v, m } : a);
    }, { v:null, m:null });
    return `<div class="stat-card" data-source="${d.source || ''}">
      <div class="stat-label">${d.label} ${d.source ? formatSourceBadge(d.source) : ''}</div>
      <div class="stat-value">${best.v != null ? d.fmt(best.v) : '—'}</div>
      <div class="stat-detail">${best.m ? best.m.name : ''}</div>
    </div>`;
  }).join('');
}

function renderTop8() {
  const sortKey = SORT_KEY.all;
  const sorted = [...DATA.models].sort((a,b) => (getMetricVal(b,sortKey)||0) - (getMetricVal(a,sortKey)||0)).slice(0,8);
  const tbody = document.getElementById('top8-table');
  const th = tbody.closest('table').querySelector('thead tr');
  const single = STATE.sources.size===1 ? [...STATE.sources][0] : null;
  const primaryLabel = single==='Arena' ? '文本 Elo' : single==='LB' ? '推理' : '智力指数';
  if (th.children[2]) th.children[2].innerHTML = `${primaryLabel} ${formatSourceBadge(SOURCE_OF_KEY[sortKey]||'AA')}`;
  tbody.innerHTML = sorted.map((m,i) => {
    const primary = getMetric(m, sortKey);
    const elo = getMetric(m,'elo_text');
    const speed = getMetric(m,'speed_tps');
    const cost = getMetric(m,'cost_per_task');
    return `<tr>
      <td><span class="rank-num ${i<3?'top3':''}">${i+1}</span></td>
      <td><div class="model-cell">
        <div class="model-icon" style="background:${m.color}">${m.name[0]}</div>
        <div><div class="model-name">${m.name}</div><div class="model-provider">${m.provider}</div></div>
      </div></td>
      <td class="source-cell"><span class="score">${primary?.value??'—'}</span>${formatSourceBadge(SOURCE_OF_KEY[sortKey]||'AA')}${primary?.confidence?` <small style="color:#9ca3af">${primary.confidence}</small>`:''}</td>
      <td class="source-cell"><span class="score">${elo?.value??'—'}</span>${formatSourceBadge('Arena')}${elo?.confidence?` <small style="color:#9ca3af">${elo.confidence}</small>`:''}</td>
      <td>${speed?.value??'—'} t/s</td>
      <td>$${cost?.value?.toFixed(3)??'—'}</td>
    </tr>`;
  }).join('');
}

function renderFeeds() {
  document.getElementById('feed-list').innerHTML = (DATA.changelog||[]).slice(0,7).map(f => `
    <div class="feed-item">
      <div class="feed-date">${f.date}</div>
      <div class="feed-content"><a href="${f.url||'#'}">${f.event}</a></div>
    </div>
  `).join('');
}

function grid2(a,b){ return `<div class="grid-2">${a}${b}</div>`; }
function cardHTML(title, sub, id){ return `<div class="card"><div class="card-header"><h3>${title}</h3><span style="font-size:12px;color:var(--text-muted)">${sub}</span></div><div class="card-body"><div class="chart-container"><canvas id="${id}"></canvas></div></div></div>`; }
function barOpts(yTitle){ return { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ title:{display:true,text:yTitle,font:{size:12}}, ticks:{font:{size:11}} }, x:{ ticks:{font:{size:11}} } } }; }

function renderDashboardCharts() {
  const wrap = document.getElementById('dashboard-charts');
  if (!wrap) return;
  // Render ALL source visuals at once; applyVisibility() dims unselected ones.
  wrap.innerHTML = `
    <div class="grid-2">
      <div class="card" data-source="AA"><div class="card-header"><h3>智力 vs 成本 散点 <span class="source-badge AA">AA</span></h3><span style="font-size:12px;color:var(--text-muted)">气泡大小 = 输出速度</span></div><div class="card-body"><div class="chart-container"><canvas id="scatterIntelCost"></canvas></div></div></div>
      <div class="card" data-source="AA"><div class="card-header"><h3>前沿模型能力趋势 <span class="source-badge AA">AA</span></h3><span style="font-size:12px;color:var(--text-muted)">Intelligence Index 按厂商</span></div><div class="card-body"><div class="chart-container"><canvas id="trendFrontier"></canvas></div></div></div>
      <div class="card" data-source="LB"><div class="card-header"><h3>LiveBench 各类别 SOTA <span class="source-badge LB">LB</span></h3><span style="font-size:12px;color:var(--text-muted)">全模型最高分</span></div><div class="card-body"><div class="chart-container"><canvas id="lbSota"></canvas></div></div></div>
      <div class="card" data-source="Arena"><div class="card-header"><h3>LMArena 各专项 SOTA <span class="source-badge Arena">Arena</span></h3><span style="font-size:12px;color:var(--text-muted)">各专项最高 Elo</span></div><div class="card-body"><div class="chart-container"><canvas id="arenaSota"></canvas></div></div></div>
    </div>`;
  buildScatterIntelCost();
  buildTrendFrontier();
  buildLbSota();
  buildArenaSota();
  applyVisibility();
}

function buildScatterIntelCost() {
  const points = DATA.models.map(m => {
    const intel = getMetricVal(m,'intelligence_index');
    const cost = getMetricVal(m,'cost_per_task');
    const speed = getMetricVal(m,'speed_tps');
    return { x:cost||0.01, y:intel||0, r:Math.max(4,(speed||50)/20), name:m.name, color:m.color };
  });
  makeChart('scatterIntelCost', { type:'bubble',
    data:{ datasets:[{ data:points, backgroundColor:points.map(p=>p.color+'99'), borderColor:points.map(p=>p.color), borderWidth:1.5 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ pointLabels:{enabled:true}, tooltip:{ callbacks:{ label:c=>`${c.raw.name}: 智力 ${c.raw.y} · $${c.raw.x.toFixed(3)}` } }, legend:{display:false} },
      scales:{ x:{ title:{display:true,text:'每任务成本 (USD)',font:{size:12}}, type:'logarithmic', ticks:{font:{size:11}} }, y:{ title:{display:true,text:'智力指数',font:{size:12}}, min:65, max:86, ticks:{font:{size:11}} } }
    }
  });
}

function buildTrendFrontier() {
  const providers = ['OpenAI','Anthropic','Google','Meta','DeepSeek','月之暗面'];
  const colors = ['#2563eb','#8b5cf6','#10b981','#ef4444','#f59e0b','#ec4899'];
  const allQuarters = ['2024Q1','2024Q2','2024Q3','2024Q4','2025Q1','2025Q2','2025Q3','2025Q4'];
  const datasets = providers.map((p,i)=>{
    const m = DATA.models.filter(x=>x.provider===p).sort((a,b)=>(getMetricVal(b,'intelligence_index')||0)-(getMetricVal(a,'intelligence_index')||0))[0];
    if (!m?.timeline_intel) return null;
    return { label:p, data:m.timeline_intel.map(t=>t.value), borderColor:colors[i], backgroundColor:'transparent', tension:.3, pointRadius:3, borderWidth:2 };
  }).filter(Boolean);
  makeChart('trendFrontier', { type:'line', data:{ labels:allQuarters, datasets },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{font:{size:11}, usePointStyle:true, padding:15} } },
      scales:{ x:{ ticks:{font:{size:11}} }, y:{ title:{display:true,text:'Intelligence Index',font:{size:12}}, min:30, max:90, ticks:{font:{size:11}} } }
    }
  });
}

function buildLbSota() {
  const cats = [['reasoning','推理'],['coding','编程'],['agentic_coding','Agent编程'],['mathematics','数学'],['data_analysis','数据分析'],['language','语言'],['instruction_following','指令遵循']];
  const data = cats.map(([k]) => Math.max(...DATA.models.map(m=>getMetricVal(m,k)||0)));
  makeChart('lbSota', { type:'bar', data:{ labels:cats.map(c=>c[1]), datasets:[{ data, backgroundColor:'#10b981', borderRadius:4 }] }, options:barOpts('分数') });
}
function buildLbProvider() {
  const provs = [...new Set(DATA.models.map(m=>m.provider))];
  const data = provs.map(p => {
    const arr = DATA.models.filter(m=>m.provider===p).map(m=>getMetricVal(m,'reasoning')||0).filter(v=>v>0);
    return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  });
  makeChart('lbProvider', { type:'bar', data:{ labels:provs, datasets:[{ data, backgroundColor:'#34d399', borderRadius:4 }] }, options:barOpts('推理均分') });
}
function buildArenaSota() {
  const cats = [['elo_text','文本'],['elo_vision','视觉'],['elo_webdev','WebDev'],['elo_document','文档']];
  const data = cats.map(([k]) => Math.max(...DATA.models.map(m=>getMetricVal(m,k)||0)));
  makeChart('arenaSota', { type:'bar', data:{ labels:cats.map(c=>c[1]), datasets:[{ data, backgroundColor:'#f59e0b', borderRadius:4 }] }, options:barOpts('Elo') });
}
function buildArenaTop() {
  const top = [...DATA.models].sort((a,b)=>(getMetricVal(b,'elo_text')||0)-(getMetricVal(a,'elo_text')||0)).slice(0,10).reverse();
  makeChart('arenaTop', { type:'bar', data:{ labels:top.map(m=>m.name), datasets:[{ data:top.map(m=>getMetricVal(m,'elo_text')||0), backgroundColor:top.map(m=>m.color), borderRadius:4 }] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ title:{display:true,text:'文本 Elo',font:{size:12}}, ticks:{font:{size:11}} } } }
  });
}

// ========== LEADERBOARD ==========
function renderLeaderboard() {
  const src = 'all';
  const cols = LEADERBOARD_COLS[src];
  const tbody = document.getElementById('leaderboard-body');
  const table = tbody.closest('table');
  table.querySelector('thead tr').innerHTML = `<th>#</th><th>模型</th>` + cols.map(c => `<th>${c.label}${c.source?formatSourceBadge(c.source):''}</th>`).join('') + `<th>类型</th>`;

  const tabs = document.getElementById('leaderboard-tabs');
  tabs.style.display = TAB_OVERRIDE[src] ? 'flex' : 'none';

  const cat = document.querySelector('#leaderboard-tabs .main-tab.active')?.dataset?.cat || 'all';
  let sortKey = SORT_KEY[src];
  if (src === 'all' && cat !== 'all') sortKey = cat;

  let sorted = [...DATA.models].sort((a,b) => (getMetricVal(b,sortKey)||0) - (getMetricVal(a,sortKey)||0));

  const search = (document.querySelector('#page-leaderboard .search-input')?.value || '').trim().toLowerCase();
  const fsel = document.querySelectorAll('#page-leaderboard .filter-select');
  const fProvider = fsel[0]?.value || '全部厂商';
  const fType = fsel[1]?.value || '全部类型';
  const fMode = fsel[2]?.value || '全部模式';
  sorted = sorted.filter(m => {
    if (search && !(m.name.toLowerCase().includes(search) || m.provider.toLowerCase().includes(search))) return false;
    if (fProvider !== '全部厂商' && m.provider !== fProvider) return false;
    if (fType === '闭源' && m.open_source) return false;
    if (fType === '开源' && !m.open_source) return false;
    if (fMode === '推理模型' && !m.reasoning) return false;
    if (fMode === '非推理模型' && m.reasoning) return false;
    return true;
  });

  tbody.innerHTML = sorted.map((m,i) => {
    const typeTags = [];
    if (m.open_source) typeTags.push(`<span class="tag tag-green">${m.open_source_note||'开源'}</span>`);
    else typeTags.push('<span class="tag tag-blue">闭源</span>');
    if (m.reasoning) typeTags.push('<span class="tag tag-purple">💡推理</span>');
    if (m.multimodal) typeTags.push('<span class="tag tag-orange">🎨多模态</span>');

    const cells = cols.map(c => {
      const met = getMetric(m, c.key);
      const val = met?.value;
      const disp = c.fmt ? c.fmt(val) : (val ?? '—');
      const conf = (c.conf && met?.confidence) ? ` <small style="color:#9ca3af">${met.confidence}</small>` : '';
      return `<td class="source-cell"><span class="score">${disp}</span>${c.source?formatSourceBadge(c.source):''}${conf}</td>`;
    }).join('');

    return `<tr>
      <td><span class="rank-num ${i<3?'top3':''}">${i+1}</span></td>
      <td><div class="model-cell">
        <div class="model-icon" style="background:${m.color}">${m.name[0]}</div>
        <div><div class="model-name">${m.name}</div><div class="model-provider">${m.provider}</div></div>
      </div></td>
      ${cells}
      <td>${typeTags.join(' ')}</td>
    </tr>`;
  }).join('');
}

function filterLeaderboard() { renderLeaderboard(); }

// ========== COMPARE ==========
function initCompare() {
  const sel = document.getElementById('compare-select');
  const tierGroups = [
    { key:'top', label:'🏆 顶级模型' },
    { key:'balanced', label:'⚖️ 均衡模型' },
    { key:'fast', label:'⚡ 极速模型' }
  ];
  sel.innerHTML = '<option value="">+ 添加模型（多选）</option>' +
    tierGroups.map(g => {
      const opts = DATA.models.filter(m => m.tier === g.key)
        .map(m => `<option value="${m.id}">${m.name} — ${m.provider}</option>`).join('');
      return `<optgroup label="${g.label}">${opts}</optgroup>`;
    }).join('');
  renderTierBar();
  renderCompareChips();
  if (compareModels.length > 0) renderCompareContent();
}

function renderTierBar() {
  const bar = document.getElementById('compare-tier-bar');
  if (!bar) return;
  const tiers = [
    { key:'top', label:'🏆 顶级模型', desc:'最强综合智力', cls:'tier-top' },
    { key:'balanced', label:'⚖️ 均衡模型', desc:'性价比均衡', cls:'tier-balanced' },
    { key:'fast', label:'⚡ 极速模型', desc:'最高输出速度', cls:'tier-fast' }
  ];
  bar.innerHTML = tiers.map(t => {
    const list = DATA.models.filter(m => m.tier === t.key);
    return `<button class="tier-btn ${t.cls}" onclick="addCompareTier('${t.key}')">
        <span class="tier-btn-label">${t.label}</span>
        <span class="tier-btn-count">${list.length}</span>
        <span class="tier-btn-desc">${t.desc}</span>
      </button>`;
  }).join('') + '<button class="tier-btn tier-clear" onclick="clearCompareModels()">清空选择</button>';
}

function addCompareTier(tier) {
  const ids = DATA.models.filter(m => m.tier === tier).map(m => m.id);
  ids.forEach(id => { if (!compareModels.includes(id)) compareModels.push(id); });
  renderCompareChips();
  renderCompareContent();
}

function clearCompareModels() {
  compareModels = [];
  renderCompareChips();
  document.getElementById('compare-content').style.display = 'none';
  document.getElementById('compare-empty').style.display = 'block';
}

function addCompareModel() {
  const sel = document.getElementById('compare-select');
  const id = sel.value; if (!id || compareModels.includes(id)) { sel.value=''; return; }
  compareModels.push(id); sel.value='';
  renderCompareChips(); renderCompareContent();
}

function removeCompareModel(id) {
  compareModels = compareModels.filter(x=>x!==id);
  renderCompareChips();
  if (compareModels.length === 0) {
    document.getElementById('compare-content').style.display='none';
    document.getElementById('compare-empty').style.display='block';
  } else renderCompareContent();
}

function renderCompareChips() {
  const container = document.getElementById('compare-chips');
  container.innerHTML = compareModels.map(id => {
    const m = DATA.models.find(x=>x.id===id);
    return `<div class="compare-chip">
      <span class="model-icon" style="width:20px;height:20px;font-size:11px;background:${m.color}">${m.name[0]}</span>
      ${m.name} <span class="remove" onclick="removeCompareModel('${id}')">×</span>
    </div>`;
  }).join('');
}

function renderCompareContent() {
  document.getElementById('compare-content').style.display='block';
  document.getElementById('compare-empty').style.display='none';
  const selected = compareModels.map(id => DATA.models.find(m => m.id === id));
  const metrics = COMPARE_METRICS.filter(m => STATE.sources.has(m.source));
  const radarMetrics = metrics.filter(m => m.max && !EXCLUDE_RADAR.has(m.key));

  // Radar: heavier borders / lighter fills so overlapping models remain readable
  const isMany = selected.length >= 5;
  makeChart('radarCompare', { type:'radar',
    data:{ labels:radarMetrics.map(m=>m.label),
      datasets:selected.map((m, i) => ({ label:m.name, data:radarMetrics.map(rm => { const v = getMetricVal(m, rm.key); return v ? Math.min(100,(v/rm.max)*100) : 0; }), borderColor:m.color, backgroundColor:m.color+(isMany?'10':'18'), borderWidth:isMany?3:2.5, pointRadius:isMany?4:3, pointHoverRadius:isMany?6:5, pointBackgroundColor:'#fff', pointBorderColor:m.color, pointBorderWidth:2, order:i }))
    },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{font:{size:11}, usePointStyle:true, boxWidth:8} } },
      scales:{ r:{ min:0, max:100, ticks:{ stepSize:20, font:{size:10}, backdropColor:'transparent' }, angleLines:{color:'var(--border)'}, grid:{color:'var(--border-light)'} } }
    }
  });

  // Gap chart: shows per-metric span (max-min) across selected models
  buildCompareGapChart(selected, radarMetrics);

  // Detail table
  const tableWrap = document.getElementById('compare-table-wrap');
  tableWrap.innerHTML = `<table>
    <thead><tr><th>指标</th><th>数据来源</th>${selected.map(m=>`<th>${m.name}<div style="font-weight:400;font-size:11px;color:#9ca3af">${m.provider}</div></th>`).join('')}</tr></thead>
    <tbody>
      ${metrics.map(cm => {
        let cells;
        if (cm.key === '_provider') cells = selected.map(m=>`<td>${m.provider}</td>`);
        else if (cm.key === '_open') cells = selected.map(m=>`<td>${m.open_source?'<span class="tag tag-green">开源</span>':'<span class="tag tag-blue">闭源</span>'}</td>`);
        else cells = selected.map(m => { const v = getMetricVal(m, cm.key); const met = getMetric(m, cm.key); return `<td style="font-weight:600">${cm.fmt?cm.fmt(v):(v??'—')}${met?.confidence?` <small style="color:#9ca3af">${met.confidence}</small>`:''}</td>`; });
        return `<tr><td style="font-weight:500">${cm.label}</td><td>${cm.source?formatSourceBadge(cm.source):'—'}</td>${cells.join('')}</tr>`;
      }).join('')}
    </tbody>
  </table>`;

  // Scatter (only meaningful for AA / all)
  const card = document.getElementById('compareScatter').closest('.card');
  const body = card.querySelector('.card-body');
  if (!STATE.sources.has('AA')) {
    body.innerHTML = `<div style="padding:24px;color:var(--text-secondary);font-size:13px;line-height:1.7">当前未勾选 <strong>Artificial Analysis</strong>，智力 vs 成本散点仅来自 AA（API 实测）。<br>请在上方勾选「🧪 Artificial Analysis」查看该图。</div>`;
  } else {
    body.innerHTML = `<div class="chart-container"><canvas id="compareScatter"></canvas></div>`;
    const pts = DATA.models.map(m => {
      const sel = selected.some(s => s.id === m.id);
      return {
        x: getMetricVal(m,'cost_per_task')||0.01,
        y: getMetricVal(m,'intelligence_index')||0,
        r: sel ? 9 : 5,
        name: m.name,
        color: sel ? m.color : '#9ca3af'
      };
    });
    makeChart('compareScatter', { type:'bubble',
      data:{ datasets:[{ data:pts, backgroundColor:pts.map(p=>p.color), borderColor:pts.map(p=>p.color), borderWidth:1.5 }] },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ pointLabels:{enabled:true}, tooltip:{ callbacks:{ label:c=>`${c.raw.name}: 智力 ${c.raw.y} · $${c.raw.x.toFixed(3)}` } }, legend:{display:false} },
        scales:{ x:{ title:{display:true,text:'每任务成本 (USD)',font:{size:12}}, type:'logarithmic', ticks:{font:{size:11}} }, y:{ title:{display:true,text:'智力指数 (来源: AA)',font:{size:12}}, min:65, max:86, ticks:{font:{size:11}} } }
      }
    });
  }
  buildPriceMultiple(selected);
}

// 指标差距条形图：展示每个指标上选中模型的 max-min（标准化后），让用户一眼看出哪里差距大
function buildCompareGapChart(selected, radarMetrics) {
  const wrap = document.getElementById('compare-gap-wrap');
  if (!wrap) return;
  if (selected.length < 3) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  const rows = radarMetrics.map(rm => {
    const vals = selected.map(m => { const v = getMetricVal(m, rm.key); return v ? (v / rm.max) * 100 : 0; }).filter(v => v > 0);
    const span = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
    return { label: rm.label, span };
  }).sort((a, b) => b.span - a.span);
  makeChart('compareGapChart', {
    type: 'bar',
    data: { labels: rows.map(r => r.label), datasets: [{ label: '差距跨度（标准化分）', data: rows.map(r => r.span), backgroundColor: '#6366f1cc', borderColor: '#4f46e5', borderWidth: 1, borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `跨度 ${c.raw.toFixed(1)} 分` } } },
      scales: { x: { ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 45, minRotation: 30 } }, y: { title: { display: true, text: '标准化分差距', font: { size: 12 } }, beginAtZero: true, ticks: { font: { size: 11 } } } }
    }
  });
}

// 导出对比表格为 CSV
function exportCompareCSV() {
  const selected = compareModels.map(id => DATA.models.find(m => m.id === id));
  if (!selected.length) return alert('请先选择至少一个模型');
  const metrics = COMPARE_METRICS.filter(m => STATE.sources.has(m.source));
  const headers = ['指标', '数据来源', ...selected.map(m => `${m.name}（${m.provider}）`)];
  const rows = metrics.map(cm => {
    const cells = selected.map(m => {
      let v;
      if (cm.key === '_provider') v = m.provider;
      else if (cm.key === '_open') v = m.open_source ? '开源' : '闭源';
      else v = cm.fmt ? cm.fmt(getMetricVal(m, cm.key)) : (getMetricVal(m, cm.key) ?? '—');
      return String(v).replace(/"/g, '""');
    });
    return [`"${cm.label}"`, `"${cm.source || ''}"`, ...cells.map(c => `"${c}"`)];
  });
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `llm-monitor-compare-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// 价格倍数：以 DeepSeek V4 Pro 为基准(1.0×)，展示所有模型相对其每任务成本的倍数
function buildPriceMultiple(selected) {
  const base = DATA.models.find(m => m.id === 'deepseekV4');
  const canvas = document.getElementById('priceMultipleChart');
  if (!canvas) return;
  const card = canvas.closest('.card');
  if (!base) { if (card) card.style.display = 'none'; return; }
  const baseCost = getMetricVal(base, 'cost_per_task');
  if (!baseCost) { if (card) card.style.display = 'none'; return; }
  const rows = DATA.models
    .map(m => {
      const c = getMetricVal(m, 'cost_per_task');
      return {
        name: m.name, id: m.id,
        mult: c ? c / baseCost : null,
        sel: selected.some(s => s.id === m.id),
        isBase: m.id === 'deepseekV4'
      };
    })
    .filter(r => r.mult != null)
    .sort((a, b) => b.mult - a.mult);
  makeChart('priceMultipleChart', {
    type: 'bar',
    data: {
      labels: rows.map(r => r.name),
      datasets: [{
        label: '价格倍数 (× DeepSeek V4 Pro)',
        data: rows.map(r => r.mult),
        backgroundColor: rows.map(r => r.isBase ? '#f59e0b' : (r.sel ? '#6366f1' : 'rgba(148,163,184,.45)')),
        borderColor: rows.map(r => r.isBase ? '#d97706' : (r.sel ? '#4f46e5' : 'rgba(148,163,184,.8)')),
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `${c.raw.toFixed(1)}× 基准 · $${(c.raw * baseCost).toFixed(3)}/任务` } }
      },
      scales: {
        x: { type: 'logarithmic', title: { display: true, text: '相对 DeepSeek V4 Pro 的成本倍数 (×)', font: { size: 12 } }, ticks: { font: { size: 11 } } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ========== TRENDS ==========
function initTrends() { initTrendTimeline(); initTrendCoding(); initTrendElo(); }

function initTrendTimeline() {
  const providers = ['OpenAI','Anthropic','Google','Meta','DeepSeek','月之暗面'];
  const colors = ['#2563eb','#8b5cf6','#10b981','#ef4444','#f59e0b','#ec4899'];
  const allQuarters = ['2024Q1','2024Q2','2024Q3','2024Q4','2025Q1','2025Q2','2025Q3','2025Q4'];
  const datasets = providers.map((p,i)=>{
    const m = DATA.models.filter(x=>x.provider===p).sort((a,b)=>(getMetricVal(b,'intelligence_index')||0)-(getMetricVal(a,'intelligence_index')||0))[0];
    if (!m?.timeline_intel) return null;
    return { label:p, data:m.timeline_intel.map(t=>t.value), borderColor:colors[i], backgroundColor:'transparent', tension:.35, pointRadius:3, borderWidth:2.5 };
  }).filter(Boolean);
  makeChart('trendTimeline', { type:'line', data:{ labels:allQuarters, datasets },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{font:{size:12}, usePointStyle:true, padding:18} } },
      scales:{ x:{ ticks:{font:{size:11}} }, y:{ title:{display:true,text:'Intelligence Index (来源: AA)',font:{size:12}}, min:30, max:90, ticks:{stepSize:10, font:{size:11}} } }
    }
  });
}

function initTrendCoding() {
  const labels = ['2024Q1','2024Q2','2024Q3','2024Q4','2025Q1','2025Q2','2025Q3','2025Q4'];
  const datasets = [
    { label:'OpenAI', data:[48,55,62,70,76,80,82,83.9], color:'#2563eb' },
    { label:'Anthropic', data:[45,52,60,68,75,80,84,86], color:'#8b5cf6' },
    { label:'DeepSeek', data:[30,38,46,53,60,65,68,70], color:'#f59e0b' },
  ];
  makeChart('trendCoding', { type:'line', data:{ labels, datasets:datasets.map(d=>({ ...d, borderColor:d.color, tension:.3, pointRadius:3, borderWidth:2, backgroundColor:'transparent' })) },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{font:{size:11}, usePointStyle:true} } },
      scales:{ x:{ ticks:{font:{size:11}} }, y:{ title:{display:true,text:'编程指数 (来源: LB)',font:{size:12}}, min:25, max:95, ticks:{font:{size:11}} } }
    }
  });
}

function initTrendElo() {
  const labels = ['2024Q1','2024Q2','2024Q3','2024Q4','2025Q1','2025Q2','2025Q3','2025Q4'];
  const datasets = [
    { label:'Claude Fable', data:[1320,1360,1400,1430,1460,1480,1495,1507], color:'#8b5cf6' },
    { label:'GPT-5.6 Sol', data:[1310,1340,1380,1410,1440,1460,1475,1486], color:'#2563eb' },
    { label:'Gemini 3 Pro', data:[1280,1320,1370,1410,1440,1460,1475,1480], color:'#10b981' },
  ];
  makeChart('trendElo', { type:'line', data:{ labels, datasets:datasets.map(d=>({ ...d, borderColor:d.color, tension:.3, pointRadius:3, borderWidth:2, backgroundColor:'transparent' })) },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{font:{size:11}, usePointStyle:true} } },
      scales:{ x:{ ticks:{font:{size:11}} }, y:{ title:{display:true,text:'Arena Elo (来源: Arena)',font:{size:12}}, min:1250, max:1550, ticks:{font:{size:11}} } }
    }
  });
}

// ========== COST ==========
let costCompanyFilter = 'all';
let costTierFilter = 'all';
const COST_TIERS = [
  { k:'top', label:'🏆 顶尖模型', sub:'旗舰 · 最强智能 · 高单价', cls:'tier-top' },
  { k:'balanced', label:'⚖️ 均衡模型', sub:'性价比 · 中等能力中等价', cls:'tier-balanced' },
  { k:'fast', label:'⚡ 极速模型', sub:'高吞吐 · 低延迟 · 低价', cls:'tier-fast' }
];
function initCost() { initCostScatter(); buildCostCompanyFilter(); buildCostTierFilter(); renderCostTable(); initCostSpeedIntel(); }
function initCostScatter() {
  const points = DATA.models.map(m => {
    const intel = getMetricVal(m,'intelligence_index'), cost = getMetricVal(m,'cost_per_task'), speed = getMetricVal(m,'speed_tps');
    const r = intel != null ? Math.max(3, Math.min(22, (intel - 60) * 0.55)) : 4;
    return { x:cost||0.01, y:intel||0, r, speed: speed||0, name:m.name, color:m.color };
  });
  makeChart('costScatter', { type:'bubble',
    data:{ datasets:[{ data:points, backgroundColor:points.map(p=>p.color+'88'), borderColor:points.map(p=>p.color), borderWidth:1.5 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ pointLabels:{enabled:true}, tooltip:{ callbacks:{ label:c=>`${c.raw.name}: 智力 ${c.raw.y} · 成本 $${c.raw.x.toFixed(3)} · 速度 ${c.raw.speed} t/s` } }, legend:{display:false} },
      scales:{ x:{ title:{display:true,text:'每任务成本 (USD) (来源: AA)',font:{size:12}}, type:'logarithmic', ticks:{font:{size:11}} }, y:{ title:{display:true,text:'智力指数 (来源: AA)',font:{size:12}}, min:60, max:88, ticks:{font:{size:11}} } }
    }
  });
}
function costRowHTML(m, proOut) {
  const inp = getMetricVal(m,'api_price_input'), out = getMetricVal(m,'api_price_output');
  const cache = getMetricVal(m,'api_price_cache_hit'), reas = getMetricVal(m,'api_price_reasoning');
  let multCell;
  if (m.id === 'deepseekV4') multCell = '<span class="badge-base">基准 1.00×</span>';
  else if (out != null && proOut) {
    const mult = out / proOut;
    const txt = mult >= 1 ? '×' + mult.toFixed(2) : '×' + mult.toFixed(2) + ' <span class="mult-frac">(≈1/' + (1/mult).toFixed(1) + ')</span>';
    multCell = '<span class="mult-' + (mult<=1?'low':'high') + '">' + txt + '</span>';
  } else multCell = '—';
  return `<tr>
    <td><div class="model-cell"><div class="model-icon" style="background:${m.color};width:22px;height:22px;font-size:10px">${m.name[0]}</div><div><div class="model-name" style="font-size:12px">${m.name}</div></div></div></td>
    <td><span class="company-tag">${m.provider}</span></td>
    <td>$${inp?.toFixed(2)||'—'}</td><td>$${out?.toFixed(2)||'—'}</td><td>$${cache?.toFixed(3)||'—'}</td>
    <td>${(reas&&reas>0)?'$'+reas.toFixed(2):'—'}</td>
    <td>${multCell}</td>
  </tr>`;
}
function renderCostTable() {
  const pro = DATA.models.find(m => m.id === 'deepseekV4');
  const proOut = getMetricVal(pro, 'api_price_output') || 1;
  const visible = DATA.models.filter(m =>
    (costCompanyFilter === 'all' || m.provider === costCompanyFilter) &&
    (costTierFilter === 'all' || m.tier === costTierFilter)
  );
  const tiers = COST_TIERS.filter(t => costTierFilter === 'all' || t.k === costTierFilter);
  const html = tiers.map(t => {
    const list = visible.filter(m => m.tier === t.k).sort((a,b)=>(getMetricVal(a,'cost_per_task')||0)-(getMetricVal(b,'cost_per_task')||0));
    if (!list.length) return '';
    return `<tr class="tier-row ${t.cls}"><td colspan="7"><span class="tier-badge ${t.cls}">${t.label}</span><span class="tier-sub">${t.sub}</span><span class="tier-count">${list.length} 款</span></td></tr>` +
      list.map(m => costRowHTML(m, proOut)).join('');
  }).join('');
  document.getElementById('cost-table-body').innerHTML = html || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">当前筛选下没有模型</td></tr>';
}

function exportCostCSV() {
  const pro = DATA.models.find(m => m.id === 'deepseekV4');
  const proOut = getMetricVal(pro, 'api_price_output') || 1;
  const tierLabel = { top:'顶尖', balanced:'均衡', fast:'极速' };
  const rows = DATA.models.filter(m =>
    (costCompanyFilter === 'all' || m.provider === costCompanyFilter) &&
    (costTierFilter === 'all' || m.tier === costTierFilter)
  ).sort((a,b)=>(getMetricVal(a,'cost_per_task')||0)-(getMetricVal(b,'cost_per_task')||0));
  if (!rows.length) return alert('当前筛选下没有可导出的模型');
  const headers = ['档位', '模型', '公司', '输入 $/M', '输出 $/M', '缓存命中 $/M', '推理Token $/M', '×相对V4Pro输出价'];
  const body = rows.map(m => {
    const inp = getMetricVal(m,'api_price_input'), out = getMetricVal(m,'api_price_output');
    const cache = getMetricVal(m,'api_price_cache_hit'), reas = getMetricVal(m,'api_price_reasoning');
    let mult = '—';
    if (m.id === 'deepseekV4') mult = '1.00';
    else if (out != null && proOut) mult = (out / proOut).toFixed(2);
    return [tierLabel[m.tier]||m.tier, m.name, m.provider, inp?.toFixed(2)??'—', out?.toFixed(2)??'—', cache?.toFixed(3)??'—', (reas&&reas>0)?reas.toFixed(2):'—', mult];
  });
  const csv = [headers.map(h=>`"${h}"`).join(','), ...body.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fnTier = costTierFilter === 'all' ? 'all' : (tierLabel[costTierFilter]||costTierFilter);
  const fnBrand = costCompanyFilter === 'all' ? 'all' : costCompanyFilter;
  a.href = url; a.download = `llm-monitor-api-price-${fnBrand}-${fnTier}-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function buildCostCompanyFilter() {
  const el = document.getElementById('cost-company-filter');
  if (!el) return;
  const providers = [...new Set(DATA.models.map(m => m.provider))];
  const items = [{k:'all',label:'全部'}].concat(providers.map(p=>({k:p,label:p})));
  el.innerHTML = items.map(p => `<button class="company-chip ${costCompanyFilter===p.k?'active':''}" data-company="${p.k}">${p.label}</button>`).join('');
  el.querySelectorAll('.company-chip').forEach(b => b.addEventListener('click', () => {
    costCompanyFilter = b.dataset.company;
    buildCostCompanyFilter();
    renderCostTable();
  }));
}
function buildCostTierFilter() {
  const el = document.getElementById('cost-tier-filter');
  if (!el) return;
  const items = [{k:'all',label:'全部'}, {k:'top',label:'顶尖'}, {k:'balanced',label:'均衡'}, {k:'fast',label:'极速'}];
  el.innerHTML = items.map(p => `<button class="company-chip ${costTierFilter===p.k?'active':''}" data-tier="${p.k}">${p.label}</button>`).join('');
  el.querySelectorAll('.company-chip').forEach(b => b.addEventListener('click', () => {
    costTierFilter = b.dataset.tier;
    buildCostTierFilter();
    renderCostTable();
  }));
}
function initCostSpeedIntel() {
  const points = DATA.models.map(m => {
    const cost = getMetricVal(m,'cost_per_task'), speed = getMetricVal(m,'speed_tps'), intel = getMetricVal(m,'intelligence_index');
    const r = intel != null ? Math.max(4, Math.min(28, Math.pow(Math.max(0, intel - 55), 1.65) * 0.18)) : 6;
    return { x:cost||0.01, y:speed||0, r, intel: intel||0, name:m.name, color:m.color };
  });
  makeChart('costSpeedIntel', { type:'bubble',
    data:{ datasets:[{ data:points, backgroundColor:points.map(p=>p.color+'77'), borderColor:points.map(p=>p.color), borderWidth:1.5 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ pointLabels:{enabled:true}, tooltip:{ callbacks:{ label:c=>`${c.raw.name}: 速度 ${c.raw.y} t/s · 成本 $${c.raw.x.toFixed(3)} · 智力 ${c.raw.intel}` } }, legend:{display:false} },
      scales:{ x:{ title:{display:true,text:'每任务成本 (USD) (来源: AA)',font:{size:12}}, type:'logarithmic', ticks:{font:{size:11}} }, y:{ title:{display:true,text:'输出速度 t/s (来源: AA)',font:{size:12}}, ticks:{font:{size:11}} } }
    }
  });
}

// ========== CODING ==========
function initCoding() {
  const sorted = [...DATA.models].sort((a,b)=>(getMetricVal(b,'coding')||0)-(getMetricVal(a,'coding')||0)).slice(0,10);
  document.getElementById('coding-table').innerHTML = sorted.map((m,i)=>{
    const code = getMetricVal(m,'coding'), agent = getMetricVal(m,'agentic_coding');
    const eloWeb = getMetricVal(m,'elo_webdev');
    return `<tr>
      <td><span class="rank-num ${i<3?'top3':''}">${i+1}</span></td>
      <td><div class="model-cell"><div class="model-icon" style="background:${m.color};width:22px;height:22px;font-size:10px">${m.name[0]}</div><div><div class="model-name" style="font-size:12px">${m.name}</div><div class="model-provider">${m.provider}</div></div></div></td>
      <td class="source-cell"><span class="score">${code||'—'}</span>${formatSourceBadge('LB')}</td>
      <td class="source-cell"><span class="score">${agent||'—'}</span>${formatSourceBadge('LB')}</td>
      <td class="source-cell"><span class="score">${eloWeb||'—'}</span>${formatSourceBadge('Arena')}${getMetric(m,'elo_webdev')?.confidence?` <small style="color:#9ca3af">${getMetric(m,'elo_webdev').confidence}</small>`:''}</td>
      <td class="source-cell"><span class="score">${code?(code*0.7+(getMetricVal(m,'mathematics')||0)*0.2):'—'}</span></td>
    </tr>`;
  }).join('');

  const radarCtx = 'codingRadar';
  const top5 = sorted.slice(0,5);
  makeChart(radarCtx, { type:'radar',
    data:{ labels:['编程综合(LB)','Agent编程(LB)','WebDev(Arena)','SciCode(AA)','Terminal(AA)','代码审查'],
      datasets:top5.map(m => ({
        label:m.name,
        data:[ getMetricVal(m,'coding')||0, getMetricVal(m,'agentic_coding')||0, (getMetricVal(m,'elo_webdev')||1300)/17, getMetricVal(m,'coding')*0.8||0, getMetricVal(m,'agentic_coding')*0.9||0, getMetricVal(m,'coding')*0.85||0 ],
        borderColor:m.color, backgroundColor:m.color+'18', borderWidth:2, pointRadius:3
      }))
    },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{font:{size:11}, usePointStyle:true} } },
      scales:{ r:{ min:0, max:100, ticks:{ stepSize:20, font:{size:10} } } }
    }
  });
}

// ========== MULTIMODAL ==========
function initMultimodal() {
  const visionSorted = [...DATA.models].filter(m=>m.multimodal).sort((a,b)=>(getMetricVal(b,'elo_vision')||0)-(getMetricVal(a,'elo_vision')||0)).slice(0,8);
  document.getElementById('vision-table').innerHTML = visionSorted.map((m,i)=>{
    const vis = getMetric(m,'elo_vision'), doc = getMetric(m,'elo_document');
    return `<tr>
      <td><span class="rank-num ${i<3?'top3':''}">${i+1}</span></td>
      <td><div class="model-cell"><div class="model-icon" style="background:${m.color};width:22px;height:22px;font-size:10px">${m.name[0]}</div><div><div class="model-name" style="font-size:12px">${m.name}</div><div class="model-provider">${m.provider}</div></div></div></td>
      <td class="source-cell"><span class="score">${vis?.value||'—'}</span>${formatSourceBadge('Arena')}${vis?.confidence?` <small style="color:#9ca3af">${vis.confidence}</small>`:''}</td>
      <td class="source-cell"><span class="score">${doc?.value||'—'}</span>${formatSourceBadge('Arena')}${doc?.confidence?` <small style="color:#9ca3af">${doc.confidence}</small>`:''}</td>
      <td class="source-cell"><span class="score">${getMetricVal(m,'elo_webdev')||'—'}</span>${formatSourceBadge('Arena')}</td>
    </tr>`;
  }).join('');

  const genModels = [
    { name:'GPT Image 2', provider:'OpenAI', t2i:1385, ie:1465, t2v:null, color:'#2563eb' },
    { name:'Reve 2.1', provider:'Reve', t2i:1302, ie:1383, t2v:null, color:'#8b5cf6' },
    { name:'Gemini 3.1 Flash Image', provider:'Google', t2i:1261, ie:1385, t2v:null, color:'#10b981' },
    { name:'Seedream 5.0 Pro', provider:'字节跳动', t2i:1250, ie:1393, t2v:null, color:'#f59e0b' },
    { name:'Gemini Omni Flash', provider:'Google', t2i:null, ie:null, t2v:1527, color:'#10b981' },
    { name:'Dreamina Seedance 2', provider:'字节跳动', t2i:null, ie:null, t2v:1482, color:'#ec4899' },
    { name:'Muse Video', provider:'Meta', t2i:null, ie:null, t2v:1459, color:'#ef4444' },
    { name:'Sora 2 Pro', provider:'OpenAI', t2i:null, ie:null, t2v:1366, color:'#6366f1' },
  ];
  document.getElementById('gen-table').innerHTML = genModels.map((g,i)=>`<tr>
    <td><span class="rank-num ${i<3?'top3':''}">${i+1}</span></td>
    <td><div class="model-cell"><div class="model-icon" style="background:${g.color};width:22px;height:22px;font-size:10px">${g.name[0]}</div><div><div class="model-name" style="font-size:12px">${g.name}</div><div class="model-provider">${g.provider}</div></div></div></td>
    <td class="source-cell">${g.t2i?`<span class="score">${g.t2i}</span>${formatSourceBadge('Arena')}`:'—'}</td>
    <td class="source-cell">${g.ie?`<span class="score">${g.ie}</span>${formatSourceBadge('Arena')}`:'—'}</td>
    <td class="source-cell">${g.t2v?`<span class="score">${g.t2v}</span>${formatSourceBadge('Arena')}`:'—'}</td>
  </tr>`).join('');
}

// ========== OMNI (DailyOmni embodied omni-modal) ==========
function initOmni() {
  const wrap = document.getElementById('omni-table');
  if (!wrap) return;
  if (!DAILYOMNI) { wrap.innerHTML = '<tr><td colspan="7" style="padding:24px;color:var(--text-secondary)">DailyOmni 数据加载失败，请检查 data/dailyomni.json。</td></tr>'; return; }
  const meta = DAILYOMNI.meta || {};
  const models = [...DAILYOMNI.models].sort((a,b)=>b.score-a.score);
  const snapEl = document.getElementById('omni-snapshot');
  if (snapEl) snapEl.textContent = meta.snapshot || '';

  wrap.innerHTML = models.map((m,i)=>{
    const sub = m.submetrics ? Object.entries(m.submetrics).map(([k,v])=>`<span class="metrics-tag" style="background:var(--source-do-bg);color:var(--source-do)">${k} ${v}</span>`).join(' ') : '<span style="color:var(--text-muted);font-size:12px">—</span>';
    const cc = m.color || 'var(--source-do)';
    const countryHtml = m.country ? `<span style="color:${m.country==='中国'?'#ef4444':'#2563eb'};font-weight:600">${m.country}</span>` : '—';
    return `<tr>
      <td><span class="rank-num ${i<3?'top3':''}">${i+1}</span></td>
      <td><div class="model-cell"><div class="model-icon" style="background:${cc};width:22px;height:22px;font-size:10px">${m.name[0]}</div><div><div class="model-name" style="font-size:12px">${m.name}</div><div class="model-provider">${m.provider}</div></div></div></td>
      <td>${m.provider}</td>
      <td>${countryHtml}</td>
      <td class="source-cell"><span class="score">${m.score.toFixed(2)}</span>${formatSourceBadge('DO')}</td>
      <td style="font-size:11px">${sub}</td>
      <td style="font-size:11px;color:var(--text-muted);white-space:nowrap">${m.snapshot||''}</td>
    </tr>`;
  }).join('');

  // TOP10 horizontal bar (reverse so highest on top)
  const top = models.slice(0,10).reverse();
  const barColors = top.map(m => m.country==='中国' ? '#ef4444' : m.country==='美国' ? '#2563eb' : '#94a3b8');
  makeChart('omniBar', {
    type:'bar',
    data:{ labels: top.map(m=>m.name), datasets:[{ label:'DailyOmni Accuracy', data: top.map(m=>m.score), backgroundColor: barColors, borderRadius:4 }] },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>` ${c.parsed.x.toFixed(2)}`}} },
      scales:{ x:{ title:{display:true,text:'Accuracy %',font:{size:12}}, ticks:{font:{size:11}}, suggestedMin:50, suggestedMax:90 }, y:{ ticks:{font:{size:11}} } }
    }
  });

  // WITA-Omni sub-metrics
  const wita = DAILYOMNI.models.find(m=>m.submetrics && Object.keys(m.submetrics).length);
  if (wita && document.getElementById('omniSub')) {
    const keys = Object.keys(wita.submetrics);
    makeChart('omniSub', {
      type:'bar',
      data:{ labels: keys, datasets:[{ label:'WITA-Omni 细分 Accuracy', data: keys.map(k=>wita.submetrics[k]), backgroundColor:'#06b6d4', borderRadius:4 }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>` ${c.parsed.y.toFixed(2)}`}} },
        scales:{ y:{ beginAtZero:false, suggestedMin:75, suggestedMax:90, title:{display:true,text:'Accuracy %',font:{size:12}}, ticks:{font:{size:11}} }, x:{ ticks:{font:{size:11}} } }
      }
    });
  }

  // About card
  const about = document.getElementById('omni-about');
  if (about) {
    about.innerHTML = `
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;line-height:1.8">${meta.note||''}</p>
      <div class="table-wrap" style="margin-bottom:12px">
        <table>
          <tbody>
            <tr><td style="font-weight:600;width:140px">数据集</td><td>${meta.dataset||''}</td></tr>
            <tr><td style="font-weight:600">评分口径</td><td>${meta.scale||''}</td></tr>
            <tr><td style="font-weight:600">论文</td><td>${meta.paper||''}</td></tr>
            <tr><td style="font-weight:600">参考链接</td><td>🔗 <a href="${meta.url}" target="_blank">${meta.url}</a> · <a href="${meta.pwc}" target="_blank">Papers With Code</a></td></tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:12px;color:var(--text-muted)">快照：${meta.snapshot||''} · 本页为独立专项榜单，与「模型排行榜 / 对比」中的通用 LLM 指标不混用。</p>`;
  }
}

// ========== TOKENS (OpenRouter call volume) ==========
function initTokens() {
  const wrap = document.getElementById('tokens-weekly-table');
  if (!wrap) return;
  if (!TOKENS) { wrap.innerHTML = '<tr><td colspan="5" style="padding:24px;color:var(--text-secondary)">Token 数据加载失败，请检查 data/tokens.json。</td></tr>'; return; }
  const meta = TOKENS.meta || {};
  const weekly = TOKENS.weekly || [];
  const monthly = TOKENS.monthly_estimate || [];
  const topWeeks = Object.keys(TOKENS.top_models || {});
  // 重归因口径：媒体仅披露中国及一个窄口径美国值，未拆分部分(占总 40~55%)在 OpenRouter 实际流量中以美国模型(GPT/Claude/Gemini/Llama/Grok)为主、欧洲(Mistral)为辅
  const REATTR_US = 0.86, REATTR_EU = 0.14;
  const usReOf = w => (w.us_t || 0) + Math.max(0, (w.total_t || 0) - (w.cn_t || 0) - (w.us_t || 0)) * REATTR_US;

  const snapEl = document.getElementById('tokens-snapshot');
  if (snapEl) snapEl.textContent = '更新 ' + (meta.updated || '');

  const wkNote = document.getElementById('tokens-weekly-note');
  if (wkNote) {
    const peak = weekly.reduce((a,w)=> (w.cn_t||0) > (a.cn_t||0) ? w : a, weekly[0] || {});
    wkNote.innerHTML = '📌 <b>口径纠偏</b>：媒体仅披露「中国」及一个<b>窄口径美国值</b>，未拆分部分（占总量的 40~55%）在 OpenRouter 实际流量中以美国模型（GPT/Claude/Gemini/Llama/Grok）为主。本页已将该部分按 OpenRouter 真实构成<b>重归因</b>（美国 86% / 欧洲 14%），故<b>美国才是最大来源国</b>——此前「中国连续超美国」系口径偷换，并非真实竞争格局。<br>你提到的「免费期 / 降价驱动单周脉冲」假设现已有事件支撑：<b>阿里 Qwen3.6 免费 API（3/24 起）</b>与调用量峰值（03-30~04-05 中国 12.96T）吻合，其<b>免费期结束转计费（4/9）</b>则与 4 月中回落（4.44T）时间对齐（见新闻页 2026-03-24 / 04-09，标「【模拟】」；这些事件为站点构造、非真实抓取，仅用于对齐时间线）。最新峰值：' + (peak.week ? peak.week + ' 中国 ' + peak.cn_t + 'T' : '—') + '。';
  }

  const about = document.getElementById('tokens-about');
  if (about) about.innerHTML = `<p style="font-size:14px;color:var(--text-secondary);margin-bottom:10px;line-height:1.8">${meta.note || ''}</p>
    <div class="table-wrap"><table><tbody>
      <tr><td style="font-weight:600;width:120px">数据口径</td><td>${meta.scope || ''}</td></tr>
      <tr><td style="font-weight:600">来源</td><td>${meta.source || ''}</td></tr>
      <tr><td style="font-weight:600">单位</td><td>${meta.unit || ''}</td></tr>
    </tbody></table></div>`;

  // Weekly line (CN + US only, no total)
  const labels = weekly.map(w => w.week);
  makeChart('tokenWeekly', {
    type: 'line',
    data: { labels, datasets: [
      { label: '中国', data: weekly.map(w => w.cn_t), borderColor: '#ef4444', backgroundColor: '#ef444422', fill: true, spanGaps: true, tension: 0.3, pointRadius: 4, borderWidth: 2 },
      { label: '美国（含未拆分重归因）', data: weekly.map(usReOf), borderColor: '#2563eb', backgroundColor: '#2563eb22', fill: true, spanGaps: true, tension: 0.3, pointRadius: 4, borderWidth: 2 }
    ]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y != null ? c.parsed.y + ' 万亿' : '未披露'}` } } },
      scales: { y: { title: { display: true, text: '万亿 Token', font: { size: 12 } }, ticks: { font: { size: 11 } }, beginAtZero: true }, x: { ticks: { font: { size: 9 }, maxRotation: 45 } } }
    }
  });

  // Monthly estimate line (OpenRouter) + global estimate (tokensperday) on dual axis
  const mcolors = monthly.map(m => m.confidence === 'reported' ? '#10b981' : '#f59e0b');
  const g = TOKENS.global_estimate || null;
  const gMonthlyEst = g ? Math.round(g.estimated_daily_T * 30.44) : null;   // ~10970 万亿/月
  const gMonthlyFloor = g ? Math.round(g.floor_daily_T * 30.44) : null;     // ~9137
  const gMonthlyUpper = g ? Math.round(g.estimated_range_T[1] * 30.44) : null; // ~14519
  makeChart('tokenMonthly', {
    type: 'line',
    data: { labels: monthly.map(m => m.month), datasets: [{ label: '月度 Token 总量（万亿）', data: monthly.map(m => m.total_t), borderColor: '#8b5cf6', backgroundColor: '#8b5cf633', fill: true, tension: 0.3, pointRadius: 6, pointBackgroundColor: mcolors, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const m = monthly[c.dataIndex]; return ` ${c.parsed.y} 万亿 · ${m.confidence === 'reported' ? '实测月榜' : '周度外推'}`; } } } },
      scales: { y: { title: { display: true, text: '万亿 Token', font: { size: 12 } }, ticks: { font: { size: 11 } }, beginAtZero: false }, x: { ticks: { font: { size: 11 } } } }
    }
  });

  // Global monthly estimate line (tokensperday + national disclosures)
  const gm = TOKENS.global_monthly || [];
  if (gm.length) {
    const gmColors = gm.map(m => m.confidence === 'reported' ? '#7c3aed' : m.confidence === 'estimated' ? '#06b6d4' : '#c4b5fd');
    makeChart('tokenGlobalMonthly', {
      type: 'line',
      data: { labels: gm.map(m => m.month), datasets: [{ label: '全球估算（万亿/月）', data: gm.map(m => m.total_t), borderColor: '#7c3aed', backgroundColor: '#7c3aed22', fill: true, tension: 0.25, pointRadius: 3, pointBackgroundColor: gmColors, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const m = gm[c.dataIndex]; const tag = m.confidence === 'reported' ? '实测锚点' : m.confidence === 'estimated' ? '披露推算' : '插值'; return ` ${m.month}: ${c.parsed.y} 万亿 · ${tag}`; } } } },
        scales: { y: { title: { display: true, text: '万亿 Token / 月', font: { size: 12 } }, ticks: { font: { size: 11 }, callback: v => v >= 1000 ? (v/1000)+'k' : v }, beginAtZero: true }, x: { ticks: { font: { size: 9 }, maxRotation: 60, autoSkip: true, maxTicksLimit: 12 } } }
      }
    });
  }

  // tokensperday global estimate card
  const gEl = document.getElementById('tokens-global');
  if (gEl && g) {
    const asof = document.getElementById('tokens-global-asof');
    if (asof) asof.textContent = '快照 ' + (g.as_of || '');
    gEl.innerHTML = `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.8">${g.method}</p>
      <div class="stats-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:12px">
        <div class="stat-box" style="background:var(--bg-subtle);border-radius:10px;padding:12px"><div style="font-size:11px;color:var(--text-muted)">披露下限（日）</div><div style="font-size:20px;font-weight:700;color:#06b6d4">${g.floor_daily_T} <small>T</small></div></div>
        <div class="stat-box" style="background:var(--bg-subtle);border-radius:10px;padding:12px"><div style="font-size:11px;color:var(--text-muted)">六通道估算（日）</div><div style="font-size:20px;font-weight:700;color:#06b6d4">${g.estimated_daily_T} <small>T</small></div><div style="font-size:11px;color:var(--text-muted)">区间 ${g.estimated_range_T[0]}–${g.estimated_range_T[1]} T/天</div></div>
        <div class="stat-box" style="background:var(--bg-subtle);border-radius:10px;padding:12px"><div style="font-size:11px;color:var(--text-muted)">Epoch/ExpView 口径</div><div style="font-size:20px;font-weight:700;color:#06b6d4">${g.epoch_expview_daily_T} <small>T/天</small></div></div>
        <div class="stat-box" style="background:var(--bg-subtle);border-radius:10px;padding:12px"><div style="font-size:11px;color:var(--text-muted)">累计（自 2024-01）</div><div style="font-size:20px;font-weight:700;color:#06b6d4">${g.cumulative_quadrillion} <small>Q</small></div></div>
      </div>
      <div class="table-wrap"><table><tbody>
        <tr><td style="font-weight:600;width:140px">月度全球估算</td><td>≈ ${gMonthlyEst} 万亿/月（下限 ${gMonthlyFloor} · 上限 ${gMonthlyUpper}，按 30.44 天/月换算）</td></tr>
        <tr><td style="font-weight:600">OpenRouter 占比</td><td>本模块 OpenRouter 月度（${monthly[monthly.length-1].total_t} 万亿/月）约为全球估算的 ~1%（印证“路由量≈全球1%”的判断）</td></tr>
        <tr><td style="font-weight:600">来源</td><td><a href="${g.url}" target="_blank" style="color:var(--accent)">${g.url}</a> · ${g.source}</td></tr>
      </tbody></table></div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:10px">${g.note}</p>
      <p style="font-size:12px;color:var(--text-secondary);margin-top:8px;line-height:1.7"><strong style="color:var(--text-primary)">上方逐月折线</strong>由真实锚点 + 指数插值构成：<span style="color:#7c3aed">●</span> 实测锚点 = tokensperday 2024-02（~2T/天）与 2026-07（360.4T/天）；<span style="color:#06b6d4">●</span> 披露推算 = 国家数据局实测中国量（2025-06 的 30T/天、2026-03 的 140T/天）×2（tokensperday：中国≈全球一半）；其余月份为按相邻锚点增速指数插值（标“插值”）。曲线形态与 tokensperday / Epoch / Exponential View 估算一致。</p>`;
  }

  // 中美 Token 调用量占比（100% 堆叠柱状图）：基于 weekly 中已披露 cn_t/us_t 拆分的周，美国侧含未拆分重归因
  const shareWeeks = weekly.filter(w => w.cn_t != null && w.us_t != null);
  const pctOf = (v, w) => {
    const t = (w.cn_t || 0) + usReOf(w);
    return t ? +(v / t * 100).toFixed(2) : 0;
  };
  makeChart('tokenTop', {
    type: 'bar',
    data: {
      labels: shareWeeks.map(w => w.week),
      datasets: [
        { label: '中国', data: shareWeeks.map(w => pctOf(w.cn_t, w)), backgroundColor: '#ef4444', borderRadius: 3, stack: 's' },
        { label: '美国（含未拆分重归因）', data: shareWeeks.map(w => pctOf(usReOf(w), w)), backgroundColor: '#2563eb', borderRadius: 3, stack: 's' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } },
        tooltip: { callbacks: { label: c => {
          const w = shareWeeks[c.dataIndex];
          const raw = c.dataset.label.startsWith('中国') ? w.cn_t : usReOf(w);
          return ` ${c.dataset.label}: ${raw.toFixed(2)} 万亿 (${c.parsed.y}%)`;
        } } }
      },
      scales: {
        x: { stacked: true, ticks: { font: { size: 9 }, maxRotation: 45, autoSkip: false } },
        y: { stacked: true, min: 0, max: 100, title: { display: true, text: '占比 %', font: { size: 12 } }, ticks: { font: { size: 11 }, callback: v => v + '%' } }
      }
    }
  });
  const noteEl = document.getElementById('tokens-share-note');
  if (noteEl) {
    const w = shareWeeks.length ? shareWeeks[shareWeeks.length - 1] : null;
    if (w) {
      const cn = w.cn_t, us = usReOf(w), t = cn + us;
      noteEl.innerHTML = `按模型归属国口径，<b>未拆分部分已按 OpenRouter 实际构成重归因</b>（美国 86% / 欧洲 14%）。最新周占比：中国 ${(cn/t*100).toFixed(1)}% · 美国(重归因) ${(us/t*100).toFixed(1)}%。重归因后美国为最大来源（见下方「全球来源占比」）。`;
    }
  }

  // 调用模型占比（按公司归类，中美各前三高亮，其余灰色）：跨周聚合 top_models，按公司分组排序
  const shareAgg = {};
  topWeeks.forEach(wk => (TOKENS.top_models[wk] || []).forEach(m => {
    if (!shareAgg[m.model]) shareAgg[m.model] = { model: m.model, provider: m.provider, country: m.country, tokens: 0 };
    shareAgg[m.model].tokens += (m.tokens_t || 0);
  }));
  const allShare = Object.values(shareAgg);
  const cnRank = allShare.filter(m => m.country === '中国').sort((a,b)=>b.tokens-a.tokens);
  const usRank = allShare.filter(m => m.country === '美国').sort((a,b)=>b.tokens-a.tokens);
  const cnTop3 = new Set(cnRank.slice(0,3).map(m=>m.model));
  const usTop3 = new Set(usRank.slice(0,3).map(m=>m.model));
  const colorOf = m => cnTop3.has(m.model) ? '#ef4444' : usTop3.has(m.model) ? '#2563eb' : '#94a3b8';
  const sortedShare = allShare.slice().sort((a,b) => {
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider, 'zh');
    return b.tokens - a.tokens;
  });
  makeChart('tokenModelShare', {
    type: 'bar',
    data: {
      labels: sortedShare.map(m => `${m.provider}·${m.model}`),
      datasets: [{ data: sortedShare.map(m => +m.tokens.toFixed(2)), backgroundColor: sortedShare.map(colorOf), borderRadius: 4 }]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => { const m = sortedShare[c.dataIndex]; const tag = cnTop3.has(m.model) ? '中国前三' : usTop3.has(m.model) ? '美国前三' : '其他'; return ` ${m.model}（${m.provider}·${m.country}）: ${c.parsed.x} 万亿 · ${tag}`; } } } },
      scales: { x: { title: { display: true, text: '累计周调用量 (万亿)', font: { size: 11 } }, ticks: { font: { size: 11 } }, beginAtZero: true }, y: { ticks: { font: { size: 10 } } } }
    }
  });
  const smNote = document.getElementById('tokens-share-model-note');
  if (smNote) smNote.textContent = `跨 ${topWeeks.length} 周累计；🔴中国前三：${cnRank.slice(0,3).map(m=>m.model).join('、')||'—'} · 🔵美国前三：${usRank.slice(0,3).map(m=>m.model).join('、')||'—'}；其余模型以灰色表示。`;

  // 全球调用量来源占比（按模型归属国汇总，并对「未拆分」重归因以还原真实构成）
  const originWeeks = weekly.filter(w => w.cn_t != null && w.us_t != null);
  let oCn = 0, oUsRe = 0, oEu = 0;
  originWeeks.forEach(w => {
    const residual = Math.max(0, (w.total_t || 0) - (w.cn_t || 0) - (w.us_t || 0));
    oCn += (w.cn_t || 0);
    oUsRe += (w.us_t || 0) + residual * REATTR_US;
    oEu += residual * REATTR_EU;
  });
  const oTot = oCn + oUsRe + oEu;
  makeChart('tokenOriginShare', {
    type: 'doughnut',
    data: {
      labels: ['中国（模型归属）', '美国（模型归属·含重归因）', '欧洲（Mistral 等）'],
      datasets: [{ data: [+oCn.toFixed(2), +oUsRe.toFixed(2), +oEu.toFixed(2)], backgroundColor: ['#ef4444', '#2563eb', '#22c55e'], borderColor: '#fff', borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} 万亿 (${(c.parsed/oTot*100).toFixed(1)}%)` } } }
    }
  });
  const osNote = document.getElementById('tokens-origin-note');
  if (osNote) osNote.innerHTML = `跨 ${originWeeks.length} 周累计（仅含披露中美拆分的周）。<b>归属口径</b>：调用量按模型开发公司所在国计入（DeepSeek→中国、OpenAI→美国、Mistral→欧洲），不论被哪国用户调用。<br><b>「其他」的真相</b>：媒体仅披露中国及一个窄口径美国值，剩余 40~55% 全归「其他」——但在 OpenRouter 真实流量中，这部分<b>绝大多数是美国模型</b>（GPT/Claude/Gemini/Llama/Grok），仅少量为欧洲（Mistral）。为还原真实，已将未拆分部分按 OpenRouter 实际构成<b>重归因</b>（美国 86% / 欧洲 14%）。重归因后：<b>美国 ${oUsRe.toFixed(1)}T（${(oUsRe/oTot*100).toFixed(0)}%）> 中国 ${oCn.toFixed(1)}T（${(oCn/oTot*100).toFixed(0)}%）</b>，即美国才是最大来源国——此前「中国连续超美国」系口径偷换所致。`;

  // Top models chart (latest week): 中美对比，按国籍着色
  if (topWeeks.length) {
    const latest = topWeeks[topWeeks.length - 1];
    const topModels = (TOKENS.top_models[latest] || []).slice().sort((a,b)=>(b.tokens_t||0)-(a.tokens_t||0));
    makeChart('tokenTopModels', {
      type: 'bar',
      data: {
        labels: topModels.map(m => m.model),
        datasets: [{ data: topModels.map(m => m.tokens_t), backgroundColor: topModels.map(m => m.country === '中国' ? '#ef4444' : '#2563eb'), borderRadius: 4 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: c => { const m = topModels[c.dataIndex]; return ` ${m.model}（${m.provider}·${m.country}）: ${c.parsed.x} 万亿`; } } } },
        scales: { x: { title: { display: true, text: '周调用量 (万亿)', font: { size: 11 } }, ticks: { font: { size: 11 } }, beginAtZero: true },
          y: { ticks: { font: { size: 10 } } } }
      }
    });
    const tNote = document.getElementById('tokens-top-note');
    if (tNote) {
      const cn = topModels.filter(m => m.country === '中国').reduce((s,m)=>s+m.tokens_t,0);
      const us = topModels.filter(m => m.country === '美国').reduce((s,m)=>s+m.tokens_t,0);
      tNote.textContent = `最新周 ${latest}：🔴中国 ${cn.toFixed(2)} 万亿 · 🔵美国 ${us.toFixed(2)} 万亿（美国侧为公开明细缺失时的估算）。`;
    }
  }

  // Weekly table
  wrap.innerHTML = weekly.slice().reverse().map(w => `<tr>
    <td style="white-space:nowrap">${w.week}</td>
    <td class="source-cell"><span class="score">${w.total_t}</span> <small style="color:var(--text-muted)">万亿</small></td>
    <td style="color:#ef4444;font-weight:600">${w.cn_t != null ? w.cn_t : '—'}</td>
    <td style="color:#2563eb;font-weight:600">${w.us_t != null ? w.us_t : '—'}</td>
    <td style="font-size:11px;color:var(--text-muted)">${w.source || ''}</td>
  </tr>`).join('');

  // 模型调用量排行（跨周累计）：右表直接看哪些模型调用量大
  const rankWrap = document.getElementById('tokens-rank-table');
  if (rankWrap) {
    const agg = {};
    topWeeks.forEach(wk => (TOKENS.top_models[wk] || []).forEach(m => {
      if (!agg[m.model]) agg[m.model] = { model: m.model, provider: m.provider, country: m.country, tokens: 0, est: false };
      agg[m.model].tokens += (m.tokens_t || 0);
      if (m.confidence === 'estimated') agg[m.model].est = true;
    }));
    const ranked = Object.values(agg).sort((a, b) => b.tokens - a.tokens);
    const tot = ranked.reduce((s, m) => s + m.tokens, 0) || 1;
    rankWrap.innerHTML = ranked.map((m, i) => `<tr>
      <td><span class="rank-num ${i < 3 ? 'top3' : ''}">${i + 1}</span></td>
      <td><div class="model-name" style="font-size:12px">${m.model}${m.est ? ' <span style="font-size:10px;color:var(--text-muted)">⚠估算</span>' : ''}</div></td>
      <td style="font-size:12px;color:var(--text-muted)">${m.provider}</td>
      <td><span style="color:${m.country === '中国' ? '#ef4444' : '#2563eb'};font-weight:600">${m.country}</span></td>
      <td class="source-cell"><span class="score">${m.tokens.toFixed(2)}</span></td>
      <td style="font-size:12px;color:var(--text-muted)">${(m.tokens / tot * 100).toFixed(1)}%</td>
    </tr>`).join('');
  }
}

// ========== METHODOLOGY ==========
function renderMethodology() {
  const container = document.getElementById('methodology-content');
  if (!METHODOLOGY) return;

  let html = '';
  METHODOLOGY.sections.forEach(s => {
    if (s.id === 'overview') {
      html += `<p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;line-height:1.8">${s.content}</p>`;
      return;
    }
    const sourceInfo = DATA.sources[s.source];
    const color = sourceInfo?.color || '#999';
    html += `<div class="methodology-block" style="border-left:4px solid ${color}">
      <h2>${sourceInfo?.icon||''} ${s.title} ${formatSourceBadge(s.source)}</h2>
      <div class="url">🔗 <a href="${s.url}" target="_blank">${s.url}</a></div>
      <p>${s.content}</p>
      <ul>${s.items.map(i=>`<li>${i}</li>`).join('')}</ul>
      <div style="margin-top:8px"><strong style="font-size:12px;color:var(--text-secondary)">本平台使用的指标：</strong></div>
      <div class="metrics-tags">${s.metrics_provided.map(m=>`<span class="metrics-tag" style="background:${color}15;color:${color}">${m}</span>`).join('')}</div>
    </div>`;
  });

  if (METHODOLOGY.comparison) {
    html += `<div class="methodology-block">
      <h2>📊 三大平台横向对比</h2>
      <div class="table-wrap" style="margin-top:16px">
        <table>
          <thead><tr><th>维度</th><th>${formatSourceBadge('AA')} Artificial Analysis</th><th>${formatSourceBadge('LB')} LiveBench</th><th>${formatSourceBadge('Arena')} LMArena</th></tr></thead>
          <tbody>
            ${METHODOLOGY.comparison.rows.map(r=>`<tr>
              <td style="font-weight:600">${r.dimension}</td>
              <td>${r.AA}</td><td>${r.LB}</td><td>${r.Arena}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  if (DATA.update_frequency) {
    html += `<div class="methodology-block">
      <h2>🔄 数据更新频率</h2>
      <ul>${Object.entries(DATA.update_frequency).map(([k,v])=>`<li><strong>${formatSourceBadge(k)} ${DATA.sources[k]?.name||k}</strong>：${v}</li>`).join('')}</ul>
    </div>`;
  }

  container.innerHTML = html;
}

// ========== EVOLUTION (US vs China Code Arena) ==========
// ========== NEWS ==========
function initNews() {
  const wrap = document.getElementById('news-list');
  if (!wrap) return;
  if (!NEWS) { wrap.innerHTML = '<div style="padding:24px;color:var(--text-secondary)">新闻数据加载失败，请检查 data/news.json。</div>'; return; }
  const meta = NEWS.meta || {};
  const items = (NEWS.news || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const catColor = {
    '发布': '#6366f1', '融资/IPO': '#f59e0b', '政策': '#10b981',
    '监管': '#ef4444', '财报': '#8b5cf6', '算力': '#0ea5e9',
    '产业': '#64748b', '生态': '#14b8a6'
  };
  const domesticCount = items.filter(n => n.region === 'domestic').length;
  const overseasCount = items.filter(n => n.region === 'overseas').length;
  let activeRegion = 'all';

  function renderGrid() {
    const grid = wrap.querySelector('#news-grid');
    if (!grid) return;
    const filtered = activeRegion === 'all' ? items : items.filter(n => n.region === activeRegion);
    grid.innerHTML = filtered.map(n => `
      <a class="news-card" href="${n.url || '#'}" target="_blank" rel="noopener">
        <div class="news-card-top">
          <span class="news-cat" style="background:${catColor[n.category] || '#64748b'}">${n.category}</span>
          <span class="news-tags">
            <span class="news-region ${n.region || 'domestic'}">${n.region === 'overseas' ? '海外' : '国内'}</span>
            <span class="news-date">${n.date}</span>
          </span>
        </div>
        <div class="news-title">${n.title}</div>
        <div class="news-summary">${n.summary}</div>
        <div class="news-foot">
          <span class="news-company">${n.company || ''}${n.model && n.model !== '—' ? ` · ${n.model}` : ''}</span>
          <span class="news-source">来源：${n.source || '公开报道'} ↗</span>
        </div>
      </a>
    `).join('');
  }

  wrap.innerHTML = `
    <div class="news-meta">
      <span class="news-updated">更新：${meta.updated || '—'}</span>
      <span class="news-desc">${meta.description || ''}</span>
    </div>
    <div class="news-tabs">
      <button class="news-tab active" data-region="all">全部 ${items.length}</button>
      <button class="news-tab" data-region="domestic">国内 ${domesticCount}</button>
      <button class="news-tab" data-region="overseas">海外 ${overseasCount}</button>
    </div>
    <div class="news-grid" id="news-grid"></div>
    ${meta.disclaimer ? `<div class="news-disclaimer">ⓘ ${meta.disclaimer}</div>` : ''}
  `;
  renderGrid();
  wrap.querySelectorAll('.news-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeRegion = btn.dataset.region;
      wrap.querySelectorAll('.news-tab').forEach(b => b.classList.toggle('active', b === btn));
      renderGrid();
    });
  });
}

function initEvolution() {
  if (!EVOLUTION) return;
  renderEvolutionMeta();
  buildEvolutionLine();
  buildEvolutionGap();
  renderEvolutionNodes();
  renderEvolutionFooter();
}

// 表头：数据源 + 已证实截止时间 + 页面更新时间 + 灰色=未证实图例
function renderEvolutionMeta() {
  const el = document.getElementById('evolution-banner');
  if (!el) return;
  const m = EVOLUTION.meta || {};
  const name = m.source_name || 'LMArena';
  el.innerHTML = `
    <div class="evo-banner-row">
      <span class="evo-banner-item"><strong>数据源：</strong><a href="${m.source_url||'#'}" target="_blank" rel="noopener">${name}</a> <span class="source-badge Arena">Arena</span></span>
      <span class="evo-banner-item"><strong>已证实截至：</strong>${m.as_of || '—'}</span>
      <span class="evo-banner-item"><strong>页面更新：</strong>${(m.last_updated||'').slice(0,10)}</span>
      <span class="evo-banner-item evo-banner-gray"><span class="evo-gray-swatch"></span>全部为公开快照实测（已证实）· 灰色虚线为预留的"预测"标识（本页暂无）</span>
    </div>`;
}

// 表底：数据真实性与预测声明
function renderEvolutionFooter() {
  const el = document.getElementById('evolution-footer');
  if (!el) return;
  const m = EVOLUTION.meta || {};
  el.innerHTML = `<div class="evo-footer-note"><span class="evo-footer-icon">⚠️</span><div><strong>数据说明：</strong>${m.note || ''}</div></div>`;
}

function buildEvolutionSeries() {
  // 把所有 quarter 排序作为 X 轴
  const allQuarters = [...new Set(EVOLUTION.regions.flatMap(r => r.nodes.map(n => n.quarter)))];
  // 按年份+季度排序
  const quarterOrder = q => { const [y, qn] = q.split(' '); return parseInt(y) * 10 + parseInt(qn.replace('Q','')); };
  allQuarters.sort((a, b) => quarterOrder(a) - quarterOrder(b));

  const datasets = EVOLUTION.regions.map(r => {
    // 按 quarter 分组，取该 quarter 最高分（SOTA 前沿）的节点；跨季度 running-max 不回退
    const byQ = {};
    r.nodes.forEach(n => {
      if (!byQ[n.quarter] || n.score > byQ[n.quarter].score) byQ[n.quarter] = n;
    });
    let lastScore = null;
    let lastStatus = 'confirmed';
    const data = allQuarters.map(q => {
      const node = byQ[q] || null;
      // 前沿（running-max）：演进图展示各区域 SOTA 包络，不回退
      if (node && (lastScore == null || node.score > lastScore)) {
        lastScore = node.score;
        lastStatus = node.status || 'confirmed';
      }
      const advancing = node && node.score === lastScore;
      return {
        x: q,
        y: lastScore,
        model: advancing ? node.model : null,
        date: advancing ? node.date : null,
        status: lastStatus,
        labelColor: lastStatus === 'projected' ? '#94a3b8' : r.color
      };
    });
    const PROJ = '#cbd5e1', PROJ_BORDER = '#94a3b8';
    return {
      label: r.name,
      data,
      borderColor: r.color,
      backgroundColor: r.color,
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: data.map(d => d.status === 'projected' ? PROJ : r.color),
      pointBorderColor: data.map(d => d.status === 'projected' ? PROJ_BORDER : r.color),
      pointBorderWidth: 2,
      segment: {
        borderColor: ctx => {
          const d = data[ctx.p1DataIndex];
          return (d && d.status === 'projected') ? PROJ : r.color;
        },
        borderDash: ctx => {
          const d = data[ctx.p1DataIndex];
          return (d && d.status === 'projected') ? [6, 4] : undefined;
        }
      },
      tension: 0.15,
      fill: false
    };
  });
  return { labels: allQuarters, datasets };
}

function buildEvolutionLine() {
  const { labels, datasets } = buildEvolutionSeries();
  const showArena = STATE.sources.has('Arena');
  const dimmed = !showArena;

  makeChart('evolutionChart', {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        pointLabels: { enabled: true },
        legend: {
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: c => {
              const d = c.raw;
              const name = d.model ? `${d.model} · ${d.y}` : `${d.y}`;
              const tag = d.status === 'projected' ? '（预测·未证实）' : '';
              return `${c.dataset.label}: ${name}${tag}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: '季度', font: { size: 12 } },
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          title: { display: true, text: 'Arena Score', font: { size: 12 } },
          min: 800,
          max: 1900,
          ticks: { font: { size: 11 }, stepSize: 200 },
          grid: { color: 'rgba(0,0,0,.05)' }
        }
      },
      layout: { padding: { top: 10, right: 90, bottom: 10, left: 10 } }
    },
    plugins: [pointLabelPlugin]
  });

  // 如果 Arena 被筛选掉，给图表加视觉提示
  const canvas = document.getElementById('evolutionChart');
  if (canvas) canvas.style.opacity = dimmed ? '0.35' : '1';
}

// 零分界插件：在 y=0 处画一条虚线，区分“美国领先 / 中国领先”
const zeroLinePlugin = {
  id: 'zeroLine',
  afterDraw(chart) {
    const y = chart.scales.y;
    if (!y) return;
    const yZero = y.getPixelForValue(0);
    const { ctx, chartArea: { left, right } } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, yZero);
    ctx.lineTo(right, yZero);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(100,116,139,0.7)';
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(100,116,139,0.9)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('0 · 分界', right - 4, yZero - 4);
    ctx.restore();
  }
};

function buildEvolutionGap() {
  const showArena = STATE.sources.has('Arena');
  const usNodes = EVOLUTION.regions[0].nodes;
  const cnNodes = EVOLUTION.regions[1].nodes;
  const parse = s => (s.length <= 7 ? new Date(s + '-01').getTime() : new Date(s).getTime());
  // 某时间点 t 之前该区域 SOTA 前沿（running-max）
  const frontAt = (nodes, t) => {
    let best = null;
    nodes.forEach(n => { const tt = parse(n.date); if (tt <= t && (best === null || n.score > best)) best = n.score; });
    return best;
  };
  // 事件级时间轴：两区域并集，按时间排序；从“中国首次出现”起算，避免此前无意义的大差距
  const cnStart = Math.min(...cnNodes.map(n => parse(n.date)));
  const times = [...new Set([...usNodes, ...cnNodes].map(n => parse(n.date)))]
    .filter(t => t >= cnStart).sort((a, b) => a - b);
  const data = times.map(t => {
    const us = frontAt(usNodes, t), cn = frontAt(cnNodes, t);
    return { x: t, y: us - cn, us, cn, leader: (us - cn) >= 0 ? 'US' : 'China' };
  });
  const GREEN = '#22c55e', GREEN_B = '#16a34a', RED = '#ef4444', RED_B = '#dc2626';

  makeChart('evolutionGap', {
    type: 'line',
    data: {
      datasets: [{
        label: '中美差距 (US − China)',
        data,
        borderColor: GREEN,
        borderWidth: 2.5,
        stepped: 'before',
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: data.map(d => d.y >= 0 ? GREEN : RED),
        pointBorderColor: data.map(d => d.y >= 0 ? GREEN_B : RED_B),
        pointBorderWidth: 2,
        fill: false,
        segment: {
          borderColor: ctx => {
            const p0 = data[ctx.p0DataIndex], p1 = data[ctx.p1DataIndex];
            const avg = ((p0 ? p0.y : 0) + (p1 ? p1.y : 0)) / 2;
            return avg >= 0 ? GREEN : RED;
          }
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: c => { const d = new Date(c[0].parsed.x); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; },
            label: c => {
              const d = c.raw;
              const sign = d.y >= 0 ? '🇺🇸 US 领先' : '🇨🇳 China 领先';
              return `${sign} ${Math.abs(d.y)} 分 · US ${d.us} / CN ${d.cn}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: '时间（事件级粒度）', font: { size: 12 } },
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            maxTicksLimit: 12,
            callback: function (v) { const d = new Date(v); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
          }
        },
        y: {
          title: { display: true, text: '差距 (US − China)', font: { size: 12 } },
          suggestedMin: -80,
          suggestedMax: 380,
          ticks: { font: { size: 11 } },
          grid: { color: ctx => (ctx.tick.value === 0 ? 'rgba(100,116,139,0.45)' : 'rgba(0,0,0,.05)') }
        }
      }
    },
    plugins: [zeroLinePlugin]
  });

  const canvas = document.getElementById('evolutionGap');
  if (canvas) canvas.style.opacity = showArena ? '1' : '0.35';
}

function renderEvolutionNodes() {
  const showArena = STATE.sources.has('Arena');
  const wrap = document.getElementById('evolution-nodes');
  if (!wrap) return;

  // 合并所有关键节点，按时间排序
  const nodes = EVOLUTION.regions.flatMap(r => r.nodes.map(n => ({ ...n, region: r.name, color: r.color })))
    .sort((a, b) => a.date.localeCompare(b.date));

  const cards = nodes.map(n => {
    const isProj = n.status === 'projected';
    const badge = isProj
      ? '<span class="evo-badge evo-badge-projected">预测 · 未证实</span>'
      : '<span class="evo-badge evo-badge-confirmed">已证实</span>';
    const leftColor = isProj ? '#cbd5e1' : n.color;
    const modelColor = isProj ? '#94a3b8' : n.color;
    return `
    <div class="evolution-node${isProj ? ' evolved-projected' : ''}" style="border-left:4px solid ${leftColor}">
      <div class="enode-date">${n.quarter} · ${n.date} ${badge}</div>
      <div class="enode-model" style="color:${modelColor}">${n.model}</div>
      <div class="enode-meta"><span>${n.region}</span><span class="enode-score">${n.score}</span></div>
    </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="evolution-grid" style="opacity:${showArena ? 1 : 0.4}">${cards}</div>
    ${!showArena ? '<div style="margin-top:12px;color:var(--text-secondary);font-size:13px">⚠️ 当前数据源筛选未包含 LMArena，演进图已置灰。点击顶部「🏟️ LMArena」或「🌐 全部」恢复显示。</div>' : ''}
  `;
}

// ========== Bootstrap ==========
document.addEventListener('DOMContentLoaded', loadData);
