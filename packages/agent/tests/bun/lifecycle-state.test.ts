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
import { expectReturned } from '../helpers/expect-rejection.ts';

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
      await executeDocumentationClearOperation(clearInput, 'baseline');
      const clearResult = await executeDocumentationClearOperation(clearInput, 'closeout');
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
      fixture.write('docs/agent-instructions/current.md', 'changed\n');
      expect(() => transitionLifecycleState(work, 'COMPLETE', 'Complete.', clearContext)).toThrow();
      fixture.write('docs/agent-instructions/current.md', 'current\n');
      work = expectReturned(() => transitionLifecycleState(work, 'COMPLETE', 'Complete.', clearContext));
      expect(work).not.toBeNull();
      expect(typeof work).toBe('object');
      expect(work.lifecycle.phase).toBe('COMPLETE');
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
      await executeDocumentationClearOperation(clearInput, 'baseline');
      const firstClear = await executeDocumentationClearOperation(clearInput, 'closeout');
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
      expect(corrected.lifecycle.references.find((item) => item.kind === 'implementation_result')?.disposition).toBe(
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
      await executeDocumentationClearOperation(clearInput, 'baseline');
      const secondClear = await executeDocumentationClearOperation(clearInput, 'closeout');
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
      });
      const clearContext: DocumentationVerificationContext = {
        repository_root: fixture.root,
        repository_id: clearInput.repository_id,
        project_id: clearInput.project_id,
        work_id: clearInput.work_id,
      };
      const staleCurrent = clone(verifiedAgain);
      const staleReference = staleCurrent.lifecycle.references.find(
        (item) => item.kind === 'documentation_clear' && item.disposition === 'current',
      );
      if (!staleReference) throw new Error('current documentation CLEAR reference missing');
      staleReference.path = firstClear.path;
      staleReference.sha256 = firstClear.sha256;
      staleReference.record_id = firstRecordId;
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
