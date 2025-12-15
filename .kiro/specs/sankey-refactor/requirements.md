# Requirements Document

## Introduction

This document specifies the requirements for a comprehensive refactoring and enhancement of the SankeyMATIC diagram builder application. The project involves cleaning up the interface to focus on the diagram builder, implementing a new color palette system with custom palette support, adding diagram templates, enabling draggable labels, enhancing label styling options, and creating a structured data editor as an alternative to the text-based DSL input.

## Glossary

- **SankeyMATIC**: The Sankey diagram builder web application being refactored
- **DSL (Domain Specific Language)**: The text-based input format for defining flows between nodes (e.g., "Source [Amount] Target")
- **Palette**: A collection of hex colors used to style nodes in the diagram
- **Template**: A saved configuration of visual styling settings that can be applied to diagrams
- **Node**: A rectangular element in the Sankey diagram representing a source or destination
- **Flow**: A curved or straight path connecting nodes, representing data movement
- **localStorage**: Browser-based persistent storage for user preferences and custom data
- **Manrope**: A Google Font family to be used as the primary typeface
- **Data Editor**: A tabular interface for editing diagram flows as an alternative to text input

## Requirements

### Requirement 1: Layout Refactoring and Chrome Removal

**User Story:** As a user, I want a clean, focused interface without unnecessary navigation elements, so that I can concentrate on building my diagram.

#### Acceptance Criteria

1. WHEN the application loads THEN the System SHALL display a generic personal header without SankeyMATIC-specific branding links
2. WHEN the application loads THEN the System SHALL display a generic personal footer without external navigation links
3. WHEN the application loads THEN the System SHALL NOT display the "Sample Diagrams" section or sample diagram buttons
4. WHEN the application loads THEN the System SHALL NOT display the donation callout banner
5. WHEN the application loads THEN the System SHALL NOT display the "Made at SankeyMATIC" checkbox
6. WHEN the application loads THEN the System SHALL NOT include the replaceGraph JavaScript logic for sample diagrams
7. WHEN the application loads THEN the System SHALL apply Manrope as the primary font family
8. WHEN the application loads THEN the System SHALL use #DA2B1F as the primary brand red color for headlines
9. WHEN the application loads THEN the System SHALL use #00308C as the secondary brand blue color for charts and tables
10. WHEN the application loads THEN the System SHALL use #00FF00 as the positive signal accent color
11. WHEN the application loads THEN the System SHALL use #E6E6E6 as the neutral background color for dividers
12. WHEN styling secondary elements THEN the System SHALL use 90-60% lighter tints of the primary colors while maintaining hue consistency

### Requirement 2: Color Palettes Module

**User Story:** As a user, I want detailed control over node colors with multiple palette options and the ability to create custom palettes, so that I can match my diagram to my brand or preferences.

#### Acceptance Criteria

1. WHEN the application initializes THEN the System SHALL load a color_palettes.js module containing default palettes (Categories, Tableau10, Dark, Varied)
2. WHEN the user views the node color options THEN the System SHALL display a dropdown select element instead of radio buttons for theme selection
3. WHEN the user selects a palette from the dropdown THEN the System SHALL apply that palette's colors to nodes in cyclic order
4. WHEN the user accesses the Custom Palette UI THEN the System SHALL allow the user to define a palette name
5. WHEN the user accesses the Custom Palette UI THEN the System SHALL allow the user to enter a list of hex color values
6. WHEN the user saves a custom palette THEN the System SHALL persist the palette to localStorage
7. WHEN the application loads THEN the System SHALL restore previously saved custom palettes from localStorage
8. WHEN the user selects a custom palette THEN the System SHALL apply those colors to nodes in cyclic order
9. WHEN rendering nodes THEN the System SHALL cycle through the selected palette's colors for nodes without explicit color assignments

### Requirement 3: Default Palette Toggle

**User Story:** As a user, I want to set a preferred palette as my default, so that new diagrams automatically use my favorite color scheme.

#### Acceptance Criteria

1. WHEN the user views the palette dropdown THEN the System SHALL display a "Use as Default" checkbox adjacent to the dropdown
2. WHEN the user checks "Use as Default" THEN the System SHALL save the currently selected palette identifier to localStorage
3. WHEN the application initializes THEN the System SHALL check localStorage for a default palette preference
4. WHEN a default palette preference exists THEN the System SHALL automatically select and apply that palette on startup
5. WHEN the user unchecks "Use as Default" THEN the System SHALL remove the default palette preference from localStorage

### Requirement 4: Diagram Templates

**User Story:** As a user, I want to save and restore visual styling configurations, so that I can quickly apply consistent styling across multiple diagrams.

#### Acceptance Criteria

1. WHEN the application initializes THEN the System SHALL load a templates.js module for managing template data
2. WHEN the user accesses the Templates UI THEN the System SHALL display "Save", "Apply", and "Delete" controls
3. WHEN the user saves a template THEN the System SHALL capture current styling settings (node appearance, flow appearance, canvas settings, label settings, export settings)
4. WHEN the user saves a template THEN the System SHALL NOT capture the flow data (source, target, amounts)
5. WHEN the user saves a template THEN the System SHALL persist the template to localStorage with a user-provided name
6. WHEN the user applies a template THEN the System SHALL update all styling settings to match the template values
7. WHEN the user applies a template THEN the System SHALL NOT modify the current flow data
8. WHEN the user deletes a template THEN the System SHALL remove that template from localStorage
9. WHEN the application loads THEN the System SHALL restore previously saved templates from localStorage

### Requirement 5: Draggable Labels

**User Story:** As a user, I want to manually fine-tune label positions by dragging them, so that I can optimize the visual layout of my diagram.

#### Acceptance Criteria

1. WHEN rendering labels THEN the System SHALL wrap each label in an SVG group element with a transform attribute
2. WHEN rendering labels THEN the System SHALL add a transparent drag-handle rectangle to each label group for easier interaction
3. WHEN the user drags a label THEN the System SHALL update the label's transform position using d3.drag behavior
4. WHEN the user releases a dragged label THEN the System SHALL persist the label offset as a labelmove line in the DSL
5. WHEN parsing input THEN the System SHALL recognize and apply labelmove lines to position labels
6. WHEN the user clicks "Reset Labels" THEN the System SHALL clear all manual label positioning offsets
7. WHEN the user clicks "Reset Labels" THEN the System SHALL re-render the diagram with default label positions

### Requirement 6: Label Style Panel Enhancements

**User Story:** As a user, I want modern typography options and content controls for labels, so that I can create professional-looking diagrams with customized label formatting.

#### Acceptance Criteria

1. WHEN the user views the Labels panel THEN the System SHALL display a font selector dropdown with Google Fonts options (Inter, Manrope, Roboto, and others)
2. WHEN the user selects a Google Font THEN the System SHALL load and apply that font to diagram labels
3. WHEN the user views the Labels panel THEN the System SHALL display a "Decimal places" control with options (0, 1, 2, All)
4. WHEN the user selects a decimal places option THEN the System SHALL format label values accordingly
5. WHEN the user views the Labels panel THEN the System SHALL display a "Value Mode" control with options (Absolute, Short Scale 1k/1M, Hidden)
6. WHEN the user selects "Short Scale" value mode THEN the System SHALL format large numbers with k/M/B suffixes
7. WHEN the user views the Labels panel THEN the System SHALL display a "Comparison Line" toggle
8. WHEN the user enables "Comparison Line" THEN the System SHALL display a third line on each label showing the node's percentage of total diagram input
9. WHEN the Labels panel renders THEN the System SHALL organize all controls in a logical grouped layout

### Requirement 7: Data Editor Tab

**User Story:** As a user, I want a structured table-based alternative to the text DSL input, so that I can edit diagram data more intuitively.

#### Acceptance Criteria

1. WHEN the user views the input area THEN the System SHALL display a tabbed interface with "Text Input" and "Data Editor" tabs
2. WHEN the user selects "Text Input" tab THEN the System SHALL display the existing textarea for DSL input
3. WHEN the user selects "Data Editor" tab THEN the System SHALL display a dynamic HTML table with columns for Source, Target, Amount, and Comparison values
4. WHEN the user opens the Data Editor THEN the System SHALL parse the current text input and populate the table rows
5. WHEN the user edits a cell in the Data Editor THEN the System SHALL update the text input with the corresponding DSL representation
6. WHEN the user adds a row in the Data Editor THEN the System SHALL append a new flow line to the text input
7. WHEN the user deletes a row in the Data Editor THEN the System SHALL remove the corresponding flow line from the text input
8. WHEN the user clicks "Export CSV" THEN the System SHALL generate and download a CSV file containing the current flow data
9. WHEN the user clicks "Import CSV" THEN the System SHALL parse the uploaded CSV and populate both the table and text input
10. WHEN a row contains invalid data THEN the System SHALL visually highlight that row to indicate validation errors
11. WHEN the text input changes THEN the System SHALL update the Data Editor table to reflect those changes
