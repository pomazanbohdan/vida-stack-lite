import { randomUUID } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type ForwardInvocationLock = {
  project: string;
  operationId: string;
  db: DatabaseSync;
};

type CompletedCleanupClassifier<TResult> = (error: unknown, result: TResult) => TResult;

type ForwardInvocationOptions<TResult> = {
  classifyCompletedCleanup?: CompletedCleanupClassifier<TResult> | null;
};

const held = new Map<string, ForwardInvocationLock>();

function hasErrorCode(value: unknown, code: string): boolean {
  return typeof value === 'object' && value !== null && 'code' in value && value.code === code;
}

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string')
    return value.message;
  return String(value);
}

export function withForwardInvocationLock<TResult>(
  root: string,
  operationId: string,
  callback: (token: string) => TResult,
  { classifyCompletedCleanup = null }: ForwardInvocationOptions<TResult> = {},
): TResult {
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId)) throw new Error('forward invocation identity invalid');
  const project = path.resolve(root);
  const generationRoot = path.join(project, '.agent/cutover', operationId);
  const directory = lstatSync(generationRoot);
  if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('forward invocation directory unsafe');
  const databasePath = path.join(generationRoot, 'forward-invocation.v1.sqlite');
  try {
    const info = lstatSync(databasePath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('forward invocation database unsafe');
  } catch (error: unknown) {
    if (!hasErrorCode(error, 'ENOENT')) throw error;
  }
  const db = new DatabaseSync(databasePath);
  let acquired = false;
  let token: string | undefined;
  let completedResult: { value: TResult } | undefined;
  let callbackCompleted = false;
  let failure: { readonly error: unknown } | undefined;
  const cleanupFailures: unknown[] = [];
  try {
    db.exec('PRAGMA busy_timeout = 0');
    try {
      db.exec('BEGIN IMMEDIATE');
    } catch (error: unknown) {
      if (hasErrorCode(error, 'ERR_SQLITE_ERROR') || /locked|busy/i.test(errorMessage(error)))
        throw new Error('forward invocation already active');
      throw error;
    }
    acquired = true;
    db.exec(
      'CREATE TABLE IF NOT EXISTS forward_invocation_identity ' +
        '(id INTEGER PRIMARY KEY CHECK (id = 1), operation_id TEXT NOT NULL)',
    );
    const identity = db.prepare('SELECT operation_id FROM forward_invocation_identity WHERE id = 1').get();
    if (identity && identity.operation_id !== operationId)
      throw new Error('forward invocation database identity differs');
    if (!identity)
      db.prepare('INSERT INTO forward_invocation_identity (id, operation_id) VALUES (1, ?)').run(operationId);
    token = randomUUID();
    held.set(token, { project, operationId, db });
    completedResult = { value: callback(token) };
    callbackCompleted = true;
    held.delete(token);
    db.exec('COMMIT');
    acquired = false;
  } catch (error: unknown) {
    if (callbackCompleted) cleanupFailures.push(error);
    else failure = { error };
  } finally {
    if (token) held.delete(token);
    if (acquired) {
      try {
        db.exec('ROLLBACK');
      } catch (error: unknown) {
        cleanupFailures.push(error);
      }
    }
    try {
      db.close();
    } catch (error: unknown) {
      cleanupFailures.push(error);
    }
  }
  if (failure) {
    if (cleanupFailures.length)
      throw new AggregateError([failure.error, ...cleanupFailures], 'Forward invocation and cleanup failed', {
        cause: failure.error,
      });
    throw failure.error;
  }
  if (cleanupFailures.length) {
    const cleanupFailure =
      cleanupFailures.length === 1
        ? cleanupFailures[0]
        : new AggregateError(cleanupFailures, 'Forward invocation cleanup failed', { cause: cleanupFailures[0] });
    if (typeof classifyCompletedCleanup === 'function' && completedResult)
      return classifyCompletedCleanup(cleanupFailure, completedResult.value);
    throw cleanupFailure;
  }
  if (!completedResult) throw new Error('Forward invocation did not complete');
  return completedResult.value;
}

export function assertForwardInvocationLock(root: string, operationId: string, token: string): void {
  const current = held.get(token);
  if (
    typeof token !== 'string' ||
    !current ||
    current.project !== path.resolve(root) ||
    current.operationId !== operationId
  )
    throw new Error('forward invocation lock is not held by this process');
}
