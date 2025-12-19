/**
 * Property-based tests for StudioUI state management
 * Feature: sankey-studio-canvas-refactor, Property 4: Tool State Synchronization
 * Validates: Requirements 2.3, 10.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StudioUI } from '../studio-ui.js';

// Valid tools for the StudioUI
const validTools = ['select', 'pan', 'addNode', 'addFlow'];

// Arbitrary for generating valid tool names
const toolArbitrary = fc.constantFrom(...validTools);

describe('StudioUI Property Tests', () => {
  beforeEach(() => {
    // Reset StudioUI state before each test
    StudioUI.reset();
    // Clear all listeners
    StudioUI._listeners = {};
  });

  /**
   * Property 4: Tool State Synchronization
   * For any tool selection from the toolbar, StudioUI.currentTool should update
   * to match the selected tool.
   * Validates: Requirements 2.3, 10.5
   */
  describe('Property 4: Tool State Synchronization', () => {
    it('setTool updates currentTool to match the selected tool', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          // Act
          StudioUI.setTool(tool);
          
          // Assert: currentTool should match the selected tool
          expect(StudioUI.currentTool).toBe(tool);
        }),
        { numRuns: 100 }
      );
    });

    it('setTool emits toolChange event with correct tool value', () => {
      fc.assert(
        fc.property(toolArbitrary, (tool) => {
          let emittedTool = null;
          
          // Setup listener
          const listener = (data) => {
            emittedTool = data.tool;
          };
          StudioUI.on('toolChange', listener);
          
          // Act
          StudioUI.setTool(tool);
          
          // Assert: emitted tool should match selected tool
          expect(emittedTool).toBe(tool);
          
          // Cleanup
          StudioUI.off('toolChange', listener);
        }),
        { numRuns: 100 }
      );
    });

    it('sequential tool changes maintain synchronization', () => {
      fc.assert(
        fc.property(fc.array(toolArbitrary, { minLength: 1, maxLength: 20 }), (tools) => {
          // Act: Apply sequence of tool changes
          tools.forEach(tool => StudioUI.setTool(tool));
          
          // Assert: currentTool should match the last tool in sequence
          const lastTool = tools[tools.length - 1];
          expect(StudioUI.currentTool).toBe(lastTool);
        }),
        { numRuns: 100 }
      );
    });

    it('toolChange event includes previous tool value', () => {
      fc.assert(
        fc.property(toolArbitrary, toolArbitrary, (firstTool, secondTool) => {
          let previousToolFromEvent = null;
          
          // Set initial tool
          StudioUI.setTool(firstTool);
          
          // Setup listener for second change
          const listener = (data) => {
            previousToolFromEvent = data.previousTool;
          };
          StudioUI.on('toolChange', listener);
          
          // Act: Change to second tool
          StudioUI.setTool(secondTool);
          
          // Assert: previousTool in event should match first tool
          expect(previousToolFromEvent).toBe(firstTool);
          
          // Cleanup
          StudioUI.off('toolChange', listener);
        }),
        { numRuns: 100 }
      );
    });

    it('invalid tools do not change currentTool state', () => {
      fc.assert(
        fc.property(
          toolArbitrary,
          fc.string().filter(s => !validTools.includes(s)),
          (validTool, invalidTool) => {
            // Set a valid tool first
            StudioUI.setTool(validTool);
            const toolBeforeInvalid = StudioUI.currentTool;
            
            // Attempt to set invalid tool
            StudioUI.setTool(invalidTool);
            
            // Assert: currentTool should remain unchanged
            expect(StudioUI.currentTool).toBe(toolBeforeInvalid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
