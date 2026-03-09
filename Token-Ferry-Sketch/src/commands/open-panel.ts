// ── Open Panel Command ───────────────────────────────────────────────────────
// Opens the Token Ferry WebView panel. This is the main entry point for the
// plugin, equivalent to code.ts + figma.showUI() in the Figma version.

import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import { loadSettings, saveSettings } from '../storage';
import { getSwatchGroups, readSwatches } from '../swatches-reader';
import { formatToDTCG } from '../json-formatter';
import { parseDTCGJson } from '../../../shared/json-parser';
import { generatePullPreview, applyTokens } from '../swatches-writer';
import { renderSwatchCards } from '../canvas-renderer';
import type { WebViewToPluginMessage, PluginToWebViewMessage, GitHubSettings } from '../types';
import { validateDTCGDocument } from '../types';

const WEBVIEW_ID = 'token-ferry-panel';

// Pending state for pull-then-apply flow
let pendingTokens: ReturnType<typeof parseDTCGJson> | null = null;

function sendToWebView(msg: PluginToWebViewMessage): void {
  const webview = getWebview(WEBVIEW_ID);
  if (webview) {
    webview.webContents.executeJavaScript(
      `window.onPluginMessage(${JSON.stringify(msg)})`,
    );
  }
}

function sendStatus(message: string, level: 'info' | 'error' | 'success'): void {
  sendToWebView({ type: 'status', message, level });
}

/**
 * Handle messages from the WebView UI.
 */
function handleMessage(msgString: string): void {
  let msg: WebViewToPluginMessage;
  try {
    msg = JSON.parse(msgString);
  } catch {
    return;
  }

  switch (msg.type) {
    case 'load-settings': {
      const settings = loadSettings();
      const defaultSettings: GitHubSettings = {
        owner: '',
        repo: '',
        pat: '',
        baseBranch: 'main',
        filePath: 'tokens/design-tokens.json',
      };
      sendToWebView({ type: 'settings', data: settings ?? defaultSettings });
      break;
    }

    case 'save-settings': {
      try {
        saveSettings(msg.data);
        sendStatus('Settings saved', 'success');
      } catch (err) {
        sendStatus(`Failed to save settings: ${String(err)}`, 'error');
      }
      break;
    }

    case 'get-swatch-groups': {
      try {
        const groups = getSwatchGroups();
        sendToWebView({ type: 'swatch-groups', data: groups });
      } catch (err) {
        sendStatus(`Failed to read swatch groups: ${String(err)}`, 'error');
      }
      break;
    }

    case 'prepare-push': {
      try {
        const swatches = readSwatches(msg.groupNames);
        const dtcgObj = formatToDTCG(swatches);
        const json = JSON.stringify(dtcgObj, null, 2);
        const groups = [...new Set(swatches.map(s => s.groupName))];

        sendToWebView({ type: 'push-data', data: { json, groups } });
        sendStatus('Swatches serialized, pushing to GitHub...', 'info');
      } catch (err) {
        sendStatus(`Failed to prepare push: ${String(err)}`, 'error');
      }
      break;
    }

    case 'push-complete': {
      sendStatus(`Push complete! PR: ${msg.prUrl}`, 'success');
      break;
    }

    case 'pull-data': {
      try {
        const parsed: unknown = JSON.parse(msg.json);
        if (!validateDTCGDocument(parsed)) {
          sendStatus('Invalid token file: expected a JSON object.', 'error');
          break;
        }
        const tokens = parseDTCGJson(parsed);
        pendingTokens = tokens;

        const preview = generatePullPreview(tokens);
        sendToWebView({ type: 'pull-preview', data: preview });
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
        applyTokens(pendingTokens);
        pendingTokens = null;
        sendStatus('Swatches updated successfully!', 'success');
      } catch (err) {
        sendStatus(`Failed to apply tokens: ${String(err)}`, 'error');
      }
      break;
    }

    case 'visualize': {
      try {
        const swatches = readSwatches(msg.groupNames);
        // Build alias map from DTCG extensions if available
        const aliasMap = new Map<string, string>();
        renderSwatchCards(swatches, aliasMap);
        sendToWebView({ type: 'visualize-complete' });
        sendStatus('Visualization rendered on canvas', 'success');
      } catch (err) {
        sendStatus(`Failed to render visualization: ${String(err)}`, 'error');
      }
      break;
    }
  }
}

export default function onRun(): void {
  const options = {
    identifier: WEBVIEW_ID,
    width: 380,
    height: 620,
    show: false,
    titleBarStyle: 'hiddenInset' as const,
    resizable: true,
    alwaysOnTop: true,
  };

  const browserWindow = new BrowserWindow(options);

  browserWindow.once('ready-to-show', () => {
    browserWindow.show();
  });

  const webContents = browserWindow.webContents;

  // Handle messages from WebView
  webContents.on('nativeLog', (msgString: string) => {
    handleMessage(msgString);
  });

  // Load the UI HTML (require is needed for skpm/webpack asset resolution)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  browserWindow.loadURL(require('../../resources/ui.html'));
}
