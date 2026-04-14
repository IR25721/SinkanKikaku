/**
 * Geometric Distribution Game — コイントス
 * Flip a coin until heads appears. Count the number of flips.
 */
import { createGameLayout, updateStatsRows } from './GameLayout.js';
import { createHistogramChart, createBayesChart } from '../components/Histogram.js';
import { renderExplainCard } from '../components/ExplainCard.js';
import { getResults, addResult } from '../data/store.js';
import { mean, stddev } from '../stats/distributions.js';
import { jStat } from '../stats/distributions.js';

const GAME_ID = 'geometric';
const P_HEADS = 0.5;
let flipCount = 0;
let flipping = false;

export function render(container) {
  const layout = createGameLayout({
    id: '/geometric',
    emoji: '🎰',
    title: 'コイントス',
    distribution: '幾何分布',
    color: 'geometric',
  });

  layout.gameArea.innerHTML = `
    <p class="game-area-instruction">コインを投げ続けて、表が出るまで何回かかるか？</p>
    <div class="coin" id="coin">🪙</div>
    <div style="font-family:var(--font-mono); margin-bottom:8px;">
      <span id="flip-count" style="font-size:1.5rem; color:var(--color-geometric);">0</span>
      <span style="color:var(--text-secondary);"> 回目</span>
    </div>
    <div id="flip-history" style="font-size:1.5rem; min-height:36px; margin-bottom:16px; letter-spacing:4px;"></div>
    <button class="game-btn" id="flip-btn">コインを投げる</button>
    <div class="game-result" id="game-result" style="display:none;">
      <div class="game-result-value" id="result-value"></div>
      <div class="game-result-label" id="result-label"></div>
    </div>
  `;

  layout.explainArea.appendChild(
    renderExplainCard({
      title: '幾何分布',
      description:
        '成功確率 p の試行を繰り返したとき、初めて成功するまでの試行回数の分布です。「次こそは！」と思っても、過去の失敗は将来に影響しません（メモリレス性）。',
      formula: 'P(X=k) = (1-p)^{k-1} \\cdot p \\quad (k = 1, 2, 3, \\ldots)',
      tags: ['離散分布', 'メモリレス性', '初成功までの回数'],
      realWorld: 'ガチャで当たりが出るまでの回数、初めて的に当てるまでの射撃回数',
    })
  );

  container.appendChild(layout.container);

  const histChart = createHistogramChart(layout.histogramCanvas, {
    label: '試行回数の頻度',
    color: '#14b8a6',
  });
  const bayesChart = createBayesChart(layout.bayesCanvas, { color: '#14b8a6' });

  const results = getResults(GAME_ID);
  updateCharts(results, histChart, bayesChart);
  updateStats(results, layout.statsRows);

  const flipBtn = layout.gameArea.querySelector('#flip-btn');
  const coin = layout.gameArea.querySelector('#coin');
  const flipCountDisplay = layout.gameArea.querySelector('#flip-count');
  const flipHistory = layout.gameArea.querySelector('#flip-history');
  const gameResult = layout.gameArea.querySelector('#game-result');
  const resultValue = layout.gameArea.querySelector('#result-value');
  const resultLabel = layout.gameArea.querySelector('#result-label');

  flipBtn.addEventListener('click', () => {
    if (flipping) return;

    // If previous round ended, reset
    if (gameResult.style.display === 'block') {
      flipCount = 0;
      flipHistory.textContent = '';
      gameResult.style.display = 'none';
    }

    flipping = true;
    flipCount++;
    flipCountDisplay.textContent = flipCount;
    coin.classList.add('coin--flipping');

    setTimeout(() => {
      coin.classList.remove('coin--flipping');
      const isHeads = Math.random() < P_HEADS;

      if (isHeads) {
        coin.textContent = '😊';
        flipHistory.textContent += '◯';

        const allResults = addResult(GAME_ID, flipCount);
        resultValue.textContent = `${flipCount} 回`;
        resultLabel.textContent = '表が出るまでの回数';
        gameResult.style.display = 'block';
        flipBtn.textContent = 'もう一度';

        updateCharts(allResults, histChart, bayesChart);
        updateStats(allResults, layout.statsRows);
      } else {
        coin.textContent = '😢';
        flipHistory.textContent += '✕';
        flipBtn.textContent = 'もう一度投げる';
      }
      flipping = false;
    }, 600);
  });
}

function updateCharts(results, histChart, bayesChart) {
  if (results.length === 0) {
    histChart.update([], [], []);
    bayesChart.update([], [], []);
    return;
  }

  const maxK = Math.max(...results) + 2;
  const bins = Array.from({ length: maxK }, (_, i) => i + 1);
  const counts = new Array(maxK).fill(0);
  results.forEach((v) => {
    if (v >= 1 && v <= maxK) counts[v - 1]++;
  });
  const freq = counts.map((c) => c / results.length);

  // Theoretical PMF: P(X=k) = (1-p)^(k-1) * p
  const pmfY = bins.map((k) => Math.pow(1 - P_HEADS, k - 1) * P_HEADS);

  histChart.update(
    bins.map((b) => `${b}`),
    freq,
    pmfY
  );

  // Bayesian: Beta prior on p (success probability)
  const priorAlpha = 1;
  const priorBeta = 1;
  const successes = results.length; // each trial ends with 1 success
  const failures = results.reduce((s, v) => s + (v - 1), 0); // total failures

  const bayesX = Array.from({ length: 80 }, (_, i) => (i + 1) / 81);
  const priorY = bayesX.map((x) => jStat.beta.pdf(x, priorAlpha, priorBeta));
  const postAlpha = priorAlpha + successes;
  const postBeta = priorBeta + failures;
  const posteriorY = bayesX.map((x) => jStat.beta.pdf(x, postAlpha, postBeta));

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
    { label: 'ゲーム回数', value: `${results.length}` },
    { label: '平均回数', value: `${mean(results).toFixed(1)} (理論: ${(1 / P_HEADS).toFixed(1)})` },
    { label: '標準偏差', value: `${stddev(results).toFixed(1)}` },
    { label: '最大回数', value: `${Math.max(...results)}` },
  ]);
}

export function cleanup() {
  flipping = false;
  flipCount = 0;
}
