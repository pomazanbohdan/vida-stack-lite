import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { requireCampaignStorage } from './contour-campaign.ts';

export type QualityRuntimeRoot = {
  root: string;
  manifest_file: string;
  manifest_sha256: string;
  files: Array<{ source: string; target: string }>;
  dependency_root: string;
};

export function qualityRuntimeEnvironment(inherited: NodeJS.ProcessEnv, owned: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const selected: NodeJS.ProcessEnv = {};
  for (const key of ['PATH', 'PWD', 'LANG', 'LC_ALL', 'TZ', 'CI']) {
    if (inherited[key] !== undefined) selected[key] = inherited[key];
  }
  return { ...selected, ...owned };
}

type FileInput = { source: string; target: string };
type DataInput = { target: string; contents: string; mode?: number };
type Identity = { dev: string; ino: string; size: string; mtime_ns: string; ctime_ns: string; mode: string };
type Entry = { target: string; sha256: string; bytes: string; mode: string; stat_identity: Identity };
type DependencyBoundary = { root: string; directories: Array<{ path: string; identity: Identity }> };
type Manifest = {
  schema: 'VidaQualityRuntimeRoot/v1';
  root: string;
  root_identity: Identity;
  entries: Entry[];
  dependency: DependencyBoundary;
};
type Input = { files: FileInput[]; data?: DataInput[]; dependency_root: string };

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}
function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
function identity(value: {
  dev: bigint;
  ino: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
  mode: bigint;
}): Identity {
  return {
    dev: String(value.dev),
    ino: String(value.ino),
    size: String(value.size),
    mtime_ns: String(value.mtimeNs),
    ctime_ns: String(value.ctimeNs),
    mode: String(value.mode),
  };
}
function sameIdentity(a: Identity, b: Identity): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtime_ns === b.mtime_ns &&
    a.ctime_ns === b.ctime_ns &&
    a.mode === b.mode
  );
}
function logicalTarget(value: string): string {
  assert(
    value.startsWith('/') && !value.includes('\\') && !value.includes('\0'),
    'Target must be an absolute logical path.',
  );
  const parts = value.slice(1).split('/');
  assert(
    parts.length > 0 && parts.every((part) => part !== '' && part !== '.' && part !== '..'),
    'Target path has an alias or traversal.',
  );
  assert(path.posix.normalize(value) === value && value !== '/', 'Target path is not canonical.');
  assert(
    !['/proc', '/dev', '/tmp', '/sys'].some((root) => value === root || value.startsWith(`${root}/`)),
    'Runtime file overlaps a private interface.',
  );
  return value;
}
function validateInput(value: unknown): Input {
  assert(
    isRecord(value) &&
      (exactKeys(value, ['files', 'dependency_root']) || exactKeys(value, ['files', 'data', 'dependency_root'])),
    'Input fields are invalid.',
  );
  assert(
    typeof value.dependency_root === 'string' && path.isAbsolute(value.dependency_root),
    'Dependency root is invalid.',
  );
  assert(Array.isArray(value.files), 'files must be an array.');
  const files: FileInput[] = value.files.map((item: unknown) => {
    assert(
      isRecord(item) &&
        exactKeys(item, ['source', 'target']) &&
        typeof item.source === 'string' &&
        path.isAbsolute(item.source) &&
        typeof item.target === 'string',
      'File input is invalid.',
    );
    return { source: item.source, target: logicalTarget(item.target) };
  });
  const rawData: unknown = value.data ?? [];
  assert(Array.isArray(rawData), 'data must be an array.');
  const data: DataInput[] = rawData.map((item: unknown) => {
    assert(
      isRecord(item) &&
        (exactKeys(item, ['target', 'contents']) || exactKeys(item, ['target', 'contents', 'mode'])) &&
        typeof item.target === 'string' &&
        typeof item.contents === 'string' &&
        (item.mode === undefined ||
          (Number.isInteger(item.mode) && typeof item.mode === 'number' && item.mode >= 0 && item.mode <= 0o7777)),
      'Data input is invalid.',
    );
    return {
      target: logicalTarget(item.target),
      contents: item.contents,
      ...(typeof item.mode === 'number' ? { mode: item.mode } : {}),
    };
  });
  const targets = [...files.map((file) => file.target), ...data.map((file) => file.target)].sort();
  for (let i = 1; i < targets.length; i++) {
    assert(targets[i] !== targets[i - 1], 'Destination is duplicated.');
    assert(!targets[i]!.startsWith(`${targets[i - 1]}/`), 'Destinations collide by parent prefix.');
  }
  return { files, data, dependency_root: value.dependency_root };
}

async function captureDependencyBoundary(root: string): Promise<DependencyBoundary> {
  assert((await realpath(root)) === root, 'Dependency root must be canonical.');
  const directories: DependencyBoundary['directories'] = [];
  const visit = async (relative: string): Promise<void> => {
    const directory = path.join(root, relative);
    const before = await lstat(directory, { bigint: true });
    assert(before.isDirectory() && !before.isSymbolicLink(), 'Dependency directory is invalid.');
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) await visit(path.join(relative, entry.name));
      else assert(entry.isFile() || entry.isSymbolicLink(), 'Dependency input contains a socket or special node.');
    }
    const after = await lstat(directory, { bigint: true });
    assert(sameIdentity(identity(before), identity(after)), 'Dependency directory changed during inspection.');
    directories.push({ path: relative, identity: identity(after) });
  };
  await visit('');
  return { root, directories };
}
async function sourceBytes(source: string): Promise<{ bytes: Buffer; source: string; mode: number }> {
  const canonical = await realpath(source);
  const handle = await open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = identity(await handle.stat({ bigint: true }));
    assert((BigInt(before.mode) & 0o170000n) === 0o100000n, 'Source must be a regular file.');
    const bytes = await handle.readFile();
    const after = identity(await handle.stat({ bigint: true }));
    const named = identity(await stat(canonical, { bigint: true }));
    assert(sameIdentity(before, after) && sameIdentity(after, named), 'Source changed while it was read.');
    return { bytes, source: canonical, mode: Number(BigInt(before.mode) & 0o777n) };
  } finally {
    await handle.close();
  }
}
async function ensureParentDirectories(root: string, target: string): Promise<void> {
  let current = root;
  const parents = target.slice(1).split('/').slice(0, -1);
  for (const part of parents) {
    current = path.join(current, part);
    try {
      await mkdir(current, { mode: 0o755 });
    } catch (error) {
      assert(isRecord(error) && error.code === 'EEXIST', 'Could not create runtime destination directory.');
    }
    const node = await lstat(current, { bigint: true });
    assert(node.isDirectory() && !node.isSymbolicLink(), 'Runtime destination parent is not a real directory.');
  }
}
async function writeMaterialized(
  root: string,
  target: string,
  bytes: Uint8Array,
  requestedMode: number,
): Promise<Identity> {
  const destination = path.join(root, target.slice(1));
  await ensureParentDirectories(root, target);
  const handle = await open(destination, 'wx', requestedMode & 0o777 & ~0o6000);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  const node = await lstat(destination, { bigint: true });
  assert(node.isFile() && !node.isSymbolicLink(), 'Created destination is not a regular file.');
  return identity(node);
}

export async function materializeQualityRuntimeRoot(
  inputFile: string,
  outputRoot: string,
): Promise<QualityRuntimeRoot> {
  assert(path.isAbsolute(inputFile) && path.isAbsolute(outputRoot), 'Input and output paths must be absolute.');
  const inputHandle = await open(inputFile, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let inputBytes: Buffer;
  try {
    const node = await inputHandle.stat();
    assert(node.isFile() && node.size <= 1024 * 1024, 'Runtime input must be a bounded regular file.');
    inputBytes = await inputHandle.readFile();
  } finally {
    await inputHandle.close();
  }
  const parsedInput: unknown = JSON.parse(inputBytes.toString('utf8'));
  const input = validateInput(parsedInput);
  const dependency = await captureDependencyBoundary(input.dependency_root);
  const parent = await realpath(path.dirname(outputRoot));
  requireCampaignStorage(parent);
  const root = path.join(parent, path.basename(outputRoot));
  assert(
    root === outputRoot && path.basename(root) !== '.' && path.basename(root) !== '..',
    'Output root must use its canonical parent.',
  );
  const manifestFile = `${root}.manifest.json`;
  for (const candidate of [root, manifestFile]) {
    try {
      await lstat(candidate);
      throw new Error('Output root or manifest already exists.');
    } catch (error) {
      if (!isRecord(error) || error.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(root, { mode: 0o700 });
  const entries: Entry[] = [];
  for (const file of input.files) {
    const captured = await sourceBytes(file.source);
    const outputIdentity = await writeMaterialized(root, file.target, captured.bytes, captured.mode);
    entries.push({
      target: file.target,
      sha256: digest(captured.bytes),
      bytes: String(captured.bytes.byteLength),
      mode: String(Number(BigInt(outputIdentity.mode) & 0o777n)),
      stat_identity: outputIdentity,
    });
  }
  for (const file of input.data ?? []) {
    const bytes = Buffer.from(file.contents, 'utf8');
    const outputIdentity = await writeMaterialized(root, file.target, bytes, file.mode ?? 0o644);
    entries.push({
      target: file.target,
      sha256: digest(bytes),
      bytes: String(bytes.byteLength),
      mode: String(Number(BigInt(outputIdentity.mode) & 0o777n)),
      stat_identity: outputIdentity,
    });
  }
  const rootNode = await lstat(root, { bigint: true });
  assert(rootNode.isDirectory() && !rootNode.isSymbolicLink(), 'Created runtime root is not a directory.');
  const rootIdentity = identity(rootNode);
  const manifest: Manifest = {
    schema: 'VidaQualityRuntimeRoot/v1',
    root,
    root_identity: rootIdentity,
    entries,
    dependency,
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  assert(manifestBytes.byteLength <= 1024 * 1024, 'Runtime manifest exceeds its input bound.');
  const manifestHandle = await open(manifestFile, 'wx', 0o600);
  try {
    await manifestHandle.writeFile(manifestBytes);
    await manifestHandle.sync();
  } finally {
    await manifestHandle.close();
  }
  return {
    root,
    manifest_file: manifestFile,
    manifest_sha256: digest(manifestBytes),
    dependency_root: dependency.root,
    files: input.files
      .map((file) => ({ source: path.join(root, file.target.slice(1)), target: file.target }))
      .concat(
        (input.data ?? []).map((file) => ({ source: path.join(root, file.target.slice(1)), target: file.target })),
      ),
  };
}

function parseManifest(value: unknown): Manifest {
  assert(
    isRecord(value) &&
      exactKeys(value, ['schema', 'root', 'root_identity', 'entries', 'dependency']) &&
      value.schema === 'VidaQualityRuntimeRoot/v1' &&
      typeof value.root === 'string' &&
      path.isAbsolute(value.root) &&
      Array.isArray(value.entries),
    'Manifest is invalid.',
  );
  const parseIdentity = (item: unknown): Identity => {
    assert(
      isRecord(item) &&
        exactKeys(item, ['dev', 'ino', 'size', 'mtime_ns', 'ctime_ns', 'mode']) &&
        Object.values(item).every((part) => typeof part === 'string' && /^\d+$/u.test(part)),
      'Manifest identity is invalid.',
    );
    const field = (key: string): string => {
      const part = item[key];
      assert(typeof part === 'string' && /^\d+$/u.test(part), 'Manifest identity is invalid.');
      return part;
    };
    return {
      dev: field('dev'),
      ino: field('ino'),
      size: field('size'),
      mtime_ns: field('mtime_ns'),
      ctime_ns: field('ctime_ns'),
      mode: field('mode'),
    };
  };
  const rootIdentity = parseIdentity(value.root_identity);
  const dependency = value.dependency;
  assert(
    isRecord(dependency) &&
      exactKeys(dependency, ['root', 'directories']) &&
      typeof dependency.root === 'string' &&
      path.isAbsolute(dependency.root) &&
      Array.isArray(dependency.directories) &&
      dependency.directories.length > 0,
    'Dependency boundary is invalid.',
  );
  const seenDirectories = new Set<string>();
  const directories = dependency.directories.map((item: unknown) => {
    assert(
      isRecord(item) && exactKeys(item, ['path', 'identity']) && typeof item.path === 'string',
      'Dependency directory binding is invalid.',
    );
    const relative = item.path;
    assert(
      relative === '' ||
        (!path.isAbsolute(relative) &&
          !relative.includes('\\') &&
          !relative.includes('\0') &&
          relative.split('/').every((part) => part !== '' && part !== '.' && part !== '..')),
      'Dependency directory path is invalid.',
    );
    assert(!seenDirectories.has(relative), 'Dependency directory binding is duplicated.');
    seenDirectories.add(relative);
    return { path: relative, identity: parseIdentity(item.identity) };
  });
  assert(seenDirectories.has(''), 'Dependency root binding is missing.');
  const entries: Entry[] = value.entries.map((item: unknown) => {
    assert(
      isRecord(item) &&
        exactKeys(item, ['target', 'sha256', 'bytes', 'mode', 'stat_identity']) &&
        typeof item.target === 'string' &&
        typeof item.sha256 === 'string' &&
        /^[a-f0-9]{64}$/u.test(item.sha256) &&
        typeof item.bytes === 'string' &&
        /^\d+$/u.test(item.bytes) &&
        typeof item.mode === 'string' &&
        /^\d+$/u.test(item.mode),
      'Manifest entry is invalid.',
    );
    return {
      target: logicalTarget(item.target),
      sha256: item.sha256,
      bytes: item.bytes,
      mode: item.mode,
      stat_identity: parseIdentity(item.stat_identity),
    };
  });
  const sorted = entries.map((entry) => entry.target).sort();
  for (let i = 1; i < sorted.length; i++)
    assert(sorted[i] !== sorted[i - 1] && !sorted[i]!.startsWith(`${sorted[i - 1]}/`), 'Manifest targets collide.');
  return {
    schema: 'VidaQualityRuntimeRoot/v1',
    root: value.root,
    root_identity: rootIdentity,
    entries,
    dependency: { root: dependency.root, directories },
  };
}

export async function readQualityRuntimeRoot(
  manifestFile: string,
  manifestSha256: string,
): Promise<QualityRuntimeRoot> {
  assert(path.isAbsolute(manifestFile) && /^[a-f0-9]{64}$/u.test(manifestSha256), 'Manifest pin is invalid.');
  assert((await realpath(manifestFile)) === manifestFile, 'Runtime manifest path must be canonical.');
  const handle = await open(manifestFile, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let bytes: Buffer;
  try {
    const node = await handle.stat();
    assert(node.isFile() && node.size <= 1024 * 1024, 'Runtime manifest must be a bounded regular file.');
    bytes = await handle.readFile();
  } finally {
    await handle.close();
  }
  assert(digest(bytes) === manifestSha256, 'Manifest digest does not match its pin.');
  const parsedManifest: unknown = JSON.parse(bytes.toString('utf8'));
  const manifest = parseManifest(parsedManifest);
  const root = await realpath(manifest.root);
  assert(
    root === manifest.root && !manifestFile.startsWith(`${root}${path.sep}`),
    'Manifest root or location is invalid.',
  );
  const rootNode = await lstat(root, { bigint: true });
  assert(
    rootNode.isDirectory() && !rootNode.isSymbolicLink() && sameIdentity(identity(rootNode), manifest.root_identity),
    'Runtime root identity changed.',
  );
  assert((await realpath(manifest.dependency.root)) === manifest.dependency.root, 'Dependency root identity changed.');
  for (const entry of manifest.dependency.directories) {
    const directory = path.join(manifest.dependency.root, entry.path);
    const node = await lstat(directory, { bigint: true });
    assert(
      node.isDirectory() && !node.isSymbolicLink() && sameIdentity(identity(node), entry.identity),
      'Dependency namespace input changed.',
    );
  }
  const files: Array<{ source: string; target: string }> = [];
  for (const entry of manifest.entries) {
    const file = path.join(root, entry.target.slice(1));
    const canonical = await realpath(file);
    const node = await lstat(file, { bigint: true });
    const actual = identity(node);
    assert(
      canonical === file &&
        node.isFile() &&
        !node.isSymbolicLink() &&
        sameIdentity(actual, entry.stat_identity) &&
        actual.size === entry.bytes &&
        String(Number(BigInt(actual.mode) & 0o777n)) === entry.mode,
      'Materialized runtime file identity changed.',
    );
    files.push({ source: file, target: entry.target });
  }
  return {
    root,
    manifest_file: manifestFile,
    manifest_sha256: manifestSha256,
    dependency_root: manifest.dependency.root,
    files,
  };
}

async function main(argv: string[]): Promise<void> {
  assert(
    argv.length === 4 && argv[0] === '--inputs' && argv[2] === '--output',
    'Usage: bun quality-runtime-root.ts --inputs <file> --output <absolute-root>.',
  );
  const result = await materializeQualityRuntimeRoot(argv[1]!, argv[3]!);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Runtime root creation failed.'}\n`);
    process.exitCode = 1;
  });
}
