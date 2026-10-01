import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Authored consumer test data; never a runtime configuration fallback.
export function writeConsumerFixture(root, bundle, project = 'fixture-project') {
  const put = (relative, bytes) => {
    const target = path.join(root, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  };
  mkdirSync(path.join(root, '.git'), { recursive: true });
  mkdirSync(path.join(root, '.agent/work'), { recursive: true });
  mkdirSync(path.join(root, 'src'), { recursive: true });
  for (const [output, template] of [
    ['AGENTS.md', 'AGENTS.template.md'],
    ['AGENT.sidecar.md', 'AGENT.sidecar.template.md'],
    ['agent-runtime.config.v1.yaml', 'agent-runtime.config.template.v1.yaml'],
    ['docs/agent-instructions/documentation-policy.v1.json', 'documentation-policy.template.v1.json'],
  ])
    put(
      output,
      readFileSync(path.join(bundle, 'templates', template), 'utf8')
        .replaceAll('{{REPOSITORY}}', 'fixture-repository')
        .replaceAll('{{PROJECTS}}', project)
        .replaceAll('{{PROJECT}}', project)
        .replaceAll('{{BUNDLE}}', 'vida-agent')
        .replaceAll('{{CREATED_AT}}', '2026-09-30T00:00:00.000Z'),
    );
  for (const file of ['package.json', 'TESTING.md']) put('vida-agent/' + file, readFileSync(path.join(bundle, file)));
  cpSync(path.join(bundle, 'schemas'), path.join(root, 'vida-agent/schemas'), { recursive: true });
  return root;
}

export function createConsumerFixture(bundle, prefix = 'vida-consumer-') {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  try {
    return writeConsumerFixture(root, bundle);
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
