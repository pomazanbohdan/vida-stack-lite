import path from 'node:path';
import { expectedJavascriptFiles } from './maintained-source-inventory.ts';
import { readQualityInputs, sha256 } from './bun-coverage-evidence.ts';

type ReceiptEntry = { path: string; bytes: number; sha256: string };

const receiptKeys = [
  'bun_version',
  'declared_node_engine',
  'declaration_runtime',
  'dependency_custody',
  'inputs',
  'outputs',
  'production_entrypoints',
  'schema',
  'schemas',
  'test_issuers_shipped',
  'version',
  'virtual_runtime_entry',
];
const isDigest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEntries(value: unknown, label: string): ReceiptEntry[] {
  if (!Array.isArray(value)) throw new Error(`SDK formation ${label} inventory is invalid.`);
  const seen = new Set<string>();
  return value.map((entry): ReceiptEntry => {
    if (
      !isRecord(entry) ||
      Object.keys(entry).sort().join(',') !== 'bytes,path,sha256' ||
      typeof entry.path !== 'string' ||
      entry.path.length === 0 ||
      entry.path.startsWith('/') ||
      entry.path.includes('\\') ||
      entry.path.split('/').some((part) => part === '' || part === '.' || part === '..') ||
      !Number.isSafeInteger(entry.bytes) ||
      (entry.bytes as number) < 0 ||
      !isDigest(entry.sha256) ||
      seen.has(entry.path)
    )
      throw new Error(`SDK formation ${label} entry is invalid or duplicated.`);
    seen.add(entry.path);
    return { path: entry.path, bytes: entry.bytes as number, sha256: entry.sha256 };
  });
}

function snapshotBytes(source: ReadonlyMap<string, Buffer>, label: string): Map<string, Buffer> {
  const captured = new Map<string, Buffer>();
  for (const [pathname, bytes] of source) {
    if (typeof pathname !== 'string' || pathname.length === 0 || !Buffer.isBuffer(bytes))
      throw new Error(`${label} are not captured bytes: ${pathname}`);
    captured.set(pathname, Buffer.from(bytes));
  }
  return captured;
}

function selectedInputRows(selectedInputs: ReadonlyMap<string, Buffer>): ReceiptEntry[] {
  const rows = [...selectedInputs].map(([pathname, bytes]) => {
    return { path: pathname, bytes: bytes.length, sha256: sha256(bytes) };
  });
  return rows.sort((left, right) => left.path.localeCompare(right.path));
}

function validateSelectedManifest(selectedInputs: ReadonlyMap<string, Buffer>): {
  manifestValue: unknown;
  selectedPin: string;
} {
  const selectedManifestBytes = selectedInputs.get('package.json');
  const selectedPinBytes = selectedInputs.get('.bun-version');
  if (!selectedManifestBytes || !selectedPinBytes)
    throw new Error('Selected SDK formation is missing its manifest or Bun pin.');
  return {
    manifestValue: JSON.parse(Buffer.from(selectedManifestBytes).toString('utf8')) as unknown,
    selectedPin: Buffer.from(selectedPinBytes).toString('utf8').trim(),
  };
}

function validateReceiptInputs(receiptValue: Record<string, unknown>, selectedRows: ReceiptEntry[]): void {
  const inputRows = parseEntries(receiptValue.inputs, 'input').sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  if (
    inputRows.length !== selectedRows.length ||
    inputRows.some((row, index) => {
      const selected = selectedRows[index];
      return !selected || row.path !== selected.path || row.bytes !== selected.bytes || row.sha256 !== selected.sha256;
    })
  )
    throw new Error('SDK formation receipt inputs differ from the selected package formation bytes.');
}

function validateReceiptIdentity(
  receiptValue: Record<string, unknown>,
  manifestValue: unknown,
  selectedPin: string,
): void {
  if (
    !isRecord(manifestValue) ||
    typeof manifestValue.version !== 'string' ||
    !isRecord(manifestValue.engines) ||
    typeof manifestValue.engines.node !== 'string' ||
    receiptValue.version !== manifestValue.version ||
    receiptValue.declared_node_engine !== manifestValue.engines.node ||
    receiptValue.bun_version !== selectedPin
  )
    throw new Error('SDK formation receipt does not match the selected package manifest and Bun pin.');
  const entrypoints: unknown = receiptValue.production_entrypoints;
  if (
    !Array.isArray(entrypoints) ||
    entrypoints.length !== 2 ||
    entrypoints[0] !== 'dist/src/index.js' ||
    entrypoints[1] !== 'dist/src/trusted-host.js'
  )
    throw new Error('SDK formation production entrypoints are invalid.');
}

function hasReceiptEnvelope(receiptValue: Record<string, unknown>): boolean {
  return (
    Object.keys(receiptValue).sort().join(',') === [...receiptKeys].sort().join(',') &&
    receiptValue.schema === 'CandidatePackageBuild/v1' &&
    receiptValue.declaration_runtime === 'bun' &&
    receiptValue.bun_version === Bun.version &&
    receiptValue.test_issuers_shipped === false
  );
}

function hasReceiptCustody(receiptValue: Record<string, unknown>): boolean {
  return (
    receiptValue.dependency_custody ===
      'External node_modules is linked; selected manifest and frozen lock are captured, dependency bytes are outside snapshot custody.' &&
    Number.isSafeInteger(receiptValue.schemas) &&
    (receiptValue.schemas as number) >= 1
  );
}

function hasVirtualRuntimeEntry(receiptValue: Record<string, unknown>): boolean {
  const entry = receiptValue.virtual_runtime_entry;
  return (
    isRecord(entry) &&
    Object.keys(entry).sort().join(',') === 'path,sha256' &&
    entry.path === 'src/runtime.ts' &&
    isDigest(entry.sha256)
  );
}

function isValidFormationReceipt(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && hasReceiptEnvelope(value) && hasReceiptCustody(value) && hasVirtualRuntimeEntry(value);
}

function validateReceiptOutputs(
  receiptValue: Record<string, unknown>,
  artifacts: ReadonlyMap<string, Buffer>,
  outputPaths: string[],
): Map<string, Buffer> {
  const outputRows = parseEntries(receiptValue.outputs, 'output');
  const expected = new Set(outputPaths);
  const javascriptRows = outputRows.filter((entry) => entry.path.endsWith('.js'));
  if (javascriptRows.length !== expected.size || javascriptRows.some((entry) => !expected.has(entry.path)))
    throw new Error('SDK formation receipt does not contain the exact four JavaScript outputs.');

  const captured = new Map<string, Buffer>();
  for (const output of javascriptRows) {
    const bytes = artifacts.get(output.path);
    if (!bytes) throw new Error(`SDK emitted JavaScript is missing: ${output.path}`);
    if (bytes.length !== output.bytes || sha256(bytes) !== output.sha256)
      throw new Error(`SDK emitted JavaScript differs from its formation receipt: ${output.path}`);
    captured.set(output.path, Buffer.from(bytes));
  }
  return captured;
}

function capturedResult(outputPaths: string[], captured: ReadonlyMap<string, Buffer>) {
  return Object.freeze({
    evidence: 'selected-input-inventory-and-output-integrity' as const,
    paths: Object.freeze(outputPaths),
    readBytes(relative: string): Buffer {
      const bytes = captured.get(relative);
      if (!bytes) throw new Error(`SDK emitted JavaScript was not captured: ${relative}`);
      return Buffer.from(bytes);
    },
  });
}

/**
 * Validate one already captured input/output set synchronously, hashing its
 * owned byte snapshot instead of accepting caller-supplied identities.
 */
export function captureSelectedSdkJavascriptOutputsFromCapturedBytes(
  root: string,
  selectedInputs: ReadonlyMap<string, Buffer>,
  artifacts: ReadonlyMap<string, Buffer>,
): ReturnType<typeof capturedResult> {
  if (!path.isAbsolute(root)) throw new Error('SDK artifact capture root must be absolute.');
  const ownedInputs = snapshotBytes(selectedInputs, 'Selected SDK formation input');
  const ownedArtifacts = snapshotBytes(artifacts, 'SDK artifact');
  return validateCapturedSdkJavascriptOutputs(root, ownedInputs, ownedArtifacts, selectedInputRows(ownedInputs));
}

function validateCapturedSdkJavascriptOutputs(
  root: string,
  ownedInputs: ReadonlyMap<string, Buffer>,
  ownedArtifacts: ReadonlyMap<string, Buffer>,
  selectedRows: ReceiptEntry[],
): ReturnType<typeof capturedResult> {
  const outputPaths = expectedJavascriptFiles.map((file) => `dist/src/${file}`).sort();
  const { manifestValue, selectedPin } = validateSelectedManifest(ownedInputs);
  const receiptBytes = ownedArtifacts.get('dist/sdk-formation.json');
  if (!receiptBytes) throw new Error('SDK formation output receipt is missing.');
  const receiptValue: unknown = JSON.parse(receiptBytes.toString('utf8'));
  if (!isValidFormationReceipt(receiptValue)) throw new Error('SDK formation output receipt is invalid.');

  validateReceiptInputs(receiptValue, selectedRows);
  validateReceiptIdentity(receiptValue, manifestValue, selectedPin);
  return capturedResult(outputPaths, validateReceiptOutputs(receiptValue, ownedArtifacts, outputPaths));
}

/**
 * Join emitted JS to one caller-selected, immutable SDK input capture.
 * This establishes input freshness and output integrity, not formation origin
 * authentication or dependency-byte custody.
 */
export async function captureSelectedSdkJavascriptOutputs(
  root: string,
  selectedInputs: ReadonlyMap<string, Buffer>,
): Promise<{
  evidence: 'selected-input-inventory-and-output-integrity';
  paths: readonly string[];
  readBytes(relative: string): Buffer;
}> {
  if (!path.isAbsolute(root)) throw new Error('SDK artifact capture root must be absolute.');
  const outputPaths = expectedJavascriptFiles.map((file) => `dist/src/${file}`).sort();
  // Freeze selected bytes and their identities before awaiting the bounded artifact read.
  const ownedInputs = snapshotBytes(selectedInputs, 'Selected SDK formation input');
  const selectedRows = selectedInputRows(ownedInputs);
  validateSelectedManifest(ownedInputs);
  const artifacts = await readQualityInputs(root, ['dist/sdk-formation.json', ...outputPaths]);
  const ownedArtifacts = snapshotBytes(artifacts, 'SDK artifact');
  return validateCapturedSdkJavascriptOutputs(root, ownedInputs, ownedArtifacts, selectedRows);
}
