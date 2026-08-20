/* global vi */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const notification = require('../../lib/runtime-fix-notification.cjs');

function input(overrides = {}) {
  return {
    fix_id: 'runtime-fix-architect-route-20260819',
    source_revision: 'git:runtime-20260819',
    severity: 'high',
    title: 'Runtime architect route corrected',
    defect: {
      code: 'GAP-RUNTIME-ARCHITECT-ROUTE-001',
      old_behavior: 'A typed escalation could leave both correction and diagnosis blocked.',
      expected_behavior: 'A lawful blind diagnosis route is available for the current packet.',
      fix_summary: 'Added the typed architect diagnostic route and reconciled the active next action.'
    },
    changed_paths: ['agent-runtime/lib/runtime.cjs', 'agent-runtime/lib/checkpoint-upgrader.cjs'],
    affected_work_ids: ['sample-project-operator-mode-api-visibility-20260817'],
    recipients: [{ work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: '019ff611-3e1b-7673-ad7e-8ac190730c5e' }],
    validation: { status: 'partial', summary: 'Focused tests, contracts, coverage and static checks passed; mutation remains pending.', checks: [{ id: 'focused', status: 'pass' }, { id: 'mutation', status: 'not_run' }] },
    evidence_pointers: ['.agent/work/runtime-architect-diagnostic-flow-20260819/WORK.md#verification', 'agent-runtime/TESTING.md#evidence-domains'],
    next_action: { operation: 'recordArchitectDiagnosticDispatch', summary: 'Reserve one fresh blind architect from BR/SR/AC and observable evidence, then record ArchitectureDiagnosis/v1.' },
    user_approval_required: false,
    created_at: '2026-08-19T10:00:00.000Z',
    ...overrides
  };
}

describe('RuntimeFixNotification/v1', () => {
  test('builds a compact pending host-dispatch notification', () => {
    const value = notification.build(input());
    expect(value).toMatchObject({ schema: 'RuntimeFixNotification/v1', severity: 'high', authority: 'derived_non_authoritative', delivery: { status: 'pending_host_dispatch', gap_code: null, host_operation: 'collaboration.send_message_to_thread' } });
    expect(value.delivery.message_compact).not.toMatch(/stack|source dump|authorization/i);
    expect(value.notification_id).toMatch(/^runtime-fix-[a-f0-9]{64}$/);
  });

  test('blocks delivery when an affected work has no attributable thread', () => {
    const value = notification.build(input({ recipients: [{ work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: null }] }));
    expect(value.delivery).toMatchObject({ status: 'blocked', gap_code: 'GAP-HOST-DEVELOPER-NOTIFICATION-001' });
  });

  test('allows multiple attributable threads for one affected work without duplicate pairs', () => {
    const value = notification.build(input({ recipients: [
      { work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-a' },
      { work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-b' }
    ] }));
    expect(value.recipients).toHaveLength(2);
    expect(value.delivery.status).toBe('pending_host_dispatch');
  });

  test('merges partial fan-out records into one immutable notification without duplicate host work', () => {
    const merged = notification.mergeNotifications([
      notification.build(input({ recipients: [{ work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-a' }] })),
      notification.build(input({ recipients: [{ work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-b' }] }))
    ]);
    expect(merged.recipients).toEqual([
      { work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-a' },
      { work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-b' }
    ]);
    expect(merged.notification_id).toMatch(/^runtime-fix-[a-f0-9]{64}$/);
    expect(merged.delivery.status).toBe('pending_host_dispatch');
  });

  test('rejects merging notifications from different fixes', () => {
    const left = notification.build(input());
    const right = notification.build(input({ fix_id: 'other-runtime-fix', recipients: [{ work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-b' }] }));
    expect(() => notification.mergeNotifications([left, right])).toThrow(/merge identity mismatch/);
    expect(() => notification.mergeNotifications([])).toThrow(/notifications required/);
    expect(() => notification.mergeNotifications([null])).toThrow(/entry invalid/);
  });

  test.each([
    ['missing input', null, /input required/],
    ['long title', { title: 'x'.repeat(241) }, /notification title exceeds compact bound/],
    ['empty changed paths', { changed_paths: [] }, /changed paths required/],
    ['empty affected work ids', { affected_work_ids: [] }, /affected work ids required/],
    ['duplicate affected work ids', { affected_work_ids: ['sample-project-operator-mode-api-visibility-20260817', 'sample-project-operator-mode-api-visibility-20260817'] }, /affected work ids duplicate/],
    ['missing recipients', { recipients: null }, /recipients required/],
    ['invalid recipient entry', { recipients: [null] }, /recipient 0 invalid/],
    ['duplicate recipient', { recipients: [{ work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-a' }, { work_id: 'sample-project-operator-mode-api-visibility-20260817', thread_id: 'thread-a' }] }, /notification recipient duplicate/],
    ['recipient coverage', { affected_work_ids: ['work-a', 'work-b'], recipients: [{ work_id: 'work-a', thread_id: 'thread-a' }] }, /does not cover affected work/],
    ['unsafe path', { changed_paths: ['../outside'] }, /changed path 0 unsafe/],
    ['sensitive evidence', { evidence_pointers: ['secret=hidden'] }, /contains sensitive material/],
    ['missing validation', { validation: null }, /validation required/],
    ['empty validation checks', { validation: { status: 'pass', summary: 'x', checks: [] } }, /validation checks required/],
    ['invalid validation check', { validation: { status: 'pass', summary: 'x', checks: [null] } }, /validation check 0 invalid/],
    ['invalid validation status', { validation: { status: 'unknown', summary: 'x', checks: [{ id: 'x', status: 'pass' }] } }, /validation status invalid/],
    ['missing next action', { next_action: null }, /next action required/],
    ['missing defect', { defect: null }, /defect required/],
    ['invalid severity', { severity: 'unknown' }, /severity invalid/],
    ['invalid next action', { next_action: { operation: '', summary: 'x' } }, /next action operation missing/]
  ])('rejects %s', (label, overrides, expected) => {
    if (label === 'missing input') expect(() => notification.build(overrides)).toThrow(expected);
    else expect(() => notification.build(input(overrides))).toThrow(expected);
  });

  test('writes one derived notification idempotently and rejects an identity collision', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-fix-notification-'));
    const first = notification.writeNotification(root, input());
    const second = notification.writeNotification(root, input());
    expect(first.already_current).toBe(false);
    expect(second.already_current).toBe(true);
    expect(fs.existsSync(path.join(root, first.path))).toBe(true);
    expect(() => notification.writeNotification(root, input({ title: 'different title' }))).toThrow(/identity collision/);
    expect(() => notification.writeNotification(root, input(), { outputRoot: '../outside' })).toThrow(/escapes repository/);
  });

  test('uses the bounded default timestamp and rejects an unavailable root or malformed existing record', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-fix-notification-'));
    const value = input();
    delete value.created_at;
    expect(notification.build(value).created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(() => notification.writeNotification(path.join(root, 'missing'), input())).toThrow(/repository root unavailable/);
    const parsed = notification.build(input());
    const output = path.join(root, '.planning', 'agent-flow', 'runtime-notifications');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, `${parsed.notification_id}.json`), '{bad', 'utf8');
    expect(() => notification.writeNotification(root, input())).toThrow(/existing runtime fix notification invalid/);
  });

  test('fails closed when the derived output path is a reparse point', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-fix-notification-'));
    const exists = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const lstat = vi.spyOn(fs, 'lstatSync').mockReturnValue(/** @type {any} */ ({ isSymbolicLink: () => true }));
    try { expect(() => notification.writeNotification(root, input())).toThrow(/reparse point/); } finally { exists.mockRestore(); lstat.mockRestore(); }
  });
});

