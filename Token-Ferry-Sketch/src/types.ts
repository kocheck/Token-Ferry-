// ── Re-export shared types ──────────────────────────────────────────────────
export * from '../../shared/types';

// ── Sketch-specific imports ─────────────────────────────────────────────────
import type { GitHubSettings, PullPreview } from '../../shared/types';

// ── Swatch / Collection Metadata ────────────────────────────────────────────
// In Sketch, swatches use hierarchical naming (e.g., "brand/primary/500")
// and there are no "collections" with modes like Figma. We group by top-level
// name segment to maintain compatibility with the DTCG structure.

export interface SwatchGroupInfo {
  id: string; // synthetic: first swatch objectID in the group
  name: string; // group prefix (e.g., "brand")
  swatchCount: number;
}

export interface SwatchData {
  id: string;
  name: string; // full slash-separated name, e.g. "brand/primary/500"
  hexValue: string;
  groupName: string; // first segment of name
  description?: string;
}

// ── Canvas Visualization ────────────────────────────────────────────────────

export interface CardData {
  swatchId: string;
  name: string;
  hexValue: string;
  rgbaColor: { r: number; g: number; b: number; a: number };
  contrastOnWhite: number;
  contrastOnBlack: number;
  aliasOf?: string; // if this is an alias, the DTCG path of the target
  groupName: string;
}

// ── Message Protocol (WebView ↔ Plugin) ─────────────────────────────────────

export type PluginToWebViewMessage =
  | { type: 'settings'; data: GitHubSettings }
  | { type: 'swatch-groups'; data: SwatchGroupInfo[] }
  | { type: 'push-data'; data: { json: string; groups: string[] } }
  | { type: 'pull-preview'; data: PullPreview }
  | { type: 'status'; message: string; level: 'info' | 'error' | 'success' }
  | { type: 'visualize-complete' };

export type WebViewToPluginMessage =
  | { type: 'save-settings'; data: GitHubSettings }
  | { type: 'load-settings' }
  | { type: 'get-swatch-groups' }
  | { type: 'prepare-push'; groupNames: string[] }
  | { type: 'push-complete'; prUrl: string }
  | { type: 'pull-data'; json: string }
  | { type: 'apply-pull' }
  | { type: 'visualize'; groupNames: string[] };

// ── Sketch Color Helpers ────────────────────────────────────────────────────

/**
 * Convert a hex color string to a Sketch-compatible color string.
 * Sketch uses hex format "#RRGGBBAA" (note alpha at the end, FF if opaque).
 */
export function hexToSketchColor(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  if (clean.length === 6) return `#${clean}FF`;
  if (clean.length === 8) return `#${clean}`;
  return `#${clean.padEnd(8, 'F')}`;
}

/**
 * Convert a Sketch color string "#RRGGBBAA" to standard hex "#RRGGBB" or "#RRGGBBAA".
 */
export function sketchColorToHex(sketchColor: string): string {
  const clean = sketchColor.replace('#', '').toUpperCase();
  if (clean.length >= 8 && clean.substring(6, 8) === 'FF') {
    return `#${clean.substring(0, 6)}`;
  }
  return `#${clean}`;
}
