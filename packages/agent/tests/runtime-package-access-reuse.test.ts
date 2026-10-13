import { expect, spyOn, test, type Mock } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import * as runtimeConfig from '../src/config/runtime-config.js';
import * as safeRepositoryAccess from '../src/config/safe-repository-access.js';
import { assertAdmittedRuntimeCodeCurrent } from '../src/orchestration/admitted-session-execution.js';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.js';
import { admitLocalSessionWork } from '../src/orchestration/local-work-admission.js';
import { MastraSessionBridge } from '../src/orchestration/mastra-session-bridge.js';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.js';
import { run } from '../bin/run.js';
import { bindControlledRuntimeInitialization } from './helpers/controlled-runtime-initialization-fixture.js';
import { createAutomaticWorkAdmissionFixture } from './helpers/automatic-work-admission-fixture.js';
import { expectRejection } from './helpers/expect-rejection.ts';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';

test('runtime package paths reuse the owned access and preserve live inventory parity', () => {
  const access = runtimeConfig.runtimePackageAccess();
  const expected = runtimeExecutableInventory(access.repository_root, 'source').map(
    (file) => 'runtime-package/' + file,
  );
  let accessCalls = 0;
  const observedAccess = {
    ...access,
    fileExists(target: string, label: string): boolean {
      accessCalls += 1;
      return access.fileExists(target, label);
    },
    listFiles(target: string, label: string): readonly string[] {
      accessCalls += 1;
      return access.listFiles(target, label);
    },
    readBytes(target: string, label: string): Buffer {
      accessCalls += 1;
      return access.readBytes(target, label);
    },
  };

  expect(runtimeConfig.runtimePackageCodePaths('runtime-package', observedAccess)).toEqual(expected);
  expect(expected).toContain('runtime-package/bin/cli-metadata.ts');
  expect(expected).not.toContain('runtime-package/bin/cli-metadata.mjs');
  expect(expected).toContain('runtime-package/tooling/maintained-source-inventory.ts');
  expect(expected).not.toContain('runtime-package/tooling/maintained-source-inventory.mjs');
  // Discovery retains the original scanner; consumers live-read bytes through the owned access.
  expect(accessCalls).toBe(0);
});

test('runtime package paths reject a wrong root before calling its access methods', () => {
  const unrelatedRoot = mkdtempSync(path.join(tmpdir(), 'runtime-package-access-reuse-'));
  try {
    const safeAccess = safeRepositoryAccess.requireSafeRepositoryAccess(unrelatedRoot);
    let accessReads = 0;
    const countedAccess = {
      ...safeAccess,
      fileExists(target: string, label: string): boolean {
        accessReads += 1;
        return safeAccess.fileExists(target, label);
      },
      listFiles(target: string, label: string): readonly string[] {
        accessReads += 1;
        return safeAccess.listFiles(target, label);
      },
      readBytes(target: string, label: string): Buffer {
        accessReads += 1;
        return safeAccess.readBytes(target, label);
      },
    };

    expect(() => runtimeConfig.runtimePackageCodePaths('runtime-package', countedAccess)).toThrow(
      'runtime package access root differs',
    );
    expect(accessReads).toBe(0);
  } finally {
    rmSync(unrelatedRoot, { recursive: true, force: true });
  }
});

test('one admission operation reuses its checked runtime package access for inventory and Source reads', () => {
  const fixture = createAutomaticWorkAdmissionFixture(false, true);
  let accessSpy: Mock<typeof safeRepositoryAccess.requireSafeRepositoryAccess> | undefined;
  try {
    const input = fixture.prepare('runtime-access-reuse', 'user:runtime-access-reuse');
    input.intakePath = '.agent/work/runtime-access-reuse/raw-intake.json';
    writeFileSync(
      path.join(fixture.root, input.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    const packageRoot = path.resolve(import.meta.dirname, '..');
    const packageAccesses: string[] = [];
    const original = safeRepositoryAccess.requireSafeRepositoryAccess;
    accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((root) => {
      if (path.resolve(root) === packageRoot) packageAccesses.push(root);
      return original(root);
    });
    const admitted = fixture.admit(input);
    expect(packageAccesses).toHaveLength(1);
    const work = admitted.host.work;
    if (!work) throw new Error('admitted fixture has no work');
    const identity = {
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: input.context.work_id,
    };

    assertAdmittedRuntimeCodeCurrent(fixture.root, fixture.store, identity);
    expect(packageAccesses).toHaveLength(2);
  } finally {
    accessSpy?.mockRestore();
    fixture.close();
  }
});

test('renew lease rejects malformed UTF-8 in its package scope schema before touching project state', async () => {
  const fixture = createAutomaticWorkAdmissionFixture(false, true);
  let accessSpy: Mock<typeof runtimeConfig.runtimePackageAccess> | undefined;
  let contextSpy: Mock<typeof import('../src/config/project-context.js').loadProjectSetContext> | undefined;
  let success = false;
  const nativeAccess = runtimeConfig.runtimePackageAccess();
  const originalReadBytes = nativeAccess.readBytes;
  const originalVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
  const malformedSchema = Buffer.from(
    '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","$comment":"bad-valid"}',
  );
  const malformedMarker = Buffer.from('bad-valid');
  malformedSchema[malformedSchema.indexOf(malformedMarker) + 4] = 0xff;
  let rawReads = 0;
  let verifiedReads = 0;
  let contextCallsAtSchema: number | undefined;
  try {
    const input = fixture.prepare('renew-schema-test', 'user:renew-schema-test', 'fixture-session');
    input.intakePath = '.agent/work/renew-schema-test/raw-intake.json';
    writeFileSync(
      path.join(fixture.root, input.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    const admitted = fixture.admit(input);
    await bindControlledRuntimeInitialization(fixture.root, fixture.config, fixture.store);
    const work = admitted.host.work;
    if (!work) throw new Error('admitted fixture has no work');
    const before = snapshotFixtureDatabase(fixture.database);
    accessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => ({
      ...nativeAccess,
      readBytes(target: string, label: string): Buffer {
        if (target === 'schemas/implementation-scope.v1.schema.json' && label === 'renew scope schema') {
          rawReads += 1;
          return Buffer.from(malformedSchema);
        }
        return originalReadBytes.call(nativeAccess, target, label);
      },
      readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
        if (target === 'schemas/implementation-scope.v1.schema.json' && label === 'renew scope schema') {
          verifiedReads += 1;
          contextCallsAtSchema = contextSpy?.mock.calls.length;
          return Buffer.from(malformedSchema);
        }
        if (originalVerifiedRead) return originalVerifiedRead.call(nativeAccess, target, label, maxBytes);
        return originalReadBytes.call(nativeAccess, target, label);
      },
    }));
    const projectContext = await import('../src/config/project-context.js');
    contextSpy = spyOn(projectContext, 'loadProjectSetContext');

    await expectRejection(
      run([
        '--project-root',
        fixture.root,
        '--repository',
        fixture.config.repository.repository_id,
        '--project',
        fixture.config.projects[0]!.project_id,
        '--work-path',
        'AGENT.sidecar.md',
        '--work-id',
        input.context.work_id,
        '--attempt',
        '1',
        '--scope-digest',
        fixture.source.digest,
        '--team',
        'default-development',
        '--kind',
        'research',
        '--intent',
        'information_research',
        '--workflow',
        'information_research_light',
        '--renew-lease',
        'true',
        '--native-session-handle',
        input.nativeSessionHandle,
        '--lease-generation',
        '1',
        '--expected-revision',
        '1',
        '--expected-digest',
        'a'.repeat(64),
      ]),
      /encoded data was not valid for encoding utf-8/i,
    );
    expect(verifiedReads).toBe(1);
    expect(rawReads).toBe(0);
    if (contextCallsAtSchema === undefined) throw new Error('Renewal schema boundary was not observed.');
    expect(contextSpy.mock.calls.length).toBe(contextCallsAtSchema);
    expect(snapshotFixtureDatabase(fixture.database)).toEqual(before);
    // Sanity check the expected reader boundary independently of permissive Buffer decoding.
    expect(() => new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from([0xff]))).toThrow();
    success = true;
  } finally {
    contextSpy?.mockRestore();
    accessSpy?.mockRestore();
    fixture.close({ retainRoot: !success });
  }
});

test.skipIf(process.platform !== 'linux' || !safeRepositoryAccess.safeRepositoryProviderAvailable)(
  'renew lease reads its late package schema through verified bytes and retains the admitted Source binding',
  async () => {
    const deadlineAt = performance.now() + 5_000;
    const fixture = createAutomaticWorkAdmissionFixture(false, true);
    let bridge: MastraSessionBridge | undefined;
    let accessSpy: Mock<typeof runtimeConfig.runtimePackageAccess> | undefined;
    let success = false;
    let bodyError: unknown;
    const cleanupErrors: unknown[] = [];
    const nativeAccess = runtimeConfig.runtimePackageAccess();
    const originalReadBytes = nativeAccess.readBytes;
    const originalVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
    let rawReads = 0;
    const verifiedSchemaReads: Buffer[] = [];
    try {
      if (!originalVerifiedRead) throw new Error('Lease renewal requires the native verified package-byte reader');
      const input = fixture.prepare('renew-runtime-schema-test', 'user:renew-runtime-schema-test', 'fixture-session');
      input.runtimeCodePaths = runtimeConfig.runtimePackageCodePaths(fixture.config.runtime.bundle);
      input.intakePath = '.agent/work/renew-runtime-schema-test/raw-intake.json';
      writeFileSync(
        path.join(fixture.root, input.intakePath),
        JSON.stringify({
          schema: 'VidaLocalSessionIntake/v1',
          work_item: input.workItem,
          native_session_handle: input.nativeSessionHandle,
          scope_path: input.scopePath,
          acceptance_path: input.acceptancePath,
          runtime_code_paths: input.runtimeCodePaths,
          route: input.route,
          risk: input.risk,
          change_kind: input.changeKind,
        }),
      );
      const admitted = admitLocalSessionWork(input);
      await bindControlledRuntimeInitialization(fixture.root, fixture.config, fixture.store);
      const ledgerOwner = new MastraSessionLedger(
        fixture.database,
        fixture.store.workspaceId,
        fixture.config,
        fixture.root,
        fixture.store,
      );
      bridge = await MastraSessionBridge.open({
        repositoryRoot: fixture.root,
        config: fixture.config,
        ledger: ledgerOwner,
        projectIds: [input.selection.project],
        selection: input.selection,
        context: input.context,
        workflowId: 'information_research_light',
        workspaceId: fixture.store.workspaceId,
      });
      await bridge.start(admitted.source);
      const initial = admitted.host.work;
      if (!initial) throw new Error('admitted fixture has no work');
      const identity = {
        repository_id: initial.binding.repository_id,
        project_ids: initial.binding.project_ids,
        integrations_digest: initial.binding.integrations_digest,
        work_id: input.context.work_id,
      };
      const before = fixture.store.readHostStateSnapshot(identity),
        journal = fixture.store.readWorkSessionJournal(identity),
        work = before.work,
        ledger = before.ledger;
      if (!work?.lease || !before.workVersion || !before.ledgerVersion || !journal || !ledger)
        throw new Error('Renewal fixture has no current lease, Host CAS versions, or journal version');
      const ticketBefore = ledger.tickets.find((ticket) => ticket.ticket_id === work.lease!.ticket_id),
        claimBefore = ledger.claims.find(
          (claim) => claim.ticket_id === work.lease!.ticket_id && claim.status === 'active',
        );
      if (!ticketBefore || !claimBefore) throw new Error('Renewal fixture has no current ticket and active claim');
      const sourceBefore = snapshotDeclaredSources(safeRepositoryAccess.requireSafeRepositoryAccess(fixture.root), [
        'AGENT.sidecar.md',
      ]);

      accessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => ({
        ...nativeAccess,
        readBytes(target: string, label: string): Buffer {
          if (target === 'schemas/agent-runtime-config.v1.schema.json' && label === 'lease renewal schema')
            rawReads += 1;
          return originalReadBytes.call(nativeAccess, target, label);
        },
        readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
          const bytes = originalVerifiedRead.call(nativeAccess, target, label, maxBytes);
          if (target === 'schemas/agent-runtime-config.v1.schema.json' && label === 'lease renewal schema')
            verifiedSchemaReads.push(Buffer.from(bytes));
          return bytes;
        },
      }));
      const result = await run([
        '--project-root',
        fixture.root,
        '--repository',
        fixture.config.repository.repository_id,
        '--project',
        fixture.config.projects[0]!.project_id,
        '--work-path',
        'AGENT.sidecar.md',
        '--work-id',
        input.context.work_id,
        '--attempt',
        '1',
        '--scope-digest',
        fixture.source.digest,
        '--team',
        'default-development',
        '--kind',
        'research',
        '--intent',
        'information_research',
        '--workflow',
        'information_research_light',
        '--renew-lease',
        'true',
        '--native-session-handle',
        input.nativeSessionHandle,
        '--lease-generation',
        String(work.lease.generation),
        '--expected-revision',
        String(journal.version.revision),
        '--expected-digest',
        journal.version.digest,
      ]);

      if (typeof result !== 'object' || result === null || !('status' in result))
        throw new Error('Renewal returned no inspectable status');
      expect(result.status).toBe('inspected');
      expect(verifiedSchemaReads).toHaveLength(1);
      const verifiedSchemaBytes = verifiedSchemaReads[0];
      if (!verifiedSchemaBytes) throw new Error('Late renewal schema bytes were not observed');
      expect(createHash('sha256').update(verifiedSchemaBytes).digest('hex')).toBe(work.binding.schema_digest);
      expect(rawReads).toBe(0);
      const after = fixture.store.readHostStateSnapshot(identity),
        renewed = after.work?.lease,
        renewedTicket = after.ledger?.tickets.find((ticket) => ticket.ticket_id === work.lease!.ticket_id),
        renewedClaim = after.ledger?.claims.find(
          (claim) => claim.ticket_id === work.lease!.ticket_id && claim.status === 'active',
        );
      expect(renewed).toEqual(work.lease);
      if (!renewedTicket?.expires_at || !renewedClaim) throw new Error('Renewal has no ticket expiry or active claim');
      expect(renewedClaim.lease_expires_at).toBe(renewedTicket.expires_at);
      expect(Date.parse(renewedTicket?.expires_at ?? '')).toBeGreaterThan(Date.parse(ticketBefore.expires_at ?? ''));
      expect(Date.parse(renewedClaim?.lease_expires_at ?? '')).toBeGreaterThan(
        Date.parse(claimBefore.lease_expires_at),
      );
      expect(after.work?.binding).toEqual(work.binding);
      expect(after.workVersion?.revision).toBeGreaterThan(before.workVersion.revision);
      expect(after.ledgerVersion?.revision).toBeGreaterThan(before.ledgerVersion.revision);
      const renewedJournal = fixture.store.readWorkSessionJournal(identity);
      expect(renewedJournal?.state).toEqual(journal.state);
      expect(renewedJournal?.version).toEqual({ ...journal.version, revision: journal.version.revision + 1 });
      expect(
        snapshotDeclaredSources(safeRepositoryAccess.requireSafeRepositoryAccess(fixture.root), ['AGENT.sidecar.md']),
      ).toEqual(sourceBefore);
      success = true;
    } catch (error) {
      bodyError = error;
    } finally {
      accessSpy?.mockRestore();
      try {
        await bridge?.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        fixture.close({ retainRoot: !success || cleanupErrors.length > 0 || performance.now() >= deadlineAt });
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0)
      throw new AggregateError(
        success ? cleanupErrors : [bodyError, ...cleanupErrors],
        'Renewal fixture cleanup failed',
      );
    if (!success) throw bodyError;
  },
);

function snapshotFixtureDatabase(
  database: ReturnType<typeof createAutomaticWorkAdmissionFixture>['database'],
): unknown {
  const tables = database
    .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all();
  return tables.map(({ name }) => ({
    name,
    rows: database.query(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all(),
  }));
}
