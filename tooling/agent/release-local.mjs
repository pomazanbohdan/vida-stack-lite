import {
  releaseState,
  saveReleaseState as save,
  releaseDirectory as directory,
  releaseJournalFile as journalFile,
  operationMutex,
  withReleaseAdmission,
  selectedTarball,
  packedDistribution,
  assertReleaseRetargetSettled,
  parseReleaseVersion,
  releasePath,
  releaseRelative,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
export {
  withReleaseAdmission,
  selectedTarball,
  packedDistribution,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  constants,
  copyFileSync,
  fsyncSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { sdkCompatibilityManifest } from '../../packages/agent/tooling/pack-sdk.mjs';
import { findNpmCli } from '../../packages/agent/bin/bun.mjs';

import { readNativeRetargetCandidate } from '../../packages/agent/bin/repair-release-retarget.mjs';
import { assertNativeDeliveryEvidenceRepairSettled } from '../../packages/agent/bin/repair-native-delivery-evidence.mjs';
import { readConfirmedCIDeliveryFormation, validateCIDeliveryRequest } from './release-ci-evidence.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const idPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function manifest(root) {
  const file = path.join(root, 'packages/agent/package.json');
  const value = read(file);
  if (
    value.name !== 'vida-agent' ||
    value.bin?.['vida-agent'] !== './bin/vida-agent.mjs' ||
    value.engines?.bun !== '1.4.2' ||
    value.packageManager !== 'bun@1.4.2' ||
    parseReleaseVersion(value.version) === null
  )
    throw new Error('Local release requires vida-agent with a valid MAJOR.MINOR.PATCH version and Bun 1.4.2.');
  return { file, value };
}
function compareVersions(left, right) {
  const a = parseReleaseVersion(left),
    b = parseReleaseVersion(right);
  if (!a || !b) throw new Error('Version must use valid MAJOR.MINOR.PATCH form.');
  for (const component of ['major', 'minor', 'patch']) {
    if (a[component] !== b[component]) return a[component] < b[component] ? -1 : 1;
  }
  return 0;
}
function increment(component, name) {
  if (component === Number.MAX_SAFE_INTEGER) throw new Error(`${name} version component exceeds integer bound.`);
  return component + 1;
}
export function candidateVersion(current, successful, selection = { mode: 'patch' }) {
  if (!parseReleaseVersion(current)) throw new Error('Candidate version must use valid MAJOR.MINOR.PATCH form.');
  const baseline = successful ?? current;
  const base = parseReleaseVersion(baseline);
  if (!base) throw new Error('Successful version must use valid MAJOR.MINOR.PATCH form.');
  const mode = selection?.mode ?? 'patch';
  if (mode === 'exact') {
    if (!parseReleaseVersion(selection.version) || compareVersions(selection.version, baseline) <= 0)
      throw new Error('Requested version must be valid MAJOR.MINOR.PATCH and higher than the confirmed baseline.');
    return selection.version;
  }
  if (mode === 'patch' && !successful) return current;
  if (mode === 'patch') return `${base.major}.${base.minor}.${increment(base.patch, 'Patch')}`;
  if (mode === 'minor') return `${base.major}.${increment(base.minor, 'Minor')}.0`;
  if (mode === 'major') return `${increment(base.major, 'Major')}.0.0`;
  throw new Error('Version selection must be patch, minor, major or exact.');
}
export function confirmedVersionBaseline(successful, formation) {
  if (!successful) return formation ?? null;
  if (!formation) return successful;
  return compareVersions(formation.version, successful.version) > 0 ? formation : successful;
}
function pendingBuildRetry(pending, successful, selection = { mode: 'patch' }, dispositionReceipt) {
  if (
    !pending ||
    pending.operation_id === successful?.operation_id ||
    dispositionReceipt?.operation_id === pending.operation_id
  )
    return null;
  if (
    (selection.mode === 'exact' && selection.version !== pending.version) ||
    (selection.mode !== 'exact' && (selection.mode !== 'patch' || selection.explicit))
  )
    throw new Error(
      'Pending build retains its version; use an exact matching retry or supported disposition before selecting another version.',
    );
  return pending;
}
export function parseVersionSelection(args) {
  if (args.length === 0) return { mode: 'patch', explicit: false };
  if (args.length === 1 && args[0] === '--minor') return { mode: 'minor', explicit: true };
  if (args.length === 1 && args[0] === '--major') return { mode: 'major', explicit: true };
  if (args.length === 2 && args[0] === '--version') {
    if (!parseReleaseVersion(args[1])) throw new Error('Requested version must use valid MAJOR.MINOR.PATCH form.');
    return { mode: 'exact', version: args[1], explicit: true };
  }
  throw new Error('Choose at most one version override: --minor, --major or --version X.Y.Z.');
}
export function parseDispositionPreparationArgs(args) {
  if (!Array.isArray(args) || args.length < 2 || args[0] !== '--proposal')
    throw new Error(
      'Usage: release:local -- --prepare-after-disposition --proposal REL ' +
        '[--minor | --major | --version X.Y.Z]',
    );
  if (typeof args[1] !== 'string' || args[1].startsWith('--'))
    throw new Error('Disposition proposal must use a safe relative file path.');
  return {
    proposalPath: releaseRelative(args[1]),
    selection: parseVersionSelection(args.slice(2)),
  };
}
export function readDispositionProposal(root, relative) {
  const file = releasePath(root, releaseRelative(relative));
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 8 * 1024 * 1024)
    throw new Error('Disposition proposal file is unsafe.');
  const bytes = readFileSync(file);
  const current = lstatSync(file);
  if (
    bytes.length > 8 * 1024 * 1024 ||
    !current.isFile() ||
    current.isSymbolicLink() ||
    current.nlink !== 1 ||
    current.dev !== stat.dev ||
    current.ino !== stat.ino ||
    current.size !== stat.size ||
    current.mtimeMs !== stat.mtimeMs ||
    current.ctimeMs !== stat.ctimeMs
  )
    throw new Error('Disposition proposal changed or is unsafe.');
  const proposal = JSON.parse(bytes.toString('utf8'));
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal))
    throw new Error('Disposition proposal must be a JSON object.');
  return proposal;
}
const terminalConclusions = new Set([
  'success',
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'neutral',
  'stale',
  'skipped',
  'startup_failure',
]);
const commitPattern = /^[a-f0-9]{40,64}$/;
function sorted(values) {
  return values.slice().sort((left, right) => String(left).localeCompare(String(right)));
}
function sameIds(left, right) {
  return Array.isArray(left) && Array.isArray(right) && JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}
export function classifyReleaseDispositionCensus({ operation_id, version, request_ids, actual_census }) {
  try {
    if (
      !idPattern.test(operation_id ?? '') ||
      !parseReleaseVersion(version) ||
      !Array.isArray(request_ids) ||
      request_ids.length === 0 ||
      new Set(request_ids).size !== request_ids.length ||
      !actual_census ||
      actual_census.operation_id !== operation_id ||
      actual_census.version !== version ||
      !Number.isFinite(Date.parse(actual_census.observed_at)) ||
      !Array.isArray(actual_census.requests)
    )
      throw new Error('disposition census identity or observation is incomplete');
    const rows = actual_census.requests;
    if (
      rows.some((row) => !row || typeof row.request_id !== 'string') ||
      new Set(rows.map((row) => row.request_id)).size !== rows.length ||
      !sameIds(rows.map((row) => row.request_id), request_ids)
    )
      throw new Error('disposition census request set differs');
    const allRunIds = new Set();
    let successCount = 0,
      failureCount = 0,
      noIssueCount = 0;
    const requests = rows.map((row) => {
      if (!Array.isArray(row.runs) || !Array.isArray(row.references))
        throw new Error('disposition request observation is incomplete');
      const noIssueReferencePaths = row.no_issue_reference_paths ?? [];
      if (!Array.isArray(noIssueReferencePaths) || noIssueReferencePaths.some((value) => typeof value !== 'string'))
        throw new Error('disposition no-issue reference set is invalid');
      if (row.no_issue === true) {
        if (row.runs.length !== 0 || row.source_commit !== null)
          throw new Error('no-issue request has provider effects or a source commit');
        noIssueCount++;
        return {
          request_id: row.request_id,
          no_issue: true,
          source_commit: null,
          references: sorted(row.references),
          no_issue_reference_paths: sorted(noIssueReferencePaths),
          runs: [],
        };
      }
      if (row.runs.length === 0)
        throw new Error('disposition request lacks its terminal run');
      const sourceCommits = new Set();
      const runs = row.runs.map((run) => {
        const sourceCommit = run?.source_commit ?? row.source_commit;
        if (
          !run ||
          run.kind !== 'ACTUAL_PROVIDER_OBSERVATION' ||
          run.status !== 'completed' ||
          !terminalConclusions.has(run.conclusion) ||
          typeof run.run_id !== 'string' ||
          !/^\d+$/.test(run.run_id) ||
          !Number.isSafeInteger(run.run_attempt) ||
          run.run_attempt < 1 ||
          !commitPattern.test(sourceCommit ?? '') ||
          !commitPattern.test(run.head_sha ?? '') ||
          run.head_sha !== sourceCommit ||
          !Number.isSafeInteger(run.repository_id) ||
          run.repository_id < 1 ||
          !Number.isSafeInteger(run.workflow_id) ||
          run.workflow_id < 1 ||
          allRunIds.has(run.run_id)
        )
          throw new Error('disposition contains an unknown, foreign, duplicate or nonterminal provider run');
        allRunIds.add(run.run_id);
        sourceCommits.add(sourceCommit);
        if (run.conclusion === 'success') successCount++;
        else failureCount++;
        return {
          run_id: run.run_id,
          run_attempt: run.run_attempt,
          status: run.status,
          conclusion: run.conclusion,
          repository_id: run.repository_id,
          workflow_id: run.workflow_id,
          head_sha: run.head_sha,
          source_commit: sourceCommit,
          dispatch_reference_path: run.dispatch_reference_path ?? null,
        };
      });
      return {
        request_id: row.request_id,
        no_issue: false,
        source_commit: sourceCommits.size === 1 ? [...sourceCommits][0] : null,
        references: sorted(row.references),
        no_issue_reference_paths: sorted(noIssueReferencePaths),
        runs,
      };
    });
    return {
      status: 'eligible',
      operation_id,
      version,
      request_count: rows.length,
      terminal_success_count: successCount,
      terminal_failure_count: failureCount,
      no_issue_count: noIssueCount,
      requests,
    };
  } catch (error) {
    return { status: 'blocked', blockers: [error.message] };
  }
}

function referencePaths(requestRow, observationRow) {
  const census = requestRow.references?.map((reference) => reference?.path);
  const observed = observationRow.references?.map((reference) =>
    typeof reference === 'string' ? reference : reference?.path,
  );
  if (
    !Array.isArray(census) ||
    !Array.isArray(observed) ||
    census.some((value) => typeof value !== 'string') ||
    observed.some((value) => typeof value !== 'string') ||
    new Set(census).size !== census.length ||
    new Set(observed).size !== observed.length ||
    !sameIds(census, observed)
  )
    throw new Error('disposition request references differ from observed references');
  return census;
}

function readIssuedDispatchIntent(root, request, relative) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('disposition reference is unsafe');
  const value = JSON.parse(readFileSync(file, 'utf8'));
  if (value?.status !== 'ISSUED_ONCE') throw new Error('issued dispatch reference is not retained as issued');
  validateCIDeliveryRequest(value.request);
  if (json(value.request) !== json(request)) throw new Error('disposition retained request differs');
  if (value.formation_only !== true || value.installed_update !== false)
    throw new Error('dispatch intent is not a formation-only request');
  const profile = value.profile;
  const github = value.profile?.github;
  const sourceCommit = value.source_commit ?? github?.source_commit;
  const repositoryId = github?.repository_id;
  const workflowId = github?.workflow_id;
  const priorRunIds = value.prior_run_ids;
  const issuedAt = Date.parse(value.issued_at);
  const knownRunId = value.actual_terminal_run_id ?? value.terminal_run_id ?? value.provider_run_id;
  if (
    !commitPattern.test(sourceCommit ?? '') ||
    !Number.isSafeInteger(repositoryId) ||
    repositoryId < 1 ||
    !Number.isSafeInteger(workflowId) ||
    workflowId < 1 ||
    !Array.isArray(priorRunIds) ||
    priorRunIds.some((id) => !(typeof id === 'string' && /^\d+$/.test(id)) && !(Number.isSafeInteger(id) && id > 0)) ||
    new Set(priorRunIds.map(String)).size !== priorRunIds.length ||
    !Number.isFinite(issuedAt) ||
    (knownRunId !== undefined && !/^\d+$/.test(String(knownRunId)))
  )
    throw new Error('retained dispatch intent lacks a valid source, issue time or prior run set');
  if (
    profile?.issuer !== 'github-actions' ||
    profile.repository_id !== request.repository_id ||
    JSON.stringify(profile.project_ids) !== JSON.stringify(request.project_ids) ||
    profile.target !== request.target ||
    typeof github.repository !== 'string' ||
    github.repository.length === 0
  )
    throw new Error('retained dispatch profile differs from the exact request identity');
  if (value.source_commit && github?.source_commit && value.source_commit !== github.source_commit)
    throw new Error('dispatch intent source commit differs from its published profile');
  return {
    reference_path: relative,
    request_id: request.request_id,
    source_commit: sourceCommit,
    repository_id: repositoryId,
    workflow_id: workflowId,
    issued_at: new Date(issuedAt).toISOString(),
    prior_run_ids: priorRunIds.map(String),
    known_run_id: knownRunId === undefined ? null : String(knownRunId),
  };
}

export function normalizeLegacyReleaseDispatchIntent({ request, reference_path, value, related_profiles }) {
  if (value?.status !== 'issued-once-no-automatic-retry' || !Number.isSafeInteger(value.workflow_id))
    throw new Error('legacy dispatch intent is not a retained single issue');
  const encodedRequest = value.dispatch?.inputs?.request;
  let retainedRequest;
  try {
    retainedRequest = typeof encodedRequest === 'string' ? JSON.parse(encodedRequest) : null;
  } catch {
    throw new Error('legacy dispatch intent request is malformed');
  }
  validateCIDeliveryRequest(retainedRequest);
  if (json(retainedRequest) !== json(request)) throw new Error('legacy dispatch request differs from its owner');
  const sourceCommit = value.dispatch?.inputs?.source_commit;
  const exclusionFields = ['previous_failed_run', 'prior_failed_run'].filter((field) => value[field] !== undefined);
  if (exclusionFields.length > 1 || (value.earlier_run_ids !== undefined && exclusionFields.length))
    throw new Error('legacy dispatch intent has conflicting prior run fields');
  const priorRunIds = value.earlier_run_ids ?? (exclusionFields.length ? [value[exclusionFields[0]]] : null);
  const issuedAt = Date.parse(value.observed_at);
  if (
    !commitPattern.test(sourceCommit ?? '') ||
    !Array.isArray(priorRunIds) ||
    priorRunIds.some((id) => !(typeof id === 'string' && /^\d+$/.test(id)) && !(Number.isSafeInteger(id) && id > 0)) ||
    new Set(priorRunIds.map(String)).size !== priorRunIds.length ||
    !Number.isFinite(issuedAt)
  )
    throw new Error('legacy dispatch intent lacks a valid source, issue time or earlier run set');
  const matchingProfiles = [];
  if (!Array.isArray(related_profiles)) throw new Error('legacy dispatch profile references are incomplete');
  for (const related of related_profiles) {
    if (json(related?.request) !== json(request)) continue;
    const profile = related.profile ?? related.policy;
    const github = profile?.github;
    if (
      profile?.issuer !== 'github-actions' ||
      (!related.profile && profile.purpose !== 'formation-only') ||
      profile.repository_id !== request.repository_id ||
      JSON.stringify(profile.project_ids) !== JSON.stringify(request.project_ids) ||
      profile.target !== request.target ||
      github?.source_commit !== sourceCommit ||
      github?.workflow_id !== value.workflow_id ||
      !Number.isSafeInteger(github?.repository_id) ||
      typeof github.repository !== 'string' ||
      github.repository.length === 0
    )
      continue;
    matchingProfiles.push({ repository_id: github.repository_id, workflow_id: github.workflow_id });
  }
  const uniqueProfiles = new Map(matchingProfiles.map((profile) => [JSON.stringify(profile), profile]));
  if (uniqueProfiles.size !== 1)
    throw new Error('legacy dispatch intent lacks one retained matching source profile');
  const [profile] = uniqueProfiles.values();
  const knownRunId = value.actual_terminal_run_id ?? value.terminal_run_id ?? value.provider_run_id;
  if (knownRunId !== undefined && !/^\d+$/.test(String(knownRunId)))
    throw new Error('legacy dispatch terminal run ID is invalid');
  return {
    reference_path,
    request_id: request.request_id,
    source_commit: sourceCommit,
    repository_id: profile.repository_id,
    workflow_id: profile.workflow_id,
    issued_at: new Date(issuedAt).toISOString(),
    prior_run_ids: priorRunIds.map(String),
    known_run_id: knownRunId === undefined ? null : String(knownRunId),
  };
}

function readLegacyDispatchIntent(root, request, relative, relatedReferences) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('legacy dispatch reference is unsafe');
  const value = JSON.parse(readFileSync(file, 'utf8'));
  const relatedProfiles = [];
  for (const relatedPath of relatedReferences) {
    if (relatedPath === relative) continue;
    const relatedFile = releasePath(root, relatedPath),
      relatedStat = lstatSync(relatedFile);
    if (!relatedStat.isFile() || relatedStat.size > 8 * 1024 * 1024)
      throw new Error('legacy dispatch profile reference is unsafe');
    relatedProfiles.push(JSON.parse(readFileSync(relatedFile, 'utf8')));
  }
  return normalizeLegacyReleaseDispatchIntent({
    request,
    reference_path: relative,
    value,
    related_profiles: relatedProfiles,
  });
}

function readDispositionDispatchIntent(root, request, relative, relatedReferences) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('dispatch reference is unsafe');
  const value = JSON.parse(readFileSync(file, 'utf8'));
  if (value?.status === 'ISSUED_ONCE') return readIssuedDispatchIntent(root, request, relative);
  if (value?.status === 'issued-once-no-automatic-retry')
    return readLegacyDispatchIntent(root, request, relative, relatedReferences);
  throw new Error('dispatch reference is not a supported retained issued intent');
}

function matchesDispatchIntentRun(intent, run, lowerWindow, upperWindow) {
  const createdAt = Date.parse(run?.created_at);
  return (
    run?.kind === 'ACTUAL_PROVIDER_OBSERVATION' &&
    run?.head_sha === intent.source_commit &&
    run?.repository_id === intent.repository_id &&
    run?.workflow_id === intent.workflow_id &&
    !intent.prior_run_ids.includes(String(run.run_id)) &&
    (!intent.known_run_id || intent.known_run_id === String(run.run_id)) &&
    Number.isFinite(createdAt) &&
    createdAt >= lowerWindow &&
    createdAt <= upperWindow
  );
}

export function joinReleaseDispatchIntents({ request_id, issued_intents, runs, observed_at }) {
  try {
    if (
      typeof request_id !== 'string' ||
      !Array.isArray(issued_intents) ||
      !Array.isArray(runs) ||
      !Number.isFinite(Date.parse(observed_at))
    )
      throw new Error('dispatch join identity or observations are incomplete');
    if (issued_intents.some((intent) => intent?.request_id !== request_id))
      throw new Error('dispatch intent belongs to another request');
    const sortedIntents = issued_intents
      .map((intent) => ({ ...intent, issued_ms: Date.parse(intent.issued_at) }))
      .sort((left, right) => left.issued_ms - right.issued_ms || left.reference_path.localeCompare(right.reference_path));
    if (
      sortedIntents.some(
        (intent) =>
          typeof intent.reference_path !== 'string' ||
          !commitPattern.test(intent.source_commit ?? '') ||
          !Number.isSafeInteger(intent.repository_id) ||
          !Number.isSafeInteger(intent.workflow_id) ||
          !Array.isArray(intent.prior_run_ids) ||
          intent.prior_run_ids.some((id) => typeof id !== 'string' || !/^\d+$/.test(id)) ||
          new Set(intent.prior_run_ids).size !== intent.prior_run_ids.length ||
          !Number.isFinite(intent.issued_ms),
      ) ||
      new Set(sortedIntents.map((intent) => intent.reference_path)).size !== sortedIntents.length
    )
      throw new Error('dispatch intent set is invalid or duplicated');
    for (let index = 0; index < sortedIntents.length - 1; index++) {
      const current = sortedIntents[index];
      const next = sortedIntents[index + 1];
      if (
        current.issued_ms === next.issued_ms &&
        current.source_commit === next.source_commit &&
        current.repository_id === next.repository_id &&
        current.workflow_id === next.workflow_id &&
        (!current.known_run_id || current.known_run_id === next.known_run_id)
      )
        throw new Error('same-source dispatch intents have no unique issue-time or terminal-run binding');
    }
    const actualRunIds = runs.map((run) => String(run?.run_id));
    if (new Set(actualRunIds).size !== actualRunIds.length) throw new Error('actual provider run set is duplicated');
    const assignedRunIds = new Set();
    const unmatchedIntentPaths = [];
    const assignments = [];
    const observationMs = Date.parse(observed_at);
    for (const run of runs) {
      const plausibleIntents = sortedIntents.filter((intent) =>
        matchesDispatchIntentRun(intent, run, intent.issued_ms - 5000, observationMs + 1000),
      );
      if (plausibleIntents.length > 1)
        throw new Error('actual provider run is ambiguous across issued dispatch time windows');
    }
    for (let index = 0; index < sortedIntents.length; index++) {
      const intent = sortedIntents[index];
      // The issue record follows the dispatch call; GitHub timestamps the run at whole-second precision.
      const lowerWindow = intent.issued_ms - 5000;
      const next = sortedIntents[index + 1];
      const upperWindow = next ? next.issued_ms - 5000 : observationMs + 1000;
      const candidates = runs.filter((run) => matchesDispatchIntentRun(intent, run, lowerWindow, upperWindow));
      if (candidates.length > 1) throw new Error('dispatch intent matches more than one actual provider run');
      if (candidates.length === 0) {
        unmatchedIntentPaths.push(intent.reference_path);
        continue;
      }
      const run = candidates[0];
      if (assignedRunIds.has(String(run.run_id)))
        throw new Error('one actual provider run matches multiple dispatch intents');
      assignedRunIds.add(String(run.run_id));
      assignments.push({
        reference_path: intent.reference_path,
        run_id: String(run.run_id),
        source_commit: intent.source_commit,
        repository_id: intent.repository_id,
        workflow_id: intent.workflow_id,
      });
    }
    const orphanRunIds = actualRunIds.filter((runId) => !assignedRunIds.has(runId));
    if (orphanRunIds.length)
      throw new Error(`actual provider run ${orphanRunIds.join(', ')} has no unique issued dispatch intent`);
    return { status: 'eligible', assignments, unmatched_intent_paths: unmatchedIntentPaths };
  } catch (error) {
    return { status: 'blocked', blockers: [error.message] };
  }
}

function pendingDispositionUnlocked(root, actualCensus) {
  let mutex;
  try {
    releasePath(root, '.agent/work/agent-local-release');
    const pendingFile = releasePath(root, '.agent/work/agent-local-release/pending.json');
    const successFile = releasePath(root, '.agent/work/agent-local-release/successful.json');
    const pending = releaseState(pendingFile);
    const successful = releaseState(successFile);
    const journalFilePath = journalFile(root, pending.operation_id);
    const journal = releaseState(journalFilePath);
    const { value: manifestValue } = manifest(root);
    if (
      pending.operation_id === successful.operation_id ||
      pending.status !== 'awaiting_assurance' ||
      journal.status !== 'awaiting_assurance' ||
      pending.version !== successful.version ||
      pending.version !== manifestValue.version ||
      journal.operation_id !== pending.operation_id ||
      journal.version !== pending.version ||
      pending.install_started ||
      journal.install_started
    )
      throw new Error('only the exact same-baseline, uninstalled pending SDK operation can be disposed');
    successfulBaseline(root, successful);
    assertReleaseRetargetSettled(root, pending.operation_id);
    assertNativeDeliveryEvidenceRepairSettled(root, pending.operation_id);
    const workerFile = releasePath(
      root,
      `.agent/work/agent-local-release/${pending.operation_id}/worker.sqlite`,
      true,
    );
    if (!existsSync(workerFile)) throw new Error('pending operation lock state is missing; preserve UNKNOWN');
    mutex = operationMutex(root, pending.operation_id);
    if (!mutex) throw new Error('pending operation is active; preserve its exact retry');
    const formation = readConfirmedCIDeliveryFormation(root);
    if (formation?.operation_id === pending.operation_id)
      throw new Error('pending operation already has confirmed formation evidence');
    if (packedDistribution(journal.pack_metadata) !== 'npm')
      throw new Error('only the pending SDK archive can use this one-time disposition');
    const archive = selectedTarball(
      journal.pack_metadata,
      path.join(root, '.tmp/releases', pending.operation_id),
      pending.version,
    );
    const archiveBytes = readFileSync(archive);
    if (!journal.tarball_sha256 || sha(archiveBytes) !== journal.tarball_sha256)
      throw new Error('pending SDK archive differs from its exact recorded bytes');

    const ciRelative = `.agent/work/agent-local-release/${pending.operation_id}/ci`;
    const ciRoot = releasePath(root, ciRelative);
    const entries = readdirSync(ciRoot, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    if (entries.some((entry) => !entry.isDirectory() || !/^[a-f0-9]{64}$/.test(entry.name)))
      throw new Error('pending CI request namespace contains foreign entries');
    const localRequests = entries.map((entry) => {
      const requestRelative = ciRelative + '/' + entry.name + '/request.json';
      const requestFile = releasePath(root, requestRelative);
      const requestStat = lstatSync(requestFile);
      const childNames = readdirSync(path.dirname(requestFile)).sort();
      if (!requestStat.isFile() || requestStat.size > 8 * 1024 * 1024 || JSON.stringify(childNames) !== '["request.json"]')
        throw new Error('pending request custody contains a result or incomplete data');
      const request = JSON.parse(readFileSync(requestFile, 'utf8'));
      validateCIDeliveryRequest(request);
      if (
        request.request_id !== entry.name ||
        request.operation_id !== pending.operation_id ||
        request.version !== pending.version
      )
        throw new Error('pending request identity differs from its owner');
      return request;
    });
    const requestCensus = actualCensus?.requestCensus;
    const runObservations = actualCensus?.runObservations;
    if (
      requestCensus?.operation_id !== pending.operation_id ||
      requestCensus?.version !== pending.version ||
      runObservations?.operation_id !== pending.operation_id ||
      !Array.isArray(requestCensus.requests) ||
      !Array.isArray(runObservations.requests) ||
      !Number.isFinite(Date.parse(runObservations.observed_at))
    )
      throw new Error('actual pending request and provider observation census required');
    const noIssueRows = runObservations.no_issue_references ?? [];
    if (!Array.isArray(noIssueRows)) throw new Error('actual no-issue reference census is invalid');
    const supplementalDispatchRows = runObservations.dispatch_intents ?? [];
    if (!Array.isArray(supplementalDispatchRows)) throw new Error('supplemental dispatch reference census is invalid');
    const supplementalDispatchById = new Map();
    const supplementalDispatchKeys = new Set();
    for (const reference of supplementalDispatchRows) {
      if (
        !reference ||
        typeof reference.request_id !== 'string' ||
        typeof reference.reference_path !== 'string' ||
        reference.kind !== 'RETAINED_DISPATCH_INTENT'
      )
        throw new Error('supplemental dispatch reference lacks retained intent identity');
      const key = reference.request_id + '\0' + reference.reference_path;
      if (supplementalDispatchKeys.has(key)) throw new Error('duplicate supplemental dispatch reference');
      supplementalDispatchKeys.add(key);
      const paths = supplementalDispatchById.get(reference.request_id) ?? [];
      paths.push(reference.reference_path);
      supplementalDispatchById.set(reference.request_id, paths);
    }
    const noIssueByKey = new Map();
    for (const observation of noIssueRows) {
      if (
        !observation ||
        typeof observation.request_id !== 'string' ||
        typeof observation.reference_path !== 'string' ||
        observation.kind !== 'ACTUAL_PROVIDER_OBSERVATION' ||
        observation.status !== 'no_issue' ||
        !Number.isFinite(Date.parse(observation.observed_at))
      )
        throw new Error('no-issue reference lacks an actual terminal provider observation');
      const key = observation.request_id + '\0' + observation.reference_path;
      if (noIssueByKey.has(key)) throw new Error('duplicate no-issue reference observation');
      noIssueByKey.set(key, observation);
    }
    const usedNoIssueKeys = new Set();
    const censusById = new Map(requestCensus.requests.map((row) => [row?.request_id, row]));
    const observationsById = new Map(runObservations.requests.map((row) => [row?.request_id, row]));
    if (
      censusById.size !== requestCensus.requests.length ||
      observationsById.size !== runObservations.requests.length ||
      !sameIds([...censusById.keys()], localRequests.map((request) => request.request_id)) ||
      !sameIds([...observationsById.keys()], localRequests.map((request) => request.request_id)) ||
      [...supplementalDispatchById.keys()].some((requestId) => !localRequests.some((request) => request.request_id === requestId))
    )
      throw new Error('actual census does not cover the exact pending request set');

    const normalized = localRequests.map((request) => {
      const censusRow = censusById.get(request.request_id);
      const observationRow = observationsById.get(request.request_id);
      if (censusRow.target !== request.target) throw new Error('request census target differs from retained request');
      const references = referencePaths(censusRow, observationRow);
      if (!Array.isArray(censusRow.references) || censusRow.references.some((reference) => !Array.isArray(reference.run_ids ?? [])))
        throw new Error('request reference run set is invalid');
      const supplementalPaths = supplementalDispatchById.get(request.request_id) ?? [];
      if (supplementalPaths.some((referencePath) => references.includes(referencePath)))
        throw new Error('supplemental dispatch reference duplicates a retained request reference');
      const issuedIntentPaths = censusRow.references
        .filter((reference) => reference.status === 'ISSUED_ONCE')
        .map((reference) => reference.path)
        .concat(supplementalPaths);
      if (new Set(issuedIntentPaths).size !== issuedIntentPaths.length)
        throw new Error('issued dispatch reference set is duplicated');
      const dispatchReferences = [...references, ...supplementalPaths];
      const issuedIntents = issuedIntentPaths.map((referencePath) =>
        readDispositionDispatchIntent(root, request, referencePath, dispatchReferences),
      );
      const referenceRunIds = [...new Set(censusRow.references.flatMap((reference) => reference.run_ids ?? []))];
      const runs = observationRow.runs;
      if (!Array.isArray(runs) || !sameIds(referenceRunIds, runs.map((run) => String(run?.run_id))))
        throw new Error('provider runs do not match the exact retained request references');
      const joined = joinReleaseDispatchIntents({
        request_id: request.request_id,
        issued_intents: issuedIntents,
        runs,
        observed_at: runObservations.observed_at,
      });
      if (joined.status !== 'eligible')
        throw new Error(`request ${request.request_id}: ${joined.blockers[0]}`);
      const noIssueReferencePaths = [];
      for (const referencePath of joined.unmatched_intent_paths) {
        const key = request.request_id + '\0' + referencePath;
        const noIssue = noIssueByKey.get(key);
        const intent = issuedIntents.find((item) => item.reference_path === referencePath);
        if (
          !noIssue ||
          !intent ||
          Date.parse(noIssue.observed_at) < Date.parse(intent.issued_at) ||
          Date.parse(noIssue.observed_at) > Date.parse(runObservations.observed_at)
        )
          throw new Error(
            `request ${request.request_id} dispatch ${referencePath} has no matching actual run or no-issue observation; preserve UNKNOWN`,
          );
        noIssueReferencePaths.push(referencePath);
        usedNoIssueKeys.add(key);
      }
      for (const key of noIssueByKey.keys()) {
        if (key.startsWith(request.request_id + '\0') && !issuedIntentPaths.includes(key.slice(request.request_id.length + 1)))
          throw new Error('no-issue observation is not bound to a retained issued dispatch intent');
      }
      if (runs.length === 0) {
        if (
          joined.unmatched_intent_paths.length !== issuedIntents.length ||
          (!noIssueReferencePaths.length &&
            !censusRow.references.some((reference) => ['NO_ISSUE', 'NOT_ISSUED'].includes(reference.status)))
        )
          throw new Error('request has no provider result and no explicit no-issue evidence');
        return {
          request_id: request.request_id,
          no_issue: true,
          source_commit: null,
          references: dispatchReferences,
          no_issue_reference_paths: noIssueReferencePaths,
          runs: [],
        };
      }
      const assignmentByRunId = new Map(joined.assignments.map((assignment) => [assignment.run_id, assignment]));
      return {
        request_id: request.request_id,
        no_issue: false,
        source_commit: null,
        references: dispatchReferences,
        no_issue_reference_paths: noIssueReferencePaths,
        runs: runs.map((run) => {
          const assignment = assignmentByRunId.get(String(run.run_id));
          if (!assignment) throw new Error('actual provider run has no exact dispatch-intent join');
          return {
            ...run,
            run_id: String(run.run_id),
            source_commit: assignment.source_commit,
            dispatch_reference_path: assignment.reference_path,
          };
        }),
      };
    });
    if (usedNoIssueKeys.size !== noIssueByKey.size)
      throw new Error('no-issue observations are not in one-to-one custody with unmatched issued intents');
    const census = {
      operation_id: pending.operation_id,
      version: pending.version,
      observed_at: runObservations.observed_at,
      requests: normalized,
    };
    const classified = classifyReleaseDispositionCensus({
      operation_id: pending.operation_id,
      version: pending.version,
      request_ids: localRequests.map((request) => request.request_id),
      actual_census: census,
    });
    if (classified.status !== 'eligible') throw new Error(classified.blockers[0]);
    const body = {
      schema: 'VidaLocalReleaseDispositionReceipt/v1',
      authority: 'local_consistency_only',
      operation_id: pending.operation_id,
      version: pending.version,
      baseline_operation_id: successful.operation_id,
      baseline_version: successful.version,
      pending_pointer_sha256: sha(readFileSync(pendingFile)),
      successful_pointer_sha256: sha(readFileSync(successFile)),
      archive_sha256: sha(archiveBytes),
      census_sha256: sha(json(census)),
      observed_at: census.observed_at,
      request_count: classified.request_count,
      terminal_success_count: classified.terminal_success_count,
      terminal_failure_count: classified.terminal_failure_count,
      no_issue_count: classified.no_issue_count,
      requests: classified.requests,
      no_issue_references: classified.requests.flatMap((request) =>
        request.no_issue_reference_paths.map((reference_path) => ({ request_id: request.request_id, reference_path })),
      ),
    };
    return {
      schema: 'VidaLocalReleaseDispositionProposal/v1',
      status: 'eligible',
      receipt: { ...body, digest: sha(json(body)) },
      census: actualCensus,
    };
  } catch (error) {
    return {
      schema: 'VidaLocalReleaseDispositionProposal/v1',
      status: 'blocked',
      blockers: [error.message],
    };
  } finally {
    mutex?.close();
  }
}

export async function pendingReleaseDispositionReceipt(root = repositoryRoot, actualCensus) {
  try {
    const admissionFile = releasePath(root, '.agent/work/agent-local-release/admission.sqlite', true);
    if (!existsSync(admissionFile)) throw new Error('release admission lock state is missing; preserve UNKNOWN');
    return await withReleaseAdmission(root, () => pendingDispositionUnlocked(root, actualCensus));
  } catch (error) {
    return {
      schema: 'VidaLocalReleaseDispositionProposal/v1',
      status: 'blocked',
      blockers: [error.message],
    };
  }
}
function writeDispositionReceipt(root, operation, receipt) {
  const relative = `.agent/work/agent-local-release/${operation}/disposition.json`;
  const file = releasePath(root, relative, true);
  const descriptor = openSync(file, 'wx', 0o600);
  try {
    writeFileSync(descriptor, json(receipt));
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}
export function reserveReleaseWorker(root, operation, launch) {
  return withReleaseAdmission(root, () => {
    assertReleaseRetargetSettled(root, operation);
    const current = releaseState(journalFile(root, operation));
    const mutex = operationMutex(root, operation);
    if (!mutex) return current;
    mutex.close();
    const pid = launch();
    if (!Number.isInteger(pid) || pid < 1) throw new Error('Release worker did not start.');
    const result = { ...current, pid, status: 'running' };
    save(journalFile(root, operation), result);
    return result;
  });
}
export function claimReleaseWorker(root, operation, pid) {
  return withReleaseAdmission(root, () => {
    assertReleaseRetargetSettled(root, operation);
    const current = releaseState(journalFile(root, operation));
    if (current.pid !== pid) throw new Error('Release worker reservation differs.');
    const mutex = operationMutex(root, operation);
    if (!mutex) throw new Error('Release operation already has an active worker.');
    try {
      save(journalFile(root, operation), { ...current, status: 'running' });
      return mutex;
    } catch (error) {
      mutex.close();
      throw error;
    }
  });
}
export function prepareRelease(root = repositoryRoot, selection = { mode: 'patch' }) {
  return withReleaseAdmission(root, () => prepareCandidate(root, false, selection));
}
export async function prepareReleaseAfterDisposition(
  root = repositoryRoot,
  selection = { mode: 'patch' },
  proposal,
) {
  return withReleaseAdmission(root, () => prepareCandidate(root, false, selection, proposal));
}
export function prepareSystemUpdate(root = repositoryRoot) {
  return withReleaseAdmission(root, () => prepareCandidate(root, true));
}
function successfulBaseline(root, successful) {
  if (!successful || successful.status !== 'successful')
    throw new Error('Release version selection requires a successful baseline.');
  const completed = releaseState(journalFile(root, successful.operation_id));
  if (
    completed.operation_id !== successful.operation_id ||
    completed.version !== successful.version ||
    completed.status !== 'successful'
  )
    throw new Error('Successful baseline differs from its operation journal.');
}
function preflightSystemUpdate(root, currentVersion, pending, successful) {
  if (successful) successfulBaseline(root, successful);
  if (pending) {
    const completed = releaseState(journalFile(root, pending.operation_id));
    if (completed.operation_id !== pending.operation_id || completed.version !== pending.version)
      throw new Error('Pending system update differs from its operation journal.');
    if (pending.version !== currentVersion) throw new Error('Pending system update differs from manifest.');
    // Only existing exact successful-receipt reconciliation may repair an unpublished baseline.
    if (pending.operation_id !== successful?.operation_id && completed.status === 'successful') return;
  }
  if (!successful || successful.version !== currentVersion)
    throw new Error('System update must preserve the successful manifest version.');
}
function prepareCandidate(root, systemUpdate = false, selection = { mode: 'patch' }, dispositionProposal) {
  const releases = directory(root, '.agent/work/agent-local-release');
  const pendingFile = path.join(releases, 'pending.json');
  const successFile = path.join(releases, 'successful.json');
  const { file, value } = manifest(root);
  let successful = existsSync(successFile) ? releaseState(successFile) : null;
  const pending = existsSync(pendingFile) ? releaseState(pendingFile) : null;
  if (successful) successfulBaseline(root, successful);
  if (systemUpdate) preflightSystemUpdate(root, value.version, pending, successful);
  if (pending) assertReleaseRetargetSettled(root, pending.operation_id);
  if (pending && pending.operation_id !== successful?.operation_id) {
    const completedFile = journalFile(root, pending.operation_id);
    if (existsSync(completedFile)) {
      const completed = releaseState(completedFile);
      if (completed.status === 'successful') {
        const archive = selectedTarball(
          completed.pack_metadata,
          path.join(root, '.tmp/releases', pending.operation_id),
          pending.version,
        );
        const distribution = packedDistribution(completed.pack_metadata);
        const installedManifestBytes =
          distribution === 'npm' &&
          completed.pack_metadata[0].files.some((file) => file.path === 'tooling/pack-sdk.mjs')
            ? sdkCompatibilityManifest({ root: path.join(root, 'packages/agent') }).bytes
            : undefined;
        const archiveMatches = sha(readFileSync(archive)) === completed.tarball_sha256;
        let installedMatches = false;
        if (archiveMatches) {
          try {
            verifyInstalledTree(root, completed.pack_metadata, completed.installed_root, {
              distribution,
              expectedManifestBytes: installedManifestBytes,
            });
            installedMatches = true;
          } catch {
            installedMatches = false;
          }
        }
        const exact = archiveMatches && installedMatches;
        if (!exact) throw new Error('Completed publication must be reconciled against installed bytes.');
        save(successFile, completed);
        successful = completed;
      }
    }
  }
  let dispositionReceipt;
  if (dispositionProposal) {
    if (dispositionProposal.status !== 'eligible' || !dispositionProposal.census)
      throw new Error('A current eligible pending disposition proposal is required.');
    const verified = pendingDispositionUnlocked(root, {
      requestCensus: dispositionProposal.census.requestCensus,
      runObservations: dispositionProposal.census.runObservations,
    });
    if (
      verified.status !== 'eligible' ||
      verified.receipt.digest !== dispositionProposal.receipt?.digest
    )
      throw new Error('Pending disposition evidence changed; preserve the existing operation.');
    dispositionReceipt = verified.receipt;
  }
  if (pending && pending.operation_id !== successful?.operation_id) {
    if (pending.version !== value.version) throw new Error('Pending candidate differs from manifest.');
    directory(root, `.tmp/releases/${pending.operation_id}`);
    const pendingJournal = journalFile(root, pending.operation_id);
    if (!existsSync(pendingJournal))
      throw new Error('Pending release journal missing; reconcile without repeating effects.');
    const currentPending = releaseState(pendingJournal);
    if (currentPending.operation_id !== pending.operation_id || currentPending.version !== pending.version)
      throw new Error('Pending release differs from its operation journal; preserve its exact operation.');
    const retry = pendingBuildRetry(pending, successful, selection, dispositionReceipt);
    if (retry) return systemUpdate ? currentPending : retry;
  }
  const formation = readConfirmedCIDeliveryFormation(root);
  const confirmed = confirmedVersionBaseline(successful, formation);
  const selectedVersion = systemUpdate ? value.version : candidateVersion(value.version, confirmed?.version, selection);
  if (systemUpdate) {
    successful = releaseState(successFile);
    successfulBaseline(root, successful);
    if (successful.version !== value.version) throw new Error('System update baseline version differs from manifest.');
  }
  if (!systemUpdate && confirmed && value.version !== confirmed.version)
    throw new Error('Manifest version differs from the last confirmed formation; reconcile the pending operation first.');
  const version = selectedVersion;
  if (value.version !== version) save(file, { ...value, version });
  const operation_id = `local-${randomUUID()}`;
  directory(root, `.tmp/releases/${operation_id}`);
  directory(root, `.agent/work/agent-local-release/${operation_id}`);
  if (dispositionReceipt) writeDispositionReceipt(root, operation_id, dispositionReceipt);
  const prepared = {
    schema: 'VidaLocalReleaseState/v1',
    operation_id,
    version,
    status: 'awaiting_assurance',
  };
  save(pendingFile, prepared);
  save(journalFile(root, operation_id), prepared);
  return prepared;
}
export function runCommand(command, args, { cwd, env = process.env, log, windowsVerbatimArguments = false } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      shell: false,
      windowsVerbatimArguments,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (bytes) => {
      stdout += bytes;
    });
    child.stderr.on('data', (bytes) => {
      stderr += bytes;
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      const result = {
        command,
        args,
        code,
        signal,
        elapsed_ms: Date.now() - started,
        stdout,
        stderr,
      };
      if (log) writeFileSync(log, json(result));
      if (code !== 0 || signal)
        reject(
          new Error(
            `Command failed: ${args.join(' ')} (${code ?? signal})\nstderr:\n${stderr.slice(-2048)}\nstdout:\n${stdout.slice(-2048)}`,
          ),
        );
      else resolve(stdout.trim());
    });
  });
}
export function parsePackOutput(output) {
  const text = output.trim();
  if (text.startsWith('[')) return JSON.parse(text);
  const boundary = text.indexOf('\n[');
  if (boundary < 0) throw new Error('npm pack metadata array missing.');
  const event = JSON.parse(text.slice(0, boundary));
  if (
    event.schema !== 'CandidatePackageBuild/v1' ||
    event.test_issuers_shipped !== false ||
    !Array.isArray(event.production_entrypoints) ||
    !Number.isInteger(event.schemas) ||
    event.schemas < 1 ||
    Object.keys(event).sort().join() !==
      ['schema', 'production_entrypoints', 'test_issuers_shipped', 'schemas'].sort().join()
  )
    throw new Error('Unknown npm prepack event.');
  return JSON.parse(text.slice(boundary + 1));
}
function sdkManifest(root) {
  return sdkCompatibilityManifest({ root: path.join(root, 'packages/agent') }).bytes;
}
export async function verifyPackedSources(root, metadata, tarball, npmCli, expectedManifest) {
  const tar = createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar');
  const expected = new Set(metadata[0].files.map((entry) => 'package/' + entry.path));
  const seen = new Set(),
    errors = [];
  await tar.t({
    file: tarball,
    strict: true,
    onReadEntry(entry) {
      if (entry.type === 'Directory') return;
      if (entry.type !== 'File' || !expected.has(entry.path) || seen.has(entry.path)) {
        errors.push('Archive entry differs from exact npm file set.');
        return;
      }
      seen.add(entry.path);
      const chunks = [];
      entry.on('data', (chunk) => chunks.push(chunk));
      entry.on('end', () => {
        const source = path.join(root, 'packages/agent', entry.path.slice('package/'.length));
        if (
          !existsSync(source) ||
          lstatSync(source).isSymbolicLink() ||
          !Buffer.concat(chunks).equals(
            entry.path === 'package/package.json' && expectedManifest ? expectedManifest : readFileSync(source),
          )
        )
          errors.push('Current packaged bytes differ: ' + entry.path);
      });
    },
  });
  if (errors.length || seen.size !== expected.size) throw new Error(errors[0] ?? 'Archive file set incomplete.');
}
function nativePath(file, create = false) {
  if (!path.isAbsolute(file)) throw new Error('Native installation path must be absolute.');
  let current = path.parse(file).root;
  for (const part of file.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (create && !existsSync(current)) mkdirSync(current);
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Native installation directory must not be linked.');
  }
}

export function nativeInstallationPaths({ version, operation, target, env = process.env }) {
  if (
    !parseReleaseVersion(version) ||
    !idPattern.test(operation) ||
    typeof target !== 'string' ||
    !target.startsWith('bun-' + process.platform.replace('win32', 'windows') + '-' + process.arch)
  )
    throw new Error('Native installation identity or target differs.');
  const base =
    process.platform === 'win32'
      ? env.LOCALAPPDATA
      : (env.XDG_DATA_HOME ?? path.join(env.HOME ?? homedir(), '.local', 'share'));
  if (typeof base !== 'string' || !path.isAbsolute(base) || /[\r\n\0]/.test(base))
    throw new Error('Native user installation root unavailable.');
  const product =
    process.platform === 'win32' ? path.join(base, 'Programs', 'vida-agent') : path.join(base, 'vida-agent');
  const prefix = path.join(product, 'bin');
  return {
    installed_root: path.join(product, 'releases', version + '-' + operation, 'package'),
    prefix,
    path_command: path.join(prefix, process.platform === 'win32' ? 'vida-agent.exe' : 'vida-agent'),
  };
}

/** First publication is exclusive; replacement is allowed only against an exact prior successful asset. */
export function publishNativeExecutable(asset, destination, prior = null) {
  nativePath(path.dirname(asset.path));
  const source = lstatSync(asset.path),
    bytes = readFileSync(asset.path);
  if (
    !source.isFile() ||
    source.isSymbolicLink() ||
    source.nlink !== 1 ||
    bytes.length !== asset.bytes ||
    sha(bytes) !== asset.sha256
  )
    throw new Error('Native source asset differs.');
  nativePath(path.dirname(destination), true);
  const before = existsSync(destination) ? lstatSync(destination) : null;
  let priorBytes;
  if (before) {
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || !prior || prior.path !== destination)
      throw new Error('Native destination has an unowned or linked prior artifact.');
    priorBytes = readFileSync(destination);
    if (priorBytes.length !== prior.bytes || sha(priorBytes) !== prior.sha256)
      throw new Error('Prior native artifact differs.');
  } else if (prior) throw new Error('Prior native artifact disappeared.');
  const pending = destination + '.' + randomUUID() + '.pending';
  let descriptor;
  try {
    descriptor = openSync(pending, 'wx', 0o755);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    if (priorBytes) {
      const current = lstatSync(destination);
      if (
        !current.isFile() ||
        current.isSymbolicLink() ||
        current.nlink !== 1 ||
        current.ino !== before.ino ||
        !readFileSync(destination).equals(priorBytes)
      )
        throw new Error('Prior native artifact changed before publication.');
      renameSync(pending, destination);
    } else {
      copyFileSync(pending, destination, constants.COPYFILE_EXCL);
      unlinkSync(pending);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(pending)) unlinkSync(pending);
  }
}

function nativeAsset(root, metadata, operation) {
  const candidate = readNativeRetargetCandidate({ root, operation, published: true });
  if (json(metadata) !== json(candidate.pack_metadata)) throw Error('Native candidate metadata differs.');
  return candidate.asset;
}
async function extractNativeTree(root, metadata, tarball, npmCli, destination) {
  nativePath(path.dirname(destination), true);
  if (existsSync(destination)) throw new Error('Native release tree already exists; inspect uncertain installation.');
  mkdirSync(destination);
  const tar = createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar');
  const expected = new Set(nativeArchiveFiles(metadata).map((file) => 'package/' + file.path));
  await tar.x({
    file: tarball,
    cwd: destination,
    strip: 1,
    strict: true,
    filter(entry, info) {
      if (info.type === 'Directory') {
        if (
          !entry.startsWith('package/') ||
          entry.split('/').some((part) => part === '..' || part === '.' || part.includes(':') || part.includes('\\'))
        )
          throw new Error('Native extraction directory differs.');
        return true;
      }
      if (info.type !== 'File' || !expected.has(entry)) throw new Error('Native extraction entry differs.');
      return true;
    },
  });
  verifyInstalledTree(root, metadata, destination);
}

function verifyInstalledTree(root, metadata, destination, { distribution = 'native', expectedManifestBytes } = {}) {
  if (!['native', 'npm'].includes(distribution)) throw new Error('Installed package distribution is invalid.');
  nativePath(destination);
  const files = distribution === 'npm' ? npmArchiveFiles(metadata) : nativeArchiveFiles(metadata),
    expected = new Set(files.map((file) => file.path));
  const expectedDirectories = new Set();
  for (const file of files) {
    const parts = file.path.split('/');
    parts.pop();
    for (let index = 1; index <= parts.length; index++) expectedDirectories.add(parts.slice(0, index).join('/'));
  }
  const visit = (directory, relative = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = relative + entry.name,
        absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Installed ${distribution} tree contains a linked entry.`);
      if (distribution === 'npm' && relative === '' && entry.name === 'node_modules' && entry.isDirectory()) continue;
      if (entry.isDirectory()) {
        if (distribution === 'npm' && !expectedDirectories.has(name))
          throw new Error('Installed npm tree contains an unknown directory.');
        visit(absolute, name + '/');
      } else if (!entry.isFile() || !expected.has(name))
        throw new Error(`Installed ${distribution} tree contains an unknown entry.`);
    }
  };
  visit(destination);
  for (const file of files) {
    const target = path.join(destination, file.path);
    nativePath(path.dirname(target));
    const info = lstatSync(target);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      !readFileSync(target).equals(
        file.path === 'package.json' && expectedManifestBytes !== undefined
          ? expectedManifestBytes
          : readFileSync(path.join(root, 'packages/agent', file.path)),
      )
    )
      throw new Error(`Installed ${distribution} release tree differs.`);
  }
}

function nativeArchiveFiles(metadata) {
  const files = metadata[0]?.files;
  if (
    !Array.isArray(files) ||
    new Set(files.map((file) => file.path)).size !== files.length ||
    files.some(
      (file) =>
        typeof file.path !== 'string' ||
        file.path.includes('\\') ||
        file.path.startsWith('/') ||
        file.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')),
    )
  )
    throw new Error('Native archive paths differ.');
  return files;
}

function npmArchiveFiles(metadata) {
  const files = nativeArchiveFiles(metadata),
    paths = new Set(files.map((file) => (process.platform === 'win32' ? file.path.toLowerCase() : file.path)));
  if (!paths.has('package.json')) throw new Error('Installed npm archive manifest is missing.');
  if ([...paths].some((relative) => relative === 'node_modules' || relative.startsWith('node_modules/')))
    throw new Error('npm-managed dependencies cannot be archive-owned package entries.');
  return files;
}

function nativePathCommand(pathValue) {
  for (const folder of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const filename of process.platform === 'win32'
      ? ['vida-agent.com', 'vida-agent.exe', 'vida-agent.bat', 'vida-agent.cmd']
      : ['vida-agent']) {
      const file = path.join(folder, filename);
      if (existsSync(file)) return file;
    }
  }
  throw new Error('Native command is absent from PATH.');
}

async function priorNativeAsset(root, prior, relative, destination, npmCli) {
  if (
    !prior ||
    prior.path_command !== destination ||
    !prior.installed_root ||
    !prior.pack_metadata?.[0]?.files.some((file) => file.path === relative)
  )
    return null;
  const archive = selectedTarball(
    prior.pack_metadata,
    path.join(root, '.tmp/releases', prior.operation_id),
    prior.version,
  );
  if (sha(readFileSync(archive)) !== prior.tarball_sha256) throw new Error('Prior native archive differs.');
  let bytes;
  await createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar').t({
    file: archive,
    strict: true,
    onReadEntry(entry) {
      if (entry.path !== 'package/' + relative) return;
      if (entry.type !== 'File' || bytes) throw new Error('Prior native archive asset differs.');
      const chunks = [];
      entry.on('data', (chunk) => chunks.push(chunk));
      entry.on('end', () => {
        bytes = Buffer.concat(chunks);
      });
    },
  });
  if (!bytes) throw new Error('Prior native asset is absent from its archive.');
  return { path: destination, bytes: bytes.length, sha256: sha(bytes) };
}

async function installNativeRelease({ root, state, value, metadata, tarball, npmCli, env, command, folder, update }) {
  const asset = nativeAsset(root, metadata, state.operation_id);
  const locations = nativeInstallationPaths({
    version: value.version,
    operation: state.operation_id,
    target: asset.target,
    env,
  });
  if (
    state.install_started &&
    ['installed_root', 'prefix', 'path_command'].some((key) => state[key] !== locations[key])
  )
    throw new Error('Recorded native installation targets differ; inspect before retry.');
  if (state.install_started) {
    verifyInstalledTree(root, metadata, locations.installed_root);
    nativePath(locations.prefix);
    const info = lstatSync(locations.path_command);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      sha(readFileSync(locations.path_command)) !== asset.sha256
    )
      throw new Error(
        'Prior native install outcome differs or remains uncertain; inspect before retrying installation.',
      );
  } else {
    const successfulFile = path.join(root, '.agent/work/agent-local-release/successful.json');
    const prior = existsSync(successfulFile) ? releaseState(successfulFile) : null;
    const priorAsset = await priorNativeAsset(root, prior, asset.relative, locations.path_command, npmCli);
    update('installing', { ...locations, install_started: true });
    await extractNativeTree(root, metadata, tarball, npmCli, locations.installed_root);
    publishNativeExecutable(
      { ...asset, path: path.join(locations.installed_root, asset.relative) },
      locations.path_command,
      priorAsset,
    );
  }
  const unrelated = directory(root, `.tmp/releases/${state.operation_id}/unrelated-cwd`);
  const nativeEnv = { ...env };
  for (const key of Object.keys(nativeEnv))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE', 'BUN_BE_BUN'].includes(
        key.toUpperCase(),
      )
    )
      delete nativeEnv[key];
  const invoke = (args, label) =>
    command(locations.path_command, args, {
      cwd: unrelated,
      env: nativeEnv,
      log: path.join(folder, label + '.json'),
    });
  const version = JSON.parse(await invoke(['version'], 'native-version'));
  if (version.name !== 'vida-agent' || version.version !== value.version)
    throw new Error('Installed native version differs.');
  const instruction = JSON.parse(
    await invoke(['instructions', '--path', 'development-lifecycle'], 'native-instructions'),
  );
  if (instruction.version !== value.version || !path.isAbsolute(instruction.path))
    throw new Error('Installed native instruction identity differs.');
  nativePath(path.dirname(instruction.path));
  const instructionInfo = lstatSync(instruction.path);
  if (
    !instructionInfo.isFile() ||
    instructionInfo.isSymbolicLink() ||
    instructionInfo.nlink !== 1 ||
    !readFileSync(instruction.path).equals(
      readFileSync(path.join(locations.installed_root, 'instructions/development-lifecycle.md')),
    )
  )
    throw new Error('Installed native instruction discovery differs.');
  const check = JSON.parse(await invoke(['install', '--check'], 'native-check'));
  if (check.status !== 'prerequisites_valid' || check.bun_pin !== '1.4.2' || check.runtime !== 'embedded')
    throw new Error('Installed native prerequisite check differs.');
  if (process.platform === 'win32') {
    const powershell = path.join(
      process.env.SystemRoot ?? 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe',
    );
    const runPathScript = (script, label) =>
      command(
        powershell,
        ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
        { cwd: unrelated, env, log: path.join(folder, label + '.json') },
      );
    const current = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','User'))",
        'native-path-observe',
      ),
    );
    const entries = current.split(';').filter(Boolean);
    if (!entries.some((entry) => entry.toLowerCase() === locations.prefix.toLowerCase())) {
      const literal = (text) => "'" + text.replaceAll("'", "''") + "'";
      const next = [locations.prefix, ...entries].join(';');
      await runPathScript(
        "if([string][Environment]::GetEnvironmentVariable('Path','User') -cne " +
          literal(current) +
          ") { throw 'User PATH changed; inspect before retry' }; [Environment]::SetEnvironmentVariable('Path'," +
          literal(next) +
          ",'User')",
        'native-path-publish',
      );
    }
    const observed = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','User'))",
        'native-path-verify',
      ),
    );
    if (!observed.split(';').some((entry) => entry.toLowerCase() === locations.prefix.toLowerCase()))
      throw new Error('Native user PATH publication remains uncertain.');
    const machine = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','Machine'))",
        'native-machine-path-observe',
      ),
    );
    if (
      path.resolve(nativePathCommand(machine + ';' + observed)).toLowerCase() !== locations.path_command.toLowerCase()
    )
      throw new Error(
        'An earlier system PATH command shadows the native user command; preserve it and reconcile PATH.',
      );
  } else {
    const pathValue = Object.entries(env).find(([key]) => key === 'PATH')?.[1] ?? '';
    if (!pathValue.split(path.delimiter).includes(locations.prefix))
      throw new Error('Native prefix must be present in the user PATH before Unix installation can complete.');
    if (path.resolve(nativePathCommand(pathValue)) !== locations.path_command)
      throw new Error('An earlier PATH command shadows the native user command.');
  }
  return locations;
}
export async function executeRelease({
  root = repositoryRoot,
  operation,
  qualify,
  ci,
  packOnly = false,
  distribution,
  command = runCommand,
  npmCli,
  env = process.env,
}) {
  if (!idPattern.test(operation)) throw new Error('Release operation ID invalid.');
  assertReleaseRetargetSettled(root, operation);
  if (distribution !== undefined && !['npm', 'native'].includes(distribution))
    throw new Error('Release distribution invalid.');
  if (packOnly && distribution !== 'npm')
    throw Error('Native formation belongs to the CI producer; import its exact candidate through supported staging.');
  if (distribution === 'npm') npmCli ??= findNpmCli();
  const folder = directory(root, `.tmp/releases/${operation}`);
  const stateFile = journalFile(root, operation);
  let state = releaseState(stateFile);
  const pending = releaseState(path.join(root, '.agent/work/agent-local-release/pending.json'));
  const { value } = manifest(root);
  if (pending.operation_id !== operation || state.operation_id !== operation || state.version !== value.version)
    throw new Error('Release candidate is not current.');
  if (!packOnly) {
    if (distribution === 'npm' || (state.pack_metadata && packedDistribution(state.pack_metadata) !== 'native'))
      throw new Error('SDK archives are library-only; public agent installation requires a qualified native asset.');
    if (!state.pack_metadata) throw new Error('Candidate must be packed after tests and before independent assurance.');
  }
  const started = Date.now();
  const update = (status, extra = {}) => {
    state = { ...state, ...extra, status, elapsed_ms: Date.now() - started };
    save(stateFile, state);
  };
  try {
    const qualification = await qualify({ root, operation, version: value.version, ci });
    // Qualification is issued by the fixed repository-owned assurance adapter, never a caller boolean.
    if (!qualification?.source_binding) throw new Error('Current qualified source binding missing.');
    const changed = state.source_binding && state.source_binding !== qualification.source_binding;
    if (changed && (!packOnly || state.install_started))
      throw new Error('Release source changed; explicit pre-install requalification required.');
    const expectedManifest = distribution === 'npm' ? await sdkManifest(root) : undefined;
    const sdkArgs = [
      path.join(root, 'packages/agent/tooling/pack-sdk.mjs'),
      '--pack',
      '--root',
      path.join(root, 'packages/agent'),
      '--destination',
      folder,
    ];
    const packArgs = distribution === 'npm' ? sdkArgs : [npmCli, 'pack', '--json', '--pack-destination', folder];
    let tarball;
    if (state.pack_metadata) {
      tarball = selectedTarball(state.pack_metadata, folder, value.version);
      if (sha(readFileSync(tarball)) !== state.tarball_sha256) throw new Error('Pending tarball changed.');
      if (changed) await verifyPackedSources(root, state.pack_metadata, tarball, npmCli, expectedManifest);
    } else {
      if (!packOnly) throw new Error('Candidate must be packed after tests and before independent assurance.');
      const priorLog = path.join(folder, 'pack.json');
      let output;
      if (existsSync(priorLog) && read(priorLog).code === 0) {
        const prior = read(priorLog);
        if (
          prior.command !== process.execPath ||
          prior.signal ||
          JSON.stringify(prior.args) !== JSON.stringify(packArgs)
        )
          throw new Error('Saved pack observation differs from this operation.');
        output = prior.stdout;
      } else {
        if (changed) throw new Error('Changed source lacks an exact prior package to requalify.');
        update('packing', { source_binding: qualification.source_binding });
        output = await command(process.execPath, packArgs, {
          cwd: path.join(root, 'packages/agent'),
          env,
          log: priorLog,
        });
      }
      const metadata = parsePackOutput(output);
      tarball = selectedTarball(metadata, folder, value.version);
      if (existsSync(priorLog)) await verifyPackedSources(root, metadata, tarball, npmCli, expectedManifest);
      const current = await qualify({ root, operation, version: value.version, ci });
      if (current.source_binding !== qualification.source_binding)
        throw new Error('Source changed during npm prepack.');
      update('packed', { pack_metadata: metadata, tarball_sha256: sha(readFileSync(tarball)) });
    }
    update('qualified', { source_binding: qualification.source_binding, error: undefined });
    const actualDistribution = packedDistribution(state.pack_metadata);
    if (distribution !== undefined && actualDistribution !== distribution)
      throw new Error('Packed distribution differs from the explicit request.');
    const nativeChannel = actualDistribution === 'native';
    if (!nativeChannel) npmArchiveFiles(state.pack_metadata);
    const installedManifestBytes =
      expectedManifest ??
      (actualDistribution === 'npm' && state.pack_metadata[0].files.some((file) => file.path === 'tooling/pack-sdk.mjs')
        ? await sdkManifest(root)
        : undefined);
    if (installedManifestBytes)
      await verifyPackedSources(root, state.pack_metadata, tarball, npmCli, installedManifestBytes);
    if (packOnly) {
      update('awaiting_assurance');
      return state;
    }
    if (nativeChannel) {
      const locations = await installNativeRelease({
        root,
        state,
        value,
        metadata: state.pack_metadata,
        tarball,
        npmCli,
        env,
        command,
        folder,
        update,
      });
      update('successful', { ...locations, completed_at: new Date().toISOString() });
      save(path.join(root, '.agent/work/agent-local-release/successful.json'), state);
      return state;
    }
    throw new Error('SDK archives are library-only; public agent installation requires a qualified native asset.');
  } catch (error) {
    update(error.message.startsWith('awaiting_assurance:') ? 'awaiting_assurance' : 'failed', {
      error: error.message,
    });
    throw error;
  }
}
async function main(args) {
  if (args.length === 4 && args[0] === '--stage-native-retarget' && args[2] === '--candidate') {
    const { stageNativeRetargetCandidate } = await import('../../packages/agent/bin/repair-release-retarget.mjs');
    return stageNativeRetargetCandidate({ root: repositoryRoot, operation: args[1], candidateFile: args[3] });
  }
  if (args[0] === '--prepare-after-disposition') {
    const parsed = parseDispositionPreparationArgs(args.slice(1));
    const proposal = readDispositionProposal(repositoryRoot, parsed.proposalPath);
    return prepareReleaseAfterDisposition(repositoryRoot, parsed.selection, proposal);
  }
  if (args[0] === '--prepare') return prepareRelease(repositoryRoot, parseVersionSelection(args.slice(1)));
  if (args.length === 1 && args[0] === '--prepare-system-update') return prepareSystemUpdate();
  if (
    args.length !== 2 ||
    !['--operation', '--pack', '--pack-npm', '--status', '--worker', '--pack-worker', '--pack-npm-worker'].includes(
      args[0],
    ) ||
    !idPattern.test(args[1])
  )
    throw new Error(
      'Usage: release:local -- --prepare [--minor | --major | --version X.Y.Z] | ' +
        '--prepare-after-disposition --proposal REL [--minor | --major | --version X.Y.Z] | ' +
        '--prepare-system-update | --pack ID | --pack-npm ID | --operation ID | --status ID',
    );
  const operation = args[1];
  const folder = directory(repositoryRoot, `.tmp/releases/${operation}`);
  if (args[0] === '--status') return read(journalFile(repositoryRoot, operation));
  if (['--worker', '--pack-worker', '--pack-npm-worker'].includes(args[0])) {
    const { verifyLocalReleaseAssurance, verifyLocalReleaseTests } = await import('./release-assurance.mjs');
    const mutex = await claimReleaseWorker(repositoryRoot, operation, process.pid);
    try {
      const packOnly = args[0] !== '--worker';
      return await executeRelease({
        operation,
        packOnly,
        distribution: args[0] === '--pack-npm-worker' ? 'npm' : args[0] === '--pack-worker' ? 'native' : undefined,
        qualify: packOnly ? verifyLocalReleaseTests : verifyLocalReleaseAssurance,
      });
    } finally {
      mutex.close();
    }
  }
  return reserveReleaseWorker(repositoryRoot, operation, () => {
    const output = openSync(path.join(folder, 'worker.log'), 'a');
    const worker = spawn(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        args[0] === '--pack-npm' ? '--pack-npm-worker' : args[0] === '--pack' ? '--pack-worker' : '--worker',
        operation,
      ],
      {
        cwd: repositoryRoot,
        env: process.env,
        detached: true,
        windowsHide: true,
        stdio: ['ignore', output, output],
      },
    );
    closeSync(output);
    if (!worker.pid) {
      worker.on('error', () => {});
      throw new Error('Release worker did not start.');
    }
    worker.unref();
    return worker.pid;
  });
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2))
    .then((value) => process.stdout.write(json(value)))
    .catch((error) => {
      process.stderr.write(error.message + '\n');
      process.exitCode = 1;
    });
}
