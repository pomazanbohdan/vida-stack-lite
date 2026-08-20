'use strict';

const fs = require('fs');
const path = require('path');
const partitions = require('../mutation-partitions.cjs');
const gate = require('../mutation-orchestrator.cjs');
const runtimeRoot = path.resolve(__dirname, '..', '..');
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function reportsFor(manifest, status = 'Killed') {
  return Object.fromEntries(manifest.groups.map((group, groupIndex) => {
    const source = fs.readFileSync(path.join(runtimeRoot, group.file), 'utf8');
    const mutants = group.domain_ids.map((id, index) => { const domain=manifest.partitions.find(x=>x.id===id); return { id: `${groupIndex}-${index}`, mutatorName:'Diagnostic', replacement:`replacement-${groupIndex}-${index}`, status, location:{start:{line:domain.start_line,column:0},end:{line:domain.start_line,column:1}}, killedBy:['0'], coveredBy:['0'] }; });
    return [group.id, { schemaVersion: '1.0', files: { [group.file]: { language: 'javascript', source, mutants } }, testFiles: { 'tooling/tests/public.test.cjs': { source: 'test source', tests: [{ id: '0', name: 'public behavior' }] } } }];
  }));
}

describe('semantic mutation partition gate', () => {
  test('Espree anchors own every current AST node and source line exactly once', () => {
    const manifest = gate.buildManifest();
    expect(manifest.schema).toBe('MutationPartitionManifest/v1');
    expect(manifest.partitions).toHaveLength(partitions.sources.flatMap(x=>x.domains).length);
    expect(manifest.groups).toHaveLength(partitions.execution_groups.length);
    expect(new Set(manifest.partitions.map(x => x.id)).size).toBe(manifest.partitions.length);
    for (const source of partitions.sources) {
      const rows = manifest.partitions.filter(x => x.file === source.file);
      expect(rows[0].start_line).toBe(1);
      for (let i = 1; i < rows.length; i++) expect(rows[i].start_line).toBe(rows[i - 1].end_line + 1);
      expect(rows.at(-1).end_line).toBe(fs.readFileSync(path.join(runtimeRoot, source.file), 'utf8').split(/\r?\n/).length);
      expect(rows.every(x => x.tests.length && x.ast_nodes.length)).toBe(true);
    }
  });
  test('missing, duplicated and out-of-order semantic anchors fail closed', () => {
    const source = 'function first() {}\nfunction second() {}\n';
    expect(() => gate.sourcePartitions({ file: 'x.cjs', domains: [{ id: 'a', start: '$start', tests: ['a'] }, { id: 'b', start: 'missing', tests: ['b'] }] }, source)).toThrow(/anchor missing/);
    expect(() => gate.sourcePartitions({ file: 'x.cjs', domains: [{ id: 'a', start: '$start', tests: ['a'] }, { id: 'b', start: '$start', tests: ['b'] }] }, source)).toThrow(/anchor.*duplicated/);
    expect(() => gate.sourcePartitions({ file: 'x.cjs', domains: [{ id: 'a', start: '$start', tests: ['a'] }, { id: 'b', start: 'second', tests: ['b'] }, { id: 'c', start: 'first', tests: ['c'] }] }, source)).toThrow(/out of order/);
  });
  test('execution groups cover every semantic domain exactly once and remain source-contiguous',()=>{
    const manifest=gate.buildManifest(),assigned=manifest.groups.flatMap(x=>x.domain_ids);
    expect(manifest.groups).toHaveLength(partitions.execution_groups.length);expect(new Set(assigned).size).toBe(manifest.partitions.length);expect([...assigned].sort()).toEqual(manifest.partitions.map(x=>x.id).sort());
    expect(()=>gate.executionGroups(manifest.partitions,manifest.groups.map(x=>({id:x.id,domain_ids:x.domain_ids.slice(1)})))).toThrow(/set incomplete/);
    const duplicate=manifest.groups.map(x=>({id:x.id,domain_ids:[...x.domain_ids]}));duplicate[1].domain_ids[0]=duplicate[0].domain_ids[0];expect(()=>gate.executionGroups(manifest.partitions,duplicate)).toThrow(/duplicated/);
  });
  test('selective mutation profiles are explicit and never pretend to be complete', () => {
    const manifest = gate.buildManifest();
    expect(gate.selectGroups(manifest, 'runtime-foundation,legacy')).toHaveLength(2);
    expect(() => gate.selectGroups(manifest, 'runtime-foundation,runtime-foundation')).toThrow(/duplicated/);
    expect(() => gate.selectGroups(manifest, 'missing')).toThrow(/unknown/);
    expect(() => gate.selectGroups(manifest, '')).toThrow(/required/);
  });
  test('mutation wall budget defaults to 24 hours and output stays compact unless explicitly expanded', () => {
    const priorTimeout=process.env.AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS,priorOutput=process.env.AGENT_RUNTIME_MUTATION_OUTPUT;
    try {
      delete process.env.AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS;
      delete process.env.AGENT_RUNTIME_MUTATION_OUTPUT;
      expect(gate.mutationWallTimeoutMs()).toBe(24*60*60*1000);
      expect(gate.mutationOutputMode()).toBe('summary');
      process.env.AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS='60000';
      expect(gate.mutationWallTimeoutMs()).toBe(60000);
      process.env.AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS='86400001';
      expect(() => gate.mutationWallTimeoutMs()).toThrow(/between 60000/);
      process.env.AGENT_RUNTIME_MUTATION_OUTPUT='full';
      expect(gate.mutationOutputMode()).toBe('full');
      process.env.AGENT_RUNTIME_MUTATION_OUTPUT='verbose';
      expect(() => gate.mutationOutputMode()).toThrow(/summary or full/);
    } finally {
      if (priorTimeout === undefined) delete process.env.AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS; else process.env.AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS=priorTimeout;
      if (priorOutput === undefined) delete process.env.AGENT_RUNTIME_MUTATION_OUTPUT; else process.env.AGENT_RUNTIME_MUTATION_OUTPUT=priorOutput;
    }
  });
  test('mutation child environment disables Git hooks and automatic maintenance without changing parent config', () => {
    const env = gate.mutationGitIsolationEnv({ FOO: 'bar' });
    expect(env).toMatchObject({ FOO: 'bar', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', HUSKY: '0' });
    expect(env.GIT_CONFIG_PARAMETERS).toContain('core.hooksPath=NUL');
    expect(env.GIT_CONFIG_PARAMETERS).toContain('maintenance.auto=false');
  });
  test('source digest and repository revision bindings reject stale manifests', () => {
    const manifest = gate.buildManifest(); expect(gate.assertCurrent(manifest)).toBe(true);
    const stale = clone(manifest); stale.sources['lib/runtime.cjs'].sha256 = '0'.repeat(64);
    expect(() => gate.assertCurrent(stale)).toThrow(/source stale/);
    expect(() => gate.assertCurrent({ ...manifest, revision: 'stale' })).toThrow(/revision stale/);
  });
  test('aggregation requires every partition and rejects duplicate, stale or non-killed results', () => {
    const manifest = gate.buildManifest(), reports = reportsFor(manifest), combined = gate.aggregate(manifest, reports);
    expect(combined.receipt).toMatchObject({ result: 'passed', mutant_count: manifest.partitions.length, statuses: { Killed: manifest.partitions.length }, timeout_is_killed_equivalent: true, semantic_domains: expect.arrayContaining(manifest.partitions.map(x=>x.id)) });
    expect(Object.values(combined.report.files).flatMap(x=>x.mutants).every(x=>x.semantic_domain&&x.execution_group)).toBe(true);
    expect(combined.report.testFiles['tooling/tests/public.test.cjs'].tests).toEqual([{ id: '0', name: 'public behavior' }]);
    expect(Object.values(combined.report.files).flatMap(x => x.mutants).every(x => x.killedBy[0] === '0' && x.coveredBy[0] === '0')).toBe(true);
    const missing = { ...reports }; delete missing[manifest.groups[0].id]; expect(() => gate.aggregate(manifest, missing)).toThrow(/set incomplete/);
    expect(() => gate.aggregate(manifest, reportsFor(manifest, 'Survived'))).toThrow(/status Survived/);
    const duplicate = reportsFor(manifest); duplicate[manifest.groups[0].id].files[manifest.groups[0].file].mutants.push(clone(duplicate[manifest.groups[0].id].files[manifest.groups[0].file].mutants[0]));
    expect(() => gate.aggregate(manifest, duplicate)).toThrow(/duplicate mutant identity/);
    const stale = reportsFor(manifest); stale[manifest.groups[0].id].files[manifest.groups[0].file].source += '\n'; expect(() => gate.aggregate(manifest, stale)).toThrow(/report source stale/);
  });
  test.each(['Timeout', 'Killed'])('%s is the only accepted killed-equivalent status', status => {
    const manifest = gate.buildManifest(), combined = gate.aggregate(manifest, reportsFor(manifest, status));
    expect(combined.receipt.statuses[status]).toBe(manifest.partitions.length);
  });
});
