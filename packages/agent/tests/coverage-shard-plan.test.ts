import { describe, expect, test } from 'bun:test';
import { canonicalJson, sha256 } from '../tooling/bun-coverage-evidence.ts';
import { planCoverageShards } from '../tooling/coverage-shard-plan.ts';
import type { InputDigest } from '../tooling/bun-coverage-evidence.ts';
import type { ReviewedTestResource } from '../tooling/coverage-shard-plan.ts';

const scope = 'a'.repeat(64);
const digest = (path: string, fill = 'b'): InputDigest => ({ path, sha256: fill.repeat(64) });
const resource = (namespace: string, fill = 'd'): string => `${namespace}:${fill.repeat(64)}`;
const reviewed = (path: string, options: Partial<ReviewedTestResource> = {}): ReviewedTestResource => ({
  test_file: path,
  test_sha256: 'b'.repeat(64),
  review_scope_sha256: scope,
  shared_resources: [],
  exclusive_run: false,
  reviewer_ref: 'review:coverage-shard-plan',
  ...options,
});

describe('planCoverageShards', () => {
  test('assigns every selected test exactly once and leaves unknown ownership in an exclusive singleton wave', () => {
    const inputs = [digest('tests/a.test.ts'), digest('tests/b.test.ts'), digest('tests/unknown.test.ts')];
    const plan = planCoverageShards(inputs, [reviewed('tests/a.test.ts'), reviewed('tests/b.test.ts')], 2, scope);
    const assignments = plan.waves.flatMap((wave) => wave.assignments);
    const assigned = assignments.flatMap((assignment) => assignment.tests);

    expect(plan.schema).toBe('VidaCoverageShardPlan/v1');
    expect(plan.concurrency).toBe(2);
    expect([...assigned].sort()).toEqual(inputs.map((input) => input.path).sort());
    expect(new Set(assigned).size).toBe(inputs.length);
    expect(plan.waves.at(-1)).toMatchObject({ exclusive: true, assignments: [{ tests: ['tests/unknown.test.ts'] }] });
  });

  test('uses stable path tie ordering and produces identical plans for identical inputs', () => {
    const inputs = [digest('tests/z.test.ts'), digest('tests/a.test.ts'), digest('tests/m.test.ts')];
    const eligibility = inputs.map(({ path }) => reviewed(path));
    const first = planCoverageShards(inputs, eligibility, 2, scope);
    const second = planCoverageShards([...inputs].reverse(), [...eligibility].reverse(), 2, scope);

    expect(first).toEqual(second);
    const testsInShardOrder = first.waves.flatMap((wave) => wave.assignments.flatMap((assignment) => assignment.tests));
    expect([...testsInShardOrder].sort()).toEqual(['tests/a.test.ts', 'tests/m.test.ts', 'tests/z.test.ts']);
    for (const assignment of first.waves.flatMap((wave) => wave.assignments))
      expect([...assignment.tests].sort()).toEqual([...assignment.tests]);
    expect(first.waves[0]?.assignments[0]?.tests).toEqual(['tests/a.test.ts', 'tests/z.test.ts']);
  });

  test('batches eight eligible files into two balanced serial shards in one wave', () => {
    const inputs = Array.from({ length: 8 }, (_, index) => digest(`tests/${String(index).padStart(2, '0')}.test.ts`));
    const plan = planCoverageShards(
      inputs,
      inputs.map(({ path }) => reviewed(path)),
      2,
      scope,
    );

    expect(plan.waves).toHaveLength(1);
    expect(plan.waves[0]?.exclusive).toBe(false);
    expect(plan.waves[0]?.assignments).toHaveLength(2);
    expect(plan.waves[0]?.assignments.map((assignment) => assignment.tests.length)).toEqual([4, 4]);
    expect(plan.waves[0]?.assignments.flatMap((assignment) => assignment.tests).sort()).toEqual(
      inputs.map(({ path }) => path),
    );
  });

  test('flushes a wave when one test bridges resources already owned by both shards', () => {
    const inputs = ['a', 'b', 'bridge'].map((name) => digest(`tests/${name}.test.ts`));
    const plan = planCoverageShards(
      inputs,
      [
        reviewed('tests/a.test.ts', { shared_resources: [resource('package-root')] }),
        reviewed('tests/b.test.ts', { shared_resources: [resource('worktree', 'e')] }),
        reviewed('tests/bridge.test.ts', { shared_resources: [resource('package-root'), resource('worktree', 'e')] }),
      ],
      2,
      scope,
    );

    expect(plan.waves).toHaveLength(2);
    expect(plan.waves[0]?.assignments.map((assignment) => assignment.tests)).toEqual([
      ['tests/a.test.ts'],
      ['tests/b.test.ts'],
    ]);
    expect(plan.waves[1]?.assignments).toHaveLength(1);
    expect(plan.waves[1]?.assignments[0]?.tests).toEqual(['tests/bridge.test.ts']);
  });

  test('places reviewed global-exclusive work between concurrent waves', () => {
    const inputs = ['01-a', '02-b', '03-exclusive', '04-after'].map((name) => digest(`tests/${name}.test.ts`));
    const plan = planCoverageShards(
      inputs,
      [
        reviewed('tests/01-a.test.ts'),
        reviewed('tests/02-b.test.ts'),
        reviewed('tests/03-exclusive.test.ts', { exclusive_run: true }),
        reviewed('tests/04-after.test.ts'),
      ],
      2,
      scope,
    );

    expect(plan.waves.map((wave) => wave.assignments.flatMap((assignment) => assignment.tests))).toEqual([
      ['tests/01-a.test.ts', 'tests/02-b.test.ts'],
      ['tests/03-exclusive.test.ts'],
      ['tests/04-after.test.ts'],
    ]);
    expect(plan.waves.map((wave) => wave.exclusive)).toEqual([false, true, false]);
  });

  test('accepts an empty boundary selection and emits no waves', () => {
    expect(planCoverageShards([], [], 2, scope).waves).toEqual([]);
  });

  test('binds ordered InputDigest rows, including their captured bytes, into each selection digest', () => {
    const input = digest('tests/a.test.ts', 'c');
    const plan = planCoverageShards([input], [reviewed(input.path, { test_sha256: input.sha256 })], 2, scope);
    const assignment = plan.waves[0]?.assignments[0];
    expect(assignment?.selection_sha256).toBe(sha256(canonicalJson([input])!));
  });

  test('changes the assignment digest when captured test bytes change under an updated review', () => {
    const original = digest('tests/a.test.ts', 'b');
    const updated = digest('tests/a.test.ts', 'c');
    const originalPlan = planCoverageShards(
      [original],
      [reviewed(original.path, { test_sha256: original.sha256 })],
      2,
      scope,
    );
    const updatedPlan = planCoverageShards(
      [updated],
      [reviewed(updated.path, { test_sha256: updated.sha256 })],
      2,
      scope,
    );
    expect(originalPlan.waves[0]?.assignments[0]?.selection_sha256).not.toBe(
      updatedPlan.waves[0]?.assignments[0]?.selection_sha256,
    );
  });

  test('does not retain mutable caller arrays or objects in the emitted plan', () => {
    const input = digest('tests/a.test.ts');
    const resources = [resource('resource')];
    const review = reviewed(input.path, { shared_resources: resources });
    const plan = planCoverageShards([input], [review], 2, scope);
    input.path = 'tests/changed.test.ts';
    resources.push(resource('later'));
    review.reviewer_ref = 'changed';

    expect(plan.waves[0]?.assignments[0]?.tests).toEqual(['tests/a.test.ts']);
    expect(plan.waves[0]?.assignments[0]?.shared_resources).toEqual([resource('resource')]);
  });

  test('keeps same-resource files sequential in one shard', () => {
    const sharedResource = resource('runtime-package-root');
    const plan = planCoverageShards(
      [digest('tests/a.test.ts'), digest('tests/b.test.ts')],
      [
        reviewed('tests/a.test.ts', { shared_resources: [sharedResource] }),
        reviewed('tests/b.test.ts', { shared_resources: [sharedResource] }),
      ],
      2,
      scope,
    );

    expect(plan.waves.flatMap((wave) => wave.assignments.flatMap((assignment) => assignment.tests)).sort()).toEqual([
      'tests/a.test.ts',
      'tests/b.test.ts',
    ]);
    expect(plan.waves[0]?.assignments).toHaveLength(1);
    expect(plan.waves[0]?.assignments[0]?.tests).toEqual(['tests/a.test.ts', 'tests/b.test.ts']);
    for (const wave of plan.waves) {
      expect(wave.assignments.length).toBeLessThanOrEqual(2);
      for (let left = 0; left < wave.assignments.length; left += 1)
        for (let right = left + 1; right < wave.assignments.length; right += 1)
          expect(
            wave.assignments[left]!.shared_resources.some((id) =>
              wave.assignments[right]!.shared_resources.includes(id),
            ),
          ).toBe(false);
    }
  });

  test('rejects duplicate selected paths and duplicate or foreign review rows', () => {
    expect(() => planCoverageShards([digest('tests/a.test.ts'), digest('tests/a.test.ts')], [], 2, scope)).toThrow();
    expect(() =>
      planCoverageShards(
        [digest('tests/a.test.ts')],
        [reviewed('tests/a.test.ts'), reviewed('tests/a.test.ts')],
        2,
        scope,
      ),
    ).toThrow();
    expect(() =>
      planCoverageShards([digest('tests/a.test.ts')], [reviewed('tests/other.test.ts')], 2, scope),
    ).toThrow();
    expect(() =>
      planCoverageShards(
        [digest('tests/a.test.ts')],
        [reviewed('tests/a.test.ts', { test_sha256: 'c'.repeat(64) })],
        2,
        scope,
      ),
    ).toThrow();
  });

  test('rejects stale or malformed review scope, resource identifiers, and reviewer references', () => {
    const input = [digest('tests/a.test.ts')];
    expect(() =>
      planCoverageShards(input, [reviewed('tests/a.test.ts', { review_scope_sha256: 'c'.repeat(64) })], 2, scope),
    ).toThrow();
    expect(() =>
      planCoverageShards(input, [reviewed('tests/a.test.ts', { shared_resources: [''] })], 2, scope),
    ).toThrow();
    expect(() =>
      planCoverageShards(input, [reviewed('tests/a.test.ts', { shared_resources: ['/workspace/package'] })], 2, scope),
    ).toThrow();
    expect(() =>
      planCoverageShards(
        input,
        [reviewed('tests/a.test.ts', { shared_resources: ['Package-root:' + 'd'.repeat(64)] })],
        2,
        scope,
      ),
    ).toThrow();
    expect(() =>
      planCoverageShards(input, [reviewed('tests/a.test.ts', { shared_resources: ['package-root:bad'] })], 2, scope),
    ).toThrow();
    expect(() =>
      planCoverageShards(
        input,
        [reviewed('tests/a.test.ts', { shared_resources: [resource('package-root'), resource('package-root')] })],
        2,
        scope,
      ),
    ).toThrow();
    expect(() =>
      planCoverageShards(
        input,
        [
          reviewed('tests/a.test.ts', {
            shared_resources: Array.from({ length: 129 }, (_, index) =>
              resource('resource', index.toString(16).padStart(64, '0')),
            ),
          }),
        ],
        2,
        scope,
      ),
    ).toThrow();
    expect(() => planCoverageShards(input, [reviewed('tests/a.test.ts', { reviewer_ref: '' })], 2, scope)).toThrow();
    expect(() => planCoverageShards(input, [], 2, 'invalid')).toThrow();
  });

  test('rejects malformed paths and digests, invalid concurrency, and over-bound inputs', () => {
    expect(() => planCoverageShards([digest('../tests/a.test.ts')], [], 2, scope)).toThrow();
    expect(() => planCoverageShards([digest('tests/a.test.js')], [], 2, scope)).toThrow();
    expect(() => planCoverageShards([{ path: 'tests/a.test.ts', sha256: 'bad' }], [], 2, scope)).toThrow();
    expect(() => planCoverageShards([digest('tests/a.test.ts')], [], 1 as 2, scope)).toThrow();
    expect(() =>
      planCoverageShards(
        Array.from({ length: 20001 }, (_, index) => digest(`tests/${index}.test.ts`)),
        [],
        2,
        scope,
      ),
    ).toThrow();
  });
});
