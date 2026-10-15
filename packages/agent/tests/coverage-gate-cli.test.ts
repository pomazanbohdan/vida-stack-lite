import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const gate = path.join(packageRoot, 'tooling/coverage-gate.ts');

test.each([
  ['missing report', null],
  ['invalid UTF-8', Buffer.from([0xff])],
  ['malformed JSON', Buffer.from('{')],
  ['null report', Buffer.from('null')],
  ['unbound pass claim', Buffer.from('{"status":"pass","schema":"CandidateCoverageReport/v3"}')],
  [
    'focused diagnostic',
    Buffer.from(JSON.stringify({ schema: 'VidaBunFocusedCoverageDiagnostic/v1', scope_passed: true })),
  ],
  [
    'decoded shape without provenance',
    Buffer.from(
      JSON.stringify({
        schema: 'VidaBunCoverageReport/v1',
        run_id: '00000000-0000-0000-0000-000000000000',
        runtime_executable_sha256: '0'.repeat(64),
        sources: [null],
        tests: [],
        test_inputs: [],
        tool_inputs: [],
        shards: [],
        processes: [],
        coverage: {},
      }),
    ),
  ],
] as const)('native coverage gate rejects %s without changing report bytes', (_name, bytes) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-gate-cli-'));
  const relativeReport = 'nested reports/звіт.json';
  const report = path.join(root, relativeReport);
  try {
    if (bytes !== null) {
      mkdirSync(path.dirname(report));
      writeFileSync(report, bytes);
    }
    const childEnvironment: NodeJS.ProcessEnv = { ...process.env, BUN_RUNTIME_TRANSPILER_CACHE_PATH: '0' };
    // Each fixture supplies its complete argv; ambient Bun arguments must not
    // replace the report-path/decoding scenario selected by this test.
    delete childEnvironment.BUN_OPTIONS;
    const child = spawnSync(
      process.execPath,
      ['--no-env-file', '--no-install', `--config=${path.join(packageRoot, 'bunfig.toml')}`, gate, relativeReport],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 10_000,
        maxBuffer: 64 * 1024,
        env: childEnvironment,
      },
    );
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(1);
    expect(child.stderr).toBe('');
    const result: unknown = JSON.parse(child.stdout);
    expect(result).toMatchObject({ schema: 'CandidateCoverageReport/v3', status: 'fail' });
    expect(result).not.toHaveProperty('totals');
    expect(result).not.toHaveProperty('run_id');
    if (result === null || typeof result !== 'object' || !('reason' in result))
      throw new Error('Gate denial has no reason');
    expect(typeof result.reason).toBe('string');
    expect(String(result.reason).length).toBeGreaterThan(0);
    if (_name === 'decoded shape without provenance')
      expect(result.reason).toBe('Coverage manifest path is not canonical.');
    if (bytes === null) expect(() => readFileSync(report)).toThrow(/ENOENT/u);
    else expect(readFileSync(report)).toEqual(bytes);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('native coverage gate is delivered and captured under its maintained TS path', () => {
  const manifest: unknown = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  expect(manifest).toMatchObject({ scripts: { 'coverage:gate:pinned': 'bun tooling/coverage-gate.ts' } });
  if (manifest === null || typeof manifest !== 'object' || !('files' in manifest) || !Array.isArray(manifest.files))
    throw new Error('Package payload is unavailable');
  expect(manifest.files).toContain('tooling/coverage-gate.ts');
  expect(manifest.files).not.toContain('tooling/coverage-gate.mjs');
  expect(manifest.files).toContain('tooling/bun-coverage-report-validator.ts');
  expect(manifest.files).not.toContain('tooling/bun-coverage-report-validator.mjs');
  expect(manifest.files).not.toContain('tooling/bun-coverage-report-validator.d.mts');
});
