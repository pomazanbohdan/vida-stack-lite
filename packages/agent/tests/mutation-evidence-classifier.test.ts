import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import type { MutationBodyEvent } from '../tooling/mutation-evidence.js';

test('native mutation classifier requires an exact exit and assertion-proven outcome pair', async () => {
  expect(existsSync(new URL('../tooling/mutation-evidence.ts', import.meta.url))).toBe(true);
  const { confirmedRunnerOutcome } = await import('../tooling/mutation-evidence.ts');
  expect(confirmedRunnerOutcome(1, 'killed')).toBe('killed');
  expect(confirmedRunnerOutcome(0, 'passed')).toBe('passed');
  for (const outcome of ['unproven', 'passed', 'timeout', 'runtime-error', 'compile-error', 'NoCoverage']) {
    expect(confirmedRunnerOutcome(1, outcome)).toBe('unknown');
  }
  for (const exit of [0, 2, 137, null]) expect(confirmedRunnerOutcome(exit, 'killed')).toBe('unknown');
});

test('native body evidence rejects duplicate identities and wrong selected files', async () => {
  expect(existsSync(new URL('../tooling/mutation-evidence.ts', import.meta.url))).toBe(true);
  const { parseMutationBodyEvents } = await import('../tooling/mutation-evidence.ts');
  const event: MutationBodyEvent = {
    schema: 'MutationBodyEvent/v1',
    test_file: 'tests/native-owner.test.ts',
    kind: 'body',
    body_id: 1,
    assertion_cause: true,
    assertion_source: 'bun-expect',
  };
  const bytes = Buffer.from(JSON.stringify(event) + '\n');
  expect(parseMutationBodyEvents(bytes, ['tests/native-owner.test.ts'])).toEqual([event]);
  expect(() => parseMutationBodyEvents(Buffer.concat([bytes, bytes]), ['tests/native-owner.test.ts'])).toThrow(
    'Mutation body receipt repeats a body ID',
  );
  expect(() => parseMutationBodyEvents(bytes, ['tests/foreign-owner.test.ts'])).toThrow(
    'Mutation body receipt has an invalid test binding',
  );
});
