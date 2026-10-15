import { Ajv } from 'ajv';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { mutationPartitions } from './mutation-partitions.ts';

type Digest = { path: string; sha256: string };
type Counter = { covered: number; total: number };
type Coverage = Record<'functions' | 'lines' | 'statements' | 'branches', Counter>;
type Attempt = {
  contour: string;
  lane: 'coverage' | 'mutation' | 'coverage-outcome';
  run_id: string;
  recorded_at: string;
  commit: string;
  artifact: string;
  sources: Digest[];
  tests: Digest[];
  tools: Digest[];
  closure: Digest[];
  selected_tests: Digest[];
  selection_complete: boolean;
  producer_schema: string;
  selection_artifact: string | null;
  tool_fingerprint: string | null;
  status: string;
  accepted: boolean;
  coverage: Coverage | null;
  max_cc: number | null;
  max_entry_crap: number | null;
  killed: number | null;
  mutants: number | null;
};
type Snapshot = { schema: 'VidaContourProgress/v1'; attempts: Attempt[] };
type Receipt = Pick<Attempt, 'recorded_at' | 'commit' | 'artifact'>;
const digestSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['path', 'sha256'],
    properties: { path: { type: 'string', minLength: 1 }, sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' } },
  },
};
const counterSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['covered', 'total'],
  properties: { covered: { type: 'integer', minimum: 0 }, total: { type: 'integer', minimum: 0 } },
};
const metrics = ['functions', 'lines', 'statements', 'branches'] as const;
const validateSnapshot = new Ajv().compile<Snapshot>({
  type: 'object',
  additionalProperties: false,
  required: ['schema', 'attempts'],
  properties: {
    schema: { const: 'VidaContourProgress/v1' },
    attempts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'contour',
          'lane',
          'run_id',
          'recorded_at',
          'commit',
          'artifact',
          'sources',
          'tests',
          'tools',
          'closure',
          'selected_tests',
          'selection_complete',
          'producer_schema',
          'selection_artifact',
          'tool_fingerprint',
          'status',
          'accepted',
          'coverage',
          'max_cc',
          'max_entry_crap',
          'killed',
          'mutants',
        ],
        properties: {
          contour: { type: 'string', minLength: 1 },
          lane: { enum: ['coverage', 'mutation', 'coverage-outcome'] },
          run_id: { type: 'string', minLength: 1 },
          recorded_at: { type: 'string', minLength: 1 },
          commit: { type: 'string', minLength: 1 },
          artifact: { type: 'string', minLength: 1 },
          sources: digestSchema,
          tests: digestSchema,
          tools: digestSchema,
          closure: digestSchema,
          selected_tests: digestSchema,
          selection_complete: { type: 'boolean' },
          producer_schema: {
            enum: [
              'VidaBunFocusedCoverageDiagnostic/v1',
              'VidaBunCoverageOperationOutcome/v1',
              'CandidateMutationPilotReport/v2',
              'CandidateMutationReport/v4',
            ],
          },
          selection_artifact: { type: ['string', 'null'] },
          tool_fingerprint: { type: ['string', 'null'], pattern: '^[a-f0-9]{64}$' },
          status: { type: 'string', minLength: 1 },
          accepted: { type: 'boolean' },
          coverage: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                additionalProperties: false,
                required: metrics,
                properties: Object.fromEntries(metrics.map((name) => [name, counterSchema])),
              },
            ],
          },
          ...Object.fromEntries(
            ['max_cc', 'max_entry_crap', 'killed', 'mutants'].map((name) => [
              name,
              { type: ['number', 'null'], minimum: 0 },
            ]),
          ),
        },
      },
    },
  },
});

function object(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Contour report requires an object.');
  return value;
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('Contour report requires an array.');
  return value.map(object);
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('Contour report requires nonempty text.');
  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid contour number.');
  return value;
}
function digests(value: unknown): Digest[] {
  const result = rows(value)
    .map((row) => ({ path: text(row.path), sha256: text(row.sha256) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  if (new Set(result.map((row) => row.path)).size !== result.length) throw new Error('Duplicate contour input.');
  return result;
}
function inputClosure(...groups: Digest[][]): Digest[] {
  const merged = new Map<string, Digest>();
  for (const row of groups.flat()) {
    if (merged.has(row.path) && merged.get(row.path)!.sha256 !== row.sha256)
      throw new Error('Conflicting input closure digest.');
    merged.set(row.path, row);
  }
  return [...merged.values()].sort((a, b) => a.path.localeCompare(b.path));
}
function declaredSources(contour: string): string[] {
  const partition = mutationPartitions().find((row) => row.name === contour);
  if (!partition || partition.environment === 'static')
    throw new Error('Unknown or static executable contour: ' + contour);
  return [...(partition.sources ?? [partition.requiredReportedSource!])].sort();
}
function checkedSources(contour: string, value: unknown, complete = true): Digest[] {
  const result = digests(value);
  const declared = declaredSources(contour);
  if (
    result.some((row) => !declared.includes(row.path)) ||
    (complete && canonicalJson(result.map((row) => row.path).sort()) !== canonicalJson(declared))
  )
    throw new Error('Contour Source selection differs from its registry: ' + contour);
  return result;
}
function empty(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

function selectedTests(
  contour: string,
  value: unknown,
  inputs: Digest[],
): { selected_tests: Digest[]; selection_complete: boolean } {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))
    return { selected_tests: [], selection_complete: false };
  const selected = value as string[];
  if (new Set(selected).size !== selected.length) throw new Error('Duplicate selected test.');
  const selected_tests = selected
    .map((file) => {
      const input = inputs.find((row) => row.path === file);
      if (!input) throw new Error('Selected test has no captured digest: ' + file);
      return input;
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  const expected = mutationPartitions().find((row) => row.name === contour)?.tests ?? [];
  return {
    selected_tests,
    selection_complete:
      expected.length > 0 && canonicalJson([...selected].sort()) === canonicalJson([...expected].sort()),
  };
}

/** Adapts owner-issued terminal reports only. It does not re-admit their receipts or establish current freshness. */
export function contourAttempts(value: unknown, receipt: Receipt): Attempt[] {
  const report = object(value);
  if (report.schema === 'VidaBunCoverageOperationOutcome/v1') {
    const contour = text(object(report.selection).contour);
    declaredSources(contour);
    if (!['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED'].includes(text(report.status)))
      throw new Error('Invalid coverage operation outcome.');
    return [
      {
        ...receipt,
        contour,
        lane: 'coverage-outcome',
        run_id: text(report.run_id),
        sources: [],
        tests: [],
        tools: [],
        closure: [],
        selected_tests: [],
        selection_complete: false,
        producer_schema: text(report.schema),
        selection_artifact: null,
        tool_fingerprint: null,
        status: text(report.status),
        accepted: false,
        coverage: null,
        max_cc: null,
        max_entry_crap: null,
        killed: null,
        mutants: null,
      },
    ];
  }
  const common = {
    ...receipt,
    run_id: text(report.run_id),
    tests: digests(report.test_inputs),
    tools: digests(report.tool_inputs),
    tool_fingerprint: text(report.tool_fingerprint),
    producer_schema: text(report.schema),
  };
  if (report.schema === 'VidaBunFocusedCoverageDiagnostic/v1') {
    const contour = text(object(report.test_selection).contour);
    const sources = checkedSources(contour, report.sources);
    const measurements = rows(report.metrics);
    if (
      canonicalJson(measurements.map((row) => text(row.file)).sort()) !==
      canonicalJson(sources.map((row) => row.path).sort())
    )
      throw new Error('Coverage metrics differ from declared Sources.');
    const coverage = Object.fromEntries(
      metrics.map((name) => {
        const counters = measurements.map((row) => object(object(row.coverage)[name]));
        return [
          name,
          {
            covered: counters.reduce((sum, row) => sum + number(row.covered), 0),
            total: counters.reduce((sum, row) => sum + number(row.total), 0),
          },
        ];
      }),
    ) as Coverage;
    const functions = measurements.flatMap((row) => rows(row.functions));
    if (new Set(functions.map((row) => text(row.identity))).size !== functions.length)
      throw new Error('Duplicate coverage function identity.');
    if (functions.length !== coverage.functions.total || !functions.length)
      throw new Error('Coverage function inventory differs.');
    const accepted =
      report.qualification_scope === 'focused-diagnostic' &&
      report.full_qualification === false &&
      report.function_coverage_kind === 'function-entry-binary' &&
      rows(report.shards).length > 0 &&
      rows(report.shards).every(
        (row) => row.status === 0 && row.signal === null && row.error === null && row.unknown === false,
      );
    return [
      {
        ...common,
        contour,
        lane: 'coverage',
        ...selectedTests(contour, object(report.test_selection).tests, common.tests),
        selection_artifact: receipt.artifact,
        closure: inputClosure(digests(report.module_inputs), common.tests, common.tools, sources),
        sources,
        status: accepted ? 'focused-diagnostic' : 'unknown',
        accepted,
        coverage,
        max_cc: Math.max(...functions.map((row) => number(row.complexity))),
        max_entry_crap: Math.max(...functions.map((row) => number(row.crap))),
        killed: null,
        mutants: null,
      },
    ];
  }
  if (report.schema !== 'CandidateMutationPilotReport/v2' && report.schema !== 'CandidateMutationReport/v4')
    throw new Error('Unsupported contour producer schema.');
  if (!Array.isArray(report.selected_partitions) || !report.selected_partitions.length)
    throw new Error('Mutation report has no selected partitions.');
  const ownerAccepted =
    ['pass', 'pilot-pass'].includes(text(report.status)) &&
    report.effective_score === 1 &&
    [
      'provenance_errors',
      'source_mismatches',
      'baseline_errors',
      'unknown_mutants',
      'report_errors',
      'empty_partitions',
      'missing_partition_sources',
      'extra_partition_sources',
      'missing_package_sources',
      'missing_sources',
      'extra_sources',
      'non_killed',
    ].every((key) => empty(report[key]));
  return report.selected_partitions
    .filter((name) => mutationPartitions().find((row) => row.name === name)?.environment !== 'static')
    .map((name) => {
      const contour = text(name);
      const binding = rows(report.partition_source_bindings).filter((row) => row.partition === contour);
      const processes = rows(report.runner_processes).filter((row) => row.partition === contour);
      if (binding.length !== 1 || processes.length > 1)
        throw new Error('Missing or ambiguous mutation partition binding.');
      const sources = checkedSources(contour, binding[0]!.source_inputs, ownerAccepted);
      const statuses = object(report.partition_statuses)[contour];
      const mutants = isRecord(statuses)
        ? Object.values(statuses).reduce<number>((sum, count) => sum + number(count), 0)
        : null;
      const killed = isRecord(statuses) ? number(statuses.Killed ?? 0) : null;
      const process = processes[0] ?? {};
      const custody = isRecord(process.process_custody) ? process.process_custody : {};
      const accepted =
        ownerAccepted &&
        mutants !== null &&
        mutants > 0 &&
        killed === mutants &&
        process.observed_exit_code === 0 &&
        process.signal === null &&
        process.timed_out === false &&
        process.spawn_error === null &&
        process.output_complete === true &&
        custody.terminationObserved === true &&
        custody.processGroupTerminationObserved === true;
      return {
        ...common,
        contour,
        lane: 'mutation',
        ...selectedTests(contour, binding[0]!.tests, common.tests),
        selection_artifact:
          typeof binding[0]!.test_selection_artifact === 'string'
            ? binding[0]!.test_selection_artifact
            : Array.isArray(binding[0]!.tests)
              ? receipt.artifact
              : null,
        closure: inputClosure(digests(report.source_inputs), common.tests, common.tools, sources),
        sources,
        status: text(report.status),
        accepted,
        coverage: null,
        max_cc: null,
        max_entry_crap: null,
        killed,
        mutants,
      };
    });
}

function key(attempt: Attempt): string {
  return [attempt.contour, attempt.lane, attempt.run_id].join(':');
}
function evidence(attempt: Attempt): string {
  const {
    recorded_at: _time,
    commit: _commit,
    artifact: _artifact,
    selection_artifact: _selectionArtifact,
    selected_tests: _selectedTests,
    selection_complete: _selectionComplete,
    ...data
  } = attempt;
  return canonicalJson(data);
}

/** Merge immutable observations; preserve historical closures rather than inventing a union of maxima. */
export function mergeContourProgress(previous: unknown, incoming: Attempt[]): Snapshot {
  if (!validateSnapshot(previous))
    throw new Error('Invalid contour snapshot: ' + JSON.stringify(validateSnapshot.errors));
  const candidate = { schema: 'VidaContourProgress/v1', attempts: incoming };
  if (!validateSnapshot(candidate))
    throw new Error('Invalid contour attempts: ' + JSON.stringify(validateSnapshot.errors));
  const merged = new Map<string, Attempt>();
  for (const attempt of [...previous.attempts, ...candidate.attempts]) {
    checkedSources(attempt.contour, attempt.sources, attempt.accepted);
    digests(attempt.tests);
    digests(attempt.tools);
    digests(attempt.closure);
    digests(attempt.selected_tests);
    if (attempt.selection_complete && !attempt.selected_tests.length)
      throw new Error('Complete selection requires captured executed tests.');
    if (
      (attempt.lane === 'coverage') !== (attempt.coverage !== null) ||
      (attempt.lane === 'coverage' &&
        (attempt.max_cc === null ||
          attempt.max_entry_crap === null ||
          attempt.killed !== null ||
          attempt.mutants !== null)) ||
      (attempt.lane === 'mutation' &&
        (attempt.max_cc !== null ||
          attempt.max_entry_crap !== null ||
          (attempt.killed === null) !== (attempt.mutants === null)))
    )
      throw new Error('Contour lane metrics differ.');
    if (
      attempt.lane === 'coverage-outcome' &&
      (attempt.accepted ||
        attempt.coverage !== null ||
        attempt.killed !== null ||
        attempt.mutants !== null ||
        attempt.max_cc !== null ||
        attempt.max_entry_crap !== null)
    )
      throw new Error('Parent outcome is not metric evidence.');
    if (!Number.isFinite(Date.parse(attempt.recorded_at))) throw new Error('Invalid contour receipt time.');
    for (const metric of Object.values(attempt.coverage ?? {}))
      if (metric.covered > metric.total) throw new Error('Coverage exceeds denominator.');
    if (
      attempt.killed !== null &&
      (!Number.isSafeInteger(attempt.killed) ||
        !Number.isSafeInteger(attempt.mutants) ||
        attempt.killed > attempt.mutants!)
    )
      throw new Error('Invalid mutation denominator.');
    const before = merged.get(key(attempt));
    if (before && evidence(before) !== evidence(attempt)) throw new Error('Conflicting contour run: ' + key(attempt));
    if (
      before &&
      before.commit !== 'not-captured' &&
      attempt.commit !== 'not-captured' &&
      before.commit !== attempt.commit
    )
      throw new Error('Conflicting contour commit: ' + key(attempt));
    if (!before) {
      merged.set(key(attempt), attempt);
      continue;
    }
    if (
      before.selected_tests.length &&
      attempt.selected_tests.length &&
      canonicalJson(before.selected_tests) !== canonicalJson(attempt.selected_tests)
    )
      throw new Error('Conflicting executed test selection: ' + key(attempt));
    // Missing selection metadata may be enriched by the same run's verified descriptor.
    // An explicit, contradictory selected list never overwrites another list.
    const preferred =
      before.commit === 'not-captured' && attempt.commit !== 'not-captured'
        ? attempt
        : attempt.commit === 'not-captured' && before.commit !== 'not-captured'
          ? before
          : before.recorded_at < attempt.recorded_at ||
              (before.recorded_at === attempt.recorded_at && before.artifact <= attempt.artifact)
            ? before
            : attempt;
    const other = preferred === before ? attempt : before;
    const selected =
      !preferred.selected_tests.length || (!preferred.selection_complete && other.selection_complete)
        ? other
        : preferred;
    merged.set(key(attempt), {
      ...preferred,
      recorded_at: before.recorded_at < attempt.recorded_at ? before.recorded_at : attempt.recorded_at,
      selected_tests: selected.selected_tests,
      selection_complete: before.selection_complete || attempt.selection_complete,
      selection_artifact: selected.selection_artifact,
    });
  }
  return {
    schema: 'VidaContourProgress/v1',
    attempts: [...merged.values()].sort(
      (a, b) => a.recorded_at.localeCompare(b.recorded_at) || key(a).localeCompare(key(b)),
    ),
  };
}
function contains(inputs: Digest[], subset: Digest[]): boolean {
  const byPath = new Map(inputs.map((row) => [row.path, row.sha256]));
  return subset.length > 0 && subset.every((row) => byPath.get(row.path) === row.sha256);
}
function compatible(coverage: Attempt, mutation: Attempt): boolean {
  return (
    coverage.selection_complete &&
    mutation.selection_complete &&
    canonicalJson(coverage.selected_tests) === canonicalJson(mutation.selected_tests) &&
    canonicalJson(coverage.sources) === canonicalJson(mutation.sources) &&
    contains(mutation.tests, coverage.tests) &&
    contains(mutation.closure, coverage.closure)
  );
}
function maximum(attempt: Attempt): boolean {
  return (
    attempt.accepted &&
    (attempt.lane === 'mutation'
      ? attempt.killed === attempt.mutants && attempt.mutants! > 0
      : attempt.coverage !== null &&
        Object.values(attempt.coverage).every((row) => row.total > 0 && row.covered === row.total))
  );
}
function cell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}
function counts(attempt: Attempt | undefined): string {
  if (!attempt) return 'unknown';
  if (attempt.lane === 'coverage-outcome') return 'no metric evidence';
  if (attempt.lane === 'mutation' && attempt.mutants === null) return 'unknown (' + attempt.status + ')';
  if (attempt.lane === 'mutation')
    return `${attempt.killed}/${attempt.mutants} (${attempt.status}; ${attempt.accepted ? 'assertion-confirmed' : 'unqualified'})`;
  return metrics.map((name) => `${attempt.coverage![name].covered}/${attempt.coverage![name].total}`).join(' · ');
}

function lastCompleteClosure(coverage: Attempt[], mutation: Attempt[]): readonly [Attempt, Attempt] | undefined {
  const candidates = mutation.filter(maximum).toReversed();
  for (const current of coverage.toReversed()) {
    if (!maximum(current)) continue;
    const matched = candidates.find((row) => compatible(current, row));
    if (matched) return [current, matched];
  }
  return undefined;
}

export function renderContourProgress(snapshot: Snapshot): string {
  const partitions = mutationPartitions();
  let completed = 0;
  const body: string[] = [];
  const details: string[] = [];
  for (const partition of partitions) {
    const attempts = snapshot.attempts.filter((row) => row.contour === partition.name);
    const coverage = attempts.filter((row) => row.lane === 'coverage');
    const mutation = attempts.filter((row) => row.lane === 'mutation');
    const best = lastCompleteClosure(coverage, mutation);
    if (best) completed++;
    const lastCoverage = coverage.at(-1);
    const lastMutation = mutation.at(-1);
    const lastOutcome = attempts.filter((row) => row.lane === 'coverage-outcome').at(-1);
    const staticOnly = partition.environment === 'static';
    body.push(
      `| ${partition.name} | ${cell(counts(lastCoverage))} | ${lastCoverage ? `${lastCoverage.max_cc} / ${lastCoverage.max_entry_crap}` : 'unknown'} | ${cell(counts(lastMutation))} | ${lastOutcome?.status ?? 'not imported'} | ${staticOnly ? 'N/A: static exports' : best ? 'local maximum recorded' : 'open / unknown'} |`,
    );
    if (!attempts.length) continue;
    details.push(
      `### ${partition.name}\n`,
      `Historical complete local closure: ${best ? best.map((row) => `\`${row.run_id}\``).join(' + ') : 'not recorded'}.`,
      `Achieved in that closure: F/L/S/B ${counts(best?.[0])}; CC / entry CRAP ${best ? `${best[0].max_cc} / ${best[0].max_entry_crap}` : 'unknown'}; mutation ${counts(best?.[1])}.`,
      'Current freshness: unverified; this projection never rehashes Source/tests/config or re-admits custody. Frozen complexity/CRAP and exact coverage qualification: pending.',
      '',
      '| Lane | Run | Commit | Recorded UTC | Status | Measurements | Artifact |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...attempts.map(
        (row) =>
          `| ${row.lane} | ${cell(row.run_id)} | ${cell(row.commit)} | ${row.recorded_at} | ${cell(row.status)}; ${row.accepted ? 'owner accepted locally' : 'unqualified'}; selection ${row.selection_complete ? 'bound' : 'unbound'} | ${cell(counts(row))} | ${cell(row.artifact)} |`,
      ),
      '',
      'Bindings, counters and failed/UNKNOWN observations are retained in the sibling JSON snapshot.',
      '',
    );
  }
  return (
    [
      '# Contour quality progress',
      '',
      '<!-- Generated by packages/agent/tooling/contour-progress-cli.ts. Do not edit measurements manually. -->',
      '',
      'Derived, non-gating view of owner-issued reports. WORK remains the decision owner. Values are recorded observations, not a new acceptance authority.',
      '',
      `Complete compatible local coverage + assertion-confirmed mutation closures: **${completed}/${partitions.filter((row) => row.environment !== 'static').length}**; static contours: **${partitions.filter((row) => row.environment === 'static').length}**.`,
      `Executable contours without a recorded complete compatible closure: **${partitions.filter((row) => row.environment !== 'static').length - completed}**.`,
      '',
      'Current freshness is unverified. Parent operation statuses are owner-reported without re-admitting their receipts. Frozen complexity/CRAP and exact coverage qualification: pending. The view currently consumes focused coverage and confirmed mutation summaries; it never infers a frozen-gate result.',
      '',
      'F/L/S/B are covered/total; CC/CRAP are measured maxima using function-entry-binary coverage. They do not replace frozen per-function ceilings or exact coverage gates. No report means unknown, never zero. A failed or partial last attempt does not erase a historical complete closure. Different Source/test/config closures are never combined into a synthetic maximum.',
      '',
      '| Contour | Latest F / L / S / B | CC / entry CRAP | Latest mutation | Reported coverage operation | Historical compatible closure |',
      '| --- | --- | --- | --- | --- | --- |',
      ...body,
      '',
      ...details,
    ].join('\n') + '\n'
  );
}
