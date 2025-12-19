/**
 * Property-based tests for CustomLayoutStore
 * Feature: sankey-studio-canvas-refactor
 * 
 * Property 6: Label Position Independence
 * For any node with an associated label, moving the node should not change 
 * the label's stored position, and moving the label should not change the 
 * node's stored position.
 * Validates: Requirements 3.2, 5.2, 5.3, 5.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CustomLayoutStore } from '../custom-layout-store.js';

// Arbitrary for generating valid node IDs (non-empty strings)
const nodeIdArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

// Arbitrary for generating position offsets
const positionOffsetArbitrary = fc.record({
  dx: fc.double({ min: -1000, max: 1000, noNaN: true }),
  dy: fc.double({ min: -1000, max: 1000, noNaN: true })
});

// Arbitrary for generating absolute positions
const absolutePositionArbitrary = fc.record({
  x: fc.double({ min: 0, max: 2000, noNaN: true }),
  y: fc.double({ min: 0, max: 2000, noNaN: true })
});

describe('CustomLayoutStore Property Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    CustomLayoutStore.clearAll();
  });

  /**
   * Property 6: Label Position Independence
   * For any node with an associated label, moving the node should not change 
   * the label's stored position, and moving the label should not change the 
   * node's stored position.
   * Validates: Requirements 3.2, 5.2, 5.3, 5.6
   */
  describe('Property 6: Label Position Independence', () => {
    it('moving a node does not affect the label position', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          absolutePositionArbitrary,
          positionOffsetArbitrary,
          positionOffsetArbitrary,
          (nodeId, labelPos, nodeOffset1, nodeOffset2) => {
            // Set initial label position
            CustomLayoutStore.setLabelPosition(nodeId, labelPos.x, labelPos.y);
            const labelPosBefore = CustomLayoutStore.getLabelPosition(nodeId);
            
            // Move the node (first move)
            CustomLayoutStore.setNodePosition(nodeId, nodeOffset1.dx, nodeOffset1.dy);
            
            // Label position should be unchanged
            const labelPosAfterMove1 = CustomLayoutStore.getLabelPosition(nodeId);
            expect(labelPosAfterMove1).toEqual(labelPosBefore);
            
            // Move the node again (second move)
            CustomLayoutStore.setNodePosition(nodeId, nodeOffset2.dx, nodeOffset2.dy);
            
            // Label position should still be unchanged
            const labelPosAfterMove2 = CustomLayoutStore.getLabelPosition(nodeId);
            expect(labelPosAfterMove2).toEqual(labelPosBefore);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('moving a label does not affect the node position', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionOffsetArbitrary,
          absolutePositionArbitrary,
          absolutePositionArbitrary,
          (nodeId, nodeOffset, labelPos1, labelPos2) => {
            // Set initial node position
            CustomLayoutStore.setNodePosition(nodeId, nodeOffset.dx, nodeOffset.dy);
            const nodePosBefore = CustomLayoutStore.getNodePosition(nodeId);
            
            // Move the label (first move)
            CustomLayoutStore.setLabelPosition(nodeId, labelPos1.x, labelPos1.y);
            
            // Node position should be unchanged
            const nodePosAfterMove1 = CustomLayoutStore.getNodePosition(nodeId);
            expect(nodePosAfterMove1).toEqual(nodePosBefore);
            
            // Move the label again (second move)
            CustomLayoutStore.setLabelPosition(nodeId, labelPos2.x, labelPos2.y);
            
            // Node position should still be unchanged
            const nodePosAfterMove2 = CustomLayoutStore.getNodePosition(nodeId);
            expect(nodePosAfterMove2).toEqual(nodePosBefore);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('node and label positions are stored independently for multiple nodes', () => {
      fc.assert(
        fc.property(
          fc.array(nodeIdArbitrary, { minLength: 2, maxLength: 10 }),
          fc.array(positionOffsetArbitrary, { minLength: 2, maxLength: 10 }),
          fc.array(absolutePositionArbitrary, { minLength: 2, maxLength: 10 }),
          (nodeIds, nodeOffsets, labelPositions) => {
            // Use unique node IDs
            const uniqueNodeIds = [...new Set(nodeIds)];
            if (uniqueNodeIds.length < 2) return true; // Skip if not enough unique IDs
            
            // Set positions for all nodes and labels
            uniqueNodeIds.forEach((nodeId, i) => {
              const nodeOffset = nodeOffsets[i % nodeOffsets.length];
              const labelPos = labelPositions[i % labelPositions.length];
              CustomLayoutStore.setNodePosition(nodeId, nodeOffset.dx, nodeOffset.dy);
              CustomLayoutStore.setLabelPosition(nodeId, labelPos.x, labelPos.y);
            });
            
            // Store original positions
            const originalPositions = uniqueNodeIds.map(nodeId => ({
              nodeId,
              nodePos: CustomLayoutStore.getNodePosition(nodeId),
              labelPos: CustomLayoutStore.getLabelPosition(nodeId)
            }));
            
            // Move only the first node
            const newNodeOffset = { dx: 999, dy: 888 };
            CustomLayoutStore.setNodePosition(uniqueNodeIds[0], newNodeOffset.dx, newNodeOffset.dy);
            
            // Verify: first node's position changed, but its label and all other positions unchanged
            uniqueNodeIds.forEach((nodeId, i) => {
              const currentNodePos = CustomLayoutStore.getNodePosition(nodeId);
              const currentLabelPos = CustomLayoutStore.getLabelPosition(nodeId);
              
              if (i === 0) {
                // First node's position should have changed
                expect(currentNodePos).toEqual(newNodeOffset);
              } else {
                // Other nodes' positions should be unchanged
                expect(currentNodePos).toEqual(originalPositions[i].nodePos);
              }
              
              // All label positions should be unchanged
              expect(currentLabelPos).toEqual(originalPositions[i].labelPos);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('clearing node position does not affect label position', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionOffsetArbitrary,
          absolutePositionArbitrary,
          (nodeId, nodeOffset, labelPos) => {
            // Set both positions
            CustomLayoutStore.setNodePosition(nodeId, nodeOffset.dx, nodeOffset.dy);
            CustomLayoutStore.setLabelPosition(nodeId, labelPos.x, labelPos.y);
            
            // Clear node position
            CustomLayoutStore.clearNodePosition(nodeId);
            
            // Node position should be null
            expect(CustomLayoutStore.getNodePosition(nodeId)).toBeNull();
            
            // Label position should be unchanged
            expect(CustomLayoutStore.getLabelPosition(nodeId)).toEqual(labelPos);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('clearing label position does not affect node position', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionOffsetArbitrary,
          absolutePositionArbitrary,
          (nodeId, nodeOffset, labelPos) => {
            // Set both positions
            CustomLayoutStore.setNodePosition(nodeId, nodeOffset.dx, nodeOffset.dy);
            CustomLayoutStore.setLabelPosition(nodeId, labelPos.x, labelPos.y);
            
            // Clear label position
            CustomLayoutStore.clearLabelPosition(nodeId);
            
            // Label position should be null
            expect(CustomLayoutStore.getLabelPosition(nodeId)).toBeNull();
            
            // Node position should be unchanged
            expect(CustomLayoutStore.getNodePosition(nodeId)).toEqual(nodeOffset);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
