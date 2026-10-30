import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';
import { detectCarrier, profileBlock, readInventory, resolveProfile, runCli, runSetup, upsertProfile } from '../skills/vp-setup/scripts/setup.ts';
import type { EffectiveProfile, ModelInventory } from '../skills/vp-setup/scripts/setup.ts';

const script = fileURLToPath(new URL('../skills/vp-setup/scripts/cli.ts', import.meta.url));
const source = JSON.parse(await readFile(new URL('../config/methodology-profile.json', import.meta.url), 'utf8')) as { groups: { id: string; user_decision: boolean; default?: string; alternatives: { id: string }[] }[] };
const effectiveProfileSchema: Schema = JSON.parse(await readFile(new URL('../config/vpeffectiveprofile.v1.schema.json', import.meta.url), 'utf8'));
const profile: EffectiveProfile = { schema: 'VPEffectiveProfile/v1', groups: { 'approval-policy': { active: 'approval-policy-gate', alternatives: ['approval-policy-proceed', 'approval-policy-gate'] } }, unresolved_groups: {}, flow_level: 'medium', verification: { available_models: [], lane_assignment: [], lane_policy: 'blind-same-model', limitations: 'blind same model' }, unresolvedGroups: [], limitations: [] };
const inventory: ModelInventory = { providers: [{ id: 'p1', models: [{ id: 'm1', family: 'f1', roles: ['main', 'agent'], available: true }] }] };

async function temp(): Promise<string> { return mkdtemp(join(tmpdir(), 'vp-setup-')); }

describe('vp-setup', () => {
  test('detects standalone instruction carriers and defaults to AGENTS.md', async () => {
    const root = await temp();
    try {
      expect(detectCarrier(root)).toBe('standalone');
      await writeFile(join(root, 'CLAUDE.md'), '');
      expect(detectCarrier(root)).toBe('standalone');
      await writeFile(join(root, 'AGENTS.md'), '');
      expect(detectCarrier(root)).toBe('standalone');
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test('detects runtime before host configuration', async () => {
    const root = await temp();
    try {
      await mkdir(join(root, '.vida'));
      await writeFile(join(root, '.vida', 'project.yaml'), '');
      expect(detectCarrier(root)).toBe('runtime');
      await writeFile(join(root, 'vida-project.json'), '{}');
      expect(detectCarrier(root)).toBe('runtime');
      await rm(join(root, '.vida'), { recursive: true });
      expect(detectCarrier(root)).toBe('host-shim');
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test('round trips a managed profile block', () => {
    const block = profileBlock(profile);
    expect(block).toContain('<!-- vida-powers:profile:begin -->');
    expect(block).toContain('```json');
    expect(block).toContain('<!-- vida-powers:profile:end -->');
    const parsed = JSON.parse(block.split('```json\n')[1]?.split('\n```')[0] ?? 'null') as Record<string, unknown>;
    expect(parsed).toEqual({ schema: profile.schema, groups: profile.groups, unresolved_groups: profile.unresolved_groups, flow_level: profile.flow_level, verification: profile.verification });
    expect(validateAgainstSchema(parsed, effectiveProfileSchema)).toEqual([]);
  });

  test('inserts, compares parsed profile, preserves foreign bytes, and changes only managed block', async () => {
    const root = await temp();
    const path = join(root, 'instructions.md');
    const input = '# keep\n\n';
    await writeFile(path, input);
    const first = upsertProfile(path, profile);
    expect(first.changed).toBe(true);
    expect(first.content.startsWith(input)).toBe(true);
    await writeFile(path, first.content);
    const inserted = upsertProfile(path, profile);
    expect(inserted.changed).toBe(false);
    expect(inserted.content).toBe(first.content);
    const wrapped = `BEFORE\r\n${first.content}\r\nAFTER`;
    await writeFile(path, wrapped);
    const changedProfile = { ...profile, flow_level: 'light' as const };
    const changed = upsertProfile(path, changedProfile);
    expect(changed.changed).toBe(true);
    const markers = /<!-- vida-powers:profile:begin -->[\s\S]*?<!-- vida-powers:profile:end -->/;
    const result = wrapped.replace(markers, profileBlock(changedProfile));
    expect(changed.content).toBe(result);
    await writeFile(path, changed.content);
    const wrappedChanged = upsertProfile(path, changedProfile);
    expect(wrappedChanged.changed).toBe(false);
    expect(wrappedChanged.content).toBe(changed.content);
    expect(changed.content.slice(0, changed.content.indexOf('<!-- vida-powers:profile:begin -->'))).toBe(`BEFORE\r\n${input}`);
    expect(changed.content.endsWith('\r\nAFTER')).toBe(true);
    expect(changed.content).toContain('"flow_level": "light"');
    await rm(root, { recursive: true, force: true });
  });

  test('repairs a malformed JSON payload inside its managed block', async () => {
    const root = await temp();
    const path = join(root, 'instructions.md');
    await writeFile(path, '<!-- vida-powers:profile:begin -->\n```json\n{\n```\n<!-- vida-powers:profile:end -->');
    const repaired = upsertProfile(path, profile);
    expect(repaired.changed).toBe(true);
    expect(repaired.content).toBe(profileBlock(profile));
    await rm(root, { recursive: true, force: true });
  });

  test('requires valid JSON inventory but allows empty inventory', async () => {
    const root = await temp();
    try {
      const p = join(root, 'inventory.json');
      await writeFile(p, '{"providers":[]}');
      expect(readInventory(p)).toEqual({ providers: [] });
      await writeFile(p, '{');
      expect(() => readInventory(p)).toThrow();
      expect(() => readInventory(join(root, 'missing.json'))).toThrow();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test('resolves selections, reports undecided groups, and derives verification ladder', () => {
    const selected = resolveProfile(source as never, { selections: { 'approval-policy': 'approval-policy-proceed' }, flowLevel: 'full', inventory });
    expect(selected.groups['approval-policy']?.active).toBe('approval-policy-proceed');
    const unresolved = resolveProfile(source as never, { selections: {}, inventory });
    expect(unresolved.groups['approval-policy']).toBeUndefined();
    expect(unresolved.groups['testing-sequence']?.active).toBe('test-first-development');
    expect(unresolved.groups['review-strategy']?.active).toBe('code-review');
    expect(unresolved.groups.architecture?.active).toBe('structural-design');
    expect(unresolved.groups.delivery?.active).toBe('plan-execution');
    expect(unresolved.unresolvedGroups).toEqual(['approval-policy', 'context-degradation-policy']);
    expect(unresolved.unresolved_groups).toEqual({
      'approval-policy': ['approval-policy-proceed', 'approval-policy-gate'],
      'context-degradation-policy': ['context-degradation-signals', 'context-degradation-measured'],
    });
    const complete = resolveProfile(source as never, { selections: { 'approval-policy': 'approval-policy-gate', 'context-degradation-policy': 'context-degradation-measured' }, inventory });
    expect(complete.unresolvedGroups).toEqual([]);
    expect(Object.keys(complete.groups)).toHaveLength(6);
    expect(() => resolveProfile(source as never, { selections: { 'testing-sequence': 'test-first-development' }, inventory })).toThrow('invalid selection');
    const same = resolveProfile(source as never, { selections: {}, inventory });
    expect(same.verification.lane_policy).toBe('blind-same-model');
    expect(same.verification.lane_assignment[1]?.blind).toBe(true);
    expect(same.verification.limitations).toContain('same model');
    const sameProvider = { providers: [{ id: 'p1', models: [...inventory.providers[0]!.models, { id: 'm2', family: 'f1', roles: ['agent'] as ('main'|'agent')[], available: true }] }] };
    expect(resolveProfile(source as never, { selections: {}, inventory: sameProvider }).verification.lane_policy).toBe('independent-model');
    const otherProvider = { providers: [...sameProvider.providers, { id: 'p2', models: [{ id: 'm3', family: 'f2', roles: ['agent'] as ('main'|'agent')[], available: true }] }] };
    expect(resolveProfile(source as never, { selections: {}, inventory: otherProvider }).verification.lane_policy).toBe('independent-provider');
    const empty = resolveProfile(source as never, { selections: {}, inventory: { providers: [] } });
    expect(empty.verification.lane_assignment).toEqual([]);
    expect(empty.limitations.length).toBeGreaterThan(0);
    const agentOnly: ModelInventory = { providers: [{ id: 'agent-provider', models: [{ id: 'agent-model', family: 'agent-family', roles: ['agent'], available: true }] }] };
    expect(resolveProfile(source as never, { selections: {}, inventory: agentOnly }).verification.lane_assignment[0]?.model).toBe('agent-model');
  });

  test('runSetup writes carrier idempotently and dry-run does not write', async () => {
    const root = await temp();
    try {
      const opts = { root, selections: { 'approval-policy': 'approval-policy-gate' }, inventoryPath: join(root, 'inventory.json'), now: () => '2026-10-20' };
      await writeFile(opts.inventoryPath, JSON.stringify(inventory));
      const dry = await runSetup({ ...opts, dryRun: true });
      expect(dry.changed).toBe(true);
      await expect(readFile(join(root, 'AGENTS.md'), 'utf8')).rejects.toThrow();
      expect((await runSetup(opts)).changed).toBe(true);
      const bytes = await readFile(join(root, 'AGENTS.md'), 'utf8');
      expect((await runSetup(opts)).changed).toBe(false);
      expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toBe(bytes);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test('runSetup writes runtime and host JSON carriers idempotently', async () => {
    const root = await temp();
    try {
      const runtime = await runSetup({ root, carrier: 'runtime', selections: { 'approval-policy': 'approval-policy-gate' }, inventoryPath: join(root, 'empty.json') }).catch(() => undefined);
      expect(runtime).toBeUndefined();
      await writeFile(join(root, 'empty.json'), '{"providers":[]}');
      const first = await runSetup({ root, carrier: 'runtime', inventoryPath: join(root, 'empty.json') });
      expect(first.changed).toBe(true);
      expect((await runSetup({ root, carrier: 'runtime', inventoryPath: join(root, 'empty.json') })).changed).toBe(false);
      const host = await runSetup({ root, carrier: 'host-shim', inventoryPath: join(root, 'empty.json'), dryRun: true });
      expect(host.carrier).toBe('host-shim');
      expect(host.changed).toBe(true);
      await expect(readFile(join(root, 'vida-project-profile.json'), 'utf8')).rejects.toThrow();
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test('persists unresolved approval-policy alternatives in every carrier', async () => {
    const root = await temp();
    const inventoryPath = join(root, 'empty.json');
    const expected = {
      'approval-policy': ['approval-policy-proceed', 'approval-policy-gate'],
      'context-degradation-policy': ['context-degradation-signals', 'context-degradation-measured'],
    };
    try {
      await writeFile(inventoryPath, '{"providers":[]}');
      const standalone = await runSetup({ root, carrier: 'standalone', inventoryPath });
      const standaloneText = await readFile(standalone.path, 'utf8');
      const standalonePayload = standaloneText.split('```json\n')[1]?.split('\n```')[0] ?? 'null';
      const standaloneProfile = JSON.parse(standalonePayload);
      expect(standaloneProfile.unresolved_groups).toEqual(expected);
      expect(validateAgainstSchema(standaloneProfile, effectiveProfileSchema)).toEqual([]);

      const runtime = await runSetup({ root, carrier: 'runtime', inventoryPath });
      const runtimeProfile = JSON.parse(await readFile(runtime.path, 'utf8'));
      expect(runtimeProfile.unresolved_groups).toEqual(expected);
      expect(validateAgainstSchema(runtimeProfile, effectiveProfileSchema)).toEqual([]);

      const host = await runSetup({ root, carrier: 'host-shim', inventoryPath });
      const hostProfile = JSON.parse(await readFile(host.path, 'utf8'));
      expect(hostProfile.unresolved_groups).toEqual(expected);
      expect(validateAgainstSchema(hostProfile, effectiveProfileSchema)).toEqual([]);
      expect(validateAgainstSchema({ schema: 'VPEffectiveProfile/v1', groups: {}, unresolved_groups: { 'approval-policy': ['not a pattern tag'] } }, effectiveProfileSchema)).not.toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test('CLI emits JSON summary and rejects invalid selections as JSON errors', async () => {
    const root = await temp();
    try {
      const bun = 'C:\\Users\\pomaz\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\\bun-windows-x64\\bun.exe';
      const good = spawnSync(bun, [script, '--root', root, '--select', 'approval-policy=approval-policy-gate', '--dry-run'], { encoding: 'utf8' });
      expect(good.status).toBe(0);
      expect(JSON.parse(good.stdout).carrier).toBe('standalone');
      const bad = spawnSync(bun, [script, '--root', root, '--select', 'unknown=nope'], { encoding: 'utf8' });
      expect(bad.status).toBe(1);
      expect(() => JSON.parse(bad.stderr)).not.toThrow();
      const invalidAlternative = spawnSync(bun, [script, '--root', root, '--select', 'approval-policy=wrong'], { encoding: 'utf8' });
      expect(invalidAlternative.status).toBe(1);
      const productSelection = spawnSync(bun, [script, '--root', root, '--select', 'testing-sequence=test-first-development'], { encoding: 'utf8' });
      expect(productSelection.status).toBe(1);
      expect(JSON.parse(productSelection.stderr).error).toContain('product-policy group');
      const invalidArg = spawnSync(bun, [script, '--unknown'], { encoding: 'utf8' });
      expect(invalidArg.status).toBe(1);
      const missingValue = spawnSync(bun, [script, '--root'], { encoding: 'utf8' });
      expect(missingValue.status).toBe(1);
      const noRoot = spawnSync(bun, [script], { encoding: 'utf8' });
      expect(noRoot.status).toBe(1);
      const malformedSelection = spawnSync(bun, [script, '--root', root, '--select', 'broken'], { encoding: 'utf8' });
      expect(malformedSelection.status).toBe(1);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test('CLI parser reports argument and selection errors and supports every option', async () => {
    const root = await temp();
    const previousOut = console.log;
    const previousErr = console.error;
    const outputs: string[] = [];
    const errors: string[] = [];
    try {
      console.log = (line?: unknown): void => { outputs.push(String(line)); };
      console.error = (line?: unknown): void => { errors.push(String(line)); };
      await runCli(['--root']);
      expect(JSON.parse(errors.pop() ?? '{}').error).toContain('missing value');
      await runCli(['--root', root, '--select', 'bad']);
      expect(JSON.parse(errors.pop() ?? '{}').error).toContain('invalid selection');
      await runCli(['--root', root, '--carrier', 'wrong']);
      expect(JSON.parse(errors.pop() ?? '{}').error).toContain('invalid argument');
      await writeFile(join(root, 'inv.json'), '{"providers":[]}');
      await runCli(['--root', root, '--carrier', 'standalone', '--flow-level', 'light', '--inventory', join(root, 'inv.json'), '--select', 'approval-policy=approval-policy-gate', '--dry-run']);
      expect(JSON.parse(outputs.pop() ?? '{}').profile.flow_level).toBe('light');
      expect(errors).toEqual([]);
    } finally {
      console.log = previousOut;
      console.error = previousErr;
      process.exitCode = 0;
      await rm(root, { recursive: true, force: true });
    }
  });
});
