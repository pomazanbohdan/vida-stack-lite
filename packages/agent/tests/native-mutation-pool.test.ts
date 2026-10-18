import { expect, test } from 'bun:test';
import { collectIsolatedNativeMutationBatch } from '../tooling/mutation-batch-pilot.ts';
import { CampaignResourceError } from '../tooling/contour-campaign.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

type Observation = { status: 'passed' | 'killed' | 'unknown'; reason?: string };
function deferred() {
  let resolve!: (value: Observation) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Observation>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fixture(count = 4) {
  const ids = Array.from({ length: count }, (_, index) => String(index));
  const batch = { identities: ids.map((id) => 'identity-' + id), local_ids: ids };
  const tickets = ids.map(() => deferred());
  const started = ids.map(() => deferred());
  const calls: string[] = [];
  const publications: Array<{ id: string; completed: number }> = [];
  const invoke = (id: string) => {
    calls.push(id);
    started[Number(id)]!.resolve({ status: 'passed' });
    return tickets[Number(id)]!.promise;
  };
  const progress = (row: { local_id: string }, completed: number) => {
    publications.push({ id: row.local_id, completed });
  };
  const finish = () => {
    for (const ticket of tickets) ticket.resolve({ status: 'killed' });
  };
  return { batch, tickets, started, calls, publications, invoke, progress, finish };
}

test('isolated pool rolls at most two workers and reports actual observations in input order', async () => {
  const current = fixture();
  const pending = collectIsolatedNativeMutationBatch(current.batch, () => 1000, current.invoke, current.progress);
  try {
    expect(current.calls).toEqual(['0', '1']);
    current.tickets[1]!.resolve({ status: 'passed' });
    await current.started[2]!.promise;
    expect(current.calls).toEqual(['0', '1', '2']);
    expect(current.publications).toEqual([]);
    current.tickets[2]!.resolve({ status: 'killed' });
    await current.started[3]!.promise;
    expect(current.calls).toEqual(['0', '1', '2', '3']);
    expect(current.publications).toEqual([]);
    current.tickets[3]!.resolve({ status: 'passed' });
    current.tickets[0]!.resolve({ status: 'killed' });
    const result = await pending;
    expect(result.results).toEqual([
      { identity: 'identity-0', local_id: '0', status: 'killed' },
      { identity: 'identity-1', local_id: '1', status: 'survived' },
      { identity: 'identity-2', local_id: '2', status: 'killed' },
      { identity: 'identity-3', local_id: '3', status: 'survived' },
    ]);
    expect(current.publications).toEqual([
      { id: '0', completed: 1 },
      { id: '1', completed: 2 },
      { id: '2', completed: 3 },
      { id: '3', completed: 4 },
    ]);
    expect(result.failures).toEqual([]);
    expect(result.resourceBlocks).toEqual([]);
    expect(result.budgetExhausted).toBe(false);
  } finally {
    current.finish();
    await pending;
  }
});

test('explicit four-worker pool refills one slot and retains ordered observations', async () => {
  const current = fixture(6);
  const pending = collectIsolatedNativeMutationBatch(current.batch, () => 1000, current.invoke, current.progress, 1, 4);
  try {
    expect(current.calls).toEqual(['0', '1', '2', '3']);
    current.tickets[3]!.resolve({ status: 'killed' });
    await current.started[4]!.promise;
    expect(current.calls).toEqual(['0', '1', '2', '3', '4']);
    expect(current.publications).toEqual([]);
    current.tickets[4]!.resolve({ status: 'killed' });
    await current.started[5]!.promise;
    current.finish();
    const result = await pending;
    expect(result.results.map(({ local_id }) => local_id)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(result.results.every(({ status }) => status === 'killed')).toBe(true);
    expect(current.publications.map(({ id }) => id)).toEqual(['0', '1', '2', '3', '4', '5']);
    expect(result.failures).toEqual([]);
  } finally {
    current.finish();
    await pending;
  }
});

test('four-worker UNKNOWN stops assignment and drains all three held siblings', async () => {
  const current = fixture(6);
  let settled = false;
  const pending = collectIsolatedNativeMutationBatch(
    current.batch,
    () => 1000,
    current.invoke,
    current.progress,
    1,
    4,
  ).finally(() => {
    settled = true;
  });
  try {
    current.tickets[1]!.resolve({ status: 'unknown', reason: 'unobserved termination' });
    await Promise.resolve();
    expect(current.calls).toEqual(['0', '1', '2', '3']);
    expect(settled).toBe(false);
    for (const index of [0, 2, 3]) current.tickets[index]!.resolve({ status: 'killed' });
    const result = await pending;
    expect(current.calls).toEqual(['0', '1', '2', '3']);
    expect(result.results.map(({ status }) => status)).toEqual(['killed', 'unknown', 'killed', 'killed']);
    expect(result.failures).toEqual([]);
  } finally {
    current.finish();
    await pending;
  }
});

test.each([0, 1, 3, 5, 2.5, NaN, Infinity])('pool rejects an unsupported worker bound %s', async (count) => {
  const current = fixture();
  await expectRejection(
    collectIsolatedNativeMutationBatch(current.batch, () => 1000, current.invoke, current.progress, 1, count),
    /two or four/u,
  );
  expect(current.calls).toEqual([]);
});

test('UNKNOWN stops assignment immediately and drains a held sibling without classifying later IDs', async () => {
  const current = fixture();
  let settled = false;
  const pending = collectIsolatedNativeMutationBatch(
    current.batch,
    () => 1000,
    current.invoke,
    current.progress,
  ).finally(() => {
    settled = true;
  });
  try {
    current.tickets[1]!.resolve({ status: 'unknown', reason: 'unobserved native termination' });
    await Promise.resolve();
    expect(current.calls).toEqual(['0', '1']);
    expect(settled).toBe(false);
    current.tickets[0]!.resolve({ status: 'killed' });
    const result = await pending;
    expect(result.results).toEqual([
      { identity: 'identity-0', local_id: '0', status: 'killed' },
      { identity: 'identity-1', local_id: '1', status: 'unknown', reason: 'unobserved native termination' },
    ]);
    expect(current.calls).toEqual(['0', '1']);
    expect(result.failures).toEqual([]);
    expect(result.resourceBlocks).toEqual([]);
  } finally {
    current.finish();
    await pending;
  }
});

test('a thrown undefined stops new assignments, keeps a later real row and leaves the progress gap explicit', async () => {
  const current = fixture();
  let settled = false;
  const pending = collectIsolatedNativeMutationBatch(
    current.batch,
    () => 1000,
    current.invoke,
    current.progress,
  ).finally(() => {
    settled = true;
  });
  try {
    current.tickets[0]!.reject(undefined);
    await Promise.resolve();
    expect(current.calls).toEqual(['0', '1']);
    expect(settled).toBe(false);
    current.tickets[1]!.resolve({ status: 'passed' });
    const result = await pending;
    expect(result.failures).toEqual([{ offset: 0, phase: 'invoke', error: undefined }]);
    expect(result.results).toEqual([{ identity: 'identity-1', local_id: '1', status: 'survived' }]);
    expect(current.publications).toEqual([]);
    expect(current.calls).toEqual(['0', '1']);
  } finally {
    current.finish();
    await pending;
  }
});

test('two invocation errors retain both original causes in input order despite reverse settlement', async () => {
  const current = fixture();
  const pending = collectIsolatedNativeMutationBatch(current.batch, () => 1000, current.invoke, current.progress);
  const error = new Error('first worker failed');
  current.tickets[1]!.reject(undefined);
  current.tickets[0]!.reject(error);
  const result = await pending;
  expect(result.failures).toEqual([
    { offset: 0, phase: 'invoke', error },
    { offset: 1, phase: 'invoke', error: undefined },
  ]);
  expect(result.failures[0]!.error).toBe(error);
  expect(result.results).toEqual([]);
  expect(current.calls).toEqual(['0', '1']);
});

test('a throwing outcome getter cannot escape custody or permit another launch while its sibling is held', async () => {
  const current = fixture();
  const visited = deferred();
  const error = new Error('outcome getter failed');
  let settled = false;
  const pending = collectIsolatedNativeMutationBatch(current.batch, () => 1000, current.invoke, current.progress);
  const terminal = pending.then(
    (result) => {
      settled = true;
      return { result };
    },
    (failure: unknown) => {
      settled = true;
      return { failure };
    },
  );
  try {
    current.tickets[0]!.resolve({
      get status(): 'passed' {
        visited.resolve({ status: 'passed' });
        throw error;
      },
    });
    await visited.promise;
    // Let a rejected worker and its Promise.all observer report before release.
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(current.calls).toEqual(['0', '1']);
    current.tickets[1]!.resolve({ status: 'killed' });
    const result = await pending;
    expect(result.failures).toEqual([{ offset: 0, phase: 'invoke', error }]);
    expect(result.failures[0]!.error).toBe(error);
    expect(result.results).toEqual([{ identity: 'identity-1', local_id: '1', status: 'killed' }]);
    expect(current.calls).toEqual(['0', '1']);
  } finally {
    current.finish();
    await terminal;
  }
});

test('two storage denials stay distinct from invocation errors and unattempted IDs', async () => {
  const current = fixture();
  const pending = collectIsolatedNativeMutationBatch(current.batch, () => 1000, current.invoke, current.progress);
  current.tickets[1]!.reject(new CampaignResourceError('/second', null));
  current.tickets[0]!.reject(new CampaignResourceError('/first', '42'));
  const result = await pending;
  expect(result.resourceBlocks).toEqual([
    { offset: 0, observed_path: '/first', available_bytes: '42' },
    { offset: 1, observed_path: '/second', available_bytes: null },
  ]);
  expect(result.failures).toEqual([]);
  expect(result.results).toEqual([]);
  expect(result.budgetExhausted).toBe(false);
  expect(current.calls).toEqual(['0', '1']);
});

test('storage denial prevents refill while an already launched sibling still owns its outcome', async () => {
  const current = fixture();
  let settled = false;
  const pending = collectIsolatedNativeMutationBatch(
    current.batch,
    () => 1000,
    current.invoke,
    current.progress,
  ).finally(() => {
    settled = true;
  });
  try {
    current.tickets[1]!.reject(new CampaignResourceError('/owned', null));
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(current.calls).toEqual(['0', '1']);
    current.tickets[0]!.resolve({ status: 'killed' });
    const result = await pending;
    expect(result.results).toEqual([{ identity: 'identity-0', local_id: '0', status: 'killed' }]);
    expect(result.resourceBlocks).toEqual([{ offset: 1, observed_path: '/owned', available_bytes: null }]);
    expect(result.failures).toEqual([]);
    expect(current.calls).toEqual(['0', '1']);
  } finally {
    current.finish();
    await pending;
  }
});

test('a progress error retains its row, disables publication and drains the sibling before returning', async () => {
  const current = fixture();
  const error = new Error('publication failed');
  const publications: string[] = [];
  let settled = false;
  const pending = collectIsolatedNativeMutationBatch(
    current.batch,
    () => 1000,
    current.invoke,
    (row) => {
      publications.push(row.local_id);
      throw error;
    },
  ).finally(() => {
    settled = true;
  });
  try {
    current.tickets[0]!.resolve({ status: 'passed' });
    await Promise.resolve();
    expect(current.calls).toEqual(['0', '1']);
    expect(settled).toBe(false);
    current.tickets[1]!.resolve({ status: 'killed' });
    const result = await pending;
    expect(result.results.map((row) => row.status)).toEqual(['survived', 'killed']);
    expect(result.failures).toEqual([{ offset: 0, phase: 'progress', error }]);
    expect(result.failures[0]!.error).toBe(error);
    expect(publications).toEqual(['0']);
    expect(current.calls).toEqual(['0', '1']);
  } finally {
    current.finish();
    await pending;
  }
});

test('the pool snapshots caller arrays and protects recorded observations from progress mutation', async () => {
  const current = fixture(2);
  const pending = collectIsolatedNativeMutationBatch(
    current.batch,
    () => 1000,
    current.invoke,
    (row) => {
      Reflect.set(row, 'status', 'unknown');
    },
  );
  current.batch.identities.fill('changed');
  current.batch.local_ids.fill('changed');
  current.finish();
  const result = await pending;
  expect(result.results).toEqual([
    { identity: 'identity-0', local_id: '0', status: 'killed' },
    { identity: 'identity-1', local_id: '1', status: 'killed' },
  ]);
  expect(result.failures).toEqual([]);
});

test.each([0, 999])(
  'remaining allowance %s denies launch below the minimum and drains the exact-minimum launch',
  async (below) => {
    const current = fixture();
    let checks = 0;
    const allowances: number[] = [];
    const pending = collectIsolatedNativeMutationBatch(
      current.batch,
      () => (checks++ === 0 ? 1000 : below),
      (id, allowance) => {
        allowances.push(allowance);
        return current.invoke(id);
      },
      current.progress,
      1000,
    );
    try {
      expect(current.calls).toEqual(['0']);
      current.tickets[0]!.resolve({ status: 'killed' });
      const result = await pending;
      expect(allowances).toEqual([1000]);
      expect(result.budgetExhausted).toBe(true);
      expect(result.results.map((row) => row.local_id)).toEqual(['0']);
      expect(result.failures).toEqual([]);
    } finally {
      current.finish();
      await pending;
    }
  },
);

test.each([NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
  'malformed allowance %s fails closed before any invocation',
  async (allowance) => {
    const current = fixture();
    const result = await collectIsolatedNativeMutationBatch(
      current.batch,
      () => allowance,
      current.invoke,
      current.progress,
    );
    expect(current.calls).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.budgetExhausted).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]!.phase).toBe('allowance');
    expect(result.failures[0]!.offset).toBe(0);
    expect(result.failures[0]!.error).toBeInstanceOf(Error);
  },
);

test('an allowance provider error keeps its actual cause and drains an already started worker', async () => {
  const current = fixture();
  let checks = 0;
  const pending = collectIsolatedNativeMutationBatch(
    current.batch,
    () => {
      if (checks++ === 0) return 1000;
      throw undefined;
    },
    current.invoke,
    current.progress,
  );
  current.finish();
  const result = await pending;
  expect(current.calls).toEqual(['0']);
  expect(result.results.map((row) => row.local_id)).toEqual(['0']);
  expect(result.failures).toEqual([{ offset: 1, phase: 'allowance', error: undefined }]);
  expect(result.budgetExhausted).toBe(false);
});

test('invalid pairs and minima are rejected before invoking or consulting the budget', async () => {
  let calls = 0;
  const budget = () => {
    calls++;
    return 1000;
  };
  const invoke = async (): Promise<Observation> => {
    calls++;
    return { status: 'passed' };
  };
  for (const batch of [
    { identities: ['a'], local_ids: [] },
    { identities: ['a', 'a'], local_ids: ['0', '1'] },
    { identities: ['a', 'b'], local_ids: ['0', '0'] },
    { identities: [''], local_ids: ['0'] },
    { identities: ['a'], local_ids: [''] },
  ])
    await expectRejection(
      collectIsolatedNativeMutationBatch(batch, budget, invoke, () => undefined),
      'unique paired',
    );
  for (const minimum of [0, -1, NaN, Infinity, 1.5])
    await expectRejection(
      collectIsolatedNativeMutationBatch(
        { identities: ['a'], local_ids: ['0'] },
        budget,
        invoke,
        () => undefined,
        minimum,
      ),
      'minimum allowance',
    );
  expect(calls).toBe(0);
});

test('an empty pool neither launches nor reads an allowance', async () => {
  const result = await collectIsolatedNativeMutationBatch(
    { identities: [], local_ids: [] },
    () => {
      throw new Error('budget must not be consulted');
    },
    async () => {
      throw new Error('must not launch');
    },
    () => {
      throw new Error('must not publish');
    },
  );
  expect(result).toEqual({ results: [], budgetExhausted: false, resourceBlocks: [], failures: [] });
});
