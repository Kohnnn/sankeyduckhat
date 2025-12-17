/**
 * @fileoverview DSL Parser/Serializer Module
 * Handles conversion between DSL text format and structured FlowRow data
 */

/**
 * DSL Parser class for converting between DSL text and FlowRow objects
 */
export class DSLParser {
  /**
   * Parse DSL text to FlowRow array
   * @param {string} dslText - DSL text to parse
   * @returns {FlowRow[]} Array of parsed flow rows
   */
  parse(dslText) {
    if (!dslText || typeof dslText !== 'string') {
      return [];
    }

    const lines = dslText.split('\n');
    const flows = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
        continue;
      }

      // Skip node definitions (lines that define node properties)
      if (this._isNodeDefinition(trimmedLine)) {
        continue;
      }

      // Parse flow line
      const flowRow = this._parseFlowLine(trimmedLine, lineNumber);
      if (flowRow) {
        flows.push(flowRow);
      }
    }

    return flows;
  }

  /**
   * Serialize FlowRow array to DSL text
   * @param {FlowRow[]} flows - Array of flow rows to serialize
   * @param {string} [originalText] - Original DSL text to preserve comments and node definitions
   * @returns {string} DSL text representation
   */
  serialize(flows, originalText = '') {
    if (!Array.isArray(flows)) {
      return '';
    }

    // If we have original text, preserve comments and node definitions
    if (originalText) {
      return this._serializeWithPreservation(flows, originalText);
    }

    // Simple serialization without preservation
    const lines = [];
    
    for (const flow of flows) {
      if (!flow || !flow.source || !flow.target) {
        continue;
      }

      let line = `${flow.source} [${flow.amount}] ${flow.target}`;
      
      // Add color if specified
      if (flow.color) {
        line += ` ${flow.color}`;
      }

      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * Validate DSL syntax
   * @param {string} dslText - DSL text to validate
   * @returns {ValidationResult} Validation result with errors
   */
  validate(dslText) {
    if (!dslText || typeof dslText !== 'string') {
      return { isValid: true, errors: [] };
    }

    const lines = dslText.split('\n');
    const errors = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
        continue;
      }

      // Skip node definitions
      if (this._isNodeDefinition(trimmedLine)) {
        continue;
      }

      // Validate flow line syntax
      const validationError = this._validateFlowLine(trimmedLine, lineNumber);
      if (validationError) {
        errors.push(validationError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Check if a line is a node definition
   * @private
   * @param {string} line - Line to check
   * @returns {boolean} True if line is a node definition
   */
  _isNodeDefinition(line) {
    // Node definitions typically contain only a node name and properties
    // without the [amount] flow syntax, but they should have a colon or specific format
    // For now, we'll be conservative and only skip lines that clearly look like node definitions
    // This is a simple heuristic - in practice, node definitions might have specific patterns
    return line.includes(':') && (!line.includes('[') || !line.includes(']'));
  }

  /**
   * Parse a single flow line
   * @private
   * @param {string} line - Line to parse
   * @param {number} lineNumber - Line number for error reporting
   * @returns {FlowRow|null} Parsed flow row or null if invalid
   */
  _parseFlowLine(line, lineNumber) {
    // Match pattern: Source [Amount] Target [Color]
    const flowPattern = /^(.+?)\s*\[([^\]]+)\]\s*(.+?)(?:\s+(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}))?$/;
    const match = line.match(flowPattern);

    if (!match) {
      return {
        id: `line_${lineNumber}`,
        source: '',
        target: '',
        amount: '',
        isValid: false,
        errors: [`Invalid flow syntax on line ${lineNumber}: ${line}`]
      };
    }

    const [, source, amount, target, color] = match;
    
    return {
      id: `line_${lineNumber}`,
      source: source.trim(),
      target: target.trim(),
      amount: this._parseAmount(amount.trim()),
      color: color || undefined,
      isValid: true,
      errors: []
    };
  }

  /**
   * Parse amount value from DSL
   * @private
   * @param {string} amountStr - Amount string to parse
   * @returns {string|number} Parsed amount
   */
  _parseAmount(amountStr) {
    if (amountStr === '*') {
      return '*';
    }

    // Handle comparison amounts (Current|Comparison format)
    if (amountStr.includes('|')) {
      const [current] = amountStr.split('|');
      return parseFloat(current) || 0;
    }

    const parsed = parseFloat(amountStr);
    return isNaN(parsed) ? amountStr : parsed;
  }

  /**
   * Serialize flows while preserving comments and node definitions from original text
   * @private
   * @param {FlowRow[]} flows - Array of flow rows to serialize
   * @param {string} originalText - Original DSL text
   * @returns {string} DSL text with preserved non-flow content
   */
  _serializeWithPreservation(flows, originalText) {
    const originalLines = originalText.split('\n');
    const newLines = [];
    const flowMap = new Map();
    
    // Create a map of flows by source-target pair for quick lookup
    flows.forEach((flow, index) => {
      if (flow && flow.source && flow.target) {
        const key = `${flow.source}->${flow.target}`;
        flowMap.set(key, flow);
      }
    });

    let flowIndex = 0;
    
    for (const line of originalLines) {
      const trimmedLine = line.trim();
      
      // Preserve empty lines, comments, and node definitions
      if (!trimmedLine || 
          trimmedLine.startsWith('//') || 
          trimmedLine.startsWith('#') ||
          this._isNodeDefinition(trimmedLine)) {
        newLines.push(line);
        continue;
      }

      // Replace flow lines with updated data
      if (flowIndex < flows.length) {
        const flow = flows[flowIndex];
        if (flow && flow.source && flow.target) {
          let newLine = `${flow.source} [${flow.amount}] ${flow.target}`;
          
          // Add color if specified
          if (flow.color) {
            newLine += ` ${flow.color}`;
          }
          
          newLines.push(newLine);
          flowIndex++;
        } else {
          newLines.push(line); // Keep original if flow is invalid
        }
      } else {
        newLines.push(line); // Keep original if no more flows
      }
    }

    // Add any remaining flows that weren't in the original text
    while (flowIndex < flows.length) {
      const flow = flows[flowIndex];
      if (flow && flow.source && flow.target) {
        let newLine = `${flow.source} [${flow.amount}] ${flow.target}`;
        
        if (flow.color) {
          newLine += ` ${flow.color}`;
        }
        
        newLines.push(newLine);
      }
      flowIndex++;
    }

    return newLines.join('\n');
  }

  /**
   * Validate a single flow line syntax
   * @private
   * @param {string} line - Line to validate
   * @param {number} lineNumber - Line number for error reporting
   * @returns {SyntaxError|null} Syntax error or null if valid
   */
  _validateFlowLine(line, lineNumber) {
    // Check for balanced brackets first (more specific than missing brackets)
    const openBrackets = (line.match(/\[/g) || []).length;
    const closeBrackets = (line.match(/\]/g) || []).length;
    
    if (openBrackets > 0 || closeBrackets > 0) {
      if (openBrackets !== closeBrackets) {
        return {
          line: lineNumber,
          column: line.indexOf('[') + 1,
          message: 'Unbalanced brackets in flow definition',
          code: 'UNBALANCED_BRACKETS'
        };
      }
    }

    // Check for basic flow pattern
    if (!line.includes('[') || !line.includes(']')) {
      return {
        line: lineNumber,
        column: 1,
        message: 'Flow must contain amount in brackets [amount]',
        code: 'MISSING_BRACKETS'
      };
    }

    // Check for valid flow pattern
    const flowPattern = /^(.+?)\s*\[([^\]]+)\]\s*(.+?)(?:\s+(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}))?$/;
    if (!flowPattern.test(line)) {
      return {
        line: lineNumber,
        column: 1,
        message: 'Invalid flow syntax. Expected: Source [Amount] Target [Color]',
        code: 'INVALID_SYNTAX'
      };
    }

    // Validate color format if present
    const colorMatch = line.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/);
    if (line.includes('#') && !colorMatch) {
      const colorIndex = line.indexOf('#');
      return {
        line: lineNumber,
        column: colorIndex + 1,
        message: 'Invalid color format. Use #RGB or #RRGGBB',
        code: 'INVALID_COLOR'
      };
    }

    return null;
  }
}

// Create default instance for module exports
export const dslParser = new DSLParser();

// Export individual functions for convenience
export const parse = (dslText) => dslParser.parse(dslText);
export const serialize = (flows, originalText) => dslParser.serialize(flows, originalText);
export const validate = (dslText) => dslParser.validate(dslText);