import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseFrontmatter } from './frontmatter.ts';
import { FrontmatterError } from './frontmatter.ts';
import { validateAgainstSchema } from './schema.ts';
import type { Schema } from './schema.ts';

export type CatalogErrorCode = 'CATALOG_INVALID' | 'CATALOG_TAG_UNKNOWN' | 'CATALOG_DIGEST_MISMATCH' | 'CATALOG_ID_UNKNOWN' | 'CATALOG_INSTRUCTION_DISABLED' | 'CATALOG_REQUIRED_CONFLICT' | 'CATALOG_PROFILE_CONFLICT' | 'CATALOG_DEPENDENCY_MISSING' | 'CATALOG_DEPENDENCY_DISABLED';

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
export type Catalog = {
  schema: 'VPCatalog/v1'; catalog_id: string; revision: number; source_revision: string; updated_at: string;
  tag_dictionary: { capability: Record<string, string>; pattern: Record<string, string> };
  tag_aliases: Record<string, string>;
  tag_exemptions: { instruction_id: string; dimension: 'capability' | 'pattern'; reason: string }[];
  instructions: { instruction_id: string; path: string; sha256: string }[];
};
export type TagEntry = { tag: string; description: string; aliases: string[] };
export type InstructionMetadata = { instruction_id: string; title: string; summary: string; capability_tags: string[]; pattern_tags: string[]; revision: number };
export type SearchQuery = { capability_tags?: string[]; pattern_tags?: string[]; instruction_ids?: string[]; roles?: string[]; products?: string[]; conditions?: string[] };
export type EffectiveProfile = { schema: 'VPEffectiveProfile/v1'; groups: Record<string, { active: string; alternatives: string[] }> };
export type ComposeQuery = SearchQuery & { required_ids?: string[]; profile?: EffectiveProfile; role?: string; task_contract?: string; effective_methodology?: string; work_scope?: string; materialization_requirements?: string[]; artifact_references?: string[] };
export type ComposedInstruction = { instruction_id: string; title: string; summary: string; content: string; capability_tags: string[]; pattern_tags: string[]; artifact_contract: Instruction['artifact_contract']; provenance: Provenance[]; selection_reason: 'matched' | 'dependency' | 'required' };
export type ComposedBundle = { catalog_id: string; catalog_revision: number; tag_dictionary: Catalog['tag_dictionary']; instructions: ComposedInstruction[]; role: string; task_contract: string; effective_methodology: string; work_scope: string; materialization_requirements: string[]; artifact_references: string[] };

const instructionSchemaName = 'vpinstruction.v1.schema.json';
const catalogSchemaName = 'vpcatalog.v1.schema.json';

function compareNames(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function invalid(message: string, details: Record<string, unknown> = {}): CatalogError {
  return new CatalogError('CATALOG_INVALID', message, details);
}

async function readSchema(directory: string, name: string): Promise<Schema> {
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

export async function loadInstructions(catalog: Catalog, directory: string): Promise<Map<string, Instruction>> {
  const schema = await readSchema(directory, instructionSchemaName);
  const instructions = new Map<string, Instruction>();
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
    const schemaErrors = validateAgainstSchema(parsed.data, schema);
    if (schemaErrors.length > 0) throw invalid(`instruction schema validation failed for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, schemaErrors });
    if (parsed.data.instruction_id !== entry.instruction_id) throw invalid(`instruction id mismatch for ${entry.instruction_id}`, { instruction_id: entry.instruction_id, actual_id: parsed.data.instruction_id });
    const data = parsed.data;
    const instruction: Instruction = {
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

function hasAny(values: string[], selected: string[]): boolean {
  return selected.length === 0 || values.some((value) => selected.includes(value));
}

function validateQueryDimensions(query: SearchQuery): void {
  const dimensions = ['capability_tags', 'pattern_tags', 'instruction_ids', 'roles', 'products', 'conditions'] as const;
  for (const dimension of dimensions) {
    const value = query[dimension];
    if (value !== undefined && !Array.isArray(value)) throw invalid(`query dimension ${dimension} must be an array`, { dimension, value });
  }
}

function canonicalTags(catalog: Catalog, dimension: 'capability' | 'pattern', values: string[] | undefined): string[] {
  return (values ?? []).map((tag) => {
    const canonical = catalog.tag_aliases[tag] ?? tag;
    if (!Object.prototype.hasOwnProperty.call(catalog.tag_dictionary[dimension], canonical)) {
      throw invalid(`unknown ${dimension} query tag ${tag}`, { tag, dimension });
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

export function catalogSearch(catalog: Catalog, instructions: Map<string, Instruction>, query: SearchQuery): InstructionMetadata[] {
  validateQueryDimensions(query);
  const capabilities = canonicalTags(catalog, 'capability', query.capability_tags);
  const patterns = canonicalTags(catalog, 'pattern', query.pattern_tags);
  for (const token of query.conditions ?? []) {
    if (token.trim() === '') throw invalid('condition token must not be empty', { token, dimension: 'conditions' });
  }
  const ids = query.instruction_ids ?? [];
  return [...instructions.values()]
    .filter((instruction) => instruction.status === 'active')
    .filter((instruction) => hasAny(instruction.capability_tags, capabilities))
    .filter((instruction) => hasAny(instruction.pattern_tags, patterns))
    .filter((instruction) => ids.length === 0 || ids.includes(instruction.instruction_id))
    .filter((instruction) => instruction.roles.length === 0 || hasAny(instruction.roles, query.roles ?? []))
    .filter((instruction) => instruction.products.length === 0 || hasAny(instruction.products, query.products ?? []))
    .filter((instruction) => matchesConditions(instruction, query.conditions))
    .sort((left, right) => compareNames(left.instruction_id, right.instruction_id))
    .map(({ instruction_id, title, summary, capability_tags, pattern_tags, revision }) => ({ instruction_id, title, summary, capability_tags, pattern_tags, revision }));
}

export function catalogGet(_catalog: Catalog, instructions: Map<string, Instruction>, id: string): Instruction {
  const instruction = instructions.get(id);
  if (instruction === undefined) throw new CatalogError('CATALOG_ID_UNKNOWN', `unknown instruction id: ${id}`, { instruction_id: id });
  if (instruction.status === 'disabled') throw new CatalogError('CATALOG_INSTRUCTION_DISABLED', `instruction is disabled: ${id}`, { instruction_id: id });
  return instruction;
}

function addSelected(selected: Map<string, { instruction: Instruction; reason: ComposedInstruction['selection_reason'] }>, instruction: Instruction, reason: ComposedInstruction['selection_reason']): void {
  const existing = selected.get(instruction.instruction_id);
  if (existing === undefined || reason === 'required') selected.set(instruction.instruction_id, { instruction, reason });
}

function profileDrops(instruction: Instruction, query: ComposeQuery): boolean {
  return profileConflictFor(instruction, query.profile) !== undefined;
}

function profileConflictFor(instruction: Instruction, profile: EffectiveProfile | undefined): { group: string; active: string } | undefined {
  if (profile === undefined) return undefined;
  for (const [group, choice] of Object.entries(profile.groups)) {
    if (instruction.pattern_tags.some((tag) => choice.alternatives.includes(tag) && tag !== choice.active)) return { group, active: choice.active };
  }
  return undefined;
}

function validateProfile(profile: EffectiveProfile | undefined): void {
  if (profile === undefined) return;
  for (const [group, choice] of Object.entries(profile.groups)) {
    if (!choice.alternatives.includes(choice.active)) throw new CatalogError('CATALOG_PROFILE_CONFLICT', `active profile pattern is not an alternative in ${group}`, { group, active: choice.active });
  }
}

function checkExcludes(selected: Map<string, { instruction: Instruction; reason: ComposedInstruction['selection_reason'] }>): void {
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

export function catalogCompose(catalog: Catalog, instructions: Map<string, Instruction>, query: ComposeQuery): ComposedBundle {
  validateQueryDimensions(query);
  validateProfile(query.profile);
  const selected = new Map<string, { instruction: Instruction; reason: ComposedInstruction['selection_reason'] }>();
  for (const id of query.required_ids ?? []) addSelected(selected, catalogGet(catalog, instructions, id), 'required');
  const supplied = (value: string[] | undefined): boolean => Array.isArray(value) && value.length > 0;
  const hasSelectionDimension = supplied(query.capability_tags) || supplied(query.pattern_tags) || supplied(query.instruction_ids)
    || supplied(query.roles) || supplied(query.products) || supplied(query.conditions);
  if (hasSelectionDimension) {
    for (const metadata of catalogSearch(catalog, instructions, query)) {
      const instruction = instructions.get(metadata.instruction_id);
      if (instruction !== undefined) addSelected(selected, instruction, 'matched');
    }
  }
  for (const id of query.required_ids ?? []) {
    const instruction = instructions.get(id);
    const conflict = instruction === undefined ? undefined : profileConflictFor(instruction, query.profile);
    if (conflict !== undefined) throw new CatalogError('CATALOG_PROFILE_CONFLICT', `required instruction ${id} conflicts with profile ${conflict.group}`, { ...conflict, instruction_id: id });
  }
  for (const item of [...selected.values()]) if (item.reason === 'matched' && profileDrops(item.instruction, query)) selected.delete(item.instruction.instruction_id);
  const pending = [...selected.values()].map((item) => item.instruction);
  for (let index = 0; index < pending.length; index += 1) {
    const instruction = pending[index];
    if (instruction === undefined) continue;
    for (const dependencyId of instruction.compatibility.requires) {
      const dependency = instructions.get(dependencyId);
      if (dependency === undefined) throw new CatalogError('CATALOG_DEPENDENCY_MISSING', `dependency ${dependencyId} required by ${instruction.instruction_id} is missing`, { instruction_id: instruction.instruction_id, dependency_id: dependencyId });
      if (dependency.status === 'disabled') throw new CatalogError('CATALOG_DEPENDENCY_DISABLED', `dependency ${dependencyId} required by ${instruction.instruction_id} is disabled`, { instruction_id: instruction.instruction_id, dependency_id: dependencyId });
      const profileConflict = profileConflictFor(dependency, query.profile);
      if (profileConflict !== undefined) throw new CatalogError('CATALOG_PROFILE_CONFLICT', `dependency ${dependencyId} required by ${instruction.instruction_id} conflicts with profile ${profileConflict.group}`, { ...profileConflict, dependency_id: dependencyId, requiring_instruction_id: instruction.instruction_id });
      if (!selected.has(dependencyId)) {
        addSelected(selected, dependency, 'dependency');
        pending.push(dependency);
      }
    }
  }
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
