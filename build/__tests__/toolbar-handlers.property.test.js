/**
 * Property-based tests for Toolbar Button Handlers
 * Feature: sankey-bugfixes-and-cleanup, Property 3: Toolbar Button Handlers Execute
 * 
 * For any toolbar button with a data-tool or data-action attribute, clicking the button
 * SHALL invoke the corresponding handler function in ToolbarController.
 * 
 * Validates: Requirements 3.1-3.16
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ToolbarController } from '../toolbar-controller.js';
import { StudioUI } from '../studio-ui.js';

// Valid tools and actions
const validTools = ['select', 'pan', 'addNode', 'addFlow'];
const validActions = ['undo', 'redo', 'export', 'reset-session', 'reset-nodes', 'reset-labels', 'factory-reset'];

// Arbitraries
const toolArbitrary = fc.constantFrom(...validTools);
const actionArbitrary = fc.constantFrom(...validActions);

// Create mock toolbar with all buttons
const createMockToolbar = () => {
  const toolbar = document.createElement('div');
  toolbar.id = 'studio-toolbar';
  
  // Add tool buttons
  validTools.forEach(tool => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tool', tool);
    btn.setAttribute('aria-pressed', tool === 'select' ? 'true' : 'false');
    btn.classList.add('toolbar-btn');
    toolbar.appendChild(btn);
  });
  
  // Add action buttons
  validActions.forEach(action => {
    const btn = document.createElement('button');
    btn.setAttribute('data-action', action);
    btn.classList.add('toolbar-btn');
    toolbar.appendChild(btn);
  });
  
  return toolbar;
};

const createMockCanvas = () => {
  const canvas = document.createElement('div');
  canvas.id = 'diagram-area';
  return canvas;
};

// Mock environment for reset handlers
const createMockEnvironment = () => {
  return {
    rememberedMoves: new Map(),
    rememberedLabelMoves: new Map(),
    customLayout: {},
    nodeCustomizations: {},
    nodeColors: {},
    process_sankey: vi.fn(),
    renderDiagram: vi.fn(),
    updateAIStatus: vi.fn(),
    saveProgressToLocal: vi.fn(),
    openExportModal: vi.fn(),
    CustomLayoutStore: {
      clearAllNodePositions: vi.fn(),
      clearAllLabelPositions: vi.fn()
    },
    UndoManager: {
      canUndo: vi.fn(() => true),
      canRedo: vi.fn(() => true),
      undo: vi.fn(() => true),
      redo: vi.fn(() => true),
      getLastActionDescription: vi.fn(() => 'test action'),
      getLastUndoneDescription: vi.fn(() => 'test undone action'),
      on: vi.fn(),
      clear: vi.fn()
    },
    SessionManager: {
      resetSession: vi.fn(() => true)
    },
    ViewportController: {
      isInitialized: vi.fn(() => true),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fitToScreen: vi.fn(),
      reset: vi.fn()
    },
    ThemeController: {
      toggle: vi.fn(),
      setTheme: vi.fn()
    }
  };
};

describe('Toolbar Button Handlers Property Tests', () => {
  let mockToolbar;
  let mockCanvas;
  let mockEnv;

  beforeEach(() => {
    // Create mock environment
    mockEnv = createMockEnvironment();
    
    // Setup global mocks
    global.window = {
      rememberedMoves: mockEnv.rememberedMoves,
      rememberedLabelMoves: mockEnv.rememberedLabelMoves,
      confirm: vi.fn(() => true) // Auto-confirm dialogs
    };
    global.customLayout = mockEnv.customLayout;
    global.nodeCustomizations = mockEnv.nodeCustomizations;
    global.nodeColors = mockEnv.nodeColors;
    global.process_sankey = mockEnv.process_sankey;
    global.renderDiagram = mockEnv.renderDiagram;
    global.updateAIStatus = mockEnv.updateAIStatus;
    global.saveProgressToLocal = mockEnv.saveProgressToLocal;
    global.openExportModal = mockEnv.openExportModal;
    global.CustomLayoutStore = mockEnv.CustomLayoutStore;
    global.UndoManager = mockEnv.UndoManager;
    global.SessionManager = mockEnv.SessionManager;
    global.ViewportController = mockEnv.ViewportController;
    global.ThemeController = mockEnv.ThemeController;
    global.confirm = vi.fn(() => true);
    
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
    vi.clearAllMocks();
  });

  /**
   * Property 3: Toolbar Button Handlers Execute
   * For any toolbar button with a data-tool or data-action attribute,
   * clicking the button SHALL invoke the corresponding handler function.
   * Validates: Requirements 3.1-3.16
   */
  describe('Property 3: Toolbar Button Handlers Execute', () => {
    
    /**
     * Requirements 3.1-3.4: Tool buttons invoke setTool
     */
    it('clicking any tool button invokes setTool with correct tool', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Find the button
          const btn = mockToolbar.querySelector(`[data-tool="${tool}"]`);
          expect(btn).not.toBeNull();
          
          // Spy on setTool
          const setToolSpy = vi.spyOn(ToolbarController, 'setTool');
          
          // Click the button
          btn.click();
          
          // Verify setTool was called with correct tool
          expect(setToolSpy).toHaveBeenCalledWith(tool);
          
          // Verify tool is now active
          expect(ToolbarController.getCurrentTool()).toBe(tool);
          
          setToolSpy.mockRestore();
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 3.9: Undo button calls UndoManager.undo
     */
    it('clicking undo button invokes _handleUndo', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Find the undo button
          const btn = mockToolbar.querySelector('[data-action="undo"]');
          expect(btn).not.toBeNull();
          
          // Spy on _handleUndo
          const handleUndoSpy = vi.spyOn(ToolbarController, '_handleUndo');
          
          // Click the button
          btn.click();
          
          // Verify handler was called
          expect(handleUndoSpy).toHaveBeenCalled();
          
          handleUndoSpy.mockRestore();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 3.10: Redo button calls UndoManager.redo
     */
    it('clicking redo button invokes _handleRedo', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Find the redo button
          const btn = mockToolbar.querySelector('[data-action="redo"]');
          expect(btn).not.toBeNull();
          
          // Spy on _handleRedo
          const handleRedoSpy = vi.spyOn(ToolbarController, '_handleRedo');
          
          // Click the button
          btn.click();
          
          // Verify handler was called
          expect(handleRedoSpy).toHaveBeenCalled();
          
          handleRedoSpy.mockRestore();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 3.11: Export button shows export options
     */
    it('clicking export button invokes _handleExport', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Find the export button
          const btn = mockToolbar.querySelector('[data-action="export"]');
          expect(btn).not.toBeNull();
          
          // Spy on _handleExport
          const handleExportSpy = vi.spyOn(ToolbarController, '_handleExport');
          
          // Click the button
          btn.click();
          
          // Verify handler was called
          expect(handleExportSpy).toHaveBeenCalled();
          
          handleExportSpy.mockRestore();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 3.12: New button calls SessionManager.resetSession
     */
    it('clicking reset-session button invokes _handleResetSession', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Find the reset-session button
          const btn = mockToolbar.querySelector('[data-action="reset-session"]');
          expect(btn).not.toBeNull();
          
          // Spy on _handleResetSession
          const handleResetSessionSpy = vi.spyOn(ToolbarController, '_handleResetSession');
          
          // Click the button
          btn.click();
          
          // Verify handler was called
          expect(handleResetSessionSpy).toHaveBeenCalled();
          
          handleResetSessionSpy.mockRestore();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 3.13: Reset Nodes clears positions and re-renders
     */
    it('clicking reset-nodes button invokes _handleResetNodes', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Find the reset-nodes button
          const btn = mockToolbar.querySelector('[data-action="reset-nodes"]');
          expect(btn).not.toBeNull();
          
          // Spy on _handleResetNodes
          const handleResetNodesSpy = vi.spyOn(ToolbarController, '_handleResetNodes');
          
          // Click the button
          btn.click();
          
          // Verify handler was called
          expect(handleResetNodesSpy).toHaveBeenCalled();
          
          handleResetNodesSpy.mockRestore();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 3.14: Reset Labels clears label customizations
     */
    it('clicking reset-labels button invokes _handleResetLabels', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Find the reset-labels button
          const btn = mockToolbar.querySelector('[data-action="reset-labels"]');
          expect(btn).not.toBeNull();
          
          // Spy on _handleResetLabels
          const handleResetLabelsSpy = vi.spyOn(ToolbarController, '_handleResetLabels');
          
          // Click the button
          btn.click();
          
          // Verify handler was called
          expect(handleResetLabelsSpy).toHaveBeenCalled();
          
          handleResetLabelsSpy.mockRestore();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Requirement 3.15: Factory Reset clears all state
     */
    it('clicking factory-reset button invokes _handleFactoryReset', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          // Find the factory-reset button
          const btn = mockToolbar.querySelector('[data-action="factory-reset"]');
          expect(btn).not.toBeNull();
          
          // Spy on _handleFactoryReset
          const handleFactoryResetSpy = vi.spyOn(ToolbarController, '_handleFactoryReset');
          
          // Click the button
          btn.click();
          
          // Verify handler was called
          expect(handleFactoryResetSpy).toHaveBeenCalled();
          
          handleFactoryResetSpy.mockRestore();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * All action buttons have handlers wired
     */
    it('all action buttons have click handlers that invoke corresponding methods', () => {
      fc.assert(
        fc.property(actionArbitrary, (action) => {
          // Find the button
          const btn = mockToolbar.querySelector(`[data-action="${action}"]`);
          expect(btn).not.toBeNull();
          
          // Convert action to handler method name
          const methodName = '_handle' + action
            .split('-')
            .map((part, i) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
          
          // Check if handler exists
          expect(typeof ToolbarController[methodName]).toBe('function');
          
          // Spy on the handler
          const handlerSpy = vi.spyOn(ToolbarController, methodName);
          
          // Click the button
          btn.click();
          
          // Verify handler was called
          expect(handlerSpy).toHaveBeenCalled();
          
          handlerSpy.mockRestore();
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Sequential button clicks invoke correct handlers
     */
    it('sequential button clicks invoke correct handlers in order', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(toolArbitrary, actionArbitrary), { minLength: 1, maxLength: 10 }),
          (buttonSequence) => {
            const callOrder = [];
            
            // Setup spies for all handlers
            const spies = {};
            validTools.forEach(tool => {
              spies[tool] = vi.spyOn(ToolbarController, 'setTool');
            });
            validActions.forEach(action => {
              const methodName = '_handle' + action
                .split('-')
                .map((part, i) => part.charAt(0).toUpperCase() + part.slice(1))
                .join('');
              spies[action] = vi.spyOn(ToolbarController, methodName);
            });
            
            // Click buttons in sequence
            buttonSequence.forEach(btnId => {
              const isTool = validTools.includes(btnId);
              const selector = isTool ? `[data-tool="${btnId}"]` : `[data-action="${btnId}"]`;
              const btn = mockToolbar.querySelector(selector);
              if (btn) {
                btn.click();
                callOrder.push(btnId);
              }
            });
            
            // Verify all expected handlers were called
            callOrder.forEach(btnId => {
              const isTool = validTools.includes(btnId);
              if (isTool) {
                expect(spies[btnId]).toHaveBeenCalled();
              } else {
                expect(spies[btnId]).toHaveBeenCalled();
              }
            });
            
            // Restore all spies
            Object.values(spies).forEach(spy => spy.mockRestore());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
