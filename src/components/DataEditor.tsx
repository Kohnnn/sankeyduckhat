import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Button,
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
}

// Convert flows to row format
const flowsToRows = (flows: Flow[]): FlowRow[] => {
  return flows.map((flow) => ({
    id: flow.id,
    source: flow.source || null,
    target: flow.target || null,
    value: flow.value,
  }));
};

// Convert rows to flows format
const rowsToFlows = (rows: FlowRow[]): Flow[] => {
  return rows.map((row) => ({
    id: row.id,
    source: row.source || '',
    target: row.target || '',
    value: row.value ?? 0,
  }));
};

function DataEditor() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const { flows, setFlows, addFlow, saveSnapshot } = useDiagramStore();
  
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
        title: 'Source',
        minWidth: 100,
        grow: 1,
      },
      {
        ...keyColumn('target', textColumn),
        title: 'Target',
        minWidth: 100,
        grow: 1,
      },
      {
        ...keyColumn('value', floatColumn),
        title: 'Amount',
        minWidth: 80,
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
    };
  }, []);

  // Handle adding a new row via button
  const handleAddRow = useCallback(() => {
    saveSnapshot();
    addFlow();
  }, [addFlow, saveSnapshot]);

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
      </VStack>
    </Box>
  );
}

export default DataEditor;
