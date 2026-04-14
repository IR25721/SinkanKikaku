/**
 * Beta Distribution Game — フリースロー
 * The player clicks a moving target. Their success rate's posterior
 * distribution is a Beta distribution (conjugate to Bernoulli).
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { mean } from '../stats/distributions.js';
import { betaBernoulliUpdate } from '../stats/bayesian.js';
import { jStat } from '../stats/distributions.js';

const GAME_ID = 'beta';
let targetX = 150, targetY = 150;
let animFrame = null;
let shotsFired = 0;
let shotsHit = 0;

export function render(container) {
  const layout = createGameLayout({
    id: '/beta',
    emoji: '🏀',
    title: 'フリースロー',
    distribution: 'ベータ分布',
    color: 'beta',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">動くリングに向かってクリック！成功率をベイズ推定します</p>
    <div style="display:flex; gap:24px; margin-bottom:12px; font-family:var(--font-mono);">
      <span>成功: <span id="hit-count" style="color:var(--color-beta)">0</span></span>
      <span>失敗: <span id="miss-count" style="color:var(--text-muted)">0</span></span>
      <span>成功率: <span id="rate-display" style="color:var(--color-beta)">-</span></span>
    </div>
    <div class="target-area" id="target-area">
      <canvas id="target-canvas" width="300" height="300" style="cursor:crosshair;"></canvas>
    </div>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: 'ベータ分布',
      description:
        '0〜1の範囲の確率や割合をモデリングする分布です。ベルヌーイ試行の成功確率の事後分布として自然に現れ、データが増えるほど「あなたの本当の実力」が見えてきます。',
      formula: 'f(p;\\,\\alpha,\\beta) = \\frac{p^{\\alpha-1}(1-p)^{\\beta-1}}{B(\\alpha,\\beta)}',
      tags: ['連続分布', '0〜1の範囲', 'ベイズ推定の定番', '共役事前分布'],
      realWorld: '打率の推定、A/Bテストの成功率、薬の効果の確率',
    })
  );

  container.appendChild(layout.container);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '成功率の頻度',
    color: '#f97316',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#f97316' });

  // Load stored data: results are [1 = hit, 0 = miss]
  const results = getResults(GAME_ID);
  shotsHit = results.filter((r) => r === 1).length;
  shotsFired = results.length;
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const targetCanvas = layout.gameArea.querySelector('#target-canvas');
  const ctx = targetCanvas.getContext('2d');
  const hitCount = layout.gameArea.querySelector('#hit-count');
  const missCount = layout.gameArea.querySelector('#miss-count');
  const rateDisplay = layout.gameArea.querySelector('#rate-display');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  // Moving target
  const TARGET_RADIUS = 25;
  let t = 0;

  function animateTarget() {
    ctx.clearRect(0, 0, 300, 300);

    // Move target in a figure-8 pattern
    t += 0.02;
    targetX = 150 + 90 * Math.sin(t);
    targetY = 150 + 60 * Math.sin(t * 2);

    // Draw target ring
    ctx.beginPath();
    ctx.arc(targetX, targetY, TARGET_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(targetX, targetY, TARGET_RADIUS * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(targetX, targetY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316';
    ctx.fill();

    animFrame = requestAnimationFrame(animateTarget);
  }

  animateTarget();

  // Click to shoot
  targetCanvas.addEventListener('click', (e) => {
    const rect = targetCanvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 300;
    const clickY = ((e.clientY - rect.top) / rect.height) * 300;

    const dist = Math.sqrt((clickX - targetX) ** 2 + (clickY - targetY) ** 2);
    const hit = dist <= TARGET_RADIUS;

    shotsFired++;
    if (hit) shotsHit++;

    const allResults = addResult(GAME_ID, hit ? 1 : 0);

    // Visual feedback
    ctx.beginPath();
    ctx.arc(clickX, clickY, 5, 0, Math.PI * 2);
    ctx.fillStyle = hit ? '#10b981' : '#ef4444';
    ctx.fill();

    hitCount.textContent = shotsHit;
    missCount.textContent = shotsFired - shotsHit;
    rateDisplay.textContent = `${((shotsHit / shotsFired) * 100).toFixed(1)}%`;

    resultValue.textContent = hit ? '🎯 命中！' : '💨 ミス！';
    resultLabel.textContent = `成功率: ${((shotsHit / shotsFired) * 100).toFixed(1)}%`;
    gameResult.style.display = 'block';

    updateCharts(allResults, histChart, bayesChart);
    updateStats(allResults, layout.statsRows);
  });
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  const successes = results.filter((r) => r === 1).length;
  const failures = results.length - successes;

  // Bayesian: Beta posterior
  const priorAlpha = 1;
  const priorBeta = 1;
  const posterior = betaBernoulliUpdate(priorAlpha, priorBeta, successes, failures);

  const bayesX = Array.from({ length: 80 }, (_, i) => (i + 1) / 81);
  const priorY = bayesX.map((x) => jStat.beta.pdf(x, priorAlpha, priorBeta));
  const posteriorY = bayesX.map((x) => jStat.beta.pdf(x, posterior.alpha, posterior.beta));

  bayesChart.update(
    bayesX.map((x) => x.toFixed(2)),
    priorY,
    posteriorY
  );

  // Histogram: show Beta posterior PDF directly as a bar chart
  // This always displays from the very first shot
  const numBins = 10;
  const bins = Array.from({ length: numBins }, (_, i) => (i + 0.5) / numBins);
  const binWidth = 1 / numBins;

  // Beta posterior PDF values at each bin center (normalized for display)
  const pdfY = bins.map((x) => jStat.beta.pdf(x, posterior.alpha, posterior.beta));
  // Normalize so bars represent density
  const pdfSum = pdfY.reduce((s, v) => s + v, 0);
  const normalizedPdf = pdfSum > 0 ? pdfY.map((v) => v / pdfSum) : pdfY;

  // Also overlay the cumulative success rate as a marker
  const currentRate = successes / results.length;
  const rateBar = bins.map((x) => {
    // Highlight the bin that contains the current success rate
    const lo = x - binWidth / 2;
    const hi = x + binWidth / 2;
    return (currentRate >= lo && currentRate < hi) ? Math.max(...normalizedPdf) * 1.1 : 0;
  });

  histChart.update(
    bins.map((b) => `${(b * 100).toFixed(0)}%`),
    normalizedPdf,
    rateBar
  );
}

function updateStats(results, statsRows) {
  if (results.length === 0) {
    updateStatsRows(statsRows, [{ label: 'シュート数', value: '0' }]);
    return;
  }
  const successes = results.filter((r) => r === 1).length;
  const failures = results.length - successes;
  const posterior = betaBernoulliUpdate(1, 1, successes, failures);

  updateStatsRows(statsRows, [
    { label: 'シュート数', value: `${results.length}` },
    { label: '成功', value: `${successes}` },
    { label: '成功率', value: `${((successes / results.length) * 100).toFixed(1)}%` },
    { label: 'ベイズ推定 E[p]', value: `${(posterior.alpha / (posterior.alpha + posterior.beta) * 100).toFixed(1)}%` },
    { label: '95%信用区間', value: `${(jStat.beta.inv(0.025, posterior.alpha, posterior.beta) * 100).toFixed(1)}% 〜 ${(jStat.beta.inv(0.975, posterior.alpha, posterior.beta) * 100).toFixed(1)}%` },
  ]);
}

export function cleanup() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  shotsFired = 0;
  shotsHit = 0;
}
