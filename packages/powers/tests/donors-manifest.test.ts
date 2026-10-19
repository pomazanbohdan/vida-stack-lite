/**
 * Invariant of the donor manifest: every donor must be traceable to an exact
 * revision and a license, and the set of donors must stay complete.
 */
import { describe, expect, test } from 'bun:test';
import path from 'node:path';

const manifestPath = path.join(import.meta.dir, '..', 'donors.yaml');
const manifest = (await Bun.YAML.parse(await Bun.file(manifestPath).text())) as {
  schema: string;
  product: string;
  donors: Array<{
    id: string;
    role: string;
    url: string;
    local_path: string;
    head_sha: string;
    checked_out: string;
    license: string;
    license_file: string;
    file_count: number;
    content_file_count?: number;
    content_path?: string;
  }>;
  not_cloned: Array<{ id: string; url: string; research_snapshot_revision: string }>;
};

describe('donors.yaml', () => {
  test('is the canonical donor manifest of the product', () => {
    expect(manifest.schema).toBe('vida-powers-donors/v1');
    expect(manifest.product).toBe('vida-powers');
  });

  test('covers seven methodology donors and one format reference', () => {
    const methodology = manifest.donors.filter((donor) => donor.role === 'methodology-donor');
    const format = manifest.donors.filter((donor) => donor.role === 'format-reference');
    expect(methodology).toHaveLength(7);
    expect(format).toHaveLength(1);
    expect(format[0]!.id).toBe('open-knowledge-format');
  });

  test('keeps donor ids unique', () => {
    const ids = manifest.donors.map((donor) => donor.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(manifest.donors)('$id pins an exact revision and a license', (donor) => {
    expect(donor.head_sha).toMatch(/^[0-9a-f]{40}$/);
    expect(donor.url).toMatch(/^https:\/\//);
    expect(donor.local_path.length).toBeGreaterThan(0);
    expect(['MIT', 'Apache-2.0']).toContain(donor.license);
    expect(donor.license_file.length).toBeGreaterThan(0);
    expect(donor.file_count).toBeGreaterThan(0);
    expect(['detached', 'branch']).toContain(donor.checked_out);
  });

  test('scopes the pstack donor to its content path', () => {
    const pstack = manifest.donors.find((donor) => donor.id === 'pstack');
    expect(pstack).toBeDefined();
    expect(pstack!.content_path).toBe('pstack');
    expect(pstack!.content_file_count).toBeLessThan(pstack!.file_count);
  });

  test('records the runtime repository as not cloned', () => {
    const runtime = manifest.not_cloned.find((entry) => entry.id === 'vida-runtime');
    expect(runtime).toBeDefined();
    expect(runtime!.research_snapshot_revision).toMatch(/^[0-9a-f]{40}$/);
  });
});
