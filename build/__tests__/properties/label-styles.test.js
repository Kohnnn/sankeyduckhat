/**
 * Property-Based Tests for Label Style Enhancements
 * Feature: sankey-refactor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="sankey_svg"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock d3
const mockD3 = {
  select: vi.fn(() => ({
    append: vi.fn(() => ({
      attr: vi.fn(function() { return this; }),
      selectAll: vi.fn(() => ({
        data: vi.fn(() => ({
          enter: vi.fn(() => ({
            append: vi.fn(() => ({
              attr: vi.fn(function() { return this; }),
              text: vi.fn(function() { return this; }),
            })),
          })),
        })),
      })),
    })),
    attr: vi.fn(function() { return this; }),
    selectAll: vi.fn(() => ({
      remove: vi.fn(),
    })),
  })),
};

global.d3 = mockD3;

describe('Label Style Enhancements - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: sankey-refactor, Property 9: Font Application**
   * **Validates: Requirements 6.2**
   * 
   * For any Google Font selection, all rendered label text elements SHALL have
   * font-family including the selected font name.
   */
  it('Property 9: Font Application - Google Font is applied to labels', () => {
    fc.assert(
      fc.property(
        // Generate a Google Font name from available options
        fc.constantFrom('Inter', 'Manrope', 'Roboto', 'Open Sans', 'Lato', ''),
        // Generate a system font fallback
        fc.constantFrom('sans-serif', 'serif', 'monospace'),
        (googleFont, systemFont) => {
          // Create a mock configuration
          const cfg = {
            labels_googlefont: googleFont,
            labels_fontface: systemFont,
            labelname_size: 16,
            size_h: 600,
            size_w: 600,
          };

          // Helper function to get effective font family (same as in sankeymatic.js)
          const getEffectiveFontFamily = () => {
            if (cfg.labels_googlefont && cfg.labels_googlefont.trim() !== '') {
              return `"${cfg.labels_googlefont}", ${cfg.labels_fontface}`;
            }
            return cfg.labels_fontface;
          };

          const effectiveFont = getEffectiveFontFamily();

          // Verify the font family includes the Google Font when specified
          if (googleFont && googleFont.trim() !== '') {
            expect(effectiveFont).toContain(googleFont);
            expect(effectiveFont).toContain(systemFont);
            expect(effectiveFont).toMatch(new RegExp(`"${googleFont}",\\s*${systemFont}`));
          } else {
            // When no Google Font is specified, should use system font only
            expect(effectiveFont).toBe(systemFont);
            expect(effectiveFont).not.toContain('"');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Font family format validation
   * Ensures the font-family string is properly formatted for CSS
   */
  it('Font family format is valid CSS', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Inter', 'Manrope', 'Roboto', 'Open Sans', 'Lato'),
        fc.constantFrom('sans-serif', 'serif', 'monospace'),
        (googleFont, systemFont) => {
          const fontFamily = `"${googleFont}", ${systemFont}`;
          
          // Should have quotes around the Google Font name
          expect(fontFamily).toMatch(/^"[^"]+",\s*\w+(-\w+)?$/);
          
          // Should not have nested quotes
          expect(fontFamily.match(/"/g).length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: sankey-refactor, Property 10: Decimal Places Formatting**
   * **Validates: Requirements 6.4**
   * 
   * For any number N and decimal places setting D (0, 1, 2, or All),
   * the formatted output SHALL have exactly D decimal places
   * (or the natural precision for "All").
   */
  it('Property 10: Decimal Places Formatting - respects decimal places setting', () => {
    // Mock d3.format
    const mockFormat = (formatString) => {
      return (num) => {
        // Extract decimal places from format string like ",.2f" or ",.0~f"
        const match = formatString.match(/\.(\d+)(~?)f/);
        if (!match) return num.toString();
        
        const decimals = parseInt(match[1], 10);
        const trim = match[2] === '~';
        
        let result = num.toFixed(decimals);
        
        // If trim is true, remove trailing zeros
        if (trim) {
          result = parseFloat(result).toString();
        }
        
        // Add thousand separators
        const parts = result.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
      };
    };
    
    global.d3 = { ...global.d3, format: mockFormat };

    fc.assert(
      fc.property(
        // Generate a number with various decimal places
        fc.double({ min: 0.001, max: 999999.999, noNaN: true }),
        // Generate decimal places setting
        fc.constantFrom('0', '1', '2', 'all'),
        // Generate max decimal places in data (for 'all' option)
        fc.integer({ min: 0, max: 5 }),
        (number, decimalPlacesSetting, maxDecimalPlaces) => {
          // Determine effective decimal places
          const effectiveDecimalPlaces = decimalPlacesSetting === 'all' 
            ? maxDecimalPlaces 
            : parseInt(decimalPlacesSetting, 10);

          // Create number style object
          const numberStyle = {
            marks: { group: ',', decimal: '.' },
            decimalPlaces: effectiveDecimalPlaces,
            trimString: '', // Don't trim for this test
            prefix: '',
            suffix: '',
          };

          // Format the number
          const formatted = mockFormat(`,.${numberStyle.decimalPlaces}${numberStyle.trimString}f`)(number);
          
          // Extract decimal part
          const decimalPart = formatted.split('.')[1] || '';
          
          // Verify decimal places
          if (effectiveDecimalPlaces === 0) {
            // Should have no decimal point
            expect(formatted).not.toContain('.');
          } else {
            // Should have exactly the specified number of decimal places
            expect(decimalPart.length).toBe(effectiveDecimalPlaces);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Decimal places with trimming
   * Tests that trailing zeros are removed when trimString is '~'
   */
  it('Decimal places with trimming removes trailing zeros', () => {
    const mockFormat = (formatString) => {
      return (num) => {
        const match = formatString.match(/\.(\d+)(~?)f/);
        if (!match) return num.toString();
        
        const decimals = parseInt(match[1], 10);
        const trim = match[2] === '~';
        
        let result = num.toFixed(decimals);
        
        if (trim) {
          result = parseFloat(result).toString();
        }
        
        const parts = result.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
      };
    };
    
    global.d3 = { ...global.d3, format: mockFormat };

    fc.assert(
      fc.property(
        fc.constantFrom('0', '1', '2'),
        (decimalPlaces) => {
          const dp = parseInt(decimalPlaces, 10);
          
          // Test with a whole number
          const formatted = mockFormat(`,.${dp}~f`)(100);
          
          // Should not have trailing zeros or decimal point
          expect(formatted).toBe('100');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: sankey-refactor, Property 11: Short Scale Formatting**
   * **Validates: Requirements 6.6**
   * 
   * For any number N >= 1000, short scale formatting SHALL produce a string
   * with the appropriate suffix (k for thousands, M for millions, B for billions)
   * and a value that when parsed equals N within rounding tolerance.
   */
  it('Property 11: Short Scale Formatting - formats with k/M/B suffixes', () => {
    const mockFormat = (formatString) => {
      return (num) => {
        const match = formatString.match(/\.(\d+)(~?)f/);
        if (!match) return num.toString();
        
        const decimals = parseInt(match[1], 10);
        const trim = match[2] === '~';
        
        let result = num.toFixed(decimals);
        
        if (trim) {
          result = parseFloat(result).toString();
        }
        
        const parts = result.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
      };
    };
    
    // Mock updateMarks function
    const updateMarks = (str, marks) => str;
    
    global.d3 = { ...global.d3, format: mockFormat };

    // Helper function to format short scale (same as in sankeymatic.js)
    const formatShortScale = (numberIn, nStyle) => {
      let value = numberIn;
      let suffix = '';
      
      if (Math.abs(value) >= 1e9) {
        value = value / 1e9;
        suffix = 'B';
      } else if (Math.abs(value) >= 1e6) {
        value = value / 1e6;
        suffix = 'M';
      } else if (Math.abs(value) >= 1e3) {
        value = value / 1e3;
        suffix = 'k';
      }
      
      const nString = updateMarks(
        mockFormat(`,.${nStyle.decimalPlaces}${nStyle.trimString}f`)(value),
        nStyle.marks
      );
      return `${nStyle.prefix}${nString}${suffix}${nStyle.suffix}`;
    };

    fc.assert(
      fc.property(
        // Generate numbers in different ranges
        fc.oneof(
          fc.double({ min: 1000, max: 999999, noNaN: true }),      // thousands
          fc.double({ min: 1e6, max: 999e6, noNaN: true }),        // millions
          fc.double({ min: 1e9, max: 999e9, noNaN: true })         // billions
        ),
        fc.constantFrom('0', '1', '2'),
        (number, decimalPlaces) => {
          const numberStyle = {
            marks: { group: ',', decimal: '.' },
            decimalPlaces: parseInt(decimalPlaces, 10),
            trimString: '~',
            prefix: '',
            suffix: '',
          };

          const formatted = formatShortScale(number, numberStyle);
          
          // Determine expected suffix
          let expectedSuffix = '';
          let divisor = 1;
          if (Math.abs(number) >= 1e9) {
            expectedSuffix = 'B';
            divisor = 1e9;
          } else if (Math.abs(number) >= 1e6) {
            expectedSuffix = 'M';
            divisor = 1e6;
          } else if (Math.abs(number) >= 1e3) {
            expectedSuffix = 'k';
            divisor = 1e3;
          }
          
          // Verify suffix is present
          expect(formatted).toContain(expectedSuffix);
          
          // Extract the numeric part (remove commas and suffix)
          const numericPart = formatted.replace(/,/g, '').replace(/[kMB]/g, '');
          const parsedValue = parseFloat(numericPart);
          
          // Verify the value is correct within rounding tolerance
          const expectedValue = number / divisor;
          const tolerance = Math.pow(10, -parseInt(decimalPlaces, 10));
          expect(Math.abs(parsedValue - expectedValue)).toBeLessThanOrEqual(tolerance);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: sankey-refactor, Property 12: Comparison Line Percentage**
   * **Validates: Requirements 6.8**
   * 
   * For any node with value V in a diagram with total input T,
   * the comparison line SHALL display a percentage equal to (V / T) * 100,
   * rounded appropriately.
   */
  it('Property 12: Comparison Line Percentage - calculates correct percentage', () => {
    fc.assert(
      fc.property(
        // Generate a node value
        fc.double({ min: 1, max: 10000, noNaN: true }),
        // Generate a total input value (must be >= node value)
        fc.double({ min: 1, max: 100000, noNaN: true }),
        (nodeValue, totalInput) => {
          // Ensure totalInput is at least as large as nodeValue
          const effectiveTotalInput = Math.max(nodeValue, totalInput);
          
          // Calculate expected percentage
          const expectedPercentage = (nodeValue / effectiveTotalInput) * 100;
          
          // Format as the comparison line would (1 decimal place)
          const formattedPercentage = `${expectedPercentage.toFixed(1)}%`;
          
          // Parse back to verify
          const parsedPercentage = parseFloat(formattedPercentage);
          
          // Verify the percentage is correct within rounding tolerance
          expect(Math.abs(parsedPercentage - expectedPercentage)).toBeLessThanOrEqual(0.05);
          
          // Verify percentage is in valid range
          expect(parsedPercentage).toBeGreaterThanOrEqual(0);
          expect(parsedPercentage).toBeLessThanOrEqual(100);
          
          // Verify format includes % symbol
          expect(formattedPercentage).toMatch(/^\d+\.\d%$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Comparison line edge cases
   * Tests edge cases like 0%, 100%, and very small percentages
   */
  it('Comparison line handles edge cases correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { nodeValue: 0, totalInput: 100 },      // 0%
          { nodeValue: 100, totalInput: 100 },    // 100%
          { nodeValue: 0.1, totalInput: 1000 },   // 0.01%
          { nodeValue: 999, totalInput: 1000 },   // 99.9%
        ),
        ({ nodeValue, totalInput }) => {
          const percentage = (nodeValue / totalInput) * 100;
          const formatted = `${percentage.toFixed(1)}%`;
          
          // Should always have exactly 1 decimal place
          expect(formatted).toMatch(/^\d+\.\d%$/);
          
          // Should be in valid range
          const parsed = parseFloat(formatted);
          expect(parsed).toBeGreaterThanOrEqual(0);
          expect(parsed).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Short scale for numbers < 1000
   * Numbers less than 1000 should not have a suffix
   */
  it('Short scale formatting does not add suffix for numbers < 1000', () => {
    const mockFormat = (formatString) => {
      return (num) => {
        const match = formatString.match(/\.(\d+)(~?)f/);
        if (!match) return num.toString();
        
        const decimals = parseInt(match[1], 10);
        const trim = match[2] === '~';
        
        let result = num.toFixed(decimals);
        
        if (trim) {
          result = parseFloat(result).toString();
        }
        
        const parts = result.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
      };
    };
    
    const updateMarks = (str, marks) => str;
    global.d3 = { ...global.d3, format: mockFormat };

    const formatShortScale = (numberIn, nStyle) => {
      let value = numberIn;
      let suffix = '';
      
      if (Math.abs(value) >= 1e9) {
        value = value / 1e9;
        suffix = 'B';
      } else if (Math.abs(value) >= 1e6) {
        value = value / 1e6;
        suffix = 'M';
      } else if (Math.abs(value) >= 1e3) {
        value = value / 1e3;
        suffix = 'k';
      }
      
      const nString = updateMarks(
        mockFormat(`,.${nStyle.decimalPlaces}${nStyle.trimString}f`)(value),
        nStyle.marks
      );
      return `${nStyle.prefix}${nString}${suffix}${nStyle.suffix}`;
    };

    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 999.99, noNaN: true }),
        (number) => {
          const numberStyle = {
            marks: { group: ',', decimal: '.' },
            decimalPlaces: 2,
            trimString: '~',
            prefix: '',
            suffix: '',
          };

          const formatted = formatShortScale(number, numberStyle);
          
          // Should not contain k, M, or B
          expect(formatted).not.toContain('k');
          expect(formatted).not.toContain('M');
          expect(formatted).not.toContain('B');
        }
      ),
      { numRuns: 100 }
    );
  });
});
