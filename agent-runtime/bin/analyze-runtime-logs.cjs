#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const assurance = require('../lib/review-assurance.cjs');

const schema = 'RuntimeLogAnalysisReport/v1';
const defaultLogRoots = [
  '.planning/agent-flow/test-output',
  '.planning/agent-flow/verify-artifacts',
  '.planning/agent-flow/runtime-analysis',
  'agent-runtime/reports',
  'agent-runtime/coverage'
];
const allowedExtensions = new Set(['.json', '.jsonl', '.log', '.txt']);
const failureStatuses = new Set(['fail', 'failed', 'error', 'blocked', 'timeout', 'cancelled', 'rejected']);
const idLike = /(?:[0-9a-f]{8,}|[0-9a-f]{4,}(?:-[0-9a-f]{4,})+|\b\d{4,}\b)/gi;

function fail(message, code = 'GAP_RUNTIME_LOG_ANALYSIS') {
  /** @type {Error & { code?: string }} */
  const error = new Error(message);
  error.code = code;
  throw error;
}

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function safeRelative(value) { return typeof value === 'string' && value && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes('..'); }
function normalizePath(value) { return String(value).replaceAll(path.sep, '/'); }
function within(root, candidate) {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  return target === base || target.startsWith(`${base}${path.sep}`);
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function repoRoot(input) {
  const root = path.resolve(input || process.cwd());
  if (!fs.existsSync(path.join(root, '.git'))) fail('repository root must contain .git');
  return root;
}

function sourceRevision(root) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? text(result.stdout) : 'unknown';
}

function runtimeVersion(root) {
  const file = path.join(root, 'agent-runtime', 'package.json');
  if (!fs.existsSync(file)) return 'unknown';
  try { return JSON.parse(fs.readFileSync(file, 'utf8')).version || 'unknown'; } catch { return 'unknown'; }
}

function isAllowedFile(relative) { return allowedExtensions.has(path.extname(relative).toLowerCase()); }

function excluded(relative, state) {
  const normalized = normalizePath(relative);
  return (state.excludePaths || []).some(item => normalized === item || normalized.startsWith(`${item}/`)) ||
    (state.excludePrefixes || []).some(item => normalized.startsWith(item));
}

function walk(root, relative, state) {
  const absolute = path.join(root, relative);
  if (!within(root, absolute) || !fs.existsSync(absolute)) return;
  if (excluded(relative, state)) return;
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) { state.gaps.push(`reparse or symlink skipped: ${normalizePath(relative)}`); return; }
  if (stat.isFile()) {
    if (isAllowedFile(relative)) state.files.push({ relative: normalizePath(relative), absolute, size: stat.size, modified_at: stat.mtime.toISOString() });
    return;
  }
  if (!stat.isDirectory()) return;
  for (const name of fs.readdirSync(absolute)) {
    if (state.files.length >= state.maxFiles) { state.gaps.push(`file limit reached: ${state.maxFiles}`); return; }
    walk(root, path.join(relative, name), state);
  }
}

function inventory(root, options) {
  const state = { files: [], gaps: [], maxFiles: options.maxFiles, excludePaths: options.excludePaths || [], excludePrefixes: options.excludePrefixes || [] };
  for (const relative of options.logRoots) {
    if (!safeRelative(relative)) fail(`unsafe log root: ${relative}`);
    walk(root, relative, state);
    if (state.files.length >= state.maxFiles) break;
  }
  return { files: state.files.sort((a, b) => a.relative.localeCompare(b.relative)), gaps: state.gaps };
}

function readState(file) {
  if (!file || !fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function snapshot(root, files, previous, options) {
  let totalBytes = 0;
  const previousFiles = new Map((previous?.files || []).map(item => [item.path, item]));
  const entries = files.map(file => {
    totalBytes += file.size;
    if (totalBytes > options.maxBytes) fail(`runtime log byte limit reached: ${options.maxBytes}`);
    const old = previousFiles.get(file.relative);
    const sameMetadata = old && old.size === file.size && old.modified_at === file.modified_at;
    const digest = sameMetadata && old.sha256 ? old.sha256 : sha256(fs.readFileSync(file.absolute));
    return { path: file.relative, size: file.size, modified_at: file.modified_at, sha256: digest };
  });
  const source = sourceRevision(root);
  return { source_revision: source, runtime_version: runtimeVersion(root), host_capability_epoch: process.env.AGENT_RUNTIME_CAPABILITY_EPOCH || 'unknown', files: entries, snapshot_id: sha256(stable({ source_revision: source, files: entries })) };
}

function recordLike(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return ['error', 'message', 'reason', 'code', 'status', 'stderr', 'exception', 'failure'].some(key => value[key] !== undefined);
}

function lineRecords(line, pointer) {
  const trimmed = line.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return recordLike(parsed) ? [{ record: parsed, pointer }] : [];
  } catch {
    const match = trimmed.match(/(?:code|error|status|reason)\s*[:=]\s*([^\s,;]+)(?:.*?)(?:message|error|reason)\s*[:=]\s*(.+)$/i);
    return match ? [{ record: { code: match[1], message: match[2] }, pointer }] : [];
  }
}

function flattenJson(value, pointer, out) {
  if (recordLike(value)) out.push({ record: value, pointer });
  if (Array.isArray(value)) value.forEach((item, index) => flattenJson(item, `${pointer}/${index}`, out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => {
    if (['findings', 'errors', 'events', 'results', 'checks', 'failures', 'entries'].includes(key)) flattenJson(item, `${pointer}/${key}`, out);
  });
}

function parseFile(file, options) {
  const raw = fs.readFileSync(file.absolute, 'utf8');
  if (raw.length > options.maxFileBytes) return { records: [], gap: `file skipped over byte limit: ${file.relative}` };
  if (path.extname(file.relative).toLowerCase() === '.json') {
    try { const out = []; flattenJson(JSON.parse(raw), `${file.relative}#json`, out); return { records: out }; } catch { return { records: [] }; }
  }
  const records = [];
  raw.split(/\r?\n/).slice(0, options.maxLinesPerFile).forEach((line, index) => records.push(...lineRecords(line, `${file.relative}#L${index + 1}`)));
  return { records };
}

function firstValue(record, keys) { return keys.map(key => text(record[key])).find(Boolean) || ''; }
function firstNonEmpty(values) { return values.find(Boolean) || ''; }
function valueOrUnknown(value) { return value || 'unknown'; }
function normalizeMessage(value) {
  return assurance.redact(String(value || '')).replace(idLike, '<id>').replace(/([A-Za-z]:)?[\\/]([^\s,;]+)/g, '<path>').replace(/\s+/g, ' ').trim().slice(0, 500);
}
function includesAny(value, values) { return values.some(item => value.includes(item)); }
function classifyFailureText(value) {
  const rules = [
    [['lease', 'coordination', 'claim'], 'coordination-lease'],
    [['timeout', 'spawn', 'host'], 'host-platform'],
    [['test', 'vitest', 'stryker'], 'test-tooling'],
    [['stale', 'invalid evidence', 'historical'], 'stale-evidence'],
    [['product', 'page', 'ui'], 'product-outside-runtime'],
    [['reparse', 'integrity', 'cas', 'security'], 'runtime-defect']
  ];
  const match = rules.find(([tokens]) => includesAny(value, tokens));
  return match ? match[1] : 'unknown';
}
function failureClass(record, code, message) {
  const explicit = firstValue(record, ['failure_class', 'class', 'category']);
  if (explicit) return explicit;
  const value = `${code} ${message}`.toLowerCase();
  if (includesAny(value, ['gate_blocked', 'fail-closed'])) return record.preconditions_valid === true ? 'runtime-defect' : 'expected-fail-closed-gate';
  return classifyFailureText(value);
}
function severity(code, message, classification) {
  const value = `${code} ${message} ${classification}`.toLowerCase();
  if (value.includes('security') || value.includes('integrity') || value.includes('data-loss') || value.includes('corrupt')) return 'high';
  if (classification === 'runtime-defect' || classification === 'coordination-lease') return 'medium';
  return 'low';
}

function eventValues(record, item) {
  const code = firstValue(record, ['code', 'error_code', 'status_code', 'kind']);
  const message = firstValue(record, ['message', 'error', 'reason', 'stderr', 'exception', 'failure', 'detail']);
  const status = firstValue(record, ['status', 'verdict', 'result']).toLowerCase();
  return {
    code, message, status, operation: valueOrUnknown(firstValue(record, ['operation', 'operation_id', 'point', 'gate', 'command', 'phase'])),
    phase: valueOrUnknown(firstValue(record, ['phase', 'lifecycle_state', 'point'])), sourceSymbol: valueOrUnknown(firstValue(record, ['source_symbol', 'symbol', 'gate'])),
    run: firstNonEmpty([firstValue(record, ['run_id', 'runId', 'batch_id', 'operation_id', 'work_id', 'thread_id']), item.pointer.split('#')[0]]),
    workId: firstValue(record, ['work_id', 'workId']), sourceRevision: firstValue(record, ['source_revision', 'sourceRevision']),
    timestamp: firstValue(record, ['timestamp', 'created_at', 'started_at', 'finished_at'])
  };
}
function eventDuration(record) { return Number.isFinite(record.duration_ms) ? record.duration_ms : null; }
function buildEvent(values, snapshotInfo, item, normalized, classification) {
  const { operation, phase, sourceSymbol } = values;
  const sourceRevision = values.sourceRevision || snapshotInfo.source_revision;
  const fingerprint = sha256(stable({ operation, phase, code: values.code || 'none', source_revision: sourceRevision, source_symbol: sourceSymbol, message: normalized, classification }));
  const event = {
    fingerprint, operation, phase, code: values.code || null, message: normalized || null, source_symbol: sourceSymbol,
    failure_class: classification, severity: severity(values.code, normalized, classification), run_id: values.run,
    work_id: values.workId || null, source_revision: sourceRevision,
    timestamp: values.timestamp || null, duration_ms: eventDuration(item.record || {}), evidence_pointer: item.pointer
  };
  event.event_id = sha256(stable({ fingerprint: event.fingerprint, evidence_pointer: event.evidence_pointer, run_id: event.run_id, timestamp: event.timestamp, source_revision: event.source_revision }));
  return event;
}
function eventFrom(item, snapshotInfo) {
  const record = item.record || {};
  const values = eventValues(record, item);
  if (!values.code && !values.message && !failureStatuses.has(values.status)) return null;
  const normalized = normalizeMessage(firstNonEmpty([values.message, values.code, values.status]));
  const classification = failureClass(record, values.code, normalized);
  return buildEvent(values, snapshotInfo, item, normalized, classification);
}

function eventsFrom(root, files, snapshotInfo, options) {
  const events = [];
  const gaps = [];
  for (const file of files) {
    const parsed = parseFile(file, options);
    if (parsed.gap) gaps.push(parsed.gap);
    parsed.records.forEach(item => { const event = eventFrom(item, snapshotInfo); if (event) events.push(event); });
  }
  return { events, gaps };
}

function clusterEvents(events, windowStart) {
  const groups = new Map();
  events.filter(event => !event.timestamp || Date.parse(event.timestamp) >= windowStart).forEach(event => {
    const group = groups.get(event.fingerprint) || { ...event, count: 0, runs: new Set(), pointers: new Set(), operations: new Set(), versions: new Set(), timestamps: [] };
    group.count += 1; group.runs.add(event.run_id); group.pointers.add(event.evidence_pointer); group.operations.add(event.operation); group.versions.add(event.source_revision);
    if (event.timestamp && Number.isFinite(Date.parse(event.timestamp))) group.timestamps.push(event.timestamp);
    groups.set(event.fingerprint, group);
  });
  return [...groups.values()].map(group => {
    const timestamps = group.timestamps.sort();
    const recurrent = group.count >= 3 || group.runs.size >= 2 || (group.severity === 'high' && group.count >= 2);
    return { fingerprint: group.fingerprint, count: group.count, distinct_runs: group.runs.size, operations: [...group.operations].sort(), source_revisions: [...group.versions].sort(), evidence_pointers: [...group.pointers].slice(0, 20), severity: group.severity, confidence: recurrent ? 'high' : 'medium', failure_class: group.failure_class, first_seen: timestamps[0] || null, last_seen: timestamps.at(-1) || null, known_gap: false, regression_test: null, next_action: recurrent ? 'Open a bounded runtime defect/research task.' : 'Collect another independent runtime occurrence before escalation.' };
  });
}

function optimizationFindings(events, files) {
  const findings = [];
  const operations = new Map();
  events.forEach(event => { const key = `${event.operation}|${event.phase}`; operations.set(key, (operations.get(key) || 0) + 1); });
  for (const [key, count] of operations) if (count >= 3) findings.push({ id: `OPT-${sha256(key).slice(0, 10)}`, kind: 'duplicate-operation-candidate', evidence: key, count, estimated_saved_calls: count - 1, duration_impact_ms: null, cache_opportunity: true, fail_closed_risk: 'must be checked with a public regression test', recommendation: 'Reuse one immutable snapshot or preflight result only when revision/fingerprint bindings are unchanged.', regression_test: 'Add a stale/replay test proving the reuse is rejected after a binding change.' });
  const large = files.filter(file => file.size > 1024 * 1024);
  if (large.length) findings.push({ id: 'OPT-LARGE-LOGS', kind: 'large-evidence-candidate', evidence: large.map(file => file.relative).slice(0, 10), count: large.length, estimated_saved_calls: 0, duration_impact_ms: null, cache_opportunity: false, fail_closed_risk: 'none if full artifacts remain on disk', recommendation: 'Pass compact pointers and bounded previews to the orchestrator; retain full derived artifacts.', regression_test: 'Assert summary output omits raw logs and stack traces.' });
  return findings;
}

function summary(report) {
  return { status: report.status, files: report.source_counts.files, events: report.source_counts.events, clusters: report.recurrence_clusters.length, optimizations: report.optimization_findings.length, duration_ms: report.duration_ms, next_action: report.next_actions[0] || 'No new runtime signal.' };
}

function compact(report, mode) {
  if (mode === 'summary') return { schema, summary: summary(report), artifacts: report.artifacts };
  if (mode === 'evidence') return { schema, summary: summary(report), recurrence_clusters: report.recurrence_clusters, optimization_findings: report.optimization_findings, known_gaps: report.known_gaps, artifacts: report.artifacts };
  return report;
}

function integerOption(input, key, fallback, minimum, maximum, error) {
  const value = input[key] === undefined ? fallback : input[key];
  if (!Number.isInteger(value) || value < minimum || (maximum !== null && value > maximum)) fail(error);
  return value;
}
function listOption(input, key, fallback) { return input[key] === undefined ? fallback : input[key]; }
function relativeListOption(input, key, fallback) {
  const value = listOption(input, key, fallback);
  if (!Array.isArray(value) || !value.every(item => safeRelative(item))) fail(`analysis ${key} invalid`);
  return value.map(normalizePath);
}
function optionsFrom(input = {}) {
  const days = integerOption(input, 'days', 14, 1, 90, 'analysis days invalid');
  const maxFiles = integerOption(input, 'maxFiles', 1000, 1, 10000, 'analysis max files invalid');
  const maxBytes = integerOption(input, 'maxBytes', 50 * 1024 * 1024, 1, null, 'analysis max bytes invalid');
  const maxFileBytes = integerOption(input, 'maxFileBytes', 2 * 1024 * 1024, 1, maxBytes, 'analysis max file bytes invalid');
  const maxLinesPerFile = integerOption(input, 'maxLinesPerFile', 5000, 1, 100000, 'analysis max lines invalid');
  const includeCheckpoints = input.includeCheckpoints === true;
  const roots = relativeListOption(input, 'logRoots', defaultLogRoots);
  if (includeCheckpoints && !roots.includes('.agent/work')) roots.push('.agent/work');
  return { days, maxFiles, maxBytes, maxFileBytes, maxLinesPerFile, includeCheckpoints, logRoots: roots, excludePaths: relativeListOption(input, 'excludePaths', []), excludePrefixes: relativeListOption(input, 'excludePrefixes', []) };
}

function analysisPaths(root, input, options) {
  const outputRoot = path.resolve(root, input.outputRoot || '.planning/agent-flow/runtime-analysis');
  if (!within(root, outputRoot)) fail('analysis output escapes repository');
  const statePath = path.resolve(root, input.statePath || path.join(outputRoot, 'watermark.json'));
  if (!within(root, statePath)) fail('analysis state escapes repository');
  const outputRelative = normalizePath(path.relative(root, outputRoot));
  const stateRelative = normalizePath(path.relative(root, statePath));
  const inventoryOptions = { ...options, excludePaths: [...options.excludePaths, stateRelative], excludePrefixes: [...options.excludePrefixes, `${outputRelative}/runtime-analysis-`] };
  return { outputRoot, statePath, inventoryOptions };
}
function changedFiles(foundFiles, currentSnapshot, previousSnapshot, sameSnapshot) {
  if (sameSnapshot) return [];
  const previousFiles = new Map((previousSnapshot?.files || []).map(file => [file.path, file.sha256]));
  const currentFiles = new Map(currentSnapshot.files.map(file => [file.path, file.sha256]));
  return foundFiles.filter(file => previousFiles.get(file.relative) !== currentFiles.get(file.relative));
}
function mergeEvents(previous, parsed) {
  const events = [...(Array.isArray(previous) ? previous : []), ...parsed];
  return [...new Map(events.map(event => [event.event_id || sha256(stable(event)), event])).values()];
}
function recurrentClusters(events, windowStart, sameSnapshot) {
  if (sameSnapshot) return [];
  return clusterEvents(events, windowStart).filter(group => group.count >= 2 || group.distinct_runs >= 2 || (group.severity === 'high' && group.count >= 2));
}
function reportStatus(sameSnapshot, snapshotChanged, clusters, optimizations, gaps) {
  if (snapshotChanged) return 'blocked';
  if (sameSnapshot) return 'no_new_signal';
  return clusters.length || optimizations.length || gaps.length ? 'findings' : 'no_new_signal';
}
function nextActions(sameSnapshot, snapshotChanged, clusters, optimizations) {
  if (snapshotChanged) return ['Rerun after the runtime artifact snapshot is stable.'];
  if (sameSnapshot) return ['Wait for a new runtime artifact or source snapshot.'];
  if (clusters.length) return ['Review recurrence clusters and perform repository-first documentation research.'];
  if (optimizations.length) return ['Review the bounded optimization candidates with fail-closed regression tests.'];
  return ['No new runtime signal; keep the watermark.'];
}
function knowledgeResearch(root, files) {
  const documentation = [], skills = [];
  for (const file of files) {
    if (path.extname(file.relative).toLowerCase() !== '.json') continue;
    let value;
    try { value = JSON.parse(fs.readFileSync(file.absolute, 'utf8')); } catch { continue; }
    const contexts = [];
    const collect = item => {
      if (!item || typeof item !== 'object') return;
      if (item.schema === 'PlatformKnowledgeContext/v1') contexts.push(item);
      Object.values(item).forEach(child => { if (Array.isArray(child)) child.forEach(collect); else if (child && typeof child === 'object') collect(child); });
    };
    collect(value);
    contexts.slice(0, 5).forEach(context => {
      context.official_sources?.slice(0, 20).forEach(source => documentation.push({ source_url: source.url, title: source.title, platform_version: source.platform_version, last_verified: source.last_verified || source.lastmod || null, evidence_pointer: `${file.relative}#knowledge`, confidence: 'observed' }));
      context.skills?.slice(0, 20).forEach(skill => skills.push({ skill_id: skill.skill_id, skill_path: skill.path, skill_sha256: skill.skill_sha256, role: skill.role, phase: skill.phase, status: skill.status, evidence_pointer: `${file.relative}#knowledge`, recommendation: 'Assess only in a separate bounded skill-maintenance task.' }));
    });
  }
  return { documentation_research: [...new Map(documentation.map(item => [`${item.source_url}|${item.evidence_pointer}`, item])).values()].slice(0, 100), skill_assessment: [...new Map(skills.map(item => [`${item.skill_id}|${item.evidence_pointer}`, item])).values()].slice(0, 100) };
}
function consistencyCheck(root, paths, snap, options, hook) {
  if (typeof hook === 'function') hook();
  const afterFound = inventory(root, paths.inventoryOptions);
  const afterSnap = snapshot(root, afterFound.files, snap, options);
  return afterSnap.snapshot_id !== snap.snapshot_id;
}
function analyze(input = {}) {
  const started = Date.now();
  const root = repoRoot(input.root);
  const options = optionsFrom(input);
  const paths = analysisPaths(root, input, options);
  const previous = readState(paths.statePath);
  const found = inventory(root, paths.inventoryOptions);
  const snap = snapshot(root, found.files, previous?.snapshot, options);
  const sameSnapshot = previous?.snapshot?.snapshot_id === snap.snapshot_id;
  const changed = changedFiles(found.files, snap, previous?.snapshot, sameSnapshot);
  const windowStart = Date.now() - options.days * 24 * 60 * 60 * 1000;
  const parsed = sameSnapshot ? { events: [], gaps: [] } : eventsFrom(root, changed, snap, options);
  const allEvents = mergeEvents(previous?.events, parsed.events);
  const clusters = recurrentClusters(allEvents, windowStart, sameSnapshot);
  const currentWindowEvents = allEvents.filter(event => !event.timestamp || Date.parse(event.timestamp) >= windowStart);
  const optimizations = sameSnapshot ? [] : optimizationFindings(currentWindowEvents, found.files);
  const snapshotChanged = consistencyCheck(root, paths, snap, options, input.beforeConsistencyCheck);
  const blockedGaps = snapshotChanged ? ['runtime snapshot changed during analysis; no versions were mixed and watermark was not advanced'] : [];
  const gaps = [...found.gaps, ...parsed.gaps, ...blockedGaps];
  const knowledge = knowledgeResearch(root, changed);
  const report = {
    schema, status: reportStatus(sameSnapshot, snapshotChanged, clusters, optimizations, gaps),
    analysis_window: { days: options.days, from: new Date(windowStart).toISOString(), to: new Date().toISOString() },
    snapshot: { source_revision: snap.source_revision, runtime_version: snap.runtime_version, host_capability_epoch: snap.host_capability_epoch, snapshot_id: snap.snapshot_id, files: snap.files },
    source_counts: { files: found.files.length, events: allEvents.length, recurrence_clusters: clusters.length },
    recurrence_clusters: clusters, optimization_findings: optimizations, documentation_research: knowledge.documentation_research, skill_assessment: knowledge.skill_assessment, known_gaps: gaps,
    next_actions: nextActions(sameSnapshot, snapshotChanged, clusters, optimizations), duration_ms: Date.now() - started,
    watermark: { path: normalizePath(path.relative(root, paths.statePath)), snapshot_id: snap.snapshot_id, reused: sameSnapshot, updated_at: new Date().toISOString() }, artifacts: []
  };
  return { report, outputRoot: paths.outputRoot, statePath: paths.statePath, events: allEvents };
}

function writeResult(result) {
  fs.mkdirSync(result.outputRoot, { recursive: true });
  const reportPath = path.join(result.outputRoot, `runtime-analysis-${result.report.snapshot.snapshot_id}.json`);
  result.report.artifacts = [normalizePath(path.relative(path.dirname(result.outputRoot), reportPath))];
  fs.writeFileSync(reportPath, `${JSON.stringify(result.report, null, 2)}\n`, 'utf8');
  if (result.report.status !== 'blocked') {
    const retainedEvents = result.events.filter(event => !event.timestamp || Date.parse(event.timestamp) >= Date.parse(result.report.analysis_window.from)).slice(-5000);
    fs.writeFileSync(result.statePath, `${JSON.stringify({ snapshot: result.report.snapshot, events: retainedEvents, watermark: result.report.watermark }, null, 2)}\n`, 'utf8');
  }
  return { ...result, reportPath };
}

function argValue(argv, name, fallback) { const index = argv.indexOf(name); return index < 0 ? fallback : argv[index + 1]; }
function parseArgs(argv) {
  const output = argValue(argv, '--output', 'summary');
  if (!['summary', 'evidence', 'full'].includes(output)) fail('analysis output mode invalid');
  return { root: argValue(argv, '--root', process.cwd()), outputRoot: argValue(argv, '--output-root', undefined), statePath: argValue(argv, '--state', undefined), output, includeCheckpoints: argv.includes('--include-checkpoints'), days: Number(argValue(argv, '--days', '14')), maxFiles: Number(argValue(argv, '--max-files', '1000')), maxBytes: Number(argValue(argv, '--max-bytes', String(50 * 1024 * 1024))) };
}

function run(argv = process.argv.slice(2)) {
  try {
    const parsed = parseArgs(argv);
    const result = writeResult(analyze(parsed));
    process.stdout.write(`${JSON.stringify(compact(result.report, parsed.output))}\n`);
  } catch (error) {
    process.stderr.write(`${error.code || 'ERROR'}: ${error.message}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) run();
module.exports = { analyze, clusterEvents, compact, eventFrom, inventory, normalizeMessage, optionsFrom, parseArgs, run, snapshot, writeResult };
