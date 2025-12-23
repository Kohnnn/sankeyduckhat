import {
  Box,
  VStack,
  Heading,
  Text,
  useColorModeValue,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Switch,
  HStack,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { useDiagramStore } from '../store/useDiagramStore';
import { useCallback } from 'react';

function PropertiesPanel() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.500', 'gray.400');

  const {
    ui,
    flows,
    nodeCustomizations,
    labelCustomizations,
    updateNodeCustomization,
    updateLabelCustomization,
    setSelectedNode,
    setSelectedFlow,
    saveSnapshot,
  } = useDiagramStore();

  const { selectedNodeId, selectedFlowId } = ui;

  // Get selected flow data
  const selectedFlow = selectedFlowId
    ? flows.find((f) => f.id === selectedFlowId)
    : null;

  // Get customization data for selected node
  const nodeCustomization = selectedNodeId
    ? nodeCustomizations[selectedNodeId] || {}
    : null;

  const labelCustomization = selectedNodeId
    ? labelCustomizations[selectedNodeId] || {}
    : null;

  // Handle closing the panel
  const handleClose = useCallback(() => {
    setSelectedNode(null);
    setSelectedFlow(null);
  }, [setSelectedNode, setSelectedFlow]);

  // Node customization handlers
  const handleNodeColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNodeId) return;
      saveSnapshot();
      updateNodeCustomization(selectedNodeId, { color: e.target.value });
    },
    [selectedNodeId, updateNodeCustomization, saveSnapshot]
  );

  const handleNodeOpacityChange = useCallback(
    (value: number) => {
      if (!selectedNodeId) return;
      saveSnapshot();
      updateNodeCustomization(selectedNodeId, { opacity: value });
    },
    [selectedNodeId, updateNodeCustomization, saveSnapshot]
  );

  const handleNodeWidthChange = useCallback(
    (_: string, value: number) => {
      if (!selectedNodeId) return;
      saveSnapshot();
      updateNodeCustomization(selectedNodeId, { width: value });
    },
    [selectedNodeId, updateNodeCustomization, saveSnapshot]
  );

  // Label customization handlers
  const handleLabelFontSizeChange = useCallback(
    (_: string, value: number) => {
      if (!selectedNodeId) return;
      saveSnapshot();
      updateLabelCustomization(selectedNodeId, { fontSize: value });
    },
    [selectedNodeId, updateLabelCustomization, saveSnapshot]
  );

  const handleLabelFontFamilyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!selectedNodeId) return;
      saveSnapshot();
      updateLabelCustomization(selectedNodeId, { fontFamily: e.target.value });
    },
    [selectedNodeId, updateLabelCustomization, saveSnapshot]
  );

  const handleLabelColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNodeId) return;
      saveSnapshot();
      updateLabelCustomization(selectedNodeId, { color: e.target.value });
    },
    [selectedNodeId, updateLabelCustomization, saveSnapshot]
  );

  const handleLabelVisibilityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNodeId) return;
      saveSnapshot();
      updateLabelCustomization(selectedNodeId, { visible: e.target.checked });
    },
    [selectedNodeId, updateLabelCustomization, saveSnapshot]
  );

  // If nothing is selected, show placeholder
  if (!selectedNodeId && !selectedFlowId) {
    return (
      <Box
        w="100%"
        h="100%"
        bg={bgColor}
        borderTop="1px"
        borderColor={borderColor}
        p={4}
      >
        <VStack spacing={4} align="stretch">
          <Heading size="sm">Properties</Heading>
          <Text color={textColor} fontSize="sm">
            Select a node or flow to edit its properties
          </Text>
        </VStack>
      </Box>
    );
  }

  // Render flow properties panel
  if (selectedFlowId && selectedFlow) {
    return (
      <Box
        w="100%"
        h="100%"
        bg={bgColor}
        borderTop="1px"
        borderColor={borderColor}
        p={4}
        overflow="auto"
      >
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Heading size="sm">Flow Properties</Heading>
            <Tooltip label="Close">
              <IconButton
                aria-label="Close properties panel"
                icon={<Box>✕</Box>}
                size="xs"
                variant="ghost"
                onClick={handleClose}
              />
            </Tooltip>
          </HStack>

          <Divider />

          <Text fontSize="sm" fontWeight="medium">
            {selectedFlow.source} → {selectedFlow.target}
          </Text>
          <Text fontSize="sm" color={textColor}>
            Value: {selectedFlow.value}
          </Text>

          <FormControl>
            <FormLabel fontSize="sm">Opacity</FormLabel>
            <Slider
              value={selectedFlow.opacity ?? 0.5}
              min={0}
              max={1}
              step={0.1}
              isDisabled
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </FormControl>

          <Text fontSize="xs" color={textColor}>
            Flow editing will be fully implemented with the Sankey chart
          </Text>
        </VStack>
      </Box>
    );
  }

  // Render node properties panel
  return (
    <Box
      w="100%"
      h="100%"
      bg={bgColor}
      borderTop="1px"
      borderColor={borderColor}
      p={4}
      overflow="auto"
    >
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="sm">Node Properties</Heading>
          <Tooltip label="Close">
            <IconButton
              aria-label="Close properties panel"
              icon={<Box>✕</Box>}
              size="xs"
              variant="ghost"
              onClick={handleClose}
            />
          </Tooltip>
        </HStack>

        <Text fontSize="sm" fontWeight="medium">
          {selectedNodeId}
        </Text>

        <Divider />

        {/* Node Appearance Section */}
        <Heading size="xs">Appearance</Heading>

        <FormControl>
          <FormLabel fontSize="sm">Color</FormLabel>
          <Input
            type="color"
            value={nodeCustomization?.color || '#4299e1'}
            onChange={handleNodeColorChange}
            size="sm"
            p={1}
            h="32px"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Opacity ({((nodeCustomization?.opacity ?? 1) * 100).toFixed(0)}%)</FormLabel>
          <Slider
            value={nodeCustomization?.opacity ?? 1}
            min={0}
            max={1}
            step={0.05}
            onChange={handleNodeOpacityChange}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Width</FormLabel>
          <NumberInput
            value={nodeCustomization?.width ?? 15}
            min={5}
            max={100}
            onChange={handleNodeWidthChange}
            size="sm"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <Divider />

        {/* Label Section */}
        <Heading size="xs">Label</Heading>

        <FormControl display="flex" alignItems="center">
          <FormLabel fontSize="sm" mb="0">
            Visible
          </FormLabel>
          <Switch
            isChecked={labelCustomization?.visible !== false}
            onChange={handleLabelVisibilityChange}
            size="sm"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Font Size</FormLabel>
          <NumberInput
            value={labelCustomization?.fontSize ?? 12}
            min={8}
            max={48}
            onChange={handleLabelFontSizeChange}
            size="sm"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Font Family</FormLabel>
          <Select
            value={labelCustomization?.fontFamily || 'sans-serif'}
            onChange={handleLabelFontFamilyChange}
            size="sm"
          >
            <option value="sans-serif">Sans-serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Label Color</FormLabel>
          <Input
            type="color"
            value={labelCustomization?.color || '#000000'}
            onChange={handleLabelColorChange}
            size="sm"
            p={1}
            h="32px"
          />
        </FormControl>
      </VStack>
    </Box>
  );
}

export default PropertiesPanel;
