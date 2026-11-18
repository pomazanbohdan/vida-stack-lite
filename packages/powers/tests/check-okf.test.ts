import { afterEach, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptSource = join(packageRoot, 'scripts', 'check-okf.ts');
const definitionsSource = join(packageRoot, 'scripts', 'definitions.ts');
const tempRoots: string[] = [];

type OkfReport = {
  bundle: string;
  okf_version: string;
  documentCount: number;
  documents?: string[];
  concepts: number;
  failures: string[];
  warnings: string[];
  evidence: string;
};

function parseReport(stdout: string): OkfReport {
  return JSON.parse(stdout) as OkfReport;
}

async function fixture(): Promise<{ script: string; guide: string; documents: string[] }> {
  const root = await mkdtemp(join(tmpdir(), 'vp-okf-cli-'));
  tempRoots.push(root);
  const productRoot = join(root, 'packages', 'powers');
  const scripts = join(productRoot, 'scripts');
  const docs = join(productRoot, 'docs');
  await mkdir(scripts, { recursive: true });
  await mkdir(docs, { recursive: true });
  await copyFile(scriptSource, join(scripts, 'check-okf.ts'));
  await copyFile(definitionsSource, join(scripts, 'definitions.ts'));
  await writeFile(join(docs, 'index.md'), '---\nokf_version: "0.2"\n---\n\n# Index\n');
  await writeFile(join(docs, 'log.md'), '## 2026-01-02\n\n- newer\n\n## 2026-01-01\n\n- older\n');
  const guide = join(docs, 'guide.md');
  await writeFile(guide, '---\ntype: Guide\nsources:\n  - resource: packages/powers/docs/guide.md\ngenerated:\n  by: human:test\n  at: 2026-01-01T00:00:00Z\nverified:\n  - by: human:test\n    at: 2026-01-01T00:00:00Z\nstatus: stable\nstale_after: 2027-01-01T00:00:00Z\n---\n\n# Guide\n');
  return {
    script: join(scripts, 'check-okf.ts'),
    guide,
    documents: ['packages/powers/docs/guide.md', 'packages/powers/docs/index.md', 'packages/powers/docs/log.md'],
  };
}

function run(script: string, args: string[] = []) {
  return spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: 'utf8' });
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('check-okf prints documentCount by default, documents with --verbose, and keeps failure diagnostics', async () => {
  const current = await fixture();
  const compact = run(current.script);
  const verbose = run(current.script, ['--verbose']);
  expect(compact.status).toBe(0);
  expect(verbose.status).toBe(0);
  expect(compact.stderr).toBe('');
  expect(verbose.stderr).toBe('');

  const compactReport = parseReport(compact.stdout);
  const verboseReport = parseReport(verbose.stdout);
  expect(compactReport).not.toHaveProperty('documents');
  expect(compactReport.documentCount).toBe(3);
  expect(compactReport.documents).toBeUndefined();
  expect(verboseReport.documentCount).toBe(3);
  expect(verboseReport.documents).toEqual(current.documents);
  const verboseRest = { ...verboseReport };
  delete verboseRest.documents;
  expect(compactReport).toEqual(verboseRest);
  expect(compactReport).toMatchObject({
    bundle: 'packages/powers/docs',
    okf_version: '0.2',
    concepts: 1,
    failures: [],
    warnings: [],
  });

  await writeFile(current.guide, '# Guide\n');
  const failed = run(current.script);
  expect(failed.status).toBe(1);
  const failedReport = parseReport(failed.stdout);
  expect(failedReport.documentCount).toBe(3);
  expect(failedReport.failures).toHaveLength(1);
  expect(failedReport).not.toHaveProperty('documents');
});
