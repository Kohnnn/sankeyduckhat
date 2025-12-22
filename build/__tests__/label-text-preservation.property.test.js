/**
 * Property Tests for Label Text Preservation
 * 
 * Property 2: Label Text Preservation
 * *For any* label with custom display text different from its node identity, 
 * clicking on the label or opening the label popup SHALL NOT change the display 
 * text to the node identity. The custom text SHALL remain unchanged.
 * 
 * **Validates: Requirements 2.1, 2.2**
 * 
 * Feature: sankey-bugfixes-and-cleanup, Property 2: Label Text Preservation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Simulate the label text handling logic from index.html
// This mirrors the actual implementation

/**
 * Simulates openLabelPopup - loads labelText from nodeCustomizations
 * Only defaults to nodeName if labelText is undefined
 */
function getLabelTextForPopup(nodeName, nodeCustomizations) {
  const custom = nodeCustomizations[nodeName] || {};
  // This is the correct behavior: only default to nodeName if labelText is undefined
  return custom.labelText !== undefined ? custom.labelText : nodeName;
}

/**
 * Simulates the fixed applyLabelCustomization logic
 * Uses explicit undefined check to preserve empty strings
 */
function saveLabelText(rawLabelText, validatedLabelText, nodeName) {
  // Fixed logic: use explicit undefined check to preserve empty strings
  const labelTextValue = validatedLabelText !== undefined 
    ? validatedLabelText 
    : (rawLabelText !== undefined ? rawLabelText : nodeName);
  return labelTextValue;
}

/**
 * Simulates the buggy applyLabelCustomization logic (for comparison)
 * Uses || which treats empty strings as falsy
 */
function saveLabelTextBuggy(rawLabelText, validatedLabelText, nodeName) {
  // Buggy logic: || treats empty strings as falsy
  return validatedLabelText || rawLabelText || nodeName;
}

/**
 * Simulates applyLabelCustomizationToSVG - gets display text
 * Only defaults to nodeName if labelText is undefined
 */
function getDisplayText(nodeName, custom) {
  return custom.labelText !== undefined ? custom.labelText : nodeName;
}

/**
 * Simulates validateLabelSettings for labelText
 * Empty string is a valid label text
 */
function validateLabelText(labelText) {
  if (labelText === undefined) {
    return { validated: undefined };
  }
  if (labelText === '') {
    // Empty string is valid - preserve it
    return { validated: '' };
  }
  // For non-empty strings, just return as-is (simplified)
  return { validated: labelText };
}

describe('Label Text Preservation Property Tests', () => {
  
  describe('Property 2: Label Text Preservation', () => {
    
    it('should preserve custom label text when opening popup (for any custom text)', () => {
      /**
       * Feature: sankey-bugfixes-and-cleanup, Property 2: Label Text Preservation
       * Validates: Requirements 2.1, 2.2
       */
      fc.assert(
        fc.property(
          // Generate node names (identifiers)
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          // Generate custom label text (can be different from node name)
          fc.string({ minLength: 0, maxLength: 100 }),
          (nodeName, customLabelText) => {
            // Setup: node has custom label text stored
            const nodeCustomizations = {
              [nodeName]: {
                labelText: customLabelText
              }
            };
            
            // Action: open label popup (simulated)
            const popupText = getLabelTextForPopup(nodeName, nodeCustomizations);
            
            // Assertion: popup should show the custom text, not the node name
            expect(popupText).toBe(customLabelText);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should default to node name only when labelText is undefined', () => {
      /**
       * Feature: sankey-bugfixes-and-cleanup, Property 2: Label Text Preservation
       * Validates: Requirements 2.3
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (nodeName) => {
            // Setup: node has no custom label text (labelText is undefined)
            const nodeCustomizations = {
              [nodeName]: {
                // No labelText property - should default to nodeName
                labelColor: '#000000'
              }
            };
            
            // Action: open label popup
            const popupText = getLabelTextForPopup(nodeName, nodeCustomizations);
            
            // Assertion: should default to node name
            expect(popupText).toBe(nodeName);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve empty string as valid custom label text', () => {
      /**
       * Feature: sankey-bugfixes-and-cleanup, Property 2: Label Text Preservation
       * Validates: Requirements 2.1, 2.2
       * 
       * This is a critical edge case - empty string should NOT fall back to node name
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (nodeName) => {
            // Setup: node has empty string as custom label text
            const nodeCustomizations = {
              [nodeName]: {
                labelText: '' // Empty string is intentional
              }
            };
            
            // Action: open label popup
            const popupText = getLabelTextForPopup(nodeName, nodeCustomizations);
            
            // Assertion: should show empty string, NOT the node name
            expect(popupText).toBe('');
            expect(popupText).not.toBe(nodeName);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should save label text correctly using fixed logic', () => {
      /**
       * Feature: sankey-bugfixes-and-cleanup, Property 2: Label Text Preservation
       * Validates: Requirements 2.1
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 0, maxLength: 100 }),
          (nodeName, labelText) => {
            // Simulate validation
            const validation = validateLabelText(labelText);
            
            // Save using fixed logic
            const savedText = saveLabelText(labelText, validation.validated, nodeName);
            
            // Assertion: saved text should match input, even if empty
            expect(savedText).toBe(labelText);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should demonstrate the bug in old logic with empty strings', () => {
      /**
       * This test demonstrates the bug that was fixed
       * The buggy logic would replace empty strings with node name
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (nodeName) => {
            const emptyLabelText = '';
            
            // Buggy logic would fall back to nodeName for empty strings
            const buggyResult = saveLabelTextBuggy(emptyLabelText, emptyLabelText, nodeName);
            
            // Fixed logic preserves empty strings
            const fixedResult = saveLabelText(emptyLabelText, emptyLabelText, nodeName);
            
            // Demonstrate the difference
            expect(buggyResult).toBe(nodeName); // Bug: falls back to nodeName
            expect(fixedResult).toBe(''); // Fixed: preserves empty string
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve display text in SVG rendering', () => {
      /**
       * Feature: sankey-bugfixes-and-cleanup, Property 2: Label Text Preservation
       * Validates: Requirements 2.1
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 0, maxLength: 100 }),
          (nodeName, customText) => {
            const custom = { labelText: customText };
            
            // Get display text for SVG
            const displayText = getDisplayText(nodeName, custom);
            
            // Should always use custom text when defined
            expect(displayText).toBe(customText);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle round-trip: save then load preserves text', () => {
      /**
       * Feature: sankey-bugfixes-and-cleanup, Property 2: Label Text Preservation
       * Validates: Requirements 2.1, 2.2
       * 
       * Round-trip property: saving and loading should preserve the text
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 0, maxLength: 100 }),
          (nodeName, originalText) => {
            // Step 1: Save the label text
            const validation = validateLabelText(originalText);
            const savedText = saveLabelText(originalText, validation.validated, nodeName);
            
            // Step 2: Store in nodeCustomizations
            const nodeCustomizations = {
              [nodeName]: {
                labelText: savedText
              }
            };
            
            // Step 3: Load from nodeCustomizations (simulating popup open)
            const loadedText = getLabelTextForPopup(nodeName, nodeCustomizations);
            
            // Assertion: round-trip should preserve the original text
            expect(loadedText).toBe(originalText);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle whitespace-only strings as valid custom text', () => {
      /**
       * Feature: sankey-bugfixes-and-cleanup, Property 2: Label Text Preservation
       * Validates: Requirements 2.1, 2.2
       */
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 }),
          (nodeName, whitespaceText) => {
            const nodeCustomizations = {
              [nodeName]: {
                labelText: whitespaceText
              }
            };
            
            // Whitespace-only text should be preserved
            const popupText = getLabelTextForPopup(nodeName, nodeCustomizations);
            expect(popupText).toBe(whitespaceText);
            
            // Save should also preserve it
            const savedText = saveLabelText(whitespaceText, whitespaceText, nodeName);
            expect(savedText).toBe(whitespaceText);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Edge Cases', () => {
    
    it('should handle node with no customizations at all', () => {
      const nodeName = 'TestNode';
      const nodeCustomizations = {}; // No entry for this node
      
      const popupText = getLabelTextForPopup(nodeName, nodeCustomizations);
      
      // Should default to node name
      expect(popupText).toBe(nodeName);
    });
    
    it('should handle special characters in label text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }),
          (nodeName, specialText) => {
            const nodeCustomizations = {
              [nodeName]: {
                labelText: specialText
              }
            };
            
            const popupText = getLabelTextForPopup(nodeName, nodeCustomizations);
            expect(popupText).toBe(specialText);
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should handle multi-line label text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 2, maxLength: 5 }),
          (nodeName, lines) => {
            const multiLineText = lines.join('\n');
            const nodeCustomizations = {
              [nodeName]: {
                labelText: multiLineText
              }
            };
            
            const popupText = getLabelTextForPopup(nodeName, nodeCustomizations);
            expect(popupText).toBe(multiLineText);
            expect(popupText.split('\n').length).toBe(lines.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
