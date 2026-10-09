import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.js';

type InventoryAccess = Pick<SafeRepositoryAccess, 'fileExists' | 'listFiles' | 'readBytes'>;
export const expectedJavascriptFiles: readonly string[];
export function runtimeManifestExecutableInventory(inputs: unknown): string[];
export const bunCoverageSources: readonly string[];
export interface MaintainedSourceInventory {
  readonly typescriptSources: readonly string[];
  readonly binSources: readonly string[];
  readonly v8CoverageSources: readonly string[];
  readonly mutationSources: readonly string[];
  readonly publicBinSources: readonly string[];
  readonly missingPackageSources: readonly string[];
  readonly repositoryOnlySources: readonly string[];
  readonly bunCoverageSources: readonly string[];
  readonly missingBunCoverageSources: readonly string[];
}
export function maintainedSourceInventory(root: string, access?: InventoryAccess): MaintainedSourceInventory;
export function assertRuntimePackageExports(root: string, access?: InventoryAccess): void;
export function runtimeExecutableInventory(
  root: string,
  shape?: 'source' | 'dist',
  access?: InventoryAccess,
): readonly string[];
