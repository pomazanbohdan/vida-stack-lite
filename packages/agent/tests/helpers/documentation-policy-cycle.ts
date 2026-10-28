import { expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runReconcileArtifacts } from '../../bin/reconcile-artifacts.ts';
import { preparedFixture } from './documentation-policy-fixture.ts';
import { expectAsyncReturned } from './expect-rejection.ts';

export async function prepareAuditedPolicyTransition() {
  const { f, input, baseline, before, targetPolicy, args } = await preparedFixture();
  expect(await expectAsyncReturned(() => runReconcileArtifacts(args('inspect')))).toHaveProperty(
    'status',
    'inspect_ready_unauthorized',
  );
  expect(await expectAsyncReturned(() => runReconcileArtifacts(args('plan')))).toHaveProperty('status', 'planned');
  expect(await expectAsyncReturned(() => runReconcileArtifacts(args('apply')))).toHaveProperty(
    'status',
    'author_policy_required',
  );
  expect(readFileSync(path.join(f.root, f.policyPath), 'utf8')).toBe(f.json(f.oldPolicy));
  f.put(f.policyPath, targetPolicy);
  expect(await expectAsyncReturned(() => runReconcileArtifacts(args('resume')))).toHaveProperty('status', 'applied');
  const lineage = readFileSync(path.join(f.root, f.oldPolicy.changelog_path), 'utf8');
  expect(lineage.trim().split('\n')).toHaveLength(1);
  expect(await expectAsyncReturned(() => runReconcileArtifacts(args('resume')))).toHaveProperty('status', 'applied');
  expect(readFileSync(path.join(f.root, f.oldPolicy.changelog_path), 'utf8')).toBe(lineage);
  expect(readFileSync(path.join(f.root, baseline.path)).equals(before)).toBe(true);
  return { input, args };
}
