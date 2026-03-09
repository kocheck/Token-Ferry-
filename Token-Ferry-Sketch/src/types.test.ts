import { describe, it, expect } from 'vitest';
import {
  isAliasRef,
  extractAliasPath,
  isDTCGToken,
  validateDTCGDocument,
  rgbaToHex,
  hexToRgba,
  hexToSketchColor,
  sketchColorToHex,
} from './types';

describe('isAliasRef', () => {
  it('returns true for alias string', () => {
    expect(isAliasRef('{foo.bar}')).toBe(true);
  });

  it('returns false for plain string', () => {
    expect(isAliasRef('plain')).toBe(false);
  });

  it('returns false for non-string', () => {
    expect(isAliasRef(42)).toBe(false);
    expect(isAliasRef(null)).toBe(false);
  });
});

describe('extractAliasPath', () => {
  it('extracts path from alias ref', () => {
    expect(extractAliasPath('{a.b.c}')).toBe('a.b.c');
  });

  it('returns empty for non-alias', () => {
    expect(extractAliasPath('plain')).toBe('');
  });
});

describe('isDTCGToken', () => {
  it('returns true for valid token', () => {
    expect(isDTCGToken({ $type: 'color', $value: '#FF0000' })).toBe(true);
  });

  it('returns false for plain object', () => {
    expect(isDTCGToken({ foo: 'bar' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDTCGToken(null)).toBe(false);
  });
});

describe('validateDTCGDocument', () => {
  it('returns true for plain object', () => {
    expect(validateDTCGDocument({})).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateDTCGDocument(null)).toBe(false);
  });

  it('returns false for array', () => {
    expect(validateDTCGDocument([])).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(validateDTCGDocument('string')).toBe(false);
    expect(validateDTCGDocument(42)).toBe(false);
  });
});

describe('rgbaToHex', () => {
  it('converts red', () => {
    expect(rgbaToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe('#FF0000');
  });

  it('includes alpha when < 1', () => {
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('#00000080');
  });
});

describe('hexToRgba', () => {
  it('parses red hex', () => {
    const rgba = hexToRgba('#FF0000');
    expect(rgba.r).toBe(1);
    expect(rgba.g).toBe(0);
    expect(rgba.b).toBe(0);
    expect(rgba.a).toBe(1);
  });

  it('parses hex with alpha', () => {
    const rgba = hexToRgba('#00000080');
    expect(rgba.a).toBeCloseTo(0.502, 2);
  });
});

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
