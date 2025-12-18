
## App layout: Refactor Layout & Remove Chrome
**Objective:** Clean up the interface to focus solely on the diagram builder.
*   **Actions:**
    *   Removed global header, footer, navigation links, and social media icons. Replace it with generic personal header and foote
    *   Removed the "Sample Diagrams" section and buttons.
    *   Removed the donation callout and "Made at SankeyMATIC" checkbox.
    *   Cleaned up associated CSS and dead JavaScript code (`replaceGraph` logic).
    *   Use manrope for font and update the site into these colour code and: Palette description: #DA2B1F (RGB 218,43,31) = primary brand red for headlines/negative flags, #00308C (RGB 0,48,140) = secondary brand blue for charts/tables, #00FF00 (RGB 0,255,0) = positive signal accent, ~#E6E6E6 (RGB 230,230,230) = neutral background/dividers, and use 90-60% lighter tints of red/blue/green for secondary fills and hierarchy while keeping hue consistent.

App funtion specific:
## 2. Color Palettes Module
**Objective:** detailed control over node colors with persistence.
*   **Actions:**
    *   Created `build/color_palettes.js` with default palettes (Categories, Tableau10, Dark, Varied).
    *   Replaced radio button theme selector with a generic `<select>` dropdown.
    *   Implemented "Custom Palette" UI to allow users to define and name their own hex color lists.
    *   Added `localStorage` persistence for custom palettes.
    *   Updated rendering logic to cycle through the selected palette's colors.

## 3. Default Palette Toggle
**Objective:** Automatically apply a preferred palette on startup.
*   **Actions:**
    *   Added a "Use as Default" checkbox next to the palette dropdown.
    *   Implemented logic to save the preference to `localStorage`.
    *   Updated initialization to check for and load the default palette if set.

## 4. Diagram Templates
**Objective:** Save and restore visual styling configurations.
*   **Actions:**
    *   Created `build/templates.js` to manage template data structure (styling, canvas, labels, export).
    *   Added "Templates" UI section with "Save", "Apply", and "Delete" controls.
    *   Implemented `localStorage` persistence for templates.
    *   Ensured applying a template updates settings without altering the flow data.

## 5. Draggable Labels
**Objective:** Allow manual fine-tuning of label positions.
*   **Actions:**
    *   Refactored label rendering in `sankeymatic.js` to use SVG groups (`<g>`) with transforms.
    *   Added transparent `drag-handle` rects to labels for easier interaction.
    *   Implemented `d3.drag` behavior to update positions.
    *   Added persistence for label offsets (`labelmove` lines in the DSL).
    *   Added a "Reset Labels" button to clear manual positioning.

## 6. Label Style Panel Enhancements
**Objective:** Modernize label typography and content control.
*   **Actions:**
    *   **Font Selector:** Added Google Fonts integration (Inter, Manrope, Roboto, etc.) and a dropdown selector.
    *   **Formatting Controls:** Added "Decimal places" (0, 1, 2, All) and "Value Mode" (Absolute, Short Scale 1k/1M, Hidden).
    *   **Comparison Line:** Added functionality to show a 3rd line with the node's percentage of the total diagram input.
    *   Refactored the "Labels" UI panel to organize these controls logically.

## 7. Data Editor Tab
**Objective:** Provide a structured alternative to the text-based DSL.
*   **Actions:**
    *   Implemented a Tabbed interface ("Text Input" vs "Data Editor").
    *   Created a dynamic HTML Table editor for Source, Target, Amount, and Comparison values.
    *   Implemented **Two-Way Sync**:
        *   Text -> Table parsing when opening the editor.
        *   Table -> Text serialization (DSL generation) when editing.
    *   Added "Export CSV" and "Import CSV" buttons.
    *   Added row validation (visual highlighting for invalid data).



The label still can not be drag and change separately from the node. You should know that the label is the text box.



Also add option to change each text box size and alignment