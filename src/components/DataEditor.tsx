import { useCallback, useMemo, useRef } from 'react';
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

function DataEditor() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const { flows, setFlows, addFlow, saveSnapshot } = useDiagramStore();

  // Convert flows to row format for the grid
  const rows: FlowRow[] = useMemo(() => {
    return flows.map((flow) => ({
      id: flow.id,
      source: flow.source,
      target: flow.target,
      value: flow.value,
    }));
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
      // Convert rows back to Flow format
      const newFlows: Flow[] = newRows.map((row) => ({
        id: row.id,
        source: row.source || '',
        target: row.target || '',
        value: row.value ?? 0,
      }));

      // Only save snapshot once per edit session (not on every keystroke)
      if (!hasSnapshotRef.current) {
        saveSnapshot();
        hasSnapshotRef.current = true;
        // Reset after a short delay to allow new edit sessions
        setTimeout(() => {
          hasSnapshotRef.current = false;
        }, 500);
      }

      setFlows(newFlows);
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
            value={rows}
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
