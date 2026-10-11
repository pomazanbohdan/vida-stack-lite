import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson, canonicalJsonDigest } from '../../src/contracts/public-ingress.js';
import { loadRuntimeConfig } from '../../src/config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.js';
import { snapshotDeclaredSources } from '../../src/orchestration/scoped-source-snapshot.js';
import { HostStateStore, openHostStateDatabase } from '../../src/host-state.js';
import { deriveWorkspaceId } from '../../src/workspace-identity.js';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.js';
import { admitLocalSessionWork, type LocalWorkAdmissionInput } from '../../src/orchestration/local-work-admission.js';

type MutableAdmissionInput = { -readonly [Key in keyof LocalWorkAdmissionInput]: LocalWorkAdmissionInput[Key] };
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function createAutomaticWorkAdmissionFixture(sourceWriter = false, publicStore = false) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-absorption-'));
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'absorption-repository')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Test fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Test fixture source map');
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root);
  if (publicStore) mkdirSync(path.join(root, config.control.work_root), { recursive: true });
  const workspaceId = publicStore ? deriveWorkspaceId(config.repository.repository_id, root) : 'a'.repeat(64);
  const database = openHostStateDatabase(
      root,
      publicStore ? config.control.work_root + '/session-handoff.v1.sqlite' : 'fixture.sqlite',
      workspaceId,
    ),
    store = new HostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      publicStore ? root : undefined,
    ),
    source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const selection: LocalWorkAdmissionInput['selection'] = {
    team: 'default-development',
    kind: sourceWriter ? 'feature' : 'research',
    intent: sourceWriter ? 'implementation_change' : 'information_research',
    project: 'sample',
    risk_flags: [],
    labels: [],
  };
  function prepare(id: string, pointer: string, thread = 'session'): MutableAdmissionInput {
    mkdirSync(path.join(root, '.agent', 'work', id), { recursive: true });
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'scope-' + id,
      work_id: id,
      source_revision: source.digest,
      ac_ids: ['AC-SHARED'],
      allowed_paths: ['AGENT.sidecar.md'],
      implementation_paths: ['AGENT.sidecar.md'],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: ['Source mutation'],
      acceptance_trace: ['AC-SHARED'],
      behavior_trace: ['SR-SHARED'],
      test_trace: ['fixture'],
      diagnostic_trace: ['fixture'],
      attribution: { thread_id: thread, pointer },
      owner: 'fixture',
      created_at: new Date().toISOString(),
    };
    const acceptance = {
      schema: 'AcceptanceManifest/v1',
      id: 'acceptance-' + id,
      version: 1,
      ac_ids: scope.ac_ids,
      source: 'AGENT.sidecar.md',
      scope: scope.scope_id,
      source_revision: source.digest,
      contracts: [{ id: 'AC-SHARED', definition: 'Preserve unfinished scope', sr: 'SR-SHARED', evidence: ['fixture'] }],
    };
    const scopePath = `.agent/work/${id}/scope.json`,
      acceptancePath = `.agent/work/${id}/acceptance.json`;
    writeFileSync(path.join(root, scopePath), JSON.stringify(scope));
    writeFileSync(path.join(root, acceptancePath), JSON.stringify(acceptance));
    return {
      repositoryRoot: root,
      config,
      store,
      selection,
      context: { work_id: id, attempt: 1, scope_digest: source.digest },
      nativeSessionHandle: thread,
      workItem: {
        schema: 'WorkItem/v1',
        id,
        canonical_kind: selection.kind,
        intent: selection.intent,
        project_id: 'sample',
        title: 'Fixture ' + id,
        description: 'Unfinished acceptance',
        risk_flags: [],
        labels: [],
        provider: 'local',
        provider_type: 'Research',
      },
      scopePath,
      acceptancePath,
      runtimeCodePaths: ['vida-agent/bin/run.mjs'],
      route: 'R2',
      risk: 'low',
      changeKind: 'feature',
    };
  }
  function admit(input: LocalWorkAdmissionInput) {
    const admitted = admitLocalSessionWork(input);
    if (
      admitted.host.work === null ||
      admitted.host.ledger === null ||
      admitted.host.workVersion === null ||
      admitted.host.ledgerVersion === null
    )
      throw new Error('Admitted fixture has no complete persisted Host snapshot');
    const journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: store.workspaceId,
      work_id: input.context.work_id,
      attempt: 1,
      run_id: admitted.host.work.execution.run_id,
      step_id: 'unissued-fixture-wave',
      items: [],
      completed: [],
    };
    database
      .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
      .run(store.workspaceId, input.context.work_id, 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
    return admitted;
  }
  return {
    root,
    config,
    database,
    store,
    source,
    prepare,
    admit,
    close({ retainRoot = false }: { retainRoot?: boolean } = {}) {
      closeWorkspaceDatabaseWithAdmission(database);
      if (!retainRoot) rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    },
  };
}
