import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.js';

type InventoryAccess = Pick<SafeRepositoryAccess, 'fileExists' | 'listFiles' | 'readBytes'>;
export const expectedJavascriptFiles: readonly string[];
export function assertRuntimePackageExports(root: string, access?: InventoryAccess): void;
export function runtimeExecutableInventory(
  root: string,
  shape?: 'source' | 'dist',
  access?: InventoryAccess,
): readonly string[];
