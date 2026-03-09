// ── Visualize Command ────────────────────────────────────────────────────────
// Standalone command to render color swatch cards on the canvas.
// Can be run without opening the WebView panel.

import sketch from 'sketch/dom';
import UI from 'sketch/ui';
import { getSwatchGroups, readSwatches } from '../swatches-reader';
import { renderSwatchCards } from '../canvas-renderer';

export default function onRun(): void {
  const document = sketch.getSelectedDocument();
  if (!document) {
    UI.message('No document open. Open a Sketch file first.');
    return;
  }

  const groups = getSwatchGroups();
  if (groups.length === 0) {
    UI.message('No color swatches found in this document.');
    return;
  }

  const groupNames = groups.map(g => g.name);
  const swatches = readSwatches(groupNames);

  if (swatches.length === 0) {
    UI.message('No color swatches found.');
    return;
  }

  const aliasMap = new Map<string, string>();
  renderSwatchCards(swatches, aliasMap);
  UI.message(`Rendered ${swatches.length} color swatches on canvas.`);
}
