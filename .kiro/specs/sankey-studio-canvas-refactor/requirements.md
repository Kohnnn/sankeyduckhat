# Requirements Document

## Introduction

This specification defines the requirements for refactoring the existing Sankey Builder into a professional "Sankey Studio" application. The transformation shifts from a text-heavy interface to a canvas-first experience where users interact directly with the diagram through visual manipulation, similar to professional diagramming tools like Draw.io or Miro.

## Glossary

- **Canvas**: The primary workspace area where the Sankey diagram is rendered and manipulated
- **Viewport**: The visible portion of the infinite canvas, controlled by pan and zoom operations
- **StudioUI**: The interaction state management system that tracks current tool, selection, and mode
- **Node**: A rectangular element in the Sankey diagram representing a source or target
- **Flow**: A curved path connecting two nodes, representing data flow with a specific value
- **Label**: A text element with background box that can be positioned independently from its associated node
- **Properties_Panel**: The right sidebar displaying context-sensitive settings based on current selection
- **Toolbar**: The top horizontal bar containing tool buttons and actions
- **Selection**: The currently active element (node, flow, or canvas) that receives property edits
- **Custom_Layout**: The data structure storing user-defined positions for nodes and labels

## Requirements

### Requirement 1: Infinite Canvas Viewport System

**User Story:** As a user, I want to pan and zoom the diagram freely, so that I can work with large diagrams and focus on specific areas.

#### Acceptance Criteria

1. WHEN the diagram is rendered THEN the system SHALL wrap the main Sankey SVG in a viewport container element
2. WHEN a user middle-clicks and drags OR holds spacebar and drags THEN the system SHALL pan the entire diagram smoothly
3. WHEN a user scrolls while holding Ctrl THEN the system SHALL zoom the diagram in or out centered on the mouse position
4. WHEN a user clicks zoom toolbar buttons THEN the system SHALL zoom in, zoom out, or fit the diagram to screen accordingly
5. WHEN the viewport is panned or zoomed THEN the system SHALL display a fixed CSS grid background (dots or lines) that provides spatial reference
6. WHEN zoom level changes THEN the system SHALL maintain the visual center point of the user's focus area

### Requirement 2: StudioUI Interaction State Management

**User Story:** As a user, I want the application to track what I'm doing and what I've selected, so that my interactions are contextual and predictable.

#### Acceptance Criteria

1. WHEN the application initializes THEN the system SHALL create a StudioUI manager object with properties for currentTool, selectedElement, and interactionMode
2. WHEN a user clicks a node or flow THEN the system SHALL update selectedElement and apply visual selection feedback
3. WHEN a user selects a different tool from the toolbar THEN the system SHALL update currentTool and change the cursor appearance
4. WHEN selectedElement changes THEN the system SHALL update the Properties Panel to show relevant settings
5. WHEN a user clicks on empty canvas space THEN the system SHALL deselect any selected element and show canvas-level properties

### Requirement 3: Bi-directional Data Synchronization

**User Story:** As a user, I want my visual changes to persist and my data changes to reflect visually, so that the diagram and underlying data stay in sync.

#### Acceptance Criteria

1. WHEN a user drags a node to a new position THEN the system SHALL update the customLayout object with the new coordinates
2. WHEN a user drags a label to a new position THEN the system SHALL update the customLayout object with the label's new coordinates independently from the node
3. WHEN a user adds a new flow via toolbar THEN the system SHALL generate a placeholder row in the underlying data table
4. WHEN the underlying data changes THEN the system SHALL re-render the diagram while preserving custom layout positions
5. WHEN a user modifies properties in the Properties Panel THEN the system SHALL update both the visual representation and the underlying data immediately

### Requirement 4: Three-Panel Layout Architecture

**User Story:** As a user, I want a professional studio layout with tools, canvas, and properties, so that I can efficiently create and edit diagrams.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a top toolbar with tool buttons for Select, Pan, Add Node, Add Flow, Undo, Redo, and Export
2. WHEN the application loads THEN the system SHALL display a central canvas area that occupies the majority of the screen
3. WHEN the application loads THEN the system SHALL display a right properties panel that shows context-sensitive settings
4. WHEN no element is selected THEN the Properties Panel SHALL display global diagram settings including width, height, margins, theme, and spacing
5. WHEN a node is selected THEN the Properties Panel SHALL display node-specific settings including fill color, opacity, label text, label position, label alignment, and box dimensions
6. WHEN a flow is selected THEN the Properties Panel SHALL display flow-specific settings including source name, target name, amount, color mode, and curvature
7. WHEN the layout is rendered THEN all interactive elements SHALL have pointer-events enabled for proper interaction

### Requirement 5: Independent Node and Label Positioning

**User Story:** As a user, I want to move nodes and their labels independently, so that I can create custom layouts with optimal label placement.

#### Acceptance Criteria

1. WHEN a label is rendered THEN the system SHALL create it as a group element containing a background rectangle and text element
2. WHEN a user clicks and drags a node THEN the system SHALL move only the node, not its label
3. WHEN a user clicks and drags a label THEN the system SHALL move only the label, not its associated node
4. WHEN a label is selected THEN the Properties Panel SHALL provide controls for textbox width, height, and text alignment (left, center, right)
5. WHEN label dimensions are changed via Properties Panel THEN the system SHALL resize the label background rectangle and reflow the text accordingly
6. WHEN a node is moved THEN the system SHALL NOT automatically reposition its label

### Requirement 6: Visual Selection System

**User Story:** As a user, I want clear visual feedback when I select elements, so that I know what I'm currently editing.

#### Acceptance Criteria

1. WHEN a node is selected THEN the system SHALL apply a distinctive visual effect such as a blue outline or animated stroke
2. WHEN a flow is selected THEN the system SHALL apply a distinctive visual effect such as increased stroke width or color highlight
3. WHEN a label is selected THEN the system SHALL apply a distinctive visual effect such as a border around the text box
4. WHEN an element is deselected THEN the system SHALL remove all selection visual effects
5. WHEN multiple elements cannot be selected simultaneously THEN the system SHALL deselect the previous element before selecting a new one

### Requirement 7: Flow Identification and Metadata

**User Story:** As a developer, I want each flow to carry metadata about its source and target, so that the Properties Panel can identify and edit specific flows.

#### Acceptance Criteria

1. WHEN a flow path element is rendered THEN the system SHALL add data-source attribute containing the source node name
2. WHEN a flow path element is rendered THEN the system SHALL add data-target attribute containing the target node name
3. WHEN a flow is clicked THEN the system SHALL use the data attributes to identify the flow and populate the Properties Panel
4. WHEN flow properties are edited THEN the system SHALL use the data attributes to locate and update the correct flow in the underlying data

### Requirement 8: Core Sankey Engine Preservation

**User Story:** As a developer, I want to preserve the existing sankey.js math engine, so that diagram calculations remain accurate and reliable.

#### Acceptance Criteria

1. WHEN implementing new features THEN the system SHALL NOT modify the core sankey.js calculation logic
2. WHEN the diagram is rendered THEN the system SHALL use sankey.js as the source of truth for node positions and flow paths
3. WHEN custom layouts are applied THEN the system SHALL override positions after sankey.js calculations complete
4. WHEN new nodes or flows are added THEN the system SHALL pass data through sankey.js for proper layout calculation

### Requirement 9: Professional Studio Theming

**User Story:** As a user, I want a modern, professional interface with theme support, so that I can work comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL apply a cohesive visual theme with consistent colors, spacing, and typography
2. WHEN theme settings are available THEN the system SHALL support both dark and light theme modes
3. WHEN UI elements are rendered THEN the system SHALL use professional styling consistent with modern design tools
4. WHEN the canvas background is displayed THEN the system SHALL show a subtle grid pattern that aids spatial awareness
5. WHEN interactive elements are hovered THEN the system SHALL provide visual feedback through color or opacity changes

### Requirement 10: Toolbar Tool System

**User Story:** As a user, I want to switch between different tools, so that I can perform different operations on the diagram.

#### Acceptance Criteria

1. WHEN the Select tool is active THEN clicking elements SHALL select them for property editing
2. WHEN the Pan tool is active THEN clicking and dragging SHALL pan the viewport
3. WHEN the Add Node tool is active THEN clicking on the canvas SHALL create a new node at that position
4. WHEN the Add Flow tool is active THEN clicking two nodes in sequence SHALL create a flow between them
5. WHEN a tool is selected THEN the system SHALL update the cursor to indicate the active tool mode
6. WHEN Undo is clicked THEN the system SHALL revert the last user action
7. WHEN Redo is clicked THEN the system SHALL reapply the last undone action
8. WHEN Export is clicked THEN the system SHALL provide options to export the diagram in various formats
