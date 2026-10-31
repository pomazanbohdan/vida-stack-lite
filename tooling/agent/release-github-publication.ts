import { releaseDigest, releaseJSON } from '../../packages/agent/bin/local-release-artifacts.ts';
import type { CIDeliveryRequest } from './release-ci-evidence.ts';
import { validateCIDeliveryRequest } from './release-ci-evidence.ts';

export type PublicationAsset = { file: string; data: Buffer };
export type PublicationProducer = {
  request: CIDeliveryRequest;
  run_id: string;
  run_attempt: number;
  artifact_id: string;
};
export type PublicationClaim = {
  schema: 'VidaGitHubPublication/v1';
  operation_id: string;
  version: string;
  source_commit: string;
  source_binding: string;
  producers: PublicationProducer[];
  assets: Array<{ file: string; bytes: number; sha256: string }>;
};
export type PublicationIdentity = Pick<
  PublicationClaim,
  'operation_id' | 'version' | 'source_commit' | 'source_binding'
>;
export interface PublicationAPI {
  json(method: 'GET' | 'POST' | 'PATCH', suffix: string, body?: unknown, allow404?: boolean): Promise<unknown>;
  upload(releaseId: number, file: string, data: Buffer): Promise<unknown>;
  download(assetId: number): Promise<Buffer>;
}

export interface PublicationReadAPI {
  json(method: 'GET', suffix: string, body?: undefined, allow404?: boolean): Promise<unknown>;
  download(assetId: number): Promise<Buffer>;
}

type Release = {
  id: number;
  tag_name: string;
  target_commitish: string;
  name: string;
  body: string;
  prerelease: boolean;
  draft: boolean;
};
type RemoteAsset = { id: number; name: string; size: number; state: string };
const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;
const safeOperation = /^[a-z0-9][a-z0-9-]{0,95}$/;
const safeFile = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const maxAssetBytes = 256 * 1024 * 1024;

function fail(message: string): never {
  throw new Error(`GitHub publication: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return fail('response object invalid');
  return value;
}

function stringField(value: unknown, name: string): string {
  if (typeof value !== 'string') return fail(`${name} invalid`);
  return value;
}

function numberField(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return fail(`${name} invalid`);
  return value;
}

function parseTag(value: unknown, version: string, source: string, message: string | null): Record<string, unknown> {
  const tag = record(value);
  const object = record(tag.object);
  if (
    tag.tag !== `v${version}` ||
    object.type !== 'commit' ||
    object.sha !== source ||
    (message !== null && tag.message !== message)
  ) {
    return fail('annotated tag differs from publication claim');
  }
  return tag;
}

function parseRelease(value: unknown): Release {
  const item = record(value);
  if (typeof item.prerelease !== 'boolean' || typeof item.draft !== 'boolean') fail('release state invalid');
  return {
    id: numberField(item.id, 'release id'),
    tag_name: stringField(item.tag_name, 'release tag'),
    target_commitish: stringField(item.target_commitish, 'release target'),
    name: stringField(item.name, 'release name'),
    body: stringField(item.body, 'release body'),
    prerelease: item.prerelease === true,
    draft: item.draft === true,
  };
}

function parseAssets(value: unknown): RemoteAsset[] {
  if (!Array.isArray(value) || value.length > 100) return fail('release asset list is incomplete or invalid');
  return value.map((entry) => {
    const item = record(entry);
    return {
      id: numberField(item.id, 'asset id'),
      name: stringField(item.name, 'asset name'),
      size: numberField(item.size, 'asset size'),
      state: stringField(item.state, 'asset state'),
    };
  });
}

function validateIdentity(identity: PublicationIdentity): void {
  if (!safeOperation.test(identity.operation_id)) fail('operation id invalid');
  const versionMatch = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(identity.version);
  if (!versionMatch || !versionMatch.slice(1).every((part) => Number.isSafeInteger(Number(part))))
    fail('version invalid');
  if (!sha40.test(identity.source_commit)) fail('source commit invalid');
  if (!sha64.test(identity.source_binding)) fail('source binding invalid');
}

function validateClaim(value: unknown, identity: PublicationIdentity): PublicationClaim {
  const item = record(value);
  const expected = ['schema', 'operation_id', 'version', 'source_commit', 'source_binding', 'producers', 'assets'];
  if (Object.keys(item).sort().join('\0') !== expected.sort().join('\0')) fail('claim fields invalid');
  if (
    item.schema !== 'VidaGitHubPublication/v1' ||
    item.operation_id !== identity.operation_id ||
    item.version !== identity.version ||
    item.source_commit !== identity.source_commit ||
    item.source_binding !== identity.source_binding
  )
    fail('claim identity mismatch');
  if (!Array.isArray(item.producers) || item.producers.length !== 2)
    fail('claim must bind Linux and Windows producers');
  const producers = item.producers.map((value) => {
    const producer = record(value);
    if (Object.keys(producer).sort().join('\0') !== ['artifact_id', 'request', 'run_attempt', 'run_id'].join('\0'))
      fail('producer fields invalid');
    const requestValue: unknown = producer.request;
    validateCIDeliveryRequest(requestValue);
    const request = requestValue;
    const run_id = stringField(producer.run_id, 'producer run id');
    const run_attempt = numberField(producer.run_attempt, 'producer run attempt');
    const artifact_id = stringField(producer.artifact_id, 'producer artifact id');
    if (!/^[0-9]+$/.test(run_id) || !/^[0-9]+$/.test(artifact_id)) fail('producer identity invalid');
    if (
      request.operation_id !== identity.operation_id ||
      request.version !== identity.version ||
      request.source_binding !== identity.source_binding ||
      request.repository_id !== 'vida-agent' ||
      request.project_ids.length !== 1 ||
      request.project_ids[0] !== 'agent'
    )
      fail('producer request binding mismatch');
    return { request, run_id, run_attempt, artifact_id };
  });
  const sortedProducers = [...producers].sort((a, b) => a.request.target.localeCompare(b.request.target));
  if (
    sortedProducers[0]?.request.target !== 'bun-linux-x64' ||
    sortedProducers[1]?.request.target !== 'bun-windows-x64'
  )
    fail('producer targets invalid');
  const first = sortedProducers[0];
  const second = sortedProducers[1];
  if (!first || !second || first.run_id !== second.run_id || first.run_attempt !== second.run_attempt)
    fail('producer run binding differs');
  if (first.artifact_id === second.artifact_id || first.request.request_id === second.request.request_id)
    fail('producer identities must be distinct');
  if (!Array.isArray(item.assets) || item.assets.length < 1 || item.assets.length > 16) fail('claim assets invalid');
  const assets = item.assets
    .map((value) => {
      const asset = record(value);
      const file = stringField(asset.file, 'asset filename');
      const bytes = asset.bytes;
      const digest = stringField(asset.sha256, 'asset digest');
      if (Object.keys(asset).sort().join('\0') !== ['bytes', 'file', 'sha256'].join('\0')) fail('asset fields invalid');
      if (!safeFile.test(file) || file === '.' || file === '..' || file.includes('..')) fail('asset filename unsafe');
      if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > maxAssetBytes)
        fail('asset size invalid');
      if (!sha64.test(digest)) fail('asset digest invalid');
      return { file, bytes, sha256: digest };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
  if (new Set(assets.map((asset) => asset.file)).size !== assets.length) fail('asset filenames duplicate');
  return {
    schema: 'VidaGitHubPublication/v1',
    ...identity,
    producers: sortedProducers,
    assets,
  };
}

function assetInventory(assets: PublicationAsset[]): PublicationClaim['assets'] {
  if (assets.length < 1 || assets.length > 16) fail('asset count invalid');
  const inventory = assets
    .map(({ file, data }) => {
      if (!safeFile.test(file) || file.includes('..')) fail('asset filename unsafe');
      if (data.length < 1 || data.length > maxAssetBytes) fail('asset size invalid');
      return { file, bytes: data.length, sha256: releaseDigest(data) };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
  if (new Set(inventory.map((asset) => asset.file)).size !== inventory.length) fail('asset filenames duplicate');
  return inventory;
}

function sameJSON(left: unknown, right: unknown): boolean {
  return releaseJSON(left) === releaseJSON(right);
}

async function readTag(
  api: PublicationReadAPI,
  version: string,
  source: string,
  message: string | null,
): Promise<string | null> {
  const refValue = await api.json('GET', `/git/ref/tags/v${version}`, undefined, true);
  if (refValue === null) return null;
  const ref = record(refValue);
  if (ref.ref !== `refs/tags/v${version}`) fail('tag ref name differs');
  const object = record(ref.object);
  if (object.type !== 'tag') fail('release tag must be annotated');
  const sha = stringField(object.sha, 'tag object sha');
  if (!sha40.test(sha)) fail('tag object sha invalid');
  const tagValue = await api.json('GET', `/git/tags/${sha}`);
  parseTag(tagValue, version, source, message);
  return sha;
}

async function requireTag(api: PublicationAPI, version: string, source: string, message: string): Promise<string> {
  const sha = await readTag(api, version, source, message);
  if (sha === null) fail('release tag missing');
  return sha;
}

async function listReleases(api: PublicationReadAPI): Promise<Release[]> {
  const value = await api.json('GET', '/releases?per_page=100');
  if (!Array.isArray(value) || value.length > 100) fail('release list is incomplete or invalid');
  return value.map(parseRelease);
}

function assertRelease(release: Release, id: PublicationIdentity, body: string, draft: boolean): void {
  if (
    release.tag_name !== `v${id.version}` ||
    release.target_commitish !== id.source_commit ||
    release.name !== `VIDA Agent v${id.version}` ||
    release.body !== body ||
    release.prerelease ||
    release.draft !== draft
  )
    fail('release metadata differs from publication claim');
}

async function verifyAssetBytes(
  api: PublicationReadAPI,
  asset: RemoteAsset,
  expected: PublicationClaim['assets'][number],
): Promise<void> {
  if (asset.size !== expected.bytes || asset.state !== 'uploaded') fail(`asset ${expected.file} metadata invalid`);
  const bytes = await api.download(asset.id);
  if (bytes.length !== expected.bytes || releaseDigest(bytes) !== expected.sha256)
    fail(`asset ${expected.file} bytes differ`);
}

/** Read-only publication evidence. This alone does not authorize a successor. */
export async function observePublishedRelease(args: {
  api: PublicationReadAPI;
  operation_id: string;
  version: string;
  requests: ReadonlyMap<string, CIDeliveryRequest>;
}): Promise<{
  kind: 'published_version_baseline';
  claim: PublicationClaim;
  claimDigest: string;
  assetInventoryDigest: string;
  tagSha: string;
  releaseId: number;
}> {
  const { api } = args;
  validateIdentity({
    operation_id: args.operation_id,
    version: args.version,
    source_commit: '0'.repeat(40),
    source_binding: '0'.repeat(64),
  });
  const ref = record(await api.json('GET', `/git/ref/tags/v${args.version}`));
  const object = record(ref.object);
  if (ref.ref !== `refs/tags/v${args.version}` || object.type !== 'tag') fail('release tag must be annotated');
  const tagSha = stringField(object.sha, 'tag object sha');
  if (!sha40.test(tagSha)) fail('tag object sha invalid');
  const tag = record(await api.json('GET', `/git/tags/${tagSha}`));
  const message = stringField(tag.message, 'tag message');
  const prefix = 'VIDA-CI-PUBLICATION/v1\n';
  if (!message.startsWith(prefix)) fail('existing tag is not owned by this publisher');
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.slice(prefix.length));
  } catch {
    return fail('existing tag claim JSON invalid');
  }
  const rawClaim = record(parsed);
  const identity: PublicationIdentity = {
    operation_id: args.operation_id,
    version: args.version,
    source_commit: stringField(record(tag.object).sha, 'tag source'),
    source_binding: stringField(rawClaim.source_binding, 'claim source binding'),
  };
  validateIdentity(identity);
  const claim = validateClaim(parsed, identity);
  if (message !== prefix + releaseJSON(claim)) fail('tag claim is not canonical');
  parseTag(tag, identity.version, identity.source_commit, message);
  for (const producer of claim.producers) {
    const request = args.requests.get(producer.request.request_id);
    if (!request) fail('stored producer request missing');
    validateCIDeliveryRequest(request);
    if (request.request_id !== producer.request.request_id || !sameJSON(request, producer.request))
      fail('stored producer request differs from publication claim');
  }
  const names = [
    'SHA256SUMS-linux-x64',
    'SHA256SUMS-windows-x64',
    'install-windows.ps1',
    'install.sh',
    'publication-provenance.json',
    'vida-agent-bun-linux-x64',
    'vida-agent-bun-linux-x64.manifest.json',
    'vida-agent-bun-windows-x64.exe',
    'vida-agent-bun-windows-x64.manifest.json',
  ].sort();
  if (!sameJSON(claim.assets.map((asset) => asset.file).sort(), names)) fail('publication asset inventory differs');
  const claim_sha256 = releaseDigest(releaseJSON(claim));
  const body = `${prefix}${claim_sha256}\n`;
  const releases = (await listReleases(api)).filter((release) => release.tag_name === `v${identity.version}`);
  if (releases.length !== 1 || !releases[0]) fail('published release missing or ambiguous');
  const release = releases[0];
  assertRelease(release, identity, body, false);
  const assets = parseAssets(await api.json('GET', `/releases/${release.id}/assets?per_page=100`));
  if (assets.length !== claim.assets.length || new Set(assets.map((asset) => asset.id)).size !== assets.length)
    fail('publication assets missing or ambiguous');
  for (const expected of claim.assets) {
    const matches = assets.filter((asset) => asset.name === expected.file);
    if (matches.length !== 1 || !matches[0]) fail('publication asset missing or ambiguous');
    await verifyAssetBytes(api, matches[0], expected);
  }
  const latestAssets = parseAssets(await api.json('GET', `/releases/${release.id}/assets?per_page=100`));
  const latest = (await listReleases(api)).filter((item) => item.tag_name === `v${identity.version}`);
  if (latest.length !== 1 || !sameJSON(latest[0], release) || !sameJSON(latestAssets, assets))
    fail('publication changed during observation');
  const latestTag = await readTag(api, identity.version, identity.source_commit, message);
  if (latestTag !== tagSha) fail('tag changed during observation');
  return {
    kind: 'published_version_baseline',
    claim,
    claimDigest: claim_sha256,
    assetInventoryDigest: releaseDigest(releaseJSON(claim.assets)),
    tagSha,
    releaseId: release.id,
  };
}

async function reconcileAssets(
  api: PublicationAPI,
  releaseId: number,
  claim: PublicationClaim,
  uploads: Map<string, Buffer>,
  draft: boolean,
): Promise<void> {
  const value = await api.json('GET', `/releases/${releaseId}/assets?per_page=100`);
  const remote = parseAssets(value);
  const byName = new Map<string, RemoteAsset>();
  for (const asset of remote) {
    if (byName.has(asset.name) || !claim.assets.some((expected) => expected.file === asset.name))
      fail('unexpected or duplicate release asset');
    byName.set(asset.name, asset);
  }
  for (const expected of claim.assets) {
    const existing = byName.get(expected.file);
    if (existing) {
      await verifyAssetBytes(api, existing, expected);
      continue;
    }
    if (!draft) fail('published release is missing an asset');
    const bytes = uploads.get(expected.file);
    if (!bytes || bytes.length !== expected.bytes || releaseDigest(bytes) !== expected.sha256)
      fail(`asset ${expected.file} bytes unavailable`);
    await api.upload(releaseId, expected.file, bytes);
    const refreshedValue = await api.json('GET', `/releases/${releaseId}/assets?per_page=100`);
    const refreshed = parseAssets(refreshedValue);
    const matches = refreshed.filter((asset) => asset.name === expected.file);
    if (matches.length !== 1 || refreshed.some((asset) => !claim.assets.some((known) => known.file === asset.name)))
      fail('asset upload readback ambiguous');
    const uploaded = matches[0];
    if (!uploaded) fail('asset upload readback missing');
    await verifyAssetBytes(api, uploaded, expected);
  }
}

export async function publishGitHubRelease(args: {
  api: PublicationAPI;
  identity: PublicationIdentity;
  tagger_date: string;
  formAssets: (existing: PublicationClaim | null) => Promise<{
    producers: PublicationProducer[];
    assets: PublicationAsset[];
  }>;
}): Promise<{
  schema: 'VidaGitHubPublicationReceipt/v1';
  tag: string;
  release_id: number;
  url: string;
  claim_sha256: string;
  status: 'published' | 'already-published';
}> {
  const { api, identity } = args;
  validateIdentity(identity);
  if (!Number.isFinite(Date.parse(args.tagger_date)) || !args.tagger_date.endsWith('Z')) fail('tagger date invalid');
  const tag = `v${identity.version}`;
  const provisionalMessage = (claim: PublicationClaim): string => `VIDA-CI-PUBLICATION/v1\n${releaseJSON(claim)}`;
  const existingTagSha = await readTag(api, identity.version, identity.source_commit, null);
  let existingClaim: PublicationClaim | null = null;
  if (existingTagSha !== null) {
    const tagValue = await api.json('GET', `/git/tags/${existingTagSha}`);
    const tagObject = record(tagValue);
    const message = stringField(tagObject.message, 'existing tag message');
    if (!message.startsWith('VIDA-CI-PUBLICATION/v1\n')) fail('existing tag is not owned by this publisher');
    let parsed: unknown;
    try {
      parsed = JSON.parse(message.slice('VIDA-CI-PUBLICATION/v1\n'.length));
    } catch {
      return fail('existing tag claim JSON invalid');
    }
    existingClaim = validateClaim(parsed, identity);
    parseTag(tagObject, identity.version, identity.source_commit, message);
  }
  const formed = await args.formAssets(existingClaim);
  const assets = assetInventory(formed.assets);
  const claim = validateClaim(
    {
      schema: 'VidaGitHubPublication/v1',
      ...identity,
      producers: formed.producers,
      assets,
    },
    identity,
  );
  if (existingClaim && !sameJSON(existingClaim, claim)) fail('recovered producer artifacts differ from existing claim');
  const claimMessage = provisionalMessage(claim);
  const body = `VIDA-CI-PUBLICATION/v1\n${releaseDigest(releaseJSON(claim))}\n`;
  let tagSha = await readTag(api, identity.version, identity.source_commit, claimMessage);
  if (tagSha === null) {
    const createdValue = await api.json('POST', '/git/tags', {
      tag,
      message: claimMessage,
      object: identity.source_commit,
      type: 'commit',
      tagger: {
        name: 'github-actions[bot]',
        email: '41898282+github-actions[bot]@users.noreply.github.com',
        date: args.tagger_date,
      },
    });
    const created = record(createdValue);
    tagSha = stringField(created.sha, 'created tag sha');
    if (!sha40.test(tagSha)) fail('created tag sha invalid');
    parseTag(created, identity.version, identity.source_commit, claimMessage);
    const refValue = await api.json('POST', '/git/refs', {
      ref: `refs/tags/${tag}`,
      sha: tagSha,
    });
    const ref = record(refValue);
    if (ref.ref !== `refs/tags/${tag}` || record(ref.object).sha !== tagSha) fail('created tag ref differs');
    tagSha = await requireTag(api, identity.version, identity.source_commit, claimMessage);
  }
  const listed = (await listReleases(api)).filter((release) => release.tag_name === tag);
  if (listed.length > 1) fail('multiple releases use publication tag');
  let release = listed[0];
  if (!release) {
    const createdValue = await api.json('POST', '/releases', {
      tag_name: tag,
      target_commitish: identity.source_commit,
      name: `VIDA Agent ${tag}`,
      body,
      draft: true,
      prerelease: false,
    });
    const created = parseRelease(createdValue);
    assertRelease(created, identity, body, true);
    const refreshed = (await listReleases(api)).filter((item) => item.tag_name === tag);
    if (refreshed.length !== 1 || refreshed[0]?.id !== created.id) fail('created release readback ambiguous');
    release = refreshed[0];
  }
  if (!release) fail('release missing after reconciliation');
  assertRelease(release, identity, body, release.draft);
  const uploadedAssets = new Map(formed.assets.map((asset) => [asset.file, asset.data]));
  await reconcileAssets(api, release.id, claim, uploadedAssets, release.draft);
  await requireTag(api, identity.version, identity.source_commit, claimMessage);
  let fresh = (await listReleases(api)).find((item) => item.id === release?.id);
  if (!fresh) fail('release disappeared during reconciliation');
  assertRelease(fresh, identity, body, fresh.draft);
  if (fresh.draft) {
    await reconcileAssets(api, fresh.id, claim, uploadedAssets, false);
    await api.json('PATCH', `/releases/${fresh.id}`, {
      draft: false,
      make_latest: 'true',
    });
    fresh = (await listReleases(api)).find((item) => item.id === release?.id);
    if (!fresh || fresh.draft) fail('publication state readback failed');
  }
  assertRelease(fresh, identity, body, false);
  await reconcileAssets(api, fresh.id, claim, uploadedAssets, false);
  await requireTag(api, identity.version, identity.source_commit, claimMessage);
  const claim_sha256 = releaseDigest(releaseJSON(claim));
  return {
    schema: 'VidaGitHubPublicationReceipt/v1',
    tag,
    release_id: fresh.id,
    url: `https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/${tag}`,
    claim_sha256,
    status: listed.length > 0 && !listed[0]?.draft ? 'already-published' : 'published',
  };
}
