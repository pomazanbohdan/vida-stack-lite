import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fsPromises from 'node:fs/promises';
import { cp, lstat, mkdir, mkdtemp, readFile, readlink, readdir, rm, rmdir, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema, validateSchemaDefinition, type Schema } from '../skills/vp-mode/scripts/schema.js';
import {
  buildManifestPlan,
  checkManifestPlan,
  MANIFEST_TARGET_STATUS,
  runManifestCli,
  startManifestCli,
  writeManifestPlan,
} from '../scripts/build-manifests.js';
import { planFormationPayload } from '../scripts/formation-payload.js';

const fixtureRoot = fileURLToPath(new URL('./fixtures/manifest-build/', import.meta.url));
const schemaPath = fileURLToPath(new URL('../config/vppluginmanifest.v1.schema.json', import.meta.url));
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const testScratchRoot = join(packageRoot, '.tmp', 'native-formations-tests-20261022-54');
const formationRelativeRoot = '.tmp/vp-manifest-formations';
const outputPaths = [
  '.agents/plugins/marketplace.json',
  '.claude-plugin/marketplace.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.cursor-plugin/marketplace.json',
  '.cursor-plugin/plugin.json',
  'plugin.json',
];
const ownershipLedgerPath = '.tmp/vp-manifest-ownership.json';
const transactionPath = '.tmp/vp-manifest-build.transaction';
const skillDirectories = ['./skills/vp-mode/', './skills/vp-setup/'];
const temporaryRoots: string[] = [];

function forwardNative<T extends (...args: never[]) => unknown>(
  native: T,
  intercept: (args: unknown[], forward: () => Promise<unknown>) => Promise<unknown>,
): T {
  return new Proxy(native, {
    apply(fn, receiver: unknown, args: unknown[]) {
      return intercept(args, async () => Reflect.apply(fn, receiver, args));
    },
  });
}

async function makeTemporaryRoot(prefix: string): Promise<string> {
  await mkdir(testScratchRoot, { recursive: true });
  const root = await mkdtemp(join(testScratchRoot, prefix));
  temporaryRoots.push(root);
  return root;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('expected JSON object');
  return value;
}

function parseJson(raw: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  return record(value);
}

async function makeProject(targets?: readonly string[]): Promise<string> {
  const root = await makeTemporaryRoot('vp-manifest-');
  await mkdir(join(root, 'config'), { recursive: true });
  await cp(join(fixtureRoot, 'package.json'), join(root, 'package.json'));
  const inputs = parseJson(await readFile(join(fixtureRoot, 'plugin-manifest-inputs.json'), 'utf8'));
  if (targets !== undefined) inputs.targets = [...targets];
  await writeFile(join(root, 'config', 'plugin-manifest-inputs.json'), `${JSON.stringify(inputs, null, 2)}\n`, 'utf8');
  await cp(schemaPath, join(root, 'config', 'vppluginmanifest.v1.schema.json'));
  await cp(join(fixtureRoot, 'skills'), join(root, 'skills'), { recursive: true });
  return root;
}

async function makeNativeProject(targets: readonly string[]): Promise<string> {
  const root = await makeProject(targets);
  await mkdir(join(root, 'instructions'), { recursive: true });
  await mkdir(join(root, 'scripts'), { recursive: true });
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(root, 'catalog.json'), '{"schema":"VPCatalog/v1","fixture":true}\n', 'utf8');
  await writeFile(join(root, 'instructions', 'runtime.md'), 'canonical runtime instruction\n', 'utf8');
  await writeFile(join(root, 'scripts', 'runtime.ts'), 'export const fixture = true;\n', 'utf8');
  await writeFile(join(root, 'config', 'runtime.json'), '{"fixture":true}\n', 'utf8');
  await writeFile(join(root, 'assets', 'raw.bin'), Buffer.from([0x00, 0x0d, 0x0a, 0xff]));
  for (const directory of ['.git', '.hg', '.svn', 'node_modules', 'coverage', '.tmp']) {
    await mkdir(join(root, directory), { recursive: true });
    await writeFile(join(root, directory, 'excluded.txt'), `${directory} sentinel\n`, 'utf8');
  }
  return root;
}

async function readSchema(): Promise<Schema> {
  return record(JSON.parse(await readFile(schemaPath, 'utf8')));
}

function validateOutputShape(schema: Schema, key: string, value: Record<string, unknown>): readonly unknown[] {
  const definitions = record(schema.definitions);
  return validateAgainstSchema(value, { ...record(definitions[key]), definitions } as Schema);
}

async function readGolden(path: string): Promise<string> {
  return readFile(join(fixtureRoot, 'golden', ...path.split('/')), 'utf8');
}

async function readInputs(root: string): Promise<Record<string, unknown>> {
  return parseJson(await readFile(join(root, 'config', 'plugin-manifest-inputs.json'), 'utf8'));
}

async function writeInputs(root: string, inputs: Record<string, unknown>): Promise<void> {
  await writeFile(join(root, 'config', 'plugin-manifest-inputs.json'), `${JSON.stringify(inputs, null, 2)}\n`, 'utf8');
}

async function readOutputSet(root: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const path of outputPaths) {
    try {
      files.set(path, await readFile(join(root, ...path.split('/')), 'utf8'));
    } catch (error) {
      if (!isRecord(error) || error.code !== 'ENOENT') throw error;
    }
  }
  return files;
}

async function readTreeBytes(root: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();
  async function visit(directory: string, prefix = ''): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        snapshot.set(relative, 'directory');
        await visit(absolute, relative);
      } else if (entry.isFile()) {
        snapshot.set(relative, `file:${(await readFile(absolute)).toString('hex')}`);
      } else if (entry.isSymbolicLink()) {
        snapshot.set(relative, `symlink:${await readlink(absolute)}`);
      } else {
        throw new Error(`Unsupported filesystem entry in snapshot: ${relative}`);
      }
    }
  }
  await visit(root);
  return snapshot;
}

async function readSourceTreeBytes(root: string): Promise<Map<string, string>> {
  const snapshot = await readTreeBytes(root);
  return new Map([...snapshot].filter(([path]) => path !== '.tmp' && !path.startsWith('.tmp/')));
}

function contentBytes(value: string | Uint8Array | undefined): Buffer {
  if (value === undefined) throw new Error('expected planned content');
  return typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value);
}

function contentText(value: string | Uint8Array | undefined): string {
  return contentBytes(value).toString('utf8');
}

function targetStatus(target: string): string {
  return (MANIFEST_TARGET_STATUS as unknown as Record<string, { status: string }>)[target]?.status ?? 'missing';
}

function invokeManifestCli(args: readonly string[], cwd: string): { exitCode: number; stdout: string; stderr: string } {
  const scriptPath = fileURLToPath(new URL('../scripts/build-manifests.ts', import.meta.url));
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (error) {
    const childError = error as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      exitCode: childError.status ?? 1,
      stdout: String(childError.stdout ?? ''),
      stderr: String(childError.stderr ?? ''),
    };
  }
}

afterAll(async () => {
  await Promise.all(temporaryRoots.map((root) => rm(root, { recursive: true, force: true })));
  await rmdir(testScratchRoot).catch(() => undefined);
});

describe('manifest schema and deterministic generation', () => {
  test('schema validates itself and uses the supported schema subset', async () => {
    const schema = await readSchema();
    expect(validateSchemaDefinition(schema)).toEqual([]);
    expect(validateAgainstSchema({
      schema: 'VPPluginManifestInputs/v1',
      targets: ['portable'],
      metadata: {
        contact: { name: 'Fixture Maintainer', email: 'fixture@example.invalid' },
        license: 'FIXTURE-ONLY',
        privacyPolicyUrl: 'https://example.invalid/privacy',
        termsOfServiceUrl: 'https://example.invalid/terms',
        category: 'Fixture Category',
      },
    }, schema)).toEqual([]);
  });

  test('maps supported targets to exact golden files without copying payload', async () => {
    const root = await makeProject();
    const skillPath = join(root, 'skills', 'vp-mode', 'SKILL.md');
    const skillSentinel = await readFile(skillPath, 'utf8');

    const plan = await buildManifestPlan(root);
    expect([...plan.files.keys()].sort()).toEqual(outputPaths);
    for (const path of outputPaths) expect(plan.files.get(path)).toBe(await readGolden(path));
    for (const content of plan.files.values()) {
      const text = contentText(content);
      const output = parseJson(text);
      expect(Object.hasOwn(output, 'catalog')).toBe(false);
      expect(text.includes('\r')).toBe(false);
    }
    expect(parseJson(contentText(plan.files.get('.codex-plugin/plugin.json'))).skills).toBe('./skills/');
    for (const path of ['.claude-plugin/plugin.json', '.cursor-plugin/plugin.json']) {
      expect(parseJson(contentText(plan.files.get(path))).skills).toEqual(skillDirectories);
    }

    await writeManifestPlan(root, plan);
    expect(await readFile(skillPath, 'utf8')).toBe(skillSentinel);
    expect((await readdir(root)).sort()).toEqual(['.agents', '.claude-plugin', '.codex-plugin', '.cursor-plugin', '.tmp', 'config', 'package.json', 'plugin.json', 'skills']);
    expect(await checkManifestPlan(root, plan)).toEqual({ ok: true, issues: [] });
  });

  test('canonical output is stable when target order changes', async () => {
    const firstRoot = await makeProject(['portable', 'codex', 'claude', 'cursor']);
    const secondRoot = await makeProject(['cursor', 'claude', 'codex', 'portable']);
    const first = await buildManifestPlan(firstRoot);
    const second = await buildManifestPlan(secondRoot);
    expect([...second.files.entries()]).toEqual([...first.files.entries()]);
    for (const content of first.files.values()) {
      expect(contentText(content).endsWith('\n')).toBe(true);
      expect(contentText(content).startsWith('\uFEFF')).toBe(false);
    }
  });
});

describe('manifest input and output boundaries', () => {
  test('missing inputs fail with structured code before any output', async () => {
    const root = await makeTemporaryRoot('vp-manifest-missing-');
    await mkdir(join(root, 'config'), { recursive: true });
    await cp(join(fixtureRoot, 'package.json'), join(root, 'package.json'));
    await cp(schemaPath, join(root, 'config', 'vppluginmanifest.v1.schema.json'));
    await expect(buildManifestPlan(root)).rejects.toMatchObject({ code: 'MANIFEST_INPUT_MISSING' });
    expect(await readdir(root)).toEqual(['config', 'package.json']);
  });

  test('input read errors remain structured and write nothing', async () => {
    const root = await makeProject(['portable']);
    const inputPath = join(root, 'config', 'plugin-manifest-inputs.json');
    const before = await readTreeBytes(root);
    const originalReadFile = fsPromises.readFile;
    const readFileSpy = spyOn(fsPromises, 'readFile').mockImplementation(forwardNative(originalReadFile, async (args, forward) => {
      if (String(args[0]) === inputPath) throw Object.assign(new Error('injected input read error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(buildManifestPlan(root)).rejects.toMatchObject({
        code: 'MANIFEST_INPUT_READ_FAILED',
        details: ['injected input read error'],
      });
    } finally {
      readFileSpy.mockRestore();
    }
    expect(fsPromises.readFile).toBe(originalReadFile);
    expect(await readTreeBytes(root)).toEqual(before);
  });

  test('malformed inputs, invalid schemas, and package identities fail before writes', async () => {
    const malformedRoot = await makeProject(['portable']);
    await writeFile(join(malformedRoot, 'config', 'plugin-manifest-inputs.json'), '{\n', 'utf8');
    await expect(buildManifestPlan(malformedRoot)).rejects.toMatchObject({ code: 'MANIFEST_JSON_INVALID' });
    expect(await lstat(join(malformedRoot, 'plugin.json')).catch(() => undefined)).toBeUndefined();

    const missingOutputSchemaRoot = await makeProject(['portable']);
    const missingOutputSchemaPath = join(missingOutputSchemaRoot, 'config', 'vppluginmanifest.v1.schema.json');
    const missingOutputSchema = await readSchema();
    delete record(missingOutputSchema.definitions).portablePlugin;
    await writeFile(missingOutputSchemaPath, `${JSON.stringify(missingOutputSchema, null, 2)}\n`, 'utf8');
    await expect(buildManifestPlan(missingOutputSchemaRoot)).rejects.toMatchObject({ code: 'MANIFEST_SCHEMA_INVALID' });

    const invalidOutputSchemaRoot = await makeProject(['portable']);
    const invalidOutputSchemaPath = join(invalidOutputSchemaRoot, 'config', 'vppluginmanifest.v1.schema.json');
    const invalidOutputSchema = await readSchema();
    const portableSchema = record(record(invalidOutputSchema.definitions).portablePlugin);
    record(portableSchema.properties).name = { const: 'different-plugin' };
    await writeFile(invalidOutputSchemaPath, `${JSON.stringify(invalidOutputSchema, null, 2)}\n`, 'utf8');
    await expect(buildManifestPlan(invalidOutputSchemaRoot)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_INVALID' });

    const missingIdentityRoot = await makeProject(['portable']);
    const missingIdentity = parseJson(await readFile(join(missingIdentityRoot, 'package.json'), 'utf8'));
    missingIdentity.name = '';
    await writeFile(join(missingIdentityRoot, 'package.json'), `${JSON.stringify(missingIdentity, null, 2)}\n`, 'utf8');
    await expect(buildManifestPlan(missingIdentityRoot)).rejects.toMatchObject({ code: 'MANIFEST_INPUT_INVALID' });

    const unsafeIdentityRoot = await makeProject(['portable']);
    const unsafeIdentity = parseJson(await readFile(join(unsafeIdentityRoot, 'package.json'), 'utf8'));
    unsafeIdentity.name = '../fixture';
    await writeFile(join(unsafeIdentityRoot, 'package.json'), `${JSON.stringify(unsafeIdentity, null, 2)}\n`, 'utf8');
    await expect(buildManifestPlan(unsafeIdentityRoot)).rejects.toMatchObject({ code: 'MANIFEST_PACKAGE_INVALID' });
  });

  test('validated inputs still enforce target shape, uniqueness, and host owner rules', async () => {
    const duplicateRoot = await makeProject(['portable']);
    const duplicateInputs = await readInputs(duplicateRoot);
    duplicateInputs.targets = ['portable', 'portable'];
    await writeInputs(duplicateRoot, duplicateInputs);
    await expect(buildManifestPlan(duplicateRoot)).rejects.toMatchObject({ code: 'MANIFEST_INPUT_INVALID' });

    const nonStringRoot = await makeProject(['portable']);
    const nonStringSchemaPath = join(nonStringRoot, 'config', 'vppluginmanifest.v1.schema.json');
    const nonStringSchema = await readSchema();
    const targetSchema = record(record(nonStringSchema.properties).targets);
    const targetItemSchema = record(targetSchema.items);
    delete targetItemSchema.type;
    delete targetItemSchema.enum;
    await writeFile(nonStringSchemaPath, `${JSON.stringify(nonStringSchema, null, 2)}\n`, 'utf8');
    const nonStringInputs = await readInputs(nonStringRoot);
    nonStringInputs.targets = [42];
    await writeInputs(nonStringRoot, nonStringInputs);
    await expect(buildManifestPlan(nonStringRoot)).rejects.toMatchObject({ code: 'MANIFEST_INPUT_INVALID' });

    const ownerRoot = await makeProject(['codex']);
    const ownerInputs = await readInputs(ownerRoot);
    delete record(ownerInputs.metadata).contact;
    await writeInputs(ownerRoot, ownerInputs);
    await expect(buildManifestPlan(ownerRoot)).rejects.toMatchObject({
      code: 'MANIFEST_INPUT_INVALID',
      details: ['metadata.contact.name'],
    });
  });

  test('input symlinks, output parents, and output target types fail before writes', async () => {
    const inputRoot = await makeProject(['portable']);
    const outside = await makeTemporaryRoot('manifest-input-outside-');
    await mkdir(join(outside, 'config'), { recursive: true });
    await cp(schemaPath, join(outside, 'config', 'vppluginmanifest.v1.schema.json'));
    await rm(join(inputRoot, 'config'), { recursive: true });
    await symlink(join(outside, 'config'), join(inputRoot, 'config'), 'junction');
    await expect(buildManifestPlan(inputRoot)).rejects.toMatchObject({ code: 'MANIFEST_INPUT_UNSAFE' });
    expect(await lstat(join(inputRoot, 'plugin.json')).catch(() => undefined)).toBeUndefined();
    expect(await readdir(outside)).toEqual(['config']);

    const parentRoot = await makeProject(['claude']);
    await writeFile(join(parentRoot, '.claude-plugin'), 'parent is a file\n', 'utf8');
    await expect(writeManifestPlan(parentRoot, await buildManifestPlan(parentRoot)))
      .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_UNSAFE' });
    expect(await readFile(join(parentRoot, '.claude-plugin'), 'utf8')).toBe('parent is a file\n');

    const targetRoot = await makeProject(['portable']);
    await mkdir(join(targetRoot, 'plugin.json'));
    await expect(writeManifestPlan(targetRoot, await buildManifestPlan(targetRoot)))
      .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_UNSAFE' });
    expect(await readdir(join(targetRoot, 'plugin.json'))).toEqual([]);
  });

  test('ownership and transaction paths reject malformed types and relative escapes', async () => {
    const scratchFileRoot = await makeProject(['portable']);
    await writeFile(join(scratchFileRoot, '.tmp'), 'not a directory\n', 'utf8');
    await expect(writeManifestPlan(scratchFileRoot, await buildManifestPlan(scratchFileRoot)))
      .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_UNSAFE' });

    const transactionFileRoot = await makeProject(['portable']);
    await mkdir(join(transactionFileRoot, '.tmp'), { recursive: true });
    await writeFile(join(transactionFileRoot, ...transactionPath.split('/')), 'not a directory\n', 'utf8');
    await expect(writeManifestPlan(transactionFileRoot, await buildManifestPlan(transactionFileRoot)))
      .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_UNSAFE' });

    for (const path of [
      `${formationRelativeRoot}/../escape.json`,
      `${formationRelativeRoot}/safe/../../escape.json`,
    ]) {
      const root = await makeProject(['portable']);
      const ledgerPath = join(root, ...ownershipLedgerPath.split('/'));
      await mkdir(dirname(ledgerPath), { recursive: true });
      await writeFile(ledgerPath, `${JSON.stringify({ schema: 'VPManifestOwnership/v1', files: { [path]: '0'.repeat(64) } }, null, 2)}\n`, 'utf8');
      await expect(writeManifestPlan(root, await buildManifestPlan(root)))
        .rejects.toMatchObject({ code: 'MANIFEST_OWNERSHIP_INVALID' });
      expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
    }
  });

  test('project root resolution errors are wrapped by operational, output, and skill boundaries', async () => {
    const cases = [
      { target: 'portable', failingCall: 4, code: 'MANIFEST_OUTPUT_UNSAFE' },
      { target: 'portable', failingCall: 6, code: 'MANIFEST_OUTPUT_UNSAFE' },
      { target: 'codex', failingCall: 7, code: 'MANIFEST_SKILL_RESOURCE_INVALID' },
    ] as const;
    for (const scenario of cases) {
      const root = await makeProject([scenario.target]);
      const plan = await buildManifestPlan(root);
      const originalRealpath = fsPromises.realpath;
      let rootCalls = 0;
      const realpathSpy = spyOn(fsPromises, 'realpath').mockImplementation(forwardNative(originalRealpath, async (args, forward) => {
        if (String(args[0]) === root) {
          rootCalls += 1;
          if (rootCalls === scenario.failingCall) throw Object.assign(new Error('injected package root resolution error'), { code: 'EIO' });
        }
        return forward();
      }));
      try {
        await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({ code: scenario.code });
      } finally {
        realpathSpy.mockRestore();
      }
      expect(rootCalls).toBe(scenario.failingCall);
      expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
    }
  });

  test('manifest path inspection failures return structured errors without writes', async () => {
    const outputRoot = await makeProject(['portable']);
    const outputPlan = await buildManifestPlan(outputRoot);
    const outputPath = join(outputRoot, 'plugin.json');
    const originalLstat = fsPromises.lstat;
    const outputStatSpy = spyOn(fsPromises, 'lstat').mockImplementation(forwardNative(originalLstat, async (args, forward) => {
      if (String(args[0]) === outputPath) throw Object.assign(new Error('injected output stat error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(writeManifestPlan(outputRoot, outputPlan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_READ_FAILED' });
    } finally {
      outputStatSpy.mockRestore();
    }
    expect(await lstat(outputPath).catch(() => undefined)).toBeUndefined();

    const scratchRoot = await makeProject(['portable']);
    const scratchPlan = await buildManifestPlan(scratchRoot);
    const scratchPath = join(scratchRoot, '.tmp');
    await mkdir(scratchPath);
    const scratchStatSpy = spyOn(fsPromises, 'lstat').mockImplementation(forwardNative(originalLstat, async (args, forward) => {
      if (String(args[0]) === scratchPath) throw Object.assign(new Error('injected scratch stat error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(writeManifestPlan(scratchRoot, scratchPlan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_READ_FAILED' });
    } finally {
      scratchStatSpy.mockRestore();
    }
    expect(await lstat(join(scratchRoot, 'plugin.json')).catch(() => undefined)).toBeUndefined();

    const transactionRoot = await makeProject(['portable']);
    const transactionPlan = await buildManifestPlan(transactionRoot);
    const transactionDirectory = join(transactionRoot, ...transactionPath.split('/'));
    await mkdir(transactionDirectory, { recursive: true });
    const transactionStatSpy = spyOn(fsPromises, 'lstat').mockImplementation(forwardNative(originalLstat, async (args, forward) => {
      if (String(args[0]) === transactionDirectory) throw Object.assign(new Error('injected transaction stat error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(writeManifestPlan(transactionRoot, transactionPlan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_READ_FAILED' });
    } finally {
      transactionStatSpy.mockRestore();
    }
    expect(await lstat(join(transactionRoot, 'plugin.json')).catch(() => undefined)).toBeUndefined();

    const ledgerRoot = await makeProject(['portable']);
    const ledgerPlan = await buildManifestPlan(ledgerRoot);
    const ledgerPath = join(ledgerRoot, ...ownershipLedgerPath.split('/'));
    await mkdir(dirname(ledgerPath), { recursive: true });
    await writeFile(ledgerPath, '{"schema":"VPManifestOwnership/v1","files":{}}\n', 'utf8');
    const originalReadFile = fsPromises.readFile;
    const ledgerReadSpy = spyOn(fsPromises, 'readFile').mockImplementation(forwardNative(originalReadFile, async (args, forward) => {
      if (String(args[0]) === ledgerPath) throw Object.assign(new Error('injected ledger read error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(writeManifestPlan(ledgerRoot, ledgerPlan)).rejects.toMatchObject({ code: 'MANIFEST_OWNERSHIP_READ_FAILED' });
    } finally {
      ledgerReadSpy.mockRestore();
    }
    expect(await lstat(join(ledgerRoot, 'plugin.json')).catch(() => undefined)).toBeUndefined();

    const optionalRoot = await makeProject(['portable']);
    const optionalPlan = await buildManifestPlan(optionalRoot);
    const optionalPath = join(optionalRoot, 'plugin.json');
    await writeFile(optionalPath, 'foreign fixture\n', 'utf8');
    const optionalReadSpy = spyOn(fsPromises, 'readFile').mockImplementation(forwardNative(originalReadFile, async (args, forward) => {
      if (String(args[0]) === optionalPath) throw Object.assign(new Error('injected generated output read error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(writeManifestPlan(optionalRoot, optionalPlan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_READ_FAILED' });
    } finally {
      optionalReadSpy.mockRestore();
    }
    expect(await readFile(optionalPath, 'utf8')).toBe('foreign fixture\n');
  });

  test('actual ownership ledger inspection failure is rejected before output writes', async () => {
    const root = await makeProject(['portable']);
    const plan = await buildManifestPlan(root);
    const ledger = join(root, ...ownershipLedgerPath.split('/'));
    await mkdir(dirname(ledger), { recursive: true });
    await writeFile(ledger, '{"schema":"VPManifestOwnership/v1","files":{}}\n', 'utf8');
    const before = await readTreeBytes(root);
    let inspections = 0;
    const nativeLstat = fsPromises.lstat;
    const intercepted = spyOn(fsPromises, 'lstat').mockImplementation(forwardNative(nativeLstat, async (args, forward) => {
      const metadata = await forward();
      if (args[0] === ledger) {
        inspections += 1;
        throw Object.assign(new Error('injected ownership ledger inspection error'), { code: 'EIO' });
      }
      return metadata;
    }));
    try {
      await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({
        code: 'MANIFEST_OUTPUT_READ_FAILED', message: 'Cannot inspect manifest ownership ledger.',
      });
    } finally {
      intercepted.mockRestore();
    }
    expect(inspections).toBe(1);
    expect(await readTreeBytes(root)).toEqual(before);
  });

  test('native formation reader wraps root, directory, entry, and file read failures', async () => {
    for (const scenario of ['root-stat', 'directory-read', 'entry-stat', 'file-read'] as const) {
      const root = await makeNativeProject(['antigravity']);
      const outputRoot = join(root, '.tmp', 'vp-manifest-formations');
      const outputDirectory = join(outputRoot, 'antigravity');
      const outputFile = join(outputDirectory, 'foreign.txt');
      if (scenario !== 'root-stat') await mkdir(outputDirectory, { recursive: true });
      if (scenario === 'entry-stat' || scenario === 'file-read') await writeFile(outputFile, 'fixture\n', 'utf8');
      const before = await readTreeBytes(root);
      const failure = Object.assign(new Error(`injected ${scenario} failure`), { code: 'EIO' });
      let injected = false;
      let restore = () => {};
      if (scenario === 'root-stat') {
        const originalLstat = fsPromises.lstat;
        const spy = spyOn(fsPromises, 'lstat').mockImplementation(forwardNative(originalLstat, async (args, forward) => {
          if (String(args[0]) === outputRoot) { injected = true; throw failure; }
          return forward();
        }));
        restore = () => spy.mockRestore();
      } else if (scenario === 'directory-read') {
        const originalReaddir = fsPromises.readdir;
        const spy = spyOn(fsPromises, 'readdir').mockImplementation(forwardNative(originalReaddir, async (args, forward) => {
          if (String(args[0]) === outputRoot) { injected = true; throw failure; }
          return forward();
        }));
        restore = () => spy.mockRestore();
      } else if (scenario === 'entry-stat') {
        const originalLstat = fsPromises.lstat;
        const spy = spyOn(fsPromises, 'lstat').mockImplementation(forwardNative(originalLstat, async (args, forward) => {
          if (String(args[0]) === outputFile) { injected = true; throw failure; }
          return forward();
        }));
        restore = () => spy.mockRestore();
      } else {
        const originalReadFile = fsPromises.readFile;
        const spy = spyOn(fsPromises, 'readFile').mockImplementation(forwardNative(originalReadFile, async (args, forward) => {
          if (String(args[0]) === outputFile) { injected = true; throw failure; }
          return forward();
        }));
        restore = () => spy.mockRestore();
      }
      try {
        await expect(buildManifestPlan(root)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_READ_FAILED' });
      } finally {
        restore();
      }
      expect(injected).toBe(true);
      expect(await readTreeBytes(root)).toEqual(before);
    }
  });

  test('transaction creation distinguishes concurrent state from filesystem failure', async () => {
    for (const code of ['EEXIST', 'EIO'] as const) {
      const root = await makeProject(['portable']);
      const plan = await buildManifestPlan(root);
      const scratchRoot = join(root, '.tmp');
      const transactionRoot = join(root, ...transactionPath.split('/'));
      await mkdir(scratchRoot, { recursive: true });
      const originalMkdir = fsPromises.mkdir;
      let injected = false;
      const mkdirSpy = spyOn(fsPromises, 'mkdir').mockImplementation(forwardNative(originalMkdir, async (args, forward) => {
        if (String(args[0]) === transactionRoot && !injected) {
          injected = true;
          if (code === 'EEXIST') await forward();
          throw Object.assign(new Error(`injected transaction mkdir ${code}`), { code });
        }
        return forward();
      }));
      try {
        await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({
          code: code === 'EEXIST' ? 'MANIFEST_OUTPUT_RECOVERY_REQUIRED' : 'MANIFEST_OUTPUT_STAGE_FAILED',
        });
      } finally {
        mkdirSpy.mockRestore();
      }
      expect(injected).toBe(true);
      expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
      if (code === 'EEXIST') {
        expect((await lstat(transactionRoot)).isDirectory()).toBe(true);
        await rm(transactionRoot, { recursive: true, force: true });
      } else {
        expect(await lstat(transactionRoot).catch(() => undefined)).toBeUndefined();
      }
    }
  });

  test('staging failure cleans its transaction and cleanup failure retains recovery state', async () => {
    for (const failCleanup of [false, true]) {
      const root = await makeProject(['portable']);
      const plan = await buildManifestPlan(root);
      const transactionRoot = join(root, ...transactionPath.split('/'));
      const originalWriteFile = fsPromises.writeFile;
      const originalRm = fsPromises.rm;
      let stageFailed = false;
      const writeSpy = spyOn(fsPromises, 'writeFile').mockImplementation(async (...args) => {
        if (String(args[0]).startsWith(transactionRoot) && String(args[0]).includes('staged-') && !stageFailed) {
          stageFailed = true;
          throw Object.assign(new Error('injected transaction stage failure'), { code: 'EIO' });
        }
        return originalWriteFile(...args);
      });
      const rmSpy = failCleanup ? spyOn(fsPromises, 'rm').mockImplementation(async (...args) => {
        if (String(args[0]) === transactionRoot) throw Object.assign(new Error('injected transaction cleanup failure'), { code: 'EIO' });
        return originalRm(...args);
      }) : undefined;
      try {
        await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({
          code: failCleanup ? 'MANIFEST_OUTPUT_RECOVERY_REQUIRED' : 'MANIFEST_OUTPUT_STAGE_FAILED',
        });
      } finally {
        rmSpy?.mockRestore();
        writeSpy.mockRestore();
      }
      expect(stageFailed).toBe(true);
      expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
      if (failCleanup) {
        expect((await lstat(transactionRoot)).isDirectory()).toBe(true);
        expect(await lstat(join(transactionRoot, 'journal.json')).catch(() => undefined)).toBeUndefined();
        await rm(transactionRoot, { recursive: true, force: true });
      } else {
        expect(await lstat(transactionRoot).catch(() => undefined)).toBeUndefined();
      }
    }
  });

  test('an uncertain rename effect is detected and rolled back after a transient read error', async () => {
    const root = await makeProject(['portable']);
    const plan = await buildManifestPlan(root);
    const outputPath = join(root, 'plugin.json');
    const transactionRoot = join(root, ...transactionPath.split('/'));
    const originalRename = fsPromises.rename;
    const originalReadFile = fsPromises.readFile;
    let renamed = false;
    let readFailed = false;
    const renameSpy = spyOn(fsPromises, 'rename').mockImplementation(async (...args) => {
      const result = await originalRename(...args);
      if (String(args[1]) === outputPath && !renamed) {
        renamed = true;
        throw Object.assign(new Error('injected post-rename error'), { code: 'EIO' });
      }
      return result;
    });
    const readSpy = spyOn(fsPromises, 'readFile').mockImplementation(forwardNative(originalReadFile, async (args, forward) => {
      if (renamed && !readFailed && String(args[0]) === outputPath) {
        readFailed = true;
        throw Object.assign(new Error('injected post-rename read error'), { code: 'EIO' });
      }
      return forward();
    }));
    try {
      await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_WRITE_FAILED' });
    } finally {
      readSpy.mockRestore();
      renameSpy.mockRestore();
    }
    expect(renamed).toBe(true);
    expect(readFailed).toBe(true);
    expect(await lstat(outputPath).catch(() => undefined)).toBeUndefined();
    expect(await lstat(transactionRoot).catch(() => undefined)).toBeUndefined();
  });

  test('foreign mutation after an uncertain rename remains fenced for recovery', async () => {
    for (const failRecoveryJournal of [false, true]) {
      const root = await makeProject(['portable']);
      const plan = await buildManifestPlan(root);
      const outputPath = join(root, 'plugin.json');
      const transactionRoot = join(root, ...transactionPath.split('/'));
      const journalPath = join(transactionRoot, 'journal.json');
      const originalRename = fsPromises.rename;
      const originalWriteFile = fsPromises.writeFile;
      let drifted = false;
      const renameSpy = spyOn(fsPromises, 'rename').mockImplementation(async (...args) => {
        const result = await originalRename(...args);
        if (String(args[1]) === outputPath && !drifted) {
          drifted = true;
          await originalWriteFile(outputPath, 'foreign concurrent content\n', 'utf8');
          throw Object.assign(new Error('injected post-rename uncertainty'), { code: 'EIO' });
        }
        return result;
      });
      const writeSpy = failRecoveryJournal ? spyOn(fsPromises, 'writeFile').mockImplementation(async (...args) => {
        if (String(args[0]) === journalPath && String(args[1]).includes('"state": "recovery-required"')) {
          throw Object.assign(new Error('injected recovery journal write error'), { code: 'EIO' });
        }
        return originalWriteFile(...args);
      }) : undefined;
      let error: unknown;
      try {
        await writeManifestPlan(root, plan);
      } catch (caught) {
        error = caught;
      } finally {
        writeSpy?.mockRestore();
        renameSpy.mockRestore();
      }
      expect(error).toMatchObject({
        code: 'MANIFEST_OUTPUT_RECOVERY_REQUIRED',
        ...(failRecoveryJournal ? { details: expect.arrayContaining([expect.stringContaining('journal:')]) } : {}),
      });
      expect(drifted).toBe(true);
      expect(await readFile(outputPath, 'utf8')).toBe('foreign concurrent content\n');
      const journal = parseJson(await readFile(journalPath, 'utf8'));
      expect(journal.state).toBe(failRecoveryJournal ? 'staged' : 'recovery-required');
      await rm(transactionRoot, { recursive: true, force: true });
    }
  });

  test('apply-time compare-and-swap preserves a concurrent staged output for recovery', async () => {
    const root = await makeProject(['portable']);
    const plan = await buildManifestPlan(root);
    const outputPath = join(root, 'plugin.json');
    const transactionRoot = join(root, ...transactionPath.split('/'));
    const originalWriteFile = fsPromises.writeFile;
    let injected = false;
    const writeSpy = spyOn(fsPromises, 'writeFile').mockImplementation(async (...args) => {
      const path = String(args[0]);
      const result = await originalWriteFile(...args);
      if (path.startsWith(transactionRoot) && path.includes('staged-') && !injected) {
        injected = true;
        await originalWriteFile(outputPath, 'foreign staged race\n', 'utf8');
      }
      return result;
    });
    let error: unknown;
    try {
      await writeManifestPlan(root, plan);
    } catch (caught) {
      error = caught;
    } finally {
      writeSpy.mockRestore();
    }
    expect(error).toMatchObject({ code: 'MANIFEST_OUTPUT_RECOVERY_REQUIRED' });
    expect(injected).toBe(true);
    expect(await readFile(outputPath, 'utf8')).toBe('foreign staged race\n');
    expect(parseJson(await readFile(join(transactionRoot, 'journal.json'), 'utf8')).state).toBe('recovery-required');
    await rm(transactionRoot, { recursive: true, force: true });
  });

  test('rollback accepts an output restored to its prior bytes during failure handling', async () => {
    const root = await makeProject(['portable']);
    const originalPlan = await buildManifestPlan(root);
    await writeManifestPlan(root, originalPlan);
    const outputPath = join(root, 'plugin.json');
    const previous = await readFile(outputPath);
    const metadata = parseJson(await readFile(join(root, 'package.json'), 'utf8'));
    metadata.description = 'Changed before manifest rollback fixture.';
    await writeFile(join(root, 'package.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
    const nextPlan = await buildManifestPlan(root);
    const journalPath = join(root, ...transactionPath.split('/'), 'journal.json');
    const originalWriteFile = fsPromises.writeFile;
    let reverted = false;
    const writeSpy = spyOn(fsPromises, 'writeFile').mockImplementation(async (...args) => {
      if (String(args[0]) === journalPath && String(args[1]).includes('"state": "applying"') && !reverted) {
        reverted = true;
        await originalWriteFile(outputPath, previous);
        throw Object.assign(new Error('injected journal failure after external restore'), { code: 'EIO' });
      }
      return originalWriteFile(...args);
    });
    try {
      await expect(writeManifestPlan(root, nextPlan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_WRITE_FAILED' });
    } finally {
      writeSpy.mockRestore();
    }
    expect(reverted).toBe(true);
    expect(await readFile(outputPath)).toEqual(previous);
    expect(await lstat(join(root, ...transactionPath.split('/'))).catch(() => undefined)).toBeUndefined();
  });

  test('final output verification failure rolls back newly written files', async () => {
    const root = await makeProject(['portable']);
    const plan = await buildManifestPlan(root);
    const outputPath = join(root, 'plugin.json');
    const originalRename = fsPromises.rename;
    const originalReadFile = fsPromises.readFile;
    let applied = false;
    let injected = false;
    const renameSpy = spyOn(fsPromises, 'rename').mockImplementation(async (...args) => {
      const result = await originalRename(...args);
      if (String(args[1]) === outputPath) applied = true;
      return result;
    });
    const readSpy = spyOn(fsPromises, 'readFile').mockImplementation(forwardNative(originalReadFile, async (args, forward) => {
      if (applied && !injected && String(args[0]) === outputPath) {
        injected = true;
        return Buffer.from('drift visible during final verification\n');
      }
      return forward();
    }));
    try {
      await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_WRITE_FAILED' });
    } finally {
      readSpy.mockRestore();
      renameSpy.mockRestore();
    }
    expect(injected).toBe(true);
    expect(await lstat(outputPath).catch(() => undefined)).toBeUndefined();
    expect(await lstat(join(root, ...transactionPath.split('/'))).catch(() => undefined)).toBeUndefined();
  });

  test('invalid metadata and deferred or unknown targets fail closed', async () => {
    const invalidRoot = await makeProject(['codex']);
    const invalid = parseJson(await readFile(join(invalidRoot, 'config', 'plugin-manifest-inputs.json'), 'utf8'));
    const metadata = record(invalid.metadata);
    delete record(metadata.contact).name;
    await writeFile(join(invalidRoot, 'config', 'plugin-manifest-inputs.json'), `${JSON.stringify(invalid, null, 2)}\n`, 'utf8');
    await expect(buildManifestPlan(invalidRoot)).rejects.toMatchObject({ code: 'MANIFEST_INPUT_INVALID' });
    expect((await readdir(invalidRoot)).sort()).toEqual(['config', 'package.json', 'skills']);

    expect(MANIFEST_TARGET_STATUS.codex.status).toBe('host-verified');
    expect(MANIFEST_TARGET_STATUS.claude.status).toBe('format-mapped');
    expect(MANIFEST_TARGET_STATUS.cursor.status).toBe('format-mapped');
    for (const target of ['root-marketplace', 'muse', 'devin', 'kimi']) {
      expect(MANIFEST_TARGET_STATUS[target as keyof typeof MANIFEST_TARGET_STATUS].status).toBe('deferred');
      const deferredRoot = await makeProject([target]);
      await expect(buildManifestPlan(deferredRoot)).rejects.toMatchObject({ code: 'MANIFEST_TARGET_DEFERRED' });
      expect((await readdir(deferredRoot)).sort()).toEqual(['config', 'package.json', 'skills']);
    }
    const catalogRoot = await makeProject(['muse-catalog']);
    await expect(buildManifestPlan(catalogRoot)).rejects.toMatchObject({ code: 'MANIFEST_MUSE_CATALOG_NOT_READY' });
    const unknownRoot = await makeProject(['future-host']);
    await expect(buildManifestPlan(unknownRoot)).rejects.toMatchObject({ code: 'MANIFEST_INPUT_INVALID' });
  });

  test('--check reports missing, drifted, and stale outputs without writing', async () => {
    const root = await makeProject(['portable']);
    const plan = await buildManifestPlan(root);
    const before = await checkManifestPlan(root, plan);
    expect(before.ok).toBe(false);
    expect(before.issues.map((issue) => issue.code)).toEqual(['MANIFEST_OUTPUT_MISSING']);
    expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();

    await writeManifestPlan(root, plan);
    await writeFile(join(root, 'plugin.json'), '{"changed":true}\n', 'utf8');
    await mkdir(join(root, '.cursor-plugin'), { recursive: true });
    await writeFile(join(root, '.cursor-plugin', 'plugin.json'), '{}\n', 'utf8');
    const beforeCheck = await readTreeBytes(root);
    const after = await checkManifestPlan(root, plan);
    expect(after.ok).toBe(false);
    expect(after.issues.map((issue) => issue.code).sort()).toEqual(['MANIFEST_OUTPUT_DRIFT', 'MANIFEST_OUTPUT_STALE']);
    expect(await readFile(join(root, 'plugin.json'), 'utf8')).toBe('{"changed":true}\n');
    expect(await readTreeBytes(root)).toEqual(beforeCheck);
  });

  test('output paths reject traversal or absolute paths', async () => {
    const root = await makeProject(['claude']);
    for (const path of ['../escape.json', 'C:\\escape.json', '\\\\server\\share\\manifest.json']) {
      await expect(writeManifestPlan(root, { targets: ['portable'], files: new Map([[path, '{}\n']]) }))
        .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_UNSAFE' });
    }
  });

  test('--check CLI emits a structured failure and leaves missing outputs absent', async () => {
    const root = await makeProject(['portable']);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runManifestCli(['--check', '--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    expect(record(parseJson(stderr[0] ?? '').error)).toEqual({
      code: 'MANIFEST_CHECK_FAILED',
      message: 'Manifest outputs are missing, stale, or drifted.',
      details: ['MANIFEST_OUTPUT_MISSING: plugin.json'],
    });
    expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
  });

  test('script entrypoint dispatches --help and sets its process exit code', async () => {
    const scriptPath = fileURLToPath(new URL('../scripts/build-manifests.ts', import.meta.url));
    const originalExitCode = process.exitCode;
    const output: string[] = [];
    const errors: string[] = [];
    const stdoutSpy = spyOn(process.stdout, 'write');
    stdoutSpy.mockImplementation(((chunk: string | Uint8Array) => {
      output.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    }) as typeof process.stdout.write);
    const stderrSpy = spyOn(process.stderr, 'write');
    stderrSpy.mockImplementation(((chunk: string | Uint8Array) => {
      errors.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    }) as typeof process.stderr.write);
    try {
      startManifestCli(scriptPath, ['--help']);
      await new Promise((resolveTick) => setTimeout(resolveTick, 0));
      expect(output.join('')).toContain('Usage: bun packages/powers/scripts/build-manifests.ts');
      expect(process.exitCode).toBe(0);
      const errorExitCode = await runManifestCli(['--unknown']);
      expect(parseJson(errors.join('')).error).toBeDefined();
      expect(errorExitCode).toBe(2);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
      process.exitCode = originalExitCode;
    }
  });

  test('Cursor-only metadata does not require Codex or privacy listing fields', async () => {
    const root = await makeProject(['cursor']);
    const inputPath = join(root, 'config', 'plugin-manifest-inputs.json');
    const input = parseJson(await readFile(inputPath, 'utf8'));
    const metadata = record(input.metadata);
    delete metadata.category;
    delete metadata.privacyPolicyUrl;
    delete metadata.termsOfServiceUrl;
    await writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`, 'utf8');
    const plan = await buildManifestPlan(root);
    expect([...plan.files.keys()]).toEqual(['.cursor-plugin/marketplace.json', '.cursor-plugin/plugin.json']);
  });

  test('a symlink escape blocks all writes before the first output', async () => {
    const root = await makeProject(['codex']);
    const outside = await makeTemporaryRoot('vp-manifest-outside-');
    await symlink(outside, join(root, '.agents'), 'junction');
    const plan = await buildManifestPlan(root);
    await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_UNSAFE' });
    expect(await readdir(outside)).toEqual([]);
    expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
  });

  test('portable generation does not require owner, license, or public listing URLs', async () => {
    const root = await makeProject(['portable']);
    const inputs = await readInputs(root);
    const metadata = record(inputs.metadata);
    delete metadata.contact;
    delete metadata.license;
    delete metadata.privacyPolicyUrl;
    delete metadata.termsOfServiceUrl;
    delete metadata.category;
    await writeInputs(root, inputs);

    const plan = await buildManifestPlan(root);
    const portable = parseJson(contentText(plan.files.get('plugin.json')));
    expect(Object.keys(portable).sort()).toEqual(['$schema', 'description', 'name', 'version']);
    expect(plan.files.size).toBe(1);
  });

  test('host manifests use selected-host skill shapes and accept optional public metadata', async () => {
    const hosts = [
      { target: 'codex', pluginPath: '.codex-plugin/plugin.json', marketplacePath: '.agents/plugins/marketplace.json' },
      { target: 'claude', pluginPath: '.claude-plugin/plugin.json', marketplacePath: '.claude-plugin/marketplace.json' },
      { target: 'cursor', pluginPath: '.cursor-plugin/plugin.json', marketplacePath: '.cursor-plugin/marketplace.json' },
    ] as const;
    for (const host of hosts) {
      const root = await makeProject([host.target]);
      const inputs = await readInputs(root);
      const metadata = record(inputs.metadata);
      const contact = record(metadata.contact);
      delete contact.email;
      delete metadata.license;
      delete metadata.privacyPolicyUrl;
      delete metadata.termsOfServiceUrl;
      if (host.target !== 'codex') delete metadata.category;
      await writeInputs(root, inputs);

      const plan = await buildManifestPlan(root);
      const plugin = parseJson(contentText(plan.files.get(host.pluginPath)));
      expect(plugin.skills).toEqual(host.target === 'codex' ? './skills/' : skillDirectories);
      expect(Object.hasOwn(plugin, 'catalog')).toBe(false);
      expect(Object.hasOwn(plugin, 'license')).toBe(false);
      expect(Object.hasOwn(plugin, 'privacyPolicyUrl')).toBe(false);
      expect(Object.hasOwn(plugin, 'termsOfServiceUrl')).toBe(false);
      const marketplace = parseJson(contentText(plan.files.get(host.marketplacePath)));
      const marketplacePlugins = marketplace.plugins;
      const entry = record(Array.isArray(marketplacePlugins) ? marketplacePlugins[0] : undefined);
      expect(Object.hasOwn(entry, 'license')).toBe(false);
      if (host.target === 'codex') {
        expect(entry.category).toBe('Fixture Category');
        expect(entry.source).toEqual({ source: 'local', path: './' });
      } else {
        expect(record(marketplace.owner)).toEqual({ name: 'Fixture Maintainer' });
      }
      if (host.target === 'codex') expect(record(plugin.author)).toEqual({ name: 'Fixture Maintainer' });
    }
  });

  test('Codex compatibility skills field matches the published scaffold shape', async () => {
    const root = await makeProject(['codex']);
    const plan = await buildManifestPlan(root);
    const codex = parseJson(contentText(plan.files.get('.codex-plugin/plugin.json')));
    expect(codex.skills).toBe('./skills/');
  });

  test('Claude marketplace exposes package description at the top level', async () => {
    const root = await makeProject(['claude']);
    const packageDescription = parseJson(await readFile(join(root, 'package.json'), 'utf8')).description;
    const plan = await buildManifestPlan(root);
    const marketplace = parseJson(contentText(plan.files.get('.claude-plugin/marketplace.json')));
    expect(marketplace.description).toBe(packageDescription);
  });

  test('missing native skill resources block writes and CLI check without filesystem effects', async () => {
    const writeRoot = await makeProject(['claude']);
    const writePlan = await buildManifestPlan(writeRoot);
    await rm(join(writeRoot, 'skills', 'vp-setup', 'SKILL.md'));
    const writeBefore = await readTreeBytes(writeRoot);
    await expect(writeManifestPlan(writeRoot, writePlan)).rejects.toMatchObject({ code: 'MANIFEST_SKILL_RESOURCE_INVALID' });
    expect(await readTreeBytes(writeRoot)).toEqual(writeBefore);

    const checkRoot = await makeProject(['codex']);
    await rm(join(checkRoot, 'skills', 'vp-mode', 'SKILL.md'));
    const checkBefore = await readTreeBytes(checkRoot);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runManifestCli(['--check', '--root', checkRoot], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    expect(record(parseJson(stderr[0] ?? '').error).code).toBe('MANIFEST_SKILL_RESOURCE_INVALID');
    expect(await readTreeBytes(checkRoot)).toEqual(checkBefore);
  });

  test('native skill resource symlink escape blocks check before any writes', async () => {
    const root = await makeProject(['cursor']);
    const outside = await makeTemporaryRoot('vp-manifest-skill-outside-');
    await writeFile(join(outside, 'SKILL.md'), 'outside fixture\n', 'utf8');
    await rm(join(root, 'skills', 'vp-mode'), { recursive: true });
    await symlink(outside, join(root, 'skills', 'vp-mode'), 'junction');
    const before = await readTreeBytes(root);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runManifestCli(['--check', '--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    expect(record(parseJson(stderr[0] ?? '').error).code).toBe('MANIFEST_SKILL_RESOURCE_INVALID');
    expect(await readTreeBytes(root)).toEqual(before);
    expect(await readdir(outside)).toEqual(['SKILL.md']);
  });

  test('owned outputs regenerate for changed inputs and a repeat build is a no-op', async () => {
    const root = await makeProject(['portable']);
    const first = await buildManifestPlan(root);
    expect(await writeManifestPlan(root, first)).toEqual(['plugin.json']);

    const packagePath = join(root, 'package.json');
    const packageMetadata = parseJson(await readFile(packagePath, 'utf8'));
    packageMetadata.description = 'Updated fixture description';
    await writeFile(packagePath, `${JSON.stringify(packageMetadata, null, 2)}\n`, 'utf8');
    const updated = await buildManifestPlan(root);
    expect(await writeManifestPlan(root, updated)).toEqual(['plugin.json']);
    expect(parseJson(await readFile(join(root, 'plugin.json'), 'utf8')).description).toBe('Updated fixture description');
    expect(await writeManifestPlan(root, updated)).toEqual([]);

    const ledger = parseJson(await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8'));
    expect(Object.keys(record(ledger.files))).toEqual(['plugin.json']);
  });

  test('stale outputs are pruned only when the ownership ledger proves them unchanged', async () => {
    const root = await makeProject(['codex']);
    await writeManifestPlan(root, await buildManifestPlan(root));
    expect(await lstat(join(root, '.codex-plugin', 'plugin.json'))).toBeDefined();

    const inputs = await readInputs(root);
    inputs.targets = ['portable'];
    await writeInputs(root, inputs);
    const portablePlan = await buildManifestPlan(root);
    await writeManifestPlan(root, portablePlan);
    expect(await lstat(join(root, '.codex-plugin', 'plugin.json')).catch(() => undefined)).toBeUndefined();
    expect(await lstat(join(root, '.agents', 'plugins', 'marketplace.json')).catch(() => undefined)).toBeUndefined();
    expect(Object.keys(record(parseJson(await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8')).files))).toEqual(['plugin.json']);

    const foreignRoot = await makeProject(['portable']);
    const foreignPath = join(foreignRoot, '.codex-plugin', 'plugin.json');
    await mkdir(dirname(foreignPath), { recursive: true });
    await writeFile(foreignPath, '{"foreign":true}\n', 'utf8');
    await expect(writeManifestPlan(foreignRoot, await buildManifestPlan(foreignRoot)))
      .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_CONFLICT' });
    expect(await readFile(foreignPath, 'utf8')).toBe('{"foreign":true}\n');
    expect(await lstat(join(foreignRoot, 'plugin.json')).catch(() => undefined)).toBeUndefined();

    const expectedForeignRoot = await makeProject(['portable']);
    const expectedForeign = join(expectedForeignRoot, 'plugin.json');
    await writeFile(expectedForeign, '{"foreign":true}\n', 'utf8');
    await expect(writeManifestPlan(expectedForeignRoot, await buildManifestPlan(expectedForeignRoot)))
      .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_CONFLICT' });
    expect(await readFile(expectedForeign, 'utf8')).toBe('{"foreign":true}\n');
    expect(await lstat(join(expectedForeignRoot, ...ownershipLedgerPath.split('/'))).catch(() => undefined)).toBeUndefined();
  });

  test('a manually changed owned output conflicts before any other output changes', async () => {
    const root = await makeProject(['codex']);
    await writeManifestPlan(root, await buildManifestPlan(root));
    const changedPath = join(root, 'plugin.json');
    await writeFile(changedPath, '{"manual":true}\n', 'utf8');
    const before = await readOutputSet(root);
    const inputs = await readInputs(root);
    const metadata = parseJson(await readFile(join(root, 'package.json'), 'utf8'));
    metadata.description = 'Changed while one generated file is foreign';
    await writeFile(join(root, 'package.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

    await expect(writeManifestPlan(root, await buildManifestPlan(root)))
      .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_CONFLICT' });
    expect(await readOutputSet(root)).toEqual(before);
    expect(await readInputs(root)).toEqual(inputs);
  });

  test('malformed caller plan is rejected before the filesystem is touched', async () => {
    const root = await makeProject(['portable']);
    const plan = await buildManifestPlan(root);
    const malformed = { targets: plan.targets, files: new Map(plan.files).set('plugin.json', '{"invalid":true}\n') };
    const malformedShape = {} as typeof plan;
    const malformedContent = { targets: plan.targets, files: new Map([['plugin.json', { invalid: true }]]) } as unknown as typeof plan;
    const wrongTargets = { ...plan, targets: [] } as unknown as typeof plan;
    await expect(writeManifestPlan(root, malformed)).rejects.toMatchObject({ code: 'MANIFEST_PLAN_INVALID' });
    await expect(writeManifestPlan(root, malformedShape)).rejects.toMatchObject({ code: 'MANIFEST_PLAN_INVALID' });
    await expect(writeManifestPlan(root, malformedContent)).rejects.toMatchObject({ code: 'MANIFEST_PLAN_INVALID' });
    await expect(writeManifestPlan(root, wrongTargets)).rejects.toMatchObject({ code: 'MANIFEST_PLAN_INVALID' });
    expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
    expect(await lstat(join(root, '.tmp')).catch(() => undefined)).toBeUndefined();
  });

  test('unknown ownership ledger shape or paths fail before generated files are written', async () => {
    const badLedgers = [
      { schema: 'VPManifestOwnership/v1', files: {}, unexpected: true },
      { schema: 'VPManifestOwnership/v1', files: { '../outside.json': '0'.repeat(64) } },
      { schema: 'VPManifestOwnership/v1', files: { 'plugin.json': 'not-a-sha256' } },
    ];
    for (const badLedger of badLedgers) {
      const root = await makeProject(['portable']);
      const ledgerPath = join(root, ...ownershipLedgerPath.split('/'));
      await mkdir(dirname(ledgerPath), { recursive: true });
      const rawLedger = `${JSON.stringify(badLedger, null, 2)}\n`;
      await writeFile(ledgerPath, rawLedger, 'utf8');
      await expect(writeManifestPlan(root, await buildManifestPlan(root)))
        .rejects.toMatchObject({ code: 'MANIFEST_OWNERSHIP_INVALID' });
      expect(await readFile(ledgerPath, 'utf8')).toBe(rawLedger);
      expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
      expect(await lstat(join(root, transactionPath)).catch(() => undefined)).toBeUndefined();
    }
  });

  test('--check rejects malformed or forged ownership and retained transactions without writes', async () => {
    const ledgers = [
      '{\n',
      '{"schema":"VPManifestOwnership/v1","files":{},"unexpected":true}\n',
      `${JSON.stringify({ schema: 'VPManifestOwnership/v1', files: { '../outside.json': '0'.repeat(64) } }, null, 2)}\n`,
    ];
    for (const rawLedger of ledgers) {
      const root = await makeProject(['portable']);
      const ledgerPath = join(root, ...ownershipLedgerPath.split('/'));
      await mkdir(dirname(ledgerPath), { recursive: true });
      await writeFile(ledgerPath, rawLedger, 'utf8');
      const before = await readTreeBytes(root);
      const stdout: string[] = [];
      const stderr: string[] = [];
      const exitCode = await runManifestCli(['--check', '--root', root], {
        stdout: (text) => { stdout.push(text); },
        stderr: (text) => { stderr.push(text); },
      });
      expect(exitCode).toBe(1);
      expect(stdout).toEqual([]);
      expect(record(parseJson(stderr[0] ?? '').error).code).toBe('MANIFEST_OWNERSHIP_INVALID');
      expect(await readTreeBytes(root)).toEqual(before);
    }

    const root = await makeProject(['portable']);
    const transactionRoot = join(root, ...transactionPath.split('/'));
    await mkdir(transactionRoot, { recursive: true });
    await writeFile(join(transactionRoot, 'journal.json'), '{"state":"interrupted"}\n', 'utf8');
    const before = await readTreeBytes(root);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runManifestCli(['--check', '--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    expect(record(parseJson(stderr[0] ?? '').error).code).toBe('MANIFEST_OUTPUT_RECOVERY_REQUIRED');
    expect(await readTreeBytes(root)).toEqual(before);
  });

  test('--check rejects matching outputs whose valid-shaped ownership digest is wrong without writes', async () => {
    const root = await makeProject(['portable']);
    const plan = await buildManifestPlan(root);
    await writeManifestPlan(root, plan);
    const ledgerPath = join(root, ...ownershipLedgerPath.split('/'));
    const ledger = parseJson(await readFile(ledgerPath, 'utf8'));
    const files = record(ledger.files);
    files['plugin.json'] = 'f'.repeat(64);
    await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
    await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_CONFLICT' });

    const before = await readTreeBytes(root);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runManifestCli(['--check', '--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    const error = record(parseJson(stderr[0] ?? '').error);
    expect(error.code).toBe('MANIFEST_CHECK_FAILED');
    expect(error.details).toEqual(['MANIFEST_OUTPUT_CONFLICT: plugin.json']);
    expect(await readTreeBytes(root)).toEqual(before);
  });

  test('--check rejects matching outputs without an ownership ledger without writes', async () => {
    const root = await makeProject(['portable']);
    const plan = await buildManifestPlan(root);
    await writeManifestPlan(root, plan);
    await rm(join(root, ...ownershipLedgerPath.split('/')));
    await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_CONFLICT' });

    const before = await readTreeBytes(root);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await runManifestCli(['--check', '--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(exitCode).toBe(1);
    expect(stdout).toEqual([]);
    const error = record(parseJson(stderr[0] ?? '').error);
    expect(error.code).toBe('MANIFEST_CHECK_FAILED');
    expect(error.details).toEqual(['MANIFEST_OUTPUT_CONFLICT: plugin.json']);
    expect(await readTreeBytes(root)).toEqual(before);
  });

  test('a retained transaction fences writes until an operator reconciles it', async () => {
    const root = await makeProject(['portable']);
    const transactionRoot = join(root, ...transactionPath.split('/'));
    await mkdir(transactionRoot, { recursive: true });
    await writeFile(join(transactionRoot, 'journal.json'), '{"state":"interrupted"}\n', 'utf8');
    await expect(writeManifestPlan(root, await buildManifestPlan(root)))
      .rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_RECOVERY_REQUIRED' });
    expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
    expect(await readFile(join(transactionRoot, 'journal.json'), 'utf8')).toBe('{"state":"interrupted"}\n');
  });

  test('successful build CLI emits JSON and --check stays read-only', async () => {
    const root = await makeProject(['portable']);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = await runManifestCli(['--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(result).toBe(0);
    expect(stderr).toEqual([]);
    expect(parseJson(stdout[0] ?? '')).toMatchObject({ ok: true, mode: 'build', written: ['plugin.json'] });

    const before = await readOutputSet(root);
    const ownershipBefore = await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8');
    await writeFile(join(root, 'plugin.json'), '{"manual":true}\n', 'utf8');
    const drifted = await readFile(join(root, 'plugin.json'), 'utf8');
    const checkOutput: string[] = [];
    const checkError: string[] = [];
    const checkResult = await runManifestCli(['--check', '--root', root], {
      stdout: (text) => { checkOutput.push(text); },
      stderr: (text) => { checkError.push(text); },
    });
    expect(checkResult).toBe(1);
    expect(checkOutput).toEqual([]);
    expect(parseJson(checkError[0] ?? '').error).toBeDefined();
    expect(await readFile(join(root, 'plugin.json'), 'utf8')).toBe(drifted);
    expect(await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8')).toBe(ownershipBefore);
    expect(before.get('plugin.json')).not.toBe(drifted);
    expect(await lstat(join(root, transactionPath)).catch(() => undefined)).toBeUndefined();
  });

  test.skipIf(process.platform !== 'win32')('observed second-output write failure restores earlier outputs', async () => {
    const root = await makeProject();
    await writeManifestPlan(root, await buildManifestPlan(root));
    const before = await readOutputSet(root);
    const ownershipBefore = await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8');
    const packagePath = join(root, 'package.json');
    const packageMetadata = parseJson(await readFile(packagePath, 'utf8'));
    packageMetadata.description = 'Force a second output replacement';
    await writeFile(packagePath, `${JSON.stringify(packageMetadata, null, 2)}\n`, 'utf8');
    const plan = await buildManifestPlan(root);
    const protectedPath = join(root, '.claude-plugin', 'marketplace.json');
    execFileSync('attrib', ['+R', protectedPath]);
    try {
      await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_WRITE_FAILED' });
    } finally {
      execFileSync('attrib', ['-R', protectedPath]);
    }
    expect(await readOutputSet(root)).toEqual(before);
    expect(await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8')).toBe(ownershipBefore);
    expect(await lstat(join(root, transactionPath)).catch(() => undefined)).toBeUndefined();
  });

  test('native package variants copy one immutable payload into separate roots', async () => {
    const root = await makeNativeProject(['muse-package', 'antigravity']);
    const sourceBefore = await readSourceTreeBytes(root);
    const plan = await buildManifestPlan(root);
    const musePluginRoot = `${formationRelativeRoot}/muse/plugins/vida-powers`;
    const antigravityRoot = `${formationRelativeRoot}/antigravity`;
    const museManifestPath = `${musePluginRoot}/.muse-plugin/plugin.json`;
    const antigravityManifestPath = `${antigravityRoot}/plugin.json`;
    const receiptPath = `${formationRelativeRoot}/receipts/source-payload.v1.json`;
    const musePlugin = parseJson(contentText(plan.files.get(museManifestPath)));
    const antigravity = parseJson(contentText(plan.files.get(antigravityManifestPath)));

    expect(plan.targets).toEqual(['antigravity', 'muse-package']);
    expect(targetStatus('muse-package')).toBe('format-mapped');
    expect(targetStatus('antigravity')).toBe('format-mapped');
    expect(targetStatus('muse-catalog')).toBe('deferred');
    expect(musePlugin).toEqual({
      schemaVersion: 1,
      name: 'fixture-plugin',
      version: '0.0.0-fixture',
      description: 'Synthetic manifest fixture; never production metadata.',
      compat: { manifestDir: '.muse-plugin' },
      capabilities: {
        skills: [
          { id: 'vp-mode', path: 'skills/vp-mode/SKILL.md' },
          { id: 'vp-setup', path: 'skills/vp-setup/SKILL.md' },
        ],
      },
    });
    expect(Object.keys(musePlugin).sort()).toEqual(['capabilities', 'compat', 'description', 'name', 'schemaVersion', 'version']);
    expect(antigravity).toEqual({ name: 'fixture-plugin', description: 'Synthetic manifest fixture; never production metadata.' });
    expect(Object.keys(antigravity).sort()).toEqual(['description', 'name']);
    expect(plan.files.has(`${formationRelativeRoot}/muse/marketplace.json`)).toBe(false);
    expect(plan.files.has(`${formationRelativeRoot}/muse/plugin.json`)).toBe(false);
    expect(plan.files.has('plugin.json')).toBe(false);

    const receipt = parseJson(contentText(plan.files.get(receiptPath)));
    expect(receipt.schema).toBe('VPFormationPayload/v1');
    expect(receipt.algorithm).toBe('sha256-v1-framed');
    expect(receipt.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
    const receiptFiles = receipt.files;
    expect(Array.isArray(receiptFiles)).toBe(true);
    const records = (receiptFiles as unknown[]).map((value) => record(value));
    const relativePaths = records.map((file) => String(file.path));
    expect(relativePaths).toEqual([...relativePaths].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))));
    for (const required of [
      'package.json',
      'catalog.json',
      'config/plugin-manifest-inputs.json',
      'config/runtime.json',
      'config/vppluginmanifest.v1.schema.json',
      'instructions/runtime.md',
      'scripts/runtime.ts',
      'skills/vp-mode/SKILL.md',
      'skills/vp-setup/SKILL.md',
      'assets/raw.bin',
    ]) expect(relativePaths).toContain(required);
    for (const excluded of ['.git/', '.hg/', '.svn/', 'node_modules/', 'coverage/', '.tmp/']) {
      expect(relativePaths.some((path) => path.startsWith(excluded))).toBe(false);
    }

    const fingerprint = createHash('sha256').update(Buffer.from('VPFormationPayload/v1\0'));
    for (const file of records) {
      const relativePath = String(file.path);
      const bytes = contentBytes(plan.files.get(`${antigravityRoot}/${relativePath}`));
      const pathBytes = Buffer.from(relativePath, 'utf8');
      const pathLength = Buffer.alloc(4);
      pathLength.writeUInt32BE(pathBytes.length);
      const contentLength = Buffer.alloc(8);
      contentLength.writeBigUInt64BE(BigInt(bytes.length));
      expect(file.bytes).toBe(bytes.length);
      expect(file.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      fingerprint.update(pathLength).update(pathBytes).update(contentLength).update(bytes);
      expect(contentBytes(plan.files.get(`${musePluginRoot}/${relativePath}`))).toEqual(bytes);
    }
    expect(receipt.fingerprint).toBe(`sha256:${fingerprint.digest('hex')}`);
    expect(contentBytes(plan.files.get(`${antigravityRoot}/assets/raw.bin`))).toEqual(Buffer.from([0x00, 0x0d, 0x0a, 0xff]));

    const musePayloadPaths = [...plan.files.keys()]
      .filter((path) => path.startsWith(`${musePluginRoot}/`) && path !== museManifestPath)
      .map((path) => path.slice(musePluginRoot.length + 1)).sort();
    const antigravityPayloadPaths = [...plan.files.keys()]
      .filter((path) => path.startsWith(`${antigravityRoot}/`) && path !== antigravityManifestPath)
      .map((path) => path.slice(antigravityRoot.length + 1)).sort();
    expect(musePayloadPaths).toEqual(antigravityPayloadPaths);

    const stdout: string[] = [];
    const stderr: string[] = [];
    const buildExit = await runManifestCli(['--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(buildExit).toBe(0);
    expect(stderr).toEqual([]);
    expect(parseJson(stdout[0] ?? '')).toMatchObject({
      ok: true,
      mode: 'build',
      museCatalog: { status: 'blocked', code: 'MANIFEST_MUSE_CATALOG_NOT_READY' },
    });
    expect(await readSourceTreeBytes(root)).toEqual(sourceBefore);
    const checkedTree = await readTreeBytes(root);
    expect(await checkManifestPlan(root, plan)).toEqual({ ok: true, issues: [] });
    expect(await readTreeBytes(root)).toEqual(checkedTree);
    expect(await writeManifestPlan(root, plan)).toEqual([]);
    expect(await readTreeBytes(root)).toEqual(checkedTree);
  });

  test('native payload retains the current package runtime inventory', async () => {
    const payload = await planFormationPayload(packageRoot, [
      'plugin.json',
      '.codex-plugin/plugin.json',
      '.agents/plugins/marketplace.json',
      '.claude-plugin/plugin.json',
      '.claude-plugin/marketplace.json',
      '.cursor-plugin/plugin.json',
      '.cursor-plugin/marketplace.json',
      '.muse-plugin/plugin.json',
      'marketplace.json',
    ]);
    const paths = new Set(payload.files.keys());

    for (const required of [
      'package.json',
      'bun.lock',
      'catalog.json',
      'config/vppluginmanifest.v1.schema.json',
      'config/vpeffectiveprofile.v1.schema.json',
      'instructions',
      'scripts/build-manifests.ts',
      'scripts/formation-payload.ts',
      'skills/vp-mode/SKILL.md',
      'skills/vp-setup/SKILL.md',
      'tests/build-manifests.test.ts',
    ]) {
      if (required === 'instructions') {
        expect([...paths].some((path) => path.startsWith('instructions/'))).toBe(true);
      } else {
        expect(paths.has(required)).toBe(true);
      }
    }
    for (const excluded of ['.git/', '.hg/', '.svn/', 'node_modules/', 'coverage/', '.tmp/']) {
      expect([...paths].some((path) => path.startsWith(excluded))).toBe(false);
    }
    expect(contentBytes(payload.files.get('catalog.json'))).toEqual(await readFile(join(packageRoot, 'catalog.json')));
    expect(contentBytes(payload.files.get('scripts/build-manifests.ts')))
      .toEqual(await readFile(join(packageRoot, 'scripts', 'build-manifests.ts')));
  });

  test('Muse package-only target succeeds and keeps its catalog explicitly blocked', async () => {
    const root = await makeNativeProject(['muse-package']);
    const plan = await buildManifestPlan(root);
    const musePrefix = `${formationRelativeRoot}/muse/plugins/vida-powers/`;
    expect([...plan.files.keys()].every((path) => path.startsWith(musePrefix) || path === `${formationRelativeRoot}/receipts/source-payload.v1.json`)).toBe(true);
    expect([...plan.files.keys()].some((path) => path.startsWith(`${formationRelativeRoot}/antigravity/`))).toBe(false);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = await runManifestCli(['--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(result).toBe(0);
    expect(stderr).toEqual([]);
    expect(parseJson(stdout[0] ?? '')).toMatchObject({ museCatalog: { status: 'blocked', code: 'MANIFEST_MUSE_CATALOG_NOT_READY' } });
    expect(await lstat(join(root, ...`${formationRelativeRoot}/muse/marketplace.json`.split('/'))).catch(() => undefined)).toBeUndefined();
  });

  test('native payload planning rejects source-tree symlinks before any output', async () => {
    const root = await makeNativeProject(['muse-package', 'antigravity']);
    const outside = await makeTemporaryRoot('manifest-source-outside-');
    await writeFile(join(outside, 'runtime.md'), 'outside\n', 'utf8');
    await symlink(outside, join(root, 'instructions', 'outside'), 'junction');
    const before = await readTreeBytes(root);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const result = await runManifestCli(['--root', root], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(result).toBe(1);
    expect(stdout).toEqual([]);
    expect(record(parseJson(stderr[0] ?? '').error).code).toBe('MANIFEST_INPUT_UNSAFE');
    expect(await readTreeBytes(root)).toEqual(before);
  });

  test('native payload planner rejects missing, non-directory, and linked roots', async () => {
    const missingRoot = join(testScratchRoot, 'missing-native-payload-root');
    await expect(planFormationPayload(missingRoot, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_READ_FAILED' });

    const fileParent = await makeTemporaryRoot('manifest-payload-file-root-');
    const fileRoot = join(fileParent, 'package.json');
    await writeFile(fileRoot, '{}\n', 'utf8');
    await expect(planFormationPayload(fileRoot, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_UNSAFE' });

    const linkedParent = await makeTemporaryRoot('manifest-payload-link-parent-');
    const linkedTarget = await makeTemporaryRoot('manifest-payload-link-target-');
    const linkedRoot = join(linkedParent, 'linked-package');
    await symlink(linkedTarget, linkedRoot, 'junction');
    await expect(planFormationPayload(linkedRoot, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_UNSAFE' });
  });

  test('native payload planner maps directory, stat, and file read errors', async () => {
    const directoryRoot = await makeProject(['portable']);
    const sourceDirectory = join(directoryRoot, 'instructions');
    await mkdir(sourceDirectory, { recursive: true });
    await writeFile(join(sourceDirectory, 'runtime.md'), 'fixture\n', 'utf8');
    const originalReaddir = fsPromises.readdir;
    const readdirSpy = spyOn(fsPromises, 'readdir').mockImplementation(forwardNative(originalReaddir, async (args, forward) => {
      if (String(args[0]) === sourceDirectory) throw Object.assign(new Error('injected directory read error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(planFormationPayload(directoryRoot, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_READ_FAILED' });
    } finally {
      readdirSpy.mockRestore();
    }

    const statRoot = await makeProject(['portable']);
    const statPath = join(statRoot, 'instructions', 'runtime.md');
    await mkdir(dirname(statPath), { recursive: true });
    await writeFile(statPath, 'fixture\n', 'utf8');
    const originalLstat = fsPromises.lstat;
    const lstatSpy = spyOn(fsPromises, 'lstat').mockImplementation(forwardNative(originalLstat, async (args, forward) => {
      if (String(args[0]) === statPath) throw Object.assign(new Error('injected source stat error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(planFormationPayload(statRoot, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_READ_FAILED' });
    } finally {
      lstatSpy.mockRestore();
    }

    const resolveRoot = await makeProject(['portable']);
    const resolvePath = join(resolveRoot, 'instructions');
    await mkdir(resolvePath, { recursive: true });
    const originalRealpath = fsPromises.realpath;
    const realpathSpy = spyOn(fsPromises, 'realpath').mockImplementation(forwardNative(originalRealpath, async (args, forward) => {
      if (String(args[0]) === resolvePath) throw Object.assign(new Error('injected directory resolve error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(planFormationPayload(resolveRoot, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_READ_FAILED' });
    } finally {
      realpathSpy.mockRestore();
    }

    const readRoot = await makeProject(['portable']);
    const readPath = join(readRoot, 'instructions', 'runtime.md');
    await mkdir(dirname(readPath), { recursive: true });
    await writeFile(readPath, 'fixture\n', 'utf8');
    const originalReadFile = fsPromises.readFile;
    const readFileSpy = spyOn(fsPromises, 'readFile').mockImplementation(forwardNative(originalReadFile, async (args, forward) => {
      if (String(args[0]) === readPath) throw Object.assign(new Error('injected source file read error'), { code: 'EIO' });
      return forward();
    }));
    try {
      await expect(planFormationPayload(readRoot, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_READ_FAILED' });
    } finally {
      readFileSpy.mockRestore();
    }
  });

  test('native payload planner rejects a source file changed during its read', async () => {
    const root = await makeNativeProject(['muse-package']);
    const sourcePath = join(root, 'assets', 'raw.bin');
    const originalBytes = await readFile(sourcePath);
    let changed = false;
    const originalReadFile = fsPromises.readFile;
    const readFileSpy = spyOn(fsPromises, 'readFile').mockImplementation(forwardNative(originalReadFile, async (args, forward) => {
      if (String(args[0]) === sourcePath && !changed) {
        changed = true;
        await writeFile(sourcePath, Buffer.from([0x01]));
      }
      return forward();
    }));
    try {
      await expect(planFormationPayload(root, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_UNSAFE' });
    } finally {
      readFileSpy.mockRestore();
      await writeFile(sourcePath, originalBytes);
    }
    expect(changed).toBe(true);
    expect(await readFile(sourcePath)).toEqual(originalBytes);
  });

  test('native payload planner rejects distinct source names with the same normalized identity', async () => {
    const root = await makeNativeProject(['muse-package']);
    const assetsRoot = join(root, 'assets');
    const composed = 'caf\u00e9.txt';
    const decomposed = 'cafe\u0301.txt';
    await writeFile(join(assetsRoot, composed), 'composed\n', 'utf8');
    await writeFile(join(assetsRoot, decomposed), 'decomposed\n', 'utf8');
    const entries = await readdir(assetsRoot);
    expect(entries).toContain(composed);
    expect(entries).toContain(decomposed);
    await expect(planFormationPayload(root, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_UNSAFE' });
  });

  test('owned legacy manifest markers stay out of native payloads and are pruned by the same ledger', async () => {
    const root = await makeNativeProject(['portable']);
    await writeManifestPlan(root, await buildManifestPlan(root));
    const inputs = await readInputs(root);
    inputs.targets = ['muse-package', 'antigravity'];
    await writeInputs(root, inputs);
    const plan = await buildManifestPlan(root);
    const musePrefix = `${formationRelativeRoot}/muse/plugins/vida-powers/`;
    const receipt = parseJson(contentText(plan.files.get(`${formationRelativeRoot}/receipts/source-payload.v1.json`)));
    const relativePaths = (receipt.files as unknown[]).map((value) => String(record(value).path));
    expect(relativePaths).not.toContain('plugin.json');
    expect(relativePaths).not.toContain('.muse-plugin/plugin.json');
    expect([...plan.files.keys()].some((path) => path === `${musePrefix}plugin.json`)).toBe(false);
    await writeManifestPlan(root, plan);
    expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
    expect(await lstat(join(root, ...`${formationRelativeRoot}/antigravity/plugin.json`.split('/')))).toBeDefined();
  });

  test.skipIf(process.platform === 'win32')('case-folded source paths are rejected on case-sensitive filesystems', async () => {
    const root = await makeNativeProject(['muse-package']);
    await writeFile(join(root, 'assets', 'duplicate.txt'), 'upper\n', 'utf8');
    await writeFile(join(root, 'assets', 'Duplicate.txt'), 'lower\n', 'utf8');
    await expect(buildManifestPlan(root)).rejects.toMatchObject({ code: 'MANIFEST_INPUT_UNSAFE' });
  });

  test('Muse catalog shape fixture stays schema-only and rejects unsupported fields', async () => {
    const schema = await readSchema();
    const musePlugin = {
      schemaVersion: 1,
      name: 'fixture-plugin',
      version: '0.0.0-fixture',
      description: 'Shape only; never used as production metadata.',
      compat: { manifestDir: '.muse-plugin' },
      capabilities: { skills: [
        { id: 'vp-mode', path: 'skills/vp-mode/SKILL.md' },
        { id: 'vp-setup', path: 'skills/vp-setup/SKILL.md' },
      ] },
    };
    const antigravity = { name: 'fixture-plugin', description: 'Shape only.' };
    const catalogShapeOnly = {
      schemaVersion: 1,
      source: 'local',
      plugins: [{
        name: 'fixture-plugin',
        version: '0.0.0-fixture',
        description: 'Shape only; no receipt or approval is asserted.',
        install: { transport: 'local-path', source: 'plugins/vida-powers' },
        integrity: { digest: `sha256:${'0'.repeat(64)}` },
        availability: { status: 'available' },
      }],
    };

    expect(validateOutputShape(schema, 'musePlugin', musePlugin)).toEqual([]);
    expect(validateOutputShape(schema, 'antigravityPlugin', antigravity)).toEqual([]);
    expect(validateOutputShape(schema, 'museMarketplace', catalogShapeOnly)).toEqual([]);
    expect(validateOutputShape(schema, 'musePlugin', { ...musePlugin, unsupported: true }).length).toBeGreaterThan(0);
    expect(validateOutputShape(schema, 'antigravityPlugin', { ...antigravity, version: '0.0.0-fixture' }).length).toBeGreaterThan(0);
    expect(validateOutputShape(schema, 'museMarketplace', {
      ...catalogShapeOnly,
      plugins: [{ ...record((catalogShapeOnly.plugins as unknown[])[0]), integrity: { digest: 'local-fixture-hash' } }],
    }).length).toBeGreaterThan(0);
  });

  test('Muse catalog without first-party digest proof returns NOT_READY with zero writes across targets', async () => {
    const root = await makeNativeProject(['muse-catalog', 'antigravity']);
    const before = await readTreeBytes(root);
    for (const args of [['--root', root], ['--check', '--root', root]]) {
      const stdout: string[] = [];
      const stderr: string[] = [];
      const exitCode = await runManifestCli(args, {
        stdout: (text) => { stdout.push(text); },
        stderr: (text) => { stderr.push(text); },
      });
      expect(exitCode).toBe(1);
      expect(stdout).toEqual([]);
      expect(record(parseJson(stderr[0] ?? '').error)).toMatchObject({ code: 'MANIFEST_MUSE_CATALOG_NOT_READY' });
      expect(await readTreeBytes(root)).toEqual(before);
    }
    expect(await lstat(join(root, ...`${formationRelativeRoot}/antigravity/plugin.json`.split('/'))).catch(() => undefined)).toBeUndefined();
    expect(await lstat(join(root, ...ownershipLedgerPath.split('/'))).catch(() => undefined)).toBeUndefined();
    expect(await lstat(join(root, ...transactionPath.split('/'))).catch(() => undefined)).toBeUndefined();
  });

  test('malformed or unproven digest claims stop every selected target before writes', async () => {
    const cases = [
      { digest: 'sha256:bad', code: 'MANIFEST_MUSE_DIGEST_INVALID' },
      { digest: `sha256:${'0'.repeat(64)}`, code: 'MANIFEST_MUSE_DIGEST_UNPROVEN' },
    ];
    for (const claim of cases) {
      const root = await makeNativeProject(['muse-package', 'antigravity']);
      const inputs = await readInputs(root);
      record(inputs.metadata).digest = claim.digest;
      await writeInputs(root, inputs);
      const before = await readTreeBytes(root);
      const stdout: string[] = [];
      const stderr: string[] = [];
      const exitCode = await runManifestCli(['--root', root], {
        stdout: (text) => { stdout.push(text); },
        stderr: (text) => { stderr.push(text); },
      });
      expect(exitCode).toBe(1);
      expect(stdout).toEqual([]);
      expect(record(parseJson(stderr[0] ?? '').error).code).toBe(claim.code);
      expect(await readTreeBytes(root)).toEqual(before);
    }
  });

  test('actual Bun CLI accepts an absolute fixture root and rejects relative roots from another CWD', async () => {
    const cwd = await makeTemporaryRoot('manifest-cli-cwd-');
    const root = await makeNativeProject(['muse-package', 'antigravity']);
    const relative = invokeManifestCli(['--root', 'relative-root'], cwd);
    expect(relative.exitCode).toBe(2);
    expect(record(parseJson(relative.stderr).error).code).toBe('MANIFEST_ARGUMENT_INVALID');

    const built = invokeManifestCli(['--root', root], cwd);
    expect(built.exitCode).toBe(0);
    expect(built.stderr).toBe('');
    expect(parseJson(built.stdout)).toMatchObject({ ok: true, museCatalog: { status: 'blocked' } });
    const beforeCheck = await readTreeBytes(root);
    const checked = invokeManifestCli(['--check', '--root', root], cwd);
    expect(checked.exitCode).toBe(0);
    expect(checked.stderr).toBe('');
    expect(parseJson(checked.stdout)).toMatchObject({ ok: true, mode: 'check', museCatalog: { status: 'blocked' } });
    expect(await readTreeBytes(root)).toEqual(beforeCheck);

    const defaultRoot = invokeManifestCli(['--check'], cwd);
    expect(defaultRoot.exitCode).toBe(1);
    expect(record(parseJson(defaultRoot.stderr).error).code).toBe('MANIFEST_INPUT_MISSING');
    expect(defaultRoot.stderr).toContain('config/plugin-manifest-inputs.json');
    expect(await lstat(join(packageRoot, ...`${formationRelativeRoot}/muse`.split('/'))).catch(() => undefined)).toBeUndefined();
    expect(await lstat(join(packageRoot, ...ownershipLedgerPath.split('/'))).catch(() => undefined)).toBeUndefined();
  });

  test('CLI reports missing root values and formats check output sink failures', async () => {
    const missingStdout: string[] = [];
    const missingStderr: string[] = [];
    const missingExit = await runManifestCli(['--root'], {
      stdout: (text) => { missingStdout.push(text); },
      stderr: (text) => { missingStderr.push(text); },
    });
    expect(missingExit).toBe(2);
    expect(missingStdout).toEqual([]);
    expect(record(parseJson(missingStderr[0] ?? '').error)).toMatchObject({ code: 'MANIFEST_ARGUMENT_INVALID' });

    const relativeStderr: string[] = [];
    const relativeExit = await runManifestCli(['--root', 'relative-root'], {
      stdout: () => {},
      stderr: (text) => { relativeStderr.push(text); },
    });
    expect(relativeExit).toBe(2);
    expect(record(parseJson(relativeStderr[0] ?? '').error)).toMatchObject({ code: 'MANIFEST_ARGUMENT_INVALID' });

    const root = await makeNativeProject(['muse-package']);
    await writeManifestPlan(root, await buildManifestPlan(root));
    const before = await readTreeBytes(root);
    const stderr: string[] = [];
    const exitCode = await runManifestCli(['--check', '--root', root], {
      stdout: () => { throw new Error('fixture stdout unavailable'); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(exitCode).toBe(1);
    expect(record(parseJson(stderr[0] ?? '').error)).toMatchObject({
      code: 'MANIFEST_BUILD_FAILED',
      details: ['fixture stdout unavailable'],
    });
    expect(await readTreeBytes(root)).toEqual(before);

    const portableRoot = await makeProject(['portable']);
    await writeManifestPlan(portableRoot, await buildManifestPlan(portableRoot));
    const portableBefore = await readTreeBytes(portableRoot);
    const portableStdout: string[] = [];
    const portableExit = await runManifestCli(['--check', '--root', portableRoot], {
      stdout: (text) => { portableStdout.push(text); },
      stderr: () => {},
    });
    expect(portableExit).toBe(0);
    expect(record(parseJson(portableStdout[0] ?? ''))).toMatchObject({ ok: true, mode: 'check' });
    expect(record(parseJson(portableStdout[0] ?? ''))).not.toHaveProperty('museCatalog');
    expect(await readTreeBytes(portableRoot)).toEqual(portableBefore);
  });

  test('foreign and changed files under native output roots block formation before writes', async () => {
    const foreignRoot = await makeNativeProject(['muse-package']);
    const foreignPath = join(foreignRoot, ...`${formationRelativeRoot}/muse/plugins/vida-powers/foreign.txt`.split('/'));
    await mkdir(dirname(foreignPath), { recursive: true });
    await writeFile(foreignPath, 'foreign\n', 'utf8');
    const foreignBefore = await readTreeBytes(foreignRoot);
    await expect(buildManifestPlan(foreignRoot)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_CONFLICT' });
    expect(await readTreeBytes(foreignRoot)).toEqual(foreignBefore);

    const changedRoot = await makeNativeProject(['muse-package']);
    const plan = await buildManifestPlan(changedRoot);
    await writeManifestPlan(changedRoot, plan);
    const changedPath = join(changedRoot, ...`${formationRelativeRoot}/muse/plugins/vida-powers/assets/raw.bin`.split('/'));
    await writeFile(changedPath, Buffer.from([0x01]));
    const changedBefore = await readTreeBytes(changedRoot);
    await expect(buildManifestPlan(changedRoot)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_CONFLICT' });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const checkExit = await runManifestCli(['--check', '--root', changedRoot], {
      stdout: (text) => { stdout.push(text); },
      stderr: (text) => { stderr.push(text); },
    });
    expect(checkExit).toBe(1);
    expect(stdout).toEqual([]);
    expect(record(parseJson(stderr[0] ?? '').error)).toMatchObject({
      code: 'MANIFEST_CHECK_FAILED',
      details: [`MANIFEST_OUTPUT_CONFLICT: ${formationRelativeRoot}/muse/plugins/vida-powers/assets/raw.bin`],
    });
    expect(await readTreeBytes(changedRoot)).toEqual(changedBefore);
  });

  test('read-only check reports native preflight conflicts as structured issues', async () => {
    const root = await makeNativeProject(['muse-package']);
    const plan = await buildManifestPlan(root);
    const conflictPath = `${formationRelativeRoot}/muse/plugins/vida-powers/foreign.txt`;
    const foreignPath = join(root, ...conflictPath.split('/'));
    await mkdir(dirname(foreignPath), { recursive: true });
    await writeFile(foreignPath, 'foreign\n', 'utf8');
    const before = await readTreeBytes(root);

    const check = await checkManifestPlan(root, plan);

    expect(check).toEqual({
      ok: false,
      issues: [{
        code: 'MANIFEST_OUTPUT_CONFLICT',
        path: conflictPath,
        message: `Output is not owned by the manifest ledger: ${conflictPath}.`,
      }],
    });
    expect(await readTreeBytes(root)).toEqual(before);
  });

  test('native payload output symlinks are fenced before any output writes', async () => {
    const root = await makeNativeProject(['antigravity']);
    const outside = await makeTemporaryRoot('manifest-output-outside-');
    await writeFile(join(outside, 'foreign.txt'), 'foreign\n', 'utf8');
    const formationRoot = join(root, ...formationRelativeRoot.split('/'));
    await mkdir(dirname(formationRoot), { recursive: true });
    await symlink(outside, formationRoot, 'junction');
    const before = await readTreeBytes(root);
    await expect(buildManifestPlan(root)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_UNSAFE' });
    expect(await readTreeBytes(root)).toEqual(before);
  });

  test('nested native payload output symlinks are rejected while scanning', async () => {
    const root = await makeNativeProject(['antigravity']);
    const outside = await makeTemporaryRoot('manifest-output-nested-outside-');
    await writeFile(join(outside, 'foreign.txt'), 'foreign\n', 'utf8');
    const nestedRoot = join(root, ...`${formationRelativeRoot}/antigravity`.split('/'));
    await mkdir(nestedRoot, { recursive: true });
    await symlink(outside, join(nestedRoot, 'assets'), 'junction');
    const before = await readTreeBytes(root);
    await expect(buildManifestPlan(root)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_UNSAFE' });
    expect(await readTreeBytes(root)).toEqual(before);
    expect(await readFile(join(outside, 'foreign.txt'), 'utf8')).toBe('foreign\n');
  });

  test('stale native roots prune only unchanged ledger-owned files', async () => {
    const root = await makeNativeProject(['muse-package', 'antigravity']);
    await writeManifestPlan(root, await buildManifestPlan(root));
    const oldMuseFile = join(root, ...`${formationRelativeRoot}/muse/plugins/vida-powers/catalog.json`.split('/'));
    expect(await lstat(oldMuseFile)).toBeDefined();
    await writeInputs(root, { ...(await readInputs(root)), targets: ['antigravity'] });
    await writeManifestPlan(root, await buildManifestPlan(root));
    expect(await lstat(oldMuseFile).catch(() => undefined)).toBeUndefined();
    const ledger = record(parseJson(await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8')).files);
    expect(Object.keys(ledger).some((path) => path.startsWith(`${formationRelativeRoot}/muse/`))).toBe(false);
    expect(await lstat(join(root, ...`${formationRelativeRoot}/antigravity/plugin.json`.split('/')))).toBeDefined();
  });

  test.skipIf(process.platform !== 'win32')('native transaction rollback restores earlier writes after a later payload write fails', async () => {
    const root = await makeNativeProject(['muse-package', 'antigravity']);
    const originalPlan = await buildManifestPlan(root);
    await writeManifestPlan(root, originalPlan);
    const formationRoot = join(root, ...formationRelativeRoot.split('/'));
    const beforeOutputs = await readTreeBytes(formationRoot);
    const beforeLedger = await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8');
    await writeFile(join(root, 'assets', 'raw.bin'), Buffer.from([0x10, 0x0d, 0x0a, 0xfe]));
    const nextPlan = await buildManifestPlan(root);
    const protectedPath = join(root, ...`${formationRelativeRoot}/muse/plugins/vida-powers/assets/raw.bin`.split('/'));
    execFileSync('attrib', ['+R', protectedPath]);
    try {
      await expect(writeManifestPlan(root, nextPlan)).rejects.toMatchObject({ code: 'MANIFEST_OUTPUT_WRITE_FAILED' });
    } finally {
      execFileSync('attrib', ['-R', protectedPath]);
    }
    expect(await readTreeBytes(formationRoot)).toEqual(beforeOutputs);
    expect(await readFile(join(root, ...ownershipLedgerPath.split('/')), 'utf8')).toBe(beforeLedger);
    expect(await lstat(join(root, ...transactionPath.split('/'))).catch(() => undefined)).toBeUndefined();
  });
});
