import { expectReturned, rejectionReason } from './helpers/expect-rejection.ts';
import { createGovernedEvidenceFixture } from './helpers/governed-evidence-fixture.ts';
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { computeWriteOperationHash, type TrustedProjectIdentity } from '../src/contracts/public-ingress.ts';
import { configuredTestContext } from './configured-context.ts';
import { defaultRuntimeClock, type RuntimeTimingEvent } from '../src/runtime-timing.ts';
import { createRuntimeKernel, createRuntimeKernelHost } from '../src/runtime-kernel.ts';
import type { RuntimeKernelHostBindings } from '../src/runtime-kernel.ts';
import { nativeNoFollowAvailable } from '../src/config/host-capability.ts';

import { HostStateStore } from '../src/host-state.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';

const packageRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Expected ${label}.`);
  return value;
}

function invokeUntrusted(
  target: (...args: never[]) => unknown,
  ...invocation: [readonly unknown[]] | [unknown, readonly unknown[]]
): unknown {
  const [receiver, args] = invocation.length === 1 ? [undefined, invocation[0]] : invocation;
  const result: unknown = Reflect.apply(target, receiver, args);
  return result;
}

describe('direct maintained-source completeness', () => {
  test('runtime kernel composes issued hosts and exposes timed reads', async () => {
    const { repositoryRoot, context: project } = configuredTestContext();
    const projectBinding = required(project.project_bindings[0], 'a configured project binding');
    const resolveIdentity = (): TrustedProjectIdentity =>
      Object.freeze({
        schema: 'TrustedProjectIdentity/v1',
        source: 'authenticated-context',
        principal: 'principal-1',
        role: 'developer-orchestrator',
        tenant: project.repository_id,
        project: projectBinding.project_id,
        registry_hash: project.registry_hash,
      });
    expect(nativeNoFollowAvailable).toBe(true);
    const caseDeadline = performance.now() + 5_000;
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-kernel-host-'));
    let database: Database | undefined;
    let bodyFailure: { readonly error: unknown } | undefined;
    let caseSucceeded = false;

    try {
      database = new Database(path.join(temporaryRoot, 'governance.sqlite'), { create: true, strict: true });
      database.exec('PRAGMA journal_mode=DELETE');
      database.exec('PRAGMA synchronous=FULL');
      const governanceCapability = new HostStateStore(database, 'a'.repeat(64)).governanceCapability;
      const events: RuntimeTimingEvent[] = [];
      const host = createRuntimeKernelHost({
        repositoryRoot,
        repositoryId: project.repository_id,
        projectIds: project.project_ids,
        integrationsDigest: project.integrations_digest,
        governanceCapability,
        resolveIdentity,
        verifyApproval: () => null,
        runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
        casWriter: () => ({ applied: true }),
        clock: defaultRuntimeClock(),
        timingSink: {
          record: (event) => {
            events.push(event);
          },
        },
      });
      const kernelCreation = createRuntimeKernel(repositoryRoot, host);
      await Promise.resolve(expect(kernelCreation).resolves.toBeDefined());
      const kernel = await kernelCreation;
      await Promise.resolve(expect(kernel.readConfig()).resolves.toHaveProperty('schema', 'AgentRuntimeConfig/v1'));
      await Promise.resolve(
        expect(kernel.readProjectContext()).resolves.toHaveProperty(
          'project_ids',
          expect.arrayContaining([projectBinding.project_id]),
        ),
      );
      await Promise.resolve(
        expect(kernel.evaluateGovernance('runtime.read', {})).resolves.toHaveProperty('decision', 'allow'),
      );
      const fixture = createGovernedEvidenceFixture(project, Date.now(), expectReturned);
      expect(fixture.operationHash).toMatch(/^[a-f0-9]{64}$/);
      assert.ok(fixture.receipt);
      expect(fixture.receipt).toMatchObject({
        schema: 'AuthorizationReceipt/v1',
        operation_hash: fixture.operationHash,
      });
      {
        const failure = await rejectionReason(
          kernel.runGovernedWrite({
            envelope: {
              schema: 'RuntimeEnvelope/v1',
              kind: 'governed-write',
              operation: 'runtime.write',
              sourceRevision: 'source-1',
              expectedRevision: 1,
              payload: { operation: fixture.intent.operation },
            },
            intent: fixture.intent,
          }),
        );
        expect(() => {
          throw failure;
        }).toThrow(/denied|approval|Cedar ingress/i);
      }
      const crossAuthorization = {
        ...fixture.intent.authorization,
        tenant: 'other-tenant',
        resourceTenant: 'other-tenant',
      };
      const crossOperationHash = expectReturned(() =>
        computeWriteOperationHash({
          operation: fixture.intent.operation,
          payload: fixture.intent.payload,
          ...crossAuthorization,
        }),
      );
      expect(crossOperationHash).toMatch(/^[a-f0-9]{64}$/);
      const crossIntent = {
        ...fixture.intent,
        authorization: crossAuthorization,
        approval: { ...fixture.intent.approval, tenant: 'other-tenant', operation_hash: crossOperationHash },
      };
      {
        const failure = await rejectionReason(
          kernel.runGovernedWrite({
            envelope: {
              schema: 'RuntimeEnvelope/v1',
              kind: 'governed-write',
              operation: 'runtime.write',
              sourceRevision: 'source-1',
              expectedRevision: 1,
              payload: { operation: fixture.intent.operation },
            },
            intent: crossIntent,
          }),
        );
        expect(() => {
          throw failure;
        }).toThrow(/canonical Cedar|identity|denied|approval/i);
      }
      expect(kernel.schema).toBe('RuntimeKernel/v1');
      expect(kernel.repositoryRoot).toBe(repositoryRoot);
      expect(Object.isFrozen(kernel)).toBe(true);
      await Promise.resolve(
        expect(kernel.evaluateGovernance('runtime.write', {})).resolves.toHaveProperty('decision', 'deny'),
      );
      const bindingDefaults = {
        repositoryRoot,
        repositoryId: project.repository_id,
        projectIds: project.project_ids,
        integrationsDigest: project.integrations_digest,
        governanceCapability,
        resolveIdentity,
        verifyApproval: () => null,
        runtimeRevision: () => ({ sourceRevision: 'source-1', currentRevision: 1 }),
        casWriter: () => ({ applied: true }),
      } satisfies RuntimeKernelHostBindings;
      const requiredHostFields: readonly (readonly [keyof RuntimeKernelHostBindings, string])[] = [
        ['resolveIdentity', 'runtime kernel host identity resolver is required'],
        ['verifyApproval', 'runtime kernel host approval verifier is required'],
        ['runtimeRevision', 'runtime kernel host revision provider is required'],
        ['casWriter', 'runtime kernel host CAS writer is required'],
      ];
      for (const [field, message] of requiredHostFields) {
        const incomplete: Partial<RuntimeKernelHostBindings> = { ...bindingDefaults };
        Reflect.deleteProperty(incomplete, field);
        expect(() => invokeUntrusted(createRuntimeKernelHost, [incomplete])).toThrow(message);
      }
      expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...bindingDefaults, repositoryRoot: null }])).toThrow(
        'runtime kernel host repository root is required',
      );
      expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...bindingDefaults, repositoryId: null }])).toThrow(
        'runtime kernel host repository id is required',
      );
      expect(() => invokeUntrusted(createRuntimeKernelHost, [{ ...bindingDefaults, projectIds: null }])).toThrow(
        'runtime kernel host project ids are required',
      );
      expect(() =>
        invokeUntrusted(createRuntimeKernelHost, [{ ...bindingDefaults, integrationsDigest: null }]),
      ).toThrow('runtime kernel host integrations digest is required');
      expect(() =>
        createRuntimeKernelHost({ ...bindingDefaults, repositoryRoot: repositoryRoot + path.sep + '.' }),
      ).toThrow(/canonical/);
      const defaultTimingHost = createRuntimeKernelHost(bindingDefaults);
      const defaultTimingKernelCreation = createRuntimeKernel(repositoryRoot, defaultTimingHost);
      await Promise.resolve(expect(defaultTimingKernelCreation).resolves.toBeDefined());
      const defaultTimingKernel = await defaultTimingKernelCreation;
      await Promise.resolve(
        expect(defaultTimingKernel.readConfig()).resolves.toHaveProperty('schema', 'AgentRuntimeConfig/v1'),
      );
      {
        const failure = await rejectionReason(invokeUntrusted(createRuntimeKernel, [repositoryRoot, {}]));
        expect(() => {
          throw failure;
        }).toThrow('runtime kernel requires an opaque host capability');
      }
      {
        const failure = await rejectionReason(invokeUntrusted(createRuntimeKernel, [repositoryRoot, () => undefined]));
        expect(() => {
          throw failure;
        }).toThrow('runtime kernel requires an opaque host capability');
      }
      {
        const failure = await rejectionReason(invokeUntrusted(createRuntimeKernel, [repositoryRoot, 1]));
        expect(() => {
          throw failure;
        }).toThrow('runtime kernel requires an opaque host capability');
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(events.map((event) => event.operation)).toContain('createRuntimeKernel');
      for (const bindings of [
        { ...bindingDefaults, repositoryRoot: '' },
        { ...bindingDefaults, repositoryId: '' },
        { ...bindingDefaults, projectIds: [] },
      ])
        expect(() => invokeUntrusted(createRuntimeKernelHost, [bindings])).toThrow();
      const otherRootHost = createRuntimeKernelHost({
        repositoryRoot: packageRoot,
        repositoryId: 'x',
        projectIds: ['y'],
        integrationsDigest: '0'.repeat(64),
        governanceCapability,
        resolveIdentity: () => null,
        verifyApproval: () => null,
        runtimeRevision: () => ({ sourceRevision: 'x', currentRevision: 1 }),
        casWriter: () => null,
      });
      {
        const failure = await rejectionReason(createRuntimeKernel(repositoryRoot, otherRootHost));
        expect(() => {
          throw failure;
        }).toThrow(/different repository/);
      }
      caseSucceeded = true;
    } catch (error) {
      bodyFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            try {
              database?.close(true);
            } catch (error) {
              console.error(`Retained runtime kernel fixture: ${temporaryRoot}`);
              throw error;
            }
            if (!caseSucceeded || bodyFailure !== undefined || performance.now() >= caseDeadline) {
              console.error(`Retained runtime kernel fixture: ${temporaryRoot}`);
              return undefined;
            }
            rmSync(temporaryRoot, { recursive: true, force: true });
            return 'removed';
          },
        ],
        bodyFailure,
      );
    }
  });
});
