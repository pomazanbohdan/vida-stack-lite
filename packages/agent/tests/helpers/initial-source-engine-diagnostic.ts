import { Database } from 'bun:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sessionBridgeDatabasePath } from '../../src/config/project-paths.js';
import type { AgentRuntimeConfig } from '../../src/config/runtime-config.js';

const byteLimit = 24 * 1024;
const textLimit = 800;
const keyPattern = /(^|_)(status|globalstatus|error|errorcause|cause|message|name)$/i;

function safeText(value: string): string {
  return value
    .slice(0, textLimit)
    .replace(/(token|password|secret|authorization)(\s*[:=]\s*)[^\s,;]+/gi, '$1$2[redacted]')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/([?&](?:token|key|secret|password|authorization)=)[^&#\s]+/gi, '$1[redacted]');
}

function collect(
  value: unknown,
  output: { path: string; value: string | number | boolean | null }[],
  at = '$',
  depth = 0,
): void {
  if (depth > 16 || value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.slice(0, 100).forEach((child, index) => collect(child, output, `${at}[${index}]`, depth + 1));
    return;
  }
  for (const [key, entry] of Object.entries(value).slice(0, 200)) {
    const child: unknown = entry;
    const childPath = `${at}.${key}`;
    if (keyPattern.test(key)) {
      if (typeof child === 'string') output.push({ path: childPath, value: safeText(child) });
      else if (typeof child === 'number' || typeof child === 'boolean' || child === null)
        output.push({ path: childPath, value: child });
    }
    if (child !== null && typeof child === 'object') collect(child, output, childPath, depth + 1);
  }
}

export function captureInitialSourceEngineDiagnostic(input: {
  repositoryRoot: string;
  config: AgentRuntimeConfig;
  runId: string;
  outputFile: string;
}): void {
  const { repositoryRoot, config, runId, outputFile } = input;
  const outputRoot = path.resolve(import.meta.dir, '../../../../.tmp');
  const relativeOutput = path.relative(outputRoot, outputFile);
  if (!path.isAbsolute(outputFile) || relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput))
    throw new Error('initial-source diagnostic output must be an absolute path under .tmp');
  const database = new Database(sessionBridgeDatabasePath(repositoryRoot, config), { readonly: true, create: false });
  let receipt: unknown;
  try {
    const row = database
      .query<{ parsed: unknown }, [string]>(
        'SELECT json(snapshot) AS parsed FROM mastra_workflow_snapshot WHERE run_id=? LIMIT 1',
      )
      .get(runId);
    if (!row || typeof row.parsed !== 'string') throw new Error('fixture Mastra snapshot row is unavailable');
    const snapshot: unknown = JSON.parse(row.parsed);
    const entries: { path: string; value: string | number | boolean | null }[] = [];
    collect(snapshot, entries);
    receipt = {
      schema: 'InitialSourceEngineDiagnostic/v1',
      run_id: runId,
      entries: entries.slice(0, 500),
    };
  } finally {
    database.close();
  }
  const bytes = Buffer.from(JSON.stringify(receipt) + '\n');
  if (bytes.length > byteLimit) throw new Error('initial-source diagnostic exceeded its byte bound');
  mkdirSync(path.dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, bytes, { flag: 'wx', mode: 0o600 });
}
