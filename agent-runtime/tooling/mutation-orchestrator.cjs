'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const espree = require('espree');
const definition = require('./mutation-partitions.cjs');

const toolingRoot = __dirname;
const runtimeRoot = path.resolve(toolingRoot, '..');
const repositoryRoot = path.resolve(runtimeRoot, '..');
const outputRoot = path.join(repositoryRoot, '.planning', 'agent-flow', 'test-output', 'mutation');
const partitionRoot = path.join(outputRoot, 'partitions');
const groupRoot = path.join(outputRoot, 'groups');
const canonicalReport = path.join(outputRoot, 'mutation.json');
const manifestPath = path.join(outputRoot, 'mutation-partition-manifest.json');
const receiptPath = path.join(outputRoot, 'mutation-partition-receipt.json');
const progressPath = path.join(groupRoot, 'mutation-progress.json');
const defaultMutationWallTimeoutMs = 24 * 60 * 60 * 1000;

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function revision() { const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true }); if (r.status !== 0) throw new Error('git revision unavailable'); return r.stdout.trim(); }
function nodeName(node) { if (node.type === 'FunctionDeclaration') return node.id.name; if (node.type === 'VariableDeclaration') return node.declarations.map(x => x.id.name).join(','); return node.type; }
function parseSource(source) { return espree.parse(source, { ecmaVersion: 'latest', sourceType: 'script', loc: true, range: true }); }
function unique(values, label) { if (new Set(values).size !== values.length) throw new Error(`${label} duplicated`); }
function mutationWallTimeoutMs() {
  const raw = process.env.AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS;
  if (raw === undefined) return defaultMutationWallTimeoutMs;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 60_000 || value > defaultMutationWallTimeoutMs) throw new Error(`AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS must be an integer between 60000 and ${defaultMutationWallTimeoutMs}`);
  return value;
}
function mutationOutputMode() {
  const value = process.env.AGENT_RUNTIME_MUTATION_OUTPUT || 'summary';
  if (!['summary', 'full'].includes(value)) throw new Error('AGENT_RUNTIME_MUTATION_OUTPUT must be summary or full');
  return value;
}
function compactProcessOutput(result) {
  const text = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  if (!text) return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  return `: ${lines.slice(-40).join('\n')}`;
}
function mutationGitIsolationEnv(base = process.env) {
  return { ...base, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_PARAMETERS: "'core.hooksPath=NUL' 'maintenance.auto=false'", GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', HUSKY: '0' };
}
function writeProgress(target, status, extra = {}) {
  writeJson(progressPath, { schema: 'MutationProgress/v1', status, target_id: target.id, execution_group: target.id, started_at: extra.started_at || new Date().toISOString(), updated_at: new Date().toISOString(), ...extra });
}

function sourcePartitions(spec, source) {
  const body = parseSource(source).body;
  if (!body.length) throw new Error(`${spec.file} has no AST body`);
  unique(spec.domains.map(x => x.id), 'partition id');
  unique(spec.domains.map(x => x.start), 'partition anchor');
  if (spec.domains[0].start !== '$start') throw new Error(`${spec.file} first partition must start at $start`);
  const names = body.map(nodeName);
  const starts = spec.domains.map((domain, index) => index === 0 ? 0 : names.indexOf(domain.start));
  if (starts.some(x => x < 0)) throw new Error(`${spec.file} partition anchor missing`);
  if (starts.some((x, index) => index && x <= starts[index - 1])) throw new Error(`${spec.file} partition anchors out of order`);
  const lineCount = source.split(/\r?\n/).length;
  const domains = spec.domains.map((domain, index) => {
    const first = starts[index], next = starts[index + 1] ?? body.length;
    const nodes = body.slice(first, next);
    const start_line = index === 0 ? 1 : nodes[0].loc.start.line;
    const end_line = index + 1 === spec.domains.length ? lineCount : body[next].loc.start.line - 1;
    return { ...domain, file: spec.file, start_line, end_line, ast_nodes: nodes.map(nodeName) };
  });
  for (const node of body) {
    const owners = domains.filter(x => node.loc.start.line >= x.start_line && node.loc.end.line <= x.end_line);
    if (owners.length !== 1) throw new Error(`${spec.file}:${node.loc.start.line} AST ownership is ${owners.length}`);
  }
  for (let line = 1; line <= lineCount; line++) if (domains.filter(x => line >= x.start_line && line <= x.end_line).length !== 1) throw new Error(`${spec.file}:${line} source ownership gap/overlap`);
  return domains;
}

function executionGroups(partitions, specs) {
  if (!Array.isArray(specs) || !specs.length) throw new Error('mutation execution groups missing');
  unique(specs.map(x => x.id), 'execution group id');
  const domainIds = partitions.map(x => x.id), assigned = specs.flatMap(x => x.domain_ids || []);
  unique(assigned, 'execution group domain');
  if ([...assigned].sort().join('|') !== [...domainIds].sort().join('|')) throw new Error('execution group domain set incomplete');
  return specs.map(spec => {
    const domains = spec.domain_ids.map(id => partitions.find(x => x.id === id));
    if (domains.some(x => !x)) throw new Error(`${spec.id} execution group domain missing`);
    if (new Set(domains.map(x => x.file)).size !== 1) throw new Error(`${spec.id} execution group crosses sources`);
    for (let index = 1; index < domains.length; index++) if (domains[index].start_line !== domains[index - 1].end_line + 1) throw new Error(`${spec.id} execution group is not contiguous`);
    return { id: spec.id, domain_ids: [...spec.domain_ids], file: domains[0].file, start_line: domains[0].start_line, end_line: domains.at(-1).end_line, tests: [...new Set([...domains.flatMap(x => x.tests), ...(spec.tests || [])])] };
  });
}

function buildManifest(spec = definition) {
  unique(spec.sources.map(x => x.file), 'source file');
  const sources = {}, partitions = [];
  for (const sourceSpec of spec.sources) {
    const absolute = path.join(runtimeRoot, sourceSpec.file), source = fs.readFileSync(absolute, 'utf8');
    sources[sourceSpec.file] = { sha256: sha256(source), bytes: Buffer.byteLength(source) };
    partitions.push(...sourcePartitions(sourceSpec, source));
  }
  unique(partitions.map(x => x.id), 'global partition id');
  const groups = executionGroups(partitions, spec.execution_groups);
  return { schema: 'MutationPartitionManifest/v1', revision: revision(), generated_at: new Date().toISOString(), definition_sha256: sha256(JSON.stringify(spec)), sources, partitions, groups };
}

function assertCurrent(manifest) {
  if (manifest.revision !== revision()) throw new Error('mutation manifest revision stale');
  for (const [file, binding] of Object.entries(manifest.sources)) if (sha256(fs.readFileSync(path.join(runtimeRoot, file))) !== binding.sha256) throw new Error(`${file} mutation manifest source stale`);
  return true;
}
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); const temp = `${file}.${process.pid}.tmp`; fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`); fs.renameSync(temp, file); }
function mutantIdentity(file, mutant) { const l = mutant.location; return [file, l.start.line, l.start.column, l.end.line, l.end.column, mutant.mutatorName, mutant.replacement].join('|'); }
function ownerFor(manifest, file, mutant) { return manifest.partitions.filter(x => x.file === file && mutant.location.start.line >= x.start_line && mutant.location.end.line <= x.end_line); }
function mergeTests(reports) {
  const records = new Map(), sources = new Map(), localMaps = {};
  for (const [partition, report] of Object.entries(reports)) {
    const local = localMaps[partition] = new Map();
    for (const [file, entry] of Object.entries(report.testFiles || {})) {
      if (sources.has(file) && sources.get(file) !== entry.source) throw new Error(`${partition} test source inconsistent`);
      sources.set(file, entry.source);
      for (const test of entry.tests || []) { const key = `${file}\u0000${test.name}`; records.set(key, { file, name: test.name }); local.set(String(test.id), key); }
    }
  }
  const keys = [...records.keys()].sort(), ids = new Map(keys.map((key, index) => [key, String(index)])), testFiles = {};
  for (const key of keys) { const row = records.get(key), entry = testFiles[row.file] ||= { tests: [], source: sources.get(row.file) }; entry.tests.push({ id: ids.get(key), name: row.name }); }
  const remap = (partition, values = []) => values.map(value => { const key = localMaps[partition].get(String(value)); if (!key) throw new Error(`${partition} mutant test attribution missing`); return ids.get(key); });
  return { remap, testFiles };
}

function aggregate(manifest, reports) {
  assertCurrent(manifest);
  const expected = manifest.groups.map(x => x.id).sort();
  if (Object.keys(reports).sort().join('|') !== expected.join('|')) throw new Error('mutation partition report set incomplete');
  const files = {}, seen = new Set(), statuses = {}, tests = mergeTests(reports), report_bindings = {};
  for (const group of manifest.groups) {
    const report = reports[group.id];
    report_bindings[group.id] = sha256(JSON.stringify(report));
    let groupMutants = 0;
    for (const [file, entry] of Object.entries(report.files || {})) {
      const digest = manifest.sources[file]?.sha256;
      if (!digest || sha256(entry.source) !== digest) throw new Error(`${group.id} report source stale`);
      const target = files[file] ||= { language: entry.language, source: entry.source, mutants: [] };
      for (const mutant of entry.mutants) {
        const owners = ownerFor(manifest, file, mutant);
        if (owners.length !== 1 || !group.domain_ids.includes(owners[0].id)) throw new Error(`${group.id} mutant outside semantic owner`);
        const identity = mutantIdentity(file, mutant);
        if (seen.has(identity)) throw new Error(`duplicate mutant identity ${identity}`);
        seen.add(identity); groupMutants++; statuses[mutant.status] = (statuses[mutant.status] || 0) + 1;
        if (!['Killed', 'Timeout'].includes(mutant.status)) throw new Error(`mutation gate status ${mutant.status}`);
        target.mutants.push({ ...mutant, id: identity, semantic_domain: owners[0].id, execution_group: group.id, killedBy: tests.remap(group.id, mutant.killedBy), coveredBy: tests.remap(group.id, mutant.coveredBy) });
      }
    }
    if (!groupMutants) throw new Error(`${group.id} mutation group empty`);
  }
  for (const entry of Object.values(files)) entry.mutants.sort((a, b) => a.id.localeCompare(b.id));
  const report = { schemaVersion: '1.0', thresholds: { high: 100, low: 100, break: 100 }, projectRoot: runtimeRoot, files, testFiles: tests.testFiles };
  return { report, receipt: { schema: 'MutationPartitionReceipt/v1', revision: manifest.revision, definition_sha256: manifest.definition_sha256, source_bindings: manifest.sources, group_report_bindings: report_bindings, execution_groups: expected, semantic_domains: manifest.partitions.map(x => x.id).sort(), mutant_count: seen.size, statuses, timeout_is_killed_equivalent: true, result: 'passed' } };
}

function readReports(manifest) { return Object.fromEntries(manifest.groups.map(x => [x.id, JSON.parse(fs.readFileSync(path.join(groupRoot, `${x.id}.json`), 'utf8'))])); }
function selectGroups(manifest, value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('mutation group profile required');
  const ids = value.split(',').map(id => id.trim()).filter(Boolean);
  unique(ids, 'mutation group profile');
  const groups = ids.map(id => manifest.groups.find(group => group.id === id));
  if (groups.some(group => !group)) throw new Error('mutation group profile unknown');
  return groups;
}
function runMutation(manifest, target, reportFile, tests) {
  assertCurrent(manifest);
  const reportRel = path.relative(repositoryRoot, reportFile);
  const output = mutationOutputMode();
  const startedAt = new Date().toISOString();
  writeProgress(target, 'running', { started_at: startedAt, report: reportRel, tests: tests.length });
  try {
    const result = spawnSync(process.execPath, [path.join(toolingRoot, 'node_modules', '@stryker-mutator', 'core', 'bin', 'stryker.js'), 'run', path.join(toolingRoot, 'stryker.config.mjs'), '--mutate', `${target.file}:${target.start_line}-${target.end_line}`], {
      cwd: runtimeRoot,
      stdio: output === 'full' ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: mutationWallTimeoutMs(),
      env: mutationGitIsolationEnv({ ...process.env, AGENT_RUNTIME_MUTATION_REPORT: reportRel, AGENT_RUNTIME_MUTATION_VITEST_CONFIG: 'tooling/vitest.mutation-partition.config.mjs', AGENT_RUNTIME_MUTATION_TESTS: tests.join(';') })
    });
    if (result.error && 'code' in result.error && result.error.code === 'ETIMEDOUT') throw new Error(`${target.id} mutation exceeded wall timeout ${mutationWallTimeoutMs()}ms`);
    if (result.status !== 0) throw new Error(`${target.id} mutation failed${output === 'summary' ? compactProcessOutput(result) : ''}`);
    assertCurrent(manifest);
    writeProgress(target, 'completed', { started_at: startedAt, report: reportRel, tests: tests.length });
  } catch (error) {
    writeProgress(target, 'failed', { started_at: startedAt, report: reportRel, tests: tests.length, error: error.message });
    throw error;
  }
}
function runPartition(manifest, partition) { runMutation(manifest, partition, path.join(partitionRoot, `${partition.id}.json`), partition.tests); }
function runGroup(manifest, group) { runMutation(manifest, group, path.join(groupRoot, `${group.id}.json`), group.tests); }
function run(argv = process.argv.slice(2)) {
  const manifest = buildManifest(); writeJson(manifestPath, manifest);
  if (argv[0] === '--generate') return manifest;
  const selected = argv[0] === '--partition' ? manifest.partitions.filter(x => x.id === argv[1]) : manifest.partitions;
  if (argv[0] === '--partition') { if (!selected.length) throw new Error('mutation partition unknown'); selected.forEach(x => runPartition(manifest, x)); return manifest; }
  const groups = argv[0] === '--group' || argv[0] === '--groups' ? selectGroups(manifest, argv[1]) : manifest.groups;
  if (!groups.length) throw new Error('mutation execution group unknown');
  groups.forEach(x => runGroup(manifest, x));
  if (argv[0] === '--group' || argv[0] === '--groups') return manifest;
  const combined = aggregate(manifest, readReports(manifest)); writeJson(canonicalReport, combined.report); writeJson(receiptPath, combined.receipt); return combined;
}

if (require.main === module) { try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { aggregate, assertCurrent, buildManifest, executionGroups, mutantIdentity, mutationGitIsolationEnv, mutationOutputMode, mutationWallTimeoutMs, ownerFor, run, selectGroups, sourcePartitions };
