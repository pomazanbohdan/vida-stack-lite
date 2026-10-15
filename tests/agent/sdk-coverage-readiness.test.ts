import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, spyOn, test } from 'bun:test';
import * as fs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentJSZipModule } from '../../packages/agent/tooling/release-dependency-types.ts';
import { sha256 } from '../../packages/agent/tooling/bun-coverage-evidence.ts';
import { expectedJavascriptFiles } from '../../packages/agent/tooling/maintained-source-inventory.ts';
import { classifyMaintainedSourcePath } from '../../packages/agent/tooling/ts-only-source-gate.ts';
import {
  assertSdkArtifactDigest,
  publishSdkTestInputs,
  validateSdkTestArchive,
} from '../../tooling/agent/sdk-coverage-readiness.ts';

const JSZip = createRequire(new URL('../../packages/agent/package.json', import.meta.url))('jszip') as AgentJSZipModule;
const identity = { version: '1.2.3', bunVersion: Bun.version };
const payloads = new Map(
  expectedJavascriptFiles.map((file, index) => [
    `src/${file}`,
    Buffer.from(`export const archiveMember${index} = ${index};\n`),
  ]),
);
const roots: string[] = [];

test('the SDK transport bridge accepts only the exact API-bound ZIP bytes', () => {
  const bytes = Buffer.from('transport fixture');
  const expected = `sha256:${sha256(bytes)}`;
  assert.doesNotThrow(() => assertSdkArtifactDigest(bytes, expected));
  assert.throws(() => assertSdkArtifactDigest(Buffer.from('changed'), expected), /API artifact digest/u);
  assert.throws(() => assertSdkArtifactDigest(Buffer.alloc(0), expected), /API artifact digest/u);
  assert.throws(() => assertSdkArtifactDigest(bytes, sha256(bytes)), /API artifact digest/u);
});

function capturedWarnings(body: () => void): string[] {
  const original: unknown = Reflect.get(process, 'emitWarning');
  assert.equal(typeof original, 'function');
  const warnings: string[] = [];
  process.emitWarning = (warning: string | Error) => {
    warnings.push(String(warning));
  };
  try {
    body();
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

function downloadReceipt(sdkReceiptBytes: Buffer) {
  const sourceCommit = 'a'.repeat(40);
  return {
    schema: 'SdkCoverageDownload/v1' as const,
    source_commit: sourceCommit,
    run_id: 123,
    run_attempt: 2,
    artifact_id: 456,
    artifact_digest: 'sha256:' + 'b'.repeat(64),
    artifact_name: `vida-sdk-test-inputs-${sourceCommit}-123-2`,
    sdk_receipt_sha256: sha256(sdkReceiptBytes),
    outputs: receipt().outputs,
  };
}

async function archive(
  options: {
    readonly receipt?: unknown;
    readonly omit?: string;
    readonly extra?: ReadonlyMap<string, Buffer>;
    readonly symlink?: string;
    readonly overrides?: ReadonlyMap<string, Buffer>;
  } = {},
): Promise<Buffer> {
  const zip = new JSZip();
  for (const [pathname, original] of payloads) {
    if (pathname === options.omit) continue;
    const bytes = options.overrides?.get(pathname) ?? original;
    zip.file(pathname, bytes, options.symlink === pathname ? { unixPermissions: 0o120777 } : {});
  }
  for (const [pathname, bytes] of options.extra ?? []) zip.file(pathname, bytes);
  zip.file('sdk-formation.json', JSON.stringify(options.receipt ?? receipt()));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'STORE', platform: 'UNIX' });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('accepts a complete development-test SDK archive and returns copied package paths', async () => {
  const result = await validateSdkTestArchive(await archive(), identity);
  assert.deepEqual(
    [...result.keys()].sort(),
    ['dist/sdk-formation.json', ...expectedJavascriptFiles.map((file) => `dist/src/${file}`)].sort(),
  );
  assert.deepEqual(result.get('dist/sdk-formation.json'), Buffer.from(JSON.stringify(receipt())));
  for (const [pathname, bytes] of payloads)
    assert.deepEqual(result.get(`dist/${pathname}`), bytes, `preserves emitted bytes for ${pathname}`);
});

test('rejects a product build receipt and an archive with the wrong test purpose', async () => {
  const productReceipt = { ...receipt(), schema: 'CandidatePackageBuild/v1' };
  const wrongPurpose = { ...receipt(), purpose: 'production' };
  await assert.rejects(validateSdkTestArchive(await archive({ receipt: productReceipt }), identity));
  await assert.rejects(validateSdkTestArchive(await archive({ receipt: wrongPurpose }), identity));
});

test('rejects receipt and requested identities that do not match the same package and Bun', async () => {
  const wrongVersion = { ...receipt(), version: '1.2.4' };
  const wrongBun = { ...receipt(), bun_version: '0.0.0' };
  await assert.rejects(validateSdkTestArchive(await archive({ receipt: wrongVersion }), identity));
  await assert.rejects(validateSdkTestArchive(await archive({ receipt: wrongBun }), identity));
  await assert.rejects(validateSdkTestArchive(await archive(), { version: '1.2.4', bunVersion: Bun.version }));
  await assert.rejects(validateSdkTestArchive(await archive(), { version: identity.version, bunVersion: '0.0.0' }));
});

test('rejects missing output, changed output bytes, and an incorrect output digest', async () => {
  const first = payloads.keys().next().value;
  if (!first) throw new Error('SDK archive fixture has no output member.');
  const changed = new Map([[first, Buffer.from('different emitted bytes\n')]]);
  await assert.rejects(validateSdkTestArchive(await archive({ omit: first }), identity));
  await assert.rejects(validateSdkTestArchive(await archive({ overrides: changed }), identity));
  const badDigest = receipt();
  badDigest.outputs[0] = { ...badDigest.outputs[0]!, sha256: 'f'.repeat(64) };
  await assert.rejects(validateSdkTestArchive(await archive({ receipt: badDigest }), identity));
});

test('rejects unsafe paths and Unix symbolic-link members', async () => {
  await assert.rejects(
    validateSdkTestArchive(await archive({ extra: new Map([['../escape.js', Buffer.from('x')]]) }), identity),
  );
  const first = payloads.keys().next().value;
  if (!first) throw new Error('SDK archive fixture has no output member.');
  await assert.rejects(validateSdkTestArchive(await archive({ symlink: first }), identity));
});

test('rejects unexpected archive members', async () => {
  await assert.rejects(
    validateSdkTestArchive(
      await archive({ extra: new Map([['src/unlisted.js', Buffer.from('export {};')]]) }),
      identity,
    ),
  );
});

test('rejects physically duplicated ZIP filenames', async () => {
  const originalName = Buffer.from('src/other.js');
  const duplicateName = Buffer.from('src/index.js');
  assert.equal(originalName.length, duplicateName.length);
  const zip = await archive({
    extra: new Map([[originalName.toString(), Buffer.from('duplicate member')]]),
  });
  let renamedHeaders = 0;
  for (
    let offset = zip.indexOf(originalName);
    offset >= 0;
    offset = zip.indexOf(originalName, offset + originalName.length)
  ) {
    duplicateName.copy(zip, offset);
    renamedHeaders++;
  }
  assert.equal(renamedHeaders, 2, 'renames both the local and central directory filename');
  await assert.rejects(validateSdkTestArchive(zip, identity));
});

test('rejects a receipt above the bounded archive receipt limit', async () => {
  const oversizedReceipt = { ...receipt(), dependency_custody: 'x'.repeat(8 * 1024 * 1024) };
  await assert.rejects(validateSdkTestArchive(await archive({ receipt: oversizedReceipt }), identity));
});

test('publishes validated files and receipt while retaining the previous dist and removing its stage', () => {
  const root = publicationRoot();
  const priorBytes = Buffer.from('prior SDK output\n');
  const { files, sdkReceiptBytes } = publicationFiles();
  const receiptValue = downloadReceipt(sdkReceiptBytes);
  const warnings = capturedWarnings(() => {
    publishSdkTestInputs(root, files, receiptValue, () => 10_000);
  });
  assert.deepEqual(warnings, []);
  assert.deepEqual(readFileSync(path.join(root, 'dist/sdk-formation.json')), sdkReceiptBytes);
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(root, 'dist/sdk-test-input-download.v1.json'), 'utf8')),
    receiptValue,
  );
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

test.each(['restored', 'rollback-error', 'undefined-primary', 'undefined-rollback', 'foreign-destination'] as const)(
  'failed SDK publication preserves exact causes and retained paths: %s',
  (mode) => {
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
      warnings = capturedWarnings(() => {
        try {
          publishSdkTestInputs(root, files, downloadReceipt(sdkReceiptBytes), () => 10_000);
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

test('a spent pre-publication budget preserves the prior dist and retains its failed stage', () => {
  const root = publicationRoot();
  const priorBytes = Buffer.from('prior SDK output\n');
  const { files, sdkReceiptBytes } = publicationFiles();
  let budgetChecks = 0;
  const warnings = capturedWarnings(() => {
    assert.throws(
      () =>
        publishSdkTestInputs(root, files, downloadReceipt(sdkReceiptBytes), () => (++budgetChecks === 1 ? 10_000 : 0)),
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

test('rejects an unsafe publication path without writing outside the caller root', () => {
  const root = publicationRoot();
  const unsafeFiles = new Map([['dist/../../../escape.js', Buffer.from('escaped')]]);
  const receiptBytes = Buffer.from(JSON.stringify(receipt()));
  const warnings = capturedWarnings(() => {
    assert.throws(
      () => publishSdkTestInputs(root, unsafeFiles, downloadReceipt(receiptBytes), () => 10_000),
      /staging path is unsafe/u,
    );
  });
  assert.match(warnings[0] ?? '', /Retained failed SDK test-input stage/u);
  assert.equal(existsSync(path.join(root, 'escape.js')), false);
  assert.deepEqual(readFileSync(path.join(root, 'dist/prior.js')), Buffer.from('prior SDK output\n'));
});
