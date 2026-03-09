import { describe, it, expect } from 'vitest';
import {
  hexToSketchColor,
  sketchColorToHex,
} from './types';

describe('hexToSketchColor', () => {
  it('appends FF for 6-char hex', () => {
    expect(hexToSketchColor('#FF0000')).toBe('#FF0000FF');
  });

  it('returns 8-char hex as-is', () => {
    expect(hexToSketchColor('#FF000080')).toBe('#FF000080');
  });

  it('handles lowercase', () => {
    expect(hexToSketchColor('#ff0000')).toBe('#FF0000FF');
  });
});

describe('sketchColorToHex', () => {
  it('strips FF alpha suffix', () => {
    expect(sketchColorToHex('#FF0000FF')).toBe('#FF0000');
  });

  it('keeps non-FF alpha', () => {
    expect(sketchColorToHex('#FF000080')).toBe('#FF000080');
  });
});
