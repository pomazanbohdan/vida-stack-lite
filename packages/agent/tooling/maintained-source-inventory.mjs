import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const expectedJavascriptFiles = [
  'documentation/transition-proof.js',
  'index.js',
  'runtime.js',
  'trusted-host.js',
];

function inventoryExists(root, file, access) {
  return access ? access.fileExists(file, 'runtime inventory presence') : existsSync(path.join(root, file));
}

export function assertRuntimePackageExports(root, access) {
  if (expectedJavascriptFiles.some((file) => !inventoryExists(root, 'dist/src/' + file, access)))
    throw new Error('Runtime package public exports are incomplete; build the package before production execution.');
}

/** Executable package closure, rooted in the executing package rather than its consumer. */
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
  ].sort();
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

function sourceFiles(directory, extension, root, values = [], access, budget = { nodes: 0 }) {
  const relative = path.relative(root, directory).replaceAll('\\', '/');
  if (!inventoryExists(root, relative, access)) return values;
  const entries = access
    ? access.listFiles(relative, 'runtime inventory directory')
    : readdirSync(directory, { withFileTypes: true });
  if (access && (budget.nodes += entries.length) > 512) throw new Error('Runtime inventory exceeds the path bound.');
  for (const entry of entries) {
    const name = access ? entry : entry.name;
    const absolute = path.join(directory, name);
    const file = path.relative(root, absolute).replaceAll('\\', '/');
    if (access) access.fileExists(file, 'runtime inventory entry');
    const info = access ? lstatSync(absolute) : entry;
    if (info.isDirectory()) sourceFiles(absolute, extension, root, values, access, budget);
    else if (info.isFile() && name.endsWith(extension)) values.push(file);
  }
  return values;
}

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

function isPackedFile(file, patterns) {
  return patterns.some((pattern) => globRegExp(pattern).test(file));
}

export function maintainedSourceInventory(root, access) {
  const packageJson = JSON.parse(
    access
      ? access.readBytes('package.json', 'runtime inventory manifest')
      : readFileSync(path.join(root, 'package.json'), 'utf8'),
  );
  if (!Array.isArray(packageJson.files) || !packageJson.bin || typeof packageJson.bin !== 'object')
    throw new Error('Package source inventory requires files and bin declarations.');

  const packagePatterns = packageJson.files.map((entry) => String(entry).replaceAll('\\', '/'));
  const allTypescriptSources = sourceFiles(path.join(root, 'src'), '.ts', root, [], access).sort();
  const allBinSources = sourceFiles(path.join(root, 'bin'), '.mjs', root, [], access).sort();
  const typescriptSources = allTypescriptSources.filter((file) => isPackedFile(file, packagePatterns));
  const binSources = allBinSources.filter((file) => isPackedFile(file, packagePatterns));
  const sourceFilesForMutation = [...typescriptSources, ...binSources].sort();
  const publicBinSources = Object.values(packageJson.bin)
    .map((entry) => String(entry).replaceAll('\\', '/').replace(/^\.\//u, ''))
    .sort();
  const missingPublicBins = publicBinSources.filter(
    (file) => !allBinSources.includes(file) || !isPackedFile(file, packagePatterns),
  );
  const v8CoverageSources = [
    ...new Set([...typescriptSources.filter((file) => !bunCoverageSources.includes(file)), ...binSources]),
  ].sort();
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
      .sort(),
    bunCoverageSources: [...bunCoverageSources],
    missingBunCoverageSources,
  };
}
