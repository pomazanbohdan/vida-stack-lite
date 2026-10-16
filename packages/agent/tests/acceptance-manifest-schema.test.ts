import { randomUUID } from 'node:crypto';
import { expect, test } from 'bun:test';
import { observeAjvCompiles } from './helpers/ajv-compile-observer.ts';

const acceptance = () => ({
  schema: 'AcceptanceManifest/v1',
  id: 'acceptance-schema-test',
  version: 1,
  ac_ids: ['AC-1'],
  source: 'test fixture',
  scope: 'scope-1',
  source_revision: 'revision-1',
  contracts: [
    {
      id: 'AC-1',
      definition: 'The accepted behavior is observable.',
      sr: 'The system reports the behavior.',
      evidence: ['focused test'],
    },
  ],
});

test('acceptance schema compilation is lazy, shared, and validates each value', async () => {
  const compilation = observeAjvCompiles((schema) => {
    if (typeof schema !== 'object' || schema === null || !('$id' in schema)) return false;
    return schema.$id === 'https://vida-agent.invalid/schemas/acceptance-manifest.v1.schema.json';
  });

  try {
    const query = randomUUID();
    await import('../src/orchestration/local-work-admission.ts');
    await import(`../src/orchestration/admitted-development-packet.ts?acceptance=${query}`);
    await import(`../src/orchestration/local-work-admission.ts?acceptance=${query}`);
    await import(`../src/orchestration/observed-synthesis-result.ts?acceptance=${query}`);
    await import(`../src/orchestration/observed-research-result.ts?acceptance=${query}`);
    expect(compilation.schemas).toHaveLength(0);

    const validatorModule = (await import(
      `../src/contracts/acceptance-manifest-schema.ts?acceptance=${query}`
    )) as typeof import('../src/contracts/acceptance-manifest-schema.js');
    expect(compilation.schemas).toHaveLength(0);

    const valid = acceptance();
    expect(validatorModule.validateAcceptanceManifestSchema(valid)).toBe(true);
    expect(compilation.schemas).toHaveLength(1);
    expect(validatorModule.validateAcceptanceManifestSchema(valid)).toBe(true);
    expect(compilation.schemas).toHaveLength(1);

    const mutated = valid;
    delete (mutated as Partial<typeof mutated>).scope;
    expect(validatorModule.validateAcceptanceManifestSchema(mutated)).toBe(false);
    expect(compilation.schemas).toHaveLength(1);
    mutated.scope = 'scope-1';
    expect(validatorModule.validateAcceptanceManifestSchema(mutated)).toBe(true);
    expect(compilation.schemas).toHaveLength(1);
  } finally {
    compilation.restore();
  }
});

test('acceptance schema predicate captures its schema before callers can mutate the imported JSON', async () => {
  const schemaModule = await import('../schemas/acceptance-manifest.v1.schema.json', {
    with: { type: 'json' },
  });
  const schema = schemaModule.default as { required: string[] };
  const originalRequired = schema.required;
  const compilation = observeAjvCompiles((candidate) => {
    if (typeof candidate !== 'object' || candidate === null || !('$id' in candidate)) return false;
    return candidate.$id === 'https://vida-agent.invalid/schemas/acceptance-manifest.v1.schema.json';
  });

  try {
    const validatorModule = (await import(
      `../src/contracts/acceptance-manifest-schema.ts?capture=${randomUUID()}`
    )) as typeof import('../src/contracts/acceptance-manifest-schema.js');
    schema.required = [];

    const missingScope = acceptance();
    delete (missingScope as Partial<typeof missingScope>).scope;
    expect(validatorModule.validateAcceptanceManifestSchema(missingScope)).toBe(false);
    expect(compilation.schemas).toHaveLength(1);
  } finally {
    schema.required = originalRequired;
    compilation.restore();
  }
});
