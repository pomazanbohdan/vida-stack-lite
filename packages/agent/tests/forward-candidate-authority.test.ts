import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verifyForwardCandidateAdmission } from '../bin/forward-candidate-admission.ts';
import { preparedFixture } from './helpers/documentation-policy-fixture.ts';
import { expectReturned } from './helpers/expect-rejection.ts';

const sha = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parseRecord = (text: string): Record<string, unknown> => {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error('expected a JSON object from the CLI fixture');
  return value;
};

test('sealed public admin denies altered authority, root, closure and target before database effects', async () => {
  const { f, baseline, targetPolicy, args } = await preparedFixture();
  const payload = path.join(f.root, 'admitted-source');
  const bundle = path.join(payload, 'vida-agent');
  mkdirSync(payload);
  cpSync(f.bundle, bundle, {
    recursive: true,
    filter: (file) =>
      !['node_modules', '.tmp', 'coverage'].includes(path.basename(file)) &&
      !/^\..+\.cas\.lock(?:\.|$)/u.test(path.basename(file)),
  });
  // This private test payload uses current source; its synthetic review tuple is setup only.
  for (const file of ['bin/forward-candidate-admission.ts', 'bin/documentation-policy-transition.ts'])
    writeFileSync(path.join(bundle, file), readFileSync(path.join(f.bundle, file)));
  const installedDeps = path.join(f.bundle, 'node_modules');
  const payloadDeps = path.join(f.root, 'node_modules');
  mkdirSync(payloadDeps);
  for (const entry of readdirSync(installedDeps, { withFileTypes: true })) {
    if (entry.isDirectory() || entry.isSymbolicLink())
      symlinkSync(path.join(installedDeps, entry.name), path.join(payloadDeps, entry.name), 'junction');
    else cpSync(path.join(installedDeps, entry.name), path.join(payloadDeps, entry.name));
  }
  symlinkSync(installedDeps, path.join(f.root, 'vida-agent/node_modules'), 'junction');
  // The selected bundle owns both Source and extracted-package metadata.
  // Extracted Bun archives keep the frozen lock in the declared portable resource.
  const lock = existsSync(path.join(f.bundle, 'bun.lock')) ? 'bun.lock' : 'dist/portable/bun.lock';
  const lockBytes = readFileSync(path.join(f.bundle, lock));
  const pinBytes = readFileSync(path.join(f.bundle, '.bun-version'));
  f.put('vida-agent/bun.lock', lockBytes);
  f.put('vida-agent/.bun-version', pinBytes);
  writeFileSync(path.join(bundle, 'bun.lock'), lockBytes);
  writeFileSync(path.join(bundle, '.bun-version'), pinBytes);
  const target = path.join(payload, f.policyPath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, targetPolicy);
  const alternate = 'docs/agent-instructions/alternate-policy.json';
  writeFileSync(path.join(payload, alternate), targetPolicy);
  const files: { path: string; size: number; sha256: string }[] = [];
  const walk = (relative = ''): void => {
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
  const operation = 'fixture-admitted-forward';
  const selected = readFileSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'));
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
  const base = '.agent/cutover/' + operation;
  const intentBytes = f.json(intent);
  f.put(base + '/forward-intent.v1.json', intentBytes);
  f.put('.agent/cutover/fixture-parent/maintenance-lock.v1.json', intentBytes);
  const evidence = ['correctness', 'security', 'assurance'].map((kind) => {
    const actor = 'fixture-' + kind;
    const history = 'fixture-history-' + kind;
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
  const dbPath = path.join(f.root, '.agent/work/session-handoff.v1.sqlite');
  const dbBefore = readFileSync(dbPath);
  const baselineBefore = readFileSync(path.join(f.root, baseline.path));
  const changelogPath = path.join(f.root, f.oldPolicy.changelog_path);
  const changelogBefore = readFileSync(changelogPath);
  const operationPath = path.join(f.root, '.agent', 'work', f.work, 'documentation-policy-transition.v1.json');
  expect(existsSync(operationPath)).toBe(false);
  const invoke = (values: string[]) =>
    spawnSync(process.execPath, [path.join(bundle, 'bin/reconcile-artifacts.ts'), ...values], {
      cwd: f.root,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30000,
    });
  const unchanged = (): void => {
    expect(readFileSync(dbPath).equals(dbBefore)).toBe(true);
    expect(readFileSync(path.join(f.root, baseline.path)).equals(baselineBefore)).toBe(true);
    expect(readFileSync(path.join(f.root, f.policyPath), 'utf8')).toBe(f.json(f.oldPolicy));
    expect(readFileSync(changelogPath)).toEqual(changelogBefore);
    expect(existsSync(operationPath)).toBe(false);
  };
  const control = invoke(command);
  expect(control.status, control.stderr).toBe(0);
  expect(parseRecord(control.stdout).status).toBe('inspect_ready_unauthorized');
  unchanged();
  const admitted = expectReturned(() =>
    verifyForwardCandidateAdmission({
      root: f.root,
      payloadRoot: payload,
      operationId: operation,
      moduleUrl: pathToFileURL(path.join(bundle, 'bin/documentation-policy-transition.ts')).href,
      targetPath: f.policyPath,
    }),
  );
  expect(admitted.operation_id).toBe(operation);
  expect(admitted.payload_root).toBe(payload);
  expect(admitted.target_path).toBe(f.policyPath);
  expect(admitted.target_sha256).toBe(sha(targetPolicy));
  expect(admitted.parent_selector_sha256).toBe(sha(selected));
  const admissionInput = {
    root: f.root,
    payloadRoot: payload,
    operationId: operation,
    moduleUrl: pathToFileURL(path.join(bundle, 'bin/documentation-policy-transition.ts')).href,
    targetPath: f.policyPath,
  };
  const captureEntry = path.join(bundle, 'bin/capture-completed-readonly.ts');
  const captured = verifyForwardCandidateAdmission({
    ...admissionInput,
    moduleUrl: pathToFileURL(captureEntry).href,
    purpose: 'completed-readonly-capture',
  });
  expect(captured.purpose).toBe('completed-readonly-capture');
  expect(captured.entrypoint_sha256).toBe(sha(readFileSync(captureEntry)));
  expect(() =>
    verifyForwardCandidateAdmission({ ...admissionInput, moduleUrl: pathToFileURL(captureEntry).href }),
  ).toThrow('public operation origin is outside admitted source');
  expect(() => verifyForwardCandidateAdmission({ ...admissionInput, targetPath: 'absent-policy.json' })).toThrow(
    'missing manifest entry absent-policy.json',
  );
  unchanged();

  const denyWithChangedRootFile = (relative: string, replacement: Buffer, reason: string): void => {
    const file = path.join(f.root, relative);
    const before = readFileSync(file);
    try {
      writeFileSync(file, replacement);
      const altered = readFileSync(file);
      expect(() => verifyForwardCandidateAdmission(admissionInput)).toThrow(reason);
      expect(readFileSync(file)).toEqual(altered);
      unchanged();
    } finally {
      writeFileSync(file, before);
    }
    expect(readFileSync(file)).toEqual(before);
  };
  const rootPackage = path.join(f.root, 'vida-agent/package.json');
  const packageMetadata = parseRecord(readFileSync(rootPackage, 'utf8'));
  denyWithChangedRootFile(
    'vida-agent/package.json',
    Buffer.from(f.json({ ...packageMetadata, packageManager: 'foreign' })),
    'installed dependency inputs differ from admitted source',
  );
  denyWithChangedRootFile('vida-agent/bun.lock', Buffer.from('foreign lock'), 'installed dependency lock/pin differs');

  const extra = path.join(payload, 'unmanifested.txt');
  writeFileSync(extra, 'foreign bytes');
  try {
    expect(() => verifyForwardCandidateAdmission(admissionInput)).toThrow('unmanifested payload bytes');
    expect(readFileSync(extra, 'utf8')).toBe('foreign bytes');
    unchanged();
  } finally {
    unlinkSync(extra);
  }

  const closureEntry = 'vida-agent/bin/documentation-policy-transition.ts';
  const closurePath = path.join(payload, closureEntry);
  const manifestPath = path.join(payload, 'vida-agent-payload.manifest.v1.json');
  const intentPath = path.join(f.root, base, 'forward-intent.v1.json');
  const overlayPath = path.join(f.root, '.agent/cutover/fixture-parent/maintenance-lock.v1.json');
  const authorityFiles = evidence.flatMap((item) => [
    path.join(f.root, item.path),
    path.join(f.root, item.reverse_path),
  ]);
  const resealFiles = [
    closurePath,
    manifestPath,
    intentPath,
    overlayPath,
    path.join(f.root, authorizationPath),
    ...authorityFiles,
  ];
  for (const [imported, reason] of [
    ['./missing-closure.ts', 'local dependency escapes sealed bundle'],
    ['undeclared-fixture-dependency', 'external dependency is not declared and locked'],
  ] as const) {
    const originals = new Map(resealFiles.map((file) => [file, readFileSync(file)]));
    try {
      const changed = Buffer.concat([originals.get(closurePath)!, Buffer.from(`\nimport '${imported}';\n`)]);
      writeFileSync(closurePath, changed);
      const updatedFiles = files.map((file) =>
        file.path === closureEntry ? { ...file, size: changed.length, sha256: sha(changed) } : file,
      );
      const updatedManifest = f.json({
        schema: 'VidaAgentPreparedPayload/v1',
        files: updatedFiles,
        unresolved_integration_paths: [],
      });
      writeFileSync(manifestPath, updatedManifest);
      const updatedIntent = f.json({ ...intent, new_payload_manifest_sha256: sha(updatedManifest) });
      writeFileSync(intentPath, updatedIntent);
      writeFileSync(overlayPath, updatedIntent);
      const updatedEvidence = evidence.map((item) => {
        const reviewPath = path.join(f.root, item.path);
        const reversePath = path.join(f.root, item.reverse_path);
        const review = f.json({
          ...parseRecord(originals.get(reviewPath)!.toString('utf8')),
          sealed_fingerprint: sha(updatedIntent),
        });
        const reverse = f.json({
          ...parseRecord(originals.get(reversePath)!.toString('utf8')),
          sealed_fingerprint: sha(updatedIntent),
          review_sha256: sha(review),
        });
        writeFileSync(reviewPath, review);
        writeFileSync(reversePath, reverse);
        return { ...item, sha256: sha(review), reverse_sha256: sha(reverse) };
      });
      writeFileSync(
        path.join(f.root, authorizationPath),
        f.json({ ...parseRecord(authorization), plan_sha256: sha(updatedIntent), evidence: updatedEvidence }),
      );
      const beforeAdmission = new Map(resealFiles.map((file) => [file, readFileSync(file)]));
      expect(() => verifyForwardCandidateAdmission(admissionInput)).toThrow(reason);
      for (const [file, bytes] of beforeAdmission) expect(readFileSync(file)).toEqual(bytes);
      unchanged();
    } finally {
      for (const [file, bytes] of originals) writeFileSync(file, bytes);
    }
    for (const [file, bytes] of originals) expect(readFileSync(file)).toEqual(bytes);
  }
  const approvedBytes = readFileSync(path.join(f.root, authorizationPath));
  f.put(authorizationPath, f.json({ ...parseRecord(approvedBytes.toString('utf8')), outcome: 'rejected' }));
  expect(() =>
    verifyForwardCandidateAdmission({
      root: f.root,
      payloadRoot: payload,
      operationId: operation,
      moduleUrl: pathToFileURL(path.join(bundle, 'bin/documentation-policy-transition.ts')).href,
      targetPath: f.policyPath,
    }),
  ).toThrow('forward authorization differs');
  f.put(authorizationPath, approvedBytes);
  unchanged();
  const denies = (values: string[], pattern: RegExp): void => {
    const result = invoke(values);
    expect(result.status).toBe(1);
    expect(parseRecord(result.stderr).message).toMatch(pattern);
    unchanged();
  };
  denies(supplied, /sealed administrative admission/);
  const replace = (key: string, value: string): string[] => {
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
  f.put(authorizationPath, f.json({ ...parseRecord(authorization), outcome: 'rejected' }));
  denies(command, /authorization differs/);
  f.put(authorizationPath, authorization);
  const firstEvidence = evidence.find((item) => item.kind === 'correctness');
  if (!firstEvidence) throw new Error('correctness fixture evidence missing');
  const reviewPath = firstEvidence.path;
  const reviewBefore = readFileSync(path.join(f.root, reviewPath));
  f.put(reviewPath, f.json({ ...parseRecord(reviewBefore.toString('utf8')), verdict: 'fail' }));
  denies(command, /review bytes differ/);
  f.put(reviewPath, reviewBefore);
  for (const file of ['vida-agent/src/documentation/policy-transition.ts', f.policyPath]) {
    const targetPath = path.join(payload, file);
    const before = readFileSync(targetPath);
    writeFileSync(targetPath, Buffer.concat([before, Buffer.from('\n ')]));
    denies(command, /sealed payload bytes differ/);
    writeFileSync(targetPath, before);
  }
  const restoredControl = invoke(command);
  expect(restoredControl.status, restoredControl.stderr).toBe(0);
  expect(parseRecord(restoredControl.stdout).status).toBe('inspect_ready_unauthorized');
  unchanged();
}, 120000);
