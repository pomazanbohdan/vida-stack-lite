import { expect, test } from 'bun:test';
import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { publishNativeMutationOutput } from '../tooling/native-mutation-output.ts';
import { mutationRunnerEvidencePaths } from '../tooling/mutation-command-runner.ts';
import { sha256 } from '../tooling/bun-coverage-evidence.ts';
import type { MutationProcessResult } from '../tooling/mutation-evidence.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

function closedResult(exitCode = 1): MutationProcessResult {
  const stream = { bytes: 0, retained_bytes: 0, sha256: sha256(''), truncated: false };
  return {
    exitCode,
    signal: null,
    spawnError: null,
    timedOut: false,
    processCustody: {
      pid: 123,
      scope: 'owned-process-group',
      terminationObserved: true,
      processGroupTerminationObserved: true,
      unrefCalled: false,
      attempts: [],
    },
    output_capture: { complete: true, stdout: { ...stream }, stderr: { ...stream } },
  };
}

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'native-output-publication-'));
  const outputRoot = path.join(directory, 'workers/one');
  await mkdir(outputRoot, { recursive: true });
  const input = { directory, outputRoot, partition: 'one', mutantId: '1', processResult: closedResult() };
  const paths = mutationRunnerEvidencePaths(outputRoot, 'one', '1');
  const originals = new Map<string, Buffer<ArrayBuffer>>();
  for (const [role, file] of Object.entries(paths)) {
    if (role === 'adapterDirectory') continue;
    const bytes = role === 'bodyEvents' ? Buffer.alloc(0) : Buffer.from('raw ' + role + '\n');
    await writeFile(file, bytes);
    originals.set(path.basename(file), bytes);
  }
  for (const relative of [
    'mutation-assertion-context.ts',
    'a'.repeat(64) + '.ts',
    'configured-test-context/docs/agent-instructions/policy.json',
  ]) {
    const file = path.join(paths.adapterDirectory, relative);
    await mkdir(path.dirname(file), { recursive: true });
    const bytes = Buffer.from('raw adapter ' + relative);
    await writeFile(file, bytes);
    originals.set(path.relative(outputRoot, file), bytes);
  }
  return { input, paths, originals };
}

async function withFixture(run: (current: Awaited<ReturnType<typeof fixture>>) => Promise<void>) {
  const current = await fixture();
  let complete = false;
  try {
    await run(current);
    complete = true;
  } finally {
    if (complete) await rm(current.input.directory, { recursive: true });
    else console.error('NATIVE_OUTPUT_PUBLICATION_RETAINED', current.input.directory);
  }
}

test.each([0, 1])(
  'closed mutant exit %s publishes raw bytes without classifying assertion strength',
  async (exitCode) => {
    await withFixture(async ({ input, originals }) => {
      input.processResult.exitCode = exitCode;
      await publishNativeMutationOutput(input);
      for (const [relative, bytes] of originals) {
        expect(await readFile(path.join(input.directory, relative))).toEqual(bytes);
        expect(await readFile(path.join(input.outputRoot, relative))).toEqual(bytes);
      }
    });
  },
);

for (const [name, result] of [
  ['timeout', { ...closedResult(), timedOut: true }],
  ['signal', { ...closedResult(), signal: 'SIGTERM' }],
  ['spawn error', { ...closedResult(), spawnError: 'ENOENT' }],
  ['missing PID custody', { ...closedResult(), processCustody: null }],
  [
    'live process group',
    {
      ...closedResult(),
      processCustody: { ...closedResult().processCustody!, processGroupTerminationObserved: false },
    },
  ],
  [
    'unobserved termination',
    { ...closedResult(), processCustody: { ...closedResult().processCustody!, terminationObserved: false } },
  ],
  ['incomplete capture', { ...closedResult(), output_capture: { complete: false } }],
  ['unexpected exit', closedResult(143)],
] satisfies Array<[string, MutationProcessResult]>) {
  test('publication denies ' + name + ' before canonical writes', async () => {
    await withFixture(async ({ input }) => {
      await expectRejection(
        publishNativeMutationOutput({ ...input, processResult: result }),
        'closed expected worker custody',
      );
      expect(await readdir(input.directory)).toEqual(['workers']);
    });
  });
}

test('failed baseline is not eligible for publication even with closed native custody', async () => {
  await withFixture(async ({ input }) => {
    await expectRejection(publishNativeMutationOutput({ ...input, mutantId: null }), 'closed expected worker custody');
    expect(await readdir(input.directory)).toEqual(['workers']);
  });
});

test('missing raw evidence or linked adapter output denies the whole capture before publication', async () => {
  await withFixture(async ({ input, paths }) => {
    await unlink(paths.bodyEvents);
    await expectRejection(publishNativeMutationOutput(input), 'ENOENT');
    expect(await readdir(input.directory)).toEqual(['workers']);
    await writeFile(paths.bodyEvents, '');
    await symlink(paths.receipt, path.join(paths.adapterDirectory, 'linked.ts'));
    await expectRejection(publishNativeMutationOutput(input), 'not a regular file');
    expect(await readdir(input.directory)).toEqual(['workers']);
  });
});

test('hard-linked raw files and aliased adapter directories cannot become canonical evidence', async () => {
  await withFixture(async ({ input, paths }) => {
    const alias = path.join(input.outputRoot, 'receipt-alias');
    await link(paths.receipt, alias);
    await expectRejection(publishNativeMutationOutput(input), 'linked');
    await unlink(alias);
    await rm(paths.adapterDirectory, { recursive: true });
    await symlink(input.directory, paths.adapterDirectory, 'dir');
    await expectRejection(publishNativeMutationOutput(input), 'linked');
    expect(await readdir(input.directory)).toEqual(['workers']);
  });
});

test('known destination collisions preserve existing bytes and prevent any partial publication', async () => {
  await withFixture(async ({ input, paths }) => {
    const target = path.join(input.directory, path.basename(paths.receipt));
    await writeFile(target, 'existing evidence');
    await expectRejection(publishNativeMutationOutput(input), 'overwrite');
    expect(await readFile(target, 'utf8')).toBe('existing evidence');
    expect((await readdir(input.directory)).sort()).toEqual([path.basename(paths.receipt), 'workers'].sort());
  });
});

test('deep adapter trees and aggregate excess are rejected before canonical writes', async () => {
  await withFixture(async ({ input, paths }) => {
    const deep = path.join(paths.adapterDirectory, ...Array.from({ length: 10 }, () => 'nested'));
    await mkdir(deep, { recursive: true });
    await expectRejection(publishNativeMutationOutput(input), 'outside its bound');
    await rm(path.join(paths.adapterDirectory, 'nested'), { recursive: true });
    const bytes = Buffer.alloc(4 * 1024 * 1024, 'x');
    for (let index = 0; index < 9; index++)
      await writeFile(path.join(paths.adapterDirectory, `large-${index}.ts`), bytes);
    await expectRejection(publishNativeMutationOutput(input), 'aggregate bound');
    expect(await readdir(input.directory)).toEqual(['workers']);
  });
});
