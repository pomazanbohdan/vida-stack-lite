import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCoverageSnapshotBytes, validateCoverageReport } from '../tooling/bun-coverage-report-validator.ts';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

test('snapshot byte guard covers both roots and rejects replacement despite readonly captured files', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'snapshot-byte-custody-'));
  const expected = {
    'src/fixture.ts': Buffer.from('current source'),
    'tooling/fixture.ts': Buffer.from('measurement tool'),
    'published-fixture/tests/unselected.test.mjs': Buffer.from('published unselected test'),
    'published-fixture/TESTING.md': Buffer.from('published resource'),
  };
  try {
    for (const [file, bytes] of Object.entries(expected)) {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, bytes, { mode: 0o400 });
    }
    const sidecar = path.join(root, 'published-fixture', '.TESTING.md.cas.lock');
    writeFileSync(sidecar, 'owned lock');
    expect(() => assertCoverageSnapshotBytes(root, expected)).not.toThrow();
    for (const [file, bytes] of Object.entries(expected)) {
      const target = path.join(root, file),
        replacement = target + '.replacement';
      writeFileSync(replacement, 'changed', { mode: 0o400 });
      renameSync(replacement, target);
      expect(() => assertCoverageSnapshotBytes(root, expected)).toThrow(/differs from its snapshot/);
      writeFileSync(replacement, bytes, { mode: 0o400 });
      renameSync(replacement, target);
    }
    rmSync(path.join(root, 'published-fixture', 'TESTING.md'));
    expect(() => assertCoverageSnapshotBytes(root, expected)).toThrow();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Untrusted denial-only data: no successful producer receipt or passing coverage is claimed.
test('decoded manifest shape and its SHA do not establish runtime or coverage provenance', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-report-denial-'));
  const runId = '00000000-0000-0000-0000-000000000000';
  const manifestRelative = `coverage/bun-unified/runs/${runId}/manifest.json`;
  const manifestPath = path.join(root, manifestRelative);
  const reportPath = path.join(root, 'untrusted-report.json');
  const pin = readFileSync(path.join(packageRoot, '.bun-version'));
  const manifestBytes = Buffer.from(
    JSON.stringify({
      schema: 'VidaBunCoverageRun/v1',
      run_id: runId,
      bun_version: pin.toString('utf8').trim(),
      snapshot_directory: `coverage/bun-unified/runs/${runId}/snapshot`,
      sources: [],
      source_maps: [],
      runtime_executable_sha256: '0'.repeat(64),
    }),
  );
  const reportBytes = Buffer.from(
    JSON.stringify({
      schema: 'VidaBunCoverageReport/v1',
      run_id: runId,
      manifest_path: manifestRelative,
      manifest_sha256: createHash('sha256').update(manifestBytes).digest('hex'),
      runtime_executable_sha256: '0'.repeat(64),
      sources: [null],
      tests: [],
      test_inputs: [],
      tool_inputs: [],
      shards: [],
      processes: [],
      coverage: {},
    }),
  );
  try {
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, manifestBytes);
    writeFileSync(reportPath, reportBytes);
    writeFileSync(path.join(root, '.bun-version'), pin);
    let caught: unknown;
    try {
      await validateCoverageReport(reportPath, root);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    if (!(caught instanceof Error)) throw new Error('Expected provenance denial.');
    expect(caught.message).toBe('Coverage report was not collected by the package-pinned Bun runtime.');
    expect(readFileSync(reportPath)).toEqual(reportBytes);
    expect(readFileSync(manifestPath)).toEqual(manifestBytes);
    expect(readFileSync(path.join(root, '.bun-version'))).toEqual(pin);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
