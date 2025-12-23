/**
 * Export and Import utilities for SankeyMATIC diagrams
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import {
  DiagramState,
  Flow,
  NodeCustomization,
  LabelCustomization,
  DiagramSettings,
} from '../store/useDiagramStore';

// ============================================================================
// Constants
// ============================================================================

const EXPORT_VERSION = '1.0.0';

// ============================================================================
// Export Types
// ============================================================================

export interface DiagramExport {
  version: string;
  title: string;
  flows: Flow[];
  nodeCustomizations: Record<string, NodeCustomization>;
  labelCustomizations: Record<string, LabelCustomization>;
  settings: DiagramSettings;
  exportedAt: string;
}

// ============================================================================
// SVG Export (Requirement 7.2)
// ============================================================================

/**
 * Serializes an SVG element to a string and triggers download
 * @param svgElement - The SVG element to export
 * @param filename - The filename for the download (without extension)
 */
export const exportSVG = (svgElement: SVGSVGElement, filename: string = 'sankey-diagram'): void => {
  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Ensure the SVG has proper namespace
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  
  // Get computed styles and inline them for standalone SVG
  inlineStyles(clonedSvg);
  
  // Serialize to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  
  // Create blob and trigger download
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, `${filename}.svg`);
};

/**
 * Inlines computed styles into SVG elements for standalone export
 */
const inlineStyles = (svgElement: SVGSVGElement): void => {
  const elements = svgElement.querySelectorAll('*');
  elements.forEach((el) => {
    if (el instanceof SVGElement) {
      const computedStyle = window.getComputedStyle(el);
      // Inline key SVG styles
      const stylesToInline = ['fill', 'stroke', 'stroke-width', 'opacity', 'font-family', 'font-size'];
      stylesToInline.forEach((prop) => {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== '') {
          el.style.setProperty(prop, value);
        }
      });
    }
  });
};

// ============================================================================
// PNG Export (Requirement 7.1)
// ============================================================================

/**
 * Converts an SVG element to PNG and triggers download
 * @param svgElement - The SVG element to export
 * @param filename - The filename for the download (without extension)
 * @param scale - Scale factor for the output image (default: 2 for retina)
 */
export const exportPNG = async (
  svgElement: SVGSVGElement,
  filename: string = 'sankey-diagram',
  scale: number = 2
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Clone and prepare SVG
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      inlineStyles(clonedSvg);
      
      // Get dimensions
      const bbox = svgElement.getBBox();
      const width = svgElement.width.baseVal.value || bbox.width || 800;
      const height = svgElement.height.baseVal.value || bbox.height || 600;
      
      // Serialize SVG
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      
      // Create image from SVG
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Scale and draw
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        // Convert to PNG and download
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            triggerDownload(blob, `${filename}.png`);
            resolve();
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
};

// ============================================================================
// JSON Export (Requirement 7.3)
// ============================================================================

/**
 * Serializes the diagram state to JSON and triggers download
 * @param state - The diagram state to export
 * @param filename - The filename for the download (without extension)
 */
export const exportJSON = (
  state: Pick<DiagramState, 'flows' | 'nodeCustomizations' | 'labelCustomizations' | 'settings'>,
  filename: string = 'sankey-diagram'
): void => {
  const exportData: DiagramExport = {
    version: EXPORT_VERSION,
    title: state.settings.title,
    flows: state.flows,
    nodeCustomizations: state.nodeCustomizations,
    labelCustomizations: state.labelCustomizations,
    settings: state.settings,
    exportedAt: new Date().toISOString(),
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, `${filename}.json`);
};

// ============================================================================
// JSON Import (Requirements 7.4, 7.5)
// ============================================================================

/**
 * Validates that the imported data has the expected schema
 */
const isValidDiagramExport = (obj: unknown): obj is DiagramExport => {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const data = obj as Record<string, unknown>;
  
  // Check required fields
  if (typeof data.version !== 'string') return false;
  if (!Array.isArray(data.flows)) return false;
  if (typeof data.nodeCustomizations !== 'object' || data.nodeCustomizations === null) return false;
  if (typeof data.labelCustomizations !== 'object' || data.labelCustomizations === null) return false;
  if (typeof data.settings !== 'object' || data.settings === null) return false;
  
  // Validate flows array
  for (const flow of data.flows) {
    if (typeof flow !== 'object' || flow === null) return false;
    const f = flow as Record<string, unknown>;
    if (typeof f.id !== 'string') return false;
    if (typeof f.source !== 'string') return false;
    if (typeof f.target !== 'string') return false;
    if (typeof f.value !== 'number') return false;
  }
  
  // Validate settings
  const settings = data.settings as Record<string, unknown>;
  if (typeof settings.title !== 'string') return false;
  if (typeof settings.width !== 'number') return false;
  if (typeof settings.height !== 'number') return false;
  
  return true;
};

/**
 * Handles version migrations for imported data
 */
const migrateImportedData = (data: DiagramExport): DiagramExport => {
  // Currently at version 1.0.0, no migrations needed
  // Future migrations would be handled here based on data.version
  
  // Example migration pattern:
  // if (data.version === '0.9.0') {
  //   // Migrate from 0.9.0 to 1.0.0
  //   data = migrate_0_9_to_1_0(data);
  // }
  
  return data;
};

export interface ImportResult {
  success: boolean;
  data?: DiagramExport;
  error?: string;
}

/**
 * Parses and validates a JSON string as diagram data
 * @param jsonString - The JSON string to parse
 * @returns ImportResult with success status and data or error
 */
export const importJSON = (jsonString: string): ImportResult => {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!isValidDiagramExport(parsed)) {
      return {
        success: false,
        error: 'Invalid diagram format. The file may be corrupted or from an incompatible version.',
      };
    }
    
    // Apply migrations if needed
    const migratedData = migrateImportedData(parsed);
    
    return {
      success: true,
      data: migratedData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof SyntaxError 
        ? 'Invalid JSON format. Please check the file contents.'
        : 'Failed to import diagram data.',
    };
  }
};

/**
 * Reads a File object and imports its contents as diagram data
 * @param file - The File object to read
 * @returns Promise resolving to ImportResult
 */
export const importJSONFile = (file: File): Promise<ImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        resolve(importJSON(content));
      } else {
        resolve({
          success: false,
          error: 'Failed to read file contents.',
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file. Please try again.',
      });
    };
    
    reader.readAsText(file);
  });
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Triggers a file download in the browser
 */
const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export version constant for testing
export { EXPORT_VERSION };
