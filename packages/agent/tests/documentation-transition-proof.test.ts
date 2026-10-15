import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { observeAjvCompiles } from './helpers/ajv-compile-observer.ts';
import { configuredTestContext } from './configured-context.ts';
import policyTemplate from '../templates/documentation-policy.template.v1.json' with { type: 'json' };
import * as runtime from '../src/index.ts';
import type { DocumentationClearInput } from '../src/documentation/clear.ts';
import { parseForwardClearCheckpoint, parseForwardPolicyIdentity } from '../src/documentation/transition-proof.ts';
import { expectReturned } from './helpers/expect-rejection.ts';

const schemaIds = {
  scope: 'https://vida-agent.invalid/schemas/implementation-scope.v1.schema.json',
  policy: 'https://vida-agent.invalid/schemas/documentation-policy.v1.schema.json',
  transition: 'https://agent-runtime.invalid/schemas/documentation-policy-transition.v1.schema.json',
  event: 'https://vida-agent.invalid/schemas/documentation-change-event.v1.schema.json',
  checkpoint: 'https://vida-agent.invalid/schemas/documentation-clear-checkpoint.v1.schema.json',
} as const;
const policy = { ...policyTemplate, updated_at: '2026-09-29T00:00:00.000Z' };
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { repositoryRoot, config, context } = configuredTestContext();

function forwardCheckpointFixture(): {
  root: string;
  input: Omit<DocumentationClearInput, 'phase' | 'baseline' | 'baseline_path'>;
  cleanup(): void;
} {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-forward-checkpoint-'));
  const write = (relativePath: string, content: string): void => {
    const file = path.join(root, relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  mkdirSync(path.join(root, '.git'));
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
    write(file, readFileSync(path.join(repositoryRoot, file), 'utf8'));
  const schemaPath = `${config.runtime.bundle}/schemas/documentation-policy.v1.schema.json`;
  mkdirSync(path.dirname(path.join(root, schemaPath)), { recursive: true });
  cpSync(path.join(packageRoot, 'schemas/documentation-policy.v1.schema.json'), path.join(root, schemaPath));
  write(`${config.runtime.bundle}/TESTING.md`, 'fixture testing\n');
  write('docs/creatio/map.md', 'map\n');
  write('docs/agent-instructions/index.md', 'index\n');
  write('docs/agent-instructions/current.md', 'current\n');
  const projectId = context.project_ids[0];
  if (!projectId) throw new Error('Configured test context has no project ID.');
  const input = {
    repository_root: root,
    repository_id: runtime.loadRuntimeConfig(root).repository.repository_id,
    project_id: projectId,
    work_id: 'forward-checkpoint-test',
    source_revision: 'source-1',
    scope_paths: ['docs/agent-instructions/current.md'],
  };
  write(
    `.agent/work/${input.work_id}/scope.json`,
    JSON.stringify({
      schema: 'ImplementationScope/v1',
      work_id: input.work_id,
      source_revision: input.source_revision,
      allowed_paths: input.scope_paths,
    }) + '\n',
  );
  write(
    'docs/agent-instructions/documentation-policy.v1.json',
    JSON.stringify({
      schema: 'DocumentationPolicy/v1',
      policy_id: 'forward-checkpoint-test',
      project_id: input.project_id,
      source_path: 'docs/agent-instructions/documentation-policy.v1.json',
      owner: `project:${input.project_id}`,
      required: true,
      canonical_roots: ['docs/agent-instructions'],
      map_paths: ['docs/agent-instructions/index.md'],
      excluded_roots: ['.agent', '.planning'],
      changelog_required: false,
      changelog_path: null,
      relations: ['owns'],
      updated_at: '2026-09-29T00:00:00.000Z',
    }) + '\n',
  );
  return {
    root,
    input,
    cleanup: () => {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch (error) {
        console.error(`Forward checkpoint fixture cleanup failed: ${root}`);
        throw error;
      }
    },
  };
}

function schemaId(schema: unknown): string | undefined {
  const id = typeof schema === 'object' && schema !== null && '$id' in schema ? schema.$id : undefined;
  return typeof id === 'string' && Object.values(schemaIds).some((expected) => expected === id) ? id : undefined;
}

async function expectAsyncReturned<T>(operation: () => Promise<T>): Promise<T> {
  let result: { value: T } | undefined;
  await assert.doesNotReject(async () => {
    result = { value: await operation() };
  });
  if (!result) throw new Error('Expected documentation proof operation to fulfill.');
  return result.value;
}

test('forward CLEAR checkpoint parser accepts producer bytes and rejects digest and status tampering', () => {
  const fixture = forwardCheckpointFixture();
  let passed = false;
  try {
    const checkpoint = expectReturned(() =>
      runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' }),
    );
    expect(checkpoint.status).toBe('pass');

    const producerBytes = Buffer.from(JSON.stringify(checkpoint));
    expect(expectReturned(() => parseForwardClearCheckpoint(producerBytes))).toEqual(checkpoint);

    const digestTampered = { ...checkpoint, policy_id: 'changed-with-stale-digest' };
    expect(() => parseForwardClearCheckpoint(Buffer.from(JSON.stringify(digestTampered)))).toThrow(
      'forward documentation proof: CLEAR checkpoint integrity/status differs',
    );

    const { digest: _oldDigest, ...blockedBody } = checkpoint;
    const statusBlocked = { ...blockedBody, status: 'blocked' as const };
    const correctlyDigestedBlocked = {
      ...statusBlocked,
      digest: runtime.canonicalJsonDigest(statusBlocked),
    };
    expect(() => parseForwardClearCheckpoint(Buffer.from(JSON.stringify(correctlyDigestedBlocked)))).toThrow(
      'forward documentation proof: CLEAR checkpoint integrity/status differs',
    );
    passed = true;
  } finally {
    if (passed) fixture.cleanup();
    else console.error(`Retained failed forward checkpoint fixture: ${fixture.root}`);
  }
});

test('documentation consumers do not compile duplicate CLEAR checkpoint validators during import', async () => {
  const compilation = observeAjvCompiles((schema) => schemaId(schema) === schemaIds.checkpoint);
  try {
    await expectAsyncReturned(() => import(`../src/documentation/clear.ts?cold=${randomUUID()}`));
    await expectAsyncReturned(() => import(`../src/documentation/policy-transition.ts?cold=${randomUUID()}`));
    await expectAsyncReturned(() => import(`../src/documentation/transition-proof.ts?cold=${randomUUID()}`));
    expect(compilation.schemas).toHaveLength(0);
  } finally {
    compilation.restore();
  }
});

test('forward proof import captures scope schema without compiling its Ajv validator', async () => {
  const compilation = observeAjvCompiles((schema) => schemaId(schema) === schemaIds.scope);
  try {
    await expectAsyncReturned(() => import(`../src/documentation/transition-proof.ts?cold-scope=${randomUUID()}`));
    expect(compilation.schemas).toHaveLength(0);
  } finally {
    compilation.restore();
  }
});

test('forward proof parsers compile private Ajv validators on first use', async () => {
  const compilation = observeAjvCompiles((schema) => schemaId(schema) !== undefined);
  const observedSchemaIds = () => compilation.schemas.map(schemaId);
  const fixture = forwardCheckpointFixture();
  let passed = false;

  try {
    const checkpoint = expectReturned(() =>
      runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' }),
    );
    expect(checkpoint.status).toBe('pass');
    const producerBytes = Buffer.from(JSON.stringify(checkpoint));
    // An earlier ordinary case may already have warmed the one shared owner.
    const checkpointCompiles = observedSchemaIds().length;
    expect(checkpointCompiles).toBeLessThanOrEqual(1);
    const producerCompilations = Array.from({ length: checkpointCompiles }, () => schemaIds.checkpoint);
    expect(observedSchemaIds()).toEqual(producerCompilations);

    // Bun's qualified fresh-query loader gives this module instance a new identity.
    // Keep the ordinary static import above for the real valid-policy contract.
    const fresh = (await expectAsyncReturned(
      () => import(`../src/documentation/transition-proof.ts?lazy=${randomUUID()}`),
    )) as typeof import('../src/documentation/transition-proof.ts');
    // Import captures the scope schema but defers Ajv compilation until the
    // selected-forward proof validates accepted scope bytes.
    expect(observedSchemaIds()).toEqual(producerCompilations);

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
    ] as const;

    for (const { id, parse, message } of parsers) {
      expect(() => parse(Buffer.from('{}'))).toThrow(message);
      expect(observedSchemaIds().filter((observed) => observed === id)).toHaveLength(1);
      expect(() => parse(Buffer.from('{}'))).toThrow(message);
      expect(observedSchemaIds().filter((observed) => observed === id)).toHaveLength(1);
    }

    // The normal transition-proof import shares the checkpoint owner warmed by
    // the real producer. Values are still checked on each parser call.
    expect(expectReturned(() => fresh.parseForwardClearCheckpoint(producerBytes))).toEqual(checkpoint);
    expect(() => fresh.parseForwardClearCheckpoint(Buffer.from('{}'))).toThrow(
      'forward documentation proof: CLEAR checkpoint schema invalid',
    );
    expect(observedSchemaIds().filter((id) => id === schemaIds.checkpoint)).toHaveLength(checkpointCompiles);

    // A fresh-query owner has a private module cache. It compiles on its first
    // valid use, then validates each later value with that compiled function.
    const privateOwner = (await expectAsyncReturned(
      () => import(`../src/documentation/clear-checkpoint-validator.ts?private=${randomUUID()}`),
    )) as {
      validateDocumentationClearCheckpointSchema(value: unknown): value is Record<string, unknown>;
    };
    expect(privateOwner.validateDocumentationClearCheckpointSchema(checkpoint)).toBe(true);
    expect(privateOwner.validateDocumentationClearCheckpointSchema(checkpoint)).toBe(true);
    expect(observedSchemaIds().filter((id) => id === schemaIds.checkpoint)).toHaveLength(checkpointCompiles + 1);
    const missingRequired: Partial<typeof checkpoint> = { ...checkpoint };
    expect(privateOwner.validateDocumentationClearCheckpointSchema(missingRequired)).toBe(true);
    delete missingRequired.work_id;
    expect(privateOwner.validateDocumentationClearCheckpointSchema(missingRequired)).toBe(false);
    missingRequired.work_id = checkpoint.work_id;
    expect(privateOwner.validateDocumentationClearCheckpointSchema(missingRequired)).toBe(true);
    expect(privateOwner.validateDocumentationClearCheckpointSchema({ ...checkpoint, status: 'unknown' })).toBe(false);
    expect(privateOwner.validateDocumentationClearCheckpointSchema(checkpoint)).toBe(true);
    expect(observedSchemaIds().filter((id) => id === schemaIds.checkpoint)).toHaveLength(checkpointCompiles + 1);

    const validPolicy = expectReturned(() =>
      parseForwardPolicyIdentity(Buffer.from(JSON.stringify(policy)), policy.source_path),
    );
    expect(validPolicy).toEqual(policy);
    expect(() => parseForwardPolicyIdentity(Buffer.from(JSON.stringify(policy)), 'docs/other-policy.json')).toThrow(
      'canonical policy identity differs',
    );
    passed = true;
  } finally {
    compilation.restore();
    if (passed) fixture.cleanup();
    else console.error(`Retained failed forward checkpoint fixture: ${fixture.root}`);
  }
});
