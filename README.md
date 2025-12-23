# Sankey Diagram Builder

A modern, interactive Sankey diagram builder built with React, TypeScript, and D3.js.

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

### ⚙️ Customization Options
- **Node Styling**: Custom colors, opacity, borders, and dimensions
- **Label Styling**: Fonts, colors, alignment, backgrounds, and positioning
- **Flow Styling**: Opacity, curvature, and color inheritance options
- **Themes**: Light and dark mode support

### 💾 Data Management
- **Data Table Editor**: Edit flows directly in a spreadsheet-like interface
- **Import/Export**: Import and export diagram data as JSON
- **Auto-save**: Your work is automatically saved to local storage
- **Undo/Redo**: Full history support with Ctrl+Z / Ctrl+Y

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **Chakra UI** - Component library
- **D3.js + d3-sankey** - Diagram rendering
- **react-datasheet-grid** - Spreadsheet editor
- **Vitest** - Testing framework

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:5173/

### Windows Users
Double-click `run-local.bat` to start the development server.

### Build for Production

```bash
npm run build
```

Output will be in the `dist` folder.

### Run Tests

```bash
npm test
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select Tool |
| H | Pan Tool |
| N | Add Node Tool |
| F | Add Flow Tool |
| Ctrl + Z | Undo |
| Ctrl + Y / Ctrl + Shift + Z | Redo |
| Delete | Delete selected flow |
| Escape | Deselect / Cancel |

## Data Format

Enter flows in the Data Editor with Source, Target, and Amount columns.

Example:
```
Salary → Budget: 1500
Budget → Taxes: 450
Budget → Housing: 420
Budget → Food: 400
Budget → Transportation: 255
```

## Deployment

### Netlify
The project includes `netlify.toml` for automatic deployment. Connect your repo to Netlify and it will build automatically.

### Vercel
The project includes `vercel.json` for Vercel deployment.

## License

MIT License - See LICENSE.txt for details
