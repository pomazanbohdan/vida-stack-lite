import { describe, expect, test } from 'bun:test';
import { environmentPath, prependEnvironmentPath } from '../tooling/environment-path.js';

describe('environment PATH lookup', () => {
  test('uses Windows case-insensitive PATH lookup and preserves delimiter text', () => {
    const value = 'first;second';

    expect(environmentPath({ PATH: value }, 'win32')).toBe(value);
    expect(environmentPath({ Path: value }, 'win32')).toBe(value);
    expect(environmentPath({ path: value }, 'win32')).toBe(value);
  });

  test('uses the lexically first Windows spelling when PATH keys conflict', () => {
    expect(environmentPath({ path: 'lower', Path: 'mixed', PATH: 'upper' }, 'win32')).toBe('upper');
  });

  test('uses only the canonical PATH key on POSIX and preserves delimiter text', () => {
    const value = 'first:second';

    expect(environmentPath({ PATH: value, Path: 'mixed', path: 'lower' }, 'linux')).toBe(value);
    expect(environmentPath({ Path: 'mixed', path: 'lower' }, 'linux')).toBe('');
  });

  test('prepends to the Windows winning PATH spelling and removes losing duplicates', () => {
    const source = { path: 'decoy', PATH: 'rightful', Path: 'also-decoy', HOME: 'home' };
    const result = prependEnvironmentPath(source, 'tools', 'win32');

    expect(result).toEqual({ PATH: 'tools;rightful', HOME: 'home' });
    expect(environmentPath(result, 'win32')).toBe('tools;rightful');
    expect(source).toEqual({ path: 'decoy', PATH: 'rightful', Path: 'also-decoy', HOME: 'home' });
  });

  test('uses only exact POSIX PATH and preserves mixed-case environment variables', () => {
    const source = { Path: 'mixed', path: 'lower', HOME: 'home' };
    const result = prependEnvironmentPath(source, 'tools', 'linux');

    expect(result).toEqual({ Path: 'mixed', path: 'lower', HOME: 'home', PATH: 'tools:' });
    expect(environmentPath(result, 'linux')).toBe('tools:');
    expect(source).toEqual({ Path: 'mixed', path: 'lower', HOME: 'home' });
  });

  test('returns an empty string when PATH is absent on either platform', () => {
    const environment = { HOME: '/tmp' };

    expect(environmentPath(environment, 'win32')).toBe('');
    expect(environmentPath(environment, 'linux')).toBe('');
  });
});
