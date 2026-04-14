/**
 * Cauchy Distribution Game — レーザーポインター
 * A laser is aimed at random angles toward a wall.
 * The landing position follows a Cauchy distribution.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { linspace, histogram, normalizeToDensity, mean } from '../stats/distributions.js';
import { jStat } from '../stats/distributions.js';

const GAME_ID = 'cauchy';

export function render(container) {
  const layout = createGameLayout({
    id: '/cauchy',
    emoji: '🎯',
    title: 'レーザーポインター',
    distribution: 'コーシー分布',
    color: 'cauchy',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">ランダムな角度でレーザーを壁に照射します。着弾点の分布を観察しよう！</p>
    <div class="target-area" id="laser-area">
      <canvas id="laser-canvas" width="300" height="300"></canvas>
    </div>
    <button class="game-btn" id="fire-btn">レーザー発射！</button>
    <button class="game-btn game-btn--secondary" id="fire10-btn" style="margin-left:8px;">10連射</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: 'コーシー分布（ローレンツ分布）',
      description:
        '正規分布に似た釣鐘型ですが、裾が非常に重いのが特徴です。平均も分散も定義できません！ランダムな角度で壁に光を当てると、着弾点がコーシー分布に従います。極端な値が頻繁に出現する「ヘビーテール」を体感してください。',
      formula: 'f(x) = \\frac{1}{\\pi\\gamma\\left[1 + \\left(\\frac{x - x_0}{\\gamma}\\right)^2\\right]}',
      tags: ['連続分布', 'ヘビーテール', '平均が存在しない', '物理学由来'],
      realWorld: 'ブラウン運動の比率、共鳴曲線の形、ランダムウォークの角度',
    })
  );

  container.appendChild(layout.container);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '着弾位置の密度',
    color: '#ef4444',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#ef4444' });

  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const laserCanvas = layout.gameArea.querySelector('#laser-canvas');
  const fireBtn = layout.gameArea.querySelector('#fire-btn');
  const fire10Btn = layout.gameArea.querySelector('#fire10-btn');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  function fireLaser() {
    // Random angle between -π/2 and π/2 (excluding endpoints)
    const angle = (Math.random() - 0.5) * Math.PI * 0.95;
    // Landing position: tan(angle) * distance — distance = 1 unit
    const landingPos = Math.tan(angle);

    const allResults = addResult(GAME_ID, landingPos);
    drawLaserScene(laserCanvas, angle, landingPos);

    resultValue.textContent = `${landingPos.toFixed(2)}`;
    resultLabel.textContent = `角度: ${((angle * 180) / Math.PI).toFixed(1)}° → 着弾: ${landingPos.toFixed(2)}`;
    gameResult.style.display = 'block';

    updateCharts(allResults, histChart, bayesChart);
    updateStats(allResults, layout.statsRows);
  }

  fireBtn.addEventListener('click', fireLaser);

  fire10Btn.addEventListener('click', () => {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => fireLaser(), i * 100);
    }
  });
}

function drawLaserScene(canvas, angle, landing) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 300, 300);

  // Wall (right side)
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(270, 0, 30, 300);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '10px Inter';
  ctx.fillText('壁', 280, 150);

  // Laser source (left center)
  const srcX = 30, srcY = 150;
  ctx.beginPath();
  ctx.arc(srcX, srcY, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  // Landing point on wall
  const wallX = 270;
  const landingY = 150 - landing * 20; // scale
  const clampedY = Math.max(5, Math.min(295, landingY));

  // Laser beam
  ctx.beginPath();
  ctx.moveTo(srcX, srcY);
  ctx.lineTo(wallX, clampedY);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Landing dot
  ctx.beginPath();
  ctx.arc(wallX, clampedY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(wallX, clampedY, 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  // Clip extreme values for visualization
  const clipped = results.map((r) => Math.max(-10, Math.min(10, r)));
  const numBins = Math.max(10, Math.min(30, Math.ceil(Math.sqrt(results.length))));
  const { bins, counts, binWidth } = histogram(clipped, numBins, -10, 10);
  const density = normalizeToDensity(counts, binWidth, results.length);

  // Theoretical Cauchy PDF (location=0, scale=1)
  const pdfY = bins.map((x) => jStat.cauchy.pdf(x, 0, 1));

  histChart.update(
    bins.map((b) => b.toFixed(1)),
    density,
    pdfY
  );

  // Show Cauchy vs Normal comparison
  const bayesX = linspace(-8, 8, 80);
  const cauchyY = bayesX.map((x) => jStat.cauchy.pdf(x, 0, 1));
  const normalY = bayesX.map((x) => jStat.normal.pdf(x, 0, 1));

  bayesChart.update(
    bayesX.map((x) => x.toFixed(1)),
    normalY,
    cauchyY
  );
  // Relabel
}

function updateStats(results, statsRows) {
  if (results.length === 0) {
    updateStatsRows(statsRows, [{ label: '発射回数', value: '0' }]);
    return;
  }
  const sorted = [...results].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const extremes = results.filter((r) => Math.abs(r) > 5).length;

  updateStatsRows(statsRows, [
    { label: '発射回数', value: `${results.length}` },
    { label: '中央値', value: `${median.toFixed(2)} (平均は定義不能！)` },
    { label: '|x|>5 の割合', value: `${((extremes / results.length) * 100).toFixed(1)}%` },
    { label: '最大値', value: `${Math.max(...results).toFixed(1)}` },
    { label: '最小値', value: `${Math.min(...results).toFixed(1)}` },
  ]);
}

export function cleanup() {}
