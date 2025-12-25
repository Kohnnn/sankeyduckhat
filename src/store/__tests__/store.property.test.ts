import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useDiagramStore, Flow, NodeCustomization, LabelCustomization, serialize, deserialize, DiagramSettings } from '../useDiagramStore';

// Reset store before each test
beforeEach(() => {
  useDiagramStore.getState().clearAll();
});

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

const arbitraryPartialFlow = (): fc.Arbitrary<Partial<Flow>> =>
  fc.record(
    {
      source: fc.string({ minLength: 0, maxLength: 50 }),
      target: fc.string({ minLength: 0, maxLength: 50 }),
      value: fc.float({ min: 0, max: 1000000, noNaN: true }),
      color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`), { nil: undefined }),
      opacity: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
    },
    { requiredKeys: [] }
  );

// ============================================================================
// Property 8: Add Flow Increases Count
// Feature: react-migration, Property 8: Add Flow Increases Count
// Validates: Requirements 2.5
// ============================================================================

describe('Feature: react-migration, Property 8: Add Flow Increases Count', () => {
  it('*For any* flows array of length N, calling addFlow() should result in a flows array of length N+1', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 0, maxLength: 50 }),
        arbitraryPartialFlow(),
        (initialFlows, newFlowData) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          const countBefore = useDiagramStore.getState().flows.length;

          // Add one more flow
          useDiagramStore.getState().addFlow(newFlowData);

          const countAfter = useDiagramStore.getState().flows.length;

          // The count should increase by exactly 1
          return countAfter === countBefore + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the new flow should be appended to the end of the array', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 0, maxLength: 20 }),
        arbitraryPartialFlow(),
        (initialFlows, newFlowData) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Add one more flow
          useDiagramStore.getState().addFlow(newFlowData);

          const flows = useDiagramStore.getState().flows;
          const lastFlow = flows[flows.length - 1];

          // The last flow should have the new flow's data
          if (!lastFlow) return false;
          return (
            lastFlow.source === (newFlowData.source ?? '') &&
            lastFlow.target === (newFlowData.target ?? '') &&
            lastFlow.value === (newFlowData.value ?? 0)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('existing flows should not be modified when adding a new flow', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 20 }),
        arbitraryPartialFlow(),
        (initialFlows, newFlowData) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Capture existing flows before adding new one
          const flowsBefore = useDiagramStore.getState().flows.map((f) => ({ ...f }));

          // Add one more flow
          useDiagramStore.getState().addFlow(newFlowData);

          const flowsAfter = useDiagramStore.getState().flows;

          // All existing flows should remain unchanged
          return flowsBefore.every((flowBefore, index) => {
            const flowAfter = flowsAfter[index];
            if (!flowAfter) return false;
            return (
              flowBefore.id === flowAfter.id &&
              flowBefore.source === flowAfter.source &&
              flowBefore.target === flowAfter.target &&
              flowBefore.value === flowAfter.value
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 2: Node Position Persistence
// Feature: react-migration, Property 2: Node Position Persistence
// Validates: Requirements 1.3, 4.3
// ============================================================================

describe('Feature: react-migration, Property 2: Node Position Persistence', () => {
  it('*For any* node ID and valid (x, y) coordinates, updateNodePosition should persist those exact coordinates', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        (nodeId, x, y) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Update node position
          useDiagramStore.getState().updateNodePosition(nodeId, x, y);

          // Verify the position is stored correctly
          const customization = useDiagramStore.getState().nodeCustomizations[nodeId];
          return customization?.x === x && customization?.y === y;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updating one node position should not affect other nodes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        (nodeId1, nodeId2, x1, y1, x2, y2) => {
          // Skip if node IDs are the same
          if (nodeId1 === nodeId2) return true;

          // Reset store
          useDiagramStore.getState().clearAll();

          // Set position for first node
          useDiagramStore.getState().updateNodePosition(nodeId1, x1, y1);

          // Set position for second node
          useDiagramStore.getState().updateNodePosition(nodeId2, x2, y2);

          // Verify both positions are correct
          const customization1 = useDiagramStore.getState().nodeCustomizations[nodeId1];
          const customization2 = useDiagramStore.getState().nodeCustomizations[nodeId2];

          return (
            customization1?.x === x1 &&
            customization1?.y === y1 &&
            customization2?.x === x2 &&
            customization2?.y === y2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updating node position should not affect flows or settings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 10 }),
        (nodeId, x, y, initialFlows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Capture state before position update
          const flowsBefore = useDiagramStore.getState().flows.map((f) => ({ ...f }));
          const settingsBefore = { ...useDiagramStore.getState().settings };

          // Update node position
          useDiagramStore.getState().updateNodePosition(nodeId, x, y);

          // Verify flows and settings are unchanged
          const flowsAfter = useDiagramStore.getState().flows;
          const settingsAfter = useDiagramStore.getState().settings;

          const flowsUnchanged = flowsBefore.every((flowBefore, index) => {
            const flowAfter = flowsAfter[index];
            if (!flowAfter) return false;
            return (
              flowBefore.id === flowAfter.id &&
              flowBefore.source === flowAfter.source &&
              flowBefore.target === flowAfter.target &&
              flowBefore.value === flowAfter.value
            );
          });

          const settingsUnchanged =
            settingsBefore.title === settingsAfter.title &&
            settingsBefore.width === settingsAfter.width &&
            settingsBefore.height === settingsAfter.height;

          return flowsUnchanged && settingsUnchanged;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Generators for Customization Tests
// ============================================================================

const arbitraryNodeCustomization = (): fc.Arbitrary<Partial<NodeCustomization>> =>
  fc.record(
    {
      color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`), { nil: undefined }),
      opacity: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
      x: fc.option(fc.float({ min: 0, max: 2000, noNaN: true }), { nil: undefined }),
      y: fc.option(fc.float({ min: 0, max: 2000, noNaN: true }), { nil: undefined }),
      width: fc.option(fc.float({ min: 1, max: 100, noNaN: true }), { nil: undefined }),
    },
    { requiredKeys: [] }
  );

const arbitraryLabelCustomization = (): fc.Arbitrary<Partial<LabelCustomization>> =>
  fc.record(
    {
      visible: fc.option(fc.boolean(), { nil: undefined }),
      fontSize: fc.option(fc.integer({ min: 8, max: 72 }), { nil: undefined }),
      fontFamily: fc.option(fc.constantFrom('Arial', 'Helvetica', 'Times New Roman', 'Courier'), { nil: undefined }),
      color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`), { nil: undefined }),
      offsetX: fc.option(fc.float({ min: -100, max: 100, noNaN: true }), { nil: undefined }),
      offsetY: fc.option(fc.float({ min: -100, max: 100, noNaN: true }), { nil: undefined }),
      background: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`), { nil: undefined }),
      padding: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
    },
    { requiredKeys: [] }
  );

// ============================================================================
// Property 10: Customization Persistence
// Feature: react-migration, Property 10: Customization Persistence
// Validates: Requirements 8.2, 9.2, 9.5
// ============================================================================

describe('Feature: react-migration, Property 10: Customization Persistence', () => {
  it('*For any* node ID and valid node customization, updateNodeCustomization should persist those exact values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitraryNodeCustomization(),
        (nodeId, customization) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Update node customization
          useDiagramStore.getState().updateNodeCustomization(nodeId, customization);

          // Verify the customization is stored correctly
          const stored = useDiagramStore.getState().nodeCustomizations[nodeId];

          // Check each defined property
          for (const key of Object.keys(customization) as (keyof NodeCustomization)[]) {
            if (customization[key] !== undefined && stored?.[key] !== customization[key]) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* node ID and valid label customization, updateLabelCustomization should persist those exact values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        arbitraryLabelCustomization(),
        (nodeId, customization) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Update label customization
          useDiagramStore.getState().updateLabelCustomization(nodeId, customization);

          // Verify the customization is stored correctly
          const stored = useDiagramStore.getState().labelCustomizations[nodeId];

          // Check each defined property
          for (const key of Object.keys(customization) as (keyof LabelCustomization)[]) {
            if (customization[key] !== undefined && stored?.[key] !== customization[key]) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('label visibility toggle should be persisted correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.boolean(),
        (nodeId, visible) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Update label visibility
          useDiagramStore.getState().updateLabelCustomization(nodeId, { visible });

          // Verify the visibility is stored correctly
          const stored = useDiagramStore.getState().labelCustomizations[nodeId];
          return stored?.visible === visible;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('customizations should be retrievable by the same node ID', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        fc.array(arbitraryNodeCustomization(), { minLength: 1, maxLength: 10 }),
        (nodeIds, customizations) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Use the minimum length to avoid index out of bounds
          const count = Math.min(nodeIds.length, customizations.length);

          // Store customizations for each node
          for (let i = 0; i < count; i++) {
            const nodeId = nodeIds[i];
            const customization = customizations[i];
            if (nodeId && customization) {
              useDiagramStore.getState().updateNodeCustomization(nodeId, customization);
            }
          }

          // Verify each customization can be retrieved by its node ID
          for (let i = 0; i < count; i++) {
            const nodeId = nodeIds[i];
            const original = customizations[i];
            if (!nodeId || !original) continue;

            const stored = useDiagramStore.getState().nodeCustomizations[nodeId];

            for (const key of Object.keys(original) as (keyof NodeCustomization)[]) {
              if (original[key] !== undefined && stored?.[key] !== original[key]) {
                return false;
              }
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 4: Undo Restores Previous State
// Feature: react-migration, Property 4: Undo Restores Previous State
// Validates: Requirements 5.2
// ============================================================================

describe('Feature: react-migration, Property 4: Undo Restores Previous State', () => {
  it('*For any* sequence of state changes, calling undo() should restore the state to exactly what it was before the most recent change', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 10 }),
        arbitraryPartialFlow(),
        (initialFlows, additionalFlow) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Save snapshot before making a change
          useDiagramStore.getState().saveSnapshot();

          // Capture state before the change
          const stateBefore = {
            flows: useDiagramStore.getState().flows.map((f) => ({ ...f })),
            nodeCustomizations: { ...useDiagramStore.getState().nodeCustomizations },
            labelCustomizations: { ...useDiagramStore.getState().labelCustomizations },
            settings: { ...useDiagramStore.getState().settings },
          };

          // Make a change
          useDiagramStore.getState().addFlow(additionalFlow);

          // Verify state changed
          const stateAfterChange = useDiagramStore.getState().flows.length;
          if (stateAfterChange !== stateBefore.flows.length + 1) {
            return false;
          }

          // Undo the change
          useDiagramStore.getState().undo();

          // Verify state is restored
          const stateAfterUndo = useDiagramStore.getState();

          // Check flows are restored
          if (stateAfterUndo.flows.length !== stateBefore.flows.length) {
            return false;
          }

          // Check each flow matches
          return stateBefore.flows.every((flowBefore, index) => {
            const flowAfter = stateAfterUndo.flows[index];
            if (!flowAfter) return false;
            return (
              flowBefore.id === flowAfter.id &&
              flowBefore.source === flowAfter.source &&
              flowBefore.target === flowAfter.target &&
              flowBefore.value === flowAfter.value
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the undone state should be pushed to the redo stack', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 0, maxLength: 5 }),
        arbitraryPartialFlow(),
        (initialFlows, additionalFlow) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Save snapshot and make a change
          useDiagramStore.getState().saveSnapshot();
          useDiagramStore.getState().addFlow(additionalFlow);

          // Capture the state that will be undone
          const stateBeforeUndo = useDiagramStore.getState().flows.length;

          // Verify redo stack is empty before undo
          if (useDiagramStore.getState().redoStack.length !== 0) {
            return false;
          }

          // Undo
          useDiagramStore.getState().undo();

          // Verify redo stack has one entry
          if (useDiagramStore.getState().redoStack.length !== 1) {
            return false;
          }

          // Verify the redo stack contains the undone state
          const redoSnapshot = useDiagramStore.getState().redoStack[0];
          return redoSnapshot !== undefined && redoSnapshot.flows.length === stateBeforeUndo;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple undos should work in sequence', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 3, maxLength: 10 }),
        (flows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add flows one by one, saving snapshots
          const snapshots: number[] = [0]; // Start with 0 flows
          flows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
            snapshots.push(useDiagramStore.getState().flows.length);
          });

          // Undo each change and verify
          for (let i = snapshots.length - 2; i >= 0; i--) {
            useDiagramStore.getState().undo();
            if (useDiagramStore.getState().flows.length !== snapshots[i]) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('undo on empty stack should not change state', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 5 }),
        (initialFlows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows (without saving snapshots)
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Capture state before undo attempt
          const flowsBefore = useDiagramStore.getState().flows.map((f) => ({ ...f }));

          // Attempt undo with empty stack
          useDiagramStore.getState().undo();

          // Verify state is unchanged
          const flowsAfter = useDiagramStore.getState().flows;
          if (flowsBefore.length !== flowsAfter.length) {
            return false;
          }

          return flowsBefore.every((flowBefore, index) => {
            const flowAfter = flowsAfter[index];
            if (!flowAfter) return false;
            return flowBefore.id === flowAfter.id;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 5: Redo Restores Next State
// Feature: react-migration, Property 5: Redo Restores Next State
// Validates: Requirements 5.3
// ============================================================================

describe('Feature: react-migration, Property 5: Redo Restores Next State', () => {
  it('*For any* state that has been undone, calling redo() should restore the state to exactly what it was before the undo', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 0, maxLength: 5 }),
        arbitraryPartialFlow(),
        (initialFlows, additionalFlow) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Save snapshot and make a change
          useDiagramStore.getState().saveSnapshot();
          useDiagramStore.getState().addFlow(additionalFlow);

          // Capture state before undo
          const stateBeforeUndo = {
            flowCount: useDiagramStore.getState().flows.length,
            flowIds: useDiagramStore.getState().flows.map((f) => f.id),
          };

          // Undo
          useDiagramStore.getState().undo();

          // Verify state changed after undo
          if (useDiagramStore.getState().flows.length !== stateBeforeUndo.flowCount - 1) {
            return false;
          }

          // Redo
          useDiagramStore.getState().redo();

          // Verify state is restored to before undo
          const stateAfterRedo = useDiagramStore.getState();
          if (stateAfterRedo.flows.length !== stateBeforeUndo.flowCount) {
            return false;
          }

          // Verify flow IDs match
          return stateBeforeUndo.flowIds.every((id, index) => {
            return stateAfterRedo.flows[index]?.id === id;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the redone state should be pushed back to the undo stack', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 0, maxLength: 5 }),
        arbitraryPartialFlow(),
        (initialFlows, additionalFlow) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Save snapshot and make a change
          useDiagramStore.getState().saveSnapshot();
          useDiagramStore.getState().addFlow(additionalFlow);

          const undoStackSizeBeforeUndo = useDiagramStore.getState().undoStack.length;

          // Undo
          useDiagramStore.getState().undo();

          // Undo stack should decrease by 1
          if (useDiagramStore.getState().undoStack.length !== undoStackSizeBeforeUndo - 1) {
            return false;
          }

          // Redo
          useDiagramStore.getState().redo();

          // Undo stack should increase by 1 (back to original size)
          return useDiagramStore.getState().undoStack.length === undoStackSizeBeforeUndo;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple redos should work in sequence', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 3, maxLength: 8 }),
        (flows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add flows one by one, saving snapshots
          const expectedCounts: number[] = [0];
          flows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
            expectedCounts.push(useDiagramStore.getState().flows.length);
          });

          // Undo all changes
          for (let i = 0; i < flows.length; i++) {
            useDiagramStore.getState().undo();
          }

          // Verify we're back to 0 flows
          if (useDiagramStore.getState().flows.length !== 0) {
            return false;
          }

          // Redo all changes and verify each step
          for (let i = 1; i <= flows.length; i++) {
            useDiagramStore.getState().redo();
            if (useDiagramStore.getState().flows.length !== expectedCounts[i]) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('redo on empty stack should not change state', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 5 }),
        (initialFlows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Capture state before redo attempt
          const flowsBefore = useDiagramStore.getState().flows.map((f) => ({ ...f }));

          // Attempt redo with empty stack
          useDiagramStore.getState().redo();

          // Verify state is unchanged
          const flowsAfter = useDiagramStore.getState().flows;
          if (flowsBefore.length !== flowsAfter.length) {
            return false;
          }

          return flowsBefore.every((flowBefore, index) => {
            const flowAfter = flowsAfter[index];
            if (!flowAfter) return false;
            return flowBefore.id === flowAfter.id;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 6: Redo Stack Cleared on New Change
// Feature: react-migration, Property 6: Redo Stack Cleared on New Change
// Validates: Requirements 5.4
// ============================================================================

describe('Feature: react-migration, Property 6: Redo Stack Cleared on New Change', () => {
  it('*For any* state where the redo stack is non-empty, making a new state change should clear the redo stack completely', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 2, maxLength: 5 }),
        arbitraryPartialFlow(),
        (initialFlows, newFlow) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows with snapshots
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
          });

          // Undo to populate redo stack
          useDiagramStore.getState().undo();
          useDiagramStore.getState().undo();

          // Verify redo stack is non-empty
          if (useDiagramStore.getState().redoStack.length === 0) {
            return true; // Skip if redo stack is empty (shouldn't happen)
          }

          // Make a new change (addFlow)
          useDiagramStore.getState().addFlow(newFlow);

          // Verify redo stack is cleared
          return useDiagramStore.getState().redoStack.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('setFlows should clear redo stack', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 2, maxLength: 5 }),
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 3 }),
        (initialFlows, newFlows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows with snapshots
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
          });

          // Undo to populate redo stack
          useDiagramStore.getState().undo();

          // Verify redo stack is non-empty
          if (useDiagramStore.getState().redoStack.length === 0) {
            return true;
          }

          // Make a new change (setFlows)
          const flowsToSet = newFlows.map((f, i) => ({
            id: `flow-${i}`,
            source: f.source ?? '',
            target: f.target ?? '',
            value: f.value ?? 0,
          }));
          useDiagramStore.getState().setFlows(flowsToSet);

          // Verify redo stack is cleared
          return useDiagramStore.getState().redoStack.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('removeFlow should clear redo stack', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 3, maxLength: 6 }),
        (initialFlows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows with snapshots
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
          });

          // Undo to populate redo stack
          useDiagramStore.getState().undo();

          // Verify redo stack is non-empty
          if (useDiagramStore.getState().redoStack.length === 0) {
            return true;
          }

          // Get a flow ID to remove
          const flowToRemove = useDiagramStore.getState().flows[0];
          if (!flowToRemove) return true;

          // Make a new change (removeFlow)
          useDiagramStore.getState().removeFlow(flowToRemove.id);

          // Verify redo stack is cleared
          return useDiagramStore.getState().redoStack.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updateNodeCustomization should clear redo stack', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 2, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        arbitraryNodeCustomization(),
        (initialFlows, nodeId, customization) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows with snapshots
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
          });

          // Undo to populate redo stack
          useDiagramStore.getState().undo();

          // Verify redo stack is non-empty
          if (useDiagramStore.getState().redoStack.length === 0) {
            return true;
          }

          // Make a new change (updateNodeCustomization)
          useDiagramStore.getState().updateNodeCustomization(nodeId, customization);

          // Verify redo stack is cleared
          return useDiagramStore.getState().redoStack.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updateSettings should clear redo stack', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 2, maxLength: 5 }),
        fc.record({
          title: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          width: fc.option(fc.integer({ min: 100, max: 2000 }), { nil: undefined }),
        }),
        (initialFlows, settingsUpdate) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows with snapshots
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
          });

          // Undo to populate redo stack
          useDiagramStore.getState().undo();

          // Verify redo stack is non-empty
          if (useDiagramStore.getState().redoStack.length === 0) {
            return true;
          }

          // Make a new change (updateSettings)
          useDiagramStore.getState().updateSettings(settingsUpdate);

          // Verify redo stack is cleared
          return useDiagramStore.getState().redoStack.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('undo and redo actions should NOT clear redo stack (except undo populates it)', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 3, maxLength: 6 }),
        (initialFlows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add initial flows with snapshots
          initialFlows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
          });

          // Undo twice to populate redo stack
          useDiagramStore.getState().undo();
          useDiagramStore.getState().undo();

          const redoStackSizeAfterUndos = useDiagramStore.getState().redoStack.length;

          // Redo should decrease redo stack by 1, not clear it
          useDiagramStore.getState().redo();

          // Verify redo stack decreased by 1 (not cleared)
          return useDiagramStore.getState().redoStack.length === redoStackSizeAfterUndos - 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 7: Undo Stack Size Limit
// Feature: react-migration, Property 7: Undo Stack Size Limit
// Validates: Requirements 5.5
// ============================================================================

import { UNDO_STACK_LIMIT } from '../useDiagramStore';

describe('Feature: react-migration, Property 7: Undo Stack Size Limit', () => {
  it('*For any* sequence of more than 50 state changes, the undo stack length should never exceed 50 entries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 70 }),
        (numChanges) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Make more than 50 changes
          for (let i = 0; i < numChanges; i++) {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow({ source: `source-${i}`, target: `target-${i}`, value: i });
          }

          // Verify undo stack never exceeds limit
          return useDiagramStore.getState().undoStack.length <= UNDO_STACK_LIMIT;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the undo stack should contain exactly UNDO_STACK_LIMIT entries when more changes are made', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 51, max: 100 }),
        (numChanges) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Make more than 50 changes
          for (let i = 0; i < numChanges; i++) {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow({ source: `source-${i}`, target: `target-${i}`, value: i });
          }

          // Verify undo stack is exactly at the limit
          return useDiagramStore.getState().undoStack.length === UNDO_STACK_LIMIT;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the most recent 50 changes should be available for undo (oldest discarded first)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 55, max: 70 }),
        (numChanges) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Make changes and track expected flow counts
          const expectedCounts: number[] = [];
          for (let i = 0; i < numChanges; i++) {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow({ source: `source-${i}`, target: `target-${i}`, value: i });
            expectedCounts.push(i + 1);
          }

          // The most recent 50 snapshots should be available
          // Each snapshot captures the state BEFORE the change
          // So the most recent snapshot should have (numChanges - 1) flows
          // And we should be able to undo 50 times

          // Undo all available changes
          let undoCount = 0;
          while (useDiagramStore.getState().undoStack.length > 0) {
            useDiagramStore.getState().undo();
            undoCount++;
          }

          // We should have been able to undo exactly UNDO_STACK_LIMIT times
          return undoCount === UNDO_STACK_LIMIT;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('undo stack should grow normally when under the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 49 }),
        (numChanges) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Make fewer than 50 changes
          for (let i = 0; i < numChanges; i++) {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow({ source: `source-${i}`, target: `target-${i}`, value: i });
          }

          // Verify undo stack has exactly numChanges entries
          return useDiagramStore.getState().undoStack.length === numChanges;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 1: State Serialization Round-Trip
// Feature: react-migration, Property 1: State Serialization Round-Trip
// Validates: Requirements 1.5, 7.3, 7.4, 10.2
// ============================================================================

// Generator for complete Flow objects
const arbitraryCompleteFlow = (): fc.Arbitrary<Flow> =>
  fc.record({
    id: fc.uuid(),
    source: fc.string({ minLength: 1, maxLength: 50 }),
    target: fc.string({ minLength: 1, maxLength: 50 }),
    value: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true }),
    color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`), { nil: undefined }),
    opacity: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  });

// Generator for DiagramSettings
const arbitraryDiagramSettings = (): fc.Arbitrary<DiagramSettings> =>
  fc.record({
    title: fc.string({ minLength: 1, maxLength: 100 }),
    width: fc.integer({ min: 100, max: 2000 }),
    height: fc.integer({ min: 100, max: 2000 }),
    nodeWidth: fc.integer({ min: 5, max: 50 }),
    nodePadding: fc.integer({ min: 1, max: 50 }),
    flowOpacity: fc.float({ min: 0, max: 1, noNaN: true }),
    colorScheme: fc.constantFrom('source', 'target', 'gradient') as fc.Arbitrary<'source' | 'target' | 'gradient'>,
  });

describe('Feature: react-migration, Property 1: State Serialization Round-Trip', () => {
  it('*For any* valid DiagramState, serializing to JSON and deserializing should produce equivalent state', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryCompleteFlow(), { minLength: 0, maxLength: 20 }),
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), arbitraryNodeCustomization()),
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), arbitraryLabelCustomization()),
        arbitraryDiagramSettings(),
        (flows, nodeCustomizations, labelCustomizations, settings) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Set up state
          flows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Apply node customizations
          for (const [nodeId, customization] of Object.entries(nodeCustomizations)) {
            useDiagramStore.getState().updateNodeCustomization(nodeId, customization);
          }

          // Apply label customizations
          for (const [nodeId, customization] of Object.entries(labelCustomizations)) {
            useDiagramStore.getState().updateLabelCustomization(nodeId, customization);
          }

          // Update settings
          useDiagramStore.getState().updateSettings(settings);

          // Serialize the state
          const state = useDiagramStore.getState();
          const serialized = serialize(state);

          // Deserialize the state
          const deserialized = deserialize(serialized);

          // Verify deserialization succeeded
          if (!deserialized) return false;

          // Verify flows are preserved
          if (deserialized.flows.length !== state.flows.length) return false;
          for (let i = 0; i < state.flows.length; i++) {
            const original = state.flows[i];
            const restored = deserialized.flows[i];
            if (!original || !restored) return false;
            if (
              original.id !== restored.id ||
              original.source !== restored.source ||
              original.target !== restored.target ||
              original.value !== restored.value
            ) {
              return false;
            }
          }

          // Verify node customizations are preserved
          for (const [nodeId, original] of Object.entries(state.nodeCustomizations)) {
            const restored = deserialized.nodeCustomizations[nodeId];
            if (!restored) return false;
            for (const key of Object.keys(original) as (keyof NodeCustomization)[]) {
              if (original[key] !== restored[key]) return false;
            }
          }

          // Verify label customizations are preserved
          for (const [nodeId, original] of Object.entries(state.labelCustomizations)) {
            const restored = deserialized.labelCustomizations[nodeId];
            if (!restored) return false;
            for (const key of Object.keys(original) as (keyof LabelCustomization)[]) {
              if (original[key] !== restored[key]) return false;
            }
          }

          // Verify settings are preserved
          if (
            deserialized.settings.title !== state.settings.title ||
            deserialized.settings.width !== state.settings.width ||
            deserialized.settings.height !== state.settings.height ||
            deserialized.settings.nodeWidth !== state.settings.nodeWidth ||
            deserialized.settings.nodePadding !== state.settings.nodePadding ||
            deserialized.settings.flowOpacity !== state.settings.flowOpacity ||
            deserialized.settings.colorScheme !== state.settings.colorScheme
          ) {
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deserialize should return null for invalid JSON', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
          try {
            JSON.parse(s);
            return false; // Valid JSON, skip
          } catch {
            return true; // Invalid JSON, keep
          }
        }),
        (invalidJson) => {
          const result = deserialize(invalidJson);
          return result === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deserialize should return null for valid JSON with invalid schema', () => {
    fc.assert(
      fc.property(
        fc.record({
          notVersion: fc.string(),
          notFlows: fc.string(),
        }),
        (invalidSchema) => {
          const json = JSON.stringify(invalidSchema);
          const result = deserialize(json);
          return result === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip should preserve flow optional properties (color, opacity)', () => {
    fc.assert(
      fc.property(
        arbitraryCompleteFlow(),
        (flow) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add flow with optional properties
          useDiagramStore.getState().addFlow(flow);

          // Serialize and deserialize
          const state = useDiagramStore.getState();
          const serialized = serialize(state);
          const deserialized = deserialize(serialized);

          if (!deserialized) return false;

          const originalFlow = state.flows[0];
          const restoredFlow = deserialized.flows[0];

          if (!originalFlow || !restoredFlow) return false;

          // Check optional properties are preserved
          return (
            originalFlow.color === restoredFlow.color &&
            originalFlow.opacity === restoredFlow.opacity
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 12: Clear All Resets State
// Feature: react-migration, Property 12: Clear All Resets State
// Validates: Requirements 10.3
// ============================================================================

import { defaultSettings, defaultUIState } from '../useDiagramStore';

describe('Feature: react-migration, Property 12: Clear All Resets State', () => {
  it('*For any* DiagramState with non-empty flows, customizations, and history, clearAll() should reset to initial default state', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 20 }),
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), arbitraryNodeCustomization()),
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), arbitraryLabelCustomization()),
        (flows, nodeCustomizations, labelCustomizations) => {
          // Reset store first
          useDiagramStore.getState().clearAll();

          // Add flows
          flows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Apply node customizations
          for (const [nodeId, customization] of Object.entries(nodeCustomizations)) {
            useDiagramStore.getState().updateNodeCustomization(nodeId, customization);
          }

          // Apply label customizations
          for (const [nodeId, customization] of Object.entries(labelCustomizations)) {
            useDiagramStore.getState().updateLabelCustomization(nodeId, customization);
          }

          // Save some snapshots to populate undo stack
          useDiagramStore.getState().saveSnapshot();
          useDiagramStore.getState().addFlow({ source: 'extra', target: 'flow', value: 100 });
          useDiagramStore.getState().saveSnapshot();

          // Undo to populate redo stack
          useDiagramStore.getState().undo();

          // Verify state is non-empty before clearAll
          const stateBefore = useDiagramStore.getState();
          if (stateBefore.flows.length === 0) return true; // Skip if already empty

          // Call clearAll
          useDiagramStore.getState().clearAll();

          // Verify state is reset to initial defaults
          const stateAfter = useDiagramStore.getState();

          // Check flows are empty
          if (stateAfter.flows.length !== 0) return false;

          // Check customizations are empty
          if (Object.keys(stateAfter.nodeCustomizations).length !== 0) return false;
          if (Object.keys(stateAfter.labelCustomizations).length !== 0) return false;

          // Check undo/redo stacks are empty
          if (stateAfter.undoStack.length !== 0) return false;
          if (stateAfter.redoStack.length !== 0) return false;

          // Check settings are reset to defaults
          if (stateAfter.settings.title !== defaultSettings.title) return false;
          if (stateAfter.settings.width !== defaultSettings.width) return false;
          if (stateAfter.settings.height !== defaultSettings.height) return false;

          // Check UI state is reset to defaults
          if (stateAfter.ui.selectedNodeId !== defaultUIState.selectedNodeId) return false;
          if (stateAfter.ui.selectedFlowId !== defaultUIState.selectedFlowId) return false;
          if (stateAfter.ui.zoom !== defaultUIState.zoom) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clearAll should clear undo stack', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 10 }),
        (flows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add flows with snapshots
          flows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
          });

          // Verify undo stack is non-empty
          if (useDiagramStore.getState().undoStack.length === 0) return true;

          // Call clearAll
          useDiagramStore.getState().clearAll();

          // Verify undo stack is empty
          return useDiagramStore.getState().undoStack.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clearAll should clear redo stack', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 2, maxLength: 10 }),
        (flows) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add flows with snapshots
          flows.forEach((flow) => {
            useDiagramStore.getState().saveSnapshot();
            useDiagramStore.getState().addFlow(flow);
          });

          // Undo to populate redo stack
          useDiagramStore.getState().undo();

          // Verify redo stack is non-empty
          if (useDiagramStore.getState().redoStack.length === 0) return true;

          // Call clearAll
          useDiagramStore.getState().clearAll();

          // Verify redo stack is empty
          return useDiagramStore.getState().redoStack.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('state after clearAll should match initial state', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPartialFlow(), { minLength: 1, maxLength: 5 }),
        (flows) => {
          // Get initial state by creating a fresh clear
          useDiagramStore.getState().clearAll();
          const initialState = useDiagramStore.getState();

          // Modify state
          flows.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });
          useDiagramStore.getState().updateSettings({ title: 'Modified Title' });
          useDiagramStore.getState().updateNodeCustomization('node1', { color: '#ff0000' });

          // Clear all
          useDiagramStore.getState().clearAll();
          const clearedState = useDiagramStore.getState();

          // Compare key properties
          return (
            clearedState.flows.length === initialState.flows.length &&
            Object.keys(clearedState.nodeCustomizations).length === Object.keys(initialState.nodeCustomizations).length &&
            Object.keys(clearedState.labelCustomizations).length === Object.keys(initialState.labelCustomizations).length &&
            clearedState.undoStack.length === initialState.undoStack.length &&
            clearedState.redoStack.length === initialState.redoStack.length &&
            clearedState.settings.title === initialState.settings.title
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 4: Comparison Value Persistence
// Feature: sankey-enhancements, Property 4: Comparison Value Persistence
// Validates: Requirements 1.2
// ============================================================================

describe('Feature: sankey-enhancements, Property 4: Comparison Value Persistence', () => {
  it('*For any* flow with a comparisonValue set, storing and retrieving from the Diagram_Store SHALL preserve the exact comparisonValue', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: 0, max: 1000000, noNaN: true }),
        fc.float({ min: 0, max: 1000000, noNaN: true }),
        (source, target, value, comparisonValue) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add flow with comparisonValue
          useDiagramStore.getState().addFlow({
            source,
            target,
            value,
            comparisonValue,
          });

          // Retrieve the flow
          const flows = useDiagramStore.getState().flows;
          const addedFlow = flows[0];

          // Verify comparisonValue is preserved exactly
          return (
            addedFlow !== undefined &&
            addedFlow.comparisonValue === comparisonValue
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('flows without comparisonValue should have undefined comparisonValue', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: 0, max: 1000000, noNaN: true }),
        (source, target, value) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add flow without comparisonValue
          useDiagramStore.getState().addFlow({
            source,
            target,
            value,
          });

          // Retrieve the flow
          const flows = useDiagramStore.getState().flows;
          const addedFlow = flows[0];

          // Verify comparisonValue is undefined
          return (
            addedFlow !== undefined &&
            addedFlow.comparisonValue === undefined
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('comparisonValue should be preserved when setting multiple flows', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            source: fc.string({ minLength: 1, maxLength: 20 }),
            target: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.float({ min: 0, max: 1000000, noNaN: true }),
            comparisonValue: fc.option(fc.float({ min: 0, max: 1000000, noNaN: true }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (flowsData) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Add all flows
          flowsData.forEach((flowData) => {
            useDiagramStore.getState().addFlow(flowData);
          });

          // Retrieve flows
          const storedFlows = useDiagramStore.getState().flows;

          // Verify each flow's comparisonValue is preserved
          return flowsData.every((original, index) => {
            const stored = storedFlows[index];
            if (!stored) return false;
            return stored.comparisonValue === original.comparisonValue;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 5: Data Source Notes Persistence
// Feature: sankey-enhancements, Property 5: Data Source Notes Persistence
// Validates: Requirements 7.2
// ============================================================================

describe('Feature: sankey-enhancements, Property 5: Data Source Notes Persistence', () => {
  it('*For any* non-empty dataSourceNotes string, storing and retrieving from the Diagram_Store SHALL preserve the exact string content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (notes) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Update data source notes
          useDiagramStore.getState().updateDataSourceNotes(notes);

          // Retrieve the notes
          const storedNotes = useDiagramStore.getState().settings.dataSourceNotes;

          // Verify notes are preserved exactly
          return storedNotes === notes;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty dataSourceNotes should be preserved', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (initialNotes) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Set initial notes
          useDiagramStore.getState().updateDataSourceNotes(initialNotes);

          // Clear notes
          useDiagramStore.getState().updateDataSourceNotes('');

          // Verify notes are empty
          return useDiagramStore.getState().settings.dataSourceNotes === '';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('dataSourceNotes should be preserved via updateSettings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (notes) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Update via updateSettings
          useDiagramStore.getState().updateSettings({ dataSourceNotes: notes });

          // Retrieve the notes
          const storedNotes = useDiagramStore.getState().settings.dataSourceNotes;

          // Verify notes are preserved exactly
          return storedNotes === notes;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 6: Notes in JSON Export Round-Trip
// Feature: sankey-enhancements, Property 6: Notes in JSON Export Round-Trip
// Validates: Requirements 7.3
// ============================================================================

describe('Feature: sankey-enhancements, Property 6: Notes in JSON Export Round-Trip', () => {
  it('*For any* DiagramState with dataSourceNotes, exporting to JSON and importing back SHALL preserve the notes content exactly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1000 }),
        fc.array(arbitraryPartialFlow(), { minLength: 0, maxLength: 5 }),
        (notes, flowsData) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Set up state with notes
          useDiagramStore.getState().updateDataSourceNotes(notes);
          flowsData.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Get current state
          const state = useDiagramStore.getState();

          // Serialize state (simulating JSON export)
          const serialized = serialize(state);

          // Deserialize (simulating JSON import)
          const deserialized = deserialize(serialized);

          // Verify notes are preserved
          if (!deserialized) return false;
          return deserialized.settings.dataSourceNotes === notes;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip should preserve dataSourceNotes with special characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (notes) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Set notes with potential special characters
          useDiagramStore.getState().updateDataSourceNotes(notes);

          // Get current state
          const state = useDiagramStore.getState();

          // Serialize and deserialize
          const serialized = serialize(state);
          const deserialized = deserialize(serialized);

          // Verify notes are preserved exactly
          if (!deserialized) return false;
          return deserialized.settings.dataSourceNotes === notes;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip should preserve both comparisonValue and dataSourceNotes together', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        fc.array(
          fc.record({
            source: fc.string({ minLength: 1, maxLength: 20 }),
            target: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.float({ min: 0, max: 1000000, noNaN: true }),
            comparisonValue: fc.option(fc.float({ min: 0, max: 1000000, noNaN: true }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (notes, flowsData) => {
          // Reset store
          useDiagramStore.getState().clearAll();

          // Set up state with notes and flows with comparisonValues
          useDiagramStore.getState().updateDataSourceNotes(notes);
          flowsData.forEach((flow) => {
            useDiagramStore.getState().addFlow(flow);
          });

          // Get current state
          const state = useDiagramStore.getState();

          // Serialize and deserialize
          const serialized = serialize(state);
          const deserialized = deserialize(serialized);

          // Verify both notes and comparisonValues are preserved
          if (!deserialized) return false;
          if (deserialized.settings.dataSourceNotes !== notes) return false;

          // Verify each flow's comparisonValue
          return flowsData.every((original, index) => {
            const stored = deserialized.flows[index];
            if (!stored) return false;
            return stored.comparisonValue === original.comparisonValue;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
