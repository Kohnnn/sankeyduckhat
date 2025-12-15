/**
 * Property-Based Tests for Templates Module
 * Feature: sankey-refactor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock DOM elements for settings capture
const mockElements = new Map();

// Create a mock element factory
function createMockElement(id, type = 'text', value = '100') {
  return {
    id,
    type,
    value,
    checked: false,
    getAttribute: () => null,
    setAttribute: () => {},
  };
}

// Mock document
global.document = {
  getElementById: (id) => {
    if (!mockElements.has(id)) {
      // Special handling for flows_in textarea
      if (id === 'flows_in') {
        mockElements.set(id, {
          id,
          type: 'textarea',
          value: '',
          getAttribute: () => null,
          setAttribute: () => {},
        });
      } else {
        mockElements.set(id, createMockElement(id));
      }
    }
    return mockElements.get(id);
  },
  querySelector: (selector) => {
    // Handle radio button queries
    if (selector.includes('input[name=')) {
      return { value: 'test-value' };
    }
    return null;
  },
  forms: {
    skm_form: {
      elements: {}
    }
  }
};

// Load the module
await import('../../templates.js');

const Templates = global.Templates;

describe('Templates - Property-Based Tests', () => {
  beforeEach(() => {
    // Clear mock elements
    mockElements.clear();
    
    // Clear all templates from the module
    const allTemplates = Templates.getAll();
    allTemplates.forEach(t => Templates.delete(t.name));
  });

  /**
   * **Feature: sankey-refactor, Property 4: Template Persistence Round-Trip**
   * **Validates: Requirements 4.5, 4.9**
   * 
   * For any valid template (name and settings object), saving the template
   * and then retrieving it SHALL return an equivalent template object.
   */
  it('Property 4: Template Persistence Round-Trip - save and retrieve returns equivalent template', () => {
    fc.assert(
      fc.property(
        // Generate a template name
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (templateName) => {
          // Save a template
          const savedTemplate = Templates.save(templateName);
          
          // Verify the template was saved
          expect(savedTemplate).toBeTruthy();
          expect(savedTemplate.name).toBe(templateName);
          expect(savedTemplate.settings).toBeTruthy();
          expect(savedTemplate.createdAt).toBeTruthy();
          
          // Retrieve the template
          const retrievedTemplate = Templates.get(templateName);
          
          // Verify the retrieved template matches the saved one
          expect(retrievedTemplate).toBeTruthy();
          expect(retrievedTemplate.name).toBe(savedTemplate.name);
          expect(retrievedTemplate.createdAt).toBe(savedTemplate.createdAt);
          
          // Verify settings are equivalent
          expect(retrievedTemplate.settings).toEqual(savedTemplate.settings);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4 (persistence): Template survives localStorage round-trip', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (templateName) => {
          // Save a template
          const savedTemplate = Templates.save(templateName);
          
          // Verify it's in localStorage
          const stored = localStorage.getItem('skm_templates');
          expect(stored).toBeTruthy();
          
          // Parse and verify
          const parsed = JSON.parse(stored);
          expect(Array.isArray(parsed)).toBe(true);
          expect(parsed.length).toBeGreaterThan(0);
          
          // Find our template
          const foundTemplate = parsed.find(t => t.name === templateName);
          expect(foundTemplate).toBeTruthy();
          expect(foundTemplate.name).toBe(templateName);
          expect(foundTemplate.settings).toEqual(savedTemplate.settings);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4 (edge case): Multiple templates can be saved and retrieved', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 10 }
        ).map(arr => [...new Set(arr)]), // Ensure unique names
        (templateNames) => {
          // Clear all templates before this iteration
          const existingTemplates = Templates.getAll();
          existingTemplates.forEach(t => Templates.delete(t.name));
          
          // Save all templates
          const savedTemplates = templateNames.map(name => Templates.save(name));
          
          // Retrieve all templates
          const allTemplates = Templates.getAll();
          
          // Verify count matches
          expect(allTemplates.length).toBe(templateNames.length);
          
          // Verify each template can be retrieved
          templateNames.forEach((name, index) => {
            const retrieved = Templates.get(name);
            expect(retrieved).toBeTruthy();
            expect(retrieved.name).toBe(name);
            expect(retrieved.settings).toEqual(savedTemplates[index].settings);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 4 (edge case): Overwriting template with same name updates it', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (templateName) => {
          // Save template first time
          const firstSave = Templates.save(templateName);
          const firstTimestamp = firstSave.createdAt;
          
          // Wait a tiny bit to ensure different timestamp
          const now = Date.now();
          while (Date.now() === now) { /* busy wait */ }
          
          // Save template second time with same name
          const secondSave = Templates.save(templateName);
          const secondTimestamp = secondSave.createdAt;
          
          // Timestamps should be different
          expect(secondTimestamp).not.toBe(firstTimestamp);
          
          // Should only have one template with this name
          const allTemplates = Templates.getAll();
          const matchingTemplates = allTemplates.filter(t => t.name === templateName);
          expect(matchingTemplates.length).toBe(1);
          
          // Retrieved template should have the newer timestamp
          const retrieved = Templates.get(templateName);
          expect(retrieved.createdAt).toBe(secondTimestamp);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Feature: sankey-refactor, Property 5: Template Application Round-Trip**
   * **Validates: Requirements 4.3, 4.6**
   * 
   * For any saved template, applying it to the UI and then capturing current settings
   * SHALL produce settings equivalent to the original template.
   */
  it('Property 5: Template Application Round-Trip - apply then capture returns equivalent settings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (templateName) => {
          // Clear existing templates
          const existingTemplates = Templates.getAll();
          existingTemplates.forEach(t => Templates.delete(t.name));
          
          // Save a template with current settings
          const originalTemplate = Templates.save(templateName);
          const originalSettings = originalTemplate.settings;
          
          // Apply the template
          const applied = Templates.apply(templateName);
          expect(applied).toBe(true);
          
          // Capture current settings
          const capturedSettings = Templates.captureCurrentSettings();
          
          // Captured settings should match original settings
          expect(capturedSettings).toEqual(originalSettings);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 (edge case): Applying non-existent template returns false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (nonExistentName) => {
          // Clear existing templates
          const existingTemplates = Templates.getAll();
          existingTemplates.forEach(t => Templates.delete(t.name));
          
          // Try to apply non-existent template
          const applied = Templates.apply(nonExistentName);
          
          // Should return false
          expect(applied).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: sankey-refactor, Property 6: Template Flow Data Invariant**
   * **Validates: Requirements 4.4, 4.7**
   * 
   * For any template save or apply operation, the flow data (source, target, amount values
   * in the DSL) SHALL remain unchanged.
   */
  it('Property 6: Template Flow Data Invariant - flow data unchanged by save', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }),
        (templateName, flowData) => {
          // Set up flow data in textarea
          const flowsTextarea = document.getElementById('flows_in');
          if (flowsTextarea) {
            flowsTextarea.value = flowData;
          }
          
          // Get initial flow data
          const initialFlowData = flowsTextarea ? flowsTextarea.value : '';
          
          // Save template
          Templates.save(templateName);
          
          // Get flow data after save
          const afterSaveFlowData = flowsTextarea ? flowsTextarea.value : '';
          
          // Flow data should be unchanged
          expect(afterSaveFlowData).toBe(initialFlowData);
          
          // Clean up
          Templates.delete(templateName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: Template Flow Data Invariant - flow data unchanged by apply', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }),
        (templateName, flowData) => {
          // Save a template first
          Templates.save(templateName);
          
          // Set up flow data in textarea
          const flowsTextarea = document.getElementById('flows_in');
          if (flowsTextarea) {
            flowsTextarea.value = flowData;
          }
          
          // Get initial flow data
          const initialFlowData = flowsTextarea ? flowsTextarea.value : '';
          
          // Apply template
          Templates.apply(templateName);
          
          // Get flow data after apply
          const afterApplyFlowData = flowsTextarea ? flowsTextarea.value : '';
          
          // Flow data should be unchanged
          expect(afterApplyFlowData).toBe(initialFlowData);
          
          // Clean up
          Templates.delete(templateName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6 (edge case): Template settings do not include flows_in field', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (templateName) => {
          // Save a template
          const template = Templates.save(templateName);
          
          // Verify settings object does not contain flows_in
          expect(template.settings).toBeTruthy();
          expect(template.settings.flows_in).toBeUndefined();
          
          // Clean up
          Templates.delete(templateName);
        }
      ),
      { numRuns: 100 }
    );
  });
});
