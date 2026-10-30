import { describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeMutationCommand } from '../tooling/mutation-evidence.ts';
import { validateWindowsPushProfileJUnit } from '../tooling/windows-push-profile.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selectedFiles = [
  'tests/windows-owned-process.test.ts',
  'tests/version-policy.test.ts',
  'tests/release-ci-producer.test.ts',
  'tests/release-github-publication.test.ts',
  'tests/measured-quality-maxima.test.ts',
];
const windowsOnly = process.platform === 'win32' && process.arch === 'x64';

function suite(file: string, testcase: string): string {
  const failed = testcase === 'failure' ? '<failure type="AssertionError">failure</failure>' : '';
  const skipped = testcase === 'skipped' ? '<skipped/>' : '';
  const tests = testcase === 'empty' ? 0 : 1;
  return `<testsuite name="${file}" file="${file}" tests="${tests}" assertions="${tests}" failures="${testcase === 'failure' ? 1 : 0}" errors="0" skipped="${testcase === 'skipped' ? 1 : 0}">${testcase === 'empty' ? '' : `<testcase name="selected" file="${file}" assertions="1">${failed}${skipped}</testcase>`}</testsuite>`;
}

function junit(files: string[], testcase = 'passed'): string {
  const suites = files.map((file) => suite(file, testcase)).join('');
  const tests = testcase === 'empty' ? 0 : files.length;
  return `<testsuites name="bun test" tests="${tests}" assertions="${tests}" failures="${testcase === 'failure' ? tests : 0}" errors="0" skipped="${testcase === 'skipped' ? tests : 0}">${suites}</testsuites>`;
}

describe('Windows push profile JUnit eligibility', () => {
  test('accepts exactly the maintained five files with passed cases', () => {
    assert.deepEqual(validateWindowsPushProfileJUnit(junit(selectedFiles)), {
      passed: selectedFiles.length,
      skipped: 0,
      failed: 0,
      error: 0,
    });
  });

  test('rejects a zero-match selected file', () => {
    const reports = selectedFiles.map((file, index) => suite(file, index === 0 ? 'empty' : 'passed'));
    const xml = `<testsuites name="bun test" tests="4" assertions="4" failures="0" errors="0" skipped="0">${reports.join('')}</testsuites>`;
    assert.throws(() => validateWindowsPushProfileJUnit(xml), /passed test/);
  });

  test('rejects a failed selected case', () => {
    assert.throws(() => validateWindowsPushProfileJUnit(junit(selectedFiles, 'failure')), /did not pass/);
  });

  test('rejects an all-skipped profile', () => {
    assert.throws(() => validateWindowsPushProfileJUnit(junit(selectedFiles, 'skipped')), /did not pass/);
  });

  test('rejects duplicate and foreign suites', () => {
    assert.throws(() => validateWindowsPushProfileJUnit(junit([...selectedFiles, selectedFiles[0]!])), /suite files/);
    const foreign = [...selectedFiles.slice(1), 'tests/foreign.test.ts'];
    assert.throws(() => validateWindowsPushProfileJUnit(junit(foreign)), /suite files/);
  });
});

describe.skipIf(!windowsOnly)('Windows push profile symlink preload guard', () => {
  test('overrides fallback named and default fs APIs before any symlink effect', async () => {
    const scratchRoot = path.join(packageRoot, '.tmp');
    await mkdir(scratchRoot, { recursive: true });
    const fixtureRoot = await mkdtemp(path.join(scratchRoot, 'windows-push-guard-'));
    const fallback = path.join(fixtureRoot, 'fallback-preload.mjs');
    const probe = path.join(fixtureRoot, 'probe.test.mjs');
    await writeFile(
      fallback,
      [
        "import fs from 'node:fs';",
        "import promises from 'node:fs/promises';",
        "import { mock } from 'bun:test';",
        "const fallback = () => { throw new Error('FALLBACK_SYMLINK_CALLED'); };",
        'const safePromises = {...promises, symlink:fallback};',
        'const safeFs = {...fs,symlinkSync:fallback,symlink:fallback,promises:safePromises};',
        "mock.module('node:fs',()=>({...safeFs,default:safeFs}));",
        "mock.module('node:fs/promises',()=>({...safePromises,default:safePromises}));",
        "if ((await import('node:fs')).symlinkSync !== fallback) throw new Error('Fallback primitive not intercepted');",
      ].join('\n'),
      { flag: 'wx' },
    );
    await writeFile(
      probe,
      [
        "import fs, { symlink, symlinkSync } from 'node:fs';",
        "import { test } from 'bun:test';",
        "test('guarded operations', () => {",
        "const operations = [['named-sync', () => symlinkSync('target', 'never-created')], ['default-sync', () => fs.symlinkSync('target', 'never-created')], ['named-callback', () => symlink('target', 'never-created', () => {})], ['default-callback', () => fs.symlink('target', 'never-created', () => {})], ['promises', () => fs.promises.symlink('target', 'never-created')]];",
        "const results = operations.map(([name, operation]) => { try { operation(); return [name, 'returned']; } catch (error) { return [name, error.code ?? error.message]; } });",
        "fs.writeFileSync('observations.json',JSON.stringify(results));",
        '});',
      ].join('\n'),
      { flag: 'wx' },
    );
    const stdoutFile = path.join(fixtureRoot, 'stdout.bin');
    const stderrFile = path.join(fixtureRoot, 'stderr.bin');
    const result = await executeMutationCommand(
      [
        process.execPath,
        'test',
        '--preload',
        fallback,
        '--preload',
        path.join(packageRoot, 'tooling', 'no-link-test-preload.ts'),
        '--no-env-file',
        probe,
      ],
      fixtureRoot,
      5_000,
      {
        ownedProcessGroup: true,
        env: process.env,
        stdoutFile,
        stderrFile,
        outputByteLimit: 32 * 1024,
        terminationGraceMs: 1_000,
        forceWaitMs: 1_000,
      },
    );
    await writeFile(path.join(fixtureRoot, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    expect(result.exitCode).toBe(0);
    expect(result.signal).toBeNull();
    expect(result.spawnError).toBeNull();
    expect(result.timedOut).toBe(false);
    expect(result.processCustody?.scope).toBe('owned-process-group');
    expect(result.processCustody?.terminationObserved).toBe(true);
    expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
    expect(result.processCustody?.native_job?.assigned_before_resume).toBe(true);
    expect(result.processCustody?.native_job?.active_processes).toBe(0);
    expect(result.output_capture?.complete).toBe(true);
    const observations: unknown = JSON.parse(await readFile(path.join(fixtureRoot, 'observations.json'), 'utf8'));
    assert.deepEqual(observations, [
      ['named-sync', 'ERR_VIDA_TEST_SYMLINK_DISABLED'],
      ['default-sync', 'ERR_VIDA_TEST_SYMLINK_DISABLED'],
      ['named-callback', 'ERR_VIDA_TEST_SYMLINK_DISABLED'],
      ['default-callback', 'ERR_VIDA_TEST_SYMLINK_DISABLED'],
      ['promises', 'ERR_VIDA_TEST_SYMLINK_DISABLED'],
    ]);
  });
});
