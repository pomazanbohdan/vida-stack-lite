'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const policy = fs.readFileSync(path.join(root, 'agent-runtime/instructions/request-clarification.md'), 'utf8').replace(/\s+/g, ' ');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'agent-runtime/schemas/question-candidate.v1.schema.json'), 'utf8'));

for (const action of ['`ask`', '`retrieve`', '`infer`', '`proceed`', '`block`']) assert.ok(policy.includes(action), `clarification action missing: ${action}`);
for (const field of ['question_id','work_id','source_revision','targets','gap_class','action','type','criticality','blocking','decision_owner','dependencies','context','why_asked','impact_if_unanswered','text','options','allow_other','allow_cannot_answer','status']) assert.ok(schema.required.includes(field), `question binding missing: ${field}`);
assert.strictEqual(schema.additionalProperties, false, 'question schema must be closed');
assert.strictEqual(schema.properties.action.const, 'ask', 'question candidate must follow analyzed ask routing');
assert.ok(schema.properties.type.enum.includes('resolve_conflict'), 'conflict question type missing');
assert.ok(schema.properties.options.maxContains === 1, 'question must allow at most one recommended option');
assert.ok(schema.properties.answer.properties.outcome.enum.includes('cannot_answer'), 'cannot-answer provenance outcome missing');
assert.ok(schema.allOf.some(rule => rule.then && rule.then.required && rule.then.required.includes('answer')), 'answered question must require attributable answer');
assert.ok(policy.includes('one question that owns one decision'), 'question must not combine dependent decisions');
assert.ok(policy.includes('at most one evidence-backed recommended option'), 'question recommendation contract missing');
assert.ok(policy.includes('preserve the user\'s quote as Decision provenance'), 'answer provenance missing');
assert.ok(policy.includes('An ambiguous or contradictory response remains open'), 'ambiguous answers must fail open-state');
assert.ok(!policy.includes('TaskSpec'), 'clarification must not create parallel requirement authority');
console.log('request clarification contract: pass');
