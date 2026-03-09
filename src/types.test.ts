import { describe, it, expect } from 'vitest';
import {
  isAliasRef,
  extractAliasPath,
  isDTCGToken,
  validateDTCGDocument,
  rgbaToHex,
  hexToRgba,
  figmaTypeToDTCG,
  dtcgTypeToFigma,
} from './types';

describe('isAliasRef', () => {
  it('returns true for alias string', () => {
    expect(isAliasRef('{foo.bar}')).toBe(true);
  });

  it('returns true for nested alias', () => {
    expect(isAliasRef('{a.b.c.d}')).toBe(true);
  });

  it('returns false for plain string', () => {
    expect(isAliasRef('plain')).toBe(false);
  });

  it('returns false for non-string', () => {
    expect(isAliasRef(42)).toBe(false);
    expect(isAliasRef(null)).toBe(false);
    expect(isAliasRef(undefined)).toBe(false);
  });

  it('returns false for partial braces', () => {
    expect(isAliasRef('{foo')).toBe(false);
    expect(isAliasRef('foo}')).toBe(false);
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

  it('returns false for non-object', () => {
    expect(isDTCGToken('string')).toBe(false);
  });
});

describe('validateDTCGDocument', () => {
  it('returns true for plain object', () => {
    expect(validateDTCGDocument({})).toBe(true);
    expect(validateDTCGDocument({ foo: 'bar' })).toBe(true);
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

  it('converts white', () => {
    expect(rgbaToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe('#FFFFFF');
  });

  it('converts black', () => {
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
  });

  it('includes alpha when less than 1', () => {
    const hex = rgbaToHex({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(hex).toBe('#00000080');
  });

  it('omits alpha when exactly 1', () => {
    const hex = rgbaToHex({ r: 1, g: 0, b: 0, a: 1 });
    expect(hex).not.toMatch(/^#.{8}$/);
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
    expect(rgba.r).toBe(0);
    expect(rgba.g).toBe(0);
    expect(rgba.b).toBe(0);
    expect(rgba.a).toBeCloseTo(0.502, 2);
  });

  it('defaults alpha to 1 for 6-char hex', () => {
    const rgba = hexToRgba('#AABBCC');
    expect(rgba.a).toBe(1);
  });
});

describe('figmaTypeToDTCG', () => {
  it('maps COLOR to color', () => {
    expect(figmaTypeToDTCG('COLOR')).toBe('color');
  });
  it('maps FLOAT to number', () => {
    expect(figmaTypeToDTCG('FLOAT')).toBe('number');
  });
  it('maps STRING to string', () => {
    expect(figmaTypeToDTCG('STRING')).toBe('string');
  });
  it('maps BOOLEAN to boolean', () => {
    expect(figmaTypeToDTCG('BOOLEAN')).toBe('boolean');
  });
});

describe('dtcgTypeToFigma', () => {
  it('maps color to COLOR', () => {
    expect(dtcgTypeToFigma('color')).toBe('COLOR');
  });
  it('maps number to FLOAT', () => {
    expect(dtcgTypeToFigma('number')).toBe('FLOAT');
  });
});
