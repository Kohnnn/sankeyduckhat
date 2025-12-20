/**
 * Property-based tests for RecentColorsManager
 * Feature: ui-improvements-and-ai-enhancement
 * 
 * Property 11: Recent Colors FIFO Behavior
 * Validates: Requirements 4.2, 4.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { RecentColorsManager } from '../recent-colors-manager.js';

// Mock localStorage
const createMockLocalStorage = () => {
  const store = new Map();
  return {
    getItem: vi.fn((key) => store.get(key) || null),
    setItem: vi.fn((key, value) => store.set(key, value)),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    _store: store
  };
};

// Generate valid hex color
const hexColorArb = fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s);

describe('RecentColorsManager', () => {
  let mockLocalStorage;

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    global.localStorage = mockLocalStorage;
    RecentColorsManager.clear();
  });

  describe('Property 11: Recent Colors FIFO Behavior', () => {
    /**
     * Feature: ui-improvements-and-ai-enhancement, Property 11: Recent Colors FIFO Behavior
     * For any sequence of color selections, the recent colors list SHALL contain
     * at most 5 colors in FIFO order (most recent first), with no duplicates.
     */
    it('maintains FIFO order with max 5 colors and no duplicates', () => {
      fc.assert(
        fc.property(
          fc.array(hexColorArb, { minLength: 1, maxLength: 20 }),
          (colors) => {
            // Clear before test
            RecentColorsManager.clear();
            
            // Add all colors
            colors.forEach(color => RecentColorsManager.addColor(color));
            
            // Get recent colors
            const recent = RecentColorsManager.getRecentColors();
            
            // Property 1: Max 5 colors
            expect(recent.length).toBeLessThanOrEqual(5);
            
            // Property 2: No duplicates
            const uniqueRecent = new Set(recent.map(c => c.toLowerCase()));
            expect(uniqueRecent.size).toBe(recent.length);
            
            // Property 3: Most recent first
            if (colors.length > 0) {
              const lastColor = colors[colors.length - 1].toLowerCase();
              expect(recent[0].toLowerCase()).toBe(lastColor);
            }
            
            // Property 4: All colors in recent list were added
            recent.forEach(color => {
              const wasAdded = colors.some(c => c.toLowerCase() === color.toLowerCase());
              expect(wasAdded).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('adding duplicate color moves it to front', () => {
      fc.assert(
        fc.property(
          fc.array(hexColorArb, { minLength: 3, maxLength: 5 }),
          (colors) => {
            // Clear and add initial colors
            RecentColorsManager.clear();
            colors.forEach(color => RecentColorsManager.addColor(color));
            
            // Get the last color (oldest in list)
            const recent = RecentColorsManager.getRecentColors();
            if (recent.length < 2) return; // Skip if not enough colors
            
            const oldestColor = recent[recent.length - 1];
            
            // Add the oldest color again
            RecentColorsManager.addColor(oldestColor);
            
            // It should now be first
            const newRecent = RecentColorsManager.getRecentColors();
            expect(newRecent[0].toLowerCase()).toBe(oldestColor.toLowerCase());
            
            // List should not have grown
            expect(newRecent.length).toBe(recent.length);
            
            // No duplicates
            const uniqueNew = new Set(newRecent.map(c => c.toLowerCase()));
            expect(uniqueNew.size).toBe(newRecent.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('oldest colors are removed when exceeding max', () => {
      fc.assert(
        fc.property(
          // Generate exactly 7 unique colors
          fc.array(hexColorArb, { minLength: 7, maxLength: 7 })
            .filter(arr => new Set(arr.map(c => c.toLowerCase())).size === 7),
          (colors) => {
            RecentColorsManager.clear();
            
            // Add all 7 colors
            colors.forEach(color => RecentColorsManager.addColor(color));
            
            const recent = RecentColorsManager.getRecentColors();
            
            // Should have exactly 5 colors
            expect(recent.length).toBe(5);
            
            // First two colors should NOT be in the list (they were pushed out)
            const recentLower = recent.map(c => c.toLowerCase());
            expect(recentLower).not.toContain(colors[0].toLowerCase());
            expect(recentLower).not.toContain(colors[1].toLowerCase());
            
            // Last 5 colors should be in the list
            for (let i = 2; i < 7; i++) {
              expect(recentLower).toContain(colors[i].toLowerCase());
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Hex color validation', () => {
    it('accepts valid 6-character hex colors', () => {
      fc.assert(
        fc.property(
          hexColorArb,
          (color) => {
            expect(RecentColorsManager.isValidHex(color)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('normalizes 3-character hex to 6-character', () => {
      const testCases = [
        ['#abc', '#aabbcc'],
        ['#ABC', '#aabbcc'],
        ['abc', '#aabbcc'],
        ['#123', '#112233'],
        ['fff', '#ffffff']
      ];
      
      testCases.forEach(([input, expected]) => {
        expect(RecentColorsManager.normalizeHex(input)).toBe(expected);
      });
    });

    it('rejects invalid hex colors', () => {
      const invalidColors = [
        '',
        null,
        undefined,
        'not-a-color',
        '#gg0000',
        '#12345',
        '#1234567',
        'rgb(255,0,0)'
      ];
      
      invalidColors.forEach(color => {
        expect(RecentColorsManager.isValidHex(color)).toBe(false);
      });
    });
  });

  describe('localStorage persistence', () => {
    it('persists colors to localStorage', () => {
      RecentColorsManager.addColor('#ff0000');
      RecentColorsManager.addColor('#00ff00');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      const stored = JSON.parse(mockLocalStorage._store.get('sankeymatic-recent-colors'));
      expect(stored).toContain('#ff0000');
      expect(stored).toContain('#00ff00');
    });

    it('loads colors from localStorage', () => {
      mockLocalStorage._store.set('sankeymatic-recent-colors', JSON.stringify(['#ff0000', '#00ff00']));
      
      const colors = RecentColorsManager.getRecentColors();
      expect(colors).toContain('#ff0000');
      expect(colors).toContain('#00ff00');
    });

    it('handles corrupted localStorage gracefully', () => {
      mockLocalStorage._store.set('sankeymatic-recent-colors', 'not-valid-json');
      
      const colors = RecentColorsManager.getRecentColors();
      expect(colors).toEqual([]);
    });
  });

  describe('clear functionality', () => {
    it('removes all colors', () => {
      RecentColorsManager.addColor('#ff0000');
      RecentColorsManager.addColor('#00ff00');
      
      expect(RecentColorsManager.getCount()).toBe(2);
      
      RecentColorsManager.clear();
      
      expect(RecentColorsManager.getCount()).toBe(0);
      expect(RecentColorsManager.getRecentColors()).toEqual([]);
    });
  });

  describe('removeColor', () => {
    it('removes specific color from list', () => {
      RecentColorsManager.addColor('#ff0000');
      RecentColorsManager.addColor('#00ff00');
      RecentColorsManager.addColor('#0000ff');
      
      const removed = RecentColorsManager.removeColor('#00ff00');
      
      expect(removed).toBe(true);
      expect(RecentColorsManager.getCount()).toBe(2);
      expect(RecentColorsManager.getRecentColors()).not.toContain('#00ff00');
    });

    it('returns false when color not in list', () => {
      RecentColorsManager.addColor('#ff0000');
      
      const removed = RecentColorsManager.removeColor('#00ff00');
      
      expect(removed).toBe(false);
      expect(RecentColorsManager.getCount()).toBe(1);
    });
  });
});
