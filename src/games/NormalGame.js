/**
 * Normal Distribution Game — 10秒チャレンジ
 * The player tries to count exactly 10 seconds in their head.
 * The error follows a normal distribution.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { linspace, pdfValues, histogram, normalizeToDensity, mean, stddev } from '../stats/distributions.js';
import { normalNormalUpdate } from '../stats/bayesian.js';

const GAME_ID = 'normal';
const TARGET_SECONDS = 10;
let timerInterval = null;
let startTime = null;
let isRunning = false;

export function render(container) {
  const layout = createGameLayout({
    id: '/normal',
    emoji: '⏱',
    title: '10秒チャレンジ',
    distribution: '正規分布',
    color: 'normal',
  });

  // Game area
  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">目を閉じ,心の中で10秒を計測してください</p>
    <div class="timer-display" id="timer-display">0.000</div>
    <button class="game-btn" id="start-btn">スタート</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  // Explain card
  layout.explainArea.appendChild(
    renderExplainCard({
      title: '正規分布 (Gaussian Distribution)',
      description:
        '計測誤差は平均値の周りに対称に分布し,平均からの距離が大きくなるほど頻度が減少する. 体内時計の誤差は,中心極限定理によりおおよそ正規分布に従う.',
      formula: 'f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} \\exp\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right)',
      tags: ['連続分布', '対称', '中心極限定理'],
      realWorld: '身長の分布,テストの成績,製品の品質管理',
    })
  );

  container.appendChild(layout.container);

  // Initialize charts
  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '計測データ密度',
    color: '#6366f1',
  });

  const bayesChart = createBayesChart(layout.bayesCanvas, {
    color: '#6366f1',
  });

  // Load existing data & update
  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  // Event handlers
  const startBtn = layout.gameArea.querySelector('#start-btn');
  const timerDisplay = layout.gameArea.querySelector('#timer-display');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  startBtn.addEventListener('click', () => {
    if (!isRunning) {
      // Start timer
      isRunning = true;
      startTime = performance.now();
      startBtn.textContent = 'ストップ！';
      timerDisplay.textContent = '計測中...';
      timerDisplay.classList.add('timer-display--counting');
      gameResult.style.display = 'none';
    } else {
      // Stop timer
      isRunning = false;
      const elapsed = (performance.now() - startTime) / 1000;
      timerDisplay.classList.remove('timer-display--counting');
      timerDisplay.textContent = elapsed.toFixed(3);
      startBtn.textContent = 'もう一度';

      // Save result
      const allResults = addResult(GAME_ID, elapsed);

      // Show result
      const diff = elapsed - TARGET_SECONDS;
      resultValue.textContent = `${elapsed.toFixed(3)} 秒`;
      resultLabel.textContent =
        diff > 0
          ? `${diff.toFixed(3)} 秒遅い`
          : diff < 0
            ? `${Math.abs(diff).toFixed(3)} 秒速い`
            : 'ぴったり！';
      gameResult.style.display = 'block';

      // Update charts
      updateCharts(allResults, histChart, bayesChart);
      updateStats(allResults, layout.statsRows);
    }
  });
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  // Histogram
  const numBins = Math.max(8, Math.min(20, Math.ceil(Math.sqrt(results.length))));
  const minVal = Math.min(...results) - 0.5;
  const maxVal = Math.max(...results) + 0.5;
  const { bins, counts, binWidth } = histogram(results, numBins, minVal, maxVal);
  const density = normalizeToDensity(counts, binWidth, results.length);

  // Theoretical PDF
  const m = mean(results);
  const s = stddev(results) || 1;
  const pdfX = linspace(minVal, maxVal, numBins);
  const pdfY = pdfValues('normal', pdfX, [m, s]);

  const labels = bins.map((b) => b.toFixed(1));
  histChart.update(labels, density, pdfY);

  // Bayesian update
  const priorMu = TARGET_SECONDS;
  const priorSigma2 = 4.0; // broad prior
  const likelihoodSigma2 = 1.0;
  const posterior = normalNormalUpdate(priorMu, priorSigma2, results, likelihoodSigma2);

  const bayesX = linspace(priorMu - 4, priorMu + 4, 80);
  const priorY = pdfValues('normal', bayesX, [priorMu, Math.sqrt(priorSigma2)]);
  const posteriorY = pdfValues('normal', bayesX, [posterior.mu, Math.sqrt(posterior.sigma2)]);
  const bayesLabels = bayesX.map((x) => x.toFixed(1));

  bayesChart.update(bayesLabels, priorY, posteriorY);
}

function updateStats(results, statsRows) {
  if (results.length === 0) {
    updateStatsRows(statsRows, [{ label: '試行回数', value: '0' }]);
    return;
  }

  const m = mean(results);
  const s = stddev(results);

  updateStatsRows(statsRows, [
    { label: '試行回数', value: `${results.length}` },
    { label: '平均', value: `${m.toFixed(3)} 秒` },
    { label: '標準偏差', value: `${s.toFixed(3)} 秒` },
    { label: '最小', value: `${Math.min(...results).toFixed(3)} 秒` },
    { label: '最大', value: `${Math.max(...results).toFixed(3)} 秒` },
  ]);
}

export function cleanup() {
  isRunning = false;
  startTime = null;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
