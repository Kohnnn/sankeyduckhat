/**
 * RecentColorsManager - Manages recently used colors with FIFO behavior
 * Stores up to 5 most recently used colors in localStorage
 * 
 * Requirements: 4.2, 4.7
 */

const RecentColorsManager = {
  MAX_COLORS: 5,
  STORAGE_KEY: 'sankeymatic-recent-colors',

  /**
   * Get the list of recent colors
   * @returns {string[]} Array of hex color codes (max 5)
   */
  getRecentColors() {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const colors = JSON.parse(stored);
      if (!Array.isArray(colors)) return [];
      
      // Filter to valid hex colors and limit to MAX_COLORS
      return colors
        .filter(c => this.isValidHex(c))
        .slice(0, this.MAX_COLORS);
    } catch (e) {
      console.warn('RecentColorsManager: Error loading colors', e);
      return [];
    }
  },

  /**
   * Add a color to the recent list (FIFO)
   * @param {string} hexColor - Hex color code (with or without #)
   * @returns {boolean} True if color was added
   */
  addColor(hexColor) {
    if (!hexColor) return false;
    
    // Normalize the color
    const normalized = this.normalizeHex(hexColor);
    if (!normalized) return false;
    
    // Get current colors
    const colors = this.getRecentColors();
    
    // Remove if already exists (to move to front)
    const filtered = colors.filter(c => c.toLowerCase() !== normalized.toLowerCase());
    
    // Add to front
    filtered.unshift(normalized);
    
    // Trim to max size
    const trimmed = filtered.slice(0, this.MAX_COLORS);
    
    // Save to localStorage
    this._saveColors(trimmed);
    
    return true;
  },

  /**
   * Remove a color from the recent list
   * @param {string} hexColor - Hex color code to remove
   * @returns {boolean} True if color was removed
   */
  removeColor(hexColor) {
    if (!hexColor) return false;
    
    const normalized = this.normalizeHex(hexColor);
    if (!normalized) return false;
    
    const colors = this.getRecentColors();
    const filtered = colors.filter(c => c.toLowerCase() !== normalized.toLowerCase());
    
    if (filtered.length === colors.length) {
      return false; // Color wasn't in the list
    }
    
    this._saveColors(filtered);
    return true;
  },

  /**
   * Clear all recent colors
   */
  clear() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  },

  /**
   * Validate hex color format
   * @param {string} hex - Hex color string
   * @returns {boolean} True if valid
   */
  isValidHex(hex) {
    if (!hex || typeof hex !== 'string') return false;
    const normalized = hex.startsWith('#') ? hex : '#' + hex;
    return /^#[0-9A-Fa-f]{6}$/.test(normalized);
  },

  /**
   * Normalize hex color to #RRGGBB format
   * @param {string} hex - Hex color string
   * @returns {string|null} Normalized hex or null if invalid
   */
  normalizeHex(hex) {
    if (!hex || typeof hex !== 'string') return null;
    
    // Remove # if present
    let clean = hex.replace(/^#/, '');
    
    // Handle 3-character hex
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    
    // Validate
    if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
      return null;
    }
    
    return '#' + clean.toLowerCase();
  },

  /**
   * Save colors to localStorage
   * @param {string[]} colors - Array of hex colors
   */
  _saveColors(colors) {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      console.warn('RecentColorsManager: Error saving colors', e);
    }
  },

  /**
   * Render recent colors UI in a container
   * @param {HTMLElement} container - Container element
   * @param {Function} onSelect - Callback when color is selected (receives hex color)
   */
  renderRecentColors(container, onSelect) {
    if (!container) return;
    
    const colors = this.getRecentColors();
    
    // Clear container
    container.innerHTML = '';
    
    if (colors.length === 0) {
      container.innerHTML = '<span style="font-size:11px;color:#999;">No recent colors</span>';
      return;
    }
    
    // Create color swatches
    colors.forEach(color => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'recent-color-swatch';
      swatch.style.cssText = `
        width: 28px;
        height: 28px;
        border: 2px solid #ddd;
        border-radius: 4px;
        background-color: ${color};
        cursor: pointer;
        padding: 0;
        margin-right: 4px;
        transition: transform 0.1s, border-color 0.1s;
      `;
      swatch.title = color;
      swatch.setAttribute('data-color', color);
      
      // Hover effect
      swatch.addEventListener('mouseenter', () => {
        swatch.style.transform = 'scale(1.1)';
        swatch.style.borderColor = '#1a73e8';
      });
      swatch.addEventListener('mouseleave', () => {
        swatch.style.transform = 'scale(1)';
        swatch.style.borderColor = '#ddd';
      });
      
      // Click handler
      swatch.addEventListener('click', () => {
        if (typeof onSelect === 'function') {
          onSelect(color);
        }
      });
      
      container.appendChild(swatch);
    });
  },

  /**
   * Get the count of recent colors
   * @returns {number} Number of recent colors
   */
  getCount() {
    return this.getRecentColors().length;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.RecentColorsManager = RecentColorsManager;
}

// Export for module usage (testing)
export { RecentColorsManager };
