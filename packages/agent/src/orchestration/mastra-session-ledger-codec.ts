import { assertCanonicalJsonValue, isPlainRecord } from '../contracts/public-ingress.js';
import {
  validateActivationUse,
  validateObservedActivationUseWritePlan,
  validateObservedResearchRecordPlan,
} from '../research-decision.js';
import type { MastraLedgerItem, MastraSessionLedgerState } from './persistent-session-handoff.js';
import { correctiveExecutionSchema, type CorrectiveExecution } from './corrective-execution-contract.js';
import {
  parseSessionBridgeObservation,
  parseSessionBridgeRequest,
  type SessionBridgeObservation,
  type SessionBridgeRequest,
} from './mastra-session-bridge-contract.js';
import { parseScopedSourceSnapshot, type ScopedSourceSnapshot } from './scoped-source-snapshot.js';
import { parseWorkflowSessionReservationData } from './workflow-session-reservation-contract.js';

const stateRequiredKeys = [
  'schema',
  'workspace_id',
  'work_id',
  'attempt',
  'run_id',
  'step_id',
  'items',
  'completed',
] as const;
const stateOptionalKeys = ['corrective_execution', 'source_scope', 'research_wave_exposure'] as const;
const itemOptionalKeys = ['host_reservation', 'research_activation', 'research_normalization'] as const;

function exactKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  if (!isPlainRecord(value)) return false;
  for (const key of required) if (!Object.hasOwn(value, key)) return false;
  for (const key of Object.keys(value)) if (!required.includes(key) && !optional.includes(key)) return false;
  return true;
}

function parseJsonString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} is invalid`);
  return value;
}

function parsePositiveSafeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw new Error(`${label} is invalid`);
  return value;
}

function parseStepId(value: unknown): string | null {
  if (value === null) return null;
  return parseJsonString(value, 'Mastra session step id');
}

function parseCorrectiveExecution(value: unknown): CorrectiveExecution | null {
  if (value === null) return null;
  return correctiveExecutionSchema.parse(value);
}

function parseSourceScope(value: unknown): ScopedSourceSnapshot | null {
  if (value === null) return null;
  return parseScopedSourceSnapshot(value);
}

function parseExposure(value: unknown): 'preparing' | 'possible' {
  if (value !== 'preparing' && value !== 'possible') throw new Error('Mastra research wave exposure marker is invalid');
  return value;
}

function parseResearchActivation(value: unknown): NonNullable<MastraLedgerItem['research_activation']> {
  if (!exactKeys(value, ['use', 'plan'])) throw new Error('Mastra research activation shape is invalid');
  return {
    use: validateActivationUse(value.use),
    plan: validateObservedActivationUseWritePlan(value.plan),
  };
}

function parseLedgerItem(value: unknown): MastraLedgerItem {
  if (!exactKeys(value, ['request', 'issue_id', 'observation'], itemOptionalKeys))
    throw new Error('Mastra session ledger item shape is invalid');
  const request: SessionBridgeRequest = parseSessionBridgeRequest(value.request);
  const issueId = value.issue_id === null ? null : parseJsonString(value.issue_id, 'Mastra session issue id');
  const observation: SessionBridgeObservation | null =
    value.observation === null ? null : parseSessionBridgeObservation(value.observation);
  return {
    request,
    issue_id: issueId,
    observation,
    ...(Object.hasOwn(value, 'host_reservation')
      ? { host_reservation: parseWorkflowSessionReservationData(value.host_reservation) }
      : {}),
    ...(Object.hasOwn(value, 'research_activation')
      ? { research_activation: parseResearchActivation(value.research_activation) }
      : {}),
    ...(Object.hasOwn(value, 'research_normalization')
      ? { research_normalization: validateObservedResearchRecordPlan(value.research_normalization) }
      : {}),
  };
}

function parseCompletedWave(value: unknown): MastraSessionLedgerState['completed'][number] {
  if (!exactKeys(value, ['step_id', 'items']) || !Array.isArray(value.items))
    throw new Error('Mastra completed wave shape is invalid');
  return {
    step_id: parseJsonString(value.step_id, 'Mastra completed wave step id'),
    items: value.items.map(parseLedgerItem),
  };
}

function parseLedgerItems(value: unknown): readonly MastraLedgerItem[] {
  if (!Array.isArray(value)) throw new Error('Mastra session ledger items are invalid');
  return value.map(parseLedgerItem);
}

function parseCompletedWaves(value: unknown): MastraSessionLedgerState['completed'] {
  if (!Array.isArray(value)) throw new Error('Mastra completed waves are invalid');
  return value.map(parseCompletedWave);
}

function parseStateFields(value: Record<string, unknown>): MastraSessionLedgerState {
  if (value.schema !== 'MastraSessionLedger/v1') throw new Error('Mastra session ledger schema is invalid');
  return {
    schema: 'MastraSessionLedger/v1',
    workspace_id: parseJsonString(value.workspace_id, 'Mastra session workspace id'),
    work_id: parseJsonString(value.work_id, 'Mastra session work id'),
    attempt: parsePositiveSafeInteger(value.attempt, 'Mastra session attempt'),
    run_id: parseJsonString(value.run_id, 'Mastra session run id'),
    step_id: parseStepId(value.step_id),
    items: parseLedgerItems(value.items),
    completed: parseCompletedWaves(value.completed),
    ...(Object.hasOwn(value, 'corrective_execution')
      ? { corrective_execution: parseCorrectiveExecution(value.corrective_execution) }
      : {}),
    ...(Object.hasOwn(value, 'source_scope') ? { source_scope: parseSourceScope(value.source_scope) } : {}),
    ...(Object.hasOwn(value, 'research_wave_exposure')
      ? { research_wave_exposure: parseExposure(value.research_wave_exposure) }
      : {}),
  };
}

function deepFreezeClone<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreezeClone)) as T;
  if (!isPlainRecord(value)) return value;
  const clone = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(value)) clone[key] = deepFreezeClone(value[key]);
  return Object.freeze(clone) as T;
}

/** Parse a persisted Mastra journal as immutable data. This grants no Host rights. */
export function parseMastraSessionLedgerState(value: unknown): MastraSessionLedgerState {
  assertCanonicalJsonValue(value, '$.mastra_session_ledger');
  if (!exactKeys(value, stateRequiredKeys, stateOptionalKeys))
    throw new Error('Mastra session ledger state shape is invalid');
  return deepFreezeClone(parseStateFields(value));
}
