/**
 * Open Knowledge Format v0.2 conformance check for the Vida Powers bundle.
 *
 * Bundle root: packages/powers/docs
 *
 * Checks the normative rules of OKF v0.2 (SPEC §11) plus the structural rules
 * this bundle relies on:
 *   1. Every non-reserved .md file has parseable YAML frontmatter.
 *   2. Every frontmatter has a non-empty `type`.
 *   3. Reserved filenames follow their dedicated structure: bundle-root
 *      index.md carries at most `okf_version`; every other index.md carries no
 *      frontmatter; log.md carries no frontmatter and uses ISO date headings.
 *   4. `sources[].resource` is present; `generated.by`/`verified[].by` follow
 *      the actor convention; `verified` entries carry `at`; `stale_after` and
 *      timestamps are ISO 8601 with an explicit UTC offset.
 *   5. Markdown links in bodies resolve inside the repository.
 *
 * Usage: bun packages/powers/tooling/check-okf.ts
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dir, '..', '..', '..');
const bundleRoot = path.join(repoRoot, 'packages', 'powers', 'docs');
const RESERVED = new Set(['index.md', 'log.md']);
const ACTOR = /^(?:[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*|human:[^\s]+|process:[^\s]+|team:[^\s]+)$/;
const ISO_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

type Frontmatter = { data: Record<string, unknown> | null; body: string; error?: string };

function readFrontmatter(file: string): Frontmatter {
  const text = readFileSync(file, 'utf8');
  if (!text.startsWith('---')) return { data: null, body: text, error: 'no frontmatter block' };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: null, body: text, error: 'unterminated frontmatter block' };
  const block = text.slice(text.indexOf('\n') + 1, end);
  try {
    const parsed = Bun.YAML.parse(block) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { data: null, body: text.slice(end + 4), error: 'frontmatter is not a mapping' };
    }
    return { data: parsed as Record<string, unknown>, body: text.slice(end + 4) };
  } catch (error) {
    return { data: null, body: text, error: `unparseable YAML: ${(error as Error).message}` };
  }
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const failures: string[] = [];
const warnings: string[] = [];
const files = walk(bundleRoot).sort();
const concepts: string[] = [];

for (const file of files) {
  const relative = path.relative(repoRoot, file).replaceAll('\\', '/');
  const name = path.basename(file);
  const front = readFrontmatter(file);

  if (RESERVED.has(name)) {
    if (front.error === 'no frontmatter block') {
      // expected for log.md and non-root index.md
    } else if (front.data) {
      const keys = Object.keys(front.data);
      const allowed = name === 'index.md' && path.dirname(file) === bundleRoot ? ['okf_version'] : [];
      const extra = keys.filter((key) => !allowed.includes(key));
      if (extra.length) failures.push(`${relative}: reserved file carries frontmatter keys ${extra.join(', ')}`);
      if (name === 'log.md' && front.data) failures.push(`${relative}: log.md must not carry frontmatter`);
    } else if (front.error) {
      failures.push(`${relative}: ${front.error}`);
    }
    if (name === 'log.md') {
      const dates = [...front.body.matchAll(/^## (\d{4}-\d{2}-\d{2})$/gm)].map((match) => match[1]!);
      if (dates.length === 0) failures.push(`${relative}: log.md has no ISO date headings`);
      const sorted = [...dates].sort().reverse();
      if (dates.join(',') !== sorted.join(',')) failures.push(`${relative}: log.md date headings are not newest first`);
    }
    if (name === 'index.md') {
      const sections = [...front.body.matchAll(/^# (.+)$/gm)].map((match) => match[1]!);
      if (sections.length === 0) failures.push(`${relative}: index.md has no grouping sections`);
    }
    continue;
  }

  concepts.push(relative);
  if (front.error) {
    failures.push(`${relative}: ${front.error}`);
    continue;
  }
  const data = front.data!;
  const type = data['type'];
  if (typeof type !== 'string' || type.trim() === '') {
    failures.push(`${relative}: missing non-empty 'type'`);
  }
  const sources = data['sources'];
  if (sources !== undefined) {
    if (!Array.isArray(sources)) failures.push(`${relative}: 'sources' must be a list`);
    else {
      for (const [index, entry] of sources.entries()) {
        const record = entry as Record<string, unknown>;
        if (!record || typeof record['resource'] !== 'string' || record['resource'].trim() === '') {
          failures.push(`${relative}: sources[${index}] has no 'resource'`);
        }
        if (record && record['author'] !== undefined && !ACTOR.test(String(record['author']))) {
          failures.push(`${relative}: sources[${index}].author '${String(record['author'])}' breaks the actor convention`);
        }
        if (record && record['last_modified'] !== undefined && !ISO_OFFSET.test(String(record['last_modified']))) {
          failures.push(`${relative}: sources[${index}].last_modified is not ISO 8601 with an explicit offset`);
        }
      }
    }
  }
  const generated = data['generated'];
  if (generated !== undefined) {
    const record = generated as Record<string, unknown>;
    if (!record || typeof record['by'] !== 'string' || !ACTOR.test(record['by'])) {
      failures.push(`${relative}: generated.by '${String(record?.['by'])}' breaks the actor convention`);
    }
    if (!record || typeof record['at'] !== 'string' || !ISO_OFFSET.test(record['at'])) {
      failures.push(`${relative}: generated.at is not ISO 8601 with an explicit offset`);
    }
  }
  const verified = data['verified'];
  if (verified !== undefined) {
    const list = Array.isArray(verified) ? verified : [verified];
    for (const [index, entry] of list.entries()) {
      const record = entry as Record<string, unknown>;
      if (!record || typeof record['by'] !== 'string' || !ACTOR.test(record['by'])) {
        failures.push(`${relative}: verified[${index}].by breaks the actor convention`);
      }
      if (!record || typeof record['at'] !== 'string' || !ISO_OFFSET.test(record['at'])) {
        failures.push(`${relative}: verified[${index}].at is not ISO 8601 with an explicit offset`);
      }
    }
  }
  const status = data['status'];
  if (status !== undefined && !['draft', 'stable', 'deprecated'].includes(String(status))) {
    failures.push(`${relative}: status '${String(status)}' is not draft|stable|deprecated`);
  }
  const staleAfter = data['stale_after'];
  if (staleAfter !== undefined && !ISO_OFFSET.test(String(staleAfter))) {
    failures.push(`${relative}: stale_after is not ISO 8601 with an explicit offset`);
  }

  for (const match of front.body.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1]!;
    if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
    const resolved = path.resolve(path.dirname(file), target.split('#')[0]!);
    if (!resolved.startsWith(repoRoot)) {
      failures.push(`${relative}: link '${target}' leaves the repository`);
      continue;
    }
    if (!existsSync(resolved)) failures.push(`${relative}: link '${target}' does not resolve`);
  }
}

const rootIndex = path.join(bundleRoot, 'index.md');
if (!existsSync(rootIndex)) failures.push('bundle root has no index.md');
else {
  const front = readFrontmatter(rootIndex);
  const version = front.data?.['okf_version'];
  if (version !== undefined && version !== '0.2') failures.push(`bundle index okf_version '${String(version)}' is not 0.2`);
  if (version === undefined) warnings.push('bundle root index.md does not declare okf_version');
}
if (!existsSync(path.join(bundleRoot, 'log.md'))) warnings.push('bundle has no log.md history file');

console.log(
  JSON.stringify(
    {
      bundle: path.relative(repoRoot, bundleRoot).replaceAll('\\', '/'),
      okf_version: '0.2',
      documents: files.map((file) => path.relative(repoRoot, file).replaceAll('\\', '/')),
      concepts: concepts.length,
      failures,
      warnings,
      evidence: 'frontmatter, reserved filenames and body links of the current worktree only',
    },
    null,
    2,
  ),
);
process.exitCode = failures.length ? 1 : 0;
