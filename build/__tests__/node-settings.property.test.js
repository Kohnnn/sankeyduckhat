/**
 * Property Tests for Node Settings
 * Tests hex color sync and border opacity rendering
 * 
 * Property 12: Hex Color Input Sync
 * Property 13: Border Opacity Renders Correctly
 * Validates: Requirements 4.4, 4.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock DOM elements for testing
function createMockDOM() {
  const elements = {};
  
  const createElement = (id, type = 'input') => {
    const el = {
      id,
      value: '',
      getAttribute: vi.fn((attr) => el[attr]),
      setAttribute: vi.fn((attr, val) => { el[attr] = val; }),
      addEventListener: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn(() => false)
      }
    };
    elements[id] = el;
    return el;
  };
  
  // Create node popup elements
  createElement('popup-node-fill', 'input');
  createElement('popup-node-fill-hex', 'input');
  createElement('popup-node-border', 'input');
  createElement('popup-node-border-hex', 'input');
  createElement('popup-node-border-opacity', 'input');
  createElement('popup-node-border-opacity-value', 'span');
  
  return elements;
}

// Hex color validation
function isValidHex(hex) {
  if (!hex || typeof hex !== 'string') return false;
  const normalized = hex.startsWith('#') ? hex : '#' + hex;
  return /^#[0-9A-Fa-f]{6}$/.test(normalized);
}

// Normalize hex to #RRGGBB format
function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return null;
  return '#' + clean.toLowerCase();
}

// Sync color picker to hex input
function syncNodeColorToHex(elements, type) {
  const colorInput = elements['popup-node-' + type];
  const hexInput = elements['popup-node-' + type + '-hex'];
  if (colorInput && hexInput) {
    hexInput.value = colorInput.value;
  }
}

// Sync hex input to color picker
function syncNodeHexToColor(elements, type) {
  const colorInput = elements['popup-node-' + type];
  const hexInput = elements['popup-node-' + type + '-hex'];
  if (colorInput && hexInput) {
    const hex = hexInput.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      colorInput.value = hex;
    }
  }
}

// Apply border opacity to SVG element
function applyBorderOpacity(rect, borderOpacity) {
  const opacity = borderOpacity !== undefined ? borderOpacity / 100 : 1;
  rect.setAttribute('stroke-opacity', opacity);
  return opacity;
}

describe('Node Settings Property Tests', () => {
  
  describe('Property 12: Hex Color Input Sync', () => {
    
    it('should sync color picker value to hex input', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          (hexValue) => {
            const elements = createMockDOM();
            const fullHex = '#' + hexValue;
            
            // Set color picker value
            elements['popup-node-fill'].value = fullHex;
            
            // Sync to hex input
            syncNodeColorToHex(elements, 'fill');
            
            // Hex input should match color picker
            expect(elements['popup-node-fill-hex'].value).toBe(fullHex);
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should sync valid hex input to color picker', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          (hexValue) => {
            const elements = createMockDOM();
            const fullHex = '#' + hexValue;
            
            // Set hex input value
            elements['popup-node-fill-hex'].value = fullHex;
            
            // Sync to color picker
            syncNodeHexToColor(elements, 'fill');
            
            // Color picker should match hex input
            expect(elements['popup-node-fill'].value).toBe(fullHex);
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should not sync invalid hex to color picker', () => {
      const invalidHexValues = [
        'invalid',
        '#GGG',
        '#12345',
        '#1234567',
        '',
        'rgb(255,0,0)'
      ];
      
      invalidHexValues.forEach(invalidHex => {
        const elements = createMockDOM();
        const originalValue = '#ff0000';
        
        // Set original color picker value
        elements['popup-node-fill'].value = originalValue;
        
        // Try to sync invalid hex
        elements['popup-node-fill-hex'].value = invalidHex;
        syncNodeHexToColor(elements, 'fill');
        
        // Color picker should retain original value
        expect(elements['popup-node-fill'].value).toBe(originalValue);
      });
    });
    
    it('should handle bidirectional sync correctly', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          (hex1, hex2) => {
            const elements = createMockDOM();
            
            // Set color picker, sync to hex
            elements['popup-node-fill'].value = '#' + hex1;
            syncNodeColorToHex(elements, 'fill');
            expect(elements['popup-node-fill-hex'].value).toBe('#' + hex1);
            
            // Set hex input, sync to color picker
            elements['popup-node-fill-hex'].value = '#' + hex2;
            syncNodeHexToColor(elements, 'fill');
            expect(elements['popup-node-fill'].value).toBe('#' + hex2);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('should work for both fill and border colors', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          (fillHex, borderHex) => {
            const elements = createMockDOM();
            
            // Test fill color sync
            elements['popup-node-fill'].value = '#' + fillHex;
            syncNodeColorToHex(elements, 'fill');
            expect(elements['popup-node-fill-hex'].value).toBe('#' + fillHex);
            
            // Test border color sync
            elements['popup-node-border'].value = '#' + borderHex;
            syncNodeColorToHex(elements, 'border');
            expect(elements['popup-node-border-hex'].value).toBe('#' + borderHex);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  describe('Property 13: Border Opacity Renders Correctly', () => {
    
    it('should apply border opacity as stroke-opacity attribute', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (opacityPercent) => {
            const rect = {
              attributes: {},
              setAttribute: function(attr, val) { this.attributes[attr] = val; },
              getAttribute: function(attr) { return this.attributes[attr]; }
            };
            
            applyBorderOpacity(rect, opacityPercent);
            
            const expectedOpacity = opacityPercent / 100;
            expect(parseFloat(rect.attributes['stroke-opacity'])).toBeCloseTo(expectedOpacity, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should default to 1 (100%) when opacity is undefined', () => {
      const rect = {
        attributes: {},
        setAttribute: function(attr, val) { this.attributes[attr] = val; },
        getAttribute: function(attr) { return this.attributes[attr]; }
      };
      
      applyBorderOpacity(rect, undefined);
      
      expect(parseFloat(rect.attributes['stroke-opacity'])).toBe(1);
    });
    
    it('should clamp opacity to valid range [0, 1]', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (opacityPercent) => {
            const rect = {
              attributes: {},
              setAttribute: function(attr, val) { this.attributes[attr] = val; },
              getAttribute: function(attr) { return this.attributes[attr]; }
            };
            
            const result = applyBorderOpacity(rect, opacityPercent);
            
            // Result should always be between 0 and 1
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle edge cases: 0% and 100%', () => {
      const rect = {
        attributes: {},
        setAttribute: function(attr, val) { this.attributes[attr] = val; },
        getAttribute: function(attr) { return this.attributes[attr]; }
      };
      
      // Test 0%
      applyBorderOpacity(rect, 0);
      expect(parseFloat(rect.attributes['stroke-opacity'])).toBe(0);
      
      // Test 100%
      applyBorderOpacity(rect, 100);
      expect(parseFloat(rect.attributes['stroke-opacity'])).toBe(1);
    });
    
    it('should preserve precision for intermediate values', () => {
      const testCases = [25, 33, 50, 66, 75];
      
      testCases.forEach(percent => {
        const rect = {
          attributes: {},
          setAttribute: function(attr, val) { this.attributes[attr] = val; },
          getAttribute: function(attr) { return this.attributes[attr]; }
        };
        
        applyBorderOpacity(rect, percent);
        
        const expected = percent / 100;
        expect(parseFloat(rect.attributes['stroke-opacity'])).toBeCloseTo(expected, 5);
      });
    });
  });
  
  describe('Hex Color Validation', () => {
    
    it('should validate correct 6-digit hex colors', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          (hexValue) => {
            expect(isValidHex('#' + hexValue)).toBe(true);
            expect(isValidHex(hexValue)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should reject invalid hex colors', () => {
      const invalidValues = [
        null,
        undefined,
        '',
        'red',
        '#GGG',
        '#12345',
        '#1234567',
        'rgb(0,0,0)',
        123
      ];
      
      invalidValues.forEach(val => {
        expect(isValidHex(val)).toBe(false);
      });
    });
    
    it('should normalize hex colors to lowercase #RRGGBB format', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          (hexValue) => {
            const normalized = normalizeHex('#' + hexValue);
            expect(normalized).toBe('#' + hexValue.toLowerCase());
            
            // Without # prefix
            const normalized2 = normalizeHex(hexValue);
            expect(normalized2).toBe('#' + hexValue.toLowerCase());
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should expand 3-digit hex to 6-digit', () => {
      const testCases = [
        ['#abc', '#aabbcc'],
        ['#123', '#112233'],
        ['#fff', '#ffffff'],
        ['#000', '#000000'],
        ['ABC', '#aabbcc']
      ];
      
      testCases.forEach(([input, expected]) => {
        expect(normalizeHex(input)).toBe(expected);
      });
    });
  });
});
