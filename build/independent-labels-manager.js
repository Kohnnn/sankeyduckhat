/**
 * IndependentLabelsManager - Manages free-floating text labels on the canvas
 * Labels can be dragged anywhere and are not attached to nodes
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

const IndependentLabelsManager = {
  // Storage key for localStorage persistence
  STORAGE_KEY: 'sankeymatic_independent_labels',
  
  // Array of label objects
  _labels: [],
  
  // Flag to track initialization
  _initialized: false,
  
  // Currently editing label (for popup)
  _editingLabel: null,

  /**
   * Initialize the manager and load saved labels
   */
  init() {
    if (this._initialized) return;
    this._load();
    this._initialized = true;
    console.log('IndependentLabelsManager: Initialized with', this._labels.length, 'labels');
  },

  /**
   * Add a new independent label
   * @param {Object} options - Label options
   * @param {string} options.text - Label text (default: 'New Label')
   * @param {number} options.x - X position (default: center of canvas)
   * @param {number} options.y - Y position (default: center of canvas)
   * @param {number} options.fontSize - Font size in pixels (default: 16)
   * @param {string} options.color - Text color (default: '#000000')
   * @param {string} options.fontFamily - Font family (default: 'sans-serif')
   * @param {boolean} options.bold - Bold text (default: false)
   * @param {boolean} options.italic - Italic text (default: false)
   * @returns {Object} The created label object
   */
  addLabel(options = {}) {
    const id = 'indep_label_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const center = this._getCanvasCenter();
    
    const label = {
      id,
      text: options.text || 'New Label',
      x: options.x !== undefined ? options.x : center.x,
      y: options.y !== undefined ? options.y : center.y,
      fontSize: options.fontSize || 16,
      color: options.color || '#000000',
      fontFamily: options.fontFamily || 'sans-serif',
      bold: options.bold || false,
      italic: options.italic || false,
      bgEnabled: options.bgEnabled || false,
      bgColor: options.bgColor || '#ffffff'
    };
    
    this._labels.push(label);
    this._renderLabel(label);
    this._save();
    
    // Update status
    if (typeof updateAIStatus === 'function') {
      updateAIStatus(`Added label: "${label.text}"`, 'success');
    }
    
    return label;
  },

  /**
   * Delete a label by ID
   * @param {string} id - Label ID to delete
   * @returns {boolean} True if label was deleted
   */
  deleteLabel(id) {
    const index = this._labels.findIndex(l => l.id === id);
    if (index === -1) return false;
    
    const label = this._labels[index];
    this._labels.splice(index, 1);
    
    // Remove from DOM
    const element = document.getElementById(id);
    if (element) {
      element.remove();
    }
    
    this._save();
    
    // Update status
    if (typeof updateAIStatus === 'function') {
      updateAIStatus(`Deleted label: "${label.text}"`, 'success');
    }
    
    return true;
  },

  /**
   * Update a label's properties
   * @param {string} id - Label ID to update
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated label or null if not found
   */
  updateLabel(id, updates) {
    const label = this._labels.find(l => l.id === id);
    if (!label) return null;
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && updates[key] !== undefined) {
        label[key] = updates[key];
      }
    });
    
    // Re-render the label
    this._removeRenderedLabel(id);
    this._renderLabel(label);
    this._save();
    
    return label;
  },

  /**
   * Get all labels
   * @returns {Array} Copy of labels array
   */
  getLabels() {
    return [...this._labels];
  },

  /**
   * Get a label by ID
   * @param {string} id - Label ID
   * @returns {Object|null} Label object or null
   */
  getLabel(id) {
    return this._labels.find(l => l.id === id) || null;
  },

  /**
   * Clear all labels
   */
  clearAll() {
    // Remove all rendered labels
    this._labels.forEach(label => {
      this._removeRenderedLabel(label.id);
    });
    
    this._labels = [];
    this._save();
  },

  /**
   * Get the center of the visible canvas
   * @returns {Object} { x, y } coordinates
   */
  _getCanvasCenter() {
    const svg = document.getElementById('sankey_svg');
    if (svg) {
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(' ').map(Number);
        return {
          x: parts[0] + parts[2] / 2,
          y: parts[1] + parts[3] / 2
        };
      }
      return {
        x: svg.clientWidth / 2 || 350,
        y: svg.clientHeight / 2 || 250
      };
    }
    return { x: 350, y: 250 };
  },

  /**
   * Render a label to the SVG
   * @param {Object} label - Label object to render
   */
  _renderLabel(label) {
    const svg = document.getElementById('sankey_svg');
    if (!svg) return;
    
    // Ensure the independent labels layer exists
    let layer = svg.querySelector('#independent_labels_layer');
    if (!layer) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.setAttribute('id', 'independent_labels_layer');
      svg.appendChild(layer);
    }
    
    // Create label group
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', label.id);
    group.setAttribute('class', 'independent-label');
    group.setAttribute('transform', `translate(${label.x}, ${label.y})`);
    group.setAttribute('data-label-id', label.id);
    
    // Create background rect if enabled
    if (label.bgEnabled) {
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('class', 'independent-label-bg');
      bg.setAttribute('fill', label.bgColor || '#ffffff');
      bg.setAttribute('rx', '4');
      bg.setAttribute('ry', '4');
      group.appendChild(bg);
    }
    
    // Create text element
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'independent-label-text');
    text.setAttribute('font-size', label.fontSize + 'px');
    text.setAttribute('fill', label.color);
    text.setAttribute('font-family', label.fontFamily);
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');
    
    if (label.bold) {
      text.setAttribute('font-weight', 'bold');
    }
    if (label.italic) {
      text.setAttribute('font-style', 'italic');
    }
    
    // Handle multi-line text
    const lines = label.text.split('\n');
    if (lines.length === 1) {
      text.textContent = label.text;
    } else {
      lines.forEach((line, index) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.textContent = line;
        tspan.setAttribute('x', '0');
        tspan.setAttribute('dy', index === 0 ? '0' : (label.fontSize * 1.2) + 'px');
        text.appendChild(tspan);
      });
    }
    
    group.appendChild(text);
    layer.appendChild(group);
    
    // Update background size after text is rendered
    if (label.bgEnabled) {
      this._updateBackgroundSize(group);
    }
    
    // Setup drag behavior
    this._setupDrag(group, label);
    
    // Setup double-click to edit
    this._setupDoubleClick(group, label);
  },

  /**
   * Update background rect size to fit text
   * @param {SVGGElement} group - Label group element
   */
  _updateBackgroundSize(group) {
    const text = group.querySelector('text');
    const bg = group.querySelector('rect');
    if (!text || !bg) return;
    
    const bbox = text.getBBox();
    const padding = 6;
    
    bg.setAttribute('x', bbox.x - padding);
    bg.setAttribute('y', bbox.y - padding);
    bg.setAttribute('width', bbox.width + padding * 2);
    bg.setAttribute('height', bbox.height + padding * 2);
  },

  /**
   * Remove a rendered label from DOM
   * @param {string} id - Label ID
   */
  _removeRenderedLabel(id) {
    const element = document.getElementById(id);
    if (element) {
      element.remove();
    }
  },

  /**
   * Setup drag behavior for a label
   * @param {SVGGElement} group - Label group element
   * @param {Object} label - Label object
   */
  _setupDrag(group, label) {
    // Check if D3 is available
    if (typeof d3 === 'undefined') {
      console.warn('IndependentLabelsManager: D3 not available for drag');
      return;
    }
    
    const self = this;
    let startX, startY;
    
    const drag = d3.drag()
      .on('start', function(event) {
        startX = label.x;
        startY = label.y;
        d3.select(this).raise().classed('dragging', true);
      })
      .on('drag', function(event) {
        label.x = startX + event.x - (event.subject?.x || 0);
        label.y = startY + event.y - (event.subject?.y || 0);
        d3.select(this).attr('transform', `translate(${label.x}, ${label.y})`);
      })
      .on('end', function(event) {
        d3.select(this).classed('dragging', false);
        self._save();
      });
    
    d3.select(group).call(drag);
  },

  /**
   * Setup double-click handler to open edit popup
   * @param {SVGGElement} group - Label group element
   * @param {Object} label - Label object
   */
  _setupDoubleClick(group, label) {
    const self = this;
    group.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      self.openEditPopup(label.id);
    });
  },

  /**
   * Open the edit popup for a label
   * @param {string} id - Label ID to edit
   */
  openEditPopup(id) {
    const label = this.getLabel(id);
    if (!label) return;
    
    this._editingLabel = label;
    
    // Check if popup exists, create if not
    let popup = document.getElementById('independent-label-popup');
    if (!popup) {
      this._createEditPopup();
      popup = document.getElementById('independent-label-popup');
    }
    
    // Populate popup with label values
    const textInput = document.getElementById('indep-label-text');
    const fontSizeInput = document.getElementById('indep-label-fontsize');
    const colorInput = document.getElementById('indep-label-color');
    const fontFamilySelect = document.getElementById('indep-label-fontfamily');
    const boldCheckbox = document.getElementById('indep-label-bold');
    const italicCheckbox = document.getElementById('indep-label-italic');
    const bgEnabledCheckbox = document.getElementById('indep-label-bg-enabled');
    const bgColorInput = document.getElementById('indep-label-bg-color');
    
    if (textInput) textInput.value = label.text;
    if (fontSizeInput) fontSizeInput.value = label.fontSize;
    if (colorInput) colorInput.value = label.color;
    if (fontFamilySelect) fontFamilySelect.value = label.fontFamily;
    if (boldCheckbox) boldCheckbox.checked = label.bold;
    if (italicCheckbox) italicCheckbox.checked = label.italic;
    if (bgEnabledCheckbox) bgEnabledCheckbox.checked = label.bgEnabled;
    if (bgColorInput) bgColorInput.value = label.bgColor || '#ffffff';
    
    // Show popup
    const overlay = document.getElementById('independent-label-popup-overlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  },

  /**
   * Create the edit popup HTML
   */
  _createEditPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'independent-label-popup-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" id="independent-label-popup">
        <div class="modal-header">
          <h3>Edit Label</h3>
          <button class="modal-close" onclick="IndependentLabelsManager.closeEditPopup()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="indep-label-text">Text</label>
            <textarea id="indep-label-text" rows="3" placeholder="Enter label text..."></textarea>
            <div class="hint">Use Enter for multi-line text</div>
          </div>
          <div class="form-group">
            <label for="indep-label-fontsize">Font Size</label>
            <input type="number" id="indep-label-fontsize" min="8" max="72" value="16">
          </div>
          <div class="form-group">
            <label for="indep-label-color">Text Color</label>
            <input type="color" id="indep-label-color" value="#000000">
          </div>
          <div class="form-group">
            <label for="indep-label-fontfamily">Font Family</label>
            <select id="indep-label-fontfamily">
              <option value="sans-serif">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              <option value="Inter">Inter</option>
              <option value="Manrope">Manrope</option>
              <option value="Roboto">Roboto</option>
            </select>
          </div>
          <div class="form-group">
            <label>Style</label>
            <div style="display: flex; gap: 16px;">
              <label style="display: flex; align-items: center; gap: 4px;">
                <input type="checkbox" id="indep-label-bold"> Bold
              </label>
              <label style="display: flex; align-items: center; gap: 4px;">
                <input type="checkbox" id="indep-label-italic"> Italic
              </label>
            </div>
          </div>
          <div class="form-group">
            <label>Background</label>
            <div style="display: flex; gap: 16px; align-items: center;">
              <label style="display: flex; align-items: center; gap: 4px;">
                <input type="checkbox" id="indep-label-bg-enabled"> Enable
              </label>
              <input type="color" id="indep-label-bg-color" value="#ffffff">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="IndependentLabelsManager.deleteCurrentLabel()" style="color: #dc3545;">Delete</button>
          <div style="flex: 1;"></div>
          <button class="btn btn-secondary" onclick="IndependentLabelsManager.closeEditPopup()">Cancel</button>
          <button class="btn btn-primary" onclick="IndependentLabelsManager.saveEditPopup()">Save</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeEditPopup();
      }
    });
  },

  /**
   * Close the edit popup
   */
  closeEditPopup() {
    const overlay = document.getElementById('independent-label-popup-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    this._editingLabel = null;
  },

  /**
   * Save changes from the edit popup
   */
  saveEditPopup() {
    if (!this._editingLabel) return;
    
    const textInput = document.getElementById('indep-label-text');
    const fontSizeInput = document.getElementById('indep-label-fontsize');
    const colorInput = document.getElementById('indep-label-color');
    const fontFamilySelect = document.getElementById('indep-label-fontfamily');
    const boldCheckbox = document.getElementById('indep-label-bold');
    const italicCheckbox = document.getElementById('indep-label-italic');
    const bgEnabledCheckbox = document.getElementById('indep-label-bg-enabled');
    const bgColorInput = document.getElementById('indep-label-bg-color');
    
    const updates = {
      text: textInput?.value || 'Label',
      fontSize: parseInt(fontSizeInput?.value) || 16,
      color: colorInput?.value || '#000000',
      fontFamily: fontFamilySelect?.value || 'sans-serif',
      bold: boldCheckbox?.checked || false,
      italic: italicCheckbox?.checked || false,
      bgEnabled: bgEnabledCheckbox?.checked || false,
      bgColor: bgColorInput?.value || '#ffffff'
    };
    
    this.updateLabel(this._editingLabel.id, updates);
    this.closeEditPopup();
  },

  /**
   * Delete the currently editing label
   */
  deleteCurrentLabel() {
    if (!this._editingLabel) return;
    
    if (confirm('Are you sure you want to delete this label?')) {
      this.deleteLabel(this._editingLabel.id);
      this.closeEditPopup();
    }
  },

  /**
   * Save labels to localStorage
   */
  _save() {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._labels));
    } catch (e) {
      console.warn('IndependentLabelsManager: Failed to save to localStorage', e);
    }
  },

  /**
   * Load labels from localStorage
   */
  _load() {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this._labels = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('IndependentLabelsManager: Failed to load from localStorage', e);
      this._labels = [];
    }
  },

  /**
   * Re-render all labels (call after diagram re-render)
   */
  renderAll() {
    // Remove existing layer
    const svg = document.getElementById('sankey_svg');
    if (svg) {
      const layer = svg.querySelector('#independent_labels_layer');
      if (layer) {
        layer.remove();
      }
    }
    
    // Re-render all labels
    this._labels.forEach(label => {
      this._renderLabel(label);
    });
  },

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Reset the manager (for testing)
   */
  reset() {
    this._labels = [];
    this._initialized = false;
    this._editingLabel = null;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.IndependentLabelsManager = IndependentLabelsManager;
}

// Export for module usage (testing)
export { IndependentLabelsManager };
