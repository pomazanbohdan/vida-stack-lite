import { expect, test } from 'bun:test';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { productModelSchema } from '../src/config/product-model.ts';
import { isPlainRecord } from '../src/contracts/public-ingress.ts';
import { createTerminalSetupPort } from '../bin/init-terminal.ts';
import { resolveCliSetup } from '../bin/init-cli-input.ts';

function model() {
  const value: unknown = parse(
    readFileSync(new URL('../docs/decisions/configuration/project-config.proposed.yaml', import.meta.url), 'utf8'),
  );
  if (!isPlainRecord(value)) throw Error('Expected approved model');
  return productModelSchema.parse({ schema: 'ProductModel/v1', version: 1, ...value });
}

test('terminal builds three full products without guessed paths or business defaults', async () => {
  const expected = model();
  const answers = [
    expected.repository.repository_id,
    expected.repository.prefix,
    JSON.stringify(expected.projects.map((p) => p.project_id)),
  ];
  for (const product of expected.projects) {
    answers.push(
      product.title,
      product.prefix,
      product.project_root,
      JSON.stringify(product.code_selectors),
      product.documents.root,
      product.documents.index,
      product.documents.requirements.root,
      JSON.stringify(product.documents.requirements.areas),
      product.documents.research,
      product.documents.decisions,
      product.work_items.storage_root,
      JSON.stringify(product.work_items.enabled_types),
      product.work_items.hierarchy.mode,
    );
    if (product.work_items.hierarchy.mode === 'custom')
      answers.push(JSON.stringify(product.work_items.hierarchy.allowed_children));
  }
  const labels: string[] = [];
  const port = createTerminalSetupPort(async (label) => {
    labels.push(label);
    return answers.shift();
  });
  try {
    const result = await resolveCliSetup({ projectRoot: path.resolve('.'), reconcile: false }, port);
    expect(result).toEqual({
      status: 'ready',
      input: { projectRoot: path.resolve('.'), model: expected, reconcile: false },
    });
    expect(answers).toEqual([]);
    expect(labels.join('\n')).toContain('Wiki root');
    expect(labels.join('\n')).toContain('Allowed children');
  } finally {
    port.close();
  }
});

test('terminal completes one missing nested path while preserving explicit values and empty selectors', async () => {
  const expected = model();
  expected.projects.forEach((product) => {
    product.code_selectors = [];
    product.documents.research = 'shared/research';
    product.work_items.hierarchy = { mode: 'any' };
  });
  const draft: Record<string, unknown> = structuredClone(expected);
  const projects = draft.projects;
  if (!Array.isArray(projects) || !isPlainRecord(projects[0])) throw Error('Fixture shape');
  const documents = projects[0].documents;
  if (
    !isPlainRecord(documents) ||
    !isPlainRecord(documents.requirements) ||
    !isPlainRecord(documents.requirements.areas)
  )
    throw Error('Fixture area');
  const entry = Object.values(documents.requirements.areas)[0];
  if (!isPlainRecord(entry)) throw Error('Fixture requirement');
  const business = entry.business;
  delete entry.business;
  const labels: string[] = [];
  const port = createTerminalSetupPort(async (label) => {
    labels.push(label);
    return String(business);
  });
  try {
    expect(await resolveCliSetup({ projectRoot: path.resolve('.'), model: draft, reconcile: true }, port)).toEqual({
      status: 'ready',
      input: { projectRoot: path.resolve('.'), model: expected, reconcile: true },
    });
    expect(labels).toHaveLength(1);
    expect(labels[0]).toContain('business');
    expect(entry.business).toBeUndefined();
  } finally {
    port.close();
  }
});

test.each(['EOF', 'throw', 'invalid JSON', 'invalid catalog'])(
  'terminal %s refuses or cancels without effects',
  async (kind) => {
    const port = createTerminalSetupPort(async () => {
      if (kind === 'throw') throw Error('Question transport closed');
      if (kind === 'EOF') return undefined;
      return kind === 'invalid JSON' ? '{' : '["NOT_A_TYPE"]';
    });
    try {
      const draft =
        kind === 'invalid catalog'
          ? {
              ...model(),
              projects: model().projects.map((p) => ({
                ...p,
                work_items: { storage_root: p.work_items.storage_root, hierarchy: p.work_items.hierarchy },
              })),
            }
          : kind === 'invalid JSON'
            ? { ...model(), projects: [] }
            : undefined;
      const result = await resolveCliSetup(
        { ...(draft === undefined ? {} : { model: draft }), projectRoot: path.resolve('.'), reconcile: false },
        port,
      );
      expect(result.status).toBe(kind === 'EOF' ? 'cancelled' : 'refused');
    } finally {
      port.close();
    }
  },
);

test('complete model bypasses terminal questions and explicit invalid values refuse first', async () => {
  const current = model();
  let calls = 0;
  const port = createTerminalSetupPort(async () => {
    calls++;
    return undefined;
  });
  try {
    expect(
      (await resolveCliSetup({ projectRoot: path.resolve('.'), model: current, reconcile: false }, port)).status,
    ).toBe('ready');
    current.repository.prefix = 'bad';
    expect(
      (await resolveCliSetup({ projectRoot: path.resolve('.'), model: current, reconcile: false }, port)).status,
    ).toBe('refused');
    expect(calls).toBe(0);
  } finally {
    port.close();
  }
});
