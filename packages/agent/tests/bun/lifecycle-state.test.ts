import { describe, expect, test } from 'bun:test';
import {
  LifecycleStateError,
  transitionLifecycleState,
  validateLifecycleAggregate,
  validateLifecycleProgress,
  validateLifecycleReferencePreservation,
  type DocumentationVerificationContext,
  type LifecycleArtifactKind,
  type LifecycleArtifactReference,
  type LifecycleWorkState,
} from '../../src/lifecycle/lifecycle-state.ts';
import {
  executeDocumentationClearOperation,
  verifyDocumentationClearReference,
  type DocumentationClearInput,
} from '../../src/documentation/clear.ts';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectAsyncReturned, expectReturned } from '../helpers/expect-rejection.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;
type MutableWork = Mutable<LifecycleWorkState>;
type MutableReference = Mutable<LifecycleArtifactReference>;
type ClearInput = Omit<DocumentationClearInput, 'phase' | 'baseline' | 'baseline_path'>;

function clearFixture(): { root: string; write: (relative: string, content: string | Uint8Array) => void } {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-lifecycle-'));
  const write = (relative: string, content: string | Uint8Array): void => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  mkdirSync(path.join(root, '.git'));
  const templates: readonly (readonly [string, string])[] = [
    ['AGENTS.md', 'AGENTS.template.md'],
    ['AGENT.sidecar.md', 'AGENT.sidecar.template.md'],
    ['agent-runtime.config.v1.yaml', 'agent-runtime.config.template.v1.yaml'],
  ];
  for (const [destination, template] of templates)
    write(
      destination,
      readFileSync(path.join(packageRoot, 'templates', template), 'utf8')
        .replaceAll('{{REPOSITORY}}', 'creatio-sample-repository')
        .replaceAll('{{PROJECTS}}', 'refactoring')
        .replaceAll('{{PROJECT}}', 'refactoring')
        .replaceAll('{{BUNDLE}}', 'vida-agent'),
    );
  write(
    'vida-agent/schemas/documentation-policy.v1.schema.json',
    readFileSync(path.join(packageRoot, 'schemas/documentation-policy.v1.schema.json')),
  );
  write('vida-agent/TESTING.md', 'fixture testing\n');
  write('docs/creatio/map.md', 'map\n');
  write('docs/agent-instructions/index.md', 'index\n');
  write('docs/agent-instructions/current.md', 'current\n');
  write(
    'docs/agent-instructions/documentation-policy.v1.json',
    JSON.stringify({
      schema: 'DocumentationPolicy/v1',
      policy_id: 'lifecycle-clear',
      project_id: 'refactoring',
      source_path: 'docs/agent-instructions/documentation-policy.v1.json',
      owner: 'project:refactoring',
      required: true,
      canonical_roots: ['docs/agent-instructions'],
      map_paths: ['docs/agent-instructions/index.md'],
      excluded_roots: ['.agent', '.planning'],
      changelog_required: false,
      changelog_path: null,
      relations: ['owns'],
      updated_at: new Date().toISOString(),
    }) + '\n',
  );
  write(
    '.agent/work/lifecycle-clear/scope.json',
    JSON.stringify({
      schema: 'ImplementationScope/v1',
      work_id: 'lifecycle-clear',
      source_revision: 'source-1',
      allowed_paths: ['src/task.ts'],
    }) + '\n',
  );
  return { root, write };
}

const hash = (character: string): string => character.repeat(64);
const clone = <T>(value: T): T => structuredClone(value);
function clearRecordId(serialized: string): string {
  const record: unknown = JSON.parse(serialized);
  if (typeof record !== 'object' || record === null || !('clear_id' in record) || typeof record.clear_id !== 'string')
    throw new Error('documentation CLEAR record id missing');
  return record.clear_id;
}
function initialWork(): MutableWork {
  const binding = {
    work_source_revision: 'source-1',
    scope_id: 'scope-1',
    ac_ids: ['AC-1'],
    implementation_paths: ['src/task.ts'],
    allowed_resources: ['file:src/task.ts'],
    config_digest: hash('a'),
    schema_digest: hash('b'),
    runtime_code_digest: hash('c'),
  };
  return {
    revision: 1,
    binding,
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: binding.work_source_revision,
      next_action: 'Trace the accepted request.',
      route: 'R3',
      risk: 'high',
      change_kind: 'migration',
      config_binding: {
        config_digest: binding.config_digest,
        schema_digest: binding.schema_digest,
        runtime_code_digest: binding.runtime_code_digest,
      },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: ['src/task.ts'],
        fingerprint_paths: ['src/task.ts'],
        implementation_paths: ['src/task.ts'],
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'epoch-1',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
  };
}
function reference(
  work: LifecycleWorkState,
  kind: LifecycleArtifactKind,
  id: string,
  extra: Partial<MutableReference> = {},
): MutableReference {
  return {
    schema: 'LifecycleArtifactReference/v1',
    kind,
    artifact_schema: 'Evidence/v1',
    record_id: id,
    path: `.agent/${id}.json`,
    sha256: hash('d'),
    source_revision: work.lifecycle.source_revision,
    scope_id: work.lifecycle.scope.scope_id,
    ac_ids: ['AC-1'],
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: null,
    decision: null,
    disposition: 'current',
    ...extra,
  };
}
function samePhase(
  work: MutableWork,
  mutate: (next: MutableWork) => void,
  context?: DocumentationVerificationContext,
): MutableWork {
  const next = clone(work);
  next.revision++;
  next.lifecycle.revision++;
  mutate(next);
  expectReturned(() => validateLifecycleProgress(work, next, context));
  return next;
}
function add(work: MutableWork, ...references: MutableReference[]): MutableWork {
  return samePhase(work, (next) => next.lifecycle.references.push(...references));
}

test('rejects unsafe and aliased values in every public lifecycle scope path list', () => {
  const fields = ['allowed_paths', 'fingerprint_paths', 'implementation_paths', 'documentation_paths'] as const;
  for (const field of fields) {
    const unsafe = initialWork();
    const original = unsafe.lifecycle.scope[field];
    unsafe.lifecycle.scope[field] = [...original, '../outside.ts'];
    expect(() => validateLifecycleAggregate(unsafe)).toThrow(`${field.replaceAll('_', ' ')} contains an unsafe path`);

    const aliased = initialWork();
    const base = aliased.lifecycle.scope[field];
    aliased.lifecycle.scope[field] =
      field === 'documentation_paths' ? ['docs/Guide.md', 'docs/guide.md'] : [...base, 'SRC/task.ts'];
    expect(() => validateLifecycleAggregate(aliased)).toThrow(
      `${field.replaceAll('_', ' ')} contains aliases or duplicates`,
    );
  }
});

describe('current WorkState/v1 lifecycle aggregate', () => {
  test('executes the full lifecycle through current typed evidence bindings', async () => {
    const fixture = clearFixture();
    const cleanupDeadline = performance.now() + 5_000;
    let completed = false;
    try {
      let work = initialWork();
      expectReturned(() => validateLifecycleAggregate(work));
      work = expectReturned(() => transitionLifecycleState(work, 'TRACE', 'Freeze the current plan.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      work = add(
        work,
        reference(work, 'source_plan', 'source-plan'),
        reference(work, 'acceptance_manifest', 'acceptance'),
        reference(work, 'implementation_scope', 'scope'),
      );
      work = expectReturned(() => transitionLifecycleState(work, 'PLAN', 'Bind execution authority.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      work = add(
        work,
        reference(work, 'execution_approval', 'approval', { decision: 'approved' }),
        reference(work, 'platform_knowledge', 'knowledge'),
        reference(work, 'implementation_policy', 'policy'),
        reference(work, 'change_impact_pre', 'impact-pre'),
        reference(work, 'documentation_validation', 'docs-pre', { decision: 'pass' }),
      );
      work = expectReturned(() => transitionLifecycleState(work, 'EXECUTE', 'Implement the accepted scope.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      const fingerprint = hash('e');
      const clearInput: ClearInput = {
        repository_root: fixture.root,
        repository_id: 'creatio-sample-repository',
        project_id: 'refactoring',
        work_id: 'lifecycle-clear',
        source_revision: 'source-1',
        scope_paths: ['src/task.ts'],
      };
      await expectAsyncReturned(() => executeDocumentationClearOperation(clearInput, 'baseline'));
      const clearResult = await expectAsyncReturned(() => executeDocumentationClearOperation(clearInput, 'closeout'));
      const clearContext: DocumentationVerificationContext = {
        repository_root: fixture.root,
        repository_id: clearInput.repository_id,
        project_id: clearInput.project_id,
        work_id: clearInput.work_id,
      };
      work = samePhase(work, (next) => {
        next.lifecycle.seal = {
          sealed_revision: next.revision,
          sealed_at: '2026-09-18T18:00:00.000Z',
          implementation_fingerprint: fingerprint,
        };
        next.lifecycle.references.push(
          reference(next, 'implementation_result', 'implementation', { implementation_fingerprint: fingerprint }),
          reference(next, 'change_impact_post', 'impact-post', { implementation_fingerprint: fingerprint }),
        );
      });
      work = expectReturned(() => transitionLifecycleState(work, 'VERIFY', 'Collect independent assurance.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      work = samePhase(work, (next) => {
        next.lifecycle.assurance.review_generation = 1;
        next.lifecycle.assurance.delivery_cycle_id = 'delivery-1';
        next.lifecycle.references.push(
          reference(next, 'review_packet', 'review-packet', {
            generation: 1,
            implementation_fingerprint: fingerprint,
          }),
          reference(
            next,
            'documentation_clear',
            clearRecordId(readFileSync(path.join(fixture.root, clearResult.path), 'utf8')),
            {
              path: clearResult.path,
              sha256: clearResult.sha256,
              generation: 1,
              implementation_fingerprint: fingerprint,
              decision: 'pass',
            },
          ),
          reference(next, 'delivery_manifest', 'manifest', {
            implementation_fingerprint: fingerprint,
            delivery_cycle_id: 'delivery-1',
          }),
        );
        for (let index = 1; index <= 3; index++) {
          next.lifecycle.references.push(
            reference(next, 'review_receipt', `review-${index}`, {
              generation: 1,
              implementation_fingerprint: fingerprint,
              principal: `reviewer-${index}`,
              decision: 'pass',
            }),
            reference(next, 'reverse_validation', `reverse-${index}`, {
              generation: 1,
              implementation_fingerprint: fingerprint,
              principal: `reverse-reviewer-${index}`,
              decision: 'pass',
            }),
          );
        }
      });
      const missingReviewPrincipal = clone(work);
      const reviewWithoutPrincipal = missingReviewPrincipal.lifecycle.references.find(
        (item) => item.kind === 'review_receipt' && item.disposition === 'current',
      );
      expect(reviewWithoutPrincipal).toBeDefined();
      reviewWithoutPrincipal!.principal = null;
      expect(() => validateLifecycleAggregate(missingReviewPrincipal)).toThrow(
        'review_receipt is not bound to the current review generation and seal',
      );
      expect(() => transitionLifecycleState(work, 'DELIVERY', 'Wait for current-version testing.')).toThrow(
        'context required',
      );
      fixture.write('docs/agent-instructions/current.md', 'changed\n');
      expect(() =>
        transitionLifecycleState(work, 'DELIVERY', 'Wait for current-version testing.', clearContext),
      ).toThrow();
      fixture.write('docs/agent-instructions/current.md', 'current\n');
      work = expectReturned(() =>
        transitionLifecycleState(work, 'DELIVERY', 'Wait for current-version testing.', clearContext),
      );
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      fixture.write('docs/agent-instructions/current.md', 'changed after CLEAR capture\n');
      const staleDeliveryProgress = clone(work);
      staleDeliveryProgress.revision++;
      staleDeliveryProgress.lifecycle.revision++;
      expect(() => validateLifecycleProgress(work, staleDeliveryProgress, clearContext)).toThrow(
        'documentation CLEAR inventory_digest is stale',
      );
      fixture.write('docs/agent-instructions/current.md', 'current\n');
      work = samePhase(
        work,
        (next) =>
          next.lifecycle.references.push(
            reference(work, 'delivery_receipt', 'delivery', {
              implementation_fingerprint: fingerprint,
              delivery_cycle_id: 'delivery-1',
              decision: 'approved',
            }),
            reference(work, 'runtime_receipt', 'runtime', {
              implementation_fingerprint: fingerprint,
              delivery_cycle_id: 'delivery-1',
              decision: 'accepted',
            }),
            reference(work, 'user_testing_receipt', 'user-testing', {
              implementation_fingerprint: fingerprint,
              delivery_cycle_id: 'delivery-1',
              decision: 'accepted',
            }),
          ),
        clearContext,
      );
      const missingDeliveryReceipt = clone(work);
      missingDeliveryReceipt.lifecycle.references = missingDeliveryReceipt.lifecycle.references.filter(
        (item) => item.kind !== 'delivery_receipt',
      );
      expect(() => transitionLifecycleState(missingDeliveryReceipt, 'COMPLETE', 'Complete.', clearContext)).toThrow(
        'current delivery_receipt reference required',
      );
      fixture.write('docs/agent-instructions/current.md', 'changed\n');
      expect(() => transitionLifecycleState(work, 'COMPLETE', 'Complete.', clearContext)).toThrow();
      fixture.write('docs/agent-instructions/current.md', 'current\n');
      work = expectReturned(() => transitionLifecycleState(work, 'COMPLETE', 'Complete.', clearContext));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      expect(work.lifecycle.phase).toBe('COMPLETE');
      const immutableProgress = clone(work);
      immutableProgress.revision++;
      immutableProgress.lifecycle.revision++;
      expect(() => validateLifecycleProgress(work, immutableProgress)).toThrow('completed lifecycle is immutable');
      expect(() => transitionLifecycleState(work, 'EXECUTE', 'No.')).toThrow(LifecycleStateError);
      completed = true;
    } catch (error) {
      console.error(`[lifecycle-state] retained failed fixture: ${fixture.root}`);
      throw error;
    } finally {
      if (completed && performance.now() < cleanupDeadline) rmSync(fixture.root, { recursive: true, force: true });
      else if (completed) console.error(`[lifecycle-state] retained expired fixture: ${fixture.root}`);
    }
  });

  test('phase transitions require current references and a seal for the current execution revision', () => {
    let work = expectReturned(() => transitionLifecycleState(initialWork(), 'TRACE', 'Trace the accepted scope.'));
    work = add(
      work,
      reference(work, 'source_plan', 'phase-source-plan'),
      reference(work, 'acceptance_manifest', 'phase-acceptance'),
      reference(work, 'implementation_scope', 'phase-scope'),
    );

    for (const kind of ['source_plan', 'acceptance_manifest'] as const) {
      const missing = clone(work);
      missing.lifecycle.references = missing.lifecycle.references.filter((item) => item.kind !== kind);
      expect(() => transitionLifecycleState(missing, 'PLAN', 'Authorize the plan.')).toThrow(
        `current ${kind} reference required`,
      );
    }

    const missingScope = clone(work);
    missingScope.lifecycle.references = missingScope.lifecycle.references.filter(
      (item) => item.kind !== 'implementation_scope',
    );
    expect(() => transitionLifecycleState(missingScope, 'PLAN', 'Authorize the plan.')).toThrow(
      'current implementation_scope reference required',
    );
    expect(Object.isFrozen(missingScope)).toBe(false);
    expect(Object.isFrozen(missingScope.binding)).toBe(false);
    expect(Object.isFrozen(missingScope.lifecycle.scope)).toBe(false);
    expect(Object.isFrozen(missingScope.lifecycle.references[0])).toBe(false);
    expect(work.lifecycle.references.some((item) => item.kind === 'implementation_scope')).toBe(true);

    work = expectReturned(() => transitionLifecycleState(work, 'PLAN', 'Authorize the plan.'));
    work = add(
      work,
      reference(work, 'execution_approval', 'phase-approval', { decision: 'approved' }),
      reference(work, 'platform_knowledge', 'phase-knowledge'),
      reference(work, 'implementation_policy', 'phase-policy'),
      reference(work, 'change_impact_pre', 'phase-impact-pre'),
      reference(work, 'documentation_validation', 'phase-docs', { decision: 'pass' }),
    );
    for (const kind of [
      'execution_approval',
      'platform_knowledge',
      'implementation_policy',
      'change_impact_pre',
    ] as const) {
      const missing = clone(work);
      missing.lifecycle.references = missing.lifecycle.references.filter((item) => item.kind !== kind);
      expect(() => transitionLifecycleState(missing, 'EXECUTE', 'Implement the approved scope.')).toThrow(
        `current ${kind} reference required`,
      );
    }
    const missingDocumentation = clone(work);
    missingDocumentation.lifecycle.references = missingDocumentation.lifecycle.references.filter(
      (item) => item.kind !== 'documentation_validation',
    );
    expect(() => transitionLifecycleState(missingDocumentation, 'EXECUTE', 'Implement the approved scope.')).toThrow(
      'current documentation_validation reference required',
    );
    expect(Object.isFrozen(missingDocumentation.binding)).toBe(false);
    expect(Object.isFrozen(missingDocumentation.lifecycle.scope)).toBe(false);

    work = expectReturned(() => transitionLifecycleState(work, 'EXECUTE', 'Implement the approved scope.'));
    const fingerprint = hash('e');
    const sealed = samePhase(work, (next) => {
      next.lifecycle.seal = {
        sealed_revision: next.revision,
        sealed_at: '2026-09-18T18:00:00.000Z',
        implementation_fingerprint: fingerprint,
      };
      next.lifecycle.references.push(
        reference(next, 'implementation_result', 'phase-implementation', {
          implementation_fingerprint: fingerprint,
        }),
        reference(next, 'change_impact_post', 'phase-impact-post', {
          implementation_fingerprint: fingerprint,
        }),
      );
    });
    const missingImplementation = clone(sealed);
    missingImplementation.lifecycle.references = missingImplementation.lifecycle.references.filter(
      (item) => item.kind !== 'implementation_result',
    );
    expect(() => transitionLifecycleState(missingImplementation, 'VERIFY', 'Verify the implementation.')).toThrow(
      'current implementation_result reference required',
    );
    expect(Object.isFrozen(missingImplementation.binding)).toBe(false);
    expect(Object.isFrozen(missingImplementation.lifecycle.scope)).toBe(false);

    const staleSeal = samePhase(sealed, (next) => {
      next.lifecycle.references.push(reference(next, 'scope_snapshot', 'phase-snapshot-after-seal'));
    });
    expect(staleSeal.lifecycle.seal?.sealed_revision).toBe(staleSeal.revision - 1);
    expect(() => transitionLifecycleState(staleSeal, 'VERIFY', 'Verify the implementation.')).toThrow(
      'current seal required',
    );

    work = expectReturned(() => transitionLifecycleState(sealed, 'VERIFY', 'Verify the implementation.'));
    for (const kind of ['execution_approval', 'documentation_validation'] as const) {
      const denied = clone(work);
      const currentReference = denied.lifecycle.references.find(
        (item) => item.kind === kind && item.disposition === 'current',
      );
      expect(currentReference).toBeDefined();
      currentReference!.decision = 'rejected';
      expect(() => validateLifecycleAggregate(denied)).toThrow(
        kind === 'execution_approval' ? 'execution_approval is not approved' : 'documentation_validation did not pass',
      );
    }
    const deniedCorrection = clone(work);
    deniedCorrection.lifecycle.references.push(
      reference(deniedCorrection, 'correction_authorization', 'phase-denied-correction', { decision: 'rejected' }),
    );
    expect(() => validateLifecycleAggregate(deniedCorrection)).toThrow('correction_authorization is not approved');

    work = samePhase(work, (next) => {
      next.lifecycle.assurance.review_generation = 1;
      next.lifecycle.assurance.delivery_cycle_id = 'phase-delivery';
      next.lifecycle.references.push(
        reference(next, 'review_packet', 'phase-review-packet', {
          generation: 1,
          implementation_fingerprint: fingerprint,
        }),
        reference(next, 'documentation_clear', 'phase-documentation-clear', {
          path: '.agent/phase-documentation-clear.json',
          generation: 1,
          implementation_fingerprint: fingerprint,
          delivery_cycle_id: 'phase-delivery',
          decision: 'pass',
        }),
      );
      for (let index = 1; index <= 3; index++)
        next.lifecycle.references.push(
          reference(next, 'review_receipt', `phase-review-${index}`, {
            generation: 1,
            implementation_fingerprint: fingerprint,
            principal: `phase-reviewer-${index}`,
            decision: 'pass',
          }),
          reference(next, 'reverse_validation', `phase-reverse-${index}`, {
            generation: 1,
            implementation_fingerprint: fingerprint,
            principal: `phase-reverse-reviewer-${index}`,
            decision: 'pass',
          }),
        );
    });
    for (const [kind, message] of [
      ['documentation_clear', 'documentation_clear did not pass'],
      ['review_receipt', 'review_receipt did not pass'],
      ['reverse_validation', 'reverse_validation did not pass'],
    ] as const) {
      const denied = clone(work);
      const currentReference = denied.lifecycle.references.find(
        (item) => item.kind === kind && item.disposition === 'current',
      );
      expect(currentReference).toBeDefined();
      currentReference!.decision = 'rejected';
      expect(() => validateLifecycleAggregate(denied)).toThrow(message);
    }
    expect(() => transitionLifecycleState(work, 'DELIVERY', 'Wait for current-version testing.')).toThrow(
      'current delivery_manifest reference required',
    );
    for (const kind of ['documentation_clear', 'review_receipt', 'reverse_validation'] as const) {
      const missing = clone(work);
      const index = missing.lifecycle.references.findIndex((item) => item.kind === kind);
      expect(index).toBeGreaterThanOrEqual(0);
      if (kind === 'review_receipt' || kind === 'reverse_validation') missing.lifecycle.references.splice(index, 1);
      else missing.lifecycle.references = missing.lifecycle.references.filter((item) => item.kind !== kind);
      const message =
        kind === 'review_receipt'
          ? 'delivery requires three reviews'
          : kind === 'reverse_validation'
            ? 'delivery requires three reverse validations'
            : 'current documentation_clear reference required';
      expect(() => transitionLifecycleState(missing, 'DELIVERY', 'Wait for current-version testing.')).toThrow(message);
    }
  });

  test('rejects skipped phases, stale bindings and duplicate reviewer identity', () => {
    const work = initialWork();
    const documented = clone(work);
    documented.lifecycle.scope.allowed_paths.push('docs/task.md');
    documented.lifecycle.scope.documentation_paths.push('docs/task.md');
    documented.binding.allowed_resources.push('file:docs/task.md');
    expectReturned(() => validateLifecycleAggregate(documented));
    documented.lifecycle.scope.documentation_paths.push('docs/outside.md');
    expect(() => validateLifecycleAggregate(documented)).toThrow('lifecycle scoped path is outside allowed paths');
    const predecessor = clone(work);
    const historicalScope = reference(predecessor, 'implementation_scope', 'historical-scope');
    predecessor.lifecycle.references.push(historicalScope);
    const continued = clone(predecessor);
    continued.binding.work_source_revision = 'source-2';
    continued.lifecycle.source_revision = 'source-2';
    expectReturned(() => validateLifecycleAggregate(continued, [historicalScope]));
    const unsupportedHistorical = {
      ...reference(continued, 'decision', 'unsupported-history'),
      source_revision: 'source-1',
    };
    const forgedContinuation = clone(continued);
    forgedContinuation.lifecycle.references.push(unsupportedHistorical);
    expect(() => validateLifecycleAggregate(forgedContinuation, [historicalScope, unsupportedHistorical])).toThrow(
      'lifecycle artifact authority binding differs from current work',
    );
    let transitionFailure: unknown;
    try {
      transitionLifecycleState(work, 'PLAN', 'Skip trace.');
    } catch (error) {
      transitionFailure = error;
    }
    expect(transitionFailure).toBeInstanceOf(LifecycleStateError);
    expect((transitionFailure as LifecycleStateError).code).toBe('GAP-LIFECYCLE-STATE-001');
    expect((transitionFailure as LifecycleStateError).message).toBe('illegal lifecycle transition');
    const stale = clone(work);
    stale.lifecycle.config_binding.config_digest = hash('f');
    expect(() => validateLifecycleAggregate(stale)).toThrow('configuration binding');
    const aliased = clone(work);
    aliased.lifecycle.scope.allowed_paths.push('SRC/task.ts');
    expect(() => validateLifecycleAggregate(aliased)).toThrow('aliases or duplicates');
    const emptyAcceptance = clone(work);
    emptyAcceptance.lifecycle.references.push({ ...reference(work, 'decision', 'empty-ac'), ac_ids: [] });
    expect(() => validateLifecycleAggregate(emptyAcceptance)).toThrow('acceptance binding');
    expect(() =>
      samePhase(work, (next) => next.lifecycle.references.push(reference(next, 'decision', 'early-decision'))),
    ).toThrow('cannot be admitted during INTAKE');
  }, 30_000);

  test('rejects unanchored artifact digest and schema values', () => {
    const digestCases = [hash('d') + 'x', 'x' + hash('d')];
    for (const [index, sha256] of digestCases.entries()) {
      const work = initialWork();
      work.lifecycle.references.push(reference(work, 'decision', `bad-digest-${index}`, { sha256 }));
      expect(() => validateLifecycleAggregate(work)).toThrow('lifecycle artifact digest invalid');
    }

    const schemaCases = ['Evidence/v1x', '!Evidence/v1'];
    for (const [index, artifact_schema] of schemaCases.entries()) {
      const work = initialWork();
      work.lifecycle.references.push(reference(work, 'decision', `bad-schema-${index}`, { artifact_schema }));
      expect(() => validateLifecycleAggregate(work)).toThrow('lifecycle artifact schema must be current v1');
    }
    const validPrefixedSchema = initialWork();
    validPrefixedSchema.lifecycle.references.push(
      reference(validPrefixedSchema, 'decision', 'valid-prefixed-schema', { artifact_schema: 'xEvidence/v1' }),
    );
    expectReturned(() => validateLifecycleAggregate(validPrefixedSchema));
  });

  test('rejects malformed reference metadata before phase requirements', () => {
    const cases: readonly [Partial<MutableReference>, string][] = [
      [{ record_id: '' }, 'lifecycle record id missing'],
      [{ record_id: '  ' }, 'lifecycle record id missing'],
      [{ path: '../outside.json' }, 'lifecycle artifact path unsafe'],
      [{ ac_ids: [] }, 'lifecycle artifact acceptance binding exceeds current work'],
      [{ ac_ids: ['AC-1', 'AC-OTHER'] }, 'lifecycle artifact acceptance binding exceeds current work'],
      [{ generation: 0 }, 'lifecycle artifact generation invalid'],
      [{ implementation_fingerprint: 'not-a-digest' }, 'lifecycle artifact fingerprint invalid'],
      [{ principal: '' }, 'lifecycle artifact principal invalid'],
      [{ principal: ' reviewer ' }, 'lifecycle artifact principal invalid'],
    ];
    for (const [fields, message] of cases) {
      const work = initialWork();
      work.lifecycle.references.push(reference(work, 'decision', 'metadata', fields));
      expect(() => validateLifecycleAggregate(work)).toThrow(message);
    }
    const wrongSchema = initialWork();
    wrongSchema.lifecycle.references.push({
      ...reference(wrongSchema, 'decision', 'schema'),
      schema: 'LifecycleArtifactReference/v2',
    } as unknown as MutableReference);
    expect(() => validateLifecycleAggregate(wrongSchema)).toThrow('lifecycle reference schema invalid');

    const retired = initialWork();
    for (const kind of [
      'execution_approval',
      'correction_authorization',
      'documentation_validation',
      'documentation_clear',
      'validation_receipt',
      'test_receipt',
      'review_receipt',
      'reverse_validation',
    ] as const)
      retired.lifecycle.references.push(
        reference(retired, kind, `retired-${kind}`, {
          disposition: 'retired',
          decision: 'rejected',
        }),
      );
    expectReturned(() => validateLifecycleAggregate(retired));
  });

  test('requires exact preserved admission history and current scope authority', () => {
    const predecessor = initialWork();
    const history = [
      reference(predecessor, 'implementation_scope', 'history-scope'),
      reference(predecessor, 'acceptance_manifest', 'history-acceptance'),
      reference(predecessor, 'execution_approval', 'history-approval', { decision: 'approved' }),
    ];
    const continueWithHistory = (): MutableWork => {
      const continued = clone(predecessor);
      continued.binding.work_source_revision = 'source-2';
      continued.lifecycle.source_revision = 'source-2';
      continued.lifecycle.references.push(...history);
      return continued;
    };
    const continued = continueWithHistory();
    expectReturned(() => validateLifecycleAggregate(continued, history));
    const foreign = {
      ...reference(predecessor, 'implementation_scope', 'foreign-scope'),
      scope_id: 'foreign-scope',
    };
    continued.lifecycle.references.push(foreign);
    expect(() => validateLifecycleAggregate(continued, [...history, foreign])).toThrow(
      'lifecycle artifact authority binding differs from current work',
    );
    const admit = (work: MutableWork, ...references: MutableReference[]): MutableWork => {
      const next = clone(work);
      next.revision++;
      next.lifecycle.revision++;
      next.lifecycle.references.push(...references);
      expectReturned(() => validateLifecycleProgress(work, next, undefined, history));
      return next;
    };
    const trace = expectReturned(() =>
      transitionLifecycleState(continueWithHistory(), 'TRACE', 'Trace the rebound source.', undefined, history),
    );
    const traced = admit(trace, reference(trace, 'source_plan', 'rebound-source-plan'));
    const plan = expectReturned(() =>
      transitionLifecycleState(traced, 'PLAN', 'Bind current execution evidence.', undefined, history),
    );
    const readyWithoutCurrentApproval = admit(
      plan,
      reference(plan, 'platform_knowledge', 'rebound-knowledge'),
      reference(plan, 'implementation_policy', 'rebound-policy'),
      reference(plan, 'change_impact_pre', 'rebound-impact-pre'),
      reference(plan, 'documentation_validation', 'rebound-docs', { decision: 'pass' }),
    );
    let staleApprovalError: unknown;
    try {
      transitionLifecycleState(
        readyWithoutCurrentApproval,
        'EXECUTE',
        'Execute with current authority.',
        undefined,
        history,
      );
    } catch (error) {
      staleApprovalError = error;
    }
    expect(staleApprovalError).toBeInstanceOf(LifecycleStateError);
    if (!(staleApprovalError instanceof LifecycleStateError)) throw new Error('stale approval was not rejected');
    expect(staleApprovalError.code).toBe('GAP-LIFECYCLE-STATE-001');
    expect(staleApprovalError.message).toBe('current execution_approval reference required');
    const readyWithCurrentApproval = admit(
      readyWithoutCurrentApproval,
      reference(plan, 'execution_approval', 'rebound-approval', { decision: 'approved' }),
    );
    const executed = expectReturned(() =>
      transitionLifecycleState(
        readyWithCurrentApproval,
        'EXECUTE',
        'Execute with current authority.',
        undefined,
        history,
      ),
    );
    expect(executed.lifecycle.phase).toBe('EXECUTE');
  });

  test('rejects malformed aggregate bindings, seal and assurance metadata', () => {
    const cases: readonly [(work: MutableWork) => void, string][] = [
      [
        (work) => {
          work.lifecycle.schema = 'LifecycleState/v2' as never;
        },
        'lifecycle schema invalid',
      ],
      [
        (work) => {
          work.lifecycle.revision++;
        },
        'lifecycle revision differs from work revision',
      ],
      [
        (work) => {
          work.lifecycle.phase = 'DONE' as never;
        },
        'lifecycle phase invalid',
      ],
      [
        (work) => {
          work.lifecycle.source_revision = 'other';
        },
        'lifecycle source binding invalid',
      ],
      [
        (work) => {
          work.lifecycle.next_action = '  ';
        },
        'lifecycle next action missing',
      ],
      [
        (work) => {
          work.lifecycle.config_binding.config_digest = hash('f');
        },
        'lifecycle configuration binding differs from work authority',
      ],
      [
        (work) => {
          work.lifecycle.config_binding.schema_digest = hash('f');
        },
        'lifecycle configuration binding differs from work authority',
      ],
      [
        (work) => {
          work.lifecycle.config_binding.runtime_code_digest = hash('f');
        },
        'lifecycle configuration binding differs from work authority',
      ],
      [
        (work) => {
          work.lifecycle.scope.scope_id = 'other';
        },
        'lifecycle scope binding invalid',
      ],
      [
        (work) => {
          work.lifecycle.assurance.review_generation = -1;
        },
        'review generation invalid',
      ],
      [
        (work) => {
          work.lifecycle.assurance.correction_count = -1;
        },
        'correction count invalid',
      ],
      [
        (work) => {
          work.lifecycle.assurance.review_failure_count = -1;
        },
        'review failure count invalid',
      ],
    ];
    for (const [mutate, message] of cases) {
      const work = initialWork();
      mutate(work);
      expect(() => validateLifecycleAggregate(work)).toThrow(message);
    }
    const nonCanonical = initialWork();
    nonCanonical.lifecycle.next_action = undefined as never;
    expect(() => validateLifecycleAggregate(nonCanonical)).toThrow(
      'non-canonical JSON value at $.lifecycle.next_action',
    );
    let sealed = expectReturned(() => transitionLifecycleState(initialWork(), 'TRACE', 'Trace the accepted scope.'));
    sealed = add(
      sealed,
      reference(sealed, 'source_plan', 'seal-source-plan'),
      reference(sealed, 'acceptance_manifest', 'seal-acceptance'),
      reference(sealed, 'implementation_scope', 'seal-implementation-scope'),
    );
    sealed = expectReturned(() => transitionLifecycleState(sealed, 'PLAN', 'Authorize the accepted plan.'));
    sealed = add(
      sealed,
      reference(sealed, 'execution_approval', 'seal-approval', { decision: 'approved' }),
      reference(sealed, 'platform_knowledge', 'seal-knowledge'),
      reference(sealed, 'implementation_policy', 'seal-policy'),
      reference(sealed, 'change_impact_pre', 'seal-impact-pre'),
      reference(sealed, 'documentation_validation', 'seal-docs', { decision: 'pass' }),
    );
    sealed = expectReturned(() => transitionLifecycleState(sealed, 'EXECUTE', 'Implement the approved scope.'));
    const sealedFingerprint = hash('e');
    sealed = samePhase(sealed, (next) => {
      next.lifecycle.seal = {
        sealed_revision: next.revision,
        sealed_at: '2026-09-18T18:00:00.000Z',
        implementation_fingerprint: sealedFingerprint,
      };
      next.lifecycle.references.push(
        reference(next, 'implementation_result', 'seal-implementation-result', {
          implementation_fingerprint: sealedFingerprint,
        }),
        reference(next, 'change_impact_post', 'seal-impact-post', {
          implementation_fingerprint: sealedFingerprint,
        }),
      );
    });
    expectReturned(() => validateLifecycleAggregate(sealed));
    for (const [change, message] of [
      [
        (work: MutableWork) => {
          work.lifecycle.seal!.sealed_revision = work.revision + 1;
        },
        'lifecycle seal revision invalid',
      ],
      [
        (work: MutableWork) => {
          work.lifecycle.seal!.sealed_at = 'not-a-date';
        },
        'lifecycle seal timestamp invalid',
      ],
      [
        (work: MutableWork) => {
          work.lifecycle.seal!.implementation_fingerprint = 'bad';
        },
        'lifecycle seal fingerprint invalid',
      ],
    ] as const) {
      const work = clone(sealed);
      change(work);
      expect(() => validateLifecycleAggregate(work)).toThrow(message);
    }
  });

  test('normalizes transition actions and rejects blank actions', () => {
    const next = expectReturned(() => transitionLifecycleState(initialWork(), 'TRACE', '  Trace the scope.  '));
    expect(next).not.toBeNull();
    expect(typeof next).toBe('object');
    expect(next.lifecycle.next_action).toBe('Trace the scope.');
    for (const action of ['', ' \t\n '])
      expect(() => transitionLifecycleState(initialWork(), 'TRACE', action)).toThrow('next lifecycle action missing');
  });

  test('rejects same-phase authority and assurance drift and untyped transition output', () => {
    const cases: readonly [(work: MutableWork) => void, string][] = [
      [
        (work) => {
          work.lifecycle.route = 'R2';
        },
        'lifecycle authority changed; explicit reconcile or rebind required',
      ],
      [
        (work) => {
          work.lifecycle.assurance.epoch = 'other';
        },
        'assurance epoch changes only through explicit reconcile',
      ],
      [
        (work) => {
          work.lifecycle.assurance.correction_count++;
        },
        'correction count changes only through a correction transition',
      ],
      [
        (work) => {
          work.lifecycle.assurance.review_generation++;
        },
        'review generation requires a new review packet during verification',
      ],
      [
        (work) => {
          work.lifecycle.assurance.review_generation += 2;
        },
        'assurance counters cannot regress',
      ],
      [
        (work) => {
          work.lifecycle.assurance.review_failure_count += 2;
        },
        'assurance counters cannot regress',
      ],
      [
        (work) => {
          work.lifecycle.assurance.delivery_cycle_id = 'premature';
        },
        'delivery cycle can only open once during verification',
      ],
    ];
    for (const [mutate, message] of cases) {
      const before = initialWork();
      const after = clone(before);
      after.revision++;
      after.lifecycle.revision++;
      mutate(after);
      expect(() => validateLifecycleProgress(before, after)).toThrow(message);
    }
    const beforeSingleReviewFailure = initialWork();
    const afterSingleReviewFailure = clone(beforeSingleReviewFailure);
    afterSingleReviewFailure.revision++;
    afterSingleReviewFailure.lifecycle.revision++;
    afterSingleReviewFailure.lifecycle.assurance.review_failure_count++;
    expectReturned(() => validateLifecycleProgress(beforeSingleReviewFailure, afterSingleReviewFailure));
    expect(afterSingleReviewFailure.revision).toBe(beforeSingleReviewFailure.revision + 1);
    expect(afterSingleReviewFailure.lifecycle.revision).toBe(beforeSingleReviewFailure.lifecycle.revision + 1);
    expect(afterSingleReviewFailure.lifecycle.assurance.review_failure_count).toBe(
      beforeSingleReviewFailure.lifecycle.assurance.review_failure_count + 1,
    );
    expect(afterSingleReviewFailure.lifecycle.assurance.review_generation).toBe(
      beforeSingleReviewFailure.lifecycle.assurance.review_generation,
    );
    expect(afterSingleReviewFailure.lifecycle.assurance.correction_count).toBe(
      beforeSingleReviewFailure.lifecycle.assurance.correction_count,
    );
    expect(afterSingleReviewFailure.lifecycle.assurance.epoch).toBe(
      beforeSingleReviewFailure.lifecycle.assurance.epoch,
    );
    expect(afterSingleReviewFailure.lifecycle.assurance.delivery_cycle_id).toBe(
      beforeSingleReviewFailure.lifecycle.assurance.delivery_cycle_id,
    );
    for (const field of ['review_generation', 'review_failure_count'] as const) {
      const before = initialWork();
      before.lifecycle.assurance[field] = 1;
      const after = clone(before);
      after.revision++;
      after.lifecycle.revision++;
      after.lifecycle.assurance[field] = 0;
      expect(() => validateLifecycleProgress(before, after)).toThrow('assurance counters cannot regress');
    }
    const before = initialWork();
    const after = clone(expectReturned(() => transitionLifecycleState(before, 'TRACE', 'Trace.')));
    after.lifecycle.assurance.epoch = 'untyped-epoch';
    expect(() => validateLifecycleProgress(before, after)).toThrow('lifecycle transition contains an untyped mutation');
  });

  test('admits a source plan only during TRACE progress', () => {
    const trace = expectReturned(() => transitionLifecycleState(initialWork(), 'TRACE', 'Trace the scope.'));
    const allowed = clone(trace);
    allowed.revision++;
    allowed.lifecycle.revision++;
    allowed.lifecycle.references.push(reference(allowed, 'source_plan', 'phase-source-plan'));
    expectReturned(() => validateLifecycleProgress(trace, allowed));

    const before = initialWork();
    const rejected = clone(before);
    rejected.revision++;
    rejected.lifecycle.revision++;
    rejected.lifecycle.references.push(reference(rejected, 'source_plan', 'phase-source-plan-early'));
    expect(() => validateLifecycleProgress(before, rejected)).toThrow('source_plan cannot be admitted during INTAKE');
  });

  test('rejects creating a lifecycle seal during same-phase PLAN progress', () => {
    let before = expectReturned(() => transitionLifecycleState(initialWork(), 'TRACE', 'Trace the scope.'));
    before = add(
      before,
      reference(before, 'source_plan', 'seal-source-plan'),
      reference(before, 'acceptance_manifest', 'seal-acceptance'),
      reference(before, 'implementation_scope', 'seal-scope'),
    );
    before = expectReturned(() => transitionLifecycleState(before, 'PLAN', 'Authorize the plan.'));
    before = add(
      before,
      reference(before, 'execution_approval', 'seal-approval', { decision: 'approved' }),
      reference(before, 'platform_knowledge', 'seal-knowledge'),
      reference(before, 'implementation_policy', 'seal-policy'),
      reference(before, 'change_impact_pre', 'seal-impact-pre'),
      reference(before, 'documentation_validation', 'seal-docs', { decision: 'pass' }),
    );

    const after = clone(before);
    after.revision++;
    after.lifecycle.revision++;
    after.lifecycle.seal = {
      sealed_revision: after.revision,
      sealed_at: '2026-09-18T18:00:00.000Z',
      implementation_fingerprint: hash('e'),
    };
    const beforeImage = clone(before);
    const afterImage = clone(after);
    expect(after.lifecycle.seal.sealed_revision).toBe(after.revision);
    expect(() => validateLifecycleProgress(before, after)).toThrow('seal can only be created once during execution');
    expect(before).toEqual(beforeImage);
    expect(after).toEqual(afterImage);
  });

  test('rejects duplicate current singleton evidence by kind', () => {
    let work = expectReturned(() => transitionLifecycleState(initialWork(), 'TRACE', 'Trace the accepted scope.'));
    expect(work).not.toBeNull();
    expect(typeof work).toBe('object');
    work = add(
      work,
      reference(work, 'source_plan', 'singleton-source-plan'),
      reference(work, 'acceptance_manifest', 'singleton-acceptance'),
      reference(work, 'implementation_scope', 'singleton-implementation-scope'),
      reference(work, 'scope_snapshot', 'singleton-scope-snapshot'),
    );
    const traceSingletons: readonly LifecycleArtifactKind[] = [
      'source_plan',
      'acceptance_manifest',
      'implementation_scope',
      'scope_snapshot',
    ];
    for (const kind of traceSingletons) {
      const duplicate = clone(work);
      duplicate.lifecycle.references.push(reference(duplicate, kind, `duplicate-${kind}`));
      expect(() => validateLifecycleAggregate(duplicate)).toThrow(`multiple current ${kind} references`);
    }

    work = expectReturned(() => transitionLifecycleState(work, 'PLAN', 'Authorize the accepted plan.'));
    expect(work).not.toBeNull();
    expect(typeof work).toBe('object');
    work = add(
      work,
      reference(work, 'execution_approval', 'singleton-approval', { decision: 'approved' }),
      reference(work, 'platform_knowledge', 'singleton-knowledge'),
      reference(work, 'implementation_policy', 'singleton-policy'),
      reference(work, 'change_impact_pre', 'singleton-impact-pre'),
      reference(work, 'documentation_validation', 'singleton-docs', { decision: 'pass' }),
    );
    const planSingletons: readonly LifecycleArtifactKind[] = [
      'execution_approval',
      'platform_knowledge',
      'implementation_policy',
      'change_impact_pre',
      'documentation_validation',
    ];
    for (const kind of planSingletons) {
      const duplicate = clone(work);
      duplicate.lifecycle.references.push(
        reference(
          duplicate,
          kind,
          `duplicate-${kind}`,
          kind === 'execution_approval'
            ? { decision: 'approved' }
            : kind === 'documentation_validation'
              ? { decision: 'pass' }
              : {},
        ),
      );
      expect(() => validateLifecycleAggregate(duplicate)).toThrow(`multiple current ${kind} references`);
    }

    work = expectReturned(() => transitionLifecycleState(work, 'EXECUTE', 'Implement the approved scope.'));
    expect(work).not.toBeNull();
    expect(typeof work).toBe('object');
    const fingerprint = hash('e');
    work = samePhase(work, (next) => {
      next.lifecycle.seal = {
        sealed_revision: next.revision,
        sealed_at: '2026-09-18T18:00:00.000Z',
        implementation_fingerprint: fingerprint,
      };
      next.lifecycle.references.push(
        reference(next, 'change_impact_post', 'singleton-impact-post', {
          implementation_fingerprint: fingerprint,
        }),
      );
    });
    const duplicateImpactPost = clone(work);
    duplicateImpactPost.lifecycle.references.push(
      reference(duplicateImpactPost, 'change_impact_post', 'duplicate-impact-post', {
        implementation_fingerprint: fingerprint,
      }),
    );
    expect(() => validateLifecycleAggregate(duplicateImpactPost)).toThrow(
      'multiple current change_impact_post references',
    );
  });

  test('preserves reference identity and permits only exact current feedback consumption', () => {
    const feedback = reference(initialWork(), 'feedback_consumption', 'feedback');
    const consumed = { ...feedback, disposition: 'consumed' as const };
    expectReturned(() => validateLifecycleReferencePreservation([feedback], [consumed]));
    expect(feedback.disposition).toBe('current');
    expectReturned(() => validateLifecycleReferencePreservation([feedback], [clone(feedback)]));
    expect(() => validateLifecycleReferencePreservation([feedback], [])).toThrow(
      'lifecycle references are append-only',
    );
    expect(() => validateLifecycleReferencePreservation([], [feedback, clone(feedback)])).toThrow(
      'duplicate lifecycle reference identity',
    );
    const invalidPairs: readonly (readonly [LifecycleArtifactReference, LifecycleArtifactReference])[] = [
      [
        { ...feedback, kind: 'decision' },
        { ...consumed, kind: 'decision' },
      ],
      [{ ...feedback, disposition: 'retired' }, consumed],
      [feedback, { ...feedback, disposition: 'retired' }],
      [feedback, { ...consumed, sha256: hash('e') }],
    ];
    for (const [before, after] of invalidPairs)
      expect(() => validateLifecycleReferencePreservation([before], [after])).toThrow(
        'lifecycle reference replacement or invalidation requires a typed operation',
      );
  });

  test('admits scope snapshots in every declared lifecycle phase', () => {
    const tracedWork = (): MutableWork => {
      let work = expectReturned(() => transitionLifecycleState(initialWork(), 'TRACE', 'Trace the accepted scope.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      return add(
        work,
        reference(work, 'source_plan', 'snapshot-source-plan'),
        reference(work, 'acceptance_manifest', 'snapshot-acceptance'),
        reference(work, 'implementation_scope', 'snapshot-implementation-scope'),
      );
    };
    const authorizedPlan = (work: MutableWork): MutableWork => {
      const plan = expectReturned(() => transitionLifecycleState(work, 'PLAN', 'Authorize the accepted scope.'));
      expect(plan).not.toBeNull();
      expect(typeof plan).toBe('object');
      return add(
        plan,
        reference(plan, 'execution_approval', 'snapshot-approval', { decision: 'approved' }),
        reference(plan, 'platform_knowledge', 'snapshot-knowledge'),
        reference(plan, 'implementation_policy', 'snapshot-policy'),
        reference(plan, 'change_impact_pre', 'snapshot-impact-pre'),
        reference(plan, 'documentation_validation', 'snapshot-docs', { decision: 'pass' }),
      );
    };

    const trace = tracedWork();
    const traceWithSnapshot = samePhase(trace, (next) =>
      next.lifecycle.references.push(reference(next, 'scope_snapshot', 'snapshot-trace')),
    );
    expectReturned(() => validateLifecycleAggregate(traceWithSnapshot));
    const retainedSnapshotPlan = expectReturned(() =>
      transitionLifecycleState(traceWithSnapshot, 'PLAN', 'Keep the admitted trace snapshot.'),
    );
    expect(retainedSnapshotPlan).not.toBeNull();
    expect(typeof retainedSnapshotPlan).toBe('object');
    expect(retainedSnapshotPlan.lifecycle.references.some((item) => item.record_id === 'snapshot-trace')).toBe(true);
    const plan = expectReturned(() => transitionLifecycleState(trace, 'PLAN', 'Open the planned scope.'));
    expect(plan).not.toBeNull();
    expect(typeof plan).toBe('object');
    expectReturned(() =>
      samePhase(plan, (next) => next.lifecycle.references.push(reference(next, 'scope_snapshot', 'snapshot-plan'))),
    );

    const execute = expectReturned(() => transitionLifecycleState(authorizedPlan(trace), 'EXECUTE', 'Execute scope.'));
    expect(execute).not.toBeNull();
    expect(typeof execute).toBe('object');
    expectReturned(() =>
      samePhase(execute, (next) =>
        next.lifecycle.references.push(reference(next, 'scope_snapshot', 'snapshot-execute')),
      ),
    );

    const sealed = samePhase(execute, (next) => {
      const fingerprint = hash('e');
      next.lifecycle.seal = {
        sealed_revision: next.revision,
        sealed_at: '2026-09-18T18:00:00.000Z',
        implementation_fingerprint: fingerprint,
      };
      next.lifecycle.references.push(
        reference(next, 'implementation_result', 'snapshot-implementation', {
          implementation_fingerprint: fingerprint,
        }),
      );
    });
    const verify = expectReturned(() => transitionLifecycleState(sealed, 'VERIFY', 'Verify the sealed scope.'));
    expect(verify).not.toBeNull();
    expect(typeof verify).toBe('object');
    expectReturned(() =>
      samePhase(verify, (next) => next.lifecycle.references.push(reference(next, 'scope_snapshot', 'snapshot-verify'))),
    );
  });

  test('correction retires stale assurance and delivery evidence in one typed transition', async () => {
    const fixture = clearFixture();
    const cleanupDeadline = performance.now() + 30_000;
    let completed = false;
    try {
      let work = initialWork();
      work = expectReturned(() => transitionLifecycleState(work, 'TRACE', 'Plan.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      work = add(
        work,
        reference(work, 'source_plan', 'source-plan'),
        reference(work, 'acceptance_manifest', 'acceptance'),
        reference(work, 'implementation_scope', 'scope'),
      );
      work = expectReturned(() => transitionLifecycleState(work, 'PLAN', 'Authorize.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      work = add(
        work,
        reference(work, 'execution_approval', 'approval', { decision: 'approved' }),
        reference(work, 'platform_knowledge', 'knowledge'),
        reference(work, 'implementation_policy', 'policy'),
        reference(work, 'change_impact_pre', 'impact-pre'),
        reference(work, 'documentation_validation', 'docs-pre', { decision: 'pass' }),
      );
      work = expectReturned(() => transitionLifecycleState(work, 'EXECUTE', 'Implement.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      const fingerprint = hash('e');
      work = samePhase(work, (next) => {
        next.lifecycle.seal = {
          sealed_revision: next.revision,
          sealed_at: '2026-09-18T18:00:00.000Z',
          implementation_fingerprint: fingerprint,
        };
        next.lifecycle.references.push(
          reference(next, 'implementation_result', 'implementation', { implementation_fingerprint: fingerprint }),
          reference(next, 'change_impact_post', 'impact-post', { implementation_fingerprint: fingerprint }),
        );
      });

      work = expectReturned(() => transitionLifecycleState(work, 'VERIFY', 'Review.'));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      const clearInput: ClearInput = {
        repository_root: fixture.root,
        repository_id: 'creatio-sample-repository',
        project_id: 'refactoring',
        work_id: 'lifecycle-clear',
        source_revision: 'source-1',
        scope_paths: ['src/task.ts'],
      };
      await expectAsyncReturned(() => executeDocumentationClearOperation(clearInput, 'baseline'));
      const firstClear = await expectAsyncReturned(() => executeDocumentationClearOperation(clearInput, 'closeout'));
      const firstRecordId = clearRecordId(readFileSync(path.join(fixture.root, firstClear.path), 'utf8'));
      work = samePhase(work, (next) => {
        next.lifecycle.assurance.review_generation = 1;
        next.lifecycle.references.push(
          reference(next, 'review_packet', 'review-packet-1', {
            generation: 1,
            implementation_fingerprint: fingerprint,
          }),
        );
        next.lifecycle.references.push(
          reference(next, 'documentation_clear', firstRecordId, {
            path: firstClear.path,
            sha256: firstClear.sha256,
            generation: 1,
            implementation_fingerprint: fingerprint,
            decision: 'pass',
          }),
        );
      });
      work = add(
        work,
        reference(work, 'correction_authorization', 'correction', { decision: 'approved' }),
        reference(work, 'feedback_consumption', 'consumption'),
      );
      const corrected = expectReturned(() =>
        transitionLifecycleState(work, 'EXECUTE', 'Apply the authorized correction.'),
      );
      expect(corrected).not.toBeNull();
      expect(typeof corrected).toBe('object');
      expectReturned(() => validateLifecycleProgress(work, corrected));
      expect(corrected.lifecycle.seal).toBeNull();
      expect(corrected.lifecycle.assurance.correction_count).toBe(1);
      expect(corrected.lifecycle.assurance.review_generation).toBe(work.lifecycle.assurance.review_generation + 1);
      expect(corrected.lifecycle.assurance.delivery_cycle_id).toBeNull();
      expect(corrected.lifecycle.references.find((item) => item.kind === 'implementation_result')?.disposition).toBe(
        'retired',
      );
      expect(corrected.lifecycle.references.find((item) => item.record_id === 'impact-post')?.disposition).toBe(
        'retired',
      );
      expect(corrected.lifecycle.references.find((item) => item.kind === 'feedback_consumption')?.disposition).toBe(
        'consumed',
      );
      expect(corrected.lifecycle.references.find((item) => item.kind === 'correction_authorization')?.disposition).toBe(
        'retired',
      );
      expect(corrected.lifecycle.references.find((item) => item.kind === 'documentation_clear')?.disposition).toBe(
        'retired',
      );
      let verifiedAgain = samePhase(corrected, (next) => {
        const nextFingerprint = hash('f');
        next.lifecycle.seal = {
          sealed_revision: next.revision,
          sealed_at: '2026-09-18T19:00:00.000Z',
          implementation_fingerprint: nextFingerprint,
        };
        next.lifecycle.references.push(
          reference(next, 'implementation_result', 'implementation-2', {
            implementation_fingerprint: nextFingerprint,
          }),
        );
      });
      verifiedAgain = expectReturned(() =>
        transitionLifecycleState(verifiedAgain, 'VERIFY', 'Review the corrected implementation.'),
      );
      expect(verifiedAgain).not.toBeNull();
      expect(typeof verifiedAgain).toBe('object');
      await expectAsyncReturned(() => executeDocumentationClearOperation(clearInput, 'baseline'));
      const secondClear = await expectAsyncReturned(() => executeDocumentationClearOperation(clearInput, 'closeout'));
      expect(secondClear.path).toContain('documentation-closeout-0002.v1.json');
      const secondRecordId = clearRecordId(readFileSync(path.join(fixture.root, secondClear.path), 'utf8'));
      const secondFingerprint = hash('f');
      verifiedAgain = samePhase(verifiedAgain, (next) => {
        next.lifecycle.assurance.delivery_cycle_id = 'delivery-2';
        next.lifecycle.references.push(
          reference(next, 'review_packet', 'review-packet-2', {
            generation: 2,
            implementation_fingerprint: secondFingerprint,
          }),
          reference(next, 'documentation_clear', secondRecordId, {
            path: secondClear.path,
            sha256: secondClear.sha256,
            generation: 2,
            implementation_fingerprint: secondFingerprint,
            decision: 'pass',
          }),
          reference(next, 'delivery_manifest', 'manifest-2', {
            implementation_fingerprint: secondFingerprint,
            delivery_cycle_id: 'delivery-2',
          }),
        );
        for (let index = 1; index <= 3; index++)
          next.lifecycle.references.push(
            reference(next, 'review_receipt', `review-2-${index}`, {
              generation: 2,
              implementation_fingerprint: secondFingerprint,
              principal: `reviewer-2-${index}`,
              decision: 'pass',
            }),
            reference(next, 'reverse_validation', `reverse-2-${index}`, {
              generation: 2,
              implementation_fingerprint: secondFingerprint,
              principal: `reverse-2-${index}`,
              decision: 'pass',
            }),
          );
        next.lifecycle.references.push(
          reference(next, 'validation_receipt', 'validation-2', {
            implementation_fingerprint: secondFingerprint,
            decision: 'pass',
          }),
          reference(next, 'test_receipt', 'test-2', {
            implementation_fingerprint: secondFingerprint,
            decision: 'pass',
          }),
          reference(next, 'dispatch_reservation', 'reservation-2'),
          reference(next, 'dispatch_attestation', 'attestation-2'),
        );
      });
      const singletonCases: readonly (readonly [LifecycleArtifactKind, Partial<MutableReference>])[] = [
        ['implementation_result', { implementation_fingerprint: secondFingerprint }],
        ['test_receipt', { implementation_fingerprint: secondFingerprint, decision: 'pass' }],
        ['review_packet', { generation: 2, implementation_fingerprint: secondFingerprint }],
        [
          'documentation_clear',
          {
            path: '.agent/duplicate-documentation-clear.json',
            generation: 2,
            implementation_fingerprint: secondFingerprint,
            decision: 'pass',
          },
        ],
        ['delivery_manifest', { implementation_fingerprint: secondFingerprint, delivery_cycle_id: 'delivery-2' }],
      ];
      for (const [kind, extra] of singletonCases) {
        const duplicate = clone(verifiedAgain);
        duplicate.lifecycle.references.push(reference(duplicate, kind, `duplicate-${kind}`, extra));
        expect(() => validateLifecycleAggregate(duplicate)).toThrow(`multiple current ${kind} references`);
      }
      const clearContext: DocumentationVerificationContext = {
        repository_root: fixture.root,
        repository_id: clearInput.repository_id,
        project_id: clearInput.project_id,
        work_id: clearInput.work_id,
      };
      const mismatchedGeneration = clone(verifiedAgain);
      const currentClear = mismatchedGeneration.lifecycle.references.find(
        (item) => item.kind === 'documentation_clear' && item.disposition === 'current',
      );
      expect(currentClear).toBeDefined();
      currentClear!.generation = 1;
      expect(() =>
        transitionLifecycleState(
          mismatchedGeneration,
          'DELIVERY',
          'Reject mismatched CLEAR reference generation.',
          clearContext,
        ),
      ).toThrow('documentation CLEAR generation invalid');
      const staleCurrent = clone(verifiedAgain);
      const staleReference = staleCurrent.lifecycle.references.find(
        (item) => item.kind === 'documentation_clear' && item.disposition === 'current',
      );
      expect(staleReference).toBeDefined();
      staleReference!.path = firstClear.path;
      staleReference!.sha256 = firstClear.sha256;
      staleReference!.record_id = firstRecordId;
      expect(() =>
        transitionLifecycleState(staleCurrent, 'DELIVERY', 'Reject the previous CLEAR cycle.', clearContext),
      ).toThrow('lifecycle reference identity');
      expect(() =>
        verifyDocumentationClearReference({
          ...clearContext,
          source_revision: verifiedAgain.binding.work_source_revision,
          scope_paths: verifiedAgain.lifecycle.scope.allowed_paths,
          reference_path: firstClear.path,
          reference_sha256: firstClear.sha256,
          reference_id: firstRecordId,
          expected_cycle: 2,
        }),
      ).toThrow('documentation CLEAR reference generation invalid');
      const correctedDelivery = expectReturned(() =>
        transitionLifecycleState(verifiedAgain, 'DELIVERY', 'Deliver corrected work.', clearContext),
      );
      expect(correctedDelivery).not.toBeNull();
      expect(typeof correctedDelivery).toBe('object');
      expect(correctedDelivery.lifecycle.phase).toBe('DELIVERY');
      const deliveryAuthorized = samePhase(
        correctedDelivery,
        (next) =>
          next.lifecycle.references.push(
            reference(next, 'correction_authorization', 'delivery-correction', { decision: 'approved' }),
            reference(next, 'feedback_consumption', 'delivery-consumption'),
            reference(next, 'delivery_receipt', 'delivery-receipt', {
              implementation_fingerprint: secondFingerprint,
              delivery_cycle_id: 'delivery-2',
              decision: 'approved',
            }),
            reference(next, 'runtime_receipt', 'runtime-receipt', {
              implementation_fingerprint: secondFingerprint,
              delivery_cycle_id: 'delivery-2',
              decision: 'accepted',
            }),
            reference(next, 'user_testing_receipt', 'user-testing-receipt', {
              implementation_fingerprint: secondFingerprint,
              delivery_cycle_id: 'delivery-2',
              decision: 'accepted',
            }),
            reference(next, 'feedback', 'delivery-feedback', {
              implementation_fingerprint: secondFingerprint,
              delivery_cycle_id: 'delivery-2',
              decision: 'feedback',
            }),
          ),
        clearContext,
      );
      const deliverySingletonCases: readonly (readonly [LifecycleArtifactKind, Partial<MutableReference>])[] = [
        ['delivery_receipt', { implementation_fingerprint: secondFingerprint, delivery_cycle_id: 'delivery-2' }],
        ['runtime_receipt', { implementation_fingerprint: secondFingerprint, delivery_cycle_id: 'delivery-2' }],
        ['user_testing_receipt', { implementation_fingerprint: secondFingerprint, delivery_cycle_id: 'delivery-2' }],
        [
          'feedback',
          {
            implementation_fingerprint: secondFingerprint,
            delivery_cycle_id: 'delivery-2',
            decision: 'feedback',
          },
        ],
        ['feedback_consumption', {}],
        ['correction_authorization', { decision: 'approved' }],
      ];
      for (const [kind, extra] of deliverySingletonCases) {
        const duplicate = clone(deliveryAuthorized);
        duplicate.lifecycle.references.push(reference(duplicate, kind, `duplicate-${kind}`, extra));
        expect(() => validateLifecycleAggregate(duplicate)).toThrow(`multiple current ${kind} references`);
      }
      const deliveryCorrected = expectReturned(() =>
        transitionLifecycleState(deliveryAuthorized, 'EXECUTE', 'Apply the authorized delivery correction.'),
      );
      expect(deliveryCorrected).not.toBeNull();
      expect(typeof deliveryCorrected).toBe('object');
      expect(deliveryCorrected.lifecycle.phase).toBe('EXECUTE');
      expect(deliveryCorrected.lifecycle.assurance.correction_count).toBe(2);
      expect(deliveryCorrected.lifecycle.seal).toBeNull();
      expect(deliveryCorrected.lifecycle.assurance.review_generation).toBe(
        deliveryAuthorized.lifecycle.assurance.review_generation + 1,
      );
      expect(deliveryCorrected.lifecycle.assurance.delivery_cycle_id).toBeNull();
      expect(
        deliveryCorrected.lifecycle.references.find((item) => item.record_id === 'delivery-consumption')?.disposition,
      ).toBe('consumed');
      expect(deliveryCorrected.lifecycle.references.find((item) => item.record_id === 'manifest-2')?.disposition).toBe(
        'retired',
      );
      for (const recordId of [
        'delivery-receipt',
        'runtime-receipt',
        'user-testing-receipt',
        'delivery-feedback',
        'delivery-correction',
        'review-2-1',
        'review-2-2',
        'review-2-3',
        'reverse-2-1',
        'reverse-2-2',
        'reverse-2-3',
      ])
        expect(deliveryCorrected.lifecycle.references.find((item) => item.record_id === recordId)?.disposition).toBe(
          'retired',
        );
      expect(() => transitionLifecycleState(verifiedAgain, 'EXECUTE', 'Reuse stale correction authority.')).toThrow(
        'current correction_authorization reference required',
      );
      const secondAuthorized = add(
        verifiedAgain,
        reference(verifiedAgain, 'correction_authorization', 'correction-2', { decision: 'approved' }),
        reference(verifiedAgain, 'feedback_consumption', 'consumption-2'),
      );
      const secondCorrected = expectReturned(() =>
        transitionLifecycleState(secondAuthorized, 'EXECUTE', 'Apply the next authorized correction.'),
      );
      expect(secondCorrected).not.toBeNull();
      expect(typeof secondCorrected).toBe('object');
      expect(secondCorrected.lifecycle.assurance.correction_count).toBe(2);
      expect(secondCorrected.lifecycle.seal).toBeNull();
      expect(secondCorrected.lifecycle.assurance.review_generation).toBe(
        secondAuthorized.lifecycle.assurance.review_generation + 1,
      );
      expect(secondCorrected.lifecycle.assurance.delivery_cycle_id).toBeNull();
      for (const recordId of ['validation-2', 'test-2', 'reservation-2', 'attestation-2', 'review-packet-2'])
        expect(secondCorrected.lifecycle.references.find((item) => item.record_id === recordId)?.disposition).toBe(
          'retired',
        );
      const retained = verifiedAgain.lifecycle.references.filter((item) => item.disposition !== 'current');
      expect(retained.length).toBeGreaterThan(0);
      for (const item of retained)
        expect(secondCorrected.lifecycle.references.find((next) => next.record_id === item.record_id)).toEqual(item);
      expectReturned(() => validateLifecycleProgress(secondAuthorized, secondCorrected));
      expect(() => validateLifecycleProgress(work, { ...corrected, revision: corrected.revision + 1 })).toThrow();
      completed = true;
    } catch (error) {
      console.error(`[lifecycle-state] retained failed fixture: ${fixture.root}`);
      throw error;
    } finally {
      if (completed && performance.now() < cleanupDeadline) rmSync(fixture.root, { recursive: true, force: true });
      else if (completed) console.error(`[lifecycle-state] retained expired fixture: ${fixture.root}`);
    }
  }, 30_000);
});
