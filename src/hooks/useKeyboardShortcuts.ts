import { useEffect, useCallback } from 'react';
import { useDiagramStore, UIState } from '../store/useDiagramStore';

type ActiveTool = UIState['activeTool'];

/**
 * Tool key mappings for keyboard shortcuts
 */
const TOOL_KEYS: Record<string, ActiveTool> = {
  v: 'select',
  h: 'pan',
  n: 'addNode',
  f: 'addFlow',
};

/**
 * Hook that handles global keyboard shortcuts for the diagram editor
 * 
 * Shortcuts:
 * - Ctrl+Z: Undo
 * - Ctrl+Y: Redo
 * - V: Select tool
 * - H: Pan tool
 * - N: Add Node tool
 * - F: Add Flow tool
 * 
 * Requirements: 2.6
 */
export function useKeyboardShortcuts(): void {
  const undo = useDiagramStore((state) => state.undo);
  const redo = useDiagramStore((state) => state.redo);
  const setActiveTool = useDiagramStore((state) => state.setActiveTool);
  const undoStack = useDiagramStore((state) => state.undoStack);
  const redoStack = useDiagramStore((state) => state.redoStack);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInputField) {
        return;
      }

      // Handle Ctrl+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (undoStack.length > 0) {
          undo();
        }
        return;
      }

      // Handle Ctrl+Y or Ctrl+Shift+Z for redo
      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey)
      ) {
        event.preventDefault();
        if (redoStack.length > 0) {
          redo();
        }
        return;
      }

      // Handle tool switching (only when no modifier keys are pressed)
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const key = event.key.toLowerCase();
        const tool = TOOL_KEYS[key];
        if (tool) {
          event.preventDefault();
          setActiveTool(tool);
        }
      }
    },
    [undo, redo, setActiveTool, undoStack.length, redoStack.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
