/**
 * Information Geometry Game — 統計多様体上の測地線
 * Visualizes the Fisher information metric and geodesics on the Normal distribution manifold.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { rk4Step, normalGeodesicEq } from '../math/rk4.js';
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

const GAME_ID = 'infogeo';
let animationId = null;
let currentState = [0, 5, 0, 0]; // [mu, sigma, dmu, dsigma]
let trajectory = [];
let isRunning = false;

export function render(container) {
  const layout = createGameLayout({
    id: '/infogeo',
    emoji: '📐',
    title: '統計多様体と測地線',
    distribution: '情報幾何学 (Information Geometry)',
    color: 'normal', // Reuse normal color
  });

  // Customize the game area for two-pane visualization
  layout.gameArea.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px; align-items:center; width:100%;">
      <p class="game-area-instruction">パラメータ空間上の測地線（最短経路）と分布の変化を観察する.</p>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; width:100%; min-height:300px;">
        <div class="stats-panel" style="flex:1;">
          <div class="stats-panel-title">パラメータ空間 (μ, σ)</div>
          <div style="height:250px;"><canvas id="param-canvas"></canvas></div>
        </div>
        <div class="stats-panel" style="flex:1;">
          <div class="stats-panel-title">確率密度関数 f(x; μ, σ)</div>
          <div style="height:250px;"><canvas id="pdf-canvas"></canvas></div>
        </div>
      </div>

      <div class="stats-panel" style="width:100%; max-width:600px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div class="slider-container">
            <label style="font-size:0.8rem; color:var(--text-secondary);">初期位置 μ₀</label>
            <input type="range" id="mu-init" min="-10" max="10" value="0" step="0.1" style="width:100%;">
            <div id="mu-val" style="font-family:var(--font-mono); font-size:0.8rem; text-align:right;">0.0</div>
          </div>
          <div class="slider-container">
            <label style="font-size:0.8rem; color:var(--text-secondary);">初期位置 σ₀</label>
            <input type="range" id="sigma-init" min="0.5" max="10" value="5" step="0.1" style="width:100%;">
            <div id="sigma-val" style="font-family:var(--font-mono); font-size:0.8rem; text-align:right;">5.0</div>
          </div>
          <div class="slider-container">
            <label style="font-size:0.8rem; color:var(--text-secondary);">初速度 μ'₀</label>
            <input type="range" id="dmu-init" min="-5" max="5" value="2" step="0.1" style="width:100%;">
            <div id="dmu-val" style="font-family:var(--font-mono); font-size:0.8rem; text-align:right;">2.0</div>
          </div>
          <div class="slider-container">
            <label style="font-size:0.8rem; color:var(--text-secondary);">初速度 σ'₀</label>
            <input type="range" id="dsigma-init" min="-5" max="5" value="0" step="0.1" style="width:100%;">
            <div id="dsigma-val" style="font-family:var(--font-mono); font-size:0.8rem; text-align:right;">0.0</div>
          </div>
        </div>
        <div style="display:flex; justify-content:center; gap:12px; margin-top:20px;">
          <button class="game-btn" id="start-btn">シミュレーション開始</button>
          <button class="game-btn game-btn--secondary" id="stop-btn">停止</button>
        </div>
      </div>
    </div>
  `;

  // Documentation
  layout.explainArea.appendChild(
    renderExplainCard({
      title: '統計多様体 (Statistical Manifold)',
      description:
        '確率分布の集合に幾何学的な構造を導入したものを統計多様体と呼ぶ. Fisher情報行列を計量テンソルとして用いることで,分布間の「自然な距離」が定義される. 正規分布の空間は負の定曲率を持つ双曲幾何学的な空間となり,測地線は $\\sigma$ 軸上の半円または直線となる.',
      formula: 'g_{ij}(\\theta) = \\int p(x;\\theta) \\frac{\\partial \\ln p}{\\partial \\theta^i} \\frac{\\partial \\ln p}{\\partial \\theta^j} dx',
      tags: ['情報幾何学', 'Fisher計量', '測地線', '双曲空間'],
      realWorld: '機械学習の自然勾配法 (Natural Gradient), 最適輸送問題, 統計的推論',
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
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
        {
          label: '現在地',
          data: [],
          pointBackgroundColor: '#fff',
          pointBorderColor: '#818cf8',
          pointRadius: 6,
          pointHoverRadius: 8,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { min: -15, max: 15, title: { display: true, text: '平均 μ', color: '#94a3b8' } },
        y: { min: 0, max: 15, title: { display: true, text: '標準偏差 σ', color: '#94a3b8' } }
      },
      plugins: { legend: { display: false } }
    }
  });

  const pdfX = linspace(-20, 20, 100);
  const pdfChart = new Chart(pdfCtx, {
    type: 'line',
    data: {
      labels: pdfX.map(x => x.toFixed(1)),
      datasets: [{
        label: 'N(μ, σ)',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        pointRadius: 0,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 1 }
      },
      plugins: { legend: { display: false } }
    }
  });

  // UI elements
  const muSlider = container.querySelector('#mu-init');
  const sigmaSlider = container.querySelector('#sigma-init');
  const dmuSlider = container.querySelector('#dmu-init');
  const dsigmaSlider = container.querySelector('#dsigma-init');

  const muVal = container.querySelector('#mu-val');
  const sigmaVal = container.querySelector('#sigma-val');
  const dmuVal = container.querySelector('#dmu-val');
  const dsigmaVal = container.querySelector('#dsigma-val');

  const startBtn = container.querySelector('#start-btn');
  const stopBtn = container.querySelector('#stop-btn');

  function updateInitial() {
    muVal.textContent = Number(muSlider.value).toFixed(1);
    sigmaVal.textContent = Number(sigmaSlider.value).toFixed(1);
    dmuVal.textContent = Number(dmuSlider.value).toFixed(1);
    dsigmaVal.textContent = Number(dsigmaSlider.value).toFixed(1);
    
    if (!isRunning) {
      const mu = Number(muSlider.value);
      const sigma = Number(sigmaSlider.value);
      updateView(mu, sigma);
    }
  }

  [muSlider, sigmaSlider, dmuSlider, dsigmaSlider].forEach(s => s.addEventListener('input', updateInitial));

  function updateView(mu, sigma) {
    // Update Param chart
    paramChart.data.datasets[1].data = [{ x: mu, y: sigma }];
    paramChart.update('none');

    // Update PDF chart
    const yValues = pdfX.map(x => jStat.normal.pdf(x, mu, sigma));
    pdfChart.data.datasets[0].data = yValues;
    pdfChart.update('none');

    updateStatsRows(layout.statsRows, [
      { label: '現在の μ', value: mu.toFixed(3) },
      { label: '現在の σ', value: sigma.toFixed(3) },
      { label: 'ステップ数', value: trajectory.length.toString() }
    ]);
  }

  function runSimulation() {
    if (!isRunning) return;

    // Numerical integration step
    const dt = 0.05;
    currentState = rk4Step(normalGeodesicEq, 0, currentState, dt);

    const [mu, sigma, dmu, dsigma] = currentState;

    // Safety: stop if sigma gets too small or state explodes
    if (sigma < 0.1 || Math.abs(mu) > 50 || isNaN(mu)) {
      isRunning = false;
      return;
    }

    trajectory.push({ x: mu, y: sigma });
    if (trajectory.length > 500) trajectory.shift();

    paramChart.data.datasets[0].data = trajectory;
    updateView(mu, sigma);

    animationId = requestAnimationFrame(runSimulation);
  }

  startBtn.addEventListener('click', () => {
    isRunning = true;
    trajectory = [];
    currentState = [
      Number(muSlider.value),
      Number(sigmaSlider.value),
      Number(dmuSlider.value),
      Number(dsigmaSlider.value)
    ];
    runSimulation();
  });

  stopBtn.addEventListener('click', () => {
    isRunning = false;
    if (animationId) cancelAnimationFrame(animationId);
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

  // Render LaTeX using KaTeX if available
  const formulaContainer = card.querySelector('#formula-container');
  if (window.katex) {
    try {
      window.katex.render(formula, formulaContainer, { displayMode: true });
    } catch (e) {
      formulaContainer.innerHTML = `<code>${formula}</code>`;
    }
  } else {
    formulaContainer.innerHTML = `<code>${formula}</code>`;
  }

  return card;
}
