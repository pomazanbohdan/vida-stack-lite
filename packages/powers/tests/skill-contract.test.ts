import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

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
  expect(skill).toMatch(/sum of the UTF-8 byte lengths of each selected instruction's `content`/u);
  expect(skill).toMatch(/limit excludes `tag_dictionary`, JSON syntax, instruction metadata, execution context, and text-rendered obligation prose/u);
  expect(skill).toContain('SR-58');
  expect(skill).toContain('AC-26');
});

test('routes final retrieval through one compose-backed multi-ID get', async () => {
  const skill = await readSkill();
  expect(skill).toMatch(/`tags --query`[\s\S]*search[\s\S]*get --id <id\.\.\.>[\s\S]*`catalog\.compose`/u);
  expect(skill).toContain('Do not issue one get per ID or manually concatenate results.');
  expect(skill).toMatch(/`catalog\.get` library operation remains a single-record inspection API and is not a bundle assembler/u);
});

test('documents executable catalog CLI commands from the package root', async () => {
  const skill = await readSkill();
  expect(skill).toContain('From `packages/powers/`, run `bun skills/vp-mode/scripts/catalog-cli.ts tags --query <literal terms> --catalog <snapshot>`');
  expect(skill).toContain('`bun skills/vp-mode/scripts/catalog-cli.ts search --capability <mapped tag> --profile <effective-profile.json> --catalog <snapshot>`');
  expect(skill).toContain('`bun skills/vp-mode/scripts/catalog-cli.ts get --id <id...> --profile <effective-profile.json> --catalog <snapshot>`');
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
