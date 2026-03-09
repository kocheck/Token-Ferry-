import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  getContrastOnWhite,
  getContrastOnBlack,
  contrastLabel,
} from './contrast-utils';

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance(0, 0, 0)).toBe(0);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance(1, 1, 1)).toBeCloseTo(1, 5);
  });

  it('computes luminance for pure red', () => {
    const lum = relativeLuminance(1, 0, 0);
    expect(lum).toBeCloseTo(0.2126, 4);
  });

  it('computes luminance for mid-gray', () => {
    const lum = relativeLuminance(0.5, 0.5, 0.5);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio(0, 1)).toBe(21);
  });

  it('returns 1 for same luminance', () => {
    expect(contrastRatio(0.5, 0.5)).toBe(1);
  });

  it('is symmetric', () => {
    expect(contrastRatio(0.2, 0.8)).toBe(contrastRatio(0.8, 0.2));
  });
});

describe('getContrastOnWhite', () => {
  it('returns 21 for black', () => {
    expect(getContrastOnWhite(0, 0, 0)).toBe(21);
  });

  it('returns 1 for white', () => {
    expect(getContrastOnWhite(1, 1, 1)).toBe(1);
  });
});

describe('getContrastOnBlack', () => {
  it('returns 21 for white', () => {
    expect(getContrastOnBlack(1, 1, 1)).toBe(21);
  });

  it('returns 1 for black', () => {
    expect(getContrastOnBlack(0, 0, 0)).toBe(1);
  });
});

describe('contrastLabel', () => {
  it('returns AAA for ratio >= 7', () => {
    expect(contrastLabel(7)).toBe('AAA');
    expect(contrastLabel(7.5)).toBe('AAA');
    expect(contrastLabel(21)).toBe('AAA');
  });

  it('returns AA for ratio >= 4.5 and < 7', () => {
    expect(contrastLabel(4.5)).toBe('AA');
    expect(contrastLabel(6.9)).toBe('AA');
  });

  it('returns AA Large for ratio >= 3 and < 4.5', () => {
    expect(contrastLabel(3)).toBe('AA Large');
    expect(contrastLabel(4.4)).toBe('AA Large');
  });

  it('returns Fail for ratio < 3', () => {
    expect(contrastLabel(2.9)).toBe('Fail');
    expect(contrastLabel(1)).toBe('Fail');
    expect(contrastLabel(2)).toBe('Fail');
  });
});
