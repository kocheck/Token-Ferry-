import { describe, it, expect } from 'vitest';
import {
  figmaTypeToDTCG,
  dtcgTypeToFigma,
} from './types';

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
