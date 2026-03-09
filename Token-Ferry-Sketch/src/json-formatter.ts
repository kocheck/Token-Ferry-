// ── DTCG JSON Formatter ──────────────────────────────────────────────────────
// Converts SwatchData (Sketch) into a nested DTCG-compatible JSON object.
// Comparable to the Figma version but works with Sketch's flat swatch model.

import { SwatchData, DTCGGroup, DTCGToken } from './types';

/**
 * Converts an array of SwatchData into a nested DTCG-compatible JSON object.
 *
 * Swatches are grouped by their group name (first path segment) at the top
 * level, then nested according to their slash-separated names.
 */
export function formatToDTCG(swatches: SwatchData[]): DTCGGroup {
  const root: DTCGGroup = {};

  for (const swatch of swatches) {
    const token: DTCGToken = {
      $type: 'color',
      $value: swatch.hexValue,
    };

    if (swatch.description) {
      token.$description = swatch.description;
    }

    token.$extensions = {
      'com.sketch': {
        swatchId: swatch.id,
        group: swatch.groupName,
      },
    };

    // Build the full path: groupName / name segments
    const nameParts = swatch.name.split('/');
    const fullPath = [swatch.groupName, ...nameParts];

    setNestedValue(root, fullPath, token);
  }

  return root;
}

/**
 * Recursively creates nested objects along the given path and sets
 * the leaf to the provided value.
 */
function setNestedValue(
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
