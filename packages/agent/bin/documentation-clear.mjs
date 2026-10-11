#!/usr/bin/env bun
import { cliCommandContracts } from './cli-command-contracts.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/** @typedef {Parameters<typeof import('../dist/src/index.js').executeDocumentationClearFromWork>[1]} DocumentationClearMode */
/** @param {string} value */
const safeId = (value) => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value ?? '')) throw new Error('documentation work id invalid');
  return value;
};
/** @param {Record<string, string>} values @param {string} key @returns {string} */
function requiredOption(values, key) {
  const value = values[key];
  if (!value) throw new Error(`documentation CLEAR missing ${key}`);
  return value;
}

/** @param {unknown} value @returns {value is DocumentationClearMode} */
function isDocumentationClearMode(value) {
  const option = cliCommandContracts['documentation-clear'].options.find((entry) => entry.name === '--mode');
  return typeof value === 'string' && option?.values?.includes(value) === true;
}

/** @param {readonly string[]} args @param {number} index @param {ReadonlySet<string>} allowed @param {Record<string, string>} values */
function recordDocumentationArgument(args, index, allowed, values) {
  const key = args[index];
  const value = args[index + 1];
  if (!key || !allowed.has(key) || !value || value.startsWith('--') || values[key])
    throw new Error('documentation CLEAR arguments invalid');
  values[key] = value;
}

/** @param {readonly string[]} args */
function parse(args) {
  const options = cliCommandContracts['documentation-clear'].options;
  const allowed = new Set(options.map((option) => option.name));
  /** @type {Record<string, string>} */
  const values = {};
  for (let index = 0; index < args.length; index += 2) recordDocumentationArgument(args, index, allowed, values);
  for (const key of options.filter((option) => option.required).map((option) => option.name))
    if (!values[key]) throw new Error(`documentation CLEAR missing ${key}`);
  const mode = values['--mode'];
  if (!isDocumentationClearMode(mode)) throw new Error('documentation CLEAR mode invalid');
  const root = requiredOption(values, '--project-root');
  if (!path.isAbsolute(root)) throw new Error('documentation project root must be absolute');
  return {
    mode,
    input: {
      repository_root: path.resolve(root),
      repository_id: requiredOption(values, '--repository'),
      project_id: requiredOption(values, '--project'),
      work_id: safeId(requiredOption(values, '--work-id')),
      source_revision: requiredOption(values, '--source-revision'),
    },
  };
}

/** @param {readonly string[]} args */
export async function runDocumentationClear(args) {
  const { input, mode } = parse(args);
  const { executeDocumentationClearFromWork } = await import('../dist/src/index.js');
  return executeDocumentationClearFromWork(input, mode);
}

/** @param {unknown} error */
function reportDocumentationFailure(error) {
  const message = error && typeof error === 'object' && 'message' in error ? error.message : undefined;
  process.stderr.write(String(message ?? error) + '\n');
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--help') {
    const { cliMetadataResult } = await import('./cli-metadata.ts');
    process.stdout.write(
      JSON.stringify(cliMetadataResult(['documentation-clear', ...process.argv.slice(2)], {})) + '\n',
    );
    process.exit(0);
  }
  runDocumentationClear(process.argv.slice(2))
    .then((result) => process.stdout.write(JSON.stringify(result) + '\n'))
    .catch(reportDocumentationFailure);
}
