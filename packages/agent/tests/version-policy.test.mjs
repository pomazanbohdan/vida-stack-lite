import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'bun:test';
import {
  candidateVersion,
  classifyReleaseDispositionCensus,
  confirmedVersionBaseline,
  joinReleaseDispatchIntents,
  normalizeLegacyReleaseDispatchIntent,
  parseDispositionPreparationArgs,
  parseVersionSelection,
  prepareRelease,
  readDispositionProposal,
} from '../../../tooling/agent/release-local.mjs';
import { validateCIDeliveryFormationMembers } from '../../../tooling/agent/release-ci-evidence.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';

function writeFixture(root, relative, value) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.isBuffer(value) ? value : json(value));
}

test('explicit disposition preparation accepts one safe proposal path and at most one version selector', () => {
  assert.deepEqual(parseDispositionPreparationArgs(['--proposal', '.tmp/disposition.json']), {
    proposalPath: '.tmp/disposition.json',
    selection: { mode: 'patch', explicit: false },
  });
  assert.deepEqual(parseDispositionPreparationArgs(['--proposal', '.tmp/disposition.json', '--minor']), {
    proposalPath: '.tmp/disposition.json',
    selection: { mode: 'minor', explicit: true },
  });
  assert.deepEqual(
    parseDispositionPreparationArgs(['--proposal', '.tmp/disposition.json', '--version', '0.1.3']),
    {
      proposalPath: '.tmp/disposition.json',
      selection: { mode: 'exact', version: '0.1.3', explicit: true },
    },
  );
  for (const args of [
    [],
    ['--minor'],
    ['--proposal'],
    ['--proposal', '--minor'],
    ['--proposal', '../disposition.json'],
    ['--proposal', '.tmp/disposition.json', '--prepare'],
    ['--proposal', '.tmp/disposition.json', '--minor', '--major'],
    ['--proposal', '.tmp/disposition.json', '--version', '0.1.3', '--proposal', '.tmp/other.json'],
  ])
    assert.throws(() => parseDispositionPreparationArgs(args));
});

test('disposition proposal reads stay inside the repository and require a bounded single-link regular file', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-release-disposition-'));
  try {
    const directory = path.join(root, '.tmp');
    mkdirSync(directory);
    const proposalPath = path.join(directory, 'proposal.json');
    const proposal = { status: 'eligible', census: { requestCensus: [], runObservations: [] } };
    writeFileSync(proposalPath, JSON.stringify(proposal), { flag: 'wx' });
    assert.deepEqual(readDispositionProposal(root, '.tmp/proposal.json'), proposal);
    assert.throws(() => readDispositionProposal(root, '../proposal.json'), /invalid relative path/);
    assert.throws(() => readDispositionProposal(root, '.tmp'), /unsafe/);

    const aliasPath = path.join(directory, 'proposal-alias.json');
    linkSync(proposalPath, aliasPath);
    assert.throws(() => readDispositionProposal(root, '.tmp/proposal-alias.json'), /linked or non-regular path/);

    const oversizedPath = path.join(directory, 'oversized.json');
    writeFileSync(oversizedPath, Buffer.alloc(8 * 1024 * 1024 + 1), {
      flag: 'wx',
    });
    assert.throws(() => readDispositionProposal(root, '.tmp/oversized.json'), /unsafe/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('patch is the default and increments from the confirmed version', () => {
  assert.equal(candidateVersion('0.1.2', '0.1.2'), '0.1.3');
  assert.equal(candidateVersion('2.4.9', '2.4.9'), '2.4.10');
  assert.equal(candidateVersion('0.1.0', null), '0.1.0');
});

test('minor and major selections apply SemVer reset semantics', () => {
  assert.equal(candidateVersion('0.1.3', '0.1.3', { mode: 'minor' }), '0.2.0');
  assert.equal(candidateVersion('2.4.9', '2.4.9', { mode: 'minor' }), '2.5.0');
  assert.equal(candidateVersion('0.5.7', '0.5.7', { mode: 'major' }), '1.0.0');
  assert.equal(candidateVersion('2.4.9', '2.4.9', { mode: 'major' }), '3.0.0');
});

test('an exact version must be canonical and higher than the confirmed baseline', () => {
  assert.equal(candidateVersion('0.1.3', '0.1.3', { mode: 'exact', version: '0.5.7' }), '0.5.7');
  assert.equal(candidateVersion('0.9.99', '0.9.99', { mode: 'exact', version: '0.10.0' }), '0.10.0');
  for (const version of ['0.1.3', '0.1.2', '01.2.3', '1.02.3', '1.2.03', '1.2.3-alpha', '1.2.3+build']) {
    assert.throws(() => candidateVersion('0.1.3', '0.1.3', { mode: 'exact', version }), /higher|valid/);
  }
});

test('component overflow and competing CLI overrides fail closed', () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  assert.throws(() => candidateVersion(`${maximum}.0.0`, `${maximum}.0.0`, { mode: 'major' }), /integer bound/);
  assert.throws(() => candidateVersion(`0.0.${maximum}`, `0.0.${maximum}`), /integer bound/);
  assert.deepEqual(parseVersionSelection([]), { mode: 'patch', explicit: false });
  assert.deepEqual(parseVersionSelection(['--minor']), { mode: 'minor', explicit: true });
  assert.deepEqual(parseVersionSelection(['--major']), { mode: 'major', explicit: true });
  assert.deepEqual(parseVersionSelection(['--version', '0.5.7']), { mode: 'exact', version: '0.5.7', explicit: true });
  assert.throws(() => parseVersionSelection(['--minor', '--major']), /at most one/);
  assert.throws(() => parseVersionSelection(['--version', '0.5.7', '--minor']), /at most one/);
  assert.throws(() => parseVersionSelection(['--version', '01.5.7']), /valid/);
});

test('formed build baseline advances independently from the installed pointer', () => {
  const installed = { operation_id: 'installed', version: '0.1.2' };
  const formed = { operation_id: 'formed', version: '0.1.3' };
  assert.equal(confirmedVersionBaseline(installed, formed), formed);
  assert.equal(candidateVersion('0.1.3', confirmedVersionBaseline(installed, formed).version), '0.1.4');
  assert.equal(confirmedVersionBaseline({ version: '2.0.0' }, formed).version, '2.0.0');
  assert.equal(confirmedVersionBaseline(installed, null), installed);
});

test('a confirmed pending build keeps its operation and version on default and exact retries', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-release-version-policy-'));
  try {
    const installed = {
      schema: 'VidaLocalReleaseState/v1',
      operation_id: 'local-installed',
      version: '0.1.2',
      status: 'successful',
    };
    const pending = {
      schema: 'VidaLocalReleaseState/v1',
      operation_id: 'local-formed',
      version: '0.1.3',
      status: 'awaiting_assurance',
    };
    const packageManifest = {
      name: 'vida-agent',
      version: pending.version,
      bin: { 'vida-agent': './bin/vida-agent.mjs' },
      engines: { bun: '1.4.2' },
      packageManager: 'bun@1.4.2',
    };
    const requestBody = {
      schema: 'VidaCIDeliveryRequest/v1',
      operation_id: pending.operation_id,
      version: pending.version,
      repository_id: 'vida-agent',
      project_ids: ['agent'],
      target: 'bun-windows-x64',
      source_binding: 'a'.repeat(64),
    };
    const request = { ...requestBody, request_id: digest(json(requestBody)) };
    const result = {
      schema: 'VidaCIDeliveryResult/v1',
      request_id: request.request_id,
      operation_id: request.operation_id,
      version: request.version,
      repository_id: request.repository_id,
      project_ids: request.project_ids,
      target: request.target,
      source_binding: request.source_binding,
      archive_sha256: digest('archive'),
      manifest_sha256: digest('manifest'),
      payload_id: digest('payload'),
      asset: { file: 'vida-agent-bun-windows-x64.exe', bytes: 1, sha256: digest('asset') },
      issuer: 'github-actions',
      run_id: '123',
      run_attempt: 1,
      checks: [{ id: 'native-build', status: 'passed' }],
    };
    const resultBytes = Buffer.from(json(result));
    const formationBody = {
      schema: 'VidaLocalReleaseFormation/v1',
      authority: 'local_consistency_only',
      operation_id: pending.operation_id,
      request_id: request.request_id,
      version: pending.version,
      source_binding: request.source_binding,
      run_id: result.run_id,
      run_attempt: result.run_attempt,
      artifact_id: '456',
      result_sha256: digest(resultBytes),
    };

    writeFixture(root, 'packages/agent/package.json', packageManifest);
    writeFixture(root, `.agent/work/agent-local-release/${installed.operation_id}/release.json`, installed);
    writeFixture(root, '.agent/work/agent-local-release/successful.json', installed);
    writeFixture(root, `.agent/work/agent-local-release/${pending.operation_id}/release.json`, pending);
    writeFixture(root, '.agent/work/agent-local-release/pending.json', pending);
    writeFixture(
      root,
      `.agent/work/agent-local-release/${pending.operation_id}/ci/${request.request_id}/request.json`,
      request,
    );
    writeFixture(
      root,
      `.agent/work/agent-local-release/${pending.operation_id}/ci/${request.request_id}/result.json`,
      resultBytes,
    );
    writeFixture(root, '.agent/work/agent-local-release/formed.json', {
      ...formationBody,
      digest: digest(json(formationBody)),
    });
    const unchangedFiles = [
      'packages/agent/package.json',
      '.agent/work/agent-local-release/pending.json',
      `.agent/work/agent-local-release/${pending.operation_id}/release.json`,
      '.agent/work/agent-local-release/formed.json',
    ].map((relative) => [relative, readFileSync(path.join(root, relative))]);

    assert.deepEqual(await prepareRelease(root), pending);
    assert.deepEqual(
      await prepareRelease(root, { mode: 'exact', version: pending.version, explicit: true }),
      pending,
    );
    await Promise.resolve(assert.rejects(
      prepareRelease(root, { mode: 'exact', version: '0.1.4', explicit: true }),
      /Pending build retains its version/,
    ));
    for (const [relative, bytes] of unchangedFiles)
      assert.deepEqual(readFileSync(path.join(root, relative)), bytes, `${relative} remains unchanged`);
  } finally {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('vida-release-version-policy-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('fresh formation derives the canonical result from actual native artifact members', () => {
  const requestBody = {
    schema: 'VidaCIDeliveryRequest/v1',
    operation_id: 'local-formation',
    version: '0.1.3',
    repository_id: 'vida-agent',
    project_ids: ['agent'],
    target: 'bun-windows-x64',
    source_binding: 'a'.repeat(64),
  };
  const request = {
    ...requestBody,
    request_id: digest(Buffer.from(JSON.stringify(requestBody, null, 2) + '\n')),
  };
  const profile = {
    issuer: 'github-actions',
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    target: request.target,
    required_checks: ['native-build'],
  };
  const archiveBytes = Buffer.from('native package archive');
  const assetBytes = Buffer.from('native executable');
  const manifest = {
    schema: 'VidaStandaloneBuild/v1',
    version: request.version,
    pin: '1.4.2',
    target: request.target,
    inputs: [{ path: 'package.json', bytes: 123, sha256: 'f'.repeat(64) }],
    payloadId: 'c'.repeat(64),
    asset: {
      file: 'vida-agent-bun-windows-x64.exe',
      bytes: assetBytes.length,
      sha256: digest(assetBytes),
    },
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const candidate = {
    operation_id: request.operation_id,
    version: request.version,
    source_binding: request.source_binding,
    pack_metadata: [
      {
        name: 'vida-agent',
        version: request.version,
        filename: 'vida-agent-' + request.version + '.tgz',
        files: [
          { path: 'dist/standalone/manifest.json', size: manifestBytes.length },
          { path: 'dist/standalone/' + manifest.asset.file, size: assetBytes.length },
        ],
      },
    ],
    archive_sha256: digest(archiveBytes),
    manifest_sha256: digest(manifestBytes),
    manifest,
  };
  const candidateBytes = Buffer.from(JSON.stringify(candidate));
  const nativeBuildResult = Buffer.from(
    JSON.stringify({
      schema: 'VidaCIPhaseResult/v1',
      request_id: request.request_id,
      run_id: '123',
      run_attempt: 1,
      source_binding: request.source_binding,
      archive_sha256: candidate.archive_sha256,
      phase: 'native-build',
      status: 'passed',
    }),
  );
  const members = {
    candidate_bytes: candidateBytes,
    archive_bytes: archiveBytes,
    manifest_bytes: manifestBytes,
    asset_bytes: assetBytes,
    native_build_result_bytes: nativeBuildResult,
    installer_bytes: Buffer.from('installer'),
  };
  const providerObservation = {
    issuer: 'github-actions',
    run_id: '123',
    run_attempt: 1,
    artifact_id: '456',
  };

  const formed = validateCIDeliveryFormationMembers({ request, members, providerObservation, profile });
  const result = JSON.parse(formed.observation.result_bytes.toString('utf8'));
  assert.equal(result.schema, 'VidaCIDeliveryResult/v1');
  assert.equal(result.request_id, request.request_id);
  assert.equal(result.archive_sha256, candidate.archive_sha256);
  assert.equal(result.manifest_sha256, candidate.manifest_sha256);
  assert.deepEqual(result.checks, [{ id: 'native-build', status: 'passed' }]);
  assert.throws(
    () => validateCIDeliveryFormationMembers({
      request,
      members: { ...members, archive_bytes: Buffer.from('different archive') },
      providerObservation,
      profile,
    }),
    /candidate, manifest, archive or request differs/,
  );
});

test('one-time pending disposition requires exact terminal or explicit no-issue outcomes', () => {
  const success = {
    request_id: 'a'.repeat(64),
    source_commit: '1'.repeat(40),
    references: ['request-a.json'],
    no_issue: false,
    runs: [
      {
        kind: 'ACTUAL_PROVIDER_OBSERVATION',
        status: 'completed',
        conclusion: 'success',
        run_id: '100',
        run_attempt: 1,
        head_sha: '1'.repeat(40),
        repository_id: 1,
        workflow_id: 2,
      },
    ],
  };
  const noIssue = {
    request_id: 'b'.repeat(64),
    source_commit: null,
    references: ['request-b.json'],
    no_issue: true,
    runs: [],
  };
  const actual = {
    operation_id: 'local-old',
    version: '0.1.2',
    observed_at: '2026-10-07T09:00:00.000Z',
    requests: [success, noIssue],
  };
  const accepted = classifyReleaseDispositionCensus({
    operation_id: actual.operation_id,
    version: actual.version,
    request_ids: [success.request_id, noIssue.request_id],
    actual_census: actual,
  });
  assert.equal(accepted.status, 'eligible');
  assert.equal(accepted.terminal_success_count, 1);
  assert.equal(accepted.terminal_failure_count, 0);
  assert.equal(accepted.no_issue_count, 1);
  assert.equal(
    classifyReleaseDispositionCensus({
      operation_id: actual.operation_id,
      version: actual.version,
      request_ids: [success.request_id, noIssue.request_id, 'c'.repeat(64)],
      actual_census: actual,
    }).status,
    'blocked',
  );
  assert.equal(
    classifyReleaseDispositionCensus({
      operation_id: actual.operation_id,
      version: actual.version,
      request_ids: [success.request_id, noIssue.request_id],
      actual_census: {
        ...actual,
        requests: [
          { ...success, runs: [{ ...success.runs[0], status: 'in_progress' }] },
          noIssue,
        ],
      },
    }).status,
    'blocked',
  );
  assert.equal(
    classifyReleaseDispositionCensus({
      operation_id: actual.operation_id,
      version: actual.version,
      request_ids: [success.request_id, noIssue.request_id],
      actual_census: {
        ...actual,
        requests: [{ ...success, source_commit: '2'.repeat(40) }, noIssue],
      },
    }).status,
    'blocked',
  );
});

test('issued dispatch intents join only to a unique run after issue time and outside prior runs', () => {
  const issued = {
    reference_path: 'dispatch-a.json',
    request_id: 'a'.repeat(64),
    source_commit: '1'.repeat(40),
    repository_id: 1,
    workflow_id: 2,
    issued_at: '2026-10-07T09:00:00.400Z',
    prior_run_ids: ['90'],
    known_run_id: null,
  };
  const run = {
    run_id: '100',
    kind: 'ACTUAL_PROVIDER_OBSERVATION',
    status: 'completed',
    conclusion: 'success',
    run_attempt: 1,
    head_sha: issued.source_commit,
    repository_id: issued.repository_id,
    workflow_id: issued.workflow_id,
    created_at: '2026-10-07T09:00:00Z',
  };
  const joined = joinReleaseDispatchIntents({
    request_id: issued.request_id,
    issued_intents: [issued],
    runs: [run],
    observed_at: '2026-10-07T09:02:00Z',
  });
  assert.equal(joined.status, 'eligible');
  assert.deepEqual(joined.assignments, [
    {
      reference_path: issued.reference_path,
      run_id: '100',
      source_commit: issued.source_commit,
      repository_id: 1,
      workflow_id: 2,
    },
  ]);
  assert.deepEqual(joined.unmatched_intent_paths, []);
});

test('dispatch join excludes prior runs and leaves a distinct unmatched source unresolved', () => {
  const first = {
    reference_path: 'dispatch-old.json',
    request_id: 'b'.repeat(64),
    source_commit: '1'.repeat(40),
    repository_id: 1,
    workflow_id: 2,
    issued_at: '2026-10-07T09:00:00Z',
    prior_run_ids: ['100'],
    known_run_id: null,
  };
  const second = {
    ...first,
    reference_path: 'dispatch-new.json',
    source_commit: '2'.repeat(40),
    issued_at: '2026-10-07T09:01:00Z',
    prior_run_ids: [],
  };
  const run = {
    run_id: '101',
    kind: 'ACTUAL_PROVIDER_OBSERVATION',
    status: 'completed',
    conclusion: 'failure',
    run_attempt: 1,
    head_sha: second.source_commit,
    repository_id: 1,
    workflow_id: 2,
    created_at: '2026-10-07T09:01:00Z',
  };
  const joined = joinReleaseDispatchIntents({
    request_id: first.request_id,
    issued_intents: [first, second],
    runs: [run],
    observed_at: '2026-10-07T09:03:00Z',
  });
  assert.equal(joined.status, 'eligible');
  assert.deepEqual(joined.unmatched_intent_paths, ['dispatch-old.json']);
  assert.equal(joined.assignments[0].reference_path, 'dispatch-new.json');
  assert.equal(
    joinReleaseDispatchIntents({
      request_id: first.request_id,
      issued_intents: [first],
      runs: [{ ...run, run_id: '100', head_sha: first.source_commit, created_at: '2026-10-07T08:59:59Z' }],
      observed_at: '2026-10-07T09:03:00Z',
    }).status,
    'blocked',
  );
});

test('a run cannot close two issued intents, even when request and source match', () => {
  const intent = {
    reference_path: 'dispatch-a.json',
    request_id: 'c'.repeat(64),
    source_commit: '3'.repeat(40),
    repository_id: 1,
    workflow_id: 2,
    issued_at: '2026-10-07T09:00:00Z',
    prior_run_ids: [],
    known_run_id: null,
  };
  const joined = joinReleaseDispatchIntents({
    request_id: intent.request_id,
    issued_intents: [intent, { ...intent, reference_path: 'dispatch-b.json' }],
    runs: [
      {
        run_id: '200',
        kind: 'ACTUAL_PROVIDER_OBSERVATION',
        status: 'completed',
        conclusion: 'success',
        run_attempt: 1,
        head_sha: intent.source_commit,
        repository_id: 1,
        workflow_id: 2,
        created_at: '2026-10-07T09:00:00Z',
      },
    ],
    observed_at: '2026-10-07T09:02:00Z',
  });
  assert.equal(joined.status, 'blocked');
  const nearIntent = {
    ...intent,
    reference_path: 'dispatch-near.json',
    issued_at: '2026-10-07T09:00:04Z',
  };
  const nearRun = {
    run_id: '201',
    kind: 'ACTUAL_PROVIDER_OBSERVATION',
    status: 'completed',
    conclusion: 'success',
    run_attempt: 1,
    head_sha: intent.source_commit,
    repository_id: 1,
    workflow_id: 2,
    created_at: '2026-10-07T09:00:04Z',
  };
  assert.equal(
    joinReleaseDispatchIntents({
      request_id: intent.request_id,
      issued_intents: [intent, nearIntent],
      runs: [nearRun],
      observed_at: '2026-10-07T09:02:00Z',
    }).status,
    'blocked',
  );
});

test('legacy one-shot dispatch evidence normalizes only with an exact retained request profile', () => {
  const body = {
    schema: 'VidaCIDeliveryRequest/v1',
    operation_id: 'local-legacy-release',
    version: '0.1.2',
    repository_id: 'vida-agent',
    project_ids: ['agent'],
    target: 'bun-windows-x64',
    source_binding: 'a'.repeat(64),
  };
  const request = {
    ...body,
    request_id: createHash('sha256').update(JSON.stringify(body, null, 2) + '\n').digest('hex'),
  };
  const sourceCommit = 'b'.repeat(40);
  const value = {
    status: 'issued-once-no-automatic-retry',
    observed_at: '2026-10-07T09:00:00.500Z',
    workflow_id: 2,
    dispatch: {
      inputs: {
        request: JSON.stringify(request, null, 2) + '\n',
        source_commit: sourceCommit,
      },
    },
    earlier_run_ids: [90],
  };
  const profileReference = {
    request,
    profile: {
      issuer: 'github-actions',
      repository_id: 'vida-agent',
      project_ids: ['agent'],
      target: 'bun-windows-x64',
      required_checks: ['native-build'],
      github: {
        repository: 'pomazanbohdan/vida-stack-lite',
        repository_id: 1,
        source_commit: sourceCommit,
        workflow_id: 2,
      },
    },
  };
  const normalized = normalizeLegacyReleaseDispatchIntent({
    request,
    reference_path: 'legacy-dispatch.json',
    value,
    related_profiles: [profileReference],
  });
  assert.deepEqual(normalized, {
    reference_path: 'legacy-dispatch.json',
    request_id: request.request_id,
    source_commit: sourceCommit,
    repository_id: 1,
    workflow_id: 2,
    issued_at: '2026-10-07T09:00:00.500Z',
    prior_run_ids: ['90'],
    known_run_id: null,
  });
  for (const field of ['previous_failed_run', 'prior_failed_run']) {
    const normalizedPrior = normalizeLegacyReleaseDispatchIntent({
      request,
      reference_path: 'legacy-dispatch.json',
      value: { ...value, earlier_run_ids: undefined, [field]: 90 },
      related_profiles: [profileReference],
    });
    assert.deepEqual(normalizedPrior.prior_run_ids, ['90']);
  }
  const approvedPolicyReference = {
    request,
    policy: { ...profileReference.profile, purpose: 'formation-only' },
  };
  const normalizedPolicy = normalizeLegacyReleaseDispatchIntent({
    request,
    reference_path: 'legacy-dispatch.json',
    value: { ...value, earlier_run_ids: undefined, prior_failed_run: 90 },
    related_profiles: [approvedPolicyReference],
  });
  assert.deepEqual(normalizedPolicy.prior_run_ids, ['90']);
  assert.throws(
    () =>
      normalizeLegacyReleaseDispatchIntent({
        request,
        reference_path: 'legacy-dispatch.json',
        value,
        related_profiles: [{ request, policy: profileReference.profile }],
      }),
    /one retained matching source profile/,
  );
  assert.throws(
    () =>
      normalizeLegacyReleaseDispatchIntent({
        request,
        reference_path: 'legacy-dispatch.json',
        value: { ...value, previous_failed_run: 90 },
        related_profiles: [profileReference],
      }),
    /conflicting prior run fields/,
  );
  assert.throws(
    () => normalizeLegacyReleaseDispatchIntent({ request, reference_path: 'legacy-dispatch.json', value, related_profiles: [] }),
    /one retained matching source profile/,
  );
});
