import {
  CollectionInfo,
  VariableData,
  ResolvedValue,
  isVariableAlias,
  rgbaToHex,
} from "./types";

// ── Figma Plugin API type shims (provided globally by the sandbox) ────────

interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  variableIds: string[];
}

interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: string;
  description: string;
  variableCollectionId: string;
  valuesByMode: Record<string, unknown>;
}

declare const figma: {
  variables: {
    getLocalVariableCollectionsAsync(): Promise<FigmaVariableCollection[]>;
    getLocalVariablesAsync(): Promise<FigmaVariable[]>;
    getVariableByIdAsync(id: string): Promise<FigmaVariable | null>;
  };
};

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns metadata for all local variable collections.
 */
export async function getCollections(): Promise<CollectionInfo[]> {
  const collections =
    await figma.variables.getLocalVariableCollectionsAsync();

  return collections.map((c) => ({
    id: c.id,
    name: c.name,
    modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    variableCount: c.variableIds.length,
  }));
}

/**
 * Reads all variables from the selected collections, resolving aliases
 * and converting raw values to their DTCG-friendly representations.
 */
export async function readVariables(
  collectionIds: string[]
): Promise<VariableData[]> {
  const collectionIdSet = new Set(collectionIds);

  // Fetch collection metadata for mode-name lookups
  const allCollections =
    await figma.variables.getLocalVariableCollectionsAsync();

  const collectionsById = new Map<string, FigmaVariableCollection>(
    allCollections.map((c) => [c.id, c])
  );

  // Build a mode-id → mode-name map across selected collections
  const modeNameMap = new Map<string, string>();
  for (const col of allCollections) {
    if (!collectionIdSet.has(col.id)) continue;
    for (const mode of col.modes) {
      modeNameMap.set(mode.modeId, mode.name);
    }
  }

  // Fetch all local variables and filter to selected collections
  const allVariables = await figma.variables.getLocalVariablesAsync();
  const variablesById = new Map<string, FigmaVariable>(
    allVariables.map((v) => [v.id, v])
  );
  const filtered = allVariables.filter((v) =>
    collectionIdSet.has(v.variableCollectionId)
  );

  const results: VariableData[] = [];

  for (const variable of filtered) {
    const collection = collectionsById.get(variable.variableCollectionId);
    if (!collection) continue;

    const valuesByMode: Record<string, ResolvedValue> = {};

    for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
      const modeName = modeNameMap.get(modeId) ?? modeId;

      if (isVariableAlias(value)) {
        const targetVar = variablesById.get(value.id) ?? null;

        if (targetVar) {
          const targetCollection = collectionsById.get(
            targetVar.variableCollectionId
          );
          const targetCollectionName =
            targetCollection?.name ?? targetVar.variableCollectionId;

          // Build DTCG reference: {collectionName.group.token}
          // Target variable name uses "/" separators — convert to "."
          const targetPath = targetVar.name.replace(/\//g, ".");
          const refPath = `{${targetCollectionName}.${targetPath}}`;

          valuesByMode[modeName] = { kind: "alias", refPath };
        } else {
          // Target variable not found — store as raw placeholder
          valuesByMode[modeName] = {
            kind: "raw",
            value: `<unresolved alias: ${value.id}>`,
          };
        }
      } else {
        // Raw value — convert based on resolved type
        valuesByMode[modeName] = resolveRawValue(
          variable.resolvedType,
          value
        );
      }
    }

    results.push({
      id: variable.id,
      name: variable.name,
      resolvedType: variable.resolvedType as VariableData["resolvedType"],
      description: variable.description,
      collectionName: collection.name,
      collectionId: collection.id,
      valuesByMode,
    });
  }

  return results;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Converts a raw Figma variable value into a ResolvedValue.
 */
function resolveRawValue(
  resolvedType: string,
  value: unknown
): ResolvedValue {
  if (resolvedType === "COLOR") {
    const color = value as { r: number; g: number; b: number; a: number };
    return { kind: "raw", value: rgbaToHex(color) };
  }

  // FLOAT, STRING, BOOLEAN — use the value directly
  return { kind: "raw", value: value as string | number | boolean };
}
