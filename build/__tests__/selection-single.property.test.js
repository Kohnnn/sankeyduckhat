/**
 * Property-based tests for Single Selection Enforcement
 * Feature: sankey-studio-canvas-refactor, Property 13: Single Selection Enforcement
 * Validates: Requirements 6.5
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

// Helper to create element based on type
function createElement(type, nodeId, index) {
  const uniqueId = `${nodeId}_${index}`;
  switch (type) {
    case 'node':
      return createMockNodeRect(uniqueId);
    case 'flow':
      return createMockFlowPath(uniqueId, uniqueId + '_target');
    case 'label':
      return createMockLabelGroup(uniqueId);
    default:
      return createMockNodeRect(uniqueId);
  }
}

describe('Single Selection Enforcement Property Tests', () => {
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
   * Property 13: Single Selection Enforcement
   * For any selection operation when an element is already selected,
   * the previously selected element should be deselected before the new element is selected.
   * Validates: Requirements 6.5
   */
  describe('Property 13: Single Selection Enforcement', () => {
    
    it('only one element can be selected at a time', () => {
      fc.assert(
        fc.property(
          elementTypeArbitrary, nodeIdArbitrary,
          elementTypeArbitrary, nodeIdArbitrary,
          (type1, nodeId1, type2, nodeId2) => {
            const element1 = createElement(type1, nodeId1, 1);
            const element2 = createElement(type2, nodeId2, 2);
            
            container.appendChild(element1);
            container.appendChild(element2);
            
            // Select first element
            SelectionManager.select(element1, type1);
            
            // Select second element
            SelectionManager.select(element2, type2);
            
            // Assert: Only one element should be selected
            const selection = SelectionManager.getSelection();
            expect(selection).not.toBeNull();
            expect(selection.element).toBe(element2);
            
            // Assert: First element should not have selected class
            expect(element1.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(false);
            
            // Assert: Second element should have selected class
            expect(element2.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
            
            // Cleanup
            SelectionManager.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getSelection returns only the most recently selected element', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(elementTypeArbitrary, nodeIdArbitrary),
            { minLength: 2, maxLength: 10 }
          ),
          (selections) => {
            const elements = [];
            
            // Create and select all elements
            selections.forEach(([type, nodeId], index) => {
              const element = createElement(type, nodeId, index);
              container.appendChild(element);
              elements.push({ element, type });
              
              SelectionManager.select(element, type);
            });
            
            // Assert: getSelection returns only the last selected element
            const selection = SelectionManager.getSelection();
            const lastElement = elements[elements.length - 1];
            
            expect(selection).not.toBeNull();
            expect(selection.element).toBe(lastElement.element);
            expect(selection.type).toBe(lastElement.type);
            
            // Cleanup
            SelectionManager.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('previous selection is deselected before new selection is applied', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(elementTypeArbitrary, nodeIdArbitrary),
            { minLength: 2, maxLength: 5 }
          ),
          (selections) => {
            const elements = [];
            
            // Create all elements first
            selections.forEach(([type, nodeId], index) => {
              const element = createElement(type, nodeId, index);
              container.appendChild(element);
              elements.push({ element, type });
            });
            
            // Select each element in sequence
            elements.forEach(({ element, type }, index) => {
              SelectionManager.select(element, type);
              
              // After each selection, verify only current element is selected
              elements.forEach(({ element: el }, i) => {
                if (i === index) {
                  expect(el.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
                } else if (i < index) {
                  // Previously selected elements should be deselected
                  expect(el.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(false);
                }
              });
            });
            
            // Cleanup
            SelectionManager.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('selecting the same element twice does not create duplicate selection state', () => {
      fc.assert(
        fc.property(elementTypeArbitrary, nodeIdArbitrary, (type, nodeId) => {
          const element = createElement(type, nodeId, 1);
          container.appendChild(element);
          
          // Select the same element twice
          SelectionManager.select(element, type);
          SelectionManager.select(element, type);
          
          // Assert: Element should still be selected (only once)
          expect(element.classList.contains(SelectionManager.SELECTED_CLASS)).toBe(true);
          
          // Assert: getSelection returns the element
          const selection = SelectionManager.getSelection();
          expect(selection).not.toBeNull();
          expect(selection.element).toBe(element);
          
          // Cleanup
          SelectionManager.reset();
        }),
        { numRuns: 100 }
      );
    });

    it('hasSelection returns true only when exactly one element is selected', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(elementTypeArbitrary, nodeIdArbitrary),
            { minLength: 1, maxLength: 5 }
          ),
          (selections) => {
            // Initially no selection
            expect(SelectionManager.hasSelection()).toBe(false);
            
            // Create and select elements
            selections.forEach(([type, nodeId], index) => {
              const element = createElement(type, nodeId, index);
              container.appendChild(element);
              
              SelectionManager.select(element, type);
              
              // After each selection, hasSelection should be true
              expect(SelectionManager.hasSelection()).toBe(true);
            });
            
            // After deselect, hasSelection should be false
            SelectionManager.deselect();
            expect(SelectionManager.hasSelection()).toBe(false);
            
            // Cleanup
            SelectionManager.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('selection type is correctly tracked for single selection', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(elementTypeArbitrary, nodeIdArbitrary),
            { minLength: 1, maxLength: 5 }
          ),
          (selections) => {
            // Create and select elements
            selections.forEach(([type, nodeId], index) => {
              const element = createElement(type, nodeId, index);
              container.appendChild(element);
              
              SelectionManager.select(element, type);
              
              // Assert: getSelectionType returns the current type
              expect(SelectionManager.getSelectionType()).toBe(type);
            });
            
            // After deselect, type should be null
            SelectionManager.deselect();
            expect(SelectionManager.getSelectionType()).toBeNull();
            
            // Cleanup
            SelectionManager.reset();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
