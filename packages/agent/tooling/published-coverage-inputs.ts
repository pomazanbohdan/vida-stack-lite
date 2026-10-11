import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { assertFixtureChildProof } from './fixture-child-observation.js';

export type PublishedFixtureIdentity = {
  readonly schema: 'PublishedCoverageFixture/v1';
  readonly commit: 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6';
  readonly directory: 'published-fixture';
  readonly inputs: readonly {
    readonly path: string;
    readonly mode: string;
    readonly blob_oid: string;
    readonly sha256: string;
  }[];
};

function fixturePath(file: string): boolean {
  return !/[\\\0:]/u.test(file) && !file.split('/').some((part) => part === '' || part === '.' || part === '..');
}

function fixtureRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Decode untrusted root metadata; its owner separately checks byte correspondence. */
export function parsePublishedFixtureIdentity(value: unknown): PublishedFixtureIdentity {
  if (
    !fixtureRecord(value) ||
    Object.keys(value).sort().join(',') !== 'commit,directory,inputs,schema' ||
    value.schema !== 'PublishedCoverageFixture/v1' ||
    value.commit !== 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6' ||
    value.directory !== 'published-fixture' ||
    !Array.isArray(value.inputs) ||
    !value.inputs.length
  )
    throw new Error('Published fixture root identity is invalid.');
  const rawInputs: unknown[] = value.inputs;
  const paths = new Set<string>();
  const inputs = rawInputs.map((entry) => {
    if (
      !fixtureRecord(entry) ||
      Object.keys(entry).sort().join(',') !== 'blob_oid,mode,path,sha256' ||
      typeof entry.path !== 'string' ||
      !fixturePath(entry.path) ||
      paths.has(entry.path) ||
      typeof entry.mode !== 'string' ||
      !['100644', '100755'].includes(entry.mode) ||
      typeof entry.blob_oid !== 'string' ||
      !/^[0-9a-f]{40}$/u.test(entry.blob_oid) ||
      typeof entry.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/u.test(entry.sha256)
    )
      throw new Error('Published fixture input identity is invalid.');
    paths.add(entry.path);
    return Object.freeze({ path: entry.path, mode: entry.mode, blob_oid: entry.blob_oid, sha256: entry.sha256 });
  });
  if (inputs.some((entry, index) => index > 0 && entry.path <= (inputs[index - 1]?.path ?? '')))
    throw new Error('Published fixture input identities are not canonical.');
  return Object.freeze({
    schema: value.schema,
    commit: value.commit,
    directory: value.directory,
    inputs: Object.freeze(inputs),
  });
}

/** Parent module-load proof only; this does not attest child execution or counters. */
export function assertPublishedFixtureProcess(
  expected: PublishedFixtureIdentity | undefined,
  receipt: unknown,
  requiredPaths: readonly string[],
): void {
  if (!fixtureRecord(receipt)) throw new Error('Published fixture process receipt is missing.');
  if (!expected) {
    if (receipt.published_fixture !== undefined || receipt.loaded_fixture_inputs !== undefined)
      throw new Error('Current coverage cannot adopt published fixture proof.');
    return;
  }
  const observed = parsePublishedFixtureIdentity(receipt.published_fixture);
  if (JSON.stringify(observed) !== JSON.stringify(expected) || !Array.isArray(receipt.loaded_fixture_inputs))
    throw new Error('Published fixture process belongs to another root or input set.');
  const inputDigests = new Map(expected.inputs.map((entry) => [entry.path, entry.sha256]));
  const seen = new Set<string>();
  const loaded: unknown[] = receipt.loaded_fixture_inputs;
  for (const entry of loaded) {
    if (
      !fixtureRecord(entry) ||
      Object.keys(entry).sort().join(',') !== 'path,root_id,sha256' ||
      entry.root_id !== 'published_fixture' ||
      typeof entry.path !== 'string' ||
      seen.has(entry.path) ||
      typeof entry.sha256 !== 'string' ||
      !inputDigests.has(entry.path) ||
      inputDigests.get(entry.path) !== entry.sha256
    )
      throw new Error('Published fixture loaded an unbound or duplicated input.');
    seen.add(entry.path);
  }
  for (const file of requiredPaths)
    if (!seen.has(file)) throw new Error('Published fixture required input was not loaded: ' + file);
}

/** Separate direct API observation from parent module loads and coverage. */
export function assertPublishedFixtureChildren(
  expected: PublishedFixtureIdentity | undefined,
  receipt: unknown,
  fixtureRoot?: string,
): void {
  if (!fixtureRecord(receipt)) throw new Error('Published fixture process receipt is missing.');
  if (!expected) {
    if (receipt.fixture_children !== undefined || fixtureRoot !== undefined)
      throw new Error('Current coverage cannot adopt published child observations.');
    return;
  }
  if (!fixtureRoot || !path.isAbsolute(fixtureRoot) || path.resolve(fixtureRoot) !== fixtureRoot)
    throw new Error('Published fixture child root is missing or noncanonical.');
  const requiredSubjects = [
    'tooling/coverage-gate.mjs',
    'tooling/crap-gate.mjs',
    'tooling/mutation-gate.mjs',
    'tooling/run-bun-native-coverage.mjs',
  ].map((file) => {
    const input = expected.inputs.find((entry) => entry.path === file);
    if (!input) throw new Error('Published fixture required subject input is missing: ' + file);
    return { path: path.join(fixtureRoot, file), sha256: input.sha256 };
  });
  if (
    typeof receipt.run_id !== 'string' ||
    typeof receipt.pid !== 'number' ||
    !Number.isSafeInteger(receipt.pid) ||
    receipt.pid < 1
  )
    throw new Error('Published fixture child parent identity is missing.');
  assertFixtureChildProof(receipt.fixture_children, {
    runId: receipt.run_id,
    parentPid: receipt.pid,
    fixtureFingerprint: createHash('sha256').update(JSON.stringify(expected)).digest('hex'),
    maxOutputBytes: 32 * 1024 * 1024,
  });
  const children: unknown[] =
    fixtureRecord(receipt.fixture_children) && Array.isArray(receipt.fixture_children.children)
      ? receipt.fixture_children.children
      : [];
  for (const subject of requiredSubjects) {
    if (
      !children.some(
        (child) =>
          fixtureRecord(child) &&
          fixtureRecord(child.entrypoint) &&
          child.entrypoint.kind === 'file' &&
          child.entrypoint.path === subject.path &&
          child.entrypoint.value_sha256 === subject.sha256,
      )
    )
      throw new Error('Published fixture subject entrypoint was not observed: ' + subject.path);
  }
}

/** Bind already captured Git blobs in their own namespace; no checkout read. */
export function publishedFixtureIdentity(
  paths: readonly string[],
  tree: ReadonlyMap<string, { readonly mode: string; readonly id: string }>,
  bytes: ReadonlyMap<string, Uint8Array>,
): PublishedFixtureIdentity {
  if (!paths.length || new Set(paths).size !== paths.length)
    throw new Error('Published fixture paths are empty or duplicated.');
  const digests = new WeakMap<Uint8Array, { sha256: string; blobOid: string }>();
  const inputs = [...paths].sort().map((file) => {
    if (!fixturePath(file)) throw new Error('Published fixture path is not canonical.');
    const entry = tree.get(file);
    const value = bytes.get(file);
    if (!entry || !['100644', '100755'].includes(entry.mode) || !/^[0-9a-f]{40}$/u.test(entry.id) || !value)
      throw new Error('Published fixture regular Git blob or bytes are missing: ' + file);
    let digest = digests.get(value);
    if (!digest) {
      digest = {
        sha256: createHash('sha256').update(value).digest('hex'),
        blobOid: createHash('sha1').update(`blob ${value.byteLength}\0`).update(value).digest('hex'),
      };
      digests.set(value, digest);
    }
    if (digest.blobOid !== entry.id) throw new Error('Published fixture bytes do not match their Git blob: ' + file);
    return Object.freeze({ path: file, mode: entry.mode, blob_oid: entry.id, sha256: digest.sha256 });
  });
  return Object.freeze({
    schema: 'PublishedCoverageFixture/v1',
    commit: 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6',
    directory: 'published-fixture',
    inputs: Object.freeze(inputs),
  });
}

export interface PublishedInputLists {
  readonly sources: readonly string[];
  readonly tests: readonly string[];
}

/** Compare already captured bytes; this neither reads the checkout nor hashes it again. */
export function assertPublishedCoverageInputs(
  expected: PublishedInputLists,
  actual: PublishedInputLists,
  publishedBytes: ReadonlyMap<string, Uint8Array>,
  actualBytes: ReadonlyMap<string, Uint8Array>,
): void {
  for (const kind of ['sources', 'tests'] as const) {
    const expectedPaths = new Set(expected[kind]);
    const actualPaths = new Set(actual[kind]);
    if (
      expectedPaths.size !== expected[kind].length ||
      actualPaths.size !== actual[kind].length ||
      expectedPaths.size !== actualPaths.size ||
      actual[kind].some((file) => !expectedPaths.has(file))
    )
      throw new Error(`Published baseline ${kind} path set differs from b549951.`);
    for (const file of expected[kind]) {
      const published = publishedBytes.get(file);
      const current = actualBytes.get(file);
      if (
        published === undefined ||
        current === undefined ||
        !Buffer.from(current.buffer, current.byteOffset, current.byteLength).equals(published)
      )
        throw new Error(`Published baseline input bytes differ from b549951: ${file}`);
    }
  }
}

/** Decode Git's binary --batch response once, with exact object and byte bounds. */
export function parsePublishedGitBatch(
  bytes: Buffer,
  objectIds: readonly string[],
  maxFileBytes: number,
  maxTotalBytes: number,
): ReadonlyMap<string, Buffer> {
  if (
    !Number.isSafeInteger(maxFileBytes) ||
    maxFileBytes < 0 ||
    !Number.isSafeInteger(maxTotalBytes) ||
    maxTotalBytes < 0 ||
    new Set(objectIds).size !== objectIds.length
  )
    throw new Error('Published Git batch bounds or object identities are invalid.');
  const result = new Map<string, Buffer>();
  let offset = 0;
  let total = 0;
  for (const id of objectIds) {
    if (!/^[0-9a-f]{40}$/u.test(id)) throw new Error('Published Git object identity is invalid.');
    const newline = bytes.indexOf(10, offset);
    if (newline < offset || newline - offset > 80) throw new Error('Published Git batch header is malformed.');
    const header = bytes.subarray(offset, newline).toString('utf8');
    const sizeText = header.slice(id.length + ' blob '.length);
    if (!header.startsWith(`${id} blob `) || !/^(?:0|[1-9][0-9]*)$/u.test(sizeText))
      throw new Error('Published Git batch object does not match its request.');
    const size = Number(sizeText);
    total += size;
    if (!Number.isSafeInteger(size) || size > maxFileBytes || total > maxTotalBytes)
      throw new Error('Published Git batch exceeds its byte limits.');
    offset = newline + 1;
    const end = offset + size;
    if (end >= bytes.length || bytes[end] !== 10) throw new Error('Published Git batch body is incomplete.');
    result.set(id, bytes.subarray(offset, end));
    offset = end + 1;
  }
  if (offset !== bytes.length) throw new Error('Published Git batch has unexpected trailing bytes.');
  return result;
}
