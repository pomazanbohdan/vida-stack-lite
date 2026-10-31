import { expect, test } from 'bun:test';
import { mkdtemp, realpath, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { configure, configureArguments, main, requestFromPlan } from '../bin/configure.ts';
import { cliMetadataResult } from '../bin/cli-metadata.ts';

const binding = 'a'.repeat(64);
const plan = {
  schema: 'ConsumerConfigurationPlan/v1',
  request: { repository: 'repo', projects: [{ id: 'app', root: '.' }], team_project_grants: ['team=app'] },
  operation_id: `config-${binding}`,
  binding,
  changes: { added_projects: ['app'], team_project_grants: ['team=app'], relocation: 'none' },
};

test('configure enforces mode options and adapts a closed public plan', () => {
  expect(requestFromPlan(plan, '/root')).toEqual({
    request: { projectRoot: '/root', repository: 'repo', projectMappings: ['app=.'], teamProjectGrants: ['team=app'] },
    binding,
    operationId: `config-${binding}`,
  });
  expect(() => requestFromPlan({ ...plan, extra: true }, '/root')).toThrow();
  expect(() => requestFromPlan({ ...plan, operation_id: 'other' }, '/root')).toThrow();
  expect(() =>
    requestFromPlan({ ...plan, request: { ...plan.request, projects: [{ id: 'app', root: '.', extra: 1 }] } }, '/root'),
  ).toThrow();
  expect(
    configureArguments([
      'resume',
      '--project-root',
      path.resolve('.'),
      '--repository',
      'repo',
      '--project',
      'app=.',
      '--allow-project',
      'team=app',
      '--operation',
      `config-${binding}`,
    ]).mode,
  ).toBe('resume');
  for (const args of [
    ['inspect', '--project-root', path.resolve('.'), '--project-root', path.resolve('.')],
    ['apply', '--project-root', path.resolve('.')],
    ['plan', '--project-root', path.resolve('.'), '--repository', 'repo', '--project', 'app=.', '--bundle', 'other'],
    ['resume', '--project-root', path.resolve('.'), '--repository', 'repo', '--project', 'app=.'],
  ])
    expect(() => configureArguments(args)).toThrow();
  const help = JSON.stringify(cliMetadataResult(['configure', '--help'], {}));
  for (const option of ['--plan', '--operation', '--allow-project', '--move-project']) expect(help).toContain(option);
});

test('relocation plan has a closed bounded projection and adapts moves', () => {
  const moving = {
    ...plan,
    request: {
      ...plan.request,
      projects: [{ id: 'app', root: 'new/app' }],
      project_moves: [{ id: 'app', oldRoot: 'old/app', newRoot: 'new/app' }],
    },
    changes: {
      ...plan.changes,
      relocation: {
        files: 4,
        directories: 2,
        source_directories_retained: 2,
        source_empty_directories_retained: 1,
        projection: 'plan_only',
      },
    },
  };
  expect(requestFromPlan(moving, '/root').request.projectMoves).toEqual(['app=old/app:new/app']);
  expect(
    configureArguments([
      'plan',
      '--project-root',
      path.resolve('.'),
      '--repository',
      'repo',
      '--project',
      'app=new/app',
      '--move-project',
      'app=old/app:new/app',
    ]),
  ).toMatchObject({ projectMoves: ['app=old/app:new/app'] });
  expect(
    configureArguments([
      'resume',
      '--project-root',
      path.resolve('.'),
      '--repository',
      'repo',
      '--project',
      'app=new/app',
      '--move-project',
      'app=old/app:new/app',
      '--operation',
      `config-${binding}`,
    ]),
  ).toMatchObject({ projectMoves: ['app=old/app:new/app'] });
  const relocation = moving.changes.relocation;
  for (const bad of [
    { ...moving, request: { ...moving.request, project_moves: [] } },
    { ...moving, request: { ...moving.request, project_moves: [{ ...moving.request.project_moves[0], extra: true }] } },
    { ...moving, request: { ...moving.request, project_moves: [{ id: 'app', oldRoot: 'old:bad', newRoot: 'new' }] } },
    { ...moving, request: { ...moving.request, project_moves: [{ id: '@', oldRoot: 'old/app', newRoot: 'new/app' }] } },
    { ...moving, request: { ...moving.request, project_moves: [{ id: 'app', oldRoot: '../x', newRoot: 'new/app' }] } },
    {
      ...moving,
      request: { ...moving.request, project_moves: [{ id: 'app', oldRoot: 'old/app', newRoot: 'bad root' }] },
    },
    { ...moving, changes: { ...moving.changes, relocation: { ...relocation, extra: 1 } } },
    ...[-1, 0.5, 10001, Number.MAX_SAFE_INTEGER, NaN].map((files) => ({
      ...moving,
      changes: { ...moving.changes, relocation: { ...relocation, files } },
    })),
    { ...moving, changes: { ...moving.changes, relocation: { ...relocation, source_directories_retained: 0 } } },
    { ...moving, changes: { ...moving.changes, relocation: { ...relocation, source_empty_directories_retained: 3 } } },
    { ...moving, changes: { ...moving.changes, relocation: 'none' } },
    { ...plan, changes: { ...plan.changes, relocation } },
  ])
    expect(() => requestFromPlan(bad, '/root')).toThrow();
  expect(() =>
    configureArguments([
      'apply',
      '--project-root',
      path.resolve('.'),
      '--plan',
      'plan.json',
      '--move-project',
      'app=old:new',
    ]),
  ).toThrow();
});

test('parse errors have no effects and inspect is read-only', async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-config-cli-')));
  let completed = false;
  try {
    await Promise.resolve(
      expect(configure(['apply', '--project-root', root, '--plan', 'ignored', '--bundle', 'x'])).rejects.toThrow(),
    );
    await Promise.resolve(
      expect(
        configure(['apply', '--project-root', root, '--plan', 'ignored', '--move-project', 'a=old:new']),
      ).rejects.toThrow(),
    );
    expect(await readdir(root)).toEqual([]);
    expect(await configure(['inspect', '--project-root', root])).toEqual({ status: 'no_pending' });
    expect(await readdir(root)).toEqual([]);
    completed = true;
  } finally {
    if (completed) await rm(root, { recursive: true, force: true });
  }
});

test('CLI awaits asynchronous operation before writing output', async () => {
  let resolve!: (value: unknown) => void;
  const pending = new Promise<unknown>((done) => {
    resolve = done;
  });
  const output: string[] = [];
  const completion = main(
    ['inspect'],
    { log: (value: unknown) => output.push(String(value)), error: (value: unknown) => output.push(String(value)) },
    { exitCode: undefined },
    true,
    () => pending,
  );
  expect(output).toEqual([]);
  resolve({ status: 'completed' });
  await completion;
  expect(output).toEqual(['{"status":"completed"}']);
});
