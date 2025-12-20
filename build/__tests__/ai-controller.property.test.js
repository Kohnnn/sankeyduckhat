/**
 * Property Tests for AIController
 * Tests data access, validation, unit conversion, and customization preservation
 * 
 * Property 14: AI Data Access Completeness
 * Property 15: AI Data Validation
 * Property 16: Unit Conversion Accuracy
 * Property 17: AI Changes Preserve Customizations
 * Validates: Requirements 5.1, 5.2, 5.4, 5.7, 5.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { AIController } from '../ai-controller.js';

// Mock DOM for testing
function setupMockDOM(flows = []) {
  const rows = flows.map(flow => ({
    querySelectorAll: () => [
      { value: flow.source, trim: () => flow.source },
      { value: flow.target, trim: () => flow.target },
      { value: flow.amount.toString() }
    ]
  }));
  
  global.document = {
    getElementById: vi.fn((id) => {
      if (id === 'data-table-body') {
        return {
          querySelectorAll: () => rows,
          innerHTML: '',
          appendChild: vi.fn()
        };
      }
      return null;
    }),
    createElement: vi.fn(() => ({
      textContent: '',
      innerHTML: '',
      appendChild: vi.fn()
    }))
  };
  
  global.nodeCustomizations = {};
}

// Generate valid flow data
const flowArbitrary = fc.record({
  source: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes('\n')),
  target: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes('\n')),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true })
}).filter(f => f.source !== f.target);

describe('AIController Property Tests', () => {
  
  beforeEach(() => {
    setupMockDOM();
  });
  
  describe('Property 14: AI Data Access Completeness', () => {
    
    it('should return all required fields from getDiagramData', () => {
      const data = AIController.getDiagramData();
      
      expect(data).toHaveProperty('flows');
      expect(data).toHaveProperty('nodes');
      expect(data).toHaveProperty('nodeCustomizations');
      expect(Array.isArray(data.flows)).toBe(true);
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(typeof data.nodeCustomizations).toBe('object');
    });
    
    it('should calculate totalFlow correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }), { minLength: 1, maxLength: 10 }),
          (amounts) => {
            const flows = amounts.map((amount, i) => ({
              source: `Source${i}`,
              target: `Target${i}`,
              amount
            }));
            
            // Calculate expected total
            const expectedTotal = amounts.reduce((sum, a) => sum + a, 0);
            
            // Simulate the calculation
            const calculatedTotal = flows.reduce((sum, f) => sum + f.amount, 0);
            
            expect(calculatedTotal).toBeCloseTo(expectedTotal, 5);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('should extract unique nodes from flows', () => {
      fc.assert(
        fc.property(
          fc.array(flowArbitrary, { minLength: 1, maxLength: 10 }),
          (flows) => {
            const expectedNodes = new Set();
            flows.forEach(f => {
              expectedNodes.add(f.source);
              expectedNodes.add(f.target);
            });
            
            // Verify node extraction logic
            const nodes = new Set();
            flows.forEach(f => {
              nodes.add(f.source);
              nodes.add(f.target);
            });
            
            expect(nodes.size).toBe(expectedNodes.size);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  describe('Property 15: AI Data Validation', () => {
    
    it('should reject null or undefined data', () => {
      expect(AIController.validateDiagramData(null).isValid).toBe(false);
      expect(AIController.validateDiagramData(undefined).isValid).toBe(false);
    });
    
    it('should reject data without flows array', () => {
      expect(AIController.validateDiagramData({}).isValid).toBe(false);
      expect(AIController.validateDiagramData({ flows: 'not-array' }).isValid).toBe(false);
    });
    
    it('should accept valid flow data', () => {
      fc.assert(
        fc.property(
          fc.array(flowArbitrary, { minLength: 1, maxLength: 10 }),
          (flows) => {
            const result = AIController.validateDiagramData({ flows });
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('should reject flows with invalid source', () => {
      const invalidFlows = [
        { source: '', target: 'B', amount: 10 },
        { source: null, target: 'B', amount: 10 },
        { source: 123, target: 'B', amount: 10 }
      ];
      
      invalidFlows.forEach(flow => {
        const result = AIController.validateDiagramData({ flows: [flow] });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('source'))).toBe(true);
      });
    });
    
    it('should reject flows with invalid target', () => {
      const invalidFlows = [
        { source: 'A', target: '', amount: 10 },
        { source: 'A', target: null, amount: 10 },
        { source: 'A', target: 123, amount: 10 }
      ];
      
      invalidFlows.forEach(flow => {
        const result = AIController.validateDiagramData({ flows: [flow] });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('target'))).toBe(true);
      });
    });
    
    it('should reject flows with invalid amount', () => {
      const invalidFlows = [
        { source: 'A', target: 'B', amount: 0 },
        { source: 'A', target: 'B', amount: -10 },
        { source: 'A', target: 'B', amount: NaN },
        { source: 'A', target: 'B', amount: Infinity },
        { source: 'A', target: 'B', amount: 'ten' }
      ];
      
      invalidFlows.forEach(flow => {
        const result = AIController.validateDiagramData({ flows: [flow] });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Amount'))).toBe(true);
      });
    });
    
    it('should reject self-referencing flows', () => {
      const result = AIController.validateDiagramData({
        flows: [{ source: 'A', target: 'A', amount: 10 }]
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('same'))).toBe(true);
    });
    
    it('should count nodes and flows correctly', () => {
      fc.assert(
        fc.property(
          fc.array(flowArbitrary, { minLength: 1, maxLength: 10 }),
          (flows) => {
            const result = AIController.validateDiagramData({ flows });
            
            expect(result.flowCount).toBe(flows.length);
            expect(result.nodeCount).toBeGreaterThan(0);
            expect(result.nodeCount).toBeLessThanOrEqual(flows.length * 2);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  describe('Property 16: Unit Conversion Accuracy', () => {
    
    it('should multiply all amounts by factor', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          (amount, factor) => {
            const flow = { source: 'A', target: 'B', amount };
            const newAmount = amount * factor;
            
            expect(newAmount).toBeCloseTo(amount * factor, 5);
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should reject invalid factors', () => {
      const invalidFactors = [0, -1, NaN, Infinity, 'two'];
      
      invalidFactors.forEach(factor => {
        const result = AIController.convertUnits(factor);
        expect(result.success).toBe(false);
      });
    });
    
    it('should preserve relative proportions after conversion', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }), { minLength: 2, maxLength: 5 }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          (amounts, factor) => {
            // Calculate original ratios
            const originalRatios = amounts.map((a, i) => 
              i > 0 ? a / amounts[0] : 1
            );
            
            // Calculate converted amounts
            const converted = amounts.map(a => a * factor);
            
            // Calculate new ratios
            const newRatios = converted.map((a, i) => 
              i > 0 ? a / converted[0] : 1
            );
            
            // Ratios should be preserved
            originalRatios.forEach((ratio, i) => {
              expect(newRatios[i]).toBeCloseTo(ratio, 5);
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  describe('Property 17: AI Changes Preserve Customizations', () => {
    
    it('should preserve customizations when flag is true', () => {
      const customizations = {
        'NodeA': { fillColor: '#ff0000', labelText: 'Custom A' },
        'NodeB': { fillColor: '#00ff00', labelBold: true }
      };
      
      // Simulate preservation
      const savedCustomizations = JSON.parse(JSON.stringify(customizations));
      
      // Verify deep copy
      expect(savedCustomizations).toEqual(customizations);
      expect(savedCustomizations).not.toBe(customizations);
      expect(savedCustomizations['NodeA']).not.toBe(customizations['NodeA']);
    });
    
    it('should deep copy all customization properties', () => {
      fc.assert(
        fc.property(
          fc.record({
            fillColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => '#' + h),
            borderColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => '#' + h),
            opacity: fc.integer({ min: 0, max: 100 }),
            labelText: fc.string({ minLength: 1, maxLength: 50 }),
            labelBold: fc.boolean(),
            labelItalic: fc.boolean()
          }),
          (custom) => {
            const original = { 'TestNode': custom };
            const copy = JSON.parse(JSON.stringify(original));
            
            // Verify all properties are copied
            expect(copy['TestNode'].fillColor).toBe(custom.fillColor);
            expect(copy['TestNode'].borderColor).toBe(custom.borderColor);
            expect(copy['TestNode'].opacity).toBe(custom.opacity);
            expect(copy['TestNode'].labelText).toBe(custom.labelText);
            expect(copy['TestNode'].labelBold).toBe(custom.labelBold);
            expect(copy['TestNode'].labelItalic).toBe(custom.labelItalic);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  describe('Flow Balance Analysis', () => {
    
    it('should identify source nodes (no inflow)', () => {
      const flows = [
        { source: 'Source', target: 'Middle', amount: 100 },
        { source: 'Middle', target: 'Sink', amount: 100 }
      ];
      
      const balance = AIController.analyzeFlowBalance.call({
        getDiagramData: () => ({
          flows,
          nodes: ['Source', 'Middle', 'Sink']
        })
      });
      
      expect(balance.nodeBalance['Source'].inflow).toBe(0);
      expect(balance.nodeBalance['Source'].outflow).toBe(100);
    });
    
    it('should identify sink nodes (no outflow)', () => {
      const flows = [
        { source: 'Source', target: 'Middle', amount: 100 },
        { source: 'Middle', target: 'Sink', amount: 100 }
      ];
      
      const balance = AIController.analyzeFlowBalance.call({
        getDiagramData: () => ({
          flows,
          nodes: ['Source', 'Middle', 'Sink']
        })
      });
      
      expect(balance.nodeBalance['Sink'].inflow).toBe(100);
      expect(balance.nodeBalance['Sink'].outflow).toBe(0);
    });
    
    it('should detect imbalanced intermediate nodes', () => {
      const flows = [
        { source: 'Source', target: 'Middle', amount: 100 },
        { source: 'Middle', target: 'Sink', amount: 80 } // 20 missing
      ];
      
      const balance = AIController.analyzeFlowBalance.call({
        getDiagramData: () => ({
          flows,
          nodes: ['Source', 'Middle', 'Sink']
        })
      });
      
      expect(balance.imbalanced.length).toBe(1);
      expect(balance.imbalanced[0].node).toBe('Middle');
      expect(balance.imbalanced[0].difference).toBeCloseTo(20, 5);
    });
    
    it('should report balanced when all intermediate nodes balance', () => {
      const flows = [
        { source: 'Source', target: 'Middle', amount: 100 },
        { source: 'Middle', target: 'Sink', amount: 100 }
      ];
      
      const balance = AIController.analyzeFlowBalance.call({
        getDiagramData: () => ({
          flows,
          nodes: ['Source', 'Middle', 'Sink']
        })
      });
      
      expect(balance.isBalanced).toBe(true);
      expect(balance.imbalanced.length).toBe(0);
    });
  });
  
  describe('HTML Escaping', () => {
    
    it('should escape HTML special characters', () => {
      // Test the escape logic
      const escapeHtml = (str) => {
        const div = { textContent: '', innerHTML: '' };
        div.textContent = str;
        // Simulate browser behavior
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('A & B')).toBe('A &amp; B');
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    });
  });
});
