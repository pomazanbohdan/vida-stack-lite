import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from 'vitest';

const candidateRoot = fileURLToPath(new URL('../', import.meta.url));
const gate = path.join(candidateRoot, 'tooling', 'coverage-gate.mjs');

test('coverage provenance binds selected tests and rejects a stale Bun native report', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-coverage-provenance-'));
  const put = (name, value) => {
    const target = path.join(root, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, value);
  };
  const run = (mode) =>
    spawnSync(process.execPath, [gate, mode], {
      cwd: candidateRoot,
      encoding: 'utf8',
      env: { ...process.env, COVERAGE_GATE_ROOT: root },
    });
  try {
    put(
      'package.json',
      JSON.stringify({
        files: ['src/**'],
        bin: {},
        scripts: { 'test:coverage:pinned': 'vitest run --exclude tests/cli-excluded.test.mjs --coverage' },
      }),
    );
    put('src/fixture.ts', 'export const value = 1;\n');
    put(
      'vitest.config.mjs',
      "export default { test: { include: ['tests/*.test.mjs'], exclude: ['tests/config-excluded.test.mjs'] } };\n",
    );
    put('tests/selected.test.mjs', 'export const selected = 1;\n');
    put('tests/another.test.mjs', 'export const another = 1;\n');
    put('tests/config-excluded.test.mjs', 'export const excluded = 1;\n');
    put('tests/cli-excluded.test.mjs', 'export const excluded = 1;\n');
    put('tests/bun/native.test.mjs', 'export const native = 1;\n');
    put(
      'tooling/run-bun-native-coverage.mjs',
      "process.stdout.write(JSON.stringify(['tests/bun/native.test.mjs']) + '\\n');\n",
    );
    const begun = run('--begin-v8');
    expect(begun.status, begun.stderr).toBe(0);
    const startPath = path.join(root, 'node_modules', '.cache', 'vida-agent', 'coverage-source-start.v1.json');
    const started = JSON.parse(readFileSync(startPath, 'utf8'));
    expect(started.selection.v8.files).toEqual(['tests/another.test.mjs', 'tests/selected.test.mjs']);
    expect(started.selection.bun_native).toEqual(['tests/bun/native.test.mjs']);
    expect(started.inputs.filter((entry) => entry.path.startsWith('tests/')).map((entry) => entry.path)).toEqual([
      'tests/another.test.mjs',
      'tests/bun/native.test.mjs',
      'tests/selected.test.mjs',
    ]);

    put('tests/another.test.mjs', 'export const another = 2;\n');
    put('coverage/coverage-final.json', '{}');
    put('coverage/coverage-summary.json', '{}');
    expect(run('--stamp-v8').stderr).toMatch(/coverage input changed during collection/);

    expect(run('--begin-v8').status).toBe(0);
    put('coverage/coverage-final.json', '{ }');
    put('coverage/coverage-summary.json', '{ }');
    const stamped = run('--stamp-v8');
    expect(stamped.status, stamped.stderr).toBe(0);
    const fingerprintPath = path.join(root, 'coverage', 'source-fingerprint.v1.json');
    const v8Fingerprint = readFileSync(fingerprintPath, 'utf8');
    put('coverage/bun-native/coverage-final.json', JSON.stringify({ run_id: 'prior-run' }));
    expect(run('--stamp-native').stderr).toMatch(/stale Bun native coverage report/);
    expect(readFileSync(fingerprintPath, 'utf8')).toBe(v8Fingerprint);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
