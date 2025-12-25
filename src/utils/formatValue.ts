/**
 * Value Formatting Utility
 * 
 * Provides functions to format numeric values with appropriate suffixes
 * for display in node labels. Large numbers are abbreviated with K (thousands)
 * or M (millions) suffixes for readability.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

/**
 * Formats a numeric value with appropriate suffix (K, M)
 * 
 * - Values < 1000: displayed as full number
 * - Values >= 1000 and < 1,000,000: displayed with "K" suffix
 * - Values >= 1,000,000: displayed with "M" suffix
 * - Abbreviated values have exactly one decimal place
 * 
 * @param value - The numeric value to format
 * @param prefix - Optional prefix (e.g., "$")
 * @returns Formatted string (e.g., "$50M", "1.5K", "500")
 */
export const formatValue = (value: number, prefix?: string): string => {
  const p = prefix || '';
  
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${p}${millions.toFixed(1)}M`;
  }
  
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${p}${thousands.toFixed(1)}K`;
  }
  
  return `${p}${value}`;
};
