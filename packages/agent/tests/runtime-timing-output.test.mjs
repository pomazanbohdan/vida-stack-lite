import { test, expect } from 'bun:test';
import { spawnSync } from 'node:child_process';

test('default runtime timing preserves strict public JSON stdout and emits telemetry on stderr', () => {
  const module = new URL('../src/runtime-timing.ts', import.meta.url).href;
  const child = spawnSync(
    process.execPath,
    [
      '--eval',
      `import { invokeTimed } from ${JSON.stringify(module)}; await invokeTimed('createRuntimeKernel', () => 7); await new Promise(resolve => setTimeout(resolve, 0)); console.log(JSON.stringify({status:'pass'}));`,
    ],
    { encoding: 'utf8', env: process.env },
  );
  expect(child.status).toBe(0);
  expect(JSON.parse(child.stdout)).toEqual({ status: 'pass' });
  expect(child.stderr).toContain('runtime call: ');
  const event = JSON.parse(child.stderr.trim().replace(/^runtime call: /, ''));
  expect(event.schema).toBe('RuntimeTiming/v1');
  expect(event.operation).toBe('createRuntimeKernel');
  expect(event.outcome).toBe('success');
});
