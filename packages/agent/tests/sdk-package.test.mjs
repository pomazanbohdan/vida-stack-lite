import { afterEach, expect, test } from 'bun:test';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { packSdkCompatibility, sdkCompatibilityManifest, verifySdkPackage } from '../tooling/pack-sdk.mjs';

const source = path.resolve(import.meta.dirname, '..');
const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'vida-sdk-test-'));
  roots.push(temporary);
  const root = path.join(temporary, 'bundle');
  cpSync(source, root, {
    recursive: true,
    filter(file) {
      const relative = path.relative(source, file).replaceAll('\\', '/');
      return (
        !['node_modules', '.tmp', '.agent', 'coverage', '.pack-inspect'].includes(relative.split('/')[0]) &&
        relative !== 'dist/standalone' &&
        !relative.startsWith('dist/standalone/')
      );
    },
  });
  symlinkSync(
    path.join(source, 'node_modules'),
    path.join(root, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  return { root, destination: path.join(temporary, 'archives') };
}

test('SDK manifest projection is deterministic, idempotent and retains public compatibility targets', () => {
  const { root } = fixture();
  const original = readFileSync(path.join(root, 'package.json'));
  const first = sdkCompatibilityManifest({ root });
  expect(first.value.exports).toEqual(JSON.parse(original).exports);
  expect(first.value.bin).toEqual(JSON.parse(original).bin);
  expect(first.value.files).not.toContain('dist/standalone/**');
  expect(first.value.files).not.toContain('!dist/standalone/**');
  expect(first.value.scripts.prepack).toBe('node bin/bun.mjs tooling/pack-sdk.mjs --verify');
  expect(readFileSync(path.join(root, 'package.json'))).toEqual(original);
  writeFileSync(path.join(root, 'package.json'), first.bytes);
  expect(sdkCompatibilityManifest({ root }).bytes).toEqual(first.bytes);
  for (const entry of ['dist/standalone/**', '!dist/standalone/**']) {
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ ...first.value, files: [...first.value.files, entry] }),
    );
    expect(() => sdkCompatibilityManifest({ root })).toThrow(
      'SDK manifest must not declare unavailable standalone package files',
    );
  }
});

test('SDK validation rejects missing declarations, resources and changed portable frozen lock', async () => {
  const { root } = fixture();
  const declaration = path.join(root, 'dist/src/index.d.ts');
  const original = readFileSync(declaration);
  unlinkSync(declaration);
  await expect(verifySdkPackage({ root })).rejects.toThrow();
  writeFileSync(declaration, original);
  writeFileSync(path.join(root, 'dist/portable/bun.lock'), '{}');
  await expect(verifySdkPackage({ root })).rejects.toThrow('portable frozen lock differs');
  cpSync(path.join(root, 'bun.lock'), path.join(root, 'dist/portable/bun.lock'));
  unlinkSync(path.join(root, 'templates/AGENTS.template.md'));
  await expect(verifySdkPackage({ root })).rejects.toThrow();
});

test('SDK-only pack runs its real prepack without native assets and preserves all other payload bytes', async () => {
  const { root, destination } = fixture();
  const before = readFileSync(path.join(root, 'package.json'));
  expect(existsSync(path.join(root, 'dist/standalone'))).toBe(false);
  const result = await packSdkCompatibility({ root, destination });
  expect(existsSync(result.archive)).toBe(true);
  expect(result.metadata[0].files.some((file) => file.path.startsWith('dist/standalone/'))).toBe(false);
  expect(result.metadata[0].files.some((file) => file.path === 'tooling/pack-sdk.mjs')).toBe(true);
  expect(result.manifest.bytes).toEqual(sdkCompatibilityManifest({ root }).bytes);
  expect(readFileSync(path.join(root, 'package.json'))).toEqual(before);
  await expect(packSdkCompatibility({ root, destination })).rejects.toThrow('destination already exists');
}, 180_000);
