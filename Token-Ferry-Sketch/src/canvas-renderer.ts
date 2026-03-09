// ── Sketch Canvas Renderer ──────────────────────────────────────────────────
// Creates visual color cards on the Sketch canvas with contrast badges
// and alias arrows using ShapePath for curved bezier lines.
// Equivalent to canvas-renderer.ts in the Figma plugin.

import sketch from 'sketch/dom';
import type { CardData, SwatchData } from './types';
import { hexToRgba } from './types';
import {
  relativeLuminance,
  getContrastOnWhite,
  getContrastOnBlack,
  contrastLabel,
} from './contrast-utils';

const CARD_WIDTH = 200;
const SWATCH_HEIGHT = 80;
const COLUMNS = 4;
const GAP = 20;
const CELL_X = CARD_WIDTH + GAP;
const CELL_Y = 280;

// ── Card Data Gathering ──────────────────────────────────────────────────────

function gatherCardData(
  swatches: SwatchData[],
  aliasMap: Map<string, string>,
): CardData[] {
  const cards: CardData[] = [];

  for (const swatch of swatches) {
    const rgba = hexToRgba(swatch.hexValue);

    cards.push({
      swatchId: swatch.id,
      name: swatch.name,
      hexValue: swatch.hexValue,
      rgbaColor: rgba,
      contrastOnWhite: getContrastOnWhite(rgba.r, rgba.g, rgba.b),
      contrastOnBlack: getContrastOnBlack(rgba.r, rgba.g, rgba.b),
      aliasOf: aliasMap.get(swatch.id),
      groupName: swatch.groupName,
    });
  }

  return cards;
}

// ── Card Creation ────────────────────────────────────────────────────────────

function createCard(data: CardData, parent: sketch.Group): void {
  const cardGroup = new sketch.Group({
    name: data.name,
    frame: new sketch.Rectangle(0, 0, CARD_WIDTH, 0),
    parent,
  });

  // Card background
  new sketch.ShapePath({
    name: 'card-bg',
    shapeType: sketch.ShapePath.ShapeType.Rectangle,
    frame: new sketch.Rectangle(0, 0, CARD_WIDTH, 220),
    style: {
      fills: [{ color: '#FFFFFFFF', fillType: sketch.Style.FillType.Color }],
      borders: [{ color: '#E4E4E7FF', thickness: 1, position: sketch.Style.BorderPosition.Inside }],
    },
    parent: cardGroup,
  });

  // Color swatch rectangle
  const sketchHex = data.hexValue.replace('#', '');
  const swatchColor = sketchHex.length <= 6 ? `#${sketchHex}FF` : `#${sketchHex}`;
  new sketch.ShapePath({
    name: 'swatch',
    shapeType: sketch.ShapePath.ShapeType.Rectangle,
    frame: new sketch.Rectangle(12, 12, CARD_WIDTH - 24, SWATCH_HEIGHT),
    style: {
      fills: [{ color: swatchColor, fillType: sketch.Style.FillType.Color }],
    },
    parent: cardGroup,
  });

  // "Aa" text on swatch
  const lum = relativeLuminance(data.rgbaColor.r, data.rgbaColor.g, data.rgbaColor.b);
  const textOnSwatch = lum < 0.4 ? '#FFFFFFFF' : '#000000FF';
  new sketch.Text({
    text: 'Aa',
    frame: new sketch.Rectangle(12, 12, CARD_WIDTH - 24, SWATCH_HEIGHT),
    style: {
      textColor: textOnSwatch,
      fontSize: 28,
      fontFamily: 'Helvetica Neue',
      fontWeight: 7, // Bold
      alignment: sketch.Text.Alignment.center,
      verticalAlignment: sketch.Text.VerticalAlignment.center,
    },
    parent: cardGroup,
  });

  // Variable name label
  new sketch.Text({
    text: data.name,
    frame: new sketch.Rectangle(12, SWATCH_HEIGHT + 20, CARD_WIDTH - 24, 20),
    style: {
      textColor: '#1A1A1AFF',
      fontSize: 12,
      fontFamily: 'Helvetica Neue',
      fontWeight: 7,
    },
    parent: cardGroup,
  });

  // Hex value label
  new sketch.Text({
    text: data.hexValue,
    frame: new sketch.Rectangle(12, SWATCH_HEIGHT + 42, CARD_WIDTH - 24, 16),
    style: {
      textColor: '#666666FF',
      fontSize: 11,
      fontFamily: 'Helvetica Neue',
      fontWeight: 5,
    },
    parent: cardGroup,
  });

  // Contrast badge
  const ratio = data.contrastOnWhite;
  const label = contrastLabel(ratio);
  const badgeColor = label === 'Fail' ? '#CC3333FF' : '#339933FF';
  new sketch.Text({
    text: `${ratio.toFixed(2)}:1 ${label}`,
    frame: new sketch.Rectangle(12, SWATCH_HEIGHT + 60, CARD_WIDTH - 24, 14),
    style: {
      textColor: badgeColor,
      fontSize: 10,
      fontFamily: 'Helvetica Neue',
      fontWeight: 5,
    },
    parent: cardGroup,
  });

  // Resize card group to fit content
  cardGroup.adjustToFit();
}

// ── Arrow Drawing via ShapePath ──────────────────────────────────────────────

function drawArrow(
  parent: sketch.Group,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
): void {
  // Curved bezier line from source to target
  const mx = (fromX + toX) / 2;
  const cy1 = fromY + 40;
  const cy2 = toY - 40;

  // Sketch ShapePath with SVG path data
  const path = new sketch.ShapePath({
    name: 'alias-arrow',
    frame: new sketch.Rectangle(
      Math.min(fromX, toX) - 10,
      Math.min(fromY, toY) - 10,
      Math.abs(toX - fromX) + 20,
      Math.abs(toY - fromY) + 20,
    ),
    style: {
      borders: [{ color, thickness: 2, position: sketch.Style.BorderPosition.Center }],
      fills: [],
    },
    parent,
  });

  // Use native NSBezierPath for the curve
  const layer = path.sketchObject;
  if (layer && layer.bezierPath) {
    const nativePath = NSBezierPath.bezierPath();
    nativePath.moveToPoint(NSMakePoint(fromX, fromY));
    nativePath.curveToPoint_controlPoint1_controlPoint2(
      NSMakePoint(toX, toY),
      NSMakePoint(mx, cy1),
      NSMakePoint(mx, cy2),
    );
    layer.bezierPath = nativePath;
  }

  // Arrowhead triangle
  const s = 6;
  new sketch.ShapePath({
    name: 'arrowhead',
    shapeType: sketch.ShapePath.ShapeType.Triangle,
    frame: new sketch.Rectangle(toX - s, toY - s, s * 2, s),
    style: {
      fills: [{ color, fillType: sketch.Style.FillType.Color }],
      borders: [],
    },
    parent,
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders color swatch cards on the Sketch canvas with contrast badges
 * and alias arrows.
 */
export function renderSwatchCards(
  swatches: SwatchData[],
  aliasMap: Map<string, string>,
): void {
  const document = sketch.getSelectedDocument();
  if (!document) {
    throw new Error('No document open. Open a Sketch file first.');
  }

  const page = document.selectedPage;
  const cards = gatherCardData(swatches, aliasMap);
  if (cards.length === 0) return;

  const totalRows = Math.ceil(cards.length / COLUMNS);

  // Create wrapper group
  const wrapper = new sketch.Group({
    name: 'Token Ferry — Swatch Visualization',
    frame: new sketch.Rectangle(
      100,
      100,
      COLUMNS * CELL_X,
      totalRows * CELL_Y + 40,
    ),
    parent: page,
  });

  const cardPositions = new Map<string, { x: number; y: number }>();

  cards.forEach((data, i) => {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const x = col * CELL_X;
    const y = row * CELL_Y;

    createCard(data, wrapper);
    // Position the card (last child of wrapper)
    const cardLayer = wrapper.layers[wrapper.layers.length - 1];
    cardLayer.frame.x = x;
    cardLayer.frame.y = y;

    cardPositions.set(data.swatchId, { x, y });
  });

  // Draw alias arrows
  const ARROW_TEAL = '#7DD4C0FF';
  const ARROW_RED = '#E8553AFF';
  let arrowIndex = 0;

  for (const data of cards) {
    if (!data.aliasOf) continue;
    // Find target card by searching for swatch with matching name
    const targetCard = cards.find(c => c.name === data.aliasOf);
    if (!targetCard) continue;

    const from = cardPositions.get(data.swatchId);
    const to = cardPositions.get(targetCard.swatchId);
    if (!from || !to) continue;

    const color = arrowIndex % 2 === 0 ? ARROW_TEAL : ARROW_RED;
    drawArrow(
      wrapper,
      from.x + CARD_WIDTH / 2,
      from.y + CELL_Y - 30,
      to.x + CARD_WIDTH / 2,
      to.y,
      color,
    );
    arrowIndex++;
  }

  // Center on canvas
  document.centerOnLayer(wrapper);
}
