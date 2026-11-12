import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cellHash, cellsDigest, parseCsv, rowHash } from '../scripts/csv-intake.ts';

type Dict = Record<string, unknown>;

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');

const fixtureStacks = ['stacks/vue.csv', 'stacks/react.csv'] as const;

export type FixtureAdmission = { row: number; instructionId: string; title: string };

const defaultFixtureAdmissions = new Map<string, FixtureAdmission[]>([
  ['stacks/vue.csv', [{ row: 1, instructionId: 'uupm-fixture-vue-composition', title: 'Use Composition API for new projects' }]],
  ['stacks/react.csv', [{ row: 1, instructionId: 'uupm-fixture-react-state', title: 'Use useState for local state' }]],
]);

function git(dir: string, args: string[]): string {
  const result = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function columnRole(header: string): string {
  return ({ Guideline: 'normative-title', Description: 'normative-description', Do: 'normative-direction', "Don't": 'normative-exception',
    'Code Good': 'normative-example', 'Code Bad': 'normative-example',
    'Applies To': 'metadata-applicability', Severity: 'metadata-severity', Status: 'metadata-status' } as Record<string, string>)[header] ?? 'metadata-other';
}

function cellLineBreaks(cell: string): number {
  let count = 0;
  for (let index = 0; index < cell.length; index += 1) if (cell.charCodeAt(index) === 10) count += 1;
  return count;
}

function renderFixtureInstruction(item: { id: string; title: string; head: string; provenancePath: string }): Buffer {
  const fields: Array<[string, unknown]> = [
    ['schema', 'VPInstruction/v1.2'], ['classification_status', 'unclassified'], ['classification_reason', 'Fixture rehearsal instruction.'],
    ['instruction_id', item.id], ['title', item.title], ['summary', 'Fixture variant guidance.'],
    ['capability_tags', ['fixture-state']], ['pattern_tags', ['fixture-state']],
    ['conditions_applies_when', 'The fixture stack guidance applies.'], ['conditions_does_not_apply_when', 'A context where the fixture rule is unsafe.'],
    ['artifact_contract_output_type', 'none'], ['artifact_contract_required_data', []], ['artifact_contract_verified_by', 'Fixture verification.'],
    ['compatibility_excludes', []], ['compatibility_requires', []],
    ['provenance', [`donor=uupm; license=MIT; revision=${item.head}; path=${item.provenancePath}`]],
    ['status', 'active'], ['revision', 1],
  ];
  const frontmatter = fields.map(([key, value]) => Array.isArray(value)
    ? (value.length === 0 ? `${key}: []` : `${key}:\n${value.map(entry => `  - ${JSON.stringify(entry)}`).join('\n')}`)
    : `${key}: ${JSON.stringify(value)}`).join('\n');
  return Buffer.from(`---\n${frontmatter}\n---\n\n# ${item.title}\nFixture variant body.\n`, 'utf8');
}

async function uupmContentDir(): Promise<string> {
  const donorsYaml = await readFile(join(packageRoot, 'donors.yaml'), 'utf8');
  const chunk = donorsYaml.split(/^\s{2}-\s+id:\s*/mu).find(part => part.startsWith('uupm'));
  if (chunk === undefined) throw new Error('donors.yaml has no uupm record');
  const field = (key: string): string => (new RegExp(`^\\s{4}${key}:\\s*(.+?)\\s*$`, 'mu').exec(chunk)?.[1] ?? '').replace(/^['"]|['"]$/gu, '');
  return join(packageRoot, '.tmp', 'donors', field('local_path'), field('content_path'));
}

export async function buildSbvfFixtureCorpus(root: string, admissions: Map<string, FixtureAdmission[]> = defaultFixtureAdmissions): Promise<void> {
  const uupmData = await uupmContentDir();
  const donorClone = join(root, '.tmp', 'donors', 'uupm');
  for (const csvPath of fixtureStacks) {
    await mkdir(dirname(join(donorClone, 'data', csvPath)), { recursive: true });
    await cp(join(uupmData, csvPath), join(donorClone, 'data', csvPath));
  }
  git(donorClone, ['init']);
  git(donorClone, ['config', 'user.email', 'sbvf-test@example.invalid']);
  git(donorClone, ['config', 'user.name', 'SBVF Fixture']);
  git(donorClone, ['add', '.']);
  git(donorClone, ['commit', '-m', 'fixture']);
  const head = git(donorClone, ['rev-parse', 'HEAD']);

  await writeFile(join(root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: uupm\n    local_path: uupm\n    head_sha: ${head}\n    content_path: data\n    license: MIT\n`, 'utf8');
  await mkdir(join(root, 'config'), { recursive: true });
  await mkdir(join(root, 'instructions'), { recursive: true });
  for (const name of await readdir(join(packageRoot, 'config'))) {
    if (name.endsWith('.schema.json')) await cp(join(packageRoot, 'config', name), join(root, 'config', name));
  }

  const csvSources: Dict = {};
  const allowlist: Dict[] = [];
  const catalogInstructions: Dict[] = [];
  const instructionWrites: Array<{ path: string; bytes: Buffer }> = [];
  const receipts: Array<{ path: string; bytes: Buffer }> = [];
  for (const csvPath of fixtureStacks) {
    const bytes = await readFile(join(donorClone, 'data', csvPath));
    const parsed = parseCsv(bytes);
    const columns = parsed.headers.map((header, index) => ({ index, header, role: columnRole(header) }));
    const normative = columns.filter(column => String(column.role).startsWith('normative-')).map(column => Number(column.index));
    const admitted = admissions.get(csvPath) ?? [];
    const rows = parsed.rows.map((record): Dict => {
      const hashes = record.cells.map(cellHash);
      const rowKey = `path=${csvPath}&headers=${parsed.headersDigest}&cells=${cellsDigest(record.cells)}`;
      const locator = { line: record.line, row: record.row };
      const item = admitted.find(entry => entry.row === record.row);
      if (item === undefined) {
        return { rowKey, rowHash: rowHash(rowKey, parsed.headersDigest, hashes), cellHashes: hashes, locator, locators: record.locators,
          disposition: 'deferred', bindings: [], resourceIds: [], mergedInto: null, reason: 'fixture deferred row' };
      }
      const cells = normative.map((columnIndex): Dict => {
        const line = record.line + record.cells.slice(0, columnIndex).reduce((sum, cell) => sum + cellLineBreaks(cell), 0);
        const cellLocator = { line, row: record.row, column: columnIndex + 1 };
        return { columnIndex, columnHeader: parsed.headers[columnIndex], cellHash: hashes[columnIndex], role: columns[columnIndex]!.role, locator: cellLocator, locators: [cellLocator] };
      });
      const receiptPath = `fidelity/rehearsal/${item.instructionId}.json`;
      const receipt = { schema: 'H2FidelityReceipt/v1', instructionId: item.instructionId, verdict: 'READY', reviewer: { kind: 'human' },
        source: { donor: 'uupm', path: csvPath, rowKey, cells: cells.map(cell => ({ columnIndex: cell.columnIndex, cellHash: cell.cellHash, locator: cell.locator, locators: cell.locators })) } };
      const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
      receipts.push({ path: receiptPath, bytes: receiptBytes });
      const instructionPath = `instructions/${item.instructionId}.md`;
      const markdown = renderFixtureInstruction({ id: item.instructionId, title: item.title, head, provenancePath: csvPath });
      instructionWrites.push({ path: instructionPath, bytes: markdown });
      catalogInstructions.push({ instruction_id: item.instructionId, path: instructionPath, sha256: sha(markdown) });
      return { rowKey, rowHash: rowHash(rowKey, parsed.headersDigest, hashes), cellHashes: hashes, locator, locators: record.locators,
        disposition: 'admitted', bindings: [{ instructionId: item.instructionId, cells, fidelity: { path: receiptPath, sha256: sha(receiptBytes) } }],
        resourceIds: [], mergedInto: null };
    });
    csvSources[csvPath] = { rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest, columns, rows };
    allowlist.push({ donor: 'uupm', path: csvPath, rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest });
  }
  for (const write of [...instructionWrites, ...receipts]) {
    await mkdir(dirname(join(root, write.path)), { recursive: true });
    await writeFile(join(root, write.path), write.bytes);
  }
  await writeFile(join(root, 'config', 'h2-csv-allowlist.json'), `${JSON.stringify(allowlist, null, 2)}\n`, 'utf8');
  await writeFile(join(root, 'catalog.json'), `${JSON.stringify({
    schema: 'VPCatalog/v1', catalog_id: 'sbvf-rehearsal', revision: 1, source_revision: head, updated_at: '2026-11-20',
    tag_dictionary: { capability: { 'fixture-state': 'Fixture capability.' }, pattern: { 'fixture-state': 'Fixture pattern.' } },
    tag_aliases: {}, tag_exemptions: [], instructions: catalogInstructions,
  }, null, 2)}\n`, 'utf8');
  await writeFile(join(root, 'corpus-map.json'), `${JSON.stringify({
    schema: 'VPCorpusMap/v2', revision: 1, updated_at: '2026-11-20',
    donors: { uupm: { source_revision: head, files: {}, csvSources } },
  }, null, 2)}\n`, 'utf8');
}
