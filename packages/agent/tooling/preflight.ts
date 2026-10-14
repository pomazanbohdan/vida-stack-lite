import { existsSync } from 'node:fs';
import path from 'node:path';

const forbiddenCandidatePaths = [
  'config/agent-profiles.v1.json',
  'config/authorization/cedar-policy.v1.cedar',
  'config/authorization/cedar-schema.v1.json',
  'config/differential-normalization.v1.json',
  'config/governance/edictum-policy.v1.json',
  'config/integrations/edictum-workflow.v1.yml',
  'config/orchestration/mastra-policy.v1.json',
  'config/platform-knowledge.sources.json',
  'config/runtime-operations.v1.json',
  'dist/schemas/runtime-config.v1.schema.json',
  'schemas/runtime-config.v1.schema.json',
] as const;

export function assertCandidatePreflight(root: string): void {
  if (!path.isAbsolute(root)) throw new Error('Candidate preflight requires an absolute Source package root.');
  const present = forbiddenCandidatePaths.filter((relative) => existsSync(path.join(root, relative)));
  if (present.length) throw new Error(`candidate preflight found obsolete files:\n${present.join('\n')}`);
}

if (import.meta.main) assertCandidatePreflight(process.cwd());
