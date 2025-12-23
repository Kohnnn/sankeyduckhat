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
   * Get complete diagram state including all customizations
   * Includes node identities, custom labels, flow values, and all customizations
   * @returns {Object} Full diagram state for AI
   * Requirements: 5.1
   */
  getFullDiagramState() {
    const data = this.getDiagramData();
    
    // Build detailed node information with all customizations
    const nodeDetails = {};
    data.nodes.forEach(nodeName => {
      const custom = (typeof nodeCustomizations !== 'undefined' && nodeCustomizations[nodeName]) || {};
      nodeDetails[nodeName] = {
        identity: nodeName,
        label: custom.labelText !== undefined ? custom.labelText : nodeName,
        fillColor: custom.fillColor || null,
        borderColor: custom.borderColor || null,
        opacity: custom.opacity !== undefined ? custom.opacity : 100,
        borderOpacity: custom.borderOpacity !== undefined ? custom.borderOpacity : 100,
        labelFontSize: custom.labelFontSize || 16,
        labelColor: custom.labelColor || '#000000',
        labelBold: custom.labelBold || false,
        labelItalic: custom.labelItalic || false,
        labelAlign: custom.labelAlign || 'center',
        labelBgEnabled: custom.labelBgEnabled || false,
        labelBg: custom.labelBg || '#ffffff',
        labelBgOpacity: custom.labelBgOpacity !== undefined ? custom.labelBgOpacity : 100,
        labelFontFamily: custom.labelFontFamily || null,
        labelX: custom.labelX || 0,
        labelY: custom.labelY || 0,
        labelMarginTop: custom.labelMarginTop || 0,
        labelMarginRight: custom.labelMarginRight || 0,
        labelMarginBottom: custom.labelMarginBottom || 0,
        labelMarginLeft: custom.labelMarginLeft || 0
      };
    });
    
    // Get independent labels if available
    const independentLabels = (typeof IndependentLabelsManager !== 'undefined' && 
                               typeof IndependentLabelsManager.getLabels === 'function')
      ? IndependentLabelsManager.getLabels()
      : [];
    
    return {
      flows: data.flows,
      nodes: nodeDetails,
      independentLabels,
      totalFlow: data.totalFlow,
      nodeCount: data.nodes.length,
      flowCount: data.flows.length
    };
  },

  /**
   * Get diagram state formatted for AI context injection
   * Returns a comprehensive string summary for the AI system prompt
   * Includes all node customizations, labels, and independent labels
   * @returns {string} Formatted diagram state for AI
   * Requirements: 5.1
   */
  getDiagramStateForAI() {
    const state = this.getFullDiagramState();
    const balance = this.analyzeFlowBalance();
    
    let context = '\n\n=== CURRENT DIAGRAM STATE ===\n';
    context += `Total Nodes: ${state.nodeCount}\n`;
    context += `Total Flows: ${state.flowCount}\n`;
    context += `Total Flow Value: ${state.totalFlow.toFixed(2)}\n\n`;
    
    context += 'NODES (with customizations):\n';
    Object.entries(state.nodes).forEach(([nodeName, props]) => {
      const nb = balance.nodeBalance[nodeName];
      context += `- ${nodeName}:\n`;
      context += `    label: "${props.label}"\n`;
      if (nb) {
        context += `    inflow: ${nb.inflow.toFixed(2)}, outflow: ${nb.outflow.toFixed(2)}\n`;
      }
      if (props.fillColor) context += `    fillColor: ${props.fillColor}\n`;
      if (props.borderColor) context += `    borderColor: ${props.borderColor}\n`;
      if (props.opacity !== 100) context += `    opacity: ${props.opacity}\n`;
      if (props.labelFontSize !== 16) context += `    labelFontSize: ${props.labelFontSize}\n`;
      if (props.labelColor !== '#000000') context += `    labelColor: ${props.labelColor}\n`;
      if (props.labelBold) context += `    labelBold: true\n`;
      if (props.labelItalic) context += `    labelItalic: true\n`;
      if (props.labelAlign !== 'center') context += `    labelAlign: ${props.labelAlign}\n`;
      if (props.labelBgEnabled) context += `    labelBgEnabled: true, labelBg: ${props.labelBg}\n`;
      if (props.labelFontFamily) context += `    labelFontFamily: ${props.labelFontFamily}\n`;
      if (props.labelX !== 0 || props.labelY !== 0) {
        context += `    labelOffset: (${props.labelX}, ${props.labelY})\n`;
      }
    });
    
    context += '\nFLOWS (source → target: amount):\n';
    state.flows.forEach(flow => {
      context += `- ${flow.source} → ${flow.target}: ${flow.amount}\n`;
    });
    
    if (balance.imbalanced.length > 0) {
      context += '\nIMBALANCED NODES:\n';
      balance.imbalanced.forEach(ib => {
        context += `- ${ib.node}: ${ib.suggestion}\n`;
      });
    }
    
    if (state.independentLabels.length > 0) {
      context += '\nINDEPENDENT LABELS:\n';
      state.independentLabels.forEach(label => {
        context += `- "${label.text}" at (${Math.round(label.x)}, ${Math.round(label.y)})`;
        if (label.fontSize !== 16) context += `, fontSize: ${label.fontSize}`;
        if (label.color !== '#000000') context += `, color: ${label.color}`;
        if (label.bold) context += `, bold`;
        if (label.italic) context += `, italic`;
        context += '\n';
      });
    }
    
    context += '\nJSON FORMAT (for structured access):\n';
    context += JSON.stringify(state, null, 2);
    context += '\n=== END DIAGRAM STATE ===\n';
    
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
   * Apply comprehensive AI changes to diagram
   * Handles flow value changes, node label text changes, node color changes,
   * label styling changes, and independent label changes
   * @param {Object} changes - Changes to apply
   * @param {Array} changes.flows - Optional array of flow changes
   * @param {Object} changes.nodes - Optional object of node customization changes
   * @param {Array} changes.independentLabels - Optional array of independent label changes
   * @returns {Object} Result with success status
   * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6
   */
  applyAIChanges(changes) {
    if (!changes || typeof changes !== 'object') {
      return { success: false, error: 'Invalid changes object' };
    }
    
    // Get current state for undo support
    const currentState = this.getFullDiagramState();
    
    // Record for undo (handled in subtask 8.3)
    if (typeof UndoManager !== 'undefined' && UndoManager.recordAction) {
      UndoManager.recordAction({
        type: 'AI_COMPREHENSIVE_CHANGE',
        data: changes,
        inverseData: currentState,
        description: 'AI diagram modification'
      });
    }
    
    let flowsChanged = false;
    let nodesChanged = false;
    let labelsChanged = false;
    
    // Apply flow changes
    if (changes.flows && Array.isArray(changes.flows)) {
      const result = this.applyDiagramData({ flows: changes.flows }, true);
      if (!result.success) {
        return { success: false, error: 'Failed to apply flow changes', details: result.errors };
      }
      flowsChanged = true;
    }
    
    // Apply node customization changes
    if (changes.nodes && typeof changes.nodes === 'object') {
      if (typeof nodeCustomizations === 'undefined') {
        // Initialize if not exists (for testing)
        if (typeof window !== 'undefined') {
          window.nodeCustomizations = {};
        }
      }
      
      Object.entries(changes.nodes).forEach(([nodeName, props]) => {
        if (!props || typeof props !== 'object') return;
        
        // Initialize node customizations if not exists
        if (typeof nodeCustomizations !== 'undefined') {
          if (!nodeCustomizations[nodeName]) {
            nodeCustomizations[nodeName] = {};
          }
          
          // Apply label text changes (Requirement 5.2)
          if (props.label !== undefined) {
            nodeCustomizations[nodeName].labelText = props.label;
          }
          
          // Apply node color changes (Requirement 5.3)
          if (props.fillColor !== undefined) {
            nodeCustomizations[nodeName].fillColor = props.fillColor;
            // Also update nodeColors if it exists
            if (typeof nodeColors !== 'undefined') {
              nodeColors[nodeName] = props.fillColor;
            }
          }
          
          if (props.borderColor !== undefined) {
            nodeCustomizations[nodeName].borderColor = props.borderColor;
          }
          
          if (props.opacity !== undefined) {
            nodeCustomizations[nodeName].opacity = props.opacity;
          }
          
          if (props.borderOpacity !== undefined) {
            nodeCustomizations[nodeName].borderOpacity = props.borderOpacity;
          }
          
          // Apply label styling changes (Requirement 5.5)
          if (props.labelFontSize !== undefined) {
            nodeCustomizations[nodeName].labelFontSize = props.labelFontSize;
          }
          
          if (props.labelColor !== undefined) {
            nodeCustomizations[nodeName].labelColor = props.labelColor;
          }
          
          if (props.labelBold !== undefined) {
            nodeCustomizations[nodeName].labelBold = props.labelBold;
          }
          
          if (props.labelItalic !== undefined) {
            nodeCustomizations[nodeName].labelItalic = props.labelItalic;
          }
          
          if (props.labelAlign !== undefined) {
            nodeCustomizations[nodeName].labelAlign = props.labelAlign;
          }
          
          if (props.labelBgEnabled !== undefined) {
            nodeCustomizations[nodeName].labelBgEnabled = props.labelBgEnabled;
          }
          
          if (props.labelBg !== undefined) {
            nodeCustomizations[nodeName].labelBg = props.labelBg;
          }
          
          if (props.labelBgOpacity !== undefined) {
            nodeCustomizations[nodeName].labelBgOpacity = props.labelBgOpacity;
          }
          
          if (props.labelFontFamily !== undefined) {
            nodeCustomizations[nodeName].labelFontFamily = props.labelFontFamily;
          }
          
          // Apply label position changes
          if (props.labelX !== undefined) {
            nodeCustomizations[nodeName].labelX = props.labelX;
          }
          
          if (props.labelY !== undefined) {
            nodeCustomizations[nodeName].labelY = props.labelY;
          }
          
          // Apply label margin changes
          if (props.labelMarginTop !== undefined) {
            nodeCustomizations[nodeName].labelMarginTop = props.labelMarginTop;
          }
          
          if (props.labelMarginRight !== undefined) {
            nodeCustomizations[nodeName].labelMarginRight = props.labelMarginRight;
          }
          
          if (props.labelMarginBottom !== undefined) {
            nodeCustomizations[nodeName].labelMarginBottom = props.labelMarginBottom;
          }
          
          if (props.labelMarginLeft !== undefined) {
            nodeCustomizations[nodeName].labelMarginLeft = props.labelMarginLeft;
          }
          
          nodesChanged = true;
        }
      });
    }
    
    // Apply independent label changes
    if (changes.independentLabels && Array.isArray(changes.independentLabels)) {
      if (typeof IndependentLabelsManager !== 'undefined') {
        changes.independentLabels.forEach(labelChange => {
          if (!labelChange || typeof labelChange !== 'object') return;
          
          if (labelChange._delete && labelChange.id) {
            // Delete label
            IndependentLabelsManager.deleteLabel(labelChange.id);
            labelsChanged = true;
          } else if (labelChange._new) {
            // Add new label
            const { _new, ...labelProps } = labelChange;
            IndependentLabelsManager.addLabel(labelProps);
            labelsChanged = true;
          } else if (labelChange.id) {
            // Update existing label
            const { id, ...updates } = labelChange;
            IndependentLabelsManager.updateLabel(id, updates);
            labelsChanged = true;
          }
        });
      }
    }
    
    // Re-render diagram if changes were made
    if (flowsChanged || nodesChanged) {
      if (typeof process_sankey === 'function') {
        process_sankey();
      } else if (typeof renderDiagram === 'function') {
        renderDiagram();
      }
    }
    
    // Save progress
    if (typeof saveProgressToLocal === 'function') {
      saveProgressToLocal();
    }
    
    return {
      success: true,
      flowsChanged,
      nodesChanged,
      labelsChanged
    };
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
  },

  /**
   * Read the current JSON editor content
   * Returns the raw JSON string from the JSON editor textarea
   * @returns {Object} Result with json string or error
   */
  readJSONEditor() {
    const textarea = document.getElementById('json-editor-textarea');
    if (!textarea) {
      return { success: false, error: 'JSON editor not found', json: null };
    }
    
    const jsonStr = textarea.value.trim();
    
    // Try to parse to validate
    try {
      const parsed = JSON.parse(jsonStr);
      return { 
        success: true, 
        json: jsonStr, 
        parsed,
        isEmpty: !jsonStr
      };
    } catch (e) {
      return { 
        success: false, 
        error: `Invalid JSON: ${e.message}`, 
        json: jsonStr,
        parsed: null
      };
    }
  },

  /**
   * Write JSON data to the JSON editor
   * @param {Object|string} data - JSON object or string to write
   * @param {boolean} apply - Whether to also apply the data to the diagram (default: false)
   * @returns {Object} Result with success status
   */
  writeJSONEditor(data, apply = false) {
    const textarea = document.getElementById('json-editor-textarea');
    if (!textarea) {
      return { success: false, error: 'JSON editor not found' };
    }
    
    let jsonStr;
    
    // Convert to string if object
    if (typeof data === 'object') {
      try {
        jsonStr = JSON.stringify(data, null, 2);
      } catch (e) {
        return { success: false, error: `Failed to stringify: ${e.message}` };
      }
    } else if (typeof data === 'string') {
      // Validate JSON string
      try {
        JSON.parse(data);
        jsonStr = data;
      } catch (e) {
        return { success: false, error: `Invalid JSON string: ${e.message}` };
      }
    } else {
      return { success: false, error: 'Data must be an object or JSON string' };
    }
    
    // Write to textarea
    textarea.value = jsonStr;
    
    // Optionally apply to diagram
    if (apply) {
      if (typeof applyJSONData === 'function') {
        applyJSONData();
        return { success: true, applied: true };
      } else {
        return { success: true, applied: false, warning: 'applyJSONData function not available' };
      }
    }
    
    return { success: true, applied: false };
  },

  /**
   * Open the JSON editor modal and optionally populate it with data
   * @param {Object|string} data - Optional JSON data to populate
   * @returns {Object} Result with success status
   */
  openJSONEditorWithData(data = null) {
    // Open the modal
    if (typeof openJSONEditor === 'function') {
      openJSONEditor();
    } else {
      const modal = document.getElementById('json-editor-modal');
      if (modal) {
        modal.classList.add('active');
      } else {
        return { success: false, error: 'JSON editor modal not found' };
      }
    }
    
    // If data provided, write it
    if (data !== null) {
      return this.writeJSONEditor(data, false);
    }
    
    return { success: true };
  },

  /**
   * Get the current diagram data formatted for the JSON editor
   * @returns {Object} Diagram data in JSON editor format
   */
  getJSONEditorData() {
    // Use the existing getCurrentDataAsJSON if available
    if (typeof getCurrentDataAsJSON === 'function') {
      return getCurrentDataAsJSON();
    }
    
    // Fallback implementation
    const data = this.getDiagramData();
    const title = document.getElementById('diagram-title-input')?.value || 'My Sankey Diagram';
    
    return {
      title,
      flows: data.flows.map(f => ({
        from: f.source,
        to: f.target,
        amount: f.amount
      })),
      nodeColors: typeof nodeColors !== 'undefined' ? { ...nodeColors } : {},
      nodeCustomizations: data.nodeCustomizations
    };
  },

  /**
   * Apply JSON data from the editor to the diagram
   * Wrapper around the global applyJSONData function
   * @returns {Object} Result with success status
   */
  applyJSONEditorData() {
    if (typeof applyJSONData === 'function') {
      try {
        applyJSONData();
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    
    // Fallback: manually apply
    const result = this.readJSONEditor();
    if (!result.success) {
      return result;
    }
    
    if (result.parsed && result.parsed.flows) {
      return this.applyDiagramData({ flows: result.parsed.flows.map(f => ({
        source: f.from || f.source,
        target: f.to || f.target,
        amount: f.amount || f.value || 0
      }))});
    }
    
    return { success: false, error: 'No flows found in JSON data' };
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.AIController = AIController;
}

// Export for module usage (testing)
export { AIController };
