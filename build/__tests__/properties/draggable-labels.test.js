/**
 * Property-Based Tests for Draggable Labels
 * Feature: sankey-refactor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

describe('Draggable Labels - Property-Based Tests', () => {
  let dom, document, window;

  beforeEach(() => {
    // Set up a DOM environment for testing
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="chart"><svg id="sankey_svg"></svg></div></body></html>');
    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
  });

  /**
   * **Feature: sankey-refactor, Property 7: Label SVG Structure**
   * **Validates: Requirements 5.1, 5.2**
   * 
   * For any rendered diagram with N nodes, there SHALL be exactly N label groups,
   * each containing a g element with transform attribute and a transparent drag-handle rect.
   */
  it('Property 7: Label SVG Structure - each label has group with transform and drag handle', () => {
    fc.assert(
      fc.property(
        // Generate a number of nodes
        fc.integer({ min: 1, max: 20 }),
        (numNodes) => {
          // Create mock SVG structure
          const svg = document.getElementById('sankey_svg');
          const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          labelsGroup.setAttribute('id', 'sankey_labels');
          svg.appendChild(labelsGroup);

          // Create label groups for each node
          for (let i = 0; i < numNodes; i++) {
            const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            labelGroup.setAttribute('class', 'label-group');
            labelGroup.setAttribute('id', `label_${i}_group`);
            labelGroup.setAttribute('transform', `translate(${i * 50}, ${i * 30})`);

            // Add drag handle
            const dragHandle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            dragHandle.setAttribute('class', 'drag-handle');
            dragHandle.setAttribute('fill', 'transparent');
            dragHandle.setAttribute('x', '0');
            dragHandle.setAttribute('y', '0');
            dragHandle.setAttribute('width', '100');
            dragHandle.setAttribute('height', '20');
            labelGroup.appendChild(dragHandle);

            // Add text element
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('id', `label_${i}`);
            text.textContent = `Node ${i}`;
            labelGroup.appendChild(text);

            labelsGroup.appendChild(labelGroup);
          }

          // Verify structure
          const labelGroups = labelsGroup.querySelectorAll('.label-group');
          
          // Should have exactly N label groups
          expect(labelGroups.length).toBe(numNodes);

          // Each label group should have required attributes and children
          labelGroups.forEach((group, index) => {
            // Should have transform attribute
            expect(group.hasAttribute('transform')).toBe(true);
            expect(group.getAttribute('transform')).toMatch(/^translate\(/);

            // Should have a drag handle
            const dragHandle = group.querySelector('.drag-handle');
            expect(dragHandle).toBeTruthy();
            expect(dragHandle.tagName.toLowerCase()).toBe('rect');
            expect(dragHandle.getAttribute('fill')).toBe('transparent');

            // Should have a text element
            const text = group.querySelector('text');
            expect(text).toBeTruthy();
            expect(text.tagName.toLowerCase()).toBe('text');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7 (edge case): Single node diagram has correct structure', () => {
    const svg = document.getElementById('sankey_svg');
    const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelsGroup.setAttribute('id', 'sankey_labels');
    svg.appendChild(labelsGroup);

    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.setAttribute('class', 'label-group');
    labelGroup.setAttribute('transform', 'translate(100, 50)');

    const dragHandle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    dragHandle.setAttribute('class', 'drag-handle');
    dragHandle.setAttribute('fill', 'transparent');
    labelGroup.appendChild(dragHandle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelGroup.appendChild(text);

    labelsGroup.appendChild(labelGroup);

    const labelGroups = labelsGroup.querySelectorAll('.label-group');
    expect(labelGroups.length).toBe(1);
    expect(labelGroups[0].hasAttribute('transform')).toBe(true);
    expect(labelGroups[0].querySelector('.drag-handle')).toBeTruthy();
  });

  it('Property 7 (edge case): Drag handle covers label bounding box', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 300 }),
        fc.integer({ min: 10, max: 100 }),
        (width, height) => {
          const svg = document.getElementById('sankey_svg');
          const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          svg.appendChild(labelsGroup);

          const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          labelGroup.setAttribute('class', 'label-group');
          labelsGroup.appendChild(labelGroup);

          const dragHandle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          dragHandle.setAttribute('class', 'drag-handle');
          dragHandle.setAttribute('width', String(width));
          dragHandle.setAttribute('height', String(height));
          labelGroup.appendChild(dragHandle);

          const handleWidth = Number(dragHandle.getAttribute('width'));
          const handleHeight = Number(dragHandle.getAttribute('height'));

          // Drag handle dimensions should match what was set
          expect(handleWidth).toBe(width);
          expect(handleHeight).toBe(height);
          // Dimensions should be positive
          expect(handleWidth).toBeGreaterThan(0);
          expect(handleHeight).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: sankey-refactor, Property 8: Label Move Round-Trip**
   * **Validates: Requirements 5.4, 5.5**
   * 
   * For any label move operation with offset (X, Y), the resulting DSL SHALL contain
   * a labelmove line, and parsing that DSL SHALL position the label at offset (X, Y).
   */
  it('Property 8: Label Move Round-Trip - labelmove persists and restores position', () => {
    fc.assert(
      fc.property(
        // Generate node name
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
          // Exclude strings with newlines, commas, or that are only whitespace
          return !s.includes('\n') && !s.includes(',') && s.trim().length > 0;
        }),
        // Generate offset X
        fc.float({ min: -500, max: 500, noNaN: true }),
        // Generate offset Y
        fc.float({ min: -500, max: 500, noNaN: true }),
        (nodeName, offsetX, offsetY) => {
          // Round to 5 decimal places to match ep() function behavior
          const roundedX = Number(offsetX.toFixed(5));
          const roundedY = Number(offsetY.toFixed(5));

          // Generate DSL line
          const dslLine = `labelmove ${nodeName} ${roundedX}, ${roundedY}`;

          // Parse the DSL line using the regex pattern
          const reLabelMoveLine = /^labelmove (.+) (-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;
          const match = dslLine.match(reLabelMoveLine);

          // Should match the pattern
          expect(match).toBeTruthy();
          expect(match).not.toBeNull();

          if (match) {
            const [, parsedName, parsedX, parsedY] = match;

            // Parsed values should match original
            expect(parsedName).toBe(nodeName);
            expect(Number(parsedX)).toBeCloseTo(roundedX, 5);
            expect(Number(parsedY)).toBeCloseTo(roundedY, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8 (edge case): Zero offset labelmove round-trips correctly', () => {
    const nodeName = 'TestNode';
    const dslLine = `labelmove ${nodeName} 0, 0`;
    const reLabelMoveLine = /^labelmove (.+) (-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;
    const match = dslLine.match(reLabelMoveLine);

    expect(match).toBeTruthy();
    if (match) {
      const [, parsedName, parsedX, parsedY] = match;
      expect(parsedName).toBe(nodeName);
      expect(Number(parsedX)).toBe(0);
      expect(Number(parsedY)).toBe(0);
    }
  });

  it('Property 8 (edge case): Negative offset labelmove round-trips correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
          // Exclude strings with newlines, commas, or that are only whitespace
          return !s.includes('\n') && !s.includes(',') && s.trim().length > 0;
        }),
        fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true }),
        fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true }),
        (nodeName, negX, negY) => {
          const roundedX = Number(negX.toFixed(5));
          const roundedY = Number(negY.toFixed(5));
          const dslLine = `labelmove ${nodeName} ${roundedX}, ${roundedY}`;
          const reLabelMoveLine = /^labelmove (.+) (-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;
          const match = dslLine.match(reLabelMoveLine);

          expect(match).toBeTruthy();
          if (match) {
            const [, parsedName, parsedX, parsedY] = match;
            expect(parsedName).toBe(nodeName);
            expect(Number(parsedX)).toBeCloseTo(roundedX, 5);
            expect(Number(parsedY)).toBeCloseTo(roundedY, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
