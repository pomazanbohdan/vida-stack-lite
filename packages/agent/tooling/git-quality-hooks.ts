import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { functionInventory as sharedFunctionInventory } from './function-inventory.js';
import { rejectFocusedTests } from './focused-test-guard.js';
import { environmentPath, prependEnvironmentPath } from './environment-path.js';
export { rejectFocusedTests };

type SyncResult = SpawnSyncReturns<string>;
type Environment = Record<string, string | undefined>;
type StagedEntry = { oid: string | undefined; mode: string | undefined };
type FunctionComplexityInventory = Map<string, number>;
type CrapFunctionRow = {
  file: string;
  start_offset: number;
  end_offset: number;
  status?: unknown;
  complexity: number;
  coverage: number;
  crap: number;
  identity: string;
  maximum_complexity: number;
  maximum_crap: number;
};
type CrapMaxima = { maximum_crap: number; maximum_complexity: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}
function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(message);
  return value;
}
function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string') throw new Error(message);
  return value;
}
function hasFiniteCrapBudgets(value: Record<string, unknown>): boolean {
  return (
    typeof value.maximum_complexity === 'number' &&
    Number.isFinite(value.maximum_complexity) &&
    typeof value.maximum_crap === 'number' &&
    Number.isFinite(value.maximum_crap)
  );
}
function isCrapFunctionRow(value: unknown): value is CrapFunctionRow {
  return (
    isRecord(value) &&
    typeof value.file === 'string' &&
    typeof value.start_offset === 'number' &&
    typeof value.end_offset === 'number' &&
    typeof value.complexity === 'number' &&
    typeof value.coverage === 'number' &&
    typeof value.crap === 'number' &&
    typeof value.identity === 'string' &&
    hasFiniteCrapBudgets(value)
  );
}
function currentCrapRow(value: unknown): CrapFunctionRow | undefined {
  if (isRecord(value) && value.status === 'removed') return undefined;
  if (!isCrapFunctionRow(value)) throw new Error('Malformed, unmapped or incomplete CRAP function report.');
  return value;
}

const formula = 'CC^2 * (1 - function_coverage)^3 + CC';
const maintained = (file: string): boolean =>
  ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', '.gitattributes'].includes(file) ||
  (file.startsWith('packages/agent/') && !/^packages\/agent\/(?:node_modules|dist|coverage|\.tmp)\//.test(file)) ||
  /^(?:tooling\/agent\/|tests\/agent\/|\.githooks\/)/.test(file);

function command(
  executable: string,
  args: string[],
  cwd: string,
  env: Environment,
  capture = true,
  input?: string | Buffer,
): SyncResult {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    ...(input === undefined ? {} : { input }),
  });
  if (result.error || result.signal || !Number.isInteger(result.status))
    throw new Error(`${executable} failed: ${result.error ?? result.signal}`);
  return result;
}
function capturedFailureOutput(result: SyncResult): string {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}
function checkedOutput(result: SyncResult, executable: string, args: string[]): string {
  if (result.status !== 0) throw new Error(`${executable} ${args[0]} failed:\n${capturedFailureOutput(result)}`);
  if (typeof result.stdout !== 'string') throw new Error(`${executable} ${args[0]} produced no captured output.`);
  return result.stdout;
}
function checked(executable: string, args: string[], cwd: string, env: Environment, input?: string | Buffer): string {
  return checkedOutput(command(executable, args, cwd, env, true, input), executable, args);
}
const nul = (text: string): string[] => text.split('\0').filter(Boolean);
function git(root: string, args: string[], input?: string | Buffer): string {
  return checked('git', args, root, process.env, input);
}

export function pushedHead(input: string, head: string): number {
  let count = 0;
  for (const row of input.split(/\r?\n/).filter(Boolean)) {
    const { localObject } = parsePushRefRow(row);
    if (/^0+$/.test(localObject)) continue;
    if (localObject !== head) throw new Error('Every pushed local object must be current HEAD.');
    count++;
  }
  return count;
}

function parsePushRefRow(row: string): { localObject: string; remoteObject: string } {
  const fields = row.trim().split(/\s+/);
  if (fields.length !== 4) throw new Error('Malformed pre-push ref row.');
  const [, localObject, , remoteObject] = fields;
  if (
    typeof localObject !== 'string' ||
    typeof remoteObject !== 'string' ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(localObject) ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(remoteObject)
  )
    throw new Error('Malformed pre-push ref row.');
  return { localObject, remoteObject };
}

export function stableInputs(root: string, push = false): string {
  const changed = nul(git(root, ['diff', '--name-only', '-z'])).filter(maintained);
  const unknown = nul(git(root, ['ls-files', '--others', '--exclude-standard', '-z'])).filter(maintained);
  const staged = push ? nul(git(root, ['diff', '--cached', '--name-only', '-z', 'HEAD'])).filter(maintained) : [];
  if (changed.length || unknown.length || staged.length)
    throw new Error(
      `Checked inputs differ from ${push ? 'HEAD' : 'the index'}; resolve staging first:\n${[...new Set([...changed, ...unknown, ...staged])].join('\n')}`,
    );
  const files = nul(git(root, ['ls-files', '-z']))
    .filter(maintained)
    .sort();
  const bytes: Array<[string, string]> = files.map((file) => {
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) throw new Error(`Checked input is missing: ${file}`);
    if (!lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink())
      throw new Error(`Checked input is not a regular file: ${file}`);
    const entry: [string, string] = [file, readFileSync(absolute).toString('base64')];
    return entry;
  });
  const index = git(root, ['ls-files', '--stage', '-z']);
  const attributes = git(root, ['write-tree']).trim();
  const ordered = [...bytes].sort(
    ([left], [right]) =>
      Number(!left.endsWith('.gitattributes')) - Number(!right.endsWith('.gitattributes')) || left.localeCompare(right),
  );
  const expected = indexObjects(index),
    objects: Array<[string, string]> = [];
  for (const [file, contents] of ordered) {
    const oid = git(
      root,
      ['--attr-source=' + attributes, 'hash-object', '--path=' + file, '--stdin'],
      Buffer.from(contents, 'base64'),
    ).trim();
    if (expected.get(file)?.oid !== oid)
      throw new Error('Staged bytes or mode changed after validation; commit denied.');
    objects.push([file, oid]);
  }
  verifyStagedObjects(root, objects, index);
  return JSON.stringify([git(root, ['rev-parse', 'HEAD']), index, bytes]);
}

function environment(pkg: string): Environment {
  const env = { ...process.env };
  for (const key of Object.keys(env))
    if (
      /^(?:NODE_OPTIONS|BUN_OPTIONS|VIDA_STANDALONE_.*|BUN_BE_BUN|COVERAGE_GATE_ROOT|CRAP_GATE_ROOT|BUN_NATIVE_COVERAGE_.*)$/i.test(
        key,
      )
    )
      delete env[key];
  env.COVERAGE_GATE_ROOT = pkg;
  env.CRAP_GATE_ROOT = pkg;
  env.BUN_RUNTIME_TRANSPILER_CACHE_PATH = '0';
  env.npm_config_offline = 'true';
  return env;
}

function installedPackage(pkg: string, name: string, version: string) {
  const directory = path.join(pkg, 'node_modules', name);
  const parsedManifest: unknown = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const manifest = requireRecord(parsedManifest, `Malformed package manifest: ${name}`);
  if (manifest.version !== version)
    throw new Error(`Install the frozen package tools locally: ${name} ${version} required.`);
  return { directory, manifest };
}

function installedTool(pkg: string, name: string, version: string): string {
  const { directory, manifest } = installedPackage(pkg, name, version);
  return path.join(directory, executableEntry(manifest.bin, name));
}

function executableEntry(binValue: unknown, name: string): string {
  const bin =
    typeof binValue === 'string'
      ? binValue
      : isRecord(binValue)
        ? binValue[name === 'typescript' ? 'tsc' : name]
        : undefined;
  if (typeof bin !== 'string') throw new Error(`Malformed executable entry: ${name}`);
  return bin;
}

function installedBun(pkg: string, env: Environment): string {
  const pin = readFileSync(path.join(pkg, '.bun-version'), 'utf8').trim();
  const manifestValue: unknown = JSON.parse(readFileSync(path.join(pkg, 'package.json'), 'utf8'));
  const manifest = requireRecord(manifestValue, 'Bun pin/manifest mismatch.');
  const engines = optionalRecord(manifest.engines);
  const bunVersion = engines?.bun;
  if (pin !== '1.4.2' || manifest.packageManager !== `bun@${pin}` || bunVersion !== pin)
    throw new Error('Bun pin/manifest mismatch.');
  if (process.versions.bun === pin) return realpathSync(process.execPath);
  for (const directory of environmentPath(env).split(path.delimiter).filter(Boolean)) {
    const candidate = path.resolve(
      directory.replace(/^"(.*)"$/, '$1'),
      process.platform === 'win32' ? 'bun.exe' : 'bun',
    );
    if (!existsSync(candidate)) continue;
    const executable = realpathSync(candidate);
    if (checked(executable, ['--version'], pkg, env).trim() !== pin)
      throw new Error(`PATH Bun must be ${pin}; no download fallback is permitted.`);
    return executable;
  }
  throw new Error(`Install Bun ${pin} locally and put it on PATH; no npm-exec/download fallback is permitted.`);
}

export function measuredMaxima(
  reportValue: unknown,
  status: number | null,
  inventory: FunctionComplexityInventory,
): CrapMaxima {
  const report = requireRecord(reportValue, 'Malformed CRAP report header.');
  if (report.schema !== 'VidaCrapBudgetReport/v1' || report.formula !== formula || report.status !== 'pass')
    throw new Error('Malformed CRAP report header.');
  if (status !== 0) throw new Error(`Technical CRAP failure: ${status}`);
  const rows = report.functions;
  if (!Array.isArray(rows) || !rows.length) throw new Error('Missing complete CRAP function report.');
  const keys = new Set();
  const validRows: CrapFunctionRow[] = [];
  for (const rowValue of rows) {
    const typedRow = currentCrapRow(rowValue);
    if (!typedRow) continue;
    const key = `${typedRow.file}:${typedRow.start_offset}:${typedRow.end_offset}`;
    const expected = inventory.get(key);
    if (
      !expected ||
      keys.has(key) ||
      typedRow.complexity !== expected ||
      !Number.isInteger(typedRow.complexity) ||
      typedRow.complexity < 1 ||
      typedRow.coverage !== 1 ||
      !Number.isFinite(typedRow.crap) ||
      Math.abs(typedRow.crap - (typedRow.complexity ** 2 * (1 - typedRow.coverage) ** 3 + typedRow.complexity)) >
        1e-9 ||
      typedRow.complexity > typedRow.maximum_complexity ||
      typedRow.crap > typedRow.maximum_crap
    )
      throw new Error('Malformed, unmapped or incomplete CRAP function report.');
    keys.add(key);
    validRows.push(typedRow);
  }
  if (keys.size !== inventory.size) throw new Error('CRAP function inventory is incomplete.');
  if (report.selector_receipt === undefined || typeof report.coverage_run_id !== 'string')
    throw new Error('CRAP report has no bound coverage selector receipt.');
  return {
    maximum_crap: Math.max(...validRows.map((row) => row.crap)),
    maximum_complexity: Math.max(...validRows.map((row) => row.complexity)),
  };
}

async function functionInventory(pkg: string): Promise<FunctionComplexityInventory> {
  const { maintainedSourceInventory } = await import('./maintained-source-inventory.js');
  const selected = maintainedSourceInventory(pkg);
  const inventory = new Map();
  for (const file of selected.mutationSources) {
    const source = readFileSync(path.join(pkg, file), 'utf8');
    for (const row of sharedFunctionInventory(source, file))
      inventory.set(`${file}:${row.start}:${row.end}`, row.complexity);
  }
  return inventory;
}

function indexObjects(index: string): Map<string, StagedEntry> {
  return new Map(
    nul(index).map((row) => {
      const split = row.indexOf('\t'),
        metadata = row.slice(0, split).split(' ');
      if (split < 0 || metadata[2] !== '0') throw new Error('Unmerged or invalid staged input.');
      return [row.slice(split + 1), { oid: metadata[1], mode: metadata[0] }];
    }),
  );
}
export function verifyStagedObjects(root: string, objects: Array<[string, string]>, index: string): void {
  const staged = indexObjects(git(root, ['ls-files', '--stage', '-z'])),
    previous = indexObjects(index);
  const expected = new Map(previous);
  for (const [file, oid] of objects) {
    const previousEntry = previous.get(file);
    if (!previousEntry) throw new Error('Formatted input is absent from the captured index.');
    expected.set(file, { ...previousEntry, oid });
  }
  if (
    staged.size !== expected.size ||
    [...expected].some(([file, value]) => staged.get(file)?.oid !== value.oid || staged.get(file)?.mode !== value.mode)
  )
    throw new Error('Staged bytes or mode changed after validation; commit denied.');
}

async function main(mode: string | undefined): Promise<void> {
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
  const pkg = path.join(root, 'packages/agent');
  const env = environment(pkg);
  if (mode === 'pre-commit') {
    const bun = installedBun(pkg, env);
    const { runPreCommit } = await import('./knip-precommit.js');
    await runPreCommit({ repositoryRoot: root, bunExecutable: bun, rejectFocusedTests });
    return;
  }
  if (mode !== 'pre-push') throw new Error('Expected pre-commit or pre-push.');
  const head = git(root, ['rev-parse', 'HEAD']).trim();
  if (!pushedHead(readFileSync(0, 'utf8'), head)) return;
  const before = stableInputs(root, true);
  const bun = installedBun(pkg, env);
  const prePushEnv = prependEnvironmentPath(env, path.dirname(bun));
  installedTool(pkg, 'typescript', '7.0.2');
  installedPackage(pkg, 'istanbul-lib-coverage', '3.2.2');
  installedPackage(pkg, 'istanbul-lib-instrument', '6.0.3');
  installedPackage(pkg, '@babel/parser', '8.0.7');
  const gitDirectory = path.resolve(root, git(root, ['rev-parse', '--git-common-dir']).trim());
  const lock = path.join(gitDirectory, 'vida-quality-run.lock');
  mkdirSync(lock);
  try {
    const reportFile = path.join(pkg, 'coverage/bun-unified/crap-budget-report.json');
    const coverageReportFile = path.join(pkg, 'coverage/bun-unified/coverage-final.json');
    if (existsSync(reportFile)) unlinkSync(reportFile);
    const run = (script: string, capture = false): SyncResult =>
      command(
        bun,
        ['--no-env-file', '--no-install', '--config=' + path.join(pkg, 'bunfig.toml'), 'run', script],
        pkg,
        prePushEnv,
        capture,
      );
    const collection = run('test:coverage:pinned');
    if (stableInputs(root, true) !== before) throw new Error('Checked HEAD inputs changed during collection.');
    if (collection.status !== 0) throw new Error('Fresh coverage test collection failed; push rejected.');
    const reportValue: unknown = JSON.parse(readFileSync(reportFile, 'utf8'));
    measuredMaxima(reportValue, collection.status, await functionInventory(pkg));
    const report = requireRecord(reportValue, 'Malformed CRAP report header.');
    const coverageRunId = requireString(report.coverage_run_id, 'CRAP report has no bound coverage selector receipt.');
    const coverageReportValue: unknown = JSON.parse(readFileSync(coverageReportFile, 'utf8'));
    const coverageReport = requireRecord(coverageReportValue, 'Malformed coverage report.');
    if (coverageReport.schema !== 'VidaBunCoverageReport/v1' || coverageReport.run_id !== coverageRunId)
      throw new Error('Coverage and CRAP reports do not share one qualified run.');
    if (stableInputs(root, true) !== before) throw new Error('Checked HEAD inputs changed before completion.');
  } finally {
    rmdirSync(lock);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv[2]).catch(reportHookError);
}

function reportHookError(error: unknown): void {
  process.stderr.write(`Git quality hook: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
