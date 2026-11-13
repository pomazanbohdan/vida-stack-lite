import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.ts';
import { FrontmatterError } from './frontmatter.ts';
import { validateAgainstSchema, canonicalJson } from './schema.ts';
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
import { parseApplicability, parseApplicabilityContext } from './applicability.ts';
import type { Applicability, ApplicabilityAliases, ApplicabilityContext, ApplicabilityReason, ApplicabilityResult, ApplicabilityVocab } from './applicability.ts';
import { evaluateApplicability } from './applicability.ts';
import { parseVariantScalar, parseVariantSections } from './variants.ts';
import type { VariantRecord } from './variants.ts';
import { extractModuleBody, parseModule, ModuleError } from './modules.ts';
import type { ModuleRecord } from './modules.ts';
import { resolveResourcePath, ResourcePathError } from './resource-paths.ts';

export type CatalogErrorCode = 'CATALOG_INVALID' | 'CATALOG_TAG_UNKNOWN' | 'CATALOG_DIGEST_MISMATCH' | 'CATALOG_ID_UNKNOWN' | 'CATALOG_INSTRUCTION_DISABLED' | 'CATALOG_REQUIRED_CONFLICT' | 'CATALOG_PROFILE_CONFLICT' | 'CATALOG_DEPENDENCY_MISSING' | 'CATALOG_DEPENDENCY_DISABLED' | 'CATALOG_BUNDLE_LIMIT_EXCEEDED' | 'CATALOG_REQUIRED_SELECTION_UNAVAILABLE' | 'CATALOG_FAMILY_REQUIRES_CONTEXT' | 'CATALOG_MODULE_ATOM_REQUIRED' | 'CATALOG_RESOURCE_UNKNOWN' | 'CATALOG_RESOURCE_DISABLED' | 'CATALOG_RESOURCE_MALFORMED' | 'CATALOG_RESOURCE_SCHEMA_INVALID' | 'CATALOG_RESOURCE_TYPE_MISMATCH' | 'CATALOG_RESOURCE_DIGEST_MISMATCH' | 'CATALOG_RESOURCE_PATH_UNSAFE' | 'CATALOG_RESOURCE_PATH_MISSING' | 'CATALOG_RESOURCE_TOO_LARGE';

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

export type Provenance = { donor: string; license: string; revision: string; path: string; sha256?: string; locator?: string };
export type Instruction = {
  instruction_id: string; title: string; summary: string;
  capability_tags: string[]; pattern_tags: string[]; roles: string[]; products: string[];
  conditions: { applies_when: string; does_not_apply_when: string };
  artifact_contract: { output_type: string; required_data: string[]; verified_by: string };
  compatibility: { excludes: string[]; requires: string[] };
  provenance: Provenance[]; status: 'active' | 'disabled'; revision: number; content: string;
  applicability?: ApplicabilityResult;
  applicabilityDeclaration?: Applicability;
};
export type LoadedInstruction = Instruction & { classification: InstructionClassification; approach_assessments: ApproachAssessment[]; familyId?: string; moduleId?: string; moduleAtoms?: string[]; variants?: LoadedInstruction[] };
export type Catalog = {
  schema: 'VPCatalog/v1'; catalog_id: string; revision: number; source_revision: string; updated_at: string;
  tag_dictionary: { capability: Record<string, string>; pattern: Record<string, string> };
  tag_aliases: Record<string, string>;
  tag_exemptions: { instruction_id: string; dimension: 'capability' | 'pattern'; reason: string }[];
  instructions: { instruction_id: string; path: string; sha256: string }[];
  resources?: { resource_id: string; path: string; sha256: string }[];
};
export type TagEntry = { tag: string; description: string; aliases: string[] };
export type CatalogTagMatch = { dimension: 'capability' | 'pattern'; tag: string; description: string };
export type InstructionMetadata = { instruction_id: string; title: string; summary: string; capability_tags: string[]; pattern_tags: string[]; revision: number; applicability?: ApplicabilityResult; variants?: Array<{ variant_id: string; applicability?: ApplicabilityResult }>; members?: Array<{ atom_id: string; matched: boolean; applicability?: ApplicabilityResult }> };
export type SearchQuery = {
  capability_tags?: string[]; pattern_tags?: string[]; instruction_ids?: string[]; roles?: string[]; products?: string[]; conditions?: string[];
  instruction_forms?: InstructionForm[]; domains?: InstructionDomain[]; classification_statuses?: ClassificationStatus[];
  approaches?: string[]; applicabilityContext?: ApplicabilityContext;
};
export type CatalogBrowseGroup<T extends string> = { value: T; count: number; instruction_ids: string[] };
export type CatalogBrowseResult = {
  forms: CatalogBrowseGroup<InstructionForm>[];
  domains: CatalogBrowseGroup<InstructionDomain>[];
  unclassified: { count: number; instruction_ids: string[] };
};
export type DecisionRequest = { operation: string; product?: string; context?: string; tags?: string[]; candidates: string[]; applicabilityContext?: ApplicabilityContext };
export type DecisionFallbackReason = 'no-candidates' | 'unknown-candidate' | 'candidate-not-allowed' | 'invalid-format' | 'applicability-unresolved';
export type DecisionApplicabilityDiagnostic = { instructionId: string; applicability: 'inapplicable' | 'unresolved'; reason?: ApplicabilityReason; requiredContext?: string[]; sourceLabels?: string[] };
export type DecisionResult = { selected: string[]; score: number; rationale: string; provider: 'catalog' | 'agent'; fallback: boolean; fallbackReason: DecisionFallbackReason | null; diagnostics?: { applicability: DecisionApplicabilityDiagnostic[] } };
export type EffectiveProfile = { schema: 'VPEffectiveProfile/v1'; groups: Record<string, { active: string; alternatives: string[] }>; unresolved_groups?: Record<string, string[]> };
export type ComposeQuery = SearchQuery & { required_ids?: string[]; resource_ids?: string[]; profile?: EffectiveProfile; role?: string; task_contract?: string; effective_methodology?: string; work_scope?: string; materialization_requirements?: string[]; artifact_references?: string[] };
export type ComposedInstruction = { instruction_id: string; family_id?: string; title: string; summary: string; content: string; capability_tags: string[]; pattern_tags: string[]; artifact_contract: Instruction['artifact_contract']; provenance: Provenance[]; selection_reason: 'matched' | 'dependency' | 'required' };
export type ReferenceResourceProvenance = { donor: string; license: string; revision: string; path: string; sha256: string; locator: { line: number; row: number; column?: number } };
export type LoadedReferenceResource = {
  schema: 'VPReferenceResource/v1'; resource_id: string; resource_type: string; revision: number;
  status: 'active' | 'disabled'; provenance: ReferenceResourceProvenance[];
  payload: Record<string, unknown>; digest: string; applicabilityDeclaration?: Applicability;
};
export type ReferenceResourceResult = Omit<LoadedReferenceResource, 'applicabilityDeclaration'> & { applicability?: ApplicabilityResult; untrusted: true };
export type ComposedResource = { resource_id: string; resource_type: string; revision: number; payload: Record<string, unknown>; untrusted: true };
export type ComposedBundle = { catalog_id: string; catalog_revision: number; tag_dictionary: Catalog['tag_dictionary']; instructions: ComposedInstruction[]; resources: ComposedResource[]; omitted: { inapplicable: string[]; unresolved: string[] }; role: string; task_contract: string; effective_methodology: string; work_scope: string; materialization_requirements: string[]; artifact_references: string[] };

const approachDeclarations = new Map<string, readonly string[]>(Object.entries(APPROACH_VOCABULARY));
let applicabilityConfigCache: { vocab: ApplicabilityVocab; aliases: ApplicabilityAliases } | undefined;

function applicabilityConfig(): { vocab: ApplicabilityVocab; aliases: ApplicabilityAliases } {
  if (applicabilityConfigCache !== undefined) return applicabilityConfigCache;
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
  const read = (name: string): unknown => {
    try {
      return JSON.parse(readFileSync(join(packageRoot, 'config', name), 'utf8')) as unknown;
    } catch (error) {
      throw invalid(`cannot read ${name}`, { error: error instanceof Error ? error.message : String(error) });
    }
  };
  const vocab = read('h2-applicability-vocab.json') as ApplicabilityVocab;
  const aliases = read('h2-applicability-aliases.json') as ApplicabilityAliases;
  applicabilityConfigCache = { vocab, aliases };
  return applicabilityConfigCache;
}

export function resetApplicabilityConfigCache(): void {
  applicabilityConfigCache = undefined;
}

function applicabilityFor(instruction: LoadedInstruction, context: ApplicabilityContext | undefined): ApplicabilityResult | undefined {
  if (instruction.applicabilityDeclaration === undefined && context === undefined) return undefined;
  const config = applicabilityConfig();
  return evaluateApplicability(instruction.applicabilityDeclaration, context, config.vocab, config.aliases);
}
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
  const resourceIds = new Map<string, string>();
  const resourcePaths = new Map<string, string>();
  for (const entry of catalog.resources ?? []) {
    const previousPath = resourceIds.get(entry.resource_id);
    if (previousPath !== undefined) throw invalid(`duplicate resource id ${entry.resource_id}`, { resource_id: entry.resource_id, paths: [previousPath, entry.path] });
    const previousId = resourcePaths.get(entry.path);
    if (previousId !== undefined) throw invalid(`duplicate resource path ${entry.path}`, { path: entry.path, resource_ids: [previousId, entry.resource_id] });
    resourceIds.set(entry.resource_id, entry.path);
    resourcePaths.set(entry.path, entry.resource_id);
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

function parseProvenance(value: unknown, instructionId: string, sourceBound = false): Provenance[] {
  if (!Array.isArray(value)) throw invalid(`invalid provenance for ${instructionId}`, { instruction_id: instructionId });
  return value.map((item): Provenance => {
    if (typeof item !== 'string') throw invalid(`invalid provenance for ${instructionId}`, { instruction_id: instructionId, value: item });
    const match = sourceBound
      ? /^donor=([^;]+); license=([^;]+); revision=([0-9a-f]{40}); path=([^;]+?)(?:; sha256=([0-9a-f]{64}))?(?:; locator=([^;]+))?$/.exec(item)
      : /^donor=([^;]+); license=([^;]+); revision=([^;]+); path=(.+?)(?:; sha256=([0-9a-f]{64}))?(?:; locator=([^;]+))?$/.exec(item);
    if (match === null) throw invalid(`invalid provenance for ${instructionId}`, { instruction_id: instructionId, value: item });
    const donor = match[1]?.trim() ?? '';
    const license = match[2]?.trim() ?? '';
    const revision = match[3]?.trim() ?? '';
    const path = match[4]?.trim() ?? '';
    if (donor === '' || license === '' || revision === '' || path === '') throw invalid(`invalid provenance for ${instructionId}`, { instruction_id: instructionId, value: item });
    return { donor, license, revision, path, ...(match[5] === undefined ? {} : { sha256: match[5] }), ...(match[6] === undefined ? {} : { locator: match[6] }) };
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
  const v12Schema = await readSchema(directory, 'vpinstruction.v1.2.schema.json');
  let v2Schema: Schema | undefined;
  let v3Schema: Schema | undefined;
  let moduleSchema: Schema | undefined;
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
    const marker = parsed.data.schema;
    if (marker === 'VPInstructionModule/v1') {
      if (moduleSchema === undefined) moduleSchema = await readSchema(directory, 'vpinstructionmodule.v1.schema.json');
      const schemaErrors = validateAgainstSchema(parsed.data, moduleSchema);
      if (schemaErrors.length > 0) throw invalid(`module schema validation failed for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, schemaErrors });
      if (parsed.data.instruction_id !== entry.instruction_id) throw invalid(`module instruction id mismatch for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, actual_id: parsed.data.instruction_id });
      let module: ReturnType<typeof parseModule>;
      try { module = parseModule(parsed.data as unknown as ModuleRecord, extractModuleBody(bytes.toString('utf8')), entry.instruction_id); }
      catch (error) {
        const moduleError = error instanceof ModuleError ? error : undefined;
        throw invalid(`module carrier is invalid for ${entry.instruction_id}`, {
          instruction_id: entry.instruction_id,
          code: moduleError?.code,
          message: error instanceof Error ? error.message : String(error),
          details: moduleError?.details,
        });
      }
      if (v2Schema === undefined && module.members.some((member) => member.frontmatter.schema === 'VPInstruction/v2')) {
        v2Schema = await readSchema(directory, 'vpinstruction.v2.schema.json');
      }
      const atomInstructions: LoadedInstruction[] = module.members.map((member) => {
        const data = member.frontmatter;
        const activeSchema = data.schema === 'VPInstruction/v2' ? v2Schema! : v12Schema;
        const atomSchemaErrors = validateAgainstSchema(data, activeSchema);
        if (atomSchemaErrors.length > 0) throw invalid(`module atom schema validation failed for ${member.atom_id}`, { instruction_id: entry.instruction_id, atom_id: member.atom_id, schemaErrors: atomSchemaErrors });
        let applicability: Applicability | undefined;
        if (data.applicability !== undefined) {
          if (typeof data.applicability !== 'string') throw invalid(`applicability must be a string for ${member.atom_id}`, { instruction_id: entry.instruction_id, atom_id: member.atom_id });
          try { applicability = parseApplicability(data.applicability); }
          catch (error) { throw invalid(`applicability is invalid for ${member.atom_id}`, { instruction_id: entry.instruction_id, atom_id: member.atom_id, message: error instanceof Error ? error.message : String(error) }); }
        }
        const classification = parseFacetClassification(data);
        if (classification === undefined) throw invalid(`instruction classification is invalid for ${member.atom_id}`, { instruction_id: entry.instruction_id, atom_id: member.atom_id });
        let approach_assessments: ApproachAssessment[];
        try { approach_assessments = parseApproachAssessments({ data, body: member.body }, approachDeclarations); }
        catch (error) { throw invalid(`instruction approach assessments are invalid for ${member.atom_id}`, { instruction_id: entry.instruction_id, atom_id: member.atom_id, message: error instanceof Error ? error.message : String(error) }); }
        const atom: LoadedInstruction = {
          instruction_id: member.atom_id, moduleId: entry.instruction_id,
          title: data.title as string, summary: data.summary as string,
          capability_tags: data.capability_tags as string[], pattern_tags: data.pattern_tags as string[],
          roles: (data.roles as string[] | undefined) ?? [], products: (data.products as string[] | undefined) ?? [],
          conditions: { applies_when: data.conditions_applies_when as string, does_not_apply_when: data.conditions_does_not_apply_when as string },
          artifact_contract: { output_type: data.artifact_contract_output_type as string, required_data: data.artifact_contract_required_data as string[], verified_by: data.artifact_contract_verified_by as string },
          compatibility: { excludes: data.compatibility_excludes as string[], requires: data.compatibility_requires as string[] },
          provenance: parseProvenance(data.provenance, member.atom_id), status: data.status as 'active' | 'disabled', revision: data.revision as number,
          content: member.body, classification, approach_assessments,
          ...(applicability === undefined ? {} : { applicabilityDeclaration: applicability }),
        };
        validateTags(catalog, atom);
        return atom;
      });
      const activeAtoms = atomInstructions.filter((atom) => atom.status === 'active');
      const firstClass = activeAtoms[0]?.classification;
      const firstClassified = firstClass?.classification_status === 'classified' ? firstClass : undefined;
      const sameClassification = firstClassified !== undefined
        && activeAtoms.every((atom) => {
          const classification = atom.classification;
          return classification.classification_status === 'classified'
            && classification.instruction_form === firstClassified.instruction_form
            && classification.domains.length === firstClassified.domains.length
            && firstClassified.domains.every((domain) => classification.domains.includes(domain));
        });
      const moduleClassification = sameClassification
        ? firstClass!
        : parseFacetClassification({ classification_status: 'unclassified', classification_reason: 'module carrier: member classifications differ' });
      if (moduleClassification === undefined) throw invalid(`module classification is invalid for ${entry.instruction_id}`, { instruction_id: entry.instruction_id });
      const union = (select: (atom: LoadedInstruction) => string[]): string[] => [...new Set(activeAtoms.flatMap(select))].sort(compareNames);
      const moduleEntry: LoadedInstruction = {
        instruction_id: entry.instruction_id, title: module.record.title, summary: module.record.summary,
        capability_tags: union((atom) => atom.capability_tags), pattern_tags: union((atom) => atom.pattern_tags),
        roles: union((atom) => atom.roles), products: union((atom) => atom.products),
        conditions: { applies_when: 'Select an atom for its complete instruction.', does_not_apply_when: '' },
        artifact_contract: { output_type: 'none', required_data: [], verified_by: 'Module carrier; atom metadata is authoritative.' },
        compatibility: { excludes: [], requires: [] }, provenance: [],
        status: module.record.status, revision: module.record.revision, content: '', classification: moduleClassification,
        approach_assessments: [], moduleAtoms: module.record.atom_ids,
      };
      for (const atom of atomInstructions) {
        if (instructions.has(atom.instruction_id) || atom.instruction_id === moduleEntry.instruction_id) {
          throw invalid('module or atom instruction id collision', { instruction_id: atom.instruction_id, module_id: moduleEntry.instruction_id });
        }
        instructions.set(atom.instruction_id, atom);
      }
      if (instructions.has(moduleEntry.instruction_id)) throw invalid('module instruction id collision', { instruction_id: moduleEntry.instruction_id });
      instructions.set(moduleEntry.instruction_id, moduleEntry);
      continue;
    }
    if (marker !== 'VPInstruction/v1.2' && marker !== 'VPInstruction/v2' && marker !== 'VPInstruction/v3') throw invalid(`unsupported instruction schema marker for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, schema: parsed.data.schema });
    if (marker === 'VPInstruction/v2' && v2Schema === undefined) v2Schema = await readSchema(directory, 'vpinstruction.v2.schema.json');
    if (marker === 'VPInstruction/v3' && v3Schema === undefined) v3Schema = await readSchema(directory, 'vpinstruction.v3.schema.json');
    const schema = marker === 'VPInstruction/v3' ? v3Schema! : marker === 'VPInstruction/v2' ? v2Schema! : v12Schema;
    const schemaErrors = validateAgainstSchema(parsed.data, schema);
    if (schemaErrors.length > 0) throw invalid(`instruction schema validation failed for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, schemaErrors });
    if (parsed.data.instruction_id !== entry.instruction_id) throw invalid(`instruction id mismatch for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, actual_id: parsed.data.instruction_id });
    const data = parsed.data;
    if (marker === 'VPInstruction/v3') {
      let variants: VariantRecord[];
      let sections: Map<string, string>;
      try {
        variants = parseVariantScalar(String(data.instruction_variants), entry.instruction_id);
        sections = parseVariantSections(parsed.body, variants, entry.instruction_id);
      } catch (error) {
        throw invalid(`variant family is invalid for ${entry.instruction_id}`, {
          instruction_id: entry.instruction_id,
          code: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined,
          message: error instanceof Error ? error.message : String(error),
          details: typeof error === 'object' && error !== null && 'details' in error ? error.details : undefined,
        });
      }
      const classification = parseFacetClassification(data);
      if (classification === undefined) throw invalid(`instruction classification is invalid for ${entry.instruction_id}`, { instruction_id: entry.instruction_id });
      let approach_assessments: ApproachAssessment[];
      try { approach_assessments = parseApproachAssessments(parsed, approachDeclarations); }
      catch (error) { throw invalid(`instruction approach assessments are invalid for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, message: error instanceof Error ? error.message : String(error) }); }
      const family: LoadedInstruction = {
        instruction_id: entry.instruction_id, title: data.title as string, summary: data.summary as string,
        capability_tags: data.capability_tags as string[], pattern_tags: data.pattern_tags as string[],
        roles: (data.roles as string[] | undefined) ?? [], products: (data.products as string[] | undefined) ?? [],
        conditions: { applies_when: data.conditions_applies_when as string, does_not_apply_when: data.conditions_does_not_apply_when as string },
        artifact_contract: { output_type: data.artifact_contract_output_type as string, required_data: data.artifact_contract_required_data as string[], verified_by: data.artifact_contract_verified_by as string },
        compatibility: { excludes: data.compatibility_excludes as string[], requires: data.compatibility_requires as string[] },
        provenance: parseProvenance(data.provenance, entry.instruction_id, true), status: data.status as 'active' | 'disabled', revision: data.revision as number,
        content: '', classification, approach_assessments,
      };
      validateTags(catalog, family);
      const familyVariants: LoadedInstruction[] = variants.map((record) => {
        const id = record.variant_id;
        const content = sections.get(id);
        if (content === undefined) throw invalid(`variant section missing for ${id}`, { instruction_id: entry.instruction_id, variant_id: id });
        const applicabilityDeclaration = parseApplicability(JSON.stringify(record.applicability));
        const variantData = {
          classification_status: record.classification_status,
          ...(record.instruction_form === undefined ? {} : { instruction_form: record.instruction_form }),
          ...(record.domains === undefined ? {} : { domains: record.domains }),
          ...(record.classification_reason === undefined ? {} : { classification_reason: record.classification_reason }),
        };
        const variantClassification = parseFacetClassification(variantData)!;
        let variantApproaches: ApproachAssessment[];
        try {
          const variantParsed = { ...parsed, data: { ...parsed.data, approach_assessments: record.approach_assessments, approach_body_sha256: record.approach_body_sha256 }, body: content };
          variantApproaches = parseApproachAssessments(variantParsed, approachDeclarations);
        } catch (error) { throw invalid(`instruction approach assessments are invalid for variant ${id}`, { instruction_id: entry.instruction_id, variant_id: id, message: error instanceof Error ? error.message : String(error) }); }
        const variant: LoadedInstruction = {
          instruction_id: id, familyId: entry.instruction_id, title: record.title, summary: record.summary,
          capability_tags: record.capability_tags, pattern_tags: record.pattern_tags,
          roles: record.roles ?? [], products: record.products ?? [],
          conditions: { applies_when: record.conditions_applies_when, does_not_apply_when: record.conditions_does_not_apply_when },
          artifact_contract: { output_type: record.artifact_contract_output_type, required_data: record.artifact_contract_required_data, verified_by: record.artifact_contract_verified_by },
          compatibility: { excludes: record.compatibility_excludes, requires: record.compatibility_requires },
          provenance: parseProvenance(record.provenance, id, true), status: record.status, revision: record.revision, content,
          classification: variantClassification, approach_assessments: variantApproaches, applicabilityDeclaration,
        };
        validateTags(catalog, variant);
        return variant;
      });
      for (const variant of familyVariants) {
        if (instructions.has(variant.instruction_id) || variant.instruction_id === family.instruction_id) {
          throw invalid('family or variant instruction id collision', { instruction_id: variant.instruction_id, family_id: family.instruction_id });
        }
        instructions.set(variant.instruction_id, variant);
      }
      if (instructions.has(family.instruction_id)) throw invalid('family instruction id collision', { instruction_id: family.instruction_id });
      family.variants = familyVariants;
      instructions.set(family.instruction_id, family);
      continue;
    }
    let applicability: Applicability | undefined;
    if (data.applicability !== undefined) {
      if (typeof data.applicability !== 'string') throw invalid(`applicability must be a string for ${entry.instruction_id}`, { instruction_id: entry.instruction_id });
      try {
        applicability = parseApplicability(data.applicability);
      } catch (error) {
        throw invalid(`applicability is invalid for ${entry.instruction_id}`, {
          instruction_id: entry.instruction_id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
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
      ...(applicability === undefined ? {} : { applicabilityDeclaration: applicability }),
    };
    if (instructions.has(instruction.instruction_id)) throw invalid('instruction id collides with an existing family or variant', { instruction_id: instruction.instruction_id });
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
  // Discovery ranks the tag name before aliases and descriptions. A description
  // match is a hint, not a declaration that the tag names the intent. Within the
  // name tier, a match at the start of the tag outranks an incidental later word.
  const matches: Array<{
    exact: boolean;
    nameTokenCount: number;
    tagFirstIndex: number;
    queryFirstIndex: number;
    aliasTokenCount: number;
    entry: CatalogTagMatch;
  }> = [];
  for (const dimension of ['capability', 'pattern'] as const) {
    for (const [tag, description] of Object.entries(catalog.tag_dictionary[dimension])) {
      const aliases = Object.entries(catalog.tag_aliases)
        .filter(([, canonical]) => canonical === tag)
        .map(([alias]) => alias);
      const names = [tag, ...aliases];
      const nameTokens = tagTokens(tag).map(stemToken);
      const aliasTokens = aliases.flatMap((alias) => tagTokens(alias).map(stemToken));
      const descriptionTokens = tagTokens(description).map(stemToken);
      const availableTokens = new Set([...nameTokens, ...aliasTokens, ...descriptionTokens]);
      const matchedTokenCount = tokens.filter((token) => availableTokens.has(token)).length;
      const selected = match === 'all' ? matchedTokenCount === tokens.length : matchedTokenCount > 0;
      if (!selected) continue;
      const exact = phrases.some((phrase) => names.some((name) => normalizedTagText(name) === phrase));
      const nameTokenCount = tokens.filter((token) => nameTokens.includes(token)).length;
      const aliasTokenCount = tokens.filter((token) => aliasTokens.includes(token) && !nameTokens.includes(token)).length;
      const tagFirstIndex = nameTokens.findIndex((token) => tokens.includes(token));
      const queryFirstIndex = tokens.findIndex((token) => nameTokens.includes(token) || aliasTokens.includes(token));
      matches.push({
        exact,
        nameTokenCount,
        tagFirstIndex: tagFirstIndex === -1 ? Number.MAX_SAFE_INTEGER : tagFirstIndex,
        queryFirstIndex: queryFirstIndex === -1 ? Number.MAX_SAFE_INTEGER : queryFirstIndex,
        aliasTokenCount,
        entry: { dimension, tag, description },
      });
    }
  }
  return matches
    .sort((left, right) => Number(right.exact) - Number(left.exact)
      || right.nameTokenCount - left.nameTokenCount
      || left.tagFirstIndex - right.tagFirstIndex
      || left.queryFirstIndex - right.queryFirstIndex
      || right.aliasTokenCount - left.aliasTokenCount
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
  const matches = (instruction: LoadedInstruction): boolean => {
    const classification = instruction.classification;
    return evaluateApproaches(instruction, approaches).included
    && hasAny(instruction.capability_tags, capabilities)
    && hasAny(instruction.pattern_tags, patterns)
    && (instruction.roles.length === 0 || hasAny(instruction.roles, query.roles ?? []))
    && (instruction.products.length === 0 || hasAny(instruction.products, query.products ?? []))
    && matchesConditions(instruction, query.conditions)
    && (facets.instructionForms.length === 0 || (classification.classification_status === 'classified' && facets.instructionForms.includes(classification.instruction_form)))
    && (facets.domains.length === 0 || (classification.classification_status === 'classified' && facets.domains.some((domain) => classification.domains.includes(domain))))
    && (facets.classificationStatuses.length === 0 || facets.classificationStatuses.includes(classification.classification_status));
  };
  return [...instructions.values()]
    .filter((instruction) => instruction.familyId === undefined && instruction.moduleId === undefined)
    .filter((instruction) => instruction.status === 'active')
    .filter((instruction) => instruction.moduleAtoms !== undefined
      ? (ids.length === 0 || ids.includes(instruction.instruction_id) || instruction.moduleAtoms.some((id) => ids.includes(id)))
        && instruction.moduleAtoms.some((id) => {
          const atom = instructions.get(id);
          return atom !== undefined && atom.status === 'active'
            && (ids.length === 0 || ids.includes(instruction.instruction_id) || ids.includes(id)) && matches(atom);
        })
      : instruction.variants === undefined
        ? (ids.length === 0 || ids.includes(instruction.instruction_id)) && matches(instruction)
        : (instruction.variants.some((variant) => ids.includes(variant.instruction_id)) || ids.includes(instruction.instruction_id) || ids.length === 0)
          && instruction.variants.some((variant) => variant.status === 'active'
            && (ids.includes(instruction.instruction_id)
              ? true
              : ids.length > 0
                ? ids.includes(variant.instruction_id)
                : true)
            && matches(variant)))
    .sort((left, right) => compareNames(left.instruction_id, right.instruction_id))
    .map((instruction) => {
      const { instruction_id, title, summary, capability_tags, pattern_tags, revision } = instruction;
      if (instruction.moduleAtoms !== undefined) {
        const members = instruction.moduleAtoms.flatMap((atomId) => {
          const atom = instructions.get(atomId);
          if (atom === undefined || atom.status !== 'active' || (ids.length > 0 && !ids.includes(instruction.instruction_id) && !ids.includes(atomId))) return [];
          const matched = matches(atom);
          const applicability = applicabilityFor(atom, query.applicabilityContext);
          return [applicability === undefined ? { atom_id: atomId, matched } : { atom_id: atomId, matched, applicability }];
        });
        return { instruction_id, title, summary, capability_tags, pattern_tags, revision, members };
      }
      if (instruction.variants !== undefined) {
        const selected = instruction.variants.filter((variant) => variant.status === 'active'
          && (ids.includes(instruction.instruction_id) || ids.length === 0 || ids.includes(variant.instruction_id))
          && matches(variant));
        return { instruction_id, title, summary, capability_tags, pattern_tags, revision, variants: selected.map((variant) => {
          const applicability = applicabilityFor(variant, query.applicabilityContext);
          return applicability === undefined ? { variant_id: variant.instruction_id } : { variant_id: variant.instruction_id, applicability };
        }) };
      }
      const applicability = applicabilityFor(instruction, query.applicabilityContext);
      return applicability === undefined
        ? { instruction_id, title, summary, capability_tags, pattern_tags, revision }
        : { instruction_id, title, summary, capability_tags, pattern_tags, revision, applicability };
    });
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
    if (instruction.moduleAtoms !== undefined) {
      const kept: string[] = [];
      for (const annotation of metadata.members ?? []) {
        if (!annotation.matched) continue;
        const atom = instructions.get(annotation.atom_id);
        if (atom === undefined || atom.status !== 'active') continue;
        if (!evaluateApproaches(atom, selectors).included) continue;
        const unresolvedAtom = unresolvedProfileConflictFor(atom, profile);
        if (unresolvedAtom !== undefined) requireProfileResolution(unresolvedAtom, { instruction_id: atom.instruction_id });
        if (profileConflictFor(atom, profile) !== undefined) continue;
        kept.push(atom.instruction_id);
        selected.set(atom.instruction_id, { instruction: atom, reason: 'matched' });
      }
      if (kept.length > 0) results.push({ ...metadata, members: (metadata.members ?? []).filter((item) => kept.includes(item.atom_id)) });
      continue;
    }
    if (instruction.variants !== undefined) {
      const kept: string[] = [];
      for (const annotation of metadata.variants ?? []) {
        const variant = instructions.get(annotation.variant_id);
        if (variant === undefined || variant.status !== 'active') continue;
        if (!evaluateApproaches(variant, selectors).included) continue;
        const unresolvedVariant = unresolvedProfileConflictFor(variant, profile);
        if (unresolvedVariant !== undefined) requireProfileResolution(unresolvedVariant, { instruction_id: variant.instruction_id });
        if (profileConflictFor(variant, profile) !== undefined) continue;
        kept.push(variant.instruction_id);
        selected.set(variant.instruction_id, { instruction: variant, reason: 'matched' });
      }
      if (kept.length > 0) results.push({ ...metadata, variants: (metadata.variants ?? []).filter((item) => kept.includes(item.variant_id)) });
      continue;
    }
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
    if (instruction.familyId !== undefined) continue;
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
  const unknown = candidates.find((id) => !instructions.has(id));
  if (unknown !== undefined) return decisionFallback('unknown-candidate', `Candidate "${unknown}" is not in the catalog; the agent must decide.`);
  const disallowed = candidates.find((id) => {
    const instruction = instructions.get(id);
    return instruction === undefined || instruction.status !== 'active';
  });
  if (disallowed !== undefined) return decisionFallback('candidate-not-allowed', `Candidate "${disallowed}" is not admissible; the agent must decide.`);
  const unsupportedModule = candidates.find((id) => instructions.get(id)?.moduleAtoms !== undefined);
  if (unsupportedModule !== undefined) {
    return decisionFallback('candidate-not-allowed', `Candidate module "${unsupportedModule}" is a carrier; choose an atom ID.`);
  }

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
  let applicabilityContext: ApplicabilityContext | undefined;
  if (request.applicabilityContext !== undefined) {
    try {
      applicabilityContext = parseApplicabilityContext(request.applicabilityContext);
    } catch (error) {
      return decisionFallback('invalid-format', `Request is malformed: ${error instanceof Error ? error.message : String(error)}.`);
    }
  }
  const uniqueCandidates: LoadedInstruction[] = [];
  for (const id of [...new Set(candidates)]) {
    const candidate = instructions.get(id);
    if (candidate === undefined) continue;
    if (candidate.variants === undefined) { uniqueCandidates.push(candidate); continue; }
    const familyVariants = candidate.variants
      .filter((variant) => variant.status !== 'disabled')
      .map((variant) => ({ variant, result: applicabilityFor(variant, applicabilityContext) }));
    const applicableVariants = familyVariants.filter(({ result }) => result === undefined || result.state === 'applicable');
    if (applicableVariants.length !== 1) {
      const familyDiagnostics = familyVariants.map(({ variant, result }) => ({ instructionId: variant.instruction_id, applicability: result?.state === 'inapplicable' ? 'inapplicable' as const : 'unresolved' as const, ...(result?.reason === undefined ? {} : { reason: result.reason }), ...(result?.requiredContext === undefined ? {} : { requiredContext: result.requiredContext }), ...(result?.sourceLabels === undefined ? {} : { sourceLabels: result.sourceLabels }) }));
      return { selected: [], score: 0, rationale: `Operation "${request.operation}" cannot resolve family "${id}" to exactly one applicable variant.`, provider: 'agent', fallback: true, fallbackReason: 'applicability-unresolved', diagnostics: { applicability: familyDiagnostics } };
    }
    uniqueCandidates.push(applicableVariants[0]!.variant);
  }
  const evaluated = uniqueCandidates.map((instruction) => ({ instruction, result: applicabilityFor(instruction, applicabilityContext) }));
  const diagnostics = evaluated
    .filter((item): item is { instruction: LoadedInstruction; result: ApplicabilityResult } => item.result !== undefined && item.result.state !== 'applicable')
    .map(({ instruction, result }) => {
      const diagnostic: DecisionApplicabilityDiagnostic = { instructionId: instruction.instruction_id, applicability: result.state as 'inapplicable' | 'unresolved' };
      if (result.reason !== undefined) diagnostic.reason = result.reason;
      if (result.requiredContext !== undefined) diagnostic.requiredContext = result.requiredContext;
      if (result.sourceLabels !== undefined) diagnostic.sourceLabels = result.sourceLabels;
      return diagnostic;
    });
  if (evaluated.length > 0 && evaluated.every((item) => item.result !== undefined && item.result.state !== 'applicable')) {
    const unresolved = diagnostics.some((item) => item.applicability === 'unresolved');
    return {
      selected: [],
      score: 0,
      rationale: unresolved
        ? `Operation "${request.operation}" has no applicable candidate; applicability is unresolved for ${diagnostics.length} candidate${diagnostics.length === 1 ? '' : 's'}.`
        : `Operation "${request.operation}" has no applicable candidate; ${diagnostics.length} candidate${diagnostics.length === 1 ? ' is' : 's are'} inapplicable.`,
      provider: 'agent',
      fallback: true,
      fallbackReason: unresolved ? 'applicability-unresolved' : 'candidate-not-allowed',
      diagnostics: { applicability: diagnostics },
    };
  }
  const applicableIds = new Set(evaluated.filter((item) => item.result === undefined || item.result.state === 'applicable').map((item) => item.instruction.instruction_id));
  const ranked = uniqueCandidates
    .filter((instruction) => applicableIds.has(instruction.instruction_id))
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
    ...(diagnostics.length === 0 ? {} : { diagnostics: { applicability: diagnostics } }),
  };
}

function activeInstruction(instructions: Map<string, LoadedInstruction>, id: string): LoadedInstruction {
  const instruction = instructions.get(id);
  if (instruction === undefined) throw new CatalogError('CATALOG_ID_UNKNOWN', `unknown instruction id: ${id}`, { instruction_id: id });
  if (instruction.status === 'disabled') throw new CatalogError('CATALOG_INSTRUCTION_DISABLED', `instruction is disabled: ${id}`, { instruction_id: id });
  return instruction;
}

export function catalogGet(_catalog: Catalog, instructions: Map<string, LoadedInstruction>, id: string, context?: ApplicabilityContext): Instruction {
  const instruction = activeInstruction(instructions, id);
  if (instruction.moduleAtoms !== undefined) throw new CatalogError('CATALOG_MODULE_ATOM_REQUIRED', `module ${id} is a carrier; select one of its atom IDs`, { module_id: id, atom_ids: instruction.moduleAtoms });
  if (instruction.variants !== undefined) {
    if (context === undefined) throw new CatalogError('CATALOG_FAMILY_REQUIRES_CONTEXT', `family ${id} requires applicability context`, { family_id: id, variant_ids: instruction.variants.map((variant) => variant.instruction_id) });
    const enabled = instruction.variants.filter((variant) => variant.status !== 'disabled');
    const evaluated = enabled.map((variant) => ({ variant, applicability: applicabilityFor(variant, context) }));
    const applicable = evaluated.filter((item) => item.applicability?.state === 'applicable');
    if (applicable.length !== 1) throw new CatalogError('CATALOG_REQUIRED_SELECTION_UNAVAILABLE', `family ${id} has ${applicable.length === 0 ? 'no' : 'multiple'} applicable variants`, {
      family_id: id,
      variants: evaluated.map(({ variant, applicability }) => ({ variant_id: variant.instruction_id, state: applicability?.state ?? 'unresolved', reason: applicability?.reason })),
    });
    return catalogGet(_catalog, instructions, applicable[0]!.variant.instruction_id, context);
  }
  const applicability = applicabilityFor(instruction, context);
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
    ...(applicability === undefined ? {} : { applicability }),
  };
}

const RESOURCE_SCHEMA_NAME = 'vpreference-resource.v1.schema.json';
const RESOURCE_MAX_BYTES = 65_536;
const RESOURCE_TYPES = new Set(['palette', 'font-pairing', 'style', 'icon-list', 'standards-checklist']);

type ResourceManifestEntry = { resource_id: string; path: string; sha256: string };
type ResourceRecord = Omit<LoadedReferenceResource, 'applicabilityDeclaration'> & { applicability?: unknown };

function resourcePathCatalogError(error: ResourcePathError, entry: ResourceManifestEntry): CatalogError {
  const code = error.code === 'RESOURCE_PATH_UNSAFE' ? 'CATALOG_RESOURCE_PATH_UNSAFE' : 'CATALOG_RESOURCE_PATH_MISSING';
  return new CatalogError(code, error.message, { resource_id: entry.resource_id, path: entry.path });
}

async function resolveResourceFile(directory: string, entry: ResourceManifestEntry): Promise<string> {
  const resourcesRoot = resolve(directory, 'resources');
  const target = resolve(directory, entry.path);
  const relativePath = relative(resourcesRoot, target).split(sep).join('/');
  try {
    return await resolveResourcePath(resourcesRoot, relativePath);
  } catch (error) {
    throw error instanceof ResourcePathError ? resourcePathCatalogError(error, entry) : error;
  }
}

function resourceManifestEntry(catalog: Catalog, id: string): ResourceManifestEntry {
  const entry = catalog.resources?.find((item) => item.resource_id === id);
  if (entry === undefined) throw new CatalogError('CATALOG_RESOURCE_UNKNOWN', `unknown resource id: ${id}`, { resource_id: id });
  return entry;
}

export async function loadCatalogResources(catalog: Catalog, directory: string): Promise<Map<string, LoadedReferenceResource>> {
  const resources = new Map<string, LoadedReferenceResource>();
  const entries = catalog.resources ?? [];
  if (entries.length === 0) return resources;
  const schema = await readSchema(directory, RESOURCE_SCHEMA_NAME);
  for (const entry of entries) {
    const path = await resolveResourceFile(directory, entry);
    const bytes = await readFile(path);
    if (bytes.length > RESOURCE_MAX_BYTES) {
      throw new CatalogError('CATALOG_RESOURCE_TOO_LARGE', `resource ${entry.resource_id} exceeds the record size limit`, {
        resource_id: entry.resource_id, path: entry.path, bytes: bytes.length, max_bytes: RESOURCE_MAX_BYTES,
      });
    }
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== entry.sha256) {
      throw new CatalogError('CATALOG_RESOURCE_DIGEST_MISMATCH', `digest mismatch for resource ${entry.resource_id}`, {
        resource_id: entry.resource_id, expected: entry.sha256, actual,
      });
    }
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new CatalogError('CATALOG_RESOURCE_MALFORMED', `resource ${entry.resource_id} is not valid UTF-8`, { resource_id: entry.resource_id });
    }
    let value: unknown;
    try {
      value = JSON.parse(text) as unknown;
    } catch (error) {
      throw new CatalogError('CATALOG_RESOURCE_MALFORMED', `resource ${entry.resource_id} is malformed JSON`, {
        resource_id: entry.resource_id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    const schemaErrors = validateAgainstSchema(value, schema);
    if (schemaErrors.length > 0) {
      throw new CatalogError('CATALOG_RESOURCE_SCHEMA_INVALID', `resource schema validation failed for ${entry.resource_id}`, {
        resource_id: entry.resource_id, schemaErrors,
      });
    }
    const record = value as ResourceRecord;
    if (record.resource_id !== entry.resource_id) {
      throw invalid(`resource id mismatch for ${entry.resource_id}`, { resource_id: entry.resource_id, actual_id: record.resource_id });
    }
    const { digest: _digest, ...unsigned } = record;
    const canonical = canonicalJson(unsigned);
    const computed = canonical === undefined ? undefined : `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
    if (computed === undefined || computed !== record.digest) {
      throw new CatalogError('CATALOG_RESOURCE_DIGEST_MISMATCH', `record digest mismatch for ${entry.resource_id}`, {
        resource_id: entry.resource_id, expected: record.digest, actual: computed ?? null,
      });
    }
    let applicabilityDeclaration: Applicability | undefined;
    if (record.applicability !== undefined) {
      try {
        applicabilityDeclaration = parseApplicability(JSON.stringify(record.applicability));
      } catch (error) {
        throw invalid(`applicability is invalid for resource ${entry.resource_id}`, {
          resource_id: entry.resource_id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    resources.set(record.resource_id, {
      schema: record.schema,
      resource_id: record.resource_id,
      resource_type: record.resource_type,
      revision: record.revision,
      status: record.status,
      provenance: record.provenance,
      payload: record.payload,
      digest: record.digest,
      ...(applicabilityDeclaration === undefined ? {} : { applicabilityDeclaration }),
    });
  }
  return resources;
}

function resourceApplicability(resource: LoadedReferenceResource, context: ApplicabilityContext | undefined): ApplicabilityResult | undefined {
  if (resource.applicabilityDeclaration === undefined && context === undefined) return undefined;
  const config = applicabilityConfig();
  return evaluateApplicability(resource.applicabilityDeclaration, context, config.vocab, config.aliases);
}

export function catalogResourceGet(
  catalog: Catalog,
  resources: ReadonlyMap<string, LoadedReferenceResource>,
  id: string,
  options: { resourceType?: string; applicabilityContext?: ApplicabilityContext } = {},
): ReferenceResourceResult {
  resourceManifestEntry(catalog, id);
  const resource = resources.get(id);
  if (resource === undefined) throw invalid(`resource ${id} was not loaded`, { resource_id: id });
  if (resource.status === 'disabled') throw new CatalogError('CATALOG_RESOURCE_DISABLED', `resource is disabled: ${id}`, { resource_id: id });
  if (options.resourceType !== undefined && !RESOURCE_TYPES.has(options.resourceType)) {
    throw invalid(`unsupported resource type ${options.resourceType}`, { resource_type: options.resourceType });
  }
  if (options.resourceType !== undefined && resource.resource_type !== options.resourceType) {
    throw new CatalogError('CATALOG_RESOURCE_TYPE_MISMATCH', `resource ${id} has type ${resource.resource_type}, not ${options.resourceType}`, {
      resource_id: id, resource_type: resource.resource_type, requested_type: options.resourceType,
    });
  }
  const applicability = resourceApplicability(resource, options.applicabilityContext);
  return {
    schema: resource.schema,
    resource_id: resource.resource_id,
    resource_type: resource.resource_type,
    revision: resource.revision,
    status: resource.status,
    provenance: resource.provenance,
    payload: resource.payload,
    digest: resource.digest,
    ...(applicability === undefined ? {} : { applicability }),
    untrusted: true,
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

export function catalogCompose(catalog: Catalog, instructions: Map<string, LoadedInstruction>, query: ComposeQuery, resources: ReadonlyMap<string, LoadedReferenceResource> = new Map<string, LoadedReferenceResource>()): ComposedBundle {
  const facets = validateQueryDimensions(query);
  if (query.resource_ids !== undefined && (!Array.isArray(query.resource_ids) || query.resource_ids.some((id) => typeof id !== 'string' || id.trim() === ''))) {
    throw invalid('query dimension resource_ids must be an array of non-empty strings', { dimension: 'resource_ids', value: query.resource_ids });
  }
  const selectors = parseApproachSelectors(query.approaches);
  const requireApproach = (instruction: LoadedInstruction, requiring?: string): void => {
    const decision = evaluateApproaches(instruction, selectors);
    if (!decision.included) throw new CatalogError('CATALOG_REQUIRED_CONFLICT', `instruction ${instruction.instruction_id} conflicts with approach selector`, { instruction_id: instruction.instruction_id, ...(requiring === undefined ? {} : { requiring_instruction_id: requiring }), dimensions: decision.dimensions });
  };
  validateProfile(query.profile);
  const selected = new Map<string, { instruction: LoadedInstruction; reason: ComposedInstruction['selection_reason'] }>();
  const requiredVariantIds = new Set<string>();
  for (const id of query.required_ids ?? []) {
    const instruction = activeInstruction(instructions, id);
    if (instruction.moduleAtoms !== undefined) throw new CatalogError('CATALOG_MODULE_ATOM_REQUIRED', `required module ${id} is a carrier; select atom IDs`, { module_id: id, atom_ids: instruction.moduleAtoms });
    if (instruction.variants === undefined) {
      requireApproach(instruction);
      addSelected(selected, instruction, 'required');
      requiredVariantIds.add(instruction.instruction_id);
      continue;
    }
    const enabled = instruction.variants.filter((variant) => variant.status === 'active');
    const evaluated = enabled.map((variant) => ({ variant, applicability: applicabilityFor(variant, query.applicabilityContext) }));
    const applicable = evaluated.filter(({ applicability }) => applicability === undefined || applicability.state === 'applicable');
    if (applicable.length === 0 || evaluated.some(({ applicability }) => applicability?.state === 'unresolved')) {
      throw new CatalogError('CATALOG_REQUIRED_SELECTION_UNAVAILABLE', `required family ${id} has no complete applicable variant selection`, {
        family_id: id,
        variants: evaluated.map(({ variant, applicability }) => ({ variant_id: variant.instruction_id, state: applicability?.state ?? 'applicable', ...(applicability?.reason === undefined ? {} : { reason: applicability.reason }) })),
      });
    }
    for (const { variant } of applicable) {
      requireApproach(variant);
      addSelected(selected, variant, 'required');
      requiredVariantIds.add(variant.instruction_id);
    }
  }
  const supplied = (value: string[] | undefined): boolean => Array.isArray(value) && value.length > 0;
  const hasSelectionDimension = supplied(query.capability_tags) || supplied(query.pattern_tags) || supplied(query.instruction_ids)
    || supplied(query.roles) || supplied(query.products) || supplied(query.conditions)
    || facets.instructionForms.length > 0 || facets.domains.length > 0 || facets.classificationStatuses.length > 0;
  if (hasSelectionDimension) {
    for (const metadata of catalogSearch(catalog, instructions, query)) {
      const instruction = instructions.get(metadata.instruction_id);
      if (instruction === undefined) continue;
      if (instruction.moduleAtoms !== undefined) {
        for (const annotation of metadata.members ?? []) {
          if (!annotation.matched) continue;
          const atom = instructions.get(annotation.atom_id);
          if (atom !== undefined && atom.status === 'active') addSelected(selected, atom, 'matched');
        }
        continue;
      }
      if (instruction.variants !== undefined) {
        for (const annotation of metadata.variants ?? []) {
          const variant = instructions.get(annotation.variant_id);
          if (variant !== undefined && variant.status === 'active') addSelected(selected, variant, 'matched');
        }
      } else addSelected(selected, instruction, 'matched');
    }
  }
  for (const id of requiredVariantIds) {
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
  const omitted = { inapplicable: [] as string[], unresolved: [] as string[] };
  for (const item of [...selected.values()]) {
    const applicability = applicabilityFor(item.instruction, query.applicabilityContext);
    if (applicability === undefined || applicability.state === 'applicable') continue;
    const id = item.instruction.instruction_id;
    if (item.reason === 'required') {
      throw new CatalogError('CATALOG_REQUIRED_SELECTION_UNAVAILABLE', `required instruction ${id} is ${applicability.state}`, {
        instruction_id: id,
        applicability: applicability.state,
        reason: applicability.reason,
      });
    }
    if (applicability.state === 'inapplicable') omitted.inapplicable.push(id);
    else omitted.unresolved.push(id);
    selected.delete(id);
  }
  const pending = [...selected.values()].map((item) => item.instruction);
  const dependencyEdges = new Map<string, Set<string>>();
  const addDependencyEdges = (instructionId: string, dependencyIds: string[]): void => {
    let edges = dependencyEdges.get(instructionId);
    if (edges === undefined) {
      edges = new Set<string>();
      dependencyEdges.set(instructionId, edges);
    }
    for (const dependencyId of dependencyIds) edges.add(dependencyId);
  };
  let canonicalGroupsForSubstitution: CanonicalMethodologyGroup[] | undefined;
  for (let index = 0; index < pending.length; index += 1) {
    const instruction = pending[index];
    if (instruction === undefined) continue;
    for (const dependencyId of instruction.compatibility.requires) {
      const dependency = instructions.get(dependencyId);
      if (dependency === undefined) throw new CatalogError('CATALOG_DEPENDENCY_MISSING', `dependency ${dependencyId} required by ${instruction.instruction_id} is missing`, { instruction_id: instruction.instruction_id, dependency_id: dependencyId });
      if (dependency.variants !== undefined) throw new CatalogError('CATALOG_DEPENDENCY_MISSING', `dependency ${dependencyId} required by ${instruction.instruction_id} is a family`, { instruction_id: instruction.instruction_id, dependency_id: dependencyId, family_id: dependencyId });
      if (dependency.moduleAtoms !== undefined) throw new CatalogError('CATALOG_MODULE_ATOM_REQUIRED', `dependency ${dependencyId} required by ${instruction.instruction_id} is a module carrier; select an atom ID`, { instruction_id: instruction.instruction_id, module_id: dependencyId, atom_ids: dependency.moduleAtoms });
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
          if (active?.variants !== undefined) throw new CatalogError('CATALOG_DEPENDENCY_MISSING', `dependency ${id} required by ${instruction.instruction_id} resolves to a family`, { instruction_id: instruction.instruction_id, dependency_id: id, family_id: id });
          if (active?.moduleAtoms !== undefined) throw new CatalogError('CATALOG_MODULE_ATOM_REQUIRED', `dependency ${id} required by ${instruction.instruction_id} resolves to a module carrier; select an atom ID`, { instruction_id: instruction.instruction_id, module_id: id, atom_ids: active.moduleAtoms });
          if (active === undefined || active.status !== 'active' || !active.pattern_tags.includes(profileConflict.active)) {
            completeMapping = false;
            break;
          }
          activeInstructions.push(active);
        }
        if (!completeMapping) throw new CatalogError('CATALOG_PROFILE_CONFLICT', `active profile pattern ${profileConflict.active} has no instruction in ${profileConflict.group}`, { ...profileConflict, dependency_id: dependencyId, requiring_instruction_id: instruction.instruction_id });
        addDependencyEdges(instruction.instruction_id, activeInstructions.map((active) => active.instruction_id));
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
        addDependencyEdges(instruction.instruction_id, [dependencyId]);
        requireApproach(dependency, instruction.instruction_id);
        if (!selected.has(dependencyId)) {
          addSelected(selected, dependency, 'dependency');
          pending.push(dependency);
        }
      }
    }
  }
  const omittedState = new Map<string, 'inapplicable' | 'unresolved'>([
    ...omitted.inapplicable.map((id) => [id, 'inapplicable'] as const),
    ...omitted.unresolved.map((id) => [id, 'unresolved'] as const),
  ]);
  const reachableFrom = (roots: Iterable<string>): Set<string> => {
    const reachable = new Set<string>();
    const queue = [...roots].filter((id) => selected.has(id));
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      if (id === undefined || reachable.has(id)) continue;
      reachable.add(id);
      for (const dependencyId of dependencyEdges.get(id) ?? []) {
        if (selected.has(dependencyId) && !reachable.has(dependencyId)) queue.push(dependencyId);
      }
    }
    return reachable;
  };
  const requiredRoots = [...requiredVariantIds].filter((id) => selected.has(id));
  const matchedRoots = [...selected.values()]
    .filter((item) => item.reason === 'matched' && !requiredVariantIds.has(item.instruction.instruction_id))
    .map((item) => item.instruction.instruction_id);
  let changed = true;
  while (changed) {
    changed = false;
    const requiredReachable = reachableFrom(requiredRoots);
    const matchedReachable = reachableFrom(matchedRoots);
    const reachable = new Set([...requiredReachable, ...matchedReachable]);
    for (const id of [...reachable].sort(compareNames)) {
      const item = selected.get(id);
      if (item === undefined) continue;
      const applicability = applicabilityFor(item.instruction, query.applicabilityContext);
      if (applicability === undefined || applicability.state === 'applicable') continue;
      if (requiredReachable.has(id)) {
        throw new CatalogError('CATALOG_REQUIRED_SELECTION_UNAVAILABLE', `required instruction ${id} is ${applicability.state}`, {
          instruction_id: id,
          applicability: applicability.state,
          reason: applicability.reason,
        });
      }
      omitted[applicability.state].push(id);
      omittedState.set(id, applicability.state);
      selected.delete(id);
      changed = true;
    }
    if (changed) continue;
    for (const id of [...matchedReachable].sort(compareNames)) {
      const item = selected.get(id);
      if (item === undefined || requiredReachable.has(id)) continue;
      const unavailableDependency = [...(dependencyEdges.get(id) ?? [])]
        .filter((dependencyId) => !selected.has(dependencyId))
        .sort(compareNames)[0];
      if (unavailableDependency === undefined) continue;
      const state = omittedState.get(unavailableDependency) ?? 'unresolved';
      omitted[state].push(id);
      omittedState.set(id, state);
      selected.delete(id);
      changed = true;
    }
    if (changed) continue;
    const survivingReachable = new Set([...reachableFrom(requiredRoots), ...reachableFrom(matchedRoots)]);
    for (const id of selected.keys()) {
      if (survivingReachable.has(id)) continue;
      selected.delete(id);
      changed = true;
    }
  }
  omitted.inapplicable = [...new Set(omitted.inapplicable)].sort(compareNames);
  omitted.unresolved = [...new Set(omitted.unresolved)].sort(compareNames);
  validateCanonicalPolicySelection(selected, query.profile);
  checkExcludes(selected);
  const composed = [...selected.values()]
    .sort((left, right) => compareNames(left.instruction.instruction_id, right.instruction.instruction_id))
    .map(({ instruction, reason }) => ({
      instruction_id: instruction.instruction_id,
      ...(instruction.familyId === undefined ? {} : { family_id: instruction.familyId }),
      title: instruction.title,
      summary: instruction.summary,
      content: instruction.content,
      capability_tags: instruction.capability_tags,
      pattern_tags: instruction.pattern_tags,
      artifact_contract: instruction.artifact_contract,
      provenance: instruction.provenance,
      selection_reason: reason,
    }));
  const composedResources: ComposedResource[] = [...new Set(query.resource_ids ?? [])].sort(compareNames).map((id) => {
    resourceManifestEntry(catalog, id);
    const resource = resources.get(id);
    if (resource === undefined) throw invalid(`resource ${id} was not loaded; pass loadCatalogResources output to catalogCompose`, { resource_id: id });
    if (resource.status === 'disabled') throw new CatalogError('CATALOG_RESOURCE_DISABLED', `resource is disabled: ${id}`, { resource_id: id });
    return { resource_id: resource.resource_id, resource_type: resource.resource_type, revision: resource.revision, payload: resource.payload, untrusted: true as const };
  });
  const resourcePayloadBytes = composedResources.reduce((total, resource) => total + Buffer.byteLength(canonicalJson(resource.payload) ?? '', 'utf8'), 0);
  const instructionTextBytes = composed.reduce((total, instruction) => total + Buffer.byteLength(instruction.content, 'utf8'), 0);
  const bundleTextBytes = instructionTextBytes + resourcePayloadBytes;
  if (composed.length > 20 || bundleTextBytes > 64_000) {
    throw new CatalogError('CATALOG_BUNDLE_LIMIT_EXCEEDED', 'composed bundle exceeds the session instruction limit', {
      instruction_count: composed.length,
      max_instructions: 20,
      instruction_text_bytes: instructionTextBytes,
      resource_count: composedResources.length,
      resource_payload_bytes: resourcePayloadBytes,
      bundle_text_bytes: bundleTextBytes,
      max_instruction_text_bytes: 64_000,
    });
  }
  return {
    catalog_id: catalog.catalog_id,
    catalog_revision: catalog.revision,
    tag_dictionary: catalog.tag_dictionary,
    instructions: composed,
    resources: composedResources,
    omitted,
    role: query.role ?? '',
    task_contract: query.task_contract ?? '',
    effective_methodology: query.effective_methodology ?? '',
    work_scope: query.work_scope ?? '',
    materialization_requirements: query.materialization_requirements ?? [],
    artifact_references: query.artifact_references ?? [],
  };
}
