import { expect, test } from 'bun:test';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  databaseState,
  fixture,
  json,
  registerRuntimeConfigFixtureCleanup,
  runReconcileArtifacts,
  sha,
} from './helpers/runtime-config-rebind-fixture.ts';

registerRuntimeConfigFixtureCleanup();

test.each(['source bytes', 'inventory addition', 'selector appearance', 'workspace identity'])(
  'Source rebind rejects %s drift before acquiring maintenance',
  async (change) => {
    const f = fixture({ sourceMode: true });
    await runReconcileArtifacts(f.args('plan'));
    const before = databaseState(f);
    if (change === 'source bytes') f.put(f.bundle + '/bin/run.ts', '// changed Source');
    if (change === 'inventory addition') f.put(f.bundle + '/src/config/new-feature.ts', '// added Source');
    if (change === 'workspace identity') f.put('package.json', json({ private: false, workspaces: [f.bundle] }));
    if (change === 'selector appearance')
      f.put(
        '.agent/active-runtime-selector.v1.json',
        json({
          schema: 'ActiveRuntimeSelector/v1',
          generation: 'foreign-selector',
          runtime: 'vida-agent',
          bundle_root: 'vida-agent',
          config_path: 'agent-runtime.config.v1.yaml',
          payload_manifest_sha256: sha('foreign'),
        }),
      );
    const expectedDenial = ['source bytes', 'inventory addition'].includes(change)
      ? 'vida runtime-config rebind: Source drift requires the applied same-operation source correction under its original fence'
      : /differs|differ|rejects an active selector/;
    await Promise.resolve(expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(expectedDenial));
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  },
  30_000,
);

test('a consumer without selector cannot use Source rebind', async () => {
  const f = fixture();
  rmSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'));
  const before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/only for the Source project/),
  );
  expect(databaseState(f)).toEqual(before);
});

test('Source rejects a preexisting consumer-shaped selector without state changes', async () => {
  const f = fixture({ sourceMode: true });
  f.put(
    '.agent/active-runtime-selector.v1.json',
    json({
      schema: 'ActiveRuntimeSelector/v1',
      generation: 'foreign-selector',
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      payload_manifest_sha256: sha('foreign'),
    }),
  );
  const before = databaseState(f);
  for (const mode of ['inspect', 'plan'])
    await Promise.resolve(expect(runReconcileArtifacts(f.args(mode))).rejects.toThrow(/Source configuration rejects/));
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
}, 30_000);
