/**
 * ValidationUtils - Input validation and clamping utilities
 * Provides validation functions for hex colors, opacity, margins, and other inputs
 * 
 * Requirements: 6.1, 6.5
 */

const ValidationUtils = {
  /**
   * Validate hex color format
   * @param {string} hex - Hex color string
   * @returns {Object} { isValid: boolean, normalized: string|null, error: string|null }
   */
  validateHexColor(hex) {
    if (!hex || typeof hex !== 'string') {
      return { isValid: false, normalized: null, error: 'Color is required' };
    }
    
    // Remove # if present
    let clean = hex.replace(/^#/, '');
    
    // Handle 3-character hex
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    
    // Validate 6-character hex
    if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
      return { isValid: false, normalized: null, error: 'Invalid hex color format' };
    }
    
    return { isValid: true, normalized: '#' + clean.toLowerCase(), error: null };
  },

  /**
   * Validate and clamp opacity value (0-100)
   * @param {number|string} value - Opacity value
   * @returns {Object} { isValid: boolean, clamped: number, error: string|null }
   */
  validateOpacity(value) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return { isValid: false, clamped: 100, error: 'Opacity must be a number' };
    }
    
    const clamped = Math.max(0, Math.min(100, num));
    const wasOutOfRange = num < 0 || num > 100;
    
    return { 
      isValid: true, 
      clamped, 
      error: wasOutOfRange ? 'Opacity clamped to 0-100 range' : null,
      wasAdjusted: wasOutOfRange
    };
  },

  /**
   * Validate and clamp margin value (0-100)
   * @param {number|string} value - Margin value
   * @returns {Object} { isValid: boolean, clamped: number, error: string|null }
   */
  validateMargin(value) {
    const num = parseInt(value, 10);
    
    if (isNaN(num)) {
      return { isValid: false, clamped: 0, error: 'Margin must be a number' };
    }
    
    const clamped = Math.max(0, Math.min(100, num));
    const wasOutOfRange = num < 0 || num > 100;
    
    return { 
      isValid: true, 
      clamped, 
      error: wasOutOfRange ? 'Margin clamped to 0-100 range' : null,
      wasAdjusted: wasOutOfRange
    };
  },

  /**
   * Validate and clamp font size (8-72)
   * @param {number|string} value - Font size value
   * @returns {Object} { isValid: boolean, clamped: number, error: string|null }
   */
  validateFontSize(value) {
    const num = parseInt(value, 10);
    
    if (isNaN(num)) {
      return { isValid: false, clamped: 16, error: 'Font size must be a number' };
    }
    
    const clamped = Math.max(8, Math.min(72, num));
    const wasOutOfRange = num < 8 || num > 72;
    
    return { 
      isValid: true, 
      clamped, 
      error: wasOutOfRange ? 'Font size clamped to 8-72 range' : null,
      wasAdjusted: wasOutOfRange
    };
  },

  /**
   * Validate position offset (-1000 to 1000)
   * @param {number|string} value - Position offset value
   * @returns {Object} { isValid: boolean, clamped: number, error: string|null }
   */
  validatePositionOffset(value) {
    const num = parseInt(value, 10);
    
    if (isNaN(num)) {
      return { isValid: false, clamped: 0, error: 'Position must be a number' };
    }
    
    const clamped = Math.max(-1000, Math.min(1000, num));
    const wasOutOfRange = num < -1000 || num > 1000;
    
    return { 
      isValid: true, 
      clamped, 
      error: wasOutOfRange ? 'Position clamped to -1000 to 1000 range' : null,
      wasAdjusted: wasOutOfRange
    };
  },

  /**
   * Validate node/label text
   * @param {string} text - Text to validate
   * @returns {Object} { isValid: boolean, sanitized: string, error: string|null }
   */
  validateText(text) {
    if (!text || typeof text !== 'string') {
      return { isValid: false, sanitized: '', error: 'Text is required' };
    }
    
    // Trim and limit length
    const sanitized = text.trim().substring(0, 500);
    const wasTruncated = text.length > 500;
    
    return { 
      isValid: true, 
      sanitized, 
      error: wasTruncated ? 'Text truncated to 500 characters' : null,
      wasAdjusted: wasTruncated
    };
  },

  /**
   * Validate flow amount (positive number)
   * @param {number|string} value - Flow amount
   * @returns {Object} { isValid: boolean, value: number, error: string|null }
   */
  validateFlowAmount(value) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return { isValid: false, value: 0, error: 'Amount must be a number' };
    }
    
    if (num <= 0) {
      return { isValid: false, value: 0, error: 'Amount must be positive' };
    }
    
    if (!isFinite(num)) {
      return { isValid: false, value: 0, error: 'Amount must be finite' };
    }
    
    return { isValid: true, value: num, error: null };
  },

  /**
   * Show validation error on an input element
   * @param {HTMLElement} input - Input element
   * @param {string} error - Error message
   */
  showError(input, error) {
    if (!input) return;
    
    input.style.borderColor = '#dc3545';
    input.title = error;
    
    // Find or create error span
    let errorSpan = input.parentElement?.querySelector('.validation-error');
    if (!errorSpan) {
      errorSpan = document.createElement('span');
      errorSpan.className = 'validation-error';
      errorSpan.style.cssText = 'color:#dc3545;font-size:11px;display:block;margin-top:2px;';
      input.parentElement?.appendChild(errorSpan);
    }
    errorSpan.textContent = error;
  },

  /**
   * Clear validation error from an input element
   * @param {HTMLElement} input - Input element
   */
  clearError(input) {
    if (!input) return;
    
    input.style.borderColor = '';
    input.title = '';
    
    const errorSpan = input.parentElement?.querySelector('.validation-error');
    if (errorSpan) {
      errorSpan.remove();
    }
  },

  /**
   * Validate all node customization settings
   * @param {Object} settings - Node settings object
   * @returns {Object} { isValid: boolean, validated: Object, errors: string[] }
   */
  validateNodeSettings(settings) {
    const errors = [];
    const validated = {};
    
    // Validate fill color
    if (settings.fillColor) {
      const result = this.validateHexColor(settings.fillColor);
      if (result.isValid) {
        validated.fillColor = result.normalized;
      } else {
        errors.push('Fill color: ' + result.error);
      }
    }
    
    // Validate border color
    if (settings.borderColor) {
      const result = this.validateHexColor(settings.borderColor);
      if (result.isValid) {
        validated.borderColor = result.normalized;
      } else {
        errors.push('Border color: ' + result.error);
      }
    }
    
    // Validate opacity
    if (settings.opacity !== undefined) {
      const result = this.validateOpacity(settings.opacity);
      validated.opacity = result.clamped;
      if (result.error) errors.push('Opacity: ' + result.error);
    }
    
    // Validate border opacity
    if (settings.borderOpacity !== undefined) {
      const result = this.validateOpacity(settings.borderOpacity);
      validated.borderOpacity = result.clamped;
      if (result.error) errors.push('Border opacity: ' + result.error);
    }
    
    return {
      isValid: errors.length === 0,
      validated: { ...settings, ...validated },
      errors
    };
  },

  /**
   * Validate all label customization settings
   * @param {Object} settings - Label settings object
   * @returns {Object} { isValid: boolean, validated: Object, errors: string[] }
   */
  validateLabelSettings(settings) {
    const errors = [];
    const validated = {};
    
    // Validate label text - handle empty strings explicitly
    // Empty string is a valid label text (user intentionally cleared it)
    if (settings.labelText !== undefined) {
      if (settings.labelText === '') {
        // Empty string is valid - preserve it
        validated.labelText = '';
      } else {
        const result = this.validateText(settings.labelText);
        validated.labelText = result.sanitized;
        if (result.error) errors.push('Label text: ' + result.error);
      }
    }
    
    // Validate font size
    if (settings.labelFontSize !== undefined) {
      const result = this.validateFontSize(settings.labelFontSize);
      validated.labelFontSize = result.clamped;
      if (result.error) errors.push('Font size: ' + result.error);
    }
    
    // Validate label color
    if (settings.labelColor) {
      const result = this.validateHexColor(settings.labelColor);
      if (result.isValid) {
        validated.labelColor = result.normalized;
      } else {
        errors.push('Label color: ' + result.error);
      }
    }
    
    // Validate margins
    ['labelMarginTop', 'labelMarginRight', 'labelMarginBottom', 'labelMarginLeft'].forEach(key => {
      if (settings[key] !== undefined) {
        const result = this.validateMargin(settings[key]);
        validated[key] = result.clamped;
        if (result.error) errors.push(`${key}: ${result.error}`);
      }
    });
    
    // Validate position offsets
    if (settings.labelX !== undefined) {
      const result = this.validatePositionOffset(settings.labelX);
      validated.labelX = result.clamped;
      if (result.error) errors.push('X offset: ' + result.error);
    }
    
    if (settings.labelY !== undefined) {
      const result = this.validatePositionOffset(settings.labelY);
      validated.labelY = result.clamped;
      if (result.error) errors.push('Y offset: ' + result.error);
    }
    
    return {
      isValid: errors.length === 0,
      validated: { ...settings, ...validated },
      errors
    };
  }
};

// Export as global object for browser usage
if (typeof window !== 'undefined') {
  window.ValidationUtils = ValidationUtils;
}

// Export for module usage (testing)
export { ValidationUtils };
