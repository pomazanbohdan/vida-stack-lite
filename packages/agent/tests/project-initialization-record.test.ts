import { expect, test } from 'bun:test';
import {
  readProjectInitializationReceipt,
  validateProjectInitializationReceipt,
} from '../src/config/project-initialization-record.js';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import {
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_INITIALIZATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
} from '../src/config/project-paths.js';

const digest = (value: string): string => value.repeat(64);

function validReceipt(): Record<string, unknown> {
  return {
    schema: 'RuntimeInitialization/v2',
    version: 2,
    provenance: 'project-upgrade',
    repository_id: 'vida-repository',
    project_ids: ['alpha', 'beta'],
    workspace_id: digest('a'),
    workspace_binding_status: 'bound',
    bundle: 'vida-agent@1.2.3',
    bundle_digest: digest('b'),
    config_digest: digest('c'),
    input_digest: digest('d'),
    current_config_digest: digest('e'),
    current_input_digest: digest('f'),
    configuration_rebind_id: null,
    operation_id: 'upgrade-1',
    database_path: PROJECT_WORKSPACE_DATABASE_PATH,
    configuration_inputs: {
      project: PROJECT_CONFIGURATION_PATHS.project,
      agents: PROJECT_CONFIGURATION_PATHS.agents,
      flows: PROJECT_CONFIGURATION_PATHS.flows,
    },
    prepared_artifacts: Array.from({ length: 8 }, (_, index) => ({
      path: `runtime/artifact-${index}.json`,
      sha256: digest('1'),
    })),
    created_at: '2026-10-10T00:00:00.000Z',
  };
}

function accessReturning(bytes: Buffer): SafeRepositoryAccess {
  return {
    readBytes(target: string, label: string): Buffer {
      expect(target).toBe(PROJECT_INITIALIZATION_PATH);
      expect(label).toBe('project initialization receipt');
      return bytes;
    },
  } as unknown as SafeRepositoryAccess;
}

test('validates a complete sorted receipt and freezes an owned snapshot', () => {
  const input = validReceipt();
  const result = validateProjectInitializationReceipt(input);

  expect(result.project_ids).toEqual(['alpha', 'beta']);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.project_ids)).toBe(true);
  expect(Object.isFrozen(result.configuration_inputs)).toBe(true);
  expect(Object.isFrozen(result.prepared_artifacts)).toBe(true);
  expect(Object.isFrozen(result.prepared_artifacts[0])).toBe(true);
  input.project_ids = ['caller-mutated'];
  expect(result.project_ids).toEqual(['alpha', 'beta']);
  expect(Reflect.set(result.project_ids, 2, 'gamma')).toBe(false);
});

test('rejects schema drift, malformed digests, unsorted or duplicate identities, and duplicate artifact paths', () => {
  const invalidValues: unknown[] = [];
  for (const [key, value] of [
    ['schema', 'RuntimeInitialization/v1'],
    ['version', 1],
    ['provenance', 'init'],
    ['workspace_id', 'A'.repeat(64)],
    ['bundle_digest', 'g'.repeat(64)],
    ['database_path', '../workspace.db'],
    ['unexpected', true],
  ] as const) {
    invalidValues.push({ ...validReceipt(), [key]: value });
  }
  invalidValues.push({ ...validReceipt(), project_ids: ['beta', 'alpha'] });
  invalidValues.push({ ...validReceipt(), project_ids: ['alpha', 'alpha'] });
  const duplicateArtifacts = validReceipt();
  const artifacts = duplicateArtifacts.prepared_artifacts as Array<{ path: string; sha256: string }>;
  artifacts[1] = { ...artifacts[1]!, path: artifacts[0]!.path };
  invalidValues.push(duplicateArtifacts);
  const unsafeArtifactPaths = [
    '../outside.json',
    '/absolute.json',
    'a//b.json',
    'a/./b.json',
    'a/../b.json',
    'a\\b.json',
  ];
  for (const artifactPath of unsafeArtifactPaths) {
    const value = validReceipt();
    (value.prepared_artifacts as Array<{ path: string; sha256: string }>)[0]!.path = artifactPath;
    invalidValues.push(value);
  }

  for (const value of invalidValues) expect(() => validateProjectInitializationReceipt(value)).toThrow();
  expect(() => validateProjectInitializationReceipt(null)).toThrow();
  expect(() => validateProjectInitializationReceipt({ ...validReceipt(), project_ids: [] })).toThrow();
  expect(() => validateProjectInitializationReceipt({ ...validReceipt(), prepared_artifacts: [] })).toThrow();
});

test('reads only the canonical receipt, validates fatal UTF-8 and preserves the exact source bytes', () => {
  const serialized = Buffer.from(JSON.stringify(validReceipt()), 'utf8');
  const result = readProjectInitializationReceipt(accessReturning(serialized));
  expect(result.bytes).toBe(serialized);
  expect(result.bytes).toEqual(serialized);
  expect(result.receipt.operation_id).toBe('upgrade-1');

  expect(() => readProjectInitializationReceipt(accessReturning(Buffer.from('{')))).toThrow();
  expect(() => readProjectInitializationReceipt(accessReturning(Buffer.from([0xc3, 0x28])))).toThrow();
});
