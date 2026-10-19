import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function makeFreshRepository(
  prefix = 'project-upgrade-lifecycle-',
  options: { includeLocalInstructions?: boolean } = {},
): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  await mkdir(path.join(root, '.git'));
  await mkdir(path.join(root, 'docs/agent-instructions'), { recursive: true });
  if (options.includeLocalInstructions !== false)
    await cp(path.join(packageRoot, 'instructions'), path.join(root, 'docs/agent-instructions'), { recursive: true });

  const render = (value: string): string =>
    value
      .replaceAll('{{REPOSITORY}}', 'lifecycle-fixture')
      .replaceAll('{{PROJECT}}', 'fixture')
      .replaceAll('{{PROJECTS}}', 'fixture')
      .replaceAll('{{BUNDLE}}', 'vida-agent')
      .replaceAll('{{CREATED_AT}}', '2026-10-10T00:00:00.000Z');
  const templates: ReadonlyArray<readonly [string, string]> = [
    ['templates/AGENTS.template.md', 'AGENTS.md'],
    ['templates/AGENT.sidecar.template.md', 'AGENT.sidecar.md'],
    ['templates/agent-runtime.config.template.v1.yaml', 'agent-runtime.config.v1.yaml'],
  ];
  for (const [source, target] of templates)
    await writeFile(path.join(root, target), render(await readFile(path.join(packageRoot, source), 'utf8')));
  await writeFile(
    path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
    render(await readFile(path.join(packageRoot, 'templates/documentation-policy.template.v1.json'), 'utf8')),
  );
  return root;
}
