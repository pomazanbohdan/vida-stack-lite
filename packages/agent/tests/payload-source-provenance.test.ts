import { afterAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function findRepositoryRoot(start: string): string {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, 'tooling/agent/controllers/forward-update-plan.ts'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('Could not locate repository root for payload verifier');
    current = parent;
  }
}

const repository = findRepositoryRoot(path.dirname(fileURLToPath(import.meta.url)));
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
type PreparedPayloadEntry = {
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
  readonly source_path?: string;
  readonly source_sha256?: string;
};
type VerifiedPayloadManifest = { readonly files: Map<string, PreparedPayloadEntry> };
type VerifyStagedPayloadManifest = (root: string, expectedSha: string) => unknown;
type AssertGeneratedRootAgents = (root: string) => unknown;

function isManifestVerifier(value: unknown): value is VerifyStagedPayloadManifest {
  return typeof value === 'function' && value.length === 2;
}

function isGeneratedAgentsAssertion(value: unknown): value is AssertGeneratedRootAgents {
  return typeof value === 'function' && value.length === 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUnknownMap(value: unknown): value is Map<unknown, unknown> {
  return value instanceof Map;
}

function isPreparedPayloadEntry(value: unknown): value is PreparedPayloadEntry {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.size === 'number' &&
    Number.isSafeInteger(value.size) &&
    typeof value.sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(value.sha256) &&
    (value.source_path === undefined || typeof value.source_path === 'string') &&
    (value.source_sha256 === undefined ||
      (typeof value.source_sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.source_sha256)))
  );
}

function isVerifiedPayloadManifest(value: unknown): value is VerifiedPayloadManifest {
  if (!isRecord(value) || !isUnknownMap(value.files)) return false;
  for (const [key, entry] of value.files) if (typeof key !== 'string' || !isPreparedPayloadEntry(entry)) return false;
  return true;
}

const importedVerifier: unknown = await import(
  pathToFileURL(path.join(repository, 'tooling/agent/controllers/forward-update-plan.ts')).href
);
if (!isRecord(importedVerifier)) throw new Error('Payload verifier module export record is invalid');
const verifyValue = importedVerifier.verifyStagedPayloadManifest;
const generatedAgentsValue = importedVerifier.assertGeneratedRootAgents;
if (!isManifestVerifier(verifyValue) || !isGeneratedAgentsAssertion(generatedAgentsValue))
  throw new Error('Current payload verifier exports are unavailable');
const verifyStagedPayloadManifest = verifyValue;
const assertGeneratedRootAgents = generatedAgentsValue;

const scratch = mkdtempSync(path.join(tmpdir(), 'vida-payload-source-provenance-'));
const scratchIdentity = lstatSync(scratch);
const scratchRealPath = realpathSync(scratch);
const temporaryRoot = realpathSync(tmpdir());
afterAll(() => {
  const stat = lstatSync(scratch);
  const real = realpathSync(scratch);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.dev !== scratchIdentity.dev ||
    stat.ino !== scratchIdentity.ino ||
    real !== scratchRealPath ||
    path.dirname(real) !== temporaryRoot ||
    !path.basename(real).startsWith('vida-payload-source-provenance-')
  )
    throw new Error('Unsafe payload provenance fixture root');
  rmSync(real, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
});

function payload(files: Array<{ path: string; bytes: Buffer; source_path?: string; source_sha256?: string }>) {
  const root = mkdtempSync(path.join(scratch, 'payload-'));
  const entries = files.map(({ path: relative, bytes, source_path, source_sha256 }) => {
    const target = path.join(root, ...relative.split('/'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
    return {
      path: relative,
      size: bytes.length,
      sha256: sha(bytes),
      ...(source_path === undefined ? {} : { source_path }),
      ...(source_sha256 === undefined ? {} : { source_sha256 }),
    };
  });
  const manifest = Buffer.from(
    `${JSON.stringify({ schema: 'VidaAgentPreparedPayload/v1', files: entries, unresolved_integration_paths: [] }, null, 2)}\n`,
  );
  writeFileSync(path.join(root, 'vida-agent-payload.manifest.v1.json'), manifest);
  return { root, expectedSha: sha(manifest), entries };
}

describe('prepared payload Source provenance', () => {
  test('verifier accepts authored bytes with same-byte source provenance', () => {
    const old = Buffer.from('old authored source\n');
    const current = Buffer.from('changed authored source\n');
    const source = path.join(scratch, 'authored-source.mjs');
    writeFileSync(source, current);
    const entry = { path: 'source.mjs', bytes: readFileSync(source), source_sha256: sha(readFileSync(source)) };
    const staged = payload([entry]);

    expect(staged.entries[0]?.source_sha256).toBe(sha(readFileSync(source)));
    expect(sha(old)).not.toBe(staged.entries[0]?.sha256);
    const verified: unknown = verifyStagedPayloadManifest(staged.root, staged.expectedSha);
    if (!isVerifiedPayloadManifest(verified))
      throw new Error('Verified authored payload manifest has an invalid shape');
    expect(verified.files.size).toBe(1);
  });

  test('verifier rejects stale authored source provenance', () => {
    const old = Buffer.from('old authored source\n');
    const current = Buffer.from('changed authored source\n');
    const staged = payload([{ path: 'source.mjs', bytes: current, source_sha256: sha(old) }]);

    expect(() => verifyStagedPayloadManifest(staged.root, staged.expectedSha)).toThrow(
      /same-byte source provenance differs/,
    );
  });

  test('preserves template provenance for generated root AGENTS.md', () => {
    const template = Buffer.from('managed-by: agent-runtime\nproject-sidecar: AGENT.sidecar.md\n{{BUNDLE}}\n');
    const generated = Buffer.from(template.toString('utf8').replaceAll('{{BUNDLE}}', 'vida-agent'));
    const staged = payload([
      {
        path: 'vida-agent/templates/AGENTS.template.md',
        bytes: template,
        source_sha256: sha(template),
      },
      {
        path: 'AGENTS.md',
        bytes: generated,
        source_path: 'vida-agent/templates/AGENTS.template.md',
        source_sha256: sha(template),
      },
    ]);
    const selectedValue: unknown = verifyStagedPayloadManifest(staged.root, staged.expectedSha);
    if (!isVerifiedPayloadManifest(selectedValue))
      throw new Error('Verified generated payload manifest has an invalid shape');
    assertGeneratedRootAgents(staged.root);
    const agents = selectedValue.files.get('AGENTS.md');
    const templateEntry = selectedValue.files.get('vida-agent/templates/AGENTS.template.md');

    expect(agents?.source_path).toBe('vida-agent/templates/AGENTS.template.md');
    expect(agents?.source_sha256).toBe(templateEntry?.sha256);
    expect(agents?.source_sha256).not.toBe(agents?.sha256);

    const tampered = Buffer.from(generated.toString('utf8') + 'tampered generated output\n');
    const changed = payload([
      { path: 'vida-agent/templates/AGENTS.template.md', bytes: template, source_sha256: sha(template) },
      {
        path: 'AGENTS.md',
        bytes: tampered,
        source_path: 'vida-agent/templates/AGENTS.template.md',
        source_sha256: sha(template),
      },
    ]);
    const verifiedTamperedValue: unknown = verifyStagedPayloadManifest(changed.root, changed.expectedSha);
    if (!isVerifiedPayloadManifest(verifiedTamperedValue))
      throw new Error('Verified tampered manifest has an invalid shape');
    expect(() => assertGeneratedRootAgents(changed.root)).toThrow(/AGENTS differs from selected bundle template/);
  });
});
