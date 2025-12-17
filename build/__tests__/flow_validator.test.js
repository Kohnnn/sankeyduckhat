/**
 * @fileoverview Unit tests for Flow Validator module
 */

import { describe, test, expect } from 'vitest';
import { FlowValidator, validateBalance, getNodeStats, formatImbalanceWarnings, getStatusMessage } from '../flow_validator.js';

describe('FlowValidator', () => {
  const validator = new FlowValidator();

  describe('getNodeStats', () => {
    test('should handle empty flow array', () => {
      const stats = validator.getNodeStats([]);
      expect(stats.size).toBe(0);
    });

    test('should calculate node statistics correctly', () => {
      const flows = [
        { source: 'A', target: 'B', amount: 100 },
        { source: 'B', target: 'C', amount: 60 },
        { source: 'B', target: 'D', amount: 40 }
      ];

      const stats = validator.getNodeStats(flows);
      
      expect(stats.get('A')).toEqual({
        totalIn: 0,
        totalOut: 100,
        isSource: true,
        isSink: false
      });

      expect(stats.get('B')).toEqual({
        totalIn: 100,
        totalOut: 100,
        isSource: false,
        isSink: false
      });

      expect(stats.get('C')).toEqual({
        totalIn: 60,
        totalOut: 0,
        isSource: false,
        isSink: true
      });

      expect(stats.get('D')).toEqual({
        totalIn: 40,
        totalOut: 0,
        isSource: false,
        isSink: true
      });
    });

    test('should handle string amounts', () => {
      const flows = [
        { source: 'A', target: 'B', amount: '100.50' },
        { source: 'B', target: 'C', amount: '100.50' }
      ];

      const stats = validator.getNodeStats(flows);
      
      expect(stats.get('A').totalOut).toBe(100.50);
      expect(stats.get('B').totalIn).toBe(100.50);
      expect(stats.get('B').totalOut).toBe(100.50);
    });

    test('should skip wildcard amounts', () => {
      const flows = [
        { source: 'A', target: 'B', amount: '*' },
        { source: 'B', target: 'C', amount: 50 }
      ];

      const stats = validator.getNodeStats(flows);
      
      expect(stats.get('A').totalOut).toBe(0);
      expect(stats.get('B').totalIn).toBe(0);
      expect(stats.get('B').totalOut).toBe(50);
    });

    test('should handle comparison amounts', () => {
      const flows = [
        { source: 'A', target: 'B', amount: '100|90' },
        { source: 'B', target: 'C', amount: '100|90' }
      ];

      const stats = validator.getNodeStats(flows);
      
      expect(stats.get('A').totalOut).toBe(100);
      expect(stats.get('B').totalIn).toBe(100);
      expect(stats.get('B').totalOut).toBe(100);
    });
  });

  describe('validateBalance', () => {
    test('should return balanced for empty flows', () => {
      const result = validator.validateBalance([]);
      expect(result.isBalanced).toBe(true);
      expect(result.imbalancedNodes).toEqual([]);
    });

    test('should return balanced for perfectly balanced flows', () => {
      const flows = [
        { source: 'Revenue', target: 'Gross Profit', amount: 100 },
        { source: 'Revenue', target: 'COGS', amount: 60 },
        { source: 'Gross Profit', target: 'Net Profit', amount: 40 },
        { source: 'Gross Profit', target: 'Expenses', amount: 20 }
      ];

      const result = validator.validateBalance(flows);
      expect(result.isBalanced).toBe(false); // Revenue is imbalanced (160 out, 0 in)
      
      // Let's fix the flows to be properly balanced
      const balancedFlows = [
        { source: 'Revenue', target: 'Gross Profit', amount: 40 },
        { source: 'Revenue', target: 'COGS', amount: 60 },
        { source: 'Gross Profit', target: 'Net Profit', amount: 20 },
        { source: 'Gross Profit', target: 'Expenses', amount: 20 }
      ];

      const balancedResult = validator.validateBalance(balancedFlows);
      expect(balancedResult.isBalanced).toBe(true);
      expect(balancedResult.imbalancedNodes).toEqual([]);
    });

    test('should detect imbalanced intermediate nodes', () => {
      const flows = [
        { source: 'A', target: 'B', amount: 100 },
        { source: 'B', target: 'C', amount: 60 }, // B is imbalanced: 100 in, 60 out
      ];

      const result = validator.validateBalance(flows);
      expect(result.isBalanced).toBe(false);
      expect(result.imbalancedNodes).toHaveLength(1);
      expect(result.imbalancedNodes[0]).toEqual({
        name: 'B',
        totalIn: 100,
        totalOut: 60,
        difference: -40 // More in than out
      });
    });

    test('should ignore source and sink nodes in balance validation', () => {
      const flows = [
        { source: 'Source', target: 'Intermediate', amount: 100 },
        { source: 'Intermediate', target: 'Sink', amount: 100 }
      ];

      const result = validator.validateBalance(flows);
      expect(result.isBalanced).toBe(true); // Source and Sink are ignored, Intermediate is balanced
    });
  });

  describe('formatImbalanceWarnings', () => {
    test('should return empty array for no imbalances', () => {
      const warnings = validator.formatImbalanceWarnings([]);
      expect(warnings).toEqual([]);
    });

    test('should format imbalance warnings correctly', () => {
      const imbalancedNodes = [
        { name: 'NodeA', totalIn: 100, totalOut: 60, difference: -40 },
        { name: 'NodeB', totalIn: 50, totalOut: 80, difference: 30 }
      ];

      const warnings = validator.formatImbalanceWarnings(imbalancedNodes);
      
      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toBe("Node 'NodeA' is imbalanced: more inflow than outflow by 40.00 (in: 100.00, out: 60.00)");
      expect(warnings[1]).toBe("Node 'NodeB' is imbalanced: more outflow than inflow by 30.00 (in: 50.00, out: 80.00)");
    });
  });

  describe('getStatusMessage', () => {
    test('should return balanced message for balanced flows', () => {
      const balanceResult = { isBalanced: true, imbalancedNodes: [] };
      const message = validator.getStatusMessage(balanceResult);
      expect(message).toBe('All nodes are balanced');
    });

    test('should return warning message for single imbalanced node', () => {
      const balanceResult = { 
        isBalanced: false, 
        imbalancedNodes: [{ name: 'A', totalIn: 100, totalOut: 60, difference: -40 }] 
      };
      const message = validator.getStatusMessage(balanceResult);
      expect(message).toBe('Warning: 1 node is imbalanced');
    });

    test('should return warning message for multiple imbalanced nodes', () => {
      const balanceResult = { 
        isBalanced: false, 
        imbalancedNodes: [
          { name: 'A', totalIn: 100, totalOut: 60, difference: -40 },
          { name: 'B', totalIn: 50, totalOut: 80, difference: 30 }
        ] 
      };
      const message = validator.getStatusMessage(balanceResult);
      expect(message).toBe('Warning: 2 nodes are imbalanced');
    });

    test('should handle null balance result', () => {
      const message = validator.getStatusMessage(null);
      expect(message).toBe('Unable to validate flow balance');
    });
  });

  describe('convenience exports', () => {
    test('should export convenience functions', () => {
      const flows = [
        { source: 'A', target: 'B', amount: 100 },
        { source: 'B', target: 'C', amount: 100 }
      ];

      const result = validateBalance(flows);
      expect(result.isBalanced).toBe(true);

      const stats = getNodeStats(flows);
      expect(stats.size).toBe(3);

      const warnings = formatImbalanceWarnings([]);
      expect(warnings).toEqual([]);

      const message = getStatusMessage(result);
      expect(message).toBe('All nodes are balanced');
    });
  });
});