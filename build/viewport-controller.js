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
   * Uses SVG bounding box for accurate content measurement
   */
  fitToScreen() {
    if (!this._initialized || !this._svg) return;
    
    const svgNode = this._svg.node();
    const svgRect = svgNode.getBoundingClientRect();
    
    // Get the bounding box of ALL content in the SVG
    // First, reset transform to get accurate bbox
    const currentTransform = d3.zoomTransform(svgNode);
    
    // Temporarily reset to identity to measure true content bounds
    this._svg.call(this._zoom.transform, d3.zoomIdentity);
    
    // Get all content elements (nodes, flows, labels)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Measure all rects (nodes)
    svgNode.querySelectorAll('rect').forEach(rect => {
      const x = parseFloat(rect.getAttribute('x')) || 0;
      const y = parseFloat(rect.getAttribute('y')) || 0;
      const width = parseFloat(rect.getAttribute('width')) || 0;
      const height = parseFloat(rect.getAttribute('height')) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    
    // Measure all paths (flows)
    svgNode.querySelectorAll('path').forEach(path => {
      try {
        const bbox = path.getBBox();
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      } catch (e) { /* ignore paths without bbox */ }
    });
    
    // Measure all text elements (labels)
    svgNode.querySelectorAll('text').forEach(text => {
      try {
        const bbox = text.getBBox();
        // Account for text transform if in a group
        const parent = text.parentElement;
        let offsetX = 0, offsetY = 0;
        if (parent && parent.tagName === 'g') {
          const transform = parent.getAttribute('transform');
          if (transform) {
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
              offsetX = parseFloat(match[1]) || 0;
              offsetY = parseFloat(match[2]) || 0;
            }
          }
        }
        minX = Math.min(minX, bbox.x + offsetX);
        minY = Math.min(minY, bbox.y + offsetY);
        maxX = Math.max(maxX, bbox.x + bbox.width + offsetX);
        maxY = Math.max(maxY, bbox.y + bbox.height + offsetY);
      } catch (e) { /* ignore text without bbox */ }
    });
    
    // If no content found, reset to default
    if (!isFinite(minX) || !isFinite(minY)) {
      this.reset();
      return;
    }
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    if (contentWidth === 0 || contentHeight === 0) {
      this.reset();
      return;
    }
    
    // Calculate scale to fit content with padding
    const padding = 50;
    const availableWidth = svgRect.width - padding * 2;
    const availableHeight = svgRect.height - padding * 2;
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, this.config.maxZoom);
    
    // Clamp scale to reasonable bounds
    const clampedScale = Math.max(this.config.minZoom, Math.min(scale, 2.0));
    
    // Calculate translation to center content
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;
    const viewCenterX = svgRect.width / 2;
    const viewCenterY = svgRect.height / 2;
    
    const tx = viewCenterX - contentCenterX * clampedScale;
    const ty = viewCenterY - contentCenterY * clampedScale;
    
    // Apply transform with animation
    const newTransform = d3.zoomIdentity.translate(tx, ty).scale(clampedScale);
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
