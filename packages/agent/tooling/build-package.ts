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
import { executeMutationCommand } from './mutation-evidence.ts';
import { captureSelectedSdkTestInputsFromCapturedBytes } from './sdk-artifact-capture.ts';
import { isRecord } from '../src/contracts/forward-controller-values.ts';

const runtimeEntryBytes = "export * from './index.js';\nexport * from './trusted-host.js';\n";

const sdkFormationBaseInputs = ['package.json', 'bun.lock', '.bun-version', 'bunfig.toml', 'tsconfig.json'] as const;

export type SdkFormationProjectionCapture = {
  inputBytes: ReadonlyMap<string, Buffer>;
  sourcePaths: readonly string[];
  schemaPaths: readonly string[];
  buildToolPaths: readonly string[];
};

function checkedProjectionPaths(label: string, paths: readonly string[], prefix: string): string[] {
  if (!Array.isArray(paths)) throw new Error(`SDK formation ${label} inventory is invalid.`);
  const checked: string[] = [];
  const candidates: readonly unknown[] = paths;
  for (const file of candidates) {
    if (
      typeof file !== 'string' ||
      !file.startsWith(prefix) ||
      file.includes('\\') ||
      file.includes('\0') ||
      path.posix.isAbsolute(file) ||
      file.split('/').some((part) => part === '' || part === '.' || part === '..')
    )
      throw new Error(`SDK formation ${label} inventory is invalid.`);
    checked.push(file);
  }
  if (new Set(checked).size !== checked.length) throw new Error(`SDK formation ${label} inventory is invalid.`);
  return checked.sort((left, right) => left.localeCompare(right));
}

/** Project the SDK's exact input inventory from an existing authoritative byte capture. */
export function projectSdkFormationInputBytes(capture: SdkFormationProjectionCapture): Map<string, Buffer> {
  const sourcePaths = checkedProjectionPaths('source', capture.sourcePaths, 'src/');
  const schemaPaths = checkedProjectionPaths('schema', capture.schemaPaths, 'schemas/');
  const buildToolPaths = checkedProjectionPaths('build-tool', capture.buildToolPaths, '');
  if (buildToolPaths.some((file) => !/^(?:bin|tooling)\//u.test(file)))
    throw new Error('SDK formation build-tool inventory is outside maintained tool roots.');
  const selectedPaths = [
    ...sourcePaths,
    ...schemaPaths,
    ...sdkFormationBaseInputs,
    'tooling/build-package.ts',
    ...buildToolPaths,
  ];
  if (new Set(selectedPaths).size !== selectedPaths.length)
    throw new Error('SDK formation input inventory contains duplicates.');

  const selectedSet = new Set(selectedPaths);
  for (const file of capture.inputBytes.keys()) {
    if ((file.startsWith('src/') || file.startsWith('schemas/')) && !selectedSet.has(file))
      throw new Error(`SDK formation captured source or schema drift: ${file}`);
  }
  const result = new Map<string, Buffer>();
  for (const file of selectedPaths.sort()) {
    const bytes = capture.inputBytes.get(file);
    if (!bytes) throw new Error(`SDK formation capture is missing input bytes: ${file}`);
    result.set(file, bytes);
  }
  return result;
}

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
    ...sdkFormationBaseInputs,
    'tooling/build-package.ts',
  ]);
  const buildToolPaths = (
    await captureRuntimeInputClosure(root, ['tooling/build-package.ts'], sources, [], inputBytes)
  ).filter(
    (file) => file !== 'tooling/build-package.ts' && !sdkFormationBaseInputs.some((selected) => selected === file),
  );
  return projectSdkFormationInputBytes({
    inputBytes,
    sourcePaths: sources,
    schemaPaths: schemas,
    buildToolPaths,
  });
}

/** Test compilation is a distinct input artifact, never a deliverable product build. */
export function sdkBuildReceiptIdentity(
  args: readonly string[],
): { schema: 'CandidatePackageBuild/v1' } | { schema: 'CandidateSdkTestInputs/v1'; purpose: 'development-tests' } {
  if (args.length === 0) return { schema: 'CandidatePackageBuild/v1' };
  if (args.length === 1 && args[0] === '--test-inputs')
    return { schema: 'CandidateSdkTestInputs/v1', purpose: 'development-tests' };
  throw new Error('Unsupported SDK build argument.');
}

async function buildPackage(root: string, identity: ReturnType<typeof sdkBuildReceiptIdentity>): Promise<void> {
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
      ...identity,
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

/** Build test-only SDK outputs from the caller's one captured input set. */
export async function buildSdkTestInputsFromCapturedInputs(
  root: string,
  selectedInputs: ReadonlyMap<string, Buffer>,
  remainingMs: () => number,
): Promise<Map<string, Buffer>> {
  if (!path.isAbsolute(root) || path.resolve(root) !== root)
    throw new Error('SDK formation root must be canonical and absolute.');
  resourceDirectory(root);
  if (Bun.version !== readPin(root)) throw new Error('SDK formation requires the package-selected Bun.');
  checkManifest(root, Bun.version);
  const ownedInputs = new Map([...selectedInputs].map(([file, bytes]) => [file, Buffer.from(bytes)]));
  const requiredInputs = [...sdkFormationBaseInputs, 'tooling/build-package.ts'];
  if (requiredInputs.some((file) => !ownedInputs.has(file)))
    throw new Error('Captured SDK formation inputs are missing required package files.');
  for (const file of ownedInputs.keys()) {
    if (
      file.includes('\\') ||
      file.includes('\0') ||
      path.posix.isAbsolute(file) ||
      file.split('/').some((part) => part === '' || part === '.' || part === '..') ||
      !(/^(?:src|schemas|bin|tooling)\//u.test(file) || sdkFormationBaseInputs.some((base) => base === file))
    )
      throw new Error('Captured SDK formation input path is invalid: ' + file);
  }
  const inputs = ownedInputs;
  const temporaryParent = path.join(root, '.tmp');
  resourceDirectory(temporaryParent, true);
  const snapshotRoot = mkdtempSync(path.join(temporaryParent, 'sdk-formation-'));
  const snapshotIdentity = ownedDirectoryIdentity(snapshotRoot);
  let snapshotRemoved = false;
  let producerClosureObserved = true;
  const evidenceParent = path.join(root, 'coverage/sdk-test-inputs');
  resourceDirectory(evidenceParent, true);
  const evidenceRoot = mkdtempSync(path.join(evidenceParent, 'build-'));
  try {
    let copied = 0;
    for (const [file, bytes] of inputs) {
      if ((copied++ & 31) === 0 && remainingMs() <= 0) throw new Error('SDK test-input preparation budget is spent.');
      const destination = path.join(snapshotRoot, ...file.split('/'));
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, Buffer.from(bytes), { flag: 'wx', mode: 0o400 });
    }
    symlinkSync(
      path.join(root, 'node_modules'),
      path.join(snapshotRoot, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const childScript = path.join(snapshotRoot, 'tooling/build-package.ts');
    const timeoutMs = Math.floor(remainingMs());
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
      throw new Error('SDK test-input preparation budget is spent.');
    const command = [
      process.execPath,
      '--no-env-file',
      '--no-install',
      '--config=' + path.join(snapshotRoot, 'bunfig.toml'),
      childScript,
      '--captured-test-inputs',
    ];
    producerClosureObserved = false;
    const child = await executeMutationCommand(command, root, timeoutMs, {
      ownedProcessGroup: true,
      outputByteLimit: 2 * 1024 * 1024,
      stdoutFile: path.join(evidenceRoot, 'stdout.log'),
      stderrFile: path.join(evidenceRoot, 'stderr.log'),
    });
    producerClosureObserved =
      child.processCustody === null
        ? child.spawnError !== null
        : child.processCustody.terminationObserved && child.processCustody.processGroupTerminationObserved === true;
    writeFileSync(
      path.join(evidenceRoot, 'execution.json'),
      JSON.stringify(
        {
          schema: 'VidaSdkTestInputBuild/v1',
          snapshot: snapshotRoot,
          command,
          cwd: root,
          timeout_ms: timeoutMs,
          result: child,
        },
        null,
        2,
      ) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
    const capture = child.output_capture;
    const terminal =
      child.exitCode === 0 &&
      child.signal === null &&
      child.spawnError === null &&
      !child.timedOut &&
      child.processCustody?.terminationObserved === true &&
      child.processCustody.processGroupTerminationObserved === true &&
      capture?.complete === true;
    if (!terminal) {
      throw new Error(
        'SDK test-input build did not reach a confirmed successful process-group exit: ' +
          JSON.stringify({
            exitCode: child.exitCode,
            signal: child.signal,
            spawnError: child.spawnError,
            timedOut: child.timedOut,
            processCustody: child.processCustody,
            output_capture: capture?.complete ?? false,
          }),
      );
    }
    const resultBytes = await readFile(path.join(snapshotRoot, 'sdk-test-input-build-result.json'));
    writeFileSync(path.join(evidenceRoot, 'formation-result.json'), resultBytes, { flag: 'wx', mode: 0o600 });
    const resultValue: unknown = JSON.parse(resultBytes.toString('utf8'));
    if (!isRecord(resultValue) || resultValue.schema !== 'CandidatePackageBuild/v1')
      throw new Error('SDK test-input child result is invalid.');
    for (const [file, bytes] of inputs) {
      if (!bytes.equals(await readFile(path.join(snapshotRoot, ...file.split('/')))))
        throw new Error('SDK captured formation input changed: ' + file);
    }
    const outputPaths = (await filesUnder(path.join(snapshotRoot, 'dist'))).map((file) =>
      path.relative(snapshotRoot, file).replaceAll('\\', '/'),
    );
    const outputBytes = await readQualityInputs(snapshotRoot, outputPaths);
    const identities = (entries: Map<string, Buffer>) =>
      [...entries]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) }));
    const receipt = {
      ...resultValue,
      schema: 'CandidateSdkTestInputs/v1',
      purpose: 'development-tests',
      bun_version: Bun.version,
      inputs: identities(new Map([...inputs].map(([file, bytes]) => [file, Buffer.from(bytes)]))),
      outputs: identities(outputBytes),
      virtual_runtime_entry: { path: 'src/runtime.ts', sha256: sha256(runtimeEntryBytes) },
      dependency_custody:
        'External node_modules is linked; selected manifest and frozen lock are captured, dependency bytes are outside snapshot custody.',
    };
    const candidate = new Map(outputBytes);
    candidate.set('dist/sdk-formation.json', Buffer.from(JSON.stringify(receipt) + '\n'));
    captureSelectedSdkTestInputsFromCapturedBytes(root, inputs, candidate);
    completeOwnedCleanup([() => removeOwnedDirectoryOrThrow(snapshotRoot, snapshotIdentity)]);
    snapshotRemoved = true;
    return candidate;
  } catch (error) {
    console.error(
      'Retained failed SDK test-input formation: ' + (snapshotRemoved ? path.join(root, 'dist') : snapshotRoot),
    );
    if (!producerClosureObserved)
      throw Object.assign(new Error('SDK test-input producer closure is unobserved.', { cause: error }), {
        producerClosureObserved: false,
      });
    throw error;
  }
}

async function formCapturedSdkTestInputsChild(): Promise<void> {
  const snapshotRoot = path.resolve(import.meta.dirname, '..');
  if (path.basename(path.dirname(snapshotRoot)) !== '.tmp' || !path.basename(snapshotRoot).startsWith('sdk-formation-'))
    throw new Error('Captured SDK test-input snapshot path is invalid.');
  const result = await formCapturedPackage(snapshotRoot);
  writeFileSync(path.join(snapshotRoot, 'sdk-test-input-build-result.json'), JSON.stringify(result) + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--captured-test-inputs') await formCapturedSdkTestInputsChild();
  else await buildPackage(path.resolve(import.meta.dirname, '..'), sdkBuildReceiptIdentity(args));
}
