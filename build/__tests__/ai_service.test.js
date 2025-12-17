/**
 * @fileoverview Unit tests for AI Service module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIService, DEFAULT_FINANCIAL_PROMPT } from '../ai_service.js';

describe('AI Service', () => {
  let aiService;

  beforeEach(async () => {
    aiService = new AIService();
  });

  describe('Initialization', () => {
    it('should initialize with default system prompt', async () => {
      await aiService.initialize();
      
      expect(aiService.isInitialized).toBe(true);
      expect(aiService.isReady()).toBe(true);
      
      const prompt = aiService.getSystemPrompt();
      expect(prompt).toBeDefined();
      expect(prompt.financialTerms).toHaveLength(51);
      expect(prompt.flowGenerationRules).toHaveLength(10);
    });

    it('should initialize with custom system prompt', async () => {
      const customPrompt = {
        basePrompt: 'Custom prompt',
        financialTerms: ['Revenue', 'Expense'],
        flowGenerationRules: ['Rule 1'],
        outputFormat: 'Custom format'
      };

      await aiService.initialize(customPrompt);
      
      const prompt = aiService.getSystemPrompt();
      expect(prompt.basePrompt).toBe('Custom prompt');
      expect(prompt.financialTerms).toHaveLength(2);
      expect(prompt.flowGenerationRules).toHaveLength(1);
    });

    it('should throw error when accessing methods before initialization', () => {
      expect(() => aiService.getSystemPrompt()).toThrow('AI Service not initialized');
      expect(() => aiService.setContext([])).toThrow('AI Service not initialized');
    });
  });

  describe('Context Management', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should set and get context flows', () => {
      const flows = [
        { id: '1', source: 'A', target: 'B', amount: 100, isValid: true, errors: [] }
      ];

      aiService.setContext(flows);
      expect(aiService.getContext()).toEqual(flows);
    });

    it('should handle empty context', () => {
      aiService.setContext([]);
      expect(aiService.getContext()).toEqual([]);
    });

    it('should handle null context', () => {
      aiService.setContext(null);
      expect(aiService.getContext()).toEqual([]);
    });
  });

  describe('Text Parsing', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should parse financial text successfully', async () => {
      const result = await aiService.parseFinancialText('Revenue: $1M, COGS: $600K');
      
      expect(result).toBeDefined();
      expect(result.flows).toBeInstanceOf(Array);
      expect(result.flows.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.suggestedColors).toBeInstanceOf(Map);
    });

    it('should throw error for empty text input', async () => {
      await expect(aiService.parseFinancialText('')).rejects.toThrow('Invalid input');
      await expect(aiService.parseFinancialText('   ')).rejects.toThrow('Invalid input');
      await expect(aiService.parseFinancialText(null)).rejects.toThrow('Invalid input');
    });

    it('should throw error when not ready', async () => {
      const uninitializedService = new AIService();
      await expect(uninitializedService.parseFinancialText('test')).rejects.toThrow('AI Service not ready');
    });
  });

  describe('Image Parsing', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should parse image blob successfully', async () => {
      const mockBlob = new Blob(['fake image data'], { type: 'image/png' });
      
      const result = await aiService.parseFinancialImage(mockBlob);
      
      expect(result).toBeDefined();
      expect(result.flows).toBeInstanceOf(Array);
      expect(result.flows.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.extractionMethod).toBe('ocr_vision');
    });

    it('should parse base64 image successfully', async () => {
      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const result = await aiService.parseFinancialImage(base64Image);
      
      expect(result).toBeDefined();
      expect(result.flows).toBeInstanceOf(Array);
    });

    it('should reject unsupported file types', async () => {
      const invalidBlob = new Blob(['text data'], { type: 'text/plain' });
      
      await expect(aiService.parseFinancialImage(invalidBlob)).rejects.toThrow('Unsupported file type');
    });

    it('should reject oversized files', async () => {
      // Create a mock blob that reports large size
      const largeBlob = new Blob(['data'], { type: 'image/png' });
      Object.defineProperty(largeBlob, 'size', { value: 11 * 1024 * 1024 }); // 11MB
      
      await expect(aiService.parseFinancialImage(largeBlob)).rejects.toThrow('File size too large');
    });

    it('should throw error for invalid input', async () => {
      await expect(aiService.parseFinancialImage(null)).rejects.toThrow('Invalid input');
      await expect(aiService.parseFinancialImage(123)).rejects.toThrow('Invalid image data type');
    });
  });

  describe('DSL Generation', () => {
    beforeEach(async () => {
      await aiService.initialize();
    });

    it('should generate DSL from parsed data', () => {
      const parsedData = {
        flows: [
          { source: 'Revenue', target: 'Profit', amount: 1000, category: 'revenue' },
          { source: 'Revenue', target: 'Expenses', amount: 600, category: 'expense' }
        ],
        metadata: {
          documentType: 'income_statement',
          period: '2024'
        },
        suggestedColors: new Map([
          ['Revenue', '#888888'],
          ['Profit', '#00AA00'],
          ['Expenses', '#E15549']
        ])
      };

      const dslText = aiService.generateDSL(parsedData);
      
      expect(dslText).toContain('// Generated by AI Service');
      expect(dslText).toContain('// Document Type: INCOME STATEMENT');
      expect(dslText).toContain('// Period: 2024');
      expect(dslText).toContain('Revenue #888888');
      expect(dslText).toContain('Profit #00AA00');
      expect(dslText).toContain('Expenses #E15549');
      expect(dslText).toContain('Revenue [1.0K] Profit');
      expect(dslText).toContain('Revenue [600] Expenses');
    });

    it('should handle flows with comparison data', () => {
      const parsedData = {
        flows: [
          { source: 'Revenue', target: 'Profit', amount: 1000, comparisonAmount: 800, category: 'revenue' }
        ],
        metadata: { documentType: 'custom', period: '2024' },
        suggestedColors: new Map()
      };

      const dslText = aiService.generateDSL(parsedData);
      
      expect(dslText).toContain('Revenue [1.0K|800] Profit');
    });

    it('should handle empty flows', () => {
      const parsedData = {
        flows: [],
        metadata: {},
        suggestedColors: new Map()
      };

      const dslText = aiService.generateDSL(parsedData);
      
      expect(dslText).toBe('// No flows to generate\n');
    });

    it('should throw error for invalid input', () => {
      expect(() => aiService.generateDSL(null)).toThrow('Invalid input');
      expect(() => aiService.generateDSL({})).toThrow('Invalid input');
      expect(() => aiService.generateDSL({ flows: 'not an array' })).toThrow('Invalid input');
    });

    it('should format amounts correctly', () => {
      const parsedData = {
        flows: [
          { source: 'A', target: 'B', amount: 1500000000, category: 'revenue' }, // 1.5B
          { source: 'C', target: 'D', amount: 2500000, category: 'revenue' },    // 2.5M
          { source: 'E', target: 'F', amount: 3500, category: 'revenue' },       // 3.5K
          { source: 'G', target: 'H', amount: 500, category: 'revenue' }         // 500
        ],
        metadata: {},
        suggestedColors: new Map()
      };

      const dslText = aiService.generateDSL(parsedData);
      
      expect(dslText).toContain('[1.5B]');
      expect(dslText).toContain('[2.5M]');
      expect(dslText).toContain('[3.5K]');
      expect(dslText).toContain('[500]');
    });
  });

  describe('Connection Status', () => {
    it('should return not connected status before initialization', () => {
      const status = aiService.getConnectionStatus();
      
      expect(status.isConnected).toBe(false);
      expect(status.status).toBe('not_initialized');
    });

    it('should return ready status after initialization', async () => {
      await aiService.initialize();
      
      const status = aiService.getConnectionStatus();
      
      expect(status.isConnected).toBe(true);
      expect(status.status).toBe('ready');
      expect(status.endpoint).toBeDefined();
      expect(status.lastPing).toBeDefined();
    });
  });
});