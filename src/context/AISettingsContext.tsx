'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AISettings, defaultAISettings } from '@/types/sankey';

const STORAGE_KEY = 'sankey-ai-settings';

interface AISettingsContextType {
    settings: AISettings;
    updateSettings: (updates: Partial<AISettings>) => void;
    updateApiKey: (key: string) => void;
    updateModel: (model: string) => void;
    updateCustomPrompt: (prompt: string) => void;
    resetPrompt: () => void;
    resetAll: () => void;
    isConfigured: boolean;
}

const AISettingsContext = createContext<AISettingsContextType | null>(null);

export function AISettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AISettings>(defaultAISettings);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setSettings({ ...defaultAISettings, ...parsed });
            }
        } catch (e) {
            console.error('Failed to load AI settings:', e);
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
    }, [settings, isLoaded]);

    const updateSettings = useCallback((updates: Partial<AISettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    }, []);

    const updateApiKey = useCallback((key: string) => {
        setSettings(prev => ({ ...prev, apiKey: key }));
    }, []);

    const updateModel = useCallback((model: string) => {
        setSettings(prev => ({ ...prev, model }));
    }, []);

    const updateCustomPrompt = useCallback((prompt: string) => {
        setSettings(prev => ({ ...prev, customPrompt: prompt }));
    }, []);

    const resetPrompt = useCallback(() => {
        setSettings(prev => ({ ...prev, customPrompt: defaultAISettings.customPrompt }));
    }, []);

    const resetAll = useCallback(() => {
        setSettings(defaultAISettings);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const isConfigured = settings.apiKey.trim().length > 0;

    const value: AISettingsContextType = {
        settings,
        updateSettings,
        updateApiKey,
        updateModel,
        updateCustomPrompt,
        resetPrompt,
        resetAll,
        isConfigured,
    };

    return <AISettingsContext.Provider value={value}>{children}</AISettingsContext.Provider>;
}

export function useAISettings() {
    const context = useContext(AISettingsContext);
    if (!context) {
        throw new Error('useAISettings must be used within an AISettingsProvider');
    }
    return context;
}
