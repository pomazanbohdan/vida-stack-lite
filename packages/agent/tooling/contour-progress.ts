import { Ajv } from 'ajv';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { mutationPartitionSources, mutationPartitions } from './mutation-partitions.ts';
import type { NativeMutationPartitionRead } from './native-mutation-proof-reader.ts';
import type { NativeMutationArtifactRef } from './mutation-map.ts';
import {
  assertFsSafeCrapApplicabilityReceipt,
  fsSafeApplicabilityReview,
  scopedCrossRoleIdentityReuses,
} from './crap-gate.ts';

type Digest = { path: string; sha256: string };
type Counter = { covered: number; total: number };
type Coverage = Record<'functions' | 'lines' | 'statements' | 'branches', Counter>;
type Attempt = {
  contour: string;
  lane:
    | 'coverage'
    | 'frozen-crap'
    | 'crap-applicability'
    | 'mutation'
    | 'native-mutation'
    | 'coverage-outcome'
    | 'stage-outcome';
  run_id: string;
  coverage_run_id?: string;
  function_count?: number;
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
  confirmed_killed?: number;
  coverage_binding?: { report_sha256: string; manifest_sha256: string };
  native_provenance?: {
    binding_fingerprints: {
      input_fingerprint: string;
      source_fingerprint: string;
      test_fingerprint: string;
      tool_fingerprint: string;
    };
    universe_sha256: string;
    proof_artifact: { file: string; bytes: number; sha256: string };
    context_artifact: { file: string; bytes: number; sha256: string };
  };
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
const nativeArtifactRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'bytes', 'sha256'],
  properties: {
    file: { type: 'string', pattern: '^[^/]+\\.json$' },
    bytes: { type: 'integer', minimum: 1, maximum: 33554432 },
    sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
  },
};
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
          lane: {
            enum: [
              'coverage',
              'frozen-crap',
              'crap-applicability',
              'mutation',
              'native-mutation',
              'coverage-outcome',
              'stage-outcome',
            ],
          },
          run_id: { type: 'string', minLength: 1 },
          coverage_run_id: { type: 'string', minLength: 1 },
          function_count: { type: 'integer', minimum: 1 },
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
              'VidaScopedCrapBudgetReport/v1',
              'VidaScopedCrapBudgetReport/v2',
              'VidaScopedCrapBudgetReport/v3',
              'VidaScopedCrapBudgetReport/v4',
              'VidaScopedCrapApplicabilityNA/v1',
              'CandidateMutationPilotReport/v2',
              'CandidateMutationReport/v4',
              'CandidateNativeMutationReport/v1',
              'VidaContourStagePublicationError/v1',
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
          confirmed_killed: { type: 'integer', minimum: 0 },
          coverage_binding: {
            type: 'object',
            additionalProperties: false,
            required: ['report_sha256', 'manifest_sha256'],
            properties: Object.fromEntries(
              ['report_sha256', 'manifest_sha256'].map((key) => [key, { type: 'string', pattern: '^[a-f0-9]{64}$' }]),
            ),
          },
          native_provenance: {
            type: 'object',
            additionalProperties: false,
            required: ['binding_fingerprints', 'universe_sha256', 'proof_artifact', 'context_artifact'],
            properties: {
              binding_fingerprints: {
                type: 'object',
                additionalProperties: false,
                required: ['input_fingerprint', 'source_fingerprint', 'test_fingerprint', 'tool_fingerprint'],
                properties: Object.fromEntries(
                  ['input_fingerprint', 'source_fingerprint', 'test_fingerprint', 'tool_fingerprint'].map((key) => [
                    key,
                    { type: 'string', pattern: '^[a-f0-9]{64}$' },
                  ]),
                ),
              },
              universe_sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
              proof_artifact: nativeArtifactRefSchema,
              context_artifact: nativeArtifactRefSchema,
            },
          },
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
function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('Contour report requires an explicit text array.');
  return value.map(text);
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid contour number.');
  return value;
}
function positiveInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw new Error('Scoped CRAP proof rows are malformed.');
  return value;
}
function positiveFinite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    throw new Error('Scoped CRAP measurements must be positive finite numbers.');
  return value;
}
function exactKeys(row: Record<string, unknown>, expected: readonly string[]): void {
  if (Object.keys(row).length !== expected.length || Object.keys(row).some((key) => !expected.includes(key)))
    throw new Error('Scoped CRAP v2 function row has fields outside its declared kind.');
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
  const partition = mutationPartitions({ includeRetired: true }).find((row) => row.name === contour);
  if (!partition || partition.environment === 'static')
    throw new Error('Unknown or static executable contour: ' + contour);
  return mutationPartitionSources(partition).sort();
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

/** Projects only a result returned by the persisted native proof reader. */
export type NativeMutationProjection = {
  report: NativeMutationPartitionRead['report'];
  proof: Pick<
    NativeMutationPartitionRead['proof'],
    'schema' | 'binding' | 'qualification_scope' | 'full_qualification' | 'mutants' | 'universe_sha256'
  >;
  validation_context: NativeMutationArtifactRef;
  descriptor: Record<string, unknown>;
  context: { source_inputs: unknown };
};
export function nativeMutationAttempt(read: NativeMutationProjection, receipt: Receipt): Attempt {
  const { report, proof, validation_context, descriptor, context } = read;
  if (
    report.schema !== 'CandidateNativeMutationReport/v1' ||
    report.producer_kind !== 'native-instrumenter-batches/v1' ||
    report.qualification_scope !== 'partition' ||
    report.full_qualification !== false ||
    report.status !== 'pilot-pass' ||
    report.required_effective_score !== 1 ||
    report.effective_score !== 1 ||
    report.non_killed.length !== 0 ||
    report.unknown_mutants.length !== 0 ||
    proof.schema !== 'NativeMutationPartitionProof/v1' ||
    proof.qualification_scope !== 'partition' ||
    proof.full_qualification !== false ||
    canonicalJson(report.binding) !== canonicalJson(proof.binding)
  )
    throw new Error('Native mutation projection does not preserve the reader-validated partition pilot contract.');
  const contour = report.binding.partition;
  const partition = mutationPartitions().find((row) => row.name === contour);
  if (!partition || partition.environment === 'static' || partition.environment === 'retired')
    throw new Error('Native mutation report is not bound to an active executable contour.');
  const sources = digests(report.binding.partition_sources);
  const expectedSources = mutationPartitionSources(partition).sort();
  if (
    canonicalJson(sources.map((row) => row.path)) !== canonicalJson(expectedSources) ||
    canonicalJson(sources) !== canonicalJson(digests(descriptor.partition_source_inputs))
  )
    throw new Error('Native mutation Source selection differs from its registered partition.');
  const tests = digests(descriptor.test_inputs);
  const tools = digests(descriptor.tool_inputs);
  const globalSources = digests(context.source_inputs);
  const selected = selectedTests(contour, report.tests, tests);
  if (!selected.selection_complete)
    throw new Error('Native mutation test selection differs from its registered partition.');
  const proofCount = proof.mutants.length;
  if (proofCount < 1 || report.killed !== proofCount || report.mutants !== proofCount || report.effective_score !== 1)
    throw new Error('Native mutation report counts differ from its reader-validated proof.');
  return {
    ...receipt,
    contour,
    lane: 'native-mutation',
    run_id: report.binding.run_id,
    sources,
    tests,
    tools,
    closure: inputClosure(globalSources, tests, tools, sources),
    ...selected,
    producer_schema: 'CandidateNativeMutationReport/v1',
    selection_artifact: receipt.artifact,
    tool_fingerprint: report.binding.tool_fingerprint,
    status: 'pilot-pass',
    accepted: true,
    coverage: null,
    max_cc: null,
    max_entry_crap: null,
    killed: proofCount,
    mutants: proofCount,
    native_provenance: {
      binding_fingerprints: {
        input_fingerprint: report.binding.input_fingerprint,
        source_fingerprint: report.binding.source_fingerprint,
        test_fingerprint: report.binding.test_fingerprint,
        tool_fingerprint: report.binding.tool_fingerprint,
      },
      universe_sha256: proof.universe_sha256,
      proof_artifact: report.native_partition_proof,
      context_artifact: validation_context,
    },
  };
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
  const expected = mutationPartitions({ includeRetired: true }).find((row) => row.name === contour)?.tests ?? [];
  return {
    selected_tests,
    selection_complete:
      expected.length > 0 && canonicalJson([...selected].sort()) === canonicalJson([...expected].sort()),
  };
}

/** Adapts owner-issued terminal reports only. It does not re-admit their receipts or establish current freshness. */
export { object as contourRecord };

function stageOutcomeAttempts(report: Record<string, unknown>, receipt: Receipt): Attempt[] {
  const diagnostic = object(report.diagnostic);
  const status = text(report.status);
  const contour = text(diagnostic.contour);
  const stageLane = text(diagnostic.lane);
  const process = text(diagnostic.process);
  if (
    [
      !['unknown-or-partial', 'published-receipt-failed'].includes(status),
      report.source_commit !== receipt.commit,
      text(report.error) !== text(diagnostic.error),
      diagnostic.schema !== 'VidaContourStageOutcome/v1',
      diagnostic.publication !== status,
      !['coverage', 'frozen-crap', 'crap-applicability', 'mutation'].includes(stageLane),
      !['completed', 'failed', 'timeout', 'unknown', 'resource'].includes(process),
      typeof diagnostic.capture_complete !== 'boolean',
      typeof diagnostic.group_closed !== 'boolean',
      typeof diagnostic.boot_unchanged !== 'boolean',
      typeof diagnostic.commit_unchanged !== 'boolean',
      typeof diagnostic.clean_inputs !== 'boolean',
    ].some(Boolean)
  )
    throw new Error('Stage publication outcome is malformed or successful.');
  declaredSources(contour);
  return [
    {
      ...receipt,
      contour,
      lane: 'stage-outcome',
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
      status: `${stageLane}/${process}/${status}`,
      accepted: false,
      coverage: null,
      max_cc: null,
      max_entry_crap: null,
      killed: null,
      mutants: null,
    },
  ];
}

function assertStageOutcomeObservation(attempt: Attempt): void {
  if (
    [
      attempt.accepted,
      attempt.producer_schema !== 'VidaContourStagePublicationError/v1',
      !/^(?:coverage|frozen-crap|crap-applicability|mutation)\/(?:completed|failed|timeout|unknown|resource)\/(?:unknown-or-partial|published-receipt-failed)$/u.test(
        attempt.status,
      ),
      attempt.sources.length !== 0,
      attempt.tests.length !== 0,
      attempt.tools.length !== 0,
      attempt.closure.length !== 0,
      attempt.selected_tests.length !== 0,
      attempt.selection_complete,
      attempt.coverage !== null,
      attempt.killed !== null,
      attempt.mutants !== null,
      attempt.max_cc !== null,
      attempt.max_entry_crap !== null,
      attempt.coverage_run_id !== undefined,
      attempt.function_count !== undefined,
      attempt.coverage_binding !== undefined,
      attempt.native_provenance !== undefined,
      attempt.confirmed_killed !== undefined,
      attempt.tool_fingerprint !== null,
      attempt.selection_artifact !== null,
    ].some(Boolean)
  )
    throw new Error('Stage outcome is not admitted evidence.');
}

export function contourAttempts(value: unknown, receipt: Receipt, artifactSha256?: string): Attempt[] {
  if (artifactSha256 !== undefined && !/^[a-f0-9]{64}$/u.test(artifactSha256))
    throw new Error('Invalid observed contour artifact digest.');
  const report = object(value);
  if (report.schema === 'CandidateNativeMutationReport/v1')
    throw new Error('Native mutation reports require the validated --native-report route.');
  if (report.schema === 'VidaContourStagePublicationError/v1') return stageOutcomeAttempts(report, receipt);
  if (report.schema === 'VidaScopedCrapApplicabilityNA/v1') {
    assertFsSafeCrapApplicabilityReceipt(report);
    const contour = text(report.contour);
    const sources = checkedSources(contour, report.sources);
    const tests = digests(report.test_inputs);
    const tools = digests(report.tool_inputs);
    const modules = digests(report.module_inputs);
    const selection = object(report.test_selection);
    if (
      !tests.length ||
      !tools.length ||
      !modules.length ||
      selection.mode !== 'focused-diagnostic' ||
      selection.contour !== contour ||
      JSON.stringify(selection.sources) !== JSON.stringify(sources.map(({ path }) => path))
    )
      throw new Error('CRAP applicability requires complete captured contour inputs.');
    const selected = selectedTests(contour, selection.tests, tests);
    if (!selected.selection_complete) throw new Error('CRAP applicability test selection is incomplete.');
    return [
      {
        ...receipt,
        contour,
        lane: 'crap-applicability',
        run_id: text(report.run_id),
        coverage_run_id: text(report.coverage_run_id),
        sources,
        tests,
        tools,
        closure: inputClosure(modules, tests, tools, sources),
        ...selected,
        producer_schema: report.schema,
        selection_artifact: receipt.artifact,
        tool_fingerprint: null,
        status: 'reviewed-not-applicable',
        accepted: true,
        coverage_binding: {
          report_sha256: text(report.coverage_report_sha256),
          manifest_sha256: text(report.manifest_sha256),
        },
        coverage: null,
        max_cc: null,
        max_entry_crap: null,
        killed: null,
        mutants: null,
      },
    ];
  }
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
    tool_fingerprint:
      report.schema === 'VidaScopedCrapBudgetReport/v1' ||
      report.schema === 'VidaScopedCrapBudgetReport/v2' ||
      report.schema === 'VidaScopedCrapBudgetReport/v3' ||
      report.schema === 'VidaScopedCrapBudgetReport/v4'
        ? null
        : text(report.tool_fingerprint),
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
    if (functions.length !== coverage.functions.total) throw new Error('Coverage function inventory differs.');
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
        ...(artifactSha256 &&
        typeof report.manifest_sha256 === 'string' &&
        /^[a-f0-9]{64}$/u.test(report.manifest_sha256)
          ? { coverage_binding: { report_sha256: artifactSha256, manifest_sha256: report.manifest_sha256 } }
          : {}),
        accepted,
        coverage,
        max_cc: functions.length ? Math.max(...functions.map((row) => number(row.complexity))) : null,
        max_entry_crap: functions.length ? Math.max(...functions.map((row) => number(row.crap))) : null,
        killed: null,
        mutants: null,
      },
    ];
  }
  if (report.schema === 'VidaScopedCrapBudgetReport/v1') {
    const allowed = [
      'schema',
      'status',
      'contour',
      'qualification_scope',
      'full_qualification',
      'historical_measurement_admitted',
      'historical_coverage_runtime_artifacts',
      'baseline_ref',
      'baseline_commit',
      'budget_commit',
      'budget_file',
      'budget_sha256',
      'original_sources',
      'run_id',
      'coverage_run_id',
      'coverage_report',
      'coverage_report_sha256',
      'manifest_sha256',
      'sources',
      'test_inputs',
      'tool_inputs',
      'module_inputs',
      'test_selection',
      'functions',
      'limits',
    ];
    if (allowed.some((key) => !(key in report)))
      throw new Error('Scoped CRAP report is missing owner-issued proof fields.');
    if (Object.keys(report).some((key) => !allowed.includes(key)))
      throw new Error('Scoped CRAP report contains unrecognized claims.');
    const contour = text(report.contour);
    const runId = text(report.run_id);
    if (
      report.status !== 'scoped-proof-pass' ||
      report.qualification_scope !== 'declared-contour-original-source-lower-bound' ||
      report.full_qualification !== false ||
      report.historical_measurement_admitted !== false ||
      report.historical_coverage_runtime_artifacts !== 'not-consumed/not-admitted' ||
      text(report.coverage_run_id) !== runId
    )
      throw new Error('Scoped CRAP report has invalid local-only qualification metadata.');
    const sources = checkedSources(contour, report.sources);
    const tests = digests(report.test_inputs);
    const tools = digests(report.tool_inputs);
    const moduleInputs = digests(report.module_inputs);
    text(report.limits);
    if (!tests.length || !tools.length || !moduleInputs.length)
      throw new Error('Scoped CRAP proof requires complete captured test, tool and module inputs.');
    const selection = object(report.test_selection);
    if (
      selection.mode !== 'focused-diagnostic' ||
      text(selection.contour) !== contour ||
      !Array.isArray(selection.sources) ||
      canonicalJson(selection.sources.map(text).sort()) !== canonicalJson(sources.map((row) => row.path))
    )
      throw new Error('Scoped CRAP test contour or selected Sources differ.');
    const selected = selectedTests(contour, selection.tests, tests);
    if (!selected.selection_complete) throw new Error('Scoped CRAP test selection is incomplete.');
    const functions = rows(report.functions);
    if (!functions.length) throw new Error('Scoped CRAP report has no function measurements.');
    const identities = functions.map((row) => text(row.identity));
    if (new Set(identities).size !== identities.length) throw new Error('Duplicate scoped CRAP function identity.');
    const currentIdentities = functions.map((row) => text(row.current_identity));
    if (new Set(currentIdentities).size !== currentIdentities.length)
      throw new Error('Duplicate scoped CRAP current function identity.');
    for (const row of functions) {
      text(row.rationale);
      for (const key of [
        'original_source_complexity',
        'maximum_complexity',
        'maximum_crap',
        'conservative_crap_ceiling',
      ]) {
        const value = row[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
          throw new Error('Scoped CRAP proof rows are malformed.');
      }
      if (row.coverage !== 1) throw new Error('Scoped CRAP function measurement is incomplete.');
      for (const key of ['complexity', 'crap']) {
        const measured = row[key];
        if (typeof measured !== 'number' || !Number.isFinite(measured) || measured <= 0)
          throw new Error('Scoped CRAP measurements must be positive finite numbers.');
      }
    }
    return [
      {
        ...receipt,
        contour,
        lane: 'frozen-crap',
        run_id: runId,
        coverage_run_id: text(report.coverage_run_id),
        function_count: functions.length,
        sources,
        tests,
        tools,
        closure: inputClosure(moduleInputs, tests, tools, sources),
        ...selected,
        producer_schema: text(report.schema),
        selection_artifact: receipt.artifact,
        tool_fingerprint: null,
        status: 'scoped-proof-pass',
        accepted: true,
        coverage: null,
        max_cc: Math.max(...functions.map((row) => number(row.complexity))),
        max_entry_crap: Math.max(...functions.map((row) => number(row.crap))),
        killed: null,
        mutants: null,
      },
    ];
  }
  if (
    report.schema === 'VidaScopedCrapBudgetReport/v2' ||
    report.schema === 'VidaScopedCrapBudgetReport/v3' ||
    report.schema === 'VidaScopedCrapBudgetReport/v4'
  ) {
    const crossRoleProof = report.schema === 'VidaScopedCrapBudgetReport/v4';
    const reviewedPairs = crossRoleProof || report.schema === 'VidaScopedCrapBudgetReport/v3';
    const allowed = [
      'schema',
      'status',
      'contour',
      'qualification_scope',
      'full_qualification',
      'historical_measurement_admitted',
      'historical_coverage_runtime_artifacts',
      'baseline_ref',
      'baseline_commit',
      'budget_commit',
      'budget_file',
      'budget_sha256',
      'original_sources',
      'source_mappings',
      ...(reviewedPairs ? ['source_mapping_kind', 'identity_reuses', 'new_source_paths', 'removed_source_paths'] : []),
      ...(crossRoleProof ? ['cross_role_identity_reuses'] : []),
      'run_id',
      'coverage_run_id',
      'coverage_report',
      'coverage_report_sha256',
      'manifest_sha256',
      'sources',
      'test_inputs',
      'tool_inputs',
      'module_inputs',
      'test_selection',
      'functions',
      'limits',
    ];
    if (allowed.some((key) => !(key in report)))
      throw new Error(`Scoped CRAP ${reviewedPairs ? 'v3' : 'v2'} report is missing owner-issued proof fields.`);
    if (Object.keys(report).some((key) => !allowed.includes(key)))
      throw new Error(`Scoped CRAP ${reviewedPairs ? 'v3' : 'v2'} report contains unrecognized claims.`);
    if (reviewedPairs && report.source_mapping_kind !== 'reviewed-pairs')
      throw new Error('Scoped CRAP v3 source mapping kind is unsupported.');
    const contour = text(report.contour);
    const runId = text(report.run_id);
    if (
      report.status !== 'scoped-proof-pass' ||
      report.qualification_scope !== 'declared-contour-reviewed-function-budgets' ||
      report.full_qualification !== false ||
      report.historical_measurement_admitted !== false ||
      report.historical_coverage_runtime_artifacts !== 'not-consumed/not-admitted' ||
      text(report.coverage_run_id) !== runId
    )
      throw new Error('Scoped CRAP v2 report has invalid local-only qualification metadata.');

    const sources = checkedSources(contour, report.sources);
    const originalSources = digests(report.original_sources);
    const tests = digests(report.test_inputs);
    const tools = digests(report.tool_inputs);
    const moduleInputs = digests(report.module_inputs);
    text(report.limits);
    if (!tests.length || !tools.length || !moduleInputs.length)
      throw new Error('Scoped CRAP v2 proof requires complete captured test, tool and module inputs.');
    if (
      [...originalSources, ...sources, ...tests, ...tools, ...moduleInputs].some(
        (row) => !/^[a-f0-9]{64}$/.test(row.sha256),
      )
    )
      throw new Error('Scoped CRAP v2 input digest is malformed.');

    const mappingRows = rows(report.source_mappings);
    const originalPaths = new Set(originalSources.map((row) => row.path));
    const currentPaths = new Set(sources.map((row) => row.path));
    const sourceMap = new Map<string, Set<string>>();
    const mappedCurrent = new Set<string>();
    for (const row of mappingRows) {
      exactKeys(row, ['original_path', 'current_path', 'rationale']);
      const originalPath = text(row.original_path);
      const currentPath = text(row.current_path);
      const rationale = text(row.rationale);
      if (
        originalPath.trim() !== originalPath ||
        currentPath.trim() !== currentPath ||
        rationale.trim().length < 8 ||
        !originalPaths.has(originalPath) ||
        !currentPaths.has(currentPath)
      )
        throw new Error('Scoped CRAP v2 source mapping is malformed.');
      if (sourceMap.get(originalPath)?.has(currentPath))
        throw new Error(
          reviewedPairs
            ? 'Scoped CRAP v3 source mappings contain a duplicate pair.'
            : 'Scoped CRAP v2 source mappings must be one-to-one.',
        );
      if (!reviewedPairs && (sourceMap.has(originalPath) || mappedCurrent.has(currentPath)))
        throw new Error('Scoped CRAP v2 source mappings must be one-to-one.');
      const destinations = sourceMap.get(originalPath) ?? new Set<string>();
      destinations.add(currentPath);
      sourceMap.set(originalPath, destinations);
      mappedCurrent.add(currentPath);
    }
    const removedPaths = reviewedPairs
      ? stringArray(report.removed_source_paths)
      : [...originalPaths].filter((file) => !sourceMap.has(file));
    const addedPaths = reviewedPairs
      ? stringArray(report.new_source_paths)
      : [...currentPaths].filter((file) => !mappedCurrent.has(file));
    const removedSourcePaths = new Set(removedPaths);
    const newSourcePaths = new Set(addedPaths);
    if (
      removedSourcePaths.size !== removedPaths.length ||
      newSourcePaths.size !== addedPaths.length ||
      canonicalJson([...sourceMap.keys(), ...removedSourcePaths].sort()) !== canonicalJson([...originalPaths].sort()) ||
      canonicalJson([...mappedCurrent, ...newSourcePaths].sort()) !== canonicalJson([...currentPaths].sort())
    )
      throw new Error('Scoped CRAP v2 source mappings and additions/removals differ from exact Source paths.');

    const selection = object(report.test_selection);
    if (
      selection.mode !== 'focused-diagnostic' ||
      text(selection.contour) !== contour ||
      !Array.isArray(selection.sources) ||
      canonicalJson(selection.sources.map(text).sort()) !== canonicalJson(sources.map((row) => row.path))
    )
      throw new Error('Scoped CRAP v2 test contour or selected Sources differ.');
    const selected = selectedTests(contour, selection.tests, tests);
    if (!selected.selection_complete) throw new Error('Scoped CRAP v2 test selection is incomplete.');

    const functions = rows(report.functions);
    if (!functions.length) throw new Error('Scoped CRAP v2 report has no function dispositions.');
    const originalIds = new Set<string>();
    const retainedSuccessors = new Map<string, string>();
    const currentIds = new Set<string>();
    const newIds = new Set<string>();
    const currentRows: { complexity: number; crap: number }[] = [];
    const sourceOfIdentity = (value: unknown): string => {
      const identity = text(value);
      const delimiter = identity.indexOf('#');
      if (identity.trim() !== identity || delimiter <= 0 || delimiter === identity.length - 1)
        throw new Error('Scoped CRAP v2 function identity is malformed.');
      return identity.slice(0, delimiter);
    };
    for (const row of functions) {
      const kind = text(row.kind);
      if (text(row.rationale).trim().length < 8) throw new Error('Scoped CRAP v2 function rationale is missing.');
      if (kind === 'retained') {
        exactKeys(row, [
          'kind',
          'identity',
          'current_identity',
          'original_source_complexity',
          'maximum_complexity',
          'maximum_crap',
          'complexity',
          'coverage',
          'crap',
          'rationale',
        ]);
        const identity = text(row.identity);
        const currentIdentity = text(row.current_identity);
        const originalPath = sourceOfIdentity(identity);
        const currentPath = sourceOfIdentity(currentIdentity);
        if (
          !sourceMap.get(originalPath)?.has(currentPath) ||
          originalIds.has(identity) ||
          currentIds.has(currentIdentity)
        )
          throw new Error('Scoped CRAP v2 function lineage is not one-to-one through reviewed source mappings.');
        originalIds.add(identity);
        retainedSuccessors.set(identity, currentIdentity);
        currentIds.add(currentIdentity);
        const originalComplexity = positiveInteger(row.original_source_complexity);
        const maximumComplexity = positiveInteger(row.maximum_complexity);
        const maximumCrap = positiveInteger(row.maximum_crap);
        const complexity = positiveInteger(row.complexity);
        const crap = positiveFinite(row.crap);
        if (
          maximumComplexity !== originalComplexity ||
          maximumCrap < originalComplexity ||
          complexity > maximumComplexity ||
          crap > maximumCrap ||
          crap !== complexity
        )
          throw new Error('Scoped CRAP v2 measurements exceed their reviewed budgets.');
        if (row.coverage !== 1) throw new Error('Scoped CRAP v2 current function measurement is incomplete.');
        currentRows.push({ complexity, crap });
      } else if (kind === 'new') {
        exactKeys(row, [
          'kind',
          'identity',
          'current_identity',
          'maximum_complexity',
          'maximum_crap',
          'complexity',
          'coverage',
          'crap',
          'rationale',
        ]);
        const identity = text(row.identity);
        const currentIdentity = text(row.current_identity);
        const currentPath = sourceOfIdentity(currentIdentity);
        if (
          identity !== currentIdentity ||
          !currentPaths.has(currentPath) ||
          (!reviewedPairs && originalIds.has(identity)) ||
          currentIds.has(currentIdentity)
        )
          throw new Error('Scoped CRAP v2 new function identity is not bound to a reviewed current Source.');
        currentIds.add(currentIdentity);
        newIds.add(identity);
        const maximumComplexity = positiveInteger(row.maximum_complexity);
        const maximumCrap = positiveInteger(row.maximum_crap);
        const complexity = positiveInteger(row.complexity);
        const crap = positiveFinite(row.crap);
        if (
          maximumComplexity > 10 ||
          maximumCrap > 10 ||
          complexity > maximumComplexity ||
          crap > maximumCrap ||
          crap !== complexity
        )
          throw new Error('Scoped CRAP v2 measurements exceed their reviewed budgets.');
        if (row.coverage !== 1) throw new Error('Scoped CRAP v2 current function measurement is incomplete.');
        currentRows.push({ complexity, crap });
      } else if (kind === 'removed') {
        exactKeys(row, ['kind', 'identity', 'file', 'rationale']);
        const identity = text(row.identity);
        const file = text(row.file);
        if (
          file.trim() !== file ||
          sourceOfIdentity(identity) !== file ||
          !originalPaths.has(file) ||
          originalIds.has(identity)
        )
          throw new Error('Scoped CRAP v2 removed function is not bound to a reviewed original Source.');
        originalIds.add(identity);
      } else {
        throw new Error('Scoped CRAP v2 function kind is invalid.');
      }
    }
    const allowedReuses = new Set<string>();
    if (reviewedPairs) {
      for (const row of rows(report.identity_reuses)) {
        exactKeys(row, ['original_identity', 'successor_identity', 'rationale']);
        const identity = text(row.original_identity),
          successor = text(row.successor_identity);
        if (
          text(row.rationale).trim().length < 8 ||
          identity === successor ||
          allowedReuses.has(identity) ||
          retainedSuccessors.get(identity) !== successor ||
          !newIds.has(identity)
        )
          throw new Error(
            'Scoped CRAP v3 identity reuse does not bind a retained successor and independently capped adapter.',
          );
        allowedReuses.add(identity);
      }
    }
    if ([...newIds].some((identity) => originalIds.has(identity) && !allowedReuses.has(identity)))
      throw new Error('Scoped CRAP v2 new function overlaps a reviewed original identity.');
    if (crossRoleProof)
      scopedCrossRoleIdentityReuses(report.cross_role_identity_reuses, originalIds, retainedSuccessors);
    if (!currentRows.length) throw new Error('Scoped CRAP v2 report has no current function measurements.');
    return [
      {
        ...receipt,
        contour,
        lane: 'frozen-crap',
        run_id: runId,
        coverage_run_id: text(report.coverage_run_id),
        function_count: currentRows.length,
        sources,
        tests,
        tools,
        closure: inputClosure(moduleInputs, tests, tools, sources),
        ...selected,
        producer_schema: text(report.schema),
        selection_artifact: receipt.artifact,
        tool_fingerprint: null,
        status: 'scoped-proof-pass',
        accepted: true,
        coverage: null,
        max_cc: Math.max(...currentRows.map((row) => row.complexity)),
        max_entry_crap: Math.max(...currentRows.map((row) => row.crap)),
        killed: null,
        mutants: null,
      },
    ];
  }
  if (report.schema !== 'CandidateMutationPilotReport/v2' && report.schema !== 'CandidateMutationReport/v4')
    throw new Error('Unsupported contour producer schema.');
  if (!Array.isArray(report.selected_partitions) || !report.selected_partitions.length)
    throw new Error('Mutation report has no selected partitions.');
  const soleSelectedPartition: unknown = report.selected_partitions.length === 1 ? report.selected_partitions[0] : null;
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
    .filter(
      (name) => mutationPartitions({ includeRetired: true }).find((row) => row.name === name)?.environment !== 'static',
    )
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
      // Producer totals apply to one contour only when it is the sole selected partition.
      let confirmedKilled: number | undefined;
      if (
        soleSelectedPartition === contour &&
        mutants !== null &&
        (Object.hasOwn(report, 'killed') || Object.hasOwn(report, 'mutants'))
      ) {
        const confirmed = report.killed;
        if (
          typeof confirmed !== 'number' ||
          !Number.isSafeInteger(confirmed) ||
          confirmed < 0 ||
          killed === null ||
          confirmed > killed ||
          report.mutants !== mutants
        )
          throw new Error('Mutation producer counts differ from the sole partition.');
        confirmedKilled = confirmed;
      }
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
      if (accepted && confirmedKilled !== undefined && confirmedKilled !== killed)
        throw new Error('Accepted mutation count differs from raw runner count.');
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
        ...(confirmedKilled !== undefined ? { confirmed_killed: confirmedKilled } : {}),
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
    confirmed_killed: _confirmedKilled,
    coverage_binding: _coverageBinding,
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
        ((attempt.coverage?.functions.total === 0
          ? attempt.max_cc !== null || attempt.max_entry_crap !== null
          : attempt.max_cc === null || attempt.max_entry_crap === null) ||
          attempt.killed !== null ||
          attempt.mutants !== null)) ||
      ((attempt.lane === 'mutation' || attempt.lane === 'native-mutation') &&
        (attempt.max_cc !== null ||
          attempt.max_entry_crap !== null ||
          (attempt.killed === null) !== (attempt.mutants === null))) ||
      (attempt.lane === 'native-mutation' &&
        (!attempt.accepted ||
          attempt.producer_schema !== 'CandidateNativeMutationReport/v1' ||
          attempt.status !== 'pilot-pass' ||
          attempt.killed === null ||
          attempt.killed !== attempt.mutants ||
          attempt.killed <= 0 ||
          !attempt.native_provenance)) ||
      (attempt.lane !== 'native-mutation' &&
        (attempt.native_provenance !== undefined || attempt.producer_schema === 'CandidateNativeMutationReport/v1')) ||
      (attempt.lane === 'frozen-crap' &&
        (!attempt.accepted ||
          (attempt.producer_schema !== 'VidaScopedCrapBudgetReport/v1' &&
            attempt.producer_schema !== 'VidaScopedCrapBudgetReport/v2' &&
            attempt.producer_schema !== 'VidaScopedCrapBudgetReport/v3' &&
            attempt.producer_schema !== 'VidaScopedCrapBudgetReport/v4') ||
          attempt.coverage_run_id !== attempt.run_id ||
          !Number.isSafeInteger(attempt.function_count) ||
          attempt.coverage !== null ||
          attempt.killed !== null ||
          attempt.mutants !== null ||
          attempt.max_cc === null ||
          attempt.max_entry_crap === null ||
          !Number.isFinite(attempt.max_cc) ||
          !Number.isFinite(attempt.max_entry_crap) ||
          attempt.max_cc <= 0 ||
          attempt.max_entry_crap <= 0))
    )
      throw new Error('Contour lane metrics differ.');
    if (
      (attempt.coverage_binding !== undefined && !['coverage', 'crap-applicability'].includes(attempt.lane)) ||
      (attempt.lane !== 'crap-applicability' && attempt.producer_schema === 'VidaScopedCrapApplicabilityNA/v1') ||
      (attempt.lane === 'crap-applicability' &&
        (attempt.contour !== fsSafeApplicabilityReview.contour ||
          !attempt.accepted ||
          attempt.producer_schema !== 'VidaScopedCrapApplicabilityNA/v1' ||
          attempt.status !== 'reviewed-not-applicable' ||
          attempt.coverage_run_id !== attempt.run_id ||
          attempt.function_count !== undefined ||
          attempt.coverage !== null ||
          attempt.max_cc !== null ||
          attempt.max_entry_crap !== null ||
          attempt.killed !== null ||
          attempt.mutants !== null ||
          !attempt.coverage_binding ||
          !attempt.selection_complete ||
          JSON.stringify(attempt.sources) !==
            JSON.stringify([
              {
                path: fsSafeApplicabilityReview.source,
                sha256: fsSafeApplicabilityReview.source_sha256,
              },
            ])))
    )
      throw new Error('Invalid distinct CRAP applicability observation.');
    if (
      attempt.confirmed_killed !== undefined &&
      (attempt.lane !== 'mutation' ||
        attempt.killed === null ||
        !Number.isSafeInteger(attempt.confirmed_killed) ||
        attempt.confirmed_killed < 0 ||
        attempt.confirmed_killed > attempt.killed)
    )
      throw new Error('Invalid confirmed mutation count.');
    if (attempt.accepted && attempt.confirmed_killed !== undefined && attempt.confirmed_killed !== attempt.killed)
      throw new Error('Accepted mutation count differs from raw runner count.');
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
    if (attempt.lane === 'stage-outcome') assertStageOutcomeObservation(attempt);
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
    if (
      before?.coverage_binding &&
      attempt.coverage_binding &&
      canonicalJson(before.coverage_binding) !== canonicalJson(attempt.coverage_binding)
    )
      throw new Error('Conflicting coverage report/manifest binding: ' + key(attempt));
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
    if (
      before.confirmed_killed !== undefined &&
      attempt.confirmed_killed !== undefined &&
      before.confirmed_killed !== attempt.confirmed_killed
    )
      throw new Error('Conflicting confirmed mutation count: ' + key(attempt));
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
      ...((before.confirmed_killed ?? attempt.confirmed_killed) !== undefined
        ? { confirmed_killed: before.confirmed_killed ?? attempt.confirmed_killed }
        : {}),
      ...((before.coverage_binding ?? attempt.coverage_binding) !== undefined
        ? { coverage_binding: before.coverage_binding ?? attempt.coverage_binding }
        : {}),
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
function compatibleScopedMeasurement(coverage: Attempt, crap: Attempt): boolean {
  return (
    crap.coverage_run_id === coverage.run_id &&
    coverage.selection_complete &&
    crap.selection_complete &&
    canonicalJson(coverage.selected_tests) === canonicalJson(crap.selected_tests) &&
    canonicalJson(coverage.sources) === canonicalJson(crap.sources) &&
    canonicalJson(coverage.tests) === canonicalJson(crap.tests) &&
    canonicalJson(coverage.tools) === canonicalJson(crap.tools) &&
    canonicalJson(coverage.closure) === canonicalJson(crap.closure)
  );
}
function compatibleFrozenCrap(coverage: Attempt, crap: Attempt): boolean {
  return (
    crap.lane === 'frozen-crap' &&
    crap.function_count === coverage.coverage?.functions.total &&
    compatibleScopedMeasurement(coverage, crap)
  );
}
function maximum(attempt: Attempt): boolean {
  return (
    attempt.lane !== 'crap-applicability' &&
    attempt.accepted &&
    (attempt.lane === 'mutation' || attempt.lane === 'native-mutation'
      ? attempt.killed === attempt.mutants && attempt.mutants! > 0
      : attempt.lane === 'frozen-crap'
        ? attempt.max_cc !== null && attempt.max_entry_crap !== null
        : attempt.coverage !== null &&
          Object.values(attempt.coverage).every((row) => row.total > 0 && row.covered === row.total))
  );
}
export { maximum as contourAttemptMaximum };
function cell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}
function counts(attempt: Attempt | undefined): string {
  if (!attempt) return 'unknown';
  if (attempt.lane === 'coverage-outcome' || attempt.lane === 'stage-outcome') return 'no metric evidence';
  if ((attempt.lane === 'mutation' || attempt.lane === 'native-mutation') && attempt.mutants === null)
    return 'unknown (' + attempt.status + ')';
  if (attempt.lane === 'native-mutation')
    return `${attempt.killed}/${attempt.mutants} (${attempt.status}; reader-validated native assertion-confirmed partition proof; local only)`;
  if (attempt.lane === 'mutation') {
    const qualification = attempt.accepted
      ? 'assertion-confirmed'
      : attempt.confirmed_killed !== undefined
        ? `assertion-confirmed count; raw runner Killed ${attempt.killed}; unqualified`
        : 'raw runner Killed; unqualified';
    return `${attempt.confirmed_killed ?? attempt.killed}/${attempt.mutants} (${attempt.status}; ${qualification})`;
  }
  if (attempt.lane === 'frozen-crap')
    return `${attempt.max_cc} / ${attempt.max_entry_crap} (scoped proof; owner measured)`;
  if (attempt.lane === 'crap-applicability') return 'N/A (reviewed data-only applicability; no numeric score)';
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

function lastCompleteTripleClosure(
  coverage: Attempt[],
  mutation: Attempt[],
  crap: Attempt[],
): readonly [Attempt, Attempt, Attempt] | undefined {
  for (const current of coverage.toReversed()) {
    if (!maximum(current)) continue;
    const frozen = crap.find((row) => maximum(row) && compatibleFrozenCrap(current, row));
    if (!frozen) continue;
    const killed = mutation.find((row) => maximum(row) && compatible(current, row));
    if (killed) return [current, killed, frozen];
  }
  return undefined;
}

/** The reviewed data file has no numeric triple; only a separate compatible closure. */
export function reviewedDataOnlyClosure(coverage: Attempt[], mutation: Attempt[], applicability: Attempt[]) {
  for (const current of coverage.toReversed()) {
    const counters = current.coverage;
    if (
      current.contour !== fsSafeApplicabilityReview.contour ||
      !current.accepted ||
      !counters ||
      current.max_cc !== null ||
      current.max_entry_crap !== null ||
      !current.coverage_binding ||
      JSON.stringify(current.sources) !==
        JSON.stringify([
          {
            path: fsSafeApplicabilityReview.source,
            sha256: fsSafeApplicabilityReview.source_sha256,
          },
        ]) ||
      counters.functions.total !== 0 ||
      counters.functions.covered !== 0 ||
      counters.branches.total !== 0 ||
      counters.branches.covered !== 0 ||
      ![counters.lines, counters.statements].every(({ total, covered }) => total > 0 && covered === total)
    )
      continue;
    const reviewed = applicability.find(
      (row) =>
        row.lane === 'crap-applicability' &&
        row.contour === current.contour &&
        row.accepted &&
        row.status === 'reviewed-not-applicable' &&
        row.producer_schema === 'VidaScopedCrapApplicabilityNA/v1' &&
        row.max_cc === null &&
        row.max_entry_crap === null &&
        compatibleScopedMeasurement(current, row) &&
        canonicalJson(row.coverage_binding) === canonicalJson(current.coverage_binding),
    );
    if (!reviewed) continue;
    const killed = mutation.find(
      (row) =>
        row.lane === 'native-mutation' &&
        row.contour === current.contour &&
        row.status === 'pilot-pass' &&
        row.producer_schema === 'CandidateNativeMutationReport/v1' &&
        row.native_provenance &&
        maximum(row) &&
        compatible(current, row),
    );
    if (killed) return [current, killed, reviewed] as const;
  }
  return undefined;
}

/** Selection only: same-commit local proofs never establish global acceptance or host freshness. */
export function selectContourCampaign(snapshot: Snapshot, mode: 'all' | 'unclosed', commit: string) {
  const currentByContour =
    mode === 'unclosed'
      ? Map.groupBy(
          snapshot.attempts.filter((row) => row.commit === commit),
          (row) => row.contour,
        )
      : undefined;
  return mutationPartitions().filter((partition) => {
    if (partition.environment === 'static') return false;
    if (mode === 'all') return true;
    const current = currentByContour?.get(partition.name) ?? [];
    const coverage = current.filter((row) => row.lane === 'coverage');
    const mutation = current.filter((row) => row.lane === 'mutation' || row.lane === 'native-mutation');
    return (
      !lastCompleteTripleClosure(
        coverage,
        mutation,
        current.filter((row) => row.lane === 'frozen-crap'),
      ) &&
      !reviewedDataOnlyClosure(
        coverage,
        mutation,
        current.filter((row) => row.lane === 'crap-applicability'),
      )
    );
  });
}

function attemptRow(row: Attempt): string {
  return `| ${row.lane} | ${cell(row.run_id)} | ${cell(row.commit)} | ${row.recorded_at} | ${cell(row.status)}; ${row.accepted ? 'owner accepted locally' : 'unqualified'}; selection ${row.selection_complete ? 'bound' : 'unbound'} | ${cell(counts(row))} | ${cell(row.artifact)} |`;
}

export function renderContourProgress(snapshot: Snapshot): string {
  const registry = mutationPartitions({ includeRetired: true });
  const partitions = registry.filter((row) => row.environment !== 'retired');
  const retiredPartitions = registry.filter((row) => row.environment === 'retired');
  const executableCount = partitions.filter((row) => row.environment !== 'static').length;
  let completed = 0;
  let tripleCompleted = 0;
  let coverageCompleted = 0;
  let coverageFrozenCompleted = 0;
  let reviewedDataOnlyCompleted = 0;
  const body: string[] = [];
  const details: string[] = [];
  const attemptsByContour = Map.groupBy(snapshot.attempts, (row) => row.contour);
  for (const partition of partitions) {
    const attempts = attemptsByContour.get(partition.name) ?? [];
    const coverage = attempts.filter((row) => row.lane === 'coverage');
    const mutation = attempts.filter((row) => row.lane === 'mutation' || row.lane === 'native-mutation');
    const crap = attempts.filter((row) => row.lane === 'frozen-crap');
    const applicability = attempts.filter((row) => row.lane === 'crap-applicability');
    const dataOnly = reviewedDataOnlyClosure(coverage, mutation, applicability);
    if (dataOnly) reviewedDataOnlyCompleted++;
    const staticOnly = partition.environment === 'static';
    const best = lastCompleteClosure(coverage, mutation);
    const triple = lastCompleteTripleClosure(coverage, mutation, crap);
    const completeCoverage = coverage.filter(maximum);
    if (!staticOnly && completeCoverage.length > 0) coverageCompleted++;
    if (
      !staticOnly &&
      completeCoverage.some((current) => crap.some((row) => maximum(row) && compatibleFrozenCrap(current, row)))
    )
      coverageFrozenCompleted++;
    if (best) completed++;
    if (triple) tripleCompleted++;
    const lastCoverage = coverage.at(-1);
    const lastMutation = mutation.at(-1);
    const lastCrap = crap.at(-1);
    const lastOutcome = attempts
      .filter((row) => row.lane === 'coverage-outcome' || row.lane === 'stage-outcome')
      .at(-1);
    body.push(
      `| ${partition.name} | ${cell(counts(lastCoverage))} | ${lastCoverage ? (lastCoverage.coverage?.functions.total === 0 ? 'N/A: no callable functions (coverage inventory)' : `${lastCoverage.max_cc} / ${lastCoverage.max_entry_crap}`) : 'unknown'} | ${cell(counts(lastMutation))} | ${lastOutcome?.status ?? 'not imported'} | ${staticOnly ? 'N/A: static exports' : best ? 'local maximum recorded' : 'open / unknown'} | ${lastCrap ? `${lastCrap.max_cc} / ${lastCrap.max_entry_crap}` : 'unknown'} | ${triple ? 'local triple recorded' : 'open / unknown'} |`,
    );
    if (!attempts.length) continue;
    details.push(
      `### ${partition.name}\n`,
      `Historical complete local closure: ${best ? best.map((row) => `\`${row.run_id}\``).join(' + ') : 'not recorded'}.`,
      `Achieved in that closure: F/L/S/B ${counts(best?.[0])}; CC / entry CRAP ${best ? `${best[0].max_cc} / ${best[0].max_entry_crap}` : 'unknown'}; mutation ${counts(best?.[1])}.`,
      `Historical complete local coverage + mutation + frozen CRAP closure: ${triple ? triple.map((row) => `\`${row.run_id}\``).join(' + ') : 'not recorded'}.`,
      ...(applicability.length
        ? [
            `Separate reviewed data-only closure: ${dataOnly ? dataOnly.map((row) => `\`${row.run_id}\``).join(' + ') : 'not recorded; applicability alone does not close the contour'}. CC/CRAP are N/A (null), never numeric 0/0 or a triple.`,
          ]
        : []),
      `Frozen CRAP measurement in that closure: ${triple ? `${triple[2].max_cc} / ${triple[2].max_entry_crap}` : 'unknown'}; scoped receipt coverage run: ${triple ? `\`${triple[2].coverage_run_id}\`` : 'unknown'}.`,
      'Current freshness: unverified; this projection never rehashes Source/tests/config or re-admits custody. Global frozen complexity/CRAP and exact coverage qualification: pending.',
      '',
      '| Lane | Run | Commit | Recorded UTC | Status | Measurements | Artifact |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...attempts.map(attemptRow),
      '',
      'Bindings, counters and failed/UNKNOWN observations are retained in the sibling JSON snapshot.',
      '',
    );
  }
  for (const partition of retiredPartitions) {
    const attempts = attemptsByContour.get(partition.name) ?? [];
    const lastCoverage = attempts.filter((row) => row.lane === 'coverage').at(-1);
    const lastMutation = attempts.filter((row) => row.lane === 'mutation' || row.lane === 'native-mutation').at(-1);
    const lastCrap = attempts.filter((row) => row.lane === 'frozen-crap').at(-1);
    body.push(
      `| ${partition.name} (retired) | ${cell(counts(lastCoverage))} | ${lastCoverage ? `${lastCoverage.max_cc} / ${lastCoverage.max_entry_crap}` : 'unknown'} | ${cell(counts(lastMutation))} | historical only | retired; excluded | ${lastCrap ? `${lastCrap.max_cc} / ${lastCrap.max_entry_crap}` : 'unknown'} | retired; excluded |`,
    );
    if (!attempts.length) continue;
    details.push(
      `### ${partition.name} (retired historical contour)\n`,
      'Original observations remain unchanged and are excluded from active closure counts. Child results never synthesize a parent result.',
      '',
      '| Lane | Run | Commit | Recorded UTC | Status | Measurements | Artifact |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...attempts.map(attemptRow),
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
      `Historical contours with exact F/L/S/B coverage: **${coverageCompleted}/${executableCount}**.`,
      `Historical same-coverage-run coverage + scoped frozen CRAP pairs: **${coverageFrozenCompleted}/${executableCount}**.`,
      `Historical complete coverage + assertion-confirmed mutation pair closures: **${completed}/${executableCount}**; static contours: **${partitions.length - executableCount}**.`,
      `Separate same-coverage-run local triples with scoped frozen CRAP: **${tripleCompleted}/${executableCount}**.`,
      `Separate independently reviewed data-only coverage + CRAP N/A + full native closures: **${reviewedDataOnlyCompleted}**; excluded from numeric triples.`,
      `Contours without a complete numeric triple or reviewed data-only closure: **${executableCount - tripleCompleted - reviewedDataOnlyCompleted}**.`,
      `Executable contours without a recorded coverage + mutation pair: **${executableCount - completed}**.`,
      `Executable contours without a recorded complete local triple: **${executableCount - tripleCompleted}**.`,
      '',
      'Current freshness is unverified. Parent operation statuses are owner-reported without re-admitting their receipts. The scoped frozen CRAP lane records its owner-issued local measurements; exact coverage qualification and global frozen-gate acceptance remain pending. A local triple is not global acceptance.',
      '',
      'F/L/S/B are covered/total; CC/CRAP are measured maxima using function-entry-binary coverage. They do not replace frozen per-function ceilings or exact coverage gates. No report means unknown, never zero. A failed or partial last attempt does not erase a historical complete closure. Different Source/test/config closures are never combined into a synthetic maximum.',
      '',
      '| Contour | Latest F / L / S / B | CC / entry CRAP | Latest mutation report | Latest stage / coverage outcome | Historical coverage + mutation pair | Latest frozen CC / CRAP | Same-run local triple |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...body,
      '',
      ...details,
    ].join('\n') + '\n'
  );
}
