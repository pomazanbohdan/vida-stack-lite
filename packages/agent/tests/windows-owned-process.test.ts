import { describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { executeMutationCommand } from '../tooling/mutation-evidence.ts';

const windowsOnly = process.platform === 'win32' && process.arch === 'x64';
const powershell = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'vida-windows-job-'));
  return root;
}

async function persist(root: string, name: string, value: unknown): Promise<void> {
  await writeFile(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

async function run(root: string, command: string[], timeoutMs = 5_000, outputByteLimit = 4096) {
  return executeMutationCommand(command, root, timeoutMs, {
    ownedProcessGroup: true,
    outputByteLimit,
    stdoutFile: path.join(root, 'stdout.bin'),
    stderrFile: path.join(root, 'stderr.bin'),
    terminationGraceMs: 1_000,
    forceWaitMs: 1_000,
  });
}

function expectClosed(result: Awaited<ReturnType<typeof executeMutationCommand>>) {
  expect(result.processCustody?.scope).toBe('owned-process-group');
  expect(result.processCustody?.terminationObserved).toBe(true);
  expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
  expect(result.processCustody?.native_job).toMatchObject({
    schema: 'VidaWindowsJobObservation/v1',
    assigned_before_resume: true,
    active_processes: 0,
  });
  const observation = result.processCustody?.native_job;
  expect(observation?.creation_filetime).toMatch(/^\d+$/);
  expect(observation?.exit_filetime).toMatch(/^\d+$/);
  expect(BigInt(observation?.exit_filetime ?? '0')).toBeGreaterThanOrEqual(
    BigInt(observation?.creation_filetime ?? '1'),
  );
  expect(observation?.total_processes).toBeGreaterThanOrEqual(1);
}

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function writeChild(root: string, source: string): Promise<string> {
  const file = path.join(root, 'child.ts');
  await writeFile(file, source, { flag: 'wx' });
  return file;
}

async function powershellLeader(root: string, child: string, pidFile: string, delay: boolean): Promise<string> {
  const script = path.join(root, 'leader.ps1');
  const contents = [
    'param([string]$Bun, [string]$ChildScript, [string]$PidFile)',
    '$info = [System.Diagnostics.ProcessStartInfo]::new()',
    '$info.FileName = $Bun',
    '$info.UseShellExecute = $false',
    '$info.CreateNoWindow = $true',
    '$info.Arguments = "--no-env-file `"$ChildScript`""',
    '$child = [System.Diagnostics.Process]::Start($info)',
    '[System.IO.File]::WriteAllText($PidFile, [string]$child.Id)',
    delay ? 'Start-Sleep -Seconds 60' : 'exit 0',
  ].join('\r\n');
  await writeFile(script, contents, { flag: 'wx' });
  return script;
}

describe.skipIf(!windowsOnly)('native Windows process group custody', () => {
  test('round trips argv, cwd, and env and captures both streams', async () => {
    const root = await fixture();
    const args = [
      '',
      'two words',
      '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430',
      'quote"mark',
      'slash\\',
      'tail\\',
    ];
    const child = await writeChild(
      root,
      `
      process.stdout.write(JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd(), env: process.env.VIDA_JOB_TEST }));
      process.stderr.write('stderr-\u0436\u0443\u0440\u043d\u0430\u043b');
    `,
    );
    const result = await executeMutationCommand([process.execPath, '--no-env-file', child, ...args], root, 5_000, {
      ownedProcessGroup: true,
      outputByteLimit: 4096,
      stdoutFile: path.join(root, 'stdout.bin'),
      stderrFile: path.join(root, 'stderr.bin'),
      env: { ...process.env, VIDA_JOB_TEST: '\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f with spaces' },
      terminationGraceMs: 1000,
      forceWaitMs: 1000,
    });
    await persist(root, 'result.json', result);
    const stdout = await readFile(path.join(root, 'stdout.bin'));
    const stderr = await readFile(path.join(root, 'stderr.bin'));
    expectClosed(result);
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.spawnError).toBeNull();
    assert.deepEqual(JSON.parse(stdout.toString('utf8')), {
      argv: args,
      cwd: root,
      env: '\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044f with spaces',
    });
    expect(stderr.toString('utf8')).toBe('stderr-\u0436\u0443\u0440\u043d\u0430\u043b');
    assert.ok(result.output_capture?.complete);
    expect(result.output_capture?.stdout.sha256).toBe(digest(stdout));
    expect(result.output_capture?.stderr.sha256).toBe(digest(stderr));
  });

  test('retains a nonzero child exit with observed job closure', async () => {
    const root = await fixture();
    const child = await writeChild(root, "process.stdout.write('exit-seven'); process.exit(7);");
    const result = await run(root, [process.execPath, '--no-env-file', child]);
    await persist(root, 'result.json', result);
    expectClosed(result);
    expect(result.exitCode).toBe(7);
    expect(result.timedOut).toBe(false);
    expect(await readFile(path.join(root, 'stdout.bin'), 'utf8')).toBe('exit-seven');
  });

  test('observes PowerShell leader exit while cleaning its live grandchild', async () => {
    const root = await fixture();
    const child = await writeChild(root, 'await Bun.sleep(60_000);');
    const pidFile = path.join(root, 'grandchild.pid');
    const leader = await powershellLeader(root, child, pidFile, false);
    const result = await run(root, [
      powershell,
      '-NoProfile',
      '-NonInteractive',
      '-File',
      leader,
      process.execPath,
      child,
      pidFile,
    ]);
    await persist(root, 'result.json', result);
    const pidText = await readFile(pidFile, 'utf8');
    expectClosed(result);
    expect(Number(pidText)).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.spawnError).toBe('process-group-termination-unobserved');
    expect(result.processCustody?.native_job?.total_processes).toBeGreaterThanOrEqual(2);
  });

  test('terminates a live PowerShell leader and grandchild at timeout', async () => {
    const root = await fixture();
    const child = await writeChild(root, 'await Bun.sleep(60_000);');
    const pidFile = path.join(root, 'grandchild.pid');
    const leader = await powershellLeader(root, child, pidFile, true);
    const result = await run(
      root,
      [powershell, '-NoProfile', '-NonInteractive', '-File', leader, process.execPath, child, pidFile],
      2_000,
    );
    await persist(root, 'result.json', result);
    const pidText = await readFile(pidFile, 'utf8');
    expectClosed(result);
    expect(Number(pidText)).toBeGreaterThan(0);
    expect(result.timedOut).toBe(true);
    expect(result.processCustody?.native_job?.total_processes).toBeGreaterThanOrEqual(2);
  });

  test('rejects unsupported native status fd before an effect can run', async () => {
    const root = await fixture();
    const effect = path.join(root, 'effect.json');
    const child = await writeChild(root, `await Bun.write(${JSON.stringify(effect)}, 'ran');`);
    const result = await executeMutationCommand([process.execPath, '--no-env-file', child], root, 3_000, {
      ownedProcessGroup: true,
      nativeStatusFile: path.join(root, 'native-status.json'),
      stdoutFile: path.join(root, 'stdout.bin'),
      stderrFile: path.join(root, 'stderr.bin'),
    });
    await persist(root, 'result.json', result);
    expect(result.native_status_file).toBe(path.join(root, 'native-status.json'));
    expect(result.native_status_error).toBe('windows-native-status-unsupported');
    expect(await Bun.file(path.join(root, 'native-status.json')).exists()).toBe(false);
    expect(result.processCustody).toBeNull();
    expect(result.spawnError).toMatch(/^(runner-error|windows-native-status-unsupported)$/);
    expect(await Bun.file(effect).exists()).toBe(false);
  });

  test('hashes full output while retaining only the configured prefix', async () => {
    const root = await fixture();
    const child = await writeChild(root, "process.stdout.write('x'.repeat(256 * 1024));");
    const result = await run(root, [process.execPath, '--no-env-file', child], 5_000, 1024);
    await persist(root, 'result.json', result);
    expectClosed(result);
    const retained = await readFile(path.join(root, 'stdout.bin'));
    assert.ok(result.output_capture?.complete);
    expect(result.output_capture?.stdout).toMatchObject({ bytes: 256 * 1024, retained_bytes: 1024, truncated: true });
    expect(result.output_capture?.stdout.sha256).toBe(digest(new Uint8Array(Buffer.alloc(256 * 1024, 'x'))));
    expect(retained.byteLength).toBe(1024);
  });
});
