/**
 * Runge-Kutta 4th Order Numerical Solver (RK4)
 * For solving systems of first-order differential equations.
 */

/**
 * Solve a system of ODEs using RK4.
 * @param {Function} f - Vectorized derivative function (t, y) => dy/dt
 * @param {number} t - Current time
 * @param {number[]} y - Current state vector
 * @param {number} h - Step size
 * @returns {number[]} New state vector
 */
export function rk4Step(f, t, y, h) {
  const k1 = f(t, y);
  const k2 = f(t + h / 2, y.map((yi, i) => yi + (h / 2) * k1[i]));
  const k3 = f(t + h / 2, y.map((yi, i) => yi + (h / 2) * k2[i]));
  const k4 = f(t + h, y.map((yi, i) => yi + h * k3[i]));

  return y.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/**
 * Geodesic equations for the Normal Distribution statistical manifold.
 * Coordinates: [mu, sigma, dot_mu, dot_sigma]
 * @param {number} t - Time (not used in autonomous system)
 * @param {number[]} state - [mu, sigma, dmu, dsigma]
 * @returns {number[]} [dmu, dsigma, ddmu, ddsigma]
 */
export function normalGeodesicEq(t, [mu, sigma, dmu, dsigma]) {
  // Safety: sigma should be positive. If it approaches 0, we treat it as very small.
  const s = Math.max(sigma, 0.001);

  // dd_mu = (2/s) * dmu * dsigma
  const ddmu = (2.0 / s) * dmu * dsigma;

  // dd_sigma = (1/s) * dsigma^2 - (1/(2*s)) * dmu^2
  const ddsigma = (1.0 / s) * (dsigma * dsigma) - (1.0 / (2.0 * s)) * (dmu * dmu);

  return [dmu, dsigma, ddmu, ddsigma];
}
