import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { createConsumerFixture } from './helpers/consumer-fixture.mjs';
import { afterAll, test } from 'bun:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileDevelopmentWorkflow,
  loadProjectContext,
  loadRuntimeConfig,
  resolveConfigPath,
  selectWorkflow,
} from '../src/index.ts';
import { createConfiguredProjectAuthorizer } from '../src/authorization/cedar-boundary.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? createConsumerFixture(packageRoot);
afterAll(() => {
  if (!process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT) rmSync(repositoryRoot, { recursive: true, force: true });
});
if (!process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT) {
  const file = path.join(repositoryRoot, 'agent-runtime.config.v1.yaml');
  const fixture = parse(readFileSync(file, 'utf8'));
  fixture.projects[0].project_root = 'projects/fixture-project';
  const secondary = structuredClone(fixture.projects[0]);
  secondary.project_id = 'fixture-secondary';
  secondary.title = 'Secondary fixture';
  secondary.project_root = 'projects/fixture-secondary';
  secondary.delivery_group = 'fixture-secondary';
  fixture.projects.push(secondary);
  for (const project of fixture.projects)
    mkdirSync(path.join(repositoryRoot, project.project_root), { recursive: true });
  fixture.integrations.providers.push({
    ...fixture.integrations.providers[0],
    id: 'local-fixture-secondary',
    project_id: 'fixture-secondary',
    namespace: 'fixture-secondary',
  });
  fixture.teams['default-development'].allowed_projects.push('fixture-secondary');
  writeFileSync(file, stringify(fixture));
}
const config = loadRuntimeConfig(repositoryRoot);
const projectContext = loadProjectContext(
  repositoryRoot,
  config,
  config.repository.repository_id,
  config.projects[0].project_id,
);
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
    { kind: 'research', intent: 'information_research', workflow: 'information_research_light' },
    { kind: 'feature', intent: 'implementation_new', workflow: 'implementation_new' },
    { kind: 'story', intent: 'implementation_change', workflow: 'implementation_change' },
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
      project: config.projects[0].project_id,
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
