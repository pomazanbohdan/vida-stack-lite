import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { describe, expect, test } from 'bun:test';
import { parse } from '@babel/parser';
import {
  auditSources,
  buildQueue,
  configurationDigest,
  configurationFiles,
  draftPatternProfiles,
} from '../tooling/test-function-audit.js';
import { functionInventory } from '../tooling/function-inventory.ts';

function runFixture(source: string, tests: Record<string, string>, matrix?: Record<string, unknown>) {
  return runSourcesFixture({ 'src/subject.ts': source }, tests, matrix);
}

function runSourcesFixture(
  sourceFiles: Record<string, string>,
  tests: Record<string, string>,
  matrix?: Record<string, unknown>,
  helpers: Record<string, string> = {},
) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-'));
  try {
    mkdirSync(path.join(root, 'src'));
    mkdirSync(path.join(root, 'tests'));
    for (const [file, contents] of Object.entries(sourceFiles)) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), contents);
    }
    for (const [name, contents] of Object.entries(tests)) writeFileSync(path.join(root, 'tests', name), contents);
    for (const [file, contents] of Object.entries(helpers)) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), contents);
    }
    if (matrix !== undefined) writeFileSync(path.join(root, 'matrix.json'), JSON.stringify(matrix));
    return auditSources({
      root,
      sourcePaths: Object.keys(sourceFiles),
      testPaths: Object.keys(tests).map((name) => `tests/${name}`),
      ...(matrix === undefined ? {} : { matrixPath: 'matrix.json' }),
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('function test audit', () => {
  test('repository tooling resolution requires an explicit bounded ancestor and adds no product functions', () => {
    const repository = mkdtempSync(path.join(os.tmpdir(), 'function-audit-repository-'));
    const root = path.join(repository, 'packages/agent');
    try {
      mkdirSync(path.join(root, 'src'), { recursive: true });
      mkdirSync(path.join(root, 'tests'));
      mkdirSync(path.join(repository, 'tooling/agent'), { recursive: true });
      writeFileSync(path.join(root, 'src/subject.ts'), 'export function target() {}');
      writeFileSync(
        path.join(root, 'tests/repository.test.ts'),
        `import { test, expect } from 'bun:test'; import { run } from '../../../tooling/agent/barrel.js'; test('run', () => expect(run()).toBe(1));`,
      );
      writeFileSync(path.join(repository, 'tooling/agent/barrel.ts'), `export { run } from './run.js';`);
      writeFileSync(path.join(repository, 'tooling/agent/run.ts'), 'export function run() { return 1; }');
      const options = { root, sourcePaths: ['src/subject.ts'], testPaths: ['tests/repository.test.ts'] };
      expect(auditSources(options).status).toBe('unknown');
      const report = auditSources({ ...options, resolutionRoot: repository });
      expect(report.status).toBe('reported');
      expect(report.functions).toHaveLength(1);
      expect(report.functions[0]?.cases).toEqual([]);
      expect(report.analysis).toMatchObject({
        sourceAstParses: 1,
        sourceInventoryCalls: 1,
        testParserCalls: 1,
        resolutionAstParses: 2,
        resolutionHashes: 2,
      });
      expect(Object.keys(report.inputHashes.resolution)).toEqual([
        '../../tooling/agent/barrel.ts',
        '../../tooling/agent/run.ts',
      ]);
      writeFileSync(path.join(repository, 'tooling/agent/run.ts'), 'export function run() { return 2; }');
      expect(auditSources({ ...options, resolutionRoot: repository }).inputHashes.config).not.toBe(
        report.inputHashes.config,
      );
      expect(auditSources({ ...options, resolutionRoot: path.dirname(repository) }).status).toBe('unknown');
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  test('repository barrel reexports resolve back to the captured package function identity', () => {
    const repository = mkdtempSync(path.join(os.tmpdir(), 'function-audit-repository-reexport-'));
    const root = path.join(repository, 'packages/agent');
    try {
      mkdirSync(path.join(root, 'src'), { recursive: true });
      mkdirSync(path.join(root, 'tests'));
      mkdirSync(path.join(repository, 'tooling/agent'), { recursive: true });
      writeFileSync(path.join(root, 'src/subject.ts'), 'export function target() { return 1; }');
      writeFileSync(
        path.join(repository, 'tooling/agent/barrel.ts'),
        `export { target as run } from '../../packages/agent/src/subject.js';`,
      );
      writeFileSync(
        path.join(root, 'tests/repository.test.ts'),
        `import { test, expect } from 'bun:test'; import { run } from '../../../tooling/agent/barrel.js'; test('run', () => expect(run()).toBe(1));`,
      );
      const report = auditSources({
        root,
        resolutionRoot: repository,
        sourcePaths: ['src/subject.ts'],
        testPaths: ['tests/repository.test.ts'],
      });
      expect(report.status).toBe('reported');
      expect(report.functions).toHaveLength(1);
      expect(report.functions[0]?.testStatus).toBe('present');
      expect(report.functions[0]?.cases).toEqual([{ file: 'tests/repository.test.ts', name: 'run' }]);
      expect(report.analysis).toMatchObject({
        sourceAstParses: 1,
        sourceInventoryCalls: 1,
        testParserCalls: 1,
        resolutionAstParses: 1,
        resolutionHashes: 1,
      });
      expect(Object.keys(report.inputHashes.resolution)).toEqual(['../../tooling/agent/barrel.ts']);
    } finally {
      rmSync(repository, { recursive: true, force: true });
    }
  });

  test('repository resolution refuses linked tooling and imports outside tooling/agent', () => {
    for (const forbidden of ['file-link', 'directory-link', 'outside']) {
      const repository = mkdtempSync(path.join(os.tmpdir(), 'function-audit-repo-denial-'));
      const root = path.join(repository, 'packages/agent');
      try {
        mkdirSync(path.join(root, 'src'), { recursive: true });
        mkdirSync(path.join(root, 'tests'));
        mkdirSync(path.join(repository, 'tooling/other'), { recursive: true });
        writeFileSync(path.join(root, 'src/subject.ts'), 'export function target() {}');
        writeFileSync(path.join(repository, 'tooling/other/run.ts'), 'export function run() {}');
        if (forbidden === 'directory-link')
          symlinkSync(path.join(repository, 'tooling/other'), path.join(repository, 'tooling/agent'), 'dir');
        else {
          mkdirSync(path.join(repository, 'tooling/agent'));
          if (forbidden === 'file-link')
            symlinkSync(path.join(repository, 'tooling/other/run.ts'), path.join(repository, 'tooling/agent/run.ts'));
        }
        const importPath = forbidden === 'outside' ? '../../../tooling/other/run.js' : '../../../tooling/agent/run.js';
        writeFileSync(
          path.join(root, 'tests/denial.test.ts'),
          `import { test } from 'bun:test'; import { run } from '${importPath}'; test('run', () => run());`,
        );
        const report = auditSources({
          root,
          resolutionRoot: repository,
          sourcePaths: ['src/subject.ts'],
          testPaths: ['tests/denial.test.ts'],
        });
        expect(report.status).toBe('unknown');
        expect(report.inputHashes.resolution).toEqual({});
        expect(report.functions).toHaveLength(1);
        expect(report.functions[0]?.cases).toEqual([]);
      } finally {
        rmSync(repository, { recursive: true, force: true });
      }
    }
  });
  test('non-native host adapter retains bounded read-only audit captures', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-portable-'));
    try {
      mkdirSync(path.join(root, 'src'));
      mkdirSync(path.join(root, 'tests'));
      writeFileSync(path.join(root, 'src/subject.ts'), 'export function target() { return 1; }');
      writeFileSync(
        path.join(root, 'tests/subject.test.ts'),
        `import { test, expect } from 'bun:test'; import { target } from '../src/subject.js'; test('target', () => expect(target()).toBe(1));`,
      );
      const moduleUrl = new URL('../tooling/test-function-audit.ts', import.meta.url).href;
      const script = `Object.defineProperty(process, 'platform', {value: 'darwin'});
        const {auditSources} = await import(${JSON.stringify(moduleUrl)});
        const report = auditSources({root: ${JSON.stringify(root)}, sourcePaths: ['src/subject.ts'], testPaths: ['tests/subject.test.ts']});
        process.stdout.write(JSON.stringify({status: report.status, diagnostics: report.diagnostics, row: report.functions[0]}));`;
      const child = spawnSync(process.execPath, ['--eval', script], { cwd: root, encoding: 'utf8', timeout: 10000 });
      if (child.status !== 0) process.stderr.write(child.stderr);
      expect(child.error).toBeUndefined();
      expect(child.signal).toBeNull();
      expect(child.status).toBe(0);
      expect(child.stderr).toBe('');
      const report = JSON.parse(child.stdout) as { status: string; row: { testStatus: string; cases: unknown[] } };
      expect(report.status).toBe('reported');
      expect(report.row.testStatus).toBe('present');
      expect(report.row.cases).toEqual([{ file: 'tests/subject.test.ts', name: 'target' }]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('selected Source and tests reject linked inputs before hashes or evidence', () => {
    for (const kind of ['source', 'test']) {
      const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-selected-links-'));
      const outside = mkdtempSync(path.join(os.tmpdir(), 'function-audit-outside-links-'));
      try {
        mkdirSync(path.join(root, 'src'));
        mkdirSync(path.join(root, 'tests'));
        const source = 'export function target() { return 1; }';
        const testText = `import { test, expect } from 'bun:test'; import { target } from '../src/subject.js'; test('target', () => expect(target()).toBe(1));`;
        writeFileSync(path.join(outside, 'foreign.ts'), kind === 'source' ? source : testText);
        writeFileSync(
          path.join(root, kind === 'source' ? 'tests/subject.test.ts' : 'src/subject.ts'),
          kind === 'source' ? testText : source,
        );
        symlinkSync(
          path.join(outside, 'foreign.ts'),
          path.join(root, kind === 'source' ? 'src/subject.ts' : 'tests/subject.test.ts'),
        );
        const report = auditSources({ root, sourcePaths: ['src/subject.ts'], testPaths: ['tests/subject.test.ts'] });
        expect(report.status).toBe('unknown');
        expect(report.diagnostics.some((issue) => issue.code === `${kind}-read`)).toBe(true);
        expect(kind === 'source' ? report.inputHashes.sources : report.inputHashes.tests).toEqual({});
        expect(report.functions.every((row) => row.cases.length === 0)).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
      }
    }
  });

  test('selected source and test bytes require lossless UTF-8 before hashes or evidence', () => {
    for (const invalid of ['source', 'test']) {
      const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-selected-bytes-'));
      try {
        mkdirSync(path.join(root, 'src'));
        mkdirSync(path.join(root, 'tests'));
        const source = Buffer.from('export function target() { return 1; } //');
        const testSource = Buffer.from(
          `import { test, expect } from 'bun:test'; import { target } from '../src/subject.js'; test('target', () => expect(target()).toBe(1)); //`,
        );
        writeFileSync(
          path.join(root, 'src/subject.ts'),
          invalid === 'source' ? Buffer.concat([source, Buffer.from([0xff])]) : source,
        );
        writeFileSync(
          path.join(root, 'tests/subject.test.ts'),
          invalid === 'test' ? Buffer.concat([testSource, Buffer.from([0xff])]) : testSource,
        );
        const report = auditSources({ root, sourcePaths: ['src/subject.ts'], testPaths: ['tests/subject.test.ts'] });
        expect(report.status).toBe('unknown');
        expect(report.diagnostics.some((issue) => issue.code === `${invalid}-read`)).toBe(true);
        expect(invalid === 'source' ? report.inputHashes.sources : report.inputHashes.tests).toEqual({});
        expect(report.functions.every((row) => row.cases.length === 0)).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  test('failed helper Babel parsing counts one attempted call and blocks the queue', () => {
    const report = runSourcesFixture(
      { 'src/subject.ts': 'export function target() {}' },
      {
        'helper.test.ts': `import { test } from 'bun:test'; import { run } from './helpers/run.js'; test('run', () => run());`,
      },
      undefined,
      { 'tests/helpers/run.ts': 'export function run( {' },
    );
    expect(report.status).toBe('unknown');
    expect(report.analysis.resolutionAstParses).toBe(1);
    expect(report.diagnostics.some((issue) => issue.code === 'resolution-input')).toBe(true);
    expect(buildQueue(report).every((job) => job.kind === 'blocked')).toBe(true);
  });
  test('JSON default imports bind data without Babel parses, function rows or named exports', () => {
    const sources = { 'src/subject.ts': 'export function target() {}' };
    const tests = {
      'data.test.ts': `import { test, expect } from 'bun:test'; import data from '../schemas/data.json' with { type: 'json' }; test('data', () => expect(data.value).toBe(1));`,
    };
    const report = runSourcesFixture(sources, tests, undefined, { 'schemas/data.json': '{"value":1}' });
    expect(report.status).toBe('reported');
    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]?.cases).toEqual([]);
    expect(report.analysis).toMatchObject({ resolutionAstParses: 0, resolutionHashes: 1 });
    const changed = runSourcesFixture(sources, tests, undefined, { 'schemas/data.json': '{"value":2}' });
    expect(changed.inputHashes.config).not.toBe(report.inputHashes.config);
    const invalid = runSourcesFixture(sources, tests, undefined, { 'schemas/data.json': '{' });
    expect(invalid.status).toBe('unknown');
    expect(invalid.diagnostics.some((issue) => issue.code === 'resolution-json-invalid')).toBe(true);
    const named = runSourcesFixture(
      sources,
      {
        'named.test.ts': `import { test } from 'bun:test'; import { value } from '../schemas/data.json'; test('named', () => value());`,
      },
      undefined,
      { 'schemas/data.json': '{"value":1}' },
    );
    expect(named.status).toBe('unknown');
    expect(named.functions[0]?.cases).toEqual([]);
  });

  test('invalid UTF-8 JSON bytes cannot be normalized into a trusted resolution input', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-json-bytes-'));
    try {
      mkdirSync(path.join(root, 'src'));
      mkdirSync(path.join(root, 'tests'));
      mkdirSync(path.join(root, 'schemas'));
      writeFileSync(path.join(root, 'src/subject.ts'), 'export function target() {}');
      writeFileSync(
        path.join(root, 'tests/data.test.ts'),
        `import { test } from 'bun:test'; import data from '../schemas/data.json'; test('data', () => data);`,
      );
      writeFileSync(path.join(root, 'schemas/data.json'), Buffer.from([0x22, 0xff, 0x22]));
      const report = auditSources({ root, sourcePaths: ['src/subject.ts'], testPaths: ['tests/data.test.ts'] });
      expect(report.status).toBe('unknown');
      expect(report.diagnostics.some((issue) => issue.code === 'resolution-json-invalid')).toBe(true);
      expect(report.inputHashes.resolution).toEqual({});
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test('selected test-module fixture exports resolve from existing captured ASTs without product evidence', () => {
    const report = runFixture('export function target() { return 1; }', {
      'fixture.test.ts': `import { target } from '../src/subject.js'; export function fixture() { return target(); }`,
      'consumer.test.ts': `import { test, expect } from 'bun:test'; import { fixture } from './fixture.test.js'; test('fixture', () => expect(fixture()).toBe(1));`,
    });
    expect(report.status).toBe('reported');
    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]?.cases).toEqual([]);
    expect(report.analysis).toMatchObject({
      sourceAstParses: 1,
      sourceInventoryCalls: 1,
      testParserCalls: 2,
      testHashes: 2,
      resolutionAstParses: 0,
      resolutionHashes: 0,
    });
  });
  test('resolves captured helper exports without adding functions or inferring helper-mediated execution', () => {
    const sources = { 'src/subject.ts': 'export function target() { return 1; }' };
    const tests = {
      'helper.test.ts': `import { test, expect } from 'bun:test'; import { run } from './helpers/barrel.js'; test('helper', () => { expect(run()).toBe(1); });`,
    };
    const helpers = {
      'tests/helpers/barrel.ts': `export { run } from './run.js';`,
      'tests/helpers/run.ts': `import { target } from '../../src/subject.js'; export function run() { return target(); }`,
    };
    const report = runSourcesFixture(sources, tests, undefined, helpers);
    expect(report.diagnostics).toEqual([]);
    expect(report.status).toBe('reported');
    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]?.cases).toEqual([]);
    expect(report.functions[0]?.testStatus).toBe('no-direct-reference');
    expect(report.analysis).toMatchObject({
      sourceAstParses: 1,
      sourceInventoryCalls: 1,
      testParserCalls: 1,
      resolutionAstParses: 2,
      resolutionHashes: 2,
    });
    expect(buildQueue(report).every((job) => job.kind !== 'blocked')).toBe(true);
    const changed = runSourcesFixture(sources, tests, undefined, {
      ...helpers,
      'tests/helpers/run.ts': helpers['tests/helpers/run.ts'] + '\n// revised helper',
    });
    expect(changed.inputHashes.config).not.toBe(report.inputHashes.config);
    expect(changed.inputHashes.sources).toEqual(report.inputHashes.sources);
    expect(changed.inputHashes.tests).toEqual(report.inputHashes.tests);
  });

  test('missing, ambiguous and type-only helper exports remain blocking runtime uncertainties', () => {
    for (const helper of [
      { 'tests/helpers/run.ts': 'export const different = 1;' },
      {
        'tests/helpers/run.ts': `export * from './a.js'; export * from './b.js';`,
        'tests/helpers/a.ts': 'export function run() {}',
        'tests/helpers/b.ts': 'export function run() {}',
      },
      {
        'tests/helpers/run.ts': `export type { run } from './a.js';`,
        'tests/helpers/a.ts': 'export function run() {}',
      },
    ]) {
      const report = runSourcesFixture(
        { 'src/subject.ts': 'export function target() {}' },
        {
          'helper.test.ts': `import { test } from 'bun:test'; import { run } from './helpers/run.js'; test('run', () => { run(); });`,
        },
        undefined,
        helper,
      );
      expect(report.status).toBe('unknown');
      expect(report.diagnostics.some((issue) => issue.code === 'source-export-unresolved')).toBe(true);
      expect(buildQueue(report).every((job) => job.kind === 'blocked')).toBe(true);
    }
  });

  test('helper symlinks cannot escape the bounded resolution input tree', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-link-'));
    try {
      mkdirSync(path.join(root, 'src'));
      mkdirSync(path.join(root, 'tests'));
      writeFileSync(path.join(root, 'src/subject.ts'), 'export function target() {}');
      writeFileSync(
        path.join(root, 'tests/helper.test.ts'),
        `import { test } from 'bun:test'; import { run } from './run.js'; test('run', () => run());`,
      );
      writeFileSync(path.join(root, 'outside.ts'), 'export function run() {}');
      symlinkSync(path.join(root, 'outside.ts'), path.join(root, 'tests/run.ts'));
      const report = auditSources({ root, sourcePaths: ['src/subject.ts'], testPaths: ['tests/helper.test.ts'] });
      expect(report.status).toBe('unknown');
      expect(report.inputHashes.resolution).toEqual({});
      expect(report.functions).toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('erased default helper declarations cannot resolve as runtime exports', () => {
    const report = runSourcesFixture(
      { 'src/subject.ts': 'export function target() {}' },
      {
        'helper.test.ts': `import { test } from 'bun:test'; import run from './helpers/run.js'; test('run', () => run());`,
      },
      undefined,
      { 'tests/helpers/run.ts': 'export default interface Run {}' },
    );
    expect(report.status).toBe('unknown');
    expect(report.diagnostics.some((issue) => issue.code === 'source-export-unresolved')).toBe(true);
    expect(buildQueue(report).every((job) => job.kind === 'blocked')).toBe(true);
  });

  test('top-level exported function expressions retain exact inventoried links', () => {
    const report = runFixture(
      `export const arrow = () => 1; const named = function inner() { return 2; }; export { named as renamed };`,
      {
        'values.test.ts': `import { test, expect } from 'bun:test'; import { arrow, renamed } from '../src/subject.js'; test('arrow', () => expect(arrow()).toBe(1)); test('renamed', () => expect(renamed()).toBe(2));`,
      },
    );
    expect(report.status).toBe('reported');
    expect(report.functions.map((row) => row.cases.map((item) => item.name))).toEqual([['arrow'], ['renamed']]);
  });

  test('runtime value exports resolve without masquerading as function links', () => {
    const report = runSourcesFixture(
      {
        'src/subject.ts': 'export const limit = 64; export function target() {}',
        'src/barrel.ts': `export { limit } from './subject.js';`,
      },
      {
        'values.test.ts': `import { test, expect } from 'bun:test'; import { limit } from '../src/barrel.js'; test('limit', () => expect(limit).toBe(64));`,
      },
    );
    expect(report.status).toBe('reported');
    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]?.cases).toEqual([]);
    expect(report.functions[0]?.testStatus).toBe('no-direct-reference');
  });

  test('local import re-exports preserve runtime identity and reject erased imported bindings', () => {
    for (const typeOnly of [false, true]) {
      const report = runSourcesFixture(
        {
          'src/subject.ts': 'export function target() { return 1; }',
          'src/barrel.ts': `import ${typeOnly ? 'type ' : ''}{ target as local } from './subject.js'; export { local as run };`,
        },
        {
          'barrel.test.ts': `import { test, expect } from 'bun:test'; import { run } from '../src/barrel.js'; test('run', () => expect(run()).toBe(1));`,
        },
      );
      expect(report.status).toBe(typeOnly ? 'unknown' : 'reported');
      expect(report.functions[0]?.cases.map((item) => item.name)).toEqual(typeOnly ? [] : ['run']);
    }
  });
  test('erased type imports, annotations, heritage and typeof queries do not imply runtime references', () => {
    const report = runFixture('export function target() { return 1; } export interface Shape { n: number; }', {
      'types.test.ts': `import { test, expect } from 'bun:test';
import { target, Shape, type Shape as InlineShape } from '../src/subject.js';
import type * as Model from '../src/subject.js';
type Alias = typeof target;
interface Extended extends Shape {}
class Typed implements InlineShape { n = 1; }
const shape: Model.Shape = new Typed();
test('typed assertion', () => { const value: Shape = shape; expect(value.n).toBe(1); });`,
    });
    expect(report.status).toBe('reported');
    expect(report.diagnostics).toEqual([]);
    expect(report.functions[0]?.testStatus).toBe('no-direct-reference');
    expect(report.functions[0]?.cases).toEqual([]);
  });

  test('runtime expressions inside TS wrappers retain direct static links and unresolved value diagnostics', () => {
    const report = runFixture('export function target() { return 1; }', {
      'wrappers.test.ts': `import { test, expect } from 'bun:test';
import { target, missing } from '../src/subject.js';
test('wrapped call', () => { expect((target as () => number)()).toBe(1); expect(target<number>()).toBe(1); expect(target() satisfies number).toBe(1); });
test('missing wrapped call', () => { expect((missing as () => number)()).toBe(1); });`,
    });
    expect(report.status).toBe('unknown');
    expect(report.diagnostics.some((issue) => issue.message.includes(':missing.'))).toBe(true);
    expect(report.functions[0]?.cases.map((item) => item.name)).toEqual(['wrapped call']);
  });

  test('type-only imported bindings used as runtime values cannot establish direct test links', () => {
    const report = runFixture('export function target() { return 1; }', {
      'invalid-runtime.test.ts': `import { test, expect } from 'bun:test';
import type { target as erased } from '../src/subject.js';
test('invalid runtime use', () => { expect(erased()).toBe(1); });`,
    });
    expect(report.status).toBe('unknown');
    expect(report.diagnostics.some((issue) => issue.code === 'source-export-unresolved')).toBe(true);
    expect(report.functions[0]?.cases).toEqual([]);
  });

  test('links a direct source call inside a Bun throw assertion as static evidence', () => {
    const report = runFixture('export function target() { throw new Error("denied"); }', {
      'throw.test.ts': `import { test, expect } from 'bun:test'; import { target } from '../src/subject.js'; test('denies', () => { expect(() => target()).toThrow('denied'); });`,
    });
    expect(report.functions[0]?.testStatus).toBe('present');
    expect(report.functions[0]?.cases.map(({ name }) => name)).toEqual(['denies']);
    expect(report.functions[0]?.evidence).toBe('direct-import-call');
    expect(report.cases[0]?.assertion).toBe(true);
    expect(report.analysis).toMatchObject({ sourceAstParses: 1, sourceInventoryCalls: 1, testParserCalls: 1 });
  });

  test('links direct calls through Bun toThrowError and its modifiers only', () => {
    const report = runFixture('export function target() { throw new Error("denied"); }', {
      'throw-error.test.ts': `import { test, expect as check } from 'bun:test';
import { target } from '../src/subject.js';
test('plain alias matcher', () => { check(() => target()).toThrowError('denied'); });
test('modified alias matcher', () => { check(() => target()).not.toThrowError('other'); });
test('unknown matcher', () => { check(() => target()).toInvent(); });
test('function reference', () => { const invoke = () => target(); check(invoke).toThrowError(); });
test('shadowed expect', () => { const check = (callback: () => unknown) => ({ toThrowError() {} }); check(() => target()).toThrowError(); });`,
    });
    expect(report.functions[0]?.cases.map(({ name }) => name)).toEqual([
      'plain alias matcher',
      'modified alias matcher',
    ]);
    expect(report.functions[0]?.testStatus).toBe('present');
    expect(report.functions[0]?.evidence).toBe('direct-import-call');
    for (const name of ['plain alias matcher', 'modified alias matcher'])
      expect(report.cases.find((item) => item.name === name)?.assertion).toBe(true);
  });

  test('tracks static assertion and scenario eligibility from built-in matcher calls', () => {
    const report = runFixture(
      'export function target() { return 1; }\nexport async function resolved() { return 1; }\nexport async function rejected() { throw new Error("denied"); }',
      {
        'assertions.test.ts': `import { test, expect as check, expectTypeOf } from 'bun:test';
import assert from 'node:assert/strict';
import { target, resolved, rejected } from '../src/subject.ts';
test('bare expectation', () => { check(target()); });
test('not matcher', () => { check(target()).not.toBe(2); });
test('unregistered matcher', () => { check(target()).toInvent(); });
test('resolves matcher', async () => { await check(resolved()).resolves.toBe(1); });
test('rejects matcher', async () => { await check(rejected()).rejects.toThrow('denied'); });
test('type-only expectation', () => { expectTypeOf(target()).toBeNumber(); });
test('direct Node assertion', () => { assert.equal(target(), 1); });
test('shadowed expectation alias', () => { const check = (value: number) => value; check(target()); });`,
      },
    );
    const assertions = new Map(report.cases.map(({ name, assertion }) => [name, assertion]));
    expect(assertions).toEqual(
      new Map([
        ['bare expectation', false],
        ['not matcher', true],
        ['unregistered matcher', false],
        ['resolves matcher', true],
        ['rejects matcher', true],
        ['type-only expectation', false],
        ['direct Node assertion', true],
        ['shadowed expectation alias', false],
      ]),
    );
    const draft = draftPatternProfiles(report);
    const targetDraft = draft.functions.find(({ identity }) => identity.endsWith('#fn:target#0'));
    expect(targetDraft?.cases.map(({ name }) => name)).toEqual(['not matcher', 'direct Node assertion']);
    expect(draft.scenarios.map(({ id }) => id)).toHaveLength(4);
    expect(draft.profiles[0]?.patterns).toEqual({});
  });

  test('recognizes a directly called named Node strict assertion', () => {
    const report = runFixture('export function target() { return 1; }', {
      'strict.test.ts': `import { test } from 'bun:test';
import { strict as check } from 'node:assert';
import { target } from '../src/subject.ts';
test('named strict assertion', () => { check(target()); });`,
    });
    expect(report.cases[0]?.assertion).toBe(true);
    expect(report.functions[0]?.testStatus).toBe('present');
    expect(report.functions[0]?.cases.map(({ name }) => name)).toEqual(['named strict assertion']);
  });

  test('keeps shadowed, foreign, indirect and property callbacks outside direct throw links', () => {
    const examples = [
      { body: `const expect = () => ({ toThrow() {} }); expect(() => target()).toThrow();`, assertion: false },
      // Node strict checks that the callback object is truthy; it does not invoke target inside that callback.
      { body: `foreign(() => target());`, assertion: true },
      { body: `const invoke = () => target(); expect(invoke).toThrow();`, assertion: true },
      { body: `fc.property(() => { expect(target()).toBe(1); });`, assertion: false },
    ];
    for (const example of examples) {
      const report = runFixture('export function target() { return 1; }', {
        'callback.test.ts': `import { test, expect } from 'bun:test'; import { strict as foreign } from 'node:assert'; import * as fc from 'fast-check'; import { target } from '../src/subject.js'; test('callback', () => { ${example.body} });`,
      });
      expect(report.functions[0]?.testStatus).toBe('unresolved');
      expect(report.functions[0]?.cases).toEqual([]);
      expect(report.cases[0]?.assertion).toBe(example.assertion);
    }
  });

  test('binds native inventory implementation and type changes to the configuration digest', () => {
    expect(configurationFiles).toContain('tooling/function-inventory.ts');
    expect(configurationFiles).toContain('node_modules/bun-types/test.d.ts');
    const baseline = configurationDigest(['src/subject.ts'], ['tests/subject.test.mjs'], {
      'tooling/function-inventory.ts': 'a'.repeat(64),
      'node_modules/bun-types/test.d.ts': 'b'.repeat(64),
    });
    const changedImplementation = configurationDigest(['src/subject.ts'], ['tests/subject.test.mjs'], {
      'tooling/function-inventory.ts': 'c'.repeat(64),
      'node_modules/bun-types/test.d.ts': 'b'.repeat(64),
    });
    const changedTypes = configurationDigest(['src/subject.ts'], ['tests/subject.test.mjs'], {
      'tooling/function-inventory.ts': 'd'.repeat(64),
      'node_modules/bun-types/test.d.ts': 'b'.repeat(64),
    });
    const changedMatcherDeclarations = configurationDigest(['src/subject.ts'], ['tests/subject.test.mjs'], {
      'tooling/function-inventory.ts': 'a'.repeat(64),
      'node_modules/bun-types/test.d.ts': 'e'.repeat(64),
    });
    expect(changedImplementation).not.toBe(baseline);
    expect(changedTypes).not.toBe(baseline);
    expect(changedMatcherDeclarations).not.toBe(baseline);
  });

  test('binds direct calls to named cases and does not count comments or matching strings', () => {
    const report = runFixture(
      'export function target(x: number) { return x + 1; }\nexport function untouched() { return 0; }',
      {
        'subject.test.mjs': `import { test, expect } from 'bun:test';\nimport { target as increment } from '../src/subject.ts';\ntest('target works', () => { expect(increment(1)).toBe(2); });\n// target();\nconst note = 'untouched';`,
      },
    );
    expect(report.functions.find((row) => row.identity.endsWith('#fn:target#0'))?.testStatus).toBe('present');
    expect(report.functions.find((row) => row.identity.endsWith('#fn:untouched#0'))?.testStatus).toBe(
      'no-direct-reference',
    );
    expect(report.functions.find((row) => row.identity.endsWith('#fn:target#0'))?.cases[0]?.name).toBe('target works');
  });

  test('resolves NodeNext .js imports through named and star TypeScript reexports', () => {
    const report = runSourcesFixture(
      {
        'src/index.ts': `export { publicTarget as target } from './public-api.js';`,
        'src/public-api.ts': `export * from './subject.js';`,
        'src/subject.ts': `export function publicTarget() { return 1; }`,
      },
      {
        'target.test.mjs': `import { test, expect } from 'bun:test';\nimport { target } from '../src/index.js'; test('through index', () => { expect(target()).toBe(1); });`,
      },
    );
    expect(report.status).toBe('reported');
    expect(report.functions.find((row) => row.name === 'fn:publicTarget')?.cases[0]?.name).toBe('through index');
  });

  test('reports cyclic or unresolved export edges as UNKNOWN instead of no-reference evidence', () => {
    const report = runSourcesFixture(
      {
        'src/index.ts': `export * from './cycle.js';`,
        'src/cycle.ts': `export * from './index.js';`,
        'src/subject.ts': `export function target() { return 1; }`,
      },
      {
        'target.test.mjs': `import { test } from 'bun:test';\nimport { target } from '../src/index.js'; test('cyclic export', () => { target(); });`,
      },
    );
    expect(report.status).toBe('unknown');
    expect(report.diagnostics.some((entry) => entry.code === 'source-export-unresolved')).toBe(true);
  });

  test('does not promote imported-but-uncalled, locally shadowed, or indirect callback functions', () => {
    const report = runFixture('export function target() { return 1; }\nexport function callback() { return 2; }', {
      'indirect.test.mjs': `import { test, expect } from 'bun:test';\nimport { target, callback } from '../src/subject.ts';\ntest('misleading target callback', () => { const target = () => 1; expect(target()).toBe(1); const cb = callback; expect(cb).toBeDefined(); });`,
    });
    expect(report.functions.find((row) => row.identity.endsWith('#fn:target#0'))?.testStatus).toBe(
      'no-direct-reference',
    );
    expect(report.functions.find((row) => row.identity.endsWith('#fn:callback#0'))?.testStatus).toBe('unresolved');
    expect(
      buildQueue(report).find((job) => job.functions.some((row) => row.identity.endsWith('#fn:callback#0')))?.kind,
    ).toBe('review');
  });

  test('keeps private callbacks unresolved for discovery instead of proposing cosmetic tests', () => {
    const report = runFixture('export function build() { return (value: number) => value + 1; }', {
      'build.test.mjs': `import { test, expect } from 'bun:test';\nimport { build } from '../src/subject.ts'; test('build returns a callback', () => { expect(build()(1)).toBe(2); });`,
    });
    const callback = report.functions.find((row) => row.identity.includes('/closure:'));
    expect(callback?.testStatus).toBe('unresolved');
    expect(
      buildQueue(report).find((job) => job.functions.some((entry) => entry.identity === callback?.identity))?.kind,
    ).toBe('review');
  });

  test('requires actual Bun test and assertion imports, including aliases and namespaces', () => {
    const aliased = runFixture('export function target() { return 1; }', {
      'alias.test.mjs': `import { test as caseTest, expect as check } from 'bun:test';\nimport { target as run } from '../src/subject.ts'; caseTest('alias works', () => { check(run()).toBe(1); });`,
    });
    expect(aliased.functions[0]?.testStatus).toBe('present');
    const namespaced = runFixture('export function target() { return 1; }', {
      'namespace.test.mjs': `import * as bun from 'bun:test';\nimport * as subject from '../src/subject.ts'; bun.test('namespace works', () => { bun.expect(subject.target()).toBe(1); });`,
    });
    expect(namespaced.functions[0]?.testStatus).toBe('present');
    const fake = runFixture('export function target() { return 1; }', {
      'fake.test.mjs': `import { target } from '../src/subject.ts'; function test(_name, callback) { callback(); } function expect(value) { return { toBe: () => value }; } test('fake target', () => { expect(target()).toBe(1); });`,
    });
    expect(fake.functions[0]?.testStatus).toBe('unresolved');
  });

  test('links immutable awaited literal namespaces without promoting runtime or pattern evidence', () => {
    const report = runFixture('export function target(value: number) { return value + 1; }', {
      'dynamic.test.ts': `import { test, expect } from 'bun:test';
        type Subject = typeof import('../src/subject.ts');
        const subject: Subject = await import('../src/subject.ts');
        test('direct dynamic namespace', () => { expect(subject.target(1)).toBe(2); expect(subject['target'](2)).toBe(3); });`,
    });
    expect(report.functions[0]?.testStatus).toBe('present');
    expect(report.functions[0]?.cases).toEqual([{ file: 'tests/dynamic.test.ts', name: 'direct dynamic namespace' }]);
    expect(report.functions[0]?.patterns.status).toBe('unreviewed');
    expect(report.analysis).toMatchObject({ sourceAstParses: 1, sourceInventoryCalls: 1, testParserCalls: 1 });
  });

  test('captures awaited literal barrel edges using the existing resolver once', () => {
    const report = runSourcesFixture(
      { 'src/subject.ts': 'export function target() { return 1; }' },
      {
        'dynamic.test.ts': `import { test, expect } from 'bun:test';
          const subject = await import('./subject-barrel.js');
          test('dynamic barrel', () => expect(subject.run()).toBe(1));`,
      },
      undefined,
      { 'tests/subject-barrel.ts': `export { target as run } from '../src/subject.ts';` },
    );
    expect(report.functions[0]?.testStatus).toBe('present');
    expect(report.functions[0]?.cases).toEqual([{ file: 'tests/dynamic.test.ts', name: 'dynamic barrel' }]);
    expect(report.analysis).toMatchObject({ resolutionAstParses: 1, resolutionHashes: 1 });
    expect(Object.keys(report.inputHashes.resolution)).toEqual(['tests/subject-barrel.ts']);
  });

  test('keeps awaited namespace shadows and deferred calls out of direct case evidence', () => {
    const report = runFixture('export function target() { return 1; }', {
      'dynamic.test.ts': `import { test, expect } from 'bun:test';
        const subject = await import('../src/subject.ts');
        test('outer namespace', () => expect(subject.target()).toBe(1));
        test('shadow namespace', () => { const subject = { target: () => 7 }; expect(subject.target()).toBe(7); });`,
    });
    expect(report.functions[0]?.cases).toEqual([{ file: 'tests/dynamic.test.ts', name: 'outer namespace' }]);
    const deferred = runFixture('export function target() { return 1; }', {
      'dynamic.test.ts': `import { test, expect } from 'bun:test';
        const subject = await import('../src/subject.ts');
        test('deferred namespace', () => { const later = () => subject.target(); expect(typeof later).toBe('function'); });`,
    });
    expect(deferred.functions[0]?.testStatus).toBe('unresolved');
    expect(deferred.functions[0]?.cases).toEqual([]);
  });

  test('withholds awaited namespace links for unsupported bindings and same-target module mocks', () => {
    const setups = [
      `let subject = await import('../src/subject.ts');`,
      `const modulePath = '../src/subject.ts'; const subject = await import(modulePath);`,
      `const subject = import('../src/subject.ts');`,
      `const subject = await Promise.resolve(import('../src/subject.ts'));`,
      `const subject = await import('../src/subject.ts', { with: { type: 'json' } });`,
      `const subject = await import('.');`,
      `const subject = await import('..');`,
      `const subject = await import('../src/subject.ts'); subject = { target: () => 1 };`,
      `const subject = await import('../src/subject.ts'); subject++;`,
      `const subject = await import('../src/subject.ts'); subject.target = () => 1;`,
      `const subject = await import('../src/subject.ts'); ({ subject } = { subject: { target: () => 1 } });`,
      `const subject = await import('../src/subject.ts'); ({ value: subject.target } = { value: () => 1 });`,
      `const subject = await import('../src/subject.ts'); [subject.target] = [() => 1];`,
      `const subject = await import('../src/subject.ts'); ({ value: { nested: subject.target } } = {});`,
      `const subject = await import('../src/subject.ts'); [subject.target = () => 1] = [];`,
      `const subject = await import('../src/subject.ts'); [...subject.target] = [];`,
      `const subject = await import('../src/subject.ts'); for ({ value: subject.target } of []) {}`,
      `const subject = await import('../src/subject.ts'); for (subject of []) {}`,
      `type Subject = typeof import('../src/subject.ts'); const subject: Subject = { target: () => 1 };`,
      `import { mock } from 'bun:test'; mock.module('../src/subject.ts', () => ({ target: () => 1 })); const subject = await import('../src/subject.ts');`,
      `import { mock as fake } from 'bun:test'; fake.module('../src/subject.js', () => ({ target: () => 1 })); const subject = await import('../src/subject.ts');`,
      `import * as bun from 'bun:test'; bun.mock.module('../src/subject.ts', () => ({ target: () => 1 })); const subject = await import('../src/subject.ts');`,
    ];
    for (const setup of setups) {
      const report = runFixture('export function target() { return 1; }', {
        'dynamic.test.ts': `import { test, expect } from 'bun:test'; ${setup}
          test('unsupported namespace', () => expect(subject.target()).toBe(1));`,
      });
      expect(report.functions[0]?.testStatus).not.toBe('present');
      expect(report.functions[0]?.cases).toEqual([]);
    }
  });

  test('retains awaited namespace links when other modules are mocked or local bindings are written', () => {
    const report = runFixture('export function target() { return 1; }', {
      'dynamic.test.ts': `import { test, expect, mock } from 'bun:test';
        mock.module('../src/dependency.ts', () => ({ value: 7 }));
        const subject = await import('../src/subject.ts');
        function unrelated(subject: number) { subject++; }
        test('outer namespace', () => expect(subject.target()).toBe(1));`,
    });
    expect(report.functions[0]?.testStatus).toBe('present');
    expect(report.functions[0]?.cases).toEqual([{ file: 'tests/dynamic.test.ts', name: 'outer namespace' }]);
  });

  test('keeps namespace reads in write-pattern keys and defaults distinct from written targets', () => {
    const setups = [
      `let local; ({ [subject.target()]: local } = {});`,
      `let local; [local = subject.target()] = [];`,
      `const other = {}; other[subject.target()] = 7;`,
      `let local; ({ value: [local = subject.target()] } = { value: [] });`,
    ];
    for (const setup of setups) {
      const report = runFixture('export function target() { return 1; }', {
        'dynamic.test.ts': `import { test, expect } from 'bun:test';
          const subject = await import('../src/subject.ts'); ${setup}
          test('read-only namespace', () => expect(subject.target()).toBe(1));`,
      });
      expect(report.functions[0]?.testStatus).toBe('present');
      expect(report.functions[0]?.cases).toEqual([{ file: 'tests/dynamic.test.ts', name: 'read-only namespace' }]);
    }
  });

  test('withholds namespace links through erased TypeScript assignment targets', () => {
    const writes = [
      `(subject as { target: () => number }).target = () => 1;`,
      `(subject.target as (() => number)) = () => 1;`,
      `(subject.target satisfies (() => number)) = () => 1;`,
      `(<(() => number)>subject.target) = () => 1;`,
      `subject.target! = () => 1;`,
      `({ value: (subject!.target as (() => number)) } = { value: () => 1 });`,
    ];
    for (const write of writes) {
      const report = runFixture('export function target() { return 1; }', {
        'dynamic.test.ts': `import { test, expect } from 'bun:test';
          const subject = await import('../src/subject.ts'); ${write}
          test('written namespace', () => expect(subject.target()).toBe(1));`,
      });
      expect(report.functions[0]?.testStatus).not.toBe('present');
      expect(report.functions[0]?.cases).toEqual([]);
    }
  });

  test('preserves outer namespace links across local loop declaration heads', () => {
    for (const loop of [
      `for (const subject of []) {}`,
      `for (let subject in {}) {}`,
      `for (const { value: subject } of []) {}`,
    ]) {
      const report = runFixture('export function target() { return 1; }', {
        'dynamic.test.ts': `import { test, expect } from 'bun:test';
          const subject = await import('../src/subject.ts'); ${loop}
          test('outer namespace', () => expect(subject.target()).toBe(1));`,
      });
      expect(report.functions[0]?.testStatus).toBe('present');
      expect(report.functions[0]?.cases).toEqual([{ file: 'tests/dynamic.test.ts', name: 'outer namespace' }]);
    }
  });

  test('does not resolve dot-prefixed bare awaited imports as captured relative barrels', () => {
    for (const modulePath of ['.subject.js', '..subject.js']) {
      const report = runSourcesFixture(
        { 'src/subject.ts': 'export function target() { return 1; }' },
        {
          'dynamic.test.ts': `import { test, expect } from 'bun:test';
            const subject = await import('${modulePath}');
            test('bare namespace', () => expect(subject.target()).toBe(1));`,
        },
        undefined,
        { [`tests/${modulePath.replace(/\.js$/u, '.ts')}`]: `export { target } from '../src/subject.ts';` },
      );
      expect(report.functions[0]?.testStatus).not.toBe('present');
      expect(report.functions[0]?.cases).toEqual([]);
      expect(report.analysis.resolutionAstParses).toBe(0);
    }
  });

  test('does not resolve dot-prefixed bare static imports or reexports as local source', () => {
    const source = { 'src/subject.ts': 'export function target() { return 1; }' };
    const bareHelper = { 'tests/.subject.ts': `export { target } from '../src/subject.ts';` };
    const imported = runSourcesFixture(
      source,
      {
        'bare.test.ts': `import { test, expect } from 'bun:test'; import { target } from '.subject.js';
          test('bare static import', () => expect(target()).toBe(1));`,
      },
      undefined,
      bareHelper,
    );
    expect(imported.functions[0]?.testStatus).not.toBe('present');
    expect(imported.analysis.resolutionAstParses).toBe(0);
    const reexported = runSourcesFixture(
      source,
      {
        'bare.test.ts': `import { test, expect } from 'bun:test'; import { target } from './barrel.js';
          test('bare reexport', () => expect(target()).toBe(1));`,
      },
      undefined,
      { ...bareHelper, 'tests/barrel.ts': `export { target } from '.subject.js';` },
    );
    expect(reexported.functions[0]?.testStatus).not.toBe('present');
    expect(reexported.analysis.resolutionAstParses).toBe(1);
  });

  test('resolves default export and default import as an exact direct function call', () => {
    const report = runFixture('export default function target(value: number) { return value + 1; }', {
      'default.test.mjs': `import { test, expect } from 'bun:test';\nimport run from '../src/subject.ts'; test('default export', () => { expect(run(1)).toBe(2); });`,
    });
    expect(report.functions).toHaveLength(1);
    expect(report.functions[0]?.testStatus).toBe('present');
    expect(report.functions[0]?.cases[0]?.name).toBe('default export');
  });

  test('resolves class identity separately from methods and links only explicit construction', () => {
    const report = runSourcesFixture(
      {
        'src/subject.ts': `export class Subject { constructor() {} run() { return 1; } other() { return 2; } } export class Empty {}`,
        'src/barrel.ts': `export { Subject as Renamed, Empty } from './subject.js';`,
      },
      {
        'class.test.ts': `import { test, expect } from 'bun:test'; import { Renamed as Local, Empty } from '../src/barrel.js';
test('constructs explicit', () => { expect(new Local()).toBeInstanceOf(Local); });
test('constructs implicit', () => { expect(new Empty()).toBeInstanceOf(Empty); });`,
      },
    );
    expect(report.status).toBe('reported');
    expect(report.diagnostics).toEqual([]);
    const constructor = report.functions.find((row) => row.name === 'method:constructor');
    expect(constructor?.cases.map((item) => item.name)).toEqual(['constructs explicit']);
    expect(constructor?.testStatus).toBe('present');
    for (const name of ['run', 'other']) {
      const method = report.functions.find((row) => row.name === `method:${name}`);
      expect(method?.cases).toEqual([]);
      expect(method?.testStatus).toBe('unresolved');
    }
    expect(report.functions).toHaveLength(3);
  });

  test('runtime TypeScript enum and namespace bindings shadow imports in their lexical scopes', () => {
    const report = runFixture('export function target() { return 1; }', {
      'runtime-shadow.test.ts': `import { test, expect } from 'bun:test'; import { target } from '../src/subject.js';
test('enum shadow', () => { enum target { Value = 1 }; expect(target.Value).toBe(1); });
test('namespace shadow', () => { namespace target { export const Value = 1; } expect(target.Value).toBe(1); });`,
    });
    expect(report.functions[0]?.testStatus).toBe('no-direct-reference');
    expect(report.functions[0]?.cases).toEqual([]);
    const independent = runFixture('export function target() { return 1; }', {
      'runtime-expression.test.ts': `import { test, expect } from 'bun:test'; import { target } from '../src/subject.js';
test('enum initializer', () => { enum Local { Value = target() }; expect(Local.Value).toBe(1); });
test('unshadowed', () => { expect(target()).toBe(1); });`,
    });
    expect(independent.functions[0]?.cases.map((item) => item.name)).toEqual(['enum initializer', 'unshadowed']);
  });

  test('type-only barrel exports cannot establish runtime function or constructor links', () => {
    const report = runSourcesFixture(
      {
        'src/subject.ts': 'export function target() { return 1; } export class Subject { constructor() {} }',
        'src/barrel.ts': `export type { target, Subject } from './subject.js';`,
      },
      {
        'invalid-export.test.ts': `import { test, expect } from 'bun:test'; import { target, Subject } from '../src/barrel.js'; test('invalid', () => { expect(target()).toBe(1); expect(new Subject()).toBeTruthy(); });`,
      },
    );
    expect(report.status).toBe('unknown');
    expect(report.functions.every((row) => row.cases.length === 0)).toBe(true);
  });

  test('default and namespace constructors retain exact rows while deferred and ambiguous construction stays unresolved', () => {
    const report = runSourcesFixture(
      {
        'src/subject.ts': 'export default class { constructor() {} } export class Named { constructor() {} run() {} }',
      },
      {
        'construct.test.ts': `import { test, expect } from 'bun:test'; import Default, * as Models from '../src/subject.js';
test('default', () => { expect(new Default()).toBeTruthy(); });
test('namespace', () => { expect(new Models.Named()).toBeTruthy(); });
test('deferred', () => { const build = () => new Models.Named(); expect(build).toBeFunction(); });`,
      },
    );
    expect(report.status).toBe('reported');
    expect(
      report.functions
        .filter((row) => row.name === 'method:constructor')
        .map((row) => row.cases.map((item) => item.name)),
    ).toEqual([['default'], ['namespace']]);
    const ambiguous = runSourcesFixture(
      {
        'src/a.ts': 'export class Subject { constructor() {} }',
        'src/b.ts': 'export class Subject { constructor() {} }',
        'src/barrel.ts': `export * from './a.js'; export * from './b.js';`,
      },
      {
        'ambiguous.test.ts': `import { test, expect } from 'bun:test'; import { Subject } from '../src/barrel.js'; test('ambiguous', () => { expect(new Subject()).toBeTruthy(); });`,
      },
    );
    expect(ambiguous.status).toBe('unknown');
    expect(ambiguous.functions.every((row) => row.cases.length === 0)).toBe(true);
  });

  test('keeps imported class public methods unresolved without call-flow proof', () => {
    const report = runFixture('export class Subject { run() { return 1; } }', {
      'class.test.mjs': `import { test, expect } from 'bun:test';\nimport { Subject } from '../src/subject.ts'; test('class method', () => { expect(new Subject().run()).toBe(1); });`,
    });
    const method = report.functions.find((row) => row.identity.includes('class:Subject/method:run#'));
    expect(method?.testStatus).toBe('unresolved');
    expect(method?.evidence).toBe('unresolved-private-or-indirect');
    expect(buildQueue(report).find((job) => job.functions.some((row) => row.identity === method?.identity))?.kind).toBe(
      'review',
    );
  });

  test('uses lexical bindings for destructured callback shadows without hiding a different scope', () => {
    const report = runFixture('export function target() { return 1; }', {
      'shadow.test.mjs': `import { test as caseTest, expect as check } from 'bun:test';\nimport { target } from '../src/subject.ts'; function unrelated(caseTest, check) { caseTest('ignored', () => check(target())); } caseTest('shadowed parameter', ({ target }) => { check(target()).toBe(1); });`,
    });
    expect(report.functions[0]?.testStatus).toBe('unresolved');
    const unrelated = runFixture('export function target() { return 1; }', {
      'shadow.test.mjs': `import { test as caseTest, expect as check } from 'bun:test';\nimport { target } from '../src/subject.ts'; function unrelated(caseTest, check) { caseTest('ignored', () => check(target())); } caseTest('real case', () => { check(target()).toBe(1); });`,
    });
    expect(unrelated.functions[0]?.testStatus).toBe('present');
  });

  test('lexical shadows stay inside their block, loop and catch environments', () => {
    const report = runFixture('export function target() { return 1; }', {
      'lexical.test.ts': `import { test, expect } from 'bun:test';
import { target } from '../src/subject.js';
test('block', () => { expect(target()).toBe(1); { const target = () => 2; const expect = () => ({ toBe() {} }); expect(target()).toBe(2); } expect(target()).toBe(1); });
test('loop', () => { for (let target of [() => 2]) { target(); } expect(target()).toBe(1); });
test('catch', () => { try { throw 2; } catch (target) { const expect = () => ({ toBe() {} }); expect(target).toBe(2); } expect(target()).toBe(1); });
{ const target = () => 2; const test = (name, callback) => callback(); test('local test', () => target()); }
test('outside block', () => { expect(target()).toBe(1); });`,
    });
    expect(report.functions[0]?.cases.map(({ name }) => name)).toEqual(['block', 'loop', 'catch', 'outside block']);
    expect(report.cases.map(({ name, assertion }) => ({ name, assertion }))).toEqual(
      ['block', 'loop', 'catch', 'outside block'].map((name) => ({ name, assertion: true })),
    );
    expect(report.analysis).toMatchObject({ sourceAstParses: 1, sourceInventoryCalls: 1, testParserCalls: 1 });
  });

  test('lexical shadows inherited by nested cases cannot produce imported calls or assertions', () => {
    const report = runFixture('export function target() { return 1; }', {
      'inherited.test.ts': `import { test, expect } from 'bun:test';
import { target } from '../src/subject.js';
function outer(target, expect) { test('inherited shadow', () => { expect(target()).toBe(1); }); }
test('block var', () => { { var target = () => 2; } expect(target()).toBe(2); });`,
    });
    expect(report.functions[0]?.testStatus).toBe('no-direct-reference');
    expect(report.functions[0]?.cases).toEqual([]);
    expect(report.cases.map(({ name, assertion }) => ({ name, assertion }))).toEqual([
      { name: 'inherited shadow', assertion: false },
      { name: 'block var', assertion: true },
    ]);
  });

  test('lexical declarations do not hide switch discriminants or destructuring references', () => {
    const report = runFixture('export function target() { return 1; }', {
      'environments.test.ts': `import { test, expect } from 'bun:test';
import { target } from '../src/subject.js';
test('switch discriminant', () => { switch (expect(target()).toBe(1)) { case 1: let expect; let target; } });
test('destructuring initializer', () => { const { [target()]: value = target(), target: local } = {}; expect(target()).toBe(1); });
test('default callback parameter', (value = target()) => { var target = () => 2; expect(value).toBe(1); });`,
    });
    expect(report.functions[0]?.cases.map(({ name }) => name)).toEqual([
      'switch discriminant',
      'destructuring initializer',
      'default callback parameter',
    ]);
    expect(report.cases.every(({ assertion }) => assertion)).toBe(true);
  });

  test('lexical self names and method parameters hide imports only in their own environments', () => {
    const report = runFixture('export function target() { return 1; }', {
      'self.test.ts': `import { test, expect } from 'bun:test';
import { target } from '../src/subject.js';
const named = function target() { test('named self', () => { expect(target()).toBe(1); }); };
const methods = { method(target, expect) { test('method shadows', () => { expect(target()).toBe(1); }); } };
class Subject { #method(target, expect) { test('private method shadows', () => { expect(target()).toBe(1); }); } }
const Derived = class target extends target { method() { test('class self', () => { expect(target()).toBe(1); }); } };
test('outside self names', () => { expect(target()).toBe(1); });`,
    });
    expect(report.functions[0]?.cases.map(({ name }) => name)).toEqual(['outside self names']);
    expect(report.cases.find(({ name }) => name === 'method shadows')?.assertion).toBe(false);
    expect(report.cases.find(({ name }) => name === 'private method shadows')?.assertion).toBe(false);
    expect(report.cases.find(({ name }) => name === 'outside self names')?.assertion).toBe(true);
  });

  test('uses one Source AST per inventory and export index across many tests', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-multiple-'));
    try {
      mkdirSync(path.join(root, 'src'));
      mkdirSync(path.join(root, 'tests'));
      writeFileSync(path.join(root, 'src', 'one.ts'), 'export function target() { return 1; }');
      writeFileSync(path.join(root, 'src', 'two.ts'), 'export function other() { return 3; }');
      for (const name of ['one', 'two', 'three'])
        writeFileSync(
          path.join(root, 'tests', `${name}.test.mjs`),
          `import { test, expect } from 'bun:test';\nimport { target } from '../src/one.ts'; test('${name}', () => { expect(target()).toBe(1); });`,
        );
      const report = auditSources({
        root,
        sourcePaths: ['src/one.ts', 'src/two.ts'],
        testPaths: ['tests/one.test.mjs', 'tests/two.test.mjs', 'tests/three.test.mjs'],
      });
      expect(report.status).toBe('reported');
      expect(report.analysis).toEqual({
        sourceInventoryCalls: 2,
        sourceAstParses: 2,
        sourceHashes: 2,
        testParserCalls: 3,
        testHashes: 3,
        resolutionAstParses: 0,
        resolutionHashes: 0,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('preserves two-argument inventory identities and complexity when reusing a parsed AST', () => {
    const source = `export class Outer {
      run(value: boolean) { if (value && (false || true)) return 1; return 0; }
      inner = class Inner { compute(value: boolean) { return value ?? false; } };
    }
    export const nested = (value: number) => value > 0 ? value : -value;`;
    const parsed = parse(source, { sourceType: 'module', plugins: ['typescript'] });
    const expected = functionInventory(source, 'src/parity.ts');
    const actual = functionInventory(source, 'src/parity.ts', parsed);
    expect(actual.map(({ identity, complexity }) => ({ identity, complexity }))).toEqual(
      expected.map(({ identity, complexity }) => ({ identity, complexity })),
    );
  });

  test('ignores skipped cases and fails closed for malformed test files', () => {
    const report = runFixture('export function target() { return 1; }', {
      'skip.test.mjs': `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test.skip('target', () => target());`,
      'broken.test.mjs': `import { test } from 'bun:test'; test('broken', () => {`,
    });
    expect(report.functions[0]?.testStatus).toBe('unresolved');
    expect(report.diagnostics.some((entry) => entry.file === 'tests/broken.test.mjs')).toBe(true);
    expect(report.status).toBe('unknown');
  });

  test('leaves duplicate same-name Source exports unresolved', () => {
    const report = runFixture(
      'function first() { return 1; } function second() { return 2; } export { first as target, second as target };',
      {
        'target.test.mjs': `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('ambiguous target', () => { expect(target()).toBe(1); });`,
      },
    );
    expect(report.functions.filter((row) => row.name === 'fn:first' || row.name === 'fn:second')).toHaveLength(2);
    expect(report.functions.every((row) => row.testStatus === 'unresolved')).toBe(true);
    expect(report.status).toBe('unknown');
    const queue = buildQueue(report);
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.every((job) => job.kind === 'blocked')).toBe(true);
  });

  test('reports zero and one boundaries as labels, not semantic pattern proof', () => {
    const report = runFixture('export function target(value: number) { return value; }', {
      'target.test.mjs': `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('target zero one boundary', () => { expect(target(0)).toBe(0); expect(target(1)).toBe(1); });`,
    });
    expect(report.functions[0]?.testStatus).toBe('present');
    expect(report.functions[0]?.patterns.status).toBe('unreviewed');
    expect(report.functions[0]?.patterns.present).toEqual([]);
  });

  test('accepts a reviewed matrix row only for exact hashes, identity, and a real named case', () => {
    const source = 'export function target() { return 1; }';
    const testText = `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('verified behavior', () => { expect(target()).toBe(1); });`;
    const base = runFixture(source, { 'target.test.mjs': testText });
    const row = base.functions[0];
    if (!row) throw new Error('Target function was not inventoried.');
    const report = runFixture(
      source,
      { 'target.test.mjs': testText },
      {
        schemaVersion: 1,
        configHash: base.inputHashes.config,
        sourceHashes: base.inputHashes.sources,
        testHashes: base.inputHashes.tests,
        functions: [
          {
            identity: row.identity,
            cases: [
              {
                file: 'tests/target.test.mjs',
                name: 'verified behavior',
                patterns: {
                  contract: 'present',
                  zombies: 'present',
                  persistence: 'missing',
                  restart: 'missing',
                  crossSurface: 'missing',
                  cas: 'missing',
                  unknown: 'missing',
                  auth: 'missing',
                },
              },
            ],
          },
        ],
      },
    );
    expect(report.functions[0]?.patterns.status).toBe('reviewed');
    expect(report.functions[0]?.patterns.present).toContain('contract');
    expect(report.functions[0]?.patterns.missing).toContain('persistence');
  });

  test('rejects empty matrix case lists and keeps the function in review discovery', () => {
    const source = 'export function target() { return 1; }';
    const base = runFixture(source, {});
    const row = base.functions[0];
    if (!row) throw new Error('Target function was not inventoried.');
    const report = runFixture(
      source,
      {},
      {
        schemaVersion: 1,
        configHash: base.inputHashes.config,
        sourceHashes: base.inputHashes.sources,
        testHashes: base.inputHashes.tests,
        functions: [{ identity: row.identity, cases: [] }],
      },
    );
    const queued = buildQueue(report)[0];
    expect(report.diagnostics.some((entry) => entry.code === 'matrix-invalid')).toBe(true);
    expect(report.functions[0]?.patterns.status).toBe('unreviewed');
    expect(queued?.kind).toBe('blocked');
    expect(queued?.functions[0]?.unknownScenarioState).toBe(true);
  });

  test('rejects a partial matrix row that drops another direct asserted case', () => {
    const source = 'export function target() { return 1; }';
    const tests = {
      'first.test.mjs': `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.js'; test('first direct case', () => { expect(target()).toBe(1); });`,
      'second.test.mjs': `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.js'; test('second direct case', () => { expect(target()).toBe(1); });`,
    };
    const base = runFixture(source, tests);
    const row = base.functions[0];
    if (!row) throw new Error('Target function was not inventoried.');
    const incomplete = runFixture(source, tests, {
      schemaVersion: 1,
      configHash: base.inputHashes.config,
      sourceHashes: base.inputHashes.sources,
      testHashes: base.inputHashes.tests,
      functions: [
        {
          identity: row.identity,
          cases: [{ file: 'tests/first.test.mjs', name: 'first direct case', patterns: { contract: 'present' } }],
        },
      ],
    });
    expect(incomplete.diagnostics.some((entry) => entry.code === 'matrix-invalid')).toBe(true);
    expect(incomplete.status).toBe('unknown');
    expect(incomplete.functions[0]?.patterns.status).toBe('unreviewed');
    expect(buildQueue(incomplete)[0]?.kind).toBe('blocked');
  });

  test('rejects same-name cases before a matrix can combine their evidence', () => {
    const source = 'export function target() { return 1; }';
    const tests = {
      'duplicate.test.mjs':
        `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts';\n` +
        `test('same name', () => { target(); }); test('same name', () => { expect(true).toBe(true); });`,
    };
    const base = runFixture(source, tests);
    const row = base.functions[0];
    if (!row) throw new Error('Target function was not inventoried.');
    const report = runFixture(source, tests, {
      schemaVersion: 1,
      configHash: base.inputHashes.config,
      sourceHashes: base.inputHashes.sources,
      testHashes: base.inputHashes.tests,
      functions: [
        {
          identity: row.identity,
          cases: [{ file: 'tests/duplicate.test.mjs', name: 'same name', patterns: { contract: 'present' } }],
        },
      ],
    });
    expect(report.diagnostics.some((entry) => entry.code === 'duplicate-test-case-name')).toBe(true);
    expect(report.diagnostics.some((entry) => entry.code === 'matrix-invalid')).toBe(true);
    expect(report.functions[0]?.patterns.status).toBe('unreviewed');
  });

  test('rejects stale matrix hashes and duplicate mapping rows', () => {
    const source = 'export function target() { return 1; }';
    const testText = `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('verified behavior', () => { expect(target()).toBe(1); });`;
    const base = runFixture(source, { 'target.test.mjs': testText });
    const fn = base.functions[0];
    if (!fn) throw new Error('Target function was not inventoried.');
    const matrix: Record<string, unknown> = {
      schemaVersion: 1,
      configHash: base.inputHashes.config,
      sourceHashes: { 'src/subject.ts': '0'.repeat(64) },
      testHashes: base.inputHashes.tests,
      functions: [
        {
          identity: fn.identity,
          cases: [{ file: 'tests/target.test.mjs', name: 'verified behavior', patterns: { contract: 'present' } }],
        },
      ],
    };
    const stale = runFixture(source, { 'target.test.mjs': testText }, matrix);
    expect(stale.diagnostics.some((entry) => entry.code === 'matrix-invalid')).toBe(true);
    expect(buildQueue(stale).every((job) => job.kind === 'blocked')).toBe(true);
    matrix.configHash = base.inputHashes.config;
    matrix.sourceHashes = base.inputHashes.sources;
    const functionRows = matrix.functions as Array<Record<string, unknown>>;
    const duplicate = functionRows[0];
    if (!duplicate) throw new Error('Matrix function row was not created.');
    functionRows.push(duplicate);
    const duplicateReport = runFixture(source, { 'target.test.mjs': testText }, matrix);
    expect(duplicateReport.diagnostics.some((entry) => entry.code === 'matrix-invalid')).toBe(true);
  });

  test('groups colliding existing test targets once and assigns disjoint deterministic worker hints', () => {
    const report = runFixture('export function first() { return 1; }\nexport function second() { return 2; }', {
      'shared.test.mjs': `import { test, expect } from 'bun:test';\nimport { first, second } from '../src/subject.ts'; test('both', () => { expect(first()).toBe(1); expect(second()).toBe(2); });`,
    });
    const left = buildQueue(report, 2);
    const right = buildQueue(report, 2);
    expect(left).toEqual(right);
    expect(left).toHaveLength(1);
    expect(left[0]?.target).toEqual({ path: 'tests/shared.test.mjs', disposition: 'existing' });
    expect(left[0]?.functions).toHaveLength(2);
    expect(left[0]?.workerHint).toBe('worker-1');
    expect(left[0]?.kind).toBe('review');
    expect(left[0]?.priority).toBe('review');
  });

  test('groups transitive overlapping test scopes under one deterministic writer', () => {
    const report = runFixture(
      'export function f() { return 1; }\nexport function g() { return 2; }\nexport function h() { return 3; }\nexport function separate() { return 4; }',
      {
        'a.test.mjs': `import { test, expect } from 'bun:test'; import { f } from '../src/subject.ts'; test('f in a', () => { expect(f()).toBe(1); });`,
        'b.test.mjs': `import { test, expect } from 'bun:test'; import { f, g } from '../src/subject.ts'; test('f and g in b', () => { expect(f()).toBe(1); expect(g()).toBe(2); });`,
        'c.test.mjs': `import { test, expect } from 'bun:test'; import { g, h } from '../src/subject.ts'; test('g and h in c', () => { expect(g()).toBe(2); expect(h()).toBe(3); });`,
        'd.test.mjs': `import { test, expect } from 'bun:test'; import { h } from '../src/subject.ts'; test('h in d', () => { expect(h()).toBe(3); });`,
        'z.test.mjs': `import { test, expect } from 'bun:test'; import { separate } from '../src/subject.ts'; test('separate', () => { expect(separate()).toBe(4); });`,
      },
    );
    const first = buildQueue(report, 2);
    const second = buildQueue(report, 2);
    const groupedFiles = first[0]?.functions.flatMap((row) => row.scope.testFiles as string[]) ?? [];
    const separateFiles = first[1]?.functions.flatMap((row) => row.scope.testFiles as string[]) ?? [];
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    expect(first[0]?.target.path).toBe('tests/a.test.mjs');
    expect(first[0]?.functions.map((row) => row.identity.split('#').at(-2))).toEqual(['fn:f', 'fn:g', 'fn:h']);
    expect(new Set(groupedFiles)).toEqual(
      new Set(['tests/a.test.mjs', 'tests/b.test.mjs', 'tests/c.test.mjs', 'tests/d.test.mjs']),
    );
    expect(first[1]?.target.path).toBe('tests/z.test.mjs');
    expect(groupedFiles.some((file) => separateFiles.includes(file))).toBe(false);
    expect(first.map((job) => job.workerHint)).toEqual(['worker-1', 'worker-2']);
  });

  test('does not queue a function whose reviewed matrix has no pending patterns', () => {
    const source = 'export function target() { return 1; }';
    const testText = `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('target ok', () => { expect(target()).toBe(1); });`;
    const base = runFixture(source, { 'target.test.mjs': testText });
    const row = base.functions[0];
    if (!row) throw new Error('Target function was not inventoried.');
    const states = {
      contract: 'present',
      zombies: 'present',
      persistence: 'present',
      restart: 'present',
      crossSurface: 'present',
      cas: 'present',
      unknown: 'present',
      auth: 'present',
    } as const;
    const reviewed = runFixture(
      source,
      { 'target.test.mjs': testText },
      {
        schemaVersion: 1,
        configHash: base.inputHashes.config,
        sourceHashes: base.inputHashes.sources,
        testHashes: base.inputHashes.tests,
        functions: [
          {
            identity: row.identity,
            cases: [{ file: 'tests/target.test.mjs', name: 'target ok', patterns: states }],
          },
        ],
      },
    );
    expect(reviewed.functions[0]?.patterns.status).toBe('reviewed');
    expect(buildQueue(reviewed)).toEqual([]);
  });

  test('keeps a shared target in review when any assigned function is unreviewed', () => {
    const source = 'export function first() { return 1; }\nexport function second() { return 2; }';
    const testText = `import { test, expect } from 'bun:test';\nimport { first, second } from '../src/subject.ts'; test('both', () => { expect(first()).toBe(1); expect(second()).toBe(2); });`;
    const base = runFixture(source, { 'shared.test.mjs': testText });
    const first = base.functions.find((row) => row.name === 'fn:first');
    if (!first) throw new Error('First function was not inventoried.');
    const matrix = {
      schemaVersion: 1,
      configHash: base.inputHashes.config,
      sourceHashes: base.inputHashes.sources,
      testHashes: base.inputHashes.tests,
      functions: [
        {
          identity: first.identity,
          cases: [
            {
              file: 'tests/shared.test.mjs',
              name: 'both',
              patterns: {
                contract: 'missing',
                zombies: 'present',
                persistence: 'present',
                restart: 'present',
                crossSurface: 'present',
                cas: 'present',
                unknown: 'present',
                auth: 'present',
              },
            },
          ],
        },
      ],
    };
    const report = runFixture(source, { 'shared.test.mjs': testText }, matrix);
    const jobs = buildQueue(report);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.kind).toBe('review');
    expect(jobs[0]?.functions.map((row) => row.identity)).toHaveLength(2);
  });

  test('composes reusable profiles, scenario refinements, and exact-case overrides', () => {
    const source = 'export function target() { return 1; }';
    const testText = `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('target ok', () => { expect(target()).toBe(1); });`;
    const base = runFixture(source, { 'target.test.mjs': testText });
    const row = base.functions[0];
    if (!row) throw new Error('Target function was not inventoried.');
    const profile = {
      schemaVersion: 2,
      configHash: base.inputHashes.config,
      sourceHashes: base.inputHashes.sources,
      testHashes: base.inputHashes.tests,
      profiles: [
        {
          id: 'pure-value',
          patterns: { contract: 'present', zombies: 'present', unknown: 'not-applicable' },
          justification: 'This pure value has no asynchronous resource lifecycle.',
        },
      ],
      scenarios: [
        {
          id: 'ordinary-return',
          profile: 'pure-value',
          patterns: { persistence: 'not-applicable' },
          justification: 'This value has no persistence behavior.',
        },
      ],
      functions: [
        {
          identity: row.identity,
          cases: [
            {
              file: 'tests/target.test.mjs',
              name: 'target ok',
              scenario: 'ordinary-return',
              overrides: {
                restart: 'not-applicable',
                crossSurface: 'not-applicable',
                cas: 'not-applicable',
                auth: 'not-applicable',
              },
              justification: 'This pure function has no persistent state or external surface.',
            },
          ],
        },
      ],
    };
    const reviewed = runFixture(source, { 'target.test.mjs': testText }, profile);
    expect(reviewed.status).toBe('reported');
    expect(reviewed.functions[0]?.patterns.status).toBe('reviewed');
    expect(reviewed.functions[0]?.patterns.notApplicable.map((entry) => entry.name)).toContain('persistence');
    expect(buildQueue(reviewed)).toEqual([]);
  });

  test('preserves effective not-applicable reasons in the reviewed case and bound queue slice', () => {
    const source = 'export function target() { return 1; }';
    const testText = `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('target ok', () => { expect(target()).toBe(1); });`;
    const base = runFixture(source, { 'target.test.mjs': testText });
    const row = base.functions[0];
    if (!row) throw new Error('Target function was not inventoried.');
    const profile = (reason: string | undefined) => ({
      schemaVersion: 2,
      configHash: base.inputHashes.config,
      sourceHashes: base.inputHashes.sources,
      testHashes: base.inputHashes.tests,
      profiles: [
        {
          id: 'local-transform',
          patterns: {
            contract: 'missing',
            zombies: 'present',
            persistence: 'present',
            restart: 'present',
            crossSurface: 'present',
            cas: 'present',
            unknown: 'present',
            auth: 'present',
          },
        },
      ],
      scenarios: [
        {
          id: 'no-auth-boundary',
          profile: 'local-transform',
          patterns: { auth: 'not-applicable' },
          justification: 'Scenario has no authorization boundary.',
        },
      ],
      functions: [
        {
          identity: row.identity,
          cases: [
            {
              file: 'tests/target.test.mjs',
              name: 'target ok',
              scenario: 'no-auth-boundary',
              ...(reason === undefined ? {} : { justification: reason }),
            },
          ],
        },
      ],
    });
    const inherited = runFixture(source, { 'target.test.mjs': testText }, profile(undefined));
    expect(inherited.functions[0]?.reviewedCases?.[0]?.justification).toBe('Scenario has no authorization boundary.');
    expect(buildQueue(inherited)[0]?.functions[0]?.requiredScenarios[0]?.justification).toBe(
      'Scenario has no authorization boundary.',
    );
    const reason = 'This exact case has no identity or authorization boundary.';
    const reviewed = runFixture(source, { 'target.test.mjs': testText }, profile(reason));
    expect(reviewed.functions[0]?.reviewedCases?.[0]).toMatchObject({
      name: 'target ok',
      justification: reason,
      patterns: { auth: 'not-applicable' },
    });
    expect(buildQueue(reviewed)[0]?.functions[0]?.requiredScenarios[0]?.justification).toBe(reason);

    const changedReason = runFixture(
      source,
      { 'target.test.mjs': testText },
      profile('Changed exact-case applicability rationale.'),
    );
    expect(buildQueue(changedReason)[0]?.jobId).not.toBe(buildQueue(reviewed)[0]?.jobId);
  });

  test('invalidates only queue jobs whose effective profile slice changes', () => {
    const source = 'export function first() { return 1; }\nexport function second() { return 2; }';
    const tests = {
      'first.test.mjs': `import { test, expect } from 'bun:test';\nimport { first } from '../src/subject.ts'; test('first', () => { expect(first()).toBe(1); });`,
      'second.test.mjs': `import { test, expect } from 'bun:test';\nimport { second } from '../src/subject.ts'; test('second', () => { expect(second()).toBe(2); });`,
    };
    const base = runFixture(source, tests);
    const first = base.functions.find((row) => row.name === 'fn:first');
    const second = base.functions.find((row) => row.name === 'fn:second');
    if (!first || !second) throw new Error('Expected both functions to be inventoried.');
    const states = {
      contract: 'missing',
      zombies: 'present',
      persistence: 'present',
      restart: 'present',
      crossSurface: 'present',
      cas: 'present',
      unknown: 'present',
      auth: 'present',
    } as const;
    const matrix = (rationale: string) => ({
      schemaVersion: 1,
      configHash: base.inputHashes.config,
      sourceHashes: base.inputHashes.sources,
      testHashes: base.inputHashes.tests,
      functions: [
        {
          identity: first.identity,
          risk: { reviewed: true, priority: 'P1', rationale },
          cases: [{ file: 'tests/first.test.mjs', name: 'first', patterns: states }],
        },
        { identity: second.identity, cases: [{ file: 'tests/second.test.mjs', name: 'second', patterns: states }] },
      ],
    });
    const before = buildQueue(runFixture(source, tests, matrix('Risk priority based on external dependencies.')));
    const after = buildQueue(runFixture(source, tests, matrix('Risk priority based on stable input boundaries.')));
    expect(before).toHaveLength(2);
    expect(after[0]?.jobId).not.toBe(before[0]?.jobId);
    expect(after[1]?.jobId).toBe(before[1]?.jobId);
  });

  test('drafts bound unreviewed reusable profiles from a captured report without rescanning', () => {
    const report = runFixture('export function target() { return 1; }', {
      'target.test.mjs': `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('target ok', () => { expect(target()).toBe(1); });`,
    });
    const before = structuredClone(report.analysis);
    const draft = draftPatternProfiles(report);
    expect(report.analysis).toEqual(before);
    expect(draft.configHash).toBe(report.inputHashes.config);
    expect(draft.sourceHashes).toEqual(report.inputHashes.sources);
    expect(draft.testHashes).toEqual(report.inputHashes.tests);
    expect(draft.profiles[0]?.patterns).toEqual({});
    expect(draft.functions[0]?.cases[0]?.scenario).toBe(draft.scenarios[0]?.id);
    const reviewed = runFixture(
      'export function target() { return 1; }',
      {
        'target.test.mjs': `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('target ok', () => { expect(target()).toBe(1); });`,
      },
      draft as unknown as Record<string, unknown>,
    );
    expect(reviewed.status).toBe('reported');
    expect(reviewed.functions[0]?.patterns.status).toBe('unreviewed');
    expect(buildQueue(reviewed)[0]?.kind).toBe('review');
  });

  test('invalid, unknown-reference, and stale reusable profiles block queue actions', () => {
    const source = 'export function target() { return 1; }';
    const testText = `import { test, expect } from 'bun:test';\nimport { target } from '../src/subject.ts'; test('target ok', () => { expect(target()).toBe(1); });`;
    const base = runFixture(source, { 'target.test.mjs': testText });
    const row = base.functions[0];
    if (!row) throw new Error('Target function was not inventoried.');
    const profile = {
      schemaVersion: 2,
      configHash: base.inputHashes.config,
      sourceHashes: base.inputHashes.sources,
      testHashes: base.inputHashes.tests,
      profiles: [{ id: 'default', patterns: {} }],
      scenarios: [{ id: 'case', profile: 'missing-profile' }],
      functions: [
        { identity: row.identity, cases: [{ file: 'tests/target.test.mjs', name: 'target ok', scenario: 'case' }] },
      ],
    };
    const invalid = runFixture(source, { 'target.test.mjs': testText }, profile);
    expect(invalid.status).toBe('unknown');
    expect(buildQueue(invalid).every((job) => job.kind === 'blocked')).toBe(true);
    profile.sourceHashes = { 'src/subject.ts': '0'.repeat(64) };
    const stale = runFixture(source, { 'target.test.mjs': testText }, profile);
    expect(stale.diagnostics.some((entry) => entry.code === 'matrix-invalid')).toBe(true);
    expect(buildQueue(stale).every((job) => job.kind === 'blocked')).toBe(true);
  });

  test('proposes one deterministic new file for unmapped functions and changes job IDs when inputs change', () => {
    const first = runFixture('export function alpha() { return 1; }\nexport function beta() { return 2; }', {});
    const changed = runFixture('export function alpha() { return 0; }\nexport function beta() { return 2; }', {});
    const queue = buildQueue(first, 2);
    const changedQueue = buildQueue(changed, 2);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.target).toEqual({ path: 'tests/subject.test.ts', disposition: 'proposed' });
    expect(queue[0]?.functions.map((item) => item.identity)).toHaveLength(2);
    expect(queue[0]?.kind).toBe('review');
    expect(queue[0]?.jobId).not.toBe(changedQueue[0]?.jobId);
    expect(queue[0]?.functions[0]?.scope).toBeDefined();
    expect(queue[0]?.functions[0]?.prompt).toContain('UNKNOWN');
  });

  test('rejects invalid worker counts', () => {
    const report = runFixture('export function alpha() { return 1; }', {});
    expect(() => buildQueue(report, 0)).toThrow('--workers');
    expect(() => buildQueue(report, 1.5)).toThrow('--workers');
    expect(() => buildQueue(report, 33)).toThrow('--workers');
  });

  test('CLI binds the same captured manifest that selected its Source scope', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-manifest-capture-'));
    try {
      mkdirSync(path.join(root, 'src'));
      mkdirSync(path.join(root, 'bin'));
      mkdirSync(path.join(root, 'tests'));
      writeFileSync(path.join(root, 'src/first.ts'), 'export function first() {}');
      writeFileSync(path.join(root, 'src/second.ts'), 'export function second() {}');
      const initial = '\uFEFF' + JSON.stringify({ files: ['src/first.ts'], bin: {} });
      const changed = JSON.stringify({ files: ['src/second.ts'], bin: {} });
      writeFileSync(path.join(root, 'package.json'), initial);
      const preload = path.join(root, 'capture-hook.ts');
      writeFileSync(
        preload,
        `import * as fs from 'node:fs'; import {spyOn} from 'bun:test';
        const target = ${JSON.stringify(path.join(root, 'package.json'))};
        const identity = fs.statSync(target); const originalRead = fs.readSync; let changed = false;
        spyOn(fs, 'readSync').mockImplementation((...args) => {
          const descriptor = fs.fstatSync(args[0]); const count = originalRead(...args);
          if (!changed && count === 0 && descriptor.dev === identity.dev && descriptor.ino === identity.ino) {
            changed = true; fs.writeFileSync(target, ${JSON.stringify(changed)});
          }
          return count;
        });`,
      );
      const script = new URL('../tooling/test-function-audit.ts', import.meta.url).pathname;
      const child = spawnSync(process.execPath, ['--preload', preload, script, '--queue=json'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 10000,
      });
      if (child.status !== 0) process.stderr.write(child.stderr);
      expect(child.error).toBeUndefined();
      expect(child.signal).toBeNull();
      expect(child.status).toBe(0);
      expect(child.stderr).toBe('');
      const report = JSON.parse(child.stdout) as {
        functions: Array<{ file: string }>;
        inputHashes: { resolution: Record<string, string> };
      };
      expect(report.functions.map((row) => row.file)).toEqual(['src/first.ts']);
      expect(report.inputHashes.resolution['package.json']).toBe(createHash('sha256').update(initial).digest('hex'));
      expect(JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))).toEqual(JSON.parse(changed));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('queue CLI prints a plan without writing files or starting workers', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'function-audit-cli-'));
    try {
      mkdirSync(path.join(root, 'src'));
      mkdirSync(path.join(root, 'bin'));
      mkdirSync(path.join(root, 'tests'));
      writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ name: 'audit-fixture', files: ['src/**'], bin: {} }),
      );
      writeFileSync(path.join(root, 'src', 'subject.ts'), 'export function target() { return 1; }');
      writeFileSync(
        path.join(root, 'tests', 'existing.test.mjs'),
        `import { test, expect } from 'bun:test';\ntest('unrelated', () => { expect(true).toBe(true); });`,
      );
      const before = readdirSync(root, { recursive: true }).sort((a, b) => String(a).localeCompare(String(b)));
      const script = new URL('../tooling/test-function-audit.ts', import.meta.url).pathname;
      const child = spawnSync(process.execPath, [script, '--source=src/subject.ts', '--queue=json', '--workers=2'], {
        cwd: root,
        encoding: 'utf8',
      });
      expect(child.status).toBe(0);
      const result = JSON.parse(child.stdout) as { queue: Array<{ workerHint: string }> };
      expect(result.queue.at(0)?.workerHint).toBe('worker-1');
      expect(child.stderr).toBe('');
      expect(readdirSync(root, { recursive: true }).sort((a, b) => String(a).localeCompare(String(b)))).toEqual(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
