# Sankey Diagram Builder

A modern, interactive Sankey diagram builder with AI-powered data extraction and customization.

## Features

### 🎨 Visual Diagram Editor
- **Interactive Canvas**: Click and drag nodes and labels to customize your diagram layout
- **Real-time Preview**: See changes instantly as you edit
- **Multiple Export Options**: Export as PNG, SVG, or save your work as JSON

### 🛠️ Toolbar Tools
- **Select Tool (V)**: Click to select nodes, flows, or labels for editing
- **Pan Tool (H)**: Drag to pan around the canvas
- **Add Node (N)**: Click on canvas to add new nodes
- **Add Flow (F)**: Click two nodes to create a flow between them
- **Add Label**: Add independent text labels anywhere on the canvas

### 🤖 AI Assistant
- **Natural Language Input**: Describe your data in plain text and let AI extract flows
- **Image Upload**: Upload images of existing diagrams to extract data
- **Smart Suggestions**: Get AI-powered suggestions for improving your diagram

### ⚙️ Customization Options
- **Node Styling**: Custom colors, opacity, borders, and dimensions
- **Label Styling**: Fonts, colors, alignment, backgrounds, and positioning
- **Flow Styling**: Opacity, curvature, and color inheritance options
- **Themes**: Light and dark mode support

### 💾 Data Management
- **Data Table Editor**: Edit flows directly in a spreadsheet-like interface
- **CSV Import/Export**: Import data from CSV files
- **JSON Editor**: Advanced editing with full JSON access
- **Auto-save**: Your work is automatically saved to local storage

## Getting Started

1. Open the application in your browser
2. Enter your flow data in the Data Editor panel (format: `Source [Amount] Target`)
3. Customize your diagram using the toolbar and menu options
4. Export your finished diagram as PNG or SVG

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select Tool |
| H | Pan Tool |
| N | Add Node Tool |
| F | Add Flow Tool |
| L | Add Label Tool |
| Space + Drag | Temporary Pan |
| Ctrl + Z | Undo |
| Ctrl + Y | Redo |
| Ctrl + Scroll | Zoom |
| Delete | Delete selected flow |
| Escape | Deselect / Cancel |

## Data Format

Enter flows in the format:
```
Source [Amount] Target
```

Example:
```
Salary [1500] Budget
Budget [450] Taxes
Budget [420] Housing
Budget [400] Food
Budget [255] Transportation
```

## AI Features

To use AI features, you'll need to configure your API key:
1. Click "AI Settings" in the menu bar
2. Enter your Gemini API key
3. Start chatting with the AI assistant to describe your data

## Technologies Used

- [D3.js](https://d3js.org/) v7 - Data visualization
- [Canvg](https://github.com/canvg/canvg) - SVG to Canvas conversion
- Google Gemini API - AI-powered data extraction

## License

MIT License - See LICENSE.txt for details
