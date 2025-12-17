/**
 * @fileoverview Sync Manager Module
 * Manages bidirectional synchronization between AI chat, Data Editor, and diagram.
 * Requirements: 3.1, 3.2, 3.3
 */

/**
 * SyncManager class handles synchronization between UI components
 */
class SyncManager {
  constructor() {
    /** @type {Object|null} */
    this.dataEditor = null;
    
    /** @type {Object|null} */
    this.aiChat = null;
    
    /** @type {FlowRow[]} */
    this.currentFlows = [];
    
    /** @type {Function[]} */
    this.syncCallbacks = [];
    
    /** @type {Set<string>} */
    this.highlightedRows = new Set();
  }

  /**
   * Register Data Editor component for sync
   * @param {Object} editor - Data Editor UI component
   */
  registerDataEditor(editor) {
    this.dataEditor = editor;
    
    // Set up listener for data editor changes if the editor supports it
    if (editor && typeof editor.onDataChange === 'function') {
      editor.onDataChange((flows) => {
        this.currentFlows = flows;
        this._notifySync('editor', flows);
      });
    }
  }

  /**
   * Register AI Chat component for sync
   * @param {Object} chat - AI Chat UI component
   */
  registerAIChat(chat) {
    this.aiChat = chat;
  }

  /**
   * Sync flows from AI to Data Editor
   * @param {FinancialFlow[]} flows - Financial flows from AI
   */
  syncFromAI(flows) {
    if (!flows || !Array.isArray(flows)) {
      console.warn('SyncManager: Invalid flows provided to syncFromAI');
      return;
    }

    // Convert FinancialFlow objects to FlowRow format
    const flowRows = flows.map((flow, index) => ({
      id: flow.id || `ai-flow-${index}`,
      source: flow.source,
      target: flow.target,
      amount: flow.amount,
      comparison: flow.comparisonAmount,
      color: flow.color,
      isValid: true,
      errors: []
    }));

    this.currentFlows = flowRows;

    // Update Data Editor if registered
    if (this.dataEditor && typeof this.dataEditor.updateFlows === 'function') {
      this.dataEditor.updateFlows(flowRows);
    }

    // Notify sync callbacks
    this._notifySync('ai', flowRows);
  }

  /**
   * Sync current data from Data Editor to AI context
   * @returns {FlowRow[]} Current flow data for AI context
   */
  syncToAI() {
    // Get current flows from Data Editor if available
    if (this.dataEditor && typeof this.dataEditor.getCurrentFlows === 'function') {
      this.currentFlows = this.dataEditor.getCurrentFlows();
    }

    return [...this.currentFlows]; // Return a copy to prevent external mutations
  }

  /**
   * Highlight specific rows affected by AI suggestions
   * @param {string[]} rowIds - Array of row IDs to highlight
   */
  highlightRows(rowIds) {
    if (!Array.isArray(rowIds)) {
      console.warn('SyncManager: rowIds must be an array');
      return;
    }

    // Clear previous highlights
    this.clearHighlights();

    // Set new highlights
    this.highlightedRows = new Set(rowIds);

    // Apply highlights to Data Editor if available
    if (this.dataEditor && typeof this.dataEditor.highlightRows === 'function') {
      this.dataEditor.highlightRows(rowIds);
    } else {
      // Fallback: apply highlights directly to DOM elements
      this._applyHighlightsToDom(rowIds);
    }
  }

  /**
   * Clear all row highlights
   */
  clearHighlights() {
    const previousHighlights = Array.from(this.highlightedRows);
    this.highlightedRows.clear();

    // Clear highlights from Data Editor if available
    if (this.dataEditor && typeof this.dataEditor.clearHighlights === 'function') {
      this.dataEditor.clearHighlights();
    } else {
      // Fallback: remove highlights directly from DOM elements
      this._removeHighlightsFromDom(previousHighlights);
    }
  }

  /**
   * Subscribe to sync events
   * @param {Function} callback - Callback function (source, data) => void
   */
  onSync(callback) {
    if (typeof callback === 'function') {
      this.syncCallbacks.push(callback);
    }
  }

  /**
   * Get currently highlighted row IDs
   * @returns {string[]} Array of highlighted row IDs
   */
  getHighlightedRows() {
    return Array.from(this.highlightedRows);
  }

  /**
   * Get current flow data
   * @returns {FlowRow[]} Current flows
   */
  getCurrentFlows() {
    return [...this.currentFlows];
  }

  /**
   * Update current flows (internal method)
   * @param {FlowRow[]} flows - New flow data
   * @private
   */
  _updateCurrentFlows(flows) {
    this.currentFlows = flows || [];
  }

  /**
   * Notify all sync callbacks
   * @param {'ai'|'editor'} source - Source of the sync
   * @param {FlowRow[]} data - Flow data
   * @private
   */
  _notifySync(source, data) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(source, data);
      } catch (error) {
        console.error('SyncManager: Error in sync callback:', error);
      }
    });
  }

  /**
   * Apply highlights directly to DOM elements (fallback method)
   * @param {string[]} rowIds - Row IDs to highlight
   * @private
   */
  _applyHighlightsToDom(rowIds) {
    rowIds.forEach(rowId => {
      const rowElement = document.querySelector(`[data-row-id="${rowId}"]`);
      if (rowElement) {
        rowElement.classList.add('ai-highlight');
      }
    });
  }

  /**
   * Remove highlights directly from DOM elements (fallback method)
   * @param {string[]} rowIds - Row IDs to remove highlights from
   * @private
   */
  _removeHighlightsFromDom(rowIds) {
    rowIds.forEach(rowId => {
      const rowElement = document.querySelector(`[data-row-id="${rowId}"]`);
      if (rowElement) {
        rowElement.classList.remove('ai-highlight');
      }
    });
  }
}

// Create global instance
const syncManager = new SyncManager();

/**
 * Create a new SyncManager instance
 * @returns {SyncManager} New SyncManager instance
 */
function createSyncManager() {
  return new SyncManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SyncManager, syncManager, createSyncManager };
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.SyncManager = SyncManager;
    window.syncManager = syncManager;
    window.createSyncManager = createSyncManager;
}