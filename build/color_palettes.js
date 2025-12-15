/**
 * Color Palettes Module for SankeyMATIC
 * Manages default and custom color palettes for node coloring
 */

(function colorPalettesModule(glob) {
  'use strict';

  // localStorage keys
  const STORAGE_KEY_CUSTOM = 'skm_custom_palettes';
  const STORAGE_KEY_DEFAULT = 'skm_default_palette';

  // Default palettes (matching existing colorThemes from sankeymatic.js)
  // IDs match the original theme keys: 'a', 'b', 'c', 'd', 'none'
  const defaultPalettes = new Map([
    ['none', {
      id: 'none',
      name: 'Single Color',
      colors: ['#888888'], // Single color mode - will use node_color setting
      isCustom: false
    }],
    ['a', {
      id: 'a',
      name: 'Categories',
      colors: [], // Will be populated from d3.schemeCategory10
      isCustom: false
    }],
    ['b', {
      id: 'b',
      name: 'Tableau10',
      colors: [], // Will be populated from d3.schemeTableau10
      isCustom: false
    }],
    ['c', {
      id: 'c',
      name: 'Dark',
      colors: [], // Will be populated from d3.schemeDark2
      isCustom: false
    }],
    ['d', {
      id: 'd',
      name: 'Varied',
      colors: [], // Will be populated from d3.schemeSet3
      isCustom: false
    }]
  ]);

  // Custom palettes (loaded from localStorage)
  const customPalettes = new Map();

  /**
   * Initialize default palettes with D3 color schemes.
   * Must be called after D3 is loaded to populate color arrays.
   * @returns {void}
   */
  function initializeDefaults() {
    if (typeof d3 !== 'undefined') {
      defaultPalettes.get('a').colors = [...d3.schemeCategory10];
      defaultPalettes.get('b').colors = [...d3.schemeTableau10];
      defaultPalettes.get('c').colors = [...d3.schemeDark2];
      defaultPalettes.get('d').colors = [...d3.schemeSet3];
    }
  }

  /**
   * Update the single color for 'none' palette.
   * Used when the user selects a single color mode.
   * @param {string} color - Hex color string (e.g., '#ff0000')
   * @returns {void}
   */
  function setSingleColor(color) {
    const nonePalette = defaultPalettes.get('none');
    if (nonePalette) {
      nonePalette.colors = [color];
    }
  }

  /**
   * Load custom palettes from localStorage.
   * Automatically called on module initialization.
   * Handles errors gracefully by logging warnings.
   * @returns {void}
   */
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM);
      if (stored) {
        const palettes = JSON.parse(stored);
        palettes.forEach(p => {
          customPalettes.set(p.id, { ...p, isCustom: true });
        });
      }
    } catch (e) {
      console.warn('Failed to load custom palettes from localStorage:', e);
    }
  }

  /**
   * Save custom palettes to localStorage.
   * Called automatically after palette modifications.
   * Handles errors gracefully by logging warnings.
   * @private
   * @returns {void}
   */
  function saveToStorage() {
    try {
      const palettes = Array.from(customPalettes.values());
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(palettes));
    } catch (e) {
      console.warn('Failed to save custom palettes to localStorage:', e);
    }
  }

  /**
   * Get a palette by ID.
   * Searches both default and custom palettes.
   * @param {string} id - Palette ID (e.g., 'a', 'custom_mybrand')
   * @returns {Object|null} Palette object with {id, name, colors, isCustom} or null if not found
   */
  function get(id) {
    return defaultPalettes.get(id) || customPalettes.get(id) || null;
  }

  /**
   * Get color for a node at given index using modulo cycling.
   * Colors cycle through the palette when index exceeds palette length.
   * @param {string} paletteId - Palette ID (e.g., 'a', 'custom_mybrand')
   * @param {number} index - Node index (0-based)
   * @returns {string} Hex color string (e.g., '#ff0000'), or '#888888' if palette not found
   */
  function getColorForIndex(paletteId, index) {
    const palette = get(paletteId);
    if (!palette || palette.colors.length === 0) {
      return '#888888'; // Fallback gray
    }
    return palette.colors[index % palette.colors.length];
  }

  /**
   * Save a custom palette.
   * Validates hex colors and persists to localStorage.
   * @param {string} name - Palette name (user-friendly display name)
   * @param {string[]} colors - Array of hex color strings (e.g., ['#ff0000', '#00ff00'])
   * @returns {Object} The saved palette object with {id, name, colors, isCustom}
   * @throws {Error} If no valid hex colors are provided
   */
  function saveCustom(name, colors) {
    // Validate colors
    const validColors = colors.filter(c => /^#[a-f0-9]{6}$/i.test(c));
    if (validColors.length === 0) {
      throw new Error('No valid hex colors provided');
    }

    const id = 'custom_' + name.toLowerCase().replace(/\s+/g, '_');
    const palette = {
      id,
      name,
      colors: validColors,
      isCustom: true
    };

    customPalettes.set(id, palette);
    saveToStorage();
    return palette;
  }

  /**
   * Delete a custom palette.
   * Only custom palettes can be deleted (not default palettes).
   * @param {string} id - Palette ID to delete (e.g., 'custom_mybrand')
   * @returns {boolean} True if deleted successfully, false if not found
   */
  function deleteCustom(id) {
    if (customPalettes.has(id)) {
      customPalettes.delete(id);
      saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Get all palette options for dropdown.
   * Returns both default and custom palettes.
   * @returns {Object[]} Array of palette option objects with {id, name, isCustom}
   */
  function getAllOptions() {
    const options = [];
    
    // Add default palettes
    defaultPalettes.forEach(p => {
      options.push({ id: p.id, name: p.name, isCustom: false });
    });
    
    // Add custom palettes
    customPalettes.forEach(p => {
      options.push({ id: p.id, name: p.name, isCustom: true });
    });
    
    return options;
  }

  /**
   * Get the default palette preference from localStorage.
   * @returns {string|null} Default palette ID (e.g., 'a') or null if not set
   */
  function getDefaultPalette() {
    return localStorage.getItem(STORAGE_KEY_DEFAULT);
  }

  /**
   * Set the default palette preference in localStorage.
   * @param {string|null} id - Palette ID (e.g., 'a') or null to clear preference
   * @returns {void}
   */
  function setDefaultPalette(id) {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY_DEFAULT);
    } else {
      localStorage.setItem(STORAGE_KEY_DEFAULT, id);
    }
  }

  // Export the module
  glob.ColorPalettes = {
    initializeDefaults,
    loadFromStorage,
    get,
    getColorForIndex,
    saveCustom,
    deleteCustom,
    getAllOptions,
    getDefaultPalette,
    setDefaultPalette,
    setSingleColor
  };

})(typeof window !== 'undefined' ? window : global);
