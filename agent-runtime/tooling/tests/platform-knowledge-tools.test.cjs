'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const resolver = require('../../lib/platform-knowledge-resolver.cjs');
const updater = require('../../lib/skill-updater.cjs');
const knowledge = require('../../lib/platform-knowledge.cjs');

const HASH = 'a'.repeat(64);
const now = '2026-08-19T10:00:00.000Z';

function validContext(overrides = {}) {
  return knowledge.withDigest({
    schema: 'PlatformKnowledgeContext/v1', context_id: 'ctx-tools', work_id: 'work-tools', cycle_id: 'cycle-tools',
    source_revision: 'source-tools', scope_id: 'scope-tools', change_kind: 'feature',
    br_sr_ac: { br: ['BR-TOOLS'], sr: ['SR-TOOLS'], ac: ['AC-TOOLS'] },
    official_sources: [{ url: 'https://docs.example.test/platform', title: 'Academy', platform_version: '8.x', last_verified: now, source_hash: HASH, applicability: 'page behavior', pointer: 'docs#academy' }],
    local_sources: [], skills: [{ skill_id: 'skill-tools', path: '.codex/skills/skill-tools/SKILL.md', skill_sha256: HASH, role: 'executor', phase: 'execute', status: 'applied', evidence_pointer: 'WORK.md#skill' }],
    cache: { capability_epoch: 'host-tools', hit: false, snapshot_digest: HASH }, warnings: [], conflicts: [], created_at: now, next_action: 'Apply the recorded knowledge.',
    ...overrides
  });
}

function validValidation(context, overrides = {}) {
  return {
    schema: 'DocumentationSkillValidation/v1', validation_id: 'validation-tools', work_id: context.work_id,
    cycle_id: context.cycle_id, context_id: context.context_id, source_revision: context.source_revision, status: 'pass',
    official_matches: [{ source_url: context.official_sources[0].url, evidence_pointer: 'WORK.md#docs' }],
    skill_matches: [{ skill_id: context.skills[0].skill_id, skill_sha256: context.skills[0].skill_sha256, evidence_pointer: 'WORK.md#skill' }],
    findings: [], evidence_pointers: ['WORK.md#validator'], validated_by: 'documentation-skill-validator', validated_at: now,
    next_action: 'Continue to exact-three review.', ...overrides
  };
}

test('resolver hashes local skills and returns a compact immutable context', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-tools-'));
  fs.mkdirSync(path.join(root, '.codex', 'skills', 'demo'), { recursive: true });
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'demo', 'SKILL.md'), '# Demo\n', 'utf8');
  const context = resolver.resolve(root, { context_id: 'ctx', work_id: 'work', cycle_id: 'cycle', source_revision: 'source', scope_id: 'scope', change_kind: 'feature', capability_epoch: 'host-1', official_sources: [], local_sources: [], skills: [{ skill_id: 'demo', path: '.codex/skills/demo/SKILL.md', role: 'executor', phase: 'execute' }], warnings: ['official source unavailable'] });
  expect(context.skills[0].skill_sha256).toBe(resolver.sha256File(path.join(root, '.codex', 'skills', 'demo', 'SKILL.md')));
  expect(context.digest).toHaveLength(64);
});

test('skill updater fails closed without all quality checks and only edits source skill', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-update-'));
  const skill = path.join(root, '.codex', 'skills', 'demo', 'SKILL.md');
  fs.mkdirSync(path.dirname(skill), { recursive: true }); fs.writeFileSync(skill, '# Demo\n', 'utf8');
  const proposal = { schema: 'SkillChangeProposal/v1', proposal_id: 'proposal', skill_id: 'demo', skill_path: '.codex/skills/demo/SKILL.md', source_url: 'https://docs.example.test/platform/', source_hash: updater.hash(skill), rule: 'Use the supported platform pattern.', evidence_pointers: ['WORK.md#proposal'], eval_manifest: 'docs/skill-learning/eval-manifest.schema.json', status: 'proposed' };
  expect(() => updater.apply(root, proposal, [{ id: 'held-out', status: 'fail' }])).toThrow(/quality\/eval checks incomplete/);
  const result = updater.apply(root, proposal, [{ id: 'source-example', status: 'pass' }, { id: 'held-out', status: 'pass' }, { id: 'negative-transfer', status: 'pass' }, { id: 'regression', status: 'pass' }, { id: 'marketplace', status: 'pass' }]);
  expect(result.status).toBe('applied'); expect(fs.readFileSync(skill, 'utf8')).toMatch(/Official Academy Baseline/);
});

test('platform knowledge validators reject malformed, stale, and unsafe evidence', () => {
  const base = validContext();
  const invalid = [
    [{ ...base, schema: 'Wrong/v1' }, /context invalid/],
    [{ ...base, work_id: '' }, /knowledge work_id missing/],
    [{ ...base, change_kind: 'unknown' }, /change kind invalid/],
    [{ ...base, br_sr_ac: { br: [] } }, /knowledge sr invalid/],
    [{ ...base, br_sr_ac: null }, /BR\/SR\/AC trace invalid/],
    [{ ...base, official_sources: null }, /official knowledge sources invalid/],
    [{ ...base, official_sources: [null] }, /official knowledge source invalid/],
    [{ ...base, official_sources: [{ ...base.official_sources[0], last_verified: undefined, lastmod: undefined }] }, /verification date missing/],
    [{ ...base, official_sources: [{ ...base.official_sources[0], pointer: 'token=secret' }] }, /official source pointer unsafe/],
    [{ ...base, official_sources: [{ ...base.official_sources[0], source_hash: 'bad' }] }, /official source hash invalid/],
    [{ ...base, local_sources: [null] }, /local knowledge source invalid/],
    [{ ...base, local_sources: [{ path: 'docs/local.md', source_hash: 'bad', applicability: 'local' }] }, /local knowledge hash invalid/],
    [{ ...base, skills: [null] }, /knowledge skill invalid/],
    [{ ...base, skills: [{ ...base.skills[0], status: 'unknown' }] }, /skill status invalid/],
    [{ ...base, cache: null }, /knowledge cache invalid/],
    [{ ...base, cache: { capability_epoch: 'host', hit: true, snapshot_digest: 'bad' } }, /snapshot digest invalid/],
    [{ ...base, created_at: 'not-a-date' }, /created_at invalid/],
    [{ ...base, digest: '0'.repeat(64) }, /digest invalid/]
  ];
  for (const [candidate, pattern] of invalid) expect(() => knowledge.validateContext(candidate)).toThrow(pattern);
  expect(() => knowledge.contextMatchesCheckpoint(base, { work_id: 'other', source_revision: base.source_revision })).toThrow(/work binding/);
  expect(() => knowledge.contextMatchesCheckpoint(base, { work_id: base.work_id, source_revision: 'old' })).toThrow(/source binding/);
  expect(() => knowledge.contextMatchesCheckpoint(base, { work_id: base.work_id, source_revision: base.source_revision, scope_contract: { scope_id: 'other' } })).toThrow(/scope binding/);
  expect(() => knowledge.contextMatchesCheckpoint(base, { work_id: base.work_id, source_revision: base.source_revision, platform_knowledge_cycle_id: 'old' })).toThrow(/cycle binding/);
  expect(() => knowledge.validateContext(base, { scope_id: 'other' })).toThrow(/scope binding/);
  expect(() => knowledge.validateOfficialSources({ ...base, official_sources: [], warnings: [] })).toThrow(/absence must be a warning/);
  expect(knowledge.validateOfficialSources({ ...base, official_sources: [], warnings: ['official source unavailable'] })).toBe(false);
  expect(() => knowledge.validateSkillHashes(base, { [base.skills[0].skill_id]: 'b'.repeat(64) })).toThrow(/skill hash mismatch/);
  expect(knowledge.validateSkillHashes(base, {})).toBe(true);
});

test('documentation validator rejects binding, status, and item-shape failures', () => {
  const context = validContext();
  const checkpoint = { work_id: context.work_id, source_revision: context.source_revision };
  const bad = [
    [{ ...validValidation(context), schema: 'Wrong/v1' }, /validation invalid/],
    [{ ...validValidation(context), status: 'unknown' }, /status invalid/],
    [{ ...validValidation(context), context_id: 'other' }, /binding invalid/],
    [{ ...validValidation(context), evidence_pointers: [] }, /evidence pointers invalid/],
    [{ ...validValidation(context), skill_matches: [{ skill_id: '', skill_sha256: HASH, evidence_pointer: 'x' }] }, /skill match id missing/],
    [{ ...validValidation(context), official_matches: [{ source_url: '', evidence_pointer: 'x' }] }, /official match URL missing/],
    [{ ...validValidation(context), findings: [{ id: '', summary: 'x', evidence_pointer: 'x' }] }, /finding id missing/],
    [{ ...validValidation(context), validated_at: 'not-a-date' }, /validated_at invalid/]
  ];
  for (const [candidate, pattern] of bad) expect(() => knowledge.validateDocumentationSkillValidation(candidate, context, checkpoint)).toThrow(pattern);
  expect(knowledge.validateDocumentationSkillValidation(validValidation(context), context, checkpoint).status).toBe('pass');
});

test('resolver exercises local, optional metadata, cache, and containment failures', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-resolver-'));
  const skill = path.join(root, '.codex', 'skills', 'demo', 'SKILL.md');
  const local = path.join(root, 'docs', 'local.md');
  fs.mkdirSync(path.dirname(skill), { recursive: true }); fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(skill, '# Demo\n', 'utf8'); fs.writeFileSync(local, '# Local\n', 'utf8');
  const context = resolver.resolve(root, {
    context_id: 'ctx', work_id: 'work', cycle_id: 'cycle', source_revision: 'source', scope_id: 'scope', change_kind: 'feature',
    capability_epoch: 'host-2', cache_hit: true,
    official_sources: [{ url: 'https://docs.example.test/platform', title: 'Academy', platform_version: '', lastmod: now, source_hash: HASH, applicability: 'platform' }],
    local_sources: [{ path: 'docs/local.md', applicability: 'repository', pointer: 'docs/local.md' }],
    skills: [{ skill_id: 'demo', path: '.codex/skills/demo/SKILL.md', role: 'executor', phase: 'execute', status: 'reviewed_not_applied' }]
  });
  expect(context.cache.hit).toBe(true); expect(context.local_sources).toHaveLength(1); expect(context.skills[0].status).toBe('reviewed_not_applied');
  expect(() => resolver.readHash(root, 'missing.md')).toThrow(/unavailable/);
  expect(() => resolver.readHash(root, '.codex')).toThrow(/unavailable/);
  expect(() => resolver.readHash(root, '../outside')).toThrow(/escapes/);
});

test('knowledge cache reuses a hashed immutable context and invalidates by source or capability key', () => {
  const cache = knowledge.createKnowledgeCache({ maxEntries: 2 });
  const context = validContext({ cache: { capability_epoch: 'host-tools', hit: false, snapshot_digest: HASH } });
  const key = { source_revision: context.source_revision, scope_id: context.scope_id, affected_paths: ['agent-runtime/lib/runtime.cjs'], capability_epoch: 'host-tools', official_sources: context.official_sources, local_sources: context.local_sources, skills: context.skills };
  cache.set(key, context);
  expect(cache.get(key)).toMatchObject({ context_id: context.context_id });
  expect(cache.get({ ...key, capability_epoch: 'host-new' })).toBeNull();
  cache.invalidate(key);
  expect(cache.size()).toBe(0);
});

test('skill updater rejects unsafe, stale, malformed, and incomplete proposals', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-update-invalid-'));
  const skill = path.join(root, '.codex', 'skills', 'demo', 'SKILL.md');
  fs.mkdirSync(path.dirname(skill), { recursive: true }); fs.writeFileSync(skill, '# Demo\n', 'utf8');
  const proposal = { schema: 'SkillChangeProposal/v1', proposal_id: 'proposal', skill_id: 'demo', skill_path: '.codex/skills/demo/SKILL.md', source_url: 'https://docs.example.test/platform', source_hash: updater.hash(skill), rule: 'Use the supported pattern.', evidence_pointers: ['WORK.md#proposal'], eval_manifest: 'eval.json', status: 'proposed' };
  expect(() => updater.validateProposal(null)).toThrow(/proposal invalid/);
  for (const key of ['proposal_id', 'skill_id', 'skill_path', 'source_url', 'source_hash', 'rule', 'eval_manifest']) expect(() => updater.validateProposal({ ...proposal, [key]: '' })).toThrow(new RegExp(`${key} missing`));
  expect(() => updater.validateProposal({ ...proposal, source_hash: 'bad' })).toThrow(/source hash invalid/);
  expect(() => updater.validateProposal({ ...proposal, evidence_pointers: [] })).toThrow(/evidence missing/);
  expect(() => updater.validateProposal({ ...proposal, status: 'applied' })).toThrow(/must be proposed/);
  expect(() => updater.apply(root, { ...proposal, skill_path: 'docs/SKILL.md' }, [{ status: 'pass' }])).toThrow(/outside source skills/);
  expect(() => updater.apply(root, { ...proposal, source_hash: 'b'.repeat(64) }, [{ status: 'pass' }])).toThrow(/source hash changed/);
});

