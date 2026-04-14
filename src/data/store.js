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
