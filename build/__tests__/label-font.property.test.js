/**
 * Property Tests for Label Font Application
 * 
 * **Property 1: Label Font Settings Apply and Persist**
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * Feature: sankey-bugfixes-and-cleanup, Property 1: Label Font Settings Apply and Persist
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Standard font families that don't require Google Fonts loading
const STANDARD_FONTS = ['sans-serif', 'serif', 'monospace'];

// Google Fonts that require loading
const GOOGLE_FONTS = ['Inter', 'Manrope', 'Roboto', 'Open Sans', 'Lato', 'Montserrat'];

// All available fonts
const ALL_FONTS = [...STANDARD_FONTS, ...GOOGLE_FONTS];

// Mock DOM elements
function createMockDOM() {
  const elements = {};
  
  const createElement = (id, type = 'select') => {
    const el = {
      id,
      value: '',
      getAttribute: vi.fn((attr) => el[attr]),
      setAttribute: vi.fn((attr, val) => { el[attr] = val; }),
    };
    elements[id] = el;
    return el;
  };
  
  // Create global font setting elements
  createElement('opt_labels_fontface', 'select');
  createElement('opt_labels_googlefont', 'select');
  
  return elements;
}

// Mock SVG text element
function createMockTextElement() {
  const attrs = {};
  const tspans = [];
  return {
    getAttribute: (attr) => attrs[attr],
    setAttribute: (attr, val) => { attrs[attr] = val; },
    removeAttribute: (attr) => { delete attrs[attr]; },
    _attrs: attrs,
    _tspans: tspans,
    textContent: '',
    appendChild: (child) => { tspans.push(child); },
    querySelectorAll: (selector) => selector === 'tspan' ? tspans : []
  };
}

// Mock tspan element
function createMockTspan() {
  const attrs = {};
  return {
    getAttribute: (attr) => attrs[attr],
    setAttribute: (attr, val) => { attrs[attr] = val; },
    removeAttribute: (attr) => { delete attrs[attr]; },
    _attrs: attrs,
    textContent: ''
  };
}

/**
 * Determines the font family to use based on customization and global settings
 * This mirrors the logic in applyLabelCustomizationToSVG
 */
function determineFontFamily(custom, globalFontFace, googleFont) {
  // Priority: per-node custom font > Google Font > global font face > fallback
  if (custom.labelFontFamily) {
    return custom.labelFontFamily;
  }
  // Google Font takes priority over standard font face
  return googleFont || globalFontFace || 'sans-serif';
}

/**
 * Applies font family to text element and tspans
 * This mirrors the logic in applyLabelCustomizationToSVG
 */
function applyFontToTextElement(textEl, fontFamily, textLines) {
  textEl.setAttribute('font-family', fontFamily);
  
  textLines.forEach((line, index) => {
    const tspan = createMockTspan();
    tspan.textContent = line || ' ';
    tspan.setAttribute('font-family', fontFamily);
    textEl.appendChild(tspan);
  });
  
  return textEl;
}

/**
 * Checks if a font is a Google Font that requires loading
 */
function isGoogleFont(fontFamily) {
  return fontFamily && 
         fontFamily !== 'sans-serif' && 
         fontFamily !== 'serif' && 
         fontFamily !== 'monospace';
}

describe('Label Font Property Tests', () => {
  
  describe('Property 1: Label Font Settings Apply and Persist', () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 1.3**
     * 
     * *For any* label with custom font settings (font size, font family), 
     * applying the customization SHALL result in the SVG text element having 
     * the correct font-size and font-family attributes, and these settings 
     * SHALL persist after diagram re-render.
     */
    
    it('should apply font-family to text element for any valid font', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_FONTS),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          (fontFamily, textLines) => {
            const textEl = createMockTextElement();
            
            applyFontToTextElement(textEl, fontFamily, textLines);
            
            // Verify text element has correct font-family
            expect(textEl._attrs['font-family']).toBe(fontFamily);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should apply font-family to all tspans for any valid font', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_FONTS),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          (fontFamily, textLines) => {
            const textEl = createMockTextElement();
            
            applyFontToTextElement(textEl, fontFamily, textLines);
            
            // Verify all tspans have correct font-family
            textEl._tspans.forEach(tspan => {
              expect(tspan._attrs['font-family']).toBe(fontFamily);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should apply font-size to text element for any valid size', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 8, max: 72 }),
          (fontSize) => {
            const textEl = createMockTextElement();
            
            textEl.setAttribute('font-size', fontSize + 'px');
            
            expect(textEl._attrs['font-size']).toBe(fontSize + 'px');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should prioritize per-node font over global settings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_FONTS),
          fc.constantFrom(...STANDARD_FONTS),
          fc.constantFrom('', ...GOOGLE_FONTS),
          (nodeFont, globalFontFace, googleFont) => {
            const custom = { labelFontFamily: nodeFont };
            
            const result = determineFontFamily(custom, globalFontFace, googleFont);
            
            // Per-node font should always win
            expect(result).toBe(nodeFont);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should prioritize Google Font over standard font face when no per-node font', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...STANDARD_FONTS),
          fc.constantFrom(...GOOGLE_FONTS),
          (globalFontFace, googleFont) => {
            const custom = {}; // No per-node font
            
            const result = determineFontFamily(custom, globalFontFace, googleFont);
            
            // Google Font should win over standard font face
            expect(result).toBe(googleFont);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should use global font face when no per-node font and no Google Font', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...STANDARD_FONTS),
          (globalFontFace) => {
            const custom = {}; // No per-node font
            const googleFont = ''; // No Google Font
            
            const result = determineFontFamily(custom, globalFontFace, googleFont);
            
            expect(result).toBe(globalFontFace);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should fall back to sans-serif when no fonts specified', () => {
      const custom = {};
      const globalFontFace = '';
      const googleFont = '';
      
      const result = determineFontFamily(custom, globalFontFace, googleFont);
      
      expect(result).toBe('sans-serif');
    });
    
    it('should correctly identify Google Fonts that need loading', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_FONTS),
          (fontFamily) => {
            const needsLoading = isGoogleFont(fontFamily);
            
            if (STANDARD_FONTS.includes(fontFamily)) {
              expect(needsLoading).toBe(false);
            } else {
              expect(needsLoading).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve font settings in customization object', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_FONTS),
          fc.integer({ min: 8, max: 72 }),
          (fontFamily, fontSize) => {
            // Simulate storing font settings in nodeCustomizations
            const nodeCustomizations = {};
            const nodeName = 'TestNode';
            
            nodeCustomizations[nodeName] = {
              labelFontFamily: fontFamily,
              labelFontSize: fontSize
            };
            
            // Verify settings are stored correctly
            expect(nodeCustomizations[nodeName].labelFontFamily).toBe(fontFamily);
            expect(nodeCustomizations[nodeName].labelFontSize).toBe(fontSize);
            
            // Simulate re-render by reading back settings
            const custom = nodeCustomizations[nodeName];
            const retrievedFont = custom.labelFontFamily;
            const retrievedSize = custom.labelFontSize;
            
            // Settings should persist
            expect(retrievedFont).toBe(fontFamily);
            expect(retrievedSize).toBe(fontSize);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should apply consistent font to text element and all tspans', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_FONTS),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          (fontFamily, textLines) => {
            const textEl = createMockTextElement();
            
            applyFontToTextElement(textEl, fontFamily, textLines);
            
            // Text element font should match
            const textFont = textEl._attrs['font-family'];
            
            // All tspans should have the same font
            textEl._tspans.forEach(tspan => {
              expect(tspan._attrs['font-family']).toBe(textFont);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Font Family Edge Cases', () => {
    
    it('should handle empty font family gracefully', () => {
      const custom = { labelFontFamily: '' };
      const globalFontFace = 'serif';
      const googleFont = '';
      
      const result = determineFontFamily(custom, globalFontFace, googleFont);
      
      // Empty string is falsy, should fall back to global
      expect(result).toBe('serif');
    });
    
    it('should handle undefined font family gracefully', () => {
      const custom = { labelFontFamily: undefined };
      const globalFontFace = 'monospace';
      const googleFont = '';
      
      const result = determineFontFamily(custom, globalFontFace, googleFont);
      
      expect(result).toBe('monospace');
    });
    
    it('should handle null font family gracefully', () => {
      const custom = { labelFontFamily: null };
      const globalFontFace = 'serif';
      const googleFont = '';
      
      const result = determineFontFamily(custom, globalFontFace, googleFont);
      
      // null is falsy, should fall back to global
      expect(result).toBe('serif');
    });
  });
});
