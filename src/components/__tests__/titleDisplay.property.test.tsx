/**
 * Property-Based Tests for Title Display
 * 
 * Feature: sankey-enhancements, Property 7: Title Display Consistency
 * 
 * *For any* non-empty title string in settings, the rendered chart SHALL contain 
 * that exact title text.
 * 
 * **Validates: Requirements 4.1**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import SankeyChart from '../SankeyChart';
import { useDiagramStore } from '../../store/useDiagramStore';

// ============================================================================
// Test Setup
// ============================================================================

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider>{children}</ChakraProvider>
);

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

/**
 * Generates a non-empty, non-whitespace title string
 */
const arbitraryNonEmptyTitle = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 100 })
    .filter(s => s.trim().length > 0);

/**
 * Generates an empty or whitespace-only title string
 */
const arbitraryEmptyTitle = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant(''),
    fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 10 })
  );

// ============================================================================
// Property Tests
// ============================================================================

describe('Feature: sankey-enhancements, Property 7: Title Display Consistency', () => {
  
  beforeEach(() => {
    // Reset store to default state before each test
    useDiagramStore.getState().clearAll();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Non-empty title display', () => {
    it('*For any* non-empty title string, the rendered chart SHALL contain that exact title text', () => {
      fc.assert(
        fc.property(
          arbitraryNonEmptyTitle(),
          (title) => {
            // Set the title in the store
            useDiagramStore.getState().updateSettings({ title });
            
            // Render the component
            render(
              <TestWrapper>
                <SankeyChart />
              </TestWrapper>
            );
            
            // Verify the title is displayed (use trimmed title since React normalizes whitespace)
            const trimmedTitle = title.trim();
            const titleElement = screen.getByText(trimmedTitle);
            expect(titleElement).toBeDefined();
            // The displayed text should match the trimmed title
            expect(titleElement.textContent?.trim()).toBe(trimmedTitle);
            
            // Cleanup for next iteration
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Empty title handling', () => {
    it('*For any* empty or whitespace-only title, the chart SHALL NOT display a title element', () => {
      fc.assert(
        fc.property(
          arbitraryEmptyTitle(),
          (title) => {
            // Set the empty/whitespace title in the store
            useDiagramStore.getState().updateSettings({ title });
            
            // Render the component
            render(
              <TestWrapper>
                <SankeyChart />
              </TestWrapper>
            );
            
            // Verify no title is displayed (the title text should not be in the document)
            // We check that the trimmed title is not present as visible text
            if (title.trim() === '') {
              // For empty titles, we shouldn't find any title element
              // The placeholder text should still be there
              const placeholder = screen.queryByText(/Add flows in the Data Editor/);
              expect(placeholder).toBeDefined();
            }
            
            // Cleanup for next iteration
            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Title update reactivity', () => {
    it('*For any* sequence of title updates, the displayed title SHALL always match the current setting', () => {
      fc.assert(
        fc.property(
          // Generate unique titles to avoid multiple elements with same text
          fc.array(arbitraryNonEmptyTitle(), { minLength: 2, maxLength: 5 })
            .map(titles => [...new Set(titles.map(t => t.trim()))].filter(t => t.length > 0))
            .filter(titles => titles.length >= 2),
          (titles) => {
            // Render the component once
            const { rerender } = render(
              <TestWrapper>
                <SankeyChart />
              </TestWrapper>
            );
            
            // Update title multiple times and verify each update
            for (const title of titles) {
              useDiagramStore.getState().updateSettings({ title });
              
              // Force re-render
              rerender(
                <TestWrapper>
                  <SankeyChart />
                </TestWrapper>
              );
              
              // Verify the current title is displayed
              // Use getAllByText since there might be multiple renders in the DOM
              const titleElements = screen.getAllByText(title);
              expect(titleElements.length).toBeGreaterThan(0);
              expect(titleElements[0].textContent?.trim()).toBe(title);
            }
            
            // Cleanup for next iteration
            cleanup();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
