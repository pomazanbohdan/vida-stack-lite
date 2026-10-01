import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const numericReason = 'one or more maintained functions do not satisfy CRAP <5 and complexity <=10';
const formula = 'complexity^2 * (1-coverage)^3 + complexity';
const supported = /\.(?:[cm]?[jt]sx?|jsonc?|md|mdx|yaml|yml|toml|html|css|scss|vue|svelte)$/i;
const maintained = (file) =>
  (file.startsWith('packages/agent/') && !/^packages\/agent\/(?:node_modules|dist|coverage|\.tmp)\//.test(file)) ||
  /^(?:tooling\/agent\/|tests\/agent\/|\.githooks\/)/.test(file);

function command(executable, args, cwd, env, capture = true) {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.signal || !Number.isInteger(result.status))
    throw new Error(`${executable} failed: ${result.error ?? result.signal}`);
  return result;
}
function checked(executable, args, cwd, env) {
  const result = command(executable, args, cwd, env);
  if (result.status !== 0) throw new Error(`${executable} ${args[0]} failed:\n${result.stdout}${result.stderr}`);
  return result.stdout;
}
const nul = (text) => text.split('\0').filter(Boolean);
function git(root, args) {
  return checked('git', args, root, process.env);
}

export function pushedHead(input, head) {
  let count = 0;
  for (const row of input.split(/\r?\n/).filter(Boolean)) {
    const fields = row.trim().split(/\s+/);
    if (
      fields.length !== 4 ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(fields[1]) ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(fields[3])
    )
      throw new Error('Malformed pre-push ref row.');
    if (/^0+$/.test(fields[1])) continue;
    if (fields[1] !== head) throw new Error('Every pushed local object must be current HEAD.');
    count++;
  }
  return count;
}

function stableInputs(root, push = false) {
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
  const bytes = files.map((file) => {
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) return [file, null];
    if (!lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink())
      throw new Error(`Checked input is not a regular file: ${file}`);
    return [file, readFileSync(absolute).toString('base64')];
  });
  return JSON.stringify([git(root, ['rev-parse', 'HEAD']), git(root, ['ls-files', '--stage', '-z']), bytes]);
}

function environment(pkg) {
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

function installedPackage(pkg, name, version) {
  const directory = path.join(pkg, 'node_modules', name);
  const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  if (manifest.version !== version)
    throw new Error(`Install the frozen package tools locally: ${name} ${version} required.`);
  return { directory, manifest };
}

function installedTool(pkg, name, version) {
  const { directory, manifest } = installedPackage(pkg, name, version);
  const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin[name === 'typescript' ? 'tsc' : name];
  return path.join(directory, bin);
}

function installedBun(pkg, env) {
  const pin = readFileSync(path.join(pkg, '.bun-version'), 'utf8').trim();
  const manifest = JSON.parse(readFileSync(path.join(pkg, 'package.json'), 'utf8'));
  if (pin !== '1.4.2' || manifest.packageManager !== `bun@${pin}` || manifest.engines?.bun !== pin)
    throw new Error('Bun pin/manifest mismatch.');
  const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH');
  for (const directory of String(env[pathKey] ?? '')
    .split(path.delimiter)
    .filter(Boolean)) {
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

export function measuredMaxima(report, status, inventory) {
  if (
    report.schema !== 'CandidateCrapReport/v1' ||
    report.formula !== formula ||
    report.required_crap !== '<5' ||
    report.maximum_complexity !== 10
  )
    throw new Error('Malformed CRAP report header.');
  const numeric = status === 1 && report.status === 'fail' && report.reason === numericReason;
  if (!(status === 0 && report.status === 'pass') && !numeric)
    throw new Error(`Technical CRAP failure: ${report.reason ?? status}`);
  const rows = numeric ? report.details?.functions : report.functions;
  if (!Array.isArray(rows) || !rows.length) throw new Error('Missing complete CRAP function report.');
  const keys = new Set();
  for (const row of rows) {
    const key = `${row.file}:${row.start_offset}:${row.end_offset}`;
    const expected = inventory.get(key);
    if (
      !expected ||
      keys.has(key) ||
      row.complexity !== expected ||
      !Number.isInteger(row.complexity) ||
      row.complexity < 1 ||
      !Number.isFinite(row.coverage) ||
      row.coverage < 0 ||
      row.coverage > 1 ||
      !Number.isFinite(row.crap) ||
      Math.abs(row.crap - (row.complexity ** 2 * (1 - row.coverage) ** 3 + row.complexity)) > 1e-9 ||
      typeof row.covered !== 'boolean' ||
      !Number.isSafeInteger(row.executions) ||
      row.executions < 0 ||
      row.covered !== row.executions > 0 ||
      !['v8-statements', 'v8-function-entry-fallback'].includes(row.coverage_source) ||
      row.coverage_mapping === 'missing'
    )
      throw new Error('Malformed, unmapped or incomplete CRAP function report.');
    keys.add(key);
  }
  if (keys.size !== inventory.size) throw new Error('CRAP function inventory is incomplete.');
  const failed = rows.filter((row) => !row.covered || row.complexity > 10 || row.crap >= 5);
  if (numeric ? JSON.stringify(report.details.failed) !== JSON.stringify(failed) || !failed.length : failed.length)
    throw new Error('CRAP status does not match numeric results.');
  return {
    maximum_crap: Math.max(...rows.map((row) => row.crap)),
    maximum_complexity: Math.max(...rows.map((row) => row.complexity)),
  };
}

async function functionInventory(pkg) {
  const { maintainedSourceInventory } = await import(
    pathToFileURL(path.join(pkg, 'tooling/maintained-source-inventory.mjs'))
  );
  const { parse } = await import(pathToFileURL(path.join(pkg, 'node_modules/@babel/parser/lib/index.js')));
  const selected = maintainedSourceInventory(pkg);
  const files = [
    ...new Set([
      ...selected.v8CoverageSources,
      ...selected.bunCoverageSources.filter((file) => selected.typescriptSources.includes(file)),
    ]),
  ].sort();
  const functions = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'ObjectMethod',
    'ClassMethod',
    'ClassPrivateMethod',
  ]);
  const decisions = new Set([
    'IfStatement',
    'ConditionalExpression',
    'ForStatement',
    'ForInStatement',
    'ForOfStatement',
    'WhileStatement',
    'DoWhileStatement',
    'CatchClause',
  ]);
  const children = (node) =>
    Object.entries(node)
      .filter(([key, value]) => !['loc', 'start', 'end', 'extra'].includes(key) && value && typeof value === 'object')
      .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));
  const inventory = new Map();
  for (const file of files) {
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (functions.has(node.type) && node.body) {
        let complexity = 1;
        function count(current) {
          if (current !== node && functions.has(current.type)) return;
          if (
            decisions.has(current.type) ||
            (current.type === 'SwitchCase' && current.test) ||
            (current.type === 'LogicalExpression' && ['&&', '||', '??'].includes(current.operator)) ||
            (current.type === 'AssignmentExpression' && ['&&=', '||=', '??='].includes(current.operator))
          )
            complexity++;
          children(current).forEach(count);
        }
        count(node.body);
        inventory.set(`${file}:${node.start}:${node.end}`, complexity);
      }
      children(node).forEach(visit);
    }
    visit(parse(readFileSync(path.join(pkg, file), 'utf8'), { sourceType: 'module', plugins: ['typescript'] }));
  }
  return inventory;
}

export function baseline(directory, measurement) {
  const file = path.join(directory, 'allowance.json');
  const marker = directory + '.initialized';
  if (existsSync(marker)) {
    if (
      !lstatSync(marker).isFile() ||
      lstatSync(marker).isSymbolicLink() ||
      readFileSync(marker, 'utf8') !== 'GitQualityAllowance/v1\n' ||
      !existsSync(directory)
    )
      throw new Error('Invalid or missing initialized quality baseline.');
  } else if (existsSync(directory)) throw new Error('Quality baseline initialization marker is missing.');
  if (existsSync(directory)) {
    if (lstatSync(directory).isSymbolicLink() || !lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())
      throw new Error('Invalid or missing initialized quality baseline.');
    const allowed = JSON.parse(readFileSync(file, 'utf8'));
    if (
      allowed.schema !== 'GitQualityAllowance/v1' ||
      Object.keys(allowed).sort().join(',') !== 'maximum_complexity,maximum_crap,schema' ||
      !Number.isFinite(allowed.maximum_crap) ||
      allowed.maximum_crap < 1 ||
      !Number.isInteger(allowed.maximum_complexity) ||
      allowed.maximum_complexity < 1
    )
      throw new Error('Corrupt quality baseline.');
    if (measurement.maximum_crap > allowed.maximum_crap || measurement.maximum_complexity > allowed.maximum_complexity)
      throw new Error('CRAP or complexity exceeds the fixed measured allowance.');
    return;
  }
  writeFileSync(marker, 'GitQualityAllowance/v1\n', { flag: 'wx' });
  mkdirSync(directory);
  const temporary = path.join(directory, 'allowance.pending');
  writeFileSync(temporary, JSON.stringify({ schema: 'GitQualityAllowance/v1', ...measurement }) + '\n', { flag: 'wx' });
  renameSync(temporary, file);
}

async function main(mode) {
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
  const pkg = path.join(root, 'packages/agent');
  const env = environment(pkg);
  if (mode === 'pre-commit') {
    const selected = nul(git(root, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']));
    const unstaged = new Set(nul(git(root, ['diff', '--name-only', '-z'])));
    if (selected.some((file) => unstaged.has(file)))
      throw new Error('Partially staged file: resolve staging before formatting.');
    stableInputs(root);
    const formatter = installedTool(pkg, 'oxfmt', '0.64.0');
    const compiler = installedTool(pkg, 'typescript', '7.0.2');
    const files = selected.filter((file) => supported.test(file));
    for (const file of files)
      if (!lstatSync(path.join(root, file)).isFile() || lstatSync(path.join(root, file)).isSymbolicLink())
        throw new Error('Formatting requires regular files.');
    if (files.length) {
      const args = [formatter, '--config', path.join(pkg, '.oxfmtrc.json')];
      const index = git(root, ['ls-files', '--stage', '-z']);
      checked(process.execPath, [...args, '--', ...files], root, env);
      const formatted = files.map((file) => readFileSync(path.join(root, file)).toString('base64'));
      checked(process.execPath, [...args, '--check', '--', ...files], root, env);
      if (
        git(root, ['ls-files', '--stage', '-z']) !== index ||
        files.some((file, i) => readFileSync(path.join(root, file)).toString('base64') !== formatted[i])
      )
        throw new Error('Index or formatted files changed; no restaging performed.');
      git(root, ['add', '--', ...files]);
    }
    const before = stableInputs(root);
    checked(process.execPath, [compiler, '--project', path.join(pkg, 'tsconfig.json'), '--noEmit'], root, env);
    if (stableInputs(root) !== before) throw new Error('Checked inputs changed during typechecking.');
    return;
  }
  if (mode !== 'pre-push') throw new Error('Expected pre-commit or pre-push.');
  const head = git(root, ['rev-parse', 'HEAD']).trim();
  if (!pushedHead(readFileSync(0, 'utf8'), head)) return;
  const before = stableInputs(root, true);
  const bun = installedBun(pkg, env);
  const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
  env[pathKey] = path.dirname(bun) + path.delimiter + (env[pathKey] ?? '');
  installedTool(pkg, 'typescript', '7.0.2');
  installedPackage(pkg, 'vitest', '4.1.10');
  installedPackage(pkg, '@vitest/coverage-v8', '4.1.10');
  installedPackage(pkg, '@babel/parser', '8.0.4');
  const gitDirectory = path.resolve(root, git(root, ['rev-parse', '--git-common-dir']).trim());
  const lock = path.join(gitDirectory, 'vida-quality-run.lock');
  mkdirSync(lock);
  try {
    const reportFile = path.join(pkg, 'coverage/crap-report.json');
    if (existsSync(reportFile)) unlinkSync(reportFile);
    const run = (script, capture = false) =>
      command(
        bun,
        ['--no-env-file', '--no-install', '--config=' + path.join(pkg, 'bunfig.toml'), 'run', script],
        pkg,
        env,
        capture,
      );
    const collection = run('test:coverage:pinned');
    const coverage = run('coverage:gate:pinned', true);
    process.stdout.write(coverage.stdout);
    process.stderr.write(coverage.stderr);
    const crap = run('crap:pinned');
    if (stableInputs(root, true) !== before) throw new Error('Checked HEAD inputs changed during collection.');
    if (collection.status !== 0) throw new Error('Fresh coverage test collection failed; push rejected.');
    const measurement = measuredMaxima(
      JSON.parse(readFileSync(reportFile, 'utf8')),
      crap.status,
      await functionInventory(pkg),
    );
    const coverageReport = JSON.parse(coverage.stdout);
    if (
      coverage.status !== 0 ||
      coverageReport.schema !== 'CandidateCoverageReport/v1' ||
      coverageReport.status !== 'pass'
    )
      throw new Error('Independent exact100 coverage gate failed; push rejected.');
    baseline(path.join(gitDirectory, 'vida-quality-allowance'), measurement);
    if (stableInputs(root, true) !== before) throw new Error('Checked HEAD inputs changed before completion.');
  } finally {
    rmdirSync(lock);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv[2]).catch((error) => {
    process.stderr.write(`Git quality hook: ${error.message}\n`);
    process.exitCode = 1;
  });
}
