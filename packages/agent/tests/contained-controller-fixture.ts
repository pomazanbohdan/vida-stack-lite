import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  boundedSpawnSync,
  commandOutcomeUnknown,
  executionBudget,
  pinnedEnvironment,
  requireTerminalCommand,
} from '../bin/bun.ts';
import { developmentControllerBinding } from '../bin/development-controller.ts';

type ExecutionBudget = ReturnType<typeof executionBudget>;
type ControllerBinding = ReturnType<typeof developmentControllerBinding>;
type TerminalCommand = ReturnType<typeof boundedSpawnSync> & { readonly stdout: string; readonly stderr: string };

interface PreparedController {
  readonly engine: string;
  readonly package_root: string;
  readonly package_binding: {
    readonly digest: string;
  };
  readonly qualification: {
    readonly status: string;
    readonly package_binding: string;
  };
  readonly status: string;
}

interface ContainedRun extends TerminalCommand {
  readonly payload: unknown;
}

export interface ContainedControllerFixture {
  readonly binding: ControllerBinding;
  readonly cleanupHookOptions: { readonly timeout: number };
  readonly retained: boolean;
  assertUnchanged(): void;
  retain(): void;
  run(args: readonly string[], childBudget: ExecutionBudget): ContainedRun;
  caseBudget(): ExecutionBudget;
  close(): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPreparedController(value: unknown): value is PreparedController {
  if (!isRecord(value)) return false;
  const candidate = value;
  const packageBinding = candidate.package_binding;
  const qualification = candidate.qualification;
  if (!isRecord(packageBinding) || !isRecord(qualification)) return false;
  return (
    typeof candidate.engine === 'string' &&
    typeof candidate.package_root === 'string' &&
    candidate.status === 'ready' &&
    typeof packageBinding.digest === 'string' &&
    typeof qualification.status === 'string' &&
    typeof qualification.package_binding === 'string'
  );
}

// Actual controller qualification is package preparation, never consumer authority.
export function containedControllerFixture(bundle: string): ContainedControllerFixture {
  const budget = executionBudget(undefined, 30000);
  const root = mkdtempSync(path.join(tmpdir(), 'vida-contained-tests-'));
  const target = path.join(root, 'source');
  const controllerRoot = path.join(root, 'controller');
  mkdirSync(target);
  const repository = path.resolve(bundle, '../..');
  for (const name of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', 'docs']) {
    cpSync(path.join(repository, name), path.join(target, name), { recursive: true });
  }
  mkdirSync(path.join(target, 'packages/agent'), { recursive: true });
  cpSync(path.join(bundle, 'docs'), path.join(target, 'packages/agent/docs'), { recursive: true });
  const driver = path.join(root, 'prepare.mjs');
  writeFileSync(
    driver,
    `import {prepareDevelopmentController, verifyDevelopmentController} from ${JSON.stringify(pathToFileURL(path.join(bundle, 'bin/development-controller.ts')).href)};
await prepareDevelopmentController(${JSON.stringify({ target, controllerRoot })});
console.log(JSON.stringify(await verifyDevelopmentController(${JSON.stringify({ controllerRoot })})));
`,
  );

  let retained = false;
  let invocation = 0;
  const execute = (
    executable: string,
    packageRoot: string,
    args: readonly string[],
    allowance: number,
    childBudget: ExecutionBudget,
    label: string,
  ): TerminalCommand => {
    invocation++;
    const pinnedSpawn: Parameters<typeof boundedSpawnSync>[0] = spawnSync;
    const result = boundedSpawnSync(
      pinnedSpawn,
      executable,
      ['--no-env-file', '--no-install', '--config=' + path.join(packageRoot, 'bunfig.toml'), ...args],
      {
        cwd: packageRoot,
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...pinnedEnvironment(executable, process.env, packageRoot),
          VIDA_CONTROLLER_DIAGNOSTICS: 'true',
        },
        timeout: allowance,
        budget: childBudget,
        diagnostics: true,
      },
      label,
    );
    if (commandOutcomeUnknown(result)) retained = true;
    try {
      requireTerminalCommand(result, label);
    } catch (error) {
      retained = true;
      const failures: unknown[] = [error];
      for (const [stream, bytes] of [
        ['stdout', result.stdout],
        ['stderr', result.stderr],
      ] as const) {
        try {
          if (bytes !== null && bytes !== undefined)
            writeFileSync(path.join(root, `failed-command-${invocation}.${stream}.log`), bytes, {
              flag: 'wx',
              mode: 0o600,
            });
        } catch (failure) {
          failures.push(failure);
        }
      }
      if (failures.length > 1) throw new AggregateError(failures, 'Contained command and diagnostic retention failed.');
      throw error;
    }
    assert.ok(
      typeof result.stdout === 'string' && typeof result.stderr === 'string',
      'Contained command must return UTF-8 diagnostic streams.',
    );
    return { ...result, stdout: result.stdout, stderr: result.stderr };
  };

  let prepared: PreparedController;
  try {
    const result = execute(process.execPath, bundle, [driver], Infinity, budget, 'contained package prepare+verify');
    if (result.stderr) process.stderr.write(result.stderr);
    assert.equal(result.status, 0, result.stderr);
    const parsed: unknown = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1) ?? '');
    assert.ok(isPreparedController(parsed), 'Contained controller result has an invalid shape.');
    prepared = parsed;
    assert.equal(prepared.qualification.status, 'pass');
    assert.equal(prepared.qualification.package_binding, prepared.package_binding.digest);
  } catch (error) {
    console.error('Failed contained package preparation retained: ' + root);
    throw error;
  }

  const assertUnchanged = (): void => {
    try {
      assert.equal(developmentControllerBinding(prepared.package_root), prepared.package_binding.digest);
    } catch (error) {
      retained = true;
      throw error;
    }
  };
  const cleanupTimeout = budget.cleanupTimeout();
  if (cleanupTimeout <= 0) {
    retained = true;
    console.error('Contained package cleanup reserve exhausted; retained: ' + root);
    throw new Error('Contained package cleanup requires its existing report-preserving reserve.');
  }

  let closed = false;
  return {
    binding: prepared.package_binding.digest,
    cleanupHookOptions: { timeout: cleanupTimeout },
    assertUnchanged,
    retain(): void {
      retained = true;
    },
    get retained(): boolean {
      return retained;
    },
    run(args: readonly string[], childBudget: ExecutionBudget): ContainedRun {
      assert.equal(retained, false, 'Contained package cannot be reused after drift or unknown child outcome.');
      const result = execute(
        prepared.engine,
        prepared.package_root,
        [path.join(prepared.package_root, 'bin/run.ts'), ...args],
        60000,
        childBudget,
        'contained public run',
      );
      const text = result.status === 0 ? result.stdout : result.stderr;
      const parsed: unknown = JSON.parse(text.trim().split(/\r?\n/).at(-1) ?? '');
      if (!isRecord(parsed)) throw new Error('Contained public run returned a non-object JSON payload.');
      return { ...result, payload: parsed };
    },
    caseBudget(): ExecutionBudget {
      return budget.child(60000);
    },
    async close(): Promise<void> {
      if (closed) return;
      if (retained) {
        console.warn('Contained package and consumer state retained: ' + root);
        return;
      }
      try {
        assert.ok(budget.cleanupTimeout() >= cleanupTimeout, 'Contained package cleanup reserve was spent.');
        assertUnchanged();
        assert.ok(budget.cleanupTimeout() >= cleanupTimeout, 'Contained package binding check spent cleanup reserve.');
      } catch (error) {
        retained = true;
        console.error('Contained package cleanup denied; retained: ' + root);
        throw error;
      }
      // Bun hook timeouts are uncatchable. Keep custody visible before deletion
      // starts, and never retry an interrupted or deferred cleanup.
      retained = true;
      console.warn('Contained package cleanup pending; outcome unknown until completion: ' + root);
      try {
        await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        closed = true;
        retained = false;
        console.warn('Contained package cleanup completed: ' + root);
      } catch (error) {
        if (!isErrnoCode(error, 'EBUSY') && !isErrnoCode(error, 'EPERM')) {
          console.error('Contained package cleanup failed; outcome unknown: ' + root);
          throw error;
        }
        console.warn('Terminal contained package cleanup deferred: ' + root);
      }
    },
  };
}

function isErrnoCode(error: unknown, code: string): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === code;
}
