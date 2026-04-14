/**
 * Explanation card component for distribution info.
 * Renders LaTeX formulas using KaTeX.
 */

/**
 * Render a LaTeX formula string into HTML using KaTeX.
 * Falls back to plain text if KaTeX is not loaded.
 * @param {string} latex
 * @param {boolean} [displayMode=true]
 * @returns {string} HTML string
 */
function renderLatex(latex, displayMode = true) {
  if (typeof window !== 'undefined' && window.katex) {
    try {
      return window.katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return `<code>${latex}</code>`;
    }
  }
  return `<code>${latex}</code>`;
}

/**
 * Render an explanation card.
 * @param {Object} config
 * @param {string} config.title - Card title
 * @param {string} config.description - Description text
 * @param {string} config.formula - LaTeX formula string
 * @param {string[]} config.tags - Tags like ['連続', 'メモリレス']
 * @param {string} config.realWorld - Real world example
 * @returns {HTMLElement}
 */
export function renderExplainCard({ title, description, formula, tags = [], realWorld = '' }) {
  const card = document.createElement('div');
  card.className = 'explain-card animate-fade-in-up';

  const formulaHtml = formula ? renderLatex(formula) : '';

  card.innerHTML = `
    <div class="explain-card-title">📖 ${title}</div>
    <div class="explain-card-body">
      <p>${description}</p>
      ${formulaHtml ? `<div class="explain-card-formula">${formulaHtml}</div>` : ''}
      ${realWorld ? `<p style="margin-top: 12px;">💡 <strong>日常の例:</strong> ${realWorld}</p>` : ''}
    </div>
    ${
      tags.length > 0
        ? `<div class="explain-card-tags">${tags.map((t) => `<span class="explain-card-tag">${t}</span>`).join('')}</div>`
        : ''
    }
  `;
  return card;
}
