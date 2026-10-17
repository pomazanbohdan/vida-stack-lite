import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import * as runtime from '../src/lifecycle/runtime-facade.ts';
import { stable, type RuntimeAssuranceContextInput } from '../src/lifecycle/runtime-facade.ts';
import { expectReturned } from './helpers/expect-rejection.ts';
import { callWithUntrustedArguments } from './helpers/untrusted-call.ts';

function assuranceInput(overrides: RuntimeAssuranceContextInput = {}): RuntimeAssuranceContextInput {
  return {
    work_id: 'migration-work',
    revision: 1,
    source_revision: 'source-a',
    lifecycle_state: 'EXECUTE',
    next_action: 'Continue implementation.',
    ...overrides,
  };
}

function errorCode(error: unknown): unknown {
  return error instanceof Error && 'code' in error ? error.code : undefined;
}

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function expectObjectReturned<T extends object>(operation: () => T): T {
  const result: T = expectReturned(operation);
  expect(result).not.toBeNull();
  expect(typeof result).toBe('object');
  return result;
}

describe('runtime facade public boundary', () => {
  test('exposes derived assurance context and a validated same-work status delta', () => {
    const first = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext({
        work_id: 'migration-work',
        revision: 1,
        source_revision: 'source-a',
        lifecycle_state: 'EXECUTE',
        next_action: 'Continue implementation.',
      }),
    );
    expect(first.schema).toBe('RuntimeAssuranceContext/v1');
    expect(Object.isFrozen(first)).toBe(true);
    expect(expectReturned(() => runtime.validateRuntimeAssuranceContext(first))).toBe(first);
    const compact = expectObjectReturned(() => runtime.compactRuntimeAssuranceContext(first));
    expect(compact.context_id).toBe(first.context_id);
    expect(compact).not.toHaveProperty('platform_knowledge_digest');
    expect(() => runtime.compactRuntimeAssuranceContext({ ...first, context_id: '0'.repeat(64) })).toThrow(
      /digest invalid/,
    );
    const unchanged = expectObjectReturned(() => runtime.statusDelta(first, first));
    expect(unchanged.status).toBe('unchanged');
    expect(expectReturned(() => runtime.validateStatusDelta(unchanged))).toBe(unchanged);
    const second = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext({
        ...first,
        revision: 2,
        lifecycle_state: 'VERIFY',
        next_action: 'Verify result.',
      }),
    );
    const delta = expectObjectReturned(() => runtime.statusDelta(first, second));
    expect(delta.schema).toBe('RuntimeStatusDelta/v1');
    expect(expectReturned(() => runtime.validateStatusDelta(delta))).toBe(delta);
    expect(delta.status).toBe('changed');
    expect(delta.changed).toContainEqual({ field: 'revision', value: 2 });
    expect(delta.watermark).toEqual({ context_id: second.context_id, revision: 2 });
    expect(() => runtime.validateRuntimeAssuranceContext({ ...first, authority: 'trusted' })).toThrow(
      /authority invalid/,
    );
    expect(() => runtime.statusDelta(first, { ...second, work_id: 'other-work' })).toThrow();
    const otherWork = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(assuranceInput({ work_id: 'other-work' })),
    );
    expect(() => runtime.statusDelta(first, otherWork)).toThrow(/work id mismatch/);
  });

  test('canonicalizes nested context values without changing array order', () => {
    expect(expectReturned(() => stable({ b: [2, { y: 2, x: 1 }], a: 1 }))).toBe('{"a":1,"b":[2,{"x":1,"y":2}]}');
    expect(expectReturned(() => stable({ a: 1, b: [2, { x: 1, y: 2 }] }))).toBe(
      expectReturned(() => stable({ b: [2, { y: 2, x: 1 }], a: 1 })),
    );
    expect(expectReturned(() => stable([1, 2]))).not.toBe(expectReturned(() => stable([2, 1])));
  });

  test('rejects malformed assurance identities before they become status evidence', () => {
    expect(() => runtime.buildRuntimeAssuranceContext()).toThrow('assurance context work id missing');
    for (const input of [null, [], 'not an object'])
      expect(() => callWithUntrustedArguments(runtime.buildRuntimeAssuranceContext, [input])).toThrow();
    for (const input of [null, 'not an object'])
      expect(() => callWithUntrustedArguments(runtime.buildRuntimeAssuranceContext, [input])).toThrow(
        'assurance context input required',
      );
    const invalidFields: readonly (readonly [string, readonly unknown[]])[] = [
      ['work_id', [undefined, '', '  ']],
      ['source_revision', [undefined, '', '  ']],
      ['lifecycle_state', [undefined, '', '  ']],
      ['next_action', [undefined, '', '  ']],
      ['revision', [0, -1, 1.5, '1']],
      ['sealed_revision', [0, -1, 1.5, '1']],
      ['packet_version', [0, -1, 1.5, '1']],
      ['wave', [0, -1, 1.5, '1']],
      ['generation', [0, -1, 1.5, '1']],
      ['requested_reviewers', [0, -1, 1.5, '1']],
      ['implementation_fingerprint', ['', 'A'.repeat(64), 'g'.repeat(64), `x${'a'.repeat(64)}`, `${'a'.repeat(64)}x`]],
      ['platform_knowledge_digest', ['', 'A'.repeat(64), 'g'.repeat(64), `x${'a'.repeat(64)}`, `${'a'.repeat(64)}x`]],
      [
        'documentation_inventory_digest',
        ['', 'A'.repeat(64), 'g'.repeat(64), `x${'a'.repeat(64)}`, `${'a'.repeat(64)}x`],
      ],
    ];
    for (const [field, values] of invalidFields)
      for (const value of values)
        expect(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ [field]: value }))).toThrow();
    expect(
      expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: null }))).revision,
    ).toBeNull();
    expect(
      expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ packet_version: null })))
        .packet_version,
    ).toBeNull();
    expect(
      expectObjectReturned(() =>
        runtime.buildRuntimeAssuranceContext(assuranceInput({ source_revision: ' source-a ' })),
      ).source_revision,
    ).toBe('source-a');
    const notText = { toString: () => 'a'.repeat(64) };
    const identityCases: readonly (readonly [string, unknown])[] = [
      ['work_id', 123],
      ['implementation_fingerprint', notText],
    ];
    for (const [field, value] of identityCases) {
      try {
        runtime.buildRuntimeAssuranceContext(assuranceInput({ [field]: value }));
        throw new Error('expected invalid assurance identity to be blocked');
      } catch (error) {
        expect(errorCode(error)).toBe('GATE_BLOCKED');
      }
    }
  });

  test('binds packet fallback, explicit precedence, and documentation status into the context', () => {
    const packet = {
      sealed_revision: 2,
      implementation_fingerprint: 'a'.repeat(64),
      packet_id: 'packet-a',
      packet_version: 3,
      wave: 4,
      generation: 5,
    };
    const inherited = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ packet })));
    for (const [field, value] of Object.entries(packet)) expect(inherited[field]).toEqual(value);
    const explicit = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(assuranceInput({ packet, sealed_revision: 6, packet_id: 'packet-b' })),
    );
    expect(explicit.sealed_revision).toBe(6);
    expect(explicit.packet_id).toBe('packet-b');
    expect(explicit.context_id).not.toBe(inherited.context_id);
    expect(
      expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ packet: null }))).packet_id,
    ).toBeNull();
    const callablePacket = Object.assign(() => {}, { packet_id: 'not-an-object' });
    expect(
      expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ packet: callablePacket })))
        .packet_id,
    ).toBeNull();
    expect(inherited).not.toHaveProperty('documentation_clear_id');
    const omittedDocumentation = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()));
    const explicitNullDocumentation = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_clear_id: null })),
    );
    expect(explicitNullDocumentation).toHaveProperty('documentation_clear_id', null);
    expect(explicitNullDocumentation.context_id).not.toBe(omittedDocumentation.context_id);
    const documented = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_clear_id: 'clear-a' })),
    );
    expect(documented.documentation_clear_id).toBe('clear-a');
    expect(documented.documentation_inventory_digest).toBeNull();
    expect(documented.current_documentation_artifact).toBeNull();
    const artifactOnly = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(assuranceInput({ current_documentation_artifact: 'doc-a' })),
    );
    expect(artifactOnly.current_documentation_artifact).toBe('doc-a');
    expect(artifactOnly.documentation_clear_id).toBeNull();
    expect(
      expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()))
        .documentation_skill_validation_status,
    ).toBeNull();
    for (const status of [undefined, null, 'pass', 'warning', 'changes_required'])
      expect(
        expectObjectReturned(() =>
          runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_skill_validation_status: status })),
        ),
      ).toBeDefined();
    for (const status of ['unknown', 1, {}, []])
      expect(() =>
        runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_skill_validation_status: status })),
      ).toThrow();
  });

  test('reports every bound assurance status change with the current watermark', () => {
    const baseline = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(
        assuranceInput({
          documentation_clear_id: null,
          documentation_inventory_digest: null,
          current_documentation_artifact: null,
        }),
      ),
    );
    const changes: readonly (readonly [string, unknown])[] = [
      ['revision', 2],
      ['source_revision', 'source-b'],
      ['lifecycle_state', 'VERIFY'],
      ['sealed_revision', 2],
      ['implementation_fingerprint', 'a'.repeat(64)],
      ['packet_id', 'packet-b'],
      ['packet_version', 2],
      ['wave', 2],
      ['generation', 2],
      ['review_mode', 'blind'],
      ['requested_reviewers', 3],
      ['capability_epoch', 'epoch-b'],
      ['lease_expires_at', '2026-09-21T00:00:00.000Z'],
      ['platform_knowledge_context_id', 'knowledge-b'],
      ['platform_knowledge_digest', 'b'.repeat(64)],
      ['documentation_skill_validation_status', 'pass'],
      ['documentation_clear_id', 'clear-b'],
      ['documentation_inventory_digest', 'c'.repeat(64)],
      ['current_documentation_artifact', 'doc-b'],
      ['next_action', 'Verify result.'],
    ];
    for (const [field, value] of changes) {
      const current = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext({ ...baseline, [field]: value }));
      const delta = expectObjectReturned(() => runtime.statusDelta(baseline, current));
      expect(delta.status).toBe('changed');
      expect(delta.changed).toEqual([{ field, value }]);
      expect(delta.from_revision).toBe(baseline.revision);
      expect(delta.to_revision).toBe(current.revision);
      expect(delta.context_id).toBe(current.context_id);
      expect(delta.watermark).toEqual({ context_id: current.context_id, revision: current.revision });
      expect(expectReturned(() => runtime.validateStatusDelta(delta))).toBe(delta);
    }
  });

  test('compares nested artifact values while keeping next action outside identity', () => {
    const artifactA = { path: 'docs/result.md', sha256: 'a'.repeat(64), metadata: { owner: 'agent' } };
    const artifactB = { metadata: { owner: 'agent' }, sha256: 'a'.repeat(64), path: 'docs/result.md' };
    const first = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(assuranceInput({ current_documentation_artifact: artifactA })),
    );
    const sameArtifact = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(assuranceInput({ current_documentation_artifact: artifactB })),
    );
    expect(first.context_id).toBe('630464eb9c32be44b9e839cae1c005ae97ac68f8f24edef6f2290792731d0255');
    expect(first.context_id).toBe(sameArtifact.context_id);
    expect(expectObjectReturned(() => runtime.statusDelta(first, sameArtifact))).toMatchObject({
      status: 'unchanged',
      changed: [],
    });

    const nextActionChanged = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext({ ...sameArtifact, next_action: 'Review the result.' }),
    );
    expect(nextActionChanged.context_id).toBe(sameArtifact.context_id);
    expect(expectObjectReturned(() => runtime.statusDelta(sameArtifact, nextActionChanged))).toMatchObject({
      status: 'changed',
      changed: [{ field: 'next_action', value: 'Review the result.' }],
    });
    const withoutArtifact = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()));
    const removed = expectObjectReturned(() => runtime.statusDelta(first, withoutArtifact));
    expect(removed.changed).toContainEqual({ field: 'current_documentation_artifact', value: null });
    expect(expectReturned(() => runtime.validateStatusDelta(removed))).toBe(removed);
  });

  test('owns a nested artifact snapshot without freezing caller input', () => {
    const artifact = { path: 'docs/result.md', metadata: { owner: 'agent' } };
    const context = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(assuranceInput({ current_documentation_artifact: artifact })),
    );
    const originalId = context.context_id;
    artifact.metadata.owner = 'caller';
    artifact.path = 'docs/changed.md';
    expect(artifact.path).toBe('docs/changed.md');
    expect(context.current_documentation_artifact).toEqual({
      path: 'docs/result.md',
      metadata: { owner: 'agent' },
    });
    expect(context.context_id).toBe(originalId);
    expect(expectReturned(() => runtime.validateRuntimeAssuranceContext(context))).toBe(context);
  });

  test('rejects values outside canonical JSON while preserving the open artifact JSON domain', () => {
    const valid = expectObjectReturned(() =>
      runtime.buildRuntimeAssuranceContext(
        assuranceInput({ current_documentation_artifact: { path: 'docs/result.md', labels: ['current'] } }),
      ),
    );
    expect(valid.current_documentation_artifact).toEqual({ path: 'docs/result.md', labels: ['current'] });
    for (const artifact of [{ value: Number.NaN }, { value: 9007199254740992 }])
      expect(() =>
        runtime.buildRuntimeAssuranceContext(assuranceInput({ current_documentation_artifact: artifact })),
      ).toThrow();
    expect(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 9007199254740992 }))).toThrow();
  });

  test('keeps the historical context digest bytes for a valid scalar context', () => {
    const context = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()));
    const historicalIdentity =
      '{"capability_epoch":null,"documentation_skill_validation_status":null,"generation":null,"implementation_fingerprint":null,"lease_expires_at":null,"lifecycle_state":"EXECUTE","packet_id":null,"packet_version":null,"platform_knowledge_context_id":null,"platform_knowledge_digest":null,"requested_reviewers":null,"review_mode":null,"revision":1,"sealed_revision":null,"source_revision":"source-a","wave":null,"work_id":"migration-work"}';
    expect(expectReturned(() => stable(JSON.parse(historicalIdentity)))).toBe(historicalIdentity);
    expect(context.context_id).toBe(createHash('sha256').update(historicalIdentity).digest('hex'));
  });

  test('rejects deltas that the closed builder contract cannot produce', () => {
    const first = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()));
    const second = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 })));
    const delta = expectObjectReturned(() => runtime.statusDelta(first, second));
    expect(() => runtime.validateStatusDelta({ ...delta, changed: [] })).toThrow();
    expect(() =>
      runtime.validateStatusDelta({
        ...delta,
        changed: [
          { field: 'revision', value: 2 },
          { field: 'revision', value: 3 },
        ],
      }),
    ).toThrow();
    expect(() =>
      runtime.validateStatusDelta({ ...delta, changed: [{ field: 'not_a_delta_field', value: 2 }] }),
    ).toThrow();
  });

  test('rejects malformed status deltas and tampered contexts', () => {
    const first = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()));
    const second = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 })));
    const delta = expectObjectReturned(() => runtime.statusDelta(first, second));
    for (const changed of [
      { schema: 'Wrong/v1' },
      { status: 'approved' },
      { work_id: '' },
      { from_revision: 0 },
      { to_revision: 0 },
      { context_id: 'not-a-digest' },
      { context_id: `x${'a'.repeat(64)}` },
      { context_id: `${'a'.repeat(64)}x` },
      { changed: {} },
      { status: 'unchanged' },
      { next_action: ' ' },
    ])
      expect(() => runtime.validateStatusDelta({ ...delta, ...changed })).toThrow();
    for (const changed of [
      { schema: 'Wrong/v1' },
      { context_id: '0'.repeat(64) },
      { next_action: '' },
      { authority: 'trusted' },
      { revision: 0 },
      { implementation_fingerprint: 'bad' },
      { documentation_skill_validation_status: 'unknown' },
    ])
      expect(() => runtime.validateRuntimeAssuranceContext({ ...first, ...changed })).toThrow();
    expect(() => runtime.statusDelta({ ...first, next_action: '' }, second)).toThrow(/next action/);
    expect(() => {
      Reflect.apply(runtime.statusDelta, undefined, [first, { ...second, authority: 'trusted' }]);
    }).toThrow(/authority invalid/);
    for (const value of [null, [], { ...first, schema: 'Wrong/v1' }])
      expect(() => runtime.validateRuntimeAssuranceContext(value)).toThrow(/schema invalid/);
    expect(() => runtime.validateRuntimeAssuranceContext(Object.assign(() => {}, first))).toThrow(/schema invalid/);
    for (const value of [null, [], { ...delta, schema: 'Wrong/v1' }, { ...delta, status: 'approved' }])
      expect(() => runtime.validateStatusDelta(value)).toThrow(/delta invalid/);
    expect(() => runtime.validateStatusDelta(Object.assign(() => {}, delta))).toThrow(/delta invalid/);
    try {
      runtime.validateStatusDelta(null);
      throw new Error('expected a blocked status delta');
    } catch (error) {
      expect(errorCode(error)).toBe('GATE_BLOCKED');
    }
    for (const value of [null, 'not an object']) {
      try {
        runtime.validateRuntimeAssuranceContext(value);
        throw new Error('expected invalid context to be blocked');
      } catch (error) {
        expect(errorCode(error)).toBe('GATE_BLOCKED');
      }
    }
    const identityValues = Object.fromEntries(
      Object.entries(first).filter(([key]) => !['schema', 'context_id', 'next_action', 'authority'].includes(key)),
    );
    const invalidStatus = { ...identityValues, documentation_skill_validation_status: 'invalid' };
    const invalidSerialized = expectReturned(() => stable(invalidStatus));
    expect(typeof invalidSerialized).toBe('string');
    const invalidDigest = createHash('sha256').update(invalidSerialized).digest('hex');
    expect(() =>
      runtime.validateRuntimeAssuranceContext({
        ...first,
        documentation_skill_validation_status: 'invalid',
        context_id: invalidDigest,
      }),
    ).toThrow(/documentation validation status invalid/);
  });

  test('requires complete v1 delta shape and a matching watermark', () => {
    const first = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()));
    const second = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 })));
    const delta = expectObjectReturned(() => runtime.statusDelta(first, second));
    for (const field of Object.keys(delta)) {
      const incomplete = { ...delta };
      delete incomplete[field];
      expect(() => runtime.validateStatusDelta(incomplete)).toThrow();
    }
    for (const invalid of [
      { ...delta, extra: true },
      { ...delta, context_id: null },
      { ...delta, from_revision: undefined },
      { ...delta, to_revision: undefined },
      { ...delta, watermark: null },
      { ...delta, watermark: { context_id: first.context_id, revision: second.revision } },
      { ...delta, watermark: { context_id: second.context_id, revision: first.revision } },
      { ...delta, watermark: { context_id: second.context_id } },
      { ...delta, watermark: { context_id: second.context_id, revision: second.revision, extra: true } },
      { ...delta, changed: [null] },
      { ...delta, changed: [{ field: 'revision' }] },
      { ...delta, changed: [{ field: '', value: 2 }] },
      { ...delta, changed: [{ field: ' revision ', value: 2 }] },
      { ...delta, changed: [{ field: 1, value: 2 }] },
      { ...delta, changed: [{ field: 'revision', value: 2, extra: true }] },
    ])
      expect(() => runtime.validateStatusDelta(invalid)).toThrow();
    expect(expectReturned(() => runtime.validateStatusDelta(delta))).toBe(delta);
  });

  test('blocks malformed v1 delta objects with governed diagnostics', () => {
    const first = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()));
    const second = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 })));
    const delta = expectObjectReturned(() => runtime.statusDelta(first, second));
    const blocked = (input: unknown, message?: string) => {
      let rejected = false;
      let failure: unknown;
      try {
        runtime.validateStatusDelta(input);
      } catch (error) {
        rejected = true;
        failure = error;
      }
      expect(rejected).toBe(true);
      expect(errorCode(failure)).toBe('GATE_BLOCKED');
      if (message) expect(errorMessage(failure)).toBe(message);
    };
    blocked({ ...delta, extra: true }, 'assurance status delta fields invalid');
    blocked({ ...delta, from_revision: undefined }, 'assurance status delta revisions invalid');
    blocked(
      { ...delta, to_revision: undefined, watermark: { ...delta.watermark, revision: undefined } },
      'assurance status delta revisions invalid',
    );
    blocked({ ...delta, context_id: null }, 'assurance status delta context id invalid');
    blocked({ ...delta, changed: [{}] }, 'assurance status delta change invalid');
    blocked({ ...delta, changed: [{ field: '', value: 1 }] }, 'assurance status delta change field missing');
    blocked({ ...delta, watermark: null }, 'assurance status delta watermark invalid');
    blocked(
      { ...delta, watermark: { context_id: first.context_id, revision: delta.to_revision } },
      'assurance status delta watermark mismatch',
    );
    blocked({ ...delta, changed: [null] });
    blocked({ ...delta, changed: [{ field: 'revision', extra: true }] });
    blocked({ ...delta, changed: [Object.assign([], { field: 'revision', value: 2 })] });
    blocked({ ...delta, changed: [Object.assign(() => {}, { field: 'revision', value: 2 })] });
  });

  test('reports the invalid assurance field and status delta in blocked diagnostics', () => {
    const fieldCases: readonly (readonly [string, unknown, string])[] = [
      ['work_id', undefined, 'work id missing'],
      ['revision', 0, 'revision invalid'],
      ['source_revision', undefined, 'source revision missing'],
      ['lifecycle_state', undefined, 'lifecycle state missing'],
      ['sealed_revision', 0, 'sealed revision invalid'],
      ['implementation_fingerprint', 'bad', 'fingerprint invalid'],
      ['packet_id', 123, 'packet id missing'],
      ['packet_version', 0, 'packet version invalid'],
      ['wave', 0, 'wave invalid'],
      ['generation', 0, 'generation invalid'],
      ['review_mode', 123, 'review mode missing'],
      ['requested_reviewers', 0, 'reviewer count invalid'],
      ['capability_epoch', 123, 'capability epoch missing'],
      ['lease_expires_at', 123, 'lease expiry missing'],
      ['platform_knowledge_context_id', 123, 'knowledge id missing'],
      ['platform_knowledge_digest', 'bad', 'knowledge digest invalid'],
      ['documentation_clear_id', 123, 'documentation CLEAR id missing'],
      ['documentation_inventory_digest', 'bad', 'documentation inventory digest invalid'],
      ['next_action', '', 'next action missing'],
    ];
    for (const [field, value, suffix] of fieldCases) {
      try {
        runtime.buildRuntimeAssuranceContext(assuranceInput({ [field]: value }));
        throw new Error('expected invalid assurance field to be blocked');
      } catch (error) {
        expect(errorCode(error)).toBe('GATE_BLOCKED');
        expect(errorMessage(error)).toBe(`assurance context ${suffix}`);
      }
    }
    try {
      runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_skill_validation_status: 'unknown' }));
      throw new Error('expected invalid documentation status to be blocked');
    } catch (error) {
      expect(errorCode(error)).toBe('GATE_BLOCKED');
      expect(errorMessage(error)).toBe('assurance context documentation validation status invalid');
    }

    const first = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput()));
    const second = expectObjectReturned(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 })));
    const delta = expectObjectReturned(() => runtime.statusDelta(first, second));
    const deltaCases: readonly { readonly change: Record<string, unknown>; readonly suffix: string }[] = [
      { change: { work_id: '' }, suffix: 'delta work id missing' },
      { change: { from_revision: 0 }, suffix: 'delta from revision invalid' },
      { change: { to_revision: 0 }, suffix: 'delta to revision invalid' },
      { change: { context_id: 'bad' }, suffix: 'delta context id invalid' },
      { change: { changed: {} }, suffix: 'delta changes invalid' },
      { change: { status: 'unchanged' }, suffix: 'unchanged delta has changes' },
      { change: { next_action: '' }, suffix: 'delta next action missing' },
    ];
    for (const { change, suffix } of deltaCases) {
      try {
        runtime.validateStatusDelta({ ...delta, ...change });
        throw new Error('expected invalid status delta to be blocked');
      } catch (error) {
        expect(errorCode(error)).toBe('GATE_BLOCKED');
        expect(errorMessage(error)).toBe(`assurance status ${suffix}`);
      }
    }
  });
});
