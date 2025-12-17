/**
 * @fileoverview Custom arbitraries for property-based testing
 * This file contains fast-check arbitraries for domain-specific types
 */

import fc from 'fast-check';

/**
 * Arbitrary for generating valid hex colors
 * @returns {fc.Arbitrary<string>} Hex color string (e.g., '#FF0000')
 */
export const hexColorArbitrary = fc.hexaString({ minLength: 6, maxLength: 6 })
  .map(s => '#' + s.toUpperCase());

/**
 * Arbitrary for generating valid node names (no brackets or special DSL characters)
 * @returns {fc.Arbitrary<string>} Valid node name
 */
export const nodeNameArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)
  .filter(s => !s.includes('[') && !s.includes(']') && !s.includes('|'))
  .map(s => s.trim());

/**
 * Arbitrary for generating valid flow amounts
 * @returns {fc.Arbitrary<string|number>} Flow amount (number or '*')
 */
export const flowAmountArbitrary = fc.oneof(
  fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true }).map(n => parseFloat(n.toFixed(2))),
  fc.constant('*')
);

/**
 * Arbitrary for generating FlowRow objects
 * @returns {fc.Arbitrary<FlowRow>} FlowRow object
 */
export const flowRowArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  source: nodeNameArbitrary,
  target: nodeNameArbitrary,
  amount: flowAmountArbitrary,
  comparison: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true })),
  color: fc.option(hexColorArbitrary),
  isValid: fc.boolean(),
  errors: fc.array(fc.string(), { maxLength: 5 })
});

/**
 * Arbitrary for generating FinancialCategory values
 * @returns {fc.Arbitrary<FinancialCategory>} Financial category
 */
export const financialCategoryArbitrary = fc.constantFrom(
  'revenue', 'expense', 'asset', 'liability', 'profit'
);

/**
 * Arbitrary for generating FinancialFlow objects
 * @returns {fc.Arbitrary<FinancialFlow>} FinancialFlow object
 */
export const financialFlowArbitrary = fc.record({
  source: nodeNameArbitrary,
  target: nodeNameArbitrary,
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true }),
  comparisonAmount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true })),
  category: financialCategoryArbitrary,
  color: fc.option(hexColorArbitrary)
});

/**
 * Arbitrary for generating TabConfig objects
 * @returns {fc.Arbitrary<TabConfig>} TabConfig object
 */
export const tabConfigArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  icon: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  defaultExpanded: fc.boolean()
}).map(config => ({
  ...config,
  // Create a mock HTMLElement for testing
  content: {
    tagName: 'DIV',
    innerHTML: `Content for ${config.title}`,
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    }
  }
}));

/**
 * Arbitrary for generating TabState objects
 * @returns {fc.Arbitrary<TabState>} TabState object
 */
export const tabStateArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  isExpanded: fc.boolean(),
  animationDuration: fc.integer({ min: 200, max: 400 })
});

/**
 * Arbitrary for generating ParsedFinancialData objects
 * @returns {fc.Arbitrary<ParsedFinancialData>} ParsedFinancialData object
 */
export const parsedFinancialDataArbitrary = fc.record({
  flows: fc.array(financialFlowArbitrary, { minLength: 1, maxLength: 10 }),
  metadata: fc.record({
    documentType: fc.constantFrom('income_statement', 'cash_flow', 'balance_sheet', 'custom'),
    period: fc.string({ minLength: 4, maxLength: 20 }),
    comparisonPeriod: fc.option(fc.string({ minLength: 4, maxLength: 20 }))
  }),
  suggestedColors: fc.dictionary(
    nodeNameArbitrary,
    hexColorArbitrary,
    { maxKeys: 10 }
  ).map(dict => new Map(Object.entries(dict)))
});

/**
 * Arbitrary for generating SystemPromptConfig objects
 * @returns {fc.Arbitrary<SystemPromptConfig>} SystemPromptConfig object
 */
export const systemPromptConfigArbitrary = fc.record({
  basePrompt: fc.string({ minLength: 10, maxLength: 500 }),
  financialTerms: fc.array(fc.string({ minLength: 2, maxLength: 20 }), { minLength: 5, maxLength: 20 }),
  flowGenerationRules: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 3, maxLength: 10 }),
  outputFormat: fc.string({ minLength: 10, maxLength: 200 })
});

/**
 * Arbitrary for generating valid file objects for upload testing
 * @returns {fc.Arbitrary<File>} Mock File object
 */
export const fileArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.png'),
  type: fc.constantFrom('image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'text/plain', 'application/json'),
  size: fc.integer({ min: 1, max: 10000000 })
}).map(({ name, type, size }) => ({
  name,
  type,
  size,
  lastModified: Date.now(),
  // Mock File methods
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(size)),
  text: () => Promise.resolve('mock file content'),
  stream: () => new ReadableStream()
}));

/**
 * Arbitrary for generating image blob data
 * @returns {fc.Arbitrary<Blob>} Mock Blob object representing image data
 */
export const imageBlobArbitrary = fc.record({
  type: fc.constantFrom('image/png', 'image/jpeg', 'image/jpg'),
  size: fc.integer({ min: 1000, max: 5000000 })
}).map(({ type, size }) => ({
  type,
  size,
  // Mock Blob methods
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(size)),
  text: () => Promise.resolve('mock blob content'),
  stream: () => new ReadableStream(),
  slice: () => ({ type, size: size / 2 })
}));