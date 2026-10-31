import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { releaseDigest, releaseJSON } from '../../../packages/agent/bin/local-release-artifacts.ts';
import {
  publishGitHubRelease,
  observePublishedRelease,
  type PublicationAPI,
  type PublicationAsset,
  type PublicationClaim,
  type PublicationIdentity,
  type PublicationProducer,
} from '../../../tooling/agent/release-github-publication.ts';
import type { CIDeliveryRequest } from '../../../tooling/agent/release-ci-evidence.ts';
import {
  main as publisherMain,
  observedPublicationFetch,
  PublicationDiagnostic,
  createPublishedReleaseReadClient,
} from '../../../tooling/agent/release-ci-publisher.ts';

const identity: PublicationIdentity = {
  operation_id: 'release-2026-10-30',
  version: '0.1.6',
  source_commit: 'a'.repeat(40),
  source_binding: 'b'.repeat(64),
};
const taggerDate = '2026-10-30T12:00:00Z';
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const contents: PublicationAsset[] = [
  { file: 'vida-agent-linux', data: Buffer.from('linux-binary') },
  { file: 'vida-agent-windows.exe', data: Buffer.from('windows-binary') },
];

function producer(target: string, artifactId: string): PublicationProducer {
  const body = {
    schema: 'VidaCIDeliveryRequest/v1' as const,
    operation_id: identity.operation_id,
    version: identity.version,
    repository_id: 'vida-agent',
    project_ids: ['agent'],
    target,
    source_binding: identity.source_binding,
  };
  const request: CIDeliveryRequest = { ...body, request_id: releaseDigest(releaseJSON(body)) };
  return { request, run_id: '123', run_attempt: 1, artifact_id: artifactId };
}

function producers(): PublicationProducer[] {
  return [producer('bun-linux-x64', '1001'), producer('bun-windows-x64', '1002')];
}

type StoredAsset = { id: number; name: string; size: number; state: string; data: Buffer };
type StoredRelease = {
  id: number;
  tag_name: string;
  target_commitish: string;
  name: string;
  body: string;
  prerelease: boolean;
  draft: boolean;
  assets: StoredAsset[];
};
type StoredTag = { tag: string; message: string; object: { type: string; sha: string } };

class MemoryGitHub implements PublicationAPI {
  readonly refs = new Map<string, { ref: string; object: { type: string; sha: string } }>();
  readonly tags = new Map<string, StoredTag>();
  readonly releases: StoredRelease[] = [];
  readonly mutations: string[] = [];
  nextAssetId = 500;
  failAfter: string | null = null;
  malformedDraft = false;

  private after(path: string): void {
    if (this.failAfter === path) {
      this.failAfter = null;
      throw new Error(`lost response after ${path}`);
    }
  }

  private note(method: string, suffix: string): void {
    if (method !== 'GET') this.mutations.push(`${method} ${suffix}`);
  }

  async json(method: 'GET' | 'POST' | 'PATCH', suffix: string, body?: unknown, allow404 = false): Promise<unknown> {
    this.note(method, suffix);
    if (method === 'GET' && suffix.startsWith('/git/ref/tags/')) {
      const key = suffix.slice('/git/ref/tags/'.length);
      return this.refs.get(key) ?? (allow404 ? null : assert.fail(`missing ref ${suffix}`));
    }
    if (method === 'GET' && suffix.startsWith('/git/tags/')) {
      const tag = this.tags.get(suffix.slice('/git/tags/'.length));
      return tag ?? assert.fail(`missing tag ${suffix}`);
    }
    if (method === 'POST' && suffix === '/git/tags') {
      const input = this.object(body);
      const tag: StoredTag = {
        tag: this.string(input.tag),
        message: this.string(input.message),
        object: { type: this.string(input.type), sha: this.string(input.object) },
      };
      const sha = releaseDigest(releaseJSON(tag)).slice(0, 40);
      this.tags.set(sha, tag);
      this.after(suffix);
      return { ...tag, sha };
    }
    if (method === 'POST' && suffix === '/git/refs') {
      const input = this.object(body);
      const refName = this.string(input.ref);
      const key = refName.replace(/^refs\/tags\//, '');
      if (this.refs.has(key)) throw new Error(`ref already exists ${refName}`);
      const sha = this.string(input.sha);
      this.refs.set(key, { ref: refName, object: { type: 'tag', sha } });
      this.after(suffix);
      return this.refs.get(key) ?? assert.fail('ref insertion failed');
    }
    if (method === 'GET' && suffix === '/releases?per_page=100') {
      const rows = this.releases.map(({ assets: _assets, ...release }) => release);
      return this.malformedDraft ? rows.map((release) => ({ ...release, draft: 'false' })) : rows;
    }
    if (method === 'POST' && suffix === '/releases') {
      const input = this.object(body);
      if (this.releases.some((release) => release.tag_name === input.tag_name))
        throw new Error('release tag already exists');
      const release: StoredRelease = {
        id: 77,
        tag_name: this.string(input.tag_name),
        target_commitish: this.string(input.target_commitish),
        name: this.string(input.name),
        body: this.string(input.body),
        draft: input.draft === true,
        prerelease: input.prerelease === true,
        assets: [],
      };
      this.releases.push(release);
      this.after(suffix);
      return this.releaseJSON(release);
    }
    if (method === 'GET' && suffix.startsWith('/releases/') && suffix.endsWith('/assets?per_page=100')) {
      const release = this.releaseByPath(suffix);
      return release.assets.map(({ data: _data, ...asset }) => asset);
    }
    if (method === 'PATCH' && suffix.startsWith('/releases/')) {
      const release = this.releaseByPath(suffix);
      const input = this.object(body);
      if (input.draft === false) release.draft = false;
      this.after(suffix);
      return this.releaseJSON(release);
    }
    throw new Error(`unsupported API operation ${method} ${suffix}`);
  }

  async upload(releaseId: number, file: string, data: Buffer): Promise<unknown> {
    this.mutations.push(`UPLOAD ${file}`);
    const release = this.release(releaseId);
    if (release.assets.some((asset) => asset.name === file)) throw new Error(`asset already exists ${file}`);
    const asset: StoredAsset = {
      id: this.nextAssetId++,
      name: file,
      size: data.length,
      state: 'uploaded',
      data: Buffer.from(data),
    };
    release.assets.push(asset);
    this.after('UPLOAD');
    const { data: _data, ...metadata } = asset;
    return metadata;
  }

  async download(assetId: number): Promise<Buffer> {
    const asset = this.releases.flatMap((release) => release.assets).find((candidate) => candidate.id === assetId);
    if (!asset) throw new Error(`missing asset ${assetId}`);
    return Buffer.from(asset.data);
  }

  private object(value: unknown): Record<string, unknown> {
    if (!isRecord(value)) throw new Error('expected object');
    return value;
  }

  private string(value: unknown): string {
    if (typeof value !== 'string') throw new Error('expected string');
    return value;
  }

  private release(id: number): StoredRelease {
    const release = this.releases.find((candidate) => candidate.id === id);
    if (!release) throw new Error(`missing release ${id}`);
    return release;
  }

  private releaseByPath(suffix: string): StoredRelease {
    const match = /^\/releases\/(\d+)/.exec(suffix);
    if (!match?.[1]) throw new Error(`invalid release path ${suffix}`);
    return this.release(Number(match[1]));
  }

  private releaseJSON(release: StoredRelease): Omit<StoredRelease, 'assets'> {
    const { assets: _assets, ...metadata } = release;
    return metadata;
  }
}

async function publish(
  api: MemoryGitHub,
  formedAssets: PublicationAsset[] = contents,
  existingClaims: Array<PublicationClaim | null> = [],
): Promise<Awaited<ReturnType<typeof publishGitHubRelease>>> {
  return publishGitHubRelease({
    api,
    identity,
    tagger_date: taggerDate,
    formAssets: async (existing) => {
      existingClaims.push(existing);
      return { producers: producers(), assets: formedAssets };
    },
  });
}

const managedAssets = [
  'SHA256SUMS-linux-x64',
  'SHA256SUMS-windows-x64',
  'install-windows.ps1',
  'install.sh',
  'publication-provenance.json',
  'vida-agent-bun-linux-x64',
  'vida-agent-bun-linux-x64.manifest.json',
  'vida-agent-bun-windows-x64.exe',
  'vida-agent-bun-windows-x64.manifest.json',
].map((file) => ({ file, data: Buffer.from(file) }));

function observe(
  api: MemoryGitHub,
  requests = new Map(producers().map(({ request }) => [request.request_id, request])),
) {
  return observePublishedRelease({ api, operation_id: identity.operation_id, version: identity.version, requests });
}

describe('published version baseline', () => {
  test('reads exact managed assets without mutation', async () => {
    const api = new MemoryGitHub();
    await publish(api, managedAssets);
    const before = api.mutations.length;
    const result = await observe(api);
    assert.equal(result.kind, 'published_version_baseline');
    assert.equal(result.claim.source_commit, identity.source_commit);
    assert.equal(result.claim.assets.length, 9);
    assert.equal(result.assetInventoryDigest, releaseDigest(releaseJSON(result.claim.assets)));
    assert.equal(api.mutations.length, before);
  });

  test.each(['draft', 'foreign', 'lightweight', 'request', 'bytes', 'missing', 'extra', 'drift'])(
    'rejects %s without mutation',
    async (kind) => {
      const api = new MemoryGitHub();
      await publish(api, managedAssets);
      const release = api.releases[0]!;
      const ref = api.refs.get('v0.1.6')!;
      const tag = api.tags.get(ref.object.sha)!;
      const requests = new Map(producers().map(({ request }) => [request.request_id, request]));
      if (kind === 'draft') release.draft = true;
      if (kind === 'foreign') tag.message = 'foreign';
      if (kind === 'lightweight') ref.object.type = 'commit';
      if (kind === 'request') {
        const first = producers()[0]!.request;
        requests.set(first.request_id, { ...first, source_binding: 'c'.repeat(64) });
      }
      if (kind === 'bytes') release.assets[0]!.data = Buffer.from('changed');
      if (kind === 'missing') release.assets.pop();
      if (kind === 'extra')
        release.assets.push({ id: 999, name: 'extra', size: 1, state: 'uploaded', data: Buffer.from('x') });
      if (kind === 'drift') {
        const download = api.download.bind(api);
        api.download = async (id) => {
          const data = await download(id);
          release.body = 'changed';
          return data;
        };
      }
      const before = api.mutations.length;
      await assert.rejects(() => observe(api, requests));
      assert.equal(api.mutations.length, before);
    },
  );

  test('read transport rejects mutation methods before fetch', async () => {
    let calls = 0;
    const api = createPublishedReleaseReadClient('token', async () => {
      calls++;
      throw new Error('unexpected fetch');
    });
    const unsafe = api as unknown as PublicationAPI;
    await assert.rejects(() => unsafe.json('POST', '/releases', {}));
    await assert.rejects(() => unsafe.json('PATCH', '/releases/1', {}));
    assert.equal(typeof unsafe.upload, 'undefined');
    assert.equal(calls, 0);
  });
});

describe('GitHub release publication owner', () => {
  test('diagnostics are exclusive, bounded, terminal, and do not retain poisoned data', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'publication-diagnostic-'));
    try {
      const log = new PublicationDiagnostic(dir, '123', '1');
      assert.throws(() => new PublicationDiagnostic(dir, '123', '1'));
      const poison = 'secret-token-body-query\n    at check (tooling/release-ci-evidence.ts:999:1)';
      const fetcher = async () => new Response(poison, { status: 403 });
      await observedPublicationFetch(
        log,
        fetcher,
        `https://api.github.com/repos/x/y/actions/artifacts/123?token=${poison}`,
      );
      log.event('error', { error: new Error(poison) });
      log.event('error', { error: new Error('second') });
      for (let i = 0; i < 500; i++) log.event('response', { route: poison, status: 200 });
      log.close('failure');
      const raw = readFileSync(path.join(dir, 'diagnostic-123-1.ndjson'), 'utf8');
      const rows = raw
        .trim()
        .split('\n')
        .map((line): Record<string, unknown> => {
          const value: unknown = JSON.parse(line);
          assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
          const row = value as Record<string, unknown>;
          assert.equal(typeof row.event, 'string');
          assert.ok(row.kind === undefined || typeof row.kind === 'string');
          assert.ok(row.sites === undefined || Array.isArray(row.sites));
          assert.ok(row.method === undefined || typeof row.method === 'string');
          assert.ok(row.route === undefined || typeof row.route === 'string');
          assert.ok(row.status === undefined || typeof row.status === 'number');
          return row;
        });
      assert.ok(Buffer.byteLength(raw) <= 65536 && rows.length <= 256);
      assert.equal(raw.includes(poison), false);
      assert.equal(rows.filter((row) => row.event === 'error').length, 1);
      const error = rows.find((row) => row.event === 'error');
      assert.ok(error);
      assert.equal(error.kind, 'exception');
      assert.deepEqual(error.sites, []);
      assert.ok(rows.some((row) => row.event === 'request' && row.method === 'GET'));
      assert.ok(
        rows.some((row) => row.event === 'response' && row.route === 'producer-artifact' && row.status === 403),
      );
      assert.deepEqual(rows.at(-1), { event: 'terminal', stage: 'startup', outcome: 'failure' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test('overlapping traced fetches keep their diagnostics isolated', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'publication-overlap-'));
    try {
      const first = new PublicationDiagnostic(dir, '123', '1');
      const second = new PublicationDiagnostic(dir, '123', '2');
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const pending = observedPublicationFetch(
        first,
        async () => {
          await gate;
          return new Response(null, { status: 201 });
        },
        'https://api.github.com/repos/x/y/releases',
        { method: 'POST' },
      );
      await observedPublicationFetch(
        second,
        async () => new Response(null, { status: 204 }),
        'https://api.github.com/repos/x/y/git/commits/a',
        { method: 'PATCH' },
      );
      release();
      await pending;
      first.close('success');
      second.close('success');
      const a = readFileSync(path.join(dir, 'diagnostic-123-1.ndjson'), 'utf8');
      const b = readFileSync(path.join(dir, 'diagnostic-123-2.ndjson'), 'utf8');
      assert.match(a, /"method":"POST"/);
      assert.doesNotMatch(a, /"route":"commit"/);
      assert.match(b, /"method":"PATCH"/);
      assert.doesNotMatch(b, /"route":"release"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test('rejects a local publisher invocation before any publication', async () => {
    await assert.rejects(() => publisherMain({}), /publisher ingress rejected/);
  });
  test('publishes one claim, annotated tag, draft release, and exact assets', async () => {
    const api = new MemoryGitHub();
    const receipt = await publish(api);
    assert.equal(receipt.status, 'published');
    assert.equal(receipt.tag, 'v0.1.6');
    assert.equal(receipt.release_id, 77);
    assert.equal(api.refs.size, 1);
    assert.equal(api.releases.length, 1);
    assert.equal(api.releases[0]?.draft, false);
    assert.deepEqual(
      api.releases[0]?.assets.map(({ id, name }) => ({ id, name })),
      [
        { id: 500, name: contents[0]?.file },
        { id: 501, name: contents[1]?.file },
      ],
    );
    assert.equal(
      receipt.claim_sha256,
      releaseDigest(
        releaseJSON({
          schema: 'VidaGitHubPublication/v1',
          ...identity,
          producers: producers(),
          assets: contents
            .map(({ file, data }) => ({ file, bytes: data.length, sha256: releaseDigest(data) }))
            .sort((a, b) => a.file.localeCompare(b.file)),
        }),
      ),
    );
  });

  test('a completed retry is read-only and supplies the durable claim to recovery', async () => {
    const api = new MemoryGitHub();
    await publish(api);
    const before = api.mutations.length;
    const existing: Array<PublicationClaim | null> = [];
    const receipt = await publish(api, contents, existing);
    assert.equal(receipt.status, 'already-published');
    assert.equal(api.mutations.length, before);
    assert.equal(api.refs.size, 1);
    assert.equal(existing[0]?.schema, 'VidaGitHubPublication/v1');
    assert.equal(existing[0]?.source_commit, identity.source_commit);
    assert.deepEqual(
      api.releases[0]?.assets.map((asset) => asset.id),
      [500, 501],
    );
  });

  test.each([
    ['tag object', '/git/tags'],
    ['tag ref', '/git/refs'],
    ['draft release', '/releases'],
    ['asset upload', 'UPLOAD'],
    ['publish transition', '/releases/77'],
  ])('reconciles a response lost after %s effect without duplicate remote records', async (_label, fault) => {
    const api = new MemoryGitHub();
    api.failAfter = fault;
    await assert.rejects(() => publish(api));
    const firstEffects = {
      refs: api.refs.size,
      releases: api.releases.length,
      assets: api.releases[0]?.assets.length ?? 0,
    };
    const firstAssetIds = api.releases[0]?.assets.map((asset) => asset.id) ?? [];
    await publish(api);
    assert.equal(api.refs.size, 1);
    assert.equal(api.releases.length, 1);
    assert.equal(api.releases[0]?.draft, false);
    assert.equal(api.releases[0]?.assets.length, 2);
    assert.deepEqual(
      api.releases[0]?.assets.slice(0, firstAssetIds.length).map((asset) => asset.id),
      firstAssetIds,
    );
    if (fault === '/git/refs') assert.equal(firstEffects.refs, 1);
    if (fault === '/releases') assert.equal(firstEffects.releases, 1);
    if (fault === 'UPLOAD') assert.equal(firstEffects.assets, 1);
    if (fault === '/releases/77') assert.equal(firstEffects.assets, 2);
  });

  test('rejects a tag bound to a different source before writes', async () => {
    const api = new MemoryGitHub();
    const sha = 'c'.repeat(40);
    const tag = { tag: 'v0.1.6', message: 'foreign', object: { type: 'commit', sha: 'd'.repeat(40) } };
    api.tags.set(sha, tag);
    api.refs.set('v0.1.6', { ref: 'refs/tags/v0.1.6', object: { type: 'tag', sha } });
    await assert.rejects(() => publish(api));
    assert.equal(api.mutations.length, 0);
    assert.equal(api.refs.get('v0.1.6')?.object.sha, sha);
  });

  test('rejects durable claim drift in newly formed producer assets before writes', async () => {
    const api = new MemoryGitHub();
    await publish(api);
    const before = api.mutations.length;
    const changed = [{ file: contents[0]?.file ?? '', data: Buffer.from('changed-linux') }, contents[1]!];
    const claims: Array<PublicationClaim | null> = [];
    await assert.rejects(() => publish(api, changed, claims));
    assert.ok(claims[0]);
    assert.equal(api.mutations.length, before);
    assert.equal(api.releases[0]?.assets.length, 2);
  });

  test('does not fill a missing asset on an already published release', async () => {
    const api = new MemoryGitHub();
    await publish(api);
    const release = api.releases[0];
    assert.ok(release);
    release.assets.pop();
    const before = api.mutations.length;
    await assert.rejects(() => publish(api));
    assert.equal(api.mutations.length, before);
    assert.equal(release.assets.length, 1);
  });

  test.each(['starter', 'extra', 'mismatch', 'duplicate'])(
    'rejects malformed remote asset inventory: %s',
    async (kind) => {
      const api = new MemoryGitHub();
      await publish(api);
      const release = api.releases[0];
      assert.ok(release);
      if (kind === 'starter') release.assets[0]!.state = 'starter';
      if (kind === 'extra')
        release.assets.push({ id: 999, name: 'unexpected.zip', size: 1, state: 'uploaded', data: Buffer.from('x') });
      if (kind === 'mismatch') release.assets[0]!.data = Buffer.from('wrong-bytes');
      if (kind === 'duplicate') release.assets.push({ ...release.assets[0]!, id: 998 });
      const before = api.mutations.length;
      await assert.rejects(() => publish(api));
      assert.equal(api.mutations.length, before);
    },
  );

  test('rejects a malformed release boolean before publication', async () => {
    const api = new MemoryGitHub();
    await publish(api);
    const release = api.releases[0];
    assert.ok(release);
    api.malformedDraft = true;
    const before = api.mutations.length;
    await assert.rejects(() => publish(api));
    assert.equal(api.mutations.length, before);
  });
});
