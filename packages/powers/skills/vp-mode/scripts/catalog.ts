import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.ts';
import { FrontmatterError } from './frontmatter.ts';
import { validateAgainstSchema } from './schema.ts';
import type { Schema } from './schema.ts';
import {
  INSTRUCTION_DOMAINS,
  INSTRUCTION_FORMS,
  isClassificationStatus,
  isInstructionClassification,
  isInstructionDomain,
  isInstructionForm,
  parseFacetClassification,
} from './instruction-facets.ts';
import type { ClassificationStatus, InstructionClassification, InstructionDomain, InstructionForm } from './instruction-facets.ts';
import { APPROACH_VOCABULARY, parseApproachAssessments } from './instruction-approaches.ts';
import type { ApproachAssessment } from './instruction-approaches.ts';

export type CatalogErrorCode = 'CATALOG_INVALID' | 'CATALOG_TAG_UNKNOWN' | 'CATALOG_DIGEST_MISMATCH' | 'CATALOG_ID_UNKNOWN' | 'CATALOG_INSTRUCTION_DISABLED' | 'CATALOG_REQUIRED_CONFLICT' | 'CATALOG_PROFILE_CONFLICT' | 'CATALOG_DEPENDENCY_MISSING' | 'CATALOG_DEPENDENCY_DISABLED' | 'CATALOG_BUNDLE_LIMIT_EXCEEDED';

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: CatalogErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CatalogError';
    this.code = code;
    this.details = details;
  }
}

export type Provenance = { donor: string; license: string; revision: string; path: string };
export type Instruction = {
  instruction_id: string; title: string; summary: string;
  capability_tags: string[]; pattern_tags: string[]; roles: string[]; products: string[];
  conditions: { applies_when: string; does_not_apply_when: string };
  artifact_contract: { output_type: string; required_data: string[]; verified_by: string };
  compatibility: { excludes: string[]; requires: string[] };
  provenance: Provenance[]; status: 'active' | 'disabled'; revision: number; content: string;
};
export type LoadedInstruction = Instruction & { classification: InstructionClassification; approach_assessments: ApproachAssessment[] };
export type Catalog = {
  schema: 'VPCatalog/v1'; catalog_id: string; revision: number; source_revision: string; updated_at: string;
  tag_dictionary: { capability: Record<string, string>; pattern: Record<string, string> };
  tag_aliases: Record<string, string>;
  tag_exemptions: { instruction_id: string; dimension: 'capability' | 'pattern'; reason: string }[];
  instructions: { instruction_id: string; path: string; sha256: string }[];
};
export type TagEntry = { tag: string; description: string; aliases: string[] };
export type CatalogTagMatch = { dimension: 'capability' | 'pattern'; tag: string; description: string };
export type InstructionMetadata = { instruction_id: string; title: string; summary: string; capability_tags: string[]; pattern_tags: string[]; revision: number };
export type SearchQuery = {
  capability_tags?: string[]; pattern_tags?: string[]; instruction_ids?: string[]; roles?: string[]; products?: string[]; conditions?: string[];
  instruction_forms?: InstructionForm[]; domains?: InstructionDomain[]; classification_statuses?: ClassificationStatus[];
  approaches?: string[];
};
export type CatalogBrowseGroup<T extends string> = { value: T; count: number; instruction_ids: string[] };
export type CatalogBrowseResult = {
  forms: CatalogBrowseGroup<InstructionForm>[];
  domains: CatalogBrowseGroup<InstructionDomain>[];
  unclassified: { count: number; instruction_ids: string[] };
};
export type DecisionRequest = { operation: string; product?: string; context?: string; tags?: string[]; candidates: string[] };
export type DecisionFallbackReason = 'no-candidates' | 'unknown-candidate' | 'candidate-not-allowed' | 'invalid-format';
export type DecisionResult = { selected: string[]; score: number; rationale: string; provider: 'catalog' | 'agent'; fallback: boolean; fallbackReason: DecisionFallbackReason | null };
export type EffectiveProfile = { schema: 'VPEffectiveProfile/v1'; groups: Record<string, { active: string; alternatives: string[] }>; unresolved_groups?: Record<string, string[]> };
export type ComposeQuery = SearchQuery & { required_ids?: string[]; profile?: EffectiveProfile; role?: string; task_contract?: string; effective_methodology?: string; work_scope?: string; materialization_requirements?: string[]; artifact_references?: string[] };
export type ComposedInstruction = { instruction_id: string; title: string; summary: string; content: string; capability_tags: string[]; pattern_tags: string[]; artifact_contract: Instruction['artifact_contract']; provenance: Provenance[]; selection_reason: 'matched' | 'dependency' | 'required' };
export type ComposedBundle = { catalog_id: string; catalog_revision: number; tag_dictionary: Catalog['tag_dictionary']; instructions: ComposedInstruction[]; role: string; task_contract: string; effective_methodology: string; work_scope: string; materialization_requirements: string[]; artifact_references: string[] };

const instructionSchemaName = 'vpinstruction.v1.2.schema.json';
const approachDeclarations = new Map<string, readonly string[]>(Object.entries(APPROACH_VOCABULARY));
const catalogSchemaName = 'vpcatalog.v1.schema.json';
type CanonicalMethodologyGroup = { id: string; alternatives: string[]; instructionIdsByAlternative: Map<string, string[]>; user_decision: boolean; default?: string };
type CanonicalMethodologyProfile = { schema: 'VPMethodologyProfile/v1'; groups: { id: string; user_decision: boolean; default?: string; alternatives: { id: string; instruction_ids: string[] }[] }[] };
let canonicalMethodologyCache: { fingerprint: string; groups: CanonicalMethodologyGroup[] } | undefined;

function compareNames(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function invalid(message: string, details: Record<string, unknown> = {}): CatalogError {
  return new CatalogError('CATALOG_INVALID', message, details);
}

export async function readSchema(directory: string, name: string): Promise<Schema> {
  let text: string;
  try {
    text = await readFile(join(directory, 'config', name), 'utf8');
  } catch (error) {
    throw invalid(`cannot read ${name}`, { error: error instanceof Error ? error.message : String(error) });
  }
  try {
    return JSON.parse(text) as Schema;
  } catch (error) {
    throw invalid(`${name} is malformed JSON`, { error: error instanceof Error ? error.message : String(error) });
  }
}

function loadCanonicalMethodologyGroups(): CanonicalMethodologyGroup[] {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
  const profilePath = join(packageRoot, 'config', 'methodology-profile.json');
  const schemaPath = join(packageRoot, 'config', 'vpmethodologyprofile.v1.schema.json');
  let profileBytes: Buffer;
  let schemaBytes: Buffer;
  let profileText: string;
  let schemaText: string;
  try {
    profileBytes = readFileSync(profilePath);
    schemaBytes = readFileSync(schemaPath);
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    profileText = decoder.decode(profileBytes);
    schemaText = decoder.decode(schemaBytes);
  } catch (error) {
    throw invalid('cannot read canonical methodology profile or schema', {
      profile_path: profilePath,
      schema_path: schemaPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const fingerprint = createHash('sha256')
    .update(String(profileBytes.length)).update(':').update(profileBytes)
    .update(String(schemaBytes.length)).update(':').update(schemaBytes).digest('hex');
  if (canonicalMethodologyCache?.fingerprint === fingerprint) return canonicalMethodologyCache.groups;
  let profileValue: unknown;
  let schema: Schema;
  try {
    profileValue = JSON.parse(profileText) as unknown;
  } catch (error) {
    throw invalid('canonical methodology profile is malformed JSON', {
      path: profilePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    schema = JSON.parse(schemaText) as Schema;
  } catch (error) {
    throw invalid('canonical methodology profile schema is malformed JSON', {
      path: schemaPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const schemaErrors = validateAgainstSchema(profileValue, schema);
  if (schemaErrors.length > 0) throw invalid('canonical methodology profile schema validation failed', { path: profilePath, schemaErrors });
  const profile = profileValue as CanonicalMethodologyProfile;
  const groupIds = new Set<string>();
  const alternativeOwners = new Map<string, string>();
  const groups = profile.groups.map((group): CanonicalMethodologyGroup => {
    if (groupIds.has(group.id)) throw invalid('canonical methodology profile has duplicate groups', { group: group.id });
    groupIds.add(group.id);
    const alternatives = group.alternatives.map((alternative) => alternative.id);
    if (new Set(alternatives).size !== alternatives.length) throw invalid('canonical methodology profile has duplicate alternatives', { group: group.id, alternatives });
    for (const alternative of alternatives) {
      const previous = alternativeOwners.get(alternative);
      if (previous !== undefined && previous !== group.id) {
        throw invalid('canonical methodology profile alternative belongs to multiple groups', { alternative, groups: [previous, group.id] });
      }
      alternativeOwners.set(alternative, group.id);
    }
    const instructionIdsByAlternative = new Map<string, string[]>();
    for (const alternative of group.alternatives) instructionIdsByAlternative.set(alternative.id, alternative.instruction_ids);
    return { id: group.id, alternatives, instructionIdsByAlternative, user_decision: group.user_decision, ...(group.default === undefined ? {} : { default: group.default }) };
  });
  canonicalMethodologyCache = { fingerprint, groups };
  return groups;
}

export async function loadCatalog(catalogPath: string): Promise<Catalog> {
  const directory = dirname(resolve(catalogPath));
  let text: string;
  try {
    text = await readFile(catalogPath, 'utf8');
  } catch (error) {
    throw invalid('cannot read catalog manifest', { path: catalogPath, error: error instanceof Error ? error.message : String(error) });
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw invalid('catalog JSON is malformed', { error: error instanceof Error ? error.message : String(error) });
  }
  const schema = await readSchema(directory, catalogSchemaName);
  const schemaErrors = validateAgainstSchema(value, schema);
  if (schemaErrors.length > 0) throw invalid('catalog schema validation failed', { schemaErrors });
  const catalog = value as Catalog;
  const ids = new Map<string, string>();
  const paths = new Map<string, string>();
  for (const entry of catalog.instructions) {
    const previousPath = ids.get(entry.instruction_id);
    if (previousPath !== undefined) throw invalid(`duplicate instruction id ${entry.instruction_id}`, { instruction_id: entry.instruction_id, paths: [previousPath, entry.path] });
    const previousId = paths.get(entry.path);
    if (previousId !== undefined) throw invalid(`duplicate instruction path ${entry.path}`, { path: entry.path, instruction_ids: [previousId, entry.instruction_id] });
    ids.set(entry.instruction_id, entry.path);
    paths.set(entry.path, entry.instruction_id);
  }
  for (const [alias, canonical] of Object.entries(catalog.tag_aliases)) {
    if (!(canonical in catalog.tag_dictionary.capability) && !(canonical in catalog.tag_dictionary.pattern)) {
      throw invalid(`tag alias ${alias} points to an unknown canonical tag`, { alias, canonical });
    }
  }
  for (const exemption of catalog.tag_exemptions) {
    if (exemption.reason.trim() === '') throw invalid('tag exemption reason is required', { instruction_id: exemption.instruction_id, dimension: exemption.dimension });
  }
  return catalog;
}

function parseProvenance(value: unknown, instructionId: string): Provenance[] {
  if (!Array.isArray(value)) throw invalid(`invalid provenance for ${instructionId}`, { instruction_id: instructionId });
  return value.map((item): Provenance => {
    if (typeof item !== 'string') throw invalid(`invalid provenance for ${instructionId}`, { instruction_id: instructionId, value: item });
    const match = /^donor=([^;]+); license=([^;]+); revision=([^;]+); path=(.+)$/.exec(item);
    if (match === null) throw invalid(`invalid provenance for ${instructionId}`, { instruction_id: instructionId, value: item });
    const donor = match[1]?.trim() ?? '';
    const license = match[2]?.trim() ?? '';
    const revision = match[3]?.trim() ?? '';
    const path = match[4]?.trim() ?? '';
    if (donor === '' || license === '' || revision === '' || path === '') throw invalid(`invalid provenance for ${instructionId}`, { instruction_id: instructionId, value: item });
    return { donor, license, revision, path };
  });
}

function allowedTag(catalog: Catalog, instructionId: string, dimension: 'capability' | 'pattern', tag: string): boolean {
  if (Object.prototype.hasOwnProperty.call(catalog.tag_dictionary[dimension], tag)) return true;
  const exemption = catalog.tag_exemptions.find((item) => item.instruction_id === instructionId && item.dimension === dimension);
  if (exemption === undefined) throw new CatalogError('CATALOG_TAG_UNKNOWN', `unknown ${dimension} tag ${tag} in ${instructionId}`, { instruction_id: instructionId, dimension, tag });
  if (exemption.reason.trim() === '') throw invalid('tag exemption reason is required', { instruction_id: instructionId, dimension });
  return true;
}

function validateTags(catalog: Catalog, instruction: Instruction): void {
  for (const tag of instruction.capability_tags) allowedTag(catalog, instruction.instruction_id, 'capability', tag);
  for (const tag of instruction.pattern_tags) allowedTag(catalog, instruction.instruction_id, 'pattern', tag);
}

export async function loadInstructions(catalog: Catalog, directory: string): Promise<Map<string, LoadedInstruction>> {
  const schema = await readSchema(directory, instructionSchemaName);
  const instructions = new Map<string, LoadedInstruction>();
  for (const entry of catalog.instructions) {
    let bytes: Buffer;
    try {
      bytes = await readFile(resolve(directory, entry.path));
    } catch (error) {
      throw invalid(`cannot read instruction ${entry.instruction_id}`, { instruction_id: entry.instruction_id, path: entry.path, error: error instanceof Error ? error.message : String(error) });
    }
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== entry.sha256) throw new CatalogError('CATALOG_DIGEST_MISMATCH', `digest mismatch for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, expected: entry.sha256, actual });
    let parsed: ReturnType<typeof parseFrontmatter>;
    try {
      parsed = parseFrontmatter(bytes.toString('utf8'));
    } catch (error) {
      const frontmatterError = error instanceof FrontmatterError ? error : undefined;
      throw invalid(`frontmatter is invalid for ${entry.instruction_id}`, {
        instruction_id: entry.instruction_id,
        message: frontmatterError?.message ?? (error instanceof Error ? error.message : String(error)),
        line: frontmatterError?.line ?? 0,
      });
    }
    if (parsed.data.schema !== 'VPInstruction/v1.2') throw invalid(`unsupported instruction schema marker for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, schema: parsed.data.schema });
    const schemaErrors = validateAgainstSchema(parsed.data, schema);
    if (schemaErrors.length > 0) throw invalid(`instruction schema validation failed for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, schemaErrors });
    if (parsed.data.instruction_id !== entry.instruction_id) throw invalid(`instruction id mismatch for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, actual_id: parsed.data.instruction_id });
    const data = parsed.data;
    const classification = parseFacetClassification(data);
    if (classification === undefined) throw invalid(`instruction classification is invalid for ${entry.instruction_id}`, { instruction_id: entry.instruction_id });
    let approach_assessments: ApproachAssessment[];
    try {
      approach_assessments = parseApproachAssessments(parsed, approachDeclarations);
    } catch (error) {
      throw invalid(`instruction approach assessments are invalid for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, message: error instanceof Error ? error.message : String(error) });
    }
    const instruction: LoadedInstruction = {
      instruction_id: entry.instruction_id,
      title: data.title as string,
      summary: data.summary as string,
      capability_tags: data.capability_tags as string[],
      pattern_tags: data.pattern_tags as string[],
      roles: (data.roles as string[] | undefined) ?? [],
      products: (data.products as string[] | undefined) ?? [],
      conditions: { applies_when: data.conditions_applies_when as string, does_not_apply_when: data.conditions_does_not_apply_when as string },
      artifact_contract: { output_type: data.artifact_contract_output_type as string, required_data: data.artifact_contract_required_data as string[], verified_by: data.artifact_contract_verified_by as string },
      compatibility: { excludes: data.compatibility_excludes as string[], requires: data.compatibility_requires as string[] },
      provenance: parseProvenance(data.provenance, entry.instruction_id),
      status: data.status as 'active' | 'disabled',
      revision: data.revision as number,
      content: parsed.body,
      classification,
      approach_assessments,
    };
    validateTags(catalog, instruction);
    instructions.set(instruction.instruction_id, instruction);
  }
  return instructions;
}

export function catalogTags(catalog: Catalog): { capability: TagEntry[]; pattern: TagEntry[] } {
  const collect = (dimension: 'capability' | 'pattern'): TagEntry[] => Object.entries(catalog.tag_dictionary[dimension])
    .sort(([left], [right]) => compareNames(left, right))
    .map(([tag, description]) => ({
      tag,
      description,
      aliases: Object.entries(catalog.tag_aliases).filter(([, canonical]) => canonical === tag).map(([alias]) => alias).sort(compareNames),
    }));
  return { capability: collect('capability'), pattern: collect('pattern') };
}

function normalizedTagText(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

export function tagTokens(value: string): string[] {
  return value.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
}

export function stemToken(token: string): string {
  if (token.length <= 3 || token.endsWith('ss') || token.endsWith('us') || token.endsWith('is')) return token;
  let value = token;
  if (value.endsWith('ies') && value.length > 4) value = `${value.slice(0, -3)}y`;
  else if (value.endsWith('ing') && value.length > 5) value = value.slice(0, -3);
  else if (value.endsWith('ation') && value.length > 6) value = `${value.slice(0, -5)}at`;
  else if (value.endsWith('ed') && value.length > 4) value = value.slice(0, -2);
  else if (value.endsWith('es') && value.length > 4) value = value.slice(0, -2);
  else if (value.endsWith('s') && value.length > 3) value = value.slice(0, -1);
  if (value.endsWith('e') && value.length > 3) value = value.slice(0, -1);
  return value.replace(/([b-df-hj-np-tv-z])\1$/u, '$1');
}

export function catalogFindTags(
  catalog: Catalog,
  terms: readonly string[],
  match: 'any' | 'all' = 'any',
): CatalogTagMatch[] {
  if (match !== 'any' && match !== 'all') throw invalid('tag match must be any or all', { match });
  const phrases = [...new Set(terms.map(normalizedTagText).filter((term) => term !== ''))];
  const tokens = [...new Set(terms.flatMap(tagTokens).map(stemToken))];
  if (tokens.length === 0) return [];
  const matches: Array<{ rank: number; entry: CatalogTagMatch }> = [];
  for (const dimension of ['capability', 'pattern'] as const) {
    for (const [tag, description] of Object.entries(catalog.tag_dictionary[dimension])) {
      const aliases = Object.entries(catalog.tag_aliases)
        .filter(([, canonical]) => canonical === tag)
        .map(([alias]) => alias);
      const names = [tag, ...aliases];
      const searchable = [...names, description];
      const availableTokens = new Set(searchable.flatMap(tagTokens).map(stemToken));
      const matchedTokenCount = tokens.filter((token) => availableTokens.has(token)).length;
      const selected = match === 'all' ? matchedTokenCount === tokens.length : matchedTokenCount > 0;
      if (!selected) continue;
      const exact = phrases.some((phrase) => names.some((name) => normalizedTagText(name) === phrase));
      matches.push({ rank: exact ? 0 : 1, entry: { dimension, tag, description } });
    }
  }
  return matches
    .sort((left, right) => left.rank - right.rank
      || compareNames(left.entry.dimension, right.entry.dimension)
      || compareNames(left.entry.tag, right.entry.tag))
    .map(({ entry }) => entry);
}

function hasAny(values: string[], selected: string[]): boolean {
  return selected.length === 0 || values.some((value) => selected.includes(value));
}

type FacetQuery = { instructionForms: InstructionForm[]; domains: InstructionDomain[]; classificationStatuses: ClassificationStatus[] };

function facetValues<T extends string>(
  dimension: string,
  value: unknown,
  isAllowed: (candidate: unknown) => candidate is T,
): T[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw invalid(`query dimension ${dimension} must be an array`, { dimension, value });
  if (value.length === 0) throw invalid(`query dimension ${dimension} must not be empty`, { dimension, value });
  const values: T[] = [];
  for (const candidate of value) {
    if (!isAllowed(candidate)) throw invalid(`query dimension ${dimension} contains an unsupported value`, { dimension, value: candidate });
    if (values.includes(candidate)) throw invalid(`query dimension ${dimension} contains a duplicate value`, { dimension, value: candidate });
    values.push(candidate);
  }
  return values;
}

function validateQueryDimensions(query: SearchQuery): FacetQuery {
  const dimensions = ['capability_tags', 'pattern_tags', 'instruction_ids', 'roles', 'products', 'conditions'] as const;
  for (const dimension of dimensions) {
    const value = query[dimension];
    if (value !== undefined && !Array.isArray(value)) throw invalid(`query dimension ${dimension} must be an array`, { dimension, value });
  }
  return {
    instructionForms: facetValues('instruction_forms', query.instruction_forms, isInstructionForm),
    domains: facetValues('domains', query.domains, isInstructionDomain),
    classificationStatuses: facetValues('classification_statuses', query.classification_statuses, isClassificationStatus),
  };
}

function canonicalTags(catalog: Catalog, dimension: 'capability' | 'pattern', values: string[] | undefined): string[] {
  return (values ?? []).map((tag) => {
    const canonical = catalog.tag_aliases[tag] ?? tag;
    if (!Object.prototype.hasOwnProperty.call(catalog.tag_dictionary[dimension], canonical)) {
      throw invalid(`unknown ${dimension} query tag ${tag}; run tags --query <terms> to discover canonical tags`, { tag, dimension });
    }
    return canonical;
  });
}

function containsWord(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Query tokens match literally, including trailing punctuation.
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'iu').test(text);
}

function matchesConditions(instruction: Instruction, conditions: string[] | undefined): boolean {
  return (conditions ?? []).every((token) => containsWord(instruction.conditions.applies_when, token)
    && !containsWord(instruction.conditions.does_not_apply_when, token));
}

export function parseApproachSelectors(values: readonly string[] = []): { dimension: string; value: string }[] {
  const selected = new Map<string, string>();
  for (const item of values) {
    const parts = item.split('=');
    const dimension = parts[0] ?? '';
    const value = parts[1] ?? '';
    if (parts.length !== 2 || !approachDeclarations.get(dimension)?.includes(value)) throw invalid('unsupported approach selector', { selector: item });
    const previous = selected.get(dimension);
    if (previous !== undefined && previous !== value) throw invalid('conflicting approach selectors', { dimension, values: [previous, value] });
    selected.set(dimension, value);
  }
  return [...selected].sort(([a], [b]) => compareNames(a, b)).map(([dimension, value]) => ({ dimension, value }));
}

export function evaluateApproaches(instruction: LoadedInstruction, selectors: ReturnType<typeof parseApproachSelectors>) {
  const dimensions = selectors.map(({ dimension, value }) => {
    const assessment = instruction.approach_assessments.find((item) => item.dimension === dimension);
    return { dimension, value, assessment: assessment ?? null, decision: assessment === undefined ? 'unassessed' : assessment.state === 'declared' ? (assessment.values.includes(value) ? 'match' : 'contradictory') : assessment.state };
  });
  return { included: !dimensions.some((item) => item.decision === 'contradictory'), dimensions };
}

export function catalogSearch(catalog: Catalog, instructions: Map<string, LoadedInstruction>, query: SearchQuery): InstructionMetadata[] {
  const facets = validateQueryDimensions(query);
  const approaches = parseApproachSelectors(query.approaches);
  const capabilities = canonicalTags(catalog, 'capability', query.capability_tags);
  const patterns = canonicalTags(catalog, 'pattern', query.pattern_tags);
  for (const token of query.conditions ?? []) {
    if (token.trim() === '') throw invalid('condition token must not be empty', { token, dimension: 'conditions' });
  }
  const ids = query.instruction_ids ?? [];
  return [...instructions.values()]
    .filter((instruction) => instruction.status === 'active')
    .filter((instruction) => evaluateApproaches(instruction, approaches).included)
    .filter((instruction) => hasAny(instruction.capability_tags, capabilities))
    .filter((instruction) => hasAny(instruction.pattern_tags, patterns))
    .filter((instruction) => ids.length === 0 || ids.includes(instruction.instruction_id))
    .filter((instruction) => instruction.roles.length === 0 || hasAny(instruction.roles, query.roles ?? []))
    .filter((instruction) => instruction.products.length === 0 || hasAny(instruction.products, query.products ?? []))
    .filter((instruction) => matchesConditions(instruction, query.conditions))
    .filter((instruction) => facets.instructionForms.length === 0 || (instruction.classification.classification_status === 'classified' && facets.instructionForms.includes(instruction.classification.instruction_form)))
    .filter((instruction) => {
      if (facets.domains.length === 0) return true;
      const classification = instruction.classification;
      return classification.classification_status === 'classified' && facets.domains.some((domain) => classification.domains.includes(domain));
    })
    .filter((instruction) => facets.classificationStatuses.length === 0 || facets.classificationStatuses.includes(instruction.classification.classification_status))
    .sort((left, right) => compareNames(left.instruction_id, right.instruction_id))
    .map(({ instruction_id, title, summary, capability_tags, pattern_tags, revision }) => ({ instruction_id, title, summary, capability_tags, pattern_tags, revision }));
}

export function catalogSearchWithProfile(
  catalog: Catalog,
  instructions: Map<string, LoadedInstruction>,
  query: SearchQuery,
  profile: EffectiveProfile,
): InstructionMetadata[] {
  validateProfile(profile);
  const { approaches, ...ordinaryQuery } = query;
  const selectors = parseApproachSelectors(approaches);
  const matches = catalogSearch(catalog, instructions, ordinaryQuery);
  const selected = new Map<string, { instruction: LoadedInstruction; reason: ComposedInstruction['selection_reason'] }>();
  const results: InstructionMetadata[] = [];
  for (const metadata of matches) {
    const instruction = activeInstruction(instructions, metadata.instruction_id);
    if (!evaluateApproaches(instruction, selectors).included) continue;
    const unresolved = unresolvedProfileConflictFor(instruction, profile);
    if (unresolved !== undefined) requireProfileResolution(unresolved, { instruction_id: instruction.instruction_id });
    if (profileConflictFor(instruction, profile) !== undefined) continue;
    selected.set(instruction.instruction_id, { instruction, reason: 'matched' });
    results.push(metadata);
  }
  validateCanonicalPolicySelection(selected, profile);
  return results;
}

export function catalogBrowse(catalog: Catalog, instructions: Map<string, LoadedInstruction>, approaches: string[] = []): CatalogBrowseResult {
  const selectors = parseApproachSelectors(approaches);
  const formIds = new Map<InstructionForm, Set<string>>();
  const domainIds = new Map<InstructionDomain, Set<string>>();
  for (const form of INSTRUCTION_FORMS) formIds.set(form, new Set<string>());
  for (const domain of INSTRUCTION_DOMAINS) domainIds.set(domain, new Set<string>());
  const unclassifiedIds = new Set<string>();
  const listedIds = new Set<string>();
  for (const entry of catalog.instructions) {
    const id = entry.instruction_id;
    if (typeof id !== 'string' || id.trim() === '' || listedIds.has(id)) throw invalid('catalog browse requires unique listed instruction ids', { instruction_id: id });
    listedIds.add(id);
    const instruction = instructions.get(id);
    if (instruction === undefined || instruction.instruction_id !== id) throw invalid('catalog browse requires a loaded instruction for every listed id', { instruction_id: id });
    if (instruction.status !== 'active' && instruction.status !== 'disabled') throw invalid('catalog browse found an invalid instruction status', { instruction_id: id, status: instruction.status });
    if (!isInstructionClassification(instruction.classification)) throw invalid('catalog browse found invalid instruction classification', { instruction_id: id });
    if (instruction.status === 'disabled') continue;
    if (!evaluateApproaches(instruction, selectors).included) continue;
    switch (instruction.classification.classification_status) {
      case 'classified': {
        const formGroup = formIds.get(instruction.classification.instruction_form);
        if (formGroup === undefined) throw invalid('catalog browse found an unsupported instruction form', { instruction_id: id });
        formGroup.add(id);
        for (const domain of instruction.classification.domains) {
          const domainGroup = domainIds.get(domain);
          if (domainGroup === undefined) throw invalid('catalog browse found an unsupported instruction domain', { instruction_id: id, domain });
          domainGroup.add(id);
        }
        break;
      }
      case 'unclassified':
        unclassifiedIds.add(id);
        break;
    }
  }
  const groups = <T extends string>(source: Map<T, Set<string>>): CatalogBrowseGroup<T>[] => [...source.entries()]
    .sort(([left], [right]) => compareNames(left, right))
    .map(([value, ids]) => {
      const instruction_ids = [...ids].sort(compareNames);
      return { value, count: instruction_ids.length, instruction_ids };
    });
  const unclassifiedInstructionIds = [...unclassifiedIds].sort(compareNames);
  return {
    forms: groups(formIds),
    domains: groups(domainIds),
    unclassified: { count: unclassifiedInstructionIds.length, instruction_ids: unclassifiedInstructionIds },
  };
}

function decisionFallback(fallbackReason: DecisionFallbackReason, rationale: string): DecisionResult {
  return { selected: [], score: 0, rationale, provider: 'agent', fallback: true, fallbackReason };
}

export function decisionEvaluate(catalog: Catalog, instructions: Map<string, LoadedInstruction>, request: DecisionRequest): DecisionResult {
  if (typeof request !== 'object' || request === null) {
    return decisionFallback('invalid-format', 'Request is malformed: request must be an object.');
  }
  const malformed: string[] = [];
  if (typeof request.operation !== 'string' || request.operation.trim() === '') malformed.push('operation must be a non-empty string');
  if (!Array.isArray(request.candidates)) malformed.push('candidates must be an array');
  else if (request.candidates.some((candidate) => typeof candidate !== 'string')) malformed.push('candidates must contain only strings');
  if (request.tags !== undefined && (!Array.isArray(request.tags) || request.tags.some((tag) => typeof tag !== 'string'))) {
    malformed.push('tags must be an array of strings');
  }
  if (request.product !== undefined && typeof request.product !== 'string') malformed.push('product must be a string when present');
  if (request.context !== undefined && typeof request.context !== 'string') malformed.push('context must be a string when present');
  if (malformed.length > 0) return decisionFallback('invalid-format', `Request is malformed: ${malformed.join('; ')}.`);
  const candidates = request.candidates;
  const tags = request.tags ?? [];
  if (candidates.length === 0) return decisionFallback('no-candidates', `Operation "${request.operation}" has no candidates; the agent must decide.`);
  const manifestIds = new Set(catalog.instructions.map((entry) => entry.instruction_id));
  const unknown = candidates.find((id) => !manifestIds.has(id));
  if (unknown !== undefined) return decisionFallback('unknown-candidate', `Candidate "${unknown}" is not in the catalog; the agent must decide.`);
  const disallowed = candidates.find((id) => {
    const instruction = instructions.get(id);
    return instruction === undefined || instruction.status !== 'active';
  });
  if (disallowed !== undefined) return decisionFallback('candidate-not-allowed', `Candidate "${disallowed}" is not admissible; the agent must decide.`);

  const requestedTags: string[] = [];
  const unknownTags: string[] = [];
  for (const tag of tags) {
    const canonical = catalog.tag_aliases[tag] ?? tag;
    if (Object.prototype.hasOwnProperty.call(catalog.tag_dictionary.capability, canonical)
      || Object.prototype.hasOwnProperty.call(catalog.tag_dictionary.pattern, canonical)) requestedTags.push(canonical);
    else unknownTags.push(tag);
  }
  if (unknownTags.length > 0) return decisionFallback('invalid-format', `Request is malformed: unknown tag${unknownTags.length === 1 ? '' : 's'} ${unknownTags.map((tag) => `"${tag}"`).join(', ')}.`);
  const uniqueTags = [...new Set(requestedTags)];
  const ranked = [...new Set(candidates)]
    .map((id) => instructions.get(id))
    .filter((instruction): instruction is LoadedInstruction => instruction !== undefined)
    .map((instruction) => ({
      instruction,
      matchedTags: uniqueTags.filter((tag) => instruction.capability_tags.includes(tag) || instruction.pattern_tags.includes(tag)),
    }))
    .filter(({ matchedTags }) => uniqueTags.length === 0 || matchedTags.length > 0)
    .sort((left, right) => compareNames(left.instruction.instruction_id, right.instruction.instruction_id));
  const score = ranked.reduce((best, item) => Math.max(best, item.matchedTags.length), 0);
  const tagText = tags.length === 0 ? 'no tags' : `tags [${tags.join(', ')}]`;
  const productText = request.product === undefined ? '' : ` for product "${request.product}"`;
  const contextText = request.context === undefined ? '' : ` in context "${request.context}"`;
  const rationale = `Operation "${request.operation}" requested ${tagText}${productText}${contextText}; evaluated ${candidates.length} candidates and shortlisted ${ranked.length}; matched ${score} of ${uniqueTags.length} requested tags; score is uncalibrated.`;
  return {
    selected: ranked.map(({ instruction }) => instruction.instruction_id),
    score,
    rationale,
    provider: 'catalog',
    fallback: false,
    fallbackReason: null,
  };
}

function activeInstruction(instructions: Map<string, LoadedInstruction>, id: string): LoadedInstruction {
  const instruction = instructions.get(id);
  if (instruction === undefined) throw new CatalogError('CATALOG_ID_UNKNOWN', `unknown instruction id: ${id}`, { instruction_id: id });
  if (instruction.status === 'disabled') throw new CatalogError('CATALOG_INSTRUCTION_DISABLED', `instruction is disabled: ${id}`, { instruction_id: id });
  return instruction;
}

export function catalogGet(_catalog: Catalog, instructions: Map<string, LoadedInstruction>, id: string): Instruction {
  const instruction = activeInstruction(instructions, id);
  return {
    instruction_id: instruction.instruction_id,
    title: instruction.title,
    summary: instruction.summary,
    capability_tags: instruction.capability_tags,
    pattern_tags: instruction.pattern_tags,
    roles: instruction.roles,
    products: instruction.products,
    conditions: instruction.conditions,
    artifact_contract: instruction.artifact_contract,
    compatibility: instruction.compatibility,
    provenance: instruction.provenance,
    status: instruction.status,
    revision: instruction.revision,
    content: instruction.content,
  };
}

function addSelected(selected: Map<string, { instruction: LoadedInstruction; reason: ComposedInstruction['selection_reason'] }>, instruction: LoadedInstruction, reason: ComposedInstruction['selection_reason']): void {
  const existing = selected.get(instruction.instruction_id);
  if (existing === undefined || reason === 'required') selected.set(instruction.instruction_id, { instruction, reason });
}

function profileDrops(instruction: LoadedInstruction, query: ComposeQuery): boolean {
  return profileConflictFor(instruction, query.profile) !== undefined;
}

function profileConflictFor(instruction: LoadedInstruction, profile: EffectiveProfile | undefined): { group: string; active: string } | undefined {
  if (profile === undefined) return undefined;
  for (const [group, choice] of Object.entries(profile.groups)) {
    if (instruction.pattern_tags.some((tag) => choice.alternatives.includes(tag) && tag !== choice.active)) return { group, active: choice.active };
  }
  return undefined;
}

function unresolvedProfileConflictFor(instruction: LoadedInstruction, profile: EffectiveProfile | undefined): { group: string; alternatives: string[] } | undefined {
  if (profile === undefined) return undefined;
  for (const [group, alternatives] of Object.entries(profile.unresolved_groups ?? {})) {
    if (instruction.pattern_tags.some((tag) => alternatives.includes(tag))) return { group, alternatives };
  }
  return undefined;
}

function requireProfileResolution(
  conflict: { group: string; alternatives: string[] },
  context: { instruction_id?: string; dependency_id?: string; requiring_instruction_id?: string },
): never {
  throw new CatalogError(
    'CATALOG_PROFILE_CONFLICT',
    `policy group ${conflict.group} is unresolved; request a user choice before composing`,
    { group: conflict.group, resolution_required: true, alternatives: conflict.alternatives, ...context },
  );
}

function sameAlternatives(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false;
  const actualSorted = [...actual].sort(compareNames);
  const expectedSorted = [...expected].sort(compareNames);
  return actualSorted.every((tag, index) => tag === expectedSorted[index]);
}

function requireCanonicalProfileRefresh(group: string, expected: string[], actual: string[], details: Record<string, unknown> = {}): never {
  throw new CatalogError(
    'CATALOG_PROFILE_CONFLICT',
    `effective profile does not contain the current alternatives for ${group}; refresh it with vp-setup`,
    {
      group,
      expected_alternatives: expected,
      actual_alternatives: actual,
      resolution_required: true,
      profile_refresh_required: true,
      ...details,
    },
  );
}

function validateProfile(profile: EffectiveProfile | undefined): void {
  if (profile === undefined) return;
  if (profile.unresolved_groups === undefined) {
    throw new CatalogError('CATALOG_PROFILE_CONFLICT', 'effective profile is missing unresolved-group state; refresh it with vp-setup', {
      resolution_required: true,
      profile_refresh_required: true,
    });
  }
  for (const [group, choice] of Object.entries(profile.groups)) {
    if (!choice.alternatives.includes(choice.active)) throw new CatalogError('CATALOG_PROFILE_CONFLICT', `active profile pattern is not an alternative in ${group}`, { group, active: choice.active });
  }
  for (const [group, alternatives] of Object.entries(profile.unresolved_groups ?? {})) {
    if (profile.groups[group] !== undefined || !Array.isArray(alternatives) || alternatives.length === 0
      || alternatives.some((tag) => typeof tag !== 'string' || tag.length === 0)
      || new Set(alternatives).size !== alternatives.length) {
      throw new CatalogError('CATALOG_PROFILE_CONFLICT', `unresolved profile group is invalid: ${group}`, { group });
    }
  }

  const canonicalGroups = loadCanonicalMethodologyGroups();
  const canonicalById = new Map(canonicalGroups.map((group) => [group.id, group]));
  for (const [groupId, choice] of Object.entries(profile.groups)) {
    const activePolicy = canonicalGroups.find((group) => !group.user_decision && group.alternatives.includes(choice.active));
    if (activePolicy !== undefined && choice.active !== activePolicy.default) {
      requireCanonicalProfileRefresh(activePolicy.id, activePolicy.alternatives, choice.alternatives, { active: choice.active, expected_active: activePolicy.default });
    }
    const canonical = canonicalById.get(groupId);
    if (canonical === undefined || !sameAlternatives(choice.alternatives, canonical.alternatives)) {
      requireCanonicalProfileRefresh(groupId, canonical?.alternatives ?? [], choice.alternatives);
    }
  }
  for (const [groupId, alternatives] of Object.entries(profile.unresolved_groups)) {
    const canonical = canonicalById.get(groupId);
    if (canonical === undefined || !sameAlternatives(alternatives, canonical.alternatives)) {
      requireCanonicalProfileRefresh(groupId, canonical?.alternatives ?? [], alternatives);
    }
  }
}

function validateCanonicalPolicySelection(
  selected: Map<string, { instruction: LoadedInstruction; reason: ComposedInstruction['selection_reason'] }>,
  profile: EffectiveProfile | undefined,
): void {
  const canonicalGroups = loadCanonicalMethodologyGroups();
  const alternativesByTag = new Map<string, CanonicalMethodologyGroup>();
  for (const group of canonicalGroups) {
    for (const alternative of group.alternatives) alternativesByTag.set(alternative, group);
  }
  const selectedByGroup = new Map<string, { group: CanonicalMethodologyGroup; alternatives: Set<string>; instructionIds: Set<string> }>();
  for (const { instruction } of selected.values()) {
    for (const tag of instruction.pattern_tags) {
      const group = alternativesByTag.get(tag);
      if (group === undefined) continue;
      let entry = selectedByGroup.get(group.id);
      if (entry === undefined) {
        entry = { group, alternatives: new Set<string>(), instructionIds: new Set<string>() };
        selectedByGroup.set(group.id, entry);
      }
      entry.alternatives.add(tag);
      entry.instructionIds.add(instruction.instruction_id);
    }
  }
  for (const [groupId, entry] of selectedByGroup) {
    if (!entry.group.user_decision && [...entry.alternatives].some((alternative) => alternative !== entry.group.default)) {
      throw new CatalogError('CATALOG_PROFILE_CONFLICT', `selection violates non-negotiable policy ${groupId}`, {
        group: groupId, selected_alternatives: [...entry.alternatives].sort(compareNames), expected_active: entry.group.default,
        instruction_ids: [...entry.instructionIds].sort(compareNames),
      });
    }
    const matchingResolved = profile === undefined
      ? undefined
      : Object.values(profile.groups).find((choice) => sameAlternatives(choice.alternatives, entry.group.alternatives));
    const matchingUnresolved = profile === undefined
      ? undefined
      : Object.values(profile.unresolved_groups ?? {}).find((alternatives) => sameAlternatives(alternatives, entry.group.alternatives));
    if (profile !== undefined && entry.group.user_decision && matchingResolved === undefined && matchingUnresolved === undefined) {
      requireCanonicalProfileRefresh(groupId, entry.group.alternatives, [], {
        instruction_ids: [...entry.instructionIds].sort(compareNames),
      });
    }
    if (entry.alternatives.size <= 1) continue;
    if (entry.alternatives.size > 1) {
      if (profile === undefined) {
        throw new CatalogError(
          'CATALOG_PROFILE_CONFLICT',
          `conflicting alternatives in ${groupId} require an effective profile from vp-setup`,
          {
            group: groupId,
            alternatives: entry.group.alternatives,
            selected_alternatives: [...entry.alternatives].sort(compareNames),
            instruction_ids: [...entry.instructionIds].sort(compareNames),
            resolution_required: true,
            profile_required: true,
            profile_refresh_required: true,
          },
        );
      }
      if (matchingUnresolved !== undefined) requireProfileResolution({ group: groupId, alternatives: matchingUnresolved }, {});
      throw new CatalogError('CATALOG_PROFILE_CONFLICT', `conflicting alternatives remain selected in ${groupId}`, {
        group: groupId,
        alternatives: entry.group.alternatives,
        selected_alternatives: [...entry.alternatives].sort(compareNames),
        instruction_ids: [...entry.instructionIds].sort(compareNames),
        resolution_required: true,
      });
    }
  }
}

function checkExcludes(selected: Map<string, { instruction: LoadedInstruction; reason: ComposedInstruction['selection_reason'] }>): void {
  const values = [...selected.values()].map((item) => item.instruction).sort((left, right) => compareNames(left.instruction_id, right.instruction_id));
  for (let index = 0; index < values.length; index += 1) {
    const left = values[index];
    if (left === undefined) continue;
    for (let otherIndex = index + 1; otherIndex < values.length; otherIndex += 1) {
      const right = values[otherIndex];
      if (right === undefined) continue;
      if (left.compatibility.excludes.includes(right.instruction_id) || right.compatibility.excludes.includes(left.instruction_id)) {
        const ids = [left.instruction_id, right.instruction_id];
        throw new CatalogError('CATALOG_REQUIRED_CONFLICT', `instructions ${ids[0]} and ${ids[1]} exclude each other`, { instruction_ids: ids });
      }
    }
  }
}

export function catalogCompose(catalog: Catalog, instructions: Map<string, LoadedInstruction>, query: ComposeQuery): ComposedBundle {
  const facets = validateQueryDimensions(query);
  const selectors = parseApproachSelectors(query.approaches);
  const requireApproach = (instruction: LoadedInstruction, requiring?: string): void => {
    const decision = evaluateApproaches(instruction, selectors);
    if (!decision.included) throw new CatalogError('CATALOG_REQUIRED_CONFLICT', `instruction ${instruction.instruction_id} conflicts with approach selector`, { instruction_id: instruction.instruction_id, ...(requiring === undefined ? {} : { requiring_instruction_id: requiring }), dimensions: decision.dimensions });
  };
  validateProfile(query.profile);
  const selected = new Map<string, { instruction: LoadedInstruction; reason: ComposedInstruction['selection_reason'] }>();
  for (const id of query.required_ids ?? []) { const instruction = activeInstruction(instructions, id); requireApproach(instruction); addSelected(selected, instruction, 'required'); }
  const supplied = (value: string[] | undefined): boolean => Array.isArray(value) && value.length > 0;
  const hasSelectionDimension = supplied(query.capability_tags) || supplied(query.pattern_tags) || supplied(query.instruction_ids)
    || supplied(query.roles) || supplied(query.products) || supplied(query.conditions)
    || facets.instructionForms.length > 0 || facets.domains.length > 0 || facets.classificationStatuses.length > 0;
  if (hasSelectionDimension) {
    for (const metadata of catalogSearch(catalog, instructions, query)) {
      const instruction = instructions.get(metadata.instruction_id);
      if (instruction !== undefined) addSelected(selected, instruction, 'matched');
    }
  }
  for (const id of query.required_ids ?? []) {
    const instruction = instructions.get(id);
    const unresolvedConflict = instruction === undefined ? undefined : unresolvedProfileConflictFor(instruction, query.profile);
    if (unresolvedConflict !== undefined) requireProfileResolution(unresolvedConflict, { instruction_id: id });
    const conflict = instruction === undefined ? undefined : profileConflictFor(instruction, query.profile);
    if (conflict !== undefined) throw new CatalogError('CATALOG_PROFILE_CONFLICT', `required instruction ${id} conflicts with profile ${conflict.group}`, { ...conflict, instruction_id: id });
  }
  for (const item of [...selected.values()]) {
    const unresolvedConflict = unresolvedProfileConflictFor(item.instruction, query.profile);
    if (unresolvedConflict !== undefined) requireProfileResolution(unresolvedConflict, { instruction_id: item.instruction.instruction_id });
    if (item.reason === 'matched' && profileDrops(item.instruction, query)) selected.delete(item.instruction.instruction_id);
  }
  const pending = [...selected.values()].map((item) => item.instruction);
  let canonicalGroupsForSubstitution: CanonicalMethodologyGroup[] | undefined;
  for (let index = 0; index < pending.length; index += 1) {
    const instruction = pending[index];
    if (instruction === undefined) continue;
    for (const dependencyId of instruction.compatibility.requires) {
      const dependency = instructions.get(dependencyId);
      if (dependency === undefined) throw new CatalogError('CATALOG_DEPENDENCY_MISSING', `dependency ${dependencyId} required by ${instruction.instruction_id} is missing`, { instruction_id: instruction.instruction_id, dependency_id: dependencyId });
      if (dependency.status === 'disabled') throw new CatalogError('CATALOG_DEPENDENCY_DISABLED', `dependency ${dependencyId} required by ${instruction.instruction_id} is disabled`, { instruction_id: instruction.instruction_id, dependency_id: dependencyId });
      const unresolvedConflict = unresolvedProfileConflictFor(dependency, query.profile);
      if (unresolvedConflict !== undefined) requireProfileResolution(unresolvedConflict, { dependency_id: dependencyId, requiring_instruction_id: instruction.instruction_id });
      const profileConflict = profileConflictFor(dependency, query.profile);
      if (profileConflict !== undefined) {
        const canonicalGroup = (canonicalGroupsForSubstitution ??= loadCanonicalMethodologyGroups()).find((group) => group.id === profileConflict.group);
        const mappedIds = canonicalGroup?.instructionIdsByAlternative.get(profileConflict.active);
        const activeInstructions: LoadedInstruction[] = [];
        let completeMapping = mappedIds !== undefined && mappedIds.length > 0;
        for (const id of mappedIds ?? []) {
          const active = instructions.get(id);
          if (active === undefined || active.status !== 'active' || !active.pattern_tags.includes(profileConflict.active)) {
            completeMapping = false;
            break;
          }
          activeInstructions.push(active);
        }
        if (!completeMapping) throw new CatalogError('CATALOG_PROFILE_CONFLICT', `active profile pattern ${profileConflict.active} has no instruction in ${profileConflict.group}`, { ...profileConflict, dependency_id: dependencyId, requiring_instruction_id: instruction.instruction_id });
        for (const active of activeInstructions) {
          requireApproach(active, instruction.instruction_id);
          const unresolvedActiveConflict = unresolvedProfileConflictFor(active, query.profile);
          if (unresolvedActiveConflict !== undefined) requireProfileResolution(unresolvedActiveConflict, { dependency_id: active.instruction_id, requiring_instruction_id: instruction.instruction_id });
          if (!selected.has(active.instruction_id)) {
            addSelected(selected, active, 'dependency');
            pending.push(active);
          }
        }
      } else {
        requireApproach(dependency, instruction.instruction_id);
        if (!selected.has(dependencyId)) {
          addSelected(selected, dependency, 'dependency');
          pending.push(dependency);
        }
      }
    }
  }
  validateCanonicalPolicySelection(selected, query.profile);
  checkExcludes(selected);
  const composed = [...selected.values()]
    .sort((left, right) => compareNames(left.instruction.instruction_id, right.instruction.instruction_id))
    .map(({ instruction, reason }) => ({
      instruction_id: instruction.instruction_id,
      title: instruction.title,
      summary: instruction.summary,
      content: instruction.content,
      capability_tags: instruction.capability_tags,
      pattern_tags: instruction.pattern_tags,
      artifact_contract: instruction.artifact_contract,
      provenance: instruction.provenance,
      selection_reason: reason,
    }));
  const instructionTextBytes = composed.reduce((total, instruction) => total + Buffer.byteLength(instruction.content, 'utf8'), 0);
  if (composed.length > 20 || instructionTextBytes > 64_000) {
    throw new CatalogError('CATALOG_BUNDLE_LIMIT_EXCEEDED', 'composed bundle exceeds the session instruction limit', {
      instruction_count: composed.length,
      max_instructions: 20,
      instruction_text_bytes: instructionTextBytes,
      max_instruction_text_bytes: 64_000,
    });
  }
  return {
    catalog_id: catalog.catalog_id,
    catalog_revision: catalog.revision,
    tag_dictionary: catalog.tag_dictionary,
    instructions: composed,
    role: query.role ?? '',
    task_contract: query.task_contract ?? '',
    effective_methodology: query.effective_methodology ?? '',
    work_scope: query.work_scope ?? '',
    materialization_requirements: query.materialization_requirements ?? [],
    artifact_references: query.artifact_references ?? [],
  };
}
