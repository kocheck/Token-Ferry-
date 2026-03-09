import type { DTCGGroup, DTCGToken } from './types';

/**
 * Recursively creates nested objects along the given path and sets
 * the leaf to the provided value.
 *
 * Example:
 *   setNestedValue(obj, ["a", "b", "c"], token)
 *   -> obj.a.b.c = token
 */
export function setNestedValue(
  obj: DTCGGroup,
  pathParts: string[],
  value: DTCGToken,
  index = 0,
): void {
  if (index >= pathParts.length) return;

  const key = pathParts[index];

  if (index === pathParts.length - 1) {
    obj[key] = value;
    return;
  }

  // Ensure intermediate node exists and is a group (not a token)
  if (!(key in obj) || '$value' in (obj[key] as object)) {
    obj[key] = {};
  }

  setNestedValue(obj[key] as DTCGGroup, pathParts, value, index + 1);
}
