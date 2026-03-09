// ── Sketch Swatches Writer ──────────────────────────────────────────────────
// Creates or updates Sketch Swatches from parsed DTCG data.
// Equivalent to variables-writer.ts in the Figma plugin.
//
// Key differences from Figma:
// - Sketch only supports color swatches (no FLOAT/STRING/BOOLEAN)
// - Sketch has no concept of "modes" — only the default value is written
// - Aliases are resolved to concrete color values (no native alias support)
// - Swatches use hierarchical "group/subgroup/name" naming

import sketch from 'sketch/dom';
import type { ParsedToken, PullPreview, PullPreviewItem } from './types';
import { isAliasRef, extractAliasPath, hexToSketchColor } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function stringifyValue(v: unknown): string {
  if (typeof v === 'object' && v !== null) {
    return JSON.stringify(v);
  }
  return String(v);
}

// ── Pull Preview ─────────────────────────────────────────────────────────────

/**
 * Generate a preview of what changes would be applied from a pull.
 */
export function generatePullPreview(tokens: ParsedToken[]): PullPreview {
  const document = sketch.getSelectedDocument();
  if (!document) throw new Error('No document open. Open a Sketch file first.');
  const existingSwatches = document.swatches;

  // Build lookup by full swatch name (group/name)
  const existingMap = new Map<string, typeof existingSwatches[0]>();
  for (const swatch of existingSwatches) {
    existingMap.set(swatch.name, swatch);
  }

  const tokensByPath = buildTokenMap(tokens);
  const items: PullPreviewItem[] = [];
  const summary = { create: 0, update: 0, unchanged: 0 };

  for (const token of tokens) {
    // Only color tokens can become swatches
    if (token.type !== 'color') continue;

    const fullName = `${token.group}/${token.name}`;
    const existing = existingMap.get(fullName);
    const newVal = stringifyValue(resolveTokenValue(token, tokensByPath));

    let action: PullPreviewItem['action'];
    let currentValue: string | undefined;

    if (!existing) {
      action = 'create';
    } else {
      currentValue = existing.color;
      action = currentValue !== newVal ? 'update' : 'unchanged';
    }

    summary[action]++;
    items.push({
      path: token.path,
      type: token.type,
      action,
      currentValue,
      newValue: newVal,
    });
  }

  return { items, summary };
}

// ── Apply Tokens ─────────────────────────────────────────────────────────────

/**
 * Apply parsed tokens as Sketch Swatches. Only color tokens are written.
 * Aliases are resolved to their concrete color values.
 */
export function applyTokens(tokens: ParsedToken[]): void {
  const document = sketch.getSelectedDocument();
  if (!document) {
    throw new Error('No document open. Open a Sketch file first.');
  }

  const tokensByPath = buildTokenMap(tokens);

  // Build existing swatch lookup
  const existingByName = new Map<string, typeof document.swatches[0]>();
  for (const swatch of document.swatches) {
    existingByName.set(swatch.name, swatch);
  }

  // Only process color tokens
  const colorTokens = tokens.filter(t => t.type === 'color');

  for (const token of colorTokens) {
    const fullName = `${token.group}/${token.name}`;
    const colorValue = resolveTokenValue(token, tokensByPath);
    const sketchColor = hexToSketchColor(String(colorValue));

    const existing = existingByName.get(fullName);
    if (existing) {
      // Update existing swatch color
      existing.color = sketchColor;
    } else {
      // Create new swatch
      const newSwatch = sketch.Swatch.from({
        name: fullName,
        color: sketchColor,
      });
      document.swatches.push(newSwatch);
    }
  }
}

// ── Value Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a token's value, following alias references to concrete values.
 * Prevents infinite loops with a depth limit.
 */
function buildTokenMap(tokens: ParsedToken[]): Map<string, ParsedToken> {
  const map = new Map<string, ParsedToken>();
  for (const token of tokens) {
    map.set(token.path, token);
  }
  return map;
}

function resolveTokenValue(
  token: ParsedToken,
  tokensByPath: Map<string, ParsedToken>,
  depth = 0,
): string | number | boolean {
  if (depth > 10) return String(token.value); // prevent infinite alias loops

  if (token.isAlias && token.aliasPath) {
    const target = tokensByPath.get(token.aliasPath);
    if (target) {
      return resolveTokenValue(target, tokensByPath, depth + 1);
    }
  }

  // For mode values that are aliases, resolve them too
  if (isAliasRef(token.value)) {
    const aliasPath = extractAliasPath(token.value as string);
    const target = tokensByPath.get(aliasPath);
    if (target) {
      return resolveTokenValue(target, tokensByPath, depth + 1);
    }
  }

  return token.value;
}
