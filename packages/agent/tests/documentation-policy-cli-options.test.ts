import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.ts';
import { preparedFixture } from './helpers/documentation-policy-fixture.ts';

test('policy mode contracts reject missing planning inputs and substituted replay authority before effects', async () => {
  const { f, baseline, args } = await preparedFixture();
  const database = path.join(f.root, '.agent/work/session-handoff.v1.sqlite');
  const beforeDatabase = readFileSync(database);
  const beforeBaseline = readFileSync(path.join(f.root, baseline.path));
  const beforeEvents = readFileSync(path.join(f.root, f.oldPolicy.changelog_path));
  const beforeSelector = readFileSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'));
  const beforeFiles = readdirSync(f.root, { recursive: true, encoding: 'utf8' }).sort((left, right) =>
    left.localeCompare(right),
  );
  for (const mode of ['inspect', 'plan']) {
    for (const key of ['--actor', '--instruction-ref', '--baseline', '--timestamp', '--target-policy']) {
      const values = args(mode);
      values.splice(values.indexOf(key), 2);
      await Promise.resolve(expect(runReconcileArtifacts(values)).rejects.toThrow('mode, root or arguments invalid'));
    }
  }
  for (const mode of ['apply', 'resume', 'restore']) {
    for (const pair of [
      ['--actor', 'substituted-owner'],
      ['--instruction-ref', 'substituted-instruction'],
      ['--baseline', baseline.path],
      ['--timestamp', '2026-10-10T00:00:00.000Z'],
      ['--target-policy', f.policyPath],
      ['--forward-operation', 'unpaired-forward-operation'],
      ['--payload-root', f.bundle],
    ]) {
      await Promise.resolve(
        expect(runReconcileArtifacts([...args(mode), ...pair])).rejects.toThrow('mode, root or arguments invalid'),
      );
    }
  }
  expect(readFileSync(database)).toEqual(beforeDatabase);
  expect(readFileSync(path.join(f.root, baseline.path))).toEqual(beforeBaseline);
  expect(readFileSync(path.join(f.root, f.policyPath), 'utf8')).toBe(f.json(f.oldPolicy));
  expect(readFileSync(path.join(f.root, f.oldPolicy.changelog_path))).toEqual(beforeEvents);
  expect(readFileSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'))).toEqual(beforeSelector);
  expect(
    readdirSync(f.root, { recursive: true, encoding: 'utf8' }).sort((left, right) => left.localeCompare(right)),
  ).toEqual(beforeFiles);
}, 30_000);
