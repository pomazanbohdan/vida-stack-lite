'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const schema = 'RuntimeFixNotification/v1';
const hostOperation = 'collaboration.send_message_to_thread';
const secretPattern = /\b(?:authorization|bearer|cookie|password|securetext|secret|api[_ -]?key)\b/i;

function fail(message, code = 'GAP-RUNTIME-FIX-NOTIFICATION') {
  /** @type {Error & { code?: string }} */
  const error = new Error(message);
  error.code = code;
  throw error;
}

function text(value, name, maximum = 500) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} missing`);
  if (value.length > maximum) fail(`${name} exceeds compact bound`);
  if (secretPattern.test(value)) fail(`${name} contains sensitive material`);
  return value.trim();
}

function safeRelative(value, name) {
  const normalized = text(value, name, 400).replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || normalized.split('/').some(part => !part || part === '.' || part === '..')) fail(`${name} unsafe`);
  return normalized;
}

function unique(values, name) {
  if (!Array.isArray(values) || !values.length) fail(`${name} required`);
  const result = values.map(value => text(value, name, 240));
  if (new Set(result).size !== result.length) fail(`${name} duplicate`);
  return result;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }

function recipients(input) {
  if (!Array.isArray(input) || !input.length) fail('notification recipients required');
  const seen = new Set();
  const result = input.map((entry, index) => {
    if (!entry || typeof entry !== 'object') fail(`notification recipient ${index} invalid`);
    const workId = text(entry.work_id, `notification recipient ${index} work id`, 240);
    if (entry.thread_id !== null && entry.thread_id !== undefined) text(entry.thread_id, `notification recipient ${index} thread id`, 240);
    const threadId = entry.thread_id ?? null;
    const identity = `${workId}\u0000${threadId || '<missing>'}`;
    if (seen.has(identity)) fail('notification recipient duplicate');
    seen.add(identity);
    return { work_id: workId, thread_id: threadId };
  });
  return result;
}

function checks(input) {
  if (!input || typeof input !== 'object') fail('notification validation required');
  if (!['pass', 'partial', 'blocked'].includes(input.status)) fail('notification validation status invalid');
  const summary = text(input.summary, 'notification validation summary');
  if (!Array.isArray(input.checks) || !input.checks.length) fail('notification validation checks required');
  const values = input.checks.map((check, index) => {
    if (!check || typeof check !== 'object') fail(`notification validation check ${index} invalid`);
    return { id: text(check.id, `notification validation check ${index} id`, 160), status: ['pass', 'fail', 'not_run'].includes(check.status) ? check.status : fail(`notification validation check ${index} status invalid`) };
  });
  return { status: input.status, summary, checks: values };
}

function nextAction(input) {
  if (!input || typeof input !== 'object') fail('notification next action required');
  return { operation: text(input.operation, 'notification next action operation', 120), summary: text(input.summary, 'notification next action summary') };
}

function defect(input) {
  if (!input || typeof input !== 'object') fail('runtime fix defect required');
  return {
    code: text(input.code, 'runtime fix defect code', 120),
    old_behavior: text(input.old_behavior, 'runtime fix old behavior'),
    expected_behavior: text(input.expected_behavior, 'runtime fix expected behavior'),
    fix_summary: text(input.fix_summary, 'runtime fix summary')
  };
}

function ensureRecipientCoverage(workIds, targetRecipients) {
  const targetIds = targetRecipients.map(entry => entry.work_id);
  if (workIds.some(workId => !targetIds.includes(workId))) fail('notification recipient does not cover affected work');
}

function deliveryState(targetRecipients) {
  const hasThreadTargets = targetRecipients.every(entry => typeof entry.thread_id === 'string' && entry.thread_id.trim());
  return {
    status: hasThreadTargets ? 'pending_host_dispatch' : 'blocked',
    host_operation: hostOperation,
    gap_code: hasThreadTargets ? null : 'GAP-HOST-DEVELOPER-NOTIFICATION-001'
  };
}

function build(input = {}) {
  if (!input || typeof input !== 'object') fail('runtime fix notification input required');
  const fixId = text(input.fix_id, 'runtime fix id', 240);
  const sourceRevision = text(input.source_revision, 'runtime fix source revision', 240);
  const changedPaths = unique(input.changed_paths, 'runtime fix changed paths').map((value, index) => safeRelative(value, `runtime fix changed path ${index}`));
  const affectedWorkIds = unique(input.affected_work_ids, 'runtime fix affected work ids');
  const targetRecipients = recipients(input.recipients);
  ensureRecipientCoverage(affectedWorkIds, targetRecipients);
  const normalizedDefect = defect(input.defect);
  const validation = checks(input.validation);
  const evidencePointers = unique(input.evidence_pointers, 'runtime fix evidence pointers').map((value, index) => safeRelative(value, `runtime fix evidence pointer ${index}`));
  const action = nextAction(input.next_action);
  const createdAt = text(input.created_at || new Date().toISOString(), 'runtime fix notification timestamp', 80);
  const severity = input.severity || 'high';
  if (!['low', 'medium', 'high', 'critical'].includes(severity)) fail('runtime fix severity invalid');
  const identity = { fix_id: fixId, source_revision: sourceRevision, affected_work_ids: affectedWorkIds, changed_paths: changedPaths };
  const notificationId = text(input.notification_id || `runtime-fix-${digest(identity)}`, 'runtime fix notification id', 240);
  const delivery = deliveryState(targetRecipients);
  const message = `${normalizedDefect.code}: ${normalizedDefect.fix_summary} Next: ${action.summary}`;
  return {
    schema, notification_id: notificationId, created_at: createdAt, fix_id: fixId, source_revision: sourceRevision,
    severity, title: text(input.title, 'runtime fix notification title', 240), defect: normalizedDefect,
    changed_paths: changedPaths, affected_work_ids: affectedWorkIds, recipients: targetRecipients,
    validation, evidence_pointers: evidencePointers, next_action: action,
    delivery: { ...delivery, message_compact: message },
    user_approval_required: input.user_approval_required === true, authority: 'derived_non_authoritative'
  };
}

function mergeNotifications(values) {
  if (!Array.isArray(values) || !values.length) fail('runtime fix notifications required');
  const first = values[0];
  if (!first || typeof first !== 'object') fail('runtime fix notification entry invalid');
  const comparable = value => stable({
    fix_id: value.fix_id, source_revision: value.source_revision, severity: value.severity,
    title: value.title, defect: value.defect, validation: value.validation,
    evidence_pointers: value.evidence_pointers, next_action: value.next_action,
    user_approval_required: value.user_approval_required
  });
  const identity = comparable(first);
  if (values.some(value => !value || typeof value !== 'object' || comparable(value) !== identity)) fail('runtime fix notification merge identity mismatch');
  const orderedUnique = list => [...new Set(list)];
  const affected = orderedUnique(values.flatMap(value => Array.isArray(value.affected_work_ids) ? value.affected_work_ids : []));
  const changed = orderedUnique(values.flatMap(value => Array.isArray(value.changed_paths) ? value.changed_paths : []));
  const targets = values.flatMap(value => Array.isArray(value.recipients) ? value.recipients : []);
  const input = {
    ...first,
    notification_id: undefined,
    affected_work_ids: affected,
    changed_paths: changed,
    recipients: targets
  };
  return build(input);
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function noReparse(root, target) {
  const relative = path.relative(root, target);
  for (const part of relative ? relative.split(path.sep) : []) {
    const cursor = path.join(root, part);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) fail('notification path reparse point');
  }
}

function writeNotification(root, input, options = {}) {
  const repositoryRoot = path.resolve(text(root, 'notification repository root', 1000));
  if (!fs.existsSync(repositoryRoot) || !fs.statSync(repositoryRoot).isDirectory()) fail('notification repository root unavailable');
  const value = build(input);
  const outputRoot = path.resolve(repositoryRoot, options.outputRoot || '.planning/agent-flow/runtime-notifications');
  if (!within(repositoryRoot, outputRoot)) fail('notification output escapes repository');
  noReparse(repositoryRoot, outputRoot);
  fs.mkdirSync(outputRoot, { recursive: true });
  noReparse(repositoryRoot, outputRoot);
  const file = path.join(outputRoot, `${value.notification_id}.json`);
  if (fs.existsSync(file)) {
    let current;
    try { current = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail('existing runtime fix notification invalid'); }
    if (stable(current) !== stable(value)) fail('runtime fix notification identity collision');
    return { notification: value, path: path.relative(repositoryRoot, file).replace(/\\/g, '/'), already_current: true };
  }
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temporary, file);
  return { notification: value, path: path.relative(repositoryRoot, file).replace(/\\/g, '/'), already_current: false };
}

module.exports = { build, mergeNotifications, digest, schema, writeNotification };
