/**
 * Shared game page layout template.
 * Creates a consistent structure for all game pages.
 */
import { navigate } from '../router.js';
import { clearResults } from '../data/store.js';

/**
 * Create the game page layout.
 * @param {Object} config
 * @param {string} config.id - Game ID
 * @param {string} config.emoji - Emoji icon
 * @param {string} config.title - Game title
 * @param {string} config.distribution - Distribution name
 * @param {string} config.color - Theme color name
 * @returns {{ container: HTMLElement, gameArea: HTMLElement, statsGrid: HTMLElement, explainArea: HTMLElement }}
 */
export function createGameLayout({ id, emoji, title, distribution, color }) {
  const container = document.createElement('div');
  container.className = 'game-page animate-fade-in';
  container.style.setProperty('--game-color', `var(--color-${color})`);
  container.style.setProperty('--game-glow', `var(--color-${color}-glow)`);

  container.innerHTML = `
    <div class="game-page-header">
      <button class="game-page-back" id="game-back-btn">←</button>
      <div>
        <div class="game-page-title">${emoji} ${title}</div>
        <div class="game-page-dist">${distribution}</div>
      </div>
    </div>
    <div class="game-area" id="game-area"></div>
    <div class="stats-grid" id="stats-grid">
      <div class="stats-panel">
        <div class="stats-panel-title">ヒストグラム + 理論分布</div>
        <div style="height: 250px;"><canvas id="histogram-canvas"></canvas></div>
      </div>
      <div class="stats-panel">
        <div class="stats-panel-title">ベイズ更新</div>
        <div style="height: 250px;"><canvas id="bayes-canvas"></canvas></div>
      </div>
    </div>
    <div id="stats-detail" class="stats-panel" style="margin-bottom: 24px;">
      <div class="stats-panel-title">統計量</div>
      <div id="stats-rows"></div>
    </div>
    <div id="explain-area"></div>
    <div class="reset-area">
      <button class="game-btn game-btn--secondary" id="reset-btn">🗑 データをリセット</button>
    </div>
  `;

  // Wire up back button
  container.querySelector('#game-back-btn').addEventListener('click', () => {
    navigate('/');
  });

  // Wire up reset button
  container.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('すべてのデータをリセットしますか？')) {
      clearResults(id);
      // Reload the game
      navigate(container.dataset.route || '/');
      setTimeout(() => navigate(id), 10);
    }
  });

  return {
    container,
    gameArea: container.querySelector('#game-area'),
    statsGrid: container.querySelector('#stats-grid'),
    explainArea: container.querySelector('#explain-area'),
    histogramCanvas: container.querySelector('#histogram-canvas'),
    bayesCanvas: container.querySelector('#bayes-canvas'),
    statsRows: container.querySelector('#stats-rows'),
  };
}

/**
 * Render stat rows into the stats detail panel.
 * @param {HTMLElement} statsRows
 * @param {Array<{label: string, value: string}>} stats
 */
export function updateStatsRows(statsRows, stats) {
  statsRows.innerHTML = stats
    .map(
      ({ label, value }) => `
    <div class="stat-row">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
    </div>
  `
    )
    .join('');
}
