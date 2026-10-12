import { afterEach, describe, expect, test } from 'bun:test';
import { linkSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { captureSdkFormationInputs } from '../tooling/build-package.ts';
import { readPin } from '../bin/bun.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

const ownedRoots: string[] = [];

function fixtureRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sdk-formation-capture-'));
  ownedRoots.push(root);
  const write = (relative: string, contents = 'fixture\n'): void => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
  };
  write('src/index.ts', "export { value } from './value.js';\n");
  write('src/value.ts', 'export const value = 1;\n');
  write('schemas/example.schema.json', '{}\n');
  write('package.json', '{"name":"fixture","files":[]}\n');
  write('bun.lock', 'lock fixture\n');
  write('.bun-version', readPin() + '\n');
  write('bunfig.toml', '[install]\n');
  write('tsconfig.json', '{}\n');
  write('tooling/build-package.ts', 'export const inert = true;\n');
  return root;
}

afterEach(() => {
  for (const root of ownedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

async function expectRejected(action: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await expectRejection(Promise.resolve().then(action), expected);
}

describe('SDK formation capture projection', () => {
  test('retains the finite selected bytes after live files change', async () => {
    const root = fixtureRoot();
    const captured = await captureSdkFormationInputs(root);
    expect([...captured.keys()]).toEqual([
      '.bun-version',
      'bun.lock',
      'bunfig.toml',
      'package.json',
      'schemas/example.schema.json',
      'src/index.ts',
      'src/value.ts',
      'tooling/build-package.ts',
      'tsconfig.json',
    ]);
    expect(captured.get('src/value.ts')).toEqual(Buffer.from('export const value = 1;\n'));
    writeFileSync(path.join(root, 'src/value.ts'), 'changed live bytes\n');
    expect(captured.get('src/value.ts')).toEqual(Buffer.from('export const value = 1;\n'));
  });

  test('follows transitive local tooling imports, extension aliases and cycles, excluding bare imports', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tooling/build-package.ts'),
      "import './leaf.js';\nimport 'fixture-external-package';\n",
    );
    writeFileSync(path.join(root, 'tooling/leaf.ts'), "import './cycle.mjs';\n");
    writeFileSync(path.join(root, 'tooling/cycle.ts'), "import './leaf.js';\n");
    const captured = await captureSdkFormationInputs(root);
    expect(captured.has('tooling/leaf.ts')).toBe(true);
    expect(captured.has('tooling/cycle.ts')).toBe(true);
    expect(captured.has('fixture-external-package')).toBe(false);
  });

  test('does not inspect tests or generated dist paths', async () => {
    const root = fixtureRoot();
    writeFileSync(path.join(root, 'src/.fixture.cas.lock'), 'retained control custody\n');
    mkdirSync(path.join(root, 'tests'), { recursive: true });
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    // These links would fail capture if the projection walked either tree.
    symlinkSync(path.join(root, 'missing-test-target'), path.join(root, 'tests', 'unselected.test.ts'));
    symlinkSync(path.join(root, 'missing-dist-target'), path.join(root, 'dist', 'generated.js'));
    const captured = await captureSdkFormationInputs(root);
    expect([...captured.keys()].some((file) => file.startsWith('tests/') || file.startsWith('dist/'))).toBe(false);
    expect(captured.has('src/.fixture.cas.lock')).toBe(false);
  });

  test('rejects missing selected files and unsafe input links or hardlinks', async () => {
    const root = fixtureRoot();
    rmSync(path.join(root, 'bun.lock'));
    await expectRejected(() => captureSdkFormationInputs(root), /missing|rejected/u);

    writeFileSync(path.join(root, 'bun.lock'), 'lock fixture\n');
    writeFileSync(path.join(root, 'tooling/target.ts'), 'target\n');
    symlinkSync(path.join(root, 'tooling/target.ts'), path.join(root, 'tooling/link.ts'));
    writeFileSync(path.join(root, 'tooling/build-package.ts'), "import './link.js';\n");
    await expectRejected(() => captureSdkFormationInputs(root), /rejected/u);

    writeFileSync(path.join(root, 'tooling/build-package.ts'), "import './hardlink.js';\n");
    linkSync(path.join(root, 'tooling/target.ts'), path.join(root, 'tooling/hardlink.ts'));
    await expectRejected(() => captureSdkFormationInputs(root), /rejected|limit/u);
  });

  test('rejects literal local misses, paths outside admitted roots and bounded oversized inputs', async () => {
    const root = fixtureRoot();
    writeFileSync(path.join(root, 'tooling/build-package.ts'), "import './missing.js';\n");
    await expectRejected(() => captureSdkFormationInputs(root), /Unresolved package-local/u);

    writeFileSync(path.join(root, 'tooling/build-package.ts'), "import '../../outside-capture-fixture.js';\n");
    await expectRejected(() => captureSdkFormationInputs(root), /outside admitted package roots/u);

    writeFileSync(path.join(root, 'tooling/build-package.ts'), 'export const inert = true;\n');
    writeFileSync(path.join(root, 'src/value.ts'), Buffer.alloc(4 * 1024 * 1024 + 1));
    await expectRejected(() => captureSdkFormationInputs(root), /limit|rejected/u);
  });

  test('rejects a relative root', async () => {
    await expectRejected(() => captureSdkFormationInputs('relative-fixture-root'), /root must be absolute/u);
  });

  test('refuses a linked or non-directory selected tree root before enumeration', async () => {
    for (const selected of ['src', 'schemas']) {
      const root = fixtureRoot();
      rmSync(path.join(root, selected), { recursive: true });
      const foreignRoot = fixtureRoot();
      symlinkSync(
        path.join(foreignRoot, selected),
        path.join(root, selected),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      await expectRejected(() => captureSdkFormationInputs(root), /tree root must be a real directory/u);
      rmSync(path.join(root, selected));
      writeFileSync(path.join(root, selected), 'wrong tree type\n');
      await expectRejected(() => captureSdkFormationInputs(root), /tree root must be a real directory/u);
    }
  });
});
