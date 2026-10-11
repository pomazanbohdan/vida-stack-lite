import { afterEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadForwardPayloadRuntime } from '../../../tooling/agent/controllers/forward-payload-runtime.ts';

const hash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helperPath = 'vida-agent/src/contracts/implementation-scope.ts';
const schemaPath = 'vida-agent/schemas/implementation-scope.v1.schema.json';
const files: Readonly<Record<string, string>> = {
  'vida-agent/src/contracts/public-ingress.ts':
    "throw new Error('PUBLIC_INGRESS_IMPORT_SENTINEL');\nexport const canonicalJsonDigest = (_value: unknown): string => '';\n",
  [helperPath]: readFileSync(path.join(packageRoot, 'src/contracts/implementation-scope.ts'), 'utf8'),
  'vida-agent/src/documentation/clear.ts': 'export {};\n',
  'vida-agent/src/config/safe-repository-access.ts': 'export {};\n',
  'vida-agent/src/orchestration/scoped-source-snapshot.ts': 'export {};\n',
  'vida-agent/bin/documentation-clear.ts': 'export {};\n',
  [schemaPath]: '{"type":"object"}\n',
  'vida-agent/bun.lock': '{}\n',
};

const fixtures: string[] = [];
afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

function createFixture(): { root: string; payload: string; manifestSha: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-forward-scope-loader-'));
  fixtures.push(root);
  const payload = path.join(root, 'stage');
  const installed = path.join(root, 'repository', 'vida-agent');
  mkdirSync(payload, { recursive: true });
  mkdirSync(installed, { recursive: true });
  writeFileSync(path.join(installed, 'package.json'), '{"name":"vida-agent-fixture"}\n');
  // The loader resolves only @babel/parser from the repository package context;
  // it must never import the synthetic staged Source modules in these cases.
  symlinkSync(path.join(packageRoot, 'node_modules'), path.join(installed, 'node_modules'), 'dir');
  const manifestFiles = [];
  for (const [relative, source] of Object.entries(files)) {
    const bytes = Buffer.from(source, 'utf8');
    const stagedFile = path.join(payload, relative);
    const installedFile = path.join(root, 'repository', relative);
    mkdirSync(path.dirname(stagedFile), { recursive: true });
    mkdirSync(path.dirname(installedFile), { recursive: true });
    writeFileSync(stagedFile, bytes);
    writeFileSync(installedFile, bytes);
    manifestFiles.push({ path: relative, sha256: hash(bytes), size: bytes.length });
  }
  const manifestBytes = Buffer.from(
    JSON.stringify(
      { schema: 'VidaAgentPreparedPayload/v1', files: manifestFiles, unresolved_integration_paths: [] },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(path.join(payload, 'vida-agent-payload.manifest.v1.json'), manifestBytes);
  const manifestSha = hash(manifestBytes);
  return { root: path.join(root, 'repository'), payload, manifestSha };
}

function alterInstalled(
  fixture: ReturnType<typeof createFixture>,
  relative: string,
  alteration: 'missing' | 'modified',
) {
  const file = path.join(fixture.root, relative);
  if (alteration === 'missing') unlinkSync(file);
  else writeFileSync(file, Buffer.concat([readFileSync(file), Buffer.from('// installed tree drift\n')]));
}

async function expectDependencyDenial(
  fixture: ReturnType<typeof createFixture>,
  relative: string,
  alteration: 'missing' | 'modified',
) {
  alterInstalled(fixture, relative, alteration);
  // The real loader verifies the unchanged selected stage before inspecting installed bytes.
  try {
    await loadForwardPayloadRuntime(fixture.root, fixture.payload, fixture.manifestSha);
    throw new Error('loader unexpectedly accepted installed dependency drift');
  } catch (error) {
    const failure = error as NodeJS.ErrnoException;
    expect(failure.message).not.toContain('PUBLIC_INGRESS_IMPORT_SENTINEL');
    if (alteration === 'missing') {
      expect(failure.code).toBe('ENOENT');
      expect(failure.path).toBe(path.join(fixture.root, relative));
    } else {
      expect(failure.message).toContain(`forward payload runtime dependency differs: ${relative}`);
    }
  }
}

describe('forward payload scope validator dependency custody', () => {
  test('rejects a missing installed shared validator before any Source import', async () => {
    await expectDependencyDenial(createFixture(), helperPath, 'missing');
  });

  test('rejects a modified installed shared validator before any Source import', async () => {
    await expectDependencyDenial(createFixture(), helperPath, 'modified');
  });

  test('rejects a missing installed imported schema resource before any Source import', async () => {
    await expectDependencyDenial(createFixture(), schemaPath, 'missing');
  });

  test('rejects a modified installed imported schema resource before any Source import', async () => {
    await expectDependencyDenial(createFixture(), schemaPath, 'modified');
  });
});
