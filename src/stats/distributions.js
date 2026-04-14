/**
 * Statistics utilities wrapping jStat for PDF/CDF calculations
 * and custom distribution helpers.
 */
import jStat from 'jstat';

// Re-export jStat for direct usage
export { jStat };

/**
 * Generate an array of evenly spaced numbers.
 * @param {number} start
 * @param {number} end
 * @param {number} numPoints
 * @returns {number[]}
 */
export function linspace(start, end, numPoints) {
  if (numPoints <= 1) return [start];
  const step = (end - start) / (numPoints - 1);
  return Array.from({ length: numPoints }, (_, i) => start + i * step);
}

/**
 * Calculate PDF values for a distribution over a range.
 * @param {string} distName - Distribution name (e.g., 'normal', 'exponential')
 * @param {number[]} xValues - X values to evaluate
 * @param {number[]} params - Distribution parameters
 * @returns {number[]}
 */
export function pdfValues(distName, xValues, params) {
  const dist = jStat[distName];
  if (!dist || !dist.pdf) {
    throw new Error(`Unknown distribution: ${distName}`);
  }
  return xValues.map((x) => dist.pdf(x, ...params));
}

/**
 * Calculate CDF values for a distribution over a range.
 * @param {string} distName
 * @param {number[]} xValues
 * @param {number[]} params
 * @returns {number[]}
 */
export function cdfValues(distName, xValues, params) {
  const dist = jStat[distName];
  if (!dist || !dist.cdf) {
    throw new Error(`Unknown distribution: ${distName}`);
  }
  return xValues.map((x) => dist.cdf(x, ...params));
}

/**
 * Calculate sample mean.
 * @param {number[]} data
 * @returns {number}
 */
export function mean(data) {
  if (data.length === 0) return 0;
  return data.reduce((sum, v) => sum + v, 0) / data.length;
}

/**
 * Calculate sample variance.
 * @param {number[]} data
 * @returns {number}
 */
export function variance(data) {
  if (data.length < 2) return 0;
  const m = mean(data);
  return data.reduce((sum, v) => sum + (v - m) ** 2, 0) / (data.length - 1);
}

/**
 * Calculate sample standard deviation.
 * @param {number[]} data
 * @returns {number}
 */
export function stddev(data) {
  return Math.sqrt(variance(data));
}

/**
 * Compute histogram bin counts.
 * @param {number[]} data
 * @param {number} numBins
 * @param {number} [minVal] - Optional minimum value
 * @param {number} [maxVal] - Optional maximum value
 * @returns {{ bins: number[], counts: number[], binWidth: number }}
 */
export function histogram(data, numBins, minVal, maxVal) {
  if (data.length === 0) {
    return { bins: [], counts: [], binWidth: 0 };
  }
  const min = minVal !== undefined ? minVal : Math.min(...data);
  const max = maxVal !== undefined ? maxVal : Math.max(...data);
  const range = max - min || 1;
  const binWidth = range / numBins;

  const bins = Array.from({ length: numBins }, (_, i) => min + (i + 0.5) * binWidth);
  const counts = new Array(numBins).fill(0);

  data.forEach((v) => {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= numBins) idx = numBins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  });

  return { bins, counts, binWidth };
}

/**
 * Normalize counts to a density (area = 1).
 * @param {number[]} counts
 * @param {number} binWidth
 * @param {number} totalSamples
 * @returns {number[]}
 */
export function normalizeToDensity(counts, binWidth, totalSamples) {
  if (totalSamples === 0 || binWidth === 0) return counts.map(() => 0);
  return counts.map((c) => c / (totalSamples * binWidth));
}
