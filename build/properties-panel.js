/**
 * PropertiesPanelController - Manages context-sensitive properties display
 * Updates panel content based on current selection (node, flow, label, or canvas)
 * Wires to StudioUI selection changes for automatic updates
 * 
 * Requirements: 2.4, 4.3, 4.4, 4.5, 4.6, 3.5
 */

const PropertiesPanelController = {
  // Reference to the panel container element
  _panelContainer: null,
  
  // Current selection being displayed
  _currentSelection: null,
  
  // Property change callback
  _onPropertyChangeCallback: null,
  
  /**
   * Initialize the properties panel controller
   * @param {string|HTMLElement} containerSelector - CSS selector or element for the panel container
   */
  init(containerSelector) {
    if (typeof containerSelector === 'string') {
      this._panelContainer = document.querySelector(containerSelector);
    } else {
      this._panelContainer = containerSelector;
    }
    
    if (!this._panelContainer) {
      console.warn('PropertiesPanelController: Panel container not found');
      return;
    }
    
    // Wire to StudioUI selection changes
    if (typeof StudioUI !== 'undefined') {
      StudioUI.on('selectionChange', (data) => {
        this.updateForSelection(data.selection);
      });
    }
    
    // Show canvas properties by default
    this.updateForSelection(null);
  },
  
  /**
   * Update panel based on selection
   * @param {Object|null} selection - Selection info { type, id, element, data } or null for canvas
   */
  updateForSelection(selection) {
    this._currentSelection = selection;
    
    if (!this._panelContainer) {
      return;
    }
    
    // Clear current content
    this._panelContainer.innerHTML = '';
    
    if (!selection) {
      // No selection = show canvas properties
      this.renderCanvasProperties();
    } else {
      switch (selection.type) {
        case 'node':
          this.renderNodeProperties(selection.data);
          break;
        case 'flow':
          this.renderFlowProperties(selection.data);
          break;
        case 'label':
          this.renderLabelProperties(selection.data);
          break;
        default:
          this.renderCanvasProperties();
      }
    }
  },
  
  /**
   * Get current selection
   * @returns {Object|null}
   */
  getSelection() {
    return this._currentSelection;
  },

  /**
   * Render canvas/global properties view
   * Shows diagram width, height, margins, theme, node spacing
   * Requirements: 4.4
   */
  renderCanvasProperties() {
    const html = `
      <div class="properties-section">
        <div class="properties-header">
          <span class="properties-icon">📐</span>
          <span class="properties-title">Canvas Properties</span>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Diagram Size</div>
          <div class="property-row">
            <label for="prop-canvas-width">Width</label>
            <input type="number" id="prop-canvas-width" value="${this._getCanvasValue('size_w', 700)}" min="100" max="2000" />
            <span class="property-unit">px</span>
          </div>
          <div class="property-row">
            <label for="prop-canvas-height">Height</label>
            <input type="number" id="prop-canvas-height" value="${this._getCanvasValue('size_h', 500)}" min="100" max="2000" />
            <span class="property-unit">px</span>
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Margins</div>
          <div class="property-row-grid">
            <div class="property-cell">
              <label for="prop-margin-top">Top</label>
              <input type="number" id="prop-margin-top" value="${this._getCanvasValue('margin_t', 30)}" min="0" />
            </div>
            <div class="property-cell">
              <label for="prop-margin-right">Right</label>
              <input type="number" id="prop-margin-right" value="${this._getCanvasValue('margin_r', 80)}" min="0" />
            </div>
            <div class="property-cell">
              <label for="prop-margin-bottom">Bottom</label>
              <input type="number" id="prop-margin-bottom" value="${this._getCanvasValue('margin_b', 30)}" min="0" />
            </div>
            <div class="property-cell">
              <label for="prop-margin-left">Left</label>
              <input type="number" id="prop-margin-left" value="${this._getCanvasValue('margin_l', 80)}" min="0" />
            </div>
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Theme</div>
          <div class="property-row">
            <label for="prop-node-theme">Node Theme</label>
            <select id="prop-node-theme">
              <option value="a" ${this._getCanvasValue('node_theme', 'a') === 'a' ? 'selected' : ''}>Theme A</option>
              <option value="b" ${this._getCanvasValue('node_theme', 'a') === 'b' ? 'selected' : ''}>Theme B</option>
              <option value="c" ${this._getCanvasValue('node_theme', 'a') === 'c' ? 'selected' : ''}>Theme C</option>
              <option value="d" ${this._getCanvasValue('node_theme', 'a') === 'd' ? 'selected' : ''}>Theme D</option>
              <option value="none" ${this._getCanvasValue('node_theme', 'a') === 'none' ? 'selected' : ''}>Single Color</option>
            </select>
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Node Spacing</div>
          <div class="property-row">
            <label for="prop-node-spacing">Spacing %</label>
            <input type="number" id="prop-node-spacing" value="${this._getCanvasValue('node_spacing', 75)}" min="0" max="100" />
            <span class="property-unit">%</span>
          </div>
        </div>
      </div>
    `;
    
    this._panelContainer.innerHTML = html;
    this._wireCanvasPropertyHandlers();
  },

  /**
   * Render node-specific properties view
   * Shows node name, fill color, opacity, border color
   * Requirements: 4.5
   * @param {Object} nodeData - Node data object
   */
  renderNodeProperties(nodeData) {
    const nodeName = nodeData?.id || nodeData?.name || 'Unknown Node';
    const fillColor = nodeData?.fillColor || this._getNodeColor(nodeName) || '#888888';
    const opacity = nodeData?.opacity ?? 100;
    const borderColor = nodeData?.borderColor || '#666666';
    
    const html = `
      <div class="properties-section">
        <div class="properties-header">
          <span class="properties-icon">◼️</span>
          <span class="properties-title">Node Properties</span>
          <button type="button" class="properties-edit-btn" onclick="if(typeof openNodePopup==='function')openNodePopup('${this._escapeHtml(nodeName)}')" title="Open full node editor">✏️ Edit</button>
        </div>
        
        <div class="properties-group">
          <div class="property-row">
            <label for="prop-node-name">Name</label>
            <input type="text" id="prop-node-name" value="${this._escapeHtml(nodeName)}" readonly class="readonly" />
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Appearance</div>
          <div class="property-row">
            <label for="prop-node-fill">Fill Color</label>
            <input type="color" id="prop-node-fill" value="${fillColor}" />
            <input type="text" id="prop-node-fill-text" value="${fillColor}" class="color-text" />
          </div>
          <div class="property-row">
            <label for="prop-node-opacity">Opacity</label>
            <input type="range" id="prop-node-opacity" value="${opacity}" min="0" max="100" />
            <span class="property-value" id="prop-node-opacity-value">${opacity}%</span>
          </div>
          <div class="property-row">
            <label for="prop-node-border">Border Color</label>
            <input type="color" id="prop-node-border" value="${borderColor}" />
            <input type="text" id="prop-node-border-text" value="${borderColor}" class="color-text" />
          </div>
        </div>
      </div>
    `;
    
    this._panelContainer.innerHTML = html;
    this._wireNodePropertyHandlers(nodeName);
  },
  
  /**
   * Render label-specific properties view (separate from node)
   * Shows label text, font size, text color, alignment, background color, dimensions
   * Requirements: 4.5, 5.4
   * @param {Object} labelData - Label data object
   */
  renderLabelProperties(labelData) {
    const nodeId = labelData?.nodeId || labelData?.id || 'Unknown';
    const labelText = labelData?.text || nodeId;
    const fontSize = labelData?.fontSize || 16;
    const fontColor = labelData?.fontColor || '#000000';
    const alignment = labelData?.alignment || 'center';
    const bgColor = labelData?.backgroundColor || '#ffffff';
    const bgEnabled = labelData?.backgroundEnabled ?? false;
    const width = labelData?.width || 'auto';
    const height = labelData?.height || 'auto';
    
    const html = `
      <div class="properties-section">
        <div class="properties-header">
          <span class="properties-icon">🏷️</span>
          <span class="properties-title">Label Properties</span>
          <button type="button" class="properties-edit-btn" onclick="if(typeof openLabelPopup==='function')openLabelPopup('${this._escapeHtml(nodeId)}')" title="Open full label editor">✏️ Edit</button>
        </div>
        
        <div class="properties-group">
          <div class="property-row">
            <label for="prop-label-text">Label Text</label>
            <input type="text" id="prop-label-text" value="${this._escapeHtml(labelText)}" />
          </div>
          <div class="property-row">
            <label>For Node</label>
            <input type="text" value="${this._escapeHtml(nodeId)}" readonly class="readonly" />
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Typography</div>
          <div class="property-row">
            <label for="prop-label-fontsize">Font Size</label>
            <input type="number" id="prop-label-fontsize" value="${fontSize}" min="8" max="72" />
            <span class="property-unit">px</span>
          </div>
          <div class="property-row">
            <label for="prop-label-color">Text Color</label>
            <input type="color" id="prop-label-color" value="${fontColor}" />
            <input type="text" id="prop-label-color-text" value="${fontColor}" class="color-text" />
          </div>
          <div class="property-row">
            <label>Alignment</label>
            <div class="alignment-buttons">
              <button type="button" class="align-btn ${alignment === 'left' ? 'active' : ''}" data-align="left" title="Left">⬅</button>
              <button type="button" class="align-btn ${alignment === 'center' ? 'active' : ''}" data-align="center" title="Center">⬌</button>
              <button type="button" class="align-btn ${alignment === 'right' ? 'active' : ''}" data-align="right" title="Right">➡</button>
            </div>
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Background</div>
          <div class="property-row">
            <label for="prop-label-bg-enabled">Enable Background</label>
            <input type="checkbox" id="prop-label-bg-enabled" ${bgEnabled ? 'checked' : ''} />
          </div>
          <div class="property-row ${!bgEnabled ? 'disabled' : ''}">
            <label for="prop-label-bg-color">Background Color</label>
            <input type="color" id="prop-label-bg-color" value="${bgColor}" ${!bgEnabled ? 'disabled' : ''} />
            <input type="text" id="prop-label-bg-color-text" value="${bgColor}" class="color-text" ${!bgEnabled ? 'disabled' : ''} />
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Dimensions</div>
          <div class="property-row">
            <label for="prop-label-width">Width</label>
            <input type="text" id="prop-label-width" value="${width}" placeholder="auto" />
          </div>
          <div class="property-row">
            <label for="prop-label-height">Height</label>
            <input type="text" id="prop-label-height" value="${height}" placeholder="auto" />
          </div>
        </div>
      </div>
    `;
    
    this._panelContainer.innerHTML = html;
    this._wireLabelPropertyHandlers(nodeId);
  },

  /**
   * Render flow-specific properties view
   * Shows source name, target name, amount, color mode, curvature
   * Requirements: 4.6
   * @param {Object} flowData - Flow data object
   */
  renderFlowProperties(flowData) {
    const source = flowData?.source || 'Unknown';
    const target = flowData?.target || 'Unknown';
    const amount = flowData?.value ?? flowData?.amount ?? 0;
    const colorMode = flowData?.colorMode || 'outside_in';
    const curvature = flowData?.curvature ?? 50;
    const flowColor = flowData?.color || '#999999';
    
    const html = `
      <div class="properties-section">
        <div class="properties-header">
          <span class="properties-icon">〰️</span>
          <span class="properties-title">Flow Properties</span>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Connection</div>
          <div class="property-row">
            <label for="prop-flow-source">Source</label>
            <input type="text" id="prop-flow-source" value="${this._escapeHtml(source)}" readonly class="readonly" />
          </div>
          <div class="property-row">
            <label for="prop-flow-target">Target</label>
            <input type="text" id="prop-flow-target" value="${this._escapeHtml(target)}" readonly class="readonly" />
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Value</div>
          <div class="property-row">
            <label for="prop-flow-amount">Amount</label>
            <input type="number" id="prop-flow-amount" value="${amount}" min="0" step="0.01" />
          </div>
        </div>
        
        <div class="properties-group">
          <div class="properties-group-title">Appearance</div>
          <div class="property-row">
            <label for="prop-flow-colormode">Color Mode</label>
            <select id="prop-flow-colormode">
              <option value="outside_in" ${colorMode === 'outside_in' ? 'selected' : ''}>From outermost nodes</option>
              <option value="source" ${colorMode === 'source' ? 'selected' : ''}>From source node</option>
              <option value="target" ${colorMode === 'target' ? 'selected' : ''}>From target node</option>
              <option value="single" ${colorMode === 'single' ? 'selected' : ''}>Single color</option>
            </select>
          </div>
          <div class="property-row ${colorMode !== 'single' ? 'disabled' : ''}" id="prop-flow-color-row">
            <label for="prop-flow-color">Flow Color</label>
            <input type="color" id="prop-flow-color" value="${flowColor}" ${colorMode !== 'single' ? 'disabled' : ''} />
            <input type="text" id="prop-flow-color-text" value="${flowColor}" class="color-text" ${colorMode !== 'single' ? 'disabled' : ''} />
          </div>
          <div class="property-row">
            <label for="prop-flow-curvature">Curvature</label>
            <input type="range" id="prop-flow-curvature" value="${curvature}" min="10" max="90" />
            <span class="property-value" id="prop-flow-curvature-value">${curvature}%</span>
          </div>
        </div>
      </div>
    `;
    
    this._panelContainer.innerHTML = html;
    this._wireFlowPropertyHandlers(source, target);
  },
  
  /**
   * Handle property change from UI
   * Updates visual representation and underlying data model
   * Requirements: 3.5
   * @param {string} property - Property name
   * @param {*} value - New value
   * @param {*} oldValue - Previous value (optional, for undo support)
   */
  onPropertyChange(property, value, oldValue) {
    // Record undo action if UndoManager is available and we have selection info
    if (typeof UndoManager !== 'undefined' && this._currentSelection && oldValue !== undefined) {
      const action = UndoManager.createPropertyChangeAction(
        this._currentSelection.type,
        this._currentSelection.id,
        property,
        oldValue,
        value
      );
      UndoManager.recordAction(action);
    }
    
    // Emit property change event
    if (this._onPropertyChangeCallback) {
      this._onPropertyChangeCallback(property, value, this._currentSelection);
    }
    
    // Trigger re-render if needed
    if (typeof glob !== 'undefined' && glob.process_sankey) {
      glob.process_sankey();
    } else if (typeof window !== 'undefined' && window.process_sankey) {
      window.process_sankey();
    }
  },
  
  /**
   * Apply a property value directly (used by UndoManager)
   * @param {string} elementType - Type of element
   * @param {string} elementId - Element identifier
   * @param {string} property - Property name
   * @param {*} value - Value to apply
   */
  applyPropertyValue(elementType, elementId, property, value) {
    // Apply the property based on element type
    switch (elementType) {
      case 'node':
        this._updateNodeCustomization(elementId, property.replace('node.', ''), value);
        break;
      case 'label':
        this._updateLabelCustomization(elementId, property.replace('label.', ''), value);
        break;
      case 'flow':
        // Flow properties need source and target
        // This is a simplified implementation
        break;
    }
    
    // Trigger re-render
    if (typeof glob !== 'undefined' && glob.process_sankey) {
      glob.process_sankey();
    } else if (typeof window !== 'undefined' && window.process_sankey) {
      window.process_sankey();
    }
  },
  
  /**
   * Set callback for property changes
   * @param {Function} callback - Callback function(property, value, selection)
   */
  setPropertyChangeCallback(callback) {
    this._onPropertyChangeCallback = callback;
  },

  // ============ Private Helper Methods ============
  
  /**
   * Get canvas value from the page or return default
   * @param {string} optionId - Option element ID suffix
   * @param {*} defaultValue - Default value if not found
   * @returns {*}
   */
  _getCanvasValue(optionId, defaultValue) {
    const el = document.getElementById(`opt_${optionId}`);
    if (el) {
      if (el.type === 'checkbox') {
        return el.checked;
      }
      return el.value;
    }
    return defaultValue;
  },
  
  /**
   * Get node color from theme or custom settings
   * @param {string} nodeName - Node name
   * @returns {string|null}
   */
  _getNodeColor(nodeName) {
    // Try to get from custom node settings if available
    if (typeof window !== 'undefined' && window.nodeCustomizations) {
      const custom = window.nodeCustomizations[nodeName];
      if (custom && custom.fillColor) {
        return custom.fillColor;
      }
    }
    return null;
  },
  
  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string}
   */
  _escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  
  /**
   * Wire event handlers for canvas properties
   */
  _wireCanvasPropertyHandlers() {
    const self = this;
    
    // Width
    const widthInput = document.getElementById('prop-canvas-width');
    if (widthInput) {
      widthInput.addEventListener('change', function() {
        const optEl = document.getElementById('opt_size_w');
        if (optEl) optEl.value = this.value;
        self.onPropertyChange('canvas.width', parseInt(this.value, 10));
      });
    }
    
    // Height
    const heightInput = document.getElementById('prop-canvas-height');
    if (heightInput) {
      heightInput.addEventListener('change', function() {
        const optEl = document.getElementById('opt_size_h');
        if (optEl) optEl.value = this.value;
        self.onPropertyChange('canvas.height', parseInt(this.value, 10));
      });
    }
    
    // Margins
    ['top', 'right', 'bottom', 'left'].forEach(side => {
      const input = document.getElementById(`prop-margin-${side}`);
      if (input) {
        input.addEventListener('change', function() {
          const optId = `opt_margin_${side.charAt(0)}`;
          const optEl = document.getElementById(optId);
          if (optEl) optEl.value = this.value;
          self.onPropertyChange(`canvas.margin.${side}`, parseInt(this.value, 10));
        });
      }
    });
    
    // Theme
    const themeSelect = document.getElementById('prop-node-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', function() {
        const optEl = document.getElementById('opt_node_theme');
        if (optEl) optEl.value = this.value;
        self.onPropertyChange('canvas.theme', this.value);
      });
    }
    
    // Node spacing
    const spacingInput = document.getElementById('prop-node-spacing');
    if (spacingInput) {
      spacingInput.addEventListener('change', function() {
        const optEl = document.getElementById('opt_node_spacing');
        if (optEl) optEl.value = this.value;
        self.onPropertyChange('canvas.nodeSpacing', parseInt(this.value, 10));
      });
    }
  },
  
  /**
   * Wire event handlers for node properties
   * @param {string} nodeName - Node name
   */
  _wireNodePropertyHandlers(nodeName) {
    const self = this;
    
    // Fill color
    const fillInput = document.getElementById('prop-node-fill');
    const fillText = document.getElementById('prop-node-fill-text');
    if (fillInput) {
      fillInput.addEventListener('input', function() {
        if (fillText) fillText.value = this.value;
        self._updateNodeCustomization(nodeName, 'fillColor', this.value);
        self.onPropertyChange('node.fillColor', this.value);
      });
    }
    if (fillText) {
      fillText.addEventListener('change', function() {
        if (fillInput) fillInput.value = this.value;
        self._updateNodeCustomization(nodeName, 'fillColor', this.value);
        self.onPropertyChange('node.fillColor', this.value);
      });
    }
    
    // Opacity
    const opacityInput = document.getElementById('prop-node-opacity');
    const opacityValue = document.getElementById('prop-node-opacity-value');
    if (opacityInput) {
      opacityInput.addEventListener('input', function() {
        if (opacityValue) opacityValue.textContent = `${this.value}%`;
        self._updateNodeCustomization(nodeName, 'opacity', parseInt(this.value, 10));
        self.onPropertyChange('node.opacity', parseInt(this.value, 10));
      });
    }
    
    // Border color
    const borderInput = document.getElementById('prop-node-border');
    const borderText = document.getElementById('prop-node-border-text');
    if (borderInput) {
      borderInput.addEventListener('input', function() {
        if (borderText) borderText.value = this.value;
        self._updateNodeCustomization(nodeName, 'borderColor', this.value);
        self.onPropertyChange('node.borderColor', this.value);
      });
    }
    if (borderText) {
      borderText.addEventListener('change', function() {
        if (borderInput) borderInput.value = this.value;
        self._updateNodeCustomization(nodeName, 'borderColor', this.value);
        self.onPropertyChange('node.borderColor', this.value);
      });
    }
  },

  /**
   * Wire event handlers for label properties
   * @param {string} nodeId - Associated node ID
   */
  _wireLabelPropertyHandlers(nodeId) {
    const self = this;
    
    // Label text
    const textInput = document.getElementById('prop-label-text');
    if (textInput) {
      textInput.addEventListener('change', function() {
        self._updateLabelCustomization(nodeId, 'text', this.value);
        self.onPropertyChange('label.text', this.value);
      });
    }
    
    // Font size
    const fontSizeInput = document.getElementById('prop-label-fontsize');
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', function() {
        self._updateLabelCustomization(nodeId, 'fontSize', parseInt(this.value, 10));
        self.onPropertyChange('label.fontSize', parseInt(this.value, 10));
      });
    }
    
    // Text color
    const colorInput = document.getElementById('prop-label-color');
    const colorText = document.getElementById('prop-label-color-text');
    if (colorInput) {
      colorInput.addEventListener('input', function() {
        if (colorText) colorText.value = this.value;
        self._updateLabelCustomization(nodeId, 'fontColor', this.value);
        self.onPropertyChange('label.fontColor', this.value);
      });
    }
    if (colorText) {
      colorText.addEventListener('change', function() {
        if (colorInput) colorInput.value = this.value;
        self._updateLabelCustomization(nodeId, 'fontColor', this.value);
        self.onPropertyChange('label.fontColor', this.value);
      });
    }
    
    // Alignment buttons
    const alignButtons = document.querySelectorAll('.align-btn');
    alignButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        alignButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const alignment = this.getAttribute('data-align');
        self._updateLabelCustomization(nodeId, 'alignment', alignment);
        self.onPropertyChange('label.alignment', alignment);
      });
    });
    
    // Background enabled toggle
    const bgEnabledInput = document.getElementById('prop-label-bg-enabled');
    const bgColorInput = document.getElementById('prop-label-bg-color');
    const bgColorText = document.getElementById('prop-label-bg-color-text');
    if (bgEnabledInput) {
      bgEnabledInput.addEventListener('change', function() {
        const enabled = this.checked;
        if (bgColorInput) bgColorInput.disabled = !enabled;
        if (bgColorText) bgColorText.disabled = !enabled;
        
        const bgColorRow = bgColorInput?.closest('.property-row');
        if (bgColorRow) {
          bgColorRow.classList.toggle('disabled', !enabled);
        }
        
        self._updateLabelCustomization(nodeId, 'backgroundEnabled', enabled);
        self.onPropertyChange('label.backgroundEnabled', enabled);
      });
    }
    
    // Background color
    if (bgColorInput) {
      bgColorInput.addEventListener('input', function() {
        if (bgColorText) bgColorText.value = this.value;
        self._updateLabelCustomization(nodeId, 'backgroundColor', this.value);
        self.onPropertyChange('label.backgroundColor', this.value);
      });
    }
    if (bgColorText) {
      bgColorText.addEventListener('change', function() {
        if (bgColorInput) bgColorInput.value = this.value;
        self._updateLabelCustomization(nodeId, 'backgroundColor', this.value);
        self.onPropertyChange('label.backgroundColor', this.value);
      });
    }
    
    // Width
    const widthInput = document.getElementById('prop-label-width');
    if (widthInput) {
      widthInput.addEventListener('change', function() {
        const value = this.value === 'auto' ? 'auto' : parseInt(this.value, 10);
        self._updateLabelDimensions(nodeId, 'width', value);
        self.onPropertyChange('label.width', value);
      });
    }
    
    // Height
    const heightInput = document.getElementById('prop-label-height');
    if (heightInput) {
      heightInput.addEventListener('change', function() {
        const value = this.value === 'auto' ? 'auto' : parseInt(this.value, 10);
        self._updateLabelDimensions(nodeId, 'height', value);
        self.onPropertyChange('label.height', value);
      });
    }
  },
  
  /**
   * Wire event handlers for flow properties
   * @param {string} source - Source node name
   * @param {string} target - Target node name
   */
  _wireFlowPropertyHandlers(source, target) {
    const self = this;
    
    // Amount
    const amountInput = document.getElementById('prop-flow-amount');
    if (amountInput) {
      amountInput.addEventListener('change', function() {
        self._updateFlowData(source, target, 'amount', parseFloat(this.value));
        self.onPropertyChange('flow.amount', parseFloat(this.value));
      });
    }
    
    // Color mode
    const colorModeSelect = document.getElementById('prop-flow-colormode');
    const flowColorInput = document.getElementById('prop-flow-color');
    const flowColorText = document.getElementById('prop-flow-color-text');
    const flowColorRow = document.getElementById('prop-flow-color-row');
    
    if (colorModeSelect) {
      colorModeSelect.addEventListener('change', function() {
        const isSingle = this.value === 'single';
        if (flowColorInput) flowColorInput.disabled = !isSingle;
        if (flowColorText) flowColorText.disabled = !isSingle;
        if (flowColorRow) flowColorRow.classList.toggle('disabled', !isSingle);
        
        self._updateFlowData(source, target, 'colorMode', this.value);
        self.onPropertyChange('flow.colorMode', this.value);
      });
    }
    
    // Flow color
    if (flowColorInput) {
      flowColorInput.addEventListener('input', function() {
        if (flowColorText) flowColorText.value = this.value;
        self._updateFlowData(source, target, 'color', this.value);
        self.onPropertyChange('flow.color', this.value);
      });
    }
    if (flowColorText) {
      flowColorText.addEventListener('change', function() {
        if (flowColorInput) flowColorInput.value = this.value;
        self._updateFlowData(source, target, 'color', this.value);
        self.onPropertyChange('flow.color', this.value);
      });
    }
    
    // Curvature
    const curvatureInput = document.getElementById('prop-flow-curvature');
    const curvatureValue = document.getElementById('prop-flow-curvature-value');
    if (curvatureInput) {
      curvatureInput.addEventListener('input', function() {
        if (curvatureValue) curvatureValue.textContent = `${this.value}%`;
        self._updateFlowData(source, target, 'curvature', parseInt(this.value, 10));
        self.onPropertyChange('flow.curvature', parseInt(this.value, 10));
      });
    }
  },

  /**
   * Update node customization in global store
   * @param {string} nodeName - Node name
   * @param {string} property - Property name
   * @param {*} value - New value
   */
  _updateNodeCustomization(nodeName, property, value) {
    if (typeof window !== 'undefined') {
      if (!window.nodeCustomizations) {
        window.nodeCustomizations = {};
      }
      if (!window.nodeCustomizations[nodeName]) {
        window.nodeCustomizations[nodeName] = {};
      }
      window.nodeCustomizations[nodeName][property] = value;
    }
  },
  
  /**
   * Update label customization in global store
   * @param {string} nodeId - Associated node ID
   * @param {string} property - Property name
   * @param {*} value - New value
   */
  _updateLabelCustomization(nodeId, property, value) {
    if (typeof window !== 'undefined') {
      if (!window.labelCustomizations) {
        window.labelCustomizations = {};
      }
      if (!window.labelCustomizations[nodeId]) {
        window.labelCustomizations[nodeId] = {};
      }
      window.labelCustomizations[nodeId][property] = value;
    }
  },
  
  /**
   * Update label dimensions in CustomLayoutStore
   * @param {string} nodeId - Associated node ID
   * @param {string} dimension - 'width' or 'height'
   * @param {*} value - New value
   */
  _updateLabelDimensions(nodeId, dimension, value) {
    if (typeof CustomLayoutStore !== 'undefined') {
      const current = CustomLayoutStore.getLabelDimensions(nodeId) || { width: 'auto', height: 'auto' };
      current[dimension] = value;
      if (current.width !== 'auto' || current.height !== 'auto') {
        CustomLayoutStore.setLabelDimensions(
          nodeId,
          current.width === 'auto' ? 100 : current.width,
          current.height === 'auto' ? 30 : current.height
        );
      }
    }
  },
  
  /**
   * Update flow data in the data model
   * @param {string} source - Source node name
   * @param {string} target - Target node name
   * @param {string} property - Property name
   * @param {*} value - New value
   */
  _updateFlowData(source, target, property, value) {
    if (typeof window !== 'undefined') {
      if (!window.flowCustomizations) {
        window.flowCustomizations = {};
      }
      const flowKey = `${source}->${target}`;
      if (!window.flowCustomizations[flowKey]) {
        window.flowCustomizations[flowKey] = {};
      }
      window.flowCustomizations[flowKey][property] = value;
    }
  },
  
  /**
   * Reset the controller
   */
  reset() {
    this._currentSelection = null;
    if (this._panelContainer) {
      this.renderCanvasProperties();
    }
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.PropertiesPanelController = PropertiesPanelController;
}

// Export for module usage (testing)
export { PropertiesPanelController };
