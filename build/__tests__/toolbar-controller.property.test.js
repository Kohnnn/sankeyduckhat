/**
 * Property-based tests for ToolbarController tool behavior
 * Feature: sankey-studio-canvas-refactor, Property 17: Tool-Specific Behavior
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ToolbarController } from '../toolbar-controller.js';
import { StudioUI } from '../studio-ui.js';

// Valid tools for the ToolbarController
const validTools = ['select', 'pan', 'addNode', 'addFlow'];

// Arbitrary for generating valid tool names
const toolArbitrary = fc.constantFrom(...validTools);

// Mock DOM elements
const createMockToolbar = () => {
  const toolbar = document.createElement('div');
  toolbar.id = 'studio-toolbar';
  
  validTools.forEach(tool => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tool', tool);
    btn.setAttribute('aria-pressed', tool === 'select' ? 'true' : 'false');
    toolbar.appendChild(btn);
  });
  
  // Add action buttons
  ['undo', 'redo', 'export'].forEach(action => {
    const btn = document.createElement('button');
    btn.setAttribute('data-action', action);
    toolbar.appendChild(btn);
  });
  
  return toolbar;
};

const createMockCanvas = () => {
  const canvas = document.createElement('div');
  canvas.id = 'diagram-area';
  return canvas;
};

describe('ToolbarController Property Tests', () => {
  let mockToolbar;
  let mockCanvas;

  beforeEach(() => {
    // Reset StudioUI state
    StudioUI.reset();
    StudioUI._listeners = {};
    
    // Reset ToolbarController state
    ToolbarController._initialized = false;
    ToolbarController._toolbarElement = null;
    ToolbarController._canvasElement = null;
    ToolbarController._addFlowState = { firstNode: null, firstNodeElement: null };
    
    // Create mock DOM elements
    mockToolbar = createMockToolbar();
    mockCanvas = createMockCanvas();
    document.body.appendChild(mockToolbar);
    document.body.appendChild(mockCanvas);
    
    // Initialize ToolbarController
    ToolbarController.init(mockToolbar, mockCanvas);
  });

  afterEach(() => {
    // Clean up DOM
    if (mockToolbar && mockToolbar.parentNode) {
      mockToolbar.parentNode.removeChild(mockToolbar);
    }
    if (mockCanvas && mockCanvas.parentNode) {
      mockCanvas.parentNode.removeChild(mockCanvas);
    }
  });

  /**
   * Property 17: Tool-Specific Behavior
   * For any tool mode, the corresponding interaction behavior should be active:
   * - Select tool enables element selection
   * - Pan tool enables viewport panning
   * - Add Node tool enables node creation on click
   * - Add Flow tool enables flow creation between clicked nodes
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4
   */
  describe('Property 17: Tool-Specific Behavior', () => {
    
    /**
     * Requirement 10.1: Select tool enables element selection
     */
    it('Select tool enables selection (isSelectionEnabled returns true)', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool
          ToolbarController.setTool(tool);
          
          // Check if selection is enabled
          const selectionEnabled = ToolbarController.isSelectionEnabled();
          
          // Selection should only be enabled when Select tool is active
          if (tool === 'select') {
            expect(selectionEnabled).toBe(true);
          } else {
            expect(selectionEnabled).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 10.2: Pan tool enables viewport panning
     */
    it('Pan tool enables panning (isPanningEnabled returns true)', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool
          ToolbarController.setTool(tool);
          
          // Check if panning is enabled
          const panningEnabled = ToolbarController.isPanningEnabled();
          
          // Panning should only be enabled when Pan tool is active
          if (tool === 'pan') {
            expect(panningEnabled).toBe(true);
          } else {
            expect(panningEnabled).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 10.3: Add Node tool is active when selected
     */
    it('Add Node tool is correctly identified as active', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool
          ToolbarController.setTool(tool);
          
          // Check if Add Node tool is active
          const addNodeActive = ToolbarController.isToolActive('addNode');
          
          // Add Node should only be active when addNode tool is selected
          if (tool === 'addNode') {
            expect(addNodeActive).toBe(true);
          } else {
            expect(addNodeActive).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 10.4: Add Flow tool is active when selected
     */
    it('Add Flow tool is correctly identified as active', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool
          ToolbarController.setTool(tool);
          
          // Check if Add Flow tool is active
          const addFlowActive = ToolbarController.isToolActive('addFlow');
          
          // Add Flow should only be active when addFlow tool is selected
          if (tool === 'addFlow') {
            expect(addFlowActive).toBe(true);
          } else {
            expect(addFlowActive).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Tool switching updates StudioUI.currentTool
     */
    it('setTool updates StudioUI.currentTool to match', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool via ToolbarController
          ToolbarController.setTool(tool);
          
          // StudioUI should have the same tool
          expect(StudioUI.currentTool).toBe(tool);
          
          // getCurrentTool should return the same value
          expect(ToolbarController.getCurrentTool()).toBe(tool);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Tool switching updates toolbar button active states
     */
    it('setTool updates toolbar button active states', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool
          ToolbarController.setTool(tool);
          
          // Check button states
          const buttons = mockToolbar.querySelectorAll('[data-tool]');
          buttons.forEach(btn => {
            const btnTool = btn.getAttribute('data-tool');
            if (btnTool === tool) {
              expect(btn.classList.contains('active')).toBe(true);
              expect(btn.getAttribute('aria-pressed')).toBe('true');
            } else {
              expect(btn.classList.contains('active')).toBe(false);
              expect(btn.getAttribute('aria-pressed')).toBe('false');
            }
          });
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Tool switching updates canvas cursor
     */
    it('setTool updates canvas cursor based on tool', () => {
      const expectedCursors = {
        select: 'default',
        pan: 'grab',
        addNode: 'crosshair',
        addFlow: 'crosshair'
      };

      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool
          ToolbarController.setTool(tool);
          
          // Check cursor
          expect(mockCanvas.style.cursor).toBe(expectedCursors[tool]);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Tool switching sets data-tool attribute on canvas
     */
    it('setTool sets data-tool attribute on canvas', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool
          ToolbarController.setTool(tool);
          
          // Check data-tool attribute
          expect(mockCanvas.getAttribute('data-tool')).toBe(tool);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Sequential tool changes maintain correct state
     */
    it('sequential tool changes maintain correct state', () => {
      fc.assert(
        fc.property(fc.array(toolArbitrary, { minLength: 1, maxLength: 20 }), (tools) => {
          // Apply sequence of tool changes
          tools.forEach(tool => ToolbarController.setTool(tool));
          
          // Final state should match last tool
          const lastTool = tools[tools.length - 1];
          expect(ToolbarController.getCurrentTool()).toBe(lastTool);
          expect(StudioUI.currentTool).toBe(lastTool);
          expect(ToolbarController.isToolActive(lastTool)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Invalid tools do not change state
     */
    it('invalid tools do not change current tool state', () => {
      fc.assert(
        fc.property(
          toolArbitrary,
          fc.string().filter(s => !validTools.includes(s) && s.length > 0),
          (validTool, invalidTool) => {
            // Set a valid tool first
            ToolbarController.setTool(validTool);
            const toolBefore = ToolbarController.getCurrentTool();
            
            // Attempt to set invalid tool
            ToolbarController.setTool(invalidTool);
            
            // Tool should remain unchanged
            expect(ToolbarController.getCurrentTool()).toBe(toolBefore);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Add Flow state resets when switching away from addFlow tool
     */
    it('switching away from addFlow tool resets flow state', () => {
      fc.assert(
        fc.property(
          toolArbitrary.filter(t => t !== 'addFlow'),
          (otherTool) => {
            // Set Add Flow tool and simulate first node selection
            ToolbarController.setTool('addFlow');
            ToolbarController._addFlowState.firstNode = 'TestNode';
            ToolbarController._addFlowState.firstNodeElement = document.createElement('rect');
            
            // Switch to another tool
            ToolbarController.setTool(otherTool);
            
            // Flow state should be reset
            expect(ToolbarController._addFlowState.firstNode).toBe(null);
            expect(ToolbarController._addFlowState.firstNodeElement).toBe(null);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Only one tool can be active at a time
     */
    it('only one tool is active at any time', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Set the tool
          ToolbarController.setTool(tool);
          
          // Count active tools
          let activeCount = 0;
          validTools.forEach(t => {
            if (ToolbarController.isToolActive(t)) {
              activeCount++;
            }
          });
          
          // Exactly one tool should be active
          expect(activeCount).toBe(1);
        }),
        { numRuns: 100 }
      );
    });
  });
});
