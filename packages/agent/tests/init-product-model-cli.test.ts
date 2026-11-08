import { expect, test } from 'bun:test';
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  existsSync,
  linkSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse as parseYaml, stringify } from 'yaml';
import { productModelSchema } from '../src/config/product-model.ts';
import { isPlainRecord } from '../src/contracts/public-ingress.ts';
import { main as initMain } from '../bin/init.ts';
import { configure, main as configureMain, requestFromPlan } from '../bin/configure.ts';
import { readSetupInput } from '../bin/init-cli-input.ts';

function approvedModel() {
  const value: unknown = parseYaml(
    readFileSync(new URL('../docs/decisions/configuration/project-config.proposed.yaml', import.meta.url), 'utf8'),
  );
  if (!isPlainRecord(value)) throw Error('Approved model must be an object');
  return productModelSchema.parse({ schema: 'ProductModel/v1', version: 1, ...value });
}

test('complete canonical product-model CLI forwards exact approved choices without prompting', async () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-model-cli-')));
  let completed = false;
  try {
    const projectRoot = path.join(fixture, 'not-observed');
    const model = approvedModel();
    const input = path.join(fixture, 'input.json');
    writeFileSync(
      input,
      JSON.stringify({ projectRoot, model, reconcile: false, legacyProjectIdMap: { plugin: 'codex' } }),
    );
    const requests: unknown[] = [],
      output: string[] = [],
      errors: unknown[] = [];
    const exit: { exitCode: number | undefined } = { exitCode: undefined };
    await initMain({
      isMain: true,
      bunRuntime: true,
      args: ['--product-model', input],
      io: { log: (x) => output.push(x), error: (x) => errors.push(x) },
      exit,
      initialize: (request) => {
        requests.push(request);
        return { initialized: true };
      },
    });
    expect(errors).toEqual([]);
    expect(requests).toEqual([
      {
        projectRoot,
        repository: model.repository.repository_id,
        projectMappings: model.projects.map((p) => `${p.project_id}=${p.project_root}`),
        productModel: model,
        legacyProjectIdMap: { plugin: 'codex' },
        reconcileExisting: false,
      },
    ]);
    expect(JSON.parse(output[0] ?? 'null')).toEqual({ initialized: true });
    expect(exit.exitCode).toBeUndefined();
    expect(existsSync(projectRoot)).toBe(false);
    completed = true;
  } finally {
    if (completed) rmSync(fixture, { recursive: true, force: true });
    else console.error(`Retained CLI fixture: ${fixture}`);
  }
});

test.each([{ args: [] }, { args: ['--project-root', path.resolve('never-observed-cli-root')] }])(
  'missing non-TTY setup %j returns input_required before initialization',
  async ({ args }) => {
    const output: string[] = [],
      errors: unknown[] = [];
    let calls = 0;
    const exit: { exitCode: number | undefined } = { exitCode: undefined };
    await initMain({
      isMain: true,
      bunRuntime: true,
      args: [...args],
      io: { log: (x) => output.push(x), error: (x) => errors.push(x) },
      exit,
      initialize: () => {
        calls++;
        return {};
      },
    });
    expect(calls).toBe(0);
    expect(errors).toEqual([]);
    expect(JSON.parse(output[0] ?? 'null')).toEqual({
      status: 'input_required',
      missing: args.length === 0 ? ['/projectRoot', '/model', '/reconcile'] : ['/model', '/reconcile'],
    });
    expect(exit.exitCode).toBe(1);
  },
);

test('public v2 configuration plan adapts the complete model and explicit identity map', () => {
  const model = approvedModel();
  const binding = 'a'.repeat(64);
  const value = {
    schema: 'ConsumerConfigurationPlan/v2',
    operation_id: `config-${binding}`,
    binding,
    request: {
      repository: model.repository.repository_id,
      projects: model.projects.map((p) => ({ id: p.project_id, root: p.project_root })),
      team_project_grants: [],
      product_model: model,
      legacy_project_id_map: { plugin: 'codex' },
    },
    changes: { added_projects: [], team_project_grants: [], relocation: 'none' },
  };
  expect(requestFromPlan(value, path.resolve('.')).request).toEqual({
    schema: 'ConsumerConfigurationRequest/v2',
    version: 2,
    projectRoot: path.resolve('.'),
    repository: model.repository.repository_id,
    productModel: model,
    legacyProjectIdMap: { plugin: 'codex' },
    teamProjectGrants: [],
  });
});

async function withInputFixture(run: (root: string) => Promise<void> | void): Promise<void> {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-model-input-')));
  let completed = false;
  try {
    await run(root);
    completed = true;
  } finally {
    if (completed) rmSync(root, { recursive: true, force: true });
    else console.error(`Retained input fixture: ${root}`);
  }
}

function initHarness(args: string[], port?: NonNullable<Parameters<typeof initMain>[0]>['setupPort']) {
  const out: string[] = [],
    err: unknown[] = [],
    requests: unknown[] = [];
  const exit: { exitCode: number | undefined } = { exitCode: undefined };
  return {
    out,
    err,
    requests,
    exit,
    run: () =>
      initMain({
        isMain: true,
        bunRuntime: true,
        args,
        io: { log: (value) => out.push(value), error: (value) => err.push(value) },
        exit,
        initialize: (request) => {
          requests.push(request);
          return { initialized: true };
        },
        ...(port === undefined ? {} : { setupPort: port }),
      }),
  };
}

test.each(['--input', '--product-model'])(
  '%s complete YAML preserves all values and never calls the prompt',
  async (flag) => {
    await withInputFixture(async (root) => {
      const file = path.join(root, 'setup.yaml'),
        model = approvedModel();
      writeFileSync(
        file,
        stringify({
          projectRoot: path.join(root, 'target'),
          model,
          reconcile: true,
          legacyProjectIdMap: { plugin: 'codex' },
        }),
      );
      const cli = initHarness([flag, file], {
        interactive: true,
        prompt: () => {
          throw Error('Complete input must not prompt');
        },
      });
      await cli.run();
      expect(cli.err).toEqual([]);
      expect(cli.requests).toHaveLength(1);
      expect(cli.requests[0]).toMatchObject({
        productModel: model,
        reconcileExisting: true,
        legacyProjectIdMap: { plugin: 'codex' },
      });
      expect(existsSync(path.join(root, 'target'))).toBe(false);
    });
  },
);

test.each([
  ['malformed JSON', '{'],
  ['duplicate keys', 'reconcile: true\nreconcile: false'],
  ['unknown keys', '{"unexpected":1}'],
  ['array document', '[]'],
  ['alias expansion', 'projectRoot: &root /tmp\nmodel: *root'],
  ['multiple documents', '---\n{}\n---\n{}'],
])('setup file refuses %s before prompt or initializer', async (_name, contents) => {
  await withInputFixture(async (root) => {
    const file = path.join(root, 'setup.yaml');
    writeFileSync(file, contents ?? '');
    const cli = initHarness(['--input', file], {
      interactive: true,
      prompt: () => {
        throw Error('Invalid input must not prompt');
      },
    });
    await cli.run();
    expect(cli.err).toEqual([]);
    expect(cli.requests).toEqual([]);
    expect(JSON.parse(cli.out[0] ?? 'null')).toMatchObject({ status: 'refused', reason: 'invalid_input_file' });
    expect(cli.exit.exitCode).toBe(1);
  });
});

test('setup input enforces the exact 32768-byte bound and refuses hardlinks/directories', async () => {
  await withInputFixture((root) => {
    const file = path.join(root, 'setup.json');
    const text = JSON.stringify({ projectRoot: root, model: approvedModel(), reconcile: false });
    writeFileSync(file, text.padEnd(32768));
    expect(readSetupInput(file)).toMatchObject({ projectRoot: root, reconcile: false });
    writeFileSync(file, text.padEnd(32769));
    expect(() => readSetupInput(file)).toThrow();
    writeFileSync(file, text);
    const alias = path.join(root, 'hardlink.json');
    linkSync(file, alias);
    expect(() => readSetupInput(alias)).toThrow();
    const directory = path.join(root, 'directory');
    mkdirSync(directory);
    expect(() => readSetupInput(directory)).toThrow();
  });
});

test.each(['dual input flags', 'legacy/model mix', 'conflicting root', 'conflicting reconcile'])(
  'init refuses %s before effects',
  async (kind) => {
    await withInputFixture(async (root) => {
      const file = path.join(root, 'input.json');
      writeFileSync(file, JSON.stringify({ projectRoot: root, model: approvedModel(), reconcile: false }));
      const extra =
        kind === 'dual input flags'
          ? ['--product-model', file]
          : kind === 'legacy/model mix'
            ? ['--repository', 'repo', '--project', 'app=.']
            : kind === 'conflicting root'
              ? ['--project-root', path.join(root, 'different')]
              : ['--reconcile-existing'];
      const cli = initHarness(['--input', file, ...extra]);
      await cli.run();
      expect(cli.requests).toEqual([]);
      expect(JSON.parse(cli.out[0] ?? 'null')).toMatchObject({ status: 'refused', reason: 'explicit_value_changed' });
    });
  },
);

test('injected cancellation and invalid explicit model leave the target unobserved', async () => {
  const cli = initHarness([], { interactive: true, prompt: async () => ({ kind: 'cancelled' }) });
  await cli.run();
  expect(cli.requests).toEqual([]);
  expect(cli.exit.exitCode).toBe(130);
  expect(JSON.parse(cli.out[0] ?? 'null')).toEqual({ status: 'cancelled' });
  await withInputFixture(async (root) => {
    const model = approvedModel();
    model.repository.prefix = 'lowercase';
    const file = path.join(root, 'input.json');
    writeFileSync(file, JSON.stringify({ projectRoot: root, model, reconcile: false }));
    const invalid = initHarness(['--input', file], {
      interactive: true,
      prompt: () => {
        throw Error('Invalid explicit value must not prompt');
      },
    });
    await invalid.run();
    expect(invalid.requests).toEqual([]);
    expect(JSON.parse(invalid.out[0] ?? 'null')).toMatchObject({ status: 'refused', reason: 'invalid_model' });
  });
});

test('configure no-TTY and cancellation stop before target access and set CLI status', async () => {
  const missingRoot = path.join(tmpdir(), `vida-config-unobserved-${crypto.randomUUID()}`);
  expect(await configure(['plan', '--project-root', missingRoot])).toMatchObject({ status: 'input_required' });
  expect(
    await configure(['resume', '--project-root', missingRoot, '--operation', 'config-pending'], {
      interactive: true,
      prompt: async () => ({ kind: 'cancelled' }),
    }),
  ).toEqual({ status: 'cancelled' });
  const output: string[] = [],
    errors: unknown[] = [],
    exit: { exitCode: number | undefined } = { exitCode: undefined };
  await configureMain(
    ['plan', '--project-root', missingRoot],
    { log: (value) => output.push(String(value)), error: (value) => errors.push(value) },
    exit,
    true,
  );
  expect(exit.exitCode).toBe(1);
  expect(errors).toEqual([]);
  expect(JSON.parse(output[0] ?? 'null')).toMatchObject({ status: 'input_required' });
  expect(existsSync(missingRoot)).toBe(false);
});

test('v2 public plans refuse mismatched model/repository/mappings and invalid identity maps', () => {
  const model = approvedModel(),
    binding = 'b'.repeat(64);
  const plan = {
    schema: 'ConsumerConfigurationPlan/v2',
    operation_id: `config-${binding}`,
    binding,
    request: {
      repository: model.repository.repository_id,
      projects: model.projects.map((p) => ({ id: p.project_id, root: p.project_root })),
      team_project_grants: [],
      product_model: model,
      legacy_project_id_map: {},
    },
    changes: { added_projects: [], team_project_grants: [], relocation: 'none' },
  };
  for (const request of [
    { ...plan.request, repository: 'different' },
    { ...plan.request, projects: [{ id: 'unexpected', root: '.' }] },
    { ...plan.request, projects: [...plan.request.projects, plan.request.projects[0]] },
    { ...plan.request, legacy_project_id_map: { plugin: 'absent' } },
    { ...plan.request, legacy_project_id_map: { plugin: 'codex', old: 'codex' } },
    { ...plan.request, extra: true },
  ])
    expect(() => requestFromPlan({ ...plan, request }, path.resolve('.'))).toThrow();
  expect(() => requestFromPlan({ ...plan, schema: 'ConsumerConfigurationPlan/v1' }, path.resolve('.'))).toThrow();
});
