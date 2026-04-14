/**
 * Game card component for the landing page.
 */
import { navigate } from '../router.js';

/**
 * Render a game card.
 * @param {Object} config
 * @param {string} config.id - Game route path
 * @param {string} config.emoji - Display emoji
 * @param {string} config.title - Game title
 * @param {string} config.distribution - Distribution name
 * @param {string} config.description - Short description
 * @param {string} config.color - CSS variable name for color
 * @param {string} config.glow - CSS variable name for glow
 * @param {string} config.badge - Phase badge text
 * @returns {HTMLElement}
 */
export function renderGameCard({
  id,
  emoji,
  title,
  distribution,
  description,
  color,
  glow,
  badge,
}) {
  const card = document.createElement('div');
  card.className = 'game-card animate-fade-in-up';
  card.style.setProperty('--card-color', `var(--color-${color})`);
  card.style.setProperty('--card-glow', `var(--color-${color}-glow)`);
  card.id = `game-card-${id.replace('/', '')}`;

  card.innerHTML = `
    <span class="game-card-emoji">${emoji}</span>
    <div class="game-card-title">${title}</div>
    <div class="game-card-dist" style="color: var(--color-${color})">${distribution}</div>
    <div class="game-card-desc">${description}</div>
    ${badge ? `<span class="game-card-badge">${badge}</span>` : ''}
  `;

  card.addEventListener('click', () => navigate(id));

  // Staggered animation
  card.style.animationDelay = `${Math.random() * 0.2}s`;

  return card;
}
