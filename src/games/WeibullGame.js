/**
 * Weibull Distribution Game — 電球寿命
 * 10 lightbulbs run simultaneously. Players predict which will burn out next.
 * The burn-out times follow a Weibull distribution.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { linspace, histogram, normalizeToDensity, mean, stddev } from '../stats/distributions.js';
import { jStat } from '../stats/distributions.js';

const GAME_ID = 'weibull';
const NUM_BULBS = 10;
const SHAPE = 2.0; // k > 1 means failure rate increases with time
const SCALE = 5.0; // lambda
let bulbLifetimes = [];
let bulbsAlive = [];
let simTime = 0;
let simInterval = null;
let gameActive = false;

export function render(container) {
  const layout = createGameLayout({
    id: '/weibull',
    emoji: '💡',
    title: '電球寿命',
    distribution: 'ワイブル分布',
    color: 'weibull',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">10個の電球を観察する. 故障時刻の分布を記録する.</p>
    <div style="font-family:var(--font-mono); margin-bottom:16px;">
      経過時間: <span id="sim-time" style="color:var(--color-weibull);">0.0</span> 秒
      ｜ 残り: <span id="alive-count" style="color:var(--color-weibull);">${NUM_BULBS}</span> 個
    </div>
    <div class="bulb-grid" id="bulb-grid"></div>
    <button class="game-btn" id="start-btn">開始</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: 'ワイブル分布 (Weibull Distribution)',
      description:
        '信頼性工学で広く用いられる分布. 形状パラメータ k により故障率が時間とともに増加 (k>1),一定 (k=1: 指数分布),減少 (k<1) するパターンを表現できる. 本実験では k=2 とし,経年劣化型の故障を観察する.',
      formula: 'f(x) = \\frac{k}{\\lambda}\\left(\\frac{x}{\\lambda}\\right)^{k-1} \\exp\\left[-\\left(\\frac{x}{\\lambda}\\right)^k\\right]',
      tags: ['連続分布', '信頼性工学', '故障率変動'],
      realWorld: '機械部品の寿命,風速の分布,材料強度のばらつき',
    })
  );

  container.appendChild(layout.container);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '故障時刻の密度',
    color: '#06b6d4',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#06b6d4' });

  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const bulbGrid = layout.gameArea.querySelector('#bulb-grid');
  const startBtn = layout.gameArea.querySelector('#start-btn');
  const simTimeDisplay = layout.gameArea.querySelector('#sim-time');
  const aliveCount = layout.gameArea.querySelector('#alive-count');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  // Create bulb elements
  for (let i = 0; i < NUM_BULBS; i++) {
    const bulb = document.createElement('div');
    bulb.className = 'bulb';
    bulb.textContent = '💡';
    bulb.id = `bulb-${i}`;
    bulbGrid.appendChild(bulb);
  }

  startBtn.addEventListener('click', () => {
    if (gameActive) return;
    gameActive = true;
    startBtn.style.display = 'none';
    gameResult.style.display = 'none';
    simTime = 0;

    // Generate Weibull lifetimes
    bulbLifetimes = Array.from({ length: NUM_BULBS }, () =>
      jStat.weibull.sample(SCALE, SHAPE)
    );
    bulbsAlive = new Array(NUM_BULBS).fill(true);

    // Reset bulb display
    for (let i = 0; i < NUM_BULBS; i++) {
      const b = bulbGrid.querySelector(`#bulb-${i}`);
      b.className = 'bulb';
      b.textContent = '💡';
    }

    simInterval = setInterval(() => {
      simTime += 0.1;
      simTimeDisplay.textContent = simTime.toFixed(1);

      let justDied = false;
      for (let i = 0; i < NUM_BULBS; i++) {
        if (bulbsAlive[i] && simTime >= bulbLifetimes[i]) {
          bulbsAlive[i] = false;
          const b = bulbGrid.querySelector(`#bulb-${i}`);
          b.className = 'bulb bulb--off';
          b.textContent = '💀';

          // Record this failure time
          addResult(GAME_ID, bulbLifetimes[i]);
          justDied = true;
        }
      }

      const alive = bulbsAlive.filter(Boolean).length;
      aliveCount.textContent = alive;

      if (justDied) {
        const allResults = getResults(GAME_ID);
        updateCharts(allResults, histChart, bayesChart);
        updateStats(allResults, layout.statsRows);
      }

      if (alive === 0) {
        clearInterval(simInterval);
        gameActive = false;

        resultValue.textContent = '全滅';
        resultLabel.textContent = `全電球が ${simTime.toFixed(1)} 秒で故障`;
        gameResult.style.display = 'block';
        startBtn.style.display = 'inline-block';
        startBtn.textContent = '再実行';
      }
    }, 100);
  });
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

  const pdfY = bins.map((x) => jStat.weibull.pdf(x, SCALE, SHAPE));

  histChart.update(
    bins.map((b) => b.toFixed(1)),
    density,
    pdfY
  );

  // Compare: Weibull vs Exponential (k=1)
  const bayesX = linspace(0.01, maxVal, 80);
  const expY = bayesX.map((x) => jStat.exponential.pdf(x, 1 / SCALE));
  const weibullY = bayesX.map((x) => jStat.weibull.pdf(x, SCALE, SHAPE));

  bayesChart.update(
    bayesX.map((x) => x.toFixed(1)),
    expY,
    weibullY
  );
}

function updateStats(results, statsRows) {
  if (results.length === 0) {
    updateStatsRows(statsRows, [{ label: 'サンプル数', value: '0' }]);
    return;
  }
  const m = mean(results);
  const s = stddev(results);
  const theoreticalMean = SCALE * jStat.gammafn(1 + 1 / SHAPE);

  updateStatsRows(statsRows, [
    { label: 'サンプル数', value: `${results.length}` },
    { label: '平均寿命', value: `${m.toFixed(2)} 秒` },
    { label: '理論平均', value: `${theoreticalMean.toFixed(2)} 秒` },
    { label: '標準偏差', value: `${s.toFixed(2)} 秒` },
    { label: '形状パラメータ k', value: `${SHAPE} (>1: 経年劣化型)` },
  ]);
}

export function cleanup() {
  gameActive = false;
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
}
