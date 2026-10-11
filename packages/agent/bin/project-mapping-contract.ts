import path from 'node:path';
type ProjectMapping = { readonly id: string; readonly root: string };
type ParsedProjectMapping = { readonly id: string; readonly root: string | null };

function requireRelativeProjectRoot(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value)
    throw new Error('Project root must be a non-empty safe repository-relative path');
}

function requirePortableProjectRoot(value: string): void {
  if (path.win32.parse(value).root !== '' || value.includes('\\'))
    throw new Error('Project root must be a non-empty safe repository-relative path');
}

function requireNormalizedProjectRoot(normalized: string): void {
  if (
    normalized !== '.' &&
    (!normalized || normalized.split('/').some((part) => !part || part === '.' || part === '..'))
  )
    throw new Error('Project root must be a non-empty safe repository-relative path');
}

function normalizeProjectRoot(value: unknown): string {
  requireRelativeProjectRoot(value);
  requirePortableProjectRoot(value);
  const normalized = value === '.' ? '.' : value.replace(/\/+$/u, '');
  requireNormalizedProjectRoot(normalized);
  return normalized;
}

function requireMappingText(entry: unknown): asserts entry is string {
  if (typeof entry !== 'string' || !entry) throw new Error('Project mapping must be PROJECT_ID=RELATIVE_ROOT');
}

function splitProjectMapping(entry: string): ParsedProjectMapping {
  const separator = entry.indexOf('=');
  const id = separator < 0 ? entry : entry.slice(0, separator);
  const root = separator < 0 ? null : entry.slice(separator + 1);
  return { id, root };
}

function requireProjectId(id: string): void {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error('Project id must be a lowercase slug of 1–64 characters');
}

function normalizedMappingRoot(root: string | null): string | null {
  return root === null ? null : normalizeProjectRoot(root);
}

function parseProjectMapping(entry: unknown): ParsedProjectMapping {
  requireMappingText(entry);
  const { id, root } = splitProjectMapping(entry);
  requireProjectId(id);
  return { id, root: normalizedMappingRoot(root) };
}

function requireExplicitMultiProjectRoots(mappings: readonly ParsedProjectMapping[]): void {
  if (mappings.length > 1 && mappings.some((entry) => entry.root === null))
    throw new Error('Multi-project initialization requires every --project as PROJECT_ID=RELATIVE_ROOT');
}

function requireUniqueProjectIds(mappings: readonly ProjectMapping[]): void {
  if (new Set(mappings.map((entry) => entry.id)).size !== mappings.length)
    throw new Error('Project ids must be unique');
}

export function projectMappings(value: unknown): ProjectMapping[] {
  const mappings = mappingTexts(value).map(parseProjectMapping);
  requireExplicitMultiProjectRoots(mappings);
  const normalized = mappings.map((entry) => ({ ...entry, root: entry.root ?? '.' }));
  requireUniqueProjectIds(normalized);
  return normalized.sort((left, right) => left.id.localeCompare(right.id));
}

function mappingTexts(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error('Projects must be a non-empty explicit project mapping set');
  const texts: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry: unknown = Object.getOwnPropertyDescriptor(value, index)?.value;
    if (typeof entry !== 'string') throw new Error('Projects must be a non-empty explicit project mapping set');
    texts.push(entry);
  }
  return texts;
}
