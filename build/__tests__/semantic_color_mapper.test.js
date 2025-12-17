/**
 * @fileoverview Unit tests for Semantic Color Mapper
 */

import { describe, it, expect } from 'vitest';
import { getSemanticColor, getAllSemanticColors, isValidFinancialCategory } from '../semantic_color_mapper.js';

describe('Semantic Color Mapper', () => {
  describe('getSemanticColor', () => {
    it('should return grey for revenue category', () => {
      expect(getSemanticColor('revenue')).toBe('#888888');
    });

    it('should return red for expense category', () => {
      expect(getSemanticColor('expense')).toBe('#E15549');
    });

    it('should return grey for asset category', () => {
      expect(getSemanticColor('asset')).toBe('#888888');
    });

    it('should return red for liability category', () => {
      expect(getSemanticColor('liability')).toBe('#E15549');
    });

    it('should return green for profit category', () => {
      expect(getSemanticColor('profit')).toBe('#00AA00');
    });

    it('should throw error for null category', () => {
      expect(() => getSemanticColor(null)).toThrow('Category is required');
    });

    it('should throw error for undefined category', () => {
      expect(() => getSemanticColor(undefined)).toThrow('Category is required');
    });

    it('should throw error for invalid category', () => {
      expect(() => getSemanticColor('invalid')).toThrow('Unknown financial category: invalid');
    });

    it('should include valid categories in error message', () => {
      expect(() => getSemanticColor('invalid')).toThrow('Valid categories are: revenue, expense, asset, liability, profit');
    });
  });

  describe('getAllSemanticColors', () => {
    it('should return all semantic color mappings', () => {
      const colors = getAllSemanticColors();
      expect(colors).toEqual({
        revenue: '#888888',
        expense: '#E15549',
        asset: '#888888',
        liability: '#E15549',
        profit: '#00AA00'
      });
    });

    it('should return a copy of the colors object', () => {
      const colors1 = getAllSemanticColors();
      const colors2 = getAllSemanticColors();
      expect(colors1).not.toBe(colors2); // Different object references
      expect(colors1).toEqual(colors2); // Same content
    });
  });

  describe('isValidFinancialCategory', () => {
    it('should return true for valid categories', () => {
      expect(isValidFinancialCategory('revenue')).toBe(true);
      expect(isValidFinancialCategory('expense')).toBe(true);
      expect(isValidFinancialCategory('asset')).toBe(true);
      expect(isValidFinancialCategory('liability')).toBe(true);
      expect(isValidFinancialCategory('profit')).toBe(true);
    });

    it('should return false for invalid categories', () => {
      expect(isValidFinancialCategory('invalid')).toBe(false);
      expect(isValidFinancialCategory('')).toBe(false);
      expect(isValidFinancialCategory(null)).toBe(false);
      expect(isValidFinancialCategory(undefined)).toBe(false);
    });
  });
});