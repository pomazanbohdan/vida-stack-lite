import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const initializationBundleEntries = ['templates', 'instructions', 'schemas', 'TESTING.md', 'package.json'] as const;

export function createInitializationBundle(
  packageRoot: string,
  projectRoot: string,
  entries: readonly string[] = initializationBundleEntries,
): string {
  const bundleRoot = path.join(projectRoot, 'vida-agent');
  mkdirSync(bundleRoot, { recursive: true });
  for (const entry of entries) {
    cpSync(path.join(packageRoot, entry), path.join(bundleRoot, entry), { recursive: true, dereference: false });
  }
  return bundleRoot;
}
