# Implementation Plan: UI Improvements and AI Enhancement

## Overview

This implementation plan covers comprehensive UI improvements for the Sankey Diagram Builder, including session management, toolbar functionality fixes, enhanced label and node customization settings, and deeper AI integration for data manipulation.

## Tasks

- [x] 1. Implement SessionManager for session reset functionality
  - [x] 1.1 Create SessionManager module with reset methods
    - Create `session-manager.js` in build folder
    - Implement `resetSession()` with confirmation dialog
    - Implement `clearDiagramData()` to clear data table and customizations
    - Implement `clearLocalStorage()` to remove sankeymatic keys
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 1.2 Write property test for session reset
    - **Property 1: Session Reset Clears All State**
    - **Validates: Requirements 1.1, 1.3, 1.4**
  - [x] 1.3 Add Reset Session button to toolbar
    - Add button with data-action="reset-session"
    - Wire up click handler in ToolbarController
    - _Requirements: 1.1_

- [x] 2. Fix toolbar button functionality
  - [x] 2.1 Wire up Reset Nodes button handler
    - Add `_handleResetNodes()` to ToolbarController
    - Clear `rememberedMoves` Map
    - Clear node positions from `customLayout`
    - Trigger re-render
    - _Requirements: 2.6_
  - [x] 2.2 Wire up Reset Labels button handler
    - Add `_handleResetLabels()` to ToolbarController
    - Clear `rememberedLabelMoves` Map
    - Clear label customizations from `nodeCustomizations`
    - Trigger re-render
    - _Requirements: 2.7_
  - [x] 2.3 Fix Export button to show options modal
    - Create export options modal (PNG, SVG)
    - Update `_handleExport()` to show modal
    - Wire up PNG/SVG export buttons
    - _Requirements: 2.3_
  - [x] 2.4 Write property tests for reset functionality
    - **Property 6: Reset Nodes Restores Calculated Positions**
    - **Property 7: Reset Labels Restores Default Positions**
    - **Validates: Requirements 2.6, 2.7**

- [x] 3. Checkpoint - Verify toolbar and session reset
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement RecentColorsManager
  - [x] 4.1 Create RecentColorsManager module
    - Create `recent-colors-manager.js` in build folder
    - Implement `getRecentColors()` loading from localStorage
    - Implement `addColor(hex)` with FIFO behavior (max 5)
    - Implement `renderRecentColors(container, onSelect)`
    - _Requirements: 4.2, 4.7_
  - [x] 4.2 Write property test for recent colors FIFO
    - **Property 11: Recent Colors FIFO Behavior**
    - **Validates: Requirements 4.2, 4.7**

- [x] 5. Enhance Node Settings Popup
  - [x] 5.1 Add hex color input fields to Node Popup
    - Add hex input next to fill color picker
    - Add hex input next to border color picker
    - Sync hex input with color picker bidirectionally
    - _Requirements: 4.1, 4.4_
  - [x] 5.2 Add recent colors display to Node Popup
    - Add recent colors container div
    - Integrate RecentColorsManager rendering
    - Wire up color selection to apply to node
    - _Requirements: 4.2, 4.3_
  - [x] 5.3 Add border opacity slider to Node Popup
    - Add range input for border opacity (0-100)
    - Add opacity value display
    - Update `applyNodeCustomizationToSVG` to apply stroke-opacity
    - _Requirements: 4.5, 4.6_
  - [x] 5.4 Write property tests for node settings
    - **Property 12: Hex Color Input Sync**
    - **Property 13: Border Opacity Renders Correctly**
    - **Validates: Requirements 4.4, 4.6**

- [x] 6. Enhance Label Settings Popup
  - [x] 6.1 Replace box width/height with text margins
    - Remove box width/height inputs
    - Add margin inputs (top, right, bottom, left)
    - Update `applyLabelCustomizationToSVG` to apply margins as padding
    - _Requirements: 3.1, 3.2_
  - [x] 6.2 Add text formatting controls
    - Add bold toggle button
    - Add italic toggle button
    - Update `applyLabelCustomizationToSVG` to apply font-weight/font-style
    - _Requirements: 3.3, 3.4, 3.6_
  - [x] 6.3 Add multi-line text support
    - Replace single-line input with textarea
    - Update label rendering to handle newlines as tspans
    - _Requirements: 3.5_
  - [x] 6.4 Ensure label settings load correctly
    - Update `openLabelPopup` to load all new settings
    - Include margins, bold, italic, multi-line text
    - _Requirements: 3.7_
  - [x] 6.5 Write property tests for label settings
    - **Property 8: Text Margins Apply Padding**
    - **Property 9: Text Formatting Renders Correctly**
    - **Property 10: Label Settings Persistence**
    - **Validates: Requirements 3.2, 3.6, 3.7**

- [x] 7. Checkpoint - Verify popup enhancements
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement AIController for data manipulation
  - [x] 8.1 Create AIController module
    - Create `ai-controller.js` in build folder
    - Implement `getDiagramData()` to read from data table
    - Implement `applyDiagramData(newData)` with validation
    - Integrate with UndoManager for undo support
    - _Requirements: 5.1, 5.2, 5.6, 5.7_
  - [x] 8.2 Implement unit conversion function
    - Add `convertUnits(factor, suffix)` method
    - Multiply all flow amounts by factor
    - Optionally append suffix to node names
    - _Requirements: 5.4_
  - [x] 8.3 Implement flow balance analysis
    - Add `analyzeFlowBalance()` method
    - Calculate inflows/outflows per node
    - Identify imbalanced nodes
    - Generate correction suggestions
    - _Requirements: 5.5_
  - [x] 8.4 Preserve customizations on AI modifications
    - Store customizations before applying changes
    - Restore customizations after data update
    - _Requirements: 5.8_
  - [x] 8.5 Write property tests for AI controller
    - **Property 14: AI Data Access Completeness**
    - **Property 15: AI Data Validation**
    - **Property 16: Unit Conversion Accuracy**
    - **Property 17: AI Changes Preserve Customizations**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.7, 5.8**

- [x] 9. Integrate AI with chat interface
  - [x] 9.1 Wire AIController to AI chat
    - Update AI chat to call AIController methods
    - Pass diagram data to AI context
    - Handle AI modification responses
    - _Requirements: 5.1, 5.3_
  - [x] 9.2 Add preview for AI modifications
    - Show diff/preview before applying changes
    - Allow user to accept or reject
    - _Requirements: 5.3_

- [x] 10. Implement input validation and persistence
  - [x] 10.1 Add validation utilities
    - Create validation functions for hex colors, opacity, margins
    - Implement value clamping for out-of-range inputs
    - _Requirements: 6.1, 6.5_
  - [x] 10.2 Add error message display
    - Show validation errors in popups
    - Clear errors on valid input
    - _Requirements: 6.2_
  - [x] 10.3 Ensure settings persistence
    - Verify all new settings save to localStorage
    - Verify settings restore on page refresh
    - _Requirements: 6.3, 6.4_
  - [x] 10.4 Write property tests for validation
    - **Property 18: Input Validation and Clamping**
    - **Property 19: Settings Persistence Round-Trip**
    - **Validates: Requirements 6.1, 6.4, 6.5**

- [x] 11. Final Checkpoint - Complete integration testing
  - ✅ All 193 tests pass
  - ✅ Complete workflow verified: reset session, customize nodes/labels, AI modifications
  - ✅ All toolbar buttons work correctly

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
