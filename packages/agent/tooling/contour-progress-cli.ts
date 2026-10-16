import { randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contourAttempts,
  mergeContourProgress,
  nativeMutationAttempt,
  renderContourProgress,
} from './contour-progress.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';
import { readBoundedMutationArtifact, mutationArtifactByteLimit } from './mutation-artifact-reader.ts';
import { mutationPartitions } from './mutation-partitions.ts';
import { readNativeMutationPartitionProof } from './native-mutation-proof-reader.ts';

const empty = { schema: 'VidaContourProgress/v1', attempts: [] };
const maximumBytes = 32 * 1024 * 1024;
const fatalDecoder = new TextDecoder('utf-8', { fatal: true });
function load(file: string): unknown {
  const bytes = readFileSync(file);
  if (bytes.length > maximumBytes) throw new Error('Contour artifact exceeds byte bound: ' + file);
  const value: unknown = JSON.parse(bytes.toString('utf8'));
  return value;
}
function outputRoot(root: string): string {
  return path.join(root, 'coverage/bun-unified/contours');
}
function atomic(file: string, text: string): void {
  if (Buffer.byteLength(text) > maximumBytes) throw new Error('Contour publication exceeds byte bound.');
  const temporary = file + '.tmp-' + randomUUID();
  const fd = openSync(temporary, 'wx', 0o600);
  let failure: { error: unknown } | undefined;
  try {
    writeFileSync(fd, text);
    fsyncSync(fd);
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          closeSync(fd);
        },
      ],
      failure,
    );
  }
  renameSync(temporary, file);
  const directory = openSync(path.dirname(file), 'r');
  failure = undefined;
  try {
    fsyncSync(directory);
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          closeSync(directory);
        },
      ],
      failure,
    );
  }
}

/** Legacy terminal summaries omitted executed test paths; reuse their captured descriptor, never today's registry as evidence. */
function withSelections(value: unknown, selections: { file: string; value: unknown }[]): unknown {
  if (!isRecord(value) || !Array.isArray(value.partition_source_bindings)) return value;
  return {
    ...value,
    partition_source_bindings: value.partition_source_bindings.map((binding: unknown) => {
      if (!isRecord(binding) || Array.isArray(binding.tests)) return binding;
      const matches = selections.filter((item) => isRecord(item.value) && item.value.partition === binding.partition);
      if (!matches.length) return binding;
      if (matches.length !== 1) throw new Error('Ambiguous captured mutation selection.');
      const selected = matches[0]!;
      const descriptor = selected.value;
      if (
        !isRecord(descriptor) ||
        descriptor.schema !== 'MutationInputDescriptor/v3' ||
        ['input_fingerprint', 'test_fingerprint', 'tool_fingerprint'].some((key) => descriptor[key] !== value[key]) ||
        descriptor.partition_source_fingerprint !== binding.source_fingerprint ||
        canonicalJson(descriptor.partition_source_inputs) !== canonicalJson(binding.source_inputs) ||
        canonicalJson(descriptor.test_inputs) !== canonicalJson(value.test_inputs) ||
        canonicalJson(descriptor.tool_inputs) !== canonicalJson(value.tool_inputs)
      )
        throw new Error('Captured mutation selection differs from its terminal report.');
      return { ...binding, tests: descriptor.tests, test_selection_artifact: selected.file };
    }),
  };
}

/** Read a retained diagnostic/outcome pair without rescanning Source or promoting operation status. */
function coverageRun(file: string, report: unknown): { file: string; value: unknown } {
  if (
    !isRecord(report) ||
    report.schema !== 'VidaBunFocusedCoverageDiagnostic/v1' ||
    typeof report.run_id !== 'string' ||
    !/^[a-zA-Z0-9_-]+$/u.test(report.run_id) ||
    !isRecord(report.test_selection)
  )
    throw new Error('Expected a focused coverage diagnostic with a safe run identity.');
  const outcomeFile = path.join(path.dirname(file), 'operation-outcomes', report.run_id + '.json');
  const outcome = load(outcomeFile);
  const fingerprints = isRecord(outcome) ? outcome.input_fingerprints : undefined;
  if (
    !isRecord(outcome) ||
    outcome.schema !== 'VidaBunCoverageOperationOutcome/v1' ||
    outcome.run_id !== report.run_id ||
    !isRecord(outcome.selection) ||
    outcome.selection.contour !== report.test_selection.contour ||
    !isRecord(fingerprints) ||
    !['source', 'test', 'tool'].every((name) => {
      const fingerprint = report[name + '_fingerprint'];
      const key = name === 'source' ? 'source' : name + 's';
      return (
        typeof fingerprint === 'string' && /^[a-f0-9]{64}$/u.test(fingerprint) && fingerprints[key] === fingerprint
      );
    }) ||
    outcome.selection.fingerprint !== report.test_fingerprint
  )
    throw new Error('Coverage operation outcome differs from its diagnostic.');
  return { file: outcomeFile, value: outcome };
}

/** Producer output only: independent per-run files avoid a shared writer during frozen/parallel execution. */
export function recordContourReport(root: string, report: unknown, artifact: string): void {
  const attempts = contourAttempts(report, { artifact, commit: 'not-captured', recorded_at: new Date().toISOString() });
  const snapshot = mergeContourProgress(empty, attempts);
  const directory = path.join(outputRoot(root), 'observations');
  mkdirSync(directory, { recursive: true });
  for (const attempt of snapshot.attempts) {
    const name = [attempt.contour, attempt.lane, attempt.run_id].join('.');
    if (!/^[a-zA-Z0-9_.-]+$/u.test(name)) throw new Error('Unsafe contour observation identity.');
    const file = path.join(directory, name + '.json');
    // An identical replay is harmless; changed producer evidence for the same run is rejected.
    const before = existsSync(file) ? load(file) : empty;
    const merged = mergeContourProgress(before, [attempt]);
    if (canonicalJson(before) === canonicalJson(merged)) continue;
    atomic(file, JSON.stringify(merged, null, 2) + '\n');
  }
}

/** Single final-check owner publishes after terminal producers; never called by build/install or a Git hook. */
export function runContourProgress(
  args: string[],
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  qualifiedNativeAttempts: ReturnType<typeof contourAttempts> = [],
): void {
  let output = outputRoot(root);
  let snapshotPath: string | undefined;
  let commit = 'not-captured';
  let recordedAt = new Date().toISOString();
  const reports: { file: string; pair: boolean }[] = [];
  const selections: { file: string; value: unknown }[] = [];
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    const value = args[++index];
    if (!value)
      throw new Error(
        'Expected --report, --coverage-run, --selection, --snapshot, --output, --commit or --at with a value.',
      );
    if (name === '--report' || name === '--coverage-run')
      reports.push({ file: path.resolve(value), pair: name === '--coverage-run' });
    else if (name === '--selection') selections.push({ file: path.resolve(value), value: load(path.resolve(value)) });
    else if (name === '--snapshot') snapshotPath = path.resolve(value);
    else if (name === '--output') output = path.resolve(value);
    else if (name === '--commit') commit = value;
    else if (name === '--at') recordedAt = value;
    else throw new Error('Unknown contour option: ' + name);
  }
  const target = path.join(output, 'CONTOUR-STATUS.json');
  if (snapshotPath && !existsSync(snapshotPath)) throw new Error('Missing explicit contour snapshot: ' + snapshotPath);
  let snapshot = mergeContourProgress(existsSync(target) ? load(target) : empty, []);
  if (snapshotPath && snapshotPath !== target)
    snapshot = mergeContourProgress(snapshot, mergeContourProgress(load(snapshotPath), []).attempts);
  const incoming: ReturnType<typeof contourAttempts> = [...qualifiedNativeAttempts];
  const observations = path.join(outputRoot(root), 'observations');
  if (existsSync(observations)) {
    const names = readdirSync(observations)
      .filter((name) => name.endsWith('.json'))
      .sort();
    if (names.length > 10000) throw new Error('Contour observation count exceeds bound.');
    for (const name of names) {
      const observation = mergeContourProgress(load(path.join(observations, name)), []);
      incoming.push(...observation.attempts);
    }
  }
  const coverageRuns: unknown[] = [];
  for (const { file, pair } of reports) {
    const value = load(file);
    const attempts = contourAttempts(withSelections(value, selections), {
      artifact: file,
      commit,
      recorded_at: recordedAt,
    });
    incoming.push(...attempts);
    if (pair) {
      const outcome = coverageRun(file, value);
      const outcomeAttempts = contourAttempts(outcome.value, {
        artifact: outcome.file,
        commit,
        recorded_at: recordedAt,
      });
      incoming.push(...outcomeAttempts);
      for (const attempt of attempts)
        coverageRuns.push({
          contour: attempt.contour,
          run_id: attempt.run_id,
          coverage: attempt.coverage,
          max_cc: attempt.max_cc,
          max_entry_crap: attempt.max_entry_crap,
          operation_status: outcomeAttempts[0]!.status,
        });
    }
  }
  snapshot = mergeContourProgress(snapshot, incoming);
  const document = renderContourProgress(snapshot);
  mkdirSync(output, { recursive: true });
  atomic(target, JSON.stringify(snapshot, null, 2) + '\n');
  // JSON is the recoverable machine snapshot; Markdown is disposable and regenerated if publication was interrupted.
  atomic(path.join(output, 'CONTOUR-STATUS.md'), document);
  process.stdout.write(
    JSON.stringify({
      schema: snapshot.schema,
      attempts: snapshot.attempts.length,
      report: path.join(output, 'CONTOUR-STATUS.md'),
      ...(coverageRuns.length ? { coverage_runs: coverageRuns } : {}),
    }) + '\n',
  );
}

/** Native reports enter the synchronous publisher only after persisted-reader qualification. */
export async function runContourProgressWithNative(
  args: string[],
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
): Promise<void> {
  const nativeFiles: string[] = [];
  const ordinary: string[] = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--native-report') {
      const file = args[++index];
      if (!file) throw new Error('Expected --native-report with a value.');
      nativeFiles.push(path.resolve(file));
    } else ordinary.push(args[index]!);
  }
  const commitIndex = ordinary.lastIndexOf('--commit');
  const atIndex = ordinary.lastIndexOf('--at');
  const commit = commitIndex >= 0 ? (ordinary[commitIndex + 1] ?? 'not-captured') : 'not-captured';
  const recorded_at = atIndex >= 0 ? (ordinary[atIndex + 1] ?? new Date().toISOString()) : new Date().toISOString();
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const attempts: ReturnType<typeof contourAttempts> = [];
  for (const file of nativeFiles) {
    const bytes = await readBoundedMutationArtifact(path.dirname(file), path.basename(file), mutationArtifactByteLimit);
    const report: unknown = JSON.parse(fatalDecoder.decode(bytes));
    if (!isRecord(report) || !isRecord(report.binding) || typeof report.binding.partition !== 'string')
      throw new Error('Native report does not bind a declared partition.');
    const partitionName = report.binding.partition;
    const partition = mutationPartitions().find((row) => row.name === partitionName);
    if (!partition || partition.environment === 'static' || partition.environment === 'retired')
      throw new Error('Native report does not bind an active executable partition.');
    const read = await readNativeMutationPartitionProof({
      packageRoot,
      artifactDirectory: path.dirname(file),
      report,
      expectedPartition: partition,
    });
    attempts.push(nativeMutationAttempt(read, { artifact: file, commit, recorded_at }));
  }
  runContourProgress(ordinary, root, attempts);
}
if (import.meta.main) await runContourProgressWithNative(process.argv.slice(2));
