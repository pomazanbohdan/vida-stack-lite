import { createHash } from 'node:crypto';
import path from 'node:path';
import { assertLoadedRuntimeConfig, type AgentRuntimeConfig } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';

const MAX_REFS = 16;
const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;
const MAX_EXCERPT_CHARS = 8 * 1024;

export interface ConfiguredContextRequest {
  readonly work_id: string;
  readonly attempt: number;
  readonly source_ids: readonly string[];
  readonly skill_refs: readonly string[];
}

export interface ConfiguredContextEntry {
  readonly id: string;
  readonly kind: 'official' | 'local' | 'skill';
  readonly location: string;
  readonly title: string;
  readonly status: 'unfetched_reference' | 'local_excerpt';
  readonly sha256: string | null;
  readonly bytes: number | null;
  readonly content: string | null;
  readonly truncated: boolean;
}

export interface ConfiguredContext {
  readonly schema: 'ConfiguredContext/v1';
  readonly work_id: string;
  readonly attempt: number;
  readonly entries: readonly ConfiguredContextEntry[];
  readonly digest: string;
}

function requireContext(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`configured context: ${message}`);
}

function canonicalList(values: readonly string[], label: string): readonly string[] {
  requireContext(Array.isArray(values) && values.length <= MAX_REFS, `${label} must be a bounded list`);
  requireContext(
    values.every((value) => typeof value === 'string' && value.length > 0 && value.length <= 512),
    `${label} contains an invalid reference`,
  );
  const sorted = [...values].sort();
  requireContext(new Set(sorted).size === sorted.length, `${label} contains duplicates`);
  return sorted;
}

function canonicalSkillPath(value: string): string {
  requireContext(
    /^\.codex\/skills\/[A-Za-z0-9._-]+\/SKILL\.md$/.test(value) && !value.includes('..'),
    'skill reference is not a configured repository skill path',
  );
  return value;
}

function readLocal(
  access: Pick<SafeRepositoryAccess, 'readBytes'>,
  root: string,
  relative: string,
  usedBytes: { value: number },
): Pick<ConfiguredContextEntry, 'status' | 'sha256' | 'bytes' | 'content' | 'truncated'> {
  const target = path.join(root, relative);
  const first = access.readBytes(target, `configured context ${relative}`);
  requireContext(first.length <= MAX_FILE_BYTES, `${relative} exceeds the per-file limit`);
  usedBytes.value += first.length;
  requireContext(usedBytes.value <= MAX_TOTAL_BYTES, 'local content exceeds the total limit');
  const second = access.readBytes(target, `configured context stable read ${relative}`);
  requireContext(first.equals(second), `${relative} changed during read`);
  const content = new TextDecoder('utf-8', { fatal: true }).decode(first);
  return {
    status: 'local_excerpt',
    sha256: createHash('sha256').update(first).digest('hex'),
    bytes: first.length,
    content: content.slice(0, MAX_EXCERPT_CHARS),
    truncated: content.length > MAX_EXCERPT_CHARS,
  };
}

/** Reads only explicitly selected configured sources and repository-owned skill files. */
export function buildConfiguredContext(
  repositoryRoot: string,
  config: AgentRuntimeConfig,
  request: ConfiguredContextRequest,
): ConfiguredContext {
  const root = path.resolve(repositoryRoot);
  assertLoadedRuntimeConfig(config, root);
  requireContext(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(request.work_id), 'work id is invalid');
  requireContext(Number.isSafeInteger(request.attempt) && request.attempt >= 1, 'attempt is invalid');
  const sourceIds = canonicalList(request.source_ids, 'source ids');
  const skillRefs = canonicalList(request.skill_refs, 'skill refs').map(canonicalSkillPath);
  requireContext(
    sourceIds.length + skillRefs.length > 0 && sourceIds.length + skillRefs.length <= MAX_REFS,
    'selection must contain 1 to 16 references',
  );
  const access = requireSafeRepositoryAccess(root);
  const usedBytes = { value: 0 };
  const entries: ConfiguredContextEntry[] = [];
  for (const id of sourceIds) {
    const matches = config.knowledge.sources.filter((source) => source.id === id);
    requireContext(matches.length === 1, `source id is not unique and configured: ${id}`);
    const source = matches[0]!;
    if (source.kind === 'official') {
      requireContext(/^https:\/\//.test(source.location), `official source is not HTTPS: ${id}`);
      entries.push({
        id,
        kind: 'official',
        location: source.location,
        title: source.title,
        status: 'unfetched_reference',
        sha256: null,
        bytes: null,
        content: null,
        truncated: false,
      });
      continue;
    }
    requireContext(
      /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(source.location) && !source.location.split('/').includes('..'),
      `local source path is unsafe: ${id}`,
    );
    entries.push({
      id,
      kind: 'local',
      location: source.location,
      title: source.title,
      ...readLocal(access, root, source.location, usedBytes),
    });
  }
  for (const location of skillRefs) {
    entries.push({
      id: location,
      kind: 'skill',
      location,
      title: path.basename(path.dirname(location)),
      ...readLocal(access, root, location, usedBytes),
    });
  }
  entries.sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const body = { schema: 'ConfiguredContext/v1' as const, work_id: request.work_id, attempt: request.attempt, entries };
  return { ...body, digest: canonicalJsonDigest(body) };
}
