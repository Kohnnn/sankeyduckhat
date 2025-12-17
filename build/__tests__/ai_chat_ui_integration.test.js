/**
 * AI Chat UI Integration Tests
 * Basic integration tests to verify AI Chat UI functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM environment
const mockDocument = {
  createElement: vi.fn((tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    addEventListener: vi.fn(),
    appendChild: vi.fn(),
    setAttribute: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => [])
  })),
  getElementById: vi.fn(() => null),
  readyState: 'complete'
};

const mockWindow = {
  document: mockDocument
};

// Set up global mocks
global.document = mockDocument;
global.window = mockWindow;

// Import the module after setting up mocks
const { AIChatUI } = await import('../ai_chat_ui.js');

describe('AI Chat UI Integration', () => {
  let aiChatUI;
  let mockContainer;

  beforeEach(() => {
    aiChatUI = new AIChatUI();
    mockContainer = {
      innerHTML: '',
      className: '',
      appendChild: vi.fn(),
      querySelector: vi.fn(() => null)
    };
    
    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    expect(aiChatUI.container).toBeNull();
    expect(aiChatUI.isLoading).toBe(false);
    expect(aiChatUI.currentImageBlob).toBeNull();
    expect(aiChatUI.imagePasteCallbacks).toEqual([]);
    expect(aiChatUI.fileUploadCallbacks).toEqual([]);
  });

  it('should render chat interface with all required elements', () => {
    aiChatUI.render(mockContainer);
    
    expect(mockContainer.className).toBe('ai-chat-container');
    expect(mockContainer.appendChild).toHaveBeenCalled();
    expect(aiChatUI.container).toBe(mockContainer);
  });

  it('should handle loading state correctly', () => {
    aiChatUI.render(mockContainer);
    
    // Test setting loading to true
    aiChatUI.setLoading(true);
    expect(aiChatUI.isLoading).toBe(true);
    
    // Test setting loading to false
    aiChatUI.setLoading(false);
    expect(aiChatUI.isLoading).toBe(false);
  });

  it('should register and notify image paste callbacks', () => {
    const mockCallback = vi.fn();
    const mockImageBlob = new Blob(['test'], { type: 'image/png' });
    
    aiChatUI.onImagePaste(mockCallback);
    expect(aiChatUI.imagePasteCallbacks).toContain(mockCallback);
    
    // Simulate image paste notification
    aiChatUI._notifyImagePaste(mockImageBlob);
    expect(mockCallback).toHaveBeenCalledWith(mockImageBlob);
  });

  it('should register and notify file upload callbacks', () => {
    const mockCallback = vi.fn();
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    aiChatUI.onFileUpload(mockCallback);
    expect(aiChatUI.fileUploadCallbacks).toContain(mockCallback);
    
    // Simulate file upload notification
    aiChatUI._notifyFileUpload(mockFile);
    expect(mockCallback).toHaveBeenCalledWith(mockFile);
  });

  it('should show error messages correctly', () => {
    aiChatUI.render(mockContainer);
    
    const errorMessage = 'Test error message';
    aiChatUI.showError(errorMessage);
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('AI Chat UI Error:', errorMessage);
  });

  it('should show result messages correctly', () => {
    aiChatUI.render(mockContainer);
    
    const result = {
      type: 'message',
      message: 'Test result message'
    };
    
    aiChatUI.showResult(result);
    // Should not throw any errors
  });

  it('should show flow results correctly', () => {
    aiChatUI.render(mockContainer);
    
    const result = {
      type: 'flows',
      flows: [
        { source: 'A', target: 'B', amount: '100' },
        { source: 'B', target: 'C', amount: '50' }
      ]
    };
    
    aiChatUI.showResult(result);
    // Should not throw any errors
  });

  it('should clear inputs correctly', () => {
    aiChatUI.render(mockContainer);
    
    // Set some state
    aiChatUI.currentImageBlob = new Blob(['test'], { type: 'image/png' });
    
    aiChatUI.clearInputs();
    
    expect(aiChatUI.currentImageBlob).toBeNull();
  });

  it('should format file sizes correctly', () => {
    const testCases = [
      [0, '0 Bytes'],
      [1024, '1 KB'],
      [1048576, '1 MB'],
      [1073741824, '1 GB']
    ];
    
    testCases.forEach(([bytes, expected]) => {
      const result = aiChatUI._formatFileSize(bytes);
      expect(result).toBe(expected);
    });
  });
});