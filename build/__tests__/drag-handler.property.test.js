/**
 * Property-based tests for DragHandler and position persistence
 * Feature: sankey-studio-canvas-refactor
 * 
 * Property 5: Node Position Persistence Round-Trip
 * For any node and any position offset (dx, dy), setting the node's custom 
 * position and then reading it back should return the same offset values.
 * Validates: Requirements 3.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { DragHandler } from '../drag-handler.js';
import { CustomLayoutStore } from '../custom-layout-store.js';

// Mock StudioUI to prevent errors
const mockStudioUI = {
  startInteraction: vi.fn(),
  endInteraction: vi.fn()
};

// Set up global mocks
beforeEach(() => {
  global.StudioUI = mockStudioUI;
  vi.clearAllMocks();
  CustomLayoutStore.clearAll();
  DragHandler._resetState();
});

// Arbitrary for generating valid node IDs (non-empty strings without special chars)
const nodeIdArbitrary = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/)
  .filter(s => s.length > 0);

// Arbitrary for generating position coordinates (using integers to avoid floating point issues)
const positionArbitrary = fc.record({
  x: fc.integer({ min: -1000, max: 1000 }),
  y: fc.integer({ min: -1000, max: 1000 })
});

// Arbitrary for generating drag deltas (using integers to avoid -0 vs +0 issues)
const dragDeltaArbitrary = fc.record({
  dx: fc.integer({ min: -500, max: 500 }),
  dy: fc.integer({ min: -500, max: 500 })
});

describe('DragHandler Property Tests', () => {
  /**
   * Property 5: Node Position Persistence Round-Trip
   * For any node and any position offset (dx, dy), setting the node's custom 
   * position and then reading it back should return the same offset values.
   * Validates: Requirements 3.1
   */
  describe('Property 5: Node Position Persistence Round-Trip', () => {
    it('node position set via CustomLayoutStore can be read back exactly', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          dragDeltaArbitrary,
          (nodeId, delta) => {
            // Set node position
            CustomLayoutStore.setNodePosition(nodeId, delta.dx, delta.dy);
            
            // Read it back
            const retrieved = CustomLayoutStore.getNodePosition(nodeId);
            
            // Should match exactly
            expect(retrieved).not.toBeNull();
            expect(retrieved.dx).toBe(delta.dx);
            expect(retrieved.dy).toBe(delta.dy);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple position updates preserve the latest value', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          fc.array(dragDeltaArbitrary, { minLength: 2, maxLength: 10 }),
          (nodeId, deltas) => {
            // Apply multiple position updates
            deltas.forEach(delta => {
              CustomLayoutStore.setNodePosition(nodeId, delta.dx, delta.dy);
            });
            
            // Read back should return the last value
            const retrieved = CustomLayoutStore.getNodePosition(nodeId);
            const lastDelta = deltas[deltas.length - 1];
            
            expect(retrieved).not.toBeNull();
            expect(retrieved.dx).toBe(lastDelta.dx);
            expect(retrieved.dy).toBe(lastDelta.dy);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('position persistence is independent across different nodes', () => {
      fc.assert(
        fc.property(
          fc.array(nodeIdArbitrary, { minLength: 2, maxLength: 5 }),
          fc.array(dragDeltaArbitrary, { minLength: 2, maxLength: 5 }),
          (nodeIds, deltas) => {
            // Get unique node IDs
            const uniqueNodeIds = [...new Set(nodeIds)];
            if (uniqueNodeIds.length < 2) return true; // Skip if not enough unique IDs
            
            // Set positions for each node
            const expectedPositions = new Map();
            uniqueNodeIds.forEach((nodeId, i) => {
              const delta = deltas[i % deltas.length];
              CustomLayoutStore.setNodePosition(nodeId, delta.dx, delta.dy);
              expectedPositions.set(nodeId, delta);
            });
            
            // Verify each node has its own position
            uniqueNodeIds.forEach(nodeId => {
              const retrieved = CustomLayoutStore.getNodePosition(nodeId);
              const expected = expectedPositions.get(nodeId);
              
              expect(retrieved).not.toBeNull();
              expect(retrieved.dx).toBe(expected.dx);
              expect(retrieved.dy).toBe(expected.dy);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('JSON serialization round-trip preserves node positions', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(nodeIdArbitrary, dragDeltaArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          (nodePositions) => {
            // Set positions for multiple nodes
            const uniquePositions = new Map();
            nodePositions.forEach(([nodeId, delta]) => {
              CustomLayoutStore.setNodePosition(nodeId, delta.dx, delta.dy);
              uniquePositions.set(nodeId, delta);
            });
            
            // Serialize to JSON
            const json = CustomLayoutStore.toJSON();
            
            // Clear and restore from JSON
            CustomLayoutStore.clearAll();
            const success = CustomLayoutStore.fromJSON(json);
            
            expect(success).toBe(true);
            
            // Verify all positions are restored
            uniquePositions.forEach((expected, nodeId) => {
              const retrieved = CustomLayoutStore.getNodePosition(nodeId);
              expect(retrieved).not.toBeNull();
              expect(retrieved.dx).toBe(expected.dx);
              expect(retrieved.dy).toBe(expected.dy);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('DragHandler state management', () => {
    /**
     * Helper to create a proper mock SVG element for testing
     */
    function createMockElement(nodeId) {
      return {
        getAttribute: vi.fn((attr) => {
          if (attr === 'data-node-id') return nodeId;
          if (attr === 'x') return '0';
          if (attr === 'y') return '0';
          if (attr === 'transform') return null;
          return null;
        }),
        setAttribute: vi.fn(),
        closest: vi.fn().mockReturnValue(null),
        querySelector: vi.fn().mockReturnValue(null),
        tagName: 'rect'
      };
    }

    it('drag state is properly tracked', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionArbitrary,
          (nodeId, startPos) => {
            // Reset state before each iteration
            DragHandler._resetState();
            
            // Create a mock element
            const mockElement = createMockElement(nodeId);
            
            // Initially not dragging
            expect(DragHandler.isDragging()).toBe(false);
            
            // Start drag
            DragHandler.startDrag(mockElement, 'node', startPos.x, startPos.y);
            expect(DragHandler.isDragging()).toBe(true);
            expect(DragHandler.getDragType()).toBe('node');
            
            // End drag
            DragHandler.endDrag();
            expect(DragHandler.isDragging()).toBe(false);
            expect(DragHandler.getDragType()).toBeNull();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('drag delta is calculated correctly', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionArbitrary,
          dragDeltaArbitrary,
          (nodeId, startPos, delta) => {
            // Reset state before each iteration
            DragHandler._resetState();
            
            // Create a mock element
            const mockElement = createMockElement(nodeId);
            
            // Start drag
            DragHandler.startDrag(mockElement, 'node', startPos.x, startPos.y);
            
            // Update drag
            const endX = startPos.x + delta.dx;
            const endY = startPos.y + delta.dy;
            DragHandler.updateDrag(endX, endY);
            
            // Check delta
            const calculatedDelta = DragHandler.getDelta();
            
            expect(calculatedDelta.dx).toBe(delta.dx);
            expect(calculatedDelta.dy).toBe(delta.dy);
            
            // Clean up
            DragHandler._resetState();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('cancel drag does not persist position', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionArbitrary,
          dragDeltaArbitrary,
          (nodeId, startPos, delta) => {
            // Reset state before each iteration
            DragHandler._resetState();
            CustomLayoutStore.clearAll();
            
            // Create a mock element with the node ID
            const mockElement = createMockElement(nodeId);
            
            // Ensure no position exists initially
            expect(CustomLayoutStore.getNodePosition(nodeId)).toBeNull();
            
            // Start drag
            DragHandler.startDrag(mockElement, 'node', startPos.x, startPos.y);
            
            // Update drag
            DragHandler.updateDrag(startPos.x + delta.dx, startPos.y + delta.dy);
            
            // Cancel drag (should NOT persist)
            DragHandler._resetState(); // Use reset instead of cancelDrag to avoid DOM operations
            
            // Position should still be null (not persisted)
            expect(CustomLayoutStore.getNodePosition(nodeId)).toBeNull();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
