// ── Sketch Settings Storage Module ──────────────────────────────────────────
// Uses sketch/settings for persistent plugin-scoped storage.
// Equivalent to Figma's figma.clientStorage.

import Settings from 'sketch/settings';
import type { GitHubSettings } from './types';

const STORAGE_KEY = 'github-settings';

/**
 * Load previously saved GitHub settings from Sketch plugin settings.
 * Returns null if no settings have been saved yet.
 */
export function loadSettings(): GitHubSettings | null {
  const data = Settings.settingForKey(STORAGE_KEY);
  if (!data || typeof data !== 'object') return null;

  const d = data as Record<string, unknown>;
  if (typeof d.owner !== 'string' || typeof d.repo !== 'string' || typeof d.pat !== 'string') {
    return null;
  }

  return data as GitHubSettings;
}

/**
 * Persist GitHub settings to Sketch plugin settings.
 */
export function saveSettings(settings: GitHubSettings): void {
  Settings.setSettingForKey(STORAGE_KEY, settings);
}
