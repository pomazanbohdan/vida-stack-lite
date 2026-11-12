import { expect, test } from 'bun:test';
import { variantContextVersion } from '../scripts/sbvf-verify.ts';
import { parseVersionRange, satisfiesVersion } from '../skills/vp-mode/scripts/applicability.ts';

test('variant context version resolves single-component .x ranges to a satisfying concrete version', () => {
  const angular = parseVersionRange('22.x');
  const version = variantContextVersion({ versionRange: angular });
  expect(version).toBe('22.0.0');
  expect(satisfiesVersion(version!, angular.comparators)).toBe(true);
  expect(satisfiesVersion(version!, [{ op: '>=', version: '22.0.0' }])).toBe(true);
  expect(satisfiesVersion(version!, [{ op: '<', version: '23.0.0' }])).toBe(true);
});

test('variant context version keeps two-component .x and exact ranges working', () => {
  expect(variantContextVersion({ versionRange: parseVersionRange('0.86.x') })).toBe('0.86.0');
  expect(variantContextVersion({ versionRange: parseVersionRange('3.44.x') })).toBe('3.44.0');
  expect(variantContextVersion({ versionRange: parseVersionRange('3.5.x') })).toBe('3.5.0');
  expect(variantContextVersion({ versionRange: parseVersionRange('7.1.6') })).toBe('7.1.6');
  expect(variantContextVersion({ versionRange: parseVersionRange('^22.0.0') })).toBe('22.0.0');
});

test('variant context version falls back to wildcard padding without comparators', () => {
  expect(variantContextVersion({ versionRange: { raw: '22.x' } })).toBe('22.0.0');
  expect(variantContextVersion({ versionRange: { raw: '0.86.x' } })).toBe('0.86.0');
  expect(variantContextVersion({ versionRange: { raw: '1.2.3' } })).toBe('1.2.3');
});

test('variant context version is absent without a usable range', () => {
  expect(variantContextVersion({})).toBeUndefined();
  expect(variantContextVersion({ versionRange: {} })).toBeUndefined();
  expect(variantContextVersion({ versionRange: { comparators: [{ op: '>', version: '1.2.3' }], raw: '>1.2.3' } })).toBe('>1.2.3');
});
