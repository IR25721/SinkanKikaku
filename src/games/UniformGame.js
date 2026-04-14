/**
 * Uniform Distribution Game — ルーレットストップ
 * A roulette wheel spins and the player stops it when they want.
 * If humans could be truly random, positions would follow a uniform distribution.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { linspace, pdfValues, histogram, normalizeToDensity, mean, stddev } from '../stats/distributions.js';

const GAME_ID = 'uniform';
let animFrame = null;
let angle = 0;
let spinning = false;
let speed = 0;

export function render(container) {
  const layout = createGameLayout({
    id: '/uniform',
    emoji: '🎲',
    title: 'ルーレットストップ',
    distribution: '一様分布',
    color: 'uniform',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">ルーレットを回して、好きなところで止めてください</p>
    <div class="roulette-container" id="roulette-container">
      <div class="roulette-wheel" id="roulette-wheel">
        <canvas id="roulette-canvas" width="280" height="280"></canvas>
        <div class="roulette-pointer" id="roulette-pointer"></div>
      </div>
    </div>
    <div style="font-family:var(--font-mono); margin-bottom:16px; min-height:24px;">
      <span id="angle-display" style="color: var(--color-uniform);">0°</span>
    </div>
    <button class="game-btn" id="spin-btn">回す</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: '一様分布',
      description:
        'すべての値が同じ確率で出現する分布です。理想的にはルーレットの停止位置は0°〜360°に均等に分布するはずですが、人間にはどうしてもバイアスがあります。',
      formula: 'f(x) = \\frac{1}{b - a} \\quad (a \\leq x \\leq b)',
      tags: ['連続分布', '最もシンプル', 'バイアスの可視化'],
      realWorld: 'サイコロの出目、抽選番号、乱数生成の基礎',
    })
  );

  container.appendChild(layout.container);

  // Draw roulette wheel
  const rouletteCanvas = layout.gameArea.querySelector('#roulette-canvas');
  drawRouletteWheel(rouletteCanvas);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '停止位置の密度',
    color: '#f59e0b',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#f59e0b' });

  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const spinBtn = layout.gameArea.querySelector('#spin-btn');
  const pointer = layout.gameArea.querySelector('#roulette-pointer');
  const angleDisplay = layout.gameArea.querySelector('#angle-display');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  function animate() {
    if (!spinning) return;
    angle = (angle + speed) % 360;
    pointer.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    angleDisplay.textContent = `${Math.round(angle)}°`;
    animFrame = requestAnimationFrame(animate);
  }

  spinBtn.addEventListener('click', () => {
    if (!spinning) {
      // Start spinning
      spinning = true;
      speed = 5 + Math.random() * 3;
      spinBtn.textContent = 'ストップ！';
      gameResult.style.display = 'none';
      animate();
    } else {
      // Stop
      spinning = false;
      cancelAnimationFrame(animFrame);

      const finalAngle = Math.round(angle * 10) / 10;
      const allResults = addResult(GAME_ID, finalAngle);

      resultValue.textContent = `${finalAngle}°`;
      resultLabel.textContent = '停止位置';
      gameResult.style.display = 'block';
      spinBtn.textContent = 'もう一度';

      updateCharts(allResults, histChart, bayesChart);
      updateStats(allResults, layout.statsRows);
    }
  });
}

function drawRouletteWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const cx = 140, cy = 140, r = 130;
  const segments = 12;
  const colors = [
    'rgba(99,102,241,0.3)',
    'rgba(168,85,247,0.2)',
    'rgba(99,102,241,0.3)',
    'rgba(168,85,247,0.2)',
    'rgba(99,102,241,0.3)',
    'rgba(168,85,247,0.2)',
    'rgba(99,102,241,0.3)',
    'rgba(168,85,247,0.2)',
    'rgba(99,102,241,0.3)',
    'rgba(168,85,247,0.2)',
    'rgba(99,102,241,0.3)',
    'rgba(168,85,247,0.2)',
  ];

  for (let i = 0; i < segments; i++) {
    const startAngle = (i * 2 * Math.PI) / segments - Math.PI / 2;
    const endAngle = ((i + 1) * 2 * Math.PI) / segments - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.stroke();
  }

  // Degree markers
  for (let deg = 0; deg < 360; deg += 30) {
    const rad = (deg * Math.PI) / 180 - Math.PI / 2;
    const x1 = cx + (r - 15) * Math.cos(rad);
    const y1 = cy + (r - 15) * Math.sin(rad);
    const x2 = cx + r * Math.cos(rad);
    const y2 = cy + r * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    const lx = cx + (r - 25) * Math.cos(rad);
    const ly = cy + (r - 25) * Math.sin(rad);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${deg}°`, lx, ly);
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  const numBins = 12;
  const { bins, counts, binWidth } = histogram(results, numBins, 0, 360);
  const density = normalizeToDensity(counts, binWidth, results.length);

  // Theoretical uniform PDF
  const pdfY = bins.map(() => 1 / 360);

  histChart.update(
    bins.map((b) => `${Math.round(b)}°`),
    density,
    pdfY
  );

  // For Bayesian: show deviation from uniform via a simple KDE-like view
  // We show prior (flat) vs posterior (histogram-based estimate)
  const bayesLabels = bins.map((b) => `${Math.round(b)}°`);
  const priorY = bins.map(() => 1 / numBins);
  // Posterior is roughly the empirical frequency
  const posteriorY = counts.map((c) => c / results.length);
  bayesChart.update(bayesLabels, priorY, posteriorY);
}

function updateStats(results, statsRows) {
  if (results.length === 0) {
    updateStatsRows(statsRows, [{ label: '試行回数', value: '0' }]);
    return;
  }
  const m = mean(results);
  const s = stddev(results);
  // Chi-square test for uniformity (simple)
  const numBins = 12;
  const expected = results.length / numBins;
  const observed = new Array(numBins).fill(0);
  results.forEach((v) => {
    let idx = Math.floor((v / 360) * numBins);
    if (idx >= numBins) idx = numBins - 1;
    observed[idx]++;
  });
  const chiSq = observed.reduce((sum, o) => sum + (o - expected) ** 2 / expected, 0);

  updateStatsRows(statsRows, [
    { label: '試行回数', value: `${results.length}` },
    { label: '平均角度', value: `${m.toFixed(1)}° (理論: 180°)` },
    { label: '標準偏差', value: `${s.toFixed(1)}° (理論: ${(360 / Math.sqrt(12)).toFixed(1)}°)` },
    { label: 'χ² 統計量', value: `${chiSq.toFixed(2)} (小さいほど一様)` },
  ]);
}

export function cleanup() {
  spinning = false;
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
}
