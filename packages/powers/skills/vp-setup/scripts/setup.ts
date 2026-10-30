import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Carrier = 'standalone' | 'runtime' | 'host-shim';
export type ModelInventory = { providers: { id: string; models: { id: string; family: string; roles: ('main'|'agent')[]; available: boolean }[] }[] };
export type SetupOptions = { root: string; carrier?: Carrier; inventoryPath?: string; selections?: Record<string,string>; flowLevel?: 'full'|'medium'|'light'; taskOverride?: { task: string; selections: Record<string,string> }; dryRun?: boolean; now?: () => string };
type MethodologyProfile = { groups: { id: string; user_decision: boolean; default?: string; alternatives: { id: string }[] }[] };
type LanePolicy = 'independent-provider' | 'independent-model' | 'blind-same-model';
export type EffectiveProfile = { schema: 'VPEffectiveProfile/v1'; groups: Record<string, { active: string; alternatives: string[] }>; unresolved_groups: Record<string, string[]>; flow_level?: 'full'|'medium'|'light'; task_override?: { task: string; groups: Record<string, { active: string; alternatives: string[]; previous_active?: string }> }; verification: { available_models: { provider: string; model: string; family: string; roles: ('main'|'agent')[]; available: boolean }[]; lane_assignment: { lane: string; provider: string; model: string; blind: boolean }[]; lane_policy: LanePolicy; limitations: string }; unresolvedGroups: string[]; limitations: string[] };

const begin = '<!-- vida-powers:profile:begin -->';
const end = '<!-- vida-powers:profile:end -->';
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export function detectCarrier(root: string): Carrier {
  const base = resolve(root);
  if (existsSync(join(base, 'AGENTS.md')) || existsSync(join(base, 'CLAUDE.md'))) return 'standalone';
  if (existsSync(join(base, '.vida', 'project.yaml')) || existsSync(join(base, 'agent-runtime.config.v1.yaml'))) return 'runtime';
  if (existsSync(join(base, 'vida-project.json')) || existsSync(join(base, '.claude', 'settings.json'))) return 'host-shim';
  return 'standalone';
}

export function readInventory(path: string): ModelInventory {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof value !== 'object' || value === null || !('providers' in value) || !Array.isArray(value.providers)) throw new Error('inventory must contain providers array');
  return value as ModelInventory;
}

function available(inventory: ModelInventory): { provider: string; model: string; family: string; roles: ('main'|'agent')[]; available: boolean }[] {
  return inventory.providers.flatMap((provider) => provider.models.filter((model) => model.available).map((model) => ({ provider: provider.id, model: model.id, family: model.family, roles: model.roles, available: model.available })));
}

export function resolveProfile(sourceProfile: MethodologyProfile, options: { selections: Record<string,string>; flowLevel?: 'full'|'medium'|'light'; inventory: ModelInventory; taskOverride?: { task: string; selections: Record<string,string> } }): EffectiveProfile {
  const groups: EffectiveProfile['groups'] = {};
  const unresolvedGroups: string[] = [];
  const unresolved_groups: EffectiveProfile['unresolved_groups'] = {};
  for (const group of sourceProfile.groups) {
    const selected = options.selections[group.id];
    if (!group.user_decision && selected !== undefined) throw new Error(`invalid selection ${selected} for product-policy group ${group.id}; product policy declares ${String(group.default)}`);
    const chosen = group.user_decision ? selected : group.default;
    const alternativeIds = group.alternatives.map((alternative) => alternative.id);
    if (chosen === undefined) { unresolvedGroups.push(group.id); unresolved_groups[group.id] = alternativeIds; continue; }
    if (!alternativeIds.includes(chosen)) throw new Error(`invalid alternative ${chosen} for group ${group.id}`);
    groups[group.id] = { active: chosen, alternatives: alternativeIds };
  }
  for (const groupId of Object.keys(options.selections)) {
    if (!sourceProfile.groups.some((group) => group.id === groupId)) throw new Error(`unknown group ${groupId}`);
  }
  const overridden: NonNullable<EffectiveProfile['task_override']>['groups'] = {};
  if (options.taskOverride !== undefined) {
    if (options.taskOverride.task.trim() === '') throw new Error('task override requires a task name');
    for (const [groupId, chosen] of Object.entries(options.taskOverride.selections)) {
      const group = sourceProfile.groups.find((item) => item.id === groupId);
      if (group === undefined) throw new Error(`unknown group ${groupId}`);
      if (!group.user_decision) throw new Error(`task override cannot change product-policy group ${groupId}`);
      const alternativeIds = group.alternatives.map((alternative) => alternative.id);
      if (!alternativeIds.includes(chosen)) throw new Error(`invalid alternative ${chosen} for group ${groupId}`);
      const previous = groups[groupId]?.active;
      groups[groupId] = { active: chosen, alternatives: alternativeIds };
      overridden[groupId] = { active: chosen, alternatives: alternativeIds, ...(previous === undefined ? {} : { previous_active: previous }) };
      delete unresolved_groups[groupId];
      const pending = unresolvedGroups.indexOf(groupId);
      if (pending >= 0) unresolvedGroups.splice(pending, 1);
    }
  }
  const models = available(options.inventory);
  const executor = models.find((model) => model.roles.includes('main')) ?? models.find((model) => model.roles.includes('agent'));
  const otherProvider = executor === undefined ? undefined : models.find((model) => model.provider !== executor.provider && model.family !== executor.family);
  const otherModel = executor === undefined ? undefined : models.find((model) => model.provider === executor.provider && model.model !== executor.model);
  let lane_policy: LanePolicy;
  let verificationModel = executor;
  let blind = false;
  let limitations: string;
  if (executor === undefined) {
    lane_policy = 'blind-same-model';
    verificationModel = undefined;
    limitations = 'No available models; no executor or verification lanes can be assigned.';
  } else if (otherProvider !== undefined) {
    lane_policy = 'independent-provider'; verificationModel = otherProvider; limitations = 'Verification uses a different provider family.';
  } else if (otherModel !== undefined) {
    lane_policy = 'independent-model'; verificationModel = otherModel; limitations = 'Verification uses another model from the same provider; provider-level independence is unavailable.';
  } else {
    lane_policy = 'blind-same-model'; blind = true; limitations = 'Verification uses the same model; independent verification is unavailable.';
  }
  const lane_assignment: EffectiveProfile['verification']['lane_assignment'] = executor === undefined ? [] : [
    { lane: 'execute', provider: executor.provider, model: executor.model, blind: false },
    { lane: 'verify', provider: verificationModel?.provider ?? executor.provider, model: verificationModel?.model ?? executor.model, blind },
  ];
  const result: EffectiveProfile = { schema: 'VPEffectiveProfile/v1', groups, unresolved_groups, verification: { available_models: models, lane_assignment, lane_policy, limitations }, unresolvedGroups, limitations: [...(unresolvedGroups.length > 0 ? [`Unresolved groups: ${unresolvedGroups.join(', ')}.`] : []), limitations] };
  if (options.flowLevel !== undefined) result.flow_level = options.flowLevel;
  if (options.taskOverride !== undefined) result.task_override = { task: options.taskOverride.task, groups: overridden };
  return result;
}

function persisted(profile: EffectiveProfile): Omit<EffectiveProfile, 'unresolvedGroups'|'limitations'|'task_override'> {
  const { unresolvedGroups: _unresolved, limitations: _limits, task_override, ...value } = profile;
  if (task_override === undefined) return value;
  const groups = { ...value.groups };
  for (const [groupId, override] of Object.entries(task_override.groups)) {
    if (override.previous_active === undefined) delete groups[groupId];
    else groups[groupId] = { active: override.previous_active, alternatives: override.alternatives };
  }
  return { ...value, groups };
}

export function readProfileBlock(content: string): unknown | undefined {
  return parsedBlock(content);
}

export function profileBlock(profile: EffectiveProfile): string {
  return `${begin}\n\n\`\`\`json\n${JSON.stringify(persisted(profile), null, 2)}\n\`\`\`\n\n${end}`;
}

function parsedBlock(content: string): unknown | undefined {
  const start = content.indexOf(begin);
  const finish = content.indexOf(end, start + begin.length);
  if (start === -1 || finish === -1) return undefined;
  const block = content.slice(start + begin.length, finish);
  const match = /```json\s*([\s\S]*?)\s*```/.exec(block);
  if (match === null) return undefined;
  try { return JSON.parse(match[1] ?? ''); } catch { return undefined; }
}

function stable(value: unknown): string { return JSON.stringify(value); }

export function upsertProfile(filePath: string, profile: EffectiveProfile): { changed: boolean; content: string } {
  let content = '';
  try { content = readFileSync(filePath, 'utf8'); } catch { /* new carrier */ }
  const old = parsedBlock(content);
  const next = persisted(profile);
  if (old !== undefined && stable(old) === stable(next)) return { changed: false, content };
  const start = content.indexOf(begin);
  const finish = content.indexOf(end, start + begin.length);
  const block = profileBlock(profile);
  if (start !== -1 && finish !== -1) return { changed: true, content: content.slice(0, start) + block + content.slice(finish + end.length) };
  const separator = content.length === 0 || content.endsWith('\n') ? '' : '\n';
  return { changed: true, content: `${content}${separator}${block}\n` };
}

export async function runSetup(options: SetupOptions): Promise<{ carrier: Carrier; path: string; changed: boolean; profile: EffectiveProfile; unresolvedGroups: string[]; limitations: string[] }> {
  const sourcePath = join(packageRoot, 'config', 'methodology-profile.json');
  const schemaPath = join(packageRoot, 'config', 'vpeffectiveprofile.v1.schema.json');
  const source = JSON.parse(await readFile(sourcePath, 'utf8')) as MethodologyProfile;
  JSON.parse(await readFile(schemaPath, 'utf8')) as unknown;
  const carrier = options.carrier ?? detectCarrier(options.root);
  const inventoryPath = options.inventoryPath ?? process.env.VP_MODEL_INVENTORY;
  const inventory = inventoryPath === undefined ? { providers: [] } : readInventory(inventoryPath);
  const profile = resolveProfile(source, { selections: options.selections ?? {}, inventory, ...(options.flowLevel === undefined ? {} : { flowLevel: options.flowLevel }), ...(options.taskOverride === undefined ? {} : { taskOverride: options.taskOverride }) });
  const path = carrier === 'standalone'
    ? join(resolve(options.root), existsSync(join(options.root, 'AGENTS.md')) ? 'AGENTS.md' : existsSync(join(options.root, 'CLAUDE.md')) ? 'CLAUDE.md' : 'AGENTS.md')
    : carrier === 'runtime' ? join(resolve(options.root), '.vida', 'vp-profile.json') : join(resolve(options.root), 'vida-project-profile.json');
  let changed: boolean;
  if (carrier === 'standalone') {
    const result = upsertProfile(path, profile); changed = result.changed;
    if (changed && options.dryRun !== true) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, result.content, 'utf8'); }
  } else {
    let existing: unknown;
    try { existing = JSON.parse(await readFile(path, 'utf8')); } catch { existing = undefined; }
    const next = persisted(profile);
    changed = stable(existing) !== stable(next);
    if (changed && options.dryRun !== true) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8'); }
  }
  return { carrier, path, changed, profile, unresolvedGroups: profile.unresolvedGroups, limitations: profile.limitations };
}

export async function runCli(args: string[]): Promise<void> {
  try {
    const values: Record<string, string> = {};
    let root = ''; let carrier: Carrier | undefined; let inventoryPath: string | undefined; let flowLevel: SetupOptions['flowLevel']; let dryRun = false;
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      const value = args[index + 1];
      if (arg === '--dry-run') { dryRun = true; continue; }
      if (value === undefined) throw new Error(`missing value for ${arg}`);
      index += 1;
      if (arg === '--root') root = value;
      else if (arg === '--carrier' && ['standalone', 'runtime', 'host-shim'].includes(value)) carrier = value as Carrier;
      else if (arg === '--inventory') inventoryPath = value;
      else if (arg === '--flow-level' && ['full', 'medium', 'light'].includes(value)) flowLevel = value as SetupOptions['flowLevel'];
      else if (arg === '--select') {
        const match = /^([^=]+)=(.+)$/.exec(value);
        if (match === null) throw new Error(`invalid selection ${value}`);
        values[match[1] ?? ''] = match[2] ?? '';
      } else throw new Error(`invalid argument ${arg}`);
    }
    if (root === '') throw new Error('--root is required');
    const summary = await runSetup({ root, selections: values, dryRun, ...(carrier === undefined ? {} : { carrier }), ...(inventoryPath === undefined ? {} : { inventoryPath }), ...(flowLevel === undefined ? {} : { flowLevel }) });
    console.log(JSON.stringify(summary));
  } catch (error) {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }
}

