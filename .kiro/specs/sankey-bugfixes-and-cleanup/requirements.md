# Requirements Document

## Introduction

This document specifies requirements for fixing bugs in the Sankey Diagram Builder, adding independent labels feature, enhancing AI capabilities to read/edit full diagram state, and preparing the project for deployment on Vercel/Netlify.

## Glossary

- **Label_Font**: The font family and size applied to label text elements in the SVG diagram
- **Label_Text**: The display text shown in a label, which can be different from the node identity
- **Node_Identity**: The unique identifier for a node used in data flows (source/target names)
- **Independent_Label**: A free-floating text label not attached to any node, draggable anywhere on canvas
- **Toolbar_Button**: Interactive button in the studio toolbar for diagram manipulation
- **AI_Controller**: Module that manages AI interactions with diagram data
- **Diagram_State**: Complete state including flows, nodes, customizations, and settings

## Requirements

### Requirement 1: Fix Label Font Not Applying

**User Story:** As a user, I want label font settings to apply correctly, so that my labels display with the chosen font family and size.

#### Acceptance Criteria

1. WHEN a user sets a custom font size in the label popup, THE Label_System SHALL apply that font size to the custom label overlay text element
2. WHEN a user selects a Google Font from the Labels menu, THE Label_System SHALL apply that font family to all label text elements
3. WHEN a label is re-rendered after diagram update, THE Label_System SHALL preserve the custom font settings

### Requirement 2: Fix Label Text Changing to Node Identity on Click

**User Story:** As a user, I want my custom label text to remain unchanged when I click on a label, so that I don't lose my custom display text.

#### Acceptance Criteria

1. WHEN a user clicks on a label with custom text, THE Label_System SHALL NOT replace the display text with the node identity
2. WHEN the label popup opens, THE Label_System SHALL display the current custom label text (not the node identity)
3. WHEN a label has no custom text set, THE Label_System SHALL default to showing the node identity as display text

### Requirement 3: Fix Toolbar Button Functionality

**User Story:** As a user, I want all toolbar buttons to work correctly, so that I can use all diagram manipulation features.

#### Acceptance Criteria

1. WHEN a user clicks the Select button, THE Toolbar_Controller SHALL enable element selection mode
2. WHEN a user clicks the Pan button, THE Toolbar_Controller SHALL enable canvas panning mode
3. WHEN a user clicks the Add Node button, THE Toolbar_Controller SHALL enable node creation mode
4. WHEN a user clicks the Add Flow button, THE Toolbar_Controller SHALL enable flow creation mode
5. WHEN a user clicks the Zoom In button, THE Viewport_Controller SHALL increase zoom level by one step
6. WHEN a user clicks the Zoom Out button, THE Viewport_Controller SHALL decrease zoom level by one step
7. WHEN a user clicks the Fit button, THE Viewport_Controller SHALL fit diagram to screen
8. WHEN a user clicks the Reset Zoom button, THE Viewport_Controller SHALL reset zoom to 100%
9. WHEN a user clicks the Undo button, THE Undo_Manager SHALL undo the last action
10. WHEN a user clicks the Redo button, THE Undo_Manager SHALL redo the last undone action
11. WHEN a user clicks the Export button, THE System SHALL show export options
12. WHEN a user clicks the New button, THE Session_Manager SHALL reset the session
13. WHEN a user clicks Reset Nodes, THE System SHALL reset all node positions to D3 calculated positions
14. WHEN a user clicks Reset Labels, THE System SHALL reset all label positions to default
15. WHEN a user clicks Factory Reset, THE System SHALL clear all state and reload default data
16. WHEN a user clicks the Dark/Light toggle, THE Theme_Controller SHALL toggle the theme

### Requirement 4: Add Independent Labels Feature

**User Story:** As a user, I want to add independent text labels that I can drag anywhere on the canvas, so that I can annotate my diagram with custom text.

#### Acceptance Criteria

1. WHEN a user clicks an "Add Label" button, THE System SHALL create a new independent label at the center of the visible canvas
2. WHEN a user drags an independent label, THE System SHALL update its position in real-time
3. WHEN a user double-clicks an independent label, THE System SHALL open a popup to edit the label text and styling
4. WHEN a user deletes an independent label, THE System SHALL remove it from the canvas and state
5. WHEN the diagram is saved, THE System SHALL persist independent labels with their positions and styling
6. WHEN the diagram is loaded, THE System SHALL restore independent labels at their saved positions

### Requirement 5: Enhance AI to Read and Edit Full Diagram State

**User Story:** As a user, I want the AI to read and modify all aspects of my diagram including node customizations, label settings, and values, so that I can use AI to make comprehensive changes.

#### Acceptance Criteria

1. WHEN the AI reads diagram state, THE AI_Controller SHALL include node identities, labels, values, and all customizations
2. WHEN the AI modifies a node's label text, THE AI_Controller SHALL update the labelText property in nodeCustomizations
3. WHEN the AI modifies a node's color, THE AI_Controller SHALL update the fillColor property in nodeCustomizations
4. WHEN the AI modifies a flow value, THE AI_Controller SHALL update the corresponding row in the data table
5. WHEN the AI modifies label styling (font, color, alignment), THE AI_Controller SHALL update the corresponding label properties
6. WHEN the AI makes changes, THE AI_Controller SHALL preserve existing customizations not being modified
7. WHEN the AI provides a JSON response, THE AI_Controller SHALL validate and apply the changes with undo support

### Requirement 6: Project Cleanup for Deployment

**User Story:** As a developer, I want the project cleaned up and prepared for deployment, so that I can deploy to Vercel or Netlify.

#### Acceptance Criteria

1. THE System SHALL remove unnecessary files not required for production
2. THE System SHALL keep the run-local.bat file for local development
3. THE System SHALL have a clean build folder with only required assets
4. THE System SHALL be deployable as a static site to Vercel or Netlify
5. THE System SHALL have no broken file references or missing dependencies
