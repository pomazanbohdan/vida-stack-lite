import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.js';
import {
  readRuntimePackageResourceBytes,
  runtimeConfigDigest,
  runtimePackageAccess,
  type AgentRuntimeConfig,
} from '../../src/config/runtime-config.js';
import type { RuntimeInitializationReceipt } from '../../src/config/initialization-record.js';
import type { HostStateStore } from '../../src/host-state.js';
import { bindRuntimeInitialization } from '../../src/runtime-initialization.js';
import { deriveWorkspaceId } from '../../src/workspace-identity.js';

const templateOutputs: readonly (readonly [string, string])[] = [
  ['templates/AGENTS.template.md', 'AGENTS.md'],
  ['templates/AGENT.sidecar.template.md', 'AGENT.sidecar.md'],
  ['templates/agent-runtime.config.template.v1.yaml', 'agent-runtime.config.v1.yaml'],
  ['templates/documentation-policy.template.v1.json', 'docs/agent-instructions/documentation-policy.v1.json'],
];

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Controlled Source fixture binding; no installer, native formation or Runtime acceptance proof. */
export async function bindControlledRuntimeInitialization(
  root: string,
  config: AgentRuntimeConfig,
  store: HostStateStore,
): Promise<void> {
  const packageAccess = runtimePackageAccess();
  const receipt: RuntimeInitializationReceipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    provenance: 'generated',
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((project) => project.project_id).sort(),
    integrations_digest: canonicalJsonDigest(config.integrations),
    workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
    workspace_binding_status: 'pending',
    bundle: config.runtime.bundle,
    config_digest: runtimeConfigDigest(config),
    schema_sha256: sha256(
      readRuntimePackageResourceBytes(packageAccess, 'schemas/runtime-initialization.v1.schema.json', 'fixture schema'),
    ),
    templates: templateOutputs.map(([template, output]) => ({
      template,
      template_sha256: sha256(
        readRuntimePackageResourceBytes(packageAccess, template, 'fixture template: ' + template),
      ),
      output,
      output_sha256: sha256(readFileSync(path.join(root, output))),
    })),
    created_at: new Date().toISOString(),
  };
  const receiptPath = path.join(root, '.agent', 'runtime-initialization.v1.json');
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  await bindRuntimeInitialization(root, store);
}
