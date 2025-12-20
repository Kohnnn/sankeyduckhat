/**
 * Property-based tests for SessionManager
 * Feature: ui-improvements-and-ai-enhancement
 * 
 * Property 1: Session Reset Clears All State
 * Validates: Requirements 1.1, 1.3, 1.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { SessionManager } from '../session-manager.js';

// Mock DOM elements and globals
const createMockDOM = () => {
  const tbody = { innerHTML: '', children: [] };
  const titleInput = { value: 'Test Diagram' };
  
  return {
    getElementById: vi.fn((id) => {
      if (id === 'data-table-body') return tbody;
      if (id === 'diagram-title-input') return titleInput;
      return null;
    }),
    tbody,
    titleInput
  };
};

// Mock localStorage
const createMockLocalStorage = () => {
  const store = new Map();
  return {
    getItem: vi.fn((key) => store.get(key) || null),
    setItem: vi.fn((key, value) => store.set(key, value)),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    key: vi.fn((index) => Array.from(store.keys())[index]),
    get length() { return store.size; },
    _store: store
  };
};

describe('SessionManager', () => {
  let mockDOM;
  let mockLocalStorage;
  let mockNodeColors;
  let mockNodeCustomizations;
  let mockCustomLayout;
  let mockRememberedMoves;
  let mockRememberedLabelMoves;
  let mockUndoManager;

  beforeEach(() => {
    mockDOM = createMockDOM();
    mockLocalStorage = createMockLocalStorage();
    mockNodeColors = {};
    mockNodeCustomizations = {};
    mockCustomLayout = {};
    mockRememberedMoves = new Map();
    mockRememberedLabelMoves = new Map();
    mockUndoManager = {
      clear: vi.fn(),
      getUndoCount: vi.fn(() => 0),
      getRedoCount: vi.fn(() => 0)
    };

    // Setup global mocks
    global.document = mockDOM;
    global.localStorage = mockLocalStorage;
    global.nodeColors = mockNodeColors;
    global.nodeCustomizations = mockNodeCustomizations;
    global.customLayout = mockCustomLayout;
    global.UndoManager = mockUndoManager;
    global.window = {
      rememberedMoves: mockRememberedMoves,
      rememberedLabelMoves: mockRememberedLabelMoves,
      process_sankey: vi.fn()
    };
    global.confirm = vi.fn(() => true);
    global.updateAIStatus = vi.fn();
  });

  describe('Property 1: Session Reset Clears All State', () => {
    /**
     * Feature: ui-improvements-and-ai-enhancement, Property 1: Session Reset Clears All State
     * For any session with diagram data, customizations, and undo history,
     * when the session is reset, all state SHALL be empty or at default values.
     */
    it('clears all state when session is reset', () => {
      fc.assert(
        fc.property(
          // Generate random node names
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          // Generate random colors
          fc.array(fc.hexaString({ minLength: 6, maxLength: 6 }), { minLength: 1, maxLength: 10 }),
          (nodeNames, colors) => {
            // Setup: populate state with random data
            nodeNames.forEach((name, i) => {
              mockNodeColors[name] = '#' + (colors[i % colors.length] || 'ffffff');
              mockNodeCustomizations[name] = { fillColor: '#' + (colors[i % colors.length] || 'ffffff') };
              mockCustomLayout[name] = { dx: i * 10, dy: i * 5 };
              mockRememberedMoves.set(name, [i * 10, i * 5]);
              mockRememberedLabelMoves.set(name, [i * 2, i * 3]);
            });

            // Add localStorage data
            mockLocalStorage.setItem('sankeymatic-progress', JSON.stringify({ test: true }));
            mockLocalStorage.setItem('sankeymatic-recent-colors', JSON.stringify(colors));

            // Verify state is populated
            expect(Object.keys(mockNodeColors).length).toBeGreaterThan(0);
            expect(Object.keys(mockNodeCustomizations).length).toBeGreaterThan(0);
            expect(mockRememberedMoves.size).toBeGreaterThan(0);

            // Execute reset (with confirmation mocked to true)
            const result = SessionManager.resetSession();

            // Verify reset was successful
            expect(result).toBe(true);

            // Verify all state is cleared
            expect(Object.keys(mockNodeColors).length).toBe(0);
            expect(Object.keys(mockNodeCustomizations).length).toBe(0);
            expect(Object.keys(mockCustomLayout).length).toBe(0);
            expect(mockRememberedMoves.size).toBe(0);
            expect(mockRememberedLabelMoves.size).toBe(0);

            // Verify UndoManager was cleared
            expect(mockUndoManager.clear).toHaveBeenCalled();

            // Verify localStorage was cleared
            expect(mockLocalStorage.removeItem).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not clear state when confirmation is cancelled', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          (nodeNames) => {
            // Setup: populate state
            nodeNames.forEach((name, i) => {
              mockNodeColors[name] = '#ffffff';
              mockNodeCustomizations[name] = { fillColor: '#ffffff' };
            });

            const initialCount = Object.keys(mockNodeColors).length;

            // Mock confirmation to return false
            global.confirm = vi.fn(() => false);

            // Execute reset
            const result = SessionManager.resetSession();

            // Verify reset was cancelled
            expect(result).toBe(false);

            // Verify state is NOT cleared
            expect(Object.keys(mockNodeColors).length).toBe(initialCount);
            expect(Object.keys(mockNodeCustomizations).length).toBe(initialCount);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('clearDiagramData', () => {
    it('clears all diagram-related state', () => {
      // Setup
      mockNodeColors['TestNode'] = '#ff0000';
      mockNodeCustomizations['TestNode'] = { fillColor: '#ff0000' };
      mockCustomLayout['TestNode'] = { dx: 10, dy: 20 };
      mockRememberedMoves.set('TestNode', [10, 20]);
      mockRememberedLabelMoves.set('TestNode', [5, 10]);

      // Execute
      SessionManager.clearDiagramData();

      // Verify
      expect(Object.keys(mockNodeColors).length).toBe(0);
      expect(Object.keys(mockNodeCustomizations).length).toBe(0);
      expect(Object.keys(mockCustomLayout).length).toBe(0);
      expect(mockRememberedMoves.size).toBe(0);
      expect(mockRememberedLabelMoves.size).toBe(0);
    });
  });

  describe('clearLocalStorage', () => {
    it('removes all sankeymatic keys from localStorage', () => {
      // Setup
      mockLocalStorage.setItem('sankeymatic-progress', 'data1');
      mockLocalStorage.setItem('sankeymatic-recent-colors', 'data2');
      mockLocalStorage.setItem('other-key', 'data3');

      // Execute
      SessionManager.clearLocalStorage();

      // Verify sankeymatic keys were removed
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sankeymatic-progress');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sankeymatic-recent-colors');
    });
  });

  describe('getSessionState', () => {
    it('returns accurate state counts', () => {
      // Setup
      mockNodeColors['Node1'] = '#ff0000';
      mockNodeColors['Node2'] = '#00ff00';
      mockNodeCustomizations['Node1'] = { fillColor: '#ff0000' };
      mockRememberedMoves.set('Node1', [10, 20]);

      // Execute
      const state = SessionManager.getSessionState();

      // Verify
      expect(state.nodeColorsCount).toBe(2);
      expect(state.nodeCustomizationsCount).toBe(1);
      expect(state.rememberedMovesCount).toBe(1);
    });
  });
});
