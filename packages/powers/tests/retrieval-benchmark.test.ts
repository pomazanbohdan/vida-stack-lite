import { beforeAll, expect, test } from 'bun:test';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, loadInstructions } from '../skills/vp-mode/scripts/catalog.ts';
import type { LoadedInstruction } from '../skills/vp-mode/scripts/catalog.ts';
import { resolveIntent } from '../skills/vp-mode/scripts/retrieval.ts';

const here = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(here, '../catalog.json');

let instructions: Map<string, LoadedInstruction>;
let aliases: Map<string, string>;

beforeAll(async () => {
  const catalog = await loadCatalog(catalogPath);
  instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
  aliases = new Map(Object.entries(catalog.tag_aliases));
});

// Every phrase below comes from a recorded session or the owner's own request.
// A change to the resolver must not lose one of them.
const resolvedCases: Array<{ terms: string[]; expects: string }> = [
  { terms: ['diagnosis', 'intermittent', '500'], expects: 'debug-root-cause' },
  { terms: ['incident', 'troubleshooting', 'rca'], expects: 'debug-root-cause' },
  { terms: ['observability', 'alerting', 'error', 'rate'], expects: 'instrument-production-code' },
  { terms: ['monitoring', 'telemetry', 'production'], expects: 'instrument-production-code' },
  { terms: ['API', 'documentation', 'endpoint', 'contract'], expects: 'write-technical-prose' },
  { terms: ['readme', 'guide', 'docs'], expects: 'write-technical-prose' },
  { terms: ['completion', 'verification', 'acceptance'], expects: 'verify-work-results' },
  { terms: ['endpoint', 'deprecation', 'fix', 'decision'], expects: 'decide-on-deprecation' },
  { terms: ['legacy', 'endpoint', 'consumer', 'migration'], expects: 'migrate-consumers-off-the-old-system' },
  { terms: ['migrate', 'external', 'consumers', 'off', 'deprecated', 'endpoint'], expects: 'migrate-consumers-off-the-old-system' },
  { terms: ['pull', 'request', 'review', 'typescript'], expects: 'review-code' },
  { terms: ['architecture', 'improve'], expects: 'design-structure' },
  { terms: ['architectural', 'design', 'structure'], expects: 'design-structure' },
  { terms: ['module', 'boundaries', 'deep', 'modules'], expects: 'design-structure' },
  { terms: ['quality', 'bar', 'thresholds'], expects: 'define-quality-bar' },
  { terms: ['technical', 'debt', 'ledger'], expects: 'manage-technical-debt' },
  { terms: ['test', 'first', 'development'], expects: 'write-tests-first' },
  { terms: ['staged'], expects: 'staged-elicitation' },
  { terms: ['incremental', 'cutover'], expects: 'incremental-cutover' },
  { terms: ['argument', 'option', 'parser', 'flag'], expects: 'strict-argument-parsing' },
];

// A single generic action verb says "do something", not what. These must not
// resolve confidently; the session that produced them picked a wrong capability.
const weakCases: string[][] = [
  ['properly', 'handling', 'any', 'request'],
  ['algorithms', 'finding', 'solutions'],
];

const unresolvedCases: string[][] = [
  ['zzzznotatag'],
  ['process', 'pull', 'request', 'merge'],
];

test('keeps every recorded intent resolvable and confident', () => {
  const failures: string[] = [];
  for (const { terms, expects } of resolvedCases) {
    const result = resolveIntent(instructions, terms, aliases);
    const got = result.capability ?? result.pattern;
    if (result.status !== 'resolved' || got !== expects) failures.push(`${terms.join(' ')} -> ${result.status}:${String(got)}`);
  }
  expect(failures).toEqual([]);
});

test('flags a generic verb-only match as weak instead of confident', () => {
  const failures: string[] = [];
  for (const terms of weakCases) {
    const result = resolveIntent(instructions, terms, aliases);
    if (result.status !== 'weak') failures.push(`${terms.join(' ')} -> ${result.status}:${String(result.capability ?? result.pattern)}`);
  }
  expect(failures).toEqual([]);
});

test('keeps unmatchable intents unresolved', () => {
  const failures: string[] = [];
  for (const terms of unresolvedCases) {
    const result = resolveIntent(instructions, terms, aliases);
    if (result.status !== 'unresolved') failures.push(`${terms.join(' ')} -> ${result.status}:${String(result.capability ?? result.pattern)}`);
  }
  expect(failures).toEqual([]);
});

test('reports how many tags a natural phrase can reach through an alias', () => {
  const tags = new Set<string>();
  for (const instruction of instructions.values()) {
    for (const tag of instruction.capability_tags) tags.add(tag);
    for (const tag of instruction.pattern_tags) tags.add(tag);
  }
  const reachable = new Set<string>();
  for (const target of aliases.values()) if (tags.has(target)) reachable.add(target);
  expect(tags.size).toBeGreaterThan(0);
  expect(reachable.size).toBeGreaterThanOrEqual(8);
});
