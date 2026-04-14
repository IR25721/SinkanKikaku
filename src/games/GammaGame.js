/**
 * Gamma Distribution Game — 注文待ち
 * Simulates waiting for N customers at a cafe.
 * Each customer arrives at exponentially distributed intervals.
 * The total wait for N customers follows a Gamma distribution.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { linspace, histogram, normalizeToDensity, mean, stddev, pdfValues } from '../stats/distributions.js';
import { jStat } from '../stats/distributions.js';

const GAME_ID = 'gamma';
const N_CUSTOMERS = 3; // We wait for 3 customers
const ARRIVAL_RATE = 1.0; // 1 customer per second on average
let simInterval = null;
let gameActive = false;

export function render(container) {
  const layout = createGameLayout({
    id: '/gamma',
    emoji: '☕',
    title: '注文待ち',
    distribution: 'ガンマ分布',
    color: 'gamma',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">カフェで${N_CUSTOMERS}人目のお客さんが来るまでの時間をシミュレーション！</p>
    <div class="cafe-area" id="cafe-area">
      <canvas id="cafe-canvas" width="400" height="200"></canvas>
    </div>
    <div style="font-family:var(--font-mono); margin-bottom:16px;">
      到着: <span id="arrival-count" style="color:var(--color-gamma);">0</span> / ${N_CUSTOMERS} 人
      ｜ 経過: <span id="elapsed-time" style="color:var(--color-gamma);">0.0</span> 秒
    </div>
    <button class="game-btn" id="start-btn">シミュレーション開始</button>
    <button class="game-btn game-btn--secondary" id="auto-btn" style="margin-left:8px;">10回自動実行</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: 'ガンマ分布',
      description:
        'ガンマ分布は指数分布の一般化で、n個の独立な指数分布に従う待ち時間の合計の分布です。形状パラメータ α が整数のとき、これは特にアーラン分布と呼ばれます。',
      formula: 'f(x) = \\frac{\\beta^\\alpha}{\\Gamma(\\alpha)} x^{\\alpha-1} e^{-\\beta x}',
      tags: ['連続分布', '指数分布の和', 'アーラン分布', '待ち行列理論'],
      realWorld: '保険の累積請求額、降雨量の分布、電話交換局の待ち時間',
    })
  );

  container.appendChild(layout.container);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '合計待ち時間の密度',
    color: '#8b5cf6',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#8b5cf6' });

  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const startBtn = layout.gameArea.querySelector('#start-btn');
  const autoBtn = layout.gameArea.querySelector('#auto-btn');
  const arrivalCount = layout.gameArea.querySelector('#arrival-count');
  const elapsedTime = layout.gameArea.querySelector('#elapsed-time');
  const cafeCanvas = layout.gameArea.querySelector('#cafe-canvas');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  function runSimulation(callback) {
    if (gameActive) return;
    gameActive = true;
    startBtn.disabled = true;
    autoBtn.disabled = true;
    gameResult.style.display = 'none';

    // Generate N exponential inter-arrival times
    const interArrivals = Array.from({ length: N_CUSTOMERS }, () =>
      jStat.exponential.sample(ARRIVAL_RATE)
    );
    const arrivalTimes = [];
    let cumTime = 0;
    interArrivals.forEach((t) => {
      cumTime += t;
      arrivalTimes.push(cumTime);
    });

    const totalTime = cumTime;
    let displayedArrivals = 0;
    let elapsed = 0;

    // Animate
    const speed = Math.max(0.05, totalTime / 50); // Normalize animation speed
    simInterval = setInterval(() => {
      elapsed += speed;
      elapsedTime.textContent = elapsed.toFixed(1);

      // Check arrivals
      while (displayedArrivals < N_CUSTOMERS && elapsed >= arrivalTimes[displayedArrivals]) {
        displayedArrivals++;
        arrivalCount.textContent = displayedArrivals;
      }

      drawCafe(cafeCanvas, displayedArrivals, N_CUSTOMERS, elapsed, arrivalTimes);

      if (displayedArrivals >= N_CUSTOMERS) {
        clearInterval(simInterval);
        gameActive = false;
        startBtn.disabled = false;
        autoBtn.disabled = false;

        const allResults = addResult(GAME_ID, totalTime);

        resultValue.textContent = `${totalTime.toFixed(2)} 秒`;
        resultLabel.textContent = `${N_CUSTOMERS}人到着までの合計待ち時間`;
        gameResult.style.display = 'block';
        startBtn.textContent = 'もう一度';

        updateCharts(allResults, histChart, bayesChart);
        updateStats(allResults, layout.statsRows);

        if (callback) callback();
      }
    }, 50);
  }

  startBtn.addEventListener('click', () => {
    arrivalCount.textContent = '0';
    elapsedTime.textContent = '0.0';
    runSimulation();
  });

  autoBtn.addEventListener('click', () => {
    let runs = 0;
    function runNext() {
      if (runs >= 10) return;
      runs++;
      arrivalCount.textContent = '0';
      elapsedTime.textContent = '0.0';
      runSimulation(() => {
        setTimeout(runNext, 300);
      });
    }
    runNext();
  });
}

function drawCafe(canvas, arrived, total, elapsed, arrivalTimes) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 400, 200);

  // Draw counter
  ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
  ctx.fillRect(10, 130, 380, 60);
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
  ctx.strokeRect(10, 130, 380, 60);

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px Inter';
  ctx.fillText('☕ カフェカウンター', 20, 165);

  // Draw arrived customers
  for (let i = 0; i < arrived; i++) {
    const x = 60 + i * 80;
    ctx.font = '30px serif';
    ctx.fillText('🧑', x, 120);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.7)';
    ctx.font = '10px Inter';
    ctx.fillText(`${arrivalTimes[i].toFixed(1)}s`, x, 80);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
  }

  // Waiting indicators
  for (let i = arrived; i < total; i++) {
    const x = 60 + i * 80;
    ctx.font = '30px serif';
    ctx.globalAlpha = 0.2;
    ctx.fillText('🧑', x, 120);
    ctx.globalAlpha = 1;
  }

  // Timeline
  const maxTime = Math.max(elapsed, ...arrivalTimes) + 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(20, 30);
  ctx.lineTo(380, 30);
  ctx.stroke();

  // Time position
  const timeX = 20 + (elapsed / maxTime) * 360;
  ctx.beginPath();
  ctx.arc(timeX, 30, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#8b5cf6';
  ctx.fill();
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  const numBins = Math.max(8, Math.min(20, Math.ceil(Math.sqrt(results.length))));
  const maxVal = Math.max(...results) + 1;
  const { bins, counts, binWidth } = histogram(results, numBins, 0, maxVal);
  const density = normalizeToDensity(counts, binWidth, results.length);

  // Theoretical Gamma PDF: alpha=N_CUSTOMERS, beta=ARRIVAL_RATE
  // jStat.gamma.pdf(x, shape, scale) where scale = 1/rate
  const pdfY = bins.map((x) => jStat.gamma.pdf(x, N_CUSTOMERS, 1 / ARRIVAL_RATE));

  histChart.update(
    bins.map((b) => b.toFixed(1)),
    density,
    pdfY
  );

  // Bayesian: compare different N values
  const bayesX = linspace(0.01, maxVal, 80);
  const gamma2Y = bayesX.map((x) => jStat.gamma.pdf(x, 2, 1 / ARRIVAL_RATE));
  const gamma3Y = bayesX.map((x) => jStat.gamma.pdf(x, N_CUSTOMERS, 1 / ARRIVAL_RATE));

  bayesChart.update(
    bayesX.map((x) => x.toFixed(1)),
    gamma2Y,
    gamma3Y
  );
}

function updateStats(results, statsRows) {
  if (results.length === 0) {
    updateStatsRows(statsRows, [{ label: 'シミュレーション回数', value: '0' }]);
    return;
  }
  const m = mean(results);
  const s = stddev(results);
  const theoreticalMean = N_CUSTOMERS / ARRIVAL_RATE;
  const theoreticalStd = Math.sqrt(N_CUSTOMERS) / ARRIVAL_RATE;

  updateStatsRows(statsRows, [
    { label: 'シミュレーション回数', value: `${results.length}` },
    { label: '平均待ち時間', value: `${m.toFixed(2)} 秒` },
    { label: '理論平均 (α/β)', value: `${theoreticalMean.toFixed(2)} 秒` },
    { label: '標準偏差', value: `${s.toFixed(2)} 秒` },
    { label: '理論標準偏差', value: `${theoreticalStd.toFixed(2)} 秒` },
  ]);
}

export function cleanup() {
  gameActive = false;
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
}
