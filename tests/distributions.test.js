/**
 * Unit tests for the distributions statistics module.
 */
import { describe, it, expect } from 'vitest';
import { linspace, mean, variance, stddev, histogram, normalizeToDensity, pdfValues, cdfValues } from '../src/stats/distributions.js';

describe('linspace', () => {
  it('should generate evenly spaced numbers', () => {
    const result = linspace(0, 1, 5);
    expect(result).toHaveLength(5);
    expect(result[0]).toBeCloseTo(0);
    expect(result[4]).toBeCloseTo(1);
    expect(result[2]).toBeCloseTo(0.5);
  });

  it('should handle single point', () => {
    const result = linspace(5, 5, 1);
    expect(result).toEqual([5]);
  });

  it('should handle negative ranges', () => {
    const result = linspace(-1, 1, 3);
    expect(result[0]).toBeCloseTo(-1);
    expect(result[1]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(1);
  });
});

describe('mean', () => {
  it('should calculate mean correctly', () => {
    expect(mean([1, 2, 3, 4, 5])).toBeCloseTo(3);
  });

  it('should return 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('should handle single value', () => {
    expect(mean([42])).toBe(42);
  });

  it('should handle negative values', () => {
    expect(mean([-1, 0, 1])).toBeCloseTo(0);
  });
});

describe('variance', () => {
  it('should compute sample variance', () => {
    // Var of [2, 4, 4, 4, 5, 5, 7, 9] = 4.571...
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.571, 2);
  });

  it('should return 0 for single element', () => {
    expect(variance([5])).toBe(0);
  });

  it('should return 0 for empty array', () => {
    expect(variance([])).toBe(0);
  });
});

describe('stddev', () => {
  it('should compute standard deviation', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(stddev(data)).toBeCloseTo(Math.sqrt(variance(data)));
  });
});

describe('histogram', () => {
  it('should compute histogram bins and counts', () => {
    const data = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    const { bins, counts, binWidth } = histogram(data, 4, 1, 5);

    expect(bins).toHaveLength(4);
    expect(counts).toHaveLength(4);
    expect(binWidth).toBeCloseTo(1);
    // Total counts should equal data length
    expect(counts.reduce((a, b) => a + b, 0)).toBe(data.length);
  });

  it('should handle empty data', () => {
    const { bins, counts, binWidth } = histogram([], 5);
    expect(bins).toHaveLength(0);
    expect(counts).toHaveLength(0);
    expect(binWidth).toBe(0);
  });

  it('should handle single value', () => {
    const { counts } = histogram([5], 3, 0, 10);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('normalizeToDensity', () => {
  it('should normalize counts to density', () => {
    const counts = [10, 20, 10];
    const binWidth = 1;
    const total = 40;
    const density = normalizeToDensity(counts, binWidth, total);

    // Sum of density * binWidth should ≈ 1
    const area = density.reduce((s, d) => s + d * binWidth, 0);
    expect(area).toBeCloseTo(1);
  });

  it('should handle zero total', () => {
    const density = normalizeToDensity([0, 0], 1, 0);
    expect(density).toEqual([0, 0]);
  });
});

describe('pdfValues', () => {
  it('should compute normal PDF values', () => {
    const x = [0];
    const result = pdfValues('normal', x, [0, 1]);
    // PDF of standard normal at x=0 is 1/sqrt(2*pi) ≈ 0.3989
    expect(result[0]).toBeCloseTo(0.3989, 3);
  });

  it('should throw for unknown distribution', () => {
    expect(() => pdfValues('nonexistent', [0], [])).toThrow();
  });
});

describe('cdfValues', () => {
  it('should compute normal CDF values', () => {
    const result = cdfValues('normal', [0], [0, 1]);
    expect(result[0]).toBeCloseTo(0.5);
  });
});
