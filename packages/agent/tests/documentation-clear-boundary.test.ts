import { configuredTestContext } from './configured-context.ts';
import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as runtime from '../src/index.ts';
import type { DocumentationClearCheckpoint, DocumentationClearInput } from '../src/documentation/clear.ts';
import { documentationRelativePath } from '../src/documentation/policy.ts';

const packageRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const { repositoryRoot, config, context } = configuredTestContext();
const clearFixtureSourceText: Readonly<
  Record<'AGENTS.md' | 'AGENT.sidecar.md' | 'agent-runtime.config.v1.yaml', string>
> = Object.freeze({
  'AGENTS.md': readFileSync(path.join(repositoryRoot, 'AGENTS.md'), 'utf8'),
  'AGENT.sidecar.md': readFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), 'utf8'),
  'agent-runtime.config.v1.yaml': readFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'), 'utf8'),
});
type ClearOperationInput = Omit<DocumentationClearInput, 'phase' | 'baseline' | 'baseline_path'>;

interface DocumentationClearFixture {
  readonly root: string;
  readonly input: ClearOperationInput;
  write(relativePath: string, content: string): void;
  cleanup(): void;
}

function requiredProjectId(): string {
  const projectId = context.project_ids[0];
  if (!projectId) throw new Error('Configured test context has no project ID.');
  return projectId;
}
function documentationClearFixture(): DocumentationClearFixture {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-zombies-'));
  const write = (relativePath: string, content: string): void => {
    const file = path.join(root, relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  mkdirSync(path.join(root, '.git'));
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'] as const)
    write(file, clearFixtureSourceText[file]);
  const schemaPath = `${config.runtime.bundle}/schemas/documentation-policy.v1.schema.json`;
  mkdirSync(path.dirname(path.join(root, schemaPath)), { recursive: true });
  cpSync(path.join(packageRoot, 'schemas/documentation-policy.v1.schema.json'), path.join(root, schemaPath));
  write(`${config.runtime.bundle}/TESTING.md`, 'fixture testing\n');
  write('docs/creatio/map.md', 'map\n');
  write('docs/agent-instructions/index.md', 'index\n');
  write('docs/agent-instructions/current.md', 'current\n');
  const input: ClearOperationInput = {
    repository_root: root,
    repository_id: runtime.loadRuntimeConfig(root).repository.repository_id,
    project_id: requiredProjectId(),
    work_id: 'clear-zombies',
    source_revision: 'source-1',
    scope_paths: ['docs/agent-instructions/current.md'],
  };
  const policy = {
    schema: 'DocumentationPolicy/v1',
    policy_id: 'clear-zombies',
    project_id: input.project_id,
    source_path: 'docs/agent-instructions/documentation-policy.v1.json',
    owner: 'project:refactoring',
    required: true,
    canonical_roots: ['docs/agent-instructions'],
    map_paths: ['docs/agent-instructions/index.md'],
    excluded_roots: ['.agent', '.planning'],
    changelog_required: false,
    changelog_path: null,
    relations: ['owns'],
    updated_at: new Date().toISOString(),
  };
  write(policy.source_path, JSON.stringify(policy) + '\n');

  write(
    `.agent/work/${input.work_id}/scope.json`,
    JSON.stringify({
      schema: 'ImplementationScope/v1',
      work_id: input.work_id,
      source_revision: input.source_revision,
      allowed_paths: input.scope_paths,
    }) + '\n',
  );
  return {
    root,
    input,
    write,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isDocumentHash(value: unknown): value is DocumentationClearCheckpoint['documents'][number] {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.size === 'number'
  );
}
function isDocumentationClearCheckpoint(value: unknown): value is DocumentationClearCheckpoint {
  if (!isRecord(value)) return false;
  const stringFields = [
    'clear_id',
    'work_id',
    'source_revision',
    'repository_id',
    'project_id',
    'project_context_digest',
    'config_digest',
    'scope_digest',
    'policy_id',
    'policy_path',
    'policy_digest',
    'inventory_digest',
    'created_at',
    'digest',
  ];
  return (
    value.schema === 'DocumentationClearCheckpoint/v1' &&
    stringFields.every((field) => typeof value[field] === 'string') &&
    isUnknownArray(value.documents) &&
    value.documents.every(isDocumentHash) &&
    (value.baseline_path === null || typeof value.baseline_path === 'string') &&
    (value.baseline_digest === null || typeof value.baseline_digest === 'string') &&
    (value.phase === 'baseline' || value.phase === 'closeout') &&
    (value.status === 'pass' || value.status === 'blocked' || value.status === 'not_required') &&
    typeof value.required === 'boolean' &&
    isUnknownArray(value.gaps) &&
    value.gaps.every((gap) => typeof gap === 'string')
  );
}

function readCheckpoint(filename: string): DocumentationClearCheckpoint {
  const value: unknown = JSON.parse(readFileSync(filename, 'utf8'));
  if (!isDocumentationClearCheckpoint(value)) throw new Error('CLEAR checkpoint fixture has an invalid shape.');
  return value;
}

async function documentationCloseout(fixture: DocumentationClearFixture): Promise<{
  readonly result: Awaited<ReturnType<typeof runtime.executeDocumentationClearOperation>>;
  readonly checkpoint: DocumentationClearCheckpoint;
}> {
  await runtime.executeDocumentationClearOperation(fixture.input, 'baseline');
  const result = await runtime.executeDocumentationClearOperation(fixture.input, 'closeout');
  const checkpoint = readCheckpoint(path.join(fixture.root, result.path));
  return { result, checkpoint };
}
describe('documentation CLEAR public ZOMBIES boundary', () => {
  test('Zero: CLEAR rejects missing baseline and absent accepted work scope', async () => {
    const fixture = documentationClearFixture();
    try {
      await Promise.resolve(
        expect(runtime.executeDocumentationClearOperation(fixture.input, 'closeout')).rejects.toThrow(),
      );
      rmSync(path.join(fixture.root, `.agent/work/${fixture.input.work_id}/scope.json`));
      await Promise.resolve(
        expect(runtime.executeDocumentationClearFromWork(fixture.input, 'baseline')).rejects.toThrow(),
      );
    } finally {
      fixture.cleanup();
    }
  });

  test('One: CLEAR public APIs create and verify one bound closeout', async () => {
    const fixture = documentationClearFixture();
    try {
      const { scope_paths: _scopePaths, ...workInput } = fixture.input;
      const baseline = await runtime.executeDocumentationClearFromWork(workInput, 'baseline');
      expect(baseline.status).toBe('pass');
      const closeout = await runtime.executeDocumentationClearFromWork(workInput, 'closeout');
      const checkpoint = readCheckpoint(path.join(fixture.root, closeout.path));
      expect(runtime.validateDocumentationClearCheckpoint(checkpoint, fixture.input)).toEqual(checkpoint);
      expect(
        runtime.verifyDocumentationClearReference({
          ...fixture.input,
          reference_path: closeout.path,
          reference_sha256: closeout.sha256,
          reference_id: checkpoint.clear_id,
          expected_cycle: 1,
        }),
      ).toEqual(checkpoint);
      expect((await runtime.executeDocumentationClearOperation(fixture.input, 'verify')).checkpoint_digest).toBe(
        checkpoint.digest,
      );
    } finally {
      fixture.cleanup();
    }
  });

  test('Many: CLEAR cycles advance and reject an older generation', async () => {
    const fixture = documentationClearFixture();
    try {
      const first = await documentationCloseout(fixture);
      const second = await documentationCloseout(fixture);
      expect(second.result.path).toContain('documentation-closeout-0002.v1.json');
      expect(() =>
        runtime.verifyDocumentationClearReference({
          ...fixture.input,
          reference_path: first.result.path,
          reference_sha256: first.result.sha256,
          reference_id: first.checkpoint.clear_id,
          expected_cycle: 2,
        }),
      ).toThrow(/generation/);
      expect((await runtime.executeDocumentationClearOperation(fixture.input, 'verify')).path).toBe(second.result.path);
    } finally {
      fixture.cleanup();
    }
  });

  test('Boundary: CLEAR rejects unsafe scope and reference paths', async () => {
    const fixture = documentationClearFixture();
    try {
      expect(() =>
        runtime.produceDocumentationClearCheckpoint({
          ...fixture.input,
          scope_paths: ['../outside.md'],
          phase: 'baseline',
        }),
      ).toThrow(/safe/);
      const { result, checkpoint } = await documentationCloseout(fixture);
      expect(() =>
        runtime.verifyDocumentationClearReference({
          ...fixture.input,
          reference_path: '../outside.json',
          reference_sha256: result.sha256,
          reference_id: checkpoint.clear_id,
          expected_cycle: 1,
        }),
      ).toThrow(/path/);
    } finally {
      fixture.cleanup();
    }
  });

  test('Interface: CLEAR checkpoints retain typed public identity and digest', async () => {
    const fixture = documentationClearFixture();
    try {
      const { result, checkpoint } = await documentationCloseout(fixture);
      expect(checkpoint).toMatchObject({
        schema: 'DocumentationClearCheckpoint/v1',
        work_id: fixture.input.work_id,
        phase: 'closeout',
        status: 'pass',
        required: true,
        baseline_path: `.agent/work/${fixture.input.work_id}/documentation-baseline-0001.v1.json`,
      });
      expect(result.checkpoint_digest).toBe(checkpoint.digest);
      expect(runtime.canonicalJsonDigest((({ digest: _digest, ...body }) => body)(checkpoint))).toBe(checkpoint.digest);
    } finally {
      fixture.cleanup();
    }
  });

  test('Exception: CLEAR detects changed document and checkpoint bytes', async () => {
    const fixture = documentationClearFixture();
    try {
      const { result, checkpoint } = await documentationCloseout(fixture);
      fixture.write('docs/agent-instructions/current.md', 'changed\n');
      expect(() => runtime.validateDocumentationClearCheckpoint(checkpoint, fixture.input)).toThrow(/stale/);
      fixture.write('docs/agent-instructions/current.md', 'current\n');
      fixture.write(result.path, JSON.stringify({ ...checkpoint, status: 'blocked' }) + '\n');
      await Promise.resolve(
        expect(runtime.executeDocumentationClearOperation(fixture.input, 'verify')).rejects.toThrow(/digest/),
      );
      expect(() =>
        runtime.verifyDocumentationClearReference({
          ...fixture.input,
          reference_path: result.path,
          reference_sha256: result.sha256,
          reference_id: checkpoint.clear_id,
          expected_cycle: 1,
        }),
      ).toThrow(/bytes changed/);
    } finally {
      fixture.cleanup();
    }
  });

  test('Simple: CLEAR creates a valid baseline for an ordinary scope', () => {
    const fixture = documentationClearFixture();
    try {
      const checkpoint = runtime.produceDocumentationClearCheckpoint({
        ...fixture.input,
        phase: 'baseline',
      });
      expect(checkpoint.status).toBe('pass');
      expect(checkpoint.baseline_path).toBeNull();
      expect(checkpoint.documents.some((document) => document.path === fixture.input.scope_paths[0])).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });

  test('CLEAR document paths reject absolute, traversal, empty-segment, and platform-specific spellings', () => {
    for (const unsafe of [
      '',
      '/etc/passwd',
      '../outside.md',
      'docs/../outside.md',
      'docs//current.md',
      'docs\\current.md',
      'C:current.md',
    ]) {
      expect(() => documentationRelativePath(unsafe)).toThrow('documentation path is not safe and repository-relative');
    }
    expect(documentationRelativePath('docs/agent-instructions/current.md')).toBe('docs/agent-instructions/current.md');
  });
});
