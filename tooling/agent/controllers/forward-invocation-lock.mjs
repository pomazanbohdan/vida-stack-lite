import { randomUUID } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const held = new Map();

export function withForwardInvocationLock(root, operationId, callback, { classifyCompletedCleanup = null } = {}) {
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId)) throw new Error('forward invocation identity invalid');
  const project = path.resolve(root);
  const generationRoot = path.join(project, '.agent/cutover', operationId);
  const directory = lstatSync(generationRoot);
  if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('forward invocation directory unsafe');
  const databasePath = path.join(generationRoot, 'forward-invocation.v1.sqlite');
  try {
    const info = lstatSync(databasePath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('forward invocation database unsafe');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const db = new DatabaseSync(databasePath);
  let acquired = false;
  let token;
  let result;
  let callbackCompleted = false;
  let failure = null;
  let cleanupFailure = null;
  try {
    db.exec('PRAGMA busy_timeout = 0');
    try {
      db.exec('BEGIN IMMEDIATE');
    } catch (error) {
      if (error.code === 'ERR_SQLITE_ERROR' || /locked|busy/i.test(error.message))
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
    result = callback(token);
    callbackCompleted = true;
    held.delete(token);
    db.exec('COMMIT');
    acquired = false;
  } catch (error) {
    if (callbackCompleted) cleanupFailure = error;
    else failure = error;
  } finally {
    if (token) held.delete(token);
    if (acquired) {
      try {
        db.exec('ROLLBACK');
      } catch (error) {
        cleanupFailure ??= error;
      }
    }
    try {
      db.close();
    } catch (error) {
      cleanupFailure ??= error;
    }
  }
  if (failure) throw failure;
  if (cleanupFailure) {
    if (typeof classifyCompletedCleanup === 'function') return classifyCompletedCleanup(cleanupFailure, result);
    throw cleanupFailure;
  }
  return result;
}

export function assertForwardInvocationLock(root, operationId, token) {
  const current = held.get(token);
  if (
    typeof token !== 'string' ||
    !current ||
    current.project !== path.resolve(root) ||
    current.operationId !== operationId
  )
    throw new Error('forward invocation lock is not held by this process');
}
