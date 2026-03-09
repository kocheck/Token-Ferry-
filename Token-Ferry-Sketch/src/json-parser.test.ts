import { describe, it, expect } from 'vitest';
import { parseDTCGJson } from './json-parser';

describe('parseDTCGJson', () => {
  it('parses a flat token', () => {
    const input = {
      primitives: {
        red: { $type: 'color' as const, $value: '#FF0000' },
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
          primary: { $type: 'color' as const, $value: '#4F3CEC' },
        },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens[0].path).toBe('brand.color.primary');
    expect(tokens[0].name).toBe('color/primary');
    expect(tokens[0].group).toBe('brand');
  });

  it('detects alias values', () => {
    const input = {
      semantic: {
        accent: { $type: 'color' as const, $value: '{primitives.red}' },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens[0].isAlias).toBe(true);
    expect(tokens[0].aliasPath).toBe('primitives.red');
  });

  it('skips $-prefixed keys', () => {
    const input = {
      primitives: {
        red: { $type: 'color' as const, $value: '#FF0000' },
      },
    };
    // Add $description at root
    (input as Record<string, unknown>).$description = 'Should be skipped';

    const tokens = parseDTCGJson(input as Parameters<typeof parseDTCGJson>[0]);
    expect(tokens).toHaveLength(1);
  });

  it('returns empty array for empty object', () => {
    expect(parseDTCGJson({})).toHaveLength(0);
  });

  it('handles multiple tokens', () => {
    const input = {
      colors: {
        red: { $type: 'color' as const, $value: '#FF0000' },
        blue: { $type: 'color' as const, $value: '#0000FF' },
      },
    };

    const tokens = parseDTCGJson(input);
    expect(tokens).toHaveLength(2);
  });
});
