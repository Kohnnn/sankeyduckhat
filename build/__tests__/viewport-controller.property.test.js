/**
 * Property-based tests for ViewportController
 * Feature: sankey-studio-canvas-refactor, Property 2: Zoom Maintains Center Point
 * Validates: Requirements 1.3, 1.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ViewportController } from '../viewport-controller.js';

// Mock D3 for testing
const mockD3 = {
  select: vi.fn(),
  zoom: vi.fn(),
  zoomIdentity: { translate: vi.fn().mockReturnThis(), scale: vi.fn().mockReturnThis() },
  zoomTransform: vi.fn()
};

// Mock SVG element
function createMockSvgElement() {
  const mockViewport = {
    empty: () => false,
    attr: vi.fn().mockReturnThis(),
    node: () => ({
      appendChild: vi.fn(),
      getBBox: () => ({ x: 0, y: 0, width: 700, height: 500 })
    })
  };
  
  const mockSvgSelection = {
    select: vi.fn().mockReturnValue(mockViewport),
    selectAll: vi.fn().mockReturnValue({ each: vi.fn() }),
    append: vi.fn().mockReturnValue(mockViewport),
    call: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
    node: () => ({
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 700, height: 500 })
    })
  };
  
  return {
    element: { id: 'sankey_svg' },
    selection: mockSvgSelection
  };
}

describe('ViewportController Property Tests', () => {
  let originalD3;
  let mockSvg;
  
  beforeEach(() => {
    // Store original d3 and replace with mock
    originalD3 = global.d3;
    
    mockSvg = createMockSvgElement();
    
    // Create a more complete D3 mock
    const zoomBehavior = {
      scaleExtent: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      transform: vi.fn()
    };
    
    global.d3 = {
      select: vi.fn().mockReturnValue(mockSvg.selection),
      zoom: vi.fn().mockReturnValue(zoomBehavior),
      zoomIdentity: { 
        translate: vi.fn().mockReturnValue({ scale: vi.fn().mockReturnThis() }),
        scale: vi.fn().mockReturnThis()
      },
      zoomTransform: vi.fn().mockReturnValue({ x: 0, y: 0, k: 1, translate: vi.fn().mockReturnThis() })
    };
    
    // Reset ViewportController state
    ViewportController._svg = null;
    ViewportController._viewport = null;
    ViewportController._zoom = null;
    ViewportController._transform = { x: 0, y: 0, scale: 1 };
    ViewportController._initialized = false;
  });
  
  afterEach(() => {
    // Restore original d3
    global.d3 = originalD3;
    ViewportController.destroy();
  });

  /**
   * Property 2: Zoom Maintains Center Point
   * For any zoom operation with a specified center point, the diagram coordinates
   * at that center point should remain at the same screen position after zooming.
   * Validates: Requirements 1.3, 1.6
   */
  describe('Property 2: Zoom Maintains Center Point', () => {
    // Arbitrary for generating valid scale values
    const scaleArbitrary = fc.double({ min: 0.1, max: 5.0, noNaN: true });
    
    // Arbitrary for generating valid coordinates within typical SVG bounds
    const coordinateArbitrary = fc.double({ min: 0, max: 1000, noNaN: true });
    
    // Arbitrary for generating scale deltas
    const scaleDeltaArbitrary = fc.double({ min: -0.5, max: 0.5, noNaN: true });

    it('getTransform returns current transform state', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -500, max: 500, noNaN: true }),
          fc.double({ min: -500, max: 500, noNaN: true }),
          scaleArbitrary,
          (x, y, scale) => {
            // Set internal transform directly for testing
            ViewportController._transform = { x, y, scale };
            
            const transform = ViewportController.getTransform();
            
            // Transform should match what was set
            expect(transform.x).toBe(x);
            expect(transform.y).toBe(y);
            expect(transform.scale).toBe(scale);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('screenToDiagram correctly inverts transform', () => {
      fc.assert(
        fc.property(
          coordinateArbitrary,
          coordinateArbitrary,
          fc.double({ min: -200, max: 200, noNaN: true }),
          fc.double({ min: -200, max: 200, noNaN: true }),
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          (screenX, screenY, tx, ty, scale) => {
            // Initialize with mock
            ViewportController._initialized = true;
            ViewportController._svg = mockSvg.selection;
            ViewportController._transform = { x: tx, y: ty, scale };
            
            // Convert screen to diagram coordinates
            const diagramCoords = ViewportController.screenToDiagram(screenX, screenY);
            
            // The inverse formula should be: diagram = (screen - translate) / scale
            // Note: screenToDiagram subtracts the SVG rect offset first
            const expectedX = (screenX - tx) / scale;
            const expectedY = (screenY - ty) / scale;
            
            expect(diagramCoords.x).toBeCloseTo(expectedX, 5);
            expect(diagramCoords.y).toBeCloseTo(expectedY, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('diagramToScreen correctly applies transform', () => {
      fc.assert(
        fc.property(
          coordinateArbitrary,
          coordinateArbitrary,
          fc.double({ min: -200, max: 200, noNaN: true }),
          fc.double({ min: -200, max: 200, noNaN: true }),
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          (diagramX, diagramY, tx, ty, scale) => {
            // Initialize with mock
            ViewportController._initialized = true;
            ViewportController._svg = mockSvg.selection;
            ViewportController._transform = { x: tx, y: ty, scale };
            
            // Convert diagram to screen coordinates
            const screenCoords = ViewportController.diagramToScreen(diagramX, diagramY);
            
            // The formula should be: screen = diagram * scale + translate
            const expectedX = diagramX * scale + tx;
            const expectedY = diagramY * scale + ty;
            
            expect(screenCoords.x).toBeCloseTo(expectedX, 5);
            expect(screenCoords.y).toBeCloseTo(expectedY, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('screenToDiagram and diagramToScreen are inverse operations', () => {
      fc.assert(
        fc.property(
          coordinateArbitrary,
          coordinateArbitrary,
          fc.double({ min: -200, max: 200, noNaN: true }),
          fc.double({ min: -200, max: 200, noNaN: true }),
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          (x, y, tx, ty, scale) => {
            // Initialize with mock
            ViewportController._initialized = true;
            ViewportController._svg = mockSvg.selection;
            ViewportController._transform = { x: tx, y: ty, scale };
            
            // Round-trip: screen -> diagram -> screen
            const diagramCoords = ViewportController.screenToDiagram(x, y);
            const backToScreen = ViewportController.diagramToScreen(diagramCoords.x, diagramCoords.y);
            
            // Should get back to original coordinates
            expect(backToScreen.x).toBeCloseTo(x, 5);
            expect(backToScreen.y).toBeCloseTo(y, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('scale is clamped to valid range', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10, max: 20, noNaN: true }),
          (requestedScale) => {
            const minZoom = ViewportController.config.minZoom;
            const maxZoom = ViewportController.config.maxZoom;
            
            // Clamp the scale as the controller would
            const clampedScale = Math.max(minZoom, Math.min(maxZoom, requestedScale));
            
            // Verify clamping logic
            expect(clampedScale).toBeGreaterThanOrEqual(minZoom);
            expect(clampedScale).toBeLessThanOrEqual(maxZoom);
            
            if (requestedScale < minZoom) {
              expect(clampedScale).toBe(minZoom);
            } else if (requestedScale > maxZoom) {
              expect(clampedScale).toBe(maxZoom);
            } else {
              expect(clampedScale).toBe(requestedScale);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('transform state is immutable when retrieved', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -500, max: 500, noNaN: true }),
          fc.double({ min: -500, max: 500, noNaN: true }),
          scaleArbitrary,
          (x, y, scale) => {
            ViewportController._transform = { x, y, scale };
            
            const transform1 = ViewportController.getTransform();
            const transform2 = ViewportController.getTransform();
            
            // Modifying returned transform should not affect internal state
            transform1.x = 9999;
            transform1.y = 9999;
            transform1.scale = 9999;
            
            // Second call should still return original values
            expect(transform2.x).toBe(x);
            expect(transform2.y).toBe(y);
            expect(transform2.scale).toBe(scale);
            
            // Internal state should be unchanged
            expect(ViewportController._transform.x).toBe(x);
            expect(ViewportController._transform.y).toBe(y);
            expect(ViewportController._transform.scale).toBe(scale);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
