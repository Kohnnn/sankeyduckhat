/**
 * @fileoverview YoY Growth Calculator Module
 * Provides functions for calculating year-over-year growth percentages
 * for financial data visualization in Sankey diagrams.
 */

/**
 * Calculate Year-over-Year growth percentage
 * @param {number} current - Current period value
 * @param {number} comparison - Comparison period value
 * @returns {string} Formatted percentage string (e.g., "+15.2%" or "-8.7%")
 * @throws {Error} If comparison is zero or inputs are invalid
 */
export function calculateYoYGrowth(current, comparison) {
    // Input validation
    if (typeof current !== 'number' || typeof comparison !== 'number') {
        throw new Error('Both current and comparison values must be numbers');
    }
    
    if (!isFinite(current) || !isFinite(comparison)) {
        throw new Error('Both current and comparison values must be finite numbers');
    }
    
    // Handle zero comparison case
    if (comparison === 0) {
        if (current === 0) {
            return "0.0%";
        }
        // When comparison is zero but current is not, growth is infinite
        // Return a special indicator for this case
        return current > 0 ? "+∞%" : "-∞%";
    }
    
    // Handle negative values appropriately
    // For financial data, we calculate growth as: ((current - comparison) / |comparison|) * 100
    const growthRate = ((current - comparison) / Math.abs(comparison)) * 100;
    
    // Format the result
    const sign = growthRate >= 0 ? '+' : '';
    const formattedRate = growthRate.toFixed(1);
    
    return `${sign}${formattedRate}%`;
}

/**
 * Calculate YoY growth for multiple values
 * @param {number[]} currentValues - Array of current period values
 * @param {number[]} comparisonValues - Array of comparison period values
 * @returns {string[]} Array of formatted percentage strings
 * @throws {Error} If arrays have different lengths
 */
export function calculateMultipleYoYGrowth(currentValues, comparisonValues) {
    if (!Array.isArray(currentValues) || !Array.isArray(comparisonValues)) {
        throw new Error('Both parameters must be arrays');
    }
    
    if (currentValues.length !== comparisonValues.length) {
        throw new Error('Current and comparison arrays must have the same length');
    }
    
    return currentValues.map((current, index) => {
        const comparison = comparisonValues[index];
        return calculateYoYGrowth(current, comparison);
    });
}

/**
 * Check if a YoY growth value indicates significant change
 * @param {string} yoyGrowth - Formatted YoY growth string (e.g., "+15.2%")
 * @param {number} threshold - Threshold percentage for significance (default: 5.0)
 * @returns {boolean} True if the growth is significant (above threshold)
 */
export function isSignificantGrowth(yoyGrowth, threshold = 5.0) {
    if (typeof yoyGrowth !== 'string') {
        throw new Error('YoY growth must be a formatted string');
    }
    
    // Handle infinite growth cases
    if (yoyGrowth.includes('∞')) {
        return true;
    }
    
    // Extract numeric value from formatted string
    const numericValue = parseFloat(yoyGrowth.replace(/[+%]/g, ''));
    
    if (isNaN(numericValue)) {
        throw new Error('Invalid YoY growth format');
    }
    
    return Math.abs(numericValue) >= threshold;
}