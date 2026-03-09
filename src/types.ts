// ── GitHub Settings ──────────────────────────────────────────────────────────

export interface GitHubSettings {
  owner: string;
  repo: string;
  pat: string;
  baseBranch: string;
  filePath: string;
}

// ── Collection / Variable Metadata ──────────────────────────────────────────

export interface CollectionInfo {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  variableCount: number;
}

export interface VariableData {
  id: string;
  name: string; // slash-separated, e.g. "brand/color/blue-500"
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  description: string;
  collectionName: string;
  collectionId: string;
  /** Values keyed by mode name. Each is either a raw value or an alias ref string "{path}" */
  valuesByMode: Record<string, ResolvedValue>;
}

export type ResolvedValue =
  | { kind: "raw"; value: string | number | boolean }
  | { kind: "alias"; refPath: string }; // refPath = DTCG path "collection.group.token"

// ── DTCG Token Types ────────────────────────────────────────────────────────

export type DTCGType = "color" | "number" | "string" | "boolean";

export interface DTCGToken {
  $type: DTCGType;
  $value: string | number | boolean;
  $description?: string;
  $extensions?: {
    "com.figma"?: {
      variableId: string;
      collection: string;
      aliasOf?: string;
      modes: Record<string, string | number | boolean>;
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
  action: "create" | "update" | "unchanged";
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
  name: string; // last segment, e.g. "blue-500"
  group: string; // collection/group prefix, e.g. "brand.color"
  type: DTCGType;
  value: string | number | boolean;
  description?: string;
  isAlias: boolean;
  aliasPath?: string; // if alias: "brand.color.blue-500"
  figmaExtensions?: DTCGToken["$extensions"];
  modes?: Record<string, string | number | boolean>;
}

// ── Canvas Visualization ────────────────────────────────────────────────────

export interface CardData {
  variableId: string;
  name: string;
  hexValue: string;
  rgbaColor: { r: number; g: number; b: number; a: number };
  contrastOnWhite: number;
  contrastOnBlack: number;
  aliasTargetId?: string; // if this variable aliases another
  collectionName: string;
}

// ── Message Protocol (UI ↔ Sandbox) ─────────────────────────────────────────

/** Messages sent from the plugin sandbox to the UI */
export type SandboxToUIMessage =
  | { type: "settings"; data: GitHubSettings }
  | { type: "collections"; data: CollectionInfo[] }
  | { type: "push-data"; data: { json: string; collections: string[] } }
  | { type: "pull-preview"; data: PullPreview }
  | { type: "status"; message: string; level: "info" | "error" | "success" }
  | { type: "visualize-complete" };

/** Messages sent from the UI to the plugin sandbox */
export type UIToSandboxMessage =
  | { type: "save-settings"; data: GitHubSettings }
  | { type: "load-settings" }
  | { type: "get-collections" }
  | { type: "prepare-push"; collectionIds: string[] }
  | { type: "push-complete"; prUrl: string }
  | { type: "pull-data"; json: string }
  | { type: "apply-pull" }
  | { type: "visualize"; collectionIds: string[] };

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

export function isVariableAlias(
  value: unknown
): value is { type: "VARIABLE_ALIAS"; id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as { type: string }).type === "VARIABLE_ALIAS"
  );
}

export function isDTCGToken(node: unknown): node is DTCGToken {
  return (
    typeof node === "object" &&
    node !== null &&
    "$value" in node &&
    "$type" in node
  );
}

// ── Figma Type ↔ DTCG Type Mapping ─────────────────────────────────────────

const FIGMA_TO_DTCG: Record<string, DTCGType> = {
  COLOR: "color",
  FLOAT: "number",
  STRING: "string",
  BOOLEAN: "boolean",
};

const DTCG_TO_FIGMA: Record<DTCGType, string> = {
  color: "COLOR",
  number: "FLOAT",
  string: "STRING",
  boolean: "BOOLEAN",
};

export function figmaTypeToDTCG(
  figmaType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN"
): DTCGType {
  return FIGMA_TO_DTCG[figmaType];
}

export function dtcgTypeToFigma(
  dtcgType: DTCGType
): "COLOR" | "FLOAT" | "STRING" | "BOOLEAN" {
  return DTCG_TO_FIGMA[dtcgType] as "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
}

// ── DTCG Validation ────────────────────────────────────────────────────────

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
  let hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  if (color.a < 1) {
    hex += Math.round(color.a * 255)
      .toString(16)
      .padStart(2, "0");
  }
  return hex.toUpperCase();
}

export function hexToRgba(hex: string): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const a = clean.length === 8 ? parseInt(clean.substring(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}
