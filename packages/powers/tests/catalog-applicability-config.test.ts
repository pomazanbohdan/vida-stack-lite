import { expect, spyOn, test } from 'bun:test';
import * as nativeFiles from 'node:fs';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogSearch, loadCatalog, loadInstructions, resetApplicabilityConfigCache } from '../skills/vp-mode/scripts/catalog.ts';

const here = dirname(fileURLToPath(import.meta.url));

test('reports an unreadable applicability config as CATALOG_INVALID', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vp-app-config-'));
  try {
    await cp(join(here, 'fixtures/catalog'), directory, { recursive: true });
    await writeFile(
      join(directory, 'config/vpinstruction.v1.2.schema.json'),
      await readFile(join(here, '../config/vpinstruction.v1.2.schema.json')),
    );
    const catalogPath = join(directory, 'catalog.json');
    const catalog = await loadCatalog(catalogPath);
    for (const entry of catalog.instructions) {
      const path = join(directory, entry.path);
      const source = await readFile(path, 'utf8');
      const updated = source.replace(/^---\n/u, '---\nschema: VPInstruction/v1.2\nclassification_status: unclassified\nclassification_reason: Synthetic test fixture.\n');
      await writeFile(path, updated);
      entry.sha256 = createHash('sha256').update(updated).digest('hex');
    }
    await writeFile(catalogPath, JSON.stringify(catalog));
    const loaded = await loadCatalog(catalogPath);
    const instructions = await loadInstructions(loaded, directory);

    const realRead = nativeFiles.readFileSync;
    resetApplicabilityConfigCache();
    const io = spyOn(nativeFiles, 'readFileSync').mockImplementation(new Proxy(realRead, {
      apply(read, receiver: unknown, args: unknown[]) {
        if (String(args[0]).endsWith('h2-applicability-vocab.json')) throw new Error('simulated read failure');
        return Reflect.apply(read, receiver, args);
      },
    }));
    try {
      expect(() => catalogSearch(loaded, instructions, { instruction_ids: ['alpha'], applicabilityContext: { runtimes: ['node'] } })).toThrow(
        expect.objectContaining({ code: 'CATALOG_INVALID', message: 'cannot read h2-applicability-vocab.json' }),
      );
    } finally {
      io.mockRestore();
      resetApplicabilityConfigCache();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
