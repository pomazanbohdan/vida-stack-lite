import { expect, spyOn, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  closeNativeWorkspaceDatabase,
  openUnadmittedWorkspaceDatabase,
  retainFailedWorkspaceDatabaseClose,
  retryPendingWorkspaceDatabaseCloses,
  workspaceDatabaseFileIdentity,
} from '../src/config/workspace-database-raw.js';
import {
  acquireStorageReadAdmission,
  assertWorkspaceDatabaseAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openDatabaseWithStorageAdmission,
  openExistingWorkspaceDatabaseWithAdmission,
} from '../src/config/storage-read-admission.js';

const testBudgetNs = 5_000_000_000n;

interface ExistingDatabaseFixture {
  readonly root: string;
  readonly file: string;
}

type FixtureCleanup = () => void;

function withExistingDatabaseFixture(
  prefix: string,
  body: (fixture: ExistingDatabaseFixture, addCleanup: (cleanup: FixtureCleanup) => void) => void,
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
    mkdirSync(path.join(root, 'db'));
    const file = path.join(root, 'db/workspace.sqlite');
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
