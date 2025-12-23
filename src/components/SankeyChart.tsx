import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Center, Text, useColorModeValue } from '@chakra-ui/react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode as D3SankeyNode, SankeyLink as D3SankeyLink } from 'd3-sankey';
import { useDiagramStore, Flow } from '../store/useDiagramStore';
import { isDragThresholdMet } from '../utils/dragThreshold';

// Zoom limits
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// Default extent for zoom behavior (used when SVG dimensions can't be determined)
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

// ============================================================================
// Type Definitions
// ============================================================================

interface SankeyNodeExtra {
  name: string;
}

interface SankeyLinkExtra {
  flowId: string;
}

type SankeyNodeType = D3SankeyNode<SankeyNodeExtra, SankeyLinkExtra>;
type SankeyLinkType = D3SankeyLink<SankeyNodeExtra, SankeyLinkExtra>;

interface SankeyChartProps {
  width?: number;
  height?: number;
  /** Reference to the SVG element for export functionality */
  svgRef?: React.RefObject<SVGSVGElement>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Resolves the color for a flow based on the color scheme and customizations
 */
export function getFlowColor(
  flow: Flow,
  sourceNodeColor: string | undefined,
  targetNodeColor: string | undefined,
  colorScheme: 'source' | 'target' | 'gradient'
): string {
  // Custom color override takes precedence
  if (flow.color) {
    return flow.color;
  }

  const defaultColor = '#a0aec0'; // gray.400

  switch (colorScheme) {
    case 'source':
      return sourceNodeColor || defaultColor;
    case 'target':
      return targetNodeColor || defaultColor;
    case 'gradient':
      // For gradient, we return the source color and handle gradient in rendering
      return sourceNodeColor || defaultColor;
    default:
      return defaultColor;
  }
}

/**
 * Creates a unique gradient ID for a flow
 */
function getGradientId(flowId: string): string {
  return `gradient-${flowId}`;
}

/**
 * Builds a graph structure from flows for d3-sankey
 */
function buildGraph(flows: Flow[]): { nodes: SankeyNodeExtra[]; links: { source: number; target: number; value: number; flowId: string }[] } {
  // Get unique node names
  const nodeNames = new Set<string>();
  flows.forEach(flow => {
    if (flow.source && flow.target && flow.value > 0) {
      nodeNames.add(flow.source);
      nodeNames.add(flow.target);
    }
  });

  const nodes: SankeyNodeExtra[] = Array.from(nodeNames).map(name => ({ name }));
  const nodeIndex = new Map(nodes.map((n, i) => [n.name, i]));

  const links = flows
    .filter(flow => flow.source && flow.target && flow.value > 0)
    .map(flow => ({
      source: nodeIndex.get(flow.source)!,
      target: nodeIndex.get(flow.target)!,
      value: flow.value,
      flowId: flow.id,
    }));

  return { nodes, links };
}

// ============================================================================
// Default Node Colors
// ============================================================================

const DEFAULT_NODE_COLORS = [
  '#3182ce', // blue.500
  '#38a169', // green.500
  '#d69e2e', // yellow.500
  '#e53e3e', // red.500
  '#805ad5', // purple.500
  '#dd6b20', // orange.500
  '#319795', // teal.500
  '#d53f8c', // pink.500
];

function getDefaultNodeColor(index: number): string {
  return DEFAULT_NODE_COLORS[index % DEFAULT_NODE_COLORS.length] || '#a0aec0';
}

// ============================================================================
// SankeyChart Component
// ============================================================================

function SankeyChart({ svgRef: externalSvgRef }: SankeyChartProps) {
  const bgColor = useColorModeValue('white', 'gray.900');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const emptyTextColor = useColorModeValue('gray.500', 'gray.400');

  // Internal ref if no external ref provided
  const internalSvgRef = useRef<SVGSVGElement>(null);
  const svgRef = externalSvgRef || internalSvgRef;
  
  // Ref for the main content group that will be transformed
  const contentGroupRef = useRef<SVGGElement>(null);
  
  // Store state and actions
  const {
    flows,
    nodeCustomizations,
    settings,
    zoom,
    panX,
    panY,
    setZoom,
    setPan,
    activeTool,
    setSelectedNode,
    setSelectedFlow,
    updateNodePosition,
    saveSnapshot,
  } = useDiagramStore((state) => ({
    flows: state.flows,
    nodeCustomizations: state.nodeCustomizations,
    settings: state.settings,
    zoom: state.ui.zoom,
    panX: state.ui.panX,
    panY: state.ui.panY,
    setZoom: state.setZoom,
    setPan: state.setPan,
    activeTool: state.ui.activeTool,
    setSelectedNode: state.setSelectedNode,
    setSelectedFlow: state.setSelectedFlow,
    updateNodePosition: state.updateNodePosition,
    saveSnapshot: state.saveSnapshot,
  }));

  // Calculate sankey layout when flows change
  const { nodes, links, nodeColorMap } = useMemo(() => {
    const validFlows = flows.filter(f => f.source && f.target && f.value > 0);
    
    if (validFlows.length === 0) {
      return { nodes: [] as SankeyNodeType[], links: [] as SankeyLinkType[], nodeColorMap: new Map<string, string>() };
    }

    const graph = buildGraph(validFlows);
    
    if (graph.nodes.length === 0) {
      return { nodes: [] as SankeyNodeType[], links: [] as SankeyLinkType[], nodeColorMap: new Map<string, string>() };
    }

    const { width, height, nodeWidth, nodePadding } = settings;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const sankeyGenerator = sankey<SankeyNodeExtra, SankeyLinkExtra>()
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom]
      ]);

    const sankeyData = sankeyGenerator({
      nodes: graph.nodes.map(d => ({ ...d })),
      links: graph.links.map(d => ({ ...d })),
    });

    // Build node color map
    const colorMap = new Map<string, string>();
    sankeyData.nodes.forEach((node, index) => {
      const customization = nodeCustomizations[node.name];
      colorMap.set(node.name, customization?.color || getDefaultNodeColor(index));
    });

    return {
      nodes: sankeyData.nodes,
      links: sankeyData.links,
      nodeColorMap: colorMap,
    };
  }, [flows, settings, nodeCustomizations]);

  // Apply customizations to nodes (merge D3 positions with user overrides)
  const positionedNodes = useMemo(() => {
    return nodes.map(node => {
      const customization = nodeCustomizations[node.name];
      if (customization?.x !== undefined && customization?.y !== undefined) {
        const nodeHeight = (node.y1 ?? 0) - (node.y0 ?? 0);
        const nodeWidth = (node.x1 ?? 0) - (node.x0 ?? 0);
        return {
          ...node,
          x0: customization.x,
          x1: customization.x + nodeWidth,
          y0: customization.y,
          y1: customization.y + nodeHeight,
        };
      }
      return node;
    });
  }, [nodes, nodeCustomizations]);

  // Apply transform to content group
  const applyTransform = useCallback(() => {
    if (contentGroupRef.current) {
      contentGroupRef.current.setAttribute(
        'transform',
        `translate(${panX}, ${panY}) scale(${zoom})`
      );
    }
  }, [zoom, panX, panY]);

  // Apply transform whenever zoom or pan changes
  useEffect(() => {
    applyTransform();
  }, [applyTransform]);

  // D3 rendering effect
  useEffect(() => {
    if (!svgRef.current || !contentGroupRef.current) return;

    const contentGroup = d3.select(contentGroupRef.current);

    // Clear previous content
    contentGroup.selectAll('*').remove();

    if (positionedNodes.length === 0) {
      return;
    }

    // Create defs for gradients
    const defs = contentGroup.append('defs');

    // Create gradients for flows (used when colorScheme is 'gradient')
    links.forEach(link => {
      const sourceNode = link.source as SankeyNodeType;
      const targetNode = link.target as SankeyNodeType;
      const flowId = (link as unknown as { flowId: string }).flowId;
      
      const gradient = defs.append('linearGradient')
        .attr('id', getGradientId(flowId))
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', sourceNode.x1 ?? 0)
        .attr('x2', targetNode.x0 ?? 0);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', nodeColorMap.get(sourceNode.name) || '#a0aec0');

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', nodeColorMap.get(targetNode.name) || '#a0aec0');
    });

    // Render links
    const linkGroup = contentGroup.append('g')
      .attr('class', 'links')
      .attr('fill', 'none');

    linkGroup.selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d) => {
        const sourceNode = d.source as SankeyNodeType;
        const targetNode = d.target as SankeyNodeType;
        const flowId = (d as unknown as { flowId: string }).flowId;
        const flow = flows.find(f => f.id === flowId);
        
        if (!flow) return '#a0aec0';

        // Custom color override takes precedence
        if (flow.color) {
          return flow.color;
        }

        const sourceColor = nodeColorMap.get(sourceNode.name);
        const targetColor = nodeColorMap.get(targetNode.name);

        switch (settings.colorScheme) {
          case 'source':
            return sourceColor || '#a0aec0';
          case 'target':
            return targetColor || '#a0aec0';
          case 'gradient':
            return `url(#${getGradientId(flowId)})`;
          default:
            return '#a0aec0';
        }
      })
      .attr('stroke-width', d => Math.max(1, d.width ?? 0))
      .attr('stroke-opacity', (d) => {
        const flowId = (d as unknown as { flowId: string }).flowId;
        const flow = flows.find(f => f.id === flowId);
        return flow?.opacity ?? settings.flowOpacity;
      })
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        const flowId = (d as unknown as { flowId: string }).flowId;
        setSelectedFlow(flowId);
        setSelectedNode(null);
      });

    // Render nodes
    const nodeGroup = contentGroup.append('g')
      .attr('class', 'nodes');

    const nodeSelection = nodeGroup.selectAll('g')
      .data(positionedNodes)
      .join('g')
      .attr('class', 'node');

    // Add rectangles for nodes
    nodeSelection.append('rect')
      .attr('x', d => d.x0 ?? 0)
      .attr('y', d => d.y0 ?? 0)
      .attr('width', d => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', d => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr('fill', d => {
        const customization = nodeCustomizations[d.name];
        return customization?.color || nodeColorMap.get(d.name) || '#a0aec0';
      })
      .attr('fill-opacity', d => {
        const customization = nodeCustomizations[d.name];
        return customization?.opacity ?? 1;
      })
      .style('cursor', activeTool === 'select' ? 'pointer' : 'default');

    // Add labels for nodes
    nodeSelection.append('text')
      .attr('x', d => {
        const x0 = d.x0 ?? 0;
        const x1 = d.x1 ?? 0;
        // Position label to the right of node if on left side, left if on right side
        return x0 < settings.width / 2 ? x1 + 6 : x0 - 6;
      })
      .attr('y', d => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 ?? 0) < settings.width / 2 ? 'start' : 'end')
      .attr('font-size', '12px')
      .attr('fill', textColor)
      .text(d => d.name);

    // Add drag behavior to nodes
    const drag = d3.drag<SVGRectElement, SankeyNodeType>()
      .on('start', function(event, d) {
        // Store initial position for threshold check
        (d as unknown as { dragStartX: number; dragStartY: number }).dragStartX = event.x;
        (d as unknown as { dragStartY: number }).dragStartY = event.y;
      })
      .on('drag', function(event, d) {
        // Visual update only during drag
        const dx = event.x - (d as unknown as { dragStartX: number }).dragStartX;
        const dy = event.y - (d as unknown as { dragStartY: number }).dragStartY;
        
        const newX = (d.x0 ?? 0) + dx;
        const newY = (d.y0 ?? 0) + dy;
        const nodeWidth = (d.x1 ?? 0) - (d.x0 ?? 0);
        const nodeHeight = (d.y1 ?? 0) - (d.y0 ?? 0);

        // Update visual position
        d3.select(this)
          .attr('x', newX)
          .attr('y', newY);

        // Update label position
        const parent = d3.select(this.parentNode as SVGGElement);
        parent.select('text')
          .attr('x', newX < settings.width / 2 ? newX + nodeWidth + 6 : newX - 6)
          .attr('y', newY + nodeHeight / 2);
      })
      .on('end', function(event, d) {
        const startX = (d as unknown as { dragStartX: number }).dragStartX;
        const startY = (d as unknown as { dragStartY: number }).dragStartY;
        
        // Check if this was a click or a drag using the threshold utility
        if (!isDragThresholdMet({ x: startX, y: startY }, { x: event.x, y: event.y })) {
          // Treat as click - select the node
          setSelectedNode(d.name);
          setSelectedFlow(null);
        } else {
          // Persist drag position to store
          const dx = event.x - startX;
          const dy = event.y - startY;
          const newX = (d.x0 ?? 0) + dx;
          const newY = (d.y0 ?? 0) + dy;
          
          saveSnapshot();
          updateNodePosition(d.name, newX, newY);
        }
      });

    // Apply drag behavior to node rectangles
    nodeSelection.selectAll<SVGRectElement, SankeyNodeType>('rect')
      .call(drag);

  }, [positionedNodes, links, flows, settings, nodeCustomizations, nodeColorMap, textColor, activeTool, setSelectedNode, setSelectedFlow, updateNodePosition, saveSnapshot, svgRef]);

  // Set up D3 zoom behavior
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Get SVG dimensions, with fallback for test environments
    const getSvgDimensions = (): [[number, number], [number, number]] => {
      try {
        const svgElement = svgRef.current;
        if (svgElement) {
          // Try to get dimensions from getBoundingClientRect
          const rect = svgElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return [[0, 0], [rect.width, rect.height]];
          }
          // Try to get dimensions from attributes
          const width = svgElement.getAttribute('width');
          const height = svgElement.getAttribute('height');
          if (width && height) {
            const w = parseFloat(width);
            const h = parseFloat(height);
            if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
              return [[0, 0], [w, h]];
            }
          }
        }
      } catch {
        // Fallback for test environments
      }
      return [[0, 0], [DEFAULT_WIDTH, DEFAULT_HEIGHT]];
    };

    // Create zoom behavior with explicit extent to avoid jsdom issues
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .extent(getSvgDimensions)
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { transform } = event;
        
        // Update store with new zoom and pan values
        setZoom(transform.k);
        setPan(transform.x, transform.y);
      });

    // Filter function to control when zoom/pan is active
    // When pan tool is active, allow drag for panning
    // Always allow wheel for zooming
    zoomBehavior.filter((event: Event) => {
      // Always allow wheel events for zooming
      if (event.type === 'wheel') {
        return true;
      }
      
      // For drag events (mousedown, touchstart), only allow when pan tool is active
      if (event.type === 'mousedown' || event.type === 'touchstart') {
        return activeTool === 'pan';
      }
      
      return false;
    });

    // Apply zoom behavior to SVG
    svg.call(zoomBehavior);

    // Set initial transform from store state (only if not default values)
    if (zoom !== 1 || panX !== 0 || panY !== 0) {
      try {
        const initialTransform = d3.zoomIdentity
          .translate(panX, panY)
          .scale(zoom);
        svg.call(zoomBehavior.transform, initialTransform);
      } catch {
        // Ignore errors in test environment
      }
    }

    // Cleanup
    return () => {
      svg.on('.zoom', null);
    };
  }, [svgRef, activeTool, setZoom, setPan, zoom, panX, panY]);

  const hasValidFlows = positionedNodes.length > 0;

  return (
    <Box
      w="100%"
      h="100%"
      bg={bgColor}
      position="relative"
      overflow="hidden"
    >
      {/* SVG container with zoom/pan support */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0,
          cursor: activeTool === 'pan' ? 'grab' : 'default'
        }}
      >
        {/* Main content group - this gets transformed for zoom/pan */}
        <g ref={contentGroupRef}>
          {/* D3 will render nodes and links here */}
        </g>
      </svg>
      
      {/* Placeholder message when no valid flows */}
      {!hasValidFlows && (
        <Center
          h="100%"
          border="2px dashed"
          borderColor={borderColor}
          borderRadius="md"
          m={4}
          position="relative"
          zIndex={1}
          pointerEvents="none"
        >
          <Text color={emptyTextColor} fontSize="lg" textAlign="center">
            Add flows in the Data Editor to see your Sankey diagram
            <Text as="span" display="block" fontSize="sm" mt={2}>
              Enter Source, Target, and Amount values
            </Text>
          </Text>
        </Center>
      )}
      
      {/* Zoom indicator */}
      {hasValidFlows && (
        <Box
          position="absolute"
          bottom={2}
          right={2}
          bg={bgColor}
          px={2}
          py={1}
          borderRadius="md"
          fontSize="xs"
          color={emptyTextColor}
          opacity={0.8}
        >
          Zoom: {(zoom * 100).toFixed(0)}%
        </Box>
      )}
    </Box>
  );
}

export default SankeyChart;
