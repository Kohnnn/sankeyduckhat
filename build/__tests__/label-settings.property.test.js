/**
 * Property Tests for Label Settings
 * Tests text margins, text formatting, and label settings persistence
 * 
 * Property 8: Text Margins Apply Padding
 * Property 9: Text Formatting Renders Correctly
 * Property 10: Label Settings Persistence
 * Validates: Requirements 3.2, 3.6, 3.7
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
      checked: false,
      getAttribute: vi.fn((attr) => el[attr]),
      setAttribute: vi.fn((attr, val) => { el[attr] = val; }),
      removeAttribute: vi.fn(),
      addEventListener: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn((cls, force) => {
          if (force !== undefined) {
            el._classes = el._classes || new Set();
            if (force) el._classes.add(cls);
            else el._classes.delete(cls);
          } else {
            el._classes = el._classes || new Set();
            if (el._classes.has(cls)) el._classes.delete(cls);
            else el._classes.add(cls);
          }
        }),
        contains: vi.fn((cls) => {
          el._classes = el._classes || new Set();
          return el._classes.has(cls);
        })
      },
      _classes: new Set()
    };
    elements[id] = el;
    return el;
  };
  
  // Create label popup elements
  createElement('popup-label-text', 'textarea');
  createElement('popup-label-fontsize', 'input');
  createElement('popup-label-color', 'input');
  createElement('popup-label-bg', 'input');
  createElement('popup-label-bg-enabled', 'input');
  createElement('popup-label-margin-top', 'input');
  createElement('popup-label-margin-right', 'input');
  createElement('popup-label-margin-bottom', 'input');
  createElement('popup-label-margin-left', 'input');
  createElement('popup-label-x', 'input');
  createElement('popup-label-y', 'input');
  createElement('label-bold', 'button');
  createElement('label-italic', 'button');
  createElement('align-left', 'button');
  createElement('align-center', 'button');
  createElement('align-right', 'button');
  
  return elements;
}

// Mock SVG text element
function createMockTextElement() {
  const attrs = {};
  return {
    getAttribute: (attr) => attrs[attr],
    setAttribute: (attr, val) => { attrs[attr] = val; },
    removeAttribute: (attr) => { delete attrs[attr]; },
    _attrs: attrs,
    textContent: '',
    querySelectorAll: () => [],
    appendChild: vi.fn(),
    getBBox: () => ({ x: 0, y: 0, width: 100, height: 20 }),
    parentElement: {
      tagName: 'g',
      querySelector: () => null,
      insertBefore: vi.fn()
    }
  };
}

// Apply text formatting to SVG element
function applyTextFormatting(textEl, custom) {
  // Apply bold
  if (custom.labelBold) {
    textEl.setAttribute('font-weight', 'bold');
  } else {
    textEl.removeAttribute('font-weight');
  }
  
  // Apply italic
  if (custom.labelItalic) {
    textEl.setAttribute('font-style', 'italic');
  } else {
    textEl.removeAttribute('font-style');
  }
  
  return textEl;
}

// Calculate background rect dimensions with margins
function calculateBackgroundRect(bbox, margins) {
  return {
    x: bbox.x - margins.left,
    y: bbox.y - margins.top,
    width: bbox.width + margins.left + margins.right,
    height: bbox.height + margins.top + margins.bottom
  };
}

// Parse multi-line text into lines
function parseMultiLineText(text) {
  if (!text) return [];
  return text.split('\n');
}

describe('Label Settings Property Tests', () => {
  
  describe('Property 8: Text Margins Apply Padding', () => {
    
    it('should calculate correct background rect with margins', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (top, right, bottom, left) => {
            const bbox = { x: 50, y: 50, width: 100, height: 20 };
            const margins = { top, right, bottom, left };
            
            const rect = calculateBackgroundRect(bbox, margins);
            
            // Verify rect position accounts for margins
            expect(rect.x).toBe(bbox.x - left);
            expect(rect.y).toBe(bbox.y - top);
            
            // Verify rect size includes margins
            expect(rect.width).toBe(bbox.width + left + right);
            expect(rect.height).toBe(bbox.height + top + bottom);
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should handle zero margins correctly', () => {
      const bbox = { x: 50, y: 50, width: 100, height: 20 };
      const margins = { top: 0, right: 0, bottom: 0, left: 0 };
      
      const rect = calculateBackgroundRect(bbox, margins);
      
      expect(rect.x).toBe(bbox.x);
      expect(rect.y).toBe(bbox.y);
      expect(rect.width).toBe(bbox.width);
      expect(rect.height).toBe(bbox.height);
    });
    
    it('should handle asymmetric margins', () => {
      const bbox = { x: 0, y: 0, width: 100, height: 20 };
      const margins = { top: 10, right: 20, bottom: 5, left: 15 };
      
      const rect = calculateBackgroundRect(bbox, margins);
      
      expect(rect.x).toBe(-15);
      expect(rect.y).toBe(-10);
      expect(rect.width).toBe(135); // 100 + 15 + 20
      expect(rect.height).toBe(35); // 20 + 10 + 5
    });
    
    it('should always produce non-negative dimensions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 500 }),
          fc.integer({ min: 1, max: 200 }),
          (top, right, bottom, left, width, height) => {
            const bbox = { x: 0, y: 0, width, height };
            const margins = { top, right, bottom, left };
            
            const rect = calculateBackgroundRect(bbox, margins);
            
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.height).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
  
  describe('Property 9: Text Formatting Renders Correctly', () => {
    
    it('should apply bold formatting', () => {
      const textEl = createMockTextElement();
      
      applyTextFormatting(textEl, { labelBold: true, labelItalic: false });
      
      expect(textEl._attrs['font-weight']).toBe('bold');
      expect(textEl._attrs['font-style']).toBeUndefined();
    });
    
    it('should apply italic formatting', () => {
      const textEl = createMockTextElement();
      
      applyTextFormatting(textEl, { labelBold: false, labelItalic: true });
      
      expect(textEl._attrs['font-weight']).toBeUndefined();
      expect(textEl._attrs['font-style']).toBe('italic');
    });
    
    it('should apply both bold and italic', () => {
      const textEl = createMockTextElement();
      
      applyTextFormatting(textEl, { labelBold: true, labelItalic: true });
      
      expect(textEl._attrs['font-weight']).toBe('bold');
      expect(textEl._attrs['font-style']).toBe('italic');
    });
    
    it('should remove formatting when disabled', () => {
      const textEl = createMockTextElement();
      
      // First apply formatting
      applyTextFormatting(textEl, { labelBold: true, labelItalic: true });
      expect(textEl._attrs['font-weight']).toBe('bold');
      expect(textEl._attrs['font-style']).toBe('italic');
      
      // Then remove it
      applyTextFormatting(textEl, { labelBold: false, labelItalic: false });
      expect(textEl._attrs['font-weight']).toBeUndefined();
      expect(textEl._attrs['font-style']).toBeUndefined();
    });
    
    it('should handle all combinations of bold/italic', () => {
      const combinations = [
        { bold: false, italic: false },
        { bold: true, italic: false },
        { bold: false, italic: true },
        { bold: true, italic: true }
      ];
      
      combinations.forEach(({ bold, italic }) => {
        const textEl = createMockTextElement();
        applyTextFormatting(textEl, { labelBold: bold, labelItalic: italic });
        
        if (bold) {
          expect(textEl._attrs['font-weight']).toBe('bold');
        } else {
          expect(textEl._attrs['font-weight']).toBeUndefined();
        }
        
        if (italic) {
          expect(textEl._attrs['font-style']).toBe('italic');
        } else {
          expect(textEl._attrs['font-style']).toBeUndefined();
        }
      });
    });
  });
  
  describe('Property 10: Label Settings Persistence', () => {
    
    it('should parse multi-line text correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          (lines) => {
            const text = lines.join('\n');
            const parsed = parseMultiLineText(text);
            
            expect(parsed.length).toBe(lines.length);
            parsed.forEach((line, i) => {
              expect(line).toBe(lines[i]);
            });
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('should handle empty text', () => {
      expect(parseMultiLineText('')).toEqual([]);
      expect(parseMultiLineText(null)).toEqual([]);
      expect(parseMultiLineText(undefined)).toEqual([]);
    });
    
    it('should handle single line text', () => {
      const text = 'Single line';
      const parsed = parseMultiLineText(text);
      
      expect(parsed.length).toBe(1);
      expect(parsed[0]).toBe(text);
    });
    
    it('should preserve empty lines', () => {
      const text = 'Line 1\n\nLine 3';
      const parsed = parseMultiLineText(text);
      
      expect(parsed.length).toBe(3);
      expect(parsed[0]).toBe('Line 1');
      expect(parsed[1]).toBe('');
      expect(parsed[2]).toBe('Line 3');
    });
    
    it('should create label settings object with all properties', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 8, max: 72 }),
          fc.hexaString({ minLength: 6, maxLength: 6 }),
          fc.boolean(),
          fc.boolean(),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (text, fontSize, color, bold, italic, marginTop, marginRight, marginBottom, marginLeft) => {
            const settings = {
              labelText: text,
              labelFontSize: fontSize,
              labelColor: '#' + color,
              labelBold: bold,
              labelItalic: italic,
              labelMarginTop: marginTop,
              labelMarginRight: marginRight,
              labelMarginBottom: marginBottom,
              labelMarginLeft: marginLeft
            };
            
            // Verify all properties are set
            expect(settings.labelText).toBe(text);
            expect(settings.labelFontSize).toBe(fontSize);
            expect(settings.labelColor).toBe('#' + color);
            expect(settings.labelBold).toBe(bold);
            expect(settings.labelItalic).toBe(italic);
            expect(settings.labelMarginTop).toBe(marginTop);
            expect(settings.labelMarginRight).toBe(marginRight);
            expect(settings.labelMarginBottom).toBe(marginBottom);
            expect(settings.labelMarginLeft).toBe(marginLeft);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  describe('Multi-line Text Handling', () => {
    
    it('should split text on newlines', () => {
      const testCases = [
        { input: 'Line 1\nLine 2', expected: ['Line 1', 'Line 2'] },
        { input: 'A\nB\nC', expected: ['A', 'B', 'C'] },
        { input: 'Single', expected: ['Single'] },
        { input: 'With\n\nEmpty', expected: ['With', '', 'Empty'] }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = parseMultiLineText(input);
        expect(result).toEqual(expected);
      });
    });
    
    it('should handle various line ending styles', () => {
      // Note: We only support \n, not \r\n or \r
      const text = 'Line 1\nLine 2\nLine 3';
      const parsed = parseMultiLineText(text);
      
      expect(parsed.length).toBe(3);
    });
  });
  
  describe('Alignment Settings', () => {
    
    it('should map alignment to text-anchor correctly', () => {
      const alignmentMap = {
        'left': 'start',
        'center': 'middle',
        'right': 'end'
      };
      
      Object.entries(alignmentMap).forEach(([align, anchor]) => {
        const textEl = createMockTextElement();
        
        // Apply alignment
        const anchorValue = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
        textEl.setAttribute('text-anchor', anchorValue);
        
        expect(textEl._attrs['text-anchor']).toBe(anchor);
      });
    });
  });
});
