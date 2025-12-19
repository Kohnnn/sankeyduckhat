/**
 * Property-based tests for Flow Metadata Attributes
 * Feature: sankey-studio-canvas-refactor, Property 14: Flow Metadata Attributes
 * Validates: Requirements 7.1, 7.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { FlowUtils } from '../flow-utils.js';

// Helper to create mock flow path with data attributes
function createMockFlowPath(source, target) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('data-source', source);
  path.setAttribute('data-target', target);
  path.setAttribute('d', 'M0,0 L100,100'); // Simple path
  return path;
}

// Helper to create mock SVG container
function createMockSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'test-svg');
  return svg;
}

// Arbitrary for generating valid node names (non-empty, no special chars that break selectors)
const nodeNameArbitrary = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => s.trim().length > 0)
  .map(s => s.replace(/["\[\]]/g, '_')); // Remove chars that break attribute selectors

describe('Flow Metadata Property Tests', () => {
  let container;
  let svg;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    svg = createMockSvg();
    container.appendChild(svg);
  });
  
  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  /**
   * Property 14: Flow Metadata Attributes
   * For any rendered flow path element, the element should have both
   * `data-source` and `data-target` attributes containing the correct
   * source and target node names.
   * Validates: Requirements 7.1, 7.2
   */
  describe('Property 14: Flow Metadata Attributes', () => {
    
    it('flow path elements have data-source attribute with correct source node name', () => {
      fc.assert(
        fc.property(nodeNameArbitrary, nodeNameArbitrary, (source, target) => {
          // Arrange: Create a flow path with source and target
          const path = createMockFlowPath(source, target);
          svg.appendChild(path);
          
          // Act: Get the data-source attribute
          const dataSource = path.getAttribute('data-source');
          
          // Assert: data-source should equal the source node name
          expect(dataSource).toBe(source);
          
          // Cleanup
          svg.removeChild(path);
        }),
        { numRuns: 100 }
      );
    });

    it('flow path elements have data-target attribute with correct target node name', () => {
      fc.assert(
        fc.property(nodeNameArbitrary, nodeNameArbitrary, (source, target) => {
          // Arrange: Create a flow path with source and target
          const path = createMockFlowPath(source, target);
          svg.appendChild(path);
          
          // Act: Get the data-target attribute
          const dataTarget = path.getAttribute('data-target');
          
          // Assert: data-target should equal the target node name
          expect(dataTarget).toBe(target);
          
          // Cleanup
          svg.removeChild(path);
        }),
        { numRuns: 100 }
      );
    });

    it('FlowUtils.getFlowMetadata returns correct source and target for any flow', () => {
      fc.assert(
        fc.property(nodeNameArbitrary, nodeNameArbitrary, (source, target) => {
          // Arrange: Create a flow path
          const path = createMockFlowPath(source, target);
          svg.appendChild(path);
          
          // Act: Get metadata using FlowUtils
          const metadata = FlowUtils.getFlowMetadata(path);
          
          // Assert: Metadata should contain correct source and target
          expect(metadata).not.toBeNull();
          expect(metadata.source).toBe(source);
          expect(metadata.target).toBe(target);
          
          // Cleanup
          svg.removeChild(path);
        }),
        { numRuns: 100 }
      );
    });

    it('FlowUtils.findFlowBySourceTarget finds the correct flow element', () => {
      fc.assert(
        fc.property(nodeNameArbitrary, nodeNameArbitrary, (source, target) => {
          // Arrange: Create a flow path
          const path = createMockFlowPath(source, target);
          svg.appendChild(path);
          
          // Act: Find the flow using FlowUtils
          const foundPath = FlowUtils.findFlowBySourceTarget(svg, source, target);
          
          // Assert: Should find the same path element
          expect(foundPath).toBe(path);
          
          // Cleanup
          svg.removeChild(path);
        }),
        { numRuns: 100 }
      );
    });

    it('FlowUtils.isFlow returns true for elements with both data attributes', () => {
      fc.assert(
        fc.property(nodeNameArbitrary, nodeNameArbitrary, (source, target) => {
          // Arrange: Create a flow path
          const path = createMockFlowPath(source, target);
          
          // Act & Assert: isFlow should return true
          expect(FlowUtils.isFlow(path)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('FlowUtils.isFlow returns false for elements missing data attributes', () => {
      fc.assert(
        fc.property(nodeNameArbitrary, (nodeName) => {
          // Arrange: Create a path without data attributes
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M0,0 L100,100');
          
          // Act & Assert: isFlow should return false
          expect(FlowUtils.isFlow(path)).toBe(false);
          
          // Test with only data-source
          path.setAttribute('data-source', nodeName);
          expect(FlowUtils.isFlow(path)).toBe(false);
          
          // Test with only data-target
          path.removeAttribute('data-source');
          path.setAttribute('data-target', nodeName);
          expect(FlowUtils.isFlow(path)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('FlowUtils.getAllFlows returns all flows with correct metadata', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(nodeNameArbitrary, nodeNameArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          (flowPairs) => {
            // Arrange: Create multiple flow paths
            const paths = flowPairs.map(([source, target]) => {
              const path = createMockFlowPath(source, target);
              svg.appendChild(path);
              return { path, source, target };
            });
            
            // Act: Get all flows
            const allFlows = FlowUtils.getAllFlows(svg);
            
            // Assert: Should find all flows with correct metadata
            expect(allFlows.length).toBe(flowPairs.length);
            
            paths.forEach(({ path, source, target }) => {
              const found = allFlows.find(f => 
                f.element === path && 
                f.source === source && 
                f.target === target
              );
              expect(found).toBeDefined();
            });
            
            // Cleanup
            paths.forEach(({ path }) => svg.removeChild(path));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('FlowUtils.findFlowsFromSource returns all flows from a specific source', () => {
      fc.assert(
        fc.property(
          nodeNameArbitrary,
          fc.array(nodeNameArbitrary, { minLength: 1, maxLength: 5 }),
          (source, targets) => {
            // Arrange: Create flows from the same source to different targets
            const paths = targets.map(target => {
              const path = createMockFlowPath(source, target);
              svg.appendChild(path);
              return path;
            });
            
            // Act: Find flows from source
            const foundFlows = FlowUtils.findFlowsFromSource(svg, source);
            
            // Assert: Should find all flows from this source
            expect(foundFlows.length).toBe(targets.length);
            
            paths.forEach(path => {
              expect(Array.from(foundFlows)).toContain(path);
            });
            
            // Cleanup
            paths.forEach(path => svg.removeChild(path));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('FlowUtils.findFlowsToTarget returns all flows to a specific target', () => {
      fc.assert(
        fc.property(
          fc.array(nodeNameArbitrary, { minLength: 1, maxLength: 5 }),
          nodeNameArbitrary,
          (sources, target) => {
            // Arrange: Create flows from different sources to the same target
            const paths = sources.map(source => {
              const path = createMockFlowPath(source, target);
              svg.appendChild(path);
              return path;
            });
            
            // Act: Find flows to target
            const foundFlows = FlowUtils.findFlowsToTarget(svg, target);
            
            // Assert: Should find all flows to this target
            expect(foundFlows.length).toBe(sources.length);
            
            paths.forEach(path => {
              expect(Array.from(foundFlows)).toContain(path);
            });
            
            // Cleanup
            paths.forEach(path => svg.removeChild(path));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
