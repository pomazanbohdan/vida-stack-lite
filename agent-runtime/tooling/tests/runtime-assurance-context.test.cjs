'use strict';

const context = require('../../lib/runtime-assurance-context.cjs');
const runtime = require('../../lib/runtime.cjs');
const { checkpoint } = require('./fixtures.cjs');

function current(overrides = {}) {
  const c = checkpoint(overrides);
  return runtime.assuranceContextForCheckpoint(c);
}

describe('shared runtime assurance context', () => {
  test('builds a compact immutable context with a stable digest', () => {
    const value = current();
    expect(value.schema).toBe('RuntimeAssuranceContext/v1');
    expect(value.context_id).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(value)).toBe(true);
    expect(context.compact(value)).toMatchObject({ work_id: value.work_id, context_id: value.context_id, revision: value.revision });
    expect(() => context.validate(value)).not.toThrow();
  });

  test('supports unsealed checkpoints without inventing fingerprint or packet authority', () => {
    const value = current({ lifecycle_state: 'PLAN', sealed_revision: undefined, sealed_at: undefined, implementation_fingerprint: undefined, review_packet: undefined, review_generation: 0 });
    expect(value.sealed_revision).toBeNull();
    expect(value.implementation_fingerprint).toBeNull();
    expect(value.packet_id).toBeNull();
    expect(() => context.validate(value)).not.toThrow();
  });

  test('rejects tampered context and authority', () => {
    const value = current();
    expect(() => context.validate({ ...value, source_revision: 'tampered' })).toThrow(/digest invalid/);
    expect(() => context.validate({ ...value, authority: 'runtime_authority' })).toThrow(/authority invalid/);
    expect(() => context.compact({ ...value, context_id: 'b'.repeat(64) })).toThrow(/digest invalid/);
  });

  test('returns only changed fields and a reusable watermark', () => {
    const previous = current();
    const next = current({ revision: previous.revision + 1, next_action: 'Record the next receipt.' });
    const delta = context.statusDelta(previous, next);
    expect(delta).toMatchObject({ schema: 'RuntimeStatusDelta/v1', status: 'changed', from_revision: 9, to_revision: 10, work_id: previous.work_id });
    expect(delta.changed).toEqual([{ field: 'revision', value: 10 }, { field: 'next_action', value: 'Record the next receipt.' }]);
    expect(delta.watermark).toEqual({ context_id: next.context_id, revision: next.revision });
    expect(() => context.validateDelta(delta)).not.toThrow();
  });

  test('returns an empty delta for an unchanged context', () => {
    const value = current();
    const delta = context.statusDelta(value, value);
    expect(delta).toMatchObject({ status: 'unchanged', changed: [], from_revision: 9, to_revision: 9 });
    expect(() => context.validateDelta(delta)).not.toThrow();
  });

  test('rejects cross-work deltas and malformed delta status', () => {
    expect(() => context.statusDelta(current(), current({ work_id: 'other-work' }))).toThrow(/work id mismatch/);
    expect(() => context.validateDelta({ schema: 'RuntimeStatusDelta/v1', status: 'unchanged', work_id: 'w', from_revision: 1, to_revision: 1, context_id: 'a'.repeat(64), changed: [{ field: 'revision', value: 1 }], next_action: 'next', watermark: { context_id: 'a'.repeat(64), revision: 1 } })).toThrow(/unchanged delta has changes/);
    expect(() => context.validateDelta({ schema: 'RuntimeStatusDelta/v1', status: 'changed', work_id: 'w', from_revision: 1, to_revision: 2, context_id: 'a'.repeat(64), changed: null, next_action: 'next', watermark: { context_id: 'a'.repeat(64), revision: 2 } })).toThrow(/changes invalid/);
    expect(() => context.validateDelta({ schema: 'RuntimeStatusDelta/v1', status: 'unknown', work_id: 'w', from_revision: 1, to_revision: 2, context_id: 'a'.repeat(64), changed: [], next_action: 'next', watermark: { context_id: 'a'.repeat(64), revision: 2 } })).toThrow(/delta invalid/);
  });

  test('rejects malformed context primitives without mixing authority', () => {
    expect(context.stable([1, 2])).toBe('[1,2]');
    expect(() => context.build(null)).toThrow(/input required/);
    expect(() => context.validate({})).toThrow(/schema invalid/);
    expect(() => context.build({ ...checkpoint(), work_id: '', next_action: 'next' })).toThrow(/work id missing/);
    expect(() => context.build({ ...checkpoint(), next_action: 'next', revision: 0 })).toThrow(/revision invalid/);
    expect(() => context.build({ ...checkpoint(), next_action: 'next', implementation_fingerprint: 'bad' })).toThrow(/fingerprint invalid/);
    expect(() => context.validateDelta({ schema: 'RuntimeStatusDelta/v1', status: 'changed', work_id: 'w', from_revision: 1, to_revision: 2, context_id: 'bad', changed: [], next_action: 'next', watermark: { context_id: 'bad', revision: 2 } })).toThrow(/context id invalid/);
    expect(() => runtime.statusDelta(current(), current({ revision: 10 }))).not.toThrow();
  });
});
