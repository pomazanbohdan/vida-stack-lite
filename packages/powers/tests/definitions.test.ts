import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { collectDefinitions, findDuplicateDefinitions } from '../scripts/definitions.ts';

const bundleRoot = path.join(import.meta.dir, '..', 'docs');

function bundleFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) files.push(full);
    }
  };
  walk(bundleRoot);
  return files;
}

describe('normative definitions', () => {
  test('finds a duplicated definition', () => {
    const text = ['- **SR-01.** first', '- **SR-01.** second'].join('\n');
    const definitions = collectDefinitions('fixture.md', text);
    expect(definitions).toHaveLength(2);
    const duplicates = findDuplicateDefinitions(definitions);
    expect([...duplicates.keys()]).toEqual(['SR-01']);
    expect(duplicates.get('SR-01')).toHaveLength(2);
  });

  test('does not treat references as definitions', () => {
    const text = [
      'У матриці рядок: | SR-01, SR-06 | посилання |',
      'Див. також AC-01 у traceability.',
      '- **SR-06.** визначення',
    ].join('\n');
    const definitions = collectDefinitions('fixture.md', text);
    expect(definitions.map((entry) => entry.id)).toEqual(['SR-06']);
  });

  test('the bundle defines every normative id exactly once', () => {
    const definitions = bundleFiles().flatMap((file) =>
      collectDefinitions(path.relative(bundleRoot, file).replaceAll('\\', '/'), readFileSync(file, 'utf8')),
    );
    const duplicates = findDuplicateDefinitions(definitions);
    const report = [...duplicates.entries()].map(
      ([id, bucket]) => `${id}: ${bucket.map((entry) => `${entry.file}:${entry.line}`).join(', ')}`,
    );
    expect(report).toEqual([]);
    expect(definitions.length).toBeGreaterThan(100);
  });
});
