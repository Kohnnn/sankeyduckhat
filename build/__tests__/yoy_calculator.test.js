/**
 * @fileoverview Unit tests for YoY Growth Calculator
 */

import { calculateYoYGrowth, calculateMultipleYoYGrowth, isSignificantGrowth } from '../yoy_calculator.js';

describe('YoY Growth Calculator', () => {
    describe('calculateYoYGrowth', () => {
        test('calculates positive growth correctly', () => {
            expect(calculateYoYGrowth(120, 100)).toBe('+20.0%');
            expect(calculateYoYGrowth(150, 100)).toBe('+50.0%');
            expect(calculateYoYGrowth(105.5, 100)).toBe('+5.5%');
        });

        test('calculates negative growth correctly', () => {
            expect(calculateYoYGrowth(80, 100)).toBe('-20.0%');
            expect(calculateYoYGrowth(50, 100)).toBe('-50.0%');
            expect(calculateYoYGrowth(95.3, 100)).toBe('-4.7%');
        });

        test('handles zero growth', () => {
            expect(calculateYoYGrowth(100, 100)).toBe('+0.0%');
            expect(calculateYoYGrowth(0, 0)).toBe('0.0%');
        });

        test('handles zero comparison value', () => {
            expect(calculateYoYGrowth(100, 0)).toBe('+∞%');
            expect(calculateYoYGrowth(-50, 0)).toBe('-∞%');
            expect(calculateYoYGrowth(0, 0)).toBe('0.0%');
        });

        test('handles negative comparison values', () => {
            // When comparison is negative, we use absolute value for calculation
            expect(calculateYoYGrowth(-80, -100)).toBe('+20.0%'); // (-80 - (-100)) / |-100| = 20/100 = +20%
            expect(calculateYoYGrowth(-120, -100)).toBe('-20.0%'); // (-120 - (-100)) / |-100| = -20/100 = -20%
        });

        test('throws error for invalid inputs', () => {
            expect(() => calculateYoYGrowth('100', 50)).toThrow('Both current and comparison values must be numbers');
            expect(() => calculateYoYGrowth(100, '50')).toThrow('Both current and comparison values must be numbers');
            expect(() => calculateYoYGrowth(null, 50)).toThrow('Both current and comparison values must be numbers');
            expect(() => calculateYoYGrowth(100, undefined)).toThrow('Both current and comparison values must be numbers');
        });

        test('throws error for infinite inputs', () => {
            expect(() => calculateYoYGrowth(Infinity, 100)).toThrow('Both current and comparison values must be finite numbers');
            expect(() => calculateYoYGrowth(100, -Infinity)).toThrow('Both current and comparison values must be finite numbers');
            expect(() => calculateYoYGrowth(NaN, 100)).toThrow('Both current and comparison values must be finite numbers');
        });

        test('formats decimal places correctly', () => {
            expect(calculateYoYGrowth(133.333, 100)).toBe('+33.3%');
            expect(calculateYoYGrowth(166.666, 100)).toBe('+66.7%');
            expect(calculateYoYGrowth(83.333, 100)).toBe('-16.7%');
        });
    });

    describe('calculateMultipleYoYGrowth', () => {
        test('calculates growth for multiple values', () => {
            const current = [120, 80, 100];
            const comparison = [100, 100, 100];
            const expected = ['+20.0%', '-20.0%', '+0.0%'];
            
            expect(calculateMultipleYoYGrowth(current, comparison)).toEqual(expected);
        });

        test('handles empty arrays', () => {
            expect(calculateMultipleYoYGrowth([], [])).toEqual([]);
        });

        test('throws error for mismatched array lengths', () => {
            expect(() => calculateMultipleYoYGrowth([100, 200], [100])).toThrow('Current and comparison arrays must have the same length');
            expect(() => calculateMultipleYoYGrowth([100], [100, 200])).toThrow('Current and comparison arrays must have the same length');
        });

        test('throws error for non-array inputs', () => {
            expect(() => calculateMultipleYoYGrowth('not array', [100])).toThrow('Both parameters must be arrays');
            expect(() => calculateMultipleYoYGrowth([100], 'not array')).toThrow('Both parameters must be arrays');
        });
    });

    describe('isSignificantGrowth', () => {
        test('identifies significant positive growth', () => {
            expect(isSignificantGrowth('+10.0%')).toBe(true);
            expect(isSignificantGrowth('+5.0%')).toBe(true);
            expect(isSignificantGrowth('+5.1%')).toBe(true);
        });

        test('identifies significant negative growth', () => {
            expect(isSignificantGrowth('-10.0%')).toBe(true);
            expect(isSignificantGrowth('-5.0%')).toBe(true);
            expect(isSignificantGrowth('-5.1%')).toBe(true);
        });

        test('identifies insignificant growth', () => {
            expect(isSignificantGrowth('+4.9%')).toBe(false);
            expect(isSignificantGrowth('-4.9%')).toBe(false);
            expect(isSignificantGrowth('+0.0%')).toBe(false);
            expect(isSignificantGrowth('0.0%')).toBe(false);
        });

        test('handles custom threshold', () => {
            expect(isSignificantGrowth('+8.0%', 10.0)).toBe(false);
            expect(isSignificantGrowth('+12.0%', 10.0)).toBe(true);
            expect(isSignificantGrowth('-8.0%', 10.0)).toBe(false);
            expect(isSignificantGrowth('-12.0%', 10.0)).toBe(true);
        });

        test('handles infinite growth', () => {
            expect(isSignificantGrowth('+∞%')).toBe(true);
            expect(isSignificantGrowth('-∞%')).toBe(true);
        });

        test('throws error for invalid format', () => {
            expect(() => isSignificantGrowth('invalid')).toThrow('Invalid YoY growth format');
            expect(() => isSignificantGrowth('abc%')).toThrow('Invalid YoY growth format');
            expect(() => isSignificantGrowth(123)).toThrow('YoY growth must be a formatted string');
        });
    });
});