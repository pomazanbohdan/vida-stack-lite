import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStagedRuntimeWitness } from '../src/orchestration/staged-runtime-witness.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { MastraSessionBridge } from '../src/orchestration/mastra-session-bridge.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { writeConsumerFixture } from './helpers/consumer-fixture.mjs';
import { run } from '../bin/run.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const selection = {
  team: 'default-development',
  kind: 'feature',
  intent: 'implementation_change',
  project: 'fixture-project',
  risk_flags: [],
  labels: [],
};
const sha = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

test('exports only a genuinely successful persisted configured Mastra run', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-stage-witness-'));
  try {
    writeConsumerFixture(root, packageRoot);
    const config = loadRuntimeConfig(root);
    const initializationSchema = path.join(packageRoot, 'schemas/runtime-initialization.v1.schema.json');
    writeFileSync(
      path.join(root, '.agent/runtime-initialization.v1.json'),
      json({
        schema: 'RuntimeInitialization/v1',
        version: 1,
        repository_id: config.repository.repository_id,
        project_ids: config.projects.map((project) => project.project_id).sort(),
        integrations_digest: canonicalJsonDigest(config.integrations),
        workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
        workspace_binding_status: 'pending',
        bundle: config.runtime.bundle,
        config_digest: runtimeConfigDigest(config),
        schema_sha256: sha(readFileSync(initializationSchema)),
        templates: [],
        created_at: new Date().toISOString(),
      }),
    );
    await expect(
      createStagedRuntimeWitness({
        repositoryRoot: root,
        payloadManifestSha256: 'a'.repeat(64),
        workId: 'work',
        attempt: 1,
        selection,
      }),
    ).rejects.toThrow('absent');
    const ledger = openConfiguredMastraSessionLedger(root);
    const bridge = await MastraSessionBridge.open({
      repositoryRoot: root,
      config,
      selection,
      context: { work_id: 'work', attempt: 1, scope_digest: 'c'.repeat(64) },
      workflowId: 'implementation_change',
      workspaceId: deriveWorkspaceId(config.repository.repository_id, root),
    });
    try {
      let wave = await bridge.start();
      let journal = ledger.sync('work', 1, wave.run_id, wave.step_id, wave.requests, null, wave.status);
      await expect(
        createStagedRuntimeWitness({
          repositoryRoot: root,
          payloadManifestSha256: 'a'.repeat(64),
          workId: 'work',
          attempt: 1,
          selection,
        }),
      ).rejects.toThrow(/identity|successful/);
      while (wave.status === 'suspended') {
        journal = ledger.issueWave('work', 1, journal.version);
        for (const item of journal.state.items) {
          const kind = config.workflows.implementation_change.stages.find(
            (stage) => stage.id === item.request.stage_id,
          )?.kind;
          const summary =
            kind === 'validate'
              ? JSON.stringify({
                  schema: 'VidaValidatorVerdict/v1',
                  verdict: 'pass',
                  findings: [],
                  evidence_refs: ['vida-agent/TESTING.md#fixture'],
                })
              : kind === 'test'
                ? JSON.stringify({
                    schema: 'VidaTesterVerdict/v1',
                    status: 'pass',
                    evidence_refs: ['vida-agent/TESTING.md#fixture'],
                  })
                : 'fixture observation';
          journal = ledger.report('work', 1, journal.version, {
            schema: 'VidaSessionObservation/v1',
            action_id: item.request.action_id,
            issue_id: item.issue_id,
            agent_id: 'fixture-agent',
            tool_call_ref: `fixture-${item.issue_id}`,
            status: 'reported_complete',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: ['vida-agent/TESTING.md#fixture'],
          });
        }
        wave = await bridge.resume(
          wave.step_id,
          journal.state.items.map((item) => item.observation),
        );
        journal = ledger.sync('work', 1, wave.run_id, wave.step_id, wave.requests, null, wave.status);
      }
      expect(wave.status, JSON.stringify(wave)).toBe('success');
    } finally {
      ledger.close();
      await bridge.close();
    }
    const terminalLedger = openConfiguredMastraSessionLedger(root);
    try {
      expect(terminalLedger.resume('work', 1).resume_status).toBe('blocked');
      expect(terminalLedger.resume('work', 1).state.step_id).toBeNull();
    } finally {
      terminalLedger.close();
    }
    const witness = await createStagedRuntimeWitness({
      repositoryRoot: root,
      payloadManifestSha256: 'a'.repeat(64),
      workId: 'work',
      attempt: 1,
      selection,
    });
    expect(witness.workflow_id).toBe('implementation_change');
    expect(witness.run_id).toBeTruthy();
    expect(witness.mastra_status).toBe('success');
    const { digest, ...body } = witness;
    expect(digest).toBe(canonicalJsonDigest(body));
    mkdirSync(path.join(root, '.agent/cutover/real-export-test'), { recursive: true });
    const exported = await run([
      '--project-root',
      root,
      '--repository',
      config.repository.repository_id,
      '--project',
      'fixture-project',
      '--work-path',
      'vida-agent',
      '--work-id',
      'work',
      '--attempt',
      '1',
      '--scope-digest',
      'c'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'feature',
      '--intent',
      'implementation_change',
      '--workflow',
      'implementation_change',
      '--export-staged-witness',
      'real-export-test',
      '--payload-manifest-sha256',
      'a'.repeat(64),
    ]);
    expect(exported.status).toBe('staged_witness_exported');
    const evidenceBytes = readFileSync(path.join(root, exported.path));
    expect(exported.sha256).toBe(sha(evidenceBytes));
    const evidence = JSON.parse(evidenceBytes);
    expect(evidence).toMatchObject({
      schema: 'VidaStagedRuntimeEvidence/v1',
      status: 'passed',
      run_id: witness.run_id,
    });
    const exportedWitness = readFileSync(path.join(root, evidence.witness.path));
    expect(evidence.witness.sha256).toBe(sha(exportedWitness));
    expect(JSON.parse(exportedWitness)).toEqual(witness);
    expect(evidence.observations).toHaveLength(witness.ledger_state.completed.flatMap((wave) => wave.items).length);
    for (const observation of evidence.observations)
      expect(observation.sha256).toBe(sha(readFileSync(path.join(root, observation.path))));
    const witnessInput = {
      repositoryRoot: root,
      payloadManifestSha256: 'a'.repeat(64),
      workId: 'work',
      attempt: 1,
      selection,
    };
    await expect(createStagedRuntimeWitness({ ...witnessInput, payloadManifestSha256: 'invalid' })).rejects.toThrow(
      'payload digest is invalid',
    );
    const database = new Database(path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'));
    try {
      const row = database
        .query('SELECT payload,digest FROM agent_host_mastra_session_ledger WHERE work_id=? AND attempt=?')
        .get('work', 1);
      for (const mode of ['incomplete', 'failed']) {
        const invalid = JSON.parse(row.payload);
        if (mode === 'incomplete') {
          invalid.items = invalid.completed[0].items;
        } else {
          invalid.completed[0].items[0].observation.status = 'reported_failed';
        }
        database
          .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=? AND attempt=?')
          .run(JSON.stringify(invalid), canonicalJsonDigest(invalid), 'work', 1);
        try {
          await expect(createStagedRuntimeWitness(witnessInput)).rejects.toThrow(
            mode === 'incomplete'
              ? 'persisted journal identity or digest is invalid'
              : 'persisted journal lacks matching completed workflow observations',
          );
        } finally {
          database
            .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=? AND attempt=?')
            .run(row.payload, row.digest, 'work', 1);
        }
      }
      const altered = JSON.parse(row.payload);
      const observation = altered.completed[0].items[0].observation;
      observation.summary = 'Changed accepted observation';
      observation.output_digest = canonicalJsonDigest(observation.summary);
      database
        .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=? AND attempt=?')
        .run(JSON.stringify(altered), canonicalJsonDigest(altered), 'work', 1);
      try {
        await expect(createStagedRuntimeWitness(witnessInput)).rejects.toThrow(
          'persisted Mastra run is not the same successful completed journal',
        );
      } finally {
        database
          .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=? AND attempt=?')
          .run(row.payload, row.digest, 'work', 1);
      }
      expect(await createStagedRuntimeWitness(witnessInput)).toEqual(witness);
    } finally {
      database.close();
    }
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const configBytes = readFileSync(configPath);
    writeFileSync(configPath, configBytes.toString().replace('title: "fixture-project"', 'title: "changed-project"'));
    expect(readFileSync(configPath)).not.toEqual(configBytes);
    try {
      await expect(createStagedRuntimeWitness(witnessInput)).rejects.toThrow(
        'persisted journal lacks matching completed workflow observations',
      );
    } finally {
      writeFileSync(configPath, configBytes);
    }
    expect(await createStagedRuntimeWitness(witnessInput)).toEqual(witness);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 30_000);
