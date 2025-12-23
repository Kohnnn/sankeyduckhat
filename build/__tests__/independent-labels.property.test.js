/**
 * Property-based tests for IndependentLabelsManager
 * Feature: sankey-bugfixes-and-cleanup
 * 
 * Property 4: Independent Label CRUD and Persistence
 * Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { IndependentLabelsManager } from '../independent-labels-manager.js';

// Mock localStorage
const createMockLocalStorage = () => {
  const store = new Map();
  return {
    getItem: vi.fn((key) => store.get(key) || null),
    setItem: vi.fn((key, value) => store.set(key, value)),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    key: vi.fn((index) => Array.from(store.keys())[index]),
    get length() { return store.size; },
    _store: store
  };
};

// Mock DOM elements
const createMockDOM = () => {
  const elements = new Map();
  const svgNS = 'http://www.w3.org/2000/svg';
  
  // Create mock SVG element
  const mockSvg = {
    id: 'sankey_svg',
    clientWidth: 700,
    clientHeight: 500,
    getAttribute: vi.fn((attr) => {
      if (attr === 'viewBox') return '0 0 700 500';
      return null;
    }),
    querySelector: vi.fn((selector) => {
      if (selector === '#independent_labels_layer') {
        return elements.get('independent_labels_layer') || null;
      }
      return null;
    }),
    appendChild: vi.fn((child) => {
      if (child.id) {
        elements.set(child.id, child);
      }
    }),
    children: []
  };
  
  elements.set('sankey_svg', mockSvg);
  
  return {
    getElementById: vi.fn((id) => elements.get(id) || null),
    createElementNS: vi.fn((ns, tag) => {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        textContent: '',
        children: [],
        attributes: new Map(),
        style: {},
        setAttribute: vi.fn(function(name, value) {
          this.attributes.set(name, value);
          if (name === 'id') this.id = value;
          if (name === 'class') this.className = value;
        }),
        getAttribute: vi.fn(function(name) {
          return this.attributes.get(name);
        }),
        appendChild: vi.fn(function(child) {
          this.children.push(child);
        }),
        remove: vi.fn(),
        addEventListener: vi.fn(),
        getBBox: vi.fn(() => ({ x: 0, y: 0, width: 50, height: 20 })),
        querySelector: vi.fn(() => null)
      };
      return el;
    }),
    createElement: vi.fn((tag) => ({
      tagName: tag,
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn()
    })),
    body: {
      appendChild: vi.fn()
    },
    elements,
    mockSvg
  };
};

describe('IndependentLabelsManager', () => {
  let mockLocalStorage;
  let mockDOM;

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    mockDOM = createMockDOM();
    
    // Setup global mocks
    global.localStorage = mockLocalStorage;
    global.document = mockDOM;
    global.updateAIStatus = vi.fn();
    global.confirm = vi.fn(() => true);
    global.d3 = undefined; // D3 not available in tests
    
    // Reset the manager
    IndependentLabelsManager.reset();
  });

  describe('Property 4: Independent Label CRUD and Persistence', () => {
    /**
     * Feature: sankey-bugfixes-and-cleanup, Property 4: Independent Label CRUD and Persistence
     * For any independent label, creating it SHALL add it to the canvas,
     * dragging it SHALL update its position, deleting it SHALL remove it,
     * and saving/loading SHALL preserve all label properties including position.
     */
    
    it('creating a label adds it to the labels array', () => {
      fc.assert(
        fc.property(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            x: fc.integer({ min: 0, max: 1000 }),
            y: fc.integer({ min: 0, max: 1000 }),
            fontSize: fc.integer({ min: 8, max: 72 }),
            color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s)
          }),
          (labelOptions) => {
            // Initialize manager
            IndependentLabelsManager.init();
            const initialCount = IndependentLabelsManager.getLabels().length;
            
            // Create label
            const label = IndependentLabelsManager.addLabel(labelOptions);
            
            // Verify label was created with correct properties
            expect(label).toBeDefined();
            expect(label.id).toBeDefined();
            expect(label.text).toBe(labelOptions.text);
            expect(label.x).toBe(labelOptions.x);
            expect(label.y).toBe(labelOptions.y);
            expect(label.fontSize).toBe(labelOptions.fontSize);
            expect(label.color).toBe(labelOptions.color);
            
            // Verify label count increased
            expect(IndependentLabelsManager.getLabels().length).toBe(initialCount + 1);
            
            // Verify label can be retrieved
            const retrieved = IndependentLabelsManager.getLabel(label.id);
            expect(retrieved).toEqual(label);
            
            // Cleanup
            IndependentLabelsManager.deleteLabel(label.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deleting a label removes it from the labels array', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              text: fc.string({ minLength: 1, maxLength: 20 }),
              x: fc.integer({ min: 0, max: 500 }),
              y: fc.integer({ min: 0, max: 500 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.nat(),
          (labelOptionsArray, deleteIndex) => {
            // Initialize manager
            IndependentLabelsManager.init();
            
            // Create multiple labels
            const createdLabels = labelOptionsArray.map(opts => 
              IndependentLabelsManager.addLabel(opts)
            );
            
            const initialCount = createdLabels.length;
            
            // Pick a label to delete
            const indexToDelete = deleteIndex % initialCount;
            const labelToDelete = createdLabels[indexToDelete];
            
            // Delete the label
            const result = IndependentLabelsManager.deleteLabel(labelToDelete.id);
            
            // Verify deletion was successful
            expect(result).toBe(true);
            expect(IndependentLabelsManager.getLabels().length).toBe(initialCount - 1);
            expect(IndependentLabelsManager.getLabel(labelToDelete.id)).toBeNull();
            
            // Verify other labels still exist
            createdLabels.forEach((label, i) => {
              if (i !== indexToDelete) {
                expect(IndependentLabelsManager.getLabel(label.id)).not.toBeNull();
              }
            });
            
            // Cleanup remaining labels
            IndependentLabelsManager.clearAll();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updating a label preserves unmodified properties', () => {
      fc.assert(
        fc.property(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 30 }),
            x: fc.integer({ min: 0, max: 500 }),
            y: fc.integer({ min: 0, max: 500 }),
            fontSize: fc.integer({ min: 8, max: 72 }),
            color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s),
            bold: fc.boolean(),
            italic: fc.boolean()
          }),
          fc.record({
            text: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
            fontSize: fc.option(fc.integer({ min: 8, max: 72 }), { nil: undefined }),
            color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s), { nil: undefined })
          }),
          (initialProps, updates) => {
            // Initialize manager
            IndependentLabelsManager.init();
            
            // Create label with initial properties
            const label = IndependentLabelsManager.addLabel(initialProps);
            
            // Apply partial updates
            const updatedLabel = IndependentLabelsManager.updateLabel(label.id, updates);
            
            // Verify updated properties changed
            if (updates.text !== undefined) {
              expect(updatedLabel.text).toBe(updates.text);
            } else {
              expect(updatedLabel.text).toBe(initialProps.text);
            }
            
            if (updates.fontSize !== undefined) {
              expect(updatedLabel.fontSize).toBe(updates.fontSize);
            } else {
              expect(updatedLabel.fontSize).toBe(initialProps.fontSize);
            }
            
            if (updates.color !== undefined) {
              expect(updatedLabel.color).toBe(updates.color);
            } else {
              expect(updatedLabel.color).toBe(initialProps.color);
            }
            
            // Verify unmodified properties preserved
            expect(updatedLabel.x).toBe(initialProps.x);
            expect(updatedLabel.y).toBe(initialProps.y);
            expect(updatedLabel.bold).toBe(initialProps.bold);
            expect(updatedLabel.italic).toBe(initialProps.italic);
            
            // Cleanup
            IndependentLabelsManager.deleteLabel(label.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('labels persist to localStorage and can be loaded', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              text: fc.string({ minLength: 1, maxLength: 30 }),
              x: fc.integer({ min: 0, max: 500 }),
              y: fc.integer({ min: 0, max: 500 }),
              fontSize: fc.integer({ min: 8, max: 72 }),
              color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s)
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (labelOptionsArray) => {
            // Initialize manager
            IndependentLabelsManager.init();
            
            // Create labels
            const createdLabels = labelOptionsArray.map(opts => 
              IndependentLabelsManager.addLabel(opts)
            );
            
            // Verify localStorage was called
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
            
            // Get the saved data
            const savedData = mockLocalStorage._store.get(IndependentLabelsManager.STORAGE_KEY);
            expect(savedData).toBeDefined();
            
            // Parse and verify saved data
            const parsedData = JSON.parse(savedData);
            expect(parsedData.length).toBe(createdLabels.length);
            
            // Verify each label's properties were saved
            createdLabels.forEach((label, i) => {
              const savedLabel = parsedData.find(l => l.id === label.id);
              expect(savedLabel).toBeDefined();
              expect(savedLabel.text).toBe(label.text);
              expect(savedLabel.x).toBe(label.x);
              expect(savedLabel.y).toBe(label.y);
              expect(savedLabel.fontSize).toBe(label.fontSize);
              expect(savedLabel.color).toBe(label.color);
            });
            
            // Reset and reload
            IndependentLabelsManager.reset();
            IndependentLabelsManager.init();
            
            // Verify labels were loaded
            const loadedLabels = IndependentLabelsManager.getLabels();
            expect(loadedLabels.length).toBe(createdLabels.length);
            
            // Verify loaded label properties match
            createdLabels.forEach(originalLabel => {
              const loadedLabel = loadedLabels.find(l => l.id === originalLabel.id);
              expect(loadedLabel).toBeDefined();
              expect(loadedLabel.text).toBe(originalLabel.text);
              expect(loadedLabel.x).toBe(originalLabel.x);
              expect(loadedLabel.y).toBe(originalLabel.y);
              expect(loadedLabel.fontSize).toBe(originalLabel.fontSize);
              expect(loadedLabel.color).toBe(originalLabel.color);
            });
            
            // Cleanup
            IndependentLabelsManager.clearAll();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('position updates are persisted', () => {
      fc.assert(
        fc.property(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 20 }),
            x: fc.integer({ min: 0, max: 500 }),
            y: fc.integer({ min: 0, max: 500 })
          }),
          fc.integer({ min: 0, max: 500 }),
          fc.integer({ min: 0, max: 500 }),
          (initialProps, newX, newY) => {
            // Initialize manager
            IndependentLabelsManager.init();
            
            // Create label
            const label = IndependentLabelsManager.addLabel(initialProps);
            
            // Update position
            IndependentLabelsManager.updateLabel(label.id, { x: newX, y: newY });
            
            // Verify position was updated
            const updatedLabel = IndependentLabelsManager.getLabel(label.id);
            expect(updatedLabel.x).toBe(newX);
            expect(updatedLabel.y).toBe(newY);
            
            // Verify position was persisted
            const savedData = mockLocalStorage._store.get(IndependentLabelsManager.STORAGE_KEY);
            const parsedData = JSON.parse(savedData);
            const savedLabel = parsedData.find(l => l.id === label.id);
            expect(savedLabel.x).toBe(newX);
            expect(savedLabel.y).toBe(newY);
            
            // Cleanup
            IndependentLabelsManager.deleteLabel(label.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases', () => {
    it('deleting non-existent label returns false', () => {
      IndependentLabelsManager.init();
      const result = IndependentLabelsManager.deleteLabel('non_existent_id');
      expect(result).toBe(false);
    });

    it('updating non-existent label returns null', () => {
      IndependentLabelsManager.init();
      const result = IndependentLabelsManager.updateLabel('non_existent_id', { text: 'test' });
      expect(result).toBeNull();
    });

    it('getLabel returns null for non-existent label', () => {
      IndependentLabelsManager.init();
      const result = IndependentLabelsManager.getLabel('non_existent_id');
      expect(result).toBeNull();
    });

    it('clearAll removes all labels', () => {
      IndependentLabelsManager.init();
      
      // Create some labels
      IndependentLabelsManager.addLabel({ text: 'Label 1' });
      IndependentLabelsManager.addLabel({ text: 'Label 2' });
      IndependentLabelsManager.addLabel({ text: 'Label 3' });
      
      expect(IndependentLabelsManager.getLabels().length).toBe(3);
      
      // Clear all
      IndependentLabelsManager.clearAll();
      
      expect(IndependentLabelsManager.getLabels().length).toBe(0);
    });

    it('default values are applied when options not provided', () => {
      IndependentLabelsManager.init();
      
      const label = IndependentLabelsManager.addLabel({});
      
      expect(label.text).toBe('New Label');
      expect(label.fontSize).toBe(16);
      expect(label.color).toBe('#000000');
      expect(label.fontFamily).toBe('sans-serif');
      expect(label.bold).toBe(false);
      expect(label.italic).toBe(false);
      
      IndependentLabelsManager.deleteLabel(label.id);
    });
  });
});
