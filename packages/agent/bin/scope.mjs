#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function inspectScope(args) {
  const values = { projects: [], paths: [] };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index],
      value = args[index + 1];
    if (!value || !['--project-root', '--repository', '--project', '--path'].includes(key))
      throw new Error(
        'scope requires --project-root ABSOLUTE --repository ID --project ID --path RELATIVE [--path RELATIVE]',
      );
    if (key === '--project') values.projects.push(value);
    else if (key === '--path') values.paths.push(value);
    else if (Object.hasOwn(values, key)) throw new Error('duplicate scope option');
    else values[key] = value;
  }
  const suppliedRoot = values['--project-root'];
  if (!suppliedRoot || !path.isAbsolute(suppliedRoot)) throw new Error('scope requires an absolute project root');
  const root = path.resolve(suppliedRoot);
  const { loadRuntimeConfig } = await import('../src/config/runtime-config.ts');
  const { loadProjectSetContext, resolveProjectForRepositoryPath } = await import('../src/config/project-context.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { snapshotDeclaredSources } = await import('../src/orchestration/scoped-source-snapshot.ts');
  const config = loadRuntimeConfig(root);
  const context = loadProjectSetContext(root, config, values['--repository'], values.projects);
  for (const relative of values.paths) {
    const selected = resolveProjectForRepositoryPath(config.projects, relative);
    if (!context.project_ids.includes(selected.project_id)) throw new Error('scope path is outside selected products');
  }
  return snapshotDeclaredSources(requireSafeRepositoryAccess(root), values.paths);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (typeof Bun === 'undefined') {
      const { runPinnedBun } = await import('./bun.mjs');
      process.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
        root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
        cwd: process.cwd(),
      });
    } else process.stdout.write(`${JSON.stringify(await inspectScope(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ schema: 'VidaAgentCommandResult/v1', status: 'blocked', code: 'GAP-VIDA-SCOPE-001', message: error.message })}\n`,
    );
    process.exitCode = 1;
  }
}
