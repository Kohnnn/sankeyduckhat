/**
 * DragBehaviors - Wires D3 drag behaviors to node and label elements
 * Connects DragHandler to actual SVG elements for drag interactions
 * 
 * Requirements: 3.1, 3.2, 5.2, 5.3
 */

const DragBehaviors = {
  _initialized: false,
  _svg: null,
  _nodeDrag: null,
  _labelDrag: null,

  /**
   * Initialize drag behaviors on the SVG diagram
   * @param {SVGElement|string} svgElement - SVG element or selector
   */
  init(svgElement) {
    if (typeof d3 === 'undefined') {
      console.warn('DragBehaviors: D3 is required');
      return;
    }

    if (typeof svgElement === 'string') {
      this._svg = document.querySelector(svgElement);
    } else {
      this._svg = svgElement;
    }

    if (!this._svg) {
      console.warn('DragBehaviors: No SVG element found');
      return;
    }

    this._initialized = true;
    this._createDragBehaviors();
    this._setupNodeDrag();
    this._setupLabelDrag();
  },

  /**
   * Create D3 drag behaviors for nodes and labels
   */
  _createDragBehaviors() {
    const self = this;

    // Create node drag behavior
    this._nodeDrag = d3.drag()
      .on('start', function(event) {
        self._onNodeDragStart(event, this);
      })
      .on('drag', function(event) {
        self._onNodeDrag(event, this);
      })
      .on('end', function(event) {
        self._onNodeDragEnd(event, this);
      });

    // Create label drag behavior
    this._labelDrag = d3.drag()
      .on('start', function(event) {
        self._onLabelDragStart(event, this);
      })
      .on('drag', function(event) {
        self._onLabelDrag(event, this);
      })
      .on('end', function(event) {
        self._onLabelDragEnd(event, this);
      });
  },

  /**
   * Set up drag behavior on node rect elements
   * Requirement: 3.1 - dragging node updates customLayout
   * Requirement: 5.2 - dragging node does NOT move label
   */
  _setupNodeDrag() {
    if (!this._svg || !this._nodeDrag) return;

    const svg = d3.select(this._svg);

    // Apply drag behavior to node rects
    svg.selectAll('.sankey-node rect').call(this._nodeDrag);
  },

  /**
   * Set up drag behavior on label group elements
   * Requirement: 3.2 - dragging label updates customLayout
   * Requirement: 5.3 - dragging label does NOT move node
   */
  _setupLabelDrag() {
    if (!this._svg || !this._labelDrag) return;

    const svg = d3.select(this._svg);

    // Apply drag behavior to label groups
    svg.selectAll('.sankey-label').call(this._labelDrag);
  },

  /**
   * Handle node drag start
   * @param {Object} event - D3 drag event
   * @param {SVGElement} element - The dragged element
   */
  _onNodeDragStart(event, element) {
    // Get diagram coordinates
    const coords = this._getDiagramCoords(event);
    
    // Find the node group (parent of rect)
    const nodeGroup = element.closest('.sankey-node') || element.parentElement;
    
    // Start drag via DragHandler
    if (typeof DragHandler !== 'undefined') {
      DragHandler.startDrag(nodeGroup, 'node', coords.x, coords.y);
    }

    // Add dragging class for visual feedback
    d3.select(nodeGroup).classed('dragging', true);
  },

  /**
   * Handle node drag
   * @param {Object} event - D3 drag event
   * @param {SVGElement} element - The dragged element
   */
  _onNodeDrag(event, element) {
    // Get diagram coordinates
    const coords = this._getDiagramCoords(event);
    
    // Update drag via DragHandler
    if (typeof DragHandler !== 'undefined') {
      DragHandler.updateDrag(coords.x, coords.y);
    }
  },

  /**
   * Handle node drag end
   * @param {Object} event - D3 drag event
   * @param {SVGElement} element - The dragged element
   */
  _onNodeDragEnd(event, element) {
    // Find the node group
    const nodeGroup = element.closest('.sankey-node') || element.parentElement;
    
    // End drag via DragHandler (persists to CustomLayoutStore)
    if (typeof DragHandler !== 'undefined') {
      DragHandler.endDrag();
    }

    // Remove dragging class
    d3.select(nodeGroup).classed('dragging', false);
  },

  /**
   * Handle label drag start
   * @param {Object} event - D3 drag event
   * @param {SVGElement} element - The dragged element (label group)
   */
  _onLabelDragStart(event, element) {
    // Get diagram coordinates
    const coords = this._getDiagramCoords(event);
    
    // Start drag via DragHandler
    if (typeof DragHandler !== 'undefined') {
      DragHandler.startDrag(element, 'label', coords.x, coords.y);
    }

    // Add dragging class for visual feedback
    d3.select(element).classed('dragging', true);
  },

  /**
   * Handle label drag
   * @param {Object} event - D3 drag event
   * @param {SVGElement} element - The dragged element
   */
  _onLabelDrag(event, element) {
    // Get diagram coordinates
    const coords = this._getDiagramCoords(event);
    
    // Update drag via DragHandler
    if (typeof DragHandler !== 'undefined') {
      DragHandler.updateDrag(coords.x, coords.y);
    }
  },

  /**
   * Handle label drag end
   * @param {Object} event - D3 drag event
   * @param {SVGElement} element - The dragged element
   */
  _onLabelDragEnd(event, element) {
    // End drag via DragHandler (persists to CustomLayoutStore)
    if (typeof DragHandler !== 'undefined') {
      DragHandler.endDrag();
    }

    // Remove dragging class
    d3.select(element).classed('dragging', false);
  },

  /**
   * Get diagram coordinates from event, accounting for viewport transform
   * @param {Object} event - D3 drag event
   * @returns {{ x: number, y: number }} Diagram coordinates
   */
  _getDiagramCoords(event) {
    // D3 drag events provide x, y in the coordinate system of the dragged element's parent
    // If ViewportController is available and initialized, use it for coordinate conversion
    if (typeof ViewportController !== 'undefined' && ViewportController.isInitialized()) {
      // event.sourceEvent contains the original mouse/touch event
      if (event.sourceEvent) {
        return ViewportController.screenToDiagram(
          event.sourceEvent.clientX,
          event.sourceEvent.clientY
        );
      }
    }
    
    // Fallback: use D3's provided coordinates directly
    return { x: event.x, y: event.y };
  },

  /**
   * Refresh drag behaviors (call after diagram re-render)
   */
  refresh() {
    if (this._initialized && this._svg) {
      this._setupNodeDrag();
      this._setupLabelDrag();
    }
  },

  /**
   * Remove all drag behaviors
   */
  destroy() {
    if (!this._svg || typeof d3 === 'undefined') return;

    const svg = d3.select(this._svg);

    // Remove node drag behaviors
    svg.selectAll('.sankey-node rect')
      .on('.drag', null);

    // Remove label drag behaviors
    svg.selectAll('.sankey-label')
      .on('.drag', null);

    this._initialized = false;
    this._svg = null;
    this._nodeDrag = null;
    this._labelDrag = null;
  },

  /**
   * Check if behaviors are initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.DragBehaviors = DragBehaviors;
}

// Export for module usage (testing)
export { DragBehaviors };
