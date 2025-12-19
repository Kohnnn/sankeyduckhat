/**
 * ThemeController - Manages theme switching and persistence
 * Supports light and dark themes with localStorage persistence
 * 
 * Requirements: 9.2
 */

const ThemeController = {
  // Theme constants
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark'
  },
  
  // Storage key for theme preference
  STORAGE_KEY: 'sankey-studio-theme',
  
  // Current theme
  _currentTheme: 'light',
  
  // Event listeners
  _listeners: [],
  
  /**
   * Initialize the theme controller
   * Loads saved preference or detects system preference
   */
  init() {
    // Try to load saved preference
    const savedTheme = this._loadThemePreference();
    
    if (savedTheme) {
      this._currentTheme = savedTheme;
    } else {
      // Detect system preference
      this._currentTheme = this._detectSystemPreference();
    }
    
    // Apply the theme
    this._applyTheme(this._currentTheme);
    
    // Update UI elements
    this._updateToggleButton();
    
    // Listen for system preference changes
    this._listenForSystemChanges();
    
    console.log(`ThemeController initialized with theme: ${this._currentTheme}`);
  },
  
  /**
   * Get the current theme
   * @returns {string} Current theme ('light' or 'dark')
   */
  getCurrentTheme() {
    return this._currentTheme;
  },
  
  /**
   * Check if dark theme is active
   * @returns {boolean} True if dark theme is active
   */
  isDarkTheme() {
    return this._currentTheme === this.THEMES.DARK;
  },
  
  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const newTheme = this._currentTheme === this.THEMES.LIGHT 
      ? this.THEMES.DARK 
      : this.THEMES.LIGHT;
    
    this.setTheme(newTheme);
  },
  
  /**
   * Set a specific theme
   * @param {string} theme - Theme to set ('light' or 'dark')
   */
  setTheme(theme) {
    if (theme !== this.THEMES.LIGHT && theme !== this.THEMES.DARK) {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }
    
    const previousTheme = this._currentTheme;
    this._currentTheme = theme;
    
    // Apply the theme
    this._applyTheme(theme);
    
    // Save preference
    this._saveThemePreference(theme);
    
    // Update UI elements
    this._updateToggleButton();
    
    // Notify listeners
    this._notifyListeners(theme, previousTheme);
  },
  
  /**
   * Register a theme change listener
   * @param {Function} callback - Callback function(newTheme, previousTheme)
   */
  onThemeChange(callback) {
    if (typeof callback === 'function') {
      this._listeners.push(callback);
    }
  },
  
  /**
   * Remove a theme change listener
   * @param {Function} callback - Callback to remove
   */
  offThemeChange(callback) {
    this._listeners = this._listeners.filter(cb => cb !== callback);
  },
  
  /**
   * Apply theme to the document
   * @param {string} theme - Theme to apply
   * @private
   */
  _applyTheme(theme) {
    // Set data-theme attribute on document element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also set on body for compatibility
    document.body.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#202124' : '#ffffff');
    }
  },
  
  /**
   * Update the theme toggle button UI
   * @private
   */
  _updateToggleButton() {
    const iconEl = document.getElementById('theme-icon');
    const labelEl = document.getElementById('theme-label');
    const buttonEl = document.getElementById('theme-toggle-btn');
    
    if (this._currentTheme === this.THEMES.DARK) {
      if (iconEl) iconEl.textContent = '☀️';
      if (labelEl) labelEl.textContent = 'Light';
      if (buttonEl) buttonEl.setAttribute('title', 'Switch to Light Theme');
    } else {
      if (iconEl) iconEl.textContent = '🌙';
      if (labelEl) labelEl.textContent = 'Dark';
      if (buttonEl) buttonEl.setAttribute('title', 'Switch to Dark Theme');
    }
  },
  
  /**
   * Load theme preference from localStorage
   * @returns {string|null} Saved theme or null
   * @private
   */
  _loadThemePreference() {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('Could not load theme preference:', e);
      return null;
    }
  },
  
  /**
   * Save theme preference to localStorage
   * @param {string} theme - Theme to save
   * @private
   */
  _saveThemePreference(theme) {
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  },
  
  /**
   * Detect system color scheme preference
   * @returns {string} Detected theme
   * @private
   */
  _detectSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return this.THEMES.DARK;
    }
    return this.THEMES.LIGHT;
  },
  
  /**
   * Listen for system preference changes
   * @private
   */
  _listenForSystemChanges() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Only auto-switch if user hasn't set a preference
      mediaQuery.addEventListener('change', (e) => {
        const savedTheme = this._loadThemePreference();
        if (!savedTheme) {
          this.setTheme(e.matches ? this.THEMES.DARK : this.THEMES.LIGHT);
        }
      });
    }
  },
  
  /**
   * Notify all listeners of theme change
   * @param {string} newTheme - New theme
   * @param {string} previousTheme - Previous theme
   * @private
   */
  _notifyListeners(newTheme, previousTheme) {
    this._listeners.forEach(callback => {
      try {
        callback(newTheme, previousTheme);
      } catch (e) {
        console.error('Theme change listener error:', e);
      }
    });
  }
};

/**
 * Global toggle function for onclick handler
 */
function toggleTheme() {
  ThemeController.toggle();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeController.init());
} else {
  ThemeController.init();
}

// Export for module usage
if (typeof window !== 'undefined') {
  window.ThemeController = ThemeController;
  window.toggleTheme = toggleTheme;
}

export { ThemeController, toggleTheme };
