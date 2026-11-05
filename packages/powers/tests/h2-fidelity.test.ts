import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema } from '../skills/vp-mode/scripts/schema.ts';
import type { Schema } from '../skills/vp-mode/scripts/schema.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const schema = JSON.parse(readFileSync(join(root, 'config/h2fidelityreceipt.v1.schema.json'), 'utf8')) as Schema;

function receipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema: 'H2FidelityReceipt/v1',
    instructionId: 'alpha',
    source: {
      donor: 'donor',
      path: 'a.csv',
      rowKey: 'entityId=1',
      cells: [{ columnIndex: 0, cellHash: '0'.repeat(64), locator: { line: 2, row: 1, column: 1 } }],
    },
    reviewer: { kind: 'human', actor: 'reviewer' },
    verdict: 'READY',
    evidence: { path: 'evidence.json', sha256: '1'.repeat(64) },
    recordedAt: '2026-11-05T00:00:00Z',
    ...overrides,
  };
}

describe('H2FidelityReceipt/v1', () => {
  test('accepts a human READY receipt', () => {
    expect(validateAgainstSchema(receipt(), schema)).toEqual([]);
  });

  test('rejects an unknown verdict, missing locator and delegated reviewer without model', () => {
    expect(validateAgainstSchema(receipt({ verdict: 'PASS' }), schema)).not.toEqual([]);
    expect(validateAgainstSchema(receipt({ source: { donor: 'd', path: 'a.csv', rowKey: 'r', cells: [{ columnIndex: 0, cellHash: '0'.repeat(64) }] } }), schema)).not.toEqual([]);
    expect(validateAgainstSchema(receipt({ reviewer: { kind: 'delegated', actor: 'model:reviewer' } }), schema)).not.toEqual([]);
  });
});
