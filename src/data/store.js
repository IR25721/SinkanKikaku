/**
 * localStorage-based data store for game results.
 * Each game stores an array of data points.
 */

const STORE_KEY = 'distribution-experience';

/**
 * Load the full data store from localStorage.
 * @returns {Object<string, number[]>}
 */
export function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save the full data store to localStorage.
 * @param {Object<string, number[]>} store
 */
function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

/**
 * Get stored results for a specific game.
 * @param {string} gameId
 * @returns {number[]}
 */
export function getResults(gameId) {
  const store = loadStore();
  return store[gameId] || [];
}

/**
 * Add a result to a specific game.
 * @param {string} gameId
 * @param {number} value
 * @returns {number[]} updated results
 */
export function addResult(gameId, value) {
  const store = loadStore();
  if (!store[gameId]) {
    store[gameId] = [];
  }
  store[gameId].push(value);
  saveStore(store);
  return store[gameId];
}

/**
 * Clear all results for a specific game.
 * @param {string} gameId
 */
export function clearResults(gameId) {
  const store = loadStore();
  delete store[gameId];
  saveStore(store);
}

/**
 * Clear all game data.
 */
export function clearAll() {
  localStorage.removeItem(STORE_KEY);
}

/**
 * Export results for a specific game as a CSV file download.
 * @param {string} gameId
 */
export function exportResultsAsCSV(gameId) {
  const results = getResults(gameId);
  if (results.length === 0) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${gameId}_${timestamp}.csv`;

  const header = 'index,value';
  const rows = results.map((v, i) => `${i + 1},${v}`);
  const csv = [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
