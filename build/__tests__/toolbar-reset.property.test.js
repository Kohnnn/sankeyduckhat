/**
 * Property-based tests for Toolbar Reset Functionality
 * Feature: ui-improvements-and-ai-enhancement
 * 
 * Property 6: Reset Nodes Restores Calculated Positions
 * Property 7: Reset Labels Restores Default Positions
 * Validates: Requirements 2.6, 2.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ToolbarController } from '../toolbar-controller.js';

// Mock globals
const createMockEnvironment = () => {
  const rememberedMoves = new Map();
  const rememberedLabelMoves = new Map();
  const customLayout = {};
  const nodeCustomizations = {};
  
  return {
    rememberedMoves,
    rememberedLabelMoves,
    customLayout,
    nodeCustomizations,
    process_sankey: vi.fn(),
    renderDiagram: vi.fn(),
    updateAIStatus: vi.fn(),
    CustomLayoutStore: {
      clearAllNodePositions: vi.fn(),
      clearAllLabelPositions: vi.fn()
    }
  };
};

describe('Toolbar Reset Functionality', () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = createMockEnvironment();
    
    // Setup global mocks
    global.window = {
      rememberedMoves: mockEnv.rememberedMoves,
      rememberedLabelMoves: mockEnv.rememberedLabelMoves
    };
    global.customLayout = mockEnv.customLayout;
    global.nodeCustomizations = mockEnv.nodeCustomizations;
    global.process_sankey = mockEnv.process_sankey;
    global.renderDiagram = mockEnv.renderDiagram;
    global.updateAIStatus = mockEnv.updateAIStatus;
    global.CustomLayoutStore = mockEnv.CustomLayoutStore;
    
    // Reset ToolbarController state
    ToolbarController._initialized = false;
    ToolbarController._toolbarElement = null;
    ToolbarController._canvasElement = null;
  });

  describe('Property 6: Reset Nodes Restores Calculated Positions', () => {
    /**
     * Feature: ui-improvements-and-ai-enhancement, Property 6: Reset Nodes Restores Calculated Positions
     * For any set of moved nodes, clicking Reset Nodes SHALL clear all position offsets
     * and restore nodes to their sankey-calculated positions.
     */
    it('clears all node position offsets when reset', () => {
      fc.assert(
        fc.property(
          // Generate random node names and positions
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              dx: fc.integer({ min: -500, max: 500 }),
              dy: fc.integer({ min: -500, max: 500 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (nodes) => {
            // Setup: populate rememberedMoves and customLayout with random positions
            nodes.forEach(node => {
              mockEnv.rememberedMoves.set(node.name, [node.dx, node.dy]);
              mockEnv.customLayout[node.name] = { dx: node.dx, dy: node.dy };
            });

            // Verify state is populated
            expect(mockEnv.rememberedMoves.size).toBeGreaterThan(0);
            expect(Object.keys(mockEnv.customLayout).length).toBeGreaterThan(0);

            // Execute reset
            ToolbarController._handleResetNodes();

            // Verify all node positions are cleared
            expect(mockEnv.rememberedMoves.size).toBe(0);
            
            // Verify customLayout dx/dy are cleared
            Object.values(mockEnv.customLayout).forEach(layout => {
              expect(layout.dx).toBeUndefined();
              expect(layout.dy).toBeUndefined();
            });

            // Verify re-render was triggered
            expect(mockEnv.process_sankey).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Reset Labels Restores Default Positions', () => {
    /**
     * Feature: ui-improvements-and-ai-enhancement, Property 7: Reset Labels Restores Default Positions
     * For any set of moved labels, clicking Reset Labels SHALL clear all label position offsets
     * and restore labels to their default positions relative to nodes.
     */
    it('clears all label position offsets when reset', () => {
      fc.assert(
        fc.property(
          // Generate random node names and label positions
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              labelX: fc.integer({ min: -200, max: 200 }),
              labelY: fc.integer({ min: -200, max: 200 }),
              labelText: fc.string({ minLength: 0, maxLength: 50 }),
              labelColor: fc.hexaString({ minLength: 6, maxLength: 6 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (nodes) => {
            // Setup: populate rememberedLabelMoves and nodeCustomizations
            nodes.forEach(node => {
              mockEnv.rememberedLabelMoves.set(node.name, [node.labelX, node.labelY]);
              mockEnv.nodeCustomizations[node.name] = {
                labelX: node.labelX,
                labelY: node.labelY,
                labelText: node.labelText,
                labelColor: '#' + node.labelColor,
                fillColor: '#ffffff' // Node setting that should be preserved
              };
              mockEnv.customLayout[node.name] = {
                originalX: 100,
                originalY: 100
              };
            });

            // Verify state is populated
            expect(mockEnv.rememberedLabelMoves.size).toBeGreaterThan(0);

            // Execute reset
            ToolbarController._handleResetLabels();

            // Verify all label positions are cleared
            expect(mockEnv.rememberedLabelMoves.size).toBe(0);
            
            // Verify label customizations are cleared but node settings preserved
            Object.values(mockEnv.nodeCustomizations).forEach(custom => {
              expect(custom.labelX).toBeUndefined();
              expect(custom.labelY).toBeUndefined();
              expect(custom.labelText).toBeUndefined();
              expect(custom.labelColor).toBeUndefined();
              // Node settings should be preserved
              expect(custom.fillColor).toBe('#ffffff');
            });

            // Verify customLayout originalX/Y are cleared
            Object.values(mockEnv.customLayout).forEach(layout => {
              expect(layout.originalX).toBeUndefined();
              expect(layout.originalY).toBeUndefined();
            });

            // Verify re-render was triggered
            expect(mockEnv.process_sankey).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('preserves node appearance settings when resetting labels', () => {
      // Setup: create node with both node and label customizations
      mockEnv.nodeCustomizations['TestNode'] = {
        fillColor: '#ff0000',
        borderColor: '#000000',
        opacity: 80,
        labelX: 50,
        labelY: 30,
        labelText: 'Custom Label'
      };
      mockEnv.rememberedLabelMoves.set('TestNode', [50, 30]);

      // Execute reset
      ToolbarController._handleResetLabels();

      // Verify node settings are preserved
      expect(mockEnv.nodeCustomizations['TestNode'].fillColor).toBe('#ff0000');
      expect(mockEnv.nodeCustomizations['TestNode'].borderColor).toBe('#000000');
      expect(mockEnv.nodeCustomizations['TestNode'].opacity).toBe(80);

      // Verify label settings are cleared
      expect(mockEnv.nodeCustomizations['TestNode'].labelX).toBeUndefined();
      expect(mockEnv.nodeCustomizations['TestNode'].labelY).toBeUndefined();
      expect(mockEnv.nodeCustomizations['TestNode'].labelText).toBeUndefined();
    });
  });

  describe('Reset triggers re-render', () => {
    it('triggers process_sankey after reset nodes', () => {
      mockEnv.rememberedMoves.set('Node1', [10, 20]);
      
      ToolbarController._handleResetNodes();
      
      expect(mockEnv.process_sankey).toHaveBeenCalled();
    });

    it('triggers process_sankey after reset labels', () => {
      mockEnv.rememberedLabelMoves.set('Node1', [10, 20]);
      
      ToolbarController._handleResetLabels();
      
      expect(mockEnv.process_sankey).toHaveBeenCalled();
    });
  });
});
