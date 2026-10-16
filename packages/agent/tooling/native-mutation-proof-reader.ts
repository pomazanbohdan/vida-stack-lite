import path from 'node:path';
import { isRecord as isObject } from '../src/contracts/forward-controller-values.ts';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import { readBoundedMutationArtifact, mutationArtifactByteLimit } from './mutation-artifact-reader.ts';
import { mutationPartitionSources, type MutationPartition } from './mutation-partitions.ts';
import { mutationPartitionSourceBinding, mutationTestContextBinding } from './mutation-command-runner.ts';
import {
  buildMutationTestCommand,
  executionIdentityDigest,
  executionIdentityForInvocation,
  junitOutcome,
  mutationReceiptMatches,
  nativeMutationActivationHitCount,
  parseMutationBodyEvents,
  validCapturedOutput,
  type MutationEvidenceReceipt,
  type MutationJUnitCase,
  type MutationProcessResult,
  type collectExecutionIdentity,
} from './mutation-evidence.ts';
import { qualityFingerprint, sha256, testSelectionFingerprint, type InputDigest } from './bun-coverage-evidence.ts';
import {
  validateNativeMutationPartitionProof,
  type MutationMapBinding,
  type NativeMutationArtifactRef,
  type NativeMutationPartitionProof,
  type NativeMutationPartitionProofV2,
  type NativeMutationProofEvidence,
  type NativeMutationReceiptReference,
  type NativeMutationValidationContext,
  type NativeMutationBatchResult,
} from './mutation-map.ts';

type CandidateNativeMutationReport = {
  schema: 'CandidateNativeMutationReport/v1';
  producer_kind: 'native-instrumenter-batches/v1';
  qualification_scope: 'partition';
  full_qualification: false;
  status: 'pilot-pass';
  binding: MutationMapBinding;
  tests: string[];
  required_effective_score: 1;
  effective_score: 1;
  mutants: number;
  killed: number;
  non_killed: [];
  unknown_mutants: [];
  native_partition_proof: NativeMutationArtifactRef;
};

export type NativeMutationPartitionRead = {
  report: CandidateNativeMutationReport;
  proof: NativeMutationPartitionProof;
  validation_context: NativeMutationArtifactRef;
  descriptor: Record<string, unknown>;
  context: NativeMutationValidationContext;
};

type JsonObject = Record<string, unknown>;
const fatalDecoder = new TextDecoder('utf-8', { fatal: true });
// A proof closure may contain many individually valid files. Keep retained
// bytes bounded across the entire closure, including raw runner/JUnit bodies.
const readerAggregateByteLimit = 128 * 1024 * 1024;
const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
const exactKeys = (value: JsonObject, keys: readonly string[]) =>
  Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
const same = (left: unknown, right: unknown) => canonicalJson(left) === canonicalJson(right);

function assertArtifactRef(value: unknown): asserts value is NativeMutationArtifactRef {
  if (
    !isObject(value) ||
    !exactKeys(value, ['file', 'bytes', 'sha256']) ||
    typeof value.file !== 'string' ||
    path.basename(value.file) !== value.file ||
    !value.file.endsWith('.json') ||
    !Number.isSafeInteger(value.bytes) ||
    Number(value.bytes) < 1 ||
    Number(value.bytes) > mutationArtifactByteLimit ||
    typeof value.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.sha256)
  )
    throw new Error('Native mutation proof artifact reference is invalid.');
}

function parseJson(bytes: Buffer, role: string): JsonObject {
  let value: unknown;
  try {
    value = JSON.parse(fatalDecoder.decode(bytes));
  } catch {
    throw new Error(`Native mutation ${role} is not fatal-UTF-8 JSON.`);
  }
  if (!isObject(value)) throw new Error(`Native mutation ${role} is not an object.`);
  return value;
}

function assertBinding(value: unknown): asserts value is MutationMapBinding {
  if (
    !isObject(value) ||
    !exactKeys(value, [
      'run_id',
      'partition',
      'input_fingerprint',
      'source_fingerprint',
      'test_fingerprint',
      'tool_fingerprint',
      'partition_sources',
    ]) ||
    ['run_id', 'partition'].some((key) => typeof value[key] !== 'string' || !value[key]) ||
    ['input_fingerprint', 'source_fingerprint', 'test_fingerprint', 'tool_fingerprint'].some(
      (key) => typeof value[key] !== 'string' || !/^[a-f0-9]{64}$/u.test(value[key] as string),
    ) ||
    !Array.isArray(value.partition_sources) ||
    value.partition_sources.some(
      (row) =>
        !isObject(row) ||
        !exactKeys(row, ['path', 'sha256']) ||
        typeof row.path !== 'string' ||
        !row.path ||
        row.path.startsWith('/') ||
        row.path.includes('\\') ||
        row.path.split('/').includes('..') ||
        typeof row.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(row.sha256),
    ) ||
    new Set(value.partition_sources.map((row) => (isObject(row) ? row.path : undefined))).size !==
      value.partition_sources.length
  )
    throw new Error('Native mutation binding is malformed.');
}

type CapturedExecutionIdentity = Awaited<ReturnType<typeof collectExecutionIdentity>>;

function assertExecutionIdentity(value: unknown): asserts value is CapturedExecutionIdentity {
  const keys = [
    'schema',
    'bun_executable',
    'bun_executable_sha256',
    'bun_executable_file',
    'bun_version',
    'platform',
    'arch',
    'cwd',
    'package_root',
    'sandbox_root',
    'command',
    'test_files',
    'source_fingerprint',
    'test_fingerprint',
    'tool_fingerprint',
  ];
  if (
    !isObject(value) ||
    !exactKeys(value, keys) ||
    value.schema !== 'MutationExecutionIdentity/v2' ||
    typeof value.bun_executable !== 'string' ||
    !value.bun_executable ||
    !path.isAbsolute(value.bun_executable) ||
    typeof value.bun_executable_sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.bun_executable_sha256) ||
    !isObject(value.bun_executable_file) ||
    !exactKeys(value.bun_executable_file, ['device', 'inode', 'size', 'modified_ns', 'changed_ns']) ||
    Object.values(value.bun_executable_file).some(
      (field) => typeof field !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(field),
    ) ||
    value.bun_executable_file.size === '0' ||
    ['bun_version', 'platform', 'arch'].some((field) => typeof value[field] !== 'string' || !value[field]) ||
    ['cwd', 'package_root', 'sandbox_root'].some(
      (field) => typeof value[field] !== 'string' || !path.isAbsolute(value[field] as string),
    ) ||
    !Array.isArray(value.command) ||
    value.command.some((item) => typeof item !== 'string' || !item) ||
    !Array.isArray(value.test_files) ||
    value.test_files.length < 1 ||
    value.test_files.some(
      (item) =>
        typeof item !== 'string' ||
        !item ||
        item.startsWith('/') ||
        item.includes('\\') ||
        item.split('/').includes('..'),
    ) ||
    new Set(value.test_files).size !== value.test_files.length ||
    ['source_fingerprint', 'test_fingerprint', 'tool_fingerprint'].some(
      (field) => typeof value[field] !== 'string' || !/^[a-f0-9]{64}$/u.test(value[field] as string),
    )
  )
    throw new Error('Native mutation captured execution identity is malformed.');
}

function assertDigestRows(value: unknown, label: string): asserts value is InputDigest[] {
  if (!Array.isArray(value)) throw new Error(`Native mutation ${label} digest rows are malformed.`);
  const rows: unknown[] = value;
  let previous: string | undefined;
  for (const row of rows) {
    if (
      !isObject(row) ||
      !exactKeys(row, ['path', 'sha256']) ||
      typeof row.path !== 'string' ||
      !row.path ||
      row.path.startsWith('/') ||
      row.path.includes('\\') ||
      row.path.split('/').includes('..') ||
      typeof row.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(row.sha256)
    )
      throw new Error(`Native mutation ${label} digest rows are malformed.`);
    if (previous !== undefined && previous >= row.path)
      throw new Error(`Native mutation ${label} digest rows are not in canonical path order.`);
    previous = row.path;
  }
}

function isMutationProcessResult(value: unknown): value is MutationProcessResult {
  if (
    !isObject(value) ||
    !exactKeys(value, ['exitCode', 'signal', 'spawnError', 'timedOut', 'processCustody', 'output_capture']) ||
    !(value.exitCode === null || Number.isSafeInteger(value.exitCode)) ||
    !(value.signal === null || typeof value.signal === 'string') ||
    !(value.spawnError === null || typeof value.spawnError === 'string') ||
    typeof value.timedOut !== 'boolean' ||
    !(
      value.output_capture === undefined ||
      (isObject(value.output_capture) &&
        (value.output_capture.complete === false ||
          (value.output_capture.complete === true &&
            validCapturedOutput(value.output_capture.stdout) &&
            validCapturedOutput(value.output_capture.stderr))))
    )
  )
    return false;
  if (value.processCustody === null) return true;
  const custody = value.processCustody;
  return (
    isObject(custody) &&
    (custody.pid === null || (Number.isSafeInteger(custody.pid) && Number(custody.pid) > 0)) &&
    (custody.scope === 'child' || custody.scope === 'owned-process-group') &&
    typeof custody.terminationObserved === 'boolean' &&
    (custody.processGroupTerminationObserved === null ||
      typeof custody.processGroupTerminationObserved === 'boolean') &&
    typeof custody.unrefCalled === 'boolean' &&
    (custody.unrefError === undefined || custody.unrefError === null || typeof custody.unrefError === 'string') &&
    Array.isArray(custody.attempts) &&
    custody.attempts.every(
      (attempt) =>
        isObject(attempt) &&
        typeof attempt.signal === 'string' &&
        typeof attempt.target === 'string' &&
        typeof attempt.outcome === 'string' &&
        (attempt.error === undefined || typeof attempt.error === 'string'),
    )
  );
}

function assertProofShape(value: unknown): asserts value is NativeMutationPartitionProofV2 {
  const keys = [
    'schema',
    'validation_context',
    'binding',
    'qualification_scope',
    'full_qualification',
    'tests',
    'universe_sha256',
    'artifacts',
    'baseline',
    'batches',
    'mutants',
  ];
  if (
    !isObject(value) ||
    !exactKeys(value, keys) ||
    value.schema !== 'NativeMutationPartitionProof/v2' ||
    value.qualification_scope !== 'partition' ||
    value.full_qualification !== false ||
    typeof value.universe_sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.universe_sha256) ||
    !Array.isArray(value.tests) ||
    value.tests.length < 1 ||
    value.tests.some((item) => typeof item !== 'string' || !item) ||
    new Set(value.tests).size !== value.tests.length ||
    !isObject(value.validation_context) ||
    !isObject(value.artifacts) ||
    !exactKeys(value.artifacts, ['generated_image', 'batch_plan', 'input_descriptor']) ||
    !isObject(value.baseline) ||
    !exactKeys(value.baseline, ['artifact', 'runner_receipt', 'launcher_receipt', 'cases']) ||
    !Array.isArray(value.baseline.cases) ||
    !Array.isArray(value.batches) ||
    !Array.isArray(value.mutants)
  )
    throw new Error('Persisted native mutation proof structure is malformed.');
  assertBinding(value.binding);
  assertArtifactRef(value.validation_context);
  for (const ref of Object.values(value.artifacts)) assertArtifactRef(ref);
  for (const key of ['artifact', 'runner_receipt', 'launcher_receipt']) assertArtifactRef(value.baseline[key]);
  const batches: unknown[] = value.batches;
  for (const row of batches) {
    if (
      !isObject(row) ||
      !exactKeys(row, ['index', 'artifact']) ||
      !Number.isSafeInteger(row.index) ||
      Number(row.index) < 0
    )
      throw new Error('Persisted native mutation batch references are malformed.');
    assertArtifactRef(row.artifact);
  }
  const mutants: unknown[] = value.mutants;
  for (const row of mutants) {
    if (
      !isObject(row) ||
      !exactKeys(row, ['identity', 'local_id', 'outcome', 'runner_receipt', 'launcher_receipt']) ||
      typeof row.identity !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(row.identity) ||
      typeof row.local_id !== 'string' ||
      !row.local_id ||
      row.outcome !== 'assertion-confirmed-killed'
    )
      throw new Error('Persisted native mutation mutant rows are malformed.');
    assertArtifactRef(row.runner_receipt);
    assertArtifactRef(row.launcher_receipt);
  }
}

function assertReport(value: unknown): asserts value is CandidateNativeMutationReport {
  const keys = [
    'schema',
    'producer_kind',
    'qualification_scope',
    'full_qualification',
    'status',
    'binding',
    'tests',
    'required_effective_score',
    'effective_score',
    'mutants',
    'killed',
    'non_killed',
    'unknown_mutants',
    'native_partition_proof',
  ];
  if (
    !isObject(value) ||
    !exactKeys(value, keys) ||
    value.schema !== 'CandidateNativeMutationReport/v1' ||
    value.producer_kind !== 'native-instrumenter-batches/v1' ||
    value.qualification_scope !== 'partition' ||
    value.full_qualification !== false ||
    value.status !== 'pilot-pass' ||
    value.required_effective_score !== 1 ||
    value.effective_score !== 1 ||
    !Number.isSafeInteger(value.mutants) ||
    Number(value.mutants) < 1 ||
    value.killed !== value.mutants ||
    !Array.isArray(value.non_killed) ||
    value.non_killed.length !== 0 ||
    !Array.isArray(value.unknown_mutants) ||
    value.unknown_mutants.length !== 0 ||
    !Array.isArray(value.tests) ||
    value.tests.length < 1 ||
    value.tests.some((item) => typeof item !== 'string') ||
    new Set(value.tests).size !== value.tests.length
  )
    throw new Error('Candidate report is not an exact native partition pilot report.');
  assertBinding(value.binding);
  assertArtifactRef(value.native_partition_proof);
}

function assertRefClosure(
  proof: NativeMutationPartitionProofV2,
  contextRef: NativeMutationArtifactRef,
  reportRef: NativeMutationArtifactRef,
): NativeMutationArtifactRef[] {
  const refs: NativeMutationArtifactRef[] = [
    reportRef,
    contextRef,
    proof.artifacts.generated_image,
    proof.artifacts.batch_plan,
    proof.artifacts.input_descriptor,
    proof.baseline.artifact,
    proof.baseline.runner_receipt,
    proof.baseline.launcher_receipt,
    ...proof.batches.map((row) => row.artifact),
    ...proof.mutants.flatMap((row) => [row.runner_receipt, row.launcher_receipt]),
  ];
  const files = new Set<string>();
  for (const ref of refs) {
    assertArtifactRef(ref);
    if (files.has(ref.file)) throw new Error('Native mutation proof artifact reference is duplicated.');
    files.add(ref.file);
  }
  return refs;
}

function assertDescriptor(
  descriptor: JsonObject,
  proof: NativeMutationPartitionProofV2,
  context: NativeMutationValidationContext,
  partition: MutationPartition,
): asserts descriptor is JsonObject & { test_inputs: InputDigest[]; tool_inputs: InputDigest[] } {
  const keys = [
    'schema',
    'partition',
    'partition_sources',
    'partition_source_inputs',
    'partition_source_fingerprint',
    'source_fingerprint',
    'tests',
    'test_selection',
    'test_inputs',
    'tool_inputs',
    'input_fingerprint',
    'test_fingerprint',
    'tool_fingerprint',
  ];
  if (
    !exactKeys(descriptor, keys) ||
    descriptor.schema !== 'MutationInputDescriptor/v3' ||
    descriptor.partition !== partition.name ||
    !stringArray(descriptor.tests) ||
    !same(descriptor.tests, proof.tests) ||
    !same(descriptor.tests, partition.tests) ||
    !isObject(descriptor.test_selection) ||
    !exactKeys(descriptor.test_selection, ['mode', 'tests']) ||
    descriptor.test_selection.mode !== 'full-current-test-set' ||
    !stringArray(descriptor.test_selection.tests) ||
    descriptor.test_selection.tests.length < 1 ||
    descriptor.test_selection.tests.some((test) => !test) ||
    !Array.isArray(descriptor.partition_sources) ||
    descriptor.partition_sources.some((source) => typeof source !== 'string') ||
    !Array.isArray(descriptor.test_inputs) ||
    !Array.isArray(descriptor.tool_inputs) ||
    !Array.isArray(descriptor.partition_source_inputs)
  )
    throw new Error('Native mutation input descriptor shape or partition selection is invalid.');
  assertDigestRows(descriptor.test_inputs, 'descriptor test input');
  assertDigestRows(descriptor.tool_inputs, 'descriptor tool input');
  assertDigestRows(descriptor.partition_source_inputs, 'descriptor partition Source input');
  const selected = descriptor.test_selection.tests;
  // This is the producer's captured full-selection claim. The offline reader
  // checks its internal metadata and exact executed partition, but cannot prove
  // current global inventory exhaustiveness; the returned proof stays local.
  if (new Set(selected).size !== selected.length || descriptor.tests.some((test) => !selected.includes(test)))
    throw new Error('Native mutation partition tests are outside the captured full test selection.');
  const testInputPaths = new Set(descriptor.test_inputs.map((row) => row.path));
  if (selected.some((test) => !testInputPaths.has(test)))
    throw new Error('Native mutation full test selection has no captured digest for a selected test.');
  if (!same(descriptor.partition_sources, [...mutationPartitionSources(partition)].sort()))
    throw new Error('Native mutation descriptor Source paths differ from the declared partition.');
  const sourceBinding = mutationPartitionSourceBinding(
    partition.name,
    descriptor.partition_sources,
    context.source_inputs,
  );
  if (
    !sourceBinding ||
    !same(sourceBinding.sourceInputs, descriptor.partition_source_inputs) ||
    sourceBinding.fingerprint !== descriptor.partition_source_fingerprint ||
    !same(sourceBinding.sourceInputs, proof.binding.partition_sources)
  )
    throw new Error('Native mutation partition Source digest rows do not close over captured global Source inputs.');
  for (const field of ['input_fingerprint', 'source_fingerprint', 'test_fingerprint', 'tool_fingerprint'] as const)
    if (descriptor[field] !== proof.binding[field])
      throw new Error(`Native mutation descriptor ${field} differs from its proof binding.`);
  if (
    testSelectionFingerprint(
      descriptor.test_selection as { mode: 'full-current-test-set'; tests: string[] },
      descriptor.test_inputs,
    ) !== descriptor.test_fingerprint ||
    sha256(canonicalJson(descriptor.tool_inputs)!) !== descriptor.tool_fingerprint ||
    sha256(canonicalJson(context.source_inputs)!) !== descriptor.source_fingerprint ||
    qualityFingerprint({
      source_fingerprint: descriptor.source_fingerprint as string,
      test_fingerprint: descriptor.test_fingerprint as string,
      tool_fingerprint: descriptor.tool_fingerprint as string,
    }) !== descriptor.input_fingerprint
  )
    throw new Error('Native mutation descriptor fingerprints do not match captured digest rows.');
  if (!same(context.binding, proof.binding) || context.binding.partition !== partition.name)
    throw new Error('Native mutation context binding differs from the expected partition.');
}

function expectedRunnerNames(partition: string, id: string | null) {
  const key = id === null ? 'dry-run' : sha256(id);
  const base = `${partition}-${key}`;
  return {
    junit: `${base}.xml`,
    receipt: `${base}.receipt.json`,
    stdout: `${base}.stdout.log`,
    stderr: `${base}.stderr.log`,
    body: `${base}.body.jsonl`,
  };
}

/** Read and join a persisted native partition closure. This is offline evidence validation only. */
export async function readNativeMutationPartitionProof(input: {
  packageRoot: string;
  artifactDirectory: string;
  report: unknown;
  expectedPartition: MutationPartition;
}): Promise<NativeMutationPartitionRead> {
  assertReport(input.report);
  const report = input.report;
  if (report.binding.partition !== input.expectedPartition.name || !same(report.tests, input.expectedPartition.tests))
    throw new Error('Candidate report does not bind the selected declared partition.');
  const cache = new Map<string, Promise<Buffer>>();
  let retainedBudget = 0;
  const reserveBytes = (bytes: number) => {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || retainedBudget + bytes > readerAggregateByteLimit)
      throw new Error(
        `GAP: Native mutation evidence exceeds the ${readerAggregateByteLimit}-byte aggregate reader budget.`,
      );
    retainedBudget += bytes;
  };
  const readRef = (ref: NativeMutationArtifactRef) => {
    assertArtifactRef(ref);
    let pending = cache.get(ref.file);
    if (!pending) {
      reserveBytes(ref.bytes);
      pending = readBoundedMutationArtifact(input.artifactDirectory, ref.file, mutationArtifactByteLimit);
      cache.set(ref.file, pending);
    }
    return pending.then((bytes) => {
      if (bytes.length !== ref.bytes || sha256(bytes) !== ref.sha256)
        throw new Error(`Native mutation artifact ${ref.file} differs from its recorded size or digest.`);
      return bytes;
    });
  };
  const reportProofBytes = await readRef(report.native_partition_proof);
  const proofValue = parseJson(reportProofBytes, 'partition proof');
  if (proofValue.schema === 'NativeMutationPartitionProof/v1')
    throw new Error('Historical NativeMutationPartitionProof/v1 is not accepted by the v2 reader.');
  assertProofShape(proofValue);
  const proof = proofValue;
  const contextRef = proof.validation_context;
  const refs = assertRefClosure(proof, contextRef, report.native_partition_proof);
  const blobs = new Map<string, Buffer>();
  blobs.set(report.native_partition_proof.file, reportProofBytes);
  for (const ref of refs) if (!blobs.has(ref.file)) blobs.set(ref.file, await readRef(ref));
  const json = (ref: NativeMutationArtifactRef, label: string) => parseJson(blobs.get(ref.file)!, label);
  const contextValue = json(contextRef, 'validation context');
  if (
    contextValue.schema !== 'NativeMutationValidationContext/v1' ||
    !exactKeys(contextValue, [
      'schema',
      'binding',
      'invocation_executable',
      'parent_identity_before',
      'parent_identity_after',
      'hook_files',
      'source_inputs',
    ]) ||
    typeof contextValue.invocation_executable !== 'string' ||
    !path.isAbsolute(contextValue.invocation_executable) ||
    !stringArray(contextValue.hook_files) ||
    !Array.isArray(contextValue.source_inputs)
  )
    throw new Error('Native mutation validation context shape or captured invocation path is invalid.');
  assertBinding(contextValue.binding);
  assertExecutionIdentity(contextValue.parent_identity_before);
  assertExecutionIdentity(contextValue.parent_identity_after);
  assertDigestRows(contextValue.source_inputs, 'context Source input');
  if (
    executionIdentityDigest(contextValue.parent_identity_before) !==
    executionIdentityDigest(contextValue.parent_identity_after)
  )
    throw new Error('Native mutation validation context parent identity bracket is invalid.');
  const context: NativeMutationValidationContext = {
    schema: 'NativeMutationValidationContext/v1',
    binding: contextValue.binding,
    invocation_executable: contextValue.invocation_executable,
    parent_identity_before: contextValue.parent_identity_before,
    parent_identity_after: contextValue.parent_identity_after,
    hook_files: contextValue.hook_files,
    source_inputs: contextValue.source_inputs,
  };
  if (
    proof.qualification_scope !== 'partition' ||
    proof.full_qualification !== false ||
    !same(proof.binding, report.binding) ||
    !same(proof.tests, report.tests) ||
    proof.binding.partition !== input.expectedPartition.name
  )
    throw new Error('Native mutation report, proof and expected partition disagree.');
  const descriptor = json(proof.artifacts.input_descriptor, 'input descriptor');
  assertDescriptor(descriptor, proof, context, input.expectedPartition);
  if (
    context.hook_files.some(
      (file) =>
        typeof file !== 'string' ||
        file.includes('\\') ||
        file.startsWith('./') ||
        file.split('/').includes('..') ||
        !proof.tests.includes(file),
    ) ||
    new Set(context.hook_files).size !== context.hook_files.length
  )
    throw new Error('Native mutation context hook file set is invalid.');
  if (
    context.parent_identity_before.schema !== 'MutationExecutionIdentity/v2' ||
    !same(context.parent_identity_before.test_files, proof.tests) ||
    context.parent_identity_before.source_fingerprint !== proof.binding.source_fingerprint ||
    context.parent_identity_before.test_fingerprint !== proof.binding.test_fingerprint ||
    context.parent_identity_before.tool_fingerprint !== proof.binding.tool_fingerprint ||
    context.parent_identity_before.cwd !== path.resolve(input.artifactDirectory, 'stryker-tmp') ||
    context.parent_identity_before.package_root !== path.resolve(input.artifactDirectory, 'stryker-tmp') ||
    context.parent_identity_before.sandbox_root !== path.resolve(input.artifactDirectory, 'stryker-tmp') ||
    !Array.isArray(context.parent_identity_before.command) ||
    context.parent_identity_before.command.length !== 0
  )
    throw new Error(
      'Native mutation parent execution identity does not bind this captured partition and artifact layout.',
    );

  const generated = json(proof.artifacts.generated_image, 'generated image');
  const plan = json(proof.artifacts.batch_plan, 'batch plan');
  const selectedTests = proof.tests;
  const testContextFor = (junitFile: string) =>
    mutationTestContextBinding(path.join(input.artifactDirectory, junitFile), descriptor.tool_inputs);
  const processResult = (ref: NativeMutationArtifactRef, label: string): MutationProcessResult => {
    const value = json(ref, label);
    if (!isMutationProcessResult(value)) throw new Error(`Native mutation ${label} structure is malformed.`);
    return value;
  };
  const readBytes = async (file: string, expectedBytes: number, limit = 4 * 1024 * 1024): Promise<Buffer> => {
    let pending = cache.get(file);
    if (!pending) {
      reserveBytes(expectedBytes);
      pending = readBoundedMutationArtifact(input.artifactDirectory, file, limit, true);
      cache.set(file, pending);
    }
    const bytes = await pending;
    if (bytes.length !== expectedBytes)
      throw new Error(`Native mutation artifact ${file} differs from its captured byte count.`);
    return bytes;
  };
  const usedNames = new Set(refs.map((ref) => ref.file));
  const claimName = (name: string) => {
    if (usedNames.has(name)) throw new Error('Native mutation evidence roles share an artifact name.');
    usedNames.add(name);
  };
  const casesFrom = async (
    runnerRef: NativeMutationArtifactRef,
    launcherRef: NativeMutationArtifactRef,
    id: string | null,
  ) => {
    const names = expectedRunnerNames(input.expectedPartition.name, id);
    for (const name of [names.junit, names.stdout, names.stderr, names.body]) claimName(name);
    const receiptValue = json(runnerRef, 'runner receipt');
    const launcher = processResult(launcherRef, 'launcher receipt');
    const command = buildMutationTestCommand(
      context.invocation_executable,
      selectedTests,
      path.join(input.artifactDirectory, names.junit),
    );
    const expectedIdentity = executionIdentityForInvocation(context.parent_identity_before, command, selectedTests);
    if (
      !mutationReceiptMatches(receiptValue, {
        runId: proof.binding.run_id,
        partition: proof.binding.partition,
        mutantId: id,
        tests: selectedTests,
        bodyEventsFile: names.body,
        inputs: {
          source_fingerprint: proof.binding.source_fingerprint,
          test_fingerprint: proof.binding.test_fingerprint,
          tool_fingerprint: proof.binding.tool_fingerprint,
        },
        fingerprint: proof.binding.input_fingerprint,
        junitFile: names.junit,
        stdoutFile: names.stdout,
        stderrFile: names.stderr,
        command,
        sandboxRoot: path.join(input.artifactDirectory, 'stryker-tmp'),
        executionIdentity: expectedIdentity,
        testContext: testContextFor(names.junit),
      })
    )
      throw new Error('Native mutation runner receipt does not match the descriptor-derived invocation.');
    const receipt: MutationEvidenceReceipt = receiptValue;
    if (
      launcher.timedOut !== false ||
      launcher.signal !== null ||
      launcher.spawnError !== null ||
      launcher.exitCode !== (id === null ? 0 : 1) ||
      launcher.output_capture?.complete !== true ||
      !validCapturedOutput(launcher.output_capture.stdout) ||
      !validCapturedOutput(launcher.output_capture.stderr) ||
      launcher.processCustody?.scope !== 'owned-process-group' ||
      launcher.processCustody.terminationObserved !== true ||
      launcher.processCustody.processGroupTerminationObserved !== true
    )
      throw new Error('Native mutation launcher receipt does not prove a closed expected process outcome.');
    const junitBytes = await readBytes(names.junit, receipt.junit_bytes);
    if (junitBytes.length !== receipt.junit_bytes || sha256(junitBytes) !== receipt.junit_sha256)
      throw new Error('Native mutation JUnit bytes differ from their runner receipt.');
    const stdoutBytes = await readBytes(names.stdout, receipt.stdout_capture.bytes);
    const stderrBytes = await readBytes(names.stderr, receipt.stderr_capture.bytes);
    if (
      stdoutBytes.length !== receipt.stdout_capture.bytes ||
      sha256(stdoutBytes) !== receipt.stdout_capture.sha256 ||
      stderrBytes.length !== receipt.stderr_capture.bytes ||
      sha256(stderrBytes) !== receipt.stderr_capture.sha256
    )
      throw new Error('Native mutation runner stdout or stderr differs from its receipt.');
    const bodyBytes = await readBytes(names.body, Number(receipt.body_events_bytes));
    if (bodyBytes.length !== receipt.body_events_bytes || sha256(bodyBytes) !== receipt.body_events_sha256)
      throw new Error('Native mutation body events differ from their runner receipt.');
    const events = parseMutationBodyEvents(bodyBytes, selectedTests);
    const activation = nativeMutationActivationHitCount(events, id, true);
    const observedCases: MutationJUnitCase[] = [];
    const outcome = junitOutcome(
      fatalDecoder.decode(junitBytes),
      selectedTests,
      context.hook_files,
      events,
      (row) => observedCases.push(row),
      id !== null,
    );
    const expectedOutcome = id === null ? 'passed' : 'killed';
    if (
      outcome.outcome !== expectedOutcome ||
      (id === null ? activation !== undefined : !Number.isSafeInteger(activation) || Number(activation) < 1)
    )
      throw new Error('Native mutation runner body and JUnit evidence do not prove the claimed outcome.');
    if (id !== null && (launcher.exitCode !== 1 || receipt.exit_code !== 1))
      throw new Error('Native mutation killed result has an incorrect exit code.');
    if (id === null && (launcher.exitCode !== 0 || receipt.exit_code !== 0))
      throw new Error('Native mutation baseline has an incorrect exit code.');
    const launcherKey = id === null ? 'dry-run' : sha256(id);
    claimName(`launcher-${launcherKey}.stdout.log`);
    claimName(`launcher-${launcherKey}.stderr.log`);
    const launcherStdout = await readBytes(`launcher-${launcherKey}.stdout.log`, launcher.output_capture.stdout.bytes);
    const launcherStderr = await readBytes(`launcher-${launcherKey}.stderr.log`, launcher.output_capture.stderr.bytes);
    if (
      launcher.output_capture.stdout.bytes !== launcherStdout.length ||
      launcher.output_capture.stdout.sha256 !== sha256(launcherStdout) ||
      launcher.output_capture.stderr.bytes !== launcherStderr.length ||
      launcher.output_capture.stderr.sha256 !== sha256(launcherStderr)
    )
      throw new Error('Native mutation launcher output bytes differ from its captured process result.');
    return { cases: observedCases, activation: id === null ? 0 : Number(activation), launcher };
  };

  const baselineValue = json(proof.baseline.artifact, 'baseline result');
  if (
    baselineValue.status !== 'passed' ||
    !Array.isArray(baselineValue.cases) ||
    !same(baselineValue.cases, proof.baseline.cases)
  )
    throw new Error('Native mutation persisted baseline result differs from its proof census.');
  const baselineRun = await casesFrom(proof.baseline.runner_receipt, proof.baseline.launcher_receipt, null);
  const baselineNative = baselineValue.native_receipt;
  const baselineNativeLauncher = isObject(baselineNative) ? baselineNative.launcher : undefined;
  if (
    !isObject(baselineNative) ||
    !isObject(baselineNativeLauncher) ||
    !isObject(baselineNativeLauncher.result) ||
    !same(baselineNative.artifact, proof.baseline.runner_receipt) ||
    !same(baselineNativeLauncher.artifact, proof.baseline.launcher_receipt) ||
    !same(baselineNative.binding, proof.binding) ||
    !same(baselineNative.tests, proof.tests) ||
    baselineNative.active_mutant_id !== null ||
    baselineNative.activation_hit_count !== 0 ||
    !same(baselineRun.cases, proof.baseline.cases)
  )
    throw new Error('Native mutation baseline persisted receipt or census is inconsistent.');
  const batchValues: Array<{ artifact: NativeMutationArtifactRef; value: NativeMutationBatchResult }> =
    proof.batches.map((row) => {
      const value = json(row.artifact, 'batch result');
      if (
        value.schema !== 'MutationBatchPilotResult/v2' ||
        !Array.isArray(value.results) ||
        typeof value.index !== 'number' ||
        !Number.isSafeInteger(value.index) ||
        typeof value.elapsed_ms !== 'number' ||
        !Number.isFinite(value.elapsed_ms) ||
        value.elapsed_ms < 0 ||
        typeof value.complete !== 'boolean' ||
        typeof value.interrupted !== 'boolean' ||
        typeof value.budget_exhausted !== 'boolean' ||
        !(
          value.resource_blocked === null ||
          (isObject(value.resource_blocked) &&
            typeof value.resource_blocked.observed_path === 'string' &&
            (value.resource_blocked.available_bytes === null ||
              typeof value.resource_blocked.available_bytes === 'string'))
        ) ||
        typeof value.universe_sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(value.universe_sha256)
      )
        throw new Error('Native mutation batch result structure is malformed.');
      assertBinding(value.binding);
      const results = value.results.map((result: unknown): NativeMutationBatchResult['results'][number] => {
        if (
          !isObject(result) ||
          !exactKeys(result, ['identity', 'local_id', 'status']) ||
          typeof result.identity !== 'string' ||
          !/^[a-f0-9]{64}$/u.test(result.identity) ||
          typeof result.local_id !== 'string' ||
          (result.status !== 'killed' && result.status !== 'survived' && result.status !== 'unknown')
        )
          throw new Error('Native mutation batch result structure is malformed.');
        return { identity: result.identity, local_id: result.local_id, status: result.status };
      });
      const resource =
        value.resource_blocked === null
          ? null
          : (value.resource_blocked as { observed_path: string; available_bytes: string | null });
      const typedValue: NativeMutationBatchResult = {
        schema: 'MutationBatchPilotResult/v2',
        binding: value.binding,
        universe_sha256: value.universe_sha256,
        index: value.index,
        elapsed_ms: value.elapsed_ms,
        complete: value.complete,
        interrupted: value.interrupted,
        budget_exhausted: value.budget_exhausted,
        resource_blocked: resource,
        results,
      };
      return { artifact: row.artifact, value: typedValue };
    });
  const receiptMap = new Map<string, NativeMutationReceiptReference>();
  for (const mutant of proof.mutants) {
    const runner = await casesFrom(mutant.runner_receipt, mutant.launcher_receipt, mutant.local_id);
    receiptMap.set(mutant.local_id, {
      artifact: mutant.runner_receipt,
      launcher: {
        artifact: mutant.launcher_receipt,
        result: runner.launcher,
      },
      binding: proof.binding,
      tests: [...proof.tests],
      active_mutant_id: mutant.local_id,
      activation_hit_count: runner.activation,
    });
  }
  const evidence: NativeMutationProofEvidence = {
    tests: proof.tests,
    artifacts: proof.artifacts,
    baseline: {
      status: 'passed',
      cases: baselineRun.cases,
      artifact: proof.baseline.artifact,
      native_receipt: {
        artifact: proof.baseline.runner_receipt,
        launcher: {
          artifact: proof.baseline.launcher_receipt,
          result: baselineRun.launcher,
        },
        binding: proof.binding,
        tests: [...proof.tests],
        active_mutant_id: null,
        activation_hit_count: 0,
      },
    },
    batches: batchValues,
    receipts: receiptMap,
  };
  if (!same(baselineNativeLauncher.result, baselineRun.launcher))
    throw new Error('Native mutation baseline inline launcher result differs from its persisted launcher artifact.');
  const canonical = validateNativeMutationPartitionProof(
    input.packageRoot,
    proof.binding,
    generated.universe,
    plan,
    evidence,
  );
  const persistedV1Projection = { ...proof } as JsonObject;
  delete persistedV1Projection.schema;
  delete persistedV1Projection.validation_context;
  const canonicalV2Projection = { ...canonical } as JsonObject;
  delete canonicalV2Projection.schema;
  if (!same(persistedV1Projection, canonicalV2Projection))
    throw new Error('Persisted native mutation proof differs from the canonical exhaustive semantic join.');
  if (report.mutants !== canonical.mutants.length || report.killed !== canonical.mutants.length)
    throw new Error('Candidate report counts differ from the complete canonical proof.');
  return { report, proof: canonical, validation_context: contextRef, descriptor, context };
}
