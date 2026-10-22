import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { lstatSync, mkdtempSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureSelectedSdkTestInputsFromCapturedBytes } from '../../packages/agent/tooling/sdk-artifact-capture.ts';
import {
  buildSdkTestInputsFromCapturedInputs,
  captureSdkFormationInputs,
} from '../../packages/agent/tooling/build-package.ts';
import { acquireCoverageRunLock, releaseCoverageRunLock } from '../../packages/agent/tooling/coverage-run-lock.ts';
import { ownedDirectoryIdentity, removeOwnedDirectoryOrThrow } from '../../packages/agent/tooling/owned-staging.ts';
import { completeOwnedCleanup } from '../../packages/agent/tooling/owned-cleanup-completion.ts';
import { resourceDirectory } from '../../packages/agent/bin/standalone-resources.ts';
import { executionBudget } from '../../packages/agent/bin/bun.ts';
import {
  readQualityInputs,
  selectedTestsRequireSdkArtifacts,
} from '../../packages/agent/tooling/bun-coverage-evidence.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageRoot = path.join(repositoryRoot, 'packages/agent');
const maxFiles = 20_000;
const maxBytes = 128 * 1024 * 1024;

function remaining(remainingMs: () => number): number {
  const value = remainingMs();
  if (!Number.isFinite(value) || value <= 0) throw new Error('SDK test-input preparation budget is spent.');
  return Math.max(1, Math.floor(value));
}

async function readCandidateDist(root: string, remainingMs: () => number): Promise<Map<string, Buffer>> {
  const dist = path.join(root, 'dist');
  const rootStat = lstatSync(dist, { throwIfNoEntry: false });
  if (!rootStat || !rootStat.isDirectory() || rootStat.isSymbolicLink())
    throw new Error('SDK test-input dist is unavailable or unsafe.');
  const files: string[] = [];
  let totalBytes = 0;
  let entryCount = 0;
  const visit = (directory: string, relative: string, depth: number): void => {
    remaining(remainingMs);
    if (depth > 64) throw new Error('SDK test-input dist exceeds its path bound.');
    const before = files.length;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (++entryCount > maxFiles) throw new Error('SDK test-input dist exceeds its path bound.');
      const absolute = path.join(directory, entry.name);
      const pathname = `${relative}/${entry.name}`;
      const metadata = lstatSync(absolute);
      if (entry.isSymbolicLink() || metadata.isSymbolicLink())
        throw new Error('SDK test-input dist contains a symbolic link.');
      if (entry.isDirectory()) {
        visit(absolute, pathname, depth + 1);
      } else if (entry.isFile()) {
        totalBytes += metadata.size;
        if (files.length >= maxFiles || !Number.isSafeInteger(totalBytes) || totalBytes > maxBytes)
          throw new Error('SDK test-input dist exceeds its size bound.');
        files.push(pathname);
      } else throw new Error('SDK test-input dist contains a non-regular entry.');
    }
    if (relative !== 'dist' && before === files.length)
      throw new Error('SDK test-input dist contains an undeclared empty directory.');
  };
  visit(dist, 'dist', 0);
  const result = await readQualityInputs(
    root,
    files.sort((left, right) => left.localeCompare(right)),
  );
  let actualBytes = 0;
  for (const bytes of result.values()) {
    remaining(remainingMs);
    actualBytes += bytes.length;
    if (!Number.isSafeInteger(actualBytes) || actualBytes > maxBytes)
      throw new Error('SDK test-input dist exceeds its actual byte bound.');
  }
  return result;
}

function writeStageFile(stage: string, relative: string, bytes: Buffer): void {
  if (
    !relative.startsWith('dist/') ||
    /[\\:\p{Cc}]/u.test(relative) ||
    relative.split('/').some((part) => part === '' || part === '.' || part === '..')
  )
    throw new Error('SDK test-input staging path is unsafe.');
  const destination = path.join(stage, ...relative.split('/'));
  resourceDirectory(path.dirname(destination), true);
  writeFileSync(destination, Buffer.from(bytes), { flag: 'wx', mode: 0o600 });
}

/** Atomically replace the canonical SDK dist with one already-validated candidate. */
export async function publishSdkTestInputs(
  root: string,
  files: ReadonlyMap<string, Buffer>,
  remainingMs: () => number,
): Promise<void> {
  const rootIdentity = ownedDirectoryIdentity(root);
  const temporaryRoot = path.join(root, 'coverage/sdk-test-inputs');
  resourceDirectory(temporaryRoot, true);
  const temporaryIdentity = ownedDirectoryIdentity(temporaryRoot);
  const stage = mkdtempSync(path.join(temporaryRoot, 'sdk-test-inputs-'));
  const stageIdentity = ownedDirectoryIdentity(stage);
  const stagedDist = path.join(stage, 'dist');
  resourceDirectory(stagedDist, true);
  const stagedDistIdentity = ownedDirectoryIdentity(stagedDist);
  const dist = path.join(root, 'dist');
  const backup = path.join(temporaryRoot, `sdk-test-inputs-prior-dist-${randomUUID()}`);
  let movedPrevious = false;
  let previousIdentity: ReturnType<typeof ownedDirectoryIdentity> | undefined;
  let publishedIdentity: ReturnType<typeof ownedDirectoryIdentity> | undefined;
  try {
    let index = 0;
    for (const [relative, bytes] of files) {
      if ((index++ & 31) === 0) remaining(remainingMs);
      writeStageFile(stage, relative, bytes);
    }
    remaining(remainingMs);
    const stagedFiles = await readCandidateDist(stage, remainingMs);
    if (stagedFiles.size !== files.size || [...files].some(([file, bytes]) => !stagedFiles.get(file)?.equals(bytes)))
      throw new Error('Staged SDK test-input bytes differ from the validated candidate.');
    const priorExists = lstatSync(dist, { throwIfNoEntry: false }) !== undefined;
    const priorIdentity = priorExists ? ownedDirectoryIdentity(dist) : undefined;
    previousIdentity = priorIdentity;
    for (const [directory, identity] of [
      [root, rootIdentity],
      [temporaryRoot, temporaryIdentity],
      [stage, stageIdentity],
      [stagedDist, stagedDistIdentity],
    ] as const)
      assert.deepEqual(ownedDirectoryIdentity(directory), identity, 'SDK test-input staging identity changed.');
    if (priorIdentity) {
      const currentPrior = ownedDirectoryIdentity(dist);
      if (currentPrior.dev !== priorIdentity.dev || currentPrior.ino !== priorIdentity.ino)
        throw new Error('Existing SDK dist changed before publication.');
      renameSync(dist, backup);
      movedPrevious = true;
      const backupIdentity = ownedDirectoryIdentity(backup);
      if (backupIdentity.dev !== priorIdentity.dev || backupIdentity.ino !== priorIdentity.ino)
        throw new Error('Retained SDK dist backup identity changed.');
    }
    if (lstatSync(dist, { throwIfNoEntry: false }))
      throw new Error('SDK dist destination reappeared before publication.');
    publishedIdentity = stagedDistIdentity;
    renameSync(stagedDist, dist);
    const currentPublished = ownedDirectoryIdentity(dist);
    if (currentPublished.dev !== stagedDistIdentity.dev || currentPublished.ino !== stagedDistIdentity.ino)
      throw new Error('Published SDK dist differs from its owned stage.');
    remaining(remainingMs);
  } catch (error) {
    const failures: unknown[] = [error];
    try {
      if (publishedIdentity && lstatSync(dist, { throwIfNoEntry: false })) {
        const current = ownedDirectoryIdentity(dist);
        if (current.dev === publishedIdentity.dev && current.ino === publishedIdentity.ino)
          renameSync(dist, stagedDist);
      }
      if (movedPrevious && !lstatSync(dist, { throwIfNoEntry: false })) {
        const retained = ownedDirectoryIdentity(backup);
        assert(
          previousIdentity && retained.dev === previousIdentity.dev && retained.ino === previousIdentity.ino,
          'Retained SDK dist backup changed before restoration.',
        );
        renameSync(backup, dist);
      }
    } catch (rollbackError) {
      failures.push(rollbackError);
    }
    process.emitWarning(`Retained failed SDK test-input stage: ${stage}`);
    if (failures.length > 1) throw new AggregateError(failures, 'SDK test-input publication and restoration failed');
    throw error;
  }
  try {
    completeOwnedCleanup([() => removeOwnedDirectoryOrThrow(stage, stageIdentity)]);
  } catch (error) {
    process.emitWarning(`Retained SDK test-input stage after publication: ${stage}`);
    throw error;
  }
}

async function ensureSdkCoverageInputs(input: {
  root: string;
  remainingMs: () => number;
  selectedInputs?: ReadonlyMap<string, Buffer>;
}): Promise<void> {
  const root = path.resolve(input.root);
  if (root !== packageRoot || !path.isAbsolute(input.root))
    throw new Error('SDK test-input preparation is bound to the VIDA agent package root.');
  remaining(input.remainingMs);
  if ((process.env.BUN_OPTIONS ?? '').trim())
    throw new Error('Ambient BUN_OPTIONS are unsupported for SDK preparation.');
  const lock = acquireCoverageRunLock(path.join(root, 'coverage/sdk-test-inputs'));
  let retainLock = false;
  let failure: { error: unknown } | undefined;
  try {
    const selectedInputs = input.selectedInputs ?? (await captureSdkFormationInputs(root));
    const ownedInputs = new Map([...selectedInputs].map(([file, bytes]) => [file, Buffer.from(bytes)]));
    let candidate: Map<string, Buffer> | undefined;
    let reused = false;
    try {
      const existing = await readCandidateDist(root, input.remainingMs);
      candidate = captureSelectedSdkTestInputsFromCapturedBytes(root, ownedInputs, existing);
      reused = true;
    } catch {
      remaining(input.remainingMs);
      try {
        candidate = await buildSdkTestInputsFromCapturedInputs(root, ownedInputs, input.remainingMs);
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'producerClosureObserved' in error &&
          error.producerClosureObserved === false
        )
          retainLock = true;
        throw error;
      }
    }
    if (!candidate) throw new Error('SDK test-input candidate is unavailable.');
    if (!reused) {
      remaining(input.remainingMs);
      await publishSdkTestInputs(root, candidate, input.remainingMs);
    }
  } catch (error) {
    failure = { error };
  }
  if (!retainLock) {
    try {
      releaseCoverageRunLock(lock);
    } catch (error) {
      failure = {
        error:
          failure === undefined
            ? error
            : new AggregateError([failure.error, error], 'SDK test-input operation and lock cleanup failed'),
      };
    }
  }
  if (failure !== undefined) throw failure.error;
}

/** Prepare only SDK-dependent selections; a pure selection returns before root access. */
export async function ensureSdkCoverageInputsForTests(input: {
  root: string;
  tests?: readonly string[];
  remainingMs?: (() => number) | undefined;
  selectedInputs?: ReadonlyMap<string, Buffer>;
}): Promise<void> {
  if (input.tests !== undefined && !selectedTestsRequireSdkArtifacts(input.tests)) return;
  const budget = input.remainingMs ? undefined : executionBudget(300_000, 30_000);
  await ensureSdkCoverageInputs({
    root: input.root,
    remainingMs: input.remainingMs ?? (() => budget!.remaining()),
    ...(input.selectedInputs === undefined ? {} : { selectedInputs: input.selectedInputs }),
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('SDK test-input preparation does not accept arguments.');
  await ensureSdkCoverageInputsForTests({ root: packageRoot });
  console.log('SDK test-input preparation completed.');
}
