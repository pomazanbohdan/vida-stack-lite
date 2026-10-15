import assert from 'node:assert/strict';
import { test } from 'bun:test';
import {
  parseWorkflowApprovalConsumptionRecord,
  workflowApprovalConsumptionRecordSchema,
} from '../src/governance/workflow-approval-consumption-contract.ts';
import { validateHostWorkflowApprovalRecord } from '../src/governance/edictum-boundary.ts';

function reservedRecord() {
  return {
    schema: 'EdictumWorkflowApprovalConsumption/v1',
    store_id: 'store-1',
    store_generation: '12345678-1234-1234-1234-123456789abc',
    binding: {
      stage_id: 'stage-1',
      approval_id: 'approval-1',
      operation_hash: 'a'.repeat(64),
      tenant: 'tenant-1',
      project: 'project-1',
    },
    fencing_token: 'abcdef12-1234-1234-1234-123456789abc',
    status: 'reserved',
    reserved_at: '2026-10-15T00:00:00Z',
    approval_expires_at: null,
    attempt_id: null,
  };
}

function rejectRecord(value: unknown): void {
  assert.equal(workflowApprovalConsumptionRecordSchema.safeParse(value).success, false);
  assert.throws(() => parseWorkflowApprovalConsumptionRecord(value), {
    name: 'Error',
    message: 'host workflow approval record is invalid',
  });
  assert.throws(() => validateHostWorkflowApprovalRecord(value), {
    name: 'Error',
    message: 'host workflow approval record is invalid',
  });
}

test('reserved approval has its exact shape and parsing remains normalization without authority', () => {
  const input = reservedRecord();
  const parsed = parseWorkflowApprovalConsumptionRecord(input);
  assert.deepEqual(parsed, input);
  assert.notEqual(parsed, input);
  assert.notEqual(parsed.binding, input.binding);
  assert.equal(Object.hasOwn(parsed, 'terminal_at'), false);
  assert.deepEqual(validateHostWorkflowApprovalRecord(input), parsed);
  assert.deepEqual(input, reservedRecord());
});

for (const value of [undefined, '2026-10-15T00:00:01Z', null]) {
  test(`reserved approval rejects present terminal_at ${String(value)}`, () => {
    rejectRecord({ ...reservedRecord(), terminal_at: value });
  });
}

for (const status of ['commit_unknown', 'applied', 'aborted']) {
  test(`${status} approval requires its terminal timestamp`, () => {
    const input = { ...reservedRecord(), status, terminal_at: '2026-10-15T00:00:01Z' };
    assert.deepEqual(parseWorkflowApprovalConsumptionRecord(input), input);
    rejectRecord({ ...reservedRecord(), status });
    for (const terminal_at of [undefined, null, '2026-02-30T00:00:00Z', '2026-10-15', 42])
      rejectRecord({ ...input, terminal_at });
  });
}

test('approval rejects unknown status, extra fields and missing required keys at both record levels', () => {
  rejectRecord({ ...reservedRecord(), status: 'unknown' });
  rejectRecord({ ...reservedRecord(), extra: undefined });
  const { approval_expires_at: omitted, ...missing } = reservedRecord();
  assert.equal(omitted, null);
  rejectRecord(missing);
  rejectRecord({ ...reservedRecord(), binding: { ...reservedRecord().binding, extra: undefined } });
  const { tenant: omittedTenant, ...missingTenant } = reservedRecord().binding;
  assert.equal(omittedTenant, 'tenant-1');
  rejectRecord({ ...reservedRecord(), binding: missingTenant });
});

for (const key of ['stage_id', 'approval_id', 'tenant', 'project'] as const) {
  test(`${key} preserves Edictum ASCII identity syntax and 128-character boundary`, () => {
    for (const value of ['a'.repeat(128), 'identity:sub-id_1.2']) {
      const input = { ...reservedRecord(), binding: { ...reservedRecord().binding, [key]: value } };
      assert.deepEqual(parseWorkflowApprovalConsumptionRecord(input), input);
    }
    for (const value of ['', 'a'.repeat(129), 'space id', 'path/id', 'ідентифікатор', '.id', 1])
      rejectRecord({ ...reservedRecord(), binding: { ...reservedRecord().binding, [key]: value } });
  });
}

test('store, fencing and digest rules remain distinct from approval identity rules', () => {
  for (const store_id of ['a'.repeat(128), 'store-id_1.2']) {
    const input = { ...reservedRecord(), store_id };
    assert.deepEqual(parseWorkflowApprovalConsumptionRecord(input), input);
  }
  for (const store_id of ['.', '..', 'a'.repeat(129), 'store:id', 'store/id'])
    rejectRecord({ ...reservedRecord(), store_id });
  const upper = {
    ...reservedRecord(),
    store_generation: reservedRecord().store_generation.toUpperCase(),
    fencing_token: reservedRecord().fencing_token.toUpperCase(),
    attempt_id: 'b'.repeat(64),
  };
  assert.deepEqual(parseWorkflowApprovalConsumptionRecord(upper), upper);
  for (const value of ['A'.repeat(64), 'a'.repeat(63), 'g'.repeat(64), 42]) {
    rejectRecord({ ...reservedRecord(), attempt_id: value });
    rejectRecord({ ...reservedRecord(), binding: { ...reservedRecord().binding, operation_hash: value } });
  }
  rejectRecord({ ...reservedRecord(), fencing_token: 'not-a-fencing-token' });
  rejectRecord({ ...reservedRecord(), store_generation: 'not-a-generation' });
  rejectRecord({ ...reservedRecord(), reserved_at: '2026-02-30T00:00:00Z' });
  rejectRecord({ ...reservedRecord(), approval_expires_at: '2026-10-15' });
});

test('approval accepts null-prototype data and rejects nonplain records and bindings', () => {
  const input = reservedRecord();
  Object.setPrototypeOf(input, null);
  Object.setPrototypeOf(input.binding, null);
  assert.deepEqual(parseWorkflowApprovalConsumptionRecord(input), reservedRecord());
  for (const value of [null, undefined, [], 1, 'record']) rejectRecord(value);
  rejectRecord(Object.setPrototypeOf(reservedRecord(), { classMarker: true }));
  const nonplainBinding = reservedRecord().binding;
  Object.setPrototypeOf(nonplainBinding, {});
  rejectRecord({ ...reservedRecord(), binding: nonplainBinding });
});

test('approval requires its record and binding fields to be own enumerable keys', () => {
  for (const key of Object.keys(reservedRecord())) {
    const input = reservedRecord();
    Object.defineProperty(input, key, { enumerable: false });
    rejectRecord(input);
  }
  for (const key of Object.keys(reservedRecord().binding)) {
    const input = reservedRecord();
    Object.defineProperty(input.binding, key, { enumerable: false });
    rejectRecord(input);
  }
  const terminal = { ...reservedRecord(), status: 'applied', terminal_at: '2026-10-15T00:00:01Z' };
  Object.defineProperty(terminal, 'terminal_at', { enumerable: false });
  rejectRecord(terminal);
});

for (const [label, failure] of [
  ['error', new Error('getter failed')],
  ['undefined', undefined],
] as const) {
  test(`approval parser preserves an exceptional ${label} from its input`, () => {
    const input = reservedRecord();
    Object.defineProperty(input, 'status', {
      enumerable: true,
      get() {
        throw failure;
      },
    });
    let didThrow = false;
    let thrown: unknown;
    try {
      parseWorkflowApprovalConsumptionRecord(input);
    } catch (error: unknown) {
      didThrow = true;
      thrown = error;
    }
    assert.ok(didThrow);
    assert.equal(thrown, failure);
  });
}
