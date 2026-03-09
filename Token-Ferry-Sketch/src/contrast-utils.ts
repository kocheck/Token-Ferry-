// WCAG 2.1 contrast ratio calculations
// Platform-agnostic — shared between Figma and Sketch plugins.

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function getContrastOnWhite(r: number, g: number, b: number): number {
  return contrastRatio(relativeLuminance(r, g, b), 1.0);
}

export function getContrastOnBlack(r: number, g: number, b: number): number {
  return contrastRatio(relativeLuminance(r, g, b), 0.0);
}

export function contrastLabel(ratio: number): string {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}
