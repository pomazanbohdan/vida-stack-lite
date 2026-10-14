import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { isRecord, sha256 as sha } from '../../../packages/agent/src/contracts/forward-controller-values.ts';

type JsonRecord = Record<string, unknown>;

interface PayloadEntry extends JsonRecord {
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
  readonly source_path?: unknown;
  readonly source_sha256?: unknown;
}

interface PayloadManifest {
  readonly sha256: string;
  readonly files: Map<string, PayloadEntry>;
}

interface ForwardUpdateInput {
  readonly root: string;
  readonly oldPayloadRoot: string;
  readonly payloadRoot: string;
  readonly preserveConfiguredResearchChangelog?: boolean;
}

interface ChangedFile {
  readonly path: string;
  readonly old_sha256: string | null;
  readonly new_sha256: string;
  readonly old_size: number | null;
  readonly new_size: number;
}

interface PreservedMutableOutput {
  readonly path: string;
  readonly config_path: string;
  readonly config_pointer: string;
  readonly config_sha256: string;
  readonly staged_sha256: string;
  readonly installed_sha256_at_inspection: string;
}

export interface ForwardUpdateInspection {
  readonly schema: 'VidaForwardUpdateInspection/v1';
  readonly selector_sha256: string;
  readonly generation: string;
  readonly cutoff_witness_sha256: string;
  readonly first_admitted_work_attempt: string;
  readonly old_payload_manifest_sha256: string;
  readonly new_payload_manifest_sha256: string;
  readonly file_count: number;
  readonly changed: readonly ChangedFile[];
  readonly installed_drift: readonly string[];
  readonly added_destination_collisions: readonly string[];
  readonly preserved_mutable_outputs: readonly PreservedMutableOutput[];
  readonly installed_extra_bundle_files: readonly string[];
  readonly apply_ready: boolean;
}

const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function fail(message: string): never {
  throw new Error(`vida forward update: ${message}`);
}

function stat(file: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(file);
  } catch (error: unknown) {
    if (isRecord(error) && error.code === 'ENOENT') return null;
    throw error;
  }
}

function regular(file: string): Buffer {
  const info = stat(file);
  if (!info?.isFile() || info.isSymbolicLink()) fail(`unsafe or absent file: ${file}`);
  return readFileSync(file);
}

function directory(file: string): void {
  const info = stat(file);
  if (!info?.isDirectory() || info.isSymbolicLink()) fail(`unsafe or absent directory: ${file}`);
}

function relative(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    value.split('/').every((part) => part && part !== '.' && part !== '..' && !part.includes(':'))
  );
}

function exactKeys(value: unknown, keys: readonly string[]): value is JsonRecord {
  return isRecord(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function controllerRecord(raw: Buffer, schema: string, keys: readonly string[]): JsonRecord {
  let value: unknown;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    fail(`invalid ${schema} JSON`);
  }
  if (
    !isRecord(value) ||
    value.schema !== schema ||
    !exactKeys(value, keys) ||
    !raw.equals(Buffer.from(`${JSON.stringify(value, null, 2)}\n`))
  )
    fail(`invalid ${schema} shape or encoding`);
  return value;
}

function walkFiles(root: string, excludedTopLevel: readonly string[] = []): string[] {
  const observed: string[] = [];
  function walk(directoryPath: string, prefix: string): void {
    for (const name of readdirSync(directoryPath)) {
      if (!prefix && excludedTopLevel.includes(name)) continue;
      const local = prefix ? `${prefix}/${name}` : name;
      if (!relative(local)) fail('unsafe payload path');
      const absolute = path.join(directoryPath, name);
      const info = stat(absolute);
      if (!info) fail(`unsupported payload node: ${local}`);
      if (info.isSymbolicLink()) fail(`payload symlink: ${local}`);
      if (info.isDirectory()) walk(absolute, local);
      else if (info.isFile()) observed.push(local);
      else fail(`unsupported payload node: ${local}`);
    }
  }
  walk(root, '');
  return observed.sort();
}

function at(root: string, value: unknown): string {
  if (!relative(value)) fail(`unsafe payload path: ${String(value)}`);
  let current = root;
  for (const part of value.split('/').slice(0, -1)) {
    current = path.join(current, part);
    directory(current);
  }
  return path.join(root, ...value.split('/'));
}

function maybeAt(root: string, value: unknown): string | null {
  if (!relative(value)) fail(`unsafe relative path: ${String(value)}`);
  let current = root;
  for (const part of value.split('/').slice(0, -1)) {
    current = path.join(current, part);
    const info = stat(current);
    if (!info) return null;
    if (!info.isDirectory() || info.isSymbolicLink()) fail(`unsafe parent: ${value}`);
  }
  return path.join(current, value.split('/').at(-1) ?? '');
}

function isPayloadEntry(value: unknown, files: ReadonlyMap<string, PayloadEntry>): value is PayloadEntry {
  if (!isRecord(value) || !relative(value.path) || files.has(value.path)) return false;
  return hex(value.sha256) && Number.isSafeInteger(value.size) && typeof value.size === 'number' && value.size >= 0;
}

function manifest(root: string): PayloadManifest {
  directory(root);
  const raw = regular(path.join(root, 'vida-agent-payload.manifest.v1.json'));
  let value: unknown;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('invalid payload manifest JSON');
  }
  if (
    !isRecord(value) ||
    value.schema !== 'VidaAgentPreparedPayload/v1' ||
    !Array.isArray(value.files) ||
    !Array.isArray(value.unresolved_integration_paths) ||
    value.unresolved_integration_paths.length
  )
    fail('incomplete payload manifest');
  const files = new Map<string, PayloadEntry>();
  for (const rawEntry of value.files) {
    if (!isPayloadEntry(rawEntry, files)) fail('invalid or duplicate manifest entry');
    const entry = rawEntry;
    const actual = regular(at(root, entry.path));
    if (actual.length !== entry.size || sha(actual) !== entry.sha256) fail(`payload drift: ${entry.path}`);
    if (entry.source_path === undefined && entry.source_sha256 !== undefined && entry.source_sha256 !== entry.sha256)
      fail(`same-byte source provenance differs: ${entry.path}`);
    files.set(entry.path, entry);
  }
  const observed = walkFiles(root);
  const expected = [...files.keys(), 'vida-agent-payload.manifest.v1.json'].sort();
  if (JSON.stringify(observed.sort()) !== JSON.stringify(expected)) fail('staged payload has unmanifested files');
  return { sha256: sha(raw), files };
}

/** Verify every staged byte and path before an operational helper loads staged code. */
export function verifyStagedPayloadManifest(root: string, expectedSha: string): PayloadManifest {
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.resolve(root) !== root || !hex(expectedSha))
    fail('staged payload binding invalid');
  const verified = manifest(root);
  if (verified.sha256 !== expectedSha) fail('staged payload manifest changed');
  return verified;
}

/** Root AGENTS.md is a derived integration output of the selected bundle template. */
export function assertGeneratedRootAgents(payloadRoot: string): void {
  const staged = path.resolve(payloadRoot);
  const template = regular(at(staged, 'vida-agent/templates/AGENTS.template.md')).toString('utf8');
  if (!template.includes('{{BUNDLE}}') || !template.includes('project-sidecar: AGENT.sidecar.md'))
    fail('root AGENTS template identity invalid');
  const generated = template.replaceAll('{{BUNDLE}}', 'vida-agent');
  if (
    generated.includes('{{') ||
    !generated.includes('managed-by: agent-runtime') ||
    !generated.includes('project-sidecar: AGENT.sidecar.md')
  )
    fail('generated root AGENTS identity invalid');
  if (!regular(at(staged, 'AGENTS.md')).equals(Buffer.from(generated, 'utf8')))
    fail('root AGENTS differs from selected bundle template');
}

/** Retirement changes manifest ownership only; exact installed local files remain. */
export function assertProjectOwnedIntegrationRetirement(
  root: string,
  oldFiles: ReadonlyMap<string, PayloadEntry>,
  nextFiles: ReadonlyMap<string, PayloadEntry>,
): string[] {
  const retired = [...oldFiles.keys()].filter((item) => !nextFiles.has(item)).sort();
  if (
    retired.length &&
    JSON.stringify(retired) !== JSON.stringify(['AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
  )
    fail('only the complete project-owned integration pair may retire');
  for (const relativePath of retired) {
    const location = at(root, relativePath);
    const before = oldFiles.get(relativePath);
    if (
      !before ||
      stat(location)?.nlink !== 1 ||
      sha(regular(location)) !== before.sha256 ||
      regular(location).length !== before.size
    )
      fail(`retired project file changed: ${relativePath}`);
  }
  return retired;
}

function currentConfiguredChangelog(project: string): string {
  const code =
    'const {loadRuntimeConfig}=await import("./src/config/runtime-config.ts"); const config=loadRuntimeConfig(process.argv.at(-1)); console.log(JSON.stringify({path:config.research_decision.paths.changelog}));';
  const result = spawnSync(process.execPath, [path.join(project, 'vida-agent/bin/bun.mjs'), '-e', code, project], {
    cwd: path.join(project, 'vida-agent'),
    windowsHide: true,
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (result.error || result.status !== 0) fail('current project configuration validation failed');
  let value: unknown;
  try {
    value = JSON.parse(result.stdout.trim());
  } catch {
    fail('validated changelog result invalid');
  }
  if (!isRecord(value) || !relative(value.path)) fail('validated current changelog path unsafe');
  return value.path;
}

/** Read-only preflight; apply/resume belongs to a later slice. */
export function inspectForwardUpdate({
  root,
  oldPayloadRoot,
  payloadRoot,
  preserveConfiguredResearchChangelog = false,
}: ForwardUpdateInput): ForwardUpdateInspection {
  const project = path.resolve(root);
  directory(project);
  const selectorRaw = regular(at(project, '.agent/active-runtime-selector.v1.json'));
  const selector = controllerRecord(selectorRaw, 'ActiveRuntimeSelector/v1', [
    'schema',
    'generation',
    'runtime',
    'bundle_root',
    'config_path',
    'archive_manifest_sha256',
    'plan_sha256',
    'payload_manifest_sha256',
    'state_policy',
    'activation_decision_sha256',
  ]);
  if (
    selector.runtime !== 'vida-agent' ||
    !hex(selector.payload_manifest_sha256) ||
    !hex(selector.activation_decision_sha256) ||
    !relative(selector.bundle_root) ||
    selector.bundle_root !== 'vida-agent' ||
    typeof selector.generation !== 'string' ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(selector.generation)
  )
    fail('active selector identity invalid');
  const cutoffRaw = regular(at(project, `.agent/cutover/${selector.generation}/cutoff-witness.json`));
  const cutoff = controllerRecord(cutoffRaw, 'VidaNewWorkCutoffWitness/v1', [
    'schema',
    'generation',
    'selector_sha256',
    'first_admitted_work_attempt',
  ]);
  if (
    cutoff.generation !== selector.generation ||
    cutoff.selector_sha256 !== sha(selectorRaw) ||
    typeof cutoff.first_admitted_work_attempt !== 'string' ||
    !cutoff.first_admitted_work_attempt
  )
    fail('forward update requires a bound post-cutoff work witness');
  const old = manifest(path.resolve(oldPayloadRoot));
  const next = manifest(path.resolve(payloadRoot));
  if (selector.payload_manifest_sha256 !== old.sha256) fail('active selector and parent manifest differ');
  if (old.sha256 === next.sha256) fail('successor manifest is unchanged');
  const nextPaths = [...next.files.keys()].sort();
  assertProjectOwnedIntegrationRetirement(project, old.files, next.files);
  const changed: ChangedFile[] = [];
  const installedDrift: string[] = [];
  const addedDestinationCollisions: string[] = [];
  const preservedMutableOutputs: PreservedMutableOutput[] = [];
  let configuredChangelog: string | null = null;
  if (preserveConfiguredResearchChangelog) {
    const configPath = 'agent-runtime.config.v1.yaml';
    const configEntry = old.files.get(configPath);
    const nextConfig = next.files.get(configPath);
    const configRaw = regular(at(project, configPath));
    if (
      (configEntry && sha(configRaw) !== configEntry.sha256) ||
      (configEntry && nextConfig && configEntry.sha256 !== nextConfig.sha256)
    )
      fail('configured mutable output source differs');
    // Verify selected bundle bytes before executing its configuration reader.
    for (const [relativePath, entry] of old.files)
      if (relativePath.startsWith('vida-agent/')) {
        const bytes = regular(at(project, relativePath));
        if (sha(bytes) !== entry.sha256 || bytes.length !== entry.size)
          fail('installed configuration reader bundle drift');
      }
    configuredChangelog = currentConfiguredChangelog(project);
  }
  for (const relativePath of nextPaths) {
    const before = old.files.get(relativePath);
    const after = next.files.get(relativePath);
    if (!after) fail('successor manifest entry disappeared');
    if (!before || before.sha256 !== after.sha256 || before.size !== after.size) {
      if (relativePath === 'AGENTS.md') assertGeneratedRootAgents(payloadRoot);
      if (relativePath === 'docs/agent-instructions/documentation-policy.v1.json') {
        if (!before) fail('policy creation is outside this forward operation');
        const priorPolicy: unknown = JSON.parse(regular(at(oldPayloadRoot, relativePath)).toString('utf8'));
        const targetPolicy: unknown = JSON.parse(regular(at(payloadRoot, relativePath)).toString('utf8'));
        const priorRecord = isRecord(priorPolicy) ? priorPolicy : {};
        const targetRecord = isRecord(targetPolicy) ? targetPolicy : {};
        const priorMapPaths = priorRecord.map_paths;
        const maps = targetRecord.map_paths;
        if (
          !Array.isArray(priorMapPaths) ||
          !Array.isArray(maps) ||
          new Set(maps).size !== maps.length ||
          JSON.stringify(maps.filter((file) => priorMapPaths.includes(file))) !== JSON.stringify(priorMapPaths) ||
          JSON.stringify(maps.filter((file) => !priorMapPaths.includes(file))) !==
            JSON.stringify(['vida-agent/TESTING.md']) ||
          !isDeepStrictEqual({ ...targetRecord, map_paths: priorMapPaths }, priorPolicy)
        )
          fail('forward policy target must add only TESTING registration');
      }
      if (
        !relativePath.startsWith('vida-agent/') &&
        relativePath !== 'AGENTS.md' &&
        relativePath !== 'docs/agent-instructions/documentation-policy.v1.json'
      )
        fail(`forward update changes integration path: ${relativePath}`);
      changed.push({
        path: relativePath,
        old_sha256: before?.sha256 ?? null,
        new_sha256: after.sha256,
        old_size: before?.size ?? null,
        new_size: after.size,
      });
    }
    if (!before) {
      const destination = maybeAt(project, relativePath);
      if (destination && stat(destination)) addedDestinationCollisions.push(relativePath);
      continue;
    }
    const installed = regular(at(project, relativePath));
    if (sha(installed) !== before.sha256 || installed.length !== before.size) {
      if (relativePath === configuredChangelog && after.sha256 === before.sha256) {
        preservedMutableOutputs.push({
          path: relativePath,
          config_path: 'agent-runtime.config.v1.yaml',
          config_pointer: 'research_decision.paths.changelog',
          config_sha256: sha(regular(at(project, 'agent-runtime.config.v1.yaml'))),
          staged_sha256: before.sha256,
          installed_sha256_at_inspection: sha(installed),
        });
      } else installedDrift.push(relativePath);
    }
  }
  if (!changed.length) fail('successor has no bundle file change');
  const bundleFiles = new Set(
    nextPaths.filter((item) => item.startsWith('vida-agent/')).map((item) => item.slice('vida-agent/'.length)),
  );
  const installedExtraBundleFiles = walkFiles(path.join(project, 'vida-agent'), ['node_modules']).filter(
    (item) => !bundleFiles.has(item),
  );
  return {
    schema: 'VidaForwardUpdateInspection/v1',
    selector_sha256: sha(selectorRaw),
    generation: selector.generation,
    cutoff_witness_sha256: sha(cutoffRaw),
    first_admitted_work_attempt: cutoff.first_admitted_work_attempt,
    old_payload_manifest_sha256: old.sha256,
    new_payload_manifest_sha256: next.sha256,
    file_count: nextPaths.length,
    changed,
    installed_drift: installedDrift,
    added_destination_collisions: addedDestinationCollisions,
    preserved_mutable_outputs: preservedMutableOutputs,
    installed_extra_bundle_files: installedExtraBundleFiles,
    apply_ready:
      installedDrift.length === 0 && installedExtraBundleFiles.length === 0 && addedDestinationCollisions.length === 0,
  };
}
