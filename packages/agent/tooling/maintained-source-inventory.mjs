import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
/** @typedef {Pick<import('../src/config/safe-repository-access.ts').SafeRepositoryAccess, 'fileExists'|'listFiles'|'readBytes'>} InventoryAccess */
const comparePaths = (/** @type {string} */ left, /** @type {string} */ right) =>
  left < right ? -1 : left > right ? 1 : 0;

export const expectedJavascriptFiles = [
  'documentation/transition-proof.js',
  'index.js',
  'runtime.js',
  'trusted-host.js',
];

/** Historical executable inventory comes only from the selected native manifest. */
/** @param {unknown} inputs @returns {string[]} */
export function runtimeManifestExecutableInventory(inputs) {
  if (!Array.isArray(inputs)) throw new Error('Runtime manifest input inventory is invalid.');
  return inputs
    .map((/** @type {unknown} */ entry) => {
      if (typeof entry !== 'object' || entry === null || !('path' in entry) || typeof entry.path !== 'string')
        throw new Error('Runtime manifest input inventory is invalid.');
      return entry.path;
    })
    .filter(
      (file) =>
        file === 'package.json' ||
        file === 'tooling/maintained-source-inventory.mjs' ||
        /^bin\/.+\.mjs$/.test(file) ||
        /^src\/.+\.ts$/.test(file) ||
        /^schemas\/.+\.json$/.test(file) ||
        /^dist\/schemas\/.+\.json$/.test(file) ||
        expectedJavascriptFiles.some((name) => file === 'dist/src/' + name),
    )
    .sort(comparePaths);
}

/** @param {string} root @param {string} file @param {InventoryAccess|undefined} access */
function inventoryExists(root, file, access) {
  return access ? access.fileExists(file, 'runtime inventory presence') : existsSync(path.join(root, file));
}

/** @param {string} root @param {InventoryAccess} [access] */
export function assertRuntimePackageExports(root, access) {
  if (expectedJavascriptFiles.some((file) => !inventoryExists(root, 'dist/src/' + file, access)))
    throw new Error('Runtime package public exports are incomplete; build the package before production execution.');
}

/** Executable package closure, rooted in the executing package rather than its consumer. */
/** @param {string} root @param {'source'|'dist'} [shape] @param {InventoryAccess} [access] */
export function runtimeExecutableInventory(root, shape = 'source', access) {
  const maintained = maintainedSourceInventory(root, access);
  if (shape !== 'source' && shape !== 'dist') throw new Error('Runtime package execution shape is invalid.');
  const hasDist = expectedJavascriptFiles.some((file) => inventoryExists(root, 'dist/src/' + file, access));
  if (shape === 'dist' || hasDist) assertRuntimePackageExports(root, access);
  const schemas = sourceFiles(path.join(root, 'schemas'), '.json', root, [], access);
  const paths = [
    'package.json',
    'tooling/maintained-source-inventory.mjs',
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

export const bunCoverageSources = [
  'src/host-state.ts',
  'src/lifecycle/lifecycle-state.ts',
  'src/orchestration/persistent-session-handoff.ts',
  'src/orchestration/session-handoff.ts',
  'src/runtime-kernel.ts',
];

/** @param {string} directory @param {string} extension @param {string} root @param {string[]} [values] @param {InventoryAccess} [access] @param {{nodes:number}} [budget] @returns {string[]} */
function sourceFiles(directory, extension, root, values = [], access, budget = { nodes: 0 }) {
  const relative = path.relative(root, directory).replaceAll('\\', '/');
  if (!inventoryExists(root, relative, access)) return values;
  const entries = access
    ? access.listFiles(relative, 'runtime inventory directory')
    : readdirSync(directory, { withFileTypes: true });
  if (access && (budget.nodes += entries.length) > 512) throw new Error('Runtime inventory exceeds the path bound.');
  for (const entry of entries) {
    const name = typeof entry === 'string' ? entry : entry.name;
    const absolute = path.join(directory, name);
    const file = path.relative(root, absolute).replaceAll('\\', '/');
    if (access) access.fileExists(file, 'runtime inventory entry');
    const info = typeof entry === 'string' ? lstatSync(absolute) : entry;
    if (info.isDirectory()) sourceFiles(absolute, extension, root, values, access, budget);
    else if (info.isFile() && name.endsWith(extension)) values.push(file);
  }
  return values;
}

/** @param {string} pattern */
function globRegExp(pattern) {
  let result = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*' && pattern[index + 1] === '*') {
      result += '.*';
      index += 1;
    } else if (character === '*') result += '[^/]*';
    else result += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(result + '$');
}

/** @param {string} file @param {readonly string[]} patterns */
function isPackedFile(file, patterns) {
  return patterns.some((pattern) => globRegExp(pattern).test(file));
}

/** @param {string} root @param {InventoryAccess} [access] */
export function maintainedSourceInventory(root, access) {
  const raw = /** @type {unknown} */ (
    JSON.parse(
      access
        ? access.readBytes('package.json', 'runtime inventory manifest')
        : readFileSync(path.join(root, 'package.json'), 'utf8'),
    )
  );
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('files' in raw) ||
    !Array.isArray(raw.files) ||
    ('bin' in raw && (raw.bin === null || typeof raw.bin !== 'object' || Array.isArray(raw.bin)))
  )
    throw new Error('Package inventory requires files and an optional CLI mapping.');
  const packageJson = /** @type {{files:unknown[];bin?:Record<string,unknown>}} */ (raw);

  const packagePatterns = packageJson.files.map((entry) => String(entry).replaceAll('\\', '/'));
  const allTypescriptSources = sourceFiles(path.join(root, 'src'), '.ts', root, [], access).sort(comparePaths);
  const allBinSources = sourceFiles(path.join(root, 'bin'), '.mjs', root, [], access).sort(comparePaths);
  const typescriptSources = allTypescriptSources.filter((file) => isPackedFile(file, packagePatterns));
  const binSources = allBinSources.filter((file) => isPackedFile(file, packagePatterns));
  const sourceFilesForMutation = [...typescriptSources, ...binSources].sort(comparePaths);
  const publicBinSources = Object.values(packageJson.bin ?? {})
    .map((entry) => String(entry).replaceAll('\\', '/').replace(/^\.\//u, ''))
    .sort(comparePaths);
  const missingPublicBins = publicBinSources.filter(
    (file) => !allBinSources.includes(file) || !isPackedFile(file, packagePatterns),
  );
  const v8CoverageSources = [
    ...new Set([...typescriptSources.filter((file) => !bunCoverageSources.includes(file)), ...binSources]),
  ].sort(comparePaths);
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
    v8CoverageSources,
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
