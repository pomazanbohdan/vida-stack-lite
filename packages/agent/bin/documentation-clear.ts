#!/usr/bin/env bun
import { cliCommandContracts } from './cli-command-contracts.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
type DocumentationClearMode = Parameters<
  typeof import('../src/documentation/clear.ts').executeDocumentationClearFromWork
>[1];
type DocumentationClearInput = Parameters<
  typeof import('../src/documentation/clear.ts').executeDocumentationClearFromWork
>[0];
const safeId = (value: string): string => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value ?? '')) throw new Error('documentation work id invalid');
  return value;
};
function requiredOption(values: Record<string, string>, key: string): string {
  const value = values[key];
  if (!value) throw new Error(`documentation CLEAR missing ${key}`);
  return value;
}

function isDocumentationClearMode(value: unknown): value is DocumentationClearMode {
  const option = cliCommandContracts['documentation-clear'].options.find((entry) => entry.name === '--mode');
  return typeof value === 'string' && option?.values?.includes(value) === true;
}

function recordDocumentationArgument(
  args: readonly string[],
  index: number,
  allowed: ReadonlySet<string>,
  values: Record<string, string>,
): void {
  const key = args[index];
  const value = args[index + 1];
  if (!key || !allowed.has(key) || !value || value.startsWith('--') || values[key])
    throw new Error('documentation CLEAR arguments invalid');
  values[key] = value;
}

function parse(args: readonly string[]): { mode: DocumentationClearMode; input: DocumentationClearInput } {
  const options = cliCommandContracts['documentation-clear'].options;
  const allowed = new Set(options.map((option) => option.name));
  const values: Record<string, string> = {};
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

export async function runDocumentationClear(args: readonly string[]) {
  const { input, mode } = parse(args);
  const { executeDocumentationClearFromWork } = await import('../src/documentation/clear.ts');
  return executeDocumentationClearFromWork(input, mode);
}

function reportDocumentationFailure(error: unknown): void {
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
