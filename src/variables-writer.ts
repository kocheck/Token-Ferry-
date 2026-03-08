import { ParsedToken, PullPreview, PullPreviewItem, dtcgTypeToFigma, hexToRgba } from './types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const ALIAS_RE = /^\{(.+)\}$/;

function isAliasString(v: unknown): v is string {
  return typeof v === 'string' && ALIAS_RE.test(v);
}

function extractAlias(v: string): string {
  return v.match(ALIAS_RE)![1];
}

function stringifyValue(v: unknown): string {
  if (typeof v === 'object' && v !== null) {
    return JSON.stringify(v);
  }
  return String(v);
}

// ── Pull Preview ────────────────────────────────────────────────────────────

export async function generatePullPreview(tokens: ParsedToken[]): Promise<PullPreview> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();

  // Build lookup: "collectionName::variableName" → Variable
  const collectionIdToName = new Map<string, string>();
  for (const c of collections) {
    collectionIdToName.set(c.id, c.name);
  }

  const existingMap = new Map<string, Variable>();
  for (const v of variables) {
    const colName = collectionIdToName.get(v.variableCollectionId) ?? '';
    existingMap.set(`${colName}::${v.name}`, v);
  }

  const items: PullPreviewItem[] = [];
  const summary = { create: 0, update: 0, unchanged: 0 };

  for (const token of tokens) {
    const key = `${token.group}::${token.name}`;
    const existing = existingMap.get(key);
    const newVal = stringifyValue(token.value);

    let action: PullPreviewItem['action'];
    let currentValue: string | undefined;

    if (!existing) {
      action = 'create';
    } else {
      // Compare first mode value
      const modeIds = Object.keys(existing.valuesByMode);
      const curRaw = modeIds.length > 0 ? existing.valuesByMode[modeIds[0]] : undefined;
      currentValue = curRaw !== undefined ? stringifyValue(curRaw) : undefined;
      action = currentValue !== newVal ? 'update' : 'unchanged';
    }

    summary[action]++;
    items.push({ path: token.path, type: token.type, action, currentValue, newValue: newVal });
  }

  return { items, summary };
}

// ── Apply Tokens (two-pass) ─────────────────────────────────────────────────

export async function applyTokens(tokens: ParsedToken[]): Promise<void> {
  // Group tokens by collection (first path segment)
  const byCollection = new Map<string, ParsedToken[]>();
  for (const t of tokens) {
    const list = byCollection.get(t.group) ?? [];
    list.push(t);
    byCollection.set(t.group, list);
  }

  const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const existingVariables = await figma.variables.getLocalVariablesAsync();

  // Lookup helpers
  const collectionsByName = new Map<string, VariableCollection>();
  for (const c of existingCollections) {
    collectionsByName.set(c.name, c);
  }

  const variablesByCollectionAndName = new Map<string, Variable>();
  const collectionIdToName = new Map<string, string>();
  for (const c of existingCollections) {
    collectionIdToName.set(c.id, c.name);
  }
  for (const v of existingVariables) {
    const colName = collectionIdToName.get(v.variableCollectionId) ?? '';
    variablesByCollectionAndName.set(`${colName}::${v.name}`, v);
  }

  // Map of dtcg path → Variable (for alias resolution in pass 2)
  const variableMap = new Map<string, Variable>();

  // ── Pass 1: create infrastructure + set raw values ────────────────────────

  for (const [collectionName, collectionTokens] of byCollection) {
    // Find or create collection
    let collection = collectionsByName.get(collectionName);
    if (!collection) {
      collection = figma.variables.createVariableCollection(collectionName);
      collectionsByName.set(collectionName, collection);
    }

    // Handle modes from tokens' extensions
    const existingModes = new Map<string, string>();
    for (const m of collection.modes) {
      existingModes.set(m.name, m.modeId);
    }

    // Collect all mode names referenced by tokens in this collection
    const requiredModes = new Set<string>();
    for (const t of collectionTokens) {
      if (t.modes) {
        for (const modeName of Object.keys(t.modes)) {
          requiredModes.add(modeName);
        }
      }
    }

    // Create missing modes
    for (const modeName of requiredModes) {
      if (!existingModes.has(modeName)) {
        const newModeId = collection.addMode(modeName);
        existingModes.set(modeName, newModeId);
      }
    }

    // Default mode id (first mode)
    const defaultModeId = collection.modes[0].modeId;

    // Create or find variables and set raw values
    for (const token of collectionTokens) {
      const resolvedType = dtcgTypeToFigma(token.type);
      const key = `${collectionName}::${token.name}`;

      let variable = variablesByCollectionAndName.get(key);
      if (!variable) {
        variable = figma.variables.createVariable(token.name, collection, resolvedType);
        variablesByCollectionAndName.set(key, variable);
      }

      if (token.description !== undefined) {
        variable.description = token.description;
      }

      // Store for alias resolution
      variableMap.set(token.path, variable);

      // Set raw value on default mode (skip aliases — handled in pass 2)
      if (!token.isAlias) {
        const rawValue = resolveRawValue(token.type, token.value);
        variable.setValueForMode(defaultModeId, rawValue);
      }

      // Set per-mode raw values (skip alias values — handled in pass 2)
      if (token.modes) {
        for (const [modeName, modeValue] of Object.entries(token.modes)) {
          const modeId = existingModes.get(modeName);
          if (!modeId) continue;
          if (isAliasString(modeValue)) continue; // deferred to pass 2
          const rawModeVal = resolveRawValue(token.type, modeValue);
          variable.setValueForMode(modeId, rawModeVal);
        }
      }
    }
  }

  // ── Pass 2: set alias bindings ────────────────────────────────────────────

  for (const token of tokens) {
    const variable = variableMap.get(token.path);
    if (!variable) continue;

    const collection = collectionsByName.get(token.group);
    if (!collection) continue;

    const modeMap = new Map<string, string>();
    for (const m of collection.modes) {
      modeMap.set(m.name, m.modeId);
    }
    const defaultModeId = collection.modes[0].modeId;

    // Default value alias
    if (token.isAlias && token.aliasPath) {
      const target = variableMap.get(token.aliasPath);
      if (target) {
        const alias = figma.variables.createVariableAlias(target);
        variable.setValueForMode(defaultModeId, alias);
      }
    }

    // Per-mode aliases
    if (token.modes) {
      for (const [modeName, modeValue] of Object.entries(token.modes)) {
        if (!isAliasString(modeValue)) continue;
        const modeId = modeMap.get(modeName);
        if (!modeId) continue;
        const aliasPath = extractAlias(modeValue);
        const target = variableMap.get(aliasPath);
        if (target) {
          const alias = figma.variables.createVariableAlias(target);
          variable.setValueForMode(modeId, alias);
        }
      }
    }
  }
}

// ── Value conversion ────────────────────────────────────────────────────────

function resolveRawValue(
  type: string,
  value: string | number | boolean,
): VariableValue {
  if (type === 'color' && typeof value === 'string') {
    return hexToRgba(value);
  }
  return value as VariableValue;
}
