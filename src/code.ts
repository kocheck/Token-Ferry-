// ── Token Ferry – Plugin Entry Point ────────────────────────────────────────
// Runs in the Figma plugin sandbox. Wires together all modules and routes
// messages between the UI iframe and the sandbox environment.

import { loadSettings, saveSettings } from './storage';
import { getCollections, readVariables } from './variables-reader';
import { formatToDTCG } from './json-formatter';
import { parseDTCGJson } from './json-parser';
import { generatePullPreview, applyTokens } from './variables-writer';
import { renderVariableCards } from './canvas-renderer';
import type { UIToSandboxMessage, SandboxToUIMessage, GitHubSettings, ParsedToken, DTCGGroup } from './types';

// ── Show UI ─────────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 380, height: 620, themeColors: true });

// ── Helpers ─────────────────────────────────────────────────────────────────

function sendToUI(msg: SandboxToUIMessage): void {
  figma.ui.postMessage(msg);
}

function sendStatus(message: string, level: 'info' | 'error' | 'success'): void {
  sendToUI({ type: 'status', message, level });
}

const DEFAULT_SETTINGS: GitHubSettings = {
  owner: '',
  repo: '',
  pat: '',
  baseBranch: 'main',
  filePath: 'tokens/design-tokens.json',
};

// ── State ───────────────────────────────────────────────────────────────────

let pendingTokens: ParsedToken[] | null = null;

// ── Message Handler ─────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg: UIToSandboxMessage) => {
  switch (msg.type) {
    case 'load-settings': {
      try {
        const settings = await loadSettings();
        sendToUI({ type: 'settings', data: settings ?? DEFAULT_SETTINGS });
      } catch (err) {
        sendStatus(`Failed to load settings: ${String(err)}`, 'error');
      }
      break;
    }

    case 'save-settings': {
      try {
        await saveSettings(msg.data);
        sendStatus('Settings saved', 'success');
      } catch (err) {
        sendStatus(`Failed to save settings: ${String(err)}`, 'error');
      }
      break;
    }

    case 'get-collections': {
      try {
        const collections = await getCollections();
        sendToUI({ type: 'collections', data: collections });
      } catch (err) {
        sendStatus(`Failed to read collections: ${String(err)}`, 'error');
      }
      break;
    }

    case 'prepare-push': {
      try {
        const variables = await readVariables(msg.collectionIds);
        const dtcgObj = formatToDTCG(variables);
        const json = JSON.stringify(dtcgObj, null, 2);

        const allCollections = await getCollections();
        const selectedIds = new Set(msg.collectionIds);
        const collections = allCollections
          .filter((c) => selectedIds.has(c.id))
          .map((c) => c.name);

        sendToUI({ type: 'push-data', data: { json, collections } });
        sendStatus('Variables serialized, pushing to GitHub...', 'info');
      } catch (err) {
        sendStatus(`Failed to prepare push: ${String(err)}`, 'error');
      }
      break;
    }

    case 'push-complete': {
      try {
        sendStatus(`Push complete! PR: ${msg.prUrl}`, 'success');
      } catch (err) {
        sendStatus(`Error handling push complete: ${String(err)}`, 'error');
      }
      break;
    }

    case 'pull-data': {
      try {
        const parsed = JSON.parse(msg.json) as DTCGGroup;
        const tokens = parseDTCGJson(parsed);
        pendingTokens = tokens;

        const preview = await generatePullPreview(tokens);
        sendToUI({ type: 'pull-preview', data: preview });
      } catch (err) {
        sendStatus(`Failed to parse pull data: ${String(err)}`, 'error');
      }
      break;
    }

    case 'apply-pull': {
      try {
        if (!pendingTokens) {
          sendStatus('No pull data to apply. Pull tokens first.', 'error');
          break;
        }
        await applyTokens(pendingTokens);
        pendingTokens = null;
        sendStatus('Variables updated successfully!', 'success');
      } catch (err) {
        sendStatus(`Failed to apply tokens: ${String(err)}`, 'error');
      }
      break;
    }

    case 'visualize': {
      try {
        await renderVariableCards(msg.collectionIds);
        sendToUI({ type: 'visualize-complete' });
        sendStatus('Visualization rendered on canvas', 'success');
      } catch (err) {
        sendStatus(`Failed to render visualization: ${String(err)}`, 'error');
      }
      break;
    }

    default: {
      const _exhaustive: never = msg;
      sendStatus(`Unknown message type: ${(_exhaustive as { type: string }).type}`, 'error');
    }
  }
};
