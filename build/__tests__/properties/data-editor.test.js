/**
 * Property-Based Tests for Data Editor Module
 * Feature: sankey-refactor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Load the data editor module
await import('../../data_editor.js');

const DataEditor = global.DataEditor;

describe('Data Editor Property Tests', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  /**
   * **Feature: sankey-refactor, Property 13: DSL-Table Two-Way Sync**
   * **Validates: Requirements 7.4, 7.5, 7.6, 7.7, 7.11**
   * 
   * For any valid DSL text, parsing to table rows and serializing back to DSL
   * SHALL produce semantically equivalent DSL (same flows, possibly different formatting).
   */
  it('Property 13: DSL-Table Two-Way Sync', () => {
    // Generator for valid node names (no special chars that break DSL)
    const arbNodeName = fc.stringOf(
      fc.constantFrom(
        ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_'.split('')
      ),
      { minLength: 1, maxLength: 20 }
    ).filter(s => s.trim().length > 0);

    // Generator for valid amounts
    const arbAmount = fc.oneof(
      fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
      fc.constant('*')
    );

    // Generator for valid hex colors
    const arbColor = fc.option(
      fc.hexaString({ minLength: 3, maxLength: 6 }).map(h => '#' + h),
      { nil: null }
    );

    // Generator for a single flow line
    const arbFlowLine = fc.record({
      source: arbNodeName,
      target: arbNodeName,
      amount: arbAmount,
      color: arbColor
    }).map(flow => {
      let line = `${flow.source} [${flow.amount}] ${flow.target}`;
      if (flow.color) {
        line += ` ${flow.color}`;
      }
      return line;
    });

    // Generator for comments
    const arbComment = fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
      { minLength: 0, maxLength: 50 }
    ).map(s => '// ' + s);

    // Generator for node definitions
    const arbNodeDef = fc.record({
      name: arbNodeName,
      color: fc.hexaString({ minLength: 3, maxLength: 6 })
    }).map(node => `:${node.name} #${node.color}`);

    // Generator for DSL text with flows, comments, and node definitions
    const arbDSL = fc.array(
      fc.oneof(
        arbFlowLine,
        arbComment,
        arbNodeDef,
        fc.constant('') // empty lines
      ),
      { minLength: 1, maxLength: 20 }
    ).map(lines => lines.join('\n'));

    fc.assert(
      fc.property(arbDSL, (dslText) => {
        // Parse DSL to rows
        const rows = DataEditor.parseFromDSL(dslText);
        
        // Serialize back to DSL
        const regeneratedDSL = DataEditor.toDSL(rows);
        
        // Parse the regenerated DSL
        const rowsAfterRoundTrip = DataEditor.parseFromDSL(regeneratedDSL);
        
        // The number of flows should be the same
        expect(rows.length).toBe(rowsAfterRoundTrip.length);
        
        // Each flow should be semantically equivalent
        rows.forEach((originalRow, index) => {
          const roundTripRow = rowsAfterRoundTrip[index];
          
          // Source, target, and amount must match exactly
          expect(roundTripRow.source).toBe(originalRow.source);
          expect(roundTripRow.target).toBe(originalRow.target);
          expect(roundTripRow.amount).toBe(originalRow.amount);
          
          // Color should match (both null or both same value)
          if (originalRow.color) {
            expect(roundTripRow.color?.toLowerCase()).toBe(originalRow.color.toLowerCase());
          } else {
            expect(roundTripRow.color).toBeNull();
          }
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: sankey-refactor, Property 15: Invalid Row Highlighting**
   * **Validates: Requirements 7.10**
   * 
   * For any table row with invalid data (empty source, empty target, non-numeric amount,
   * or negative amount), the row SHALL have visual error highlighting applied.
   */
  it('Property 15: Invalid Row Highlighting', () => {
    // Generator for invalid rows
    const arbInvalidRow = fc.oneof(
      // Empty source
      fc.record({
        source: fc.constant(''),
        target: fc.string({ minLength: 1, maxLength: 20 }),
        amount: fc.integer({ min: 1, max: 1000 }).map(n => n.toString()),
        color: fc.constant(null)
      }),
      // Empty target
      fc.record({
        source: fc.string({ minLength: 1, maxLength: 20 }),
        target: fc.constant(''),
        amount: fc.integer({ min: 1, max: 1000 }).map(n => n.toString()),
        color: fc.constant(null)
      }),
      // Empty amount
      fc.record({
        source: fc.string({ minLength: 1, maxLength: 20 }),
        target: fc.string({ minLength: 1, maxLength: 20 }),
        amount: fc.constant(''),
        color: fc.constant(null)
      }),
      // Non-numeric amount (not *)
      fc.record({
        source: fc.string({ minLength: 1, maxLength: 20 }),
        target: fc.string({ minLength: 1, maxLength: 20 }),
        amount: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 10 }),
        color: fc.constant(null)
      }),
      // Negative amount
      fc.record({
        source: fc.string({ minLength: 1, maxLength: 20 }),
        target: fc.string({ minLength: 1, maxLength: 20 }),
        amount: fc.integer({ min: -1000, max: -1 }).map(n => n.toString()),
        color: fc.constant(null)
      })
    );

    fc.assert(
      fc.property(arbInvalidRow, (row) => {
        // Validate the row
        const validation = DataEditor.validateRow(row);
        
        // Invalid rows must be marked as invalid
        expect(validation.isValid).toBe(false);
        
        // Invalid rows must have at least one error
        expect(validation.errors.length).toBeGreaterThan(0);
        
        // Verify specific error messages based on the type of invalidity
        if (!row.source || row.source.trim() === '') {
          expect(validation.errors).toContain('Source is required');
        }
        
        if (!row.target || row.target.trim() === '') {
          expect(validation.errors).toContain('Target is required');
        }
        
        const amount = String(row.amount).trim();
        if (!amount) {
          expect(validation.errors).toContain('Amount is required');
        } else if (amount !== '*' && (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)) {
          expect(validation.errors).toContain('Amount must be a positive number or *');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: sankey-refactor, Property 14: CSV Round-Trip**
   * **Validates: Requirements 7.8, 7.9**
   * 
   * For any valid flow data, exporting to CSV and importing that CSV
   * SHALL produce equivalent flow data.
   */
  it('Property 14: CSV Round-Trip', () => {
    // Generator for valid node names (CSV-safe)
    const arbCSVNodeName = fc.stringOf(
      fc.constantFrom(
        ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_'.split('')
      ),
      { minLength: 1, maxLength: 20 }
    ).filter(s => s.trim().length > 0);

    // Generator for valid amounts
    const arbAmount = fc.oneof(
      fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
      fc.constant('*')
    );

    // Generator for valid hex colors
    const arbColor = fc.option(
      fc.hexaString({ minLength: 3, maxLength: 6 }).map(h => '#' + h),
      { nil: null }
    );

    // Generator for valid flow rows
    const arbValidFlowRow = fc.record({
      id: fc.constant('test-id'),
      source: arbCSVNodeName,
      target: arbCSVNodeName,
      amount: arbAmount,
      comparison: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
      color: arbColor,
      isValid: fc.constant(true),
      errors: fc.constant([])
    });

    // Generator for array of flow rows
    const arbFlowRows = fc.array(arbValidFlowRow, { minLength: 1, maxLength: 20 });

    fc.assert(
      fc.property(arbFlowRows, (originalRows) => {
        // Set the rows in the data editor
        DataEditor.setRows(originalRows);
        
        // Export to CSV
        const csvContent = DataEditor.exportCSV();
        
        // Verify CSV has header
        expect(csvContent).toContain('Source,Target,Amount,Comparison,Color');
        
        // Import from CSV
        const importedRows = DataEditor.importCSV(csvContent);
        
        // The number of rows should be the same
        expect(importedRows.length).toBe(originalRows.length);
        
        // Each row should be equivalent
        originalRows.forEach((originalRow, index) => {
          const importedRow = importedRows[index];
          
          // Source, target, and amount must match
          expect(importedRow.source).toBe(originalRow.source);
          expect(importedRow.target).toBe(originalRow.target);
          expect(importedRow.amount).toBe(originalRow.amount);
          
          // Comparison should match (within floating point tolerance)
          if (originalRow.comparison !== null && !isNaN(originalRow.comparison)) {
            expect(importedRow.comparison).toBeCloseTo(originalRow.comparison, 2);
          } else if (isNaN(originalRow.comparison)) {
            // NaN becomes null after CSV round-trip (can't represent NaN in CSV)
            expect(importedRow.comparison).toBeNull();
          } else {
            expect(importedRow.comparison).toBeNull();
          }
          
          // Color should match (case-insensitive)
          if (originalRow.color) {
            expect(importedRow.color?.toLowerCase()).toBe(originalRow.color.toLowerCase());
          } else {
            expect(importedRow.color).toBeNull();
          }
        });
      }),
      { numRuns: 100 }
    );
  });
});
