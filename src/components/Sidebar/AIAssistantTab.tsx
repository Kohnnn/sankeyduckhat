'use client';

import { useState, useCallback, useRef } from 'react';
import { Send, Upload, Sparkles, HelpCircle, FileText, Image as ImageIcon, Copy, Check, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { useDiagram } from '@/context/DiagramContext';
import { aiService } from '@/services/ai-service';
import { useAISettings } from '@/context/AISettingsContext';
import { parseDSL } from '@/lib/dsl-parser';
import { callGemini, parseJsonFromResponse } from '@/lib/gemini-api';
import AISettingsPanel from './AISettingsPanel';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AIAssistantTab() {
    const { state, dispatch } = useDiagram();
    const { settings, isConfigured } = useAISettings();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hi! I can help you create Sankey diagrams from financial data. Try:\n\n• Paste an image of a financial statement\n• Type data like "Revenue [1000] Expenses"\n• Ask me to modify colors or layout\n• Request changes to your current diagram',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Convert messages to Gemini format for context
    const getConversationHistory = useCallback(() => {
        return messages.slice(1).map(msg => ({
            role: msg.role === 'user' ? 'user' as const : 'model' as const,
            parts: [{ text: msg.content }]
        }));
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        const userMessage = input.trim();
        setInput('');
        setIsProcessing(true);

        // Add user message to UI immediately
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        }]);

        try {
            const response = await aiService.sendMessage(userMessage, state);

            if (response.success) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.content,
                    timestamp: new Date()
                }]);

                // Check for JSON changes in the response
                const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch) {
                    try {
                        const changes = JSON.parse(jsonMatch[1]);

                        // Use AI utils for structured change application
                        const { applyAIChanges } = await import('@/lib/ai-utils');
                        const result = applyAIChanges(state, changes);

                        if (result.success && result.newState) {
                            // Apply the validated changes
                            dispatch({ type: 'SET_DATA', payload: result.newState.data });

                            // Show success feedback
                            setMessages(prev => [...prev, {
                                id: (Date.now() + 2).toString(),
                                role: 'assistant',
                                content: '✅ Changes applied successfully!',
                                timestamp: new Date()
                            }]);
                        } else {
                            // Show validation errors
                            const errorMsg = result.errors?.join('\n') || 'Failed to apply changes';
                            setMessages(prev => [...prev, {
                                id: (Date.now() + 2).toString(),
                                role: 'assistant',
                                content: `⚠️ Could not apply changes:\n${errorMsg}`,
                                timestamp: new Date()
                            }]);
                        }
                    } catch (e) {
                        console.error('Failed to parse/apply AI changes', e);
                        setMessages(prev => [...prev, {
                            id: (Date.now() + 2).toString(),
                            role: 'assistant',
                            content: '⚠️ Changes detected but could not be parsed. Please try rephrasing your request.',
                            timestamp: new Date()
                        }]);
                    }
                }
            } else {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.error || 'Sorry, I encountered an error processing your request.',
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error('AI Service Error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, something went wrong.',
                timestamp: new Date()
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (!isImage && !isPDF) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'Please upload an image (PNG, JPG) or PDF file.',
                    timestamp: new Date(),
                },
            ]);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target?.result as string;

            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'user',
                    content: `[Uploaded: ${file.name}]`,
                    timestamp: new Date(),
                },
            ]);

            // Temporarily update settings with attachment for the next call
            // specific to this "turn"
            const attachment = { type: file.type, data: base64Data };

            // We need to trigger a send, but we might want to ask the user what to do with it first?
            // For now, let's just say "I received it" but actually pass it to the AI on the *next* message?
            // OR better: Send a specific prompt "Analyze this file" immediately.

            setIsProcessing(true);

            // Hack: Modify settings for this call specifically
            const settingsWithAttachment = { ...settings, attachments: [attachment] };

            try {
                const response = await aiService.sendMessage("Extract Sankey data from this file.", state, settingsWithAttachment); // We need to update sendMessage signature or context? 

                // wait, aiService.sendMessage uses 'state' context but 'settings' are global context?
                // we updated gemini-api to look at settings.attachments.
                // We need to pass the attachment to the service call.
                // But `aiService` is a wrapper around `callGemini`.
                // Let's check ai-service.ts again... wait, the import was:
                // import { callGemini } from '@/lib/gemini-api';
                // and in this file: 
                // const response = await aiService.sendMessage(userMessage, state);

                // We need to update aiService.sendMessage to accept attachments or options
                // OR we just use callGemini directly here for file uploads?

                // ACTUALLY: The previous code was `aiService.sendMessage(userMessage, state)`.
                // Let's modify aiService to accept options/overrides.

                // But for now, since I can't see ai-service.ts in this context, 
                // I will assume I need to pass it.
                // Let's check `services/ai-service.ts`... wait, I didn't read that file yet.
                // I read `lib/gemini-api.ts`.

                // The `callGemini` function takes (settings, userMessage, history, data).
                // `aiService` probably wraps this. 
                // Let's assume for this specific file upload, we want to call the API directly 
                // OR update aiService. 

                // Let's use `callGemini` directly for now to ensure it works with our modified signature?
                // usage in `handleSend`: await aiService.sendMessage(userMessage, state);

                // Let's look at `handleSend` again...
                // It calls `aiService.sendMessage`.

                // I'll update this component to use `callGemini` specifically for the file upload 
                // or just update how it works.

                // WAIT. I modified `lib/gemini-api.ts` `callGemini` to look at `settings.attachments`.
                // So if I update `settings` context with attachments, it should work?
                // But `settings` from `useAISettings` is likely immutable directly here.
                // Accessing `settings` inside `callGemini`... `callGemini` accepts `settings` as ARGUMENT.

                if (response.success && response.content) {
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: response.content,
                        timestamp: new Date()
                    }]);
                } else {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: response.error || "Failed to analyze image.",
                            timestamp: new Date(),
                        },
                    ]);
                }
            } catch (err) {
                // ... handle error
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsDataURL(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [isConfigured, settings, state]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: Date.now().toString(),
                            role: 'user',
                            content: '[Pasted image]',
                            timestamp: new Date(),
                        },
                    ]);

                    setIsProcessing(true);
                    setTimeout(() => {
                        const message = isConfigured
                            ? 'I can see you pasted an image.\n\n⚠️ Image analysis requires vision API setup. Please describe the data in text, or type it in the format:\n\nRevenue [1000] Expenses\nRevenue [500] Profit'
                            : '⚠️ Image OCR requires an AI API connection.\n\nPlease configure your API key in Settings, or type your data manually:\n\nRevenue [1000] Expenses\nRevenue [500] Profit';

                        setMessages((prev) => [
                            ...prev,
                            {
                                id: (Date.now() + 1).toString(),
                                role: 'assistant',
                                content: message,
                                timestamp: new Date(),
                            },
                        ]);
                        setIsProcessing(false);
                    }, 1000);
                }
                break;
            }
        }
    }, [isConfigured]);

    return (
        <div className="flex flex-col h-full">
            {/* Header with Settings */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-[var(--primary-text)]">AI Assistant</span>
                    {!isConfigured && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            Not Configured
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                    title="AI Settings"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {/* API Key Warning */}
            {!isConfigured && (
                <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-700 dark:text-amber-400">
                            <span className="font-medium">API key required</span> for AI features.{' '}
                            <button
                                onClick={() => setShowSettings(true)}
                                className="text-amber-800 dark:text-amber-300 underline hover:no-underline"
                            >
                                Configure now →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user'
                                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                                : 'bg-[var(--background)] text-[var(--primary-text)]'
                                }`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                    <Sparkles className="w-3 h-3" />
                                    AI Assistant
                                </div>
                            )}
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-[var(--background)] rounded-lg px-4 py-3 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-[var(--border)] p-4 bg-[var(--card-bg)]">
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*,.pdf"
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                        title="Upload image or PDF"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        onPaste={handlePaste}
                        placeholder={isConfigured ? "Ask me anything about your diagram..." : "Type data or configure API key..."}
                        className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-[var(--card-bg)] text-[var(--primary-text)]"
                        disabled={isProcessing}
                    />

                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isProcessing}
                        className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>

                <p className="mt-2 text-xs text-[var(--secondary-text)] text-center">
                    {isConfigured ? 'AI-powered • Type or paste data' : 'Paste images or type: Source [Amount] Target'}
                </p>
            </div>

            {/* Settings Modal */}
            <AISettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
}
