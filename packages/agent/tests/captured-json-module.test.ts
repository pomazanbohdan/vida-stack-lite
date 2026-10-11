import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { capturedJsonModule } from '../tooling/captured-json-module.js';

const cases = [
  ['object', '{"value":2,"kebab-key":"k","1":4,"default":"nested","__proto__":{"unsafe":true},"__esModule":"owned"}'],
  ['object-marker', '{"__esModule":true,"value":3}'],
  ['array', '[1,2]'],
  ['number', '7'],
  ['boolean', 'false'],
  ['string', '"text"'],
  ['null', 'null'],
] as const;

let privateDirectory = '';
const nativeDirectory = () => join(privateDirectory, 'native');
const capturedDirectory = () => join(privateDirectory, 'captured');
const capturedPaths = new Set<string>();

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.*]/gu, '\\$&');
}

beforeAll(() => {
  // Native and captured files use identical immutable bytes and live outside
  // the package/coverage root, so the native side uses Bun's built-in loader.
  privateDirectory = mkdtempSync(join(tmpdir(), 'vida-captured-json-parity-'));
  for (const directory of [nativeDirectory(), capturedDirectory()]) {
    mkdirSync(directory, { mode: 0o700 });
    for (const [name, source] of cases) {
      const file = join(directory, `${name}.json`);
      writeFileSync(file, source, { flag: 'wx', mode: 0o600 });
      if (directory === capturedDirectory()) capturedPaths.add(file);
    }
  }

  const exactCapturedFilePattern = new RegExp(`^(?:${[...capturedPaths].map(escapeRegExp).join('|')})$`, 'u');
  Bun.plugin({
    name: `private-captured-json-parity-${privateDirectory.slice(-12)}`,
    setup(build) {
      build.onLoad({ filter: exactCapturedFilePattern }, ({ path }) => capturedJsonModule(readFileSync(path)));
    },
  });
});

afterAll(() => {
  // Leave the plugin registered: its nonce-specific exact-path filter becomes
  // inert after these owned files are removed and cannot clear other plugins.
  if (privateDirectory) rmSync(privateDirectory, { recursive: true, force: true });
});

async function importJson(directory: string, name: string): Promise<Record<string, unknown>> {
  const path = join(directory, `${name}.json`);
  return (await import(pathToFileURL(path).href, { with: { type: 'json' } })) as Record<string, unknown>;
}

function namespaceValues(namespace: Record<string, unknown>) {
  return Object.fromEntries(
    Object.keys(namespace)
      .sort()
      .map((key) => [key, namespace[key]]),
  );
}

describe('captured JSON runtime-object parity', () => {
  test.each(cases.map(([name]) => name))('%s namespace matches native JSON import', async (name) => {
    const [nativeNamespace, capturedNamespace] = await Promise.all([
      importJson(nativeDirectory(), name),
      importJson(capturedDirectory(), name),
    ]);
    expect(namespaceValues(capturedNamespace)).toEqual(namespaceValues(nativeNamespace));
  });

  test('object default collision and __proto__ remain data without unsafe evaluation', async () => {
    const captured = await importJson(capturedDirectory(), 'object');
    expect(captured.default).toEqual(
      JSON.parse(
        '{"value":2,"kebab-key":"k","1":4,"default":"nested","__proto__":{"unsafe":true},"__esModule":"owned"}',
      ),
    );
    expect(captured.default).toHaveProperty('default', 'nested');
    expect(Object.hasOwn(captured.default as object, '__proto__')).toBe(true);
    expect(captured['__proto__']).toEqual({ unsafe: true });
    expect(captured.__esModule).toBe('owned');
  });

  test('invalid JSON and invalid UTF-8 fail closed', () => {
    expect(() => capturedJsonModule(new TextEncoder().encode('{"broken":}'))).toThrow(SyntaxError);
    expect(() => capturedJsonModule(Uint8Array.of(0xff, 0xfe))).toThrow(TypeError);
  });
});
