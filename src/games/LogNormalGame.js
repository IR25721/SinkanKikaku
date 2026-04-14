/**
 * Log-Normal Distribution Game — 面積推定
 * A shape is briefly shown, and the player estimates its area.
 * The ratio (estimate / true area) tends to follow a log-normal distribution.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { linspace, pdfValues, histogram, normalizeToDensity, mean, stddev } from '../stats/distributions.js';
import { jStat } from '../stats/distributions.js';

const GAME_ID = 'lognormal';
const DISPLAY_TIME = 1500; // ms to show shape
let currentTrueArea = 0;
let gamePhase = 'idle'; // idle, showing, guessing

export function render(container) {
  const layout = createGameLayout({
    id: '/lognormal',
    emoji: '📏',
    title: '面積推定',
    distribution: '対数正規分布',
    color: 'lognormal',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">図形が一瞬だけ表示される. 面積を推定してください</p>
    <div style="display:flex; align-items:flex-end; gap:16px; justify-content:center;">
      <div class="shape-display" id="shape-display">
        <canvas id="shape-canvas" width="300" height="300"></canvas>
      </div>
      <div id="ref-square" style="display:flex; flex-direction:column; align-items:center; gap:4px;">
        <div style="width:50px; height:50px; border:1px solid rgba(255,255,255,0.5); background:rgba(255,255,255,0.08);"></div>
        <span style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono);">50×50</span>
        <span style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono);">= 2,500 px²</span>
      </div>
    </div>
    <div id="guess-area" style="display:none;">
      <p style="color:var(--text-secondary); margin-bottom:8px;">面積を入力してください (px²)</p>
      <input type="number" id="area-input" min="1" max="100000" value="" placeholder="例: 5000"
        style="width:160px; padding:8px 12px; font-size:1.1rem; font-family:var(--font-mono);
        background:var(--bg-glass-strong); border:1px solid var(--border-subtle);
        border-radius:var(--radius-sm); color:var(--text-primary); text-align:center;" />
      <button class="game-btn" id="submit-btn" style="margin-top:16px;">回答</button>
    </div>
    <button class="game-btn" id="start-btn">図形を表示</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: '対数正規分布 (Log-Normal Distribution)',
      description:
        '変数の対数が正規分布に従う分布である. 推定値/真値の比をとると,人間は小さい値と大きい値を等しく誤る傾向があり,その比率の分布は対数正規分布となる.',
      formula: 'f(x) = \\frac{1}{x\\sigma\\sqrt{2\\pi}} \\exp\\left(-\\frac{(\\ln x - \\mu)^2}{2\\sigma^2}\\right)',
      tags: ['連続分布', '右に裾が長い', '乗算的誤差', '正の値のみ'],
      realWorld: '年収分布,株価の変動率,粒子サイズ分布',
    })
  );

  container.appendChild(layout.container);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '推定比率の密度',
    color: '#ec4899',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#ec4899' });

  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const startBtn = layout.gameArea.querySelector('#start-btn');
  const guessArea = layout.gameArea.querySelector('#guess-area');
  const submitBtn = layout.gameArea.querySelector('#submit-btn');
  const areaInput = layout.gameArea.querySelector('#area-input');
  const shapeCanvas = layout.gameArea.querySelector('#shape-canvas');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');



  startBtn.addEventListener('click', () => {
    gamePhase = 'showing';
    startBtn.style.display = 'none';
    gameResult.style.display = 'none';
    guessArea.style.display = 'none';
    areaInput.value = '';

    // Generate a random shape
    currentTrueArea = drawRandomShape(shapeCanvas);

    // Hide shape after DISPLAY_TIME
    setTimeout(() => {
      const ctx = shapeCanvas.getContext('2d');
      ctx.clearRect(0, 0, 300, 300);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '16px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('面積はいくつだった？', 150, 150);
      gamePhase = 'guessing';
      guessArea.style.display = 'block';
    }, DISPLAY_TIME);
  });

  submitBtn.addEventListener('click', () => {
    const guess = Number(areaInput.value);
    if (!guess || guess <= 0) {
      areaInput.style.borderColor = '#ef4444';
      return;
    }
    areaInput.style.borderColor = '';
    const ratio = guess / currentTrueArea;

    const allResults = addResult(GAME_ID, ratio);

    resultValue.textContent = `比率: ${ratio.toFixed(2)}`;
    resultLabel.textContent = `推定: ${guess.toLocaleString()} / 実際: ${Math.round(currentTrueArea).toLocaleString()} px²`;
    gameResult.style.display = 'block';
    guessArea.style.display = 'none';
    startBtn.style.display = 'inline-block';
    startBtn.textContent = 'もう一度';
    gamePhase = 'idle';

    updateCharts(allResults, histChart, bayesChart);
    updateStats(allResults, layout.statsRows);
  });
}

function drawRandomShape(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 300, 300);

  const shapeType = Math.floor(Math.random() * 3);
  let area = 0;
  const hue = 320 + Math.random() * 40;

  ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.7)`;
  ctx.strokeStyle = `hsla(${hue}, 70%, 70%, 0.9)`;
  ctx.lineWidth = 2;

  if (shapeType === 0) {
    // Circle
    const r = 30 + Math.random() * 80;
    ctx.beginPath();
    ctx.arc(150, 150, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    area = Math.PI * r * r;
  } else if (shapeType === 1) {
    // Rectangle
    const w = 40 + Math.random() * 180;
    const h = 40 + Math.random() * 180;
    const x = (300 - w) / 2;
    const y = (300 - h) / 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    area = w * h;
  } else {
    // Irregular polygon
    const numPoints = 5 + Math.floor(Math.random() * 4);
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const r = 50 + Math.random() * 80;
      points.push({
        x: 150 + r * Math.cos(angle),
        y: 150 + r * Math.sin(angle),
      });
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Shoelace formula for area
    area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
  }



  return area;
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  const numBins = Math.max(8, Math.min(20, Math.ceil(Math.sqrt(results.length))));
  const maxVal = Math.min(Math.max(...results) + 0.5, 10);
  const { bins, counts, binWidth } = histogram(results, numBins, 0, maxVal);
  const density = normalizeToDensity(counts, binWidth, results.length);

  // Fit lognormal: ln(ratio) should be normal
  const logResults = results.filter((r) => r > 0).map((r) => Math.log(r));
  const mu = logResults.length > 0 ? mean(logResults) : 0;
  const sigma = logResults.length > 1 ? stddev(logResults) : 0.5;

  const pdfX = linspace(0.01, maxVal, numBins);
  const pdfY = pdfX.map((x) => jStat.lognormal.pdf(x, mu, sigma));

  histChart.update(
    bins.map((b) => b.toFixed(1)),
    density,
    pdfY
  );

  // Bayesian: show fitted log-normal parameters
  const bayesX = linspace(0.01, maxVal, 80);
  const priorY = bayesX.map((x) => jStat.lognormal.pdf(x, 0, 0.5));
  const posteriorY = bayesX.map((x) => jStat.lognormal.pdf(x, mu, Math.max(sigma, 0.1)));
  bayesChart.update(
    bayesX.map((x) => x.toFixed(2)),
    priorY,
    posteriorY
  );
}

function updateStats(results, statsRows) {
  if (results.length === 0) {
    updateStatsRows(statsRows, [{ label: '試行回数', value: '0' }]);
    return;
  }
  const logResults = results.filter((r) => r > 0).map((r) => Math.log(r));
  const mu = mean(logResults);
  const sigma = stddev(logResults);

  updateStatsRows(statsRows, [
    { label: '試行回数', value: `${results.length}` },
    { label: '平均比率', value: `${mean(results).toFixed(2)}` },
    { label: 'ln(比率)の平均 μ', value: `${mu.toFixed(3)}` },
    { label: 'ln(比率)の標準偏差 σ', value: `${sigma.toFixed(3)}` },
  ]);
}

export function cleanup() {
  gamePhase = 'idle';
}
