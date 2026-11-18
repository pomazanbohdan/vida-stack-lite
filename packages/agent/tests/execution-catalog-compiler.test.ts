import { expect, test } from 'bun:test';
import { deriveWorkflowObligations } from '../src/orchestration/workflow-obligations.ts';
import { validateTestPlan, type TestPlanBinding } from '../src/orchestration/test-plan.ts';

const binding: TestPlanBinding = {
  work_id: 'work-17',
  attempt: 2,
  packet_id: 'packet-17',
  task_contract_digest: 'a'.repeat(64),
  admitted_scenarios: [
    'catalog-t01-bind-testplan-digest-and-packet-ref-without-cycle',
    'catalog-t01-refuse-high-risk-security',
  ],
};
const validPlan = () => ({
  schema: 'TestPlan/v1',
  version: 1,
  work_id: binding.work_id,
  attempt: binding.attempt,
  packet_id: binding.packet_id,
  task_contract_digest: binding.task_contract_digest,
  scenarios: [{ id: binding.admitted_scenarios[0], description: 'Bind the pre-code contract.' }],
});

test('catalog-t01-bind-testplan-digest-and-packet-ref-without-cycle', () => {
  const plan = validateTestPlan(validPlan(), binding);
  const packet = {
    packet_id: binding.packet_id,
    test_plan_ref: {
      work_id: plan.work_id,
      attempt: plan.attempt,
      packet_id: plan.packet_id,
      task_contract_digest: plan.task_contract_digest,
    },
  };
  expect(packet.test_plan_ref).toEqual({
    work_id: plan.work_id,
    attempt: plan.attempt,
    packet_id: plan.packet_id,
    task_contract_digest: plan.task_contract_digest,
  });
  expect(plan.task_contract_digest).toBe('a'.repeat(64));
  expect(Object.isFrozen(plan)).toBe(true);
  for (const field of ['work_id', 'attempt', 'packet_id', 'task_contract_digest'] as const) {
    const changed = validPlan();
    if (field === 'attempt') changed.attempt += 1;
    else changed[field] = field === 'task_contract_digest' ? 'b'.repeat(64) : 'other';
    expect(() => validateTestPlan(changed, binding)).toThrow(/binding/);
  }
  const unknown = validPlan();
  unknown.scenarios.push({ id: 'not-admitted', description: 'Not in the admitted set.' });
  expect(() => validateTestPlan(unknown, binding)).toThrow(/scenario/);
  const duplicate = validPlan();
  duplicate.scenarios.push({ id: binding.admitted_scenarios[0], description: 'Duplicate admitted scenario.' });
  expect(() => validateTestPlan(duplicate, binding)).toThrow(/scenario/);
  const cycle = { ...validPlan(), implementation_fingerprint: 'f'.repeat(64) };
  expect(() => validateTestPlan(cycle, binding)).toThrow();
});

test('catalog-t01-refuse-high-risk-security', () => {
  const obligations = deriveWorkflowObligations({ risk: 'high', effects: ['source_write'], completion: 'source_only' });
  expect(obligations).toMatchObject({
    source_effect: true,
    source_plan_required: true,
    security_prewrite: true,
    focused_security: true,
  });
  expect(() =>
    deriveWorkflowObligations({
      risk: 'high',
      effects: ['source_write'],
      completion: 'source_only',
      configured: { security_prewrite: false },
    } as never),
  ).toThrow();
});

test('catalog-t01-refuse-high-risk-test', () => {
  const obligations = deriveWorkflowObligations({ risk: 'high', effects: ['test_execute'], completion: 'artifact' });
  expect(obligations.independent_tester).toBe(true);
  expect(obligations.independent_review).toBe(true);
  expect(obligations.delivery_prepare).toBe(true);
});

test('catalog-t01-refuse-high-risk-review', () => {
  const obligations = deriveWorkflowObligations({ risk: 'high', effects: ['read'], completion: 'deployment' });
  expect(obligations.security_prewrite).toBe(true);
  expect(obligations.independent_review).toBe(true);
  expect(obligations.deployment_verification).toBe(true);
  expect(obligations.completion).toBe('deployment');
});
