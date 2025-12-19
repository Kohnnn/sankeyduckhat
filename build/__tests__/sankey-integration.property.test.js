/**
 * Property-based tests for SankeyIntegration
 * Feature: sankey-studio-canvas-refactor
 * 
 * Property 16: Sankey.js Position Source of Truth
 * For any node without custom positioning, its rendered position should exactly 
 * match the position calculated by sankey.js. For nodes with custom positioning, 
 * the rendered position should equal sankey.js position plus the custom offset.
 * Validates: Requirements 8.2, 8.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SankeyIntegration } from '../sankey-integration.js';
import { CustomLayoutStore } from '../custom-layout-store.js';

// Arbitrary for generating valid node IDs (non-empty strings)
const nodeIdArbitrary = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => s.trim().length > 0 && !s.includes(' '));

// Arbitrary for generating base positions (what sankey.js would calculate)
const basePositionArbitrary = fc.record({
  x: fc.double({ min: 0, max: 1000, noNaN: true }),
  y: fc.double({ min: 0, max: 1000, noNaN: true })
});

// Arbitrary for generating position offsets (custom layout adjustments)
const positionOffsetArbitrary = fc.record({
  dx: fc.double({ min: -500, max: 500, noNaN: true }),
  dy: fc.double({ min: -500, max: 500, noNaN: true })
});

// Arbitrary for generating label positions
const labelPositionArbitrary = fc.record({
  x: fc.double({ min: 0, max: 1000, noNaN: true }),
  y: fc.double({ min: 0, max: 1000, noNaN: true })
});

describe('SankeyIntegration Property Tests', () => {
  beforeEach(() => {
    // Reset both stores before each test
    SankeyIntegration.reset();
    CustomLayoutStore.clearAll();
    
    // Initialize SankeyIntegration
    SankeyIntegration._initialized = true;
  });

  /**
   * Property 16: Sankey.js Position Source of Truth
   * For any node without custom positioning, its rendered position should exactly 
   * match the position calculated by sankey.js. For nodes with custom positioning, 
   * the rendered position should equal sankey.js position plus the custom offset.
   * Validates: Requirements 8.2, 8.3
   */
  describe('Property 16: Sankey.js Position Source of Truth', () => {
    it('nodes without custom positioning have final position equal to base position', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          basePositionArbitrary,
          (nodeId, basePos) => {
            // Simulate sankey.js calculating a base position
            SankeyIntegration._basePositions.set(nodeId, { 
              x: basePos.x, 
              y: basePos.y, 
              type: 'node' 
            });
            
            // No custom position set in CustomLayoutStore
            // (CustomLayoutStore is already cleared in beforeEach)
            
            // Get final position
            const finalPos = SankeyIntegration.getFinalPosition(nodeId);
            
            // Final position should exactly match base position
            expect(finalPos).not.toBeNull();
            expect(finalPos.x).toBeCloseTo(basePos.x, 5);
            expect(finalPos.y).toBeCloseTo(basePos.y, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('nodes with custom positioning have final position equal to base plus offset', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          basePositionArbitrary,
          positionOffsetArbitrary,
          (nodeId, basePos, offset) => {
            // Simulate sankey.js calculating a base position
            SankeyIntegration._basePositions.set(nodeId, { 
              x: basePos.x, 
              y: basePos.y, 
              type: 'node' 
            });
            
            // Set custom position offset
            CustomLayoutStore.setNodePosition(nodeId, offset.dx, offset.dy);
            
            // Get final position
            const finalPos = SankeyIntegration.getFinalPosition(nodeId);
            
            // Final position should be base + offset
            const expectedX = basePos.x + offset.dx;
            const expectedY = basePos.y + offset.dy;
            
            expect(finalPos).not.toBeNull();
            expect(finalPos.x).toBeCloseTo(expectedX, 5);
            expect(finalPos.y).toBeCloseTo(expectedY, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifyNodePosition returns valid for nodes without custom positioning', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          basePositionArbitrary,
          (nodeId, basePos) => {
            // Simulate sankey.js calculating a base position
            SankeyIntegration._basePositions.set(nodeId, { 
              x: basePos.x, 
              y: basePos.y, 
              type: 'node' 
            });
            
            // Verify position
            const result = SankeyIntegration.verifyNodePosition(nodeId);
            
            // Should be valid with no custom offset
            expect(result.basePos).not.toBeNull();
            expect(result.finalPos).not.toBeNull();
            expect(result.customOffset).toBeNull();
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('verifyNodePosition returns valid for nodes with custom positioning', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          basePositionArbitrary,
          positionOffsetArbitrary,
          (nodeId, basePos, offset) => {
            // Simulate sankey.js calculating a base position
            SankeyIntegration._basePositions.set(nodeId, { 
              x: basePos.x, 
              y: basePos.y, 
              type: 'node' 
            });
            
            // Set custom position offset
            CustomLayoutStore.setNodePosition(nodeId, offset.dx, offset.dy);
            
            // Verify position
            const result = SankeyIntegration.verifyNodePosition(nodeId);
            
            // Should be valid with custom offset
            expect(result.basePos).not.toBeNull();
            expect(result.finalPos).not.toBeNull();
            expect(result.customOffset).not.toBeNull();
            expect(result.customOffset.dx).toBeCloseTo(offset.dx, 5);
            expect(result.customOffset.dy).toBeCloseTo(offset.dy, 5);
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('base position is preserved when custom offset is applied', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          basePositionArbitrary,
          positionOffsetArbitrary,
          (nodeId, basePos, offset) => {
            // Simulate sankey.js calculating a base position
            SankeyIntegration._basePositions.set(nodeId, { 
              x: basePos.x, 
              y: basePos.y, 
              type: 'node' 
            });
            
            // Get base position before applying custom offset
            const baseBefore = SankeyIntegration.getBasePosition(nodeId);
            
            // Set custom position offset
            CustomLayoutStore.setNodePosition(nodeId, offset.dx, offset.dy);
            
            // Get base position after applying custom offset
            const baseAfter = SankeyIntegration.getBasePosition(nodeId);
            
            // Base position should be unchanged (sankey.js is source of truth)
            expect(baseAfter.x).toBeCloseTo(baseBefore.x, 5);
            expect(baseAfter.y).toBeCloseTo(baseBefore.y, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('hasCustomPosition correctly identifies nodes with custom positioning', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          fc.array(nodeIdArbitrary, { minLength: 2, maxLength: 5 }),
          basePositionArbitrary,
          positionOffsetArbitrary,
          (targetNodeId, otherNodeIds, basePos, offset) => {
            // Ensure unique node IDs and exclude targetNodeId from others
            const uniqueOtherIds = [...new Set(otherNodeIds)]
              .filter(id => id !== targetNodeId && id.trim() !== targetNodeId.trim());
            if (uniqueOtherIds.length === 0) return true;
            
            // Clear any previous state
            SankeyIntegration.clearBasePositions();
            CustomLayoutStore.clearAll();
            
            // Set base positions for all nodes
            SankeyIntegration._basePositions.set(targetNodeId, { 
              x: basePos.x, 
              y: basePos.y, 
              type: 'node' 
            });
            uniqueOtherIds.forEach((id, i) => {
              SankeyIntegration._basePositions.set(id, { 
                x: basePos.x + i * 100, 
                y: basePos.y + i * 100, 
                type: 'node' 
              });
            });
            
            // Only set custom position for target node
            CustomLayoutStore.setNodePosition(targetNodeId, offset.dx, offset.dy);
            
            // Target node should have custom position
            expect(SankeyIntegration.hasCustomPosition(targetNodeId)).toBe(true);
            
            // Other nodes should not have custom position
            uniqueOtherIds.forEach(id => {
              expect(SankeyIntegration.hasCustomPosition(id)).toBe(false);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('labels have independent positioning from nodes', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          basePositionArbitrary,
          labelPositionArbitrary,
          positionOffsetArbitrary,
          (nodeId, basePos, labelPos, nodeOffset) => {
            // Set base positions
            SankeyIntegration._basePositions.set(nodeId, { 
              x: basePos.x, 
              y: basePos.y, 
              type: 'node' 
            });
            SankeyIntegration._basePositions.set(`label_${nodeId}`, { 
              x: labelPos.x, 
              y: labelPos.y, 
              type: 'label' 
            });
            
            // Set custom node position
            CustomLayoutStore.setNodePosition(nodeId, nodeOffset.dx, nodeOffset.dy);
            
            // Get label position (should be independent of node offset)
            const labelFinalPos = SankeyIntegration.getLabelFinalPosition(nodeId);
            const labelBasePos = SankeyIntegration.getLabelBasePosition(nodeId);
            
            // Label position should match its base (no custom label position set)
            expect(labelFinalPos.x).toBeCloseTo(labelBasePos.x, 5);
            expect(labelFinalPos.y).toBeCloseTo(labelBasePos.y, 5);
            
            // Node position should include offset
            const nodeFinalPos = SankeyIntegration.getFinalPosition(nodeId);
            expect(nodeFinalPos.x).toBeCloseTo(basePos.x + nodeOffset.dx, 5);
            expect(nodeFinalPos.y).toBeCloseTo(basePos.y + nodeOffset.dy, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('custom label positions override base positions', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          labelPositionArbitrary,
          labelPositionArbitrary,
          (nodeId, baseLabelPos, customLabelPos) => {
            // Set base label position
            SankeyIntegration._basePositions.set(`label_${nodeId}`, { 
              x: baseLabelPos.x, 
              y: baseLabelPos.y, 
              type: 'label' 
            });
            
            // Set custom label position
            CustomLayoutStore.setLabelPosition(nodeId, customLabelPos.x, customLabelPos.y);
            
            // Get final label position
            const labelFinalPos = SankeyIntegration.getLabelFinalPosition(nodeId);
            
            // Should use custom position, not base
            expect(labelFinalPos.x).toBeCloseTo(customLabelPos.x, 5);
            expect(labelFinalPos.y).toBeCloseTo(customLabelPos.y, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('clearing custom position reverts to base position', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          basePositionArbitrary,
          positionOffsetArbitrary,
          (nodeId, basePos, offset) => {
            // Set base position
            SankeyIntegration._basePositions.set(nodeId, { 
              x: basePos.x, 
              y: basePos.y, 
              type: 'node' 
            });
            
            // Set custom offset
            CustomLayoutStore.setNodePosition(nodeId, offset.dx, offset.dy);
            
            // Verify custom position is applied
            let finalPos = SankeyIntegration.getFinalPosition(nodeId);
            expect(finalPos.x).toBeCloseTo(basePos.x + offset.dx, 5);
            
            // Clear custom position
            CustomLayoutStore.clearNodePosition(nodeId);
            
            // Final position should now equal base position
            finalPos = SankeyIntegration.getFinalPosition(nodeId);
            expect(finalPos.x).toBeCloseTo(basePos.x, 5);
            expect(finalPos.y).toBeCloseTo(basePos.y, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
