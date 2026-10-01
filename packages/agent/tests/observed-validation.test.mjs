import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { createConsumerFixture } from './helpers/consumer-fixture.mjs';
import { afterAll, test, expect } from 'bun:test';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { buildDevelopmentTaskPacket, buildImplementationResult } from '../src/orchestration/mastra-boundary.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import {
  issueObservedValidationReceipt,
  parseObservedValidatorVerdict,
} from '../src/orchestration/observed-validation.ts';
import { observedReceiptEvidenceReference } from '../src/orchestration/observed-receipt-evidence.ts';
import { buildAdmittedImplementationResult } from '../src/orchestration/admitted-implementation-result.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = createConsumerFixture(packageRoot, 'vida-observed-validation-');
afterAll(() => rmSync(root, { recursive: true, force: true }));
const config = loadRuntimeConfig(root);
const workId = 'observed-validator-test';
const owned = ['vida-agent/TESTING.md'];
const initial = snapshotDeclaredSources(requireSafeRepositoryAccess(root), owned);
const selection = {
  team: 'default-development',
  kind: 'story',
  intent: 'implementation_change',
  project: 'fixture-project',
  risk_flags: [],
  labels: [],
};
const context = { work_id: workId, attempt: 1, scope_digest: initial.digest };
const packet = buildDevelopmentTaskPacket(config, {
  packet_id: 'observed-validator-packet',
  work_item_id: workId,
  team_id: selection.team,
  workflow_id: 'implementation_change',
  work_item: { kind: selection.kind, intent: selection.intent, project: selection.project, risk_flags: [], labels: [] },
  attempt: 1,
  risk_flags: [],
  objective: 'Verify the bounded candidate test contract.',
  acceptance: ['The candidate test contract remains readable.'],
  in_scope: owned,
  out_of_scope: [],
  owned_paths: owned,
  affected_symbols: [],
  skill_refs: [],
  documentation_refs: [],
  code_evidence_refs: [],
  research_artifact_refs: ['artifact://research/fixture/' + 'a'.repeat(64)],
  diagnostics: [],
  failed_approaches: [],
  prohibited_patterns: [],
  implementation_constraints: ['Read only the accepted path.'],
  security_constraints: [],
  expected_tests: ['Verify the bounded file hash.'],
  delivery_conditions: ['All validators pass.'],
  source_revision: initial.digest,
  lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
});
const result = buildImplementationResult(packet, {
  result_id: 'observed-validator-implementation',
  packet_id: packet.packet_id,
  source_revision: packet.source_revision,
  implementation_fingerprint: initial.digest,
  changed_paths: [],
  test_refs: [],
});
const waveIndex = compileDevelopmentWorkflow(config, selection.team, 'implementation_change', []).waves.findIndex(
  (wave) => wave.some((stage) => stage.kind === 'validate'),
);
const action = sessionActionsForWave(config, selection, context, 'implementation_change', waveIndex, []).find(
  (entry) => entry.role === 'correctness-validator',
);
const request = {
  schema: 'VidaSessionRequest/v1',
  run_id: 'fixture-run',
  workflow_id: 'implementation_change',
  wave_index: waveIndex,
  action_id: action.action_id,
  assignment_index: action.assignment_index,
  stage_id: action.stage_id,
  role: action.role,
  config_digest: runtimeConfigDigest(config),
  scope_digest: initial.digest,
  bindings_manifest_ref: 'b'.repeat(64),
};
const issueId = randomUUID();
const summary = JSON.stringify({
  schema: 'VidaValidatorVerdict/v1',
  verdict: 'pass',
  findings: [],
  evidence_refs: ['vida-agent/TESTING.md#validator'],
});
const observation = {
  schema: 'VidaSessionObservation/v1',
  action_id: action.action_id,
  issue_id: issueId,
  agent_id: 'native-validator',
  tool_call_ref: 'observed-test-ref',
  status: 'reported_complete',
  summary,
  output_digest: canonicalJsonDigest(summary),
  evidence_refs: ['vida-agent/TESTING.md#validator'],
};
const authority = { issueValidationReceipt: (input) => ({ schema: 'ValidationReceipt/v1', ...input }) };
const journal = {
  state: {
    work_id: workId,
    attempt: 1,
    run_id: request.run_id,
    source_scope: initial,
    items: [],
    completed: [{ step_id: 'wave-' + waveIndex, items: [{ request, issue_id: issueId, observation }] }],
  },
};

test('issues a role and final-fingerprint bound receipt from a matching observed validator', () => {
  expect(packet.skill_refs).toEqual([]);
  expect(packet.documentation_refs).toEqual([]);
  expect(packet.code_evidence_refs).toEqual([]);
  expect(result.test_refs).toEqual([]);
  const receipt = issueObservedValidationReceipt({
    repositoryRoot: root,
    config,
    packet,
    implementationResult: result,
    journal,
    actionId: request.action_id,
    authority,
  });
  expect(receipt.validator_role).toBe('correctness-validator');
  expect(receipt.packet_digest).toBe(packet.digest);
  expect(receipt.implementation_fingerprint).toBe(initial.digest);
  expect(receipt.evidence_refs).toEqual([
    `artifact://session-observation/${request.run_id}/${request.action_id}/${observation.output_digest}`,
  ]);
  expect(observation.evidence_refs).toEqual(['vida-agent/TESTING.md#validator']);
  expect(() => observedReceiptEvidenceReference(journal, request.action_id, 'f'.repeat(64))).toThrow(
    /unique persisted observation/,
  );
  expect(() => observedReceiptEvidenceReference(journal, 'f'.repeat(64), observation.output_digest)).toThrow(
    /unique persisted observation/,
  );
});

test('optional packet reference categories still reject malformed entries', () => {
  const { digest: _digest, schema: _schema, ...input } = packet;
  expect(() => buildDevelopmentTaskPacket(config, { ...input, skill_refs: [''] })).toThrow(/packet skill references/);
  expect(() => buildDevelopmentTaskPacket(config, { ...input, documentation_refs: ['same', 'same'] })).toThrow(
    /packet documentation references/,
  );
  expect(() => buildDevelopmentTaskPacket(config, { ...input, code_evidence_refs: [null] })).toThrow(
    /packet code evidence references/,
  );
  expect(() =>
    buildImplementationResult(packet, {
      result_id: 'malformed-test-ref',
      packet_id: packet.packet_id,
      source_revision: packet.source_revision,
      implementation_fingerprint: initial.digest,
      changed_paths: [],
      test_refs: [''],
    }),
  ).toThrow(/implementation result test references/);
});

test('rejects foreign action, stale final fingerprint, and inconsistent verdict', () => {
  const base = {
    repositoryRoot: root,
    config,
    packet,
    implementationResult: result,
    journal,
    actionId: request.action_id,
    authority,
  };
  expect(() => issueObservedValidationReceipt({ ...base, actionId: 'f'.repeat(64) })).toThrow(/persisted observation/);
  expect(() =>
    issueObservedValidationReceipt({
      ...base,
      implementationResult: { ...result, implementation_fingerprint: 'f'.repeat(64) },
    }),
  ).toThrow();
  expect(() => parseObservedValidatorVerdict({ ...observation, status: 'reported_failed' })).toThrow(/status differs/);
  for (const evidence_refs of [
    ['../outside.txt'],
    ['vida-agent/TESTING.md#../outside.txt'],
    ['https://example.com/report'],
    ['C:/outside.txt'],
    ['agent-runtime-new\\TESTING.md'],
  ]) {
    const unsafeSummary = JSON.stringify({
      schema: 'VidaValidatorVerdict/v1',
      verdict: 'pass',
      findings: [],
      evidence_refs,
    });
    expect(() => parseObservedValidatorVerdict({ ...observation, summary: unsafeSummary, evidence_refs })).toThrow(
      /safe internal citation/,
    );
  }
  expect(() =>
    issueObservedValidationReceipt({
      ...base,
      journal: {
        state: {
          ...journal.state,
          completed: [
            {
              step_id: 'wave-' + waveIndex,
              items: [{ request: { ...request, role: 'requirements-validator' }, issue_id: issueId, observation }],
            },
          ],
        },
      },
    }),
  ).toThrow(/configured stage/);
});

test('builds implementation evidence from one durably completed native attempt and current bytes', () => {
  const developerWave = compileDevelopmentWorkflow(config, selection.team, 'implementation_change', []).waves.findIndex(
    (wave) => wave.some((stage) => stage.kind === 'develop'),
  );
  const developer = sessionActionsForWave(config, selection, context, 'implementation_change', developerWave, [])[0];
  const attemptId = 'd'.repeat(64);
  const developIssue = randomUUID();
  const developSummary = 'Observed bounded fixture execution';
  const developObservation = {
    schema: 'VidaSessionObservation/v1',
    action_id: developer.action_id,
    issue_id: developIssue,
    host_attempt_id: attemptId,
    changed_paths: [],
    agent_id: 'native-developer',
    tool_call_ref: 'native-developer-ref',
    status: 'reported_complete',
    summary: developSummary,
    output_digest: canonicalJsonDigest(developSummary),
    evidence_refs: [],
  };
  const developRequest = {
    ...request,
    wave_index: developerWave,
    action_id: developer.action_id,
    assignment_index: developer.assignment_index,
    stage_id: developer.stage_id,
    role: developer.role,
  };
  const state = {
    ...journal.state,
    completed: [
      {
        step_id: 'wave-' + developerWave,
        items: [
          {
            request: developRequest,
            issue_id: developIssue,
            observation: developObservation,
            host_reservation: { receipt: { attempt: { attempt_id: attemptId } } },
          },
        ],
      },
    ],
  };
  const developmentJournal = { state, version: { revision: 1, digest: canonicalJsonDigest(state) } };
  const host = {
    work: {
      binding: {
        lifecycle_work_id: workId,
        work_source_revision: initial.digest,
        config_digest: runtimeConfigDigest(config),
      },
      execution: {
        run_id: request.run_id,
        assignment_attempts: [
          {
            attempt_id: attemptId,
            stage_id: developer.stage_id,
            assignment_index: developer.assignment_index,
            status: 'completed',
            result_digest: canonicalJsonDigest(developObservation),
          },
        ],
      },
    },
  };
  const actual = buildAdmittedImplementationResult({
    repositoryRoot: root,
    config,
    packet,
    host,
    ledger: developmentJournal,
  });
  expect(actual.implementation_fingerprint).toBe(initial.digest);
  expect(actual.test_refs).toEqual([]);
  expect(() =>
    buildAdmittedImplementationResult({
      repositoryRoot: root,
      config,
      packet,
      host: {
        work: {
          ...host.work,
          execution: {
            ...host.work.execution,
            assignment_attempts: [{ ...host.work.execution.assignment_attempts[0], status: 'started' }],
          },
        },
      },
      ledger: developmentJournal,
    }),
  ).toThrow(/durably completed/);
});
