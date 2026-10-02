import { configuredTestContext } from './configured-context.mjs';
import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { compileDevelopmentWorkflow, resolveConfigPath, selectWorkflow } from '../src/index.ts';
import { createConfiguredProjectAuthorizer } from '../src/authorization/cedar-boundary.ts';

const { repositoryRoot, config, context: projectContext } = configuredTestContext();
const authorize = createConfiguredProjectAuthorizer(repositoryRoot, config);
const repositoryId = projectContext.repository_id;
const projectId = projectContext.project_ids[0];

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

test('configured Cedar remains default-deny for deterministic role and scope combinations (cases=256)', () => {
  const random = seeded(20260817);
  const actions = ['read', 'invoke', 'write', 'approve'];
  const roles = ['researcher', 'developer-orchestrator', 'operator', 'delivery-agent'];
  for (let index = 0; index < 256; index += 1) {
    const action = actions[Math.floor(random() * actions.length)];
    const role = roles[Math.floor(random() * roles.length)];
    const samePrincipal = random() > 0.15;
    const sameTenant = random() > 0.2;
    const sameProject = random() > 0.2;
    const principal = samePrincipal ? 'principal-1' : 'principal-other';
    const tenant = sameTenant ? repositoryId : 'other-repository';
    const project = sameProject ? projectId : 'other-project';
    const request = {
      principal,
      role,
      action,
      tenant,
      project,
      resourceTenant: repositoryId,
      resourceProject: projectId,
      registryHash: projectContext.registry_hash,
      ...(action === 'read' ? {} : { operationHash: 'a'.repeat(64) }),
    };
    const identity = Object.freeze({
      schema: 'TrustedProjectIdentity/v1',
      source: 'authenticated-context',
      principal: 'principal-1',
      role,
      tenant: repositoryId,
      project: projectId,
      registry_hash: projectContext.registry_hash,
    });
    const permittedAction =
      action === 'read' ||
      action === 'invoke' ||
      (action === 'write' && role === 'developer-orchestrator') ||
      (action === 'approve' && role === 'operator');
    const expected = samePrincipal && sameTenant && sameProject && permittedAction;
    const result = authorize(request, identity, projectContext);
    assert.equal(result.decision, expected ? 'allow' : 'deny', `seed=20260817 case=${index}`);
  }
}, 120_000);

test('workflow selection and compiled graph are deterministic (cases=256)', () => {
  const random = seeded(20260818);
  const cases = [
    {
      kind: 'research',
      intent: 'information_research',
      workflow: 'information_research_light',
    },
    {
      kind: 'feature',
      intent: 'implementation_new',
      workflow: 'implementation_new',
    },
    {
      kind: 'story',
      intent: 'implementation_change',
      workflow: 'implementation_change',
    },
    { kind: 'bug', intent: 'bug_fix', workflow: 'bug_fix' },
    { kind: 'task', intent: 'task_execution', workflow: 'task_execution' },
  ];
  for (let index = 0; index < 256; index += 1) {
    const item = cases[Math.floor(random() * cases.length)];
    const first = selectWorkflow(config, {
      team: 'default-development',
      kind: item.kind,
      intent: item.intent,
      project: config.projects[Math.floor(random() * config.projects.length)].project_id,
      risk_flags: [],
      labels: [],
    });
    const second = selectWorkflow(config, {
      team: 'default-development',
      kind: item.kind,
      intent: item.intent,
      project: projectId,
      risk_flags: [],
      labels: [],
    });
    assert.equal(first.workflow_id, item.workflow, `seed=20260818 case=${index}`);
    assert.equal(second.workflow_id, item.workflow, `seed=20260818 repeat=${index}`);
    const compiled = compileDevelopmentWorkflow(config, 'default-development', first.workflow_id);
    assert.equal(compiled.waves.flat().length, first.workflow.stages.length);
  }
});

test('repository path resolution rejects generated escape and normalization attacks (cases=256)', () => {
  const random = seeded(20260819);
  const attacks = [
    '../outside',
    '/absolute',
    'C:/outside',
    'folder\\escape',
    'folder/../escape',
    'folder//escape',
    'folder/con',
    'folder/name.',
    'folder/name ',
    'folder/file~1.txt',
  ];
  for (let index = 0; index < 256; index += 1) {
    const attack = attacks[Math.floor(random() * attacks.length)];
    assert.throws(() => resolveConfigPath(repositoryRoot, attack), /repository-relative|unsafe path|ambiguous|segment/);
  }
});
