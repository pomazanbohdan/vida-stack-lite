import path from 'node:path';
import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, openSync, writeFileSync } from 'node:fs';
import type { Mutant, MutantResult, MutantTestPlan, schema } from '@stryker-mutator/api/core';
import { TestStatus } from '@stryker-mutator/api/test-runner';
import { sha256, type InputDigest } from './bun-coverage-evidence.ts';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';

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

export function writeMutationMapArtifact(directory: string, file: string, record: unknown) {
  if (path.basename(file) !== file || !file.endsWith('.json'))
    throw new Error('Mutation map artifact name is invalid.');
  const bytes = Buffer.from(JSON.stringify(record) + '\n');
  if (bytes.length > 32 * 1024 * 1024) throw new Error('Mutation map artifact exceeds its byte bound.');
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

/** Reconcile an observed plan with its parent and the already-parsed engine report. */
export function validateMutationPartitionMap(
  value: unknown,
  root: string,
  binding: MutationMapBinding,
  reported?: readonly ReportedMutant[],
) {
  if (
    !isRecord(value) ||
    value.schema !== 'MutationPartitionMap/v1' ||
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
  return { mutants: localIds.size, localIds, sourceCounts };
}

/** Plan IDs from one complete generation; never regenerate a subset with different mutator semantics. */
export function planMutationBatches(root: string, binding: MutationMapBinding, value: unknown, limit: number) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Mutation batch limit must be a positive integer.');
  validateMutationPartitionMap(value, root, binding);
  const universe = value as ReturnType<typeof mutationPartitionMap>;
  if (!universe.mutants.length) throw new Error('Mutation batch universe is empty.');
  const rows = [...universe.mutants].sort((left, right) =>
    left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0,
  );
  const batches: { identities: string[]; local_ids: string[] }[] = [];
  const universeHash = createHash('sha256')
    .update('MutationBatchUniverse/v2\n')
    .update(canonicalJson(binding))
    .update('\n');
  for (const row of rows) {
    universeHash.update(canonicalJson({ identity: row.identity, local_id: row.local_id })).update('\n');
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
    universe_sha256: universeHash.digest('hex'),
    limit,
    batches,
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
