import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'bun:test';
import { readPin } from '../bin/bun.ts';
import strykerConfig from '../stryker.config.ts';
import { buildMutationTestCommand } from '../tooling/mutation-evidence.js';
import {
  mutationPartitionSourceBinding,
  mutationPartitionSourceBindingMatches,
} from '../tooling/mutation-command-runner.ts';
import { maintainedSourceInventory } from '../tooling/maintained-source-inventory.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface MutationInventory {
  schema: string;
  expected_sources: string[];
  unassigned_sources: string[];
  unknown_partition_sources: string[];
  invalid_overlaps: unknown[];
  missing_package_sources: string[];
  invalid_zero_mutant_sources: string[];
  zero_mutant_sources: string[];
  pending_partition_sources: string[];
  partitions: { name: string; sources: string[]; status: string }[];
}

test('mutation command builder constructs the exact pinned Bun test argv', () => {
  expect(buildMutationTestCommand('/pinned/bun', ['tests/a.test.mjs', 'tests/b.test.mjs'], '/reports/a.xml')).toEqual([
    '/pinned/bun',
    'test',
    'tests/a.test.mjs',
    'tests/b.test.mjs',
    '--timeout',
    '5000',
    '--preload=./tooling/mutation-test-preload.ts',
    '--reporter=junit',
    '--reporter-outfile=/reports/a.xml',
  ]);
});

test('configured mutation adapter builds worker argv from the already selected pinned runtime', () => {
  expect(process.versions.bun).toBe(readPin(root));
  expect(strykerConfig.commandRunner.command).toBe('bun tooling/mutation-command-runner.ts');
  expect(buildMutationTestCommand(process.execPath, ['tests/a.test.ts'], '/reports/worker.xml')).toEqual([
    process.execPath,
    'test',
    'tests/a.test.ts',
    '--timeout',
    '5000',
    '--preload=./tooling/mutation-test-preload.ts',
    '--reporter=junit',
    '--reporter-outfile=/reports/worker.xml',
  ]);
});

test('mutation partition descriptor binds the owned source list to its captured source subset', () => {
  const allSourceInputs = [
    { path: 'src/a.ts', sha256: 'a'.repeat(64) },
    { path: 'src/b.ts', sha256: 'b'.repeat(64) },
    { path: 'src/c.ts', sha256: 'c'.repeat(64) },
  ];
  const binding = mutationPartitionSourceBinding('owned-partition', ['src/b.ts', 'src/a.ts'], allSourceInputs);
  expect(binding).not.toBeNull();
  if (!binding) throw new Error('Expected a complete partition source binding.');
  const descriptor = {
    schema: 'MutationInputDescriptor/v2',
    partition: 'owned-partition',
    partition_sources: binding.sources,
    partition_source_inputs: binding.sourceInputs,
    partition_source_fingerprint: binding.fingerprint,
  };
  const expected = {
    partition: 'owned-partition',
    sources: binding.sources,
    sourceInputs: binding.sourceInputs,
    fingerprint: binding.fingerprint,
  };
  expect(mutationPartitionSourceBindingMatches(descriptor, expected)).toBe(true);
  expect(
    mutationPartitionSourceBinding(
      'owned-partition',
      ['src/a.ts', 'src/b.ts'],
      [...allSourceInputs, { path: 'src/a.ts', sha256: 'a'.repeat(64) }],
    ),
  ).toBeNull();
  expect(
    mutationPartitionSourceBinding('owned-partition', ['src/a.ts'], [{ path: 'src/a.ts', sha256: 'not-a-digest' }]),
  ).toBeNull();
  expect(mutationPartitionSourceBindingMatches({ ...descriptor, partition: 'foreign-partition' }, expected)).toBe(
    false,
  );
  expect(mutationPartitionSourceBindingMatches({ ...descriptor, partition_sources: ['src/a.ts'] }, expected)).toBe(
    false,
  );
  expect(
    mutationPartitionSourceBindingMatches(
      { ...descriptor, partition_sources: [...binding.sources, 'src/c.ts'], partition_source_inputs: allSourceInputs },
      expected,
    ),
  ).toBe(false);
  expect(
    mutationPartitionSourceBindingMatches(
      {
        ...descriptor,
        partition_source_inputs: [{ ...binding.sourceInputs[0], sha256: 'd'.repeat(64) }, binding.sourceInputs[1]],
      },
      expected,
    ),
  ).toBe(false);
  expect(
    mutationPartitionSourceBindingMatches({ ...descriptor, partition_source_fingerprint: 'e'.repeat(64) }, expected),
  ).toBe(false);
});

test('mutation inventory assigns maintained sources and exposes pending upgrade qualification', () => {
  expect(process.versions.bun).toBe(readPin(root));

  const result = spawnSync(process.execPath, ['tooling/mutation-gate.ts', '--inventory'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  });
  expect(result.error).toBeUndefined();
  // Inventory success describes assignment only; these upgrade sources remain pending.
  expect(result.status).toBe(0);

  const inventory = JSON.parse(result.stdout) as MutationInventory;
  const maintained = maintainedSourceInventory(root);
  expect(inventory.schema).toBe('CandidateMutationInventory/v1');
  expect(inventory.pending_partition_sources).toEqual([
    'src/config/project-upgrade-existing-storage.ts',
    'src/config/project-upgrade.ts',
  ]);
  expect(inventory.partitions.filter(({ status }) => status === 'pending').map(({ name }) => name)).toEqual([
    'pending-project-upgrade-coordinator-and-existing-merge',
  ]);
  expect(inventory.expected_sources).toEqual([...maintained.mutationSources]);
  expect(inventory.unassigned_sources).toEqual([]);
  expect(inventory.unknown_partition_sources).toEqual([]);
  expect(inventory.invalid_overlaps).toEqual([]);
  expect(inventory.missing_package_sources).toEqual([]);
  expect(inventory.invalid_zero_mutant_sources).toEqual([]);

  // These are the gate's existing export-only zero-mutant sources. No other
  // maintained source receives this disposition.
  expect(inventory.zero_mutant_sources.sort()).toEqual(['src/config/index.ts', 'src/index.ts']);
  expect(inventory.zero_mutant_sources.every((source) => inventory.expected_sources.includes(source))).toBe(true);

  const owners = new Map<string, string[]>();
  for (const partition of inventory.partitions)
    for (const source of partition.sources) owners.set(source, [...(owners.get(source) ?? []), partition.name]);

  expect([...owners.keys()].sort()).toEqual([...inventory.expected_sources].sort());
  for (const source of inventory.expected_sources) {
    const assignments = owners.get(source) ?? [];
    if (source === 'src/config/safe-repository-access.ts') expect(assignments.sort()).toEqual(['linux', 'windows']);
    else expect(assignments).toHaveLength(1);
  }
  for (const source of maintained.publicBinSources) expect(owners.get(source)).toHaveLength(1);
});
