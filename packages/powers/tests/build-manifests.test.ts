import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
    await expect(writeManifestPlan(root, malformed)).rejects.toMatchObject({ code: 'MANIFEST_PLAN_INVALID' });
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
