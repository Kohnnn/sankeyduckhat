import { SankeyData, SankeyLink, SankeyNode, DiagramState } from '@/types/sankey';

/**
 * Flow balance analysis for a single node
 */
export interface NodeBalance {
    inflow: number;
    outflow: number;
    balance: number;
}

/**
 * Information about an imbalanced node
 */
export interface ImbalancedNode {
    node: string;
    inflow: number;
    outflow: number;
    difference: number;
    suggestion: string;
}

/**
 * Complete flow balance analysis
 */
export interface FlowBalanceAnalysis {
    nodeBalance: Record<string, NodeBalance>;
    imbalanced: ImbalancedNode[];
    totalInflow: number;
    totalOutflow: number;
    isBalanced: boolean;
}

/**
 * Validation result for diagram data
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    nodeCount?: number;
    flowCount?: number;
}

/**
 * AI changes structure
 */
export interface AIChanges {
    flows?: SankeyLink[];
    nodes?: Record<string, Partial<SankeyNode>>;
}

/**
 * Analyze flow balance for all nodes in the diagram
 * Identifies imbalanced intermediate nodes and suggests corrections
 */
export function analyzeFlowBalance(data: SankeyData): FlowBalanceAnalysis {
    const nodeBalance: Record<string, NodeBalance> = {};

    // Initialize all nodes
    data.nodes.forEach(node => {
        nodeBalance[node.id] = { inflow: 0, outflow: 0, balance: 0 };
    });

    // Calculate flows
    data.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source;
        const targetId = typeof link.target === 'string' ? link.target : link.target;

        if (nodeBalance[sourceId]) {
            nodeBalance[sourceId].outflow += link.value;
        }
        if (nodeBalance[targetId]) {
            nodeBalance[targetId].inflow += link.value;
        }
    });

    // Calculate balance and identify imbalanced nodes
    const imbalanced: ImbalancedNode[] = [];
    Object.keys(nodeBalance).forEach(nodeId => {
        const nb = nodeBalance[nodeId];
        nb.balance = nb.inflow - nb.outflow;

        // A node is imbalanced if it has both inflow and outflow but they don't match
        // Source nodes (no inflow) and sink nodes (no outflow) are naturally imbalanced
        const isSource = nb.inflow === 0 && nb.outflow > 0;
        const isSink = nb.outflow === 0 && nb.inflow > 0;

        if (!isSource && !isSink && Math.abs(nb.balance) > 0.001) {
            imbalanced.push({
                node: nodeId,
                inflow: nb.inflow,
                outflow: nb.outflow,
                difference: nb.balance,
                suggestion: nb.balance > 0
                    ? `Add outflow of ${nb.balance.toFixed(2)} from "${nodeId}"`
                    : `Add inflow of ${Math.abs(nb.balance).toFixed(2)} to "${nodeId}"`
            });
        }
    });

    const totalInflow = Object.values(nodeBalance).reduce((sum, nb) => sum + nb.inflow, 0);
    const totalOutflow = Object.values(nodeBalance).reduce((sum, nb) => sum + nb.outflow, 0);

    return {
        nodeBalance,
        imbalanced,
        totalInflow,
        totalOutflow,
        isBalanced: imbalanced.length === 0
    };
}

/**
 * Get diagram state formatted for AI context injection
 * Returns a comprehensive string summary for the AI system prompt
 */
export function getDiagramStateForAI(state: DiagramState): string {
    const balance = analyzeFlowBalance(state.data);

    let context = '\n\n=== CURRENT DIAGRAM STATE ===\n';
    context += `Total Nodes: ${state.data.nodes.length}\n`;
    context += `Total Flows: ${state.data.links.length}\n`;
    const totalFlow = state.data.links.reduce((sum, link) => sum + link.value, 0);
    context += `Total Flow Value: ${totalFlow.toFixed(2)}\n\n`;

    context += 'NODES (with customizations):\n';
    state.data.nodes.forEach(node => {
        const nb = balance.nodeBalance[node.id];
        context += `- ${node.name || node.id}:\n`;
        if (nb) {
            const balanceStatus = Math.abs(nb.balance) < 0.001 ? ' [BALANCED]' : '';
            context += `    inflow: ${nb.inflow.toFixed(2)}, outflow: ${nb.outflow.toFixed(2)}${balanceStatus}\n`;
        }
        if (node.color) context += `    color: ${node.color}\n`;
        if (node.category) context += `    category: ${node.category}\n`;
    });

    context += '\nFLOWS (source → target: amount [previous, comparison]):\n';
    state.data.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : String(link.source);
        const targetId = typeof link.target === 'string' ? link.target : String(link.target);
        const sourceName = state.data.nodes.find(n => n.id === sourceId)?.name || sourceId;
        const targetName = state.data.nodes.find(n => n.id === targetId)?.name || targetId;

        let extra = '';
        if (link.previousValue !== undefined) extra += ` [prev: ${link.previousValue}]`;
        if (link.comparisonValue !== undefined) extra += ` [comp: "${link.comparisonValue}"]`;

        context += `- ${sourceName} → ${targetName}: ${link.value}${extra}\n`;
    });

    if (balance.imbalanced.length > 0) {
        context += '\nIMBALANCED NODES:\n';
        balance.imbalanced.forEach(ib => {
            context += `- ${ib.node}: ${ib.suggestion}\n`;
        });
    } else {
        context += '\nAll intermediate nodes are balanced.\n';
    }

    // Add Selection Context (Crucial for "Edit this" commands)
    context += '\n=== SELECTION CONTEXT ===\n';
    if (state.selectedNodeId) {
        const node = state.data.nodes.find(n => n.id === state.selectedNodeId);
        if (node) {
            context += `CURRENTLY SELECTED NODE: "${node.name}" (ID: ${node.id})\n`;
            context += `Use this node as the target for any ambiguous commands like "change color" or "rename".\n`;
        }
    } else if (state.selectedLinkIndex !== null && state.data.links[state.selectedLinkIndex]) {
        const link = state.data.links[state.selectedLinkIndex];
        const sourceName = typeof link.source === 'string'
            ? state.data.nodes.find(n => n.id === link.source)?.name
            : (link.source as any).name; // Handle d3 object reference if present
        const targetName = typeof link.target === 'string'
            ? state.data.nodes.find(n => n.id === link.target)?.name
            : (link.target as any).name;

        context += `CURRENTLY SELECTED FLOW: ${sourceName} → ${targetName}\n`;
        context += `Value: ${link.value}, Previous: ${link.previousValue || 'N/A'}, Comparison: ${link.comparisonValue || 'N/A'}\n`;
    } else {
        context += 'No specific element selected.\n';
    }

    context += '\n=== FIELD DEFINITIONS ===\n';
    context += '- value: The current numeric value (main flow width).\n';
    context += '- previousValue: The numeric value from a previous period (used for calculation).\n';
    context += '- comparisonValue: A string label to show change (e.g. "+10%", "-$500").\n';
    context += 'If the user asks to "store previous data" or "show growth", use previousValue.\n';

    context += '\n=== END DIAGRAM STATE ===\n';

    return context;
}

/**
 * Validate diagram data before applying changes
 * Checks for common errors and invalid configurations
 */
export function validateDiagramData(data: SankeyData): ValidationResult {
    const errors: string[] = [];

    if (!data) {
        return { isValid: false, errors: ['Data is null or undefined'] };
    }

    if (!Array.isArray(data.nodes)) {
        return { isValid: false, errors: ['Nodes must be an array'] };
    }

    if (!Array.isArray(data.links)) {
        return { isValid: false, errors: ['Links must be an array'] };
    }

    const nodeIds = new Set(data.nodes.map(n => n.id));

    // Validate each link
    data.links.forEach((link, index) => {
        const sourceId = typeof link.source === 'string' ? link.source : String(link.source);
        const targetId = typeof link.target === 'string' ? link.target : String(link.target);

        if (!sourceId) {
            errors.push(`Link ${index}: Invalid source`);
        }
        if (!targetId) {
            errors.push(`Link ${index}: Invalid target`);
        }
        if (typeof link.value !== 'number' || link.value <= 0 || !isFinite(link.value)) {
            errors.push(`Link ${index}: Value must be a positive number`);
        }
        if (sourceId === targetId) {
            errors.push(`Link ${index}: Source and target cannot be the same (self-loop)`);
        }
        if (!nodeIds.has(sourceId)) {
            errors.push(`Link ${index}: Source node "${sourceId}" does not exist`);
        }
        if (!nodeIds.has(targetId)) {
            errors.push(`Link ${index}: Target node "${targetId}" does not exist`);
        }
    });

    // Note: We allow duplicate links now as the system can aggregate them

    return {
        isValid: errors.length === 0,
        errors,
        nodeCount: data.nodes.length,
        flowCount: data.links.length
    };
}

/**
 * Apply AI-suggested changes to the diagram
 * Validates and merges changes with current state
 */
export function applyAIChanges(
    currentState: DiagramState,
    changes: AIChanges
): { success: boolean; newState?: DiagramState; errors?: string[] } {
    if (!changes || typeof changes !== 'object') {
        return { success: false, errors: ['Invalid changes object'] };
    }

    // Create a copy of the current state
    const newState: DiagramState = JSON.parse(JSON.stringify(currentState));

    // Apply flow changes
    if (changes.flows && Array.isArray(changes.flows)) {
        newState.data.links = changes.flows;

        // Validate the new data
        const validation = validateDiagramData(newState.data);
        if (!validation.isValid) {
            return { success: false, errors: validation.errors };
        }
    }

    // Apply node customization changes
    if (changes.nodes && typeof changes.nodes === 'object') {
        Object.entries(changes.nodes).forEach(([nodeId, updates]) => {
            const node = newState.data.nodes.find(n => n.id === nodeId);
            if (node && updates) {
                // Merge updates into the node
                Object.assign(node, updates);
            }
        });
    }

    return { success: true, newState };
}
