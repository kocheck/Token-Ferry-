// ── GitHub REST API Module ──────────────────────────────────────────────────
// Runs in the WebView context in Sketch. Uses fetch (available in WebView).
// Structurally identical to the Figma version — the WebView has browser APIs.

import type { GitHubSettings } from './types';

// ── Types ───────────────────────────────────────────────────────────────────

interface FileContentResponse {
  content: string;
  sha: string;
}

interface PullRequestResponse {
  url: string;
  number: number;
}

// ── Internal Helper ─────────────────────────────────────────────────────────

const API_BASE = 'https://api.github.com';

async function githubFetch(
  config: GitHubSettings,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: Record<string, unknown>,
): Promise<Response> {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Authorization': `token ${config.pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Network error: unable to reach GitHub. Check your connection.');
  }

  if (response.status === 401) {
    throw new Error('Invalid PAT: GitHub returned 401 Unauthorized.');
  }
  if (response.status === 404) {
    throw new Error('Repository not found: check owner and repo name.');
  }
  if (response.status === 422) {
    throw new Error('Branch already exists or validation error.');
  }

  return response;
}

// ── Exported Functions ──────────────────────────────────────────────────────

/**
 * Get the SHA of a branch tip (defaults to baseBranch from config).
 */
export async function getBaseSha(
  config: GitHubSettings,
  branchName?: string,
): Promise<string> {
  const branch = branchName ?? config.baseBranch;
  const response = await githubFetch(config, `/git/ref/heads/${branch}`);

  if (!response.ok) {
    throw new Error(
      `Failed to get SHA for branch "${branch}": ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { object: { sha: string } };
  return data.object.sha;
}

/**
 * Create a new branch from a base SHA.
 */
export async function createBranch(
  config: GitHubSettings,
  branchName: string,
  baseSha: string,
): Promise<void> {
  const response = await githubFetch(config, '/git/refs', 'POST', {
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create branch "${branchName}": ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Get file content and SHA from the repo. Returns null if the file does not exist.
 */
export async function getFileContent(
  config: GitHubSettings,
  path: string,
  ref?: string,
): Promise<FileContentResponse | null> {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const url = `/contents/${path}${query}`;

  let response: Response;
  try {
    response = await githubFetch(config, url);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return null;
    }
    throw err;
  }

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { content: string; sha: string };
  return { content: data.content, sha: data.sha };
}

/**
 * Create or update a file in the repo.
 */
export async function commitFile(
  config: GitHubSettings,
  branch: string,
  path: string,
  content: string,
  message: string,
  existingSha?: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  };

  if (existingSha) {
    body.sha = existingSha;
  }

  const response = await githubFetch(config, `/contents/${path}`, 'PUT', body);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = (errorData as { message?: string }).message ?? response.statusText;
    throw new Error(`Failed to commit file "${path}": ${detail}`);
  }
}

/**
 * Open a pull request.
 */
export async function createPullRequest(
  config: GitHubSettings,
  head: string,
  title: string,
  body: string,
): Promise<PullRequestResponse> {
  const response = await githubFetch(config, '/pulls', 'POST', {
    title,
    body,
    head,
    base: config.baseBranch,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = (errorData as { message?: string }).message ?? response.statusText;
    throw new Error(`Failed to create pull request: ${detail}`);
  }

  const data = (await response.json()) as { html_url: string; number: number };
  return { url: data.html_url, number: data.number };
}

/**
 * Generate a timestamped branch name.
 */
export function generateBranchName(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');

  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');

  return `tokens/update-${stamp}`;
}

/**
 * Generate a markdown PR body listing the synced groups.
 */
export function generatePRBody(groupNames: string[]): string {
  const list = groupNames.map((name) => `- **${name}**`).join('\n');

  return [
    '## Token Ferry Sync',
    '',
    'This PR was automatically created by the **Token Ferry** Sketch plugin.',
    '',
    '### Swatch groups synced',
    list,
    '',
    '---',
    '_Review the token JSON and merge when ready._',
  ].join('\n');
}
