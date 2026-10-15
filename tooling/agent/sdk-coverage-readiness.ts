import { Buffer } from 'node:buffer';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { lstatSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeSdkFormationReceipt } from '../../packages/agent/tooling/sdk-artifact-capture.ts';
import { expectedJavascriptFiles } from '../../packages/agent/tooling/maintained-source-inventory.ts';
import { ownedDirectoryIdentity, removeOwnedDirectoryOrThrow } from '../../packages/agent/tooling/owned-staging.ts';
import { resourceDirectory } from '../../packages/agent/bin/standalone-resources.ts';
import { readQualityInputs } from '../../packages/agent/tooling/bun-coverage-evidence.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageRoot = path.join(repositoryRoot, 'packages/agent');
const repository = 'pomazanbohdan/vida-stack-lite';
const repositoryId = 1340911900;
const workflowPath = '.github/workflows/agent-sdk-coverage.yml';
const workflowJob = 'form-sdk-inputs';
const receiptPath = 'dist/sdk-formation.json';
const localReceiptPath = 'dist/sdk-test-input-download.v1.json';
const archiveLimit = 64 * 1024 * 1024;
const receiptLimit = 8 * 1024 * 1024;
const expansionLimit = 128 * 1024 * 1024;
const outputCountLimit = 20_000;
const zipMemberLimit = 20_010;

type OutputRow = { path: string; bytes: number; sha256: string };
type JsonRecord = Record<string, unknown>;
type DownloadReceipt = {
  schema: 'SdkCoverageDownload/v1';
  source_commit: string;
  run_id: number;
  run_attempt: number;
  artifact_id: number;
  artifact_digest: string;
  artifact_name: string;
  sdk_receipt_sha256: string;
  outputs: OutputRow[];
};
type ArchiveEntry = {
  name: string;
  dir: boolean;
  unixPermissions?: number | null;
  _data?: { uncompressedSize?: unknown };
  nodeStream?: () => NodeJS.ReadableStream;
  async(type: 'nodebuffer'): Promise<Buffer>;
};

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function safeRelative(value: unknown, prefix = ''): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(prefix) &&
    !/[\\:\p{Cc}]/u.test(value) &&
    !path.posix.isAbsolute(value) &&
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
  );
}

function outputRows(value: unknown): OutputRow[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > outputCountLimit)
    throw new Error('SDK test-input output inventory is invalid.');
  const seen = new Set<string>();
  let total = 0;
  const rows = value.map((entry): OutputRow => {
    if (
      !isRecord(entry) ||
      Object.keys(entry).sort().join(',') !== 'bytes,path,sha256' ||
      !safeRelative(entry.path, 'dist/') ||
      entry.path === receiptPath ||
      !Number.isSafeInteger(entry.bytes) ||
      (entry.bytes as number) < 0 ||
      !isDigest(entry.sha256) ||
      seen.has(entry.path)
    )
      throw new Error('SDK test-input output entry is invalid or duplicated.');
    seen.add(entry.path);
    total += entry.bytes as number;
    if (!Number.isSafeInteger(total) || total > expansionLimit)
      throw new Error('SDK test-input archive expansion exceeds its bound.');
    return { path: entry.path, bytes: entry.bytes as number, sha256: entry.sha256 };
  });
  for (let index = 1; index < rows.length; index++)
    if ((rows[index - 1]?.path ?? '').localeCompare(rows[index]?.path ?? '') >= 0)
      throw new Error('SDK test-input output inventory is not canonical.');
  const required = expectedJavascriptFiles.map((file) => `dist/src/${file}`);
  const javascript = rows.filter((row) => row.path.endsWith('.js'));
  if (javascript.length !== required.length || required.some((file) => !seen.has(file)))
    throw new Error('SDK test-input JavaScript outputs are incomplete or unexpected.');
  return rows;
}

function sdkReceipt(
  value: unknown,
  identity: { version: string; bunVersion: string },
): {
  value: JsonRecord;
  outputs: OutputRow[];
} {
  const decoded = decodeSdkFormationReceipt(value);
  if (
    decoded.value.schema !== 'CandidateSdkTestInputs/v1' ||
    decoded.value.purpose !== 'development-tests' ||
    decoded.value.version !== identity.version ||
    decoded.value.bun_version !== identity.bunVersion ||
    typeof decoded.value.declared_node_engine !== 'string' ||
    !Array.isArray(decoded.value.production_entrypoints) ||
    decoded.value.production_entrypoints.length !== 2 ||
    decoded.value.production_entrypoints[0] !== 'dist/src/index.js' ||
    decoded.value.production_entrypoints[1] !== 'dist/src/trusted-host.js'
  )
    throw new Error('SDK test-input formation receipt identity is invalid.');
  return { value: decoded.value, outputs: outputRows(decoded.outputs) };
}

async function qualifiedZipReader() {
  const release = await import('./release-ci-evidence.ts');
  return release.qualifiedZIPReader(repositoryRoot);
}

function archiveEntry(value: unknown): ArchiveEntry {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    typeof value.dir !== 'boolean' ||
    typeof value.async !== 'function'
  )
    throw new Error('SDK test-input archive member metadata is invalid.');
  return value as ArchiveEntry;
}

function advertisedSize(entry: ArchiveEntry): number {
  const size = entry._data?.uncompressedSize;
  if (!Number.isSafeInteger(size) || (size as number) < 0)
    throw new Error('SDK test-input archive member size is unavailable.');
  return size as number;
}

async function readMember(entry: ArchiveEntry, maximum: number): Promise<Buffer> {
  const streamFactory = entry.nodeStream;
  if (typeof streamFactory !== 'function') throw new Error('SDK test-input archive stream is unavailable.');
  const stream = streamFactory.call(entry) as NodeJS.ReadableStream & { destroy(): void };
  const chunks: Buffer[] = [];
  let length = 0;
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk: Buffer | Uint8Array | string) => {
      if (typeof chunk === 'string') {
        reject(new Error('SDK test-input archive member is not binary.'));
        stream.destroy();
        return;
      }
      const bytes = Buffer.from(chunk);
      length += bytes.length;
      if (length > maximum) {
        reject(new Error('SDK test-input archive expansion exceeds its bound.'));
        stream.destroy();
        return;
      }
      chunks.push(bytes);
    });
    stream.on('error', () => reject(new Error('SDK test-input archive member could not be read.')));
    stream.on('end', resolve);
  });
  return Buffer.concat(chunks, length);
}

/** Parse and validate the bounded GitHub artifact ZIP before any filesystem write. */
export async function validateSdkTestArchive(
  archiveBytes: Buffer,
  identity: { version: string; bunVersion: string },
): Promise<Map<string, Buffer>> {
  if (!Buffer.isBuffer(archiveBytes) || archiveBytes.length > archiveLimit)
    throw new Error('SDK test-input archive exceeds its compressed-size bound.');
  if (
    !isRecord(identity) ||
    Object.keys(identity).sort().join(',') !== 'bunVersion,version' ||
    typeof identity.version !== 'string' ||
    !identity.version ||
    typeof identity.bunVersion !== 'string' ||
    !identity.bunVersion
  )
    throw new Error('SDK test-input expected identity is invalid.');
  const reader = await qualifiedZipReader();
  const zip = await reader.loadZipArchiveWithPreflight(archiveBytes, {
    maxArchiveBytes: archiveLimit,
    maxEntries: zipMemberLimit,
    maxExtractedBytes: expansionLimit,
    maxEntryBytes: expansionLimit,
  });
  const members = Object.entries(zip.files);
  if (members.length === 0 || members.length > zipMemberLimit)
    throw new Error('SDK test-input archive member count is invalid.');
  const files = new Map<string, ArchiveEntry>();
  const directories = new Set<string>();
  for (const [name, raw] of members) {
    const entry = archiveEntry(raw);
    const memberName = entry.dir && name.endsWith('/') ? name.slice(0, -1) : name;
    if (!safeRelative(memberName)) throw new Error('SDK test-input archive member path is unsafe.');
    const unixMode = typeof entry.unixPermissions === 'number' ? entry.unixPermissions & 0xffff : undefined;
    if (unixMode !== undefined && (unixMode & 0o170000) === 0o120000)
      throw new Error('SDK test-input archive contains a symbolic link.');
    if (entry.dir) {
      directories.add(memberName);
      continue;
    }
    if (unixMode !== undefined && (unixMode & 0o170000) !== 0 && (unixMode & 0o170000) !== 0o100000)
      throw new Error('SDK test-input archive contains a non-regular member.');
    if (files.has(memberName)) throw new Error('SDK test-input archive contains a duplicate member.');
    files.set(memberName, entry);
  }
  const receiptEntry = files.get('sdk-formation.json');
  if (!receiptEntry || advertisedSize(receiptEntry) > receiptLimit)
    throw new Error('SDK test-input formation receipt is missing or too large.');
  const receiptBytes = await readMember(receiptEntry, receiptLimit);
  if (receiptBytes.length !== advertisedSize(receiptEntry))
    throw new Error('SDK test-input formation receipt size differs from ZIP metadata.');
  let decoded: unknown;
  try {
    decoded = JSON.parse(receiptBytes.toString('utf8')) as unknown;
  } catch {
    throw new Error('SDK test-input formation receipt is not valid JSON.');
  }
  const parsed = sdkReceipt(decoded, identity);
  const expected = new Set(['sdk-formation.json', ...parsed.outputs.map((entry) => entry.path.slice(5))]);
  if (files.size !== expected.size || [...files.keys()].some((name) => !expected.has(name)))
    throw new Error('SDK test-input archive member set differs from its receipt.');
  for (const directory of directories) {
    const prefix = `${directory}/`;
    if (![...expected].some((name) => name.startsWith(prefix)))
      throw new Error('SDK test-input archive contains an unexpected directory.');
  }
  let expanded = receiptBytes.length;
  const result = new Map<string, Buffer>([[receiptPath, receiptBytes]]);
  for (const row of parsed.outputs) {
    const name = row.path.slice(5);
    const entry = files.get(name);
    if (!entry || advertisedSize(entry) !== row.bytes)
      throw new Error('SDK test-input archive output size differs from its receipt: ' + row.path);
    const bytes = await readMember(entry, Math.min(row.bytes, expansionLimit - expanded));
    expanded += bytes.length;
    if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256)
      throw new Error('SDK test-input output differs from its receipt: ' + row.path);
    result.set(row.path, bytes);
  }
  return result;
}

function remaining(timeout: () => number): number {
  const value = timeout();
  if (!Number.isFinite(value) || value <= 0) throw new Error('SDK test-input preparation budget is spent.');
  return Math.max(1, Math.min(10_000, Math.floor(value)));
}

function command(
  executable: string,
  args: string[],
  cwd: string,
  remainingMs: () => number,
  maxBuffer: number,
): Promise<Buffer> {
  const timeout = remaining(remainingMs);
  return new Promise((resolve, reject) => {
    execFile(executable, args, { cwd, encoding: 'buffer', timeout, maxBuffer, windowsHide: true }, (error, stdout) => {
      if (error) {
        reject(new Error(`${executable} did not return a bounded successful result.`));
        return;
      }
      if (!Buffer.isBuffer(stdout) || stdout.length > maxBuffer) {
        reject(new Error(`${executable} output exceeded its bound.`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function cleanHead(remainingMs: () => number): Promise<string> {
  const output = await command(
    'git',
    ['-C', repositoryRoot, 'rev-parse', '--show-toplevel', 'HEAD'],
    packageRoot,
    remainingMs,
    64 * 1024,
  );
  const [top, head, extra] = output.toString('utf8').trimEnd().split(/\r?\n/u);
  if (!top || !head || extra !== undefined || path.resolve(top) !== repositoryRoot || !/^[0-9a-f]{40}$/u.test(head))
    throw new Error('SDK test-input preparation requires a repository-root full Git HEAD.');
  const status = await command(
    'git',
    ['-C', repositoryRoot, 'status', '--porcelain=v1', '--untracked-files=all', '--', 'packages/agent'],
    packageRoot,
    remainingMs,
    1024 * 1024,
  );
  if (status.length !== 0) throw new Error('SDK test-input preparation requires clean package Source at Git HEAD.');
  return head;
}

function parseApiJson(bytes: Buffer, label: string): unknown {
  try {
    return JSON.parse(bytes.toString('utf8')) as unknown;
  } catch {
    throw new Error(`GitHub returned invalid ${label} JSON.`);
  }
}

async function ghJson(root: string, endpoint: string, remainingMs: () => number): Promise<unknown> {
  const bytes = await command(
    'gh',
    ['api', '--hostname', 'github.com', '--method', 'GET', endpoint],
    root,
    remainingMs,
    2 * 1024 * 1024,
  );
  return parseApiJson(bytes, 'SDK test-input');
}

function apiTime(value: unknown): number {
  if (typeof value !== 'string') return Number.NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.NaN;
}

function positiveId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function parseDownloadReceipt(value: unknown): DownloadReceipt | undefined {
  const keys = [
    'artifact_digest',
    'artifact_id',
    'artifact_name',
    'outputs',
    'run_attempt',
    'run_id',
    'schema',
    'sdk_receipt_sha256',
    'source_commit',
  ];
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(',') !== [...keys].sort().join(',') ||
    value.schema !== 'SdkCoverageDownload/v1' ||
    typeof value.source_commit !== 'string' ||
    !/^[0-9a-f]{40}$/u.test(value.source_commit) ||
    !positiveId(value.run_id) ||
    !positiveId(value.run_attempt) ||
    !positiveId(value.artifact_id) ||
    typeof value.artifact_name !== 'string' ||
    typeof value.artifact_digest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/u.test(value.artifact_digest) ||
    !isDigest(value.sdk_receipt_sha256)
  )
    return undefined;
  let outputs: OutputRow[];
  try {
    outputs = outputRows(value.outputs);
  } catch {
    return undefined;
  }
  return {
    schema: 'SdkCoverageDownload/v1',
    source_commit: value.source_commit,
    run_id: value.run_id,
    run_attempt: value.run_attempt,
    artifact_id: value.artifact_id,
    artifact_digest: value.artifact_digest,
    artifact_name: value.artifact_name,
    sdk_receipt_sha256: value.sdk_receipt_sha256,
    outputs,
  };
}

function readRegularFile(root: string, relative: string, maximum: number): Buffer | undefined {
  const file = path.join(root, ...relative.split('/'));
  try {
    let parent = root;
    const parts = relative.split('/');
    for (const part of parts.slice(0, -1)) {
      parent = path.join(parent, part);
      const parentStats = lstatSync(parent);
      if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) return undefined;
    }
    const stats = lstatSync(file);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.size > maximum) return undefined;
    const bytes = readFileSync(file);
    return bytes.length <= maximum ? bytes : undefined;
  } catch {
    return undefined;
  }
}

async function fetchCurrentArtifact(
  root: string,
  head: string,
  remainingMs: () => number,
  archivePath?: string,
): Promise<{
  archive: Buffer;
  receipt: Omit<DownloadReceipt, 'sdk_receipt_sha256' | 'outputs'>;
}> {
  const query = new URLSearchParams({
    head_sha: head,
    per_page: '100',
    direction: 'desc',
    sort: 'created',
  });
  const runResponse = await ghJson(
    root,
    `repos/${repository}/actions/workflows/agent-sdk-coverage.yml/runs?${query.toString()}`,
    remainingMs,
  );
  if (
    !isRecord(runResponse) ||
    !Array.isArray(runResponse.workflow_runs) ||
    !Number.isSafeInteger(runResponse.total_count) ||
    runResponse.total_count !== runResponse.workflow_runs.length ||
    runResponse.workflow_runs.length > 100
  )
    throw new Error('GitHub workflow-run response is incomplete or invalid.');
  const runs: JsonRecord[] = runResponse.workflow_runs.filter(
    (entry: unknown): entry is JsonRecord =>
      isRecord(entry) &&
      (entry.path === workflowPath || entry.path === `${workflowPath}@refs/heads/main`) &&
      entry.head_sha === head &&
      entry.head_branch === 'main' &&
      ['push', 'workflow_dispatch'].includes(String(entry.event)) &&
      isRecord(entry.repository) &&
      entry.repository.full_name === repository &&
      entry.repository.id === repositoryId,
  );
  const run = runs[0];
  if (!run || !positiveId(run.id) || !positiveId(run.run_attempt))
    throw new Error('No current-commit SDK input workflow run is available.');
  if (run.status !== 'completed' || run.conclusion !== 'success')
    throw new Error(
      `Current SDK input workflow https://github.com/${repository}/actions/runs/${run.id} is not a terminal success.`,
    );
  const started = apiTime(run.run_started_at);
  const completed = apiTime(run.updated_at);
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started)
    throw new Error('The current-commit SDK workflow interval is invalid.');
  const jobsResponse = await ghJson(
    root,
    `repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
    remainingMs,
  );
  if (
    !isRecord(jobsResponse) ||
    !Array.isArray(jobsResponse.jobs) ||
    !Number.isSafeInteger(jobsResponse.total_count) ||
    jobsResponse.total_count !== jobsResponse.jobs.length ||
    jobsResponse.jobs.length > 100
  )
    throw new Error('GitHub SDK workflow-job response is incomplete or invalid.');
  const matchingJobs = jobsResponse.jobs.filter(
    (entry: unknown): entry is JsonRecord =>
      isRecord(entry) && entry.name === workflowJob && entry.run_id === run.id && entry.run_attempt === run.run_attempt,
  );
  if (matchingJobs.length !== 1) throw new Error('The SDK input workflow has no unique formation job.');
  const job = matchingJobs[0];
  if (!job || job.status !== 'completed' || job.conclusion !== 'success')
    throw new Error('The SDK input formation job is not a terminal success.');
  const jobStarted = apiTime(job.started_at);
  const jobCompleted = apiTime(job.completed_at);
  if (
    !Number.isFinite(jobStarted) ||
    !Number.isFinite(jobCompleted) ||
    jobCompleted < jobStarted ||
    jobStarted < started ||
    jobCompleted > completed
  )
    throw new Error('The SDK formation job interval is invalid.');
  const artifactsResponse = await ghJson(
    root,
    `repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`,
    remainingMs,
  );
  if (
    !isRecord(artifactsResponse) ||
    !Array.isArray(artifactsResponse.artifacts) ||
    !Number.isSafeInteger(artifactsResponse.total_count) ||
    artifactsResponse.total_count !== artifactsResponse.artifacts.length ||
    artifactsResponse.artifacts.length > 100
  )
    throw new Error('GitHub SDK artifact response is incomplete or invalid.');
  const name = `vida-sdk-test-inputs-${head}-${run.id}-${run.run_attempt}`;
  const artifacts = artifactsResponse.artifacts.filter(
    (entry: unknown): entry is JsonRecord => isRecord(entry) && entry.name === name,
  );
  if (artifacts.length !== 1) throw new Error('The current SDK workflow has no unique test-input artifact.');
  const artifact = artifacts[0];
  const workflowRun = artifact && isRecord(artifact.workflow_run) ? artifact.workflow_run : undefined;
  if (
    !artifact ||
    !positiveId(artifact.id) ||
    artifact.expired !== false ||
    !Number.isSafeInteger(artifact.size_in_bytes) ||
    (artifact.size_in_bytes as number) < 1 ||
    (artifact.size_in_bytes as number) > archiveLimit ||
    typeof artifact.digest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/u.test(artifact.digest) ||
    !workflowRun ||
    workflowRun.id !== run.id ||
    workflowRun.head_sha !== head ||
    workflowRun.head_repository_id !== repositoryId ||
    workflowRun.repository_id !== repositoryId
  )
    throw new Error('The current SDK test-input artifact identity is invalid.');
  const artifactCreated = apiTime(artifact.created_at);
  const artifactExpires = apiTime(artifact.expires_at);
  if (
    !Number.isFinite(artifactCreated) ||
    artifactCreated < jobStarted ||
    artifactCreated > jobCompleted ||
    !Number.isFinite(artifactExpires) ||
    artifactExpires <= Date.now()
  )
    throw new Error('The SDK test-input artifact is outside the formation job interval or expired.');
  let archive: Buffer;
  const transportIdentity = `run ${run.id}, attempt ${run.run_attempt}, artifact ${artifact.id}`;
  if (archivePath !== undefined) {
    if (!path.isAbsolute(archivePath)) throw new Error('SDK transport archive path must be absolute.');
    const captured = await readQualityInputs(path.dirname(archivePath), [path.basename(archivePath)]);
    const bytes = captured.get(path.basename(archivePath));
    if (!bytes) throw new Error('SDK transport archive was not captured.');
    archive = bytes;
  } else {
    archive = await command(
      'gh',
      [
        'api',
        '--hostname',
        'github.com',
        '--method',
        'GET',
        `repos/${repository}/actions/artifacts/${artifact.id}/zip`,
      ],
      root,
      remainingMs,
      archiveLimit,
    ).catch((cause: unknown) => {
      throw new Error(
        `SDK ZIP transport unavailable for ${transportIdentity}. Use the selected connector transport and VIDA_SDK_TEST_INPUT_ARCHIVE; integrity checks remain required.`,
        { cause },
      );
    });
  }
  assertSdkArtifactDigest(archive, artifact.digest);
  return {
    archive,
    receipt: {
      schema: 'SdkCoverageDownload/v1',
      source_commit: head,
      run_id: run.id,
      run_attempt: run.run_attempt,
      artifact_id: artifact.id,
      artifact_digest: artifact.digest,
      artifact_name: name,
    },
  };
}

function parseVersionPin(root: string): { version: string; bunVersion: string } {
  const manifestBytes = readRegularFile(root, 'package.json', 1024 * 1024);
  const pinBytes = readRegularFile(root, '.bun-version', 128);
  if (!manifestBytes || !pinBytes) throw new Error('SDK test-input package manifest or Bun pin is unavailable.');
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8')) as unknown;
  } catch {
    throw new Error('SDK test-input package manifest is invalid.');
  }
  if (!isRecord(manifest) || typeof manifest.version !== 'string' || !isRecord(manifest.engines))
    throw new Error('SDK test-input package manifest identity is invalid.');
  const bunVersion = pinBytes.toString('utf8').trim();
  if (!bunVersion) throw new Error('SDK test-input Bun pin is invalid.');
  return { version: manifest.version, bunVersion };
}

function currentSidecar(root: string, head: string, identity: { version: string; bunVersion: string }): boolean {
  const bytes = readRegularFile(root, localReceiptPath, 8 * 1024 * 1024);
  if (!bytes) return false;
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8')) as unknown;
  } catch {
    return false;
  }
  const receipt = parseDownloadReceipt(value);
  if (!receipt || receipt.source_commit !== head) return false;
  const sdkBytes = readRegularFile(root, receiptPath, receiptLimit);
  if (!sdkBytes || sha256(sdkBytes) !== receipt.sdk_receipt_sha256) return false;
  let sdkValue: unknown;
  try {
    sdkValue = JSON.parse(sdkBytes.toString('utf8')) as unknown;
  } catch {
    return false;
  }
  let parsed: ReturnType<typeof sdkReceipt>;
  try {
    parsed = sdkReceipt(sdkValue, identity);
  } catch {
    return false;
  }
  if (JSON.stringify(parsed.outputs) !== JSON.stringify(receipt.outputs)) return false;
  for (const row of parsed.outputs) {
    const fileBytes = readRegularFile(root, row.path, row.bytes);
    if (!fileBytes || fileBytes.length !== row.bytes || sha256(fileBytes) !== row.sha256) return false;
  }
  return receipt.artifact_name === `vida-sdk-test-inputs-${head}-${receipt.run_id}-${receipt.run_attempt}`;
}

function writeStageFile(stage: string, relative: string, bytes: Buffer): void {
  if (!safeRelative(relative, 'dist/')) throw new Error('SDK test-input staging path is unsafe.');
  const destination = path.join(stage, ...relative.split('/'));
  const parent = path.dirname(destination);
  resourceDirectory(parent, true);
  writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
}

export function publishSdkTestInputs(
  root: string,
  files: ReadonlyMap<string, Buffer>,
  receipt: DownloadReceipt,
  remainingMs: () => number,
): void {
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
  try {
    let index = 0;
    for (const [relative, bytes] of files) {
      if ((index++ & 31) === 0) remaining(remainingMs);
      writeStageFile(stage, relative, bytes);
    }
    writeStageFile(stage, localReceiptPath, Buffer.from(JSON.stringify(receipt) + '\n'));
    remaining(remainingMs);
    const priorExists = lstatSync(dist, { throwIfNoEntry: false }) !== undefined;
    const priorIdentity = priorExists ? ownedDirectoryIdentity(dist) : undefined;
    for (const [directory, identity] of [
      [root, rootIdentity],
      [temporaryRoot, temporaryIdentity],
      [stage, stageIdentity],
      [stagedDist, stagedDistIdentity],
    ] as const)
      assert.deepEqual(ownedDirectoryIdentity(directory), identity, 'SDK test-input owned staging identity changed.');
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
    renameSync(stagedDist, dist);
    const publishedIdentity = ownedDirectoryIdentity(dist);
    if (publishedIdentity.dev !== stagedDistIdentity.dev || publishedIdentity.ino !== stagedDistIdentity.ino)
      throw new Error('Published SDK dist differs from its owned stage.');
  } catch (error) {
    let failure = error;
    try {
      if (movedPrevious && !lstatSync(dist, { throwIfNoEntry: false })) renameSync(backup, dist);
    } catch (rollbackError) {
      failure = new AggregateError([error, rollbackError], 'SDK test-input publication and restoration both failed');
    }
    process.emitWarning(`Retained failed SDK test-input stage: ${stage}`);
    throw failure;
  }
  try {
    removeOwnedDirectoryOrThrow(stage, stageIdentity);
  } catch {
    process.emitWarning(`Retained SDK test-input stage after publication: ${stage}`);
  }
}

export function assertSdkArtifactDigest(archive: Buffer, expected: string): void {
  if (archive.length === 0 || archive.length > archiveLimit || `sha256:${sha256(archive)}` !== expected)
    throw new Error('The downloaded SDK test-input ZIP differs from the API artifact digest.');
}

export async function ensureSdkCoverageInputs(input: {
  root: string;
  remainingMs: () => number;
  archivePath?: string | undefined;
}): Promise<void> {
  const root = path.resolve(input.root);
  if (root !== packageRoot || !path.isAbsolute(input.root))
    throw new Error('SDK test-input preparation is bound to the VIDA agent package root.');
  const head = await cleanHead(input.remainingMs);
  const identity = parseVersionPin(root);
  if (currentSidecar(root, head, identity)) return;
  const fetched = await fetchCurrentArtifact(root, head, input.remainingMs, input.archivePath);
  const files = await validateSdkTestArchive(fetched.archive, identity);
  const sdkBytes = files.get(receiptPath);
  if (!sdkBytes) throw new Error('Validated SDK test-input receipt is missing.');
  const parsed = sdkReceipt(JSON.parse(sdkBytes.toString('utf8')) as unknown, identity);
  publishSdkTestInputs(
    root,
    files,
    {
      ...fetched.receipt,
      sdk_receipt_sha256: sha256(sdkBytes),
      outputs: parsed.outputs,
    },
    input.remainingMs,
  );
}
