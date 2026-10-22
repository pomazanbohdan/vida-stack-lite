import { lstat, mkdir, readFile, readdir, realpath, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema, validateSchemaDefinition, type Schema } from '../skills/vp-mode/scripts/schema.js';
import { FormationPayloadError, planFormationPayload } from './formation-payload.js';

export type ManifestTarget = 'portable' | 'codex' | 'claude' | 'cursor' | 'root-marketplace' | 'muse' | 'muse-package' | 'muse-catalog' | 'antigravity' | 'devin' | 'kimi';
export type ManifestCheckIssue = { readonly code: string; readonly path: string; readonly message: string };
export type ManifestContent = string | Uint8Array;
export type ManifestPlan = { readonly targets: readonly string[]; readonly files: ReadonlyMap<string, ManifestContent> };
export type ManifestCheck = { readonly ok: boolean; readonly issues: readonly ManifestCheckIssue[] };

export class ManifestBuildError extends Error {
  readonly code: string;
  readonly details: readonly string[];

  constructor(code: string, message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'ManifestBuildError';
    this.code = code;
    this.details = details;
  }
}

export const MANIFEST_TARGET_STATUS = {
  portable: { status: 'format-mapped', outputs: ['plugin.json'] },
  codex: { status: 'host-verified', outputs: ['plugin.json', '.codex-plugin/plugin.json', '.agents/plugins/marketplace.json'] },
  claude: { status: 'format-mapped', outputs: ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json'] },
  cursor: { status: 'format-mapped', outputs: ['.cursor-plugin/plugin.json', '.cursor-plugin/marketplace.json'] },
  'root-marketplace': { status: 'deferred', reason: 'The required root marketplace format is unresolved.' },
  muse: { status: 'deferred', reason: 'The package digest and root marketplace source conflict is unresolved.' },
  'muse-package': { status: 'format-mapped', outputs: ['.tmp/vp-manifest-formations/muse/plugins/vida-powers'] },
  'muse-catalog': { status: 'deferred', reason: 'The first-party Muse package digest receipt is unavailable.' },
  antigravity: { status: 'format-mapped', outputs: ['.tmp/vp-manifest-formations/antigravity'] },
  devin: { status: 'deferred', reason: 'The template convention does not establish native plugin support.' },
  kimi: { status: 'deferred', reason: 'Available evidence establishes import and conversion, not native manifest output.' },
} as const;

const schemaRelativePath = 'config/vppluginmanifest.v1.schema.json';
const inputsRelativePath = 'config/plugin-manifest-inputs.json';
const packageRelativePath = 'package.json';
const ownershipLedgerRelativePath = '.tmp/vp-manifest-ownership.json';
const transactionRelativePath = '.tmp/vp-manifest-build.transaction';
const transactionJournalFile = 'journal.json';
const formationOutputRoot = '.tmp/vp-manifest-formations';
const musePluginRoot = `${formationOutputRoot}/muse/plugins/vida-powers`;
const musePluginManifestPath = `${musePluginRoot}/.muse-plugin/plugin.json`;
const museMarketplacePath = `${formationOutputRoot}/muse/marketplace.json`;
const antigravityRoot = `${formationOutputRoot}/antigravity`;
const antigravityManifestPath = `${antigravityRoot}/plugin.json`;
const formationReceiptPath = `${formationOutputRoot}/receipts/source-payload.v1.json`;
const canonicalPluginSchema = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
const nativeSkillDirectories = ['./skills/vp-mode/', './skills/vp-setup/'] as const;
const museSkillCapabilities = [
  { id: 'vp-mode', path: 'skills/vp-mode/SKILL.md' },
  { id: 'vp-setup', path: 'skills/vp-setup/SKILL.md' },
] as const;
const nativeSkillTargets = new Set(['codex', 'claude', 'cursor', 'muse-package', 'muse-catalog', 'antigravity']);
const supportedTargetOutputs = {
  portable: MANIFEST_TARGET_STATUS.portable.outputs,
  codex: MANIFEST_TARGET_STATUS.codex.outputs,
  claude: MANIFEST_TARGET_STATUS.claude.outputs,
  cursor: MANIFEST_TARGET_STATUS.cursor.outputs,
} as const satisfies Record<'portable' | 'codex' | 'claude' | 'cursor', readonly string[]>;
const nativeFixedOutputPaths = [musePluginManifestPath, museMarketplacePath, antigravityManifestPath, formationReceiptPath] as const;
const allOutputPaths: readonly string[] = [...new Set<string>([...Object.values(supportedTargetOutputs).flat(), ...nativeFixedOutputPaths])].sort();
const outputSchemaKeys: Readonly<Record<string, string>> = {
  'plugin.json': 'portablePlugin',
  '.codex-plugin/plugin.json': 'codexCompatPlugin',
  '.agents/plugins/marketplace.json': 'codexMarketplace',
  '.claude-plugin/plugin.json': 'claudePlugin',
  '.claude-plugin/marketplace.json': 'claudeMarketplace',
  '.cursor-plugin/plugin.json': 'cursorPlugin',
  '.cursor-plugin/marketplace.json': 'cursorMarketplace',
  [musePluginManifestPath]: 'musePlugin',
  [museMarketplacePath]: 'museMarketplace',
  [antigravityManifestPath]: 'antigravityPlugin',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nodeErrorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === 'string' ? error.code : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function manifestCheckIssueDetails(issues: readonly ManifestCheckIssue[]): string[] {
  const details: string[] = [];
  for (const issue of issues) details.push(`${issue.code}: ${issue.path}`);
  return details;
}

function parseJson(raw: string, path: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new ManifestBuildError('MANIFEST_JSON_INVALID', `Invalid JSON in ${path}.`, [errorMessage(error)]);
  }
}

function rejectDigestClaims(value: unknown): void {
  const claims: { path: string; value: unknown }[] = [];
  const visit = (candidate: unknown, path: string): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!isRecord(candidate)) return;
    for (const [key, child] of Object.entries(candidate)) {
      const childPath = `${path}.${key}`;
      if (/(?:^|_)digest$/iu.test(key) || /digest/iu.test(key)) claims.push({ path: childPath, value: child });
      visit(child, childPath);
    }
  };
  visit(value, '$');
  const malformed = claims.find(({ value: claim }) => typeof claim !== 'string' || !/^sha256:[0-9a-f]{64}$/iu.test(claim));
  if (malformed !== undefined) {
    throw new ManifestBuildError('MANIFEST_MUSE_DIGEST_INVALID', 'A supplied Muse digest must use the sha256:<64 hex> format.', [malformed.path]);
  }
  const unproven = claims[0];
  if (unproven !== undefined) {
    throw new ManifestBuildError('MANIFEST_MUSE_DIGEST_UNPROVEN', 'A supplied Muse digest has no first-party receipt bound to the current Muse payload.', [unproven.path]);
  }
}

function manifestContentBytes(content: ManifestContent): Buffer {
  return typeof content === 'string' ? Buffer.from(content, 'utf8') : Buffer.from(content);
}

async function readRequiredJson(root: string, path: string, missingCode: string): Promise<unknown> {
  const absolutePath = resolve(root, ...path.split('/'));
  try {
    const rootReal = await realpath(root);
    const fileReal = await realpath(absolutePath);
    if (!isWithin(rootReal, fileReal)) {
      throw new ManifestBuildError('MANIFEST_INPUT_UNSAFE', `Input path escapes project root: ${path}.`);
    }
    return parseJson(await readFile(fileReal, 'utf8'), path);
  } catch (error) {
    if (error instanceof ManifestBuildError) throw error;
    if (nodeErrorCode(error) === 'ENOENT') {
      throw new ManifestBuildError(missingCode, `Required input is missing: ${path}.`, [path]);
    }
    throw new ManifestBuildError('MANIFEST_INPUT_READ_FAILED', `Cannot read input: ${path}.`, [errorMessage(error)]);
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new ManifestBuildError('MANIFEST_INPUT_INVALID', `${label} must be a JSON object.`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ManifestBuildError('MANIFEST_INPUT_INVALID', `${label} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : requireString(value, label);
}

function isWithin(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === '' || (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath));
}

function sortedJson(value: unknown): string {
  const normalize = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(normalize);
    if (isRecord(candidate)) {
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(candidate).sort()) output[key] = normalize(candidate[key]);
      return output;
    }
    return candidate;
  };
  const serialized = JSON.stringify(normalize(value), null, 2);
  if (serialized === undefined) throw new ManifestBuildError('MANIFEST_OUTPUT_INVALID', 'Manifest output is not JSON serializable.');
  return `${serialized}\n`;
}

function getOutputSchema(schema: Schema, key: string): Schema {
  const definitions = schema.definitions;
  if (!isRecord(definitions) || !isRecord(definitions[key])) {
    throw new ManifestBuildError('MANIFEST_SCHEMA_INVALID', `Missing output schema definition: ${key}.`);
  }
  return definitions[key];
}

function validateOutput(schema: Schema, path: string, value: Record<string, unknown>): string {
  const schemaKey = outputSchemaKeys[path];
  if (schemaKey === undefined) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Unowned output path: ${path}.`);
  const outputSchema = getOutputSchema(schema, schemaKey);
  const validationSchema: Schema = { ...outputSchema, definitions: schema.definitions };
  const errors = validateAgainstSchema(value, validationSchema);
  if (errors.length > 0) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_INVALID', `Generated ${path} does not match its format schema.`, errors);
  }
  return sortedJson(value);
}

function validatePackageIdentity(value: unknown): { name: string; version: string; description: string } {
  const packageMetadata = requireRecord(value, 'package.json');
  const name = requireString(packageMetadata.name, 'package.json.name');
  const version = requireString(packageMetadata.version, 'package.json.version');
  const description = requireString(packageMetadata.description, 'package.json.description');
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(name) || name.includes('..') || name.includes('--')) {
    throw new ManifestBuildError('MANIFEST_PACKAGE_INVALID', 'package.json.name must be a lowercase plugin identifier.');
  }
  return { name, version, description };
}

function deferredTarget(target: string): ManifestBuildError {
  const status = MANIFEST_TARGET_STATUS[target as keyof typeof MANIFEST_TARGET_STATUS];
  const reason = status?.status === 'deferred' ? status.reason : 'Target is not supported.';
  return new ManifestBuildError('MANIFEST_TARGET_DEFERRED', `Manifest target is deferred: ${target}.`, [reason]);
}

export async function buildManifestPlan(projectRoot: string): Promise<ManifestPlan> {
  const root = resolve(projectRoot);
  const rawSchema = await readRequiredJson(root, schemaRelativePath, 'MANIFEST_SCHEMA_MISSING');
  if (!isRecord(rawSchema)) throw new ManifestBuildError('MANIFEST_SCHEMA_INVALID', 'Manifest schema must be a JSON object.');
  const schema: Schema = rawSchema;
  const schemaErrors = validateSchemaDefinition(schema);
  if (schemaErrors.length > 0) throw new ManifestBuildError('MANIFEST_SCHEMA_INVALID', 'Manifest schema uses invalid or unsupported keywords.', schemaErrors);

  const inputs = await readRequiredJson(root, inputsRelativePath, 'MANIFEST_INPUT_MISSING');
  rejectDigestClaims(inputs);
  const inputErrors = validateAgainstSchema(inputs, schema);
  if (inputErrors.length > 0) throw new ManifestBuildError('MANIFEST_INPUT_INVALID', 'Manifest inputs failed schema validation.', inputErrors);
  const input = requireRecord(inputs, 'manifest inputs');
  const targetsValue = input.targets;
  if (!Array.isArray(targetsValue) || !targetsValue.every((target) => typeof target === 'string')) {
    throw new ManifestBuildError('MANIFEST_INPUT_INVALID', 'Manifest targets must be strings.');
  }
  const targets = [...new Set(targetsValue)].sort();
  if (targets.length !== targetsValue.length) throw new ManifestBuildError('MANIFEST_INPUT_INVALID', 'Manifest targets must be unique.');
  for (const target of targets) {
    const status = MANIFEST_TARGET_STATUS[target as keyof typeof MANIFEST_TARGET_STATUS];
    if (target === 'muse-catalog') {
      throw new ManifestBuildError(
        'MANIFEST_MUSE_CATALOG_NOT_READY',
        'Muse catalog formation requires a first-party digest receipt bound to the exact current package payload.',
        ['integrity.digest'],
      );
    }
    if (status === undefined || status.status === 'deferred') throw deferredTarget(target);
  }

  const metadata = requireRecord(input.metadata, 'manifest inputs.metadata');
  const needsOwnerName = targets.some((target) => target === 'codex' || target === 'claude' || target === 'cursor');
  const contactValue = metadata.contact;
  const contact = contactValue === undefined ? undefined : requireRecord(contactValue, 'manifest inputs.metadata.contact');
  const contactName = contact === undefined
    ? undefined
    : requireString(contact.name, 'metadata.contact.name');
  if (needsOwnerName && contactName === undefined) {
    throw new ManifestBuildError('MANIFEST_INPUT_INVALID', 'Selected host marketplace targets require metadata.contact.name.', ['metadata.contact.name']);
  }
  const email = contact === undefined ? undefined : optionalString(contact.email, 'metadata.contact.email');
  const author = contactName === undefined
    ? undefined
    : { name: contactName, ...(email === undefined ? {} : { email }) };
  const license = optionalString(metadata.license, 'metadata.license');
  const privacyPolicyUrl = optionalString(metadata.privacyPolicyUrl, 'metadata.privacyPolicyUrl');
  const termsOfServiceUrl = optionalString(metadata.termsOfServiceUrl, 'metadata.termsOfServiceUrl');
  const category = targets.includes('codex') ? requireString(metadata.category, 'metadata.category') : undefined;
  const identity = validatePackageIdentity(await readRequiredJson(root, packageRelativePath, 'MANIFEST_PACKAGE_MISSING'));
  const plugin = {
    name: identity.name,
    version: identity.version,
    description: identity.description,
  };
  const optionalPluginMetadata = {
    ...(author === undefined ? {} : { author }),
    ...(license === undefined ? {} : { license }),
  };
  const interfaceMetadata = {
    ...(author === undefined ? {} : { developerName: author.name }),
    ...(category === undefined ? {} : { category }),
    ...(privacyPolicyUrl === undefined ? {} : { privacyPolicyURL: privacyPolicyUrl }),
    ...(termsOfServiceUrl === undefined ? {} : { termsOfServiceURL: termsOfServiceUrl }),
  };
  const files = new Map<string, ManifestContent>();
  const add = (path: string, value: Record<string, unknown>): void => {
    const content = validateOutput(schema, path, value);
    const previous = files.get(path);
    if (previous !== undefined && previous !== content) {
      throw new ManifestBuildError('MANIFEST_OUTPUT_CONFLICT', `Targets produced different content for ${path}.`);
    }
    files.set(path, content);
  };
  const addRaw = (path: string, content: Buffer): void => {
    const previous = files.get(path);
    if (previous !== undefined && !manifestContentBytes(previous).equals(content)) {
      throw new ManifestBuildError('MANIFEST_OUTPUT_CONFLICT', `Targets produced different content for ${path}.`);
    }
    files.set(path, Buffer.from(content));
  };

  for (const target of targets) {
    const configuredOutputs = supportedTargetOutputs[target as keyof typeof supportedTargetOutputs];
    if (configuredOutputs === undefined) {
      if (target === 'muse-package' || target === 'antigravity') continue;
      throw deferredTarget(target);
    }
    if (target === 'portable' || target === 'codex') {
      add('plugin.json', {
        ...plugin,
        ...optionalPluginMetadata,
        $schema: canonicalPluginSchema,
      });
      if (target === 'codex') {
        add('.codex-plugin/plugin.json', {
          ...plugin,
          author,
          ...(license === undefined ? {} : { license }),
          skills: './skills/',
          interface: interfaceMetadata,
        });
        add('.agents/plugins/marketplace.json', {
          name: identity.name,
          plugins: [{
            name: identity.name,
            version: identity.version,
            description: identity.description,
            ...(license === undefined ? {} : { license }),
            category,
            source: { source: 'local', path: './' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
          }],
        });
      }
    }
    if (target === 'claude') {
      add('.claude-plugin/plugin.json', {
        ...plugin,
        ...optionalPluginMetadata,
        skills: [...nativeSkillDirectories],
      });
      add('.claude-plugin/marketplace.json', {
        name: identity.name,
        description: identity.description,
        owner: author,
        plugins: [{
          name: identity.name,
          source: './',
          description: identity.description,
          version: identity.version,
          ...(license === undefined ? {} : { license }),
        }],
      });
    }
    if (target === 'cursor') {
      add('.cursor-plugin/plugin.json', {
        ...plugin,
        ...optionalPluginMetadata,
        skills: [...nativeSkillDirectories],
      });
      add('.cursor-plugin/marketplace.json', {
        name: identity.name,
        owner: author,
        plugins: [{
          name: identity.name,
          source: './',
          description: identity.description,
          version: identity.version,
          ...(license === undefined ? {} : { license }),
        }],
      });
    }
  }

  const formsNativePackage = targets.includes('muse-package') || targets.includes('antigravity');
  let nativePayload: Awaited<ReturnType<typeof planFormationPayload>> | undefined;
  if (formsNativePackage) {
    const emptyPlan: ManifestPlan = { targets, files: new Map() };
    const existing = await preflightManifestPlan(root, emptyPlan);
    if (existing.conflicts.length > 0) {
      throw new ManifestBuildError(
        'MANIFEST_OUTPUT_CONFLICT',
        'Foreign or manually changed output prevents native payload formation.',
        existing.conflicts.map(({ path, reason }) => `${reason}: ${path}`),
      );
    }
    try {
      nativePayload = await planFormationPayload(root, [
        ...Object.keys(outputSchemaKeys).filter((path) => !path.startsWith(`${formationOutputRoot}/`)),
        '.muse-plugin/plugin.json',
        'marketplace.json',
      ]);
    } catch (error) {
      if (error instanceof FormationPayloadError) throw new ManifestBuildError(error.code, error.message, error.details);
      throw error;
    }
    if (targets.includes('muse-package')) {
      for (const [path, content] of nativePayload.files) addRaw(`${musePluginRoot}/${path}`, content);
      add(musePluginManifestPath, {
        schemaVersion: 1,
        name: identity.name,
        version: identity.version,
        description: identity.description,
        compat: { manifestDir: '.muse-plugin' },
        capabilities: { skills: [...museSkillCapabilities] },
      });
    }
    if (targets.includes('antigravity')) {
      for (const [path, content] of nativePayload.files) addRaw(`${antigravityRoot}/${path}`, content);
      add(antigravityManifestPath, { name: identity.name, description: identity.description });
    }
    addRaw(formationReceiptPath, nativePayload.receipt);
  }

  const expectedOutputs = new Set<string>(targets.flatMap((target) => [...(supportedTargetOutputs[target as keyof typeof supportedTargetOutputs] ?? [])]));
  if (nativePayload !== undefined) {
    if (targets.includes('muse-package')) {
      expectedOutputs.add(musePluginManifestPath);
      for (const path of nativePayload.files.keys()) expectedOutputs.add(`${musePluginRoot}/${path}`);
    }
    if (targets.includes('antigravity')) {
      expectedOutputs.add(antigravityManifestPath);
      for (const path of nativePayload.files.keys()) expectedOutputs.add(`${antigravityRoot}/${path}`);
    }
    expectedOutputs.add(formationReceiptPath);
  }
  if ([...files.keys()].some((path) => !expectedOutputs.has(path)) || [...expectedOutputs].some((path) => !files.has(path))) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_INVALID', 'Generated output paths do not match the selected target map.');
  }
  const sortedFiles = new Map([...files.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0));
  return { targets, files: sortedFiles };
}

function validateRelativeOutputPath(path: string): string[] {
  if (path.length === 0 || path.includes('\\') || path.includes(':') || path.startsWith('/') || /^[a-z]:/iu.test(path)) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Output path must be a fixed relative path: ${path}.`);
  }
  const segments = path.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Output path contains an unsafe segment: ${path}.`);
  }
  return segments;
}

function isAllowedOutputPath(path: string): boolean {
  if (allOutputPaths.includes(path)) return true;
  if (!path.startsWith(`${formationOutputRoot}/`)) return false;
  const relativePath = path.slice(formationOutputRoot.length + 1);
  try {
    const segments = validateRelativeOutputPath(relativePath);
    return !segments.some((segment) => ['.tmp', '.git', '.hg', '.svn', 'node_modules', 'coverage'].includes(segment));
  } catch {
    return false;
  }
}

async function assertSafeOutputPaths(projectRoot: string, paths: readonly string[]): Promise<void> {
  let rootReal: string;
  try {
    rootReal = await realpath(projectRoot);
  } catch (error) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Project root is not an existing directory.', [errorMessage(error)]);
  }
  for (const path of paths) {
    const segments = validateRelativeOutputPath(path);
    let cursor = rootReal;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === undefined) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Invalid output path: ${path}.`);
      cursor = join(cursor, segment);
      try {
        const item = await lstat(cursor);
        if (item.isSymbolicLink()) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Output path traverses a symlink or junction: ${path}.`);
        const resolved = await realpath(cursor);
        if (!isWithin(rootReal, resolved)) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Output path escapes project root: ${path}.`);
        if (index < segments.length - 1 && !item.isDirectory()) {
          throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Output parent is not a directory: ${path}.`);
        }
        if (index === segments.length - 1 && !item.isFile()) {
          throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Output target is not a regular file: ${path}.`);
        }
      } catch (error) {
        if (error instanceof ManifestBuildError) throw error;
        if (nodeErrorCode(error) === 'ENOENT' || nodeErrorCode(error) === 'ENOTDIR') break;
        throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', `Cannot inspect output path: ${path}.`, [errorMessage(error)]);
      }
    }
  }
}

async function assertRequiredNativeSkills(projectRoot: string, targets: readonly string[]): Promise<void> {
  if (!targets.some((target) => nativeSkillTargets.has(target))) return;
  let rootReal: string;
  try {
    rootReal = await realpath(projectRoot);
  } catch (error) {
    throw new ManifestBuildError('MANIFEST_SKILL_RESOURCE_INVALID', 'Cannot resolve the package root for native skill resources.', [errorMessage(error)]);
  }
  for (const directory of nativeSkillDirectories) {
    const resourcePath = `${directory}SKILL.md`;
    const segments = resourcePath.split('/').filter((segment) => segment !== '' && segment !== '.');
    let cursor = rootReal;
    try {
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        if (segment === undefined) throw new Error(`Invalid native skill path: ${resourcePath}`);
        cursor = join(cursor, segment);
        const entry = await lstat(cursor);
        if (entry.isSymbolicLink() || (index < segments.length - 1 ? !entry.isDirectory() : !entry.isFile())) {
          throw new Error(`Native skill resource is not a rooted regular file: ${resourcePath}`);
        }
        const resolved = await realpath(cursor);
        if (!isWithin(rootReal, resolved)) throw new Error(`Native skill resource escapes the package root: ${resourcePath}`);
      }
    } catch (error) {
      throw new ManifestBuildError('MANIFEST_SKILL_RESOURCE_INVALID', `Required native skill resource is missing or unsafe: ${resourcePath}.`, [errorMessage(error)]);
    }
  }
}

type ManifestOwnership = { readonly files: Readonly<Record<string, string>>; readonly raw: Buffer | undefined };
type ManifestOwnershipConflict = { readonly path: string; readonly reason: 'unowned' | 'changed-owned' };
type ManifestPreflight = {
  readonly ownership: ManifestOwnership;
  readonly outputs: ReadonlyMap<string, Buffer | undefined>;
  readonly conflicts: readonly ManifestOwnershipConflict[];
};
type ManifestMutation = {
  readonly path: string;
  readonly action: 'write' | 'delete';
  readonly previous: Buffer | undefined;
  readonly next: Buffer | undefined;
  readonly stagedFile: string | undefined;
  readonly backupFile: string | undefined;
  applied: boolean;
};
type ManifestApplyResult = { readonly written: readonly string[]; readonly removed: readonly string[] };

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function sameBytes(left: Buffer | undefined, right: Buffer | undefined): boolean {
  return left === undefined ? right === undefined : right !== undefined && left.equals(right);
}

async function assertSafeOperationalPaths(projectRoot: string, allowPendingTransaction = false): Promise<boolean> {
  let rootReal: string;
  try {
    rootReal = await realpath(projectRoot);
  } catch (error) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Project root is not an existing directory.', [errorMessage(error)]);
  }
  const scratchPath = join(rootReal, '.tmp');
  let scratch: Awaited<ReturnType<typeof lstat>> | undefined;
  try {
    scratch = await lstat(scratchPath);
  } catch (error) {
    if (nodeErrorCode(error) === 'ENOENT') return false;
    throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', 'Cannot inspect manifest ownership state.', [errorMessage(error)]);
  }
  if (scratch.isSymbolicLink() || !scratch.isDirectory()) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Manifest ownership state must be stored in a regular .tmp directory.');
  }
  const scratchReal = await realpath(scratchPath);
  if (!isWithin(rootReal, scratchReal)) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Manifest ownership state escapes the project root.');
  }

  const ledgerPath = resolve(scratchReal, ...validateRelativeOutputPath(ownershipLedgerRelativePath));
  try {
    const ledgerStat = await lstat(ledgerPath);
    if (ledgerStat.isSymbolicLink() || !ledgerStat.isFile()) {
      throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Manifest ownership ledger must be a regular file.');
    }
    if (!isWithin(rootReal, await realpath(ledgerPath))) {
      throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Manifest ownership ledger escapes the project root.');
    }
  } catch (error) {
    if (error instanceof ManifestBuildError) throw error;
    if (nodeErrorCode(error) !== 'ENOENT') {
      throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', 'Cannot inspect manifest ownership ledger.', [errorMessage(error)]);
    }
  }

  const transactionPath = resolve(rootReal, ...validateRelativeOutputPath(transactionRelativePath));
  try {
    const transactionStat = await lstat(transactionPath);
    if (transactionStat.isSymbolicLink() || !transactionStat.isDirectory()) {
      throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Manifest transaction state must be a regular directory.');
    }
    if (!isWithin(rootReal, await realpath(transactionPath))) {
      throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Manifest transaction state escapes the project root.');
    }
    if (!allowPendingTransaction) return true;
  } catch (error) {
    if (error instanceof ManifestBuildError) throw error;
    if (nodeErrorCode(error) !== 'ENOENT') {
      throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', 'Cannot inspect manifest transaction state.', [errorMessage(error)]);
    }
  }
  return false;
}

async function readOwnershipLedger(projectRoot: string): Promise<ManifestOwnership> {
  const absolute = resolve(projectRoot, ...validateRelativeOutputPath(ownershipLedgerRelativePath));
  let raw: Buffer;
  try {
    raw = await readFile(absolute);
  } catch (error) {
    if (nodeErrorCode(error) === 'ENOENT') return { files: {}, raw: undefined };
    throw new ManifestBuildError('MANIFEST_OWNERSHIP_READ_FAILED', 'Cannot read manifest ownership ledger.', [errorMessage(error)]);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw.toString('utf8')) as unknown;
  } catch (error) {
    throw new ManifestBuildError('MANIFEST_OWNERSHIP_INVALID', 'Manifest ownership ledger is not valid JSON.', [errorMessage(error)]);
  }
  if (!isRecord(value) || Object.keys(value).sort().join(',') !== 'files,schema' || value.schema !== 'VPManifestOwnership/v1' || !isRecord(value.files)) {
    throw new ManifestBuildError('MANIFEST_OWNERSHIP_INVALID', 'Manifest ownership ledger has an unsupported shape.');
  }
  const files: Record<string, string> = {};
  for (const [path, digest] of Object.entries(value.files)) {
    if (!isAllowedOutputPath(path) || typeof digest !== 'string' || !/^[0-9a-f]{64}$/u.test(digest)) {
      throw new ManifestBuildError('MANIFEST_OWNERSHIP_INVALID', 'Manifest ownership ledger contains an unknown path or invalid SHA256.', [`${path}: ${String(digest)}`]);
    }
    files[path] = digest;
  }
  return { files, raw };
}

async function readFormationOutputFiles(projectRoot: string): Promise<ReadonlyMap<string, Buffer>> {
  const root = resolve(projectRoot);
  const rootReal = await realpath(root);
  const outputRoot = resolve(root, ...validateRelativeOutputPath(formationOutputRoot));
  let outputStat: Awaited<ReturnType<typeof lstat>>;
  try {
    outputStat = await lstat(outputRoot);
  } catch (error) {
    if (nodeErrorCode(error) === 'ENOENT') return new Map();
    throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', 'Cannot inspect native formation output root.', [errorMessage(error)]);
  }
  if (outputStat.isSymbolicLink() || !outputStat.isDirectory()) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Native formation output root must be a regular directory.');
  }
  const outputRootReal = await realpath(outputRoot);
  if (!isWithin(rootReal, outputRootReal)) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Native formation output root escapes the package root.');
  }

  const files = new Map<string, Buffer>();
  const visit = async (directory: string, prefix: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', `Cannot read native formation output directory: ${prefix}.`, [errorMessage(error)]);
    }
    entries.sort((left, right) => Buffer.compare(Buffer.from(left.name, 'utf8'), Buffer.from(right.name, 'utf8')));
    for (const entry of entries) {
      const relativePath = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      const path = `${formationOutputRoot}/${relativePath}`;
      validateRelativeOutputPath(path);
      if (!isAllowedOutputPath(path)) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Unowned path inside native formation output root: ${path}.`);
      const absolute = join(directory, entry.name);
      let item: Awaited<ReturnType<typeof lstat>>;
      try {
        item = await lstat(absolute);
      } catch (error) {
        throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', `Cannot inspect native formation output: ${path}.`, [errorMessage(error)]);
      }
      if (item.isSymbolicLink()) {
        throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Native formation output contains a symlink or junction: ${path}.`);
      }
      if (item.isDirectory()) {
        const resolved = await realpath(absolute);
        if (!isWithin(outputRootReal, resolved)) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Native formation output directory escapes its root: ${path}.`);
        await visit(absolute, relativePath);
        continue;
      }
      if (!item.isFile()) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Native formation output is not a regular file: ${path}.`);
      const resolved = await realpath(absolute);
      if (!isWithin(outputRootReal, resolved)) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Native formation output escapes its root: ${path}.`);
      let bytes: Buffer;
      try {
        bytes = await readFile(absolute);
      } catch (error) {
        throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', `Cannot read native formation output file: ${path}.`, [errorMessage(error)]);
      }
      files.set(path, bytes);
    }
  };
  await visit(outputRoot, '');
  return files;
}

async function preflightManifestPlan(projectRoot: string, plan: ManifestPlan): Promise<ManifestPreflight> {
  if (await assertSafeOperationalPaths(projectRoot)) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_RECOVERY_REQUIRED', 'A previous manifest transaction remains; reconcile it before another build.', [transactionRelativePath]);
  }
  const ownership = await readOwnershipLedger(projectRoot);
  const currentNativeFiles = await readFormationOutputFiles(projectRoot);
  const candidatePaths = [...new Set<string>([
    ...allOutputPaths,
    ...Object.keys(ownership.files),
    ...currentNativeFiles.keys(),
    ...plan.files.keys(),
  ])].sort();
  await assertSafeOutputPaths(projectRoot, candidatePaths);
  await assertRequiredNativeSkills(projectRoot, plan.targets);
  const outputs = new Map<string, Buffer | undefined>();
  const conflicts: ManifestOwnershipConflict[] = [];
  for (const path of candidatePaths) {
    const current = currentNativeFiles.get(path) ?? await readOptionalFile(projectRoot, path);
    outputs.set(path, current);
    if (current === undefined) continue;
    const recordedDigest = ownership.files[path];
    if (recordedDigest === undefined) conflicts.push({ path, reason: 'unowned' });
    else if (sha256(current) !== recordedDigest) conflicts.push({ path, reason: 'changed-owned' });
  }
  return { ownership, outputs, conflicts };
}

function ownershipLedgerContent(plan: ManifestPlan): Buffer {
  const files: Record<string, string> = {};
  for (const [path, content] of plan.files) files[path] = sha256(manifestContentBytes(content));
  return Buffer.from(`${JSON.stringify({ schema: 'VPManifestOwnership/v1', files }, null, 2)}\n`, 'utf8');
}

async function readOptionalFile(projectRoot: string, path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(resolve(projectRoot, ...validateRelativeOutputPath(path)));
  } catch (error) {
    if (nodeErrorCode(error) === 'ENOENT' || nodeErrorCode(error) === 'ENOTDIR') return undefined;
    throw new ManifestBuildError('MANIFEST_OUTPUT_READ_FAILED', `Cannot read generated file: ${path}.`, [errorMessage(error)]);
  }
}

function transactionJournal(state: string, mutations: readonly ManifestMutation[]): string {
  return `${JSON.stringify({
    schema: 'VPManifestBuildTransaction/v1',
    state,
    operations: mutations.map((mutation) => ({
      path: mutation.path,
      action: mutation.action,
      hadPrevious: mutation.previous !== undefined,
      stagedFile: mutation.stagedFile,
      backupFile: mutation.backupFile,
      applied: mutation.applied,
    })),
  }, null, 2)}\n`;
}

async function cleanupTransaction(transactionRoot: string): Promise<void> {
  try {
    await rm(transactionRoot, { recursive: true, force: true });
  } catch (error) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_RECOVERY_REQUIRED', 'Manifest transaction cleanup failed; inspect the retained transaction state before another build.', [errorMessage(error)]);
  }
}

async function rollbackTransaction(projectRoot: string, transactionRoot: string, mutations: ManifestMutation[]): Promise<string[]> {
  const errors: string[] = [];
  for (let index = mutations.length - 1; index >= 0; index -= 1) {
    const mutation = mutations[index];
    if (mutation === undefined || !mutation.applied) continue;
    try {
      if (mutation.path === ownershipLedgerRelativePath) await assertSafeOperationalPaths(projectRoot, true);
      else await assertSafeOutputPaths(projectRoot, [mutation.path]);
      const current = await readOptionalFile(projectRoot, mutation.path);
      if (sameBytes(current, mutation.previous)) {
        mutation.applied = false;
        continue;
      }
      if (!sameBytes(current, mutation.next)) {
        throw new Error(`File changed during rollback: ${mutation.path}`);
      }
      const absolute = resolve(projectRoot, ...validateRelativeOutputPath(mutation.path));
      if (mutation.previous === undefined) {
        await unlink(absolute);
      } else {
        const backupFile = mutation.backupFile;
        if (backupFile === undefined) throw new Error(`Missing staged backup for ${mutation.path}`);
        const restoreFile = join(transactionRoot, `restore-${index}.bin`);
        await writeFile(restoreFile, await readFile(join(transactionRoot, backupFile)));
        await mkdir(dirname(absolute), { recursive: true });
        await rename(restoreFile, absolute);
      }
      mutation.applied = false;
      await writeFile(join(transactionRoot, transactionJournalFile), transactionJournal('rolling-back', mutations), 'utf8');
    } catch (error) {
      errors.push(`${mutation.path}: ${errorMessage(error)}`);
    }
  }
  return errors;
}

async function applyManifestPlan(projectRoot: string, plan: ManifestPlan): Promise<ManifestApplyResult> {
  const preflight = await preflightManifestPlan(projectRoot, plan);
  const { ownership, conflicts } = preflight;
  if (conflicts.length > 0) {
    throw new ManifestBuildError('MANIFEST_OUTPUT_CONFLICT', 'Foreign or manually changed output prevents all manifest writes.', conflicts.map(({ path, reason }) => `${reason}: ${path}`));
  }
  const mutations: ManifestMutation[] = [];
  const candidatePaths = [...new Set<string>([
    ...allOutputPaths,
    ...Object.keys(ownership.files),
    ...preflight.outputs.keys(),
    ...plan.files.keys(),
  ])].sort();
  for (const path of candidatePaths) {
    const current = preflight.outputs.get(path);
    const expected = plan.files.get(path);
    if (expected === undefined) {
      if (current !== undefined) mutations.push({ path, action: 'delete', previous: current, next: undefined, stagedFile: undefined, backupFile: undefined, applied: false });
      continue;
    }
    const next = manifestContentBytes(expected);
    if (!sameBytes(current, next)) mutations.push({ path, action: 'write', previous: current, next, stagedFile: undefined, backupFile: undefined, applied: false });
  }

  const nextLedger = ownershipLedgerContent(plan);
  if (!sameBytes(ownership.raw, nextLedger)) {
    mutations.push({
      path: ownershipLedgerRelativePath,
      action: 'write',
      previous: ownership.raw,
      next: nextLedger,
      stagedFile: undefined,
      backupFile: undefined,
      applied: false,
    });
  }
  if (mutations.length === 0) return { written: [], removed: [] };

  const scratchRoot = resolve(projectRoot, '.tmp');
  const transactionRoot = resolve(projectRoot, ...validateRelativeOutputPath(transactionRelativePath));
  await mkdir(scratchRoot, { recursive: true });
  try {
    await mkdir(transactionRoot);
  } catch (error) {
    if (nodeErrorCode(error) === 'EEXIST') {
      throw new ManifestBuildError('MANIFEST_OUTPUT_RECOVERY_REQUIRED', 'A manifest transaction appeared before staging; reconcile it before another build.', [transactionRelativePath]);
    }
    throw new ManifestBuildError('MANIFEST_OUTPUT_STAGE_FAILED', 'Cannot create manifest transaction state.', [errorMessage(error)]);
  }

  const stagedMutations = mutations.map((mutation, index): ManifestMutation => ({
    ...mutation,
    stagedFile: mutation.next === undefined ? undefined : `staged-${index}.bin`,
    backupFile: mutation.previous === undefined ? undefined : `backup-${index}.bin`,
  }));
  try {
    for (const mutation of stagedMutations) {
      if (mutation.previous !== undefined && mutation.backupFile !== undefined) {
        await writeFile(join(transactionRoot, mutation.backupFile), mutation.previous);
      }
      if (mutation.next !== undefined && mutation.stagedFile !== undefined) {
        await writeFile(join(transactionRoot, mutation.stagedFile), mutation.next);
      }
    }
    await writeFile(join(transactionRoot, transactionJournalFile), transactionJournal('staged', stagedMutations), 'utf8');
  } catch (error) {
    await cleanupTransaction(transactionRoot);
    throw new ManifestBuildError('MANIFEST_OUTPUT_STAGE_FAILED', 'Cannot stage manifest transaction.', [errorMessage(error)]);
  }

  let failedPath = 'unknown';
  try {
    for (const mutation of stagedMutations) {
      failedPath = mutation.path;
      if (mutation.path === ownershipLedgerRelativePath) await assertSafeOperationalPaths(projectRoot, true);
      else await assertSafeOutputPaths(projectRoot, [mutation.path]);
      const current = await readOptionalFile(projectRoot, mutation.path);
      if (!sameBytes(current, mutation.previous)) {
        throw new ManifestBuildError('MANIFEST_OUTPUT_CONFLICT', `Output changed during manifest generation: ${mutation.path}.`);
      }
      const absolute = resolve(projectRoot, ...validateRelativeOutputPath(mutation.path));
      if (mutation.action === 'write') {
        if (mutation.stagedFile === undefined) throw new Error(`Missing staged content for ${mutation.path}`);
        await mkdir(dirname(absolute), { recursive: true });
        await rename(join(transactionRoot, mutation.stagedFile), absolute);
      } else {
        await unlink(absolute);
      }
      mutation.applied = true;
      await writeFile(join(transactionRoot, transactionJournalFile), transactionJournal('applying', stagedMutations), 'utf8');
    }
    const finalCheck = await checkManifestOutputs(projectRoot, plan);
    if (!finalCheck.ok) {
      throw new ManifestBuildError('MANIFEST_OUTPUT_VERIFY_FAILED', 'Generated outputs do not match the manifest plan.', manifestCheckIssueDetails(finalCheck.issues));
    }
    await writeFile(join(transactionRoot, transactionJournalFile), transactionJournal('committed', stagedMutations), 'utf8');
  } catch (error) {
    const failedMutation = stagedMutations.find((mutation) => mutation.path === failedPath);
    if (failedMutation !== undefined && !failedMutation.applied) {
      try {
        const current = await readOptionalFile(projectRoot, failedMutation.path);
        if (!sameBytes(current, failedMutation.previous)) failedMutation.applied = true;
      } catch {
        failedMutation.applied = true;
      }
    }
    const rollbackErrors = await rollbackTransaction(projectRoot, transactionRoot, stagedMutations);
    if (rollbackErrors.length > 0) {
      try {
        await writeFile(join(transactionRoot, transactionJournalFile), transactionJournal('recovery-required', stagedMutations), 'utf8');
      } catch (journalError) {
        rollbackErrors.push(`journal: ${errorMessage(journalError)}`);
      }
      throw new ManifestBuildError('MANIFEST_OUTPUT_RECOVERY_REQUIRED', 'Manifest transaction failed and rollback was incomplete; reconcile the retained transaction before another build.', [errorMessage(error), ...rollbackErrors]);
    }
    await cleanupTransaction(transactionRoot);
    if (error instanceof ManifestBuildError && error.code === 'MANIFEST_OUTPUT_CONFLICT') throw error;
    throw new ManifestBuildError('MANIFEST_OUTPUT_WRITE_FAILED', `Cannot apply manifest transaction at ${failedPath}.`, [errorMessage(error)]);
  }

  await cleanupTransaction(transactionRoot);
  return {
    written: stagedMutations.filter((mutation) => mutation.action === 'write' && mutation.path !== ownershipLedgerRelativePath).map((mutation) => mutation.path),
    removed: stagedMutations.filter((mutation) => mutation.action === 'delete').map((mutation) => mutation.path),
  };
}

async function validateCallerPlan(projectRoot: string, candidate: ManifestPlan): Promise<ManifestPlan> {
  const authoritative = await buildManifestPlan(projectRoot);
  const value: unknown = candidate;
  if (!isRecord(value) || !Array.isArray(value.targets) || !value.targets.every((target) => typeof target === 'string') || !(value.files instanceof Map)) {
    throw new ManifestBuildError('MANIFEST_PLAN_INVALID', 'Manifest writer requires a plan produced from the current validated inputs.');
  }
  const files = value.files as Map<unknown, unknown>;
  for (const [path, content] of files) {
    if (typeof path !== 'string') throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', 'Manifest plan contains a non-string output path.');
    validateRelativeOutputPath(path);
    if (!isAllowedOutputPath(path)) throw new ManifestBuildError('MANIFEST_OUTPUT_UNSAFE', `Unowned generated output: ${path}.`);
    if (typeof content !== 'string' && !(content instanceof Uint8Array)) {
      throw new ManifestBuildError('MANIFEST_PLAN_INVALID', `Manifest plan content must be text or bytes: ${path}.`);
    }
  }
  if (value.targets.length !== authoritative.targets.length || value.targets.some((target, index) => target !== authoritative.targets[index]) || files.size !== authoritative.files.size) {
    throw new ManifestBuildError('MANIFEST_PLAN_INVALID', 'Manifest plan does not match the current validated inputs.');
  }
  for (const [path, content] of authoritative.files) {
    const candidateContent = files.get(path);
    if (!(typeof candidateContent === 'string' || candidateContent instanceof Uint8Array)
      || !manifestContentBytes(candidateContent).equals(manifestContentBytes(content))) {
      throw new ManifestBuildError('MANIFEST_PLAN_INVALID', `Manifest plan content does not match the validated output: ${path}.`);
    }
  }
  return authoritative;
}

async function checkManifestOutputs(
  projectRoot: string,
  plan: ManifestPlan,
  checkOutputPaths = true,
  outputSnapshot?: ReadonlyMap<string, Buffer | undefined>,
): Promise<ManifestCheck> {
  const root = resolve(projectRoot);
  const currentNativeFiles = outputSnapshot === undefined ? await readFormationOutputFiles(root) : undefined;
  const paths = [...new Set<string>([
    ...allOutputPaths,
    ...plan.files.keys(),
    ...(outputSnapshot?.keys() ?? []),
    ...(currentNativeFiles?.keys() ?? []),
  ])].sort();
  if (checkOutputPaths) await assertSafeOutputPaths(root, paths);
  const expected = new Set(plan.files.keys());
  const issues: ManifestCheckIssue[] = [];
  for (const path of paths) {
    const existing = outputSnapshot === undefined
      ? currentNativeFiles?.get(path) ?? await readOptionalFile(root, path)
      : outputSnapshot.get(path);
    const desired = plan.files.get(path);
    if (existing === undefined) {
      if (expected.has(path)) issues.push({ code: 'MANIFEST_OUTPUT_MISSING', path, message: `Expected output is missing: ${path}.` });
      continue;
    }
    if (!expected.has(path)) {
      issues.push({ code: 'MANIFEST_OUTPUT_STALE', path, message: `Output is not selected by current inputs: ${path}.` });
    } else if (desired === undefined || !manifestContentBytes(desired).equals(existing)) {
      issues.push({ code: 'MANIFEST_OUTPUT_DRIFT', path, message: `Output differs from deterministic manifest: ${path}.` });
    }
  }
  return { ok: issues.length === 0, issues };
}

function ownershipConflictIssues(error: ManifestBuildError): ManifestCheckIssue[] | undefined {
  if (error.code !== 'MANIFEST_OUTPUT_CONFLICT' || error.details.length === 0) return undefined;
  const issues: ManifestCheckIssue[] = [];
  for (const detail of error.details) {
    const separator = detail.indexOf(': ');
    if (separator < 0) return undefined;
    const reason = detail.slice(0, separator);
    const path = detail.slice(separator + 2);
    if ((reason !== 'unowned' && reason !== 'changed-owned') || !isAllowedOutputPath(path)) return undefined;
    issues.push({
      code: 'MANIFEST_OUTPUT_CONFLICT',
      path,
      message: reason === 'unowned'
        ? `Output is not owned by the manifest ledger: ${path}.`
        : `Output differs from its manifest ownership digest: ${path}.`,
    });
  }
  return issues;
}

export async function checkManifestPlan(projectRoot: string, plan: ManifestPlan): Promise<ManifestCheck> {
  const root = resolve(projectRoot);
  try {
    const validatedPlan = await validateCallerPlan(root, plan);
    const preflight = await preflightManifestPlan(root, validatedPlan);
    const outputCheck = await checkManifestOutputs(root, validatedPlan, false, preflight.outputs);
    const outputIssuePaths = new Set(outputCheck.issues.map((issue) => issue.path));
    const ownershipIssues: ManifestCheckIssue[] = preflight.conflicts
      .filter(({ path }) => !outputIssuePaths.has(path))
      .map(({ path, reason }) => ({
        code: 'MANIFEST_OUTPUT_CONFLICT',
        path,
        message: reason === 'unowned'
          ? `Output is not owned by the manifest ledger: ${path}.`
          : `Output differs from its manifest ownership digest: ${path}.`,
      }));
    const issues = [...outputCheck.issues, ...ownershipIssues];
    return { ok: issues.length === 0, issues };
  } catch (error) {
    if (error instanceof ManifestBuildError) {
      const issues = ownershipConflictIssues(error);
      if (issues !== undefined) return { ok: false, issues };
    }
    throw error;
  }
}

export async function writeManifestPlan(projectRoot: string, plan: ManifestPlan): Promise<readonly string[]> {
  const root = resolve(projectRoot);
  const validatedPlan = await validateCallerPlan(root, plan);
  return (await applyManifestPlan(root, validatedPlan)).written;
}

function jsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

export async function runManifestCli(
  args: readonly string[],
  io: { readonly stdout: (text: string) => unknown; readonly stderr: (text: string) => unknown } = {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  },
): Promise<number> {
  let checkOnly = false;
  let projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--check') checkOnly = true;
    else if (arg === '--root') {
      const value = args[index + 1];
      if (value === undefined) {
        io.stderr(jsonLine({ error: { code: 'MANIFEST_ARGUMENT_INVALID', message: '--root requires a directory path.', details: [] } }));
        return 2;
      }
      if (!isAbsolute(value)) {
        io.stderr(jsonLine({ error: { code: 'MANIFEST_ARGUMENT_INVALID', message: '--root requires an absolute package-root path.', details: [value] } }));
        return 2;
      }
      projectRoot = resolve(value);
      index += 1;
    } else if (arg === '--help') {
      io.stdout('Usage: bun packages/powers/scripts/build-manifests.ts [--check] [--root <absolute-package-root>]\n');
      return 0;
    } else {
      io.stderr(jsonLine({ error: { code: 'MANIFEST_ARGUMENT_INVALID', message: `Unknown argument: ${arg}.`, details: [] } }));
      return 2;
    }
  }

  try {
    const plan = await buildManifestPlan(projectRoot);
    if (checkOnly) {
      const check = await checkManifestPlan(projectRoot, plan);
      if (!check.ok) {
        io.stderr(jsonLine({ error: { code: 'MANIFEST_CHECK_FAILED', message: 'Manifest outputs are missing, stale, or drifted.', details: manifestCheckIssueDetails(check.issues) } }));
        return 1;
      }
      const museCatalog = plan.targets.includes('muse-package')
        ? { status: 'blocked', code: 'MANIFEST_MUSE_CATALOG_NOT_READY' }
        : undefined;
      io.stdout(jsonLine({ ok: true, mode: 'check', outputs: [...plan.files.keys()], ...(museCatalog === undefined ? {} : { museCatalog }) }));
      return 0;
    }
    const applied = await applyManifestPlan(projectRoot, plan);
    const museCatalog = plan.targets.includes('muse-package')
      ? { status: 'blocked', code: 'MANIFEST_MUSE_CATALOG_NOT_READY' }
      : undefined;
    io.stdout(jsonLine({ ok: true, mode: 'build', outputs: [...plan.files.keys()], written: applied.written, removed: applied.removed, ...(museCatalog === undefined ? {} : { museCatalog }) }));
    return 0;
  } catch (error) {
    const manifestError = error instanceof ManifestBuildError
      ? error
      : new ManifestBuildError('MANIFEST_BUILD_FAILED', 'Manifest build failed.', [errorMessage(error)]);
    const checkConflict = checkOnly && manifestError.code === 'MANIFEST_OUTPUT_CONFLICT';
    const code = checkConflict ? 'MANIFEST_CHECK_FAILED' : manifestError.code;
    const message = checkConflict ? 'Manifest outputs are missing, stale, or drifted.' : manifestError.message;
    const details = checkConflict
      ? manifestError.details.map((detail) => `MANIFEST_OUTPUT_CONFLICT: ${detail.slice(detail.indexOf(': ') + 2)}`)
      : manifestError.details;
    io.stderr(jsonLine({ error: { code, message, details } }));
    return 1;
  }
}

export function startManifestCli(scriptPath: string | undefined, args: readonly string[]): void {
  if (scriptPath === undefined || resolve(scriptPath) !== fileURLToPath(import.meta.url)) return;
  void runManifestCli(args).then((exitCode) => {
    process.exitCode = exitCode;
  });
}

startManifestCli(process.argv[1], process.argv.slice(2));
