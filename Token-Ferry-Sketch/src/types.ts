// ── GitHub Settings ──────────────────────────────────────────────────────────

export interface GitHubSettings {
  owner: string;
  repo: string;
  pat: string;
  baseBranch: string;
  filePath: string;
}

// ── Swatch / Collection Metadata ─────────────────────────────────────────────
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

// ── DTCG Token Types ─────────────────────────────────────────────────────────

export type DTCGType = 'color' | 'number' | 'string' | 'boolean';

export interface DTCGToken {
  $type: DTCGType;
  $value: string | number | boolean;
  $description?: string;
  $extensions?: {
    'com.figma'?: {
      variableId: string;
      collection: string;
      aliasOf?: string;
      modes: Record<string, string | number | boolean>;
    };
    'com.sketch'?: {
      swatchId?: string;
      group?: string;
    };
  };
}

/** Nested DTCG group — either contains tokens or more groups */
export type DTCGGroup = {
  [key: string]: DTCGGroup | DTCGToken;
};

// ── Pull Preview ─────────────────────────────────────────────────────────────

export interface PullPreviewItem {
  path: string;
  type: DTCGType;
  action: 'create' | 'update' | 'unchanged';
  currentValue?: string;
  newValue: string;
}

export interface PullPreview {
  items: PullPreviewItem[];
  summary: { create: number; update: number; unchanged: number };
}

// ── Parsed Token (from JSON parser) ──────────────────────────────────────────

export interface ParsedToken {
  path: string; // dot-separated full path, e.g. "brand.color.blue-500"
  name: string; // slash-joined segments after first, e.g. "color/blue-500"
  group: string; // first segment, e.g. "brand"
  type: DTCGType;
  value: string | number | boolean;
  description?: string;
  isAlias: boolean;
  aliasPath?: string;
  figmaExtensions?: DTCGToken['$extensions'];
  modes?: Record<string, string | number | boolean>;
}

// ── Canvas Visualization ─────────────────────────────────────────────────────

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

// ── Message Protocol (WebView ↔ Plugin) ──────────────────────────────────────
// In Sketch, WebView panels communicate via postMessage / evaluateJavaScript
// rather than Figma's sandbox ↔ iframe protocol.

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

// ── Alias Helpers ────────────────────────────────────────────────────────────

const ALIAS_RE = /^\{(.+)\}$/;

export function isAliasRef(value: unknown): value is string {
  return typeof value === 'string' && ALIAS_RE.test(value);
}

export function extractAliasPath(value: string): string {
  const match = value.match(ALIAS_RE);
  return match ? match[1] : '';
}

// ── Type Guards ──────────────────────────────────────────────────────────────

export function isDTCGToken(node: unknown): node is DTCGToken {
  return (
    typeof node === 'object' &&
    node !== null &&
    '$value' in node &&
    '$type' in node
  );
}

// ── DTCG Validation ─────────────────────────────────────────────────────────

export function validateDTCGDocument(data: unknown): data is DTCGGroup {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

// ── Color Helpers ────────────────────────────────────────────────────────────

export function hexToRgba(hex: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const a = clean.length === 8 ? parseInt(clean.substring(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function rgbaToHex(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  let hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  if (color.a < 1) {
    hex += Math.round(color.a * 255)
      .toString(16)
      .padStart(2, '0');
  }
  return hex.toUpperCase();
}

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
