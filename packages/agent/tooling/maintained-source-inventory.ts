import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.js';

type InventoryAccess = Pick<SafeRepositoryAccess, 'fileExists' | 'listFiles' | 'readBytes'>;
type InventoryManifest = { files: unknown[]; bin?: Record<string, unknown> };

export interface MaintainedSourceInventory {
  readonly typescriptSources: readonly string[];
  readonly binSources: readonly string[];
  readonly mutationSources: readonly string[];
  readonly publicBinSources: readonly string[];
  readonly missingPackageSources: readonly string[];
  readonly repositoryOnlySources: readonly string[];
  readonly bunCoverageSources: readonly string[];
  readonly missingBunCoverageSources: readonly string[];
}
const comparePaths = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

// SafeAccess control sidecars are runtime custody, never executable/resource inputs.
// Match their complete reserved names; ordinary hidden package sources remain selected.
const repositoryControlEntry =
  /^\.(?:.+\.cas\.lock|\.?vida-resource-lock-[a-f0-9]{64}\.lock)(?:\.reclaim)?(?:\.[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(?:released|reclaimed))?$/u;
const resourceReclaimControlEntry =
  /^(?:.+\.lock\.reclaim|\..+\.lock\.reclaim\.[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(?:released|reclaimed))$/u;

export function isInventorySourceEntry(entry: string | { readonly name: string }): boolean {
  const name = typeof entry === 'string' ? entry : entry.name;
  return !(repositoryControlEntry.test(name) || resourceReclaimControlEntry.test(name));
}

export const expectedJavascriptFiles: readonly string[] = [
  'documentation/transition-proof.js',
  'index.js',
  'runtime.js',
  'trusted-host.js',
];

/** Historical executable inventory comes only from the selected native manifest. */
export function runtimeManifestExecutableInventory(inputs: unknown): string[] {
  if (!Array.isArray(inputs)) throw new Error('Runtime manifest input inventory is invalid.');
  return inputs
    .map((entry: unknown) => {
      if (typeof entry !== 'object' || entry === null || !('path' in entry) || typeof entry.path !== 'string')
        throw new Error('Runtime manifest input inventory is invalid.');
      return entry.path;
    })
    .filter(
      (file) =>
        file === 'package.json' ||
        file === 'tooling/maintained-source-inventory.mjs' ||
        file === 'tooling/maintained-source-inventory.ts' ||
        /^bin\/.+\.(?:mjs|ts)$/.test(file) ||
        /^src\/.+\.ts$/.test(file) ||
        /^schemas\/.+\.json$/.test(file) ||
        /^dist\/schemas\/.+\.json$/.test(file) ||
        expectedJavascriptFiles.some((name) => file === 'dist/src/' + name),
    )
    .sort(comparePaths);
}

function inventoryExists(root: string, file: string, access: InventoryAccess | undefined): boolean {
  return access ? access.fileExists(file, 'runtime inventory presence') : existsSync(path.join(root, file));
}

export function assertRuntimePackageExports(root: string, access?: InventoryAccess): void {
  if (expectedJavascriptFiles.some((file) => !inventoryExists(root, 'dist/src/' + file, access)))
    throw new Error('Runtime package public exports are incomplete; build the package before production execution.');
}

/** Executable package closure, rooted in the executing package rather than its consumer. */
export function runtimeExecutableInventory(
  root: string,
  shape: 'source' | 'dist' = 'source',
  access?: InventoryAccess,
): readonly string[] {
  const maintained = maintainedSourceInventory(root, access);
  if (shape !== 'source' && shape !== 'dist') throw new Error('Runtime package execution shape is invalid.');
  const hasDist = expectedJavascriptFiles.some((file) => inventoryExists(root, 'dist/src/' + file, access));
  if (shape === 'dist' || hasDist) assertRuntimePackageExports(root, access);
  const schemas = sourceFiles(path.join(root, 'schemas'), '.json', root, [], access);
  const paths = [
    'package.json',
    'tooling/maintained-source-inventory.ts',
    ...maintained.binSources,
    ...maintained.typescriptSources,
    ...schemas,
    ...(hasDist ? expectedJavascriptFiles.map((file) => 'dist/src/' + file) : []),
    ...(hasDist ? sourceFiles(path.join(root, 'dist', 'schemas'), '.json', root, [], access) : []),
  ].sort(comparePaths);
  if (!paths.length || paths.some((file) => !inventoryExists(root, file, access)))
    throw new Error('Runtime package executable inventory is incomplete.');
  return paths;
}

function standaloneResourcePaths(root: string, relative: string, files: string[], budget: { nodes: number }): void {
  const directory = lstatSync(path.join(root, relative));
  if (!directory.isDirectory() || directory.isSymbolicLink())
    throw new Error('Standalone resource directory is unsafe.');
  const entries = readdirSync(path.join(root, relative), { withFileTypes: true });
  if ((budget.nodes += entries.length) > 16384)
    throw new Error('Standalone resource inventory exceeds the path bound.');
  for (const entry of entries.filter(isInventorySourceEntry)) {
    const file = relative + '/' + entry.name;
    if (entry.isSymbolicLink()) throw new Error('Standalone source link forbidden.');
    if (entry.isDirectory()) standaloneResourcePaths(root, file, files, budget);
    else {
      if (!entry.isFile()) throw new Error('Standalone source must be regular.');
      files.push(file);
    }
  }
}

/** Complete build input path contract shared by native formation and retarget admission. */
export function standaloneBuildInputInventory(root: string): string[] {
  const files = [
    ...runtimeExecutableInventory(root, 'dist'),
    'TESTING.md',
    '.bun-version',
    'bun.lock',
    'bunfig.toml',
    'tooling/build-standalone.ts',
    'tooling/pack-sdk.ts',
    'tooling/owned-staging.ts',
  ];
  const budget = { nodes: 0 };
  for (const directory of ['instructions', 'templates', 'schemas'])
    standaloneResourcePaths(root, directory, files, budget);
  return [...new Set(files)].sort(comparePaths);
}

const bunCoverageSources = [
  'src/host-state.ts',
  'src/lifecycle/lifecycle-state.ts',
  'src/orchestration/persistent-session-handoff.ts',
  'src/orchestration/session-handoff.ts',
  'src/runtime-kernel.ts',
];

function inventoryDirectoryEntries(
  directory: string,
  relative: string,
  access: InventoryAccess | undefined,
  budget: { nodes: number },
) {
  const entries = access
    ? access.listFiles(relative, 'runtime inventory directory')
    : readdirSync(directory, { withFileTypes: true });
  if (access && (budget.nodes += entries.length) > 512) throw new Error('Runtime inventory exceeds the path bound.');
  return entries.filter(isInventorySourceEntry);
}

function sourceFiles(
  directory: string,
  extension: string | readonly string[],
  root: string,
  values: string[] = [],
  access?: InventoryAccess,
  budget = { nodes: 0 },
): string[] {
  const extensions = typeof extension === 'string' ? [extension] : extension;
  const relative = path.relative(root, directory).replaceAll('\\', '/');
  if (!inventoryExists(root, relative, access)) return values;
  const entries = inventoryDirectoryEntries(directory, relative, access, budget);
  for (const entry of entries) {
    const name = typeof entry === 'string' ? entry : entry.name;
    const absolute = path.join(directory, name);
    const file = path.relative(root, absolute).replaceAll('\\', '/');
    if (access) access.fileExists(file, 'runtime inventory entry');
    const info = typeof entry === 'string' ? lstatSync(absolute) : entry;
    if (info.isDirectory()) sourceFiles(absolute, extensions, root, values, access, budget);
    else if (info.isFile() && extensions.some((suffix) => name.endsWith(suffix))) values.push(file);
  }
  return values;
}

function globRegExp(pattern: string): RegExp {
  let result = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern.charAt(index);
    if (character === '*' && pattern[index + 1] === '*') {
      result += '.*';
      index += 1;
    } else if (character === '*') result += '[^/]*';
    else result += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(result + '$');
}

function isPackedFile(file: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(file));
}

function includedByPackageFiles(file: string, included: readonly RegExp[], excluded: readonly RegExp[]): boolean {
  return isPackedFile(file, included) && !isPackedFile(file, excluded);
}

/** One owner for package-files glob selection, including exclusions and recursive `**`. */
export function selectMaintainedSourcePaths(files: readonly string[], patterns: readonly string[]): string[] {
  const included = patterns.filter((pattern) => !pattern.startsWith('!')).map(globRegExp);
  const excluded = patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => globRegExp(pattern.slice(1)));
  return files.filter((file) => includedByPackageFiles(file, included, excluded)).sort(comparePaths);
}

function isInventoryManifest(value: unknown): value is InventoryManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'files' in value &&
    Array.isArray(value.files) &&
    (!('bin' in value) || (value.bin !== null && typeof value.bin === 'object' && !Array.isArray(value.bin)))
  );
}

function inventoryManifest(bytes: Uint8Array): InventoryManifest {
  const raw: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!isInventoryManifest(raw)) throw new Error('Package inventory requires files and an optional CLI mapping.');
  return raw;
}

export function maintainedSourceInventory(
  root: string,
  access?: InventoryAccess,
  capturedManifest?: Uint8Array,
): MaintainedSourceInventory {
  const bytes =
    capturedManifest ??
    (access
      ? access.readBytes('package.json', 'runtime inventory manifest')
      : readFileSync(path.join(root, 'package.json')));
  const packageJson = inventoryManifest(bytes);

  const packagePatterns = packageJson.files.map((entry) => String(entry).replaceAll('\\', '/'));
  const packedPatterns = packagePatterns.map(globRegExp);
  const allTypescriptSources = sourceFiles(path.join(root, 'src'), '.ts', root, [], access).sort(comparePaths);
  const allBinSources = sourceFiles(path.join(root, 'bin'), ['.mjs', '.ts'], root, [], access).sort(comparePaths);
  const typescriptSources = selectMaintainedSourcePaths(allTypescriptSources, packagePatterns);
  const binSources = selectMaintainedSourcePaths(allBinSources, packagePatterns);
  const sourceFilesForMutation = [...typescriptSources, ...binSources].sort(comparePaths);
  const publicBinSources = Object.values(packageJson.bin ?? {})
    .map((entry) => String(entry).replaceAll('\\', '/').replace(/^\.\//u, ''))
    .sort(comparePaths);
  const missingPublicBins = publicBinSources.filter(
    (file) => !allBinSources.includes(file) || !isPackedFile(file, packedPatterns),
  );
  const missingBunCoverageSources = bunCoverageSources.filter((file) => !typescriptSources.includes(file));
  const missingPackageSources = [...new Set([...publicBinSources, ...bunCoverageSources])].filter(
    (file) => !sourceFilesForMutation.includes(file),
  );

  if (missingPublicBins.length)
    throw new Error(
      `Public package bins are absent from the maintained source inventory: ${missingPublicBins.join(', ')}`,
    );
  if (!sourceFilesForMutation.length) throw new Error('Package source inventory is empty.');

  return {
    typescriptSources,
    binSources,
    mutationSources: sourceFilesForMutation,
    publicBinSources,
    missingPackageSources,
    repositoryOnlySources: [...allTypescriptSources, ...allBinSources]
      .filter((file) => !sourceFilesForMutation.includes(file))
      .sort(comparePaths),
    bunCoverageSources: [...bunCoverageSources],
    missingBunCoverageSources,
  };
}
