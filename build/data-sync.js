/**
 * Data Sync Controller
 * Ensures bi-directional synchronization between diagram and data table
 * 
 * Features:
 * - Syncs data table changes to diagram
 * - Syncs diagram changes (via properties panel) to data table
 * - Provides visual feedback during sync
 * - Debounces rapid changes
 * 
 * Requirements: 3.3, 3.4
 */

(function(global) {
  'use strict';

  /**
   * DataSync - Bi-directional data synchronization controller
   */
  const DataSync = {
    // Sync state
    state: {
      syncing: false,
      lastSyncTime: 0,
      pendingChanges: [],
      syncTimeout: null
    },

    // Configuration
    config: {
      debounceMs: 150,
      showIndicator: true
    },

    // DOM element references
    elements: {
      syncIndicator: null,
      dataTableBody: null,
      flowsTextarea: null
    },

    /**
     * Initialize the data sync controller
     */
    init: function() {
      this.cacheElements();
      this.createSyncIndicator();
      this.bindEvents();
      
      // Emit initialization event
      if (global.StudioUI && global.StudioUI.emit) {
        global.StudioUI.emit('dataSync:initialized');
      }
    },

    /**
     * Cache DOM element references
     */
    cacheElements: function() {
      this.elements.dataTableBody = document.getElementById('data-table-body');
      this.elements.flowsTextarea = document.getElementById('flows_in');
    },

    /**
     * Create sync indicator element
     */
    createSyncIndicator: function() {
      if (!this.config.showIndicator) return;

      // Check if indicator already exists
      let indicator = document.querySelector('.sync-indicator');
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'sync-indicator synced';
        indicator.innerHTML = '<span class="sync-text">Synced</span>';
        
        // Add to status bar if it exists
        const statusBar = document.querySelector('.studio-status-bar, .status-bar');
        if (statusBar) {
          statusBar.appendChild(indicator);
        }
      }
      
      this.elements.syncIndicator = indicator;
    },

    /**
     * Bind event listeners
     */
    bindEvents: function() {
      const self = this;

      // Listen for StudioUI events
      if (global.StudioUI && global.StudioUI.on) {
        // Property changes from properties panel
        global.StudioUI.on('property:changed', (data) => {
          self.handlePropertyChange(data);
        });

        // Selection changes
        global.StudioUI.on('selection:changed', (data) => {
          self.handleSelectionChange(data);
        });
      }

      // Listen for data table changes via mutation observer
      if (this.elements.dataTableBody) {
        const observer = new MutationObserver((mutations) => {
          self.handleTableMutation(mutations);
        });
        
        observer.observe(this.elements.dataTableBody, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true
        });
      }

      // Listen for custom sync events
      document.addEventListener('dataSync:requestSync', (e) => {
        self.syncToDiagram(e.detail);
      });

      document.addEventListener('dataSync:requestTableUpdate', (e) => {
        self.syncToTable(e.detail);
      });
    },

    /**
     * Handle property changes from properties panel
     * @param {Object} data - Property change data
     */
    handlePropertyChange: function(data) {
      if (!data || !data.type) return;

      this.showSyncing();

      // Queue the change
      this.state.pendingChanges.push({
        source: 'properties',
        type: data.type,
        property: data.property,
        value: data.value,
        elementId: data.elementId
      });

      // Debounce sync
      this.debouncedSync();
    },

    /**
     * Handle selection changes
     * @param {Object} data - Selection data
     */
    handleSelectionChange: function(data) {
      // Update any UI that depends on selection
      // This is mainly for visual feedback, not data sync
    },

    /**
     * Handle data table mutations
     * @param {MutationRecord[]} mutations - DOM mutations
     */
    handleTableMutation: function(mutations) {
      // Filter out mutations that are just our own sync updates
      const relevantMutations = mutations.filter(m => {
        return !m.target.classList?.contains('sync-update');
      });

      if (relevantMutations.length === 0) return;

      this.showSyncing();

      // Queue table changes
      this.state.pendingChanges.push({
        source: 'table',
        mutations: relevantMutations
      });

      // Debounce sync
      this.debouncedSync();
    },

    /**
     * Debounced sync execution
     */
    debouncedSync: function() {
      const self = this;

      if (this.state.syncTimeout) {
        clearTimeout(this.state.syncTimeout);
      }

      this.state.syncTimeout = setTimeout(() => {
        self.executeSync();
      }, this.config.debounceMs);
    },

    /**
     * Execute pending sync operations
     */
    executeSync: function() {
      if (this.state.pendingChanges.length === 0) {
        this.showSynced();
        return;
      }

      this.state.syncing = true;

      // Process changes by source
      const tableChanges = this.state.pendingChanges.filter(c => c.source === 'table');
      const propertyChanges = this.state.pendingChanges.filter(c => c.source === 'properties');

      // Clear pending changes
      this.state.pendingChanges = [];

      // Sync table changes to diagram
      if (tableChanges.length > 0) {
        this.syncToDiagram();
      }

      // Sync property changes to table
      if (propertyChanges.length > 0) {
        propertyChanges.forEach(change => {
          this.syncPropertyToTable(change);
        });
      }

      this.state.syncing = false;
      this.state.lastSyncTime = Date.now();
      this.showSynced();

      // Emit sync complete event
      if (global.StudioUI && global.StudioUI.emit) {
        global.StudioUI.emit('dataSync:complete', {
          tableChanges: tableChanges.length,
          propertyChanges: propertyChanges.length
        });
      }
    },

    /**
     * Sync data table to diagram
     * @param {Object} options - Sync options
     */
    syncToDiagram: function(options) {
      // Trigger the existing updateDiagramFromTableNoUndo function
      if (typeof global.updateDiagramFromTableNoUndo === 'function') {
        global.updateDiagramFromTableNoUndo();
      } else if (typeof global.updateDiagramFromTable === 'function') {
        global.updateDiagramFromTable();
      }
    },

    /**
     * Sync property change to data table
     * @param {Object} change - Property change data
     */
    syncPropertyToTable: function(change) {
      if (!change || !change.type) return;

      switch (change.type) {
        case 'flow':
          this.syncFlowPropertyToTable(change);
          break;
        case 'node':
          // Node properties don't typically affect the data table
          // but we could sync node colors if stored in DSL
          break;
        case 'canvas':
          // Canvas properties don't affect data table
          break;
      }
    },

    /**
     * Sync flow property change to data table
     * @param {Object} change - Flow property change
     */
    syncFlowPropertyToTable: function(change) {
      if (!this.elements.dataTableBody) return;

      const { elementId, property, value } = change;
      
      // Find the row in the table that matches this flow
      // elementId format: "source->target" or similar
      const rows = this.elements.dataTableBody.querySelectorAll('tr');
      
      rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length < 3) return;

        const from = inputs[0].value.trim();
        const to = inputs[1].value.trim();
        const rowId = `${from}->${to}`;

        if (rowId === elementId || `${from}[${inputs[2].value}]${to}` === elementId) {
          // Mark as sync update to avoid triggering mutation observer
          row.classList.add('sync-update');

          switch (property) {
            case 'amount':
            case 'value':
              inputs[2].value = value;
              break;
            case 'source':
              inputs[0].value = value;
              break;
            case 'target':
              inputs[1].value = value;
              break;
          }

          // Remove sync marker after a tick
          setTimeout(() => row.classList.remove('sync-update'), 0);
        }
      });
    },

    /**
     * Sync diagram data to table
     * @param {Object} data - Diagram data
     */
    syncToTable: function(data) {
      if (!data || !data.flows) return;
      if (!this.elements.dataTableBody) return;

      this.showSyncing();

      // Clear existing rows
      this.elements.dataTableBody.innerHTML = '';

      // Add rows for each flow
      data.flows.forEach(flow => {
        if (typeof global.addDataRowWithValues === 'function') {
          global.addDataRowWithValues(
            flow.from || flow.source || '',
            flow.to || flow.target || '',
            flow.amount || flow.value || '',
            flow.comparison || ''
          );
        }
      });

      this.showSynced();
    },

    /**
     * Show syncing indicator
     */
    showSyncing: function() {
      if (this.elements.syncIndicator) {
        this.elements.syncIndicator.className = 'sync-indicator syncing';
        this.elements.syncIndicator.querySelector('.sync-text').textContent = 'Syncing...';
      }
    },

    /**
     * Show synced indicator
     */
    showSynced: function() {
      if (this.elements.syncIndicator) {
        this.elements.syncIndicator.className = 'sync-indicator synced';
        this.elements.syncIndicator.querySelector('.sync-text').textContent = 'Synced';
      }
    },

    /**
     * Force a full sync
     */
    forceSync: function() {
      this.showSyncing();
      this.syncToDiagram();
      this.showSynced();
    },

    /**
     * Get current sync state
     * @returns {Object} Current sync state
     */
    getState: function() {
      return {
        syncing: this.state.syncing,
        lastSyncTime: this.state.lastSyncTime,
        pendingChanges: this.state.pendingChanges.length
      };
    }
  };

  // Export to global scope
  global.DataSync = DataSync;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DataSync.init());
  } else {
    // DOM already loaded, initialize after a short delay
    setTimeout(() => DataSync.init(), 200);
  }

})(typeof window !== 'undefined' ? window : this);
