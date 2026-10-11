import { mock } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import path from 'node:path';

const actualFs = Object.freeze({ ...fs });
const root = process.argv[2];
const scenario = process.argv[3];
if (!root || (scenario !== 'release' && scenario !== 'stale' && scenario !== 'guard'))
  throw new Error('Invalid FIFO fixture identity');
const name = scenario + '-resource';
const guard = path.join(root, name + '.lock.reclaim');
const owner = scenario === 'guard' ? path.join(guard, 'owner.json') : path.join(root, name + '.lock');
const retained = path.join(root, 'retained-lock');
let replaced = false;
let ownerBytes: Buffer | undefined;
function replaceWithFifo(target: fs.PathLike): void {
  if (typeof target !== 'string') throw new Error('FIFO replacement requires its owned pathname');
  const resolvedTarget = actualFs.realpathSync(target);
  if (
    resolvedTarget !== owner &&
    !(
      scenario === 'guard' &&
      resolvedTarget.startsWith(root + path.sep) &&
      /[.]guard-resource[.]lock[.]reclaim[.][0-9a-f-]{36}[.]reclaimed\/owner[.]json$/.test(resolvedTarget)
    )
  )
    throw new Error('FIFO target escaped its owned fixture');
  ownerBytes = actualFs.readFileSync(target);
  actualFs.renameSync(target, retained);
  const created = spawnSync('mkfifo', [resolvedTarget], { encoding: 'utf8', timeout: 1000, killSignal: 'SIGKILL' });
  if (created.error || created.signal || created.status !== 0) throw new Error('Owned FIFO creation failed');
  replaced = true;
  console.log(JSON.stringify({ schema: 'LockFifoSetup/v1', scenario, root }));
}
if (scenario === 'stale' || scenario === 'guard') {
  if (scenario === 'guard') actualFs.mkdirSync(guard);
  actualFs.writeFileSync(
    owner,
    JSON.stringify(
      scenario === 'guard'
        ? {
            schema: 'SafeRepositoryAccessReclaimGuard/v1',
            owner_pid: 2147483647,
            owner_token: '1'.repeat(36),
            acquired_at: new Date(Date.now() - 60000).toISOString(),
          }
        : { schema: 'SafeRepositoryAccessLock/v1', owner_pid: 2147483647, label: 'dead owner' },
    ),
  );
  const old = new Date(Date.now() - 60000);
  actualFs.utimesSync(owner, old, old);
  if (scenario === 'guard') actualFs.utimesSync(guard, old, old);
  await mock.module('node:fs', () => ({
    ...actualFs,
    lstatSync: ((...args: Parameters<typeof fs.lstatSync>) => {
      const captured = actualFs.lstatSync(...args);
      if (
        !replaced &&
        typeof args[0] === 'string' &&
        (scenario === 'guard'
          ? /[.]guard-resource[.]lock[.]reclaim[.][0-9a-f-]{36}[.]reclaimed\/owner[.]json$/.test(args[0])
          : args[0].endsWith('/' + name + '.lock'))
      )
        replaceWithFifo(args[0]);
      return captured;
    }) as typeof fs.lstatSync,
  }));
}
const { requireSafeRepositoryAccess } = await import('../../src/config/safe-repository-access.ts');
let denied = false;
try {
  requireSafeRepositoryAccess(root).withExclusiveLock(name, 'owned FIFO fixture', () => {
    if (scenario === 'release') replaceWithFifo(owner);
    else throw new Error('Reclaim incorrectly admitted the replaced lock');
  });
} catch (error) {
  denied = replaced && error instanceof Error;
  if (!denied)
    console.error(
      JSON.stringify({
        schema: 'LockFifoUnexpectedDenial/v1',
        replaced,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
}
if (
  !denied ||
  !actualFs.lstatSync(owner).isFIFO() ||
  !ownerBytes ||
  !actualFs.readFileSync(retained).equals(ownerBytes)
)
  throw new Error('FIFO denial did not preserve both replacement and original lock evidence');
const entries = actualFs.readdirSync(root).sort();
if (
  JSON.stringify(entries) !==
  JSON.stringify([name + (scenario === 'guard' ? '.lock.reclaim' : '.lock'), 'retained-lock'].sort())
)
  throw new Error('Reclaim guard cleanup left unexpected state');
console.log(
  JSON.stringify({
    schema: 'LockFifoDenied/v1',
    scenario,
    denied,
    replacement_kind: 'fifo',
    original_payload_preserved: true,
    guard_released: scenario !== 'guard',
  }),
);
