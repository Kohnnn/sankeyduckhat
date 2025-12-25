import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Button,
  Textarea,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  DataSheetGrid,
  textColumn,
  floatColumn,
  keyColumn,
  Column,
} from 'react-datasheet-grid';
import { useDiagramStore, Flow } from '../store/useDiagramStore';

// Row type for the grid
interface FlowRow {
  id: string;
  source: string | null;
  target: string | null;
  value: number | null;
  comparisonValue: number | null;
}

// Convert flows to row format
const flowsToRows = (flows: Flow[]): FlowRow[] => {
  return flows.map((flow) => ({
    id: flow.id,
    source: flow.source || null,
    target: flow.target || null,
    value: flow.value,
    comparisonValue: flow.comparisonValue ?? null,
  }));
};

// Convert rows to flows format
const rowsToFlows = (rows: FlowRow[]): Flow[] => {
  return rows.map((row) => ({
    id: row.id,
    source: row.source || '',
    target: row.target || '',
    value: row.value ?? 0,
    comparisonValue: row.comparisonValue ?? undefined,
  }));
};

function DataEditor() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { flows, setFlows, addFlow, saveSnapshot, settings, updateDataSourceNotes } = useDiagramStore();
  
  // Use local state for the grid to prevent re-render loops
  const [localRows, setLocalRows] = useState<FlowRow[]>(() => flowsToRows(flows));
  
  // Track whether we're currently syncing from local to store
  const isSyncingToStoreRef = useRef(false);
  
  // Sync local state when store flows change externally (e.g., from undo/redo)
  useEffect(() => {
    if (!isSyncingToStoreRef.current) {
      setLocalRows(flowsToRows(flows));
    }
  }, [flows]);

  // Define columns for the grid
  const columns: Column<FlowRow>[] = useMemo(
    () => [
      {
        ...keyColumn('source', textColumn),
        title: 'From',
        minWidth: 100,
        grow: 1,
      },
      {
        ...keyColumn('target', textColumn),
        title: 'To',
        minWidth: 100,
        grow: 1,
      },
      {
        ...keyColumn('value', floatColumn),
        title: 'Amount, current',
        minWidth: 100,
        grow: 0.5,
      },
      {
        ...keyColumn('comparisonValue', floatColumn),
        title: 'Amount, comparison',
        minWidth: 100,
        grow: 0.5,
      },
    ],
    []
  );

  // Track if we've saved a snapshot for the current edit session
  const hasSnapshotRef = useRef(false);

  // Handle changes from the grid
  const handleChange = useCallback(
    (newRows: FlowRow[]) => {
      // Update local state immediately
      setLocalRows(newRows);
      
      // Convert and update store
      const newFlows = rowsToFlows(newRows);

      // Only save snapshot once per edit session
      if (!hasSnapshotRef.current) {
        saveSnapshot();
        hasSnapshotRef.current = true;
        setTimeout(() => {
          hasSnapshotRef.current = false;
        }, 500);
      }

      // Mark that we're syncing to store to prevent the useEffect from overwriting
      isSyncingToStoreRef.current = true;
      setFlows(newFlows);
      // Reset after the state update cycle
      setTimeout(() => {
        isSyncingToStoreRef.current = false;
      }, 0);
    },
    [setFlows, saveSnapshot]
  );

  // Handle creating new rows
  const createRow = useCallback((): FlowRow => {
    return {
      id: crypto.randomUUID(),
      source: null,
      target: null,
      value: null,
      comparisonValue: null,
    };
  }, []);

  // Handle adding a new row via button
  const handleAddRow = useCallback(() => {
    saveSnapshot();
    addFlow();
  }, [addFlow, saveSnapshot]);

  // Handle data source notes changes
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateDataSourceNotes(e.target.value);
    },
    [updateDataSourceNotes]
  );

  return (
    <Box w="100%" h="100%" bg={bgColor} overflow="auto">
      <VStack spacing={4} p={4} align="stretch" h="100%">
        <Heading size="sm">Data Editor</Heading>

        <Box flex="1" minH="200px">
          <DataSheetGrid
            value={localRows}
            onChange={handleChange}
            columns={columns}
            createRow={createRow}
            lockRows={false}
            height={400}
          />
        </Box>

        <Button colorScheme="blue" size="sm" onClick={handleAddRow}>
          Add Row
        </Button>

        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Data source notes
          </Text>
          <Textarea
            value={settings.dataSourceNotes}
            onChange={handleNotesChange}
            placeholder="Enter notes about your data sources..."
            size="sm"
            minH="80px"
            borderColor={borderColor}
            _hover={{ borderColor: 'gray.400' }}
            resize="vertical"
          />
        </Box>
      </VStack>
    </Box>
  );
}

export default DataEditor;
