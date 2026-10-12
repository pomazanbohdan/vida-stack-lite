import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { capturedModuleContents } from '../tooling/captured-module-contents.js';
import { capturedModuleRequestPath } from '../tooling/bun-coverage-evidence.ts';

const value = 'unicode-é東京 🧪';
let directory = '';
const capturedFiles = new Map<string, 'js' | 'ts'>();

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'vida-captured-text-'));
  for (const surface of ['native', 'captured']) {
    mkdirSync(join(directory, surface), { mode: 0o700 });
    for (const loader of ['js', 'ts'] as const) {
      const file = join(directory, surface, 'value.' + loader);
      writeFileSync(file, 'export default ' + JSON.stringify(value) + ';\n', { flag: 'wx', mode: 0o600 });
      if (surface === 'captured') capturedFiles.set(file, loader);
    }
  }
  const paths = [...capturedFiles.keys()].map((file) => file.replace(/[|\\{}()[\]^$+?.*]/gu, '\\$&'));
  Bun.plugin({
    name: 'private-captured-text-' + directory.slice(-12),
    setup(build) {
      build.onLoad({ filter: new RegExp('^(?:' + paths.join('|') + ')$', 'u') }, ({ path }) => {
        const loader = capturedFiles.get(path);
        if (!loader) throw new Error('Captured text fixture path is not owned.');
        return { loader, contents: capturedModuleContents(readFileSync(path), loader) };
      });
    },
  });
});

afterAll(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
});

for (const loader of ['js', 'ts'] as const) {
  test(loader + ' captured module preserves native UTF-8 exports', async () => {
    const native: unknown = await import(pathToFileURL(join(directory, 'native', 'value.' + loader)).href);
    const captured: unknown = await import(pathToFileURL(join(directory, 'captured', 'value.' + loader)).href);
    expect(captured).toEqual(native);
    expect(captured).toHaveProperty('default', value);
  });
}

test('malformed UTF-8 is rejected before parsing captured text', () => {
  expect(() => capturedModuleContents(Uint8Array.of(0xff), 'js')).toThrow(TypeError);
});

test('binary modules retain their exact byte buffer', () => {
  const bytes = Uint8Array.of(0xff, 0x00, 0xfe);
  for (const loader of ['file', 'napi', 'wasm'] as const) expect(capturedModuleContents(bytes, loader)).toBe(bytes);
});

test.each([
  ['/src/file.ts', '/src/file.ts'],
  ['/src/file.ts?fresh=1', '/src/file.ts'],
  ['/src/file.ts?fresh=1?extra', '/src/file.ts'],
  ['/src/file.ts?fresh=1/../other.ts', '/src/file.ts'],
  ['/src/file.ts?literal', '/src/file.ts?literal'],
  ['/src/file.ts?literal?fresh=1', '/src/file.ts?literal'],
  ['/src/file.ts#literal', '/src/file.ts#literal'],
  ['/src/file.ts#fresh', '/src/file.ts#fresh'],
  ['/src/file%3Fname.ts?fresh=1', '/src/file%3Fname.ts'],
  ['/src/file?name.ts?fresh=1', '/src/file?name.ts?fresh=1'],
  ['/src/unbound.ts?fresh=1', '/src/unbound.ts?fresh=1'],
  ['?unbound', '?unbound'],
  ['C:\\src\\file.ts?fresh=1', 'C:\\src\\file.ts'],
  ['C:\\src\\file.ts?fresh=1\\..\\other.ts', 'C:\\src\\file.ts'],
] as const)('captured request preserves custody for %s', (request, expected) => {
  const captured = new Set([
    '/src/file.ts',
    '/src/file.ts?literal',
    '/src/file.ts#literal',
    '/src/file%3Fname.ts',
    'C:\\src\\file.ts',
  ]);
  expect(capturedModuleRequestPath(request, captured)).toBe(expected);
});
