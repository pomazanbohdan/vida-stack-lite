import { describe, expect, test } from 'bun:test';
import { getWorkItemType, WORK_ITEM_TYPES } from '../src/work-items/catalog.js';

describe('canonical work item catalog', () => {
  test('resolves each existing kind and stable code exactly', () => {
    expect(WORK_ITEM_TYPES).toEqual([
      { kind: 'epic', code: 'EPIC' },
      { kind: 'feature', code: 'FEATURE' },
      { kind: 'pbi', code: 'PBI' },
      { kind: 'story', code: 'STORY' },
      { kind: 'bug', code: 'BUG' },
      { kind: 'task', code: 'TASK' },
      { kind: 'research', code: 'RESEARCH' },
    ]);
    for (const entry of WORK_ITEM_TYPES) {
      expect(getWorkItemType(entry.kind)).toBe(entry);
      expect(getWorkItemType(entry.code)).toBe(entry);
    }
    expect(Object.isFrozen(WORK_ITEM_TYPES)).toBe(true);
    expect(WORK_ITEM_TYPES.every(Object.isFrozen)).toBe(true);
  });

  test('does not normalize casing or accept unknown values', () => {
    expect(getWorkItemType('Pbi')).toBeUndefined();
    expect(getWorkItemType('task')).toBe(WORK_ITEM_TYPES[5]);
    expect(getWorkItemType('CUSTOM')).toBeUndefined();
    expect(getWorkItemType('')).toBeUndefined();
  });
});
