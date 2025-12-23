/**
 * Property-Based Tests for Flow Color Resolution
 * 
 * Feature: react-migration, Property 11: Flow Color Resolution
 * 
 * *For any* flow and any colorScheme setting ('source', 'target', or 'gradient'), 
 * the resolved flow color should be:
 * - The source node's color when colorScheme is 'source'
 * - The target node's color when colorScheme is 'target'
 * - A gradient from source to target when colorScheme is 'gradient'
 * - The flow's custom color override if specified (regardless of colorScheme)
 * 
 * **Validates: Requirements 8.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getFlowColor } from '../SankeyChart';
import { Flow } from '../../store/useDiagramStore';

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

/**
 * Generates a valid hex color string
 */
const arbitraryHexColor = (): fc.Arbitrary<string> =>
  fc.hexaString({ minLength: 6, maxLength: 6 }).map(hex => `#${hex}`);

/**
 * Generates a color scheme
 */
const arbitraryColorScheme = (): fc.Arbitrary<'source' | 'target' | 'gradient'> =>
  fc.constantFrom('source', 'target', 'gradient');

/**
 * Generates a flow with optional custom color
 */
const arbitraryFlow = (withCustomColor: boolean = false): fc.Arbitrary<Flow> =>
  fc.record({
    id: fc.uuid(),
    source: fc.string({ minLength: 1, maxLength: 20 }),
    target: fc.string({ minLength: 1, maxLength: 20 }),
    value: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
    color: withCustomColor ? arbitraryHexColor() : fc.constant(undefined),
    opacity: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  });

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: react-migration, Property 11: Flow Color Resolution', () => {
  
  describe('Custom color override takes precedence', () => {
    it('*For any* flow with a custom color, the resolved color should be the custom color regardless of colorScheme', () => {
      fc.assert(
        fc.property(
          arbitraryFlow(true),
          arbitraryHexColor(),
          arbitraryHexColor(),
          arbitraryColorScheme(),
          (flow, sourceColor, targetColor, colorScheme) => {
            const result = getFlowColor(flow, sourceColor, targetColor, colorScheme);
            
            // Custom color should always take precedence
            expect(result).toBe(flow.color);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Source color scheme', () => {
    it('*For any* flow without custom color and colorScheme "source", the resolved color should be the source node color', () => {
      fc.assert(
        fc.property(
          arbitraryFlow(false),
          arbitraryHexColor(),
          arbitraryHexColor(),
          (flow, sourceColor, targetColor) => {
            const result = getFlowColor(flow, sourceColor, targetColor, 'source');
            
            // Should return source color
            expect(result).toBe(sourceColor);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* flow without custom color and undefined source color, should return default color', () => {
      fc.assert(
        fc.property(
          arbitraryFlow(false),
          arbitraryHexColor(),
          (flow, targetColor) => {
            const result = getFlowColor(flow, undefined, targetColor, 'source');
            
            // Should return default gray color
            expect(result).toBe('#a0aec0');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Target color scheme', () => {
    it('*For any* flow without custom color and colorScheme "target", the resolved color should be the target node color', () => {
      fc.assert(
        fc.property(
          arbitraryFlow(false),
          arbitraryHexColor(),
          arbitraryHexColor(),
          (flow, sourceColor, targetColor) => {
            const result = getFlowColor(flow, sourceColor, targetColor, 'target');
            
            // Should return target color
            expect(result).toBe(targetColor);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* flow without custom color and undefined target color, should return default color', () => {
      fc.assert(
        fc.property(
          arbitraryFlow(false),
          arbitraryHexColor(),
          (flow, sourceColor) => {
            const result = getFlowColor(flow, sourceColor, undefined, 'target');
            
            // Should return default gray color
            expect(result).toBe('#a0aec0');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Gradient color scheme', () => {
    it('*For any* flow without custom color and colorScheme "gradient", the resolved color should be the source color (gradient handled in rendering)', () => {
      fc.assert(
        fc.property(
          arbitraryFlow(false),
          arbitraryHexColor(),
          arbitraryHexColor(),
          (flow, sourceColor, targetColor) => {
            const result = getFlowColor(flow, sourceColor, targetColor, 'gradient');
            
            // For gradient, we return source color (gradient is handled in SVG rendering)
            expect(result).toBe(sourceColor);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* flow without custom color and undefined source color in gradient mode, should return default color', () => {
      fc.assert(
        fc.property(
          arbitraryFlow(false),
          arbitraryHexColor(),
          (flow, targetColor) => {
            const result = getFlowColor(flow, undefined, targetColor, 'gradient');
            
            // Should return default gray color
            expect(result).toBe('#a0aec0');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Deterministic behavior', () => {
    it('*For any* identical inputs, getFlowColor should always return the same result', () => {
      fc.assert(
        fc.property(
          arbitraryFlow(false),
          fc.option(arbitraryHexColor(), { nil: undefined }),
          fc.option(arbitraryHexColor(), { nil: undefined }),
          arbitraryColorScheme(),
          (flow, sourceColor, targetColor, colorScheme) => {
            const result1 = getFlowColor(flow, sourceColor, targetColor, colorScheme);
            const result2 = getFlowColor(flow, sourceColor, targetColor, colorScheme);
            
            // Same inputs should always produce same output
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Return type validation', () => {
    it('*For any* inputs, getFlowColor should always return a valid color string', () => {
      fc.assert(
        fc.property(
          fc.oneof(arbitraryFlow(true), arbitraryFlow(false)),
          fc.option(arbitraryHexColor(), { nil: undefined }),
          fc.option(arbitraryHexColor(), { nil: undefined }),
          arbitraryColorScheme(),
          (flow, sourceColor, targetColor, colorScheme) => {
            const result = getFlowColor(flow, sourceColor, targetColor, colorScheme);
            
            // Result should be a non-empty string
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            
            // Result should be a valid hex color (starts with #)
            expect(result.startsWith('#')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
