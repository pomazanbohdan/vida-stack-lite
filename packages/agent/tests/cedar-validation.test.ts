import { expect, spyOn, test } from 'bun:test';
import * as cedarWasm from '@cedar-policy/cedar-wasm/nodejs';
import { validate } from '@cedar-policy/cedar-wasm/nodejs';
import { copyFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { assertConfiguredCedarPolicy, createConfiguredProjectAuthorizer } from '../src/authorization/cedar-boundary.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { configuredTestContext } from './configured-context.ts';

const schema =
  'entity User; entity Group; entity Project; action read appliesTo { principal: User, resource: Project };';

test('Cedar 4.13 keeps invalid action applicability as a warning and candidate startup rejects it', () => {
  const policy = 'permit(principal is Group, action == Action::"read", resource);';
  const result = validate({ schema, policies: { staticPolicies: policy } });
  expect(result.type).toBe('success');
  if (result.type !== 'success') throw new Error('Cedar fixture validation failed');
  expect(result.validationErrors).toHaveLength(0);
  const applicabilityWarning = result.validationWarnings.find((warning) =>
    warning.error.message.includes('unable to find an applicable action given the policy scope constraints'),
  );
  expect(applicabilityWarning).toBeDefined();
  expect(() => assertConfiguredCedarPolicy(policy, schema)).toThrow(/semantic validation failed/);
});

test('configured validation keeps valid policy and rejects successful responses with semantic errors', () => {
  expect(() =>
    assertConfiguredCedarPolicy('permit(principal is User, action == Action::"read", resource);', schema),
  ).not.toThrow();
  const invalidAttributePolicy =
    'permit(principal is User, action == Action::"read", resource) when { principal.missing == "alice" };';
  const validation = validate({ schema, policies: { staticPolicies: invalidAttributePolicy } });
  expect(validation.type).toBe('success');
  if (validation.type !== 'success') throw new Error('Cedar fixture validation failed');
  expect(validation.validationErrors.length).toBeGreaterThan(0);
  expect(() => assertConfiguredCedarPolicy(invalidAttributePolicy, schema)).toThrow(/semantic validation failed/);
});

test('configured validation permits an impossible-condition warning with no semantic errors', () => {
  const warningPolicy = 'permit(principal is User, action == Action::"read", resource) when { false };';
  const result = validate({ schema, policies: { staticPolicies: warningPolicy } });
  expect(result.type).toBe('success');
  if (result.type !== 'success') throw new Error('Cedar fixture validation failed');
  expect(result.validationErrors).toHaveLength(0);
  expect(result.validationWarnings.length).toBeGreaterThan(0);
  expect(
    result.validationWarnings.some((warning) =>
      warning.error.message.includes('unable to find an applicable action given the policy scope constraints'),
    ),
  ).toBe(false);
  expect(() => assertConfiguredCedarPolicy(warningPolicy, schema)).not.toThrow();
});

test('configured validation rejects malformed policy and schema at their parse boundaries', () => {
  const policy = 'permit(principal is User, action == Action::"read", resource);';
  expect(() => assertConfiguredCedarPolicy('not cedar', schema)).toThrow('configured Cedar policy is invalid');
  expect(() => assertConfiguredCedarPolicy(policy, 'not a schema')).toThrow('configured Cedar schema is invalid');
  expect(() => assertConfiguredCedarPolicy(policy, schema)).not.toThrow();
});

test('configured validation fails closed on a validation failure envelope after successful parsing', () => {
  const policy = 'permit(principal is User, action == Action::"read", resource);';
  const validation = spyOn(cedarWasm, 'validate').mockReturnValue({ type: 'failure', errors: [], warnings: [] });
  try {
    expect(() => assertConfiguredCedarPolicy(policy, schema)).toThrow(
      'configured Cedar policy/schema semantic validation failed',
    );
    expect(validation).toHaveBeenCalledTimes(1);
  } finally {
    validation.mockRestore();
  }
  expect(() => assertConfiguredCedarPolicy(policy, schema)).not.toThrow();
});

test('configured authorizer validates Cedar from an authentic loaded repository configuration', async () => {
  const deadline = performance.now() + 5_000;
  const { repositoryRoot, config } = configuredTestContext();
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'vida-cedar-validation-'));
  let succeeded = false;
  try {
    const files = [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
    ];
    for (const relative of files) {
      const destination = path.join(fixtureRoot, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(repositoryRoot, relative), destination);
    }

    const alteredConfig = structuredClone(config) as {
      authorization: { cedar: { policy: string; schema_text: string } };
    };
    // Keep the shallow embedded-policy marker while making Cedar parsing fail.
    alteredConfig.authorization.cedar.policy = 'permit {';
    await writeFile(
      path.join(fixtureRoot, 'agent-runtime.config.v1.yaml'),
      stringifyYaml(alteredConfig, { lineWidth: 0 }),
    );

    const loadedConfig = loadRuntimeConfig(fixtureRoot);
    expect(() => createConfiguredProjectAuthorizer(fixtureRoot, loadedConfig)).toThrow(
      'configured Cedar policy is invalid',
    );
    succeeded = true;
  } finally {
    if (succeeded && performance.now() < deadline) rmSync(fixtureRoot, { recursive: true, force: true });
    else console.error(`Retained Cedar configuration fixture: ${fixtureRoot}`);
  }
}, 5_000);
