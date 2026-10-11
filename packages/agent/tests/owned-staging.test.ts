import { afterAll, expect, test } from 'bun:test';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { tempWorkspaceSync } from '@openclaw/fs-safe/temp';
import {
  cleanupOwnedWorkspace,
  ownedDirectoryIdentity,
  ownedTempWorkspace,
  removeOwnedDirectory,
  type OwnedCleanupStatus,
  type OwnedTempWorkspace,
} from '../tooling/owned-staging.ts';

type WarningRecord = { message: string; code?: string };

const fixtureRoot = mkdtempSync(join(tmpdir(), 'owned-staging-v40-'));

afterAll(() => {
  // This is the only recursive cleanup here: fixtureRoot was created uniquely by this test file.
  rmSync(fixtureRoot, { recursive: true, force: true });
});

function fixturePath(name: string): string {
  return join(fixtureRoot, name);
}

function captureWarnings<T>(action: (warnings: WarningRecord[]) => T): T {
  const warnings: WarningRecord[] = [];
  const original = Object.getOwnPropertyDescriptor(process, 'emitWarning');
  if (original === undefined) throw new Error('Process warning descriptor is missing');
  const replacement = (...args: unknown[]): void => {
    const warning = args[0];
    const options = args[1];
    const third = args[2];
    const message =
      warning instanceof Error ? warning.message : typeof warning === 'string' ? warning : String(warning);
    const optionCode =
      typeof options === 'object' && options !== null && 'code' in options ? Reflect.get(options, 'code') : undefined;
    const code = typeof optionCode === 'string' ? optionCode : typeof third === 'string' ? third : undefined;
    warnings.push({ message, ...(code === undefined ? {} : { code }) });
  };
  if (!Reflect.set(process, 'emitWarning', replacement)) throw new Error('Could not capture process warnings');
  try {
    return action(warnings);
  } finally {
    Object.defineProperty(process, 'emitWarning', original);
  }
}

function withWorkspaceCleanup<T>(
  replacement: OwnedTempWorkspace['cleanup'],
  action: (workspace: OwnedTempWorkspace) => T,
): T {
  const workspace = tempWorkspaceSync({
    rootDir: fixtureRoot,
    prefix: `owned-staging-status-${randomUUID()}-`,
  });
  const originalCleanup = Object.getOwnPropertyDescriptor(workspace, 'cleanup');
  if (originalCleanup === undefined) throw new Error('Workspace cleanup descriptor is missing');
  try {
    workspace.cleanup = replacement;
    return action(workspace);
  } finally {
    Object.defineProperty(workspace, 'cleanup', originalCleanup);
    workspace.cleanup();
  }
}

function withWorkspaceCleanupResult<T>(
  result: Exclude<OwnedCleanupStatus, 'cleanup-failed'>,
  action: (workspace: OwnedTempWorkspace) => T,
): T {
  return withWorkspaceCleanup(() => result, action);
}

test('ownedDirectoryIdentity rejects a symlink to a directory', () => {
  const target = fixturePath('symlink-target');
  const link = fixturePath('symlink-root');
  mkdirSync(target);
  symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');

  expect(() => ownedDirectoryIdentity(link)).toThrow('Owned staging root changed type');
  expect(lstatSync(link).isSymbolicLink()).toBe(true);
});

test('removeOwnedDirectory preserves a foreign directory when the owned path becomes a symlink', () => {
  const original = fixturePath('owned-original');
  const displaced = fixturePath('owned-displaced');
  const foreign = fixturePath('foreign-target');
  const marker = join(foreign, 'keep.txt');
  mkdirSync(original);
  mkdirSync(foreign);
  writeFileSync(join(original, 'owned.txt'), 'owned');
  writeFileSync(marker, 'foreign');
  const identity = ownedDirectoryIdentity(original);
  renameSync(original, displaced);
  symlinkSync(foreign, original, process.platform === 'win32' ? 'junction' : 'dir');

  try {
    const warnings = captureWarnings((captured) => {
      expect(removeOwnedDirectory(original, identity)).toBe('identity-mismatch');
      return captured;
    });
    expect(warnings).toEqual([
      {
        message: `Owned staging identity-mismatch for ${original}: Staging path no longer names the captured directory`,
        code: 'VIDA_STAGING_IDENTITY_MISMATCH',
      },
    ]);
    expect(readFileSync(marker, 'utf8')).toBe('foreign');
    expect(readFileSync(join(displaced, 'owned.txt'), 'utf8')).toBe('owned');
  } finally {
    unlinkSync(original);
  }
});

test('removeOwnedDirectory reports absent path and missing identity without deleting anything', () => {
  const gone = fixturePath('gone');
  mkdirSync(gone);
  const identity = ownedDirectoryIdentity(gone);
  rmSync(gone, { recursive: true });

  expect(removeOwnedDirectory(undefined, identity)).toBeUndefined();
  expect(removeOwnedDirectory(gone, identity)).toBe('missing');

  const existing = fixturePath('existing-without-identity');
  mkdirSync(existing);
  writeFileSync(join(existing, 'keep.txt'), 'keep');
  const warnings = captureWarnings((captured) => {
    expect(removeOwnedDirectory(existing, undefined)).toBe('identity-mismatch');
    return captured;
  });
  expect(warnings).toEqual([
    {
      message: `Owned staging identity-mismatch for ${existing}: No captured directory identity`,
      code: 'VIDA_STAGING_IDENTITY_MISMATCH',
    },
  ]);
  expect(readFileSync(join(existing, 'keep.txt'), 'utf8')).toBe('keep');
});

test('cleanupOwnedWorkspace confines cleanup to its captured workspace', () => {
  const workspace = ownedTempWorkspace(`owned-staging-v40-${randomUUID()}-`);
  const directory = workspace.dir;
  try {
    const identity = ownedDirectoryIdentity(directory);
    const parent = dirname(directory);
    const parentIdentity = ownedDirectoryIdentity(parent);
    expect(ownedDirectoryIdentity(directory)).toEqual(identity);
    expect(cleanupOwnedWorkspace(workspace)).toBe('removed');
    expect(existsSync(directory)).toBe(false);
    expect(ownedDirectoryIdentity(parent)).toEqual(parentIdentity);
  } finally {
    // Delegates to the workspace's identity-checked cleanup; this never removes its shared parent.
    cleanupOwnedWorkspace(workspace);
  }
});

test('cleanupOwnedWorkspace preserves status values and warning codes', () => {
  let mismatchDirectory = '';
  let indeterminateDirectory = '';
  const warnings = captureWarnings((captured) => {
    withWorkspaceCleanupResult('removed', (workspace) => {
      expect(cleanupOwnedWorkspace(workspace)).toBe('removed');
    });
    withWorkspaceCleanupResult('missing', (workspace) => {
      expect(cleanupOwnedWorkspace(workspace)).toBe('missing');
    });
    withWorkspaceCleanupResult('identity-mismatch', (workspace) => {
      mismatchDirectory = workspace.dir;
      expect(cleanupOwnedWorkspace(workspace)).toBe('identity-mismatch');
    });
    withWorkspaceCleanupResult('indeterminate', (workspace) => {
      indeterminateDirectory = workspace.dir;
      expect(cleanupOwnedWorkspace(workspace)).toBe('indeterminate');
    });
    return captured;
  });

  expect(warnings).toEqual([
    {
      message: `Owned temp workspace was replaced and preserved: ${mismatchDirectory}`,
      code: 'VIDA_TEMP_WORKSPACE_IDENTITY_MISMATCH',
    },
    {
      message: `Owned temp workspace cleanup is indeterminate and preserved: ${indeterminateDirectory}`,
      code: 'VIDA_TEMP_WORKSPACE_CLEANUP_INDETERMINATE',
    },
  ]);
});

test('cleanupOwnedWorkspace converts thrown cleanup errors to a warning and cleanup-failed', () => {
  let failedDirectory = '';
  const warnings = captureWarnings((captured) => {
    withWorkspaceCleanup(
      () => {
        throw new Error('fixture cleanup failure');
      },
      (workspace) => {
        failedDirectory = workspace.dir;
        expect(cleanupOwnedWorkspace(workspace)).toBe('cleanup-failed');
      },
    );
    return captured;
  });

  expect(warnings).toEqual([
    {
      message: `Owned temp workspace cleanup failed for ${failedDirectory}: fixture cleanup failure`,
      code: 'VIDA_TEMP_WORKSPACE_CLEANUP_FAILED',
    },
  ]);
});
