import { describe, expect, test } from 'bun:test';
import {
  LifecycleStateError,
  transitionLifecycleState,
  validateLifecycleAggregate,
  validateLifecycleProgress,
} from '../../src/lifecycle/lifecycle-state.ts';
import { executeDocumentationClearOperation } from '../../src/documentation/clear.ts';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
function clearFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-lifecycle-'));
  const write = (relative, content) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  mkdirSync(path.join(root, '.git'));
  for (const [destination, template] of [
    ['AGENTS.md', 'AGENTS.template.md'],
    ['AGENT.sidecar.md', 'AGENT.sidecar.template.md'],
    ['agent-runtime.config.v1.yaml', 'agent-runtime.config.template.v1.yaml'],
  ])
    write(
      destination,
      readFileSync(path.join(packageRoot, 'templates', template), 'utf8')
        .replaceAll('{{REPOSITORY}}', 'fixture-repository')
        .replaceAll('{{PROJECTS}}', 'fixture-project')
        .replaceAll('{{PROJECT}}', 'fixture-project')
        .replaceAll('{{BUNDLE}}', 'vida-agent'),
    );
  write(
    'vida-agent/schemas/documentation-policy.v1.schema.json',
    readFileSync(path.join(packageRoot, 'schemas/documentation-policy.v1.schema.json')),
  );
  write('vida-agent/TESTING.md', 'fixture testing\n');
  write('docs/fixture/map.md', 'map\n');
  write('docs/agent-instructions/index.md', 'index\n');
  write('docs/agent-instructions/current.md', 'current\n');
  write(
    'docs/agent-instructions/documentation-policy.v1.json',
    JSON.stringify({
      schema: 'DocumentationPolicy/v1',
      policy_id: 'lifecycle-clear',
      project_id: 'fixture-project',
      source_path: 'docs/agent-instructions/documentation-policy.v1.json',
      owner: 'project:fixture-project',
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

const hash = (character) => character.repeat(64);
const clone = (value) => JSON.parse(JSON.stringify(value));
function initialWork() {
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
function reference(work, kind, id, extra = {}) {
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
function samePhase(work, mutate, context) {
  const next = clone(work);
  next.revision++;
  next.lifecycle.revision++;
  mutate(next);
  validateLifecycleProgress(work, next, context);
  return next;
}
function add(work, ...references) {
  return samePhase(work, (next) => next.lifecycle.references.push(...references));
}

describe('current WorkState/v1 lifecycle aggregate', () => {
  test('executes the full lifecycle through current typed evidence bindings', async () => {
    const fixture = clearFixture();
    try {
      let work = initialWork();
      validateLifecycleAggregate(work);
      work = transitionLifecycleState(work, 'TRACE', 'Freeze the current plan.');
      work = add(
        work,
        reference(work, 'source_plan', 'source-plan'),
        reference(work, 'acceptance_manifest', 'acceptance'),
        reference(work, 'implementation_scope', 'scope'),
      );
      work = transitionLifecycleState(work, 'PLAN', 'Bind execution authority.');
      work = add(
        work,
        reference(work, 'execution_approval', 'approval', { decision: 'approved' }),
        reference(work, 'platform_knowledge', 'knowledge'),
        reference(work, 'implementation_policy', 'policy'),
        reference(work, 'change_impact_pre', 'impact-pre'),
        reference(work, 'documentation_validation', 'docs-pre', { decision: 'pass' }),
      );
      work = transitionLifecycleState(work, 'EXECUTE', 'Implement the accepted scope.');
      const fingerprint = hash('e');
      const clearInput = {
        repository_root: fixture.root,
        repository_id: 'fixture-repository',
        project_id: 'fixture-project',
        work_id: 'lifecycle-clear',
        source_revision: 'source-1',
        scope_paths: ['src/task.ts'],
      };
      await executeDocumentationClearOperation(clearInput, 'baseline');
      const clearResult = await executeDocumentationClearOperation(clearInput, 'closeout');
      const clearRecord = JSON.parse(readFileSync(path.join(fixture.root, clearResult.path), 'utf8'));
      const clearContext = {
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
      work = transitionLifecycleState(work, 'VERIFY', 'Collect independent assurance.');
      work = samePhase(work, (next) => {
        next.lifecycle.assurance.review_generation = 1;
        next.lifecycle.assurance.delivery_cycle_id = 'delivery-1';
        next.lifecycle.references.push(
          reference(next, 'review_packet', 'review-packet', {
            generation: 1,
            implementation_fingerprint: fingerprint,
          }),
          reference(next, 'documentation_clear', clearRecord.clear_id, {
            path: clearResult.path,
            sha256: clearResult.sha256,
            generation: 1,
            implementation_fingerprint: fingerprint,
            decision: 'pass',
          }),
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
      expect(() => transitionLifecycleState(work, 'DELIVERY', 'Wait for current-version testing.')).toThrow(
        'context required',
      );
      fixture.write('docs/agent-instructions/current.md', 'changed\n');
      expect(() =>
        transitionLifecycleState(work, 'DELIVERY', 'Wait for current-version testing.', clearContext),
      ).toThrow();
      fixture.write('docs/agent-instructions/current.md', 'current\n');
      work = transitionLifecycleState(work, 'DELIVERY', 'Wait for current-version testing.', clearContext);
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
      work = transitionLifecycleState(work, 'COMPLETE', 'Complete.', clearContext);
      expect(work.lifecycle.phase).toBe('COMPLETE');
      expect(() => transitionLifecycleState(work, 'EXECUTE', 'No.')).toThrow(LifecycleStateError);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('rejects skipped phases, stale bindings and duplicate reviewer identity', () => {
    const work = initialWork();
    expect(() => transitionLifecycleState(work, 'PLAN', 'Skip trace.')).toThrow('illegal lifecycle transition');
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

  test('correction retires stale assurance and delivery evidence in one typed transition', async () => {
    const fixture = clearFixture();
    try {
      let work = initialWork();
      work = transitionLifecycleState(work, 'TRACE', 'Plan.');
      work = add(
        work,
        reference(work, 'source_plan', 'source-plan'),
        reference(work, 'acceptance_manifest', 'acceptance'),
        reference(work, 'implementation_scope', 'scope'),
      );
      work = transitionLifecycleState(work, 'PLAN', 'Authorize.');
      work = add(
        work,
        reference(work, 'execution_approval', 'approval', { decision: 'approved' }),
        reference(work, 'platform_knowledge', 'knowledge'),
        reference(work, 'implementation_policy', 'policy'),
        reference(work, 'change_impact_pre', 'impact-pre'),
        reference(work, 'documentation_validation', 'docs-pre', { decision: 'pass' }),
      );
      work = transitionLifecycleState(work, 'EXECUTE', 'Implement.');
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
      work = transitionLifecycleState(work, 'VERIFY', 'Review.');
      const clearInput = {
        repository_root: fixture.root,
        repository_id: 'fixture-repository',
        project_id: 'fixture-project',
        work_id: 'lifecycle-clear',
        source_revision: 'source-1',
        scope_paths: ['src/task.ts'],
      };
      await executeDocumentationClearOperation(clearInput, 'baseline');
      const firstClear = await executeDocumentationClearOperation(clearInput, 'closeout');
      const firstRecord = JSON.parse(readFileSync(path.join(fixture.root, firstClear.path), 'utf8'));
      work = samePhase(work, (next) => {
        next.lifecycle.assurance.review_generation = 1;
        next.lifecycle.references.push(
          reference(next, 'review_packet', 'review-packet-1', {
            generation: 1,
            implementation_fingerprint: fingerprint,
          }),
        );
        next.lifecycle.references.push(
          reference(next, 'documentation_clear', firstRecord.clear_id, {
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
      const corrected = transitionLifecycleState(work, 'EXECUTE', 'Apply the authorized correction.');
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
      verifiedAgain = transitionLifecycleState(verifiedAgain, 'VERIFY', 'Review the corrected implementation.');
      await executeDocumentationClearOperation(clearInput, 'baseline');
      const secondClear = await executeDocumentationClearOperation(clearInput, 'closeout');
      expect(secondClear.path).toContain('documentation-closeout-0002.v1.json');
      const secondRecord = JSON.parse(readFileSync(path.join(fixture.root, secondClear.path), 'utf8'));
      const secondFingerprint = hash('f');
      verifiedAgain = samePhase(verifiedAgain, (next) => {
        next.lifecycle.assurance.delivery_cycle_id = 'delivery-2';
        next.lifecycle.references.push(
          reference(next, 'review_packet', 'review-packet-2', {
            generation: 2,
            implementation_fingerprint: secondFingerprint,
          }),
          reference(next, 'documentation_clear', secondRecord.clear_id, {
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
      const clearContext = {
        repository_root: fixture.root,
        repository_id: clearInput.repository_id,
        project_id: clearInput.project_id,
        work_id: clearInput.work_id,
      };
      const staleCurrent = clone(verifiedAgain);
      const staleReference = staleCurrent.lifecycle.references.find(
        (item) => item.kind === 'documentation_clear' && item.disposition === 'current',
      );
      staleReference.path = firstClear.path;
      staleReference.sha256 = firstClear.sha256;
      staleReference.record_id = firstRecord.clear_id;
      expect(() =>
        transitionLifecycleState(staleCurrent, 'DELIVERY', 'Reject the previous CLEAR cycle.', clearContext),
      ).toThrow();
      expect(
        transitionLifecycleState(verifiedAgain, 'DELIVERY', 'Deliver corrected work.', clearContext).lifecycle.phase,
      ).toBe('DELIVERY');
      expect(() => transitionLifecycleState(verifiedAgain, 'EXECUTE', 'Reuse stale correction authority.')).toThrow(
        'current correction_authorization reference required',
      );
      expect(() => validateLifecycleProgress(work, { ...corrected, revision: corrected.revision + 1 })).toThrow();
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }, 30_000);
});
