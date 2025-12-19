/**
 * UndoManager - Manages undo/redo functionality for Sankey Studio
 * Implements action stack with max size for memory management
 * Stores state snapshots or action deltas for reversible operations
 * 
 * Requirements: 10.6, 10.7
 */

const UndoManager = {
  // Configuration
  MAX_STACK_SIZE: 50,

  // Undo stack - stores actions that can be undone
  _undoStack: [],

  // Redo stack - stores actions that can be redone
  _redoStack: [],

  // Event listeners storage
  _listeners: {},

  /**
   * Action types supported by the undo system
   */
  ActionTypes: {
    NODE_POSITION: 'nodePosition',
    LABEL_POSITION: 'labelPosition',
    PROPERTY_CHANGE: 'propertyChange',
    FLOW_ADD: 'flowAdd',
    FLOW_DELETE: 'flowDelete',
    NODE_ADD: 'nodeAdd',
    NODE_DELETE: 'nodeDelete'
  },

  /**
   * Register an event listener
   * @param {string} event - Event name ('stackChange', 'undo', 'redo')
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
   * Record an action for undo capability
   * @param {Object} action - Action object with type, data, and inverse data
   * @param {string} action.type - Action type from ActionTypes
   * @param {Object} action.data - Data needed to redo the action
   * @param {Object} action.inverseData - Data needed to undo the action
   * @param {string} [action.description] - Human-readable description
   */
  recordAction(action) {
    if (!action || !action.type) {
      console.warn('UndoManager: Invalid action - missing type');
      return;
    }

    // Add timestamp
    action.timestamp = Date.now();

    // Push to undo stack
    this._undoStack.push(action);

    // Clear redo stack when new action is recorded
    this._redoStack = [];

    // Enforce max stack size
    while (this._undoStack.length > this.MAX_STACK_SIZE) {
      this._undoStack.shift();
    }

    // Emit stack change event
    this.emit('stackChange', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  },

  /**
   * Undo the last action
   * @returns {boolean} True if undo was performed, false if stack was empty
   */
  undo() {
    if (!this.canUndo()) {
      return false;
    }

    const action = this._undoStack.pop();
    
    // Apply the inverse operation
    this._applyInverse(action);

    // Push to redo stack
    this._redoStack.push(action);

    // Emit events
    this.emit('undo', { action });
    this.emit('stackChange', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });

    return true;
  },

  /**
   * Redo the last undone action
   * @returns {boolean} True if redo was performed, false if stack was empty
   */
  redo() {
    if (!this.canRedo()) {
      return false;
    }

    const action = this._redoStack.pop();
    
    // Apply the original operation
    this._applyAction(action);

    // Push back to undo stack
    this._undoStack.push(action);

    // Emit events
    this.emit('redo', { action });
    this.emit('stackChange', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });

    return true;
  },

  /**
   * Check if undo is available
   * @returns {boolean} True if there are actions to undo
   */
  canUndo() {
    return this._undoStack.length > 0;
  },

  /**
   * Check if redo is available
   * @returns {boolean} True if there are actions to redo
   */
  canRedo() {
    return this._redoStack.length > 0;
  },

  /**
   * Get the number of actions in the undo stack
   * @returns {number} Number of undoable actions
   */
  getUndoCount() {
    return this._undoStack.length;
  },

  /**
   * Get the number of actions in the redo stack
   * @returns {number} Number of redoable actions
   */
  getRedoCount() {
    return this._redoStack.length;
  },

  /**
   * Clear all undo/redo history
   */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
    
    this.emit('stackChange', {
      canUndo: false,
      canRedo: false
    });
  },

  /**
   * Apply the inverse of an action (for undo)
   * @param {Object} action - The action to reverse
   */
  _applyInverse(action) {
    switch (action.type) {
      case this.ActionTypes.NODE_POSITION:
        this._applyNodePositionChange(action.inverseData);
        break;
      case this.ActionTypes.LABEL_POSITION:
        this._applyLabelPositionChange(action.inverseData);
        break;
      case this.ActionTypes.PROPERTY_CHANGE:
        this._applyPropertyChange(action.inverseData);
        break;
      case this.ActionTypes.FLOW_ADD:
        this._removeFlow(action.data);
        break;
      case this.ActionTypes.FLOW_DELETE:
        this._addFlow(action.inverseData);
        break;
      case this.ActionTypes.NODE_ADD:
        this._removeNode(action.data);
        break;
      case this.ActionTypes.NODE_DELETE:
        this._addNode(action.inverseData);
        break;
      default:
        console.warn(`UndoManager: Unknown action type: ${action.type}`);
    }
  },

  /**
   * Apply an action (for redo)
   * @param {Object} action - The action to apply
   */
  _applyAction(action) {
    switch (action.type) {
      case this.ActionTypes.NODE_POSITION:
        this._applyNodePositionChange(action.data);
        break;
      case this.ActionTypes.LABEL_POSITION:
        this._applyLabelPositionChange(action.data);
        break;
      case this.ActionTypes.PROPERTY_CHANGE:
        this._applyPropertyChange(action.data);
        break;
      case this.ActionTypes.FLOW_ADD:
        this._addFlow(action.data);
        break;
      case this.ActionTypes.FLOW_DELETE:
        this._removeFlow(action.inverseData);
        break;
      case this.ActionTypes.NODE_ADD:
        this._addNode(action.data);
        break;
      case this.ActionTypes.NODE_DELETE:
        this._removeNode(action.inverseData);
        break;
      default:
        console.warn(`UndoManager: Unknown action type: ${action.type}`);
    }
  },

  /**
   * Apply a node position change
   * @param {Object} data - { nodeId, dx, dy } or { nodeId, clear: true }
   */
  _applyNodePositionChange(data) {
    if (typeof CustomLayoutStore === 'undefined') return;

    if (data.clear) {
      CustomLayoutStore.clearNodePosition(data.nodeId);
    } else {
      CustomLayoutStore.setNodePosition(data.nodeId, data.dx, data.dy);
    }

    // Trigger re-render if available
    this._triggerRender();
  },

  /**
   * Apply a label position change
   * @param {Object} data - { nodeId, x, y } or { nodeId, clear: true }
   */
  _applyLabelPositionChange(data) {
    if (typeof CustomLayoutStore === 'undefined') return;

    if (data.clear) {
      CustomLayoutStore.clearLabelPosition(data.nodeId);
    } else {
      CustomLayoutStore.setLabelPosition(data.nodeId, data.x, data.y);
    }

    // Trigger re-render if available
    this._triggerRender();
  },

  /**
   * Apply a property change
   * @param {Object} data - { elementType, elementId, property, value }
   */
  _applyPropertyChange(data) {
    // Property changes are applied through the properties panel
    // This would need to be wired to the actual property update mechanism
    if (typeof PropertiesPanelController !== 'undefined' && 
        typeof PropertiesPanelController.applyPropertyValue === 'function') {
      PropertiesPanelController.applyPropertyValue(
        data.elementType,
        data.elementId,
        data.property,
        data.value
      );
    }

    // Trigger re-render if available
    this._triggerRender();
  },

  /**
   * Add a flow to the data model
   * @param {Object} data - { source, target, value }
   */
  _addFlow(data) {
    if (typeof addDataRow === 'function') {
      addDataRow();
      
      const tbody = document.getElementById('data-table-body');
      const lastRow = tbody?.lastElementChild;
      if (lastRow) {
        const inputs = lastRow.querySelectorAll('input');
        if (inputs[0]) inputs[0].value = data.source;
        if (inputs[1]) inputs[1].value = data.target;
        if (inputs[2]) inputs[2].value = data.value || '1';
      }
    }

    this._triggerRender();
  },

  /**
   * Remove a flow from the data model
   * @param {Object} data - { source, target }
   */
  _removeFlow(data) {
    const tbody = document.getElementById('data-table-body');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0]?.value === data.source && inputs[1]?.value === data.target) {
        row.remove();
      }
    });

    this._triggerRender();
  },

  /**
   * Add a node to the data model
   * @param {Object} data - { nodeName, targetName, value }
   */
  _addNode(data) {
    if (typeof addDataRow === 'function') {
      addDataRow();
      
      const tbody = document.getElementById('data-table-body');
      const lastRow = tbody?.lastElementChild;
      if (lastRow) {
        const inputs = lastRow.querySelectorAll('input');
        if (inputs[0]) inputs[0].value = data.nodeName;
        if (inputs[1]) inputs[1].value = data.targetName || `${data.nodeName} Output`;
        if (inputs[2]) inputs[2].value = data.value || '1';
      }
    }

    this._triggerRender();
  },

  /**
   * Remove a node from the data model
   * @param {Object} data - { nodeName }
   */
  _removeNode(data) {
    const tbody = document.getElementById('data-table-body');
    if (!tbody) return;

    // Remove all rows where this node is source or target
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0]?.value === data.nodeName || inputs[1]?.value === data.nodeName) {
        row.remove();
      }
    });

    this._triggerRender();
  },

  /**
   * Trigger diagram re-render
   */
  _triggerRender() {
    if (typeof renderDiagram === 'function') {
      renderDiagram();
    }
  },

  /**
   * Get the last action description (for UI display)
   * @returns {string|null} Description of last undoable action
   */
  getLastActionDescription() {
    if (this._undoStack.length === 0) return null;
    const lastAction = this._undoStack[this._undoStack.length - 1];
    return lastAction.description || `${lastAction.type} action`;
  },

  /**
   * Get the last undone action description (for UI display)
   * @returns {string|null} Description of last redoable action
   */
  getLastUndoneDescription() {
    if (this._redoStack.length === 0) return null;
    const lastAction = this._redoStack[this._redoStack.length - 1];
    return lastAction.description || `${lastAction.type} action`;
  },

  /**
   * Create a node position action
   * @param {string} nodeId - Node identifier
   * @param {Object} oldPosition - Previous position { dx, dy } or null
   * @param {Object} newPosition - New position { dx, dy }
   * @returns {Object} Action object
   */
  createNodePositionAction(nodeId, oldPosition, newPosition) {
    return {
      type: this.ActionTypes.NODE_POSITION,
      data: { nodeId, dx: newPosition.dx, dy: newPosition.dy },
      inverseData: oldPosition 
        ? { nodeId, dx: oldPosition.dx, dy: oldPosition.dy }
        : { nodeId, clear: true },
      description: `Move node "${nodeId}"`
    };
  },

  /**
   * Create a label position action
   * @param {string} nodeId - Node identifier (label is associated with)
   * @param {Object} oldPosition - Previous position { x, y } or null
   * @param {Object} newPosition - New position { x, y }
   * @returns {Object} Action object
   */
  createLabelPositionAction(nodeId, oldPosition, newPosition) {
    return {
      type: this.ActionTypes.LABEL_POSITION,
      data: { nodeId, x: newPosition.x, y: newPosition.y },
      inverseData: oldPosition 
        ? { nodeId, x: oldPosition.x, y: oldPosition.y }
        : { nodeId, clear: true },
      description: `Move label for "${nodeId}"`
    };
  },

  /**
   * Create a property change action
   * @param {string} elementType - Type of element ('node', 'flow', 'label')
   * @param {string} elementId - Element identifier
   * @param {string} property - Property name
   * @param {*} oldValue - Previous value
   * @param {*} newValue - New value
   * @returns {Object} Action object
   */
  createPropertyChangeAction(elementType, elementId, property, oldValue, newValue) {
    return {
      type: this.ActionTypes.PROPERTY_CHANGE,
      data: { elementType, elementId, property, value: newValue },
      inverseData: { elementType, elementId, property, value: oldValue },
      description: `Change ${property} of ${elementType} "${elementId}"`
    };
  },

  /**
   * Create a flow add action
   * @param {string} source - Source node name
   * @param {string} target - Target node name
   * @param {string|number} value - Flow value
   * @returns {Object} Action object
   */
  createFlowAddAction(source, target, value) {
    return {
      type: this.ActionTypes.FLOW_ADD,
      data: { source, target, value },
      inverseData: { source, target },
      description: `Add flow ${source} → ${target}`
    };
  },

  /**
   * Create a flow delete action
   * @param {string} source - Source node name
   * @param {string} target - Target node name
   * @param {string|number} value - Flow value (for restoration)
   * @returns {Object} Action object
   */
  createFlowDeleteAction(source, target, value) {
    return {
      type: this.ActionTypes.FLOW_DELETE,
      data: { source, target },
      inverseData: { source, target, value },
      description: `Delete flow ${source} → ${target}`
    };
  },

  /**
   * Reset the undo manager (for testing)
   */
  reset() {
    this._undoStack = [];
    this._redoStack = [];
    this._listeners = {};
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.UndoManager = UndoManager;
}

// Export for module usage (testing)
export { UndoManager };
