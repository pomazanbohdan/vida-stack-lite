import { afterAll, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installPlugin, runInstallCli, startInstallCli } from '../scripts/install-plugin.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..');
const directories: string[] = [];

async function temp(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  directories.push(directory);
  return directory;
}

async function packageFixture(): Promise<string> {
  const root = await temp('vp-plugin-package-');
  for (const name of ['vida-bootstrap', 'vp-mode', 'vp-setup']) {
    await mkdir(join(root, 'skills', name), { recursive: true });
    await writeFile(join(root, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: test skill.\n---\n`);
  }
  await mkdir(join(root, '.codex-plugin'), { recursive: true });
  await mkdir(join(root, '.agents', 'plugins'), { recursive: true });
  await writeFile(join(root, 'plugin.json'), '{}\n');
  await writeFile(join(root, '.codex-plugin', 'plugin.json'), '{}\n');
  await writeFile(join(root, '.agents', 'plugins', 'marketplace.json'), '{}\n');
  return root;
}

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })));
});

test('installs all three skills for OpenCode and Pi into their discovery paths', async () => {
  const root = await packageFixture();
  const project = await temp('vp-plugin-project-');
  const home = await temp('vp-plugin-home-');

  const opencode = await installPlugin({ packageRoot: root, host: 'opencode', scope: 'project', projectRoot: project });
  expect(opencode.issues).toEqual([]);
  expect(opencode.target).toBe(join(project, '.opencode', 'skills'));
  expect(await readFile(join(project, '.opencode', 'skills', 'vida-bootstrap', 'SKILL.md'), 'utf8')).toContain('name: vida-bootstrap');
  expect(await readFile(join(project, '.opencode', 'skills', 'vp-mode', 'SKILL.md'), 'utf8')).toContain('name: vp-mode');

  const pi = await installPlugin({ packageRoot: root, host: 'pi', scope: 'user', projectRoot: project, home });
  expect(pi.issues).toEqual([]);
  expect(pi.target).toBe(join(home, '.agents', 'skills'));
  expect(await readFile(join(home, '.agents', 'skills', 'vp-setup', 'SKILL.md'), 'utf8')).toContain('name: vp-setup');

  expect((await installPlugin({ packageRoot: root, host: 'opencode', scope: 'project', projectRoot: project, check: true })).issues).toEqual([]);
  expect((await installPlugin({ packageRoot: root, host: 'pi', scope: 'user', projectRoot: project, home, check: true })).issues).toEqual([]);
});

test('reports a conflicting target and a missing checked target', async () => {
  const root = await packageFixture();
  const project = await temp('vp-plugin-conflict-');
  await mkdir(join(project, '.opencode', 'skills', 'vp-mode'), { recursive: true });
  await writeFile(join(project, '.opencode', 'skills', 'vp-mode', 'SKILL.md'), 'different');
  const conflict = await installPlugin({ packageRoot: root, host: 'opencode', scope: 'project', projectRoot: project });
  expect(conflict.issues.some((issue) => issue.includes('target exists'))).toBe(true);

  const fresh = await temp('vp-plugin-fresh-');
  const missing = await installPlugin({ packageRoot: root, host: 'opencode', scope: 'project', projectRoot: fresh, check: true });
  expect(missing.issues.some((issue) => issue.includes('missing'))).toBe(true);

  const mismatch = await installPlugin({ packageRoot: root, host: 'opencode', scope: 'project', projectRoot: project, check: true });
  expect(mismatch.issues.some((issue) => issue.includes('mismatch'))).toBe(true);

  const brokenRoot = await packageFixture();
  const brokenProject = await temp('vp-plugin-broken-');
  await installPlugin({ packageRoot: brokenRoot, host: 'opencode', scope: 'project', projectRoot: brokenProject });
  await rm(join(brokenRoot, 'skills', 'vp-mode'), { recursive: true, force: true });
  const broken = await installPlugin({ packageRoot: brokenRoot, host: 'opencode', scope: 'project', projectRoot: brokenProject, check: true });
  expect(broken.issues.length).toBeGreaterThan(0);
});

test('validates the Codex manifest and skills without writing', async () => {
  const real = await installPlugin({ packageRoot, host: 'codex', scope: 'project' });
  expect(real.issues).toEqual([]);
  expect(real.target).toBe(packageRoot);

  const empty = await temp('vp-plugin-empty-');
  const invalid = await installPlugin({ packageRoot: empty, host: 'codex', scope: 'project' });
  expect(invalid.issues.length).toBeGreaterThan(0);
});

test('the CLI prints a result and rejects bad arguments', async () => {
  const root = await packageFixture();
  const project = await temp('vp-plugin-cli-');
  const out: string[] = [];
  const err: string[] = [];
  const io = { out: (text: string) => out.push(text), err: (text: string) => err.push(text) };

  expect(await runInstallCli([], io)).toBe(2);
  expect(err.join('')).toContain('usage: install-plugin.ts');
  expect(await runInstallCli(['--host', 'other'], io)).toBe(2);
  expect(await runInstallCli(['--host', 'opencode', '--scope', 'other'], io)).toBe(2);

  expect(await runInstallCli(['--host', 'opencode', '--package-root', root, '--project-root', project], io)).toBe(0);
  expect(out.join('')).toContain('"host": "opencode"');
  expect(await runInstallCli(['--host', 'opencode', '--package-root', root, '--project-root', project, '--check'], io)).toBe(0);
  expect(await runInstallCli(['--host', 'codex', '--package-root', packageRoot], io)).toBe(0);
});

test('the entry guard ignores an unrelated argv and runs when invoked directly', async () => {
  expect(await startInstallCli(['bun', 'other.ts'])).toBeUndefined();

  const originalWrite = process.stdout.write;
  const originalErrorWrite = process.stderr.write;
  const originalExit = process.exitCode;
  const captured: string[] = [];
  process.stdout.write = (chunk: string | Uint8Array): boolean => {
    captured.push(String(chunk));
    return true;
  };
  process.stderr.write = (chunk: string | Uint8Array): boolean => {
    captured.push(String(chunk));
    return true;
  };
  try {
    expect(await startInstallCli(['bun', join(packageRoot, 'scripts', 'install-plugin.ts')])).toBe(2);
    const code = await startInstallCli(['bun', join(packageRoot, 'scripts', 'install-plugin.ts'), '--host', 'codex', '--package-root', packageRoot]);
    expect(code).toBe(0);
    expect(process.exitCode).toBe(0);
    expect(captured.join('')).toContain('"host": "codex"');
    expect(captured.join('')).toContain('usage: install-plugin.ts');
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErrorWrite;
    process.exitCode = originalExit;
  }
});
