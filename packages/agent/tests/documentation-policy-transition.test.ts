import { expect, test } from 'bun:test';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { policy, preparedFixture } from './helpers/documentation-policy-fixture.ts';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.ts';
import { executeDocumentationClearFromWork } from '../src/documentation/clear.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { expectAsyncReturned, expectRejection } from './helpers/expect-rejection.ts';
import {
  documentationPolicyTransitionPath,
  validatePolicyMapAddition,
  parseDocumentationPolicyTransition,
} from '../src/documentation/policy-transition.ts';

const target = { ...policy, map_paths: [...policy.map_paths, 'bundle/TESTING.md'] };
const bytes = JSON.stringify;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('fixture record required');
  return value;
}

function statusOf(value: unknown): string {
  const result = recordValue(value);
  if (typeof result.status !== 'string') throw new Error('reconcile result status required');
  return result.status;
}

test('policy registration accepts additive maps with every other field exact', () => {
  expect(validatePolicyMapAddition(bytes(policy), bytes(target))).toEqual(['bundle/TESTING.md']);
});
test('policy registration rejects ownership, timestamp and relations changes', () => {
  for (const change of [{ owner: 'different' }, { updated_at: '2026-09-30T00:00:00.000Z' }, { relations: [] }])
    expect(() => validatePolicyMapAddition(bytes(policy), bytes({ ...target, ...change }))).toThrow('non-map');
});
test('policy registration rejects removal, duplicate, reorder and empty additions', () => {
  for (const maps of [[], ['docs/map.md', 'docs/map.md'], policy.map_paths])
    expect(() => validatePolicyMapAddition(bytes(policy), bytes({ ...policy, map_paths: maps }))).toThrow();
  const before = { ...policy, map_paths: ['docs/a.md', 'docs/b.md'] };
  expect(() =>
    validatePolicyMapAddition(
      bytes(before),
      bytes({ ...before, map_paths: ['docs/b.md', 'docs/a.md', 'bundle/TESTING.md'] }),
    ),
  ).toThrow('order');
});
test('policy transition parser rejects unknown fields and incomplete forged closure', () => {
  expect(() =>
    parseDocumentationPolicyTransition(
      Buffer.from(
        bytes({
          schema: 'DocumentationPolicyTransition/v1',
          phase: 'applied',
          maintenance_released: true,
          unexpected: true,
        }),
      ),
    ),
  ).toThrow('schema');
});

test('public policy transition preserves genuine baseline and completes one audited cycle', async () => {
  const { f, input, baseline, before, targetPolicy, args } = await preparedFixture();
  expect(statusOf(await expectAsyncReturned(() => runReconcileArtifacts(args('inspect'))))).toBe(
    'inspect_ready_unauthorized',
  );
  expect(statusOf(await expectAsyncReturned(() => runReconcileArtifacts(args('plan'))))).toBe('planned');
  expect(statusOf(await expectAsyncReturned(() => runReconcileArtifacts(args('apply'))))).toBe(
    'author_policy_required',
  );
  expect(readFileSync(path.join(f.root, f.policyPath), 'utf8')).toBe(f.json(f.oldPolicy));
  f.put(f.policyPath, targetPolicy);
  expect(statusOf(await expectAsyncReturned(() => runReconcileArtifacts(args('resume'))))).toBe('applied');
  const lineage = readFileSync(path.join(f.root, f.oldPolicy.changelog_path), 'utf8');
  expect(lineage.trim().split('\n')).toHaveLength(1);
  expect(statusOf(await expectAsyncReturned(() => runReconcileArtifacts(args('resume'))))).toBe('applied');
  expect(readFileSync(path.join(f.root, f.oldPolicy.changelog_path), 'utf8')).toBe(lineage);
  expect(readFileSync(path.join(f.root, baseline.path)).equals(before)).toBe(true);
  expect((await executeDocumentationClearFromWork(input, 'verify')).status).toBe('verified');
  await Promise.resolve(expect(runReconcileArtifacts(args('restore'))).rejects.toThrow('rollback'));
}, 30000);

const interruptedPhases = ['fence_acquired', 'events_frozen', 'events_published', 'applied', 'released'] as const;
for (const phase of interruptedPhases) {
  test(`public policy transition resumes interruption at ${phase} without duplicate lineage`, async () => {
    const { f, input, baseline, before, targetPolicy, args } = await preparedFixture();
    await expectAsyncReturned(() => runReconcileArtifacts(args('plan')));
    const fault = {
      onPhase: (actual: string): void => {
        if (actual === phase) throw Error('fixture interruption');
      },
    };
    if (phase === 'fence_acquired') {
      await Promise.resolve(
        expect(runReconcileArtifacts(args('apply'), fault)).rejects.toThrow('fixture interruption'),
      );
      expect(statusOf(await expectAsyncReturned(() => runReconcileArtifacts(args('resume'))))).toBe(
        'author_policy_required',
      );
      f.put(f.policyPath, targetPolicy);
    } else {
      await expectAsyncReturned(() => runReconcileArtifacts(args('apply')));
      f.put(f.policyPath, targetPolicy);
      await Promise.resolve(
        expect(runReconcileArtifacts(args('resume'), fault)).rejects.toThrow('fixture interruption'),
      );
    }
    expect(statusOf(await expectAsyncReturned(() => runReconcileArtifacts(args('resume'))))).toBe('applied');
    const lineage = readFileSync(path.join(f.root, f.oldPolicy.changelog_path), 'utf8');
    expect(lineage.trim().split('\n')).toHaveLength(1);
    expect((await executeDocumentationClearFromWork(input, 'verify')).status).toBe('verified');
    expect(readFileSync(path.join(f.root, baseline.path)).equals(before)).toBe(true);
  }, 30000);
}

test('public CLEAR rejects forged phase, events and closure references', async () => {
  const { f, input, targetPolicy, args } = await preparedFixture();
  await expectAsyncReturned(() => runReconcileArtifacts(args('plan')));
  await expectAsyncReturned(() => runReconcileArtifacts(args('apply')));
  f.put(f.policyPath, targetPolicy);
  await Promise.resolve(
    expect(
      runReconcileArtifacts(args('resume'), {
        onPhase: (phase: string): void => {
          if (phase === 'events_published') throw Error('before closeout');
        },
      }),
    ).rejects.toThrow('before closeout'),
  );
  const file = `.agent/work/${f.work}/documentation-policy-transition.v1.json`,
    original = readFileSync(path.join(f.root, file), 'utf8');
  const forged = recordValue(JSON.parse(original));
  forged.phase = 'applied';
  forged.maintenance_released = true;
  delete forged.operation_digest;
  forged.operation_digest = canonicalJsonDigest(forged);
  f.put(file, f.json(forged));
  await Promise.resolve(
    expect(executeDocumentationClearFromWork(input, 'closeout')).rejects.toThrow('closeout reference'),
  );
  f.put(file, original);
  await expectAsyncReturned(() => runReconcileArtifacts(args('resume')));
  const applied = readFileSync(path.join(f.root, file), 'utf8');
  const mutations: ((record: Record<string, unknown>) => void)[] = [
    (record) => {
      if (!Array.isArray(record.events)) throw new Error('fixture events required');
      const event = recordValue(record.events[0]);
      if (typeof event.bytes !== 'string') throw new Error('fixture event bytes required');
      event.bytes = event.bytes.replace('finalize', 'init');
    },
    (record) => {
      const closeout = recordValue(record.closeout);
      if (typeof closeout.sha256 !== 'string') throw new Error('fixture closeout digest required');
      closeout.sha256 = '0'.repeat(64);
    },
  ];
  for (const mutation of mutations) {
    const record = recordValue(JSON.parse(applied));
    mutation(record);
    delete record.operation_digest;
    record.operation_digest = canonicalJsonDigest(record);
    f.put(file, f.json(record));
    await Promise.resolve(expect(executeDocumentationClearFromWork(input, 'verify')).rejects.toThrow());
  }
  f.put(file, applied);
  expect((await executeDocumentationClearFromWork(input, 'verify')).status).toBe('verified');
}, 30000);

test('public policy planning denies an extra or substituted map outside exact scope', async () => {
  const { f, targetPath, args } = await preparedFixture();
  const additions: string[][] = [['docs/unapproved.md'], ['vida-agent/TESTING.md', 'docs/unapproved.md']];
  for (const paths of additions) {
    f.put(targetPath, f.json({ ...f.oldPolicy, map_paths: [...f.oldPolicy.map_paths, ...paths] }));
    await Promise.resolve(
      expect(runReconcileArtifacts(args('plan'))).rejects.toThrow('exact accepted documentation scope'),
    );
  }
}, 30000);

test('public policy planning rejects caller or instruction identity drift before writing its operation', async () => {
  const { f, baseline, args } = await preparedFixture();
  const operationPath = path.join(f.root, documentationPolicyTransitionPath(f.work));
  expect(existsSync(operationPath)).toBe(false);
  const policyBytes = readFileSync(path.join(f.root, f.policyPath));
  const changelogBytes = readFileSync(path.join(f.root, f.oldPolicy.changelog_path));
  const baselineBytes = readFileSync(path.join(f.root, baseline.path));
  for (const [option, wrongValue] of [
    ['--actor', 'project:foreign-caller'],
    ['--instruction-ref', 'TEST SETUP: foreign pointer'],
  ] as const) {
    const invocation = args('plan');
    const optionIndex = invocation.indexOf(option);
    if (optionIndex < 0 || invocation[optionIndex + 1] === undefined)
      throw new Error(`fixture invocation omitted ${option}`);
    invocation[optionIndex + 1] = wrongValue;
    await expectRejection(
      runReconcileArtifacts(invocation),
      'documentation policy transition: actual source scope/attribution differs',
    );
    expect(existsSync(operationPath)).toBe(false);
    expect(readFileSync(path.join(f.root, f.policyPath))).toEqual(policyBytes);
    expect(readFileSync(path.join(f.root, f.oldPolicy.changelog_path))).toEqual(changelogBytes);
    expect(readFileSync(path.join(f.root, baseline.path))).toEqual(baselineBytes);
  }
});

test('public policy planning rejects foreign baseline identity fields before writing its operation', async () => {
  const { f, baseline, args } = await preparedFixture();
  const baselineBytes = readFileSync(path.join(f.root, baseline.path));
  const baselineRecord = recordValue(JSON.parse(baselineBytes.toString('utf8')));
  const operationPath = path.join(f.root, documentationPolicyTransitionPath(f.work));
  for (const [key, foreign] of [
    ['repository_id', 'foreign-repository'],
    ['project_id', 'foreign-project'],
    ['policy_id', 'foreign-policy'],
  ] as const) {
    const { digest: _digest, ...body } = baselineRecord;
    const forgedBody = { ...body, [key]: foreign };
    f.put(baseline.path, f.json({ ...forgedBody, digest: canonicalJsonDigest(forgedBody) }));
    await Promise.resolve(
      expect(runReconcileArtifacts(args('plan'))).rejects.toThrow(
        key === 'policy_id'
          ? 'documentation policy transition: policy schema/path/baseline differs'
          : 'documentation policy transition: baseline is not current actual authorized scope',
      ),
    );
    expect(existsSync(operationPath)).toBe(false);
    f.put(baseline.path, baselineBytes);
  }
}, 30000);
