'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { sankey } from 'd3-sankey';
import { useDiagram } from '@/context/DiagramContext';
import { SankeyNode, NodeCustomization } from '@/types/sankey';
import NodeEditPopover from './NodeEditPopover';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Undo, Redo, Download, Image as ImageIcon } from 'lucide-react';

// Semantic colors
const COLORS: Record<string, string> = {
    revenue: '#22c55e',
    expense: '#ef4444',
    profit: '#3b82f6',
    neutral: '#6b7280',
};

// Particle Geometry
const PARTICLE_SIZE = 3;
const PARTICLE_TRAIL = 6;

const PALETTE = d3.schemeCategory10;

interface PopoverState {
    node: SankeyNode;
    position: { x: number; y: number };
}

export default function SankeyCanvas() {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { state, dispatch } = useDiagram();
    const { data, settings, selectedNodeId, selectedLinkIndex, nodeCustomizations } = state;
    const [popover, setPopover] = useState<PopoverState | null>(null);

    // Get customization for a node
    const getCustomization = useCallback((nodeId: string): NodeCustomization | undefined => {
        return nodeCustomizations?.find(c => c.nodeId === nodeId);
    }, [nodeCustomizations]);

    // Get node color based on category or custom color
    const getNodeColor = useCallback((node: SankeyNode, index: number): string => {
        const customization = getCustomization(node.id);
        if (customization?.fillColor) return customization.fillColor;
        if (node.color) return node.color;
        if (node.category && COLORS[node.category]) return COLORS[node.category];
        return PALETTE[index % PALETTE.length];
    }, [getCustomization]);

    // Format value for display
    const formatValue = useCallback((value: number): string => {
        const { valuePrefix, valueSuffix, valueDecimals, valueMode } = settings;

        if (valueMode === 'hidden') return '';

        let formatted: string;
        if (valueMode === 'short') {
            if (value >= 1_000_000_000) {
                formatted = (value / 1_000_000_000).toFixed(valueDecimals) + 'B';
            } else if (value >= 1_000_000) {
                formatted = (value / 1_000_000).toFixed(valueDecimals) + 'M';
            } else if (value >= 1_000) {
                formatted = (value / 1_000).toFixed(valueDecimals) + 'K';
            } else {
                formatted = value.toFixed(valueDecimals);
            }
        } else {
            formatted = value.toLocaleString('en-US', {
                minimumFractionDigits: valueDecimals,
                maximumFractionDigits: valueDecimals
            });
        }

        return `${valuePrefix}${formatted}${valueSuffix}`;
    }, [settings]);

    // Handle node click for popover
    const handleNodeClick = useCallback((event: MouseEvent, node: SankeyNode) => {
        event.stopPropagation();
        const rect = (event.target as SVGElement).getBoundingClientRect();
        setPopover({
            node,
            position: { x: rect.right + 10, y: rect.top }
        });
        dispatch({ type: 'SELECT_NODE', payload: node.id });
    }, [dispatch]);

    // Close popover
    const closePopover = useCallback(() => {
        setPopover(null);
    }, []);

    // Render the Sankey diagram
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = settings.width;
        const height = settings.height;
        const { padding } = settings;

        // --- Setup Main Group & Layers (One-time setup) ---
        let mainGroup = svg.select<SVGGElement>('g.main-group');

        if (mainGroup.empty()) {
            mainGroup = svg.append('g').attr('class', 'main-group');
            // Init Zoom
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 5])
                .on('zoom', (event) => {
                    mainGroup.attr('transform', event.transform);
                });
            svg.call(zoom).on('dblclick.zoom', null);
            (svg.node() as any).__zoomBehavior = zoom;
        }

        // --- Setup Definitions (Gradients, Filters) ---
        let defs = svg.select<SVGDefsElement>('defs');
        if (defs.empty()) {
            defs = svg.insert('defs', ':first-child');

            // 1. Drop Shadow for Nodes
            const shadow = defs.append('filter')
                .attr('id', 'node-shadow')
                .attr('height', '130%');
            shadow.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 3).attr('result', 'blur');
            shadow.append('feOffset').attr('in', 'blur').attr('dx', 2).attr('dy', 2).attr('result', 'offsetBlur');
            const feMerge = shadow.append('feMerge');
            feMerge.append('feMergeNode').attr('in', 'offsetBlur');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

            // 2. Gloss Gradient (Subtle 3D effect)
            const gloss = defs.append('linearGradient')
                .attr('id', 'node-gloss')
                .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
            gloss.append('stop').attr('offset', '0%').attr('stop-color', 'white').attr('stop-opacity', 0.15);
            gloss.append('stop').attr('offset', '100%').attr('stop-color', 'white').attr('stop-opacity', 0);
        }

        // Update Grid Pattern
        defs.select('#grid-pattern').remove();
        if (settings.showGrid) {
            const gridSize = settings.gridSize || 20;
            const pattern = defs.append('pattern')
                .attr('id', 'grid-pattern')
                .attr('width', gridSize)
                .attr('height', gridSize)
                .attr('patternUnits', 'userSpaceOnUse');
            pattern.append('circle')
                .attr('cx', 1).attr('cy', 1).attr('r', 1)
                .attr('fill', settings.isDarkMode ? '#334155' : '#e5e7eb');
        }

        // --- Update Grid Background ---
        mainGroup.select('.grid-background').remove();
        if (settings.showGrid) {
            mainGroup.insert('rect', ':first-child')
                .attr('class', 'grid-background')
                .attr('width', width * 5).attr('height', height * 5)
                .attr('x', -width * 2).attr('y', -height * 2)
                .attr('fill', 'url(#grid-pattern)')
                .style('pointer-events', 'none');
        }

        // --- Data Handling ---
        if (!data.nodes.length || !data.links.length) {
            mainGroup.selectAll('.layer-links, .layer-nodes, .layer-labels, .layer-particles').transition().duration(500).attr('opacity', 0).remove();
            // Empty message...
            const emptyMsg = svg.selectAll('.empty-message').data([1]);
            emptyMsg.enter().append('text')
                .attr('class', 'empty-message')
                .attr('x', width / 2).attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .attr('font-size', '16px')
                .text('No valid flows to display. Add flows in the Data Editor.')
                .attr('opacity', 0).transition().duration(500).attr('opacity', 1);
            return;
        } else {
            svg.select('.empty-message').transition().duration(300).attr('opacity', 0).remove();
        }

        const sankeyGenerator = sankey<any, any>()
            .nodeId((d: any) => d.id)
            .nodeWidth(settings.nodeWidth)
            .nodePadding(settings.nodePadding)
            .extent([[padding.left, padding.top], [width - padding.right, height - padding.bottom]]);

        // Filter & Clone Data
        const validLinks = data.links.filter((l) => {
            const source = typeof l.source === 'string' ? l.source : l.source;
            const target = typeof l.target === 'string' ? l.target : l.target;
            if (!source || !target) return false;
            return data.nodes.some(n => n.id === source) && data.nodes.some(n => n.id === target);
        });

        let processedGraph;
        try {
            const calcData = {
                nodes: data.nodes.map(n => ({ ...n })),
                links: validLinks.map(l => ({ ...l }))
            };
            processedGraph = sankeyGenerator(calcData);
        } catch (e) { console.error(e); return; }

        const { nodes, links } = processedGraph;

        // Custom Layout Override
        if (state.customLayout && state.customLayout.nodes) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodes.forEach((node: any) => {
                const customPos = state.customLayout.nodes[node.id];
                if (customPos) {
                    const nW = node.x1 - node.x0;
                    const nH = node.y1 - node.y0;
                    node.x0 = customPos.x; node.x1 = customPos.x + nW;
                    node.y0 = customPos.y; node.y1 = customPos.y + nH;
                }
            });
            sankeyGenerator.update(processedGraph);
        }

        // --- Layers ---
        const getLayer = (name: string) => {
            let l = mainGroup.select<SVGGElement>('.' + name);
            if (l.empty()) l = mainGroup.append('g').attr('class', name);
            return l;
        };
        // Creation Order = Z-Index
        const linkLayer = getLayer('layer-links');
        const particleLayer = getLayer('layer-particles'); // New Layer
        const nodeLayer = getLayer('layer-nodes');
        const labelLayer = getLayer('layer-labels');
        const guideLayer = getLayer('layer-guides');

        // --- Tooltip ---
        let tooltip = d3.select('body').select<HTMLDivElement>('.sankey-tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div').attr('class', 'sankey-tooltip')
                .style('position', 'fixed').style('visibility', 'hidden')
                .style('background', 'rgba(15,23,42,0.9)').style('color', 'white')
                .style('padding', '8px 12px').style('border-radius', '6px')
                .style('font-size', '12px').style('z-index', '9999');
        }
        function showTooltip(e: any, text: string) {
            tooltip.style('visibility', 'visible').text(text)
                .style('left', (e.clientX + 10) + 'px').style('top', (e.clientY + 10) + 'px');
        }
        function hideTooltip() { tooltip.style('visibility', 'hidden'); }

        const t = svg.transition().duration(750 as any).ease(d3.easeCubicInOut);

        // --- Links ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const smoothLinkPath = (d: any) => {
            let curvature = settings.linkCurvature ?? 0.5;
            curvature = Math.min(0.5, curvature);
            const dx = Math.max(1, d.target.x0 - d.source.x1);
            const dy = d.y1 - d.y0;
            const ratio = dx / (Math.abs(dy) + 0.1);
            if (ratio < 1) curvature = 0.5 - (0.5 - curvature) * Math.sqrt(ratio);

            const xi = d3.interpolateNumber(d.source.x1, d.target.x0);
            const x2 = xi(curvature), x3 = xi(1 - curvature);
            const y0 = d.y0, y1 = d.y1, w = d.width / 2;

            return `M ${d.source.x1},${y0 - w} C ${x2},${y0 - w} ${x3},${y1 - w} ${d.target.x0},${y1 - w} L ${d.target.x0},${y1 + w} C ${x3},${y1 + w} ${x2},${y0 + w} ${d.source.x1},${y0 + w} Z`
                .replace(/\s+/g, ' ').trim();
        };

        // Gradients
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        links.forEach((l: any) => {
            const id = `grad-${l.source.id}-${l.target.id}`;
            let g = defs.select<SVGLinearGradientElement>('#' + id);
            if (g.empty()) {
                g = defs.append('linearGradient').attr('id', id).attr('gradientUnits', 'userSpaceOnUse');
                g.append('stop').attr('offset', '0%').attr('class', 's');
                g.append('stop').attr('offset', '100%').attr('class', 't');
            }
            g.attr('x1', l.source.x1).attr('x2', l.target.x0);
            g.select('.s').attr('stop-color', l.source.flowColor || getNodeColor(l.source, 0));
            g.select('.t').attr('stop-color', getNodeColor(l.target, 0));
        });

        // Focus Mode Logic (Path Tracing)
        const connectedIds = new Set<string>();
        const connectedLinks = new Set<string>();

        if (selectedNodeId) {
            // Traverse Upstream
            const traverseUp = (nId: string) => {
                connectedIds.add(nId);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                links.forEach((l: any) => {
                    if (l.target.id === nId) {
                        connectedLinks.add(`${l.source.id}-${l.target.id}`);
                        if (!connectedIds.has(l.source.id)) traverseUp(l.source.id);
                    }
                });
            };
            // Traverse Downstream
            const traverseDown = (nId: string) => {
                connectedIds.add(nId);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                links.forEach((l: any) => {
                    if (l.source.id === nId) {
                        connectedLinks.add(`${l.source.id}-${l.target.id}`);
                        if (!connectedIds.has(l.target.id)) traverseDown(l.target.id);
                    }
                });
            };

            traverseUp(selectedNodeId);
            traverseDown(selectedNodeId);
        }

        const isDimmed = (nId?: string, linkKey?: string) => {
            if (!selectedNodeId && selectedLinkIndex === null) return false;
            // Link Hover takes precedence
            if (selectedLinkIndex !== null) return true; // Handled by hover logic
            // Node Selection Focus
            if (selectedNodeId) {
                if (nId && !connectedIds.has(nId)) return true;
                if (linkKey && !connectedLinks.has(linkKey)) return true;
            }
            return false;
        };


        // Link Join
        const linkSel = linkLayer.selectAll('.sankey-link')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .data(links, (d: any) => `${d.source.id}-${d.target.id}`);

        linkSel.exit().transition(t as any).attr('opacity', 0).remove();

        const linkEnter = linkSel.enter().append('path')
            .attr('class', 'sankey-link cursor-pointer')
            .attr('opacity', 0);

        // Entrance Draw Animation
        linkEnter.transition().duration(1000).ease(d3.easeCubicOut)
            .attrTween("stroke-dasharray", function () {
                const len = (this as SVGPathElement).getTotalLength();
                return d3.interpolateString(`0,${len}`, `${len},${len}`);
            })
            .attr('opacity', settings.linkOpacity);

        linkEnter.merge(linkSel as any)
            .transition(t as any)
            .attr('d', smoothLinkPath)
            .attr('opacity', ((d: any, i: number) => {
                // Hover overrides everything
                if (selectedLinkIndex !== null) return selectedLinkIndex === links.indexOf(d) ? 0.9 : 0.1;
                // Focus Mode
                if (isDimmed(undefined, `${d.source.id}-${d.target.id}`)) return 0.1;
                return settings.linkOpacity;
            }) as any)
            .style('mix-blend-mode', settings.linkBlendMode || 'normal')
            .attr('fill', (d: any) => settings.linkGradient ? `url(#grad-${d.source.id}-${d.target.id})` : (d.source.flowColor || getNodeColor(d.source, 0)));



        // --- Particles System ---
        particleLayer.selectAll('*').remove(); // Clear previous
        if (settings.showParticles) {
            const particleData: any[] = [];
            // Generate particles based on flow value
            links.forEach((link: any, i: number) => {
                const pathBuffer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathBuffer.setAttribute('d', smoothLinkPath(link));
                const length = pathBuffer.getTotalLength();

                // Density: more particles for wider links, but capped
                const count = Math.min(20, Math.max(3, Math.floor(link.value / d3.max(links, (l: any) => l.value) * 15)));

                for (let j = 0; j < count; j++) {
                    particleData.push({
                        linkIndex: i,
                        path: pathBuffer,
                        length: length,
                        offset: Math.random() * length, // Random start
                        speed: (1 + Math.random()) * (settings.particleSpeed || 1) * 2 // Var speed
                    });
                }
            });

            // Particles
            const particles = particleLayer.selectAll('.particle')
                .data(particleData)
                .enter().append('circle')
                .attr('class', 'particle')
                .attr('r', PARTICLE_SIZE)
                .attr('fill', 'white')
                .attr('opacity', 0.6)
                .attr('pointer-events', 'none');

            // Animation Loop
            const timer = d3.timer((elapsed) => {
                particles.attr('transform', function (d: any) {
                    d.offset += d.speed;
                    if (d.offset > d.length) d.offset = 0;
                    const p = d.path.getPointAtLength(d.offset);
                    return `translate(${p.x},${p.y})`;
                });
            });

            // Cleanup timer on re-render
            (svg.node() as any).__particleTimer = timer;
        } else {
            if ((svg.node() as any).__particleTimer) ((svg.node() as any).__particleTimer as d3.Timer).stop();
        }

        // Interaction
        linkLayer.selectAll('.sankey-link')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on('mouseenter', function (e, d: any) {
                if (selectedLinkIndex === null) {
                    linkLayer.selectAll('.sankey-link').transition().duration(200).attr('opacity', 0.1);
                    d3.select(this).transition().duration(200).attr('opacity', 0.8);
                    showTooltip(e, `${d.source.name} → ${d.target.name}: ${formatValue(d.value)}`);
                }
            })
            .on('mouseleave', function () {
                if (selectedLinkIndex === null) {
                    linkLayer.selectAll('.sankey-link').transition().duration(200).attr('opacity', settings.linkOpacity);
                    hideTooltip();
                }
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on('click', (e, d: any) => dispatch({ type: 'SELECT_LINK', payload: links.indexOf(d) }));


        // --- Nodes ---
        const nodeSel = nodeLayer.selectAll('.sankey-node')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .data(nodes, (d: any) => d.id);

        nodeSel.exit().transition(t as any).attr('opacity', 0).remove();

        const nodeEnter = nodeSel.enter().append('g')
            .attr('class', 'sankey-node cursor-pointer')
            .attr('opacity', 0);

        nodeEnter.append('rect').attr('rx', settings.nodeBorderRadius ?? 4).attr('ry', settings.nodeBorderRadius ?? 4).attr('filter', 'url(#node-shadow)');
        nodeEnter.append('rect').attr('class', 'gloss').attr('fill', 'url(#node-gloss)').style('pointer-events', 'none');

        const nodeUpdate = nodeEnter.merge(nodeSel as any);
        nodeUpdate.transition(t as any)
            .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
            .attr('opacity', (d: any) => isDimmed(d.id) ? 0.1 : 1);

        nodeUpdate.select('rect')
            .attr('rx', settings.nodeBorderRadius ?? 4).attr('ry', settings.nodeBorderRadius ?? 4)
            .attr('width', (d: any) => d.x1 - d.x0)
            .attr('height', (d: any) => d.y1 - d.y0)
            .attr('fill', (d: any, i) => getNodeColor(d, i));
        nodeUpdate.select('.gloss')
            .attr('width', (d: any) => d.x1 - d.x0)
            .attr('height', (d: any) => d.y1 - d.y0);

        // Drag
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const drag = d3.drag<any, any>()
            .subject((e, d) => ({ x: d.x0, y: d.y0 }))
            .on('start', function (e, d) {
                d3.select(this).raise().attr('cursor', 'grabbing');
                (d as any)._dragStartX = e.x; (d as any)._dragStartY = e.y;
                (d as any)._dragStartTime = Date.now();
            })
            .on('drag', function (e, d) {
                const w = d.x1 - d.x0, h = d.y1 - d.y0;
                let newX = e.x;

                // Snap Logic
                if (settings.snapToGrid) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const cols = Array.from(new Set(nodes.map((n: any) => n.x0))).sort((a: any, b: any) => a - b);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    newX = cols.reduce((p, c) => Math.abs(c - e.x) < Math.abs(p - e.x) ? c : p);
                } else {
                    // Free drag constrained to canvas
                    newX = Math.max(padding.left, Math.min(width - padding.right - w, e.x));
                }

                const newY = Math.max(padding.top, Math.min(height - padding.bottom - h, e.y));

                d3.select(this).attr('transform', `translate(${newX},${newY})`);

                // Guide
                guideLayer.selectAll('*').remove();
                if (settings.snapToGrid) {
                    guideLayer.append('line').attr('x1', newX + w / 2).attr('x2', newX + w / 2).attr('y1', 0).attr('y2', height)
                        .attr('stroke', '#3b82f6').attr('stroke-dasharray', '4 2');
                }

                // Update temp data for links
                d.x0 = newX; d.x1 = newX + w; d.y0 = newY; d.y1 = newY + h;
                sankeyGenerator.update(processedGraph);
                linkLayer.selectAll('.sankey-link').attr('d', smoothLinkPath);
            })
            .on('end', function (e, d) {
                guideLayer.selectAll('*').remove();
                d3.select(this).attr('cursor', 'pointer');
                const dist = Math.hypot(e.x - (d as any)._dragStartX, e.y - (d as any)._dragStartY);
                if (dist < 3 && (Date.now() - (d as any)._dragStartTime < 500)) {
                    // Click
                    handleNodeClick(e.sourceEvent, d);
                } else {
                    dispatch({ type: 'MOVE_NODE', payload: { id: d.id, x: d.x0, y: d.y0 } });
                }
            });

        nodeEnter.call(drag);


        // --- Labels ---
        const labelSel = labelLayer.selectAll('.sankey-label')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .data(nodes, (d: any) => d.id);

        labelSel.exit().transition(t as any).attr('opacity', 0).remove();

        const labelEnter = labelSel.enter().append('g').attr('class', 'sankey-label').attr('opacity', 0);
        labelEnter.append('text').attr('class', 'name').attr('fill', '#1f2937').attr('font-weight', 'bold');
        labelEnter.append('text').attr('class', 'value').attr('fill', '#6b7280').attr('dy', '1.1em');

        labelEnter.merge(labelSel as any).transition(t as any)
            .attr('opacity', 1)
            .attr('transform', (d: any) => {
                const isLeft = d.x0 < width / 2;
                const x = isLeft ? d.x1 + 8 : d.x0 - 8;
                return `translate(${x}, ${(d.y0 + d.y1) / 2})`;
            })
            .each(function (d: any) {
                const g = d3.select(this);
                const isLeft = d.x0 < width / 2;
                const align = isLeft ? 'start' : 'end';
                g.select('.name').text(d.name).attr('text-anchor', align).attr('font-family', settings.labelFontFamily).attr('font-size', settings.labelFontSize);
                g.select('.value').text(formatValue(d.value)).attr('text-anchor', align).attr('font-family', settings.labelFontFamily).attr('font-size', settings.labelFontSize - 2);
            });

        return () => {
            if ((svg.node() as any).__particleTimer) ((svg.node() as any).__particleTimer as d3.Timer).stop();
        };

    }, [data, settings, selectedNodeId, selectedLinkIndex, state.customLayout, dispatch, getNodeColor, formatValue, getCustomization, handleNodeClick]);

    return (
        <div ref={containerRef} className="w-full h-full bg-white  border border-[var(--border)] rounded-lg shadow-sm overflow-hidden relative">
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${settings.width} ${settings.height}`}
                className="w-full h-full"
                style={{ minHeight: '600px' }}
            />
            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white  p-1.5 rounded-lg shadow-lg border border-gray-200 ">
                <button
                    onClick={() => {
                        const svg = d3.select(svgRef.current);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const zoom = (svg.node() as any).__zoomBehavior;
                        if (zoom) svg.transition().duration(300).call(zoom.scaleBy, 1.2);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-700 "
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={() => {
                        const svg = d3.select(svgRef.current);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const zoom = (svg.node() as any).__zoomBehavior;
                        if (zoom) svg.transition().duration(300).call(zoom.scaleBy, 0.8);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-700 "
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <div className="h-px bg-gray-200 my-0.5" />
                <button
                    onClick={() => {
                        const svg = d3.select(svgRef.current);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const zoom = (svg.node() as any).__zoomBehavior;
                        if (zoom) svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-700 "
                    title="Reset View"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>

            {/* Top Toolbar */}
            <div className="absolute top-4 right-4 flex gap-2">
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-lg border border-gray-200">
                    <button onClick={() => (dispatch as any)({ type: 'UNDO' })} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 disabled:opacity-30">
                        <Undo className="w-4 h-4" />
                    </button>
                    <button onClick={() => (dispatch as any)({ type: 'REDO' })} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 disabled:opacity-30">
                        <Redo className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-lg border border-gray-200">
                    <button onClick={() => {
                        if (!svgRef.current) return;
                        const source = new XMLSerializer().serializeToString(svgRef.current);
                        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url; link.download = 'sankey.svg';
                        document.body.appendChild(link); link.click(); document.body.removeChild(link);
                    }} className="p-1.5 hover:bg-gray-100 rounded text-gray-700">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {popover && (
                <NodeEditPopover
                    node={popover.node}
                    position={popover.position}
                    onClose={closePopover}
                    onAIAction={(nodeId, action) => {
                        // Dispatch custom event for AI Assistant to handle
                        const event = new CustomEvent('ai-node-action', {
                            detail: { nodeId, action, nodeName: popover.node.name }
                        });
                        window.dispatchEvent(event);
                    }}
                />
            )}
        </div>
    );
}
