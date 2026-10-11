import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import path from 'node:path';
import * as childApis from 'node:child_process';
import { expect, test } from 'bun:test';
import { assertPublishedCoverageInputs, parsePublishedGitBatch } from '../tooling/published-coverage-inputs.ts';
import { createFixtureChildObserver } from '../tooling/fixture-child-observation.ts';

const source = 'src/fixture.ts';
const selectedTest = 'tests/selected.test.ts';
const unselectedTest = 'tests/helpers/fixture.ts';
const paths = { sources: [source], tests: [selectedTest, unselectedTest] };

test('published child admission binds synthetic subject paths, hashes and parent independently from module loads', async () => {
  const module = await import('../tooling/published-coverage-inputs.ts');
  const files = [
    'tooling/coverage-gate.mjs',
    'tooling/crap-gate.mjs',
    'tooling/mutation-gate.mjs',
    'tooling/run-bun-native-coverage.mjs',
  ];
  const fixture = module.publishedFixtureIdentity(
    files,
    new Map(files.map((file) => [file, { mode: '100644', id: '7a85ea4df37734c24dc10ccd171c24e536735fa4' }])),
    new Map(files.map((file) => [file, Buffer.from('published\n')])),
  );
  const options = {
    runId: 'published-admission',
    parentPid: process.pid,
    fixtureFingerprint: createHash('sha256').update(JSON.stringify(fixture)).digest('hex'),
    maxOutputBytes: 1024,
  };
  const observer = createFixtureChildObserver(childApis, options);
  observer.apis.spawnSync(process.execPath, ['-e', 'process.exitCode=1'], { encoding: 'utf8' });
  const observed = observer.finish();
  const original = observed.children[0];
  if (!original) throw new Error('Expected the real API control record.');
  const fixtureRoot = path.join(process.cwd(), 'synthetic-published-fixture');
  // Pure receipt validation fixtures, not claims that these subjects executed.
  const children = fixture.inputs.map((entry, index) => ({
    ...original,
    id: index + 1,
    pid: process.pid + index + 1,
    argv: [path.join(fixtureRoot, entry.path)],
    cwd: fixtureRoot,
    entrypoint: { kind: 'file' as const, path: path.join(fixtureRoot, entry.path), value_sha256: entry.sha256 },
  }));
  const receipt = {
    run_id: options.runId,
    pid: process.pid,
    fixture_children: { ...observed, children, launch_count: children.length },
  };
  expect(() => module.assertPublishedFixtureChildren(fixture, receipt, fixtureRoot)).not.toThrow();
  expect(() => module.assertPublishedFixtureChildren(undefined, {})).not.toThrow();
  expect(() => module.assertPublishedFixtureChildren(undefined, receipt)).toThrow();
  for (const invalid of [
    {},
    { ...receipt, pid: 0 },
    { ...receipt, run_id: 'foreign' },
    { ...receipt, fixture_children: undefined },
    { ...receipt, fixture_children: { ...receipt.fixture_children, children: [], launch_count: 0 } },
  ])
    expect(() => module.assertPublishedFixtureChildren(fixture, invalid, fixtureRoot)).toThrow();
  expect(() => module.assertPublishedFixtureChildren(fixture, receipt)).toThrow(/root/);
  for (const input of fixture.inputs) {
    expect(() =>
      module.assertPublishedFixtureChildren(
        { ...fixture, inputs: fixture.inputs.filter((row) => row.path !== input.path) },
        receipt,
        fixtureRoot,
      ),
    ).toThrow(/required subject input/);
    for (const changed of ['path', 'value_sha256']) {
      const corrupt = {
        ...receipt,
        fixture_children: {
          ...receipt.fixture_children,
          children: children.map((row) =>
            row.entrypoint.path === path.join(fixtureRoot, input.path)
              ? {
                  ...row,
                  entrypoint: {
                    ...row.entrypoint,
                    [changed]: changed === 'path' ? path.join(fixtureRoot, 'other.mjs') : 'b'.repeat(64),
                  },
                }
              : row,
          ),
        },
      };
      expect(() => module.assertPublishedFixtureChildren(fixture, corrupt, fixtureRoot)).toThrow(/not observed/);
    }
  }
});

function inputs() {
  return new Map([
    [source, Buffer.from('export const original = true;\n')],
    [selectedTest, Buffer.from('selected original bytes\n')],
    [unselectedTest, Buffer.from('unselected original bytes\n')],
  ]);
}

test('published input binding accepts exact sets independently of order and current tooling bytes', () => {
  const actual = inputs();
  actual.set('tooling/current.ts', Buffer.from('current quality tool bytes'));
  expect(() =>
    assertPublishedCoverageInputs(paths, { sources: [source], tests: [...paths.tests].reverse() }, inputs(), actual),
  ).not.toThrow();
  expect(actual.get('tooling/current.ts')?.toString()).toBe('current quality tool bytes');
});

test.each([source, selectedTest, unselectedTest])('published input binding rejects changed bytes: %s', (file) => {
  const actual = inputs();
  actual.set(file, Buffer.from('changed'));
  expect(() => assertPublishedCoverageInputs(paths, paths, inputs(), actual)).toThrow(/input bytes differ/);
});

test.each(['sources', 'tests'] as const)('published input binding rejects missing, added and duplicate %s', (kind) => {
  const missing = { ...paths, [kind]: paths[kind].slice(1) };
  const added = { ...paths, [kind]: [...paths[kind], 'foreign.ts'] };
  const duplicate = { ...paths, [kind]: [...paths[kind], ...paths[kind]] };
  for (const actual of [missing, added, duplicate])
    expect(() => assertPublishedCoverageInputs(paths, actual, inputs(), inputs())).toThrow(/path set differs/);
  expect(() => assertPublishedCoverageInputs(duplicate, paths, inputs(), inputs())).toThrow(/path set differs/);
});

test('published input binding rejects missing bytes even when declared paths agree', () => {
  const missingActual = inputs();
  missingActual.delete(unselectedTest);
  const missingPublished = inputs();
  missingPublished.delete(source);
  expect(() => assertPublishedCoverageInputs(paths, paths, inputs(), missingActual)).toThrow(/input bytes differ/);
  expect(() => assertPublishedCoverageInputs(paths, paths, missingPublished, inputs())).toThrow(/input bytes differ/);
});

const firstId = '1'.repeat(40);
const secondId = '2'.repeat(40);

function batchRecord(id: string, bytes: Buffer): Buffer {
  return Buffer.concat([Buffer.from(`${id} blob ${bytes.length}\n`), bytes, Buffer.from('\n')]);
}

test('published Git batch decodes exact binary blobs once, including empty files and body newlines', () => {
  const payload = Buffer.from([0, 10, 255, 13, 10]);
  const batch = Buffer.concat([batchRecord(firstId, payload), batchRecord(secondId, Buffer.alloc(0))]);
  const result = parsePublishedGitBatch(batch, [firstId, secondId], 5, 5);
  expect(result.size).toBe(2);
  expect(result.get(firstId)).toEqual(payload);
  expect(result.get(secondId)).toEqual(Buffer.alloc(0));
  expect(parsePublishedGitBatch(Buffer.alloc(0), [], 0, 0).size).toBe(0);
});

test('published Git batch rejects wrong identity, nonblob, malformed sizes and missing objects', () => {
  for (const header of [
    `${secondId} blob 0\n\n`,
    `${firstId} tree 0\n\n`,
    `${firstId} blob -1\n\n`,
    `${firstId} blob 01\n\n`,
    `${firstId} blob 1.5\n\n`,
    `${firstId} blob 9007199254740992\n\n`,
    `${firstId} missing\n`,
    'header without newline',
    'x'.repeat(81) + '\n',
  ])
    expect(() => parsePublishedGitBatch(Buffer.from(header), [firstId], 10, 10)).toThrow();
});

test('published Git batch rejects truncated bodies, framing drift, trailing bytes and excess byte budgets', () => {
  const valid = batchRecord(firstId, Buffer.from('ab'));
  for (const bytes of [
    valid.subarray(0, -1),
    Buffer.from(`${firstId} blob 2\na\n`),
    Buffer.concat([valid, Buffer.from('x')]),
  ])
    expect(() => parsePublishedGitBatch(bytes, [firstId], 2, 2)).toThrow();
  expect(() => parsePublishedGitBatch(valid, [firstId], 1, 2)).toThrow(/byte limits/);
  expect(() => parsePublishedGitBatch(valid, [firstId], 2, 1)).toThrow(/byte limits/);
  const two = Buffer.concat([valid, batchRecord(secondId, Buffer.from('ab'))]);
  expect(() => parsePublishedGitBatch(two, [firstId, secondId], 2, 3)).toThrow(/byte limits/);
});

test('published Git batch rejects invalid bounds and ambiguous request identities', () => {
  expect(() => parsePublishedGitBatch(Buffer.alloc(0), [firstId, firstId], 1, 1)).toThrow(/bounds or object/);
  expect(() => parsePublishedGitBatch(Buffer.alloc(0), ['not-an-object'], 1, 1)).toThrow(/object identity/);
  for (const bound of [-1, 0.5, Infinity, Number.NaN]) {
    expect(() => parsePublishedGitBatch(Buffer.alloc(0), [], bound, 1)).toThrow(/bounds/);
    expect(() => parsePublishedGitBatch(Buffer.alloc(0), [], 1, bound)).toThrow(/bounds/);
  }
});

test('published fixture identity binds Git modes/blobs and bytes independently of current tool path collisions', async () => {
  const module = await import('../tooling/published-coverage-inputs.ts');
  expect(module.publishedFixtureIdentity).toBeFunction();
  const file = 'tooling/crap-gate.mjs';
  const fixtureBytes = new Map([[file, Buffer.from('published\n')]]);
  const tree = new Map([[file, { mode: '100644', id: '7a85ea4df37734c24dc10ccd171c24e536735fa4' }]]);
  const identity = module.publishedFixtureIdentity([file], tree, fixtureBytes);
  expect(identity.schema).toBe('PublishedCoverageFixture/v1');
  expect(identity.directory).toBe('published-fixture');
  expect(identity.commit).toBe('b5499511e64b2165a8c97ae3d2b455b25b1ac5b6');
  expect(identity.inputs).toEqual([
    {
      path: file,
      mode: '100644',
      blob_oid: '7a85ea4df37734c24dc10ccd171c24e536735fa4',
      sha256: 'e41adfc0670b4e1740e6874bdb59f26e0bc6982e44796c5df37b6eead72932dc',
    },
  ]);
  expect(Object.isFrozen(identity)).toBe(true);
  expect(Object.isFrozen(identity.inputs)).toBe(true);
  expect(Object.isFrozen(identity.inputs[0])).toBe(true);
  expect(fixtureBytes.get(file)?.toString()).toBe('published\n');
});

test('published fixture identity rejects ambiguous paths, symlinks, missing bytes and invalid Git identities', async () => {
  const module = await import('../tooling/published-coverage-inputs.ts');
  expect(module.publishedFixtureIdentity).toBeFunction();
  const file = 'tooling/coverage-gate.mjs';
  const bytes = new Map([[file, Buffer.from('original')]]);
  const tree = new Map([[file, { mode: '100644', id: '94f3610c08588440112ed977376f26a8fba169b0' }]]);
  for (const paths of [
    [],
    [file, file],
    ['../tooling/coverage-gate.mjs'],
    ['/tooling/coverage-gate.mjs'],
    ['tooling\\coverage-gate.mjs'],
  ])
    expect(() => module.publishedFixtureIdentity(paths, tree, bytes)).toThrow();
  for (const entry of [
    { mode: '120000', id: firstId },
    { mode: '100644', id: 'wrong' },
  ])
    expect(() => module.publishedFixtureIdentity([file], new Map([[file, entry]]), bytes)).toThrow();
  expect(() => module.publishedFixtureIdentity([file], tree, new Map())).toThrow();
});

test('published fixture decoder rejects wrong roots, commits and omitted or duplicated blob identities', async () => {
  const module = await import('../tooling/published-coverage-inputs.ts');
  expect(module.parsePublishedFixtureIdentity).toBeFunction();
  const file = 'tooling/crap-gate.mjs';
  const identity = module.publishedFixtureIdentity(
    [file],
    new Map([[file, { mode: '100644', id: '7a85ea4df37734c24dc10ccd171c24e536735fa4' }]]),
    new Map([[file, Buffer.from('published\n')]]),
  );
  expect(module.parsePublishedFixtureIdentity(JSON.parse(JSON.stringify(identity)))).toEqual(identity);
  for (const bad of [
    null,
    {},
    { ...identity, directory: 'current-measurement' },
    { ...identity, commit: secondId },
    { ...identity, inputs: [] },
    { ...identity, inputs: [...identity.inputs, ...identity.inputs] },
    { ...identity, unexpected: true },
    { ...identity, inputs: [{ ...identity.inputs[0], path: '../tooling/crap-gate.mjs' }] },
    { ...identity, inputs: [{ ...identity.inputs[0], sha256: 'unproven' }] },
    { ...identity, inputs: [{ ...identity.inputs[0], mode: '120000' }] },
  ])
    expect(() => module.parsePublishedFixtureIdentity(bad)).toThrow();
});

test('published fixture process proof rejects missing, duplicated and wrong-root loaded inputs', async () => {
  const module = await import('../tooling/published-coverage-inputs.ts');
  expect(module.assertPublishedFixtureProcess).toBeFunction();
  const file = 'tests/selected.test.mjs';
  const identity = module.publishedFixtureIdentity(
    [file],
    new Map([[file, { mode: '100644', id: 'b4b7d9a92e88f3c95ef621a118346df66858292f' }]]),
    new Map([[file, Buffer.from('test subject')]]),
  );
  const input = { root_id: 'published_fixture', path: file, sha256: identity.inputs[0]?.sha256 };
  const receipt = { published_fixture: identity, loaded_fixture_inputs: [input] };
  expect(() => module.assertPublishedFixtureProcess(identity, receipt, [file])).not.toThrow();
  for (const bad of [
    {},
    { ...receipt, loaded_fixture_inputs: [] },
    { ...receipt, loaded_fixture_inputs: [input, input] },
    { ...receipt, loaded_fixture_inputs: [{ ...input, root_id: 'measurement_snapshot' }] },
    { ...receipt, loaded_fixture_inputs: [{ ...input, sha256: '0'.repeat(64) }] },
    { ...receipt, published_fixture: { ...identity, commit: secondId } },
  ])
    expect(() => module.assertPublishedFixtureProcess(identity, bad, [file])).toThrow();
  expect(() => module.assertPublishedFixtureProcess(undefined, {}, [])).not.toThrow();
  expect(() => module.assertPublishedFixtureProcess(undefined, receipt, [])).toThrow();
});

test('published fixture identity rejects regular Git blob IDs paired with different bytes', async () => {
  const module = await import('../tooling/published-coverage-inputs.ts');
  const file = 'tooling/coverage-gate.mjs';
  expect(() =>
    module.publishedFixtureIdentity(
      [file],
      new Map([[file, { mode: '100644', id: firstId }]]),
      new Map([[file, Buffer.from('unrelated bytes')]]),
    ),
  ).toThrow('Published fixture bytes do not match their Git blob');
});
