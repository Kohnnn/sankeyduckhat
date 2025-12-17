/**
 * @fileoverview Type definitions for AI Integration and Sidebar Redesign
 * This file contains JSDoc type definitions for all interfaces used in the system.
 */

/**
 * @typedef {Object} FlowRow
 * @property {string} id - Unique identifier for the flow row
 * @property {string} source - Source node name
 * @property {string} target - Target node name
 * @property {string|number} amount - Flow amount (number or '*' for auto-calculated)
 * @property {number} [comparison] - Optional comparison amount for YoY calculations
 * @property {string} [color] - Optional hex color code (e.g., '#FF0000')
 * @property {boolean} isValid - Whether the row data is valid
 * @property {string[]} errors - Array of validation error messages
 */

/**
 * @typedef {Object} FinancialFlow
 * @property {string} source - Source node name
 * @property {string} target - Target node name
 * @property {number} amount - Flow amount
 * @property {number} [comparisonAmount] - Optional comparison amount for YoY calculations
 * @property {'revenue'|'expense'|'asset'|'liability'|'profit'} category - Financial category
 * @property {string} [color] - Optional hex color code
 */

/**
 * @typedef {Object} ParsedFinancialData
 * @property {FinancialFlow[]} flows - Array of parsed financial flows
 * @property {Object} metadata - Document metadata
 * @property {'income_statement'|'cash_flow'|'balance_sheet'|'custom'} metadata.documentType - Type of financial document
 * @property {string} metadata.period - Time period for the data
 * @property {string} [metadata.comparisonPeriod] - Optional comparison period
 * @property {Map<string, string>} suggestedColors - Map of node names to suggested colors
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {SyntaxError[]} errors - Array of syntax errors found
 */

/**
 * @typedef {Object} SyntaxError
 * @property {number} line - Line number where error occurred
 * @property {number} column - Column number where error occurred
 * @property {string} message - Error description
 * @property {string} code - Error code identifier
 */

/**
 * @typedef {Object} TabConfig
 * @property {string} id - Unique tab identifier
 * @property {string} title - Display title for the tab
 * @property {string} [icon] - Optional icon class or URL
 * @property {HTMLElement} content - Tab content element
 * @property {boolean} defaultExpanded - Whether tab should be expanded by default
 */

/**
 * @typedef {Object} TabState
 * @property {string} id - Tab identifier
 * @property {boolean} isExpanded - Whether the tab is currently expanded
 * @property {number} animationDuration - Animation duration in milliseconds (200-400ms)
 */

/**
 * @typedef {Object} SidebarState
 * @property {TabState[]} tabs - Array of tab states
 * @property {string|null} activeTab - ID of currently active tab, null if none
 */

/**
 * @typedef {Object} AIResult
 * @property {'flows'|'message'} type - Type of AI result
 * @property {FinancialFlow[]} [flows] - Array of flows if type is 'flows'
 * @property {string} [message] - Message text if type is 'message'
 */

/**
 * @typedef {Object} SystemPromptConfig
 * @property {string} basePrompt - Base system prompt text
 * @property {string[]} financialTerms - Array of recognized financial terms
 * @property {string[]} flowGenerationRules - Array of flow generation rules
 * @property {string} outputFormat - Expected output format description
 */

/**
 * @typedef {Object} BalanceResult
 * @property {boolean} isBalanced - Whether all nodes are balanced
 * @property {ImbalancedNode[]} imbalancedNodes - Array of nodes with imbalances
 */

/**
 * @typedef {Object} ImbalancedNode
 * @property {string} name - Node name
 * @property {number} totalIn - Total input amount
 * @property {number} totalOut - Total output amount
 * @property {number} difference - Difference between inputs and outputs
 */

/**
 * @typedef {Object} NodeStats
 * @property {number} totalIn - Total input amount
 * @property {number} totalOut - Total output amount
 * @property {boolean} isSource - Whether node has no inputs (source node)
 * @property {boolean} isSink - Whether node has no outputs (sink node)
 */

/**
 * Financial category type
 * @typedef {'revenue'|'expense'|'asset'|'liability'|'profit'} FinancialCategory
 */

// Export types for use in other modules (ES6 modules don't export types, but this helps with documentation)
export {};