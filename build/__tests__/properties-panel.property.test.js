/**
 * Property-based tests for PropertiesPanelController
 * Feature: sankey-studio-canvas-refactor, Property 8: Property Panel Synchronization
 * Validates: Requirements 3.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PropertiesPanelController } from '../properties-panel.js';

// Mock StudioUI for testing
const mockStudioUI = {
  _listeners: {},
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  },
  emit(event, data) {
    const listeners = this._listeners[event];
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  },
  off(event, callback) {
    const listeners = this._listeners[event];
    if (listeners) {
      this._listeners[event] = listeners.filter(cb => cb !== callback);
    }
  },
  select(element) {
    // Mock implementation
  },
  reset() {
    this._listeners = {};
  }
};

// Arbitrary generators for test data
const nodeNameArbitrary = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0);

const colorArbitrary = fc.hexaString({ minLength: 6, maxLength: 6 })
  .map(hex => `#${hex}`);

const opacityArbitrary = fc.integer({ min: 0, max: 100 });

const fontSizeArbitrary = fc.integer({ min: 8, max: 72 });

const alignmentArbitrary = fc.constantFrom('left', 'center', 'right');

const dimensionArbitrary = fc.integer({ min: 100, max: 2000 });

const marginArbitrary = fc.integer({ min: 0, max: 200 });

const amountArbitrary = fc.float({ min: 0, max: 10000, noNaN: true });

const curvatureArbitrary = fc.integer({ min: 10, max: 90 });

const colorModeArbitrary = fc.constantFrom('outside_in', 'source', 'target', 'single');

describe('PropertiesPanelController Property Tests', () => {
  let container;
  let propertyChanges;
  
  beforeEach(() => {
    // Create a mock container element
    container = document.createElement('div');
    container.id = 'test-properties-panel';
    document.body.appendChild(container);
    
    // Track property changes
    propertyChanges = [];
    
    // Reset the controller
    PropertiesPanelController._panelContainer = null;
    PropertiesPanelController._currentSelection = null;
    PropertiesPanelController._onPropertyChangeCallback = null;
    
    // Set up global StudioUI mock
    global.StudioUI = mockStudioUI;
    mockStudioUI.reset();
    
    // Initialize controller
    PropertiesPanelController.init(container);
    PropertiesPanelController.setPropertyChangeCallback((property, value, selection) => {
      propertyChanges.push({ property, value, selection });
    });
  });
  
  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    delete global.StudioUI;
  });

  /**
   * Property 8: Property Panel Synchronization
   * For any property change made in the Properties Panel, the corresponding visual element
   * should update immediately, and the underlying data model should reflect the same value.
   * Validates: Requirements 3.5
   */
  describe('Property 8: Property Panel Synchronization', () => {
    
    it('canvas property changes trigger onPropertyChange callback with correct values', () => {
      fc.assert(
        fc.property(
          dimensionArbitrary,
          dimensionArbitrary,
          (width, height) => {
            // Reset changes
            propertyChanges = [];
            
            // Render canvas properties
            PropertiesPanelController.renderCanvasProperties();
            
            // Simulate width change
            const widthInput = container.querySelector('#prop-canvas-width');
            if (widthInput) {
              widthInput.value = width;
              widthInput.dispatchEvent(new Event('change'));
              
              // Verify callback was called with correct property and value
              const widthChange = propertyChanges.find(c => c.property === 'canvas.width');
              expect(widthChange).toBeDefined();
              expect(widthChange.value).toBe(width);
            }
            
            // Simulate height change
            const heightInput = container.querySelector('#prop-canvas-height');
            if (heightInput) {
              heightInput.value = height;
              heightInput.dispatchEvent(new Event('change'));
              
              const heightChange = propertyChanges.find(c => c.property === 'canvas.height');
              expect(heightChange).toBeDefined();
              expect(heightChange.value).toBe(height);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('node property changes trigger onPropertyChange callback with correct values', () => {
      fc.assert(
        fc.property(
          nodeNameArbitrary,
          colorArbitrary,
          opacityArbitrary,
          (nodeName, fillColor, opacity) => {
            // Reset changes
            propertyChanges = [];
            
            // Render node properties
            const nodeData = { id: nodeName, name: nodeName };
            PropertiesPanelController.renderNodeProperties(nodeData);
            
            // Simulate fill color change
            const fillInput = container.querySelector('#prop-node-fill');
            if (fillInput) {
              fillInput.value = fillColor;
              fillInput.dispatchEvent(new Event('input'));
              
              const fillChange = propertyChanges.find(c => c.property === 'node.fillColor');
              expect(fillChange).toBeDefined();
              expect(fillChange.value.toLowerCase()).toBe(fillColor.toLowerCase());
            }
            
            // Simulate opacity change
            const opacityInput = container.querySelector('#prop-node-opacity');
            if (opacityInput) {
              opacityInput.value = opacity;
              opacityInput.dispatchEvent(new Event('input'));
              
              const opacityChange = propertyChanges.find(c => c.property === 'node.opacity');
              expect(opacityChange).toBeDefined();
              expect(opacityChange.value).toBe(opacity);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('label property changes trigger onPropertyChange callback with correct values', () => {
      fc.assert(
        fc.property(
          nodeNameArbitrary,
          fontSizeArbitrary,
          alignmentArbitrary,
          (nodeId, fontSize, alignment) => {
            // Reset changes
            propertyChanges = [];
            
            // Render label properties
            const labelData = { nodeId, text: nodeId };
            PropertiesPanelController.renderLabelProperties(labelData);
            
            // Simulate font size change
            const fontSizeInput = container.querySelector('#prop-label-fontsize');
            if (fontSizeInput) {
              fontSizeInput.value = fontSize;
              fontSizeInput.dispatchEvent(new Event('change'));
              
              const fontSizeChange = propertyChanges.find(c => c.property === 'label.fontSize');
              expect(fontSizeChange).toBeDefined();
              expect(fontSizeChange.value).toBe(fontSize);
            }
            
            // Simulate alignment change
            const alignBtn = container.querySelector(`.align-btn[data-align="${alignment}"]`);
            if (alignBtn) {
              alignBtn.click();
              
              const alignChange = propertyChanges.find(c => c.property === 'label.alignment');
              expect(alignChange).toBeDefined();
              expect(alignChange.value).toBe(alignment);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('flow property changes trigger onPropertyChange callback with correct values', () => {
      fc.assert(
        fc.property(
          nodeNameArbitrary,
          nodeNameArbitrary,
          amountArbitrary,
          curvatureArbitrary,
          (source, target, amount, curvature) => {
            // Reset changes
            propertyChanges = [];
            
            // Render flow properties
            const flowData = { source, target, value: 100 };
            PropertiesPanelController.renderFlowProperties(flowData);
            
            // Simulate amount change
            const amountInput = container.querySelector('#prop-flow-amount');
            if (amountInput) {
              amountInput.value = amount;
              amountInput.dispatchEvent(new Event('change'));
              
              const amountChange = propertyChanges.find(c => c.property === 'flow.amount');
              expect(amountChange).toBeDefined();
              expect(amountChange.value).toBeCloseTo(amount, 2);
            }
            
            // Simulate curvature change
            const curvatureInput = container.querySelector('#prop-flow-curvature');
            if (curvatureInput) {
              curvatureInput.value = curvature;
              curvatureInput.dispatchEvent(new Event('input'));
              
              const curvatureChange = propertyChanges.find(c => c.property === 'flow.curvature');
              expect(curvatureChange).toBeDefined();
              expect(curvatureChange.value).toBe(curvature);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('selection changes update panel content correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('node', 'flow', 'label', null),
          nodeNameArbitrary,
          (selectionType, nodeName) => {
            let selection = null;
            
            if (selectionType === 'node') {
              selection = { type: 'node', id: nodeName, data: { id: nodeName, name: nodeName } };
            } else if (selectionType === 'flow') {
              selection = { type: 'flow', id: `${nodeName}->Target`, data: { source: nodeName, target: 'Target' } };
            } else if (selectionType === 'label') {
              selection = { type: 'label', id: nodeName, data: { nodeId: nodeName, text: nodeName } };
            }
            
            // Update panel for selection
            PropertiesPanelController.updateForSelection(selection);
            
            // Verify current selection is stored
            const currentSelection = PropertiesPanelController.getSelection();
            
            if (selectionType === null) {
              expect(currentSelection).toBeNull();
              // Canvas properties should be shown
              expect(container.querySelector('#prop-canvas-width')).toBeTruthy();
            } else {
              expect(currentSelection).not.toBeNull();
              expect(currentSelection.type).toBe(selectionType);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('margin property changes trigger callbacks for all four sides', () => {
      fc.assert(
        fc.property(
          marginArbitrary,
          marginArbitrary,
          marginArbitrary,
          marginArbitrary,
          (top, right, bottom, left) => {
            // Reset changes
            propertyChanges = [];
            
            // Render canvas properties
            PropertiesPanelController.renderCanvasProperties();
            
            const margins = { top, right, bottom, left };
            
            Object.entries(margins).forEach(([side, value]) => {
              const input = container.querySelector(`#prop-margin-${side}`);
              if (input) {
                input.value = value;
                input.dispatchEvent(new Event('change'));
                
                const change = propertyChanges.find(c => c.property === `canvas.margin.${side}`);
                expect(change).toBeDefined();
                expect(change.value).toBe(value);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('color mode changes enable/disable flow color input correctly', () => {
      fc.assert(
        fc.property(
          nodeNameArbitrary,
          nodeNameArbitrary,
          colorModeArbitrary,
          (source, target, colorMode) => {
            // Render flow properties
            const flowData = { source, target, value: 100, colorMode: 'outside_in' };
            PropertiesPanelController.renderFlowProperties(flowData);
            
            // Change color mode
            const colorModeSelect = container.querySelector('#prop-flow-colormode');
            const flowColorInput = container.querySelector('#prop-flow-color');
            
            if (colorModeSelect && flowColorInput) {
              colorModeSelect.value = colorMode;
              colorModeSelect.dispatchEvent(new Event('change'));
              
              // Flow color should only be enabled when colorMode is 'single'
              if (colorMode === 'single') {
                expect(flowColorInput.disabled).toBe(false);
              } else {
                expect(flowColorInput.disabled).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('background enable toggle enables/disables background color input', () => {
      fc.assert(
        fc.property(
          nodeNameArbitrary,
          fc.boolean(),
          (nodeId, bgEnabled) => {
            // Render label properties with background disabled
            const labelData = { nodeId, text: nodeId, backgroundEnabled: false };
            PropertiesPanelController.renderLabelProperties(labelData);
            
            const bgEnabledInput = container.querySelector('#prop-label-bg-enabled');
            const bgColorInput = container.querySelector('#prop-label-bg-color');
            
            if (bgEnabledInput && bgColorInput) {
              // Set the checkbox state
              bgEnabledInput.checked = bgEnabled;
              bgEnabledInput.dispatchEvent(new Event('change'));
              
              // Background color input should match enabled state
              expect(bgColorInput.disabled).toBe(!bgEnabled);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
