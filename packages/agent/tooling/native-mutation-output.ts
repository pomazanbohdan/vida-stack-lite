import { lstat, mkdir, open, opendir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { isRecord } from '../src/contracts/forward-controller-values.ts';
import { mutationArtifactByteLimit, readBoundedMutationArtifact } from './mutation-artifact-reader.ts';
import { durableCreateMutationEvidence, mutationRunnerEvidencePaths } from './mutation-command-runner.ts';
import { validCapturedOutput, type MutationProcessResult } from './mutation-evidence.ts';

/** Copy raw diagnostic evidence after native custody closes; this never confirms a kill. */
export async function publishNativeMutationOutput(input: {
  directory: string;
  outputRoot: string;
  partition: string;
  mutantId: string | null;
  processResult: MutationProcessResult;
}): Promise<void> {
  const { directory, outputRoot, partition, mutantId, processResult: result } = input;
  if (
    (result.exitCode !== 0 && (mutantId === null || result.exitCode !== 1)) ||
    result.timedOut ||
    result.signal !== null ||
    result.spawnError !== null ||
    result.processCustody?.scope !== 'owned-process-group' ||
    result.processCustody.terminationObserved !== true ||
    result.processCustody.processGroupTerminationObserved !== true ||
    result.output_capture?.complete !== true ||
    !validCapturedOutput(result.output_capture.stdout) ||
    !validCapturedOutput(result.output_capture.stderr)
  )
    throw new Error('Native output publication requires closed expected worker custody.');
  if (!/^[a-z0-9-]+$/u.test(partition) || !outputRoot.startsWith(directory + path.sep))
    throw new Error('Native output publication requires a private owned output root.');
  for (const root of [directory, outputRoot])
    if ((await realpath(root)) !== root || !(await lstat(root)).isDirectory())
      throw new Error('Native output publication directory is not canonical.');
  const paths = mutationRunnerEvidencePaths('', partition, mutantId ?? undefined);
  const files = new Map<string, Buffer>();
  const directories: string[] = [];
  let totalBytes = 0;
  let entries = 0;
  const capture = async (relative: string, allowEmpty = false) => {
    if (relative.length > 1024) throw new Error('Native adapter output path is outside its bound.');
    const bytes = await readBoundedMutationArtifact(
      path.dirname(path.join(outputRoot, relative)),
      path.basename(relative),
      undefined,
      allowEmpty,
    );
    totalBytes += bytes.length;
    if (totalBytes > mutationArtifactByteLimit)
      throw new Error('Native output publication exceeds its aggregate bound.');
    files.set(relative, bytes);
  };
  for (const [role, file] of Object.entries(paths))
    if (role !== 'adapterDirectory') await capture(file, role !== 'receipt' && role !== 'junit');
  const captureDirectory = async (relative: string, depth: number): Promise<void> => {
    const absolute = path.join(outputRoot, relative);
    if (
      depth > 8 ||
      relative.length > 1024 ||
      (await realpath(absolute)) !== absolute ||
      !(await lstat(absolute)).isDirectory()
    )
      throw new Error('Native adapter output directory is outside its bound or linked.');
    directories.push(relative);
    for await (const entry of await opendir(absolute)) {
      if (++entries > 4096) throw new Error('Native adapter output has too many entries.');
      const next = path.join(relative, entry.name);
      if (entry.isDirectory()) await captureDirectory(next, depth + 1);
      else if (entry.isFile()) await capture(next, true);
      else throw new Error('Native adapter output is not a regular file or directory.');
    }
  };
  await captureDirectory(paths.adapterDirectory, 0);
  // Capture the whole closure and reject collisions before the first canonical write.
  for (const relative of [...directories, ...files.keys()]) {
    try {
      await lstat(path.join(directory, relative));
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') continue;
      throw error;
    }
    throw new Error('Native output publication would overwrite existing evidence.');
  }
  for (const relative of directories) {
    const target = path.join(directory, relative);
    await mkdir(target, { mode: 0o700 });
    const parent = await open(path.dirname(target), 'r');
    try {
      await parent.sync();
    } finally {
      await parent.close();
    }
  }
  for (const [relative, bytes] of files) await durableCreateMutationEvidence(path.join(directory, relative), bytes);
}
