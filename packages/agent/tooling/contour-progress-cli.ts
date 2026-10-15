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
import { contourAttempts, mergeContourProgress, renderContourProgress } from './contour-progress.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { canonicalJson } from '../src/contracts/canonical-json-core.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';

const empty = { schema: 'VidaContourProgress/v1', attempts: [] };
const maximumBytes = 32 * 1024 * 1024;
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
    atomic(file, JSON.stringify(merged, null, 2) + '\n');
  }
}

/** Single final-check owner publishes after terminal producers; never called by build/install or a Git hook. */
export function runContourProgress(
  args: string[],
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
): void {
  let output = outputRoot(root);
  let snapshotPath: string | undefined;
  let commit = 'not-captured';
  let recordedAt = new Date().toISOString();
  const reports: string[] = [];
  const selections: { file: string; value: unknown }[] = [];
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    const value = args[++index];
    if (!value) throw new Error('Expected --report, --selection, --snapshot, --output, --commit or --at with a value.');
    if (name === '--report') reports.push(path.resolve(value));
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
  const incoming: ReturnType<typeof contourAttempts> = [];
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
  for (const file of reports)
    incoming.push(
      ...contourAttempts(withSelections(load(file), selections), { artifact: file, commit, recorded_at: recordedAt }),
    );
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
    }) + '\n',
  );
}
if (import.meta.main) runContourProgress(process.argv.slice(2));
