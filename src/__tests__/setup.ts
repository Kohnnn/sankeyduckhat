import '@testing-library/jest-dom';

// Only mock localStorage for React tests (src directory)
// The build tests have their own localStorage mocking

// Mock matchMedia for Chakra UI color mode support in tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver for react-datasheet-grid
// Simple mock that doesn't trigger callbacks to avoid infinite re-renders
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

