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
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [popover, setPopover] = useState<PopoverState | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);

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
    const lastClickTimeRef = useRef(0);

    useEffect(() => {
        if (!svgRef.current || !data.nodes.length) return;
        if (!data.links.length) return;

        const svg = d3.select(svgRef.current);
        // Clear previous contents but keep definition of zoom behavior if strictly needed? 
        // Better to re-apply.
        svg.selectAll('*').remove();

        const width = settings.width;
        const height = settings.height;
        const { padding } = settings;

        // Zoom Behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 5])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom)
            .on('dblclick.zoom', null); // Disable double click zoom

        // Expose zoom control to external buttons via a custom event or ref would be ideal, 
        // but for simplicity we can attach helpers to the SVG element or use a closure if we render buttons here.
        // We will render React buttons that select the SVG and apply transforms.

        // Main Group (transformed by zoom)
        const g = svg.append('g');

        // Grid Background
        if (settings.showGrid) {
            g.append('rect')
                .attr('width', width * 5) // Make it huge to cover zoom panning
                .attr('height', height * 5)
                .attr('x', -width * 2)
                .attr('y', -height * 2)
                .attr('fill', 'url(#grid-pattern)')
                .style('pointer-events', 'none');
        }

        // Initial Center
        // We can center it initially if we want, but default (0,0) is fine for now.

        // Store zoom instance for buttons
        (svg.node() as any).__zoomBehavior = zoom;

        // Create sankey generator
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sankeyGenerator = sankey<any, any>()
            .nodeId((d: any) => d.id)
            .nodeWidth(settings.nodeWidth)
            .nodePadding(settings.nodePadding)
            .extent([
                [padding.left, padding.top],
                [width - padding.right, height - padding.bottom],
            ]);

        // Prepare data - copy to avoid mutation and validate links
        const validLinks = data.links.filter((l) => {
            // Check if source and target are not empty
            const source = typeof l.source === 'string' ? l.source : l.source;
            const target = typeof l.target === 'string' ? l.target : l.target;

            if (!source || source === '' || !target || target === '') {
                console.warn('Skipping invalid link with empty source or target:', l);
                return false;
            }

            // Check if source and target nodes exist
            const sourceNode = data.nodes.find(n => n.id === source);
            const targetNode = data.nodes.find(n => n.id === target);

            if (!sourceNode || !targetNode) {
                console.warn('Skipping link with non-existent node:', l);
                return false;
            }

            return true;
        });

        const graphData = {
            nodes: data.nodes.map((n) => ({ ...n })),
            links: validLinks.map((l) => ({ ...l })),
        };

        // If no valid links, show empty canvas
        if (validLinks.length === 0) {
            console.warn('No valid links to render');

            // Show a helpful message in the canvas
            const message = svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .attr('font-size', '16px')
                .attr('font-family', settings.labelFontFamily)
                .text('No valid flows to display. Add flows in the Data Editor.');

            return () => {
                message.remove();
            };
        }

        // Generate layout
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let processedGraph: any;
        try {
            // Deep clone data to prevent mutation by d3-sankey
            // d3-sankey modifies nodes/links in place (replacing IDs with objects),
            // which causes "circular link" errors on re-renders if we pass the same object.
            const dataClone = JSON.parse(JSON.stringify(graphData));
            processedGraph = sankeyGenerator(dataClone);
        } catch (e) {
            console.error('Sankey layout error:', e);
            console.error('Graph data:', graphData);

            // Show error message in canvas
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', '#ef4444')
                .attr('font-size', '16px')
                .attr('font-family', settings.labelFontFamily)
                .text('Error rendering diagram. Check console for details.');

            return;
        }

        const { nodes, links } = processedGraph;

        // Apply custom layout overrides
        if (state.customLayout && state.customLayout.nodes) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodes.forEach((node: any) => {
                const customPos = state.customLayout.nodes[node.id];
                if (customPos) {
                    const width = node.x1 - node.x0;
                    const height = node.y1 - node.y0;

                    // Override with custom position
                    node.x0 = customPos.x;
                    node.x1 = customPos.x + width;
                    node.y0 = customPos.y;
                    node.y1 = customPos.y + height;
                }
            });

            // Re-update links since node positions changed
            sankeyGenerator.update(processedGraph);
        }

        // Create defs for gradients and grid
        const defs = svg.append('defs');

        // Grid Pattern
        if (settings.showGrid) {
            const gridSize = settings.gridSize || 20;
            const pattern = defs.append('pattern')
                .attr('id', 'grid-pattern')
                .attr('width', gridSize)
                .attr('height', gridSize)
                .attr('patternUnits', 'userSpaceOnUse');

            pattern.append('circle')
                .attr('cx', 1)
                .attr('cy', 1)
                .attr('r', 1)
                .attr('fill', settings.isDarkMode ? '#334155' : '#e5e7eb');
        }

        // Custom smooth curved link path generator
        // Creates beautiful S-curves with adjustable curvature (like Meta/NVIDIA diagrams)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // Custom smooth curved link path generator
        // Creates beautiful S-curves matching SankeyArt.com style
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const smoothLinkPath = (d: any): string => {
            // Curvature logic optimization:
            // 0.5 = standard S-curve (smoothest)
            // < 0.5 = flatter S-curve (more horizontal at ends)
            // > 0.5 = causes kinking (swapped control points)
            let curvature = settings.linkCurvature ?? 0.5;

            // Source and target positions
            const x0 = d.source.x1;
            const y0 = d.y0;
            const x1 = d.target.x0;
            const y1 = d.y1;
            const width = d.width || 1;
            const dx = Math.max(1, x1 - x0);
            const dy = y1 - y0;

            // Fix 1: Prevent kinking by capping curvature at 0.5.
            // Most beautiful "SankeyArt" look is actually around 0.4-0.5.
            curvature = Math.min(0.5, curvature);

            // Fix 2: If horizontal distance (dx) is small relative to vertical (dy),
            // a high curvature makes a very tight turn. We reduce curvature factor
            // for short horizontal spans to make them look more natural.
            const ratio = dx / (Math.abs(dy) + 0.1);
            if (ratio < 1) {
                // Smoothly interpolate towards 0.5 (the most stable curvature) as dx gets smaller
                curvature = 0.5 - (0.5 - curvature) * Math.sqrt(ratio);
            }

            // Control point calculation
            const xi = d3.interpolateNumber(x0, x1);

            // x2 and x3 should never cross for a standard S-curve
            const x2 = xi(curvature);
            const x3 = xi(1 - curvature);

            const halfWidth = width / 2;

            return `
                M ${x0},${y0 - halfWidth}
                C ${x2},${y0 - halfWidth}
                  ${x3},${y1 - halfWidth}
                  ${x1},${y1 - halfWidth}
                L ${x1},${y1 + halfWidth}
                C ${x3},${y1 + halfWidth}
                  ${x2},${y0 + halfWidth}
                  ${x0},${y0 + halfWidth}
                Z
            `.replace(/\s+/g, ' ').trim();
        };

        // Also keep the stroke-based generator for thinner links
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const smoothLinkStroke = (d: any): string => {
            const curvature = settings.linkCurvature;

            const x0 = d.source.x1;
            const y0 = d.y0;
            const x1 = d.target.x0;
            const y1 = d.y1;

            const xi = d3.interpolateNumber(x0, x1);
            const x2 = xi(curvature);
            const x3 = xi(1 - curvature);

            return `M ${x0},${y0} C ${x2},${y0} ${x3},${y1} ${x1},${y1}`;
        };

        // Create gradient for each link (Always create, toggle usage via CSS/Attr)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        links.forEach((link: any, i: number) => {
            const sourceColor = link.source.flowColor || getNodeColor(link.source, nodes.indexOf(link.source));
            const targetColor = getNodeColor(link.target, nodes.indexOf(link.target));

            const gradient = defs.append('linearGradient')
                .attr('id', `link-gradient-${i}`)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', link.source.x1)
                .attr('x2', link.target.x0);

            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', sourceColor);

            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', targetColor);
        });



        // Draw links with gradient fill - using filled shapes for smooth appearance
        const linkGroup = g.append('g')
            .attr('class', 'links');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const linkPath = linkGroup.selectAll('path')
            .data(links)
            .join('path')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('d', smoothLinkPath) // Use custom smooth curve generator
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('fill', (d: any, i: number) => {
                if (settings.linkGradient) {
                    return `url(#link-gradient-${i})`;
                }
                // Use source color for solid links (SankeyArt style)
                return d.source.flowColor || getNodeColor(d.source, nodes.indexOf(d.source));
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('fill-opacity', (d: any, i: number) =>
                selectedLinkIndex === i ? 0.9 : (selectedLinkIndex !== null ? 0.15 : settings.linkOpacity)
            )
            .attr('stroke', 'none') // No stroke, using fill
            .attr('class', 'cursor-pointer transition-opacity duration-200')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on('mouseenter', function (event: any, d: any) {
                const i = links.indexOf(d);
                if (selectedLinkIndex === null) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    linkPath.attr('fill-opacity', (_: any, idx: number) => idx === i ? 0.9 : 0.15);
                    nodeGroup.attr('opacity', 0.6);
                }
                const sourceNode = d.source;
                const targetNode = d.target;
                showTooltip(event, `${sourceNode.name} → ${targetNode.name}: ${formatValue(d.value)}`);
            })
            .on('mouseleave', function () {
                if (selectedLinkIndex === null) {
                    linkPath.attr('fill-opacity', settings.linkOpacity);
                    nodeGroup.attr('opacity', 1);
                }
                hideTooltip();
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on('click', function (event: any, d: any) {
                const i = links.indexOf(d);
                dispatch({ type: 'SELECT_LINK', payload: selectedLinkIndex === i ? null : i });
                setPopover(null);
            });

        // Comparison Labels (Pills)
        if (settings.showComparisonLine) {
            const comparisonGroup = g.append('g')
                .attr('class', 'comparison-labels')
                .style('pointer-events', 'none');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pills = comparisonGroup.selectAll('g')
                .data(links.filter((l: any) => l.comparisonValue))
                .join('g')
                .attr('transform', (d: any) => {
                    const x = (d.source.x1 + d.target.x0) / 2;
                    const y = (d.y0 + d.y1) / 2;
                    return `translate(${x},${y})`;
                })
                .attr('opacity', 0);

            // Pill Background
            pills.append('rect')
                .attr('rx', 4)
                .attr('ry', 4)
                .attr('x', -20) // Approximate width/2, updated dynamically if needed
                .attr('y', -10)
                .attr('width', 40)
                .attr('height', 20)
                .attr('fill', (d: any) => {
                    const val = d.comparisonValue.toString().trim();
                    if (val.startsWith('+')) return '#dcfce7'; // Light green
                    if (val.startsWith('-')) return '#fee2e2'; // Light red
                    return '#f3f4f6'; // Light gray
                })
                .attr('stroke', (d: any) => {
                    const val = d.comparisonValue.toString().trim();
                    if (val.startsWith('+')) return '#16a34a'; // Green
                    if (val.startsWith('-')) return '#dc2626'; // Red
                    return '#9ca3af'; // Gray
                })
                .attr('stroke-width', 1);

            // Pill Text
            pills.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('font-family', settings.labelFontFamily)
                .attr('font-size', '11px')
                .attr('font-weight', 'bold')
                .attr('fill', (d: any) => {
                    const val = d.comparisonValue.toString().trim();
                    if (val.startsWith('+')) return '#15803d'; // Dark green
                    if (val.startsWith('-')) return '#b91c1c'; // Dark red
                    return '#374151'; // Dark gray
                })
                .text((d: any) => d.comparisonValue)
                .each(function (d: any) {
                    // Auto-resize rect based on text width
                    const bbox = this.getBBox();
                    const paddingX = 8;
                    const paddingY = 4;
                    const width = bbox.width + paddingX * 2;
                    const height = bbox.height + paddingY * 2;

                    d3.select(this.parentNode as SVGGElement).select('rect')
                        .attr('x', -width / 2)
                        .attr('y', -height / 2)
                        .attr('width', width)
                        .attr('height', height);
                });

            pills.transition()
                .delay(300)
                .duration(500)
                .attr('opacity', 1);
        }

        // Draw nodes
        const nodeGroup = g.append('g')
            .attr('class', 'nodes');

        // Smart Guides Group (Z-index: Top)
        g.append('g')
            .attr('class', 'guides')
            .style('pointer-events', 'none');

        const node = nodeGroup.selectAll('g')
            .data(nodes)
            .join('g')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
            .attr('class', 'cursor-pointer')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .call(d3.drag<any, any>()
                .subject(function (event, d) {
                    return { x: d.x0, y: d.y0 };
                })
                .on('start', function (event, d) {
                    d3.select(this).raise().attr('cursor', 'grabbing');
                    // Store start position for click detection
                    (d as any)._dragStartX = event.x;
                    (d as any)._dragStartY = event.y;
                    (d as any)._dragStartTime = Date.now();
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .on('drag', function (event: any, d: any) {
                    const nodeHeight = d.y1 - d.y0;
                    const nodeWidth = d.x1 - d.x0;

                    // Initial positions from mouse event
                    let newX = event.x;
                    let newY = event.y;

                    // --- Smart Guides Logic ---
                    const snapThreshold = 10;
                    const guides: any[] = [];

                    // Find other nodes
                    const otherNodes = processedGraph.nodes.filter((n: any) => n.id !== d.id);

                    // Candidate snap positions
                    let snappedX = false;
                    let snappedY = false;

                    // Y-Axis Snapping (Horizontal Lines)
                    for (const other of otherNodes) {
                        const targets = [other.y0, other.y1, (other.y0 + other.y1) / 2]; // Top, Bottom, Center
                        const current = [newY, newY + nodeHeight, newY + nodeHeight / 2]; // Top, Bottom, Center

                        for (const t of targets) {
                            // Snap Top
                            if (Math.abs(t - current[0]) < snapThreshold && !snappedY) {
                                newY = t;
                                snappedY = true;
                                guides.push({ type: 'h', y: t, x1: Math.min(d.x0, other.x0), x2: Math.max(d.x1, other.x1) });
                            }
                            // Snap Bottom
                            if (Math.abs(t - current[1]) < snapThreshold && !snappedY) {
                                newY = t - nodeHeight;
                                snappedY = true;
                                guides.push({ type: 'h', y: t, x1: Math.min(d.x0, other.x0), x2: Math.max(d.x1, other.x1) });
                            }
                            // Snap Center
                            if (Math.abs(t - current[2]) < snapThreshold && !snappedY) {
                                newY = t - nodeHeight / 2;
                                snappedY = true;
                                guides.push({ type: 'h', y: t, x1: Math.min(d.x0, other.x0), x2: Math.max(d.x1, other.x1) });
                            }
                        }
                        if (snappedY) break; // Only snap to one
                    }

                    // X-Axis Snapping (Vertical Lines)
                    for (const other of otherNodes) {
                        const targets = [other.x0, other.x1, (other.x0 + other.x1) / 2]; // Left, Right, Center
                        const current = [newX, newX + nodeWidth, newX + nodeWidth / 2];

                        for (const t of targets) {
                            if (Math.abs(t - current[0]) < snapThreshold && !snappedX) {
                                newX = t;
                                snappedX = true;
                                guides.push({ type: 'v', x: t, y1: Math.min(d.y0, other.y0), y2: Math.max(d.y1, other.y1) });
                            }
                            if (Math.abs(t - current[1]) < snapThreshold && !snappedX) {
                                newX = t - nodeWidth;
                                snappedX = true;
                                guides.push({ type: 'v', x: t, y1: Math.min(d.y0, other.y0), y2: Math.max(d.y1, other.y1) });
                            }
                            if (Math.abs(t - current[2]) < snapThreshold && !snappedX) {
                                newX = t - nodeWidth / 2;
                                snappedX = true;
                                guides.push({ type: 'v', x: t, y1: Math.min(d.y0, other.y0), y2: Math.max(d.y1, other.y1) });
                            }
                        }
                        if (snappedX) break;
                    }

                    // --- Grid Snapping (Fallback) ---
                    if (settings.snapToGrid) {
                        const gridSize = settings.gridSize || 20;
                        if (!snappedX) {
                            newX = Math.round(newX / gridSize) * gridSize;
                        }
                        if (!snappedY) {
                            newY = Math.round(newY / gridSize) * gridSize;
                        }
                    }

                    // Render Guides
                    const guideGroup = svg.select('.guides');
                    guideGroup.selectAll('*').remove();

                    if (guides.length > 0) {
                        guides.forEach(g => {
                            if (g.type === 'h') {
                                guideGroup.append('line')
                                    .attr('x1', 0).attr('x2', width) // Full width guide or bounded?
                                    .attr('y1', g.y).attr('y2', g.y)
                                    .attr('stroke', '#ef4444').attr('stroke-width', 1).attr('stroke-dasharray', '4 2');
                            } else {
                                guideGroup.append('line')
                                    .attr('x1', g.x).attr('x2', g.x)
                                    .attr('y1', 0).attr('y2', height)
                                    .attr('stroke', '#ef4444').attr('stroke-width', 1).attr('stroke-dasharray', '4 2');
                            }
                        });
                    }
                    // ---------------------------

                    // Constrain to canvas
                    newY = Math.max(padding.top, Math.min(height - padding.bottom - nodeHeight, newY));
                    newX = Math.max(padding.left, Math.min(width - padding.right - nodeWidth, newX));

                    d.y0 = newY;
                    d.y1 = newY + nodeHeight;
                    d.x0 = newX;
                    d.x1 = newX + nodeWidth;

                    d3.select(this).attr('transform', `translate(${d.x0},${d.y0})`);
                    sankeyGenerator.update(processedGraph);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    linkPath.attr('d', smoothLinkPath);
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .on('end', function (event: any, d: any) {
                    // Clear Guides
                    svg.select('.guides').selectAll('*').remove();

                    d3.select(this).attr('cursor', 'pointer');

                    const dx = event.x - ((d as any)._dragStartX || 0);
                    const dy = event.y - ((d as any)._dragStartY || 0);
                    const dt = Date.now() - ((d as any)._dragStartTime || 0);
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 3 && dt < 500) {
                        // It was a click!
                        const rect = (this as SVGElement).getBoundingClientRect();
                        setPopover({
                            node: d,
                            position: { x: rect.right + 10, y: rect.top }
                        });
                        dispatch({ type: 'SELECT_NODE', payload: d.id });
                    } else {
                        // It was a drag
                        dispatch({ type: 'MOVE_NODE', payload: { id: d.id, x: d.x0, y: d.y0 } });
                    }
                })
            );

        // Determine if node is in first column (for label positioning)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const minX = Math.min(...nodes.map((n: any) => n.x0));

        // Node rectangles - flat design without borders
        node.append('rect')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('width', (d: any) => d.x1 - d.x0)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('height', (d: any) => d.y1 - d.y0)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('fill', (d: any, i: number) => getNodeColor(d, i))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .attr('opacity', (d: any) =>
                selectedNodeId === d.id ? 1 : (selectedNodeId !== null ? 0.5 : settings.nodeOpacity)
            )
            .attr('rx', 2)
            .attr('ry', 2)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on('mouseenter', function (event: any, d: any) {
                if (selectedNodeId === null) {
                    // Focus Mode: Dim everything else
                    nodeGroup.selectAll('rect').attr('opacity', (n: any) => n.id === d.id ? 1 : 0.2);

                    linkPath.attr('fill-opacity', (l: any) => {
                        const isConnected = l.source.id === d.id || l.target.id === d.id;
                        return isConnected ? 0.8 : 0.05;
                    });

                    // Highlight connected nodes slightly
                    const connectedNodeIds = new Set<string>();
                    links.forEach((l: any) => {
                        if (l.source.id === d.id) connectedNodeIds.add(l.target.id);
                        if (l.target.id === d.id) connectedNodeIds.add(l.source.id);
                    });
                    nodeGroup.selectAll('rect').filter((n: any) => connectedNodeIds.has(n.id))
                        .attr('opacity', 0.8);
                }
            })
            .on('mouseleave', function () {
                if (selectedNodeId === null) {
                    // Reset
                    nodeGroup.selectAll('rect').attr('opacity', settings.nodeOpacity);
                    linkPath.attr('fill-opacity', settings.linkOpacity);
                }
            })


        // Tooltip
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let tooltip: any = d3.select('body').select('.sankey-tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('class', 'sankey-tooltip')
                .style('position', 'fixed')
                .style('visibility', 'hidden')
                .style('background', 'rgba(15,23,42,0.9)')
                .style('color', 'white')
                .style('padding', '10px 14px')
                .style('border-radius', '8px')
                .style('font-size', '13px')
                .style('font-weight', '500')
                .style('pointer-events', 'none')
                .style('z-index', '1000')
                .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)');
        }

        function showTooltip(event: MouseEvent, text: string) {
            tooltip
                .style('visibility', 'visible')
                .style('left', `${event.clientX + 12}px`)
                .style('top', `${event.clientY + 12}px`)
                .text(text);
        }

        function hideTooltip() {
            tooltip.style('visibility', 'hidden');
        }

        // --- LABEL RENDERING ---
        let labelLayer = g.select<SVGGElement>('.label-layer');
        if (labelLayer.empty()) {
            labelLayer = g.append('g').attr('class', 'label-layer');
        } else {
            labelLayer.raise();
        }

        // Data join for label groups
        const labels = labelLayer.selectAll<SVGGElement, SankeyNode>('.label-group')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .data(nodes, (d: any) => d.id);

        const labelsEnter = labels.enter()
            .append('g')
            .attr('class', 'label-group cursor-grab active:cursor-grabbing')
            .attr('id', d => `label-${d.id}`);

        // Initial setup for new labels
        labelsEnter.append('text')
            .attr('class', 'node-label')
            .attr('fill', '#1f2937');

        labelsEnter.append('text')
            .attr('class', 'value-label')
            .attr('fill', '#6b7280');

        // Add second line text
        labelsEnter.append('text')
            .attr('class', 'second-line-label')
            .attr('fill', '#059669');

        // Add third line text
        labelsEnter.append('text')
            .attr('class', 'third-line-label')
            .attr('fill', '#6b7280');

        labels.exit().remove();

        // Update all labels
        const allLabels = labelsEnter.merge(labels);

        // Label Drag Behavior
        let isDragging = false;
        let dragStartTime = 0;

        const labelDrag = d3.drag<SVGGElement, SankeyNode>()
            .subject(function (event, d) {
                const customPos = state.customLayout.labels[d.id];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dAny = d as any;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const minX = d3.min(nodes, (n: any) => n.x0 ?? 0) ?? 0;

                const isFirstColumn = (dAny.x0 ?? 0) === minX;
                const isLeft = settings.labelPosition === 'left' || isFirstColumn;
                const defaultX = isLeft ? (dAny.x0 ?? 0) - 8 : (dAny.x1 ?? 0) + 8;
                const defaultY = ((dAny.y1 ?? 0) + (dAny.y0 ?? 0)) / 2;

                const currentX = defaultX + (customPos?.x ?? 0);
                const currentY = defaultY + (customPos?.y ?? 0);

                return { x: currentX, y: currentY };
            })
            .on('start', function () {
                isDragging = false;
                dragStartTime = Date.now();
                d3.select(this).classed('dragging', true);
            })
            .on('drag', function (event) {
                isDragging = true;
                d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
            })
            .on('end', function (event, d) {
                d3.select(this).classed('dragging', false);

                const dragDuration = Date.now() - dragStartTime;

                // If it was a quick click without movement, trigger edit mode
                if (!isDragging && dragDuration < 200) {
                    const group = d3.select(this);
                    const currentName = d.name;

                    const transform = group.attr('transform');
                    const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
                    if (!match) return;

                    const [, x, y] = match;

                    svg.selectAll('.label-edit-input').remove();

                    const foreignObj = svg.append('foreignObject')
                        .attr('class', 'label-edit-input')
                        .attr('x', parseFloat(x) - 100)
                        .attr('y', parseFloat(y) - 15)
                        .attr('width', 200)
                        .attr('height', 80)
                        .style('pointer-events', 'all')
                        .style('z-index', '9999');

                    const textarea = foreignObj.append('xhtml:textarea')
                        .attr('class', 'p-2 w-full h-full border-2 border-blue-500 rounded font-semibold bg-white shadow-md resize-none outline-none')
                        .text(currentName)
                        .style('font-family', settings.labelFontFamily)
                        .style('font-size', `${settings.labelFontSize}px`);

                    const textareaNode = textarea.node() as HTMLTextAreaElement;
                    setTimeout(() => {
                        textareaNode?.focus();
                        textareaNode?.select();
                    }, 0);

                    let isClosing = false;
                    const saveEdit = () => {
                        if (isClosing) return;
                        isClosing = true;

                        const newName = textareaNode?.value.trim();
                        if (newName && newName !== currentName) {
                            dispatch({ type: 'UPDATE_NODE', payload: { id: d.id, updates: { name: newName } } });
                        }
                        if (foreignObj.node()) {
                            foreignObj.remove();
                        }
                    };

                    const cancelEdit = () => {
                        if (isClosing) return;
                        isClosing = true;
                        if (foreignObj.node()) {
                            foreignObj.remove();
                        }
                    };

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    textarea.on('keydown', function (event: any) {
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelEdit();
                        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                            // Ctrl+Enter to save
                            event.preventDefault();
                            textareaNode?.blur();
                        }
                    });

                    textarea.on('blur', saveEdit);
                    return;
                }

                if (isDragging) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dAny = d as any;
                    const isFirstColumn = (dAny.x0 ?? 0) === minX;
                    const isLeft = settings.labelPosition === 'left' || isFirstColumn;
                    const defaultX = isLeft ? (dAny.x0 ?? 0) - 8 : (dAny.x1 ?? 0) + 8;
                    const defaultY = ((dAny.y1 ?? 0) + (dAny.y0 ?? 0)) / 2;

                    const dx = event.x - defaultX;
                    const dy = event.y - defaultY;

                    dispatch({
                        type: 'UPDATE_LAYOUT',
                        payload: { id: d.id, type: 'label', x: dx, y: dy }
                    });
                }
            });

        allLabels
            .call(labelDrag)
            .on('dblclick', function (event, d) {
                event.stopPropagation();
                dispatch({
                    type: 'UPDATE_LAYOUT',
                    payload: { id: d.id, type: 'label', x: undefined, y: undefined }
                });
            });

        // Update content and position
        allLabels.each(function (d) {
            const group = d3.select(this);
            const customPos = state.customLayout.labels[d.id];
            const customization = getCustomization(d.id);

            // Defensive check: ensure node has valid positioning
            if (d.x0 === undefined || d.x1 === undefined || d.y0 === undefined || d.y1 === undefined) {
                console.warn('Skipping label for node with invalid position:', d.id);
                return;
            }

            // Calculate default position
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isFirstColumn = (d.x0 ?? 0) === minX;
            const isLeft = settings.labelPosition === 'left' || isFirstColumn;
            const defaultX = isLeft ? (d.x0 ?? 0) - 8 : (d.x1 ?? 0) + 8;
            const defaultY = ((d.y1 ?? 0) + (d.y0 ?? 0)) / 2;

            const x = defaultX + (customPos?.x ?? 0);
            const y = defaultY + (customPos?.y ?? 0);

            group.attr('transform', `translate(${x},${y})`);

            const isMoved = !!customPos;

            // Determine text anchor based on customization or default position
            let textAnchor: 'start' | 'middle' | 'end';
            if (customization?.labelAlignment) {
                // Use explicit alignment setting
                textAnchor = customization.labelAlignment === 'left' ? 'end' :
                    customization.labelAlignment === 'right' ? 'start' : 'middle';
            } else {
                // Default behavior
                textAnchor = isMoved ? 'start' : (isLeft ? 'end' : 'start');
            }

            // Per-node style overrides
            const fontSize = customization?.labelFontSize ?? settings.labelFontSize;
            const fontFamily = customization?.labelFontFamily ?? settings.labelFontFamily;
            const fontWeight = (customization?.labelBold ?? settings.labelBold) ? 'bold' : '600';
            const fontStyle = (customization?.labelItalic ?? settings.labelItalic) ? 'italic' : 'normal';
            const labelColor = customization?.labelColor ?? '#1f2937';

            // Name Label
            // Name Label (Multi-line support)
            const textEl = group.select<SVGTextElement>('.node-label');
            textEl.selectAll('*').remove(); // Clear existing text

            textEl
                .attr('text-anchor', textAnchor)
                .attr('font-family', fontFamily)
                .attr('font-size', fontSize)
                .attr('font-weight', fontWeight)
                .attr('font-style', fontStyle)
                .attr('fill', labelColor);

            const lines = d.name.split('\n');
            lines.forEach((line: string, i: number) => {
                textEl.append('tspan')
                    .attr('x', 0)
                    .attr('dy', i === 0 ? '-0.15em' : '1.2em')
                    .text(line);
            });

            // Value Label
            const valueColor = customization?.valueColor ?? '#6b7280';
            const valueFontSize = customization?.valueFontSize ?? (fontSize - 1);
            const valueBold = customization?.valueBold ?? false;
            const valueAlignment = customization?.valueAlignment;
            const valueAnchor = valueAlignment ?
                (valueAlignment === 'left' ? 'end' : valueAlignment === 'right' ? 'start' : 'middle') : textAnchor;

            const valueLabel = group.select<SVGTextElement>('.value-label')
                .text(formatValue(d.value || 0))
                .attr('dy', '1em')
                .attr('text-anchor', valueAnchor)
                .attr('font-family', fontFamily)
                .attr('font-size', valueFontSize)
                .attr('font-weight', valueBold ? 'bold' : '500')
                .attr('fill', valueColor);

            // Second Line Label
            const secondLine = group.select<SVGTextElement>('.second-line-label');
            if (customization?.showSecondLine && customization?.secondLineText) {
                const secondLineColor = customization?.secondLineColor ?? '#059669';
                const secondLineFontSize = customization?.secondLineFontSize ?? (fontSize - 1);
                const secondLineBold = customization?.secondLineBold ?? false;
                const secondLineAlignment = customization?.secondLineAlignment;
                const secondLineAnchor = secondLineAlignment ?
                    (secondLineAlignment === 'left' ? 'end' : secondLineAlignment === 'right' ? 'start' : 'middle') : textAnchor;

                secondLine
                    .text(customization.secondLineText)
                    .attr('dy', '2.2em')
                    .attr('text-anchor', secondLineAnchor)
                    .attr('font-family', fontFamily)
                    .attr('font-size', secondLineFontSize)
                    .attr('font-weight', secondLineBold ? 'bold' : '600')
                    .attr('fill', secondLineColor)
                    .attr('visibility', 'visible');
            } else {
                secondLine.attr('visibility', 'hidden');
            }

            // Third Line Label
            const thirdLine = group.select<SVGTextElement>('.third-line-label');
            if (customization?.showThirdLine && customization?.thirdLineText) {
                const thirdLineColor = customization?.thirdLineColor ?? '#6b7280';
                const thirdLineFontSize = customization?.thirdLineFontSize ?? (fontSize - 2);
                const thirdLineBold = customization?.thirdLineBold ?? false;
                const thirdLineAlignment = customization?.thirdLineAlignment;
                const thirdLineAnchor = thirdLineAlignment ?
                    (thirdLineAlignment === 'left' ? 'end' : thirdLineAlignment === 'right' ? 'start' : 'middle') : textAnchor;

                thirdLine
                    .text(customization.thirdLineText)
                    .attr('dy', '3.4em')
                    .attr('text-anchor', thirdLineAnchor)
                    .attr('font-family', fontFamily)
                    .attr('font-size', thirdLineFontSize)
                    .attr('font-weight', thirdLineBold ? 'bold' : '500')
                    .attr('fill', thirdLineColor)
                    .attr('visibility', 'visible');
            } else {
                thirdLine.attr('visibility', 'hidden');
            }

            // Background Box
            const nameBBox = group.select<SVGTextElement>('.node-label').node()?.getBBox();
            const valueBBox = valueLabel.node()?.getBBox();

            if (nameBBox && valueBBox) {
                const boxPadding = customization?.labelPadding ?? 4;
                const boxWidth = Math.max(nameBBox.width, valueBBox.width) + (boxPadding * 2);
                const boxHeight = (valueBBox.y + valueBBox.height) - nameBBox.y + (boxPadding * 2);

                let rectX = 0;
                if (textAnchor === 'end') {
                    rectX = -boxWidth + boxPadding;
                } else if (textAnchor === 'middle') {
                    rectX = -boxWidth / 2;
                } else {
                    rectX = -boxPadding;
                }

                const rectY = nameBBox.y - boxPadding;

                let bgRect = group.select<SVGRectElement>('.label-bg');
                if (bgRect.empty()) {
                    bgRect = group.insert('rect', 'text')
                        .attr('class', 'label-bg');
                }

                // Apply custom background styling if enabled
                const showBackground = customization?.showLabelBackground ?? isMoved;
                const backgroundColor = customization?.showLabelBackground && customization?.labelBackgroundColor
                    ? customization.labelBackgroundColor
                    : 'rgba(255, 255, 255, 0.9)';
                const borderColor = customization?.labelBorderColor ?? '#e5e7eb';
                const borderWidth = customization?.labelBorderWidth ?? 1;
                const borderRadius = customization?.labelBorderRadius ?? 4;
                const backgroundOpacity = customization?.labelBackgroundOpacity ?? 1;

                bgRect
                    .attr('x', rectX)
                    .attr('y', rectY)
                    .attr('width', boxWidth)
                    .attr('height', boxHeight)
                    .attr('fill', showBackground ? backgroundColor : 'none')
                    .attr('fill-opacity', backgroundOpacity)
                    .attr('stroke', showBackground ? borderColor : 'none')
                    .attr('stroke-width', borderWidth)
                    .attr('rx', borderRadius)
                    .attr('ry', borderRadius)
                    .style('pointer-events', 'none');
            }
        });

        // --- INDEPENDENT LABELS RENDERING ---
        const { independentLabels, selectedLabelId } = state;

        if (independentLabels && independentLabels.length > 0) {
            // Create or select labels layer
            let labelsLayer = g.select<SVGGElement>('.independent-labels-layer');
            if (labelsLayer.empty()) {
                labelsLayer = g.append('g').attr('class', 'independent-labels-layer');
            } else {
                labelsLayer.raise();
            }

            // Data join for independent labels
            const labels = labelsLayer.selectAll<SVGGElement, typeof independentLabels[0]>('.independent-label')
                .data(independentLabels, (d) => d.id);

            // Remove old labels
            labels.exit().remove();

            // Create new labels
            const labelsEnter = labels.enter()
                .append('g')
                .attr('class', 'independent-label cursor-grab active:cursor-grabbing')
                .attr('id', d => `independent-label-${d.id}`);

            // Add background rect
            labelsEnter.append('rect')
                .attr('class', 'label-background')
                .style('pointer-events', 'all');

            // Add text element
            labelsEnter.append('text')
                .attr('class', 'label-text')
                .style('pointer-events', 'none');

            // Merge enter + update selections
            const allLabels = labelsEnter.merge(labels);

            // Drag behavior for independent labels
            let isDragging = false;
            let dragStartTime = 0;
            let lastClickTime = 0;

            const labelDrag = d3.drag<SVGGElement, typeof independentLabels[0]>()
                .subject(function (event, d) {
                    return { x: d.x, y: d.y };
                })
                .on('start', function () {
                    isDragging = false;
                    dragStartTime = Date.now();
                    d3.select(this).classed('dragging', true);
                })
                .on('drag', function (event) {
                    // Only consider it a drag if moved significantly? 
                    // D3 handles this generally, but let's be sure
                    isDragging = true;
                    d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
                })
                .on('end', function (event, d) {
                    d3.select(this).classed('dragging', false);
                    const dragDuration = Date.now() - dragStartTime;
                    const now = Date.now();

                    // If short click
                    if (!isDragging && dragDuration < 200) {
                        // Check for double click
                        if (now - lastClickTimeRef.current < 300) {
                            if (d.type === 'box') return;

                            // Double Click detected - Trigger Edit
                            const group = d3.select(this);
                            const currentText = d.text;

                            // Remove any existing edit inputs
                            svg.selectAll('.label-edit-input').remove();

                            // Create foreignObject for text editing
                            const foreignObj = svg.append('foreignObject')
                                .attr('class', 'label-edit-input')
                                .attr('x', d.x - 100)
                                .attr('y', d.y - 25) // Center-ish
                                .attr('width', 200)
                                .attr('height', 100) // Give room for multi-line
                                .style('pointer-events', 'all')
                                .style('z-index', '9999');

                            const textarea = foreignObj.append('xhtml:textarea')
                                .text(currentText)
                                .style('width', '100%')
                                .style('height', '100%')
                                .style('padding', '8px')
                                .style('border', '2px solid #3b82f6')
                                .style('border-radius', '4px')
                                .style('font-family', d.fontFamily || settings.labelFontFamily)
                                .style('font-size', `${d.fontSize || 16}px`)
                                .style('font-weight', d.bold ? 'bold' : 'normal')
                                .style('font-style', d.italic ? 'italic' : 'normal')
                                .style('outline', 'none')
                                .style('background', 'white')
                                .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
                                .style('resize', 'none');

                            const textareaNode = textarea.node() as HTMLTextAreaElement;
                            setTimeout(() => {
                                textareaNode?.focus();
                                textareaNode?.select();
                            }, 0);

                            const saveEdit = () => {
                                const newText = textareaNode?.value.trim();
                                if (newText && newText !== currentText) {
                                    dispatch({
                                        type: 'UPDATE_INDEPENDENT_LABEL',
                                        payload: { id: d.id, updates: { text: newText } }
                                    });
                                }
                                foreignObj.remove();
                            };

                            const cancelEdit = () => {
                                foreignObj.remove();
                            };

                            textarea.on('keydown', function (event: any) {
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelEdit();
                                }
                                // Allow Ctrl+Enter or Cmd+Enter to save (standard for textareas)
                                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                                    event.preventDefault();
                                    saveEdit();
                                }
                            });

                            textarea.on('blur', saveEdit);
                        } else {
                            // Single Click
                            dispatch({ type: 'SELECT_LABEL', payload: d.id });
                        }

                        lastClickTimeRef.current = now;
                        return;
                    }

                    // If dragged, update position
                    if (isDragging) {
                        dispatch({
                            type: 'UPDATE_INDEPENDENT_LABEL',
                            payload: { id: d.id, updates: { x: event.x, y: event.y } }
                        });
                    }
                });

            // Remove independent DblClick listener as it's handled in drag.end
            // allLabels.on('dblclick', ...); <-- Removed

            // Apply drag behavior
            allLabels.call(labelDrag);

            // Update positions and styling
            allLabels.each(function (d) {
                const group = d3.select(this);
                const textEl = group.select<SVGTextElement>('.label-text');
                const bgRect = group.select<SVGRectElement>('.label-background');

                // Position the group
                group.attr('transform', `translate(${d.x},${d.y})`);

                if (d.type === 'box') {
                    // --- BOX RENDERING ---
                    const width = d.width || 100;
                    const height = d.height || 100;

                    // Hide text element
                    textEl.attr('display', 'none');

                    // Render Box
                    // Centered to match text behavior (which is usually centered around x,y)
                    bgRect
                        .attr('x', -width / 2)
                        .attr('y', -height / 2)
                        .attr('width', width)
                        .attr('height', height)
                        .attr('fill', d.backgroundColor || '#e5e7eb')
                        .attr('fill-opacity', d.backgroundOpacity ?? 1)
                        .attr('stroke', d.borderColor || '#9ca3af')
                        .attr('stroke-width', d.borderWidth ?? 1)
                        .attr('rx', d.borderRadius ?? 4)
                        .attr('ry', d.borderRadius ?? 4)
                        .style('pointer-events', 'all'); // Ensure selectable

                    // Highlight selected label
                    if (selectedLabelId === d.id) {
                        bgRect
                            .attr('stroke', '#3b82f6')
                            .attr('stroke-width', 2);
                    }

                } else {
                    // --- TEXT RENDERING ---
                    textEl.attr('display', 'block');

                    // Apply text styling
                    const fontSize = d.fontSize || 16;
                    const fontFamily = d.fontFamily || settings.labelFontFamily;
                    const color = d.color || '#1f2937';
                    const fontWeight = d.bold ? 'bold' : 'normal';
                    const fontStyle = d.italic ? 'italic' : 'normal';

                    // Handle multi-line text
                    textEl.selectAll('*').remove();
                    const lines = d.text.split('\n');
                    lines.forEach((line, i) => {
                        textEl.append('tspan')
                            .attr('x', 0)
                            .attr('dy', i === 0 ? 0 : '1.2em')
                            .text(line);
                    });

                    textEl
                        .attr('text-anchor', d.align === 'left' ? 'start' : d.align === 'right' ? 'end' : 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-family', fontFamily)
                        .attr('font-size', fontSize)
                        .attr('font-weight', fontWeight)
                        .attr('font-style', fontStyle)
                        .attr('fill', color);

                    // Get text bounding box for background
                    const textBBox = textEl.node()?.getBBox();

                    if (textBBox) {
                        const padding = d.padding ?? 8;
                        const bgColor = d.backgroundColor;
                        const bgOpacity = d.backgroundOpacity ?? 1;
                        const borderColor = d.borderColor;
                        const borderWidth = d.borderWidth ?? 1;
                        const borderRadius = d.borderRadius ?? 4;

                        // Only show background if backgroundColor is set
                        if (bgColor) {
                            bgRect
                                .attr('x', textBBox.x - padding)
                                .attr('y', textBBox.y - padding)
                                .attr('width', textBBox.width + (padding * 2))
                                .attr('height', textBBox.height + (padding * 2))
                                .attr('fill', bgColor)
                                .attr('fill-opacity', bgOpacity)
                                .attr('stroke', borderColor || 'none')
                                .attr('stroke-width', borderColor ? borderWidth : 0)
                                .attr('rx', borderRadius)
                                .attr('ry', borderRadius)
                                .lower(); // Ensure background is behind text
                        } else {
                            // Use transparent fill to ensure pointer events are captured anywhere in the box
                            bgRect
                                .attr('x', textBBox.x - padding)
                                .attr('y', textBBox.y - padding)
                                .attr('width', textBBox.width + (padding * 2))
                                .attr('height', textBBox.height + (padding * 2))
                                .attr('fill', 'transparent')
                                .attr('stroke', 'none');
                        }

                        // Highlight selected label
                        if (selectedLabelId === d.id) {
                            bgRect
                                .attr('stroke', '#3b82f6')
                                .attr('stroke-width', 2)
                                .attr('stroke-dasharray', '4,2');
                        } else if (!borderColor && bgColor) {
                            bgRect.attr('stroke', 'none');
                        }
                    } else {
                        bgRect.attr('fill', 'none').attr('stroke', 'none');
                    }
                }
            });
        }

        return () => {
            tooltip.style('visibility', 'hidden');
        };

    }, [data, settings, selectedNodeId, selectedLinkIndex, dispatch, getNodeColor, formatValue, state.customLayout, state.independentLabels, state.selectedLabelId, getCustomization, handleNodeClick]);

    return (
        <div ref={containerRef} className="w-full h-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-lg shadow-sm overflow-hidden relative">
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${settings.width} ${settings.height}`}
                className="w-full h-full"
                style={{ minHeight: '600px' }}
            />

            {/* Empty State Overlay */}
            {(!data.nodes.length || !data.links.length) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[var(--panel-bg)]/80 backdrop-blur-sm z-10">
                    <div className="w-16 h-16 mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-[var(--primary-text)] mb-2">
                        No flows to display
                    </h3>
                    <p className="text-[var(--secondary-text)] max-w-sm mb-6">
                        Start by adding data in the Data Editor or try one of the templates.
                    </p>
                    <p className="text-xs text-[var(--secondary-text)] opacity-60">
                        (Tip: Try clicking "Templates" in the sidebar)
                    </p>
                </div>
            )}

            {/* Floating Zoom Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => {
                        const svg = d3.select(svgRef.current);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const zoom = (svg.node() as any).__zoomBehavior;
                        if (zoom) {
                            svg.transition().duration(300).call(zoom.scaleBy, 1.2);
                        }
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300"
                    title="Zoom In"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                <button
                    onClick={() => {
                        const svg = d3.select(svgRef.current);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const zoom = (svg.node() as any).__zoomBehavior;
                        if (zoom) {
                            svg.transition().duration(300).call(zoom.scaleBy, 0.8);
                        }
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300"
                    title="Zoom Out"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                </button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5" />
                <button
                    onClick={() => {
                        const svg = d3.select(svgRef.current);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const zoom = (svg.node() as any).__zoomBehavior;
                        const content = svg.select('g');

                        if (zoom && !content.empty()) {
                            // Get bounding box of the content
                            const bounds = (content.node() as SVGGElement).getBBox();
                            const fullWidth = settings.width;
                            const fullHeight = settings.height;

                            // Calculate scale to fit
                            const padding = 40;
                            const widthRatio = (fullWidth - padding * 2) / bounds.width;
                            const heightRatio = (fullHeight - padding * 2) / bounds.height;
                            const scale = Math.min(widthRatio, heightRatio, 1); // Don't zoom in too much if small

                            // Calculate translation to centering
                            const x = (fullWidth - bounds.width * scale) / 2 - bounds.x * scale;
                            const y = (fullHeight - bounds.height * scale) / 2 - bounds.y * scale;

                            // Apply transform
                            svg.transition().duration(750)
                                .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
                        } else if (zoom) {
                            // Fallback if no content
                            svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
                        }
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300"
                    title="Fit to Screen"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>

            {/* Top Toolbar (Undo/Redo & Export) */}
            <div className="absolute top-4 right-4 flex gap-2">
                {/* History Controls */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <button
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onClick={() => (dispatch as any)({ type: 'UNDO' })} // Type casting for ease, better to expose Undo from context
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300 disabled:opacity-30"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo className="w-4 h-4" />
                    </button>
                    <button
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onClick={() => (dispatch as any)({ type: 'REDO' })}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300 disabled:opacity-30"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo className="w-4 h-4" />
                    </button>
                </div>

                {/* Export Controls */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => {
                            if (!svgRef.current) return;
                            const serializer = new XMLSerializer();
                            const source = serializer.serializeToString(svgRef.current);
                            const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'sankey-diagram.svg';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300"
                        title="Export SVG"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            if (!svgRef.current || !containerRef.current) return;
                            const svgData = new XMLSerializer().serializeToString(svgRef.current);
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const img = new Image();

                            // Get actual size
                            const { width, height } = settings;
                            // Scale up for high res
                            const scale = 2;
                            canvas.width = width * scale;
                            canvas.height = height * scale;

                            img.onload = () => {
                                if (ctx) {
                                    ctx.scale(scale, scale);
                                    // Fill white background
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillRect(0, 0, width, height);
                                    ctx.drawImage(img, 0, 0);
                                    const pngFile = canvas.toDataURL('image/png');
                                    const downloadLink = document.createElement('a');
                                    downloadLink.download = 'sankey-diagram.png';
                                    downloadLink.href = pngFile;
                                    downloadLink.click();
                                }
                            };

                            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-700 dark:text-gray-300"
                        title="Export PNG"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {popover && (
                <NodeEditPopover
                    node={popover.node}
                    position={popover.position}
                    onClose={closePopover}
                />
            )}
        </div>
    );
}
