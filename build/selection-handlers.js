/**
 * SelectionHandlers - Wires selection click handlers to diagram elements
 * Connects SelectionManager to node, flow, label, and canvas click events
 * 
 * Requirements: 2.2, 2.5
 */

const SelectionHandlers = {
  _initialized: false,
  _svg: null,
  
  /**
   * Initialize selection handlers on the SVG diagram
   * @param {SVGElement|string} svgElement - SVG element or selector
   */
  init(svgElement) {
    if (typeof svgElement === 'string') {
      this._svg = document.querySelector(svgElement);
    } else {
      this._svg = svgElement;
    }
    
    if (!this._svg) {
      console.warn('SelectionHandlers: No SVG element found');
      return;
    }
    
    this._initialized = true;
    this._setupCanvasClickHandler();
    this._setupNodeClickHandlers();
    this._setupFlowClickHandlers();
    this._setupLabelClickHandlers();
  },
  
  /**
   * Set up click handler on canvas background for deselection
   * Requirement: 2.5 - clicking empty canvas deselects
   */
  _setupCanvasClickHandler() {
    if (!this._svg || typeof d3 === 'undefined') return;
    
    const svg = d3.select(this._svg);
    
    // Add click handler to SVG background
    svg.on('click.selection', (event) => {
      // Only deselect if clicking directly on SVG or viewport background
      const target = event.target;
      
      // Check if click was on the SVG itself or a background element
      if (target === this._svg || 
          target.classList.contains('canvas-click-area') ||
          target.classList.contains('viewport') ||
          target.tagName === 'svg') {
        
        // Check if SelectionManager is available
        if (typeof SelectionManager !== 'undefined') {
          SelectionManager.deselect();
        }
      }
    });
  },
  
  /**
   * Set up click handlers on node rect elements
   * Requirement: 2.2 - clicking node updates selection
   * Requirement: 10.1 - Select tool enables element selection
   */
  _setupNodeClickHandlers() {
    if (!this._svg || typeof d3 === 'undefined') return;
    
    const svg = d3.select(this._svg);
    
    // Select all node groups and add click handlers
    svg.selectAll('.sankey-node').each(function() {
      const nodeGroup = d3.select(this);
      const rect = nodeGroup.select('rect');
      
      if (!rect.empty()) {
        rect.on('click.selection', (event) => {
          event.stopPropagation(); // Prevent canvas click
          
          // Check if Add Flow tool is active - handle node click for flow creation
          if (typeof ToolbarController !== 'undefined' && ToolbarController.isToolActive('addFlow')) {
            const nodeId = nodeGroup.attr('data-node-id');
            ToolbarController.handleNodeClickForFlow(nodeId, rect.node());
            return;
          }
          
          // Only allow selection if Select tool is active (Requirement 10.1)
          if (typeof ToolbarController !== 'undefined' && !ToolbarController.isSelectionEnabled()) {
            return;
          }
          
          if (typeof SelectionManager !== 'undefined') {
            const nodeId = nodeGroup.attr('data-node-id');
            SelectionManager.select(rect.node(), 'node', { id: nodeId });
          }
        });
      }
    });
  },
  
  /**
   * Set up click handlers on flow path elements
   * Requirement: 2.2 - clicking flow updates selection
   * Requirement: 7.3 - use data attributes to identify clicked flow
   * Requirement: 10.1 - Select tool enables element selection
   */
  _setupFlowClickHandlers() {
    if (!this._svg || typeof d3 === 'undefined') return;
    
    const svg = d3.select(this._svg);
    
    // Select all flow paths with data-source and data-target attributes
    svg.selectAll('path[data-source][data-target]').each(function() {
      const path = d3.select(this);
      const pathElement = this;
      
      path.on('click.selection', (event) => {
        event.stopPropagation(); // Prevent canvas click
        
        // Only allow selection if Select tool is active (Requirement 10.1)
        if (typeof ToolbarController !== 'undefined' && !ToolbarController.isSelectionEnabled()) {
          return;
        }
        
        if (typeof SelectionManager !== 'undefined') {
          // Use FlowUtils if available, otherwise fall back to direct attribute access
          let flowData;
          if (typeof FlowUtils !== 'undefined') {
            flowData = FlowUtils.getFlowMetadata(pathElement);
          } else {
            flowData = {
              source: path.attr('data-source'),
              target: path.attr('data-target')
            };
          }
          
          if (flowData) {
            SelectionManager.select(pathElement, 'flow', flowData);
          }
        }
      });
    });
  },
  
  /**
   * Set up click handlers on label group elements
   * Requirement: 2.2 - clicking label updates selection
   * Requirement: 10.1 - Select tool enables element selection
   */
  _setupLabelClickHandlers() {
    if (!this._svg || typeof d3 === 'undefined') return;
    
    const svg = d3.select(this._svg);
    
    // Select all label groups
    svg.selectAll('.sankey-label').each(function() {
      const labelGroup = d3.select(this);
      
      labelGroup.on('click.selection', (event) => {
        event.stopPropagation(); // Prevent canvas click
        
        // Only allow selection if Select tool is active (Requirement 10.1)
        if (typeof ToolbarController !== 'undefined' && !ToolbarController.isSelectionEnabled()) {
          return;
        }
        
        if (typeof SelectionManager !== 'undefined') {
          const nodeId = labelGroup.attr('data-label-for');
          SelectionManager.select(this, 'label', { nodeId });
        }
      });
    });
  },
  
  /**
   * Refresh click handlers (call after diagram re-render)
   */
  refresh() {
    if (this._initialized && this._svg) {
      this._setupNodeClickHandlers();
      this._setupFlowClickHandlers();
      this._setupLabelClickHandlers();
    }
  },
  
  /**
   * Remove all selection click handlers
   */
  destroy() {
    if (!this._svg || typeof d3 === 'undefined') return;
    
    const svg = d3.select(this._svg);
    
    // Remove canvas click handler
    svg.on('click.selection', null);
    
    // Remove node click handlers
    svg.selectAll('.sankey-node rect').on('click.selection', null);
    
    // Remove flow click handlers
    svg.selectAll('path[data-source][data-target]').on('click.selection', null);
    
    // Remove label click handlers
    svg.selectAll('.sankey-label').on('click.selection', null);
    
    this._initialized = false;
    this._svg = null;
  },
  
  /**
   * Check if handlers are initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.SelectionHandlers = SelectionHandlers;
}

// Export for module usage (testing)
export { SelectionHandlers };
