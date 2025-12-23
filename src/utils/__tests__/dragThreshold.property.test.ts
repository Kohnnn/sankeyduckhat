/**
 * Property Test: Click vs Drag Threshold
 * Feature: react-migration, Property 3: Click vs Drag Threshold
 * Validates: Requirements 4.5
 * 
 * *For any* drag event where the total movement distance (sqrt(dx² + dy²)) is less than 5 pixels,
 * the system should treat it as a click event (selecting the node) rather than a drag event (moving the node).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  isDragThresholdMet, 
  calculateDistance, 
  DRAG_THRESHOLD_PIXELS,
  Point 
} from '../dragThreshold';

// ============================================================================
// Generators (Arbitraries)
// ============================================================================

const arbitraryPoint = (): fc.Arbitrary<Point> =>
  fc.record({
    x: fc.float({ min: Math.fround(-10000), max: Math.fround(10000), noNaN: true }),
    y: fc.float({ min: Math.fround(-10000), max: Math.fround(10000), noNaN: true }),
  });

// Generator for small movements (less than threshold)
const arbitrarySmallMovement = (): fc.Arbitrary<{ start: Point; end: Point }> =>
  fc.record({
    start: arbitraryPoint(),
  }).chain(({ start }) => {
    // Generate an end point that is less than 5 pixels away
    const maxOffset = Math.fround(DRAG_THRESHOLD_PIXELS - 0.001); // Just under threshold
    return fc.record({
      start: fc.constant(start),
      end: fc.record({
        // Use polar coordinates to ensure distance < threshold
        x: fc.float({ min: Math.fround(-maxOffset), max: Math.fround(maxOffset), noNaN: true }).map(dx => start.x + dx * 0.7), // Scale to ensure within threshold
        y: fc.float({ min: Math.fround(-maxOffset), max: Math.fround(maxOffset), noNaN: true }).map(dy => start.y + dy * 0.7),
      }),
    });
  });

// Generator for large movements (at or above threshold)
const arbitraryLargeMovement = (): fc.Arbitrary<{ start: Point; end: Point }> =>
  fc.record({
    start: arbitraryPoint(),
    // Generate offset that ensures distance >= threshold
    angle: fc.float({ min: Math.fround(0), max: Math.fround(2 * Math.PI), noNaN: true }),
    distance: fc.float({ min: Math.fround(DRAG_THRESHOLD_PIXELS), max: Math.fround(1000), noNaN: true }),
  }).map(({ start, angle, distance }) => ({
    start,
    end: {
      x: start.x + Math.cos(angle) * distance,
      y: start.y + Math.sin(angle) * distance,
    },
  }));

// ============================================================================
// Property 3: Click vs Drag Threshold
// Feature: react-migration, Property 3: Click vs Drag Threshold
// Validates: Requirements 4.5
// ============================================================================

describe('Feature: react-migration, Property 3: Click vs Drag Threshold', () => {
  it('*For any* movement less than 5 pixels, isDragThresholdMet should return false (treat as click)', () => {
    fc.assert(
      fc.property(
        arbitrarySmallMovement(),
        ({ start, end }) => {
          const distance = calculateDistance(start, end);
          
          // Only test if distance is actually less than threshold
          if (distance >= DRAG_THRESHOLD_PIXELS) {
            return true; // Skip this case
          }
          
          const result = isDragThresholdMet(start, end);
          return result === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('*For any* movement of exactly 5 pixels or more, isDragThresholdMet should return true (treat as drag)', () => {
    fc.assert(
      fc.property(
        arbitraryLargeMovement(),
        ({ start, end }) => {
          const distance = calculateDistance(start, end);
          
          // Verify distance is at or above threshold
          if (distance < DRAG_THRESHOLD_PIXELS) {
            return true; // Skip edge cases due to floating point
          }
          
          const result = isDragThresholdMet(start, end);
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateDistance should return the correct Euclidean distance', () => {
    fc.assert(
      fc.property(
        arbitraryPoint(),
        arbitraryPoint(),
        (start, end) => {
          const distance = calculateDistance(start, end);
          const expectedDistance = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          );
          
          // Allow small floating point tolerance
          return Math.abs(distance - expectedDistance) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateDistance should be symmetric (distance from A to B equals distance from B to A)', () => {
    fc.assert(
      fc.property(
        arbitraryPoint(),
        arbitraryPoint(),
        (pointA, pointB) => {
          const distanceAB = calculateDistance(pointA, pointB);
          const distanceBA = calculateDistance(pointB, pointA);
          
          // Allow small floating point tolerance
          return Math.abs(distanceAB - distanceBA) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateDistance from a point to itself should be zero', () => {
    fc.assert(
      fc.property(
        arbitraryPoint(),
        (point) => {
          const distance = calculateDistance(point, point);
          return distance === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the threshold boundary should be exactly 5 pixels', () => {
    // Test exact boundary cases
    const start: Point = { x: 0, y: 0 };
    
    // Just under threshold (4.99 pixels)
    const justUnder: Point = { x: 4.99, y: 0 };
    expect(isDragThresholdMet(start, justUnder)).toBe(false);
    
    // Exactly at threshold (5 pixels)
    const exactlyAt: Point = { x: 5, y: 0 };
    expect(isDragThresholdMet(start, exactlyAt)).toBe(true);
    
    // Just over threshold (5.01 pixels)
    const justOver: Point = { x: 5.01, y: 0 };
    expect(isDragThresholdMet(start, justOver)).toBe(true);
  });

  it('diagonal movements should use Euclidean distance, not Manhattan distance', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }),
        (offset) => {
          const start: Point = { x: 0, y: 0 };
          
          // A diagonal movement where Manhattan distance would be 2*offset
          // but Euclidean distance is sqrt(2)*offset
          const end: Point = { x: offset, y: offset };
          
          const euclideanDistance = Math.sqrt(2) * offset;
          const calculatedDistance = calculateDistance(start, end);
          
          // Verify we're using Euclidean distance
          return Math.abs(calculatedDistance - euclideanDistance) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });
});
