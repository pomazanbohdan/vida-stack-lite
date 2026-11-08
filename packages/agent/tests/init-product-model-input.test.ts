import { expect, test } from 'bun:test';
import { validateSetupInput, type SetupInputDraft } from '../bin/init-product-input.js';

const completeModel = {
  schema: 'ProductModel/v1',
  version: 1,
  repository: { repository_id: 'vida', prefix: 'VIDA' },
  projects: [
    {
      project_id: 'codex',
      title: 'Codex runtime',
      prefix: 'CODEX',
      project_root: 'packages/codex',
      code_selectors: ['packages/codex/src'],
      documents: {
        root: 'specs/codex',
        index: 'specs/codex/INDEX.md',
        requirements: {
          root: 'specs/codex/requirements',
          areas: {
            runtime: {
              business: 'specs/codex/requirements/runtime/business.md',
              system: 'specs/codex/requirements/runtime/system.md',
              acceptance: 'specs/codex/requirements/runtime/acceptance.md',
              test_cases: 'specs/codex/requirements/runtime/tests.md',
            },
          },
        },
        research: 'research/codex',
        decisions: 'decisions/codex',
      },
      work_items: {
        storage_root: '.agent/work/codex',
        enabled_types: ['EPIC', 'FEATURE', 'BUG', 'TASK', 'RESEARCH'],
        hierarchy: { mode: 'custom', allowed_children: { EPIC: ['FEATURE'], FEATURE: ['BUG', 'TASK'] } },
      },
    },
  ],
} as const;

const completeDraft: SetupInputDraft = {
  projectRoot: 'C:\\work\\vida',
  model: completeModel,
  reconcile: false,
  legacyProjectIdMap: { plugin: 'codex' },
};

test('defined wrong-type model fields refuse instead of being reported as missing', () => {
  const invalidModels = [
    { ...completeModel, repository: 42 },
    { ...completeModel, projects: 'invalid' },
    { ...completeModel, projects: [{ ...completeModel.projects[0], title: 42 }] },
  ];
  for (const model of invalidModels) {
    expect(validateSetupInput({ ...completeDraft, model })).toMatchObject({
      status: 'refused',
      reason: 'invalid_model',
    });
  }
});

test('complete model round-trips every explicit product value and explicit legacy mapping', () => {
  const result = validateSetupInput(completeDraft);
  expect(result.status).toBe('ready');
  if (result.status === 'ready') {
    expect(result.input.projectRoot).toBe('C:\\work\\vida');
    expect(result.input.reconcile).toBe(false);
    expect(JSON.stringify(result.input.model)).toBe(JSON.stringify(completeModel));
    expect(result.input.legacyProjectIdMap).toEqual({ plugin: 'codex' });
  }
});

test('one and many projects are accepted without choosing or dropping a product', () => {
  const secondProject = {
    ...completeModel.projects[0],
    project_id: 'powers',
    title: 'Powers',
    prefix: 'POWERS',
    project_root: 'packages/powers',
  };
  const modelWithManyProjects = { ...completeModel, projects: [...completeModel.projects, secondProject] };
  const result = validateSetupInput({ ...completeDraft, model: modelWithManyProjects });
  expect(result.status).toBe('ready');
  if (result.status === 'ready') expect(JSON.stringify(result.input.model)).toBe(JSON.stringify(modelWithManyProjects));
});

test('missing fields have stable JSON pointers in fixed order', () => {
  expect(validateSetupInput({})).toEqual({
    status: 'missing',
    pointers: ['/projectRoot', '/model', '/reconcile'],
  });
  expect(
    validateSetupInput({
      projectRoot: 'C:\\work\\vida',
      model: {
        schema: 'ProductModel/v1',
        version: 1,
        repository: { repository_id: 'vida', prefix: 'VIDA' },
        projects: [],
      },
      reconcile: true,
    }),
  ).toEqual({ status: 'missing', pointers: ['/model/projects'] });
});

test('relative and malformed project roots refuse', () => {
  expect(validateSetupInput({ ...completeDraft, projectRoot: 'relative/path' })).toMatchObject({
    status: 'refused',
    reason: 'invalid_project_root',
  });
  expect(validateSetupInput({ ...completeDraft, projectRoot: 'C:\\bad\u0000path' })).toMatchObject({
    status: 'refused',
    reason: 'invalid_project_root',
  });
});

test('invalid paths, kinds and hierarchy refuse through the existing product schema', () => {
  const invalidPath: unknown = {
    ...completeModel,
    projects: [
      { ...completeModel.projects[0], documents: { ...completeModel.projects[0].documents, index: '../outside.md' } },
    ],
  };
  expect(validateSetupInput({ ...completeDraft, model: invalidPath })).toMatchObject({
    status: 'refused',
    reason: 'invalid_model',
  });

  const invalidKind: unknown = {
    ...completeModel,
    projects: [
      {
        ...completeModel.projects[0],
        work_items: { ...completeModel.projects[0].work_items, enabled_types: ['TODO'] },
      },
    ],
  };
  expect(validateSetupInput({ ...completeDraft, model: invalidKind })).toMatchObject({
    status: 'refused',
    reason: 'invalid_model',
  });

  const invalidHierarchy: unknown = {
    ...completeModel,
    projects: [
      {
        ...completeModel.projects[0],
        work_items: { ...completeModel.projects[0].work_items, enabled_types: ['TASK'] },
      },
    ],
  };
  expect(validateSetupInput({ ...completeDraft, model: invalidHierarchy })).toMatchObject({
    status: 'refused',
    reason: 'invalid_model',
  });

  const invalidAreaKey: unknown = {
    ...completeModel,
    projects: [
      {
        ...completeModel.projects[0],
        documents: {
          ...completeModel.projects[0].documents,
          requirements: {
            ...completeModel.projects[0].documents.requirements,
            areas: { 'bad/area': completeModel.projects[0].documents.requirements.areas.runtime },
          },
        },
      },
    ],
  };
  const invalidAreaResult = validateSetupInput({ ...completeDraft, model: invalidAreaKey });
  expect(invalidAreaResult).toMatchObject({ status: 'refused', reason: 'invalid_model' });
  if (invalidAreaResult.status === 'refused') expect(JSON.stringify(invalidAreaResult.issues)).toContain('bad~1area');
});

test('invalid reconcile values and legacy identity maps refuse', () => {
  expect(validateSetupInput({ ...completeDraft, reconcile: 'yes' })).toMatchObject({
    status: 'refused',
    reason: 'invalid_model',
  });
  expect(validateSetupInput({ ...completeDraft, legacyProjectIdMap: { plugin: 'unknown' } })).toMatchObject({
    status: 'refused',
    reason: 'invalid_legacy_project_id_map',
  });
  expect(validateSetupInput({ ...completeDraft, legacyProjectIdMap: { 'bad id': 'codex' } })).toMatchObject({
    status: 'refused',
    reason: 'invalid_legacy_project_id_map',
  });
  expect(validateSetupInput({ ...completeDraft, legacyProjectIdMap: [] })).toMatchObject({
    status: 'refused',
    reason: 'invalid_legacy_project_id_map',
  });
  expect(
    validateSetupInput({ ...completeDraft, legacyProjectIdMap: { plugin: 'codex', 'old-codex': 'codex' } }),
  ).toMatchObject({ status: 'refused', reason: 'invalid_legacy_project_id_map' });
});

test('repeated resolution is deterministic and does not mutate caller input', () => {
  const before = structuredClone(completeDraft);
  const first = validateSetupInput(completeDraft);
  const second = validateSetupInput(completeDraft);
  expect(first).toEqual(second);
  expect(completeDraft).toEqual(before);
});
