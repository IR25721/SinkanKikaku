/**
 * Unit tests for the SPA router.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerRoutes, navigate, getCurrentPath } from '../src/router.js';

// Mock window.location.hash
let mockHash = '';
Object.defineProperty(globalThis, 'window', {
  value: {
    location: {
      get hash() { return mockHash; },
      set hash(val) { mockHash = val; },
    },
    addEventListener: vi.fn(),
    scrollTo: vi.fn(),
  },
  writable: true,
});

describe('Router', () => {
  beforeEach(() => {
    mockHash = '';
  });

  describe('getCurrentPath', () => {
    it('should return "/" when hash is empty', () => {
      mockHash = '';
      expect(getCurrentPath()).toBe('/');
    });

    it('should return the hash path without #', () => {
      mockHash = '#/normal';
      expect(getCurrentPath()).toBe('/normal');
    });
  });

  describe('navigate', () => {
    it('should set the hash', () => {
      navigate('/exponential');
      expect(mockHash).toBe('/exponential');
    });
  });

  describe('registerRoutes', () => {
    it('should not throw', () => {
      expect(() => {
        registerRoutes([
          { path: '/', render: () => {} },
          { path: '/test', render: () => {} },
        ]);
      }).not.toThrow();
    });
  });
});
