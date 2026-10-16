import { test, expect } from 'bun:test';
import {
  createFinalAssuranceState,
  issueFinalAssuranceWave,
  reportFinalAssurance,
  finalAssuranceStatus,
  validateFinalAssuranceState,
  validateFinalAssuranceProgress,
  configuredReadonlyAssignment,
  eligibleReadonlyRelinquishment,
  type FinalAssurancePacket,
  type FinalAssuranceState,
} from '../src/orchestration/final-assurance.ts';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import { configuredTestContext } from './configured-context.ts';
import type { SessionBridgeRequest } from '../src/orchestration/mastra-session-bridge-contract.ts';
import { expectReturned } from './helpers/expect-rejection.ts';

test('settled validator inspection permits test.read without granting unknown or executable capabilities', () => {
  const request = {
    schema: 'VidaSessionRequest/v1',
    run_id: 'final-assurance-run',
    workflow_id: 'task',
    wave_index: 0,
    action_id: 'a'.repeat(64),
    stage_id: 'validate_focused',
    assignment_index: 0,
    role: 'correctness-validator',
    config_digest: 'b'.repeat(64),
    scope_digest: 'c'.repeat(64),
    bindings_manifest_ref: 'd'.repeat(64),
  } satisfies SessionBridgeRequest;
  const baseConfig = configuredTestContext().config;
  const baseWorkflow = baseConfig.workflows.task_execution!;
  const config: AgentRuntimeConfig = {
    ...baseConfig,
    workflows: {
      ...baseConfig.workflows,
      task: {
        ...baseWorkflow,
        stages: baseWorkflow.stages.map((stage) =>
          stage.id === request.stage_id
            ? { ...stage, assignments: [{ role: request.role, profile: 'validator' }] }
            : stage,
        ),
      },
    },
    agents: {
      ...baseConfig.agents,
      profiles: {
        ...baseConfig.agents.profiles,
        validator: {
          ...baseConfig.agents.profiles['reviewer-correctness']!,
          mutation_scope: 'none',
          tools_policy: 'inspect',
          egress_policy: 'none',
        },
      },
      tool_policies: {
        ...baseConfig.agents.tool_policies,
        inspect: { source_write: false, allowed_tools: ['runtime.read', 'source.read', 'test.read'] },
      },
      egress_policies: { ...baseConfig.agents.egress_policies, none: { allowed_hosts: [] } },
    },
  };
  expect(expectReturned(() => configuredReadonlyAssignment(config, request, 'settled-validation'))).toBe(true);
  expect(configuredReadonlyAssignment(config, request)).toBe(false);
  expect(eligibleReadonlyRelinquishment(config, { request, issue_id: 'unknown', observation: null })).toBe(false);
  const readonlyConfig: AgentRuntimeConfig = {
    ...config,
    agents: {
      ...config.agents,
      tool_policies: {
        ...config.agents.tool_policies,
        inspect: {
          ...config.agents.tool_policies.inspect!,
          allowed_tools: ['runtime.read', 'source.read', 'docs.read', 'web.search'],
        },
      },
    },
  };
  expect(configuredReadonlyAssignment(readonlyConfig, request)).toBe(true);
  const unobservedUnknown = { request, issue_id: 'unknown', observation: null };
  expect(eligibleReadonlyRelinquishment(readonlyConfig, unobservedUnknown)).toBe(true);
  const configuredHost: AgentRuntimeConfig = {
    ...readonlyConfig,
    agents: {
      ...readonlyConfig.agents,
      egress_policies: {
        ...readonlyConfig.agents.egress_policies,
        none: { allowed_hosts: ['api.example.org'] },
      },
    },
  };
  expect(configuredReadonlyAssignment(configuredHost, request)).toBe(true);
  expect(eligibleReadonlyRelinquishment(configuredHost, unobservedUnknown)).toBe(false);
  expect(unobservedUnknown.observation).toBeNull();
  for (const host of ['', '-edge.example', 'edge-.example', 'edge.example.1a']) {
    const invalidHost: AgentRuntimeConfig = {
      ...readonlyConfig,
      agents: {
        ...readonlyConfig.agents,
        egress_policies: {
          ...readonlyConfig.agents.egress_policies,
          none: { allowed_hosts: [host] },
        },
      },
    };
    expect(configuredReadonlyAssignment(invalidHost, request)).toBe(false);
  }
  for (const tool of ['test.execute', 'runtime.write', 'source.write', 'delivery.write', 'unknown']) {
    const candidate: AgentRuntimeConfig = {
      ...config,
      agents: {
        ...config.agents,
        tool_policies: {
          ...config.agents.tool_policies,
          inspect: {
            ...config.agents.tool_policies.inspect!,
            allowed_tools: [...config.agents.tool_policies.inspect!.allowed_tools, tool],
          },
        },
      },
    };
    expect(configuredReadonlyAssignment(candidate, request, 'settled-validation')).toBe(false);
  }
  const changes: readonly ((c: AgentRuntimeConfig) => AgentRuntimeConfig)[] = [
    (c) => {
      const candidate = structuredClone(c);
      Object.defineProperty(
        candidate.workflows.task!.stages.find((stage) => stage.id === request.stage_id)!,
        'kind',
        { value: 'test' },
      );
      return candidate;
    },
    (c) => ({
      ...c,
      workflows: {
        ...c.workflows,
        task: {
          ...c.workflows.task!,
          stages: [
            ...c.workflows.task!.stages,
            structuredClone(c.workflows.task!.stages.find((stage) => stage.id === request.stage_id)!),
          ],
        },
      },
    }),
    (c) => {
      const candidate = structuredClone(c);
      Object.defineProperty(candidate.agents.profiles.validator!, 'mutation_scope', { value: 'repository_source' });
      return candidate;
    },
    (c) => ({
      ...c,
      agents: {
        ...c.agents,
        tool_policies: {
          ...c.agents.tool_policies,
          inspect: { ...c.agents.tool_policies.inspect!, source_write: true },
        },
      },
    }),
  ];
  for (const change of changes) {
    const candidate = change(config);
    expect(configuredReadonlyAssignment(candidate, request, 'settled-validation')).toBe(false);
  }
  expect(configuredReadonlyAssignment(config, { ...request, role: 'developer' }, 'settled-validation')).toBe(false);
  expect(configuredReadonlyAssignment(config, { ...request, assignment_index: -1 }, 'settled-validation')).toBe(false);
});

const packet: FinalAssurancePacket = {
  schema: 'FinalAssurancePacket/v1',
  packet_id: 'packet-one',
  work_id: 'same-work',
  attempt: 1,
  source_revision: 'source-one',
  scope_id: 'scope-one',
  config_digest: 'a'.repeat(64),
  implementation_fingerprint: 'b'.repeat(64),
  generation: 1,
  ac_ids: ['AC-ONE'],
  excluded_actor_ids: ['writer', 'focused-validator'],
  preparation_path: '.agent/work/same-work/preparation.json',
  role: 'validator',
  model: 'configured-model',
  reasoning: 'medium',
};
const checks = {
  scope_and_trace: 'pass',
  tests_security_rollback: 'pass',
  evidence_invalidation_binding: 'pass',
} as const;
function review(state: FinalAssuranceState, index: number) {
  const action = state.actions[index]!;
  return {
    schema: 'FinalAssuranceReview/v1' as const,
    work_id: packet.work_id,
    attempt: 1,
    packet_id: packet.packet_id,
    action_id: action.action_id,
    issue_id: action.issue_id,
    generation: 1,
    implementation_fingerprint: packet.implementation_fingerprint,
    scope_id: packet.scope_id,
    agent_id: 'reviewer-' + index,
    history_id: 'fresh-history-' + index,
    tool_call_ref: 'local:review-' + index,
    verdict: 'pass' as const,
    evidence_refs: ['local://observed/review-' + index],
    perspective: action.perspective,
    findings: [],
    checks,
  };
}
function reviewed(): FinalAssuranceState {
  let state = expectReturned(() => issueFinalAssuranceWave(expectReturned(() => createFinalAssuranceState(packet))));
  for (let index = 0; index < 3; index += 1)
    state = expectReturned(() => reportFinalAssurance(state, review(state, index)));
  return state;
}
function reverse(state: FinalAssuranceState, index: number) {
  const action = state.actions[index + 3]!;
  const prior = state.actions[index]!;
  const { schema: _schema, perspective: _perspective, findings: _findings, ...binding } = review(state, index);
  return {
    ...binding,
    schema: 'FinalAssuranceReverse/v1' as const,
    action_id: action.action_id,
    issue_id: action.issue_id,
    tool_call_ref: 'local:reverse-' + index,
    evidence_refs: ['local://observed/reverse-' + index],
    review_action_id: prior.action_id,
    review_issue_id: prior.issue_id,
  };
}
test('progress admits only a complete issued wave and one report per commit', () => {
  const initial = expectReturned(() => createFinalAssuranceState(packet));
  expect(expectReturned(() => finalAssuranceStatus(initial))).toBe('ready');
  expectReturned(() => validateFinalAssuranceProgress(null, initial));

  const issued = expectReturned(() => issueFinalAssuranceWave(initial));
  expect(issued.actions.filter((action) => action.issue_id !== null)).toHaveLength(3);
  expect(issued.actions.filter((action) => action.kind === 'reverse' && action.issue_id !== null)).toHaveLength(0);
  expectReturned(() => validateFinalAssuranceProgress(initial, issued));

  const partialIssue = structuredClone(initial);
  partialIssue.actions[0]!.issue_id = issued.actions[0]!.issue_id;
  expect(() => validateFinalAssuranceProgress(initial, partialIssue)).toThrow(
    'GAP-FINAL-ASSURANCE-001: issue must bind the complete ready wave',
  );

  const oneReported = expectReturned(() => reportFinalAssurance(issued, review(issued, 0)));
  expectReturned(() => validateFinalAssuranceProgress(issued, oneReported));
  const twoReported = expectReturned(() => reportFinalAssurance(oneReported, review(oneReported, 1)));
  expect(() => validateFinalAssuranceProgress(issued, twoReported)).toThrow(
    'GAP-FINAL-ASSURANCE-001: one report is committed at a time',
  );
  expect(issued.actions.every((action) => action.observation === null)).toBe(true);
});
test('two reviewers cannot advance; three pairs satisfy only the reviewed gate', () => {
  let state = expectReturned(() => issueFinalAssuranceWave(expectReturned(() => createFinalAssuranceState(packet))));
  for (let index = 0; index < 2; index += 1)
    state = expectReturned(() => reportFinalAssurance(state, review(state, index)));
  expect(expectReturned(() => finalAssuranceStatus(state))).toBe('issued_outcome_uncertain');
  expect(() => issueFinalAssuranceWave(state)).toThrow();
  state = expectReturned(() => reportFinalAssurance(state, review(state, 2)));
  const issued = expectReturned(() => issueFinalAssuranceWave(state));
  expectReturned(() => validateFinalAssuranceProgress(state, issued));
  state = issued;
  for (let index = 0; index < 3; index += 1) {
    const next = expectReturned(() => reportFinalAssurance(state, reverse(state, index)));
    expectReturned(() => validateFinalAssuranceProgress(state, next));
    state = next;
  }
  expect(expectReturned(() => finalAssuranceStatus(state))).toBe('reviewed');
});
test('unissued foreign stale and self-review observations are denied', () => {
  const blank = expectReturned(() => createFinalAssuranceState(packet));
  const state = expectReturned(() => issueFinalAssuranceWave(blank));
  const observation = review(state, 0);
  expect(() => reportFinalAssurance(blank, observation)).toThrow();
  for (const changed of [
    { work_id: 'foreign' },
    { generation: 2 },
    { implementation_fingerprint: 'c'.repeat(64) },
    { scope_id: 'other' },
    { agent_id: 'writer' },
  ])
    expect(() => reportFinalAssurance(state, { ...observation, ...changed })).toThrow();
});
test('actor history and tool call uniqueness are enforced; exact report retry preserves identity', () => {
  let state = expectReturned(() => issueFinalAssuranceWave(expectReturned(() => createFinalAssuranceState(packet))));
  const first = review(state, 0);
  state = expectReturned(() => reportFinalAssurance(state, first));
  expect(expectReturned(() => reportFinalAssurance(state, first))).toBe(state);
  expect(() => reportFinalAssurance(state, { ...first, findings: ['changed'] })).toThrow();
  const second = review(state, 1);
  for (const changed of [
    { agent_id: first.agent_id },
    { history_id: first.history_id },
    { tool_call_ref: first.tool_call_ref },
  ])
    expect(() => reportFinalAssurance(state, { ...second, ...changed })).toThrow();
});
test('reverse must match its reviewer and review using a distinct tool call', () => {
  const state = expectReturned(() => issueFinalAssuranceWave(reviewed()));
  const observation = reverse(state, 0);
  for (const changed of [
    { agent_id: 'other' },
    { history_id: 'other' },
    { review_action_id: state.actions[1]!.action_id },
    { review_issue_id: state.actions[1]!.issue_id },
    { tool_call_ref: state.actions[0]!.observation!.tool_call_ref },
  ])
    expect(() => reportFinalAssurance(state, { ...observation, ...changed })).toThrow();
});
test('failed explicit checks cannot pass; accepted FAIL remains blocked', () => {
  const state = expectReturned(() => issueFinalAssuranceWave(expectReturned(() => createFinalAssuranceState(packet))));
  const observation = review(state, 0);
  expect(() =>
    reportFinalAssurance(state, { ...observation, checks: { ...checks, evidence_invalidation_binding: 'fail' } }),
  ).toThrow();
  const failed = expectReturned(() =>
    reportFinalAssurance(state, { ...observation, verdict: 'fail', findings: ['actual defect'] }),
  );
  expect(expectReturned(() => finalAssuranceStatus(failed))).toBe('blocked');
  expect(() => issueFinalAssuranceWave(failed)).toThrow();
});
test('persisted foreign proof and duplicate issue IDs are rejected on read', () => {
  const bad = structuredClone(reviewed());
  bad.actions[0]!.observation!.work_id = 'foreign';
  expect(() => validateFinalAssuranceState(bad)).toThrow();
  const duplicated = structuredClone(
    expectReturned(() => issueFinalAssuranceWave(expectReturned(() => createFinalAssuranceState(packet)))),
  );
  duplicated.actions[1]!.issue_id = duplicated.actions[0]!.issue_id;
  expect(() => validateFinalAssuranceState(duplicated)).toThrow();
});

test('persisted observations cannot replay a tool call or reviewer history', () => {
  const valid = reviewed();
  const replayedTool = structuredClone(valid);
  replayedTool.actions[1]!.observation!.tool_call_ref = replayedTool.actions[0]!.observation!.tool_call_ref;
  expect(() => validateFinalAssuranceState(replayedTool)).toThrow('GAP-FINAL-ASSURANCE-001: duplicate tool references');

  const replayedHistory = structuredClone(valid);
  replayedHistory.actions[1]!.observation!.history_id = replayedHistory.actions[0]!.observation!.history_id;
  expect(() => validateFinalAssuranceState(replayedHistory)).toThrow(
    'GAP-FINAL-ASSURANCE-001: duplicate reviewers or histories',
  );
});

test('progress rejects a no-op and replacement of the sealed packet', () => {
  const initial = expectReturned(() => createFinalAssuranceState(packet));
  expect(() => validateFinalAssuranceProgress(initial, initial)).toThrow(
    'GAP-FINAL-ASSURANCE-001: assurance CAS must make progress',
  );

  const replacement = expectReturned(() => createFinalAssuranceState({ ...packet, scope_id: 'replacement-scope' }));
  expect(() => validateFinalAssuranceProgress(initial, replacement)).toThrow(
    'GAP-FINAL-ASSURANCE-001: sealed packet cannot be replaced',
  );
});
