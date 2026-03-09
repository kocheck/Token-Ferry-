// ── Re-export shared types ──────────────────────────────────────────────────
export * from '../shared/types';

// ── Figma-specific imports ──────────────────────────────────────────────────
import type { DTCGType, GitHubSettings, PullPreview } from '../shared/types';

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
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  description: string;
  collectionName: string;
  collectionId: string;
  /** Values keyed by mode name. Each is either a raw value or an alias ref string "{path}" */
  valuesByMode: Record<string, ResolvedValue>;
}

export type ResolvedValue =
  | { kind: 'raw'; value: string | number | boolean }
  | { kind: 'alias'; refPath: string }; // refPath = DTCG path "collection.group.token"

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
  | { type: 'settings'; data: GitHubSettings }
  | { type: 'collections'; data: CollectionInfo[] }
  | { type: 'push-data'; data: { json: string; collections: string[] } }
  | { type: 'pull-preview'; data: PullPreview }
  | { type: 'status'; message: string; level: 'info' | 'error' | 'success' }
  | { type: 'visualize-complete' };

/** Messages sent from the UI to the plugin sandbox */
export type UIToSandboxMessage =
  | { type: 'save-settings'; data: GitHubSettings }
  | { type: 'load-settings' }
  | { type: 'get-collections' }
  | { type: 'prepare-push'; collectionIds: string[] }
  | { type: 'push-complete'; prUrl: string }
  | { type: 'pull-data'; json: string }
  | { type: 'apply-pull' }
  | { type: 'visualize'; collectionIds: string[] };

// ── Figma Type Guards ───────────────────────────────────────────────────────

export function isVariableAlias(
  value: unknown
): value is { type: 'VARIABLE_ALIAS'; id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: string }).type === 'VARIABLE_ALIAS'
  );
}

// ── Figma Type ↔ DTCG Type Mapping ─────────────────────────────────────────

const FIGMA_TO_DTCG: Record<string, DTCGType> = {
  COLOR: 'color',
  FLOAT: 'number',
  STRING: 'string',
  BOOLEAN: 'boolean',
};

const DTCG_TO_FIGMA: Record<DTCGType, string> = {
  color: 'COLOR',
  number: 'FLOAT',
  string: 'STRING',
  boolean: 'BOOLEAN',
};

export function figmaTypeToDTCG(
  figmaType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
): DTCGType {
  return FIGMA_TO_DTCG[figmaType];
}

export function dtcgTypeToFigma(
  dtcgType: DTCGType
): 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' {
  return DTCG_TO_FIGMA[dtcgType] as 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
}
