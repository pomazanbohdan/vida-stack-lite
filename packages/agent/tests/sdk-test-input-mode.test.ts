import { afterEach, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sdkBuildReceiptIdentity } from '../tooling/build-package.ts';
import { captureSelectedSdkJavascriptOutputs } from '../tooling/sdk-artifact-capture.ts';
import { ensureSdkCoverageInputsForTests } from '../../../tooling/agent/sdk-coverage-readiness.ts';
import { assertSdkDeliveryReceipt, packSdkCompatibility, verifySdkPackage } from '../tooling/pack-sdk.ts';
import { expectedJavascriptFiles } from '../tooling/maintained-source-inventory.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import { sdkArtifactFixture } from './helpers/sdk-artifact-fixture.ts';

const roots: string[] = [];

function temporaryRoot(prefix: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

function captureFixture(
  identity: { schema: string; purpose?: string } = {
    schema: 'CandidateSdkTestInputs/v1',
    purpose: 'development-tests',
  },
) {
  const root = temporaryRoot('sdk-test-input-capture-');
  return { root, ...sdkArtifactFixture(root, identity) };
}

function deliveryFixture(receipt: unknown): string {
  const root = temporaryRoot('sdk-test-input-delivery-');
  mkdirSync(path.join(root, 'dist'));
  writeFileSync(path.join(root, 'dist/sdk-formation.json'), JSON.stringify(receipt) + '\n');
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('SDK receipt identity selects product by default and test inputs only by the exact flag', () => {
  expect(sdkBuildReceiptIdentity([])).toEqual({ schema: 'CandidatePackageBuild/v1' });
  expect(sdkBuildReceiptIdentity(['--test-inputs'])).toEqual({
    schema: 'CandidateSdkTestInputs/v1',
    purpose: 'development-tests',
  });
});

test.each([
  ['unknown option', ['--unknown']],
  ['multiple options', ['--test-inputs', '--test-inputs']],
] as const)('SDK receipt identity rejects %s before a build can start', (_label, args) => {
  expect(() => sdkBuildReceiptIdentity(args)).toThrow('Unsupported SDK build argument.');
});

test('captured SDK test inputs accept the exact test receipt and return owned emitted bytes', async () => {
  const value = captureFixture();
  const captured = await captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs);
  expect(captured.evidence).toBe('selected-input-inventory-and-output-integrity');
  expect(captured.paths).toEqual(expectedJavascriptFiles.map((file) => `dist/src/${file}`).sort());
  const output = value.outputs[0];
  if (!output) throw new Error('fixture output is missing');
  const returned = captured.readBytes(output.path);
  returned[0] = 0;
  expect(captured.readBytes(output.path)).toEqual(output.bytes);
});

test.each([
  ['test schema without purpose', { schema: 'CandidateSdkTestInputs/v1' }],
  ['test schema with the wrong purpose', { schema: 'CandidateSdkTestInputs/v1', purpose: 'product' }],
  ['product schema mixed with test purpose', { schema: 'CandidatePackageBuild/v1', purpose: 'development-tests' }],
] as const)('captured SDK receipt rejects %s', async (_label, identity) => {
  const value = captureFixture(identity);
  await expectRejection(captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs), /receipt is invalid/u);
});

test.each(['input', 'output', 'version'] as const)('test input receipt rejects %s drift', async (drift) => {
  const value = captureFixture();
  const receipt = value.receipt();
  if (drift === 'input') {
    const changed = new Map(value.selectedInputs);
    changed.set('src/nested/transitive.ts', Buffer.from('drifted selected source\n'));
    await expectRejection(
      captureSelectedSdkJavascriptOutputs(value.root, changed),
      /selected package formation bytes/u,
    );
    return;
  }
  if (drift === 'output') {
    const output = value.outputs[0];
    if (!output) throw new Error('fixture output is missing');
    writeFileSync(path.join(value.root, output.path), 'changed emitted output\n');
    await expectRejection(
      captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
      /differs from its formation receipt/u,
    );
    return;
  }
  receipt.version = '9.9.9';
  value.writeReceipt(receipt);
  await expectRejection(
    captureSelectedSdkJavascriptOutputs(value.root, value.selectedInputs),
    /selected package manifest and Bun pin/u,
  );
});

test('product delivery accepts the product receipt and keeps missing-receipt compatibility', () => {
  const value = captureFixture({ schema: 'CandidatePackageBuild/v1' });
  expect(() => assertSdkDeliveryReceipt(value.root)).not.toThrow();
  const legacyRoot = temporaryRoot('sdk-legacy-delivery-');
  expect(() => assertSdkDeliveryReceipt(legacyRoot)).not.toThrow();
});

test('public SDK delivery APIs reject test inputs before Bun resolution or destination creation', async () => {
  const root = deliveryFixture({ schema: 'CandidateSdkTestInputs/v1', purpose: 'development-tests' });
  const destination = path.join(root, 'new-destination');

  expect(() => assertSdkDeliveryReceipt(root)).toThrow('SDK test inputs cannot be used for product delivery');
  await expectRejection(verifySdkPackage({ root }), /SDK test inputs cannot be used for product delivery/u);
  await expectRejection(
    packSdkCompatibility({ root, destination }),
    /SDK test inputs cannot be used for product delivery/u,
  );

  expect(existsSync(destination)).toBe(false);
  expect(existsSync(path.join(root, '.bun-version'))).toBe(false);
});

test('public SDK delivery rejects a product-labeled receipt carrying test purpose', () => {
  const root = deliveryFixture({ schema: 'CandidatePackageBuild/v1', purpose: 'development-tests' });
  expect(() => assertSdkDeliveryReceipt(root)).toThrow('SDK test inputs cannot be used for product delivery');
});

test('SDK readiness skips non-SDK selections before package access', async () => {
  expect(
    await ensureSdkCoverageInputsForTests({
      root: path.join(os.tmpdir(), 'not-the-agent-package'),
      tests: ['tests/configured-workflow.test.ts'],
    }),
  ).toBeUndefined();
  await expectRejection(
    ensureSdkCoverageInputsForTests({
      root: path.join(os.tmpdir(), 'not-the-agent-package'),
      tests: ['tests/sdk-package-compatibility.test.ts'],
    }),
    /bound to the VIDA agent package root/u,
  );
});
