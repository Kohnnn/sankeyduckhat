/**
 * Property Test: Value Formatting Thresholds
 * Feature: sankey-enhancements, Property 3: Value Formatting Thresholds
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * *For any* numeric value:
 * - Values < 1000 SHALL be displayed as the full number
 * - Values >= 1000 and < 1,000,000 SHALL be displayed with "K" suffix
 * - Values >= 1,000,000 SHALL be displayed with "M" suffix
 * - Abbreviated values SHALL have exactly one decimal place
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatValue } from '../formatValue';

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

// Generator for values less than 1000
const arbitrarySmallValue = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 999 });

// Generator for values in thousands range (1000 to 999,999)
const arbitraryThousandsValue = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1000, max: 999999 });

// Generator for values in millions range (1,000,000+)
const arbitraryMillionsValue = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1000000, max: 999999999 });

// Generator for optional prefix
const arbitraryPrefix = (): fc.Arbitrary<string | undefined> =>
  fc.oneof(fc.constant(undefined), fc.constant('$'), fc.constant('€'), fc.constant('£'));

// ============================================================================
// Property 3: Value Formatting Thresholds
// Feature: sankey-enhancements, Property 3: Value Formatting Thresholds
// Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
// ============================================================================

describe('Feature: sankey-enhancements, Property 3: Value Formatting Thresholds', () => {
  it('*For any* value < 1000, formatValue should display the full number without suffix', () => {
    fc.assert(
      fc.property(
        arbitrarySmallValue(),
        arbitraryPrefix(),
        (value, prefix) => {
          const result = formatValue(value, prefix);
          const expectedPrefix = prefix || '';
          
          // Should not contain K or M suffix
          const hasNoSuffix = !result.endsWith('K') && !result.endsWith('M');
          // Should contain the exact value
          const containsValue = result === `${expectedPrefix}${value}`;
          
          return hasNoSuffix && containsValue;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* value >= 1000 and < 1,000,000, formatValue should display with "K" suffix', () => {
    fc.assert(
      fc.property(
        arbitraryThousandsValue(),
        arbitraryPrefix(),
        (value, prefix) => {
          const result = formatValue(value, prefix);
          
          // Should end with K suffix
          return result.endsWith('K');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* value >= 1,000,000, formatValue should display with "M" suffix', () => {
    fc.assert(
      fc.property(
        arbitraryMillionsValue(),
        arbitraryPrefix(),
        (value, prefix) => {
          const result = formatValue(value, prefix);
          
          // Should end with M suffix
          return result.endsWith('M');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* abbreviated value (K or M), the numeric part should have exactly one decimal place', () => {
    fc.assert(
      fc.property(
        fc.oneof(arbitraryThousandsValue(), arbitraryMillionsValue()),
        arbitraryPrefix(),
        (value, prefix) => {
          const result = formatValue(value, prefix);
          const expectedPrefix = prefix || '';
          
          // Remove prefix and suffix to get the numeric part
          let numericPart = result;
          if (expectedPrefix) {
            numericPart = numericPart.slice(expectedPrefix.length);
          }
          numericPart = numericPart.slice(0, -1); // Remove K or M suffix
          
          // Should have exactly one decimal place (format: X.X)
          const decimalMatch = numericPart.match(/^\d+\.\d$/);
          return decimalMatch !== null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* value with prefix, the prefix should appear at the start of the result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999999999 }),
        fc.constantFrom('$', '€', '£', '¥'),
        (value, prefix) => {
          const result = formatValue(value, prefix);
          
          return result.startsWith(prefix);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* value without prefix, the result should start with a digit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999999999 }),
        (value) => {
          const result = formatValue(value);
          
          return /^\d/.test(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the threshold boundaries should be exactly at 1000 and 1,000,000', () => {
    // Test exact boundary cases
    
    // Just under 1000 - should be full number
    expect(formatValue(999)).toBe('999');
    
    // Exactly 1000 - should have K suffix
    expect(formatValue(1000)).toBe('1.0K');
    
    // Just under 1,000,000 - should have K suffix
    expect(formatValue(999999)).toBe('1000.0K');
    
    // Exactly 1,000,000 - should have M suffix
    expect(formatValue(1000000)).toBe('1.0M');
    
    // With prefix
    expect(formatValue(999, '$')).toBe('$999');
    expect(formatValue(1000, '$')).toBe('$1.0K');
    expect(formatValue(1000000, '$')).toBe('$1.0M');
  });

  it('formatted values should preserve the correct magnitude', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 999999999 }),
        (value) => {
          const result = formatValue(value);
          
          // Parse the numeric value back
          let numericPart = result.slice(0, -1); // Remove suffix
          const suffix = result.slice(-1);
          const parsedValue = parseFloat(numericPart);
          
          let reconstructedValue: number;
          let maxRoundingError: number;
          
          if (suffix === 'K') {
            reconstructedValue = parsedValue * 1000;
            // With 1 decimal place in K, max rounding error is 50 (0.05K = 50)
            maxRoundingError = 50;
          } else if (suffix === 'M') {
            reconstructedValue = parsedValue * 1000000;
            // With 1 decimal place in M, max rounding error is 50000 (0.05M = 50000)
            maxRoundingError = 50000;
          } else {
            return false;
          }
          
          // The reconstructed value should be within the rounding error
          return Math.abs(reconstructedValue - value) <= maxRoundingError;
        }
      ),
      { numRuns: 100 }
    );
  });
});
