import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'bun:test';
import {
  downloadGitHubCIDelivery,
  downloadGitHubCIProducerArtifact,
  type CIDeliveryRequest,
} from '../../../tooling/agent/release-ci-evidence.ts';
import { releaseDigest, releaseJSON } from '../bin/local-release-artifacts.ts';

const sourceCommit = 'a'.repeat(40);
const workflowBytes = Buffer.from('workflow definition fixture');
const transportBytes = Buffer.from('opaque selected artifact ZIP bytes');
const storageURL = 'https://ci-artifacts.blob.core.windows.net/selected.zip';

function requestFixture(target: 'bun-windows-x64' | 'bun-linux-x64' = 'bun-windows-x64'): CIDeliveryRequest {
  const body: Omit<CIDeliveryRequest, 'request_id'> = {
    schema: 'VidaCIDeliveryRequest/v1',
    operation_id: 'ci-producer-download-test',
    version: '1.2.3',
    repository_id: 'vida-agent',
    project_ids: ['agent'],
    target,
    source_binding: 'b'.repeat(64),
  };
  return { ...body, request_id: releaseDigest(releaseJSON(body)) };
}

function profileFixture(request: ReturnType<typeof requestFixture>) {
  return {
    issuer: 'github-actions',
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    target: request.target,
    required_checks: ['native-build'],
    github: {
      repository: 'pomazanbohdan/vida-stack-lite',
      repository_id: 1340911900,
      workflow_id: 374583166,
      source_commit: sourceCommit,
      workflow_path: '.github/workflows/agent-native-delivery.yml',
      workflow_sha256: releaseDigest(workflowBytes),
      job: request.target === 'bun-linux-x64' ? 'native-linux-x64' : 'native-windows-x64',
      steps: [{ id: 'native-build', name: 'native-build' }],
      artifact_hosts: ['ci-artifacts.blob.core.windows.net'],
    },
  };
}

function providerFixture(
  request: ReturnType<typeof requestFixture>,
  changes: {
    run?: Record<string, unknown>;
    job?: Record<string, unknown>;
    artifact?: Record<string, unknown>;
    redirect?: string;
    transport?: Buffer;
  } = {},
) {
  const run = {
    id: 123,
    run_attempt: 1,
    head_sha: sourceCommit,
    workflow_id: 374583166,
    path: '.github/workflows/agent-native-delivery.yml',
    event: 'workflow_dispatch',
    status: 'in_progress',
    conclusion: null,
    repository: { id: 1340911900, full_name: 'pomazanbohdan/vida-stack-lite' },
    head_repository: { id: 1340911900 },
    ...changes.run,
  };
  const job = {
    name: request.target === 'bun-linux-x64' ? 'native-linux-x64' : 'native-windows-x64',
    run_id: 123,
    run_attempt: 1,
    status: 'completed',
    conclusion: 'success',
    started_at: '2026-10-30T09:00:00Z',
    completed_at: '2026-10-30T09:01:00Z',
    steps:
      request.target === 'bun-linux-x64'
        ? Object.values(linuxSteps())
        : [{ name: 'native-build', status: 'completed', conclusion: 'success' }],
    ...changes.job,
  };
  const bytes = changes.transport ?? transportBytes;
  const artifact = {
    id: 456,
    name: `build-${request.request_id}-123-1`,
    expired: false,
    digest: `sha256:${releaseDigest(bytes)}`,
    created_at: '2026-10-30T09:00:30Z',
    workflow_run: {
      id: 123,
      repository_id: 1340911900,
      head_repository_id: 1340911900,
      head_sha: sourceCommit,
    },
    ...changes.artifact,
  };
  return { run, job, artifact, bytes, redirect: changes.redirect ?? storageURL };
}

async function withStubbedFetch<T>(
  fixture: ReturnType<typeof providerFixture>,
  action: (state: { calls: string[]; storageCalls: number; storageAuthorization: string | null }) => Promise<T>,
): Promise<T> {
  const previousFetch = globalThis.fetch;
  const state: { calls: string[]; storageCalls: number; storageAuthorization: string | null } = {
    calls: [],
    storageCalls: 0,
    storageAuthorization: null,
  };
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = new URL(input instanceof Request ? input.url : input instanceof URL ? input.href : input);
      state.calls.push(url.href);
      if (url.hostname === 'api.github.com') {
        if (url.pathname.endsWith('/actions/runs/123/attempts/1')) return Response.json(fixture.run);
        if (
          url.pathname === '/repos/pomazanbohdan/vida-stack-lite/contents/.github/workflows/agent-native-delivery.yml'
        )
          return Response.json({ encoding: 'base64', content: workflowBytes.toString('base64') });
        if (url.pathname.endsWith('/actions/runs/123/attempts/1/jobs'))
          return Response.json({ jobs: [fixture.job], total_count: 1 });
        if (url.pathname === '/repos/pomazanbohdan/vida-stack-lite/actions/artifacts/456')
          return Response.json(fixture.artifact);
        if (url.pathname === '/repos/pomazanbohdan/vida-stack-lite/actions/artifacts/456/zip')
          return new Response(null, { status: 302, headers: { location: fixture.redirect } });
        throw new Error(`unexpected API request: ${url.href}`);
      }
      state.storageCalls += 1;
      state.storageAuthorization = new Headers(init?.headers).get('authorization');
      return new Response(fixture.bytes, { status: 200 });
    },
    {
      preconnect: () => {
        throw new Error('unexpected preconnect');
      },
    },
  );
  try {
    return await action(state);
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test('producer downloader accepts the completed native producer during an in-progress workflow', async () => {
  const request = requestFixture();
  const profile = profileFixture(request);
  const successRoot = mkdtempSync(path.join(tmpdir(), 'vida-ci-producer-success-'));
  const successFixture = providerFixture(request);
  await withStubbedFetch(successFixture, async (state) => {
    const result = await downloadGitHubCIProducerArtifact({
      root: successRoot,
      token: 'explicit-api-token',
      request,
      profile,
      run_id: 123,
      run_attempt: 1,
      artifact_id: 456,
    });
    const downloaded = path.join(successRoot, result.transport_path);
    assert.equal(result.run_id, '123');
    assert.equal(result.artifact_id, '456');
    assert.deepEqual(readFileSync(downloaded), transportBytes);
    assert.equal(state.storageCalls, 1);
    assert.equal(state.storageAuthorization, null);
    rmSync(successRoot, { recursive: true, force: true });
  });

  const oldRoot = mkdtempSync(path.join(tmpdir(), 'vida-ci-producer-old-api-'));
  const oldFixture = providerFixture(request);
  await withStubbedFetch(oldFixture, async (state) => {
    await assert.rejects(
      downloadGitHubCIDelivery({
        root: oldRoot,
        token: 'explicit-api-token',
        request,
        profile,
        run_id: 123,
        run_attempt: 1,
        artifact_id: 456,
      }),
      /selected download run differs/,
    );
    assert.equal(state.calls.length, 1);
    assert.equal(state.storageCalls, 0);
    assert.equal(existsSync(path.join(oldRoot, '.tmp/ci-delivery', request.request_id, '123-1-456.zip')), false);
    rmSync(oldRoot, { recursive: true, force: true });
  });

  const negatives: Array<{
    name: string;
    error: RegExp;
    changes: Parameters<typeof providerFixture>[1];
    retained?: boolean;
  }> = [
    {
      name: 'formation artifact cannot substitute for a native build',
      error: /artifact differs from selected Source\/run attempt interval/,
      changes: { artifact: { name: `${request.request_id}-1` } },
    },
    {
      name: 'wrong source SHA',
      error: /selected download run differs/,
      changes: { run: { head_sha: 'c'.repeat(40) } },
    },
    { name: 'failed job', error: /selected download job differs/, changes: { job: { conclusion: 'failure' } } },
    {
      name: 'skipped required step',
      error: /required native step failed\/skipped/,
      changes: { job: { steps: [{ name: 'native-build', status: 'completed', conclusion: 'skipped' }] } },
    },
    {
      name: 'wrong artifact attempt name',
      error: /artifact differs from selected Source\/run attempt interval/,
      changes: { artifact: { name: `build-${request.request_id}-123-2` } },
    },
    {
      name: 'expired artifact',
      error: /artifact differs from selected Source\/run attempt interval/,
      changes: { artifact: { expired: true } },
    },
    {
      name: 'wrong redirect origin',
      error: /artifact redirect origin differs/,
      changes: { redirect: 'https://unapproved.invalid/selected.zip' },
    },
    {
      name: 'artifact digest mismatch',
      error: /download digest differs; retain custody/,
      changes: { artifact: { digest: `sha256:${'0'.repeat(64)}` } },
      retained: true,
    },
  ];
  for (const negative of negatives) {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-ci-producer-negative-'));
    const fixture = providerFixture(request, negative.changes);
    await withStubbedFetch(fixture, async (state) => {
      await assert.rejects(
        downloadGitHubCIProducerArtifact({
          root,
          token: 'explicit-api-token',
          request,
          profile,
          run_id: 123,
          run_attempt: 1,
          artifact_id: 456,
        }),
        negative.error,
        negative.name,
      );
      const retained = path.join(root, '.tmp/ci-delivery', request.request_id, '123-1-456.zip');
      if (negative.retained) {
        assert.deepEqual(readFileSync(retained), transportBytes);
        assert.equal(state.storageCalls, 1);
      } else {
        assert.equal(existsSync(retained), false);
        assert.equal(state.storageCalls, 0);
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
});

function linuxSteps() {
  return {
    quality: {
      name: 'full-source-quality',
      status: 'completed',
      conclusion: 'success',
      number: 8,
      started_at: '2026-10-30T09:00:01Z',
      completed_at: '2026-10-30T09:00:10Z',
    },
    native: {
      name: 'native-build',
      status: 'completed',
      conclusion: 'success',
      number: 9,
      started_at: '2026-10-30T09:00:11Z',
      completed_at: '2026-10-30T09:00:25Z',
    },
  };
}

test('Linux publication requires its exact successful pre-build Source quality step', async () => {
  const request = requestFixture('bun-linux-x64');
  const successfulRoot = mkdtempSync(path.join(tmpdir(), 'vida-ci-linux-quality-success-'));
  await withStubbedFetch(providerFixture(request), async (state) => {
    const result = await downloadGitHubCIProducerArtifact({
      root: successfulRoot,
      request,
      profile: profileFixture(request),
      token: 'explicit-api-token',
      run_id: 123,
      run_attempt: 1,
      artifact_id: 456,
    });
    assert.deepEqual(readFileSync(path.join(successfulRoot, result.transport_path)), transportBytes);
    assert.equal(state.storageCalls, 1);
    assert.equal(state.storageAuthorization, null);
  });
  rmSync(successfulRoot, { recursive: true, force: true });
  const { quality, native } = linuxSteps();
  const negatives: Array<{
    name: string;
    changes: Parameters<typeof providerFixture>[1];
    error: RegExp;
    workflowDigest?: string;
  }> = [
    { name: 'missing quality', changes: { job: { steps: [native] } }, error: /exactly one full-source-quality/ },
    {
      name: 'duplicate quality',
      changes: { job: { steps: [quality, quality, native] } },
      error: /exactly one full-source-quality/,
    },
    {
      name: 'skipped quality',
      changes: { job: { steps: [{ ...quality, conclusion: 'skipped' }, native] } },
      error: /source-quality step failed\/skipped/,
    },
    {
      name: 'failed quality',
      changes: { job: { steps: [{ ...quality, conclusion: 'failure' }, native] } },
      error: /source-quality step failed\/skipped/,
    },
    {
      name: 'unfinished quality',
      changes: { job: { steps: [{ ...quality, status: 'in_progress' }, native] } },
      error: /source-quality step failed\/skipped/,
    },
    {
      name: 'quality after build',
      changes: {
        job: {
          steps: [{ ...quality, started_at: '2026-10-30T09:00:26Z', completed_at: '2026-10-30T09:00:29Z' }, native],
        },
      },
      error: /must precede native build/,
    },
    {
      name: 'quality step number after build',
      changes: { job: { steps: [{ ...quality, number: 10 }, native] } },
      error: /must precede native build/,
    },
    {
      name: 'quality timestamp malformed',
      changes: { job: { steps: [{ ...quality, started_at: 'invalid' }, native] } },
      error: /step interval differs/,
    },
    {
      name: 'artifact predates build and quality',
      changes: { artifact: { created_at: '2026-10-30T09:00:05Z' } },
      error: /must precede native build/,
    },
    { name: 'foreign attempt', changes: { job: { run_attempt: 2 } }, error: /selected download job differs/ },
    { name: 'foreign Source', changes: { run: { head_sha: 'c'.repeat(40) } }, error: /selected download run differs/ },
    { name: 'foreign workflow', changes: { run: { workflow_id: 1 } }, error: /selected download run differs/ },
    {
      name: 'old artifact attempt',
      changes: { artifact: { name: `build-${request.request_id}-123-2` } },
      error: /artifact differs from selected Source/,
    },
    {
      name: 'changed workflow definition',
      changes: {},
      workflowDigest: 'c'.repeat(64),
      error: /workflow definition differs/,
    },
  ];
  for (const negative of negatives) {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-ci-linux-quality-denial-'));
    const profile = profileFixture(request);
    if (negative.workflowDigest) profile.github.workflow_sha256 = negative.workflowDigest;
    await withStubbedFetch(providerFixture(request, negative.changes), async (state) => {
      await assert.rejects(
        downloadGitHubCIProducerArtifact({
          root,
          request,
          profile,
          token: 'explicit-api-token',
          run_id: 123,
          run_attempt: 1,
          artifact_id: 456,
        }),
        negative.error,
        negative.name,
      );
      assert.equal(state.storageCalls, 0);
      assert.equal(existsSync(path.join(root, '.tmp/ci-delivery', request.request_id, '123-1-456.zip')), false);
    });
    rmSync(root, { recursive: true, force: true });
  }
});

test('completed-workflow downloader retains its formation artifact contract', async () => {
  const request = requestFixture();
  const root = mkdtempSync(path.join(tmpdir(), 'vida-ci-completed-formation-'));
  const fixture = providerFixture(request, {
    run: { status: 'completed', conclusion: 'success' },
    artifact: { name: `${request.request_id}-1` },
  });
  await withStubbedFetch(fixture, async (state) => {
    const result = await downloadGitHubCIDelivery({
      root,
      request,
      profile: profileFixture(request),
      token: 'explicit-api-token',
      run_id: 123,
      run_attempt: 1,
      artifact_id: 456,
    });
    assert.deepEqual(readFileSync(path.join(root, result.transport_path)), transportBytes);
    assert.equal(state.storageCalls, 1);
    assert.equal(state.storageAuthorization, null);
  });
  rmSync(root, { recursive: true, force: true });
});
