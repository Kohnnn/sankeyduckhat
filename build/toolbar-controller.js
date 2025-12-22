/**
 * ToolbarController - Manages toolbar tool system and interactions
 * Implements tool switching, cursor updates, and tool-specific behaviors
 * 
 * Requirements: 4.1, 10.1, 10.2, 10.3, 10.4, 10.5
 */

const ToolbarController = {
  // Tool definitions
  tools: {
    select: {
      id: 'select',
      name: 'Select',
      icon: '🔍',
      cursor: 'default',
      description: 'Select and edit elements'
    },
    pan: {
      id: 'pan',
      name: 'Pan',
      icon: '✋',
      cursor: 'grab',
      description: 'Pan the canvas'
    },
    addNode: {
      id: 'addNode',
      name: 'Add Node',
      icon: '⬜',
      cursor: 'crosshair',
      description: 'Click to add a new node'
    },
    addFlow: {
      id: 'addFlow',
      name: 'Add Flow',
      icon: '↗️',
      cursor: 'crosshair',
      description: 'Click two nodes to create a flow'
    }
  },

  // State for Add Flow tool (tracks first node click)
  _addFlowState: {
    firstNode: null,
    firstNodeElement: null
  },

  // Internal state
  _initialized: false,
  _toolbarElement: null,
  _canvasElement: null,

  /**
   * Initialize the toolbar controller
   * @param {HTMLElement} toolbarElement - The toolbar container element
   * @param {HTMLElement} canvasElement - The canvas/diagram area element
   */
  init(toolbarElement, canvasElement) {
    // Prevent double initialization
    if (this._initialized) {
      console.log('ToolbarController: Already initialized, skipping');
      return;
    }
    
    this._toolbarElement = toolbarElement;
    this._canvasElement = canvasElement || document.getElementById('diagram-area');
    this._initialized = true;

    // Wire up tool buttons
    this._wireToolButtons();

    // Wire up action buttons
    this._wireActionButtons();

    // Listen for StudioUI tool changes
    if (typeof StudioUI !== 'undefined') {
      StudioUI.on('toolChange', (data) => this._onToolChange(data));
    }

    // Set initial tool state
    this._updateToolbarState('select');
    
    console.log('ToolbarController: Initialized successfully');
  },

  /**
   * Wire up tool button click handlers
   */
  _wireToolButtons() {
    const toolButtons = this._toolbarElement?.querySelectorAll('[data-tool]');
    if (!toolButtons) return;

    toolButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tool = button.getAttribute('data-tool');
        this.setTool(tool);
      });
    });
  },

  /**
   * Wire up action button click handlers
   */
  _wireActionButtons() {
    // Undo button
    const undoBtn = this._toolbarElement?.querySelector('[data-action="undo"]');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this._handleUndo());
    }

    // Redo button
    const redoBtn = this._toolbarElement?.querySelector('[data-action="redo"]');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this._handleRedo());
    }

    // Export button
    const exportBtn = this._toolbarElement?.querySelector('[data-action="export"]');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this._handleExport());
    }
    
    // Reset Session button
    const resetSessionBtn = this._toolbarElement?.querySelector('[data-action="reset-session"]');
    if (resetSessionBtn) {
      resetSessionBtn.addEventListener('click', () => this._handleResetSession());
    }
    
    // Reset Nodes button
    const resetNodesBtn = this._toolbarElement?.querySelector('[data-action="reset-nodes"]');
    if (resetNodesBtn) {
      resetNodesBtn.addEventListener('click', () => this._handleResetNodes());
    }
    
    // Reset Labels button
    const resetLabelsBtn = this._toolbarElement?.querySelector('[data-action="reset-labels"]');
    if (resetLabelsBtn) {
      resetLabelsBtn.addEventListener('click', () => this._handleResetLabels());
    }
    
    // Factory Reset button
    const factoryResetBtn = this._toolbarElement?.querySelector('[data-action="factory-reset"]');
    if (factoryResetBtn) {
      factoryResetBtn.addEventListener('click', () => this._handleFactoryReset());
    }
    
    // Add Label button
    const addLabelBtn = this._toolbarElement?.querySelector('[data-action="add-label"]');
    if (addLabelBtn) {
      addLabelBtn.addEventListener('click', () => this._handleAddLabel());
    }
    
    // Wire UndoManager stack change events to update button states
    if (typeof UndoManager !== 'undefined') {
      UndoManager.on('stackChange', (data) => {
        this._updateUndoRedoButtonStates(data.canUndo, data.canRedo);
      });
      
      // Set initial button states
      this._updateUndoRedoButtonStates(UndoManager.canUndo(), UndoManager.canRedo());
    }
  },
  
  /**
   * Update undo/redo button disabled states
   * @param {boolean} canUndo - Whether undo is available
   * @param {boolean} canRedo - Whether redo is available
   */
  _updateUndoRedoButtonStates(canUndo, canRedo) {
    const undoBtn = this._toolbarElement?.querySelector('[data-action="undo"]');
    const redoBtn = this._toolbarElement?.querySelector('[data-action="redo"]');
    
    if (undoBtn) {
      undoBtn.disabled = !canUndo;
      undoBtn.classList.toggle('disabled', !canUndo);
      undoBtn.setAttribute('aria-disabled', !canUndo);
    }
    
    if (redoBtn) {
      redoBtn.disabled = !canRedo;
      redoBtn.classList.toggle('disabled', !canRedo);
      redoBtn.setAttribute('aria-disabled', !canRedo);
    }
  },

  /**
   * Set the active tool
   * @param {string} toolId - Tool identifier
   */
  setTool(toolId) {
    if (!this.tools[toolId]) {
      console.warn(`ToolbarController: Invalid tool: ${toolId}`);
      return;
    }

    // Reset add flow state when switching tools
    if (toolId !== 'addFlow') {
      this._resetAddFlowState();
    }

    // Update StudioUI
    if (typeof StudioUI !== 'undefined') {
      StudioUI.setTool(toolId);
    }

    // Update toolbar visual state
    this._updateToolbarState(toolId);

    // Update cursor
    this._updateCursor(toolId);
  },

  /**
   * Get the current active tool
   * @returns {string} Current tool ID
   */
  getCurrentTool() {
    if (typeof StudioUI !== 'undefined') {
      return StudioUI.currentTool;
    }
    return 'select';
  },

  /**
   * Handle tool change event from StudioUI
   * @param {Object} data - Event data with tool and previousTool
   */
  _onToolChange(data) {
    this._updateToolbarState(data.tool);
    this._updateCursor(data.tool);
  },

  /**
   * Update toolbar button active states
   * @param {string} activeTool - The active tool ID
   */
  _updateToolbarState(activeTool) {
    const toolButtons = this._toolbarElement?.querySelectorAll('[data-tool]');
    if (!toolButtons) return;

    toolButtons.forEach(button => {
      const tool = button.getAttribute('data-tool');
      if (tool === activeTool) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
      }
    });
  },

  /**
   * Update canvas cursor based on active tool
   * @param {string} toolId - Tool identifier
   */
  _updateCursor(toolId) {
    const tool = this.tools[toolId];
    if (!tool || !this._canvasElement) return;

    // Set cursor style
    this._canvasElement.style.cursor = tool.cursor;

    // Set data-tool attribute for CSS-based cursor styling
    this._canvasElement.setAttribute('data-tool', toolId);

    // Also update SVG cursor if available
    const svg = document.getElementById('sankey_svg');
    if (svg) {
      svg.style.cursor = tool.cursor;
    }
  },

  /**
   * Handle canvas click based on current tool
   * @param {MouseEvent} event - Click event
   * @param {Object} diagramCoords - Coordinates in diagram space { x, y }
   */
  handleCanvasClick(event, diagramCoords) {
    const currentTool = this.getCurrentTool();

    switch (currentTool) {
      case 'select':
        // Selection is handled by SelectionManager
        break;
      case 'pan':
        // Pan is handled by ViewportController
        break;
      case 'addNode':
        this._handleAddNodeClick(diagramCoords);
        break;
      case 'addFlow':
        // Add flow clicks on nodes are handled separately
        break;
    }
  },

  /**
   * Handle node click for Add Flow tool
   * @param {string} nodeId - The clicked node ID
   * @param {SVGElement} nodeElement - The clicked node element
   */
  handleNodeClickForFlow(nodeId, nodeElement) {
    if (this.getCurrentTool() !== 'addFlow') return;

    if (!this._addFlowState.firstNode) {
      // First node click
      this._addFlowState.firstNode = nodeId;
      this._addFlowState.firstNodeElement = nodeElement;
      
      // Visual feedback - highlight first node
      nodeElement.classList.add('flow-source-selected');
      
      // Update status
      if (typeof updateAIStatus === 'function') {
        updateAIStatus(`Selected source: ${nodeId}. Click target node.`, 'success');
      }
    } else {
      // Second node click - create flow
      const sourceNode = this._addFlowState.firstNode;
      const targetNode = nodeId;

      // Don't allow self-loops
      if (sourceNode === targetNode) {
        if (typeof updateAIStatus === 'function') {
          updateAIStatus('Cannot create flow to same node', 'warning');
        }
        return;
      }

      // Create the flow
      this._createFlow(sourceNode, targetNode);

      // Reset state
      this._resetAddFlowState();
    }
  },

  /**
   * Reset the Add Flow tool state
   */
  _resetAddFlowState() {
    if (this._addFlowState.firstNodeElement) {
      this._addFlowState.firstNodeElement.classList.remove('flow-source-selected');
    }
    this._addFlowState.firstNode = null;
    this._addFlowState.firstNodeElement = null;
  },

  /**
   * Handle Add Node tool click
   * @param {Object} coords - Diagram coordinates { x, y }
   */
  _handleAddNodeClick(coords) {
    // Generate a unique node name
    const nodeName = this._generateNodeName();

    // Add to data model
    this._addNodeToData(nodeName, coords);

    // Update status
    if (typeof updateAIStatus === 'function') {
      updateAIStatus(`Created node: ${nodeName}`, 'success');
    }
  },

  /**
   * Generate a unique node name
   * @returns {string} Generated node name
   */
  _generateNodeName() {
    const existingNodes = this._getExistingNodeNames();
    let counter = 1;
    let name = `Node ${counter}`;
    
    while (existingNodes.has(name)) {
      counter++;
      name = `Node ${counter}`;
    }
    
    return name;
  },

  /**
   * Get set of existing node names from data
   * @returns {Set<string>} Set of node names
   */
  _getExistingNodeNames() {
    const nodes = new Set();
    const tbody = document.getElementById('data-table-body');
    if (!tbody) return nodes;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0]?.value) nodes.add(inputs[0].value.trim());
      if (inputs[1]?.value) nodes.add(inputs[1].value.trim());
    });

    return nodes;
  },

  /**
   * Add a new node to the data model
   * Ensures the node passes through sankey.js for proper layout calculation
   * Requirements: 8.4
   * @param {string} nodeName - Name for the new node
   * @param {Object} coords - Position coordinates
   */
  _addNodeToData(nodeName, coords) {
    // Use SankeyIntegration if available (preferred method)
    // This ensures proper sankey.js recalculation
    if (typeof SankeyIntegration !== 'undefined' && SankeyIntegration.addNode) {
      const success = SankeyIntegration.addNode(nodeName, {
        targetName: `${nodeName} Output`,
        value: 1
      });
      if (success) return;
    }
    
    // Fallback: Create a placeholder flow to establish the node
    // The node needs at least one flow to appear in the diagram
    const placeholderTarget = `${nodeName} Output`;
    
    // Add row to data table
    if (typeof addDataRow === 'function') {
      addDataRow();
      
      // Fill in the new row
      const tbody = document.getElementById('data-table-body');
      const lastRow = tbody?.lastElementChild;
      if (lastRow) {
        const inputs = lastRow.querySelectorAll('input');
        if (inputs[0]) inputs[0].value = nodeName;
        if (inputs[1]) inputs[1].value = placeholderTarget;
        if (inputs[2]) inputs[2].value = '1';
        
        // Trigger full sankey.js recalculation
        if (typeof process_sankey === 'function') {
          process_sankey();
        } else if (typeof renderDiagram === 'function') {
          renderDiagram();
        }
      }
    }
  },

  /**
   * Create a flow between two nodes
   * Ensures the flow passes through sankey.js for proper layout calculation
   * Requirements: 8.4, 3.3
   * @param {string} sourceNode - Source node name
   * @param {string} targetNode - Target node name
   */
  _createFlow(sourceNode, targetNode) {
    // Record undo action before creating flow
    if (typeof UndoManager !== 'undefined') {
      const action = UndoManager.createFlowAddAction(sourceNode, targetNode, '1');
      UndoManager.recordAction(action);
    }
    
    // Use SankeyIntegration if available (preferred method)
    // This ensures proper sankey.js recalculation
    if (typeof SankeyIntegration !== 'undefined' && SankeyIntegration.addFlow) {
      const success = SankeyIntegration.addFlow(sourceNode, targetNode, 1);
      if (success) {
        // Update status
        if (typeof updateAIStatus === 'function') {
          updateAIStatus(`Created flow: ${sourceNode} → ${targetNode}`, 'success');
        }
        return;
      }
    }
    
    // Fallback: Add row to data table directly
    if (typeof addDataRow === 'function') {
      addDataRow();
      
      // Fill in the new row
      const tbody = document.getElementById('data-table-body');
      const lastRow = tbody?.lastElementChild;
      if (lastRow) {
        const inputs = lastRow.querySelectorAll('input');
        if (inputs[0]) inputs[0].value = sourceNode;
        if (inputs[1]) inputs[1].value = targetNode;
        if (inputs[2]) inputs[2].value = '1';
        
        // Trigger full sankey.js recalculation
        if (typeof process_sankey === 'function') {
          process_sankey();
        } else if (typeof renderDiagram === 'function') {
          renderDiagram();
        }
        
        // Update status
        if (typeof updateAIStatus === 'function') {
          updateAIStatus(`Created flow: ${sourceNode} → ${targetNode}`, 'success');
        }
      }
    }
  },

  /**
   * Handle Undo action
   */
  _handleUndo() {
    if (typeof UndoManager !== 'undefined') {
      if (UndoManager.canUndo()) {
        const description = UndoManager.getLastActionDescription();
        UndoManager.undo();
        if (typeof updateAIStatus === 'function') {
          updateAIStatus(`Undone: ${description}`, 'success');
        }
      } else {
        if (typeof updateAIStatus === 'function') {
          updateAIStatus('Nothing to undo', 'warning');
        }
      }
    } else if (typeof undoLastAction === 'function') {
      undoLastAction();
    }
  },

  /**
   * Handle Redo action
   */
  _handleRedo() {
    if (typeof UndoManager !== 'undefined') {
      if (UndoManager.canRedo()) {
        const description = UndoManager.getLastUndoneDescription();
        UndoManager.redo();
        if (typeof updateAIStatus === 'function') {
          updateAIStatus(`Redone: ${description}`, 'success');
        }
      } else {
        if (typeof updateAIStatus === 'function') {
          updateAIStatus('Nothing to redo', 'warning');
        }
      }
    } else if (typeof redoLastAction === 'function') {
      redoLastAction();
    }
  },

  /**
   * Handle Export action
   * Requirements: 2.3
   */
  _handleExport() {
    // Show export options modal
    if (typeof openExportModal === 'function') {
      openExportModal();
    } else if (typeof saveDiagramAsPNG === 'function') {
      // Fallback to direct PNG export
      saveDiagramAsPNG(2);
    }
  },

  /**
   * Handle Reset Session action
   * Requirements: 1.1
   */
  _handleResetSession() {
    if (typeof SessionManager !== 'undefined') {
      SessionManager.resetSession();
    } else if (typeof newDiagram === 'function') {
      // Fallback to existing newDiagram function
      newDiagram();
    }
  },

  /**
   * Handle Reset Nodes action
   * Requirements: 2.6
   * Clears customLayout and triggers full D3 Sankey recalculation
   */
  _handleResetNodes() {
    // Clear rememberedMoves
    if (typeof window !== 'undefined' && window.rememberedMoves instanceof Map) {
      window.rememberedMoves.clear();
    }
    
    // Clear ALL node positions from customLayout (complete reset)
    if (typeof customLayout !== 'undefined') {
      Object.keys(customLayout).forEach(key => {
        delete customLayout[key];
      });
    }
    
    // Clear from CustomLayoutStore
    if (typeof CustomLayoutStore !== 'undefined') {
      CustomLayoutStore.clearAllNodePositions();
    }
    
    // Clear node customizations (colors, etc.) but preserve label settings
    if (typeof nodeCustomizations !== 'undefined') {
      Object.keys(nodeCustomizations).forEach(key => {
        if (nodeCustomizations[key]) {
          delete nodeCustomizations[key].fillColor;
          delete nodeCustomizations[key].borderColor;
          delete nodeCustomizations[key].opacity;
          delete nodeCustomizations[key].borderOpacity;
        }
      });
    }
    
    // Clear nodeColors
    if (typeof nodeColors !== 'undefined') {
      Object.keys(nodeColors).forEach(key => {
        delete nodeColors[key];
      });
    }
    
    // Trigger FULL re-render through sankey.js to recalculate D3 layout
    if (typeof process_sankey === 'function') {
      process_sankey();
    } else if (typeof renderDiagram === 'function') {
      renderDiagram();
    }
    
    // Save progress
    if (typeof saveProgressToLocal === 'function') {
      saveProgressToLocal();
    }
    
    if (typeof updateAIStatus === 'function') {
      updateAIStatus('Node positions reset to D3 layout', 'success');
    }
  },

  /**
   * Handle Reset Labels action
   * Requirements: 2.7
   */
  _handleResetLabels() {
    // Clear rememberedLabelMoves
    if (typeof window !== 'undefined' && window.rememberedLabelMoves instanceof Map) {
      window.rememberedLabelMoves.clear();
    }
    
    // Clear label customizations from nodeCustomizations
    if (typeof nodeCustomizations !== 'undefined') {
      Object.keys(nodeCustomizations).forEach(key => {
        if (nodeCustomizations[key]) {
          delete nodeCustomizations[key].labelX;
          delete nodeCustomizations[key].labelY;
          delete nodeCustomizations[key].labelText;
          delete nodeCustomizations[key].labelColor;
          delete nodeCustomizations[key].labelFontSize;
          delete nodeCustomizations[key].labelAlign;
          delete nodeCustomizations[key].labelBold;
          delete nodeCustomizations[key].labelItalic;
          delete nodeCustomizations[key].labelBgEnabled;
          delete nodeCustomizations[key].labelBg;
          delete nodeCustomizations[key].labelMarginTop;
          delete nodeCustomizations[key].labelMarginRight;
          delete nodeCustomizations[key].labelMarginBottom;
          delete nodeCustomizations[key].labelMarginLeft;
        }
      });
    }
    
    // Clear label positions from customLayout
    if (typeof customLayout !== 'undefined') {
      Object.keys(customLayout).forEach(key => {
        if (customLayout[key]) {
          delete customLayout[key].originalX;
          delete customLayout[key].originalY;
        }
      });
    }
    
    // Clear from CustomLayoutStore
    if (typeof CustomLayoutStore !== 'undefined') {
      CustomLayoutStore.clearAllLabelPositions();
    }
    
    // Trigger re-render
    if (typeof process_sankey === 'function') {
      process_sankey();
    } else if (typeof renderDiagram === 'function') {
      renderDiagram();
    }
    
    if (typeof updateAIStatus === 'function') {
      updateAIStatus('Label positions reset', 'success');
    }
  },

  /**
   * Handle Factory Reset action
   * Wipes EVERYTHING and returns app to initial state
   */
  _handleFactoryReset() {
    // Confirm with user
    const confirmed = confirm(
      '⚠️ FACTORY RESET\n\n' +
      'This will:\n' +
      '• Clear ALL custom colors and styles\n' +
      '• Reset ALL node and label positions\n' +
      '• Clear ALL saved data from localStorage\n' +
      '• Reload the default sample dataset\n' +
      '• Reset zoom and pan to default\n\n' +
      'This action cannot be undone!\n\n' +
      'Are you sure you want to continue?'
    );
    
    if (!confirmed) {
      if (typeof updateAIStatus === 'function') {
        updateAIStatus('Factory reset cancelled', 'warning');
      }
      return;
    }
    
    // === STEP 1: Clear all in-memory state ===
    
    // Clear rememberedMoves (node positions)
    if (typeof window !== 'undefined' && window.rememberedMoves instanceof Map) {
      window.rememberedMoves.clear();
    }
    
    // Clear rememberedLabelMoves (label positions)
    if (typeof window !== 'undefined' && window.rememberedLabelMoves instanceof Map) {
      window.rememberedLabelMoves.clear();
    }
    
    // Clear nodeCustomizations
    if (typeof nodeCustomizations !== 'undefined') {
      Object.keys(nodeCustomizations).forEach(key => {
        delete nodeCustomizations[key];
      });
    }
    
    // Clear nodeColors
    if (typeof nodeColors !== 'undefined') {
      Object.keys(nodeColors).forEach(key => {
        delete nodeColors[key];
      });
    }
    
    // Clear customLayout
    if (typeof customLayout !== 'undefined') {
      Object.keys(customLayout).forEach(key => {
        delete customLayout[key];
      });
    }
    
    // Clear labelPositions
    if (typeof labelPositions !== 'undefined') {
      Object.keys(labelPositions).forEach(key => {
        delete labelPositions[key];
      });
    }
    
    // Clear undo/redo stacks
    if (typeof undoStack !== 'undefined') {
      undoStack.length = 0;
    }
    if (typeof window !== 'undefined' && window.redoStack) {
      window.redoStack.length = 0;
    }
    
    // Clear CustomLayoutStore
    if (typeof CustomLayoutStore !== 'undefined') {
      CustomLayoutStore.clearAllNodePositions();
      CustomLayoutStore.clearAllLabelPositions();
    }
    
    // === STEP 2: Clear ALL localStorage ===
    if (typeof localStorage !== 'undefined') {
      // Clear all sankeymatic-related keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('sankeymatic') ||
          key.startsWith('sankey') ||
          key === 'gemini_api_key' ||
          key === 'ai_model' ||
          key === 'ai_system_prompt' ||
          key === 'diagram_title'
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Also clear recent colors
      if (typeof RecentColorsManager !== 'undefined') {
        RecentColorsManager.clear();
      }
    }
    
    // === STEP 3: Reset ViewportController (zoom/pan) ===
    if (typeof ViewportController !== 'undefined' && ViewportController.isInitialized()) {
      ViewportController.reset();
    } else {
      // Fallback CSS reset
      const chart = document.getElementById('chart');
      if (chart) {
        chart.style.transform = 'scale(1)';
      }
      const zoomLevel = document.getElementById('zoom-level');
      if (zoomLevel) {
        zoomLevel.textContent = '100%';
      }
    }
    
    // === STEP 4: Reset diagram title ===
    const titleInput = document.getElementById('diagram-title-input');
    if (titleInput) {
      titleInput.value = 'My Sankey Diagram';
    }
    
    // === STEP 5: Reset theme to light ===
    if (typeof ThemeController !== 'undefined') {
      ThemeController.setTheme('light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    
    // === STEP 6: Load default dataset ===
    const defaultData = `// Sample Budget Flow
Salary [1500] Budget
Budget [450] Taxes
Budget [420] Housing
Budget [400] Food
Budget [255] Transportation
Budget [160] Other Necessities
Budget [65] Savings
Other [250] Savings`;
    
    // Set the flows input
    const flowsInput = document.getElementById('flows_in');
    if (flowsInput) {
      flowsInput.value = defaultData;
    }
    
    // Clear and rebuild data table
    const tbody = document.getElementById('data-table-body');
    if (tbody) {
      tbody.innerHTML = '';
      
      // Parse default data and add rows
      const lines = defaultData.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
      lines.forEach(line => {
        const match = line.match(/^(.+?)\s*\[(\d+(?:\.\d+)?)\]\s*(.+)$/);
        if (match) {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><input type="text" value="${match[1].trim()}" placeholder="Source"></td>
            <td><input type="text" value="${match[3].trim()}" placeholder="Target"></td>
            <td><input type="number" value="${match[2]}" placeholder="Amount" min="0" step="any"></td>
            <td><button class="delete-btn" onclick="this.closest('tr').remove(); updateDiagramFromTable();">×</button></td>
          `;
          tbody.appendChild(row);
        }
      });
    }
    
    // === STEP 7: Re-render diagram ===
    if (typeof process_sankey === 'function') {
      process_sankey();
    } else if (typeof renderDiagram === 'function') {
      renderDiagram();
    }
    
    // === STEP 8: Reset tool to Select ===
    this.setTool('select');
    
    if (typeof updateAIStatus === 'function') {
      updateAIStatus('✓ Factory reset complete - app restored to initial state', 'success');
    }
    
    console.log('Factory Reset: App restored to initial state');
  },

  /**
   * Handle Add Label action
   * Requirements: 4.1
   */
  _handleAddLabel() {
    if (typeof IndependentLabelsManager !== 'undefined') {
      // Initialize if not already
      if (!IndependentLabelsManager.isInitialized()) {
        IndependentLabelsManager.init();
      }
      IndependentLabelsManager.addLabel();
    } else {
      console.warn('ToolbarController: IndependentLabelsManager not available');
      if (typeof updateAIStatus === 'function') {
        updateAIStatus('Independent labels feature not available', 'warning');
      }
    }
  },

  /**
   * Check if a specific tool is active
   * @param {string} toolId - Tool to check
   * @returns {boolean} True if tool is active
   */
  isToolActive(toolId) {
    return this.getCurrentTool() === toolId;
  },

  /**
   * Check if selection is enabled (Select tool is active)
   * @returns {boolean} True if selection is enabled
   */
  isSelectionEnabled() {
    return this.isToolActive('select');
  },

  /**
   * Check if panning is enabled (Pan tool is active)
   * @returns {boolean} True if panning is enabled
   */
  isPanningEnabled() {
    return this.isToolActive('pan');
  },

  /**
   * Reset the toolbar controller
   */
  reset() {
    this._resetAddFlowState();
    this.setTool('select');
    // Note: Don't reset _initialized here to prevent re-initialization issues
  },

  /**
   * Force re-initialization (for testing or recovery)
   */
  forceReinit() {
    this._initialized = false;
  },

  /**
   * Check if initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this._initialized;
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.ToolbarController = ToolbarController;
}

// Export for module usage (testing)
export { ToolbarController };
