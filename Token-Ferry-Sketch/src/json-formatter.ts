// ── DTCG JSON Formatter ──────────────────────────────────────────────────────
// Converts SwatchData (Sketch) into a nested DTCG-compatible JSON object.
// Comparable to the Figma version but works with Sketch's flat swatch model.

import { SwatchData, DTCGGroup, DTCGToken } from './types';
import { setNestedValue } from '../../shared/json-formatter-utils';

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

