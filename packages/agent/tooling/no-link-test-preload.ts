import fs from 'node:fs';
import promises from 'node:fs/promises';
import { mock } from 'bun:test';

function denySymlink(): never {
  throw Object.assign(new Error('Symlink creation is disabled in the Windows push profile.'), {
    code: 'ERR_VIDA_TEST_SYMLINK_DISABLED',
  });
}

const guardedPromises = { ...promises, symlink: denySymlink };
const guardedFs = { ...fs, symlinkSync: denySymlink, symlink: denySymlink, promises: guardedPromises };
await mock.module('node:fs', () => ({ ...guardedFs, default: guardedFs }));
await mock.module('node:fs/promises', () => ({ ...guardedPromises, default: guardedPromises }));
