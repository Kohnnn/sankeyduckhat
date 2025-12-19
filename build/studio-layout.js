/**
 * Studio Layout Controller
 * Manages the three-panel layout architecture for Sankey Studio
 * 
 * Features:
 * - Panel toggling (collapse/expand)
 * - Panel resizing
 * - Responsive layout handling
 * - Tab management for data editor
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

(function(global) {
  'use strict';

  /**
   * StudioLayout - Layout management controller
   */
  const StudioLayout = {
    // Panel state
    panels: {
      properties: {
        collapsed: false,
        width: 320,
        minWidth: 280,
        maxWidth: 480
      },
      data: {
        collapsed: false,
        width: 480,
        minWidth: 400,
        maxWidth: 600,
        activeTab: 'data-editor'
      }
    },

    // DOM element references
    elements: {
      propertiesPanel: null,
      dataPanel: null,
      canvasContainer: null,
      statusBar: null
    },

    // Resize state
    resizing: {
      active: false,
      panel: null,
      startX: 0,
      startWidth: 0
    },

    /**
     * Initialize the layout controller
     */
    init: function() {
      this.cacheElements();
      this.bindEvents();
      this.loadLayoutState();
      this.applyLayoutState();
      
      // Emit initialization event
      if (global.StudioUI && global.StudioUI.emit) {
        global.StudioUI.emit('layout:initialized', this.panels);
      }
    },

    /**
     * Cache DOM element references
     */
    cacheElements: function() {
      this.elements.propertiesPanel = document.querySelector('.studio-properties-panel, .right-panel');
      this.elements.dataPanel = document.querySelector('.studio-data-panel');
      this.elements.canvasContainer = document.querySelector('.studio-canvas-container, .diagram-panel');
      this.elements.statusBar = document.querySelector('.studio-status-bar, .status-bar');
    },

    /**
     * Bind event listeners
     */
    bindEvents: function() {
      const self = this;
      
      // Panel toggle buttons
      document.querySelectorAll('[data-toggle-panel]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const panelName = e.currentTarget.dataset.togglePanel;
          self.togglePanel(panelName);
        });
      });

      // Tab switching - use event delegation for dynamically added tabs
      document.addEventListener('click', (e) => {
        const tab = e.target.closest('.studio-data-tab');
        if (tab) {
          const tabId = tab.dataset.tab;
          self.switchTab(tabId);
        }
      });

      // Resize handles
      document.querySelectorAll('.studio-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => this.startResize(e));
      });

      // Global mouse events for resizing
      document.addEventListener('mousemove', (e) => this.handleResize(e));
      document.addEventListener('mouseup', () => this.endResize());

      // Window resize
      window.addEventListener('resize', () => this.handleWindowResize());

      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    },

    /**
     * Toggle a panel's collapsed state
     * @param {string} panelName - 'properties' or 'data'
     */
    togglePanel: function(panelName) {
      if (!this.panels[panelName]) return;

      this.panels[panelName].collapsed = !this.panels[panelName].collapsed;
      this.applyPanelState(panelName);
      this.saveLayoutState();

      // Emit event
      if (global.StudioUI && global.StudioUI.emit) {
        global.StudioUI.emit('layout:panelToggled', {
          panel: panelName,
          collapsed: this.panels[panelName].collapsed
        });
      }
    },

    /**
     * Set a panel's collapsed state
     * @param {string} panelName - 'properties' or 'data'
     * @param {boolean} collapsed - Whether to collapse the panel
     */
    setPanel: function(panelName, collapsed) {
      if (!this.panels[panelName]) return;

      this.panels[panelName].collapsed = collapsed;
      this.applyPanelState(panelName);
      this.saveLayoutState();
    },

    /**
     * Apply the current state to a panel
     * @param {string} panelName - 'properties' or 'data'
     */
    applyPanelState: function(panelName) {
      const panel = this.panels[panelName];
      let element;

      if (panelName === 'properties') {
        element = this.elements.propertiesPanel;
      } else if (panelName === 'data') {
        element = this.elements.dataPanel;
      }

      if (!element) return;

      if (panel.collapsed) {
        element.classList.add('collapsed');
        element.style.width = '';
      } else {
        element.classList.remove('collapsed');
        element.style.width = panel.width + 'px';
      }

      // Update toggle button icon
      const toggleBtn = document.querySelector(`[data-toggle-panel="${panelName}"]`);
      if (toggleBtn) {
        const icon = toggleBtn.querySelector('.toggle-icon');
        if (icon) {
          icon.textContent = panel.collapsed ? '◀' : '▶';
        }
      }
    },

    /**
     * Apply layout state to all panels
     */
    applyLayoutState: function() {
      this.applyPanelState('properties');
      this.applyPanelState('data');
    },

    /**
     * Switch to a different tab in the data panel
     * @param {string} tabId - The tab identifier
     */
    switchTab: function(tabId) {
      this.panels.data.activeTab = tabId;

      // Update tab buttons
      document.querySelectorAll('.studio-data-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
      });

      // Update tab content
      document.querySelectorAll('.studio-data-tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.tabContent === tabId);
      });

      this.saveLayoutState();

      // Emit event
      if (global.StudioUI && global.StudioUI.emit) {
        global.StudioUI.emit('layout:tabSwitched', { tab: tabId });
      }
    },

    /**
     * Start panel resize operation
     * @param {MouseEvent} e - The mousedown event
     */
    startResize: function(e) {
      const handle = e.currentTarget;
      const panelName = handle.dataset.resizePanel;

      if (!panelName || !this.panels[panelName]) return;

      this.resizing.active = true;
      this.resizing.panel = panelName;
      this.resizing.startX = e.clientX;
      this.resizing.startWidth = this.panels[panelName].width;

      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      e.preventDefault();
    },

    /**
     * Handle panel resize during mouse move
     * @param {MouseEvent} e - The mousemove event
     */
    handleResize: function(e) {
      if (!this.resizing.active) return;

      const panel = this.panels[this.resizing.panel];
      const deltaX = e.clientX - this.resizing.startX;
      
      // For right-side panels, invert the delta
      const isRightPanel = this.resizing.panel === 'properties' || this.resizing.panel === 'data';
      const newWidth = isRightPanel 
        ? this.resizing.startWidth - deltaX 
        : this.resizing.startWidth + deltaX;

      // Clamp to min/max
      panel.width = Math.max(panel.minWidth, Math.min(panel.maxWidth, newWidth));

      // Apply immediately
      this.applyPanelState(this.resizing.panel);
    },

    /**
     * End panel resize operation
     */
    endResize: function() {
      if (!this.resizing.active) return;

      const handle = document.querySelector(`[data-resize-panel="${this.resizing.panel}"]`);
      if (handle) {
        handle.classList.remove('active');
      }

      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      this.saveLayoutState();

      // Emit event
      if (global.StudioUI && global.StudioUI.emit) {
        global.StudioUI.emit('layout:panelResized', {
          panel: this.resizing.panel,
          width: this.panels[this.resizing.panel].width
        });
      }

      this.resizing.active = false;
      this.resizing.panel = null;
    },

    /**
     * Handle window resize
     */
    handleWindowResize: function() {
      const width = window.innerWidth;

      // Auto-collapse panels on small screens
      if (width < 900) {
        if (!this.panels.properties.collapsed) {
          this.setPanel('properties', true);
        }
      }

      // Emit event
      if (global.StudioUI && global.StudioUI.emit) {
        global.StudioUI.emit('layout:windowResized', { width, height: window.innerHeight });
      }
    },

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - The keydown event
     */
    handleKeyboard: function(e) {
      // Ctrl/Cmd + \ to toggle properties panel
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        this.togglePanel('properties');
      }

      // Ctrl/Cmd + Shift + \ to toggle data panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '\\') {
        e.preventDefault();
        this.togglePanel('data');
      }
    },

    /**
     * Save layout state to localStorage
     */
    saveLayoutState: function() {
      try {
        const state = {
          properties: {
            collapsed: this.panels.properties.collapsed,
            width: this.panels.properties.width
          },
          data: {
            collapsed: this.panels.data.collapsed,
            width: this.panels.data.width,
            activeTab: this.panels.data.activeTab
          }
        };
        localStorage.setItem('studioLayoutState', JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save layout state:', e);
      }
    },

    /**
     * Load layout state from localStorage
     */
    loadLayoutState: function() {
      try {
        const saved = localStorage.getItem('studioLayoutState');
        if (saved) {
          const state = JSON.parse(saved);
          
          if (state.properties) {
            this.panels.properties.collapsed = state.properties.collapsed || false;
            this.panels.properties.width = state.properties.width || 320;
          }
          
          if (state.data) {
            this.panels.data.collapsed = state.data.collapsed || false;
            this.panels.data.width = state.data.width || 480;
            this.panels.data.activeTab = state.data.activeTab || 'data-editor';
          }
        }
      } catch (e) {
        console.warn('Failed to load layout state:', e);
      }
    },

    /**
     * Reset layout to defaults
     */
    resetLayout: function() {
      this.panels.properties.collapsed = false;
      this.panels.properties.width = 320;
      this.panels.data.collapsed = false;
      this.panels.data.width = 480;
      this.panels.data.activeTab = 'data-editor';

      this.applyLayoutState();
      this.saveLayoutState();

      // Emit event
      if (global.StudioUI && global.StudioUI.emit) {
        global.StudioUI.emit('layout:reset', this.panels);
      }
    },

    /**
     * Get the current layout state
     * @returns {Object} Current layout state
     */
    getState: function() {
      return {
        properties: { ...this.panels.properties },
        data: { ...this.panels.data }
      };
    }
  };

  // Export to global scope
  global.StudioLayout = StudioLayout;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => StudioLayout.init());
  } else {
    // DOM already loaded, initialize after a short delay to ensure other scripts are ready
    setTimeout(() => StudioLayout.init(), 100);
  }

})(typeof window !== 'undefined' ? window : this);
