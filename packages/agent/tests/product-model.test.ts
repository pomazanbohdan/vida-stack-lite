import { describe, expect, test } from 'bun:test';
import { Ajv2020 } from 'ajv/dist/2020.js';
import modelJsonSchema from '../schemas/product-model.v1.schema.json' with { type: 'json' };
import { WORK_ITEM_TYPES } from '../src/work-items/catalog.js';
import {
  isChildTypeAllowed,
  productModelSchema,
  validateProductHierarchy,
  type ProductDefinition,
  type ProductHierarchyPolicy,
  type ProductModelDefinition,
} from '../src/config/product-model.js';

const codes = WORK_ITEM_TYPES.map(({ code }) => code);
const model: ProductModelDefinition = {
  schema: 'ProductModel/v1',
  version: 1,
  repository: { repository_id: 'vida-agent', prefix: 'VIDA' },
  projects: [
    {
      project_id: 'codex',
      title: 'Codex',
      prefix: 'CODEX',
      project_root: '.',
      code_selectors: ['packages/codex/**'],
      documents: {
        root: 'docs/codex',
        index: 'docs/codex/index.md',
        requirements: {
          root: 'docs/shared',
          areas: {
            sync: {
              business: 'docs/shared/sync/business',
              system: 'docs/shared/sync/system',
              acceptance: 'docs/shared/sync/acceptance',
              test_cases: 'docs/shared/sync/test-cases',
            },
          },
        },
        research: 'docs/codex/research',
        decisions: 'docs/codex/decisions',
      },
      work_items: {
        storage_root: '.vida/codex/work',
        enabled_types: ['TASK', 'BUG', 'PBI'],
        hierarchy: {
          mode: 'custom',
          allowed_children: {
            TASK: ['PBI'],
            BUG: ['BUG'],
            PBI: ['TASK'],
          },
        },
      },
    },
    {
      project_id: 'agent',
      title: 'Agent',
      prefix: 'AGENT',
      project_root: 'packages/agent',
      code_selectors: [],
      documents: {
        root: 'docs/agent',
        index: 'docs/agent/index.md',
        requirements: { root: 'docs/shared', areas: {} },
        research: 'docs/agent/research',
        decisions: 'docs/agent/decisions',
      },
      work_items: {
        storage_root: '.vida/agent/work',
        enabled_types: ['TASK', 'BUG', 'PBI'],
        hierarchy: { mode: 'custom', allowed_children: { PBI: ['BUG'] } },
      },
    },
    {
      project_id: 'powers',
      title: 'Powers',
      prefix: 'POWERS',
      project_root: 'packages/powers',
      code_selectors: ['research/**/*.ts'],
      documents: {
        root: 'docs/powers',
        index: 'docs/powers/index.md',
        requirements: { root: 'docs/powers/requirements', areas: {} },
        research: 'docs/powers/research',
        decisions: 'docs/powers/decisions',
      },
      work_items: { storage_root: '.vida/powers/work', enabled_types: ['RESEARCH'], hierarchy: { mode: 'any' } },
    },
  ],
};

const validateJsonSchema = new Ajv2020({ allErrors: true }).compile(modelJsonSchema);

describe('product model contract', () => {
  test('validates a three-project model with independent wiki roots and shared documents', () => {
    const parsed = productModelSchema.parse(model);
    expect(parsed.projects.map((project: ProductDefinition) => project.project_id)).toEqual([
      'codex',
      'agent',
      'powers',
    ]);
    expect(parsed.projects[0]?.documents.root).not.toBe(parsed.projects[1]?.documents.root);
    expect(parsed.projects[0]?.documents.requirements.root).toBe(parsed.projects[1]?.documents.requirements.root);
  });

  test('rejects duplicate project IDs and prefixes, invalid prefixes, and unsafe paths', () => {
    const duplicateId = structuredClone(model);
    duplicateId.projects[1]!.project_id = 'codex';
    const duplicatePrefix = structuredClone(model);
    duplicatePrefix.projects[1]!.prefix = 'CODEX';
    const invalidPrefix = structuredClone(model);
    invalidPrefix.projects[1]!.prefix = 'lowercase';
    const unsafePath = structuredClone(model);
    unsafePath.projects[1]!.documents.root = '../escape';
    for (const invalid of [duplicateId, duplicatePrefix, invalidPrefix, unsafePath]) {
      expect(productModelSchema.safeParse(invalid).success).toBe(false);
    }
    expect(productModelSchema.parse(model).projects[0]?.project_root).toBe('.');
  });

  test('uses the current lowercase runtime ID syntax and supports third-party products', () => {
    for (const invalidId of ['Codex', 'a.b', 'a_b', 'a'.repeat(65), '']) {
      for (const owner of ['repository', 'project']) {
        const value = structuredClone(model);
        if (owner === 'repository') value.repository.repository_id = invalidId;
        else value.projects[0]!.project_id = invalidId;
        expect(productModelSchema.safeParse(value).success).toBe(false);
        expect(validateJsonSchema(value)).toBe(false);
      }
    }
    const thirdParty = structuredClone(model);
    thirdParty.repository.repository_id = 'r'.repeat(64);
    thirdParty.projects[0]!.project_id = 'customer-app';
    expect(productModelSchema.safeParse(thirdParty).success).toBe(true);
    expect(validateJsonSchema(thirdParty)).toBe(true);
  });

  test('allows a product prefix to equal the repository prefix', () => {
    const value = structuredClone(model);
    value.projects[0]!.prefix = value.repository.prefix;
    expect(productModelSchema.safeParse(value).success).toBe(true);
  });

  test('rejects unsafe path segments through both configured validators', () => {
    for (const path of [
      '../escape',
      '/tmp/x',
      'C:/x',
      'C:x',
      'a\\b',
      '.git/x',
      'a/.GIT/x',
      'a\u0000b',
      'a\u0085b',
      'CON',
      'con.txt',
      'a.',
      'a ',
      'a//b',
      'a/',
      'a/./b',
      'a~1',
      'a~2.txt',
    ]) {
      const value = structuredClone(model);
      value.projects[0]!.documents.root = path;
      expect(productModelSchema.safeParse(value).success).toBe(false);
      expect(validateJsonSchema(value)).toBe(false);
    }
    for (const path of ['.', 'docs/shared', 'docs/business requirements']) {
      const value = structuredClone(model);
      value.projects[0]!.documents.root = path;
      expect(productModelSchema.safeParse(value).success).toBe(true);
      expect(validateJsonSchema(value)).toBe(true);
    }
  });

  test('rejects missing hierarchy, duplicate enabled/child entries, unknown codes and disabled references', () => {
    const missingHierarchy = structuredClone(model);
    Reflect.deleteProperty(missingHierarchy.projects[0]!.work_items, 'hierarchy');
    const duplicateEnabled = structuredClone(model);
    duplicateEnabled.projects[0]!.work_items.enabled_types.push('TASK');
    const duplicateChild = structuredClone(model);
    if (duplicateChild.projects[0]!.work_items.hierarchy.mode === 'custom') {
      duplicateChild.projects[0]!.work_items.hierarchy.allowed_children.TASK!.push('PBI');
    }
    const unknownEnabled = structuredClone(model);
    Reflect.set(unknownEnabled.projects[0]!.work_items.enabled_types, 0, 'CUSTOM');
    const disabledReference = structuredClone(model);
    if (disabledReference.projects[0]!.work_items.hierarchy.mode === 'custom') {
      disabledReference.projects[0]!.work_items.hierarchy.allowed_children.TASK!.push('STORY');
    }
    for (const invalid of [missingHierarchy, duplicateEnabled, duplicateChild, unknownEnabled, disabledReference]) {
      expect(productModelSchema.safeParse(invalid).success).toBe(false);
    }
  });

  test('uses per-product custom hierarchy and permits configured cycles or equal types', () => {
    const policy = model.projects[0]!.work_items.hierarchy;
    const enabled = model.projects[0]!.work_items.enabled_types;
    expect(isChildTypeAllowed(policy, enabled, 'TASK', 'PBI')).toBe(true);
    expect(isChildTypeAllowed(policy, enabled, 'BUG', 'BUG')).toBe(true);
    expect(isChildTypeAllowed(policy, enabled, 'PBI', 'TASK')).toBe(true);
    expect(isChildTypeAllowed(policy, enabled, 'PBI', 'BUG')).toBe(false);
    expect(
      isChildTypeAllowed(
        model.projects[1]!.work_items.hierarchy,
        model.projects[1]!.work_items.enabled_types,
        'PBI',
        'TASK',
      ),
    ).toBe(false);
    expect(
      isChildTypeAllowed(
        model.projects[1]!.work_items.hierarchy,
        model.projects[1]!.work_items.enabled_types,
        'PBI',
        'BUG',
      ),
    ).toBe(true);
  });

  test('any mode permits every validated enabled pair, while invalid inputs fail closed', () => {
    const enabled = codes;
    expect(validateProductHierarchy({ mode: 'any' }, enabled).ok).toBe(true);
    for (const parent of enabled)
      for (const child of enabled) {
        expect(isChildTypeAllowed({ mode: 'any' }, enabled, parent, child)).toBe(true);
      }
    expect(isChildTypeAllowed({ mode: 'any' }, enabled, 'CUSTOM', 'TASK')).toBe(false);
    expect(isChildTypeAllowed({ mode: 'any' }, enabled, 'task', 'TASK')).toBe(false);
    expect(isChildTypeAllowed({ mode: 'any', allowed_children: {} }, enabled, 'TASK', 'BUG')).toBe(false);
    expect(isChildTypeAllowed({ mode: 'other' }, enabled, 'TASK', 'BUG')).toBe(false);
    expect(validateProductHierarchy({ mode: 'custom', allowed_children: { TASK: ['PBI'] } }, ['TASK', 'BUG']).ok).toBe(
      false,
    );
  });

  test('empty custom policy permits no children and reports disabled parents', () => {
    const empty = { mode: 'custom', allowed_children: {} };
    expect(validateProductHierarchy(empty, ['TASK', 'BUG']).ok).toBe(true);
    expect(isChildTypeAllowed(empty, ['TASK', 'BUG'], 'BUG', 'TASK')).toBe(false);
    const invalid = validateProductHierarchy({ mode: 'custom', allowed_children: { PBI: ['TASK'] } }, ['TASK']);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok)
      expect(invalid.issues).toContainEqual({
        path: 'hierarchy.allowed_children.PBI',
        message: 'parent code is not enabled: PBI',
      });
  });

  test('initial product policy permits PBI tasks and bugs while keeping BUG and TASK terminal', () => {
    const policy: ProductHierarchyPolicy = {
      mode: 'custom',
      allowed_children: { PBI: ['TASK', 'BUG'], BUG: [], TASK: [] },
    };
    const enabled = ['PBI', 'BUG', 'TASK'];
    expect(isChildTypeAllowed(policy, enabled, 'PBI', 'TASK')).toBe(true);
    expect(isChildTypeAllowed(policy, enabled, 'PBI', 'BUG')).toBe(true);
    for (const parent of ['BUG', 'TASK'])
      for (const child of enabled) {
        expect(isChildTypeAllowed(policy, enabled, parent, child)).toBe(false);
      }
  });

  test('keeps the JSON Schema envelope and declarative type checks aligned with Zod', () => {
    expect(validateJsonSchema(model)).toBe(true);
    expect(productModelSchema.safeParse(model).success).toBe(true);
    const invalids = [
      (() => {
        const value = structuredClone(model);
        Reflect.deleteProperty(value.projects[0]!.work_items, 'hierarchy');
        return value;
      })(),
      (() => {
        const value = structuredClone(model);
        Reflect.set(value.projects[0]!.work_items, 'hierarchy', { mode: 'custom' });
        return value;
      })(),
      (() => {
        const value = structuredClone(model);
        Reflect.set(value.projects[0]!.work_items.enabled_types, 0, 'CUSTOM');
        return value;
      })(),
      (() => {
        const value = structuredClone(model);
        Reflect.set(
          value.projects[0]!.work_items.hierarchy.mode === 'custom'
            ? value.projects[0]!.work_items.hierarchy.allowed_children
            : {},
          'CUSTOM',
          ['TASK'],
        );
        return value;
      })(),
      (() => {
        const value = structuredClone(model);
        Reflect.set(
          value.projects[0]!.work_items.hierarchy.mode === 'custom'
            ? value.projects[0]!.work_items.hierarchy.allowed_children.TASK!
            : [],
          0,
          'CUSTOM',
        );
        return value;
      })(),
      (() => {
        const value = structuredClone(model);
        Reflect.set(value, 'schema', 'ProductModel/v0');
        return value;
      })(),
      (() => ({ ...structuredClone(model), extra: true }))(),
      (() => {
        const value = structuredClone(model);
        value.projects[0]!.work_items.enabled_types.push('TASK');
        return value;
      })(),
      (() => {
        const value = structuredClone(model);
        const policy = value.projects[0]!.work_items.hierarchy;
        if (policy.mode === 'custom') policy.allowed_children.TASK!.push('PBI');
        return value;
      })(),
    ];
    for (const invalid of invalids) {
      expect(validateJsonSchema(invalid)).toBe(false);
      expect(productModelSchema.safeParse(invalid).success).toBe(false);
    }
  });
});
