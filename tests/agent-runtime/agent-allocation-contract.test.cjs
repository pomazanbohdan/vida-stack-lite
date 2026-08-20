'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const policy = fs.readFileSync(path.join(root, 'agent-runtime/instructions/agent-allocation.md'), 'utf8');
const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
const flatPolicy = policy.replace(/\s+/g, ' ');

for (const mode of ['session', 'perspective', 'specialist', 'parallel_workers', 'independent_assurance']) {
  assert.ok(policy.includes(`\`${mode}\``), `allocation mode missing: ${mode}`);
}
for (const invariant of [
  'one writer per path',
  'exactly three reviewers',
  'Blind assurance packets additionally exclude implementation chat',
  'source revision',
  'Reject or rebase a stale result',
  'ask`, `retrieve`, `infer`, `proceed` or `block',
  'current session owns the lightweight Intent Monitor',
  'Child completion alone never advances a lifecycle gate'
]) assert.ok(flatPolicy.toLowerCase().includes(invariant.toLowerCase()), `allocation invariant missing: ${invariant}`);

assert.ok(flatPolicy.includes('do not create an agent merely because a slot exists'), 'available capacity must not force dispatch');
assert.ok(policy.includes('perspective slot') && policy.includes('not an agent'), 'perspective is not independent assurance');
assert.ok(policy.includes('blind reviewers are always fresh and single-use'), 'blind identity reuse must be forbidden');
assert.ok(agents.includes('instructions/{development-lifecycle,agent-allocation,'), 'managed bootstrap must route allocation policy');
assert.ok(agents.includes('Logical roles are not automatically separate agents'), 'allocation default must be bootstrap-visible');
assert.ok(!policy.includes('TaskSpec'), 'allocation policy must not create a parallel requirement authority');
console.log('agent allocation contract: pass');
