import { expect, test } from 'bun:test';
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
import { validateCutoverActivationDecision } from '../../script/Stage-VidaAgentCutover.mjs';
import { run } from '../bin/run.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const selection = {
  team: 'default-development',
  kind: 'feature',
  intent: 'implementation_change',
  project: 'refactoring',
  risk_flags: [],
  labels: [],
};
const sha = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

test('exports only a genuinely successful persisted configured Mastra run', { timeout: 30_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-stage-witness-'));
  try {
    writeFileSync(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      readFileSync(path.join(repository, 'agent-runtime.config.v1.yaml')),
    );
    mkdirSync(path.join(root, '.git'));
    mkdirSync(path.join(root, 'agent-runtime-new'));
    mkdirSync(path.join(root, 'vida-agent'));
    for (const relative of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime-new/TESTING.md', 'vida-agent/TESTING.md'])
      writeFileSync(path.join(root, relative), readFileSync(path.join(repository, relative)));
    const config = loadRuntimeConfig(root);
    const initializationSchema = path.join(repository, 'vida-agent/schemas/runtime-initialization.v1.schema.json');
    mkdirSync(path.join(root, 'agent-runtime-new/schemas'), { recursive: true });
    writeFileSync(
      path.join(root, 'agent-runtime-new/schemas/runtime-initialization.v1.schema.json'),
      readFileSync(initializationSchema),
    );
    mkdirSync(path.join(root, 'vida-agent/schemas'), { recursive: true });
    writeFileSync(
      path.join(root, 'vida-agent/schemas/runtime-initialization.v1.schema.json'),
      readFileSync(initializationSchema),
    );
    mkdirSync(path.join(root, '.agent'));
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
      let journal = ledger.sync('work', 1, wave.run_id, wave.step_id, wave.requests);
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
                  evidence_refs: ['local://fixture/observation'],
                })
              : kind === 'test'
                ? JSON.stringify({
                    schema: 'VidaTesterVerdict/v1',
                    status: 'pass',
                    evidence_refs: ['local://fixture/observation'],
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
            evidence_refs: ['local://fixture/observation'],
          });
        }
        wave = await bridge.resume(
          wave.step_id,
          journal.state.items.map((item) => item.observation),
        );
        journal = ledger.sync('work', 1, wave.run_id, wave.step_id, wave.requests);
      }
      expect(wave.status, JSON.stringify(wave)).toBe('success');
    } finally {
      ledger.close();
      await bridge.close();
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
    const payloadRoot = path.join(root, 'payload');
    const bundleRoot = path.join(payloadRoot, 'vida-agent');
    mkdirSync(path.join(bundleRoot, 'bin'), { recursive: true });
    const launcherBytes = readFileSync(path.join(repository, 'agent-runtime-new/bin/bun.mjs'));
    writeFileSync(path.join(bundleRoot, 'bin/bun.mjs'), launcherBytes);
    writeFileSync(path.join(bundleRoot, '.bun-version'), '1.4.2\n');
    writeFileSync(
      path.join(bundleRoot, 'package.json'),
      json({ name: 'vida-agent', packageManager: 'bun@1.4.2', engines: { bun: '1.4.2' } }),
    );
    const plan = {
      cutover_id: 'real-export-test',
      plan_sha256: 'e'.repeat(64),
      archive_manifest_sha256: 'f'.repeat(64),
      payload_manifest_sha256: 'a'.repeat(64),
      state_policy: 'clean_start_no_ticket_transfer',
      bundle: [{ path: 'vida-agent/bin/bun.mjs', size: launcherBytes.length, sha256: sha(launcherBytes) }],
      integrations: [
        {
          path: 'agent-runtime.config.v1.yaml',
          after: {
            sha256: sha(Buffer.from(witness.config_yaml)),
          },
        },
      ],
    };
    mkdirSync(path.join(root, '.agent/cutover/real-export-test'), { recursive: true });
    writeFileSync(path.join(root, '.agent/cutover/real-export-test/plan.json'), json(plan));
    const exported = await run([
      '--project-root',
      root,
      '--repository',
      config.repository.repository_id,
      '--project',
      'refactoring',
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
    const evidence = {};
    for (const kind of ['parity', 'security', 'assurance', 'rollback', 'dev', 'staged_runtime']) {
      const relative = `.agent/cutover/real-export-test/${kind}.json`;
      let content = {
        schema: 'VidaCutoverGateEvidence/v1',
        kind,
        cutover_id: plan.cutover_id,
        payload_manifest_sha256: plan.payload_manifest_sha256,
        source_bindings: [{ path: 'agent-runtime.config.v1.yaml', sha256: witness.config_sha256 }],
      };
      if (kind === 'staged_runtime') {
        content = JSON.parse(readFileSync(path.join(root, exported.path), 'utf8'));
      }
      const bytes = Buffer.from(json(content));
      if (kind !== 'staged_runtime') writeFileSync(path.join(root, relative), bytes);
      evidence[kind] = {
        actor: 'test-owner',
        path: relative,
        pointer: 'fixture',
        sha256: sha(bytes),
        status: 'passed',
      };
    }
    const selector = {
      schema: 'ActiveRuntimeSelector/v1',
      generation: plan.cutover_id,
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      archive_manifest_sha256: plan.archive_manifest_sha256,
      plan_sha256: plan.plan_sha256,
      payload_manifest_sha256: plan.payload_manifest_sha256,
      state_policy: plan.state_policy,
    };
    const decision = {
      schema: 'VidaCutoverActivationDecision/v1',
      cutover_id: plan.cutover_id,
      plan_sha256: plan.plan_sha256,
      payload_manifest_sha256: plan.payload_manifest_sha256,
      selector_intent_sha256: sha(json(selector)),
      outcome: 'approved',
      actor: 'test-owner',
      pointer: 'fixture',
      evidence,
    };
    const activationDecisionPath = `.agent/cutover/real-export-test/activation-decision.v1.json`;
    writeFileSync(path.join(root, activationDecisionPath), json(decision));
    expect(validateCutoverActivationDecision({ root, payloadRoot, plan, activationDecisionPath }).sha256).toBe(
      sha(json(decision)),
    );
    const parityPath = '.agent/cutover/real-export-test/parity.json';
    const parity = JSON.parse(readFileSync(path.join(root, parityPath), 'utf8'));
    for (const source_bindings of [[], [{ path: 'agent-runtime.config.v1.yaml', sha256: '0'.repeat(64) }]]) {
      const invalidBytes = Buffer.from(json({ ...parity, source_bindings }));
      writeFileSync(path.join(root, parityPath), invalidBytes);
      writeFileSync(
        path.join(root, activationDecisionPath),
        json({ ...decision, evidence: { ...evidence, parity: { ...evidence.parity, sha256: sha(invalidBytes) } } }),
      );
      expect(() => validateCutoverActivationDecision({ root, payloadRoot, plan, activationDecisionPath })).toThrow();
    }
  } finally {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch (error) {
      if (error.code !== 'EBUSY') throw error;
    }
  }
});
