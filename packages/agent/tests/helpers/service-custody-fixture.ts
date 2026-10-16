import { Database } from 'bun:sqlite';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveWorkspaceId } from '../../src/workspace-identity.js';
import { loadRuntimeConfig } from '../../src/config/runtime-config.js';
import {
  initializeServiceOperationCustodySchema,
  openServiceOperationDatabase,
} from '../../src/config/service-operation-custody.js';
import { acquireStorageReadAdmission } from '../../src/config/storage-read-admission.js';

export interface ServiceCustodyFixture {
  readonly root: string;
  readonly workspaceId: string;
  readonly relative: string;
  readonly database: Database;
}

// Cache only the inert repository ID for identical fixture YAML, never a
// root-bound configuration, database, admission handle or launch capability.
const repositoryIdsByConfiguration = new Map<string, string>();

export function openCustodyFixture(prefix = 'service-capability-'): ServiceCustodyFixture {
  const { root, workspaceId } = openRepositoryFixture(prefix);
  const relative = '.vida/service-custody.sqlite';
  try {
    const admission = acquireStorageReadAdmission(root, workspaceId, relative);
    admission.close();
    const prepared = new Database(path.join(root, relative));
    initializeServiceOperationCustodySchema(prepared);
    prepared.close();
    return { root, workspaceId, relative, database: openServiceOperationDatabase(root, relative, workspaceId) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function openRepositoryFixture(prefix: string): { readonly root: string; readonly workspaceId: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  try {
    copyRepositoryConfiguration(root);
    mkdirSync(path.join(root, '.vida'));
    const configuration = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8');
    let repositoryId = repositoryIdsByConfiguration.get(configuration);
    if (repositoryId === undefined) {
      repositoryId = loadRuntimeConfig(root).repository.repository_id;
      repositoryIdsByConfiguration.clear();
      repositoryIdsByConfiguration.set(configuration, repositoryId);
    }
    return { root, workspaceId: deriveWorkspaceId(repositoryId, root) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function copyRepositoryConfiguration(root: string): void {
  const repositoryRoot =
    process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
    copyFileSync(path.join(repositoryRoot, file), path.join(root, file));
}
