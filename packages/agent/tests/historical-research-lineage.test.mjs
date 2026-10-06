import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { readHistoricalObservedResearchLineage } from '../src/research-decision.ts';
import { createHistoricalResearchFixture } from './helpers/historical-research-fixture.mjs';

test('historical research lineage reads an admitted prefix without a write gate and rejects altered lineage', () => {
  const f = createHistoricalResearchFixture();
  const input = {
    root: f.root,
    feature: f.feature,
    plan: f.plan,
    activation_plan: f.activationPlan,
    activation_use: f.activationUse,
  };
  const read = () => readHistoricalObservedResearchLineage(input);
  const bytes = (relative) => readFileSync(path.join(f.root, ...relative.split('/')));
  const original = { record: bytes(f.recordPath), history: bytes(f.historyPath), changelog: bytes(f.changelogPath) };
  try {
    expect(read()).toEqual(f.result);
    expect(bytes(f.recordPath)).toEqual(original.record);
    expect(bytes(f.historyPath)).toEqual(original.history);
    expect(bytes(f.changelogPath)).toEqual(original.changelog);

    f.write(f.recordPath, original.record.toString('utf8').replace('The sources agree.', 'Tampered finding.'));
    expect(read).toThrow();
    f.write(f.recordPath, original.record);

    f.write(f.historyPath, original.history.toString('utf8').replace(f.activationUse.use_id, 'use-tampered'));
    expect(read).toThrow();
    f.write(f.historyPath, original.history);

    f.write(f.changelogPath, original.changelog.toString('utf8').replace('fixture-agent', 'foreign-agent'));
    expect(read).toThrow();
    f.write(f.changelogPath, original.changelog);

    const foreignBody = { ...f.activationPlan, binding: { ...f.activationPlan.binding, scope_id: 'foreign-scope' } };
    delete foreignBody.digest;
    const foreignActivationPlan = { ...foreignBody, digest: canonicalJsonDigest(foreignBody) };
    expect(() => readHistoricalObservedResearchLineage({ ...input, activation_plan: foreignActivationPlan })).toThrow();
    expect(bytes(f.recordPath)).toEqual(original.record);
    expect(bytes(f.historyPath)).toEqual(original.history);
    expect(bytes(f.changelogPath)).toEqual(original.changelog);
  } finally {
    f.dispose();
  }
});
