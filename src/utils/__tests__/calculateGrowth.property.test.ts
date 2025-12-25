/**
 * Property Tests: Growth Calculation Utilities
 * Feature: sankey-enhancements
 * 
 * Property 1: Y/Y Growth Calculation Correctness
 * Validates: Requirements 2.1, 2.2
 * 
 * Property 2: Growth Sign Formatting
 * Validates: Requirements 2.4, 2.5, 2.7
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateNodeGrowth, formatGrowth } from '../calculateGrowth';
import type { Flow } from '../../store/useDiagramStore';

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

// Generator for a valid node name
const arbitraryNodeName = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0);

// Generator for a positive flow value
const arbitraryPositiveValue = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1, max: 1000000 });

// Generator for a flow with required fields
const arbitraryFlow = (targetNode: string): fc.Arbitrary<Flow> =>
  fc.record({
    id: fc.uuid(),
    source: arbitraryNodeName(),
    target: fc.constant(targetNode),
    value: arbitraryPositiveValue(),
  });

// Generator for growth percentage (can be positive, negative, or zero)
const arbitraryGrowthPercent = (): fc.Arbitrary<number> =>
  fc.double({ min: -1000, max: 1000, noNaN: true });

// ============================================================================
// Property 1: Y/Y Growth Calculation Correctness
// Feature: sankey-enhancements, Property 1: Y/Y Growth Calculation Correctness
// Validates: Requirements 2.1, 2.2
// ============================================================================

describe('Feature: sankey-enhancements, Property 1: Y/Y Growth Calculation Correctness', () => {
  it('*For any* set of flows with comparison values, growth equals ((current - previous) / previous) * 100', () => {
    fc.assert(
      fc.property(
        arbitraryNodeName(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            source: arbitraryNodeName(),
            target: fc.constant('targetNode'),
            value: arbitraryPositiveValue(),
            comparisonValue: arbitraryPositiveValue(), // Force comparison values to exist
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (nodeName, flowTemplates) => {
          // Create flows targeting our node
          const flows: Flow[] = flowTemplates.map(f => ({
            ...f,
            target: nodeName,
          }));

          const result = calculateNodeGrowth(nodeName, flows);

          // Calculate expected values
          const expectedCurrent = flows.reduce((sum, f) => sum + f.value, 0);
          const expectedPrevious = flows.reduce((sum, f) => sum + (f.comparisonValue ?? 0), 0);
          const expectedGrowth = ((expectedCurrent - expectedPrevious) / expectedPrevious) * 100;

          // Verify current and previous totals
          expect(result.currentTotal).toBe(expectedCurrent);
          expect(result.previousTotal).toBe(expectedPrevious);
          
          // Verify growth calculation (with floating point tolerance)
          expect(result.growthPercent).not.toBeNull();
          expect(result.growthPercent).toBeCloseTo(expectedGrowth, 10);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* flows without comparison data, growthPercent should be null', () => {
    fc.assert(
      fc.property(
        arbitraryNodeName(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            source: arbitraryNodeName(),
            target: fc.constant('targetNode'),
            value: arbitraryPositiveValue(),
            // No comparisonValue - explicitly undefined
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (nodeName, flowTemplates) => {
          const flows: Flow[] = flowTemplates.map(f => ({
            ...f,
            target: nodeName,
            comparisonValue: undefined,
          }));

          const result = calculateNodeGrowth(nodeName, flows);

          // Growth should be null when no comparison data
          return result.growthPercent === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* flows with zero previous total, growthPercent should be null (avoid division by zero)', () => {
    fc.assert(
      fc.property(
        arbitraryNodeName(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            source: arbitraryNodeName(),
            target: fc.constant('targetNode'),
            value: arbitraryPositiveValue(),
            comparisonValue: fc.constant(0),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (nodeName, flowTemplates) => {
          const flows: Flow[] = flowTemplates.map(f => ({
            ...f,
            target: nodeName,
          }));

          const result = calculateNodeGrowth(nodeName, flows);

          // Growth should be null when previous total is zero
          return result.growthPercent === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* node with no incoming flows, totals should be zero and growth null', () => {
    fc.assert(
      fc.property(
        arbitraryNodeName(),
        fc.array(arbitraryFlow('otherNode'), { minLength: 0, maxLength: 10 }),
        (nodeName, flows) => {
          // Ensure no flows target our node
          const filteredFlows = flows.filter(f => f.target !== nodeName);
          
          const result = calculateNodeGrowth(nodeName, filteredFlows);

          return (
            result.currentTotal === 0 &&
            result.previousTotal === 0 &&
            result.growthPercent === null
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 2: Growth Sign Formatting
// Feature: sankey-enhancements, Property 2: Growth Sign Formatting
// Validates: Requirements 2.4, 2.5, 2.7
// ============================================================================

describe('Feature: sankey-enhancements, Property 2: Growth Sign Formatting', () => {
  it('*For any* positive growth percentage, formatGrowth should start with "+"', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 1000, noNaN: true }),
        (percent) => {
          const result = formatGrowth(percent);
          return result.startsWith('+');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* zero growth percentage, formatGrowth should start with "+"', () => {
    const result = formatGrowth(0);
    expect(result).toBe('+0.0%');
  });

  it('*For any* negative growth percentage, formatGrowth should contain "-" (no "+" prefix)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: -0.001, noNaN: true }),
        (percent) => {
          const result = formatGrowth(percent);
          // Should not start with +, should contain -
          return !result.startsWith('+') && result.includes('-');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* growth percentage, formatGrowth should end with "%"', () => {
    fc.assert(
      fc.property(
        arbitraryGrowthPercent(),
        (percent) => {
          const result = formatGrowth(percent);
          return result.endsWith('%');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* growth percentage, formatGrowth should have exactly one decimal place', () => {
    fc.assert(
      fc.property(
        arbitraryGrowthPercent(),
        (percent) => {
          const result = formatGrowth(percent);
          
          // Remove sign prefix and % suffix to get numeric part
          let numericPart = result;
          if (numericPart.startsWith('+') || numericPart.startsWith('-')) {
            numericPart = numericPart.slice(1);
          }
          numericPart = numericPart.slice(0, -1); // Remove %
          
          // Should match pattern: digits, decimal point, exactly one digit
          const decimalMatch = numericPart.match(/^\d+\.\d$/);
          return decimalMatch !== null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('specific examples: formatGrowth produces expected output', () => {
    // Positive values
    expect(formatGrowth(12.5)).toBe('+12.5%');
    expect(formatGrowth(100)).toBe('+100.0%');
    expect(formatGrowth(0.1)).toBe('+0.1%');
    
    // Zero
    expect(formatGrowth(0)).toBe('+0.0%');
    
    // Negative values
    expect(formatGrowth(-3.2)).toBe('-3.2%');
    expect(formatGrowth(-100)).toBe('-100.0%');
    expect(formatGrowth(-0.5)).toBe('-0.5%');
  });
});
