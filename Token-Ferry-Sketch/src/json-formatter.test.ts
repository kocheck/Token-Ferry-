import { describe, it, expect } from 'vitest';
import { formatToDTCG } from './json-formatter';
import { parseDTCGJson } from './json-parser';
import type { SwatchData } from './types';

function makeSwatch(overrides: Partial<SwatchData> = {}): SwatchData {
  return {
    id: 'swatch-1',
    name: 'primary/500',
    hexValue: '#FF0000',
    groupName: 'brand',
    ...overrides,
  };
}

describe('formatToDTCG', () => {
  it('formats a single swatch', () => {
    const result = formatToDTCG([makeSwatch()]);

    expect(result.brand).toBeDefined();
    const primary = (result.brand as Record<string, unknown>).primary as Record<string, unknown>;
    const token = primary['500'] as { $type: string; $value: string };
    expect(token.$type).toBe('color');
    expect(token.$value).toBe('#FF0000');
  });

  it('includes Sketch extensions', () => {
    const result = formatToDTCG([makeSwatch()]);

    const token = ((result.brand as Record<string, unknown>).primary as Record<string, unknown>)['500'] as {
      $extensions: { 'com.sketch': { swatchId: string; group: string } };
    };
    expect(token.$extensions['com.sketch'].swatchId).toBe('swatch-1');
    expect(token.$extensions['com.sketch'].group).toBe('brand');
  });

  it('groups by group name', () => {
    const swatches: SwatchData[] = [
      makeSwatch({ name: 'red', groupName: 'colors' }),
      makeSwatch({ name: 'sm', groupName: 'spacing', id: 'swatch-2', hexValue: '#00FF00' }),
    ];

    const result = formatToDTCG(swatches);
    expect(result.colors).toBeDefined();
    expect(result.spacing).toBeDefined();
  });

  it('includes description when present', () => {
    const result = formatToDTCG([makeSwatch({ description: 'Main brand color' })]);

    const token = ((result.brand as Record<string, unknown>).primary as Record<string, unknown>)['500'] as { $description: string };
    expect(token.$description).toBe('Main brand color');
  });

  it('round-trips through parser', () => {
    const swatches: SwatchData[] = [
      makeSwatch({ name: 'red', groupName: 'colors' }),
      makeSwatch({ name: 'blue', groupName: 'colors', id: 'swatch-2', hexValue: '#0000FF' }),
    ];

    const dtcg = formatToDTCG(swatches);
    const parsed = parseDTCGJson(dtcg);

    expect(parsed).toHaveLength(2);
    expect(parsed.map(t => t.name).sort()).toEqual(['blue', 'red']);
  });
});
