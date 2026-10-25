import { expect, test } from 'bun:test';
import { collectManifestOutputs } from '../scripts/build-manifests.ts';
import { encodeFormationPathLength } from '../scripts/formation-payload.ts';

function expectFailure(operation: () => unknown, expected: { code: string; message: string }): void {
  let failure: unknown;
  try { operation(); } catch (error) { failure = error; }
  expect(failure).toMatchObject(expected);
}

test('manifest outputs keep deterministic order, equal duplicates and private byte copies', () => {
  const raw = Buffer.from('bytes');
  const duplicate = Buffer.from('bytes');
  const outputs = collectManifestOutputs([
    ['z.json', 'text'], ['a.bin', raw], ['z.json', 'text'], ['a.bin', duplicate],
  ], new Set(['a.bin', 'z.json']));
  expect([...outputs.keys()]).toEqual(['a.bin', 'z.json']);
  expect(outputs.get('a.bin')).toEqual(Buffer.from('bytes'));
  expect(outputs.get('z.json')).toBe('text');
  raw.fill(0);
  duplicate.fill(0);
  expect(outputs.get('a.bin')).toEqual(Buffer.from('bytes'));
  expect(collectManifestOutputs([], new Set()).size).toBe(0);
});

test('manifest output owner rejects text and binary collisions', () => {
  expectFailure(() => collectManifestOutputs([['plugin.json', 'first'], ['plugin.json', 'second']], new Set(['plugin.json'])),
    { code: 'MANIFEST_OUTPUT_CONFLICT', message: 'Targets produced different content for plugin.json.' });
  expectFailure(() => collectManifestOutputs([['raw.bin', Buffer.from([1])], ['raw.bin', Buffer.from([2])]], new Set(['raw.bin'])),
    { code: 'MANIFEST_OUTPUT_CONFLICT', message: 'Targets produced different content for raw.bin.' });
});

test('manifest output owner rejects both missing and extra generated paths', () => {
  for (const operation of [
    () => collectManifestOutputs([], new Set(['plugin.json'])),
    () => collectManifestOutputs([['extra.json', '{}']], new Set()),
  ]) {
    expectFailure(operation, { code: 'MANIFEST_OUTPUT_INVALID', message: 'Generated output paths do not match the selected target map.' });
  }
});

test('formation path length framing preserves the inclusive u32 receipt boundaries', () => {
  expect(encodeFormationPathLength(0, 'empty')).toEqual(Buffer.from([0, 0, 0, 0]));
  expect(encodeFormationPathLength(0xffff_ffff, 'maximum')).toEqual(Buffer.from([255, 255, 255, 255]));
  expect(encodeFormationPathLength(0x01020304, 'ordinary')).toEqual(Buffer.from([1, 2, 3, 4]));
  expectFailure(() => encodeFormationPathLength(0x1_0000_0000, 'overflow'),
    { code: 'MANIFEST_INPUT_UNSAFE', message: 'Native formation source path is too long: overflow.' });
});

test('formation path length framing rejects invalid scalar lengths with a typed error', () => {
  for (const length of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    let failure: unknown;
    try { encodeFormationPathLength(length, 'invalid'); } catch (error) { failure = error; }
    expect(failure).toMatchObject({ code: 'MANIFEST_INPUT_UNSAFE', message: 'Native formation source path byte length is invalid: invalid.' });
  }
});
