/**
 * Exponential Distribution Game — ランダム待ち受け
 * A light flashes at random intervals (exponential). The player presses
 * a button as soon as they see the flash. We record the waiting times.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { linspace, pdfValues, histogram, normalizeToDensity, mean, stddev } from '../stats/distributions.js';
import { gammaExponentialUpdate } from '../stats/bayesian.js';
import { jStat } from '../stats/distributions.js';

const GAME_ID = 'exponential';
const RATE = 0.5; // Average 1 flash per 2 seconds
let flashTimeout = null;
let waitStartTime = null;
let gameActive = false;

export function render(container) {
  const layout = createGameLayout({
    id: '/exponential',
    emoji: '⚡',
    title: 'ランダム待ち受け',
    distribution: '指数分布',
    color: 'exponential',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">光ったらすぐにボタンを押してください（反応時間は含みません）</p>
    <div class="flash-area" id="flash-area">
      <span style="font-size: 3rem;">💡</span>
    </div>
    <div id="waiting-message" style="color: var(--text-secondary); margin-bottom: 16px; min-height: 24px;"></div>
    <button class="game-btn" id="start-btn">ゲーム開始</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: '指数分布',
      description:
        '次の事象が起こるまでの待ち時間の分布です。「メモリレス性」という特徴があり、どれだけ待ってもこの先の待ち時間の期待値は変わりません。',
      formula: 'f(x) = \\lambda e^{-\\lambda x} \\quad (x \\geq 0)',
      tags: ['連続分布', 'メモリレス性', '待ち時間', 'ポアソン過程と対'],
      realWorld: 'コンビニのレジに次の客が来るまでの時間、放射性崩壊の間隔',
    })
  );

  container.appendChild(layout.container);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '待ち時間の密度',
    color: '#10b981',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#10b981' });

  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const startBtn = layout.gameArea.querySelector('#start-btn');
  const flashArea = layout.gameArea.querySelector('#flash-area');
  const waitMsg = layout.gameArea.querySelector('#waiting-message');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  function scheduleFlash() {
    // Generate exponentially distributed waiting time
    const waitTime = jStat.exponential.sample(RATE);
    waitMsg.textContent = '光るのを待ってください...';
    gameResult.style.display = 'none';
    waitStartTime = performance.now();

    flashTimeout = setTimeout(() => {
      flashArea.classList.add('flash-area--active');
      startBtn.textContent = '光った！タップ！';
      startBtn.disabled = false;
    }, waitTime * 1000);
  }

  startBtn.addEventListener('click', () => {
    if (!gameActive) {
      // Start game
      gameActive = true;
      startBtn.textContent = '待機中...';
      startBtn.disabled = true;
      scheduleFlash();
    } else if (flashArea.classList.contains('flash-area--active')) {
      // Player caught the flash
      const elapsed = (performance.now() - waitStartTime) / 1000;
      flashArea.classList.remove('flash-area--active');

      const allResults = addResult(GAME_ID, elapsed);

      resultValue.textContent = `${elapsed.toFixed(2)} 秒`;
      resultLabel.textContent = '待ち時間';
      gameResult.style.display = 'block';
      waitMsg.textContent = '';

      updateCharts(allResults, histChart, bayesChart);
      updateStats(allResults, layout.statsRows);

      // Next round
      startBtn.textContent = '待機中...';
      startBtn.disabled = true;
      setTimeout(() => scheduleFlash(), 1000);
    }
  });
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  const numBins = Math.max(8, Math.min(20, Math.ceil(Math.sqrt(results.length))));
  const maxVal = Math.max(...results) + 0.5;
  const { bins, counts, binWidth } = histogram(results, numBins, 0, maxVal);
  const density = normalizeToDensity(counts, binWidth, results.length);

  const pdfX = linspace(0, maxVal, numBins);
  const pdfY = pdfValues('exponential', pdfX, [RATE]);

  histChart.update(
    bins.map((b) => b.toFixed(1)),
    density,
    pdfY
  );

  // Bayesian update: Gamma prior for rate lambda
  const priorAlpha = 1;
  const priorBeta = 1;
  const posterior = gammaExponentialUpdate(priorAlpha, priorBeta, results);

  const bayesX = linspace(0.01, 2, 80);
  const priorY = pdfValues('gamma', bayesX, [priorAlpha, 1 / priorBeta]); // jStat gamma uses scale
  const posteriorY = pdfValues('gamma', bayesX, [posterior.alpha, 1 / posterior.beta]);
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
  updateStatsRows(statsRows, [
    { label: '試行回数', value: `${results.length}` },
    { label: '平均待ち時間', value: `${mean(results).toFixed(2)} 秒` },
    { label: '標準偏差', value: `${stddev(results).toFixed(2)} 秒` },
    { label: '理論平均 (1/λ)', value: `${(1 / RATE).toFixed(2)} 秒` },
  ]);
}

export function cleanup() {
  gameActive = false;
  if (flashTimeout) {
    clearTimeout(flashTimeout);
    flashTimeout = null;
  }
}
