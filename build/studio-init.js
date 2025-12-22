/**
 * StudioInit - Main entry point that wires all Studio modules together
 * Initializes StudioUI, ViewportController, SelectionManager, PropertiesPanelController,
 * ToolbarController, DragBehaviors, SelectionHandlers, and UndoManager on page load
 * 
 * Requirements: 2.1, 10.8
 * Task: 16.1 - Wire all modules together in main entry point
 */

const StudioInit = {
  _initialized: false,
  _svgElement: null,
  
  /**
   * Initialize all Studio modules in the correct order
   * Called on page load after DOM is ready
   */
  init() {
    if (this._initialized) {
      console.warn('StudioInit: Already initialized');
      return;
    }
    
    console.log('StudioInit: Initializing Sankey Studio modules...');
    
    // Get the main SVG element
    this._svgElement = document.getElementById('sankey_svg');
    
    if (!this._svgElement) {
      console.warn('StudioInit: SVG element not found, deferring initialization');
      return;
    }
    
    // Initialize modules in dependency order
    this._initStudioUI();
    this._initViewportController();
    this._initSelectionManager();
    this._initPropertiesPanelController();
    this._initToolbarController();
    this._initUndoManager();
    this._initDragBehaviors();
    this._initSelectionHandlers();
    this._initKeyboardShortcuts();
    this._initIndependentLabelsManager();
    
    // Wire up inter-module communication
    this._wireModuleCommunication();
    
    this._initialized = true;
    console.log('StudioInit: All modules initialized successfully');
  },
  
  /**
   * Initialize StudioUI manager
   * Requirement: 2.1 - create StudioUI manager object
   */
  _initStudioUI() {
    if (typeof StudioUI === 'undefined') {
      console.warn('StudioInit: StudioUI not available');
      return;
    }
    
    // StudioUI is already initialized as a singleton object
    // Reset to ensure clean state
    StudioUI.reset();
    console.log('StudioInit: StudioUI initialized');
  },
  
  /**
   * Initialize ViewportController for pan/zoom
   * Requirement: 1.1, 1.2, 1.3, 1.4
   */
  _initViewportController() {
    if (typeof ViewportController === 'undefined') {
      console.warn('StudioInit: ViewportController not available');
      return;
    }
    
    // ViewportController is initialized in initializeDiagram()
    // Just verify it's ready
    if (!ViewportController.isInitialized()) {
      ViewportController.init(this._svgElement);
    }
    console.log('StudioInit: ViewportController initialized');
  },
  
  /**
   * Initialize SelectionManager for element selection
   * Requirement: 2.2, 6.5
   */
  _initSelectionManager() {
    if (typeof SelectionManager === 'undefined') {
      console.warn('StudioInit: SelectionManager not available');
      return;
    }
    
    // SelectionManager is a singleton, reset to clean state
    SelectionManager.reset();
    console.log('StudioInit: SelectionManager initialized');
  },
  
  /**
   * Initialize PropertiesPanelController for context-sensitive properties
   * Requirement: 2.4, 4.3
   */
  _initPropertiesPanelController() {
    if (typeof PropertiesPanelController === 'undefined') {
      console.warn('StudioInit: PropertiesPanelController not available');
      return;
    }
    
    // Find the properties panel container
    const panelContainer = document.getElementById('properties-panel-content') ||
                          document.querySelector('.studio-properties-content') ||
                          document.querySelector('.properties-panel-content');
    
    if (panelContainer) {
      PropertiesPanelController.init(panelContainer);
      console.log('StudioInit: PropertiesPanelController initialized');
    } else {
      console.warn('StudioInit: Properties panel container not found');
    }
  },
  
  /**
   * Initialize ToolbarController for tool switching
   * Requirement: 10.5
   */
  _initToolbarController() {
    if (typeof ToolbarController === 'undefined') {
      console.warn('StudioInit: ToolbarController not available');
      return;
    }
    
    // Find the toolbar element
    const toolbarElement = document.getElementById('studio-toolbar') ||
                          document.querySelector('.studio-toolbar');
    
    // Find the canvas/diagram area
    const canvasElement = document.getElementById('diagram-area') ||
                         document.querySelector('.diagram-area');
    
    if (toolbarElement) {
      ToolbarController.init(toolbarElement, canvasElement);
      console.log('StudioInit: ToolbarController initialized');
    } else {
      console.warn('StudioInit: Toolbar element not found');
    }
  },
  
  /**
   * Initialize UndoManager for undo/redo functionality
   * Requirement: 10.6, 10.7
   */
  _initUndoManager() {
    if (typeof UndoManager === 'undefined') {
      console.warn('StudioInit: UndoManager not available');
      return;
    }
    
    // UndoManager is a singleton, clear any existing history
    UndoManager.clear();
    console.log('StudioInit: UndoManager initialized');
  },
  
  /**
   * Initialize DragBehaviors for node/label dragging
   * Requirement: 3.1, 3.2
   */
  _initDragBehaviors() {
    if (typeof DragBehaviors === 'undefined') {
      console.warn('StudioInit: DragBehaviors not available');
      return;
    }
    
    DragBehaviors.init(this._svgElement);
    console.log('StudioInit: DragBehaviors initialized');
  },
  
  /**
   * Initialize SelectionHandlers for click-to-select
   * Requirement: 2.2, 2.5
   */
  _initSelectionHandlers() {
    if (typeof SelectionHandlers === 'undefined') {
      console.warn('StudioInit: SelectionHandlers not available');
      return;
    }
    
    SelectionHandlers.init(this._svgElement);
    console.log('StudioInit: SelectionHandlers initialized');
  },
  
  /**
   * Initialize keyboard shortcuts
   * Requirement: 1.2, 1.3 - Space+drag for pan, Ctrl+scroll for zoom
   * Task: 16.3 - Add keyboard shortcuts
   */
  _initKeyboardShortcuts() {
    // Track spacebar state for pan mode
    let spacebarDown = false;
    let previousTool = null;
    
    // Keydown handler
    document.addEventListener('keydown', (event) => {
      // Ignore if typing in an input field
      if (this._isInputFocused()) return;
      
      switch (event.code) {
        case 'Space':
          // Space + drag for pan (Requirement 1.2)
          if (!spacebarDown && typeof ToolbarController !== 'undefined') {
            spacebarDown = true;
            previousTool = ToolbarController.getCurrentTool();
            ToolbarController.setTool('pan');
            event.preventDefault();
          }
          break;
          
        case 'Escape':
          // Escape to deselect
          if (typeof SelectionManager !== 'undefined') {
            SelectionManager.deselect();
          }
          // Also reset Add Flow tool state
          if (typeof ToolbarController !== 'undefined') {
            ToolbarController._resetAddFlowState();
          }
          break;
          
        case 'Delete':
        case 'Backspace':
          // Delete to remove selected element
          if (!this._isInputFocused()) {
            this._deleteSelectedElement();
            event.preventDefault();
          }
          break;
          
        case 'KeyZ':
          // Ctrl+Z for undo
          if (event.ctrlKey || event.metaKey) {
            if (event.shiftKey) {
              // Ctrl+Shift+Z for redo
              if (typeof UndoManager !== 'undefined') {
                UndoManager.redo();
              }
            } else {
              // Ctrl+Z for undo
              if (typeof UndoManager !== 'undefined') {
                UndoManager.undo();
              }
            }
            event.preventDefault();
          }
          break;
          
        case 'KeyY':
          // Ctrl+Y for redo
          if (event.ctrlKey || event.metaKey) {
            if (typeof UndoManager !== 'undefined') {
              UndoManager.redo();
            }
            event.preventDefault();
          }
          break;
          
        // Tool shortcuts
        case 'KeyV':
          if (!event.ctrlKey && !event.metaKey && typeof ToolbarController !== 'undefined') {
            ToolbarController.setTool('select');
          }
          break;
          
        case 'KeyH':
          if (!event.ctrlKey && !event.metaKey && typeof ToolbarController !== 'undefined') {
            ToolbarController.setTool('pan');
          }
          break;
          
        case 'KeyN':
          if (!event.ctrlKey && !event.metaKey && typeof ToolbarController !== 'undefined') {
            ToolbarController.setTool('addNode');
          }
          break;
          
        case 'KeyF':
          if (!event.ctrlKey && !event.metaKey && typeof ToolbarController !== 'undefined') {
            ToolbarController.setTool('addFlow');
          }
          break;
      }
    });
    
    // Keyup handler
    document.addEventListener('keyup', (event) => {
      if (event.code === 'Space' && spacebarDown) {
        spacebarDown = false;
        // Restore previous tool
        if (previousTool && typeof ToolbarController !== 'undefined') {
          ToolbarController.setTool(previousTool);
        }
        previousTool = null;
      }
    });
    
    // Ctrl+scroll for zoom (Requirement 1.3)
    const diagramArea = document.getElementById('diagram-area') ||
                       document.querySelector('.diagram-area');
    
    if (diagramArea) {
      diagramArea.addEventListener('wheel', (event) => {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          
          if (typeof ViewportController !== 'undefined') {
            const delta = event.deltaY > 0 ? -0.1 : 0.1;
            ViewportController.zoom(delta, event.clientX, event.clientY);
          }
        }
      }, { passive: false });
      
      // Middle-click pan (Requirement 1.2)
      let middleClickPanning = false;
      let lastPanX = 0;
      let lastPanY = 0;
      
      diagramArea.addEventListener('mousedown', (event) => {
        // Middle mouse button (button === 1)
        if (event.button === 1) {
          event.preventDefault();
          middleClickPanning = true;
          lastPanX = event.clientX;
          lastPanY = event.clientY;
          diagramArea.style.cursor = 'grabbing';
        }
      });
      
      document.addEventListener('mousemove', (event) => {
        if (middleClickPanning) {
          const dx = event.clientX - lastPanX;
          const dy = event.clientY - lastPanY;
          lastPanX = event.clientX;
          lastPanY = event.clientY;
          
          if (typeof ViewportController !== 'undefined') {
            ViewportController.pan(dx, dy);
          }
        }
      });
      
      document.addEventListener('mouseup', (event) => {
        if (event.button === 1 && middleClickPanning) {
          middleClickPanning = false;
          diagramArea.style.cursor = '';
        }
      });
    }
    
    console.log('StudioInit: Keyboard shortcuts initialized');
  },
  
  /**
   * Initialize IndependentLabelsManager for free-floating labels
   * Requirement: 4.1, 4.5, 4.6
   */
  _initIndependentLabelsManager() {
    if (typeof IndependentLabelsManager === 'undefined') {
      console.warn('StudioInit: IndependentLabelsManager not available');
      return;
    }
    
    IndependentLabelsManager.init();
    console.log('StudioInit: IndependentLabelsManager initialized');
  },
  
  /**
   * Wire up inter-module communication
   */
  _wireModuleCommunication() {
    // Wire StudioUI selection changes to PropertiesPanelController
    // (Already done in PropertiesPanelController.init)
    
    // Wire StudioUI tool changes to cursor updates
    // (Already done in ToolbarController)
    
    // Wire UndoManager stack changes to toolbar button states
    // (Already done in ToolbarController._wireActionButtons)
    
    console.log('StudioInit: Module communication wired');
  },
  
  /**
   * Check if an input element is focused
   * @returns {boolean}
   */
  _isInputFocused() {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    return tagName === 'input' || 
           tagName === 'textarea' || 
           tagName === 'select' ||
           activeElement.isContentEditable;
  },
  
  /**
   * Delete the currently selected element
   */
  _deleteSelectedElement() {
    if (typeof SelectionManager === 'undefined') return;
    
    const selection = SelectionManager.getSelection();
    if (!selection) return;
    
    switch (selection.type) {
      case 'flow':
        this._deleteFlow(selection.data);
        break;
      case 'node':
        // Deleting nodes is more complex - would need to remove all connected flows
        // For now, show a message
        if (typeof updateAIStatus === 'function') {
          updateAIStatus('To delete a node, remove all its flows from the data table', 'warning');
        }
        break;
      case 'label':
        // Labels can't be deleted, only repositioned
        if (typeof updateAIStatus === 'function') {
          updateAIStatus('Labels cannot be deleted. Use Reset Labels to restore positions.', 'warning');
        }
        break;
    }
  },
  
  /**
   * Delete a flow from the data model
   * @param {Object} flowData - Flow data with source and target
   */
  _deleteFlow(flowData) {
    if (!flowData || !flowData.source || !flowData.target) return;
    
    // Record undo action
    if (typeof UndoManager !== 'undefined') {
      // Try to get the flow value for undo
      const tbody = document.getElementById('data-table-body');
      let flowValue = '1';
      if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
          const inputs = row.querySelectorAll('input');
          if (inputs[0]?.value === flowData.source && inputs[1]?.value === flowData.target) {
            flowValue = inputs[2]?.value || '1';
          }
        });
      }
      
      const action = UndoManager.createFlowDeleteAction(flowData.source, flowData.target, flowValue);
      UndoManager.recordAction(action);
    }
    
    // Remove from data table
    const tbody = document.getElementById('data-table-body');
    if (tbody) {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs[0]?.value === flowData.source && inputs[1]?.value === flowData.target) {
          row.remove();
        }
      });
    }
    
    // Deselect
    if (typeof SelectionManager !== 'undefined') {
      SelectionManager.deselect();
    }
    
    // Re-render diagram
    if (typeof glob !== 'undefined' && glob.process_sankey) {
      glob.process_sankey();
    } else if (typeof process_sankey === 'function') {
      process_sankey();
    }
    
    if (typeof updateAIStatus === 'function') {
      updateAIStatus(`Deleted flow: ${flowData.source} → ${flowData.target}`, 'success');
    }
  },
  
  /**
   * Refresh all handlers after diagram re-render
   * Call this after process_sankey() completes
   */
  refresh() {
    if (!this._initialized) return;
    
    // Refresh selection handlers
    if (typeof SelectionHandlers !== 'undefined') {
      SelectionHandlers.refresh();
    }
    
    // Refresh drag behaviors
    if (typeof DragBehaviors !== 'undefined') {
      DragBehaviors.refresh();
    }
    
    // Re-render independent labels
    if (typeof IndependentLabelsManager !== 'undefined' && IndependentLabelsManager.isInitialized()) {
      IndependentLabelsManager.renderAll();
    }
  },
  
  /**
   * Check if Studio is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },
  
  /**
   * Reset all modules
   */
  reset() {
    if (typeof StudioUI !== 'undefined') StudioUI.reset();
    if (typeof SelectionManager !== 'undefined') SelectionManager.reset();
    if (typeof UndoManager !== 'undefined') UndoManager.clear();
    if (typeof ToolbarController !== 'undefined') ToolbarController.reset();
    if (typeof PropertiesPanelController !== 'undefined') PropertiesPanelController.reset();
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.StudioInit = StudioInit;
  
  // Global helper functions for toolbar buttons
  window.zoomCanvas = function(delta) {
    if (typeof ViewportController !== 'undefined') {
      ViewportController.zoom(delta);
    }
  };
  
  window.fitToScreen = function() {
    if (typeof ViewportController !== 'undefined') {
      ViewportController.fitToScreen();
    }
  };
  
  window.resetZoom = function() {
    if (typeof ViewportController !== 'undefined') {
      ViewportController.reset();
    }
  };
}

// Export for module usage (testing)
export { StudioInit };
