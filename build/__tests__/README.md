# Test Infrastructure for AI Integration and Sidebar Redesign

This directory contains the test infrastructure for property-based testing using fast-check.

## Structure

```
__tests__/
├── README.md                    # This file
├── setup.js                     # Test setup and configuration
├── arbitraries.js              # Custom fast-check arbitraries
├── property-test-helpers.js     # Helper utilities for property tests
├── properties/                  # Property-based test files
│   └── *.property.test.js      # Individual property test files
└── *.test.js                   # Unit test files
```

## Property-Based Testing

### Configuration

- Minimum 100 iterations per property test (as specified in design document)
- Timeout: 5000ms for standard tests, 10000ms for complex tests
- Fixed seed (42) for reproducible tests in CI

### Custom Arbitraries

The `arbitraries.js` file provides domain-specific generators for:

- `flowRowArbitrary` - FlowRow objects with valid DSL constraints
- `financialFlowArbitrary` - FinancialFlow objects
- `financialCategoryArbitrary` - Financial category enums
- `tabConfigArbitrary` - Tab configuration objects
- `hexColorArbitrary` - Valid hex color strings
- `nodeNameArbitrary` - Valid node names (no DSL special characters)
- `fileArbitrary` - Mock File objects for upload testing
- `imageBlobArbitrary` - Mock Blob objects for image testing

### Helper Functions

The `property-test-helpers.js` file provides utilities for:

- `propertyTest()` - Wrapper for consistent property test configuration
- `annotatedPropertyTest()` - Property tests with requirement annotations
- `structurallyEquivalent()` - Deep object comparison for round-trip tests
- `numericallyEqual()` - Floating-point comparison with tolerance
- `containsAllSubstrings()` - Text content validation
- `isValidHexColor()` - Color format validation
- `createMockElement()` - Mock DOM elements for UI testing

### Property Test Annotation Format

Each property test must include a comment with this exact format:

```javascript
/**
 * Feature: ai-integration-sidebar-redesign, Property {number}: {description}
 * Validates: Requirements {requirement_numbers}
 */
```

Example:
```javascript
/**
 * Feature: ai-integration-sidebar-redesign, Property 1: DSL Round-Trip Consistency
 * Validates: Requirements 1.4, 4.4, 4.5
 */
```

## Running Tests

```bash
# Run all tests
npm test

# Run only property tests
npm test -- build/__tests__/properties/

# Run specific property test file
npm test -- build/__tests__/properties/dsl-parser.property.test.js

# Run with coverage
npm run test:coverage
```

## Writing Property Tests

1. Import required arbitraries from `arbitraries.js`
2. Import helper functions from `property-test-helpers.js`
3. Use `annotatedPropertyTest()` for requirement traceability
4. Ensure minimum 100 iterations (handled by default config)
5. Use appropriate tolerance for numerical comparisons
6. Test universal properties, not specific examples

Example:

```javascript
import { annotatedPropertyTest } from '../property-test-helpers.js';
import { flowRowArbitrary } from '../arbitraries.js';

annotatedPropertyTest(
  'ai-integration-sidebar-redesign',
  1,
  'DSL Round-Trip Consistency',
  '1.4, 4.4, 4.5',
  flowRowArbitrary,
  (flowRow) => {
    const dsl = serialize(flowRow);
    const parsed = parse(dsl);
    return structurallyEquivalent(flowRow, parsed);
  }
);
```