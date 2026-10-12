import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import {
  checkedCliObject,
  databaseState,
  deliveryFixture,
  fixture,
  json,
  parseFixtureJson,
  registerRuntimeConfigFixtureCleanup,
  requiredCliString,
  runReconcileArtifacts,
} from './helpers/runtime-config-rebind-fixture.ts';

registerRuntimeConfigFixtureCleanup();

test('delivered configuration adopts only its receipt under the original fence and preserves history', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('unchanged baseline YAML and receipt'),
  );
  expect((await runReconcileArtifacts(f.deliveryArgs('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  const planned = await runReconcileArtifacts(f.deliveryArgs('plan'));
  expect(requiredCliString(planned, 'operation_path', 'planned operation path')).toEndWith(
    '/runtime-config-delivery-operation.v1.json',
  );
  expect(
    checkedCliObject(
      parseFixtureJson(
        readFileSync(path.join(f.root, requiredCliString(planned, 'operation_path', 'operation path')), 'utf8'),
      ),
      'planned delivery operation',
    ).schema,
  ).toBe('SourceDeliveryConfigRebindOperation/v1');
  expect((await runReconcileArtifacts(f.deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  const completed = await runReconcileArtifacts(f.deliveryArgs('resume'));
  expect(completed.status).toBe('applied');
  expect(completed.writes_yaml).toBe(false);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual({
    ...f.receipt,
    config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
  });
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
  await Promise.resolve(
    expect(runReconcileArtifacts(f.deliveryArgs('restore'))).rejects.toThrow('rollback is forbidden'),
  );
}, 30000);

test('delivered configuration denies substituted baseline, target drift and cross-kind operation conversion', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  f.put('accepted-baseline.yaml', f.target);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.deliveryArgs('inspect'))).rejects.toThrow('unchanged baseline YAML and receipt'),
  );
  expect(databaseState(f)).toEqual(before);
  f.put('accepted-baseline.yaml', f.oldYaml);
  const planned = await runReconcileArtifacts(f.deliveryArgs('plan'));
  f.put(
    '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json',
    readFileSync(path.join(f.root, requiredCliString(planned, 'operation_path', 'operation path'))),
  );
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow('frozen operation invalid or foreign'),
  );
  expect(databaseState(f)).toEqual(before);
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.deliveryArgs('apply'))).rejects.toThrow('authored YAML bytes differ'),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('delivered configuration abandons a no-effect fence without reverting the desired YAML', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  await runReconcileArtifacts(f.deliveryArgs('plan'));
  await runReconcileArtifacts(f.deliveryArgs('apply'));
  expect((await runReconcileArtifacts(f.deliveryArgs('restore'))).status).toBe('abandoned_no_effect');
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  expect(databaseState(f).agent_host_state).toEqual(before.agent_host_state);
}, 30000);

test.each(['fence_acquired', 'fenced', 'receipt_rebound', 'applied', 'released'])(
  'delivered configuration resumes interrupted %s without duplicating receipt effects',
  async (cutoff) => {
    const f = deliveryFixture();
    await runReconcileArtifacts(f.deliveryArgs('plan'));
    const options = {
      onPhase: (phase: string) => {
        if (phase === cutoff) throw new Error('injected delivery interruption');
      },
    };
    if (['fence_acquired', 'fenced'].includes(cutoff)) {
      await Promise.resolve(
        expect(runReconcileArtifacts(f.deliveryArgs('apply'), options)).rejects.toThrow(
          'injected delivery interruption',
        ),
      );
      await runReconcileArtifacts(f.deliveryArgs('resume'));
    } else {
      await runReconcileArtifacts(f.deliveryArgs('apply'));
      await Promise.resolve(
        expect(runReconcileArtifacts(f.deliveryArgs('resume'), options)).rejects.toThrow(
          'injected delivery interruption',
        ),
      );
    }
    expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
    expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual({
      ...f.receipt,
      config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
    });
  },
  30000,
);

test('delivered configuration rejects retagging a fenced standard operation without receipt effects', async () => {
  const f = fixture({ sourceMode: true });
  const planned = await runReconcileArtifacts(f.args('plan'));
  await runReconcileArtifacts(f.args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.target);
  const operation = checkedCliObject(
    parseFixtureJson(
      readFileSync(path.join(f.root, requiredCliString(planned, 'operation_path', 'operation path')), 'utf8'),
    ),
    'planned source operation',
  );
  f.put(
    '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json',
    json({ ...operation, schema: 'SourceDeliveryConfigRebindOperation/v1' }),
  );
  const before = databaseState(f),
    args = f.args('resume');
  args[1] = 'runtime-config-delivery';
  await Promise.resolve(expect(runReconcileArtifacts(args)).rejects.toThrow('frozen operation invalid or foreign'));
  expect(databaseState(f)).toEqual(before);
  const retagged = { ...operation, schema: 'SourceDeliveryConfigRebindOperation/v1' };
  retagged.plan_digest = canonicalJsonDigest({ schema: retagged.schema, plan: retagged.plan });
  f.put('.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json', json(retagged));
  await Promise.resolve(expect(runReconcileArtifacts(args)).rejects.toThrow('foreign or absent maintenance fence'));
  expect(databaseState(f)).toEqual(before);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
}, 30000);
