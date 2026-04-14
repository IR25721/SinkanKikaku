/**
 * Information Geometry Game — 統計多様体上の測地線
 * Visualizes the Fisher information metric and geodesics on the Normal distribution manifold.
 */
import { createGameLayout } from './GameLayout.js';
import { linspace, jStat } from '../stats/distributions.js';
import {
  Chart,
  ScatterController,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Filler,
} from 'chart.js';

Chart.register(
  ScatterController,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Filler
);

// Custom Chart.js Plugin for drawing Curved Grid (Hyperbolic geodesics)
const hyperbolicGridPlugin = {
  id: 'hyperbolicGrid',
  beforeDatasetsDraw(chart, args, options) {
    const { ctx, chartArea, scales: { x, y } } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
    ctx.clip();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    
    // Draw vertical geodesics (mu = const)
    for (let mu = -20; mu <= 20; mu += 2) {
      ctx.beginPath();
      ctx.moveTo(x.getPixelForValue(mu), y.getPixelForValue(0));
      ctx.lineTo(x.getPixelForValue(mu), y.getPixelForValue(20));
      ctx.stroke();
    }
    
    // Draw half-ellipse geodesics
    const centers = [-15, -10, -5, 0, 5, 10, 15];
    for (let R = 2; R <= 30; R += 2) {
      for (const mu_c of centers) {
        ctx.beginPath();
        for (let theta = 0; theta <= Math.PI; theta += 0.05) {
          const px = mu_c + R * Math.cos(theta);
          const py = (R / Math.SQRT2) * Math.sin(theta);
          if (theta === 0) ctx.moveTo(x.getPixelForValue(px), y.getPixelForValue(py));
          else ctx.lineTo(x.getPixelForValue(px), y.getPixelForValue(py));
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};
Chart.register(hyperbolicGridPlugin);

const GAME_ID = 'infogeo';
let animationId = null;
let isRunning = false;
let animProgress = 0; // 0 to 1

// Active geodesic parameters
let geoData = {
  type: 'none', // 'vertical' or 'ellipse'
  mu1: 0, sigma1: 5,
  mu2: 0, sigma2: 5,
  mu_c: 0, R: 0,
  theta1: 0, theta2: 0,
};
let trajectory = [];

export function render(container) {
  const layout = createGameLayout({
    id: '/infogeo',
    emoji: '📐',
    title: '統計多様体と測地線',
    distribution: '情報幾何学 (Information Geometry)',
    color: 'normal',
  });

  // Hide default stats grids to reduce clutter as requested
  if (layout.statsGrid) layout.statsGrid.style.display = 'none';
  if (layout.statsRows && layout.statsRows.parentElement) {
    layout.statsRows.parentElement.style.display = 'none';
  }

  // Customize the game area for two-pane visualization
  layout.gameArea.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px; align-items:center; width:100%;">
      <p class="game-area-instruction">測地線とは「2つの分布を結ぶ最も自然な経路（曲がった空間における直線）」である.</p>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; width:100%; min-height:300px;">
        <div class="stats-panel" style="flex:1;">
          <div class="stats-panel-title">パラメータ空間 (μ, σ) - 双曲幾何学</div>
          <div style="height:280px;"><canvas id="param-canvas"></canvas></div>
        </div>
        <div class="stats-panel" style="flex:1;">
          <div class="stats-panel-title">確率密度関数 f(x; μ, σ)</div>
          <div style="height:280px;"><canvas id="pdf-canvas"></canvas></div>
        </div>
      </div>

      <div class="stats-panel" style="width:100%; max-width:600px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
          <!-- Dist A -->
          <div>
            <h3 style="margin:0 0 12px 0; color:var(--text-accent); font-size:1rem;">分布 A (始点)</h3>
            <div class="slider-container">
              <label style="font-size:0.8rem; color:var(--text-secondary);">平均 μ_A</label>
              <input type="range" id="muA-init" min="-10" max="10" value="-5" step="0.1" style="width:100%;">
              <div id="muA-val" style="font-family:var(--font-mono); font-size:0.8rem; text-align:right;">-5.0</div>
            </div>
            <div class="slider-container">
              <label style="font-size:0.8rem; color:var(--text-secondary);">標準偏差 σ_A</label>
              <input type="range" id="sigmaA-init" min="0.5" max="10" value="2" step="0.1" style="width:100%;">
              <div id="sigmaA-val" style="font-family:var(--font-mono); font-size:0.8rem; text-align:right;">2.0</div>
            </div>
          </div>
          <!-- Dist B -->
          <div>
            <h3 style="margin:0 0 12px 0; color:#ec4899; font-size:1rem;">分布 B (終点)</h3>
            <div class="slider-container">
              <label style="font-size:0.8rem; color:var(--text-secondary);">平均 μ_B</label>
              <input type="range" id="muB-init" min="-10" max="10" value="5" step="0.1" style="width:100%;">
              <div id="muB-val" style="font-family:var(--font-mono); font-size:0.8rem; text-align:right;">5.0</div>
            </div>
            <div class="slider-container">
              <label style="font-size:0.8rem; color:var(--text-secondary);">標準偏差 σ_B</label>
              <input type="range" id="sigmaB-init" min="0.5" max="10" value="2" step="0.1" style="width:100%;">
              <div id="sigmaB-val" style="font-family:var(--font-mono); font-size:0.8rem; text-align:right;">2.0</div>
            </div>
          </div>
        </div>
        <div style="display:flex; justify-content:center; gap:12px; margin-top:20px;">
          <button class="game-btn" id="start-btn">測地線をシミュレート</button>
        </div>
      </div>
    </div>
  `;

  // Documentation
  layout.explainArea.appendChild(
    renderExplainCard({
      title: '統計多様体と測地線 (Statistical Manifold & Geodesics)',
      description:
        '確率分布の集合にFisher情報行列を「計量」として導入した空間を統計多様体と呼ぶ. ' +
        '正規分布 $N(\\mu, \\sigma^2)$ の空間は,負の定曲率を持つ双曲幾何学的なモデル（ポアンカレ上半平面に相当）となる. ' +
        'そのため,2つのパラメータ間の「最短距離（測地線）」は直線ではなく,直交する直線か半楕円となる. ' +
        'パラメータを測地線に沿って変化させると,分布の中間状態は分散が一旦膨張するような自然な変化をたどる.',
      formula: 'ds^2 = \\frac{d\\mu^2 + 2d\\sigma^2}{\\sigma^2}',
      tags: ['情報幾何学', 'Fisher情報量', '測地線', '双曲空間', '解析解'],
      realWorld: '機械学習の自然勾配法 (Natural Gradient),最適輸送問題でのWasserstein距離との比較,統計推論',
    })
  );

  container.appendChild(layout.container);

  // Charts
  const paramCtx = container.querySelector('#param-canvas').getContext('2d');
  const pdfCtx = container.querySelector('#pdf-canvas').getContext('2d');

  const paramChart = new Chart(paramCtx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '測地線',
          data: [],
          showLine: true,
          borderColor: '#818cf8',
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'A',
          data: [],
          pointBackgroundColor: 'var(--text-accent)',
          pointBorderColor: '#fff',
          pointRadius: 6,
        },
        {
          label: 'B',
          data: [],
          pointBackgroundColor: '#ec4899',
          pointBorderColor: '#fff',
          pointRadius: 6,
        },
        {
          label: '現在地',
          data: [],
          pointBackgroundColor: '#fff',
          pointBorderColor: '#818cf8',
          pointRadius: 8,
          pointHoverRadius: 10,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          min: -15, max: 15, 
          title: { display: true, text: '平均 μ', color: '#94a3b8' },
          grid: { display: false } 
        },
        y: { 
          min: 0, max: 15, 
          title: { display: true, text: '標準偏差 σ', color: '#94a3b8' },
          grid: { display: false }
        }
      },
      plugins: { 
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });

  const pdfX = linspace(-20, 20, 100);
  const pdfChart = new Chart(pdfCtx, {
    type: 'line',
    data: {
      labels: pdfX.map(x => x.toFixed(1)),
      datasets: [
        {
          label: 'Dist A',
          data: [],
          borderColor: 'rgba(99, 102, 241, 0.4)',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          borderWidth: 1.5,
        },
        {
          label: 'Dist B',
          data: [],
          borderColor: 'rgba(236, 72, 153, 0.4)',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          borderWidth: 1.5,
        },
        {
          label: 'Intermediate',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          fill: true,
          pointRadius: 0,
          tension: 0.4,
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { min: 0, max: 0.8, grid: { color: 'rgba(255,255,255,0.05)' } }
      },
      plugins: { legend: { display: false } }
    }
  });

  // UI elements
  const els = {
    muA: container.querySelector('#muA-init'),
    sigA: container.querySelector('#sigmaA-init'),
    muB: container.querySelector('#muB-init'),
    sigB: container.querySelector('#sigmaB-init'),
    muAval: container.querySelector('#muA-val'),
    sigAval: container.querySelector('#sigmaA-val'),
    muBval: container.querySelector('#muB-val'),
    sigBval: container.querySelector('#sigmaB-val'),
    btn: container.querySelector('#start-btn'),
  };

  function updateInitial() {
    els.muAval.textContent = Number(els.muA.value).toFixed(1);
    els.sigAval.textContent = Number(els.sigA.value).toFixed(1);
    els.muBval.textContent = Number(els.muB.value).toFixed(1);
    els.sigBval.textContent = Number(els.sigB.value).toFixed(1);
    
    if (!isRunning) {
      calculateGeodesic();
      updateView(0); // Plot the full geodesic but stay at t=0
    }
  }

  [els.muA, els.sigA, els.muB, els.sigB].forEach(s => s.addEventListener('input', updateInitial));

  function calculateGeodesic() {
    const m1 = Number(els.muA.value);
    const s1 = Number(els.sigA.value);
    const m2 = Number(els.muB.value);
    const s2 = Number(els.sigB.value);
    
    geoData.mu1 = m1; geoData.sigma1 = s1;
    geoData.mu2 = m2; geoData.sigma2 = s2;

    if (Math.abs(m1 - m2) < 0.001) {
      geoData.type = 'vertical';
    } else {
      geoData.type = 'ellipse';
      const x1 = m1, y1Sq = 2 * s1 * s1;
      const x2 = m2, y2Sq = 2 * s2 * s2;
      geoData.mu_c = (x2 * x2 - x1 * x1 + y2Sq - y1Sq) / (2 * (x2 - x1));
      geoData.R = Math.sqrt(Math.pow(x1 - geoData.mu_c, 2) + y1Sq);
      
      geoData.theta1 = Math.atan2(Math.sqrt(2) * s1, m1 - geoData.mu_c);
      geoData.theta2 = Math.atan2(Math.sqrt(2) * s2, m2 - geoData.mu_c);
    }
    
    // Pre-calculate the trajectory line
    trajectory = [];
    for (let t = 0; t <= 1; t += 0.02) {
      const { mu, sigma } = getGeodesicPoint(t);
      trajectory.push({ x: mu, y: sigma });
    }
  }

  function getGeodesicPoint(t) {
    if (geoData.type === 'vertical') {
      return { 
        mu: geoData.mu1, 
        sigma: geoData.sigma1 * Math.pow(geoData.sigma2 / geoData.sigma1, t) 
      };
    } else {
      // Linear interpolation in angular space (preserves geodesic path perfectly, though speed varies slightly)
      const theta = geoData.theta1 * (1 - t) + geoData.theta2 * t;
      return {
        mu: geoData.mu_c + geoData.R * Math.cos(theta),
        sigma: (geoData.R / Math.SQRT2) * Math.sin(theta)
      };
    }
  }

  function updateView(t) {
    paramChart.data.datasets[1].data = [{ x: geoData.mu1, y: geoData.sigma1 }];
    paramChart.data.datasets[2].data = [{ x: geoData.mu2, y: geoData.sigma2 }];
    paramChart.data.datasets[0].data = trajectory;
    
    const { mu, sigma } = getGeodesicPoint(t);
    paramChart.data.datasets[3].data = [{ x: mu, y: sigma }];
    paramChart.update();

    // Update PDFs
    pdfChart.data.datasets[0].data = pdfX.map(x => jStat.normal.pdf(x, geoData.mu1, geoData.sigma1));
    pdfChart.data.datasets[1].data = pdfX.map(x => jStat.normal.pdf(x, geoData.mu2, geoData.sigma2));
    pdfChart.data.datasets[2].data = pdfX.map(x => jStat.normal.pdf(x, mu, sigma));
    pdfChart.update();
  }

  function animate() {
    if (!isRunning) return;
    
    animProgress += 0.005; // speed
    if (animProgress >= 1) {
      animProgress = 1;
      isRunning = false;
      els.btn.textContent = 'もう一度シミュレート';
    }
    
    updateView(animProgress);

    if (isRunning) {
      animationId = requestAnimationFrame(animate);
    }
  }

  els.btn.addEventListener('click', () => {
    isRunning = true;
    animProgress = 0;
    els.btn.textContent = 'シミュレーション中...';
    calculateGeodesic();
    animate();
  });

  updateInitial();
}

export function cleanup() {
  isRunning = false;
  if (animationId) cancelAnimationFrame(animationId);
}

function renderExplainCard({ title, description, formula, tags, realWorld }) {
  const card = document.createElement('div');
  card.className = 'explain-card';
  card.innerHTML = `
    <h2 class="explain-card-title">${title}</h2>
    <div class="explain-card-description">${description}</div>
    <div class="explain-card-formula" id="formula-container"></div>
    <div class="explain-card-section-title">応用例</div>
    <div class="explain-card-description">${realWorld}</div>
    <div class="explain-card-tags">
      ${tags.map(t => `<span class="explain-card-tag">${t}</span>`).join('')}
    </div>
  `;

  if (window.katex) {
    try {
      window.katex.render(formula, card.querySelector('#formula-container'), { displayMode: true });
    } catch (e) {
      card.querySelector('#formula-container').innerHTML = `<code>${formula}</code>`;
    }
  } else {
    card.querySelector('#formula-container').innerHTML = `<code>${formula}</code>`;
  }

  return card;
}
