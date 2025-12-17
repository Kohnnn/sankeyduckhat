/**
 * @fileoverview Unit tests for Node Label Generator Module
 */

import { generateNodeLabel, generateMultipleNodeLabels, validateLabelCompleteness } from '../node_label_generator.js';

describe('Node Label Generator', () => {
    describe('generateNodeLabel', () => {
        test('generates basic label with name and value', () => {
            const result = generateNodeLabel('Revenue', 1000000);
            expect(result).toBe('Revenue\n$1M');
        });

        test('generates label with YoY growth', () => {
            const result = generateNodeLabel('Revenue', 1200000, '+15.2%');
            expect(result).toBe('Revenue\n$1.2M\n(+15.2%)');
        });

        test('formats values with k suffix', () => {
            const result = generateNodeLabel('Expenses', 50000);
            expect(result).toBe('Expenses\n$50k');
        });

        test('formats values with B suffix', () => {
            const result = generateNodeLabel('Assets', 2500000000);
            expect(result).toBe('Assets\n$2.5B');
        });

        test('formats small values without suffix', () => {
            const result = generateNodeLabel('Petty Cash', 500);
            expect(result).toBe('Petty Cash\n$500');
        });

        test('removes unnecessary decimal places', () => {
            const result = generateNodeLabel('Revenue', 1000000);
            expect(result).toBe('Revenue\n$1M');
            expect(result).not.toContain('1.0M');
        });

        test('handles negative values by using absolute value', () => {
            const result = generateNodeLabel('Loss', -500000);
            expect(result).toBe('Loss\n$500k');
        });

        test('trims whitespace from name and YoY growth', () => {
            const result = generateNodeLabel('  Revenue  ', 1000000, '  +15.2%  ');
            expect(result).toBe('Revenue\n$1M\n(+15.2%)');
        });

        test('handles empty YoY growth string', () => {
            const result = generateNodeLabel('Revenue', 1000000, '');
            expect(result).toBe('Revenue\n$1M');
        });

        test('throws error for invalid name', () => {
            expect(() => generateNodeLabel('', 1000000)).toThrow('Node name must be a non-empty string');
            expect(() => generateNodeLabel('   ', 1000000)).toThrow('Node name must be a non-empty string');
        });

        test('throws error for invalid value', () => {
            expect(() => generateNodeLabel('Revenue', 'invalid')).toThrow('Node value must be a finite number');
            expect(() => generateNodeLabel('Revenue', Infinity)).toThrow('Node value must be a finite number');
            expect(() => generateNodeLabel('Revenue', NaN)).toThrow('Node value must be a finite number');
        });

        test('throws error for invalid YoY growth type', () => {
            expect(() => generateNodeLabel('Revenue', 1000000, 123)).toThrow('YoY growth must be a string or undefined');
        });
    });

    describe('generateMultipleNodeLabels', () => {
        test('generates labels for multiple nodes', () => {
            const nodes = [
                { name: 'Revenue', value: 1000000, yoyGrowth: '+15.2%' },
                { name: 'Expenses', value: 750000, yoyGrowth: '-5.1%' },
                { name: 'Profit', value: 250000 }
            ];

            const result = generateMultipleNodeLabels(nodes);

            expect(result).toHaveLength(3);
            expect(result[0]).toBe('Revenue\n$1M\n(+15.2%)');
            expect(result[1]).toBe('Expenses\n$750k\n(-5.1%)');
            expect(result[2]).toBe('Profit\n$250k');
        });

        test('throws error for non-array input', () => {
            expect(() => generateMultipleNodeLabels('invalid')).toThrow('Nodes must be an array');
        });

        test('throws error for invalid node objects', () => {
            expect(() => generateMultipleNodeLabels([null])).toThrow('Each node must be an object');
            expect(() => generateMultipleNodeLabels(['invalid'])).toThrow('Each node must be an object');
        });
    });

    describe('validateLabelCompleteness', () => {
        test('validates complete label with YoY growth', () => {
            const label = 'Revenue\n$1M\n(+15.2%)';
            const result = validateLabelCompleteness(label, 'Revenue', 1000000, '+15.2%');
            expect(result).toBe(true);
        });

        test('validates label without YoY growth', () => {
            const label = 'Revenue\n$1M';
            const result = validateLabelCompleteness(label, 'Revenue', 1000000);
            expect(result).toBe(true);
        });

        test('fails validation when name is missing', () => {
            const label = '$1M\n(+15.2%)';
            const result = validateLabelCompleteness(label, 'Revenue', 1000000, '+15.2%');
            expect(result).toBe(false);
        });

        test('fails validation when formatted value is missing', () => {
            const label = 'Revenue\n(+15.2%)';
            const result = validateLabelCompleteness(label, 'Revenue', 1000000, '+15.2%');
            expect(result).toBe(false);
        });

        test('fails validation when expected YoY growth is missing', () => {
            const label = 'Revenue\n$1M';
            const result = validateLabelCompleteness(label, 'Revenue', 1000000, '+15.2%');
            expect(result).toBe(false);
        });

        test('returns false for non-string label', () => {
            const result = validateLabelCompleteness(123, 'Revenue', 1000000);
            expect(result).toBe(false);
        });
    });
});