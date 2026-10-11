import { expect, test } from 'bun:test';
import fc, { type Arbitrary } from 'fast-check';
import { assertProperty } from './helpers/assert-property.js';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';

// Function: src/orchestration/mastra-session-ledger-codec.ts#fn:parseMastraSessionLedgerState#0.
// Scenarios: zero/many empty waves, optional-key presence, safe-integer boundaries,
// serialization idempotence, immutable detached data, exact-shape denials.
// Nonempty items and nested corrective/source records need their own schema cases.
// Host rights, database restart, CAS and external replay are N/A for this pure codec.
const requiredKeys = [
  'schema',
  'workspace_id',
  'work_id',
  'attempt',
  'run_id',
  'step_id',
  'items',
  'completed',
] as const;
const optionalKeys = ['corrective_execution', 'source_scope', 'research_wave_exposure'] as const;
const text = fc.oneof(fc.string({ maxLength: 40 }), fc.constantFrom('', 'ї🚀', '\n"\\', '__proto__'));
const model = fc.record({
  workspace: text,
  work: text,
  run: text,
  attempt: fc.oneof(fc.integer({ min: 1, max: 65536 }), fc.constant(Number.MAX_SAFE_INTEGER)),
  step: fc.option(text, { nil: null }),
  waves: fc.array(text, { maxLength: 4 }),
  correctivePresent: fc.boolean(),
  sourcePresent: fc.boolean(),
  exposure: fc.constantFrom(undefined, 'preparing' as const, 'possible' as const),
});

type Model = typeof model extends Arbitrary<infer Value> ? Value : never;

function inputFor(value: Model) {
  return {
    schema: 'MastraSessionLedger/v1' as const,
    workspace_id: value.workspace,
    work_id: value.work,
    attempt: value.attempt,
    run_id: value.run,
    step_id: value.step,
    items: [] as unknown[],
    completed: value.waves.map((step) => ({ step_id: step, items: [] as unknown[] })),
    ...(value.correctivePresent ? { corrective_execution: null } : {}),
    ...(value.sourcePresent ? { source_scope: null } : {}),
    ...(value.exposure === undefined ? {} : { research_wave_exposure: value.exposure }),
  };
}

function expectedFor(value: Model): MastraSessionLedgerState {
  return {
    schema: 'MastraSessionLedger/v1',
    workspace_id: value.workspace,
    work_id: value.work,
    attempt: value.attempt,
    run_id: value.run,
    step_id: value.step,
    items: [],
    completed: value.waves.map((step_id) => ({ step_id, items: [] })),
    ...(value.correctivePresent ? { corrective_execution: null } : {}),
    ...(value.sourcePresent ? { source_scope: null } : {}),
    ...(value.exposure === undefined ? {} : { research_wave_exposure: value.exposure }),
  };
}

function parameters(scenario: string, seed: number) {
  // The property helper reports seed and shrink path; replay only the named scenario.
  const replayScenario = process.env.VIDA_CODEC_PROPERTY_SCENARIO;
  const replayPath = process.env.VIDA_CODEC_PROPERTY_PATH;
  if ((replayScenario === undefined) !== (replayPath === undefined))
    throw new Error('Codec property replay requires both scenario and shrink path.');
  if (replayScenario !== undefined && !['roundtrip', 'shape', 'attempt'].includes(replayScenario))
    throw new Error('Unknown codec property replay scenario.');
  return {
    seed,
    numRuns: 128,
    ...(replayScenario === scenario && replayPath !== undefined ? { path: replayPath } : {}),
  };
}

test('ledger codec property: roundtrip preserves independent projection, presence and detached frozen data', () => {
  assertProperty(
    fc.property(model, (value) => {
      const input = inputFor(value);
      const expected = expectedFor(value);
      const parsed = parseMastraSessionLedgerState(input);
      expect(parsed).toEqual(expected);
      const wire: unknown = JSON.parse(JSON.stringify(input));
      expect(parseMastraSessionLedgerState(wire)).toEqual(expected);
      expect(parseMastraSessionLedgerState(parsed)).toEqual(expected);
      expect(Object.isFrozen(parsed)).toBe(true);
      expect(Object.getPrototypeOf(parsed)).toBe(null);
      expect(Object.isFrozen(parsed.items)).toBe(true);
      expect(Object.isFrozen(parsed.completed)).toBe(true);
      expect(parsed.items).not.toBe(input.items);
      expect(parsed.completed).not.toBe(input.completed);
      for (const [index, wave] of parsed.completed.entries()) {
        expect(Object.isFrozen(wave)).toBe(true);
        expect(Object.isFrozen(wave.items)).toBe(true);
        expect(Object.getPrototypeOf(wave)).toBe(null);
        expect(wave).not.toBe(input.completed[index]);
        expect(wave.items).not.toBe(input.completed[index]?.items);
      }
      input.items.push(null);
      for (const wave of input.completed) wave.items.push(null);
      input.completed.length = 0;
      input.work_id = 'changed after parse';
      expect(parsed).toEqual(expected);
    }),
    parameters('roundtrip', 20261010),
  );
});

test('ledger codec property: exact shape rejects unknown keys and every missing required field', () => {
  const unknownKey = text.filter((key) => ![...requiredKeys, ...optionalKeys].some((known) => known === key));
  assertProperty(
    fc.property(model, unknownKey, fc.constantFrom(...requiredKeys), (value, extra, missing) => {
      const input = inputFor(value);
      expect(() => parseMastraSessionLedgerState({ ...input, [extra]: null })).toThrow(/state shape/);
      const incomplete: Record<string, unknown> = { ...input };
      delete incomplete[missing];
      expect(() => parseMastraSessionLedgerState(incomplete)).toThrow(/state shape/);
      expect(() =>
        parseMastraSessionLedgerState({ ...input, completed: [{ step_id: value.work, items: [], [extra]: null }] }),
      ).toThrow(/completed wave shape/);
    }),
    parameters('shape', 20261011),
  );
});

test('ledger codec property: invalid attempt values fail at the canonical or positive-safe boundary', () => {
  const invalidAttempt = fc.oneof(
    fc.integer({ min: -65536, max: 0 }),
    fc.constantFrom(0.5, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity, -Infinity),
  );
  assertProperty(
    fc.property(model, invalidAttempt, (value, attempt) => {
      expect(() => parseMastraSessionLedgerState({ ...inputFor(value), attempt })).toThrow();
    }),
    parameters('attempt', 20261012),
  );
});
