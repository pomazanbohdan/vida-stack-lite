#!/usr/bin/env bun
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  executeDocumentationClearFromWork,
} from '../dist/src/index.js';
const safeId = (value) => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value ?? '')) throw new Error('documentation work id invalid');
  return value;
};
function parse(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--mode', '--project-root', '--repository', '--project', '--work-id', '--source-revision'].includes(key) || !value || value.startsWith('--') || values[key])
      throw new Error('documentation CLEAR arguments invalid');
    values[key] = value;
  }
  for (const key of ['--mode', '--project-root', '--repository', '--project', '--work-id', '--source-revision'])
    if (!values[key]) throw new Error(`documentation CLEAR missing ${key}`);
  if (!['baseline', 'closeout', 'verify'].includes(values['--mode'])) throw new Error('documentation CLEAR mode invalid');
  if (!path.isAbsolute(values['--project-root'])) throw new Error('documentation project root must be absolute');
  return values;
}

export async function runDocumentationClear(args) {
  const options = parse(args);
  const root = path.resolve(options['--project-root']);
  const workId = safeId(options['--work-id']);
  const input = {
    repository_root: root,
    repository_id: options['--repository'],
    project_id: options['--project'],
    work_id: workId,
    source_revision: options['--source-revision'],
  };
  return executeDocumentationClearFromWork(input, options['--mode']);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runDocumentationClear(process.argv.slice(2))
    .then((result) => process.stdout.write(JSON.stringify(result) + '\n'))
    .catch((error) => {
      process.stderr.write(String(error?.message ?? error) + '\n');
      process.exitCode = 1;
    });
}
