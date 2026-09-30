import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ensureForwardLifecycleClear } from '../../controllers/forward-lifecycle-clear.mjs';
import { scanForwardResources } from '../../controllers/forward-payload-runtime.mjs';
import { requireSafeRepositoryAccess } from '../../../../vida-agent/src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../../../../vida-agent/src/orchestration/scoped-source-snapshot.ts';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..'),
  scratch = path.join(repo, '.tmp') + path.sep;
const parser = createRequire(path.join(repo, 'vida-agent/package.json'))('@babel/parser');
assert.deepEqual(scanForwardResources('new URL(destination)', parser), []);
assert.deepEqual(scanForwardResources("new URL('../../schemas/example.json', import.meta.url)", parser), [
  '../../schemas/example.json',
]);
assert.throws(() => scanForwardResources('new URL(resource, import.meta.url)', parser), /computed module resource/u);
assert.deepEqual(scanForwardResources('new URL(resource, base)', parser), []);
const root = path.resolve(process.env.VIDA_FORWARD_CLEAR_FIXTURE ?? '');
if (!root.startsWith(scratch) || !root.includes('combined-'))
  throw Error('Use a released existing isolated combined fixture only');
const stage = path.join(repo, '.tmp/vida-project-config-rebind-20260929'),
  payloadRoot = path.join(stage, 'verification-overlay');
const parent = path.join(repo, '.tmp/vida-runtime-code-rebind-stage-20260929/parent');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const instruction = 'vida-agent/instructions/development-lifecycle.md',
  policy = 'docs/agent-instructions/documentation-policy.v1.json';
const oldBytes = readFileSync(path.join(parent, instruction)),
  newBytes = readFileSync(path.join(payloadRoot, instruction));
writeFileSync(path.join(root, instruction), oldBytes); // TEST SETUP ONLY in released scratch.
const documentationWorkId = 'vida-project-config-docflow-fixture-20260930',
  operationId = 'vida-docflow-public-fixture-20260930';
const dir = path.join(root, '.agent/work', documentationWorkId);
mkdirSync(dir, { recursive: true });
mkdirSync(path.join(root, '.agent/cutover', operationId), { recursive: true });
const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [instruction]);
const scope = {
  ...JSON.parse(readFileSync(path.join(stage, 'documentation-scope.draft.json'))),
  work_id: documentationWorkId,
  scope_id: `scope-${documentationWorkId}`,
  source_revision: source.digest,
  // This focused case owns only lifecycle; policy-transition integration is separate.
  allowed_paths: [instruction],
  implementation_paths: [instruction],
  documentation_paths: [instruction],
};
writeFileSync(path.join(dir, 'scope.json'), JSON.stringify(scope, null, 2) + '\n');
const options = {
  root,
  payloadRoot,
  operationId,
  documentationWorkId,
  oldHash: sha(oldBytes),
  newHash: sha(newBytes),
  policyHash: sha(readFileSync(path.join(root, policy))),
  parentManifest: sha(readFileSync(path.join(parent, 'vida-agent-payload.manifest.v1.json'))),
  successorManifest: sha(readFileSync(path.join(payloadRoot, 'vida-agent-payload.manifest.v1.json'))),
};
await assert.rejects(
  ensureForwardLifecycleClear({ ...options, phase: 'baseline', documentationWorkId: null }),
  /binding invalid/u,
);
const baseline = await ensureForwardLifecycleClear({ ...options, phase: 'baseline' });
const resumed = await ensureForwardLifecycleClear({ ...options, phase: 'baseline' });
assert.equal(baseline.baseline_path, resumed.baseline_path);
assert.equal(readdirSync(dir).filter((name) => name.startsWith('documentation-baseline-')).length, 1);
writeFileSync(path.join(root, instruction), newBytes); // TEST SETUP ONLY exact successor installation.
const closeout = await ensureForwardLifecycleClear({ ...options, phase: 'closeout' });
assert.equal(closeout.status, 'closeout_verified');
assert.equal(closeout.repair_plan_digest, null);
assert.equal(closeout.current_closeout_path, closeout.closeout_path);
const changelog = JSON.parse(readFileSync(path.join(root, policy))).changelog_path;
const before = readFileSync(path.join(root, changelog));
for (const phase of ['historical', 'current', 'current_verify', 'verify']) {
  const result = await ensureForwardLifecycleClear({ ...options, phase });
  assert.equal(result.closeout_path, closeout.closeout_path);
  assert.equal(result.closeout_sha256, closeout.closeout_sha256);
  assert.equal(result.event_id, closeout.event_id);
  assert.equal(result.repair_plan_digest, null);
  await assert.rejects(
    ensureForwardLifecycleClear({ ...options, phase, documentationWorkId: null }),
    /binding invalid/u,
  );
}
const otherId = 'vida-docflow-substitution-fixture-20260930';
mkdirSync(path.join(root, '.agent/work', otherId), { recursive: true });
writeFileSync(path.join(root, '.agent/work', otherId, 'scope.json'), JSON.stringify({ ...scope, work_id: otherId }));
for (const phase of ['baseline', 'closeout', 'current_verify'])
  await assert.rejects(
    ensureForwardLifecycleClear({ ...options, phase, documentationWorkId: otherId }),
    /checkpoint differs/u,
  );
assert.deepEqual(readFileSync(path.join(root, changelog)), before);
assert.equal(readdirSync(dir).filter((name) => name.startsWith('documentation-closeout-')).length, 1);
console.log(
  JSON.stringify({
    status: 'pass',
    same_new_cycle: true,
    substituted_missing_id_denied: true,
    repair_output: false,
    fixture: root,
    native_calls: 0,
    runtime_acceptance: false,
    setup: 'TEST SETUP ONLY',
  }),
);
