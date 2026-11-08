import { expect, test } from 'bun:test';
import { resolveSetupInput, type SetupPromptPort, type SetupPromptRequest } from '../bin/init-prompt.js';
import type { SetupInputDraft } from '../bin/init-product-input.js';

const model = {
  schema: 'ProductModel/v1',
  version: 1,
  repository: { repository_id: 'vida', prefix: 'VIDA' },
  projects: [
    {
      project_id: 'agent',
      title: 'Agent',
      prefix: 'AGENT',
      project_root: 'packages/agent',
      code_selectors: ['packages/agent/bin'],
      documents: {
        root: 'docs/agent',
        index: 'docs/agent/INDEX.md',
        requirements: { root: 'docs/agent/requirements', areas: {} },
        research: 'docs/agent/research',
        decisions: 'docs/agent/decisions',
      },
      work_items: { storage_root: '.agent/work/agent', enabled_types: ['TASK'], hierarchy: { mode: 'any' } },
    },
  ],
} as const;

class ScriptedPromptPort implements SetupPromptPort {
  readonly requests: SetupPromptRequest[] = [];

  constructor(
    readonly interactive: boolean,
    private readonly replies: readonly unknown[],
  ) {}

  async prompt(request: SetupPromptRequest): Promise<unknown> {
    this.requests.push(request);
    const reply = this.replies[this.requests.length - 1];
    if (reply instanceof Error) throw reply;
    if (reply === undefined) return { kind: 'cancelled' };
    return reply;
  }
}

test('wrong-type model fields refuse before asking for corrections', async () => {
  const port = new ScriptedPromptPort(true, []);
  const result = await resolveSetupInput(
    { projectRoot: 'C:\\work\\vida', model: { ...model, repository: 42 }, reconcile: false },
    port,
  );
  expect(result).toMatchObject({ status: 'refused', reason: 'invalid_model' });
  expect(port.requests).toEqual([]);
});

test('prompt mutation cannot replace explicit values or mutate the caller draft', async () => {
  const partialModel = {
    schema: 'ProductModel/v1',
    version: 1,
    repository: { repository_id: 'vida', prefix: 'VIDA' },
  };
  const port: SetupPromptPort = {
    interactive: true,
    async prompt(request) {
      if (request.field !== 'model') throw new Error('Expected model request');
      const value = request.currentValue;
      if (typeof value !== 'object' || value === null || !('repository' in value)) {
        throw new Error('Expected supplied partial model');
      }
      const repository = value.repository;
      if (typeof repository !== 'object' || repository === null || !('prefix' in repository)) {
        throw new Error('Expected supplied repository prefix');
      }
      repository.prefix = 'OTHER';
      return { kind: 'value', value: { ...model, repository: { ...model.repository, prefix: 'OTHER' } } };
    },
  };
  const result = await resolveSetupInput(
    { projectRoot: 'C:\\work\\vida', model: partialModel, reconcile: false },
    port,
  );
  expect(result).toMatchObject({ status: 'refused', reason: 'explicit_value_changed' });
  expect(partialModel.repository.prefix).toBe('VIDA');
});

test('complete input returns without invoking the prompt port', async () => {
  const port = new ScriptedPromptPort(true, []);
  const result = await resolveSetupInput(
    { projectRoot: 'C:\\work\\vida', model, reconcile: false, legacyProjectIdMap: { 'old-agent': 'agent' } },
    port,
  );
  expect(result.status).toBe('ready');
  if (result.status === 'ready') {
    expect(result.input.projectRoot).toBe('C:\\work\\vida');
    expect(result.input.reconcile).toBe(false);
    expect(JSON.stringify(result.input.model)).toBe(JSON.stringify(model));
    expect(result.input.legacyProjectIdMap).toEqual({ 'old-agent': 'agent' });
  }
  expect(port.requests).toEqual([]);
});

test('missing no-TTY input returns stable pointers and makes no prompt call', async () => {
  const port = new ScriptedPromptPort(false, []);
  expect(await resolveSetupInput({}, port)).toEqual({
    status: 'input_required',
    missing: ['/projectRoot', '/model', '/reconcile'],
  });
  expect(port.requests).toEqual([]);
});

test('interactive completion preserves every supplied model value and asks only missing fields', async () => {
  const partialModel = {
    schema: 'ProductModel/v1',
    version: 1,
    repository: { repository_id: 'vida', prefix: 'VIDA' },
    projects: [{ project_id: 'agent', title: 'Agent' }],
  };
  const draft: SetupInputDraft = { projectRoot: 'C:\\custom\\repo', model: partialModel };
  const port = new ScriptedPromptPort(true, [
    { kind: 'value', value: model },
    { kind: 'value', value: true },
  ]);
  const result = await resolveSetupInput(draft, port);
  expect(result.status).toBe('ready');
  if (result.status === 'ready') {
    expect(result.input.projectRoot).toBe('C:\\custom\\repo');
    expect(result.input.reconcile).toBe(true);
    expect(JSON.stringify(result.input.model)).toBe(JSON.stringify(model));
  }
  expect(port.requests.map((request) => request.field)).toEqual(['model', 'reconcile']);
  const modelRequest = port.requests[0];
  expect(modelRequest).toMatchObject({
    field: 'model',
    pointer: '/model',
    currentValue: partialModel,
  });
  if (modelRequest?.field !== 'model') throw new Error('Expected model request');
  expect(modelRequest.missing).toContain('/model/projects/0/prefix');
});

test('missing project root and model are collected through separate asynchronous prompts', async () => {
  const port = new ScriptedPromptPort(true, [
    { kind: 'value', value: 'C:\\work\\repo' },
    { kind: 'value', value: model },
    { kind: 'value', value: false },
  ]);
  const result = await resolveSetupInput({}, port);
  expect(result.status).toBe('ready');
  if (result.status === 'ready') {
    expect(result.input.projectRoot).toBe('C:\\work\\repo');
    expect(result.input.reconcile).toBe(false);
    expect(JSON.stringify(result.input.model)).toBe(JSON.stringify(model));
  }
  expect(port.requests.map((request) => request.pointer)).toEqual(['/projectRoot', '/model', '/reconcile']);
});

test('cancellation, changed explicit values, invalid prompted data and prompt exceptions refuse safely', async () => {
  const cancelled = new ScriptedPromptPort(true, [{ kind: 'cancelled' }]);
  expect(await resolveSetupInput({}, cancelled)).toEqual({ status: 'cancelled' });

  const changedModel = { ...model, repository: { repository_id: 'other', prefix: 'VIDA' } };
  const changed = new ScriptedPromptPort(true, [{ kind: 'value', value: changedModel }]);
  expect(
    await resolveSetupInput(
      {
        projectRoot: 'C:\\work\\repo',
        model: { schema: 'ProductModel/v1', version: 1, repository: { repository_id: 'vida' } },
      },
      changed,
    ),
  ).toMatchObject({
    status: 'refused',
    reason: 'explicit_value_changed',
  });

  const invalid: unknown = {
    ...model,
    projects: [{ ...model.projects[0], work_items: { ...model.projects[0].work_items, enabled_types: ['NOPE'] } }],
  };
  const invalidPort = new ScriptedPromptPort(true, [{ kind: 'value', value: invalid }]);
  expect(await resolveSetupInput({ projectRoot: 'C:\\work\\repo', reconcile: true }, invalidPort)).toMatchObject({
    status: 'refused',
    reason: 'invalid_model',
  });

  const throwing = new ScriptedPromptPort(true, [new Error('prompt transport failed')]);
  expect(await resolveSetupInput({}, throwing)).toMatchObject({ status: 'refused', reason: 'prompt_failed' });
});

test('invalid input and malformed prompt responses stop before further prompt calls', async () => {
  const noCall = new ScriptedPromptPort(true, []);
  expect(await resolveSetupInput({ projectRoot: 'relative', model, reconcile: true }, noCall)).toMatchObject({
    status: 'refused',
    reason: 'invalid_project_root',
  });
  expect(noCall.requests).toEqual([]);

  const invalidModelPort = new ScriptedPromptPort(true, []);
  const invalidModel: unknown = {
    ...model,
    projects: [{ ...model.projects[0], work_items: { ...model.projects[0].work_items, enabled_types: ['NOPE'] } }],
  };
  expect(
    await resolveSetupInput({ projectRoot: 'C:\\work\\repo', model: invalidModel, reconcile: true }, invalidModelPort),
  ).toMatchObject({ status: 'refused', reason: 'invalid_model' });
  expect(invalidModelPort.requests).toEqual([]);

  const invalidMapPort = new ScriptedPromptPort(true, []);
  expect(
    await resolveSetupInput(
      { projectRoot: 'C:\\work\\repo', model, reconcile: true, legacyProjectIdMap: { 'old-agent': 'unknown' } },
      invalidMapPort,
    ),
  ).toMatchObject({ status: 'refused', reason: 'invalid_legacy_project_id_map' });
  expect(invalidMapPort.requests).toEqual([]);

  const malformed = new ScriptedPromptPort(true, [{ kind: 'unexpected' }]);
  expect(await resolveSetupInput({}, malformed)).toMatchObject({
    status: 'refused',
    reason: 'invalid_prompt_response',
  });
  expect(malformed.requests).toHaveLength(1);

  const primitive = new ScriptedPromptPort(true, [null]);
  expect(await resolveSetupInput({}, primitive)).toMatchObject({
    status: 'refused',
    reason: 'invalid_prompt_response',
  });

  const valueless = new ScriptedPromptPort(true, [{ kind: 'value' }]);
  expect(await resolveSetupInput({}, valueless)).toMatchObject({
    status: 'refused',
    reason: 'invalid_prompt_response',
  });
});

test('repeated scripted resolution produces the same result and prompt sequence', async () => {
  const resolve = async () => {
    const port = new ScriptedPromptPort(true, [
      { kind: 'value', value: 'C:\\work\\repo' },
      { kind: 'value', value: model },
      { kind: 'value', value: true },
    ]);
    return { result: await resolveSetupInput({}, port), requests: port.requests };
  };
  expect(await resolve()).toEqual(await resolve());
});
