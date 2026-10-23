import { mock } from 'bun:test';
import { Database, Statement } from 'bun:sqlite';
import * as nativeFs from 'node:fs';
import path from 'node:path';

export type CliSqlJson = null | boolean | number | string | CliSqlJson[] | { [key: string]: CliSqlJson };

export interface CliSqliteCaptureResult {
  schema: 'VidaCliSqliteConsumed/v1';
  complete: boolean;
  issues: string[];
  operations: CliSqlOperation[];
  connections: CliSqlConnection[];
  host_opens: CliSqlHostOpen[];
  payloads: CliSqlPayload[];
  descriptor_restoration_exact: boolean;
  unsupported_methods: string[];
}

export interface CliSqlOperation {
  sequence: number;
  method: string;
  sql: string;
  connection_id: string;
  arguments: CliSqlJson[];
  outcome: 'returned' | 'threw';
  result?: CliSqlJson;
  error?: CliSqlJson;
}

export interface CliSqlConnection {
  connection_id: string;
  file_identity: { dev: string; ino: string } | null;
}

export interface CliSqlHostOpen {
  database_path: string;
  connection_id: string | null;
  owner_returned_database: boolean;
  pragma_database_list: CliSqlJson | null;
  stat_observations: CliSqlJson[];
  identity_verified: boolean;
}

export interface CliSqlPayload {
  payload_id: number;
  byte_length: number;
  base64: string;
}

type CaptureOptions = {
  projectRoot: string;
  hostModulePath: string;
  rawModulePath: string;
  reserve: (operations: number, bytes: number) => boolean;
  incomplete: (message: string) => void;
};

type Connection = { id: string; database: Database; identity: { dev: string; ino: string } | null };
type Origin = { connection: Connection; sql: string };
type SavedDescriptor = { owner: object; key: string; descriptor: PropertyDescriptor };
type HostFact = {
  path: string;
  stats: Array<{ path: string; dev: string; ino: string; nlink: string; mode: number }>;
  pragma: { connection: Connection; rows: CliSqlJson; mainFile: string } | null;
  database: Database | null;
  returned: boolean;
  ambiguous: boolean;
};
type PoolEntry = { id: number; bytes: Uint8Array; base64: string };

const maxSnapshotDepth = 16;
const originalLstatSync = nativeFs.lstatSync;

export async function createCliSqliteCapture(options: CaptureOptions): Promise<{ finish(): CliSqliteCaptureResult }> {
  const issues: string[] = [];
  const operations: CliSqlOperation[] = [];
  const connections: Connection[] = [];
  const connectionByDatabase = new WeakMap<Database, Connection>();
  const origins = new WeakMap<object, Origin>();
  const payloadPool: PoolEntry[] = [];
  const saved: SavedDescriptor[] = [];
  const hostFacts: HostFact[] = [];
  const unsupported = new Set<string>();
  let activeHost: HostFact | null = null;
  let halted = false;
  let restorationExact = false;
  let sequence = 0;
  let finished: CliSqliteCaptureResult | null = null;

  function issue(message: string): void {
    const clipped = message.slice(0, 500);
    if (!issues.includes(clipped)) issues.push(clipped);
    try {
      options.incomplete(clipped);
    } catch {}
  }

  function reserveRecord(value: unknown, count = 1): boolean {
    if (halted) return false;
    let bytes: number;
    try {
      bytes = Buffer.byteLength(JSON.stringify(value)) + 1;
    } catch {
      halted = true;
      issue('A capture fact could not be serialized as JSON.');
      return false;
    }
    let accepted = false;
    try {
      accepted = options.reserve(count, bytes);
    } catch {
      accepted = false;
    }
    if (!accepted) {
      halted = true;
      issue('The shared SQL capture budget was exhausted.');
      return false;
    }
    return true;
  }

  function connectionFor(database: Database): Connection | null {
    const previous = connectionByDatabase.get(database);
    if (previous) return previous;
    const candidate: Connection = { id: `connection-${connections.length + 1}`, database, identity: null };
    if (!reserveRecord({ kind: 'connection', connection_id: candidate.id }, 0)) return null;
    connectionByDatabase.set(database, candidate);
    connections.push(candidate);
    return candidate;
  }

  function snapshot(value: unknown, depth = 0): CliSqlJson {
    if (depth > maxSnapshotDepth) throw new Error('snapshot nesting exceeds 16 levels');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return { type: 'bigint', decimal: String(value) };
    if (typeof value === 'number') return Number.isFinite(value) ? value : { type: 'number', value: String(value) };
    if (value instanceof Uint8Array) return payloadReference(value);
    if (Array.isArray(value)) {
      const result: CliSqlJson[] = [];
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !('value' in descriptor)) throw new Error('array contains a hole or accessor');
        result.push(snapshot(descriptor.value, depth + 1));
      }
      return result;
    }
    if (typeof value === 'object') {
      const prototype: unknown = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) throw new Error('object has an unsupported prototype');
      const result: { [key: string]: CliSqlJson } = Object.create(null) as { [key: string]: CliSqlJson };
      for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor)) throw new Error('object contains an accessor');
        result[key] = snapshot(descriptor.value, depth + 1);
      }
      return result;
    }
    throw new Error(`unsupported value type ${typeof value}`);
  }

  function payloadReference(source: Uint8Array): CliSqlJson {
    const view = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    for (const prior of payloadPool) {
      if (prior.bytes.byteLength !== view.byteLength) continue;
      let equal = true;
      for (let index = 0; index < view.byteLength; index++) {
        if (prior.bytes[index] !== view[index]) {
          equal = false;
          break;
        }
      }
      if (equal) return { type: 'blob', ref: prior.id, byte_length: view.byteLength };
    }
    const base64 = Buffer.from(view.buffer, view.byteOffset, view.byteLength).toString('base64');
    const payload: CliSqlPayload = { payload_id: payloadPool.length + 1, byte_length: view.byteLength, base64 };
    if (!reserveRecord(payload, 0)) throw new Error('shared capture budget exhausted for payload bytes');
    payloadPool.push({ id: payload.payload_id, bytes: new Uint8Array(view), base64 });
    return { type: 'blob', ref: payload.payload_id, byte_length: view.byteLength };
  }

  function safeSnapshot(value: unknown, label: string): CliSqlJson {
    try {
      return snapshot(value);
    } catch (error) {
      const why = error instanceof Error ? error.message : typeof error;
      issue(`${label} could not be captured: ${why}`);
      return { capture_status: 'unsupported', value_type: value === null ? 'null' : typeof value };
    }
  }

  function errorFacts(error: unknown): CliSqlJson {
    const result: { [key: string]: CliSqlJson } = { thrown_type: error === null ? 'null' : typeof error };
    if (error !== null && typeof error === 'object') {
      for (const key of ['name', 'message', 'code']) {
        const descriptor = Object.getOwnPropertyDescriptor(error, key);
        if (descriptor && 'value' in descriptor && ['string', 'number'].includes(typeof descriptor.value))
          result[key] = snapshot(descriptor.value);
      }
    } else if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') {
      result.value = snapshot(error);
    }
    return result;
  }

  function recordOperation(
    method: string,
    sql: string,
    connection: Connection,
    args: unknown[],
    outcome: 'returned' | 'threw',
    value: unknown,
    iterator = false,
  ): void {
    if (halted) return;
    const safeArguments = safeSnapshot(args, `${method} arguments`);
    let operation: CliSqlOperation;
    try {
      operation = {
        sequence: sequence + 1,
        method,
        sql,
        connection_id: connection.id,
        arguments: Array.isArray(safeArguments) ? safeArguments : [],
        outcome,
      };
      if (outcome === 'threw') operation.error = errorFacts(value);
      else operation.result = iterator ? { type: 'unconsumed-iterator' } : safeSnapshot(value, `${method} result`);
    } catch (error) {
      issue(`${method} outcome could not be captured: ${error instanceof Error ? error.message : typeof error}`);
      return;
    }
    if (!reserveRecord(operation)) return;
    sequence++;
    operations.push(operation);
  }

  function supportedBindings(sql: string, args: unknown[]): boolean {
    if (args.length === 0) return !/[?@$:]/u.test(sql);
    return args.every(
      (value) =>
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint' ||
        value instanceof Uint8Array,
    );
  }

  function rememberDescriptor(owner: object, key: string, required: boolean): PropertyDescriptor | null {
    const descriptor = Object.getOwnPropertyDescriptor(owner, key);
    if (!descriptor) {
      if (required) issue(`Required SQLite method ${key} has no own descriptor.`);
      return null;
    }
    if (typeof descriptor.value !== 'function' || (!descriptor.configurable && !descriptor.writable)) {
      issue(`SQLite method ${key} cannot be wrapped without changing its descriptor.`);
      return null;
    }
    saved.push({ owner, key, descriptor });
    return descriptor;
  }

  function wrapStatement(statement: object, origin: Origin): void {
    for (const method of ['get', 'all', 'run'] as const) {
      const descriptor = rememberDescriptor(statement, method, true);
      if (!descriptor) continue;
      const original = descriptor.value as (...args: unknown[]) => unknown;
      Object.defineProperty(statement, method, {
        ...descriptor,
        value: function (this: object, ...args: unknown[]): unknown {
          if (this !== statement) issue('A SQLite statement was called with a foreign receiver.');
          if (!supportedBindings(origin.sql, args)) {
            unsupported.add(`Statement.${method} bindings`);
            issue(`Unsupported SQLite binding form used by Statement.${method}.`);
          }
          let result: unknown;
          try {
            result = Reflect.apply(original, this, args);
          } catch (error) {
            try {
              recordOperation(`Statement.${method}`, origin.sql, origin.connection, args, 'threw', error);
            } catch {
              issue(`Statement.${method} error capture failed.`);
            }
            throw error;
          }
          if (activeHost && method === 'all' && origin.sql.trim().toLowerCase() === 'pragma database_list')
            observeDatabaseList(activeHost, origin.connection, result);
          try {
            recordOperation(`Statement.${method}`, origin.sql, origin.connection, args, 'returned', result);
          } catch {
            issue(`Statement.${method} result capture failed.`);
          }
          return result;
        },
      });
    }
    for (const method of ['values', 'iterate'] as const) {
      const descriptor = rememberDescriptor(statement, method, false);
      if (!descriptor) continue;
      const original = descriptor.value as (...args: unknown[]) => unknown;
      Object.defineProperty(statement, method, {
        ...descriptor,
        value: function (this: object, ...args: unknown[]): unknown {
          if (this !== statement) issue('A SQLite statement was called with a foreign receiver.');
          unsupported.add(`Statement.${method}`);
          issue(`Unsupported SQLite method used: Statement.${method}.`);
          let result: unknown;
          try {
            result = Reflect.apply(original, this, args);
          } catch (error) {
            try {
              recordOperation(`Statement.${method}`, origin.sql, origin.connection, args, 'threw', error);
            } catch {
              issue(`Statement.${method} error capture failed.`);
            }
            throw error;
          }
          try {
            recordOperation(
              `Statement.${method}`,
              origin.sql,
              origin.connection,
              args,
              'returned',
              result,
              method === 'iterate',
            );
          } catch {
            issue(`Statement.${method} result capture failed.`);
          }
          return result;
        },
      });
    }
  }

  function observeFactory(method: 'query' | 'prepare'): void {
    const descriptor = rememberDescriptor(Database.prototype, method, true);
    if (!descriptor) return;
    const original = descriptor.value as (...args: unknown[]) => unknown;
    Object.defineProperty(Database.prototype, method, {
      ...descriptor,
      value: function (this: Database, ...args: unknown[]): unknown {
        const sql = args[0];
        let statement: unknown;
        const connection = this instanceof Database ? connectionFor(this) : null;
        try {
          statement = Reflect.apply(original, this, args);
        } catch (error) {
          try {
            if (connection && typeof sql === 'string')
              recordOperation(`Database.${method}`, sql, connection, args.slice(1), 'threw', error);
          } catch {
            issue(`Database.${method} factory error capture failed.`);
          }
          throw error;
        }
        if (typeof sql !== 'string' || !(statement instanceof Statement) || !connection) {
          issue(`SQLite ${method} returned a statement or SQL form the observer cannot bind.`);
          return statement;
        }
        const previous = origins.get(statement);
        if (previous) {
          if (previous.connection !== connection || previous.sql !== sql)
            issue('A cached SQLite statement was observed with a different connection or SQL string.');
          return statement;
        }
        const origin = { connection, sql };
        origins.set(statement, origin);
        wrapStatement(statement, origin);
        return statement;
      },
    });
  }

  function observeDatabaseList(host: HostFact, connection: Connection, value: unknown): void {
    if (halted) return;
    const main = Array.isArray(value)
      ? value.find(
          (row: unknown): row is object =>
            row !== null && typeof row === 'object' && Object.getOwnPropertyDescriptor(row, 'name')?.value === 'main',
        )
      : undefined;
    const fileDescriptor =
      main !== undefined && main !== null ? Object.getOwnPropertyDescriptor(main, 'file') : undefined;
    if (!fileDescriptor || !('value' in fileDescriptor) || typeof fileDescriptor.value !== 'string') return;
    if (fileDescriptor.value !== host.path) return;
    let rows: CliSqlJson;
    try {
      rows = snapshot(value);
    } catch (error) {
      host.ambiguous = true;
      issue(`Host database_list rows could not be captured: ${error instanceof Error ? error.message : typeof error}`);
      return;
    }
    if (host.pragma) host.ambiguous = true;
    const fact = { connection, rows, mainFile: fileDescriptor.value };
    if (reserveRecord({ kind: 'host-database-list', path: host.path, rows, main_file: fact.mainFile }, 0))
      host.pragma = fact;
  }

  function observeDirectMethod(method: 'run' | 'exec'): void {
    const descriptor = rememberDescriptor(Database.prototype, method, false);
    if (!descriptor) return;
    const original = descriptor.value as (...args: unknown[]) => unknown;
    Object.defineProperty(Database.prototype, method, {
      ...descriptor,
      value: function (this: Database, ...args: unknown[]): unknown {
        const sql = args[0];
        const connection = this instanceof Database ? connectionFor(this) : null;
        const supportedExec = method === 'exec' && args.length === 1 && typeof sql === 'string';
        if (!supportedExec) {
          unsupported.add(`Database.${method}`);
          issue(`Unsupported SQLite method form used: Database.${method}.`);
        }
        let result: unknown;
        try {
          result = Reflect.apply(original, this, args);
        } catch (error) {
          try {
            if (connection && typeof sql === 'string')
              recordOperation(`Database.${method}`, sql, connection, args.slice(1), 'threw', error);
          } catch {
            issue(`Database.${method} error capture failed.`);
          }
          throw error;
        }
        try {
          if (connection && typeof sql === 'string')
            recordOperation(`Database.${method}`, sql, connection, args.slice(1), 'returned', result);
        } catch {
          issue(`Database.${method} result capture failed.`);
        }
        return result;
      },
    });
  }

  function observeHostLstat(this: unknown, ...args: unknown[]): unknown {
    const result: unknown = Reflect.apply(originalLstatSync, this, args);
    try {
      const host = activeHost;
      const requestedPath = args[0];
      const suppliedOptions = args[1];
      if (
        !host ||
        typeof requestedPath !== 'string' ||
        path.resolve(requestedPath) !== host.path ||
        suppliedOptions === null ||
        typeof suppliedOptions !== 'object' ||
        !('bigint' in suppliedOptions) ||
        suppliedOptions.bigint !== true
      )
        return result;
      const stat = result as { dev: bigint | number; ino: bigint | number; nlink: bigint | number; mode: number };
      const fact = {
        path: requestedPath,
        dev: String(stat.dev),
        ino: String(stat.ino),
        nlink: String(stat.nlink),
        mode: Number(stat.mode),
      };
      if (!reserveRecord({ kind: 'host-stat', ...fact })) host.ambiguous = true;
      else if (host.stats.length < 3) host.stats.push(fact);
      else host.ambiguous = true;
    } catch {
      if (activeHost) activeHost.ambiguous = true;
      issue('Host lstat result could not be captured.');
    }
    return result;
  }

  observeFactory('query');
  observeFactory('prepare');
  observeDirectMethod('exec');
  observeDirectMethod('run');

  try {
    const actualFs: typeof nativeFs = await import('node:fs');
    const actualFsDefault: unknown = Reflect.get(actualFs, 'default');
    if (actualFsDefault === null || typeof actualFsDefault !== 'object')
      throw new Error('Node filesystem default export is not an object');
    await mock.module('node:fs', () => ({
      ...actualFs,
      lstatSync: observeHostLstat,
      default: { ...actualFsDefault, lstatSync: observeHostLstat },
    }));
    const hostModuleValue: unknown = await import(options.hostModulePath);
    if (hostModuleValue === null || typeof hostModuleValue !== 'object')
      throw new Error('Host module did not load as an object');
    const hostNamespace = hostModuleValue as Record<string, unknown>;
    const originalHostOpen = hostNamespace.openHostStateDatabase;
    if (typeof originalHostOpen !== 'function') throw new Error('Host module has no openHostStateDatabase export');
    const hostOpen = originalHostOpen as (...args: unknown[]) => unknown;
    await mock.module(options.hostModulePath, () => ({
      ...hostNamespace,
      openHostStateDatabase: function (this: unknown, ...args: unknown[]): unknown {
        const root = args[0];
        const relative = args[1];
        const previous = activeHost;
        let host: HostFact | null = null;
        if (typeof root === 'string' && typeof relative === 'string') {
          host = {
            path: path.resolve(root, relative),
            stats: [],
            pragma: null,
            database: null,
            returned: false,
            ambiguous: previous !== null || root !== options.projectRoot,
          };
          if (!reserveRecord({ kind: 'host-open', path: host.path }, 0)) host = null;
          else hostFacts.push(host);
        } else issue('Host database opener arguments could not be correlated to a path.');
        if (previous) previous.ambiguous = true;
        activeHost = host;
        try {
          const database: unknown = Reflect.apply(hostOpen, this, args);
          if (host && database instanceof Database) {
            host.database = database;
            host.returned = true;
            connectionFor(database);
          } else if (host) host.ambiguous = true;
          return database;
        } finally {
          activeHost = previous;
        }
      },
    }));
  } catch (error) {
    issue(`Host module observation could not be installed: ${error instanceof Error ? error.message : typeof error}`);
  }

  function restore(): void {
    for (const entry of [...saved].reverse()) {
      try {
        Object.defineProperty(entry.owner, entry.key, entry.descriptor);
      } catch {
        issue(`SQLite descriptor restoration failed for ${entry.key}.`);
      }
    }
    restorationExact = saved.every((entry) => {
      const actual = Object.getOwnPropertyDescriptor(entry.owner, entry.key);
      const expected = entry.descriptor;
      return (
        actual !== undefined &&
        actual.value === expected.value &&
        actual.get === expected.get &&
        actual.set === expected.set &&
        actual.writable === expected.writable &&
        actual.enumerable === expected.enumerable &&
        actual.configurable === expected.configurable
      );
    });
    if (!restorationExact) issue('One or more SQLite method descriptors were not restored exactly.');
  }

  function verifyHostFacts(): CliSqlHostOpen[] {
    const seenDatabases = new WeakSet<Database>();
    return hostFacts.map((host) => {
      const database = host.database;
      const connection = database ? (connectionByDatabase.get(database) ?? null) : null;
      const stats = host.stats.length === 2 ? host.stats : [];
      const first = stats[0];
      const second = stats[1];
      const regularMask = 0o170000;
      const regularType = 0o100000;
      const statMatch =
        first !== undefined &&
        second !== undefined &&
        first.path === host.path &&
        second.path === host.path &&
        first.dev === second.dev &&
        first.ino === second.ino &&
        first.nlink === '1' &&
        second.nlink === '1' &&
        (first.mode & regularMask) === regularType &&
        (second.mode & regularMask) === regularType;
      const pragmaMatch =
        host.pragma !== null &&
        connection !== null &&
        host.pragma.connection === connection &&
        host.pragma.mainFile === host.path;
      const exactOwner =
        host.returned &&
        database !== null &&
        connection !== null &&
        pragmaMatch &&
        statMatch &&
        host.stats.length === 2 &&
        !host.ambiguous &&
        !seenDatabases.has(database);
      if (database) seenDatabases.add(database);
      if (exactOwner && connection && first) connection.identity = { dev: first.dev, ino: first.ino };
      return {
        database_path: host.path,
        connection_id: connection?.id ?? null,
        owner_returned_database: host.returned,
        pragma_database_list: host.pragma?.rows ?? null,
        stat_observations: host.stats.map((stat) => ({
          path: stat.path,
          dev: stat.dev,
          ino: stat.ino,
          nlink: stat.nlink,
          mode: stat.mode,
          bigint: true,
        })),
        identity_verified: exactOwner,
      };
    });
  }

  let rawModule: Record<string, unknown> | null = null;
  let rawIdentityLookup: unknown;
  try {
    const rawModuleValue: unknown = await import(options.rawModulePath);
    if (rawModuleValue === null || typeof rawModuleValue !== 'object')
      throw new Error('Raw database identity module did not load as an object');
    const rawNamespace = rawModuleValue as Record<string, unknown>;
    rawModule = rawNamespace;
    rawIdentityLookup = rawNamespace.workspaceDatabaseFileIdentity;
    if (typeof rawIdentityLookup !== 'function') issue('Raw module has no workspaceDatabaseFileIdentity export.');
  } catch (error) {
    issue(`Raw database identity lookup could not be loaded: ${error instanceof Error ? error.message : typeof error}`);
  }

  function rawIdentityFallback(): void {
    if (!rawModule || typeof rawIdentityLookup !== 'function') return;
    for (const connection of connections) {
      if (connection.identity) continue;
      try {
        const identity: unknown = Reflect.apply(rawIdentityLookup, rawModule, [connection.database]);
        if (identity === null || typeof identity !== 'object') throw new Error('identity is not an object');
        const dev = Object.getOwnPropertyDescriptor(identity, 'dev');
        const ino = Object.getOwnPropertyDescriptor(identity, 'ino');
        if (!dev || !('value' in dev) || !ino || !('value' in ino)) throw new Error('identity fields are unavailable');
        connection.identity = { dev: String(dev.value), ino: String(ino.value) };
      } catch {}
      if (!connection.identity) issue(`Connection ${connection.id} has no captured existing-file identity.`);
    }
  }

  return {
    finish: (): CliSqliteCaptureResult => {
      if (finished) return finished;
      restore();
      const hostOpens = verifyHostFacts();
      rawIdentityFallback();
      const connectionFacts = connections.map((connection) => ({
        connection_id: connection.id,
        file_identity: connection.identity,
      }));
      finished = {
        schema: 'VidaCliSqliteConsumed/v1',
        complete:
          !halted &&
          issues.length === 0 &&
          unsupported.size === 0 &&
          restorationExact &&
          operations.length > 0 &&
          hostOpens.length > 0 &&
          hostOpens.every((host) => host.identity_verified),
        issues,
        operations,
        connections: connectionFacts,
        host_opens: hostOpens,
        payloads: payloadPool.map((payload) => ({
          payload_id: payload.id,
          byte_length: payload.bytes.byteLength,
          base64: payload.base64,
        })),
        descriptor_restoration_exact: restorationExact,
        unsupported_methods: [...unsupported].sort(),
      };
      return finished;
    },
  };
}
