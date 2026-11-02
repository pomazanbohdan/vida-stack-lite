import { expect, test } from 'bun:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkVector } from '../scripts/vector.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('VECTOR.md matches processed donor pins and live corpus counts', () => {
  const result = checkVector(root);
  expect(result.issues).toEqual([]);
  expect(result.ok).toBe(true);
});
