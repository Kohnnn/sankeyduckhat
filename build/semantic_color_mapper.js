/**
 * @fileoverview Semantic Color Mapper for Financial Categories
 * Maps financial categories to appropriate semantic colors for Sankey diagrams.
 */

/**
 * Semantic color mapping for financial categories
 * @type {Record<import('./types.js').FinancialCategory, string>}
 */
const SEMANTIC_COLORS = {
  revenue: '#888888',    // Grey - neutral inputs
  expense: '#E15549',    // Red - outflows
  asset: '#888888',      // Grey - neutral
  liability: '#E15549',  // Red - outflows
  profit: '#00AA00',     // Green - retained value
};

/**
 * Get the semantic color for a financial category
 * @param {import('./types.js').FinancialCategory} category - The financial category
 * @returns {string} The hex color code for the category
 * @throws {Error} If the category is not recognized
 */
export function getSemanticColor(category) {
  if (!category) {
    throw new Error('Category is required');
  }
  
  if (!(category in SEMANTIC_COLORS)) {
    throw new Error(`Unknown financial category: ${category}. Valid categories are: ${Object.keys(SEMANTIC_COLORS).join(', ')}`);
  }
  
  return SEMANTIC_COLORS[category];
}

/**
 * Get all available semantic colors
 * @returns {Record<import('./types.js').FinancialCategory, string>} Map of categories to colors
 */
export function getAllSemanticColors() {
  return { ...SEMANTIC_COLORS };
}

/**
 * Check if a category is valid
 * @param {string} category - The category to validate
 * @returns {boolean} True if the category is valid
 */
export function isValidFinancialCategory(category) {
  return category in SEMANTIC_COLORS;
}