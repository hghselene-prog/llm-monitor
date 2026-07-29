// ===== LLM Monitor — Core Logic =====
let DATA = null;
let METHODOLOGY = null;
let EVOLUTION = null;
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
    const [modelsRes, methodRes, evoRes] = await Promise.all([
      fetch('data/models.json', fetchOpts),
      fetch('data/methodology.json', fetchOpts),
      fetch('data/evolution.json', fetchOpts)
    ]);
    DATA = await modelsRes.json();
    METHODOLOGY = await methodRes.json();
    EVOLUTION = await evoRes.json();
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
  else if (name==='methodology') renderMethodology();
  else { initDashboard(); updateSubtitle('dashboard'); }
}

// ========== DASHBOARD ==========
function initDashboard() {
  buildStats();
  renderDashboardCharts();
  renderTop8();
  renderFeeds();
  updateSubtitle('dashboard');
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
  sel.innerHTML = '<option value="">+ 添加模型（多选）</option>' +
    DATA.models.map(m => `<option value="${m.id}">${m.name} — ${m.provider}</option>`).join('');
  renderCompareChips();
  if (compareModels.length > 0) renderCompareContent();
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

  // Radar
  makeChart('radarCompare', { type:'radar',
    data:{ labels:radarMetrics.map(m=>m.label),
      datasets:selected.map(m => ({ label:m.name, data:radarMetrics.map(rm => { const v = getMetricVal(m, rm.key); return v ? Math.min(100,(v/rm.max)*100) : 0; }), borderColor:m.color, backgroundColor:m.color+'18', borderWidth:2, pointRadius:3 }))
    },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{font:{size:11}, usePointStyle:true} } },
      scales:{ r:{ min:0, max:100, ticks:{ stepSize:20, font:{size:10} } } }
    }
  });

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
function initCost() { initCostScatter(); renderCostTable(); initCostSpeedIntel(); }
function initCostScatter() {
  const points = DATA.models.map(m => {
    const intel = getMetricVal(m,'intelligence_index'), cost = getMetricVal(m,'cost_per_task'), speed = getMetricVal(m,'speed_tps');
    return { x:cost||0.01, y:intel||0, r:Math.max(4,(speed||50)/20), name:m.name, color:m.color };
  });
  makeChart('costScatter', { type:'bubble',
    data:{ datasets:[{ data:points, backgroundColor:points.map(p=>p.color+'88'), borderColor:points.map(p=>p.color), borderWidth:1.5 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ pointLabels:{enabled:true}, tooltip:{ callbacks:{ label:c=>`${c.raw.name}: 智力 ${c.raw.y} · $${c.raw.x.toFixed(3)}` } }, legend:{display:false} },
      scales:{ x:{ title:{display:true,text:'每任务成本 (USD) (来源: AA)',font:{size:12}}, type:'logarithmic', ticks:{font:{size:11}} }, y:{ title:{display:true,text:'智力指数 (来源: AA)',font:{size:12}}, min:65, max:86, ticks:{font:{size:11}} } }
    }
  });
}
function renderCostTable() {
  const sorted = [...DATA.models].sort((a,b)=>(getMetricVal(a,'cost_per_task')||0)-(getMetricVal(b,'cost_per_task')||0));
  document.getElementById('cost-table-body').innerHTML = sorted.map(m => {
    const inp = getMetricVal(m,'api_price_input'), out = getMetricVal(m,'api_price_output');
    const cache = getMetricVal(m,'api_price_cache_hit'), reas = getMetricVal(m,'api_price_reasoning');
    return `<tr>
      <td><div class="model-cell"><div class="model-icon" style="background:${m.color};width:22px;height:22px;font-size:10px">${m.name[0]}</div><div><div class="model-name" style="font-size:12px">${m.name}</div><div class="model-provider">${m.provider}</div></div></div></td>
      <td>$${inp?.toFixed(2)||'—'}</td><td>$${out?.toFixed(2)||'—'}</td><td>$${cache?.toFixed(2)||'—'}</td>
      <td>${(reas&&reas>0)?'$'+reas.toFixed(2):'—'}</td>
    </tr>`;
  }).join('');
}
function initCostSpeedIntel() {
  const points = DATA.models.map(m => {
    const cost = getMetricVal(m,'cost_per_task'), speed = getMetricVal(m,'speed_tps'), intel = getMetricVal(m,'intelligence_index');
    return { x:cost||0.01, y:speed||0, r:Math.max(7,(intel||70)/5), name:m.name, color:m.color };
  });
  makeChart('costSpeedIntel', { type:'bubble',
    data:{ datasets:[{ data:points, backgroundColor:points.map(p=>p.color+'77'), borderColor:points.map(p=>p.color), borderWidth:1.5 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ pointLabels:{enabled:true}, tooltip:{ callbacks:{ label:c=>`${c.raw.name}: 速度 ${c.raw.y} t/s · 成本 $${c.raw.x.toFixed(3)} · 智力 ✓` } }, legend:{display:false} },
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
