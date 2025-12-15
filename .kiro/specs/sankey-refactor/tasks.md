# Implementation Plan

- [x] 1. Set up testing infrastructure and new module files




  - [x] 1.1 Create test directory structure and configure Vitest

    - Create `build/__tests__/` and `build/__tests__/properties/` directories
    - Add vitest.config.js with appropriate settings
    - Add fast-check as dependency for property-based testing
    - _Requirements: Testing Strategy_

  - [x] 1.2 Create skeleton module files


    - Create `build/color_palettes.js` with module structure and exports
    - Create `build/templates.js` with module structure and exports
    - Create `build/data_editor.js` with module structure and exports
    - Add script tags to index.html for new modules
    - _Requirements: 2.1, 4.1_

- [x] 2. Implement Layout Refactoring and Chrome Removal





  - [x] 2.1 Update HTML structure


    - Remove SankeyMATIC header navigation links (News, Data, Gallery, Manual, About)
    - Replace with generic personal header
    - Remove donation callout banner
    - Remove "Sample Diagrams" section and all sample diagram buttons
    - Remove "Made at SankeyMATIC" checkbox
    - Remove footer external navigation links, replace with generic footer
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Clean up JavaScript


    - Remove replaceGraph, replaceGraphConfirmed, hideReplaceGraphWarning functions
    - Remove sampleDiagramRecipes from constants.js
    - Remove related event handlers and DOM references
    - _Requirements: 1.6_

  - [x] 2.3 Update CSS with new color scheme and typography


    - Add Google Fonts import for Manrope
    - Update CSS custom properties with new color palette:
      - `--primary-red: #DA2B1F`
      - `--secondary-blue: #00308C`
      - `--positive-green: #00FF00`
      - `--neutral-bg: #E6E6E6`
    - Add tint variations (90%, 75%, 60%) for each primary color
    - Set Manrope as primary font-family
    - Update all color references throughout build.css
    - _Requirements: 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

- [-] 3. Implement Color Palettes Module



  - [x] 3.1 Implement core palette data structures and functions


    - Define default palettes (Categories, Tableau10, Dark, Varied) using existing colorThemes
    - Implement `get(id)` function to retrieve palette by ID
    - Implement `getColorForIndex(paletteId, index)` with modulo cycling
    - Implement `getAllOptions()` to return palette options for dropdown
    - _Requirements: 2.1, 2.3_

  - [x] 3.2 Write property test for palette color cycling


    - **Property 1: Palette Color Cycling**
    - **Validates: Requirements 2.3, 2.8, 2.9**

  - [x] 3.3 Implement custom palette CRUD operations


    - Implement `saveCustom(name, colors)` with hex validation
    - Implement `deleteCustom(name)` function
    - Implement `loadFromStorage()` to restore custom palettes
    - Add localStorage persistence with key `skm_custom_palettes`
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 3.4 Write property test for custom palette round-trip


    - **Property 2: Custom Palette Round-Trip**
    - **Validates: Requirements 2.6, 2.7**

  - [ ] 3.5 Update UI for palette selection
    - Replace radio button theme selector with `<select>` dropdown
    - Add Custom Palette UI section with name input and color list textarea
    - Add Save/Delete buttons for custom palettes
    - Wire up event handlers to ColorPalettes module
    - _Requirements: 2.2, 2.4, 2.5, 2.9_

  - [ ] 3.6 Implement default palette preference
    - Add "Use as Default" checkbox next to palette dropdown
    - Implement `getDefaultPalette()` and `setDefaultPalette(id)` functions
    - Add localStorage persistence with key `skm_default_palette`
    - Update initialization to load and apply default palette
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.7 Write property test for default palette preference
    - **Property 3: Default Palette Preference Round-Trip**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [ ] 3.8 Integrate palette module with rendering
    - Update render_sankey to use ColorPalettes.getColorForIndex
    - Remove old colorThemes logic from sankeymatic.js
    - Ensure backward compatibility with existing node_theme settings
    - _Requirements: 2.3, 2.9_


- [x] 4. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Implement Templates Module



  - [x] 5.1 Implement template data structures and storage


    - Define Template and TemplateSettings interfaces
    - Implement `captureCurrentSettings()` to extract all styling settings
    - Implement `save(name)` to create and persist template
    - Implement `loadFromStorage()` to restore templates
    - Add localStorage persistence with key `skm_templates`
    - _Requirements: 4.1, 4.3, 4.5_

  - [x] 5.2 Write property test for template persistence


    - **Property 4: Template Persistence Round-Trip**
    - **Validates: Requirements 4.5, 4.9**

  - [x] 5.3 Implement template application


    - Implement `apply(name)` to restore settings from template
    - Ensure flow data (textarea content) is NOT modified
    - Update all UI controls to reflect applied settings
    - Trigger diagram re-render after applying
    - _Requirements: 4.6, 4.7_

  - [x] 5.4 Write property tests for template application and flow data invariant


    - **Property 5: Template Application Round-Trip**
    - **Property 6: Template Flow Data Invariant**
    - **Validates: Requirements 4.3, 4.4, 4.6, 4.7**

  - [x] 5.5 Implement template deletion


    - Implement `delete(name)` function
    - Update localStorage after deletion
    - _Requirements: 4.8_

  - [x] 5.6 Create Templates UI


    - Add "Templates" section to UI with dropdown for saved templates
    - Add "Save" button with name input dialog
    - Add "Apply" button to apply selected template
    - Add "Delete" button with confirmation
    - Wire up event handlers to Templates module
    - _Requirements: 4.2, 4.9_

- [x] 6. Implement Draggable Labels





  - [x] 6.1 Refactor label rendering to use SVG groups


    - Wrap each label in `<g class="label-group">` with transform attribute
    - Add transparent `<rect class="drag-handle">` to each label group
    - Ensure drag-handle covers label bounding box
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Write property test for label SVG structure


    - **Property 7: Label SVG Structure**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 6.3 Implement d3.drag behavior for labels


    - Create drag behavior with start, drag, end handlers
    - Update label transform on drag
    - Store offset in rememberedMoves map during drag
    - _Requirements: 5.3_

  - [x] 6.4 Implement labelmove DSL persistence


    - Add labelmove line generation on drag end
    - Parse labelmove lines during input processing
    - Apply parsed offsets to label positions during render
    - Add regex pattern for labelmove to constants.js
    - _Requirements: 5.4, 5.5_

  - [x] 6.5 Write property test for label move round-trip


    - **Property 8: Label Move Round-Trip**
    - **Validates: Requirements 5.4, 5.5**

  - [x] 6.6 Add Reset Labels functionality


    - Add "Reset Labels" button to UI
    - Implement handler to clear all labelmove lines from input
    - Clear rememberedMoves map
    - Trigger diagram re-render
    - _Requirements: 5.6, 5.7_

- [x] 7. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.


- [x] 8. Implement Label Style Panel Enhancements



  - [x] 8.1 Add Google Fonts integration


    - Add Google Fonts API link for Inter, Manrope, Roboto, Open Sans, Lato
    - Create font selector dropdown in Labels panel
    - Store selected font in labels_googlefont setting
    - Apply selected font to SVG text elements
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Write property test for font application


    - **Property 9: Font Application**
    - **Validates: Requirements 6.2**

  - [x] 8.3 Implement decimal places control


    - Add "Decimal places" dropdown with options (0, 1, 2, All)
    - Store setting in labels_decimalplaces
    - Update formatUserData function to respect decimal places setting
    - _Requirements: 6.3, 6.4_

  - [x] 8.4 Write property test for decimal places formatting


    - **Property 10: Decimal Places Formatting**
    - **Validates: Requirements 6.4**

  - [x] 8.5 Implement value mode control


    - Add "Value Mode" dropdown with options (Absolute, Short Scale, Hidden)
    - Store setting in labels_valuemode
    - Implement short scale formatting (k, M, B suffixes)
    - Update label rendering to respect value mode
    - _Requirements: 6.5, 6.6_

  - [x] 8.6 Write property test for short scale formatting


    - **Property 11: Short Scale Formatting**
    - **Validates: Requirements 6.6**

  - [x] 8.7 Implement comparison line feature


    - Add "Show Comparison %" checkbox to Labels panel
    - Store setting in labels_comparisonline
    - Calculate total diagram input value
    - Add third text line to labels showing (node value / total) * 100
    - _Requirements: 6.7, 6.8_

  - [x] 8.8 Write property test for comparison line percentage


    - **Property 12: Comparison Line Percentage**
    - **Validates: Requirements 6.8**

  - [x] 8.9 Reorganize Labels panel UI


    - Group related controls logically (Typography, Formatting, Content)
    - Use fieldsets or details/summary for organization
    - Ensure consistent spacing and alignment
    - _Requirements: 6.9_


- [x] 9. Implement Data Editor Tab



  - [x] 9.1 Create tabbed interface structure


    - Add tab container with "Text Input" and "Data Editor" tabs
    - Implement tab switching logic
    - Style tabs to match application theme
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.2 Implement DSL parser for Data Editor


    - Create parseFromDSL function to extract flow rows from text
    - Handle comments, node definitions, and flow lines
    - Extract source, target, amount, color from each flow
    - Return array of FlowRow objects
    - _Requirements: 7.4_

  - [x] 9.3 Implement DSL serializer


    - Create toDSL function to convert FlowRow array to DSL text
    - Preserve comments and node definitions from original
    - Generate proper flow line syntax
    - _Requirements: 7.5_

  - [x] 9.4 Write property test for DSL-Table two-way sync


    - **Property 13: DSL-Table Two-Way Sync**
    - **Validates: Requirements 7.4, 7.5, 7.6, 7.7, 7.11**

  - [x] 9.5 Create dynamic table UI


    - Render HTML table with Source, Target, Amount, Comparison columns
    - Add editable cells with input elements
    - Add row add/delete buttons
    - Wire up change handlers for two-way sync
    - _Requirements: 7.3, 7.5, 7.6, 7.7_

  - [x] 9.6 Implement row validation


    - Create validateRow function checking required fields
    - Validate amount is numeric and positive
    - Validate source and target are non-empty
    - Apply error CSS class to invalid rows
    - _Requirements: 7.10_

  - [x] 9.7 Write property test for invalid row highlighting


    - **Property 15: Invalid Row Highlighting**
    - **Validates: Requirements 7.10**

  - [x] 9.8 Implement CSV export


    - Create exportCSV function generating CSV string
    - Include header row (Source, Target, Amount, Comparison, Color)
    - Trigger file download with generated CSV
    - _Requirements: 7.8_

  - [x] 9.9 Implement CSV import


    - Add file input for CSV upload
    - Create importCSV function to parse CSV content
    - Populate table and sync to text input
    - Handle parsing errors gracefully
    - _Requirements: 7.9_

  - [x] 9.10 Write property test for CSV round-trip


    - **Property 14: CSV Round-Trip**
    - **Validates: Requirements 7.8, 7.9**

  - [x] 9.11 Implement two-way sync handlers


    - Add text input change listener to update table
    - Add table change listener to update text input
    - Debounce sync operations to prevent loops
    - Trigger diagram re-render on changes
    - _Requirements: 7.11_


- [x] 10. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.


- [x] 11. Final integration and cleanup




  - [x] 11.1 Integration testing


    - Test full workflow: create diagram → customize → save template → reload
    - Test palette persistence across sessions
    - Test Data Editor sync with complex DSL inputs
    - Verify all features work together without conflicts
    - _Requirements: All_

  - [x] 11.2 Code cleanup


    - Remove any dead code from refactoring
    - Ensure consistent code style across all modules
    - Add JSDoc comments to public functions
    - _Requirements: All_
