import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runBoundedSubprocess } from './helpers/bounded-subprocess.ts';
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

  test('bounded read client reconstructs sequential ranges with one storage deadline', async () => {
    const storageUrl = 'https://release-assets.githubusercontent.com/download?signature=secret';
    const data = Buffer.alloc(8 * 1024 * 1024 + 3, 0x5a);
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const api = createPublishedReleaseReadClient('secret-token', async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });
      if (url === 'https://api.github.com/repos/pomazanbohdan/vida-stack-lite/releases/assets/42')
        return new Response(null, { status: 302, headers: { location: storageUrl } });
      const range = new Headers(init?.headers).get('range');
      if (range === 'bytes=0-8388607')
        return new Response(data.subarray(0, 8 * 1024 * 1024), {
          status: 206,
          headers: { 'content-range': `bytes 0-8388607/${data.length}` },
        });
      if (range === 'bytes=8388608-16777215')
        return new Response(data.subarray(8 * 1024 * 1024), {
          status: 206,
          headers: { 'content-range': `bytes 8388608-${data.length - 1}/${data.length}` },
        });
      throw new Error(`unexpected range ${range}`);
    });

    assert.deepEqual(await api.download(42), data);
    assert.equal(calls.length, 3);
    assert.equal(calls[1]?.url, storageUrl);
    assert.equal(calls[2]?.url, storageUrl);
    assert.equal(new Headers(calls[0]?.init?.headers).get('authorization'), 'Bearer secret-token');
    for (const call of calls.slice(1)) {
      assert.equal(new Headers(call.init?.headers).get('authorization'), null);
      assert.equal(call.init?.redirect, 'error');
      assert.equal(call.init?.signal, calls[1]?.init?.signal);
    }
  });

  test('bounded read client preserves direct API200 and initial storage200 bodies', async () => {
    const direct = Buffer.from('direct-api-body');
    let directCalls = 0;
    const directClient = createPublishedReleaseReadClient('secret-token', async () => {
      directCalls++;
      return new Response(direct, { status: 200 });
    });
    assert.deepEqual(await directClient.download(43), direct);
    assert.equal(directCalls, 1);

    const storageUrl = 'https://release-assets.githubusercontent.com/full?signature=secret';
    const stored = Buffer.from('storage-full-body');
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const storageClient = createPublishedReleaseReadClient('secret-token', async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });
      return url.startsWith('https://api.github.com/')
        ? new Response(null, { status: 302, headers: { location: storageUrl } })
        : new Response(stored, { status: 200 });
    });
    assert.deepEqual(await storageClient.download(44), stored);
    assert.equal(calls.length, 2);
    assert.equal(new Headers(calls[1]?.init?.headers).get('range'), 'bytes=0-8388607');
  });

  test('bounded read client returns one exact short206 range as a complete asset', async () => {
    const storageUrl = 'https://release-assets.githubusercontent.com/one?signature=secret';
    const data = Buffer.from('complete');
    let storageCalls = 0;
    const client = createPublishedReleaseReadClient('secret-token', async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://api.github.com/')) {
        assert.equal(init?.redirect, 'manual');
        return new Response(null, { status: 302, headers: { location: storageUrl } });
      }
      storageCalls++;
      assert.equal(new Headers(init?.headers).get('range'), 'bytes=0-8388607');
      return new Response(data, {
        status: 206,
        headers: { 'content-range': `bytes 0-${data.length - 1}/${data.length}` },
      });
    });
    assert.deepEqual(await client.download(49), data);
    assert.equal(storageCalls, 1);
  });

  test.each([8 * 1024 * 1024, 8 * 1024 * 1024 + 1])(
    'bounded read client reconstructs the exact %i-byte boundary',
    async (total) => {
      const chunkSize = 8 * 1024 * 1024;
      const data = Buffer.alloc(total, 0x35);
      data[total - 1] = 0x7a;
      const ranges: string[] = [];
      const client = createPublishedReleaseReadClient('token', async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith('https://api.github.com/'))
          return new Response(null, {
            status: 302,
            headers: { location: 'https://release-assets.githubusercontent.com/boundary' },
          });
        const start = ranges.length * chunkSize;
        const end = Math.min(start + chunkSize, total);
        const requested = new Headers(init?.headers).get('range');
        assert.equal(requested, `bytes=${start}-${start + chunkSize - 1}`);
        assert.ok(requested);
        ranges.push(requested);
        return new Response(data.subarray(start, end), {
          status: 206,
          headers: { 'content-range': `bytes ${start}-${end - 1}/${total}`, 'content-length': String(end - start) },
        });
      });
      assert.deepEqual(await client.download(60), data);
      assert.equal(ranges.length, Math.ceil(total / chunkSize));
    },
  );

  test.each(['direct', 'storage'])('bounded read client preserves empty200 through %s', async (mode) => {
    const storage = mode === 'storage';
    let calls = 0;
    const client = createPublishedReleaseReadClient('token', async (_input, init) => {
      calls++;
      if (storage && calls === 1)
        return new Response(null, {
          status: 302,
          headers: { location: 'https://release-assets.githubusercontent.com/empty' },
        });
      if (storage) assert.equal(new Headers(init?.headers).get('authorization'), null);
      return new Response(Buffer.alloc(0), { status: 200 });
    });
    assert.deepEqual(await client.download(61), Buffer.alloc(0));
    assert.equal(calls, storage ? 2 : 1);
  });

  test.each([
    ['missing range', null],
    ['wrong start', 'bytes 1-3/4'],
    ['unsafe total', 'bytes 0-3/9007199254740992'],
    ['zero total', 'bytes 0-0/0'],
    ['unknown total', 'bytes 0-3/*'],
    ['nonnumeric total', 'bytes 0-3/NaN'],
    ['noncanonical offset', 'bytes 00-3/4'],
    ['foreign range unit', 'items 0-3/4'],
    ['reversed bounds', 'bytes 3-0/4'],
  ])('bounded read client rejects %s without retry', async (_label, contentRange) => {
    const storageUrl = 'https://release-assets.githubusercontent.com/range?signature=secret';
    let storageCalls = 0;
    const client = createPublishedReleaseReadClient('secret-token', async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://api.github.com/'))
        return new Response(null, { status: 302, headers: { location: storageUrl } });
      storageCalls++;
      return new Response(Buffer.from('abcd'), {
        status: 206,
        headers: contentRange === null ? {} : { 'content-range': contentRange },
      });
    });
    await assert.rejects(() => client.download(45));
    assert.equal(storageCalls, 1);
  });

  test.each([
    ['overlong body', 'abcde', '4'],
    ['short Content-Length', 'abcd', '3'],
    ['long Content-Length', 'abcd', '5'],
    ['noncanonical Content-Length', 'abcd', '04'],
  ])('bounded read client refuses %s without retry', async (_label, body, contentLength) => {
    let storageCalls = 0;
    const client = createPublishedReleaseReadClient('token', async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://api.github.com/'))
        return new Response(null, {
          status: 302,
          headers: { location: 'https://release-assets.githubusercontent.com/length' },
        });
      storageCalls++;
      return new Response(body, {
        status: 206,
        headers: { 'content-range': 'bytes 0-3/4', 'content-length': contentLength },
      });
    });
    await assert.rejects(() => client.download(62), /response exceeds size limit|release asset range length invalid/);
    assert.equal(storageCalls, 1);
  });

  test.each([
    ['first', 302],
    ['later', 302],
    ['first', 307],
    ['later', 307],
    ['first', 404],
    ['later', 503],
    ['first', 204],
    ['later', 416],
  ] as const)(
    'bounded read client rejects storage status %s/%i without following or retrying',
    async (phase, status) => {
      const later = phase === 'later';
      let storageCalls = 0;
      const client = createPublishedReleaseReadClient('token', async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith('https://api.github.com/'))
          return new Response(null, {
            status: 302,
            headers: { location: 'https://release-assets.githubusercontent.com/status' },
          });
        storageCalls++;
        assert.equal(url, 'https://release-assets.githubusercontent.com/status');
        assert.equal(init?.redirect, 'error');
        assert.equal(new Headers(init?.headers).get('authorization'), null);
        if (later && storageCalls === 1)
          return new Response(Buffer.alloc(8 * 1024 * 1024), {
            status: 206,
            headers: { 'content-range': 'bytes 0-8388607/8388609' },
          });
        return new Response(null, { status, headers: { location: 'https://foreign.invalid/denied' } });
      });
      await assert.rejects(() => client.download(63), /release asset range status rejected/);
      assert.equal(storageCalls, later ? 2 : 1);
    },
  );

  test.each([
    null,
    'not-a-url',
    'http://release-assets.githubusercontent.com/file',
    'https://foreign.invalid/file',
    'https://release-assets.githubusercontent.com.foreign.invalid/file',
    'https://user:password@release-assets.githubusercontent.com/file',
    'https://release-assets.githubusercontent.com:444/file',
    'https://release-assets.githubusercontent.com/file#fragment',
  ])('bounded read client refuses untrusted storage location %s before storage fetch', async (location) => {
    let calls = 0;
    const client = createPublishedReleaseReadClient('token', async (input) => {
      calls++;
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      assert.equal(url, 'https://api.github.com/repos/pomazanbohdan/vida-stack-lite/releases/assets/64');
      return new Response(null, { status: 302, headers: location === null ? {} : { location } });
    });
    await assert.rejects(() => client.download(64), /artifact redirect/);
    assert.equal(calls, 1);
  });

  test.each(['identity', 'Identity'])('bounded read client accepts explicit %s content encoding', async (encoding) => {
    let storageCalls = 0;
    const client = createPublishedReleaseReadClient('token', async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://api.github.com/'))
        return new Response(null, {
          status: 302,
          headers: { location: 'https://release-assets.githubusercontent.com/identity' },
        });
      storageCalls++;
      return new Response('abcd', {
        status: 206,
        headers: { 'content-range': 'bytes 0-3/4', 'content-length': '4', 'content-encoding': encoding },
      });
    });
    assert.deepEqual(await client.download(65), Buffer.from('abcd'));
    assert.equal(storageCalls, 1);
  });

  test.skipIf(process.platform !== 'win32' || process.arch !== 'x64')(
    'publisher public entry supplies the original full-download transport',
    async () => {
      const fixture = mkdtempSync(path.join(os.tmpdir(), 'vida-publisher-full-mode-'));
      const repoRoot = path.resolve(import.meta.dir, '../../..');
      const runId = String(randomInt(1_000_000_000_000, 9_000_000_000_000));
      const diagnostic = path.join(repoRoot, '.tmp/ci-publication', `diagnostic-${runId}-1.ndjson`);
      const script = path.join(fixture, 'publisher-full-mode.mjs');
      const moduleURL = (relative: string) => pathToFileURL(path.join(repoRoot, relative)).href;
      let completed = false;
      try {
        assert.equal(existsSync(diagnostic), false);
        // The isolated consumer double exercises the real publisher-supplied client, without publication effects.
        writeFileSync(
          script,
          `
import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const root = ${JSON.stringify(repoRoot)};
const { releaseSourceBinding, releaseJSON, releaseDigest } = await import(${JSON.stringify(moduleURL('packages/agent/bin/local-release-artifacts.ts'))});
const version = JSON.parse(readFileSync(path.join(root, 'packages/agent/package.json'), 'utf8')).version;
const binding = releaseSourceBinding(root).source_binding;
const source = 'a'.repeat(40);
const request = target => {
  const body = { schema: 'VidaCIDeliveryRequest/v1', operation_id: 'publisher-transport-unit', version,
    repository_id: 'vida-agent', project_ids: ['agent'], target, source_binding: binding };
  return JSON.stringify({ ...body, request_id: releaseDigest(releaseJSON(body)) });
};
const ownerURL = ${JSON.stringify(moduleURL('tooling/agent/release-github-publication.ts'))};
const actual = await import(ownerURL);
const stop = new Error('unit consumer stopped before publication');
let consumed = 0;
let storageCalls = 0;
mock.module(ownerURL, () => ({ ...actual, publishGitHubRelease: async ({ api }) => {
  consumed++;
  assert.deepEqual(await api.download(99), Buffer.from('legacy-full-body'));
  throw stop;
} }));
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith('/git/commits/' + source))
    return Response.json({ sha: source, committer: { date: '2026-10-30T12:00:00Z' } });
  if (url === 'https://api.github.com/repos/pomazanbohdan/vida-stack-lite/releases/assets/99')
    return new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/publisher-unit' } });
  assert.equal(url, 'https://release-assets.githubusercontent.com/publisher-unit');
  assert.equal(new Headers(init?.headers).get('range'), null);
  assert.equal(new Headers(init?.headers).get('authorization'), null);
  assert.equal(init?.redirect, 'error');
  storageCalls++;
  return new Response('legacy-full-body', { status: 200 });
};
const { main } = await import(${JSON.stringify(moduleURL('tooling/agent/release-ci-publisher.ts'))});
await assert.rejects(() => main({ CI: 'true', GITHUB_ACTIONS: 'true', VIDA_NATIVE_CI_ENABLED: 'true',
  GITHUB_JOB: 'publish', GITHUB_REPOSITORY: 'pomazanbohdan/vida-stack-lite', GITHUB_REPOSITORY_ID: '1340911900',
  GITHUB_WORKFLOW_REF: 'pomazanbohdan/vida-stack-lite/.github/workflows/agent-native-delivery.yml@refs/heads/main',
  GITHUB_REF: 'refs/heads/main', CI_SOURCE_COMMIT: source, GITHUB_SHA: source,
  CI_WINDOWS_RESULT: 'success', CI_LINUX_RESULT: 'success', CI_REQUEST: request('bun-windows-x64'),
  CI_REQUEST_LINUX: request('bun-linux-x64'), GITHUB_RUN_ID: ${JSON.stringify(runId)}, GITHUB_RUN_ATTEMPT: '1',
  CI_WINDOWS_PRODUCER_ATTEMPT: '1', CI_LINUX_PRODUCER_ATTEMPT: '1', CI_WINDOWS_ARTIFACT_ID: '1001',
  CI_LINUX_ARTIFACT_ID: '1002', GITHUB_TOKEN: 'fixture-token', GITHUB_OUTPUT: ${JSON.stringify(path.join(fixture, 'github-output'))}
}), error => error === stop);
assert.equal(consumed, 1);
assert.equal(storageCalls, 1);
console.log(JSON.stringify({ publisher_full_mode: true, storage_calls: storageCalls }));
`,
          { flag: 'wx' },
        );
        const child = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', script], {
          cwd: repoRoot,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
          },
          timeoutMs: 4000,
          stdoutLimitBytes: 65536,
          stderrLimitBytes: 65536,
          terminateOnOutputLimit: true,
        });
        assert.equal(child.exitCode, 0, child.stderr.toString());
        assert.equal(child.closeObserved, true);
        assert.equal(child.timedOut, false);
        assert.equal(child.signal, null);
        assert.equal(child.childError, null);
        assert.equal(child.stdoutTruncated, false);
        assert.equal(child.stderrTruncated, false);
        const proof: unknown = JSON.parse(child.stdout.toString());
        assert.ok(isRecord(proof));
        assert.equal(proof.publisher_full_mode, true);
        assert.equal(proof.storage_calls, 1);
        completed = true;
      } finally {
        if (completed) {
          assert.equal(path.dirname(path.resolve(fixture)), path.resolve(os.tmpdir()));
          assert.ok(path.basename(fixture).startsWith('vida-publisher-full-mode-'));
          rmSync(fixture, { recursive: true, force: true });
          if (existsSync(diagnostic)) unlinkSync(diagnostic);
        } else console.error(`retained publisher transport fixture: ${fixture}; diagnostic: ${diagnostic}`);
      }
    },
  );

  test('bounded read client rejects a later200 after a partial206 without retry', async () => {
    const storageUrl = 'https://release-assets.githubusercontent.com/range?signature=secret';
    let storageCalls = 0;
    const client = createPublishedReleaseReadClient('secret-token', async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://api.github.com/'))
        return new Response(null, { status: 302, headers: { location: storageUrl } });
      storageCalls++;
      return storageCalls === 1
        ? new Response(Buffer.alloc(8 * 1024 * 1024), {
            status: 206,
            headers: { 'content-range': 'bytes 0-8388607/8388609' },
          })
        : new Response(Buffer.from('fallback'), { status: 200 });
    });
    await assert.rejects(() => client.download(46));
    assert.equal(storageCalls, 2);
  });

  test('bounded read client uses one300000ms storage deadline and refuses a later abort', async () => {
    const storageUrl = 'https://release-assets.githubusercontent.com/range?signature=secret';
    const controller = new AbortController();
    const original = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout');
    const durations: number[] = [];
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: (milliseconds: number) => {
        durations.push(milliseconds);
        return durations.length === 1 ? new AbortController().signal : controller.signal;
      },
      writable: true,
    });
    let storageCalls = 0;
    const signals: AbortSignal[] = [];
    try {
      const client = createPublishedReleaseReadClient('secret-token', async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith('https://api.github.com/'))
          return new Response(null, { status: 302, headers: { location: storageUrl } });
        storageCalls++;
        assert.ok(init?.signal instanceof AbortSignal);
        signals.push(init.signal);
        if (storageCalls === 1)
          return new Response(Buffer.alloc(8 * 1024 * 1024), {
            status: 206,
            headers: { 'content-range': 'bytes 0-8388607/8388609' },
          });
        controller.abort();
        throw new DOMException('aborted', 'AbortError');
      });
      await assert.rejects(() => client.download(47));
      assert.equal(storageCalls, 2);
      assert.equal(durations.length, 2);
      assert.deepEqual(durations, [300000, 300000]);
      assert.equal(signals[0]?.aborted, true);
      assert.equal(signals[1], signals[0]);
    } finally {
      if (original) Object.defineProperty(AbortSignal, 'timeout', original);
      else Reflect.deleteProperty(AbortSignal, 'timeout');
    }
  });

  test('bounded read client rejects oversized, encoded, and truncated range responses', async () => {
    const storageUrl = 'https://release-assets.githubusercontent.com/range?signature=secret';
    const cases = [
      { contentRange: 'bytes 0-8388607/268435457', encoding: null, body: Buffer.alloc(0) },
      { contentRange: 'bytes 0-8388607/8388608', encoding: 'gzip', body: Buffer.alloc(0) },
      { contentRange: 'bytes 0-8388607/8388608', encoding: null, body: Buffer.alloc(8 * 1024 * 1024 - 1) },
    ];
    for (const [index, entry] of cases.entries()) {
      let storageCalls = 0;
      const client = createPublishedReleaseReadClient('secret-token', async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith('https://api.github.com/'))
          return new Response(null, { status: 302, headers: { location: storageUrl } });
        storageCalls++;
        return new Response(entry.body, {
          status: 206,
          headers: {
            'content-range': entry.contentRange,
            ...(entry.encoding === null ? {} : { 'content-encoding': entry.encoding }),
          },
        });
      });
      await assert.rejects(() => client.download(48 + index));
      assert.equal(storageCalls, 1);
    }
  });

  test('bounded read client aborts its owned storage request after rejected range proof', async () => {
    const signals: AbortSignal[] = [];
    const client = createPublishedReleaseReadClient('token', async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://api.github.com/'))
        return new Response(null, {
          status: 302,
          headers: { location: 'https://release-assets.githubusercontent.com/rejected' },
        });
      assert.ok(init?.signal instanceof AbortSignal);
      signals.push(init.signal);
      return new Response(Buffer.from('untrusted'), { status: 206 });
    });
    await assert.rejects(() => client.download(50), /release asset range missing/);
    assert.equal(signals.length, 1);
    assert.equal(signals[0]?.aborted, true);
  });

  test('bounded read client awaits complete storage200 bytes before aborting owned transport', async () => {
    const signals: AbortSignal[] = [];
    let pulls = 0;
    const client = createPublishedReleaseReadClient('token', async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://api.github.com/'))
        return new Response(null, {
          status: 302,
          headers: { location: 'https://release-assets.githubusercontent.com/full-body' },
        });
      assert.ok(init?.signal instanceof AbortSignal);
      signals.push(init.signal);
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            assert.equal(signals[0]?.aborted, false);
            pulls++;
            controller.enqueue(Buffer.from(pulls === 1 ? 'first' : 'last'));
            if (pulls === 2) controller.close();
          },
        }),
      );
    });
    assert.deepEqual(await client.download(51), Buffer.from('firstlast'));
    assert.equal(pulls, 2);
    assert.equal(signals.length, 1);
    assert.equal(signals[0]?.aborted, true);
  });

  test('bounded read client propagates an abort during storage body consumption', async () => {
    const timer = new AbortController();
    const original = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout');
    const reason = new DOMException('body deadline', 'TimeoutError');
    let timeouts = 0;
    let storageCalls = 0;
    let pulls = 0;
    Object.defineProperty(AbortSignal, 'timeout', {
      configurable: true,
      value: () => (++timeouts === 1 ? new AbortController().signal : timer.signal),
    });
    try {
      const client = createPublishedReleaseReadClient('token', async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith('https://api.github.com/'))
          return new Response(null, {
            status: 302,
            headers: { location: 'https://release-assets.githubusercontent.com/body-abort' },
          });
        storageCalls++;
        assert.ok(init?.signal instanceof AbortSignal);
        const signal = init.signal;
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              signal.addEventListener('abort', () => controller.error(signal.reason), { once: true });
            },
            pull(controller) {
              pulls++;
              if (pulls === 1) controller.enqueue(Buffer.from('a'));
              else timer.abort(reason);
            },
          }),
          { status: 206, headers: { 'content-range': 'bytes 0-2/3' } },
        );
      });
      await assert.rejects(
        () => client.download(52),
        (error) => error === reason,
      );
      assert.equal(timeouts, 2);
      assert.equal(storageCalls, 1);
      assert.equal(pulls, 2);
    } finally {
      if (original) Object.defineProperty(AbortSignal, 'timeout', original);
      else Reflect.deleteProperty(AbortSignal, 'timeout');
    }
  });

  test('bounded read client refuses changed totals, overlaps, and short later ranges without retry', async () => {
    const first = Buffer.alloc(8 * 1024 * 1024);
    for (const contentRange of [
      'bytes 8388608-8388609/8388610',
      'bytes 8388607-8388610/8388611',
      'bytes 8388608-8388609/8388611',
    ]) {
      let storageCalls = 0;
      const client = createPublishedReleaseReadClient('token', async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith('https://api.github.com/'))
          return new Response(null, {
            status: 302,
            headers: { location: 'https://release-assets.githubusercontent.com/later-proof' },
          });
        storageCalls++;
        return storageCalls === 1
          ? new Response(first, { status: 206, headers: { 'content-range': 'bytes 0-8388607/8388611' } })
          : new Response(Buffer.from('abc'), { status: 206, headers: { 'content-range': contentRange } });
      });
      await assert.rejects(() => client.download(53), /release asset range (total changed|offset rejected)/);
      assert.equal(storageCalls, 2);
    }
  });

  test('bounded read client rejects invalid asset ids before fetch', async () => {
    let calls = 0;
    const client = createPublishedReleaseReadClient('secret-token', async () => {
      calls++;
      return new Response(null, { status: 200 });
    });
    await assert.rejects(() => client.download(Number.MAX_SAFE_INTEGER + 1));
    await assert.rejects(() => client.download(0));
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
