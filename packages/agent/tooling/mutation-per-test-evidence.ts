import { Ajv } from 'ajv';
import path from 'node:path';
import { TestStatus } from '@stryker-mutator/api/test-runner';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import type { MutationPerTestCapture } from './mutation-assertion-context.ts';
import { junitOutcome, parseMutationBodyEvents, type MutationJUnitCase } from './mutation-evidence.ts';
import { validateMutationDryRun, type MutationMapBinding } from './mutation-map.ts';

type Planned = Pick<MutationPerTestCapture, 'describes' | 'hooks' | 'registrations'>;
type RegistrationInput = {
  capture: unknown;
  junit: string;
  bodyEvents: Uint8Array;
  exitCode: number | null;
  tests: string[];
};
type JoinInput = Omit<RegistrationInput, 'tests'> & {
  dryRun: unknown;
  expected: {
    root: string;
    binding: MutationMapBinding;
    tests: string[];
    planned: Planned;
    localIds: ReadonlyMap<string, string>;
  };
};
const id = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const text = { type: 'string', minLength: 1 };
const scope = { type: 'array', maxItems: 50_000, uniqueItems: true, items: id };
const hook = { enum: ['beforeAll', 'beforeEach', 'afterEach', 'afterAll'] };
const counters = {
  type: 'object',
  additionalProperties: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
};
function object(properties: Record<string, unknown>) {
  return { type: 'object', additionalProperties: false, required: Object.keys(properties), properties };
}
function list(items: unknown) {
  return { type: 'array', maxItems: 50_000, items };
}
const invocation = {
  test_file: text,
  id,
  outcome: { enum: ['pending', 'returned', 'threw'] },
  elapsed_ms: { type: 'number', minimum: 0 },
};
const validateCapture = new Ajv().compile<MutationPerTestCapture>(
  object({
    schema: { const: 'MutationPerTestCapture/v2' },
    describes: list(object({ test_file: text, describe_id: id, parent_ids: scope, title: { type: 'string' } })),
    hooks: list(object({ test_file: text, hook_id: id, hook, describe_ids: scope })),
    registrations: list(
      object({ test_file: text, body_id: id, expected_failure: { type: 'boolean' }, describe_ids: scope }),
    ),
    invocations: list({
      anyOf: [
        object({ ...invocation, kind: { const: 'body' } }),
        object({ ...invocation, kind: { const: 'hook' }, hook, hook_id: id }),
      ],
    }),
    coverage_observed: { type: 'boolean' },
    mutant_coverage: object({ static: counters, perTest: { type: 'object', additionalProperties: counters } }),
  }),
);
const bodyKey = (file: string, id: number) => `${file}#body:${id}`;
const hookKey = (file: string, id: number) => `${file}#hook:${id}`;
const describeKey = (file: string, id: number) => `${file}#describe:${id}`;

/** Decode producer bytes before reading planning or runtime fields; observation is a separate predicate. */
export function readMutationPerTestCapture(value: unknown): MutationPerTestCapture {
  if (!validateCapture(value)) throw new Error('Per-test capture is malformed or unsupported.');
  return value;
}

/** Planning only: immutable artifact/process origin remains the parent's responsibility. */
export function validateMutationPerTestRegistration(input: RegistrationInput): {
  qualification: 'registration-only';
  origin_qualified: false;
  filtered_runner_qualified: false;
  tests: string[];
  planned: Planned;
} {
  const capture = readMutationPerTestCapture(input.capture);
  const { bodies } = captureRegistrations(capture, input.tests);
  if (
    input.exitCode !== 0 ||
    capture.invocations.length ||
    Object.keys(capture.mutant_coverage.perTest).length ||
    (!capture.coverage_observed && Object.keys(capture.mutant_coverage.static).length)
  )
    throw new Error('Per-test registration probe executed work or has invalid coverage/exit evidence.');
  const { events, outcome, cases } = junitBodyEvidence(input, input.tests, bodies);
  if (events.length || outcome.assertions || outcome.skipped !== outcome.tests || cases.size !== bodies.size)
    throw new Error('Per-test registration probe must account for every body as skipped without execution.');
  return {
    qualification: 'registration-only',
    origin_qualified: false,
    filtered_runner_qualified: false,
    tests: [...input.tests],
    planned: structuredClone({
      describes: capture.describes,
      hooks: capture.hooks,
      registrations: capture.registrations,
    }),
  };
}

function bodyFromCase(row: Pick<MutationJUnitCase, 'test_file' | 'name'>): string {
  const match = /^\[mutation-body:([1-9]\d*)\] \[mutation-file:([A-Za-z0-9_-]+)\] /u.exec(row.name);
  if (
    !match ||
    !Number.isSafeInteger(Number(match[1])) ||
    Buffer.from(row.test_file).toString('base64url') !== match[2]
  )
    throw new Error('Per-test JUnit/dry-run has no exact file/body token.');
  return bodyKey(row.test_file, Number(match[1]));
}

function captureRegistrations(capture: MutationPerTestCapture, tests: string[]) {
  const files = new Set(tests);
  if (
    !tests.length ||
    files.size !== tests.length ||
    tests.some((file) => !/^tests\/(?:[\w.-]+\/)*[\w.-]+$/u.test(file) || path.posix.normalize(file) !== file)
  )
    throw new Error('Per-test original selected files are invalid.');
  const describes = new Map<string, number[]>();
  function checkScope(file: string, ids: number[]) {
    if (!files.has(file)) throw new Error('Per-test registration has a foreign file.');
    for (const [index, id] of ids.entries()) {
      const parents = describes.get(describeKey(file, id));
      if (!parents || parents.length !== index || parents.some((parent, offset) => parent !== ids[offset]))
        throw new Error('Per-test registration has invalid describe ancestry.');
    }
  }
  for (const row of capture.describes) {
    checkScope(row.test_file, row.parent_ids);
    const key = describeKey(row.test_file, row.describe_id);
    if (describes.has(key)) throw new Error('Per-test describe registration is duplicated.');
    describes.set(key, row.parent_ids);
  }
  const bodies = new Map<string, MutationPerTestCapture['registrations'][number]>();
  const observedFiles = new Set<string>();
  for (const row of capture.registrations) {
    checkScope(row.test_file, row.describe_ids);
    const key = bodyKey(row.test_file, row.body_id);
    if (bodies.has(key)) throw new Error('Per-test body registration is duplicated.');
    bodies.set(key, row);
    observedFiles.add(row.test_file);
  }
  if (observedFiles.size !== files.size) throw new Error('Per-test registration omits an original selected file.');
  const hooks = new Map<string, MutationPerTestCapture['hooks'][number]>();
  for (const row of capture.hooks) {
    checkScope(row.test_file, row.describe_ids);
    const key = hookKey(row.test_file, row.hook_id);
    if (hooks.has(key)) throw new Error('Per-test hook registration is duplicated.');
    hooks.set(key, row);
  }
  return { bodies, hooks };
}

function junitBodyEvidence(
  input: Pick<RegistrationInput, 'junit' | 'bodyEvents'>,
  tests: string[],
  bodies: ReadonlyMap<string, unknown>,
) {
  const cases = new Map<string, MutationJUnitCase>();
  const events = parseMutationBodyEvents(input.bodyEvents, tests);
  const outcome = junitOutcome(input.junit, tests, [], events, (row) => {
    const key = bodyFromCase(row);
    if (!bodies.has(key) || cases.has(key)) throw new Error('Per-test JUnit has a foreign or duplicate body.');
    cases.set(key, row);
  });
  return { cases, events, outcome };
}

/** Consistency only: callers still own immutable artifact/receipt custody and runner qualification. */
export function validateMutationPerTestJoin(input: JoinInput) {
  const { expected } = input;
  const capture = readMutationPerTestCapture(input.capture);
  if (!capture.coverage_observed) throw new Error('Per-test coverage was not observed.');
  const declared = { describes: capture.describes, hooks: capture.hooks, registrations: capture.registrations };
  if (canonicalJson(declared) !== canonicalJson(expected.planned))
    throw new Error('Per-test planned declaration set differs.');
  const { bodies, hooks } = captureRegistrations(capture, expected.tests);
  const dryRun = validateMutationDryRun(input.dryRun, expected.binding);
  if (canonicalJson(dryRun.mutant_coverage) !== canonicalJson(capture.mutant_coverage))
    throw new Error('Per-test capture differs from its dry-run coverage.');
  const { outcome, cases } = junitBodyEvidence(input, expected.tests, bodies);
  if (input.exitCode !== 0 || outcome.outcome !== 'passed' || cases.size !== bodies.size)
    throw new Error('Per-test baseline JUnit/body evidence is incomplete or failed.');
  const dryBodies = new Set<string>();
  for (const test of dryRun.tests) {
    if (!test.file) throw new Error('Per-test dry-run has no file binding.');
    const file = path.relative(expected.root, path.resolve(expected.root, test.file)).replaceAll('\\', '/');
    const key = bodyFromCase({ test_file: file, name: test.name });
    const expectedOutcome = test.status === TestStatus.Skipped ? 'skipped' : 'passed';
    if (dryBodies.has(key) || cases.get(key)?.outcome !== expectedOutcome)
      throw new Error('Per-test dry-run body set differs from JUnit.');
    dryBodies.add(key);
  }
  if (dryBodies.size !== bodies.size) throw new Error('Per-test dry-run body set is incomplete.');
  const invoked = new Set<string>();
  const hookCalls = new Map<string, number>();
  const callIds = new Set<string>();
  for (const row of capture.invocations) {
    const call = `${row.test_file}#${row.kind}:${row.id}`;
    if (callIds.has(call) || row.outcome === 'pending') throw new Error('Per-test invocation is duplicate or pending.');
    callIds.add(call);
    if (row.kind === 'body') {
      const key = bodyKey(row.test_file, row.id);
      const registration = bodies.get(key);
      if (
        !registration ||
        invoked.has(key) ||
        cases.get(key)?.outcome !== 'passed' ||
        row.outcome !== (registration.expected_failure ? 'threw' : 'returned')
      )
        throw new Error('Per-test body invocation disagrees with its registration/JUnit.');
      invoked.add(key);
    } else {
      const key = hookKey(row.test_file, row.hook_id!);
      if (hooks.get(key)?.hook !== row.hook || row.outcome !== 'returned')
        throw new Error('Per-test hook invocation has no successful registration.');
      hookCalls.set(key, (hookCalls.get(key) ?? 0) + 1);
    }
  }
  for (const [key, row] of cases)
    if ((row.outcome === 'passed') !== invoked.has(key)) throw new Error('Per-test required body did not complete.');
  const scopeCounts = new Map<string, number>();
  for (const body of invoked) {
    const registration = bodies.get(body)!;
    let key = registration.test_file;
    scopeCounts.set(key, (scopeCounts.get(key) ?? 0) + 1);
    for (const id of registration.describe_ids) {
      key += '#' + id;
      scopeCounts.set(key, (scopeCounts.get(key) ?? 0) + 1);
    }
  }
  for (const [key, row] of hooks) {
    const applicable = scopeCounts.get([row.test_file, ...row.describe_ids].join('#')) ?? 0;
    const count = row.hook === 'beforeAll' || row.hook === 'afterAll' ? Number(applicable > 0) : applicable;
    if ((hookCalls.get(key) ?? 0) !== count) throw new Error('Per-test required scoped hook invocation count differs.');
  }
  const covered = new Set<string>();
  function mutants(counters: Record<string, number>) {
    return Object.entries(counters)
      .flatMap(([id, count]) => {
        const identity = expected.localIds.get(id);
        if (!identity) throw new Error('Per-test coverage has a foreign local mutant.');
        if (!count) return [];
        covered.add(identity);
        return [identity];
      })
      .sort();
  }
  const static_mutants = mutants(capture.mutant_coverage.static);
  const body_mutants = Object.entries(capture.mutant_coverage.perTest)
    .map(([key, counters]) => {
      if (!invoked.has(key)) throw new Error('Per-test coverage has no executed body.');
      return { body: key, mutants: mutants(counters) };
    })
    .sort((a, b) => a.body.localeCompare(b.body));
  return {
    qualification: 'diagnostic-only' as const,
    origin_qualified: false,
    filtered_runner_qualified: false,
    binding: expected.binding,
    tests: [...expected.tests],
    body_mutants,
    static_mutants,
    uncovered_mutants: [...expected.localIds.values()].filter((id) => !covered.has(id)).sort(),
  };
}
