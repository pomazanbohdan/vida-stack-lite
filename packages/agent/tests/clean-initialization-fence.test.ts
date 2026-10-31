import { expect, spyOn, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import { applyConsumerConfiguration, resumeConsumerConfiguration } from '../bin/consumer-configuration-operation.ts';
import { captureConsumerConfiguration } from '../bin/init-configuration.ts';
import { assertLoadedRuntimeConfig, loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH } from '../src/config/project-paths.ts';
import {
  acquireStorageReadAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openDatabaseWithStorageAdmission,
  openExistingWorkspaceDatabaseWithAdmission,
} from '../src/config/storage-read-admission.ts';
import * as rawDatabase from '../src/config/workspace-database-raw.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { bindRuntimeInitialization } from '../src/runtime-initialization.ts';
import { bindProjectInitialization } from '../src/config/project-initialization-binding.ts';

test('clean marker fences authorized configuration and both database opener paths', async () => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-fence-')));
  const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const request = { projectRoot: root, repository: 'fence-repo', projectMappings: ['one=one'] };
  mkdirSync(path.join(root, 'one'));
  await initializeProjectFromBundle(request, bundle);
  const config = loadRuntimeConfig(root);
  const plan = captureConsumerConfiguration(request).plan;
  const workspace = deriveWorkspaceId(request.repository, root);
  const database = openHostStateDatabase(root, '.vida/binder.sqlite', workspace);
  const store = new HostStateStore(database, workspace);
  closeWorkspaceDatabaseWithAdmission(database);
  const marker = path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH);
  const configBefore = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'));
  const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
  const receiptBefore = readFileSync(receiptPath);
  writeFileSync(marker, 'opaque foreign marker');
  let calls = 0;
  try {
    expect(() => assertLoadedRuntimeConfig(config, root)).toThrow('Clean initialization is pending');
    await Promise.resolve(
      expect(bindRuntimeInitialization(root, store)).rejects.toThrow('Clean initialization is pending'),
    );
    await Promise.resolve(
      expect(bindProjectInitialization(root, store)).rejects.toThrow('Clean initialization is pending'),
    );
    expect(readFileSync(receiptPath)).toEqual(receiptBefore);
    expect(existsSync(path.join(root, '.vida/runtime-initialization.v2.json'))).toBe(false);
    await Promise.resolve(
      expect(initializeProjectFromBundle(request, bundle)).rejects.toThrow('Clean initialization is pending'),
    );
    await Promise.resolve(
      expect(applyConsumerConfiguration(request, plan.binding, plan.operation_id)).rejects.toThrow(
        'Clean initialization is pending',
      ),
    );
    await Promise.resolve(
      expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow(
        'Clean initialization is pending',
      ),
    );
    expect(() =>
      openDatabaseWithStorageAdmission(root, workspace, '.vida/create.sqlite', () => {
        calls++;
        throw new Error('must not open');
      }),
    ).toThrow('Clean initialization is pending');
    expect(calls).toBe(0);
    const lease = acquireStorageReadAdmission(root, workspace, '.vida/existing.sqlite');
    const openSpy = spyOn(rawDatabase, 'openUnadmittedWorkspaceDatabase');
    try {
      expect(() => openExistingWorkspaceDatabaseWithAdmission(root, '.vida/existing.sqlite', lease, false)).toThrow(
        'Clean initialization is pending',
      );
      expect(openSpy).toHaveBeenCalledTimes(0);
    } finally {
      openSpy.mockRestore();
    }
    expect(existsSync(path.join(root, '.vida/create.sqlite'))).toBe(false);
    expect(readFileSync(marker, 'utf8')).toBe('opaque foreign marker');
    expect(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(configBefore);
  } finally {
    console.info('Retained clean-fence fixture: ' + root);
  }
}, 30_000);
