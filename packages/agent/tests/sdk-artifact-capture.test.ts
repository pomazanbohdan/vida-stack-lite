import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from '../tooling/bun-coverage-evidence.ts';
import { captureSelectedSdkJavascriptOutputs } from '../tooling/sdk-artifact-capture.ts';
import { expectedJavascriptFiles } from '../tooling/maintained-source-inventory.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

const roots: string[] = [];

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sdk-selected-capture-'));
  roots.push(root);
  const outputs = expectedJavascriptFiles.map((file, index) => ({
    path: `dist/src/${file}`,
    bytes: Buffer.from(`export const member${index} = ${index};\n`),
  }));
  const selectedInputs = new Map<string, Buffer>([
    ['.bun-version', Buffer.from(`${Bun.version}\n`)],
    ['bun.lock', Buffer.from('lock fixture\n')],
    ['package.json', Buffer.from(JSON.stringify({ version: '1.2.3', engines: { node: '24.x' } }))],
    ['src/index.ts', Buffer.from('export const index = true;\n')],
    ['src/nested/transitive.ts', Buffer.from('export const nested = true;\n')],
    ['src/trusted-host.ts', Buffer.from('export const trustedHost = true;\n')],
    ['tooling/build-package.ts', Buffer.from('export const builder = true;\n')],
  ]);
  for (const [relative, bytes] of selectedInputs) {
    const destination = path.join(root, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
  }
  for (const output of outputs) {
    const destination = path.join(root, output.path);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, output.bytes);
  }
  const receipt = () => ({
    schema: 'CandidatePackageBuild/v1',
    version: '1.2.3',
    declared_node_engine: '24.x',
    declaration_runtime: 'bun',
    bun_version: Bun.version,
    production_entrypoints: ['dist/src/index.js', 'dist/src/trusted-host.js'],
    test_issuers_shipped: false,
    schemas: 1,
    inputs: [...selectedInputs].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) })),
    outputs: outputs.map(({ path: file, bytes }) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) })),
    virtual_runtime_entry: { path: 'src/runtime.ts', sha256: 'a'.repeat(64) },
    dependency_custody:
      'External node_modules is linked; selected manifest and frozen lock are captured, dependency bytes are outside snapshot custody.',
  });
  const writeReceipt = (value = receipt()) => {
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    writeFileSync(path.join(root, 'dist/sdk-formation.json'), JSON.stringify(value) + '\n');
  };
  writeReceipt();
  return { root, outputs, receipt, selectedInputs, writeReceipt };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('joins exact selected input inventory to four emitted members and retains private bytes', async () => {
  const value = fixture();
  const captured = await captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs);
  expect(captured.evidence).toBe('selected-input-inventory-and-output-integrity');
  expect(captured.paths).toEqual(expectedJavascriptFiles.map((file) => `dist/src/${file}`).sort());
  const member = captured.paths[0];
  if (!member) throw new Error('fixture member is missing');
  const returned = captured.readBytes(member);
  returned[0] = 0;
  writeFileSync(path.join(value.root, member), 'changed live bytes\n');
  const original = value.outputs.find((output) => output.path === member);
  if (!original) throw new Error('fixture member bytes are missing');
  expect(captured.readBytes(member)).toEqual(original.bytes);
});

test('rejects stale selected transitive source bytes even when the receipt is self-consistent', async () => {
  const value = fixture();
  const stale = new Map(value.selectedInputs);
  stale.set('src/nested/transitive.ts', Buffer.from('new selected source bytes\n'));
  await expectRejection(captureSelectedSdkJavascriptOutputs(value.root, stale), /selected package formation bytes/u);
});

test('rejects omitted and unselected extra receipt input rows', async () => {
  const value = fixture();
  const missing = value.receipt();
  missing.inputs = missing.inputs.filter((entry) => entry.path !== 'bun.lock');
  value.writeReceipt(missing);
  await expectRejection(
    captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
    /selected package formation bytes/u,
  );

  const extra = value.receipt();
  extra.inputs.push({ path: 'src/not-selected.ts', bytes: 0, sha256: sha256(Buffer.alloc(0)) });
  value.writeReceipt(extra);
  await expectRejection(
    captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
    /selected package formation bytes/u,
  );
});

test('rejects malformed and duplicate receipt input rows', async () => {
  const value = fixture();
  const malformed = value.receipt();
  malformed.inputs[0] = { path: '../outside', bytes: 0, sha256: '0'.repeat(64) };
  value.writeReceipt(malformed);
  await expectRejection(
    captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
    /input entry is invalid/u,
  );

  const duplicate = value.receipt();
  const first = duplicate.inputs[0];
  if (!first) throw new Error('fixture input row is missing');
  duplicate.inputs.push({ ...first });
  value.writeReceipt(duplicate);
  await expectRejection(
    captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
    /input entry is invalid/u,
  );
});

test('rejects missing, foreign, byte-count and digest-tampered JavaScript outputs', async () => {
  const value = fixture();
  const missing = value.receipt();
  missing.outputs.pop();
  value.writeReceipt(missing);
  await expectRejection(captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs), /exact four/u);

  const foreign = value.receipt();
  foreign.outputs.push({ path: 'dist/foreign.js', bytes: 0, sha256: '0'.repeat(64) });
  value.writeReceipt(foreign);
  await expectRejection(captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs), /exact four/u);

  const count = value.receipt();
  const firstCount = count.outputs[0];
  if (!firstCount) throw new Error('fixture output row is missing');
  count.outputs[0] = { ...firstCount, bytes: firstCount.bytes + 1 };
  value.writeReceipt(count);
  await expectRejection(
    captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
    /differs from its formation receipt/u,
  );

  const digest = value.receipt();
  const firstDigest = digest.outputs[0];
  if (!firstDigest) throw new Error('fixture output row is missing');
  digest.outputs[0] = { ...firstDigest, sha256: '0'.repeat(64) };
  value.writeReceipt(digest);
  await expectRejection(
    captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
    /differs from its formation receipt/u,
  );
});

test('rejects a linked emitted JavaScript member through the bounded reader', async () => {
  const value = fixture();
  const member = value.outputs[0];
  if (!member) throw new Error('fixture output is missing');
  rmSync(path.join(value.root, member.path));
  const target = path.join(value.root, 'outside.js');
  writeFileSync(target, member.bytes);
  symlinkSync(target, path.join(value.root, member.path));
  await expectRejection(
    captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
    /Coverage input rejected/u,
  );
});
