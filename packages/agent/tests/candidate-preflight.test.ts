import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertCandidatePreflight } from '../tooling/preflight.ts';

const temporaryRoots: string[] = [];
const forbiddenPaths = [
  'config/agent-profiles.v1.json',
  'config/authorization/cedar-policy.v1.cedar',
  'config/authorization/cedar-schema.v1.json',
  'config/differential-normalization.v1.json',
  'config/governance/edictum-policy.v1.json',
  'config/integrations/edictum-workflow.v1.yml',
  'config/orchestration/mastra-policy.v1.json',
  'config/platform-knowledge.sources.json',
  'config/runtime-operations.v1.json',
  'dist/schemas/runtime-config.v1.schema.json',
  'schemas/runtime-config.v1.schema.json',
] as const;

function fixtureRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'candidate-preflight-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('candidate preflight accepts a root without obsolete files', () => {
  expect(() => assertCandidatePreflight(fixtureRoot())).not.toThrow();
});

test('candidate preflight rejects each obsolete path', () => {
  for (const obsoletePath of forbiddenPaths) {
    const root = fixtureRoot();
    const file = path.join(root, obsoletePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, 'obsolete');
    expect(() => assertCandidatePreflight(root)).toThrow(obsoletePath);
  }
});
