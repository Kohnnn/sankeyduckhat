/**
 * AIController - Manages AI interactions with diagram data
 * Provides methods for reading, modifying, and validating diagram data
 * 
 * Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.8
 */

const AIController = {
  /**
   * Get the current diagram data from the data table
   * @returns {Object} Diagram data with flows and nodes
   */
  getDiagramData() {
    const flows = [];
    const nodes = new Set();
    
    // Read from data table
    const tbody = document.getElementById('data-table-body');
    if (!tbody) {
      return { flows: [], nodes: [], nodeCustomizations: {}, error: 'Data table not found' };
    }
    
    tbody.querySelectorAll('tr').forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 3) {
        const source = inputs[0].value.trim();
        const target = inputs[1].value.trim();
        const amount = parseFloat(inputs[2].value) || 0;
        
        if (source && target && amount > 0) {
          flows.push({ source, target, amount });
          nodes.add(source);
          nodes.add(target);
        }
      }
    });
    
    // Get node customizations
    const customizations = {};
    if (typeof nodeCustomizations !== 'undefined') {
      Object.keys(nodeCustomizations).forEach(nodeName => {
        customizations[nodeName] = { ...nodeCustomizations[nodeName] };
      });
    }
    
    return {
      flows,
      nodes: Array.from(nodes),
      nodeCustomizations: customizations,
      totalFlow: flows.reduce((sum, f) => sum + f.amount, 0)
    };
  },

  /**
   * Get diagram state formatted for AI context injection
   * Returns a comprehensive string summary for the AI system prompt
   * @returns {string} Formatted diagram state for AI
   */
  getDiagramStateForAI() {
    const data = this.getDiagramData();
    const balance = this.analyzeFlowBalance();
    
    let context = '\n\n=== CURRENT DIAGRAM DATA ===\n';
    context += `Total Nodes: ${data.nodes.length}\n`;
    context += `Total Flows: ${data.flows.length}\n`;
    context += `Total Flow Value: ${data.totalFlow.toFixed(2)}\n\n`;
    
    context += 'NODES:\n';
    data.nodes.forEach(node => {
      const nb = balance.nodeBalance[node];
      if (nb) {
        context += `- ${node}: inflow=${nb.inflow.toFixed(2)}, outflow=${nb.outflow.toFixed(2)}\n`;
      } else {
        context += `- ${node}\n`;
      }
    });
    
    context += '\nFLOWS (source → target: amount):\n';
    data.flows.forEach(flow => {
      context += `- ${flow.source} → ${flow.target}: ${flow.amount}\n`;
    });
    
    if (balance.imbalanced.length > 0) {
      context += '\nIMBALANCED NODES:\n';
      balance.imbalanced.forEach(ib => {
        context += `- ${ib.node}: ${ib.suggestion}\n`;
      });
    }
    
    context += '\nJSON FORMAT:\n';
    context += JSON.stringify({ flows: data.flows }, null, 2);
    context += '\n=== END DIAGRAM DATA ===\n';
    
    return context;
  },

  /**
   * Rebalance flows for a specific node
   * @param {string} nodeName - Node to rebalance
   * @param {Object} options - Rebalancing options
   * @returns {Object} Result with success status
   */
  rebalanceNode(nodeName, options = {}) {
    const data = this.getDiagramData();
    const balance = this.analyzeFlowBalance();
    const nodeBalance = balance.nodeBalance[nodeName];
    
    if (!nodeBalance) {
      return { success: false, error: `Node "${nodeName}" not found` };
    }
    
    // Find flows involving this node
    const inflows = data.flows.filter(f => f.target === nodeName);
    const outflows = data.flows.filter(f => f.source === nodeName);
    
    if (options.matchInflow && outflows.length > 0) {
      // Scale outflows to match total inflow
      const totalInflow = nodeBalance.inflow;
      const totalOutflow = nodeBalance.outflow;
      if (totalOutflow > 0) {
        const scale = totalInflow / totalOutflow;
        outflows.forEach(flow => {
          flow.amount = flow.amount * scale;
        });
      }
    } else if (options.matchOutflow && inflows.length > 0) {
      // Scale inflows to match total outflow
      const totalInflow = nodeBalance.inflow;
      const totalOutflow = nodeBalance.outflow;
      if (totalInflow > 0) {
        const scale = totalOutflow / totalInflow;
        inflows.forEach(flow => {
          flow.amount = flow.amount * scale;
        });
      }
    } else if (options.targetTotal !== undefined) {
      // Scale all flows to achieve target total
      const currentTotal = nodeBalance.inflow + nodeBalance.outflow;
      if (currentTotal > 0) {
        const scale = options.targetTotal / currentTotal;
        inflows.forEach(flow => { flow.amount = flow.amount * scale; });
        outflows.forEach(flow => { flow.amount = flow.amount * scale; });
      }
    }
    
    return this.applyDiagramData(data);
  },

  /**
   * Modify flow links (change source or target)
   * @param {string} oldSource - Current source node
   * @param {string} oldTarget - Current target node
   * @param {Object} newLink - New link configuration { source?, target?, amount? }
   * @returns {Object} Result with success status
   */
  modifyFlowLink(oldSource, oldTarget, newLink) {
    const data = this.getDiagramData();
    
    const flowIndex = data.flows.findIndex(f => 
      f.source === oldSource && f.target === oldTarget
    );
    
    if (flowIndex === -1) {
      return { success: false, error: `Flow from "${oldSource}" to "${oldTarget}" not found` };
    }
    
    // Update the flow
    if (newLink.source !== undefined) {
      data.flows[flowIndex].source = newLink.source;
    }
    if (newLink.target !== undefined) {
      data.flows[flowIndex].target = newLink.target;
    }
    if (newLink.amount !== undefined) {
      data.flows[flowIndex].amount = newLink.amount;
    }
    
    return this.applyDiagramData(data);
  },

  /**
   * Validate diagram data before applying
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateDiagramData(data) {
    const errors = [];
    
    if (!data) {
      return { isValid: false, errors: ['Data is null or undefined'] };
    }
    
    if (!Array.isArray(data.flows)) {
      return { isValid: false, errors: ['Flows must be an array'] };
    }
    
    // Validate each flow
    data.flows.forEach((flow, index) => {
      if (!flow.source || typeof flow.source !== 'string') {
        errors.push(`Flow ${index}: Invalid source`);
      }
      if (!flow.target || typeof flow.target !== 'string') {
        errors.push(`Flow ${index}: Invalid target`);
      }
      if (typeof flow.amount !== 'number' || flow.amount <= 0 || !isFinite(flow.amount)) {
        errors.push(`Flow ${index}: Amount must be a positive number`);
      }
      if (flow.source === flow.target) {
        errors.push(`Flow ${index}: Source and target cannot be the same`);
      }
    });
    
    // Check for circular dependencies (simple check)
    const nodeFlows = Object.create(null); // Use null prototype to avoid issues with reserved names
    data.flows.forEach(flow => {
      if (!nodeFlows[flow.source]) nodeFlows[flow.source] = { out: [], in: [] };
      if (!nodeFlows[flow.target]) nodeFlows[flow.target] = { out: [], in: [] };
      nodeFlows[flow.source].out.push(flow.target);
      nodeFlows[flow.target].in.push(flow.source);
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      nodeCount: Object.keys(nodeFlows).length,
      flowCount: data.flows.length
    };
  },

  /**
   * Apply new diagram data to the data table
   * @param {Object} newData - New diagram data to apply
   * @param {boolean} preserveCustomizations - Whether to preserve existing customizations
   * @returns {Object} Result with success status
   */
  applyDiagramData(newData, preserveCustomizations = true) {
    // Validate first
    const validation = this.validateDiagramData(newData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    
    // Store current state for undo
    const currentData = this.getDiagramData();
    
    // Store current customizations if preserving
    let savedCustomizations = {};
    if (preserveCustomizations && typeof nodeCustomizations !== 'undefined') {
      savedCustomizations = JSON.parse(JSON.stringify(nodeCustomizations));
    }
    
    // Record undo action if UndoManager is available
    if (typeof UndoManager !== 'undefined' && UndoManager.recordAction) {
      UndoManager.recordAction({
        type: 'AI_DATA_CHANGE',
        data: { flows: newData.flows },
        inverseData: { flows: currentData.flows },
        description: 'AI diagram modification'
      });
    }
    
    // Clear existing data
    const tbody = document.getElementById('data-table-body');
    if (!tbody) {
      return { success: false, errors: ['Data table not found'] };
    }
    
    tbody.innerHTML = '';
    
    // Add new flows
    newData.flows.forEach(flow => {
      this._addFlowRow(tbody, flow.source, flow.target, flow.amount);
    });
    
    // Restore customizations
    if (preserveCustomizations) {
      Object.keys(savedCustomizations).forEach(nodeName => {
        if (typeof nodeCustomizations !== 'undefined') {
          nodeCustomizations[nodeName] = savedCustomizations[nodeName];
        }
      });
    }
    
    // Trigger diagram update
    if (typeof updateDiagramFromTableNoUndo === 'function') {
      updateDiagramFromTableNoUndo();
    } else if (typeof process_sankey === 'function') {
      process_sankey();
    } else if (typeof renderDiagram === 'function') {
      renderDiagram();
    }
    
    // Save progress
    if (typeof saveProgressToLocal === 'function') {
      saveProgressToLocal();
    }
    
    return { 
      success: true, 
      flowCount: newData.flows.length,
      nodeCount: validation.nodeCount
    };
  },

  /**
   * Add a flow row to the data table
   * @private
   */
  _addFlowRow(tbody, source, target, amount) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" value="${this._escapeHtml(source)}" placeholder="Source"></td>
      <td><input type="text" value="${this._escapeHtml(target)}" placeholder="Target"></td>
      <td><input type="number" value="${amount}" placeholder="Amount" min="0" step="any"></td>
      <td><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); updateDiagramFromTable();">×</button></td>
    `;
    tbody.appendChild(row);
  },

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Convert units by multiplying all flow amounts
   * @param {number} factor - Multiplication factor
   * @param {string} suffix - Optional suffix to append to node names (for display purposes)
   * @returns {Object} Result with new data
   */
  convertUnits(factor, suffix = '') {
    if (typeof factor !== 'number' || !isFinite(factor) || factor <= 0) {
      return { success: false, error: 'Factor must be a positive number' };
    }
    
    const currentData = this.getDiagramData();
    
    if (currentData.flows.length === 0) {
      return { success: false, error: 'No flows to convert' };
    }
    
    // Multiply all amounts by factor
    // If suffix is provided, append it to node names (creates new nodes)
    const newFlows = currentData.flows.map(flow => ({
      source: suffix ? flow.source + suffix : flow.source,
      target: suffix ? flow.target + suffix : flow.target,
      amount: flow.amount * factor
    }));
    
    // When suffix is provided, we're creating new nodes so don't preserve customizations
    // When no suffix, preserve customizations since nodes remain the same
    const preserveCustomizations = !suffix;
    
    const result = this.applyDiagramData({ flows: newFlows }, preserveCustomizations);
    
    if (result.success) {
      result.factor = factor;
      result.suffix = suffix;
      result.originalTotal = currentData.totalFlow;
      result.newTotal = currentData.totalFlow * factor;
    }
    
    return result;
  },

  /**
   * Analyze flow balance for each node
   * @returns {Object} Analysis with inflows, outflows, and imbalances
   */
  analyzeFlowBalance() {
    const data = this.getDiagramData();
    const nodeBalance = {};
    
    // Initialize all nodes
    data.nodes.forEach(node => {
      nodeBalance[node] = { inflow: 0, outflow: 0, balance: 0 };
    });
    
    // Calculate flows
    data.flows.forEach(flow => {
      if (nodeBalance[flow.source]) {
        nodeBalance[flow.source].outflow += flow.amount;
      }
      if (nodeBalance[flow.target]) {
        nodeBalance[flow.target].inflow += flow.amount;
      }
    });
    
    // Calculate balance
    const imbalanced = [];
    Object.keys(nodeBalance).forEach(node => {
      const nb = nodeBalance[node];
      nb.balance = nb.inflow - nb.outflow;
      
      // A node is imbalanced if it has both inflow and outflow but they don't match
      // Source nodes (no inflow) and sink nodes (no outflow) are naturally imbalanced
      const isSource = nb.inflow === 0 && nb.outflow > 0;
      const isSink = nb.outflow === 0 && nb.inflow > 0;
      
      if (!isSource && !isSink && Math.abs(nb.balance) > 0.001) {
        imbalanced.push({
          node,
          inflow: nb.inflow,
          outflow: nb.outflow,
          difference: nb.balance,
          suggestion: nb.balance > 0 
            ? `Add outflow of ${nb.balance.toFixed(2)} from "${node}"`
            : `Add inflow of ${Math.abs(nb.balance).toFixed(2)} to "${node}"`
        });
      }
    });
    
    return {
      nodeBalance,
      imbalanced,
      totalInflow: Object.values(nodeBalance).reduce((sum, nb) => sum + nb.inflow, 0),
      totalOutflow: Object.values(nodeBalance).reduce((sum, nb) => sum + nb.outflow, 0),
      isBalanced: imbalanced.length === 0
    };
  },

  /**
   * Add a new flow to the diagram
   * @param {string} source - Source node name
   * @param {string} target - Target node name
   * @param {number} amount - Flow amount
   * @returns {Object} Result
   */
  addFlow(source, target, amount) {
    const currentData = this.getDiagramData();
    currentData.flows.push({ source, target, amount });
    return this.applyDiagramData(currentData);
  },

  /**
   * Remove flows matching criteria
   * @param {Function} predicate - Function to test each flow
   * @returns {Object} Result with removed count
   */
  removeFlows(predicate) {
    const currentData = this.getDiagramData();
    const originalCount = currentData.flows.length;
    currentData.flows = currentData.flows.filter(flow => !predicate(flow));
    const result = this.applyDiagramData(currentData);
    result.removedCount = originalCount - currentData.flows.length;
    return result;
  },

  /**
   * Modify flows matching criteria
   * @param {Function} predicate - Function to test each flow
   * @param {Function} modifier - Function to modify matching flows
   * @returns {Object} Result with modified count
   */
  modifyFlows(predicate, modifier) {
    const currentData = this.getDiagramData();
    let modifiedCount = 0;
    
    currentData.flows = currentData.flows.map(flow => {
      if (predicate(flow)) {
        modifiedCount++;
        return modifier({ ...flow });
      }
      return flow;
    });
    
    const result = this.applyDiagramData(currentData);
    result.modifiedCount = modifiedCount;
    return result;
  },

  /**
   * Get a summary of the diagram for AI context
   * @returns {string} Human-readable summary
   */
  getSummary() {
    const data = this.getDiagramData();
    const balance = this.analyzeFlowBalance();
    
    let summary = `Diagram Summary:\n`;
    summary += `- ${data.nodes.length} nodes\n`;
    summary += `- ${data.flows.length} flows\n`;
    summary += `- Total flow: ${data.totalFlow.toFixed(2)}\n`;
    
    if (balance.imbalanced.length > 0) {
      summary += `\nImbalanced nodes:\n`;
      balance.imbalanced.forEach(ib => {
        summary += `- ${ib.node}: ${ib.suggestion}\n`;
      });
    } else {
      summary += `\nAll intermediate nodes are balanced.\n`;
    }
    
    return summary;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.AIController = AIController;
}

// Export for module usage (testing)
export { AIController };
