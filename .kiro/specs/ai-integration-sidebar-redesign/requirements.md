# Requirements Document

## Introduction

This document specifies the requirements for a comprehensive AI integration and sidebar UI redesign for the SankeyMATIC diagram builder application. The feature transforms the current basic AI add-on into a deeply integrated assistant optimized for financial data visualization, while simultaneously redesigning the cluttered sidebar into a clean, tabbed interface following a split-pane productivity layout.

## Glossary

- **Sankey_System**: The SankeyMATIC diagram builder application
- **AI_Assistant**: The integrated AI chatbot component that parses and converts financial data
- **Data_Editor**: The tabular interface for editing diagram flows with From/To/Amount columns
- **DSL**: Domain Specific Language - the text format used to define Sankey diagram flows (e.g., "Source [Amount] Target")
- **Financial_Flow**: A data structure representing money movement between categories (revenue, expenses, assets, liabilities)
- **Sidebar_Panel**: The right-side control panel containing input options, labels, nodes, and flows settings
- **Tab_Interface**: A UI component that organizes content into selectable tabs with collapsible sections
- **Split_Pane_Layout**: A screen layout with visualization on the left (~70%) and controls on the right (~30%)
- **YoY_Growth**: Year-over-Year growth percentage calculated from current and comparison amounts

## Requirements

### Requirement 1

**User Story:** As a financial analyst, I want to paste or upload screenshots of financial data into the AI chat, so that the system automatically parses and converts the data into Sankey diagram format.

#### Acceptance Criteria

1. WHEN a user pastes an image into the AI chat input THEN the Sankey_System SHALL accept the image and display a preview thumbnail
2. WHEN a user uploads a file via the AI chat interface THEN the Sankey_System SHALL accept image files (PNG, JPG, JPEG) and PDF documents
3. WHEN the AI_Assistant receives an image containing financial data THEN the Sankey_System SHALL extract text and numerical values from the image
4. WHEN financial data is extracted from an image THEN the Sankey_System SHALL convert the data into valid DSL format with From/To/Amount structure
5. WHEN parsed data is generated THEN the Sankey_System SHALL populate the Data_Editor table with the extracted flows

### Requirement 2

**User Story:** As a user, I want the AI assistant to understand financial terminology and categorization, so that it accurately interprets income statements, cash flows, and balance sheet data.

#### Acceptance Criteria

1. WHEN the AI_Assistant receives financial text input THEN the Sankey_System SHALL recognize standard financial terms (Revenue, COGS, Gross Profit, Operating Expenses, Net Income, etc.)
2. WHEN parsing financial data THEN the Sankey_System SHALL categorize items as revenue streams, expenses, assets, or liabilities based on context
3. WHEN generating Sankey flows THEN the Sankey_System SHALL create hierarchical relationships matching standard financial statement structures
4. WHEN processing income statement data THEN the Sankey_System SHALL generate flows from revenue sources through cost deductions to profit metrics
5. WHEN comparison data is present THEN the Sankey_System SHALL calculate and display YoY_Growth percentages on diagram nodes

### Requirement 3

**User Story:** As a user, I want bidirectional synchronization between the AI chat and Data Editor, so that changes in one interface reflect immediately in the other.

#### Acceptance Criteria

1. WHEN the AI_Assistant generates new flow data THEN the Sankey_System SHALL update the Data_Editor table within 500 milliseconds
2. WHEN a user modifies data in the Data_Editor THEN the Sankey_System SHALL make the updated data available to the AI_Assistant for context
3. WHEN the AI_Assistant suggests modifications to existing flows THEN the Sankey_System SHALL highlight affected rows in the Data_Editor
4. WHEN synchronization occurs THEN the Sankey_System SHALL preserve user-defined colors and custom formatting

### Requirement 4

**User Story:** As a user, I want the AI assistant to output optimally formatted data for Sankey diagrams, so that the generated visualizations follow best practices for financial flow representation.

#### Acceptance Criteria

1. WHEN generating Sankey flows THEN the Sankey_System SHALL apply semantic coloring (green for profits/retained value, red for costs/outflows, grey for neutral inputs)
2. WHEN creating node labels THEN the Sankey_System SHALL include item name, absolute value, and YoY_Growth percentage
3. WHEN outputting DSL THEN the Sankey_System SHALL validate that all flows balance (inputs equal outputs for intermediate nodes)
4. WHEN the AI_Assistant generates a complete financial diagram THEN the Sankey_System SHALL serialize the output to valid DSL text
5. WHEN the AI_Assistant generates DSL THEN the Sankey_System SHALL parse the DSL back to an equivalent data structure

### Requirement 5

**User Story:** As a user, I want a clean tabbed sidebar interface, so that I can easily navigate between feature categories without visual clutter.

#### Acceptance Criteria

1. WHEN the application loads THEN the Sankey_System SHALL display the Sidebar_Panel with collapsible tab sections
2. WHEN a user clicks on a tab header THEN the Sankey_System SHALL expand that tab's content and collapse other tabs
3. WHEN tabs transition between states THEN the Sankey_System SHALL animate the expansion and collapse with smooth transitions lasting between 200 and 400 milliseconds
4. WHEN the sidebar is displayed THEN the Sankey_System SHALL maintain the Split_Pane_Layout with visualization occupying approximately 70% width
5. WHEN a tab is collapsed THEN the Sankey_System SHALL hide all content within that tab while showing only the tab header

### Requirement 6

**User Story:** As a user, I want the AI chat interface integrated at the bottom of the Data Editor panel, so that I can quickly access AI parsing capabilities while working with data.

#### Acceptance Criteria

1. WHEN the Data Editor tab is active THEN the Sankey_System SHALL display an AI chat input field below the data table
2. WHEN a user types in the AI chat input THEN the Sankey_System SHALL provide a text field with placeholder text indicating image paste capability
3. WHEN the AI chat processes a request THEN the Sankey_System SHALL display a loading indicator during processing
4. WHEN AI processing completes THEN the Sankey_System SHALL display results inline or update the Data_Editor directly
5. IF the AI processing encounters an error THEN the Sankey_System SHALL display a descriptive error message to the user

### Requirement 7

**User Story:** As a user, I want the diagram to display validation status, so that I can verify my financial data is balanced and complete.

#### Acceptance Criteria

1. WHEN the diagram renders THEN the Sankey_System SHALL display a status indicator showing node balance state
2. WHEN all nodes are balanced (inputs equal outputs) THEN the Sankey_System SHALL display "All nodes are balanced" with a success indicator
3. IF any node has imbalanced flows THEN the Sankey_System SHALL display a warning with the specific node names and discrepancy amounts
4. WHEN a user clicks on a diagram element THEN the Sankey_System SHALL enable direct editing of that element's properties

### Requirement 8

**User Story:** As a developer, I want the AI system prompt to be customizable, so that the assistant behavior can be tuned for specific financial visualization use cases.

#### Acceptance Criteria

1. WHEN the AI_Assistant initializes THEN the Sankey_System SHALL load a default system prompt optimized for financial data interpretation
2. WHEN the system prompt is configured THEN the Sankey_System SHALL include instructions for financial terminology recognition
3. WHEN the system prompt is configured THEN the Sankey_System SHALL include rules for proper Sankey flow generation
4. WHEN processing user input THEN the AI_Assistant SHALL apply the configured system prompt context to all responses
