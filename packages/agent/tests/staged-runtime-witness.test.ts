import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkItemSelection } from '../src/config/runtime-config.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import {
  openConfiguredMastraSessionLedger,
  type MastraSessionLedger,
} from '../src/orchestration/persistent-session-handoff.ts';
import {
  MastraSessionBridge,
  sessionBridgeRunId,
  type SessionBridgeSnapshot,
} from '../src/orchestration/mastra-session-bridge.ts';
import { createStagedRuntimeWitness } from '../src/orchestration/staged-runtime-witness.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';

const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selection: WorkItemSelection = {
  team: 'default-development',
  kind: 'task',
  intent: 'task_execution',
  project: 'sample',
  risk_flags: [],
  labels: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === 'string' ? error.code : undefined;
}

async function expectRejected(promise: Promise<unknown>, message: RegExp): Promise<void> {
  await Promise.resolve(expect(promise).rejects.toThrow(message));
}

test('staged witness inspects actual completed persistence without producing or changing canonical state', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-stage-witness-'));
  let ledger: MastraSessionLedger | undefined;
  let bridge: MastraSessionBridge | undefined;
  let failed = false;
  let primaryError: unknown;
  let cleanupErrors: unknown[] = [];
  try {
    writeFileSync(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      readFileSync(path.join(bundleRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
        .replaceAll('{{REPOSITORY}}', 'witness-repository')
        .replaceAll('{{PROJECT}}', 'sample')
        .replaceAll('{{BUNDLE}}', 'vida-agent'),
    );
    writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy');
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture map');
    mkdirSync(path.join(root, 'docs/agent-instructions'), { recursive: true });
    writeFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'), '{}');
    const config = loadRuntimeConfig(root);
    const context = { work_id: 'work', attempt: 1, scope_digest: 'c'.repeat(64) };
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
    const input: Parameters<typeof createStagedRuntimeWitness>[0] = {
      repositoryRoot: root,
      payloadManifestSha256: 'a'.repeat(64),
      workId: 'work',
      attempt: 1,
      lifecycleRisk: 'low',
      selection,
    };
    const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENTS.md']);
    const enginePath = path.join(root, config.control.work_root, 'mastra-workflows.v1.sqlite');
    await expectRejected(createStagedRuntimeWitness(input), /absent/);
    expect(existsSync(enginePath)).toBe(false);
    ledger = openConfiguredMastraSessionLedger(root);
    await expectRejected(createStagedRuntimeWitness(input), /absent/);
    expect(existsSync(enginePath)).toBe(false);
    bridge = await MastraSessionBridge.open({
      repositoryRoot: root,
      config,
      ledger,
      projectIds: ['sample'],
      selection,
      context,
      workflowId: 'task_execution',
      workspaceId,
    });
    let engine: SessionBridgeSnapshot = await bridge.start(sourceScope);
    await expectRejected(createStagedRuntimeWitness(input), /identity|checksum|successful/);
    const fixtureEvidenceRefs: string[] = ['local://fixture/witness'];
    while (engine.status === 'suspended') {
      let journal = ledger.resume('work', 1);
      if (!journal) throw new Error('Expected the issued fixture journal');
      journal = ledger.issueWave('work', 1, journal.version);
      if (!journal) throw new Error('Expected the issued fixture wave');
      const taskWorkflow = config.workflows.task_execution;
      if (!taskWorkflow) throw new Error('Expected the configured task workflow');
      for (const item of journal.state.items) {
        const stageIndex = taskWorkflow.stages.findIndex(({ id }) => id === item.request.stage_id);
        if (stageIndex < 0) throw new Error(`Unknown fixture stage ${item.request.stage_id}`);
        const stage = taskWorkflow.stages[stageIndex];
        if (!stage) throw new Error(`Missing fixture stage at index ${stageIndex}`);
        if (item.issue_id === null) throw new Error('Expected an issued fixture issue ID');
        const summary =
          stage.kind === 'validate'
            ? JSON.stringify({
                schema: 'VidaValidatorVerdict/v1',
                verdict: 'pass',
                findings: [],
                evidence_refs: fixtureEvidenceRefs,
              })
            : stage.kind === 'test'
              ? JSON.stringify({
                  schema: 'VidaTesterVerdict/v1',
                  status: 'pass',
                  evidence_refs: fixtureEvidenceRefs,
                })
              : 'Actual fixture observation';
        const observation = {
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          agent_id: 'fixture',
          tool_call_ref: `local:witness/${item.issue_id}`,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: fixtureEvidenceRefs,
        } as const;
        const currentJournal = journal;
        if (!currentJournal) throw new Error('Expected the issued fixture wave');
        const sourceScopeDigest = sourceScope.digest;
        expect(() => ledger!.report('work', 1, currentJournal.version, observation)).toThrow(
          'read-only observation cannot rebase changed source',
        );
        expect(ledger.resume('work', 1)).toEqual(currentJournal);
        expect(sourceScope.digest).toBe(sourceScopeDigest);
        journal = ledger.report('work', 1, journal.version, observation, sourceScope);
        if (!journal) throw new Error('Expected the reported fixture journal');
        expect(sourceScope.digest).toBe(sourceScopeDigest);
      }
      if (!engine.step_id) throw new Error('Expected the suspended fixture step');
      const observations = journal.state.items.map((item) => {
        if (!item.observation) throw new Error('Expected the reported fixture observation');
        return item.observation;
      });
      engine = await bridge.resume(engine.step_id, observations, sourceScope);
    }
    expect(engine.status).toBe('success');
    const database = ledger.sessionProducerBinding().database;
    const canonicalRows = () =>
      database
        .query<{ name: string; sql: string | null }, []>(
          "SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all()
        .map((table) => ({
          ...table,
          rows: database
            .query<Record<string, unknown>, []>(`SELECT * FROM "${table.name.replaceAll('"', '""')}"`)
            .all(),
        }));
    const before = canonicalRows();
    const engineBefore = readFileSync(enginePath);
    const configBefore = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'));
    const witness = await createStagedRuntimeWitness(input);
    expect(witness.mastra_status).toBe('success');
    expect(witness.ledger_state.source_scope).toEqual(sourceScope);
    expect(witness.workflow_id).toBe('task_execution');
    expect(witness.run_id).toBe(engine.run_id);
    const { digest, ...body } = witness;
    expect(digest).toBe(canonicalJsonDigest(body));
    expect(canonicalRows()).toEqual(before);
    expect(readFileSync(enginePath)).toEqual(engineBefore);
    expect(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(configBefore);
    await expectRejected(createStagedRuntimeWitness({ ...input, workId: 'foreign' }), /absent/);
    await expectRejected(
      createStagedRuntimeWitness({ ...input, selection: { ...selection, labels: ['foreign'] } }),
      /context differs/,
    );
    const handle = ledger.beginSessionProducer({
      selection,
      context,
      workflowId: 'task_execution',
      projectIds: ['sample'],
      phase: 'initialize',
      runId: sessionBridgeRunId(workspaceId, context, 'task_execution'),
    });
    await expectRejected(createStagedRuntimeWitness(input), /producer is unknown/);
    const producerJournal = ledger.resume('work', 1);
    if (!producerJournal) throw new Error('Expected the fixture journal after producer reservation');
    ledger.hostState.settleSessionProducer(handle, producerJournal.version);
    const journal = database
      .query<{ payload: string; digest: string }, []>('SELECT payload,digest FROM agent_host_mastra_session_ledger')
      .get();
    if (!journal) throw new Error('Expected the persisted fixture journal');
    const invalid: unknown = JSON.parse(journal.payload);
    if (!isRecord(invalid) || !Array.isArray(invalid.completed) || !isRecord(invalid.completed[0]))
      throw new Error('Expected a completed fixture wave');
    const completedItems: unknown = invalid.completed[0].items;
    if (!Array.isArray(completedItems) || !isRecord(completedItems[0]) || !isRecord(completedItems[0].observation))
      throw new Error('Expected a persisted fixture observation');
    completedItems[0].observation.agent_id = 'substituted';
    database
      .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?')
      .run(JSON.stringify(invalid), canonicalJsonDigest(invalid));
    await expectRejected(createStagedRuntimeWitness(input), /not the same successful/);
    database
      .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?')
      .run(journal.payload, journal.digest);
    await bridge.close();
    bridge = undefined;
    ledger.close();
    ledger = undefined;
    const readonly = new Database(enginePath, { readonly: true });
    expect(
      readonly.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM mastra_workflow_snapshot').get()?.count,
    ).toBe(1);
    readonly.close();
  } catch (error: unknown) {
    failed = true;
    primaryError = error;
  } finally {
    if (bridge) {
      try {
        await bridge.close();
      } catch (error: unknown) {
        cleanupErrors.push(error);
      }
    }
    if (ledger) {
      try {
        ledger.close();
      } catch (error: unknown) {
        cleanupErrors.push(error);
      }
    }
    const safeFixtureRoot =
      path.dirname(root) === path.resolve(tmpdir()) && path.basename(root).startsWith('vida-stage-witness-');
    if (!safeFixtureRoot) cleanupErrors.push(new Error('unsafe witness fixture cleanup'));
    if (failed || cleanupErrors.length > 0) {
      console.error('Witness fixture retained for inspection: ' + root);
    } else {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch (error: unknown) {
        if (errorCode(error) === 'EBUSY') console.error('Closed witness fixture retained (OS EBUSY): ' + root);
        else cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      primaryError = failed
        ? new AggregateError(cleanupErrors, 'Witness fixture cleanup failed after test failure', {
            cause: primaryError,
          })
        : new AggregateError(cleanupErrors, 'Witness fixture cleanup failed');
      failed = true;
    }
  }
  if (failed) throw primaryError;
}, 30_000);
