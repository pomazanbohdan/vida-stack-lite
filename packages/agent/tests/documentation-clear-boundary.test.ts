import { configuredTestContext } from './configured-context.ts';
import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
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
function documentationClearFixture(
  options: { readonly changelogRequired?: boolean; readonly shortRoot?: boolean } = {},
): DocumentationClearFixture {
  const root = mkdtempSync(path.join(tmpdir(), options.shortRoot ? 'dc-' : 'vida-clear-zombies-'));
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

  test('CLEAR rejects non-record scope and foreign policy before creating a baseline', async () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const { scope_paths: _scopePaths, ...workInput } = fixture.input;
      const scopePath = `.agent/work/${fixture.input.work_id}/scope.json`;
      const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
      const documentPath = 'docs/agent-instructions/current.md';
      const baselinePath = path.join(
        fixture.root,
        `.agent/work/${fixture.input.work_id}/documentation-baseline-0001.v1.json`,
      );
      const scopeBytes = readFileSync(path.join(fixture.root, scopePath));
      const policyBytes = readFileSync(path.join(fixture.root, policyPath));
      const documentBytes = readFileSync(path.join(fixture.root, documentPath));

      for (const value of [null, 42, []]) {
        const invalid = JSON.stringify(value) + '\n';
        fixture.write(scopePath, invalid);
        await Promise.resolve(
          expect(runtime.executeDocumentationClearFromWork(workInput, 'baseline')).rejects.toThrow(
            'documentation record invalid',
          ),
        );
        expect(readFileSync(path.join(fixture.root, scopePath), 'utf8')).toBe(invalid);
        expect(readFileSync(path.join(fixture.root, policyPath))).toEqual(policyBytes);
        expect(readFileSync(path.join(fixture.root, documentPath))).toEqual(documentBytes);
        expect(existsSync(baselinePath)).toBe(false);
      }

      writeFileSync(path.join(fixture.root, scopePath), scopeBytes);
      const policy: unknown = JSON.parse(policyBytes.toString('utf8'));
      if (!isRecord(policy)) throw new Error('Fixture policy is not a record.');
      const foreignPolicy = JSON.stringify({ ...policy, project_id: 'foreign-project' }) + '\n';
      fixture.write(policyPath, foreignPolicy);
      await Promise.resolve(
        expect(runtime.executeDocumentationClearFromWork(workInput, 'baseline')).rejects.toThrow(
          'documentation policy project identity differs from current project',
        ),
      );
      expect(readFileSync(path.join(fixture.root, scopePath))).toEqual(scopeBytes);
      expect(readFileSync(path.join(fixture.root, policyPath), 'utf8')).toBe(foreignPolicy);
      expect(readFileSync(path.join(fixture.root, documentPath))).toEqual(documentBytes);
      expect(existsSync(baselinePath)).toBe(false);

      writeFileSync(path.join(fixture.root, policyPath), policyBytes);
      expect((await runtime.executeDocumentationClearFromWork(workInput, 'baseline')).status).toBe('pass');
      expect(existsSync(baselinePath)).toBe(true);
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed CLEAR scope fixture: ${fixture.root}`);
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

  test('CLEAR rejects mismatched reference and baseline bindings before accepting restored bytes', async () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const { result, checkpoint } = await documentationCloseout(fixture);
      const reference = {
        ...fixture.input,
        reference_path: result.path,
        reference_sha256: result.sha256,
        reference_id: checkpoint.clear_id,
        expected_cycle: 1,
      };
      const closeoutPath = path.join(fixture.root, result.path);
      const closeoutBytes = readFileSync(closeoutPath);
      expect(() => runtime.verifyDocumentationClearReference({ ...reference, reference_id: 'foreign' })).toThrow(
        /reference identity invalid/,
      );

      for (const change of [
        { baseline_path: `.agent/work/${fixture.input.work_id}/documentation-baseline-0002.v1.json` },
        { clear_id: `documentation-clear-${fixture.input.work_id}-closeout-0002` },
      ]) {
        const altered = { ...checkpoint, ...change };
        const bytes = JSON.stringify(altered) + '\n';
        writeFileSync(closeoutPath, bytes);
        expect(() =>
          runtime.verifyDocumentationClearReference({
            ...reference,
            reference_sha256: new Bun.CryptoHasher('sha256').update(bytes).digest('hex'),
            reference_id: altered.clear_id,
          }),
        ).toThrow(/reference cycle invalid/);
      }
      writeFileSync(closeoutPath, closeoutBytes);
      expect(runtime.verifyDocumentationClearReference(reference)).toEqual(checkpoint);

      const resign = (value: DocumentationClearCheckpoint): DocumentationClearCheckpoint => {
        const { digest: _digest, ...body } = value;
        return { ...body, digest: runtime.canonicalJsonDigest(body) };
      };
      expect(() =>
        runtime.validateDocumentationClearCheckpoint(resign({ ...checkpoint, baseline_path: null }), fixture.input),
      ).toThrow(/baseline missing/);
      expect(() =>
        runtime.validateDocumentationClearCheckpoint(
          resign({ ...checkpoint, baseline_path: '.agent/work/invalid.json' }),
          fixture.input,
        ),
      ).toThrow(/baseline cycle invalid/);

      const baselinePath = path.join(fixture.root, checkpoint.baseline_path!);
      const baselineBytes = readFileSync(baselinePath);
      const baseline = readCheckpoint(baselinePath);
      const futureBaseline = resign({ ...baseline, created_at: '9999-01-01T00:00:00.000Z' });
      writeFileSync(baselinePath, JSON.stringify(futureBaseline) + '\n');
      expect(() =>
        runtime.validateDocumentationClearCheckpoint(
          resign({ ...checkpoint, baseline_digest: futureBaseline.digest }),
          fixture.input,
        ),
      ).toThrow(/baseline binding stale/);
      writeFileSync(baselinePath, baselineBytes);
      expect(runtime.validateDocumentationClearCheckpoint(checkpoint, fixture.input)).toEqual(checkpoint);
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed CLEAR reference fixture: ${fixture.root}`);
    }
  });

  test('direct closeout reports a missing baseline while retaining supplied path validation', () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const before = readFileSync(path.join(fixture.root, 'docs/agent-instructions/current.md'));
      const closeout = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'closeout' });
      expect(closeout).toMatchObject({
        status: 'blocked',
        baseline_path: null,
        baseline_digest: null,
        gaps: ['GAP-DOCUMENTATION-BASELINE-001'],
      });
      for (const baseline_path of ['', '../outside.json'])
        expect(() =>
          runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'closeout', baseline_path }),
        ).toThrow();
      expect(readFileSync(path.join(fixture.root, 'docs/agent-instructions/current.md'))).toEqual(before);
      const baseline = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' });
      expect(
        runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'closeout', baseline }),
      ).toMatchObject({
        status: 'blocked',
        baseline_path: null,
        baseline_digest: baseline.digest,
        gaps: ['GAP-DOCUMENTATION-BASELINE-001'],
      });
      expect(
        runtime.produceDocumentationClearCheckpoint({
          ...fixture.input,
          phase: 'closeout',
          baseline,
          baseline_path: '.agent/work/clear-zombies/documentation-baseline-0001.v1.json',
        }).status,
      ).toBe('pass');
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed direct closeout fixture: ${fixture.root}`);
    }
  });

  test('producer validates checkpoint schema and timestamp before accepting a restored baseline', () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const baseline = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' });
      const input = {
        ...fixture.input,
        phase: 'closeout' as const,
        baseline_path: '.agent/work/clear-zombies/documentation-baseline-0001.v1.json',
      };
      const resign = (value: DocumentationClearCheckpoint): DocumentationClearCheckpoint => {
        const { digest: _digest, ...body } = value;
        return { ...body, digest: runtime.canonicalJsonDigest(body) };
      };
      const before = readFileSync(path.join(fixture.root, 'docs/agent-instructions/current.md'));
      expect(() =>
        runtime.produceDocumentationClearCheckpoint({
          ...input,
          baseline: resign({ ...baseline, schema: 'invalid' as DocumentationClearCheckpoint['schema'] }),
        }),
      ).toThrow('documentation CLEAR checkpoint schema invalid');
      expect(() =>
        runtime.produceDocumentationClearCheckpoint({
          ...input,
          baseline: resign({ ...baseline, created_at: '2026-99-99T00:00:00.000Z' }),
        }),
      ).toThrow('documentation CLEAR checkpoint timestamp invalid');
      expect(readFileSync(path.join(fixture.root, 'docs/agent-instructions/current.md'))).toEqual(before);
      expect(runtime.produceDocumentationClearCheckpoint({ ...input, baseline }).status).toBe('pass');
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed checkpoint validation fixture: ${fixture.root}`);
    }
  });

  test('scope and identity failures leave work and governed documents intact', async () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const { scope_paths: _scopePaths, ...workInput } = fixture.input;
      const scopePath = `.agent/work/${fixture.input.work_id}/scope.json`;
      const scope = readFileSync(path.join(fixture.root, scopePath));
      const document = readFileSync(path.join(fixture.root, 'docs/agent-instructions/current.md'));
      const target = path.join(
        fixture.root,
        `.agent/work/${fixture.input.work_id}/documentation-baseline-0001.v1.json`,
      );
      expect(() =>
        runtime.produceDocumentationClearCheckpoint({ ...fixture.input, repository_id: 'foreign', phase: 'baseline' }),
      ).toThrow('documentation repository binding invalid');
      for (const work_id of ['', '../bad', 'a'.repeat(129)]) {
        await Promise.resolve(
          expect(runtime.executeDocumentationClearOperation({ ...fixture.input, work_id }, 'baseline')).rejects.toThrow(
            'documentation work id invalid',
          ),
        );
        await Promise.resolve(
          expect(runtime.executeDocumentationClearFromWork({ ...workInput, work_id }, 'baseline')).rejects.toThrow(
            'documentation work id invalid',
          ),
        );
      }
      fixture.write(
        scopePath,
        JSON.stringify({
          schema: 'ImplementationScope/v1',
          work_id: 'foreign',
          source_revision: fixture.input.source_revision,
          allowed_paths: fixture.input.scope_paths,
        }) + '\n',
      );
      const foreign = readFileSync(path.join(fixture.root, scopePath));
      await Promise.resolve(
        expect(runtime.executeDocumentationClearFromWork(workInput, 'baseline')).rejects.toThrow(
          'documentation work scope binding invalid',
        ),
      );
      expect(readFileSync(path.join(fixture.root, scopePath))).toEqual(foreign);
      expect(readFileSync(path.join(fixture.root, 'docs/agent-instructions/current.md'))).toEqual(document);
      expect(existsSync(target)).toBe(false);
      writeFileSync(path.join(fixture.root, scopePath), scope);
      expect((await runtime.executeDocumentationClearFromWork(workInput, 'baseline')).status).toBe('pass');
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed scope and identity fixture: ${fixture.root}`);
    }
  });

  test('map links distinguish external, excluded and missing governed targets', () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
      const policyBytes = readFileSync(path.join(fixture.root, policyPath));
      const policy = JSON.parse(policyBytes.toString('utf8')) as Record<string, unknown>;
      fixture.write(
        policyPath,
        JSON.stringify({ ...policy, excluded_roots: ['.agent', '.planning', 'docs/agent-instructions/excluded'] }) +
          '\n',
      );
      fixture.write('docs/agent-instructions/excluded/present.md', 'excluded\n');
      fixture.write('docs/agent-instructions/nested/present.md', 'nested\n');
      const map =
        '[external](https://example.test/a) [fragment](#part) [outside](../../elsewhere.md) [nested](nested/present.md) [excluded](excluded/present.md)\n';
      fixture.write('docs/agent-instructions/index.md', map);
      const baseline = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' });
      expect(baseline.status).toBe('pass');
      expect(baseline.documents.some((row) => row.path === 'docs/agent-instructions/nested/present.md')).toBe(true);
      expect(baseline.documents.some((row) => row.path === 'docs/agent-instructions/excluded/present.md')).toBe(false);
      fixture.write('docs/agent-instructions/index.md', map + '[missing](excluded/missing.md)\n');
      const blocked = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' });
      expect(blocked).toMatchObject({ status: 'blocked', gaps: ['GAP-DOCUMENTATION-MAP-001'] });
      expect(readFileSync(path.join(fixture.root, 'docs/agent-instructions/index.md'), 'utf8')).toBe(
        map + '[missing](excluded/missing.md)\n',
      );
      fixture.write('docs/agent-instructions/excluded/missing.md', 'created\n');
      expect(runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' }).status).toBe('pass');
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed map fixture: ${fixture.root}`);
    }
  });

  test('producer reports missing governed scope and missing required changelog path', () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const pathName = 'docs/agent-instructions/documentation-policy.v1.json';
      const policy = JSON.parse(readFileSync(path.join(fixture.root, pathName), 'utf8')) as Record<string, unknown>;
      fixture.write(pathName, JSON.stringify({ ...policy, changelog_required: true, changelog_path: null }) + '\n');
      const baseline = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' });
      expect(baseline).toMatchObject({ status: 'blocked', gaps: ['GAP-DOCUMENTATION-CHANGELOG-001'] });
      const missing = runtime.produceDocumentationClearCheckpoint({
        ...fixture.input,
        scope_paths: ['docs/agent-instructions/missing.md'],
        phase: 'closeout',
        baseline,
        baseline_path: '.agent/work/clear-zombies/documentation-baseline-0001.v1.json',
      });
      expect(missing.gaps).toContain('GAP-DOCUMENTATION-SCOPE-001');
      expect(missing.gaps).toContain('GAP-DOCUMENTATION-CHANGELOG-001');
      fixture.write(pathName, JSON.stringify({ ...policy, required: false }) + '\n');
      const optional = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' });
      expect(optional).toMatchObject({ required: false, status: 'not_required', gaps: [] });
      fixture.write(pathName, JSON.stringify(policy) + '\n');
      expect(runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' }).status).toBe('pass');
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed policy and scope fixture: ${fixture.root}`);
    }
  });

  test('invalid typed changelog payload blocks closeout until repaired', () => {
    const fixture = documentationClearFixture({ changelogRequired: true });
    let passed = false;
    try {
      const baseline = runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' });
      const input = {
        ...fixture.input,
        phase: 'closeout' as const,
        baseline,
        baseline_path: '.agent/work/clear-zombies/documentation-baseline-0001.v1.json',
      };
      const changelog = 'docs/agent-instructions/agent-instructions.changelog.jsonl';
      fixture.write(changelog, JSON.stringify({ schema: 'DocumentationChangeEvent/v1', operation: 7 }) + '\n');
      expect(runtime.produceDocumentationClearCheckpoint(input)).toMatchObject({
        status: 'blocked',
        gaps: ['GAP-DOCUMENTATION-CHANGELOG-001'],
      });
      fixture.write(changelog, '');
      expect(runtime.produceDocumentationClearCheckpoint(input).status).toBe('pass');
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed changelog fixture: ${fixture.root}`);
    }
  });

  test('inventory rejects a real symlink and accepts the repaired canonical root', async () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const baseline = await runtime.executeDocumentationClearOperation(fixture.input, 'baseline');
      const baselinePath = path.join(fixture.root, baseline.path);
      const baselineBytes = readFileSync(baselinePath);
      const target = path.join(fixture.root, 'docs/agent-instructions/current.md');
      const targetBytes = readFileSync(target);
      const link = path.join(fixture.root, 'docs/agent-instructions/link.md');
      symlinkSync('current.md', link);
      expect(() => runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' })).toThrow(
        'documentation inventory contains a reparse point',
      );
      expect(readFileSync(baselinePath)).toEqual(baselineBytes);
      expect(readFileSync(target)).toEqual(targetBytes);
      unlinkSync(link);
      const closeout = await runtime.executeDocumentationClearOperation(fixture.input, 'closeout');
      expect(closeout.status).toBe('pass');
      expect(readFileSync(baselinePath)).toEqual(baselineBytes);
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed symlink inventory fixture: ${fixture.root}`);
    }
  });

  test('inventory rejects a real unix socket and accepts the repaired canonical root', async () => {
    const fixture = documentationClearFixture({ shortRoot: true });
    let passed = false;
    try {
      const baseline = await runtime.executeDocumentationClearOperation(fixture.input, 'baseline');
      const baselinePath = path.join(fixture.root, baseline.path);
      const baselineBytes = readFileSync(baselinePath);
      const documentPath = path.join(fixture.root, 'docs/agent-instructions/current.md');
      const documentBytes = readFileSync(documentPath);
      const socketPath = path.join(fixture.root, 'docs/agent-instructions/io.sock');
      const listener = Bun.listen({ unix: socketPath, socket: { data() {} } });
      try {
        expect(() => runtime.produceDocumentationClearCheckpoint({ ...fixture.input, phase: 'baseline' })).toThrow(
          'documentation inventory contains an unsupported path',
        );
        expect(readFileSync(baselinePath)).toEqual(baselineBytes);
        expect(readFileSync(documentPath)).toEqual(documentBytes);
      } finally {
        listener.stop(true);
        if (existsSync(socketPath)) unlinkSync(socketPath);
      }
      const closeout = await runtime.executeDocumentationClearOperation(fixture.input, 'closeout');
      expect(closeout.status).toBe('pass');
      expect(readFileSync(baselinePath)).toEqual(baselineBytes);
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed socket inventory fixture: ${fixture.root}`);
    }
  });

  test('policy change without a transition blocks the baseline until exact restoration', async () => {
    const fixture = documentationClearFixture();
    let passed = false;
    try {
      const baselineResult = await runtime.executeDocumentationClearOperation(fixture.input, 'baseline');
      const baselinePath = path.join(fixture.root, baselineResult.path);
      const baselineBytes = readFileSync(baselinePath);
      const baseline = readCheckpoint(baselinePath);
      expect(baseline.status).toBe('pass');
      const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
      const policyBytes = readFileSync(path.join(fixture.root, policyPath));
      const policy = JSON.parse(policyBytes.toString('utf8')) as Record<string, unknown>;
      fixture.write(policyPath, JSON.stringify({ ...policy, owner: 'project:changed-owner' }) + '\n');
      const input = { ...fixture.input, phase: 'closeout' as const, baseline, baseline_path: baselineResult.path };
      const blocked = runtime.produceDocumentationClearCheckpoint(input);
      expect(blocked).toMatchObject({ status: 'blocked', gaps: ['GAP-DOCUMENTATION-BASELINE-STALE-001'] });
      await Promise.resolve(
        expect(runtime.executeDocumentationClearOperation(fixture.input, 'closeout')).rejects.toThrow(
          'documentation CLEAR blocked: GAP-DOCUMENTATION-BASELINE-STALE-001',
        ),
      );
      expect(readFileSync(baselinePath)).toEqual(baselineBytes);
      expect(
        existsSync(path.join(fixture.root, `.agent/work/${fixture.input.work_id}/documentation-closeout-0001.v1.json`)),
      ).toBe(false);
      writeFileSync(path.join(fixture.root, policyPath), policyBytes);
      const closeout = await runtime.executeDocumentationClearOperation(fixture.input, 'closeout');
      expect(closeout.status).toBe('pass');
      expect(readFileSync(baselinePath)).toEqual(baselineBytes);
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed policy transition fixture: ${fixture.root}`);
    }
  });

  test('closeout requires real init and delete events for changed inventory', async () => {
    const fixture = documentationClearFixture({ changelogRequired: true });
    let passed = false;
    try {
      const oldPath = 'docs/agent-instructions/old.md';
      const newPath = 'docs/agent-instructions/new.md';
      const oldBody = 'old documentation\n';
      const newBody = 'new documentation\n';
      fixture.write(oldPath, oldBody);
      const baselineResult = await runtime.executeDocumentationClearOperation(fixture.input, 'baseline');
      const baselinePath = path.join(fixture.root, baselineResult.path);
      const baselineBytes = readFileSync(baselinePath);
      const baseline = readCheckpoint(baselinePath);
      const digest = (content: string): string => createHash('sha256').update(content).digest('hex');
      expect(baseline.documents).toContainEqual({
        path: oldPath,
        sha256: digest(oldBody),
        size: Buffer.byteLength(oldBody),
      });
      expect(baseline.documents.some((document) => document.path === newPath)).toBe(false);
      unlinkSync(path.join(fixture.root, oldPath));
      fixture.write(newPath, newBody);
      await Promise.resolve(
        expect(runtime.executeDocumentationClearOperation(fixture.input, 'closeout')).rejects.toThrow(
          'documentation CLEAR blocked: GAP-DOCUMENTATION-CHANGELOG-001',
        ),
      );
      expect(readFileSync(baselinePath)).toEqual(baselineBytes);
      expect(readFileSync(path.join(fixture.root, newPath), 'utf8')).toBe(newBody);
      const common = {
        schema: 'DocumentationChangeEvent/v1',
        work_id: fixture.input.work_id,
        source_revision: fixture.input.source_revision,
        actor: 'test:documentation-owner',
        timestamp: new Date().toISOString(),
      };
      const events = [
        {
          ...common,
          event_id: 'init-new',
          logical_edit_id: 'init-new',
          operation: 'init',
          document_id: newPath,
          path_before: null,
          path_after: newPath,
          before_sha256: '0'.repeat(64),
          after_sha256: digest(newBody),
          pointer: 'test:init-new',
        },
        {
          ...common,
          event_id: 'delete-old',
          logical_edit_id: 'delete-old',
          operation: 'delete',
          document_id: oldPath,
          path_before: oldPath,
          path_after: null,
          before_sha256: digest(oldBody),
          after_sha256: '0'.repeat(64),
          pointer: 'test:delete-old',
        },
      ];
      fixture.write(
        'docs/agent-instructions/agent-instructions.changelog.jsonl',
        events.map((event) => JSON.stringify(event)).join('\n') + '\n',
      );
      const closeout = await runtime.executeDocumentationClearOperation(fixture.input, 'closeout');
      const checkpoint = readCheckpoint(path.join(fixture.root, closeout.path));
      expect(checkpoint).toMatchObject({ status: 'pass', gaps: [], baseline_digest: baseline.digest });
      expect(checkpoint.documents).toContainEqual({
        path: newPath,
        sha256: digest(newBody),
        size: Buffer.byteLength(newBody),
      });
      expect(checkpoint.documents.some((document) => document.path === oldPath)).toBe(false);
      expect(readFileSync(baselinePath)).toEqual(baselineBytes);
      expect((await runtime.executeDocumentationClearOperation(fixture.input, 'verify')).path).toBe(closeout.path);
      passed = true;
    } finally {
      if (passed) fixture.cleanup();
      else console.error(`Retained failed init and delete fixture: ${fixture.root}`);
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

  test('closeout rejects typed events with incorrect document hashes and accepts the correct binding', async () => {
    for (const wrongField of ['before_sha256', 'after_sha256'] as const) {
      const fixture = documentationClearFixture({ changelogRequired: true });
      let passed = false;
      try {
        const baselineResult = await runtime.executeDocumentationClearOperation(fixture.input, 'baseline');
        const baselinePath = path.join(fixture.root, baselineResult.path);
        const baselineBytes = readFileSync(baselinePath);
        const documentPath = 'docs/agent-instructions/current.md';
        const before = readFileSync(path.join(fixture.root, documentPath));
        const after = 'current, revised\n';
        fixture.write(documentPath, after);
        const digest = (content: string | Uint8Array): string =>
          new Bun.CryptoHasher('sha256').update(content).digest('hex');
        const event = {
          schema: 'DocumentationChangeEvent/v1',
          event_id: 'finalize-current-hash',
          logical_edit_id: 'finalize-current-hash',
          work_id: fixture.input.work_id,
          source_revision: fixture.input.source_revision,
          operation: 'finalize',
          document_id: documentPath,
          path_before: documentPath,
          path_after: documentPath,
          before_sha256: digest(before),
          after_sha256: digest(after),
          actor: 'test:documentation-owner',
          pointer: 'test:finalize-current-hash',
          timestamp: new Date().toISOString(),
        };
        const changelog = 'docs/agent-instructions/agent-instructions.changelog.jsonl';
        fixture.write(changelog, JSON.stringify({ ...event, [wrongField]: '0'.repeat(64) }) + '\n');
        await Promise.resolve(
          expect(runtime.executeDocumentationClearOperation(fixture.input, 'closeout')).rejects.toThrow(
            'documentation CLEAR blocked: GAP-DOCUMENTATION-CHANGELOG-001',
          ),
        );
        expect(readFileSync(baselinePath)).toEqual(baselineBytes);

        fixture.write(changelog, JSON.stringify(event) + '\n');
        const closeout = await runtime.executeDocumentationClearOperation(fixture.input, 'closeout');
        const checkpoint = readCheckpoint(path.join(fixture.root, closeout.path));
        expect(closeout.status).toBe('pass');
        expect(checkpoint.gaps).toEqual([]);
        expect((await runtime.executeDocumentationClearOperation(fixture.input, 'verify')).path).toBe(closeout.path);
        passed = true;
      } finally {
        if (passed) fixture.cleanup();
        else console.error(`Retained failed changelog hash fixture: ${fixture.root}`);
      }
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
