import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { executeMutationCommand } from '../tooling/mutation-evidence.ts';
import { releaseSourceProfileHash, validateReleaseSourceJUnit } from '../tooling/windows-push-profile.ts';

const files = ['tests/a.test.ts', 'tests/b.test.ts'];
function report(second: 'passed' | 'skipped' | 'empty'): string {
  const suite = (file: string, state: 'passed' | 'skipped' | 'empty') => {
    const n = state === 'empty' ? 0 : 1;
    return `<testsuite name="${file}" file="${file}" tests="${n}" assertions="${n}" failures="0" errors="0" skipped="${state === 'skipped' ? 1 : 0}">${n ? `<testcase name="case" file="${file}" assertions="1">${state === 'skipped' ? '<skipped/>' : ''}</testcase>` : ''}</testsuite>`;
  };
  const n = second === 'empty' ? 1 : 2;
  return `<testsuites name="bun test" tests="${n}" assertions="${n}" failures="0" errors="0" skipped="${second === 'skipped' ? 1 : 0}">${suite(files[0]!, 'passed')}${suite(files[1]!, second)}</testsuites>`;
}

test('profile digest binds canonical commands independent of installation path', () => {
  const commands = [
    ['<bun>', 'bin/bun.ts', 'run', 'quality:static:pinned'],
    [
      '<bun>',
      'test',
      '--timeout',
      '5000',
      '--preload',
      'tooling/no-link-test-preload.ts',
      '--reporter=junit',
      '--reporter-outfile=<owned-junit>',
      ...files,
    ],
  ];
  const expected = createHash('sha256')
    .update(JSON.stringify({ profile_id: 'release-source-assurance/v1', platform: 'win32-x64', commands, files }))
    .digest('hex');
  expect(releaseSourceProfileHash('win32-x64', files)).toBe(expected);
  expect(releaseSourceProfileHash('linux-x64', files)).not.toBe(expected);
});

test('assurance requires a passed case in each selected file', () => {
  expect(validateReleaseSourceJUnit(report('passed'), files).totals.passed).toBe(2);
  expect(() => validateReleaseSourceJUnit(report('skipped'), files)).toThrow();
  expect(() => validateReleaseSourceJUnit(report('empty'), files)).toThrow();
  expect(() => validateReleaseSourceJUnit(report('passed').replace('</testsuites>', ''), files)).toThrow();
  expect(() => validateReleaseSourceJUnit(report('passed'), [...files, 'tests/missing.test.ts'])).toThrow();
});

test.skipIf(process.platform !== 'win32' || process.arch !== 'x64')(
  'Windows installer release selection validates maintained no-link fixture',
  async () => {
    const pkg = path.resolve(import.meta.dir, '..');
    const parent = path.join(pkg, '.tmp');
    await mkdir(parent, { recursive: true });
    const root = await mkdtemp(path.join(parent, 'windows-installer-assurance-'));
    const stdout = path.join(root, 'stdout.bin'),
      stderr = path.join(root, 'stderr.bin');
    const powershell = path.join(process.env.SystemRoot!, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const command = [
      powershell,
      '-NoProfile',
      '-NonInteractive',
      '-File',
      path.join(import.meta.dir, 'windows-latest-install.fixture.ps1'),
    ];
    const result = await executeMutationCommand(command, pkg, 4_000, {
      ownedProcessGroup: true,
      env: process.env,
      stdoutFile: stdout,
      stderrFile: stderr,
      outputByteLimit: 1024 * 1024,
      terminationGraceMs: 500,
      forceWaitMs: 500,
    });
    await writeFile(
      path.join(root, 'result.json'),
      JSON.stringify({ ...result, invocation: command, cwd: pkg }, null, 2) + '\n',
      { flag: 'wx' },
    );
    const custody = result.processCustody,
      job = custody?.native_job;
    expect(result.exitCode).toBe(0);
    expect(result.signal).toBeNull();
    expect(result.spawnError).toBeNull();
    expect(result.timedOut).toBe(false);
    expect(custody?.scope).toBe('owned-process-group');
    expect(custody?.terminationObserved).toBe(true);
    expect(custody?.processGroupTerminationObserved).toBe(true);
    expect(job?.schema).toBe('VidaWindowsJobObservation/v1');
    expect(job?.assigned_before_resume).toBe(true);
    expect(job?.active_processes).toBe(0);
    expect(job?.total_processes).toBeGreaterThanOrEqual(1);
    expect(result.output_capture?.complete).toBe(true);
    if (result.output_capture?.complete !== true) throw new Error('Output capture was not complete');
    expect(result.output_capture.stdout.truncated).toBe(false);
    expect(result.output_capture.stderr.truncated).toBe(false);
    expect(await readFile(stdout, 'utf8')).toContain(
      'PASS: latest selection, tag-bound assets, digest checks, redirects and timeout settings',
    );
  },
);
