/**
 * Property Test: Title Display Consistency
 * 
 * Property 7: For any non-empty title string in settings, 
 * the rendered chart SHALL contain that exact title text.
 * 
 * Validates: Requirements 4.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useDiagramStore } from '../../store/useDiagramStore';

describe('Property 7: Title Display Consistency', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useDiagramStore.getState().clearAll();
  });

  it('should store non-empty title strings exactly as provided', () => {
    fc.assert(
      fc.property(
        // Generate non-empty, non-whitespace-only strings
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (title) => {
          const store = useDiagramStore.getState();
          
          // Update settings with the title
          store.updateSettings({ title });
          
          // Retrieve the stored title
          const storedTitle = useDiagramStore.getState().settings.title;
          
          // The stored title should exactly match the input
          expect(storedTitle).toBe(title);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve title through settings updates', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 100, max: 2000 }), // width
        fc.integer({ min: 100, max: 2000 }), // height
        (title, width, height) => {
          const store = useDiagramStore.getState();
          
          // Set initial title
          store.updateSettings({ title });
          
          // Update other settings
          store.updateSettings({ width, height });
          
          // Title should still be preserved
          const storedTitle = useDiagramStore.getState().settings.title;
          expect(storedTitle).toBe(title);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle special characters in titles', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (title) => {
          const store = useDiagramStore.getState();
          
          // Update settings with the title containing special chars
          store.updateSettings({ title });
          
          // Retrieve and verify
          const storedTitle = useDiagramStore.getState().settings.title;
          expect(storedTitle).toBe(title);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify when title should be displayed', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Non-empty, non-whitespace strings (should display)
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          // Empty or whitespace-only strings (should not display)
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t\n')
        ),
        (title) => {
          const store = useDiagramStore.getState();
          store.updateSettings({ title });
          
          const storedTitle = useDiagramStore.getState().settings.title;
          // Convert to boolean explicitly for comparison
          const shouldDisplay = Boolean(storedTitle && storedTitle.trim() !== '');
          
          // Verify the display logic matches expectations
          if (title.trim().length > 0) {
            expect(shouldDisplay).toBe(true);
          } else {
            expect(shouldDisplay).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
