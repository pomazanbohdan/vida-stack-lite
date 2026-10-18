import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readNativeMutationPartitionProof } from '../tooling/native-mutation-proof-reader.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { expectAsyncReturned, expectRejection } from './helpers/expect-rejection.ts';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import { qualityFingerprint, sha256, testSelectionFingerprint } from '../tooling/bun-coverage-evidence.ts';
import {
  buildMutationTestCommand,
  executionIdentityDigest,
  executionIdentityForInvocation,
  junitOutcome,
  parseMutationBodyEvents,
  recordedMutationCommand,
} from '../tooling/mutation-evidence.ts';
import { mutationPartitionSourceBinding, mutationTestContextBinding } from '../tooling/mutation-command-runner.ts';
import {
  mutationGeneratedUniverse,
  planMutationBatches,
  validateNativeMutationPartitionProof,
  type NativeMutationBatchResult,
  type NativeMutationProofEvidence,
  type NativeMutationReceiptReference,
} from '../tooling/mutation-map.ts';

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function report(proofBytes: Buffer, proofDigest = digest(proofBytes)) {
  return {
    schema: 'CandidateNativeMutationReport/v1',
    producer_kind: 'native-instrumenter-batches/v1',
    qualification_scope: 'partition',
    full_qualification: false,
    status: 'pilot-pass',
    binding: {
      run_id: 'run-1',
      partition: 'main-runtime-core',
      input_fingerprint: 'a'.repeat(64),
      source_fingerprint: 'b'.repeat(64),
      test_fingerprint: 'c'.repeat(64),
      tool_fingerprint: 'd'.repeat(64),
      partition_sources: [{ path: 'src/runtime-kernel.ts', sha256: 'e'.repeat(64) }],
    },
    tests: ['tests/runtime-kernel-boundary.test.ts'],
    required_effective_score: 1,
    effective_score: 1,
    mutants: 1,
    killed: 1,
    non_killed: [],
    unknown_mutants: [],
    native_partition_proof: { file: 'proof.json', bytes: proofBytes.length, sha256: proofDigest },
  };
}

async function withRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'native-proof-reader-'));
  const deadline = performance.now() + 5_000;
  let complete = false;
  let primary: { error: unknown } | undefined;
  try {
    await run(root);
    if (performance.now() >= deadline) throw new Error('Native mutation proof fixture exceeded its cleanup deadline.');
    complete = true;
  } catch (error) {
    primary = { error };
  }
  if (!complete) {
    console.error(`Retained failed native mutation proof fixture: ${root}`);
    throw primary!.error;
  }
  try {
    await rm(root, { recursive: true, force: true });
  } catch (cleanup) {
    console.error(`Retained native mutation proof fixture after cleanup failure: ${root}`);
    if (primary)
      throw new AggregateError([primary.error, cleanup], 'Native mutation proof fixture body and cleanup failed');
    throw cleanup;
  }
}

async function withFixture(bytes: Buffer, run: (root: string) => Promise<void>): Promise<void> {
  await withRoot(async (root) => {
    await writeFile(path.join(root, 'proof.json'), bytes, { flag: 'wx' });
    await run(root);
  });
}

async function writeRecord(root: string, file: string, value: unknown) {
  const bytes = Buffer.from(JSON.stringify(value) + '\n');
  await writeFile(path.join(root, file), bytes, { flag: 'wx' });
  return { file, bytes: bytes.length, sha256: digest(bytes) };
}

async function writeRaw(root: string, file: string, value: string) {
  const bytes = Buffer.from(value);
  await writeFile(path.join(root, file), bytes, { flag: 'wx' });
  return bytes;
}

async function replaceRecord(root: string, file: string, value: unknown) {
  const bytes = Buffer.from(JSON.stringify(value) + '\n');
  await writeFile(path.join(root, file), bytes);
  return { file, bytes: bytes.length, sha256: digest(bytes) };
}

async function syntheticClosure(
  root: string,
  invocationExecutable = process.execPath,
  scope: 'global' | 'partition' = 'global',
) {
  const sourceText = 'export const enabled = true;\n';
  const test = 'import { expect, test } from "bun:test"; test("enabled", () => expect(true).toBe(true));\n';
  await mkdir(path.join(root, 'src'), { recursive: true });
  await mkdir(path.join(root, 'tests'), { recursive: true });
  await mkdir(path.join(root, 'stryker-tmp'), { recursive: true });
  await writeFile(path.join(root, 'src/runtime-kernel.ts'), sourceText);
  await writeFile(path.join(root, 'tests/runtime-kernel-boundary.test.ts'), test);
  const tests = [...partition.tests];
  const testSelection =
    scope === 'partition'
      ? { mode: 'focused-diagnostic' as const, contour: partition.name, sources: [...partition.sources].sort(), tests }
      : { mode: 'full-current-test-set' as const, tests };
  const sourceInputs = [{ path: 'src/runtime-kernel.ts', sha256: digest(Buffer.from(sourceText)) }];
  const testInputs = [{ path: tests[0]!, sha256: digest(Buffer.from(test)) }];
  const toolInputs: Array<{ path: string; sha256: string }> = [];
  const sourceFingerprint = sha256(canonicalJson(sourceInputs)!);
  const testFingerprint = testSelectionFingerprint(testSelection, testInputs);
  const toolFingerprint = sha256(canonicalJson(toolInputs)!);
  const inputFingerprint = qualityFingerprint({
    source_fingerprint: sourceFingerprint,
    test_fingerprint: testFingerprint,
    tool_fingerprint: toolFingerprint,
  });
  const partitionSource = mutationPartitionSourceBinding(partition.name, partition.sources, sourceInputs)!;
  const binding = {
    run_id: 'synthetic-run',
    partition: partition.name,
    input_fingerprint: inputFingerprint,
    source_fingerprint: sourceFingerprint,
    test_fingerprint: testFingerprint,
    tool_fingerprint: toolFingerprint,
    partition_sources: partitionSource.sourceInputs,
  };
  const descriptor = {
    schema: scope === 'partition' ? 'MutationInputDescriptor/v4' : 'MutationInputDescriptor/v3',
    partition: partition.name,
    partition_sources: partitionSource.sources,
    partition_source_inputs: partitionSource.sourceInputs,
    partition_source_fingerprint: partitionSource.fingerprint,
    source_fingerprint: sourceFingerprint,
    tests,
    test_selection: testSelection,
    test_inputs: testInputs,
    tool_inputs: toolInputs,
    input_fingerprint: inputFingerprint,
    test_fingerprint: testFingerprint,
    tool_fingerprint: toolFingerprint,
  };
  const image = {
    universe: mutationGeneratedUniverse(root, binding, [
      {
        fileName: 'src/runtime-kernel.ts',
        location: { start: { line: 0, column: 0 }, end: { line: 0, column: 1 } },
        mutatorName: 'BooleanLiteral',
        replacement: 'false',
        id: 'mutant-1',
      },
    ]),
  };
  const plan = planMutationBatches(root, binding, image.universe, 1);
  const artifacts = {
    generated_image: await writeRecord(root, 'generated-image.json', image),
    batch_plan: await writeRecord(root, 'batch-plan.json', plan),
    input_descriptor: await writeRecord(root, 'input-descriptor.json', descriptor),
  };
  const sandboxRoot = path.join(root, 'stryker-tmp');
  const physicalExecutable = process.execPath;
  const parentIdentity = {
    schema: 'MutationExecutionIdentity/v2',
    bun_executable: physicalExecutable,
    bun_executable_sha256: '1'.repeat(64),
    bun_executable_file: { device: '1', inode: '2', size: '3', modified_ns: '4', changed_ns: '5' },
    bun_version: 'synthetic',
    platform: process.platform,
    arch: process.arch,
    cwd: sandboxRoot,
    package_root: sandboxRoot,
    sandbox_root: sandboxRoot,
    command: [] as string[],
    test_files: tests,
    source_fingerprint: sourceFingerprint,
    test_fingerprint: testFingerprint,
    tool_fingerprint: toolFingerprint,
  };
  const rawRuns = async (id: string | null) => {
    const suffix = id === null ? 'dry-run' : sha256(id);
    const base = `${partition.name}-${suffix}`;
    const junitFile = `${base}.xml`;
    const stdoutFile = `${base}.stdout.log`;
    const stderrFile = `${base}.stderr.log`;
    const bodyFile = `${base}.body.jsonl`;
    const launcherSuffix = id === null ? 'dry-run' : sha256(id);
    const event =
      id === null
        ? ''
        : JSON.stringify({
            schema: 'MutationBodyEvent/v1',
            test_file: tests[0],
            kind: 'body',
            body_id: 1,
            assertion_cause: true,
            assertion_source: 'bun-expect',
            activation: { mutant_id: id, hit_count: 1 },
          }) + '\n';
    const junit =
      id === null
        ? `<testsuites tests="1" assertions="1" failures="0" errors="0" skipped="0"><testsuite name="selected" file="${tests[0]}" tests="1" assertions="1" failures="0" errors="0" skipped="0"><testcase name="baseline" classname="selected" file="${tests[0]}" assertions="1"/></testsuite></testsuites>`
        : `<testsuites tests="1" assertions="1" failures="1" errors="0" skipped="0"><testsuite name="selected" file="${tests[0]}" tests="1" assertions="1" failures="1" errors="0" skipped="0"><testcase name="[mutation-body:1] assertion" classname="selected" file="${tests[0]}" assertions="1"><failure type="AssertionError">assertion failed</failure></testcase></testsuite></testsuites>`;
    const junitBytes = await writeRaw(root, junitFile, junit);
    const stdout = await writeRaw(root, stdoutFile, 'synthetic runtime stdout\n');
    const stderr = await writeRaw(root, stderrFile, '');
    const body = await writeRaw(root, bodyFile, event);
    const launcherStdoutFile = `launcher-${launcherSuffix}.stdout.log`;
    const launcherStderrFile = `launcher-${launcherSuffix}.stderr.log`;
    const launcherStdout = await writeRaw(root, launcherStdoutFile, '');
    const launcherStderr = await writeRaw(root, launcherStderrFile, '');
    const command = buildMutationTestCommand(invocationExecutable, tests, path.join(root, junitFile));
    const childIdentity = {
      ...executionIdentityForInvocation(parentIdentity, command, tests),
      cwd: path.join(sandboxRoot, 'sandbox-native'),
      package_root: path.join(sandboxRoot, 'sandbox-native'),
    };
    const capture = (bytes: Buffer) => ({
      bytes: bytes.length,
      sha256: digest(bytes),
      retained_bytes: bytes.length,
      truncated: false,
    });
    const receipt = {
      schema: 'MutationRunnerReceipt/v3',
      run_id: binding.run_id,
      partition: binding.partition,
      active_mutant_id: id,
      test_files: tests,
      input_fingerprint: inputFingerprint,
      source_fingerprint: sourceFingerprint,
      test_fingerprint: testFingerprint,
      tool_fingerprint: toolFingerprint,
      command: recordedMutationCommand(command),
      execution_identity: childIdentity,
      execution_identity_digest: executionIdentityDigest(childIdentity),
      execution_identity_after_digest: executionIdentityDigest(childIdentity),
      test_context: mutationTestContextBinding(path.join(root, junitFile), toolInputs),
      spawn_error: null,
      timed_out: false,
      signal: null,
      exit_code: id === null ? 0 : 1,
      process_custody: { pid: 123, terminationObserved: true, unrefCalled: false, attempts: [] },
      junit_file: junitFile,
      junit_sha256: digest(junitBytes),
      junit_bytes: junitBytes.length,
      body_events_file: bodyFile,
      body_events_sha256: digest(body),
      body_events_bytes: body.length,
      stdout_file: stdoutFile,
      stderr_file: stderrFile,
      stdout_capture: capture(stdout),
      stderr_capture: capture(stderr),
    };
    const launcher = {
      exitCode: id === null ? 0 : 1,
      signal: null,
      spawnError: null,
      timedOut: false,
      processCustody: {
        pid: 123,
        scope: 'owned-process-group' as const,
        terminationObserved: true,
        processGroupTerminationObserved: true,
        unrefCalled: false,
        attempts: [],
      },
      output_capture: { complete: true as const, stdout: capture(launcherStdout), stderr: capture(launcherStderr) },
    };
    const result = await writeRecord(root, `${base}.runner.json`, receipt);
    const launcherRef = await writeRecord(root, `${base}.launcher.json`, launcher);
    const events = parseMutationBodyEvents(body, tests);
    const observed = junitOutcome(junit, tests, [], events, undefined, id !== null);
    if (observed.outcome !== (id === null ? 'passed' : 'killed'))
      throw new Error('Synthetic runner fixture did not prove its expected semantic outcome.');
    const cases = [
      {
        test_file: tests[0]!,
        name: id === null ? 'baseline' : '[mutation-body:1] assertion',
        outcome: id === null ? ('passed' as const) : ('failed' as const),
      },
    ];
    return { runnerRef: result, launcherRef, launcher, cases };
  };
  const baseline = await rawRuns(null);
  const mutant = await rawRuns('mutant-1');
  const baselineArtifact = await writeRecord(root, 'baseline.json', {
    status: 'passed',
    cases: baseline.cases,
    native_receipt: {
      artifact: baseline.runnerRef,
      launcher: { artifact: baseline.launcherRef, result: baseline.launcher },
      binding,
      tests,
      active_mutant_id: null,
      activation_hit_count: 0,
    },
  });
  const batchValue: NativeMutationBatchResult = {
    schema: 'MutationBatchPilotResult/v2',
    binding,
    universe_sha256: plan.universe_sha256,
    index: 0,
    elapsed_ms: 1,
    complete: true,
    interrupted: false,
    budget_exhausted: false,
    resource_blocked: null,
    results: [{ identity: image.universe.mutants[0]!.identity, local_id: 'mutant-1', status: 'killed' }],
  };
  const batchRef = await writeRecord(root, 'batch-0.json', batchValue);
  const receiptMap = new Map<string, NativeMutationReceiptReference>([
    [
      'mutant-1',
      {
        artifact: mutant.runnerRef,
        launcher: { artifact: mutant.launcherRef, result: mutant.launcher },
        binding,
        tests,
        active_mutant_id: 'mutant-1',
        activation_hit_count: 1,
      },
    ],
  ]);
  const evidence: NativeMutationProofEvidence = {
    tests,
    artifacts,
    baseline: {
      status: 'passed' as const,
      cases: baseline.cases,
      native_receipt: {
        artifact: baseline.runnerRef,
        launcher: { artifact: baseline.launcherRef, result: baseline.launcher },
        binding,
        tests,
        active_mutant_id: null,
        activation_hit_count: 0,
      },
      artifact: baselineArtifact,
    },
    batches: [{ artifact: batchRef, value: batchValue }],
    receipts: receiptMap,
  };
  const canonical = validateNativeMutationPartitionProof(root, binding, image.universe, plan, evidence);
  const context = {
    schema: 'NativeMutationValidationContext/v1',
    binding,
    invocation_executable: invocationExecutable,
    parent_identity_before: parentIdentity,
    parent_identity_after: parentIdentity,
    hook_files: [],
    source_inputs: sourceInputs,
  };
  const contextRef = await writeRecord(root, 'validation-context.json', context);
  const proof = { ...canonical, schema: 'NativeMutationPartitionProof/v2', validation_context: contextRef };
  const proofRef = await writeRecord(root, 'proof.json', proof);
  const candidate = {
    schema: 'CandidateNativeMutationReport/v1',
    producer_kind: 'native-instrumenter-batches/v1',
    qualification_scope: 'partition',
    full_qualification: false,
    status: 'pilot-pass',
    binding,
    tests,
    required_effective_score: 1,
    effective_score: 1,
    mutants: 1,
    killed: 1,
    non_killed: [],
    unknown_mutants: [],
    native_partition_proof: proofRef,
  };
  return {
    candidate,
    contextRef,
    proof,
    baselineStdout: `${partition.name}-dry-run.stdout.log`,
    mutantBody: `${partition.name}-${sha256('mutant-1')}.body.jsonl`,
  };
}

const partition = {
  name: 'main-runtime-core',
  sources: ['src/runtime-kernel.ts'],
  tests: ['tests/runtime-kernel-boundary.test.ts'],
};

describe('offline native mutation proof reader', () => {
  test('v4 admits an exact declared partition closure and rejects a foreign selection contour', async () => {
    await withRoot(async (root) => {
      const closure = await syntheticClosure(root, process.execPath, 'partition');
      const accepted = await readNativeMutationPartitionProof({
        packageRoot: root,
        artifactDirectory: root,
        report: closure.candidate,
        expectedPartition: partition,
      });
      expect(accepted.descriptor).toHaveProperty('schema', 'MutationInputDescriptor/v4');
      expect(accepted.descriptor).toHaveProperty('test_selection.mode', 'focused-diagnostic');
      expect(accepted.report.full_qualification).toBe(false);
      const ref = closure.proof.artifacts.input_descriptor;
      const descriptor: unknown = JSON.parse(await readFile(path.join(root, ref.file), 'utf8'));
      if (!isRecord(descriptor) || !isRecord(descriptor.test_selection))
        throw new Error('Expected a partition mutation descriptor fixture');
      descriptor.test_selection.contour = 'foreign-partition';
      const changed = await replaceRecord(root, ref.file, descriptor);
      const proof = await replaceRecord(root, 'proof.json', {
        ...closure.proof,
        artifacts: { ...closure.proof.artifacts, input_descriptor: changed },
      });
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: { ...closure.candidate, native_partition_proof: proof },
          expectedPartition: partition,
        }),
        /partition selection is invalid/u,
      );
    });
  });

  test.each(['duplicate', 'unordered', 'invalid-digest'] as const)(
    'rejects %s captured Source rows before fingerprint admission',
    async (kind) => {
      await withRoot(async (root) => {
        const closure = await syntheticClosure(root);
        const context: unknown = JSON.parse(await readFile(path.join(root, closure.contextRef.file), 'utf8'));
        if (!isRecord(context) || !Array.isArray(context.source_inputs))
          throw new Error('Synthetic context is malformed.');
        const rows: unknown[] = context.source_inputs;
        context.source_inputs =
          kind === 'duplicate'
            ? [...rows, rows[0]]
            : kind === 'unordered'
              ? [...rows, { path: 'src/a.ts', sha256: 'a'.repeat(64) }]
              : [{ path: 'src/runtime-kernel.ts', sha256: 'not-a-digest' }];
        const contextRef = await replaceRecord(root, closure.contextRef.file, context);
        const proofRef = await replaceRecord(root, 'proof.json', { ...closure.proof, validation_context: contextRef });
        await expectRejection(
          readNativeMutationPartitionProof({
            packageRoot: root,
            artifactDirectory: root,
            report: { ...closure.candidate, native_partition_proof: proofRef },
            expectedPartition: partition,
          }),
          kind === 'invalid-digest' ? 'digest rows are malformed' : 'digest rows are not in canonical path order',
        );
      });
    },
  );

  test('accepts a complete synthetic baseline plus assertion-killed mutant closure before raw-stream and stale-binding negatives', async () => {
    await withRoot(async (root) => {
      const closure = await syntheticClosure(root);
      const accepted = await readNativeMutationPartitionProof({
        packageRoot: root,
        artifactDirectory: root,
        report: closure.candidate,
        expectedPartition: partition,
      });
      expect(accepted.proof.mutants).toHaveLength(1);
      expect(accepted.proof.mutants[0]).toMatchObject({ local_id: 'mutant-1', outcome: 'assertion-confirmed-killed' });

      const stdoutFile = path.join(root, closure.baselineStdout);
      const originalStdout = await readFile(stdoutFile);
      await writeFile(stdoutFile, Buffer.concat([originalStdout, Buffer.from('changed size')]));
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: closure.candidate,
          expectedPartition: partition,
        }),
        'differs from its captured byte count',
      );
      expect(originalStdout.length).toBeGreaterThan(0);
      const changedStdout = Buffer.from(originalStdout);
      changedStdout[0] = changedStdout[0]! ^ 1;
      await writeFile(stdoutFile, changedStdout);
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: closure.candidate,
          expectedPartition: partition,
        }),
        'stdout or stderr differs from its receipt',
      );
      await writeFile(stdoutFile, originalStdout);

      const staleBinding = { ...closure.candidate, binding: { ...closure.candidate.binding, run_id: 'wrong-run' } };
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: staleBinding,
          expectedPartition: partition,
        }),
        'report, proof and expected partition disagree',
      );
    });
  });

  test('rejects missing mutant activation after the complete synthetic closure first succeeds', async () => {
    await withRoot(async (root) => {
      const closure = await syntheticClosure(root);
      expect(
        (
          await expectAsyncReturned(() =>
            readNativeMutationPartitionProof({
              packageRoot: root,
              artifactDirectory: root,
              report: closure.candidate,
              expectedPartition: partition,
            }),
          )
        ).proof.full_qualification,
      ).toBe(false);
      const body =
        JSON.stringify({
          schema: 'MutationBodyEvent/v1',
          test_file: partition.tests[0],
          kind: 'body',
          body_id: 1,
          assertion_cause: true,
          assertion_source: 'bun-expect',
        }) + '\n';
      const bodyBytes = Buffer.from(body);
      await writeFile(path.join(root, closure.mutantBody), bodyBytes);
      const mutantRow = closure.proof.mutants[0]!;
      const receiptPath = mutantRow.runner_receipt.file;
      const receiptValue: unknown = JSON.parse(await readFile(path.join(root, receiptPath), 'utf8'));
      if (!isRecord(receiptValue)) throw new Error('Synthetic runner receipt is not an object.');
      const receipt: Record<string, unknown> = receiptValue;
      receipt.body_events_bytes = bodyBytes.length;
      receipt.body_events_sha256 = digest(bodyBytes);
      const runnerRef = await replaceRecord(root, receiptPath, receipt);
      const mutants = [{ ...mutantRow, runner_receipt: runnerRef }];
      const proof = { ...closure.proof, mutants };
      const proofRef = await replaceRecord(root, 'proof.json', proof);
      const candidate = { ...closure.candidate, native_partition_proof: proofRef };
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: candidate,
          expectedPartition: partition,
        }),
        'runner body and JUnit evidence do not prove the claimed outcome',
      );
    });
  });

  test('rejects a canonical proof mismatch after the complete synthetic closure first succeeds', async () => {
    await withRoot(async (root) => {
      const closure = await syntheticClosure(root);
      expect(
        (
          await expectAsyncReturned(() =>
            readNativeMutationPartitionProof({
              packageRoot: root,
              artifactDirectory: root,
              report: closure.candidate,
              expectedPartition: partition,
            }),
          )
        ).proof.full_qualification,
      ).toBe(false);

      const partialProof = { ...closure.proof, mutants: [] };
      const partialRef = await replaceRecord(root, 'proof.json', partialProof);
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: { ...closure.candidate, native_partition_proof: partialRef },
          expectedPartition: partition,
        }),
        'receipt set is incomplete',
      );

      const mutant = closure.proof.mutants[0]!;
      const duplicateProof = { ...closure.proof, mutants: [mutant, mutant] };
      const duplicateRef = await replaceRecord(root, 'proof.json', duplicateProof);
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: { ...closure.candidate, native_partition_proof: duplicateRef },
          expectedPartition: partition,
        }),
        'artifact reference is duplicated',
      );

      const proof = { ...closure.proof, universe_sha256: 'f'.repeat(64) };
      const proofRef = await replaceRecord(root, 'proof.json', proof);
      const candidate = { ...closure.candidate, native_partition_proof: proofRef };
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: candidate,
          expectedPartition: partition,
        }),
        'differs from the canonical exhaustive semantic join',
      );
    });
  });

  test('rejects a persisted infrastructure error after the complete synthetic closure first succeeds', async () => {
    await withRoot(async (root) => {
      const closure = await syntheticClosure(root);
      expect(
        (
          await expectAsyncReturned(() =>
            readNativeMutationPartitionProof({
              packageRoot: root,
              artifactDirectory: root,
              report: closure.candidate,
              expectedPartition: partition,
            }),
          )
        ).proof.full_qualification,
      ).toBe(false);
      const mutant = closure.proof.mutants[0]!;
      const launcherPath = mutant.launcher_receipt.file;
      const launcherValue: unknown = JSON.parse(await readFile(path.join(root, launcherPath), 'utf8'));
      if (launcherValue === null || typeof launcherValue !== 'object' || Array.isArray(launcherValue))
        throw new Error('Synthetic launcher receipt is not an object.');
      const launcher = { ...launcherValue, spawnError: 'EIO' };
      const launcherRef = await replaceRecord(root, launcherPath, launcher);
      const proof = { ...closure.proof, mutants: [{ ...mutant, launcher_receipt: launcherRef }] };
      const proofRef = await replaceRecord(root, 'proof.json', proof);
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: { ...closure.candidate, native_partition_proof: proofRef },
          expectedPartition: partition,
        }),
        'launcher receipt does not prove a closed expected process outcome',
      );
    });
  });

  test('rejects a structurally valid but mismatched captured runtime identity after positive closure', async () => {
    await withRoot(async (root) => {
      const closure = await syntheticClosure(root);
      expect(
        (
          await expectAsyncReturned(() =>
            readNativeMutationPartitionProof({
              packageRoot: root,
              artifactDirectory: root,
              report: closure.candidate,
              expectedPartition: partition,
            }),
          )
        ).proof.full_qualification,
      ).toBe(false);
      const contextValue: unknown = JSON.parse(await readFile(path.join(root, closure.contextRef.file), 'utf8'));
      if (contextValue === null || typeof contextValue !== 'object' || Array.isArray(contextValue))
        throw new Error('Synthetic validation context is not an object.');
      const context = contextValue as Record<string, unknown>;
      if (
        context.parent_identity_before === null ||
        typeof context.parent_identity_before !== 'object' ||
        Array.isArray(context.parent_identity_before) ||
        context.parent_identity_after === null ||
        typeof context.parent_identity_after !== 'object' ||
        Array.isArray(context.parent_identity_after)
      )
        throw new Error('Synthetic execution identity is not an object.');
      context.parent_identity_before = { ...context.parent_identity_before, arch: 'synthetic-other-arch' };
      context.parent_identity_after = { ...context.parent_identity_after, arch: 'synthetic-other-arch' };
      const contextRef = await replaceRecord(root, closure.contextRef.file, context);
      const proofRef = await replaceRecord(root, 'proof.json', { ...closure.proof, validation_context: contextRef });
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: { ...closure.candidate, native_partition_proof: proofRef },
          expectedPartition: partition,
        }),
        'runner receipt does not match the descriptor-derived invocation',
      );
    });
  });

  test('accepts a captured invocation alias whose physical executable identity differs, then rejects a mismatched command', async () => {
    await withRoot(async (root) => {
      const alias = path.join(root, 'captured-alias', 'bun');
      const closure = await syntheticClosure(root, alias);
      expect(
        (
          await expectAsyncReturned(() =>
            readNativeMutationPartitionProof({
              packageRoot: root,
              artifactDirectory: root,
              report: closure.candidate,
              expectedPartition: partition,
            }),
          )
        ).proof.full_qualification,
      ).toBe(false);

      const mutant = closure.proof.mutants[0]!;
      const receiptPath = mutant.runner_receipt.file;
      const receiptValue: unknown = JSON.parse(await readFile(path.join(root, receiptPath), 'utf8'));
      if (!isRecord(receiptValue)) throw new Error('Synthetic runner receipt is not an object.');
      const receipt: Record<string, unknown> = receiptValue;
      if (!Array.isArray(receipt.command) || typeof receipt.command[0] !== 'string')
        throw new Error('Synthetic runner command is malformed.');
      const capturedCommand: unknown[] = receipt.command;
      receipt.command = ['different-captured-command', ...capturedCommand.slice(1)];
      const runnerRef = await replaceRecord(root, receiptPath, receipt);
      const proofRef = await replaceRecord(root, 'proof.json', {
        ...closure.proof,
        mutants: [{ ...mutant, runner_receipt: runnerRef }],
      });
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: { ...closure.candidate, native_partition_proof: proofRef },
          expectedPartition: partition,
        }),
        'runner receipt does not match the descriptor-derived invocation',
      );
    });
  });

  test('rejects a relative captured invocation path after the complete synthetic closure first succeeds', async () => {
    await withRoot(async (root) => {
      const closure = await syntheticClosure(root, path.join(root, 'captured-alias', 'bun'));
      expect(
        (
          await expectAsyncReturned(() =>
            readNativeMutationPartitionProof({
              packageRoot: root,
              artifactDirectory: root,
              report: closure.candidate,
              expectedPartition: partition,
            }),
          )
        ).proof.full_qualification,
      ).toBe(false);
      const contextValue: unknown = JSON.parse(await readFile(path.join(root, closure.contextRef.file), 'utf8'));
      if (contextValue === null || typeof contextValue !== 'object' || Array.isArray(contextValue))
        throw new Error('Synthetic validation context is not an object.');
      const context = { ...contextValue, invocation_executable: '../bun' } as Record<string, unknown>;
      const contextRef = await replaceRecord(root, closure.contextRef.file, context);
      const proofRef = await replaceRecord(root, 'proof.json', { ...closure.proof, validation_context: contextRef });
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: { ...closure.candidate, native_partition_proof: proofRef },
          expectedPartition: partition,
        }),
        'captured invocation path is invalid',
      );
    });
  });

  test('rejects a persisted v1 proof without upgrading it', async () => {
    const bytes = Buffer.from('{"schema":"NativeMutationPartitionProof/v1"}');
    await withFixture(bytes, async (root) => {
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: report(bytes),
          expectedPartition: partition,
        }),
        'Historical NativeMutationPartitionProof/v1',
      );
    });
  });

  test('rejects a proof reference whose persisted bytes do not match the report', async () => {
    const bytes = Buffer.from('{"schema":"NativeMutationPartitionProof/v2"}');
    await withFixture(bytes, async (root) => {
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: report(bytes, 'f'.repeat(64)),
          expectedPartition: partition,
        }),
        'differs from its recorded size or digest',
      );
    });
  });

  test('rejects Stryker or widened report shapes before opening proof artifacts', async () => {
    const bytes = Buffer.from('{}');
    await withFixture(bytes, async (root) => {
      const candidate = { ...report(bytes), producer_kind: 'stryker' };
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: candidate,
          expectedPartition: partition,
        }),
        'exact native partition pilot report',
      );
      const widened = { ...report(bytes), accepted: true };
      await expectRejection(
        readNativeMutationPartitionProof({
          packageRoot: root,
          artifactDirectory: root,
          report: widened,
          expectedPartition: partition,
        }),
        'exact native partition pilot report',
      );
    });
  });
});
