/**
 * Property-Based Tests for Color Palettes Module
 * Feature: sankey-refactor
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';

// Mock d3 for testing
global.d3 = {
  schemeCategory10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  schemeTableau10: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'],
  schemeDark2: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'],
  schemeSet3: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']
};

// Load the module
await import('../../color_palettes.js');

const ColorPalettes = global.ColorPalettes;

describe('Color Palettes - Property-Based Tests', () => {
  beforeAll(() => {
    // Initialize the module
    ColorPalettes.initializeDefaults();
    ColorPalettes.loadFromStorage();
  });

  /**
   * **Feature: sankey-refactor, Property 1: Palette Color Cycling**
   * **Validates: Requirements 2.3, 2.8, 2.9**
   * 
   * For any palette with N colors and any node at index I (without explicit color),
   * the node SHALL receive the color at index (I % N) from the palette.
   */
  it('Property 1: Palette Color Cycling - colors cycle using modulo', () => {
    fc.assert(
      fc.property(
        // Generate a palette ID from available default palettes
        fc.constantFrom('a', 'b', 'c', 'd', 'none'),
        // Generate a node index (can be larger than palette size)
        fc.integer({ min: 0, max: 1000 }),
        (paletteId, nodeIndex) => {
          const palette = ColorPalettes.get(paletteId);
          
          // Palette should exist
          expect(palette).toBeTruthy();
          expect(palette.colors).toBeTruthy();
          expect(palette.colors.length).toBeGreaterThan(0);
          
          const color = ColorPalettes.getColorForIndex(paletteId, nodeIndex);
          const expectedColor = palette.colors[nodeIndex % palette.colors.length];
          
          // The returned color should match the expected cycled color
          expect(color).toBe(expectedColor);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (edge case): Palette cycling works for very large indices', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('a', 'b', 'c', 'd'),
        fc.integer({ min: 10000, max: 1000000 }),
        (paletteId, largeIndex) => {
          const palette = ColorPalettes.get(paletteId);
          const color = ColorPalettes.getColorForIndex(paletteId, largeIndex);
          const expectedColor = palette.colors[largeIndex % palette.colors.length];
          
          expect(color).toBe(expectedColor);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (edge case): Invalid palette returns fallback color', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['a', 'b', 'c', 'd', 'none'].includes(s)),
        fc.integer({ min: 0, max: 100 }),
        (invalidPaletteId, nodeIndex) => {
          const color = ColorPalettes.getColorForIndex(invalidPaletteId, nodeIndex);
          
          // Should return fallback gray color
          expect(color).toBe('#888888');
        }
      ),
      { numRuns: 100 }
    );
  });
});