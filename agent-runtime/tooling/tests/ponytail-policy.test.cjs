'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const policy = require('../../lib/ponytail-policy.cjs');

function stackFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-policy-'));
  const stackRoot = path.join(root, 'stack');
  const release = path.join(stackRoot, 'releases', 'gsd-1.11.0_ponytail-4.9.0');
  const codexHome = path.join(release, 'surface', '.codex');
  const skill = path.join(codexHome, 'skills', 'ponytail', 'SKILL.md');
  fs.mkdirSync(path.dirname(skill), { recursive: true });
  fs.writeFileSync(skill, '# trusted ponytail\n');
  fs.writeFileSync(path.join(release, 'stack.json'), JSON.stringify({ gsdCore: '1.11.0', ponytail: '4.9.0', codexHome }));
  fs.writeFileSync(path.join(release, 'package.json'), JSON.stringify({ dependencies: { '@dietrichgebert/ponytail': '4.9.0' } }));
  fs.mkdirSync(path.join(stackRoot, 'releases'), { recursive: true });
  fs.writeFileSync(path.join(stackRoot, 'current.txt'), `${release}\n`);
  const skillSha256 = require('crypto').createHash('sha256').update(fs.readFileSync(skill)).digest('hex');
  return { root, stackRoot, currentFile: path.join(stackRoot, 'current.txt'), release: path.basename(release), skillSha256, trusted: { release: path.basename(release), skill_sha256: skillSha256 } };
}
function input(role, overrides = {}) { return { role, phase: role === 'blind-architect' ? 'architect' : 'execute', work_id: 'ponytail-test', capability_epoch: 'epoch-1', ...overrides }; }
function options(fixture) { return { stack_root: fixture.stackRoot, current_file: fixture.currentFile, repository_root: fixture.root, trusted: fixture.trusted }; }
function withoutTrust(fixture) { const value = options(fixture); delete value.trusted; return value; }
function expectBlocked(action, pattern) { let error;try{action();}catch(candidate){error=candidate;}expect(error).toBeDefined();expect(error).toMatchObject({gate_code:'GATE_BLOCKED'});expect(error.message).toMatch(pattern); }
function rewriteJson(file, transform) { const value = JSON.parse(fs.readFileSync(file, 'utf8'));fs.writeFileSync(file, JSON.stringify(transform(value))); }

describe('role-scoped Ponytail policy', () => {
  test('selects the closed role matrix without changing assurance roles', () => {
    policy.invalidate();
    const fixture = stackFixture();
    expect(policy.modes).toEqual(['off', 'lite', 'full', 'review']);
    expect(policy.phases).toEqual(['bootstrap', 'intake', 'trace', 'plan', 'execute', 'verify', 'review', 'architect', 'reconcile', 'dispatch']);
    const expected = {
      requirements: 'off', 'business-research': 'off', 'system-research': 'off', 'codebase-mapping': 'off',
      'implementation-planner': 'lite', executor: 'full', debugger: 'full', 'code-producing-specialist': 'full',
      'final-complexity-reviewer': 'review', 'correctness-reviewer': 'off', 'security-data-migration-reviewer': 'off', verifier: 'off', 'documentation-reconciler': 'off', 'blind-architect': 'off'
    };
    for (const [role, mode] of Object.entries(expected)) expect(policy.resolve(input(role), options(fixture))).toMatchObject({ role, mode, degraded: false, mutation_allowed: mode === 'full' });
  });

  test('uses one capability-epoch cache and invalidates on epoch changes', () => {
    policy.invalidate();
    const fixture = stackFixture();
    const first = policy.resolve(input('executor'), options(fixture));
    const hit = policy.resolve(input('executor'), options(fixture));
    const miss = policy.resolve(input('executor', { capability_epoch: 'epoch-2' }), options(fixture));
    const profileMiss = policy.resolve(input('executor', { profile: 'gpt-5.6-sol/xhigh' }), options(fixture));
    const leaseMiss = policy.resolve(input('executor', { lease: 'lease-2' }), options(fixture));
    expect(first.cache_hit).toBe(false); expect(hit.cache_hit).toBe(true); expect(miss.cache_hit).toBe(false);
    expect(profileMiss.cache_hit).toBe(false); expect(leaseMiss.cache_hit).toBe(false); expect(policy.cacheSize()).toBe(4);
  });

  test('invalidates a trusted decision when the active skill changes', () => {
    policy.invalidate();
    const fixture = stackFixture();
    const first = policy.resolve(input('verifier'), options(fixture));
    expect(first.degraded).toBe(false);
    fs.appendFileSync(path.join(fixture.stackRoot, 'releases', fixture.release, 'surface', '.codex', 'skills', 'ponytail', 'SKILL.md'), 'tampered\n');
    expect(policy.resolve(input('verifier'), options(fixture))).toMatchObject({ degraded: true, cache_hit: false, reason: expect.stringMatching(/skill hash mismatch/) });
  });

  test('fails closed for a missing or tampered trusted mutation capability, while read-only may degrade', () => {
    policy.invalidate();
    const fixture = stackFixture();
    fs.writeFileSync(fixture.currentFile, `${path.join(fixture.stackRoot, 'releases', 'missing')}\n`);
    expect(() => policy.resolve(input('executor', { mutation: true }), options(fixture))).toThrow(/managed Ponytail stack/);
    expect(policy.resolve(input('verifier'), options(fixture))).toMatchObject({ degraded: true, mutation_allowed: false });
    const intact = stackFixture();
    fs.appendFileSync(path.join(intact.stackRoot, 'releases', intact.release, 'surface', '.codex', 'skills', 'ponytail', 'SKILL.md'), 'tampered\n');
    expect(() => policy.resolve(input('executor', { mutation: true }), options(intact))).toThrow(/skill hash mismatch/);
  });

  test('covers trusted-stack rejection paths and repository trust resolution', () => {
    policy.invalidate();
    const invalidRole = stackFixture();
    expectBlocked(() => policy.resolve(input('unknown-role'), options(invalidRole)), /role invalid/);
    expectBlocked(() => policy.resolve({ role: '', phase: 'execute' }, options(invalidRole)), /role missing/);
    expectBlocked(() => policy.resolve(input('executor', { phase: 'unknown' }), options(invalidRole)), /phase invalid/);
    expectBlocked(() => policy.resolve(null, options(invalidRole)), /input required/);
    expectBlocked(() => policy.trustedRelease({ ...options(invalidRole), current_file: path.join(invalidRole.root, 'outside.txt') }), /outside trusted stack/);
    expectBlocked(() => policy.trustedRelease({ ...options(invalidRole), current_file: path.join(invalidRole.stackRoot, 'missing.txt') }), /pointer unavailable/);
    const mismatch = stackFixture();
    expectBlocked(() => policy.trustedRelease({ ...options(mismatch), trusted: { release: 'gsd-1.10.1_ponytail-4.9.0' } }), /release mismatch/);
    const alias = stackFixture();
    expect(policy.trustedRelease({ ...options(alias), trusted: { release: alias.release, skillSha256: alias.skillSha256 } }).releaseName).toBe(alias.release);
    expect(policy.trustedRelease({ ...options(alias), trusted: { release: alias.release }, expected_skill_sha256: alias.skillSha256 }).releaseName).toBe(alias.release);
    const badMetadata = stackFixture();
    rewriteJson(path.join(badMetadata.stackRoot, 'releases', badMetadata.release, 'stack.json'), value => ({ ...value, ponytail: '4.9.1' }));
    expectBlocked(() => policy.trustedRelease(options(badMetadata)), /metadata mismatch/);
    const badVersion = stackFixture();
    rewriteJson(path.join(badVersion.stackRoot, 'releases', badVersion.release, 'stack.json'), value => ({ ...value, gsdCore: 'bad' }));
    expectBlocked(() => policy.trustedRelease(options(badVersion)), /metadata mismatch|version invalid/);
    const missingSkill = stackFixture();
    fs.unlinkSync(path.join(missingSkill.stackRoot, 'releases', missingSkill.release, 'surface', '.codex', 'skills', 'ponytail', 'SKILL.md'));
    expectBlocked(() => policy.trustedRelease(options(missingSkill)), /skill unavailable/);
    const corrupt = stackFixture();
    fs.writeFileSync(path.join(corrupt.stackRoot, 'releases', corrupt.release, 'package.json'), '{');
    expectBlocked(() => policy.trustedRelease(options(corrupt)), /package unreadable/);

    const manifestRoot = stackFixture();
    expect(policy.trustedRelease(withoutTrust(manifestRoot)).releaseName).toBe(manifestRoot.release);
    const capabilityDir = path.join(manifestRoot.root, 'agent-runtime', 'capability');
    fs.mkdirSync(capabilityDir, { recursive: true });
    fs.writeFileSync(path.join(capabilityDir, 'capability.json'), JSON.stringify({ ponytailPolicy: { trustedReleases: [{ release: manifestRoot.release, skillSha256: '0'.repeat(64) }] } }));
    expectBlocked(() => policy.trustedRelease({ stack_root: manifestRoot.stackRoot, current_file: manifestRoot.currentFile, repository_root: manifestRoot.root }), /skill hash mismatch/);
    fs.writeFileSync(path.join(capabilityDir, 'capability.json'), JSON.stringify({ ponytailPolicy: { trustedReleases: [{ release: manifestRoot.release, skillSha256: manifestRoot.skillSha256 }] } }));
    const trusted = policy.resolve(input('verifier'), withoutTrust(manifestRoot));
    expect(trusted.degraded).toBe(false);
    const unknownManifest = stackFixture();
    const unknownDir = path.join(unknownManifest.root, 'agent-runtime', 'capability');
    fs.mkdirSync(unknownDir, { recursive: true });
    fs.writeFileSync(path.join(unknownDir, 'capability.json'), JSON.stringify({ ponytailPolicy: { trustedReleases: [] } }));
    expectBlocked(() => policy.trustedRelease(withoutTrust(unknownManifest)), /not repository-trusted/);
  });

  test('uses bounded host environment fallbacks without accepting an unavailable stack', () => {
    policy.invalidate();
    const fixture = stackFixture();
    const saved = { LOCALAPPDATA: process.env.LOCALAPPDATA, LOCAL_APP_DATA: process.env.LOCAL_APP_DATA, USERPROFILE: process.env.USERPROFILE };
    try {
      process.env.LOCALAPPDATA = path.join(fixture.root, 'local-app-data'); delete process.env.LOCAL_APP_DATA;
      expectBlocked(() => policy.trustedRelease({ repository_root: fixture.root }), /pointer unavailable/);
      delete process.env.LOCALAPPDATA; process.env.LOCAL_APP_DATA = path.join(fixture.root, 'local-app-data-2');
      expectBlocked(() => policy.trustedRelease({ repository_root: fixture.root }), /pointer unavailable/);
      delete process.env.LOCAL_APP_DATA; process.env.USERPROFILE = fixture.root;
      expectBlocked(() => policy.trustedRelease({ repository_root: fixture.root }), /pointer unavailable/);
      delete process.env.USERPROFILE;
      expectBlocked(() => policy.trustedRelease({ repository_root: fixture.root }), /pointer unavailable/);
    } finally {
      if (saved.LOCALAPPDATA === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = saved.LOCALAPPDATA;
      if (saved.LOCAL_APP_DATA === undefined) delete process.env.LOCAL_APP_DATA; else process.env.LOCAL_APP_DATA = saved.LOCAL_APP_DATA;
      if (saved.USERPROFILE === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = saved.USERPROFILE;
    }
  });

  test('covers compact validation bindings, cache predicate invalidation and stable value forms', () => {
    policy.invalidate();
    const fixture = stackFixture();
    const code = policy.resolve(input('executor'), options(fixture));
    expect(policy.decisionDigest({ b: 1, a: 2 })).toBe(policy.decisionDigest({ a: 2, b: 1 }));
    expect(policy.resolve(input('verifier', { work_id: undefined, source_revision: undefined, capability_epoch: undefined }), options(fixture))).toMatchObject({ work_id: null, source_revision: null, capability_epoch: 'host-default' });
    expect(policy.resolve({ role: 'verifier', phase: 'verify', work_id: undefined, source_revision: undefined, capability_epoch: undefined }, { stack_root: path.join(fixture.root, 'missing-stack') })).toMatchObject({ work_id: null, source_revision: null, degraded: true });
    policy.decisionDigest([code.role, code.mode]);
    policy.invalidate(() => false);
    policy.invalidate(() => true);
    expect(policy.cacheSize()).toBe(0);
    expectBlocked(() => policy.validateDecision(code, { work_id: 'other-work' }), /work binding/);
    expectBlocked(() => policy.validateDecision(code, { source_revision: 'other-source' }), /source binding/);
    expectBlocked(() => policy.validateDecision(code, { phase: 'verify' }), /phase binding/);
    const noMutation = { ...code, mutation_allowed: false };
    noMutation.decision_digest = policy.decisionDigest(noMutation);
    expectBlocked(() => policy.validateDecision(noMutation, { mutation: true }), /mutation binding|unavailable/);
    const invalidIdentity = { ...code, schema: 'Wrong/v1' };
    expectBlocked(() => policy.validateDecision(invalidIdentity), /decision invalid/);
    expectBlocked(() => policy.validateDecision(null), /decision invalid/);
    const invalidMode = { ...code, mode: 'off' };
    invalidMode.decision_digest = policy.decisionDigest(invalidMode);
    expectBlocked(() => policy.validateDecision(invalidMode), /role\/mode binding/);
    const invalidEnum = { ...code, mode: 'unknown' };
    invalidEnum.decision_digest = policy.decisionDigest(invalidEnum);
    expectBlocked(() => policy.validateDecision(invalidEnum), /mode invalid/);
    const invalidSkill = { ...code, skill_sha256: null };
    invalidSkill.decision_digest = policy.decisionDigest(invalidSkill);
    expectBlocked(() => policy.validateDecision(invalidSkill), /trusted skill/);
    const invalidVersion = { ...code, ponytail_version: 'bad' };
    invalidVersion.decision_digest = policy.decisionDigest(invalidVersion);
    expectBlocked(() => policy.validateDecision(invalidVersion), /trusted skill/);
    expectBlocked(() => policy.validateDecision({ ...code, decision_digest: '0'.repeat(64) }), /digest invalid/);
  });

  test('keeps dispatch context compact and excludes Ponytail from independent assurance', () => {
    policy.invalidate();
    const fixture = stackFixture();
    const code = policy.resolve(input('executor', { mutation: true }), options(fixture));
    const architect = policy.resolve(input('blind-architect'), options(fixture));
    const codeContext = policy.dispatchContext(code);
    const architectContext = policy.dispatchContext(architect);
    expect(Object.keys(codeContext.policy_decision)).toEqual(['schema', 'role', 'phase', 'mode', 'stack_release', 'gsd_version', 'ponytail_version', 'skill_sha256', 'capability_epoch', 'degraded', 'cache_hit', 'mutation_allowed', 'evidence_pointer', 'decision_digest', 'next_action']);
    expect(codeContext.policy_fragment).toMatch(/standard\/native|implementation mechanics/);
    expect(architectContext.policy_fragment).toBe('');
    expect(JSON.stringify(codeContext)).not.toContain('trusted ponytail');
    expect(JSON.stringify(architectContext)).not.toContain('prior');
    expect(() => policy.validateDecision({ ...code, decision_digest: '0'.repeat(64) })).toThrow(/digest invalid/);
  });

  test('rejects forged trusted mutation decisions and exposes one dispatch context', () => {
    policy.invalidate();
    const fixture = stackFixture();
    const code = policy.resolve(input('executor'), options(fixture));
    expect(policy.resolveDispatch(input('executor'), options(fixture))).toMatchObject({
      policy_decision: { role: 'executor', mode: 'full', mutation_allowed: true },
      policy_fragment: expect.stringContaining('implementation mechanics')
    });
    const forged = { ...code, stack_release: null, gsd_version: null, ponytail_version: null, skill_sha256: null };
    forged.decision_digest = policy.decisionDigest(forged);
    expect(() => policy.validateDecision(forged, { mutation: true })).toThrow(/trusted stack|trusted skill/);
    const wrongMutation = { ...code, mutation_allowed: false };
    wrongMutation.decision_digest = policy.decisionDigest(wrongMutation);
    expect(() => policy.validateDecision(wrongMutation)).toThrow(/mutation binding/);
    expect(() => policy.resolve(input('verifier', { mutation: true }), options(fixture))).toThrow(/mutation role invalid/);
  });
});
