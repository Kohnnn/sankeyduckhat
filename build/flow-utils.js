/**
 * FlowUtils - Utility functions for flow identification and lookup
 * Provides helper functions to find flow data by source/target attributes
 * 
 * Requirements: 7.3
 */

const FlowUtils = {
  /**
   * Escape special characters for use in CSS attribute selectors
   * @param {string} value - The value to escape
   * @returns {string} - The escaped value
   */
  _escapeAttributeValue(value) {
    // Escape characters that have special meaning in CSS attribute selectors
    return value.replace(/["\\]/g, '\\$&');
  },
  
  /**
   * Find a flow path element by source and target node names
   * @param {SVGElement|string} svgElement - SVG element or selector
   * @param {string} source - Source node name
   * @param {string} target - Target node name
   * @returns {SVGPathElement|null} - The flow path element or null if not found
   */
  findFlowBySourceTarget(svgElement, source, target) {
    let svg;
    if (typeof svgElement === 'string') {
      svg = document.querySelector(svgElement);
    } else {
      svg = svgElement;
    }
    
    if (!svg) {
      return null;
    }
    
    // Use iteration instead of CSS selector to handle special characters
    const paths = svg.querySelectorAll('path[data-source][data-target]');
    for (const path of paths) {
      if (path.getAttribute('data-source') === source && 
          path.getAttribute('data-target') === target) {
        return path;
      }
    }
    return null;
  },
  
  /**
   * Find all flow path elements from a specific source node
   * @param {SVGElement|string} svgElement - SVG element or selector
   * @param {string} source - Source node name
   * @returns {Array<SVGPathElement>} - Array of flow path elements
   */
  findFlowsFromSource(svgElement, source) {
    let svg;
    if (typeof svgElement === 'string') {
      svg = document.querySelector(svgElement);
    } else {
      svg = svgElement;
    }
    
    if (!svg) {
      return [];
    }
    
    // Use iteration instead of CSS selector to handle special characters
    const paths = svg.querySelectorAll('path[data-source][data-target]');
    const result = [];
    for (const path of paths) {
      if (path.getAttribute('data-source') === source) {
        result.push(path);
      }
    }
    return result;
  },
  
  /**
   * Find all flow path elements to a specific target node
   * @param {SVGElement|string} svgElement - SVG element or selector
   * @param {string} target - Target node name
   * @returns {Array<SVGPathElement>} - Array of flow path elements
   */
  findFlowsToTarget(svgElement, target) {
    let svg;
    if (typeof svgElement === 'string') {
      svg = document.querySelector(svgElement);
    } else {
      svg = svgElement;
    }
    
    if (!svg) {
      return [];
    }
    
    // Use iteration instead of CSS selector to handle special characters
    const paths = svg.querySelectorAll('path[data-source][data-target]');
    const result = [];
    for (const path of paths) {
      if (path.getAttribute('data-target') === target) {
        result.push(path);
      }
    }
    return result;
  },
  
  /**
   * Get flow metadata from a path element
   * @param {SVGPathElement} pathElement - The flow path element
   * @returns {Object|null} - Object with source and target, or null if not a flow
   */
  getFlowMetadata(pathElement) {
    if (!pathElement || pathElement.tagName !== 'path') {
      return null;
    }
    
    const source = pathElement.getAttribute('data-source');
    const target = pathElement.getAttribute('data-target');
    
    if (!source || !target) {
      return null;
    }
    
    return { source, target };
  },
  
  /**
   * Get all flows in the diagram with their metadata
   * @param {SVGElement|string} svgElement - SVG element or selector
   * @returns {Array<{element: SVGPathElement, source: string, target: string}>}
   */
  getAllFlows(svgElement) {
    let svg;
    if (typeof svgElement === 'string') {
      svg = document.querySelector(svgElement);
    } else {
      svg = svgElement;
    }
    
    if (!svg) {
      return [];
    }
    
    const flows = [];
    const paths = svg.querySelectorAll('path[data-source][data-target]');
    
    paths.forEach(path => {
      const metadata = this.getFlowMetadata(path);
      if (metadata) {
        flows.push({
          element: path,
          source: metadata.source,
          target: metadata.target
        });
      }
    });
    
    return flows;
  },
  
  /**
   * Check if a path element is a flow (has source and target attributes)
   * @param {SVGPathElement} pathElement - The path element to check
   * @returns {boolean} - True if the element is a flow
   */
  isFlow(pathElement) {
    return this.getFlowMetadata(pathElement) !== null;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.FlowUtils = FlowUtils;
}

// Export for module usage (testing)
export { FlowUtils };
