/**
 * StudioUI - Central interaction state manager for Sankey Studio
 * Tracks current tool, selection, and interaction mode
 * Implements event emitter pattern for state change notifications
 */
const StudioUI = {
  // State properties
  currentTool: 'select', // 'select' | 'pan' | 'addNode' | 'addFlow'
  selectedElement: null, // { type: 'node'|'flow'|'label'|'canvas', id: string, element: SVGElement }
  interactionMode: 'idle', // 'idle' | 'dragging' | 'panning' | 'selecting'
  viewport: {
    x: 0,
    y: 0,
    scale: 1
  },

  // Event listeners storage
  _listeners: {},

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  },

  /**
   * Emit an event to all registered listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const listeners = this._listeners[event];
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  },

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    const listeners = this._listeners[event];
    if (listeners) {
      this._listeners[event] = listeners.filter(cb => cb !== callback);
    }
  },

  /**
   * Set the current active tool
   * @param {string} tool - Tool name ('select' | 'pan' | 'addNode' | 'addFlow')
   */
  setTool(tool) {
    const validTools = ['select', 'pan', 'addNode', 'addFlow'];
    if (!validTools.includes(tool)) {
      console.warn(`Invalid tool: ${tool}`);
      return;
    }
    const previousTool = this.currentTool;
    this.currentTool = tool;
    this.emit('toolChange', { tool, previousTool });
  },

  /**
   * Select an element
   * @param {Object|null} element - Element to select { type, id, element } or null to deselect
   */
  select(element) {
    const previousSelection = this.selectedElement;
    this.selectedElement = element;
    this.emit('selectionChange', { selection: element, previousSelection });
  },

  /**
   * Start an interaction mode
   * @param {string} mode - Interaction mode ('idle' | 'dragging' | 'panning' | 'selecting')
   */
  startInteraction(mode) {
    const validModes = ['idle', 'dragging', 'panning', 'selecting'];
    if (!validModes.includes(mode)) {
      console.warn(`Invalid interaction mode: ${mode}`);
      return;
    }
    const previousMode = this.interactionMode;
    this.interactionMode = mode;
    this.emit('interactionChange', { mode, previousMode });
  },

  /**
   * End the current interaction (return to idle)
   */
  endInteraction() {
    const previousMode = this.interactionMode;
    this.interactionMode = 'idle';
    this.emit('interactionChange', { mode: 'idle', previousMode });
  },

  /**
   * Update viewport transform state
   * @param {Object} transform - { x, y, scale }
   */
  updateViewport(transform) {
    const previousViewport = { ...this.viewport };
    this.viewport = {
      x: transform.x ?? this.viewport.x,
      y: transform.y ?? this.viewport.y,
      scale: transform.scale ?? this.viewport.scale
    };
    this.emit('viewportChange', { viewport: this.viewport, previousViewport });
  },

  /**
   * Reset state to defaults
   */
  reset() {
    this.currentTool = 'select';
    this.selectedElement = null;
    this.interactionMode = 'idle';
    this.viewport = { x: 0, y: 0, scale: 1 };
    this.emit('reset', {});
  },

  /**
   * Get current state snapshot
   * @returns {Object} Current state
   */
  getState() {
    return {
      currentTool: this.currentTool,
      selectedElement: this.selectedElement,
      interactionMode: this.interactionMode,
      viewport: { ...this.viewport }
    };
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.StudioUI = StudioUI;
}

// Export for module usage (testing)
export { StudioUI };
