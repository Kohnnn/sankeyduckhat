'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Save, Trash2, Check, Plus } from 'lucide-react';
import { useDiagram } from '@/context/DiagramContext';
import { getAllPalettes, saveCustomPalette, deleteCustomPalette, getDefaultPaletteId, setDefaultPalette, parseColorsFromString, ColorPalette } from '@/lib/colorPalettes';
import { getTemplates, saveTemplate, deleteTemplate, applyTemplate, PRESET_TEMPLATES, DiagramTemplate } from '@/lib/templates';
import { GOOGLE_FONTS, NodeCustomization, DEFAULT_PALETTE } from '@/types/sankey';

export default function AppearanceTab() {
    const { state, dispatch } = useDiagram();
    const { settings, selectedNodeId, data } = state;
    const selectedNode = selectedNodeId ? data.nodes.find(n => n.id === selectedNodeId) : null;

    const [openSections, setOpenSections] = useState<Set<string>>(new Set(['palette', 'label']));
    const [recentColors, setRecentColors] = useState<string[]>([]);
    const [palettes, setPalettes] = useState<ColorPalette[]>([]);
    const [templates, setTemplates] = useState<DiagramTemplate[]>([]);
    const [defaultPaletteId, setDefaultPaletteIdState] = useState<string | null>(null);
    const [showCustomPaletteModal, setShowCustomPaletteModal] = useState(false);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [newPaletteName, setNewPaletteName] = useState('');
    const [newPaletteColors, setNewPaletteColors] = useState('');
    const [newTemplateName, setNewTemplateName] = useState('');

    // Load palettes, templates, recent colors on mount
    useEffect(() => {
        setPalettes(getAllPalettes());
        setTemplates([...PRESET_TEMPLATES, ...getTemplates()]);
        setDefaultPaletteIdState(getDefaultPaletteId());

        const saved = localStorage.getItem('sankey-recent-colors');
        if (saved) {
            try { setRecentColors(JSON.parse(saved)); } catch { }
        }
    }, []);

    const toggleSection = (section: string) => {
        const newOpen = new Set(openSections);
        if (newOpen.has(section)) newOpen.delete(section);
        else newOpen.add(section);
        setOpenSections(newOpen);
    };

    const updateSetting = useCallback(<K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
    }, [dispatch]);

    const addRecentColor = useCallback((color: string) => {
        const newColors = [color, ...recentColors.filter(c => c !== color)].slice(0, 5);
        setRecentColors(newColors);
        localStorage.setItem('sankey-recent-colors', JSON.stringify(newColors));
    }, [recentColors]);

    const handleNodeColorChange = useCallback((color: string) => {
        if (selectedNodeId) {
            dispatch({ type: 'UPDATE_NODE', payload: { id: selectedNodeId, updates: { color } } });
            addRecentColor(color);
        }
    }, [selectedNodeId, dispatch, addRecentColor]);

    const handlePaletteChange = useCallback((paletteId: string) => {
        updateSetting('colorPalette', paletteId);
    }, [updateSetting]);

    const handleSetDefaultPalette = useCallback((checked: boolean) => {
        if (checked) {
            setDefaultPalette(settings.colorPalette);
            setDefaultPaletteIdState(settings.colorPalette);
        } else {
            setDefaultPalette(null);
            setDefaultPaletteIdState(null);
        }
    }, [settings.colorPalette]);

    const handleSaveCustomPalette = useCallback(() => {
        const colors = parseColorsFromString(newPaletteColors);
        if (newPaletteName && colors.length >= 2) {
            saveCustomPalette({
                id: `custom_${Date.now()}`,
                name: newPaletteName,
                colors,
            });
            setPalettes(getAllPalettes());
            setShowCustomPaletteModal(false);
            setNewPaletteName('');
            setNewPaletteColors('');
        }
    }, [newPaletteName, newPaletteColors]);

    const handleDeletePalette = useCallback((id: string) => {
        deleteCustomPalette(id);
        setPalettes(getAllPalettes());
    }, []);

    const handleSaveTemplate = useCallback(() => {
        if (newTemplateName) {
            saveTemplate(newTemplateName, settings, settings.colorPalette);
            setTemplates([...PRESET_TEMPLATES, ...getTemplates()]);
            setShowSaveTemplateModal(false);
            setNewTemplateName('');
        }
    }, [newTemplateName, settings]);

    const handleApplyTemplate = useCallback((template: DiagramTemplate) => {
        const newSettings = applyTemplate(template, settings);
        dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
        if (template.paletteId) {
            dispatch({ type: 'UPDATE_SETTINGS', payload: { colorPalette: template.paletteId } });
        }
    }, [settings, dispatch]);

    const handleDeleteTemplate = useCallback((id: string) => {
        deleteTemplate(id);
        setTemplates([...PRESET_TEMPLATES, ...getTemplates()]);
    }, []);

    // Get/update node customization
    const getNodeCustomization = useCallback((nodeId: string) => {
        return state.nodeCustomizations?.find(c => c.nodeId === nodeId);
    }, [state.nodeCustomizations]);

    const updateNodeCustomization = useCallback((nodeId: string, updates: Partial<NodeCustomization>) => {
        dispatch({
            type: 'UPDATE_NODE_CUSTOMIZATION',
            payload: { nodeId, updates }
        });
    }, [dispatch]);

    const selectedCustomization = selectedNodeId ? getNodeCustomization(selectedNodeId) : null;

    return (
        <div className="p-4 space-y-4">
            {/* Selected Node Section */}
            {selectedNode && (
                <div className="bg-blue-50  rounded-lg border border-blue-200  p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-blue-800  flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedNode.color || '#6b7280' }} />
                        {selectedNode.name}
                    </h3>

                    {/* Node Color */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Node Color</label>

                        {/* Quick Palette */}
                        <div className="flex gap-1 mb-2 flex-wrap">
                            {DEFAULT_PALETTE.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => handleNodeColorChange(color)}
                                    className="w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition-transform shadow-sm"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={selectedNode.color || '#6b7280'}
                                onChange={(e) => handleNodeColorChange(e.target.value)}
                                className="w-10 h-8 rounded cursor-pointer border border-[var(--border)]"
                            />
                            <input
                                type="text"
                                value={selectedNode.color || ''}
                                onChange={(e) => {
                                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                        handleNodeColorChange(e.target.value);
                                    }
                                }}
                                placeholder="#000000"
                                className="flex-1 px-2 py-1 text-sm font-mono border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            />
                        </div>

                        {recentColors.length > 0 && (
                            <div className="flex gap-1 mt-2">
                                <span className="text-xs text-gray-500 mr-1">Recent:</span>
                                {recentColors.map((color, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleNodeColorChange(color)}
                                        className="w-6 h-6 rounded border border-gray-200 hover:ring-2 hover:ring-blue-300 transition-all"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Per-Node Label Styling */}
                    <div className="border-t border-blue-200  pt-3 space-y-3">
                        <h4 className="text-xs font-semibold text-blue-700  uppercase tracking-wide">Label Overrides</h4>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Font Size</label>
                                <input
                                    type="number"
                                    value={selectedCustomization?.labelFontSize ?? settings.labelFontSize}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { labelFontSize: Number(e.target.value) })}
                                    min={8}
                                    max={24}
                                    className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Font</label>
                                <select
                                    value={selectedCustomization?.labelFontFamily ?? settings.labelFontFamily}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { labelFontFamily: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                                >
                                    {GOOGLE_FONTS.map((font) => (
                                        <option key={font.value} value={font.value}>{font.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCustomization?.labelBold ?? settings.labelBold}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { labelBold: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-500"
                                />
                                Bold
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCustomization?.labelItalic ?? settings.labelItalic}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { labelItalic: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-500"
                                />
                                Italic
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Label Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={selectedCustomization?.labelColor ?? '#1f2937'}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { labelColor: e.target.value })}
                                    className="w-8 h-7 rounded cursor-pointer border border-[var(--border)]"
                                />
                                <input
                                    type="text"
                                    value={selectedCustomization?.labelColor ?? ''}
                                    onChange={(e) => {
                                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                            updateNodeCustomization(selectedNodeId!, { labelColor: e.target.value });
                                        }
                                    }}
                                    placeholder="Default"
                                    className="flex-1 px-2 py-1 text-xs font-mono border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                                />
                            </div>
                        </div>

                        {/* Custom Text Lines */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-[var(--secondary-text)] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCustomization?.showSecondLine ?? false}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { showSecondLine: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-500 w-3.5 h-3.5"
                                />
                                2nd Line Text
                            </label>
                            {selectedCustomization?.showSecondLine && (
                                <input
                                    type="text"
                                    value={selectedCustomization?.secondLineText ?? ''}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { secondLineText: e.target.value })}
                                    placeholder="e.g., $1.2M"
                                    className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-[var(--secondary-text)] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCustomization?.showThirdLine ?? false}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { showThirdLine: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-500 w-3.5 h-3.5"
                                />
                                3rd Line Text
                            </label>
                            {selectedCustomization?.showThirdLine && (
                                <input
                                    type="text"
                                    value={selectedCustomization?.thirdLineText ?? ''}
                                    onChange={(e) => updateNodeCustomization(selectedNodeId!, { thirdLineText: e.target.value })}
                                    placeholder="e.g., +15% Y/Y"
                                    className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Color Palette Section */}
            <Section title="Canvas Size" isOpen={openSections.has('canvas')} onToggle={() => toggleSection('canvas')}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Width (px)</label>
                            <input
                                type="number"
                                value={settings.width}
                                onChange={(e) => updateSetting('width', Number(e.target.value))}
                                min={600}
                                max={5000}
                                step={50}
                                className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Height (px)</label>
                            <input
                                type="number"
                                value={settings.height}
                                onChange={(e) => updateSetting('height', Number(e.target.value))}
                                min={400}
                                max={5000}
                                step={50}
                                className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100  grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={settings.showGrid}
                                onChange={(e) => updateSetting('showGrid', e.target.checked)}
                                className="rounded border-gray-300 text-blue-500"
                            />
                            Show Grid
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={settings.snapToGrid}
                                onChange={(e) => updateSetting('snapToGrid', e.target.checked)}
                                className="rounded border-gray-300 text-blue-500"
                            />
                            Snap to Grid
                        </label>
                    </div>
                </div>
            </Section>

            <Section title="Color Palette" isOpen={openSections.has('palette')} onToggle={() => toggleSection('palette')}>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Theme</label>
                        <select
                            value={settings.colorPalette}
                            onChange={(e) => handlePaletteChange(e.target.value)}
                            className="w-full px-2 py-2 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                        >
                            {palettes.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.isCustom ? '(Custom)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Palette Preview */}
                    <div className="flex gap-1 flex-wrap">
                        {palettes.find(p => p.id === settings.colorPalette)?.colors.slice(0, 8).map((color, i) => (
                            <div
                                key={i}
                                className="w-6 h-6 rounded border border-gray-200"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>

                    {/* Use as Default */}
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={defaultPaletteId === settings.colorPalette}
                            onChange={(e) => handleSetDefaultPalette(e.target.checked)}
                            className="rounded"
                        />
                        Use as Default
                    </label>

                    {/* Custom Palette Button */}
                    <button
                        onClick={() => setShowCustomPaletteModal(true)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        Create Custom Palette
                    </button>
                </div>
            </Section>

            {/* Templates Section */}
            <Section title="Templates" isOpen={openSections.has('templates')} onToggle={() => toggleSection('templates')}>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSaveTemplateModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            <Save className="w-4 h-4" />
                            Save Current
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {templates.map((t) => (
                            <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                <span className="text-sm">{t.name}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleApplyTemplate(t)}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        title="Apply"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    {!t.id.startsWith('preset_') && (
                                        <button
                                            onClick={() => handleDeleteTemplate(t.id)}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Label Settings Section */}
            <Section title="Label Settings" isOpen={openSections.has('label')} onToggle={() => toggleSection('label')}>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Font Family</label>
                        <select
                            value={settings.labelFontFamily}
                            onChange={(e) => updateSetting('labelFontFamily', e.target.value)}
                            className="w-full px-2 py-2 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                        >
                            {GOOGLE_FONTS.map((font) => (
                                <option key={font.value} value={font.value}>{font.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Font Size</label>
                            <input
                                type="number"
                                value={settings.labelFontSize}
                                onChange={(e) => updateSetting('labelFontSize', Number(e.target.value))}
                                min={8}
                                max={24}
                                className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Position</label>
                            <select
                                value={settings.labelPosition}
                                onChange={(e) => updateSetting('labelPosition', e.target.value as 'left' | 'right' | 'inside')}
                                className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            >
                                <option value="left">Left</option>
                                <option value="right">Right</option>
                                <option value="inside">Inside</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={settings.labelBold}
                                onChange={(e) => updateSetting('labelBold', e.target.checked)}
                                className="rounded"
                            />
                            Bold
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={settings.labelItalic}
                                onChange={(e) => updateSetting('labelItalic', e.target.checked)}
                                className="rounded"
                            />
                            Italic
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Decimal Places</label>
                        <select
                            value={settings.valueDecimals}
                            onChange={(e) => updateSetting('valueDecimals', Number(e.target.value) as 0 | 1 | 2 | -1)}
                            className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                        >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={-1}>All</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Value Display</label>
                        <select
                            value={settings.valueMode}
                            onChange={(e) => updateSetting('valueMode', e.target.value as 'absolute' | 'short' | 'hidden')}
                            className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                        >
                            <option value="absolute">Absolute</option>
                            <option value="short">Short (K/M/B)</option>
                            <option value="hidden">Hidden</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={settings.showComparisonLine}
                            onChange={(e) => updateSetting('showComparisonLine', e.target.checked)}
                            className="rounded"
                        />
                        Show Comparison Line (% of total)
                    </label>
                </div>
            </Section>

            {/* Node Settings Section */}
            <Section title="Node Settings" isOpen={openSections.has('node')} onToggle={() => toggleSection('node')}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Width</label>
                            <input
                                type="number"
                                value={settings.nodeWidth}
                                onChange={(e) => updateSetting('nodeWidth', Number(e.target.value))}
                                min={5}
                                max={100}
                                className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Padding</label>
                            <input
                                type="number"
                                value={settings.nodePadding}
                                onChange={(e) => updateSetting('nodePadding', Number(e.target.value))}
                                min={0}
                                max={50}
                                className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">
                            Opacity: {Math.round(settings.nodeOpacity * 100)}%
                        </label>
                        <input
                            type="range"
                            value={settings.nodeOpacity}
                            onChange={(e) => updateSetting('nodeOpacity', Number(e.target.value))}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full"
                        />
                    </div>
                </div>
            </Section>

            {/* Link Settings Section */}
            <Section title="Link Settings" isOpen={openSections.has('link')} onToggle={() => toggleSection('link')}>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">
                            Curvature: {settings.linkCurvature}
                        </label>
                        <input
                            type="range"
                            value={settings.linkCurvature}
                            onChange={(e) => updateSetting('linkCurvature', Number(e.target.value))}
                            min={0}
                            max={0.9} // At 1 it might overshoot? Standard is usually up to 0.8 or 0.9. Let's allow 0 to 1.
                            step={0.1}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">
                            Opacity: {Math.round(settings.linkOpacity * 100)}%
                        </label>
                        <input
                            type="range"
                            value={settings.linkOpacity}
                            onChange={(e) => updateSetting('linkOpacity', Number(e.target.value))}
                            min={0.1}
                            max={1}
                            step={0.05}
                            className="w-full"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={settings.linkGradient}
                            onChange={(e) => updateSetting('linkGradient', e.target.checked)}
                            className="rounded"
                        />
                        Use Gradient Links
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={settings.linkGradient}
                            onChange={(e) => updateSetting('linkGradient', e.target.checked)}
                            className="rounded"
                        />
                        Use Gradient Links
                    </label>

                    <div>
                        <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Blend Mode</label>
                        <select
                            value={settings.linkBlendMode ?? 'normal'}
                            onChange={(e) => updateSetting('linkBlendMode', e.target.value as any)}
                            className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                        >
                            <option value="normal">Normal</option>
                            <option value="multiply">Multiply (Darker Overlaps)</option>
                            <option value="screen">Screen (Lighter Overlaps)</option>
                            <option value="overlay">Overlay</option>
                        </select>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <label className="flex items-center gap-2 text-sm mb-2">
                            <input
                                type="checkbox"
                                checked={settings.showParticles ?? false}
                                onChange={(e) => updateSetting('showParticles', e.target.checked)}
                                className="rounded"
                            />
                            Show Flow Animation
                            <span className="text-[10px] text-blue-500 bg-blue-50 px-1 rounded border border-blue-100">BETA</span>
                        </label>

                        {(settings.showParticles) && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">
                                    Animation Speed: {settings.particleSpeed}x
                                </label>
                                <input
                                    type="range"
                                    value={settings.particleSpeed ?? 1}
                                    onChange={(e) => updateSetting('particleSpeed', Number(e.target.value))}
                                    min={0.1}
                                    max={2.0}
                                    step={0.1}
                                    className="w-full"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Section >

            {/* Value Formatting Section */}
            < Section title="Value Formatting" isOpen={openSections.has('value')} onToggle={() => toggleSection('value')}>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Prefix</label>
                            <input
                                type="text"
                                value={settings.valuePrefix}
                                onChange={(e) => updateSetting('valuePrefix', e.target.value)}
                                placeholder="$"
                                className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--secondary-text)] mb-1">Suffix</label>
                            <input
                                type="text"
                                value={settings.valueSuffix}
                                onChange={(e) => updateSetting('valueSuffix', e.target.value)}
                                placeholder="M"
                                className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                            />
                        </div>
                    </div>
                </div>
            </Section >

            {/* Custom Palette Modal */}
            {
                showCustomPaletteModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-[var(--card-bg)] rounded-lg p-6 w-96 max-w-[90vw] border border-[var(--border)]">
                            <h3 className="text-lg font-semibold mb-4 text-[var(--primary-text)]">Create Custom Palette</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={newPaletteName}
                                        onChange={(e) => setNewPaletteName(e.target.value)}
                                        placeholder="My Palette"
                                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--card-bg)] text-[var(--primary-text)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                                        Colors ({parseColorsFromString(newPaletteColors).length} colors)
                                    </label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                        {(() => {
                                            const colors = parseColorsFromString(newPaletteColors);
                                            if (colors.length === 0) {
                                                return (
                                                    <p className="text-sm text-gray-400 text-center py-4">
                                                        Click &quot;Add Color&quot; to start
                                                    </p>
                                                );
                                            }
                                            return colors.map((color, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={color}
                                                        onChange={(e) => {
                                                            const newColors = [...colors];
                                                            newColors[index] = e.target.value;
                                                            setNewPaletteColors(newColors.join(', '));
                                                        }}
                                                        className="w-10 h-8 rounded cursor-pointer border border-[var(--border)]"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={color}
                                                        onChange={(e) => {
                                                            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                                                const newColors = [...colors];
                                                                newColors[index] = e.target.value;
                                                                setNewPaletteColors(newColors.join(', '));
                                                            }
                                                        }}
                                                        className="flex-1 px-2 py-1 text-sm font-mono border border-[var(--border)] rounded bg-[var(--card-bg)] text-[var(--primary-text)]"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newColors = colors.filter((_, i) => i !== index);
                                                            setNewPaletteColors(newColors.join(', '));
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Remove color"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const colors = parseColorsFromString(newPaletteColors);
                                            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                                            setNewPaletteColors([...colors, randomColor].join(', '));
                                        }}
                                        className="mt-2 flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100  text-gray-700  rounded hover:bg-gray-200 :bg-gray-600 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Color
                                    </button>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => {
                                            setShowCustomPaletteModal(false);
                                            setNewPaletteName('');
                                            setNewPaletteColors('');
                                        }}
                                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveCustomPalette}
                                        disabled={parseColorsFromString(newPaletteColors).length < 2 || !newPaletteName}
                                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Save Template Modal */}
            {
                showSaveTemplateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-[var(--card-bg)] rounded-lg p-6 w-96 max-w-[90vw] border border-[var(--border)]">
                            <h3 className="text-lg font-semibold mb-4 text-[var(--primary-text)]">Save Template</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-1">Template Name</label>
                                    <input
                                        type="text"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        placeholder="My Template"
                                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--card-bg)] text-[var(--primary-text)]"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    This will save all current styling settings (fonts, colors, sizes) but not the diagram data.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setShowSaveTemplateModal(false)}
                                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveTemplate}
                                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Collapsible section component
function Section({
    title,
    isOpen,
    onToggle,
    children
}: {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] overflow-hidden">
            <button
                onClick={onToggle}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-[var(--primary-text)] hover:bg-[var(--hover-bg)]"
            >
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {title}
            </button>
            {isOpen && (
                <div className="border-t border-gray-200 p-4">
                    {children}
                </div>
            )}
        </div>
    );
}

