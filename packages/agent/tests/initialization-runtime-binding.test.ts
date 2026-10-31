import { expect, spyOn, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureInitializationRuntimeBinding, prepareInitializationUnderAdmission } from '../bin/init-core.ts';
import * as runtimeConfig from '../src/config/runtime-config.ts';
import * as safeAccess from '../src/config/safe-repository-access.ts';
import { withExclusiveInitConfigAdmission } from '../src/config/storage-read-admission.ts';
import { CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH } from '../src/config/project-paths.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-init-binding-')));
  const request = {
    projectRoot: root,
    repository: 'binding-repo',
    projectMappings: ['agent=agent', 'codex=codex', 'powers=powers'],
  };
  return { root, request };
}

test('captures only package facts before consumer targets exist', () => {
  const { root } = fixture();
  const before = readdirSync(root);
  const binding = captureInitializationRuntimeBinding();
  expect(Object.isFrozen(binding)).toBe(true);
  expect(binding.version).toMatch(/^\d+\.\d+\.\d+/);
  expect(binding.resource_digest).toMatch(/^[a-f0-9]{64}$/);
  expect(binding.bundle_identity.length).toBeGreaterThan(0);
  expect(existsSync(path.join(root, 'codex'))).toBe(false);
  expect(readdirSync(root)).toEqual(before);
});

test('fresh gate preparation binds the same executing package facts', async () => {
  const { root, request } = fixture();
  const binding = captureInitializationRuntimeBinding();
  for (const directory of ['.agent', 'agent', 'codex', 'powers']) mkdirSync(path.join(root, directory));
  const workspace = deriveWorkspaceId(request.repository, root);
  const clean =
    JSON.stringify({
      schema: 'ConsumerCleanInitializationOperation/v1',
      version: 1,
      phase: 'initializing',
      operation_id: 'test',
      root,
      workspace_id: workspace,
    }) + '\n';
  writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), clean);
  await withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
    const before = readdirSync(path.join(root, '.agent')).sort();
    const prepared = prepareInitializationUnderAdmission(proof, request, hash(clean));
    expect(prepared.resourceDigest).toBe(binding.resource_digest);
    expect(prepared.bundleIdentity).toBe(binding.bundle_identity);
    expect(readdirSync(path.join(root, '.agent')).sort()).toEqual(before);
  });
});

test.each(['templates/AGENTS.template.md', 'package.json'])(
  'rejects a stale immutable %s without modifying the package',
  (resource) => {
    const original = runtimeConfig.readRuntimePackageResourceBytes;
    const originalAccess = safeAccess.requireSafeRepositoryAccess;
    let altered = 0;
    let unsafeCalls = 0;
    const unsafe = new Set([
      'prepareExclusiveCreation',
      'ensureDirectory',
      'ensureDirectoryAsync',
      'writeExclusive',
      'writeExclusiveAsync',
      'writeExclusiveAtomicAsync',
      'writeExclusiveBytesAsync',
      'replaceAtomic',
      'replaceAtomicAsync',
      'removeFile',
      'moveNoReplaceAsync',
      'moveLargeFileNoReplace',
      'moveDirectoryNoReplaceAsync',
      'withExclusiveLock',
      'withExclusiveLockAsync',
      'compareReserveReplace',
    ]);
    const accessSpy = spyOn(safeAccess, 'requireSafeRepositoryAccess').mockImplementation((target) => {
      const access = originalAccess(target);
      if (path.resolve(target) !== packageRoot) return access;
      return new Proxy(access, {
        get(object, property, receiver) {
          if (typeof property === 'string' && unsafe.has(property))
            return () => {
              unsafeCalls++;
              throw new Error('unsafe test call');
            };
          const observed: unknown = Reflect.get(object, property, receiver);
          return observed;
        },
      });
    });
    const spy = spyOn(runtimeConfig, 'readRuntimePackageResourceBytes').mockImplementation(
      (access, target, label, maxBytes) => {
        const bytes = original(access, target, label, maxBytes);
        if (target !== resource || label !== 'initialization resource') return bytes;
        altered++;
        return Buffer.concat([bytes, Buffer.from('\n')]);
      },
    );
    try {
      expect(() => captureInitializationRuntimeBinding()).toThrow('Executing initialization resource changed');
      expect(altered).toBe(1);
      expect(unsafeCalls).toBe(0);
    } finally {
      spy.mockRestore();
      accessSpy.mockRestore();
    }
  },
);

test('prepared route rejects a package directory identity drift before publishing', async () => {
  const { root, request } = fixture();
  for (const directory of ['.agent', 'agent', 'codex', 'powers']) mkdirSync(path.join(root, directory));
  const workspace = deriveWorkspaceId(request.repository, root);
  const clean =
    JSON.stringify({
      schema: 'ConsumerCleanInitializationOperation/v1',
      version: 1,
      phase: 'initializing',
      operation_id: 'test',
      root,
      workspace_id: workspace,
    }) + '\n';
  writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), clean);
  await withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
    const before = readdirSync(path.join(root, '.agent')).sort();
    const original = safeAccess.requireSafeRepositoryAccess;
    let packageIdentities = 0;
    const spy = spyOn(safeAccess, 'requireSafeRepositoryAccess').mockImplementation((target) => {
      const access = original(target);
      if (path.resolve(target) !== packageRoot) return access;
      return {
        ...access,
        directoryIdentity(name, label) {
          const identity = access.directoryIdentity(name, label);
          if (name === '.' && label === 'runtime package' && ++packageIdentities === 2) return identity + '-drift';
          return identity;
        },
      };
    });
    try {
      expect(() => prepareInitializationUnderAdmission(proof, request, hash(clean))).toThrow(
        'Executing initialization package changed',
      );
      expect(packageIdentities).toBe(2);
      expect(readdirSync(path.join(root, '.agent')).sort()).toEqual(before);
      expect(existsSync(path.join(root, '.agent', 'runtime-initialization.pending.v1.json'))).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
