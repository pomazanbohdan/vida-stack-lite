import path from 'node:path';
import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, openSync, writeFileSync } from 'node:fs';
import type { Mutant, MutantResult, MutantTestPlan, schema } from '@stryker-mutator/api/core';
import { TestStatus } from '@stryker-mutator/api/test-runner';
import { sha256, type InputDigest } from './bun-coverage-evidence.ts';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import type { MutationProcessResult } from './mutation-evidence.ts';
import { validCapturedOutput } from './mutation-evidence.ts';

type Location = Mutant['location'];
type ReportedMutant = {
  file: string;
  mutant: Pick<schema.MutantResult, 'id' | 'location' | 'mutatorName' | 'replacement' | 'status'>;
};
export type MutationMapBinding = {
  run_id: string;
  partition: string;
  input_fingerprint: string;
  source_fingerprint: string;
  test_fingerprint: string;
  tool_fingerprint: string;
  partition_sources: InputDigest[];
};
type MapPartition = {
  name: string;
  environment?: string;
  sources?: string[];
  requiredReportedSource?: string;
};
const maximumMutationMapArtifactBytes = 32 * 1024 * 1024;

export function writeMutationMapArtifact(directory: string, file: string, record: unknown) {
  if (path.basename(file) !== file || !file.endsWith('.json'))
    throw new Error('Mutation map artifact name is invalid.');
  const bytes = Buffer.from(JSON.stringify(record) + '\n');
  if (bytes.length > maximumMutationMapArtifactBytes) throw new Error('Mutation map artifact exceeds its byte bound.');
  const fd = openSync(path.join(directory, file), 'wx', 0o600);
  let failure: { error: unknown } | undefined;
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          closeSync(fd);
          return undefined;
        },
      ],
      failure,
    );
  }
  return { file, sha256: sha256(bytes), bytes: bytes.length };
}

function checkedPosition(value: unknown, origin: 0 | 1): Location['start'] {
  if (
    !isRecord(value) ||
    typeof value.line !== 'number' ||
    typeof value.column !== 'number' ||
    !Number.isSafeInteger(value.line) ||
    !Number.isSafeInteger(value.column) ||
    !Number.isSafeInteger(value.line + 1 - origin) ||
    !Number.isSafeInteger(value.column + 1 - origin) ||
    value.line < origin ||
    value.column < origin
  )
    throw new Error('Mutation map position is invalid.');
  return { line: value.line + 1 - origin, column: value.column + 1 - origin };
}

/** Public plan positions are zero-based; result/report positions are one-based. */
export function canonicalMutationLocation(location: unknown, origin: 0 | 1): Location {
  if (!isRecord(location)) throw new Error('Mutation map location is invalid.');
  const start = checkedPosition(location.start, origin);
  const end = checkedPosition(location.end, origin);
  if (end.line < start.line || (end.line === start.line && end.column < start.column))
    throw new Error('Mutation map range is reversed.');
  return { start, end };
}

export function mutationMapIdentity(
  root: string,
  sourceInputs: readonly InputDigest[],
  mutant: { fileName: unknown; location: unknown; mutatorName: unknown; replacement?: unknown },
  origin: 0 | 1,
) {
  if (
    typeof mutant.fileName !== 'string' ||
    typeof mutant.mutatorName !== 'string' ||
    !mutant.mutatorName ||
    typeof mutant.replacement !== 'string'
  )
    throw new Error('Mutation map identity has no captured Source binding.');
  const file = path.relative(root, path.resolve(root, mutant.fileName)).replaceAll('\\', '/');
  const source = sourceInputs.find((entry) => entry.path === file);
  if (
    !source ||
    !/^[a-f0-9]{64}$/u.test(source.sha256) ||
    !mutant.mutatorName ||
    typeof mutant.replacement !== 'string'
  )
    throw new Error('Mutation map identity has no captured Source binding.');
  const tuple = {
    source: file,
    source_sha256: source.sha256,
    location: canonicalMutationLocation(mutant.location, origin),
    mutator: mutant.mutatorName,
    replacement: mutant.replacement,
  };
  return { identity: sha256(canonicalJson(tuple)!), ...tuple };
}

export function mutationPartitionMap(root: string, binding: MutationMapBinding, plans: readonly MutantTestPlan[]) {
  const localIds = new Set<string>();
  const identities = new Set<string>();
  const mutants = plans.map((plan) => {
    const canonical = mutationMapIdentity(root, binding.partition_sources, plan.mutant, 0);
    if (localIds.has(plan.mutant.id) || identities.has(canonical.identity))
      throw new Error('Mutation map contains a duplicate local or canonical identity.');
    localIds.add(plan.mutant.id);
    identities.add(canonical.identity);
    return {
      ...canonical,
      local_id: plan.mutant.id,
      plan: plan.plan,
      test_filter: plan.plan === 'Run' ? (plan.runOptions.testFilter ?? null) : null,
      covered_by: plan.mutant.coveredBy ?? null,
      static: plan.mutant.static ?? null,
      engine_status: plan.mutant.status ?? 'Pending',
      confirmed_status: 'unconfirmed',
      function_link: { status: 'unresolved-inventory-not-supplied' },
      scenario_links: { status: 'unreviewed', ids: [] },
    };
  });
  return {
    schema: 'MutationPartitionMap/v1',
    binding,
    position_basis: 'one-based-start-inclusive-end-exclusive',
    generated_universe_complete: true,
    globally_qualified: false,
    mutants,
  };
}

export function mutationResultMapRow(root: string, binding: MutationMapBinding, result: MutantResult) {
  return {
    schema: 'MutationMapEngineEvent/v1',
    ...mutationMapIdentity(root, binding.partition_sources, result, 1),
    local_id: result.id,
    engine_status: result.status,
    tests_completed: result.testsCompleted ?? null,
    killed_by: result.killedBy ?? null,
    confirmed_status: 'unconfirmed',
  };
}

/** Generation evidence has no test plans, engine dispositions or assertion evidence. */
export function mutationGeneratedUniverse(root: string, binding: MutationMapBinding, mutants: readonly Mutant[]) {
  const value = {
    schema: 'MutationGeneratedUniverse/v1' as const,
    binding,
    position_basis: 'one-based-start-inclusive-end-exclusive' as const,
    generated_universe_complete: true as const,
    globally_qualified: false as const,
    mutants: mutants.map((mutant) => ({
      ...mutationMapIdentity(root, binding.partition_sources, mutant, 0),
      local_id: mutant.id,
      generated_status: mutant.status ?? 'Pending',
      confirmed_status: 'unconfirmed' as const,
    })),
  };
  validateMutationUniverse(value, root, binding, 'MutationGeneratedUniverse/v1');
  return value;
}

function validateMutationUniverse(
  value: unknown,
  root: string,
  binding: MutationMapBinding,
  schema: 'MutationPartitionMap/v1' | 'MutationGeneratedUniverse/v1',
) {
  if (
    !isRecord(value) ||
    value.schema !== schema ||
    value.position_basis !== 'one-based-start-inclusive-end-exclusive' ||
    value.generated_universe_complete !== true ||
    value.globally_qualified !== false ||
    canonicalJson(value.binding) !== canonicalJson(binding) ||
    !Array.isArray(value.mutants)
  )
    throw new Error('Mutation partition map does not bind its parent inputs.');
  const localIds = new Map<string, string>();
  const sourceCounts: Record<string, number> = {};
  const identities = new Set<string>();
  for (const row of value.mutants as unknown[]) {
    if (
      !isRecord(row) ||
      typeof row.local_id !== 'string' ||
      typeof row.source !== 'string' ||
      typeof row.mutator !== 'string' ||
      typeof row.replacement !== 'string' ||
      !isRecord(row.location) ||
      row.confirmed_status !== 'unconfirmed'
    )
      throw new Error('Mutation partition map row is malformed.');
    const canonical = mutationMapIdentity(
      root,
      binding.partition_sources,
      {
        fileName: row.source,
        location: row.location,
        mutatorName: row.mutator,
        replacement: row.replacement,
      },
      1,
    );
    if (
      canonical.identity !== row.identity ||
      canonical.source_sha256 !== row.source_sha256 ||
      localIds.has(row.local_id) ||
      identities.has(canonical.identity)
    )
      throw new Error('Mutation partition map has an invalid or duplicate identity.');
    localIds.set(row.local_id, canonical.identity);
    sourceCounts[canonical.source] = (sourceCounts[canonical.source] ?? 0) + 1;
    identities.add(canonical.identity);
  }
  return { mutants: localIds.size, localIds, sourceCounts };
}

/** Reconcile an observed plan with its parent and the already-parsed engine report. */
export function validateMutationPartitionMap(
  value: unknown,
  root: string,
  binding: MutationMapBinding,
  reported?: readonly ReportedMutant[],
) {
  const validated = validateMutationUniverse(value, root, binding, 'MutationPartitionMap/v1');
  const { localIds } = validated;
  if (reported) {
    const reportedIds = new Set<string>();
    for (const { file, mutant } of reported) {
      const canonical = mutationMapIdentity(root, binding.partition_sources, { ...mutant, fileName: file }, 1);
      if (reportedIds.has(mutant.id) || localIds.get(mutant.id) !== canonical.identity)
        throw new Error('Mutation partition map differs from its engine report.');
      reportedIds.add(mutant.id);
    }
    if (reportedIds.size !== localIds.size) throw new Error('Mutation partition map universe is incomplete.');
  }
  return validated;
}

function mutationBatchUniverseDigest(
  binding: MutationMapBinding,
  pairs: readonly { identity: string; local_id: string }[],
): string {
  const universeHash = createHash('sha256')
    .update('MutationBatchUniverse/v2\n')
    .update(canonicalJson(binding))
    .update('\n');
  for (const row of pairs) universeHash.update(canonicalJson(row)).update('\n');
  return universeHash.digest('hex');
}

/** Plan IDs from one complete generation; never regenerate a subset with different mutator semantics. */
export function planMutationBatches(root: string, binding: MutationMapBinding, value: unknown, limit: number) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Mutation batch limit must be a positive integer.');
  validateMutationUniverse(
    value,
    root,
    binding,
    isRecord(value) && value.schema === 'MutationGeneratedUniverse/v1'
      ? 'MutationGeneratedUniverse/v1'
      : 'MutationPartitionMap/v1',
  );
  const universe = value as ReturnType<typeof mutationPartitionMap> | ReturnType<typeof mutationGeneratedUniverse>;
  if (!universe.mutants.length) throw new Error('Mutation batch universe is empty.');
  const rows = [...universe.mutants].sort((left, right) =>
    left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0,
  );
  const batches: { identities: string[]; local_ids: string[] }[] = [];
  for (const row of rows) {
    let batch = batches.at(-1);
    if (!batch || batch.identities.length === limit) {
      batch = { identities: [], local_ids: [] };
      batches.push(batch);
    }
    batch.identities.push(row.identity);
    batch.local_ids.push(row.local_id);
  }
  return {
    schema: 'MutationBatchPlan/v2' as const,
    qualification: 'planning-only' as const,
    binding,
    universe_sha256: mutationBatchUniverseDigest(
      binding,
      rows.map(({ identity, local_id }) => ({ identity, local_id })),
    ),
    limit,
    batches,
  };
}

export type NativeMutationArtifactRef = { file: string; bytes: number; sha256: string };
export type NativeMutationReceiptReference = {
  artifact: NativeMutationArtifactRef;
  launcher: { artifact: NativeMutationArtifactRef; result: MutationProcessResult };
  binding: MutationMapBinding;
  tests: readonly string[];
  active_mutant_id: string | null;
  activation_hit_count: number;
};
export type NativeMutationBatchResult = {
  schema: 'MutationBatchPilotResult/v2';
  binding: MutationMapBinding;
  universe_sha256: string;
  index: number;
  elapsed_ms: number;
  complete: boolean;
  interrupted: boolean;
  budget_exhausted: boolean;
  resource_blocked: { observed_path: string; available_bytes: string | null } | null;
  results: { identity: string; local_id: string; status: 'killed' | 'survived' | 'unknown' }[];
};
export type NativeMutationPartitionProof = {
  schema: 'NativeMutationPartitionProof/v1';
  binding: MutationMapBinding;
  qualification_scope: 'partition';
  full_qualification: false;
  tests: string[];
  universe_sha256: string;
  artifacts: {
    generated_image: NativeMutationArtifactRef;
    batch_plan: NativeMutationArtifactRef;
    input_descriptor: NativeMutationArtifactRef;
  };
  baseline: {
    artifact: NativeMutationArtifactRef;
    runner_receipt: NativeMutationArtifactRef;
    launcher_receipt: NativeMutationArtifactRef;
    cases: { test_file: string; name: string; outcome: 'passed' | 'skipped' }[];
  };
  batches: { index: number; artifact: NativeMutationArtifactRef }[];
  mutants: {
    identity: string;
    local_id: string;
    outcome: 'assertion-confirmed-killed';
    runner_receipt: NativeMutationArtifactRef;
    launcher_receipt: NativeMutationArtifactRef;
  }[];
};

export type NativeMutationProofEvidence = {
  tests: readonly string[];
  artifacts: {
    generated_image: NativeMutationArtifactRef;
    batch_plan: NativeMutationArtifactRef;
    input_descriptor: NativeMutationArtifactRef;
  };
  baseline: {
    status: 'passed' | 'unknown';
    cases: readonly { test_file: string; name: string; outcome: 'passed' | 'skipped' | 'failed' | 'error' }[];
    native_receipt: NativeMutationReceiptReference;
    artifact: NativeMutationArtifactRef;
  };
  batches: readonly { artifact: NativeMutationArtifactRef; value: NativeMutationBatchResult }[];
  receipts: ReadonlyMap<string, NativeMutationReceiptReference>;
};

function validateNativeMutationArtifactRef(value: NativeMutationArtifactRef): void {
  if (
    !value ||
    typeof value.file !== 'string' ||
    !value.file ||
    path.basename(value.file) !== value.file ||
    !value.file.endsWith('.json') ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes < 1 ||
    value.bytes > maximumMutationMapArtifactBytes ||
    typeof value.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.sha256)
  )
    throw new Error('Native mutation proof artifact reference is invalid.');
}

function validateNativeMutationReceipt(
  value: NativeMutationReceiptReference,
  binding: MutationMapBinding,
  tests: readonly string[],
  activeMutantId: string | null,
  baseline: boolean,
): void {
  validateNativeMutationArtifactRef(value?.artifact);
  validateNativeMutationArtifactRef(value?.launcher?.artifact);
  if (
    canonicalJson(value.binding) !== canonicalJson(binding) ||
    canonicalJson(value.tests) !== canonicalJson(tests) ||
    value.active_mutant_id !== activeMutantId ||
    !Number.isSafeInteger(value.activation_hit_count) ||
    (baseline ? value.activation_hit_count !== 0 : value.activation_hit_count < 1) ||
    value.launcher.result.timedOut !== false ||
    value.launcher.result.signal !== null ||
    value.launcher.result.spawnError !== null ||
    value.launcher.result.output_capture?.complete !== true ||
    !validCapturedOutput(value.launcher.result.output_capture.stdout) ||
    !validCapturedOutput(value.launcher.result.output_capture.stderr) ||
    value.launcher.result.processCustody?.scope !== 'owned-process-group' ||
    value.launcher.result.processCustody.terminationObserved !== true ||
    value.launcher.result.processCustody?.processGroupTerminationObserved !== true ||
    value.launcher.result.exitCode !== (baseline ? 0 : 1)
  )
    throw new Error('Native mutation runner receipt does not bind its admitted outcome.');
}

/** Join only parent-validated native observations; never regenerate Source identities here. */
export function validateNativeMutationPartitionProof(
  root: string,
  binding: MutationMapBinding,
  universeValue: unknown,
  planValue: unknown,
  evidence: NativeMutationProofEvidence,
): NativeMutationPartitionProof {
  const tests = evidence.tests;
  const baselineCases = evidence.baseline.cases;
  const universe = validateMutationUniverse(universeValue, root, binding, 'MutationGeneratedUniverse/v1');
  if (
    !isRecord(universeValue) ||
    !Array.isArray(universeValue.mutants) ||
    universeValue.mutants.some((row: unknown) => !isRecord(row) || row.generated_status !== 'Pending')
  )
    throw new Error('Native mutation proof requires a pending-only generated universe.');
  if (
    !isRecord(planValue) ||
    planValue.schema !== 'MutationBatchPlan/v2' ||
    planValue.qualification !== 'planning-only' ||
    canonicalJson(planValue.binding) !== canonicalJson(binding) ||
    typeof planValue.universe_sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(planValue.universe_sha256) ||
    !Array.isArray(planValue.batches) ||
    !planValue.batches.length ||
    !Number.isSafeInteger(planValue.limit) ||
    (planValue.limit as number) < 1
  )
    throw new Error('Native mutation batch plan does not bind the generated universe.');
  if (!Array.isArray(evidence.tests) || !tests.length || tests.some((test) => typeof test !== 'string' || !test))
    throw new Error('Native mutation proof has no complete declared test selection.');
  if (new Set(tests).size !== tests.length)
    throw new Error('Native mutation proof test selection contains duplicates.');

  const expected = new Map(universe.localIds);
  const planned = new Map<string, string>();
  const plannedIndexes = planValue.batches as unknown[];
  for (const batch of plannedIndexes) {
    if (
      !isRecord(batch) ||
      !Array.isArray(batch.identities) ||
      !Array.isArray(batch.local_ids) ||
      batch.identities.length === 0 ||
      batch.identities.length !== batch.local_ids.length ||
      batch.identities.length > (planValue.limit as number)
    )
      throw new Error('Native mutation batch plan contains a malformed batch.');
    for (const [offset, localId] of batch.local_ids.entries()) {
      const identity: unknown = batch.identities[offset];
      if (
        typeof localId !== 'string' ||
        typeof identity !== 'string' ||
        planned.has(localId) ||
        expected.get(localId) !== identity
      )
        throw new Error('Native mutation batch plan differs from the exact generated identity pairs.');
      planned.set(localId, identity);
    }
  }
  if (planned.size !== expected.size) throw new Error('Native mutation batch plan omits generated identity pairs.');
  const expectedUniverseHash = mutationBatchUniverseDigest(
    binding,
    [...expected.entries()]
      .map(([local_id, identity]) => ({ identity, local_id }))
      .sort((left, right) => (left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0)),
  );
  if (planValue.universe_sha256 !== expectedUniverseHash)
    throw new Error('Native mutation batch plan digest differs from its exact identity pairs.');

  const { artifacts } = evidence;
  const usedArtifacts = new Set<string>();
  const registerArtifact = (artifact: NativeMutationArtifactRef) => {
    validateNativeMutationArtifactRef(artifact);
    if (usedArtifacts.has(artifact.file)) throw new Error('Native mutation proof artifact reference is duplicated.');
    usedArtifacts.add(artifact.file);
  };
  registerArtifact(artifacts.generated_image);
  registerArtifact(artifacts.batch_plan);
  registerArtifact(artifacts.input_descriptor);

  if (
    evidence.baseline.status !== 'passed' ||
    !Array.isArray(evidence.baseline.cases) ||
    !baselineCases.length ||
    baselineCases.some(
      (testcase) =>
        !testcase ||
        typeof testcase.test_file !== 'string' ||
        !tests.includes(testcase.test_file) ||
        typeof testcase.name !== 'string' ||
        !testcase.name ||
        (testcase.outcome !== 'passed' && testcase.outcome !== 'skipped'),
    ) ||
    !baselineCases.some((testcase) => testcase.outcome === 'passed')
  )
    throw new Error('Native mutation baseline lacks a complete passing case census.');
  const baselineFiles = new Set(baselineCases.map(({ test_file }) => test_file));
  if (baselineFiles.size !== tests.length || tests.some((test) => !baselineFiles.has(test)))
    throw new Error('Native mutation baseline census does not cover the exact selected test files.');
  validateNativeMutationArtifactRef(evidence.baseline.artifact);
  validateNativeMutationReceipt(evidence.baseline.native_receipt, binding, tests, null, true);
  registerArtifact(evidence.baseline.artifact);
  registerArtifact(evidence.baseline.native_receipt.artifact);
  registerArtifact(evidence.baseline.native_receipt.launcher.artifact);

  if (evidence.batches.length !== plannedIndexes.length)
    throw new Error('Native mutation batch result set is incomplete.');
  const observedIndexes = new Set<number>();
  const observedRows = new Map<string, { identity: string; local_id: string }>();
  const proofBatches: NativeMutationPartitionProof['batches'] = [];
  for (const { artifact, value } of evidence.batches) {
    registerArtifact(artifact);
    if (
      !value ||
      value.schema !== 'MutationBatchPilotResult/v2' ||
      canonicalJson(value.binding) !== canonicalJson(binding) ||
      value.universe_sha256 !== planValue.universe_sha256 ||
      !Number.isSafeInteger(value.index) ||
      value.index < 0 ||
      value.index >= plannedIndexes.length ||
      observedIndexes.has(value.index) ||
      value.complete !== true ||
      value.interrupted !== false ||
      value.budget_exhausted !== false ||
      value.resource_blocked !== null ||
      !Array.isArray(value.results)
    )
      throw new Error('Native mutation batch is incomplete, interrupted, or differently bound.');
    const expectedBatch = plannedIndexes[value.index];
    if (
      !isRecord(expectedBatch) ||
      !Array.isArray(expectedBatch.local_ids) ||
      value.results.length !== expectedBatch.local_ids.length
    )
      throw new Error('Native mutation batch result differs from its planned members.');
    observedIndexes.add(value.index);
    for (const [offset, row] of value.results.entries()) {
      const expectedLocalId: unknown = expectedBatch.local_ids[offset];
      const expectedIdentity: unknown = Array.isArray(expectedBatch.identities)
        ? expectedBatch.identities[offset]
        : undefined;
      if (
        !row ||
        row.status !== 'killed' ||
        typeof row.local_id !== 'string' ||
        typeof row.identity !== 'string' ||
        row.local_id !== expectedLocalId ||
        row.identity !== expectedIdentity ||
        planned.get(row.local_id) !== row.identity ||
        expected.get(row.local_id) !== row.identity ||
        observedRows.has(row.local_id)
      )
        throw new Error('Native mutation batch contains a survivor, unknown, duplicate, or foreign pair.');
      observedRows.set(row.local_id, { identity: row.identity, local_id: row.local_id });
    }
    proofBatches.push({ index: value.index, artifact });
  }
  if (observedIndexes.size !== plannedIndexes.length || observedRows.size !== expected.size)
    throw new Error('Native mutation batch indexes or members are not exhaustive.');
  proofBatches.sort((left, right) => left.index - right.index);

  if (evidence.receipts.size !== expected.size) throw new Error('Native mutation receipt set is incomplete.');
  const mutants = [...expected.entries()]
    .map(([localId, identity]) => {
      const receipt = evidence.receipts.get(localId);
      if (!receipt) throw new Error('Native mutation receipt is missing for a generated ID.');
      validateNativeMutationReceipt(receipt, binding, tests, localId, false);
      registerArtifact(receipt.artifact);
      registerArtifact(receipt.launcher.artifact);
      const observed = observedRows.get(localId);
      if (!observed || observed.identity !== identity)
        throw new Error('Native mutation receipt has no exact killed identity pair.');
      return {
        identity,
        local_id: localId,
        outcome: 'assertion-confirmed-killed' as const,
        runner_receipt: receipt.artifact,
        launcher_receipt: receipt.launcher.artifact,
      };
    })
    .sort((left, right) =>
      left.identity < right.identity
        ? -1
        : left.identity > right.identity
          ? 1
          : left.local_id.localeCompare(right.local_id),
    );
  if (mutants.length !== expected.size) throw new Error('Native mutation receipt rows are not exhaustive.');

  return {
    schema: 'NativeMutationPartitionProof/v1',
    binding,
    qualification_scope: 'partition',
    full_qualification: false,
    tests: [...tests],
    universe_sha256: planValue.universe_sha256,
    artifacts,
    baseline: {
      artifact: evidence.baseline.artifact,
      runner_receipt: evidence.baseline.native_receipt.artifact,
      launcher_receipt: evidence.baseline.native_receipt.launcher.artifact,
      cases: baselineCases.map(({ test_file, name, outcome }) => ({
        test_file,
        name,
        outcome: outcome as 'passed' | 'skipped',
      })),
    },
    batches: proofBatches,
    mutants,
  };
}

export function validateMutationMapEvents(
  events: readonly unknown[],
  expected: ReadonlyMap<string, string>,
  statuses: ReadonlyMap<string, string>,
): void {
  const observed = new Set<string>();
  for (const event of events) {
    if (
      !isRecord(event) ||
      event.schema !== 'MutationMapEngineEvent/v1' ||
      typeof event.local_id !== 'string' ||
      observed.has(event.local_id) ||
      expected.get(event.local_id) !== event.identity ||
      statuses.get(event.local_id) !== event.engine_status ||
      event.confirmed_status !== 'unconfirmed'
    )
      throw new Error('Mutation map events disagree with their unique plan/report identities.');
    observed.add(event.local_id);
  }
  if (observed.size !== expected.size) throw new Error('Mutation map events are incomplete.');
}

function parseMapRecord(bytes: Buffer): Record<string, unknown> {
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!isRecord(value)) throw new Error('Mutation map artifact is not an object.');
  return value;
}

/** Complete describes termination; individual public test results must also prove a passing baseline. */
export function validateMutationDryRun(value: unknown, binding: MutationMapBinding) {
  if (
    !isRecord(value) ||
    value.schema !== 'MutationMapDryRun/v1' ||
    canonicalJson(value.binding) !== canonicalJson(binding) ||
    value.confirmed_status !== 'unconfirmed' ||
    !isRecord(value.result) ||
    value.result.status !== 'complete' ||
    !Array.isArray(value.result.tests) ||
    !value.result.tests.length
  )
    throw new Error('Mutation map dry run has no complete parent binding or test results.');
  const tests = value.result.tests.map((test: unknown) => {
    if (
      !isRecord(test) ||
      typeof test.id !== 'string' ||
      !test.id ||
      typeof test.name !== 'string' ||
      !test.name ||
      typeof test.timeSpentMs !== 'number' ||
      !Number.isFinite(test.timeSpentMs) ||
      test.timeSpentMs < 0 ||
      (test.status !== TestStatus.Success && test.status !== TestStatus.Skipped) ||
      (test.fileName !== undefined && (typeof test.fileName !== 'string' || !test.fileName))
    )
      throw new Error('Mutation map dry run test result is invalid or failed.');
    return {
      id: test.id,
      name: test.name,
      status: test.status,
      file: typeof test.fileName === 'string' ? test.fileName : null,
    };
  });
  if (!tests.some((test) => test.status === TestStatus.Success))
    throw new Error('Mutation map dry run executed no passing tests.');
  return { tests, mutant_coverage: value.result.mutantCoverage };
}

export async function confirmPartitionMutationMap(
  root: string,
  binding: MutationMapBinding,
  read: (file: string, allowEmpty?: boolean) => Promise<Buffer>,
  reported?: readonly ReportedMutant[],
) {
  const name = (suffix: string) => `${binding.partition}.map-${suffix}`;
  const planBytes = await read(name('plan.json'));
  const plan = parseMapRecord(planBytes);
  const validated = validateMutationPartitionMap(plan, root, binding, reported);
  const map = {
    file: name('plan.json'),
    bytes: planBytes.length,
    sha256: sha256(planBytes),
    mutants: validated.mutants,
  };
  if (!reported) return { map, source_counts: validated.sourceCounts, terminal: false };
  const terminal = parseMapRecord(await read(name('terminal.json')));
  const eventBytes = await read(name('events.jsonl'), true);
  const expectedPlan = { file: map.file, bytes: map.bytes, sha256: map.sha256 };
  const expectedEvents = { file: name('events.jsonl'), bytes: eventBytes.length, sha256: sha256(eventBytes) };
  if (
    terminal.schema !== 'MutationMapTerminal/v1' ||
    canonicalJson(terminal.binding) !== canonicalJson(binding) ||
    canonicalJson(terminal.plan) !== canonicalJson(expectedPlan) ||
    canonicalJson(terminal.events) !== canonicalJson(expectedEvents) ||
    terminal.mutants !== validated.mutants ||
    terminal.confirmed_status !== 'unconfirmed'
  )
    throw new Error('Mutation map terminal receipt differs from its artifacts.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(eventBytes);
  if (text && !text.endsWith('\n')) throw new Error('Mutation map journal has an unfinished row.');
  const events: unknown[] = text
    ? text
        .slice(0, -1)
        .split('\n')
        .map((line) => JSON.parse(line) as unknown)
    : [];
  validateMutationMapEvents(
    events,
    validated.localIds,
    new Map(reported.map(({ mutant }) => [mutant.id, mutant.status])),
  );
  const dryRun = parseMapRecord(await read(name('dry-run.json')));
  validateMutationDryRun(dryRun, binding);
  return { map, source_counts: validated.sourceCounts, terminal: true };
}

export function globalMutationMap(
  binding: Omit<MutationMapBinding, 'partition' | 'partition_sources'>,
  sources: readonly InputDigest[],
  partitions: readonly MapPartition[],
  selected: readonly string[],
  staticSources: ReadonlySet<string>,
  observations: ReadonlyMap<
    string,
    {
      status: string;
      source_counts?: Record<string, number>;
      map?: { file: string; sha256: string; bytes: number; mutants: number };
    }
  > = new Map(),
) {
  const selectedSet = new Set(selected);
  return {
    schema: 'CandidateMutantMap/v1',
    binding,
    globally_qualified: false,
    sources: sources.map((source) => ({
      ...source,
      assignments: partitions
        .filter((partition) =>
          (partition.sources ?? (partition.requiredReportedSource ? [partition.requiredReportedSource] : [])).includes(
            source.path,
          ),
        )
        .map((partition) => {
          const observation = observations.get(partition.name);
          const status =
            observation?.status ??
            (staticSources.has(source.path) && partition.environment === 'static'
              ? 'validated-static-export-only'
              : partition.environment === 'pending'
                ? 'pending-behavior-tests'
                : selectedSet.has(partition.name)
                  ? 'awaiting-generated-universe'
                  : 'omitted-from-execution');
          return {
            partition: partition.name,
            environment: partition.environment ?? null,
            status,
            mutant_count:
              observation?.source_counts?.[source.path] ?? (status === 'validated-static-export-only' ? 0 : null),
            map: observation?.map ?? null,
          };
        }),
    })),
    function_links: 'reuse-byte-bound-inventory-or-remain-unresolved',
    scenario_links: 'reuse-reviewed-relations-or-remain-unreviewed',
    dynamic_test_mapping: 'requires-qualified-per-test-runner',
  };
}

function assignmentMatrix(sources: readonly InputDigest[], partitions: unknown) {
  const matrix = new Map(sources.map(({ path }) => [path, new Map<string, string | null>()]));
  const names = new Set<string>();
  if (!Array.isArray(partitions)) throw new Error('Global mutant map has no authoritative partition matrix.');
  for (const partition of partitions as unknown[]) {
    if (
      !isRecord(partition) ||
      typeof partition.name !== 'string' ||
      names.has(partition.name) ||
      !Array.isArray(partition.sources) ||
      (partition.environment !== undefined && typeof partition.environment !== 'string')
    )
      throw new Error('Global mutant map partition matrix is malformed.');
    names.add(partition.name);
    for (const file of partition.sources as unknown[]) {
      const assignments = typeof file === 'string' ? matrix.get(file) : undefined;
      if (!assignments || assignments.has(partition.name))
        throw new Error('Global mutant map partition matrix has a foreign or duplicate Source.');
      assignments.set(partition.name, partition.environment ?? null);
    }
  }
  return matrix;
}

export function assertGlobalMutationMap(
  value: unknown,
  binding: Omit<MutationMapBinding, 'partition' | 'partition_sources'>,
  sources: readonly InputDigest[],
  partitionInventory: unknown,
): void {
  if (
    !isRecord(value) ||
    value.schema !== 'CandidateMutantMap/v1' ||
    value.globally_qualified !== true ||
    canonicalJson(value.binding) !== canonicalJson(binding) ||
    !Array.isArray(value.sources) ||
    value.sources.length !== sources.length
  )
    throw new Error('Global mutant map is incomplete or has stale input bindings.');
  const expected = new Map(sources.map((source) => [source.path, source.sha256]));
  const matrix = assignmentMatrix(sources, partitionInventory);
  const observed = new Set<string>();
  for (const source of value.sources as unknown[]) {
    if (
      !isRecord(source) ||
      typeof source.path !== 'string' ||
      observed.has(source.path) ||
      expected.get(source.path) !== source.sha256 ||
      !Array.isArray(source.assignments) ||
      source.assignments.length === 0
    )
      throw new Error('Global mutant map Source domain is incomplete or ambiguous.');
    observed.add(source.path);
    const required = matrix.get(source.path)!;
    if (source.assignments.length !== required.size)
      throw new Error('Global mutant map omits a required partition matrix assignment.');
    const partitions = new Set<string>();
    for (const assignment of source.assignments as unknown[]) {
      if (!isRecord(assignment) || typeof assignment.partition !== 'string' || partitions.has(assignment.partition))
        throw new Error('Global mutant map assignment is malformed or duplicated.');
      partitions.add(assignment.partition);
      if (!required.has(assignment.partition) || required.get(assignment.partition) !== assignment.environment)
        throw new Error('Global mutant map differs from the authoritative partition matrix.');
      if (
        assignment.status === 'validated-static-export-only' &&
        assignment.environment === 'static' &&
        assignment.mutant_count === 0 &&
        assignment.map === null
      )
        continue;
      if (
        assignment.status !== 'assertion-confirmed-killed' ||
        typeof assignment.mutant_count !== 'number' ||
        !Number.isSafeInteger(assignment.mutant_count) ||
        assignment.mutant_count < 1 ||
        !isRecord(assignment.map) ||
        typeof assignment.map.file !== 'string' ||
        path.basename(assignment.map.file) !== assignment.map.file ||
        typeof assignment.map.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(assignment.map.sha256) ||
        typeof assignment.map.bytes !== 'number' ||
        !Number.isSafeInteger(assignment.map.bytes) ||
        assignment.map.bytes < 1
      )
        throw new Error('Global mutant map has an unqualified required partition.');
    }
  }
}
