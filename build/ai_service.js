/**
 * @fileoverview AI Service Module for Financial Data Processing
 * Handles AI-related operations including image processing, text parsing, and financial data interpretation.
 */

/**
 * Default system prompt configuration for financial data interpretation
 * @type {SystemPromptConfig}
 */
const DEFAULT_FINANCIAL_PROMPT = {
  basePrompt: `You are a financial data parsing assistant for Sankey diagram generation.
Your role is to interpret financial statements and convert them into flow data.
Focus on creating clear, balanced flows that represent money movement between categories.`,
  
  financialTerms: [
    'Revenue', 'Sales', 'Income', 'Total Revenue', 'Net Sales',
    'COGS', 'Cost of Revenue', 'Cost of Goods Sold', 'Cost of Sales',
    'Gross Profit', 'Gross Income', 'Gross Margin',
    'Operating Expenses', 'OPEX', 'SG&A', 'Sales and Marketing',
    'Research and Development', 'R&D', 'General and Administrative',
    'Operating Income', 'Operating Profit', 'EBIT', 'EBITDA',
    'Interest Income', 'Interest Expense', 'Other Income', 'Other Expenses',
    'Tax', 'Income Tax', 'Tax Expense', 'Provision for Income Tax',
    'Net Income', 'Net Profit', 'Net Earnings', 'Bottom Line',
    'Assets', 'Current Assets', 'Non-Current Assets', 'Fixed Assets',
    'Liabilities', 'Current Liabilities', 'Long-term Liabilities',
    'Equity', 'Shareholders Equity', 'Retained Earnings',
    'Cash Flow', 'Operating Cash Flow', 'Free Cash Flow',
    'Depreciation', 'Amortization', 'Impairment'
  ],
  
  flowGenerationRules: [
    'Revenue sources flow INTO a Revenue aggregation node',
    'Revenue flows to Gross Profit and Cost of Revenue (COGS)',
    'Gross Profit flows to Operating Profit and Operating Expenses',
    'Operating Profit flows to Net Profit, Interest, and Tax expenses',
    'Ensure all intermediate nodes balance (total inputs = total outputs)',
    'Use semantic colors: green for profits/retained value, red for costs/outflows, grey for neutral inputs',
    'Include YoY growth percentages when comparison data is available',
    'Create hierarchical relationships matching standard financial statement structures',
    'Aggregate similar expense categories for clarity',
    'Separate one-time items from recurring operations when significant'
  ],
  
  outputFormat: `Output flows in this exact DSL format:
Source [Amount] Target

For flows with comparison data, use:
Source [Current|Comparison] Target

Examples:
Revenue [1000000] Gross Profit
Revenue [1000000] COGS
Gross Profit [400000] Operating Profit
Gross Profit [400000] Operating Expenses

Include color specifications when semantically appropriate:
Revenue [1000000] Gross Profit #888888
COGS [600000] #E15549
Operating Profit [200000] Net Profit #00AA00`
};

/**
 * AI Service class for handling financial data processing
 */
class AIService {
  constructor() {
    /** @type {SystemPromptConfig} */
    this.systemPrompt = null;
    
    /** @type {FlowRow[]} */
    this.currentContext = [];
    
    /** @type {boolean} */
    this.isInitialized = false;
    
    /** @type {Object|null} */
    this.apiConnection = null;
    
    /** @type {string} */
    this.apiEndpoint = null;
  }

  /**
   * Initialize the AI service with system prompt configuration
   * @param {SystemPromptConfig} [customPrompt] - Optional custom system prompt, uses default if not provided
   * @param {Object} [apiConfig] - Optional API configuration for AI service connection
   * @returns {Promise<void>}
   */
  async initialize(customPrompt = null, apiConfig = null) {
    try {
      // Load system prompt configuration
      this.systemPrompt = customPrompt || DEFAULT_FINANCIAL_PROMPT;
      
      // Set up API connection (placeholder for actual AI integration)
      await this._initializeAPIConnection(apiConfig);
      
      this.isInitialized = true;
      console.log('AI Service initialized successfully');
      console.log('- System prompt loaded with', this.systemPrompt.financialTerms.length, 'financial terms');
      console.log('- Flow generation rules:', this.systemPrompt.flowGenerationRules.length, 'rules loaded');
      
    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      this.isInitialized = false;
      throw new Error(`AI Service initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize API connection (placeholder for actual AI integration)
   * @private
   * @param {Object} [apiConfig] - API configuration
   * @returns {Promise<void>}
   */
  async _initializeAPIConnection(apiConfig = null) {
    // Placeholder for actual AI API integration
    // In a real implementation, this would:
    // - Set up authentication tokens
    // - Validate API endpoints
    // - Test connection
    // - Configure request parameters
    
    const defaultConfig = {
      endpoint: 'https://api.placeholder.ai/v1/chat',
      timeout: 30000,
      maxRetries: 3,
      model: 'gpt-4-vision-preview' // For image processing capability
    };
    
    this.apiConnection = {
      ...defaultConfig,
      ...apiConfig,
      isConnected: true, // Placeholder - would be actual connection status
      lastPing: new Date().toISOString()
    };
    
    this.apiEndpoint = this.apiConnection.endpoint;
    
    console.log('API connection initialized (placeholder):', this.apiEndpoint);
  }

  /**
   * Check if the AI service is ready for processing
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.apiConnection && this.apiConnection.isConnected;
  }

  /**
   * Get API connection status
   * @returns {Object}
   */
  getConnectionStatus() {
    if (!this.apiConnection) {
      return { isConnected: false, status: 'not_initialized' };
    }
    
    return {
      isConnected: this.apiConnection.isConnected,
      endpoint: this.apiConnection.endpoint,
      lastPing: this.apiConnection.lastPing,
      status: this.isInitialized ? 'ready' : 'initializing'
    };
  }

  /**
   * Get the current system prompt configuration
   * @returns {SystemPromptConfig}
   */
  getSystemPrompt() {
    if (!this.isInitialized) {
      throw new Error('AI Service not initialized. Call initialize() first.');
    }
    return this.systemPrompt;
  }

  /**
   * Update the system prompt configuration
   * @param {SystemPromptConfig} newPrompt - New system prompt configuration
   */
  updateSystemPrompt(newPrompt) {
    if (!this.isInitialized) {
      throw new Error('AI Service not initialized. Call initialize() first.');
    }
    this.systemPrompt = newPrompt;
    console.log('System prompt updated');
  }

  /**
   * Set current context from Data Editor for AI processing
   * @param {FlowRow[]} flows - Current flow data from Data Editor
   */
  setContext(flows) {
    if (!this.isInitialized) {
      throw new Error('AI Service not initialized. Call initialize() first.');
    }
    this.currentContext = flows || [];
  }

  /**
   * Get current context flows
   * @returns {FlowRow[]}
   */
  getContext() {
    return this.currentContext;
  }

  /**
   * Parse financial text input and return structured financial data
   * @param {string} text - Input text containing financial data
   * @returns {Promise<ParsedFinancialData>}
   */
  async parseFinancialText(text) {
    if (!this.isReady()) {
      throw new Error('AI Service not ready. Ensure initialize() completed successfully.');
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    try {
      console.log('Parsing financial text input...');
      
      // Apply system prompt context for processing
      const contextualPrompt = this._buildContextualPrompt(text);
      
      // Placeholder for actual AI API call
      const aiResponse = await this._callAIAPI(contextualPrompt, 'text');
      
      // Parse and validate the AI response
      const parsedData = this._parseAIResponse(aiResponse);
      
      console.log('Successfully parsed financial text:', parsedData.flows.length, 'flows extracted');
      return parsedData;
      
    } catch (error) {
      console.error('Error parsing financial text:', error);
      throw new Error(`Failed to parse financial text: ${error.message}`);
    }
  }

  /**
   * Build contextual prompt by combining system prompt with user input
   * @private
   * @param {string} userInput - User's input text
   * @returns {string}
   */
  _buildContextualPrompt(userInput) {
    const { basePrompt, financialTerms, flowGenerationRules, outputFormat } = this.systemPrompt;
    
    // Include current context if available
    let contextInfo = '';
    if (this.currentContext.length > 0) {
      contextInfo = `\n\nCurrent diagram context (existing flows):\n${
        this.currentContext.map(flow => `${flow.source} [${flow.amount}] ${flow.target}`).join('\n')
      }`;
    }
    
    return `${basePrompt}

FINANCIAL TERMS TO RECOGNIZE:
${financialTerms.join(', ')}

FLOW GENERATION RULES:
${flowGenerationRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

OUTPUT FORMAT:
${outputFormat}

${contextInfo}

USER INPUT TO PARSE:
${userInput}

Please analyze the financial data and convert it to Sankey diagram flows following the rules above.`;
  }

  /**
   * Make API call to AI service (placeholder implementation)
   * @private
   * @param {string} prompt - Contextual prompt to send
   * @param {'text'|'image'} inputType - Type of input being processed
   * @returns {Promise<Object>}
   */
  async _callAIAPI(prompt, inputType) {
    // Placeholder for actual AI API integration
    // In a real implementation, this would make HTTP requests to AI service
    
    console.log(`Making AI API call for ${inputType} processing...`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response based on input type
    if (inputType === 'text') {
      return this._generateMockTextResponse(prompt);
    } else if (inputType === 'image') {
      return this._generateMockImageResponse();
    }
    
    throw new Error('Unsupported input type');
  }

  /**
   * Generate mock response for text parsing (placeholder)
   * @private
   * @param {string} prompt - Input prompt
   * @returns {Object}
   */
  _generateMockTextResponse(prompt) {
    // This is a placeholder that would be replaced with actual AI API response
    // For now, return a simple mock response for testing
    
    return {
      flows: [
        { source: 'Revenue', target: 'Gross Profit', amount: 1000000, category: 'revenue' },
        { source: 'Revenue', target: 'COGS', amount: 600000, category: 'expense' },
        { source: 'Gross Profit', target: 'Operating Profit', amount: 200000, category: 'profit' },
        { source: 'Gross Profit', target: 'Operating Expenses', amount: 200000, category: 'expense' },
        { source: 'Operating Profit', target: 'Net Profit', amount: 150000, category: 'profit' },
        { source: 'Operating Profit', target: 'Tax', amount: 50000, category: 'expense' }
      ],
      metadata: {
        documentType: 'income_statement',
        period: '2024',
        confidence: 0.85
      }
    };
  }

  /**
   * Parse AI response into structured ParsedFinancialData
   * @private
   * @param {Object} aiResponse - Raw response from AI API
   * @returns {ParsedFinancialData}
   */
  _parseAIResponse(aiResponse) {
    if (!aiResponse || !aiResponse.flows) {
      throw new Error('Invalid AI response: missing flows data');
    }

    // Convert AI response to ParsedFinancialData format
    const flows = aiResponse.flows.map((flow, index) => ({
      source: flow.source || `Unknown_${index}`,
      target: flow.target || `Unknown_${index}`,
      amount: typeof flow.amount === 'number' ? flow.amount : parseFloat(flow.amount) || 0,
      comparisonAmount: flow.comparisonAmount || undefined,
      category: flow.category || 'revenue',
      color: flow.color || undefined
    }));

    // Generate suggested colors based on categories
    const suggestedColors = new Map();
    flows.forEach(flow => {
      if (!suggestedColors.has(flow.source)) {
        suggestedColors.set(flow.source, this._getSemanticColor(flow.category));
      }
      if (!suggestedColors.has(flow.target)) {
        suggestedColors.set(flow.target, this._getSemanticColor(flow.category));
      }
    });

    return {
      flows,
      metadata: {
        documentType: aiResponse.metadata?.documentType || 'custom',
        period: aiResponse.metadata?.period || new Date().getFullYear().toString(),
        comparisonPeriod: aiResponse.metadata?.comparisonPeriod || undefined,
        extractionMethod: aiResponse.metadata?.extractionMethod || undefined,
        confidence: aiResponse.metadata?.confidence || undefined
      },
      suggestedColors
    };
  }

  /**
   * Parse financial image input and return structured financial data
   * @param {Blob|string} imageData - Image blob or base64 string containing financial data
   * @returns {Promise<ParsedFinancialData>}
   */
  async parseFinancialImage(imageData) {
    if (!this.isReady()) {
      throw new Error('AI Service not ready. Ensure initialize() completed successfully.');
    }

    if (!imageData) {
      throw new Error('Invalid input: imageData is required');
    }

    try {
      console.log('Parsing financial image input...');
      
      // Convert image data to appropriate format for AI processing
      const processedImageData = await this._processImageData(imageData);
      
      // Build contextual prompt for image analysis
      const contextualPrompt = this._buildImageAnalysisPrompt();
      
      // Placeholder for actual AI API call with image
      const aiResponse = await this._callAIAPIWithImage(contextualPrompt, processedImageData);
      
      // Parse and validate the AI response
      const parsedData = this._parseAIResponse(aiResponse);
      
      console.log('Successfully parsed financial image:', parsedData.flows.length, 'flows extracted');
      return parsedData;
      
    } catch (error) {
      console.error('Error parsing financial image:', error);
      throw new Error(`Failed to parse financial image: ${error.message}`);
    }
  }

  /**
   * Process image data for AI analysis
   * @private
   * @param {Blob|string} imageData - Raw image data
   * @returns {Promise<Object>}
   */
  async _processImageData(imageData) {
    let processedData = {
      type: null,
      data: null,
      size: 0,
      format: null
    };

    if (imageData instanceof Blob) {
      // Handle Blob input
      processedData.type = 'blob';
      processedData.data = imageData;
      processedData.size = imageData.size;
      processedData.format = imageData.type;
      
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(imageData.type)) {
        throw new Error(`Unsupported file type: ${imageData.type}. Supported types: PNG, JPG, JPEG, PDF`);
      }
      
      // Check file size (limit to 10MB)
      if (imageData.size > 10 * 1024 * 1024) {
        throw new Error('File size too large. Maximum size is 10MB.');
      }
      
    } else if (typeof imageData === 'string') {
      // Handle base64 string input
      processedData.type = 'base64';
      processedData.data = imageData;
      processedData.size = imageData.length;
      
      // Basic validation for base64 format
      if (!imageData.startsWith('data:image/') && !imageData.startsWith('data:application/pdf')) {
        throw new Error('Invalid base64 image data format');
      }
      
    } else {
      throw new Error('Invalid image data type. Expected Blob or base64 string.');
    }

    console.log(`Processed image data: ${processedData.format || 'base64'}, size: ${processedData.size} bytes`);
    return processedData;
  }

  /**
   * Build contextual prompt for image analysis
   * @private
   * @returns {string}
   */
  _buildImageAnalysisPrompt() {
    const { basePrompt, financialTerms, flowGenerationRules, outputFormat } = this.systemPrompt;
    
    // Include current context if available
    let contextInfo = '';
    if (this.currentContext.length > 0) {
      contextInfo = `\n\nCurrent diagram context (existing flows):\n${
        this.currentContext.map(flow => `${flow.source} [${flow.amount}] ${flow.target}`).join('\n')
      }`;
    }
    
    return `${basePrompt}

You are analyzing an image containing financial data. Please extract all numerical values and text labels.

FINANCIAL TERMS TO RECOGNIZE:
${financialTerms.join(', ')}

FLOW GENERATION RULES:
${flowGenerationRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

OUTPUT FORMAT:
${outputFormat}

IMAGE ANALYSIS INSTRUCTIONS:
1. Use OCR to extract all text and numbers from the image
2. Identify financial statement structure (Income Statement, Balance Sheet, Cash Flow)
3. Recognize table headers, row labels, and numerical values
4. Handle different currencies and number formats (commas, parentheses for negatives)
5. Preserve hierarchical relationships shown in the document
6. Extract comparison periods if present (YoY data)

${contextInfo}

Please analyze the provided image and convert the financial data to Sankey diagram flows.`;
  }

  /**
   * Make API call to AI service with image data (placeholder implementation)
   * @private
   * @param {string} prompt - Contextual prompt for image analysis
   * @param {Object} imageData - Processed image data
   * @returns {Promise<Object>}
   */
  async _callAIAPIWithImage(prompt, imageData) {
    // Placeholder for actual AI API integration with vision capabilities
    // In a real implementation, this would:
    // - Convert image to appropriate format for AI service
    // - Make HTTP request with multipart/form-data or base64 encoding
    // - Handle OCR and vision processing
    // - Return structured financial data
    
    console.log('Making AI API call for image processing...');
    console.log('Image format:', imageData.format || 'base64');
    console.log('Image size:', imageData.size, 'bytes');
    
    // Simulate API delay for image processing (longer than text)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock response for image processing
    return this._generateMockImageResponse();
  }

  /**
   * Generate mock response for image parsing (placeholder)
   * @private
   * @returns {Object}
   */
  _generateMockImageResponse() {
    // This is a placeholder that would be replaced with actual AI vision API response
    // Mock response simulating extraction from a financial statement image
    
    return {
      flows: [
        { source: 'Total Revenue', target: 'Gross Profit', amount: 2500000, category: 'revenue' },
        { source: 'Total Revenue', target: 'Cost of Revenue', amount: 1500000, category: 'expense' },
        { source: 'Gross Profit', target: 'Operating Income', amount: 600000, category: 'profit' },
        { source: 'Gross Profit', target: 'Operating Expenses', amount: 400000, category: 'expense' },
        { source: 'Operating Income', target: 'Net Income', amount: 450000, category: 'profit' },
        { source: 'Operating Income', target: 'Interest & Tax', amount: 150000, category: 'expense' }
      ],
      metadata: {
        documentType: 'income_statement',
        period: '2024',
        comparisonPeriod: '2023',
        confidence: 0.92,
        extractionMethod: 'ocr_vision'
      }
    };
  }

  /**
   * Generate DSL text from parsed financial data
   * @param {ParsedFinancialData} data - Parsed financial data to convert
   * @returns {string} - Valid DSL text representation
   */
  generateDSL(data) {
    if (!data || !data.flows || !Array.isArray(data.flows)) {
      throw new Error('Invalid input: data must contain flows array');
    }

    if (data.flows.length === 0) {
      return '// No flows to generate\n';
    }

    try {
      console.log('Generating DSL from parsed data...');
      
      // Build DSL header with metadata
      let dslText = this._generateDSLHeader(data.metadata);
      
      // Generate node definitions with colors
      dslText += this._generateNodeDefinitions(data.flows, data.suggestedColors);
      
      // Generate flow definitions
      dslText += this._generateFlowDefinitions(data.flows);
      
      console.log('Successfully generated DSL:', data.flows.length, 'flows');
      return dslText;
      
    } catch (error) {
      console.error('Error generating DSL:', error);
      throw new Error(`Failed to generate DSL: ${error.message}`);
    }
  }

  /**
   * Generate DSL header with metadata comments
   * @private
   * @param {Object} metadata - Document metadata
   * @returns {string}
   */
  _generateDSLHeader(metadata) {
    const timestamp = new Date().toISOString().split('T')[0];
    
    let header = `// Generated by AI Service on ${timestamp}\n`;
    
    if (metadata) {
      if (metadata.documentType) {
        header += `// Document Type: ${metadata.documentType.replace('_', ' ').toUpperCase()}\n`;
      }
      if (metadata.period) {
        header += `// Period: ${metadata.period}\n`;
      }
      if (metadata.comparisonPeriod) {
        header += `// Comparison Period: ${metadata.comparisonPeriod}\n`;
      }
    }
    
    header += '\n';
    return header;
  }

  /**
   * Generate node definitions with semantic colors
   * @private
   * @param {FinancialFlow[]} flows - Array of financial flows
   * @param {Map<string, string>} suggestedColors - Map of node names to colors
   * @returns {string}
   */
  _generateNodeDefinitions(flows, suggestedColors) {
    if (!suggestedColors || suggestedColors.size === 0) {
      return '';
    }

    // Collect all unique nodes
    const nodes = new Set();
    flows.forEach(flow => {
      nodes.add(flow.source);
      nodes.add(flow.target);
    });

    let nodeDefinitions = '// Node color definitions\n';
    
    // Sort nodes for consistent output
    const sortedNodes = Array.from(nodes).sort();
    
    sortedNodes.forEach(nodeName => {
      const color = suggestedColors.get(nodeName);
      if (color) {
        // Apply semantic coloring based on financial categories
        const category = this._inferNodeCategory(nodeName, flows);
        const semanticColor = this._getSemanticColor(category);
        nodeDefinitions += `${nodeName} ${semanticColor}\n`;
      }
    });
    
    nodeDefinitions += '\n';
    return nodeDefinitions;
  }

  /**
   * Generate flow definitions in DSL format
   * @private
   * @param {FinancialFlow[]} flows - Array of financial flows
   * @returns {string}
   */
  _generateFlowDefinitions(flows) {
    let flowDefinitions = '// Flow definitions\n';
    
    flows.forEach(flow => {
      const amount = this._formatAmount(flow.amount);
      
      if (flow.comparisonAmount !== undefined) {
        // Include comparison data for YoY analysis
        const comparisonAmount = this._formatAmount(flow.comparisonAmount);
        flowDefinitions += `${flow.source} [${amount}|${comparisonAmount}] ${flow.target}\n`;
      } else {
        // Standard flow without comparison
        flowDefinitions += `${flow.source} [${amount}] ${flow.target}\n`;
      }
    });
    
    return flowDefinitions;
  }

  /**
   * Format amount for DSL output
   * @private
   * @param {number} amount - Numeric amount
   * @returns {string}
   */
  _formatAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0';
    }
    
    // Format large numbers with appropriate scale
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(1) + 'B';
    } else if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    } else {
      return amount.toString();
    }
  }

  /**
   * Infer node category based on name and flow context
   * @private
   * @param {string} nodeName - Name of the node
   * @param {FinancialFlow[]} flows - All flows for context
   * @returns {FinancialCategory}
   */
  _inferNodeCategory(nodeName, flows) {
    const lowerName = nodeName.toLowerCase();
    
    // Revenue indicators
    if (lowerName.includes('revenue') || lowerName.includes('sales') || 
        lowerName.includes('income') && !lowerName.includes('net')) {
      return 'revenue';
    }
    
    // Expense indicators
    if (lowerName.includes('cost') || lowerName.includes('expense') || 
        lowerName.includes('cogs') || lowerName.includes('opex') ||
        lowerName.includes('tax') || lowerName.includes('interest')) {
      return 'expense';
    }
    
    // Profit indicators
    if (lowerName.includes('profit') || lowerName.includes('net income') ||
        lowerName.includes('earnings') || lowerName.includes('ebit')) {
      return 'profit';
    }
    
    // Asset indicators
    if (lowerName.includes('asset') || lowerName.includes('cash') ||
        lowerName.includes('inventory') || lowerName.includes('receivable')) {
      return 'asset';
    }
    
    // Liability indicators
    if (lowerName.includes('liability') || lowerName.includes('debt') ||
        lowerName.includes('payable') || lowerName.includes('loan')) {
      return 'liability';
    }
    
    // Default to revenue for unknown categories
    return 'revenue';
  }

  /**
   * Get semantic color for financial category
   * @private
   * @param {FinancialCategory} category - Financial category
   * @returns {string}
   */
  _getSemanticColor(category) {
    const colorMap = {
      revenue: '#888888',    // Grey - neutral inputs
      expense: '#E15549',    // Red - outflows
      asset: '#888888',      // Grey - neutral
      liability: '#E15549',  // Red - outflows
      profit: '#00AA00'      // Green - retained value
    };
    
    return colorMap[category] || '#888888';
  }
}

// Create global instance
const aiService = new AIService();

// Export the class and default configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIService, DEFAULT_FINANCIAL_PROMPT, aiService };
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.AIService = AIService;
    window.DEFAULT_FINANCIAL_PROMPT = DEFAULT_FINANCIAL_PROMPT;
    window.aiService = aiService;
}