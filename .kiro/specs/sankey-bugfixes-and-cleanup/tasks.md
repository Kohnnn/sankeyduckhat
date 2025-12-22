# Implementation Plan: Sankey Bugfixes and Cleanup

## Overview

This implementation plan addresses critical bugs, adds independent labels, enhances AI capabilities, and prepares the project for deployment. Tasks are ordered to fix bugs first, then add features, then cleanup.

## Tasks

- [x] 1. Fix Label Font Not Applying
  - [x] 1.1 Update applyLabelCustomizationToSVG to apply font-family
    - Read global font settings from opt_labels_fontface and opt_labels_googlefont
    - Apply font-family attribute to text element and all tspans
    - Ensure Google Fonts are loaded before applying
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Ensure font settings persist after re-render
    - Store font settings in nodeCustomizations
    - Re-apply font settings in applyLabelPositions
    - _Requirements: 1.3_
  - [x] 1.3 Write property test for label font application
    - **Property 1: Label Font Settings Apply and Persist**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 2. Fix Label Text Changing to Node Identity
  - [x] 2.1 Fix applyLabelPositions to not modify labelText
    - Remove any code that sets labelText to node identity
    - Only read labelText from nodeCustomizations, never write
    - _Requirements: 2.1_
  - [x] 2.2 Fix openLabelPopup to show current custom text
    - Load labelText from nodeCustomizations if exists
    - Only default to nodeName if labelText is undefined
    - _Requirements: 2.2, 2.3_
  - [x] 2.3 Write property test for label text preservation
    - **Property 2: Label Text Preservation**
    - **Validates: Requirements 2.1, 2.2**

- [ ] 3. Checkpoint - Verify label fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Fix Toolbar Button Functionality
  - [x] 4.1 Verify and fix tool button handlers (Select, Pan, Add Node, Add Flow)
    - Ensure data-tool buttons call setTool correctly
    - Verify cursor changes for each tool
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 4.2 Verify and fix zoom button handlers
    - Ensure zoom in/out buttons call ViewportController methods
    - Verify Fit and Reset Zoom buttons work
    - _Requirements: 3.5, 3.6, 3.7, 3.8_
  - [x] 4.3 Verify and fix action button handlers
    - Ensure Undo/Redo buttons call UndoManager
    - Ensure Export button shows options
    - Ensure New button calls SessionManager.resetSession
    - _Requirements: 3.9, 3.10, 3.11, 3.12_
  - [x] 4.4 Verify and fix reset button handlers
    - Ensure Reset Nodes clears positions and re-renders
    - Ensure Reset Labels clears label customizations
    - Ensure Factory Reset clears all state
    - _Requirements: 3.13, 3.14, 3.15_
  - [x] 4.5 Verify theme toggle button
    - Ensure Dark/Light toggle calls ThemeController
    - _Requirements: 3.16_
  - [x] 4.6 Write property test for toolbar handlers
    - **Property 3: Toolbar Button Handlers Execute**
    - **Validates: Requirements 3.1-3.16**

- [ ] 5. Checkpoint - Verify toolbar fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add Independent Labels Feature
  - [x] 6.1 Create IndependentLabelsManager module
    - Create independent-labels-manager.js in build folder
    - Implement addLabel, deleteLabel, updateLabel, getLabels methods
    - Implement _renderLabel to create SVG elements
    - Implement _save and _load for localStorage persistence
    - _Requirements: 4.1, 4.5, 4.6_
  - [x] 6.2 Add drag behavior for independent labels
    - Setup D3 drag on label groups
    - Update position on drag end
    - Save position to localStorage
    - _Requirements: 4.2_
  - [x] 6.3 Add double-click to edit independent labels
    - Create popup for editing independent label text and styling
    - Wire double-click handler to open popup
    - _Requirements: 4.3_
  - [x] 6.4 Add delete functionality for independent labels
    - Add delete button to label popup
    - Implement delete handler
    - _Requirements: 4.4_
  - [x] 6.5 Add "Add Label" button to toolbar
    - Add button to toolbar HTML
    - Wire click handler to IndependentLabelsManager.addLabel
    - _Requirements: 4.1_
  - [x] 6.6 Write property test for independent labels
    - **Property 4: Independent Label CRUD and Persistence**
    - **Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6**

- [ ] 7. Checkpoint - Verify independent labels
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Enhance AI Controller for Full State Read/Write
  - [x] 8.1 Implement getFullDiagramState method
    - Include all node identities with their custom labels
    - Include all flow values
    - Include all node customizations (colors, opacity, etc.)
    - Include all label customizations (font, color, alignment, etc.)
    - Include independent labels
    - _Requirements: 5.1_
  - [x] 8.2 Implement applyAIChanges method
    - Handle flow value changes
    - Handle node label text changes
    - Handle node color changes
    - Handle label styling changes
    - Handle independent label changes
    - Preserve unmodified customizations
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 8.3 Add undo support for AI changes
    - Record full state before changes
    - Enable undo to restore previous state
    - _Requirements: 5.7_
  - [x] 8.4 Update getDiagramStateForAI for AI context
    - Format state as readable text for AI prompt
    - Include JSON format for structured access
    - _Requirements: 5.1_
  - [x] 8.5 Write property test for AI state operations
    - **Property 5: AI Full State Read/Write**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

- [ ] 9. Checkpoint - Verify AI enhancements
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Project Cleanup for Deployment
  - [x] 10.1 Scan and identify unnecessary files
    - List all files in project root and build folder
    - Identify test artifacts, temp files, unused assets
    - _Requirements: 6.1_
  - [x] 10.2 Remove unnecessary files
    - Remove test-results.json if present
    - Remove any .log files
    - Remove any backup or temp files
    - Keep run-local.bat
    - _Requirements: 6.1, 6.2_
  - [x] 10.3 Verify build folder completeness
    - Ensure all required JS, CSS, HTML files present
    - Ensure no broken references
    - _Requirements: 6.3, 6.5_
  - [x] 10.4 Create/verify deployment configuration
    - Ensure index.html is at correct path for static hosting
    - Verify all asset paths are relative
    - _Requirements: 6.4_

- [x] 11. Final Checkpoint - Complete verification
  - Ensure all tests pass
  - Verify all toolbar buttons work
  - Verify label font and text fixes
  - Verify independent labels feature
  - Verify AI can read and modify full state
  - Verify project is clean and deployable

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Bug fixes are prioritized before new features
- Cleanup is done last to ensure no needed files are removed
