import { describe, expect, spyOn, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import * as fs from 'node:fs';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveWorkspaceId } from '../src/workspace-identity.js';
import { loadRuntimeConfig } from '../src/config/runtime-config.js';
import {
  acquireStorageReadAdmission,
  assertOnlyStorageAdmissionGate,
  assertWorkspaceDatabaseAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openAdmittedWorkspaceDatabase,
  openExistingWorkspaceDatabaseWithAdmission,
  type StorageReadAdmission,
  withExclusiveStorageAdmission,
  withExclusiveServiceOperationAdmission,
} from '../src/config/storage-read-admission.js';
import {
  closeNativeWorkspaceDatabase,
  openUnadmittedWorkspaceDatabase,
  retryPendingWorkspaceDatabaseCloses,
} from '../src/config/workspace-database-raw.js';
import { inspectProjectUpgrade } from '../src/config/project-upgrade.js';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.js';
import { expectRejection, rejectionReason } from './helpers/expect-rejection.ts';

test('upgrade inspection accepts only a verified admission gate without publishing product state', async () => {
  const started = process.hrtime.bigint();
  const root = await makeFreshRepository('upgrade-admission-inspection-');
  let passed = false;
  try {
    const config = loadRuntimeConfig(root);
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
    const lease = acquireStorageReadAdmission(root, workspaceId, '.vida/unused.sqlite');
    lease.close();
    const file = path.join(root, '.vida/storage-admission.v1.sqlite');
    const before = readFileSync(file);
    const operation = inspectProjectUpgrade(root, {
      operation_id: 'verified-gate-inspection',
      actor: 'test-owner',
      instruction_ref: 'existing admission gate inspection',
    });
    expect(operation.plan.workspace_id).toBe(workspaceId);
    expect(operation.plan.database_mode).toBe('fresh');
    expect(readFileSync(file)).toEqual(before);
    expect(() => readFileSync(path.join(root, '.vida/project-upgrade.v1.json'))).toThrow();
    writeFileSync(path.join(root, '.vida/foreign.json'), '{}', { flag: 'wx' });
    expect(() => inspectProjectUpgrade(root, operation.plan)).toThrow(
      'VIDA project upgrade: existing VIDA data requires its retained operation',
    );
    expect(readFileSync(file)).toEqual(before);
    passed = true;
  } finally {
    if (passed && process.hrtime.bigint() - started < 5_000_000_000n) rmSync(root, { recursive: true, force: true });
    else console.error(`Retained failed or expired admission inspection fixture: ${root}`);
  }
});

describe('fresh storage admission gate', () => {
  test('initializes the exact fresh zero-byte gate and retains a valid gate on reopen', () => {
    const fixture = openRepositoryFixture('fresh-storage-gate-');
    try {
      const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
      const lease = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      lease.close();
      const initialBytes = readFileSync(file);
      expect(initialBytes.length).toBeGreaterThan(0);
      const again = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      again.close();
      expect(readFileSync(file)).toEqual(initialBytes);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('matches exact large stat identities while initializing the real zero-byte gate', () => {
    const fixture = openRepositoryFixture('large-stat-storage-gate-');
    const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
    const expectedDev = 9_007_199_254_740_992n;
    const expectedIno = 9_007_199_254_740_993n;
    const originalStat = fs.lstatSync;
    const stats = spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
      const observed = originalStat(...args);
      if (
        observed !== undefined &&
        args[0] === file &&
        args[1] !== undefined &&
        typeof args[1] === 'object' &&
        Reflect.get(args[1], 'bigint') === true
      ) {
        const exact = Object.create(observed) as typeof observed;
        Reflect.set(exact, 'dev', expectedDev);
        Reflect.set(exact, 'ino', expectedIno);
        return exact;
      }
      return observed;
    }) as typeof fs.lstatSync);
    let passed = false;
    try {
      const lease = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      lease.close();
      expect(readFileSync(file).length).toBeGreaterThan(0);
      passed = true;
    } finally {
      stats.mockRestore();
      if (passed) rmSync(fixture.root, { recursive: true, force: true });
      else console.error(`Retained large stat storage gate fixture: ${fixture.root}`);
    }
  });

  test('completes an existing exact zero-byte gate without recreating source storage', () => {
    const fixture = openRepositoryFixture('interrupted-storage-gate-');
    const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
    try {
      writeFileSync(file, '', { flag: 'wx' });
      const lease = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      lease.close();
      expect(readFileSync(file).length).toBeGreaterThan(0);
      expect(() => readFileSync(path.join(fixture.root, '.vida/unused.sqlite'))).toThrow();
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('denies a persisted one-page empty database without changing its bytes', () => {
    const fixture = openRepositoryFixture('malformed-storage-gate-');
    const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
    try {
      const malformed = new Database(file);
      malformed.exec('CREATE TABLE transient_gate_probe(value TEXT); DROP TABLE transient_gate_probe;');
      malformed.close();
      const before = readFileSync(file);
      expect(() => acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite')).toThrow(
        /zero-byte gate preimage/u,
      );
      expect(readFileSync(file)).toEqual(before);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('denies a different workspace identity and gate sidecars', () => {
    const fixture = openRepositoryFixture('storage-gate-identity-');
    const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
    try {
      const lease = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      lease.close();
      const before = readFileSync(file);
      expect(() => acquireStorageReadAdmission(fixture.root, 'd'.repeat(64), '.vida/unused.sqlite')).toThrow(
        /gate identity differs/u,
      );
      expect(readFileSync(file)).toEqual(before);
      writeFileSync(file + '-wal', 'unexpected sidecar', { flag: 'wx' });
      expect(() => acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite')).toThrow(
        /gate sidecar is present/u,
      );
      expect(readFileSync(file)).toEqual(before);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('expires a closing read lease and retries its exact gate before a new read owner', () => {
    const started = process.hrtime.bigint();
    const fixture = openRepositoryFixture('storage-reader-close-retry-');
    const relative = '.vida/unused.sqlite';
    writeFileSync(path.join(fixture.root, relative), '', { flag: 'wx' });
    const admission = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
    const firstCloseError = new Error('injected reader close interruption');
    const secondCloseError = new Error('injected reader retry interruption');
    // oxlint-disable-next-line typescript/unbound-method -- Forward only with the exact native receiver below.
    const originalClose = Database.prototype.close;
    let gate: Database | undefined;
    let next: StorageReadAdmission | undefined;
    let closeAttempts = 0;
    let closed = false;
    let passed = false;
    let bodyError: unknown;
    const cleanupErrors: unknown[] = [];
    // Interrupt before native close, to qualify cleanup custody rather than native I/O failure.
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      // oxlint-disable-next-line typescript/no-this-alias -- Capture the exact native handle for cleanup custody.
      gate ??= this;
      if (this === gate) {
        closeAttempts += 1;
        if (closeAttempts === 1) throw firstCloseError;
        if (closeAttempts === 2) throw secondCloseError;
      }
      const result = originalClose.call(this, force);
      if (this === gate) closed = true;
      return result;
    });
    try {
      expect(() => admission.close()).toThrow(/cleanup custody/u);
      expect(closeAttempts).toBe(1);
      expect(() => openExistingWorkspaceDatabaseWithAdmission(fixture.root, relative, admission, false)).toThrow(
        /invalid or expired/u,
      );
      expect(readFileSync(path.join(fixture.root, relative))).toEqual(Buffer.alloc(0));
      expect(() => {
        next = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
      }).toThrow(/pending workspace database closes/u);
      expect(next).toBeUndefined();
      expect(closeAttempts).toBe(2);
      expect(closed).toBe(false);
      next = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
      expect(closed).toBe(true);
      expect(closeAttempts).toBe(3);
      expect(() => openExistingWorkspaceDatabaseWithAdmission(fixture.root, relative, admission, false)).toThrow(
        /invalid or expired/u,
      );
      next.close();
      expect(closeAttempts).toBe(3);
      passed = true;
    } catch (error) {
      bodyError = error;
    } finally {
      closeSpy.mockRestore();
      for (const owned of [admission, next]) {
        try {
          owned?.close();
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (passed && cleanupErrors.length === 0 && process.hrtime.bigint() - started < 5_000_000_000n) {
        try {
          rmSync(fixture.root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
          console.error(`Retained reader close fixture after cleanup failure: ${fixture.root}`);
        }
      } else console.error(`Retained failed or expired reader close fixture: ${fixture.root}`);
    }
    if (bodyError !== undefined && cleanupErrors.length)
      throw new AggregateError([bodyError, ...cleanupErrors], 'reader close test and cleanup failed');
    if (bodyError !== undefined) throw bodyError;
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'reader close fixture cleanup failed');
  });

  test('retries a paired source and gate close once per cleanup pass before admitting a new reader', () => {
    const started = process.hrtime.bigint();
    const fixture = openRepositoryFixture('storage-paired-close-retry-');
    const relative = '.vida/paired.sqlite';
    writeFileSync(path.join(fixture.root, relative), '', { flag: 'wx' });
    let source: Database | undefined;
    const sourceCloseError = new Error('injected paired source close interruption');
    const gateCloseError = new Error('injected paired gate close interruption');
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    let gate: Database | undefined;
    let sourceCloseAttempts = 0;
    let gateCloseAttempts = 0;
    let sourceClosed = false;
    let gateClosed = false;
    let reader: StorageReadAdmission | undefined;
    let passed = false;
    let bodyError: unknown;
    const cleanupErrors: unknown[] = [];
    const closeOrder: string[] = [];
    const deferredBegins: Database[] = [];
    // Inject before Bun's native close call to exercise paired cleanup ordering and custody.
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      if (this === source) {
        sourceCloseAttempts += 1;
        if (sourceCloseAttempts === 1) {
          closeOrder.push('source-interrupted');
          throw sourceCloseError;
        }
      }
      if (this === gate) {
        gateCloseAttempts += 1;
        if (gateCloseAttempts <= 2) {
          closeOrder.push(`gate-interrupted-${gateCloseAttempts}`);
          throw gateCloseError;
        }
      }
      const result = Reflect.apply(originalClose, this, [force]);
      if (this === source) {
        sourceClosed = true;
        closeOrder.push('source-closed');
      }
      if (this === gate) {
        gateClosed = true;
        closeOrder.push('gate-closed');
      }
      return result;
    });
    const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
      if (sql.trim().toUpperCase() === 'BEGIN DEFERRED') {
        // oxlint-disable-next-line typescript/no-this-alias -- Capture the exact admission handle at BEGIN DEFERRED.
        gate ??= this;
        deferredBegins.push(this);
      }
      return originalExec.call(this, sql);
    });

    try {
      source = openAdmittedWorkspaceDatabase(fixture.root, relative, fixture.workspaceId, false);
      const ownedSource = source;
      expect(gate).toBeDefined();
      expect(deferredBegins).toHaveLength(1);
      expect(deferredBegins[0]).toBe(gate);
      let sourceFailure: unknown;
      try {
        closeWorkspaceDatabaseWithAdmission(source);
      } catch (error) {
        sourceFailure = error;
      }
      expect(sourceFailure).toBeInstanceOf(AggregateError);
      if (!(sourceFailure instanceof AggregateError))
        throw new Error('expected paired source close error', { cause: sourceFailure });
      expect(sourceFailure.errors).toContain(sourceCloseError);
      expect(sourceCloseAttempts).toBe(1);
      expect(sourceClosed).toBe(false);
      expect(gateCloseAttempts).toBe(0);
      expect(gateClosed).toBe(false);
      expect(gate!.inTransaction).toBe(true);
      expect(gate!.query<{ value: bigint }, []>('SELECT 1 AS value').get()?.value).toBe(1n);
      expect(source.query<{ value: number }, []>('SELECT 1 AS value').get()?.value).toBe(1);
      expect(() => assertWorkspaceDatabaseAdmission(ownedSource, fixture.root, relative, fixture.workspaceId)).toThrow(
        /lacks a live paired admission lease/u,
      );

      const firstReaderBegins = deferredBegins.length;
      expect(() => {
        reader = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
      }).toThrow(/pending workspace database closes remain unresolved/u);
      expect(reader).toBeUndefined();
      expect(closeOrder).toEqual(['source-interrupted', 'source-closed', 'gate-interrupted-1']);
      expect(sourceCloseAttempts).toBe(2);
      expect(sourceClosed).toBe(true);
      expect(gateCloseAttempts).toBe(1);
      expect(gateClosed).toBe(false);
      expect(deferredBegins).toHaveLength(firstReaderBegins);
      expect(gate!.query<{ value: bigint }, []>('SELECT 1 AS value').get()?.value).toBe(1n);

      expect(() => {
        reader = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
      }).toThrow(/pending workspace database closes remain unresolved/u);
      expect(reader).toBeUndefined();
      expect(closeOrder).toEqual(['source-interrupted', 'source-closed', 'gate-interrupted-1', 'gate-interrupted-2']);
      expect(sourceCloseAttempts).toBe(2);
      expect(gateCloseAttempts).toBe(2);
      expect(gateClosed).toBe(false);
      expect(deferredBegins).toHaveLength(firstReaderBegins);

      reader = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
      expect(closeOrder).toEqual([
        'source-interrupted',
        'source-closed',
        'gate-interrupted-1',
        'gate-interrupted-2',
        'gate-closed',
      ]);
      expect(sourceCloseAttempts).toBe(2);
      expect(gateCloseAttempts).toBe(3);
      expect(gateClosed).toBe(true);
      expect(deferredBegins).toHaveLength(firstReaderBegins + 1);
      reader.close();
      reader = undefined;
      expect(sourceCloseAttempts).toBe(2);
      expect(gateCloseAttempts).toBe(3);
      passed = true;
    } catch (error) {
      bodyError = error;
    } finally {
      closeSpy.mockRestore();
      execSpy.mockRestore();
      if (source || !gateClosed) {
        try {
          if (source) closeWorkspaceDatabaseWithAdmission(source);
          else if (gate) closeNativeWorkspaceDatabase(gate);
          gateClosed = true;
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      try {
        reader?.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (passed && cleanupErrors.length === 0 && process.hrtime.bigint() - started < 5_000_000_000n) {
        try {
          rmSync(fixture.root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
          console.error(`Retained paired close fixture after cleanup failure: ${fixture.root}`);
        }
      } else console.error(`Retained failed or expired paired close fixture: ${fixture.root}`);
    }
    if (bodyError !== undefined && cleanupErrors.length)
      throw new AggregateError([bodyError, ...cleanupErrors], 'paired close test and cleanup failed');
    if (bodyError !== undefined) throw bodyError;
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'paired close fixture cleanup failed');
  });

  test('retains an exclusive gate handle after close faults and retries it before another owner', async () => {
    const started = process.hrtime.bigint();
    const fixture = openRepositoryFixture('storage-gate-close-retry-');
    const initialized = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
    initialized.close();

    const firstCloseError = new Error('injected first exclusive gate close interruption');
    const secondCloseError = new Error('injected second exclusive gate close interruption');
    const exclusiveBegins: Database[] = [];
    let gateHandle: Database | undefined;
    let armed = false;
    let gateCloseAttempts = 0;
    let gateClosed = false;
    let ownerChecks = 0;
    let operationCalls = 0;
    let savedProof: { readonly owner: string; assertActive(this: void): void } | undefined;
    let bodyError: unknown;
    const cleanupErrors: unknown[] = [];
    let passed = false;

    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    // This fault is injected before the native close call; it tests handle custody, not a native I/O close fault.
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      if (armed) {
        // oxlint-disable-next-line typescript/no-this-alias -- Capture the exact owned native handle after arming.
        if (!gateHandle) gateHandle = this;
        if (this === gateHandle) {
          gateCloseAttempts += 1;
          if (gateCloseAttempts === 1) throw firstCloseError;
          if (gateCloseAttempts === 2) throw secondCloseError;
        }
      }
      const result = Reflect.apply(originalClose, this, [force]);
      if (this === gateHandle) gateClosed = true;
      return result;
    });
    const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
      if (sql.trim().toUpperCase() === 'BEGIN EXCLUSIVE') exclusiveBegins.push(this);
      return originalExec.call(this, sql);
    });

    const verifyOwner = () => {
      ownerChecks += 1;
      return 'held service-operation owner';
    };
    const invoke = (operation: () => Promise<void>) =>
      withExclusiveServiceOperationAdmission(fixture.root, fixture.workspaceId, verifyOwner, async (proof) => {
        operationCalls += 1;
        await operation();
        proof.assertActive();
      });

    try {
      const firstAttempt = withExclusiveServiceOperationAdmission(
        fixture.root,
        fixture.workspaceId,
        verifyOwner,
        async (proof) => {
          operationCalls += 1;
          savedProof = proof;
          armed = true;
        },
      );
      await expectRejection(firstAttempt, /injected first exclusive gate close interruption/u);
      expect(await rejectionReason(firstAttempt)).toBe(firstCloseError);
      expect(gateHandle).toBeDefined();
      expect(gateCloseAttempts).toBe(1);
      expect(gateClosed).toBe(false);
      expect(gateHandle!.query<{ value: bigint }, []>('SELECT 1 AS value').get()?.value).toBe(1n);
      expect(() => savedProof!.assertActive()).toThrow(/capability expired/u);
      expect(exclusiveBegins).toHaveLength(1);
      expect(exclusiveBegins[0]).toBe(gateHandle);

      const ownerChecksBeforeRetry = ownerChecks;
      const callbacksBeforeRetry = operationCalls;
      const retryAttempt = invoke(async () => {});
      const retryReason = await retryAttempt.then(
        () => undefined,
        (error: unknown) => error,
      );
      await expectRejection(retryAttempt, /pending.*(?:close|cleanup)|(?:close|cleanup).*pending/u);
      const includesError = (error: unknown, target: unknown): boolean =>
        error === target ||
        (error instanceof AggregateError && error.errors.some((nested) => includesError(nested, target)));
      expect(includesError(retryReason, secondCloseError)).toBe(true);
      expect(gateCloseAttempts).toBe(2);
      expect(gateClosed).toBe(false);
      expect(ownerChecks).toBe(ownerChecksBeforeRetry);
      expect(operationCalls).toBe(callbacksBeforeRetry);
      expect(exclusiveBegins).toHaveLength(1);
      expect(exclusiveBegins[0]).toBe(gateHandle);
      expect(gateHandle!.query<{ value: bigint }, []>('SELECT 1 AS value').get()?.value).toBe(1n);

      await invoke(async () => {
        expect(gateCloseAttempts).toBe(3);
        expect(gateClosed).toBe(true);
      });
      expect(gateCloseAttempts).toBe(3);
      expect(exclusiveBegins).toHaveLength(2);

      await invoke(async () => {
        expect(gateCloseAttempts).toBe(3);
      });
      expect(gateCloseAttempts).toBe(3);
      expect(exclusiveBegins).toHaveLength(3);
      passed = true;
    } catch (error) {
      bodyError = error;
    } finally {
      armed = false;
      closeSpy.mockRestore();
      execSpy.mockRestore();
      if (gateHandle && !gateClosed) {
        try {
          closeNativeWorkspaceDatabase(gateHandle);
          gateClosed = true;
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      const withinDeadline = process.hrtime.bigint() - started < 5_000_000_000n;
      if (passed && cleanupErrors.length === 0 && withinDeadline) {
        try {
          rmSync(fixture.root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
          console.error(`Retained storage gate fixture after cleanup failure: ${fixture.root}`);
        }
      } else {
        console.error(`Retained failed, expired, or unclosed storage gate fixture: ${fixture.root}`);
      }
    }
    if (bodyError !== undefined && cleanupErrors.length > 0)
      throw new AggregateError([bodyError, ...cleanupErrors], 'storage gate retry test and cleanup failed');
    if (bodyError !== undefined) throw bodyError;
    if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, 'storage gate retry fixture cleanup failed');
    expect(passed).toBe(true);
  });

  test('retains a captured source and its exact exclusive gate until source close retry succeeds', async () => {
    const started = process.hrtime.bigint();
    const fixture = openRepositoryFixture('storage-captured-source-close-retry-');
    const relative = '.vida/aux.sqlite';
    const auxPath = path.join(fixture.root, relative);
    const initialized = new Database(auxPath, { create: true, strict: true });
    initialized.exec('CREATE TABLE fixture(value INTEGER); INSERT INTO fixture VALUES (1);');
    initialized.close();
    const initializedGate = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
    initializedGate.close();

    const firstSourceCloseError = new Error('injected first captured source close interruption');
    const secondSourceCloseError = new Error('injected second captured source close interruption');
    const bodyError = new Error('injected captured source body failure');
    const sourceCloseOrder: string[] = [];
    const exclusiveBegins: Database[] = [];
    let source: Database | undefined;
    let sourceCloseAttempts = 0;
    let sourceClosed = false;
    let gate: Database | undefined;
    let gateClosed = false;
    let gateCloseAttempts = 0;
    let gateRollbackCount = 0;
    let verifierCalls = 0;
    let bodyCalls = 0;
    let verifiedOwner:
      | { readonly captureSource: (database: Database) => void; readonly closeSource: (database: Database) => void }
      | undefined;
    let bodyErrorObserved = false;
    let passed = false;
    let operationError: unknown;
    const cleanupErrors: unknown[] = [];
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      if (this === source) {
        sourceCloseAttempts += 1;
        if (sourceCloseAttempts === 1) {
          sourceCloseOrder.push('source-interrupted-1');
          throw firstSourceCloseError;
        }
        if (sourceCloseAttempts === 2) {
          sourceCloseOrder.push('source-interrupted-2');
          throw secondSourceCloseError;
        }
      }
      if (this === gate) gateCloseAttempts += 1;
      const result = Reflect.apply(originalClose, this, [force]);
      if (this === source) {
        sourceClosed = true;
        sourceCloseOrder.push('source-closed');
      }
      if (this === gate) {
        gateClosed = true;
        sourceCloseOrder.push('gate-closed');
      }
      return result;
    });
    const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
      const normalized = sql.trim().toUpperCase();
      if (normalized === 'BEGIN EXCLUSIVE') {
        exclusiveBegins.push(this);
        gate = exclusiveBegins[0];
      }
      if (this === gate && normalized === 'ROLLBACK') {
        gateRollbackCount += 1;
        sourceCloseOrder.push('gate-rollback');
      }
      return Reflect.apply(originalExec, this, [sql]);
    });
    const includesError = (error: unknown, target: unknown): boolean =>
      error === target ||
      (error instanceof AggregateError && error.errors.some((nested) => includesError(nested, target)));
    const invoke = () =>
      withExclusiveStorageAdmission(
        fixture.root,
        fixture.workspaceId,
        (sourceOwner) => {
          verifierCalls += 1;
          verifiedOwner = sourceOwner;
          const opened = openUnadmittedWorkspaceDatabase(
            fixture.root,
            relative,
            false,
            true,
            sourceOwner.captureSource,
          );
          source ??= opened;
          return 'held Host fence';
        },
        async (proof) => {
          bodyCalls += 1;
          if (!verifiedOwner) throw new Error('exclusive verifier did not provide its captured source owner');
          expect(proof.captureSource).toBe(verifiedOwner.captureSource);
          expect(proof.closeSource).toBe(verifiedOwner.closeSource);
          if (bodyCalls === 1) throw bodyError;
          proof.assertActive();
        },
      );

    try {
      const firstAttempt = invoke();
      const firstError = await firstAttempt.then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(firstError).toBeDefined();
      expect(includesError(firstError, bodyError)).toBe(true);
      expect(includesError(firstError, firstSourceCloseError)).toBe(true);
      bodyErrorObserved = true;
      expect(source).toBeDefined();
      expect(sourceCloseAttempts).toBe(1);
      let competingCloseError: unknown;
      try {
        closeNativeWorkspaceDatabase(source!);
      } catch (error) {
        competingCloseError = error;
      }
      expect(String(competingCloseError)).toMatch(/another cleanup owner/u);
      expect(sourceCloseAttempts).toBe(1);
      expect(sourceClosed).toBe(false);
      expect(source!.query<{ value: bigint }, []>('SELECT value FROM fixture').get()?.value).toBe(1n);
      expect(gate).toBeDefined();
      expect(gate!.inTransaction).toBe(true);
      expect(gateRollbackCount).toBe(0);
      expect(gateCloseAttempts).toBe(0);
      expect(gateClosed).toBe(false);
      expect(exclusiveBegins).toHaveLength(1);
      expect(exclusiveBegins[0]).toBe(gate);

      const verifierCallsBeforeRetry = verifierCalls;
      const bodyCallsBeforeRetry = bodyCalls;
      const retryAttempt = invoke();
      const retryError = await retryAttempt.then(
        () => undefined,
        (error: unknown) => error,
      );
      await expectRejection(retryAttempt, /pending.*(?:close|cleanup)|(?:close|cleanup).*pending/u);
      expect(includesError(retryError, secondSourceCloseError)).toBe(true);
      expect(sourceCloseAttempts).toBe(2);
      expect(sourceClosed).toBe(false);
      expect(source!.query<{ value: bigint }, []>('SELECT value FROM fixture').get()?.value).toBe(1n);
      expect(gate!.inTransaction).toBe(true);
      expect(gateRollbackCount).toBe(0);
      expect(gateCloseAttempts).toBe(0);
      expect(verifierCalls).toBe(verifierCallsBeforeRetry);
      expect(bodyCalls).toBe(bodyCallsBeforeRetry);
      expect(exclusiveBegins).toHaveLength(1);

      await invoke();
      expect(sourceCloseAttempts).toBe(3);
      expect(sourceClosed).toBe(true);
      expect(gateRollbackCount).toBeGreaterThan(0);
      expect(gateCloseAttempts).toBeGreaterThan(0);
      expect(sourceCloseOrder.indexOf('source-closed')).toBeLessThan(sourceCloseOrder.indexOf('gate-rollback'));
      expect(sourceCloseOrder.indexOf('gate-rollback')).toBeLessThan(sourceCloseOrder.indexOf('gate-closed'));
      expect(exclusiveBegins).toHaveLength(2);
      passed = true;
    } catch (error) {
      operationError ??= error;
    } finally {
      closeSpy.mockRestore();
      execSpy.mockRestore();
      try {
        retryPendingWorkspaceDatabaseCloses();
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (
        passed &&
        bodyErrorObserved &&
        cleanupErrors.length === 0 &&
        process.hrtime.bigint() - started < 5_000_000_000n
      ) {
        try {
          rmSync(fixture.root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
          console.error(`Retained captured source close fixture after cleanup failure: ${fixture.root}`);
        }
      } else console.error(`Retained failed or expired captured source close fixture: ${fixture.root}`);
    }
    if (operationError !== undefined && cleanupErrors.length > 0)
      throw new AggregateError([operationError, ...cleanupErrors], 'captured source close test and cleanup failed');
    if (operationError !== undefined) throw operationError;
    if (cleanupErrors.length > 0)
      throw new AggregateError(cleanupErrors, 'captured source close fixture cleanup failed');
    expect(passed).toBe(true);
  });

  test('retries captured sources once per pass and releases the gate after the last source closes', async () => {
    const started = process.hrtime.bigint();
    const fixture = openRepositoryFixture('storage-exclusive-two-source-retry-');
    const relatives = ['.vida/aux-a.sqlite', '.vida/aux-b.sqlite'] as const;
    for (const relative of relatives) {
      const initialized = new Database(path.join(fixture.root, relative), { create: true, strict: true });
      initialized.exec('CREATE TABLE fixture(value INTEGER); INSERT INTO fixture VALUES (1);');
      initialized.close();
    }
    const initializedGate = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relatives[0]);
    initializedGate.close();

    const sourceCloseError = new Error('injected second source close interruption');
    const gateCloseError = new Error('injected last-source gate close interruption');
    const captured: Database[] = [];
    const closed = new Set<Database>();
    const sourceCloseAttempts = new Map<Database, number>();
    const exclusiveBegins: Database[] = [];
    const closeOrder: string[] = [];
    let verifierCalls = 0;
    let bodyCalls = 0;
    let gateCloseAttempts = 0;
    let injectFaults = true;
    let passed = false;
    let bodyError: unknown;
    const cleanupErrors: unknown[] = [];
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      const sourceAttempts = captured.includes(this) ? (sourceCloseAttempts.get(this) ?? 0) + 1 : 0;
      if (captured.includes(this)) sourceCloseAttempts.set(this, sourceAttempts);
      if (injectFaults && this === captured[1] && sourceAttempts === 1) throw sourceCloseError;
      if (exclusiveBegins.includes(this)) {
        if (this === exclusiveBegins[0]) {
          gateCloseAttempts += 1;
          if (injectFaults && gateCloseAttempts === 1) {
            closeOrder.push('gate-close-interrupted');
            throw gateCloseError;
          }
        }
      }
      const result = Reflect.apply(originalClose, this, [force]);
      if (captured.includes(this)) closed.add(this);
      if (this === captured[1]) closeOrder.push('source-b-closed');
      if (exclusiveBegins.includes(this)) closed.add(this);
      if (this === exclusiveBegins[0]) closeOrder.push('gate-closed');
      return result;
    });
    const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
      const normalized = sql.trim().toUpperCase();
      if (normalized === 'BEGIN EXCLUSIVE') exclusiveBegins.push(this);
      if (this === exclusiveBegins[0] && normalized === 'ROLLBACK') closeOrder.push('gate-rollback');
      return Reflect.apply(originalExec, this, [sql]);
    });
    const includesError = (error: unknown, target: unknown): boolean =>
      error === target ||
      (error instanceof AggregateError && error.errors.some((nested) => includesError(nested, target)));
    const invoke = () =>
      withExclusiveStorageAdmission(
        fixture.root,
        fixture.workspaceId,
        (sourceOwner) => {
          verifierCalls += 1;
          for (const relative of relatives) {
            const source = openUnadmittedWorkspaceDatabase(fixture.root, relative, false, true, (database) => {
              captured.push(database);
              sourceOwner.captureSource(database);
            });
            expect(captured.at(-1)).toBe(source);
          }
          return 'held Host fence';
        },
        async (proof) => {
          bodyCalls += 1;
          proof.assertActive();
        },
      );

    try {
      const firstAttempt = invoke();
      const firstError = await firstAttempt.then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(includesError(firstError, sourceCloseError)).toBe(true);
      expect(captured).toHaveLength(2);
      const firstSource = captured[0]!;
      const lastSource = captured[1]!;
      const gate = exclusiveBegins[0];
      expect(gate).toBeDefined();
      expect(sourceCloseAttempts.get(firstSource)).toBe(1);
      expect(closed.has(firstSource)).toBe(true);
      expect(sourceCloseAttempts.get(lastSource)).toBe(1);
      expect(closed.has(lastSource)).toBe(false);
      expect(gate!.inTransaction).toBe(true);
      expect(closeOrder).not.toContain('gate-rollback');
      expect(gateCloseAttempts).toBe(0);

      const verifierCallsBeforeRetry = verifierCalls;
      const bodyCallsBeforeRetry = bodyCalls;
      const secondAttempt = invoke();
      const secondError = await secondAttempt.then(
        () => undefined,
        (error: unknown) => error,
      );
      await expectRejection(secondAttempt, /pending.*(?:close|cleanup)|(?:close|cleanup).*pending/u);
      expect(includesError(secondError, gateCloseError)).toBe(true);
      expect(sourceCloseAttempts.get(firstSource)).toBe(1);
      expect(sourceCloseAttempts.get(lastSource)).toBe(2);
      expect(closed.has(lastSource)).toBe(true);
      expect(gate!.inTransaction).toBe(false);
      expect(gateCloseAttempts).toBe(1);
      expect(verifierCalls).toBe(verifierCallsBeforeRetry);
      expect(bodyCalls).toBe(bodyCallsBeforeRetry);
      expect(exclusiveBegins).toHaveLength(1);
      expect(closeOrder.indexOf('source-b-closed')).toBeLessThan(closeOrder.indexOf('gate-rollback'));
      expect(closeOrder.indexOf('gate-rollback')).toBeLessThan(closeOrder.indexOf('gate-close-interrupted'));

      await invoke();
      expect(exclusiveBegins).toHaveLength(2);
      expect(captured).toHaveLength(4);
      expect(sourceCloseAttempts.get(firstSource)).toBe(1);
      expect(sourceCloseAttempts.get(lastSource)).toBe(2);
      for (const source of captured.slice(2)) {
        expect(sourceCloseAttempts.get(source)).toBe(1);
        expect(closed.has(source)).toBe(true);
      }
      expect(gateCloseAttempts).toBe(2);
      expect(closeOrder.indexOf('gate-close-interrupted')).toBeLessThan(closeOrder.indexOf('gate-closed'));
      expect(verifierCalls).toBe(2);
      expect(bodyCalls).toBe(2);
      passed = true;
    } catch (error) {
      bodyError = error;
    } finally {
      injectFaults = false;
      closeSpy.mockRestore();
      execSpy.mockRestore();
      try {
        retryPendingWorkspaceDatabaseCloses();
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (passed && cleanupErrors.length === 0 && process.hrtime.bigint() - started < 5_000_000_000n) {
        try {
          rmSync(fixture.root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
          console.error(`Retained two-source close fixture after cleanup failure: ${fixture.root}`);
        }
      } else console.error(`Retained failed or expired two-source close fixture: ${fixture.root}`);
    }
    if (bodyError !== undefined && cleanupErrors.length > 0)
      throw new AggregateError([bodyError, ...cleanupErrors], 'two-source close test and cleanup failed');
    if (bodyError !== undefined) throw bodyError;
    if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, 'two-source close fixture cleanup failed');
    expect(passed).toBe(true);
  });

  test('preserves nested body and captured-source close errors exactly once', async () => {
    const started = process.hrtime.bigint();
    const fixture = openRepositoryFixture('storage-exclusive-nested-close-error-');
    const relative = '.vida/aux.sqlite';
    const initialized = new Database(path.join(fixture.root, relative), { create: true, strict: true });
    initialized.exec('CREATE TABLE fixture(value INTEGER); INSERT INTO fixture VALUES (1);');
    initialized.close();
    const initializedGate = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
    initializedGate.close();

    const bodyError = new Error('original body error');
    const nativeCloseError = new Error('injected source close interruption');
    const nestedCloseError = new AggregateError([nativeCloseError], 'nested source close failure');
    const bodyAndCloseError = new AggregateError([bodyError, nestedCloseError], 'body and source close failed');
    let source: Database | undefined;
    let sourceCloseAttempts = 0;
    let sourceClosed = false;
    let gate: Database | undefined;
    const exclusiveBegins: Database[] = [];
    let gateClosed = false;
    let gateCloseAttempts = 0;
    let passed = false;
    let unexpectedError: unknown;
    const cleanupErrors: unknown[] = [];
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      if (this === source) {
        sourceCloseAttempts += 1;
        if (sourceCloseAttempts === 1) throw nativeCloseError;
      }
      if (this === gate) gateCloseAttempts += 1;
      const result = Reflect.apply(originalClose, this, [force]);
      if (this === source) sourceClosed = true;
      if (this === gate) gateClosed = true;
      return result;
    });
    const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
      if (sql.trim().toUpperCase() === 'BEGIN EXCLUSIVE') {
        exclusiveBegins.push(this);
        gate = exclusiveBegins[0];
      }
      return Reflect.apply(originalExec, this, [sql]);
    });
    const countError = (value: unknown, target: unknown): number => {
      if (value === target) return 1;
      if (!(value instanceof AggregateError)) return 0;
      const errors: unknown = Object.getOwnPropertyDescriptor(value, 'errors')?.value;
      if (!Array.isArray(errors)) return 0;
      let count = 0;
      for (const nested of errors as unknown[]) count += countError(nested, target);
      return count;
    };

    try {
      const attempt = withExclusiveStorageAdmission(
        fixture.root,
        fixture.workspaceId,
        (sourceOwner) => {
          const opened = openUnadmittedWorkspaceDatabase(
            fixture.root,
            relative,
            false,
            true,
            sourceOwner.captureSource,
          );
          source = opened;
          return 'held Host fence';
        },
        async (proof) => {
          try {
            proof.closeSource(source!);
          } catch {
            throw bodyAndCloseError;
          }
        },
      );
      const observedError = await attempt.then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(observedError).toBe(bodyAndCloseError);
      expect(bodyAndCloseError.errors).toHaveLength(2);
      expect(bodyAndCloseError.errors[0]).toBe(bodyError);
      expect(bodyAndCloseError.errors[1]).toBe(nestedCloseError);
      expect(nestedCloseError.errors).toEqual([nativeCloseError]);
      expect(countError(observedError, bodyError)).toBe(1);
      expect(countError(observedError, nativeCloseError)).toBe(1);
      expect(sourceCloseAttempts).toBe(1);
      expect(sourceClosed).toBe(false);
      expect(source!.query<{ value: bigint }, []>('SELECT value FROM fixture').get()?.value).toBe(1n);
      expect(gate).toBeDefined();
      expect(gate!.inTransaction).toBe(true);
      expect(gateCloseAttempts).toBe(0);

      retryPendingWorkspaceDatabaseCloses();
      expect(sourceCloseAttempts).toBe(2);
      expect(sourceClosed).toBe(true);
      expect(gateCloseAttempts).toBe(1);
      expect(gateClosed).toBe(true);
      passed = true;
    } catch (error) {
      unexpectedError = error;
    } finally {
      closeSpy.mockRestore();
      execSpy.mockRestore();
      try {
        retryPendingWorkspaceDatabaseCloses();
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (passed && cleanupErrors.length === 0 && process.hrtime.bigint() - started < 5_000_000_000n) {
        try {
          rmSync(fixture.root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
          console.error(`Retained nested source close fixture after cleanup failure: ${fixture.root}`);
        }
      } else console.error(`Retained failed or expired nested source close fixture: ${fixture.root}`);
    }
    if (unexpectedError !== undefined && cleanupErrors.length > 0)
      throw new AggregateError([unexpectedError, ...cleanupErrors], 'nested source close test and cleanup failed');
    if (unexpectedError !== undefined) throw unexpectedError;
    if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, 'nested source close fixture cleanup failed');
    expect(passed).toBe(true);
  });

  for (const failurePoint of ['verifier', 'body'] as const) {
    test(`closes a captured source when the ${failurePoint} throws`, async () => {
      const started = process.hrtime.bigint();
      const fixture = openRepositoryFixture(`storage-captured-source-${failurePoint}-failure-`);
      const relative = '.vida/aux.sqlite';
      const auxPath = path.join(fixture.root, relative);
      const initialized = new Database(auxPath, { create: true, strict: true });
      initialized.exec('CREATE TABLE fixture(value INTEGER); INSERT INTO fixture VALUES (1);');
      initialized.close();
      const initializedGate = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
      initializedGate.close();
      const expectedError = new Error(`injected captured source ${failurePoint} failure`);
      let source: Database | undefined;
      let sourceClosed = false;
      let gate: Database | undefined;
      const exclusiveBegins: Database[] = [];
      let gateClosed = false;
      let verifierCalls = 0;
      let bodyCalls = 0;
      let passed = false;
      let operationError: unknown;
      const cleanupErrors: unknown[] = [];
      const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
      const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
      const closeOrder: string[] = [];
      const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
        this: Database,
        force?: boolean,
      ) {
        const result = Reflect.apply(originalClose, this, [force]);
        if (this === source) {
          sourceClosed = true;
          closeOrder.push('source-closed');
        }
        if (this === gate) {
          gateClosed = true;
          closeOrder.push('gate-closed');
        }
        return result;
      });
      const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
        const normalized = sql.trim().toUpperCase();
        if (normalized === 'BEGIN EXCLUSIVE') {
          exclusiveBegins.push(this);
          gate = exclusiveBegins[0];
        }
        if (this === gate && normalized === 'ROLLBACK') closeOrder.push('gate-rollback');
        return Reflect.apply(originalExec, this, [sql]);
      });
      try {
        const attempt = withExclusiveStorageAdmission(
          fixture.root,
          fixture.workspaceId,
          (sourceOwner) => {
            verifierCalls += 1;
            const opened = openUnadmittedWorkspaceDatabase(
              fixture.root,
              relative,
              false,
              true,
              sourceOwner.captureSource,
            );
            source ??= opened;
            if (failurePoint === 'verifier') throw expectedError;
            return 'held Host fence';
          },
          async (proof) => {
            bodyCalls += 1;
            expect(typeof proof.assertActive).toBe('function');
            if (failurePoint === 'body') throw expectedError;
          },
        );
        await expectRejection(attempt, expectedError.message);
        const observedReason = await attempt.then(
          () => undefined,
          (error: unknown) => error,
        );
        expect(observedReason).toBe(expectedError);
        expect(source).toBeDefined();
        expect(sourceClosed).toBe(true);
        expect(gate).toBeDefined();
        expect(gateClosed).toBe(true);
        expect(closeOrder.indexOf('source-closed')).toBeLessThan(closeOrder.indexOf('gate-rollback'));
        expect(closeOrder.indexOf('gate-rollback')).toBeLessThan(closeOrder.indexOf('gate-closed'));
        expect(verifierCalls).toBe(1);
        expect(bodyCalls).toBe(failurePoint === 'body' ? 1 : 0);
        passed = true;
      } catch (error) {
        operationError ??= error;
      } finally {
        closeSpy.mockRestore();
        execSpy.mockRestore();
        try {
          retryPendingWorkspaceDatabaseCloses();
        } catch (error) {
          cleanupErrors.push(error);
        }
        if (passed && cleanupErrors.length === 0 && process.hrtime.bigint() - started < 5_000_000_000n) {
          try {
            rmSync(fixture.root, { recursive: true, force: true });
          } catch (error) {
            cleanupErrors.push(error);
            console.error(`Retained captured source ${failurePoint} fixture after cleanup failure: ${fixture.root}`);
          }
        } else console.error(`Retained failed or expired captured source ${failurePoint} fixture: ${fixture.root}`);
      }
      if (operationError !== undefined && cleanupErrors.length > 0)
        throw new AggregateError(
          [operationError, ...cleanupErrors],
          `captured source ${failurePoint} test and cleanup failed`,
        );
      if (operationError !== undefined) throw operationError;
      if (cleanupErrors.length > 0)
        throw new AggregateError(cleanupErrors, `captured source ${failurePoint} fixture cleanup failed`);
      expect(passed).toBe(true);
    });
  }

  test('expires a captured source callback and retains only its exact failed source close', async () => {
    const started = process.hrtime.bigint();
    const fixture = openRepositoryFixture('storage-expired-source-capture-');
    const relative = '.vida/aux.sqlite';
    const auxPath = path.join(fixture.root, relative);
    const initialized = new Database(auxPath, { create: true, strict: true });
    initialized.exec('CREATE TABLE fixture(value INTEGER); INSERT INTO fixture VALUES (1);');
    initialized.close();
    const initializedGate = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, relative);
    initializedGate.close();

    const closeError = new Error('injected expired source close interruption');
    const closeAttempts: Database[] = [];
    let gate: Database | undefined;
    const exclusiveBegins: Database[] = [];
    let gateCloseAttempts = 0;
    let gateClosed = false;
    let capturedSource: Database | undefined;
    let sourceClosed = false;
    let savedProof:
      | {
          readonly captureSource: (database: Database) => void;
          readonly closeSource: (database: Database) => void;
          assertActive(this: void): void;
        }
      | undefined;
    let bodyError: unknown;
    let passed = false;
    const cleanupErrors: unknown[] = [];
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      if (this === gate) gateCloseAttempts += 1;
      if (this === capturedSource) {
        closeAttempts.push(this);
        if (closeAttempts.length === 1) throw closeError;
      }
      const result = Reflect.apply(originalClose, this, [force]);
      if (this === gate) gateClosed = true;
      if (this === capturedSource) sourceClosed = true;
      return result;
    });
    const execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
      if (sql.trim().toUpperCase() === 'BEGIN EXCLUSIVE') {
        exclusiveBegins.push(this);
        gate = exclusiveBegins[0];
      }
      return Reflect.apply(originalExec, this, [sql]);
    });
    const includesError = (error: unknown, target: unknown): boolean =>
      error === target ||
      (error instanceof AggregateError && error.errors.some((nested) => includesError(nested, target)));
    const includesExpiredMessage = (error: unknown): boolean =>
      (error instanceof Error && /expired/u.test(error.message)) ||
      (error instanceof AggregateError && error.errors.some(includesExpiredMessage));

    try {
      await withExclusiveStorageAdmission(
        fixture.root,
        fixture.workspaceId,
        () => 'held Host fence',
        async (proof) => {
          savedProof = proof;
        },
      );
      if (!savedProof) throw new Error('successful exclusive operation did not expose a source proof');
      expect(gate).toBeDefined();
      expect(gateClosed).toBe(true);
      expect(gateCloseAttempts).toBe(1);

      let captureError: unknown;
      try {
        openUnadmittedWorkspaceDatabase(fixture.root, relative, false, true, (database) => {
          capturedSource = database;
          savedProof!.captureSource(database);
        });
      } catch (error) {
        captureError = error;
      }
      expect(captureError).toBeDefined();
      expect(includesExpiredMessage(captureError)).toBe(true);
      expect(includesError(captureError, closeError)).toBe(true);
      expect(capturedSource).toBeDefined();
      expect(closeAttempts).toHaveLength(1);
      expect(closeAttempts[0]).toBe(capturedSource);
      expect(sourceClosed).toBe(false);
      expect(capturedSource!.query<{ value: bigint }, []>('SELECT value FROM fixture').get()?.value).toBe(1n);
      expect(gateCloseAttempts).toBe(1);

      retryPendingWorkspaceDatabaseCloses();
      expect(closeAttempts).toHaveLength(2);
      expect(closeAttempts[1]).toBe(capturedSource);
      expect(sourceClosed).toBe(true);
      expect(gateCloseAttempts).toBe(1);
      expect(gateClosed).toBe(true);
      passed = true;
    } catch (error) {
      bodyError = error;
    } finally {
      closeSpy.mockRestore();
      execSpy.mockRestore();
      try {
        retryPendingWorkspaceDatabaseCloses();
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (passed && cleanupErrors.length === 0 && process.hrtime.bigint() - started < 5_000_000_000n) {
        try {
          rmSync(fixture.root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
          console.error(`Retained expired source capture fixture after cleanup failure: ${fixture.root}`);
        }
      } else console.error(`Retained failed or expired source capture fixture: ${fixture.root}`);
    }
    if (bodyError !== undefined && cleanupErrors.length > 0)
      throw new AggregateError([bodyError, ...cleanupErrors], 'expired source capture test and cleanup failed');
    if (bodyError !== undefined) throw bodyError;
    if (cleanupErrors.length > 0)
      throw new AggregateError(cleanupErrors, 'expired source capture fixture cleanup failed');
    expect(passed).toBe(true);
  });

  test('preserves gate identity and close failures from read-only inspection', () => {
    const started = process.hrtime.bigint();
    const fixture = openRepositoryFixture('storage-gate-inspection-close-');
    const initial = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
    initial.close();
    const closeError = new Error('injected gate inspection close interruption');
    // oxlint-disable-next-line typescript/unbound-method -- Forward only with the exact native receiver below.
    const originalClose = Database.prototype.close;
    let gate: Database | undefined;
    let closeAttempts = 0;
    let gateClosed = false;
    let owner: StorageReadAdmission | undefined;
    let bodyError: unknown;
    const cleanupErrors: unknown[] = [];
    let passed = false;
    // This controlled boundary fault does not claim to simulate a native SQLite I/O failure.
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean) {
      // oxlint-disable-next-line typescript/no-this-alias -- Capture the exact inspection handle for cleanup custody.
      if (!gate) gate = this;
      if (this === gate) {
        closeAttempts += 1;
        if (closeAttempts === 1) throw closeError;
      }
      const result = originalClose.call(this, force);
      if (this === gate) gateClosed = true;
      return result;
    });

    try {
      let failure: unknown;
      try {
        assertOnlyStorageAdmissionGate(fixture.root, 'd'.repeat(64));
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError))
        throw new Error('expected inspection and close errors', { cause: failure });
      const errors: unknown[] = failure.errors;
      expect(errors).toHaveLength(2);
      const identityError = errors[0];
      if (!(identityError instanceof Error)) throw new Error('missing gate identity error', { cause: identityError });
      expect(identityError.message).toMatch(/gate identity differs/u);
      expect(errors[1]).toBe(closeError);
      expect(gate).toBeDefined();
      expect(closeAttempts).toBe(1);
      expect(gateClosed).toBe(false);
      expect(gate!.query<{ value: bigint }, []>('SELECT 1 AS value').get()?.value).toBe(1n);

      owner = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      expect(closeAttempts).toBe(2);
      expect(gateClosed).toBe(true);
      expect(() => gate!.query<{ value: bigint }, []>('SELECT 1 AS value').get()).toThrow();
      owner.close();
      owner = undefined;
      passed = true;
    } catch (error) {
      bodyError = error;
    } finally {
      closeSpy.mockRestore();
      try {
        owner?.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (gate && !gateClosed) {
        try {
          closeNativeWorkspaceDatabase(gate);
          gateClosed = true;
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      if (passed && cleanupErrors.length === 0 && process.hrtime.bigint() - started < 5_000_000_000n) {
        try {
          rmSync(fixture.root, { recursive: true, force: true });
        } catch (error) {
          cleanupErrors.push(error);
          console.error(`Retained gate inspection fixture after cleanup failure: ${fixture.root}`);
        }
      } else console.error(`Retained failed or expired gate inspection fixture: ${fixture.root}`);
    }
    if (bodyError !== undefined && cleanupErrors.length)
      throw new AggregateError([bodyError, ...cleanupErrors], 'gate inspection test and cleanup failed');
    if (bodyError !== undefined) throw bodyError;
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'gate inspection fixture cleanup failed');
  });
});

function openRepositoryFixture(prefix: string): { readonly root: string; readonly workspaceId: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  try {
    const repositoryRoot =
      process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
      copyFileSync(path.join(repositoryRoot, file), path.join(root, file));
    mkdirSync(path.join(root, '.vida'));
    const config = loadRuntimeConfig(root);
    return { root, workspaceId: deriveWorkspaceId(config.repository.repository_id, root) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
