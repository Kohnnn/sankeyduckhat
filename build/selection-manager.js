/**
 * SelectionManager - Handles element selection and visual feedback
 * Manages visual selection feedback and element identification
 * 
 * Requirements: 2.2, 6.1, 6.2, 6.3, 6.4, 6.5
 */

const SelectionManager = {
  // Currently selected element info
  _selection: null, // { type: 'node'|'flow'|'label'|'canvas', id: string, element: SVGElement, data: any }
  
  // CSS classes for selection styles
  SELECTED_CLASS: 'selected',
  
  /**
   * Select an element
   * @param {SVGElement} element - The SVG element to select
   * @param {string} type - Element type ('node' | 'flow' | 'label')
   * @param {Object} [data] - Optional data associated with the element
   */
  select(element, type, data = null) {
    const validTypes = ['node', 'flow', 'label'];
    if (!validTypes.includes(type)) {
      console.warn(`SelectionManager: Invalid selection type: ${type}`);
      return;
    }
    
    if (!element) {
      console.warn('SelectionManager: No element provided');
      return;
    }
    
    // Deselect previous selection first (enforces single selection - Requirement 6.5)
    if (this._selection) {
      this.removeSelectionStyle(this._selection.element);
    }
    
    // Extract ID from element
    const id = this._extractId(element, type);
    
    // Store new selection
    this._selection = {
      type,
      id,
      element,
      data: data || this._extractData(element, type)
    };
    
    // Apply visual selection style
    this.applySelectionStyle(element, type);
    
    // Notify StudioUI of selection change
    if (typeof StudioUI !== 'undefined') {
      StudioUI.select(this._selection);
    }
  },
  
  /**
   * Deselect current selection
   */
  deselect() {
    if (this._selection) {
      this.removeSelectionStyle(this._selection.element);
      this._selection = null;
      
      // Notify StudioUI of deselection
      if (typeof StudioUI !== 'undefined') {
        StudioUI.select(null);
      }
    }
  },
  
  /**
   * Get currently selected element info
   * @returns {Object|null} Selection info or null if nothing selected
   */
  getSelection() {
    return this._selection ? { ...this._selection } : null;
  },
  
  /**
   * Check if an element is currently selected
   * @param {SVGElement} element - Element to check
   * @returns {boolean} True if element is selected
   */
  isSelected(element) {
    return this._selection && this._selection.element === element;
  },
  
  /**
   * Check if anything is selected
   * @returns {boolean} True if something is selected
   */
  hasSelection() {
    return this._selection !== null;
  },
  
  /**
   * Get the type of current selection
   * @returns {string|null} Selection type or null
   */
  getSelectionType() {
    return this._selection ? this._selection.type : null;
  },
  
  /**
   * Apply visual selection effect to an element
   * @param {SVGElement} element - Element to style
   * @param {string} type - Element type for type-specific styling
   */
  applySelectionStyle(element, type) {
    if (!element) return;
    
    // Add the selected class
    element.classList.add(this.SELECTED_CLASS);
    
    // Apply type-specific styles using D3 if available
    if (typeof d3 !== 'undefined') {
      const d3Element = d3.select(element);
      
      switch (type) {
        case 'node':
          // Animated stroke-dasharray for nodes (Requirement 6.1)
          d3Element
            .attr('data-original-stroke', element.getAttribute('stroke') || 'none')
            .attr('data-original-stroke-width', element.getAttribute('stroke-width') || '0');
          break;
          
        case 'flow':
          // Increased stroke-width for flows (Requirement 6.2)
          const currentStrokeWidth = parseFloat(element.getAttribute('stroke-width')) || 1;
          d3Element
            .attr('data-original-stroke-width', currentStrokeWidth)
            .attr('stroke-width', currentStrokeWidth + 2);
          break;
          
        case 'label':
          // Border highlight for labels (Requirement 6.3)
          // Labels are groups, so we style the background rect
          const bgRect = element.querySelector('rect.label-bg');
          if (bgRect) {
            d3.select(bgRect)
              .attr('data-original-stroke', bgRect.getAttribute('stroke') || 'none')
              .attr('data-original-stroke-width', bgRect.getAttribute('stroke-width') || '0');
          }
          break;
      }
    }
  },
  
  /**
   * Remove visual selection effect from an element
   * @param {SVGElement} element - Element to unstyle
   */
  removeSelectionStyle(element) {
    if (!element) return;
    
    // Remove the selected class
    element.classList.remove(this.SELECTED_CLASS);
    
    // Restore original styles using D3 if available
    if (typeof d3 !== 'undefined') {
      const d3Element = d3.select(element);
      
      // Restore stroke width if it was modified
      const originalStrokeWidth = element.getAttribute('data-original-stroke-width');
      if (originalStrokeWidth !== null) {
        d3Element.attr('stroke-width', originalStrokeWidth);
        element.removeAttribute('data-original-stroke-width');
      }
      
      // Restore stroke if it was modified
      const originalStroke = element.getAttribute('data-original-stroke');
      if (originalStroke !== null) {
        d3Element.attr('stroke', originalStroke === 'none' ? null : originalStroke);
        element.removeAttribute('data-original-stroke');
      }
      
      // Handle label background rect
      const bgRect = element.querySelector('rect.label-bg');
      if (bgRect) {
        const bgOriginalStroke = bgRect.getAttribute('data-original-stroke');
        const bgOriginalStrokeWidth = bgRect.getAttribute('data-original-stroke-width');
        
        if (bgOriginalStroke !== null) {
          d3.select(bgRect).attr('stroke', bgOriginalStroke === 'none' ? null : bgOriginalStroke);
          bgRect.removeAttribute('data-original-stroke');
        }
        if (bgOriginalStrokeWidth !== null) {
          d3.select(bgRect).attr('stroke-width', bgOriginalStrokeWidth);
          bgRect.removeAttribute('data-original-stroke-width');
        }
      }
    }
  },
  
  /**
   * Extract ID from an element based on type
   * @param {SVGElement} element - Element to extract ID from
   * @param {string} type - Element type
   * @returns {string} Extracted ID
   */
  _extractId(element, type) {
    switch (type) {
      case 'node':
        return element.getAttribute('data-node-id') || 
               element.closest('[data-node-id]')?.getAttribute('data-node-id') || 
               '';
      case 'flow':
        const source = element.getAttribute('data-source') || '';
        const target = element.getAttribute('data-target') || '';
        return `${source}->${target}`;
      case 'label':
        return element.getAttribute('data-label-for') || 
               element.closest('[data-label-for]')?.getAttribute('data-label-for') || 
               '';
      default:
        return '';
    }
  },
  
  /**
   * Extract data from an element based on type
   * @param {SVGElement} element - Element to extract data from
   * @param {string} type - Element type
   * @returns {Object} Extracted data
   */
  _extractData(element, type) {
    switch (type) {
      case 'node':
        return {
          id: this._extractId(element, type),
          element: element
        };
      case 'flow':
        return {
          source: element.getAttribute('data-source') || '',
          target: element.getAttribute('data-target') || '',
          element: element
        };
      case 'label':
        return {
          nodeId: this._extractId(element, type),
          element: element
        };
      default:
        return {};
    }
  },
  
  /**
   * Clear selection without triggering events (for internal use)
   */
  _clearInternal() {
    if (this._selection) {
      this.removeSelectionStyle(this._selection.element);
      this._selection = null;
    }
  },
  
  /**
   * Reset the selection manager
   */
  reset() {
    this.deselect();
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.SelectionManager = SelectionManager;
}

// Export for module usage (testing)
export { SelectionManager };
