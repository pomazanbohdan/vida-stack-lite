import { afterEach, expect, mock, spyOn, test as baseTest } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReconcileArtifacts as executeReconcileArtifacts } from '../bin/reconcile-artifacts.ts';
import { boundedSpawnSync, executionBudget, commandOutcomeUnknown, requireTerminalCommand } from '../bin/bun.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  validateResearchSynthesis,
  type ActivationUse,
  type ObservedActivationUseWritePlan,
  type ObservedResearchRecordPlan,
  type ResearchSynthesisConflict,
} from '../src/research-decision.ts';
import {
  HostStateStore,
  openHostStateDatabase,
  type WorkArtifactReference,
  type WorkState,
} from '../src/host-state.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../src/config/workspace-database-raw.ts';
import { validateCoordinationLedgerV1, type CoordinationLedger } from '../src/contracts/envelopes.ts';
import { expectAsyncReturned } from './helpers/expect-rejection.ts';
import {
  observationSchema,
  requestSchema,
  type SessionBridgeObservation,
  type SessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
import type { MastraLedgerItem, MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import { configuredTestContext } from './configured-context.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(bundle, '../..');
const timestamp = new Date(Date.now() - 60_000).toISOString();
const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string): string => createHash('sha256').update(value).digest('hex');
const sealed = <T extends Record<string, unknown>>(body: T): T & { digest: string } => ({
  ...body,
  digest: canonicalJsonDigest(body),
});
const roots: string[] = [];
const originalFsExports = { ...fs };
const databases: Database[] = [];
const phaseBudget = executionBudget(undefined, 1_000);
type PhaseBudget = ReturnType<typeof phaseBudget.child>;
type ReconcileOptions = Parameters<typeof executeReconcileArtifacts>[1];
let repairOutcomeUnknown = false;
let caseName: string | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
}

function expectStringArray(actual: unknown, expected: readonly string[]): void {
  if (!isStringArray(actual)) throw new Error('expected a string array');
  expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
}

function parseRecord(bytes: string, description: string): Record<string, unknown> {
  const value: unknown = JSON.parse(bytes);
  if (!isRecord(value)) throw new Error(`${description} must be a JSON object`);
  return value;
}

function recordField(value: unknown, key: string, description: string): Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value[key])) throw new Error(`${description}.${key} must be an object`);
  return value[key];
}

function valueField(value: unknown, key: string, description: string): unknown {
  if (!isRecord(value) || !(key in value)) throw new Error(`${description}.${key} is missing`);
  return value[key];
}

function stringField(value: unknown, key: string, description: string): string {
  if (!isRecord(value) || typeof value[key] !== 'string') throw new Error(`${description}.${key} must be a string`);
  return value[key];
}

function numberField(value: unknown, key: string, description: string): number {
  if (!isRecord(value) || typeof value[key] !== 'number' || !Number.isSafeInteger(value[key]))
    throw new Error(`${description}.${key} must be a safe integer`);
  return value[key];
}

function sqlRow(database: Database, query: string, description: string): Record<string, unknown> {
  const value: unknown = database.query(query).get();
  if (!isRecord(value)) throw new Error(`${description} row is missing or malformed`);
  return value;
}

function maintenanceStatus(store: HostStateStore): string {
  const fence = store.readMaintenanceFence();
  if (!fence) throw new Error('maintenance fence row is missing');
  return fence.status;
}

function childStderr(value: unknown): string {
  if (!isRecord(value)) throw new Error('child result is missing');
  if (typeof value.stderr === 'string') return value.stderr;
  if (Buffer.isBuffer(value.stderr)) return value.stderr.toString('utf8');
  throw new Error('child stderr is missing or malformed');
}

function arrayField(value: unknown, key: string, description: string): unknown[] {
  if (!isRecord(value) || !Array.isArray(value[key])) throw new Error(`${description}.${key} must be an array`);
  return value[key];
}

function arrayItem(value: unknown, index: number, description: string): unknown {
  if (!Array.isArray(value)) throw new Error(`${description} must be an array`);
  const item: unknown = value[index];
  if (item === undefined) throw new Error(`${description} item ${index} is missing`);
  return item;
}

function arrayRecord(value: unknown, index: number, description: string): Record<string, unknown> {
  const item = arrayItem(value, index, description);
  if (!isRecord(item)) throw new Error(`${description} item ${index} must be an object`);
  return item;
}

function firstItem<T>(values: readonly T[], description: string): T {
  const value = values[0];
  if (value === undefined) throw new Error(`${description} is empty`);
  return value;
}

interface ResearchPlan {
  changes: { new_source_id: string; after: string; before: string; path: string }[];
}

interface ObservationWithDigest extends Record<string, unknown> {
  readonly summary: string;
  readonly output_digest: string;
}

interface SynthesisPlanTarget {
  after_record: string;
  after_observation: ObservationWithDigest & { issue_id: string; evidence_refs: string[] };
  path: string;
  before_sha256: string;
  after_sha256: string;
  before_record: string;
  work_row: { payload: string };
  journal_row: { payload: string };
}

interface SynthesisPlan {
  readonly [key: string]: unknown;
  targets: SynthesisPlanTarget[];
  changelog_after: string;
  changelog_before: string;
}

interface ObservationCorrectionPlan {
  original_item: { observation: ObservationWithDigest };
  predecessor_refs: { result_id: string; digest: string }[];
  project_ids: string[];
}

function checkedObservation(value: unknown, description: string): ObservationWithDigest {
  if (!isRecord(value) || typeof value.summary !== 'string' || typeof value.output_digest !== 'string')
    throw new Error(`${description} summary or output digest is missing`);
  expect(value.output_digest).toBe(canonicalJsonDigest(value.summary));
  return { ...value, summary: value.summary, output_digest: value.output_digest };
}

function researchPlan(value: unknown): ResearchPlan {
  if (!isRecord(value) || !Array.isArray(value.changes)) throw new Error('research repair plan shape invalid');
  const rawChanges: unknown[] = value.changes;
  const changes = rawChanges.map((change) => {
    if (
      !isRecord(change) ||
      typeof change.new_source_id !== 'string' ||
      typeof change.after !== 'string' ||
      typeof change.before !== 'string' ||
      typeof change.path !== 'string'
    )
      throw new Error('research repair change shape invalid');
    return {
      new_source_id: change.new_source_id,
      after: change.after,
      before: change.before,
      path: change.path,
    };
  });
  return { changes };
}

function synthesisPlan(value: unknown): SynthesisPlan {
  if (!isRecord(value) || !Array.isArray(value.targets)) throw new Error('synthesis repair plan shape invalid');
  const rawTargets: unknown[] = value.targets;
  const targets = rawTargets.map((target): SynthesisPlanTarget => {
    if (!isRecord(target)) throw new Error('synthesis repair target shape invalid');
    const observation = checkedObservation(target.after_observation, 'synthesis repair observation');
    const evidenceRefs = observation.evidence_refs;
    const workRow = target.work_row;
    const journalRow = target.journal_row;
    if (
      typeof target.after_record !== 'string' ||
      typeof target.path !== 'string' ||
      typeof target.before_sha256 !== 'string' ||
      typeof target.after_sha256 !== 'string' ||
      typeof target.before_record !== 'string' ||
      typeof observation.issue_id !== 'string' ||
      !isStringArray(evidenceRefs) ||
      !isRecord(workRow) ||
      typeof workRow.payload !== 'string' ||
      !isRecord(journalRow) ||
      typeof journalRow.payload !== 'string'
    )
      throw new Error('synthesis repair target shape invalid');
    return {
      after_record: target.after_record,
      after_observation: {
        ...observation,
        issue_id: observation.issue_id,
        summary: observation.summary,
        output_digest: observation.output_digest,
        evidence_refs: evidenceRefs,
      },
      path: target.path,
      before_sha256: target.before_sha256,
      after_sha256: target.after_sha256,
      before_record: target.before_record,
      work_row: { payload: workRow.payload },
      journal_row: { payload: journalRow.payload },
    };
  });
  if (typeof value.changelog_after !== 'string' || typeof value.changelog_before !== 'string')
    throw new Error('synthesis repair changelog shape invalid');
  return { targets, changelog_after: value.changelog_after, changelog_before: value.changelog_before };
}

function observationCorrectionPlan(value: unknown): ObservationCorrectionPlan {
  if (
    !isRecord(value) ||
    !isRecord(value.original_item) ||
    !Array.isArray(value.predecessor_refs) ||
    !isStringArray(value.project_ids)
  )
    throw new Error('synthesis observation correction plan shape invalid');
  const originalObservation = checkedObservation(
    value.original_item.observation,
    'synthesis observation correction original observation',
  );
  const rawPredecessorRefs: unknown[] = value.predecessor_refs;
  const predecessorRefs = rawPredecessorRefs.map((entry) => {
    if (!isRecord(entry) || typeof entry.result_id !== 'string' || typeof entry.digest !== 'string')
      throw new Error('synthesis observation predecessor shape invalid');
    return { result_id: entry.result_id, digest: entry.digest };
  });
  return {
    original_item: { observation: originalObservation },
    predecessor_refs: predecessorRefs,
    project_ids: value.project_ids,
  };
}

function parseRecords(bytes: string, description: string): Record<string, unknown>[] {
  return bytes
    .trim()
    .split('\n')
    .map((line) => parseRecord(line, description));
}
function report(stage: string, started: number, detail: Record<string, unknown> = {}): void {
  process.stderr.write(
    JSON.stringify({ stage, case: caseName, elapsed_ms: performance.now() - started, ...detail }) + '\n',
  );
}
function test(name: string, execute: (budget: PhaseBudget) => Promise<void>): void {
  return baseTest(
    name,
    async () => {
      if (repairOutcomeUnknown) throw Error('Prior repair child outcome prevents fixture reuse.');
      caseName = name;
      const started = performance.now();
      try {
        return await execute(phaseBudget.child(5_000, 250));
      } finally {
        report('repair case', started, { outcome_unknown: repairOutcomeUnknown });
      }
    },
    5_000,
  );
}
async function runReconcileArtifacts(args: string[], options?: ReconcileOptions) {
  const started = performance.now();
  try {
    const result: unknown = await executeReconcileArtifacts(args, options);
    if (!isRecord(result)) throw new Error('repair CLI result must be an object');
    return result;
  } finally {
    report('repair operation', started, {
      kind: args.includes('--kind') ? args[args.indexOf('--kind') + 1] : 'research-identity',
      mode: args[args.indexOf('--mode') + 1],
    });
  }
}

type RepairFileOwner = 'plan' | 'lock' | 'journal' | 'pending';
type Fault = { readonly value: unknown };
interface RepairFilesystemFaults {
  readonly owner: RepairFileOwner;
  readonly openCollision?: string;
  readonly afterRename?: string;
  readonly lstat?: Fault;
  readonly write?: Fault;
  readonly fsync?: Fault;
  readonly close?: Fault;
  readonly unlink?: Fault;
}

function fileOwner(file: string, root: string): RepairFileOwner | null {
  const absolute = path.resolve(file);
  if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) return null;
  const name = path.basename(absolute);
  if (name === 'repair-plan.v1.json') return 'plan';
  if (name === 'repair-lock.v1.json') return 'lock';
  if (name === 'repair-journal.v1.jsonl') return 'journal';
  if (name.includes('.pending-')) return 'pending';
  return null;
}

async function injectRepairFilesystemFaults(
  root: string,
  faults: RepairFilesystemFaults,
): Promise<{
  readonly events: string[];
  restore(): Promise<void>;
}> {
  const descriptors = new Map<number, string>();
  const events: string[] = [];
  let renameInjected = false;
  const replacement = {
    ...originalFsExports,
    lstatSync: ((...args: Parameters<typeof fs.lstatSync>) => {
      if (fileOwner(String(args[0]), root) === faults.owner && faults.lstat) {
        events.push('lstat');
        throw faults.lstat.value;
      }
      return Reflect.apply(originalFsExports.lstatSync, originalFsExports, args) as ReturnType<typeof fs.lstatSync>;
    }) as typeof fs.lstatSync,
    openSync: ((...args: Parameters<typeof fs.openSync>) => {
      if (fileOwner(String(args[0]), root) === faults.owner && faults.openCollision !== undefined) {
        originalFsExports.writeFileSync(args[0], faults.openCollision, { flag: 'wx' });
        events.push('open-collision');
      }
      const fd = Reflect.apply(originalFsExports.openSync, originalFsExports, args) as number;
      if (fileOwner(String(args[0]), root) !== null) descriptors.set(fd, String(args[0]));
      return fd;
    }) as typeof fs.openSync,
    writeFileSync: ((...args: Parameters<typeof fs.writeFileSync>) => {
      const target = typeof args[0] === 'number' ? descriptors.get(args[0]) : undefined;
      if (target && fileOwner(target, root) === faults.owner && faults.write) {
        events.push('write');
        throw faults.write.value;
      }
      return Reflect.apply(originalFsExports.writeFileSync, originalFsExports, args) as void;
    }) as typeof fs.writeFileSync,
    fsyncSync: ((...args: Parameters<typeof fs.fsyncSync>) => {
      const target = descriptors.get(args[0]);
      if (target && fileOwner(target, root) === faults.owner && faults.fsync) {
        events.push('fsync');
        throw faults.fsync.value;
      }
      return Reflect.apply(originalFsExports.fsyncSync, originalFsExports, args) as void;
    }) as typeof fs.fsyncSync,
    closeSync: ((...args: Parameters<typeof fs.closeSync>) => {
      const target = descriptors.get(args[0]);
      const owner = target ? fileOwner(target, root) : null;
      Reflect.apply(originalFsExports.closeSync, originalFsExports, args);
      descriptors.delete(args[0]);
      if (owner === faults.owner && faults.close) {
        events.push('close');
        throw faults.close.value;
      }
    }) as typeof fs.closeSync,
    unlinkSync: ((...args: Parameters<typeof fs.unlinkSync>) => {
      if (fileOwner(String(args[0]), root) === faults.owner && faults.unlink) {
        events.push('unlink');
        throw faults.unlink.value;
      }
      return Reflect.apply(originalFsExports.unlinkSync, originalFsExports, args) as void;
    }) as typeof fs.unlinkSync,
    renameSync: ((...args: Parameters<typeof fs.renameSync>) => {
      Reflect.apply(originalFsExports.renameSync, originalFsExports, args);
      if (!renameInjected && fileOwner(String(args[0]), root) === faults.owner && faults.afterRename !== undefined) {
        renameInjected = true;
        originalFsExports.writeFileSync(args[0], faults.afterRename, { flag: 'wx' });
        events.push('rename-then-foreign');
      }
    }) as typeof fs.renameSync,
  };
  await mock.module('node:fs', () => replacement);
  return {
    events,
    async restore() {
      await mock.module('node:fs', () => originalFsExports);
    },
  };
}

type RepairCallOutcome =
  | { readonly threw: false; readonly value: unknown }
  | { readonly threw: true; readonly error: unknown };

async function repairCallOutcome(call: () => Promise<unknown>): Promise<RepairCallOutcome> {
  try {
    return { threw: false, value: await call() };
  } catch (error) {
    return { threw: true, error };
  }
}

function flattenRepairErrors(error: unknown): unknown[] {
  if (!(error instanceof AggregateError) || !Array.isArray(error.errors)) return [error];
  const entries: unknown[] = error.errors;
  return entries.flatMap(flattenRepairErrors);
}

function expectRepairFailures(outcome: RepairCallOutcome, expected: readonly unknown[]): void {
  if (!outcome.threw) throw new Error('injected filesystem failure unexpectedly returned a result');
  const failures = flattenRepairErrors(outcome.error);
  expect(failures).toHaveLength(expected.length);
  expected.forEach((failure, index) => expect(failures[index]).toBe(failure));
}

function retainRepairFixture(root: string, reason: string): void {
  const index = roots.indexOf(root);
  if (index >= 0) roots.splice(index, 1);
  console.error(`repair fixture retained (${reason}): ${root}`);
}

afterEach(() => {
  const started = performance.now();
  if (repairOutcomeUnknown) {
    report('repair fixture retained', started, { roots: roots.length, databases: databases.length });
    return;
  }
  for (const database of databases.splice(0)) closeWorkspaceDatabaseWithAdmission(database);
  report('repair databases closed', started);
  const cleanup = performance.now();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  report('repair fixture cleanup', cleanup);
});

function fixture() {
  if (repairOutcomeUnknown) throw Error('Prior repair child outcome prevents fixture reuse.');
  const started = performance.now();
  const contextRoot = configuredTestContext().repositoryRoot;
  const root = mkdtempSync(path.join(tmpdir(), 'vida-repair-cli-'));
  roots.push(root);
  mkdirSync(path.join(root, '.git'));
  const copiedBundle = path.join(root, 'packages/agent');
  for (const relative of ['agent-runtime.config.v1.yaml', 'AGENTS.md', 'AGENT.sidecar.md'])
    writeFileSync(path.join(root, relative), readFileSync(path.join(contextRoot, relative)));
  cpSync(bundle, copiedBundle, {
    recursive: true,
    // Source repair runs physical JS/TS; native assets have their own qualification fixtures.
    filter: (entry) =>
      entry !== path.join(bundle, 'dist', 'standalone') &&
      !['node_modules', '.tmp', '.agent', 'coverage', '.pack-inspect'].includes(path.basename(entry)),
  });
  symlinkSync(path.join(bundle, 'node_modules'), path.join(copiedBundle, 'node_modules'), 'junction');
  cpSync(path.join(repository, 'packages/plugin'), path.join(root, 'packages/plugin'), { recursive: true });
  const documentationPolicy = 'docs/agent-instructions/documentation-policy.v1.json';
  mkdirSync(path.dirname(path.join(root, documentationPolicy)), { recursive: true });
  writeFileSync(path.join(root, documentationPolicy), readFileSync(path.join(contextRoot, documentationPolicy)));
  const config = loadRuntimeConfig(root);
  const records = config.research_decision.paths.research_records;
  const changelog = config.research_decision.paths.changelog;
  mkdirSync(path.join(root, records), { recursive: true });
  mkdirSync(path.dirname(path.join(root, changelog)), { recursive: true });
  writeFileSync(path.join(root, changelog), '\n');
  mkdirSync(path.join(root, '.agent/work'), { recursive: true });
  writeFileSync(
    path.join(root, '.agent/active-runtime-selector.v1.json'),
    json({
      schema: 'ActiveRuntimeSelector/v1',
      generation: 'test-setup',
      payload_manifest_sha256: 'a'.repeat(64),
    }),
  );
  const workspace = deriveWorkspaceId(config.repository.repository_id, root);
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['packages/agent/TESTING.md']);
  report('repair fresh fixture', started);
  return { root, config, records, changelog, workspace, source };
}

const activation = {
  use_id: 'use-repair',
  risk: 'medium',
  phase: 'trace',
  lane: 'researcher',
  trigger: 'research_intent',
  required_instruction_ids: [],
  instruction_ids: ['research-protocol'],
  registry_digest: 'b'.repeat(64),
  source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'c'.repeat(64) }],
} satisfies Pick<
  ActivationUse,
  | 'use_id'
  | 'risk'
  | 'phase'
  | 'lane'
  | 'trigger'
  | 'required_instruction_ids'
  | 'instruction_ids'
  | 'registry_digest'
  | 'source_digests'
>;
const completeness = {
  status: 'pass',
  required_questions: ['Which source?'],
  answered_questions: ['Which source?'],
  missing_questions: [],
  material_gaps: [],
  external_validation: {
    required: false,
    source_count: 0,
    minimum_sources: 0,
    status: 'not_required',
    live_check: null,
  },
};
function research(context: ReturnType<typeof fixture>, id: string, locator: string, workId = 'work-repair') {
  return sealed({
    schema: 'ResearchResult/v1',
    result_id: id,
    work_item_id: workId,
    source_revision: context.source.digest,
    scope_id: 'scope-repair',
    contour: 'scope-repair',
    topic: 'Source identity',
    objective: 'Resolve exact source provenance',
    question: 'Which source?',
    source_refs: [
      {
        source_id: 'shared',
        source_kind: 'internal',
        locator,
        title: 'Current source',
        version_or_date: '2026-09-30',
        claim: 'AC-1 SR-1 evidence.',
        retrieved_at: timestamp,
        independence_group: locator,
        digest: 'd'.repeat(64),
      },
      {
        source_id: 'related',
        source_kind: 'internal',
        // Keep the corroborating identity stable so the pair contains exactly one
        // source-ID provenance conflict: the intended `shared` identity above.
        locator: 'shared-related-source.md',
        title: 'Related source',
        version_or_date: '2026-09-30',
        claim: 'AC-1 SR-1 corroborating evidence.',
        retrieved_at: timestamp,
        independence_group: 'shared-related-source',
        digest: 'e'.repeat(64),
      },
    ],
    findings: [
      {
        finding_id: 'finding-1',
        statement: 'Current evidence.',
        source_ids: ['shared'],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts: [
      {
        conflict_id: 'conflict-1',
        statement: 'Sources require reconciliation.',
        source_ids: ['shared', 'related'],
        status: 'reconciled',
      },
    ],
    evidence_classes: ['Static'],
    br_ids: ['BR-1'],
    sr_ids: ['SR-1'],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      { option_id: 'option-1', label: 'Use source', description: 'Use scoped evidence.', evidence_refs: ['shared'] },
    ],
    recommendation: { option_id: 'option-1', rationale: 'Current evidence.', evidence_refs: ['shared'] },
    completeness,
    readiness: 'ready',
    instruction_activation: activation,
    actor: 'test-setup',
    pointer: 'TEST-SETUP',
    created_at: timestamp,
    updated_at: timestamp,
  });
}
function writeResearch(context: ReturnType<typeof fixture>, results: ReturnType<typeof research>[]): string[] {
  return results.map((result) => {
    const relative = `${context.records}/${result.result_id}.research.json`;
    writeFileSync(path.join(context.root, relative), json(result));
    return relative;
  });
}
const planning = (context: ReturnType<typeof fixture>, mode: string, extra: string[] = []): string[] => [
  '--mode',
  mode,
  '--project-root',
  context.root,
  '--repair-id',
  'repair-test',
  '--actor',
  'test-setup',
  '--timestamp',
  timestamp,
  ...extra,
];

test('research identity dispatcher plans exact rewrites and rejects dependencies without overwriting records', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  const inspected = await runReconcileArtifacts(planning(context, 'inspect', ['--records', recordsFile]));
  expect(inspected.status).toBe('repairable_current_v1');
  expect(valueField(inspected, 'changed_paths', 'repair CLI result')).toEqual(paths);
  expect(valueField(inspected, 'historical_observations_changed', 'repair CLI result')).toBe(false);
  expect(await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]))).toMatchObject({
    status: 'planned',
  });
  const plan = researchPlan(
    parseRecord(
      readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'),
      'research repair plan',
    ),
  );
  const newIds = plan.changes.map((change) => change.new_source_id);
  expect(new Set(newIds).size).toBe(2);
  for (const change of plan.changes) {
    const transformed = parseRecord(change.after, 'transformed research result');
    expect(
      stringField(
        arrayRecord(arrayField(transformed, 'source_refs', 'research result'), 0, 'source refs'),
        'source_id',
        'source ref',
      ),
    ).toBe(change.new_source_id);
    expect(
      valueField(
        arrayRecord(arrayField(transformed, 'findings', 'research result'), 0, 'findings'),
        'source_ids',
        'finding',
      ),
    ).toEqual([change.new_source_id]);
    expect(
      valueField(
        arrayRecord(arrayField(transformed, 'options', 'research result'), 0, 'options'),
        'evidence_refs',
        'option',
      ),
    ).toEqual([change.new_source_id]);
    expect(
      valueField(
        arrayRecord(arrayField(transformed, 'conflicts', 'research result'), 0, 'conflicts'),
        'source_ids',
        'conflict',
      ),
    ).toEqual([change.new_source_id, 'related']);
    expect(recordField(transformed, 'recommendation', 'research result').evidence_refs).toEqual([change.new_source_id]);
  }
  const before = paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'));
  const dependent = synthesis(context, results);
  writeFileSync(path.join(context.root, `${context.records}/dependent.synthesis.json`), json(dependent));
  await Promise.resolve(
    expect(runReconcileArtifacts(planning(context, 'inspect', ['--records', recordsFile]))).rejects.toThrow(
      'dependent synthesis',
    ),
  );
  expect(paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(before);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('research identity default CLI reports malformed parser inputs through public errors', async () => {
  const root = path.resolve(tmpdir());
  const missingValue = executeReconcileArtifacts(['--mode']);
  await Promise.resolve(expect(missingValue).rejects.toThrow('invalid arguments'));

  const unknownOption = executeReconcileArtifacts(['--unknown', 'value']);
  await Promise.resolve(expect(unknownOption).rejects.toThrow('invalid arguments'));

  const duplicateOption = executeReconcileArtifacts(['--mode', 'inspect', '--mode', 'plan']);
  await Promise.resolve(expect(duplicateOption).rejects.toThrow('invalid arguments'));

  const missingMode = executeReconcileArtifacts(['--project-root', root, '--repair-id', 'repair-test']);
  await Promise.resolve(expect(missingMode).rejects.toThrow('mode, root or repair id invalid'));

  const invalidRepairId = executeReconcileArtifacts([
    '--mode',
    'inspect',
    '--project-root',
    root,
    '--repair-id',
    'BAD',
    '--actor',
    'test',
    '--timestamp',
    timestamp,
    '--records',
    path.join(root, 'records.json'),
  ]);
  await Promise.resolve(expect(invalidRepairId).rejects.toThrow('mode, root or repair id invalid'));

  const relativeRoot = executeReconcileArtifacts([
    '--mode',
    'inspect',
    '--project-root',
    'relative-root',
    '--repair-id',
    'repair-test',
    '--actor',
    'test',
    '--timestamp',
    timestamp,
    '--records',
    path.join(root, 'records.json'),
  ]);
  await Promise.resolve(expect(relativeRoot).rejects.toThrow('mode, root or repair id invalid'));
});

for (const missingOption of ['--project-root', '--repair-id'] as const) {
  test(`research identity repair rejects missing ${missingOption} before project effects`, async () => {
    const root = path.join(tmpdir(), `artifact-repair-missing-option-${randomUUID()}`);
    const args = [
      '--mode',
      'inspect',
      ...(missingOption === '--project-root' ? [] : ['--project-root', root]),
      ...(missingOption === '--repair-id' ? [] : ['--repair-id', 'repair-test']),
    ];
    expect(fs.existsSync(root)).toBe(false);
    await expectRejection(executeReconcileArtifacts(args), 'vida repair artifacts: mode, root or repair id invalid');
    expect(fs.existsSync(root)).toBe(false);
  });
}

for (const cutoffPresent of [false, true]) {
  test(`public repair CLI blocks restore without effects (cutoff present: ${cutoffPresent})`, async (budget: PhaseBudget) => {
    const context = fixture();
    const selectorPath = path.join(context.root, '.agent/active-runtime-selector.v1.json');
    const selectorBefore = readFileSync(selectorPath);
    const cutoffPath = path.join(context.root, '.agent/cutover/test-setup/cutoff-witness.json');
    if (cutoffPresent) {
      mkdirSync(path.dirname(cutoffPath), { recursive: true });
      // Presence alone denies restore; these bytes grant no cutoff authority.
      writeFileSync(cutoffPath, 'untrusted cutoff marker\n');
    }
    const cutoffBefore = cutoffPresent ? readFileSync(cutoffPath) : undefined;
    const repairRoot = path.join(context.root, '.agent/work/repair-test');
    const databasePath = path.resolve(context.root, sessionHandoffDatabaseRelativePath(context.config));
    const restoreArgs = ['--mode', 'restore', '--project-root', context.root, '--repair-id', 'repair-test'];
    const expectedMessage = cutoffPresent
      ? 'vida repair artifacts: restore is forbidden after the first-work cutoff; resume forward'
      : 'vida reconcile artifacts: pre-cutoff restore requires a separately bound undo plan';
    await expectRejection(runReconcileArtifacts(restoreArgs), expectedMessage);
    const child = boundedSpawnSync(
      spawnSync,
      process.execPath,
      [path.join(bundle, 'bin/reconcile-artifacts.ts'), ...restoreArgs],
      { cwd: bundle, encoding: 'utf8', windowsHide: true, timeout: 15_000, budget, diagnostics: true },
      'research repair restore guard',
    );
    if (commandOutcomeUnknown(child)) repairOutcomeUnknown = true;
    requireTerminalCommand(child, 'research repair restore guard');
    expect(child.status).toBe(1);
    const terminalResult = parseRecord(childStderr(child), 'research repair restore terminal result');
    expect(stringField(terminalResult, 'status', 'research repair restore terminal result')).toBe('blocked');
    expect(stringField(terminalResult, 'message', 'research repair restore terminal result')).toBe(expectedMessage);
    expect(readFileSync(selectorPath)).toEqual(selectorBefore);
    expect(fs.existsSync(repairRoot)).toBe(false);
    expect(fs.existsSync(databasePath)).toBe(false);
    if (cutoffBefore !== undefined) expect(readFileSync(cutoffPath)).toEqual(cutoffBefore);
    else expect(fs.existsSync(cutoffPath)).toBe(false);
  });
}

for (const [kind, diagnostic, extra] of [
  ['project-upgrade', 'project upgrade options differ from declaration', []],
  ['native-delivery-evidence', 'native evidence repair arguments differ from declaration', []],
  [
    'delivered-work-continuation',
    'vida repair delivered-work-continuation: mode, project root or repair id invalid',
    [],
  ],
  ['release-retarget', 'retarget arguments differ from declaration', []],
  ['release-preparation', 'release preparation options differ from declaration', []],
  ['work-state', 'vida work-state repair: kind, mode or absolute project root missing', []],
  [
    'documentation-policy',
    'documentation policy transition: CLI contract or mode is absent',
    [
      '--repair-id',
      'repair-test',
      '--work-id',
      'work-test',
      '--repository',
      'repository-test',
      '--project',
      'project-test',
    ],
  ],
  ['runtime-config', 'vida runtime-config rebind: mode, root, identity or argument set invalid', []],
  ['runtime-code', 'vida runtime-code rebind: kind, mode, root or repair ID invalid', []],
] as const) {
  test(`artifact dispatcher routes ${kind} invalid mode to its owner before project effects`, async () => {
    const root = path.join(tmpdir(), `artifact-dispatch-no-effect-${randomUUID()}`);
    expect(fs.existsSync(root)).toBe(false);
    await Promise.resolve(
      expect(
        executeReconcileArtifacts(['--kind', kind, '--mode', 'invalid', '--project-root', root, ...extra]),
      ).rejects.toThrow(diagnostic),
    );
    expect(fs.existsSync(root)).toBe(false);
  });
}

test('research identity dispatcher fails closed on third-party post-plan bytes', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const firstPath = firstItem(paths, 'research result paths');
  const secondPath = paths[1];
  if (!secondPath) throw new Error('second research result path is missing');
  const beforeSecond = readFileSync(path.join(context.root, secondPath), 'utf8');
  writeFileSync(path.join(context.root, firstPath), 'third-party bytes\n');
  await Promise.resolve(
    expect(
      runReconcileArtifacts(['--mode', 'apply', '--project-root', context.root, '--repair-id', 'repair-test']),
    ).rejects.toThrow('third-party bytes'),
  );
  expect(readFileSync(path.join(context.root, firstPath), 'utf8')).toBe('third-party bytes\n');
  expect(readFileSync(path.join(context.root, secondPath), 'utf8')).toBe(beforeSecond);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('research identity dispatcher publishes both transformed records and exactly two lineage events', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const plan = researchPlan(
    parseRecord(
      readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'),
      'research repair plan',
    ),
  );
  const result = await runReconcileArtifacts([
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ]);
  expect(result.status).toBe('complete');
  for (const change of plan.changes) {
    expect(readFileSync(path.join(context.root, change.path), 'utf8')).toBe(change.after);
    const transformed = parseRecord(change.after, 'transformed research result');
    expect(
      valueField(
        arrayRecord(arrayField(transformed, 'findings', 'research result'), 0, 'findings'),
        'source_ids',
        'finding',
      ),
    ).toEqual([change.new_source_id]);
  }
  const events = parseRecords(readFileSync(path.join(context.root, context.changelog), 'utf8'), 'lineage event');
  expect(events.map((event) => event.document_id)).toEqual(results.map((record) => record.result_id));
  expect(events.every((event) => event.schema === 'DocumentationChangeEvent/v1')).toBe(true);
});

function synthesis(
  context: ReturnType<typeof fixture>,
  results: ReturnType<typeof research>[],
  workId = 'work-repair',
  bundleId = 'synthesis-test',
  conflicts: readonly ResearchSynthesisConflict[] = [],
) {
  return sealed({
    schema: 'ResearchSynthesis/v1',
    bundle_id: bundleId,
    work_item_id: workId,
    source_revision: context.source.digest,
    scope_id: 'scope-repair',
    topic: 'Source provenance',
    result_refs: results.map(({ result_id, digest }) => ({ result_id, digest })),
    findings: [
      {
        finding_id: 'finding-1',
        statement: 'Current evidence.',
        source_refs: ['shared'],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts,
    br_ids: ['BR-1'],
    sr_ids: ['SR-1'],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      { option_id: 'option-1', label: 'Use source', description: 'Use current source.', evidence_refs: ['shared'] },
    ],
    recommendation: { option_id: 'option-1', rationale: 'Current source.', evidence_refs: ['shared'] },
    completeness,
    readiness: 'ready',
    instruction_activation: activation,
    actor: 'test-setup',
    pointer: 'TEST-SETUP',
    created_at: timestamp,
    updated_at: timestamp,
  });
}

function insert(
  database: Database,
  table: string,
  columns: readonly string[],
  values: readonly (string | number | bigint | boolean | null | Uint8Array)[],
): void {
  database
    .query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`)
    .run(...values);
}
function persisted(
  context: ReturnType<typeof fixture>,
  results: ReturnType<typeof research>[],
  record: ReturnType<typeof synthesis> | null,
  normalized = true,
  projectIds: readonly string[] = ['agent'],
) {
  const database = openHostStateDatabase(
    context.root,
    sessionHandoffDatabaseRelativePath(context.config),
    context.workspace,
  );
  databases.push(database);
  new HostStateStore(database, context.workspace);
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT, work_id TEXT, attempt INTEGER, revision INTEGER, payload TEXT, digest TEXT, PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const project = loadProjectSetContext(
    context.root,
    context.config,
    context.config.repository.repository_id,
    projectIds,
  );
  const binding = {
    repository_id: project.repository_id,
    project_ids: [...projectIds],
    integrations_digest: project.integrations_digest,
    lifecycle_work_id: 'work-repair',
    work_source_revision: context.source.digest,
    scope_id: 'scope-repair',
    ac_ids: ['AC-1'],
    config_digest: runtimeConfigDigest(context.config),
    team_id: 'default-development',
    workflow_id: 'implementation_change',
    provider_work_item_id: 'work-repair',
    work_item_digest: '1'.repeat(64),
    scope_contract_digest: '2'.repeat(64),
    acceptance_manifest_digest: '3'.repeat(64),
    implementation_paths: ['packages/agent/TESTING.md'],
    allowed_resources: ['file:packages/agent/TESTING.md'],
    runtime_source_revision: 'test-setup',
    schema_digest: '4'.repeat(64),
    runtime_code_digest: '5'.repeat(64),
  } satisfies WorkState['binding'];
  const identityKey = JSON.stringify([
    binding.repository_id,
    projectIds,
    binding.integrations_digest,
    binding.lifecycle_work_id,
  ]);
  const pathToRecord = `${context.records}/synthesis-test.synthesis.json`;
  if (record) validateResearchSynthesis(record);
  const observationSummary = record
    ? JSON.stringify(record)
    : JSON.stringify({ schema: 'VidaSynthesisObservationOutput/v1' });
  const observation = observationSchema.parse({
    schema: 'VidaSessionObservation/v1',
    action_id: 'e'.repeat(64),
    issue_id: randomUUID(),
    agent_id: 'test-setup',
    tool_call_ref: 'TEST-SETUP',
    status: 'reported_complete',
    summary: observationSummary,
    output_digest: canonicalJsonDigest(observationSummary),
    evidence_refs: ['shared'],
  });
  const workflowId = 'implementation_change';
  const workflow = context.config.workflows[workflowId];
  if (!workflow) throw new Error('synthesis fixture workflow is missing');
  const stage = workflow.stages.find((entry) => entry.kind === 'synthesize');
  if (!stage) throw new Error('synthesis fixture stage is missing');
  const synthesisAssignment = firstItem(stage.assignments, 'synthesis assignments');
  const item: {
    request: SessionBridgeRequest;
    issue_id: string;
    observation: SessionBridgeObservation;
    research_activation?: NonNullable<MastraLedgerItem['research_activation']>;
    research_normalization?: NonNullable<MastraLedgerItem['research_normalization']>;
  } = {
    request: requestSchema.parse({
      schema: 'VidaSessionRequest/v1',
      action_id: observation.action_id,
      workflow_id: workflowId,
      stage_id: stage.id,
      wave_index: 0,
      assignment_index: 0,
      role: synthesisAssignment.role,
      run_id: 'run-repair',
      config_digest: binding.config_digest,
      scope_digest: context.source.digest,
      bindings_manifest_ref: '7'.repeat(64),
    }),
    issue_id: observation.issue_id,
    observation,
  };
  const artifacts: WorkArtifactReference[] = [];
  const work: WorkState = {
    schema: 'WorkState/v1',
    workspace_id: context.workspace,
    revision: 1,
    binding,
    lease: null,
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
      acceptance: {
        schema: 'AcceptanceManifest/v1',
        path: '.agent/acceptance.json',
        sha256: binding.acceptance_manifest_digest,
      },
      decisions: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      phase: 'INTAKE',
      revision: 1,
      source_revision: binding.work_source_revision,
      next_action: 'Test scoped repair',
      route: 'R3',
      risk: 'medium',
      change_kind: 'migration',
      config_binding: {
        config_digest: binding.config_digest,
        schema_digest: binding.schema_digest,
        runtime_code_digest: binding.runtime_code_digest,
      },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: binding.implementation_paths,
        fingerprint_paths: binding.implementation_paths,
        implementation_paths: binding.implementation_paths,
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'epoch-test',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
    execution: {
      run_id: 'run-repair',
      input_digest: '6'.repeat(64),
      phase: 'implementation',
      status: 'suspended',
      assignment_attempts: [],
    },
    artifacts,
  };
  const completed: MastraSessionLedgerState['completed'][number][] = [];
  const state: MastraSessionLedgerState = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: context.workspace,
    work_id: 'work-repair',
    attempt: 1,
    run_id: 'run-repair',
    step_id: 'step-synthesis',
    source_scope: context.source,
    items: [item],
    completed,
  };
  const observedBinding = (actionId: string, issueId: string) => ({
    work_id: state.work_id,
    attempt: state.attempt,
    run_id: state.run_id,
    action_id: actionId,
    issue_id: issueId,
    scope_id: binding.scope_id,
    scope_digest: context.source.digest,
    source_revision: binding.work_source_revision,
    source_scope_digest: context.source.digest,
    config_digest: binding.config_digest,
    maintenance_generation: 0,
    lease_ticket_id: 'ticket-test',
    lease_thread_id: 'thread-test',
    lease_generation: 1,
  });
  const activated = (request: {
    action_id: string;
    issue_id: string;
  }): NonNullable<typeof item.research_activation> => {
    const use = sealed({
      schema: 'InstructionActivationUse/v1',
      ...activation,
      work_item_id: state.work_id,
      source_revision: binding.work_source_revision,
      scope_id: binding.scope_id,
      cache_status: 'cold',
      actor: 'test-setup',
      pointer: 'TEST-SETUP',
      timestamp,
    } satisfies Omit<ActivationUse, 'digest'>);
    const plan = sealed({
      schema: 'ObservedActivationUseWritePlan/v1',
      binding: observedBinding(request.action_id, request.issue_id),
      use_digest: use.digest,
      history_path: '.agent/work/work-repair/instruction-activation-history.jsonl',
      history_pre_sha256: null,
      history_sha256: sha(canonicalJson(use) + '\n'),
    } satisfies Omit<ObservedActivationUseWritePlan, 'digest'>);
    return {
      use,
      plan,
    };
  };
  item.research_activation = activated({ action_id: item.request.action_id, issue_id: item.issue_id });
  const normalizedPlan = (
    recordPath: string,
    recordSha: string,
    result: ReturnType<typeof research> | ReturnType<typeof synthesis>,
    observed: { action_id: string; issue_id: string },
  ): ObservedResearchRecordPlan => {
    const plan: Omit<ObservedResearchRecordPlan, 'digest'> = {
      schema:
        result.schema === 'ResearchResult/v1' ? 'ObservedResearchRecordPlan/v1' : 'ObservedSynthesisRecordPlan/v1',
      binding: observedBinding(observed.action_id, observed.issue_id),
      observation_digest: canonicalJsonDigest(observed),
      result_digest: result.digest,
      record_path: recordPath,
      record_pre_sha256: null,
      record_sha256: recordSha,
      changelog_path: context.changelog,
      changelog_pre_sha256: null,
      changelog_sha256: sha('\n'),
      before_digest: null,
    };
    return sealed(plan);
  };
  const releasedTicketId = 'ticket-test-released';
  const releasedClaimId = 'claim-test-released';
  const releasedResources = ['execution:work-repair'];
  const coordinationLedger: CoordinationLedger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: context.workspace,
    revision: normalized ? 1 : 2,
    open_generation: 1,
    next_sequence: normalized ? 1 : 2,
    tickets: normalized
      ? []
      : [
          {
            schema: 'CoordinationTicket/v1',
            ticket_id: releasedTicketId,
            repository_id: binding.repository_id,
            project_ids: binding.project_ids,
            integrations_digest: binding.integrations_digest,
            work_id: binding.lifecycle_work_id,
            thread_id: 'thread-test',
            source_revision: binding.work_source_revision,
            generation: 1,
            sequence: 1,
            contour_keys: releasedResources,
            exclusive_resources: releasedResources,
            status: 'released',
            claim_ids: [releasedClaimId],
            expires_at: null,
            active_resources: [],
            blocked_resources: [],
            created_at: timestamp,
          },
        ],
    claims: normalized
      ? []
      : [
          {
            schema: 'WorkstreamClaim/v1',
            claim_id: releasedClaimId,
            ticket_id: releasedTicketId,
            work_id: binding.lifecycle_work_id,
            thread_id: 'thread-test',
            generation: 1,
            resources: releasedResources,
            lease_expires_at: timestamp,
            status: 'released',
            created_at: timestamp,
            renewed_at: timestamp,
          },
        ],
    operations: normalized
      ? []
      : [
          {
            schema: 'CoordinationOperation/v1',
            operation_id: 'operation-test-released',
            kind: 'release',
            ticket_id: releasedTicketId,
            work_id: binding.lifecycle_work_id,
            thread_id: 'thread-test',
            source_revision: binding.work_source_revision,
            resources: releasedResources,
            from_ledger_revision: 1,
            to_ledger_revision: 2,
            decided_by: 'thread-test',
            decision_pointer: 'TEST-SETUP-release',
            created_at: timestamp,
          },
        ],
    notices: [],
    dispositions: [],
    contours: [],
    batches: [],
    rebinds: [],
    retirements: [],
  };
  const checkedCoordinationLedger = validateCoordinationLedgerV1(coordinationLedger);
  if (!checkedCoordinationLedger.ok) throw new Error('repair fixture CoordinationLedger is invalid');
  writeResearch(context, results);
  if (record && normalized) {
    writeFileSync(path.join(context.root, pathToRecord), json(record));
    const recordSha = sha(json(record));
    item.research_normalization = normalizedPlan(pathToRecord, recordSha, record, observation);
    artifacts.push({
      schema: 'ResearchSynthesis/v1',
      artifact_id: record.bundle_id,
      stage_id: stage.id,
      path: pathToRecord,
      sha256: recordSha,
      source_revision: binding.work_source_revision,
      scope_id: binding.scope_id,
      ac_ids: binding.ac_ids,
    });
  }
  const researchStage = workflow.stages.find((entry) => entry.produces.includes('ResearchResult/v1'));
  if (!researchStage) throw new Error('research fixture stage is missing');
  const researchAssignment = firstItem(researchStage.assignments, 'research assignments');
  completed.push({
    step_id: researchStage.id,
    items: results.map((result, index) => {
      const recordPath = `${context.records}/${result.result_id}.research.json`;
      const recordSha = sha(json(result));
      const researchSummary = 'Completed research fixture observation.';
      const researchObservation = observationSchema.parse({
        schema: 'VidaSessionObservation/v1',
        action_id: String(index + 1).repeat(64),
        issue_id: randomUUID(),
        agent_id: 'test-setup',
        tool_call_ref: `TEST-SETUP-research-${index}`,
        status: 'reported_complete',
        summary: researchSummary,
        output_digest: canonicalJsonDigest(researchSummary),
        evidence_refs: ['shared'],
      });
      artifacts.push({
        schema: 'ResearchResult/v1',
        artifact_id: result.result_id,
        stage_id: researchStage.id,
        path: recordPath,
        sha256: recordSha,
        source_revision: binding.work_source_revision,
        scope_id: binding.scope_id,
        ac_ids: binding.ac_ids,
      });
      return {
        request: requestSchema.parse({
          schema: 'VidaSessionRequest/v1',
          action_id: researchObservation.action_id,
          run_id: state.run_id,
          workflow_id: workflowId,
          stage_id: researchStage.id,
          wave_index: 0,
          assignment_index: index,
          role: researchAssignment.role,
          scope_digest: context.source.digest,
          config_digest: binding.config_digest,
          bindings_manifest_ref: '7'.repeat(64),
        }),
        issue_id: researchObservation.issue_id,
        observation: researchObservation,
        research_activation: activated(researchObservation),
        research_normalization: normalizedPlan(recordPath, recordSha, result, researchObservation),
      };
    }),
  });
  const ledger: CoordinationLedger = coordinationLedger;
  const writeRows = () => {
    database.exec('DELETE FROM agent_host_state; DELETE FROM agent_host_mastra_session_ledger');
    const rows: readonly [string, string, number, unknown][] = [
      ['work', identityKey, work.revision, work],
      ['ledger', 'shared', ledger.revision, ledger],
    ];
    for (const [kind, id, revision, value] of rows)
      insert(
        database,
        'agent_host_state',
        ['workspace_id', 'kind', 'id', 'revision', 'payload', 'digest'],
        [context.workspace, kind, id, revision, canonicalJson(value), canonicalJsonDigest(value)],
      );
    insert(
      database,
      'agent_host_mastra_session_ledger',
      ['workspace_id', 'work_id', 'attempt', 'revision', 'payload', 'digest'],
      [context.workspace, 'work-repair', 1, 1, canonicalJson(state), canonicalJsonDigest(state)],
    );
  };
  writeRows();
  closeWorkspaceDatabaseWithAdmission(database);
  return { item, work, state, ledger, identityKey, pathToRecord };
}

function addSecondSynthesisRepairTarget(
  context: ReturnType<typeof fixture>,
  stored: ReturnType<typeof persisted>,
  results: ReturnType<typeof research>[],
  sourceRecord: ReturnType<typeof synthesis>,
): string {
  const workId = 'work-repair-2';
  writeResearch(context, results);
  const record = sourceRecord;
  const relativePath = `${context.records}/${record.bundle_id}.synthesis.json`;
  const recordBytes = json(record);
  writeFileSync(path.join(context.root, relativePath), recordBytes);
  const actionId = sha(`${workId}:${record.bundle_id}`);
  const issueId = randomUUID();
  const observation = observationSchema.parse({
    schema: 'VidaSessionObservation/v1',
    action_id: actionId,
    issue_id: issueId,
    agent_id: 'test-setup',
    tool_call_ref: 'TEST-SETUP-second-synthesis',
    status: 'reported_complete',
    summary: JSON.stringify(record),
    output_digest: canonicalJsonDigest(JSON.stringify(record)),
    evidence_refs: ['shared'],
  });
  const request = requestSchema.parse({
    ...stored.item.request,
    action_id: actionId,
    run_id: 'run-repair-2',
  });
  const normalization = sealed({
    schema: 'ObservedSynthesisRecordPlan/v1' as const,
    binding: {
      work_id: workId,
      attempt: 1,
      run_id: request.run_id,
      action_id: actionId,
      issue_id: issueId,
      scope_id: stored.work.binding.scope_id,
      scope_digest: context.source.digest,
      source_revision: stored.work.binding.work_source_revision,
      source_scope_digest: context.source.digest,
      config_digest: stored.work.binding.config_digest,
      maintenance_generation: 0,
      lease_ticket_id: 'ticket-test',
      lease_thread_id: 'thread-test',
      lease_generation: 1,
    },
    observation_digest: canonicalJsonDigest(observation),
    result_digest: record.digest,
    record_path: relativePath,
    record_pre_sha256: null,
    record_sha256: sha(recordBytes),
    changelog_path: context.changelog,
    changelog_pre_sha256: null,
    changelog_sha256: sha('\n'),
    before_digest: null,
  });
  const item: MastraLedgerItem = { request, issue_id: issueId, observation, research_normalization: normalization };
  const state: MastraSessionLedgerState = {
    ...stored.state,
    work_id: workId,
    run_id: request.run_id,
    items: [item],
    completed: [],
  };
  const artifact: WorkArtifactReference = {
    schema: 'ResearchSynthesis/v1',
    artifact_id: record.bundle_id,
    stage_id: request.stage_id,
    path: relativePath,
    sha256: sha(recordBytes),
    source_revision: context.source.digest,
    scope_id: stored.work.binding.scope_id,
    ac_ids: stored.work.binding.ac_ids,
  };
  const work: WorkState = {
    ...stored.work,
    binding: {
      ...stored.work.binding,
      lifecycle_work_id: workId,
      provider_work_item_id: workId,
      work_item_digest: sha(workId),
    },
    execution: { ...stored.work.execution, run_id: request.run_id },
    artifacts: [artifact],
  };
  const identityKey = JSON.stringify([
    work.binding.repository_id,
    work.binding.project_ids,
    work.binding.integrations_digest,
    workId,
  ]);
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  insert(
    database,
    'agent_host_state',
    ['workspace_id', 'kind', 'id', 'revision', 'payload', 'digest'],
    [context.workspace, 'work', identityKey, work.revision, canonicalJson(work), canonicalJsonDigest(work)],
  );
  insert(
    database,
    'agent_host_mastra_session_ledger',
    ['workspace_id', 'work_id', 'attempt', 'revision', 'payload', 'digest'],
    [context.workspace, workId, 1, 1, canonicalJson(state), canonicalJsonDigest(state)],
  );
  closeWorkspaceDatabaseWithAdmission(database);
  return relativePath;
}

test('synthesis qualification dispatcher freezes qualified observation and rejects active owners before any write', async () => {
  const context = fixture();
  const results = [
    research(context, 'research-a', 'same-source.md'),
    research(context, 'research-b', 'same-source.md'),
  ];
  const record = synthesis(context, results, 'work-repair', 'synthesis-test', [
    {
      conflict_id: 'conflict-1',
      statement: 'Current sources support a reconciled result.',
      source_refs: ['shared', 'related'],
      status: 'reconciled',
    },
  ]);
  const stored = persisted(context, results, record);
  const secondResults = [
    research(context, 'research-a-2', 'same-source.md', 'work-repair-2'),
    research(context, 'research-b-2', 'same-source.md', 'work-repair-2'),
  ];
  const secondRecord = synthesis(context, secondResults, 'work-repair-2', 'synthesis-test-2');
  const secondPath = addSecondSynthesisRepairTarget(context, stored, secondResults, secondRecord);
  const secondBefore = readFileSync(path.join(context.root, secondPath), 'utf8');
  const args = planning(context, 'inspect', ['--kind', 'synthesis-qualification']);
  expect(await expectAsyncReturned(() => runReconcileArtifacts(args))).toMatchObject({
    status: 'repairable_current_v1',
    changed_paths: [stored.pathToRecord, secondPath].sort(),
  });
  expect(
    await expectAsyncReturned(() =>
      runReconcileArtifacts(planning(context, 'plan', ['--kind', 'synthesis-qualification'])),
    ),
  ).toMatchObject({ status: 'planned' });
  const plan = synthesisPlan(
    parseRecord(
      readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'),
      'synthesis repair plan',
    ),
  );
  expect(plan.targets.map((target) => target.path)).toEqual([stored.pathToRecord, secondPath].sort());
  expect(plan.targets).toHaveLength(2);
  const target = plan.targets.find((candidate) => candidate.path === stored.pathToRecord);
  if (!target) throw new Error('primary synthesis repair target is missing');
  const afterRecord = parseRecord(target.after_record, 'repaired synthesis record');
  const findings = arrayField(afterRecord, 'findings', 'repaired synthesis record');
  expect(valueField(arrayRecord(findings, 0, 'synthesis findings'), 'source_refs', 'synthesis finding')).toEqual([
    'r0:shared',
  ]);
  const afterObservation = parseRecord(target.after_observation.summary, 'repaired observation summary');
  expect(recordField(afterObservation, 'recommendation', 'observation summary').evidence_refs).toEqual(['r0:shared']);
  expect(
    valueField(
      arrayRecord(arrayField(afterObservation, 'conflicts', 'observation summary'), 0, 'conflicts'),
      'source_refs',
      'conflict',
    ),
  ).toEqual(['r0:shared', 'r0:related']);
  expect(target.after_observation.issue_id).toBe(stored.item.issue_id);
  expect(target.after_observation.evidence_refs).toEqual(['r0:related', 'r0:shared']);
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const changed = { ...stored.work, execution: { ...stored.work.execution, status: 'active' } };
  database
    .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work' AND id=?")
    .run(canonicalJson(changed), canonicalJsonDigest(changed), stored.identityKey);
  database.close();
  await Promise.resolve(expect(runReconcileArtifacts(args)).rejects.toThrow('not quiescent'));
  expect(readFileSync(path.join(context.root, stored.pathToRecord), 'utf8')).toBe(json(record));
  expect(readFileSync(path.join(context.root, secondPath), 'utf8')).toBe(secondBefore);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('synthesis observation dispatcher plans the real provenance collision and preserves the reported native outcome', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const projectIds = ['agent', 'plugin'];
  const stored = persisted(context, results, synthesis(context, results), false, projectIds);
  const args = (mode: string): string[] => [
    '--kind',
    'synthesis-observation-correction',
    '--mode',
    mode,
    '--project-root',
    context.root,
    '--correction-id',
    'correction-test',
    '--projects',
    projectIds.join(','),
    '--work-id',
    'work-repair',
    '--attempt',
    '1',
    '--action-id',
    stored.item.request.action_id,
    '--issue-id',
    stored.item.issue_id,
    '--native-handle',
    'thread-test',
    '--owner-correction-pointer',
    'TEST-SETUP-owner-decision',
    '--actor',
    'test-setup',
    '--timestamp',
    timestamp,
  ];
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const hostRowsBefore = database
    .query('SELECT kind,id,revision,payload,digest FROM agent_host_state ORDER BY kind,id')
    .all();
  const sessionRowsBefore = database
    .query('SELECT work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger')
    .all();
  for (const projectIds of ['agent,agent', 'plugin,agent']) {
    const invalidProjects = args('inspect');
    invalidProjects[invalidProjects.indexOf('--projects') + 1] = projectIds;
    await Promise.resolve(
      expect(runReconcileArtifacts(invalidProjects)).rejects.toThrow(
        'correction identity or owner attribution invalid',
      ),
    );
    expect(
      database.query('SELECT kind,id,revision,payload,digest FROM agent_host_state ORDER BY kind,id').all(),
    ).toEqual(hostRowsBefore);
    expect(
      database.query('SELECT work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger').all(),
    ).toEqual(sessionRowsBefore);
    expect(() =>
      readFileSync(
        path.join(context.root, '.agent/work/correction-test/synthesis-observation-correction-plan.v1.json'),
      ),
    ).toThrow();
  }
  expect(await expectAsyncReturned(() => runReconcileArtifacts(args('inspect')))).toMatchObject({
    status: 'correctable_current_v1',
    retained_native_outcome: 'reported_complete',
    prior_issue_id: stored.item.issue_id,
  });
  expect(await expectAsyncReturned(() => runReconcileArtifacts(args('plan')))).toMatchObject({
    status: 'planned',
    retained_native_outcome: 'reported_complete',
  });
  const plan = observationCorrectionPlan(
    parseRecord(
      readFileSync(
        path.join(context.root, '.agent/work/correction-test/synthesis-observation-correction-plan.v1.json'),
        'utf8',
      ),
      'synthesis observation correction plan',
    ),
  );
  expect(plan.original_item.observation).toEqual(stored.item.observation);
  expect(plan.predecessor_refs).toEqual(results.map(({ result_id, digest }) => ({ result_id, digest })));
  expect(plan.project_ids).toEqual(projectIds);
  expect(stored.work.binding.project_ids).toEqual(projectIds);
  const row = sqlRow(database, 'SELECT payload FROM agent_host_mastra_session_ledger', 'Mastra session ledger');
  const rowPayload = parseRecord(stringField(row, 'payload', 'Mastra session ledger'), 'Mastra session ledger');
  expect(
    recordField(
      arrayRecord(arrayField(rowPayload, 'items', 'Mastra session ledger'), 0, 'ledger items'),
      'observation',
      'ledger item',
    ),
  ).toEqual(stored.item.observation);
  const hostBeforeWrongIssue = database
    .query('SELECT kind,id,revision,payload,digest FROM agent_host_state ORDER BY kind,id')
    .all();
  const sessionBeforeWrongIssue = database
    .query('SELECT work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger')
    .all();
  const wrongIssue = args('inspect');
  wrongIssue[wrongIssue.indexOf('--issue-id') + 1] = 'foreign-issue';
  await Promise.resolve(expect(runReconcileArtifacts(wrongIssue)).rejects.toThrow('correction scope'));
  const unchanged = sqlRow(
    database,
    'SELECT payload FROM agent_host_mastra_session_ledger',
    'Mastra session ledger after denial',
  );
  expect(stringField(unchanged, 'payload', 'Mastra session ledger after denial')).toBe(
    stringField(row, 'payload', 'Mastra session ledger'),
  );
  expect(database.query('SELECT kind,id,revision,payload,digest FROM agent_host_state ORDER BY kind,id').all()).toEqual(
    hostBeforeWrongIssue,
  );
  expect(
    database.query('SELECT work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger').all(),
  ).toEqual(sessionBeforeWrongIssue);
  writeFileSync(path.join(context.root, 'packages/agent/TESTING.md'), 'changed source\n');
  await Promise.resolve(expect(runReconcileArtifacts(args('inspect'))).rejects.toThrow('declared source changed'));
  await Promise.resolve(
    expect(
      runReconcileArtifacts([
        '--kind',
        'synthesis-observation-correction',
        '--mode',
        'apply',
        '--project-root',
        context.root,
        '--correction-id',
        'correction-test',
      ]),
    ).rejects.toThrow('declared source changed'),
  );
  const unchangedAfterDrift = sqlRow(
    database,
    'SELECT payload FROM agent_host_mastra_session_ledger',
    'Mastra session ledger after source drift',
  );
  expect(stringField(unchangedAfterDrift, 'payload', 'Mastra session ledger after source drift')).toBe(
    stringField(row, 'payload', 'Mastra session ledger'),
  );
  database.close();
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('synthesis qualification dispatcher applies its database projection and replays the same receipt', async () => {
  const context = fixture();
  const results = [
    research(context, 'research-a', 'same-source.md'),
    research(context, 'research-b', 'same-source.md'),
  ];
  const stored = persisted(context, results, synthesis(context, results));
  await runReconcileArtifacts(planning(context, 'plan', ['--kind', 'synthesis-qualification']));
  const apply = [
    '--kind',
    'synthesis-qualification',
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ];
  expect(await runReconcileArtifacts(apply)).toMatchObject({ status: 'applied' });
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const work = sqlRow(database, "SELECT payload,revision FROM agent_host_state WHERE kind='work'", 'work state');
  const journal = sqlRow(
    database,
    'SELECT payload,revision FROM agent_host_mastra_session_ledger',
    'Mastra session ledger',
  );
  expect(numberField(work, 'revision', 'work state')).toBe(2);
  expect(numberField(journal, 'revision', 'Mastra session ledger')).toBe(2);
  const written = parseRecord(
    readFileSync(path.join(context.root, stored.pathToRecord), 'utf8'),
    'repaired synthesis record',
  );
  expectStringArray(
    valueField(
      arrayRecord(arrayField(written, 'findings', 'synthesis record'), 0, 'synthesis findings'),
      'source_refs',
      'synthesis finding',
    ),
    ['r0:shared'],
  );
  const journalState = parseRecord(stringField(journal, 'payload', 'Mastra session ledger'), 'Mastra session ledger');
  const journalItem = arrayRecord(arrayField(journalState, 'items', 'Mastra session ledger'), 0, 'ledger items');
  const journalObservation = recordField(journalItem, 'observation', 'ledger item');
  expect(journalObservation.issue_id).toBe(stored.item.issue_id);
  expect(journalObservation.evidence_refs).toEqual(['r0:shared']);
  expect(await runReconcileArtifacts(apply)).toMatchObject({ status: 'already_applied' });
  const workReplay = sqlRow(database, "SELECT payload FROM agent_host_state WHERE kind='work'", 'work replay');
  const journalReplay = sqlRow(database, 'SELECT payload FROM agent_host_mastra_session_ledger', 'journal replay');
  expect(stringField(workReplay, 'payload', 'work replay')).toBe(stringField(work, 'payload', 'work state'));
  expect(stringField(journalReplay, 'payload', 'journal replay')).toBe(
    stringField(journal, 'payload', 'Mastra session ledger'),
  );
});

test('synthesis qualification database CAS rejects a journal revision changed after file publication', async (budget: PhaseBudget) => {
  const context = fixture();
  const results = [
    research(context, 'research-a', 'same-source.md'),
    research(context, 'research-b', 'same-source.md'),
  ];
  const stored = persisted(context, results, synthesis(context, results));
  const priorPath = `${context.records}/prior.txt`;
  const priorBytes = 'TEST SETUP prior source bytes\n';
  writeFileSync(path.join(context.root, priorPath), priorBytes);
  const priorEvent = {
    schema: 'DocumentationChangeEvent/v1',
    event_id: 'documentation-event-prior',
    logical_edit_id: priorPath,
    work_id: 'test-setup-prior',
    source_revision: context.source.digest,
    operation: 'init',
    document_id: 'prior-document',
    path_before: null,
    path_after: priorPath,
    before_sha256: sha(''),
    after_sha256: sha(priorBytes),
    actor: 'test-setup',
    pointer: 'TEST-SETUP-prior',
    timestamp,
  };
  const lineagePrefix = canonicalJson(priorEvent) + '\n';
  writeFileSync(path.join(context.root, context.changelog), lineagePrefix);
  await runReconcileArtifacts(planning(context, 'plan', ['--kind', 'synthesis-qualification']));
  const frozenPlanBytes = readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8');
  const frozenPlan = parseRecord(frozenPlanBytes, 'frozen synthesis repair plan');
  const plan = synthesisPlan(frozenPlan);
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const workBefore = sqlRow(
    database,
    "SELECT payload,revision FROM agent_host_state WHERE kind='work'",
    'work state before CAS',
  );
  const journalBefore = sqlRow(
    database,
    'SELECT payload,revision FROM agent_host_mastra_session_ledger',
    'journal before CAS',
  );
  const args = [
    '--kind',
    'synthesis-qualification',
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ];
  await Promise.resolve(
    expect(
      runReconcileArtifacts(args, {
        onPhase: (phase: string) => {
          if (phase === 'changelog')
            database.query('UPDATE agent_host_mastra_session_ledger SET revision=revision+1').run();
        },
      }),
    ).rejects.toThrow('Mastra journal CAS changed'),
  );
  expect(
    sqlRow(database, "SELECT payload,revision FROM agent_host_state WHERE kind='work'", 'work state after CAS'),
  ).toEqual(workBefore);
  const journalAfter = sqlRow(
    database,
    'SELECT payload,revision FROM agent_host_mastra_session_ledger',
    'journal after CAS',
  );
  expect(stringField(journalAfter, 'payload', 'journal after CAS')).toBe(
    stringField(journalBefore, 'payload', 'journal before CAS'),
  );
  expect(numberField(journalAfter, 'revision', 'journal after CAS')).toBe(
    numberField(journalBefore, 'revision', 'journal before CAS') + 1,
  );
  expect(
    numberField(
      sqlRow(
        database,
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_qualification_repair'",
        'synthesis repair table count',
      ),
      'count',
      'synthesis repair table count',
    ),
  ).toBe(0);
  const target = firstItem(plan.targets, 'synthesis repair targets');
  expect(readFileSync(path.join(context.root, target.path), 'utf8')).toBe(target.after_record);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe(plan.changelog_after);
  const lineage = readFileSync(path.join(context.root, context.changelog), 'utf8');
  expect(lineage.startsWith(lineagePrefix)).toBe(true);
  expect(parseRecords(lineage, 'lineage event')).toEqual([
    priorEvent,
    {
      schema: 'DocumentationChangeEvent/v1',
      event_id: expect.any(String),
      logical_edit_id: `ResearchSynthesis/v1:${target.path}`,
      work_id: 'work-repair',
      source_revision: context.source.digest,
      operation: 'finalize',
      document_id: 'synthesis-test',
      path_before: target.path,
      path_after: target.path,
      before_sha256: target.before_sha256,
      after_sha256: target.after_sha256,
      actor: 'test-setup',
      pointer: '.agent/work/repair-test/repair-plan.v1.json',
      timestamp,
    },
  ]);
  expect(readFileSync(path.join(context.root, priorPath), 'utf8')).toBe(priorBytes);
  const phases = readFileSync(path.join(context.root, '.agent/work/repair-test/repair-journal.v1.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => stringField(parseRecord(line, 'repair journal event'), 'phase', 'repair journal event'));
  expect(phases).toEqual(['record_0', 'changelog']);
  const savedPlanBytes = readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8');
  expect(savedPlanBytes).toBe(frozenPlanBytes);
  expect(parseRecord(savedPlanBytes, 'saved synthesis repair plan')).toEqual(frozenPlan);
  expect(readFileSync(path.join(context.root, '.agent/work/repair-test/archive/record-0.json'), 'utf8')).toBe(
    target.before_record,
  );
  expect(plan.changelog_before).toBe(lineagePrefix);
  expect(target.work_row.payload).toBe(stringField(workBefore, 'payload', 'work state before CAS'));
  expect(target.journal_row.payload).toBe(stringField(journalBefore, 'payload', 'journal before CAS'));
  const hostState = new HostStateStore(database, context.workspace);
  expect(maintenanceStatus(hostState)).toBe('held');
  expect(() =>
    hostState.readHostStateSnapshot({
      repository_id: stored.work.binding.repository_id,
      project_ids: stored.work.binding.project_ids,
      integrations_digest: stored.work.binding.integrations_digest,
      work_id: 'work-repair',
    }),
  ).toThrow('working access blocked by maintenance fence');
  const resumed = boundedSpawnSync(
    spawnSync,
    process.execPath,
    [
      path.join(bundle, 'bin/reconcile-artifacts.ts'),
      '--kind',
      'synthesis-qualification',
      '--mode',
      'resume',
      '--project-root',
      context.root,
      '--repair-id',
      'repair-test',
    ],
    { cwd: bundle, encoding: 'utf8', windowsHide: true, timeout: 15_000, budget, diagnostics: true },
    'repair synthesis qualification resume',
  );
  if (commandOutcomeUnknown(resumed)) repairOutcomeUnknown = true;
  requireTerminalCommand(resumed, 'repair synthesis qualification resume');
  expect(resumed.status).toBe(1);
  const terminalResult = parseRecord(childStderr(resumed), 'repair child terminal result');
  expect(stringField(terminalResult, 'status', 'repair child terminal result')).toBe('blocked');
  expect(stringField(terminalResult, 'message', 'repair child terminal result')).toContain(
    'repair journal preimage changed',
  );
  expect(
    sqlRow(database, 'SELECT payload,revision FROM agent_host_mastra_session_ledger', 'journal after terminal child'),
  ).toEqual(journalAfter);
  expect(readFileSync(path.join(context.root, target.path), 'utf8')).toBe(target.after_record);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe(plan.changelog_after);
  expect(maintenanceStatus(hostState)).toBe('held');
});

test('research identity dispatcher resumes an interrupted exact two-record publication', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const plan = researchPlan(
    parseRecord(
      readFileSync(path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json'), 'utf8'),
      'research repair plan',
    ),
  );
  const args = ['--mode', 'apply', '--project-root', context.root, '--repair-id', 'repair-test'];
  await Promise.resolve(
    expect(
      runReconcileArtifacts(args, {
        onPhase: (phase: string) => {
          if (phase === 'record_0') throw new Error('injected interruption');
        },
      }),
    ).rejects.toThrow('injected interruption'),
  );
  const firstChange = firstItem(plan.changes, 'research repair changes');
  const secondChange = plan.changes[1];
  if (!secondChange) throw new Error('research repair plan is missing its second change');
  const firstPath = firstItem(paths, 'research result paths');
  const secondPath = paths[1];
  if (!secondPath) throw new Error('second research result path is missing');
  expect(readFileSync(path.join(context.root, firstPath), 'utf8')).toBe(firstChange.after);
  expect(readFileSync(path.join(context.root, secondPath), 'utf8')).toBe(secondChange.before);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
  const resumed = await runReconcileArtifacts([
    '--mode',
    'resume',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ]);
  expect(resumed.status).toBe('complete');
  for (const change of plan.changes)
    expect(readFileSync(path.join(context.root, change.path), 'utf8')).toBe(change.after);
  const events = parseRecords(readFileSync(path.join(context.root, context.changelog), 'utf8'), 'lineage event');
  expect(events).toHaveLength(2);
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const maintenance = sqlRow(database, 'SELECT payload FROM agent_host_maintenance', 'maintenance row');
  expect(
    stringField(
      parseRecord(stringField(maintenance, 'payload', 'maintenance row'), 'maintenance row'),
      'status',
      'maintenance row',
    ),
  ).toBe('released');
});

test('synthesis qualification dispatcher resumes partial publication without duplicating lineage', async () => {
  const context = fixture();
  const results = [
    research(context, 'research-a', 'same-source.md'),
    research(context, 'research-b', 'same-source.md'),
  ];
  persisted(context, results, synthesis(context, results));
  await runReconcileArtifacts(planning(context, 'plan', ['--kind', 'synthesis-qualification']));
  const args = [
    '--kind',
    'synthesis-qualification',
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--repair-id',
    'repair-test',
  ];
  await Promise.resolve(
    expect(
      runReconcileArtifacts(args, {
        onPhase: (phase: string) => {
          if (phase === 'record_0') throw new Error('injected interruption');
        },
      }),
    ).rejects.toThrow('injected interruption'),
  );
  expect(
    await runReconcileArtifacts([
      '--kind',
      'synthesis-qualification',
      '--mode',
      'resume',
      '--project-root',
      context.root,
      '--repair-id',
      'repair-test',
    ]),
  ).toMatchObject({ status: 'applied' });
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8').trim().split('\n')).toHaveLength(1);
});

test('synthesis observation dispatcher prepares a new issue while keeping the original native report immutable', async () => {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const stored = persisted(context, results, synthesis(context, results), false);
  await runReconcileArtifacts([
    '--kind',
    'synthesis-observation-correction',
    '--mode',
    'plan',
    '--project-root',
    context.root,
    '--correction-id',
    'correction-test',
    '--projects',
    'agent',
    '--work-id',
    'work-repair',
    '--attempt',
    '1',
    '--action-id',
    stored.item.request.action_id,
    '--issue-id',
    stored.item.issue_id,
    '--native-handle',
    'thread-test',
    '--owner-correction-pointer',
    'TEST-SETUP-owner-decision',
    '--actor',
    'test-setup',
    '--timestamp',
    timestamp,
  ]);
  const args = [
    '--kind',
    'synthesis-observation-correction',
    '--mode',
    'apply',
    '--project-root',
    context.root,
    '--correction-id',
    'correction-test',
  ];
  expect(await runReconcileArtifacts(args)).toMatchObject({
    status: 'prepared',
    retained_native_outcome: 'reported_complete',
  });
  const database = new Database(path.join(context.root, '.agent/work/session-handoff.v1.sqlite'));
  databases.push(database);
  const journal = sqlRow(
    database,
    'SELECT payload,revision FROM agent_host_mastra_session_ledger',
    'Mastra session ledger after correction',
  );
  const journalState = parseRecord(
    stringField(journal, 'payload', 'Mastra session ledger after correction'),
    'Mastra session ledger',
  );
  expect(arrayRecord(arrayField(journalState, 'items', 'Mastra session ledger'), 0, 'ledger items')).toEqual({
    request: stored.item.request,
    issue_id: null,
    observation: null,
  });
  const correction = sqlRow(
    database,
    'SELECT payload FROM agent_host_synthesis_observation_correction',
    'synthesis correction row',
  );
  const correctionState = parseRecord(
    stringField(correction, 'payload', 'synthesis correction row'),
    'synthesis correction row',
  );
  expect(
    recordField(
      recordField(correctionState, 'original_item', 'synthesis correction row'),
      'observation',
      'original item',
    ),
  ).toEqual(stored.item.observation);
  args[args.indexOf('--mode') + 1] = 'resume';
  expect(await runReconcileArtifacts(args)).toMatchObject({ status: 'already_prepared' });
  const journalReplay = sqlRow(
    database,
    'SELECT payload FROM agent_host_mastra_session_ledger',
    'journal replay after correction',
  );
  expect(stringField(journalReplay, 'payload', 'journal replay after correction')).toBe(
    stringField(journal, 'payload', 'Mastra session ledger after correction'),
  );
});

function researchIdentityRepairFixture() {
  const context = fixture();
  const results = [research(context, 'research-a', 'source-a.md'), research(context, 'research-b', 'source-b.md')];
  const paths = writeResearch(context, results);
  const recordsFile = path.join(context.root, 'records.json');
  writeFileSync(recordsFile, json(paths));
  const beforeRecords = paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'));
  return { context, paths, recordsFile, beforeRecords };
}

function repairApplyArgs(root: string): string[] {
  return ['--mode', 'apply', '--project-root', root, '--repair-id', 'repair-test'];
}

test('public research repair retains non-ENOENT lock probe failure after acquiring its maintenance fence', async () => {
  const { context, paths, recordsFile, beforeRecords } = researchIdentityRepairFixture();
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const planPath = path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json');
  const planBytes = readFileSync(planPath);
  const lockPath = path.join(context.root, '.agent/work/repair-test/repair-lock.v1.json');
  const databasePath = path.resolve(context.root, sessionHandoffDatabaseRelativePath(context.config));
  const accessError = Object.assign(new Error('injected repair lock probe denial'), { code: 'EACCES' });
  retainRepairFixture(context.root, 'unknown maintenance fence after lock probe denial');
  const filesystem = await injectRepairFilesystemFaults(context.root, {
    owner: 'lock',
    lstat: { value: accessError },
  });
  let outcome: RepairCallOutcome;
  try {
    outcome = await repairCallOutcome(() => runReconcileArtifacts(repairApplyArgs(context.root)));
  } finally {
    await filesystem.restore();
  }

  expect(filesystem.events).toEqual(['lstat']);
  expectRepairFailures(outcome, [accessError]);
  expect(readFileSync(planPath)).toEqual(planBytes);
  expect(fs.existsSync(lockPath)).toBe(false);
  expect(paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(beforeRecords);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
  expect(fs.existsSync(path.join(context.root, '.agent/work/repair-test/repair-journal.v1.jsonl'))).toBe(false);
  const observer = new Database(databasePath);
  try {
    expect(maintenanceStatus(new HostStateStore(observer, context.workspace))).toBe('held');
  } finally {
    observer.close(true);
  }
});

test('public research repair plan retains write and real-close failures at first plan publication', async () => {
  const { context, paths, recordsFile, beforeRecords } = researchIdentityRepairFixture();
  const planPath = path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json');
  const writeError = new Error('injected initial plan write failure');
  const closeError = new Error('injected initial plan close failure');
  retainRepairFixture(context.root, 'initial plan write/close afterimage');
  const filesystem = await injectRepairFilesystemFaults(context.root, {
    owner: 'plan',
    write: { value: writeError },
    close: { value: closeError },
  });
  let outcome: RepairCallOutcome;
  try {
    outcome = await repairCallOutcome(() =>
      runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile])),
    );
  } finally {
    await filesystem.restore();
  }

  expect(filesystem.events).toEqual(['write', 'close']);
  expectRepairFailures(outcome, [writeError, closeError]);
  expect(fs.existsSync(planPath)).toBe(true);
  expect(fs.readFileSync(planPath)).toEqual(Buffer.alloc(0));
  expect(paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(beforeRecords);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
  expect(fs.existsSync(path.join(context.root, '.agent/work/repair-test/repair-lock.v1.json'))).toBe(false);
});

test('public research repair lock retains undefined write and real-close failures before Source effects', async () => {
  const { context, paths, recordsFile, beforeRecords } = researchIdentityRepairFixture();
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const planPath = path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json');
  const planBytes = readFileSync(planPath);
  const lockPath = path.join(context.root, '.agent/work/repair-test/repair-lock.v1.json');
  const closeError = new Error('injected research repair lock close failure');
  retainRepairFixture(context.root, 'repair lock write/close afterimage');
  const filesystem = await injectRepairFilesystemFaults(context.root, {
    owner: 'lock',
    write: { value: undefined },
    close: { value: closeError },
  });
  let outcome: RepairCallOutcome;
  try {
    outcome = await repairCallOutcome(() => runReconcileArtifacts(repairApplyArgs(context.root)));
  } finally {
    await filesystem.restore();
  }

  expect(filesystem.events).toEqual(['write', 'close']);
  expectRepairFailures(outcome, [undefined, closeError]);
  expect(fs.readFileSync(planPath)).toEqual(planBytes);
  expect(fs.existsSync(lockPath)).toBe(true);
  expect(fs.readFileSync(lockPath)).toEqual(Buffer.alloc(0));
  expect(paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(beforeRecords);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
  expect(fs.existsSync(path.join(context.root, '.agent/work/repair-test/repair-journal.v1.jsonl'))).toBe(false);
});

test('public research repair journal retains fsync and real-close failures after one exact record replacement', async () => {
  const { context, paths, recordsFile, beforeRecords } = researchIdentityRepairFixture();
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const planPath = path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json');
  const planBytes = readFileSync(planPath);
  const plan = researchPlan(parseRecord(readFileSync(planPath, 'utf8'), 'research repair plan'));
  const firstChange = firstItem(plan.changes, 'research repair changes');
  const firstPath = firstItem(paths, 'research result paths');
  const journalPath = path.join(context.root, '.agent/work/repair-test/repair-journal.v1.jsonl');
  const fsyncError = new Error('injected research repair journal fsync failure');
  const closeError = new Error('injected research repair journal close failure');
  retainRepairFixture(context.root, 'repair journal fsync/close afterimage');
  const filesystem = await injectRepairFilesystemFaults(context.root, {
    owner: 'journal',
    fsync: { value: fsyncError },
    close: { value: closeError },
  });
  let outcome: RepairCallOutcome;
  try {
    outcome = await repairCallOutcome(() => runReconcileArtifacts(repairApplyArgs(context.root)));
  } finally {
    await filesystem.restore();
  }

  expect(filesystem.events).toEqual(['fsync', 'close']);
  expectRepairFailures(outcome, [fsyncError, closeError]);
  expect(fs.readFileSync(planPath)).toEqual(planBytes);
  expect(fs.existsSync(path.join(context.root, '.agent/work/repair-test/repair-lock.v1.json'))).toBe(true);
  expect(readFileSync(path.join(context.root, firstPath), 'utf8')).toBe(firstChange.after);
  expect(paths.slice(1).map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(
    beforeRecords.slice(1),
  );
  expect(fs.readFileSync(journalPath, 'utf8')).toBe(
    `${JSON.stringify({ schema: 'VidaResearchRepairEvent/v1', repair_id: 'repair-test', phase: 'record_0' })}\n`,
  );
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
});

test('public research repair preserves record-phase and admitted database close failures', async () => {
  const { context, paths, beforeRecords } = researchIdentityRepairFixture();
  await runReconcileArtifacts(planning(context, 'plan', ['--records', path.join(context.root, 'records.json')]));
  const planPath = path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json');
  const planBytes = readFileSync(planPath);
  const plan = researchPlan(parseRecord(planBytes.toString('utf8'), 'research repair plan'));
  const firstChange = firstItem(plan.changes, 'research repair changes');
  const sourceDatabasePath = path.resolve(context.root, sessionHandoffDatabaseRelativePath(context.config));
  const bodyError = new Error('injected research repair record-phase failure');
  const closeError = new Error('injected admitted research repair database close failure');
  const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
  const events: string[] = [];
  retainRepairFixture(context.root, 'record-phase and admitted database close afterimage');
  let closeSpy: { mockRestore(): void } | undefined;
  let outcome: RepairCallOutcome;
  try {
    outcome = await repairCallOutcome(() =>
      runReconcileArtifacts(repairApplyArgs(context.root), {
        onPhase(phase) {
          if (phase !== 'record_0') return;
          events.push(phase);
          closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
            this: Database,
            force?: boolean,
          ): void {
            if (path.resolve(this.filename) === sourceDatabasePath && events.length === 1) {
              Reflect.apply(originalClose, this, [true]);
              events.push('source_close');
              throw closeError;
            }
            Reflect.apply(originalClose, this, [force]);
          });
          throw bodyError;
        },
      }),
    );
  } finally {
    closeSpy?.mockRestore();
    retryPendingWorkspaceDatabaseCloses();
  }

  expect(events).toEqual(['record_0', 'source_close']);
  expectRepairFailures(outcome, [bodyError, closeError]);
  expect(readFileSync(planPath)).toEqual(planBytes);
  expect(readFileSync(path.join(context.root, firstChange.path), 'utf8')).toBe(firstChange.after);
  expect(paths.slice(1).map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(
    beforeRecords.slice(1),
  );
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
  expect(readFileSync(path.join(context.root, '.agent/work/repair-test/repair-journal.v1.jsonl'), 'utf8')).toBe(
    `${JSON.stringify({ schema: 'VidaResearchRepairEvent/v1', repair_id: 'repair-test', phase: 'record_0' })}\n`,
  );
  expect(fs.existsSync(path.join(context.root, '.agent/work/repair-test/repair-lock.v1.json'))).toBe(true);

  const observer = new Database(sourceDatabasePath);
  try {
    expect(maintenanceStatus(new HostStateStore(observer, context.workspace))).toBe('held');
  } finally {
    observer.close(true);
  }
});

test('public research repair pending cleanup retains write, real-close and unlink failures without replacement', async () => {
  const { context, paths, recordsFile, beforeRecords } = researchIdentityRepairFixture();
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const planPath = path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json');
  const planBytes = readFileSync(planPath);
  const plan = researchPlan(parseRecord(readFileSync(planPath, 'utf8'), 'research repair plan'));
  const firstChange = firstItem(plan.changes, 'research repair changes');
  const pendingWriteError = new Error('injected research replacement write failure');
  const closeError = new Error('injected research replacement close failure');
  const unlinkError = new Error('injected pending-file cleanup failure');
  retainRepairFixture(context.root, 'pending replacement cleanup failure');
  const filesystem = await injectRepairFilesystemFaults(context.root, {
    owner: 'pending',
    write: { value: pendingWriteError },
    close: { value: closeError },
    unlink: { value: unlinkError },
  });
  let outcome: RepairCallOutcome;
  try {
    outcome = await repairCallOutcome(() => runReconcileArtifacts(repairApplyArgs(context.root)));
  } finally {
    await filesystem.restore();
  }

  expect(filesystem.events).toEqual(['write', 'close', 'unlink']);
  expectRepairFailures(outcome, [pendingWriteError, closeError, unlinkError]);
  expect(fs.readFileSync(planPath)).toEqual(planBytes);
  expect(fs.existsSync(path.join(context.root, '.agent/work/repair-test/repair-lock.v1.json'))).toBe(true);
  expect(paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(beforeRecords);
  expect(fs.existsSync(path.join(context.root, '.agent/work/repair-test/repair-journal.v1.jsonl'))).toBe(false);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
  const pendingFiles = fs
    .readdirSync(path.dirname(path.join(context.root, firstChange.path)))
    .filter((name) => name.startsWith(`${path.basename(firstChange.path)}.pending-`));
  expect(pendingFiles).toHaveLength(1);
  expect(
    fs.readFileSync(
      path.join(
        path.dirname(path.join(context.root, firstChange.path)),
        firstItem(pendingFiles, 'owned pending files'),
      ),
    ),
  ).toEqual(Buffer.alloc(0));
});

test('public research repair preserves a foreign pending file when exclusive creation loses ownership', async () => {
  const { context, paths, recordsFile, beforeRecords } = researchIdentityRepairFixture();
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const planPath = path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json');
  const planBytes = readFileSync(planPath);
  const plan = researchPlan(parseRecord(planBytes.toString('utf8'), 'research repair plan'));
  const change = firstItem(plan.changes, 'research repair changes');
  const foreignBytes = 'foreign pending owner bytes';
  retainRepairFixture(context.root, 'foreign pending file exclusive-creation denial');
  const filesystem = await injectRepairFilesystemFaults(context.root, {
    owner: 'pending',
    openCollision: foreignBytes,
  });
  let outcome: RepairCallOutcome;
  try {
    outcome = await repairCallOutcome(() => runReconcileArtifacts(repairApplyArgs(context.root)));
  } finally {
    await filesystem.restore();
  }
  expect(filesystem.events).toEqual(['open-collision']);
  if (!outcome.threw || !isRecord(outcome.error)) throw new Error('exclusive creation denial is missing');
  expect(outcome.error.code).toBe('EEXIST');
  const directory = path.dirname(path.join(context.root, change.path));
  const pending = fs.readdirSync(directory).filter((name) => name.startsWith(`${path.basename(change.path)}.pending-`));
  expect(pending).toHaveLength(1);
  expect(readFileSync(path.join(directory, firstItem(pending, 'foreign pending files')), 'utf8')).toBe(foreignBytes);
  expect(readFileSync(planPath)).toEqual(planBytes);
  expect(paths.map((relative) => readFileSync(path.join(context.root, relative), 'utf8'))).toEqual(beforeRecords);
  expect(readFileSync(path.join(context.root, context.changelog), 'utf8')).toBe('\n');
  expect(fs.existsSync(path.join(context.root, '.agent/work/repair-test/repair-journal.v1.jsonl'))).toBe(false);
});

test('public research repair releases pending-path ownership when rename consumes the owned file', async () => {
  const { context, recordsFile } = researchIdentityRepairFixture();
  await runReconcileArtifacts(planning(context, 'plan', ['--records', recordsFile]));
  const planPath = path.join(context.root, '.agent/work/repair-test/repair-plan.v1.json');
  const plan = researchPlan(parseRecord(readFileSync(planPath, 'utf8'), 'research repair plan'));
  const change = firstItem(plan.changes, 'research repair changes');
  const foreignBytes = 'foreign bytes after owned rename';
  retainRepairFixture(context.root, 'foreign pending-path afterimage after successful rename');
  const filesystem = await injectRepairFilesystemFaults(context.root, { owner: 'pending', afterRename: foreignBytes });
  let outcome: RepairCallOutcome;
  try {
    outcome = await repairCallOutcome(() => runReconcileArtifacts(repairApplyArgs(context.root)));
  } finally {
    await filesystem.restore();
  }
  expect(filesystem.events).toEqual(['rename-then-foreign']);
  if (outcome.threw) throw outcome.error;
  expect(isRecord(outcome.value) && outcome.value.status).toBe('complete');
  const directory = path.dirname(path.join(context.root, change.path));
  const pending = fs.readdirSync(directory).filter((name) => name.startsWith(`${path.basename(change.path)}.pending-`));
  expect(pending).toHaveLength(1);
  expect(readFileSync(path.join(directory, firstItem(pending, 'foreign pending afterimages')), 'utf8')).toBe(
    foreignBytes,
  );
  for (const item of plan.changes) expect(readFileSync(path.join(context.root, item.path), 'utf8')).toBe(item.after);
  expect(parseRecords(readFileSync(path.join(context.root, context.changelog), 'utf8'), 'lineage events')).toHaveLength(
    2,
  );
});
