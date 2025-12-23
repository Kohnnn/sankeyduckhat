/**
 * Property-Based Tests for Paste Data Parsing
 * 
 * Feature: react-migration, Property 9: Paste Data Creates Flows
 * Validates: Requirements 2.4
 * 
 * For any valid TSV/CSV string with N rows of "source\ttarget\tvalue" data,
 * parsing and importing should create exactly N new flows with the correct
 * source, target, and value for each row.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parsePasteData,
  parseLine,
  detectDelimiter,
  ParsedRow,
} from '../parsePasteData';

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

/**
 * Generates a valid node name (non-empty string without delimiters)
 */
const arbitraryNodeName = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 50 })
    .filter((s) => !s.includes('\t') && !s.includes(',') && !s.includes('\n') && s.trim().length > 0)
    .map((s) => s.trim());

/**
 * Generates a valid positive flow value
 */
const arbitraryFlowValue = (): fc.Arbitrary<number> =>
  fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true });

/**
 * Generates a valid parsed row
 */
const arbitraryParsedRow = (): fc.Arbitrary<ParsedRow> =>
  fc.record({
    source: arbitraryNodeName(),
    target: arbitraryNodeName(),
    value: arbitraryFlowValue(),
  });

/**
 * Generates a TSV line from a parsed row
 */
const rowToTSV = (row: ParsedRow): string =>
  `${row.source}\t${row.target}\t${row.value}`;

/**
 * Generates a CSV line from a parsed row
 */
const rowToCSV = (row: ParsedRow): string =>
  `${row.source},${row.target},${row.value}`;

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: react-migration, Property 9: Paste Data Creates Flows', () => {
  describe('parsePasteData creates correct number of flows', () => {
    it('TSV format: for any N valid rows, parsing creates exactly N flows', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryParsedRow(), { minLength: 1, maxLength: 20 }),
          (rows) => {
            const tsvData = rows.map(rowToTSV).join('\n');
            const result = parsePasteData(tsvData);
            
            expect(result.success).toBe(true);
            expect(result.flows.length).toBe(rows.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('CSV format: for any N valid rows, parsing creates exactly N flows', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryParsedRow(), { minLength: 1, maxLength: 20 }),
          (rows) => {
            const csvData = rows.map(rowToCSV).join('\n');
            const result = parsePasteData(csvData);
            
            expect(result.success).toBe(true);
            expect(result.flows.length).toBe(rows.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('parsePasteData preserves data correctly', () => {
    it('TSV format: source, target, and value are preserved for each row', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryParsedRow(), { minLength: 1, maxLength: 20 }),
          (rows) => {
            const tsvData = rows.map(rowToTSV).join('\n');
            const result = parsePasteData(tsvData);
            
            expect(result.success).toBe(true);
            
            for (let i = 0; i < rows.length; i++) {
              const originalRow = rows[i];
              const parsedFlow = result.flows[i];
              
              expect(parsedFlow).toBeDefined();
              expect(parsedFlow?.source).toBe(originalRow?.source);
              expect(parsedFlow?.target).toBe(originalRow?.target);
              // Use toBeCloseTo for floating point comparison
              expect(parsedFlow?.value).toBeCloseTo(originalRow?.value ?? 0, 5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('CSV format: source, target, and value are preserved for each row', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryParsedRow(), { minLength: 1, maxLength: 20 }),
          (rows) => {
            const csvData = rows.map(rowToCSV).join('\n');
            const result = parsePasteData(csvData);
            
            expect(result.success).toBe(true);
            
            for (let i = 0; i < rows.length; i++) {
              const originalRow = rows[i];
              const parsedFlow = result.flows[i];
              
              expect(parsedFlow).toBeDefined();
              expect(parsedFlow?.source).toBe(originalRow?.source);
              expect(parsedFlow?.target).toBe(originalRow?.target);
              expect(parsedFlow?.value).toBeCloseTo(originalRow?.value ?? 0, 5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('parsePasteData generates unique IDs', () => {
    it('each flow has a unique ID', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryParsedRow(), { minLength: 2, maxLength: 20 }),
          (rows) => {
            const tsvData = rows.map(rowToTSV).join('\n');
            const result = parsePasteData(tsvData);
            
            const ids = result.flows.map((f) => f.id);
            const uniqueIds = new Set(ids);
            
            expect(uniqueIds.size).toBe(ids.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('detectDelimiter correctly identifies format', () => {
    it('detects tab delimiter for TSV data', () => {
      fc.assert(
        fc.property(
          arbitraryParsedRow(),
          (row) => {
            const tsvLine = rowToTSV(row);
            expect(detectDelimiter(tsvLine)).toBe('\t');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('detects comma delimiter for CSV data without tabs', () => {
      fc.assert(
        fc.property(
          arbitraryParsedRow(),
          (row) => {
            const csvLine = rowToCSV(row);
            // Only test if the data doesn't contain tabs
            if (!csvLine.includes('\t')) {
              expect(detectDelimiter(csvLine)).toBe(',');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('prioritizes tab over comma when both present', () => {
      fc.assert(
        fc.property(
          arbitraryParsedRow(),
          (row) => {
            // Create a line with both tab and comma
            const mixedLine = `${row.source}\t${row.target},extra\t${row.value}`;
            expect(detectDelimiter(mixedLine)).toBe('\t');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('parseLine handles individual lines correctly', () => {
    it('parses valid TSV lines correctly', () => {
      fc.assert(
        fc.property(
          arbitraryParsedRow(),
          fc.integer({ min: 1, max: 1000 }),
          (row, lineNumber) => {
            const tsvLine = rowToTSV(row);
            const result = parseLine(tsvLine, '\t', lineNumber);
            
            expect(result.error).toBeNull();
            expect(result.row).not.toBeNull();
            expect(result.row?.source).toBe(row.source);
            expect(result.row?.target).toBe(row.target);
            expect(result.row?.value).toBeCloseTo(row.value, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns null for empty lines without error', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (lineNumber) => {
            const result = parseLine('', '\t', lineNumber);
            expect(result.row).toBeNull();
            expect(result.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns null for whitespace-only lines without error', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 1, max: 1000 }),
          (whitespace, lineNumber) => {
            const result = parseLine(whitespace, '\t', lineNumber);
            expect(result.row).toBeNull();
            expect(result.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('parsePasteData handles edge cases', () => {
    it('returns error for empty input', () => {
      const result = parsePasteData('');
      expect(result.success).toBe(false);
      expect(result.flows.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns error for whitespace-only input', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 20 }),
          (whitespace) => {
            const result = parsePasteData(whitespace);
            expect(result.success).toBe(false);
            expect(result.flows.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('skips header rows that contain common header words', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryParsedRow(), { minLength: 1, maxLength: 10 }),
          fc.constantFrom('Source\tTarget\tValue', 'from,to,amount', 'FROM\tTO\tVALUE', 'source,target,value'),
          (rows, header) => {
            // Use the same delimiter as the header
            const delimiter = header.includes('\t') ? '\t' : ',';
            const dataRows = rows.map((row) =>
              delimiter === '\t' ? rowToTSV(row) : rowToCSV(row)
            );
            const dataWithHeader = header + '\n' + dataRows.join('\n');
            const result = parsePasteData(dataWithHeader);
            
            expect(result.success).toBe(true);
            expect(result.flows.length).toBe(rows.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
