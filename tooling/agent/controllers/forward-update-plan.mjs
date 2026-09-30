import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const hex = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = (message) => {
  throw new Error(`vida forward update: ${message}`);
};
const stat = (file) => {
  try {
    return lstatSync(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};
function regular(file) {
  const info = stat(file);
  if (!info?.isFile() || info.isSymbolicLink()) fail(`unsafe or absent file: ${file}`);
  return readFileSync(file);
}
function directory(file) {
  const info = stat(file);
  if (!info?.isDirectory() || info.isSymbolicLink()) fail(`unsafe or absent directory: ${file}`);
}
function relative(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    value.split('/').every((part) => part && part !== '.' && part !== '..' && !part.includes(':'))
  );
}
function exactKeys(value, keys) {
  return (
    value && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}
function controllerRecord(raw, schema, keys) {
  let value;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    fail(`invalid ${schema} JSON`);
  }
  if (
    value?.schema !== schema ||
    !exactKeys(value, keys) ||
    !raw.equals(Buffer.from(`${JSON.stringify(value, null, 2)}\n`))
  )
    fail(`invalid ${schema} shape or encoding`);
  return value;
}
function walkFiles(root, excludedTopLevel = []) {
  const observed = [];
  function walk(directoryPath, prefix) {
    for (const name of readdirSync(directoryPath)) {
      if (!prefix && excludedTopLevel.includes(name)) continue;
      const local = prefix ? `${prefix}/${name}` : name;
      if (!relative(local)) fail('unsafe payload path');
      const absolute = path.join(directoryPath, name);
      const info = stat(absolute);
      if (info.isSymbolicLink()) fail(`payload symlink: ${local}`);
      if (info.isDirectory()) walk(absolute, local);
      else if (info.isFile()) observed.push(local);
      else fail(`unsupported payload node: ${local}`);
    }
  }
  walk(root, '');
  return observed.sort();
}
function at(root, value) {
  if (!relative(value)) fail(`unsafe payload path: ${value}`);
  let current = root;
  for (const part of value.split('/').slice(0, -1)) {
    current = path.join(current, part);
    directory(current);
  }
  return path.join(root, ...value.split('/'));
}
function maybeAt(root, value) {
  if (!relative(value)) fail(`unsafe relative path: ${value}`);
  let current = root;
  for (const part of value.split('/').slice(0, -1)) {
    current = path.join(current, part);
    const info = stat(current);
    if (!info) return null;
    if (!info.isDirectory() || info.isSymbolicLink()) fail(`unsafe parent: ${value}`);
  }
  return path.join(current, value.split('/').at(-1));
}
function manifest(root) {
  directory(root);
  const raw = regular(path.join(root, 'vida-agent-payload.manifest.v1.json'));
  let value;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('invalid payload manifest JSON');
  }
  if (
    value?.schema !== 'VidaAgentPreparedPayload/v1' ||
    !Array.isArray(value.files) ||
    !Array.isArray(value.unresolved_integration_paths) ||
    value.unresolved_integration_paths.length
  )
    fail('incomplete payload manifest');
  const files = new Map();
  for (const entry of value.files) {
    if (
      !relative(entry?.path) ||
      files.has(entry.path) ||
      !hex(entry.sha256) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0
    )
      fail('invalid or duplicate manifest entry');
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
export function verifyStagedPayloadManifest(root, expectedSha) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.resolve(root) !== root || !hex(expectedSha))
    fail('staged payload binding invalid');
  const verified = manifest(root);
  if (verified.sha256 !== expectedSha) fail('staged payload manifest changed');
  return verified;
}

/** Root AGENTS.md is a derived integration output of the selected bundle template. */
export function assertGeneratedRootAgents(payloadRoot) {
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
export function assertProjectOwnedIntegrationRetirement(root, oldFiles, nextFiles) {
  const retired = [...oldFiles.keys()].filter((item) => !nextFiles.has(item)).sort();
  if (
    retired.length &&
    JSON.stringify(retired) !== JSON.stringify(['AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
  )
    fail('only the complete project-owned integration pair may retire');
  for (const relativePath of retired) {
    const location = at(root, relativePath),
      before = oldFiles.get(relativePath);
    if (
      stat(location).nlink !== 1 ||
      sha(regular(location)) !== before.sha256 ||
      regular(location).length !== before.size
    )
      fail(`retired project file changed: ${relativePath}`);
  }
  return retired;
}

function currentConfiguredChangelog(project) {
  const code =
    'const {loadRuntimeConfig}=await import("./src/config/runtime-config.ts"); const config=loadRuntimeConfig(process.argv.at(-1)); console.log(JSON.stringify({path:config.research_decision.paths.changelog}));';
  const result = spawnSync(process.execPath, [path.join(project, 'vida-agent/bin/bun.mjs'), '-e', code, project], {
    cwd: path.join(project, 'vida-agent'),
    windowsHide: true,
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (result.error || result.status !== 0) fail('current project configuration validation failed');
  let value;
  try {
    value = JSON.parse(result.stdout.trim());
  } catch {
    fail('validated changelog result invalid');
  }
  if (!relative(value.path)) fail('validated current changelog path unsafe');
  return value.path;
}

/** Read-only preflight; apply/resume belongs to a later slice. */
export function inspectForwardUpdate({
  root,
  oldPayloadRoot,
  payloadRoot,
  preserveConfiguredResearchChangelog = false,
}) {
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
  const oldPaths = [...old.files.keys()].sort();
  const nextPaths = [...next.files.keys()].sort();
  assertProjectOwnedIntegrationRetirement(project, old.files, next.files);
  const changed = [];
  const installedDrift = [];
  const addedDestinationCollisions = [];
  const preservedMutableOutputs = [];
  let configuredChangelog = null;
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
    if (!before || before.sha256 !== after.sha256 || before.size !== after.size) {
      if (relativePath === 'AGENTS.md') assertGeneratedRootAgents(payloadRoot);
      if (relativePath === 'docs/agent-instructions/documentation-policy.v1.json') {
        if (!before) fail('policy creation is outside this forward operation');
        const priorPolicy = JSON.parse(regular(at(oldPayloadRoot, relativePath))),
          targetPolicy = JSON.parse(regular(at(payloadRoot, relativePath)));
        const maps = targetPolicy.map_paths;
        if (
          !Array.isArray(priorPolicy.map_paths) ||
          !Array.isArray(maps) ||
          new Set(maps).size !== maps.length ||
          JSON.stringify(maps.filter((file) => priorPolicy.map_paths.includes(file))) !==
            JSON.stringify(priorPolicy.map_paths) ||
          JSON.stringify(maps.filter((file) => !priorPolicy.map_paths.includes(file))) !==
            JSON.stringify(['vida-agent/TESTING.md']) ||
          !isDeepStrictEqual({ ...targetPolicy, map_paths: priorPolicy.map_paths }, priorPolicy)
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
