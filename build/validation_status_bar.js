/**
 * @fileoverview Validation Status Bar Component
 * Displays balance validation status below the Sankey diagram
 */

/**
 * Validation Status Bar class for displaying flow balance status
 */
class ValidationStatusBar {
  constructor() {
    this.container = null;
    this.statusElement = null;
    this.initialized = false;
  }

  /**
   * Initialize the status bar and render it in the specified container
   * @param {HTMLElement|string} container - Container element or selector
   */
  initialize(container) {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }

    if (!this.container) {
      console.error('ValidationStatusBar: Container not found');
      return;
    }

    this.render();
    this.initialized = true;
  }

  /**
   * Render the status bar UI component
   */
  render() {
    if (!this.container) {
      console.error('ValidationStatusBar: No container available for rendering');
      return;
    }

    // Create status bar element
    this.statusElement = document.createElement('div');
    this.statusElement.id = 'validation-status-bar';
    this.statusElement.className = 'validation-status-bar';

    // Create status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';
    statusIndicator.id = 'status-indicator';

    // Create status message
    const statusMessage = document.createElement('div');
    statusMessage.className = 'status-message';
    statusMessage.id = 'status-message';
    statusMessage.textContent = 'Checking flow balance...';

    // Create details container for imbalance warnings
    const statusDetails = document.createElement('div');
    statusDetails.className = 'status-details';
    statusDetails.id = 'status-details';
    statusDetails.style.display = 'none';

    // Assemble the status bar
    this.statusElement.appendChild(statusIndicator);
    this.statusElement.appendChild(statusMessage);
    this.statusElement.appendChild(statusDetails);

    // Add to container
    this.container.appendChild(this.statusElement);
  }

  /**
   * Update the status bar with validation results
   * @param {BalanceResult} balanceResult - Result from flow validator
   */
  updateStatus(balanceResult) {
    if (!this.initialized || !this.statusElement) {
      console.warn('ValidationStatusBar: Not initialized, cannot update status');
      return;
    }

    const statusIndicator = this.statusElement.querySelector('#status-indicator');
    const statusMessage = this.statusElement.querySelector('#status-message');
    const statusDetails = this.statusElement.querySelector('#status-details');

    if (!balanceResult) {
      this.showError('Unable to validate flow balance');
      return;
    }

    if (balanceResult.isBalanced) {
      this.showSuccess('All nodes are balanced');
      statusDetails.style.display = 'none';
    } else {
      this.showWarning(balanceResult);
      this.showImbalanceDetails(balanceResult.imbalancedNodes, statusDetails);
    }
  }

  /**
   * Show success status (all nodes balanced)
   * @param {string} message - Success message to display
   */
  showSuccess(message) {
    const statusIndicator = this.statusElement.querySelector('#status-indicator');
    const statusMessage = this.statusElement.querySelector('#status-message');

    statusIndicator.className = 'status-indicator success';
    statusIndicator.innerHTML = '✓';
    statusMessage.textContent = message;
    statusMessage.className = 'status-message success';

    // Remove any error/warning classes from the container
    this.statusElement.className = 'validation-status-bar success';
  }

  /**
   * Show warning status (imbalanced nodes)
   * @param {BalanceResult} balanceResult - Balance validation result
   */
  showWarning(balanceResult) {
    const statusIndicator = this.statusElement.querySelector('#status-indicator');
    const statusMessage = this.statusElement.querySelector('#status-message');

    statusIndicator.className = 'status-indicator warning';
    statusIndicator.innerHTML = '⚠';

    const nodeCount = balanceResult.imbalancedNodes.length;
    const nodeWord = nodeCount === 1 ? 'node' : 'nodes';
    const message = `Warning: ${nodeCount} ${nodeWord} ${nodeCount === 1 ? 'is' : 'are'} imbalanced`;
    
    statusMessage.textContent = message;
    statusMessage.className = 'status-message warning';

    // Add warning class to container
    this.statusElement.className = 'validation-status-bar warning';
  }

  /**
   * Show error status
   * @param {string} message - Error message to display
   */
  showError(message) {
    const statusIndicator = this.statusElement.querySelector('#status-indicator');
    const statusMessage = this.statusElement.querySelector('#status-message');
    const statusDetails = this.statusElement.querySelector('#status-details');

    statusIndicator.className = 'status-indicator error';
    statusIndicator.innerHTML = '✗';
    statusMessage.textContent = message;
    statusMessage.className = 'status-message error';
    statusDetails.style.display = 'none';

    // Add error class to container
    this.statusElement.className = 'validation-status-bar error';
  }

  /**
   * Show detailed imbalance information
   * @param {ImbalancedNode[]} imbalancedNodes - Array of imbalanced nodes
   * @param {HTMLElement} detailsContainer - Container for details
   */
  showImbalanceDetails(imbalancedNodes, detailsContainer) {
    if (!imbalancedNodes || imbalancedNodes.length === 0) {
      detailsContainer.style.display = 'none';
      return;
    }

    // Clear previous details
    detailsContainer.innerHTML = '';

    // Create details list
    const detailsList = document.createElement('ul');
    detailsList.className = 'imbalance-details-list';

    imbalancedNodes.forEach(node => {
      const listItem = document.createElement('li');
      listItem.className = 'imbalance-detail-item';

      const absDiscrepancy = Math.abs(node.difference);
      const direction = node.difference > 0 ? 'more outflow than inflow' : 'more inflow than outflow';
      
      listItem.innerHTML = `
        <strong>${node.name}</strong>: ${direction} by ${absDiscrepancy.toFixed(2)}
        <span class="flow-amounts">(in: ${node.totalIn.toFixed(2)}, out: ${node.totalOut.toFixed(2)})</span>
      `;

      detailsList.appendChild(listItem);
    });

    detailsContainer.appendChild(detailsList);
    detailsContainer.style.display = 'block';
  }

  /**
   * Hide the status bar
   */
  hide() {
    if (this.statusElement) {
      this.statusElement.style.display = 'none';
    }
  }

  /**
   * Show the status bar
   */
  show() {
    if (this.statusElement) {
      this.statusElement.style.display = 'block';
    }
  }

  /**
   * Remove the status bar from the DOM
   */
  destroy() {
    if (this.statusElement && this.statusElement.parentNode) {
      this.statusElement.parentNode.removeChild(this.statusElement);
    }
    this.statusElement = null;
    this.container = null;
    this.initialized = false;
  }
}

// Create default instance for module exports
const validationStatusBar = new ValidationStatusBar();

// Individual functions for convenience
const initializeStatusBar = (container) => validationStatusBar.initialize(container);
const updateValidationStatus = (balanceResult) => validationStatusBar.updateStatus(balanceResult);
const hideStatusBar = () => validationStatusBar.hide();
const showStatusBar = () => validationStatusBar.show();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ValidationStatusBar, 
        validationStatusBar, 
        initializeStatusBar, 
        updateValidationStatus, 
        hideStatusBar, 
        showStatusBar 
    };
}

// Make available globally for compatibility with existing code
if (typeof window !== 'undefined') {
  window.ValidationStatusBar = ValidationStatusBar;
  window.validationStatusBar = validationStatusBar;
  window.initializeStatusBar = initializeStatusBar;
  window.updateValidationStatus = updateValidationStatus;
  window.hideStatusBar = hideStatusBar;
  window.showStatusBar = showStatusBar;
}