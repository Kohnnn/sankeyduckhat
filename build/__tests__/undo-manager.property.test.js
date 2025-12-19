/**
 * Property-based tests for UndoManager
 * Feature: sankey-studio-canvas-refactor
 * 
 * Property 18: Undo/Redo Round-Trip
 * For any undoable action, performing the action then undoing should restore 
 * the previous state, and redoing should restore the action's result.
 * Validates: Requirements 10.6, 10.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { UndoManager } from '../undo-manager.js';
import { CustomLayoutStore } from '../custom-layout-store.js';

// Mock global functions that UndoManager might call
beforeEach(() => {
  UndoManager.reset();
  CustomLayoutStore.clearAll();
  
  // Mock renderDiagram
  global.renderDiagram = vi.fn();
  global.addDataRow = vi.fn();
  global.document = {
    getElementById: vi.fn().mockReturnValue(null)
  };
});

// Arbitrary for generating valid node IDs
const nodeIdArbitrary = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,29}$/)
  .filter(s => s.length > 0);

// Arbitrary for generating position offsets
const positionOffsetArbitrary = fc.record({
  dx: fc.integer({ min: -500, max: 500 }),
  dy: fc.integer({ min: -500, max: 500 })
});

// Arbitrary for generating absolute positions
const absolutePositionArbitrary = fc.record({
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 1000 })
});

// Arbitrary for generating action types
const actionTypeArbitrary = fc.constantFrom(
  UndoManager.ActionTypes.NODE_POSITION,
  UndoManager.ActionTypes.LABEL_POSITION
);

describe('UndoManager Property Tests', () => {
  /**
   * Property 18: Undo/Redo Round-Trip
   * For any undoable action, performing the action then undoing should restore 
   * the previous state, and redoing should restore the action's result.
   * Validates: Requirements 10.6, 10.7
   */
  describe('Property 18: Undo/Redo Round-Trip', () => {
    it('recording an action enables undo and clears redo', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionOffsetArbitrary,
          positionOffsetArbitrary,
          (nodeId, oldPos, newPos) => {
            UndoManager.reset();
            
            // Initially, cannot undo or redo
            expect(UndoManager.canUndo()).toBe(false);
            expect(UndoManager.canRedo()).toBe(false);
            
            // Record an action
            const action = UndoManager.createNodePositionAction(nodeId, oldPos, newPos);
            UndoManager.recordAction(action);
            
            // Now can undo but not redo
            expect(UndoManager.canUndo()).toBe(true);
            expect(UndoManager.canRedo()).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('undo moves action to redo stack', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionOffsetArbitrary,
          positionOffsetArbitrary,
          (nodeId, oldPos, newPos) => {
            UndoManager.reset();
            
            // Record an action
            const action = UndoManager.createNodePositionAction(nodeId, oldPos, newPos);
            UndoManager.recordAction(action);
            
            // Undo
            const undoResult = UndoManager.undo();
            
            // Undo should succeed
            expect(undoResult).toBe(true);
            
            // Now can redo but not undo
            expect(UndoManager.canUndo()).toBe(false);
            expect(UndoManager.canRedo()).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('redo moves action back to undo stack', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionOffsetArbitrary,
          positionOffsetArbitrary,
          (nodeId, oldPos, newPos) => {
            UndoManager.reset();
            
            // Record an action
            const action = UndoManager.createNodePositionAction(nodeId, oldPos, newPos);
            UndoManager.recordAction(action);
            
            // Undo then redo
            UndoManager.undo();
            const redoResult = UndoManager.redo();
            
            // Redo should succeed
            expect(redoResult).toBe(true);
            
            // Now can undo but not redo
            expect(UndoManager.canUndo()).toBe(true);
            expect(UndoManager.canRedo()).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('undo/redo round-trip preserves action count', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(nodeIdArbitrary, positionOffsetArbitrary, positionOffsetArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          (actions) => {
            UndoManager.reset();
            
            // Record all actions
            actions.forEach(([nodeId, oldPos, newPos]) => {
              const action = UndoManager.createNodePositionAction(nodeId, oldPos, newPos);
              UndoManager.recordAction(action);
            });
            
            const initialUndoCount = UndoManager.getUndoCount();
            expect(initialUndoCount).toBe(actions.length);
            
            // Undo all
            for (let i = 0; i < actions.length; i++) {
              UndoManager.undo();
            }
            
            expect(UndoManager.getUndoCount()).toBe(0);
            expect(UndoManager.getRedoCount()).toBe(actions.length);
            
            // Redo all
            for (let i = 0; i < actions.length; i++) {
              UndoManager.redo();
            }
            
            expect(UndoManager.getUndoCount()).toBe(actions.length);
            expect(UndoManager.getRedoCount()).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('new action after undo clears redo stack', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionOffsetArbitrary,
          positionOffsetArbitrary,
          positionOffsetArbitrary,
          (nodeId, oldPos, newPos1, newPos2) => {
            UndoManager.reset();
            
            // Record first action
            const action1 = UndoManager.createNodePositionAction(nodeId, oldPos, newPos1);
            UndoManager.recordAction(action1);
            
            // Undo
            UndoManager.undo();
            expect(UndoManager.canRedo()).toBe(true);
            
            // Record new action
            const action2 = UndoManager.createNodePositionAction(nodeId, oldPos, newPos2);
            UndoManager.recordAction(action2);
            
            // Redo stack should be cleared
            expect(UndoManager.canRedo()).toBe(false);
            expect(UndoManager.canUndo()).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('undo on empty stack returns false', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          (undoAttempts) => {
            UndoManager.reset();
            
            // Try to undo on empty stack
            for (let i = 0; i < undoAttempts; i++) {
              const result = UndoManager.undo();
              expect(result).toBe(false);
            }
            
            // State should remain consistent
            expect(UndoManager.canUndo()).toBe(false);
            expect(UndoManager.canRedo()).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('redo on empty stack returns false', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          (redoAttempts) => {
            UndoManager.reset();
            
            // Try to redo on empty stack
            for (let i = 0; i < redoAttempts; i++) {
              const result = UndoManager.redo();
              expect(result).toBe(false);
            }
            
            // State should remain consistent
            expect(UndoManager.canUndo()).toBe(false);
            expect(UndoManager.canRedo()).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('max stack size is enforced', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: UndoManager.MAX_STACK_SIZE + 1, max: UndoManager.MAX_STACK_SIZE + 20 }),
          (actionCount) => {
            UndoManager.reset();
            
            // Record more actions than max stack size
            for (let i = 0; i < actionCount; i++) {
              const action = UndoManager.createNodePositionAction(
                `node${i}`,
                { dx: 0, dy: 0 },
                { dx: i, dy: i }
              );
              UndoManager.recordAction(action);
            }
            
            // Stack should be capped at max size
            expect(UndoManager.getUndoCount()).toBe(UndoManager.MAX_STACK_SIZE);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Action creation helpers', () => {
    it('createNodePositionAction creates valid action structure', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          fc.option(positionOffsetArbitrary, { nil: null }),
          positionOffsetArbitrary,
          (nodeId, oldPos, newPos) => {
            const action = UndoManager.createNodePositionAction(nodeId, oldPos, newPos);
            
            expect(action.type).toBe(UndoManager.ActionTypes.NODE_POSITION);
            expect(action.data.nodeId).toBe(nodeId);
            expect(action.data.dx).toBe(newPos.dx);
            expect(action.data.dy).toBe(newPos.dy);
            
            if (oldPos) {
              expect(action.inverseData.dx).toBe(oldPos.dx);
              expect(action.inverseData.dy).toBe(oldPos.dy);
            } else {
              expect(action.inverseData.clear).toBe(true);
            }
            
            expect(action.description).toContain(nodeId);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('createLabelPositionAction creates valid action structure', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          fc.option(absolutePositionArbitrary, { nil: null }),
          absolutePositionArbitrary,
          (nodeId, oldPos, newPos) => {
            const action = UndoManager.createLabelPositionAction(nodeId, oldPos, newPos);
            
            expect(action.type).toBe(UndoManager.ActionTypes.LABEL_POSITION);
            expect(action.data.nodeId).toBe(nodeId);
            expect(action.data.x).toBe(newPos.x);
            expect(action.data.y).toBe(newPos.y);
            
            if (oldPos) {
              expect(action.inverseData.x).toBe(oldPos.x);
              expect(action.inverseData.y).toBe(oldPos.y);
            } else {
              expect(action.inverseData.clear).toBe(true);
            }
            
            expect(action.description).toContain(nodeId);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('createFlowAddAction creates valid action structure', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          nodeIdArbitrary,
          fc.oneof(fc.integer({ min: 1, max: 1000 }), fc.stringMatching(/^[0-9]+$/)),
          (source, target, value) => {
            const action = UndoManager.createFlowAddAction(source, target, value);
            
            expect(action.type).toBe(UndoManager.ActionTypes.FLOW_ADD);
            expect(action.data.source).toBe(source);
            expect(action.data.target).toBe(target);
            expect(action.data.value).toBe(value);
            expect(action.inverseData.source).toBe(source);
            expect(action.inverseData.target).toBe(target);
            expect(action.description).toContain(source);
            expect(action.description).toContain(target);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Event emission', () => {
    it('stackChange event is emitted on record, undo, and redo', () => {
      fc.assert(
        fc.property(
          nodeIdArbitrary,
          positionOffsetArbitrary,
          positionOffsetArbitrary,
          (nodeId, oldPos, newPos) => {
            UndoManager.reset();
            
            const stackChangeEvents = [];
            UndoManager.on('stackChange', (data) => {
              stackChangeEvents.push(data);
            });
            
            // Record action
            const action = UndoManager.createNodePositionAction(nodeId, oldPos, newPos);
            UndoManager.recordAction(action);
            
            expect(stackChangeEvents.length).toBe(1);
            expect(stackChangeEvents[0].canUndo).toBe(true);
            expect(stackChangeEvents[0].canRedo).toBe(false);
            
            // Undo
            UndoManager.undo();
            
            expect(stackChangeEvents.length).toBe(2);
            expect(stackChangeEvents[1].canUndo).toBe(false);
            expect(stackChangeEvents[1].canRedo).toBe(true);
            
            // Redo
            UndoManager.redo();
            
            expect(stackChangeEvents.length).toBe(3);
            expect(stackChangeEvents[2].canUndo).toBe(true);
            expect(stackChangeEvents[2].canRedo).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Clear functionality', () => {
    it('clear empties both stacks', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(nodeIdArbitrary, positionOffsetArbitrary, positionOffsetArbitrary),
            { minLength: 1, maxLength: 10 }
          ),
          (actions) => {
            UndoManager.reset();
            
            // Record actions
            actions.forEach(([nodeId, oldPos, newPos]) => {
              const action = UndoManager.createNodePositionAction(nodeId, oldPos, newPos);
              UndoManager.recordAction(action);
            });
            
            // Undo some
            const undoCount = Math.floor(actions.length / 2);
            for (let i = 0; i < undoCount; i++) {
              UndoManager.undo();
            }
            
            // Clear
            UndoManager.clear();
            
            // Both stacks should be empty
            expect(UndoManager.canUndo()).toBe(false);
            expect(UndoManager.canRedo()).toBe(false);
            expect(UndoManager.getUndoCount()).toBe(0);
            expect(UndoManager.getRedoCount()).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
