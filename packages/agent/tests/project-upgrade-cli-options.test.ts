import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runProjectUpgradeRepair } from '../bin/project-upgrade-repair.ts';
import { assertReconcileOptionKeys, reconcileExpectedOptions } from '../bin/reconcile-cli-contracts.ts';
import { cliMetadataResult } from '../bin/cli-metadata.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

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

test('project upgrade resume help reports the omitted reconciliation value as false', () => {
  const help = cliMetadataResult(['reconcile-artifacts', '--help', 'project-upgrade', 'resume'], {});
  if (!help || typeof help !== 'object' || !('optionDetails' in help) || !Array.isArray(help.optionDetails))
    throw new Error('project upgrade resume help is unavailable');
  const reconcileUnknown = help.optionDetails.find(
    (option: unknown) =>
      !!option && typeof option === 'object' && 'name' in option && option.name === '--reconcile-unknown',
  );
  expect(reconcileUnknown).toMatchObject({
    name: '--reconcile-unknown',
    values: ['true', 'false'],
    required: false,
    default: 'false',
  });

  const optionalWithoutBehavioralDefault = cliMetadataResult(
    ['reconcile-artifacts', '--help', 'runtime-config-delivery', 'repair-inspect'],
    {},
  );
  if (
    !optionalWithoutBehavioralDefault ||
    typeof optionalWithoutBehavioralDefault !== 'object' ||
    !('optionDetails' in optionalWithoutBehavioralDefault) ||
    !Array.isArray(optionalWithoutBehavioralDefault.optionDetails)
  )
    throw new Error('runtime config delivery repair inspect help is unavailable');
  const publishOperation = optionalWithoutBehavioralDefault.optionDetails.find(
    (option: unknown) =>
      !!option && typeof option === 'object' && 'name' in option && option.name === '--publish-operation',
  );
  expect(publishOperation).toMatchObject({ name: '--publish-operation', required: false, default: 'not supplied' });
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

test('project upgrade resume rejects a malformed UNKNOWN policy before repository access', async () => {
  const root = path.join(tmpdir(), `vida-project-upgrade-invalid-unknown-${randomUUID()}`);
  expect(existsSync(root)).toBe(false);
  await expectRejection(
    runProjectUpgradeRepair([
      '--kind',
      'project-upgrade',
      '--mode',
      'resume',
      '--project-root',
      root,
      '--repair-id',
      'same-operation',
      '--reconcile-unknown',
      'yes',
    ]),
    'VIDA project upgrade: invalid reconciliation flag',
  );
  expect(existsSync(root)).toBe(false);
});
