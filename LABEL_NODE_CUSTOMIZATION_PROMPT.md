# AI Prompt: Implement Independent Node and Label Customization for Sankey Diagrams

## Context
You are working on a Sankey diagram builder application that uses D3.js and a library called SankeyMATIC. The application renders SVG diagrams with nodes (colored rectangles representing data points) and labels (text elements showing node names and values).

## Current Problem
Labels are currently locked to their parent nodes and cannot be moved independently. Users need the ability to:
1. Drag labels anywhere on the canvas, independent of their nodes
2. Customize label appearance (color, font size, background, alignment)
3. Resize label textboxes
4. Have these customizations persist across diagram re-renders

## Requirements

### 1. Independent State Management
Create a global `customLayout` object that stores coordinates and dimensions for every node and label by their unique ID.

```javascript
// Structure:
customLayout["NodeName"] = { 
  originalX: 100,    // Original D3-calculated X position
  originalY: 200,    // Original D3-calculated Y position
  labelX: 150,       // Current label X position (can differ from original)
  labelY: 250,       // Current label Y position
  labelW: 120,       // Custom label box width (0 = auto)
  labelH: 40,        // Custom label box height (0 = auto)
  nodeColor: "#ff0000",
  labelColor: "#000000",
  labelBg: "#ffffff",
  labelBgEnabled: false,
  labelAlign: "center", // "left", "center", "right"
  labelFontSize: 16
}
```

### 2. SVG Structure for Labels
Modify the label rendering to wrap each label in a group structure:
```xml
<g id="NodeName_group" class="label-group" transform="translate(x, y)">
  <rect class="label-box" x="..." y="..." width="..." height="..." fill="..." stroke="..."/>
  <rect class="custom-label-bg" ... /> <!-- Optional background -->
  <text id="NodeName_label">Label Text</text>
</g>
```

### 3. Independent D3 Drag Behavior
Implement custom D3 drag behavior that:
- Captures the starting position on drag start
- Updates the transform during drag
- Saves the final position to `customLayout` on drag end
- Does NOT reset positions when the diagram re-renders

```javascript
const labelDrag = d3.drag()
  .on('start', function(event) {
    // Store starting position
    const transform = d3.select(this).attr('transform');
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    event.subject.startX = parseFloat(match[1]);
    event.subject.startY = parseFloat(match[2]);
  })
  .on('drag', function(event) {
    // Update position during drag
    const newX = event.subject.startX + event.dx;
    const newY = event.subject.startY + event.dy;
    d3.select(this).attr('transform', `translate(${newX}, ${newY})`);
    event.subject.startX = newX;
    event.subject.startY = newY;
  })
  .on('end', function(event) {
    // Save final position to customLayout
    const nodeName = extractNodeName(this);
    customLayout[nodeName].labelX = event.subject.startX;
    customLayout[nodeName].labelY = event.subject.startY;
  });
```

### 4. Text Alignment Implementation
```javascript
function applyTextAlignment(textEl, align, boxWidth) {
  const anchor = align === 'left' ? 'start' : 
                 align === 'right' ? 'end' : 'middle';
  textEl.setAttribute('text-anchor', anchor);
  
  // Adjust x position based on alignment
  if (boxWidth > 0) {
    const padding = 4;
    const x = align === 'left' ? padding :
              align === 'right' ? boxWidth - padding :
              boxWidth / 2;
    textEl.setAttribute('x', x);
  }
}
```

### 5. Label Box Dimensions
```javascript
function applyLabelBoxDimensions(textEl, custom) {
  const group = textEl.parentElement;
  const bbox = textEl.getBBox();
  const padding = 6;
  
  let labelBox = group.querySelector('.label-box');
  if (!labelBox) {
    labelBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    labelBox.setAttribute('class', 'label-box');
    group.insertBefore(labelBox, textEl);
  }
  
  const width = custom.labelW > 0 ? custom.labelW : bbox.width + padding * 2;
  const height = custom.labelH > 0 ? custom.labelH : bbox.height + padding * 2;
  
  labelBox.setAttribute('width', width);
  labelBox.setAttribute('height', height);
  labelBox.setAttribute('fill', custom.labelBgEnabled ? custom.labelBg : 'transparent');
}
```

### 6. Integration with Main Render Loop
After each `process_sankey()` call:
1. Capture original positions for new labels
2. Apply stored customizations from `customLayout`
3. Re-attach drag behaviors

```javascript
function applyCustomLayoutAfterRender() {
  const svg = d3.select('#sankey_svg');
  
  svg.selectAll('g[id$="_group"]').each(function() {
    const nodeName = extractNodeName(this);
    
    // Store original position if new
    if (!customLayout[nodeName]) {
      const transform = d3.select(this).attr('transform');
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      customLayout[nodeName] = {
        originalX: parseFloat(match[1]),
        originalY: parseFloat(match[2]),
        labelX: parseFloat(match[1]),
        labelY: parseFloat(match[2])
      };
    } else {
      // Apply stored position
      d3.select(this).attr('transform', 
        `translate(${customLayout[nodeName].labelX}, ${customLayout[nodeName].labelY})`);
    }
    
    // Apply drag behavior
    d3.select(this).call(labelDrag);
  });
}
```

### 7. Reset Function
```javascript
function resetLabel(nodeName) {
  if (customLayout[nodeName]) {
    customLayout[nodeName].labelX = customLayout[nodeName].originalX;
    customLayout[nodeName].labelY = customLayout[nodeName].originalY;
    customLayout[nodeName].labelW = 0;
    customLayout[nodeName].labelH = 0;
    renderDiagram(); // Re-render to apply
  }
}

function resetAllLabels() {
  Object.keys(customLayout).forEach(nodeName => {
    customLayout[nodeName].labelX = customLayout[nodeName].originalX;
    customLayout[nodeName].labelY = customLayout[nodeName].originalY;
  });
  renderDiagram();
}
```

### 8. CSS Styles
```css
g[id$="_group"] {
  cursor: move !important;
  transition: filter 0.15s ease;
}

g[id$="_group"]:hover {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}

g[id$="_group"].dragging {
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
}

.label-box {
  pointer-events: none;
}

.custom-label-bg {
  pointer-events: none;
}
```

## Key Constraints
1. Labels must be draggable ANYWHERE on the canvas, not just near their nodes
2. Positions must persist across diagram re-renders (when data changes)
3. The text must remain readable within custom box dimensions
4. Double-click on a label should open a customization popup
5. Provide visual feedback during drag operations
6. Save state to localStorage for persistence across sessions

## Testing Checklist
- [ ] Can drag a label far away from its node
- [ ] Label stays in position after editing data
- [ ] Custom colors apply correctly
- [ ] Text alignment works (left/center/right)
- [ ] Custom box dimensions work
- [ ] Background color/opacity works
- [ ] Reset button returns label to original position
- [ ] Undo/redo includes label positions
- [ ] State persists after page refresh
