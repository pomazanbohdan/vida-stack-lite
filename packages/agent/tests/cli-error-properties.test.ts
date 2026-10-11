import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readCliErrorProperty } from '../bin/cli-error-properties.ts';
import { standaloneDiscoveryFiles } from '../bin/cli-metadata.ts';
import { pinnedEnvironment } from '../bin/bun.ts';
import { runBoundedSubprocess } from './helpers/bounded-subprocess.ts';

test('documentation-clear reports a callable rejection message through its actual CLI entrypoint', async () => {
  const packageRoot = fileURLToPath(new URL('../', import.meta.url));
  const entrypoint = fileURLToPath(new URL('../bin/documentation-clear.ts', import.meta.url));
  const clearModule = fileURLToPath(new URL('../src/documentation/clear.ts', import.meta.url));
  const script = `
    import { mock } from 'bun:test';
    mock.module(${JSON.stringify(clearModule)}, () => ({
      executeDocumentationClearFromWork: async () => {
        throw Object.assign(() => undefined, { message: 'controlled callable failure' });
      },
    }));
    process.argv[1] = ${JSON.stringify(entrypoint)};
    process.argv.splice(2, process.argv.length - 2,
      '--mode', 'baseline',
      '--project-root', ${JSON.stringify(packageRoot)},
      '--repository', 'example',
      '--project', 'agent',
      '--work-id', 'controlled-work',
      '--source-revision', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    await import(${JSON.stringify(entrypoint)});
  `;
  const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', '--eval', script], {
    cwd: packageRoot,
    env: pinnedEnvironment(process.execPath, process.env, packageRoot),
    timeoutMs: 3000,
  });

  expect(result.closeObserved).toBe(true);
  expect(result.exitCode).toBe(1);
  expect(result.signal).toBeNull();
  expect(result.childError).toBeNull();
  expect(result.timedOut).toBe(false);
  expect(result.stdout.toString()).toBe('');
  expect(result.stderr.toString()).toBe('controlled callable failure\n');
  expect(result.stdoutTruncated).toBe(false);
  expect(result.stderrTruncated).toBe(false);
});

test('caught error property reading denies primitives and preserves missing values', () => {
  for (const value of [null, undefined, false, true, 0, NaN, 1n, '', 'message', Symbol('message')]) {
    expect(readCliErrorProperty(value, 'message')).toBeUndefined();
  }
  expect(readCliErrorProperty({}, 'message')).toBeUndefined();
});

test('caught error property reading preserves own, inherited and callable values', () => {
  const inherited = { message: 'inherited' };
  const own = Object.create(inherited) as { message: string; exitCode?: number };
  own.exitCode = 9;
  const callable = Object.assign(() => undefined, { code: 'CALLABLE' });
  expect(readCliErrorProperty(own, 'message')).toBe('inherited');
  expect(readCliErrorProperty(own, 'exitCode')).toBe(9);
  expect(readCliErrorProperty(callable, 'code')).toBe('CALLABLE');
});

test('caught error property reading invokes a getter once with its original receiver', () => {
  let calls = 0;
  const value = {
    get message() {
      calls += 1;
      expect(this).toBe(value);
      return 'getter message';
    },
  };
  expect(readCliErrorProperty(value, 'message')).toBe('getter message');
  expect(calls).toBe(1);
});

test('caught error property reading preserves proxy target, key, receiver and return identity', () => {
  const target = {};
  const result = {};
  const calls: unknown[][] = [];
  const proxy = new Proxy(target, {
    get(actualTarget, key, receiver) {
      calls.push([actualTarget, key, receiver]);
      return result;
    },
  });
  expect(readCliErrorProperty(proxy, 'code')).toBe(result);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.[0]).toBe(target);
  expect(calls[0]?.[1]).toBe('code');
  expect(calls[0]?.[2]).toBe(proxy);
});

test('caught error property reading propagates getter and proxy failures by identity', () => {
  const sentinel = new Error('property denied');
  for (const value of [
    {
      get message() {
        throw sentinel;
      },
    },
    new Proxy(
      {},
      {
        get() {
          throw sentinel;
        },
      },
    ),
  ]) {
    let observed: unknown;
    try {
      readCliErrorProperty(value, 'message');
    } catch (error) {
      observed = error;
    }
    expect(observed).toBe(sentinel);
  }
});

test('caught error TS helper is included in the actual package and standalone discovery', () => {
  const manifest: unknown = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  expect(manifest).toHaveProperty('files');
  const files: unknown = Reflect.get(Object(manifest), 'files');
  expect(files).toContain('bin/cli-error-properties.ts');
  expect(files).not.toContain('bin/cli-error-properties.mjs');
  expect(standaloneDiscoveryFiles).toContain('bin/cli-error-properties.ts');
  expect(standaloneDiscoveryFiles).not.toContain('bin/cli-error-properties.mjs');
});
