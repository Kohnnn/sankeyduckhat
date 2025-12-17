/**
 * Data Editor Module for SankeyMATIC
 * Provides tabular interface for editing diagram flows
 */

(function dataEditorModule(glob) {
  'use strict';

  // Current table data
  let rows = [];
  
  // Store original DSL text to preserve comments and node definitions
  let originalDSLText = '';
  
  // Callbacks for sync
  let onTableChangeCallback = null;
  let onTextChangeCallback = null;

  // Regex patterns for parsing DSL
  const reFlowLine = /^(.+?)\s*\[([^\]]+)\]\s*(.+?)(?:\s+(#[a-f0-9]{3,6}))?$/i;
  const reCommentLine = /^(?:'|\/\/)/;
  const reNodeLine = /^:/;
  const reSettingsLine = /^(?:\w+\s*){1,2}\s+#?[\w.-]+$/;

  /**
   * Generate a unique ID for a row.
   * Uses timestamp and random string for uniqueness.
   * @private
   * @returns {string} Unique ID (e.g., 'row_1234567890_abc123def')
   */
  function generateId() {
    return 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Parse DSL text to table rows.
   * Extracts flow lines while preserving comments and node definitions.
   * @param {string} dslText - DSL input text (e.g., 'A [100] B\nB [50] C')
   * @returns {Object[]} Array of FlowRow objects with {id, source, target, amount, color, isValid, errors}
   */
  function parseFromDSL(dslText) {
    // Store original text to preserve comments and node definitions
    originalDSLText = dslText;
    
    const lines = dslText.split('\n');
    const parsedRows = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Skip empty lines, comments, node definitions, and settings
      if (!trimmed || 
          reCommentLine.test(trimmed) || 
          reNodeLine.test(trimmed) ||
          reSettingsLine.test(trimmed)) {
        return;
      }

      const match = trimmed.match(reFlowLine);
      if (match) {
        const [, source, amount, target, color] = match;
        parsedRows.push({
          id: generateId(),
          source: source.trim(),
          target: target.trim(),
          amount: amount.trim(),
          comparison: null,
          color: color || null,
          isValid: true,
          errors: [],
          lineIndex: index
        });
      }
    });

    return parsedRows;
  }

  /**
   * Serialize table rows to DSL text.
   * Preserves comments and node definitions from original DSL.
   * @param {Object[]} flowRows - Array of FlowRow objects
   * @returns {string} DSL text (e.g., 'A [100] B\nB [50] C')
   */
  function toDSL(flowRows) {
    // If we have original DSL text, preserve non-flow lines
    if (originalDSLText) {
      const lines = originalDSLText.split('\n');
      const result = [];
      let flowIndex = 0;
      
      lines.forEach(line => {
        const trimmed = line.trim();
        
        // Preserve comments, node definitions, settings, and empty lines
        if (!trimmed || 
            reCommentLine.test(trimmed) || 
            reNodeLine.test(trimmed) ||
            reSettingsLine.test(trimmed)) {
          result.push(line);
          return;
        }
        
        // Check if this is a flow line
        const match = trimmed.match(reFlowLine);
        if (match && flowIndex < flowRows.length) {
          // Replace with updated flow from table
          const row = flowRows[flowIndex];
          if (row.source && row.target && row.amount) {
            let flowLine = `${row.source} [${row.amount}] ${row.target}`;
            if (row.color) {
              flowLine += ` ${row.color}`;
            }
            result.push(flowLine);
          }
          flowIndex++;
        }
      });
      
      // Add any new flows that weren't in the original
      while (flowIndex < flowRows.length) {
        const row = flowRows[flowIndex];
        if (row.source && row.target && row.amount) {
          let flowLine = `${row.source} [${row.amount}] ${row.target}`;
          if (row.color) {
            flowLine += ` ${row.color}`;
          }
          result.push(flowLine);
        }
        flowIndex++;
      }
      
      return result.join('\n');
    }
    
    // Fallback: just generate flow lines
    return flowRows
      .filter(row => row.source && row.target && row.amount)
      .map(row => {
        let line = `${row.source} [${row.amount}] ${row.target}`;
        if (row.color) {
          line += ` ${row.color}`;
        }
        return line;
      })
      .join('\n');
  }

  /**
   * Validate a single row.
   * Checks for required fields and valid data types.
   * @param {Object} row - FlowRow object with {source, target, amount, color}
   * @returns {Object} ValidationResult with {isValid: boolean, errors: string[]}
   */
  function validateRow(row) {
    const errors = [];

    if (!row.source || row.source.trim() === '') {
      errors.push('Source is required');
    }

    if (!row.target || row.target.trim() === '') {
      errors.push('Target is required');
    }

    const amount = String(row.amount).trim();
    if (!amount) {
      errors.push('Amount is required');
    } else if (amount !== '*' && (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)) {
      errors.push('Amount must be a positive number or *');
    }

    if (row.color && !/^#[a-f0-9]{3,6}$/i.test(row.color)) {
      errors.push('Invalid color format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export current data to CSV format.
   * Includes header row and properly escapes values.
   * @returns {string} CSV content with header and data rows
   */
  function exportCSV() {
    const header = 'Source,Target,Amount,Comparison,Color';
    const csvRows = rows.map(row => {
      const source = escapeCSV(row.source);
      const target = escapeCSV(row.target);
      const amount = row.amount;
      const comparison = row.comparison || '';
      const color = row.color || '';
      return `${source},${target},${amount},${comparison},${color}`;
    });
    
    return [header, ...csvRows].join('\n');
  }

  /**
   * Escape a value for CSV.
   * Adds quotes if value contains special characters.
   * @private
   * @param {string} value - Value to escape
   * @returns {string} Escaped value (quoted if necessary)
   */
  function escapeCSV(value) {
    if (!value) return '';
    // Quote if contains comma, quote, newline, or leading/trailing whitespace
    if (value.includes(',') || value.includes('"') || value.includes('\n') || 
        value !== value.trim()) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  /**
   * Parse CSV value (handle quotes).
   * Note: parseCSVLine already handles quote removal, so this just returns the value.
   * @private
   * @param {string} value - CSV value
   * @returns {string} Parsed value
   */
  function parseCSVValue(value) {
    if (!value) return '';
    // parseCSVLine already handled quotes, just return the value as-is
    return value;
  }

  /**
   * Parse a CSV line into fields, handling quoted values.
   * Properly handles escaped quotes and commas within quoted fields.
   * @private
   * @param {string} line - CSV line
   * @returns {string[]} Array of field values
   */
  function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add last field
    fields.push(currentField);
    
    return fields;
  }

  /**
   * Import data from CSV content.
   * Parses CSV and validates each row.
   * @param {string} csvText - CSV content with header row
   * @returns {Object[]} Array of FlowRow objects with validation results
   */
  function importCSV(csvText) {
    const lines = csvText.split('\n');
    const importedRows = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line properly
      const parts = parseCSVLine(line);
      if (parts.length >= 3) {
        const row = {
          id: generateId(),
          source: parseCSVValue(parts[0]),
          target: parseCSVValue(parts[1]),
          amount: parseCSVValue(parts[2]),
          comparison: parts[3] && parts[3].trim() ? parseFloat(parts[3]) : null,
          color: parts[4] && parts[4].trim() ? parseCSVValue(parts[4]) : null,
          isValid: true,
          errors: []
        };

        const validation = validateRow(row);
        row.isValid = validation.isValid;
        row.errors = validation.errors;

        importedRows.push(row);
      }
    }

    return importedRows;
  }

  /**
   * Set the current rows.
   * Validates all rows before setting.
   * @param {Object[]} newRows - Array of FlowRow objects
   * @returns {void}
   */
  function setRows(newRows) {
    rows = newRows.map(row => {
      const validation = validateRow(row);
      return { ...row, isValid: validation.isValid, errors: validation.errors };
    });
  }

  /**
   * Get the current rows.
   * Returns a copy to prevent external modifications.
   * @returns {Object[]} Array of FlowRow objects
   */
  function getRows() {
    return [...rows];
  }

  /**
   * Add a new empty row.
   * Creates an invalid row that requires user input.
   * @returns {Object} The new FlowRow object
   */
  function addRow() {
    const newRow = {
      id: generateId(),
      source: '',
      target: '',
      amount: '',
      comparison: null,
      color: null,
      isValid: false,
      errors: ['Source is required', 'Target is required', 'Amount is required']
    };
    rows.push(newRow);
    return newRow;
  }

  /**
   * Delete a row by ID.
   * @param {string} id - Row ID (e.g., 'row_1234567890_abc123def')
   * @returns {boolean} True if deleted successfully, false if not found
   */
  function deleteRow(id) {
    const index = rows.findIndex(r => r.id === id);
    if (index !== -1) {
      rows.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update a row.
   * Validates the row after updating.
   * @param {string} id - Row ID (e.g., 'row_1234567890_abc123def')
   * @param {Object} updates - Fields to update (e.g., {source: 'A', amount: '100'})
   * @returns {Object|null} Updated FlowRow object or null if not found
   */
  function updateRow(id, updates) {
    const row = rows.find(r => r.id === id);
    if (row) {
      Object.assign(row, updates);
      const validation = validateRow(row);
      row.isValid = validation.isValid;
      row.errors = validation.errors;
      return row;
    }
    return null;
  }

  /**
   * Set callback for table changes.
   * Called when table data is modified.
   * @param {Function} callback - Callback function that receives rows array
   * @returns {void}
   */
  function onTableChange(callback) {
    onTableChangeCallback = callback;
  }

  /**
   * Set callback for text changes.
   * Called when DSL text should be updated.
   * @param {Function} callback - Callback function that receives DSL text string
   * @returns {void}
   */
  function onTextChange(callback) {
    onTextChangeCallback = callback;
  }

  /**
   * Notify table change.
   * Triggers the table change callback if set.
   * @returns {void}
   */
  function notifyTableChange() {
    if (onTableChangeCallback) {
      onTableChangeCallback(rows);
    }
  }

  /**
   * Notify text change.
   * Triggers the text change callback if set.
   * @param {string} dslText - New DSL text
   * @returns {void}
   */
  function notifyTextChange(dslText) {
    if (onTextChangeCallback) {
      onTextChangeCallback(dslText);
    }
  }

  // Export the module
  glob.DataEditor = {
    parseFromDSL,
    toDSL,
    validateRow,
    exportCSV,
    importCSV,
    setRows,
    getRows,
    addRow,
    deleteRow,
    updateRow,
    onTableChange,
    onTextChange,
    notifyTableChange,
    notifyTextChange
  };

})(typeof window !== 'undefined' ? window : global);

/**
 * Data Editor UI Layer
 * Handles rendering and user interactions
 */
(function dataEditorUIModule(glob) {
  'use strict';

  const DataEditor = glob.DataEditor;
  let syncInProgress = false;

  /**
   * Render the table with current rows.
   * Creates table rows with input fields and delete buttons.
   * @returns {void}
   */
  function renderTable() {
    const tbody = document.getElementById('data-editor-tbody');
    if (!tbody) return;

    const rows = DataEditor.getRows();
    tbody.innerHTML = '';

    rows.forEach(row => {
      const tr = document.createElement('tr');
      if (!row.isValid) {
        tr.classList.add('invalid');
      }
      tr.setAttribute('data-row-id', row.id);

      // Source cell
      const tdSource = document.createElement('td');
      const inputSource = document.createElement('input');
      inputSource.type = 'text';
      inputSource.value = row.source || '';
      inputSource.addEventListener('input', (e) => {
        updateRowField(row.id, 'source', e.target.value);
      });
      tdSource.appendChild(inputSource);
      tr.appendChild(tdSource);

      // Target cell
      const tdTarget = document.createElement('td');
      const inputTarget = document.createElement('input');
      inputTarget.type = 'text';
      inputTarget.value = row.target || '';
      inputTarget.addEventListener('input', (e) => {
        updateRowField(row.id, 'target', e.target.value);
      });
      tdTarget.appendChild(inputTarget);
      tr.appendChild(tdTarget);

      // Amount cell
      const tdAmount = document.createElement('td');
      const inputAmount = document.createElement('input');
      inputAmount.type = 'text';
      inputAmount.value = row.amount || '';
      inputAmount.addEventListener('input', (e) => {
        updateRowField(row.id, 'amount', e.target.value);
      });
      tdAmount.appendChild(inputAmount);
      tr.appendChild(tdAmount);

      // Comparison cell
      const tdComparison = document.createElement('td');
      const inputComparison = document.createElement('input');
      inputComparison.type = 'number';
      inputComparison.value = row.comparison || '';
      inputComparison.addEventListener('input', (e) => {
        updateRowField(row.id, 'comparison', e.target.value ? parseFloat(e.target.value) : null);
      });
      tdComparison.appendChild(inputComparison);
      tr.appendChild(tdComparison);

      // Color cell
      const tdColor = document.createElement('td');
      const inputColor = document.createElement('input');
      inputColor.type = 'text';
      inputColor.value = row.color || '';
      inputColor.placeholder = '#abc or #aabbcc';
      inputColor.addEventListener('input', (e) => {
        updateRowField(row.id, 'color', e.target.value || null);
      });
      tdColor.appendChild(inputColor);
      tr.appendChild(tdColor);

      // Actions cell
      const tdActions = document.createElement('td');
      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.textContent = '×';
      btnDelete.className = 'delete-row-button';
      btnDelete.title = 'Delete row';
      btnDelete.addEventListener('click', () => {
        deleteRowHandler(row.id);
      });
      tdActions.appendChild(btnDelete);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  /**
   * Update a field in a row.
   * Updates the row and syncs to text input.
   * @private
   * @param {string} rowId - Row ID
   * @param {string} field - Field name (e.g., 'source', 'amount')
   * @param {*} value - New value
   * @returns {void}
   */
  function updateRowField(rowId, field, value) {
    const updates = { [field]: value };
    const updatedRow = DataEditor.updateRow(rowId, updates);
    
    if (updatedRow) {
      // Update the row's visual state
      const tr = document.querySelector(`tr[data-row-id="${rowId}"]`);
      if (tr) {
        if (updatedRow.isValid) {
          tr.classList.remove('invalid');
        } else {
          tr.classList.add('invalid');
        }
      }
      
      // Sync to text input
      syncToText();
      
      // Notify data change for Sync Manager
      notifyDataChange();
    }
  }

  /**
   * Delete a row.
   * Removes row and syncs to text input.
   * @private
   * @param {string} rowId - Row ID
   * @returns {void}
   */
  function deleteRowHandler(rowId) {
    if (DataEditor.deleteRow(rowId)) {
      renderTable();
      syncToText();
      notifyDataChange();
    }
  }

  /**
   * Add a new row.
   * Creates empty row and syncs to text input.
   * @returns {void}
   */
  function addRow() {
    DataEditor.addRow();
    renderTable();
    syncToText();
    notifyDataChange();
  }

  /**
   * Sync table data to text input.
   * Converts table rows to DSL and updates textarea.
   * @returns {void}
   */
  function syncToText() {
    if (syncInProgress) return;
    syncInProgress = true;

    const rows = DataEditor.getRows();
    const dslText = DataEditor.toDSL(rows);
    
    const textarea = document.getElementById('flows_in');
    if (textarea) {
      textarea.value = dslText;
      // Trigger the diagram update
      if (typeof process_sankey === 'function') {
        process_sankey();
      }
    }

    syncInProgress = false;
  }

  /**
   * Sync text input to table data.
   * Parses DSL from textarea and updates table.
   * @returns {void}
   */
  function syncFromText() {
    if (syncInProgress) return;
    syncInProgress = true;

    const textarea = document.getElementById('flows_in');
    if (textarea) {
      const dslText = textarea.value;
      const rows = DataEditor.parseFromDSL(dslText);
      DataEditor.setRows(rows);
      renderTable();
      notifyDataChange();
    }

    syncInProgress = false;
  }

  /**
   * Export current data as CSV.
   * Generates CSV and triggers download.
   * @returns {void}
   */
  function exportCSV() {
    const csvContent = DataEditor.exportCSV();
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'sankey-data.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Import CSV from file input.
   * Reads file, parses CSV, and updates table.
   * @param {Event} event - File input change event
   * @returns {void}
   */
  function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const rows = DataEditor.importCSV(csvText);
        DataEditor.setRows(rows);
        renderTable();
        syncToText();
      } catch (error) {
        alert('Error importing CSV: ' + error.message);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  // Sync Manager integration methods
  let dataChangeCallbacks = [];
  
  /**
   * Register callback for data changes (for Sync Manager integration)
   * @param {Function} callback - Callback function that receives rows array
   */
  function onDataChange(callback) {
    if (typeof callback === 'function') {
      dataChangeCallbacks.push(callback);
    }
  }
  
  /**
   * Notify data change callbacks
   * @private
   */
  function notifyDataChange() {
    const rows = DataEditor.getRows();
    dataChangeCallbacks.forEach(callback => {
      try {
        callback(rows);
      } catch (error) {
        console.error('Error in data change callback:', error);
      }
    });
  }
  
  /**
   * Update flows from external source (for Sync Manager integration)
   * @param {FlowRow[]} flows - Array of flow rows to set
   */
  function updateFlows(flows) {
    if (!Array.isArray(flows)) {
      console.warn('DataEditorUI.updateFlows: flows must be an array');
      return;
    }
    
    DataEditor.setRows(flows);
    renderTable();
    syncToText();
    notifyDataChange();
  }
  
  /**
   * Get current flows (for Sync Manager integration)
   * @returns {FlowRow[]} Current flow rows
   */
  function getCurrentFlows() {
    return DataEditor.getRows();
  }
  
  /**
   * Highlight specific rows (for AI suggestions)
   * @param {string[]} rowIds - Array of row IDs to highlight
   */
  function highlightRows(rowIds) {
    if (!Array.isArray(rowIds)) {
      console.warn('DataEditorUI.highlightRows: rowIds must be an array');
      return;
    }
    
    // Clear existing highlights
    clearHighlights();
    
    // Apply new highlights
    rowIds.forEach(rowId => {
      const row = document.querySelector(`tr[data-row-id="${rowId}"]`);
      if (row) {
        row.classList.add('ai-highlight');
      }
    });
  }
  
  /**
   * Clear all row highlights
   */
  function clearHighlights() {
    const highlightedRows = document.querySelectorAll('tr.ai-highlight');
    highlightedRows.forEach(row => {
      row.classList.remove('ai-highlight');
    });
  }

  // Export the UI module
  glob.DataEditorUI = {
    renderTable,
    syncToText,
    syncFromText,
    addRow,
    exportCSV,
    importCSV,
    // Sync Manager integration methods
    onDataChange,
    updateFlows,
    getCurrentFlows,
    highlightRows,
    clearHighlights
  };

})(typeof window !== 'undefined' ? window : global);


// Initialize the Data Editor UI when the DOM is ready
if (typeof document !== 'undefined') {
  function initializeDataEditor() {
    console.log('Initializing Data Editor and AI Integration components...');
    
    // Set up text input change listener with debouncing
    const textarea = document.getElementById('flows_in');
    if (textarea) {
      let debounceTimer;
      textarea.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // Only sync if we're on the data editor tab
          const editorTab = document.getElementById('data-editor-tab');
          if (editorTab && editorTab.classList.contains('active')) {
            DataEditorUI.syncFromText();
          }
        }, 500);
      });
    }

    // Initialize AI Service
    if (typeof window.aiService !== 'undefined') {
      window.aiService.initialize()
        .then(() => {
          console.log('AI Service initialized successfully');
        })
        .catch((error) => {
          console.error('Failed to initialize AI Service:', error);
        });
    }

    // Initialize Sync Manager and register components
    if (typeof window.syncManager !== 'undefined' && typeof DataEditorUI !== 'undefined') {
      window.syncManager.registerDataEditor(DataEditorUI);
      console.log('Data Editor registered with Sync Manager');
      
      // Set up sync event listeners
      window.syncManager.onSync((source, data) => {
        console.log(`Sync event from ${source}:`, data.length, 'flows');
      });
    }

    // Initialize AI Chat UI
    const aiChatContainer = document.getElementById('ai-chat-ui-container');
    if (aiChatContainer && typeof aiChatUI !== 'undefined') {
      aiChatUI.render(aiChatContainer);
      
      // Connect AI Chat UI to services
      if (typeof window.aiService !== 'undefined' && typeof window.syncManager !== 'undefined') {
        aiChatUI.connectServices(window.aiService, window.syncManager);
        window.syncManager.registerAIChat(aiChatUI);
        console.log('AI Chat UI connected to services');
      }
      
      // Set up event handlers
      aiChatUI.onImagePaste((imageData) => {
        console.log('Image pasted in AI Chat:', imageData.size, 'bytes');
      });
      
      aiChatUI.onFileUpload((file) => {
        console.log('File uploaded in AI Chat:', file.name, file.size, 'bytes');
      });
    }

    // Initialize Validation Status Bar
    if (typeof window.validationStatusBar !== 'undefined') {
      const statusContainer = document.getElementById('validation-status-container');
      if (statusContainer) {
        window.validationStatusBar.initialize(statusContainer);
        console.log('Validation Status Bar initialized');
      }
    }

    console.log('Data Editor and AI Integration initialization complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDataEditor);
  } else {
    initializeDataEditor();
  }
}
