import {
  HStack,
  IconButton,
  Heading,
  useColorMode,
  useColorModeValue,
  Box,
  Divider,
  Tooltip,
  ButtonGroup,
  Text,
} from '@chakra-ui/react';
import { useDiagramStore, UIState } from '../store/useDiagramStore';
import ExportMenu from './ExportMenu';

type ActiveTool = UIState['activeTool'];

interface ToolbarProps {
  /** Reference to the SVG element for export functionality */
  svgRef?: React.RefObject<SVGSVGElement>;
}

function Toolbar({ svgRef }: ToolbarProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const activeToolBg = useColorModeValue('blue.100', 'blue.700');

  // Get state and actions from store
  const {
    undo,
    redo,
    undoStack,
    redoStack,
    ui,
    setActiveTool,
    setZoom,
  } = useDiagramStore();

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const activeTool = ui.activeTool;
  const zoom = ui.zoom;

  const handleToolChange = (tool: ActiveTool) => {
    setActiveTool(tool);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 5); // Max 5x zoom
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.1); // Min 0.1x zoom
    setZoom(newZoom);
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const getToolButtonStyle = (tool: ActiveTool) => ({
    bg: activeTool === tool ? activeToolBg : undefined,
  });

  return (
    <HStack
      justify="space-between"
      w="100%"
      borderBottom="1px"
      borderColor={borderColor}
    >
      <HStack spacing={4}>
        <Heading size="md" px={2}>SankeyMATIC</Heading>
        
        <Divider orientation="vertical" h="24px" />
        
        {/* Tool buttons */}
        <ButtonGroup size="sm" variant="ghost" spacing={1}>
          <Tooltip label="Select (V)">
            <IconButton
              aria-label="Select tool"
              icon={<Box>⬚</Box>}
              onClick={() => handleToolChange('select')}
              {...getToolButtonStyle('select')}
            />
          </Tooltip>
          <Tooltip label="Pan (H)">
            <IconButton
              aria-label="Pan tool"
              icon={<Box>✋</Box>}
              onClick={() => handleToolChange('pan')}
              {...getToolButtonStyle('pan')}
            />
          </Tooltip>
          <Tooltip label="Add Node (N)">
            <IconButton
              aria-label="Add node tool"
              icon={<Box>⊕</Box>}
              onClick={() => handleToolChange('addNode')}
              {...getToolButtonStyle('addNode')}
            />
          </Tooltip>
          <Tooltip label="Add Flow (F)">
            <IconButton
              aria-label="Add flow tool"
              icon={<Box>→</Box>}
              onClick={() => handleToolChange('addFlow')}
              {...getToolButtonStyle('addFlow')}
            />
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" h="24px" />

        {/* Undo/Redo buttons */}
        <ButtonGroup size="sm" variant="ghost" spacing={1}>
          <Tooltip label="Undo (Ctrl+Z)">
            <IconButton
              aria-label="Undo"
              icon={<Box>↩</Box>}
              onClick={undo}
              isDisabled={!canUndo}
            />
          </Tooltip>
          <Tooltip label="Redo (Ctrl+Y)">
            <IconButton
              aria-label="Redo"
              icon={<Box>↪</Box>}
              onClick={redo}
              isDisabled={!canRedo}
            />
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" h="24px" />

        {/* Zoom controls */}
        <ButtonGroup size="sm" variant="ghost" spacing={1}>
          <Tooltip label="Zoom Out">
            <IconButton
              aria-label="Zoom out"
              icon={<Box>−</Box>}
              onClick={handleZoomOut}
              isDisabled={zoom <= 0.1}
            />
          </Tooltip>
          <Tooltip label="Reset Zoom">
            <Box
              as="button"
              px={2}
              py={1}
              fontSize="sm"
              borderRadius="md"
              onClick={handleZoomReset}
              _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
              minW="50px"
              textAlign="center"
            >
              <Text>{Math.round(zoom * 100)}%</Text>
            </Box>
          </Tooltip>
          <Tooltip label="Zoom In">
            <IconButton
              aria-label="Zoom in"
              icon={<Box>+</Box>}
              onClick={handleZoomIn}
              isDisabled={zoom >= 5}
            />
          </Tooltip>
        </ButtonGroup>
      </HStack>

      <HStack spacing={2} pr={2}>
        {/* Export menu */}
        <ExportMenu svgRef={svgRef} />

        {/* Color mode toggle */}
        <Tooltip label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}>
          <IconButton
            aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
            icon={<Box>{colorMode === 'light' ? '🌙' : '☀️'}</Box>}
            onClick={toggleColorMode}
            variant="ghost"
            size="sm"
          />
        </Tooltip>
      </HStack>
    </HStack>
  );
}

export default Toolbar;
