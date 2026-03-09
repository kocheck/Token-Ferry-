// ── Figma Client Storage Module ─────────────────────────────────────────────
// Runs in the Figma plugin sandbox context. Wraps figma.clientStorage.

import type { GitHubSettings } from './types';

const STORAGE_KEY = 'github-settings';

/**
 * Load previously saved GitHub settings from Figma client storage.
 * Returns null if no settings have been saved yet.
 */
export async function loadSettings(): Promise<GitHubSettings | null> {
  const data: unknown = await figma.clientStorage.getAsync(STORAGE_KEY);

  if (!data || typeof data !== 'object') {
    return null;
  }

  const d = data as Record<string, unknown>;
  if (typeof d.owner !== 'string' || typeof d.repo !== 'string' || typeof d.pat !== 'string') {
    return null;
  }

  return data as GitHubSettings;
}

/**
 * Persist GitHub settings to Figma client storage.
 */
export async function saveSettings(settings: GitHubSettings): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEY, settings);
}
