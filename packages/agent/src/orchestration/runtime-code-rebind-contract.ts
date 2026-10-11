import { assertCanonicalJsonValue, isPlainRecord } from '../contracts/public-ingress.js';
import type { RuntimeCodeRebindRequest, StateVersion, WorkIdentity } from '../host-state.js';

const digestPattern = /^[a-f0-9]{64}$/;
function invalid(): never {
  throw new Error('runtime-code rebind request is invalid');
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Reflect.ownKeys(value);
  return (
    keys.every((key) => typeof key === 'string' && (required.includes(key) || optional.includes(key))) &&
    required.every((key) => Object.hasOwn(value, key))
  );
}

function boundedText(value: unknown, maximum = 2048): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    value.trim() === value &&
    !/\p{Cc}/u.test(value)
  );
}

function identityText(value: unknown): value is string {
  return typeof value === 'string';
}

function focusedCorrectionPointer(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 2048;
}

function parseWorkIdentity(value: unknown): WorkIdentity {
  if (!isPlainRecord(value) || !exactKeys(value, ['repository_id', 'project_ids', 'integrations_digest', 'work_id']))
    return invalid();
  const { repository_id, project_ids, integrations_digest, work_id } = value;
  if (
    !identityText(repository_id) ||
    !identityText(integrations_digest) ||
    !identityText(work_id) ||
    !stringArray(project_ids)
  )
    return invalid();
  return Object.freeze({ repository_id, project_ids: Object.freeze([...project_ids]), integrations_digest, work_id });
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function parseStateVersion(value: unknown): StateVersion {
  if (!isPlainRecord(value) || !exactKeys(value, ['revision', 'digest'])) return invalid();
  const { revision, digest } = value;
  if (
    !Number.isSafeInteger(revision) ||
    Number(revision) < 1 ||
    typeof digest !== 'string' ||
    !digestPattern.test(digest)
  )
    return invalid();
  return Object.freeze({ revision: Number(revision), digest });
}

export function parseRuntimeRebindStateVersion(value: unknown): StateVersion {
  assertCanonicalJsonValue(value, '$.runtimeCodeRebindVersion');
  return parseStateVersion(value);
}

function parseCorrectionPointer(value: unknown): { readonly ownerCorrectionPointer: string } {
  if (!isPlainRecord(value) || !exactKeys(value, ['ownerCorrectionPointer'])) return invalid();
  if (!focusedCorrectionPointer(value.ownerCorrectionPointer)) return invalid();
  return Object.freeze({ ownerCorrectionPointer: value.ownerCorrectionPointer });
}

function parseSynthesisCorrection(value: unknown): NonNullable<RuntimeCodeRebindRequest['synthesisCorrection']> {
  if (!isPlainRecord(value) || !exactKeys(value, ['correctionId', 'correctionDigest', 'ownerCorrectionPointer']))
    return invalid();
  const { correctionId, correctionDigest, ownerCorrectionPointer } = value;
  if (!boundedText(correctionId) || !digestString(correctionDigest) || !boundedText(ownerCorrectionPointer))
    return invalid();
  return Object.freeze({ correctionId, correctionDigest, ownerCorrectionPointer });
}

function digestString(value: unknown): value is string {
  return typeof value === 'string' && digestPattern.test(value);
}

function parseCoreFields(value: Record<string, unknown>) {
  const {
    attempt,
    actionId,
    issueId,
    nativeSessionHandle,
    oldRuntimeCodeDigest,
    newRuntimeCodeDigest,
    forwardOperationId,
    parentManifestDigest,
    successorManifestDigest,
  } = value;
  if (!Number.isSafeInteger(attempt) || Number(attempt) < 1) return invalid();
  if (!validRebindTextFields([actionId, issueId, nativeSessionHandle, forwardOperationId])) return invalid();
  if (!validRebindDigests([oldRuntimeCodeDigest, newRuntimeCodeDigest, parentManifestDigest, successorManifestDigest]))
    return invalid();
  if (oldRuntimeCodeDigest === newRuntimeCodeDigest) return invalid();
  return {
    attempt: Number(attempt),
    actionId: String(actionId),
    issueId: String(issueId),
    nativeSessionHandle: String(nativeSessionHandle),
    oldRuntimeCodeDigest: String(oldRuntimeCodeDigest),
    newRuntimeCodeDigest: String(newRuntimeCodeDigest),
    forwardOperationId: String(forwardOperationId),
    parentManifestDigest: String(parentManifestDigest),
    successorManifestDigest: String(successorManifestDigest),
  };
}

function validRebindTextFields(values: readonly unknown[]): boolean {
  return values.every((entry) => boundedText(entry));
}

function validRebindDigests(values: readonly unknown[]): boolean {
  return values.every(digestString);
}

function parseMaintenanceGeneration(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || Number(value) < 0) return invalid();
  return Number(value);
}

function validateVariant(
  value: Record<string, unknown>,
): Pick<RuntimeCodeRebindRequest, 'ownerNoCallPointer' | 'focusedFailureCorrection' | 'synthesisCorrection'> {
  const focused = value.focusedFailureCorrection;
  const synthesis = value.synthesisCorrection;
  const noCall = value.ownerNoCallPointer;
  if (focused !== undefined) {
    if (synthesis !== undefined || noCall !== undefined) return invalid();
    return { focusedFailureCorrection: parseCorrectionPointer(focused) };
  }
  if (synthesis !== undefined) {
    if (noCall !== undefined) return invalid();
    return { synthesisCorrection: parseSynthesisCorrection(synthesis) };
  }
  if (!boundedText(noCall)) return invalid();
  return { ownerNoCallPointer: noCall };
}

/** Parse persisted or caller-provided current-v1 rebind data without granting Host authority. */
export function parseRuntimeCodeRebindRequest(value: unknown): RuntimeCodeRebindRequest {
  assertCanonicalJsonValue(value, '$.runtimeCodeRebindRequest');
  if (!isPlainRecord(value)) return invalid();
  const required = [
    'identity',
    'attempt',
    'actionId',
    'issueId',
    'nativeSessionHandle',
    'expectedWork',
    'expectedLedger',
    'expectedJournal',
    'oldRuntimeCodeDigest',
    'newRuntimeCodeDigest',
    'forwardOperationId',
    'parentManifestDigest',
    'successorManifestDigest',
  ];
  if (
    !exactKeys(value, required, [
      'expectedMaintenanceGeneration',
      'ownerNoCallPointer',
      'focusedFailureCorrection',
      'synthesisCorrection',
    ])
  )
    return invalid();
  const core = parseCoreFields(value),
    maintenance = parseMaintenanceGeneration(value.expectedMaintenanceGeneration);
  const variant = validateVariant(value);
  return Object.freeze({
    identity: parseWorkIdentity(value.identity),
    ...core,
    expectedWork: parseStateVersion(value.expectedWork),
    expectedLedger: parseStateVersion(value.expectedLedger),
    expectedJournal: parseStateVersion(value.expectedJournal),
    ...(maintenance === undefined ? {} : { expectedMaintenanceGeneration: maintenance }),
    ...variant,
  });
}
