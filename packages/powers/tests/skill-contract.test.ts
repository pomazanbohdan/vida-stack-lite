import { expect, test } from 'bun:test';
import { readFile, readdir } from 'node:fs/promises'; import { existsSync } from 'node:fs';

const skillPath = new URL('../skills/vp-mode/SKILL.md', import.meta.url);
const setupSkillPath = new URL('../skills/vp-setup/SKILL.md', import.meta.url);

async function readSkill(): Promise<string> {
  return readFile(skillPath, 'utf8');
}

async function readSetupSkill(): Promise<string> {
  return readFile(setupSkillPath, 'utf8');
}

test('defines the session bundle limit over selected instruction content', async () => {
  const skill = await readSkill();
  expect(skill).toMatch(/at most 20 instructions/u);
  expect(skill).toMatch(/64,000 UTF-8 bytes/u);
  expect(skill).toContain('Read `references/bundle.md` fully');
  const bundle = await readFile(new URL('../skills/vp-mode/references/bundle.md', import.meta.url), 'utf8');
  expect(bundle).toMatch(/sum of the UTF-8 byte lengths of each selected instruction's `content`/u);
  expect(bundle).toMatch(/limit excludes `tag_dictionary`, JSON syntax, instruction metadata, execution context, and text-rendered obligation prose/u);
  expect(bundle).toContain('SR-58');
  expect(bundle).toContain('AC-26');
});

test('documents the receipt report shape the validator accepts', async () => {
  const skill = await readSkill();
  expect(skill).toContain('"intents":[{"name":"<short intent>","terms":["<search terms>"],"ids":["<chosen ID>"],"rows":["<ID seen in a row>"],"capability":"<declared tag>"}]');
  expect(skill).toContain('`name`, `terms` and `ids` are required');
  expect(skill).toContain('check-retrieval.ts --catalog <snapshot> --report <report.json>');
});

test('routes final retrieval through one compose-backed multi-ID get', async () => {
  const skill = await readSkill();
  expect(skill).toMatch(/search --for[\s\S]*`tags --query`[\s\S]*get --id <id\.\.\.>[\s\S]*`catalog\.compose`/u);
  expect(skill).toContain('Do not issue one get per ID or manually concatenate results.');
  expect(skill).toMatch(/`catalog\.get` library operation remains a single-record inspection API and is not a bundle assembler/u);
});

test('documents executable catalog CLI commands from the package root', async () => {
  const skill = await readSkill();
  expect(skill).toContain('search --for "<terms>" --profile <effective-profile.json> --catalog <snapshot>');
  expect(skill).toContain('Fallback on the observable signal');
  expect(skill).toContain('get --id <id...> --profile <effective-profile.json> --catalog <snapshot>');
});

test('uses the effective profile and negotiates unresolved policy groups', async () => {
  const skill = await readSkill();
  expect(skill).toMatch(/effective profile.*active alternative/is);
  expect(skill).toMatch(/unresolved policy group.*negotiation request/is);
  expect(skill).toMatch(/never choose.*default/is);
});

test('keeps unprofiled compose output outside the session bundle path', async () => {
  const skill = await readSkill();
  expect(skill).toContain('Always supply the effective profile for the `vp-mode` retrieval workflow.');
  expect(skill).toContain('Direct `catalog.compose` calls without `--profile` remain unfiltered diagnostics');
  expect(skill).toContain('conflicting canonical policy alternatives in the selection or dependency closure return `CATALOG_PROFILE_CONFLICT`');
  expect(skill).toContain('Diagnostic output is not a resolved session bundle.');
});

test('refreshes legacy profiles before treating a profile conflict as negotiation', async () => {
  const skill = await readSkill();
  expect(skill).toMatch(/`profile_refresh_required: true`.*`vp-setup`.*before interpreting `resolution_required: true` as a negotiation request/is);
  expect(skill).toMatch(/Only a conflict with `resolution_required: true` and no `profile_refresh_required: true` is a user negotiation request/u);
});

test('shows a valid managed-profile example and refreshes profiles missing unresolved state', async () => {
  const skill = await readSetupSkill();
  expect(skill).toContain('{ "schema": "VPEffectiveProfile/v1", "groups": {}, "unresolved_groups": {} }');
  expect(skill).toMatch(/Profiles written before `unresolved_groups` existed must be refreshed with `vp-setup` before `catalog\.compose`/u);
});

test('keeps mandatory dependencies and rejects bundle overflow', async () => {
  const skill = await readSkill();
  expect(skill).toMatch(/mandatory and transitive dependencies/is);
  expect(skill).toContain('On overflow, return `CATALOG_BUNDLE_LIMIT_EXCEEDED`');
  expect(skill).toContain('reject the whole bundle');
  expect(skill).toContain('do not return partial results or trim mandatory and transitive dependencies');
});

test('documents Agent Fallback and artifact materialization requirements', async () => {
  const skill = await readSkill();
  for (const clause of [
    'Agent Fallback',
    'unavailable',
    'timeout',
    'API error',
    'malformed format',
    'unknown candidate ID',
    'insufficient confidence',
    'main agent',
    'selected IDs',
    'fallback reason',
    '`artifact_contract`',
    'materialize',
    'SR-22',
    'SR-23',
    'SR-24',
    'SR-25',
    'AC-13',
    'AC-14',
  ]) expect(skill).toContain(clause);
});

test('keeps every-run rules and the skill-dir command form', async () => {
  const skill = await readSkill();
  for (const clause of [
    'Always supply the effective profile',
    'weak match',
    'Never reconstruct an ID',
    'Search rows are instruction IDs',
    'Do not issue one get per ID',
    '64,000 UTF-8 bytes',
    'receipt rejects an ID',
    'capability and pattern tags are filters',
    'no write, merge or approval authority',
    'never repeat the identical failing command',
  ]) expect(skill).toContain(clause);
  for (const line of skill.split('\n').filter((entry) => entry.includes('`bun '))) expect(line).toContain('<skill-dir>');
  const setup = await readSetupSkill();
  for (const line of setup.split('\n').filter((entry) => entry.includes('`bun '))) expect(line).toContain('<skill-dir>');
});

test('declares Agent Skills frontmatter and reachable references', async () => {
  for (const [path, name] of [[skillPath, 'vp-mode'], [setupSkillPath, 'vp-setup']] as const) {
    const text = await readFile(path, 'utf8');
    expect(text).toMatch(new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---`, 'u'));
  }

  const skill = await readSkill();
  for (const reference of ['profile', 'examples', 'bundle', 'findings', 'artifacts']) {
    expect(skill).toContain(`references/${reference}.md`);
    expect(existsSync(new URL(`../skills/vp-mode/references/${reference}.md`, import.meta.url))).toBe(true);
  }
  expect(skill).not.toContain('bun skills/');
  expect(await readSetupSkill()).not.toContain('bun skills/');
});

test('project documents use explicit sources and never substitute a missing profile', async () => {
  const bootstrap = await readFile(new URL('../skills/vida-bootstrap/SKILL.md', import.meta.url), 'utf8');
  const mode = await readSkill();
  const setup = await readSetupSkill();
  expect(bootstrap).toContain('exactly one family delta');
  expect(bootstrap).toContain('base-only');
  expect(mode).toContain('never substitute a marker block');
  for (const entry of ['vida-bootstrap', 'vp-mode', 'vp-setup']) expect(setup).toContain(entry);
  expect(setup).toContain('does not prove host activation');
});

test('bootstrap routes instruction lookup through vp-mode and the catalog CLI', async () => {
  const bootstrap = await readFile(new URL('../skills/vida-bootstrap/SKILL.md', import.meta.url), 'utf8');
  const orchestrator = await readFile(new URL('../skills/vida-bootstrap/references/bootstrap-orchestrator.md', import.meta.url), 'utf8');
  expect(bootstrap).toMatch(/instruction\/catalog lookup/u);
  expect(orchestrator).toMatch(/catalog-cli\.ts search/u);
  expect(orchestrator).toContain('vp-mode/SKILL.md');
});
