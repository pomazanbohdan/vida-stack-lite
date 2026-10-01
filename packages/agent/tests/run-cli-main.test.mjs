import { describe, expect, test } from 'bun:test';
import { main } from '../bin/run.mjs';

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
    const output = io();
    const exit = {};
    const failure = Object.assign(new Error('private details'), { code: 'GAP-VIDA-RUN-CLI-001' });
    await main({
      isMain: true,
      io: output.value,
      exit,
      execute: async () => {
        throw failure;
      },
    });
    expect(JSON.parse(output.errors[0])).toEqual({
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-CLI-001',
      message:
        'Launcher arguments are incomplete or contain an unsupported option. Next action: inspect the exact work and check its issued contract before retrying.',
    });
    expect(exit.exitCode).toBe(1);
  });

  test('maps unknown failures to the stable fallback', async () => {
    const output = io();
    const exit = {};
    await main({
      isMain: true,
      io: output.value,
      exit,
      execute: async () => {
        throw new Error('private details');
      },
    });
    expect(JSON.parse(output.errors[0])).toEqual({
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-EXECUTION-001',
      message:
        'The requested run was blocked by runtime validation. Next action: inspect the exact work and check its issued contract before retrying.',
    });
    expect(exit.exitCode).toBe(1);
  });
});
