import { test, expect } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { boundedSpawnSync, executionBudget, requireTerminalCommand } from '../bin/bun.ts';
import { requireSynchronousChildSuccess } from './helpers/synchronous-child-outcome.ts';

function readTimingEvent(json: string): { schema: unknown; operation: unknown; outcome: unknown } {
  const value = JSON.parse(json) as unknown;
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schema' in value) ||
    !('operation' in value) ||
    !('outcome' in value)
  )
    throw new Error('runtime timing event shape is invalid');
  return value;
}

test('default runtime timing preserves strict public JSON stdout and emits telemetry on stderr', () => {
  const module = new URL('../src/runtime-timing.js', import.meta.url).href;
  const child = boundedSpawnSync(
    spawnSync,
    process.execPath,
    [
      '--eval',
      `import { invokeTimed } from ${JSON.stringify(module)}; await invokeTimed('createRuntimeKernel', () => 7); await new Promise(resolve => setTimeout(resolve, 0)); console.log(JSON.stringify({status:'pass'}));`,
    ],
    { encoding: 'utf8', env: process.env, budget: executionBudget(4_000, 250), timeout: 4_000 },
    'default runtime timing output',
  );
  requireTerminalCommand(child, 'default runtime timing output');
  requireSynchronousChildSuccess(child, '{"status":"pass"}');
  if (typeof child.stdout !== 'string' || typeof child.stderr !== 'string')
    throw new Error('Runtime timing child UTF-8 output is unavailable.');
  expect(JSON.parse(child.stdout)).toEqual({ status: 'pass' });
  expect(child.stderr).toContain('runtime call: ');
  const event = readTimingEvent(child.stderr.trim().replace(/^runtime call: /, ''));
  expect(event.schema).toBe('RuntimeTiming/v1');
  expect(event.operation).toBe('createRuntimeKernel');
  expect(event.outcome).toBe('success');
});
