// Test setup file for Vitest
// This file runs before each test file

import fc from 'fast-check';

// Mock localStorage for tests
const localStorageMock = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock
});

// Configure fast-check for consistent property-based testing
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations as specified in design
  timeout: 5000,
  verbose: false,
  seed: 42 // Fixed seed for reproducible tests in CI
});

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear();
});
