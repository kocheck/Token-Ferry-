// ── Sketch Swatches Reader ──────────────────────────────────────────────────
// Reads all Color Variables (Swatches) from the current Sketch document.
// Equivalent to variables-reader.ts in the Figma plugin.

import sketch from 'sketch/dom';
import type { SwatchGroupInfo, SwatchData } from './types';
import { sketchColorToHex } from './types';

/**
 * Returns metadata for all swatch groups in the current document.
 * Groups are derived from the first segment of slash-separated swatch names.
 */
export function getSwatchGroups(): SwatchGroupInfo[] {
  const document = sketch.getSelectedDocument();
  if (!document) return [];

  const swatches = document.swatches;
  const groupMap = new Map<string, { id: string; count: number }>();

  for (const swatch of swatches) {
    const groupName = getGroupName(swatch.name);
    const existing = groupMap.get(groupName);
    if (existing) {
      existing.count++;
    } else {
      groupMap.set(groupName, { id: swatch.id, count: 1 });
    }
  }

  const groups: SwatchGroupInfo[] = [];
  for (const [name, { id, count }] of groupMap) {
    groups.push({ id, name, swatchCount: count });
  }

  return groups;
}

/**
 * Reads all swatches from the specified groups.
 * If groupNames is empty, reads all swatches.
 */
export function readSwatches(groupNames: string[]): SwatchData[] {
  const document = sketch.getSelectedDocument();
  if (!document) return [];

  const groupSet = new Set(groupNames);
  const swatches = document.swatches;
  const results: SwatchData[] = [];

  for (const swatch of swatches) {
    const groupName = getGroupName(swatch.name);
    if (groupNames.length > 0 && !groupSet.has(groupName)) continue;

    // Swatch name in Sketch uses "/" hierarchy just like Figma variables.
    // The first segment is the group name. Remaining segments form the name.
    const nameParts = swatch.name.split('/');
    const name = nameParts.length > 1 ? nameParts.slice(1).join('/') : swatch.name;

    results.push({
      id: swatch.id,
      name,
      hexValue: sketchColorToHex(swatch.color),
      groupName,
    });
  }

  return results;
}

/**
 * Extract the group name (first segment) from a slash-separated swatch name.
 */
function getGroupName(name: string): string {
  const slashIdx = name.indexOf('/');
  return slashIdx !== -1 ? name.substring(0, slashIdx) : name;
}
