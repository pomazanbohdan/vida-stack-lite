/* Isolated child: module-mock fs.readSync before importing the package owner. */
import { mock } from 'bun:test';
import * as fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
const race = process.argv[3];
if (!root || (race !== 'rename' && race !== 'inplace' && race !== 'ancestor' && race !== 'root'))
  throw new Error('Invalid capture race');
const actualFs = Object.freeze({ ...fs });
const sourceDirectory = race === 'ancestor' ? path.join(root, 'nested') : root;
const source = path.join(sourceDirectory, 'module.ts');
let mutationApplied = false;
await mock.module('node:fs', () => ({
  ...actualFs,
  readSync(...args: Parameters<typeof fs.readSync>): number {
    const fd = args[0];
    const count = Reflect.apply(actualFs.readSync, actualFs, args) as number;
    if (count > 0 && !mutationApplied && actualFs.realpathSync('/proc/self/fd/' + fd) === source) {
      mutationApplied = true;
      if (race === 'rename') {
        actualFs.renameSync(source, path.join(root, 'renamed-original.ts'));
        actualFs.writeFileSync(source, Buffer.alloc(256 * 1024, 0x42));
      } else if (race === 'inplace') {
        actualFs.writeFileSync(source, Buffer.alloc(256 * 1024, 0x42));
      } else if (race === 'ancestor') {
        const moved = path.join(root, 'nested-moved');
        actualFs.renameSync(sourceDirectory, moved);
        actualFs.mkdirSync(sourceDirectory);
        actualFs.writeFileSync(source, Buffer.alloc(256 * 1024, 0x42));
      } else {
        actualFs.renameSync(root, root + '-retained');
        actualFs.mkdirSync(root);
        actualFs.writeFileSync(source, Buffer.alloc(256 * 1024, 0x42));
      }
    }
    return count;
  },
}));

const accessModule = await import('../../src/config/safe-repository-access.ts');
const access = accessModule.requireSafeRepositoryAccess(root);
if (typeof access.readVerifiedCaptureBytes !== 'function') throw new Error('Verified capture capability missing');
let denied = false;
let denialMessage: string | null = null;
try {
  access.readVerifiedCaptureBytes(
    race === 'ancestor' ? 'nested/module.ts' : 'module.ts',
    'controlled ' + race + ' race',
  );
} catch (error) {
  denied = true;
  denialMessage = error instanceof Error ? error.message : String(error);
}
if (!mutationApplied) throw new Error('The real capture read did not reach the controlled readSync interposition');
if (!denied || !denialMessage) throw new Error('Drifting capture was unexpectedly admitted');
process.stdout.write(
  JSON.stringify({
    schema: 'VerifiedCaptureRace/v1',
    race,
    denied,
    denial_message: denialMessage,
    mutation_applied: mutationApplied,
  }),
);
