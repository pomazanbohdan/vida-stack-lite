import { isPlainRecord } from '../src/contracts/public-ingress.ts';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'bun:test';
import { releaseJSON, releaseSourceBinding } from '../bin/local-release-artifacts.ts';
import { expectedJavascriptFiles, standaloneBuildInputInventory } from '../tooling/maintained-source-inventory.ts';
import {
  applyReleaseRetarget,
  inspectReleaseRetarget,
  planReleaseRetarget,
  stageNativeRetargetCandidate,
  verifyCompletedReleaseRetargetHandoff,
} from '../bin/repair-release-retarget.ts';

const operation = 'handoff-verifier',
  version = '0.1.2',
  folder = `.agent/work/agent-local-release/${operation}`,
  pending = '.agent/work/agent-local-release/pending.json',
  archive = `.tmp/releases/${operation}/vida-agent-0.1.2.tgz`;
type ReleaseInput = { root: string; operation: string };

function write(root: string, relative: string, bytes: string | Buffer): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
}

function writeJSON(root: string, relative: string, value: unknown): void {
  write(root, relative, JSON.stringify(value) + '\n');
}

function digest(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function metadata(bytes: Buffer, files: Array<{ path: string; size: number }>) {
  return [
    {
      name: 'vida-agent',
      version,
      filename: 'vida-agent-0.1.2.tgz',
      integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
      files,
    },
  ];
}

async function fixture(
  options: { payloadPin?: string } = {},
): Promise<{ root: string; input: ReleaseInput; oldBytes: Buffer; bytes: Buffer }> {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-retarget-verifier-'));
  const manifest = {
    name: 'vida-agent',
    version,
    bin: { 'vida-agent': './bin/vida-agent.ts' },
    engines: { bun: '1.4.2' },
    packageManager: 'bun@1.4.2',
    files: ['bin/*.ts'],
  };
  writeJSON(root, 'packages/agent/package.json', manifest);
  write(root, 'packages/agent/lib.js', 'export const inert = 1;\n');
  for (const file of [
    'package.json',
    'agent-runtime.config.v1.yaml',
    'AGENT.sidecar.md',
    'tooling/agent/release-local.ts',
    'tooling/agent/release-assurance.ts',
    'tooling/agent/release-ci-evidence.ts',
    'tooling/agent/native-ci-delivery.ts',
    'tooling/agent/controllers/forward-review-proof.ts',
    '.github/workflows/agent-native-delivery.yml',
  ])
    write(root, file, '{}\n');
  for (const file of ['packages/plugin/fixture.ts', 'tests/agent/fixture.ts', '.githooks/fixture.ts'])
    write(root, file, 'export const fixture = true;\n');
  const oldBytes = Buffer.from('retained inert SDK provenance');
  const original = {
    schema: 'VidaLocalReleaseState/v1',
    operation_id: operation,
    version,
    status: 'awaiting_assurance',
    pid: 12345,
    elapsed_ms: 7,
    source_binding: digest('old Source'),
    pack_metadata: metadata(oldBytes, [{ path: 'lib.js', size: 1 }]),
    tarball_sha256: digest(oldBytes),
  };
  writeJSON(root, folder + '/release.json', original);
  writeJSON(root, pending, {
    schema: original.schema,
    operation_id: operation,
    version,
    status: 'awaiting_assurance',
  });
  write(root, archive, oldBytes);
  writeJSON(root, '.tmp/old-log.json', { command: 'inert', exit_code: 1 });
  writeJSON(root, '.tmp/old-input.json', { observed: 'UNKNOWN' });
  writeJSON(root, folder + '/tests.json', { tests: [{ path: '.tmp/old-log.json', inputs: ['.tmp/old-input.json'] }] });
  writeJSON(root, folder + '/source-seal.json', {
    entries: [{ path: 'packages/agent/lib.js', sha256: digest('old') }],
  });
  write(root, 'packages/agent/bin/vida-agent.ts', 'export const inert = 1;\n');
  for (const file of [
    'tooling/maintained-source-inventory.ts',
    'TESTING.md',
    '.bun-version',
    'bun.lock',
    'bunfig.toml',
    'tooling/build-standalone.ts',
    'tooling/pack-sdk.ts',
    'tooling/owned-staging.ts',
    ...expectedJavascriptFiles.map((file) => 'dist/src/' + file),
  ])
    write(root, 'packages/agent/' + file, 'inert fixture bytes\n');
  write(root, 'packages/agent/.bun-version', '1.4.2\n');
  for (const directory of ['instructions', 'templates', 'schemas'])
    write(root, 'packages/agent/' + directory + '/fixture-resource.txt', 'inert fixture resource bytes\n');
  const inputs = standaloneBuildInputInventory(path.join(root, 'packages/agent')).map((file) => {
    const bytes = readFileSync(path.join(root, 'packages/agent', file));
    return { path: file, bytes: bytes.length, sha256: digest(bytes) };
  });
  const asset = Buffer.from('inert bytes; never execute'),
    assetName = 'vida-agent-bun-linux-x64';
  const native = {
    schema: 'VidaStandaloneBuild/v1',
    version,
    pin: options.payloadPin ?? '1.4.2',
    target: 'bun-linux-x64',
    payloadId: digest('inert embedded payload'),
    inputs,
    asset: { file: assetName, bytes: asset.length, sha256: digest(asset) },
  };
  const contents = {
    ...Object.fromEntries(
      inputs.map((input) => ['package/' + input.path, readFileSync(path.join(root, 'packages/agent', input.path))]),
    ),
    'package/lib.js': readFileSync(path.join(root, 'packages/agent/lib.js')),
    'package/dist/standalone/manifest.json': JSON.stringify(native),
    ['package/dist/standalone/' + assetName]: asset,
  };
  const bytes = Buffer.from(await new Bun.Archive(contents, { compress: 'gzip' }).bytes());
  const files = Object.entries(contents).map(([file, value]) => ({
    path: file.slice('package/'.length),
    size: Buffer.byteLength(value),
  }));
  write(root, '.tmp/candidate/vida-agent-0.1.2.tgz', bytes);
  writeJSON(root, '.tmp/candidate.json', {
    schema: 'VidaNativeRetargetCandidate/v1',
    operation_id: operation,
    version,
    archive: '.tmp/candidate/vida-agent-0.1.2.tgz',
    pack_metadata: metadata(bytes, files),
    source_binding: releaseSourceBinding(root).source_binding,
  });
  return { root, input: { root, operation }, oldBytes, bytes };
}

test('retarget staging rejects a stable payload pin that differs from captured Source', async () => {
  const value = await fixture({ payloadPin: '1.4.3' });
  try {
    await assert.rejects(
      stageNativeRetargetCandidate({ root: value.root, operation, candidateFile: '.tmp/candidate.json' }),
      /candidate native manifest differs/,
    );
    assert.equal(existsSync(path.join(value.root, folder, 'retarget/candidate.json')), false);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});

test('absent plan returns null for an inflight operation without changing its journal', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-retarget-verifier-inflight-'));
  try {
    const journal = { operation_id: operation, version, status: 'running', pid: 778899 };
    writeJSON(root, folder + '/release.json', journal);
    mkdirSync(path.join(root, folder, 'retarget'), { recursive: true });
    const before = readFileSync(path.join(root, folder + '/release.json'), 'utf8');
    assert.equal(await verifyCompletedReleaseRetargetHandoff({ root, operation }), null);
    assert.equal(readFileSync(path.join(root, folder + '/release.json'), 'utf8'), before);
    assert.equal(existsSync(path.join(root, folder, 'retarget/plan.json')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('completed handoff yields a frozen receipt and changed archive is held read-only', async () => {
  const value = await fixture();
  try {
    await stageNativeRetargetCandidate({
      root: value.root,
      operation,
      candidateFile: '.tmp/candidate.json',
    });
    await planReleaseRetarget({ root: value.root, operation, actor: 'isolated human controller' });
    const snapshot = (file: string): Buffer | null =>
      existsSync(path.join(value.root, file)) ? readFileSync(path.join(value.root, file)) : null;
    const incomplete = [
      folder + '/retarget/plan.json',
      folder + '/retarget/state.json',
      folder + '/retarget/custody/seal.json',
      folder + '/release.json',
      pending,
      archive,
      folder + '/retarget/custody/publication.tgz',
    ];
    const incompleteBefore = incomplete.map(snapshot);
    await assert.rejects(verifyCompletedReleaseRetargetHandoff(value.input));
    for (const [index, file] of incomplete.entries()) assert.deepEqual(snapshot(file), incompleteBefore[index]);
    await applyReleaseRetarget(value.input);
    const tracked = [
      folder + '/retarget/plan.json',
      folder + '/retarget/state.json',
      folder + '/retarget/custody/seal.json',
      folder + '/release.json',
      pending,
      archive,
      folder + '/retarget/custody/publication.tgz',
    ];
    const before = tracked.map(snapshot);
    const proof = await verifyCompletedReleaseRetargetHandoff(value.input);
    assert.ok(proof);
    assert.equal(proof?.operation_id, operation);
    assert.equal(proof?.version, version);
    assert.equal(proof?.previous_archive_sha256, digest(value.oldBytes));
    assert.equal(proof?.current_archive_sha256, digest(value.bytes));
    assert.equal(proof?.current.tarball_sha256, digest(value.bytes));
    assert.equal(Object.isFrozen(proof), true);
    assert.equal(Object.isFrozen(proof?.previous.pack_metadata), true);
    assert.equal(Object.isFrozen(proof?.current.pack_metadata[0]?.files), true);
    for (const [index, file] of tracked.entries()) assert.deepEqual(snapshot(file), before[index]);

    const planPath = folder + '/retarget/plan.json';
    const statePath = folder + '/retarget/state.json';
    const planBytes = readFileSync(path.join(value.root, planPath));
    const stateBytes = readFileSync(path.join(value.root, statePath));
    const plan = JSON.parse(planBytes.toString('utf8')) as Record<string, unknown> & {
      before: Array<{ sha256: string | null }>;
    };
    assert.ok(plan.before[2]);
    plan.before[2].sha256 = digest('false original release pointer');
    const resealedPlan = reseal(plan);
    const state = JSON.parse(stateBytes.toString('utf8')) as Record<string, unknown>;
    state.plan_digest = resealedPlan.digest;
    write(value.root, planPath, releaseJSON(resealedPlan));
    write(value.root, statePath, releaseJSON(reseal(state)));
    const tamperedPlan = snapshot(planPath);
    const tamperedState = snapshot(statePath);
    await assert.rejects(verifyCompletedReleaseRetargetHandoff(value.input), /previous release custody differs/);
    assert.deepEqual(snapshot(planPath), tamperedPlan);
    assert.deepEqual(snapshot(statePath), tamperedState);
    write(value.root, planPath, planBytes);
    write(value.root, statePath, stateBytes);

    const changedArchive = Buffer.from(snapshot(archive) ?? Buffer.alloc(0));
    changedArchive[0] = changedArchive[0]! ^ 1;
    write(value.root, archive, changedArchive);
    await assert.rejects(verifyCompletedReleaseRetargetHandoff(value.input));
    assert.deepEqual(snapshot(archive), changedArchive);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});

function reseal(value: Record<string, unknown>): Record<string, unknown> & { digest: string } {
  const body = { ...value };
  delete body.digest;
  return { ...body, digest: digest(releaseJSON(body)) };
}

test('inspect preserves a sealed unknown phase read-only and apply keeps the exact phase guard', async () => {
  const value = await fixture();
  try {
    await stageNativeRetargetCandidate({ root: value.root, operation, candidateFile: '.tmp/candidate.json' });
    await planReleaseRetarget({ root: value.root, operation, actor: 'isolated human controller' });

    const statePath = folder + '/retarget/state.json';
    const rawJSON: unknown = JSON.parse(readFileSync(path.join(value.root, statePath), 'utf8'));
    if (
      !isPlainRecord(rawJSON) ||
      Object.keys(rawJSON).sort().join() !==
        ['schema', 'operation_id', 'plan_digest', 'phase', 'release_after_sha256', 'digest'].sort().join() ||
      rawJSON.schema !== 'VidaReleaseRetargetState/v1' ||
      typeof rawJSON.operation_id !== 'string' ||
      typeof rawJSON.plan_digest !== 'string' ||
      typeof rawJSON.phase !== 'string' ||
      typeof rawJSON.release_after_sha256 !== 'string' ||
      typeof rawJSON.digest !== 'string'
    )
      throw new Error('Fixture retarget state does not satisfy its contract.');
    write(value.root, statePath, releaseJSON(reseal({ ...rawJSON, phase: 'sealed-unknown-phase' })));

    const source = releaseSourceBinding(value.root, true);
    if (!source.observations) throw new Error('Fixture Source observation set is missing.');
    const protectedFiles = [
      ...new Set([
        ...source.observations.filter((entry) => entry.kind !== 'directory').map((entry) => entry.path),
        archive,
        folder + '/release.json',
        pending,
        folder + '/retarget/plan.json',
        statePath,
        folder + '/retarget/custody/seal.json',
        folder + '/retarget/custody/publication.tgz',
        ...retargetCustodyCopies(value.root, folder + '/retarget/custody'),
      ]),
    ];
    const before = protectedFiles.map((file) =>
      existsSync(path.join(value.root, file)) ? readFileSync(path.join(value.root, file)) : null,
    );

    assert.deepEqual(await inspectReleaseRetarget(value.input), {
      status: 'sealed-unknown-phase',
      operation_id: operation,
      version,
      qualified: false,
    });
    for (const [index, file] of protectedFiles.entries())
      assert.deepEqual(
        existsSync(path.join(value.root, file)) ? readFileSync(path.join(value.root, file)) : null,
        before[index],
      );

    await assert.rejects(applyReleaseRetarget(value.input), /repair phase UNKNOWN/);
    for (const [index, file] of protectedFiles.entries())
      assert.deepEqual(
        existsSync(path.join(value.root, file)) ? readFileSync(path.join(value.root, file)) : null,
        before[index],
      );
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});

function retargetCustodyCopies(root: string, directory: string): string[] {
  const absolute = path.join(root, directory);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = directory + '/' + entry.name;
    return entry.isDirectory() ? retargetCustodyCopies(root, child) : [child];
  });
}
