# Token Ferry: Figma → Sketch API Mapping

This document maps every Figma Plugin API used in Token Ferry to its Sketch equivalent.

## Architecture

| Aspect | Figma Plugin | Sketch Plugin |
|--------|-------------|---------------|
| Execution model | Sandbox (main thread) + UI iframe | JavaScriptCore + WebView panel |
| UI framework | Inline HTML in `figma.showUI(__html__)` | `sketch-module-web-view` BrowserWindow |
| Message passing | `figma.ui.postMessage` / `figma.ui.onmessage` | `webview.evaluateJavaScript` / `nativeLog` handler |
| Build system | esbuild (custom config) | @skpm/builder (webpack) |
| Manifest | `manifest.json` (Figma format) | `manifest.json` (Sketch format with commands array) |
| Entry point | Single `code.ts` with message router | Multiple command scripts in `src/commands/` |

## Variable / Token System

| Figma API | Sketch Equivalent | Notes |
|-----------|-------------------|-------|
| `figma.variables.getLocalVariableCollectionsAsync()` | `document.swatches` grouped by name prefix | Sketch has no "collections" — groups derived from slash-separated naming |
| `figma.variables.getLocalVariablesAsync()` | `document.swatches` | Sketch only has color swatches, no FLOAT/STRING/BOOLEAN |
| `figma.variables.createVariableCollection(name)` | *(implicit)* Swatch naming convention `group/name` | No explicit collection creation needed |
| `figma.variables.createVariable(name, col, type)` | `sketch.Swatch.from({ name, color })` | Only COLOR type supported |
| `figma.variables.createVariableAlias(target)` | *(resolved)* Write concrete color value | Sketch has no native alias system |
| `variable.setValueForMode(modeId, value)` | `swatch.color = value` | Sketch has no modes — only one value per swatch |
| `variable.resolvedType` | Always `'COLOR'` | Sketch swatches are color-only |
| `variable.description` | *(not supported)* | Sketch swatches have no description field |
| Variable modes | *(stored in DTCG extensions only)* | Preserved in JSON for round-trip, not in Sketch |

## Canvas Rendering

| Figma API | Sketch Equivalent | Notes |
|-----------|-------------------|-------|
| `figma.createFrame()` | `new sketch.Group({...})` | Groups serve as containers |
| `figma.createText()` | `new sketch.Text({...})` | Direct equivalent |
| `figma.createVector()` | `new sketch.ShapePath({...})` + NSBezierPath | SVG-like path data via CocoaScript bridge |
| `figma.loadFontAsync()` | *(not needed)* | Sketch uses system fonts directly |
| `frame.layoutMode = 'VERTICAL'` | Manual positioning via `frame.x/y` | Sketch has no auto-layout on arbitrary frames |
| `frame.fills` | `style.fills` array | Same concept, different format |
| `frame.effects` (drop shadow) | `style.shadows` array | Different property names |
| `figma.viewport.scrollAndZoomIntoView()` | `document.centerOnLayer()` | Different API, same effect |
| `figma.currentPage.appendChild()` | `parent: page` in constructor | Sketch uses constructor injection |

## Storage

| Figma API | Sketch Equivalent | Notes |
|-----------|-------------------|-------|
| `figma.clientStorage.getAsync(key)` | `Settings.settingForKey(key)` | Synchronous in Sketch |
| `figma.clientStorage.setAsync(key, value)` | `Settings.setSettingForKey(key, value)` | Synchronous in Sketch |

## UI / Plugin Lifecycle

| Figma API | Sketch Equivalent | Notes |
|-----------|-------------------|-------|
| `figma.showUI(__html__, { width, height })` | `new BrowserWindow({ width, height })` | WebView panel |
| `figma.ui.postMessage(msg)` | `webview.evaluateJavaScript('window.onPluginMessage(...)')` | Plugin → WebView |
| `figma.ui.onmessage = handler` | `webContents.on('nativeLog', handler)` | WebView → Plugin |
| `parent.postMessage({ pluginMessage }, '*')` | `window.webkit.messageHandlers.nativeLog.postMessage()` | WebView → Plugin (from JS side) |
| `figma.notify(message)` | `UI.message(message)` | Toast notification |
| `figma.closePlugin()` | `browserWindow.close()` | Close panel |

## Network

| Figma Context | Sketch Context | Notes |
|---------------|----------------|-------|
| `fetch()` in UI iframe | `fetch()` in WebView | Both have browser-like fetch |
| `btoa()` / `atob()` | `btoa()` / `atob()` | Available in both WebView contexts |
| `networkAccess.allowedDomains` in manifest | *(unrestricted)* | Sketch plugins have full network access |

## DTCG Format Differences

| Aspect | Figma Plugin | Sketch Plugin |
|--------|-------------|---------------|
| Extension namespace | `$extensions["com.figma"]` | `$extensions["com.sketch"]` |
| Stored metadata | variableId, collection, aliasOf, modes | swatchId, group |
| Supported types | color, number, string, boolean | color only |
| Mode values | Full multi-mode support | First/default mode value only |
| Alias handling | Native VARIABLE_ALIAS | Resolved to concrete value |

## File-Level Mapping

| Figma Plugin File | Sketch Plugin File | Reuse Level |
|------------------|--------------------|-------------|
| `src/types.ts` | `src/types.ts` | Adapted — different interfaces for Sketch types |
| `src/code.ts` | `src/commands/open-panel.ts` | Rewritten — command-based instead of message router |
| `src/variables-reader.ts` | `src/swatches-reader.ts` | Rewritten — Sketch Swatch API |
| `src/variables-writer.ts` | `src/swatches-writer.ts` | Rewritten — Sketch Swatch API + alias resolution |
| `src/json-formatter.ts` | `src/json-formatter.ts` | Adapted — SwatchData input instead of VariableData |
| `src/json-parser.ts` | `src/json-parser.ts` | Copied as-is — platform-agnostic |
| `src/contrast-utils.ts` | `src/contrast-utils.ts` | Copied as-is — pure math |
| `src/github-api.ts` | `src/github-api.ts` + `resources/ui.js` | Adapted — GitHub calls live in WebView JS |
| `src/storage.ts` | `src/storage.ts` | Rewritten — sketch/settings instead of clientStorage |
| `src/canvas-renderer.ts` | `src/canvas-renderer.ts` | Rewritten — Sketch Shape/Text/Group + NSBezierPath |
| `src/ui.html` | `resources/ui.html` | Adapted — minor text changes, external script |
| `src/ui.ts` | `resources/ui.js` | Rewritten — plain JS, Sketch WebView comms |
| `esbuild.config.mjs` | `webpack.skpm.config.js` | Rewritten — skpm webpack config |
| `manifest.json` | `src/manifest.json` | Rewritten — Sketch manifest format |

## Platform Limitations

### Features NOT available in Sketch
1. **Non-color variables** — Sketch has no equivalent for FLOAT, STRING, BOOLEAN tokens
2. **Variable modes** — Sketch has no mode system; only one value per swatch
3. **Variable aliases** — No native alias relationships between swatches
4. **Auto-layout** — Canvas cards use manual positioning, not auto-layout
5. **`documentAccess: dynamic-page`** — Sketch has synchronous API access

### Features ONLY available in Sketch
1. **System font access** — No need to load fonts asynchronously
2. **Unrestricted network** — No domain allowlist needed
3. **Synchronous storage** — No async/await needed for settings
4. **Native macOS UI** — Could use native dialogs via CocoaScript if desired
5. **Direct file system** — Could read/write tokens to local files
