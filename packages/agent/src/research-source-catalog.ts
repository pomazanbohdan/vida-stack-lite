import type { ResearchResult, ResearchSourceRef } from './research-decision.js';
import { canonicalJson, canonicalJsonDigest } from './contracts/public-ingress.js';

export interface ResearchResultRef {
  readonly result_id: string;
  readonly digest: string;
}

export interface QualifiedResearchSource {
  readonly key: string;
  readonly result_id: string;
  readonly result_digest: string;
  readonly source: ResearchSourceRef;
}

const compareIds = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

/** A citation names one source in one immutable predecessor result. */
export function qualifiedResearchSourceCatalog(
  references: readonly ResearchResultRef[],
  results: readonly ResearchResult[],
): readonly QualifiedResearchSource[] {
  const sorted = [...references].sort((left, right) => compareIds(left.result_id, right.result_id));
  if (
    references.length === 0 ||
    references.some(
      (reference, index) =>
        reference.result_id !== sorted[index]?.result_id || reference.digest !== sorted[index]?.digest,
    ) ||
    new Set(references.map((reference) => reference.result_id)).size !== references.length ||
    results.length !== references.length
  )
    throw new Error('research source catalog: predecessor set is missing, duplicate or unsorted');
  const byId = new Map(results.map((result) => [result.result_id, result]));
  if (byId.size !== results.length) throw new Error('research source catalog: duplicate predecessor result');
  return references.flatMap((reference, index) => {
    const result = byId.get(reference.result_id);
    if (!result || result.digest !== reference.digest)
      throw new Error('research source catalog: predecessor digest differs');
    if (new Set(result.source_refs.map((source) => source.source_id)).size !== result.source_refs.length)
      throw new Error('research source catalog: duplicate local source ID');
    return result.source_refs.map((source) => ({
      key: `r${index}:${source.source_id}`,
      result_id: result.result_id,
      result_digest: result.digest,
      source,
    }));
  });
}

export function resolveQualifiedResearchSource(
  catalog: readonly QualifiedResearchSource[],
  key: string,
): QualifiedResearchSource {
  if (!/^r(?:0|[1-9][0-9]*):[^\s]+$/.test(key)) throw new Error('research source catalog: citation is not qualified');
  const matches = catalog.filter((entry) => entry.key === key);
  if (matches.length !== 1) throw new Error('research source catalog: citation is unknown or ambiguous');
  return matches[0]!;
}

/** Used only by the explicit artifact reconciler, never by normal synthesis readers. */
export function qualifyLegacySynthesisCitations<
  T extends {
    findings: readonly { source_refs: readonly string[] }[];
    conflicts: readonly { source_refs: readonly string[] }[];
    options: readonly { evidence_refs: readonly string[] }[];
    recommendation: { evidence_refs: readonly string[] } | null;
  },
>(value: T, catalog: readonly QualifiedResearchSource[]): T {
  const qualify = (alias: string): string => {
    const candidates = catalog.filter(({ source }) => source.source_id === alias);
    if (candidates.length === 0) throw new Error('research source catalog: legacy citation has no predecessor source');
    const identity = canonicalJson(candidates[0]!.source);
    if (candidates.some(({ source }) => canonicalJson(source) !== identity))
      throw new Error('research source catalog: legacy citation has conflicting provenance');
    return candidates[0]!.key;
  };
  const next = structuredClone(value);
  next.findings = next.findings.map((entry) => ({ ...entry, source_refs: entry.source_refs.map(qualify) }));
  next.conflicts = next.conflicts.map((entry) => ({ ...entry, source_refs: entry.source_refs.map(qualify) }));
  next.options = next.options.map((entry) => ({ ...entry, evidence_refs: entry.evidence_refs.map(qualify) }));
  if (next.recommendation)
    next.recommendation = {
      ...next.recommendation,
      evidence_refs: next.recommendation.evidence_refs.map(qualify),
    };
  return next;
}

export function qualifyLegacySynthesisRecord<
  T extends Parameters<typeof qualifyLegacySynthesisCitations>[0] & {
    digest: string;
  },
>(record: T, catalog: readonly QualifiedResearchSource[]): T {
  const qualified = qualifyLegacySynthesisCitations(record, catalog);
  const { digest: _old, ...body } = qualified;
  return { ...qualified, digest: canonicalJsonDigest(body) };
}
