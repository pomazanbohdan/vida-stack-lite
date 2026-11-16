import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  isWithinRoot,
  resolveResourcePath,
  ResourcePathError,
  resourcePathIdentity,
  validateResourcePath,
} from '../skills/vp-mode/scripts/resource-paths.ts';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(): Promise<{ root: string; resources: string }> {
  const root = await mkdtemp(join(tmpdir(), 'vp-resource-paths-'));
  roots.push(root);
  const resources = join(root, 'resources');
  await mkdir(resources, { recursive: true });
  return { root, resources };
}

describe('validateResourcePath', () => {
  test('accepts a normalized relative path', () => {
    expect(() => validateResourcePath('palette/uupm-font-pairing-classic.json')).not.toThrow();
    expect(() => validateResourcePath('resources/uupm-palette-saas-general.json')).not.toThrow();
  });

  test('rejects empty, absolute, drive, backslash, colon and unsafe segments', () => {
    for (const path of ['', 'a\\b', 'a:b', '/abs/path', 'C:/windows/path', 'a//b', 'a/./b', 'a/../b', 'a/', '.']) {
      expect(() => validateResourcePath(path)).toThrow(ResourcePathError);
      try {
        validateResourcePath(path);
      } catch (error) {
        expect(error).toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
      }
    }
  });
});

describe('isWithinRoot', () => {
  test('accepts the root itself and descendants, rejects escapes', () => {
    const root = resolve(tmpdir(), 'vp-root');
    expect(isWithinRoot(root, root)).toBe(true);
    expect(isWithinRoot(root, join(root, 'child', 'file.json'))).toBe(true);
    expect(isWithinRoot(root, resolve(root, '..'))).toBe(false);
    expect(isWithinRoot(root, resolve(root, '..', 'sibling'))).toBe(false);
    expect(isWithinRoot(root, join(root, 'other-root-sibling'))).toBe(true);
  });

  test('rejects a candidate on a different drive', () => {
    if (process.platform !== 'win32') return;
    expect(isWithinRoot('C:\\root', 'D:\\other')).toBe(false);
    expect(isWithinRoot('C:\\root', 'C:\\root\\child')).toBe(true);
  });
});

describe('resourcePathIdentity', () => {
  test('folds case and Unicode normalization', () => {
    expect(resourcePathIdentity('Resources/A.json')).toBe(resourcePathIdentity('resources/a.JSON'));
    expect(resourcePathIdentity('café.json')).toBe(resourcePathIdentity('café.json'));
    expect(resourcePathIdentity('a.json')).not.toBe(resourcePathIdentity('b.json'));
  });
});

describe('resolveResourcePath', () => {
  test('returns the canonical path of a contained regular file', async () => {
    const { resources } = await fixture();
    await mkdir(join(resources, 'palette'), { recursive: true });
    await writeFile(join(resources, 'palette', 'pairing.json'), '{}');
    await writeFile(join(resources, 'uupm-palette-saas-general.json'), '{}');
    const resolved = await resolveResourcePath(resources, 'palette/pairing.json');
    expect(resolved).toBe(await realpath(join(resources, 'palette', 'pairing.json')));
    const palette = await resolveResourcePath(resources, 'uupm-palette-saas-general.json');
    expect(palette).toBe(await realpath(join(resources, 'uupm-palette-saas-general.json')));
  });

  test('rejects traversal and absolute-path escapes before touching the filesystem', async () => {
    const { resources } = await fixture();
    await expect(resolveResourcePath(resources, '../outside.json')).rejects.toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
    await expect(resolveResourcePath(resources, '/etc/passwd')).rejects.toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
    await expect(resolveResourcePath(resources, 'C:/Windows/win.ini')).rejects.toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
  });

  test('reports a missing resource file and a missing resource root', async () => {
    const { root, resources } = await fixture();
    await expect(resolveResourcePath(resources, 'absent.json')).rejects.toMatchObject({ code: 'RESOURCE_PATH_MISSING' });
    await expect(resolveResourcePath(join(root, 'absent-root'), 'a.json')).rejects.toMatchObject({ code: 'RESOURCE_PATH_MISSING' });
  });

  test('rejects a resource root that is not a directory', async () => {
    const { resources } = await fixture();
    const file = join(resources, 'not-a-root');
    await writeFile(file, 'x');
    await expect(resolveResourcePath(file, 'a.json')).rejects.toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
  });

  test('rejects a directory and other non-regular files as resource paths', async () => {
    const { resources } = await fixture();
    await mkdir(join(resources, 'subdir'), { recursive: true });
    await expect(resolveResourcePath(resources, 'subdir')).rejects.toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
  });

  test('rejects a resource path whose final component is a link, even when contained', async () => {
    const { resources } = await fixture();
    await mkdir(join(resources, 'real-dir'), { recursive: true });
    await writeFile(join(resources, 'real-dir', 'data.json'), '{}');
    const link = join(resources, 'linked-dir');
    await symlink(join(resources, 'real-dir'), link, process.platform === 'win32' ? 'junction' : 'dir');
    await expect(resolveResourcePath(resources, 'linked-dir')).rejects.toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
    await expect(resolveResourcePath(resources, 'linked-dir/data.json')).resolves.toBe(await realpath(join(resources, 'real-dir', 'data.json')));
  });

  test('rejects a file symlink when the platform permits creating one', async () => {
    const { root, resources } = await fixture();
    const outside = join(root, 'outside.json');
    await writeFile(outside, '{}');
    const link = join(resources, 'linked.json');
    try {
      await symlink(outside, link, 'file');
    } catch {
      return;
    }
    await expect(resolveResourcePath(resources, 'linked.json')).rejects.toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
  });

  test('rejects an escaping directory link and a cross-drive resolution', async () => {
    const { root, resources } = await fixture();
    const outside = await mkdtemp(join(tmpdir(), 'vp-resource-outside-'));
    roots.push(outside);
    await writeFile(join(outside, 'evil.json'), '{}');
    await symlink(outside, join(resources, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(resolveResourcePath(resources, 'escape/evil.json')).rejects.toMatchObject({ code: 'RESOURCE_PATH_UNSAFE' });
  });
});
