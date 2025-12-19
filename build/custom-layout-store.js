/**
 * CustomLayoutStore - Persists user positioning overrides for nodes and labels
 * Stores positions independently so nodes and labels can be moved separately
 * Implements JSON serialization for persistence across sessions
 */
const CustomLayoutStore = {
  // Node position overrides (relative to sankey.js calculated position)
  // Map<nodeId, { dx: number, dy: number }>
  nodePositions: new Map(),

  // Label position overrides (independent from node)
  // Map<nodeId, { x: number, y: number }>
  labelPositions: new Map(),

  // Label dimensions
  // Map<nodeId, { width: number, height: number }>
  labelDimensions: new Map(),

  /**
   * Set a node's position offset
   * @param {string} nodeId - Node identifier (node name)
   * @param {number} dx - X offset from calculated position
   * @param {number} dy - Y offset from calculated position
   */
  setNodePosition(nodeId, dx, dy) {
    if (typeof nodeId !== 'string' || nodeId === '') {
      console.warn('CustomLayoutStore: Invalid nodeId');
      return;
    }
    this.nodePositions.set(nodeId, { dx, dy });
  },

  /**
   * Set a label's absolute position
   * @param {string} nodeId - Node identifier the label is associated with
   * @param {number} x - Absolute X position
   * @param {number} y - Absolute Y position
   */
  setLabelPosition(nodeId, x, y) {
    if (typeof nodeId !== 'string' || nodeId === '') {
      console.warn('CustomLayoutStore: Invalid nodeId');
      return;
    }
    this.labelPositions.set(nodeId, { x, y });
  },

  /**
   * Get a node's position offset
   * @param {string} nodeId - Node identifier
   * @returns {{ dx: number, dy: number } | null} Position offset or null if not set
   */
  getNodePosition(nodeId) {
    return this.nodePositions.get(nodeId) || null;
  },

  /**
   * Get a label's absolute position
   * @param {string} nodeId - Node identifier the label is associated with
   * @returns {{ x: number, y: number } | null} Position or null if not set
   */
  getLabelPosition(nodeId) {
    return this.labelPositions.get(nodeId) || null;
  },

  /**
   * Set label dimensions
   * @param {string} nodeId - Node identifier the label is associated with
   * @param {number} width - Label width
   * @param {number} height - Label height
   */
  setLabelDimensions(nodeId, width, height) {
    if (typeof nodeId !== 'string' || nodeId === '') {
      console.warn('CustomLayoutStore: Invalid nodeId');
      return;
    }
    this.labelDimensions.set(nodeId, { width, height });
  },

  /**
   * Get label dimensions
   * @param {string} nodeId - Node identifier the label is associated with
   * @returns {{ width: number, height: number } | null} Dimensions or null if not set
   */
  getLabelDimensions(nodeId) {
    return this.labelDimensions.get(nodeId) || null;
  },

  /**
   * Clear a node's position offset
   * @param {string} nodeId - Node identifier
   */
  clearNodePosition(nodeId) {
    this.nodePositions.delete(nodeId);
  },

  /**
   * Clear a label's position
   * @param {string} nodeId - Node identifier the label is associated with
   */
  clearLabelPosition(nodeId) {
    this.labelPositions.delete(nodeId);
  },

  /**
   * Clear label dimensions
   * @param {string} nodeId - Node identifier the label is associated with
   */
  clearLabelDimensions(nodeId) {
    this.labelDimensions.delete(nodeId);
  },

  /**
   * Clear all stored positions and dimensions
   */
  clearAll() {
    this.nodePositions.clear();
    this.labelPositions.clear();
    this.labelDimensions.clear();
  },

  /**
   * Check if a node has a custom position
   * @param {string} nodeId - Node identifier
   * @returns {boolean}
   */
  hasNodePosition(nodeId) {
    return this.nodePositions.has(nodeId);
  },

  /**
   * Check if a label has a custom position
   * @param {string} nodeId - Node identifier the label is associated with
   * @returns {boolean}
   */
  hasLabelPosition(nodeId) {
    return this.labelPositions.has(nodeId);
  },

  /**
   * Serialize the store to JSON string
   * @returns {string} JSON representation of the store
   */
  toJSON() {
    return JSON.stringify({
      nodePositions: Array.from(this.nodePositions.entries()),
      labelPositions: Array.from(this.labelPositions.entries()),
      labelDimensions: Array.from(this.labelDimensions.entries())
    });
  },

  /**
   * Restore the store from a JSON string
   * @param {string} json - JSON string to parse
   * @returns {boolean} True if successful, false otherwise
   */
  fromJSON(json) {
    try {
      const data = JSON.parse(json);
      
      // Clear existing data
      this.clearAll();
      
      // Restore node positions
      if (Array.isArray(data.nodePositions)) {
        data.nodePositions.forEach(([key, value]) => {
          if (typeof key === 'string' && value && typeof value.dx === 'number' && typeof value.dy === 'number') {
            this.nodePositions.set(key, value);
          }
        });
      }
      
      // Restore label positions
      if (Array.isArray(data.labelPositions)) {
        data.labelPositions.forEach(([key, value]) => {
          if (typeof key === 'string' && value && typeof value.x === 'number' && typeof value.y === 'number') {
            this.labelPositions.set(key, value);
          }
        });
      }
      
      // Restore label dimensions
      if (Array.isArray(data.labelDimensions)) {
        data.labelDimensions.forEach(([key, value]) => {
          if (typeof key === 'string' && value && typeof value.width === 'number' && typeof value.height === 'number') {
            this.labelDimensions.set(key, value);
          }
        });
      }
      
      return true;
    } catch (e) {
      console.error('CustomLayoutStore: Failed to parse JSON', e);
      return false;
    }
  },

  /**
   * Get the count of stored node positions
   * @returns {number}
   */
  get nodeCount() {
    return this.nodePositions.size;
  },

  /**
   * Get the count of stored label positions
   * @returns {number}
   */
  get labelCount() {
    return this.labelPositions.size;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.CustomLayoutStore = CustomLayoutStore;
}

// Export for module usage (testing)
export { CustomLayoutStore };
