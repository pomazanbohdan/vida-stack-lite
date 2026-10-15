import { lstatSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const comparePaths = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export const MAINTAINED_SOURCE_ROOTS = [
  'packages/agent',
  'packages/plugin',
  'tests/agent',
  'tooling/agent',
  '.githooks',
] as const;

const GENERATED_BOUNDARIES = new Set([
  'packages/agent/.tmp',
  'packages/agent/dist',
  'packages/agent/node_modules',
  'packages/agent/coverage',
  'packages/plugin/dist',
  'packages/plugin/.tmp',
  'packages/plugin/node_modules',
  'packages/plugin/coverage',
]);

const TYPESCRIPT_EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.tsx']);
const JAVASCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx']);
const MAX_NODES = 100_000;
const MAX_DEPTH = 64;

export type SourceGateReport = {
  schema: 'TsOnlySourceGate/v1';
  roots: string[];
  generatedExcludedPaths: string[];
  codeFiles: string[];
  typescriptFiles: string[];
  counts: {
    files: number;
    typescript: number;
    javascriptViolations: number;
    violations: number;
  };
  violations: Array<{ path: string; extension: string }>;
};

export type GateArguments = { format: 'json' | 'table' };

function sourceExtension(file: string): string | undefined {
  const extension = path.posix.extname(file);
  return JAVASCRIPT_EXTENSIONS.has(extension) || TYPESCRIPT_EXTENSIONS.has(extension) ? extension : undefined;
}

export type MaintainedSourceKind = 'outside' | 'generated' | 'other' | 'typescript' | 'javascript';

function isCodeSourceKind(kind: MaintainedSourceKind): kind is 'typescript' | 'javascript' {
  return kind === 'typescript' || kind === 'javascript';
}

function isGeneratedSourcePath(file: string): boolean {
  for (const boundary of GENERATED_BOUNDARIES) if (file === boundary || file.startsWith(`${boundary}/`)) return true;
  return false;
}

/** Classifies one repository-relative path without consulting the filesystem. */
export function classifyMaintainedSourcePath(file: string): MaintainedSourceKind {
  if (!MAINTAINED_SOURCE_ROOTS.some((root) => file.startsWith(`${root}/`))) return 'outside';
  if (isGeneratedSourcePath(file)) return 'generated';
  const extension = sourceExtension(file);
  if (extension === undefined) return 'other';
  return TYPESCRIPT_EXTENSIONS.has(extension) ? 'typescript' : 'javascript';
}

/** Returns JavaScript paths in the maintained Source domain using the shared filename policy. */
export function findMaintainedJavaScriptViolations(
  files: readonly string[],
): Array<{ path: string; extension: string }> {
  return files
    .filter((file) => classifyMaintainedSourcePath(file) === 'javascript')
    .map((file) => ({ path: file, extension: path.posix.extname(file) }))
    .sort((left, right) => comparePaths(left.path, right.path));
}

function assertSafeRoot(repositoryRoot: string): string {
  if (!path.isAbsolute(repositoryRoot) || path.resolve(repositoryRoot) !== repositoryRoot)
    throw new Error('Repository root must be absolute and normalized.');
  const info = lstatSync(repositoryRoot);
  if (!info.isDirectory() || info.isSymbolicLink() || realpathSync(repositoryRoot) !== repositoryRoot)
    throw new Error('Repository root must be a canonical non-link directory.');
  return repositoryRoot;
}

function assertDeclaredRoots(roots: readonly string[]): void {
  if (!Array.isArray(roots)) throw new Error('Maintained source roots must be an array.');
  if (
    roots.length !== MAINTAINED_SOURCE_ROOTS.length ||
    roots.some((root: string, index: number) => root !== MAINTAINED_SOURCE_ROOTS[index])
  )
    throw new Error('Unknown or reordered maintained source roots are forbidden.');
  if (roots.some((root: string) => !isSafeRelativeRoot(root)))
    throw new Error('Maintained source root escapes the repository.');
}

function isSafeRelativeRoot(root: string): boolean {
  return (
    !path.posix.isAbsolute(root) &&
    root.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
  );
}

/** Enumerates maintained source filenames only; it never reads or executes source contents. */
export function scanMaintainedSources(
  repositoryRoot: string,
  roots: readonly string[] = MAINTAINED_SOURCE_ROOTS,
): SourceGateReport {
  const root = assertSafeRoot(repositoryRoot);
  assertDeclaredRoots(roots);
  const state: ScanState = {
    root,
    visitedNodes: 0,
    files: 0,
    typescript: 0,
    codeFiles: [],
    typescriptFiles: [],
    violations: [],
    generatedExcludedPaths: [],
  };
  for (const sourceRoot of roots) walkDirectory(state, sourceRoot, 0);
  state.violations.sort((left, right) => comparePaths(left.path, right.path));
  state.generatedExcludedPaths.sort(comparePaths);
  state.codeFiles.sort(comparePaths);
  state.typescriptFiles.sort(comparePaths);

  return {
    schema: 'TsOnlySourceGate/v1',
    roots: [...roots],
    generatedExcludedPaths: state.generatedExcludedPaths,
    codeFiles: state.codeFiles,
    typescriptFiles: state.typescriptFiles,
    counts: {
      files: state.files,
      typescript: state.typescript,
      javascriptViolations: state.violations.length,
      violations: state.violations.length,
    },
    violations: state.violations,
  };
}

type ScanState = {
  root: string;
  visitedNodes: number;
  files: number;
  typescript: number;
  codeFiles: string[];
  typescriptFiles: string[];
  violations: SourceGateReport['violations'];
  generatedExcludedPaths: string[];
};

function resolveInsideRoot(root: string, relativePath: string): string {
  const absolutePath = path.resolve(root, relativePath);
  const relativeCheck = path.relative(root, absolutePath);
  if (relativeCheck === '..' || relativeCheck.startsWith(`..${path.sep}`) || path.isAbsolute(relativeCheck))
    throw new Error(`Maintained source path escapes the repository at ${relativePath}.`);
  return absolutePath;
}

function recordFile(state: ScanState, relativePath: string): void {
  const absolutePath = resolveInsideRoot(state.root, relativePath);
  const info = lstatSync(absolutePath);
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error(`Maintained source entry is not a regular file: ${relativePath}.`);
  state.files += 1;
  const classification = classifyMaintainedSourcePath(relativePath);
  if (!isCodeSourceKind(classification)) return;
  state.codeFiles.push(relativePath);
  if (classification === 'typescript') {
    state.typescript += 1;
    state.typescriptFiles.push(relativePath);
  } else state.violations.push({ path: relativePath, extension: path.posix.extname(relativePath) });
}

function visitEntry(
  state: ScanState,
  relativeDirectory: string,
  name: string,
  isDirectory: boolean,
  isLink: boolean,
  depth: number,
): void {
  const relativePath = `${relativeDirectory}/${name}`;
  if (isLink) throw new Error(`Maintained source symbolic link is forbidden: ${relativePath}.`);
  if (isGeneratedSourcePath(relativePath) && isDirectory) {
    state.generatedExcludedPaths.push(relativePath);
    return;
  }
  if (isDirectory) {
    walkDirectory(state, relativePath, depth + 1);
    return;
  }
  recordFile(state, relativePath);
}

function walkDirectory(state: ScanState, relativeDirectory: string, depth: number): void {
  if (depth > MAX_DEPTH) throw new Error(`Maintained source traversal exceeds depth bound at ${relativeDirectory}.`);
  const absoluteDirectory = resolveInsideRoot(state.root, relativeDirectory);
  const directoryInfo = lstatSync(absoluteDirectory);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink())
    throw new Error(`Maintained source directory is unsafe: ${relativeDirectory}.`);
  const entries = readdirSync(absoluteDirectory, { withFileTypes: true }).sort((a, b) => comparePaths(a.name, b.name));
  state.visitedNodes += entries.length;
  if (state.visitedNodes > MAX_NODES) throw new Error('Maintained source traversal exceeds its path bound.');
  for (const entry of entries)
    visitEntry(state, relativeDirectory, entry.name, entry.isDirectory(), entry.isSymbolicLink(), depth);
}

export function parseArguments(arguments_: readonly string[]): GateArguments {
  if (arguments_.length === 0) return { format: 'json' };
  if (arguments_.length !== 2 || arguments_[0] !== '--format' || !['json', 'table'].includes(arguments_[1] ?? ''))
    throw new Error('Unsupported arguments. Usage: ts-only-source-gate [--format json|table].');
  return { format: arguments_[1] as GateArguments['format'] };
}

function renderTable(report: SourceGateReport): string {
  const lines = [
    'TS-only maintained source gate',
    `files=${report.counts.files} typescript=${report.counts.typescript} javascript_violations=${report.counts.javascriptViolations}`,
    `roots=${report.roots.join(',')}`,
    `generated_excluded=${report.generatedExcludedPaths.join(',') || '(none)'}`,
    'path\textension',
    ...report.violations.map(({ path: file, extension }) => `${file}\t${extension}`),
  ];
  return `${lines.join('\n')}\n`;
}

function repositoryRootFromModule(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

if (import.meta.main) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const report = scanMaintainedSources(repositoryRootFromModule());
    process.stdout.write(options.format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : renderTable(report));
    if (report.counts.violations > 0) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Unknown gate failure.'}\n`);
    process.exitCode = 2;
  }
}
