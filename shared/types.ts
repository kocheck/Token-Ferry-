// ── Shared Types & Utilities ────────────────────────────────────────────────
// Platform-agnostic types and helpers used by both Figma and Sketch plugins.

// ── GitHub Settings ──────────────────────────────────────────────────────────

export interface GitHubSettings {
  owner: string;
  repo: string;
  pat: string;
  baseBranch: string;
  filePath: string;
}

// ── DTCG Token Types ────────────────────────────────────────────────────────

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

// ── Pull Preview ────────────────────────────────────────────────────────────

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

// ── Parsed Token (from JSON parser) ─────────────────────────────────────────

export interface ParsedToken {
  path: string; // dot-separated full path, e.g. "brand.color.blue-500"
  name: string; // last segment or slash-joined segments after first
  group: string; // collection/group prefix, e.g. "brand"
  type: DTCGType;
  value: string | number | boolean;
  description?: string;
  isAlias: boolean;
  aliasPath?: string; // if alias: "brand.color.blue-500"
  extensions?: DTCGToken['$extensions'];
  modes?: Record<string, string | number | boolean>;
}

// ── Alias Helpers ───────────────────────────────────────────────────────────

const ALIAS_RE = /^\{(.+)\}$/;

export function isAliasRef(value: unknown): value is string {
  return typeof value === 'string' && ALIAS_RE.test(value);
}

export function extractAliasPath(value: string): string {
  const match = value.match(ALIAS_RE);
  return match ? match[1] : '';
}

// ── Type Guards ─────────────────────────────────────────────────────────────

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

// ── Color Helpers ───────────────────────────────────────────────────────────

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
