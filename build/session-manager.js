/**
 * SessionManager - Manages session reset and state clearing functionality
 * Handles clearing diagram data, customizations, undo history, and localStorage
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

const SessionManager = {
  // localStorage keys used by the application
  STORAGE_KEYS: [
    'sankeymatic-progress',
    'sankeymatic-recent-colors',
    'sankeymatic-settings',
    'sankeymatic-customizations',
    'sankeymatic-layout'
  ],

  /**
   * Reset the entire session to default state
   * Shows confirmation dialog before clearing
   * @returns {boolean} True if reset was confirmed and executed
   */
  resetSession() {
    // Show confirmation dialog
    const confirmed = this.showConfirmationDialog();
    if (!confirmed) {
      return false;
    }

    // Clear all state
    this.clearDiagramData();
    this.clearUndoHistory();
    this.clearLocalStorage();
    this.resetToDefaults();

    // Trigger re-render to show empty canvas
    this._triggerRender();

    // Update status
    if (typeof updateAIStatus === 'function') {
      updateAIStatus('Session reset successfully', 'success');
    }

    return true;
  },

  /**
   * Show confirmation dialog before reset
   * @returns {boolean} True if user confirmed
   */
  showConfirmationDialog() {
    return confirm(
      'Are you sure you want to reset the session?\n\n' +
      'This will clear:\n' +
      '• All diagram data\n' +
      '• All customizations\n' +
      '• Undo/redo history\n' +
      '• Saved progress\n\n' +
      'This action cannot be undone.'
    );
  },

  /**
   * Clear all diagram data from the data table and customizations
   */
  clearDiagramData() {
    // Clear data table
    const tbody = document.getElementById('data-table-body');
    if (tbody) {
      tbody.innerHTML = '';
    }

    // Clear nodeColors
    if (typeof nodeColors !== 'undefined') {
      Object.keys(nodeColors).forEach(key => delete nodeColors[key]);
    }

    // Clear nodeCustomizations
    if (typeof nodeCustomizations !== 'undefined') {
      Object.keys(nodeCustomizations).forEach(key => delete nodeCustomizations[key]);
    }

    // Clear customLayout
    if (typeof customLayout !== 'undefined') {
      Object.keys(customLayout).forEach(key => delete customLayout[key]);
    }

    // Clear rememberedMoves (sankeymatic.js global)
    if (typeof rememberedMoves !== 'undefined' && rememberedMoves instanceof Map) {
      rememberedMoves.clear();
    }
    if (typeof window !== 'undefined' && window.rememberedMoves instanceof Map) {
      window.rememberedMoves.clear();
    }

    // Clear rememberedLabelMoves (sankeymatic.js global)
    if (typeof rememberedLabelMoves !== 'undefined' && rememberedLabelMoves instanceof Map) {
      rememberedLabelMoves.clear();
    }
    if (typeof window !== 'undefined' && window.rememberedLabelMoves instanceof Map) {
      window.rememberedLabelMoves.clear();
    }
  },

  /**
   * Clear undo/redo history
   */
  clearUndoHistory() {
    if (typeof UndoManager !== 'undefined') {
      UndoManager.clear();
    }
  },

  /**
   * Clear all localStorage data for this application
   */
  clearLocalStorage() {
    if (typeof localStorage === 'undefined') return;

    // Clear known keys
    this.STORAGE_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });

    // Also clear any keys that start with 'sankeymatic'
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sankeymatic')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  },

  /**
   * Reset all settings to default values
   */
  resetToDefaults() {
    // Reset diagram title
    const titleInput = document.getElementById('diagram-title-input');
    if (titleInput) {
      titleInput.value = 'My Sankey Diagram';
    }

    // Reset toolbar to select tool
    if (typeof ToolbarController !== 'undefined') {
      ToolbarController.reset();
    }

    // Reset viewport
    if (typeof ViewportController !== 'undefined') {
      ViewportController.reset();
    }

    // Clear selection
    if (typeof SelectionManager !== 'undefined') {
      SelectionManager.clearSelection();
    }

    // Reset CustomLayoutStore
    if (typeof CustomLayoutStore !== 'undefined') {
      CustomLayoutStore.clear();
    }
  },

  /**
   * Trigger diagram re-render
   */
  _triggerRender() {
    if (typeof process_sankey === 'function') {
      process_sankey();
    } else if (typeof renderDiagram === 'function') {
      renderDiagram();
    } else if (typeof window !== 'undefined' && typeof window.process_sankey === 'function') {
      window.process_sankey();
    }
  },

  /**
   * Check if session has any data
   * @returns {boolean} True if session has data
   */
  hasData() {
    const tbody = document.getElementById('data-table-body');
    return tbody && tbody.children.length > 0;
  },

  /**
   * Get current session state (for testing)
   * @returns {Object} Current session state
   */
  getSessionState() {
    return {
      hasData: this.hasData(),
      nodeCustomizationsCount: typeof nodeCustomizations !== 'undefined' 
        ? Object.keys(nodeCustomizations).length : 0,
      nodeColorsCount: typeof nodeColors !== 'undefined' 
        ? Object.keys(nodeColors).length : 0,
      customLayoutCount: typeof customLayout !== 'undefined' 
        ? Object.keys(customLayout).length : 0,
      rememberedMovesCount: typeof window !== 'undefined' && window.rememberedMoves instanceof Map 
        ? window.rememberedMoves.size : 0,
      rememberedLabelMovesCount: typeof window !== 'undefined' && window.rememberedLabelMoves instanceof Map 
        ? window.rememberedLabelMoves.size : 0,
      undoStackCount: typeof UndoManager !== 'undefined' 
        ? UndoManager.getUndoCount() : 0,
      redoStackCount: typeof UndoManager !== 'undefined' 
        ? UndoManager.getRedoCount() : 0
    };
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.SessionManager = SessionManager;
}

// Export for module usage (testing)
export { SessionManager };
