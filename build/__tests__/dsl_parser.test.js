/**
 * @fileoverview Unit tests for DSL Parser module
 */

import { describe, it, expect } from 'vitest';
import { DSLParser, parse, serialize, validate } from '../dsl_parser.js';

describe('DSL Parser', () => {
  const parser = new DSLParser();

  describe('parse()', () => {
    it('should parse simple flow lines', () => {
      const dsl = 'Revenue [1000] Gross Profit';
      const result = parse(dsl);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1000,
        isValid: true
      });
    });

    it('should parse flows with colors', () => {
      const dsl = 'Revenue [1000] Gross Profit #00AA00';
      const result = parse(dsl);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1000,
        color: '#00AA00',
        isValid: true
      });
    });

    it('should handle wildcard amounts', () => {
      const dsl = 'Revenue [*] Gross Profit';
      const result = parse(dsl);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'Revenue',
        target: 'Gross Profit',
        amount: '*',
        isValid: true
      });
    });

    it('should skip empty lines and comments', () => {
      const dsl = `
        // This is a comment
        Revenue [1000] Gross Profit
        
        # Another comment
        COGS [500] Gross Profit
      `;
      const result = parse(dsl);
      
      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('Revenue');
      expect(result[1].source).toBe('COGS');
    });

    it('should handle comparison amounts', () => {
      const dsl = 'Revenue [1000|900] Gross Profit';
      const result = parse(dsl);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1000,
        isValid: true
      });
    });

    it('should return empty array for invalid input', () => {
      expect(parse(null)).toEqual([]);
      expect(parse(undefined)).toEqual([]);
      expect(parse('')).toEqual([]);
    });
  });

  describe('serialize()', () => {
    it('should serialize simple flows', () => {
      const flows = [{
        id: '1',
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1000,
        isValid: true,
        errors: []
      }];
      
      const result = serialize(flows);
      expect(result).toBe('Revenue [1000] Gross Profit');
    });

    it('should serialize flows with colors', () => {
      const flows = [{
        id: '1',
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1000,
        color: '#00AA00',
        isValid: true,
        errors: []
      }];
      
      const result = serialize(flows);
      expect(result).toBe('Revenue [1000] Gross Profit #00AA00');
    });

    it('should handle multiple flows', () => {
      const flows = [
        {
          id: '1',
          source: 'Revenue',
          target: 'Gross Profit',
          amount: 1000,
          isValid: true,
          errors: []
        },
        {
          id: '2',
          source: 'COGS',
          target: 'Gross Profit',
          amount: 500,
          isValid: true,
          errors: []
        }
      ];
      
      const result = serialize(flows);
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('Revenue [1000] Gross Profit');
      expect(lines[1]).toBe('COGS [500] Gross Profit');
    });

    it('should preserve comments when original text provided', () => {
      const flows = [{
        id: '1',
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1500,
        isValid: true,
        errors: []
      }];
      
      const originalText = `// Financial flows
Revenue [1000] Gross Profit
// End of flows`;
      
      const result = serialize(flows, originalText);
      const lines = result.split('\n');
      expect(lines[0]).toBe('// Financial flows');
      expect(lines[1]).toBe('Revenue [1500] Gross Profit');
      expect(lines[2]).toBe('// End of flows');
    });

    it('should return empty string for invalid input', () => {
      expect(serialize(null)).toBe('');
      expect(serialize(undefined)).toBe('');
      expect(serialize([])).toBe('');
    });
  });

  describe('validate()', () => {
    it('should validate correct DSL syntax', () => {
      const dsl = 'Revenue [1000] Gross Profit #00AA00';
      const result = validate(dsl);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing brackets', () => {
      const dsl = 'Revenue 1000 Gross Profit';
      const result = validate(dsl);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_BRACKETS');
    });

    it('should detect unbalanced brackets', () => {
      const dsl = 'Revenue [1000 Gross Profit';
      const result = validate(dsl);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('UNBALANCED_BRACKETS');
    });

    it('should detect invalid color format', () => {
      const dsl = 'Revenue [1000] Gross Profit #GGGGGG';
      const result = validate(dsl);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_COLOR');
    });

    it('should skip comments and empty lines during validation', () => {
      const dsl = `
        // This is a comment
        Revenue [1000] Gross Profit
        
        # Another comment
      `;
      const result = validate(dsl);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for empty input', () => {
      expect(validate('')).toMatchObject({ isValid: true, errors: [] });
      expect(validate(null)).toMatchObject({ isValid: true, errors: [] });
    });
  });

  describe('edge cases', () => {
    it('should handle flows with special characters in names', () => {
      const dsl = 'Revenue & Sales [1000] Gross Profit (2024)';
      const result = parse(dsl);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'Revenue & Sales',
        target: 'Gross Profit (2024)',
        amount: 1000,
        isValid: true
      });
    });

    it('should handle flows with decimal amounts', () => {
      const dsl = 'Revenue [1000.50] Gross Profit';
      const result = parse(dsl);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1000.50,
        isValid: true
      });
    });

    it('should handle short hex colors', () => {
      const dsl = 'Revenue [1000] Gross Profit #F0F';
      const result = parse(dsl);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'Revenue',
        target: 'Gross Profit',
        amount: 1000,
        color: '#F0F',
        isValid: true
      });
    });
  });
});