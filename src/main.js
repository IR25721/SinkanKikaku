/**
 * Main entry point — 分布体験会
 * Sets up routing, header, and renders the landing page or individual games.
 */
import './style.css';
import { registerRoutes, startRouter } from './router.js';
import { renderHeader } from './components/Header.js';
import { renderGameCard } from './components/GameCard.js';
import { GAMES } from './games/gameDefinitions.js';

// Game modules (lazy-ish imports)
import * as NormalGame from './games/NormalGame.js';
import * as ExponentialGame from './games/ExponentialGame.js';
import * as PoissonGame from './games/PoissonGame.js';
import * as UniformGame from './games/UniformGame.js';
import * as LogNormalGame from './games/LogNormalGame.js';
import * as GeometricGame from './games/GeometricGame.js';
import * as BetaGame from './games/BetaGame.js';
import * as CauchyGame from './games/CauchyGame.js';
import * as WeibullGame from './games/WeibullGame.js';
import * as GammaGame from './games/GammaGame.js';

const gameModules = {
  '/normal': NormalGame,
  '/exponential': ExponentialGame,
  '/poisson': PoissonGame,
  '/uniform': UniformGame,
  '/lognormal': LogNormalGame,
  '/geometric': GeometricGame,
  '/beta': BetaGame,
  '/cauchy': CauchyGame,
  '/weibull': WeibullGame,
  '/gamma': GammaGame,
};

// Setup app
const app = document.getElementById('app');

// Add header
app.appendChild(renderHeader());

// Content container
const content = document.createElement('main');
content.id = 'content';
app.appendChild(content);

// Landing page renderer
function renderLanding(container) {
  const landing = document.createElement('div');
  landing.className = 'landing';

  // Hero
  const hero = document.createElement('div');
  hero.className = 'landing-hero animate-fade-in-up';
  hero.innerHTML = `
    <h1>分布体験会</h1>
    <p>確率分布の性質を,インタラクティブな実験を通じて体験的に学ぶ.<br/>
    以下の10種類の分布について,データ生成・ヒストグラム・ベイズ更新を実際に操作できる.</p>
  `;
  landing.appendChild(hero);

  // Phase groups
  const phases = [
    { label: '基本的な分布', phase: 1 },
    { label: '応用的な分布', phase: 2 },
    { label: '発展的な分布', phase: 3 },
  ];

  phases.forEach(({ label, phase }) => {
    const phaseTitle = document.createElement('div');
    phaseTitle.className = 'landing-phase-title';
    phaseTitle.textContent = label;
    landing.appendChild(phaseTitle);

    const grid = document.createElement('div');
    grid.className = 'game-grid';

    GAMES.filter((g) => g.phase === phase).forEach((game) => {
      grid.appendChild(renderGameCard(game));
    });

    landing.appendChild(grid);
  });

  container.appendChild(landing);
}

// Build routes
const routes = [
  { path: '/', render: renderLanding },
];

// Add game routes
Object.entries(gameModules).forEach(([path, mod]) => {
  routes.push({
    path,
    render: (container) => mod.render(container),
    cleanup: () => mod.cleanup && mod.cleanup(),
  });
});

registerRoutes(routes);
startRouter(content);
