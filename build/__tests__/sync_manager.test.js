/**
 * @fileoverview Unit tests for Sync Manager module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager, createSyncManager } from '../sync_manager.js';

describe('SyncManager', () => {
  let syncManager;
  let mockDataEditor;
  let mockAIChat;

  beforeEach(() => {
    syncManager = new SyncManager();
    
    // Mock Data Editor
    mockDataEditor = {
      updateFlows: vi.fn(),
      getCurrentFlows: vi.fn(() => []),
      highlightRows: vi.fn(),
      clearHighlights: vi.fn(),
      onDataChange: vi.fn()
    };

    // Mock AI Chat
    mockAIChat = {
      showResult: vi.fn(),
      showError: vi.fn()
    };
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(syncManager.dataEditor).toBeNull();
      expect(syncManager.aiChat).toBeNull();
      expect(syncManager.currentFlows).toEqual([]);
      expect(syncManager.syncCallbacks).toEqual([]);
      expect(syncManager.highlightedRows).toEqual(new Set());
    });
  });

  describe('registerDataEditor', () => {
    it('should register data editor', () => {
      syncManager.registerDataEditor(mockDataEditor);
      expect(syncManager.dataEditor).toBe(mockDataEditor);
    });

    it('should set up data change listener if available', () => {
      syncManager.registerDataEditor(mockDataEditor);
      expect(mockDataEditor.onDataChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle data editor without onDataChange method', () => {
      const editorWithoutListener = { updateFlows: vi.fn() };
      expect(() => {
        syncManager.registerDataEditor(editorWithoutListener);
      }).not.toThrow();
    });
  });

  describe('registerAIChat', () => {
    it('should register AI chat', () => {
      syncManager.registerAIChat(mockAIChat);
      expect(syncManager.aiChat).toBe(mockAIChat);
    });
  });

  describe('syncFromAI', () => {
    beforeEach(() => {
      syncManager.registerDataEditor(mockDataEditor);
    });

    it('should convert FinancialFlow to FlowRow format', () => {
      const financialFlows = [
        {
          source: 'Revenue',
          target: 'Gross Profit',
          amount: 1000,
          comparisonAmount: 900,
          category: 'revenue',
          color: '#888888'
        }
      ];

      syncManager.syncFromAI(financialFlows);

      expect(mockDataEditor.updateFlows).toHaveBeenCalledWith([
        {
          id: 'ai-flow-0',
          source: 'Revenue',
          target: 'Gross Profit',
          amount: 1000,
          comparison: 900,
          color: '#888888',
          isValid: true,
          errors: []
        }
      ]);
    });

    it('should handle flows with existing IDs', () => {
      const financialFlows = [
        {
          id: 'custom-id',
          source: 'Revenue',
          target: 'Gross Profit',
          amount: 1000,
          category: 'revenue'
        }
      ];

      syncManager.syncFromAI(financialFlows);

      expect(mockDataEditor.updateFlows).toHaveBeenCalledWith([
        {
          id: 'custom-id',
          source: 'Revenue',
          target: 'Gross Profit',
          amount: 1000,
          comparison: undefined,
          color: undefined,
          isValid: true,
          errors: []
        }
      ]);
    });

    it('should handle invalid input gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      syncManager.syncFromAI(null);
      expect(consoleSpy).toHaveBeenCalledWith('SyncManager: Invalid flows provided to syncFromAI');
      
      syncManager.syncFromAI('not an array');
      expect(consoleSpy).toHaveBeenCalledWith('SyncManager: Invalid flows provided to syncFromAI');
      
      consoleSpy.mockRestore();
    });

    it('should notify sync callbacks', () => {
      const callback = vi.fn();
      syncManager.onSync(callback);

      const flows = [{ source: 'A', target: 'B', amount: 100, category: 'revenue' }];
      syncManager.syncFromAI(flows);

      expect(callback).toHaveBeenCalledWith('ai', expect.any(Array));
    });
  });

  describe('syncToAI', () => {
    it('should return current flows', () => {
      const testFlows = [
        { id: '1', source: 'A', target: 'B', amount: 100, isValid: true, errors: [] }
      ];
      syncManager._updateCurrentFlows(testFlows);

      const result = syncManager.syncToAI();
      expect(result).toEqual(testFlows);
      expect(result).not.toBe(testFlows); // Should be a copy
    });

    it('should get flows from data editor if available', () => {
      const editorFlows = [
        { id: '2', source: 'C', target: 'D', amount: 200, isValid: true, errors: [] }
      ];
      mockDataEditor.getCurrentFlows.mockReturnValue(editorFlows);
      syncManager.registerDataEditor(mockDataEditor);

      const result = syncManager.syncToAI();
      expect(mockDataEditor.getCurrentFlows).toHaveBeenCalled();
      expect(result).toEqual(editorFlows);
    });
  });

  describe('highlightRows', () => {
    beforeEach(() => {
      syncManager.registerDataEditor(mockDataEditor);
    });

    it('should highlight specified rows', () => {
      const rowIds = ['row1', 'row2'];
      syncManager.highlightRows(rowIds);

      expect(syncManager.highlightedRows).toEqual(new Set(rowIds));
      expect(mockDataEditor.highlightRows).toHaveBeenCalledWith(rowIds);
    });

    it('should clear previous highlights before setting new ones', () => {
      // Set initial highlights
      syncManager.highlightRows(['row1']);
      expect(syncManager.highlightedRows).toEqual(new Set(['row1']));

      // Set new highlights
      syncManager.highlightRows(['row2', 'row3']);
      expect(syncManager.highlightedRows).toEqual(new Set(['row2', 'row3']));
    });

    it('should handle invalid input gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      syncManager.highlightRows('not an array');
      expect(consoleSpy).toHaveBeenCalledWith('SyncManager: rowIds must be an array');
      
      consoleSpy.mockRestore();
    });

    it('should use DOM fallback when data editor does not support highlighting', () => {
      const editorWithoutHighlight = { updateFlows: vi.fn() };
      syncManager.registerDataEditor(editorWithoutHighlight);

      // Mock DOM elements
      const mockElement1 = { classList: { add: vi.fn(), remove: vi.fn() } };
      const mockElement2 = { classList: { add: vi.fn(), remove: vi.fn() } };
      
      vi.spyOn(document, 'querySelector')
        .mockReturnValueOnce(mockElement1)
        .mockReturnValueOnce(mockElement2);

      syncManager.highlightRows(['row1', 'row2']);

      expect(mockElement1.classList.add).toHaveBeenCalledWith('ai-highlight');
      expect(mockElement2.classList.add).toHaveBeenCalledWith('ai-highlight');
    });
  });

  describe('clearHighlights', () => {
    beforeEach(() => {
      syncManager.registerDataEditor(mockDataEditor);
    });

    it('should clear all highlights', () => {
      syncManager.highlightRows(['row1', 'row2']);
      syncManager.clearHighlights();

      expect(syncManager.highlightedRows.size).toBe(0);
      expect(mockDataEditor.clearHighlights).toHaveBeenCalled();
    });

    it('should use DOM fallback when data editor does not support clearing', () => {
      const editorWithoutClear = { updateFlows: vi.fn(), highlightRows: vi.fn() };
      syncManager.registerDataEditor(editorWithoutClear);

      // Set up highlights first
      syncManager.highlightedRows.add('row1');
      syncManager.highlightedRows.add('row2');

      // Mock DOM elements
      const mockElement1 = { classList: { remove: vi.fn() } };
      const mockElement2 = { classList: { remove: vi.fn() } };
      
      vi.spyOn(document, 'querySelector')
        .mockReturnValueOnce(mockElement1)
        .mockReturnValueOnce(mockElement2);

      syncManager.clearHighlights();

      expect(mockElement1.classList.remove).toHaveBeenCalledWith('ai-highlight');
      expect(mockElement2.classList.remove).toHaveBeenCalledWith('ai-highlight');
    });
  });

  describe('onSync', () => {
    it('should register sync callback', () => {
      const callback = vi.fn();
      syncManager.onSync(callback);

      expect(syncManager.syncCallbacks).toContain(callback);
    });

    it('should ignore non-function callbacks', () => {
      const initialLength = syncManager.syncCallbacks.length;
      syncManager.onSync('not a function');
      syncManager.onSync(null);
      syncManager.onSync(undefined);

      expect(syncManager.syncCallbacks.length).toBe(initialLength);
    });

    it('should handle callback errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorCallback = vi.fn(() => { throw new Error('Callback error'); });
      const goodCallback = vi.fn();

      syncManager.onSync(errorCallback);
      syncManager.onSync(goodCallback);

      syncManager._notifySync('test', []);

      expect(consoleSpy).toHaveBeenCalledWith('SyncManager: Error in sync callback:', expect.any(Error));
      expect(goodCallback).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('utility methods', () => {
    it('getHighlightedRows should return array of highlighted row IDs', () => {
      syncManager.highlightedRows.add('row1');
      syncManager.highlightedRows.add('row2');

      const result = syncManager.getHighlightedRows();
      expect(result).toEqual(['row1', 'row2']);
    });

    it('getCurrentFlows should return copy of current flows', () => {
      const testFlows = [{ id: '1', source: 'A', target: 'B', amount: 100 }];
      syncManager._updateCurrentFlows(testFlows);

      const result = syncManager.getCurrentFlows();
      expect(result).toEqual(testFlows);
      expect(result).not.toBe(testFlows); // Should be a copy
    });
  });

  describe('createSyncManager', () => {
    it('should create new SyncManager instance', () => {
      const manager = createSyncManager();
      expect(manager).toBeInstanceOf(SyncManager);
    });
  });
});