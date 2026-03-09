import { DTCGGroup, ParsedToken, isDTCGToken, isAliasRef, extractAliasPath } from './types';

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Walk a DTCG-compatible JSON tree and return a flat list of ParsedTokens.
 *
 * Each token's `path` is the dot-separated key path from the root.
 * The first segment of the path is treated as the collection name (`group`).
 * The remaining segments, joined with "/", form the variable `name`.
 */
export function parseDTCGJson(json: DTCGGroup): ParsedToken[] {
  const results: ParsedToken[] = [];
  walk(json, [], results);
  return results;
}

// ── Recursive walker ────────────────────────────────────────────────────────

function walk(
  node: DTCGGroup,
  segments: string[],
  out: ParsedToken[],
): void {
  for (const key of Object.keys(node)) {
    // Skip DTCG meta keys that live on groups themselves
    if (key.startsWith('$')) continue;

    const child = node[key];

    if (isDTCGToken(child)) {
      const path = [...segments, key].join('.');
      const collection = segments[0] ?? key;
      const nameParts = [...segments.slice(1), key];
      const name = nameParts.join('/');

      const alias = isAliasRef(child.$value);
      const extensions = child.$extensions;
      // Modes are stored under the Figma extension namespace; Sketch tokens don't use modes
      const modes = extensions?.['com.figma']?.modes;

      const token: ParsedToken = {
        path,
        name,
        group: collection,
        type: child.$type,
        value: child.$value,
        description: child.$description,
        isAlias: alias,
        aliasPath: alias ? extractAliasPath(child.$value as string) : undefined,
        extensions,
        modes,
      };

      out.push(token);
    } else if (typeof child === 'object' && child !== null) {
      // It's a nested group — recurse
      walk(child as DTCGGroup, [...segments, key], out);
    }
  }
}
