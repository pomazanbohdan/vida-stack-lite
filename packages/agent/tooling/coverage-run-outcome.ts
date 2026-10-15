import type { CoverageProducerGroup, CoverageProducerOutcome } from './run-bun-coverage.ts';

type CoverageRunOutcomeStatus = 'BLOCKED' | 'FAIL' | 'UNKNOWN' | 'PASS';
type CoverageRunPhase = 'preflight' | 'prepared' | 'execution' | 'report' | 'quality' | 'complete';
type CoverageRunInputProofs = {
  source: boolean | null;
  tests: boolean | null;
  configuration: boolean | null;
  hashes: boolean | null;
};
export type CoveragePhaseProducerObservation = {
  phase: 'typecheck' | 'quality';
  launch_attempted: true;
  pid: number | null;
  status: number | null;
  signal: NodeJS.Signals | null;
  error: { name: string | null; code: string | null; message: string | null } | null;
  timeout_observed: boolean;
  producerTerminalKnown: boolean;
  directProducerAccounted: boolean;
  reservationSafeToRelease: boolean;
  unknown: boolean;
};
type TimeoutObservationOutcome = CoverageProducerOutcome & { timeout_observed?: boolean | null };
type CoverageRunErrorDiagnostic = {
  kind: string;
  name: string | null;
  message: string | null;
  code: string | null;
  causes?: readonly CoverageRunErrorDiagnostic[];
};

export type CoverageRunOutcomeInput = {
  run_id: string;
  selection: { mode: string; fingerprint: string | null; contour?: string };
  input_fingerprints: Readonly<Record<string, string | null>>;
  input_proofs?: Partial<CoverageRunInputProofs>;
  phase: CoverageRunPhase;
  expected_producer_count: number;
  producer_group?: CoverageProducerGroup;
  test_reservation_safe_to_release?: boolean;
  phase_producer_observations?: readonly CoveragePhaseProducerObservation[];
  execution_complete: boolean | null;
  report_validated: boolean | null;
  report_rejected?: boolean;
  quality_complete: boolean;
  quality_passed: boolean | null;
  original_error?: unknown;
};

export type CoverageRunOutcome = {
  schema: 'VidaBunCoverageOperationOutcome/v1';
  run_id: string;
  selection: CoverageRunOutcomeInput['selection'];
  input_fingerprints: CoverageRunOutcomeInput['input_fingerprints'];
  input_proofs: CoverageRunInputProofs;
  phase: CoverageRunPhase;
  status: CoverageRunOutcomeStatus;
  retention_required: boolean;
  producer_outcomes: readonly CoverageProducerOutcome[];
  producer_observations: readonly {
    shard_id: string;
    timeout_observed: boolean | null;
    sigkill_observed: boolean;
    unknown: boolean;
  }[];
  phase_producer_observations: readonly CoveragePhaseProducerObservation[];
  launched_count: number;
  unattempted_count: number | null;
  direct_accounted_count: number;
  reservation_safe_to_release: boolean;
  resource_safe_to_advance: boolean;
  execution_complete: boolean;
  report_complete: boolean;
  report_validated: boolean | null;
  report_rejected: boolean;
  quality_complete: boolean;
  quality_passed: boolean | null;
  original_error_diagnostic: CoverageRunErrorDiagnostic | null;
  original_error?: unknown;
};

function errorText(error: unknown, key: 'name' | 'message' | 'code'): string | null {
  if ((typeof error !== 'object' && typeof error !== 'function') || error === null) return null;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, key);
    return descriptor && 'value' in descriptor && typeof descriptor.value === 'string'
      ? descriptor.value.slice(0, 256)
      : null;
  } catch {
    return null;
  }
}

function ownedErrorCauses(error: unknown): unknown[] {
  if ((typeof error !== 'object' && typeof error !== 'function') || error === null) return [];
  try {
    const errors = Object.getOwnPropertyDescriptor(error, 'errors');
    if (errors && 'value' in errors && Array.isArray(errors.value)) {
      const children: unknown[] = [];
      for (let index = 0; index < 4; index++) {
        const child = Object.getOwnPropertyDescriptor(errors.value, String(index));
        if (child && 'value' in child) children.push(child.value);
      }
      return children;
    }
    const cause = Object.getOwnPropertyDescriptor(error, 'cause');
    return cause && 'value' in cause ? [cause.value] : [];
  } catch {
    return [];
  }
}

function errorDiagnostic(error: unknown, depth = 0): CoverageRunErrorDiagnostic {
  const kind = error === null ? 'null' : typeof error;
  const causes = depth < 2 ? ownedErrorCauses(error).map((cause) => errorDiagnostic(cause, depth + 1)) : [];
  return {
    kind,
    name: errorText(error, 'name'),
    message: typeof error === 'string' ? error.slice(0, 256) : errorText(error, 'message'),
    code: errorText(error, 'code'),
    ...(causes.length ? { causes } : {}),
  };
}

function producerSucceeded(outcome: CoverageProducerOutcome): boolean {
  return (
    !!outcome.shard_id &&
    outcome.launch_attempted &&
    outcome.producerTerminalKnown &&
    outcome.directProducerAccounted &&
    successfulNativeTerminal(outcome)
  );
}

function successfulNativeTerminal(outcome: CoverageProducerOutcome): boolean {
  return (
    !outcome.unknown &&
    outcome.status === 0 &&
    outcome.signal === null &&
    outcome.error === null &&
    (outcome as TimeoutObservationOutcome).timeout_observed !== true &&
    Number.isSafeInteger(outcome.producer_pid) &&
    outcome.producer_pid !== null &&
    outcome.producer_pid > 0
  );
}

function producersSucceeded(group: CoverageProducerGroup | undefined, expected: number): boolean {
  if (!Number.isSafeInteger(expected) || expected <= 0 || !group || group.outcomes.length !== expected) return false;
  const shardIds = new Set<string>();
  const producerPids = new Set<number>();
  for (const outcome of group.outcomes) {
    if (!producerSucceeded(outcome) || shardIds.has(outcome.shard_id) || producerPids.has(outcome.producer_pid!))
      return false;
    shardIds.add(outcome.shard_id);
    producerPids.add(outcome.producer_pid!);
  }
  return true;
}

function hasKnownProducerFailure(outcomes: readonly CoverageProducerOutcome[]): boolean {
  return outcomes.some((outcome) => outcome.status !== null && outcome.status !== 0 && !outcome.unknown);
}

function hasUnknownProducer(outcomes: readonly CoverageProducerOutcome[]): boolean {
  return outcomes.some((outcome) => outcome.unknown || (outcome.launch_attempted && !outcome.directProducerAccounted));
}

function hasKnownPhaseProducerFailure(observations: readonly CoveragePhaseProducerObservation[]): boolean {
  return observations.some(
    (observation) => observation.status !== null && observation.status !== 0 && !observation.unknown,
  );
}

function hasUnknownPhaseProducer(observations: readonly CoveragePhaseProducerObservation[]): boolean {
  return observations.some((observation) => observation.unknown || !observation.reservationSafeToRelease);
}

function completionPassed(input: CoverageRunOutcomeInput, executionComplete: boolean): boolean {
  return (
    executionComplete && input.report_validated === true && input.quality_complete && input.quality_passed === true
  );
}

function isPreExecutionBlock(input: CoverageRunOutcomeInput): boolean {
  return !input.producer_group && input.phase !== 'execution' && input.phase !== 'report' && input.phase !== 'quality';
}

function outcomeStatus(input: CoverageRunOutcomeInput, executionComplete: boolean): CoverageRunOutcomeStatus {
  const outcomes = input.producer_group?.outcomes ?? [];
  const phaseProducers = input.phase_producer_observations ?? [];
  if (hasKnownProducerFailure(outcomes)) return 'FAIL';
  if (hasKnownPhaseProducerFailure(phaseProducers)) return 'FAIL';
  if (hasUnknownProducer(outcomes)) return 'UNKNOWN';
  if (hasUnknownPhaseProducer(phaseProducers)) return 'UNKNOWN';
  if (input.quality_complete && input.quality_passed === false) return 'FAIL';
  if (input.report_rejected === true) return 'FAIL';
  if (input.report_validated === false) return 'FAIL';
  if (Object.hasOwn(input, 'original_error')) return isPreExecutionBlock(input) ? 'BLOCKED' : 'UNKNOWN';
  if (completionPassed(input, executionComplete)) return 'PASS';
  if (isPreExecutionBlock(input)) return 'BLOCKED';
  if (input.expected_producer_count !== outcomes.length || !executionComplete) return 'UNKNOWN';
  return 'BLOCKED';
}

/** Build factual operation-result evidence without admitting partial producer output. */
export function buildCoverageRunOutcome(input: CoverageRunOutcomeInput): CoverageRunOutcome {
  const outcomes = input.producer_group?.outcomes ?? [];
  const phaseProducers = input.phase_producer_observations ?? [];
  const producerSuccess = producersSucceeded(input.producer_group, input.expected_producer_count);
  const executionComplete = input.execution_complete === true && producerSuccess;
  const status = outcomeStatus(input, executionComplete);
  const result: CoverageRunOutcome = {
    schema: 'VidaBunCoverageOperationOutcome/v1',
    run_id: input.run_id,
    selection: input.selection,
    input_fingerprints: input.input_fingerprints,
    input_proofs: {
      source: input.input_proofs?.source ?? null,
      tests: input.input_proofs?.tests ?? null,
      configuration: input.input_proofs?.configuration ?? null,
      hashes: input.input_proofs?.hashes ?? null,
    },
    phase: input.phase,
    status,
    retention_required: status !== 'PASS' || !(input.producer_group?.resourceSafeToAdvance ?? false),
    producer_outcomes: outcomes,
    producer_observations: outcomes.map((outcome) => ({
      shard_id: outcome.shard_id,
      timeout_observed: (outcome as TimeoutObservationOutcome).timeout_observed ?? null,
      sigkill_observed: outcome.signal === 'SIGKILL',
      unknown: outcome.unknown,
    })),
    phase_producer_observations: phaseProducers,
    launched_count: outcomes.filter((outcome) => outcome.launch_attempted).length,
    unattempted_count:
      !Number.isSafeInteger(input.expected_producer_count) || input.expected_producer_count < 0
        ? null
        : Math.max(
            input.expected_producer_count - outcomes.length,
            outcomes.filter((outcome) => !outcome.launch_attempted).length,
          ),
    direct_accounted_count: outcomes.filter((outcome) => outcome.directProducerAccounted).length,
    reservation_safe_to_release:
      (input.test_reservation_safe_to_release ?? input.producer_group?.reservationSafeToRelease ?? true) &&
      phaseProducers.every((observation) => observation.reservationSafeToRelease),
    resource_safe_to_advance: input.producer_group?.resourceSafeToAdvance ?? false,
    execution_complete: executionComplete,
    report_complete: input.report_validated === true,
    report_validated: input.report_validated,
    report_rejected: input.report_rejected === true,
    quality_complete: input.quality_complete,
    quality_passed: input.quality_passed,
    original_error_diagnostic: Object.hasOwn(input, 'original_error') ? errorDiagnostic(input.original_error) : null,
  };
  if (Object.hasOwn(input, 'original_error'))
    Object.defineProperty(result, 'original_error', { value: input.original_error, enumerable: false });
  return result;
}
