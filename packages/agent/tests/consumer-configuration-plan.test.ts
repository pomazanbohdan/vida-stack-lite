import { expect, test } from 'bun:test';
import { validateRuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import {
  initializeProjectFromBundle,
  derivePendingConfigurationReceipt,
  initializationObservationContext,
} from '../bin/init-core.ts';
import { captureConsumerConfiguration, planConsumerConfiguration } from '../bin/init-configuration.ts';
import { configure } from '../bin/configure.ts';
import { parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';
import { withExclusiveInitConfigAdmission } from '../src/config/storage-read-admission.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function parseReceipt(text: string) {
  const value: unknown = JSON.parse(text);
  const schema = await readFile(path.join(packageRoot, 'schemas/runtime-initialization.v1.schema.json'), 'utf8');
  return validateRuntimeInitializationReceipt(value, schema);
}

async function inventory(root: string, relative = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    result.push(name);
    if (entry.isDirectory()) result.push(...(await inventory(root, name)));
    else result.push((await readFile(path.join(root, name))).toString('base64'));
  }
  return result;
}

async function fixture() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-config-plan-')));
  for (const dir of ['one', 'two', 'three']) await mkdir(path.join(root, dir));
  const request = { projectRoot: root, repository: 'example', projectMappings: ['one=one', 'two=two'] };
  await initializeProjectFromBundle(request, packageRoot);
  return { root, request, desired: { ...request, projectMappings: [...request.projectMappings, 'three=three'] } };
}

test('plans two to three projects without writing and preserves unrelated YAML', async () => {
  const started = performance.now();
  const { root, desired } = await fixture();
  let completed = false;
  try {
    await rm(path.join(root, '.agent/runtime-initialization.v1.json'));
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const original = await readFile(configPath, 'utf8');
    await writeFile(configPath, `# private-comment-do-not-publish\n${original}`);
    const before = await inventory(root);
    const captured = captureConsumerConfiguration(desired);
    const publicPlan = planConsumerConfiguration(desired);
    expect(publicPlan).toEqual(captured.plan);
    expect(publicPlan.changes.added_projects).toEqual(['three']);
    expect(JSON.stringify(publicPlan)).not.toContain('private-comment-do-not-publish');
    expect(JSON.stringify(publicPlan)).not.toContain('AgentRuntimeConfig/v1');
    expect(captured.targetConfig).toContain('# private-comment-do-not-publish');
    const previous = parseRuntimeConfigYaml(original);
    const target = parseRuntimeConfigYaml(captured.targetConfig);
    expect(target.projects.slice(0, 2)).toEqual([...previous.projects]);
    expect(target.integrations.providers.slice(0, 2)).toEqual([...previous.integrations.providers]);
    expect(target.agents).toEqual(previous.agents);
    expect(target.teams).toEqual(previous.teams);
    expect(target.projects.map((project) => project.project_id)).toEqual(['one', 'two', 'three']);
    expect(await inventory(root)).toEqual(before);
    const planPath = path.join(root, 'configuration-plan-test.json');
    const misleading = { ...publicPlan, changes: { ...publicPlan.changes, added_projects: [] } };
    await writeFile(planPath, JSON.stringify(misleading), { flag: 'wx' });
    try {
      const withPlan = await inventory(root);
      await Promise.resolve(
        expect(configure(['apply', '--project-root', root, '--plan', planPath])).rejects.toThrow(
          'Public configuration plan changed',
        ),
      );
      expect(await inventory(root)).toEqual(withPlan);
      expect(await Bun.file(path.join(root, '.agent/runtime-initialization.pending.v1.json')).exists()).toBe(false);
      expect(await Bun.file(path.join(root, '.agent/runtime-initialization.v1.json')).exists()).toBe(false);
      expect(
        await Promise.all(
          [
            'AGENTS.md',
            'AGENT.sidecar.md',
            'agent-runtime.config.v1.yaml',
            'docs/agent-instructions/documentation-policy.v1.json',
          ].map((file) => readFile(path.join(root, file))),
        ),
      ).toEqual(captured.before.map((entry) => Buffer.from(entry)));
    } finally {
      await rm(planPath);
    }
    expect(await inventory(root)).toEqual(before);
    const altered = parseDocument(await readFile(configPath, 'utf8'));
    altered.setIn(['runtime', 'bundle'], 'foreign-bundle');
    altered.setIn(['runtime', 'schema_root'], 'foreign-bundle/schemas');
    altered.setIn(['runtime', 'instruction_root'], 'foreign-bundle/instructions');
    altered.setIn(['runtime', 'tooling_root'], 'foreign-bundle/tooling');
    const sourceIndex = previous.knowledge.sources.findIndex((source) => source.id === 'runtime-development-lifecycle');
    if (sourceIndex < 0 || previous.knowledge.sources[sourceIndex]?.kind !== 'local')
      throw new Error('Fixture needs the local lifecycle knowledge source');
    altered.setIn(
      ['knowledge', 'sources', sourceIndex, 'location'],
      'foreign-bundle/instructions/development-lifecycle.md',
    );
    await writeFile(configPath, String(altered));
    const beforeRebind = await inventory(root);
    const rebound = captureConsumerConfiguration(desired);
    const reboundPlan = planConsumerConfiguration(desired);
    const reboundConfig = parseRuntimeConfigYaml(rebound.targetConfig);
    expect(rebound.plan.binding).not.toBe(publicPlan.binding);
    expect(reboundConfig.runtime.bundle).toBe(target.runtime.bundle);
    expect(reboundConfig.knowledge.sources[sourceIndex]?.location).toBe(
      `${target.runtime.bundle}/instructions/development-lifecycle.md`,
    );
    expect(reboundConfig.knowledge.sources.filter((_, index) => index !== sourceIndex)).toEqual(
      previous.knowledge.sources.filter((_, index) => index !== sourceIndex),
    );
    expect(reboundConfig.knowledge.sources.find((source) => source.id === 'project-context')?.location).toBe(
      'AGENT.sidecar.md',
    );
    expect(reboundConfig.agents).toEqual(previous.agents);
    expect(reboundConfig.teams).toEqual(previous.teams);
    expect(reboundPlan).toEqual(rebound.plan);
    expect(JSON.stringify(reboundPlan)).not.toContain('foreign-bundle');
    expect(JSON.stringify(reboundPlan)).not.toContain('development-lifecycle.md');
    expect(await inventory(root)).toEqual(beforeRebind);
    altered.setIn(
      ['knowledge', 'sources', sourceIndex, 'location'],
      'foreign-bundle/instructions/not-a-bundled-resource.md',
    );
    await writeFile(configPath, String(altered));
    const beforeMissing = await inventory(root);
    expect(() => planConsumerConfiguration(desired)).toThrow();
    expect(await inventory(root)).toEqual(beforeMissing);
    expect(performance.now() - started).toBeLessThanOrEqual(30000);
    completed = true;
  } finally {
    console.info('Retained consumer fixture: ' + root);
    if (completed) expect(performance.now() - started).toBeLessThanOrEqual(30000);
  }
}, 30000);

test('team access changes only for explicit valid grants and binds the request', async () => {
  const { root, desired } = await fixture();
  try {
    const original = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    const team = Object.keys(original.teams)[0];
    if (!team) throw new Error('Fixture needs a configured team');
    const plain = captureConsumerConfiguration(desired);
    const granted = captureConsumerConfiguration({ ...desired, teamProjectGrants: [`${team}=three`] });
    const target = parseRuntimeConfigYaml(granted.targetConfig);
    expect(granted.plan.request.team_project_grants).toEqual([`${team}=three`]);
    expect(granted.plan.changes.team_project_grants).toEqual([`${team}=three`]);
    expect(granted.plan.binding).not.toBe(plain.plan.binding);
    expect(target.teams[team]?.allowed_projects).toEqual([...(original.teams[team]?.allowed_projects ?? []), 'three']);
    for (const other of Object.keys(original.teams).filter((key) => key !== team))
      expect(target.teams[other]).toEqual(original.teams[other]);
    expect(() =>
      planConsumerConfiguration({ ...desired, teamProjectGrants: [`${team}=three`, `${team}=three`] }),
    ).toThrow();
    expect(() => planConsumerConfiguration({ ...desired, teamProjectGrants: ['missing-team=three'] })).toThrow();
    expect(() => planConsumerConfiguration({ ...desired, teamProjectGrants: [`${team}=missing-project`] })).toThrow();
    const existing = original.teams[team]?.allowed_projects[0];
    if (!existing) throw new Error('Fixture needs existing team access');
    expect(() => planConsumerConfiguration({ ...desired, teamProjectGrants: [`${team}=${existing}`] })).toThrow();
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('pending receipt with different template hash is refused explicitly', async () => {
  const { root, desired } = await fixture();
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    const receipt = await parseReceipt(await readFile(receiptPath, 'utf8'));
    const altered = {
      ...receipt,
      templates: receipt.templates.map((entry, index) =>
        index === 0 ? { ...entry, template_sha256: '0'.repeat(64) } : entry,
      ),
    };
    await writeFile(receiptPath, JSON.stringify(altered));
    expect(() => planConsumerConfiguration(desired)).toThrow(/templates differ.*older bundle validation/i);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('an existing admission gate does not make the read-only plan ineligible', async () => {
  const { root, desired } = await fixture();
  try {
    expect(await Bun.file(path.join(root, '.vida/storage-admission.v1.sqlite')).exists()).toBe(true);
    const workspace = deriveWorkspaceId(desired.repository, root);
    const result = await withExclusiveInitConfigAdmission(root, workspace, async ({ assertActive }) => {
      assertActive();
      return planConsumerConfiguration(desired);
    });
    expect(result.changes.added_projects).toEqual(['three']);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('pending receipt derivation preserves provenance and binds derived target without writing', async () => {
  const { root, desired } = await fixture();
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    const before = await readFile(receiptPath, 'utf8');
    const workspace = deriveWorkspaceId(desired.repository, root);
    const result = await withExclusiveInitConfigAdmission(root, workspace, ({ assertActive }) =>
      derivePendingConfigurationReceipt(desired, assertActive),
    );
    const previous = await parseReceipt(before);
    const target = await parseReceipt(result.targetReceipt);
    expect(result.beforeReceipt.toString()).toBe(before);
    expect(target.provenance).toBe(previous.provenance);
    expect(target.created_at).toBe(previous.created_at);
    expect(target.workspace_id).toBe(previous.workspace_id);
    expect(target.project_ids).toEqual(['one', 'three', 'two']);
    expect(target.config_digest).not.toBe(previous.config_digest);
    expect(await readFile(receiptPath, 'utf8')).toBe(before);
    const ctx = initializationObservationContext(desired);
    const config = parseRuntimeConfigYaml(await readFile(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    const policy = await readFile(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'), 'utf8');
    expect(ctx.describePolicy(config, policy)).toMatchObject({ canonical_roots: [], map_paths: [] });
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('configuration pending blocks legacy init under the shared gate', async () => {
  const { root, request } = await fixture();
  try {
    const pending = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    const bytes = '{"schema":"ConsumerConfigurationOperation/v1"}';
    const receipt = await readFile(path.join(root, '.agent/runtime-initialization.v1.json'));
    await writeFile(pending, bytes);
    await Promise.resolve(
      expect(initializeProjectFromBundle({ ...request, reconcileExisting: true }, packageRoot)).rejects.toThrow(
        /consumer configuration/,
      ),
    );
    expect(await readFile(pending, 'utf8')).toBe(bytes);
    expect(await readFile(path.join(root, '.agent/runtime-initialization.v1.json'))).toEqual(receipt);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('legacy pending receipt resumes under admission with unchanged v1 bytes', async () => {
  const { root, request } = await fixture();
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    const pendingPath = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    const previous = await readFile(receiptPath);
    await rm(receiptPath);
    await rm(path.join(root, '.agent/initialization-provenance'), { recursive: true, force: true });
    await writeFile(pendingPath, previous);
    const result = await initializeProjectFromBundle({ ...request, reconcileExisting: true }, packageRoot);
    expect(result.status).toBe('resumed_initialization');
    expect(await readFile(receiptPath)).toEqual(previous);
    expect(await Bun.file(pendingPath).exists()).toBe(false);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('legacy reconciliation reads an existing receipt but requires admission to create one', async () => {
  const started = performance.now();
  const { root, request } = await fixture();
  let completed = false;
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    const outputPaths = [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
    ].map((file) => path.join(root, file));
    const outputs = await Promise.all(outputPaths.map((file) => readFile(file)));
    const receipt = await readFile(receiptPath);
    const workspace = deriveWorkspaceId(request.repository, root);
    await withExclusiveInitConfigAdmission(root, workspace, async ({ assertActive }) => {
      expect((await initializeProjectFromBundle({ ...request, reconcileExisting: true }, packageRoot)).status).toBe(
        'existing',
      );
      expect(await readFile(receiptPath)).toEqual(receipt);
      expect(await Promise.all(outputPaths.map((file) => readFile(file)))).toEqual(outputs);
      assertActive();
      await rm(receiptPath);
      await Promise.resolve(
        expect(initializeProjectFromBundle({ ...request, reconcileExisting: true }, packageRoot)).rejects.toThrow(),
      );
      expect(await Bun.file(receiptPath).exists()).toBe(false);
      expect(await Promise.all(outputPaths.map((file) => readFile(file)))).toEqual(outputs);
      assertActive();
    });
    expect((await initializeProjectFromBundle({ ...request, reconcileExisting: true }, packageRoot)).status).toBe(
      'reconciled_existing',
    );
    expect((await parseReceipt(await readFile(receiptPath, 'utf8'))).provenance).toBe('adopted_existing');
    expect(await Promise.all(outputPaths.map((file) => readFile(file)))).toEqual(outputs);
    expect(performance.now() - started).toBeLessThanOrEqual(30000);
    completed = true;
  } finally {
    console.info('Retained consumer fixture: ' + root);
    if (completed) expect(performance.now() - started).toBeLessThanOrEqual(30000);
  }
}, 30000);

test('refuses pending, stale receipt, invalid mappings and existing Host state', async () => {
  const { root, request, desired } = await fixture();
  try {
    expect(planConsumerConfiguration(desired).changes.added_projects).toEqual(['three']);
    expect(() => planConsumerConfiguration({ ...request, projectMappings: ['one=one'] })).toThrow();
    expect(() => planConsumerConfiguration({ ...desired, projectMappings: ['one=one', 'two=three'] })).toThrow();
    const pending = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    await writeFile(pending, '{"schema":"unknown/v1"}');
    expect(() => planConsumerConfiguration(desired)).toThrow(/Pending/);
    await rm(pending);
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const original = await readFile(configPath, 'utf8');
    await writeFile(configPath, `${original}\n# changed\n`);
    expect(() => planConsumerConfiguration(desired)).toThrow(/receipt/i);
    await writeFile(configPath, original);
    await mkdir(path.join(root, '.agent/work'), { recursive: true });
    await writeFile(path.join(root, '.agent/work/session-handoff.v1.sqlite'), 'foreign');
    expect(() => planConsumerConfiguration(desired)).toThrow();
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);
