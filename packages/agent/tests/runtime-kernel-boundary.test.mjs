import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonDigest, computeWriteOperationHash } from '../src/contracts/public-ingress.ts';
import { issueHostGovernanceCapability } from '../src/governance/edictum-boundary.ts';
import { nativeNoFollowAvailable } from '../src/config/host-capability.ts';
import { loadProjectContext, loadProjectSetContext } from '../src/config/project-context.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import {
  assertRuntimeConfigUnchanged,
  compareRuntimeKernelRepositoryRoots,
  createRuntimeKernel,
  createRuntimeKernelHost,
  createRuntimeKernelHostProofForCompositionRoot,
  createRuntimeKernelHostWithProof,
  createTestTrustedHostLauncherCapability,
  createTrustedHostComposition,
  dispatchWorkflowAssignment,
  prepareWorkflowExecution,
  readStableRuntimeConfig,
} from '../src/runtime-kernel.ts';
const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? path.resolve(packageRoot, '..');
const config = loadRuntimeConfig(repositoryRoot);
const project = loadProjectContext(repositoryRoot, config, config.repository.repository_id, '3mob');
const hostProject = loadProjectSetContext(
  repositoryRoot,
  config,
  config.repository.repository_id,
  [...config.projects.map((entry) => entry.project_id)].sort(),
);
const authorityText = await readFile(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'), 'utf8');

async function createIsolatedRepositoryRoot() {
  const root = await mkdtemp(path.join(tmpdir(), 'agent-runtime-new-kernel-'));
  await mkdir(path.join(root, '.git'), { recursive: true });
  await mkdir(path.join(root, 'agent-runtime-new'), { recursive: true });
  await mkdir(path.join(root, '.agent/work'), { recursive: true });
  await mkdir(path.join(root, 'docs/tenants/crmbx/wiki/Projects/3Mob/Requirements'), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), authorityText, 'utf8'),
    writeFile(path.join(root, 'AGENTS.md'), '# isolated test policy\n', 'utf8'),
    writeFile(path.join(root, 'AGENT.sidecar.md'), '# isolated test sidecar\n', 'utf8'),
    writeFile(path.join(root, 'agent-runtime-new/PLAN.md'), '# isolated candidate plan\n', 'utf8'),
    writeFile(path.join(root, 'agent-runtime-new/TESTING.md'), '# isolated candidate testing\n', 'utf8'),
    writeFile(path.join(root, 'docs/tenants/crmbx/wiki/Projects/3Mob/Operations.md'), '# isolated map\n', 'utf8'),
    writeFile(
      path.join(root, 'docs/tenants/crmbx/wiki/Projects/3Mob/Requirements/Topics.md'),
      '# isolated index\n',
      'utf8',
    ),
  ]);
  return root;
}
function identity() {
  return {
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'principal-1',
    role: 'developer-orchestrator',
    tenant: project.integration_bindings.find((binding) => binding.project_id === '3mob').tenant_id,
    project: project.project_ids[0],
    registry_hash: project.registry_hash ?? project.config_digest,
  };
}

function evidence(overrides = {}) {
  const payload = { path: 'agent-runtime-new/runtime-kernel-boundary-' + randomUUID() + '.txt', value: 'updated' };
  const authorization = {
    principal: 'principal-1',
    role: 'developer-orchestrator',
    action: 'write',
    tenant: project.integration_bindings.find((binding) => binding.project_id === '3mob').tenant_id,
    project: project.project_ids[0],
    resourceTenant: project.integration_bindings.find((binding) => binding.project_id === '3mob').tenant_id,
    resourceProject: project.project_ids[0],
    registryHash: project.registry_hash ?? project.config_digest,
    ...overrides,
  };
  const operationHash = computeWriteOperationHash({
    operation: 'repository.write',
    payload,
    ...authorization,
  });
  const approvedAt = new Date(Date.now() + 10_000).toISOString();
  const approval = {
    decision: 'approved',
    decision_id: 'runtime-kernel-approval',
    approver: 'operator-1',
    tenant: authorization.tenant,
    project: authorization.project,
    operation_hash: operationHash,
    approved_at: approvedAt,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  const verifiedApproval = {
    ...approval,
    verified: true,
    issuer: 'test-authority',
    verification_id: 'runtime-kernel-verification',
    verified_at: approvedAt,
  };
  return {
    approval,
    verifiedApproval,
    input: {
      envelope: {
        schema: 'RuntimeEnvelope/v1',
        kind: 'governed-write',
        operation: 'runtime.write',
        sourceRevision: 'source-1',
        expectedRevision: 1,
        payload: { operation: 'repository.write' },
      },
      intent: {
        operation: 'repository.write',
        payload,
        authorization,
        approval,
      },
    },
  };
}

function hostBindings(overrides = {}) {
  return {
    repositoryRoot,
    repositoryId: config.repository.repository_id,
    projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
    integrationsDigest: hostProject.integrations_digest,
    resolveIdentity: () => identity(),
    verifyApproval: () => null,
    runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
    casWriter: () => ({ applied: true }),
    ...overrides,
  };
}

function host(overrides = {}) {
  return createRuntimeKernelHost(hostBindings(overrides));
}

function trustedHostCapability(input) {
  const governanceCapability = issueHostGovernanceCapability({
    workspaceId: 'f'.repeat(64),
    reserveOperation: () => null,
    inspectOperation: () => null,
    transitionOperation: () => undefined,
    consumeApproval: async () => undefined,
  });
  return createTestTrustedHostLauncherCapability({
    ...input,
    services: { governanceCapability, ...input.services },
  });
}

function composeTrustedHost(input) {
  return createTrustedHostComposition(trustedHostCapability(input));
}
describe('runtime kernel boundary', () => {
  test.skipIf(!nativeNoFollowAvailable)(
    'executes a fully trusted governed write and uses host timing bindings',
    async () => {
      const fixture = evidence();
      const events = [];
      const clock = { monotonicNs: () => 1_000_000n };
      let identityCalls = 0;
      let approvalCalls = 0;
      let writeCalls = 0;
      const kernel = await createRuntimeKernel(
        repositoryRoot,
        host({
          resolveIdentity: () => {
            identityCalls += 1;
            return identity();
          },
          verifyApproval: () => {
            approvalCalls += 1;
            return fixture.verifiedApproval;
          },
          casWriter: (request) => {
            writeCalls += 1;
            return { applied: true, path: request.payload.path };
          },
          clock,
          timingSink: { record: (event) => events.push(event) },
        }),
      );

      await expect(kernel.runGovernedWrite(fixture.input)).resolves.toEqual({
        applied: true,
        path: fixture.input.intent.payload.path,
      });
      expect(identityCalls).toBe(1);
      expect(approvalCalls).toBe(1);
      expect(writeCalls).toBe(1);
      const reservationPath = path.join(
        repositoryRoot,
        config.control.work_root,
        'runtime-reservations',
        createHash('sha256').update(fixture.approval.operation_hash).digest('hex') + '.json',
      );
      const terminalPath = reservationPath + '.final';
      try {
        const reservation = JSON.parse(await readFile(terminalPath, 'utf8'));
        expect(reservation.status).toBe('applied');
      } finally {
        await Promise.all([
          rm(reservationPath, { force: true }),
          rm(reservationPath + '.terminal', { force: true }),
          rm(terminalPath, { force: true }),
        ]);
      }
      expect(events.some((event) => event.operation === 'createRuntimeKernel')).toBe(true);
      await expect(kernel.readConfig()).resolves.toMatchObject({ schema: 'AgentRuntimeConfig/v1' });
      await expect(kernel.readProjectContext()).resolves.toMatchObject({ project_ids: project.project_ids });
      await expect(kernel.evaluateGovernance('runtime.read', {})).resolves.toMatchObject({ decision: 'allow' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      const operations = events.map((event) => event.operation);
      expect(operations).toEqual(
        expect.arrayContaining([
          'createRuntimeKernel',
          'runGovernedWrite',
          'readConfig',
          'readProjectContext',
          'evaluateGovernance',
        ]),
      );
      expect(events.find((event) => event.operation === 'runGovernedWrite')).toMatchObject({
        started_at_ns: '1000000',
      });
    },
  );
  test('trusted host composition binds authenticated context before exposing capabilities', async () => {
    let serviceCalls = 0;
    const input = {
      authentication: {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot,
        repositoryId: config.repository.repository_id,
        projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
        integrationsDigest: hostProject.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.read'],
      },
      services: {
        resolveIdentity: () => {
          serviceCalls += 1;
          return identity();
        },
        verifyApproval: () => {
          serviceCalls += 1;
          return null;
        },
        runtimeRevision: () => {
          serviceCalls += 1;
          return { sourceRevision: 'source-1', currentRevision: 1 };
        },
        casWriter: () => {
          serviceCalls += 1;
          return { applied: true };
        },
      },
    };
    await expect(createTrustedHostComposition(input)).rejects.toThrow(/launcher capability is required/);
    if (!nativeNoFollowAvailable) {
      const composition = await composeTrustedHost(input);
      expect(composition.schema).toBe('TrustedHostComposition/v1');
      expect(serviceCalls).toBe(0);
      return;
    }
    const composition = await composeTrustedHost(input);
    expect(composition.schema).toBe('TrustedHostComposition/v1');
    expect(composition.authentication).toMatchObject({
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: hostProject.integrations_digest,
      principal: 'principal-1',
      configRevision: config.config_revision,
    });
    expect(composition.authentication.permittedOperations).toEqual(['runtime.read']);
    expect(composition.runtimeKernel).toBeDefined();
    expect(composition.workflowHostCapability).toBeNull();
    await expect(composition.runtimeKernel.evaluateGovernance('runtime.write', {})).rejects.toThrow(
      'trusted host operation is not permitted: runtime.write',
    );
    await expect(composition.runtimeKernel.runGovernedWrite({})).rejects.toThrow(
      'trusted host operation is not permitted: runtime.write',
    );
    expect(serviceCalls).toBe(0);
  });
  test('trusted host composition reaches a governed write through bound services', async () => {
    const fixture = evidence();
    let identityCalls = 0;
    let approvalCalls = 0;
    let writeCalls = 0;
    const input = {
      authentication: {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot,
        repositoryId: config.repository.repository_id,
        projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
        integrationsDigest: hostProject.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.write'],
      },
      services: {
        resolveIdentity: () => {
          identityCalls += 1;
          return identity();
        },
        verifyApproval: () => {
          approvalCalls += 1;
          return fixture.verifiedApproval;
        },
        runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
        casWriter: (request) => {
          writeCalls += 1;
          return { applied: true, path: request.payload.path };
        },
      },
    };
    const reservationPath = path.join(
      repositoryRoot,
      config.control.work_root,
      'runtime-reservations',
      createHash('sha256').update(fixture.approval.operation_hash).digest('hex') + '.json',
    );
    try {
      if (!nativeNoFollowAvailable) {
        const composition = await composeTrustedHost(input);
        expect(composition.schema).toBe('TrustedHostComposition/v1');
        return;
      }
      const composition = await composeTrustedHost(input);
      await expect(composition.runtimeKernel.runGovernedWrite(fixture.input)).resolves.toEqual({
        applied: true,
        path: fixture.input.intent.payload.path,
      });
      expect(identityCalls).toBe(1);
      expect(approvalCalls).toBe(1);
      expect(writeCalls).toBe(1);
    } finally {
      await Promise.all([
        rm(reservationPath, { force: true }),
        rm(reservationPath + '.terminal', { force: true }),
        rm(reservationPath + '.final', { force: true }),
      ]);
    }
  });
  test('trusted launcher capability snapshots context and consumes only after success', async () => {
    const mutableAuthentication = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: hostProject.integrations_digest,
      principal: 'principal-1',
      configRevision: config.config_revision,
      permittedOperations: ['runtime.read'],
    };
    const originalResolver = () => null;
    const mutableServices = {
      resolveIdentity: originalResolver,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
      casWriter: () => ({ applied: true }),
    };
    const capability = trustedHostCapability({ authentication: mutableAuthentication, services: mutableServices });
    mutableAuthentication.principal = 'mutated-principal';
    mutableAuthentication.permittedOperations.push('runtime.write');
    mutableServices.resolveIdentity = () => {
      throw new Error('mutated service must not be captured');
    };
    if (!nativeNoFollowAvailable) {
      const composition = await createTrustedHostComposition(capability);
      expect(composition.authentication.principal).toBe('principal-1');
      return;
    }
    const composition = await createTrustedHostComposition(capability);
    expect(composition.authentication.principal).toBe('principal-1');
    expect(composition.authentication.permittedOperations).toEqual(['runtime.read']);
    await expect(createTrustedHostComposition(capability)).rejects.toThrow(/launcher capability/);
  });
  test('derives workflow store namespaces from authenticated context', async () => {
    if (!nativeNoFollowAvailable) return;
    const root = await createIsolatedRepositoryRoot();
    try {
      const isolatedConfig = loadRuntimeConfig(root);
      const baseInput = {
        authentication: {
          schema: 'TrustedHostAuthentication/v1',
          repositoryRoot: root,
          repositoryId: isolatedConfig.repository.repository_id,
          projectIds: ['3mob'],
          integrationsDigest: canonicalJsonDigest(isolatedConfig.integrations.providers[0]),
          principal: 'principal-1',
          configRevision: isolatedConfig.config_revision,
          permittedOperations: ['workflow'],
        },
        services: {
          resolveIdentity: () => null,
          verifyApproval: () => null,
          runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
          casWriter: () => ({ applied: true }),
        },
      };
      const first = await createTrustedHostComposition(
        trustedHostCapability({ ...baseInput, workflowStoreId: 'caller-store-a' }),
      );
      const second = await createTrustedHostComposition(
        trustedHostCapability({ ...baseInput, workflowStoreId: 'caller-store-b' }),
      );
      expect(first.workflowHostCapability?.storeId).toMatch(/^trusted-[a-f0-9]{32}$/);
      expect(second.workflowHostCapability?.storeId).toBe(first.workflowHostCapability?.storeId);
      expect(first.workflowHostCapability?.storeId).not.toBe('caller-store-a');
      expect(second.workflowHostCapability?.storeId).not.toBe('caller-store-b');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'trusted host rejects stale configuration before invoking authenticated services',
    async () => {
      let serviceCalls = 0;
      const services = {
        resolveIdentity: () => {
          serviceCalls += 1;
          return identity();
        },
        verifyApproval: () => {
          serviceCalls += 1;
          return null;
        },
        runtimeRevision: () => {
          serviceCalls += 1;
          return { sourceRevision: 'source-1', currentRevision: 1 };
        },
        casWriter: () => {
          serviceCalls += 1;
          return { applied: true };
        },
      };

      await expect(
        composeTrustedHost({
          authentication: {
            schema: 'TrustedHostAuthentication/v1',
            repositoryRoot,
            repositoryId: config.repository.repository_id,
            projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
            integrationsDigest: hostProject.integrations_digest,
            principal: 'principal-1',
            configRevision: config.config_revision + 1,
            permittedOperations: ['runtime.read'],
          },
          services,
        }),
      ).rejects.toThrow(/stale|forged/);
      expect(serviceCalls).toBe(0);
    },
  );
  test.skipIf(!nativeNoFollowAvailable)('trusted host rejects wrong repository and project contexts', async () => {
    let serviceCalls = 0;
    const services = {
      resolveIdentity: () => {
        serviceCalls += 1;
        return identity();
      },
      verifyApproval: () => {
        serviceCalls += 1;
        return null;
      },
      runtimeRevision: () => {
        serviceCalls += 1;
        return { sourceRevision: 'source-1', currentRevision: 1 };
      },
      casWriter: () => {
        serviceCalls += 1;
        return { applied: true };
      },
    };
    for (const authentication of [
      {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot: path.join(repositoryRoot, 'not-a-repository'),
        repositoryId: config.repository.repository_id,
        projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
        integrationsDigest: hostProject.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.read'],
      },
      {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot,
        repositoryId: config.repository.repository_id,
        projectIds: ['not-configured'],
        integrationsDigest: hostProject.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.read'],
      },
      {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot,
        repositoryId: 'not-configured',
        projectIds: [project.project_id],
        integrationsDigest: project.integrations_digest,
        principal: 'principal-1',
        configRevision: config.config_revision,
        permittedOperations: ['runtime.read'],
      },
    ]) {
      await expect(composeTrustedHost({ authentication, services })).rejects.toThrow(
        /configured|config|repository|root/i,
      );
    }
    expect(serviceCalls).toBe(0);
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'does not resolve identity when the governed intent is outside the project scope',
    async () => {
      for (const overrides of [
        { tenant: 'other-tenant', resourceTenant: 'other-tenant' },
        { project: 'other-project', resourceProject: 'other-project' },
      ]) {
        const fixture = evidence(overrides);
        let identityCalls = 0;
        let approvalCalls = 0;
        let writeCalls = 0;
        const kernel = await createRuntimeKernel(
          repositoryRoot,
          host({
            resolveIdentity: () => {
              identityCalls += 1;
              return identity();
            },
            verifyApproval: () => {
              approvalCalls += 1;
              return fixture.verifiedApproval;
            },
            casWriter: () => {
              writeCalls += 1;
              return { applied: true };
            },
          }),
        );

        await expect(kernel.runGovernedWrite(fixture.input)).rejects.toThrow();
        expect(identityCalls).toBe(0);
        expect(approvalCalls).toBe(0);
        expect(writeCalls).toBe(0);
      }
    },
  );

  test.skipIf(!nativeNoFollowAvailable)(
    'rejects null and malformed trusted identities before approval verification',
    async () => {
      const fixture = evidence();
      const invalidIdentities = [
        null,
        { ...identity(), schema: 'TrustedProjectIdentity/v2' },
        { ...identity(), source: 'untrusted-context' },
        { ...identity(), tenant: 'other-tenant' },
        { ...identity(), project: 'other-project' },
        { ...identity(), registry_hash: 'b'.repeat(64) },
      ];

      for (const invalidIdentity of invalidIdentities) {
        let approvalCalls = 0;
        let writeCalls = 0;
        const kernel = await createRuntimeKernel(
          repositoryRoot,
          host({
            resolveIdentity: () => invalidIdentity,
            verifyApproval: () => {
              approvalCalls += 1;
              return fixture.verifiedApproval;
            },
            casWriter: () => {
              writeCalls += 1;
              return { applied: true };
            },
          }),
        );
        await expect(kernel.runGovernedWrite(fixture.input)).rejects.toThrow();
        expect(approvalCalls).toBe(0);
        expect(writeCalls).toBe(0);
      }
    },
  );

  test('keeps required host-field errors at their validation boundary', () => {
    const base = {
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: hostProject.integrations_digest,
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
      casWriter: () => null,
    };
    for (const [field, message, invalid] of [
      ['repositoryRoot', 'runtime kernel host repository root is required'],
      ['repositoryId', 'runtime kernel host repository id is required'],
      ['projectIds', 'runtime kernel host project ids are required', []],
      ['integrationsDigest', 'runtime kernel host integrations digest is required'],
    ]) {
      const value = invalid === undefined ? '' : invalid;
      expect(() => createRuntimeKernelHost({ ...base, [field]: value })).toThrow(message);
      if (typeof value === 'string')
        expect(() => createRuntimeKernelHost({ ...base, [field]: '   ' })).toThrow(message);
    }
    expect(() => createRuntimeKernelHost(null)).toThrow('runtime kernel host bindings are required');
    expect(() => createRuntimeKernelHost(0)).toThrow('runtime kernel host bindings are required');
  });
  test('rejects malformed host callbacks before creating a trusted host', () => {
    const base = hostBindings();
    for (const [field, message] of [
      ['resolveIdentity', 'runtime kernel host identity resolver is required'],
      ['verifyApproval', 'runtime kernel host approval verifier is required'],
      ['runtimeRevision', 'runtime kernel host revision provider is required'],
      ['casWriter', 'runtime kernel host CAS writer is required'],
    ]) {
      expect(() => createRuntimeKernelHost({ ...base, [field]: undefined })).toThrow(message);
    }
  });
  test('rejects a non-absolute host repository root before creating a trusted host', () => {
    expect(() => createRuntimeKernelHost({ ...hostBindings(), repositoryRoot: 'relative-root' })).toThrow(
      /absolute repository root|GAP-RTNEW-PATH-PROFILE-001/i,
    );
  });

  test('compares canonical host roots using the active platform semantics', () => {
    const caseVariant = repositoryRoot.toUpperCase();
    if (process.platform === 'win32') {
      expect(compareRuntimeKernelRepositoryRoots(caseVariant, repositoryRoot)).toBe(true);
    }

    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    try {
      expect(compareRuntimeKernelRepositoryRoots(repositoryRoot, repositoryRoot)).toBe(true);
      expect(compareRuntimeKernelRepositoryRoots(caseVariant, repositoryRoot)).toBe(caseVariant === repositoryRoot);
    } finally {
      Object.defineProperty(process, 'platform', descriptor);
    }
  });

  test('rejects stale runtime configuration snapshots', () => {
    const digest = runtimeConfigDigest(config);
    expect(() => assertRuntimeConfigUnchanged(config, digest)).not.toThrow();
    const changed = { ...config, control: { ...config.control, work_root: config.control.work_root + '-changed' } };
    expect(() => assertRuntimeConfigUnchanged(changed, digest)).toThrow(
      'runtime configuration changed after composition',
    );
    expect(() => readStableRuntimeConfig(repositoryRoot, '0'.repeat(64))).toThrow(
      'runtime configuration changed after composition',
    );
  });
  test.skipIf(!nativeNoFollowAvailable)(
    'rechecks the composed configuration before governance evaluation',
    async () => {
      const root = await createIsolatedRepositoryRoot();
      try {
        const isolatedConfig = loadRuntimeConfig(root);
        const isolatedProject = loadProjectContext(
          root,
          isolatedConfig,
          isolatedConfig.repository.repository_id,
          '3mob',
        );
        const isolatedHost = createRuntimeKernelHost({
          repositoryRoot: root,
          repositoryId: isolatedConfig.repository.repository_id,
          projectIds: [isolatedProject.project_ids[0]],
          integrationsDigest: isolatedProject.integrations_digest,
          resolveIdentity: () => null,
          verifyApproval: () => null,
          runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
          casWriter: () => ({ applied: true }),
        });
        const kernel = await createRuntimeKernel(root, isolatedHost);
        await writeFile(
          path.join(root, 'agent-runtime.config.v1.yaml'),
          authorityText.replace(
            /config_revision: (\d+)/,
            (_match, revision) => 'config_revision: ' + (Number(revision) + 1),
          ),
          'utf8',
        );
        await expect(kernel.evaluateGovernance('runtime.read', {})).rejects.toThrow(
          'runtime configuration changed after composition',
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
  test('composition-root authentication proofs are single-use', () => {
    const proof = createRuntimeKernelHostProofForCompositionRoot(hostBindings());
    expect(() => createRuntimeKernelHostWithProof(proof)).not.toThrow();
    expect(() => createRuntimeKernelHostWithProof(proof)).toThrow(/authentication proof/);
  });
  test('rejects malformed composition proofs before exposing a host', () => {
    for (const candidate of [null, {}, Object.freeze({ schema: 'RuntimeKernelHostProof/v1' })]) {
      expect(() => createRuntimeKernelHostWithProof(candidate)).toThrow(/authentication proof/);
    }
  });
  test('rejects structurally copied composition proofs while accepting the original identity', () => {
    const proof = createRuntimeKernelHostProofForCompositionRoot(hostBindings());
    const copiedProof = Object.freeze({ ...proof });

    expect(() => createRuntimeKernelHostWithProof(copiedProof)).toThrow(/authentication proof/);
    expect(() => createRuntimeKernelHostWithProof(proof)).not.toThrow();
  });
  test('rejects forged trusted-host authentication before any service callback', () => {
    const callbacks = {
      resolveIdentity: () => {
        throw new Error('identity callback must not run');
      },
      verifyApproval: () => {
        throw new Error('approval callback must not run');
      },
      runtimeRevision: () => {
        throw new Error('revision callback must not run');
      },
      casWriter: () => {
        throw new Error('CAS callback must not run');
      },
    };
    const valid = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: hostProject.integrations_digest,
      principal: 'principal-1',
      configRevision: config.config_revision,
      permittedOperations: ['runtime.read'],
    };
    for (const authentication of [
      { ...valid, schema: 'TrustedHostAuthentication/v2' },
      { ...valid, repositoryRoot: '' },
      { ...valid, repositoryId: '' },
      { ...valid, projectIds: [] },
      { ...valid, integrationsDigest: '' },
      { ...valid, principal: '' },
      { ...valid, configRevision: 0 },
      { ...valid, configRevision: 1.5 },
      { ...valid, permittedOperations: ['runtime.read', 'runtime.read'] },
      { ...valid, permittedOperations: ['runtime.admin'] },
    ]) {
      expect(() => trustedHostCapability({ authentication, services: callbacks })).toThrow(
        /schema|repository|tenant|project|integration|principal|config revision|permitted operations/i,
      );
    }
  });
  test('rejects stale trusted-host configuration before loading project services', async () => {
    let serviceCalls = 0;
    const services = {
      resolveIdentity: () => {
        serviceCalls += 1;
        return identity();
      },
      verifyApproval: () => {
        serviceCalls += 1;
        return null;
      },
      runtimeRevision: () => {
        serviceCalls += 1;
        return { sourceRevision: 'source-1', currentRevision: 1 };
      },
      casWriter: () => {
        serviceCalls += 1;
        return { applied: true };
      },
    };
    const authentication = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: hostProject.integrations_digest,
      principal: 'principal-1',
      configRevision: config.config_revision + 1,
      permittedOperations: ['runtime.read'],
    };
    await expect(createTrustedHostComposition(trustedHostCapability({ authentication, services }))).rejects.toThrow(
      /configuration revision is stale or forged/i,
    );
    expect(serviceCalls).toBe(0);
  });
  test('test-only composition proof issuer refuses production mode', () => {
    const previousNodeEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => createRuntimeKernelHostProofForCompositionRoot(hostBindings())).toThrow(
        /test-only trusted host issuer is unavailable outside a test process/,
      );
    } finally {
      if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnvironment;
    }
  });
  test('rejects forged workflow capabilities before inspecting requests', async () => {
    let inspected = false;
    const request = new Proxy(
      {},
      {
        ownKeys() {
          inspected = true;
          return [];
        },
        get() {
          inspected = true;
          return undefined;
        },
      },
    );
    await expect(prepareWorkflowExecution({}, request)).rejects.toThrow(/opaque host capability/);
    await expect(dispatchWorkflowAssignment(Object.create(null), request)).rejects.toThrow(/opaque host capability/);
    expect(inspected).toBe(false);
  });
});
