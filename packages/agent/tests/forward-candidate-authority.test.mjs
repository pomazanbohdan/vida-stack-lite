import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
  unlinkSync,
  existsSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { preparedFixture } from './documentation-policy-transition.test.mjs';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('sealed public admin denies altered authority, root, closure and target before database effects', async () => {
  const { f, baseline, targetPolicy, args } = await preparedFixture();
  const payload = path.join(f.root, 'admitted-source'),
    bundle = path.join(payload, 'vida-agent');
  mkdirSync(payload);
  cpSync(f.bundle, bundle, { recursive: true, filter: (file) => path.basename(file) !== 'node_modules' });
  // This private test payload uses current source; its synthetic review tuple is setup only.
  for (const file of ['bin/forward-candidate-admission.mjs', 'bin/documentation-policy-transition.mjs'])
    writeFileSync(path.join(bundle, file), readFileSync(path.resolve(import.meta.dirname, '..', file)));
  const installedDeps = createRequire(path.join(f.bundle, 'package.json'))
    .resolve.paths('yaml')
    .find(
      (directory) =>
        existsSync(path.join(directory, 'yaml/package.json')) && existsSync(path.join(directory, 'ajv/package.json')),
    );
  if (!installedDeps) throw new Error('Fixture requires installed package dependencies');
  symlinkSync(installedDeps, path.join(f.root, 'node_modules'), 'junction');
  symlinkSync(installedDeps, path.join(f.root, 'vida-agent/node_modules'), 'junction');
  for (const file of ['bun.lock', '.bun-version'])
    f.put('vida-agent/' + file, readFileSync(path.resolve(import.meta.dirname, '..', file)));
  const target = path.join(payload, f.policyPath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, targetPolicy);
  const alternate = 'docs/agent-instructions/alternate-policy.json';
  writeFileSync(path.join(payload, alternate), targetPolicy);
  const files = [];
  const walk = (relative = '') => {
    for (const item of readdirSync(path.join(payload, relative), { withFileTypes: true })) {
      const file = relative ? relative + '/' + item.name : item.name;
      if (item.isDirectory()) walk(file);
      else {
        const bytes = readFileSync(path.join(payload, file));
        files.push({ path: file, size: bytes.length, sha256: sha(bytes) });
      }
    }
  };
  walk();
  const manifest = f.json({
    schema: 'VidaAgentPreparedPayload/v1',
    files: files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
    unresolved_integration_paths: [],
  });
  writeFileSync(path.join(payload, 'vida-agent-payload.manifest.v1.json'), manifest);
  const operation = 'fixture-admitted-forward',
    selected = readFileSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'));
  const cutoff = f.json({
    schema: 'VidaNewWorkCutoffWitness/v1',
    generation: 'fixture-parent',
    synthetic: 'TEST SETUP ONLY',
  });
  f.put('.agent/cutover/fixture-parent/cutoff-witness.json', cutoff);
  const intent = {
    schema: 'VidaForwardUpdateMaintenance/v1',
    operation_id: operation,
    operator: 'fixture-operator',
    parent_generation: 'fixture-parent',
    parent_selector_sha256: sha(selected),
    parent_cutoff_sha256: sha(cutoff),
    old_payload_manifest_sha256: '1'.repeat(64),
    new_payload_manifest_sha256: sha(manifest),
    changed: [],
    preserved_mutable_outputs: [],
  };
  const base = '.agent/cutover/' + operation,
    intentBytes = f.json(intent);
  f.put(base + '/forward-intent.v1.json', intentBytes);
  f.put('.agent/cutover/fixture-parent/maintenance-lock.v1.json', intentBytes);
  const evidence = ['correctness', 'security', 'assurance'].map((kind) => {
    const actor = 'fixture-' + kind,
      history = 'fixture-history-' + kind;
    const review = f.json({
      schema: 'VidaForwardReviewReceipt/v1',
      operation_id: operation,
      kind,
      actor,
      history_id: history,
      native_tool_ref: 'TEST SETUP ONLY ' + kind,
      sealed_fingerprint: sha(intentBytes),
      fresh_blind: true,
      verdict: 'pass',
      scope_reviewed: 'complete',
    });
    const reverse = f.json({
      schema: 'VidaForwardReverseValidation/v1',
      operation_id: operation,
      kind,
      actor,
      history_id: history,
      sealed_fingerprint: sha(intentBytes),
      review_sha256: sha(review),
      result: 'pass',
    });
    f.put(base + '/' + kind + '.json', review);
    f.put(base + '/' + kind + '-reverse.json', reverse);
    return {
      kind,
      path: base + '/' + kind + '.json',
      sha256: sha(review),
      reverse_path: base + '/' + kind + '-reverse.json',
      reverse_sha256: sha(reverse),
      status: 'passed',
    };
  });
  const authorization = f.json({
    schema: 'VidaForwardUpdateAuthorization/v1',
    operation_id: operation,
    operator: 'fixture-operator',
    outcome: 'approved',
    pointer: 'TEST SETUP ONLY',
    plan_sha256: sha(intentBytes),
    evidence,
  });
  const authorizationPath = base + '/forward-authorization.v1.json';
  f.put(authorizationPath, authorization);
  const supplied = args('inspect');
  supplied[supplied.indexOf('--target-policy') + 1] = f.policyPath;
  const command = [...supplied, '--forward-operation', operation, '--payload-root', payload];
  const dbPath = path.join(f.root, '.agent/work/session-handoff.v1.sqlite'),
    dbBefore = readFileSync(dbPath),
    baselineBefore = readFileSync(path.join(f.root, baseline.path));
  const invoke = (values) =>
    spawnSync(process.execPath, [path.join(bundle, 'bin/reconcile-artifacts.mjs'), ...values], {
      cwd: f.root,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000,
    });
  const unchanged = () => {
    expect(readFileSync(dbPath).equals(dbBefore)).toBe(true);
    expect(readFileSync(path.join(f.root, baseline.path)).equals(baselineBefore)).toBe(true);
    expect(readFileSync(path.join(f.root, f.policyPath), 'utf8')).toBe(f.json(f.oldPolicy));
  };
  const control = invoke(command);
  expect(control.status, control.stderr).toBe(0);
  expect(JSON.parse(control.stdout).status).toBe('inspect_ready_unauthorized');
  unchanged();
  const denies = (values, pattern) => {
    const result = invoke(values);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr).message).toMatch(pattern);
    unchanged();
  };
  denies(supplied, /sealed administrative admission/);
  const replace = (key, value) => {
    const values = [...command];
    values[values.indexOf(key) + 1] = value;
    return values;
  };
  denies(replace('--forward-operation', 'foreign-operation'), /ENOENT|forward/);
  denies(replace('--project-root', path.dirname(f.root)), /configuration|config|ENOENT/);
  denies(replace('--target-policy', alternate), /configured canonical policy/);
  const alias = path.join(f.root, 'payload-alias');
  symlinkSync(payload, alias, 'junction');
  denies(replace('--payload-root', alias), /redirected or unsafe/);
  unlinkSync(path.join(f.root, authorizationPath));
  denies(command, /ENOENT/);
  f.put(authorizationPath, authorization);
  f.put(authorizationPath, f.json({ ...JSON.parse(authorization), outcome: 'rejected' }));
  denies(command, /authorization differs/);
  f.put(authorizationPath, authorization);
  const reviewPath = evidence[0].path,
    reviewBefore = readFileSync(path.join(f.root, reviewPath));
  f.put(reviewPath, f.json({ ...JSON.parse(reviewBefore), verdict: 'fail' }));
  denies(command, /review bytes differ/);
  f.put(reviewPath, reviewBefore);
  for (const file of ['vida-agent/src/documentation/policy-transition.ts', f.policyPath]) {
    const target = path.join(payload, file),
      before = readFileSync(target);
    writeFileSync(target, Buffer.concat([before, Buffer.from('\n ')]));
    denies(command, /sealed payload bytes differ/);
    writeFileSync(target, before);
  }
  expect(invoke(command).status).toBe(0);
  unchanged();
}, 120000);
