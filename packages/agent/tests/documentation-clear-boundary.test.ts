import { configuredTestContext } from './configured-context.ts';
import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as runtime from '../src/index.ts';
import type { DocumentationClearCheckpoint, DocumentationClearInput } from '../src/documentation/clear.ts';
import { documentationRelativePath, validateDocumentationPolicy } from '../src/documentation/policy.ts';
import { expectAsyncReturned, expectReturned } from './helpers/expect-rejection.ts';

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
function documentationClearFixture(options: { readonly changelogRequired?: boolean } = {}): DocumentationClearFixture {
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
    changelog_required: options.changelogRequired ?? false,
    changelog_path: options.changelogRequired ? 'docs/agent-instructions/agent-instructions.changelog.jsonl' : null,
    relations: ['owns'],
    updated_at: new Date().toISOString(),
  };
  write(policy.source_path, JSON.stringify(policy) + '\n');
  if (policy.changelog_required && policy.changelog_path) write(policy.changelog_path, '');

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
  test('policy validation rejects invalid schema, path binding and timestamp', () => {
    const policy = {
      schema: 'DocumentationPolicy/v1',
      policy_id: 'policy-validation',
      project_id: 'project-one',
      source_path: 'docs/policy.json',
      owner: 'project:project-one',
      required: true,
      canonical_roots: ['docs/agent-instructions'],
      map_paths: ['docs/agent-instructions/index.md'],
      excluded_roots: ['.agent'],
      changelog_required: false,
      changelog_path: null,
      relations: ['owns'],
      updated_at: '2026-10-19T00:00:00.000Z',
    };
    expect(validateDocumentationPolicy(policy, policy.source_path)).toMatchObject({
      schema: 'DocumentationPolicy/v1',
      source_path: policy.source_path,
    });
    expect(() =>
      validateDocumentationPolicy({ ...policy, schema: 'DocumentationPolicy/v2' }, policy.source_path),
    ).toThrow('documentation policy schema invalid');
    expect(() => validateDocumentationPolicy(policy, 'docs/other-policy.json')).toThrow(
      'documentation policy source path differs from config',
    );
    expect(() => validateDocumentationPolicy({ ...policy, updated_at: 'not-a-timestamp' }, policy.source_path)).toThrow(
      'documentation policy timestamp invalid',
    );
  });

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

  test('closeout accepts a real finalize event for a changed governed document', async () => {
    const fixture = documentationClearFixture({ changelogRequired: true });
    try {
      const baselineResult = await expectAsyncReturned(() =>
        runtime.executeDocumentationClearOperation(fixture.input, 'baseline'),
      );
      const baseline = readCheckpoint(path.join(fixture.root, baselineResult.path));
      const before = 'current\n';
      const after = 'current, revised\n';
      fixture.write('docs/agent-instructions/current.md', after);
      const digest = (content: string): string => createHash('sha256').update(content).digest('hex');
      const event = {
        schema: 'DocumentationChangeEvent/v1',
        event_id: 'finalize-current-1',
        logical_edit_id: 'finalize-current-1',
        work_id: fixture.input.work_id,
        source_revision: fixture.input.source_revision,
        operation: 'finalize',
        document_id: 'docs/agent-instructions/current.md',
        path_before: 'docs/agent-instructions/current.md',
        path_after: 'docs/agent-instructions/current.md',
        before_sha256: digest(before),
        after_sha256: digest(after),
        actor: 'test:documentation-owner',
        pointer: 'test:finalize-current-1',
        timestamp: new Date().toISOString(),
      };
      fixture.write('docs/agent-instructions/agent-instructions.changelog.jsonl', JSON.stringify(event) + '\n');

      const closeout = await expectAsyncReturned(() =>
        runtime.executeDocumentationClearOperation(fixture.input, 'closeout'),
      );
      const checkpoint = readCheckpoint(path.join(fixture.root, closeout.path));
      expect(checkpoint.status).toBe('pass');
      expect(checkpoint.gaps).toEqual([]);
      expect(checkpoint.baseline_digest).toBe(baseline.digest);
      expect(expectReturned(() => runtime.validateDocumentationClearCheckpoint(checkpoint, fixture.input))).toEqual(
        checkpoint,
      );
      expect(checkpoint.documents).toContainEqual({
        path: 'docs/agent-instructions/current.md',
        sha256: digest(after),
        size: Buffer.byteLength(after),
      });

      const produced = expectReturned(() =>
        runtime.produceDocumentationClearCheckpoint({
          ...fixture.input,
          phase: 'closeout',
          baseline,
          baseline_path: baselineResult.path,
          cycle: 1,
        }),
      );
      expect(produced).toMatchObject({
        inventory_digest: checkpoint.inventory_digest,
        documents: checkpoint.documents,
        baseline_path: checkpoint.baseline_path,
        baseline_digest: checkpoint.baseline_digest,
        policy_id: checkpoint.policy_id,
        policy_digest: checkpoint.policy_digest,
        scope_digest: checkpoint.scope_digest,
        status: checkpoint.status,
        gaps: checkpoint.gaps,
      });
      expect(runtime.canonicalJsonDigest((({ digest: _digest, ...body }) => body)(produced))).toBe(produced.digest);
      expect(runtime.validateDocumentationClearCheckpoint(produced, fixture.input)).toEqual(produced);
    } finally {
      fixture.cleanup();
    }
  });

  test('closeout blocks a typed event from another source revision', async () => {
    const fixture = documentationClearFixture({ changelogRequired: true });
    try {
      const baselineResult = await expectAsyncReturned(() =>
        runtime.executeDocumentationClearOperation(fixture.input, 'baseline'),
      );
      const baseline = readCheckpoint(path.join(fixture.root, baselineResult.path));
      const before = 'current\n';
      const after = 'current, revised\n';
      fixture.write('docs/agent-instructions/current.md', after);
      const digest = (content: string): string => createHash('sha256').update(content).digest('hex');
      fixture.write(
        'docs/agent-instructions/agent-instructions.changelog.jsonl',
        `${JSON.stringify({
          schema: 'DocumentationChangeEvent/v1',
          event_id: 'foreign-revision-finalize',
          logical_edit_id: 'foreign-revision-finalize',
          work_id: fixture.input.work_id,
          source_revision: 'another-revision',
          operation: 'finalize',
          document_id: 'docs/agent-instructions/current.md',
          path_before: 'docs/agent-instructions/current.md',
          path_after: 'docs/agent-instructions/current.md',
          before_sha256: digest(before),
          after_sha256: digest(after),
          actor: 'test:documentation-owner',
          pointer: 'test:foreign-revision-finalize',
          timestamp: new Date().toISOString(),
        })}\n`,
      );

      const blocked = expectReturned(() =>
        runtime.produceDocumentationClearCheckpoint({
          ...fixture.input,
          phase: 'closeout',
          baseline,
          baseline_path: baselineResult.path,
          cycle: 1,
        }),
      );
      expect(blocked.status).toBe('blocked');
      expect(blocked.gaps).toContain('GAP-DOCUMENTATION-CHANGELOG-001');
      expect(() => runtime.validateDocumentationClearCheckpoint(blocked, fixture.input)).toThrow(/not ready/);
    } finally {
      fixture.cleanup();
    }
  });

  test('CLEAR denies a missing canonical map target without changing persisted state, then accepts its repair', async () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const baselineResult = await runtime.executeDocumentationClearOperation(fixture.input, 'baseline');
      const baselinePath = path.join(fixture.root, baselineResult.path);
      const baselineBytes = readFileSync(baselinePath);
      const closeoutPath = path.join(
        fixture.root,
        `.agent/work/${fixture.input.work_id}/documentation-closeout-0001.v1.json`,
      );
      fixture.write('docs/agent-instructions/index.md', '[Missing target](missing.md)\n');

      const denied = runtime.produceDocumentationClearCheckpoint({
        ...fixture.input,
        phase: 'closeout',
        baseline: readCheckpoint(baselinePath),
        baseline_path: baselineResult.path,
        cycle: 1,
      });
      expect(denied.status).toBe('blocked');
      expect(denied.gaps).toEqual(['GAP-DOCUMENTATION-MAP-001']);
      await Promise.resolve(
        expect(runtime.executeDocumentationClearOperation(fixture.input, 'closeout')).rejects.toThrow(
          'documentation CLEAR blocked: GAP-DOCUMENTATION-MAP-001',
        ),
      );
      expect(readFileSync(baselinePath)).toEqual(baselineBytes);
      expect(existsSync(closeoutPath)).toBe(false);

      fixture.write('docs/agent-instructions/missing.md', 'repaired target\n');
      const repaired = await runtime.executeDocumentationClearOperation(fixture.input, 'closeout');
      const closeout = readCheckpoint(path.join(fixture.root, repaired.path));
      expect(repaired.status).toBe('pass');
      expect(closeout.status).toBe('pass');
      expect(closeout.gaps).toEqual([]);
      expect(closeout.documents.some((document) => document.path === 'docs/agent-instructions/missing.md')).toBe(true);
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
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
