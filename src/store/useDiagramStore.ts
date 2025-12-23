import { create } from 'zustand';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'sankey-diagram-state';
const DEBOUNCE_DELAY = 1000; // 1 second
const SCHEMA_VERSION = '1.0.0';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Flow {
  id: string;
  source: string;
  target: string;
  value: number;
  color?: string;
  opacity?: number;
  metadata?: Record<string, unknown>;
}

export interface NodeCustomization {
  color?: string;
  opacity?: number;
  x?: number;
  y?: number;
  width?: number;
}

export interface LabelCustomization {
  visible?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  offsetX?: number;
  offsetY?: number;
  background?: string;
  padding?: number;
}

export interface DiagramSettings {
  title: string;
  width: number;
  height: number;
  nodeWidth: number;
  nodePadding: number;
  flowOpacity: number;
  colorScheme: 'source' | 'target' | 'gradient';
}

export interface UIState {
  selectedNodeId: string | null;
  selectedFlowId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  activeTool: 'select' | 'pan' | 'addNode' | 'addFlow';
  isHydrating: boolean;
  lastAction: 'undo' | 'redo' | null;
}

export interface DiagramSnapshot {
  flows: Flow[];
  nodeCustomizations: Record<string, NodeCustomization>;
  labelCustomizations: Record<string, LabelCustomization>;
  settings: DiagramSettings;
}

// ============================================================================
// Store State Interface
// ============================================================================

export interface DiagramState {
  // Data
  flows: Flow[];
  nodeCustomizations: Record<string, NodeCustomization>;
  labelCustomizations: Record<string, LabelCustomization>;
  settings: DiagramSettings;
  ui: UIState;

  // History
  undoStack: DiagramSnapshot[];
  redoStack: DiagramSnapshot[];

  // Flow Actions
  setFlows: (flows: Flow[]) => void;
  addFlow: (flow?: Partial<Flow>) => void;
  removeFlow: (id: string) => void;

  // Customization Actions
  updateNodeCustomization: (nodeId: string, customization: Partial<NodeCustomization>) => void;
  updateLabelCustomization: (nodeId: string, customization: Partial<LabelCustomization>) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;

  // Settings Actions
  updateSettings: (settings: Partial<DiagramSettings>) => void;

  // UI Actions
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedFlow: (flowId: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setActiveTool: (tool: UIState['activeTool']) => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  saveSnapshot: () => void;

  // Persistence Actions
  loadFromStorage: () => void;
  saveToStorage: () => void;
  clearAll: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultSettings: DiagramSettings = {
  title: 'Untitled Diagram',
  width: 800,
  height: 600,
  nodeWidth: 15,
  nodePadding: 10,
  flowOpacity: 0.5,
  colorScheme: 'source',
};

const defaultUIState: UIState = {
  selectedNodeId: null,
  selectedFlowId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  activeTool: 'select',
  isHydrating: false, // Changed to false - don't block initial render
  lastAction: null,
};

// ============================================================================
// Constants
// ============================================================================

const UNDO_STACK_LIMIT = 50;

// ============================================================================
// Persistence Types
// ============================================================================

export interface PersistedState {
  version: string;
  flows: Flow[];
  nodeCustomizations: Record<string, NodeCustomization>;
  labelCustomizations: Record<string, LabelCustomization>;
  settings: DiagramSettings;
}

// ============================================================================
// Serialization/Deserialization Functions
// ============================================================================

/**
 * Serializes the diagram state to a JSON string for storage
 */
export const serialize = (state: DiagramState): string => {
  const persistedState: PersistedState = {
    version: SCHEMA_VERSION,
    flows: state.flows,
    nodeCustomizations: state.nodeCustomizations,
    labelCustomizations: state.labelCustomizations,
    settings: state.settings,
  };
  return JSON.stringify(persistedState);
};

/**
 * Validates that the parsed object has the expected schema structure
 */
const isValidPersistedState = (obj: unknown): obj is PersistedState => {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const state = obj as Record<string, unknown>;
  
  // Check required fields exist
  if (!('version' in state) || typeof state.version !== 'string') return false;
  if (!('flows' in state) || !Array.isArray(state.flows)) return false;
  if (!('nodeCustomizations' in state) || typeof state.nodeCustomizations !== 'object') return false;
  if (!('labelCustomizations' in state) || typeof state.labelCustomizations !== 'object') return false;
  if (!('settings' in state) || typeof state.settings !== 'object') return false;
  
  // Validate flows array structure
  for (const flow of state.flows) {
    if (typeof flow !== 'object' || flow === null) return false;
    const f = flow as Record<string, unknown>;
    if (typeof f.id !== 'string') return false;
    if (typeof f.source !== 'string') return false;
    if (typeof f.target !== 'string') return false;
    if (typeof f.value !== 'number') return false;
  }
  
  // Validate settings structure
  const settings = state.settings as Record<string, unknown>;
  if (typeof settings.title !== 'string') return false;
  if (typeof settings.width !== 'number') return false;
  if (typeof settings.height !== 'number') return false;
  
  return true;
};

/**
 * Handles version migrations for future schema changes
 */
const migrateState = (state: PersistedState): PersistedState => {
  // Currently at version 1.0.0, no migrations needed
  // Future migrations would be handled here based on state.version
  return state;
};

/**
 * Deserializes a JSON string back to diagram state
 * Returns null if parsing fails or schema is invalid
 */
export const deserialize = (json: string): PersistedState | null => {
  try {
    const parsed = JSON.parse(json);
    
    if (!isValidPersistedState(parsed)) {
      console.warn('Invalid persisted state schema');
      return null;
    }
    
    // Apply any necessary migrations
    return migrateState(parsed);
  } catch (error) {
    console.error('Failed to deserialize state:', error);
    return null;
  }
};

// ============================================================================
// localStorage Availability Check
// ============================================================================

/**
 * Checks if localStorage is available and working
 * Returns false if localStorage is unavailable or quota is exceeded
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Track localStorage availability
let localStorageAvailable = isLocalStorageAvailable();

/**
 * Gets the localStorage availability status
 */
export const getLocalStorageStatus = (): boolean => localStorageAvailable;

// ============================================================================
// Debounce Utility
// ============================================================================

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const debouncedSave = (fn: () => void): void => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(fn, DEBOUNCE_DELAY);
};

// ============================================================================
// Utility Functions
// ============================================================================

const generateId = (): string => {
  return crypto.randomUUID();
};

/**
 * Creates a snapshot of the current diagram state for undo/redo
 */
const createSnapshot = (state: DiagramState): DiagramSnapshot => ({
  flows: state.flows.map((f) => ({ ...f })),
  nodeCustomizations: Object.fromEntries(
    Object.entries(state.nodeCustomizations).map(([k, v]) => [k, { ...v }])
  ),
  labelCustomizations: Object.fromEntries(
    Object.entries(state.labelCustomizations).map(([k, v]) => [k, { ...v }])
  ),
  settings: { ...state.settings },
});

/**
 * Restores state from a snapshot
 */
const restoreFromSnapshot = (snapshot: DiagramSnapshot): Partial<DiagramState> => ({
  flows: snapshot.flows.map((f) => ({ ...f })),
  nodeCustomizations: Object.fromEntries(
    Object.entries(snapshot.nodeCustomizations).map(([k, v]) => [k, { ...v }])
  ),
  labelCustomizations: Object.fromEntries(
    Object.entries(snapshot.labelCustomizations).map(([k, v]) => [k, { ...v }])
  ),
  settings: { ...snapshot.settings },
});

// ============================================================================
// Store Implementation
// ============================================================================

export const useDiagramStore = create<DiagramState>((set) => ({
  // Initial State
  flows: [],
  nodeCustomizations: {},
  labelCustomizations: {},
  settings: { ...defaultSettings },
  ui: { ...defaultUIState },
  undoStack: [],
  redoStack: [],

  // Flow Actions
  setFlows: (flows: Flow[]) => {
    set(() => ({
      flows,
      redoStack: [], // Clear redo stack on new change
    }));
  },

  addFlow: (flow?: Partial<Flow>) => {
    const newFlow: Flow = {
      id: flow?.id ?? generateId(),
      source: flow?.source ?? '',
      target: flow?.target ?? '',
      value: flow?.value ?? 0,
      color: flow?.color,
      opacity: flow?.opacity,
      metadata: flow?.metadata,
    };
    set((state) => ({
      flows: [...state.flows, newFlow],
      redoStack: [], // Clear redo stack on new change
    }));
  },

  removeFlow: (id: string) => {
    set((state) => ({
      flows: state.flows.filter((flow) => flow.id !== id),
      redoStack: [], // Clear redo stack on new change
    }));
  },

  // Customization Actions
  updateNodeCustomization: (nodeId: string, customization: Partial<NodeCustomization>) => {
    set((state) => ({
      nodeCustomizations: {
        ...state.nodeCustomizations,
        [nodeId]: {
          ...state.nodeCustomizations[nodeId],
          ...customization,
        },
      },
      redoStack: [], // Clear redo stack on new change
    }));
  },

  updateLabelCustomization: (nodeId: string, customization: Partial<LabelCustomization>) => {
    set((state) => ({
      labelCustomizations: {
        ...state.labelCustomizations,
        [nodeId]: {
          ...state.labelCustomizations[nodeId],
          ...customization,
        },
      },
      redoStack: [], // Clear redo stack on new change
    }));
  },

  updateNodePosition: (nodeId: string, x: number, y: number) => {
    set((state) => ({
      nodeCustomizations: {
        ...state.nodeCustomizations,
        [nodeId]: {
          ...state.nodeCustomizations[nodeId],
          x,
          y,
        },
      },
      redoStack: [], // Clear redo stack on new change
    }));
  },

  // Settings Actions
  updateSettings: (settings: Partial<DiagramSettings>) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
      redoStack: [], // Clear redo stack on new change
    }));
  },

  // UI Actions
  setSelectedNode: (nodeId: string | null) => {
    set((state) => ({
      ui: { ...state.ui, selectedNodeId: nodeId },
    }));
  },

  setSelectedFlow: (flowId: string | null) => {
    set((state) => ({
      ui: { ...state.ui, selectedFlowId: flowId },
    }));
  },

  setZoom: (zoom: number) => {
    set((state) => ({
      ui: { ...state.ui, zoom },
    }));
  },

  setPan: (x: number, y: number) => {
    set((state) => ({
      ui: { ...state.ui, panX: x, panY: y },
    }));
  },

  setActiveTool: (tool: UIState['activeTool']) => {
    set((state) => ({
      ui: { ...state.ui, activeTool: tool },
    }));
  },

  // History Actions
  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) {
        return state;
      }

      // Get the last snapshot from undo stack
      const previousSnapshot = state.undoStack[state.undoStack.length - 1];
      if (!previousSnapshot) {
        return state;
      }

      // Create snapshot of current state for redo stack
      const currentSnapshot = createSnapshot(state);

      // Remove the last item from undo stack
      const newUndoStack = state.undoStack.slice(0, -1);

      return {
        ...restoreFromSnapshot(previousSnapshot),
        undoStack: newUndoStack,
        redoStack: [...state.redoStack, currentSnapshot],
        ui: { ...state.ui, lastAction: 'undo' as const },
      };
    });
    
    // Clear lastAction after a short delay
    setTimeout(() => {
      useDiagramStore.setState((state) => ({
        ui: { ...state.ui, lastAction: null },
      }));
    }, 1500);
  },

  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) {
        return state;
      }

      // Get the last snapshot from redo stack
      const nextSnapshot = state.redoStack[state.redoStack.length - 1];
      if (!nextSnapshot) {
        return state;
      }

      // Create snapshot of current state for undo stack
      const currentSnapshot = createSnapshot(state);

      // Remove the last item from redo stack
      const newRedoStack = state.redoStack.slice(0, -1);

      return {
        ...restoreFromSnapshot(nextSnapshot),
        undoStack: [...state.undoStack, currentSnapshot],
        redoStack: newRedoStack,
        ui: { ...state.ui, lastAction: 'redo' as const },
      };
    });
    
    // Clear lastAction after a short delay
    setTimeout(() => {
      useDiagramStore.setState((state) => ({
        ui: { ...state.ui, lastAction: null },
      }));
    }, 1500);
  },

  saveSnapshot: () => {
    set((state) => {
      const snapshot = createSnapshot(state);
      
      // Add to undo stack, respecting the size limit
      let newUndoStack = [...state.undoStack, snapshot];
      if (newUndoStack.length > UNDO_STACK_LIMIT) {
        // Remove oldest entries (from the beginning)
        newUndoStack = newUndoStack.slice(newUndoStack.length - UNDO_STACK_LIMIT);
      }

      return {
        undoStack: newUndoStack,
        // Clear redo stack when a new snapshot is saved (new change made)
        redoStack: [],
      };
    });
  },

  // Persistence Actions (placeholder implementations - will be expanded in Task 6)
  loadFromStorage: () => {
    if (!localStorageAvailable) {
      console.warn('localStorage is not available');
      set((state) => ({
        ui: { ...state.ui, isHydrating: false },
      }));
      return;
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        set((state) => ({
          ui: { ...state.ui, isHydrating: false },
        }));
        return;
      }
      
      const persisted = deserialize(stored);
      if (!persisted) {
        console.warn('Failed to load state from localStorage');
        set((state) => ({
          ui: { ...state.ui, isHydrating: false },
        }));
        return;
      }
      
      set((state) => ({
        flows: persisted.flows,
        nodeCustomizations: persisted.nodeCustomizations,
        labelCustomizations: persisted.labelCustomizations,
        settings: persisted.settings,
        ui: { ...state.ui, isHydrating: false },
      }));
    } catch (error) {
      console.warn('localStorage unavailable:', error);
      localStorageAvailable = false;
      set((state) => ({
        ui: { ...state.ui, isHydrating: false },
      }));
    }
  },

  saveToStorage: () => {
    if (!localStorageAvailable) {
      return;
    }
    
    debouncedSave(() => {
      try {
        const state = useDiagramStore.getState();
        const serialized = serialize(state);
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        // Check if it's a quota exceeded error
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded');
        }
        localStorageAvailable = false;
      }
    });
  },

  clearAll: () => {
    if (localStorageAvailable) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
    }
    
    set({
      flows: [],
      nodeCustomizations: {},
      labelCustomizations: {},
      settings: { ...defaultSettings },
      ui: { ...defaultUIState },
      undoStack: [],
      redoStack: [],
    });
  },
}));

// Export default settings for testing
export { defaultSettings, defaultUIState, UNDO_STACK_LIMIT, STORAGE_KEY, SCHEMA_VERSION, DEBOUNCE_DELAY };
