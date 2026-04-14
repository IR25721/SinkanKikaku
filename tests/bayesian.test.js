/**
 * Unit tests for the Bayesian updating module.
 */
import { describe, it, expect } from 'vitest';
import {
  normalNormalUpdate,
  gammaExponentialUpdate,
  gammaPoissonUpdate,
  betaBernoulliUpdate,
} from '../src/stats/bayesian.js';

describe('normalNormalUpdate', () => {
  it('should return prior when no data', () => {
    const result = normalNormalUpdate(10, 4, [], 1);
    expect(result.mu).toBe(10);
    expect(result.sigma2).toBe(4);
  });

  it('should move posterior toward data mean', () => {
    const priorMu = 10;
    const data = [12, 12, 12, 12, 12]; // data mean = 12
    const result = normalNormalUpdate(priorMu, 4, data, 1);
    // Posterior mean should be between 10 and 12, closer to 12
    expect(result.mu).toBeGreaterThan(priorMu);
    expect(result.mu).toBeLessThanOrEqual(12);
  });

  it('should reduce variance with more data', () => {
    const result1 = normalNormalUpdate(10, 4, [11], 1);
    const result5 = normalNormalUpdate(10, 4, [11, 11, 11, 11, 11], 1);
    expect(result5.sigma2).toBeLessThan(result1.sigma2);
  });

  it('should match analytical solution', () => {
    // Prior: N(0, 1), Likelihood sigma2 = 1, one observation at x=2
    // Posterior precision = 1 + 1 = 2 => sigma2 = 0.5
    // Posterior mean = (1*0 + 1*2) / 2 = 1
    const result = normalNormalUpdate(0, 1, [2], 1);
    expect(result.mu).toBeCloseTo(1);
    expect(result.sigma2).toBeCloseTo(0.5);
  });
});

describe('gammaExponentialUpdate', () => {
  it('should return prior when no data', () => {
    const result = gammaExponentialUpdate(1, 1, []);
    expect(result.alpha).toBe(1);
    expect(result.beta).toBe(1);
  });

  it('should increase alpha by n', () => {
    const data = [1.5, 2.0, 0.5];
    const result = gammaExponentialUpdate(1, 1, data);
    expect(result.alpha).toBe(4); // 1 + 3
  });

  it('should increase beta by sum of data', () => {
    const data = [1.5, 2.0, 0.5];
    const result = gammaExponentialUpdate(1, 1, data);
    expect(result.beta).toBeCloseTo(5); // 1 + 4.0
  });
});

describe('gammaPoissonUpdate', () => {
  it('should return prior when no data', () => {
    const result = gammaPoissonUpdate(2, 0.5, []);
    expect(result.alpha).toBe(2);
    expect(result.beta).toBe(0.5);
  });

  it('should update correctly', () => {
    // Prior: Gamma(2, 0.5), data: [3, 5, 2] => alpha = 2+10=12, beta = 0.5+3=3.5
    const result = gammaPoissonUpdate(2, 0.5, [3, 5, 2]);
    expect(result.alpha).toBe(12);
    expect(result.beta).toBeCloseTo(3.5);
  });

  it('should have posterior mean converge to sample mean rate', () => {
    // With lots of data, posterior mean alpha/beta ≈ sample mean
    const data = Array.from({ length: 100 }, () => 5);
    const result = gammaPoissonUpdate(1, 1, data);
    const posteriorMean = result.alpha / result.beta;
    expect(posteriorMean).toBeCloseTo(5, 0);
  });
});

describe('betaBernoulliUpdate', () => {
  it('should return prior when no successes or failures', () => {
    const result = betaBernoulliUpdate(1, 1, 0, 0);
    expect(result.alpha).toBe(1);
    expect(result.beta).toBe(1);
  });

  it('should update alpha with successes', () => {
    const result = betaBernoulliUpdate(1, 1, 10, 0);
    expect(result.alpha).toBe(11);
    expect(result.beta).toBe(1);
  });

  it('should update beta with failures', () => {
    const result = betaBernoulliUpdate(1, 1, 0, 10);
    expect(result.alpha).toBe(1);
    expect(result.beta).toBe(11);
  });

  it('should have correct posterior mean', () => {
    // Posterior mean E[p] = alpha / (alpha + beta)
    const result = betaBernoulliUpdate(1, 1, 7, 3);
    const posteriorMean = result.alpha / (result.alpha + result.beta);
    // Should be close to 8/12 ≈ 0.667
    expect(posteriorMean).toBeCloseTo(0.667, 2);
  });
});
