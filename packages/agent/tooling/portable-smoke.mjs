import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { boundedSpawnSync, checkManifest, pinnedEnvironment, readPin, resolvePinnedBun } from '../bin/bun.mjs';

const bundleRoot = path.resolve(import.meta.dirname, '..');
const smokeArgs = process.argv.slice(2);
const optionValues = new Map();
for (let index = 0; index < smokeArgs.length; index += 2) {
  const name = smokeArgs[index];
  const value = smokeArgs[index + 1];
  if (!['--archive', '--result'].includes(name ?? '') || !value || !path.isAbsolute(value) || optionValues.has(name))
    throw new Error(
      'Usage: node tooling/portable-smoke.mjs [--archive <absolute-package-tarball>] [--result <absolute-result-path>]',
    );
  optionValues.set(name, value);
}
const resultPath =
  optionValues.get('--result') ??
  path.join(os.tmpdir(), `vida-agent-portable-smoke-${process.pid}-${Date.now()}.result.json`);
const providedArchive = optionValues.get('--archive');
const temporary = mkdtempSync(path.join(os.tmpdir(), 'vida-agent-portable-smoke-'));
const projectRoot = path.join(temporary, 'unrelated-project');
const copiedBundle = path.join(projectRoot, 'vida-agent');
let packageSha256 = null;
let executable = null;
let resolvedPin = null;

function run(cwd, args, environmentOverrides = {}, timeout = 180_000) {
  const pin = readPin(cwd);
  checkManifest(cwd, pin);
  if (executable === null) {
    executable = resolvePinnedBun({ root: cwd });
    resolvedPin = pin;
  }
  assert.equal(pin, resolvedPin, 'copied bundle must use the validated Bun version');
  const result = boundedSpawnSync(
    spawnSync,
    executable,
    args,
    {
      cwd,
      env: { ...pinnedEnvironment(executable, process.env, cwd), ...environmentOverrides },
      encoding: 'utf8',
      windowsHide: true,
      timeout,
    },
    'Portable smoke Bun command',
  );
  assert.equal(result.status, 0, `${args.join(' ')} failed:\n${result.stderr}`);
  return result.stdout;
}

function runProgram(cwd, command, args) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180_000,
  });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed:\n${result.stderr}`);
}

function writeResult(result) {
  mkdirSync(path.dirname(resultPath), { recursive: true });
  const temporaryResult = `${resultPath}.${process.pid}.tmp`;
  writeFileSync(temporaryResult, `${JSON.stringify(result)}\n`, { encoding: 'utf8', flag: 'wx' });
  renameSync(temporaryResult, resultPath);
  process.stdout.write(`Portable smoke receipt: ${resultPath}\n`);
}

try {
  rmSync(resultPath, { force: true });
  let archive = providedArchive;
  if (!archive) {
    const packedOutput = run(bundleRoot, ['pm', 'pack', '--destination', temporary, '--quiet', '--ignore-scripts']);
    const archiveName = packedOutput.trim().split(/\r?\n/u).at(-1);
    assert.ok(archiveName, 'package pack must report an archive');
    archive = path.isAbsolute(archiveName) ? archiveName : path.join(temporary, archiveName);
  }
  packageSha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
  const unpacked = path.join(temporary, 'unpacked');
  mkdirSync(unpacked);
  runProgram(temporary, 'tar', ['-xzf', archive, '-C', unpacked]);
  cpSync(path.join(unpacked, 'package'), copiedBundle, { recursive: true });
  assert.equal(existsSync(path.join(copiedBundle, 'package.json')), true);
  assert.equal(existsSync(path.join(copiedBundle, '..', 'agent-runtime')), false);

  run(copiedBundle, ['install', '--frozen-lockfile']);
  run(copiedBundle, [
    'bin/init.mjs',
    '--project-root',
    projectRoot,
    '--repository',
    'portable-fixture',
    '--project',
    'portable-project',
  ]);
  for (const relative of [
    'AGENTS.md',
    'AGENT.sidecar.md',
    'agent-runtime.config.v1.yaml',
    'docs/agent-instructions/documentation-policy.v1.json',
    '.agent/runtime-initialization.v1.json',
  ])
    assert.equal(existsSync(path.join(projectRoot, relative)), true, `initializer must create ${relative}`);

  const output = run(copiedBundle, [
    'bin/run.mjs',
    '--project-root',
    projectRoot,
    '--repository',
    'portable-fixture',
    '--project',
    'portable-project',
    '--work-path',
    'work/portable-smoke',
    '--team',
    'default-development',
    '--kind',
    'task',
    '--intent',
    'task_execution',
    '--workflow',
    'task_execution',
    '--work-id',
    'portable-smoke',
    '--attempt',
    '1',
    '--scope-digest',
    'a'.repeat(64),
  ]);
  const result = JSON.parse(output.trim().split(/\r?\n/u).at(-1));
  assert.equal(result.schema, 'VidaAgentRunResult/v1');
  assert.equal(result.status, 'prepared');
  assert.equal(result.execution_status, 'suspended');
  assert.equal(result.resume_status, 'ready');
  assert.equal(result.mastra_step_id, 'wave-0');
  assert.ok(Array.isArray(result.next_actions) && result.next_actions.length > 0);
  // Execute the shipped repair and admission contour from the extracted package.
  // Explicit fixture inputs prevent a checkout or prior candidate from supplying source.
  const repairFixtures = path.join(temporary, 'repair-fixtures');
  mkdirSync(repairFixtures);
  run(
    copiedBundle,
    [
      'test',
      'tests/runtime-config-rebind.test.mjs',
      'tests/documentation-policy-transition.test.mjs',
      'tests/forward-candidate-admission.test.mjs',
      'tests/forward-candidate-authority.test.mjs',
    ],
    {
      VIDA_CONFIG_REBIND_TEST_BUNDLE: copiedBundle,
      VIDA_POLICY_TEST_BUNDLE: copiedBundle,
      VIDA_ADMISSION_TEST_BUNDLE: copiedBundle,
      VIDA_CONFIG_REBIND_FIXTURE_ROOT: repairFixtures,
      VIDA_DOCUMENTATION_POLICY_FIXTURE_ROOT: repairFixtures,
      AGENT_RUNTIME_TEST_REPOSITORY_ROOT: undefined,
    },
    300_000,
  );
  const receipt = {
    schema: 'VidaAgentPortableSmoke/v1',
    status: 'passed',
    package_sha256: packageSha256,
    copied_bundle: true,
    initialization_files: [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
      '.agent/runtime-initialization.v1.json',
    ],
    run_result: {
      schema: result.schema,
      status: result.status,
      execution_status: result.execution_status,
    },
  };
  writeResult(receipt);
  console.log(JSON.stringify(receipt));
} catch (error) {
  writeResult({
    schema: 'VidaAgentPortableSmoke/v1',
    status: 'failed',
    package_sha256: packageSha256,
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
