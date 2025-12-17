/**
 * @fileoverview Helper utilities for property-based testing
 * This file contains common utilities and configuration for property tests
 */

import fc from 'fast-check';

/**
 * Default configuration for property-based tests
 * Ensures minimum 100 iterations as specified in design document
 */
export const DEFAULT_PROPERTY_CONFIG = {
  numRuns: 100,
  timeout: 5000,
  verbose: false
};

/**
 * Enhanced property test configuration for complex properties
 */
export const COMPLEX_PROPERTY_CONFIG = {
  numRuns: 200,
  timeout: 10000,
  verbose: false
};

/**
 * Wrapper function for property tests with consistent configuration
 * @param {string} testName - Name of the property test
 * @param {fc.Arbitrary} arbitrary - Fast-check arbitrary
 * @param {Function} predicate - Property predicate function
 * @param {Object} [config] - Optional configuration override
 */
export function propertyTest(testName, arbitrary, predicate, config = {}) {
  const finalConfig = { ...DEFAULT_PROPERTY_CONFIG, ...config };
  
  test(testName, () => {
    fc.assert(
      fc.property(arbitrary, predicate),
      finalConfig
    );
  });
}

/**
 * Helper to create property test with requirement validation annotation
 * @param {string} featureName - Feature name
 * @param {number} propertyNumber - Property number from design document
 * @param {string} propertyDescription - Brief property description
 * @param {string} requirements - Requirements being validated (e.g., "1.4, 4.4, 4.5")
 * @param {fc.Arbitrary} arbitrary - Fast-check arbitrary
 * @param {Function} predicate - Property predicate function
 * @param {Object} [config] - Optional configuration override
 */
export function annotatedPropertyTest(
  featureName,
  propertyNumber,
  propertyDescription,
  requirements,
  arbitrary,
  predicate,
  config = {}
) {
  const testName = `Property ${propertyNumber}: ${propertyDescription}`;
  const annotation = `/**
 * Feature: ${featureName}, Property ${propertyNumber}: ${propertyDescription}
 * Validates: Requirements ${requirements}
 */`;
  
  // Log annotation for documentation purposes
  console.log(annotation);
  
  propertyTest(testName, arbitrary, predicate, config);
}

/**
 * Helper to validate that two objects are structurally equivalent
 * Useful for round-trip property testing
 * @param {any} obj1 - First object
 * @param {any} obj2 - Second object
 * @param {string[]} [ignoreFields] - Fields to ignore in comparison
 * @returns {boolean} Whether objects are equivalent
 */
export function structurallyEquivalent(obj1, obj2, ignoreFields = []) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  if (typeof obj1 !== typeof obj2) return false;
  
  if (Array.isArray(obj1)) {
    if (!Array.isArray(obj2) || obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => 
      structurallyEquivalent(item, obj2[index], ignoreFields)
    );
  }
  
  if (typeof obj1 === 'object') {
    const keys1 = Object.keys(obj1).filter(key => !ignoreFields.includes(key));
    const keys2 = Object.keys(obj2).filter(key => !ignoreFields.includes(key));
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => 
      keys2.includes(key) && 
      structurallyEquivalent(obj1[key], obj2[key], ignoreFields)
    );
  }
  
  return obj1 === obj2;
}

/**
 * Helper to validate numeric equality with tolerance
 * Useful for floating-point comparisons in financial calculations
 * @param {number} actual - Actual value
 * @param {number} expected - Expected value
 * @param {number} [tolerance] - Tolerance for comparison (default: 0.001)
 * @returns {boolean} Whether values are equal within tolerance
 */
export function numericallyEqual(actual, expected, tolerance = 0.001) {
  if (typeof actual !== 'number' || typeof expected !== 'number') {
    return actual === expected;
  }
  return Math.abs(actual - expected) <= tolerance;
}

/**
 * Helper to validate that a string contains all required substrings
 * Useful for testing label completeness and content validation
 * @param {string} text - Text to search in
 * @param {string[]} requiredSubstrings - Substrings that must be present
 * @returns {boolean} Whether all substrings are found
 */
export function containsAllSubstrings(text, requiredSubstrings) {
  if (typeof text !== 'string') return false;
  return requiredSubstrings.every(substring => 
    text.includes(substring)
  );
}

/**
 * Helper to validate color format (hex colors)
 * @param {string} color - Color string to validate
 * @returns {boolean} Whether color is valid hex format
 */
export function isValidHexColor(color) {
  if (typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Helper to validate file type against allowed types
 * @param {string} mimeType - MIME type to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} Whether file type is allowed
 */
export function isAllowedFileType(mimeType, allowedTypes) {
  return allowedTypes.includes(mimeType);
}

/**
 * Mock DOM element creator for testing UI components
 * @param {string} tagName - HTML tag name
 * @param {Object} [attributes] - Element attributes
 * @returns {Object} Mock DOM element
 */
export function createMockElement(tagName = 'div', attributes = {}) {
  return {
    tagName: tagName.toUpperCase(),
    ...attributes,
    style: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => false),
      toggle: vi.fn()
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    innerHTML: '',
    textContent: '',
    getAttribute: vi.fn(),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn()
  };
}