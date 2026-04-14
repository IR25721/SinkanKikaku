/**
 * Histogram component using Chart.js.
 * Renders a histogram of user data with a theoretical PDF overlay.
 */
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
);

/**
 * Create a histogram + PDF overlay chart.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @param {string} options.label - Dataset label
 * @param {string} options.color - Theme color
 * @param {string} [options.barColor] - Bar fill color (defaults to color with alpha)
 * @returns {{ chart: Chart, update: Function }}
 */
export function createHistogramChart(canvas, { label = 'データ', color = '#6366f1', barColor } = {}) {
  const ctx = canvas.getContext('2d');

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: label,
          data: [],
          backgroundColor: barColor || color + '55',
          borderColor: color,
          borderWidth: 1,
          barPercentage: 0.95,
          categoryPercentage: 1.0,
          order: 2,
        },
        {
          label: '理論分布',
          data: [],
          type: 'line',
          borderColor: '#fff',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#9ca3b4',
            font: { size: 11, family: 'Inter' },
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: '#f0f0f5',
          bodyColor: '#9ca3b4',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#5a6178',
            font: { size: 10 },
            maxRotation: 0,
          },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#5a6178',
            font: { size: 10 },
          },
          beginAtZero: true,
        },
      },
    },
  });

  /**
   * Update the histogram with new data.
   * @param {string[]} labels - Bin labels
   * @param {number[]} histData - Histogram density/count values
   * @param {number[]} pdfData - Theoretical PDF values
   */
  function update(labels, histData, pdfData) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = histData;
    chart.data.datasets[1].data = pdfData;
    chart.update();
  }

  return { chart, update };
}

/**
 * Create a Bayesian update chart showing prior and posterior.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @param {string} options.color - Theme color
 * @returns {{ chart: Chart, update: Function }}
 */
export function createBayesChart(canvas, { color = '#6366f1' } = {}) {
  const ctx = canvas.getContext('2d');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '事前分布',
          data: [],
          borderColor: '#5a6178',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.4,
          fill: false,
          order: 2,
        },
        {
          label: '事後分布',
          data: [],
          borderColor: color,
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
          backgroundColor: color + '20',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#9ca3b4',
            font: { size: 11, family: 'Inter' },
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: '#f0f0f5',
          bodyColor: '#9ca3b4',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#5a6178',
            font: { size: 10 },
            maxRotation: 0,
          },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#5a6178',
            font: { size: 10 },
          },
          beginAtZero: true,
        },
      },
    },
  });

  /**
   * Update the Bayesian chart.
   * @param {string[]} labels
   * @param {number[]} priorData
   * @param {number[]} posteriorData
   */
  function update(labels, priorData, posteriorData) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = priorData;
    chart.data.datasets[1].data = posteriorData;
    chart.update();
  }

  return { chart, update };
}
