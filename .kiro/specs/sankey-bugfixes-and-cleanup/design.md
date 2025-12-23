# Design Document: Sankey Bugfixes and Cleanup

## Overview

This design addresses critical bugs in the Sankey Diagram Builder, adds an independent labels feature, enhances AI capabilities for full diagram state manipulation, and prepares the project for deployment. The implementation focuses on fixing label font application, preventing label text from reverting to node identity, ensuring all toolbar buttons work, and enabling comprehensive AI control.

## Architecture

The solution extends existing modules:

```
┌─────────────────────────────────────────────────────────────┐
│                     index.html                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Label System    │  │ Toolbar         │  │ Independent  │ │
│  │ (font fixes)    │  │ Controller      │  │ Labels       │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                    │                   │         │
│  ┌────────▼────────────────────▼───────────────────▼───────┐ │
│  │              AI Controller (enhanced)                    │ │
│  │  - getDiagramStateForAI() with full customizations      │ │
│  │  - applyAIChanges() for comprehensive updates           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Label Font Fix (index.html)

The `applyLabelCustomizationToSVG` function needs to apply font-family from global settings:

```javascript
function applyLabelCustomizationToSVG(nodeName, custom) {
  // ... existing code ...
  
  // Get global font settings
  const globalFontFace = document.getElementById('opt_labels_fontface')?.value || 'sans-serif';
  const googleFont = document.getElementById('opt_labels_googlefont')?.value || '';
  const fontFamily = googleFont || globalFontFace;
  
  // Apply font to text element
  textEl.setAttribute('font-family', fontFamily);
  textEl.setAttribute('font-size', fontSize + 'px');
  
  // Apply to each tspan
  textLines.forEach((line, index) => {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan.setAttribute('font-family', fontFamily);
    // ... rest of tspan setup
  });
}
```

### 2. Label Text Preservation Fix (index.html)

The issue is in `applyLabelPositions` where it may be resetting label text. Fix:

```javascript
function applyLabelPositions() {
  // ... existing code ...
  
  svg.querySelectorAll('g[id$="_group"]').forEach(group => {
    let nodeName = group.getAttribute('data-label-for');
    if (!nodeName) return;
    
    // CRITICAL: Do NOT modify labelText here
    // Only store position data, never touch labelText
    // labelText is ONLY set by user in popup or by AI
  });
}
```

### 3. Toolbar Button Wiring (toolbar-controller.js)

Ensure all buttons have proper handlers:

```javascript
const ToolbarController = {
  _wireToolButtons() {
    // Tool buttons (select, pan, addNode, addFlow)
    const toolButtons = this._toolbarElement?.querySelectorAll('[data-tool]');
    toolButtons?.forEach(button => {
      button.addEventListener('click', (e) => {
        const tool = button.getAttribute('data-tool');
        this.setTool(tool);
      });
    });
  },
  
  _wireActionButtons() {
    // Zoom buttons
    const zoomInBtn = this._toolbarElement?.querySelector('[onclick*="zoomCanvas(0.1)"]');
    const zoomOutBtn = this._toolbarElement?.querySelector('[onclick*="zoomCanvas(-0.1)"]');
    // These use onclick in HTML, verify they work
    
    // Action buttons with data-action
    const actions = ['undo', 'redo', 'export', 'reset-session', 'reset-nodes', 'reset-labels', 'factory-reset'];
    actions.forEach(action => {
      const btn = this._toolbarElement?.querySelector(`[data-action="${action}"]`);
      if (btn) {
        btn.addEventListener('click', () => this[`_handle${this._toPascalCase(action)}`]());
      }
    });
  }
};
```

### 4. Independent Labels System (new)

```javascript
const IndependentLabelsManager = {
  _labels: [], // Array of { id, text, x, y, fontSize, color, ... }
  
  addLabel(options = {}) {
    const id = 'indep_label_' + Date.now();
    const label = {
      id,
      text: options.text || 'New Label',
      x: options.x || this._getCanvasCenter().x,
      y: options.y || this._getCanvasCenter().y,
      fontSize: options.fontSize || 16,
      color: options.color || '#000000',
      fontFamily: options.fontFamily || 'sans-serif'
    };
    this._labels.push(label);
    this._renderLabel(label);
    this._save();
    return label;
  },
  
  _renderLabel(label) {
    const svg = document.getElementById('sankey_svg');
    let layer = svg.querySelector('#independent_labels_layer');
    if (!layer) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.setAttribute('id', 'independent_labels_layer');
      svg.appendChild(layer);
    }
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', label.id);
    group.setAttribute('class', 'independent-label');
    group.setAttribute('transform', `translate(${label.x}, ${label.y})`);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = label.text;
    text.setAttribute('font-size', label.fontSize + 'px');
    text.setAttribute('fill', label.color);
    text.setAttribute('font-family', label.fontFamily);
    
    group.appendChild(text);
    layer.appendChild(group);
    
    this._setupDrag(group, label);
    this._setupDoubleClick(group, label);
  },
  
  deleteLabel(id) {
    this._labels = this._labels.filter(l => l.id !== id);
    document.getElementById(id)?.remove();
    this._save();
  },
  
  getLabels() {
    return [...this._labels];
  },
  
  _save() {
    localStorage.setItem('sankeymatic_independent_labels', JSON.stringify(this._labels));
  },
  
  _load() {
    const saved = localStorage.getItem('sankeymatic_independent_labels');
    if (saved) {
      this._labels = JSON.parse(saved);
      this._labels.forEach(label => this._renderLabel(label));
    }
  }
};
```

### 5. Enhanced AI Controller (ai-controller.js)

```javascript
const AIController = {
  /**
   * Get complete diagram state including all customizations
   * @returns {Object} Full diagram state for AI
   */
  getFullDiagramState() {
    const data = this.getDiagramData();
    
    // Add node customizations with all properties
    const nodeDetails = {};
    data.nodes.forEach(nodeName => {
      const custom = (typeof nodeCustomizations !== 'undefined' && nodeCustomizations[nodeName]) || {};
      nodeDetails[nodeName] = {
        identity: nodeName,
        label: custom.labelText || nodeName,
        fillColor: custom.fillColor || null,
        borderColor: custom.borderColor || null,
        opacity: custom.opacity ?? 100,
        labelFontSize: custom.labelFontSize || 16,
        labelColor: custom.labelColor || '#000000',
        labelBold: custom.labelBold || false,
        labelItalic: custom.labelItalic || false,
        labelAlign: custom.labelAlign || 'center',
        labelBgEnabled: custom.labelBgEnabled || false,
        labelBg: custom.labelBg || '#ffffff'
      };
    });
    
    // Add independent labels
    const independentLabels = typeof IndependentLabelsManager !== 'undefined' 
      ? IndependentLabelsManager.getLabels() 
      : [];
    
    return {
      flows: data.flows,
      nodes: nodeDetails,
      independentLabels,
      totalFlow: data.totalFlow
    };
  },
  
  /**
   * Apply comprehensive AI changes to diagram
   * @param {Object} changes - Changes to apply
   * @returns {Object} Result
   */
  applyAIChanges(changes) {
    const currentState = this.getFullDiagramState();
    
    // Record for undo
    if (typeof UndoManager !== 'undefined') {
      UndoManager.recordAction({
        type: 'AI_COMPREHENSIVE_CHANGE',
        data: changes,
        inverseData: currentState,
        description: 'AI diagram modification'
      });
    }
    
    // Apply flow changes
    if (changes.flows) {
      this.applyDiagramData({ flows: changes.flows }, true);
    }
    
    // Apply node customization changes
    if (changes.nodes) {
      Object.entries(changes.nodes).forEach(([nodeName, props]) => {
        if (!nodeCustomizations[nodeName]) nodeCustomizations[nodeName] = {};
        
        if (props.label !== undefined) nodeCustomizations[nodeName].labelText = props.label;
        if (props.fillColor !== undefined) {
          nodeCustomizations[nodeName].fillColor = props.fillColor;
          nodeColors[nodeName] = props.fillColor;
        }
        if (props.borderColor !== undefined) nodeCustomizations[nodeName].borderColor = props.borderColor;
        if (props.opacity !== undefined) nodeCustomizations[nodeName].opacity = props.opacity;
        if (props.labelFontSize !== undefined) nodeCustomizations[nodeName].labelFontSize = props.labelFontSize;
        if (props.labelColor !== undefined) nodeCustomizations[nodeName].labelColor = props.labelColor;
        if (props.labelBold !== undefined) nodeCustomizations[nodeName].labelBold = props.labelBold;
        if (props.labelItalic !== undefined) nodeCustomizations[nodeName].labelItalic = props.labelItalic;
      });
    }
    
    // Apply independent label changes
    if (changes.independentLabels && typeof IndependentLabelsManager !== 'undefined') {
      changes.independentLabels.forEach(label => {
        if (label._delete) {
          IndependentLabelsManager.deleteLabel(label.id);
        } else if (label._new) {
          IndependentLabelsManager.addLabel(label);
        } else {
          IndependentLabelsManager.updateLabel(label.id, label);
        }
      });
    }
    
    // Re-render
    if (typeof process_sankey === 'function') {
      process_sankey();
    }
    
    saveProgressToLocal();
    return { success: true };
  },
  
  /**
   * Get diagram state formatted for AI context
   */
  getDiagramStateForAI() {
    const state = this.getFullDiagramState();
    
    let context = '\n\n=== CURRENT DIAGRAM STATE ===\n';
    context += `Total Nodes: ${Object.keys(state.nodes).length}\n`;
    context += `Total Flows: ${state.flows.length}\n\n`;
    
    context += 'NODES (with customizations):\n';
    Object.entries(state.nodes).forEach(([name, props]) => {
      context += `- ${name}:\n`;
      context += `    label: "${props.label}"\n`;
      if (props.fillColor) context += `    fillColor: ${props.fillColor}\n`;
      if (props.labelFontSize !== 16) context += `    labelFontSize: ${props.labelFontSize}\n`;
    });
    
    context += '\nFLOWS:\n';
    state.flows.forEach(f => {
      context += `- ${f.source} → ${f.target}: ${f.amount}\n`;
    });
    
    if (state.independentLabels.length > 0) {
      context += '\nINDEPENDENT LABELS:\n';
      state.independentLabels.forEach(l => {
        context += `- "${l.text}" at (${l.x}, ${l.y})\n`;
      });
    }
    
    context += '\nJSON FORMAT:\n';
    context += JSON.stringify(state, null, 2);
    context += '\n=== END DIAGRAM STATE ===\n';
    
    return context;
  }
};
```

## Data Models

### Independent Label Model

```typescript
interface IndependentLabel {
  id: string;           // Unique identifier
  text: string;         // Display text (supports multi-line with \n)
  x: number;            // X position in SVG coordinates
  y: number;            // Y position in SVG coordinates
  fontSize: number;     // Font size in pixels
  color: string;        // Text color (hex)
  fontFamily: string;   // Font family
  bgEnabled?: boolean;  // Background enabled
  bgColor?: string;     // Background color
}
```

### Enhanced Node Customization Model

```typescript
interface NodeCustomization {
  // Node appearance
  fillColor?: string;
  borderColor?: string;
  opacity?: number;
  borderOpacity?: number;
  
  // Label text (SEPARATE from node identity)
  labelText?: string;        // Display text, defaults to node identity
  labelColor?: string;
  labelFontSize?: number;
  labelBold?: boolean;
  labelItalic?: boolean;
  labelAlign?: 'left' | 'center' | 'right';
  labelBgEnabled?: boolean;
  labelBg?: string;
  labelBgOpacity?: number;
  
  // Label position offsets
  labelX?: number;
  labelY?: number;
  labelMarginTop?: number;
  labelMarginRight?: number;
  labelMarginBottom?: number;
  labelMarginLeft?: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Label Font Settings Apply and Persist

*For any* label with custom font settings (font size, font family), applying the customization SHALL result in the SVG text element having the correct font-size and font-family attributes, and these settings SHALL persist after diagram re-render.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Label Text Preservation

*For any* label with custom display text different from its node identity, clicking on the label or opening the label popup SHALL NOT change the display text to the node identity. The custom text SHALL remain unchanged.

**Validates: Requirements 2.1, 2.2**

### Property 3: Toolbar Button Handlers Execute

*For any* toolbar button with a data-tool or data-action attribute, clicking the button SHALL invoke the corresponding handler function in ToolbarController.

**Validates: Requirements 3.1-3.16**

### Property 4: Independent Label CRUD and Persistence

*For any* independent label, creating it SHALL add it to the canvas, dragging it SHALL update its position, deleting it SHALL remove it, and saving/loading SHALL preserve all label properties including position.

**Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6**

### Property 5: AI Full State Read/Write

*For any* diagram state, the AI controller's `getFullDiagramState()` SHALL return all node identities, custom labels, flow values, and customizations. Applying changes via `applyAIChanges()` SHALL update only the specified properties while preserving unmodified customizations.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

## Error Handling

1. **Invalid font family**: Fall back to 'sans-serif'
2. **Missing label text**: Default to node identity
3. **Invalid AI JSON**: Validate before applying, return error if invalid
4. **Missing SVG elements**: Log warning and skip operation
5. **localStorage unavailable**: Continue without persistence, warn user

## Testing Strategy

### Unit Tests

- Test label font application with various font families
- Test label text preservation on click events
- Test each toolbar button handler individually
- Test independent label CRUD operations
- Test AI state read/write operations

### Property-Based Tests

Using fast-check for JavaScript:

1. **Label Font Property Test**: Generate random font sizes (8-72) and font families, verify SVG attributes match
2. **Label Text Property Test**: Generate random custom texts, verify they persist through interactions
3. **Toolbar Handler Property Test**: Generate button click sequences, verify handlers called
4. **Independent Label Property Test**: Generate random label operations, verify state consistency
5. **AI State Property Test**: Generate random diagram states, verify round-trip through AI read/write

Configuration:
- Minimum 100 iterations per property test
- Tag format: **Feature: sankey-bugfixes-and-cleanup, Property {number}: {property_text}**
