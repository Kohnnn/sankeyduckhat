/**
 * @fileoverview Flow Validator Module
 * Validates that Sankey diagram flows are balanced and provides node statistics
 */

/**
 * Flow Validator class for validating Sankey diagram balance
 */
class FlowValidator {
  /**
   * Check if all intermediate nodes are balanced
   * @param {FlowRow[]} flows - Array of flow rows to validate
   * @returns {BalanceResult} Balance validation result
   */
  validateBalance(flows) {
    if (!Array.isArray(flows)) {
      return { isBalanced: true, imbalancedNodes: [] };
    }

    const nodeStats = this.getNodeStats(flows);
    const imbalancedNodes = [];

    // Check each node for balance (excluding source and sink nodes)
    for (const [nodeName, stats] of nodeStats) {
      // Skip source nodes (no inputs) and sink nodes (no outputs)
      if (stats.isSource || stats.isSink) {
        continue;
      }

      // Check if intermediate node is balanced
      const tolerance = 0.01; // Small tolerance for floating-point precision
      const difference = Math.abs(stats.totalIn - stats.totalOut);
      
      if (difference > tolerance) {
        imbalancedNodes.push({
          name: nodeName,
          totalIn: stats.totalIn,
          totalOut: stats.totalOut,
          difference: stats.totalOut - stats.totalIn // Positive means more out than in
        });
      }
    }

    return {
      isBalanced: imbalancedNodes.length === 0,
      imbalancedNodes: imbalancedNodes
    };
  }

  /**
   * Get node statistics for all nodes in the flow
   * @param {FlowRow[]} flows - Array of flow rows to analyze
   * @returns {Map<string, NodeStats>} Map of node names to their statistics
   */
  getNodeStats(flows) {
    if (!Array.isArray(flows)) {
      return new Map();
    }

    const nodeStats = new Map();

    // Initialize stats for all nodes
    const initializeNode = (nodeName) => {
      if (!nodeStats.has(nodeName)) {
        nodeStats.set(nodeName, {
          totalIn: 0,
          totalOut: 0,
          isSource: true,  // Will be set to false if node has inputs
          isSink: true     // Will be set to false if node has outputs
        });
      }
    };

    // First pass: collect all node names and initialize stats
    for (const flow of flows) {
      if (!flow || !flow.source || !flow.target) {
        continue;
      }

      initializeNode(flow.source);
      initializeNode(flow.target);
    }

    // Second pass: calculate totals and determine source/sink status
    for (const flow of flows) {
      if (!flow || !flow.source || !flow.target) {
        continue;
      }

      const amount = this._parseFlowAmount(flow.amount);
      if (amount <= 0) {
        continue; // Skip invalid amounts
      }

      const sourceStats = nodeStats.get(flow.source);
      const targetStats = nodeStats.get(flow.target);

      // Update totals
      sourceStats.totalOut += amount;
      targetStats.totalIn += amount;

      // Update source/sink status
      sourceStats.isSink = false;  // Source node has outputs
      targetStats.isSource = false; // Target node has inputs
    }

    return nodeStats;
  }

  /**
   * Generate user-friendly warning messages for imbalanced nodes
   * @param {ImbalancedNode[]} imbalancedNodes - Array of imbalanced nodes
   * @returns {string[]} Array of formatted warning messages
   */
  formatImbalanceWarnings(imbalancedNodes) {
    if (!Array.isArray(imbalancedNodes) || imbalancedNodes.length === 0) {
      return [];
    }

    return imbalancedNodes.map(node => {
      const absDiscrepancy = Math.abs(node.difference);
      const direction = node.difference > 0 ? 'more outflow than inflow' : 'more inflow than outflow';
      
      return `Node '${node.name}' is imbalanced: ${direction} by ${absDiscrepancy.toFixed(2)} ` +
             `(in: ${node.totalIn.toFixed(2)}, out: ${node.totalOut.toFixed(2)})`;
    });
  }

  /**
   * Get a summary status message for the entire flow validation
   * @param {BalanceResult} balanceResult - Result from validateBalance()
   * @returns {string} Summary status message
   */
  getStatusMessage(balanceResult) {
    if (!balanceResult) {
      return 'Unable to validate flow balance';
    }

    if (balanceResult.isBalanced) {
      return 'All nodes are balanced';
    }

    const nodeCount = balanceResult.imbalancedNodes.length;
    const nodeWord = nodeCount === 1 ? 'node' : 'nodes';
    
    return `Warning: ${nodeCount} ${nodeWord} ${nodeCount === 1 ? 'is' : 'are'} imbalanced`;
  }

  /**
   * Parse flow amount from various formats
   * @private
   * @param {string|number} amount - Amount to parse
   * @returns {number} Parsed numeric amount
   */
  _parseFlowAmount(amount) {
    if (typeof amount === 'number') {
      return amount;
    }

    if (typeof amount === 'string') {
      // Handle wildcard amounts (auto-calculated)
      if (amount === '*') {
        return 0; // Skip wildcard amounts in balance calculations
      }

      // Handle comparison amounts (Current|Comparison format)
      if (amount.includes('|')) {
        const [current] = amount.split('|');
        const parsed = parseFloat(current);
        return isNaN(parsed) ? 0 : parsed;
      }

      // Parse regular numeric string
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }
}

// Create default instance for module exports
const flowValidator = new FlowValidator();

// Individual functions for convenience
const validateBalance = (flows) => flowValidator.validateBalance(flows);
const getNodeStats = (flows) => flowValidator.getNodeStats(flows);
const formatImbalanceWarnings = (imbalancedNodes) => flowValidator.formatImbalanceWarnings(imbalancedNodes);
const getStatusMessage = (balanceResult) => flowValidator.getStatusMessage(balanceResult);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        FlowValidator, 
        flowValidator, 
        validateBalance, 
        getNodeStats, 
        formatImbalanceWarnings, 
        getStatusMessage 
    };
}

// Make available globally for compatibility with existing code
if (typeof window !== 'undefined') {
  window.FlowValidator = FlowValidator;
  window.flowValidator = flowValidator;
  window.validateBalance = validateBalance;
  window.getNodeStats = getNodeStats;
  window.formatImbalanceWarnings = formatImbalanceWarnings;
  window.getStatusMessage = getStatusMessage;
}