import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  repositoryTestContextFiles,
  repositoryTestContextInputPrefix,
  sha256,
} from '../tooling/bun-coverage-evidence.ts';
import {
  coverageImageTestContext,
  coverageImageConsumerEnvironment,
  prepareCoverageImageTestContext,
  assertCoverageImageTestContext,
} from '../tooling/coverage-consumer-binding.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

const roots: string[] = [];
const runId = '11111111-1111-4111-8111-111111111111';
const environment = {
  VIDA_QUALITY_IMAGE_MANIFEST: '/image/.quality-image.json',
  AGENT_RUNTIME_TEST_REPOSITORY_ROOT: '/live-source',
};
function inputs() {
  const bytes = Object.fromEntries(
    repositoryTestContextFiles.map((file) => [
      `${repositoryTestContextInputPrefix}/${file}`,
      Buffer.from(`captured ${file}\n`),
    ]),
  );
  return {
    input_bytes: bytes,
    tool_inputs: Object.entries(bytes).map(([file, value]) => ({ path: file, sha256: sha256(value) })),
  };
}
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

test('image caller context supports native CAS reads and stays bound to captured bytes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'coverage-image-context-'));
  roots.push(root);
  const captured = inputs();
  const binding = coverageImageTestContext(root, runId, true, captured, environment);
  expect(binding).not.toBeNull();
  if (binding === null) throw new Error('missing context');
  const next = coverageImageTestContext(root, '22222222-2222-4222-8222-222222222222', true, captured, environment);
  expect(next?.root).not.toBe(binding.root);
  expect(binding.root).toContain(path.join('diagnostics', 'runs', runId));
  await prepareCoverageImageTestContext(binding, captured);
  const access = requireSafeRepositoryAccess(binding.root);
  expect(access.fileExists('agent-runtime.config.v1.yaml', 'captured config')).toBe(true);
  await assertCoverageImageTestContext(binding, captured);
  const caller = coverageImageConsumerEnvironment(binding, environment);
  expect(caller.AGENT_RUNTIME_TEST_REPOSITORY_ROOT).toBe(binding.root);
  expect(caller.AGENT_RUNTIME_TEST_CONTEXT_ROOT).toBe(binding.root);
  expect(environment.AGENT_RUNTIME_TEST_REPOSITORY_ROOT).toBe('/live-source');
  await writeFile(path.join(binding.root, 'AGENTS.md'), 'changed');
  await expectRejection(assertCoverageImageTestContext(binding, captured), /bytes changed/u);
});

test('image context selection rejects unbound roots, incomplete inputs and content drift', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'coverage-image-context-denial-'));
  roots.push(root);
  const captured = inputs();
  expect(coverageImageTestContext(root, 'legacy-run', true, captured, {})).toBeNull();
  expect(coverageImageConsumerEnvironment(null, environment)).toBe(environment);
  expect(() => coverageImageTestContext(root, '../escape', true, captured, environment)).toThrow(/UUID/u);
  expect(() => coverageImageTestContext(root, runId, true, { tool_inputs: [] }, environment)).toThrow(/missing/u);
  const binding = coverageImageTestContext(root, runId, false, captured, environment);
  captured.input_bytes[`${repositoryTestContextInputPrefix}/AGENTS.md`] = Buffer.from('drift');
  await expectRejection(prepareCoverageImageTestContext(binding, captured), /input changed/u);
});

test('image context accounts for known empty test-output directories and rejects files within them', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'coverage-image-context-fixture-output-'));
  roots.push(root);
  const captured = inputs();
  const binding = coverageImageTestContext(root, runId, false, captured, environment);
  await prepareCoverageImageTestContext(binding, captured);
  if (binding === null) throw new Error('missing context');

  await mkdir(path.join(binding.root, '.planning/agent-flow'), { recursive: true });
  await mkdir(path.join(binding.root, 'docs/agent-instructions/research/records'), { recursive: true });
  await assertCoverageImageTestContext(binding, captured);

  const unexpected = path.join(binding.root, 'docs/agent-instructions/research/records/unexpected.json');
  await writeFile(unexpected, '{"unexpected":true}\n');
  await expectRejection(assertCoverageImageTestContext(binding, captured), /layout changed/u);
  expect(await readFile(unexpected, 'utf8')).toBe('{"unexpected":true}\n');
});
