/**
 * @fileoverview Node Label Generator Module
 * Provides functions for generating formatted node labels for Sankey diagrams
 * with currency formatting and YoY growth percentages.
 */

/**
 * Generate a formatted node label with name, value, and optional YoY growth
 * @param {string} name - The node name
 * @param {number} value - The node value (absolute amount)
 * @param {string} [yoyGrowth] - Optional YoY growth percentage string (e.g., "+15.2%")
 * @returns {string} Formatted label string
 */
export function generateNodeLabel(name, value, yoyGrowth) {
    // Input validation
    if (typeof name !== 'string' || name.trim() === '') {
        throw new Error('Node name must be a non-empty string');
    }
    
    if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error('Node value must be a finite number');
    }
    
    if (yoyGrowth !== undefined && typeof yoyGrowth !== 'string') {
        throw new Error('YoY growth must be a string or undefined');
    }
    
    // Format the value with short scale (k/M/B) and currency prefix
    const formattedValue = formatValueWithShortScale(Math.abs(value));
    
    // Build the label
    let label = `${name.trim()}\n${formattedValue}`;
    
    // Add YoY growth if provided
    if (yoyGrowth && yoyGrowth.trim() !== '') {
        label += `\n(${yoyGrowth.trim()})`;
    }
    
    return label;
}

/**
 * Format a numeric value with currency prefix and short scale suffixes
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted value string (e.g., "$1.2M", "$500k", "$50")
 */
function formatValueWithShortScale(value) {
    // Use absolute value for formatting
    const absValue = Math.abs(value);
    
    let formattedNumber;
    let suffix = '';
    
    // Apply short scale formatting
    if (absValue >= 1e9) {
        formattedNumber = (absValue / 1e9).toFixed(1);
        suffix = 'B';
    } else if (absValue >= 1e6) {
        formattedNumber = (absValue / 1e6).toFixed(1);
        suffix = 'M';
    } else if (absValue >= 1e3) {
        formattedNumber = (absValue / 1e3).toFixed(1);
        suffix = 'k';
    } else {
        formattedNumber = absValue.toFixed(0);
    }
    
    // Remove unnecessary decimal places (e.g., "1.0M" becomes "1M")
    if (formattedNumber.endsWith('.0')) {
        formattedNumber = formattedNumber.slice(0, -2);
    }
    
    // Add currency prefix
    return `$${formattedNumber}${suffix}`;
}

/**
 * Generate labels for multiple nodes
 * @param {Array<{name: string, value: number, yoyGrowth?: string}>} nodes - Array of node data
 * @returns {string[]} Array of formatted label strings
 */
export function generateMultipleNodeLabels(nodes) {
    if (!Array.isArray(nodes)) {
        throw new Error('Nodes must be an array');
    }
    
    return nodes.map(node => {
        if (!node || typeof node !== 'object') {
            throw new Error('Each node must be an object');
        }
        
        const { name, value, yoyGrowth } = node;
        return generateNodeLabel(name, value, yoyGrowth);
    });
}

/**
 * Check if a label contains all required components
 * @param {string} label - The generated label string
 * @param {string} expectedName - Expected node name
 * @param {number} expectedValue - Expected node value
 * @param {string} [expectedYoyGrowth] - Expected YoY growth string
 * @returns {boolean} True if label contains all expected components
 */
export function validateLabelCompleteness(label, expectedName, expectedValue, expectedYoyGrowth) {
    if (typeof label !== 'string') {
        return false;
    }
    
    // Check if label contains the node name
    if (!label.includes(expectedName)) {
        return false;
    }
    
    // Check if label contains a formatted value (should have $ and potentially k/M/B)
    const hasFormattedValue = /\$[\d,]+(\.\d+)?[kMB]?/.test(label);
    if (!hasFormattedValue) {
        return false;
    }
    
    // If YoY growth is expected, check if it's present
    if (expectedYoyGrowth && expectedYoyGrowth.trim() !== '') {
        const hasYoyGrowth = label.includes('(') && label.includes(')') && label.includes('%');
        if (!hasYoyGrowth) {
            return false;
        }
    }
    
    return true;
}