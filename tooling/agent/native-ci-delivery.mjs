// Repository-owned CI producer. Importing this module never builds or installs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  existsSync,
  linkSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  unlinkSync,
  watch,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  releaseDigest as sha,
  releaseJSON as json,
  releasePath,
  releaseDirectory,
  releaseSourceBinding,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
import { nativeInstallationPaths, publishNativeExecutable, runCommand, parsePackOutput } from './release-local.mjs';
import { findNpmCli } from '../../packages/agent/bin/bun.mjs';
import {
  ciArchiveLimit,
  nativeDeliveryChecks,
  validateCIDeliveryRequest,
  encodeCIDeliveryResult,
} from './release-ci-evidence.mjs';

const requireCI = (value, message) => {
  if (!value) throw Error('GAP-VIDA-CI-DELIVERY-001: ' + message);
};
const profileFor = (request) => ({
  issuer: 'github-actions',
  repository_id: request.repository_id,
  project_ids: request.project_ids,
  target: request.target,
  required_checks: [...nativeDeliveryChecks],
});

/** Environment consistency is a local CI fence, never human authorization. */
export function validateNativeCIInvocation({ env, platform, arch, bun }) {
  requireCI(
    env.CI === 'true' && env.GITHUB_ACTIONS === 'true' && env.VIDA_NATIVE_CI_ENABLED === 'true',
    'CI producer is dormant',
  );
  requireCI(
    platform === 'win32' && arch === 'x64' && bun === '1.4.2',
    'qualified Windows x64 pinned producer required',
  );
  requireCI(
    env.GITHUB_REPOSITORY === 'pomazanbohdan/vida-stack-lite' &&
      env.GITHUB_REPOSITORY_ID === '1340911900' &&
      env.GITHUB_JOB === 'native-windows-x64' &&
      /^\d+$/.test(env.GITHUB_RUN_ID) &&
      /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT) &&
      /^[a-f0-9]{40}$/.test(env.CI_SOURCE_COMMIT) &&
      env.CI_SOURCE_COMMIT === env.GITHUB_SHA &&
      env.GITHUB_WORKFLOW_REF ===
        'pomazanbohdan/vida-stack-lite/.github/workflows/agent-native-delivery.yml@refs/heads/main',
    'CI repository/job/commit differs',
  );
  requireCI(
    typeof env.CI_REQUEST === 'string' && Buffer.byteLength(env.CI_REQUEST) <= 8 * 1024 * 1024,
    'CI request missing or oversized',
  );
  const request = JSON.parse(env.CI_REQUEST);
  validateCIDeliveryRequest(request);
  requireCI(
    request.repository_id === 'vida-agent' &&
      json(request.project_ids) === json(['agent']) &&
      request.target === 'bun-windows-x64',
    'CI context differs',
  );
  return {
    request,
    run_id: env.GITHUB_RUN_ID,
    run_attempt: Number(env.GITHUB_RUN_ATTEMPT),
    source_commit: env.CI_SOURCE_COMMIT,
  };
}

const receiptFields = [
  'schema',
  'request_id',
  'run_id',
  'run_attempt',
  'source_binding',
  'archive_sha256',
  'phase',
  'status',
];
export function validateNativeCIReceipts({ identity, candidate, receipts, phases = nativeDeliveryChecks }) {
  requireCI(
    Array.isArray(receipts) && receipts.length === phases.length,
    'complete ordered CI phase observations required',
  );
  for (let index = 0; index < phases.length; index++) {
    const record = receipts[index];
    requireCI(record && typeof record === 'object' && !Array.isArray(record), 'malformed CI phase observation');
    requireCI(
      json(Object.keys(record).sort()) === json(receiptFields.slice().sort()) &&
        record.schema === 'VidaCIPhaseResult/v1' &&
        record.request_id === identity.request.request_id &&
        record.run_id === identity.run_id &&
        record.run_attempt === identity.run_attempt &&
        record.source_binding === identity.request.source_binding &&
        record.archive_sha256 === candidate.archive_sha256 &&
        record.phase === phases[index] &&
        record.status === 'passed',
      'failed/changed/UNKNOWN CI phase observation',
    );
  }
}

function physical(root, relative, maximum = ciArchiveLimit) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  requireCI(stat.isFile() && stat.nlink === 1 && stat.size <= maximum, 'unsafe/oversized CI file');
  return readFileSync(file);
}
function exclusive(root, relative, value) {
  const directory = path.posix.dirname(relative);
  if (directory !== '.') releaseDirectory(root, directory);
  writeFileSync(releasePath(root, relative, true), Buffer.isBuffer(value) ? value : json(value), {
    flag: 'wx',
    mode: 0o600,
  });
}
function context() {
  const identity = validateNativeCIInvocation({
    env: process.env,
    platform: process.platform,
    arch: process.arch,
    bun: process.versions.bun,
  });
  const source = realpathSync(process.env.VIDA_CI_SOURCE_ROOT),
    checkout = realpathSync(process.env.GITHUB_WORKSPACE);
  const temporary = realpathSync(process.env.RUNNER_TEMP);
  const root = releaseDirectory(temporary, 'vida-ci-operation-' + identity.run_id + '-' + identity.run_attempt);
  requireCI(source.startsWith(temporary + path.sep) && source !== checkout, 'isolated CI Source mirror required');
  for (const tree of [source, checkout])
    requireCI(
      releaseSourceBinding(tree).source_binding === identity.request.source_binding,
      'CI Source differs from current request',
    );
  const manifest = JSON.parse(physical(source, 'packages/agent/package.json', 1024 * 1024));
  requireCI(
    manifest.version === identity.request.version && manifest.engines.bun === '1.4.2',
    'CI package identity differs',
  );
  return { ...identity, root, source, checkout, packageRoot: path.join(source, 'packages/agent'), manifest };
}
function candidateFor(ctx) {
  const candidate = JSON.parse(physical(ctx.root, 'candidate.json', 8 * 1024 * 1024));
  requireCI(
    candidate.operation_id === ctx.request.operation_id &&
      candidate.version === ctx.request.version &&
      candidate.source_binding === ctx.request.source_binding &&
      candidate.manifest.target === ctx.request.target &&
      candidate.manifest.pin === '1.4.2',
    'CI candidate identity differs',
  );
  const archive = physical(ctx.root, 'output/' + candidate.pack_metadata[0].filename);
  const manifest = physical(ctx.root, 'package/dist/standalone/manifest.json', 8 * 1024 * 1024);
  const asset = physical(ctx.root, 'package/dist/standalone/' + candidate.manifest.asset.file);
  requireCI(
    sha(archive) === candidate.archive_sha256 &&
      sha(manifest) === candidate.manifest_sha256 &&
      sha(asset) === candidate.manifest.asset.sha256 &&
      asset.length === candidate.manifest.asset.bytes,
    'CI archive/manifest/asset changed',
  );
  return candidate;
}
function nativeEnvironment(ctx, name) {
  const home = path.join(ctx.root, 'homes', name);
  releaseDirectory(ctx.root, 'homes/' + name);
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    LOCALAPPDATA: path.join(home, 'local'),
    APPDATA: path.join(home, 'roaming'),
  };
  for (const key of Object.keys(env)) {
    const upper = key.toUpperCase();
    if (
      [
        'PATH',
        'NODE_OPTIONS',
        'BUN_OPTIONS',
        'BUN_BE_BUN',
        'VIDA_STANDALONE_ROOT',
        'VIDA_STANDALONE_EXECUTABLE',
        'GITHUB_TOKEN',
      ].includes(upper) ||
      upper.startsWith('ACTIONS_') ||
      /(?:TOKEN|PASSWORD|SECRET|API_KEY)$/.test(upper)
    )
      delete env[key];
  }
  env.PATH = path.join(home, 'bin');
  releaseDirectory(home, 'bin');
  return env;
}
const nativePrerequisiteFailure =
  /Cannot find module|Cannot find package|ERR_MODULE_NOT_FOUND|ModuleNotFound|Error loading shared library|failed to load.*(?:\.node|dll)/i;

function messageMatches(actual, expected) {
  if (typeof expected === 'string') return actual === expected;
  if (expected.exact !== undefined) return actual === expected.exact;
  if (expected.prefix !== undefined) return actual.startsWith(expected.prefix);
  if (expected.includes !== undefined) return expected.includes.every((part) => actual.includes(part));
  if (expected.oneOf !== undefined) return expected.oneOf.some((entry) => messageMatches(actual, entry));
  return false;
}

function structuredDenial(stderr, expected) {
  let value;
  try {
    value = JSON.parse(stderr.trim());
  } catch {
    return false;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (expected.keys && json(Object.keys(value).sort()) !== json([...expected.keys].sort())) return false;
  if (Object.entries(expected.fields ?? {}).some(([key, field]) => value[key] !== field)) return false;
  return typeof value.message === 'string' && messageMatches(value.message, expected.message);
}

function errorLines(stderr) {
  return stderr
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^(?:error|Error):\s*/, ''))
    .filter((line) => line && !/^\d+\s*\|/.test(line) && !/^at\s/.test(line));
}

export function nativeCIDenialDiagnostics(record) {
  const stdout = typeof record?.stdout === 'string' ? record.stdout.slice(-2048) : '';
  const stderr = typeof record?.stderr === 'string' ? record.stderr.slice(-2048) : '';
  const command = typeof record?.command === 'string' ? JSON.stringify(record.command) : 'unknown';
  const args = Array.isArray(record?.args) ? JSON.stringify(record.args) : 'unknown';
  const exitCode = Number.isInteger(record?.code) ? String(record.code) : 'unknown';
  const signal = record?.signal === null ? 'null' : typeof record?.signal === 'string' ? record.signal : 'unknown';
  return `command: ${command}\nargs: ${args}\nexit code: ${exitCode}\nsignal: ${signal}\nstdout tail:\n${stdout}\nstderr tail:\n${stderr}`;
}

function nativeCIDenialError(message, record, cause) {
  return new Error(`${message}\n${nativeCIDenialDiagnostics(record)}`, { cause });
}

export function validateNativeCIDenial(record, expected) {
  requireCI(
    Number.isInteger(record?.code) && record.signal === null,
    'expected denial lacks actual terminal observation; FAIL/UNKNOWN retained',
  );
  requireCI(record.code === 1, 'expected denial observed a different integer exit; known FAIL');
  requireCI(typeof record.stderr === 'string', 'expected denial receipt lacks stderr; FAIL/UNKNOWN retained');
  requireCI(
    !nativePrerequisiteFailure.test(record.stderr + '\n' + (typeof record.stdout === 'string' ? record.stdout : '')),
    'native prerequisite failure cannot satisfy expected rejection',
  );
  const matches =
    expected?.kind === 'json'
      ? structuredDenial(record.stderr, expected)
      : expected?.kind === 'line' && typeof expected.message === 'object'
        ? errorLines(record.stderr).some((line) => messageMatches(line, expected.message))
        : false;
  requireCI(matches, 'expected denial message or structured contract did not match');
}

function jsonDenial(fields, message, keys = [...Object.keys(fields), 'message']) {
  return { kind: 'json', keys, fields, message };
}

const nativeCICommandDenials = new Map([
  [
    'run',
    jsonDenial(
      { schema: 'VidaAgentRunResult/v1', status: 'blocked', code: 'GAP-VIDA-RUN-CLI-001' },
      {
        exact:
          'Launcher arguments are incomplete or contain an unsupported option. Next action: inspect the exact work and check its issued contract before retrying.',
      },
    ),
  ],
  ['init', { kind: 'line', message: { prefix: 'Usage: init.mjs ' } }],
  ['install', { kind: 'line', message: { prefix: 'Usage: install.mjs ' } }],
  ['reconcile-artifacts', jsonDenial({ status: 'blocked' }, { exact: 'vida repair artifacts: invalid arguments' })],
  ['documentation-clear', { kind: 'line', message: { exact: 'documentation CLEAR arguments invalid' } }],
  [
    'scope',
    jsonDenial(
      { schema: 'VidaAgentCommandResult/v1', status: 'blocked', code: 'GAP-VIDA-SCOPE-001' },
      { prefix: 'scope requires --project-root ABSOLUTE --repository ID --project ID --path RELATIVE' },
    ),
  ],
  [
    'development-controller',
    jsonDenial(
      { status: 'blocked', code: 'GAP-DEVELOPMENT-CONTROLLER-001' },
      { prefix: 'development-controller prepare --target ABS --controller-root NEW_ABS' },
    ),
  ],
]);

export function validateNativeCICommandDenialInventory(commands, bin) {
  const expectedCommands = [...nativeCICommandDenials.keys()].sort(),
    advertisedCommands = [...commands].sort();
  requireCI(json(advertisedCommands) === json(expectedCommands), 'public command denial expectation inventory differs');
  for (const [name, entry] of Object.entries(bin ?? {})) {
    if (name === 'vida-agent') continue;
    const command = path.basename(entry, path.extname(entry));
    requireCI(nativeCICommandDenials.has(command), 'maintained alias lacks an explicit command denial expectation');
  }
  return nativeCICommandDenials;
}

function cliError(message) {
  return jsonDenial(
    { schema: 'VidaAgentCommandResult/v1', status: 'blocked', code: 'GAP-VIDA-CLI-001' },
    { exact: message },
  );
}

export const nativeCIUnadmittedWorkflowDenial = jsonDenial(
  { schema: 'VidaAgentRunResult/v1', status: 'blocked', code: 'GAP-VIDA-RUN-WORKFLOW-001' },
  {
    exact:
      'The requested workflow is not configured for this selection. Next action: inspect the exact work and check its issued contract before retrying.',
  },
);

function absentProtectedPath(root, relative, reason) {
  const file = releasePath(root, relative, true);
  requireCI(!lstatSync(file, { throwIfNoEntry: false }), reason);
  return file;
}

function observeChildClose(child, command, args) {
  let stdout = '',
    stderr = '';
  child.stdout.on('data', (bytes) => {
    stdout += bytes;
  });
  child.stderr.on('data', (bytes) => {
    stderr += bytes;
  });
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ command, args, code, signal, stdout, stderr }));
  });
}
export function validateNativeCIUnadmittedRun(record) {
  validateNativeCIDenial(record, nativeCIUnadmittedWorkflowDenial);
}
export function createNativeCICommandRunner(ctx, phase, execute = runCommand) {
  let count = 0;
  releaseDirectory(ctx.root, 'logs/' + phase);
  const invoke = (command, args, options = {}) =>
    execute(command, args, {
      cwd: ctx.root,
      ...options,
      log: path.join(ctx.root, 'logs', phase, String(count++) + '.json'),
    });
  invoke.denied = async (command, args, options, expected) => {
    const name = 'logs/' + phase + '/' + count + '.json';
    let commandError;
    try {
      await invoke(command, args, options);
    } catch (error) {
      commandError = error;
    }
    let observed;
    try {
      observed = JSON.parse(physical(ctx.root, name, 8 * 1024 * 1024));
    } catch (receiptError) {
      throw new Error('expected denial receipt is missing or unreadable; FAIL/UNKNOWN retained', {
        cause: commandError ?? receiptError,
      });
    }
    try {
      requireCI(observed.command === command && json(observed.args) === json(args), 'rejection child differs');
      validateNativeCIDenial(observed, expected);
      if (!commandError) requireCI(false, 'expected rejection returned success');
    } catch (validationError) {
      throw nativeCIDenialError(validationError.message, observed, commandError ?? validationError);
    }
    return observed;
  };
  return invoke;
}
function runner(ctx, phase) {
  return createNativeCICommandRunner(ctx, phase);
}
function assetFor(ctx, candidate) {
  return {
    ...candidate.manifest.asset,
    target: candidate.manifest.target,
    path: path.join(ctx.root, 'package/dist/standalone', candidate.manifest.asset.file),
  };
}
const psLiteral = (value) => "'" + value.replaceAll("'", "''") + "'";
function powershell(invoke, script, options = {}) {
  const program = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
  return invoke(
    program,
    [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from("$ErrorActionPreference='Stop'; " + script, 'utf16le').toString('base64'),
    ],
    options,
  );
}
const invokeNative = (invoke, executable, env, args) => invoke(executable, args, { env });
async function initializeConsumer(ctx, invoke, executable, env, name) {
  const consumer = path.join(ctx.root, 'consumers', name);
  releaseDirectory(ctx.root, 'consumers/' + name);
  exclusive(consumer, 'owner.txt', Buffer.from('CI-owned consumer value\n'));
  await invokeNative(invoke, executable, env, [
    'init',
    '--project-root',
    consumer,
    '--repository',
    'native-ci',
    '--project',
    'project=.',
  ]);
  return consumer;
}

async function nativeBuild(ctx, invoke) {
  const node = realpathSync(process.env.VIDA_CI_NODE_EXECUTABLE);
  requireCI((await invoke(node, ['--version'])).trim() === 'v' + ctx.manifest.engines.node, 'CI Node pin differs');
  const npm = findNpmCli(node);
  requireCI((await invoke(node, [npm, '--version'])).trim() === '11.17.0', 'CI npm pin differs');
  await invoke(process.execPath, ['run', 'ci:pinned'], { cwd: ctx.packageRoot });
  releaseDirectory(ctx.root, 'output');
  const packed = parsePackOutput(
    await invoke(
      node,
      [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', path.join(ctx.root, 'output')],
      { cwd: ctx.packageRoot },
    ),
  );
  requireCI(
    packed.length === 1 &&
      packed[0].name === 'vida-agent' &&
      packed[0].version === ctx.request.version &&
      packed[0].filename === 'vida-agent-' + ctx.request.version + '.tgz',
    'CI native pack identity differs',
  );
  const archive = physical(ctx.root, 'output/' + packed[0].filename);
  const require = createRequire(path.join(ctx.packageRoot, 'package.json'));
  const { extractArchive } = await import(pathToFileURL(require.resolve('@openclaw/fs-safe/archive')).href);
  releaseDirectory(ctx.root, 'package');
  await extractArchive({
    archivePath: path.join(ctx.root, 'output', packed[0].filename),
    destDir: path.join(ctx.root, 'package'),
    kind: 'tar',
    tarGzip: true,
    timeoutMs: 0,
    stripComponents: 1,
    limits: { maxArchiveBytes: ciArchiveLimit, maxExtractedBytes: 512 * 1024 * 1024, maxEntryBytes: ciArchiveLimit },
  });
  const manifestBytes = physical(ctx.root, 'package/dist/standalone/manifest.json', 8 * 1024 * 1024);
  const manifest = JSON.parse(manifestBytes);
  requireCI(
    manifest.schema === 'VidaStandaloneBuild/v1' &&
      manifest.version === ctx.request.version &&
      manifest.pin === '1.4.2' &&
      manifest.target === ctx.request.target &&
      manifest.inputs.length > 0,
    'native manifest differs',
  );
  requireCI(manifest.asset.file === 'vida-agent-bun-windows-x64.exe', 'native executable name differs');
  const asset = physical(ctx.root, 'package/dist/standalone/' + manifest.asset.file);
  requireCI(
    sha(asset) === manifest.asset.sha256 && asset.length === manifest.asset.bytes,
    'formed native executable differs',
  );
  // The extracted member must be the exact current builder output, never an SDK projection.
  requireCI(
    manifestBytes.equals(physical(ctx.source, 'packages/agent/dist/standalone/manifest.json', 8 * 1024 * 1024)) &&
      asset.equals(physical(ctx.source, 'packages/agent/dist/standalone/' + manifest.asset.file)),
    'packed native bytes differ',
  );
  exclusive(ctx.root, 'candidate.json', {
    operation_id: ctx.request.operation_id,
    version: ctx.request.version,
    source_binding: ctx.request.source_binding,
    pack_metadata: packed,
    archive_sha256: sha(archive),
    manifest_sha256: sha(manifestBytes),
    manifest,
  });
}

async function nativeInstall(ctx, candidate, invoke) {
  const env = nativeEnvironment(ctx, 'installed'),
    asset = assetFor(ctx, candidate);
  const locations = nativeInstallationPaths({
    version: ctx.request.version,
    operation: ctx.request.operation_id,
    target: ctx.request.target,
    env,
  });
  requireCI(
    locations.path_command.startsWith(ctx.root + path.sep) && locations.installed_root.startsWith(ctx.root + path.sep),
    'CI install escapes private destination',
  );
  requireCI(
    !existsSync(locations.installed_root) && !existsSync(locations.path_command),
    'prior install custody exists; no replay',
  );
  releaseDirectory(ctx.root, path.relative(ctx.root, locations.installed_root).split(path.sep).join('/'));
  const require = createRequire(path.join(ctx.packageRoot, 'package.json'));
  const { extractArchive } = await import(pathToFileURL(require.resolve('@openclaw/fs-safe/archive')).href);
  await extractArchive({
    archivePath: path.join(ctx.root, 'output', candidate.pack_metadata[0].filename),
    destDir: locations.installed_root,
    kind: 'tar',
    tarGzip: true,
    timeoutMs: 0,
    stripComponents: 1,
    limits: { maxArchiveBytes: ciArchiveLimit, maxExtractedBytes: 512 * 1024 * 1024, maxEntryBytes: ciArchiveLimit },
  });
  for (const file of candidate.pack_metadata[0].files)
    requireCI(
      physical(locations.installed_root, file.path).equals(physical(ctx.root, 'package/' + file.path)),
      'installed release tree differs',
    );
  const installedAsset = { ...asset, path: releasePath(locations.installed_root, 'dist/standalone/' + asset.file) };
  releaseDirectory(ctx.root, path.relative(ctx.root, locations.prefix).split(path.sep).join('/'));
  const shim = path.join(locations.prefix, 'vida-agent.cmd');
  exclusive(locations.prefix, 'vida-agent.cmd', Buffer.from('CI retained shim\n'));
  publishNativeExecutable(installedAsset, locations.path_command);
  const version = JSON.parse(await invokeNative(invoke, locations.path_command, env, ['version']));
  requireCI(version.name === 'vida-agent' && version.version === ctx.request.version, 'installed version differs');
  const instruction = JSON.parse(
    await invokeNative(invoke, locations.path_command, env, ['instructions', '--path', 'development-lifecycle']),
  );
  requireCI(
    instruction.path.startsWith(env.USERPROFILE + path.sep) &&
      readFileSync(instruction.path).equals(physical(ctx.root, 'package/instructions/development-lifecycle.md')),
    'installed instruction differs',
  );
  const check = JSON.parse(await invokeNative(invoke, locations.path_command, env, ['install', '--check']));
  requireCI(
    check.status === 'prerequisites_valid' && check.bun_pin === '1.4.2' && check.runtime === 'embedded',
    'installed prerequisite result differs',
  );
  env.PATH = locations.prefix;
  requireCI(
    !readdirSync(locations.prefix).some((name) => /^(node|npm|bun)(\.|$)/i.test(name)),
    'external runtime appeared on consumer PATH',
  );
  // Explicit CI sandbox PATH observation; no machine/user registry mutation.
  await powershell(
    invoke,
    "if(Get-Command node,npm,bun -ErrorAction SilentlyContinue){throw 'External toolchain remains available'}",
    { env },
  );
  requireCI(readFileSync(shim).equals(Buffer.from('CI retained shim\n')), 'native install changed sibling shim');
  exclusive(ctx.root, 'installation.json', { env_home: env.USERPROFILE, locations, path: env.PATH });
}

async function publicRoutes(ctx, candidate, invoke) {
  const asset = assetFor(ctx, candidate),
    env = nativeEnvironment(ctx, 'routes');
  const consumer = await initializeConsumer(ctx, invoke, asset.path, env, 'routes');
  const help = JSON.parse(await invokeNative(invoke, asset.path, env, ['--help']));
  const { commands } = await import(pathToFileURL(path.join(ctx.root, 'package/bin/cli-metadata.mjs')).href);
  const commandDenials = validateNativeCICommandDenialInventory(commands, ctx.manifest.bin);
  requireCI(json(help.commands) === json([...commands, 'instructions', 'version']), 'public route inventory differs');
  for (const command of commands) {
    await invoke.denied(asset.path, [command, '--invalid-ci-option'], { env }, commandDenials.get(command));
  }
  const scope = JSON.parse(
    await invokeNative(invoke, asset.path, env, [
      'scope',
      '--project-root',
      consumer,
      '--repository',
      'native-ci',
      '--project',
      'project',
      '--path',
      'owner.txt',
    ]),
  );
  requireCI(
    scope.entries.some(
      (entry) => entry.path === 'owner.txt' && entry.sha256 === sha(readFileSync(path.join(consumer, 'owner.txt'))),
    ),
    'public scope did not inspect actual consumer',
  );
  for (const instruction of readdirSync(path.join(ctx.root, 'package/instructions')).filter((name) =>
    name.endsWith('.md'),
  )) {
    const observed = JSON.parse(await invokeNative(invoke, asset.path, env, ['instructions', '--path', instruction]));
    requireCI(
      observed.version === ctx.request.version &&
        observed.path.startsWith(env.USERPROFILE + path.sep) &&
        readFileSync(observed.path).equals(physical(ctx.root, 'package/instructions/' + instruction)),
      'physical instruction route differs',
    );
  }
  // Package-owned aliases use this same embedded executable, with no external Node.
  const materialized = path.join(
    env.USERPROFILE,
    '.vida-agent/runtime',
    ctx.request.version + '-' + candidate.manifest.payloadId,
  );
  for (const [name, entry] of Object.entries(ctx.manifest.bin)) {
    const file = path.resolve(materialized, entry);
    requireCI(file.startsWith(materialized + path.sep) && existsSync(file), 'maintained alias is absent: ' + name);
    if (name === 'vida-agent') continue;
    await invoke.denied(
      asset.path,
      ['--no-env-file', '--no-install', file, '--invalid-ci-option'],
      { env: { ...env, BUN_BE_BUN: '1', VIDA_STANDALONE_ROOT: materialized, VIDA_STANDALONE_EXECUTABLE: asset.path } },
      commandDenials.get(path.basename(entry, path.extname(entry))),
    );
  }
  await invoke.denied(
    asset.path,
    ['instructions', '--path', '../foreign'],
    { env },
    cliError('invalid instruction name'),
  );
  absentProtectedPath(
    consumer,
    '.agent/work/agent-local-release/ci-missing/release.json',
    'expected release-retarget first-read journal is not absent',
  );
  await invoke.denied(
    asset.path,
    [
      'reconcile-artifacts',
      '--kind',
      'release-retarget',
      '--mode',
      'inspect',
      '--project-root',
      consumer,
      '--operation',
      'ci-missing',
    ],
    { env },
    jsonDenial({ status: 'blocked' }, { exact: 'Local release: path missing' }),
  );
  const missingController = absentProtectedPath(
    ctx.root,
    'missing-controller',
    'expected development-controller root is not absent',
  );
  await invoke.denied(
    asset.path,
    ['development-controller', 'inspect', '--controller-root', missingController],
    { env },
    jsonDenial(
      { status: 'blocked', code: 'GAP-DEVELOPMENT-CONTROLLER-001' },
      { prefix: `ENOENT: no such file or directory, realpath '${missingController}'` },
    ),
  );
  absentProtectedPath(
    consumer,
    '.agent/work/ci-missing/scope.json',
    'expected documentation-clear accepted-work scope is not absent',
  );
  await invoke.denied(
    asset.path,
    [
      'documentation-clear',
      '--mode',
      'verify',
      '--project-root',
      consumer,
      '--repository',
      'native-ci',
      '--project',
      'project',
      '--work-id',
      'ci-missing',
      '--source-revision',
      ctx.request.source_binding,
    ],
    { env },
    {
      kind: 'line',
      message: {
        exact: 'safe repository access unavailable: accepted work scope fs-safe boundary rejected the target (path)',
      },
    },
  );
  const before = physical(consumer, 'owner.txt');
  const denied = await invoke.denied(
    asset.path,
    [
      'run',
      '--project-root',
      consumer,
      '--repository',
      'native-ci',
      '--project',
      'project',
      '--work-path',
      '.agent/work/ci-unadmitted',
      '--work-id',
      'ci-unadmitted',
      '--attempt',
      '1',
      '--team',
      'default-development',
      '--kind',
      'task',
      '--intent',
      'task_execution',
      '--workflow',
      'ci-unadmitted',
      '--scope-path',
      'owner.txt',
    ],
    { env },
    nativeCIUnadmittedWorkflowDenial,
  );
  validateNativeCIUnadmittedRun(denied);
  requireCI(physical(consumer, 'owner.txt').equals(before), 'unadmitted public route did not preserve owner values');
}

async function offlineRuntime(ctx, candidate, invoke) {
  const asset = assetFor(ctx, candidate),
    env = nativeEnvironment(ctx, 'offline-first-run');
  const name = 'vida-ci-offline-' + ctx.run_id + '-' + ctx.run_attempt;
  requireCI(!existsSync(path.join(env.USERPROFILE, '.vida-agent')), 'offline first-run cache already exists');
  // A replaceable Windows CI adapter. An unavailable/enforced-off firewall is a GAP.
  await powershell(
    invoke,
    'if(Get-NetFirewallRule -Name ' +
      psLiteral(name) +
      " -ErrorAction SilentlyContinue){throw 'Retained isolation intent'}; " +
      "if(@(Get-NetFirewallProfile -PolicyStore ActiveStore | Where-Object {$_.Enabled -ne 'True'}).Count){throw 'Firewall policy is not enabled'}; " +
      'New-NetFirewallRule -Name ' +
      psLiteral(name) +
      ' -DisplayName ' +
      psLiteral(name) +
      ' -Direction Outbound -Program ' +
      psLiteral(asset.path) +
      ' -Action Block -Profile Any -Enabled True | Out-Null; $rule=Get-NetFirewallRule -PolicyStore ActiveStore -Name ' +
      psLiteral(name) +
      "; if($rule.Enabled -ne 'True' -or $rule.Action -ne 'Block' -or $rule.Direction -ne 'Outbound' -or $rule.PrimaryStatus -ne 'OK' -or $rule.EnforcementStatus -ne 'Full'){throw 'Isolation rule is not fully enforced'}; " +
      'if(($rule | Get-NetFirewallApplicationFilter).Program -cne ' +
      psLiteral(asset.path) +
      "){throw 'Isolation executable differs'}",
  );
  // Retain the owned rule/roots for inspection even if a child outcome is UNKNOWN.
  const consumer = await initializeConsumer(ctx, invoke, asset.path, env, 'offline-first-run');
  await invokeNative(invoke, asset.path, env, [
    'scope',
    '--project-root',
    consumer,
    '--repository',
    'native-ci',
    '--project',
    'project',
    '--path',
    'owner.txt',
  ]);
  await invokeNative(invoke, asset.path, env, ['install', '--check']);
  exclusive(ctx.root, 'offline-rule.json', { name, executable: asset.path, status: 'observed-active-outbound-block' });
}

async function embeddedProbe(ctx, candidate, mode) {
  const env = nativeEnvironment(ctx, mode === 'dependencies' ? 'dependencies' : 'state'),
    cache = path.join(env.USERPROFILE, '.vida-agent/runtime', ctx.request.version + '-' + candidate.manifest.payloadId);
  requireCI(
    process.versions.bun === candidate.manifest.pin &&
      realpathSync(process.execPath).startsWith(ctx.root + path.sep) &&
      sha(readFileSync(process.execPath)) === candidate.manifest.asset.sha256,
    'native probe does not execute the actual asset',
  );
  const require = createRequire(path.join(cache, 'package.json'));
  const ownedImport = async (relative) => import(pathToFileURL(releasePath(cache, relative)).href);
  const dependency = async (name) => {
    const file = require.resolve(name);
    requireCI(realpathSync(file).startsWith(cache + path.sep), 'native dependency escaped materialized payload');
    return import(pathToFileURL(file).href);
  };
  const consumer = path.join(ctx.root, 'consumers', mode);
  if (mode === 'dependencies') {
    const cedar = await dependency('@cedar-policy/cedar-wasm/nodejs');
    const call = {
      principal: { type: 'User', id: 'ci' },
      action: { type: 'Action', id: 'read' },
      resource: { type: 'Project', id: 'ci' },
      context: {},
      entities: [],
    };
    for (const [policy, decision] of [
      ['permit', 'allow'],
      ['forbid', 'deny'],
    ]) {
      const result = cedar.isAuthorized({
        ...call,
        policies: { staticPolicies: policy + '(principal, action, resource);' },
      });
      requireCI(
        result.type === 'success' && result.response.decision === decision,
        'actual Cedar WASM evaluation differs',
      );
    }
    const { requireSafeRepositoryAccess } = await ownedImport('src/config/safe-repository-access.ts');
    const access = requireSafeRepositoryAccess(consumer);
    requireCI(
      access.attested && access.provider === 'fs-safe-windows',
      'original native fs-safe attestation unavailable',
    );
    await access.writeExclusiveAsync('native-io.txt', 'actual native I/O', 'CI owned native dependency observation');
    requireCI(access.readText('native-io.txt', 'CI native I/O') === 'actual native I/O', 'guarded native I/O differs');
    const { LibSQLStore } = await dependency('@mastra/libsql');
    const url = 'file:' + path.join(consumer, 'mastra-ci.db');
    const snapshot = { status: 'suspended', value: ctx.request.request_id };
    let store = new LibSQLStore({ id: 'native-ci', url });
    try {
      await store.init();
      const workflows = await store.getStore('workflows');
      requireCI(workflows, 'Mastra workflow storage unavailable');
      await workflows.persistWorkflowSnapshot({ workflowName: 'native-ci', runId: ctx.run_id, snapshot });
    } finally {
      await store.close();
    }
    store = new LibSQLStore({ id: 'native-ci', url });
    try {
      await store.init();
      const workflows = await store.getStore('workflows');
      requireCI(
        json(await workflows.loadWorkflowSnapshot({ workflowName: 'native-ci', runId: ctx.run_id })) === json(snapshot),
        'Mastra/LibSQL restart persistence differs',
      );
    } finally {
      await store.close();
    }
  } else {
    const { loadRuntimeConfig } = await ownedImport('src/config/runtime-config.ts');
    const { loadProjectSetContext } = await ownedImport('src/config/project-context.ts');
    const { deriveWorkspaceId } = await ownedImport('src/workspace-identity.ts');
    const { openHostStateDatabase, HostStateStore } = await ownedImport('src/host-state.ts');
    const { canonicalJsonDigest } = await ownedImport('src/contracts/public-ingress.ts');
    const config = loadRuntimeConfig(consumer),
      project = loadProjectSetContext(consumer, config, 'native-ci', ['project']);
    requireCI(
      project.repository_id === 'native-ci' && json(project.project_ids) === json(['project']),
      'actual ProjectContext differs',
    );
    const databasePath = path.join(consumer, 'native-host.sqlite'),
      workspace = deriveWorkspaceId(project.repository_id, consumer);
    let database = openHostStateDatabase(databasePath),
      store;
    const verifier = {
      principal: 'ci:isolated-controller',
      projectIds: ['project'],
      verify: (fence) => ({
        schema: 'MaintenanceReleaseAuthorization/v1',
        principal: 'ci:isolated-controller',
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: fence.binding.closure_digest,
        bundle_digest: fence.binding.bundle_digest,
      }),
    };
    const create = (handle) =>
      new HostStateStore(handle, workspace, undefined, undefined, undefined, verifier, consumer);
    try {
      store = create(database);
      const key = sha('native-ci-operation'),
        binding = sha(ctx.request.request_id);
      const operation = store.reserveOperation('native-ci', key, binding);
      requireCI(operation, 'native operation reservation unavailable');
      store.transitionOperation(operation, 'commit_unknown');
      requireCI(
        store.reserveOperation('native-ci', key, binding) === null &&
          store.inspectOperation('native-ci', key).status === 'commit_unknown',
        'UNKNOWN operation was reissued',
      );
      assert.throws(() =>
        store.transitionOperation(
          { ...operation, fencing_token: '00000000-0000-4000-8000-000000000000' },
          'applied',
          binding,
        ),
      );
      store.transitionOperation(operation, 'applied', binding);
      assert.throws(() => store.transitionOperation(operation, 'applied', sha('changed effect')));
      const digest = sha(json(ctx.request));
      const fence = store.acquireMaintenanceFence({
        schema: 'MaintenanceFenceBinding/v1',
        project_ids: ['project'],
        operation_id: 'ci-native-maintenance',
        manifest_digest: digest,
        request_digest: digest,
        bindings_digest: digest,
        closure_digest: digest,
        bundle_digest: digest,
      });
      assert.throws(() => store.reserveOperation('native-ci', sha('fenced'), binding));
      await store.releaseMaintenanceFence(fence);
      requireCI(store.inspectOperation('native-ci', key).status === 'applied', 'native operation settlement differs');
      // Keep the actual SQLite connection open so real WAL/SHM custody is checked.
      const files = [
        'owner.txt',
        'agent-runtime.config.v1.yaml',
        'native-host.sqlite',
        'native-host.sqlite-wal',
        'native-host.sqlite-shm',
      ];
      const before = files.map((file) => physical(consumer, file));
      const invoke = runner(ctx, 'open-native-state');
      const asset = assetFor(ctx, candidate);
      await invokeNative(invoke, asset.path, env, [
        'init',
        '--project-root',
        consumer,
        '--repository',
        'native-ci',
        '--project',
        'project=.',
        '--reconcile-existing',
      ]);
      await invokeNative(invoke, asset.path, env, ['install', '--check']);
      absentProtectedPath(
        consumer,
        '.agent/work/agent-local-release/ci-missing/release.json',
        'expected embedded release-retarget first-read journal is not absent',
      );
      await invoke.denied(
        asset.path,
        [
          'reconcile-artifacts',
          '--kind',
          'release-retarget',
          '--mode',
          'inspect',
          '--project-root',
          consumer,
          '--operation',
          'ci-missing',
        ],
        { env },
        jsonDenial({ status: 'blocked' }, { exact: 'Local release: path missing' }),
      );
      files.forEach((file, index) =>
        requireCI(physical(consumer, file).equals(before[index]), 'live consumer DB/WAL/SHM or owner bytes changed'),
      );
    } finally {
      database.close();
    }
    database = openHostStateDatabase(databasePath);
    try {
      store = create(database);
      requireCI(
        store.inspectOperation('native-ci', sha('native-ci-operation')).status === 'applied',
        'native Host restart persistence differs',
      );
    } finally {
      database.close();
    }
  }
  exclusive(ctx.root, mode + '-native-observation.json', {
    mode,
    request_id: ctx.request.request_id,
    status: 'passed',
  });
}

async function nativeProbePhase(ctx, candidate, invoke, mode) {
  const env = nativeEnvironment(ctx, mode === 'dependencies' ? 'dependencies' : 'state');
  const asset = assetFor(ctx, candidate);
  await initializeConsumer(ctx, invoke, asset.path, env, mode);
  await invokeNative(invoke, asset.path, { ...env, BUN_BE_BUN: '1' }, [
    '--no-env-file',
    '--no-install',
    fileURLToPath(import.meta.url),
    '--embedded-probe',
    mode,
  ]);
  const observation = JSON.parse(physical(ctx.root, mode + '-native-observation.json', 1024 * 1024));
  requireCI(
    observation.mode === mode && observation.request_id === ctx.request.request_id && observation.status === 'passed',
    'actual native dependency/state observation unavailable',
  );
}

async function concurrentResource(ctx, candidate) {
  const env = nativeEnvironment(ctx, 'concurrent-resources'),
    asset = assetFor(ctx, candidate),
    args = ['instructions', '--path', 'development-lifecycle'];
  const children = [0, 1].map(() => {
    const child = spawn(asset.path, args, {
      cwd: ctx.root,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return observeChildClose(child, asset.path, args);
  });
  const joined = await Promise.allSettled(children);
  requireCI(
    joined.every((result) => result.status === 'fulfilled'),
    'concurrent native child outcome UNKNOWN; retain roots',
  );
  const results = joined.map((result) => result.value);
  requireCI(
    results.every(
      (result) =>
        result.command === asset.path &&
        json(result.args) === json(args) &&
        result.code === 0 &&
        result.signal === null,
    ),
    'concurrent native resource outcome failed/UNKNOWN',
  );
  requireCI(
    JSON.parse(results[0].stdout.trim()).path === JSON.parse(results[1].stdout.trim()).path,
    'concurrent native resources diverged',
  );
}
async function interruptedResource(ctx, candidate, invoke) {
  const env = nativeEnvironment(ctx, 'interrupted-resources'),
    asset = assetFor(ctx, candidate);
  const cache = releaseDirectory(env.USERPROFILE, '.vida-agent/runtime');
  const args = ['instructions', '--path', 'development-lifecycle'];
  let pendingName = null;
  const child = spawn(asset.path, args, {
    cwd: ctx.root,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const terminalPromise = observeChildClose(child, asset.path, args);
  const observation = watch(cache, (_event, filename) => {
    if (String(filename).startsWith('.pending-') && readdirSync(cache).some((name) => name.endsWith('.lock'))) {
      pendingName = String(filename);
      child.kill();
    }
  });
  let terminal;
  try {
    terminal = await terminalPromise;
  } finally {
    observation.close();
  }
  requireCI(
    terminal.command === asset.path &&
      json(terminal.args) === json(args) &&
      pendingName?.startsWith('.pending-' + ctx.request.version + '-') &&
      (terminal.signal !== null || terminal.code !== 0),
    'interrupted native publication was not actually observed',
  );
  const locks = readdirSync(cache).filter((name) => name.endsWith('.lock'));
  const expectedLock = ctx.request.version + '-' + candidate.manifest.payloadId + '.lock';
  requireCI(locks.length === 1 && locks[0] === expectedLock, 'interrupted publication custody unavailable');
  const pendingPath = releasePath(cache, pendingName, true),
    pendingBefore = lstatSync(pendingPath, { throwIfNoEntry: false });
  requireCI(pendingBefore?.isDirectory() && !pendingBefore.isSymbolicLink(), 'interrupted pending tree is unavailable');
  const pendingEntries = readdirSync(pendingPath).sort(),
    marker = physical(cache, expectedLock, 1024),
    lockBefore = lstatSync(releasePath(cache, expectedLock));
  await invoke.denied(
    asset.path,
    args,
    { env },
    cliError('Resource publication remains in progress or uncertain; retain it for inspection'),
  );
  const pendingAfter = lstatSync(pendingPath, { throwIfNoEntry: false }),
    lockAfter = lstatSync(releasePath(cache, expectedLock));
  requireCI(
    pendingAfter?.isDirectory() &&
      !pendingAfter.isSymbolicLink() &&
      pendingBefore.dev === pendingAfter.dev &&
      pendingBefore.ino === pendingAfter.ino &&
      json(readdirSync(pendingPath).sort()) === json(pendingEntries) &&
      lockBefore.dev === lockAfter.dev &&
      lockBefore.ino === lockAfter.ino &&
      physical(cache, expectedLock, 1024).equals(marker),
    'UNKNOWN native resource publication custody changed',
  );
}

async function statePreservation(ctx, candidate, invoke) {
  await nativeProbePhase(ctx, candidate, invoke, 'state');
  const consumer = path.join(ctx.root, 'consumers/state'),
    env = nativeEnvironment(ctx, 'state'),
    asset = assetFor(ctx, candidate);
  const names = ['owner.txt', 'agent-runtime.config.v1.yaml', 'native-host.sqlite'];
  const before = names.map((name) => physical(consumer, name));
  await invokeNative(invoke, asset.path, env, [
    'init',
    '--project-root',
    consumer,
    '--repository',
    'native-ci',
    '--project',
    'project=.',
    '--reconcile-existing',
  ]);
  await invokeNative(invoke, asset.path, env, ['install', '--check']);
  names.forEach((name, index) =>
    requireCI(physical(consumer, name).equals(before[index]), 'consumer owner configuration/database changed'),
  );
  for (const kind of ['tampered', 'partial', 'conflicting', 'hardlink', 'symlink']) {
    const faultEnv = nativeEnvironment(ctx, 'resources-' + kind);
    const instruction = JSON.parse(
      await invokeNative(invoke, asset.path, faultEnv, ['instructions', '--path', 'development-lifecycle']),
    );
    const resourceRoot = path.join(
        faultEnv.USERPROFILE,
        '.vida-agent/runtime',
        ctx.request.version + '-' + candidate.manifest.payloadId,
      ),
      expectedInstruction = path.join(resourceRoot, 'instructions/development-lifecycle.md'),
      folder = path.dirname(path.dirname(instruction.path));
    requireCI(
      instruction.path === expectedInstruction && folder === resourceRoot,
      'selected instruction path differs from the owned resource fixture',
    );
    const instructionStat = lstatSync(instruction.path),
      instructionBytes = readFileSync(instruction.path);
    requireCI(
      instructionStat.isFile() && !instructionStat.isSymbolicLink() && instructionStat.nlink === 1,
      'selected instruction fixture is not a private regular file',
    );
    let foreign, expectedFaultBytes, expectedForeignStat;
    if (kind === 'tampered') {
      expectedFaultBytes = Buffer.from('changed CI resource');
      writeFileSync(instruction.path, expectedFaultBytes);
      const changed = lstatSync(instruction.path);
      requireCI(
        !readFileSync(instruction.path).equals(instructionBytes) &&
          changed.dev === instructionStat.dev &&
          changed.ino === instructionStat.ino,
        'tampered resource bytes or targeted file identity did not remain observable',
      );
    }
    if (kind === 'partial') {
      unlinkSync(instruction.path);
      requireCI(!lstatSync(instruction.path, { throwIfNoEntry: false }), 'partial resource target remains present');
    }
    if (kind === 'conflicting') {
      foreign = path.join(folder, 'foreign.txt');
      expectedFaultBytes = Buffer.from('conflict');
      writeFileSync(foreign, expectedFaultBytes);
      expectedForeignStat = lstatSync(foreign);
      requireCI(readFileSync(foreign).equals(expectedFaultBytes), 'conflicting fixture bytes differ');
    }
    if (kind === 'hardlink') {
      foreign = path.join(faultEnv.USERPROFILE, 'foreign-hardlink.md');
      linkSync(instruction.path, foreign);
      const linked = lstatSync(instruction.path),
        foreignStat = lstatSync(foreign);
      requireCI(
        linked.nlink === 2 && linked.dev === foreignStat.dev && linked.ino === foreignStat.ino,
        'hardlink fixture identity was not observed',
      );
      expectedForeignStat = foreignStat;
      expectedFaultBytes = readFileSync(foreign);
    }
    if (kind === 'symlink') {
      unlinkSync(instruction.path);
      foreign = path.join(faultEnv.USERPROFILE, 'foreign-resource.md');
      expectedFaultBytes = Buffer.from('foreign');
      writeFileSync(foreign, expectedFaultBytes);
      expectedForeignStat = lstatSync(foreign);
      const { symlinkSync } = await import('node:fs');
      symlinkSync(foreign, instruction.path);
      requireCI(
        lstatSync(instruction.path).isSymbolicLink() && realpathSync(instruction.path) === foreign,
        'symlink fixture target was not observed',
      );
    }
    const expectedMessage = {
      tampered: 'Resource payload differs',
      partial: 'Resource tree is partial',
      conflicting: 'Resource tree contains an unknown file',
      hardlink: 'Resource file must be regular and unlinked: instructions/development-lifecycle.md',
      symlink: 'Resource tree contains a link',
    }[kind];
    await invoke.denied(
      asset.path,
      ['instructions', '--path', 'development-lifecycle'],
      { env: faultEnv },
      cliError(expectedMessage),
    );
    if (kind === 'tampered') {
      const after = lstatSync(instruction.path);
      requireCI(
        after.isFile() &&
          !after.isSymbolicLink() &&
          after.nlink === 1 &&
          after.dev === instructionStat.dev &&
          after.ino === instructionStat.ino &&
          readFileSync(instruction.path).equals(expectedFaultBytes),
        'tampered resource changed after the denial observation',
      );
    } else if (kind === 'partial') {
      requireCI(
        !lstatSync(instruction.path, { throwIfNoEntry: false }),
        'partial resource target changed after the denial observation',
      );
    } else if (kind === 'conflicting') {
      const after = lstatSync(foreign);
      requireCI(
        after.isFile() &&
          !after.isSymbolicLink() &&
          after.dev === expectedForeignStat.dev &&
          after.ino === expectedForeignStat.ino &&
          readFileSync(foreign).equals(expectedFaultBytes),
        'conflicting fixture changed after the denial observation',
      );
    } else if (kind === 'hardlink') {
      const linked = lstatSync(instruction.path),
        foreignStat = lstatSync(foreign);
      requireCI(
        linked.isFile() &&
          !linked.isSymbolicLink() &&
          linked.nlink === 2 &&
          linked.dev === instructionStat.dev &&
          linked.ino === instructionStat.ino &&
          foreignStat.dev === expectedForeignStat.dev &&
          foreignStat.ino === expectedForeignStat.ino &&
          foreignStat.nlink === 2 &&
          readFileSync(foreign).equals(expectedFaultBytes),
        'hardlink target or foreign fixture changed after the denial observation',
      );
    } else {
      const link = lstatSync(instruction.path),
        foreignStat = lstatSync(foreign);
      requireCI(
        link.isSymbolicLink() &&
          realpathSync(instruction.path) === foreign &&
          foreignStat.isFile() &&
          !foreignStat.isSymbolicLink() &&
          foreignStat.dev === expectedForeignStat.dev &&
          foreignStat.ino === expectedForeignStat.ino &&
          readFileSync(foreign).equals(expectedFaultBytes),
        'symlink target or foreign fixture changed after the denial observation',
      );
    }
  }
  await concurrentResource(ctx, candidate);
  await interruptedResource(ctx, candidate, invoke);
}

async function upgradeRecovery(ctx, candidate, invoke) {
  const asset = assetFor(ctx, candidate),
    prefix = path.join(ctx.root, 'upgrade/bin'),
    destination = path.join(prefix, 'vida-agent.exe');
  releaseDirectory(ctx.root, 'upgrade/bin');
  exclusive(prefix, 'vida-agent.cmd', Buffer.from('preserved CI prior shim\n'));
  const shim = physical(prefix, 'vida-agent.cmd', 1024);
  publishNativeExecutable(asset, destination);
  assert.throws(() => publishNativeExecutable(asset, destination), {
    message: 'Native destination has an unowned or linked prior artifact.',
  });
  const prior = { path: destination, bytes: asset.bytes, sha256: asset.sha256 };
  assert.throws(() => publishNativeExecutable(asset, destination, { ...prior, sha256: sha('foreign prior') }), {
    message: 'Prior native artifact differs.',
  });
  publishNativeExecutable(asset, destination, prior);
  requireCI(
    sha(physical(prefix, 'vida-agent.exe')) === asset.sha256 && physical(prefix, 'vida-agent.cmd', 1024).equals(shim),
    'native upgrade changed asset/shim',
  );
  const env = nativeEnvironment(ctx, 'upgrade'),
    consumer = await initializeConsumer(ctx, invoke, destination, env, 'upgrade');
  const owner = physical(consumer, 'owner.txt'),
    configuration = physical(consumer, 'agent-runtime.config.v1.yaml');
  const rollback = path.join(ctx.root, 'upgrade/rollback/vida-agent.exe');
  publishNativeExecutable(asset, rollback);
  const version = JSON.parse(await invokeNative(invoke, rollback, env, ['version']));
  requireCI(
    version.version === ctx.request.version &&
      physical(consumer, 'owner.txt').equals(owner) &&
      physical(consumer, 'agent-runtime.config.v1.yaml').equals(configuration),
    'declared same-version rollback changed consumer data',
  );
  // Actual concurrent first publication through the same production installer helper.
  const raceDestination = path.join(ctx.root, 'upgrade/race/vida-agent.exe'),
    raceArgs = [fileURLToPath(import.meta.url), '--publish-race'];
  const joined = await Promise.allSettled(
    [0, 1].map(async (index) => {
      const invokeRace = runner(ctx, 'publication-race-' + index);
      try {
        await invokeRace(process.execPath, raceArgs);
        return 'published';
      } catch (commandError) {
        const observed = JSON.parse(physical(ctx.root, 'logs/publication-race-' + index + '/0.json', 8 * 1024 * 1024));
        try {
          requireCI(
            observed.command === process.execPath && json(observed.args) === json(raceArgs),
            'concurrent publication rejection child differs',
          );
          validateNativeCIDenial(
            observed,
            jsonDenial(
              {
                status: 'blocked',
                code: 'GAP-VIDA-CI-DELIVERY-001',
                custody: 'retain issued intent and bytes; no automatic cleanup/reissue',
              },
              {
                oneOf: [
                  { exact: 'Native destination has an unowned or linked prior artifact.' },
                  { prefix: 'EEXIST:', includes: ['copyfile', raceDestination] },
                ],
              },
            ),
          );
        } catch (validationError) {
          throw nativeCIDenialError(validationError.message, observed, commandError);
        }
        return 'denied';
      }
    }),
  );
  requireCI(
    joined.every((result) => result.status === 'fulfilled'),
    'native publication child outcome UNKNOWN; retain custody',
  );
  const results = joined.map((result) => result.value);
  requireCI(
    results.filter((status) => status === 'published').length === 1 &&
      results.filter((status) => status === 'denied').length === 1 &&
      sha(physical(ctx.root, 'upgrade/race/vida-agent.exe')) === asset.sha256,
    'concurrent first native publication did not retain exclusivity',
  );
}

async function phase(ctx, name) {
  requireCI([...nativeDeliveryChecks, 'emit-result'].includes(name), 'unknown CI phase');
  const count = name === 'emit-result' ? nativeDeliveryChecks.length : nativeDeliveryChecks.indexOf(name);
  const candidate = count === 0 ? null : candidateFor(ctx);
  const receipts = nativeDeliveryChecks
    .slice(0, count)
    .map((id) => JSON.parse(physical(ctx.root, 'phases/' + id + '.result.json', 1024 * 1024)));
  if (candidate)
    validateNativeCIReceipts({ identity: ctx, candidate, receipts, phases: nativeDeliveryChecks.slice(0, count) });
  const intent = 'phases/' + name + '.intent.json';
  requireCI(
    !existsSync(releasePath(ctx.root, intent, true)),
    'prior issued CI phase retained; inspect UNKNOWN, no reissue',
  );
  exclusive(ctx.root, intent, {
    request_id: ctx.request.request_id,
    run_id: ctx.run_id,
    run_attempt: ctx.run_attempt,
    phase: name,
    status: 'issued',
  });
  console.log(
    json({
      phase: name,
      status: 'issued',
      request_id: ctx.request.request_id,
      run_id: ctx.run_id,
      run_attempt: ctx.run_attempt,
    }).trim(),
  );
  const invoke = runner(ctx, name);
  if (name === 'native-build') await nativeBuild(ctx, invoke);
  if (name === 'native-install') await nativeInstall(ctx, candidate, invoke);
  if (name === 'public-routes') await publicRoutes(ctx, candidate, invoke);
  if (name === 'offline-runtime') await offlineRuntime(ctx, candidate, invoke);
  if (name === 'native-dependencies') await nativeProbePhase(ctx, candidate, invoke, 'dependencies');
  if (name === 'state-preservation') await statePreservation(ctx, candidate, invoke);
  if (name === 'upgrade-recovery') await upgradeRecovery(ctx, candidate, invoke);
  context();
  const after = candidateFor(ctx);
  if (candidate) requireCI(json(after) === json(candidate), 'candidate changed during native phase');
  const currentReceipts = nativeDeliveryChecks
    .slice(0, count)
    .map((id) => JSON.parse(physical(ctx.root, 'phases/' + id + '.result.json', 1024 * 1024)));
  requireCI(json(currentReceipts) === json(receipts), 'prior CI receipt changed during native phase');
  validateNativeCIReceipts({
    identity: ctx,
    candidate: after,
    receipts: currentReceipts,
    phases: nativeDeliveryChecks.slice(0, count),
  });
  if (name === 'emit-result') {
    const bytes = encodeCIDeliveryResult({
      request: ctx.request,
      candidate: after,
      profile: profileFor(ctx.request),
      observation: {
        issuer: 'github-actions',
        run_id: ctx.run_id,
        run_attempt: ctx.run_attempt,
        conclusion: 'success',
        checks: nativeDeliveryChecks.map((id) => ({ id, status: 'passed' })),
      },
    });
    exclusive(ctx.root, 'output/result.json', bytes);
    requireCI(typeof process.env.GITHUB_OUTPUT === 'string', 'actual CI output boundary missing');
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      'directory=' +
        path.join(ctx.root, 'output') +
        '\nartifact_name=' +
        ctx.request.request_id +
        '-' +
        ctx.run_attempt +
        '\narchive_file=' +
        after.pack_metadata[0].filename +
        '\n',
      { flag: 'a' },
    );
  }
  exclusive(ctx.root, 'phases/' + name + '.result.json', {
    schema: 'VidaCIPhaseResult/v1',
    request_id: ctx.request.request_id,
    run_id: ctx.run_id,
    run_attempt: ctx.run_attempt,
    source_binding: ctx.request.source_binding,
    archive_sha256: after.archive_sha256,
    phase: name,
    status: 'passed',
  });
  console.log(json({ phase: name, status: 'passed', request_id: ctx.request.request_id }).trim());
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const ctx = context();
    const args = process.argv.slice(2);
    if (args.length === 2 && args[0] === '--phase') await phase(ctx, args[1]);
    else if (args.length === 2 && args[0] === '--embedded-probe' && ['dependencies', 'state'].includes(args[1]))
      await embeddedProbe(ctx, candidateFor(ctx), args[1]);
    else if (args.length === 1 && args[0] === '--publish-race') {
      const asset = assetFor(ctx, candidateFor(ctx));
      publishNativeExecutable(asset, path.join(ctx.root, 'upgrade/race/vida-agent.exe'));
    } else throw Error('GAP-VIDA-CI-DELIVERY-001: fixed CI phase required');
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'blocked',
        code: 'GAP-VIDA-CI-DELIVERY-001',
        message: error.message,
        custody: 'retain issued intent and bytes; no automatic cleanup/reissue',
      }),
    );
    process.exitCode = 1;
  }
}
