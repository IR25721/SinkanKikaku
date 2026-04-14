/**
 * Header component with navigation.
 */
import { navigate } from '../router.js';

/**
 * Render the header.
 * @returns {HTMLElement}
 */
export function renderHeader() {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <div class="header-inner">
      <div class="header-logo" id="header-logo">
        <span class="header-logo-icon">📊</span>
        <span>分布体験会</span>
      </div>
      <nav class="header-nav">
        <a href="#/" class="header-nav-link">ホーム</a>
      </nav>
    </div>
  `;

  header.querySelector('#header-logo').addEventListener('click', () => {
    navigate('/');
  });

  return header;
}
