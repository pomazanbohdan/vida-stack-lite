import { expect, spyOn, test } from 'bun:test';
import { Database, type Changes, type SQLQueryBindings } from 'bun:sqlite';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  closeNativeWorkspaceDatabase,
  openUnadmittedWorkspaceDatabase,
  retainFailedWorkspaceDatabaseClose,
  retryPendingWorkspaceDatabaseCloses,
  withWorkspaceDatabaseClose,
  withWorkspaceDatabaseCloseAsync,
  workspaceDatabaseFileIdentity,
} from '../src/config/workspace-database-raw.js';
import {
  acquireStorageReadAdmission,
  assertWorkspaceDatabaseAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openDatabaseWithStorageAdmission,
  openExistingWorkspaceDatabaseWithAdmission,
} from '../src/config/storage-read-admission.js';
import {
  PROJECT_ACTIVATION_PATH,
  PROJECT_UPGRADE_OPERATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
} from '../src/config/project-paths.js';
import {
  inspectInitialWorkspaceDatabaseImage,
  prepareInitialWorkspaceDatabaseImage,
} from '../src/config/project-upgrade-storage.js';

const testBudgetNs = 5_000_000_000n;

interface ExistingDatabaseFixture {
  readonly root: string;
  readonly file: string;
}

type FixtureCleanup = () => void;

function withExistingDatabaseFixture(
  prefix: string,
  body: (fixture: ExistingDatabaseFixture, addCleanup: (cleanup: FixtureCleanup) => void) => void,
  relative = 'db/workspace.sqlite',
): void {
  const started = process.hrtime.bigint();
  const cleanups: FixtureCleanup[] = [];
  const cleanupErrors: unknown[] = [];
  let root: string | undefined;
  let bodyFailed = false;
  let bodyError: unknown;
  let bodyPassed = false;

  try {
    root = mkdtempSync(path.join(tmpdir(), prefix));
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, '', { flag: 'wx' });
    body({ root, file }, (cleanup) => cleanups.push(cleanup));
    bodyPassed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
  } finally {
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (root) {
      const expired = process.hrtime.bigint() - started >= testBudgetNs;
      if (bodyPassed && cleanupErrors.length === 0 && !expired) {
        try {
          rmSync(root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (bodyFailed || cleanupErrors.length > 0 || expired)
        console.error(`Retained failed or expired workspace database fixture: ${root}`);
    }
  }

  if (bodyFailed && cleanupErrors.length > 0)
    throw new AggregateError(
      [bodyError, ...cleanupErrors],
      `workspace database fixture body and cleanup failed; retained root: ${root ?? '(root creation failed)'}`,
    );
  if (bodyFailed) {
    if (root) console.error(`Retained workspace database fixture after body failure: ${root}`);
    throw bodyError;
  }
  if (cleanupErrors.length > 0)
    throw new AggregateError(
      cleanupErrors,
      `workspace database fixture cleanup failed; retained root: ${root ?? '(root creation failed)'}`,
    );
}

const bootstrapBinding = {
  schema: 'VidaWorkspaceBootstrap/v1' as const,
  operation_id: 'close-custody-inspection-001',
  workspace_id: '0'.repeat(64),
  plan_digest: '1'.repeat(64),
  bundle_digest: '2'.repeat(64),
  input_digest: '3'.repeat(64),
  authority_digest: '4'.repeat(64),
  token_digest: '5'.repeat(64),
};

function flattenErrors(value: unknown, seen = new Set<unknown>()): unknown[] {
  if (!(value instanceof AggregateError) || seen.has(value)) return [value];
  seen.add(value);
  return value.errors.flatMap((error) => flattenErrors(error, seen));
}

function thrownBy(work: () => unknown): {
  readonly threw: boolean;
  readonly value?: unknown;
  readonly error?: unknown;
} {
  try {
    return { threw: false, value: work() };
  } catch (error) {
    return { threw: true, error };
  }
}

test('native sync close accumulator preserves each exact terminal outcome', () => {
  const bodyError = new Error('sync body failed');
  const closeError = new Error('sync close failed');
  const cases = [
    { name: 'success', bodyFails: false, closeFails: false },
    { name: 'body only', bodyFails: true, closeFails: false },
    { name: 'close only', bodyFails: false, closeFails: true },
    { name: 'body and close', bodyFails: true, closeFails: true },
  ] as const;

  for (const scenario of cases) {
    const database = new Database(':memory:');
    let closeAttempts = 0;
    const result = thrownBy(() =>
      withWorkspaceDatabaseClose(
        database,
        () => {
          if (scenario.bodyFails) throw bodyError;
          return 'native result';
        },
        (owned) => {
          expect(owned).toBe(database);
          closeAttempts += 1;
          if (scenario.closeFails) throw closeError;
          closeNativeWorkspaceDatabase(owned);
        },
        `sync ${scenario.name}`,
      ),
    );

    expect(closeAttempts).toBe(1);
    if (!scenario.bodyFails && !scenario.closeFails) {
      expect(result).toEqual({ threw: false, value: 'native result' });
      expect(() => database.query('SELECT 1').get()).toThrow();
    } else if (scenario.bodyFails && !scenario.closeFails) {
      expect(result).toEqual({ threw: true, error: bodyError });
      expect(() => database.query('SELECT 1').get()).toThrow();
    } else if (!scenario.bodyFails) {
      expect(result).toEqual({ threw: true, error: closeError });
      closeNativeWorkspaceDatabase(database);
    } else {
      expect(result.threw).toBe(true);
      expect(result.error).toBeInstanceOf(AggregateError);
      expect((result.error as AggregateError).errors).toEqual([bodyError, closeError]);
      closeNativeWorkspaceDatabase(database);
    }
  }
});

test('native async close accumulator awaits work and preserves each exact terminal outcome', async () => {
  const bodyError = new Error('async body failed');
  const closeError = new Error('async close failed');
  const cases = [
    { name: 'success', bodyFails: false, closeFails: false },
    { name: 'body only', bodyFails: true, closeFails: false },
    { name: 'close only', bodyFails: false, closeFails: true },
    { name: 'body and close', bodyFails: true, closeFails: true },
  ] as const;

  for (const scenario of cases) {
    const database = new Database(':memory:');
    let closeAttempts = 0;
    let result: { readonly threw: boolean; readonly error?: unknown };
    try {
      const value = await withWorkspaceDatabaseCloseAsync(
        database,
        async () => {
          await Promise.resolve();
          if (scenario.bodyFails) throw bodyError;
          return 'native result';
        },
        (owned) => {
          expect(owned).toBe(database);
          closeAttempts += 1;
          if (scenario.closeFails) throw closeError;
          closeNativeWorkspaceDatabase(owned);
        },
        `async ${scenario.name}`,
      );
      result = { threw: false, error: value };
    } catch (error) {
      result = { threw: true, error };
    }

    expect(closeAttempts).toBe(1);
    if (!scenario.bodyFails && !scenario.closeFails) {
      expect(result).toEqual({ threw: false, error: 'native result' });
      expect(() => database.query('SELECT 1').get()).toThrow();
    } else if (scenario.bodyFails && !scenario.closeFails) {
      expect(result).toEqual({ threw: true, error: bodyError });
      expect(() => database.query('SELECT 1').get()).toThrow();
    } else if (!scenario.bodyFails) {
      expect(result).toEqual({ threw: true, error: closeError });
      closeNativeWorkspaceDatabase(database);
    } else {
      expect(result.threw).toBe(true);
      expect(result.error).toBeInstanceOf(AggregateError);
      expect((result.error as AggregateError).errors).toEqual([bodyError, closeError]);
      closeNativeWorkspaceDatabase(database);
    }
  }
});

test('native async close waits for owned work before closing its handle', async () => {
  const database = new Database(':memory:');
  let signalStarted: (() => void) | undefined;
  let releaseWork: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  const blockedWork = new Promise<void>((resolve) => {
    releaseWork = resolve;
  });
  let closeAttempts = 0;
  const pending = withWorkspaceDatabaseCloseAsync(
    database,
    async () => {
      signalStarted?.();
      await blockedWork;
      return 'settled result';
    },
    (owned) => {
      expect(owned).toBe(database);
      closeAttempts += 1;
      closeNativeWorkspaceDatabase(owned);
    },
    'async deferred work and close',
  );

  await started;
  expect(closeAttempts).toBe(0);
  expect(database.query<{ value: number }, []>('SELECT 1 AS value').get()).toEqual({ value: 1 });
  releaseWork?.();
  expect(await pending).toBe('settled result');
  expect(closeAttempts).toBe(1);
  expect(() => database.query('SELECT 1').get()).toThrow();
});

for (const failurePoint of ['schema', 'sentinel'] as const) {
  test(`initial image ${failurePoint} denial preserves its cause and paired close custody`, async () => {
    const image = await prepareInitialWorkspaceDatabaseImage(bootstrapBinding);
    const relative = PROJECT_WORKSPACE_DATABASE_PATH;
    withExistingDatabaseFixture(
      `workspace-db-upgrade-${failurePoint}-close-`,
      (fixture, addCleanup) => {
        writeFileSync(fixture.file, Buffer.from(image.bytes_base64, 'base64'));
        const before = readFileSync(fixture.file);
        const expected =
          failurePoint === 'schema'
            ? {
                ...image,
                database_schema: image.database_schema.map((entry, index) =>
                  index === 0 ? { ...entry, sql: (entry.sql ?? '') + ' /* changed */' } : entry,
                ),
              }
            : {
                ...image,
                binding: { ...image.binding, operation_id: image.binding.operation_id + '-foreign' },
              };
        const validationMessage =
          failurePoint === 'schema'
            ? 'VIDA upgrade storage: initial schema closure differs'
            : 'VIDA upgrade storage: bootstrap sentinel belongs to another operation';
        const sourceCloseError = new Error(`injected ${failurePoint} inspection close interruption`);
        const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
        const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
        const sourceHandles: Database[] = [];
        const gateHandles: Database[] = [];
        let sourceCloseAttempts = 0;
        let closeSpyRestored = false;
        const failOnAttempt = failurePoint === 'schema' ? 2 : 1;
        const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
          this: Database,
          force?: boolean,
        ): void {
          if (path.resolve(this.filename) === fixture.file) {
            sourceHandles.push(this);
            sourceCloseAttempts += 1;
            if (sourceCloseAttempts >= failOnAttempt) throw sourceCloseError;
            originalClose.call(this, force);
            return;
          }
          originalClose.call(this, force);
        });
        const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function <
          ParamsType extends SQLQueryBindings[],
        >(this: Database, sql: string, ...bindings: ParamsType[]): Changes {
          if (
            path.resolve(this.filename) === path.join(fixture.root, '.vida/storage-admission.v1.sqlite') &&
            sql.trim().toUpperCase() === 'BEGIN DEFERRED'
          )
            gateHandles.push(this);
          return originalExec.call(this, sql, ...bindings);
        });
        const restoreSpies = (): void => {
          if (closeSpyRestored) return;
          execSpy.mockRestore();
          closeSpy.mockRestore();
          closeSpyRestored = true;
        };
        addCleanup(restoreSpies);
        addCleanup(() => {
          restoreSpies();
          retryPendingWorkspaceDatabaseCloses();
        });

        let failure: unknown;
        try {
          inspectInitialWorkspaceDatabaseImage(fixture.root, relative, expected);
        } catch (error) {
          failure = error;
        }
        expect(failure).toBeInstanceOf(AggregateError);
        const flattened = flattenErrors(failure);
        expect(flattened.some((error) => error instanceof Error && error.message === validationMessage)).toBe(true);
        expect(flattened).toContain(sourceCloseError);
        expect(sourceCloseAttempts).toBe(failOnAttempt);
        expect(sourceHandles).toHaveLength(failOnAttempt);
        const failedSource = sourceHandles.at(-1);
        if (!failedSource) throw new Error('inspection did not expose its source connection');
        const gate = gateHandles.at(-1);
        if (!gate) throw new Error('inspection did not expose its paired admission gate');
        expect(failedSource.query<{ value: number | bigint }, []>('SELECT 1 AS value').get()?.value).toBe(
          failurePoint === 'schema' ? 1n : 1,
        );
        expect(gate.inTransaction).toBe(true);
        expect(readFileSync(fixture.file)).toEqual(before);
        expect(existsSync(path.join(fixture.root, PROJECT_UPGRADE_OPERATION_PATH))).toBe(false);
        expect(existsSync(path.join(fixture.root, PROJECT_ACTIVATION_PATH))).toBe(false);
        expect(() => acquireStorageReadAdmission(fixture.root, image.binding.workspace_id, relative)).toThrow(
          /pending workspace database closes remain unresolved/u,
        );
        expect(sourceCloseAttempts).toBe(failOnAttempt + 1);
        expect(sourceHandles.at(-1)).toBe(failedSource);
        expect(failedSource.query<{ value: number | bigint }, []>('SELECT 1 AS value').get()?.value).toBe(
          failurePoint === 'schema' ? 1n : 1,
        );
        expect(gate.inTransaction).toBe(true);
        expect(readFileSync(fixture.file)).toEqual(before);

        restoreSpies();
        retryPendingWorkspaceDatabaseCloses();
        expect(() => failedSource.query('SELECT 1 AS value').get()).toThrow();
        expect(() => gate.query('SELECT 1 AS value').get()).toThrow();
        const admitted = acquireStorageReadAdmission(fixture.root, image.binding.workspace_id, relative);
        admitted.close();
        expect(readFileSync(fixture.file)).toEqual(before);
      },
      relative,
    );
  });
}

test.skipIf(process.platform !== 'linux')('capture transfers cleanup custody before post-open identity guards', () => {
  withExistingDatabaseFixture('workspace-db-capture-transfer-', (fixture, addCleanup) => {
    const backup = fixture.file + '.owned-backup';
    let captured: Database | undefined;
    let closed = false;

    let openError: unknown;
    try {
      openUnadmittedWorkspaceDatabase(fixture.root, 'db/workspace.sqlite', false, false, (database) => {
        captured = database;
        addCleanup(() => {
          if (!closed) {
            closeNativeWorkspaceDatabase(database);
            closed = true;
          }
        });
        renameSync(fixture.file, backup);
        writeFileSync(fixture.file, '', { flag: 'wx' });
      });
    } catch (error) {
      openError = error;
    }

    expect(openError).toBeInstanceOf(Error);
    expect(String(openError)).toMatch(/file or parent changed during open/u);
    if (!captured) throw new Error('capture callback did not observe the native database');
    const database = captured;
    expect(() => workspaceDatabaseFileIdentity(database)).toThrow(/no verified existing-file identity/u);
    expect(database.query<{ value: number }, []>('SELECT 1 AS value').get()).toEqual({ value: 1 });
    closeNativeWorkspaceDatabase(database);
    closed = true;
  });
});

test('reusing one admission cannot replace its existing source connection owner', () => {
  withExistingDatabaseFixture('workspace-db-admission-reuse-', (fixture, addCleanup) => {
    const relative = 'db/workspace.sqlite';
    const workspaceId = 'a'.repeat(64);
    const admission = acquireStorageReadAdmission(fixture.root, workspaceId, relative);
    const source = openExistingWorkspaceDatabaseWithAdmission(fixture.root, relative, admission, false);
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    let sourceCloseAttempts = 0;
    let sourceClosed = false;
    let pairedCloseCompleted = false;
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      if (this === source) sourceCloseAttempts += 1;
      const result = originalClose.call(this, force);
      if (this === source) sourceClosed = true;
      return result;
    });
    addCleanup(() => {
      if (!pairedCloseCompleted) {
        try {
          closeWorkspaceDatabaseWithAdmission(source);
        } finally {
          if (!sourceClosed) originalClose.call(source, true);
        }
      }
    });
    addCleanup(() => closeSpy.mockRestore());

    expect(() => openExistingWorkspaceDatabaseWithAdmission(fixture.root, relative, admission, false)).toThrow(
      /admission already owns a database/u,
    );
    assertWorkspaceDatabaseAdmission(source, fixture.root, relative, workspaceId);
    expect(source.query<{ value: number }, []>('SELECT 1 AS value').get()).toEqual({ value: 1 });
    closeWorkspaceDatabaseWithAdmission(source);
    pairedCloseCompleted = true;
    expect(sourceCloseAttempts).toBe(1);
    expect(sourceClosed).toBe(true);
  });
});

test('fresh factory closes its acquired gate when the pre-open identity guard fails', () => {
  withExistingDatabaseFixture('workspace-db-factory-gate-guard-', (fixture, addCleanup) => {
    const relative = 'db/workspace.sqlite';
    const workspaceId = 'b'.repeat(64);
    const gatePath = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
    const displacedGatePath = gatePath + '.captured';
    let closeCapturedAdmission: (() => void) | undefined;
    const gateReceivers: Database[] = [];
    let gateCloseAttempts = 0;
    let openerCalls = 0;

    const nativeFreeze = Reflect.get(Object, 'freeze') as <T>(value: T) => Readonly<T>;
    const nativeExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    const nativeClose = Reflect.get(Database.prototype, 'close') as (this: Database, force?: boolean) => void;
    const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
      if (sql.trim().toUpperCase() === 'BEGIN DEFERRED') gateReceivers.push(this);
      return nativeExec.call(this, sql);
    });
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
      this: Database,
      force?: boolean,
    ): void {
      if (this === gateReceivers[0]) gateCloseAttempts += 1;
      return nativeClose.call(this, force);
    });
    const freezeSpy = spyOn(Object, 'freeze').mockImplementation(<T>(value: T): Readonly<T> => {
      const frozen = nativeFreeze(value);
      const actualAdmission: unknown = frozen;
      if (typeof actualAdmission === 'object' && actualAdmission !== null && 'schema' in actualAdmission) {
        const schema: unknown = Reflect.get(actualAdmission, 'schema');
        const savedClose: unknown = Reflect.get(actualAdmission, 'close');
        if (schema === 'VidaStorageReadAdmission/v1' && typeof savedClose === 'function') {
          closeCapturedAdmission = () => {
            Reflect.apply(savedClose, actualAdmission, []);
          };
          renameSync(gatePath, displacedGatePath);
          writeFileSync(gatePath, '', { flag: 'wx' });
        }
      }
      return frozen;
    });
    addCleanup(() => freezeSpy.mockRestore());
    addCleanup(() => execSpy.mockRestore());
    addCleanup(() => closeSpy.mockRestore());
    addCleanup(() => closeCapturedAdmission?.());

    let openError: unknown;
    try {
      openDatabaseWithStorageAdmission(fixture.root, workspaceId, relative, () => {
        openerCalls += 1;
        throw new Error('source opener ran before its admission identity check');
      });
    } catch (error) {
      openError = error;
    }

    expect(openError).toBeInstanceOf(Error);
    expect(String(openError)).toMatch(/gate file or parent was replaced/u);
    expect(openerCalls).toBe(0);
    expect(closeCapturedAdmission).toBeDefined();
    expect(gateReceivers).toHaveLength(1);
    expect(gateCloseAttempts).toBe(1);
    const gate = gateReceivers[0];
    if (!gate) throw new Error('gate transaction receiver was not captured');
    expect(() => gate.query('SELECT 1').get()).toThrow();
  });
});

test('capture failure retains the exact native handle until shared retry closes it', () => {
  withExistingDatabaseFixture('workspace-db-close-retry-', (fixture, addCleanup) => {
    const captureError = new Error('injected capture interruption');
    const firstCloseError = new Error('injected first native close-boundary interruption');
    const secondCloseError = new Error('injected second native close-boundary interruption');
    // oxlint-disable-next-line typescript/unbound-method -- Forward only with the exact native receiver below.
    const originalClose = Database.prototype.close;
    let captured: Database | undefined;
    let closeAttempts = 0;
    let closed = false;
    // This interrupts before native close; it tests cleanup custody, not native I/O close failure.
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      if (this === captured) {
        closeAttempts += 1;
        if (closeAttempts === 1) throw firstCloseError;
        if (closeAttempts === 2) throw secondCloseError;
      }
      const result = originalClose.call(this, force);
      if (this === captured) closed = true;
      return result;
    });
    addCleanup(() => closeSpy.mockRestore());

    let openError: unknown;
    try {
      openUnadmittedWorkspaceDatabase(fixture.root, 'db/workspace.sqlite', false, true, (database) => {
        captured = database;
        addCleanup(() => {
          if (!closed) {
            closeNativeWorkspaceDatabase(database);
            closed = true;
          }
        });
        throw captureError;
      });
    } catch (error) {
      openError = error;
    }

    expect(openError).toBe(captureError);
    expect(closeAttempts).toBe(0);
    if (!captured) throw new Error('capture callback did not observe the native database');
    const database = captured;
    expect(database.query<{ value: bigint }, []>('SELECT 1 AS value').get()).toEqual({ value: 1n });

    let callerCloseError: unknown;
    try {
      closeNativeWorkspaceDatabase(database);
    } catch (error) {
      callerCloseError = error;
    }
    expect(callerCloseError).toBe(firstCloseError);
    expect(closeAttempts).toBe(1);
    expect(() => retainFailedWorkspaceDatabaseClose(database, () => {})).toThrow(/another cleanup owner/u);

    let retryError: unknown;
    try {
      retryPendingWorkspaceDatabaseCloses();
    } catch (error) {
      retryError = error;
    }
    expect(retryError).toBeInstanceOf(AggregateError);
    if (!(retryError instanceof AggregateError))
      throw new Error('expected aggregate shared retry failure', { cause: retryError });
    expect(retryError.errors).toEqual([secondCloseError]);
    expect(database.query<{ value: bigint }, []>('SELECT 1 AS value').get()).toEqual({ value: 1n });

    retryPendingWorkspaceDatabaseCloses();
    expect(closed).toBe(true);
    expect(closeAttempts).toBe(3);
    retryPendingWorkspaceDatabaseCloses();
    expect(closeAttempts).toBe(3);
  });
});

test('raw open without capture keeps verified identity and normal native close behavior', () => {
  withExistingDatabaseFixture('workspace-db-no-capture-', (fixture, addCleanup) => {
    const database = openUnadmittedWorkspaceDatabase(fixture.root, 'db/workspace.sqlite', false);
    let closed = false;
    addCleanup(() => {
      if (!closed) {
        closeNativeWorkspaceDatabase(database);
        closed = true;
      }
    });

    const identity = workspaceDatabaseFileIdentity(database);
    expect(identity.dev).toBeGreaterThanOrEqual(0);
    expect(identity.ino).toBeGreaterThan(0);
    expect(database.query<{ value: number }, []>('SELECT 1 AS value').get()).toEqual({ value: 1 });
    closeNativeWorkspaceDatabase(database);
    closed = true;
  });
});
