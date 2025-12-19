/**
 * ViewportController - Manages infinite canvas behavior with pan/zoom capabilities
 * Implements D3 zoom behavior with transform tracking
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

const ViewportController = {
  // Internal state
  _svg: null,
  _viewport: null,
  _zoom: null,
  _transform: { x: 0, y: 0, scale: 1 },
  _gridElement: null,
  _initialized: false,
  
  // Configuration
  config: {
    minZoom: 0.1,
    maxZoom: 5.0,
    zoomStep: 0.1
  },

  /**
   * Initialize viewport on SVG element
   * Creates viewport wrapper structure and sets up zoom behavior
   * @param {SVGElement} svgElement - The main SVG element
   */
  init(svgElement) {
    if (!svgElement) {
      console.warn('ViewportController: No SVG element provided');
      return;
    }

    this._svg = d3.select(svgElement);
    this._initialized = true;
    
    // Create the viewport structure
    this._createViewportStructure();
    
    // Set up D3 zoom behavior
    this._setupZoomBehavior();
    
    // Notify StudioUI of initial viewport state
    if (typeof StudioUI !== 'undefined') {
      StudioUI.updateViewport(this._transform);
    }
  },

  /**
   * Create viewport wrapper structure
   * Wraps existing SVG content in a viewport group
   */
  _createViewportStructure() {
    // Check if viewport already exists
    let viewport = this._svg.select('g.viewport');
    
    if (viewport.empty()) {
      // Get all existing children except defs
      const existingContent = this._svg.selectAll(':scope > *:not(defs)');
      
      // Create viewport group
      viewport = this._svg.append('g')
        .attr('class', 'viewport');
      
      // Move existing content into viewport
      existingContent.each(function() {
        viewport.node().appendChild(this);
      });
    }
    
    this._viewport = viewport;
  },

  /**
   * Set up D3 zoom behavior with transform tracking
   */
  _setupZoomBehavior() {
    const self = this;
    
    this._zoom = d3.zoom()
      .scaleExtent([this.config.minZoom, this.config.maxZoom])
      .on('zoom', function(event) {
        self._onZoom(event);
      });
    
    // Apply zoom behavior to SVG
    this._svg.call(this._zoom);
    
    // Disable double-click zoom (can interfere with selection)
    this._svg.on('dblclick.zoom', null);
  },

  /**
   * Handle zoom events from D3
   * @param {Object} event - D3 zoom event
   */
  _onZoom(event) {
    const transform = event.transform;
    
    // Update internal state
    this._transform = {
      x: transform.x,
      y: transform.y,
      scale: transform.k
    };
    
    // Apply transform to viewport
    if (this._viewport) {
      this._viewport.attr('transform', transform);
    }
    
    // Update StudioUI
    if (typeof StudioUI !== 'undefined') {
      StudioUI.updateViewport(this._transform);
    }
    
    // Update zoom level display if element exists
    this._updateZoomDisplay();
  },

  /**
   * Update the zoom level display element
   */
  _updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoom-level');
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(this._transform.scale * 100)}%`;
    }
  },

  /**
   * Pan the viewport by delta
   * @param {number} dx - Delta X
   * @param {number} dy - Delta Y
   */
  pan(dx, dy) {
    if (!this._initialized || !this._svg) return;
    
    const currentTransform = d3.zoomTransform(this._svg.node());
    const newTransform = currentTransform.translate(dx / currentTransform.k, dy / currentTransform.k);
    
    this._svg.call(this._zoom.transform, newTransform);
  },

  /**
   * Zoom centered on a point
   * @param {number} scaleDelta - Change in scale (positive = zoom in, negative = zoom out)
   * @param {number} centerX - Center X coordinate (screen space)
   * @param {number} centerY - Center Y coordinate (screen space)
   */
  zoom(scaleDelta, centerX, centerY) {
    if (!this._initialized || !this._svg) return;
    
    const currentTransform = d3.zoomTransform(this._svg.node());
    const newScale = Math.max(
      this.config.minZoom,
      Math.min(this.config.maxZoom, currentTransform.k + scaleDelta)
    );
    
    // If center point provided, zoom towards that point
    if (centerX !== undefined && centerY !== undefined) {
      const svgRect = this._svg.node().getBoundingClientRect();
      const x = centerX - svgRect.left;
      const y = centerY - svgRect.top;
      
      // Calculate new transform that keeps the center point fixed
      const k = newScale;
      const x0 = x - (x - currentTransform.x) * (k / currentTransform.k);
      const y0 = y - (y - currentTransform.y) * (k / currentTransform.k);
      
      const newTransform = d3.zoomIdentity.translate(x0, y0).scale(k);
      this._svg.call(this._zoom.transform, newTransform);
    } else {
      // Zoom from center of SVG
      const svgRect = this._svg.node().getBoundingClientRect();
      this.zoom(scaleDelta, svgRect.width / 2, svgRect.height / 2);
    }
  },

  /**
   * Zoom in by one step
   * @param {number} [centerX] - Optional center X coordinate
   * @param {number} [centerY] - Optional center Y coordinate
   */
  zoomIn(centerX, centerY) {
    this.zoom(this.config.zoomStep, centerX, centerY);
  },

  /**
   * Zoom out by one step
   * @param {number} [centerX] - Optional center X coordinate
   * @param {number} [centerY] - Optional center Y coordinate
   */
  zoomOut(centerX, centerY) {
    this.zoom(-this.config.zoomStep, centerX, centerY);
  },

  /**
   * Set zoom to a specific scale
   * @param {number} scale - Target scale (1.0 = 100%)
   * @param {number} [centerX] - Optional center X coordinate
   * @param {number} [centerY] - Optional center Y coordinate
   */
  setZoom(scale, centerX, centerY) {
    if (!this._initialized || !this._svg) return;
    
    const clampedScale = Math.max(
      this.config.minZoom,
      Math.min(this.config.maxZoom, scale)
    );
    
    const currentTransform = d3.zoomTransform(this._svg.node());
    const scaleDelta = clampedScale - currentTransform.k;
    
    this.zoom(scaleDelta, centerX, centerY);
  },

  /**
   * Fit diagram to screen
   * Calculates optimal zoom and pan to show entire diagram
   */
  fitToScreen() {
    if (!this._initialized || !this._svg || !this._viewport) return;
    
    const svgNode = this._svg.node();
    const svgRect = svgNode.getBoundingClientRect();
    
    // Get the bounding box of the viewport content
    const viewportNode = this._viewport.node();
    const bbox = viewportNode.getBBox();
    
    if (bbox.width === 0 || bbox.height === 0) {
      this.reset();
      return;
    }
    
    // Calculate scale to fit content with padding
    const padding = 40;
    const scaleX = (svgRect.width - padding * 2) / bbox.width;
    const scaleY = (svgRect.height - padding * 2) / bbox.height;
    const scale = Math.min(scaleX, scaleY, this.config.maxZoom);
    
    // Calculate translation to center content
    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;
    const contentCenterX = bbox.x + bbox.width / 2;
    const contentCenterY = bbox.y + bbox.height / 2;
    
    const tx = centerX - contentCenterX * scale;
    const ty = centerY - contentCenterY * scale;
    
    // Apply transform
    const newTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    this._svg.transition().duration(300).call(this._zoom.transform, newTransform);
  },

  /**
   * Reset to default view (scale 1, no pan)
   */
  reset() {
    if (!this._initialized || !this._svg) return;
    
    this._svg.transition().duration(300).call(
      this._zoom.transform,
      d3.zoomIdentity
    );
  },

  /**
   * Get current transform
   * @returns {{ x: number, y: number, scale: number }} Current transform
   */
  getTransform() {
    return { ...this._transform };
  },

  /**
   * Convert screen coordinates to diagram coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {{ x: number, y: number }} Diagram coordinates
   */
  screenToDiagram(screenX, screenY) {
    if (!this._initialized || !this._svg) {
      return { x: screenX, y: screenY };
    }
    
    const svgRect = this._svg.node().getBoundingClientRect();
    const svgX = screenX - svgRect.left;
    const svgY = screenY - svgRect.top;
    
    // Apply inverse transform
    const x = (svgX - this._transform.x) / this._transform.scale;
    const y = (svgY - this._transform.y) / this._transform.scale;
    
    return { x, y };
  },

  /**
   * Convert diagram coordinates to screen coordinates
   * @param {number} diagramX - Diagram X coordinate
   * @param {number} diagramY - Diagram Y coordinate
   * @returns {{ x: number, y: number }} Screen coordinates
   */
  diagramToScreen(diagramX, diagramY) {
    if (!this._initialized || !this._svg) {
      return { x: diagramX, y: diagramY };
    }
    
    const svgRect = this._svg.node().getBoundingClientRect();
    
    // Apply transform
    const svgX = diagramX * this._transform.scale + this._transform.x;
    const svgY = diagramY * this._transform.scale + this._transform.y;
    
    return {
      x: svgX + svgRect.left,
      y: svgY + svgRect.top
    };
  },

  /**
   * Check if viewport is initialized
   * @returns {boolean} Whether viewport is initialized
   */
  isInitialized() {
    return this._initialized;
  },

  /**
   * Destroy viewport controller and clean up
   */
  destroy() {
    if (this._svg) {
      this._svg.on('.zoom', null);
    }
    this._svg = null;
    this._viewport = null;
    this._zoom = null;
    this._transform = { x: 0, y: 0, scale: 1 };
    this._initialized = false;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.ViewportController = ViewportController;
}

// Export for module usage (testing)
export { ViewportController };
