/**
 * Property Tests for ValidationUtils
 * Tests input validation and clamping, settings persistence
 * 
 * Property 18: Input Validation and Clamping
 * Property 19: Settings Persistence Round-Trip
 * Validates: Requirements 6.1, 6.4, 6.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ValidationUtils } from '../validation-utils.js';

describe('ValidationUtils Property Tests', () => {
  
  describe('Property 18: Input Validation and Clamping', () => {
    
    describe('Hex Color Validation', () => {
      
      it('should accept valid 6-digit hex colors', () => {
        fc.assert(
          fc.property(
            fc.hexaString({ minLength: 6, maxLength: 6 }),
            (hex) => {
              const result = ValidationUtils.validateHexColor('#' + hex);
              expect(result.isValid).toBe(true);
              expect(result.normalized).toBe('#' + hex.toLowerCase());
              expect(result.error).toBeNull();
            }
          ),
          { numRuns: 50 }
        );
      });
      
      it('should accept valid 3-digit hex colors and expand them', () => {
        fc.assert(
          fc.property(
            fc.hexaString({ minLength: 3, maxLength: 3 }),
            (hex) => {
              const result = ValidationUtils.validateHexColor('#' + hex);
              expect(result.isValid).toBe(true);
              
              // Verify expansion
              const expanded = hex.split('').map(c => c + c).join('').toLowerCase();
              expect(result.normalized).toBe('#' + expanded);
            }
          ),
          { numRuns: 30 }
        );
      });
      
      it('should reject invalid hex colors', () => {
        const invalidColors = [
          '', null, undefined, 'red', '#GGG', '#12345', '#1234567', 'rgb(0,0,0)', 123
        ];
        
        invalidColors.forEach(color => {
          const result = ValidationUtils.validateHexColor(color);
          expect(result.isValid).toBe(false);
          expect(result.normalized).toBeNull();
          expect(result.error).toBeTruthy();
        });
      });
      
      it('should handle colors with or without # prefix', () => {
        fc.assert(
          fc.property(
            fc.hexaString({ minLength: 6, maxLength: 6 }),
            (hex) => {
              const withHash = ValidationUtils.validateHexColor('#' + hex);
              const withoutHash = ValidationUtils.validateHexColor(hex);
              
              expect(withHash.isValid).toBe(true);
              expect(withoutHash.isValid).toBe(true);
              expect(withHash.normalized).toBe(withoutHash.normalized);
            }
          ),
          { numRuns: 30 }
        );
      });
    });
    
    describe('Opacity Validation', () => {
      
      it('should accept values in valid range (0-100)', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100 }),
            (opacity) => {
              const result = ValidationUtils.validateOpacity(opacity);
              expect(result.isValid).toBe(true);
              expect(result.clamped).toBe(opacity);
              expect(result.wasAdjusted).toBeFalsy();
            }
          ),
          { numRuns: 100 }
        );
      });
      
      it('should clamp values below 0 to 0', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000, max: -1 }),
            (opacity) => {
              const result = ValidationUtils.validateOpacity(opacity);
              expect(result.isValid).toBe(true);
              expect(result.clamped).toBe(0);
              expect(result.wasAdjusted).toBe(true);
            }
          ),
          { numRuns: 30 }
        );
      });
      
      it('should clamp values above 100 to 100', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 101, max: 1000 }),
            (opacity) => {
              const result = ValidationUtils.validateOpacity(opacity);
              expect(result.isValid).toBe(true);
              expect(result.clamped).toBe(100);
              expect(result.wasAdjusted).toBe(true);
            }
          ),
          { numRuns: 30 }
        );
      });
      
      it('should handle string inputs', () => {
        const result = ValidationUtils.validateOpacity('50');
        expect(result.isValid).toBe(true);
        expect(result.clamped).toBe(50);
      });
      
      it('should reject non-numeric inputs', () => {
        const invalidInputs = ['abc', '', null, undefined, NaN];
        
        invalidInputs.forEach(input => {
          const result = ValidationUtils.validateOpacity(input);
          expect(result.error).toBeTruthy();
        });
      });
    });
    
    describe('Margin Validation', () => {
      
      it('should accept values in valid range (0-100)', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100 }),
            (margin) => {
              const result = ValidationUtils.validateMargin(margin);
              expect(result.isValid).toBe(true);
              expect(result.clamped).toBe(margin);
            }
          ),
          { numRuns: 100 }
        );
      });
      
      it('should clamp negative values to 0', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -100, max: -1 }),
            (margin) => {
              const result = ValidationUtils.validateMargin(margin);
              expect(result.clamped).toBe(0);
              expect(result.wasAdjusted).toBe(true);
            }
          ),
          { numRuns: 30 }
        );
      });
      
      it('should clamp values above 100 to 100', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 101, max: 500 }),
            (margin) => {
              const result = ValidationUtils.validateMargin(margin);
              expect(result.clamped).toBe(100);
              expect(result.wasAdjusted).toBe(true);
            }
          ),
          { numRuns: 30 }
        );
      });
    });
    
    describe('Font Size Validation', () => {
      
      it('should accept values in valid range (8-72)', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 8, max: 72 }),
            (fontSize) => {
              const result = ValidationUtils.validateFontSize(fontSize);
              expect(result.isValid).toBe(true);
              expect(result.clamped).toBe(fontSize);
            }
          ),
          { numRuns: 50 }
        );
      });
      
      it('should clamp values below 8 to 8', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 7 }),
            (fontSize) => {
              const result = ValidationUtils.validateFontSize(fontSize);
              expect(result.clamped).toBe(8);
              expect(result.wasAdjusted).toBe(true);
            }
          ),
          { numRuns: 7 }
        );
      });
      
      it('should clamp values above 72 to 72', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 73, max: 200 }),
            (fontSize) => {
              const result = ValidationUtils.validateFontSize(fontSize);
              expect(result.clamped).toBe(72);
              expect(result.wasAdjusted).toBe(true);
            }
          ),
          { numRuns: 30 }
        );
      });
    });
    
    describe('Position Offset Validation', () => {
      
      it('should accept values in valid range (-1000 to 1000)', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000, max: 1000 }),
            (offset) => {
              const result = ValidationUtils.validatePositionOffset(offset);
              expect(result.isValid).toBe(true);
              expect(result.clamped).toBe(offset);
            }
          ),
          { numRuns: 100 }
        );
      });
      
      it('should clamp extreme values', () => {
        expect(ValidationUtils.validatePositionOffset(-2000).clamped).toBe(-1000);
        expect(ValidationUtils.validatePositionOffset(2000).clamped).toBe(1000);
      });
    });
    
    describe('Text Validation', () => {
      
      it('should accept valid text', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 100 }),
            (text) => {
              const result = ValidationUtils.validateText(text);
              expect(result.isValid).toBe(true);
              expect(result.sanitized).toBe(text.trim());
            }
          ),
          { numRuns: 30 }
        );
      });
      
      it('should truncate text longer than 500 characters', () => {
        const longText = 'a'.repeat(600);
        const result = ValidationUtils.validateText(longText);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitized.length).toBe(500);
        expect(result.wasAdjusted).toBe(true);
      });
      
      it('should reject empty or null text', () => {
        expect(ValidationUtils.validateText('').isValid).toBe(false);
        expect(ValidationUtils.validateText(null).isValid).toBe(false);
        expect(ValidationUtils.validateText(undefined).isValid).toBe(false);
      });
    });
    
    describe('Flow Amount Validation', () => {
      
      it('should accept positive numbers', () => {
        fc.assert(
          fc.property(
            fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
            (amount) => {
              const result = ValidationUtils.validateFlowAmount(amount);
              expect(result.isValid).toBe(true);
              expect(result.value).toBeCloseTo(amount, 5);
            }
          ),
          { numRuns: 50 }
        );
      });
      
      it('should reject zero and negative amounts', () => {
        expect(ValidationUtils.validateFlowAmount(0).isValid).toBe(false);
        expect(ValidationUtils.validateFlowAmount(-10).isValid).toBe(false);
      });
      
      it('should reject non-numeric amounts', () => {
        expect(ValidationUtils.validateFlowAmount('abc').isValid).toBe(false);
        expect(ValidationUtils.validateFlowAmount(NaN).isValid).toBe(false);
        expect(ValidationUtils.validateFlowAmount(Infinity).isValid).toBe(false);
      });
    });
  });
  
  describe('Property 19: Settings Persistence Round-Trip', () => {
    
    describe('Node Settings Validation', () => {
      
      it('should validate and preserve valid node settings', () => {
        fc.assert(
          fc.property(
            fc.record({
              fillColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => '#' + h),
              borderColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => '#' + h),
              opacity: fc.integer({ min: 0, max: 100 }),
              borderOpacity: fc.integer({ min: 0, max: 100 })
            }),
            (settings) => {
              const result = ValidationUtils.validateNodeSettings(settings);
              
              expect(result.isValid).toBe(true);
              expect(result.validated.fillColor).toBe(settings.fillColor.toLowerCase());
              expect(result.validated.borderColor).toBe(settings.borderColor.toLowerCase());
              expect(result.validated.opacity).toBe(settings.opacity);
              expect(result.validated.borderOpacity).toBe(settings.borderOpacity);
            }
          ),
          { numRuns: 30 }
        );
      });
      
      it('should clamp out-of-range opacity values', () => {
        const settings = {
          fillColor: '#ff0000',
          opacity: 150,
          borderOpacity: -10
        };
        
        const result = ValidationUtils.validateNodeSettings(settings);
        
        expect(result.validated.opacity).toBe(100);
        expect(result.validated.borderOpacity).toBe(0);
      });
    });
    
    describe('Label Settings Validation', () => {
      
      it('should validate and preserve valid label settings', () => {
        fc.assert(
          fc.property(
            fc.record({
              labelText: fc.string({ minLength: 1, maxLength: 50 }),
              labelFontSize: fc.integer({ min: 8, max: 72 }),
              labelColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => '#' + h),
              labelMarginTop: fc.integer({ min: 0, max: 100 }),
              labelMarginRight: fc.integer({ min: 0, max: 100 }),
              labelMarginBottom: fc.integer({ min: 0, max: 100 }),
              labelMarginLeft: fc.integer({ min: 0, max: 100 }),
              labelX: fc.integer({ min: -1000, max: 1000 }),
              labelY: fc.integer({ min: -1000, max: 1000 })
            }),
            (settings) => {
              const result = ValidationUtils.validateLabelSettings(settings);
              
              expect(result.isValid).toBe(true);
              expect(result.validated.labelText).toBe(settings.labelText.trim());
              expect(result.validated.labelFontSize).toBe(settings.labelFontSize);
              expect(result.validated.labelColor).toBe(settings.labelColor.toLowerCase());
              expect(result.validated.labelMarginTop).toBe(settings.labelMarginTop);
              expect(result.validated.labelX).toBe(settings.labelX);
              expect(result.validated.labelY).toBe(settings.labelY);
            }
          ),
          { numRuns: 30 }
        );
      });
      
      it('should clamp out-of-range label settings', () => {
        const settings = {
          labelText: 'Test',
          labelFontSize: 100,
          labelMarginTop: 200,
          labelX: 5000
        };
        
        const result = ValidationUtils.validateLabelSettings(settings);
        
        expect(result.validated.labelFontSize).toBe(72);
        expect(result.validated.labelMarginTop).toBe(100);
        expect(result.validated.labelX).toBe(1000);
      });
    });
    
    describe('Settings Round-Trip', () => {
      
      it('should preserve settings through validation round-trip', () => {
        fc.assert(
          fc.property(
            fc.record({
              fillColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => '#' + h),
              opacity: fc.integer({ min: 0, max: 100 }),
              labelText: fc.string({ minLength: 1, maxLength: 50 }),
              labelFontSize: fc.integer({ min: 8, max: 72 })
            }),
            (settings) => {
              // First validation
              const nodeResult = ValidationUtils.validateNodeSettings({
                fillColor: settings.fillColor,
                opacity: settings.opacity
              });
              
              const labelResult = ValidationUtils.validateLabelSettings({
                labelText: settings.labelText,
                labelFontSize: settings.labelFontSize
              });
              
              // Second validation (round-trip)
              const nodeResult2 = ValidationUtils.validateNodeSettings(nodeResult.validated);
              const labelResult2 = ValidationUtils.validateLabelSettings(labelResult.validated);
              
              // Should be identical after round-trip
              expect(nodeResult2.validated.fillColor).toBe(nodeResult.validated.fillColor);
              expect(nodeResult2.validated.opacity).toBe(nodeResult.validated.opacity);
              expect(labelResult2.validated.labelText).toBe(labelResult.validated.labelText);
              expect(labelResult2.validated.labelFontSize).toBe(labelResult.validated.labelFontSize);
            }
          ),
          { numRuns: 30 }
        );
      });
    });
  });
});
