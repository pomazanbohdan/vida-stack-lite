import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { lstatSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedJavascriptFiles, isInventorySourceEntry } from './maintained-source-inventory.ts';
import { captureRuntimeInputClosure, readQualityInputs, sha256 } from './bun-coverage-evidence.ts';
import { checkManifest, pinnedEnvironment, readPin, requireTerminalCommand } from '../bin/bun.ts';
import { resourceDirectory } from '../bin/standalone-resources.ts';
import { ownedDirectoryIdentity, removeOwnedDirectoryOrThrow } from './owned-staging.ts';
import { completeOwnedCleanup } from './owned-cleanup-completion.ts';

const runtimeEntryBytes = "export * from './index.js';\nexport * from './trusted-host.js';\n";

async function filesUnder(directory: string, depth = 0, counter = { paths: 0 }): Promise<string[]> {
  const metadata = lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink())
    throw new Error('SDK formation tree root must be a real directory: ' + directory);
  const entries = await readdir(directory, { withFileTypes: true });
  counter.paths += entries.length;
  if (depth > 64 || counter.paths > 20_000) throw new Error('SDK formation tree limit exceeded.');
  const result: string[] = [];
  for (const entry of entries) {
    if (!isInventorySourceEntry(entry)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('SDK formation input link forbidden: ' + absolute);
    if (entry.isDirectory()) result.push(...(await filesUnder(absolute, depth + 1, counter)));
    else if (entry.isFile()) result.push(absolute);
    else throw new Error('SDK formation input is not a regular file: ' + absolute);
  }
  return result;
}

async function formCapturedPackage(candidateRoot: string) {
  const distRoot = path.join(candidateRoot, 'dist');
  const distSourceRoot = path.join(distRoot, 'src');
  const packageValue: unknown = JSON.parse(await readFile(path.join(candidateRoot, 'package.json'), 'utf8'));
  if (typeof packageValue !== 'object' || packageValue === null || Array.isArray(packageValue))
    throw new Error('candidate package manifest must be a JSON object');
  if (!('files' in packageValue) || !Array.isArray(packageValue.files))
    throw new Error('candidate package manifest files must be a string array');
  const packageFiles: string[] = packageValue.files.filter((file: unknown): file is string => typeof file === 'string');
  if (packageFiles.length !== packageValue.files.length)
    throw new Error('candidate package manifest files must be a string array');
  if (!('version' in packageValue) || typeof packageValue.version !== 'string')
    throw new Error('candidate package manifest version must be a string');
  if (
    !('engines' in packageValue) ||
    typeof packageValue.engines !== 'object' ||
    packageValue.engines === null ||
    !('node' in packageValue.engines) ||
    typeof packageValue.engines.node !== 'string'
  )
    throw new Error('candidate package manifest engines.node must be a string');
  const bunVersion = Bun.version;
  if (bunVersion !== readPin(candidateRoot))
    throw new Error('SDK declaration emission requires the package-selected Bun.');
  checkManifest(candidateRoot, bunVersion);
  const typescriptCli = path.join(candidateRoot, 'node_modules/typescript/bin/tsc');
  const declarationResult = spawnSync(
    process.execPath,
    [
      'run',
      '--bun',
      typescriptCli,
      '--ignoreConfig',
      '--target',
      'ES2024',
      '--lib',
      'ES2024',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--strict',
      '--noUncheckedIndexedAccess',
      '--exactOptionalPropertyTypes',
      '--verbatimModuleSyntax',
      '--isolatedModules',
      '--resolveJsonModule',
      '--esModuleInterop',
      '--forceConsistentCasingInFileNames',
      '--skipLibCheck',
      '--types',
      'node,bun',
      '--rootDir',
      '.',
      '--outDir',
      'dist',
      '--declaration',
      '--emitDeclarationOnly',
      'src/index.ts',
      'src/config/index.ts',
      'src/trusted-host.ts',
      'src/runtime-kernel.ts',
    ],
    {
      cwd: candidateRoot,
      env: pinnedEnvironment(process.execPath, process.env, candidateRoot),
      encoding: 'utf8',
      windowsHide: true,
    },
  );
  requireTerminalCommand(declarationResult, 'captured SDK declaration emission');
  if (declarationResult.status !== 0)
    throw new Error('captured SDK declaration emission failed: ' + declarationResult.stderr + declarationResult.stdout);
  const schemaNames = packageFiles
    .filter((file) => file.startsWith('dist/schemas/') && file.endsWith('.schema.json'))
    .map((file) => file.slice('dist/schemas/'.length));
  if (schemaNames.some((name) => !/^[a-z0-9.-]+\.schema\.json$/u.test(name)))
    throw new Error('candidate package schema path must be one canonical filename');
  const forbiddenTestIssuers = [
    'createTestRuntimeKernelHost',
    'createTestWorkflowHostCapability',
    'createTestFileWorkflowHostCapability',
    'createTestOperationReservationStore',
    'createTestGovernanceGuard',
    'createCompositionRootGovernanceGuard',
    'issueTestTrustedPathProfileOverride',
    'createTestTrustedHostLauncherCapability',
  ];
  const forbiddenInternalDeclarations = [
    'createRuntimeKernelHostProofForCompositionRoot',
    'createWorkflowHostAuthenticationProofForCompositionRoot',
  ];

  function stripDeclaration(text: string, name: string): string {
    const declaration = `export declare function ${name}(`;
    let output = text;
    for (;;) {
      const start = output.indexOf(declaration);
      if (start < 0) return output;
      const end = output.indexOf(';\n', start);
      if (end < 0) throw new Error(`unterminated declaration for ${name}`);
      let contentStart = start;
      const commentStart = output.lastIndexOf('/**', start);
      const lineStart = output.lastIndexOf('\n', start - 1) + 1;
      if (commentStart >= lineStart) contentStart = commentStart;
      output = output.slice(0, contentStart) + output.slice(end + 2);
    }
  }

  function stripExportAlias(text: string, name: string): string {
    return text
      .split('\n')
      .filter((line) => !(line.trim().startsWith('export {') && line.includes(' as ' + name)))
      .join('\n');
  }

  const facadeNames = ['index', 'trusted-host'];
  const transpiler = new Bun.Transpiler({ loader: 'ts' });
  const facadeExports = await Promise.all(
    facadeNames.map(
      async (name) => transpiler.scan(await readFile(path.join(candidateRoot, 'src', name + '.ts'), 'utf8')).exports,
    ),
  );
  const exportedNames = facadeExports.flat();
  if (new Set(exportedNames).size !== exportedNames.length) throw new Error('package entrypoint exports overlap');
  const virtualEntry = path.join(candidateRoot, 'src', 'runtime.ts');
  const build: Bun.BuildOutput = await Bun.build({
    entrypoints: [virtualEntry],
    files: { [virtualEntry]: runtimeEntryBytes },
    outdir: distSourceRoot,
    target: 'bun',
    format: 'esm',
    packages: 'external',
    env: 'disable',
    define: { 'process.env.NODE_ENV': '"production"' },
    splitting: false,
    sourcemap: 'none',
    naming: 'runtime.js',
  });
  if (!build.success) {
    console.error(build.logs);
    throw new Error('candidate package build failed');
  }
  const runtimeExports = new Bun.Transpiler({ loader: 'js' }).scan(
    await readFile(path.join(distSourceRoot, 'runtime.js'), 'utf8'),
  ).exports;
  if (runtimeExports.sort().join(',') !== exportedNames.sort().join(',')) {
    throw new Error('bundled runtime exports differ from the public entrypoint union');
  }
  for (const [index, name] of facadeNames.entries()) {
    const exports = facadeExports[index];
    if (exports === undefined) throw new Error(`missing facade exports for ${name}`);
    await writeFile(
      path.join(distSourceRoot, name + '.js'),
      `export { ${exports.join(', ')} } from './runtime.js';\n`,
      'utf8',
    );
  }
  for (const file of await filesUnder(distSourceRoot)) {
    if (!file.endsWith('.d.ts')) continue;
    let text = await readFile(file, 'utf8');
    forbiddenTestIssuers.forEach((name) => {
      text = stripDeclaration(text, name);
    });
    forbiddenInternalDeclarations.forEach((name) => {
      text = stripDeclaration(text, name);
      text = stripExportAlias(text, name);
    });
    const relative = path.relative(distSourceRoot, file).replaceAll('\\', '/');
    if (relative === 'runtime-kernel.d.ts') text = stripDeclaration(text, 'createRuntimeKernelHost');
    if (relative === 'governance/edictum-boundary.d.ts')
      text = stripDeclaration(text, 'createFileWorkflowHostCapability');
    await writeFile(file, text, 'utf8');
  }

  // Reconciliation source is repository-only until a functional artifact repair
  // command is implemented and shipped with the bundle.
  await rm(path.join(distSourceRoot, 'reconciliation'), { recursive: true, force: true });

  await mkdir(path.join(distRoot, 'schemas'), { recursive: true });
  for (const schemaName of schemaNames) {
    await copyFile(path.join(candidateRoot, 'schemas', schemaName), path.join(distRoot, 'schemas', schemaName));
  }
  await mkdir(path.join(distRoot, 'portable'), { recursive: true });
  await copyFile(path.join(candidateRoot, 'bun.lock'), path.join(distRoot, 'portable', 'bun.lock'));

  const required = [path.join(distSourceRoot, 'index.js'), path.join(distSourceRoot, 'trusted-host.js')];
  for (const file of required) {
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error(`package build did not create ${path.relative(candidateRoot, file)}`);
  }
  // The selector reader starts under Node before Bun routing. Its shared pure
  // proof dependency must not import the bundled Bun/SQLite execution runtime.
  const proofBuild: Bun.BuildOutput = await Bun.build({
    entrypoints: [path.join(candidateRoot, 'src/documentation/transition-proof.ts')],
    outdir: path.join(distSourceRoot, 'documentation'),
    target: 'node',
    format: 'esm',
    packages: 'external',
    env: 'disable',
    splitting: false,
    sourcemap: 'none',
    naming: 'transition-proof.js',
  });
  if (!proofBuild.success) {
    console.error(proofBuild.logs);
    throw new Error('candidate pure proof build failed');
  }
  const javascriptFiles = (await filesUnder(distSourceRoot))
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.relative(distSourceRoot, file).replaceAll('\\', '/'))
    .sort();
  if (javascriptFiles.join(',') !== expectedJavascriptFiles.join(',')) {
    throw new Error(`package build emitted unpublished JavaScript: ${javascriptFiles.join(', ')}`);
  }
  const javascript = (
    await Promise.all(javascriptFiles.map((file) => readFile(path.join(distSourceRoot, file), 'utf8')))
  ).join('\n');
  const shippedIssuer = forbiddenTestIssuers.find((name) => javascript.includes(name));
  if (shippedIssuer) throw new Error(`package build leaked test-only issuer ${shippedIssuer}`);

  return {
    schema: 'CandidatePackageBuild/v1',
    version: packageValue.version,
    declared_node_engine: packageValue.engines.node,
    declaration_runtime: 'bun',
    bun_version: bunVersion,
    production_entrypoints: ['dist/src/index.js', 'dist/src/trusted-host.js'],
    test_issuers_shipped: false,
    schemas: schemaNames.length,
  };
}

/** Finite formation projection: no test discovery, AST inventory or generated SDK input. */
export async function captureSdkFormationInputs(root: string): Promise<Map<string, Buffer>> {
  if (!path.isAbsolute(root)) throw new Error('SDK formation root must be absolute.');
  const sources = (await filesUnder(path.join(root, 'src'))).map((file) =>
    path.relative(root, file).replaceAll('\\', '/'),
  );
  const schemas = (await filesUnder(path.join(root, 'schemas'))).map((file) =>
    path.relative(root, file).replaceAll('\\', '/'),
  );
  const inputBytes = await readQualityInputs(root, [
    ...sources,
    ...schemas,
    'package.json',
    'bun.lock',
    '.bun-version',
    'bunfig.toml',
    'tsconfig.json',
    'tooling/build-package.ts',
  ]);
  await captureRuntimeInputClosure(root, ['tooling/build-package.ts'], sources, [], inputBytes);
  return inputBytes;
}

async function buildPackage(root: string): Promise<void> {
  resourceDirectory(root);
  if (Bun.version !== readPin(root)) throw new Error('SDK formation requires the package-selected Bun.');
  checkManifest(root, Bun.version);
  const rootIdentity = ownedDirectoryIdentity(root);
  const inputs = await captureSdkFormationInputs(root);
  const temporaryParent = path.join(root, '.tmp');
  resourceDirectory(temporaryParent, true);
  const snapshotRoot = mkdtempSync(path.join(temporaryParent, 'sdk-formation-'));
  const snapshotIdentity = ownedDirectoryIdentity(snapshotRoot);
  let snapshotRemoved = false;
  try {
    for (const [file, bytes] of inputs) {
      const destination = path.join(snapshotRoot, ...file.split('/'));
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, bytes, { flag: 'wx', mode: 0o400 });
    }
    // External packages remain a declared dependency trust limit, not captured bytes.
    symlinkSync(
      path.join(root, 'node_modules'),
      path.join(snapshotRoot, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const result = await formCapturedPackage(snapshotRoot);
    for (const [file, bytes] of inputs)
      if (!bytes.equals(await readFile(path.join(snapshotRoot, ...file.split('/')))))
        throw new Error('SDK captured formation input changed: ' + file);
    const outputPaths = (await filesUnder(path.join(snapshotRoot, 'dist'))).map((file) =>
      path.relative(snapshotRoot, file).replaceAll('\\', '/'),
    );
    const outputBytes = await readQualityInputs(snapshotRoot, outputPaths);
    const identities = (entries: Map<string, Buffer>) =>
      [...entries]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([file, bytes]) => ({
          path: file,
          bytes: bytes.length,
          sha256: sha256(bytes),
        }));
    const receipt = {
      ...result,
      bun_version: Bun.version,
      inputs: identities(inputs),
      outputs: identities(outputBytes),
      virtual_runtime_entry: {
        path: 'src/runtime.ts',
        sha256: sha256(runtimeEntryBytes),
      },
      dependency_custody:
        'External node_modules is linked; selected manifest and frozen lock are captured, dependency bytes are outside snapshot custody.',
    };
    assert.deepEqual(ownedDirectoryIdentity(root), rootIdentity, 'SDK formation root was replaced.');
    if (lstatSync(path.join(root, 'dist'), { throwIfNoEntry: false }))
      throw new Error('SDK output destination exists; retain the original formation.');
    const destinationRoot = path.join(root, 'dist');
    mkdirSync(destinationRoot);
    const destinationIdentity = ownedDirectoryIdentity(destinationRoot);
    for (const [file, bytes] of outputBytes) {
      assert.deepEqual(ownedDirectoryIdentity(root), rootIdentity, 'SDK formation root was replaced.');
      assert.deepEqual(ownedDirectoryIdentity(destinationRoot), destinationIdentity, 'SDK output root was replaced.');
      const destination = path.join(root, ...file.split('/'));
      resourceDirectory(path.dirname(destination), true);
      writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
    }
    const exposedBytes = await readQualityInputs(root, outputPaths);
    for (const [file, bytes] of outputBytes)
      assert.deepEqual(exposedBytes.get(file), bytes, 'SDK exposed output changed: ' + file);
    assert.deepEqual(ownedDirectoryIdentity(root), rootIdentity, 'SDK formation root was replaced.');
    assert.deepEqual(ownedDirectoryIdentity(destinationRoot), destinationIdentity, 'SDK output root was replaced.');
    completeOwnedCleanup([() => removeOwnedDirectoryOrThrow(snapshotRoot, snapshotIdentity)]);
    snapshotRemoved = true;
    // Completion is exposed only after known owned cleanup. Partial output stays retained on failure.
    writeFileSync(path.join(destinationRoot, 'sdk-formation.json'), JSON.stringify(receipt) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    console.log(JSON.stringify(receipt));
  } catch (error) {
    console.error('Retained failed SDK formation: ' + (snapshotRemoved ? path.join(root, 'dist') : snapshotRoot));
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildPackage(path.resolve(import.meta.dirname, '..'));
