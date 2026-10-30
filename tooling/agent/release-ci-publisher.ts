import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  downloadGitHubCIProducerArtifact,
  readCIProducerFormationMembers,
  validateCIProducerFormationMembers,
  validateCIDeliveryRequest,
  validateCIDownloadLocation,
  type CIDeliveryRequest,
} from './release-ci-evidence.ts';
import { publishGitHubRelease, type PublicationAPI, type PublicationProducer } from './release-github-publication.ts';
import { releaseSourceBinding, releaseJSON } from '../../packages/agent/bin/local-release-artifacts.ts';
import { checkManifest, readPin } from '../../packages/agent/bin/bun.ts';

const repo = 'pomazanbohdan/vida-stack-lite';
const apiBase = `https://api.github.com/repos/${repo}`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const good = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
function need(ok: unknown, why: string): asserts ok {
  if (!ok) throw new Error(why);
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
  url: string,
  init: RequestInit,
  redirect: RequestInit['redirect'] = 'error',
): Promise<Response> {
  const res = await fetch(url, {
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
export async function main(env: NodeJS.ProcessEnv = process.env): Promise<unknown> {
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
  const api: PublicationAPI = {
    async json(method, suffix, data, allow404 = false) {
      const headers = new Headers({
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${token}`,
      });
      if (data !== undefined) headers.set('Content-Type', 'application/json');
      const res = await fetch(apiBase + suffix, {
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
      const res = await response(url, {
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
      const res = await fetch(url, {
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
        await response(location, {
          headers: { Accept: 'application/octet-stream' },
        }),
        256 * 1024 * 1024,
      );
    },
  };
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
      const targets: string[] = ['bun-windows-x64', 'bun-linux-x64'];
      for (const target of targets) {
        const selectedRequest = target === 'bun-windows-x64' ? win : lin;
        const producer = producers.find((item) => item.request.target === target);
        need(
          producer && releaseJSON(producer.request) === releaseJSON(selectedRequest),
          'recovered producer request differs',
        );
        const artifactResponse = await fetch(`${apiBase}/actions/artifacts/${producer.artifact_id}/zip`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          redirect: 'manual',
          signal: AbortSignal.timeout(300000),
        });
        need(artifactResponse.status === 302, 'artifact redirect status rejected');
        const artifactLocation = artifactResponse.headers.get('location');
        need(controlled(artifactLocation), 'artifact redirect missing');
        const first = new URL(artifactLocation);
        need(
          first.protocol === 'https:' &&
            !first.username &&
            !first.password &&
            !first.port &&
            !first.hash &&
            /^productionresults[a-z0-9-]*\.blob\.core\.windows\.net$/.test(first.hostname),
          'artifact host rejected',
        );
        validateCIDownloadLocation(artifactLocation, [first.hostname]);
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
            artifact_hosts: [first.hostname],
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
        });
        const windows = target === 'bun-windows-x64';
        const installer = readFileSync(
          path.join(root, windows ? 'packages/agent/tooling/install-windows.ps1' : 'install/install.sh'),
        );
        const members = await readCIProducerFormationMembers({
          root,
          request: selectedRequest,
          transport_path: downloaded.transport_path,
          installer_bytes: installer,
        });
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
      return { producers, assets };
    },
  });
  const receiptDir = path.join(root, '.tmp/ci-publication');
  mkdirSync(receiptDir, { recursive: true });
  const output = path.join(receiptDir, 'receipt.json');
  writeFileSync(output, JSON.stringify(receipt) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify(receipt) + '\n');
  return receipt;
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const detail =
      error instanceof Error &&
      /^(?:GitHub HTTP \d{3}$|GitHub publication: |GAP-VIDA-CI-DELIVERY-001: )/.test(error.message)
        ? error.message.slice(0, 512)
        : 'publisher check or transport failed; retain remote state and inspect before retry';
    process.stderr.write(`publication failed: ${detail}\n`);
    process.exitCode = 1;
  });
}
