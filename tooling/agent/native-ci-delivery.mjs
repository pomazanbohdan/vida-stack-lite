// Repository-owned CI producer. Importing this module never builds or installs.
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
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
import { runCommand, parsePackOutput } from './release-local.mjs';
import { findNpmCli } from '../../packages/agent/bin/bun.mjs';
import {
  ciArchiveLimit,
  ciTransportLimit,
  nativeDeliveryChecks,
  minimumNativeDeliveryChecks,
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
  required_checks: [...minimumNativeDeliveryChecks],
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

async function emitBuild(ctx) {
  const phaseName = 'emit-build';
  const intent = 'phases/' + phaseName + '.intent.json';
  const outputDirectory = path.join(ctx.root, 'publication');
  const artifactName = 'build-' + ctx.request.request_id + '-' + ctx.run_id + '-' + ctx.run_attempt;
  requireCI(
    typeof process.env.GITHUB_OUTPUT === 'string' && !/[\r\n\0]/.test(process.env.GITHUB_OUTPUT),
    'actual CI output boundary missing',
  );
  requireCI(
    !existsSync(releasePath(ctx.root, intent, true)),
    'prior issued build publication retained; inspect UNKNOWN, no reissue',
  );
  requireCI(
    !existsSync(releasePath(ctx.root, 'publication', true)),
    'prior build artifact directory retained; inspect UNKNOWN, no reissue',
  );
  requireCI(
    !/[\r\n\0]/.test(outputDirectory) && /^[A-Za-z0-9._-]{1,255}$/.test(artifactName),
    'CI build artifact output identity is unsafe',
  );
  const candidateBytes = physical(ctx.root, 'candidate.json', 8 * 1024 * 1024);
  const candidate = JSON.parse(candidateBytes.toString('utf8'));
  const receiptBytes = physical(ctx.root, 'phases/native-build.result.json', 1024 * 1024);
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  validateNativeCIReceipts({ identity: ctx, candidate, receipts: [receipt], phases: ['native-build'] });
  const pack = candidate.pack_metadata?.[0];
  requireCI(
    Array.isArray(candidate.pack_metadata) &&
      candidate.pack_metadata.length === 1 &&
      pack?.name === 'vida-agent' &&
      pack.version === ctx.request.version &&
      pack.filename === 'vida-agent-' + ctx.request.version + '.tgz' &&
      path.basename(pack.filename) === pack.filename,
    'CI native build pack identity differs',
  );
  requireCI(
    candidate.manifest?.schema === 'VidaStandaloneBuild/v1' &&
      candidate.manifest.version === ctx.request.version &&
      candidate.manifest.target === ctx.request.target &&
      candidate.manifest.pin === '1.4.2' &&
      candidate.manifest.asset?.file === 'vida-agent-bun-windows-x64.exe',
    'CI native build manifest identity differs',
  );
  const manifestBytes = physical(ctx.root, 'package/dist/standalone/manifest.json', 8 * 1024 * 1024);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const assetBytes = physical(ctx.root, 'package/dist/standalone/' + manifest.asset.file, ciArchiveLimit);
  const archiveBytes = physical(ctx.root, 'output/' + pack.filename, ciArchiveLimit);
  const installerBytes = physical(ctx.source, 'packages/agent/tooling/install-windows.ps1', 1024 * 1024);
  requireCI(
    manifest.schema === 'VidaStandaloneBuild/v1' &&
      manifest.version === ctx.request.version &&
      manifest.target === ctx.request.target &&
      manifest.pin === '1.4.2' &&
      manifest.asset.file === 'vida-agent-bun-windows-x64.exe' &&
      manifestBytes.equals(physical(ctx.source, 'packages/agent/dist/standalone/manifest.json', 8 * 1024 * 1024)) &&
      assetBytes.equals(physical(ctx.source, 'packages/agent/dist/standalone/' + manifest.asset.file)),
    'CI source and native bytes differ',
  );
  requireCI(
    candidate.archive_sha256 === sha(archiveBytes) &&
      candidate.manifest_sha256 === sha(manifestBytes) &&
      manifest.asset.sha256 === sha(assetBytes) &&
      manifest.asset.bytes === assetBytes.length,
    'CI build candidate binding differs',
  );
  const packedFiles = Array.isArray(pack.files) ? pack.files : [];
  const packedManifest = packedFiles.filter((file) => file?.path === 'dist/standalone/manifest.json');
  const packedAsset = packedFiles.filter((file) => file?.path === 'dist/standalone/' + manifest.asset.file);
  requireCI(
    packedManifest.length === 1 &&
      packedManifest[0].size === manifestBytes.length &&
      packedAsset.length === 1 &&
      packedAsset[0].size === assetBytes.length,
    'CI native pack inventory differs',
  );
  const files = [
    [pack.filename, archiveBytes, ciArchiveLimit],
    [manifest.asset.file, assetBytes, ciArchiveLimit],
    ['manifest.json', manifestBytes, 8 * 1024 * 1024],
    ['candidate.json', candidateBytes, 8 * 1024 * 1024],
    ['native-build.result.json', receiptBytes, 1024 * 1024],
    ['install-windows.ps1', installerBytes, 1024 * 1024],
  ];
  const names = files.map(([name]) => name);
  requireCI(
    names.length === 6 && new Set(names).size === 6 && names.every((name) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)),
    'CI build artifact inventory differs',
  );
  const totalBytes = files.reduce((total, [, bytes, limit]) => {
    requireCI(bytes.length > 0 && bytes.length <= limit, 'CI build artifact member exceeds its bound');
    return total + bytes.length;
  }, 0);
  requireCI(totalBytes <= ciTransportLimit, 'CI build artifact exceeds transport bound');
  exclusive(ctx.root, intent, {
    request_id: ctx.request.request_id,
    run_id: ctx.run_id,
    run_attempt: ctx.run_attempt,
    phase: phaseName,
    status: 'issued',
  });
  console.log(
    json({
      phase: phaseName,
      status: 'issued',
      request_id: ctx.request.request_id,
      run_id: ctx.run_id,
      run_attempt: ctx.run_attempt,
    }).trim(),
  );
  releaseDirectory(ctx.root, 'publication');
  for (const [name, bytes, limit] of files) {
    exclusive(ctx.root, 'publication/' + name, bytes);
    requireCI(physical(ctx.root, 'publication/' + name, limit).equals(bytes), 'CI build artifact copy differs');
  }
  requireCI(
    json(readdirSync(outputDirectory).sort()) === json(names.slice().sort()),
    'CI build artifact output is not the exact flat allowlist',
  );
  const afterContext = context();
  const afterCandidateBytes = physical(afterContext.root, 'candidate.json', 8 * 1024 * 1024);
  const afterReceiptBytes = physical(afterContext.root, 'phases/native-build.result.json', 1024 * 1024);
  const afterArchiveBytes = physical(afterContext.root, 'output/' + pack.filename, ciArchiveLimit);
  const afterManifestBytes = physical(afterContext.root, 'package/dist/standalone/manifest.json', 8 * 1024 * 1024);
  const afterAssetBytes = physical(afterContext.root, 'package/dist/standalone/' + manifest.asset.file, ciArchiveLimit);
  const afterInstallerBytes = physical(afterContext.source, 'packages/agent/tooling/install-windows.ps1', 1024 * 1024);
  const afterCandidate = candidateFor(afterContext);
  requireCI(
    afterCandidateBytes.equals(candidateBytes) &&
      afterReceiptBytes.equals(receiptBytes) &&
      afterArchiveBytes.equals(archiveBytes) &&
      afterManifestBytes.equals(manifestBytes) &&
      afterAssetBytes.equals(assetBytes) &&
      afterInstallerBytes.equals(installerBytes) &&
      json(afterCandidate) === json(candidate),
    'CI build inputs changed during emission',
  );
  for (const [name, bytes, limit] of files)
    requireCI(
      physical(afterContext.root, 'publication/' + name, limit).equals(bytes),
      'CI build output changed during emission',
    );
  requireCI(
    json(readdirSync(outputDirectory).sort()) === json(names.slice().sort()),
    'CI build artifact output inventory changed during emission',
  );
  writeFileSync(
    process.env.GITHUB_OUTPUT,
    'directory=' +
      outputDirectory +
      '\n' +
      'artifact_name=' +
      artifactName +
      '\n' +
      'archive_file=' +
      pack.filename +
      '\n' +
      'asset_file=' +
      manifest.asset.file +
      '\n',
    { flag: 'a' },
  );
  // This result records formation provenance and integrity; it runs no test phase.
  const result = encodeCIDeliveryResult({
    request: ctx.request,
    candidate,
    profile: profileFor(ctx.request),
    observation: {
      issuer: 'github-actions',
      run_id: ctx.run_id,
      run_attempt: ctx.run_attempt,
      conclusion: 'success',
      checks: minimumNativeDeliveryChecks.map((id) => ({ id, status: 'passed' })),
    },
  });
  exclusive(ctx.root, 'output/result.json', result);
  writeFileSync(
    process.env.GITHUB_OUTPUT,
    'formation_directory=' +
      path.join(ctx.root, 'output') +
      '\n' +
      'formation_artifact_name=' +
      ctx.request.request_id +
      '-' +
      ctx.run_attempt +
      '\n' +
      'formation_archive_file=' +
      pack.filename +
      '\n',
    { flag: 'a' },
  );
  console.log(
    json({
      phase: phaseName,
      status: 'passed',
      request_id: ctx.request.request_id,
      artifact_name: artifactName,
      files: names,
    }).trim(),
  );
}
async function phase(ctx, name) {
  requireCI(name === 'native-build', 'only native formation is supported; tests belong to development tasks');
  const intent = 'phases/native-build.intent.json';
  requireCI(
    !existsSync(releasePath(ctx.root, intent, true)),
    'prior issued formation retained; inspect UNKNOWN, no reissue',
  );
  exclusive(ctx.root, intent, {
    request_id: ctx.request.request_id,
    run_id: ctx.run_id,
    run_attempt: ctx.run_attempt,
    phase: name,
    status: 'issued',
  });
  console.log(json({ phase: name, status: 'issued', request_id: ctx.request.request_id }).trim());
  await nativeBuild(ctx, runner(ctx, name));
  context();
  const candidate = candidateFor(ctx);
  exclusive(ctx.root, 'phases/native-build.result.json', {
    schema: 'VidaCIPhaseResult/v1',
    request_id: ctx.request.request_id,
    run_id: ctx.run_id,
    run_attempt: ctx.run_attempt,
    source_binding: ctx.request.source_binding,
    archive_sha256: candidate.archive_sha256,
    phase: name,
    status: 'passed',
  });
  console.log(json({ phase: name, status: 'passed', request_id: ctx.request.request_id }).trim());
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const ctx = context();
    const args = process.argv.slice(2);
    if (args.length === 2 && args[0] === '--phase' && args[1] === 'emit-build') await emitBuild(ctx);
    else if (args.length === 2 && args[0] === '--phase') await phase(ctx, args[1]);
    else throw Error('GAP-VIDA-CI-DELIVERY-001: fixed formation phase required');
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
