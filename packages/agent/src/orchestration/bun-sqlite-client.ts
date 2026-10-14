import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import type {
  SqliteClient,
  SqliteInValue,
  SqliteResultSet,
  SqliteStatement,
  SqliteTransaction,
  SqliteTransactionMode,
  SqliteValue,
} from '@mastra/libsql';
import {
  openAdmittedWorkspaceDatabase,
  openExistingWorkspaceDatabaseWithAdmission,
  closeWorkspaceDatabaseWithAdmission,
  type StorageReadAdmission,
} from '../config/storage-read-admission.js';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from '../config/safe-repository-access.js';
import { assertProjectUpgradeInactive } from '../config/runtime-config.js';

const connections = new Set<BunSqliteClient>();

function requireClient(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('Bun SQLite client: ' + message);
}

function binding(value: SqliteInValue): null | string | number | bigint | Uint8Array {
  if (value instanceof Date) return binding(value.getTime());
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new RangeError('Only finite SQL numbers are supported');
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof value === 'boolean') return Number(value);
  return value;
}

function namedBinding(key: string, value: SqliteInValue): readonly [string, ReturnType<typeof binding>] {
  return [key.length > 0 && '$:@'.includes(key[0]!) ? key.slice(1) : key, binding(value)];
}

function resultRow(values: readonly unknown[], columns: readonly string[]): Record<string, SqliteValue> {
  const row: Record<string, SqliteValue> = {};
  Object.defineProperty(row, 'length', { value: values.length });
  values.forEach((value, index) => {
    const converted = resultValue(value);
    Object.defineProperty(row, index, { value: converted });
    const column = columns[index]!;
    if (!Object.hasOwn(row, column))
      Object.defineProperty(row, column, { value: converted, enumerable: true, configurable: true, writable: true });
  });
  return row;
}

function resultValue(value: unknown): SqliteValue {
  if (value instanceof Uint8Array) return Uint8Array.from(value).buffer;
  if (typeof value === 'bigint' && Number.isSafeInteger(Number(value))) return Number(value);
  requireClient(
    value === null || ['string', 'number', 'bigint'].includes(typeof value),
    'unsupported SQLite result value',
  );
  return value as SqliteValue;
}

function statement(input: string | SqliteStatement): { sql: string; bindings: SQLQueryBindings[] } {
  if (typeof input === 'string') return { sql: input, bindings: [] };
  requireClient(typeof input.sql === 'string', 'SQL text required');
  const args = input.args;
  if (args === undefined) return { sql: input.sql, bindings: [] };
  if (Array.isArray(args)) return { sql: input.sql, bindings: args.map(binding) };
  return {
    sql: input.sql,
    bindings: [Object.fromEntries(Object.entries(args).map(([key, value]) => namedBinding(key, value)))],
  };
}

type SqlStatementKind = 'insert' | 'write' | 'other';

interface SqlToken {
  readonly kind: 'word' | 'identifier' | 'string' | 'punctuation';
  readonly value: string;
}

const SQL_TOKEN =
  /\s+|--[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[(?:[^\]]|\]\])*\]|[\p{L}_][\p{L}\p{N}_$]*|[(),]|[\s\S]/uy;

function* sqlTokens(sql: string): Generator<SqlToken, void> {
  let offset = 0;
  while (offset < sql.length) {
    SQL_TOKEN.lastIndex = offset;
    const match = SQL_TOKEN.exec(sql);
    if (!match) return;
    offset = SQL_TOKEN.lastIndex;
    const text = match[0];
    if (/^\s|^--|^\/\*/.test(text)) continue;
    if (text.startsWith("'")) yield { kind: 'string', value: text };
    else if (/^["`[]/.test(text)) yield { kind: 'identifier', value: text };
    else if (/^[\p{L}_]/u.test(text)) yield { kind: 'word', value: text.toUpperCase() };
    else yield { kind: 'punctuation', value: text };
  }
}

function nextToken(tokens: Iterator<SqlToken, void>): SqlToken | undefined {
  const next = tokens.next();
  return next.done ? undefined : next.value;
}

function isWord(token: SqlToken | undefined, value: string): boolean {
  return token?.kind === 'word' && token.value === value;
}

function isPunctuation(token: SqlToken | undefined, value: string): boolean {
  return token?.kind === 'punctuation' && token.value === value;
}

/** Consume a CTE column list or body after its opening parenthesis. */
function skipParentheses(tokens: Iterator<SqlToken, void>): boolean {
  let depth = 1;
  while (true) {
    const token = nextToken(tokens);
    if (!token) return false;
    if (isPunctuation(token, '(')) depth += 1;
    else if (isPunctuation(token, ')')) {
      depth -= 1;
      if (depth === 0) return true;
    }
  }
}

function afterCteBody(tokens: Iterator<SqlToken, void>): SqlToken | undefined {
  let token = nextToken(tokens);
  if (isPunctuation(token, '(')) {
    if (!skipParentheses(tokens)) return undefined;
    token = nextToken(tokens);
  }
  if (!isWord(token, 'AS')) return undefined;
  token = nextToken(tokens);
  if (isWord(token, 'NOT')) {
    if (!isWord(nextToken(tokens), 'MATERIALIZED')) return undefined;
    token = nextToken(tokens);
  } else if (isWord(token, 'MATERIALIZED')) token = nextToken(tokens);
  if (!isPunctuation(token, '(') || !skipParentheses(tokens)) return undefined;
  return nextToken(tokens);
}

function afterWithClause(tokens: Iterator<SqlToken, void>): SqlToken | undefined {
  let token = nextToken(tokens);
  if (isWord(token, 'RECURSIVE')) token = nextToken(tokens);
  while (token?.kind === 'word' || token?.kind === 'identifier') {
    const afterBody = afterCteBody(tokens);
    if (!afterBody || !isPunctuation(afterBody, ',')) return afterBody;
    token = nextToken(tokens);
  }
  return undefined;
}

function statementKind(token: SqlToken | undefined): SqlStatementKind {
  if (isWord(token, 'INSERT') || isWord(token, 'REPLACE')) return 'insert';
  if (isWord(token, 'UPDATE') || isWord(token, 'DELETE')) return 'write';
  return 'other';
}

/** Ordinary statements stop at the first token; only WITH parses CTE structure. */
function sqliteStatementKind(sql: string): SqlStatementKind {
  const tokens = sqlTokens(sql);
  const first = nextToken(tokens);
  return isWord(first, 'WITH') ? statementKind(afterWithClause(tokens)) : statementKind(first);
}

/** Execute once and preserve column positions, duplicate names, blobs and exact large integers. */
function execute(database: Database, input: string | SqliteStatement): SqliteResultSet {
  const parsed = statement(input);
  const query = database.prepare<unknown, SQLQueryBindings[]>(parsed.sql);
  try {
    const columns = [...query.columnNames];
    if (columns.length === 0) {
      const changes = query.run(...parsed.bindings);
      return {
        columns: [],
        columnTypes: [],
        rows: [],
        rowsAffected: changes.changes,
        lastInsertRowid: BigInt(changes.lastInsertRowid),
      };
    }
    const values = query.values(...parsed.bindings);
    const columnTypes = query.declaredTypes.map((type) => type ?? '');
    const rows = values.map((values) => resultRow(values, columns));
    const kind = sqliteStatementKind(parsed.sql);
    if (kind === 'other') return { columns, columnTypes, rows, rowsAffected: 0 };

    const effects = database
      .query<{ changes: string; last_insert_rowid: string }, []>(
        'SELECT CAST(changes() AS TEXT) AS changes, CAST(last_insert_rowid() AS TEXT) AS last_insert_rowid',
      )
      .get();
    requireClient(effects !== null, 'SQLite did not return DML execution metadata');
    const rowsAffected = Number(effects.changes);
    requireClient(Number.isSafeInteger(rowsAffected) && rowsAffected >= 0, 'SQLite change count is out of range');
    return {
      columns,
      columnTypes,
      rows,
      rowsAffected,
      ...(kind === 'insert' && rowsAffected > 0 ? { lastInsertRowid: BigInt(effects.last_insert_rowid) } : {}),
    };
  } finally {
    query.finalize();
  }
}

function begin(database: Database, mode: SqliteTransactionMode): void {
  requireClient(['write', 'read', 'deferred'].includes(mode), 'unsupported transaction mode');
  requireClient(!database.inTransaction, 'transaction already open');
  database.exec(mode === 'write' ? 'BEGIN IMMEDIATE' : 'BEGIN DEFERRED');
}

interface Reservation {
  readonly previous: Promise<void>;
  readonly release: () => void;
}

type ClientLocation =
  | { readonly kind: 'memory' }
  | {
      readonly kind: 'workspace';
      readonly repositoryRoot: string;
      readonly relative: string;
      readonly workspaceId: string;
      readonly access: SafeRepositoryAccess;
      readonly identity: string;
    };

function assertMemoryDatabase(database: Database): void {
  const files = database.query<{ file: string }, []>('PRAGMA database_list').all();
  requireClient(files.length > 0 && files.every((entry) => entry.file === ''), 'memory client cannot own a file');
}

function readTransactionDatabase(database: Database, location: ClientLocation): Database {
  if (location.kind === 'memory')
    return Database.deserialize(database.serialize(), { readonly: true, strict: true, safeIntegers: true });
  return openAdmittedWorkspaceDatabase(location.repositoryRoot, location.relative, location.workspaceId, true, true);
}

function databaseIdentity(database: Database): string {
  const file = lstatSync(database.filename);
  requireClient(file.isFile() && !file.isSymbolicLink() && file.nlink === 1, 'database path is unsafe');
  return file.dev + ':' + file.ino;
}

function closeOwnedDatabase(database: Database, owned: boolean, errors: unknown[]): void {
  if (!owned) return;
  try {
    closeWorkspaceDatabaseWithAdmission(database);
  } catch (close) {
    errors.push(close);
  }
}

function closeClientDatabase(database: Database, location: ClientLocation): void {
  if (location.kind === 'workspace') closeWorkspaceDatabaseWithAdmission(database);
  else database.close(true);
}

/** Separate connection owner. Mastra retains its public storage API and ownership of mastra_* tables. */
class BunSqliteClient implements SqliteClient {
  readonly protocol = 'file';
  readonly #database: Database;
  readonly #location: ClientLocation;
  #closed = false;
  #tail: Promise<void> = Promise.resolve();
  #transaction: BunSqliteTransaction | undefined;

  constructor(database: Database, location: ClientLocation) {
    this.#database = database;
    this.#location = Object.freeze(location);
    this.#assertOpen();
    if (location.kind === 'workspace') connections.add(this);
  }

  get closed(): boolean {
    return this.#closed;
  }

  #assertOpen(): void {
    requireClient(!this.#closed, 'client is closed');
    const location = this.#location;
    if (location.kind === 'memory') {
      assertMemoryDatabase(this.#database);
      return;
    }
    requireClient(databaseIdentity(this.#database) === location.identity, 'database was replaced');
    assertProjectUpgradeInactive(location.access);
  }

  #reserve(): Reservation {
    const previous = this.#tail;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#tail = previous.then(() => held);
    return { previous, release };
  }

  async #run<T>(callback: () => T): Promise<T> {
    const slot = this.#reserve();
    await slot.previous;
    try {
      this.#assertOpen();
      const result = callback();
      this.#assertOpen();
      return result;
    } finally {
      slot.release();
    }
  }

  async execute(input: string | SqliteStatement): Promise<SqliteResultSet> {
    return this.#run(() => execute(this.#database, input));
  }

  async settle(): Promise<void> {
    requireClient(this.#transaction === undefined, 'an active transaction cannot be drained');
    await this.#tail;
    this.#assertOpen();
    requireClient(!this.#database.inTransaction, 'database transaction remains open');
  }

  async batch(
    inputs: (string | SqliteStatement)[],
    mode: SqliteTransactionMode = 'deferred',
  ): Promise<SqliteResultSet[]> {
    const tx = await this.transaction(mode);
    try {
      const results: SqliteResultSet[] = [];
      for (const input of inputs) results.push(await tx.execute(input));
      await tx.commit();
      return results;
    } catch (error) {
      try {
        tx.close();
      } catch (cleanup) {
        throw new AggregateError([error, cleanup], 'SQLite batch and rollback failed');
      }
      throw error;
    }
  }

  async transaction(mode: SqliteTransactionMode = 'write'): Promise<SqliteTransaction> {
    const slot = this.#reserve();
    await slot.previous;
    let database: Database | undefined;
    try {
      this.#assertOpen();
      database = mode === 'read' ? readTransactionDatabase(this.#database, this.#location) : this.#database;
      assertTransactionIdentity(database, this.#location);
      begin(database, mode);
      const transaction = new BunSqliteTransaction(
        database,
        () => {
          this.#transaction = undefined;
          slot.release();
        },
        () => {
          this.#closed = true;
          connections.delete(this);
          closeClientDatabase(this.#database, this.#location);
        },
        mode === 'read',
        () => this.#assertOpen(),
      );
      this.#transaction = transaction;
      return transaction;
    } catch (error) {
      slot.release();
      if (database && database !== this.#database) {
        try {
          closeWorkspaceDatabaseWithAdmission(database);
        } catch (cleanup) {
          throw new AggregateError([error, cleanup], 'Readonly SQLite begin and close failed');
        }
      }
      throw error;
    }
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    connections.delete(this);
    const errors: unknown[] = [];
    try {
      this.#transaction?.close();
    } catch (error) {
      errors.push(error);
    }
    try {
      closeClientDatabase(this.#database, this.#location);
    } catch (error) {
      errors.push(error);
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, 'SQLite client and transaction close failed');
  }

  belongsTo(repositoryRoot: string, relative: string): boolean {
    const location = this.#location;
    return (
      location.kind === 'workspace' && location.repositoryRoot === repositoryRoot && location.relative === relative
    );
  }
}

class BunSqliteTransaction implements SqliteTransaction {
  #closed = false;
  readonly #database: Database;
  readonly #release: () => void;
  readonly #poison: () => void;
  readonly #owned: boolean;
  readonly #assertAvailable: () => void;

  constructor(
    database: Database,
    release: () => void,
    poison: () => void,
    owned: boolean,
    assertAvailable: () => void,
  ) {
    this.#database = database;
    this.#release = release;
    this.#poison = poison;
    this.#owned = owned;
    this.#assertAvailable = assertAvailable;
  }

  get closed(): boolean {
    return this.#closed;
  }

  async execute(input: string | SqliteStatement): Promise<SqliteResultSet> {
    requireClient(!this.#closed && this.#database.inTransaction, 'transaction is closed');
    this.#assertAvailable();
    const result = execute(this.#database, input);
    this.#assertAvailable();
    return result;
  }

  #finish(command: 'COMMIT' | 'ROLLBACK'): void {
    requireClient(!this.#closed, 'transaction is closed');
    const errors: unknown[] = [];
    try {
      if (command === 'COMMIT') this.#assertAvailable();
      this.#database.exec(command);
    } catch (error) {
      errors.push(error);
    }
    try {
      if (this.#database.inTransaction) this.#database.exec('ROLLBACK');
    } catch (cleanup) {
      errors.push(cleanup);
      try {
        this.#poison();
      } catch (close) {
        errors.push(close);
      }
    } finally {
      closeOwnedDatabase(this.#database, this.#owned, errors);
      this.#closed = true;
      this.#release();
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, 'SQLite transaction settlement failed');
  }

  async commit(): Promise<void> {
    this.#finish('COMMIT');
  }

  async rollback(): Promise<void> {
    if (!this.#closed) this.#finish('ROLLBACK');
  }

  close(): void {
    if (!this.#closed) this.#finish('ROLLBACK');
  }
}

/** The producer creates a fresh file separately; this adapter never creates or relocates a workspace database. */
export function openBunSqliteClient(
  repositoryRoot: string,
  relative: string,
  workspaceId: string,
  priorAdmission?: StorageReadAdmission,
): SqliteClient {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  assertProjectUpgradeInactive(access);
  const database = priorAdmission
    ? openExistingWorkspaceDatabaseWithAdmission(repositoryRoot, relative, priorAdmission, false, true)
    : openAdmittedWorkspaceDatabase(repositoryRoot, relative, workspaceId, false, true);
  try {
    database.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL');
    return new BunSqliteClient(database, {
      kind: 'workspace',
      repositoryRoot,
      relative,
      workspaceId,
      access,
      identity: databaseIdentity(database),
    });
  } catch (error) {
    try {
      closeWorkspaceDatabaseWithAdmission(database);
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], 'SQLite client initialization and close failed');
    }
    throw error;
  }
}

function assertTransactionIdentity(database: Database, location: ClientLocation): void {
  if (location.kind === 'memory') assertMemoryDatabase(database);
  else requireClient(databaseIdentity(database) === location.identity, 'transaction database was replaced');
}

/** Internal empty-schema preparation. It owns only an in-memory connection and grants no workspace rights. */
export function createInMemoryBunSqliteClient(database: Database): SqliteClient & { settle(): Promise<void> } {
  requireClient(database instanceof Database, 'Bun database required');
  return new BunSqliteClient(database, { kind: 'memory' });
}

/** Process-local owner cleanup only; callers still need maintenance authority and a checked closed-file checkpoint. */
export function closeWorkspaceWorkflowClients(repositoryRoot: string, relative: string): void {
  const errors: unknown[] = [];
  for (const client of connections) {
    if (!client.belongsTo(repositoryRoot, relative)) continue;
    try {
      client.close();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) throw new AggregateError(errors, 'Workflow connection drain failed');
}
