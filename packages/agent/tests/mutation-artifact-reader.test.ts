import { expect, spyOn, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  mutationArtifactByteLimit,
  mutationEvidenceByteLimit,
  readBoundedMutationArtifact,
} from '../tooling/mutation-artifact-reader.ts';
import { expectRejection, rejectionReason } from './helpers/expect-rejection.ts';

async function withArtifactFixture(run: (root: string) => Promise<void>): Promise<void> {
  const deadline = performance.now() + 5_000;
  const root = await fs.mkdtemp(path.join(tmpdir(), 'mutation-artifact-reader-'));
  let complete = false;
  try {
    await run(root);
    complete = true;
  } finally {
    if (complete && performance.now() < deadline) await fs.rm(root, { recursive: true, force: true });
    else console.error('Retained failed or expired mutation artifact fixture: ' + root);
  }
}

test('reads regular single-link bytes at the exact bound and permits an explicit empty artifact', async () =>
  withArtifactFixture(async (root) => {
    const expected = Buffer.from([0, 1, 2, 255]);
    await fs.writeFile(path.join(root, 'artifact.bin'), expected);
    expect(await readBoundedMutationArtifact(root, 'artifact.bin', expected.length)).toEqual(expected);
    await fs.writeFile(path.join(root, 'empty.bin'), Buffer.alloc(0));
    await expectRejection(readBoundedMutationArtifact(root, 'empty.bin'), 'outside its size bound');
    expect(await readBoundedMutationArtifact(root, 'empty.bin', 0, true)).toEqual(Buffer.alloc(0));
  }));

test('rejects overflow before reading and retains the default evidence limit', async () =>
  withArtifactFixture(async (root) => {
    await fs.writeFile(path.join(root, 'overflow.bin'), Buffer.alloc(mutationEvidenceByteLimit + 1));
    await expectRejection(readBoundedMutationArtifact(root, 'overflow.bin'), 'outside its size bound');
    await fs.writeFile(path.join(root, 'small.bin'), 'abc');
    await expectRejection(readBoundedMutationArtifact(root, 'small.bin', 2), 'outside its size bound');
  }));

test.each([
  { label: 'not-a-number', limit: NaN },
  { label: 'infinite', limit: Infinity },
  { label: 'negative', limit: -1 },
  { label: 'fractional', limit: 0.5 },
  { label: 'above-maximum', limit: mutationArtifactByteLimit + 1 },
])('rejects $label evidence byte limit before opening', async ({ limit }) => {
  await expectRejection(
    readBoundedMutationArtifact('/not-a-fixture', 'unused.bin', limit),
    'Evidence byte limit is invalid',
  );
});

test('rejects symbolic links, hard links, directories and absent evidence', async () =>
  withArtifactFixture(async (root) => {
    const reports = path.join(root, 'reports');
    await fs.mkdir(reports);
    const outside = path.join(root, 'outside.bin');
    await fs.writeFile(outside, 'outside');
    await fs.symlink(outside, path.join(reports, 'linked.bin'));
    await expectRejection(readBoundedMutationArtifact(reports, 'linked.bin'), 'linked');
    await fs.link(outside, path.join(reports, 'hard-linked.bin'));
    await expectRejection(readBoundedMutationArtifact(reports, 'hard-linked.bin'), 'linked');
    await fs.mkdir(path.join(reports, 'directory'));
    await expectRejection(readBoundedMutationArtifact(reports, 'directory'), 'outside its size bound');
    expect(await rejectionReason(readBoundedMutationArtifact(reports, 'absent.bin'))).toHaveProperty('code', 'ENOENT');
  }));

test.each(['../outside.bin', 'nested/artifact.bin', '/absolute.bin'])(
  'rejects escaping evidence name %s before opening',
  async (file) => {
    await expectRejection(readBoundedMutationArtifact('/not-a-fixture', file), 'escapes its report directory');
  },
);

test.each([
  {
    label: 'read and close errors',
    primary: { error: new Error('controlled artifact read failure') },
    cleanup: new Error('controlled artifact close failure'),
  },
  {
    label: 'rejected undefined and close error',
    primary: { error: undefined },
    cleanup: new Error('controlled artifact close failure'),
  },
  { label: 'read error alone', primary: { error: new Error('controlled artifact read failure') }, cleanup: undefined },
  { label: 'rejected undefined alone', primary: { error: undefined }, cleanup: undefined },
  { label: 'close error alone', primary: undefined, cleanup: new Error('controlled artifact close failure') },
])('preserves $label without masking its cause', async ({ primary, cleanup }) =>
  withArtifactFixture(async (root) => {
    const file = path.join(root, 'artifact.bin');
    await fs.writeFile(file, 'observed real artifact');
    const handle = await fs.open(file, 'r');
    expect((await handle.stat()).isFile()).toBe(true);
    const openSpy = spyOn(fs, 'open').mockResolvedValue(handle);
    const readSpy = primary ? spyOn(handle, 'read').mockRejectedValue(primary.error) : undefined;
    const closeSpy = cleanup ? spyOn(handle, 'close').mockRejectedValue(cleanup) : undefined;
    const failures: unknown[] = [];
    try {
      const failure = await rejectionReason(readBoundedMutationArtifact(root, 'artifact.bin'));
      expect(openSpy).toHaveBeenCalledTimes(1);
      if (readSpy) expect(readSpy).toHaveBeenCalledTimes(1);
      if (closeSpy) expect(closeSpy).toHaveBeenCalledTimes(1);
      if (primary && cleanup) {
        expect(failure).toBeInstanceOf(AggregateError);
        if (!(failure instanceof AggregateError)) throw new Error('Expected both controlled failures.');
        expect(failure.errors).toEqual([primary.error, cleanup]);
      } else expect(failure).toBe(primary ? primary.error : cleanup);
    } catch (error) {
      failures.push(error);
    } finally {
      openSpy.mockRestore();
      readSpy?.mockRestore();
      closeSpy?.mockRestore();
    }
    try {
      if (closeSpy) await handle.close();
    } catch (error) {
      failures.push(error);
    }
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) throw new AggregateError(failures, 'Artifact fixture body and close failed');
    expect((await readBoundedMutationArtifact(root, 'artifact.bin')).toString()).toBe('observed real artifact');
  }),
);

test('preserves an open rejection and restores ordinary artifact reading', async () =>
  withArtifactFixture(async (root) => {
    await fs.writeFile(path.join(root, 'artifact.bin'), 'open failure control');
    const failure = new Error('controlled artifact open failure');
    const openSpy = spyOn(fs, 'open').mockRejectedValue(failure);
    try {
      expect(await rejectionReason(readBoundedMutationArtifact(root, 'artifact.bin'))).toBe(failure);
      expect(openSpy).toHaveBeenCalledTimes(1);
    } finally {
      openSpy.mockRestore();
    }
    expect((await readBoundedMutationArtifact(root, 'artifact.bin')).toString()).toBe('open failure control');
  }));
