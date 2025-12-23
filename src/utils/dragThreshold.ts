/**
 * Drag Threshold Utility
 * 
 * Provides functions to determine if a mouse movement should be treated
 * as a drag operation or a click. This prevents accidental drags when
 * the user intends to click.
 * 
 * Requirements: 4.5 - IF a user drags a node less than 5 pixels, 
 * THEN THE Sankey_Renderer SHALL treat it as a click instead of a drag
 */

/**
 * The minimum distance in pixels that must be moved for an action
 * to be considered a drag rather than a click.
 */
export const DRAG_THRESHOLD_PIXELS = 5;

/**
 * Represents a 2D point with x and y coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Calculates the Euclidean distance between two points
 * 
 * @param start - The starting point
 * @param end - The ending point
 * @returns The distance between the two points in pixels
 */
export const calculateDistance = (start: Point, end: Point): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Determines if the movement from start to end position meets the drag threshold.
 * Returns true if the distance is >= 5 pixels (should be treated as drag).
 * Returns false if the distance is < 5 pixels (should be treated as click).
 * 
 * @param start - The starting position when drag began
 * @param end - The current/ending position
 * @returns true if the movement should be treated as a drag, false for a click
 */
export const isDragThresholdMet = (start: Point, end: Point): boolean => {
  const distance = calculateDistance(start, end);
  return distance >= DRAG_THRESHOLD_PIXELS;
};
