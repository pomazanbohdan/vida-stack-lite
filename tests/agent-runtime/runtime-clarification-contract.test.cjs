'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const runtime = require('../../agent-runtime/lib/runtime.cjs');

const source = 'clarification-contract-v1';
const manifest = {
  schema: 'AcceptanceManifest/v1', id: 'AC-CLARIFICATION', version: 1,
  ac_ids: ['AC-CLARIFICATION-1'], source: 'WORK.md', scope: 'agent-runtime/**',
  source_revision: source,
  contracts: [{ id: 'AC-CLARIFICATION-1', definition: 'typed clarification is enforced', sr: 'SR-CLARIFICATION-1', evidence: ['Static'] }]
};
const checkpoint = {
  schema: 'WorkCheckpoint/v2', work_id: 'clarification-contract', revision: 1,
  lifecycle_state: 'TRACE', protocol_version: 'agent-development-runtime/v2',
  route: 'R3', risk: 'medium', change_kind: 'feature', source_revision: source,
  allowed_paths: ['agent-runtime/**'], source_plan: { br: 'clarify intent', sr: 'ask one decision', ac: 'typed answer', gaps: [], scope: 'runtime', verification: 'contract', rollback_cleanup: 'remove test state' },
  acceptance: ['AC-CLARIFICATION-1'], test_plan: ['node contract'], acceptance_manifest: manifest,
  reviews: [], verification: [], evidence: [], recovery_evidence: [], leases: [], imports: [],
  review_generation: 0, review_generation_ledger: [], question_candidates: [], next_action: 'clarify'
};
const question = {
  schema: 'QuestionCandidate/v1', question_id: 'Q-CONTRACT-1', work_id: checkpoint.work_id,
  source_revision: source, targets: ['SR-CLARIFICATION-1'], gap_class: 'conflicting', action: 'ask',
  type: 'resolve_conflict', criticality: 'blocking', blocking: true, decision_owner: 'user',
  dependencies: [], context: 'Two outcomes conflict.', evidence_pointers: ['WORK.md#conflict'],
  why_asked: 'Implementation depends on one outcome.', impact_if_unanswered: 'Seal remains blocked.',
  text: 'Which outcome is normative?', options: [
    { id: 'A', label: 'First', consequence: 'Use first outcome.', recommended: false },
    { id: 'B', label: 'Second', consequence: 'Use second outcome.', recommended: false }
  ], recommendation_rationale: null, allow_other: true, allow_cannot_answer: true,
  status: 'open', answer: null
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-clarification-contract-'));
const file = path.join(root, 'resume.json');
try {
  fs.writeFileSync(file, JSON.stringify(checkpoint));
  let state = runtime.recordQuestionCandidate(file, question, 1, source);
  assert.strictEqual(state.question_candidates[0].status, 'open');
  state = runtime.recordHumanAnswer(file, { question_id: question.question_id, source_revision: source, outcome: 'cannot_answer', selected: [], quote: 'I cannot decide yet.', pointer: 'WORK.md#user-reply', answered_at: new Date().toISOString() }, 2, source);
  assert.strictEqual(state.question_candidates[0].status, 'open');
  assert.match(state.next_action, /remains open/);
  state = runtime.recordHumanAnswer(file, { question_id: question.question_id, source_revision: source, outcome: 'decision', selected: ['other'], quote: 'Use a third documented outcome.', pointer: 'WORK.md#user-reply-2', answered_at: new Date().toISOString() }, 3, source);
  assert.strictEqual(state.question_candidates[0].status, 'answered');
  assert.strictEqual(state.question_candidates[0].answer.outcome, 'decision');
  assert.throws(() => runtime.recordHumanAnswer(file, { question_id: question.question_id, source_revision: source, outcome: 'decision', selected: ['A'], quote: 'Replay.', pointer: 'WORK.md#replay', answered_at: new Date().toISOString() }, 4, source), /not open/);
  console.log('runtime clarification contract: pass');
} finally {
  const resolved = path.resolve(root);
  if (resolved.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)) fs.rmSync(resolved, { recursive: true, force: true });
}
