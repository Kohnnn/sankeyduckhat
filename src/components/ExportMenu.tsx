/**
 * ExportMenu component for exporting and importing diagrams
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useRef } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  IconButton,
  Tooltip,
  Box,
  useToast,
  Input,
} from '@chakra-ui/react';
import { useDiagramStore } from '../store/useDiagramStore';
import { exportSVG, exportPNG, exportJSON, importJSONFile } from '../utils/exportImport';

interface ExportMenuProps {
  /** Reference to the SVG element for export */
  svgRef?: React.RefObject<SVGSVGElement>;
}

function ExportMenu({ svgRef }: ExportMenuProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get state from store
  const { flows, nodeCustomizations, labelCustomizations, settings, clearAll } = useDiagramStore();
  const setFlows = useDiagramStore((state) => state.setFlows);
  const updateSettings = useDiagramStore((state) => state.updateSettings);

  const getFilename = () => {
    // Create a safe filename from the diagram title
    return settings.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'sankey-diagram';
  };

  const handleExportSVG = () => {
    if (!svgRef?.current) {
      toast({
        title: 'Export failed',
        description: 'No diagram to export. Please create a diagram first.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      exportSVG(svgRef.current, getFilename());
      toast({
        title: 'SVG exported',
        description: 'Your diagram has been exported as SVG.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export SVG. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExportPNG = async () => {
    if (!svgRef?.current) {
      toast({
        title: 'Export failed',
        description: 'No diagram to export. Please create a diagram first.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await exportPNG(svgRef.current, getFilename());
      toast({
        title: 'PNG exported',
        description: 'Your diagram has been exported as PNG.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export PNG. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExportJSON = () => {
    try {
      exportJSON(
        { flows, nodeCustomizations, labelCustomizations, settings },
        getFilename()
      );
      toast({
        title: 'JSON exported',
        description: 'Your diagram data has been saved.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export JSON. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await importJSONFile(file);
    
    if (result.success && result.data) {
      // Clear existing state and load imported data
      clearAll();
      
      // Set the imported data
      setFlows(result.data.flows);
      
      // Update settings
      updateSettings(result.data.settings);
      
      // Update customizations - need to set them individually
      const store = useDiagramStore.getState();
      Object.entries(result.data.nodeCustomizations).forEach(([nodeId, customization]) => {
        store.updateNodeCustomization(nodeId, customization);
      });
      Object.entries(result.data.labelCustomizations).forEach(([nodeId, customization]) => {
        store.updateLabelCustomization(nodeId, customization);
      });
      
      toast({
        title: 'Import successful',
        description: `Loaded "${result.data.title}" diagram.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Import failed',
        description: result.error || 'Failed to import diagram.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }

    // Reset file input
    event.target.value = '';
  };

  const hasDiagram = svgRef?.current != null;

  return (
    <>
      <Menu>
        <Tooltip label="Export / Import">
          <MenuButton
            as={IconButton}
            aria-label="Export menu"
            icon={<Box>📥</Box>}
            variant="ghost"
            size="sm"
          />
        </Tooltip>
        <MenuList>
          <MenuItem 
            icon={<Box>🖼️</Box>} 
            onClick={handleExportPNG}
            isDisabled={!hasDiagram}
          >
            Export as PNG
          </MenuItem>
          <MenuItem 
            icon={<Box>📐</Box>} 
            onClick={handleExportSVG}
            isDisabled={!hasDiagram}
          >
            Export as SVG
          </MenuItem>
          <MenuDivider />
          <MenuItem 
            icon={<Box>💾</Box>} 
            onClick={handleExportJSON}
          >
            Save as JSON
          </MenuItem>
          <MenuItem 
            icon={<Box>📂</Box>} 
            onClick={handleImportClick}
          >
            Load from JSON
          </MenuItem>
        </MenuList>
      </Menu>
      
      {/* Hidden file input for JSON import */}
      <Input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        display="none"
        aria-hidden="true"
      />
    </>
  );
}

export default ExportMenu;
