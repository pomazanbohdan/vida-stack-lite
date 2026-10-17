import { spawnSync } from 'node:child_process';
import { lstat, readFile, realpath, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import coverageApi from 'istanbul-lib-coverage';
import { maintainedSourceInventory, selectMaintainedSourcePaths } from './maintained-source-inventory.js';
import { canonicalTestSelection, sha256 } from './bun-coverage-evidence.ts';
import { functionInventory } from './function-inventory.js';
import { validateCoverageReport, validateHistoricalBaselineCoverageReport } from './bun-coverage-report-validator.js';
import { baselineFunctionEvidenceForSource, exactFullCoverage, validateCoverageLocations } from './coverage-math.js';
import type { BaselineFunctionEvidence } from './coverage-math.js';

type FunctionRow = import('./function-inventory.js').FunctionRow;
type BaselineFunctionBudget = {
  identity: string;
  current_identity: string;
  baseline_complexity: number;
  baseline_coverage: number;
  max_complexity: number;
  baseline_crap: number;
  max_crap: number;
  rationale: string;
};
type BaselineEvidenceRow = { identity: string; complexity: number; coverage: number; crap: number };
type CoverageReport = Awaited<ReturnType<typeof validateCoverageReport>>['report'];
type NewFunctionBudget = { identity: string; max_complexity: number; max_crap: number; rationale: string };
type RemovalDisposition = { identity: string; rationale: string };
type CheckedPlan = {
  baselineCoverageReportRef: string;
  baselineCoverageReportSha256: string;
  baselineFunctions: Map<string, BaselineFunctionBudget>;
  baselineByCurrent: Map<string, BaselineFunctionBudget>;
  publishedFunctions: Map<string, FunctionRow>;
  newFunctions: Map<string, NewFunctionBudget>;
  removed: Map<string, RemovalDisposition>;
  newSources: Map<string, string>;
  removedSources: Map<string, string>;
};
type CoverageSummaryData = import('istanbul-lib-coverage').CoverageSummaryData;

const root = path.resolve(
  process.env.VIDA_BUN_COVERAGE_ROOT ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
);
const { createCoverageMap } = coverageApi;
const baselineRef = 'b549951';
// Published task review, fixed before the scoped candidate measurements; never caller-supplied correspondence.
const scopedBudgetReviews = new Map([
  ['ebf74615669c6ecdc0d754fdc3ad6eaf6e954c56', 'scope_review_v1033'],
  ['6f687506464048a0360f3fb8932eb7b77c7fc005', 'scope_review_main_host_20261015'],
  ['6e4655b1db2a32d08ae722940ff50b10d9e56ca6', 'scope_review_main_runtime_timing_20261015'],
  ['64f18b3148a80644787a1c2b997ad7a1ff6e5d5d', 'scope_review_runtime_facade_20261015'],
  ['e9629b3c45cde992ef688af33b2538c7e3a67391', 'scope_review_lifecycle_state_20261015'],
  ['386bf6c9b576e8e43c903155513358b403468179', 'scope_review_main_contracts_20261015'],
  ['a03c2e2a29d26aeb11f3106b973f1c1f6642f128:main-envelopes', 'scope_review_main_envelopes_shared_error_20261016'],
  ['019d80647aaf4dbe48dcb7a864c4a5667a0b9d64:main-envelopes', 'scope_review_main_envelopes_owned_image_20261016'],
  ['e32d956079716a362373bdfa410298eb5339c8fe:main-envelopes', 'scope_review_main_envelopes_validated_rows_20261016'],
  ['8a90ad9aa5c1e844ba5fd51cde132cafd3300d53:main-config', 'scope_review_main_config_shared_predicates_20261016'],
  ['e5daea54d4279562b44cddd4ae571ec3da961f7d:main-config', 'scope_review_main_config_root_normalization_20261016'],
  [
    '450bae0699cdaab32ff12013bc9392f96f0ee7bf:main-governance-validation',
    'scope_review_main_governance_validation_20261016',
  ],
  [
    '171006e51eeb962d4d5f3a7ccd6182acc078f26a:main-governance-validation',
    'scope_review_main_governance_preparation_20261016',
  ],
  [
    '892523d2a83edc6e21d7a05d6e9cca902aab6f44:bun-runtime-initialization',
    'scope_review_runtime_initialization_20261015',
  ],
  [
    'b32fc8eb4b72fa88ef7e437d61130e6c9072e8f4:bun-runtime-initialization',
    'scope_review_runtime_initialization_native_delay_20261017',
  ],
  [
    '181809c9433226d13c5931fdfa34d447027c2eb6:bun-runtime-initialization',
    'scope_review_runtime_initialization_inline_guards_20261017',
  ],
  ['892523d2a83edc6e21d7a05d6e9cca902aab6f44:bun-cli-toolchain', 'scope_review_bun_cli_toolchain_20261015'],
  ['892523d2a83edc6e21d7a05d6e9cca902aab6f44:bun-final-assurance', 'scope_review_bun_final_assurance_20261015'],
  ['72c6dc3b29f9ad9f3960d82ab89bbb5d846ea2bd:bun-cli-toolchain', 'scope_review_bun_cli_toolchain_cache_20261015'],
  [
    '8ca2af97480326becc98d76b26d3ae6ade2fd699:bun-service-operation-custody',
    'scope_review_bun_service_operation_custody_20261016',
  ],
  ['6b0298b148bd1e49bc67b8bb6057a859c519bca6:main-runtime-core', 'scope_review_main_runtime_core_20261016'],
  ['05952f945174190be9c9ebc257f01414908855f0:bun-final-assurance', 'scope_review_bun_final_assurance_reuse_20261016'],
  [
    'd6cab7c0c7d8962d813f17c5c96e396032cd98ec:bun-project-upgrade-storage-admission',
    'scope_review_existing_storage_admission_20261016',
  ],
  [
    '9469a4e1663750e8de022e8f9dfca7a4327c9a08:bun-project-upgrade-existing-storage-image',
    'scope_review_existing_storage_image_20261016',
  ],
  [
    '883af1d7d553055a09264916240344eaf4280128:bun-project-upgrade-existing-storage-image',
    'scope_review_existing_storage_image_subset_removal_20261017',
  ],
  [
    'b1ecf6b6548378d0516a6823f23d6565db6547e1:bun-project-upgrade-existing-storage-image',
    'scope_review_existing_storage_image_cleanup_20261017',
  ],
  [
    '32e47aa1c0928613a1b4329fb529313606dca89b:bun-project-upgrade-existing-storage-image',
    'scope_review_existing_storage_image_aggregate_20261017',
  ],
  [
    'cd006a23ae0c74528393783c0ee64e719627e3af:bun-runtime-facade',
    'scope_review_runtime_facade_shared_canonical_20261017',
  ],
  ['53fac83b74fb8a5fca7362bbbcb1a0abd8e13253:main-envelopes', 'scope_review_main_envelopes_named_ordering_20261017'],
  [
    'fb6fdbdc39c4c1615b561a46a98c75d73df26763:bun-service-operation-custody',
    'scope_review_custody_uuid_predicate_20261017',
  ],
  [
    '171e0525d2842e5087740fa015e2a67e9cac250e:bun-service-operation-custody',
    'scope_review_custody_digest_reuse_20261017',
  ],
  [
    '29322efc3cb77b16dcdafe472adc7c059103f014:bun-service-operation-custody',
    'scope_review_custody_lazy_literals_20261017',
  ],
  [
    '0f9162425183f1d7cc5f97b5371c387464e719a1:bun-service-operation-custody',
    'scope_review_custody_raw_digest_20261017',
  ],
  [
    'fd0507b040bb931b11d58d574401433b73a7e8f7:bun-service-operation-custody',
    'scope_review_custody_claim_predicate_20261017',
  ],
  [
    'e494471cf7c5e8989cb947144f1f2db4071acaa0:bun-service-operation-custody',
    'scope_review_custody_digest_type_guard_20261017',
  ],
  [
    'c8d952a328519c6c2c64db2e6fea22849ccabfaf:bun-project-upgrade-existing-storage-image',
    'scope_review_storage_image_literal_prefix_20261017',
  ],
  ['c8d952a328519c6c2c64db2e6fea22849ccabfaf:main-envelopes', 'scope_review_envelopes_device_extensions_20261017'],
  [
    '4dbd30e24403e51c4c83fead7dd4c8e4be0cff68:bun-project-upgrade-existing-storage-image',
    'scope_review_storage_image_native_encoding_20261017',
  ],
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Choose only an already pinned review; the producer still validates its immutable bytes and exact roles. */
export function latestScopedCrapBudgetRef(contour: string, sources: readonly string[], plan: unknown): string | null {
  if (!isRecord(plan)) throw new Error('Expected reviewed lineage plan.');
  for (const [key, reviewKey] of [...scopedBudgetReviews].reverse()) {
    const [commit, selectedContour] = key.split(':');
    if (selectedContour) {
      if (selectedContour === contour) return commit!;
      continue;
    }
    const review = plan[reviewKey];
    const files = isRecord(review) && Array.isArray(review.files) ? review.files : [];
    if (sources.length && sources.every((file) => files.includes(file))) return commit!;
  }
  return null;
}
function reviewedSourcePaths(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((entry: unknown): entry is string => typeof entry === 'string'))
    throw new Error('Reviewed v3 Source additions and removals must be explicit path arrays.');
  return value;
}

function assertCrapPlanIdentity(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value) || value.schema !== 'VidaCrapBudgetPlan/v1' || value.baseline_ref !== baselineRef)
    throw new Error('CRAP budget plan schema or published baseline ref is invalid.');
  if (
    value.exhaustive === false ||
    value.executable === false ||
    (typeof value.status === 'string' && /non[-_ ]?(?:executable|exhaustive)|partial/iu.test(value.status))
  )
    throw new Error('CRAP budget plan is explicitly non-executable or non-exhaustive.');
}

function assertCrapPlanDispositions(value: Record<string, unknown>): void {
  if (
    !Array.isArray(value.baseline_functions) ||
    !Array.isArray(value.new_functions) ||
    !Array.isArray(value.removed_functions) ||
    !Array.isArray(value.new_sources) ||
    !Array.isArray(value.removed_sources)
  )
    throw new Error('CRAP budget plan requires reviewed baseline and exact source/function addition/removal arrays.');
  if (value.baseline_functions.length + value.removed_functions.length === 0)
    throw new Error('CRAP budget plan must include published baseline function dispositions.');
}

function assertCrapPlanEvidence(value: Record<string, unknown>, repoRoot: string): void {
  if (
    typeof value.baseline_coverage_report_ref !== 'string' ||
    value.baseline_coverage_report_ref.trim().length < 8 ||
    typeof value.baseline_coverage_report_sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(value.baseline_coverage_report_sha256)
  )
    throw new Error('CRAP budget plan has no bound baseline coverage evidence.');
  const evidencePath = path.resolve(repoRoot, value.baseline_coverage_report_ref);
  const relativePath = path.relative(repoRoot, evidencePath).replaceAll('\\', '/');
  if (!relativePath || relativePath === '..' || relativePath.startsWith('../') || path.isAbsolute(relativePath))
    throw new Error('Baseline coverage evidence must remain inside the Source repository.');
}

/** Checks only frozen-plan prerequisites. Exact baseline/current correspondence remains checkedPlan's job. */
export function assertCrapPlanPrerequisites(
  value: unknown,
  repoRoot: string,
): asserts value is Record<string, unknown> {
  assertCrapPlanIdentity(value);
  assertCrapPlanDispositions(value);
  assertCrapPlanEvidence(value, repoRoot);
}

/** Conservative local proof: original Source CC is a lower bound on original CRAP for every coverage fraction. */
export function scopedCrapFunctionProof(
  published: readonly Pick<FunctionRow, 'identity' | 'complexity'>[],
  current: readonly BaselineFunctionEvidence[],
  frozen: unknown,
) {
  if (!Array.isArray(frozen) || published.length === 0 || frozen.length !== published.length)
    throw new Error('Scoped CRAP proof requires exhaustive frozen original function rows.');
  const originals = new Map(published.map((row) => [row.identity, row]));
  const candidates = new Map(current.map((row) => [row.identity, row]));
  if (originals.size !== published.length || candidates.size !== current.length || current.length !== frozen.length)
    throw new Error('Scoped CRAP function inventories are incomplete or duplicated.');
  const originalIds = new Set<string>();
  const currentIds = new Set<string>();
  return frozen.map((raw: unknown) => {
    if (
      !isRecord(raw) ||
      typeof raw.identity !== 'string' ||
      typeof raw.current_identity !== 'string' ||
      typeof raw.rationale !== 'string' ||
      !raw.rationale.trim()
    )
      throw new Error('Scoped CRAP frozen correspondence is malformed.');
    const original = originals.get(raw.identity);
    const candidate = candidates.get(raw.current_identity);
    if (!original || !candidate || originalIds.has(raw.identity) || currentIds.has(raw.current_identity))
      throw new Error('Scoped CRAP original/current correspondence must be exhaustive and one-to-one.');
    originalIds.add(raw.identity);
    currentIds.add(raw.current_identity);
    if (
      !Number.isSafeInteger(original.complexity) ||
      original.complexity < 1 ||
      raw.baseline_complexity !== original.complexity ||
      raw.max_complexity !== original.complexity ||
      typeof raw.max_crap !== 'number' ||
      !Number.isSafeInteger(raw.max_crap) ||
      raw.max_crap < original.complexity
    )
      throw new Error('Scoped CRAP ceilings do not satisfy the immutable original Source lower-bound proof.');
    if (
      candidate.coverage !== 1 ||
      !Number.isSafeInteger(candidate.complexity) ||
      candidate.complexity < 1 ||
      candidate.crap !== candidate.complexity ||
      candidate.complexity > original.complexity
    )
      throw new Error('Scoped CRAP current function is uncovered, malformed or exceeds its original Source ceiling.');
    return {
      identity: raw.identity,
      current_identity: raw.current_identity,
      original_source_complexity: original.complexity,
      maximum_complexity: raw.max_complexity,
      maximum_crap: raw.max_crap,
      conservative_crap_ceiling: original.complexity,
      complexity: candidate.complexity,
      coverage: candidate.coverage,
      crap: candidate.crap,
      rationale: raw.rationale,
    };
  });
}

export type ScopedSourceMapping = {
  readonly original_path: string;
  readonly current_path: string;
  readonly rationale: string;
};
export type ScopedIdentityReuse = {
  readonly original_identity: string;
  readonly successor_identity: string;
  readonly rationale: string;
};
type ScopedCorrespondencePolicy =
  | { readonly source_mapping_kind: 'one-to-one'; readonly identity_reuses?: never }
  | { readonly source_mapping_kind: 'reviewed-pairs'; readonly identity_reuses: readonly ScopedIdentityReuse[] };
export type ScopedFunctionDisposition =
  | {
      readonly kind: 'retained';
      readonly identity: string;
      readonly current_identity: string;
      readonly max_complexity: number;
      readonly max_crap: number;
      readonly rationale: string;
    }
  | {
      readonly kind: 'new';
      readonly identity: string;
      readonly max_complexity: number;
      readonly max_crap: number;
      readonly rationale: string;
    }
  | { readonly kind: 'removed'; readonly identity: string; readonly rationale: string };

/** Pure reviewed correspondence; historical measurements are deliberately absent. */
export function scopedCrapDispositionProof(
  original: readonly Pick<FunctionRow, 'identity' | 'file' | 'complexity'>[],
  current: readonly (Pick<FunctionRow, 'identity' | 'file' | 'complexity'> &
    Pick<BaselineFunctionEvidence, 'coverage' | 'crap'>)[],
  dispositions: readonly ScopedFunctionDisposition[],
  sourceMappings: readonly ScopedSourceMapping[],
  originalSources: readonly string[],
  currentSources: readonly string[],
  removedSources: readonly string[],
  newSources: readonly string[],
  retainedCeilings: ReadonlyMap<string, { readonly max_complexity: number; readonly max_crap: number }>,
  policy: ScopedCorrespondencePolicy = { source_mapping_kind: 'one-to-one' },
) {
  const sourceMappingKind = policy.source_mapping_kind;
  if (sourceMappingKind !== 'one-to-one' && sourceMappingKind !== 'reviewed-pairs')
    throw new Error('Scoped CRAP source mapping kind is invalid.');
  if (sourceMappingKind === 'one-to-one' && Object.hasOwn(policy, 'identity_reuses'))
    throw new Error('Scoped CRAP v2 cannot authorize identity reuse.');
  const identityReuses = sourceMappingKind === 'reviewed-pairs' ? policy.identity_reuses : [];
  if (!Array.isArray(identityReuses)) throw new Error('Scoped CRAP v3 requires explicit identity reuse records.');
  if (!current.length || !dispositions.length)
    throw new Error('Scoped CRAP v2 requires current function roles and explicit dispositions.');
  const originals = new Map(original.map((row) => [row.identity, row]));
  const candidates = new Map(current.map((row) => [row.identity, row]));
  if (originals.size !== original.length || candidates.size !== current.length)
    throw new Error('Scoped CRAP v2 inventories contain duplicate function identities.');
  const originalPathSet = new Set(originalSources);
  const currentPathSet = new Set(currentSources);
  const removedPathSet = new Set(removedSources);
  const newPathSet = new Set(newSources);
  if (
    originalPathSet.size !== originalSources.length ||
    currentPathSet.size !== currentSources.length ||
    removedPathSet.size !== removedSources.length ||
    newPathSet.size !== newSources.length
  )
    throw new Error('Scoped CRAP v2 source inventories contain duplicate paths.');
  const pathMap = new Map<string, Set<string>>();
  const mappedCurrent = new Set<string>();
  for (const mapping of sourceMappings) {
    if (
      !originalPathSet.has(mapping.original_path) ||
      !currentPathSet.has(mapping.current_path) ||
      mapping.rationale.trim().length < 8 ||
      pathMap.get(mapping.original_path)?.has(mapping.current_path) ||
      (sourceMappingKind === 'one-to-one' &&
        (pathMap.has(mapping.original_path) || mappedCurrent.has(mapping.current_path)))
    )
      throw new Error('Scoped CRAP v2 source mapping is invalid, duplicated or outside exact inventories.');
    const destinations = pathMap.get(mapping.original_path) ?? new Set<string>();
    destinations.add(mapping.current_path);
    pathMap.set(mapping.original_path, destinations);
    mappedCurrent.add(mapping.current_path);
  }
  if (
    JSON.stringify([...pathMap.keys(), ...removedPathSet].sort()) !== JSON.stringify([...originalPathSet].sort()) ||
    JSON.stringify([...mappedCurrent, ...newPathSet].sort()) !== JSON.stringify([...currentPathSet].sort())
  )
    throw new Error('Scoped CRAP v2 source mappings and additions/removals do not partition exact source inventories.');

  const retainedOriginal = new Map<string, string>();
  const retainedCurrent = new Set<string>();
  const removed = new Set<string>();
  const added = new Set<string>();
  const result: Record<string, unknown>[] = [];
  for (const disposition of dispositions) {
    if (disposition.rationale.trim().length < 8) throw new Error('Scoped CRAP v2 disposition rationale is missing.');
    if (disposition.kind === 'retained') {
      const before = originals.get(disposition.identity);
      const after = candidates.get(disposition.current_identity);
      const ceiling = retainedCeilings.get(disposition.identity);
      if (
        !before ||
        !after ||
        !ceiling ||
        retainedOriginal.has(disposition.identity) ||
        retainedCurrent.has(disposition.current_identity) ||
        !pathMap.get(before.file)?.has(after.file)
      )
        throw new Error('Scoped CRAP v2 retained correspondence is missing, duplicated or source-mismapped.');
      if (
        disposition.max_complexity !== ceiling.max_complexity ||
        disposition.max_crap !== ceiling.max_crap ||
        !Number.isSafeInteger(disposition.max_complexity) ||
        disposition.max_complexity !== before.complexity ||
        !Number.isSafeInteger(disposition.max_crap) ||
        disposition.max_crap < before.complexity
      )
        throw new Error('Scoped CRAP v2 retained ceilings differ from frozen caps or original Source lower bound.');
      if (
        after.coverage !== 1 ||
        !Number.isSafeInteger(after.complexity) ||
        after.complexity < 1 ||
        after.crap !== after.complexity ||
        after.complexity > disposition.max_complexity ||
        after.crap > disposition.max_crap
      )
        throw new Error('Scoped CRAP v2 retained current function is uncovered or exceeds frozen ceilings.');
      retainedOriginal.set(disposition.identity, disposition.current_identity);
      retainedCurrent.add(disposition.current_identity);
      result.push({
        kind: 'retained',
        identity: disposition.identity,
        current_identity: disposition.current_identity,
        original_source_complexity: before.complexity,
        maximum_complexity: disposition.max_complexity,
        maximum_crap: disposition.max_crap,
        complexity: after.complexity,
        coverage: after.coverage,
        crap: after.crap,
        rationale: disposition.rationale,
      });
    } else if (disposition.kind === 'new') {
      const after = candidates.get(disposition.identity);
      if (!after || added.has(disposition.identity) || retainedCurrent.has(disposition.identity))
        throw new Error('Scoped CRAP v2 new function is missing or duplicated.');
      if (
        !Number.isSafeInteger(disposition.max_complexity) ||
        disposition.max_complexity < 1 ||
        disposition.max_complexity > 10 ||
        !Number.isSafeInteger(disposition.max_crap) ||
        disposition.max_crap < 1 ||
        disposition.max_crap > 10
      )
        throw new Error('Scoped CRAP v2 new function has no independently published positive caps.');
      if (
        after.coverage !== 1 ||
        !Number.isSafeInteger(after.complexity) ||
        after.complexity < 1 ||
        after.crap !== after.complexity ||
        after.complexity > disposition.max_complexity ||
        after.crap > disposition.max_crap
      )
        throw new Error('Scoped CRAP v2 new current function is uncovered or exceeds its own published caps.');
      added.add(disposition.identity);
      result.push({
        kind: 'new',
        identity: disposition.identity,
        current_identity: disposition.identity,
        complexity: after.complexity,
        coverage: after.coverage,
        crap: after.crap,
        maximum_complexity: disposition.max_complexity,
        maximum_crap: disposition.max_crap,
        rationale: disposition.rationale,
      });
    } else {
      const before = originals.get(disposition.identity);
      if (!before || removed.has(disposition.identity) || retainedOriginal.has(disposition.identity))
        throw new Error('Scoped CRAP v2 removed function is missing or duplicated.');
      removed.add(disposition.identity);
      result.push({
        kind: 'removed',
        identity: disposition.identity,
        file: before.file,
        rationale: disposition.rationale,
      });
    }
  }
  const allowedReuses = new Set<string>();
  for (const reuse of identityReuses) {
    if (
      !isRecord(reuse) ||
      Object.keys(reuse).length !== 3 ||
      typeof reuse.original_identity !== 'string' ||
      typeof reuse.successor_identity !== 'string' ||
      typeof reuse.rationale !== 'string' ||
      reuse.rationale.trim().length < 8 ||
      reuse.original_identity === reuse.successor_identity ||
      allowedReuses.has(reuse.original_identity) ||
      !originals.has(reuse.original_identity) ||
      !added.has(reuse.original_identity) ||
      removed.has(reuse.original_identity) ||
      retainedOriginal.get(reuse.original_identity) !== reuse.successor_identity
    )
      throw new Error(
        'Scoped CRAP v3 identity reuse does not bind a retained successor and independently capped adapter.',
      );
    allowedReuses.add(reuse.original_identity);
  }
  const originalPartition = [...retainedOriginal.keys(), ...removed].sort();
  const currentPartition = [...retainedCurrent, ...added].sort();
  if (
    [...removed].some((identity) => candidates.has(identity)) ||
    [...added].some((identity) => originals.has(identity) && !allowedReuses.has(identity))
  )
    throw new Error('Scoped CRAP v2 cannot reset a shared original/current identity as removed plus new.');
  if (
    JSON.stringify(originalPartition) !== JSON.stringify([...originals.keys()].sort()) ||
    JSON.stringify(currentPartition) !== JSON.stringify([...candidates.keys()].sort())
  )
    throw new Error('Scoped CRAP v2 dispositions do not partition exact original/current function inventories.');
  if (retainedOriginal.size !== retainedCurrent.size || retainedCeilings.size !== retainedOriginal.size)
    throw new Error('Scoped CRAP v2 retained ceiling inventory differs from retained function partition.');
  return result;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const repoRootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (repoRootResult.status !== 0 || repoRootResult.signal || repoRootResult.error)
    throw new Error('CRAP budget gate cannot identify the Source repository root.');
  const repoRoot = path.resolve(repoRootResult.stdout.trim());
  const planPath = path.resolve(
    process.env.VIDA_CRAP_BUDGET_PLAN ??
      path.join(repoRoot, '.agent/work/core-runtime-reactivation/crap-budgets.v1.json'),
  );
  const coveragePath = path.resolve(
    process.env.VIDA_BUN_COVERAGE_REPORT ?? path.join(root, 'coverage/bun-unified/coverage-final.json'),
  );
  const reportPath = path.join(root, 'coverage', 'bun-unified', 'crap-budget-report.json');

  const maintainedSources = maintainedSourceInventory(root).mutationSources;
  if (process.argv[2] === '--inventory') {
    const requested = process.argv.slice(3);
    if (new Set(requested).size !== requested.length || requested.some((file) => !maintainedSources.includes(file)))
      throw new Error('Function inventory requires unique maintained source paths.');
    const selected = requested.length ? requested : maintainedSources;
    const captured = await Promise.all(
      selected.map(async (file) => {
        const bytes = await readFile(path.join(root, file));
        return {
          binding: { path: file, byte_length: bytes.byteLength, sha256: sha256(bytes) },
          functions: functionInventory(new TextDecoder('utf-8', { fatal: true }).decode(bytes), file),
        };
      }),
    );
    process.stdout.write(
      JSON.stringify({
        schema: 'MaintainedFunctionInventory/v1',
        mode: 'static-inventory-only',
        qualification: 'not-performed',
        sources: selected,
        files: captured.map(({ binding }) => binding),
        functions: captured.flatMap(({ functions }) => functions),
      }) + '\n',
    );
    process.exit(0);
  }
  const scopedArguments = process.argv.slice(2);
  const scoped = scopedArguments[0] === '--contour';
  if (
    scoped
      ? scopedArguments.length !== 4 ||
        scopedArguments[2] !== '--budget-ref' ||
        !/^[a-f0-9]{40}$/u.test(scopedArguments[3] ?? '')
      : scopedArguments.length > 0
  )
    throw new Error('Unsupported CRAP budget gate arguments.');

  // One invocation, one immutable published commit; never retain live package state.
  const baselineTextByPath = new Map<string, string | null>();
  let baselineSourcePaths: string[] | undefined;

  function requirePlanRecord(value: unknown): asserts value is Record<string, unknown> {
    assertCrapPlanPrerequisites(value, repoRoot);
  }

  function evidencePathForPlan(value: Record<string, unknown>): string {
    assertCrapPlanPrerequisites(value, repoRoot);
    return path.resolve(repoRoot, value.baseline_coverage_report_ref as string);
  }

  async function historicalRuntimePathForPlan(value: Record<string, unknown>): Promise<string | undefined> {
    const reference = value.baseline_runtime_executable_ref;
    if (reference === undefined) return undefined;
    if (typeof reference !== 'string' || reference.trim().length < 8 || path.isAbsolute(reference))
      throw new Error('Historical baseline runtime reference is invalid.');
    const executablePath = path.resolve(repoRoot, reference);
    const relativePath = path.relative(repoRoot, executablePath).replaceAll('\\', '/');
    if (!relativePath || relativePath === '..' || relativePath.startsWith('../') || path.isAbsolute(relativePath))
      throw new Error('Historical baseline runtime must remain inside the Source repository.');
    const resolvedRoot = await realpath(repoRoot);
    let componentPath = repoRoot;
    let finalMetadata: Awaited<ReturnType<typeof lstat>> | undefined;
    const components = relativePath.split('/');
    for (const [index, component] of components.entries()) {
      componentPath = path.join(componentPath, component);
      const metadata = await lstat(componentPath);
      if (metadata.isSymbolicLink() || (index < components.length - 1 && !metadata.isDirectory()))
        throw new Error('Historical baseline runtime must be an in-repository regular file, not a symlink.');
      finalMetadata = metadata;
    }
    const resolvedPath = await realpath(executablePath);
    if (!finalMetadata) throw new Error('Historical baseline runtime path is empty.');
    const resolvedRelative = path.relative(resolvedRoot, resolvedPath).replaceAll('\\', '/');
    if (
      !finalMetadata.isFile() ||
      finalMetadata.isSymbolicLink() ||
      !resolvedRelative ||
      resolvedRelative === '..' ||
      resolvedRelative.startsWith('../') ||
      path.isAbsolute(resolvedRelative)
    )
      throw new Error('Historical baseline runtime must be an in-repository regular file, not a symlink.');
    return executablePath;
  }

  function requirePlanArrays(value: Record<string, unknown>) {
    assertCrapPlanPrerequisites(value, repoRoot);
  }

  function isPositiveSafeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
  }

  function isCoverageFraction(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
  }

  function isFiniteMetric(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function checkedEvidenceFunction(value: unknown): BaselineEvidenceRow {
    if (
      !isRecord(value) ||
      typeof value.identity !== 'string' ||
      !isPositiveSafeInteger(value.complexity) ||
      !isCoverageFraction(value.coverage) ||
      !isFiniteMetric(value.crap)
    )
      throw new Error('Baseline function evidence is malformed.');
    const formula = value.complexity ** 2 * (1 - value.coverage) ** 3 + value.complexity;
    if (Math.abs(value.crap - formula) > 1e-9)
      throw new Error('Baseline function CRAP differs from its coverage formula.');
    return value as BaselineEvidenceRow;
  }

  function checkedEvidenceFunctions(value: unknown): Map<string, BaselineEvidenceRow> {
    if (!Array.isArray(value)) throw new Error('Baseline coverage evidence functions are missing.');

    const functions: Map<string, BaselineEvidenceRow> = new Map();
    for (const raw of value) {
      const entry = checkedEvidenceFunction(raw);
      if (functions.has(entry.identity)) throw new Error('Baseline function evidence is duplicated.');
      functions.set(entry.identity, entry);
    }
    return functions;
  }

  function requireSameCoverageInput(label: string, actual: unknown, expected: unknown) {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Published baseline ${label} differs from its bound inputs.`);
  }

  function publishedFileDigests(files: readonly string[], label: string) {
    return files.map((file) => {
      const source = baselineSource(file);
      if (source === null) throw new Error(`Published baseline ${label} is unavailable: ${file}`);
      return { path: file, sha256: sha256(Buffer.from(source, 'utf8')) };
    });
  }

  function publishedTestPaths(): string[] {
    return gitText(['ls-tree', '-r', '--name-only', baselineRef, '--', 'packages/agent/tests'])
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((full) => full.slice('packages/agent/'.length));
  }

  function verifyPublishedTestSelection(
    report: Record<string, unknown>,
    inputs: Awaited<ReturnType<typeof validateCoverageReport>>['inputs'],
  ) {
    const selectedTests = inputs.test_selection.tests;
    requireSameCoverageInput('test selection', inputs.tests, selectedTests);
    if (canonicalTestSelection(report.test_selection) !== canonicalTestSelection(inputs.test_selection))
      throw new Error('Published baseline test selection metadata differs from its bound inputs.');
  }

  function isCurrentQualityTool(
    file: string,
    selection: import('./bun-coverage-evidence.ts').CoverageInputs['test_selection'],
  ): boolean {
    const published = selection.published_contract_inputs?.some((entry) => entry.path === file) ?? false;
    return file.startsWith('tooling/') && !published;
  }

  async function verifyPublishedCoverageInputs(
    report: Record<string, unknown>,
    packageRoot: string,
    inputs: Awaited<ReturnType<typeof validateCoverageReport>>['inputs'],
  ) {
    const sources = baselineSources();
    const sourceDigests = publishedFileDigests(sources, 'source');
    const tests = publishedTestPaths();
    const testDigests = publishedFileDigests(tests, 'test input');
    requireSameCoverageInput('source bytes', inputs.sources, sourceDigests);
    requireSameCoverageInput('test bytes', inputs.test_inputs, testDigests);
    verifyPublishedTestSelection(report, inputs);
    for (const entry of inputs.tool_inputs) {
      if (isCurrentQualityTool(entry.path, inputs.test_selection)) {
        // The report validator already binds original producer tools to its
        // manifest, run snapshot, and process receipts. Current semantic
        // compatibility is established below by canonical map regeneration
        // and exhaustive equality with frozen baseline CC/coverage/CRAP.
        continue;
      }
      const source = baselineSource(entry.path);
      if (source === null || sha256(Buffer.from(source, 'utf8')) !== entry.sha256)
        throw new Error(`Published baseline tool input differs from the selected commit: ${entry.path}`);
    }
    for (const key of [
      'sources',
      'tests',
      'test_inputs',
      'tool_inputs',
      'source_fingerprint',
      'test_fingerprint',
      'tool_fingerprint',
    ] as const)
      requireSameCoverageInput(`coverage report ${key}`, report[key], inputs[key]);
    return sources;
  }

  async function readBaselineCoverageReport(value: unknown): Promise<{
    report: Record<string, unknown>;
    packageRoot: string;
    inputs: Awaited<ReturnType<typeof validateCoverageReport>>['inputs'];
    coverage: Awaited<ReturnType<typeof validateCoverageReport>>['coverage'];
  }> {
    requirePlanRecord(value);
    const evidencePath = evidencePathForPlan(value);
    const normalized = evidencePath.replaceAll('\\', '/');
    const suffix = '/coverage/bun-unified/coverage-final.json';
    if (!normalized.endsWith(suffix)) throw new Error('Published baseline evidence is not a Bun coverage report.');
    const packageRoot = path.resolve(normalized.slice(0, -suffix.length));
    if (path.basename(packageRoot) !== 'agent' || path.basename(path.dirname(packageRoot)) !== 'packages')
      throw new Error('Published baseline evidence must come from an isolated agent package root.');
    const bytes = await readFile(evidencePath);
    if (sha256(bytes) !== value.baseline_coverage_report_sha256)
      throw new Error('Baseline coverage evidence fingerprint differs from the frozen plan.');
    const options = {
      requireFullCoverage: false,
      testSelectionMode: 'published-baseline-bun-native' as const,
      reportBytes: bytes,
    };
    const runtimeExecutablePath = await historicalRuntimePathForPlan(value);
    const validation = runtimeExecutablePath
      ? await validateHistoricalBaselineCoverageReport(evidencePath, packageRoot, runtimeExecutablePath, options)
      : await validateCoverageReport(evidencePath, packageRoot, options);
    return { report: validation.report, packageRoot, inputs: validation.inputs, coverage: validation.coverage };
  }

  function baselineFunctionEvidence(
    packageRoot: string,
    sources: string[],
    checkedCoverage: Record<string, import('istanbul-lib-instrument').FileCoverageData>,
  ) {
    const functions: BaselineEvidenceRow[] = [];
    const publishedFunctions = new Map<string, FunctionRow>();
    for (const file of sources) {
      const source = baselineSource(file);
      if (source === null) throw new Error(`Published baseline source is unavailable: ${file}`);
      const rows = functionInventory(source, file);
      for (const row of rows) {
        if (publishedFunctions.has(row.identity))
          throw new Error(`Duplicate published function identity: ${row.identity}`);
        publishedFunctions.set(row.identity, row);
      }
      const coverage = checkedCoverage[path.resolve(packageRoot, file)];
      functions.push(...baselineFunctionEvidenceForSource(file, rows, coverage));
    }
    return { functions, publishedFunctions };
  }

  async function readBaselineEvidence(value: unknown) {
    const { report, packageRoot, inputs, coverage } = await readBaselineCoverageReport(value);
    const sources = await verifyPublishedCoverageInputs(report, packageRoot, inputs);
    const snapshot = baselineFunctionEvidence(packageRoot, sources, coverage);
    return { evidence: checkedEvidenceFunctions(snapshot.functions), publishedFunctions: snapshot.publishedFunctions };
  }

  function invalidBaselineMeasurements(raw: Record<string, unknown>): boolean {
    return (
      !isPositiveSafeInteger(raw.baseline_complexity) ||
      !isCoverageFraction(raw.baseline_coverage) ||
      !isFiniteMetric(raw.baseline_crap) ||
      raw.baseline_crap < 1
    );
  }

  function invalidBaselineCeilings(raw: Record<string, unknown>): boolean {
    return (
      !isPositiveSafeInteger(raw.max_complexity) ||
      !isPositiveSafeInteger(raw.max_crap) ||
      typeof raw.baseline_complexity !== 'number' ||
      typeof raw.baseline_crap !== 'number' ||
      raw.max_complexity > raw.baseline_complexity ||
      raw.max_crap > raw.baseline_crap
    );
  }

  function hasFunctionCorrespondence(
    raw: unknown,
  ): raw is Record<string, unknown> & { identity: string; current_identity: string } {
    return isRecord(raw) && typeof raw.identity === 'string' && typeof raw.current_identity === 'string';
  }

  function checkedBaselineBudget(raw: unknown): BaselineFunctionBudget {
    if (!hasFunctionCorrespondence(raw)) throw new Error('Baseline-to-current function correspondence is missing.');
    if (invalidBaselineMeasurements(raw)) throw new Error('Baseline function evidence is malformed.');
    if (invalidBaselineCeilings(raw)) throw new Error('Baseline function ceilings exceed frozen evidence.');
    if (typeof raw.rationale !== 'string' || raw.rationale.trim().length < 8)
      throw new Error('Baseline function rationale is missing.');
    const complexity = raw.baseline_complexity as number;
    const coverage = raw.baseline_coverage as number;
    const crap = raw.baseline_crap as number;
    const formula = complexity ** 2 * (1 - coverage) ** 3 + complexity;
    if (Math.abs(crap - formula) > 1e-9)
      throw new Error('Baseline CRAP does not match its frozen complexity and coverage evidence.');
    return raw as BaselineFunctionBudget;
  }

  function checkedBaselineFunctions(values: unknown): Map<string, BaselineFunctionBudget> {
    if (!Array.isArray(values)) throw new Error('Frozen baseline functions are missing.');

    const functions: Map<string, BaselineFunctionBudget> = new Map();
    for (const raw of values) {
      const entry = checkedBaselineBudget(raw);
      if (functions.has(entry.identity)) throw new Error('Frozen baseline function is duplicated.');
      functions.set(entry.identity, entry);
    }
    return functions;
  }

  function requireExactBaseline(
    budgets: Map<string, BaselineFunctionBudget>,
    evidence: Map<string, BaselineEvidenceRow>,
    removed: Map<string, RemovalDisposition>,
  ) {
    const budgetIds = [...budgets.keys()].sort();
    const removedIds = [...removed.keys()].sort();
    const evidenceIds = [...evidence.keys()].sort();
    const partitionIds = [...budgetIds, ...removedIds].sort();
    if (JSON.stringify(partitionIds) !== JSON.stringify(evidenceIds))
      throw new Error('Frozen budgets and explicit removals do not partition the exact baseline coverage inventory.');
    for (const [identity, budget] of budgets) {
      const row = evidence.get(identity);
      if (!row) throw new Error(`Baseline coverage evidence is missing a function: ${identity}`);
      if (
        row.complexity !== budget.baseline_complexity ||
        row.coverage !== budget.baseline_coverage ||
        Math.abs(row.crap - budget.baseline_crap) > 1e-9
      )
        throw new Error(`Frozen baseline values differ from actual coverage evidence: ${identity}`);
    }
  }

  function checkedNewFunction(raw: unknown): NewFunctionBudget {
    if (!isRecord(raw) || typeof raw.identity !== 'string')
      throw new Error('New function budget identity is malformed.');
    if (
      !isPositiveSafeInteger(raw.max_complexity) ||
      !isPositiveSafeInteger(raw.max_crap) ||
      raw.max_complexity > 10 ||
      raw.max_crap > 10
    )
      throw new Error('New function budget is missing or exceeds the authorized ceiling of 10.');
    if (typeof raw.rationale !== 'string' || raw.rationale.trim().length < 8)
      throw new Error('New function budget rationale is missing.');
    return raw as NewFunctionBudget;
  }

  function checkedNewFunctions(values: unknown): Map<string, NewFunctionBudget> {
    if (!Array.isArray(values)) throw new Error('New function budgets are missing.');

    const functions: Map<string, NewFunctionBudget> = new Map();
    for (const raw of values) {
      const entry = checkedNewFunction(raw);
      if (functions.has(entry.identity)) throw new Error('New function budget is duplicated.');
      functions.set(entry.identity, entry);
    }
    return functions;
  }

  function checkedRemoval(raw: unknown): RemovalDisposition {
    if (
      !isRecord(raw) ||
      typeof raw.identity !== 'string' ||
      typeof raw.rationale !== 'string' ||
      raw.rationale.trim().length < 8
    )
      throw new Error('Removed function disposition is missing or lacks rationale.');
    return raw as RemovalDisposition;
  }

  function checkedRemovals(values: unknown): Map<string, RemovalDisposition> {
    if (!Array.isArray(values)) throw new Error('Removed function dispositions are missing.');

    const removals: Map<string, RemovalDisposition> = new Map();
    for (const raw of values) {
      const entry = checkedRemoval(raw);
      if (removals.has(entry.identity)) throw new Error('Removed function disposition is duplicated.');
      removals.set(entry.identity, entry);
    }
    return removals;
  }

  function checkedSourceEntries(values: unknown, label: string): Map<string, string> {
    if (!Array.isArray(values)) throw new Error(`Invalid ${label} source dispositions.`);

    const entries: Map<string, string> = new Map();
    for (const raw of values) {
      if (!isRecord(raw) || typeof raw.path !== 'string' || typeof raw.rationale !== 'string')
        throw new Error(`Invalid ${label} source disposition.`);
      if (entries.has(raw.path) || raw.rationale.trim().length < 8)
        throw new Error(`Invalid ${label} source disposition.`);
      entries.set(raw.path, raw.rationale);
    }
    return entries;
  }

  function baselineCurrentCorrespondence(
    baselineFunctions: Map<string, BaselineFunctionBudget>,
  ): Map<string, BaselineFunctionBudget> {
    const baselineByCurrent: Map<string, BaselineFunctionBudget> = new Map();
    for (const entry of baselineFunctions.values()) {
      if (baselineByCurrent.has(entry.current_identity))
        throw new Error(`Current function is mapped to multiple published functions: ${entry.current_identity}`);
      baselineByCurrent.set(entry.current_identity, entry);
    }
    return baselineByCurrent;
  }

  async function checkedPlan(value: unknown): Promise<CheckedPlan> {
    requirePlanRecord(value);
    requirePlanArrays(value);
    const { evidence, publishedFunctions } = await readBaselineEvidence(value);
    const baselineFunctions = checkedBaselineFunctions(value.baseline_functions);
    const removed = checkedRemovals(value.removed_functions);
    requireExactBaseline(baselineFunctions, evidence, removed);
    const baselineByCurrent = baselineCurrentCorrespondence(baselineFunctions);
    return {
      baselineCoverageReportRef: value.baseline_coverage_report_ref as string,
      baselineCoverageReportSha256: value.baseline_coverage_report_sha256 as string,
      baselineFunctions,
      baselineByCurrent,
      publishedFunctions,
      newFunctions: checkedNewFunctions(value.new_functions),
      removed,
      newSources: checkedSourceEntries(value.new_sources, 'new'),
      removedSources: checkedSourceEntries(value.removed_sources, 'removed'),
    };
  }

  function gitText(args: string[]) {
    const result = spawnSync('git', args, {
      cwd: repoRoot,
      timeout: 5000,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
    if (result.error || result.signal || result.status === null || result.status !== 0)
      throw new Error(`Published Source query failed: git ${args.join(' ')}`);
    return new TextDecoder('utf-8', { fatal: true }).decode(result.stdout);
  }

  function baselineSources(): string[] {
    if (baselineSourcePaths) return baselineSourcePaths;
    const manifest = JSON.parse(gitText(['show', `${baselineRef}:packages/agent/package.json`])) as unknown;
    if (!isRecord(manifest) || !Array.isArray(manifest.files))
      throw new Error('Published package source inventory is invalid.');
    const patterns = manifest.files.filter((file) => typeof file === 'string' && /^(?:!?)(?:src|bin)\//u.test(file));
    const files = gitText([
      'ls-tree',
      '-r',
      '--name-only',
      baselineRef,
      '--',
      'packages/agent/src',
      'packages/agent/bin',
    ])
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((full) => full.slice('packages/agent/'.length))
      .filter((file) => /^src\/.+\.ts$|^bin\/.+\.mjs$/u.test(file));
    baselineSourcePaths = selectMaintainedSourcePaths(files, patterns as string[]);
    return baselineSourcePaths;
  }

  function baselineSource(file: string) {
    if (baselineTextByPath.has(file)) return baselineTextByPath.get(file) ?? null;
    const result = spawnSync('git', ['show', `${baselineRef}:packages/agent/${file}`], {
      cwd: repoRoot,
      timeout: 5000,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
    if (result.error || result.signal || result.status === null)
      throw new Error(`Published Source read is UNKNOWN: ${file}`);
    if (result.status !== 0) {
      if (
        /does not exist in/u.test(String(result.stderr)) ||
        /exists on disk, but not in/u.test(String(result.stderr))
      ) {
        baselineTextByPath.set(file, null);
        return null;
      }
      throw new Error(`Published Source lookup failed for ${file}: ${String(result.stderr)}`);
    }
    const source = new TextDecoder('utf-8', { fatal: true }).decode(result.stdout);
    baselineTextByPath.set(file, source);
    return source;
  }

  if (scoped) {
    const { mutationPartitions } = await import('./mutation-partitions.ts');
    const { validateFocusedCoverageReport } = await import('./bun-coverage-report-validator.js');
    const partition = mutationPartitions().find((row) => row.name === scopedArguments[1]);
    if (
      !partition?.sources?.length ||
      !partition.tests?.length ||
      !['main', 'bun'].includes(partition.environment ?? '')
    )
      throw new Error('Scoped CRAP proof requires a complete declared executable contour.');
    const budgetCommit = scopedArguments[3]!;
    const reviewKey =
      scopedBudgetReviews.get(`${budgetCommit}:${partition.name}`) ?? scopedBudgetReviews.get(budgetCommit);
    if (reviewKey === undefined)
      throw new Error('Scoped CRAP proof requires the pinned published reviewed budget commit.');
    if (gitText(['rev-parse', '--verify', `${budgetCommit}^{commit}`]).trim() !== budgetCommit)
      throw new Error('Scoped CRAP budget reference is not an immutable commit.');
    const budgetFile = '.agent/work/core-runtime-reactivation/crap-budgets.reviewed-partial.v1.json';
    const budgetBytes = gitText(['show', `${budgetCommit}:${budgetFile}`]);
    const budget: unknown = JSON.parse(budgetBytes);
    if (
      !isRecord(budget) ||
      budget.schema !== 'VidaReviewedFunctionLineagePartial/v1' ||
      budget.baseline_ref !== baselineRef ||
      !Array.isArray(budget.baseline_functions)
    )
      throw new Error('Scoped CRAP proof has no immutable reviewed function lineage.');
    const review = budget[reviewKey];
    const reviewedFiles = isRecord(review) && Array.isArray(review.files) ? new Set(review.files) : new Set();
    const v2Review = isRecord(review) && Object.hasOwn(review, 'source_mappings');
    const sourceMappingKind =
      isRecord(review) && Object.hasOwn(review, 'source_mapping_kind') ? review.source_mapping_kind : 'one-to-one';
    if (sourceMappingKind !== 'one-to-one' && sourceMappingKind !== 'reviewed-pairs')
      throw new Error('Reviewed Source mapping kind is invalid.');
    if (sourceMappingKind === 'reviewed-pairs' && !v2Review)
      throw new Error('Reviewed Source pairs require explicit mappings; the route cannot fall back to v1.');
    if (
      sourceMappingKind === 'one-to-one' &&
      isRecord(review) &&
      ['identity_reuses', 'new_source_paths', 'removed_source_paths'].some((field) => Object.hasOwn(review, field))
    )
      throw new Error('Reviewed v2 correspondence cannot authorize identity reuse.');
    if (v2Review && !Array.isArray(review.source_mappings))
      throw new Error('Reviewed v2 source mappings are malformed; the route cannot fall back to v1.');
    if (!v2Review && partition.sources.some((file) => !reviewedFiles.has(file)))
      throw new Error('Scoped CRAP contour is outside the pinned independent source-lineage review.');
    const validation = await validateFocusedCoverageReport(coveragePath, root, {
      mode: 'focused-diagnostic',
      contour: partition.name,
      sources: partition.sources,
      tests: partition.tests,
    });
    if (v2Review && isRecord(review) && Array.isArray(review.source_mappings)) {
      const identityReuses: ScopedIdentityReuse[] = [];
      if (sourceMappingKind === 'reviewed-pairs') {
        if (!Array.isArray(review.identity_reuses))
          throw new Error('Reviewed v3 correspondence requires explicit identity reuse records.');
        for (const row of review.identity_reuses) {
          if (
            !isRecord(row) ||
            Object.keys(row).length !== 3 ||
            typeof row.original_identity !== 'string' ||
            typeof row.successor_identity !== 'string' ||
            typeof row.rationale !== 'string'
          )
            throw new Error('Reviewed v3 identity reuse record is malformed.');
          identityReuses.push({
            original_identity: row.original_identity,
            successor_identity: row.successor_identity,
            rationale: row.rationale,
          });
        }
      }
      const sourceMappings: ScopedSourceMapping[] = review.source_mappings.map((raw: unknown) => {
        if (
          !isRecord(raw) ||
          typeof raw.original_path !== 'string' ||
          typeof raw.current_path !== 'string' ||
          typeof raw.rationale !== 'string' ||
          raw.rationale.trim().length < 8
        )
          throw new Error('Reviewed v2 source mapping is malformed or lacks rationale.');
        return { original_path: raw.original_path, current_path: raw.current_path, rationale: raw.rationale };
      });
      if (!Array.isArray(review.files) || !review.files.every((file) => typeof file === 'string'))
        throw new Error('Reviewed v2 original Source inventory is malformed.');
      const originalSources = [...review.files].sort((a, b) => a.localeCompare(b));
      const currentSources = [...partition.sources].sort((a, b) => a.localeCompare(b));
      if (new Set(review.files).size !== review.files.length)
        throw new Error('Reviewed v2 original Source paths are duplicated.');
      const mappedOriginal = new Set(sourceMappings.map((entry) => entry.original_path));
      const mappedCurrent = new Set(sourceMappings.map((entry) => entry.current_path));
      const removedSourcePaths =
        sourceMappingKind === 'reviewed-pairs'
          ? reviewedSourcePaths(review.removed_source_paths)
          : originalSources.filter((file) => !mappedOriginal.has(file));
      const newSourcePaths =
        sourceMappingKind === 'reviewed-pairs'
          ? reviewedSourcePaths(review.new_source_paths)
          : currentSources.filter((file) => !mappedCurrent.has(file));
      const originalSourceSet = new Set(originalSources);
      if (originalSourceSet.size !== originalSources.length)
        throw new Error('Reviewed v2 original source paths are duplicated.');
      const originalPathRows: FunctionRow[] = [];
      const originalSourceEvidence: { path: string; sha256: string }[] = [];
      for (const file of originalSources) {
        if (!baselineSources().includes(file))
          throw new Error('Reviewed v2 original Source is absent from immutable published inventory: ' + file);
        const source = baselineSource(file);
        if (source === null) throw new Error('Reviewed v2 original Source is missing: ' + file);
        originalSourceEvidence.push({ path: file, sha256: sha256(Buffer.from(source, 'utf8')) });
        originalPathRows.push(...functionInventory(source, file));
      }
      const currentRows: (Pick<FunctionRow, 'identity' | 'file' | 'complexity'> & BaselineFunctionEvidence)[] = [];
      for (const file of currentSources) {
        const bytes = validation.inputs.input_bytes[file];
        if (!bytes) throw new Error(`Current scoped Source is absent from its validated snapshot: ${file}`);
        const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        const rows = functionInventory(source, file);
        const measured = baselineFunctionEvidenceForSource(file, rows, validation.coverage[path.resolve(root, file)]);
        if (measured.length !== rows.length)
          throw new Error(`Scoped v2 current function evidence is incomplete: ${file}`);
        for (const [index, row] of rows.entries()) currentRows.push({ ...row, ...measured[index]! });
      }
      const identityIn = (identity: unknown, files: readonly string[]) =>
        typeof identity === 'string' && files.some((file) => identity.startsWith(file + '#'));
      const originalByIdentity = new Map(originalPathRows.map((row) => [row.identity, row]));
      const selectedRetained: unknown[] = budget.baseline_functions.filter(
        (raw: unknown) =>
          isRecord(raw) &&
          (identityIn(raw.identity, originalSources) || identityIn(raw.current_identity, currentSources)),
      );
      const currentIdentities = new Set(currentRows.map((row) => row.identity));
      const originalIdentities = new Set(originalPathRows.map((row) => row.identity));
      const retainedCeilings = new Map<string, { max_complexity: number; max_crap: number }>();
      const dispositions: ScopedFunctionDisposition[] = selectedRetained.map((raw: unknown) => {
        if (
          !isRecord(raw) ||
          typeof raw.identity !== 'string' ||
          typeof raw.current_identity !== 'string' ||
          typeof raw.rationale !== 'string' ||
          raw.rationale.trim().length < 8
        )
          throw new Error('Reviewed v2 retained function mapping is malformed or lacks rationale.');
        const original = originalByIdentity.get(raw.identity);
        if (
          !original ||
          raw.baseline_complexity !== original.complexity ||
          !isPositiveSafeInteger(raw.max_complexity) ||
          raw.max_complexity !== original.complexity ||
          !isPositiveSafeInteger(raw.max_crap) ||
          raw.max_crap < original.complexity
        )
          throw new Error('Reviewed v2 retained caps do not preserve exact original Source CC ceilings.');
        retainedCeilings.set(raw.identity, { max_complexity: raw.max_complexity, max_crap: raw.max_crap });
        return {
          kind: 'retained',
          identity: raw.identity,
          current_identity: raw.current_identity,
          max_complexity: raw.max_complexity,
          max_crap: raw.max_crap,
          rationale: raw.rationale,
        };
      });
      if (!Array.isArray(budget.new_functions) || !Array.isArray(budget.removed_functions))
        throw new Error('Reviewed v2 function additions/removals are missing.');
      const reviewedNewFunctions = checkedNewFunctions(
        budget.new_functions.filter((raw: unknown) => isRecord(raw) && identityIn(raw.identity, currentSources)),
      );
      for (const entry of reviewedNewFunctions.values()) dispositions.push({ kind: 'new', ...entry });
      const reviewedRemovedFunctions = checkedRemovals(
        budget.removed_functions.filter((raw: unknown) => isRecord(raw) && identityIn(raw.identity, originalSources)),
      );
      for (const entry of reviewedRemovedFunctions.values()) dispositions.push({ kind: 'removed', ...entry });
      const helperRows = scopedCrapDispositionProof(
        originalPathRows,
        currentRows,
        dispositions,
        sourceMappings,
        originalSources,
        currentSources,
        removedSourcePaths,
        newSourcePaths,
        retainedCeilings,
        sourceMappingKind === 'reviewed-pairs'
          ? { source_mapping_kind: sourceMappingKind, identity_reuses: identityReuses }
          : { source_mapping_kind: sourceMappingKind },
      );
      if (
        [...reviewedRemovedFunctions.keys()].some((identity) => !originalIdentities.has(identity)) ||
        [...reviewedNewFunctions.keys()].some((identity) => !currentIdentities.has(identity))
      )
        throw new Error('Reviewed v2 new/removal rows do not name exact current/original function identities.');
      const report = validation.report;
      const result = {
        schema:
          sourceMappingKind === 'reviewed-pairs' ? 'VidaScopedCrapBudgetReport/v3' : 'VidaScopedCrapBudgetReport/v2',
        ...(sourceMappingKind === 'reviewed-pairs'
          ? {
              source_mapping_kind: sourceMappingKind,
              identity_reuses: identityReuses,
              new_source_paths: newSourcePaths,
              removed_source_paths: removedSourcePaths,
            }
          : {}),
        status: 'scoped-proof-pass',
        contour: partition.name,
        qualification_scope: 'declared-contour-reviewed-function-budgets',
        full_qualification: false,
        historical_measurement_admitted: false,
        historical_coverage_runtime_artifacts: 'not-consumed/not-admitted',
        baseline_ref: baselineRef,
        baseline_commit: gitText(['rev-parse', '--verify', `${baselineRef}^{commit}`]).trim(),
        budget_commit: budgetCommit,
        budget_file: budgetFile,
        budget_sha256: sha256(budgetBytes),
        original_sources: originalSourceEvidence,
        source_mappings: sourceMappings,
        run_id: report.run_id,
        coverage_run_id: report.run_id,
        coverage_report: coveragePath,
        coverage_report_sha256: validation.report_sha256,
        manifest_sha256: report.manifest_sha256,
        sources: validation.inputs.sources,
        test_inputs: validation.inputs.test_inputs,
        tool_inputs: validation.inputs.tool_inputs,
        module_inputs: validation.inputs.module_inputs,
        test_selection: validation.inputs.test_selection,
        functions: helperRows,
        limits:
          'Scoped local admission only. Retained roles use original Source CC lower bounds with current exact full coverage; new roles use their own independently published caps; removals carry no cap. Complete quality closure remains separate.',
      };
      const scopedPath = path.join(root, 'coverage/bun-unified/diagnostics', `${report.run_id}.scoped-crap.json`);
      await mkdir(path.dirname(scopedPath), { recursive: true });
      await writeFile(scopedPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
      process.stdout.write(JSON.stringify({ schema: result.schema, status: result.status, report: scopedPath }) + '\n');
      process.exit(0);
    }
    const published: FunctionRow[] = [];
    const measured: BaselineFunctionEvidence[] = [];
    const originalSources: { path: string; sha256: string }[] = [];
    for (const file of partition.sources) {
      if (!baselineSources().includes(file))
        throw new Error('Scoped Source is absent from the published inventory: ' + file);
      const original = baselineSource(file);
      if (original === null) throw new Error('Scoped original Source is missing: ' + file);
      originalSources.push({ path: file, sha256: sha256(original) });
      published.push(...functionInventory(original, file));
      const source = validation.inputs.input_bytes[file];
      if (!source) throw new Error('Scoped current Source is absent from its validated snapshot: ' + file);
      const rows = functionInventory(new TextDecoder('utf-8', { fatal: true }).decode(source), file);
      measured.push(...baselineFunctionEvidenceForSource(file, rows, validation.coverage[path.resolve(root, file)]));
    }
    const selected = new Set(partition.sources);
    const frozen = budget.baseline_functions.filter(
      (row: unknown) =>
        isRecord(row) &&
        [row.identity, row.current_identity].some((id) => typeof id === 'string' && selected.has(id.split('#')[0]!)),
    );
    const functions = scopedCrapFunctionProof(published, measured, frozen);
    const report = validation.report;
    const result = {
      schema: 'VidaScopedCrapBudgetReport/v1',
      status: 'scoped-proof-pass',
      contour: partition.name,
      qualification_scope: 'declared-contour-original-source-lower-bound',
      full_qualification: false,
      historical_measurement_admitted: false,
      historical_coverage_runtime_artifacts: 'not-consumed/not-admitted',
      baseline_ref: baselineRef,
      baseline_commit: gitText(['rev-parse', '--verify', `${baselineRef}^{commit}`]).trim(),
      budget_commit: budgetCommit,
      budget_file: budgetFile,
      budget_sha256: sha256(budgetBytes),
      original_sources: originalSources,
      run_id: report.run_id,
      coverage_run_id: report.run_id,
      coverage_report: coveragePath,
      coverage_report_sha256: validation.report_sha256,
      manifest_sha256: report.manifest_sha256,
      sources: validation.inputs.sources,
      test_inputs: validation.inputs.test_inputs,
      tool_inputs: validation.inputs.tool_inputs,
      module_inputs: validation.inputs.module_inputs,
      test_selection: validation.inputs.test_selection,
      functions,
      limits:
        'Local conservative CRAP proof only; complete closure separately requires exact coverage and assertion-confirmed mutation. The partial lineage is not an executable global plan. Historical coverage/CRAP are not admitted.',
    };
    const scopedPath = path.join(root, 'coverage/bun-unified/diagnostics', `${report.run_id}.scoped-crap.json`);
    await mkdir(path.dirname(scopedPath), { recursive: true });
    await writeFile(scopedPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    process.stdout.write(JSON.stringify({ schema: result.schema, status: result.status, report: scopedPath }) + '\n');
    process.exit(0);
  }

  const baselineCheck = spawnSync('git', ['rev-parse', '--verify', `${baselineRef}^{commit}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (baselineCheck.status !== 0 || baselineCheck.signal || baselineCheck.error)
    throw new Error('Published CRAP baseline commit is unavailable.');
  const currentCoverage = await validateCoverageReport(coveragePath, root);
  // This diagnostic records the validator's completed work even if the later
  // budget-plan or CRAP check fails. It grants no numeric quality admission.
  if (process.env.VIDA_COVERAGE_RECORD_VALIDATION === '1') {
    const report = currentCoverage.report;
    const observationPath = path.join(
      root,
      'coverage',
      'bun-unified',
      'runs',
      String(report.run_id),
      'processes',
      'observations',
      'report-validation.json',
    );
    await writeFile(
      observationPath,
      JSON.stringify({
        schema: 'VidaBunCoverageReportValidationObservation/v1',
        run_id: report.run_id,
        source_fingerprint: report.source_fingerprint,
        test_fingerprint: report.test_fingerprint,
        tool_fingerprint: report.tool_fingerprint,
        validated: true,
      }) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
  }
  const planBytes = await readFile(planPath);
  const planValue: unknown = JSON.parse(planBytes.toString('utf8'));
  const plan = await checkedPlan(planValue);
  const planDigest = sha256(planBytes);
  const report = currentCoverage.report as CoverageReport;
  const coverage = createCoverageMap(currentCoverage.coverage);
  const inventory = maintainedSourceInventory(root);
  if (
    !isRecord(inventory) ||
    !Array.isArray(inventory.mutationSources) ||
    !inventory.mutationSources.every((file) => typeof file === 'string')
  )
    throw new Error('Maintained source inventory is invalid.');
  const sources = inventory.mutationSources as string[];
  const baseSources = baselineSources();
  const currentSourceSet = new Set(sources);
  const baselineSourceSet = new Set(baseSources);
  const addedSources = [...currentSourceSet]
    .filter((file) => !baselineSourceSet.has(file))
    .sort((left, right) => left.localeCompare(right));
  const missingSources = [...baselineSourceSet]
    .filter((file) => !currentSourceSet.has(file))
    .sort((left, right) => left.localeCompare(right));
  if (
    JSON.stringify(addedSources) !== JSON.stringify([...plan.newSources.keys()].sort()) ||
    JSON.stringify(missingSources) !== JSON.stringify([...plan.removedSources.keys()].sort())
  )
    throw new Error('Maintained source additions/removals do not match the reviewed budget plan.');

  const publishedFunctions = plan.publishedFunctions;

  const currentFunctions: Map<string, FunctionRow> = new Map();
  for (const file of sources) {
    const currentBytes = currentCoverage.inputs.input_bytes[file];
    if (!currentBytes) throw new Error(`Current source snapshot is missing: ${file}`);
    const source = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes);
    const current = functionInventory(source, file);
    const absolute = path.resolve(root, file);
    const fc = coverage.fileCoverageFor(absolute);
    const generated = currentCoverage.canonical_source_maps[absolute];
    if (!generated) throw new Error(`Canonical Source coverage map is missing: ${file}`);
    validateCoverageLocations(file, source, fc, generated.branchMap);
    if (
      Object.keys(fc.fnMap).length !== current.length ||
      JSON.stringify(fc.fnMap) !== JSON.stringify(generated.fnMap) ||
      JSON.stringify(Object.keys(fc.f).sort()) !== JSON.stringify(Object.keys(fc.fnMap).sort())
    )
      throw new Error(`Function coverage mapping/cardinality mismatch: ${file}`);
    const summary = fc.toSummary().toJSON();
    for (const metric of ['functions', 'lines', 'statements', 'branches'] as Array<keyof CoverageSummaryData>)
      exactFullCoverage(summary, metric, file);
    for (const [id, counter] of Object.entries(fc.f))
      if (!Number.isSafeInteger(counter) || counter < 1)
        throw new Error(`Function counter is uncovered or invalid: ${file}.${id}`);
    for (const row of current) {
      if (currentFunctions.has(row.identity)) throw new Error(`Duplicate current function identity: ${row.identity}`);
      currentFunctions.set(row.identity, row);
    }
  }

  const baselineIds = new Set(publishedFunctions.keys());
  const currentIds = new Set(currentFunctions.keys());
  const retainedBaselineIds = new Set(plan.baselineFunctions.keys());
  const retainedCurrentIds = new Set(plan.baselineByCurrent.keys());
  for (const [baselineIdentity, budget] of plan.baselineFunctions) {
    if (!baselineIds.has(baselineIdentity))
      throw new Error(`Function correspondence names a missing published function: ${baselineIdentity}`);
    if (!currentIds.has(budget.current_identity))
      throw new Error(`Function correspondence names a missing current function: ${budget.current_identity}`);
  }
  const newIds = [...currentIds]
    .filter((identity) => !retainedCurrentIds.has(identity))
    .sort((left, right) => left.localeCompare(right));
  const removedIds = [...baselineIds]
    .filter((identity) => !retainedBaselineIds.has(identity))
    .sort((left, right) => left.localeCompare(right));
  const plannedNew = [...plan.newFunctions.keys()].sort();
  const plannedRemoved = [...plan.removed.keys()].sort();
  if (JSON.stringify(newIds) !== JSON.stringify(plannedNew))
    throw new Error('New AST functions do not exactly match reviewed budget-plan identities.');
  if (JSON.stringify(removedIds) !== JSON.stringify(plannedRemoved))
    throw new Error('Missing AST functions do not exactly match reviewed removal dispositions.');
  if (plan.baselineByCurrent.size !== plan.baselineFunctions.size)
    throw new Error('Retained baseline-current function correspondence is not one-to-one.');

  const rows = [];
  for (const [identity, current] of currentFunctions) {
    const budget = plan.baselineByCurrent.get(identity);
    const baseline = budget ? publishedFunctions.get(budget.identity) : undefined;
    if (baseline && budget) {
      if (!budget || budget.baseline_complexity !== baseline.complexity)
        throw new Error(`Existing function has no matching frozen baseline budget: ${budget.identity}`);
      const crap = current.complexity;
      if (current.complexity > budget.max_complexity || crap > budget.max_crap)
        throw new Error(
          `Existing function exceeds its frozen complexity/CRAP budget: ${budget.identity} -> ${identity}`,
        );
      rows.push({
        identity: budget.identity,
        current_identity: identity,
        file: current.file,
        start_offset: current.start,
        end_offset: current.end,
        complexity: current.complexity,
        coverage: 1,
        crap,
        baseline_complexity: budget.baseline_complexity,
        baseline_coverage: budget.baseline_coverage,
        baseline_crap: budget.baseline_crap,
        maximum_complexity: budget.max_complexity,
        maximum_crap: budget.max_crap,
        rationale: budget.rationale,
      });
    } else {
      const budget = plan.newFunctions.get(identity);
      if (!budget) throw new Error(`New function has no frozen task-plan budget: ${identity}`);
      const crap = current.complexity;
      if (current.complexity > budget.max_complexity || crap > budget.max_crap)
        throw new Error(`New function exceeds its frozen complexity/CRAP budget: ${identity}`);
      rows.push({
        identity,
        file: current.file,
        start_offset: current.start,
        end_offset: current.end,
        complexity: current.complexity,
        coverage: 1,
        crap,
        baseline_complexity: null,
        baseline_crap_at_full_coverage: null,
        maximum_complexity: budget.max_complexity,
        maximum_crap: budget.max_crap,
        rationale: budget.rationale,
      });
    }
  }
  for (const [identity, disposition] of plan.removed) {
    const removedFunction = publishedFunctions.get(identity);
    if (!removedFunction || plan.baselineFunctions.has(identity))
      throw new Error(`Removed-function disposition does not match the AST diff: ${identity}`);
    rows.push({
      identity,
      file: removedFunction.file,
      status: 'removed',
      rationale: disposition.rationale,
    });
  }
  const result = {
    schema: 'VidaCrapBudgetReport/v1',
    status: 'pass',
    baseline_ref: baselineRef,
    budget_plan_sha256: planDigest,
    source_fingerprint: report.source_fingerprint,
    coverage_run_id: report.run_id,
    baseline_coverage_report_ref: plan.baselineCoverageReportRef,
    baseline_coverage_report_sha256: plan.baselineCoverageReportSha256,
    selector_receipt: {
      tests: report.tests,
      test_selection: report.test_selection,
      test_inputs: report.test_inputs,
      test_fingerprint: report.test_fingerprint,
    },
    formula: 'CC^2 * (1 - function_coverage)^3 + CC',
    existing_policy:
      'exact reviewed per-function baseline-to-current correspondence and frozen complexity/CRAP ceilings',
    new_function_policy: 'exact task-plan identity; complexity and CRAP ceilings <= 10',
    new_sources: [...plan.newSources].map(([path, rationale]) => ({ path, rationale })),
    removed_sources: [...plan.removedSources].map(([path, rationale]) => ({ path, rationale })),
    functions: rows,
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
