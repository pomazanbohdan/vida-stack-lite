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
  { terms: ['request', 'intake', 'triage', 'requirement', 'clarification'], expects: 'triage-reports' },
  { terms: ['decision', 'search', 'options', 'tradeoff', 'algorithm'], expects: 'keep-decision-trail' },
  { terms: ['find', 'root', 'cause', 'evaluate', 'candidate', 'solutions'], expects: 'debug-root-cause' },
  { terms: ['500', 'error', 'incident', 'diagnosis'], expects: 'debug-root-cause' },
  { terms: ['external', 'consumer', 'migration', 'API'], expects: 'migrate-consumers-off-the-old-system' },
  { terms: ['verify', 'completion', 'acceptance'], expects: 'verify-work-results' },
  { terms: ['agent', 'skill', 'instructions', 'authoring'], expects: 'author-agent-instructions' },
  { terms: ['requirements', 'clarifying', 'questions'], expects: 'clarify-requirements' },
  { terms: ['technical', 'debt', 'review', 'cadence'], expects: 'manage-technical-debt' },
  { terms: ['quality', 'bar', 'floor', 'ratchet'], expects: 'define-quality-bar' },
  { terms: ['clarify', 'ambiguous', 'request', 'scope'], expects: 'clarify-requirements' },
  { terms: ['request', 'processing', 'quality', 'intake'], expects: 'define-quality-bar' },
  { terms: ['decision', 'search', 'solution', 'algorithm', 'options'], expects: 'keep-decision-trail' },
  { terms: ['brownfield', 'characterization', 'test'], expects: 'write-tests-first' },
];

// A single generic action verb says "do something", not what. These must not
// resolve confidently; the session that produced them picked a wrong capability.
const weakCases: string[][] = [
  ['properly', 'handling', 'any', 'request'],
  ['algorithms', 'finding', 'solutions'],
  ['explore', 'alternatives', 'tradeoffs', 'before', 'deciding'],
  ['redesign', 'foundational', 'data', 'shape'],
];

const unresolvedCases: string[][] = [
  ['zzzznotatag'],
  ['process', 'pull', 'request', 'merge'],
  ['solution', 'option', 'exploration', 'alternatives'],
  ['intermittent', 'http', '500', 'after', 'deploy'],
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

// Phrases recorded while exercising the ten development-cycle stages.
const stageCases: Array<{ terms: string[]; expects: string }> = [
  { terms: ['scope', 'boundary', 'permitted', 'actions', 'exclusions'], expects: 'clarify-requirements' },
  { terms: ['acceptance', 'evidence', 'command', 'test', 'receipt'], expects: 'verify-work-results' },
  { terms: ['security', 'data', 'loss', 'migration', 'public'], expects: 'assess-change-impact' },
  { terms: ['task', 'packet', 'work', 'item', 'source', 'revision'], expects: 'plan-implementation' },
  { terms: ['dependency', 'order', 'single', 'writer', 'shared'], expects: 'plan-implementation' },
  { terms: ['step', 'count', 'estimate', 'correction', 'cap'], expects: 'plan-implementation' },
  { terms: ['preserve', 'public', 'behaviour', 'caller', 'migration'], expects: 'migrate-consumers-off-the-old-system' },
  { terms: ['smallest', 'coherent', 'change', 'owned', 'paths'], expects: 'minimize-code-surface' },
  { terms: ['focused', 'checks', 'batch', 'failures'], expects: 'verify-work-results' },
  { terms: ['update', 'system', 'specification', 'behaviour', 'interfaces'], expects: 'write-technical-prose' },
  { terms: ['pull', 'request', 'review', 'typescript'], expects: 'review-code' },
  { terms: ['consumer', 'migration', 'off', 'deprecated', 'endpoint'], expects: 'migrate-consumers-off-the-old-system' },
  { terms: ['data', 'migration', 'schema', 'change'], expects: 'migrate-a-data-schema' },
  { terms: ['test', 'suite', 'full', 'run'], expects: 'verify-work-results' },
  { terms: ['decision', 'record', 'owner', 'open', 'question'], expects: 'keep-decision-trail' },
  { terms: ['risk', 'classification', 'security'], expects: 'assess-change-impact' },
  { terms: ['hard', 'constraints', 'options'], expects: 'metric-gated-decision' },
  { terms: ['architectural', 'redesign'], expects: 'design-structure' },
  { terms: ['one', 'owner', 'per', 'document', 'no', 'parallel'], expects: 'single-source-of-truth' },
  { terms: ['observability', 'alerting', 'errors'], expects: 'instrument-production-code' },
];

test('keeps the recorded stage steps on their first-pass tag', () => {
  const failures: string[] = [];
  for (const { terms, expects } of stageCases) {
    const result = resolveIntent(instructions, terms, aliases);
    const got = result.capability ?? result.pattern;
    if (result.status !== 'resolved' || got !== expects) failures.push(`${terms.join(' ')} -> ${result.status}:${String(got)}`);
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
