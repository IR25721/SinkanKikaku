/**
 * Bayesian updating module.
 *
 * Supports conjugate updates for various distribution families.
 */

/**
 * Normal-Normal conjugate Bayesian update.
 * Given a prior N(mu0, sigma0^2) and observed data with known variance sigma^2,
 * compute the posterior distribution parameters.
 *
 * @param {number} priorMu - Prior mean
 * @param {number} priorSigma2 - Prior variance
 * @param {number[]} data - Observed data points
 * @param {number} likelihoodSigma2 - Known variance of the likelihood
 * @returns {{ mu: number, sigma2: number }}
 */
export function normalNormalUpdate(priorMu, priorSigma2, data, likelihoodSigma2) {
  const n = data.length;
  if (n === 0) return { mu: priorMu, sigma2: priorSigma2 };

  const dataSum = data.reduce((s, v) => s + v, 0);
  const dataMean = dataSum / n;

  const priorPrecision = 1 / priorSigma2;
  const likelihoodPrecision = n / likelihoodSigma2;

  const posteriorPrecision = priorPrecision + likelihoodPrecision;
  const posteriorSigma2 = 1 / posteriorPrecision;
  const posteriorMu =
    (priorPrecision * priorMu + likelihoodPrecision * dataMean) / posteriorPrecision;

  return { mu: posteriorMu, sigma2: posteriorSigma2 };
}

/**
 * Gamma-Exponential conjugate Bayesian update.
 * Prior: Gamma(alpha, beta) for the rate parameter lambda.
 * Likelihood: Exponential(lambda), observing data x1, x2, ...
 * Posterior: Gamma(alpha + n, beta + sum(xi))
 *
 * @param {number} priorAlpha
 * @param {number} priorBeta
 * @param {number[]} data
 * @returns {{ alpha: number, beta: number }}
 */
export function gammaExponentialUpdate(priorAlpha, priorBeta, data) {
  const n = data.length;
  if (n === 0) return { alpha: priorAlpha, beta: priorBeta };

  const dataSum = data.reduce((s, v) => s + v, 0);

  return {
    alpha: priorAlpha + n,
    beta: priorBeta + dataSum,
  };
}

/**
 * Gamma-Poisson conjugate Bayesian update.
 * Prior: Gamma(alpha, beta) for the rate parameter lambda.
 * Likelihood: Poisson(lambda), observing counts k1, k2, ...
 * Posterior: Gamma(alpha + sum(ki), beta + n)
 *
 * @param {number} priorAlpha
 * @param {number} priorBeta
 * @param {number[]} data - Array of observed counts
 * @returns {{ alpha: number, beta: number }}
 */
export function gammaPoissonUpdate(priorAlpha, priorBeta, data) {
  const n = data.length;
  if (n === 0) return { alpha: priorAlpha, beta: priorBeta };

  const sumCounts = data.reduce((s, v) => s + v, 0);

  return {
    alpha: priorAlpha + sumCounts,
    beta: priorBeta + n,
  };
}

/**
 * Beta-Bernoulli conjugate Bayesian update.
 * Prior: Beta(alpha, beta) for probability p.
 * Likelihood: Bernoulli(p), observing successes and failures.
 *
 * @param {number} priorAlpha
 * @param {number} priorBeta
 * @param {number} successes
 * @param {number} failures
 * @returns {{ alpha: number, beta: number }}
 */
export function betaBernoulliUpdate(priorAlpha, priorBeta, successes, failures) {
  return {
    alpha: priorAlpha + successes,
    beta: priorBeta + failures,
  };
}
