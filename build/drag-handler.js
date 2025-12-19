/**
 * DragHandler - Coordinates drag operations for nodes and labels
 * Implements startDrag, updateDrag, endDrag methods
 * Tracks drag type (node vs label) and calculates position deltas
 * 
 * Requirements: 3.1, 3.2
 */

const DragHandler = {
  // Internal state
  _isDragging: false,
  _dragType: null, // 'node' | 'label'
  _element: null,
  _startX: 0,
  _startY: 0,
  _currentX: 0,
  _currentY: 0,
  _elementStartX: 0,
  _elementStartY: 0,
  _nodeId: null,

  /**
   * Start a drag operation
   * @param {SVGElement} element - The SVG element being dragged
   * @param {string} type - Drag type ('node' | 'label')
   * @param {number} startX - Starting X coordinate (diagram space)
   * @param {number} startY - Starting Y coordinate (diagram space)
   */
  startDrag(element, type, startX, startY) {
    // Validate type
    const validTypes = ['node', 'label'];
    if (!validTypes.includes(type)) {
      console.warn(`DragHandler: Invalid drag type: ${type}`);
      return;
    }

    if (!element) {
      console.warn('DragHandler: No element provided');
      return;
    }

    // Cancel any existing drag
    if (this._isDragging) {
      this.cancelDrag();
    }

    this._isDragging = true;
    this._dragType = type;
    this._element = element;
    this._startX = startX;
    this._startY = startY;
    this._currentX = startX;
    this._currentY = startY;

    // Extract node ID based on type
    this._nodeId = this._extractNodeId(element, type);

    // Store element's starting position
    this._elementStartX = this._getElementX(element, type);
    this._elementStartY = this._getElementY(element, type);

    // Notify StudioUI of drag start
    if (typeof StudioUI !== 'undefined') {
      StudioUI.startInteraction('dragging');
    }
  },

  /**
   * Update during drag operation
   * @param {number} currentX - Current X coordinate (diagram space)
   * @param {number} currentY - Current Y coordinate (diagram space)
   */
  updateDrag(currentX, currentY) {
    if (!this._isDragging || !this._element) {
      return;
    }

    this._currentX = currentX;
    this._currentY = currentY;

    // Calculate delta from start
    const deltaX = currentX - this._startX;
    const deltaY = currentY - this._startY;

    // Calculate new position
    const newX = this._elementStartX + deltaX;
    const newY = this._elementStartY + deltaY;

    // Update visual position based on type
    this._updateElementPosition(newX, newY);
  },

  /**
   * End drag operation and persist position
   */
  endDrag() {
    if (!this._isDragging) {
      return;
    }

    // Calculate final delta
    const deltaX = this._currentX - this._startX;
    const deltaY = this._currentY - this._startY;

    // Persist position to CustomLayoutStore and record undo action
    if (this._nodeId && typeof CustomLayoutStore !== 'undefined') {
      if (this._dragType === 'node') {
        // Get existing offset or start from 0
        const existingOffset = CustomLayoutStore.getNodePosition(this._nodeId);
        const baseDx = existingOffset ? existingOffset.dx : 0;
        const baseDy = existingOffset ? existingOffset.dy : 0;
        
        // Calculate new position
        const newDx = baseDx + deltaX;
        const newDy = baseDy + deltaY;
        
        // Record undo action before applying change
        if (typeof UndoManager !== 'undefined') {
          const action = UndoManager.createNodePositionAction(
            this._nodeId,
            existingOffset, // old position (or null)
            { dx: newDx, dy: newDy } // new position
          );
          UndoManager.recordAction(action);
        }
        
        // Add the drag delta to existing offset
        CustomLayoutStore.setNodePosition(this._nodeId, newDx, newDy);
      } else if (this._dragType === 'label') {
        // For labels, store absolute position
        const oldPosition = CustomLayoutStore.getLabelPosition(this._nodeId);
        const newX = this._elementStartX + deltaX;
        const newY = this._elementStartY + deltaY;
        
        // Record undo action before applying change
        if (typeof UndoManager !== 'undefined') {
          const action = UndoManager.createLabelPositionAction(
            this._nodeId,
            oldPosition, // old position (or null)
            { x: newX, y: newY } // new position
          );
          UndoManager.recordAction(action);
        }
        
        CustomLayoutStore.setLabelPosition(this._nodeId, newX, newY);
      }
    }

    // Notify StudioUI of drag end
    if (typeof StudioUI !== 'undefined') {
      StudioUI.endInteraction();
    }

    // Reset state
    this._resetState();
  },

  /**
   * Cancel drag operation without persisting
   */
  cancelDrag() {
    if (!this._isDragging) {
      return;
    }

    // Restore original position
    if (this._element) {
      this._updateElementPosition(this._elementStartX, this._elementStartY);
    }

    // Notify StudioUI of drag end
    if (typeof StudioUI !== 'undefined') {
      StudioUI.endInteraction();
    }

    // Reset state
    this._resetState();
  },

  /**
   * Check if currently dragging
   * @returns {boolean} True if dragging
   */
  isDragging() {
    return this._isDragging;
  },

  /**
   * Get current drag type
   * @returns {string|null} Current drag type or null
   */
  getDragType() {
    return this._dragType;
  },

  /**
   * Get current drag delta
   * @returns {{ dx: number, dy: number }} Current delta from start
   */
  getDelta() {
    return {
      dx: this._currentX - this._startX,
      dy: this._currentY - this._startY
    };
  },

  /**
   * Get the node ID being dragged
   * @returns {string|null} Node ID or null
   */
  getNodeId() {
    return this._nodeId;
  },

  /**
   * Extract node ID from element based on type
   * @param {SVGElement} element - The element
   * @param {string} type - Element type
   * @returns {string|null} Node ID or null
   */
  _extractNodeId(element, type) {
    if (type === 'node') {
      // Node elements have data-node-id on the group or rect
      return element.getAttribute('data-node-id') ||
             element.closest('[data-node-id]')?.getAttribute('data-node-id') ||
             null;
    } else if (type === 'label') {
      // Label elements have data-label-for attribute
      return element.getAttribute('data-label-for') ||
             element.closest('[data-label-for]')?.getAttribute('data-label-for') ||
             null;
    }
    return null;
  },

  /**
   * Get element's current X position
   * @param {SVGElement} element - The element
   * @param {string} type - Element type
   * @returns {number} X position
   */
  _getElementX(element, type) {
    if (type === 'node') {
      // For nodes, get the rect's x or transform
      const rect = element.tagName === 'rect' ? element : element.querySelector('rect');
      if (rect) {
        return parseFloat(rect.getAttribute('x')) || 0;
      }
      // Check for transform on group
      const transform = element.getAttribute('transform');
      if (transform) {
        const match = transform.match(/translate\(([^,]+)/);
        if (match) {
          return parseFloat(match[1]) || 0;
        }
      }
    } else if (type === 'label') {
      // For labels, get the group's transform or position
      const transform = element.getAttribute('transform');
      if (transform) {
        const match = transform.match(/translate\(([^,]+)/);
        if (match) {
          return parseFloat(match[1]) || 0;
        }
      }
      // Fallback to x attribute if no transform
      return parseFloat(element.getAttribute('x')) || 0;
    }
    return 0;
  },

  /**
   * Get element's current Y position
   * @param {SVGElement} element - The element
   * @param {string} type - Element type
   * @returns {number} Y position
   */
  _getElementY(element, type) {
    if (type === 'node') {
      // For nodes, get the rect's y or transform
      const rect = element.tagName === 'rect' ? element : element.querySelector('rect');
      if (rect) {
        return parseFloat(rect.getAttribute('y')) || 0;
      }
      // Check for transform on group
      const transform = element.getAttribute('transform');
      if (transform) {
        const match = transform.match(/translate\([^,]+,\s*([^)]+)/);
        if (match) {
          return parseFloat(match[1]) || 0;
        }
      }
    } else if (type === 'label') {
      // For labels, get the group's transform or position
      const transform = element.getAttribute('transform');
      if (transform) {
        const match = transform.match(/translate\([^,]+,\s*([^)]+)/);
        if (match) {
          return parseFloat(match[1]) || 0;
        }
      }
      // Fallback to y attribute if no transform
      return parseFloat(element.getAttribute('y')) || 0;
    }
    return 0;
  },

  /**
   * Update element's visual position
   * @param {number} x - New X position
   * @param {number} y - New Y position
   */
  _updateElementPosition(x, y) {
    if (!this._element) return;

    if (typeof d3 !== 'undefined') {
      const d3Element = d3.select(this._element);
      
      if (this._dragType === 'node') {
        // For nodes, update the rect's x/y attributes
        const rect = this._element.tagName === 'rect' 
          ? d3Element 
          : d3Element.select('rect');
        
        if (!rect.empty()) {
          rect.attr('x', x).attr('y', y);
        }
      } else if (this._dragType === 'label') {
        // For labels, update the group's transform
        d3Element.attr('transform', `translate(${x}, ${y})`);
      }
    } else {
      // Fallback without D3
      if (this._dragType === 'node') {
        const rect = this._element.tagName === 'rect' 
          ? this._element 
          : this._element.querySelector('rect');
        
        if (rect) {
          rect.setAttribute('x', x);
          rect.setAttribute('y', y);
        }
      } else if (this._dragType === 'label') {
        this._element.setAttribute('transform', `translate(${x}, ${y})`);
      }
    }
  },

  /**
   * Reset internal state
   */
  _resetState() {
    this._isDragging = false;
    this._dragType = null;
    this._element = null;
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;
    this._elementStartX = 0;
    this._elementStartY = 0;
    this._nodeId = null;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.DragHandler = DragHandler;
}

// Export for module usage (testing)
export { DragHandler };
