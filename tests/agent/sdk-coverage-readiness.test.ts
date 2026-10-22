import assert from 'node:assert/strict';
import { afterEach, spyOn, test } from 'bun:test';
import * as fs from 'node:fs';
import * as ownedStaging from '../../packages/agent/tooling/owned-staging.ts';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from '../../packages/agent/tooling/bun-coverage-evidence.ts';
import { expectedJavascriptFiles } from '../../packages/agent/tooling/maintained-source-inventory.ts';
import { classifyMaintainedSourcePath } from '../../packages/agent/tooling/ts-only-source-gate.ts';
import { publishSdkTestInputs } from '../../tooling/agent/sdk-coverage-readiness.ts';
import { captureSelectedSdkTestInputsFromCapturedBytes } from '../../packages/agent/tooling/sdk-artifact-capture.ts';
import { sdkArtifactFixture } from '../../packages/agent/tests/helpers/sdk-artifact-fixture.ts';

const identity = { version: '1.2.3', bunVersion: Bun.version };
const payloads = new Map(
  expectedJavascriptFiles.map((file, index) => [
    'src/' + file,
    Buffer.from('export const archiveMember' + index + ' = ' + index + ';\n'),
  ]),
);
const roots: string[] = [];

function candidateFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sdk-candidate-'));
  roots.push(root);
  const fixture = sdkArtifactFixture(root, { schema: 'CandidateSdkTestInputs/v1', purpose: 'development-tests' });
  const files = fixture.artifacts();
  const receiptValue = fixture.receipt();
  for (const file of ['dist/src/index.d.ts', 'dist/schemas/local.schema.json']) {
    const bytes = Buffer.from('declaration or schema fixture\n');
    files.set(file, bytes);
    receiptValue.outputs.push({ path: file, bytes: bytes.length, sha256: sha256(bytes) });
  }
  receiptValue.inputs.sort((left, right) => left.path.localeCompare(right.path));
  receiptValue.outputs.sort((left, right) => left.path.localeCompare(right.path));
  const writeReceipt = () => files.set('dist/sdk-formation.json', Buffer.from(JSON.stringify(receiptValue)));
  writeReceipt();
  return { root, files, inputs: fixture.selectedInputs, receiptValue, writeReceipt };
}

test('local SDK candidate joins all captured inputs and every output, returning owned bytes', () => {
  const fixture = candidateFixture();
  const captured = captureSelectedSdkTestInputsFromCapturedBytes(fixture.root, fixture.inputs, fixture.files);
  assert.deepEqual([...captured.keys()].sort(), [...fixture.files.keys()].sort());
  const declarations = captured.get('dist/src/index.d.ts');
  assert.ok(declarations);
  declarations.fill(0);
  assert.notDeepEqual(declarations, fixture.files.get('dist/src/index.d.ts'));
});

test('a fresh product SDK is also reusable for tests without relabeling its receipt', () => {
  const fixture = candidateFixture();
  fixture.receiptValue.schema = 'CandidatePackageBuild/v1';
  delete fixture.receiptValue.purpose;
  fixture.writeReceipt();
  const captured = captureSelectedSdkTestInputsFromCapturedBytes(fixture.root, fixture.inputs, fixture.files);
  assert.deepEqual(captured.get('dist/sdk-formation.json'), fixture.files.get('dist/sdk-formation.json'));
  assert.deepEqual([...captured.keys()].sort(), [...fixture.files.keys()].sort());
});

test.each([
  'input',
  'output',
  'declaration',
  'schema',
  'missing',
  'extra',
  'unlisted-javascript',
  'missing-javascript',
  'version',
  'pin',
  'purpose',
  'product',
  'input-order',
] as const)('local SDK candidate refuses %s drift without modifying its input set', (mode) => {
  const fixture = candidateFixture();
  const receiptValue = fixture.receiptValue;
  if (mode === 'input') fixture.inputs.set('src/index.ts', Buffer.from('changed captured Source\n'));
  if (mode === 'output') fixture.files.set('dist/src/index.js', Buffer.from('changed JavaScript\n'));
  if (mode === 'declaration') fixture.files.set('dist/src/index.d.ts', Buffer.from('changed declaration\n'));
  if (mode === 'schema') fixture.files.set('dist/schemas/local.schema.json', Buffer.from('changed schema\n'));
  if (mode === 'missing') fixture.files.delete('dist/src/index.d.ts');
  if (mode === 'extra') fixture.files.set('dist/extra.txt', Buffer.from('undeclared output\n'));
  if (mode === 'unlisted-javascript') {
    const bytes = Buffer.from('export {};\n');
    fixture.files.set('dist/src/extra.js', bytes);
    receiptValue.outputs.push({ path: 'dist/src/extra.js', bytes: bytes.length, sha256: sha256(bytes) });
    receiptValue.outputs.sort((left, right) => left.path.localeCompare(right.path));
  }
  if (mode === 'missing-javascript') {
    fixture.files.delete('dist/src/index.js');
    receiptValue.outputs = receiptValue.outputs.filter((entry) => entry.path !== 'dist/src/index.js');
  }
  if (mode === 'version') receiptValue.version = '99.0.0';
  if (mode === 'pin') fixture.inputs.set('.bun-version', Buffer.from('0.0.0\n'));
  if (mode === 'purpose') receiptValue.purpose = 'product';
  if (mode === 'product') receiptValue.schema = 'CandidatePackageBuild/v1';
  if (mode === 'input-order') receiptValue.inputs.reverse();
  fixture.writeReceipt();
  const before = [...fixture.files].map(([file, bytes]) => [file, Buffer.from(bytes)] as const);
  assert.throws(() => captureSelectedSdkTestInputsFromCapturedBytes(fixture.root, fixture.inputs, fixture.files));
  assert.deepEqual([...fixture.files], before);
});
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

async function capturedWarnings(body: () => Promise<void>): Promise<string[]> {
  const original: unknown = Reflect.get(process, 'emitWarning');
  assert.equal(typeof original, 'function');
  const warnings: string[] = [];
  process.emitWarning = (warning: string | Error) => {
    warnings.push(String(warning));
  };
  try {
    await body();
  } finally {
    assert.equal(Reflect.set(process, 'emitWarning', original), true);
  }
  assert.equal(Reflect.get(process, 'emitWarning'), original);
  return warnings;
}

function publicationRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sdk-test-input-publication-'));
  roots.push(root);
  mkdirSync(path.join(root, 'dist'), { recursive: true });
  writeFileSync(path.join(root, 'dist/prior.js'), Buffer.from('prior SDK output\n'));
  return root;
}

function receipt() {
  return {
    schema: 'CandidateSdkTestInputs/v1',
    purpose: 'development-tests',
    version: identity.version,
    declared_node_engine: '24.x',
    declaration_runtime: 'bun',
    bun_version: identity.bunVersion,
    production_entrypoints: ['dist/src/index.js', 'dist/src/trusted-host.js'],
    test_issuers_shipped: false,
    schemas: 1,
    inputs: [{ path: 'package.json', bytes: 2, sha256: sha256(Buffer.from('{}')) }],
    outputs: [...payloads].map(([archivePath, bytes]) => ({
      path: `dist/${archivePath}`,
      bytes: bytes.length,
      sha256: sha256(bytes),
    })),
    virtual_runtime_entry: { path: 'src/runtime.ts', sha256: 'a'.repeat(64) },
    dependency_custody:
      'External node_modules is linked; selected manifest and frozen lock are captured, dependency bytes are outside snapshot custody.',
  };
}

function publicationFiles(): { files: Map<string, Buffer>; sdkReceiptBytes: Buffer } {
  const sdkReceiptBytes = Buffer.from(JSON.stringify(receipt()));
  return {
    sdkReceiptBytes,
    files: new Map<string, Buffer>([
      ['dist/sdk-formation.json', sdkReceiptBytes],
      ...[...payloads].map(([pathname, bytes]) => [`dist/${pathname}`, Buffer.from(bytes)] as const),
    ]),
  };
}

test('publishes validated files and receipt while retaining the previous dist and removing its stage', async () => {
  const root = publicationRoot();
  const priorBytes = Buffer.from('prior SDK output\n');
  const { files, sdkReceiptBytes } = publicationFiles();
  const warnings = await capturedWarnings(async () => {
    await publishSdkTestInputs(root, files, () => 10_000);
  });
  assert.deepEqual(warnings, []);
  assert.deepEqual(readFileSync(path.join(root, 'dist/sdk-formation.json')), sdkReceiptBytes);
  assert.equal(existsSync(path.join(root, 'dist/sdk-test-input-download.v1.json')), false);
  for (const [pathname, bytes] of payloads) assert.deepEqual(readFileSync(path.join(root, 'dist', pathname)), bytes);
  const temporaryRoot = path.join(root, 'coverage/sdk-test-inputs');
  const entries = readdirSync(temporaryRoot);
  const backups = entries.filter((name) => name.startsWith('sdk-test-inputs-prior-dist-'));
  const stages = entries.filter(
    (name) => name.startsWith('sdk-test-inputs-') && !name.startsWith('sdk-test-inputs-prior-dist-'),
  );
  assert.equal(backups.length, 1);
  assert.match(backups[0]!, /^sdk-test-inputs-prior-dist-[0-9a-f-]+$/u);
  assert.deepEqual(readFileSync(path.join(temporaryRoot, backups[0]!, 'prior.js')), priorBytes);
  assert.equal(
    classifyMaintainedSourcePath(`packages/agent/coverage/sdk-test-inputs/${backups[0]!}/prior.js`),
    'generated',
  );
  assert.deepEqual(stages, []);
});

test('publication refuses readiness when owned stage cleanup returns an unresolved status', async () => {
  const root = publicationRoot();
  const { files, sdkReceiptBytes } = publicationFiles();
  const cleanup = spyOn(ownedStaging, 'removeOwnedDirectoryOrThrow').mockImplementation(() => 'identity-mismatch');
  try {
    const warnings = await capturedWarnings(async () => {
      await assert.rejects(
        () => publishSdkTestInputs(root, files, () => 10_000),
        (error: unknown) => {
          assert.ok(error instanceof AggregateError);
          assert.equal(error.errors.length, 1);
          assert.match(String(error.errors[0]), /identity-mismatch/u);
          return true;
        },
      );
    });
    assert.equal(cleanup.mock.calls.length, 1);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /Retained SDK test-input stage after publication/u);
    assert.deepEqual(readFileSync(path.join(root, 'dist/sdk-formation.json')), sdkReceiptBytes);
    const retained = readdirSync(path.join(root, 'coverage/sdk-test-inputs'));
    assert.equal(retained.filter((file) => file.startsWith('sdk-test-inputs-prior-dist-')).length, 1);
    assert.equal(retained.length, 2);
  } finally {
    cleanup.mockRestore();
  }
});

test.each(['restored', 'rollback-error', 'undefined-primary', 'undefined-rollback', 'foreign-destination'] as const)(
  'failed SDK publication preserves exact causes and retained paths: %s',
  async (mode) => {
    const root = publicationRoot();
    const dist = path.join(root, 'dist');
    const temporaryRoot = path.join(root, 'coverage/sdk-test-inputs');
    const { files, sdkReceiptBytes } = publicationFiles();
    const primary = mode === 'undefined-primary' ? undefined : new Error('publication failed');
    const rollback = mode === 'undefined-rollback' ? undefined : new Error('restore failed');
    const rename = fs.renameSync.bind(fs);
    let publicationAttempts = 0;
    let restoreAttempts = 0;
    let caught: { error: unknown } | undefined;
    const renaming = spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (String(to) === dist && String(from).startsWith(temporaryRoot + path.sep)) {
        if (path.basename(String(from)) === 'dist') {
          publicationAttempts++;
          if (mode === 'foreign-destination') {
            mkdirSync(dist);
            writeFileSync(path.join(dist, 'foreign.txt'), 'foreign destination');
          }
          throw primary;
        }
        restoreAttempts++;
        if (mode !== 'restored') throw rollback;
      }
      rename(from, to);
    });
    let warnings: string[];
    try {
      warnings = await capturedWarnings(async () => {
        try {
          await publishSdkTestInputs(root, files, () => 10_000);
        } catch (error) {
          caught = { error };
        }
      });
    } finally {
      renaming.mockRestore();
    }
    assert.ok(caught, 'publication must reject, including thrown undefined');
    assert.equal(publicationAttempts, 1);
    assert.equal(restoreAttempts, mode === 'foreign-destination' ? 0 : 1);
    const combined = mode !== 'restored' && mode !== 'foreign-destination';
    if (combined) {
      assert.ok(caught.error instanceof AggregateError);
      assert.deepEqual(caught.error.errors, [primary, rollback]);
    } else assert.equal(caught.error, primary);
    const entries = readdirSync(temporaryRoot);
    const backups = entries.filter((name) => name.startsWith('sdk-test-inputs-prior-dist-'));
    const stages = entries.filter((name) => !name.startsWith('sdk-test-inputs-prior-dist-'));
    assert.equal(stages.length, 1);
    assert.deepEqual(readFileSync(path.join(temporaryRoot, stages[0]!, 'dist/sdk-formation.json')), sdkReceiptBytes);
    assert.equal(backups.length, mode === 'restored' ? 0 : 1);
    const priorDist = mode === 'restored' ? dist : path.join(temporaryRoot, backups[0]!);
    assert.equal(readFileSync(path.join(priorDist, 'prior.js'), 'utf8'), 'prior SDK output\n');
    if (mode === 'foreign-destination')
      assert.equal(readFileSync(path.join(dist, 'foreign.txt'), 'utf8'), 'foreign destination');
    else if (mode !== 'restored') assert.equal(existsSync(dist), false);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]!, /Retained failed SDK test-input stage/u);
  },
);

test('a spent pre-publication budget preserves the prior dist and retains its failed stage', async () => {
  const root = publicationRoot();
  const priorBytes = Buffer.from('prior SDK output\n');
  const { files } = publicationFiles();
  let budgetChecks = 0;
  const warnings = await capturedWarnings(async () => {
    await assert.rejects(
      () => publishSdkTestInputs(root, files, () => (++budgetChecks === 1 ? 10_000 : 0)),
      /budget is spent/u,
    );
  });
  assert.deepEqual(readFileSync(path.join(root, 'dist/prior.js')), priorBytes);
  const entries = readdirSync(path.join(root, 'coverage/sdk-test-inputs'));
  const stages = entries.filter(
    (name) => name.startsWith('sdk-test-inputs-') && !name.startsWith('sdk-test-inputs-prior-dist-'),
  );
  assert.equal(stages.length, 1);
  for (const [pathname, bytes] of payloads) {
    assert.deepEqual(readFileSync(path.join(root, 'coverage/sdk-test-inputs', stages[0]!, 'dist', pathname)), bytes);
    assert.equal(
      classifyMaintainedSourcePath(`packages/agent/coverage/sdk-test-inputs/${stages[0]!}/dist/${pathname}`),
      'generated',
    );
  }
  assert.match(warnings[0] ?? '', /Retained failed SDK test-input stage/u);
});

test('rejects an unsafe publication path without writing outside the caller root', async () => {
  const root = publicationRoot();
  const unsafeFiles = new Map([['dist/../../../escape.js', Buffer.from('escaped')]]);
  const warnings = await capturedWarnings(async () => {
    await assert.rejects(() => publishSdkTestInputs(root, unsafeFiles, () => 10_000), /staging path is unsafe/u);
  });
  assert.match(warnings[0] ?? '', /Retained failed SDK test-input stage/u);
  assert.equal(existsSync(path.join(root, 'escape.js')), false);
  assert.deepEqual(readFileSync(path.join(root, 'dist/prior.js')), Buffer.from('prior SDK output\n'));
});
