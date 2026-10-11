import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { isInventorySourceEntry } from '../../tooling/maintained-source-inventory.js';

const initializationBundleEntries = ['templates', 'instructions', 'schemas', 'TESTING.md', 'package.json'] as const;

export function createInitializationBundle(
  packageRoot: string,
  projectRoot: string,
  entries: readonly string[] = initializationBundleEntries,
  bundleDirectory: string = 'vida-agent',
): string {
  const bundleRoot = path.join(projectRoot, bundleDirectory);
  mkdirSync(bundleRoot, { recursive: true });
  for (const entry of entries) {
    cpSync(path.join(packageRoot, entry), path.join(bundleRoot, entry), {
      recursive: true,
      dereference: false,
      filter: (source) => isInventorySourceEntry(path.basename(source)),
    });
  }
  return bundleRoot;
}
