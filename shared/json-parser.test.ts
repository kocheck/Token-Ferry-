import { describe, it, expect } from 'vitest';
import { parseDTCGJson } from './json-parser';

describe('parseDTCGJson', () => {
  it('parses a flat token', () => {
    const input = {
      primitives: {
        red: {
          $type: 'color' as const,
          $value: '#FF0000',
        },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].path).toBe('primitives.red');
    expect(tokens[0].group).toBe('primitives');
    expect(tokens[0].name).toBe('red');
    expect(tokens[0].type).toBe('color');
    expect(tokens[0].value).toBe('#FF0000');
    expect(tokens[0].isAlias).toBe(false);
  });

  it('parses nested groups', () => {
    const input = {
      brand: {
        color: {
          primary: {
            $type: 'color' as const,
            $value: '#4F3CEC',
          },
        },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].path).toBe('brand.color.primary');
    expect(tokens[0].group).toBe('brand');
    expect(tokens[0].name).toBe('color/primary');
  });

  it('detects alias values', () => {
    const input = {
      semantic: {
        accent: {
          $type: 'color' as const,
          $value: '{primitives.red}',
        },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].isAlias).toBe(true);
    expect(tokens[0].aliasPath).toBe('primitives.red');
  });

  it('skips $-prefixed keys', () => {
    const input = {
      $description: 'Top-level meta' as unknown,
      primitives: {
        $description: 'Group description' as unknown,
        red: {
          $type: 'color' as const,
          $value: '#FF0000',
        },
      },
    } as Record<string, unknown>;

    const tokens = parseDTCGJson(input as Parameters<typeof parseDTCGJson>[0]);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('red');
  });

  it('returns empty array for empty object', () => {
    const tokens = parseDTCGJson({});
    expect(tokens).toHaveLength(0);
  });

  it('extracts Figma modes from extensions', () => {
    const input = {
      brand: {
        blue: {
          $type: 'color' as const,
          $value: '#0000FF',
          $extensions: {
            'com.figma': {
              variableId: 'var-1',
              collection: 'brand',
              modes: { light: '#0000FF', dark: '#3333FF' },
            },
          },
        },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens[0].modes).toEqual({ light: '#0000FF', dark: '#3333FF' });
  });

  it('handles multiple tokens in same group', () => {
    const input = {
      colors: {
        red: { $type: 'color' as const, $value: '#FF0000' },
        green: { $type: 'color' as const, $value: '#00FF00' },
        blue: { $type: 'color' as const, $value: '#0000FF' },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens).toHaveLength(3);
    expect(tokens.map(t => t.name).sort()).toEqual(['blue', 'green', 'red']);
  });

  it('handles non-color token types', () => {
    const input = {
      tokens: {
        spacing: { $type: 'number' as const, $value: 16 },
        label: { $type: 'string' as const, $value: 'Hello' },
        active: { $type: 'boolean' as const, $value: true },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens).toHaveLength(3);
    expect(tokens.find(t => t.type === 'number')?.value).toBe(16);
    expect(tokens.find(t => t.type === 'string')?.value).toBe('Hello');
    expect(tokens.find(t => t.type === 'boolean')?.value).toBe(true);
  });
});
