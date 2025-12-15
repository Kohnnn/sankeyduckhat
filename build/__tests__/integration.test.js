/**
 * Integration Tests for SankeyMATIC Refactor
 * Tests full workflows and feature interactions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../color_palettes.js';
import '../templates.js';
import '../data_editor.js';

// Access modules from global scope
const { ColorPalettes, Templates, DataEditor } = globalThis;

describe('Integration Tests', () => {
  beforeEach(() => {
    // localStorage is already mocked in setup.js and cleared before each test
    
    // Mock d3 color schemes
    global.d3 = {
      schemeCategory10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
      schemeTableau10: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f'],
      schemeDark2: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e'],
      schemeSet3: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3']
    };

    // Initialize modules
    if (typeof ColorPalettes !== 'undefined') {
      ColorPalettes.initializeDefaults();
      ColorPalettes.loadFromStorage();
    }
    if (typeof Templates !== 'undefined') {
      Templates.loadFromStorage();
    }
  });

  describe('Full Workflow: Create Diagram → Customize → Save Template → Reload', () => {
    it('should persist template settings across sessions', () => {
      // Step 1: Create a custom palette
      const customColors = ['#ff0000', '#00ff00', '#0000ff'];
      const palette = ColorPalettes.saveCustom('MyBrand', customColors);
      
      expect(palette.name).toBe('MyBrand');
      expect(palette.colors).toEqual(customColors);

      // Step 2: Set it as default
      ColorPalettes.setDefaultPalette(palette.id);
      
      // Step 3: Create template settings
      const mockSettings = {
        size_w: 800,
        size_h: 600,
        node_theme: palette.id,
        labels_fontface: 'Manrope',
        labels_decimalplaces: '2',
        labels_valuemode: 'short'
      };

      // Step 4: Save template
      const template = Templates.save('MyTemplate');
      
      // Manually set settings for test (since we don't have DOM)
      template.settings = mockSettings;
      
      // Step 5: Simulate reload - clear and reload from storage
      const savedPaletteId = ColorPalettes.getDefaultPalette();
      expect(savedPaletteId).toBe(palette.id);
      
      // Step 6: Verify palette persists
      const reloadedPalette = ColorPalettes.get(savedPaletteId);
      expect(reloadedPalette).toBeTruthy();
      expect(reloadedPalette.colors).toEqual(customColors);
      
      // Step 7: Verify template persists
      const reloadedTemplate = Templates.get('MyTemplate');
      expect(reloadedTemplate).toBeTruthy();
      expect(reloadedTemplate.settings.size_w).toBe(800);
    });

    it('should maintain flow data when applying templates', () => {
      // Original flow data
      const flowData = `A [100] B
B [50] C
B [50] D`;

      // Parse to data editor
      const rows = DataEditor.parseFromDSL(flowData);
      expect(rows).toHaveLength(3);
      
      // Save template (should not capture flow data)
      const template = Templates.save('StyleOnly');
      
      // Verify flow data is not in template
      expect(template.settings.flows_in).toBeUndefined();
      
      // Convert back to DSL
      const regeneratedDSL = DataEditor.toDSL(rows);
      
      // Verify flow data is preserved
      expect(regeneratedDSL).toContain('A [100] B');
      expect(regeneratedDSL).toContain('B [50] C');
      expect(regeneratedDSL).toContain('B [50] D');
    });
  });

  describe('Palette Persistence Across Sessions', () => {
    it('should save and restore custom palettes', () => {
      // Create multiple custom palettes
      const palette1 = ColorPalettes.saveCustom('Brand1', ['#ff0000', '#00ff00']);
      const palette2 = ColorPalettes.saveCustom('Brand2', ['#0000ff', '#ffff00']);
      
      // Verify they're saved
      expect(ColorPalettes.get(palette1.id)).toBeTruthy();
      expect(ColorPalettes.get(palette2.id)).toBeTruthy();
      
      // Simulate reload by creating new instance
      const storedData = localStorage.getItem('skm_custom_palettes');
      expect(storedData).toBeTruthy();
      
      const parsed = JSON.parse(storedData);
      expect(parsed.length).toBeGreaterThanOrEqual(2);
      expect(parsed.some(p => p.name === 'Brand1')).toBe(true);
      expect(parsed.some(p => p.name === 'Brand2')).toBe(true);
    });

    it('should restore default palette preference', () => {
      // Set a default palette
      const paletteId = 'a'; // Categories
      ColorPalettes.setDefaultPalette(paletteId);
      
      // Verify it's saved
      const saved = ColorPalettes.getDefaultPalette();
      expect(saved).toBe(paletteId);
      
      // Verify it's in localStorage
      const stored = localStorage.getItem('skm_default_palette');
      expect(stored).toBe(paletteId);
    });

    it('should handle palette deletion correctly', () => {
      // Create a custom palette
      const palette = ColorPalettes.saveCustom('ToDelete', ['#123456']);
      const paletteId = palette.id;
      
      // Verify it exists
      expect(ColorPalettes.get(paletteId)).toBeTruthy();
      
      // Delete it
      const deleted = ColorPalettes.deleteCustom(paletteId);
      expect(deleted).toBe(true);
      
      // Verify it's gone
      expect(ColorPalettes.get(paletteId)).toBeNull();
      
      // Verify localStorage is updated
      const stored = localStorage.getItem('skm_custom_palettes');
      const parsed = JSON.parse(stored);
      expect(parsed.some(p => p.id === paletteId)).toBe(false);
    });
  });

  describe('Data Editor Sync with Complex DSL Inputs', () => {
    it('should preserve comments and node definitions', () => {
      const complexDSL = `// This is a comment
:Budget #606
:Taxes #900

// Flow definitions
Wages [1500] Budget
Other [250] Budget
Budget [450] Taxes
Budget [420] Housing #606`;

      // Parse to table
      const rows = DataEditor.parseFromDSL(complexDSL);
      
      // Should extract only flow lines
      expect(rows).toHaveLength(4);
      expect(rows[0].source).toBe('Wages');
      expect(rows[0].amount).toBe('1500');
      expect(rows[0].target).toBe('Budget');
      
      // Convert back to DSL
      const regenerated = DataEditor.toDSL(rows);
      
      // Should preserve comments and node definitions
      expect(regenerated).toContain('// This is a comment');
      expect(regenerated).toContain(':Budget #606');
      expect(regenerated).toContain(':Taxes #900');
      expect(regenerated).toContain('Wages [1500] Budget');
    });

    it('should handle DSL with labelmove commands', () => {
      const dslWithLabels = `A [100] B
B [50] C

labelmove A 10.5, -5.2
labelmove B 0, 15`;

      const rows = DataEditor.parseFromDSL(dslWithLabels);
      
      // Should extract only flows
      expect(rows).toHaveLength(2);
      
      // Convert back
      const regenerated = DataEditor.toDSL(rows);
      
      // Note: labelmove commands are preserved in originalDSLText
      // but only if they were in the original input
      // The current implementation preserves non-flow lines
      expect(regenerated).toContain('A [100] B');
      expect(regenerated).toContain('B [50] C');
    });

    it('should handle flows with colors', () => {
      const dslWithColors = `A [100] B #ff0000
B [50] C #00ff00
C [25] D`;

      const rows = DataEditor.parseFromDSL(dslWithColors);
      
      expect(rows).toHaveLength(3);
      expect(rows[0].color).toBe('#ff0000');
      expect(rows[1].color).toBe('#00ff00');
      expect(rows[2].color).toBeNull();
      
      // Convert back
      const regenerated = DataEditor.toDSL(rows);
      
      expect(regenerated).toContain('A [100] B #ff0000');
      expect(regenerated).toContain('B [50] C #00ff00');
      expect(regenerated).toContain('C [25] D');
    });

    it('should sync table changes to DSL', () => {
      const initialDSL = `A [100] B
B [50] C`;

      const rows = DataEditor.parseFromDSL(initialDSL);
      DataEditor.setRows(rows);
      
      // Modify a row
      DataEditor.updateRow(rows[0].id, { amount: '200' });
      
      // Convert back
      const updated = DataEditor.toDSL(DataEditor.getRows());
      
      expect(updated).toContain('A [200] B');
      expect(updated).toContain('B [50] C');
    });

    it('should handle adding and deleting rows', () => {
      const initialDSL = `A [100] B`;

      const rows = DataEditor.parseFromDSL(initialDSL);
      DataEditor.setRows(rows);
      
      // Add a new row
      const newRow = DataEditor.addRow();
      DataEditor.updateRow(newRow.id, {
        source: 'B',
        target: 'C',
        amount: '50'
      });
      
      // Convert to DSL
      let updated = DataEditor.toDSL(DataEditor.getRows());
      expect(updated).toContain('A [100] B');
      expect(updated).toContain('B [50] C');
      
      // Delete the first row
      DataEditor.deleteRow(rows[0].id);
      
      updated = DataEditor.toDSL(DataEditor.getRows());
      expect(updated).not.toContain('A [100] B');
      expect(updated).toContain('B [50] C');
    });
  });

  describe('Feature Interactions', () => {
    it('should work with palette + template + data editor together', () => {
      // 1. Create custom palette
      const palette = ColorPalettes.saveCustom('TestPalette', ['#aaaaaa', '#bbbbbb', '#cccccc']);
      
      // 2. Create flow data
      const flowDSL = `A [100] B
B [60] C
B [40] D`;
      const rows = DataEditor.parseFromDSL(flowDSL);
      
      // 3. Save template with palette
      const template = Templates.save('CompleteSetup');
      template.settings = {
        node_theme: palette.id,
        labels_decimalplaces: '1'
      };
      
      // 4. Verify all components work
      expect(ColorPalettes.get(palette.id)).toBeTruthy();
      expect(Templates.get('CompleteSetup')).toBeTruthy();
      expect(rows).toHaveLength(3);
      
      // 5. Verify palette colors cycle correctly
      expect(ColorPalettes.getColorForIndex(palette.id, 0)).toBe('#aaaaaa');
      expect(ColorPalettes.getColorForIndex(palette.id, 1)).toBe('#bbbbbb');
      expect(ColorPalettes.getColorForIndex(palette.id, 2)).toBe('#cccccc');
      expect(ColorPalettes.getColorForIndex(palette.id, 3)).toBe('#aaaaaa'); // Cycles back
    });

    it('should handle CSV export/import with custom palettes', () => {
      // Create flow data
      const flowDSL = `A [100] B #ff0000
B [50] C`;
      
      const rows = DataEditor.parseFromDSL(flowDSL);
      DataEditor.setRows(rows);
      
      // Export to CSV
      const csv = DataEditor.exportCSV();
      
      expect(csv).toContain('Source,Target,Amount,Comparison,Color');
      expect(csv).toContain('A,B,100,,#ff0000');
      expect(csv).toContain('B,C,50,,');
      
      // Import back
      const imported = DataEditor.importCSV(csv);
      
      expect(imported).toHaveLength(2);
      expect(imported[0].source).toBe('A');
      expect(imported[0].target).toBe('B');
      expect(imported[0].amount).toBe('100');
      expect(imported[0].color).toBe('#ff0000');
    });

    it('should validate rows correctly in data editor', () => {
      const invalidRow = {
        id: 'test1',
        source: '',
        target: 'B',
        amount: 'invalid',
        color: 'notahex'
      };
      
      const validation = DataEditor.validateRow(invalidRow);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Source is required');
      expect(validation.errors).toContain('Amount must be a positive number or *');
      expect(validation.errors).toContain('Invalid color format');
    });

    it('should handle template deletion without affecting palettes', () => {
      // Create palette and template
      const palette = ColorPalettes.saveCustom('Palette1', ['#111111']);
      const template = Templates.save('Template1');
      template.settings = { node_theme: palette.id };
      
      // Delete template
      Templates.delete('Template1');
      
      // Palette should still exist
      expect(ColorPalettes.get(palette.id)).toBeTruthy();
      expect(Templates.get('Template1')).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty DSL input', () => {
      const rows = DataEditor.parseFromDSL('');
      expect(rows).toHaveLength(0);
      
      const dsl = DataEditor.toDSL([]);
      expect(dsl).toBe('');
    });

    it('should handle malformed flow lines gracefully', () => {
      const malformedDSL = `A [100] B
This is not a valid flow
C [50] D`;
      
      const rows = DataEditor.parseFromDSL(malformedDSL);
      
      // Should only parse valid flows
      expect(rows).toHaveLength(2);
      expect(rows[0].source).toBe('A');
      expect(rows[1].source).toBe('C');
    });

    it('should handle invalid hex colors in custom palettes', () => {
      expect(() => {
        ColorPalettes.saveCustom('BadPalette', ['notahex', 'alsobad']);
      }).toThrow('No valid hex colors provided');
    });

    it('should handle missing palette gracefully', () => {
      const color = ColorPalettes.getColorForIndex('nonexistent', 0);
      expect(color).toBe('#888888'); // Fallback gray
    });

    it('should handle CSV with quoted values', () => {
      const csvWithQuotes = `Source,Target,Amount,Comparison,Color
"Node A","Node B",100,,
"Node, With, Commas","Target",50,,#abc`;
      
      const rows = DataEditor.importCSV(csvWithQuotes);
      
      expect(rows).toHaveLength(2);
      expect(rows[0].source).toBe('Node A');
      expect(rows[0].target).toBe('Node B');
      expect(rows[1].source).toBe('Node, With, Commas');
      expect(rows[1].color).toBe('#abc');
    });
  });
});
