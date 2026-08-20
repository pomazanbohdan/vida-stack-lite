const assert = require('assert');
const fs = require('fs');
const path = require('path');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../../agent-runtime/capability/capability.json'), 'utf8'));
const points = ['plan:pre', 'plan:post', 'execute:pre', 'execute:post', 'verify:pre', 'verify:post', 'ship:pre', 'ship:post'];
assert.deepStrictEqual(manifest.gates.map(g => g.point), points, 'all lifecycle gate points are native GSD gates');
assert.deepStrictEqual(manifest.contributions.map(c => c.point), points, 'all lifecycle gate points carry checkpoint instructions');
assert.strictEqual(manifest.engines.gsd, '>=1.11.0 <1.12.0', 'capability is pinned to the current GSD Core major/minor line');
assert.strictEqual(manifest.ponytailPolicy.trustedReleases[0].release, 'gsd-1.11.0_ponytail-4.9.0', 'Ponytail trust follows the managed stack');
const contributionText = manifest.contributions.map(c => c.fragment.inline).join('\n');
assert.match(contributionText, /GSD Core 1\.11 plan-drift checks/, 'plan drift checks remain routed through native GSD');
assert.match(contributionText, /complexity\/CRAP trigger/, 'complexity-triggered remediation remains bounded');
assert.match(contributionText, /scope\/diff and goal-backward consistency checks/, 'scope and goal-backward checks remain routed through native GSD');
assert.match(contributionText, /agent_hint.*native GSD routing once|native GSD routing once.*agent_hint/, 'agent hints use native routing once');
assert.match(contributionText, /at most one bounded root-cause refactor/, 'complexity remediation has one bounded route');
assert.match(contributionText, /verification\.status/, 'verification status is reused through the native boundary');
assert.match(contributionText, /typed runtime next_action/, 'native transition cannot invent runtime authority');
assert.match(contributionText, /do not use that route for reviewers, security, architect or delivery/, 'agent hints stay out of assurance roles');
assert.match(contributionText, /never auto-approve human, review, Runtime or delivery authority/, 'native auto-chain cannot approve authority');
for (const gate of manifest.gates) {
  assert.strictEqual(gate.blocking, true);
  assert.strictEqual(gate.onError, 'halt');
  assert.ok(gate.check.query.startsWith('agent-runtime.checkpoint.'));
}
for (const contribution of manifest.contributions) {
  assert.ok(contribution.fragment.inline.length > 0);
  if (contribution.point === 'plan:pre') {
    assert.deepStrictEqual(contribution.produces, ['WorkCheckpoint/v2', 'PlatformKnowledgeContext/v1', 'AgentRoutingDecision/v1']);
  } else if (contribution.point === 'execute:pre') {
    assert.deepStrictEqual(contribution.consumes, ['WorkCheckpoint/v2', 'PlatformKnowledgeContext/v1', 'AgentRoutingDecision/v1']);
  } else if (contribution.point === 'verify:pre') {
    assert.deepStrictEqual(contribution.consumes, ['WorkCheckpoint/v2', 'PlatformKnowledgeContext/v1', 'DocumentationSkillValidation/v1']);
  } else {
    assert.deepStrictEqual(contribution.consumes, ['WorkCheckpoint/v2']);
  }
}
const launcher = fs.readFileSync(path.join(__dirname, '../../script/Invoke-AgentDevelopmentRuntime.ps1'), 'utf8');
const installer = fs.readFileSync(path.join(__dirname, '../../script/Install-AgentDevelopmentRuntime.ps1'), 'utf8');
for (const setting of [
  'workflow.agent_hint_routing',
  'workflow.plan_drift_precheck',
  'workflow.schema_drift_gate',
  'refactor.trigger_enabled'
]) {
  assert.ok(installer.includes(setting), `installer configures ${setting}`);
  assert.ok(launcher.includes(setting), `launcher configures ${setting}`);
}
for (const point of points) assert.ok(installer.includes(`'${point}'`), `installer preflights ${point}`);
assert.ok(installer.includes('Root-level GSD state is forbidden'), 'installer rejects root-level GSD project state');
assert.ok(launcher.includes("$env:GSD_PROJECT = 'agent-flow'") && launcher.includes('$env:GSD_WORKSTREAM = $WorkId'), 'launcher namespaces derived state');
assert.ok(launcher.includes('.gsd\\capabilities\\agent-development-runtime\\runtime-gate.cjs'), 'launcher invokes the trusted installed capability for validation and seal');
assert.ok(launcher.includes('function Invoke-TypedLifecycleGate') && launcher.includes("code: error && error.code || 'UNCLASSIFIED'"), 'launcher transports typed capability failures across the Node boundary');
assert.ok(launcher.includes('Mutation gate blocked [$($result.code)]: $message') && launcher.includes('corrupt/stale checkpoint ($message)'), 'launcher preserves semantic gate refusals while distinguishing checkpoint continuity failures');
assert.ok(launcher.includes("ValidateSet('status','query','diff','build')") && launcher.includes('& node $tool graphify'), 'launcher uses native GSD Graphify commands');
assert.ok(!launcher.includes('gsd-graph'), 'launcher does not create a parallel standalone graph');
const installedGatePath = path.join(__dirname, '../../.gsd/capabilities/agent-development-runtime/runtime-gate.cjs');
if (fs.existsSync(installedGatePath)) {
  const installedGate = require(installedGatePath);
  assert.strictEqual(typeof installedGate.validate, 'function', 'installed gate imports the portable runtime');
  assert.throws(() => installedGate.validate(null), /typed gate input/, 'installed gate requires the file-oriented API');
} else {
  assert.ok(fs.existsSync(path.join(__dirname, '../../agent-runtime/capability/runtime-gate.cjs')), 'portable capability source is present');
}
console.log(`gsd capability contract: pass (${fs.existsSync(installedGatePath) ? 'installed' : 'portable source'})`);
