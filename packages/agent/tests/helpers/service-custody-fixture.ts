import { Database } from 'bun:sqlite';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveWorkspaceId } from '../../src/workspace-identity.js';
import { loadRuntimeConfig } from '../../src/config/runtime-config.js';
import {
  closeServiceOperationDatabase,
  openServiceOperationDatabase,
} from '../../src/config/service-operation-custody.js';
import { acquireStorageReadAdmission } from '../../src/config/storage-read-admission.js';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.js';
import { expectReturned } from './expect-rejection.js';

// Independent test oracle: fixture preparation must not execute the mutable
// schema initializer. Its real SQLite output is checked against this contract.
export const serviceCustodyFixtureSql =
  'CREATE TABLE agent_host_service_operation_custody (' +
  "workspace_id TEXT NOT NULL CHECK(length(workspace_id)=64),owner_kind TEXT NOT NULL CHECK(owner_kind IN ('release-pack-worker','release-worker'))," +
  'operation_id TEXT NOT NULL,request_digest TEXT NOT NULL CHECK(length(request_digest)=64),' +
  'owner_token TEXT,revision INTEGER NOT NULL CHECK(revision>0),' +
  "phase TEXT NOT NULL CHECK(phase IN ('launching','in_flight','unknown','prepared','terminal'))," +
  'evidence_digest TEXT,launch_pid INTEGER CHECK(launch_pid IS NULL OR launch_pid>0),handoff_digest TEXT,handoff_from_kind TEXT,handoff_from_phase TEXT,' +
  'handoff_from_request_digest TEXT,handoff_from_revision INTEGER,handoff_from_evidence_digest TEXT,' +
  'PRIMARY KEY(workspace_id,operation_id))';

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
    let primaryFailure: { error: unknown } | undefined;
    try {
      prepared.exec(serviceCustodyFixtureSql);
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            prepared.close();
            return undefined;
          },
        ],
        primaryFailure,
      );
    }
    // Assert only the Subject's open contract after independent preparation.
    // Filesystem, admission and raw SQLite setup failures remain runtime errors.
    const database = expectReturned(() => openServiceOperationDatabase(root, relative, workspaceId));
    try {
      // The Subject returns a writable custody connection. Check that capability
      // with a zero-row write before independent fixture controls use the handle.
      expectReturned(() => database.exec('UPDATE agent_host_service_operation_custody SET revision=revision WHERE 0'));
    } catch (error) {
      completeOwnedCleanup(
        [
          () => {
            closeServiceOperationDatabase(database);
            return undefined;
          },
        ],
        { error },
      );
      throw error;
    }
    return { root, workspaceId, relative, database };
  } catch (error) {
    console.error('Retained failed custody fixture preparation: ' + root);
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
