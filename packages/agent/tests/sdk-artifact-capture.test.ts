import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from '../tooling/bun-coverage-evidence.ts';
import {
  captureSelectedSdkJavascriptOutputs,
  captureSelectedSdkJavascriptOutputsFromCapturedBytes,
} from '../tooling/sdk-artifact-capture.ts';
import { expectedJavascriptFiles } from '../tooling/maintained-source-inventory.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import { sdkArtifactFixture } from './helpers/sdk-artifact-fixture.ts';

const roots: string[] = [];

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sdk-selected-capture-'));
  roots.push(root);
  return { root, ...sdkArtifactFixture(root) };
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

test('captured-byte validation matches the bounded reader', async () => {
  const value = fixture();
  const artifacts = value.artifacts();
  const sync = captureSelectedSdkJavascriptOutputsFromCapturedBytes(value.root, value.selectedInputs, artifacts);
  const asyncCapture = await captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs);
  expect(sync.evidence).toBe(asyncCapture.evidence);
  expect(sync.paths).toEqual(asyncCapture.paths);
  const member = sync.paths[0];
  if (!member) throw new Error('fixture member is missing');
  expect(sync.readBytes(member)).toEqual(asyncCapture.readBytes(member));
});

test('captured-byte validation denies stale selected inputs and missing or changed outputs synchronously', () => {
  const value = fixture();
  const staleInputs = new Map(value.selectedInputs);
  staleInputs.set('src/nested/transitive.ts', Buffer.from('export const other = true;\n'));
  expect(() =>
    captureSelectedSdkJavascriptOutputsFromCapturedBytes(value.root, staleInputs, value.artifacts()),
  ).toThrow(/selected package formation bytes/u);

  const missingOutput = value.artifacts();
  missingOutput.delete(value.outputs[0]?.path ?? '');
  expect(() =>
    captureSelectedSdkJavascriptOutputsFromCapturedBytes(value.root, value.selectedInputs, missingOutput),
  ).toThrow(/JavaScript is missing/u);

  const changedOutput = value.artifacts();
  const output = value.outputs[0];
  if (!output) throw new Error('fixture output is missing');
  changedOutput.set(output.path, Buffer.from('changed emitted bytes\n'));
  expect(() =>
    captureSelectedSdkJavascriptOutputsFromCapturedBytes(value.root, value.selectedInputs, changedOutput),
  ).toThrow(/differs from its formation receipt/u);
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
