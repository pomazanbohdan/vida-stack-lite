import { expect, test } from 'bun:test';
import {
  campaignOptions,
  campaignPartition,
  campaignProcessState,
  campaignScratchDirectory,
  campaignStorageAdmitted,
  executeContourCampaign,
  isolatedCommand,
  throwAfterCampaignReceiptFailure,
  type CampaignOutcome,
} from '../tooling/contour-campaign.ts';
import type { MutationProcessResult } from '../tooling/mutation-evidence.ts';
import { executeMutationCommand } from '../tooling/mutation-evidence.ts';
import type { MutationPartition } from '../tooling/mutation-partitions.ts';
import { mutationPartitions } from '../tooling/mutation-partitions.ts';
import { selectContourCampaign } from '../tooling/contour-progress.ts';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statfsSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { QualityExecutionImage } from '../tooling/quality-execution-image.ts';
import type { QualityRuntimeRoot } from '../tooling/quality-runtime-root.ts';

test('trusted coverage command builder creates fresh run-owned host paths', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'contour-trusted-control-'));
  const stage = path.join(root, 'stage');
  const repository = path.join(root, 'image', 'repository');
  const packageRoot = path.join(repository, 'packages', 'agent');
  const sourceRepository = path.join(root, 'source');
  const dependencyRoot = path.join(root, 'dependencies');
  for (const directory of [
    stage,
    sourceRepository,
    dependencyRoot,
    path.join(packageRoot, 'coverage'),
    path.join(packageRoot, '.tmp'),
    path.join(packageRoot, 'node_modules'),
  ])
    mkdirSync(directory, { recursive: true });
  const image = {
    schema: 'VidaQualityExecutionImage/v1',
    repository,
    packageRoot,
    source_repository: sourceRepository,
    dependency_root: dependencyRoot,
    source_commit: 'a'.repeat(40),
    source_tree: 'b'.repeat(40),
    input_fingerprint: 'c'.repeat(64),
    manifest_file: path.join(repository, 'image.json'),
    manifest_sha256: 'd'.repeat(64),
  } satisfies QualityExecutionImage;
  const args = ['tooling/contour-campaign.ts', '--coverage-child', 'bun-cli-run'];
  let completed = false;
  try {
    const invocation = isolatedCommand(
      stage,
      args,
      { tini: '/control/tini', bwrap: '/control/bwrap' },
      undefined,
      image,
      undefined,
      'trusted-coverage',
    );
    const scratch = path.join(invocation.temporary, 'scratch');
    expect(invocation.command).toEqual([process.execPath, '--no-env-file', '--no-install', ...args]);
    expect(invocation.environment).toMatchObject({
      TMPDIR: scratch,
      TMP: scratch,
      TEMP: scratch,
      HOME: path.join(scratch, 'home'),
      XDG_CACHE_HOME: path.join(scratch, 'cache'),
      BUN_INSTALL_CACHE_DIR: path.join(scratch, 'bun-install-cache'),
      VIDA_CACHE_ROUTING_FIXTURE_ROOT: path.join(scratch, 'cache-routing-fixture'),
      VIDA_QUALITY_IMAGE_MANIFEST: image.manifest_file,
      VIDA_QUALITY_IMAGE_SHA256: image.manifest_sha256,
    });
    for (const directory of ['home', 'cache', 'config', 'bun-install-cache']) {
      const marker = path.join(scratch, directory, 'marker');
      writeFileSync(marker, directory, { flag: 'wx' });
      expect(readFileSync(marker, 'utf8')).toBe(directory);
    }
    expect(() =>
      isolatedCommand(
        stage,
        [...args, '--mutation'],
        { tini: '', bwrap: '' },
        undefined,
        image,
        undefined,
        'trusted-coverage',
      ),
    ).toThrow();
    expect(() =>
      isolatedCommand(stage, args, { tini: '', bwrap: '' }, undefined, undefined, undefined, 'trusted-coverage'),
    ).toThrow();
    expect(() =>
      isolatedCommand(stage, args, { tini: '', bwrap: '' }, stage, image, undefined, 'trusted-coverage'),
    ).toThrow();
    const existingScratch = readdirSync(stage).sort();
    for (const name of [
      'VIDA_CACHE_ROUTING_SOURCE_ROOT',
      'VIDA_CACHE_ROUTING_BASELINE_ROOT',
      'VIDA_CACHE_ROUTING_DEPENDENCY_ROOT',
    ]) {
      const prior = process.env[name];
      try {
        for (const value of ['/foreign/root', '']) {
          process.env[name] = value;
          expect(() =>
            isolatedCommand(stage, args, { tini: '', bwrap: '' }, undefined, image, undefined, 'trusted-coverage'),
          ).toThrow(/Ambient cache routing root/u);
          expect(readdirSync(stage).sort()).toEqual(existingScratch);
        }
      } finally {
        if (prior === undefined) delete process.env[name];
        else process.env[name] = prior;
      }
    }
    completed = true;
  } finally {
    if (completed) rmSync(root, { recursive: true });
  }
});

test('campaign retains private scratch with its stage instead of accumulating host tmpfs roots', () => {
  const parent = tmpdir();
  const stage = mkdtempSync(path.join(parent, 'contour-scratch-control-'));
  let completed = false;
  try {
    const isolated = isolatedCommand(stage, ['tooling/contour-campaign.ts', '--coverage-child', 'main-config'], {
      tini: '/control/tini',
      bwrap: '/control/bwrap',
    });
    expect(path.dirname(isolated.temporary)).toBe(stage);
    const scratch = path.join(isolated.temporary, 'scratch');
    const installCache = path.join(scratch, 'bun-install-cache');
    expect(isolated.command).toContain(scratch);
    expect(isolated.environment).toEqual({
      TMPDIR: '/tmp',
      BUN_TMPDIR: '/tmp',
      BUN_INSTALL_CACHE_DIR: '/tmp/bun-install-cache',
    });
    const cacheSentinel = path.join(installCache, 'writable-sentinel');
    writeFileSync(cacheSentinel, 'private writable cache');
    expect(readFileSync(cacheSentinel, 'utf8')).toBe('private writable cache');
    const index = isolated.command.indexOf(scratch);
    expect(isolated.command.slice(index - 1, index + 2)).toEqual(['--bind', scratch, '/tmp']);
    const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    expect(index).toBeLessThan(isolated.command.indexOf(repositoryRoot));
    expect(index).toBeLessThan(isolated.command.indexOf(stage));
    const filesystem = statfsSync(scratch, { bigint: true });
    expect(isolated.scratch_storage.filesystem_type).toBe(String(filesystem.type));
    expect(BigInt(isolated.scratch_storage.available_bytes)).toBeGreaterThanOrEqual(2n * 1024n ** 3n);
    expect(isolated.scratch_storage.minimum_free_bytes).toBe(String(2n * 1024n ** 3n));
    const retained = path.join(scratch, 'unknown-receipt.json');
    const bytes = '{"status":"UNKNOWN","scope":"test-fixture-only"}\n';
    writeFileSync(retained, bytes, { flag: 'wx' });
    expect(readFileSync(retained, 'utf8')).toBe(bytes);
    completed = true;
  } finally {
    if (completed) rmSync(stage, { recursive: true });
  }
});

const nativeTini = process.env.VIDA_QUALITY_TINI ?? Bun.which('tini');
test
  .skipIf(process.platform !== 'linux' || !Bun.which('bwrap') || !nativeTini)
  .each([0, 23, 'signal', 'timeout'] as const)(
  'campaign namespace init contains detached children and preserves %s outcome',
  async (outcome) => {
    const stage = mkdtempSync(path.join(tmpdir(), 'contour-reaper-control-'));
    let completed = false;
    try {
      const childName = 'vr-' + randomUUID().slice(0, 10);
      const source = `
        const { readFileSync } = await import('node:fs');
        const child = Bun.spawn([process.execPath, '-e',
          ${JSON.stringify(`const fs = await import('node:fs'); fs.writeFileSync('/proc/self/comm', ${JSON.stringify(childName)}); console.log(fs.readFileSync('/proc/self/comm', 'utf8').trim()); setInterval(() => {}, 1000);`)}],
          { detached: true, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore' });
        const ready = await child.stdout.getReader().read();
        const childName = new TextDecoder().decode(ready.value).trim();
        if (childName !== ${JSON.stringify(childName)}) throw new Error('Child did not start');
        console.log(JSON.stringify({ init: readFileSync('/proc/1/comm', 'utf8').trim(), detached_ready: true, child_name: childName }));
        ${outcome === 'timeout' ? 'setInterval(() => {}, 1000);' : outcome === 'signal' ? "process.kill(process.pid, 'SIGTERM');" : `process.exit(${outcome});`}
      `;
      const isolated = isolatedCommand(stage, ['-e', source], {
        tini: nativeTini!,
        bwrap: Bun.which('bwrap')!,
      });
      const result = await executeMutationCommand(isolated.command, stage, outcome === 'timeout' ? 500 : 2000, {
        ownedProcessGroup: true,
        env: { ...process.env, ...isolated.environment },
        stdoutFile: path.join(stage, 'stdout.log'),
        stderrFile: path.join(stage, 'stderr.log'),
        outputByteLimit: 16 * 1024,
      });
      writeFileSync(path.join(stage, 'execution.json'), JSON.stringify(result), { flag: 'wx' });
      expect(result.timedOut).toBe(outcome === 'timeout');
      if (outcome !== 'timeout') expect(result.exitCode).toBe(outcome === 'signal' ? 143 : outcome);
      expect(result.spawnError).toBeNull();
      expect(result.output_capture?.complete).toBe(true);
      expect(result.processCustody?.terminationObserved).toBe(true);
      expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
      expect(JSON.parse(readFileSync(path.join(stage, 'stdout.log'), 'utf8'))).toEqual({
        init: 'tini',
        detached_ready: true,
        child_name: childName,
      });
      const survivors: string[] = [];
      for (const pid of readdirSync('/proc')) {
        if (!/^\d+$/u.test(pid)) continue;
        try {
          const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
          if (stat.slice(stat.indexOf('(') + 1, stat.lastIndexOf(')')) === childName) survivors.push(stat);
        } catch (error) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
        }
      }
      writeFileSync(path.join(stage, 'descendant-observation.json'), JSON.stringify({ childName, survivors }), {
        flag: 'wx',
      });
      expect(survivors).toEqual([]);
      completed = true;
    } finally {
      if (completed) rmSync(stage, { recursive: true });
      else console.error('Namespace reaper fixture retained:', stage);
    }
  },
);

test('campaign can retain isolated scratch under an explicit external existing root', () => {
  const operationParent = tmpdir();
  const stage = mkdtempSync(path.join(operationParent, 'contour-scratch-stage-'));
  const retainedRoot = mkdtempSync(path.join(operationParent, 'contour-retained-scratch-'));
  let completed = false;
  try {
    const tools = { tini: '/control/tini', bwrap: '/control/bwrap' };
    const first = isolatedCommand(
      stage,
      ['tooling/contour-campaign.ts', '--coverage-child', 'main-config'],
      tools,
      retainedRoot,
    );
    const second = isolatedCommand(
      stage,
      ['tooling/contour-campaign.ts', '--coverage-child', 'main-config'],
      tools,
      retainedRoot,
    );
    expect(path.dirname(first.temporary)).toBe(retainedRoot);
    expect(path.dirname(second.temporary)).toBe(retainedRoot);
    expect(first.temporary).not.toBe(second.temporary);
    const scratchIndex = first.command.indexOf(path.join(first.temporary, 'scratch'));
    expect(first.command.slice(scratchIndex - 1, scratchIndex + 2)).toEqual([
      '--bind',
      path.join(first.temporary, 'scratch'),
      '/tmp',
    ]);
    expect(first.scratch_storage.filesystem_type).toBe(String(statfsSync(first.temporary, { bigint: true }).type));
    expect(BigInt(first.scratch_storage.available_bytes)).toBeGreaterThanOrEqual(2n * 1024n ** 3n);
    completed = true;
  } finally {
    if (completed) {
      rmSync(stage, { recursive: true });
      rmSync(retainedRoot, { recursive: true });
    }
  }
});

test('campaign rejects invalid or package-contained retained scratch roots before allocating scratch', () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const operationParent = tmpdir();
  const stage = mkdtempSync(path.join(operationParent, 'contour-scratch-validation-'));
  const external = mkdtempSync(path.join(operationParent, 'contour-scratch-root-validation-'));
  const escapedLink = path.join(external, 'package-link');
  const regularFile = path.join(external, 'regular-file');
  writeFileSync(regularFile, 'not a directory', { flag: 'wx' });
  symlinkSync(packageRoot, escapedLink, 'dir');
  const args = ['tooling/contour-campaign.ts', '--coverage-child', 'main-config'];
  const tools = { tini: '/control/tini', bwrap: '/control/bwrap' };
  let completed = false;
  try {
    for (const [root, reason] of [
      ['relative-scratch-root', /absolute directory/u],
      [path.join(external, 'missing'), /existing directory/u],
      [regularFile, /existing directory/u],
      [packageRoot, /resolve outside packages\/agent/u],
      [escapedLink, /resolve outside packages\/agent/u],
    ] as const) {
      expect(() => isolatedCommand(stage, args, tools, root)).toThrow(reason);
      expect(readdirSync(stage)).toEqual([]);
    }
    completed = true;
  } finally {
    if (completed) {
      rmSync(stage, { recursive: true });
      rmSync(external, { recursive: true });
    }
  }
});

test('campaign rejects retained scratch inside Source, image, or dependencies before allocation', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'contour-retained-inputs-'));
  const source = path.join(base, 'source');
  const repository = path.join(base, 'image', 'repository');
  const imagePackage = path.join(repository, 'packages', 'agent');
  const dependency = path.join(base, 'dependencies');
  const runtime = path.join(base, 'runtime');
  const stage = path.join(base, 'stage');
  for (const directory of [
    path.join(source, 'nested'),
    dependency,
    runtime,
    stage,
    path.join(imagePackage, 'coverage'),
    path.join(imagePackage, '.tmp'),
    path.join(imagePackage, 'node_modules'),
  ])
    mkdirSync(directory, { recursive: true });
  const image: QualityExecutionImage = {
    schema: 'VidaQualityExecutionImage/v1',
    repository,
    packageRoot: imagePackage,
    source_repository: source,
    source_commit: 'a'.repeat(40),
    source_tree: 'b'.repeat(40),
    input_fingerprint: 'c'.repeat(64),
    manifest_file: path.join(repository, '.quality-image.json'),
    manifest_sha256: 'd'.repeat(64),
    dependency_root: dependency,
  };
  const sourceAlias = path.join(base, 'source-alias');
  symlinkSync(source, sourceAlias, 'dir');
  const runtimeRoot: QualityRuntimeRoot = {
    root: runtime,
    manifest_file: path.join(runtime, 'manifest.json'),
    manifest_sha256: 'e'.repeat(64),
    files: [],
    dependency_root: dependency,
  };
  let completed = false;
  try {
    for (const root of [
      source,
      path.join(source, 'nested'),
      sourceAlias,
      repository,
      path.join(imagePackage, 'coverage'),
      path.join(imagePackage, '.tmp'),
      dependency,
      runtime,
    ]) {
      const before = readdirSync(root).sort();
      expect(() =>
        isolatedCommand(
          stage,
          ['--help'],
          { tini: '/control/tini', bwrap: '/control/bwrap' },
          root,
          image,
          runtimeRoot,
        ),
      ).toThrow(/retained scratch.*input|input.*retained scratch/iu);
      expect(readdirSync(root).sort()).toEqual(before);
    }
    const sourceBefore = readdirSync(source).sort();
    const separate = isolatedCommand(
      stage,
      ['--help'],
      { tini: '/control/tini', bwrap: '/control/bwrap' },
      base,
      image,
      runtimeRoot,
    );
    expect(path.dirname(separate.temporary)).toBe(base);
    expect(readdirSync(source).sort()).toEqual(sourceBefore);
    completed = true;
  } finally {
    if (completed) rmSync(base, { recursive: true });
    else process.stderr.write(`Retained failed scratch separation fixture: ${base}\n`);
  }
});

test('campaign private scratch stays outside the copied package root', () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const scratchRoot = campaignScratchDirectory('fixture-run', '001-lane-coverage');
  const relative = path.relative(packageRoot, scratchRoot);
  expect(relative.startsWith('..' + path.sep)).toBe(true);
});

test('campaign reports resource receipt failures and preserves both causes', () => {
  const primary = new Error('terminal publication failed');
  const receipt = Object.assign(new Error('disk full writing interruption receipt'), { code: 'ENOSPC' });
  const diagnostics: string[] = [];
  let observed: unknown;
  try {
    throwAfterCampaignReceiptFailure(primary, receipt, { source_commit: 'fixture-commit' }, (line) => {
      diagnostics.push(line);
    });
  } catch (error) {
    observed = error;
  }
  expect(observed).toBeInstanceOf(AggregateError);
  if (!(observed instanceof AggregateError)) throw new Error('Expected retained campaign and receipt failures');
  expect(observed.errors).toEqual([primary, receipt]);
  expect(JSON.parse(diagnostics[0]!)).toEqual({
    schema: 'VidaContourCampaignOutcome/v1',
    status: 'resource-incomplete',
    source_commit: 'fixture-commit',
    error: String(primary),
    receipt_error: String(receipt),
  });
});

test('campaign preserves thrown undefined when receipt and diagnostic reporting fail', () => {
  const receipt = new Error('receipt unavailable');
  const diagnostic = new Error('inherited stderr unavailable');
  let observed: unknown;
  try {
    throwAfterCampaignReceiptFailure(undefined, receipt, { source_commit: 'fixture-commit' }, () => {
      throw diagnostic;
    });
  } catch (error) {
    observed = error;
  }
  expect(observed).toBeInstanceOf(AggregateError);
  if (!(observed instanceof AggregateError)) throw new Error('Expected all three retained failures');
  expect(observed.errors).toEqual([undefined, receipt, diagnostic]);
});

test('campaign storage admission preserves the two GiB boundary', () => {
  const minimum = 2n * 1024n ** 3n;
  expect(campaignStorageAdmitted(minimum - 1n)).toBe(false);
  expect(campaignStorageAdmitted(minimum)).toBe(true);
  expect(campaignStorageAdmitted(minimum + 1n)).toBe(true);
});

const contours: MutationPartition[] = [
  { name: 'lane-a', sources: ['src/a.ts'], tests: ['tests/a.test.ts'] },
  { name: 'lane-b', sources: ['src/b.ts'], tests: ['tests/b.test.ts'] },
];
const completed: CampaignOutcome = { state: 'completed', detail: 'fixture completed' };
const fail = (state: CampaignOutcome['state']): CampaignOutcome => ({ state, detail: `fixture ${state}` });

test('campaign options require exactly one strict selection and reject malformed flags', () => {
  expect(campaignOptions(['--all'])).toEqual({ mode: 'all', plan: false, coverageOnly: false });
  expect(campaignOptions(['--unclosed', '--plan'])).toEqual({
    mode: 'unclosed',
    plan: true,
    coverageOnly: false,
  });
  expect(campaignOptions(['--all', '--coverage-only'])).toEqual({
    mode: 'all',
    plan: false,
    coverageOnly: true,
  });
  for (const args of [
    [],
    ['--all', '--unclosed'],
    ['--all', '--all'],
    ['--all', '--wat'],
    ['--plan'],
    ['--coverage-only'],
    ['--all', '--coverage-only', '--coverage-only'],
  ]) {
    expect(() => campaignOptions(args)).toThrow();
  }
});

test('campaign selection normalizes every active executable registry Source and preserves full test sets', () => {
  const registry = mutationPartitions();
  const selected = selectContourCampaign({ schema: 'VidaContourProgress/v1', attempts: [] }, 'all', 'fixture-commit');
  expect(selected.map((partition) => partition.name)).toEqual(
    registry.filter((partition) => partition.environment !== 'static').map((partition) => partition.name),
  );
  for (const partition of selected) {
    const normalized = campaignPartition(partition);
    expect(normalized.sources).toEqual(
      partition.sources ?? (partition.requiredReportedSource ? [partition.requiredReportedSource] : []),
    );
    expect(normalized.tests).toEqual(partition.tests);
    expect(normalized.sources?.length).toBeGreaterThan(0);
    expect(normalized.tests?.length).toBeGreaterThan(0);
  }
  const linux = campaignPartition(selected.find((partition) => partition.name === 'linux')!);
  expect(linux.sources).toEqual(['src/config/safe-repository-access.ts']);
  expect(linux.tests).toEqual(registry.find((partition) => partition.name === 'linux')?.tests);
});

test('coverage-only selection accepts only current accepted bound exact coverage', () => {
  const target = mutationPartitions().find((partition) => partition.environment !== 'static')!;
  const proof: Parameters<typeof selectContourCampaign>[0]['attempts'][number] = {
    contour: target.name,
    lane: 'coverage',
    run_id: 'coverage-proof',
    recorded_at: '2026-10-19T00:00:00.000Z',
    commit: 'fixture-commit',
    artifact: '/retained/report.json',
    sources: [],
    tests: [],
    tools: [],
    closure: [],
    selected_tests: [{ path: 'tests/fixture.test.ts', sha256: 'a'.repeat(64) }],
    selection_complete: true,
    producer_schema: 'VidaBunFocusedCoverageDiagnostic/v1',
    selection_artifact: null,
    tool_fingerprint: null,
    status: 'pass',
    accepted: true,
    coverage: {
      functions: { covered: 1, total: 1 },
      lines: { covered: 1, total: 1 },
      statements: { covered: 1, total: 1 },
      branches: { covered: 1, total: 1 },
    },
    max_cc: 1,
    max_entry_crap: 1,
    killed: null,
    mutants: null,
    coverage_binding: { report_sha256: 'b'.repeat(64), manifest_sha256: 'c'.repeat(64) },
  };
  const included = (attempts: Parameters<typeof selectContourCampaign>[0]['attempts']) =>
    selectContourCampaign(
      { schema: 'VidaContourProgress/v1', attempts },
      'unclosed',
      'fixture-commit',
      'coverage-only',
    ).some((partition) => partition.name === target.name);
  expect(included([proof])).toBe(false);
  expect(included([{ ...proof, commit: 'historical-commit' }])).toBe(true);
  expect(included([{ ...proof, accepted: false }])).toBe(true);
  expect(included([{ ...proof, selection_complete: false }])).toBe(true);
  const unbound = { ...proof };
  delete unbound.coverage_binding;
  expect(included([unbound])).toBe(true);
  expect(included([{ ...proof, coverage: { ...proof.coverage!, branches: { covered: 0, total: 1 } } }])).toBe(true);
  expect(included([{ ...proof, coverage: { ...proof.coverage!, functions: { covered: 0, total: 0 } } }])).toBe(true);
  expect(
    selectContourCampaign({ schema: 'VidaContourProgress/v1', attempts: [proof] }, 'unclosed', 'fixture-commit').some(
      (partition) => partition.name === target.name,
    ),
  ).toBe(true);
});

test('every contour completes coverage and frozen CRAP before any mutation begins', async () => {
  const events: string[] = [];
  const result = await executeContourCampaign(
    contours,
    async (partition, lane) => {
      events.push(`${partition.name}:${lane}`);
      return completed;
    },
    ({ contour, lane }) => events.push(`record:${contour}:${lane}`),
  );
  expect(result.complete).toBe(true);
  expect(events.filter((entry) => !entry.startsWith('record:'))).toEqual([
    'lane-a:coverage',
    'lane-a:frozen-crap',
    'lane-b:coverage',
    'lane-b:frozen-crap',
    'lane-a:mutation',
    'lane-b:mutation',
  ]);
  expect(result.steps).toHaveLength(6);
});

test.each(['failed', 'gap', 'timeout'] as const)('coverage-only continues after settled %s', async (state) => {
  const calls: string[] = [];
  const result = await executeContourCampaign(
    contours,
    async (partition, lane) => {
      calls.push(`${partition.name}:${lane}`);
      return partition.name === 'lane-a' ? fail(state) : completed;
    },
    () => {},
    true,
  );
  expect(result.complete).toBe(true);
  expect(calls).toEqual(['lane-a:coverage', 'lane-b:coverage']);
  expect(result.steps.map((step) => step.outcome.state)).toEqual([state, 'completed']);
});

test.each(['unknown', 'resource'] as const)('coverage-only %s fences the next contour', async (state) => {
  const calls: string[] = [];
  const result = await executeContourCampaign(
    contours,
    async (partition, lane) => {
      calls.push(`${partition.name}:${lane}`);
      return fail(state);
    },
    () => {},
    true,
  );
  expect(result.complete).toBe(false);
  expect(calls).toEqual(['lane-a:coverage']);
  expect(result.steps).toHaveLength(1);
});

test('settled known failures, gaps and timeouts preserve remaining independent lanes', async () => {
  for (const state of ['failed', 'gap', 'timeout'] as const) {
    const calls: string[] = [];
    const recorded: string[] = [];
    const result = await executeContourCampaign(
      contours,
      async (partition, lane) => {
        calls.push(`${partition.name}:${lane}`);
        return partition.name === 'lane-a' && lane === 'coverage' ? fail(state) : completed;
      },
      ({ contour, lane }) => recorded.push(`${contour}:${lane}`),
    );
    expect(result.complete).toBe(true);
    expect(calls).toEqual([
      'lane-a:coverage',
      'lane-b:coverage',
      'lane-b:frozen-crap',
      'lane-a:mutation',
      'lane-b:mutation',
    ]);
    expect(recorded).toHaveLength(6);
    expect(result.steps[0]?.outcome.state).toBe(state);
    expect(result.steps[1]?.outcome).toEqual({
      state: 'gap',
      detail: 'Same-campaign coverage did not complete at exact maximum; no CRAP producer launched.',
    });
  }
});

test.each(['unknown', 'resource'] as const)('%s records the outcome and fences every successor', async (state) => {
  const calls: string[] = [];
  const recorded: string[] = [];
  const result = await executeContourCampaign(
    contours,
    async (partition, lane) => {
      calls.push(`${partition.name}:${lane}`);
      return fail(state);
    },
    ({ contour, lane, outcome }) => recorded.push(`${contour}:${lane}:${outcome.state}`),
  );
  expect(result.complete).toBe(false);
  expect(calls).toEqual(['lane-a:coverage']);
  expect(recorded).toEqual([`lane-a:coverage:${state}`]);
  expect(result.steps).toHaveLength(1);
});

function processResult(overrides: Partial<MutationProcessResult> = {}): MutationProcessResult {
  return {
    exitCode: 0,
    signal: null,
    spawnError: null,
    timedOut: false,
    processCustody: {
      pid: 42,
      scope: 'owned-process-group',
      terminationObserved: true,
      processGroupTerminationObserved: true,
      unrefCalled: false,
      attempts: [],
    },
    output_capture: {
      complete: true,
      stdout: { bytes: 0, sha256: 'a'.repeat(64), retained_bytes: 0, truncated: false },
      stderr: { bytes: 0, sha256: 'b'.repeat(64), retained_bytes: 0, truncated: false },
    },
    ...overrides,
  };
}

test('process timeout, output gap and raw mutation evidence stay distinct from custody', () => {
  expect(campaignProcessState(processResult())).toBe('completed');
  expect(campaignProcessState(processResult({ timedOut: true }))).toBe('timeout');
  expect(campaignProcessState(processResult({ output_capture: { complete: false } }))).toBe('failed');
  for (const stream of ['stdout', 'stderr'] as const) {
    const result = processResult();
    const capture = result.output_capture;
    if (!capture?.complete) throw new Error('Fixture requires complete capture.');
    capture[stream].truncated = true;
    expect(campaignProcessState(result)).toBe('failed');
  }
  expect(campaignProcessState(processResult({ exitCode: 1 }))).toBe('failed');
  expect(campaignProcessState(processResult({ processCustody: null }))).toBe('unknown');
  expect(
    campaignProcessState(
      processResult({ processCustody: { ...processResult().processCustody!, terminationObserved: false } }),
    ),
  ).toBe('unknown');
  expect(
    campaignProcessState(
      processResult({ processCustody: { ...processResult().processCustody!, processGroupTerminationObserved: false } }),
    ),
  ).toBe('unknown');
});
