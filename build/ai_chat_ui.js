/**
 * @fileoverview AI Chat UI Component
 * Provides chat interface for AI-powered financial data parsing
 * Positioned below Data Editor table for easy access
 */

/**
 * AI Chat UI class manages the chat interface and user interactions
 */
class AIChatUI {
    constructor() {
        /** @type {HTMLElement|null} */
        this.container = null;
        
        /** @type {HTMLElement|null} */
        this.chatInput = null;
        
        /** @type {HTMLElement|null} */
        this.fileInput = null;
        
        /** @type {HTMLElement|null} */
        this.previewContainer = null;
        
        /** @type {HTMLElement|null} */
        this.loadingIndicator = null;
        
        /** @type {HTMLElement|null} */
        this.resultContainer = null;
        
        /** @type {boolean} */
        this.isLoading = false;
        
        /** @type {Blob|null} */
        this.currentImageBlob = null;
        
        /** @type {Function[]} */
        this.imagePasteCallbacks = [];
        
        /** @type {Function[]} */
        this.fileUploadCallbacks = [];
        
        console.log('AIChatUI initialized');
    }

    /**
     * Render the AI chat interface into the specified container
     * @param {HTMLElement} container - Container element to render into
     */
    render(container) {
        if (!container) {
            console.error('Container element is required for AI Chat UI');
            return;
        }

        this.container = container;
        container.innerHTML = '';
        container.className = 'ai-chat-container';

        // Create main chat wrapper
        const chatWrapper = document.createElement('div');
        chatWrapper.className = 'ai-chat-wrapper';

        // Create chat header
        const chatHeader = document.createElement('div');
        chatHeader.className = 'ai-chat-header';
        chatHeader.innerHTML = `
            <h3>AI Assistant</h3>
            <span class="ai-chat-subtitle">Parse financial data from text or images</span>
        `;

        // Create input section
        const inputSection = document.createElement('div');
        inputSection.className = 'ai-chat-input-section';

        // Create text input
        this.chatInput = document.createElement('textarea');
        this.chatInput.className = 'ai-chat-input';
        this.chatInput.placeholder = 'Paste financial data here, or paste/upload an image (Ctrl+V)...';
        this.chatInput.rows = 3;
        this.chatInput.addEventListener('paste', this._handlePaste.bind(this));

        // Create file upload section
        const uploadSection = document.createElement('div');
        uploadSection.className = 'ai-chat-upload-section';

        // Hidden file input
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/png,image/jpg,image/jpeg,application/pdf';
        this.fileInput.style.display = 'none';
        this.fileInput.addEventListener('change', this._handleFileUpload.bind(this));

        // Upload button
        const uploadButton = document.createElement('button');
        uploadButton.type = 'button';
        uploadButton.className = 'ai-chat-upload-button';
        uploadButton.innerHTML = '📎 Upload Image/PDF';
        uploadButton.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Process button
        const processButton = document.createElement('button');
        processButton.type = 'button';
        processButton.className = 'ai-chat-process-button';
        processButton.innerHTML = '🤖 Process with AI';
        processButton.addEventListener('click', this._handleProcess.bind(this));

        uploadSection.appendChild(this.fileInput);
        uploadSection.appendChild(uploadButton);
        uploadSection.appendChild(processButton);

        // Create preview container
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'ai-chat-preview-container';

        // Create loading indicator
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'ai-chat-loading';
        this.loadingIndicator.style.display = 'none';
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Processing with AI...</span>
        `;

        // Create result container
        this.resultContainer = document.createElement('div');
        this.resultContainer.className = 'ai-chat-result-container';

        // Assemble the interface
        inputSection.appendChild(this.chatInput);
        inputSection.appendChild(uploadSection);

        chatWrapper.appendChild(chatHeader);
        chatWrapper.appendChild(inputSection);
        chatWrapper.appendChild(this.previewContainer);
        chatWrapper.appendChild(this.loadingIndicator);
        chatWrapper.appendChild(this.resultContainer);

        container.appendChild(chatWrapper);

        console.log('AI Chat UI rendered');
    }

    /**
     * Handle paste events for image data
     * @private
     * @param {ClipboardEvent} event - Paste event
     */
    _handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Check if it's an image
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const blob = item.getAsFile();
                if (blob) {
                    this._processImageBlob(blob);
                    this._notifyImagePaste(blob);
                }
                break;
            }
        }
    }

    /**
     * Handle file upload
     * @private
     * @param {Event} event - File input change event
     */
    _handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            this.showError('Invalid file type. Please upload PNG, JPG, JPEG, or PDF files only.');
            return;
        }

        // Process the file
        if (file.type.startsWith('image/')) {
            this._processImageBlob(file);
        } else if (file.type === 'application/pdf') {
            this._processPDFFile(file);
        }

        this._notifyFileUpload(file);

        // Reset file input
        event.target.value = '';
    }

    /**
     * Process image blob and create preview
     * @private
     * @param {Blob} blob - Image blob
     */
    _processImageBlob(blob) {
        this.currentImageBlob = blob;
        
        // Create preview thumbnail
        const reader = new FileReader();
        reader.onload = (e) => {
            this._createImagePreview(e.target.result);
        };
        reader.readAsDataURL(blob);
    }

    /**
     * Process PDF file
     * @private
     * @param {File} file - PDF file
     */
    _processPDFFile(file) {
        // For now, just show file info
        // TODO: Implement PDF preview/processing
        this._createFilePreview(file);
    }

    /**
     * Create image preview thumbnail
     * @private
     * @param {string} dataURL - Image data URL
     */
    _createImagePreview(dataURL) {
        this.previewContainer.innerHTML = '';
        
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'preview-wrapper';
        
        const previewImage = document.createElement('img');
        previewImage.src = dataURL;
        previewImage.className = 'preview-thumbnail';
        previewImage.alt = 'Pasted image preview';
        
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'preview-remove-button';
        removeButton.innerHTML = '×';
        removeButton.title = 'Remove image';
        removeButton.addEventListener('click', () => {
            this._clearPreview();
        });
        
        previewWrapper.appendChild(previewImage);
        previewWrapper.appendChild(removeButton);
        this.previewContainer.appendChild(previewWrapper);
        
        console.log('Image preview created');
    }

    /**
     * Create file preview for non-image files
     * @private
     * @param {File} file - File object
     */
    _createFilePreview(file) {
        this.previewContainer.innerHTML = '';
        
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'preview-wrapper file-preview';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';
        fileIcon.innerHTML = '📄';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <div class="file-name">${file.name}</div>
            <div class="file-size">${this._formatFileSize(file.size)}</div>
        `;
        
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'preview-remove-button';
        removeButton.innerHTML = '×';
        removeButton.title = 'Remove file';
        removeButton.addEventListener('click', () => {
            this._clearPreview();
        });
        
        previewWrapper.appendChild(fileIcon);
        previewWrapper.appendChild(fileInfo);
        previewWrapper.appendChild(removeButton);
        this.previewContainer.appendChild(previewWrapper);
        
        console.log('File preview created for:', file.name);
    }

    /**
     * Clear preview container
     * @private
     */
    _clearPreview() {
        this.previewContainer.innerHTML = '';
        this.currentImageBlob = null;
        console.log('Preview cleared');
    }

    /**
     * Format file size for display
     * @private
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Handle process button click
     * @private
     */
    async _handleProcess() {
        const textInput = this.chatInput.value.trim();
        const hasImage = this.currentImageBlob !== null;
        
        if (!textInput && !hasImage) {
            this.showError('Please enter text or upload an image to process.');
            return;
        }
        
        try {
            this.setLoading(true);
            
            // Get AI Service instance
            const aiService = window.aiService;
            if (!aiService || !aiService.isReady()) {
                throw new Error('AI Service is not available or not initialized');
            }
            
            let parsedData;
            
            if (hasImage) {
                // Process image input
                console.log('Processing image with AI Service...');
                parsedData = await aiService.parseFinancialImage(this.currentImageBlob);
            } else {
                // Process text input
                console.log('Processing text with AI Service...');
                parsedData = await aiService.parseFinancialText(textInput);
            }
            
            // Show result with flows
            this.showResult({
                type: 'flows',
                flows: parsedData.flows
            });
            
            // Auto-apply flows to Data Editor via Sync Manager
            const syncManager = window.syncManager;
            if (syncManager) {
                syncManager.syncFromAI(parsedData.flows);
                console.log('Flows synced to Data Editor via Sync Manager');
            } else {
                console.warn('Sync Manager not available - flows not synced to Data Editor');
            }
            
        } catch (error) {
            console.error('Error processing AI request:', error);
            this.showError(`Processing failed: ${error.message}`);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Set loading state
     * @param {boolean} isLoading - Whether to show loading indicator
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }
        
        // Disable/enable process button
        const processButton = this.container?.querySelector('.ai-chat-process-button');
        if (processButton) {
            processButton.disabled = isLoading;
            processButton.innerHTML = isLoading ? '⏳ Processing...' : '🤖 Process with AI';
        }
        
        console.log('Loading state:', isLoading);
    }

    /**
     * Show AI result
     * @param {AIResult} result - AI processing result
     */
    showResult(result) {
        if (!this.resultContainer) return;
        
        this.resultContainer.innerHTML = '';
        
        const resultWrapper = document.createElement('div');
        resultWrapper.className = 'result-wrapper';
        
        if (result.type === 'flows' && result.flows) {
            // Show flows result
            const resultHeader = document.createElement('div');
            resultHeader.className = 'result-header success';
            resultHeader.innerHTML = `✅ Found ${result.flows.length} financial flows`;
            
            const resultContent = document.createElement('div');
            resultContent.className = 'result-content';
            
            const flowsList = document.createElement('ul');
            flowsList.className = 'flows-list';
            
            result.flows.forEach(flow => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `${flow.source} → ${flow.target}: ${flow.amount}`;
                flowsList.appendChild(listItem);
            });
            
            resultContent.appendChild(flowsList);
            
            const applyButton = document.createElement('button');
            applyButton.type = 'button';
            applyButton.className = 'result-apply-button';
            applyButton.innerHTML = '✓ Apply to Data Editor';
            applyButton.addEventListener('click', () => {
                this._applyFlowsToDataEditor(result.flows);
            });
            
            resultWrapper.appendChild(resultHeader);
            resultWrapper.appendChild(resultContent);
            resultWrapper.appendChild(applyButton);
            
        } else if (result.type === 'message' && result.message) {
            // Show message result
            const resultHeader = document.createElement('div');
            resultHeader.className = 'result-header info';
            resultHeader.innerHTML = 'ℹ️ AI Response';
            
            const resultContent = document.createElement('div');
            resultContent.className = 'result-content';
            resultContent.textContent = result.message;
            
            resultWrapper.appendChild(resultHeader);
            resultWrapper.appendChild(resultContent);
        }
        
        this.resultContainer.appendChild(resultWrapper);
        console.log('Result displayed:', result.type);
    }

    /**
     * Show error message
     * @param {string} error - Error message
     */
    showError(error) {
        if (!this.resultContainer) return;
        
        this.resultContainer.innerHTML = '';
        
        const errorWrapper = document.createElement('div');
        errorWrapper.className = 'result-wrapper error';
        
        const errorHeader = document.createElement('div');
        errorHeader.className = 'result-header error';
        errorHeader.innerHTML = '❌ Error';
        
        const errorContent = document.createElement('div');
        errorContent.className = 'result-content';
        errorContent.textContent = error;
        
        errorWrapper.appendChild(errorHeader);
        errorWrapper.appendChild(errorContent);
        this.resultContainer.appendChild(errorWrapper);
        
        console.error('AI Chat UI Error:', error);
    }

    /**
     * Apply flows to Data Editor
     * @private
     * @param {FinancialFlow[]} flows - Financial flows to apply
     */
    _applyFlowsToDataEditor(flows) {
        try {
            const syncManager = window.syncManager;
            if (!syncManager) {
                throw new Error('Sync Manager not available');
            }
            
            console.log('Applying flows to Data Editor via Sync Manager:', flows);
            syncManager.syncFromAI(flows);
            
            // Show success message
            this.showResult({
                type: 'message',
                message: `Successfully applied ${flows.length} flows to Data Editor.`
            });
            
            // Clear inputs after successful application
            this.clearInputs();
            
        } catch (error) {
            console.error('Error applying flows to Data Editor:', error);
            this.showError(`Failed to apply flows: ${error.message}`);
        }
    }

    /**
     * Register callback for image paste events
     * @param {Function} callback - Callback function (imageData: Blob) => void
     */
    onImagePaste(callback) {
        if (typeof callback === 'function') {
            this.imagePasteCallbacks.push(callback);
        }
    }

    /**
     * Register callback for file upload events
     * @param {Function} callback - Callback function (file: File) => void
     */
    onFileUpload(callback) {
        if (typeof callback === 'function') {
            this.fileUploadCallbacks.push(callback);
        }
    }

    /**
     * Notify image paste callbacks
     * @private
     * @param {Blob} imageData - Image blob
     */
    _notifyImagePaste(imageData) {
        this.imagePasteCallbacks.forEach(callback => {
            try {
                callback(imageData);
            } catch (error) {
                console.error('Error in image paste callback:', error);
            }
        });
    }

    /**
     * Notify file upload callbacks
     * @private
     * @param {File} file - Uploaded file
     */
    _notifyFileUpload(file) {
        this.fileUploadCallbacks.forEach(callback => {
            try {
                callback(file);
            } catch (error) {
                console.error('Error in file upload callback:', error);
            }
        });
    }

    /**
     * Get current text input value
     * @returns {string} Current text input
     */
    getTextInput() {
        return this.chatInput ? this.chatInput.value.trim() : '';
    }

    /**
     * Get current image blob
     * @returns {Blob|null} Current image blob or null
     */
    getImageBlob() {
        return this.currentImageBlob;
    }

    /**
     * Clear all inputs and previews
     */
    clearInputs() {
        if (this.chatInput) {
            this.chatInput.value = '';
        }
        this._clearPreview();
        if (this.resultContainer) {
            this.resultContainer.innerHTML = '';
        }
        console.log('Inputs cleared');
    }

    /**
     * Connect to AI Service and Sync Manager
     * @param {AIService} aiService - AI Service instance
     * @param {SyncManager} syncManager - Sync Manager instance
     */
    connectServices(aiService, syncManager) {
        if (aiService) {
            window.aiService = aiService;
            console.log('AI Chat UI connected to AI Service');
        }
        
        if (syncManager) {
            window.syncManager = syncManager;
            console.log('AI Chat UI connected to Sync Manager');
        }
    }

    /**
     * Check if services are connected and ready
     * @returns {boolean} True if both services are available
     */
    areServicesReady() {
        const aiService = window.aiService;
        const syncManager = window.syncManager;
        
        return aiService && aiService.isReady && aiService.isReady() && syncManager;
    }
}

// Create global instance
const aiChatUI = new AIChatUI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIChatUI, aiChatUI };
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.AIChatUI = AIChatUI;
    window.aiChatUI = aiChatUI;
}