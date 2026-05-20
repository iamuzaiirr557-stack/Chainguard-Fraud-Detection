// === ChainGuard - Blockchain Fraud Detection Frontend ===

// Typing effect
const phrases = ['Real-Time', 'Seconds', 'Milliseconds', 'Real-Time'];
let phraseIdx = 0, charIdx = 0, deleting = false;
const typingEl = document.getElementById('typing-text');
function typeEffect() {
  const word = phrases[phraseIdx];
  typingEl.textContent = deleting ? word.substring(0, charIdx--) : word.substring(0, charIdx++);
  if (!deleting && charIdx > word.length) { setTimeout(() => { deleting = true; typeEffect(); }, 1800); return; }
  if (deleting && charIdx < 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; }
  setTimeout(typeEffect, deleting ? 40 : 80);
}
typeEffect();

// Navbar scroll
const navbar = document.getElementById('main-nav');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50));

// Hamburger
const hamburger = document.getElementById('nav-hamburger');
const navLinks = document.getElementById('nav-links');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));

// Nav active link
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    navLinks.classList.remove('open');
  });
});

// === DATA GENERATORS ===
const networks = ['Ethereum', 'BSC', 'Polygon', 'Solana', 'Arbitrum', 'Avalanche'];
const netColors = { Ethereum: '#627eea', BSC: '#f0b90b', Polygon: '#8247e5', Solana: '#00ffa3', Arbitrum: '#28a0f0', Avalanche: '#e84142' };
const threats = ['Wash Trading', 'Money Laundering', 'Rug Pull', 'Phishing', 'Flash Loan Attack', 'Sandwich Attack'];
const riskLevels = ['critical', 'high', 'medium', 'low'];

function randHex(len) { let s = '0x'; for (let i = 0; i < len; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)]; return s; }
function randAddr() { return randHex(6) + '...' + randHex(4); }
function randFloat(min, max, dec = 2) { return (Math.random() * (max - min) + min).toFixed(dec); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// === LIVE MONITOR (REAL API DATA) ===
const feedBody = document.getElementById('feed-body');
let feedPaused = false;
let realTxQueue = [];  // Queue of real transactions to display
let lastEthBlock = 0;
let totalRealTx = 0, totalFlagged = 0;

const pauseBtn = document.getElementById('monitor-pause-btn');
pauseBtn.addEventListener('click', () => {
  feedPaused = !feedPaused;
  pauseBtn.innerHTML = feedPaused
    ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polygon points="4,2 14,8 4,14" fill="currentColor"/></svg> Resume'
    : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor"/><rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor"/></svg> Pause Feed';
});

function truncate(s, start=6, end=4) {
  if (!s || s.length < start+end+3) return s || 'Unknown';
  return s.substring(0, start) + '...' + s.slice(-end);
}

function addRealFeedRow(data) {
  if (feedPaused) return;
  const tx = data.transaction;
  const analysis = data.analysis;
  
  const statuses = { 
    critical:['Gemini Alert','status-flagged'], 
    high:['Monitoring','status-monitoring'], 
    medium:['Monitoring','status-monitoring'], 
    low:['Clear','status-clear'] 
  };
  
  const statusInfo = statuses[analysis.risk] || statuses.low;
  const statusText = statusInfo[0];
  const statusClass = statusInfo[1];
  
  totalRealTx++;
  if (analysis.risk === 'critical' || analysis.risk === 'high') totalFlagged++;
  
  const row = document.createElement('div');
  row.className = 'feed-row';
  row.dataset.network = tx.network.toLowerCase();
  row.dataset.risk = analysis.risk.toLowerCase();
  row.innerHTML = `
    <span class="feed-hash" title="${tx.hash}">${truncate(tx.hash, 8, 4)}</span>
    <span class="feed-network"><span class="network-dot" style="background:${tx.networkColor}"></span>${tx.network}</span>
    <span class="feed-addresses">${truncate(tx.from)} → ${truncate(tx.to)}</span>
    <span>${parseFloat(tx.value).toFixed(4)} ${tx.network === 'Solana' ? 'SOL' : tx.network === 'BSC' ? 'BNB' : tx.network === 'Polygon' ? 'MATIC' : tx.network === 'Avalanche' ? 'AVAX' : 'ETH'}</span>
    <span><span class="risk-badge risk-${analysis.risk}">${analysis.score} / 100</span></span>
    <span class="status-badge ${statusClass}" title="${analysis.explanation}">${statusText}</span>
  `;

  if (analysis.risk === 'critical' || analysis.risk === 'high') {
    const explRow = document.createElement('div');
    explRow.className = 'feed-expl-row';
    explRow.dataset.network = tx.network.toLowerCase();
    explRow.dataset.risk = analysis.risk.toLowerCase();
    explRow.style.gridColumn = '1 / -1';
    explRow.style.padding = '8px 12px';
    explRow.style.background = 'rgba(244, 63, 94, 0.1)';
    explRow.style.borderLeft = '3px solid #f43f5e';
    explRow.style.marginTop = '4px';
    explRow.style.marginBottom = '8px';
    explRow.style.borderRadius = '0 4px 4px 0';
    explRow.style.fontSize = '0.85rem';
    explRow.innerHTML = `<strong style="color:#f43f5e;">Gemini AI:</strong> ${analysis.explanation}`;
    
    const container = document.createElement('div');
    container.appendChild(row);
    container.appendChild(explRow);
    feedBody.prepend(container);
  } else {
    feedBody.prepend(row);
  }

  if (feedBody.children.length > 50) {
    feedBody.lastChild.remove();
  }

  document.getElementById('dashboard-total-tx').textContent = totalRealTx.toLocaleString();
  document.getElementById('dashboard-fraud').textContent = totalFlagged;
  
  applyFeedFilters();
}

// FILTER LOGIC
function applyFeedFilters() {
  const netFilter = document.getElementById('monitor-network').value.toLowerCase();
  const riskFilter = document.getElementById('monitor-risk').value.toLowerCase();
  
  const rows = feedBody.querySelectorAll('.feed-row, .feed-expl-row');
  rows.forEach(row => {
    const rNet = row.dataset.network;
    const rRisk = row.dataset.risk;
    let show = true;
    
    if (netFilter !== 'all' && rNet !== netFilter) show = false;
    if (riskFilter !== 'all' && rRisk !== riskFilter) show = false;
    
    row.style.display = show ? '' : 'none';
  });
}

document.getElementById('monitor-network').addEventListener('change', applyFeedFilters);
document.getElementById('monitor-risk').addEventListener('change', applyFeedFilters);

// WebSocket Integration for Gemini AI
function initWebSocket() {
  const ws = new WebSocket('ws://127.0.0.1:8000/ws/feed');
  ws.onmessage = (event) => {
    addRealFeedRow(JSON.parse(event.data));
  };
  ws.onerror = (e) => console.error("WebSocket Error:", e);
  ws.onclose = () => {
    console.log("WebSocket Disconnected. Reconnecting...");
    setTimeout(initWebSocket, 3000);
  };
}
initWebSocket();

// === TX SCANNER ===
const scannerBtn = document.getElementById('scanner-btn');
const scannerInput = document.getElementById('scanner-input');
const resultsEl = document.getElementById('scanner-results');

scannerBtn.addEventListener('click', async () => {
  const val = scannerInput.value.trim() || '0x7a9f3cd8b2e1d4f56a8c0b3e7d2f1a9c8b5e4d3f';
  const chain = document.getElementById('scanner-chain').value;
  resultsEl.style.display = 'grid';

  // Fallback simulated scan since we are in simplified UI mode
  const score = Math.floor(Math.random() * 100);
  const risk = score > 70 ? 'critical' : score > 40 ? 'high' : score > 20 ? 'medium' : 'low';
  const cls = score > 70 ? 'Critical Risk' : score > 40 ? 'High Risk' : 'Low Risk';
  const threat = score > 30 ? pick(threats) : 'None Detected';
  const confidence = parseFloat(randFloat(85, 99.9, 1));
  const allFlags = [
    { icon: '⚠️', cls: 'warn', title: 'Unusual Gas Pattern', desc: 'Transaction gas price 340% above network average' },
    { icon: '🚨', cls: 'danger', title: 'Known Mixer Interaction', desc: 'Source address interacted with Tornado Cash 3 times' },
    { icon: '⚠️', cls: 'warn', title: 'New Address', desc: 'Destination wallet created < 24 hours ago' },
    { icon: '🚨', cls: 'danger', title: 'Value Splitting', desc: 'Amount split across 12 transactions in 5 minutes' }
  ];
  const flags = allFlags.slice(0, score > 60 ? 4 : score > 30 ? 2 : 1);

  const progress = document.getElementById('gauge-progress');
  const gaugeVal = document.getElementById('gauge-value');
  const offset = 327 - (327 * score / 100);
  progress.style.transition = 'stroke-dashoffset 1.5s ease';
  progress.setAttribute('stroke-dashoffset', offset);
  gaugeVal.textContent = score;
  gaugeVal.style.color = score > 70 ? '#f43f5e' : score > 40 ? '#f59e0b' : '#10b981';

  document.getElementById('result-hash').textContent = val.length > 20 ? val.substring(0, 10) + '...' + val.slice(-8) : val;
  document.getElementById('result-network').textContent = chain;
  document.getElementById('result-classification').innerHTML = `<span style="color:${score > 70 ? '#f43f5e' : score > 40 ? '#f59e0b' : '#10b981'}">${cls}</span>`;
  document.getElementById('result-threat-type').textContent = threat;
  document.getElementById('result-confidence').textContent = confidence + '%';

  const flagsList = document.getElementById('flags-list');
  flagsList.innerHTML = flags.map(f => `
    <div class="flag-item"><div class="flag-icon ${f.cls}">${f.icon}</div>
    <div class="flag-text"><strong>${f.title}</strong>${f.desc}</div></div>`).join('');

  drawFlowGraph();
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Hero scan button
document.getElementById('hero-scan-btn').addEventListener('click', () => {
  document.getElementById('scanner').scrollIntoView({ behavior: 'smooth' });
  scannerInput.focus();
});

// === CHARTS (Canvas-based, no dependencies) ===
function drawLineChart(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  const pad = { t: 20, r: 20, b: 30, l: 40 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const max = Math.max(...data) * 1.1, min = Math.min(...data) * 0.9;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = pad.t + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px Inter';
    ctx.fillText(Math.round(max - (max - min) * i / 4), 4, y + 4);
  }

  // Line
  const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'transparent');
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad.l + (cw / (data.length - 1)) * i;
    const y = pad.t + ch - ((v - min) / (max - min)) * ch;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Fill
  const lastX = pad.l + cw;
  ctx.lineTo(lastX, pad.t + ch);
  ctx.lineTo(pad.l, pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.15;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawDonutChart(canvasId, segments) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = Math.min(rect.height, 200) * dpr;
  ctx.scale(dpr, dpr);
  const size = Math.min(rect.width, 200);
  const cx = rect.width / 2, cy = size / 2;
  const r = size / 2 - 15, inner = r * 0.6;
  let angle = -Math.PI / 2;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  segments.forEach(seg => {
    const slice = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.arc(cx, cy, inner, angle + slice, angle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    angle += slice;
  });
  ctx.fillStyle = '#0a0b14';
  ctx.beginPath();
  ctx.arc(cx, cy, inner - 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlowGraph() {
  const canvas = document.getElementById('flow-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  const nodes = [
    { x: 60, y: h / 2, label: 'Source', color: '#f43f5e' },
    { x: w * 0.3, y: h * 0.25, label: 'Mixer', color: '#f59e0b' },
    { x: w * 0.3, y: h * 0.75, label: 'Relay', color: '#f59e0b' },
    { x: w * 0.6, y: h * 0.2, label: 'Wallet A', color: '#8b5cf6' },
    { x: w * 0.6, y: h * 0.5, label: 'Wallet B', color: '#8b5cf6' },
    { x: w * 0.6, y: h * 0.8, label: 'Wallet C', color: '#8b5cf6' },
    { x: w - 60, y: h / 2, label: 'Target', color: '#f43f5e' },
  ];
  const edges = [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[5,6]];
  edges.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(nodes[a].x, nodes[a].y);
    ctx.lineTo(nodes[b].x, nodes[b].y);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = n.color + '22';
    ctx.fill();
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(n.label, n.x, n.y + 32);
  });
}

// Generate chart data
const fraudData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 80 + 20));
const donutSegments = [
  { value: 35, color: '#f43f5e' }, { value: 25, color: '#f59e0b' },
  { value: 18, color: '#8b5cf6' }, { value: 14, color: '#06b6d4' }, { value: 8, color: '#10b981' },
];

function renderCharts() {
  drawLineChart('fraud-trend-chart', fraudData, '#00f0ff');
  drawDonutChart('threat-dist-chart', donutSegments);
}

// Chart range buttons
document.querySelectorAll('.chart-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const newData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 80 + 20));
    drawLineChart('fraud-trend-chart', newData, '#00f0ff');
  });
});

// === ANALYTICS ===
function renderNetworkBars() {
  const container = document.getElementById('network-bars');
  const data = [
    { name: 'Ethereum', pct: 78, color: '#627eea' },
    { name: 'BSC', pct: 62, color: '#f0b90b' },
    { name: 'Polygon', pct: 45, color: '#8247e5' },
    { name: 'Solana', pct: 54, color: '#00ffa3' },
    { name: 'Arbitrum', pct: 33, color: '#28a0f0' },
    { name: 'Avalanche', pct: 28, color: '#e84142' },
  ];
  container.innerHTML = data.map(d => `
    <div class="network-bar-item">
      <span class="network-bar-label">${d.name}</span>
      <div class="network-bar-track">
        <div class="network-bar-fill" style="width:0%;background:${d.color}" data-width="${d.pct}%">${d.pct}%</div>
      </div>
    </div>`).join('');

  setTimeout(() => {
    container.querySelectorAll('.network-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  }, 300);
}

function renderThreatTable() {
  const tbody = document.getElementById('threat-table-body');
  const rows = [];
  for (let i = 1; i <= 8; i++) {
    const score = Math.floor(Math.random() * 40 + 60);
    const risk = score > 85 ? 'critical' : score > 70 ? 'high' : 'medium';
    const net = pick(networks);
    rows.push(`<tr>
      <td>#${i}</td>
      <td class="mono" style="color:var(--cyan);font-size:.8rem">${randHex(10)}...${randHex(4)}</td>
      <td><span class="feed-network"><span class="network-dot" style="background:${netColors[net]}"></span>${net}</span></td>
      <td>${Math.floor(Math.random() * 200 + 10)}</td>
      <td>${randFloat(10, 5000)} ETH</td>
      <td><span class="risk-badge risk-${risk}">${score}</span></td>
      <td><span class="status-badge status-flagged">Flagged</span></td>
    </tr>`);
  }
  tbody.innerHTML = rows.join('');
}

// Heatmap
function drawHeatmap() {
  const canvas = document.getElementById('heatmap-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const cols = 24, rows = 7;
  const cellW = (rect.width - 40) / cols, cellH = (rect.height - 30) / rows;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  ctx.font = '10px Inter';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  days.forEach((d, i) => ctx.fillText(d, 0, 20 + i * cellH + cellH / 2 + 3));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const intensity = Math.random();
      const red = Math.floor(intensity * 244);
      const green = Math.floor((1 - intensity) * 100);
      ctx.fillStyle = `rgba(${red > 150 ? red : 0}, ${intensity < 0.3 ? 185 : green}, ${intensity < 0.3 ? 129 : intensity > 0.7 ? 94 : 11}, ${0.3 + intensity * 0.7})`;
      ctx.beginPath();
      ctx.roundRect(35 + c * cellW + 1, 8 + r * cellH + 1, cellW - 2, cellH - 2, 3);
      ctx.fill();
    }
  }
}

// === ALERTS ===
function renderAlerts() {
  const container = document.getElementById('alerts-feed');
  const alertsData = [
    { type: 'critical', icon: '🚨', title: 'Rug Pull Detected — DeFi Protocol XYZ', desc: 'Liquidity removed from pool. $4.2M drained in 3 transactions. All associated wallets flagged.', time: '2 min ago', chain: 'Ethereum' },
    { type: 'critical', icon: '🚨', title: 'Flash Loan Attack in Progress', desc: 'Suspicious flash loan activity detected on Aave V3. Multiple price oracle manipulations observed.', time: '8 min ago', chain: 'Arbitrum' },
    { type: 'warning', icon: '⚠️', title: 'Wash Trading Pattern Identified', desc: 'NFT collection "CryptoApes" showing circular trading between 5 wallets. Volume artificially inflated 1200%.', time: '15 min ago', chain: 'Ethereum' },
    { type: 'warning', icon: '⚠️', title: 'Mixer Service Usage Spike', desc: 'Tornado Cash interactions up 340% in the last hour. 23 flagged addresses involved.', time: '32 min ago', chain: 'Polygon' },
    { type: 'info', icon: 'ℹ️', title: 'New Smart Contract Flagged', desc: 'Unverified contract deployed with suspicious bytecode patterns matching known phishing templates.', time: '1 hr ago', chain: 'BSC' },
    { type: 'info', icon: 'ℹ️', title: 'Whale Movement Alert', desc: 'Large transfer of 15,000 ETH from unknown wallet to Binance. Source address has no prior history.', time: '2 hr ago', chain: 'Ethereum' },
  ];
  container.innerHTML = alertsData.map(a => `
    <div class="alert-card">
      <div class="alert-icon ${a.type}">${a.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.desc}</div>
        <div class="alert-meta">
          <span>${a.chain}</span>
          <span class="alert-time">${a.time}</span>
        </div>
      </div>
    </div>`).join('');
}

// === BLOCKCHAIN CANVAS ANIMATION ===
function initBlockchainViz() {
  const canvas = document.getElementById('blockchain-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  let w, h;
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
  }
  resize();

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
    r: Math.random() * 2 + 1,
    color: pick(['#00f0ff', '#7c3aed', '#f43f5e', '#10b981', '#f59e0b']),
  }));

  function animate() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    });
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,240,255,${0.15 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    // Draw particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    requestAnimationFrame(animate);
  }
  animate();
  window.addEventListener('resize', () => { resize(); });
}

// === COUNTER ANIMATION ===
function animateCounters() {
  const counters = [
    { el: document.getElementById('stat-scanned'), target: 2400000, suffix: '+', prefix: '', dec: 0 },
    { el: document.getElementById('stat-flagged'), target: 18700, suffix: '', prefix: '', dec: 0 },
  ];
  counters.forEach(c => {
    if (!c.el) return;
    let current = 0;
    const step = c.target / 60;
    const interval = setInterval(() => {
      current += step;
      if (current >= c.target) { current = c.target; clearInterval(interval); }
      let display = current >= 1000000
        ? (current / 1000000).toFixed(1) + 'M'
        : current >= 1000 ? (current / 1000).toFixed(1) + 'K' : Math.floor(current).toString();
      c.el.textContent = display + c.suffix;
    }, 30);
  });
}

// === METAMASK PORTAL ===
async function connectMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      const networkId = await window.ethereum.request({ method: 'net_version' });
      const balanceHex = await window.ethereum.request({ method: 'eth_getBalance', params: [account, 'latest'] });
      const balance = (parseInt(balanceHex, 16) / 1e18).toFixed(4);

      // Update UI
      document.getElementById('wallet-status-title').textContent = 'Wallet Connected';
      document.getElementById('wallet-status-desc').textContent = 'Your MetaMask is securely linked to ChainGuard.';
      document.getElementById('portal-connect-btn').style.display = 'none';
      document.getElementById('wallet-details').style.display = 'block';
      document.getElementById('wallet-address').textContent = account;
      document.getElementById('wallet-network').textContent = networkId === '1' ? 'Ethereum Mainnet' : networkId === '11155111' ? 'Sepolia Testnet' : 'Network ID: ' + networkId;
      document.getElementById('wallet-balance').textContent = balance + ' ETH';

      // Show admin controls (in a real app, verify owner on-chain)
      document.getElementById('admin-actions').style.display = 'block';

      // Update global connect button
      const navBtn = document.getElementById('connect-wallet-btn');
      navBtn.innerHTML = `<span class="status-dot live" style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block"></span> ${account.substring(0,6)}...${account.slice(-4)}`;
      navBtn.classList.remove('btn-glow');
      navBtn.style.background = 'rgba(16,185,129,0.1)';

    } catch (error) {
      console.error('User rejected connection', error);
      alert('Failed to connect MetaMask: ' + error.message);
    }
  } else {
    alert('MetaMask is not installed. Please install it to use this feature.');
  }
}

document.getElementById('portal-connect-btn').addEventListener('click', connectMetaMask);
document.getElementById('connect-wallet-btn').addEventListener('click', connectMetaMask);

document.getElementById('submit-block-btn').addEventListener('click', async () => {
  const hash = document.getElementById('block-hash-input').value.trim();
  const reason = document.getElementById('block-reason-input').value.trim();
  if (!hash || !reason) return alert('Please fill in all fields');
  
  const connectedAccount = document.getElementById('wallet-address').textContent;
  const reporter = connectedAccount !== '0x...' ? connectedAccount : '0x9497e5512bc85A9A74E5104E9923838D64a8561C';
  const itemType = hash.length > 44 ? 'hash' : 'address';

  try {
    const res = await fetch('http://127.0.0.1:8000/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: hash,
        item_type: itemType,
        reason: reason,
        reported_by: reporter
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to blacklist');
    }
    alert(`Blacklist Submitted!\n\nKey: ${hash}\nReason: ${reason}\n\nSaved permanently to the Python backend SQLite database!`);
    document.getElementById('block-hash-input').value = '';
    document.getElementById('block-reason-input').value = '';
    
    // Reload database table
    await loadDatabaseBlacklist();
  } catch (e) {
    console.warn('Backend blacklist failed, simulating instead:', e);
    alert(`Blacklist Simulation (Backend Down):\nRequesting on-chain block for:\nHash: ${hash}\nReason: ${reason}`);
  }
});

// === BLOCKED HASHES DATABASE TABLE ===
async function loadDatabaseBlacklist() {
  const container = document.getElementById('blocked-hashes-body');
  let blockedData = [
    { hash: '0x7a9f3cd8b2e1d4f5...d2f1a9c8', reason: 'Verified Phishing Source', network: 'Ethereum', date: '2026-05-14' },
    { hash: '0x1b4e92b5e4d3f7a3...7a3c8b2e', reason: 'Rug Pull Contract', network: 'BSC', date: '2026-05-14' },
    { hash: '0x8d2f1ac9b5e4d3f7...a9c8b5e4', reason: 'Mixer Service (Blacklisted)', network: 'Ethereum', date: '2026-05-13' },
    { hash: '0x5e4d3f7a3c8b2ef1...7c8b2ef1', reason: 'Exploit Drainer', network: 'Polygon', date: '2026-05-13' },
    { hash: '0x3c8b2ef1a9c8b5e4...f1a9c8b5', reason: 'Governance Attack Actor', network: 'Arbitrum', date: '2026-05-12' },
    { hash: '0xf1a9c8b5e4d3f7a3...b5e4d3f7', reason: 'Known Malware Wallet', network: 'Solana', date: '2026-05-12' }
  ];

  try {
    const res = await fetch('http://127.0.0.1:8000/api/blacklist');
    if (res.ok) {
      const dbItems = await res.json();
      const mappedDb = dbItems.map(item => ({
        hash: item.key.length > 24 ? item.key.substring(0, 10) + '...' + item.key.slice(-8) : item.key,
        reason: item.reason,
        network: item.item_type === 'address' ? 'Ethereum' : 'Polygon',
        date: new Date(item.timestamp).toISOString().split('T')[0]
      }));
      blockedData = [...mappedDb, ...blockedData];
    }
  } catch (e) {
    console.warn('Could not fetch blacklist from backend:', e);
  }

  container.innerHTML = blockedData.map(b => `
    <div class="blocked-row">
      <span class="blocked-hash" title="${b.hash}">${b.hash}</span>
      <span class="blocked-reason">${b.reason}</span>
      <span class="blocked-network">${b.network}</span>
      <span class="blocked-date">${b.date}</span>
      <div class="blocked-action">
        <button class="btn-view">Details</button>
      </div>
    </div>`).join('');
}

// === INIT ===
window.addEventListener('DOMContentLoaded', async () => {
  renderCharts();
  renderNetworkBars();
  renderThreatTable();
  renderAlerts();
  await loadDatabaseBlacklist();
  drawHeatmap();
  initBlockchainViz();
  animateCounters();

  // Initialize simulated dashboard stats for fresh UI
  document.getElementById('dashboard-risk').textContent = Math.floor(Math.random() * 20 + 20) + ' gwei';
  document.getElementById('stat-chains').textContent = Math.floor(Math.random() * 2000 + 1000) + ' TPS';
});

window.addEventListener('resize', () => {
  renderCharts();
  drawHeatmap();
});
