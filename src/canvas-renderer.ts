import { CardData, isVariableAlias, rgbaToHex } from './types';
import { relativeLuminance, getContrastOnWhite, getContrastOnBlack, contrastLabel } from './contrast-utils';

const CARD_WIDTH = 200;
const SWATCH_HEIGHT = 80;
const COLUMNS = 4;
const GAP = 20;
const CELL_X = CARD_WIDTH + GAP;
const CELL_Y = 280;
const ARROW_RED: RGB = { r: 0.91, g: 0.333, b: 0.227 };   // #E8553A
const ARROW_TEAL: RGB = { r: 0.49, g: 0.831, b: 0.753 };   // #7DD4C0

async function loadFonts(): Promise<{
  medium: FontName;
  bold: FontName;
}> {
  const interMedium: FontName = { family: "Inter", style: "Medium" };
  const interBold: FontName = { family: "Inter", style: "Bold" };
  try {
    await Promise.all([
      figma.loadFontAsync(interMedium),
      figma.loadFontAsync(interBold),
    ]);
    return { medium: interMedium, bold: interBold };
  } catch {
    const robotoMedium: FontName = { family: "Roboto", style: "Medium" };
    const robotoBold: FontName = { family: "Roboto", style: "Bold" };
    await Promise.all([
      figma.loadFontAsync(robotoMedium),
      figma.loadFontAsync(robotoBold),
    ]);
    return { medium: robotoMedium, bold: robotoBold };
  }
}

async function gatherCardData(collectionIds: string[]): Promise<CardData[]> {
  const cards: CardData[] = [];

  // Fetch all variables and collections once to avoid N+1 API calls
  const [allVariables, allCollections] = await Promise.all([
    figma.variables.getLocalVariablesAsync(),
    Promise.all(collectionIds.map(id => figma.variables.getVariableCollectionByIdAsync(id))),
  ]);

  const varsById = new Map(allVariables.map(v => [v.id, v]));
  // Also build a collection-by-id map for resolving alias targets
  const collectionsById = new Map<string, VariableCollection>();
  for (const col of allCollections) {
    if (col) collectionsById.set(col.id, col);
  }

  for (const collection of allCollections) {
    if (!collection) continue;

    for (const varId of collection.variableIds) {
      const variable = varsById.get(varId);
      if (!variable || variable.resolvedType !== "COLOR") continue;

      const modeId = collection.modes[0].modeId;
      const rawValue = variable.valuesByMode[modeId];

      let aliasTargetId: string | undefined;
      let color: RGBA;

      if (isVariableAlias(rawValue)) {
        aliasTargetId = rawValue.id;
        const resolved = varsById.get(rawValue.id);
        if (!resolved) continue;
        const resolvedCol = collectionsById.get(resolved.variableCollectionId);
        if (!resolvedCol) continue;
        const resolvedMode = resolvedCol.modes[0].modeId;
        color = resolved.valuesByMode[resolvedMode] as RGBA;
      } else {
        color = rawValue as RGBA;
      }

      if (!color || typeof color.r !== "number") continue;

      cards.push({
        variableId: variable.id,
        name: variable.name,
        hexValue: rgbaToHex(color),
        rgbaColor: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
        contrastOnWhite: getContrastOnWhite(color.r, color.g, color.b),
        contrastOnBlack: getContrastOnBlack(color.r, color.g, color.b),
        aliasTargetId,
        collectionName: collection.name,
      });
    }
  }
  return cards;
}

function createCard(
  data: CardData,
  fonts: { medium: FontName; bold: FontName },
): FrameNode {
  const card = figma.createFrame();
  card.name = data.name;
  card.layoutMode = "VERTICAL";
  card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 12;
  card.itemSpacing = 8;
  card.resize(CARD_WIDTH, 1);
  card.primaryAxisSizingMode = "AUTO";
  card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  card.cornerRadius = 8;
  card.effects = [{
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 6,
    spread: 0,
    visible: true,
    blendMode: "NORMAL",
  }];

  // Swatch with Aa preview
  const swatch = figma.createFrame();
  swatch.name = "swatch";
  swatch.resize(CARD_WIDTH - 24, SWATCH_HEIGHT);
  swatch.layoutMode = "VERTICAL";
  swatch.primaryAxisAlignItems = "CENTER";
  swatch.counterAxisAlignItems = "CENTER";
  swatch.primaryAxisSizingMode = "FIXED";
  swatch.fills = [{ type: "SOLID", color: { r: data.rgbaColor.r, g: data.rgbaColor.g, b: data.rgbaColor.b } }];
  swatch.cornerRadius = 4;

  const lum = relativeLuminance(data.rgbaColor.r, data.rgbaColor.g, data.rgbaColor.b);
  const useWhiteText = lum < 0.4;

  const aaText = figma.createText();
  aaText.fontName = fonts.bold;
  aaText.characters = "Aa";
  aaText.fontSize = 28;
  aaText.fills = [{ type: "SOLID", color: useWhiteText ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 } }];
  swatch.appendChild(aaText);
  card.appendChild(swatch);

  // Variable name
  const nameText = figma.createText();
  nameText.fontName = fonts.bold;
  nameText.characters = data.name;
  nameText.fontSize = 12;
  nameText.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
  card.appendChild(nameText);

  // Hex value
  const hexText = figma.createText();
  hexText.fontName = fonts.medium;
  hexText.characters = data.hexValue;
  hexText.fontSize = 11;
  hexText.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
  card.appendChild(hexText);

  // Contrast badge
  const ratio = data.contrastOnWhite;
  const label = contrastLabel(ratio);
  const badgeText = figma.createText();
  badgeText.fontName = fonts.medium;
  badgeText.characters = `${ratio.toFixed(2)}:1 ${label}`;
  badgeText.fontSize = 10;
  const badgeColor = label === "Fail"
    ? { r: 0.8, g: 0.2, b: 0.2 }
    : { r: 0.2, g: 0.6, b: 0.3 };
  badgeText.fills = [{ type: "SOLID", color: badgeColor }];
  card.appendChild(badgeText);

  return card;
}

function drawArrow(
  parentFrame: FrameNode,
  fromX: number, fromY: number,
  toX: number, toY: number,
  color: RGB,
): void {
  const vec = figma.createVector();
  const mx = (fromX + toX) / 2;
  const cy1 = fromY + 40;
  const cy2 = toY - 40;

  vec.vectorPaths = [{
    windingRule: "NONZERO",
    data: `M ${fromX} ${fromY} C ${mx} ${cy1} ${mx} ${cy2} ${toX} ${toY}`,
  }];
  vec.strokes = [{ type: "SOLID", color }];
  vec.strokeWeight = 2;
  vec.fills = [];
  parentFrame.appendChild(vec);

  // Arrowhead triangle
  const head = figma.createVector();
  const s = 6;
  head.vectorPaths = [{
    windingRule: "NONZERO",
    data: `M ${toX} ${toY} L ${toX - s} ${toY - s} L ${toX + s} ${toY - s} Z`,
  }];
  head.fills = [{ type: "SOLID", color }];
  head.strokes = [];
  parentFrame.appendChild(head);
}

export async function renderVariableCards(collectionIds: string[]): Promise<void> {
  const fonts = await loadFonts();
  const cards = await gatherCardData(collectionIds);
  if (cards.length === 0) return;

  const wrapper = figma.createFrame();
  wrapper.name = "Token Ferry \u2014 Variable Visualization";
  wrapper.fills = [];
  const totalRows = Math.ceil(cards.length / COLUMNS);
  wrapper.resize(COLUMNS * CELL_X, totalRows * CELL_Y + 40);

  const cardPositions = new Map<string, { x: number; y: number }>();

  cards.forEach((data, i) => {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const x = col * CELL_X;
    const y = row * CELL_Y;

    const cardNode = createCard(data, fonts);
    cardNode.x = x;
    cardNode.y = y;
    wrapper.appendChild(cardNode);
    cardPositions.set(data.variableId, { x, y });
  });

  // Draw alias arrows
  let arrowIndex = 0;
  for (const data of cards) {
    if (!data.aliasTargetId) continue;
    const from = cardPositions.get(data.variableId);
    const to = cardPositions.get(data.aliasTargetId);
    if (!from || !to) continue;

    const color = arrowIndex % 2 === 0 ? ARROW_TEAL : ARROW_RED;
    drawArrow(
      wrapper,
      from.x + CARD_WIDTH / 2, from.y + CELL_Y - 30,
      to.x + CARD_WIDTH / 2, to.y,
      color,
    );
    arrowIndex++;
  }

  // Position near viewport
  const center = figma.viewport.center;
  wrapper.x = Math.round(center.x - wrapper.width / 2);
  wrapper.y = Math.round(center.y - wrapper.height / 2);

  figma.currentPage.appendChild(wrapper);
  figma.viewport.scrollAndZoomIntoView([wrapper]);
}
