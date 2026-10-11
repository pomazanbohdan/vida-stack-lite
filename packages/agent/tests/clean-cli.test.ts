import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');
const generated = ['dist', 'coverage', '.pack-inspect'] as const;

async function withCleanFixture(action: (root: string, script: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), 'vida-clean-owned-'));
  let observed = false;
  try {
    const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const entry = /^bun (tooling\/clean\.(?:mjs|ts))$/u.exec(manifest.scripts['clean:pinned'] ?? '')?.[1];
    if (!entry) throw new Error('Cleaner has no package-owned entry');
    await mkdir(path.join(root, 'tooling'));
    const script = path.join(root, entry);
    await writeFile(script, await readFile(path.join(packageRoot, entry)));
    for (const directory of generated) {
      await mkdir(path.join(root, directory));
      await writeFile(path.join(root, directory, 'sentinel'), directory);
    }
    await writeFile(path.join(root, 'source.ts'), 'export const retained = true;\n');
    await writeFile(path.join(root, 'unrelated.note'), 'retained');
    await action(root, script);
    observed = true;
  } finally {
    if (observed) await rm(root, { recursive: true, force: true });
    else console.error(`Retained failed clean fixture: ${root}`);
  }
}

async function runClean(root: string, script: string, args: string[] = [], fault = false) {
  const preload = path.join(packageRoot, 'tests/helpers/clean-stat-fault-preload.ts');
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.BUN_OPTIONS;
  if (fault) env.VIDA_CLEAN_STAT_FAULT = path.join(root, 'dist');
  const child = Bun.spawn(
    [process.execPath, '--no-env-file', '--no-install', ...(fault ? ['--preload', preload] : []), script, ...args],
    {
      cwd: root,
      env,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
}

test('clean retains the generated target and reports a real lstat I/O failure', async () => {
  await withCleanFixture(async (root, script) => {
    const result = await runClean(root, script, [], true);
    const retained = await readFile(path.join(root, 'dist/sentinel'), 'utf8').catch((error: unknown) => error);
    expect({ ...result, retained }).toMatchObject({ exitCode: 1, retained: 'dist' });
    expect(result.stderr).toContain('fixture lstat I/O failure');
  });
});

test.each([[[]], [['--dist-only']]] as [string[]][])(
  'clean removes only its selected generated directories (%j)',
  async (args) => {
    await withCleanFixture(async (root, script) => {
      expect((await runClean(root, script, args)).exitCode).toBe(0);
      for (const directory of generated) {
        if (args.length === 0 || directory === 'dist') {
          expect(await readFile(path.join(root, directory, 'sentinel')).catch((error: unknown) => error)).toMatchObject(
            { code: 'ENOENT' },
          );
        } else expect(await readFile(path.join(root, directory, 'sentinel'), 'utf8')).toBe(directory);
      }
      expect(await readFile(path.join(root, 'source.ts'), 'utf8')).toBe('export const retained = true;\n');
      expect(await readFile(path.join(root, 'unrelated.note'), 'utf8')).toBe('retained');
    });
  },
);

test('clean rejects unsupported arguments before any generated deletion', async () => {
  await withCleanFixture(async (root, script) => {
    const result = await runClean(root, script, ['--outside']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Usage: clean');
    for (const directory of generated)
      expect(await readFile(path.join(root, directory, 'sentinel'), 'utf8')).toBe(directory);
  });
});

test('clean refuses a generated symlink and retains its outside target', async () => {
  await withCleanFixture(async (root, script) => {
    const outside = path.join(root, 'outside');
    await mkdir(outside);
    await writeFile(path.join(outside, 'sentinel'), 'outside');
    await rm(path.join(root, 'dist'), { recursive: true });
    await symlink(outside, path.join(root, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
    const result = await runClean(root, script);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('dist is not a real directory');
    expect(await readFile(path.join(outside, 'sentinel'), 'utf8')).toBe('outside');
    expect(await readFile(path.join(root, 'coverage/sentinel')).catch((error: unknown) => error)).toMatchObject({
      code: 'ENOENT',
    });
    expect(await readFile(path.join(root, 'source.ts'), 'utf8')).toBe('export const retained = true;\n');
  });
});
