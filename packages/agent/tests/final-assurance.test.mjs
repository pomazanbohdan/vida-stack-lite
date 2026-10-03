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
} from '../src/orchestration/final-assurance.ts';
test('settled validator inspection permits test.read without granting unknown or executable capabilities', () => {
  const request = {
    workflow_id: 'task',
    stage_id: 'validate_focused',
    assignment_index: 0,
    role: 'correctness-validator',
  };
  const config = {
    workflows: {
      task: {
        stages: [
          { id: 'validate_focused', kind: 'validate', assignments: [{ role: request.role, profile: 'validator' }] },
        ],
      },
    },
    agents: {
      profiles: { validator: { mutation_scope: 'none', tools_policy: 'inspect', egress_policy: 'none' } },
      tool_policies: { inspect: { source_write: false, allowed_tools: ['runtime.read', 'source.read', 'test.read'] } },
      egress_policies: { none: { allowed_hosts: [] } },
    },
  };
  expect(configuredReadonlyAssignment(config, request, 'settled-validation')).toBe(true);
  expect(configuredReadonlyAssignment(config, request)).toBe(false);
  expect(eligibleReadonlyRelinquishment(config, { request, issue_id: 'unknown', observation: null })).toBe(false);
  for (const tool of ['test.execute', 'runtime.write', 'source.write', 'delivery.write', 'unknown']) {
    const candidate = structuredClone(config);
    candidate.agents.tool_policies.inspect.allowed_tools.push(tool);
    expect(configuredReadonlyAssignment(candidate, request, 'settled-validation')).toBe(false);
  }
  for (const change of [
    (c) => {
      c.workflows.task.stages[0].kind = 'test';
    },
    (c) => {
      c.workflows.task.stages.push(structuredClone(c.workflows.task.stages[0]));
    },
    (c) => {
      c.agents.profiles.validator.mutation_scope = 'repository_source';
    },
    (c) => {
      c.agents.tool_policies.inspect.source_write = true;
    },
  ]) {
    const candidate = structuredClone(config);
    change(candidate);
    expect(configuredReadonlyAssignment(candidate, request, 'settled-validation')).toBe(false);
  }
  expect(configuredReadonlyAssignment(config, { ...request, role: 'developer' }, 'settled-validation')).toBe(false);
  expect(configuredReadonlyAssignment(config, { ...request, assignment_index: -1 }, 'settled-validation')).toBe(false);
});
const packet = {
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
const checks = { scope_and_trace: 'pass', tests_security_rollback: 'pass', evidence_invalidation_binding: 'pass' };
function review(state, index) {
  const a = state.actions[index];
  return {
    schema: 'FinalAssuranceReview/v1',
    work_id: packet.work_id,
    attempt: 1,
    packet_id: packet.packet_id,
    action_id: a.action_id,
    issue_id: a.issue_id,
    generation: 1,
    implementation_fingerprint: packet.implementation_fingerprint,
    scope_id: packet.scope_id,
    agent_id: 'reviewer-' + index,
    history_id: 'fresh-history-' + index,
    tool_call_ref: 'local:review-' + index,
    verdict: 'pass',
    evidence_refs: ['local://observed/review-' + index],
    perspective: a.perspective,
    findings: [],
    checks,
  };
}
function reviewed() {
  let s = issueFinalAssuranceWave(createFinalAssuranceState(packet));
  for (let i = 0; i < 3; i++) s = reportFinalAssurance(s, review(s, i));
  return s;
}
function reverse(s, index) {
  const a = s.actions[index + 3],
    prior = s.actions[index],
    { schema: _schema, perspective: _perspective, findings: _findings, ...binding } = review(s, index);
  return {
    ...binding,
    schema: 'FinalAssuranceReverse/v1',
    action_id: a.action_id,
    issue_id: a.issue_id,
    tool_call_ref: 'local:reverse-' + index,
    evidence_refs: ['local://observed/reverse-' + index],
    review_action_id: prior.action_id,
    review_issue_id: prior.issue_id,
  };
}
test('two reviewers cannot advance; three pairs satisfy only the reviewed gate', () => {
  let s = issueFinalAssuranceWave(createFinalAssuranceState(packet));
  for (let i = 0; i < 2; i++) s = reportFinalAssurance(s, review(s, i));
  expect(finalAssuranceStatus(s)).toBe('issued_outcome_uncertain');
  expect(() => issueFinalAssuranceWave(s)).toThrow();
  s = reportFinalAssurance(s, review(s, 2));
  const issued = issueFinalAssuranceWave(s);
  validateFinalAssuranceProgress(s, issued);
  s = issued;
  for (let i = 0; i < 3; i++) {
    const next = reportFinalAssurance(s, reverse(s, i));
    validateFinalAssuranceProgress(s, next);
    s = next;
  }
  expect(finalAssuranceStatus(s)).toBe('reviewed');
});
test('unissued foreign stale and self-review observations are denied', () => {
  const blank = createFinalAssuranceState(packet),
    s = issueFinalAssuranceWave(blank),
    r = review(s, 0);
  expect(() => reportFinalAssurance(blank, r)).toThrow();
  for (const changed of [
    { work_id: 'foreign' },
    { generation: 2 },
    { implementation_fingerprint: 'c'.repeat(64) },
    { scope_id: 'other' },
    { agent_id: 'writer' },
  ])
    expect(() => reportFinalAssurance(s, { ...r, ...changed })).toThrow();
});
test('actor history and tool call uniqueness are enforced; exact report retry preserves identity', () => {
  let s = issueFinalAssuranceWave(createFinalAssuranceState(packet));
  const first = review(s, 0);
  s = reportFinalAssurance(s, first);
  expect(reportFinalAssurance(s, first)).toBe(s);
  expect(() => reportFinalAssurance(s, { ...first, findings: ['changed'] })).toThrow();
  const second = review(s, 1);
  for (const changed of [
    { agent_id: first.agent_id },
    { history_id: first.history_id },
    { tool_call_ref: first.tool_call_ref },
  ])
    expect(() => reportFinalAssurance(s, { ...second, ...changed })).toThrow();
});
test('reverse must match its reviewer and review using a distinct tool call', () => {
  const s = issueFinalAssuranceWave(reviewed()),
    r = reverse(s, 0);
  for (const changed of [
    { agent_id: 'other' },
    { history_id: 'other' },
    { review_action_id: s.actions[1].action_id },
    { review_issue_id: s.actions[1].issue_id },
    { tool_call_ref: s.actions[0].observation.tool_call_ref },
  ])
    expect(() => reportFinalAssurance(s, { ...r, ...changed })).toThrow();
});
test('failed explicit checks cannot pass; accepted FAIL remains blocked', () => {
  const s = issueFinalAssuranceWave(createFinalAssuranceState(packet)),
    r = review(s, 0);
  expect(() =>
    reportFinalAssurance(s, { ...r, checks: { ...checks, evidence_invalidation_binding: 'fail' } }),
  ).toThrow();
  const failed = reportFinalAssurance(s, { ...r, verdict: 'fail', findings: ['actual defect'] });
  expect(finalAssuranceStatus(failed)).toBe('blocked');
  expect(() => issueFinalAssuranceWave(failed)).toThrow();
});
test('persisted foreign proof and duplicate issue IDs are rejected on read', () => {
  const bad = structuredClone(reviewed());
  bad.actions[0].observation.work_id = 'foreign';
  expect(() => validateFinalAssuranceState(bad)).toThrow();
  const duplicated = structuredClone(issueFinalAssuranceWave(createFinalAssuranceState(packet)));
  duplicated.actions[1].issue_id = duplicated.actions[0].issue_id;
  expect(() => validateFinalAssuranceState(duplicated)).toThrow();
});
