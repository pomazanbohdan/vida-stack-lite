import { createInterface } from 'node:readline';
import { z } from 'zod';
import { isPlainRecord } from '../src/contracts/public-ingress.ts';
import { WORK_ITEM_TYPES } from '../src/work-items/catalog.ts';
import type { SetupPromptPort, SetupPromptRequest, SetupPromptResponse } from './init-prompt.ts';

type Question = (label: string) => Promise<string | undefined>;
type Field = readonly [path: string, label: string, json?: boolean];
class Cancelled extends Error {}

const productFields: readonly Field[] = [
  ['project_id', 'Product ID'],
  ['title', 'Product title'],
  ['prefix', 'Product prefix'],
  ['project_root', 'Product root (repository-relative)'],
  ['code_selectors', 'Code selectors (JSON array; [] permits no Source)', true],
  ['documents.root', 'Wiki root'],
  ['documents.index', 'Wiki index'],
  ['documents.requirements.root', 'Requirements root'],
  [
    'documents.requirements.areas',
    'Requirements areas (JSON object; each area has business/system/acceptance/test_cases paths)',
    true,
  ],
  ['documents.research', 'Research path'],
  ['documents.decisions', 'Decisions path'],
  ['work_items.storage_root', 'Work store path'],
  [
    'work_items.enabled_types',
    `Enabled types (JSON array from ${WORK_ITEM_TYPES.map((type) => type.code).join(', ')})`,
    true,
  ],
  ['work_items.hierarchy.mode', 'Hierarchy mode (any or custom)'],
];

function valueAt(record: Record<string, unknown>, parts: readonly string[]): unknown {
  let value: unknown = record;
  for (const part of parts) {
    if (!isPlainRecord(value)) return undefined;
    value = value[part];
  }
  return value;
}

function setValue(record: Record<string, unknown>, parts: readonly string[], value: unknown): void {
  const last = parts.at(-1);
  if (last === undefined) throw Error('Missing prompt field');
  let current = record;
  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    const child = isPlainRecord(existing) ? existing : {};
    current[part] = child;
    current = child;
  }
  current[last] = value;
}

async function answer(question: Question, label: string, json = false): Promise<unknown> {
  const text = await question(`${label}: `);
  if (text === undefined) throw new Cancelled();
  return json ? (JSON.parse(text) as unknown) : text;
}

async function fillFields(
  record: Record<string, unknown>,
  fields: readonly Field[],
  question: Question,
): Promise<void> {
  for (const [field, label, json] of fields) {
    const parts = field.split('.');
    if (valueAt(record, parts) !== undefined) continue;
    setValue(record, parts, await answer(question, label, json));
  }
}

async function completeModel(current: unknown, question: Question): Promise<unknown> {
  const model = isPlainRecord(current) ? structuredClone(current) : {};
  model.schema ??= 'ProductModel/v1';
  model.version ??= 1;
  await fillFields(
    model,
    [
      ['repository.repository_id', 'Repository ID'],
      ['repository.prefix', 'Repository prefix'],
    ],
    question,
  );
  if (!Array.isArray(model.projects) || model.projects.length === 0) {
    const ids = z
      .array(z.string())
      .min(1)
      .parse(await answer(question, 'Selected product IDs (JSON array)', true));
    model.projects = ids.map((project_id) => ({ project_id }));
  }
  const projects = z.array(z.record(z.string(), z.unknown())).parse(model.projects);
  for (const project of projects) {
    await fillFields(project, productFields, question);
    await completeRequirementAreas(project, question);
    if (valueAt(project, ['work_items', 'hierarchy', 'mode']) === 'custom') {
      await fillFields(
        project,
        [['work_items.hierarchy.allowed_children', 'Allowed children by type (JSON object of arrays)', true]],
        question,
      );
    }
  }
  model.projects = projects;
  return model;
}

async function completeRequirementAreas(project: Record<string, unknown>, question: Question): Promise<void> {
  const areas = valueAt(project, ['documents', 'requirements', 'areas']);
  if (!isPlainRecord(areas)) return;
  for (const [id, area] of Object.entries(areas)) {
    if (!isPlainRecord(area)) continue;
    await fillFields(
      area,
      ['business', 'system', 'acceptance', 'test_cases'].map(
        (field) => [field, `Requirements ${id} ${field}`] as const,
      ),
      question,
    );
  }
}

function terminalQuestion() {
  let terminal: ReturnType<typeof createInterface> | undefined;
  const question: Question = (label) => {
    terminal ??= createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    const current = terminal;
    return new Promise((resolve) => {
      const cleanup = () => {
        current.removeListener('close', cancel);
        current.removeListener('SIGINT', interrupt);
      };
      const cancel = () => {
        cleanup();
        resolve(undefined);
      };
      const interrupt = () => {
        cancel();
        current.close();
      };
      current.once('close', cancel);
      current.once('SIGINT', interrupt);
      current.question(label, (value) => {
        cleanup();
        resolve(value);
      });
    });
  };
  return { question, close: () => terminal?.close() };
}

export function createTerminalSetupPort(question?: Question): SetupPromptPort & { close(): void } {
  const owned = question ? { question, close: () => {} } : terminalQuestion();
  return {
    interactive: true,
    close: owned.close,
    async prompt(request: SetupPromptRequest): Promise<SetupPromptResponse> {
      try {
        const value =
          request.field === 'model'
            ? await completeModel(request.currentValue, owned.question)
            : await answer(
                owned.question,
                request.field === 'projectRoot'
                  ? 'Absolute project root'
                  : 'Reconcile existing integration (true or false)',
                request.field === 'reconcile',
              );
        return { kind: 'value', value };
      } catch (error) {
        if (error instanceof Cancelled) return { kind: 'cancelled' };
        throw error;
      }
    },
  };
}
