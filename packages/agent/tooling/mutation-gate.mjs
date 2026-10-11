import { randomUUID } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { checkManifest, pinnedEnvironment, readPin } from '../bin/bun.mjs';
import { maintainedSourceInventory } from './maintained-source-inventory.ts';
import { qualityInputs, qualityFingerprint, sha256 } from './bun-coverage-evidence.mjs';
import {
  buildMutationTestCommand,
  collectExecutionIdentity,
  confirmedRunnerOutcome,
  executeMutationCommand,
  junitOutcome,
  mutationReceiptMatches,
  mutationToolInputs,
  parseMutationBodyEvents,
  testFilesWithLifecycleHooks,
} from './mutation-evidence.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const junitByteLimit = 4 * 1024 * 1024;
const reportByteLimit = 32 * 1024 * 1024;
const strykerPartitionDeadlineMs = 90 * 60 * 1000;
const maximumStrykerDeadlineMs = 4 * 60 * 60 * 1000;

/** @typedef {Awaited<ReturnType<typeof qualityInputs>>} QualityInputs */
/** @typedef {{name: string, environment?: string, sources?: string[], tests?: string[], intendedTests?: string[], report?: string, requireMutants?: boolean, requiredReportedSource?: string}} MutationPartition */
/** @typedef {{id?: unknown, status: string, [key: string]: unknown}} MutationRecord */
/** @typedef {{source?: unknown, mutants?: MutationRecord[]}} MutationFileReport */
/** @typedef {{files: Record<string, MutationFileReport>, [key: string]: unknown}} MutationReport */
/** @typedef {{bytes: number, sha256: string, retained_bytes: number, truncated: boolean}} CapturedOutput */
/** @typedef {{exitCode: number|null, signal: NodeJS.Signals|null, spawnError: string|null, timedOut: boolean, processCustody: Record<string, unknown>|null, output_capture?: {complete: true, stdout: CapturedOutput, stderr: CapturedOutput}|{complete: false}}} MutationExecutionResult */
/** @typedef {{exitCode: number|null, observed_exit_code: number|null, signalCode: string|null, output_complete: boolean, timed_out: boolean, deadline_ms: number, spawn_error: string|null, process_custody: Record<string, unknown>|null, process_receipt: string, stdout_capture: Record<string, unknown>, stderr_capture: Record<string, unknown>}} MutationRunnerResult */
/** @typedef {{status: 'passed'|'killed'} | {status: 'unknown', reason: string}} ReceiptOutcome */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is MutationRecord} */
function mutationRecord(value) {
  return record(value) && typeof value.status === 'string';
}

/** @param {unknown} value @returns {value is MutationFileReport} */
function mutationFileReport(value) {
  if (!record(value) || value.mutants === undefined) return record(value);
  return Array.isArray(value.mutants) && value.mutants.every(mutationRecord);
}

/** @param {unknown} value @returns {value is MutationReport} */
function mutationReport(value) {
  if (!record(value) || !record(value.files)) return false;
  for (const file of Object.values(value.files)) if (!mutationFileReport(file)) return false;
  return true;
}

/** @param {MutationPartition} partition @returns {string[]} */
function partitionSources(partition) {
  if (partition.sources) return partition.sources;
  return partition.requiredReportedSource ? [partition.requiredReportedSource] : [];
}

/** @param {string} partition @param {string | null} mutantId */
function junitName(partition, mutantId) {
  const key = mutantId === null ? 'dry-run' : sha256(mutantId);
  return `${partition}-${key}.xml`;
}

/** @param {string} partition @param {string | null} mutantId */
function receiptName(partition, mutantId) {
  const key = mutantId === null ? 'dry-run' : sha256(mutantId);
  return `${partition}-${key}.receipt.json`;
}

/** @param {import('node:fs').Stats} info @returns {boolean} */
/** @param {import('node:fs').Stats} info @param {number} byteLimit @param {boolean} allowEmpty @returns {boolean} */
function isBoundedRegularFile(info, byteLimit, allowEmpty) {
  return (
    info.isFile() &&
    !info.isSymbolicLink() &&
    info.nlink === 1 &&
    (allowEmpty || info.size >= 1) &&
    info.size <= byteLimit
  );
}

/** @param {import('node:fs').Stats} opened @param {import('node:fs').Stats} original @returns {boolean} */
function matchesOpenedEvidence(opened, original) {
  return (
    opened.isFile() &&
    opened.nlink === 1 &&
    opened.dev === original.dev &&
    opened.ino === original.ino &&
    opened.size === original.size
  );
}

/** @param {string} reportDirectory @param {string} file @param {number} [byteLimit] @param {boolean} [allowEmpty] @returns {Promise<Buffer>} */
async function readBoundedEvidence(reportDirectory, file, byteLimit = junitByteLimit, allowEmpty = false) {
  if (path.basename(file) !== file) throw new Error('Evidence file name escapes its report directory.');
  const fullPath = path.join(reportDirectory, file);
  const info = await lstat(fullPath);
  if (!isBoundedRegularFile(info, byteLimit, allowEmpty))
    throw new Error('Evidence file is missing, linked or outside its size bound.');
  const handle = await open(fullPath, 'r');
  try {
    const opened = await handle.stat();
    if (!matchesOpenedEvidence(opened, info)) throw new Error('Evidence file changed while opening.');
    const buffer = Buffer.alloc(byteLimit + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const after = await handle.stat();
    if (!matchesOpenedEvidence(after, info) || bytesRead !== info.size || bytesRead > byteLimit)
      throw new Error('Evidence file changed or exceeded its size bound.');
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/** @param {string} reportDirectory @param {string} stdoutFile @param {string} stderrFile @param {{stdout_capture: import('./mutation-evidence.ts').CapturedOutput, stderr_capture: import('./mutation-evidence.ts').CapturedOutput}} receipt */
async function verifyCapturedOutput(reportDirectory, stdoutFile, stderrFile, receipt) {
  const [stdout, stderr] = await Promise.all([
    readBoundedEvidence(reportDirectory, stdoutFile, junitByteLimit, true),
    readBoundedEvidence(reportDirectory, stderrFile, junitByteLimit, true),
  ]);
  if (
    sha256(stdout) !== receipt.stdout_capture.sha256 ||
    stdout.length !== receipt.stdout_capture.bytes ||
    sha256(stderr) !== receipt.stderr_capture.sha256 ||
    stderr.length !== receipt.stderr_capture.bytes
  )
    throw new Error('Captured runner output differs from its retained stream hashes.');
}

/** @param {string} reportDirectory @param {string} partition @param {Record<string, unknown>} receipt */
async function writeStrykerProcessReceipt(reportDirectory, partition, receipt) {
  const handle = await open(path.join(reportDirectory, `stryker-${partition}.process.json`), 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(receipt));
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** @param {MutationExecutionResult['output_capture']} captures @param {string} reportDirectory @param {string} stdoutFile @param {string} stderrFile @returns {Promise<{outputComplete: boolean, stdoutCapture: CapturedOutput|null, stderrCapture: CapturedOutput|null}>} */
async function reconcileStrykerOutput(captures, reportDirectory, stdoutFile, stderrFile) {
  const stdoutCapture = captures?.complete === true ? captures.stdout : null;
  const stderrCapture = captures?.complete === true ? captures.stderr : null;
  let outputComplete =
    stdoutCapture !== null && stderrCapture !== null && !stdoutCapture.truncated && !stderrCapture.truncated;
  if (outputComplete && stdoutCapture && stderrCapture) {
    try {
      await verifyCapturedOutput(reportDirectory, path.basename(stdoutFile), path.basename(stderrFile), {
        stdout_capture: stdoutCapture,
        stderr_capture: stderrCapture,
      });
    } catch {
      outputComplete = false;
    }
  }
  return { outputComplete, stdoutCapture, stderrCapture };
}

/** @param {MutationExecutionResult} processResult @param {number} deadlineMs @param {string} partition @param {string} stdoutFile @param {string} stderrFile @param {Awaited<ReturnType<typeof reconcileStrykerOutput>>} output @returns {MutationRunnerResult} */
function strykerRunnerResult(processResult, deadlineMs, partition, stdoutFile, stderrFile, output) {
  const signalCode = processResult.signal === null ? null : String(processResult.signal);
  const observedExitCode = processResult.exitCode;
  return {
    exitCode:
      output.outputComplete && !processResult.timedOut && signalCode === null && processResult.spawnError === null
        ? observedExitCode
        : null,
    observed_exit_code: observedExitCode,
    signalCode,
    output_complete: output.outputComplete,
    timed_out: processResult.timedOut,
    deadline_ms: deadlineMs,
    spawn_error: processResult.spawnError,
    process_custody: processResult.processCustody,
    process_receipt: `stryker-${partition}.process.json`,
    stdout_capture: { file: path.basename(stdoutFile), ...(output.stdoutCapture ?? { complete: false }) },
    stderr_capture: { file: path.basename(stderrFile), ...(output.stderrCapture ?? { complete: false }) },
  };
}

/** @param {MutationRunnerResult} result @returns {boolean} */
function strykerRunUnknown(result) {
  return result.exitCode === null || result.signalCode !== null || !result.output_complete || result.timed_out;
}

/** @param {string[]} command @param {string} cwd @param {NodeJS.ProcessEnv} environment @param {string} reportDirectory @param {string} partition @param {string} stdoutFile @param {string} stderrFile @param {number} deadlineMs @param {string} inputFingerprint @returns {Promise<MutationRunnerResult>} */
async function runCapturedStryker(
  command,
  cwd,
  environment,
  reportDirectory,
  partition,
  stdoutFile,
  stderrFile,
  deadlineMs,
  inputFingerprint,
) {
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > maximumStrykerDeadlineMs)
    throw new Error('Trusted Stryker partition deadline is outside the supported finite bound.');
  const startedAt = Date.now();
  const deadlineAt = startedAt + deadlineMs;
  const processResult = await executeMutationCommand(command, cwd, deadlineMs, {
    env: environment,
    stdoutFile,
    stderrFile,
    outputByteLimit: junitByteLimit,
    terminationGraceMs: 5_000,
    forceWaitMs: 5_000,
    ownedProcessGroup: true,
  });
  const output = await reconcileStrykerOutput(processResult.output_capture, reportDirectory, stdoutFile, stderrFile);
  const result = strykerRunnerResult(processResult, deadlineMs, partition, stdoutFile, stderrFile, output);
  await writeStrykerProcessReceipt(reportDirectory, partition, {
    schema: 'StrykerProcessReceipt/v1',
    partition,
    command_sha256: sha256(JSON.stringify(command)),
    input_fingerprint: inputFingerprint,
    input_descriptor_file: `${partition}.inputs.json`,
    started_at: new Date(startedAt).toISOString(),
    deadline_unix_ms: deadlineAt,
    completed_at: new Date().toISOString(),
    ...result,
  });
  return result;
}

/** @param {string} reportDirectory @param {string} runId @param {string} partition @param {string | null} mutantId @param {string[]} tests @param {QualityInputs} inputs @param {string} fingerprint @returns {Promise<ReceiptOutcome>} */
async function confirmRunnerReceipt(reportDirectory, runId, partition, mutantId, tests, inputs, fingerprint) {
  try {
    const junitFile = junitName(partition, mutantId);
    const command = buildMutationTestCommand(process.execPath, tests, path.join(reportDirectory, junitFile));
    const sandboxRoot = path.join(reportDirectory, 'stryker-tmp');
    const expectedIdentity = await collectExecutionIdentity({
      executable: process.execPath,
      cwd: sandboxRoot,
      packageRoot: sandboxRoot,
      sandboxRoot,
      command,
      tests,
      sourceFingerprint: inputs.source_fingerprint,
      testFingerprint: inputs.test_fingerprint,
      toolFingerprint: inputs.tool_fingerprint,
      bunVersion: process.versions.bun ?? '',
      platform: process.platform,
      arch: process.arch,
    });
    const receiptBytes = await readBoundedEvidence(reportDirectory, receiptName(partition, mutantId));
    /** @type {unknown} */
    const receipt = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(receiptBytes));
    const stdoutFile = junitFile.replace(/\.xml$/u, '.stdout.log');
    const stderrFile = junitFile.replace(/\.xml$/u, '.stderr.log');
    const bodyEventsFile = junitFile.replace(/\.xml$/u, '.body.jsonl');
    if (
      !mutationReceiptMatches(receipt, {
        runId,
        partition,
        mutantId,
        tests,
        inputs,
        fingerprint,
        junitFile,
        command,
        sandboxRoot,
        stdoutFile,
        stderrFile,
        bodyEventsFile,
        executionIdentity: expectedIdentity,
      })
    )
      throw new Error('Runner receipt does not bind the active mutant to the current parent snapshot.');
    const junitBytes = await readBoundedEvidence(reportDirectory, receipt.junit_file);
    if (sha256(junitBytes) !== receipt.junit_sha256 || receipt.junit_bytes !== junitBytes.length)
      throw new Error('JUnit output does not match the runner receipt.');
    await verifyCapturedOutput(reportDirectory, stdoutFile, stderrFile, receipt);
    const bodyBytes = await readBoundedEvidence(reportDirectory, bodyEventsFile, junitByteLimit, true);
    if (sha256(bodyBytes) !== receipt.body_events_sha256 || bodyBytes.length !== receipt.body_events_bytes)
      throw new Error('Mutation body events differ from the runner receipt.');
    const bodyEvents = parseMutationBodyEvents(bodyBytes, tests);
    const hookGaps = testFilesWithLifecycleHooks(tests, inputs.input_bytes);
    const outcome = junitOutcome(
      new TextDecoder('utf-8', { fatal: true }).decode(junitBytes),
      tests,
      hookGaps,
      bodyEvents,
    );
    const result = confirmedRunnerOutcome(receipt.exit_code, outcome.outcome);
    if (result === 'passed' || result === 'killed') return { status: result };
    throw new Error('Runner exit status and JUnit outcome disagree or include infrastructure errors.');
  } catch (error) {
    return { status: 'unknown', reason: String(error) };
  }
}

const pin = readPin(root);
checkManifest(root, pin);
if (process.versions.bun !== pin) throw new Error('Mutation gate requires the pinned Bun executable.');
const commonTests = ['tests/coverage-completeness.test.mjs'];
/** @type {MutationPartition[]} */
const mainSlices = [
  {
    name: 'main-runtime-core',
    sources: ['src/runtime-kernel.ts', 'src/runtime-timing.ts'],
    tests: [
      ...commonTests,
      'tests/runtime-kernel-boundary.test.mjs',
      'tests/configured-workflow.test.mjs',
      'tests/smoke.test.mjs',
    ],
  },
  {
    name: 'main-config',
    sources: ['src/config/runtime-config.ts', 'src/config/project-context.ts'],
    tests: [
      ...commonTests,
      'tests/project-context-boundary.test.mjs',
      'tests/fuzz.test.ts',
      'tests/runtime-config-repair-boundary.test.mjs',
    ],
  },
  {
    name: 'main-host',
    sources: ['src/config/host-capability.ts'],
    tests: [...commonTests, 'tests/host-capability-boundary.test.mjs'],
  },
  {
    name: 'main-contracts',
    sources: ['src/contracts/public-ingress.ts', 'src/contracts/envelopes.ts'],
    tests: [...commonTests, 'tests/envelopes-boundary.test.mjs', 'tests/fuzz.test.ts', 'tests/zombies.test.mjs'],
  },
  {
    name: 'main-cedar',
    sources: ['src/authorization/cedar-boundary.ts'],
    tests: [...commonTests, 'tests/envelopes-boundary.test.mjs', 'tests/fuzz.test.ts'],
  },
  {
    name: 'main-governance',
    sources: ['src/governance/edictum-boundary.ts'],
    tests: [
      ...commonTests,
      'tests/governance-completeness.test.mjs',
      'tests/edictum-workflow-completeness.test.mjs',
      'tests/smoke.test.mjs',
    ],
  },
  {
    name: 'main-mastra',
    sources: ['src/orchestration/mastra-boundary.ts'],
    tests: [...commonTests, 'tests/runtime-config-yaml.test.mjs', 'tests/smoke.test.mjs', 'tests/zombies.test.mjs'],
  },
  {
    name: 'main-exports',
    environment: 'static',
    sources: ['src/index.ts', 'src/config/index.ts'],
  },
];
/** @type {MutationPartition[]} */
const partitions = [
  ...mainSlices
    .filter((slice) => slice.environment !== 'static')
    .map((slice) => ({
      ...slice,
      environment: 'main',
      report: slice.name + '.json',
    })),
  ...mainSlices.filter((slice) => slice.environment === 'static'),
  {
    name: 'bun-fs-safe-attestation',
    environment: 'bun',
    sources: ['src/config/fs-safe-attestation.ts'],
    tests: ['tests/fs-safe-attestation.test.ts'],
    report: 'mutation-bun-fs-safe-attestation.json',
  },
  {
    name: 'bun-service-operation-custody',
    environment: 'bun',
    sources: ['src/config/service-operation-custody.ts', 'src/config/service-operation-launch-capability.ts'],
    tests: [
      'tests/bun/service-operation-launch-capability.test.ts',
      'tests/bun/service-operation-launch-predicates.test.ts',
      'tests/bun/service-operation-handoff.test.ts',
    ],
    report: 'mutation-bun-service-operation-custody.json',
  },
  {
    name: 'bun-host-state',
    environment: 'bun',
    sources: ['src/host-state.ts', 'src/trusted-host.ts'],
    tests: ['tests/bun/host-state.test.mjs'],
    report: 'mutation-bun-host-state.json',
  },
  {
    name: 'bun-session-handoff',
    environment: 'bun',
    sources: [
      'src/orchestration/persistent-session-handoff.ts',
      'src/orchestration/session-handoff.ts',
      'src/orchestration/workflow-plan.ts',
    ],
    tests: ['tests/session-handoff.test.mjs', 'tests/bun/persistent-session-handoff.test.mjs'],
    report: 'mutation-bun-session-handoff.json',
  },
  {
    name: 'bun-runtime-facade',
    environment: 'bun',
    sources: ['src/lifecycle/runtime-facade.ts'],
    tests: ['tests/smoke.test.mjs'],
    report: 'mutation-bun-runtime-facade.json',
  },
  {
    name: 'bun-lifecycle-state',
    environment: 'bun',
    sources: ['src/lifecycle/lifecycle-state.ts'],
    tests: ['tests/bun/lifecycle-state.test.mjs'],
    report: 'mutation-bun-lifecycle-state.json',
  },
  {
    name: 'bun-final-assurance',
    environment: 'bun',
    sources: ['src/orchestration/final-assurance.ts'],
    tests: ['tests/final-assurance.test.mjs', 'tests/final-assurance-public.test.mjs'],
    report: 'mutation-bun-final-assurance.json',
  },
  {
    name: 'bun-runtime-initialization',
    environment: 'bun',
    sources: ['src/runtime-initialization.ts', 'src/workspace-identity.ts'],
    tests: ['tests/bun/runtime-initialization.test.mjs'],
    report: 'mutation-bun-runtime-initialization.json',
  },
  {
    name: 'bun-development-controller',
    environment: 'bun',
    sources: ['bin/development-controller.mjs'],
    tests: ['tests/development-controller.test.mjs'],
    report: 'mutation-bun-development-controller.json',
  },
  {
    name: 'bun-cli-public-entrypoints',
    environment: 'bun',
    sources: ['bin/repair-work-state.mjs', 'bin/scope.ts', 'bin/vida-agent.mjs'],
    tests: [
      'tests/scope-help-parity.test.ts',
      'tests/scoped-source-snapshot.test.mjs',
      'tests/run-entrypoint.test.mjs',
      'tests/automatic-work-absorption.test.mjs',
      'tests/admitted-runtime-canonical-intake.test.ts',
    ],
    report: 'mutation-bun-cli-public-entrypoints.json',
  },
  {
    name: 'bun-cli-toolchain',
    environment: 'bun',
    sources: ['bin/bun.mjs'],
    tests: ['tests/bun-toolchain.test.mjs', 'tests/bun-cache-routing.test.mjs'],
    report: 'mutation-bun-cli-toolchain.json',
  },
  {
    name: 'bun-cli-init',
    environment: 'bun',
    sources: ['bin/init-core.mjs', 'bin/init.mjs'],
    tests: ['tests/initialization.test.mjs', 'tests/init-entrypoint-v8.test.ts'],
    report: 'mutation-bun-cli-init.json',
  },
  {
    name: 'bun-cli-run',
    environment: 'bun',
    sources: ['bin/run.mjs'],
    tests: ['tests/run-entrypoint.test.mjs', 'tests/bun-cache-routing.test.mjs'],
    report: 'mutation-bun-cli-run.json',
  },
  {
    name: 'bun-doc-clear',
    environment: 'bun',
    sources: ['src/documentation/clear.ts', 'src/documentation/policy.ts', 'bin/documentation-clear.mjs'],
    tests: ['tests/documentation-clear.test.mjs'],
    report: 'mutation-bun-doc-clear.json',
  },
  {
    name: 'bun-observed-validation',
    environment: 'bun',
    sources: [
      'src/orchestration/admitted-development-packet.ts',
      'src/orchestration/admitted-implementation-result.ts',
      'src/orchestration/observed-validation.ts',
      'src/orchestration/observed-receipt-evidence.ts',
      'src/orchestration/scoped-source-snapshot.ts',
    ],
    tests: [
      'tests/admitted-development-packet.test.mjs',
      'tests/observed-validation.test.mjs',
      'tests/scoped-source-snapshot.test.mjs',
      'tests/stable-source-read.test.ts',
    ],
    report: 'mutation-bun-observed-validation.json',
  },
  {
    name: 'bun-observed-research',
    environment: 'bun',
    sources: [
      'src/orchestration/observed-research-activation.ts',
      'src/orchestration/observed-research-artifact.ts',
      'src/orchestration/observed-research-binding.ts',
      'src/orchestration/observed-research-result.ts',
      'src/orchestration/observed-synthesis-result.ts',
      'src/research-decision.ts',
      'src/research-source-catalog.ts',
    ],
    tests: [
      'tests/observed-research-result.test.mjs',
      'tests/research-source-catalog.test.mjs',
      'tests/paused-replacement-entrypoint.test.mjs',
      'tests/repair-cli-behavior.test.mjs',
    ],
    report: 'mutation-bun-observed-research.json',
  },
  {
    name: 'main-local-entrypoint',
    environment: 'main',
    sources: [
      'src/orchestration/admitted-session-execution.ts',
      'src/orchestration/configured-context.ts',
      'src/orchestration/inspect-local-session.ts',
      'src/orchestration/local-session-reconciliation.ts',
      'src/orchestration/local-source-authorization.ts',
      'src/orchestration/local-work-admission.ts',
      'src/orchestration/mastra-session-bridge.ts',
      'src/orchestration/observed-delivery.ts',
      'src/orchestration/observed-testing.ts',
      'src/orchestration/resume-paused-local-work.ts',
      'src/orchestration/staged-runtime-witness.ts',
      'src/orchestration/suspend-local-work.ts',
    ],
    tests: [
      'tests/session-bridge-contract.test.ts',
      'tests/configured-context.test.mjs',
      'tests/run-entrypoint.test.mjs',
      'tests/paused-replacement-entrypoint.test.mjs',
      'tests/staged-runtime-witness.test.mjs',
    ],
    report: 'mutation-main-local-entrypoint.json',
  },
  {
    name: 'bun-dispatch-repair',
    environment: 'bun',
    sources: [
      'bin/reconcile-artifacts.mjs',
      'bin/reconcile-readonly-dispatch.mjs',
      'bin/read-only-dispatch-repair.mjs',
    ],
    tests: [
      'tests/reconcile-readonly-dispatch.test.mjs',
      'tests/read-only-dispatch-repair.test.mjs',
      'tests/paused-replacement-entrypoint.test.mjs',
      'tests/repair-cli-behavior.test.mjs',
    ],
    report: 'mutation-bun-dispatch-repair.json',
  },
  {
    name: 'bun-runtime-code-rebind',
    environment: 'bun',
    sources: ['bin/runtime-code-rebind.mjs', 'bin/forward-review-proof.mjs'],
    tests: ['tests/paused-replacement-entrypoint.test.mjs'],
    report: 'mutation-bun-runtime-code-rebind.json',
  },
  {
    name: 'bun-specialized-repair',
    environment: 'bun',
    sources: [
      'bin/reconcile-synthesis-qualification.mjs',
      'bin/synthesis-observation-correction.mjs',
      'bin/repair-research-records.mjs',
    ],
    tests: ['tests/repair-cli-behavior.test.mjs'],
    report: 'mutation-bun-specialized-repair.json',
  },
  {
    name: 'bun-runtime-config-rebind',
    environment: 'bun',
    sources: ['bin/runtime-config-rebind.mjs'],
    tests: ['tests/runtime-config-rebind.test.mjs'],
    report: 'mutation-bun-runtime-config-rebind.json',
  },
  {
    name: 'bun-documentation-policy-transition',
    environment: 'bun',
    sources: [
      'bin/documentation-policy-transition.mjs',
      'src/documentation/policy-transition.ts',
      'src/documentation/transition-proof.ts',
    ],
    tests: ['tests/documentation-policy-transition.test.mjs'],
    report: 'mutation-bun-documentation-policy-transition.json',
  },
  {
    name: 'bun-forward-candidate-admission',
    environment: 'bun',
    sources: [
      'bin/forward-candidate-admission.mjs',
      'bin/fs-safe-native-import-boundary.ts',
      'bin/runtime-import-bindings.ts',
      'bin/module-directory-anchors.ts',
    ],
    tests: ['tests/forward-candidate-admission.test.ts', 'tests/forward-candidate-authority.test.mjs'],
    report: 'mutation-bun-forward-candidate-admission.json',
  },
  {
    name: 'bun-completed-readonly-capture',
    environment: 'bun',
    sources: ['bin/capture-completed-readonly.mjs'],
    // Portable selector proves unadmitted-source denial only. Full capture/CAS
    // behavior is a repository integration lane; mutation completeness is open.
    tests: ['tests/completed-readonly-capture.test.mjs'],
    report: 'mutation-bun-completed-readonly-capture.json',
  },
  {
    name: 'bun-cli-routing-contracts',
    environment: 'bun',
    sources: [
      'bin/cli-command-contracts.ts',
      'bin/cli-metadata.ts',
      'bin/cli-error-properties.ts',
      'bin/project-mapping-contract.ts',
      'bin/project-upgrade-repair.ts',
      'bin/reconcile-cli-contracts.ts',
      'bin/run-cli-options.ts',
      'bin/workspace-database-cli.ts',
    ],
    tests: [
      ...commonTests,
      'tests/cli-error-properties.test.ts',
      'tests/scope-help-parity.test.ts',
      'tests/project-upgrade-cli-options.test.ts',
      'tests/run-cli-main.test.mjs',
      'tests/run-entrypoint.test.mjs',
      'tests/project-context-boundary.test.mjs',
      'tests/initialization.test.mjs',
    ],
    report: 'mutation-bun-cli-routing-contracts.json',
  },
  {
    name: 'bun-project-configuration-lifecycle',
    environment: 'bun',
    sources: [
      'src/config/host-persisted-row.ts',
      'src/config/initialization-record.ts',
      'src/config/project-activation.ts',
      'src/config/project-configuration.ts',
      'src/config/project-configuration-rebind.ts',
      'src/config/project-initialization-binding.ts',
      'src/config/project-initialization-record.ts',
      'src/config/project-layout.ts',
      'src/config/project-paths.ts',
      'src/config/storage-read-admission.ts',
      'src/config/workspace-database-raw.ts',
      'src/config/workspace-database.ts',
    ],
    tests: [
      ...commonTests,
      'tests/initialization.test.mjs',
      'tests/project-context-boundary.test.mjs',
      'tests/bun/runtime-initialization.test.mjs',
      'tests/bun/host-state.test.mjs',
      'tests/audit-partial-init.test.mjs',
      'tests/project-configuration-rebind-binding.test.ts',
    ],
    report: 'mutation-bun-project-configuration-lifecycle.json',
  },
  {
    name: 'bun-governance-and-public-contracts',
    environment: 'bun',
    sources: [
      'src/contracts/canonical-json-core.ts',
      'src/contracts/implementation-scope.ts',
      'src/governance/operation-policy.ts',
      'src/governance/policy-workflow.ts',
      'src/governance/workflow-approval-consumption-contract.ts',
    ],
    tests: [
      ...commonTests,
      'tests/envelopes-boundary.test.mjs',
      'tests/fuzz.test.ts',
      'tests/governance-completeness.test.mjs',
      'tests/edictum-workflow-completeness.test.mjs',
      'tests/documentation-policy-transition.test.mjs',
      'tests/implementation-scope.test.ts',
    ],
    report: 'mutation-bun-governance-and-public-contracts.json',
  },
  {
    name: 'bun-project-upgrade-fresh-artifacts-storage',
    environment: 'bun',
    sources: ['src/config/project-upgrade-artifacts.ts', 'src/config/project-upgrade-storage.ts'],
    tests: [...commonTests, 'tests/project-upgrade-lifecycle.test.ts'],
    report: 'mutation-bun-project-upgrade-fresh-artifacts-storage.json',
  },
  {
    name: 'bun-project-upgrade-storage-admission',
    environment: 'bun',
    sources: ['src/config/project-upgrade-existing-storage-admission.ts'],
    tests: [...commonTests, 'tests/bun/project-upgrade-existing-storage-admission.test.ts'],
    report: 'mutation-bun-project-upgrade-storage-admission.json',
  },
  {
    name: 'pending-project-upgrade-coordinator-and-existing-merge',
    environment: 'pending',
    sources: ['src/config/project-upgrade-existing-storage.ts', 'src/config/project-upgrade.ts'],
    intendedTests: [
      'tests/project-upgrade-lifecycle.test.ts',
      'tests/bun/project-upgrade-existing-storage-admission.test.ts',
    ],
  },
  {
    name: 'bun-orchestration-recovery-contracts',
    environment: 'bun',
    sources: [
      'bin/continue-initial-source.mjs',
      'bin/historical-normalization-resume.mjs',
      'bin/historical-terminal-synthesis-capture.mjs',
      'bin/qualified-runtime-code-continuation.mjs',
      'bin/recover-completed-source-report.mjs',
      'bin/recover-failed-prewriter-owner.mjs',
      'bin/transition-failed-prewriter.mjs',
      'src/orchestration/bun-sqlite-client.ts',
      'src/orchestration/completed-source-report-recovery.ts',
      'src/orchestration/corrective-execution-contract.ts',
      'src/orchestration/delivered-work-continuation-repair.ts',
      'src/orchestration/delivered-work-continuation.ts',
      'src/orchestration/failed-prewriter-recovery.ts',
      'src/orchestration/failed-prewriter-transition.ts',
      'src/orchestration/initial-source-continuation.ts',
      'src/orchestration/initial-source-frontier-code-rebind.ts',
      'src/orchestration/mastra-session-bridge-contract.ts',
      'src/orchestration/mastra-session-ledger-codec.ts',
      'src/orchestration/qualified-runtime-code-continuation.ts',
      'src/orchestration/runtime-code-rebind-contract.ts',
      'src/orchestration/session-engine-snapshot.ts',
      'src/orchestration/workflow-session-reservation-contract.ts',
    ],
    tests: [
      'tests/session-bridge-contract.test.ts',
      ...commonTests,
      'tests/initial-source-continuation.test.mjs',
      'tests/delivered-work-continuation.test.mjs',
      'tests/historical-terminal-synthesis-capture.test.mjs',
      'tests/historical-normalization-resume.test.mjs',
      'tests/session-engine-frontier.test.ts',
      'tests/mastra-continuation-bridge.test.mjs',
      'tests/mastra-ledger-codec.property.test.ts',
    ],
    report: 'mutation-bun-orchestration-recovery-contracts.json',
  },
  {
    name: 'bun-cli-release-and-installation',
    environment: 'bun',
    sources: [
      'bin/install.mjs',
      'bin/local-release-artifacts.mjs',
      'bin/release-preparation.mjs',
      'bin/repair-delivered-work-continuation.mjs',
      'bin/repair-native-delivery-evidence.mjs',
      'bin/repair-release-retarget.mjs',
      'bin/standalone-resources.mjs',
      'bin/standalone.mjs',
    ],
    tests: [
      ...commonTests,
      'tests/development-controller.test.mjs',
      'tests/native-delivery-evidence-repair.test.mjs',
      'tests/release-retarget-state.test.mjs',
      'tests/version-policy.test.mjs',
      'tests/standalone.test.mjs',
      'tests/delivered-work-continuation.test.mjs',
    ],
    report: 'mutation-bun-cli-release-and-installation.json',
  },
  {
    name: 'bun-controller-observation',
    environment: 'bun',
    sources: ['bin/development-controller-observation.mjs'],
    tests: [
      ...commonTests,
      'tests/development-controller-observation.test.mjs',
      'tests/development-controller.test.mjs',
    ],
    report: 'mutation-bun-controller-observation.json',
  },
  {
    name: 'bun-source-preflight-and-task-binding',
    environment: 'bun',
    sources: [
      'src/orchestration/source-preflight-operations.ts',
      'src/orchestration/source-preflight.ts',
      'src/orchestration/task-source-binding-operations.ts',
      'src/orchestration/task-source-binding.ts',
    ],
    tests: [
      ...commonTests,
      'tests/source-preflight-producer.test.mjs',
      'tests/source-preflight.test.mjs',
      'tests/task-source-binding-operations.test.mjs',
      'tests/bun/task-source-binding.test.mjs',
    ],
    report: 'mutation-bun-source-preflight-and-task-binding.json',
  },
  {
    name: 'linux',
    environment: 'linux',
    requiredReportedSource: 'src/config/safe-repository-access.ts',
    tests: [
      'tests/safe-repository-linux-simulation.test.mjs',
      'tests/ancestor-read-efficiency.test.ts',
      'tests/lock-payload-custody.test.ts',
      'tests/safe-read-buffer-boundaries.test.ts',
    ],
    report: 'mutation-linux.json',
  },
  {
    name: 'windows',
    environment: 'windows',
    requiredReportedSource: 'src/config/safe-repository-access.ts',
    tests: ['tests/safe-repository-completeness.test.mjs'],
    report: 'mutation-windows.json',
  },
];
const sourceInventory = maintainedSourceInventory(root);
const expectedSources = sourceInventory.mutationSources;
const missingPackageSources = sourceInventory.missingPackageSources;
const partitionSourceSet = new Set(partitions.flatMap((partition) => partitionSources(partition)));
const unassignedSources = expectedSources.filter((source) => !partitionSourceSet.has(source));
const unknownPartitionSources = [...partitionSourceSet].filter((source) => !expectedSources.includes(source));
const zeroMutantSources = new Set(['src/index.ts', 'src/config/index.ts']);
/** @type {Map<string, string[]>} */
const sourceAssignments = new Map();
for (const partition of partitions)
  for (const source of partitionSources(partition))
    sourceAssignments.set(source, [...(sourceAssignments.get(source) ?? []), partition.name]);
const invalidOverlaps = [...sourceAssignments].filter(
  ([source, owners]) =>
    owners.length > 1 &&
    !(
      source === 'src/config/safe-repository-access.ts' &&
      owners.length === 2 &&
      owners.includes('linux') &&
      owners.includes('windows')
    ),
);
const invalidZeroMutantSources = [];
for (const source of zeroMutantSources) {
  const ast = parse(await readFile(path.join(root, source), 'utf8'), {
    sourceType: 'module',
    plugins: ['typescript'],
  });
  if (!ast.program.body.every((node) => node.type === 'ExportNamedDeclaration' && node.source && !node.declaration))
    invalidZeroMutantSources.push(source);
}
/** @param {MutationPartition} partition */
function inventoryPartition(partition) {
  return {
    name: partition.name,
    environment: partition.environment,
    sources: partitionSources(partition),
    tests: partition.tests ?? [],
    intended_tests: partition.intendedTests ?? [],
    status: partition.environment === 'pending' ? 'pending' : 'assigned',
  };
}
if (process.argv.includes('--inventory')) {
  console.log(
    JSON.stringify({
      schema: 'CandidateMutationInventory/v1',
      expected_sources: expectedSources,
      unassigned_sources: unassignedSources,
      unknown_partition_sources: unknownPartitionSources,
      invalid_overlaps: invalidOverlaps,
      missing_package_sources: missingPackageSources,
      invalid_zero_mutant_sources: invalidZeroMutantSources,
      zero_mutant_sources: [...zeroMutantSources],
      repository_only_sources: sourceInventory.repositoryOnlySources,
      partitions: partitions.map(inventoryPartition),
      pending_partition_sources: partitions
        .filter((partition) => partition.environment === 'pending')
        .flatMap(partitionSources),
    }),
  );
  process.exit(
    unassignedSources.length ||
      unknownPartitionSources.length ||
      invalidOverlaps.length ||
      missingPackageSources.length ||
      invalidZeroMutantSources.length
      ? 1
      : 0,
  );
}
if (
  unassignedSources.length ||
  unknownPartitionSources.length ||
  invalidOverlaps.length ||
  missingPackageSources.length ||
  invalidZeroMutantSources.length
)
  throw new Error(
    `Mutation partition inventory is invalid: ${JSON.stringify({ unassignedSources, unknownPartitionSources, invalidOverlaps, missingPackageSources, invalidZeroMutantSources })}`,
  );
const pendingPartitions = partitions.filter((partition) => partition.environment === 'pending');
if (pendingPartitions.length)
  throw new Error(
    `Mutation qualification is pending focused behavior tests: ${JSON.stringify(pendingPartitions.map(({ name, sources, intendedTests }) => ({ name, sources, intendedTests })))}`,
  );
const runId = randomUUID();
const evidenceRoot = path.join(root, '.tmp');
try {
  await mkdir(evidenceRoot, { mode: 0o700 });
} catch (error) {
  if (!record(error) || error.code !== 'EEXIST') throw error;
}
const evidenceRootInfo = await lstat(evidenceRoot);
if (!evidenceRootInfo.isDirectory() || evidenceRootInfo.isSymbolicLink())
  throw new Error('Mutation evidence directory must be a regular directory.');
const reportDirectory = await mkdtemp(path.join(evidenceRoot, `mutation-evidence-${runId}-`));
const mutationTools = mutationToolInputs;
const inputs = await qualityInputs(root, mutationTools);
const fingerprint = qualityFingerprint(inputs);
/** @param {string} boundary */
async function assertCurrentInputs(boundary) {
  if (qualityFingerprint(await qualityInputs(root, mutationTools)) !== fingerprint)
    throw new Error(`Mutation inputs changed at ${boundary}; qualification is UNKNOWN.`);
}

{
  /** @type {Array<MutationPartition & {result: MutationRunnerResult, report: string}>} */
  const runs = [];
  const provenanceErrors = [];
  for (const partition of partitions) {
    if (partition.environment === 'static') continue;
    const reportName = partition.report;
    const testFiles = partition.tests;
    if (!reportName || !testFiles) throw new Error(`Mutation partition is incomplete: ${partition.name}`);
    try {
      await assertCurrentInputs(`${partition.name}:before`);
      const descriptor = {
        schema: 'MutationInputDescriptor/v1',
        partition: partition.name,
        tests: testFiles,
        test_inputs: inputs.test_inputs,
        tool_inputs: inputs.tool_inputs,
        input_fingerprint: fingerprint,
        test_fingerprint: inputs.test_fingerprint,
        tool_fingerprint: inputs.tool_fingerprint,
      };
      const descriptorHandle = await open(path.join(reportDirectory, `${partition.name}.inputs.json`), 'wx', 0o600);
      try {
        await descriptorHandle.writeFile(JSON.stringify(descriptor));
        await descriptorHandle.sync();
      } finally {
        await descriptorHandle.close();
      }
    } catch (error) {
      provenanceErrors.push({ partition: partition.name, error: String(error) });
      break;
    }
    /** @type {NodeJS.ProcessEnv} */
    const environment = {
      ...process.env,
      AGENT_RUNTIME_TEST_REPOSITORY_ROOT: path.resolve(root, '..'),
      AGENT_RUNTIME_MUTATION_DIRECTORY: reportDirectory,
      AGENT_RUNTIME_MUTATION_SANDBOX_ROOT: path.join(reportDirectory, 'stryker-tmp'),
      AGENT_RUNTIME_MUTATION_REPORT: reportName,
      AGENT_RUNTIME_MUTATION_PARTITION: partition.name,
      AGENT_RUNTIME_MUTATION_RUN_ID: runId,
      AGENT_RUNTIME_INPUT_FINGERPRINT: fingerprint,
      AGENT_RUNTIME_SOURCE_FINGERPRINT: inputs.source_fingerprint,
      AGENT_RUNTIME_TEST_FINGERPRINT: inputs.test_fingerprint,
      AGENT_RUNTIME_TOOL_FINGERPRINT: inputs.tool_fingerprint,
      AGENT_RUNTIME_MUTATION_TESTS: testFiles.join(','),
    };
    delete environment.__STRYKER_ACTIVE_MUTANT__;
    if (partition.environment === 'main' || partition.environment === 'bun') {
      if (partition.environment === 'main') delete environment.AGENT_RUNTIME_MUTATION_PART;
      else environment.AGENT_RUNTIME_MUTATION_PART = partition.environment;
      environment.AGENT_RUNTIME_MUTATION_SOURCE = partitionSources(partition).join(',');
      environment.AGENT_RUNTIME_MUTATION_TESTS = testFiles.join(',');
      environment.AGENT_RUNTIME_SKIP_PACKAGE_TEST = '1';
    } else {
      environment.AGENT_RUNTIME_MUTATION_PART = partition.environment;
      delete environment.AGENT_RUNTIME_MUTATION_SOURCE;
    }
    const result = await runCapturedStryker(
      [process.execPath, 'x', 'stryker', 'run', 'stryker.config.mjs'],
      root,
      pinnedEnvironment(process.execPath, environment),
      reportDirectory,
      partition.name,
      path.join(reportDirectory, `stryker-${partition.name}.stdout.log`),
      path.join(reportDirectory, `stryker-${partition.name}.stderr.log`),
      strykerPartitionDeadlineMs,
      fingerprint,
    );
    runs.push({ ...partition, report: reportName, result });
    try {
      await assertCurrentInputs(`${partition.name}:after`);
    } catch (error) {
      provenanceErrors.push({ partition: partition.name, error: String(error) });
      break;
    }
  }

  /** @type {Array<MutationPartition & {result: MutationRunnerResult, report: string, reportData: MutationReport}>} */
  const reports = [];
  const reportErrors = [];
  for (const run of runs) {
    try {
      const reportBytes = await readBoundedEvidence(reportDirectory, run.report, reportByteLimit);
      /** @type {unknown} */
      const reportData = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(reportBytes));
      if (!mutationReport(reportData)) throw new Error('Stryker report shape is invalid.');
      reports.push({ ...run, reportData });
    } catch (error) {
      reportErrors.push({ partition: run.name, error: String(error) });
    }
  }

  /** @type {Map<string, ReceiptOutcome>} */
  const baselineChecks = new Map();
  const baselineErrors = [];
  for (const { name, tests, result } of reports) {
    /** @type {ReceiptOutcome} */
    const outcome =
      result.exitCode === 0 && !result.timed_out && !result.signalCode && result.output_complete
        ? await confirmRunnerReceipt(reportDirectory, runId, name, null, tests ?? [], inputs, fingerprint)
        : { status: 'unknown', reason: 'Stryker partition did not exit cleanly inside its trusted deadline.' };
    baselineChecks.set(name, outcome);
    if (outcome.status !== 'passed') baselineErrors.push({ partition: name, ...outcome });
  }

  /** @param {string} file */
  const normalizeFile = (file) => file.replaceAll('\\', '/');
  /** @param {string} file */
  const normalizedSourcePath = (file) =>
    path.relative(root, path.isAbsolute(file) ? file : path.resolve(root, file)).replaceAll('\\', '/');
  // Every partition must kill its own mutants. Merging the same mutation from
  // Linux and Windows could otherwise hide a survivor in one platform lane.
  /** @type {Array<MutationRecord & {partition: string, file: string, stryker_status: string, confirmed_status: string, confirmation_reason: string}>} */
  const mutants = [];
  /** @type {Record<string, Record<string, number>>} */
  const partitionStatuses = {};
  const emptyPartitions = [];
  const missingPartitionSources = [];
  const extraPartitionSources = [];
  const sourceMismatches = [];
  const unknownMutants = [];
  for (const { name, reportData, result, requireMutants = true, requiredReportedSource, sources, tests } of reports) {
    /** @type {Record<string, number>} */
    const statuses = {};
    const expectedPartitionSources = sources ?? (requiredReportedSource ? [requiredReportedSource] : []);
    /** @type {Map<string, MutationFileReport>} */
    const reportedPartitionSources = new Map(
      Object.entries(reportData.files ?? {}).map(([file, value]) => [normalizedSourcePath(file), value]),
    );
    for (const source of expectedPartitionSources)
      if (!zeroMutantSources.has(source) && !reportedPartitionSources.get(source)?.mutants?.length)
        missingPartitionSources.push({ partition: name, source });
    for (const source of reportedPartitionSources.keys())
      if (!expectedPartitionSources.includes(source)) extraPartitionSources.push({ partition: name, source });
    for (const [source, value] of reportedPartitionSources) {
      const expected = inputs.sources.find((entry) => entry.path === source);
      if (!expected || typeof value.source !== 'string' || sha256(value.source) !== expected.sha256)
        sourceMismatches.push({ partition: name, source });
    }
    for (const [fileName, value] of Object.entries(reportData.files ?? {})) {
      const file = normalizeFile(fileName);
      for (const mutant of value.mutants ?? []) {
        statuses[mutant.status] = (statuses[mutant.status] ?? 0) + 1;
        let confirmation = 'unknown';
        let confirmationReason = 'Stryker status has no matching confirmed runner receipt.';
        if (mutant.status === 'NoCoverage') {
          confirmation = 'NoCoverage';
          confirmationReason = 'Stryker did not execute tests for this mutant.';
        } else if (typeof mutant.id === 'string' && ['Killed', 'Survived'].includes(mutant.status)) {
          const baseline = baselineChecks.get(name);
          const observed =
            result.exitCode === 0 &&
            !result.timed_out &&
            !result.signalCode &&
            result.output_complete &&
            baseline?.status === 'passed'
              ? await confirmRunnerReceipt(reportDirectory, runId, name, mutant.id, tests ?? [], inputs, fingerprint)
              : (baseline ?? { status: 'unknown', reason: 'Partition baseline is missing.' });
          if (baseline?.status !== 'passed') {
            confirmationReason = 'Partition baseline did not pass; mutant failure is not attributable.';
          } else if (mutant.status === 'Survived' && observed.status === 'passed') {
            confirmation = 'Survived';
            confirmationReason = 'Zero runner exit matched a nonempty passing JUnit report.';
          } else if (mutant.status === 'Killed' && observed.status === 'killed') {
            confirmation = 'Killed';
            confirmationReason =
              'Pinned Bun exit 1 matched a JUnit failure bound to the exact assertion thrown in the generated test body.';
          } else {
            confirmationReason =
              observed.status === 'unknown'
                ? observed.reason
                : `Stryker ${mutant.status} disagrees with the runner's ${observed.status} evidence.`;
          }
        }
        if (confirmation === 'unknown')
          unknownMutants.push({ partition: name, mutant_id: mutant.id ?? null, reason: confirmationReason });
        mutants.push({
          partition: name,
          file,
          ...mutant,
          stryker_status: mutant.status,
          confirmed_status: confirmation,
          confirmation_reason: confirmationReason,
        });
      }
    }
    if (requireMutants && Object.values(statuses).reduce((count, value) => count + value, 0) === 0)
      emptyPartitions.push(name);
    partitionStatuses[name] = statuses;
  }
  const statuses = mutants.reduce((values, mutant) => {
    values[mutant.status] = (values[mutant.status] ?? 0) + 1;
    return values;
  }, /** @type {Record<string, number>} */ ({}));
  const nonKilled = mutants.filter((mutant) => mutant.confirmed_status !== 'Killed');
  const reportedSources = [...new Set(reports.flatMap(({ reportData }) => Object.keys(reportData.files ?? {})))]
    .map(normalizedSourcePath)
    .sort((left, right) => left.localeCompare(right));
  const missingSources = expectedSources.filter(
    (file) => !zeroMutantSources.has(file) && !reportedSources.includes(file),
  );
  const extraSources = reportedSources.filter((file) => !expectedSources.includes(file));
  const runnerExitCodes = runs.map(({ name, result }) => ({
    partition: name,
    exit_code: result.observed_exit_code,
    deadline_ms: result.deadline_ms,
    timed_out: result.timed_out,
  }));
  const runnerUnknown = runs.some(({ result }) => strykerRunUnknown(result));
  const killed = mutants.filter((mutant) => mutant.confirmed_status === 'Killed').length;
  const effectiveScore = mutants.length === 0 ? 0 : killed / mutants.length;
  const pass =
    provenanceErrors.length === 0 &&
    sourceMismatches.length === 0 &&
    baselineErrors.length === 0 &&
    unknownMutants.length === 0 &&
    runs.length === partitions.filter((partition) => partition.environment !== 'static').length &&
    runs.every(({ result }) => result.exitCode === 0) &&
    reportErrors.length === 0 &&
    emptyPartitions.length === 0 &&
    missingPartitionSources.length === 0 &&
    extraPartitionSources.length === 0 &&
    mutants.length > 0 &&
    effectiveScore === 1 &&
    nonKilled.length === 0 &&
    missingSources.length === 0 &&
    extraSources.length === 0;
  const summary = {
    schema: 'CandidateMutationReport/v3',
    input_fingerprint: fingerprint,
    run_id: runId,
    evidence_directory: reportDirectory,
    source_fingerprint: inputs.source_fingerprint,
    test_fingerprint: inputs.test_fingerprint,
    tool_fingerprint: inputs.tool_fingerprint,
    source_inputs: inputs.sources,
    test_inputs: inputs.test_inputs,
    tool_inputs: inputs.tool_inputs,
    provenance_errors: provenanceErrors,
    source_mismatches: sourceMismatches,
    baseline_errors: baselineErrors,
    unknown_mutants: unknownMutants,
    required_effective_score: 1,
    effective_score: effectiveScore,
    required_survived: 0,
    required_non_killed: 0,
    status:
      provenanceErrors.length ||
      sourceMismatches.length ||
      baselineErrors.length ||
      reportErrors.length ||
      unknownMutants.length ||
      runnerUnknown
        ? 'unknown'
        : pass
          ? 'pass'
          : 'fail',
    runner_exit_codes: runnerExitCodes,
    runner_outputs: runs.map(({ name, result }) => ({
      partition: name,
      stdout: result.stdout_capture,
      stderr: result.stderr_capture,
    })),
    runner_processes: runs.map(({ name, result }) => ({
      partition: name,
      deadline_ms: result.deadline_ms,
      timed_out: result.timed_out,
      spawn_error: result.spawn_error,
      observed_exit_code: result.observed_exit_code,
      signal: result.signalCode,
      process_custody: result.process_custody,
      process_receipt: result.process_receipt,
      output_complete: result.output_complete,
    })),
    report_errors: reportErrors,
    empty_partitions: emptyPartitions,
    missing_partition_sources: missingPartitionSources,
    extra_partition_sources: extraPartitionSources,
    maintained_sources: expectedSources,
    missing_package_sources: missingPackageSources,
    reported_sources: reportedSources,
    missing_sources: missingSources,
    extra_sources: extraSources,
    mutants: mutants.length,
    killed,
    statuses,
    partition_statuses: partitionStatuses,
    non_killed: nonKilled,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  if (!pass) process.exitCode = 1;
}
