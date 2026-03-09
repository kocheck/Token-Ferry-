// ── WebView Message Handler ──────────────────────────────────────────────────
// Handles messages dispatched from the WebView via the action system.
// This is the Sketch equivalent of Figma's figma.ui.onmessage.

import { getWebview } from 'sketch-module-web-view/remote';

const WEBVIEW_ID = 'token-ferry-panel';

export function onWebViewMessage(_action: string): void {
  const webview = getWebview(WEBVIEW_ID);
  if (!webview) return;

  // Messages are handled by the open-panel command's handleMessage function.
  // This handler exists as a fallback for the action-based message routing.
  // The primary message flow uses webContents.on('nativeLog', ...) set up in open-panel.
}
