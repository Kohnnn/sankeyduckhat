# Requirements Document

## Introduction

This specification covers comprehensive UI improvements for the Sankey Diagram Builder, including session management, toolbar functionality fixes, enhanced label and node customization settings, and deeper AI integration for data manipulation.

## Glossary

- **Session**: The current working state including diagram data, customizations, and undo history
- **Toolbar**: The horizontal bar containing tool buttons (Select, Pan, Add Node, Add Flow, Zoom, Undo, Redo, Export)
- **Label_Settings_Popup**: The modal dialog for customizing label appearance and position
- **Node_Settings_Popup**: The modal dialog for customizing node appearance
- **AI_Assistant**: The integrated AI chat interface for diagram manipulation
- **JSON_Data**: The structured data format representing flows and nodes in the diagram
- **Text_Margin**: Padding around label text instead of fixed box dimensions
- **Recent_Colors**: A list of the 5 most recently used colors for quick access

## Requirements

### Requirement 1: Session Reset Function

**User Story:** As a user, I want to reset/delete the current session, so that I can start fresh without manually clearing everything.

#### Acceptance Criteria

1. WHEN a user clicks a "New Session" or "Reset Session" button, THE System SHALL clear all diagram data, customizations, undo history, and remembered positions
2. WHEN the session is reset, THE System SHALL display a confirmation dialog before clearing data
3. WHEN the session is reset, THE System SHALL restore all settings to default values
4. WHEN the session is reset, THE System SHALL clear localStorage saved progress
5. WHEN the session is reset, THE System SHALL display an empty diagram canvas ready for new data

### Requirement 2: Toolbar Functionality Fixes

**User Story:** As a user, I want all toolbar buttons to work correctly, so that I can efficiently interact with my diagram.

#### Acceptance Criteria

1. WHEN a user clicks the Undo button, THE System SHALL revert the last change to the diagram
2. WHEN a user clicks the Redo button, THE System SHALL restore the previously undone change
3. WHEN a user clicks the Export button, THE System SHALL open export options (PNG, SVG)
4. WHEN a user clicks the Add Node button and clicks on the canvas, THE System SHALL create a new node at that position
5. WHEN a user clicks the Add Flow button and selects source then target nodes, THE System SHALL create a new flow between them
6. WHEN a user clicks the Reset Nodes button, THE System SHALL restore all nodes to their calculated positions
7. WHEN a user clicks the Reset Labels button, THE System SHALL restore all labels to their default positions
8. WHEN a user activates the Pan tool and drags on the canvas, THE System SHALL pan the viewport accordingly
9. WHEN a user uses zoom controls, THE System SHALL zoom in/out centered on the viewport

### Requirement 3: Label Settings Improvements

**User Story:** As a user, I want improved label customization with text margins and formatting options, so that I can create professional-looking labels.

#### Acceptance Criteria

1. WHEN editing label settings, THE Label_Settings_Popup SHALL display text margin controls (top, right, bottom, left) instead of box width/height
2. WHEN a user sets text margins, THE System SHALL apply padding around the label text accordingly
3. WHEN editing label text, THE Label_Settings_Popup SHALL provide bold formatting option
4. WHEN editing label text, THE Label_Settings_Popup SHALL provide italic formatting option
5. WHEN editing label text, THE Label_Settings_Popup SHALL support multi-line text (paragraph)
6. WHEN text formatting is applied, THE System SHALL render the label with the specified styles
7. WHEN the label popup opens, THE System SHALL load current formatting settings for the label

### Requirement 4: Node Settings Improvements

**User Story:** As a user, I want enhanced node color controls with hex code input and recent colors, so that I can quickly apply consistent colors.

#### Acceptance Criteria

1. WHEN editing node fill color, THE Node_Settings_Popup SHALL display a hex color code input field
2. WHEN editing node fill color, THE Node_Settings_Popup SHALL display the 5 most recently used colors
3. WHEN a user clicks a recent color, THE System SHALL apply that color to the node
4. WHEN a user enters a valid hex code, THE System SHALL update the color picker and apply the color
5. WHEN editing node border, THE Node_Settings_Popup SHALL include a border opacity % slider (0-100)
6. WHEN border opacity is set, THE System SHALL render the node border with the specified opacity
7. WHEN a new color is used, THE System SHALL add it to the recent colors list (max 5, FIFO)

### Requirement 5: AI Integration Enhancement

**User Story:** As a user, I want the AI to read and modify my diagram data directly, so that I can make complex changes through natural language commands.

#### Acceptance Criteria

1. WHEN a user asks the AI to modify data, THE AI_Assistant SHALL read the current JSON_Data from the diagram
2. WHEN the AI modifies data, THE System SHALL validate the modified JSON before applying
3. WHEN the AI suggests changes, THE System SHALL show a preview of the modifications
4. WHEN a user asks to convert units (e.g., "convert to billions"), THE AI_Assistant SHALL modify all flow amounts accordingly
5. WHEN a user asks to balance flows, THE AI_Assistant SHALL analyze imbalanced nodes and suggest corrections
6. WHEN AI modifications are applied, THE System SHALL update the diagram and add to undo history
7. WHEN the AI reads data, THE AI_Assistant SHALL have access to node names, flow connections, and amounts
8. WHEN the AI modifies data, THE System SHALL preserve node customizations and positions

### Requirement 6: Settings Persistence and Validation

**User Story:** As a user, I want my settings to be properly saved and validated, so that my customizations work correctly.

#### Acceptance Criteria

1. WHEN any setting is changed, THE System SHALL validate the input before applying
2. WHEN invalid input is detected, THE System SHALL display an appropriate error message
3. WHEN settings are applied, THE System SHALL immediately reflect changes in the diagram
4. WHEN the page is refreshed, THE System SHALL restore previously saved settings from localStorage
5. IF a setting value is out of range, THEN THE System SHALL clamp it to valid bounds

## Notes

- The toolbar fixes are critical for basic usability
- Label text formatting should use SVG tspan elements for bold/italic
- Recent colors should persist across sessions in localStorage
- AI integration should use the existing JSON editor data format
- All changes should integrate with the existing undo/redo system
