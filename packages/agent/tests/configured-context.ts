import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadProjectContext } from '../src/config/project-context.ts';

export function configuredTestContext() {
  const repositoryRoot =
    process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
    path.resolve(fileURLToPath(new URL('..', import.meta.url)), '..', '..');
  const config = loadRuntimeConfig(repositoryRoot);
  const projectId = config.projects[0]?.project_id;
  if (!projectId) throw new Error('Test configuration requires a project');
  return {
    repositoryRoot,
    config,
    context: loadProjectContext(repositoryRoot, config, config.repository.repository_id, projectId),
  };
}
