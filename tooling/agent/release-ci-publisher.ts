import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  downloadGitHubCIProducerArtifact,
  readCIProducerFormationMembers,
  validateCIProducerFormationMembers,
  validateCIDeliveryRequest,
  validateCIDownloadLocation,
  type CIDeliveryRequest,
  type ProducerDownloadEvent,
} from './release-ci-evidence.ts';
import {
  publishGitHubRelease,
  type PublicationAPI,
  type PublicationReadAPI,
  type PublicationProducer,
} from './release-github-publication.ts';
import { releaseSourceBinding, releaseJSON, releasePath } from '../../packages/agent/bin/local-release-artifacts.ts';
import { checkManifest, readPin } from '../../packages/agent/bin/bun.ts';

const repo = 'pomazanbohdan/vida-stack-lite';
const apiBase = `https://api.github.com/repos/${repo}`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
type Fetch = (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;
const guardErrors = new WeakSet<Error>();
const good = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
function need(ok: unknown, why: string): asserts ok {
  if (!ok) {
    const error = new Error(why);
    guardErrors.add(error);
    throw error;
  }
}
const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const controlled = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && !/[\p{Cc}]/u.test(v);
const positive = (v: string | undefined): number => {
  need(v !== undefined && /^[1-9]\d*$/.test(v), 'invalid producer identity');
  const n = Number(v);
  need(Number.isSafeInteger(n), 'invalid producer identity');
  return n;
};
function request(
  env: NodeJS.ProcessEnv,
  key: string,
  target: string,
  binding: string,
  version: string,
): CIDeliveryRequest {
  const raw = env[key];
  need(typeof raw === 'string' && Buffer.byteLength(raw) <= 65536, 'invalid CI request');
  const value: unknown = JSON.parse(raw);
  validateCIDeliveryRequest(value);
  need(
    value.target === target &&
      value.repository_id === 'vida-agent' &&
      value.project_ids.length === 1 &&
      value.project_ids[0] === 'agent' &&
      value.version === version &&
      value.source_binding === binding,
    'CI request identity differs',
  );
  return value;
}
async function response(
  fetcher: Fetch,
  url: string,
  init: RequestInit,
  redirect: RequestInit['redirect'] = 'error',
): Promise<Response> {
  const res = await fetcher(url, {
    ...init,
    redirect,
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
  return res;
}
async function bodyBytes(res: Response, limit: number): Promise<Buffer> {
  need(res.body !== null, 'response body missing');
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('response exceeds size limit');
      }
      chunks.push(item.value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  }
  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    size,
  );
}
async function jsonResponse(res: Response): Promise<unknown> {
  const links = res.headers.get('link');
  need(!links || !/rel="?next"?/i.test(links), 'GitHub pagination incomplete');
  const bytes = await bodyBytes(res, 8 * 1024 * 1024);
  try {
    const parsed: unknown = JSON.parse(bytes.toString('utf8'));
    need(parsed !== null, 'GitHub JSON invalid');
    return parsed;
  } catch {
    throw new Error('GitHub JSON invalid');
  }
}
type Stage =
  | 'startup'
  | 'source'
  | 'publication'
  | 'producer-linux'
  | 'producer-windows'
  | 'members'
  | 'validation'
  | 'receipt';

export function diagnosticRoute(input: string): string {
  try {
    const url = new URL(input);
    if (url.hostname !== 'api.github.com' && url.hostname !== 'uploads.github.com') return 'storage';
    const p = url.pathname;
    if (/\/actions\/runs\/\d+\/attempts\/\d+\/jobs$/.test(p)) return 'producer-jobs';
    if (/\/actions\/runs\//.test(p)) return 'producer-run';
    if (/\/contents\//.test(p)) return 'producer-workflow';
    if (/\/actions\/artifacts\/\d+\/zip$/.test(p)) return 'producer-redirect';
    if (/\/actions\/artifacts\//.test(p)) return 'producer-artifact';
    if (/\/git\/commits\//.test(p)) return 'commit';
    if (/\/git\/refs?\//.test(p)) return 'tag-ref';
    if (/\/git\/tags/.test(p)) return 'tag';
    if (/\/assets(?:\/|$)/.test(p)) return 'asset';
    if (/\/releases(?:\/|$)/.test(p)) return 'release';
  } catch {
    /* Retain only a fixed route class. */
  }
  return 'other';
}

export class PublicationDiagnostic {
  private fd: number;
  private count = 0;
  private bytes = 0;
  private firstError = false;
  stage: Stage = 'startup';
  constructor(directory: string, run: string, attempt: string) {
    if (!/^[1-9]\d*$/.test(run) || !/^[1-9]\d*$/.test(attempt)) throw new Error('invalid diagnostic identity');
    mkdirSync(directory, { recursive: true });
    this.fd = openSync(path.join(directory, `diagnostic-${run}-${attempt}.ndjson`), 'wx', 0o600);
    this.event('start');
  }
  event(
    event: 'start' | 'stage' | 'request' | 'response' | 'error' | 'terminal',
    details: {
      route?: string;
      method?: 'GET' | 'POST' | 'PATCH' | 'OTHER';
      status?: number;
      error?: unknown;
      outcome?: 'success' | 'failure';
    } = {},
  ): void {
    if (event === 'error' && this.firstError) return;
    if (event === 'error') this.firstError = true;
    const errorCode =
      details.error instanceof Error &&
      'code' in details.error &&
      typeof details.error.code === 'string' &&
      ['EACCES', 'EEXIST', 'ENOENT', 'ENOSPC', 'ETIMEDOUT', 'ECONNRESET'].includes(details.error.code)
        ? details.error.code
        : undefined;
    const row = {
      event,
      stage: this.stage,
      ...(details.route &&
      [
        'commit',
        'tag-ref',
        'tag',
        'release',
        'asset',
        'producer-run',
        'producer-workflow',
        'producer-jobs',
        'producer-artifact',
        'producer-redirect',
        'storage',
        'other',
      ].includes(details.route)
        ? { route: details.route }
        : {}),
      ...(event === 'request' && details.method ? { method: details.method } : {}),
      ...(Number.isInteger(details.status) && details.status! >= 100 && details.status! <= 599
        ? { status: details.status }
        : {}),
      ...(event === 'error'
        ? {
            type: details.error instanceof Error ? 'Error' : 'unknown',
            kind: details.error instanceof Error && guardErrors.has(details.error) ? 'guard' : 'exception',
            ...(errorCode ? { code: errorCode } : {}),
            sites: [],
          }
        : {}),
      ...(details.outcome ? { outcome: details.outcome } : {}),
    };
    const data = Buffer.from(JSON.stringify(row) + '\n');
    const reserved = event === 'error' || event === 'terminal';
    if (
      (!reserved && (this.count >= 254 || this.bytes + data.length > 64000)) ||
      this.count >= 256 ||
      this.bytes + data.length > 65536
    )
      return;
    for (let offset = 0; offset < data.length;) {
      const written = writeSync(this.fd, data, offset, data.length - offset);
      if (written <= 0) throw new Error('diagnostic write failed');
      offset += written;
    }
    this.count++;
    this.bytes += data.length;
  }
  close(outcome: 'success' | 'failure'): void {
    try {
      this.event('terminal', { outcome });
      fsyncSync(this.fd);
    } finally {
      closeSync(this.fd);
    }
  }
}

export async function observedPublicationFetch(
  diagnostic: PublicationDiagnostic,
  fetcher: Fetch,
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
): Promise<Response> {
  const route = diagnosticRoute(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  diagnostic.event('request', {
    route,
    method: method === 'GET' || method === 'POST' || method === 'PATCH' ? method : 'OTHER',
  });
  const res = await fetcher(input, init);
  diagnostic.event('response', { route, status: res.status });
  return res;
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<unknown> {
  if (!/^[1-9]\d*$/.test(env.GITHUB_RUN_ID ?? '') || !/^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''))
    return publisherMain(env);
  const diagnostic = new PublicationDiagnostic(
    path.join(root, '.tmp/ci-publication'),
    env.GITHUB_RUN_ID!,
    env.GITHUB_RUN_ATTEMPT!,
  );
  const originalFetch = globalThis.fetch;
  const tracedFetch: Fetch = (input, init) => observedPublicationFetch(diagnostic, originalFetch, input, init);
  let outcome: 'success' | 'failure' = 'failure';
  try {
    const result = await publisherMain(env, diagnostic, tracedFetch);
    outcome = 'success';
    return result;
  } catch (error) {
    diagnostic.event('error', { error });
    throw error;
  } finally {
    diagnostic.close(outcome);
  }
}

function createNativeGitHubReleaseClient(token: string, fetcher: Fetch = fetch): PublicationAPI {
  need(controlled(token), 'publisher token missing');
  return {
    async json(method, suffix, data, allow404 = false) {
      const headers = new Headers({
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${token}`,
      });
      if (data !== undefined) headers.set('Content-Type', 'application/json');
      const res = await fetcher(apiBase + suffix, {
        method,
        headers,
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
        redirect: 'error',
        signal: AbortSignal.timeout(300000),
      });
      if (allow404 && res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
      return jsonResponse(res);
    },
    async upload(id, file, data) {
      const url = `https://uploads.github.com/repos/${repo}/releases/${id}/assets?name=${encodeURIComponent(file)}`;
      const res = await response(fetcher, url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(data.length),
        },
        body: data,
      });
      return jsonResponse(res);
    },
    async download(id) {
      const url = `${apiBase}/releases/assets/${id}`;
      const res = await fetcher(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/octet-stream',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(300000),
      });
      if (res.status === 200) return bodyBytes(res, 256 * 1024 * 1024);
      need(res.status === 302, 'release asset redirect status rejected');
      const location = validateCIDownloadLocation(res.headers.get('location'), [
        'release-assets.githubusercontent.com',
      ]);
      const storage = new URL(location);
      need(storage.hostname === 'release-assets.githubusercontent.com', 'release asset host rejected');
      return bodyBytes(
        await response(fetcher, location, {
          headers: { Accept: 'application/octet-stream' },
        }),
        256 * 1024 * 1024,
      );
    },
  };
}

export function createPublishedReleaseReadClient(token: string, fetcher: Fetch = fetch): PublicationReadAPI {
  const api = createNativeGitHubReleaseClient(token, fetcher);
  return {
    async json(method, suffix, body, allow404) {
      need(method === 'GET' && body === undefined, 'read-only transport rejected');
      return api.json('GET', suffix, undefined, allow404);
    },
    async download(id) {
      need(Number.isSafeInteger(id) && id > 0, 'asset id invalid');
      return api.download(id);
    },
  };
}

async function publisherMain(
  env: NodeJS.ProcessEnv,
  diagnostic?: PublicationDiagnostic,
  fetcher: Fetch = globalThis.fetch,
): Promise<unknown> {
  need(
    env.CI === 'true' &&
      env.GITHUB_ACTIONS === 'true' &&
      env.VIDA_NATIVE_CI_ENABLED === 'true' &&
      env.GITHUB_JOB === 'publish',
    'publisher ingress rejected',
  );
  need(
    process.platform === 'win32' &&
      process.arch === 'x64' &&
      env.GITHUB_REPOSITORY === repo &&
      env.GITHUB_REPOSITORY_ID === '1340911900',
    'publisher runner identity rejected',
  );
  need(
    env.GITHUB_WORKFLOW_REF === `${repo}/.github/workflows/agent-native-delivery.yml@refs/heads/main` &&
      env.GITHUB_REF === 'refs/heads/main',
    'publisher workflow ref rejected',
  );
  if (diagnostic) {
    diagnostic.stage = 'source';
    diagnostic.event('stage');
  }
  const source = env.CI_SOURCE_COMMIT;
  need(
    typeof source === 'string' && /^[a-f0-9]{40}$/.test(source) && source === env.GITHUB_SHA,
    'source commit rejected',
  );
  const pin = readPin(path.join(root, 'packages/agent'));
  checkManifest(path.join(root, 'packages/agent'), pin);
  need(process.versions.bun === pin, 'publisher Bun pin differs');
  need(env.CI_WINDOWS_RESULT === 'success' && env.CI_LINUX_RESULT === 'success', 'producer workflow result rejected');
  const packageValue: unknown = JSON.parse(readFileSync(path.join(root, 'packages/agent/package.json'), 'utf8'));
  need(good(packageValue), 'package manifest invalid');
  const version: unknown = packageValue.version;
  need(typeof version === 'string', 'package version invalid');
  const binding = releaseSourceBinding(root).source_binding;
  const win = request(env, 'CI_REQUEST', 'bun-windows-x64', binding, version);
  const lin = request(env, 'CI_REQUEST_LINUX', 'bun-linux-x64', binding, version);
  need(win.operation_id === lin.operation_id, 'producer operations differ');
  const runId = positive(env.GITHUB_RUN_ID);
  positive(env.GITHUB_RUN_ATTEMPT);
  const winProducer: PublicationProducer = {
    request: win,
    run_id: String(runId),
    run_attempt: positive(env.CI_WINDOWS_PRODUCER_ATTEMPT),
    artifact_id: String(positive(env.CI_WINDOWS_ARTIFACT_ID)),
  };
  const linProducer: PublicationProducer = {
    request: lin,
    run_id: String(runId),
    run_attempt: positive(env.CI_LINUX_PRODUCER_ATTEMPT),
    artifact_id: String(positive(env.CI_LINUX_ARTIFACT_ID)),
  };
  need(winProducer.run_attempt === linProducer.run_attempt, 'producer attempts differ');
  need(controlled(env.GITHUB_TOKEN), 'publisher token missing');
  const token = env.GITHUB_TOKEN;
  const api = createNativeGitHubReleaseClient(token, fetcher);
  const commitResponse = await api.json('GET', `/git/commits/${source}`);
  need(
    good(commitResponse) &&
      commitResponse.sha === source &&
      good(commitResponse.committer) &&
      typeof commitResponse.committer.date === 'string' &&
      commitResponse.committer.date.endsWith('Z'),
    'source commit date invalid',
  );
  const workflow = readFileSync(path.join(root, '.github/workflows/agent-native-delivery.yml'));
  const bashInstallerHash = sha(readFileSync(releasePath(root, 'install/install.sh')));
  const githubOutput = env.GITHUB_OUTPUT;
  need(controlled(githubOutput), 'publisher output context unavailable');
  if (diagnostic) {
    diagnostic.stage = 'publication';
    diagnostic.event('stage');
  }
  const receipt = await publishGitHubRelease({
    api,
    identity: {
      operation_id: win.operation_id,
      version,
      source_commit: source,
      source_binding: binding,
    },
    tagger_date: commitResponse.committer.date,
    async formAssets(existing) {
      const producers = [...(existing?.producers ?? [linProducer, winProducer])].sort((left, right) =>
        left.request.target.localeCompare(right.request.target),
      );
      need(producers.length === 2, 'producer pair invalid');
      const assets: Array<{ file: string; data: Buffer }> = [];
      const candidates: Array<Record<string, unknown>> = [];
      // Establish the publication-wide Source quality proof before either target is downloaded.
      const targets: string[] = ['bun-linux-x64', 'bun-windows-x64'];
      for (const target of targets) {
        if (diagnostic) {
          diagnostic.stage = target === 'bun-windows-x64' ? 'producer-windows' : 'producer-linux';
          diagnostic.event('stage');
        }
        const selectedRequest = target === 'bun-windows-x64' ? win : lin;
        const producer = producers.find((item) => item.request.target === target);
        need(
          producer && releaseJSON(producer.request) === releaseJSON(selectedRequest),
          'recovered producer request differs',
        );
        const profile = {
          issuer: 'github-actions',
          repository_id: 'vida-agent',
          project_ids: ['agent'],
          target,
          required_checks: ['native-build'],
          github: {
            repository: repo,
            repository_id: 1340911900,
            workflow_id: 374583166,
            source_commit: source,
            workflow_path: '.github/workflows/agent-native-delivery.yml',
            workflow_sha256: sha(workflow),
            job: target === 'bun-windows-x64' ? 'native-windows-x64' : 'native-linux-x64',
            steps: [{ id: 'native-build', name: 'native-build' }],
          },
        };
        const downloaded = await downloadGitHubCIProducerArtifact({
          root,
          token,
          signal: AbortSignal.timeout(300000),
          request: selectedRequest,
          profile,
          run_id: producer.run_id,
          run_attempt: producer.run_attempt,
          artifact_id: producer.artifact_id,
          ...(diagnostic ? { observer: (event: ProducerDownloadEvent) => diagnostic.event(event.phase, event) } : {}),
        });
        const windows = target === 'bun-windows-x64';
        const installer = readFileSync(
          path.join(root, windows ? 'packages/agent/tooling/install-windows.ps1' : 'install/install.sh'),
        );
        if (diagnostic) {
          diagnostic.stage = 'members';
          diagnostic.event('stage');
        }
        const members = await readCIProducerFormationMembers({
          root,
          request: selectedRequest,
          transport_path: downloaded.transport_path,
          installer_bytes: installer,
        });
        if (diagnostic) {
          diagnostic.stage = 'validation';
          diagnostic.event('stage');
        }
        const checked = validateCIProducerFormationMembers({
          request: selectedRequest,
          members,
          providerObservation: {
            issuer: 'github-actions',
            run_id: producer.run_id,
            run_attempt: producer.run_attempt,
            artifact_id: producer.artifact_id,
          },
          profile,
        });
        need(checked.candidate.manifest.pin === pin, 'candidate Bun pin differs');
        const suffix = windows ? 'windows-x64' : 'linux-x64';
        const executableName = `vida-agent-${target}${windows ? '.exe' : ''}`;
        need(checked.candidate.manifest.asset.file === executableName, 'native asset name differs');
        const exec = members.asset_bytes;
        const manifest = Buffer.from(members.manifest_bytes);
        assets.push(
          { file: executableName, data: exec },
          { file: `vida-agent-${target}.manifest.json`, data: manifest },
        );
        assets.push({
          file: `SHA256SUMS-${suffix}`,
          data: Buffer.from(`${sha(manifest)}  vida-agent-${target}.manifest.json\n${sha(exec)}  ${executableName}\n`),
        });
        assets.push({
          file: windows ? 'install-windows.ps1' : 'install.sh',
          data: members.installer_bytes,
        });
        if (!windows) need(sha(members.installer_bytes) === bashInstallerHash, 'Linux installer Source changed');
        candidates.push({
          target,
          request_id: selectedRequest.request_id,
          archive_sha256: checked.candidate.archive_sha256,
          manifest_sha256: checked.candidate.manifest_sha256,
          payload_id: checked.candidate.manifest.payloadId,
          payload_bytes: checked.candidate.manifest.asset.bytes,
          payload_sha256: checked.candidate.manifest.asset.sha256,
          executable: {
            file: executableName,
            bytes: exec.length,
            sha256: sha(exec),
          },
        });
      }
      const proof = {
        schema: 'VidaGitHubProducerProof/v1',
        source_commit: source,
        version,
        source_binding: binding,
        producers: producers.map(({ request: producerRequest, run_id, run_attempt, artifact_id }) => ({
          request: producerRequest,
          run_id,
          run_attempt,
          artifact_id,
        })),
        candidates,
      };
      assets.push({
        file: 'publication-provenance.json',
        data: Buffer.from(releaseJSON(proof) + '\n'),
      });
      if (diagnostic) {
        diagnostic.stage = 'publication';
        diagnostic.event('stage');
      }
      return { producers, assets };
    },
  });
  if (diagnostic) {
    diagnostic.stage = 'receipt';
    diagnostic.event('stage');
  }
  const receiptDir = path.join(root, '.tmp/ci-publication');
  mkdirSync(receiptDir, { recursive: true });
  const output = path.join(receiptDir, 'receipt.json');
  writeFileSync(output, JSON.stringify(receipt) + '\n', { flag: 'wx' });
  writeFileSync(githubOutput, `tag=${receipt.tag}\nversion=${version}\nbash_installer_sha256=${bashInstallerHash}\n`, {
    flag: 'a',
  });
  process.stdout.write(JSON.stringify(receipt) + '\n');
  return receipt;
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const detail =
      error instanceof Error && /^GitHub HTTP \d{3}$/.test(error.message)
        ? error.message.slice(0, 512)
        : 'publisher check or transport failed; retain remote state and inspect before retry';
    process.stderr.write(`publication failed: ${detail}\n`);
    process.exitCode = 1;
  });
}
