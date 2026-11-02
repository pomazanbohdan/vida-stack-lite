#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type BootstrapRole = 'orchestrator' | 'agent';
export type BootstrapKind =
  | 'base'
  | 'research'
  | 'synthesis'
  | 'prewrite'
  | 'implementation'
  | 'validation'
  | 'testing'
  | 'delivery';

export interface BootstrapEntry {
  readonly tag: string;
  readonly role: BootstrapRole;
  readonly kind: BootstrapKind;
  readonly title: string;
  readonly path: string;
  readonly order: number;
  readonly requires: readonly string[];
  readonly version: 1;
}

export interface BootstrapRegistry {
  readonly schema: 'VidaBootstrapRegistry/v1';
  readonly revision: number;
  readonly role_families: Readonly<Record<string, Exclude<BootstrapKind, 'base'>>>;
  readonly entries: readonly BootstrapEntry[];
}

export interface BootstrapOptions {
  readonly role?: BootstrapRole;
  readonly kind?: Exclude<BootstrapKind, 'base'>;
  readonly roleName?: string;
  readonly tags?: readonly string[];
  readonly list?: boolean;
  readonly json?: boolean;
  readonly requireComplete?: boolean;
}

export interface BootstrapResult {
  readonly schema: 'VidaBootstrap/v1';
  readonly role: BootstrapRole;
  readonly roleName: string | null;
  readonly kind: BootstrapKind;
  readonly complete: boolean;
  readonly defaulted: boolean;
  readonly requiresRoleOrFamily: boolean;
  readonly tags: readonly string[];
  readonly registryRevision: number;
  readonly instructions: readonly {
    readonly tag: string;
    readonly title: string;
    readonly path: string;
    readonly version: number;
    readonly bytes: number;
  }[];
  readonly text: string;
  readonly digest: string;
  readonly textBytes: number;
}

const bundleKinds: readonly Exclude<BootstrapKind, 'base'>[] = [
  'research',
  'synthesis',
  'prewrite',
  'implementation',
  'validation',
  'testing',
  'delivery',
];
const entryKeys = ['kind', 'order', 'path', 'requires', 'role', 'tag', 'title', 'version'] as const;
const registryKeys = ['entries', 'revision', 'role_families', 'schema'] as const;

class BootstrapError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
    throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `${label} has unexpected keys`);
}

function textValue(value: unknown, label: string, max = 2048): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max)
    throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `${label} must be a non-empty string`);
  return value;
}

function integerValue(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum)
    throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `${label} must be an integer in range`);
  return value;
}

function parseRegistry(value: unknown): BootstrapRegistry {
  if (!isRecord(value)) throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', 'registry must be an object');
  exactKeys(value, registryKeys, 'registry');
  if (value['schema'] !== 'VidaBootstrapRegistry/v1')
    throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', 'unsupported registry schema');
  const revision = integerValue(value['revision'], 'registry revision', 1, 1_000_000);
  if (!isRecord(value['role_families']))
    throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', 'role_families must be an object');
  const roleFamilies: Record<string, Exclude<BootstrapKind, 'base'>> = Object.create(null);
  for (const [role, family] of Object.entries(value['role_families'])) {
    if (!/^[a-z][a-z0-9-]*$/u.test(role))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `invalid role name ${role}`);
    if (typeof family !== 'string' || !bundleKinds.includes(family as Exclude<BootstrapKind, 'base'>))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `invalid family for ${role}`);
    roleFamilies[role] = family as Exclude<BootstrapKind, 'base'>;
  }
  if (Object.keys(roleFamilies).length === 0)
    throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', 'role_families is empty');
  if (!Array.isArray(value['entries']))
    throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', 'entries must be an array');
  const entries: BootstrapEntry[] = [];
  const tags = new Set<string>();
  const roleKinds = new Set<string>();
  for (const [index, raw] of value['entries'].entries()) {
    if (!isRecord(raw)) throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} must be an object`);
    exactKeys(raw, entryKeys, `entry ${index}`);
    const tag = textValue(raw['tag'], `entry ${index} tag`, 120);
    if (!/^bootstrap-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(tag))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} tag is invalid`);
    if (tags.has(tag)) throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `duplicate tag ${tag}`);
    tags.add(tag);
    const role = raw['role'];
    if (role !== 'orchestrator' && role !== 'agent')
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} role is invalid`);
    const kind = raw['kind'];
    if (!['base', ...bundleKinds].includes(kind as string))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} kind is invalid`);
    const roleKind = `${role}:${String(kind)}`;
    if (roleKinds.has(roleKind))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `duplicate role/kind ${roleKind}`);
    roleKinds.add(roleKind);
    const title = textValue(raw['title'], `entry ${index} title`, 120);
    const entryPath = textValue(raw['path'], `entry ${index} path`, 512);
    if (!/^references\/bootstrap-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u.test(entryPath))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} path is invalid`);
    if (entryPath !== `references/${tag}.md`)
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} path does not match tag`);
    const order = integerValue(raw['order'], `entry ${index} order`, 0, 1000);
    if (!Array.isArray(raw['requires']) || raw['requires'].some((item) => typeof item !== 'string'))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} requires is invalid`);
    const requires = raw['requires'] as string[];
    if (new Set(requires).size !== requires.length)
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} requires has duplicates`);
    if (raw['version'] !== 1)
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `entry ${index} version is unsupported`);
    entries.push({
      tag,
      role,
      kind: kind as BootstrapKind,
      title,
      path: entryPath,
      order,
      requires,
      version: 1,
    });
  }
  validateComposition(entries, roleFamilies);
  return { schema: 'VidaBootstrapRegistry/v1', revision, role_families: roleFamilies, entries };
}

function validateComposition(
  entries: readonly BootstrapEntry[],
  roleFamilies: Readonly<Record<string, Exclude<BootstrapKind, 'base'>>>,
): void {
  const byTag = new Map(entries.map((entry) => [entry.tag, entry]));
  for (const entry of entries) {
    const expectedTag = entry.kind === 'base' ? `bootstrap-${entry.role}` : `bootstrap-agent-${entry.kind}`;
    if (entry.tag !== expectedTag)
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `invalid tag for ${entry.role}:${entry.kind}`);
    for (const required of entry.requires) {
      if (!byTag.has(required))
        throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `${entry.tag} requires unknown ${required}`);
    }
    if (entry.role === 'orchestrator' && (entry.kind !== 'base' || entry.requires.length > 0))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', 'orchestrator must have one dependency-free base');
    if (entry.role === 'agent' && entry.kind === 'base' && entry.requires.length > 0)
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', 'agent base must not require another entry');
    if (entry.role === 'agent' && entry.kind !== 'base' && entry.requires.length !== 1)
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `${entry.tag} must require exactly the agent base`);
    if (entry.role === 'agent' && entry.kind !== 'base' && entry.requires[0] !== 'bootstrap-agent')
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `${entry.tag} must require bootstrap-agent`);
  }
  const bases = entries.filter((entry) => entry.kind === 'base');
  if (bases.length !== 2 || !bases.some((entry) => entry.role === 'orchestrator') || !bases.some((entry) => entry.role === 'agent'))
    throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', 'registry must contain exactly the two role bases');
  const families = new Set(bundleKinds);
  for (const family of families) {
    const deltas = entries.filter((entry) => entry.role === 'agent' && entry.kind === family);
    if (deltas.length !== 1)
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `family ${family} must have exactly one delta`);
  }
  for (const [role, family] of Object.entries(roleFamilies)) {
    if (role === 'orchestrator' || role === 'agent')
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `${role} is a session class, not a configured role`);
    if (!families.has(family))
      throw new BootstrapError('BOOTSTRAP_REGISTRY_INVALID', `${role} maps to unknown family ${family}`);
  }
}

function canonicalContent(file: string): string {
  const info = lstatSync(file, { throwIfNoEntry: false });
  if (info === undefined || !info.isFile() || info.isSymbolicLink())
    throw new BootstrapError('BOOTSTRAP_FILE_INVALID', `instruction is not a regular package file: ${file}`);
  const raw = readFileSync(file, 'utf8').replace(/\r\n?/gu, '\n').replace(/[ \t]+$/gmu, '');
  const content = raw.trim();
  if (content === '') throw new BootstrapError('BOOTSTRAP_FILE_INVALID', `instruction is empty: ${file}`);
  return content;
}

function resolveEntryFile(root: string, entry: BootstrapEntry): string {
  const base = path.resolve(root, 'references');
  const baseInfo = lstatSync(base, { throwIfNoEntry: false });
  if (baseInfo === undefined || !baseInfo.isDirectory() || baseInfo.isSymbolicLink())
    throw new BootstrapError('BOOTSTRAP_FILE_INVALID', 'references is not a regular directory');
  const file = path.resolve(root, entry.path);
  const relative = path.relative(base, file);
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new BootstrapError('BOOTSTRAP_FILE_INVALID', `instruction escapes its directory: ${entry.path}`);
  return file;
}

function selectEntries(registry: BootstrapRegistry, options: BootstrapOptions): readonly BootstrapEntry[] {
  const byTag = new Map(registry.entries.map((entry) => [entry.tag, entry]));
  if (options.tags !== undefined && (options.kind !== undefined || options.roleName !== undefined))
    throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', 'tags cannot be combined with kind or role name');
  if (options.role !== undefined) {
    if (options.tags !== undefined && options.tags.length > 0)
      throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', '--role cannot be combined with --tag');
    if (options.role === 'orchestrator') {
      if (options.kind !== undefined || options.roleName !== undefined)
        throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', 'orchestrator does not accept --kind or --role-name');
      return [byTag.get('bootstrap-orchestrator')!];
    }
    const base = byTag.get('bootstrap-agent')!;
    let family: Exclude<BootstrapKind, 'base'> | undefined = options.kind;
    if (options.roleName !== undefined) {
      const mapped = registry.role_families[options.roleName];
      if (mapped === undefined)
        throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', `unknown role ${options.roleName}`);
      if (family !== undefined && family !== mapped)
        throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', '--kind and --role-name disagree');
      family = mapped;
    }
    if (family === undefined) return [base];
    const delta = registry.entries.find((entry) => entry.role === 'agent' && entry.kind === family);
    if (delta === undefined) throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', `unknown family ${family}`);
    return [base, delta];
  }
  if (options.tags !== undefined && options.tags.length > 0) {
    const selected: BootstrapEntry[] = [];
    const seen = new Set<string>();
    for (const tag of options.tags) {
      const entry = byTag.get(tag);
      if (entry === undefined) throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', `unknown tag ${tag}`);
      for (const required of entry.requires) {
        const dependency = byTag.get(required);
        if (dependency === undefined) throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', `unknown dependency ${required}`);
        if (!seen.has(dependency.tag)) {
          seen.add(dependency.tag);
          selected.push(dependency);
        }
      }
      if (!seen.has(entry.tag)) {
        seen.add(entry.tag);
        selected.push(entry);
      }
    }
    const roles = new Set(selected.map((entry) => entry.role));
    if (roles.size !== 1) throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', 'tags must share one role');
    const bases = selected.filter((entry) => entry.kind === 'base');
    const deltas = selected.filter((entry) => entry.kind !== 'base');
    if (bases.length !== 1 || deltas.length > 1)
      throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', 'tags must select one base and at most one delta');
    return sortEntries(selected);
  }
  if (options.kind !== undefined || options.roleName !== undefined)
    throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', 'role is required');
  return [byTag.get('bootstrap-orchestrator')!];
}

function sortEntries(entries: readonly BootstrapEntry[]): readonly BootstrapEntry[] {
  return [...entries].sort((left, right) => {
    if (left.kind === 'base' && right.kind !== 'base') return -1;
    if (right.kind === 'base' && left.kind !== 'base') return 1;
    if (left.order !== right.order) return left.order - right.order;
    return left.tag.localeCompare(right.tag, 'en');
  });
}

export function composeBootstrap(root: string, options: BootstrapOptions): BootstrapResult {
  const registry = parseRegistry(JSON.parse(readFileSync(path.join(root, 'bootstrap.registry.json'), 'utf8')));
  const entries = sortEntries(selectEntries(registry, options));
  const instructions = entries.map((entry) => {
    const content = canonicalContent(resolveEntryFile(root, entry));
    return { entry, content, bytes: Buffer.byteLength(content, 'utf8') };
  });
  const text = `${instructions.map((item) => item.content).join('\n\n')}\n`;
  const role = instructions[0]?.entry.role;
  if (role === undefined) throw new BootstrapError('BOOTSTRAP_SELECTION_INVALID', 'no instructions selected');
  const roleName = options.roleName ?? null;
  const kind = instructions.length === 1 ? 'base' : instructions[1]!.entry.kind;
  const explicitSelection = options.role !== undefined
    || options.kind !== undefined
    || options.roleName !== undefined
    || (options.tags !== undefined && options.tags.length > 0);
  const complete = role === 'orchestrator' || instructions.length === 2;
  const defaulted = !explicitSelection;
  const requiresRoleOrFamily = role === 'agent' && !complete;
  if (options.requireComplete === true && !complete)
    throw new BootstrapError('BOOTSTRAP_ASSIGNMENT_INCOMPLETE', 'agent base-only is inspection; provide --role-name or --kind');
  return {
    schema: 'VidaBootstrap/v1',
    role,
    roleName,
    kind,
    complete,
    defaulted,
    requiresRoleOrFamily,
    tags: instructions.map((item) => item.entry.tag),
    registryRevision: registry.revision,
    instructions: instructions.map((item) => ({
      tag: item.entry.tag,
      title: item.entry.title,
      path: item.entry.path,
      version: item.entry.version,
      bytes: item.bytes,
    })),
    text,
    digest: createHash('sha256').update(text, 'utf8').digest('hex'),
    textBytes: Buffer.byteLength(text, 'utf8'),
  };
}

export function listBootstrap(root: string): {
  readonly schema: 'VidaBootstrapList/v1';
  readonly registryRevision: number;
  readonly entries: readonly { readonly tag: string; readonly role: BootstrapRole; readonly kind: BootstrapKind; readonly title: string; readonly order: number }[];
  readonly roleFamilies: Readonly<Record<string, Exclude<BootstrapKind, 'base'>>>;
} {
  const registry = parseRegistry(JSON.parse(readFileSync(path.join(root, 'bootstrap.registry.json'), 'utf8')));
  return {
    schema: 'VidaBootstrapList/v1',
    registryRevision: registry.revision,
    entries: [...registry.entries]
      .sort((left, right) => left.order - right.order || left.tag.localeCompare(right.tag, 'en'))
      .map((entry) => ({ tag: entry.tag, role: entry.role, kind: entry.kind, title: entry.title, order: entry.order })),
    roleFamilies: registry.role_families,
  };
}

function parseArgs(argv: readonly string[]): BootstrapOptions {
  const options: { role?: BootstrapRole; kind?: Exclude<BootstrapKind, 'base'>; roleName?: string; tags?: string[]; list?: boolean; json?: boolean; requireComplete?: boolean } = {};
  const tags: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = (): string => {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--'))
        throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', `${flag} requires a value`);
      index += 1;
      return next;
    };
    if (flag === '--role') {
      if (options.role !== undefined) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--role may appear once');
      const role = value();
      if (role !== 'orchestrator' && role !== 'agent')
        throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', 'unknown role');
      options.role = role;
    } else if (flag === '--kind') {
      if (options.kind !== undefined) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--kind may appear once');
      if (tags.length > 0) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--kind cannot be combined with --tag');
      const kind = value();
      if (!bundleKinds.includes(kind as Exclude<BootstrapKind, 'base'>))
        throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', 'unknown family');
      options.kind = kind as Exclude<BootstrapKind, 'base'>;
    } else if (flag === '--role-name') {
      if (options.roleName !== undefined) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--role-name may appear once');
      if (tags.length > 0) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--role-name cannot be combined with --tag');
      options.roleName = value();
    } else if (flag === '--tag') {
      if (options.role !== undefined) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--tag cannot be combined with --role');
      if (options.kind !== undefined || options.roleName !== undefined)
        throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--tag cannot be combined with --kind or --role-name');
      tags.push(value());
    } else if (flag === '--list') {
      if (options.list === true) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--list may appear once');
      options.list = true;
    } else if (flag === '--json') {
      if (options.json === true) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--json may appear once');
      options.json = true;
    } else if (flag === '--require-complete') {
      if (options.requireComplete === true) throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--require-complete may appear once');
      options.requireComplete = true;
    } else {
      throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', `unknown option ${flag}`);
    }
  }
  if (tags.length > 0) options.tags = tags;
  if (options.list === true && options.requireComplete === true)
    throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--list cannot be combined with --require-complete');
  if (options.list === true && (options.role !== undefined || options.kind !== undefined || options.roleName !== undefined || tags.length > 0))
    throw new BootstrapError('BOOTSTRAP_ARGUMENT_INVALID', '--list cannot be combined with a selector');
  return options;
}

function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function main(argv: readonly string[] = process.argv.slice(2), root = packageRoot()): number {
  try {
    const options = parseArgs(argv);
    if (options.list === true) {
      process.stdout.write(`${JSON.stringify(listBootstrap(root))}\n`);
      return 0;
    }
    const result = composeBootstrap(root, options);
    if (options.json === true) process.stdout.write(`${JSON.stringify(result)}\n`);
    else process.stdout.write(result.text);
    return 0;
  } catch (error: unknown) {
    const code = error instanceof BootstrapError ? error.code : 'BOOTSTRAP_INTERNAL';
    const message = error instanceof Error ? error.message : 'bootstrap failed';
    process.stderr.write(`${JSON.stringify({ schema: 'VidaBootstrapError/v1', code, message })}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = main();
