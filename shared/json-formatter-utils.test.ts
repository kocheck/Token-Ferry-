import { describe, it, expect } from 'vitest';
import { setNestedValue } from './json-formatter-utils';
import type { DTCGGroup, DTCGToken } from './types';

const makeToken = (value: string): DTCGToken => ({
  $type: 'color',
  $value: value,
});

describe('setNestedValue', () => {
  it('sets a single-level key', () => {
    const obj: DTCGGroup = {};
    setNestedValue(obj, ['red'], makeToken('#FF0000'));
    expect(obj.red).toEqual(makeToken('#FF0000'));
  });

  it('creates nested groups for multi-level paths', () => {
    const obj: DTCGGroup = {};
    setNestedValue(obj, ['a', 'b', 'c'], makeToken('#000'));
    expect((obj.a as DTCGGroup).b).toBeDefined();
    expect(((obj.a as DTCGGroup).b as DTCGGroup).c).toEqual(makeToken('#000'));
  });

  it('does nothing for empty path', () => {
    const obj: DTCGGroup = {};
    setNestedValue(obj, [], makeToken('#000'));
    expect(Object.keys(obj)).toHaveLength(0);
  });

  it('overwrites a token with a group when path extends through it', () => {
    const obj: DTCGGroup = {
      a: makeToken('#111'),
    };
    setNestedValue(obj, ['a', 'b'], makeToken('#222'));
    expect(((obj.a as DTCGGroup).b as DTCGToken).$value).toBe('#222');
  });

  it('preserves existing sibling keys in nested groups', () => {
    const obj: DTCGGroup = {};
    setNestedValue(obj, ['group', 'red'], makeToken('#FF0000'));
    setNestedValue(obj, ['group', 'blue'], makeToken('#0000FF'));
    const group = obj.group as DTCGGroup;
    expect(group.red).toEqual(makeToken('#FF0000'));
    expect(group.blue).toEqual(makeToken('#0000FF'));
  });
});
