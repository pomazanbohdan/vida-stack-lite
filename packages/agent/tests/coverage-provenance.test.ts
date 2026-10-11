/**
 * This test uses UNTRUSTED synthetic coverage receipts. It checks that current
 * input and process bindings deny stale reports; it does not qualify a producer.
 */
import { expect, test } from 'bun:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateCoverageReport } from '../tooling/bun-coverage-report-validator.ts';
import { createSyntheticCoverageFixture } from './synthetic-coverage-fixture.ts';

async function expectValidationDenial(validate: () => Promise<unknown>, expected: RegExp): Promise<void> {
  let denial: unknown;
  try {
    await validate();
  } catch (error) {
    denial = error;
  }
  expect(denial).toBeInstanceOf(Error);
  if (!(denial instanceof Error)) throw new Error('Expected current coverage validation to deny the stale report.');
  expect(denial.message).toMatch(expected);
}

test('current coverage provenance binds test and configuration inputs and retains prior report bytes on stale process denial', async () => {
  const fixture = await createSyntheticCoverageFixture();
  let passed = false;
  try {
    const reportBytes = Buffer.from(fixture.reportBytes());
    const manifestRelative = fixture.report.manifest_path;
    if (typeof manifestRelative !== 'string') throw new Error('Synthetic manifest path is missing.');
    const manifestPath = path.join(fixture.root, ...manifestRelative.split('/'));
    const manifestBytes = readFileSync(manifestPath);
    const selectedTests = fixture.report.tests;
    if (!Array.isArray(selectedTests) || !selectedTests.includes('tests/fixture.test.mjs'))
      throw new Error('Synthetic report omitted its selected Bun test.');

    writeFileSync(fixture.reportPath, reportBytes);
    const validate = () => validateCoverageReport(fixture.reportPath, fixture.root, { requireFullCoverage: false });
    const accepted = await validate();
    expect(accepted.tests).toContain('tests/fixture.test.mjs');

    const selectedTestPath = path.join(fixture.root, 'tests/fixture.test.mjs');
    const selectedTestBytes = readFileSync(selectedTestPath);
    writeFileSync(selectedTestPath, Buffer.concat([selectedTestBytes, Buffer.from('\n// changed after capture\n')]));
    await expectValidationDenial(validate, /Coverage input changed since collection: test_inputs/u);
    expect(readFileSync(fixture.reportPath)).toEqual(reportBytes);
    expect(readFileSync(manifestPath)).toEqual(manifestBytes);
    writeFileSync(selectedTestPath, selectedTestBytes);

    const packagePath = path.join(fixture.root, 'package.json');
    const packageBytes = readFileSync(packagePath);
    writeFileSync(packagePath, Buffer.concat([packageBytes, Buffer.from('\n')]));
    await expectValidationDenial(validate, /Coverage input changed since collection: tool_inputs/u);
    expect(readFileSync(fixture.reportPath)).toEqual(reportBytes);
    expect(readFileSync(manifestPath)).toEqual(manifestBytes);
    writeFileSync(packagePath, packageBytes);

    const childBytes = readFileSync(fixture.processPath);
    writeFileSync(fixture.processPath, Buffer.concat([childBytes, Buffer.from(' ')]));
    await expectValidationDenial(validate, /Coverage process receipt fingerprint mismatch/u);
    expect(readFileSync(fixture.reportPath)).toEqual(reportBytes);
    expect(readFileSync(manifestPath)).toEqual(manifestBytes);
    passed = true;
  } finally {
    if (passed) fixture.remove();
    else console.error(`Preserved failed synthetic coverage provenance fixture at ${fixture.root}`);
  }
});
