import { describe, it, expect } from 'vitest';
import { formatToDTCG } from './json-formatter';
import { parseDTCGJson } from './json-parser';
import type { VariableData } from './types';

function makeVariable(overrides: Partial<VariableData> = {}): VariableData {
  return {
    id: 'var-1',
    name: 'primary/500',
    resolvedType: 'COLOR',
    description: '',
    collectionName: 'brand',
    collectionId: 'col-1',
    valuesByMode: {
      default: { kind: 'raw', value: '#FF0000' },
    },
    ...overrides,
  };
}

describe('formatToDTCG', () => {
  it('formats a single variable', () => {
    const result = formatToDTCG([makeVariable()]);

    expect(result.brand).toBeDefined();
    const primary = (result.brand as Record<string, unknown>).primary as Record<string, unknown>;
    expect(primary).toBeDefined();
    const token = primary['500'] as { $type: string; $value: string };
    expect(token.$type).toBe('color');
    expect(token.$value).toBe('#FF0000');
  });

  it('groups by collection name', () => {
    const vars: VariableData[] = [
      makeVariable({ name: 'red', collectionName: 'colors' }),
      makeVariable({ name: 'blue', collectionName: 'colors', id: 'var-2' }),
      makeVariable({ name: 'sm', collectionName: 'spacing', id: 'var-3', resolvedType: 'FLOAT', valuesByMode: { default: { kind: 'raw', value: 4 } } }),
    ];

    const result = formatToDTCG(vars);
    expect(result.colors).toBeDefined();
    expect(result.spacing).toBeDefined();
  });

  it('outputs alias as refPath string', () => {
    const vars: VariableData[] = [
      makeVariable({
        valuesByMode: {
          default: { kind: 'alias', refPath: '{brand.primary.500}' },
        },
      }),
    ];

    const result = formatToDTCG(vars);
    const token = ((result.brand as Record<string, unknown>).primary as Record<string, unknown>)['500'] as { $value: string };
    expect(token.$value).toBe('{brand.primary.500}');
  });

  it('includes extensions with variableId and modes', () => {
    const vars: VariableData[] = [
      makeVariable({
        valuesByMode: {
          light: { kind: 'raw', value: '#FF0000' },
          dark: { kind: 'raw', value: '#CC0000' },
        },
      }),
    ];

    const result = formatToDTCG(vars);
    const token = ((result.brand as Record<string, unknown>).primary as Record<string, unknown>)['500'] as { $extensions: { 'com.figma': { modes: Record<string, string> } } };
    expect(token.$extensions['com.figma'].modes.light).toBe('#FF0000');
    expect(token.$extensions['com.figma'].modes.dark).toBe('#CC0000');
  });

  it('includes description when present', () => {
    const vars: VariableData[] = [
      makeVariable({ description: 'Primary brand color' }),
    ];

    const result = formatToDTCG(vars);
    const token = ((result.brand as Record<string, unknown>).primary as Record<string, unknown>)['500'] as { $description: string };
    expect(token.$description).toBe('Primary brand color');
  });

  it('round-trips through parser', () => {
    const vars: VariableData[] = [
      makeVariable({ name: 'red', collectionName: 'colors' }),
      makeVariable({ name: 'blue', collectionName: 'colors', id: 'var-2', valuesByMode: { default: { kind: 'raw', value: '#0000FF' } } }),
    ];

    const dtcg = formatToDTCG(vars);
    const parsed = parseDTCGJson(dtcg);

    expect(parsed).toHaveLength(2);
    expect(parsed.map(t => t.name).sort()).toEqual(['blue', 'red']);
    expect(parsed.find(t => t.name === 'red')?.value).toBe('#FF0000');
    expect(parsed.find(t => t.name === 'blue')?.value).toBe('#0000FF');
  });
});
