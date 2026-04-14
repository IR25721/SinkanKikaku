/**
 * Poisson Distribution Game — タップカウント
 * Stars appear randomly on screen for 10 seconds.
 * The player taps to catch them. The count of caught stars ~ Poisson.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { linspace, pdfValues, histogram, normalizeToDensity, mean, stddev } from '../stats/distributions.js';
import { gammaPoissonUpdate } from '../stats/bayesian.js';
import { jStat } from '../stats/distributions.js';

const GAME_ID = 'poisson';
const DURATION = 10; // seconds
const STAR_RATE = 1.5; // stars per second on average
let gameTimer = null;
let starInterval = null;
let caughtCount = 0;
let gameActive = false;
let starTimeouts = [];

export function render(container) {
  const layout = createGameLayout({
    id: '/poisson',
    emoji: '🎯',
    title: 'タップカウント',
    distribution: 'ポアソン分布',
    color: 'poisson',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">10秒間に出現する ⭐ をタップして捕獲してください</p>
    <div style="display:flex; justify-content:space-between; width:100%; max-width:400px; margin-bottom:12px;">
      <span id="timer-label" style="font-family:var(--font-mono);">残り ${DURATION} 秒</span>
      <span id="count-label" style="font-family:var(--font-mono); color:var(--color-poisson);">捕獲: 0</span>
    </div>
    <div class="progress-bar" style="max-width:400px; margin-bottom:16px;">
      <div class="progress-bar-fill" id="progress-fill" style="width:100%;"></div>
    </div>
    <div class="starfield" id="starfield"></div>
    <button class="game-btn" id="start-btn" style="margin-top: 16px;">ゲーム開始</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: 'ポアソン分布 (Poisson Distribution)',
      description:
        '一定時間内にランダムに発生するイベントの回数を表す分布である. 平均発生率 λ のみで形が決まり,分散も λ に等しい.',
      formula: 'P(X=k) = \\frac{\\lambda^k \\, e^{-\\lambda}}{k!}',
      tags: ['離散分布', 'カウントデータ', '指数分布と対', '分散=平均'],
      realWorld: '1時間に来る電話の回数,1ページの誤植の数,交差点での事故件数',
    })
  );

  container.appendChild(layout.container);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '捕獲数の頻度',
    color: '#a855f7',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#a855f7' });

  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const startBtn = layout.gameArea.querySelector('#start-btn');
  const starfield = layout.gameArea.querySelector('#starfield');
  const timerLabel = layout.gameArea.querySelector('#timer-label');
  const countLabel = layout.gameArea.querySelector('#count-label');
  const progressFill = layout.gameArea.querySelector('#progress-fill');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  function spawnStar() {
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '⭐';
    star.style.left = `${Math.random() * 85 + 5}%`;
    star.style.top = `${Math.random() * 80 + 5}%`;

    star.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!star.classList.contains('star--caught')) {
        star.classList.add('star--caught');
        caughtCount++;
        countLabel.textContent = `捕獲: ${caughtCount}`;
        setTimeout(() => star.remove(), 300);
      }
    });

    starfield.appendChild(star);

    // Star disappears after 2-3 seconds
    const timeout = setTimeout(() => {
      if (star.parentNode) star.remove();
    }, 2000 + Math.random() * 1000);
    starTimeouts.push(timeout);
  }

  function startGame() {
    gameActive = true;
    caughtCount = 0;
    countLabel.textContent = '捕獲: 0';
    starfield.innerHTML = '';
    startBtn.style.display = 'none';
    gameResult.style.display = 'none';

    const startTime = Date.now();
    const endTime = startTime + DURATION * 1000;

    // Spawn stars at random intervals (Poisson process)
    function scheduleNextStar() {
      if (!gameActive) return;
      const interval = jStat.exponential.sample(STAR_RATE) * 1000;
      const timeout = setTimeout(() => {
        if (Date.now() < endTime && gameActive) {
          spawnStar();
          scheduleNextStar();
        }
      }, interval);
      starTimeouts.push(timeout);
    }
    scheduleNextStar();

    // Update timer
    gameTimer = setInterval(() => {
      const remaining = Math.max(0, (endTime - Date.now()) / 1000);
      timerLabel.textContent = `残り ${remaining.toFixed(1)} 秒`;
      progressFill.style.width = `${(remaining / DURATION) * 100}%`;

      if (remaining <= 0) {
        endGame();
      }
    }, 100);
  }

  function endGame() {
    gameActive = false;
    clearInterval(gameTimer);
    starTimeouts.forEach((t) => clearTimeout(t));
    starTimeouts = [];
    starfield.innerHTML = '';

    timerLabel.textContent = '終了！';
    progressFill.style.width = '0%';

    const allResults = addResult(GAME_ID, caughtCount);

    resultValue.textContent = `${caughtCount} 個`;
    resultLabel.textContent = '捕まえた星の数';
    gameResult.style.display = 'block';
    startBtn.style.display = 'inline-block';
    startBtn.textContent = 'もう一度';

    updateCharts(allResults, histChart, bayesChart);
    updateStats(allResults, layout.statsRows);
  }

  startBtn.addEventListener('click', startGame);
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  // For Poisson (discrete), we create a bar for each integer count
  const maxCount = Math.max(...results) + 2;
  const bins = Array.from({ length: maxCount + 1 }, (_, i) => i);
  const counts = new Array(maxCount + 1).fill(0);
  results.forEach((v) => {
    if (v >= 0 && v <= maxCount) counts[Math.round(v)]++;
  });
  const freq = counts.map((c) => c / results.length);

  // Theoretical PMF
  const lambda = mean(results) || STAR_RATE * DURATION;
  const pmfY = bins.map((k) => jStat.poisson.pdf(k, lambda));

  histChart.update(
    bins.map((b) => `${b}`),
    freq,
    pmfY
  );

  // Bayesian: Gamma prior on lambda
  const priorAlpha = 2;
  const priorBeta = 0.5;
  const posterior = gammaPoissonUpdate(priorAlpha, priorBeta, results);

  const bayesX = linspace(0.1, maxCount * 1.5, 80);
  const priorY = pdfValues('gamma', bayesX, [priorAlpha, 1 / priorBeta]);
  const posteriorY = pdfValues('gamma', bayesX, [posterior.alpha, 1 / posterior.beta]);
  bayesChart.update(
    bayesX.map((x) => x.toFixed(1)),
    priorY,
    posteriorY
  );
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
    { label: '平均捕獲数', value: `${m.toFixed(1)}` },
    { label: '分散', value: `${(s * s).toFixed(2)}` },
    { label: '分散/平均', value: `${(m > 0 ? (s * s) / m : 0).toFixed(2)} (≈1でPoisson)` },
  ]);
}

export function cleanup() {
  gameActive = false;
  if (gameTimer) clearInterval(gameTimer);
  starTimeouts.forEach((t) => clearTimeout(t));
  starTimeouts = [];
}
