import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { readCliErrorProperty } from '../bin/cli-error-properties.ts';
import { standaloneDiscoveryFiles } from '../bin/cli-metadata.ts';

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
