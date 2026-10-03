import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStagedRuntimeWitness } from '../src/orchestration/staged-runtime-witness.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { MastraSessionBridge, sessionBridgeRunId } from '../src/orchestration/mastra-session-bridge.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selection = {
  team: 'default-development',
  kind: 'task',
  intent: 'task_execution',
  project: 'sample',
  risk_flags: [],
  labels: [],
};

test(
  'staged witness inspects actual completed persistence without producing or changing canonical state',
  { timeout: 30_000 },
  async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-stage-witness-'));
    let ledger, bridge;
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
      const config = loadRuntimeConfig(root),
        context = { work_id: 'work', attempt: 1, scope_digest: 'c'.repeat(64) },
        workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
      const input = {
        repositoryRoot: root,
        payloadManifestSha256: 'a'.repeat(64),
        workId: 'work',
        attempt: 1,
        selection,
      };
      const enginePath = path.join(root, config.control.work_root, 'mastra-workflows.v1.sqlite');
      await expect(createStagedRuntimeWitness(input)).rejects.toThrow(/absent/);
      expect(existsSync(enginePath)).toBe(false);
      ledger = openConfiguredMastraSessionLedger(root);
      await expect(createStagedRuntimeWitness(input)).rejects.toThrow(/absent/);
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
      let engine = await bridge.start();
      await expect(createStagedRuntimeWitness(input)).rejects.toThrow(/identity|checksum|successful/);
      while (engine.status === 'suspended') {
        let journal = ledger.resume('work', 1);
        journal = ledger.issueWave('work', 1, journal.version);
        for (const item of journal.state.items) {
          const kind = config.workflows.task_execution.stages.find((stage) => stage.id === item.request.stage_id).kind;
          const summary =
            kind === 'validate'
              ? JSON.stringify({
                  schema: 'VidaValidatorVerdict/v1',
                  verdict: 'pass',
                  findings: [],
                  evidence_refs: ['local://fixture/witness'],
                })
              : kind === 'test'
                ? JSON.stringify({
                    schema: 'VidaTesterVerdict/v1',
                    status: 'pass',
                    evidence_refs: ['local://fixture/witness'],
                  })
                : 'Actual fixture observation';
          journal = ledger.report('work', 1, journal.version, {
            schema: 'VidaSessionObservation/v1',
            action_id: item.request.action_id,
            issue_id: item.issue_id,
            agent_id: 'fixture',
            tool_call_ref: 'local:witness/' + item.issue_id,
            status: 'reported_complete',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: ['local://fixture/witness'],
          });
        }
        engine = await bridge.resume(
          engine.step_id,
          journal.state.items.map((item) => item.observation),
        );
      }
      expect(engine.status).toBe('success');
      const database = ledger.sessionProducerBinding().database;
      const canonicalRows = () =>
        database
          .query("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name")
          .all()
          .map((table) => ({
            ...table,
            rows: database.query('SELECT * FROM "' + table.name.replaceAll('"', '""') + '"').all(),
          }));
      const before = canonicalRows(),
        engineBefore = readFileSync(enginePath),
        configBefore = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'));
      const witness = await createStagedRuntimeWitness(input);
      expect(witness.mastra_status).toBe('success');
      expect(witness.workflow_id).toBe('task_execution');
      expect(witness.run_id).toBe(engine.run_id);
      const { digest, ...body } = witness;
      expect(digest).toBe(canonicalJsonDigest(body));
      expect(canonicalRows()).toEqual(before);
      expect(readFileSync(enginePath)).toEqual(engineBefore);
      expect(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'))).toEqual(configBefore);
      await expect(createStagedRuntimeWitness({ ...input, workId: 'foreign' })).rejects.toThrow(/absent/);
      await expect(
        createStagedRuntimeWitness({ ...input, selection: { ...selection, labels: ['foreign'] } }),
      ).rejects.toThrow(/context differs/);
      const handle = ledger.beginSessionProducer({
        selection,
        context,
        workflowId: 'task_execution',
        projectIds: ['sample'],
        phase: 'initialize',
        runId: sessionBridgeRunId(workspaceId, context, 'task_execution'),
      });
      await expect(createStagedRuntimeWitness(input)).rejects.toThrow(/producer is unknown/);
      ledger.hostState.settleSessionProducer(handle, ledger.resume('work', 1).version);
      const journal = database.query('SELECT * FROM agent_host_mastra_session_ledger').get();
      const invalid = JSON.parse(journal.payload);
      invalid.completed[0].items[0].observation.agent_id = 'substituted';
      database
        .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?')
        .run(JSON.stringify(invalid), canonicalJsonDigest(invalid));
      await expect(createStagedRuntimeWitness(input)).rejects.toThrow(/not the same successful/);
      database
        .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?')
        .run(journal.payload, journal.digest);
      await bridge.close();
      bridge = null;
      ledger.close();
      ledger = null;
      const readonly = new Database(enginePath, { readonly: true });
      expect(readonly.query('SELECT COUNT(*) AS count FROM mastra_workflow_snapshot').get().count).toBe(1);
      readonly.close();
    } finally {
      if (bridge) await bridge.close();
      if (ledger) ledger.close();
      if (path.dirname(root) !== path.resolve(tmpdir()) || !path.basename(root).startsWith('vida-stage-witness-'))
        throw new Error('unsafe witness fixture cleanup');
      try {
        rmSync(root, { recursive: true, force: true });
      } catch (error) {
        if (error.code !== 'EBUSY') throw error;
        console.error('Closed witness fixture retained (OS EBUSY): ' + root);
      }
    }
  },
);
