import { useRef, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  useColorModeValue,
  Center,
  Spinner,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import Toolbar from './components/Toolbar';
import SankeyChart from './components/SankeyChart';
import DataEditor from './components/DataEditor';
import PropertiesPanel from './components/PropertiesPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDiagramStore, getLocalStorageStatus } from './store/useDiagramStore';

function App() {
  // Reference to SVG element for export functionality
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Toast for notifications
  const toast = useToast();
  
  // Enable global keyboard shortcuts
  useKeyboardShortcuts();
  
  // Get store actions for persistence
  const loadFromStorage = useDiagramStore((state) => state.loadFromStorage);
  const saveToStorage = useDiagramStore((state) => state.saveToStorage);
  const isHydrating = useDiagramStore((state) => state.ui.isHydrating);
  const lastAction = useDiagramStore((state) => state.ui.lastAction);
  
  // Load state from localStorage on mount
  useEffect(() => {
    loadFromStorage();
    
    // Show warning if localStorage is not available
    if (!getLocalStorageStatus()) {
      toast({
        title: 'Storage Unavailable',
        description: 'Your changes will not be saved. Please enable localStorage or use a different browser.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [loadFromStorage, toast]);
  
  // Show toast for undo/redo actions
  useEffect(() => {
    if (lastAction === 'undo') {
      toast({
        title: 'Undo',
        description: 'Action undone',
        status: 'info',
        duration: 1500,
        isClosable: true,
        position: 'bottom-left',
      });
    } else if (lastAction === 'redo') {
      toast({
        title: 'Redo',
        description: 'Action redone',
        status: 'info',
        duration: 1500,
        isClosable: true,
        position: 'bottom-left',
      });
    }
  }, [lastAction, toast]);
  
  // Subscribe to store changes and auto-save
  useEffect(() => {
    // Subscribe to store changes (excluding UI state changes)
    const unsubscribe = useDiagramStore.subscribe(
      (state, prevState) => {
        // Only save when data changes, not UI state
        if (
          state.flows !== prevState.flows ||
          state.nodeCustomizations !== prevState.nodeCustomizations ||
          state.labelCustomizations !== prevState.labelCustomizations ||
          state.settings !== prevState.settings
        ) {
          saveToStorage();
        }
      }
    );
    
    return () => unsubscribe();
  }, [saveToStorage]);
  
  // Use semantic tokens for colors
  const toolbarBg = useColorModeValue('gray.100', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const loadingBg = useColorModeValue('white', 'gray.800');

  // Show loading indicator during hydration
  if (isHydrating) {
    return (
      <Center h="100vh" bg={loadingBg}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.500">Loading your diagram...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box minH="100vh">
      <Grid
        templateAreas={`"toolbar toolbar"
                        "chart editor"`}
        gridTemplateRows="auto 1fr"
        gridTemplateColumns="1fr 400px"
        h="100vh"
        gap="0"
      >
        <GridItem area="toolbar" bg={toolbarBg} p={2}>
          <Toolbar svgRef={svgRef} />
        </GridItem>
        <GridItem area="chart" p={0}>
          <ErrorBoundary fallbackTitle="Chart Error">
            <SankeyChart svgRef={svgRef} />
          </ErrorBoundary>
        </GridItem>
        <GridItem area="editor" borderLeft="1px" borderColor={borderColor} display="flex" flexDirection="column">
          <Box flex="1" overflow="auto">
            <DataEditor />
          </Box>
          <PropertiesPanel />
        </GridItem>
      </Grid>
    </Box>
  );
}

export default App;
