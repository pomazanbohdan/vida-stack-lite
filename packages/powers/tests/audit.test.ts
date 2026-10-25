import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildReport,
  parseAuditArgs,
  reportJson,
  renderReport,
  runAuditCli,
  startAuditCli,
  selectRows,
  specFiles,
  type AuditOptions,
} from '../scripts/audit.ts';
import {
  buildDonorIndex,
  carrierOf,
  fidelityReport,
  loadCorpus,
  loadDonorClones,
  mapReport,
  pairAgreementReport,
  pairsReport,
  pairTableRows,
  readDeclaredPairs,
  specsReport,
  tokenize,
} from '../scripts/audit-report.ts';

const temporaryRoots: string[] = [];
const revision = '1234567890123456789012345678901234567890';
const donorId = 'synthetic-donor';
const donorText = 'The synthetic donor source carries the normative rule.\n';

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function instruction(options: {
  id: string;
  body: string;
  patternTags?: string[];
  capabilityTags?: string[];
  excludes?: string[];
  requires?: string[];
  provenance?: string[];
  revision?: number;
}): string {
  const frontmatter = [
    `instruction_id: ${options.id}`,
    `title: ${options.id}`,
    'summary: A synthetic instruction for the audit tests.',
    'capability_tags:',
    ...(options.capabilityTags ?? ['write-tests-first']).map((tag) => `  - ${tag}`),
    'pattern_tags:',
    ...(options.patternTags ?? ['test-first-development']).map((tag) => `  - ${tag}`),
    'conditions_applies_when: A test applies.',
    'conditions_does_not_apply_when: A test does not apply.',
    'artifact_contract_output_type: test-suite',
    'artifact_contract_required_data:',
    '  - cases',
    'artifact_contract_verified_by: bun test',
    'compatibility_excludes:',
    ...(options.excludes ?? []).map((tag) => `  - ${tag}`),
    'compatibility_requires:',
    ...(options.requires ?? []).map((tag) => `  - ${tag}`),
    'provenance:',
    ...(options.provenance ?? [`donor=${donorId}; license=MIT; revision=${revision}; path=source.md`]).map((line) => `  - ${line}`),
    'status: active',
    `revision: ${options.revision ?? 1}`,
  ];
  return `---\n${frontmatter.join('\n')}\n---\n\n${options.body}\n`;
}

type MapFile = { status: string; instruction_ids?: string[]; contributed_sources?: string[]; reason?: string };

function corpusMap(files: Record<string, MapFile>): unknown {
  return {
    schema: 'VPCorpusMap/v1', revision: 1, updated_at: '2026-10-21',
    donors: { [donorId]: { source_revision: revision, files } },
  };
}

type Fixture = { root: string };

async function fixture(instructions: string[], map?: unknown): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'vp-audit-'));
  temporaryRoots.push(root);
  await mkdir(join(root, 'instructions'), { recursive: true });
  for (const [index, text] of instructions.entries()) {
    await writeFile(join(root, 'instructions', `instruction-${index}.md`), text);
  }
  await writeFile(join(root, 'catalog.json'), JSON.stringify({
    schema: 'VPCatalog/v1', catalog_id: 'synthetic', revision: 1, source_revision: revision, updated_at: '2026-10-21',
    tag_dictionary: { capability: { 'write-tests-first': 'Write tests first.' }, pattern: { 'test-first-development': 'Use test first.' } },
    tag_aliases: {}, tag_exemptions: [], instructions: [],
  }));
  await writeFile(join(root, 'corpus-map.json'), JSON.stringify(map ?? corpusMap({
    'source.md': { status: 'converted', instruction_ids: ['instruction-0'] },
  })));
  await writeFile(join(root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    head_sha: '${revision}'\n    license: MIT\n`);
  await mkdir(join(root, '.tmp', 'donors', 'synthetic'), { recursive: true });
  await writeFile(join(root, '.tmp', 'donors', 'synthetic', 'source.md'), donorText);
  return { root };
}

function options(overrides: Partial<AuditOptions> = {}): AuditOptions {
  return {
    command: 'map', root: process.cwd(), limit: 20, offset: 0, filter: undefined,
    summary: false, all: false, json: false, out: undefined, instruction: undefined,
    specs: [], specDirs: [], ...overrides,
  };
}

describe('argument parsing', () => {
  test('reads every option', () => {
    const parsed = parseAuditArgs([
      'map', '--root', 'C:/corpus', '--limit', '5', '--offset', '2', '--filter', 'alpha',
      '--summary', '--all', '--json', '--out', 'report.txt', '--instruction', 'alpha-instruction',
      '--spec', 'a.json', '--spec-dir', 'specs',
    ]);
    expect(parsed).toMatchObject({
      command: 'map', root: 'C:/corpus', limit: 5, offset: 2, filter: 'alpha',
      summary: true, all: true, json: true, out: 'report.txt', instruction: 'alpha-instruction',
      specs: ['a.json'], specDirs: ['specs'],
    });
  });

  test('rejects an unknown command', () => {
    expect(() => parseAuditArgs(['nope'])).toThrow('AUDIT_ARGUMENT_INVALID');
  });

  test('rejects an unknown flag', () => {
    expect(() => parseAuditArgs(['map', '--wrong'])).toThrow('AUDIT_ARGUMENT_INVALID');
  });

  test('rejects a flag without a value', () => {
    expect(() => parseAuditArgs(['map', '--limit'])).toThrow('AUDIT_ARGUMENT_INVALID');
    expect(() => parseAuditArgs(['map', '--limit', '--all'])).toThrow('AUDIT_ARGUMENT_INVALID');
  });

  test('rejects a non-numeric limit', () => {
    expect(() => parseAuditArgs(['map', '--limit', 'many'])).toThrow('AUDIT_ARGUMENT_INVALID');
  });
});

describe('row selection', () => {
  const rows = ['alpha one', 'beta two', 'gamma three', 'alpha four'];

  test('limits the rows', () => {
    expect(selectRows(rows, options({ limit: 2 })).rows).toEqual(['alpha one', 'beta two']);
  });

  test('counts the hidden rows', () => {
    expect(selectRows(rows, options({ limit: 2 })).hidden).toBe(2);
  });

  test('offsets the window', () => {
    expect(selectRows(rows, options({ limit: 2, offset: 1 })).rows).toEqual(['beta two', 'gamma three']);
  });

  test('filters the rows case-insensitively', () => {
    expect(selectRows(rows, options({ filter: 'ALPHA' })).rows).toEqual(['alpha one', 'alpha four']);
  });

  test('returns every row with all', () => {
    expect(selectRows(rows, options({ all: true })).rows).toEqual(rows);
  });
});

describe('the map report', () => {
  test('reports nothing when the map and the provenance agree', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.filter((section) => section.kind === 'finding').flatMap((section) => section.rows)).toEqual([]);
    expect(report.counters.find((counter) => counter.label === 'findings')?.value).toBe('0');
  });

  test('reports a claim that the map does not record', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })], corpusMap({}));
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'claim-without-record')?.rows)
      .toEqual([`${donorId}::source.md -> instruction-0`]);
  });

  test('ignores a provenance line that carries no source', async () => {
    const corpus = await fixture([instruction({
      id: 'instruction-0', body: 'A body.',
      provenance: ['not a provenance line', `donor=${donorId}; license=MIT; revision=${revision}; path=source.md`],
    })], corpusMap({}));
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.counters.find((counter) => counter.label === 'provenance claims')?.value).toBe('1');
  });

  test('reports a map record that no provenance names', async () => {
    const corpus = await fixture(
      [instruction({ id: 'instruction-0', body: 'A body.', provenance: [`donor=${donorId}; license=MIT; revision=${revision}; path=other.md`] })],
      corpusMap({ 'source.md': { status: 'converted', instruction_ids: ['instruction-0'] } }),
    );
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'record-without-claim')?.rows)
      .toEqual([`${donorId}::source.md -> instruction-0`]);
  });

  test('reports a claim that the map record does not list', async () => {
    const corpus = await fixture(
      [instruction({ id: 'instruction-0', body: 'A body.' })],
      corpusMap({ 'source.md': { status: 'converted', instruction_ids: ['another-instruction'] } }),
    );
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'claim-missing-from-record')?.rows)
      .toEqual([`${donorId}::source.md -> instruction-0`]);
  });

  test('reports a rejected record that a provenance cites', async () => {
    const corpus = await fixture(
      [instruction({ id: 'instruction-0', body: 'A body.' })],
      corpusMap({ 'source.md': { status: 'rejected', reason: 'not methodology' } }),
    );
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'rejected-but-cited')?.rows)
      .toEqual([`${donorId}::source.md -> instruction-0`]);
  });

  test('reports a merged record whose target is unknown', async () => {
    const corpus = await fixture(
      [instruction({ id: 'instruction-0', body: 'A body.' })],
      corpusMap({ 'source.md': { status: 'merged', instruction_ids: ['other'], contributed_sources: [`${donorId}:source.md`] } }),
    );
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'merged-source-mismatch')?.rows)
      .toEqual([`${donorId}::source.md -> target other is unknown`]);
  });

  test('reports a merged record whose contributing source is not carried', async () => {
    const corpus = await fixture(
      [instruction({ id: 'instruction-0', body: 'A body.' })],
      corpusMap({ 'source.md': { status: 'merged', instruction_ids: ['instruction-0'], contributed_sources: [`${donorId}:other.md`] } }),
    );
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'merged-source-mismatch')?.rows)
      .toEqual([`${donorId}::source.md -> ${donorId}::other.md`]);
  });

  test('counts the findings', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })], corpusMap({}));
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.counters.find((counter) => counter.label === 'findings')?.value).toBe('1');
  });
});

describe('the pairs report', () => {
  test('reports a mutual pair with its shared theme', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'] }),
    ]);
    const report = pairsReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'pair')?.rows)
      .toEqual(['mutual instruction-0 <-> instruction-1 | shared: test-first-development(2)']);
    expect(report.sections.find((section) => section.name === 'one-way')?.rows).toEqual([]);
    expect(report.counters.find((counter) => counter.label === 'mutual pairs')?.value).toBe('1');
  });

  test('reports a one-way exclusion', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'] }),
      instruction({ id: 'instruction-1', body: 'A body.' }),
    ]);
    const report = pairsReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'one-way')?.rows)
      .toEqual(['instruction-0 <-> instruction-1']);
  });

  test('reports a pair without a shared theme', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'], patternTags: ['test-first-development'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'], patternTags: ['another-theme'] }),
    ]);
    const report = pairsReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'without-theme-tag')?.rows)
      .toEqual(['instruction-0 <-> instruction-1']);
  });

  test('orders several pairs', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-2', 'instruction-1'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'] }),
      instruction({ id: 'instruction-2', body: 'A body.', excludes: ['instruction-0'] }),
    ]);
    const report = pairsReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'pair')?.rows.map((row) => row.split(' ')[1]))
      .toEqual(['instruction-0', 'instruction-0']);
  });

  test('reports a pair that shares no pattern tag', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'], patternTags: ['test-first-development'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'], patternTags: ['another-theme'] }),
    ]);
    const report = pairsReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'without-theme-tag')?.rows)
      .toEqual(['instruction-0 <-> instruction-1']);
  });
});

describe('the donor index', () => {
  test('finds the file that carries a probe', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const index = buildDonorIndex(loadDonorClones(corpus.root));
    expect(carrierOf(index, 'synthetic donor source carries the normative')).toEqual({ donor: donorId, path: 'source.md' });
  });

  test('does not find a probe that no donor carries', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const index = buildDonorIndex(loadDonorClones(corpus.root));
    expect(carrierOf(index, 'a sentence nobody wrote')).toBeUndefined();
  });

  test('does not find a probe whose words are in the donor but not in one place', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const index = buildDonorIndex(loadDonorClones(corpus.root));
    expect(carrierOf(index, 'the normative source')).toBeUndefined();
  });

  test('finds a probe that starts at the rarest word of the probe', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await writeFile(join(corpus.root, '.tmp', 'donors', 'synthetic', 'second.md'), 'one two rareword four five\n');
    const index = buildDonorIndex(loadDonorClones(corpus.root));
    expect(carrierOf(index, 'one two rareword four five')).toEqual({ donor: donorId, path: 'second.md' });
  });

  test('searches every candidate file of a token', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await writeFile(join(corpus.root, '.tmp', 'donors', 'synthetic', 'other.md'), 'the normative rule\n');
    await writeFile(join(corpus.root, '.tmp', 'donors', 'synthetic', 'third.md'), 'the normative\n');
    const index = buildDonorIndex(loadDonorClones(corpus.root));
    expect(carrierOf(index, 'the normative rule')).toEqual({ donor: donorId, path: 'other.md' });
  });

  test('does not find an empty probe', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const index = buildDonorIndex(loadDonorClones(corpus.root));
    expect(carrierOf(index, '')).toBeUndefined();
  });

  test('indexes only the donors that are named', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const index = buildDonorIndex(loadDonorClones(corpus.root), new Set(['other-donor']));
    expect(index.files).toHaveLength(0);
  });

  test('indexes several donors in a stable order', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await writeFile(join(corpus.root, 'donors.yaml'), `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: ${donorId}\n    local_path: synthetic\n    head_sha: '${revision}'\n    license: MIT\n  - id: another-donor\n    local_path: another\n    head_sha: '${revision}'\n    license: MIT\n`);
    await mkdir(join(corpus.root, '.tmp', 'donors', 'another'), { recursive: true });
    await writeFile(join(corpus.root, '.tmp', 'donors', 'another', 'source.md'), 'another donor carries its own rule.\n');
    const index = buildDonorIndex(loadDonorClones(corpus.root));
    expect(index.files.map((file) => file.donor)).toEqual(['another-donor', donorId]);
    expect(carrierOf(index, 'another donor carries its own')).toEqual({ donor: 'another-donor', path: 'source.md' });
  });

  test('indexes a donor file in a subdirectory', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await mkdir(join(corpus.root, '.tmp', 'donors', 'synthetic', 'skills'), { recursive: true });
    await writeFile(join(corpus.root, '.tmp', 'donors', 'synthetic', 'skills', 'nested.md'), 'nested donor text\n');
    const clones = loadDonorClones(corpus.root);
    expect(clones.donors.get('synthetic-donor')?.paths).toHaveLength(2);
  });

  test('reports a missing donor manifest', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await rm(join(corpus.root, 'donors.yaml'));
    expect(loadDonorClones(corpus.root).available).toBe(false);
  });

  test('reports a donor manifest that is not an object', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await writeFile(join(corpus.root, 'donors.yaml'), '- not an object\n');
    expect(loadDonorClones(corpus.root).available).toBe(false);
  });

  test('reports a manifest without a pinned clone', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await rm(join(corpus.root, '.tmp', 'donors', 'synthetic'), { recursive: true, force: true });
    expect(loadDonorClones(corpus.root).available).toBe(false);
  });
});

describe('the fidelity report', () => {
  test('reports a line that the donor does not carry', async () => {
    const corpus = await fixture([instruction({
      id: 'instruction-0',
      body: '# Heading\n\nA line that the pinned donor never carried.\n\nThe synthetic donor source carries the normative rule.',
    })]);
    const report = fidelityReport(loadCorpus(corpus.root), loadDonorClones(corpus.root));
    expect(report.sections.find((section) => section.name === 'divergent-line')?.rows).toHaveLength(1);
    expect(report.counters.find((counter) => counter.label === 'token-faithful')?.value).toBe('1');
  });

  test('limits the report to one instruction', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A line that the pinned donor never carried.' }),
      instruction({ id: 'instruction-1', body: 'Another line that the pinned donor never carried.' }),
    ]);
    const report = fidelityReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), 'instruction-1');
    expect(report.sections.find((section) => section.name === 'divergent-line')?.rows).toHaveLength(1);
    expect(report.sections.find((section) => section.name === 'divergent-line')?.rows[0]).toContain('instruction-1');
  });

  test('reports the missing clones', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await rm(join(corpus.root, 'donors.yaml'));
    const report = fidelityReport(loadCorpus(corpus.root), loadDonorClones(corpus.root));
    expect(report.counters.find((counter) => counter.label === 'donor clones')?.value).toBe('unavailable');
    expect(report.counters.find((counter) => counter.label === 'findings')?.value).toBe('0');
  });
});

describe('the specs report', () => {
  const spec = {
    instruction_id: 'instruction-0',
    title: 'instruction-0',
    summary: 'A synthetic instruction for the audit tests.',
    capability_tags: ['write-tests-first'], pattern_tags: ['test-first-development'],
    roles: [], products: [],
    conditions_applies_when: 'A test applies.', conditions_does_not_apply_when: 'A test does not apply.',
    artifact_contract_output_type: 'test-suite', artifact_contract_required_data: ['cases'],
    artifact_contract_verified_by: 'bun test', compatibility_excludes: [], compatibility_requires: [],
    provenance: [{ donor: donorId, license: 'MIT', revision, path: 'source.md' }],
    status: 'active', revision: 2, body: '# instruction-0\n\nThe synthetic donor source carries the normative rule.',
  };

  async function specFixture(overrides: Record<string, unknown> = {}): Promise<{ root: string; file: string }> {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const file = join(corpus.root, 'spec.json');
    await writeFile(file, JSON.stringify({ ...spec, ...overrides }));
    return { root: corpus.root, file };
  }

  test('accepts a specification that fits the corpus', async () => {
    const corpus = await specFixture();
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows).toEqual([]);
    expect(report.sections.find((section) => section.name === 'accepted')?.rows).toHaveLength(1);
  });

  test('reports a specification that is not valid JSON', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const file = join(corpus.root, 'broken.json');
    await writeFile(file, '{ not json');
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows[0]).toContain('not valid JSON');
  });

  test('reports a specification that the converter would reject', async () => {
    const corpus = await specFixture({ capability_tags: ['Not A Tag'] });
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).toContain('capability_tags');
  });

  test('reports an H1 that does not carry the title', async () => {
    const corpus = await specFixture({ body: '# A different title\n\nThe synthetic donor source carries the normative rule.' });
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).toContain('the H1 does not carry the title');
  });

  test('reports a revision that does not follow the corpus', async () => {
    const corpus = await specFixture({ revision: 5 });
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).toContain('does not follow');
  });

  test('reports an unknown tag', async () => {
    const corpus = await specFixture({ pattern_tags: ['not-a-known-theme'] });
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).toContain('unknown tag');
  });

  test('reports an unknown compatibility target', async () => {
    const corpus = await specFixture({ compatibility_excludes: ['nowhere'] });
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).toContain('unknown compatibility target');
  });

  test('reports a donor without a pinned clone', async () => {
    const corpus = await specFixture({ provenance: [{ donor: 'other-donor', license: 'MIT', revision, path: 'source.md' }] });
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).toContain('has no pinned clone');
  });

  test('reports a donor path that the clone does not hold', async () => {
    const corpus = await specFixture({ provenance: [{ donor: donorId, license: 'MIT', revision, path: 'nowhere.md' }] });
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).toContain('is not in the pinned clone');
  });

  test('accepts a donor path that the clone holds in a subdirectory', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await mkdir(join(corpus.root, '.tmp', 'donors', 'synthetic', 'skills'), { recursive: true });
    await writeFile(join(corpus.root, '.tmp', 'donors', 'synthetic', 'skills', 'nested.md'), 'nested donor text\n');
    const file = join(corpus.root, 'spec.json');
    await writeFile(file, JSON.stringify({
      instruction_id: 'instruction-0', title: 'instruction-0', summary: 'A synthetic instruction for the audit tests.',
      capability_tags: ['write-tests-first'], pattern_tags: ['test-first-development'], roles: [], products: [],
      conditions_applies_when: 'A test applies.', conditions_does_not_apply_when: 'A test does not apply.',
      artifact_contract_output_type: 'test-suite', artifact_contract_required_data: ['cases'],
      artifact_contract_verified_by: 'bun test', compatibility_excludes: [], compatibility_requires: [],
      provenance: [{ donor: donorId, license: 'MIT', revision, path: 'skills/nested.md' }],
      status: 'active', revision: 2, body: '# instruction-0\n\nThe synthetic donor source carries the normative rule.',
    }));
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).not.toContain('is not in the pinned clone');
  });

  test('reports a body line that is not the donor text', async () => {
    const corpus = await specFixture({ body: '# instruction-0\n\nA sentence that the pinned donor never carried.' });
    const report = specsReport(loadCorpus(corpus.root), loadDonorClones(corpus.root), [corpus.file]);
    expect(report.sections.find((section) => section.name === 'problem')?.rows.join()).toContain('is not the donor');
  });
});

describe('the pair agreement report', () => {
  const record = (rows: string[]): string => [
    '# Decision',
    '',
    '| Pair | Shared tags |',
    '|---|---|',
    ...rows,
    '',
  ].join('\n');

  test('reads the pairs the record lists', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const file = join(corpus.root, 'D12.md');
    await writeFile(file, record(['| `instruction-0` ↔ `instruction-1` | `theme-tag`, `topic-tag` |']));
    expect(readDeclaredPairs(file)).toEqual([
      { a: 'instruction-0', b: 'instruction-1', theme: ['theme-tag', 'topic-tag'] },
    ]);
  });

  test('reports a pair the record does not list', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'] }),
    ]);
    const file = join(corpus.root, 'D12.md');
    await writeFile(file, record([]));
    const report = pairAgreementReport(loadCorpus(corpus.root), file);
    expect(report.sections.find((section) => section.name === 'declared-but-not-listed')?.rows)
      .toEqual(['instruction-0 <-> instruction-1']);
  });

  test('reports a pair the record lists but the corpus does not declare', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const file = join(corpus.root, 'D12.md');
    await writeFile(file, record(['| `instruction-0` ↔ `instruction-9` | `theme-tag` |']));
    const report = pairAgreementReport(loadCorpus(corpus.root), file);
    expect(report.sections.find((section) => section.name === 'listed-but-not-declared')?.rows)
      .toEqual(['instruction-0 <-> instruction-9']);
  });

  test('reports a theme tag the sides do not share', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'], patternTags: ['test-first-development'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'], patternTags: ['test-first-development'] }),
    ]);
    const file = join(corpus.root, 'D12.md');
    await writeFile(file, record(['| `instruction-0` ↔ `instruction-1` | `a-theme-the-sides-do-not-share` |']));
    const report = pairAgreementReport(loadCorpus(corpus.root), file);
    expect(report.sections.find((section) => section.name === 'theme-not-shared')?.rows.join())
      .toContain('a-theme-the-sides-do-not-share');
  });

  test('reports a merged record whose source the target does not carry', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })], {
      schema: 'VPCorpusMap/v1', revision: 1, updated_at: '2026-10-21',
      donors: {
        [donorId]: {
          source_revision: revision,
          files: {
            'source.md': { status: 'merged', instruction_ids: ['instruction-0'], contributed_sources: ['other.md'] },
          },
        },
      },
    });
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'merged-source-mismatch')?.rows.join())
      .toContain('other.md');
  });

  test('accepts a merged record whose source the target carries under another donor', async () => {
    const corpus = await fixture([
      instruction({
        id: 'instruction-0',
        body: 'A body.',
        provenance: [`donor=other-donor; license=MIT; revision=${revision}; path=source.md`],
      }),
    ], {
      schema: 'VPCorpusMap/v1', revision: 1, updated_at: '2026-10-21',
      donors: {
        [donorId]: {
          source_revision: revision,
          files: {
            'source.md': { status: 'merged', instruction_ids: ['instruction-0'], contributed_sources: ['other-donor:source.md'] },
          },
        },
      },
    });
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'merged-source-mismatch')?.rows).toEqual([]);
  });

  test('reports a merged record whose target is unknown', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })], {
      schema: 'VPCorpusMap/v1', revision: 1, updated_at: '2026-10-21',
      donors: {
        [donorId]: {
          source_revision: revision,
          files: {
            'source.md': { status: 'merged', instruction_ids: ['nowhere'], contributed_sources: ['source.md'] },
          },
        },
      },
    });
    const report = mapReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'merged-source-mismatch')?.rows.join())
      .toContain('target nowhere is unknown');
  });

  test('orders several pairs', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-2'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-3'] }),
      instruction({ id: 'instruction-2', body: 'A body.', excludes: ['instruction-0'] }),
      instruction({ id: 'instruction-3', body: 'A body.', excludes: ['instruction-1'] }),
    ]);
    const report = pairsReport(loadCorpus(corpus.root));
    expect(report.sections.find((section) => section.name === 'pair')?.rows.map((row) => row.split(' ')[1]))
      .toEqual(['instruction-0', 'instruction-1']);
  });

  test('reports nothing when the record and the corpus agree', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'], patternTags: ['test-first-development'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'], patternTags: ['test-first-development'] }),
    ]);
    const file = join(corpus.root, 'D12.md');
    await writeFile(file, record(['| `instruction-0` ↔ `instruction-1` | `test-first-development` |']));
    const report = pairAgreementReport(loadCorpus(corpus.root), file);
    expect(report.counters.find((counter) => counter.label === 'findings')?.value).toBe('0');
  });
});

describe('the pair table', () => {
  test('lists every declared pair with the theme tag first', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'], patternTags: ['test-first-development'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'], patternTags: ['test-first-development'] }),
      instruction({ id: 'instruction-2', body: 'A body.', patternTags: ['a-topic-tag'] }),
    ]);
    const rows = pairTableRows(loadCorpus(corpus.root));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBe('| `instruction-0` ↔ `instruction-1` | `test-first-development` |');
  });

  test('orders the pair by the first instruction id', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-2', body: 'A body.', excludes: ['instruction-0'] }),
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-2'] }),
    ]);
    const rows = pairTableRows(loadCorpus(corpus.root));
    expect(rows[0]).toContain('`instruction-0` ↔ `instruction-2`');
  });

  test('orders several pairs', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-2'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-3'] }),
      instruction({ id: 'instruction-2', body: 'A body.', excludes: ['instruction-0'] }),
      instruction({ id: 'instruction-3', body: 'A body.', excludes: ['instruction-1'] }),
    ]);
    const rows = pairTableRows(loadCorpus(corpus.root));
    expect(rows.map((row) => row.split('`')[1])).toEqual(['instruction-0', 'instruction-1']);
  });

  test('lists the tag carried by fewer instructions first', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'], patternTags: ['test-first-development', 'a-topic-tag'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'], patternTags: ['test-first-development', 'a-topic-tag'] }),
      instruction({ id: 'instruction-2', body: 'A body.', patternTags: ['a-topic-tag'] }),
    ]);
    const rows = pairTableRows(loadCorpus(corpus.root));
    expect(rows[0]).toBe('| `instruction-0` ↔ `instruction-1` | `test-first-development`, `a-topic-tag` |');
  });

  test('orders two tags of the same carrier count by name', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'], patternTags: ['zebra-tag', 'alpha-tag'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'], patternTags: ['zebra-tag', 'alpha-tag'] }),
    ]);
    const rows = pairTableRows(loadCorpus(corpus.root));
    expect(rows[0]).toBe('| `instruction-0` ↔ `instruction-1` | `alpha-tag`, `zebra-tag` |');
  });
});

describe('rendering', () => {
  const report = {
    command: 'map' as const,
    counters: [{ label: 'instructions', value: '2' }],
    sections: [{ name: 'finding', kind: 'finding' as const, rows: ['one', 'two', 'three'] }],
  };

  test('prints the counters and the rows', () => {
    const text = renderReport(report, options({ limit: 2 }));
    expect(text).toContain('  instructions: 2');
    expect(text).toContain('    one');
    expect(text).toContain('... 1 more rows');
  });

  test('prints the counters only in the summary', () => {
    const text = renderReport(report, options({ summary: true }));
    expect(text).toContain('  instructions: 2');
    expect(text).not.toContain('sections:');
  });

  test('prints the report as JSON', () => {
    const value = JSON.parse(reportJson(report, options({ limit: 1 })));
    expect(value.command).toBe('map');
    expect(value.sections[0].total).toBe(3);
    expect(value.sections[0].rows).toEqual(['one']);
  });

  test('prints no sections in the JSON summary', () => {
    expect(JSON.parse(reportJson(report, options({ summary: true }))).sections).toEqual([]);
  });
});

describe('the CLI', () => {
  test('writes the report of a command', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = runAuditCli(['map', '--root', corpus.root], {
      stdout: (text) => stdout.push(text), stderr: (text) => stderr.push(text),
    });
    expect(code).toBe(0);
    expect(stdout.join('')).toContain('== audit map ==');
    expect(stderr).toEqual([]);
  });

  test('writes the full report to a file and keeps the terminal short', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const stdout: string[] = [];
    const code = runAuditCli(['map', '--root', corpus.root, '--out', 'report.txt'], {
      stdout: (text) => stdout.push(text), stderr: () => {},
    });
    expect(code).toBe(0);
    const written = await Bun.file(join(corpus.root, 'report.txt')).text();
    expect(written).toContain('sections:');
    expect(stdout.join('')).not.toContain('sections:');
  });

  test('writes the report as JSON', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const stdout: string[] = [];
    runAuditCli(['map', '--root', corpus.root, '--json'], {
      stdout: (text) => stdout.push(text), stderr: () => {},
    });
    expect(JSON.parse(stdout.join('')).command).toBe('map');
  });

  test('writes the JSON report to a file', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    runAuditCli(['map', '--root', corpus.root, '--json', '--out', 'report.json'], {
      stdout: () => {}, stderr: () => {},
    });
    const written = await Bun.file(join(corpus.root, 'report.json')).text();
    expect(JSON.parse(written).command).toBe('map');
  });

  test('reports an invalid argument on stderr', () => {
    const stderr: string[] = [];
    const code = runAuditCli(['nope'], { stdout: () => {}, stderr: (text) => stderr.push(text) });
    expect(code).toBe(1);
    expect(stderr.join('')).toContain('AUDIT_ARGUMENT_INVALID');
  });

  test('writes the report of the pairs command', async () => {
    const corpus = await fixture([
      instruction({ id: 'instruction-0', body: 'A body.', excludes: ['instruction-1'] }),
      instruction({ id: 'instruction-1', body: 'A body.', excludes: ['instruction-0'] }),
    ]);
    const stdout: string[] = [];
    expect(runAuditCli(['pairs', '--root', corpus.root], {
      stdout: (text) => stdout.push(text), stderr: () => {},
    })).toBe(0);
    expect(stdout.join('')).toContain('== audit pairs ==');
    expect(stdout.join('')).toContain('mutual instruction-0 <-> instruction-1');
  });

  test('writes the report of the fidelity command', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A line that the pinned donor never carried.' })]);
    const stdout: string[] = [];
    expect(runAuditCli(['fidelity', '--root', corpus.root], {
      stdout: (text) => stdout.push(text), stderr: () => {},
    })).toBe(0);
    expect(stdout.join('')).toContain('== audit fidelity ==');
    expect(stdout.join('')).toContain('divergent-line');
  });

  test('writes the report of the pair-agreement command', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await mkdir(join(corpus.root, 'docs', 'decisions'), { recursive: true });
    await writeFile(join(corpus.root, 'docs', 'decisions', 'D12-declared-conflicts.md'), '# Decision\n\n| Pair | Shared tags |\n|---|---|\n');
    const stdout: string[] = [];
    expect(runAuditCli(['pair-agreement', '--root', corpus.root], {
      stdout: (text) => stdout.push(text), stderr: () => {},
    })).toBe(0);
    expect(stdout.join('')).toContain('== audit pair-agreement ==');
  });

  test('writes the report of the pair-table command', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    const stdout: string[] = [];
    expect(runAuditCli(['pair-table', '--root', corpus.root], {
      stdout: (text) => stdout.push(text), stderr: () => {},
    })).toBe(0);
    expect(stdout.join('')).toContain('== audit pair-table ==');
  });

  test('writes the report of the specs command', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await writeFile(join(corpus.root, 'spec.json'), JSON.stringify({
      instruction_id: 'instruction-0', title: 'instruction-0', summary: 'A synthetic instruction for the audit tests.',
      capability_tags: ['write-tests-first'], pattern_tags: ['test-first-development'], roles: [], products: [],
      conditions_applies_when: 'A test applies.', conditions_does_not_apply_when: 'A test does not apply.',
      artifact_contract_output_type: 'test-suite', artifact_contract_required_data: ['cases'],
      artifact_contract_verified_by: 'bun test', compatibility_excludes: [], compatibility_requires: [],
      provenance: [{ donor: donorId, license: 'MIT', revision, path: 'source.md' }],
      status: 'active', revision: 2, body: '# instruction-0\n\nThe synthetic donor source carries the normative rule.',
    }));
    const stdout: string[] = [];
    expect(runAuditCli(['specs', '--root', corpus.root, '--spec', 'spec.json'], {
      stdout: (text) => stdout.push(text), stderr: () => {},
    })).toBe(0);
    expect(stdout.join('')).toContain('== audit specs ==');
  });

  test('requires a specification for the specs command', () => {
    expect(() => buildReport(options({ command: 'specs' }))).toThrow('needs at least one');
  });

  test('collects the specifications of a directory', async () => {
    const corpus = await fixture([instruction({ id: 'instruction-0', body: 'A body.' })]);
    await mkdir(join(corpus.root, 'specs'), { recursive: true });
    await writeFile(join(corpus.root, 'specs', 'a.json'), '{}');
    await writeFile(join(corpus.root, 'specs', 'b.json'), '{}');
    await writeFile(join(corpus.root, 'specs', 'c.txt'), '{}');
    const files = specFiles(options({ root: corpus.root, specDirs: ['specs'] }));
    expect(files.map((file) => file.split(/[\\/]/).pop())).toEqual(['a.json', 'b.json']);
  });

  test('names the tokens of a line', () => {
    expect(tokenize('Write the Tests, first!')).toEqual(['write', 'the', 'tests', 'first']);
  });
});

test('the audit native entry adapter isolates imports and forwards real command outcomes', async () => {
  const corpus = await fixture([instruction({ id: 'entry-rule', body: 'A body.' })]);
  const script = fileURLToPath(new URL('../scripts/audit.ts', import.meta.url));
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exits: number[] = [];
  const output = { stdout: (text: string) => stdout.push(text), stderr: (text: string) => stderr.push(text) };
  expect(startAuditCli([process.execPath], output, code => exits.push(code))).toBeUndefined();
  expect(startAuditCli([process.execPath, join(corpus.root, 'unrelated.ts')], output, code => exits.push(code))).toBeUndefined();
  expect(exits).toEqual([]);
  expect(startAuditCli([process.execPath, script, 'map', '--root', corpus.root, '--json'], output, code => exits.push(code))).toBe(0);
  expect(exits).toEqual([0]);
  expect(JSON.parse(stdout.join('')).command).toBe('map');
  expect(stderr).toEqual([]);
  const previous = process.exitCode;
  try {
    expect(startAuditCli([process.execPath, script, 'map', '--unsupported', 'value'], output)).toBe(1);
    expect(process.exitCode).toBe(1);
    expect(stderr.join('')).toContain('unknown flag --unsupported');
  } finally { process.exitCode = previous ?? 0; }
});

test('donor manifests resolve repository-relative carrier roots exactly', async () => {
  const corpus = await fixture([]);
  const packageRoot = join(corpus.root, 'packages', 'powers');
  const content = join(packageRoot, 'donors', 'fixture', 'guides');
  await mkdir(content, { recursive: true });
  await writeFile(join(content, 'rule.md'), 'Pinned source.\n');
  await writeFile(join(packageRoot, 'donors.yaml'), JSON.stringify({ local_root: 'packages/powers/donors', donors: [{ id: 'fixture', local_path: 'fixture', content_path: 'guides' }] }));
  const result = loadDonorClones(packageRoot);
  expect(result.available).toBe(true);
  const clone = result.donors.get('fixture');
  if (clone === undefined) throw new Error('Fixture clone was not resolved');
  expect(clone.contentRoot).toBe(content);
  expect([...clone.relativePaths]).toEqual(['rule.md']);
});
