import { lstatSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import type { QualityExecutionImage } from './quality-execution-image.ts';

function canonicalDirectory(candidate: string, label: string): string {
  if (!path.isAbsolute(candidate) || path.resolve(candidate) !== candidate)
    throw new Error(`Quality image ${label} must be a canonical absolute path.`);
  let resolved: string;
  try {
    resolved = realpathSync(candidate);
    const stat = lstatSync(candidate);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('not a real directory');
  } catch {
    throw new Error(`Quality image ${label} must be an existing real directory.`);
  }
  if (resolved !== candidate) throw new Error(`Quality image ${label} must not use a path alias.`);
  return resolved;
}

function contains(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
}

function overlaps(left: string, right: string): boolean {
  return contains(left, right) || contains(right, left);
}

function aliases(left: string, right: string): boolean {
  const leftStat = statSync(left);
  const rightStat = statSync(right);
  return leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino;
}

function assertDisjointFrom(root: string, inputs: readonly string[], label: string): void {
  for (const input of inputs) {
    if (overlaps(root, input) || aliases(root, input))
      throw new Error(`Quality image ${label} overlaps an input root.`);
  }
}

function assertInputRootsDisjoint(
  repository: string,
  packageRoot: string,
  sourceRepository: string,
  dependencyRoot: string,
  stage: string,
): void {
  if (packageRoot !== path.join(repository, 'packages', 'agent'))
    throw new Error('Quality image package root must be the agent package inside its repository.');
  assertDisjointFrom(repository, [sourceRepository], 'live Source repository');
  assertDisjointFrom(repository, [dependencyRoot], 'dependency root');
  assertDisjointFrom(stage, [sourceRepository, repository, dependencyRoot], 'stage directory');
}

function assertWritableDisjoint(roots: readonly string[], inputs: readonly string[]): void {
  for (const root of roots) assertDisjointFrom(root, inputs, 'writable mount');
}

function assertNoAliases(roots: readonly string[], inputs: readonly string[]): void {
  for (const root of roots) {
    for (const input of inputs) {
      if (aliases(root, input)) throw new Error('Quality image writable mount aliases an input root.');
    }
  }
}

function assertNoMountOverlap(roots: readonly string[]): void {
  for (let left = 0; left < roots.length; left += 1) {
    for (let right = left + 1; right < roots.length; right += 1) {
      if (overlaps(roots[left]!, roots[right]!) || aliases(roots[left]!, roots[right]!))
        throw new Error('Quality image mounts must not overlap or alias.');
    }
  }
}

function writableMounts(
  repository: string,
  packageRoot: string,
  sourceRepository: string,
  dependencyRoot: string,
  stage: string,
) {
  const nodeModules = path.join(packageRoot, 'node_modules');
  const coverage = canonicalDirectory(path.join(packageRoot, 'coverage'), 'coverage mount');
  const temporary = canonicalDirectory(path.join(packageRoot, '.tmp'), 'temporary mount');
  const mountpoint = canonicalDirectory(nodeModules, 'dependency mountpoint');
  if (readdirSync(mountpoint).length !== 0) throw new Error('Quality image dependency mountpoint must be empty.');
  assertNoMountOverlap([coverage, temporary, mountpoint]);
  if ([coverage, temporary].some((root) => !contains(packageRoot, root)))
    throw new Error('Quality image writable package mounts must stay inside the image package.');
  assertNoAliases([coverage, temporary], [repository]);
  assertWritableDisjoint([coverage, temporary], [sourceRepository, dependencyRoot, stage]);
  return { coverage, temporary, mountpoint };
}

/** Build the bounded writable exceptions for a verified execution image. */
export function qualityImageMountArguments(image: QualityExecutionImage, stageDirectory: string): string[] {
  if (image.schema !== 'VidaQualityExecutionImage/v1') throw new Error('Quality image schema is invalid.');
  const repository = canonicalDirectory(image.repository, 'repository');
  const packageRoot = canonicalDirectory(image.packageRoot, 'package root');
  const sourceRepository = canonicalDirectory(image.source_repository, 'source repository');
  const dependencyRoot = canonicalDirectory(image.dependency_root, 'dependency root');
  const stage = canonicalDirectory(stageDirectory, 'stage directory');
  assertInputRootsDisjoint(repository, packageRoot, sourceRepository, dependencyRoot, stage);
  const { coverage, temporary, mountpoint } = writableMounts(
    repository,
    packageRoot,
    sourceRepository,
    dependencyRoot,
    stage,
  );

  return [
    '--ro-bind',
    repository,
    repository,
    '--ro-bind',
    dependencyRoot,
    mountpoint,
    '--tmpfs',
    sourceRepository,
    '--remount-ro',
    sourceRepository,
    '--bind',
    coverage,
    coverage,
    '--bind',
    temporary,
    temporary,
    '--bind',
    stage,
    stage,
  ];
}
