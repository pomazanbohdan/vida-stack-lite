import { expect, test } from 'bun:test';
import { cleanInitializationArguments } from '../bin/clean-init.ts';
import { cliCommandContracts } from '../bin/cli-command-contracts.ts';
import { cliCommandEntrypoint } from '../bin/cli-metadata.ts';
import path from 'node:path';
import { maintainedSourceInventory, standaloneDiscoveryFiles } from '../tooling/maintained-source-inventory.ts';

test('clean-init parser accepts only explicit plan and read-only inspect inputs', () => {
  expect(
    cleanInitializationArguments([
      'plan',
      '--project-root',
      'C:\\fixture',
      '--repository',
      'vida',
      '--project',
      'agent=packages/agent',
    ]),
  ).toEqual({
    mode: 'plan',
    projectRoot: 'C:\\fixture',
    repository: 'vida',
    projectMappings: ['agent=packages/agent'],
  });
  expect(cleanInitializationArguments(['inspect', '--project-root', 'C:\\fixture'])).toEqual({
    mode: 'inspect',
    projectRoot: 'C:\\fixture',
  });
  expect(
    cleanInitializationArguments([
      'apply',
      '--project-root',
      'C:\\fixture',
      '--repository',
      'vida',
      '--project',
      'agent=packages/agent',
      '--operation-id',
      '00000000-0000-4000-8000-000000000001',
      '--approve-plan',
      'a'.repeat(64),
    ]).mode,
  ).toBe('apply');
  for (const mode of ['resume', 'retire'] as const) {
    expect(
      cleanInitializationArguments([
        mode,
        '--project-root',
        'C:\\fixture',
        '--operation-id',
        '00000000-0000-4000-8000-000000000001',
        '--approve-plan',
        'a'.repeat(64),
        '--pending-sha256',
        'b'.repeat(64),
      ]).mode,
    ).toBe(mode);
  }
});

for (const args of [
  ['plan', '--project-root', 'C:\\fixture', '--repository', 'vida', '--project', 'agent=packages/agent', '--approve'],
  ['inspect', '--project-root', 'C:\\fixture', '--repository', 'vida'],
  ['plan', '--project-root', 'C:\\fixture', '--repository', 'vida', '--project', 'agent=../outside'],
  ['plan', '--project-root', 'relative', '--repository', 'vida', '--project', 'agent=.'],
]) {
  test(`clean-init parser rejects ambiguous or unowned CLI fields (${JSON.stringify(args)})`, () => {
    expect(() => cleanInitializationArguments(args)).toThrow();
  });
}

test('clean-init is present in public command contracts and package dispatch', () => {
  expect(cliCommandContracts['clean-init'].syntax).toContain('plan|inspect|apply|resume|retire');
  expect(cliCommandEntrypoint('clean-init')).toBe('clean-init.ts');
  expect(path.basename(cliCommandEntrypoint('clean-init'))).toBe('clean-init.ts');
});

test('clean-init entrypoint is complete in the maintained package inventory', () => {
  const inventory = maintainedSourceInventory(path.resolve(import.meta.dirname, '..'));
  expect(inventory.publicBinSources).toContain('bin/clean-init.ts');
  expect(standaloneDiscoveryFiles).toContain('bin/clean-init.ts');
  expect(inventory.missingPackageSources).toEqual([]);
  expect(inventory.missingBunCoverageSources).toEqual([]);
});
