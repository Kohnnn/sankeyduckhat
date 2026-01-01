'use client';

import React, { useState, useEffect } from 'react';
import {
    Undo2, Redo2, Download, RotateCcw, FileJson, Image, FileCode,
    MousePointer2, Hand, Plus, GitBranch, Type, ZoomIn, ZoomOut,
    Maximize2, RotateCw, RefreshCw, Trash2
} from 'lucide-react';
import { useDiagram } from '@/context/DiagramContext';
import { useStudio } from '@/context/StudioContext';

export default function Toolbar() {
    const { history, undo, redo, resetSession, resetNodePositions, resetLabelPositions, state, dispatch } = useDiagram();
    const { state: studioState, setTool, zoomIn, zoomOut, zoomReset, dispatch: studioDispatch } = useStudio();
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showResetMenu, setShowResetMenu] = useState(false);

    const handleExportPNG = () => {
        const svg = document.querySelector('svg');
        if (!svg) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 2;

        canvas.width = state.settings.width * scale;
        canvas.height = state.settings.height * scale;

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new window.Image();
        img.onload = () => {
            ctx?.scale(scale, scale);
            ctx?.drawImage(img, 0, 0);

            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `sankey-diagram-${Date.now()}.png`;
            link.href = pngUrl;
            link.click();

            URL.revokeObjectURL(url);
        };
        img.src = url;
        setShowExportMenu(false);
    };

    const handleExportSVG = () => {
        const svg = document.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = `sankey-diagram-${Date.now()}.svg`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    const handleExportJSON = () => {
        const json = JSON.stringify(state, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = `sankey-diagram-${Date.now()}.json`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    // Force Light Mode
    React.useEffect(() => {
        document.documentElement.classList.remove('dark');
    }, []);

    const ToolButton = ({
        tool,
        icon: Icon,
        label
    }: {
        tool: 'select' | 'pan' | 'addNode' | 'addFlow' | 'addLabel';
        icon: React.ElementType;
        label: string
    }) => (
        <button
            onClick={() => setTool(tool)}
            className={`p-2 rounded-md transition-colors ${studioState.currentTool === tool
                ? 'bg-[var(--color-secondary)] text-white'
                : 'hover:bg-[var(--hover-bg)] text-[var(--primary-text)]'
                }`}
            title={label}
        >
            <Icon className="w-4 h-4" />
        </button>
    );

    return (
        <div className="flex items-center gap-1 px-4 py-2 bg-[var(--card-bg)] border-b border-[var(--border)] text-[var(--primary-text)]">
            {/* Tool Selection */}
            <div className="flex items-center gap-0.5 bg-[var(--background)] rounded-lg p-0.5 border border-[var(--border)]">
                <ToolButton tool="select" icon={MousePointer2} label="Select (V)" />
                <ToolButton tool="pan" icon={Hand} label="Pan (H)" />
                <ToolButton tool="addNode" icon={Plus} label="Add Node (N)" />
                <ToolButton tool="addFlow" icon={GitBranch} label="Add Flow (F)" />
                <ToolButton tool="addLabel" icon={Type} label="Add Label (L)" />
            </div>



            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5">
                <button
                    onClick={undo}
                    disabled={!history.canUndo}
                    className="p-2 rounded-md hover:bg-[var(--hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--secondary-text)]"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 className="w-4 h-4" />
                </button>
                <button
                    onClick={redo}
                    disabled={!history.canRedo}
                    className="p-2 rounded-md hover:bg-[var(--hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--secondary-text)]"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 className="w-4 h-4" />
                </button>
            </div>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Export */}
            <div className="relative">
                <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--primary-text)] rounded-md hover:bg-[var(--hover-bg)]"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>

                {showExportMenu && (
                    <div className="absolute top-full left-0 mt-1 py-1 bg-[var(--card-bg)] rounded-lg shadow-lg border border-[var(--border)] z-50 min-w-[160px]">
                        <button
                            onClick={handleExportPNG}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--primary-text)] hover:bg-[var(--hover-bg)]"
                        >
                            <Image className="w-4 h-4" />
                            Download PNG
                        </button>
                        <button
                            onClick={handleExportSVG}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--primary-text)] hover:bg-[var(--hover-bg)]"
                        >
                            <FileCode className="w-4 h-4" />
                            Download SVG
                        </button>
                        <button
                            onClick={handleExportJSON}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--primary-text)] hover:bg-[var(--hover-bg)]"
                        >
                            <FileJson className="w-4 h-4" />
                            Download JSON
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1" />

            {/* Reset Options */}
            <div className="relative">
                <button
                    onClick={() => setShowResetMenu(!showResetMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--secondary-text)] rounded-md hover:bg-[var(--hover-bg)]"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reset
                </button>

                {showResetMenu && (
                    <div className="absolute top-full right-0 mt-1 py-1 bg-[var(--card-bg)] rounded-lg shadow-lg border border-[var(--border)] z-50 min-w-[180px]">
                        <button
                            onClick={() => { resetNodePositions(); setShowResetMenu(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--primary-text)] hover:bg-[var(--hover-bg)]"
                        >
                            <RotateCw className="w-4 h-4" />
                            Reset Node Positions
                        </button>
                        <button
                            onClick={() => { resetLabelPositions(); setShowResetMenu(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--primary-text)] hover:bg-[var(--hover-bg)]"
                        >
                            <RotateCw className="w-4 h-4" />
                            Reset Label Positions
                        </button>
                        <div className="border-t border-[var(--border)] my-1" />
                        <button
                            onClick={() => { resetSession(); setShowResetMenu(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <Trash2 className="w-4 h-4" />
                            Factory Reset
                        </button>
                    </div>
                )}
            </div>



            {/* Click-away handler */}
            {(showExportMenu || showResetMenu) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setShowExportMenu(false);
                        setShowResetMenu(false);
                    }}
                />
            )}
        </div>
    );
}
