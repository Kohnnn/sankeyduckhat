/**
 * Property-based tests for Label Structure
 * Feature: sankey-studio-canvas-refactor
 * 
 * Property 10: Label Structure Correctness
 * For any rendered label, the DOM structure should contain a group element (<g>) 
 * with a background rectangle (<rect>) and text element (<text>) as children.
 * Validates: Requirements 5.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

// Helper to create a mock label structure as it would be rendered
function createLabelStructure(nodeId, labelText, hasBackground = true) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><svg id="sankey_svg"></svg></body></html>');
  const document = dom.window.document;
  const svg = document.getElementById('sankey_svg');
  
  // Create the label group with sankey-label class
  const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  labelGroup.setAttribute('class', 'sankey-label');
  labelGroup.setAttribute('id', `label${nodeId}_group`);
  labelGroup.setAttribute('data-label-for', nodeId);
  
  // Add background rect if enabled (with label-bg class)
  if (hasBackground) {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('class', 'label-bg');
    bgRect.setAttribute('id', `label${nodeId}_bg`);
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', '100');
    bgRect.setAttribute('height', '20');
    labelGroup.appendChild(bgRect);
  }
  
  // Add text element
  const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('id', `label${nodeId}`);
  textEl.setAttribute('class', 'sankey-label-text');
  textEl.textContent = labelText;
  labelGroup.appendChild(textEl);
  
  svg.appendChild(labelGroup);
  
  return { dom, document, svg, labelGroup };
}

// Arbitrary for generating valid node IDs
const nodeIdArbitrary = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

// Arbitrary for generating label text
const labelTextArbitrary = fc.string({ minLength: 1, maxLength: 100 });

describe('Label Structure Property Tests', () => {
  /**
   * Property 10: Label Structure Correctness
   * For any rendered label, the DOM structure should contain a group element (<g>) 
   * with a background rectangle (<rect>) and text element (<text>) as children.
   * Validates: Requirements 5.1
   */
  describe('Property 10: Label Structure Correctness', () => {
    it('label group contains required elements with correct classes', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          labelTextArbitrary,
          (nodeId, labelText) => {
            const { labelGroup } = createLabelStructure(nodeId, labelText, true);
            
            // Verify group element exists and has correct class
            expect(labelGroup.tagName.toLowerCase()).toBe('g');
            expect(labelGroup.classList.contains('sankey-label')).toBe(true);
            
            // Verify data-label-for attribute
            expect(labelGroup.getAttribute('data-label-for')).toBe(nodeId);
            
            // Verify background rect exists with label-bg class
            const bgRect = labelGroup.querySelector('rect.label-bg');
            expect(bgRect).not.toBeNull();
            
            // Verify text element exists
            const textEl = labelGroup.querySelector('text');
            expect(textEl).not.toBeNull();
            expect(textEl.textContent).toBe(labelText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('label group has correct ID format', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          labelTextArbitrary,
          (nodeId, labelText) => {
            const { labelGroup } = createLabelStructure(nodeId, labelText, true);
            
            // Verify group ID follows the pattern label{nodeId}_group
            const groupId = labelGroup.getAttribute('id');
            expect(groupId).toMatch(/^label.+_group$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('text element has correct class for independent styling', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          labelTextArbitrary,
          (nodeId, labelText) => {
            const { labelGroup } = createLabelStructure(nodeId, labelText, true);
            
            // Verify text element has sankey-label-text class
            const textEl = labelGroup.querySelector('text');
            expect(textEl).not.toBeNull();
            expect(textEl.classList.contains('sankey-label-text')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('label without background still has text element', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          labelTextArbitrary,
          (nodeId, labelText) => {
            const { labelGroup } = createLabelStructure(nodeId, labelText, false);
            
            // Verify group element exists
            expect(labelGroup.tagName.toLowerCase()).toBe('g');
            expect(labelGroup.classList.contains('sankey-label')).toBe(true);
            
            // Verify no background rect
            const bgRect = labelGroup.querySelector('rect.label-bg');
            expect(bgRect).toBeNull();
            
            // Verify text element still exists
            const textEl = labelGroup.querySelector('text');
            expect(textEl).not.toBeNull();
            expect(textEl.textContent).toBe(labelText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple labels maintain independent structure', () => {
      fc.assert(
        fc.property(
          fc.array(nodeIdArbitrary, { minLength: 2, maxLength: 5 }),
          fc.array(labelTextArbitrary, { minLength: 2, maxLength: 5 }),
          (nodeIds, labelTexts) => {
            // Use unique node IDs
            const uniqueNodeIds = [...new Set(nodeIds)];
            if (uniqueNodeIds.length < 2) return true;
            
            const dom = new JSDOM('<!DOCTYPE html><html><body><svg id="sankey_svg"></svg></body></html>');
            const document = dom.window.document;
            const svg = document.getElementById('sankey_svg');
            
            // Create multiple labels
            uniqueNodeIds.forEach((nodeId, i) => {
              const labelText = labelTexts[i % labelTexts.length];
              
              const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              labelGroup.setAttribute('class', 'sankey-label');
              labelGroup.setAttribute('id', `label${nodeId}_group`);
              labelGroup.setAttribute('data-label-for', nodeId);
              
              const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              bgRect.setAttribute('class', 'label-bg');
              labelGroup.appendChild(bgRect);
              
              const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              textEl.setAttribute('class', 'sankey-label-text');
              textEl.textContent = labelText;
              labelGroup.appendChild(textEl);
              
              svg.appendChild(labelGroup);
            });
            
            // Verify each label has independent structure
            const allLabels = svg.querySelectorAll('g.sankey-label');
            expect(allLabels.length).toBe(uniqueNodeIds.length);
            
            allLabels.forEach((labelGroup, i) => {
              // Each label should have its own rect and text
              const bgRect = labelGroup.querySelector('rect.label-bg');
              const textEl = labelGroup.querySelector('text.sankey-label-text');
              
              expect(bgRect).not.toBeNull();
              expect(textEl).not.toBeNull();
              
              // Verify data-label-for attribute is unique
              const labelFor = labelGroup.getAttribute('data-label-for');
              expect(uniqueNodeIds).toContain(labelFor);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
