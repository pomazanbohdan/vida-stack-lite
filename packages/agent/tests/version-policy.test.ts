import assert from 'node:assert/strict';
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  candidateVersion,
  classifyReleaseDispositionCensus,
  confirmedVersionBaseline,
  joinReleaseDispatchIntents,
  normalizeLegacyReleaseDispatchIntent,
  parseDispositionPreparationArgs,
  parseVersionSelection,
  prepareRelease,
  prepareIndependentSuccessor,
  readDispositionProposal,
} from '../../../tooling/agent/release-local.ts';
import {
  recordCIDeliveryRequest,
  validateCIDeliveryFormationMembers,
  validateDependencyCache,
} from '../../../tooling/agent/release-ci-evidence.ts';
import { readPin } from '../bin/bun.ts';
import { resumeReleasePreparation } from '../bin/release-preparation.ts';
import { releaseSourceBinding, withReleaseAdmission } from '../bin/local-release-artifacts.ts';

type CIDeliveryRequest = Parameters<typeof normalizeLegacyReleaseDispatchIntent>[0]['request'];
type CIDeliveryRequestBody = Omit<CIDeliveryRequest, 'request_id'>;
const here = path.dirname(fileURLToPath(import.meta.url));
const selectedBunPin = readPin();
const historicalBunPin = '1.4.2';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const digest = (value: string | Uint8Array): string => new Bun.CryptoHasher('sha256').update(value).digest('hex');
const json = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';

function writeFixture(root: string, relative: string, value: unknown): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.isBuffer(value) ? value : json(value));
}

test('native delivery cache isolates fenced entries while allowing later reuse and retaining receipts', () => {
  const workflow = Bun.YAML.parse(
    readFileSync(path.resolve(here, '../../../.github/workflows/agent-native-delivery.yml'), 'utf8'),
  ) as {
    jobs: Record<
      string,
      {
        steps: Array<{
          id?: string;
          name?: string;
          with?: Record<string, string>;
          env?: Record<string, string>;
          run?: string;
        }>;
      }
    >;
  };
  for (const job of ['native-windows-x64', 'native-linux-x64']) {
    const steps = workflow.jobs[job]!.steps;
    const cache = steps.find((step) => step.id === 'bun-dependency-cache')!;
    const install = steps.find((step) => step.name === 'isolated-source')!;
    const save = steps.find((step) => step.id === 'save-bun-dependency-cache')!;
    const evidence = steps.find((step) => step.name === 'require-bun-dependency-cache-evidence')!;
    const keyTemplate = cache.with!.key!;
    const restoreTemplate = cache.with!['restore-keys']!.trim();
    const hashExpression =
      "${{ hashFiles('packages/agent/.bun-version', 'packages/agent/bun.lock', 'packages/agent/package.json') }}";
    assert.equal(keyTemplate, `${restoreTemplate}${hashExpression}`);
    assert.equal(cache.with!.path, '${{ runner.temp }}/vida-bun-install-cache');
    assert.equal(save.with!.path, cache.with!.path);
    assert.equal(save.with!.key, '${{ steps.bun-dependency-cache.outputs.cache-primary-key }}');
    assert.ok(install.env, 'install must receive cache restore outputs');
    assert.equal(install.env!.CACHE_PRIMARY_KEY, '${{ steps.bun-dependency-cache.outputs.cache-primary-key }}');
    assert.equal(install.env!.CACHE_MATCHED_KEY, '${{ steps.bun-dependency-cache.outputs.cache-matched-key }}');
    assert.equal(install.env!.CACHE_HIT, '${{ steps.bun-dependency-cache.outputs.cache-hit }}');
    const guard = install.run!.indexOf("throw 'Restored dependency cache key is invalid'");
    assert.ok(guard >= 0 && guard < install.run!.indexOf('bun install --frozen-lockfile'));
    assert.match(install.run!, /\$env:CACHE_PRIMARY_KEY -cnotmatch \$cacheKeyPattern/);
    assert.match(install.run!, /\$env:CACHE_MATCHED_KEY -cnotmatch \$cacheKeyPattern/);
    assert.ok(
      install.run!.includes(
        "$cacheNamespace = 'vida-bun-install-v1-' + $env:RUNNER_OS + '-' + $env:RUNNER_ARCH + '-release3-bun-' + $pin + '-'",
      ),
    );
    assert.ok(install.run!.includes("$cacheKeyPattern = '^' + [regex]::Escape($cacheNamespace) + '[a-f0-9]{64}$'"));
    assert.ok(install.run!.includes("$cacheHit -ceq 'true' -and $env:CACHE_MATCHED_KEY -cne $env:CACHE_PRIMARY_KEY"));
    assert.match(evidence.run!, /\$keyPattern = '\^vida-bun-install-v1-\[A-Za-z0-9_-\]\+-release3-bun-'/);
    for (const [os, arch] of [
      ['Windows', 'X64'],
      ['Linux', 'X64'],
    ]) {
      const expand = (value: string, digest: string) =>
        value
          .replace('${{ runner.os }}', os!)
          .replace('${{ runner.arch }}', arch!)
          .replace('${{ steps.bun.outputs.bun-version }}', selectedBunPin)
          .replace(hashExpression, digest);
      const key = expand(keyTemplate, 'a'.repeat(64));
      const prefix = expand(restoreTemplate, '');
      const later = expand(keyTemplate, 'b'.repeat(64));
      const old = `vida-bun-install-v1-${os}-${arch}-bun-${selectedBunPin}-${'a'.repeat(64)}`;
      const oldPrefix = old.slice(0, -64);
      const fenced = `vida-bun-install-v1-${os}-${arch}-release2-bun-${selectedBunPin}-${'a'.repeat(64)}`;
      assert.equal(prefix, `vida-bun-install-v1-${os}-${arch}-release3-bun-${selectedBunPin}-`);
      assert.ok(key.startsWith(prefix) && later.startsWith(prefix));
      assert.ok(!old.startsWith(key) && !old.startsWith(prefix));
      assert.ok(!key.startsWith(old) && !key.startsWith(oldPrefix));
      assert.ok(!fenced.startsWith(prefix));
      const receipt = {
        id: 1,
        key,
        ref: 'refs/heads/main',
        version: 'v1',
        size_in_bytes: 1,
        restore: 'hit',
        matched_key: key,
        save: 'confirmed',
        save_action: 'skipped',
      };
      assert.deepEqual(validateDependencyCache(receipt), receipt);
      const oldReceipt = { ...receipt, key: old, matched_key: old };
      assert.deepEqual(validateDependencyCache(oldReceipt), oldReceipt);
      const fencedReceipt = { ...receipt, key: fenced, matched_key: fenced };
      assert.deepEqual(validateDependencyCache(fencedReceipt), fencedReceipt);
      const fallbackReceipt = { ...receipt, restore: 'miss', matched_key: later, save_action: 'success' };
      assert.deepEqual(validateDependencyCache(fallbackReceipt), fallbackReceipt);
      const keyPattern = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-f0-9]{64}$');
      assert.ok(keyPattern.test(key) && keyPattern.test(later));
      for (const invalid of [old, fenced, prefix + 'a'.repeat(63), prefix + 'a'.repeat(65), prefix + 'z'.repeat(64)]) {
        assert.ok(!keyPattern.test(invalid));
        assert.throws(() =>
          validateDependencyCache({ ...receipt, restore: 'miss', matched_key: invalid, save_action: 'success' }),
        );
      }
    }
  }
});

test('release Source binding covers every maintained gate root', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-release-source-roots-'));
  try {
    const files = [
      'package.json',
      'agent-runtime.config.v1.yaml',
      'AGENT.sidecar.md',
      'packages/agent/fixture.ts',
      'packages/plugin/fixture.ts',
      'tests/agent/fixture.ts',
      'tooling/agent/fixture.ts',
      '.githooks/fixture.ts',
      '.github/workflows/agent-native-delivery.yml',
    ];
    for (const file of files) writeFixture(root, file, Buffer.from('original'));
    const original = releaseSourceBinding(root).source_binding;
    for (const file of files.slice(3, 8)) {
      writeFixture(root, file, Buffer.from('changed'));
      assert.notEqual(releaseSourceBinding(root).source_binding, original, file);
      writeFixture(root, file, Buffer.from('original'));
    }
    assert.equal(releaseSourceBinding(root).source_binding, original);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('explicit disposition preparation accepts one safe proposal path and at most one version selector', () => {
  assert.deepEqual(parseDispositionPreparationArgs(['--proposal', '.tmp/disposition.json']), {
    proposalPath: '.tmp/disposition.json',
    selection: { mode: 'patch', explicit: false },
  });
  assert.deepEqual(parseDispositionPreparationArgs(['--proposal', '.tmp/disposition.json', '--minor']), {
    proposalPath: '.tmp/disposition.json',
    selection: { mode: 'minor', explicit: true },
  });
  assert.deepEqual(parseDispositionPreparationArgs(['--proposal', '.tmp/disposition.json', '--version', '0.1.3']), {
    proposalPath: '.tmp/disposition.json',
    selection: { mode: 'exact', version: '0.1.3', explicit: true },
  });
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
  assert.equal(candidateVersion('0.1.0', null), '0.1.1');
  assert.equal(candidateVersion('2.4.9', undefined), '2.4.10');
});

test('first release preparation advances the fixture manifest and retries its pending version', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-first-release-version-'));
  let complete = false;
  try {
    const packageManifest = {
      name: 'vida-agent',
      version: '0.1.2',
      bin: { 'vida-agent': './bin/vida-agent.ts' },
      engines: { bun: selectedBunPin },
      packageManager: `bun@${selectedBunPin}`,
    };
    writeFixture(root, 'packages/agent/package.json', packageManifest);
    writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${selectedBunPin}\n`));
    const prepared = await prepareRelease(root);
    assert.ok(prepared);
    assert.equal(prepared.version, '0.1.3');
    assert.deepEqual(JSON.parse(readFileSync(path.join(root, 'packages/agent/package.json'), 'utf8')), {
      ...packageManifest,
      version: '0.1.3',
    });
    assert.deepEqual(await prepareRelease(root), prepared);
    complete = true;
  } finally {
    if (complete) rmSync(root, { recursive: true, force: true });
  }
});

test('independent successor retains the first candidate version and predecessor bytes', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-independent-successor-'));
  try {
    const initial = {
      name: 'vida-agent',
      version: '0.1.4',
      bin: { 'vida-agent': './bin/vida-agent.ts' },
      engines: { bun: selectedBunPin },
      packageManager: `bun@${selectedBunPin}`,
    };
    writeFixture(root, 'packages/agent/package.json', initial);
    writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${selectedBunPin}\n`));
    const old = await prepareRelease(root);
    assert.ok(old);
    const oldPath = `.agent/work/agent-local-release/${old.operation_id}/release.json`;
    const oldBytes = readFileSync(path.join(root, oldPath));
    const oldPreparation = readFileSync(
      path.join(root, `.agent/work/agent-local-release/${old.operation_id}/preparation.json`),
    );
    const next = await prepareIndependentSuccessor(root, old.operation_id);
    assert.ok(next);
    assert.notEqual(next.operation_id, old.operation_id);
    assert.equal(next.version, '0.1.5');
    assert.deepEqual(readFileSync(path.join(root, oldPath)), oldBytes);
    assert.deepEqual(
      readFileSync(path.join(root, `.agent/work/agent-local-release/${old.operation_id}/preparation.json`)),
      oldPreparation,
    );
    assert.deepEqual(await prepareRelease(root), next);
    const manifest: unknown = JSON.parse(readFileSync(path.join(root, 'packages/agent/package.json'), 'utf8'));
    assert.ok(isRecord(manifest));
    assert.equal(manifest.version, '0.1.5');
    await assert.rejects(prepareIndependentSuccessor(root, old.operation_id));
    const nextPath = `.agent/work/agent-local-release/${next.operation_id}/release.json`;
    const nextPreparationPath = `.agent/work/agent-local-release/${next.operation_id}/preparation.json`;
    const nextBytes = readFileSync(path.join(root, nextPath));
    const nextPreparation = readFileSync(path.join(root, nextPreparationPath));
    const third = await prepareIndependentSuccessor(root, next.operation_id);
    assert.ok(third);
    assert.notEqual(third.operation_id, next.operation_id);
    assert.notEqual(third.operation_id, old.operation_id);
    assert.equal(third.version, '0.1.5');
    assert.deepEqual(readFileSync(path.join(root, oldPath)), oldBytes);
    assert.deepEqual(
      readFileSync(path.join(root, `.agent/work/agent-local-release/${old.operation_id}/preparation.json`)),
      oldPreparation,
    );
    assert.deepEqual(readFileSync(path.join(root, nextPath)), nextBytes);
    assert.deepEqual(readFileSync(path.join(root, nextPreparationPath)), nextPreparation);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('successive independent operations issue distinct Source-bound requests and retain earlier bytes', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-independent-requests-'));
  try {
    writeFixture(root, 'packages/agent/package.json', {
      name: 'vida-agent',
      version: '0.1.4',
      bin: { 'vida-agent': './bin/vida-agent.ts' },
      engines: { bun: selectedBunPin },
      packageManager: `bun@${selectedBunPin}`,
    });
    writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${selectedBunPin}\n`));
    for (const file of [
      'package.json',
      'agent-runtime.config.v1.yaml',
      'AGENT.sidecar.md',
      'packages/plugin/fixture.ts',
      'tests/agent/fixture.ts',
      'tooling/agent/fixture.ts',
      '.githooks/fixture.ts',
      '.github/workflows/agent-native-delivery.yml',
    ])
      writeFixture(root, file, Buffer.from('original\n'));
    const context = { schema: 'ProjectContext/v1', repository_id: 'vida-agent', project_ids: ['agent'] };
    const requests: Array<{ request_id: string; operation_id: string; source_binding: string }> = [];
    const captured: Array<{ file: string; bytes: Buffer }> = [];
    let operation = await prepareRelease(root);
    assert.ok(operation);
    for (let i = 0; i < 3; i++) {
      for (const target of ['bun-linux-x64', 'bun-windows-x64']) {
        const request = recordCIDeliveryRequest({ root, operation: operation.operation_id, context, target });
        requests.push(request);
        const file = path.join(
          root,
          `.agent/work/agent-local-release/${operation.operation_id}/ci/${request.request_id}/request.json`,
        );
        captured.push({ file, bytes: readFileSync(file) });
      }
      if (i < 2) {
        writeFixture(root, 'packages/plugin/fixture.ts', Buffer.from(`revision ${i}\n`));
        const next = await prepareIndependentSuccessor(root, operation.operation_id);
        assert.ok(next);
        operation = next;
      }
    }
    assert.equal(new Set(requests.map((request) => request.request_id)).size, 6);
    assert.equal(new Set(requests.map((request) => request.operation_id)).size, 3);
    assert.equal(new Set(requests.map((request) => request.source_binding)).size, 3);
    for (const { file, bytes } of captured) assert.deepEqual(readFileSync(file), bytes);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('interrupted successor preparation resumes without rewriting predecessor evidence', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-independent-successor-resume-'));
  try {
    writeFixture(root, 'packages/agent/package.json', {
      name: 'vida-agent',
      version: '0.1.4',
      bin: { 'vida-agent': './bin/vida-agent.ts' },
      engines: { bun: selectedBunPin },
      packageManager: `bun@${selectedBunPin}`,
    });
    writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${selectedBunPin}\n`));
    const old = await prepareRelease(root);
    assert.ok(old);
    const oldBase = `.agent/work/agent-local-release/${old.operation_id}`;
    const requestPath = `${oldBase}/ci/retained/request.json`;
    writeFixture(root, requestPath, { prior: 'unknown' });
    const pendingPath = '.agent/work/agent-local-release/pending.json';
    const oldJournal = readFileSync(path.join(root, oldBase, 'release.json'));
    const oldRequest = readFileSync(path.join(root, requestPath));
    const next = await prepareIndependentSuccessor(root, old.operation_id);
    assert.ok(next);
    const nextBase = `.agent/work/agent-local-release/${next.operation_id}`;
    renameSync(
      path.join(root, nextBase, 'preparation.json'),
      path.join(root, '.agent/work/agent-local-release/preparation.json'),
    );
    writeFixture(root, pendingPath, oldJournal);
    rmSync(path.join(root, nextBase, 'release.json'));
    assert.deepEqual(await withReleaseAdmission(root, () => resumeReleasePreparation(root), true), next);
    assert.deepEqual(readFileSync(path.join(root, oldBase, 'release.json')), oldJournal);
    assert.deepEqual(readFileSync(path.join(root, requestPath)), oldRequest);
    assert.deepEqual(JSON.parse(readFileSync(path.join(root, pendingPath), 'utf8')), next);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('independent successor refuses missing, changed, foreign and active predecessor state', async () => {
  for (const scenario of ['missing-receipt', 'changed-journal', 'foreign', 'active', 'successful', 'initialized']) {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-independent-successor-deny-'));
    let lock: Database | undefined;
    try {
      writeFixture(root, 'packages/agent/package.json', {
        name: 'vida-agent',
        version: '0.1.4',
        bin: { 'vida-agent': './bin/vida-agent.ts' },
        engines: { bun: selectedBunPin },
        packageManager: `bun@${selectedBunPin}`,
      });
      writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${selectedBunPin}\n`));
      const old = await prepareRelease(root);
      assert.ok(old);
      const base = `.agent/work/agent-local-release/${old.operation_id}`;
      if (scenario === 'missing-receipt') rmSync(path.join(root, base, 'preparation.json'));
      if (scenario === 'changed-journal')
        writeFixture(root, `${base}/release.json`, {
          ...old,
          status: 'running',
          pid: 123,
        });
      if (scenario === 'initialized') writeFixture(root, '.vida/project.yaml', Buffer.from('initialized\n'));
      if (scenario === 'successful') writeFixture(root, '.agent/work/agent-local-release/successful.json', old);
      if (scenario === 'active') {
        lock = new Database(path.join(root, base, 'worker.sqlite'));
        lock.exec('BEGIN IMMEDIATE');
      }
      const pendingPath = path.join(root, '.agent/work/agent-local-release/pending.json');
      const journalPath = path.join(root, base, 'release.json');
      const pendingBytes = readFileSync(pendingPath);
      const journalBytes = readFileSync(journalPath);
      await assert.rejects(
        prepareIndependentSuccessor(root, scenario === 'foreign' ? 'foreign-operation' : old.operation_id),
      );
      assert.deepEqual(readFileSync(pendingPath), pendingBytes);
      assert.deepEqual(readFileSync(journalPath), journalBytes);
    } finally {
      lock?.close();
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('successor chain rejects cycles, foreign or missing history and changed version or journal', async () => {
  for (const scenario of ['cycle', 'foreign', 'missing', 'version', 'journal']) {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-independent-chain-deny-'));
    try {
      writeFixture(root, 'packages/agent/package.json', {
        name: 'vida-agent',
        version: '0.1.4',
        bin: { 'vida-agent': './bin/vida-agent.ts' },
        engines: { bun: selectedBunPin },
        packageManager: `bun@${selectedBunPin}`,
      });
      writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${selectedBunPin}\n`));
      const old = await prepareRelease(root);
      assert.ok(old);
      const next = await prepareIndependentSuccessor(root, old.operation_id);
      assert.ok(next);
      const base = '.agent/work/agent-local-release';
      const receiptPath = path.join(root, base, next.operation_id, 'preparation.json');
      const receipt: unknown = JSON.parse(readFileSync(receiptPath, 'utf8'));
      const previous =
        scenario === 'cycle'
          ? next
          : scenario === 'foreign'
            ? { ...old, operation_id: 'foreign-operation' }
            : scenario === 'version'
              ? { ...old, version: '0.1.6' }
              : old;
      if (['cycle', 'foreign', 'version'].includes(scenario)) {
        assert.ok(isRecord(receipt));
        assert.ok(Array.isArray(receipt.targets));
        const target: unknown = receipt.targets.at(-1);
        assert.ok(isRecord(target));
        target.before = Buffer.from(json(previous)).toString('base64');
        writeFileSync(receiptPath, json(receipt));
      }
      if (scenario === 'missing') rmSync(path.join(root, base, old.operation_id, 'preparation.json'));
      if (scenario === 'journal')
        writeFixture(root, `${base}/${old.operation_id}/release.json`, { ...old, status: 'running' });
      const pendingPath = path.join(root, base, 'pending.json');
      const beforePending = readFileSync(pendingPath);
      const beforeReceipt = readFileSync(receiptPath);
      const beforeNames = readdirSync(path.join(root, base)).sort();
      await assert.rejects(prepareIndependentSuccessor(root, next.operation_id));
      assert.deepEqual(readFileSync(pendingPath), beforePending);
      assert.deepEqual(readFileSync(receiptPath), beforeReceipt);
      assert.deepEqual(readdirSync(path.join(root, base)).sort(), beforeNames);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('minor and major selections apply SemVer reset semantics', () => {
  assert.equal(candidateVersion('0.1.3', '0.1.3', { mode: 'minor' }), '0.2.0');
  assert.equal(candidateVersion('2.4.9', '2.4.9', { mode: 'minor' }), '2.5.0');
  assert.equal(candidateVersion('0.5.7', '0.5.7', { mode: 'major' }), '1.0.0');
  assert.equal(candidateVersion('2.4.9', '2.4.9', { mode: 'major' }), '3.0.0');
  assert.equal(candidateVersion('2.4.9', null, parseVersionSelection(['--minor'])), '2.5.0');
  assert.equal(candidateVersion('2.4.9', null, parseVersionSelection(['--major'])), '3.0.0');
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
  assert.throws(() => candidateVersion(`0.0.${maximum}`, null), /integer bound/);
  assert.throws(() => candidateVersion('01.2.3', null), /valid/);
  assert.throws(() => candidateVersion('1.2.3', 'invalid'), /valid/);
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
  const baseline = confirmedVersionBaseline(installed, formed);
  assert.ok(baseline);
  assert.equal(candidateVersion('0.1.3', baseline.version), '0.1.4');
  const retainedBaseline = confirmedVersionBaseline({ version: '2.0.0' }, formed);
  assert.ok(retainedBaseline);
  assert.equal(retainedBaseline.version, '2.0.0');
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
      bin: { 'vida-agent': './bin/vida-agent.ts' },
      engines: { bun: selectedBunPin },
      packageManager: `bun@${selectedBunPin}`,
    };
    const requestBody: CIDeliveryRequestBody = {
      schema: 'VidaCIDeliveryRequest/v1',
      operation_id: pending.operation_id,
      version: pending.version,
      repository_id: 'vida-agent',
      project_ids: ['agent'],
      target: 'bun-windows-x64',
      source_binding: 'a'.repeat(64),
    };
    const request: CIDeliveryRequest = { ...requestBody, request_id: digest(json(requestBody)) };
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
    writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${selectedBunPin}\n`));
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
    writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${historicalBunPin}\n`));
    await Promise.resolve(assert.rejects(prepareRelease(root), /Bun manifest mirrors differ from \.bun-version/));
    writeFixture(root, 'packages/agent/.bun-version', Buffer.from(`${selectedBunPin}\n`));
    writeFixture(root, 'packages/agent/package.json', {
      ...packageManifest,
      packageManager: `bun@${historicalBunPin}`,
    });
    await Promise.resolve(assert.rejects(prepareRelease(root), /stable Bun pin/));
    writeFixture(root, 'packages/agent/package.json', packageManifest);
    const unchangedFiles = [
      'packages/agent/package.json',
      '.agent/work/agent-local-release/pending.json',
      `.agent/work/agent-local-release/${pending.operation_id}/release.json`,
      '.agent/work/agent-local-release/formed.json',
    ].map((relative): readonly [string, Buffer] => [relative, readFileSync(path.join(root, relative))]);

    assert.deepEqual(await prepareRelease(root), pending);
    assert.deepEqual(await prepareRelease(root, { mode: 'exact', version: pending.version, explicit: true }), pending);
    await Promise.resolve(
      assert.rejects(
        prepareRelease(root, { mode: 'exact', version: '0.1.4', explicit: true }),
        /Pending build retains its version/,
      ),
    );
    for (const [relative, bytes] of unchangedFiles)
      assert.deepEqual(readFileSync(path.join(root, relative)), bytes, `${relative} remains unchanged`);
  } finally {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('vida-release-version-policy-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('fresh formation derives the canonical result from actual native artifact members', () => {
  const requestBody: CIDeliveryRequestBody = {
    schema: 'VidaCIDeliveryRequest/v1',
    operation_id: 'local-formation',
    version: '0.1.3',
    repository_id: 'vida-agent',
    project_ids: ['agent'],
    target: 'bun-windows-x64',
    source_binding: 'a'.repeat(64),
  };
  const request: CIDeliveryRequest = {
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
    pin: selectedBunPin,
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
  const cacheKey = `vida-bun-install-v1-main-bun-${selectedBunPin}-${'a'.repeat(64)}`;
  const nativeBuildReceipt = {
    schema: 'VidaCIPhaseResult/v2',
    request_id: request.request_id,
    run_id: '123',
    run_attempt: 1,
    source_binding: request.source_binding,
    archive_sha256: candidate.archive_sha256,
    phase: 'native-build',
    status: 'passed',
    dependency_cache: {
      id: 1,
      key: cacheKey,
      ref: 'refs/heads/main',
      version: 'v1',
      size_in_bytes: 1,
      restore: 'hit',
      matched_key: cacheKey,
      save: 'confirmed',
      save_action: 'skipped',
    },
  };
  const nativeBuildResult = Buffer.from(JSON.stringify(nativeBuildReceipt));
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
  const parsedResult: unknown = JSON.parse(formed.observation.result_bytes.toString('utf8'));
  assert.ok(isRecord(parsedResult));
  const result = parsedResult;
  assert.deepEqual(result, {
    schema: 'VidaCIDeliveryResult/v2',
    request_id: request.request_id,
    operation_id: request.operation_id,
    version: request.version,
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    target: request.target,
    source_binding: request.source_binding,
    archive_sha256: candidate.archive_sha256,
    manifest_sha256: candidate.manifest_sha256,
    payload_id: manifest.payloadId,
    asset: manifest.asset,
    issuer: providerObservation.issuer,
    run_id: providerObservation.run_id,
    run_attempt: providerObservation.run_attempt,
    checks: [{ id: 'native-build', status: 'passed' }],
    dependency_cache: nativeBuildReceipt.dependency_cache,
  });
  const missKey = `vida-bun-install-v1-main-bun-${selectedBunPin}-${'c'.repeat(64)}`;
  const fallbackKey = `${missKey.slice(0, -64)}${'d'.repeat(64)}`;
  const cacheMissReceipt = {
    ...nativeBuildReceipt,
    dependency_cache: {
      ...nativeBuildReceipt.dependency_cache,
      key: missKey,
      matched_key: fallbackKey,
      restore: 'miss',
      save_action: 'success',
    },
  };
  assert.doesNotThrow(() =>
    validateCIDeliveryFormationMembers({
      request,
      members: { ...members, native_build_result_bytes: Buffer.from(JSON.stringify(cacheMissReceipt)) },
      providerObservation,
      profile,
    }),
  );
  for (const status of ['failed', 'UNKNOWN']) {
    assert.throws(
      () =>
        validateCIDeliveryFormationMembers({
          request,
          members: {
            ...members,
            native_build_result_bytes: Buffer.from(JSON.stringify({ ...nativeBuildReceipt, status })),
          },
          providerObservation,
          profile,
        }),
      /native-build result differs from the selected request and provider run/,
    );
  }
  assert.throws(
    () =>
      validateCIDeliveryFormationMembers({
        request,
        members: { ...members, archive_bytes: Buffer.from('different archive') },
        providerObservation,
        profile,
      }),
    /candidate, manifest, archive or request differs/,
  );
  assert.throws(
    () =>
      validateCIDeliveryFormationMembers({
        request,
        members: {
          ...members,
          manifest_bytes: Buffer.from(JSON.stringify({ ...manifest, pin: `${selectedBunPin}-rc.1` })),
        },
        providerObservation,
        profile,
      }),
    /native manifest shape invalid/,
  );
  assert.throws(
    () =>
      validateCIDeliveryFormationMembers({
        request,
        members: {
          ...members,
          native_build_result_bytes: Buffer.from(
            JSON.stringify({
              ...nativeBuildReceipt,
              dependency_cache: {
                ...nativeBuildReceipt.dependency_cache,
                key: `vida-bun-install-v1-main-bun-${historicalBunPin}-${'a'.repeat(64)}`,
                matched_key: `vida-bun-install-v1-main-bun-${historicalBunPin}-${'a'.repeat(64)}`,
              },
            }),
          ),
        },
        providerObservation,
        profile,
      }),
    /CI candidate archive\/manifest\/payload differs/,
  );
});

test('one-time pending disposition requires exact terminal or explicit no-issue outcomes', () => {
  const successfulRun = {
    kind: 'ACTUAL_PROVIDER_OBSERVATION',
    status: 'completed',
    conclusion: 'success',
    run_id: '100',
    run_attempt: 1,
    head_sha: '1'.repeat(40),
    repository_id: 1,
    workflow_id: 2,
  };
  const success = {
    request_id: 'a'.repeat(64),
    source_commit: '1'.repeat(40),
    references: ['request-a.json'],
    no_issue: false,
    runs: [successfulRun],
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
        requests: [{ ...success, runs: [{ ...successfulRun, status: 'in_progress' }] }, noIssue],
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
  const assignment = joined.assignments[0];
  assert.ok(assignment);
  assert.equal(assignment.reference_path, 'dispatch-new.json');
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
  const body: CIDeliveryRequestBody = {
    schema: 'VidaCIDeliveryRequest/v1',
    operation_id: 'local-legacy-release',
    version: '0.1.2',
    repository_id: 'vida-agent',
    project_ids: ['agent'],
    target: 'bun-windows-x64',
    source_binding: 'a'.repeat(64),
  };
  const request: CIDeliveryRequest = {
    ...body,
    request_id: digest(json(body)),
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
    () =>
      normalizeLegacyReleaseDispatchIntent({
        request,
        reference_path: 'legacy-dispatch.json',
        value,
        related_profiles: [],
      }),
    /one retained matching source profile/,
  );
});
