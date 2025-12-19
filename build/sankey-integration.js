/**
 * SankeyIntegration - Manages integration between custom layouts and sankey.js
 * 
 * This module ensures:
 * 1. Custom layouts apply AFTER sankey.js calculations complete
 * 2. Sankey.js remains the source of truth for base positions
 * 3. New elements pass through sankey.js for proper layout calculation
 * 
 * Requirements: 8.2, 8.3, 8.4
 */

const SankeyIntegration = {
  // Internal state
  _initialized: false,
  _basePositions: new Map(), // Stores sankey.js calculated positions
  _renderCallbacks: [],
  
  /**
   * Initialize the integration module
   */
  init() {
    this._initialized = true;
    this._basePositions.clear();
    this._renderCallbacks = [];
    
    // Hook into the global render pipeline if available
    this._hookRenderPipeline();
  },
  
  /**
   * Hook into the render pipeline to capture sankey.js positions
   * and apply custom layouts after calculations complete
   */
  _hookRenderPipeline() {
    // Store reference to original process_sankey if it exists
    if (typeof window !== 'undefined' && window.process_sankey) {
      const originalProcessSankey = window.process_sankey;
      const self = this;
      
      window.process_sankey = function(...args) {
        // Call original sankey processing
        const result = originalProcessSankey.apply(this, args);
        
        // After sankey.js completes, apply custom layouts
        self._onRenderComplete();
        
        return result;
      };
    }
  },
  
  /**
   * Called after sankey.js render completes
   * Captures base positions and applies custom layout offsets
   */
  _onRenderComplete() {
    // Capture base positions from sankey.js
    this._captureBasePositions();
    
    // Apply custom layout offsets
    this._applyCustomLayouts();
    
    // Execute any registered callbacks
    this._executeRenderCallbacks();
  },
  
  /**
   * Capture base positions calculated by sankey.js
   * These serve as the source of truth for node positions
   */
  _captureBasePositions() {
    const svg = document.getElementById('sankey_svg');
    if (!svg) return;
    
    // Capture node positions
    const nodeGroups = svg.querySelectorAll('.sankey-node');
    nodeGroups.forEach(group => {
      const nodeId = group.getAttribute('data-node-id');
      if (!nodeId) return;
      
      const rect = group.querySelector('rect');
      if (!rect) return;
      
      const x = parseFloat(rect.getAttribute('x')) || 0;
      const y = parseFloat(rect.getAttribute('y')) || 0;
      
      this._basePositions.set(nodeId, { x, y, type: 'node' });
    });
    
    // Capture label positions
    const labelGroups = svg.querySelectorAll('.sankey-label');
    labelGroups.forEach(group => {
      const nodeId = group.getAttribute('data-label-for');
      if (!nodeId) return;
      
      const transform = group.getAttribute('transform');
      if (!transform) return;
      
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        const x = parseFloat(match[1]) || 0;
        const y = parseFloat(match[2]) || 0;
        
        this._basePositions.set(`label_${nodeId}`, { x, y, type: 'label' });
      }
    });
  },
  
  /**
   * Apply custom layout offsets from CustomLayoutStore
   * Offsets are applied on top of sankey.js calculated positions
   */
  _applyCustomLayouts() {
    if (typeof CustomLayoutStore === 'undefined') return;
    
    const svg = document.getElementById('sankey_svg');
    if (!svg) return;
    
    // Apply node position offsets
    CustomLayoutStore.nodePositions.forEach((offset, nodeId) => {
      const basePos = this._basePositions.get(nodeId);
      if (!basePos) return;
      
      const nodeGroup = svg.querySelector(`.sankey-node[data-node-id="${nodeId}"]`);
      if (!nodeGroup) return;
      
      // Calculate final position: base + offset
      const finalX = basePos.x + offset.dx;
      const finalY = basePos.y + offset.dy;
      
      // Apply transform to node group
      nodeGroup.setAttribute('transform', `translate(${offset.dx}, ${offset.dy})`);
    });
    
    // Apply label position overrides (absolute positions, not offsets)
    CustomLayoutStore.labelPositions.forEach((pos, nodeId) => {
      const labelGroup = svg.querySelector(`.sankey-label[data-label-for="${nodeId}"]`);
      if (!labelGroup) return;
      
      // Set absolute position for label
      labelGroup.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    });
  },
  
  /**
   * Get the base position calculated by sankey.js for a node
   * @param {string} nodeId - Node identifier
   * @returns {{ x: number, y: number } | null} Base position or null
   */
  getBasePosition(nodeId) {
    return this._basePositions.get(nodeId) || null;
  },
  
  /**
   * Get the base position for a label
   * @param {string} nodeId - Node identifier the label is associated with
   * @returns {{ x: number, y: number } | null} Base position or null
   */
  getLabelBasePosition(nodeId) {
    return this._basePositions.get(`label_${nodeId}`) || null;
  },
  
  /**
   * Get the final rendered position for a node (base + custom offset)
   * @param {string} nodeId - Node identifier
   * @returns {{ x: number, y: number } | null} Final position or null
   */
  getFinalPosition(nodeId) {
    const basePos = this.getBasePosition(nodeId);
    if (!basePos) return null;
    
    if (typeof CustomLayoutStore !== 'undefined') {
      const offset = CustomLayoutStore.getNodePosition(nodeId);
      if (offset) {
        return {
          x: basePos.x + offset.dx,
          y: basePos.y + offset.dy
        };
      }
    }
    
    return { x: basePos.x, y: basePos.y };
  },
  
  /**
   * Get the final rendered position for a label
   * @param {string} nodeId - Node identifier the label is associated with
   * @returns {{ x: number, y: number } | null} Final position or null
   */
  getLabelFinalPosition(nodeId) {
    if (typeof CustomLayoutStore !== 'undefined') {
      const customPos = CustomLayoutStore.getLabelPosition(nodeId);
      if (customPos) {
        return { x: customPos.x, y: customPos.y };
      }
    }
    
    return this.getLabelBasePosition(nodeId);
  },
  
  /**
   * Check if a node has a custom position offset
   * @param {string} nodeId - Node identifier
   * @returns {boolean}
   */
  hasCustomPosition(nodeId) {
    if (typeof CustomLayoutStore === 'undefined') return false;
    return CustomLayoutStore.hasNodePosition(nodeId);
  },
  
  /**
   * Check if a label has a custom position
   * @param {string} nodeId - Node identifier the label is associated with
   * @returns {boolean}
   */
  hasCustomLabelPosition(nodeId) {
    if (typeof CustomLayoutStore === 'undefined') return false;
    return CustomLayoutStore.hasLabelPosition(nodeId);
  },
  
  /**
   * Register a callback to be executed after render completes
   * @param {Function} callback - Callback function
   */
  onRenderComplete(callback) {
    if (typeof callback === 'function') {
      this._renderCallbacks.push(callback);
    }
  },
  
  /**
   * Remove a render callback
   * @param {Function} callback - Callback function to remove
   */
  offRenderComplete(callback) {
    const index = this._renderCallbacks.indexOf(callback);
    if (index > -1) {
      this._renderCallbacks.splice(index, 1);
    }
  },
  
  /**
   * Execute all registered render callbacks
   */
  _executeRenderCallbacks() {
    this._renderCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('SankeyIntegration: Render callback error', e);
      }
    });
  },
  
  /**
   * Trigger a full re-render through sankey.js
   * Used when data changes require recalculation
   */
  triggerRerender() {
    if (typeof window !== 'undefined' && typeof window.process_sankey === 'function') {
      window.process_sankey();
    }
  },
  
  /**
   * Add a new node through the data model
   * Ensures the node passes through sankey.js for proper layout
   * @param {string} nodeName - Name for the new node
   * @param {Object} options - Optional configuration
   * @returns {boolean} True if successful
   */
  addNode(nodeName, options = {}) {
    if (!nodeName || typeof nodeName !== 'string') {
      console.warn('SankeyIntegration: Invalid node name');
      return false;
    }
    
    // Add node through data model (creates a placeholder flow)
    const targetName = options.targetName || `${nodeName} Output`;
    const value = options.value || 1;
    
    // Use the data table to add the node
    if (typeof addDataRow === 'function') {
      addDataRow();
      
      const tbody = document.getElementById('data-table-body');
      const lastRow = tbody?.lastElementChild;
      if (lastRow) {
        const inputs = lastRow.querySelectorAll('input');
        if (inputs[0]) inputs[0].value = nodeName;
        if (inputs[1]) inputs[1].value = targetName;
        if (inputs[2]) inputs[2].value = String(value);
        
        // Trigger sankey.js recalculation
        this.triggerRerender();
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Add a new flow through the data model
   * Ensures the flow passes through sankey.js for proper layout
   * @param {string} sourceNode - Source node name
   * @param {string} targetNode - Target node name
   * @param {number} value - Flow value
   * @returns {boolean} True if successful
   */
  addFlow(sourceNode, targetNode, value = 1) {
    if (!sourceNode || !targetNode) {
      console.warn('SankeyIntegration: Invalid source or target node');
      return false;
    }
    
    if (sourceNode === targetNode) {
      console.warn('SankeyIntegration: Cannot create self-loop flow');
      return false;
    }
    
    // Use the data table to add the flow
    if (typeof addDataRow === 'function') {
      addDataRow();
      
      const tbody = document.getElementById('data-table-body');
      const lastRow = tbody?.lastElementChild;
      if (lastRow) {
        const inputs = lastRow.querySelectorAll('input');
        if (inputs[0]) inputs[0].value = sourceNode;
        if (inputs[1]) inputs[1].value = targetNode;
        if (inputs[2]) inputs[2].value = String(value);
        
        // Trigger sankey.js recalculation
        this.triggerRerender();
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Verify that a node's position matches expected behavior
   * For nodes without custom positioning: position should match sankey.js
   * For nodes with custom positioning: position should be base + offset
   * @param {string} nodeId - Node identifier
   * @returns {{ isValid: boolean, basePos: Object, finalPos: Object, customOffset: Object | null }}
   */
  verifyNodePosition(nodeId) {
    const basePos = this.getBasePosition(nodeId);
    const finalPos = this.getFinalPosition(nodeId);
    const customOffset = typeof CustomLayoutStore !== 'undefined' 
      ? CustomLayoutStore.getNodePosition(nodeId) 
      : null;
    
    if (!basePos || !finalPos) {
      return { isValid: false, basePos, finalPos, customOffset };
    }
    
    let isValid = false;
    
    if (customOffset) {
      // With custom offset: final = base + offset
      const expectedX = basePos.x + customOffset.dx;
      const expectedY = basePos.y + customOffset.dy;
      isValid = Math.abs(finalPos.x - expectedX) < 0.01 && 
                Math.abs(finalPos.y - expectedY) < 0.01;
    } else {
      // Without custom offset: final = base
      isValid = Math.abs(finalPos.x - basePos.x) < 0.01 && 
                Math.abs(finalPos.y - basePos.y) < 0.01;
    }
    
    return { isValid, basePos, finalPos, customOffset };
  },
  
  /**
   * Clear all base positions (used for testing)
   */
  clearBasePositions() {
    this._basePositions.clear();
  },
  
  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },
  
  /**
   * Reset the integration module
   */
  reset() {
    this._basePositions.clear();
    this._renderCallbacks = [];
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.SankeyIntegration = SankeyIntegration;
}

// Export for module usage (testing)
export { SankeyIntegration };
