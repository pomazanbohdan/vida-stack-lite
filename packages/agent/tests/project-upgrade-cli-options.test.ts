import { expect, test } from 'bun:test';
import { assertReconcileOptionKeys, reconcileExpectedOptions } from '../bin/reconcile-cli-contracts.ts';

const resume = {
  '--kind': 'project-upgrade',
  '--mode': 'resume',
  '--project-root': '/owned-project',
  '--repair-id': 'same-operation',
};

test('project upgrade resume accepts the declared default-false omission', () => {
  expect(reconcileExpectedOptions('project-upgrade', 'resume', resume)?.sort()).toEqual(Object.keys(resume).sort());
  expect(() => assertReconcileOptionKeys(resume, 'project-upgrade', 'resume')).not.toThrow();
});

test('project upgrade resume accepts either explicit reconciliation value', () => {
  for (const flag of ['true', 'false']) {
    const values = { ...resume, '--reconcile-unknown': flag };
    expect(() => assertReconcileOptionKeys(values, 'project-upgrade', 'resume')).not.toThrow();
    expect(reconcileExpectedOptions('project-upgrade', 'resume', values)?.sort()).toEqual(Object.keys(values).sort());
  }
});

test('project upgrade still rejects missing required and foreign option keys', () => {
  const missingRoot = { '--kind': 'project-upgrade', '--mode': 'resume', '--repair-id': 'same-operation' };
  expect(() => assertReconcileOptionKeys(missingRoot, 'project-upgrade', 'resume')).toThrow();
  expect(() => assertReconcileOptionKeys({ ...resume, '--actor': 'foreign' }, 'project-upgrade', 'resume')).toThrow();
  expect(() => assertReconcileOptionKeys(resume, 'project-upgrade', 'unsupported')).toThrow();
});
