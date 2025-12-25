import type { Flow } from '../store/useDiagramStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface NodeGrowthData {
  currentTotal: number;
  previousTotal: number;
  growthPercent: number | null;  // null if no comparison data
}

// ============================================================================
// Growth Calculation Functions
// ============================================================================

/**
 * Calculates Y/Y growth for a node based on incoming flows
 * @param nodeName - The node to calculate growth for
 * @param flows - All flows in the diagram
 * @returns Growth data including current, previous totals and percentage
 * 
 * Requirements: 2.1, 2.2
 */
export function calculateNodeGrowth(nodeName: string, flows: Flow[]): NodeGrowthData {
  // Get all flows where this node is the target
  const incomingFlows = flows.filter(f => f.target === nodeName);
  
  // Sum current values for incoming flows
  const currentTotal = incomingFlows.reduce((sum, f) => sum + f.value, 0);
  
  // Sum comparison values for incoming flows
  const previousTotal = incomingFlows.reduce((sum, f) => sum + (f.comparisonValue ?? 0), 0);
  
  // Check if we have any comparison data
  const hasComparisonData = incomingFlows.some(f => f.comparisonValue !== undefined);
  
  // Return null for growthPercent if no comparison data or division by zero
  if (!hasComparisonData || previousTotal === 0) {
    return { currentTotal, previousTotal, growthPercent: null };
  }
  
  // Calculate percentage: ((current - previous) / previous) * 100
  const growthPercent = ((currentTotal - previousTotal) / previousTotal) * 100;
  
  return { currentTotal, previousTotal, growthPercent };
}

/**
 * Formats a growth percentage with sign and one decimal place
 * @param percent - The growth percentage
 * @returns Formatted string (e.g., "+12.5%", "-3.2%")
 * 
 * Requirements: 2.4, 2.5, 2.7
 */
export function formatGrowth(percent: number): string {
  // Add "+" prefix for positive/zero values
  const sign = percent >= 0 ? '+' : '';
  // Format to one decimal place and append "%" suffix
  return `${sign}${percent.toFixed(1)}%`;
}
