/**
 * @fileoverview Integration tests for Sync Manager with other modules
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SyncManager } from '../sync_manager.js';
import { parse, serialize } from '../dsl_parser.js';

describe('SyncManager Integration', () => {
  let syncManager;

  beforeEach(() => {
    syncManager = new SyncManager();
  });

  describe('integration with DSL Parser', () => {
    it('should work with parsed DSL flows', () => {
      const dslText = `Revenue [1000] Gross Profit #888888
Gross Profit [600] Operating Profit
Gross Profit [400] Operating Expenses #E15549`;

      const parsedFlows = parse(dslText);
      
      // Convert to FinancialFlow format for AI sync
      const financialFlows = parsedFlows.map(flow => ({
        source: flow.source,
        target: flow.target,
        amount: flow.amount,
        category: flow.source.toLowerCase().includes('revenue') ? 'revenue' : 
                 flow.target.toLowerCase().includes('expense') ? 'expense' : 'profit',
        color: flow.color
      }));

      // Sync from AI should convert back to FlowRow format
      syncManager.syncFromAI(financialFlows);
      const syncedFlows = syncManager.getCurrentFlows();

      expect(syncedFlows).toHaveLength(3);
      expect(syncedFlows[0]).toMatchObject({
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1000,
        color: '#888888'
      });
    });

    it('should preserve data through round-trip sync', () => {
      const originalFlows = [
        {
          id: 'flow1',
          source: 'Revenue',
          target: 'Profit',
          amount: 1000,
          comparison: 900,
          color: '#00AA00',
          isValid: true,
          errors: []
        }
      ];

      syncManager._updateCurrentFlows(originalFlows);
      const aiContext = syncManager.syncToAI();
      
      // Convert to FinancialFlow and back
      const financialFlows = aiContext.map(flow => ({
        id: flow.id,
        source: flow.source,
        target: flow.target,
        amount: flow.amount,
        comparisonAmount: flow.comparison,
        category: 'profit',
        color: flow.color
      }));

      syncManager.syncFromAI(financialFlows);
      const finalFlows = syncManager.getCurrentFlows();

      expect(finalFlows[0]).toMatchObject({
        id: 'flow1',
        source: 'Revenue',
        target: 'Profit',
        amount: 1000,
        comparison: 900,
        color: '#00AA00'
      });
    });
  });

  describe('highlight functionality', () => {
    it('should handle highlighting with real DOM elements', () => {
      // Create mock DOM elements
      const mockRow1 = document.createElement('div');
      const mockRow2 = document.createElement('div');
      mockRow1.setAttribute('data-row-id', 'test-row-1');
      mockRow2.setAttribute('data-row-id', 'test-row-2');
      
      // Add to document for querySelector to find
      document.body.appendChild(mockRow1);
      document.body.appendChild(mockRow2);

      try {
        syncManager.highlightRows(['test-row-1', 'test-row-2']);

        expect(mockRow1.classList.contains('ai-highlight')).toBe(true);
        expect(mockRow2.classList.contains('ai-highlight')).toBe(true);
        expect(syncManager.getHighlightedRows()).toEqual(['test-row-1', 'test-row-2']);

        syncManager.clearHighlights();

        expect(mockRow1.classList.contains('ai-highlight')).toBe(false);
        expect(mockRow2.classList.contains('ai-highlight')).toBe(false);
        expect(syncManager.getHighlightedRows()).toEqual([]);
      } finally {
        // Clean up
        document.body.removeChild(mockRow1);
        document.body.removeChild(mockRow2);
      }
    });
  });

  describe('callback system', () => {
    it('should notify multiple callbacks on sync events', () => {
      const callbacks = [];
      const callbackData = [];

      // Register multiple callbacks
      for (let i = 0; i < 3; i++) {
        const callback = (source, data) => {
          callbackData.push({ callbackId: i, source, dataLength: data.length });
        };
        callbacks.push(callback);
        syncManager.onSync(callback);
      }

      const testFlows = [
        { source: 'A', target: 'B', amount: 100, category: 'revenue' },
        { source: 'B', target: 'C', amount: 50, category: 'expense' }
      ];

      syncManager.syncFromAI(testFlows);

      expect(callbackData).toHaveLength(3);
      callbackData.forEach(data => {
        expect(data.source).toBe('ai');
        expect(data.dataLength).toBe(2);
      });
    });
  });
});