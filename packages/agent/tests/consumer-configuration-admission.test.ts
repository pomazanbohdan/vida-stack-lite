import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { configuredTestContext } from './configured-context.js';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.js';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.js';
import {
  assertLoadedRuntimeConfig,
  capturedRuntimeConfigurationBinding,
  loadRuntimeConfig,
  readRuntimeConfigurationForObservation,
  runtimeConfigDigest,
} from '../src/config/runtime-config.js';
import { PROJECT_CONFIGURATION_PATHS } from '../src/config/project-paths.js';
import {
  planProjectUpgradeRepair,
  resumeFreshProjectUpgrade,
  resumeProjectUpgrade,
} from '../src/config/project-upgrade.js';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.js';
import { deriveWorkspaceId } from '../src/workspace-identity.js';
import { openHostStateDatabase } from '../src/host-state.js';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.js';
import {
  configuredHostPreOpenValidator,
  openConfiguredMastraSessionLedger,
  openConfiguredSessionHandoffStore,
} from '../src/orchestration/persistent-session-handoff.js';

test('consumer pending and stale configuration fence Host creation and release admission', () => {
  const source = configuredTestContext().repositoryRoot;
  const bundle = path.resolve(import.meta.dirname, '..');
  const root = mkdtempSync(path.join(tmpdir(), 'consumer-config-admission-'));
  try {
    mkdirSync(path.join(root, '.agent'));
    mkdirSync(path.join(root, 'docs/agent-instructions'), { recursive: true });
    for (const file of [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
    ])
      copyFileSync(path.join(source, file), path.join(root, file));
    const config = loadRuntimeConfig(root);
    const workspace = deriveWorkspaceId(config.repository.repository_id, root);
    const receipt = {
      schema: 'RuntimeInitialization/v1',
      version: 1,
      provenance: 'generated',
      repository_id: config.repository.repository_id,
      project_ids: config.projects.map((project) => project.project_id).sort(),
      integrations_digest: canonicalJsonDigest(config.integrations),
      workspace_id: workspace,
      workspace_binding_status: 'pending',
      bundle: config.runtime.bundle,
      config_digest: runtimeConfigDigest(config),
      schema_sha256: createHash('sha256')
        .update(readFileSync(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json')))
        .digest('hex'),
      templates: fixtureInitializationTemplates(source, bundle),
      created_at: new Date().toISOString(),
    };
    const pending = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    writeFileSync(path.join(root, '.agent/runtime-initialization.v1.json'), JSON.stringify(receipt));
    writeFileSync(pending, JSON.stringify(receipt));
    expect(() => loadRuntimeConfig(root)).not.toThrow();
    const validate = configuredHostPreOpenValidator(root, config);
    const relative = '.agent/consumer-admission-test.sqlite';
    const target = path.join(root, relative);
    writeFileSync(pending, JSON.stringify({ schema: 'ConsumerConfigurationOperation/v1' }));
    expect(() => openConfiguredSessionHandoffStore(root)).toThrow();
    expect(() => openConfiguredMastraSessionLedger(root)).toThrow();
    expect(existsSync(path.join(root, config.control.work_root))).toBe(false);
    expect(() => openHostStateDatabase(root, relative, workspace, validate)).toThrow();
    expect(existsSync(target)).toBe(false);
    writeFileSync(pending, '{');
    expect(() => loadRuntimeConfig(root)).toThrow();
    rmSync(pending);
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    writeFileSync(receiptPath, JSON.stringify(receipt) + '\n');
    expect(() => openHostStateDatabase(root, relative, workspace, validate)).toThrow();
    expect(existsSync(target)).toBe(false);
    writeFileSync(receiptPath, JSON.stringify(receipt));
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    writeFileSync(configPath, readFileSync(configPath, 'utf8') + '\n# changed source bytes\n');
    expect(() => openHostStateDatabase(root, relative, workspace, validate)).toThrow();
    expect(existsSync(target)).toBe(false);
    const current = loadRuntimeConfig(root);
    const valid = configuredHostPreOpenValidator(root, current);
    const database = openHostStateDatabase(root, relative, workspace, valid);
    closeWorkspaceDatabaseWithAdmission(database);
    expect(existsSync(target)).toBe(true);
    const store = openConfiguredSessionHandoffStore(root);
    store.close();
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
});

const readonlyObservationCaseBudgetMs = 120_000;

test(
  'readonly observation captures the activated three-input source without authority or filesystem writes',
  async () => {
    const started = performance.now();
    const assertWithinBudget = () => {
      if (performance.now() - started > readonlyObservationCaseBudgetMs)
        throw new Error('Readonly observation case budget expired');
    };
    const root = await makeFreshRepository('consumer-config-observation-', { includeLocalInstructions: false });
    let passed = false;
    const files = (directory: string, prefix = ''): string[] =>
      readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
          const relative = prefix ? prefix + '/' + entry.name : entry.name;
          return entry.isDirectory() ? [relative, ...files(path.join(directory, entry.name), relative)] : [relative];
        })
        .sort();
    try {
      assertWithinBudget();
      const operationId = 'consumer-observation-001';
      await planProjectUpgradeRepair(root, {
        operation_id: operationId,
        actor: 'test-owner: configuration observation',
        instruction_ref: 'tests/consumer-configuration-admission.test.ts',
      });
      assertWithinBudget();
      const journal = path.join(root, '.vida/project-upgrade.v1.json');
      const beforeForeign = readFileSync(journal);
      await Promise.resolve(
        expect(resumeFreshProjectUpgrade(root, 'foreign-observation-001')).rejects.toThrow(
          'foreign operation or repository',
        ),
      );
      expect(readFileSync(journal)).toEqual(beforeForeign);
      assertWithinBudget();
      const completed = await resumeProjectUpgrade(root, operationId);
      assertWithinBudget();
      expect(completed.phase).toBe('completed');
      const authorized = loadRuntimeConfig(root);
      const before = files(root);
      const snapshot = readRuntimeConfigurationForObservation(root);
      expect(files(root)).toEqual(before);
      expect(snapshot.source).toBe(PROJECT_CONFIGURATION_PATHS.project);
      expect(snapshot.source_digest).toBe(capturedRuntimeConfigurationBinding(authorized).source_digest);
      expect(snapshot.config).toEqual(authorized);
      expect(snapshot.config).not.toBe(authorized);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.config)).toBe(true);
      expect(Object.isFrozen(snapshot.config.projects)).toBe(true);
      expect(Object.isFrozen(snapshot.config.projects[0])).toBe(true);
      expect(() => assertLoadedRuntimeConfig(snapshot.config, root)).toThrow();
      for (const relative of Object.values(PROJECT_CONFIGURATION_PATHS)) {
        const file = path.join(root, relative);
        const original = readFileSync(file);
        try {
          writeFileSync(file, Buffer.concat([original, Buffer.from('\n# drift\n')]));
          expect(() => readRuntimeConfigurationForObservation(root)).toThrow();
        } finally {
          writeFileSync(file, original);
        }
      }
      expect(readRuntimeConfigurationForObservation(root).source_digest).toBe(snapshot.source_digest);
      expect(files(root)).toEqual(before);
      assertWithinBudget();
      passed = true;
    } finally {
      console.error('Retained readonly configuration observation fixture: ' + root);
      if (passed) assertWithinBudget();
    }
  },
  readonlyObservationCaseBudgetMs,
);
