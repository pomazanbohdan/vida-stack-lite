import { afterEach, describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cellHash, cellsDigest, headersDigest, parseCsv, rowHash } from '../scripts/csv-intake.ts';
import { buildCensus } from '../scripts/sbvf-census.ts';

const powersRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(powersRoot, '..', '..');
const scriptPath = join(powersRoot, 'scripts', 'sbvf-census.ts');
const fixtureRoot = join(powersRoot, 'tests', 'fixtures', 'sbvf-census');
const tempRoots: string[] = [];

type FixtureOptions = { splitGamma?: boolean; extraCluster?: boolean };
function hash(bytes: Uint8Array | string): string { return createHash('sha256').update(bytes).digest('hex'); }
function json(path: string, value: unknown): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function git(donorRoot: string, args: string[]): string {
  const result = spawnSync('git', ['-C', donorRoot, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}
function filesUnder(root: string): string[] {
  const output: string[] = [];
  const walk = (path: string): void => {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) walk(full); else output.push(full.slice(root.length + 1).replaceAll('\\', '/'));
    }
  };
  walk(root);
  return output;
}
type CliResult = { status: number | null; stdout: string; stderr: string };
function cli(root: string, args: string[] = []): CliResult {
  const result = spawnSync(process.execPath, [scriptPath, '--root', root, ...args], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status, stdout: String(result.stdout), stderr: String(result.stderr) };
}

function createFixture(options: FixtureOptions = {}): { base: string; root: string; manifestPath: string; sharedIds: string[] } {
  const base = join(tmpdir(), `sbvf-census-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  tempRoots.push(base);
  const root = join(base, 'product');
  const donorRoot = join(root, '.tmp', 'donors', 'uupm');
  const dataRoot = join(donorRoot, 'src', 'data');
  mkdirSync(dataRoot, { recursive: true });
  const csvNames = ['alpha', 'beta', 'gamma'];
  for (const name of csvNames) {
    const relative = `stacks/${name}.csv`;
    mkdirSync(join(dataRoot, 'stacks'), { recursive: true });
    copyFileSync(join(fixtureRoot, relative), join(dataRoot, relative));
  }
  if (options.extraCluster === true) {
    appendFileSync(join(dataRoot, 'stacks', 'beta.csv'), 'Configure retry backoff,Bound retries with a capped delay.,Retry with exponential backoff and jitter.,Do not retry without bound.,beta 2.x\n');
    appendFileSync(join(dataRoot, 'stacks', 'gamma.csv'), 'Backoff configure retry,Bound retries with a capped delay.,Retry with exponential backoff and jitter.,Do not retry without bound.,gamma 3.x\n');
  }
  git(donorRoot, ['init']);
  git(donorRoot, ['config', 'user.email', 'sbvf-test@example.invalid']);
  git(donorRoot, ['config', 'user.name', 'SBVF Fixture']);
  git(donorRoot, ['add', '.']);
  git(donorRoot, ['commit', '-m', 'fixture']);
  const head = git(donorRoot, ['rev-parse', 'HEAD']);
  writeFileSync(join(root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: uupm\n    local_path: uupm\n    head_sha: ${head}\n    content_path: src/data\n`, 'utf8');

  const instructionEntries: Array<{ instruction_id: string; path: string; sha256: string }> = [];
  const csvSources: Record<string, unknown> = {};
  const allowlist: Array<{ donor: string; path: string; rawSha256: string; headersDigest: string }> = [];
  const sharedIds = ['uupm-alpha-shared', 'uupm-beta-shared', 'uupm-gamma-shared'];
  for (const name of csvNames) {
    const csvPath = `stacks/${name}.csv`;
    const bytes = readFileSync(join(dataRoot, csvPath));
    const parsed = parseCsv(bytes);
    const roles = ['normative-title', 'normative-description', 'normative-direction', 'normative-exception', 'metadata-applicability'];
    const columns = parsed.headers.map((header, index) => ({ index, header, role: roles[index]! }));
    const sharedId = sharedIds[csvNames.indexOf(name)]!;
    let sharedOrdinal = 0;
    const mapRows = parsed.rows.map((parsedRow) => {
      const rowKey = `path=${csvPath}&headers=${parsed.headersDigest}&cells=${cellsDigest(parsedRow.cells)}`;
      const cellHashes = parsedRow.cells.map(cellHash);
      const isSplit = options.splitGamma === true && name === 'gamma';
      const id = name === 'alpha' && parsedRow.row === 1 ? 'uupm-alpha-singleton' : (sharedOrdinal += 1) === 1 ? sharedId : `${sharedId}-${sharedOrdinal}`;
      const locator = { line: parsedRow.line, row: parsedRow.row };
      const fidelityPath = `fidelity/uupm/${name}/${id}.json`;
      const cells = columns.flatMap((column, columnIndex) => column.role.startsWith('normative-') ? [{
        columnIndex, columnHeader: column.header, cellHash: cellHashes[columnIndex]!, role: column.role,
        locator: { line: parsedRow.line, row: parsedRow.row, column: columnIndex + 1 },
        locators: [{ line: parsedRow.line, row: parsedRow.row, column: columnIndex + 1 }],
      }] : []);
      const admitted = !isSplit;
      const binding = { instructionId: id, cells, fidelity: { path: fidelityPath, sha256: '' } };
      if (admitted) {
        const instructionBytes = Buffer.from(`---\ninstruction_id: ${id}\napplicability: "${name} 1.x"\n---\n# Fixture\n\nKeep this source row intact.\n`, 'utf8');
        const instructionPath = `instructions/${id}.md`;
        mkdirSync(join(root, 'instructions'), { recursive: true }); writeFileSync(join(root, instructionPath), instructionBytes);
        instructionEntries.push({ instruction_id: id, path: instructionPath, sha256: hash(instructionBytes) });
        const receipt = { schema: 'H2FidelityReceipt/v1', instructionId: id, verdict: 'READY', reviewer: { kind: 'human' }, source: {
          donor: 'uupm', path: csvPath, rowKey, cells: cells.map((cell) => ({ columnIndex: cell.columnIndex, cellHash: cell.cellHash, locator: cell.locator })),
        } };
        const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
        mkdirSync(dirname(join(root, fidelityPath)), { recursive: true }); writeFileSync(join(root, fidelityPath), receiptBytes);
        binding.fidelity.sha256 = hash(receiptBytes);
      }
      return { rowKey, rowHash: rowHash(rowKey, parsed.headersDigest, cellHashes), cellHashes, locator, locators: [locator], disposition: admitted ? 'admitted' : 'deferred', bindings: admitted ? [binding] : [], resourceIds: [], mergedInto: null, ...(!admitted ? { reason: 'SPLIT pending source-bound applicability' } : {}) };
    });
    csvSources[csvPath] = { rawSha256: hash(bytes), headersDigest: parsed.headersDigest, columns, rows: mapRows };
    allowlist.push({ donor: 'uupm', path: csvPath, rawSha256: hash(bytes), headersDigest: parsed.headersDigest });
  }
  mkdirSync(join(root, 'config'), { recursive: true });
  json(join(root, 'config', 'h2-csv-allowlist.json'), allowlist);
  json(join(root, 'catalog.json'), { schema: 'VPCatalog/v1', instructions: instructionEntries });
  json(join(root, 'corpus-map.json'), { schema: 'VPCorpusMap/v2', revision: 1, updated_at: '2026-01-01T00:00:00Z', donors: { uupm: { source_revision: head, files: {}, csvSources } } });
  const manifestPath = join(base, 'manifest.json');
  json(manifestPath, { schema: 'SBVFFamilyManifest/v1', families: [] });
  return { base, root, manifestPath, sharedIds };
}

function family(familyId: string, variants: string[]): Record<string, unknown> {
  return { family_id: familyId, title: 'Shared dependency rule', summary: 'A source-bound shared example.', rationale: 'The variants retain their source-specific applicability.', variants,
    approved_by: 'owner', approved_at: '2026-11-07T12:00:00Z' };
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) if (existsSync(root)) rmSync(root, { recursive: true, force: true });
});

describe('sbvf-census', () => {
  it('groups three cross-file near-identical titles and excludes a singleton', () => {
    const fixture = createFixture();
    const result = cli(fixture.root, ['--json']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as { candidates: Array<{ match: string; members: unknown[] }>; counts: { csvRows: number } };
    expect(report.counts.csvRows).toBe(4);
    const near = report.candidates.filter((candidate) => candidate.match === 'near-title-directions');
    expect(near).toHaveLength(1);
    expect(near[0]?.members).toHaveLength(3);
  });

  it('marks a candidate proposed-not-eligible when one member is SPLIT', () => {
    const fixture = createFixture({ splitGamma: true });
    const result = cli(fixture.root, ['--json']);
    const report = JSON.parse(result.stdout) as { candidates: Array<{ match: string; eligibility: string; ineligibilityReasons: string[] }> };
    const near = report.candidates.find((candidate) => candidate.match === 'near-title-directions');
    expect(near?.eligibility).toBe('proposed-not-eligible');
    expect(near?.ineligibilityReasons).toContain('SPLIT member');
  });

  it('produces byte-identical JSON and reports observed synthetic counts', () => {
    const fixture = createFixture();
    const first = cli(fixture.root, ['--json']);
    const second = cli(fixture.root, ['--json']);
    expect(first.stdout).toBe(second.stdout);
    const report = JSON.parse(first.stdout) as { reconciliation: { checks: Array<{ name: string; observed: number; delta: number }> } };
    const rows = report.reconciliation.checks.find((item) => item.name === 'csvRows');
    expect(rows?.observed).toBe(4);
    expect(rows?.delta).toBe(-1430);
  });

  it('writes only the explicitly requested report and summary paths', () => {
    const fixture = createFixture();
    const before = filesUnder(fixture.root);
    const defaultRun = cli(fixture.root);
    expect(defaultRun.status).toBe(0);
    expect(filesUnder(fixture.root)).toEqual(before);
    const out = join(fixture.base, 'reports', 'census.json');
    const summary = join(fixture.base, 'reports', 'census.md');
    const savedRun = cli(fixture.root, ['--out', out, '--summary', summary]);
    if (savedRun.status !== 0) throw new Error(savedRun.stderr);
    expect(savedRun.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(existsSync(summary)).toBe(true);
    expect(filesUnder(fixture.root)).toEqual(before);
    expect(readFileSync(out, 'utf8')).toBe(cli(fixture.root, ['--json']).stdout);
    expect(readFileSync(summary, 'utf8')).toContain('## Top candidates');
  });

  it('validates an owner manifest against schema, admitted rows, and READY receipts', () => {
    const fixture = createFixture();
    const valid = { schema: 'SBVFFamilyManifest/v1', families: [family('family-shared-dependency', fixture.sharedIds.slice(0, 2))] };
    json(fixture.manifestPath, valid);
    const result = cli(fixture.root, ['--manifest', fixture.manifestPath, '--json']);
    expect(result.status).toBe(0);
    expect((JSON.parse(result.stdout) as { manifestValidation: { valid: boolean } }).manifestValidation.valid).toBe(true);
  });

  it('rejects duplicate family and variant IDs', () => {
    const fixture = createFixture();
    const duplicateFamily = { schema: 'SBVFFamilyManifest/v1', families: [
      family('family-shared', fixture.sharedIds.slice(0, 2)), family('family-shared', [fixture.sharedIds[1]!, fixture.sharedIds[2]!]),
    ] };
    json(fixture.manifestPath, duplicateFamily);
    let result = cli(fixture.root, ['--manifest', fixture.manifestPath, '--json']);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('duplicate family ID');
    json(fixture.manifestPath, { schema: 'SBVFFamilyManifest/v1', families: [family('family-shared', [fixture.sharedIds[0]!, fixture.sharedIds[0]!])] });
    result = cli(fixture.root, ['--manifest', fixture.manifestPath, '--json']);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('must not contain duplicate items');
  });

  it('rejects fewer than two variants, a non-family ID, and missing approval', () => {
    const fixture = createFixture();
    const invalid = [
      family('family-shared', [fixture.sharedIds[0]!]),
      family('not-a-family', fixture.sharedIds.slice(0, 2)),
      { ...family('family-shared', fixture.sharedIds.slice(0, 2)), approved_by: undefined },
    ];
    for (const entry of invalid) {
      json(fixture.manifestPath, { schema: 'SBVFFamilyManifest/v1', families: [entry] });
      const result = cli(fixture.root, ['--manifest', fixture.manifestPath, '--json']);
      expect(result.status).toBe(1);
    }
  });
});

// The spawned CLI runs above do not count toward coverage: a child process is
// invisible to bun's instrumenter. Re-importing the script module with a query
// suffix re-evaluates it inside this process, so the argv[1] guard fires
// main() here while coverage still attributes the lines to sbvf-census.ts.
describe('in-process CLI entry', () => {
  let cliCounter = 0;
  type InProcessResult = { status: number; stdout: string; stderr: string };
  async function cliInProcess(root: string, args: string[] = []): Promise<InProcessResult> {
    const scriptPath = join(powersRoot, 'scripts', 'sbvf-census.ts');
    const stdout: string[] = [];
    const stderr: string[] = [];
    const savedArgv = process.argv;
    const savedStdoutWrite = process.stdout.write;
    const savedStderrWrite = process.stderr.write;
    const savedExitCode = process.exitCode;
    process.argv = [savedArgv[0] ?? 'bun', scriptPath, '--root', root, ...args];
    process.stdout.write = ((chunk: unknown): boolean => { stdout.push(String(chunk)); return true; }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: unknown): boolean => { stderr.push(String(chunk)); return true; }) as typeof process.stderr.write;
    process.exitCode = 0;
    try {
      cliCounter += 1;
      await import(`../scripts/sbvf-census.ts?cli-${cliCounter}`);
      return { status: process.exitCode ?? 0, stdout: stdout.join(''), stderr: stderr.join('') };
    } finally {
      process.argv = savedArgv;
      process.stdout.write = savedStdoutWrite;
      process.stderr.write = savedStderrWrite;
      process.exitCode = savedExitCode ?? 0;
    }
  }

  it('prints the markdown summary on stdout by default', async () => {
    const fixture = createFixture();
    const result = await cliInProcess(fixture.root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('# SBVF read-only census');
    expect(result.stdout).toContain('## Eligible pilot candidates');
    expect(result.stderr).toBe('');
  });

  it('prints the JSON report with --json', async () => {
    const fixture = createFixture();
    const result = await cliInProcess(fixture.root, ['--json']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as { schema: string };
    expect(report.schema).toBe('SBVFCensus/v1');
  });

  it('writes --out and --summary files and honors --min-score', async () => {
    const fixture = createFixture();
    const out = join(fixture.base, 'in-process', 'census.json');
    const summary = join(fixture.base, 'in-process', 'census.md');
    const result = await cliInProcess(fixture.root, ['--out', out, '--summary', summary, '--min-score', '0.5']);
    expect(result.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(summary, 'utf8')).toContain('SBVF read-only census');
  });

  it('validates a family manifest in-process and exits 1 when it is invalid', async () => {
    const fixture = createFixture();
    json(fixture.manifestPath, { schema: 'SBVFFamilyManifest/v1', families: [family('family-shared-dependency', [fixture.sharedIds[0]!])] });
    const result = await cliInProcess(fixture.root, ['--manifest', fixture.manifestPath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Manifest validation: invalid');
  });

  it('accepts --admissions next to --manifest', async () => {
    const fixture = createFixture();
    json(fixture.manifestPath, { schema: 'SBVFFamilyManifest/v1', families: [family('family-shared-dependency', fixture.sharedIds.slice(0, 2))] });
    const admissionsPath = join(fixture.base, 'admissions.json');
    json(admissionsPath, { schema: 'SBVFAdmissionManifest/v1', asOf: '2026-11-20T00:00:00Z', admissions: [] });
    const result = await cliInProcess(fixture.root, ['--manifest', fixture.manifestPath, '--admissions', admissionsPath, '--json']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as { manifestValidation: { valid: boolean } };
    expect(report.manifestValidation.valid).toBe(true);
  });

  it('orders multiple candidates in the markdown summary', async () => {
    const fixture = createFixture({ extraCluster: true });
    const report = buildCensus(fixture.root);
    expect((report.candidates as unknown[]).length).toBe(2);
    const result = await cliInProcess(fixture.root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('## Top candidates');
  });

  it('surfaces admission manifest schema issues during validation', () => {
    const fixture = createFixture();
    const familyPath = join(fixture.base, 'family-schema.json');
    json(familyPath, { schema: 'SBVFFamilyManifest/v1', families: [family('family-shared-dependency', fixture.sharedIds.slice(0, 2))] });
    const admissionsPath = join(fixture.base, 'admissions-schema-bad.json');
    json(admissionsPath, { schema: 'SBVFAdmissionManifest/v1', admissions: 'not-an-array' });
    const report = buildCensus(fixture.root, 0.7, familyPath, admissionsPath);
    const validation = report.manifestValidation as { valid: boolean; issues: string[] };
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.startsWith('admission manifest:'))).toBe(true);
  });

  it('prints the empty eligible section when every candidate is ineligible', async () => {
    const fixture = createFixture({ splitGamma: true });
    const result = await cliInProcess(fixture.root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('## Eligible pilot candidates\n\n- None.');
  });

  it('reports argument errors on stderr and exits 2', async () => {
    const fixture = createFixture();
    for (const args of [['--bogus'], ['--root'], ['--min-score', '2'], ['--out']]) {
      const result = await cliInProcess(fixture.root, args);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('sbvf-census:');
    }
  });

  it('rejects a fidelity receipt whose cells disagree with the map binding', async () => {
    const fixture = createFixture();
    const mapPath = join(fixture.root, 'corpus-map.json');
    const map = JSON.parse(readFileSync(mapPath, 'utf8')) as {
      donors: { uupm: { csvSources: Record<string, { rows: Array<{ disposition: string; bindings: Array<{ fidelity: { path: string; sha256: string } }> }> }> } };
    };
    const csvPath = Object.keys(map.donors.uupm.csvSources).sort()[0]!;
    const row = map.donors.uupm.csvSources[csvPath]!.rows.find((item) => item.disposition === 'admitted')!;
    const binding = row.bindings[0]!;
    const receiptPath = join(fixture.root, binding.fidelity.path);
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as { source: { cells: Array<{ cellHash: string }> } };
    receipt.source.cells[0]!.cellHash = 'f'.repeat(64);
    const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    writeFileSync(receiptPath, bytes);
    binding.fidelity.sha256 = hash(bytes);
    writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
    expect(() => buildCensus(fixture.root)).toThrow('fidelity receipt cell mismatch');
  });
});

const realCorpusOptIn = process.env.VP_REAL_CORPUS_TESTS === '1';
const realCensusTest = realCorpusOptIn ? it : it.skip;
describe('real corpus census (requires VP_REAL_CORPUS_TESTS=1 and pinned donor clones)', () => {
  realCensusTest('reconciles the headline counts and leaves no mismatch', () => {
    const result = cli(powersRoot, ['--json']);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      counts: { csvRows: number; dispositions: Record<string, number>; byDomain: { stack: { deferred: number } } };
      reconciliation: { checks: Array<{ status: string; name: string }> };
    };
    expect(report.counts.csvRows).toBe(1434);
    expect(report.counts.dispositions).toEqual({ admitted: 1414, deferred: 0, rejected: 20, merged: 0 });
    expect(report.counts.byDomain.stack.deferred).toBe(0);
    expect(report.reconciliation.checks.filter((check) => check.status === 'mismatch')).toEqual([]);
  });
});
