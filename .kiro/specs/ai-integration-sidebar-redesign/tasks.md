# Implementation Plan

- [x] 1. Set up core infrastructure and interfaces




  - [x] 1.1 Create TypeScript/JSDoc type definitions for all interfaces


    - Define FlowRow, FinancialFlow, ParsedFinancialData, ValidationResult interfaces
    - Define TabConfig, TabState, SidebarState interfaces
    - Define AIResult, SystemPromptConfig interfaces
    - _Requirements: 1.4, 3.4, 4.4, 5.1_
  - [x] 1.2 Set up test infrastructure for property-based testing


    - Configure fast-check test runners
    - Create custom arbitraries for FlowRow, FinancialCategory, TabConfig
    - Set up test file structure in build/__tests__/
    - _Requirements: 4.3, 4.5_


- [x] 2. Implement DSL Parser/Serializer module



  - [x] 2.1 Implement DSL parser with validation

    - Create parse() function to convert DSL text to FlowRow array
    - Create validate() function for syntax checking
    - Handle edge cases: empty lines, comments, node definitions
    - _Requirements: 1.4, 4.4_
  - [ ]* 2.2 Write property test for DSL round-trip
    - **Property 1: DSL Round-Trip Consistency**
    - **Validates: Requirements 1.4, 4.4, 4.5**
  - [x] 2.3 Implement DSL serializer

    - Create serialize() function to convert FlowRow array to DSL text
    - Preserve comments and node definitions from original text
    - Handle color formatting in output
    - _Requirements: 4.4, 4.5_
  - [ ]* 2.4 Write unit tests for DSL parser edge cases
    - Test empty input, malformed lines, special characters
    - Test color parsing variations (#abc, #aabbcc)
    - _Requirements: 1.4, 4.4_

- [x] 3. Implement Flow Validator module




  - [x] 3.1 Implement balance validation logic


    - Create validateBalance() function to check intermediate node balance
    - Create getNodeStats() to calculate input/output totals per node
    - Identify source nodes (no inputs) and sink nodes (no outputs)
    - _Requirements: 4.3, 7.1, 7.2_
  - [ ]* 3.2 Write property test for flow balance validation
    - **Property 6: Flow Balance Validation**
    - **Validates: Requirements 4.3, 7.1, 7.2**
  - [x] 3.3 Implement imbalance reporting


    - Return ImbalancedNode array with node names and discrepancy amounts
    - Format user-friendly warning messages
    - _Requirements: 7.3_
  - [ ]* 3.4 Write unit tests for validator edge cases
    - Test single flow, circular flows, disconnected nodes
    - _Requirements: 4.3, 7.3_

- [x] 4. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement YoY Growth Calculator




  - [x] 5.1 Implement YoY growth calculation function

    - Create calculateYoYGrowth(current, comparison) function
    - Handle edge cases: zero comparison, negative values
    - Return formatted percentage string
    - _Requirements: 2.5_
  - [ ]* 5.2 Write property test for YoY calculation
    - **Property 2: YoY Growth Calculation Accuracy**
    - **Validates: Requirements 2.5**


- [x] 6. Implement Semantic Color Mapper



  - [x] 6.1 Implement color mapping for financial categories

    - Create getSemanticColor(category) function
    - Map: revenue/asset → grey, expense/liability → red, profit → green
    - _Requirements: 4.1_
  - [ ]* 6.2 Write property test for semantic color mapping
    - **Property 4: Semantic Color Mapping**
    - **Validates: Requirements 4.1**

- [x] 7. Implement Node Label Generator




  - [x] 7.1 Implement label generation function


    - Create generateNodeLabel(name, value, yoyGrowth) function
    - Format value with currency prefix and short scale (k/M/B)
    - Include YoY percentage when comparison data exists
    - _Requirements: 4.2_
  - [ ]* 7.2 Write property test for label completeness
    - **Property 5: Node Label Completeness**
    - **Validates: Requirements 4.2**


- [x] 8. Implement Sync Manager module



  - [x] 8.1 Implement core sync functionality

    - Create SyncManager class with registerDataEditor() and registerAIChat()
    - Implement syncFromAI() to update Data Editor from AI results
    - Implement syncToAI() to provide current data to AI context
    - _Requirements: 3.1, 3.2_
  - [ ]* 8.2 Write property test for sync data preservation
    - **Property 7: Sync Preserves User Data**
    - **Validates: Requirements 3.4**
  - [ ]* 8.3 Write property test for sync to AI context
    - **Property 9: Data Editor Sync to AI Context**
    - **Validates: Requirements 3.2**
  - [x] 8.4 Implement row highlighting for AI suggestions

    - Create highlightRows(rowIds) function
    - Add/remove highlight CSS class on affected rows
    - _Requirements: 3.3_
  - [ ]* 8.5 Write property test for row highlight correctness
    - **Property 13: Row Highlight Correctness**
    - **Validates: Requirements 3.3**


- [x] 9. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.


- [x] 10. Implement Tabbed Sidebar component



  - [x] 10.1 Implement tab state management


    - Create TabbedSidebar class with initialize(), expandTab(), collapseTab()
    - Implement accordion behavior (one tab expanded at a time)
    - Store tab states in SidebarState object
    - _Requirements: 5.1, 5.2, 5.5_
  - [ ]* 10.2 Write property test for tab accordion behavior
    - **Property 8: Tab Accordion Behavior**
    - **Validates: Requirements 5.2, 5.5**
  - [x] 10.3 Implement tab rendering and animations


    - Create renderTabs() function to generate tab HTML
    - Add CSS transitions for smooth expand/collapse (200-400ms)
    - Wire up click handlers for tab headers
    - _Requirements: 5.1, 5.3_
  - [x] 10.4 Refactor existing sidebar panels into tabs


    - Convert Inputs, Labels, Nodes, Flows sections to tab format
    - Preserve all existing functionality within tabs
    - Update CSS for new tabbed layout
    - _Requirements: 5.1, 5.4_
  - [ ]* 10.5 Write unit tests for sidebar rendering
    - Test initial state, tab switching, content visibility
    - _Requirements: 5.1, 5.2_

- [-] 11. Implement AI Chat UI component


  - [x] 11.1 Implement chat input interface


    - Create AIChatUI class with render() function
    - Add text input field with placeholder for image paste hint
    - Position below Data Editor table
    - _Requirements: 6.1, 6.2_
  - [x] 11.2 Implement image paste handling


    - Add paste event listener for image data
    - Create preview thumbnail for pasted images
    - Store image blob for AI processing
    - _Requirements: 1.1_
  - [ ]* 11.3 Write property test for image paste preview
    - **Property 12: Image Paste Preview Generation**
    - **Validates: Requirements 1.1**
  - [x] 11.4 Implement file upload handling


    - Add file input for image/PDF upload
    - Validate file types (PNG, JPG, JPEG, PDF)
    - Display upload preview
    - _Requirements: 1.2_
  - [ ]* 11.5 Write property test for file type validation
    - **Property 3: File Type Validation**
    - **Validates: Requirements 1.2**
  - [x] 11.6 Implement loading and result display



    - Create setLoading() function with loading indicator
    - Create showResult() and showError() functions
    - Update Data Editor on successful result
    - _Requirements: 6.3, 6.4, 6.5_
  - [ ]* 11.7 Write property test for loading state UI
    - **Property 11: Loading State UI Consistency**
    - **Validates: Requirements 6.3**
  - [ ]* 11.8 Write property test for AI result display
    - **Property 14: AI Result Display**
    - **Validates: Requirements 6.4**


- [x] 12. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement AI Service module




  - [x] 13.1 Implement system prompt configuration


    - Create SystemPromptConfig with default financial prompt
    - Include financial terminology list
    - Include flow generation rules
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 13.2 Write property test for system prompt completeness
    - **Property 10: System Prompt Configuration Completeness**
    - **Validates: Requirements 8.2, 8.3**
  - [x] 13.3 Implement AI service initialization


    - Create AIService class with initialize() function
    - Load default system prompt on init
    - Set up API connection (placeholder for actual AI integration)
    - _Requirements: 8.1, 8.4_
  - [x] 13.4 Implement text parsing interface


    - Create parseFinancialText() function
    - Accept text input and return ParsedFinancialData
    - Apply system prompt context
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 13.5 Implement image parsing interface


    - Create parseFinancialImage() function
    - Accept image blob and return ParsedFinancialData
    - Handle OCR/vision API integration (placeholder)
    - _Requirements: 1.3_
  - [x] 13.6 Implement DSL generation from parsed data


    - Create generateDSL() function
    - Convert ParsedFinancialData to valid DSL text
    - Apply semantic colors based on categories
    - _Requirements: 1.4, 1.5, 4.1_
  - [ ]* 13.7 Write unit tests for AI service
    - Test initialization, prompt loading, DSL generation
    - _Requirements: 8.1, 1.4_

- [x] 14. Implement Validation Status Bar




  - [x] 14.1 Implement status bar UI component


    - Create status bar element below diagram
    - Display balance state with success/warning indicator
    - Show "All nodes are balanced" or imbalance warnings
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 14.2 Wire up status bar to flow validator


    - Update status on diagram render
    - Display specific node names and discrepancy amounts for imbalances
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 14.3 Write unit tests for status bar
    - Test balanced state display, imbalance warnings
    - _Requirements: 7.1, 7.2, 7.3_


- [x] 15. Integrate all components



  - [x] 15.1 Wire up AI Chat to AI Service and Sync Manager


    - Connect chat input to AI service processing
    - Connect AI results to Sync Manager for Data Editor update
    - Handle errors and display messages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1_
  - [x] 15.2 Wire up Data Editor to Sync Manager


    - Connect Data Editor changes to sync context updates
    - Enable row highlighting from AI suggestions
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 15.3 Wire up Flow Validator to diagram rendering


    - Validate flows on each diagram update
    - Update status bar with validation results
    - _Requirements: 4.3, 7.1, 7.2, 7.3_
  - [x] 15.4 Update main application entry point


    - Initialize all new components on page load
    - Set up event listeners and callbacks
    - Ensure backward compatibility with existing features
    - _Requirements: 5.1, 6.1, 8.1_

- [x] 16. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
