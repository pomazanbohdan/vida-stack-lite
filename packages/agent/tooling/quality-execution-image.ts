import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, mkdir, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  capturedModuleAbsolutePath,
  canonicalCapturedModulePath,
  capturedModuleInputs,
  executionImageQualityInputs,
  qualityFingerprint,
  testSelectionFingerprint,
  readBoundedInput,
  readQualityInputs,
  sdkFormationInputDigestsFromQualityCapture,
  restoreSdkFormationInputsFromQualityCapture,
} from './bun-coverage-evidence.ts';
import type { CoverageInputs, FocusedDiagnosticSelection, InputDigest } from './bun-coverage-evidence.ts';
import { expectedJavascriptFiles } from './maintained-source-inventory.ts';
import { classifyMaintainedSourcePath, MAINTAINED_SOURCE_ROOTS } from './ts-only-source-gate.ts';

export type QualityExecutionImage = {
  schema: 'VidaQualityExecutionImage/v1';
  repository: string;
  packageRoot: string;
  source_repository: string;
  source_commit: string;
  source_tree: string;
  input_fingerprint: string;
  manifest_file: string;
  manifest_sha256: string;
  dependency_root: string;
};

type ImageFile = {
  path: string;
  sha256: string;
  git_blob: string | null;
  mode: '100644' | '100755';
  origin: 'git' | 'sdk-receipt';
};
type ImageManifest = {
  schema: 'VidaQualityExecutionImageManifest/v1';
  image: QualityExecutionImage;
  dependency: { root: string; identity: string; lock_sha256: string; bun_pin: string };
  files: ImageFile[];
  sdk_formation_inputs: InputDigest[] | null;
  capture: Pick<
    CoverageInputs,
    | 'sources'
    | 'source_fingerprint'
    | 'tests'
    | 'test_selection'
    | 'test_inputs'
    | 'test_fingerprint'
    | 'tool_inputs'
    | 'tool_fingerprint'
    | 'module_inputs'
  >;
};

const sha256 = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/u;
const sdkReceiptPath = 'dist/sdk-formation.json';
const sdkOutputs = new Set(expectedJavascriptFiles.map((file) => `dist/src/${file}`));
const sdkAllowed = new Set([sdkReceiptPath, ...sdkOutputs]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inputDigestRows(value: unknown, label: string): InputDigest[] {
  assert(Array.isArray(value), `Quality image ${label} inventory is invalid.`);
  const seen = new Set<string>();
  const rows: unknown[] = value;
  return rows.map((row): InputDigest => {
    assert(
      record(row) &&
        Object.keys(row).sort().join(',') === 'path,sha256' &&
        typeof row.path === 'string' &&
        typeof row.sha256 === 'string' &&
        digestPattern.test(row.sha256),
      `Quality image ${label} row is invalid.`,
    );
    safeLogicalPath(row.path);
    assert(!seen.has(row.path), `Quality image ${label} path is duplicated: ${row.path}`);
    seen.add(row.path);
    return { path: row.path, sha256: row.sha256 };
  });
}

async function assertEmptyNodeModules(packageRoot: string): Promise<void> {
  const mountpoint = path.join(packageRoot, 'node_modules');
  const stat = await lstat(mountpoint);
  assert(
    stat.isDirectory() && !stat.isSymbolicLink() && (await readdir(mountpoint)).length === 0,
    'Quality image node_modules mountpoint must be an empty directory.',
  );
}

async function assertDependencyMount(packageRoot: string, manifest: ImageManifest): Promise<void> {
  const mounted = await lstat(path.join(packageRoot, 'node_modules'));
  assert(
    mounted.isDirectory() &&
      !mounted.isSymbolicLink() &&
      `${mounted.dev}:${mounted.ino}` === manifest.dependency.identity,
    'Quality image dependency mount does not match its captured directory identity.',
  );
}

async function verifyExternalDependency(manifest: ImageManifest): Promise<void> {
  const dependencyRoot = await realpath(manifest.dependency.root);
  const stat = await lstat(dependencyRoot);
  assert(
    dependencyRoot === manifest.image.dependency_root &&
      stat.isDirectory() &&
      `${stat.dev}:${stat.ino}` === manifest.dependency.identity,
    'Quality image dependency directory identity changed.',
  );
}

function safeLogicalPath(value: string): void {
  assert(
    value.length > 0 &&
      !value.includes('\\') &&
      !value.includes('\0') &&
      !path.posix.isAbsolute(value) &&
      path.win32.parse(value).root === '' &&
      !value.split('/').some((part) => part === '' || part === '.' || part === '..'),
    `Quality image path is invalid: ${value}`,
  );
}

function git(root: string, args: string[]): string {
  const child = spawnSync('git', ['-C', root, ...args], {
    encoding: 'buffer',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 5000,
  });
  if (child.error || child.status !== 0)
    throw new Error(
      `Native Git query failed (${args[0]}): ${child.error?.message ?? child.stderr.toString('utf8').trim()}`,
    );
  return child.stdout.toString('utf8');
}

function parseTree(output: string): Map<string, { oid: string; mode: string; type: string }> {
  const entries = new Map<string, { oid: string; mode: string; type: string }>();
  for (const row of output.split('\0')) {
    if (!row) continue;
    const tab = row.indexOf('\t');
    assert(tab > 0, 'Native Git tree row is malformed.');
    const [mode, type, oidValue] = row.slice(0, tab).split(' ');
    const oid = oidValue ?? '';
    const file = row.slice(tab + 1);
    safeLogicalPath(file);
    assert(
      typeof mode === 'string' && typeof type === 'string' && /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(oid),
      `Malformed tracked tree entry: ${file}`,
    );
    entries.set(file, { oid, mode, type });
  }
  return entries;
}

function gitBlobId(bytes: Uint8Array, length: number): string {
  const algorithm = length === 64 ? 'sha256' : 'sha1';
  return createHash(algorithm).update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
}

function gitPathForCapturedInput(packageRoot: string, repository: string, logical: string): string {
  const absolute = capturedModuleAbsolutePath(packageRoot, logical);
  const relative = path.relative(repository, absolute).split(path.sep).join('/');
  safeLogicalPath(relative);
  assert(!relative.startsWith('../'), `Captured input escapes the source repository: ${logical}`);
  return relative;
}

async function pathExists(file: string): Promise<boolean> {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if (record(error) && error.code === 'ENOENT') return false;
    throw error;
  }
}

function dependencyPin(inputs: CoverageInputs): { lockSha: string; bunPin: string } {
  const lock = inputs.input_bytes['bun.lock'];
  const pin = inputs.input_bytes['.bun-version'];
  assert(lock && pin, 'Captured dependency lock or Bun pin is missing.');
  const bunPin = pin.toString('utf8').trim();
  assert(bunPin.length > 0 && bunPin.length <= 128 && !/[\r\n]/u.test(bunPin), 'Captured Bun pin is invalid.');
  return { lockSha: sha256(lock), bunPin };
}

function isSdkGenerated(pathname: string): boolean {
  return pathname.startsWith('dist/') && sdkAllowed.has(pathname);
}

function expectedSdkRows(rows: unknown): asserts rows is InputDigest[] | null {
  if (rows === null) return;
  assert(Array.isArray(rows), 'Captured SDK formation rows are malformed.');
  const selected: unknown[] = rows;
  for (const row of selected)
    assert(
      record(row) &&
        Object.keys(row).sort().join(',') === 'path,sha256' &&
        typeof row.path === 'string' &&
        typeof row.sha256 === 'string' &&
        digestPattern.test(row.sha256),
      'Captured SDK formation digest is malformed.',
    );
}

function imagePath(value: unknown, field: string): string {
  assert(typeof value === 'string' && path.isAbsolute(value), `Quality image ${field} must be absolute.`);
  return value;
}

function imageIdentity(value: unknown, field: string, pattern: RegExp): string {
  assert(typeof value === 'string' && pattern.test(value), `Quality image ${field} is invalid.`);
  return value;
}

function parseImage(value: unknown): QualityExecutionImage {
  assert(
    record(value) &&
      Object.keys(value).sort().join(',') ===
        'dependency_root,input_fingerprint,manifest_file,manifest_sha256,packageRoot,repository,schema,source_commit,source_repository,source_tree',
    'Quality image descriptor fields are invalid.',
  );
  assert(value.schema === 'VidaQualityExecutionImage/v1', 'Quality image descriptor is malformed.');
  return {
    schema: 'VidaQualityExecutionImage/v1',
    repository: imagePath(value.repository, 'repository'),
    packageRoot: imagePath(value.packageRoot, 'packageRoot'),
    source_repository: imagePath(value.source_repository, 'source_repository'),
    source_commit: imageIdentity(value.source_commit, 'source_commit', /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u),
    source_tree: imageIdentity(value.source_tree, 'source_tree', /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u),
    input_fingerprint: imageIdentity(value.input_fingerprint, 'input_fingerprint', digestPattern),
    manifest_file: imagePath(value.manifest_file, 'manifest_file'),
    manifest_sha256: imageIdentity(value.manifest_sha256, 'manifest_sha256', /^(?:[a-f0-9]{64})?$/u),
    dependency_root: imagePath(value.dependency_root, 'dependency_root'),
  };
}

function parseImageFile(value: unknown): ImageFile {
  assert(
    record(value) && Object.keys(value).sort().join(',') === 'git_blob,mode,origin,path,sha256',
    'Quality image file row is malformed.',
  );
  assert(
    typeof value.path === 'string' && (value.mode === '100644' || value.mode === '100755'),
    'Quality image file path or mode is invalid.',
  );
  assert(value.origin === 'git' || value.origin === 'sdk-receipt', 'Quality image file origin is invalid.');
  const gitBlob =
    value.git_blob === null ? null : imageIdentity(value.git_blob, 'git_blob', /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u);
  assert((value.origin === 'git') === (gitBlob !== null), 'Quality image origin and Git blob differ.');
  if (value.origin === 'sdk-receipt') assert(isSdkGenerated(value.path), 'Quality image SDK output is not allowed.');
  return {
    path: value.path,
    sha256: imageIdentity(value.sha256, 'file digest', digestPattern),
    git_blob: gitBlob,
    mode: value.mode,
    origin: value.origin,
  };
}

function parseImageFiles(value: unknown): ImageFile[] {
  assert(Array.isArray(value), 'Quality image file inventory is invalid.');
  const seen = new Set<string>();
  const files: ImageFile[] = [];
  const rows: unknown[] = value;
  for (const value of rows) {
    const row = parseImageFile(value);
    safeLogicalPath(row.path);
    assert(!seen.has(row.path), `Quality image file is duplicated: ${row.path}`);
    seen.add(row.path);
    files.push({ path: row.path, sha256: row.sha256, git_blob: row.git_blob, mode: row.mode, origin: row.origin });
  }
  return files;
}

function parseDependency(value: unknown): ImageManifest['dependency'] {
  assert(
    record(value) &&
      Object.keys(value).sort().join(',') === 'bun_pin,identity,lock_sha256,root' &&
      typeof value.root === 'string' &&
      typeof value.identity === 'string' &&
      typeof value.bun_pin === 'string' &&
      typeof value.lock_sha256 === 'string' &&
      digestPattern.test(value.lock_sha256),
    'Quality image dependency binding is malformed.',
  );
  assert(
    path.isAbsolute(value.root) && value.bun_pin.length > 0 && value.bun_pin.length <= 128 && value.identity.length > 0,
    'Quality image dependency metadata is invalid.',
  );
  return { root: value.root, identity: value.identity, lock_sha256: value.lock_sha256, bun_pin: value.bun_pin };
}

function stringRows(value: unknown, label: string): string[] {
  assert(Array.isArray(value), `Quality image ${label} is invalid.`);
  const rows: unknown[] = value;
  return rows.map((item) => {
    assert(typeof item === 'string', `Quality image ${label} is invalid.`);
    return item;
  });
}

function parseCapture(value: unknown): ImageManifest['capture'] {
  assert(
    record(value) &&
      Object.keys(value).sort().join(',') ===
        'module_inputs,source_fingerprint,sources,test_fingerprint,test_inputs,test_selection,tests,tool_fingerprint,tool_inputs' &&
      record(value.test_selection),
    'Quality image capture metadata is malformed.',
  );
  const sourceFingerprint = value.source_fingerprint;
  const testFingerprint = value.test_fingerprint;
  const toolFingerprint = value.tool_fingerprint;
  assert(
    typeof sourceFingerprint === 'string' && digestPattern.test(sourceFingerprint),
    'Quality image source fingerprint is invalid.',
  );
  assert(
    typeof testFingerprint === 'string' && digestPattern.test(testFingerprint),
    'Quality image test fingerprint is invalid.',
  );
  assert(
    typeof toolFingerprint === 'string' && digestPattern.test(toolFingerprint),
    'Quality image tool fingerprint is invalid.',
  );
  const sources = inputDigestRows(value.sources, 'sources');
  const testInputs = inputDigestRows(value.test_inputs, 'test inputs');
  const toolInputs = inputDigestRows(value.tool_inputs, 'tool inputs');
  const modules = inputDigestRows(value.module_inputs, 'module inputs');
  const tests = stringRows(value.tests, 'selected tests');
  const selection = value.test_selection;
  assert(
    selection.mode === 'focused-diagnostic' && typeof selection.contour === 'string' && selection.contour.length > 0,
    'Quality image focused selection is invalid.',
  );
  const selectedSources = stringRows(selection.sources, 'focused sources');
  const selectedTests = stringRows(selection.tests, 'focused tests');
  assert(selectedSources.length > 0 && selectedTests.length > 0, 'Quality image focused selection is empty.');
  const capture: ImageManifest['capture'] = {
    sources,
    source_fingerprint: sourceFingerprint,
    tests,
    test_selection: {
      mode: 'focused-diagnostic',
      contour: selection.contour,
      sources: selectedSources,
      tests: selectedTests,
    },
    test_inputs: testInputs,
    test_fingerprint: testFingerprint,
    tool_inputs: toolInputs,
    tool_fingerprint: toolFingerprint,
    module_inputs: modules,
  };
  assertCaptureFingerprints(capture);
  return capture;
}

function assertCaptureFingerprints(capture: ImageManifest['capture']): void {
  assert(
    sha256(JSON.stringify(capture.sources)) === capture.source_fingerprint,
    'Quality image source fingerprint differs from its inventory.',
  );
  assert(
    sha256(JSON.stringify(capture.tool_inputs)) === capture.tool_fingerprint,
    'Quality image tool fingerprint differs from its inventory.',
  );
  assert(
    testSelectionFingerprint(capture.test_selection, capture.test_inputs) === capture.test_fingerprint,
    'Quality image test fingerprint differs from its selection.',
  );
  assert(
    isDeepStrictEqual(capture.tests, capture.test_selection.tests),
    'Quality image selected test inventories differ.',
  );
  assert(capture.test_selection.mode === 'focused-diagnostic', 'Quality image must remain focused.');
  const sourcePaths = capture.sources.map((row) => row.path).sort();
  assert(
    isDeepStrictEqual(sourcePaths, [...capture.test_selection.sources].sort()),
    'Quality image focused source inventory differs.',
  );
}

function validateManifestInventory(
  files: ImageFile[],
  dependency: ImageManifest['dependency'],
  image: QualityExecutionImage,
  capture: ImageManifest['capture'],
  sdkRows: InputDigest[] | null,
): void {
  const filesByPath = new Map(files.map((row) => [row.path, row.sha256]));
  const capturedPaths = new Set<string>();
  for (const rows of [capture.sources, capture.test_inputs, capture.tool_inputs, capture.module_inputs]) {
    for (const row of rows) {
      assert(
        filesByPath.get(row.path) === row.sha256,
        `Quality image capture digest has no matching file row: ${row.path}`,
      );
      capturedPaths.add(row.path);
    }
  }
  assert(
    capturedPaths.size === files.length && [...filesByPath.keys()].every((file) => capturedPaths.has(file)),
    'Quality image manifest and capture inventories differ.',
  );
  assert(
    JSON.stringify(
      capturedModuleInputs({
        sources: capture.sources,
        test_inputs: capture.test_inputs,
        tool_inputs: capture.tool_inputs,
      }),
    ) === JSON.stringify(capture.module_inputs),
    'Quality image module inventory differs from its captured input union.',
  );
  if (sdkRows !== null)
    for (const row of sdkRows)
      assert(
        filesByPath.get(row.path) === row.sha256,
        `SDK formation capture digest has no matching image file: ${row.path}`,
      );
  assert(
    filesByPath.get('bun.lock') === dependency.lock_sha256 && dependency.root === image.dependency_root,
    'Quality image dependency lock binding differs from captured inputs.',
  );
  assert(
    path.resolve(image.packageRoot) === path.resolve(image.repository, 'packages/agent') &&
      path.resolve(image.source_repository) !== path.resolve(image.repository),
    'Quality image repository layout is invalid.',
  );
}

function decodeManifest(bytes: Buffer): ImageManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(bytes.toString('utf8')) as unknown;
  } catch {
    throw new Error('Quality image manifest is not valid JSON.');
  }
  assert(
    record(raw) &&
      Object.keys(raw).sort().join(',') === 'capture,dependency,files,image,schema,sdk_formation_inputs' &&
      raw.schema === 'VidaQualityExecutionImageManifest/v1',
    'Quality image manifest envelope is invalid.',
  );
  expectedSdkRows(raw.sdk_formation_inputs);
  const image = parseImage(raw.image);
  const dependency = parseDependency(raw.dependency);
  const files = parseImageFiles(raw.files);
  const capture = parseCapture(raw.capture);
  validateManifestInventory(files, dependency, image, capture, raw.sdk_formation_inputs);
  return {
    schema: 'VidaQualityExecutionImageManifest/v1',
    image,
    dependency,
    files,
    capture,
    sdk_formation_inputs: raw.sdk_formation_inputs,
  };
}

async function validateImageManifest(file: string, expectedSha?: string): Promise<ImageManifest> {
  const bytes = readBoundedInput(file, path.dirname(file), 'Quality image manifest', false);
  assert(bytes !== null, 'Quality image manifest is missing.');
  if (expectedSha !== undefined)
    assert(sha256(bytes) === expectedSha, 'Quality image manifest digest differs from its caller-held value.');
  const manifest = decodeManifest(bytes);
  manifest.image.manifest_sha256 = sha256(bytes);
  assert(
    path.resolve(manifest.image.manifest_file) === path.resolve(file),
    'Quality image manifest location differs from its descriptor.',
  );
  assert(
    path.resolve(manifest.image.repository) === path.resolve(path.dirname(file)),
    'Quality image repository differs from its manifest directory.',
  );
  assert(path.basename(file) === '.quality-image.json', 'Quality image manifest has an unexpected filename.');
  return manifest;
}

async function verifyMaterialized(
  manifest: ImageManifest,
  packageRoot = manifest.image.packageRoot,
  dependencyMount: 'empty' | 'mounted' = 'empty',
): Promise<Map<string, Buffer>> {
  for (const directory of [
    packageRoot,
    path.join(packageRoot, 'coverage'),
    path.join(packageRoot, '.tmp'),
    path.join(packageRoot, 'node_modules'),
  ]) {
    const stat = await lstat(directory);
    assert(stat.isDirectory() && !stat.isSymbolicLink(), `Quality image directory is missing or unsafe: ${directory}`);
  }
  if (dependencyMount === 'empty') await assertEmptyNodeModules(packageRoot);
  else await assertDependencyMount(packageRoot, manifest);
  const inputs = await readQualityInputs(
    packageRoot,
    manifest.files.map((row) => row.path),
  );
  for (const row of manifest.files) {
    const bytes = inputs.get(row.path);
    assert(bytes && sha256(bytes) === row.sha256, `Quality image bytes changed: ${row.path}`);
    const absolute = capturedModuleAbsolutePath(packageRoot, row.path);
    const stat = await lstat(absolute);
    assert(
      stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o111 ? '100755' : '100644') === row.mode,
      `Quality image file mode changed: ${row.path}`,
    );
    if (row.git_blob !== null)
      assert(
        gitBlobId(bytes, row.git_blob.length) === row.git_blob,
        `Quality image Git blob binding changed: ${row.path}`,
      );
  }
  return inputs;
}

/** Only the existing projection owner may dirty these uncaptured derived outputs. */
export function qualitySourceStatusAdmitted(status: string): boolean {
  return status
    .split(/\r?\n/u)
    .filter(Boolean)
    .every((row) => /^(?: M|M) \.agent\/work\/core-runtime-reactivation\/CONTOUR-STATUS\.(?:json|md)$/u.test(row));
}

function publishedGitTree(repository: string): {
  commit: string;
  tree: string;
  entries: Map<string, { oid: string; mode: string; type: string }>;
} {
  assert(
    qualitySourceStatusAdmitted(git(repository, ['status', '--porcelain=v1', '--untracked-files=all'])),
    'Quality images require a clean published Git source.',
  );
  const commit = git(repository, ['rev-parse', 'HEAD']).trim();
  const tree = git(repository, ['rev-parse', 'HEAD^{tree}']).trim();
  assert(
    /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(commit) && /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(tree),
    'Native Git returned an invalid source identity.',
  );
  return { commit, tree, entries: parseTree(git(repository, ['ls-tree', '-rz', '--full-tree', commit])) };
}

async function captureImageFiles(
  sourcePackage: string,
  sourceRepository: string,
  inputs: CoverageInputs,
  sdkRows: InputDigest[] | null,
  tree: ReadonlyMap<string, { oid: string; mode: string; type: string }>,
): Promise<{ files: ImageFile[]; bytes: Map<string, Buffer> }> {
  const paths = [
    ...new Set(
      [...inputs.sources, ...inputs.test_inputs, ...inputs.tool_inputs, ...inputs.module_inputs].map((row) => row.path),
    ),
  ].sort();
  assert(
    !paths.some(
      (file) =>
        file === 'node_modules' ||
        file.startsWith('node_modules/') ||
        file === 'coverage' ||
        file.startsWith('coverage/') ||
        file === '.tmp' ||
        file.startsWith('.tmp/'),
    ),
    'Quality image capture includes a mutable execution namespace.',
  );
  const files: ImageFile[] = [];
  const bytesByPath = new Map<string, Buffer>();
  for (const logical of paths) {
    safeLogicalPath(logical);
    const bytes = inputs.input_bytes[logical];
    assert(Buffer.isBuffer(bytes), `Quality image capture has no bytes for ${logical}`);
    const tracked = tree.get(gitPathForCapturedInput(sourcePackage, sourceRepository, logical));
    if (tracked === undefined) {
      assert(sdkRows !== null && isSdkGenerated(logical), `Captured input is not a published Git blob: ${logical}`);
      files.push({ path: logical, sha256: sha256(bytes), git_blob: null, mode: '100644', origin: 'sdk-receipt' });
    } else {
      assert(
        tracked.type === 'blob' && (tracked.mode === '100644' || tracked.mode === '100755'),
        `Captured tracked input is not a regular Git blob: ${logical}`,
      );
      assert(
        gitBlobId(bytes, tracked.oid.length) === tracked.oid,
        `Captured bytes differ from the published Git blob: ${logical}`,
      );
      files.push({
        path: logical,
        sha256: sha256(bytes),
        git_blob: tracked.oid,
        mode: tracked.mode === '100755' ? '100755' : '100644',
        origin: 'git',
      });
    }
    bytesByPath.set(logical, bytes);
  }
  return { files, bytes: bytesByPath };
}

async function materializeImage(
  imageRepository: string,
  imagePackage: string,
  image: QualityExecutionImage,
  payload: ImageManifest,
  bytes: ReadonlyMap<string, Buffer>,
  inputs: CoverageInputs,
): Promise<void> {
  await mkdir(imagePackage, { recursive: true });
  for (const row of payload.files) {
    const target = capturedModuleAbsolutePath(imagePackage, row.path);
    const relativeTarget = path.relative(imageRepository, target);
    assert(
      !relativeTarget.startsWith(`..${path.sep}`) && relativeTarget !== '..',
      `Quality image target escapes repository: ${row.path}`,
    );
    await mkdir(path.dirname(target), { recursive: true });
    const contents = bytes.get(row.path);
    assert(contents !== undefined, `Quality image captured bytes disappeared: ${row.path}`);
    await writeFile(target, contents, { flag: 'wx', mode: row.mode === '100755' ? 0o755 : 0o644 });
  }
  await mkdir(path.join(imagePackage, 'node_modules'), { recursive: true });
  await mkdir(path.join(imagePackage, 'coverage'), { recursive: true });
  await mkdir(path.join(imagePackage, '.tmp'), { recursive: true });
  for (const root of MAINTAINED_SOURCE_ROOTS) await mkdir(path.join(imageRepository, root), { recursive: true });
  if (payload.sdk_formation_inputs !== null)
    await restoreSdkFormationInputsFromQualityCapture(imagePackage, inputs, payload.sdk_formation_inputs);
  await verifyMaterialized(payload);
  const manifestBytes = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
  image.manifest_sha256 = sha256(manifestBytes);
  await writeFile(image.manifest_file, manifestBytes, { flag: 'wx', mode: 0o444 });
}

async function reuseExistingImage(
  imageRepository: string,
  imagePackage: string,
  manifestFile: string,
  imageDirectory: string,
  expected: ImageManifest,
): Promise<QualityExecutionImage | null> {
  if (!(await pathExists(imageRepository))) {
    assert(
      !(await pathExists(imageDirectory)),
      'Existing quality image directory is partial and cannot be rebuilt in place.',
    );
    return null;
  }
  assert(await pathExists(manifestFile), 'Existing quality image is partial and cannot be rebuilt in place.');
  const existing = await validateImageManifest(manifestFile);
  assert(
    isDeepStrictEqual(existing, {
      ...expected,
      image: { ...expected.image, manifest_sha256: existing.image.manifest_sha256 },
    }),
    'Existing quality image identity differs from the requested capture.',
  );
  await verifyMaterialized(existing);
  await verifyExternalDependency(existing);
  assert(
    path.resolve(existing.image.packageRoot) === path.resolve(imagePackage),
    'Existing quality image package root changed.',
  );
  return existing.image;
}

export async function prepareQualityExecutionImage(args: {
  sourcePackageRoot: string;
  storeRoot: string;
  selection: FocusedDiagnosticSelection;
  additionalToolInputs: readonly string[];
  prepareSdkInputs?: (input: {
    root: string;
    tests: readonly string[];
    selectedInputs: ReadonlyMap<string, Buffer>;
  }) => Promise<void>;
}): Promise<QualityExecutionImage> {
  assert(
    path.isAbsolute(args.sourcePackageRoot) && path.isAbsolute(args.storeRoot),
    'Quality image roots must be absolute.',
  );
  const sourcePackage = await realpath(args.sourcePackageRoot);
  const sourceRepository = await realpath(path.resolve(sourcePackage, '../..'));
  const storePath = path.resolve(args.storeRoot);
  assert(
    !storePath.startsWith(`${sourceRepository}${path.sep}`) && storePath !== sourceRepository,
    'Quality image store must be outside the source repository.',
  );
  await mkdir(storePath, { recursive: true });
  const storeRoot = await realpath(storePath);
  assert(
    !storeRoot.startsWith(`${sourceRepository}${path.sep}`) && storeRoot !== sourceRepository,
    'Quality image store resolves inside the source repository.',
  );
  assert(
    sourcePackage === path.join(sourceRepository, 'packages', 'agent'),
    'Quality image source package root is not the repository agent package.',
  );
  const source = publishedGitTree(sourceRepository);
  const semanticInputs = [...source.entries.keys()]
    .filter((file) => classifyMaintainedSourcePath(file) === 'typescript')
    .map((file) => {
      const logical = canonicalCapturedModulePath(sourcePackage, path.join(sourceRepository, file));
      assert(logical !== null, `Compiler input has no admitted captured path: ${file}`);
      return logical;
    });
  if (source.entries.has('package.json')) semanticInputs.push('_repository/compiler/package.json');
  const inputs = await executionImageQualityInputs(
    sourcePackage,
    args.additionalToolInputs,
    args.selection,
    semanticInputs,
    args.prepareSdkInputs,
  );
  const inputFingerprint = qualityFingerprint(inputs);
  const { lockSha, bunPin } = dependencyPin(inputs);
  assert(
    inputs.input_bytes['bun.lock'] && inputs.input_bytes['.bun-version'],
    'Captured dependency bindings are absent.',
  );
  const sdkRows = sdkFormationInputDigestsFromQualityCapture(inputs);
  expectedSdkRows(sdkRows);
  if (sdkRows !== null) await restoreSdkFormationInputsFromQualityCapture(sourcePackage, inputs, sdkRows);
  const captured = await captureImageFiles(sourcePackage, sourceRepository, inputs, sdkRows, source.entries);
  const dependencyRoot = await realpath(path.join(sourcePackage, 'node_modules'));
  const dependencyStat = await lstat(dependencyRoot);
  assert(dependencyStat.isDirectory(), 'Captured dependency root is not a directory.');
  const dependencyIdentity = `${dependencyStat.dev}:${dependencyStat.ino}`;
  const id = sha256(`${source.commit}\n${inputFingerprint}\n${bunPin}`).slice(0, 40);
  const imageRepository = path.join(storeRoot, id, 'repository');
  const imageDirectory = path.dirname(imageRepository);
  const imagePackage = path.join(imageRepository, 'packages', 'agent');
  const manifestFile = path.join(imageRepository, '.quality-image.json');
  const imageWithoutManifest: Omit<QualityExecutionImage, 'manifest_file' | 'manifest_sha256'> = {
    schema: 'VidaQualityExecutionImage/v1',
    repository: imageRepository,
    packageRoot: imagePackage,
    source_repository: sourceRepository,
    source_commit: source.commit,
    source_tree: source.tree,
    input_fingerprint: inputFingerprint,
    dependency_root: dependencyRoot,
  };
  const image: QualityExecutionImage = { ...imageWithoutManifest, manifest_file: manifestFile, manifest_sha256: '' };
  const payload: ImageManifest = {
    schema: 'VidaQualityExecutionImageManifest/v1',
    image,
    dependency: { root: dependencyRoot, identity: dependencyIdentity, lock_sha256: lockSha, bun_pin: bunPin },
    files: captured.files,
    sdk_formation_inputs: sdkRows,
    capture: {
      sources: inputs.sources,
      source_fingerprint: inputs.source_fingerprint,
      tests: inputs.tests,
      test_selection: inputs.test_selection,
      test_inputs: inputs.test_inputs,
      test_fingerprint: inputs.test_fingerprint,
      tool_inputs: inputs.tool_inputs,
      tool_fingerprint: inputs.tool_fingerprint,
      module_inputs: inputs.module_inputs,
    },
  };
  const reused = await reuseExistingImage(imageRepository, imagePackage, manifestFile, imageDirectory, payload);
  if (reused !== null) return reused;
  await materializeImage(imageRepository, imagePackage, image, payload, captured.bytes, inputs);
  await verifyQualityExecutionImage(image);
  return image;
}

export async function loadQualityExecutionImageInputs(packageRoot: string): Promise<CoverageInputs | null> {
  const manifest = process.env.VIDA_QUALITY_IMAGE_MANIFEST;
  const expectedSha = process.env.VIDA_QUALITY_IMAGE_SHA256;
  if (manifest === undefined && expectedSha === undefined) return null;
  assert(
    typeof manifest === 'string' &&
      manifest.length > 0 &&
      typeof expectedSha === 'string' &&
      digestPattern.test(expectedSha),
    'Both quality image manifest environment values are required.',
  );
  assert(path.isAbsolute(packageRoot), 'Quality image package path must be absolute.');
  const decoded = await validateImageManifest(manifest, expectedSha);
  assert(
    path.resolve(decoded.image.packageRoot) === path.resolve(packageRoot),
    'Loaded package root differs from the quality image descriptor.',
  );
  const bytes = await verifyMaterialized(decoded, packageRoot, 'mounted');
  return await inputsFromImage(packageRoot, decoded, bytes);
}

async function inputsFromImage(
  packageRoot: string,
  manifest: ImageManifest,
  bytes: ReadonlyMap<string, Buffer>,
): Promise<CoverageInputs> {
  const inputs: CoverageInputs = { ...manifest.capture, input_bytes: Object.fromEntries(bytes) };
  assert(
    qualityFingerprint(inputs) === manifest.image.input_fingerprint,
    'Loaded quality image input fingerprint differs from its descriptor.',
  );
  assert(
    (bytes.get('.bun-version')?.toString('utf8').trim() ?? '') === manifest.dependency.bun_pin,
    'Loaded quality image Bun pin differs from its dependency binding.',
  );
  if (manifest.sdk_formation_inputs !== null)
    await restoreSdkFormationInputsFromQualityCapture(packageRoot, inputs, manifest.sdk_formation_inputs);
  return inputs;
}

export async function readQualityExecutionImageDescriptor(
  file: string,
  expectedSha: string,
): Promise<QualityExecutionImage> {
  assert(
    path.isAbsolute(file) && digestPattern.test(expectedSha),
    'Quality image descriptor path or digest is invalid.',
  );
  const manifest = await validateImageManifest(file, expectedSha);
  return manifest.image;
}

export async function readQualityExecutionImageInputs(image: QualityExecutionImage): Promise<CoverageInputs> {
  assert(
    path.isAbsolute(image.manifest_file) && digestPattern.test(image.manifest_sha256),
    'Quality image descriptor is invalid.',
  );
  const manifest = await validateImageManifest(image.manifest_file, image.manifest_sha256);
  assert(
    isDeepStrictEqual(manifest.image, image),
    'Quality image manifest descriptor differs from caller-held descriptor.',
  );
  const bytes = await verifyMaterialized(manifest, manifest.image.packageRoot, 'empty');
  await verifyExternalDependency(manifest);
  return inputsFromImage(manifest.image.packageRoot, manifest, bytes);
}

export async function verifyQualityExecutionImage(image: QualityExecutionImage): Promise<void> {
  assert(
    record(image) &&
      image.schema === 'VidaQualityExecutionImage/v1' &&
      path.isAbsolute(image.repository) &&
      path.isAbsolute(image.packageRoot) &&
      path.isAbsolute(image.manifest_file) &&
      path.isAbsolute(image.dependency_root) &&
      digestPattern.test(image.manifest_sha256),
    'Quality image descriptor is invalid.',
  );
  const manifest = await validateImageManifest(image.manifest_file, image.manifest_sha256);
  assert(
    isDeepStrictEqual(manifest.image, image),
    'Quality image manifest descriptor differs from caller-held descriptor.',
  );
  await verifyMaterialized(manifest);
  await verifyExternalDependency(manifest);
}
