import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { observeAjvCompiles } from './helpers/ajv-compile-observer.ts';
import policyTemplate from '../templates/documentation-policy.template.v1.json' with { type: 'json' };
import { parseForwardPolicyIdentity } from '../src/documentation/transition-proof.ts';

const schemaIds = {
  scope: 'https://vida-agent.invalid/schemas/implementation-scope.v1.schema.json',
  policy: 'https://vida-agent.invalid/schemas/documentation-policy.v1.schema.json',
  transition: 'https://agent-runtime.invalid/schemas/documentation-policy-transition.v1.schema.json',
  event: 'https://vida-agent.invalid/schemas/documentation-change-event.v1.schema.json',
  checkpoint: 'https://vida-agent.invalid/schemas/documentation-clear-checkpoint.v1.schema.json',
} as const;
const policy = { ...policyTemplate, updated_at: '2026-09-29T00:00:00.000Z' };

function schemaId(schema: unknown): string | undefined {
  const id = typeof schema === 'object' && schema !== null && '$id' in schema ? schema.$id : undefined;
  return typeof id === 'string' && Object.values(schemaIds).some((expected) => expected === id) ? id : undefined;
}

test('forward proof parsers compile private Ajv validators on first use', async () => {
  const compilation = observeAjvCompiles((schema) => schemaId(schema) !== undefined);
  const observedSchemaIds = () => compilation.schemas.map(schemaId);

  try {
    // Bun's qualified fresh-query loader gives this module instance a new identity.
    // Keep the ordinary static import above for the real valid-policy contract.
    const fresh = (await import(
      `../src/documentation/transition-proof.ts?lazy=${randomUUID()}`
    )) as typeof import('../src/documentation/transition-proof.ts');
    expect(observedSchemaIds()).toEqual([schemaIds.scope]);

    const parsers = [
      {
        id: schemaIds.policy,
        parse: (bytes: Uint8Array) => fresh.parseForwardPolicyIdentity(bytes, policy.source_path),
        message: 'forward documentation proof: canonical policy identity differs',
      },
      {
        id: schemaIds.transition,
        parse: fresh.parseDocumentationPolicyTransitionEnvelope,
        message: 'forward documentation proof: operation schema invalid',
      },
      {
        id: schemaIds.event,
        parse: fresh.parseForwardDocumentationEvent,
        message: 'forward documentation proof: documentation event schema invalid',
      },
      {
        id: schemaIds.checkpoint,
        parse: fresh.parseForwardClearCheckpoint,
        message: 'forward documentation proof: CLEAR checkpoint schema invalid',
      },
    ] as const;

    for (const { id, parse, message } of parsers) {
      expect(() => parse(Buffer.from('{}'))).toThrow(message);
      expect(observedSchemaIds().filter((observed) => observed === id)).toHaveLength(1);
      expect(() => parse(Buffer.from('{}'))).toThrow(message);
      expect(observedSchemaIds().filter((observed) => observed === id)).toHaveLength(1);
    }

    const validPolicy = parseForwardPolicyIdentity(Buffer.from(JSON.stringify(policy)), policy.source_path);
    expect(validPolicy).toEqual(policy);
    expect(() => parseForwardPolicyIdentity(Buffer.from(JSON.stringify(policy)), 'docs/other-policy.json')).toThrow(
      'canonical policy identity differs',
    );
  } finally {
    compilation.restore();
  }
});
