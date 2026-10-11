import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'bun:test';
import { ensureForwardLifecycleClear } from '../../../tooling/agent/controllers/forward-lifecycle-clear.ts';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.ts';

const controller = fileURLToPath(
  new URL('../../../tooling/agent/controllers/forward-lifecycle-clear.ts', import.meta.url),
);
const options = {
  root: path.resolve('/nonexistent-vida-forward-ingress-fixture'),
  phase: 'baseline',
  operationId: 'source-only-ingress-control',
  documentationWorkId: 'source-only-ingress-work',
  oldHash: 'a'.repeat(64),
  newHash: 'b'.repeat(64),
  policyHash: 'c'.repeat(64),
  parentManifest: 'd'.repeat(64),
  successorManifest: 'e'.repeat(64),
  payloadRoot: path.resolve('/nonexistent-vida-forward-ingress-payload'),
};

test('forward lifecycle typed ingress retains binding and phase denials before payload access', async () => {
  for (const documentationWorkId of [null, '', 'foreign/work', 'vida-runtime-forward-fix-20260928'])
    await assert.rejects(ensureForwardLifecycleClear({ ...options, documentationWorkId }), {
      message: 'new-work lifecycle CLEAR binding invalid',
    });
  await assert.rejects(ensureForwardLifecycleClear({ ...options, newHash: options.oldHash }), {
    message: 'new-work lifecycle CLEAR binding invalid',
  });
  await assert.rejects(ensureForwardLifecycleClear({ ...options, phase: 'reissue' }), {
    message: 'lifecycle CLEAR phase invalid',
  });
});

test('forward lifecycle direct TS CLI publishes one blocked JSON receipt for missing arguments', async () => {
  const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', controller], {
    timeoutMs: 1500,
  });
  assert.equal(result.closeObserved, true, subprocessFailure('forward CLEAR CLI ingress', result));
  assert.equal(result.exitCode, 1);
  assert.equal(result.timedOut, false);
  assert.equal(result.stdout.byteLength, 0);
  assert.equal(result.stderr.toString(), '{"status":"blocked","message":"new-work lifecycle CLEAR binding invalid"}\n');
});
