/**
 * Property-based tests for Selection Visual Feedback
 * Feature: sankey-studio-canvas-refactor, Property 12: Selection Visual Feedback
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { SelectionManager } from '../selection-manager.js';

// Mock d3 for testing
const mockD3 = {
  select: (element) => ({
    attr: (name, value) => {
      if (value !== undefined) {
        element.setAttribute(name, value);
        return mockD3.select(element);
      }
      return element.getAttribute(name);
    }
  })
};

// Set up global d3 mock
global.d3 = mockD3;

// Helper to create mock SVG elements
function createMockNodeRect(nodeId) {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('data-node-id', nodeId);
  rect.setAttribute('stroke', 'black');
  rect.setAttribute('stroke-width', '1');
  return rect;
}

function createMockFlowPath(source, target) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('data-source', source);
  path.setAttribute('data-target', target);
  path.setAttribute('stroke-width', '5');
  return path;
}

function createMockLabelGroup(nodeId) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'sankey-label');
  group.setAttribute('data-label-for', nodeId);
  
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('class', 'label-bg');
  bgRect.setAttribute('stroke', 'none');
  bgRect.setAttribute('stroke-width', '0');
  group.appendChild(bgRect);
  
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.textContent = nodeId;
  group.appendChild(text);
  
  return group;
}

// Arbitrary for generating valid node IDs
const nodeIdArbitrary = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0 && !s.includes(' '));

// Arbitrary for element types
const elementTypeArbitrary = fc.constantFrom('node', 'flow', 'label');

describe('Selection Visual Feedback Property Tests', () => {
  let container;
  
  beforeEach(() => {
    // Reset SelectionManager state
    SelectionManager.reset();
    
    // Create a container for test elements
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  /**
   * Property 12: Selection Visual Feedback
   * For any selected element, a distinctive visual style (CSS class or inline style)
   * should be applied, and upon deselection, all selection styles should be removed.
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4
   */
  describe('Property 12: Selection Visual Feedback', () => {
    
    it('selecting a node applies the selected CSS class', () => {
      fc.assert(
        fc.property(nodeIdArbitrary, (nodeId) => {
          const rect = createMockNodeRect(nodeId);
          container.appendChild(rect);
          
          // Act: Select the node
          SelectionManager.select(rect, 'node');
          
          // Assert: Element should have 'selected' class
          expect(rect.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
          
          // Cleanup
          SelectionManager.reset();
        }),
        { numRuns: 100 }
      );
    });

    it('selecting a flow applies the selected CSS class', () => {
      fc.assert(
        fc.property(nodeIdArbitrary, nodeIdArbitrary, (source, target) => {
          const path = createMockFlowPath(source, target);
          container.appendChild(path);
          
          // Act: Select the flow
          SelectionManager.select(path, 'flow');
          
          // Assert: Element should have 'selected' class
          expect(path.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
          
          // Cleanup
          SelectionManager.reset();
        }),
        { numRuns: 100 }
      );
    });

    it('selecting a label applies the selected CSS class', () => {
      fc.assert(
        fc.property(nodeIdArbitrary, (nodeId) => {
          const labelGroup = createMockLabelGroup(nodeId);
          container.appendChild(labelGroup);
          
          // Act: Select the label
          SelectionManager.select(labelGroup, 'label');
          
          // Assert: Element should have 'selected' class
          expect(labelGroup.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
          
          // Cleanup
          SelectionManager.reset();
        }),
        { numRuns: 100 }
      );
    });

    it('deselecting removes the selected CSS class (Requirement 6.4)', () => {
      fc.assert(
        fc.property(elementTypeArbitrary, nodeIdArbitrary, (type, nodeId) => {
          let element;
          
          // Create appropriate element based on type
          switch (type) {
            case 'node':
              element = createMockNodeRect(nodeId);
              break;
            case 'flow':
              element = createMockFlowPath(nodeId, nodeId + '_target');
              break;
            case 'label':
              element = createMockLabelGroup(nodeId);
              break;
          }
          
          container.appendChild(element);
          
          // Select then deselect
          SelectionManager.select(element, type);
          expect(element.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
          
          SelectionManager.deselect();
          
          // Assert: Element should NOT have 'selected' class after deselection
          expect(element.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(false);
          
          // Cleanup
          SelectionManager.reset();
        }),
        { numRuns: 100 }
      );
    });

    it('selecting a new element removes selection from previous element', () => {
      fc.assert(
        fc.property(
          elementTypeArbitrary, nodeIdArbitrary,
          elementTypeArbitrary, nodeIdArbitrary,
          (type1, nodeId1, type2, nodeId2) => {
            let element1, element2;
            
            // Create first element
            switch (type1) {
              case 'node':
                element1 = createMockNodeRect(nodeId1);
                break;
              case 'flow':
                element1 = createMockFlowPath(nodeId1, nodeId1 + '_target');
                break;
              case 'label':
                element1 = createMockLabelGroup(nodeId1);
                break;
            }
            
            // Create second element
            switch (type2) {
              case 'node':
                element2 = createMockNodeRect(nodeId2 + '_2');
                break;
              case 'flow':
                element2 = createMockFlowPath(nodeId2 + '_2', nodeId2 + '_target2');
                break;
              case 'label':
                element2 = createMockLabelGroup(nodeId2 + '_2');
                break;
            }
            
            container.appendChild(element1);
            container.appendChild(element2);
            
            // Select first element
            SelectionManager.select(element1, type1);
            expect(element1.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
            
            // Select second element
            SelectionManager.select(element2, type2);
            
            // Assert: First element should NOT have 'selected' class
            expect(element1.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(false);
            // Assert: Second element should have 'selected' class
            expect(element2.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
            
            // Cleanup
            SelectionManager.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('selection state is correctly tracked after multiple selections', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(elementTypeArbitrary, nodeIdArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          (selections) => {
            const elements = [];
            
            // Create all elements
            selections.forEach(([type, nodeId], index) => {
              let element;
              const uniqueId = `${nodeId}_${index}`;
              
              switch (type) {
                case 'node':
                  element = createMockNodeRect(uniqueId);
                  break;
                case 'flow':
                  element = createMockFlowPath(uniqueId, uniqueId + '_target');
                  break;
                case 'label':
                  element = createMockLabelGroup(uniqueId);
                  break;
              }
              
              container.appendChild(element);
              elements.push({ element, type });
            });
            
            // Select each element in sequence
            elements.forEach(({ element, type }) => {
              SelectionManager.select(element, type);
            });
            
            // Assert: Only the last element should be selected
            const lastElement = elements[elements.length - 1].element;
            
            elements.forEach(({ element }, index) => {
              if (index === elements.length - 1) {
                expect(element.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
              } else {
                expect(element.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(false);
              }
            });
            
            // Cleanup
            SelectionManager.reset();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
