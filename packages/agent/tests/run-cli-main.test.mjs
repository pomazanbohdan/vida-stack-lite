import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { inspectDevelopmentController } from '../bin/development-controller.mjs';
import { main } from '../bin/run.mjs';
const controllerRoots = new Set();
const controllerUnavailable = 'Development controller root is unavailable.';

function controllerRootFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-development-controller-'));
  controllerRoots.add(root);
  return root;
}

afterEach(() => {
  for (const root of controllerRoots) {
    expect(path.dirname(root)).toBe(path.resolve(tmpdir()));
    expect(path.basename(root).startsWith('vida-development-controller-')).toBe(true);
    rmSync(root, { recursive: true, force: true });
  }
  controllerRoots.clear();
});

async function controllerInspectionFailure(controllerRoot) {
  let failure;
  try {
    await inspectDevelopmentController({ controllerRoot });
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(Error);
  return failure;
}


function io() {
  const logs = [];
  const errors = [];
  return {
    logs,
    errors,
    value: {
      log: (value) => logs.push(value),
      error: (value) => errors.push(value),
    },
  };
}

async function invokeMain(args = [], execute) {
  const output = io();
  const exit = {};
  const options = { isMain: true, args, io: output.value, exit };
  if (execute) options.execute = execute;
  await main(options);
  return { output, exit };
}

const contractNextAction = 'Next action: inspect the exact work and check its issued contract before retrying.';


describe('development controller root diagnostics', () => {
  test('maps an absent physical root to a path-free domain error with ENOENT cause', async () => {
    const parent = controllerRootFixture();
    const root = path.join(parent, 'absent-root');
    const failure = await controllerInspectionFailure(root);
    expect(failure.message).toBe(controllerUnavailable);
    expect(failure.cause).toBeInstanceOf(Error);
    expect(failure.cause.code).toBe('ENOENT');
    expect(existsSync(root)).toBe(false);
  });

  test('maps a dangling controller link to the same domain error with ENOENT cause', async () => {
    const parent = controllerRootFixture();
    const target = path.join(parent, 'dangling-target');
    const root = path.join(parent, 'dangling-root');
    mkdirSync(target);
    symlinkSync(target, root, process.platform === 'win32' ? 'junction' : 'dir');
    rmSync(target, { recursive: true, force: true });
    expect(lstatSync(root).isSymbolicLink()).toBe(true);
    const failure = await controllerInspectionFailure(root);
    expect(failure.message).toBe(controllerUnavailable);
    expect(failure.cause).toBeInstanceOf(Error);
    expect(failure.cause.code).toBe('ENOENT');
  });

  test('keeps a later missing controller.json failure as its original ENOENT', async () => {
    const parent = controllerRootFixture();
    const root = path.join(parent, 'physical-controller-root');
    mkdirSync(root);
    const failure = await controllerInspectionFailure(root);
    expect(failure.code).toBe('ENOENT');
    expect(failure.message).not.toBe(controllerUnavailable);
    expect(failure.cause).toBeUndefined();
  });

  test('keeps regular-file controller roots as fail-closed path denials', async () => {
    const parent = controllerRootFixture();
    const root = path.join(parent, 'controller-file');
    writeFileSync(root, 'owned fixture');
    expect(lstatSync(root).isFile()).toBe(true);
    const failure = await controllerInspectionFailure(root);
    expect(failure.message).toBe('Controller path contains a linked directory.');
    expect(failure.code).toBeUndefined();
    expect(failure.cause).toBeUndefined();
  });

  test('keeps noncanonical controller paths as fail-closed path denials', async () => {
    const parent = controllerRootFixture();
    const physicalRoot = path.join(parent, 'physical-controller-root');
    mkdirSync(physicalRoot);
    const root = physicalRoot + path.sep + '..' + path.sep + path.basename(physicalRoot);
    expect(path.resolve(root)).not.toBe(root);
    const failure = await controllerInspectionFailure(root);
    expect(failure.message).toBe('Controller paths must be canonical absolute physical directories.');
    expect(failure.code).toBeUndefined();
    expect(failure.cause).toBeUndefined();
  });

  test('keeps an existing link or junction to a physical root as a fail-closed denial', async () => {
    const parent = controllerRootFixture();
    const target = path.join(parent, 'physical-target');
    const root = path.join(parent, 'linked-controller-root');
    mkdirSync(target);
    symlinkSync(target, root, process.platform === 'win32' ? 'junction' : 'dir');
    expect(lstatSync(root).isSymbolicLink()).toBe(true);
    const failure = await controllerInspectionFailure(root);
    expect(failure.message).toBe('Controller paths must be canonical absolute physical directories.');
    expect(failure.code).toBeUndefined();
    expect(failure.cause).toBeUndefined();
  });

  test('reports the exact blocked absent-root envelope through one Source CLI child', () => {
    const parent = controllerRootFixture();
    const root = path.join(parent, 'absent-cli-root');
    const entrypoint = path.resolve(import.meta.dirname, '../bin/development-controller.mjs');
    const result = spawnSync(
      process.execPath,
      ['--no-env-file', '--no-install', entrypoint, 'inspect', '--controller-root', root],
      { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.signal).toBeNull();
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr.trim())).toEqual({
      status: 'blocked',
      code: 'GAP-DEVELOPMENT-CONTROLLER-001',
      message: controllerUnavailable,
    });
    expect(existsSync(root)).toBe(false);
  });
});

describe('vida-agent run CLI main', () => {
  test('does nothing when imported', async () => {
    let executed = false;
    await main({
      isMain: false,
      execute: async () => {
        executed = true;
      },
    });
    expect(executed).toBe(false);
  });

  test('writes object results as JSON', async () => {
    const output = io();
    const exit = {};
    await main({ isMain: true, args: ['--value'], io: output.value, exit, execute: async (args) => ({ args }) });
    expect(output.logs).toEqual(['{"args":["--value"]}']);
    expect(output.errors).toEqual([]);
    expect(exit.exitCode).toBeUndefined();
  });

  test('uses an integer result as the process exit code', async () => {
    const output = io();
    const exit = {};
    await main({ isMain: true, io: output.value, exit, execute: async () => 23 });
    expect(exit.exitCode).toBe(23);
    expect(output.logs).toEqual([]);
    expect(output.errors).toEqual([]);
  });

  test('maps known failures to public error output', async () => {
    const failure = Object.assign(new Error('private details'), { code: 'GAP-VIDA-RUN-CLI-001' });
    const { output, exit } = await invokeMain([], async () => {
      throw failure;
    });
    expect(output.errors).toEqual([
      JSON.stringify({
        schema: 'VidaAgentRunResult/v1',
        status: 'blocked',
        code: 'GAP-VIDA-RUN-CLI-001',
        message: `Launcher arguments are incomplete or contain an unsupported option. ${contractNextAction}`,
      }),
    ]);
    expect(output.logs).toEqual([]);
    expect(exit.exitCode).toBe(1);
  });

  test('uses the real default run parser for an unsupported option', async () => {
    const { output, exit } = await invokeMain(['--invalid-ci-option']);
    expect(output.errors).toEqual([
      JSON.stringify({
        schema: 'VidaAgentRunResult/v1',
        status: 'blocked',
        code: 'GAP-VIDA-RUN-CLI-001',
        message: `Launcher arguments are incomplete or contain an unsupported option. ${contractNextAction}`,
      }),
    ]);
    expect(output.logs).toEqual([]);
    expect(exit.exitCode).toBe(1);
  });

  test('recognized CLI codes take precedence over misleading lifecycle wording', async () => {
    const cliContracts = [
      ['GAP-VIDA-RUN-CLI-001', 'Launcher arguments are incomplete or contain an unsupported option.'],
      ['GAP-VIDA-RUN-CLI-002', 'The project root is not a canonical absolute path.'],
      ['GAP-VIDA-RUN-CLI-003', 'Repository and project must be valid lowercase identifiers.'],
      ['GAP-VIDA-RUN-CLI-004', 'The project root is unavailable or is not a canonical directory.'],
    ];
    for (const [code, publicMessage] of cliContracts) {
      const failure = Object.assign(
        new Error('ownership lease expired; CAS revision changed; runtime source changed'),
        { code },
      );
      const { output, exit } = await invokeMain([], async () => {
        throw failure;
      });
      expect(output.errors).toEqual([
        JSON.stringify({
          schema: 'VidaAgentRunResult/v1',
          status: 'blocked',
          code,
          message: `${publicMessage} ${contractNextAction}`,
        }),
      ]);
      expect(output.logs).toEqual([]);
      expect(exit.exitCode).toBe(1);
    }
  });

  test('retains exact runtime lease, CAS and source diagnostics', async () => {
    const controls = [
      {
        message: 'Expired lease recovery admitted work or selection differs.',
        code: 'GAP-VIDA-RUN-CONTEXT-001',
        expected:
          'Phase: lease recovery. Reason: ownership lease expired. Next action: Inspect the work and recover its exact expired lease before continuing.',
      },
      {
        message: 'Historical frozen configuration/engine/evidence or Work/Ledger/Journal/maintenance CAS changed',
        expected:
          'Phase: state validation. Reason: current state revision changed. Next action: Inspect the work and retry the uncommitted operation with its returned state version.',
      },
      {
        message: 'Admitted runtime code changed; an exact forward-bound rebind is required before issue.',
        code: 'GAP-VIDA-RUN-CONTEXT-001',
        expected:
          'Phase: source validation. Reason: bound source changed. Next action: Inspect the work and use the supported current-source continuation or recovery operation.',
      },
    ];
    for (const control of controls) {
      const failure = Object.assign(new Error(control.message), control.code ? { code: control.code } : {});
      const { output, exit } = await invokeMain([], async () => {
        throw failure;
      });
      expect(output.errors).toEqual([
        JSON.stringify({
          schema: 'VidaAgentRunResult/v1',
          status: 'blocked',
          code: control.code ?? 'GAP-VIDA-RUN-EXECUTION-001',
          message: control.expected,
        }),
      ]);
      expect(output.logs).toEqual([]);
      expect(exit.exitCode).toBe(1);
    }
  });

  test('maps unknown failures to the stable fallback', async () => {
    const { output, exit } = await invokeMain([], async () => {
      throw new Error('private details');
    });
    expect(output.errors).toEqual([
      JSON.stringify({
        schema: 'VidaAgentRunResult/v1',
        status: 'blocked',
        code: 'GAP-VIDA-RUN-EXECUTION-001',
        message: `The requested run was blocked by runtime validation. ${contractNextAction}`,
      }),
    ]);
    expect(output.logs).toEqual([]);
    expect(exit.exitCode).toBe(1);
  });
});
