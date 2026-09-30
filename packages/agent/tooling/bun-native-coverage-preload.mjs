import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll } from 'bun:test';
import { createInstrumenter } from 'istanbul-lib-instrument';
import { bunCoverageSources } from './maintained-source-inventory.mjs';

const root = path.resolve(
  process.env.BUN_NATIVE_COVERAGE_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
);
const coverageRoot = path.resolve(process.env.BUN_NATIVE_COVERAGE_OUTPUT_ROOT ?? root);
const coveragePath = path.resolve(
  process.env.BUN_NATIVE_COVERAGE_STAGING_PATH ??
    path.join(coverageRoot, 'coverage', 'bun-native', 'coverage-final.json'),
);
const sourceSet = new Set(bunCoverageSources.map((file) => path.resolve(root, file)));
const nativeSourceFilter = new RegExp(
  '^(' + [...sourceSet].map((source) => source.replace(/[|\\{}()[\]^$+*?.]/gu, '\\$&')).join('|') + ')$',
);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const sources = bunCoverageSources.map((file) => ({
  path: file,
  sha256: digest(readFileSync(path.join(root, file))),
}));

Bun.plugin({
  name: 'vida-agent-bun-native-istanbul',
  setup(build) {
    build.onLoad({ filter: nativeSourceFilter }, async (args) => {
      const instrumenter = createInstrumenter({
        compact: false,
        coverageVariable: '__vidaAgentNativeCoverage__',
        esModules: true,
        parserPlugins: ['typescript', 'importAttributes'],
        preserveComments: true,
      });
      return {
        contents: instrumenter.instrumentSync(await Bun.file(args.path).text(), args.path),
        loader: 'ts',
      };
    });
  },
});

export function finalizeNativeCoverage() {
  const coverage = globalThis.__vidaAgentNativeCoverage__ ?? {};
  mkdirSync(path.dirname(coveragePath), { recursive: true });
  const temporary = coveragePath + '.tmp-' + process.pid;
  writeFileSync(
    temporary,
    JSON.stringify(
      {
        schema: 'BunNativeCoverageReport/v1',
        sources,
        coverage,
      },
      null,
      2,
    ) + '\n',
  );
  renameSync(temporary, coveragePath);
}

afterAll(finalizeNativeCoverage);
