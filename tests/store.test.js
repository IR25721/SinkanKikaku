/**
 * Unit tests for the data store module.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadStore, getResults, addResult, clearResults, clearAll } from '../src/data/store.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadStore', () => {
    it('should return empty object when no data', () => {
      expect(loadStore()).toEqual({});
    });

    it('should parse stored JSON', () => {
      localStorageMock.setItem('distribution-experience', JSON.stringify({ normal: [1, 2, 3] }));
      expect(loadStore()).toEqual({ normal: [1, 2, 3] });
    });
  });

  describe('getResults', () => {
    it('should return empty array for unknown game', () => {
      expect(getResults('unknown')).toEqual([]);
    });

    it('should return stored results', () => {
      localStorageMock.setItem(
        'distribution-experience',
        JSON.stringify({ normal: [9.8, 10.2] })
      );
      expect(getResults('normal')).toEqual([9.8, 10.2]);
    });
  });

  describe('addResult', () => {
    it('should add a result to an empty store', () => {
      const results = addResult('normal', 10.1);
      expect(results).toEqual([10.1]);
    });

    it('should append to existing results', () => {
      addResult('normal', 9.8);
      const results = addResult('normal', 10.2);
      expect(results).toEqual([9.8, 10.2]);
    });

    it('should store results for different games independently', () => {
      addResult('normal', 9.8);
      addResult('exponential', 2.5);
      expect(getResults('normal')).toEqual([9.8]);
      expect(getResults('exponential')).toEqual([2.5]);
    });
  });

  describe('clearResults', () => {
    it('should remove results for a specific game', () => {
      addResult('normal', 9.8);
      addResult('exponential', 2.5);
      clearResults('normal');
      expect(getResults('normal')).toEqual([]);
      expect(getResults('exponential')).toEqual([2.5]);
    });
  });

  describe('clearAll', () => {
    it('should remove all data', () => {
      addResult('normal', 9.8);
      addResult('exponential', 2.5);
      clearAll();
      expect(loadStore()).toEqual({});
    });
  });
});
