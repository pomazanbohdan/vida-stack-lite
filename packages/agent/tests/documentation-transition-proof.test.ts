import { expect, test } from 'bun:test';
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

test('forward CLEAR checkpoint parser accepts producer bytes and rejects digest and status tampering', () => {
  const fixture = forwardCheckpointFixture();
  let passed = false;
  try {
    const checkpoint = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' });
    expect(checkpoint.status).toBe('pass');

    const producerBytes = Buffer.from(JSON.stringify(checkpoint));
    expect(parseForwardClearCheckpoint(producerBytes)).toEqual(checkpoint);

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
