import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { qualityImageMountArguments } from '../tooling/quality-image-mounts.ts';
import type { QualityExecutionImage } from '../tooling/quality-execution-image.ts';
import { executeMutationCommand } from '../tooling/mutation-evidence.ts';

const roots: { path: string; completed: boolean }[] = [];

function fixture() {
  const base = mkdtempSync(path.join(os.tmpdir(), 'quality-image-mounts-'));
  const owner = { path: base, completed: false };
  roots.push(owner);
  const source = path.join(base, 'source');
  const repository = path.join(base, 'store', 'image', 'repository');
  const packageRoot = path.join(repository, 'packages', 'agent');
  const dependency = path.join(source, 'packages', 'agent', 'node_modules');
  const stage = path.join(base, 'stage');
  for (const directory of [
    source,
    path.join(packageRoot, 'coverage'),
    path.join(packageRoot, '.tmp'),
    path.join(packageRoot, 'node_modules'),
    dependency,
    stage,
  ])
    mkdirSync(directory, { recursive: true });
  const image: QualityExecutionImage = {
    schema: 'VidaQualityExecutionImage/v1',
    repository,
    packageRoot,
    source_repository: source,
    source_commit: 'a'.repeat(40),
    source_tree: 'b'.repeat(40),
    input_fingerprint: 'c'.repeat(64),
    manifest_file: path.join(repository, '.quality-image.json'),
    manifest_sha256: 'd'.repeat(64),
    dependency_root: dependency,
  };
  return {
    base,
    source,
    repository,
    packageRoot,
    dependency,
    stage,
    image,
    complete: () => {
      owner.completed = true;
    },
  };
}

afterEach(() => {
  for (const owner of roots.splice(0)) {
    if (owner.completed) rmSync(owner.path, { recursive: true, force: true });
    else
      process.stderr.write(
        JSON.stringify({ fixture: 'quality-image-mounts', root: owner.path, cleanup: 'retained' }) + '\n',
      );
  }
});

test('mounts immutable image and dependencies before hiding Source, with only bounded writable roots', () => {
  const { image, repository, dependency, source, packageRoot, stage, complete } = fixture();
  const args = qualityImageMountArguments(image, stage);
  const coverage = path.join(packageRoot, 'coverage');
  const temporary = path.join(packageRoot, '.tmp');
  const mountpoint = path.join(packageRoot, 'node_modules');
  expect(args).toEqual([
    '--ro-bind',
    repository,
    repository,
    '--ro-bind',
    dependency,
    mountpoint,
    '--tmpfs',
    source,
    '--remount-ro',
    source,
    '--bind',
    coverage,
    coverage,
    '--bind',
    temporary,
    temporary,
    '--bind',
    stage,
    stage,
  ]);
  const writableSources: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--bind') writableSources.push(args[index + 1]!);
  }
  expect(writableSources).toEqual([coverage, temporary, stage]);
  expect(writableSources).not.toContain(repository);
  expect(writableSources).not.toContain(source);
  expect(writableSources).not.toContain(dependency);
  complete();
});

test('native mount hides live Source, denies input writes and retains output writes', async () => {
  const { base, image, source, repository, dependency, packageRoot, stage, complete } = fixture();
  writeFileSync(path.join(source, 'live-secret'), 'live Source');
  writeFileSync(path.join(repository, 'input'), 'sealed');
  writeFileSync(path.join(dependency, 'qualified'), 'dependency');
  const probe = `
    const fs = require('node:fs');
    const [source, repository, packageRoot] = process.argv.slice(1);
    if (fs.existsSync(source + '/live-secret')) throw new Error('live Source visible');
    for (const file of [source + '/new', repository + '/input', packageRoot + '/node_modules/new']) {
      let denied = false;
      try { fs.writeFileSync(file, 'unexpected'); } catch (error) { denied = error.code === 'EROFS' || error.code === 'EACCES'; }
      if (!denied) throw new Error('input write allowed: ' + file);
    }
    if (fs.readFileSync(packageRoot + '/node_modules/qualified', 'utf8') !== 'dependency') throw new Error('dependency unavailable');
    fs.writeFileSync(packageRoot + '/coverage/result', 'coverage');
    fs.writeFileSync(packageRoot + '/.tmp/result', 'temporary');
  `;
  const command = [
    'bwrap',
    '--die-with-parent',
    '--ro-bind',
    '/',
    '/',
    ...qualityImageMountArguments(image, stage),
    '--chdir',
    packageRoot,
    process.execPath,
    '--no-env-file',
    '--no-install',
    '-e',
    probe,
    source,
    repository,
    packageRoot,
  ];
  const timeoutMs = 3000;
  writeFileSync(
    path.join(base, 'launch.json'),
    JSON.stringify({ command, cwd: packageRoot, timeout_ms: timeoutMs }) + '\n',
    {
      flag: 'wx',
    },
  );
  const result = await executeMutationCommand(command, packageRoot, timeoutMs, {
    ownedProcessGroup: true,
    outputByteLimit: 1024 * 1024,
    stdoutFile: path.join(base, 'stdout.log'),
    stderrFile: path.join(base, 'stderr.log'),
  });
  writeFileSync(path.join(base, 'execution.json'), JSON.stringify(result) + '\n', { flag: 'wx' });
  expect(result.spawnError).toBeNull();
  expect(result.exitCode).toBe(0);
  expect(result.signal).toBeNull();
  expect(result.timedOut).toBe(false);
  expect(result.output_capture).toMatchObject({
    complete: true,
    stdout: { truncated: false },
    stderr: { bytes: 0, truncated: false },
  });
  expect(result.processCustody?.processGroupTerminationObserved).toBe(true);
  expect(readFileSync(path.join(repository, 'input'), 'utf8')).toBe('sealed');
  expect(readFileSync(path.join(packageRoot, 'coverage/result'), 'utf8')).toBe('coverage');
  expect(readFileSync(path.join(packageRoot, '.tmp/result'), 'utf8')).toBe('temporary');
  complete();
});

test('rejects noncanonical roots, stage paths inside inputs, and writable aliases', () => {
  const { image, source, repository, stage, packageRoot, base, complete } = fixture();
  mkdirSync(path.join(source, 'stage'));
  mkdirSync(path.join(repository, 'stage'));
  expect(() => qualityImageMountArguments(image, 'relative-stage')).toThrow(/canonical absolute/u);
  expect(() => qualityImageMountArguments({ ...image, repository: `${repository}/../repository` }, stage)).toThrow(
    /canonical/u,
  );
  expect(() => qualityImageMountArguments(image, path.join(source, 'stage'))).toThrow(
    /stage directory overlaps an input root/u,
  );
  expect(() => qualityImageMountArguments(image, path.join(repository, 'stage'))).toThrow(
    /stage directory overlaps an input root/u,
  );

  const stageAlias = path.join(base, 'stage-alias');
  symlinkSync(stage, stageAlias, 'dir');
  expect(() => qualityImageMountArguments(image, stageAlias)).toThrow(/existing real directory|path alias/u);

  const coverage = path.join(packageRoot, 'coverage');
  rmSync(coverage, { recursive: true });
  symlinkSync(stage, coverage, 'dir');
  expect(() => qualityImageMountArguments(image, stage)).toThrow(/existing real directory|path alias/u);
  complete();
});

test('rejects dependency roots inside the image and nonempty dependency mountpoints', () => {
  const { image, repository, stage, packageRoot, complete } = fixture();
  const inImageDependency = path.join(repository, 'dependency');
  mkdirSync(inImageDependency);
  expect(() => qualityImageMountArguments({ ...image, dependency_root: inImageDependency }, stage)).toThrow(
    /dependency root overlaps an input root/u,
  );

  const nodeModules = path.join(packageRoot, 'node_modules');
  mkdirSync(path.join(nodeModules, 'sentinel'));
  expect(() => qualityImageMountArguments(image, stage)).toThrow(/mountpoint must be empty/u);
  complete();
});
