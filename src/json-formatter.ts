import {
  VariableData,
  DTCGGroup,
  DTCGToken,
  DTCGType,
  figmaTypeToDTCG,
  ResolvedValue,
} from "./types";

/**
 * Converts an array of VariableData into a nested DTCG-compatible JSON object.
 *
 * Variables are grouped by collection name at the top level, then nested
 * according to their slash-separated names.
 */
export function formatToDTCG(variables: VariableData[]): DTCGGroup {
  const root: DTCGGroup = {};

  for (const variable of variables) {
    const dtcgType: DTCGType = figmaTypeToDTCG(variable.resolvedType);

    // Determine the default/first mode value
    const modeNames = Object.keys(variable.valuesByMode);
    const defaultModeName = modeNames[0];
    const defaultResolved: ResolvedValue | undefined =
      defaultModeName !== undefined
        ? variable.valuesByMode[defaultModeName]
        : undefined;

    const $value = resolvedToOutput(defaultResolved);

    // Build the token leaf node
    const token: DTCGToken = {
      $type: dtcgType,
      $value,
    };

    if (variable.description) {
      token.$description = variable.description;
    }

    // Build modes record for extensions
    const modesRecord: Record<string, string | number | boolean> = {};
    for (const [modeName, resolved] of Object.entries(
      variable.valuesByMode
    )) {
      modesRecord[modeName] = resolvedToOutput(resolved);
    }

    // Determine if the default value is an alias
    const aliasOf =
      defaultResolved?.kind === "alias"
        ? defaultResolved.refPath
        : undefined;

    token.$extensions = {
      "com.figma": {
        variableId: variable.id,
        collection: variable.collectionName,
        modes: modesRecord,
        ...(aliasOf !== undefined ? { aliasOf } : {}),
      },
    };

    // Build the full path: collectionName / variable name segments
    const nameParts = variable.name.split("/");
    const fullPath = [variable.collectionName, ...nameParts];

    setNestedValue(root, fullPath, token);
  }

  return root;
}

/**
 * Converts a ResolvedValue to its output representation.
 * Aliases become "{refPath}" strings; raw values pass through directly.
 */
function resolvedToOutput(
  resolved: ResolvedValue | undefined
): string | number | boolean {
  if (resolved === undefined) {
    return "";
  }
  if (resolved.kind === "alias") {
    return resolved.refPath;
  }
  return resolved.value;
}

/**
 * Recursively creates nested objects along the given path and sets
 * the leaf to the provided value.
 *
 * Example:
 *   setNestedValue(obj, ["a", "b", "c"], token)
 *   → obj.a.b.c = token
 */
function setNestedValue(
  obj: DTCGGroup,
  pathParts: string[],
  value: DTCGToken,
  index = 0
): void {
  if (index >= pathParts.length) return;

  const key = pathParts[index];

  if (index === pathParts.length - 1) {
    obj[key] = value;
    return;
  }

  // Ensure intermediate node exists and is a group (not a token)
  if (!(key in obj) || "$value" in (obj[key] as object)) {
    obj[key] = {};
  }

  setNestedValue(obj[key] as DTCGGroup, pathParts, value, index + 1);
}
