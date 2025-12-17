/**
 * @fileoverview Tabbed Sidebar Component
 * Manages the collapsible tabbed interface for sidebar controls.
 * Implements accordion behavior where only one tab can be expanded at a time.
 */

/**
 * TabbedSidebar class manages tab state and accordion behavior
 */
class TabbedSidebar {
    constructor() {
        /** @type {Map<string, TabConfig>} */
        this.tabConfigs = new Map();
        
        /** @type {SidebarState} */
        this.state = {
            tabs: [],
            activeTab: null
        };
        
        /** @type {number} Default animation duration in milliseconds */
        this.defaultAnimationDuration = 300;
        
        /** @type {Map<string, Function>} Event listeners for tab state changes */
        this.listeners = new Map();
    }

    /**
     * Initialize the tabbed sidebar with tab configuration
     * @param {TabConfig[]} tabs - Array of tab configurations
     */
    initialize(tabs) {
        // Clear existing state
        this.tabConfigs.clear();
        this.state.tabs = [];
        this.state.activeTab = null;

        // Process each tab configuration
        tabs.forEach(tabConfig => {
            this.tabConfigs.set(tabConfig.id, tabConfig);
            
            const tabState = {
                id: tabConfig.id,
                isExpanded: tabConfig.defaultExpanded,
                animationDuration: this.defaultAnimationDuration
            };
            
            this.state.tabs.push(tabState);
            
            // Set active tab if this one is expanded by default
            if (tabConfig.defaultExpanded && !this.state.activeTab) {
                this.state.activeTab = tabConfig.id;
            }
        });

        // Ensure accordion behavior - only one tab can be expanded
        this._enforceAccordionBehavior();
        
        console.log('TabbedSidebar initialized with', tabs.length, 'tabs');
    }

    /**
     * Expand a specific tab (and collapse others)
     * @param {string} tabId - ID of the tab to expand
     */
    expandTab(tabId) {
        if (!this.tabConfigs.has(tabId)) {
            console.warn(`Tab with ID '${tabId}' not found`);
            return;
        }

        // Update state - collapse all other tabs
        this.state.tabs.forEach(tabState => {
            if (tabState.id === tabId) {
                tabState.isExpanded = true;
            } else {
                tabState.isExpanded = false;
            }
        });

        this.state.activeTab = tabId;
        
        // Notify listeners
        this._notifyStateChange('expand', tabId);
        
        console.log(`Expanded tab: ${tabId}`);
    }

    /**
     * Collapse a specific tab
     * @param {string} tabId - ID of the tab to collapse
     */
    collapseTab(tabId) {
        if (!this.tabConfigs.has(tabId)) {
            console.warn(`Tab with ID '${tabId}' not found`);
            return;
        }

        const tabState = this.state.tabs.find(t => t.id === tabId);
        if (tabState) {
            tabState.isExpanded = false;
            
            // If this was the active tab, clear active tab
            if (this.state.activeTab === tabId) {
                this.state.activeTab = null;
            }
            
            // Notify listeners
            this._notifyStateChange('collapse', tabId);
            
            console.log(`Collapsed tab: ${tabId}`);
        }
    }

    /**
     * Toggle tab state (expand if collapsed, collapse if expanded)
     * @param {string} tabId - ID of the tab to toggle
     */
    toggleTab(tabId) {
        if (!this.tabConfigs.has(tabId)) {
            console.warn(`Tab with ID '${tabId}' not found`);
            return;
        }

        const tabState = this.state.tabs.find(t => t.id === tabId);
        if (tabState) {
            if (tabState.isExpanded) {
                this.collapseTab(tabId);
            } else {
                this.expandTab(tabId);
            }
        }
    }

    /**
     * Get current tab states
     * @returns {Map<string, boolean>} Map of tab IDs to their expanded state
     */
    getTabStates() {
        const states = new Map();
        this.state.tabs.forEach(tabState => {
            states.set(tabState.id, tabState.isExpanded);
        });
        return states;
    }

    /**
     * Get the currently active (expanded) tab
     * @returns {string|null} ID of active tab or null if none
     */
    getActiveTab() {
        return this.state.activeTab;
    }

    /**
     * Check if a specific tab is expanded
     * @param {string} tabId - ID of the tab to check
     * @returns {boolean} True if tab is expanded, false otherwise
     */
    isTabExpanded(tabId) {
        const tabState = this.state.tabs.find(t => t.id === tabId);
        return tabState ? tabState.isExpanded : false;
    }

    /**
     * Add event listener for tab state changes
     * @param {string} event - Event type ('expand', 'collapse', 'toggle')
     * @param {Function} callback - Callback function (tabId, newState) => void
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event type
     * @param {Function} callback - Callback function to remove
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Get tab configuration by ID
     * @param {string} tabId - Tab ID
     * @returns {TabConfig|undefined} Tab configuration or undefined if not found
     */
    getTabConfig(tabId) {
        return this.tabConfigs.get(tabId);
    }

    /**
     * Get all tab configurations
     * @returns {TabConfig[]} Array of all tab configurations
     */
    getAllTabConfigs() {
        return Array.from(this.tabConfigs.values());
    }

    /**
     * Enforce accordion behavior - ensure only one tab is expanded at a time
     * @private
     */
    _enforceAccordionBehavior() {
        const expandedTabs = this.state.tabs.filter(t => t.isExpanded);
        
        if (expandedTabs.length > 1) {
            // Keep only the first expanded tab
            const firstExpanded = expandedTabs[0];
            this.state.tabs.forEach(tabState => {
                if (tabState.id !== firstExpanded.id) {
                    tabState.isExpanded = false;
                }
            });
            this.state.activeTab = firstExpanded.id;
        } else if (expandedTabs.length === 1) {
            this.state.activeTab = expandedTabs[0].id;
        } else {
            this.state.activeTab = null;
        }
    }

    /**
     * Render tabs into the specified container
     * @param {HTMLElement} container - Container element to render tabs into
     */
    renderTabs(container) {
        if (!container) {
            console.error('Container element is required for rendering tabs');
            return;
        }

        // Clear existing content
        container.innerHTML = '';
        container.className = 'tabbed-sidebar-container';

        // Create tabs wrapper
        const tabsWrapper = document.createElement('div');
        tabsWrapper.className = 'tabs-wrapper';

        // Render each tab
        this.state.tabs.forEach(tabState => {
            const tabConfig = this.tabConfigs.get(tabState.id);
            if (!tabConfig) return;

            const tabElement = this._createTabElement(tabConfig, tabState);
            tabsWrapper.appendChild(tabElement);
        });

        container.appendChild(tabsWrapper);
        
        // Apply initial states
        this._applyTabStates();
        
        console.log('Rendered', this.state.tabs.length, 'tabs');
    }

    /**
     * Create a single tab element
     * @private
     * @param {TabConfig} tabConfig - Tab configuration
     * @param {TabState} tabState - Tab state
     * @returns {HTMLElement} Tab element
     */
    _createTabElement(tabConfig, tabState) {
        // Create tab container
        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';
        tabContainer.setAttribute('data-tab-id', tabConfig.id);

        // Create tab header
        const tabHeader = document.createElement('h2');
        tabHeader.className = 'tab-header ui_head';
        tabHeader.setAttribute('data-tab-id', tabConfig.id);
        
        // Create indicator
        const indicator = document.createElement('span');
        indicator.className = 'indicator';
        indicator.textContent = tabState.isExpanded ? '−' : '+';
        
        // Create title
        const title = document.createElement('span');
        title.textContent = tabConfig.title;
        
        // Add icon if provided
        if (tabConfig.icon) {
            const icon = document.createElement('span');
            icon.className = `tab-icon ${tabConfig.icon}`;
            tabHeader.appendChild(icon);
        }
        
        tabHeader.appendChild(indicator);
        tabHeader.appendChild(title);

        // Create tab content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'tab-content-wrapper';
        contentWrapper.setAttribute('data-tab-id', tabConfig.id);
        
        // Clone the content element to avoid moving it from its original location
        const contentClone = tabConfig.content.cloneNode(true);
        contentClone.className = `${contentClone.className} tab-content`.trim();
        contentWrapper.appendChild(contentClone);

        // Set initial display state
        if (!tabState.isExpanded) {
            contentWrapper.style.display = 'none';
        }

        // Add click handler to header
        tabHeader.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleTab(tabConfig.id);
        });

        // Assemble tab
        tabContainer.appendChild(tabHeader);
        tabContainer.appendChild(contentWrapper);

        return tabContainer;
    }

    /**
     * Apply current tab states to rendered elements
     * @private
     */
    _applyTabStates() {
        this.state.tabs.forEach(tabState => {
            const tabContainer = document.querySelector(`[data-tab-id="${tabState.id}"]`);
            if (!tabContainer) return;

            const header = tabContainer.querySelector('.tab-header');
            const contentWrapper = tabContainer.querySelector('.tab-content-wrapper');
            const indicator = header?.querySelector('.indicator');

            if (tabState.isExpanded) {
                tabContainer.classList.add('expanded');
                if (indicator) indicator.textContent = '−';
                if (contentWrapper) {
                    contentWrapper.style.display = 'block';
                    contentWrapper.classList.add('expanded');
                }
            } else {
                tabContainer.classList.remove('expanded');
                if (indicator) indicator.textContent = '+';
                if (contentWrapper) {
                    contentWrapper.style.display = 'none';
                    contentWrapper.classList.remove('expanded');
                }
            }
        });
    }

    /**
     * Animate tab expansion/collapse
     * @private
     * @param {string} tabId - Tab ID to animate
     * @param {boolean} expand - True to expand, false to collapse
     */
    _animateTab(tabId, expand) {
        const tabContainer = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (!tabContainer) return;

        const contentWrapper = tabContainer.querySelector('.tab-content-wrapper');
        const indicator = tabContainer.querySelector('.indicator');
        
        if (!contentWrapper) return;

        const tabState = this.state.tabs.find(t => t.id === tabId);
        const duration = tabState ? tabState.animationDuration : this.defaultAnimationDuration;

        if (expand) {
            // Expanding
            contentWrapper.style.display = 'block';
            contentWrapper.style.maxHeight = '0px';
            contentWrapper.style.overflow = 'hidden';
            contentWrapper.style.transition = `max-height ${duration}ms ease-in-out`;
            
            // Force reflow
            contentWrapper.offsetHeight;
            
            // Set to full height
            contentWrapper.style.maxHeight = contentWrapper.scrollHeight + 'px';
            
            // Update indicator
            if (indicator) indicator.textContent = '−';
            tabContainer.classList.add('expanded');
            
            // Clean up after animation
            setTimeout(() => {
                contentWrapper.style.maxHeight = '';
                contentWrapper.style.overflow = '';
                contentWrapper.style.transition = '';
                contentWrapper.classList.add('expanded');
            }, duration);
            
        } else {
            // Collapsing
            contentWrapper.style.maxHeight = contentWrapper.scrollHeight + 'px';
            contentWrapper.style.overflow = 'hidden';
            contentWrapper.style.transition = `max-height ${duration}ms ease-in-out`;
            
            // Force reflow
            contentWrapper.offsetHeight;
            
            // Collapse
            contentWrapper.style.maxHeight = '0px';
            
            // Update indicator
            if (indicator) indicator.textContent = '+';
            tabContainer.classList.remove('expanded');
            contentWrapper.classList.remove('expanded');
            
            // Hide after animation
            setTimeout(() => {
                contentWrapper.style.display = 'none';
                contentWrapper.style.maxHeight = '';
                contentWrapper.style.overflow = '';
                contentWrapper.style.transition = '';
            }, duration);
        }
    }

    /**
     * Notify listeners of state changes
     * @private
     * @param {string} action - Action type ('expand', 'collapse', 'toggle')
     * @param {string} tabId - Tab ID that changed
     */
    _notifyStateChange(action, tabId) {
        const tabState = this.state.tabs.find(t => t.id === tabId);
        
        // Animate the tab change
        if (action === 'expand') {
            this._animateTab(tabId, true);
        } else if (action === 'collapse') {
            this._animateTab(tabId, false);
        }
        
        if (this.listeners.has(action)) {
            this.listeners.get(action).forEach(callback => {
                try {
                    callback(tabId, tabState ? tabState.isExpanded : false);
                } catch (error) {
                    console.error(`Error in tab state listener for ${action}:`, error);
                }
            });
        }

        // Also notify generic 'change' listeners
        if (this.listeners.has('change')) {
            this.listeners.get('change').forEach(callback => {
                try {
                    callback(action, tabId, tabState ? tabState.isExpanded : false);
                } catch (error) {
                    console.error('Error in tab state change listener:', error);
                }
            });
        }
    }
}

// Create global instance
const tabbedSidebar = new TabbedSidebar();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TabbedSidebar, tabbedSidebar };
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.TabbedSidebar = TabbedSidebar;
    window.tabbedSidebar = tabbedSidebar;
}