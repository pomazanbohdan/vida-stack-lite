import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { stemToken, tagTokens } from '../skills/vp-mode/scripts/catalog.ts';
import { APPROACH_VOCABULARY, parseApproachAssessments } from '../skills/vp-mode/scripts/instruction-approaches.ts';
import {
  FACETED_INSTRUCTION_SCHEMA_NAME,
  parseFacetClassification,
} from '../skills/vp-mode/scripts/instruction-facets.ts';
import { parseApplicability } from '../skills/vp-mode/scripts/applicability.ts';
import { parseVariantScalar, parseVariantSections } from '../skills/vp-mode/scripts/variants.ts';
import { extractModuleBody, ModuleError, parseModule, validateModuleRecord } from '../skills/vp-mode/scripts/modules.ts';
import { checkCsvSource } from './csv-map.ts';
import { canonicalJson, validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

export type CorpusIssue = { code: string; message: string; details?: Record<string, unknown> };
type Dict = Record<string, unknown>;
type DonorSet = { donors: Map<string, Dict>; localRoot: string };
const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);
const stringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8')) as unknown;

function issue(issues: CorpusIssue[], code: string, message: string, details?: Record<string, unknown>): void {
  if (code === 'CORPUS_CLONE_MISSING' && issues.some((item) => item.code === code && item.details?.donor === details?.donor)) return;
  issues.push(details === undefined ? { code, message } : { code, message, details });
}

function listMarkdown(path: string, issues: CorpusIssue[]): string[] {
  try {
    return readdirSync(path).filter((name) => name.endsWith('.md') && statSync(join(path, name)).isFile()).sort();
  } catch (error) {
    issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot list instruction directory ${path}: ${String(error)}`, { path });
    return [];
  }
}

function checkSchema(value: unknown, schema: Schema, issues: CorpusIssue[], label: string, details?: Record<string, unknown>): boolean {
  const errors = validateAgainstSchema(value, schema);
  if (errors.length > 0) issue(issues, `${label}_SCHEMA_INVALID`, `${label} schema validation failed: ${errors.join('; ')}`, { ...details, errors });
  return errors.length === 0;
}

function readDonors(root: string, issues: CorpusIssue[]): DonorSet {
  try {
    const parsed = Bun.YAML.parse(readFileSync(join(root, 'donors.yaml'), 'utf8')) as unknown;
    const list = isRecord(parsed) && Array.isArray(parsed.donors) ? parsed.donors : [];
    const donors = new Map(list.filter(isRecord).filter((item) => typeof item.id === 'string').map((item) => [item.id as string, item]));
    const declared = isRecord(parsed) && typeof parsed.local_root === 'string' ? parsed.local_root : '';
    const localRoot = declared.startsWith('packages/powers/')
      ? resolve(root, '..', '..', declared)
      : resolve(root, declared);
    return { donors, localRoot };
  } catch (error) {
    issue(issues, 'CORPUS_DONORS_INVALID', `cannot read donors.yaml: ${String(error)}`);
    return { donors: new Map(), localRoot: resolve(root, '.tmp/donors') };
  }
}

function readCorpusJson(root: string, name: string, issues: CorpusIssue[], code: string): Dict {
  try {
    const value = readJson(join(root, name));
    if (isRecord(value)) return value;
    issue(issues, code, `${name} must contain an object`, { path: name });
  } catch (error) {
    issue(issues, code, `cannot read ${name}: ${String(error)}`, { path: name });
  }
  return {};
}

function readInstruction(path: string, file: string, issues: CorpusIssue[], bytes?: string): Dict | undefined {
  try { return parseFrontmatter(bytes ?? readFileSync(path, 'utf8')).data; }
  catch (error) {
    issue(issues, 'CORPUS_FRONTMATTER_INVALID', `instruction ${file} cannot be read or has invalid frontmatter: ${String(error)}`, { path });
    return undefined;
  }
}

function validateManifestPaths(base: string, entries: Dict[], files: string[], issues: CorpusIssue[]): Map<string, string> {
  const instructionRoot = join(base, 'instructions');
  const diskPaths = new Set<string>();
  const bytesByFile = new Map<string, string>();
  for (const entry of entries) {
    const entryId = typeof entry.instruction_id === 'string' ? entry.instruction_id : String(entry.instruction_id);
    const rel = typeof entry.path === 'string' ? entry.path : '';
    const absolute = resolve(base, rel);
    const inside = !isAbsolute(rel) && absolute.startsWith(`${instructionRoot}${sep}`);
    if (!inside) { issue(issues, 'CORPUS_PATH_INVALID', `manifest entry ${entryId} path ${rel} must point to a file inside instructions/`, { instruction_id: entryId, path: rel }); continue; }
    const fileName = relative(instructionRoot, absolute);
    diskPaths.add(fileName);
    try {
      const stat = statSync(absolute);
      if (!stat.isFile()) { issue(issues, 'CORPUS_PATH_INVALID', `manifest entry ${entryId} path ${rel} is not a regular file`, { instruction_id: entryId, path: rel }); continue; }
      const bytes = readFileSync(absolute);
      const digest = createHash('sha256').update(bytes).digest('hex');
      if (digest !== entry.sha256) issue(issues, 'CORPUS_DIGEST_MISMATCH', `instruction ${entryId} at ${rel} sha256 does not match catalog.json`, { instruction_id: entryId, path: rel, expected: entry.sha256, actual: digest });
      bytesByFile.set(fileName, bytes.toString('utf8'));
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') issue(issues, 'CORPUS_MANIFEST_FILE_MISSING', `manifest entry ${entryId} lists missing path ${rel}`, { instruction_id: entryId, path: rel });
      else issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot inspect manifest path ${rel} for ${entryId}: ${String(error)}`, { instruction_id: entryId, path: rel });
    }
  }
  for (const file of files) if (!diskPaths.has(file)) issue(issues, 'CORPUS_FILE_UNMANIFESTED', `instruction file instructions/${file} has no manifest entry`, { path: `instructions/${file}` });
  return bytesByFile;
}

function checkDictionary(catalog: Dict, issues: CorpusIssue[]): { dictionary: Dict; aliases: Dict; exemptions: Dict[] } {
  const dictionary = isRecord(catalog.tag_dictionary) ? catalog.tag_dictionary : {};
  const dimensions = ['capability', 'pattern'] as const;
  const tagShape = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
  for (const dimension of dimensions) {
    const entries = isRecord(dictionary[dimension]) ? dictionary[dimension] as Dict : {};
    for (const [tag, description] of Object.entries(entries)) {
      if (!tagShape.test(tag)) issue(issues, 'CORPUS_TAG_SHAPE_INVALID', `${dimension} tag ${tag} is not a two-component kebab tag`, { dimension, tag });
      if (typeof description !== 'string' || description.trim() === '') issue(issues, 'CORPUS_TAG_DESCRIPTION_EMPTY', `${dimension} tag ${tag} has an empty description`, { dimension, tag });
    }
  }
  const aliases = isRecord(catalog.tag_aliases) ? catalog.tag_aliases : {};
  const aliasKeys = new Map<string, { alias: string; target: string }>();
  for (const [alias, target] of Object.entries(aliases)) {
    if (typeof target !== 'string' || !dimensions.some((dimension) => isRecord(dictionary[dimension]) && Object.prototype.hasOwnProperty.call(dictionary[dimension], target))) issue(issues, 'CORPUS_TAG_ALIAS_INVALID', `tag alias ${alias} targets unknown canonical tag ${String(target)}`, { alias, target });
    if (dimensions.some((dimension) => isRecord(dictionary[dimension]) && Object.prototype.hasOwnProperty.call(dictionary[dimension], alias))) issue(issues, 'CORPUS_TAG_ALIAS_INVALID', `tag alias ${alias} is also a canonical tag`, { alias });
    if (typeof target !== 'string') continue;
    const key = tagTokens(alias).map(stemToken).join(' ');
    const prior = aliasKeys.get(key);
    if (prior !== undefined && prior.target !== target) {
      issue(issues, 'CORPUS_TAG_ALIAS_COLLISION', `aliases ${prior.alias} and ${alias} share the resolver key ${key} but target ${prior.target} and ${target}`, { alias, prior: prior.alias, key });
    } else {
      aliasKeys.set(key, { alias, target });
    }
  }
  const exemptions = Array.isArray(catalog.tag_exemptions) ? catalog.tag_exemptions.filter(isRecord) : [];
  return { dictionary, aliases, exemptions };
}

function checkInstructionTags(id: string, front: Dict, dictionary: Dict, aliases: Dict, exemptions: Dict[], issues: CorpusIssue[]): void {
  for (const dimension of ['capability', 'pattern'] as const) {
    const field = dimension === 'capability' ? 'capability_tags' : 'pattern_tags';
    const tags = stringArray(front[field]);
    const exemption = exemptions.find((item) => item.instruction_id === id && item.dimension === dimension);
    if (exemption !== undefined && (typeof exemption.reason !== 'string' || exemption.reason.trim() === '')) issue(issues, 'CORPUS_TAG_EXEMPTION_INVALID', `instruction ${id} ${dimension} tag exemption has no reason`, { instruction_id: id, dimension });
    if (tags.length === 0 && exemption === undefined) issue(issues, 'CORPUS_TAG_EMPTY', `instruction ${id} has no ${dimension} tags and no exemption`, { instruction_id: id, dimension });
    for (const tag of tags) {
      if (Object.prototype.hasOwnProperty.call(aliases, tag)) issue(issues, 'CORPUS_TAG_ALIAS_IN_INSTRUCTION', `instruction ${id} uses tag alias ${tag}; use the canonical tag ${String(aliases[tag])}`, { instruction_id: id, tag, canonical: aliases[tag] });
      if (!Object.prototype.hasOwnProperty.call(aliases, tag) && (!isRecord(dictionary[dimension]) || !Object.prototype.hasOwnProperty.call(dictionary[dimension], tag)) && exemption === undefined) issue(issues, 'CORPUS_TAG_UNKNOWN', `instruction ${id} has unknown ${dimension} tag ${tag}`, { instruction_id: id, dimension, tag });
    }
  }
}

type DonorRoots = { cloneRoot: string; contentRoot: string };

function checkProvenance(id: string, front: Dict, donors: DonorSet, seenSources: Set<string>, issues: CorpusIssue[], donorRoots: Map<string, DonorRoots>, regularSources: Set<string>): void {
  const raw = Array.isArray(front.provenance) ? front.provenance : [];
  const sources = raw.map((value) => {
    if (isRecord(value)) return value;
    if (typeof value !== 'string') return {};
    return Object.fromEntries(value.split(';').map((part) => {
      const separator = part.indexOf('=');
      return separator < 0 ? [part.trim(), ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    }));
  });
  if (sources.length === 0) issue(issues, 'CORPUS_PROVENANCE_MISSING', `instruction ${id} has no provenance entry`, { instruction_id: id });
  for (const source of sources) {
    const donorId = String(source.donor ?? ''); const donor = donors.donors.get(donorId); const sourcePath = String(source.path ?? '');
    const key = `${donorId}\0${String(source.revision)}\0${sourcePath}`;
    if (seenSources.has(key)) issue(issues, 'CORPUS_PROVENANCE_DUPLICATE', `instruction ${id} repeats source ${donorId}:${sourcePath}`, { instruction_id: id, donor: donorId, path: sourcePath });
    seenSources.add(key);
    if (donor === undefined) { issue(issues, 'CORPUS_PROVENANCE_MISMATCH', `instruction ${id} references unknown donor ${donorId}`, { instruction_id: id, donor: donorId }); continue; }
    if (source.license !== donor.license || source.revision !== donor.head_sha) issue(issues, 'CORPUS_PROVENANCE_MISMATCH', `instruction ${id} donor ${donorId} license or revision does not match donors.yaml`, { instruction_id: id, donor: donorId, path: sourcePath });
    // The clone root and the content root of a donor do not change during one
    // validation run, so a donor that is present is inspected once and reused.
    // A donor that is missing or broken is inspected per entry, so that every
    // entry that names it reports the same defect as before.
    let cloneRoot: string;
    let contentRoot: string;
    const cached = donorRoots.get(donorId);
    if (cached !== undefined) {
      cloneRoot = cached.cloneRoot;
      contentRoot = cached.contentRoot;
    } else {
      cloneRoot = resolve(donors.localRoot, String(donor.local_path ?? ''));
      contentRoot = resolve(cloneRoot, String(donor.content_path ?? ''));
      let cloneAvailable = false;
      try { cloneAvailable = statSync(cloneRoot).isDirectory(); } catch (error) {
        if (!(isRecord(error) && error.code === 'ENOENT')) issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot inspect donor clone ${cloneRoot}: ${String(error)}`, { donor: donorId, path: cloneRoot });
      }
      if (!cloneAvailable) { issue(issues, 'CORPUS_CLONE_MISSING', `pinned clone for donor ${donorId} is unavailable at ${cloneRoot}`, { donor: donorId, path: cloneRoot }); continue; }
      let contentAvailable = false;
      try { contentAvailable = statSync(contentRoot).isDirectory(); } catch (error) {
        if (!(isRecord(error) && error.code === 'ENOENT')) issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot inspect donor content root ${contentRoot}: ${String(error)}`, { donor: donorId, path: contentRoot });
      }
      if (!contentAvailable) { issue(issues, 'CORPUS_CLONE_MISSING', `pinned clone content for donor ${donorId} is unavailable at ${contentRoot}`, { donor: donorId, path: contentRoot }); continue; }
      donorRoots.set(donorId, { cloneRoot, contentRoot });
    }
    const sourceFile = resolve(contentRoot, sourcePath);
    if (sourceFile === contentRoot || !sourceFile.startsWith(`${contentRoot}${sep}`)) { issue(issues, 'CORPUS_PROVENANCE_PATH_INVALID', `instruction ${id} donor path ${sourcePath} escapes pinned clone ${donorId}`, { instruction_id: id, donor: donorId, path: sourcePath }); continue; }
    // The same donor file is cited by many instructions; a file that is present
    // and regular is inspected once.
    const sourceKey = `${donorId}::${sourcePath}`;
    if (regularSources.has(sourceKey)) continue;
    try {
      if (!statSync(sourceFile).isFile()) issue(issues, 'CORPUS_PROVENANCE_PATH_INVALID', `instruction ${id} donor path ${donorId}:${sourcePath} is not a regular file`, { instruction_id: id, donor: donorId, path: sourcePath });
      else regularSources.add(sourceKey);
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') issue(issues, 'CORPUS_PROVENANCE_PATH_MISSING', `instruction ${id} source ${donorId}:${sourcePath} does not exist in the pinned clone`, { instruction_id: id, donor: donorId, path: sourcePath });
      else issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot inspect donor path ${donorId}:${sourcePath}: ${String(error)}`, { instruction_id: id, donor: donorId, path: sourcePath });
    }
  }
}

function checkMap(map: Dict, donors: DonorSet, catalogEntryIds: Set<string>, atomicIds: Set<string>, allIds: Set<string>, moduleAtomIds: Set<string>, familyVariants: Map<string, Set<string>>, variantFamilies: Map<string, string>, issues: CorpusIssue[]): void {
  const donorMaps = isRecord(map.donors) ? map.donors : {};
  const mappedIds = new Set<string>();
  const boundVariants = new Map<string, number>();
  for (const [donorId, rawDonor] of Object.entries(donorMaps)) {
    const donorMap = isRecord(rawDonor) ? rawDonor : {};
    const donor = donors.donors.get(donorId);
    if (donor === undefined || donorMap.source_revision !== donor.head_sha) issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map donor ${donorId} source_revision does not match donors.yaml`, { donor: donorId });
    const files = isRecord(donorMap.files) ? donorMap.files : {};
    for (const [sourcePath, rawRecord] of Object.entries(files)) {
      const record = isRecord(rawRecord) ? rawRecord : {}; const named = stringArray(record.instruction_ids);
      for (const id of named) {
        if (id.startsWith('module-')) {
          issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map ${donorId}:${sourcePath} binds module carrier ${id}; bind atom IDs`, { donor: donorId, path: sourcePath, instruction_id: id });
          continue;
        }
        if (!allIds.has(id)) issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map ${donorId}:${sourcePath} names unknown instruction ${id}`, { donor: donorId, path: sourcePath, instruction_id: id });
        if (atomicIds.has(id)) mappedIds.add(id);
        else if (catalogEntryIds.has(id)) for (const variantId of familyVariants.get(id) ?? []) mappedIds.add(variantId);
      }
      const invalid = (record.status === 'converted' && named.length !== 1) || (record.status === 'split' && named.length < 2) || (record.status === 'rejected' && (typeof record.reason !== 'string' || record.reason.trim() === '' || named.length > 0)) || (record.status === 'merged' && (named.length === 0 || stringArray(record.contributed_sources).length === 0));
      if (invalid) issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map ${donorId}:${sourcePath} has inconsistent ${String(record.status)} status`, { donor: donorId, path: sourcePath, status: record.status });
    }
    const csvSources = isRecord(donorMap.csvSources) ? donorMap.csvSources : {};
    for (const [sourcePath, rawSource] of Object.entries(csvSources)) {
      const source = isRecord(rawSource) ? rawSource : {};
      for (const rawRow of Array.isArray(source.rows) ? source.rows.filter(isRecord) : []) {
        for (const rawBinding of Array.isArray(rawRow.bindings) ? rawRow.bindings.filter(isRecord) : []) {
          const id = String(rawBinding.instructionId ?? '');
          const moduleCarrier = id.startsWith('module-');
          if (moduleCarrier) issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map ${donorId}:${sourcePath} binds module carrier ${id}; bind atom IDs`, { donor: donorId, path: sourcePath, instruction_id: id });
          else mappedIds.add(id);
          if (!moduleCarrier && !allIds.has(id)) issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map ${donorId}:${sourcePath} names unknown instruction ${id}`, { donor: donorId, path: sourcePath, instruction_id: id });
          if (map.schema === 'VPCorpusMap/v3' && rawRow.disposition === 'admitted') {
            const variantId = String(rawBinding.variantId ?? '');
            const family = familyVariants.get(id);
            if (variantId === '') issue(issues, 'CORPUS_MAP_INCONSISTENT', `v3 binding for ${id} is missing variantId`, { donor: donorId, path: sourcePath, instruction_id: id });
             else if (family !== undefined) {
              if (!family.has(variantId) || variantFamilies.get(variantId) !== id) issue(issues, 'CORPUS_MAP_INCONSISTENT', `v3 binding variant ${variantId} does not belong to family ${id}`, { donor: donorId, path: sourcePath, instruction_id: id, variant_id: variantId });
               else { boundVariants.set(variantId, (boundVariants.get(variantId) ?? 0) + 1); mappedIds.add(variantId); }
             } else if (variantId !== id) issue(issues, 'CORPUS_MAP_INCONSISTENT', `v3 singleton binding must use variantId ${id}`, { donor: donorId, path: sourcePath, instruction_id: id, variant_id: variantId });
             else mappedIds.add(variantId);
          }
           else if (atomicIds.has(id)) mappedIds.add(id);
        }
      }
    }
  }
  for (const id of atomicIds) {
    if (!mappedIds.has(id)) issue(issues, moduleAtomIds.has(id) ? 'CORPUS_MODULE_MAP_COVERAGE' : 'CORPUS_MAP_INCONSISTENT', `instruction ${id} has no corpus map record`, { instruction_id: id });
  }
  for (const id of catalogEntryIds) {
    if (id.startsWith('module-') || atomicIds.has(id)) continue;
    if (!mappedIds.has(id)) issue(issues, 'CORPUS_MAP_INCONSISTENT', `instruction ${id} has no corpus map record`, { instruction_id: id });
  }
  if (map.schema === 'VPCorpusMap/v3') for (const [familyId, variants] of familyVariants) for (const variantId of variants) {
    const count = boundVariants.get(variantId) ?? 0;
    if (count !== 1) issue(issues, 'CORPUS_MAP_INCONSISTENT', `family variant ${variantId} must have exactly one admitted binding`, { instruction_id: familyId, variant_id: variantId, bindings: count });
  }
}

function checkDonorCoverage(map: Dict, donors: DonorSet, issues: CorpusIssue[]): void {
  const donorMaps = isRecord(map.donors) ? map.donors : {};
  for (const [donorId, donor] of donors.donors) {
    if (!Object.prototype.hasOwnProperty.call(donorMaps, donorId)) continue;
    const cloneRoot = resolve(donors.localRoot, String(donor.local_path ?? ''));
    const contentRoot = resolve(cloneRoot, String(donor.content_path ?? ''));
    let cloneStat;
    try { cloneStat = statSync(cloneRoot); }
    catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') issue(issues, 'CORPUS_CLONE_MISSING', `pinned clone for donor ${donorId} is unavailable at ${cloneRoot}`, { donor: donorId, path: cloneRoot });
      else issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot inspect donor clone ${cloneRoot}: ${String(error)}`, { donor: donorId, path: cloneRoot });
      continue;
    }
    if (!cloneStat.isDirectory()) {
      issue(issues, 'CORPUS_FILESYSTEM_ERROR', `donor clone path ${cloneRoot} for ${donorId} is not a directory`, { donor: donorId, path: cloneRoot });
      continue;
    }
    let contentStat;
    try { contentStat = statSync(contentRoot); }
    catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') issue(issues, 'CORPUS_CLONE_MISSING', `pinned clone content for donor ${donorId} is unavailable at ${contentRoot}`, { donor: donorId, path: contentRoot });
      else issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot inspect donor content root ${contentRoot}: ${String(error)}`, { donor: donorId, path: contentRoot });
      continue;
    }
    if (!contentStat.isDirectory()) {
      issue(issues, 'CORPUS_FILESYSTEM_ERROR', `donor content path ${contentRoot} for ${donorId} is not a directory`, { donor: donorId, path: contentRoot });
      continue;
    }
    const carrierPaths = new Set<string>();
    const visit = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) visit(absolute);
        else if (entry.isFile() && entry.name.endsWith('.md')) carrierPaths.add(relative(contentRoot, absolute).split(sep).join('/'));
      }
    };
    try { visit(contentRoot); }
    catch (error) { issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot enumerate donor clone ${cloneRoot}: ${String(error)}`, { donor: donorId, path: cloneRoot }); continue; }
    const donorMap = isRecord(donorMaps[donorId]) ? donorMaps[donorId] as Dict : {};
    const records = isRecord(donorMap.files) ? donorMap.files : {};
    for (const path of carrierPaths) if (!Object.prototype.hasOwnProperty.call(records, path)) issue(issues, 'CORPUS_MAP_COVERAGE_MISSING', `corpus map is missing donor ${donorId} file ${path}; add exactly one record at donors.${donorId}.files[${JSON.stringify(path)}]`, { donor: donorId, path });
    for (const path of Object.keys(records)) if (!carrierPaths.has(path)) issue(issues, 'CORPUS_MAP_COVERAGE_UNKNOWN', `corpus map record ${donorId}:${path} names a file not found in the pinned clone`, { donor: donorId, path });
  }
}

function checkMethodologyProfile(base: string, catalog: Dict, frontmatterById: Map<string, Dict>, issues: CorpusIssue[]): void {
  const profilePath = join(base, 'config', 'methodology-profile.json');
  if (!existsSync(profilePath)) return;
  let profile: unknown;
  try { profile = readJson(profilePath); }
  catch (error) { issue(issues, 'CORPUS_PROFILE_INVALID', `cannot read methodology-profile.json: ${String(error)}`, { path: 'config/methodology-profile.json' }); return; }
  const schema = readJson(join(packageRoot, 'config', 'vpmethodologyprofile.v1.schema.json')) as Schema;
  const errors = validateAgainstSchema(profile, schema);
  if (errors.length > 0) issue(issues, 'CORPUS_PROFILE_INVALID', `methodology profile schema validation failed: ${errors.join('; ')}`, { errors });
  if (!isRecord(profile) || !Array.isArray(profile.groups)) return;
  const patterns = isRecord(catalog.tag_dictionary) && isRecord(catalog.tag_dictionary.pattern) ? catalog.tag_dictionary.pattern : {};
  const owners = new Map<string, string>();
  const groupIds = new Set<string>();
  const alternativeOwners = new Map<string, string>();
  for (const group of profile.groups.filter(isRecord)) {
    const groupId = String(group.id ?? '');
    if (groupIds.has(groupId)) issue(issues, 'CORPUS_PROFILE_GROUP_DUPLICATE', `duplicate methodology group ${groupId}`, { group_id: groupId });
    groupIds.add(groupId);
    const alternatives = Array.isArray(group.alternatives) ? group.alternatives.filter(isRecord) : [];
    const defaultId = group.default;
    const hasDefault = Object.prototype.hasOwnProperty.call(group, 'default');
    if ((group.user_decision === true && hasDefault)
      || (group.user_decision === false && (!hasDefault || typeof defaultId !== 'string' || !alternatives.some((alternative) => alternative.id === defaultId)))) {
      issue(issues, 'CORPUS_PROFILE_POLICY_DEFAULT_INVALID', `methodology group ${groupId} must omit default when user_decision is true and declare a valid alternative default when user_decision is false`, { group_id: groupId, user_decision: group.user_decision, default: defaultId });
    }
    if (group.user_decision === true && alternatives.length < 2) issue(issues, 'CORPUS_PROFILE_DECISION_INVALID', `user-decision group ${groupId} must have at least two alternatives`, { group_id: groupId });
    for (const alternative of alternatives) {
      const alternativeId = String(alternative.id ?? '');
      const alternativeOwner = alternativeOwners.get(alternativeId);
      if (alternativeOwner !== undefined) issue(issues, 'CORPUS_PROFILE_ALTERNATIVE_DUPLICATE', `alternative ${alternativeId} is repeated in groups ${alternativeOwner} and ${groupId}`, { group_id: groupId, alternative_id: alternativeId, previous_group_id: alternativeOwner });
      else alternativeOwners.set(alternativeId, groupId);
      if (!Object.prototype.hasOwnProperty.call(patterns, alternativeId)) issue(issues, 'CORPUS_PROFILE_TAG_UNKNOWN', `profile alternative ${alternativeId} is not a pattern tag in catalog.json`, { group_id: groupId, alternative_id: alternativeId });
      for (const instructionId of stringArray(alternative.instruction_ids)) {
        const front = frontmatterById.get(instructionId);
        if (front === undefined) issue(issues, 'CORPUS_PROFILE_INSTRUCTION_UNKNOWN', `profile alternative ${alternativeId} names unknown instruction ${instructionId}`, { group_id: groupId, alternative_id: alternativeId, instruction_id: instructionId });
        else {
          if (front.status !== 'active') issue(issues, 'CORPUS_PROFILE_INSTRUCTION_DISABLED', `profile alternative ${alternativeId} names inactive instruction ${instructionId}`, { group_id: groupId, alternative_id: alternativeId, instruction_id: instructionId });
          if (!stringArray(front.pattern_tags).includes(alternativeId)) issue(issues, 'CORPUS_PROFILE_INSTRUCTION_TAG_MISMATCH', `profile alternative ${alternativeId} names instruction ${instructionId} without its pattern tag`, { group_id: groupId, alternative_id: alternativeId, instruction_id: instructionId });
        }
        const owner = owners.get(instructionId);
        if (owner !== undefined) issue(issues, 'CORPUS_PROFILE_INSTRUCTION_DUPLICATE', `instruction ${instructionId} belongs to alternatives ${owner} and ${alternativeId}`, { instruction_id: instructionId, alternatives: [owner, alternativeId] });
        else owners.set(instructionId, alternativeId);
      }
      const declared = new Set(stringArray(alternative.instruction_ids));
      if (alternatives.length > 1) {
        for (const [instructionId, front] of frontmatterById) {
          if (stringArray(front.pattern_tags).includes(alternativeId) && !declared.has(instructionId)) {
            issue(issues, 'CORPUS_PROFILE_TAG_UNDECLARED_CARRIER', `pattern tag ${alternativeId} is carried by ${instructionId} but the profile does not declare it`, { group_id: groupId, alternative_id: alternativeId, instruction_id: instructionId });
          }
        }
      }
    }
  }
}

function checkCsvSources(base: string, map: Dict, donors: DonorSet, instructionIds: Set<string>, resourceIds: Set<string>, variantFamilies: Map<string, string>, familyIds: Set<string>, variantBodyHashes: Map<string, string>, issues: CorpusIssue[]): void {
  let allowlist: Dict[] = [];
  for (const name of ['h2-csv-allowlist.json', 'h3-csv-allowlist.json']) {
    const allowlistPath = join(packageRoot, 'config', name);
    if (!existsSync(allowlistPath)) continue;
    const raw = readJson(allowlistPath);
    if (Array.isArray(raw)) allowlist.push(...raw.filter(isRecord));
  }
  const donorMaps = isRecord(map.donors) ? map.donors : {};
  const receipts = new Map<string, { sha256: string; value: Dict }>();
  for (const rawDonor of Object.values(donorMaps)) {
    const donorMap = isRecord(rawDonor) ? rawDonor : {};
    const csvSources = isRecord(donorMap.csvSources) ? donorMap.csvSources : {};
    for (const rawSource of Object.values(csvSources)) {
      const source = isRecord(rawSource) ? rawSource : {};
      const rows = Array.isArray(source.rows) ? source.rows.filter(isRecord) : [];
      for (const row of rows) {
        const bindings = Array.isArray(row.bindings) ? row.bindings.filter(isRecord) : [];
        for (const binding of bindings) {
          const fidelity = isRecord(binding.fidelity) ? binding.fidelity : {};
          const path = typeof fidelity.path === 'string' ? fidelity.path : '';
          if (path === '' || receipts.has(path)) continue;
          const resolved = resolve(base, path);
          const rel = relative(base, resolved);
          if (rel.startsWith('..') || isAbsolute(rel)) {
            issue(issues, 'CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt ${path} escapes the corpus root`, { path });
            continue;
          }
          try {
            const bytes = readFileSync(resolved);
            const value = JSON.parse(bytes.toString('utf8')) as unknown;
            if (!isRecord(value)) throw new Error('receipt must be an object');
            receipts.set(path, { sha256: createHash('sha256').update(bytes).digest('hex'), value });
          } catch (error) {
            issue(issues, 'CORPUS_CSV_FIDELITY_MISSING', `cannot read fidelity receipt ${path}: ${String(error)}`, { path });
          }
        }
      }
    }
  }
  for (const [donorId, rawDonor] of Object.entries(donorMaps)) {
    const donor = donors.donors.get(donorId);
    if (donor === undefined) continue;
    const donorMap = isRecord(rawDonor) ? rawDonor : {};
    const csvSources = isRecord(donorMap.csvSources) ? donorMap.csvSources : {};
    if (Object.keys(csvSources).length === 0) continue;
    const cloneRoot = resolve(donors.localRoot, String(donor.local_path ?? ''));
    const contentRoot = resolve(cloneRoot, String(donor.content_path ?? ''));
    for (const [path, rawSource] of Object.entries(csvSources)) {
      const source = isRecord(rawSource) ? rawSource : {};
      const allowlistEntry = allowlist.find((entry) => entry.donor === donorId && entry.path === path);
      let bytes: Uint8Array;
      try {
        bytes = readFileSync(join(contentRoot, path));
      } catch (error) {
        issue(issues, 'CORPUS_CSV_MISSING', `cannot read CSV ${donorId}:${path}`, { donor: donorId, path, error: String(error) });
        continue;
      }
      for (const problem of checkCsvSource({ donor: donorId, path, bytes, source, allowlistEntry, instructionIds, resourceIds, receipts, ...(map.schema === 'VPCorpusMap/v3' ? { variantFamilies, familyIds, variantBodyHashes } : {}) })) {
        issue(issues, problem.code, problem.message, problem.details);
      }
    }
  }
}

const RESOURCE_MAX_BYTES = 65_536;

function checkResourceRecords(base: string, entries: Dict[], issues: CorpusIssue[]): void {
  const schema = readJson(join(packageRoot, 'config', 'vpreference-resource.v1.schema.json')) as Schema;
  const resourcesRoot = join(base, 'resources');
  for (const entry of entries) {
    const id = String(entry.resource_id ?? '');
    const rel = typeof entry.path === 'string' ? entry.path : '';
    const absolute = resolve(base, rel);
    const inside = !isAbsolute(rel) && absolute.startsWith(`${resourcesRoot}${sep}`);
    if (!inside) {
      issue(issues, 'CORPUS_RESOURCE_PATH_INVALID', `catalog resource ${id} path ${rel} must point to a file inside resources/`, { resource_id: id, path: rel });
      continue;
    }
    let bytes: Buffer;
    try {
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        issue(issues, 'CORPUS_RESOURCE_PATH_INVALID', `catalog resource ${id} path ${rel} is not a regular file`, { resource_id: id, path: rel });
        continue;
      }
      bytes = readFileSync(absolute);
    } catch (error) {
      issue(issues, 'CORPUS_RESOURCE_MISSING', `catalog resource ${id} lists unreadable path ${rel}: ${String(error)}`, { resource_id: id, path: rel });
      continue;
    }
    if (bytes.length > RESOURCE_MAX_BYTES) {
      issue(issues, 'CORPUS_RESOURCE_TOO_LARGE', `resource ${id} exceeds the record size limit`, { resource_id: id, bytes: bytes.length, max_bytes: RESOURCE_MAX_BYTES });
      continue;
    }
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== entry.sha256) {
      issue(issues, 'CORPUS_RESOURCE_DIGEST_MISMATCH', `resource ${id} file sha256 does not match catalog.json`, { resource_id: id, expected: entry.sha256, actual });
      continue;
    }
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch {
      issue(issues, 'CORPUS_RESOURCE_MALFORMED', `resource ${id} is not valid UTF-8`, { resource_id: id });
      continue;
    }
    let value: unknown;
    try { value = JSON.parse(text) as unknown; }
    catch (error) {
      issue(issues, 'CORPUS_RESOURCE_MALFORMED', `resource ${id} is malformed JSON: ${error instanceof Error ? error.message : String(error)}`, { resource_id: id });
      continue;
    }
    if (!isRecord(value)) {
      issue(issues, 'CORPUS_RESOURCE_MALFORMED', `resource ${id} is not a JSON object`, { resource_id: id });
      continue;
    }
    const schemaErrors = validateAgainstSchema(value, schema);
    if (schemaErrors.length > 0) {
      issue(issues, 'CORPUS_RESOURCE_SCHEMA_INVALID', `resource ${id} schema validation failed: ${schemaErrors.join('; ')}`, { resource_id: id, errors: schemaErrors });
      continue;
    }
    if (value.resource_id !== id) {
      issue(issues, 'CORPUS_RESOURCE_ID_MISMATCH', `resource record id ${String(value.resource_id)} does not match manifest id ${id}`, { resource_id: id, actual_id: value.resource_id });
      continue;
    }
    const { digest: _digest, ...unsigned } = value;
    const canonical = canonicalJson(unsigned);
    const computed = canonical === undefined ? undefined : `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
    if (computed === undefined || computed !== value.digest) {
      issue(issues, 'CORPUS_RESOURCE_DIGEST_MISMATCH', `resource ${id} record digest does not match its canonical content`, { resource_id: id, expected: value.digest, actual: computed ?? null });
    }
  }
}

function checkResources(base: string, catalog: Dict, map: Dict, issues: CorpusIssue[]): void {
  const entries = Array.isArray(catalog.resources) ? catalog.resources.filter(isRecord) : [];
  const catalogIds = new Set(entries.map((entry) => String(entry.resource_id ?? '')).filter((id) => id !== ''));
  const mappedIds = new Set<string>();
  const donorMaps = isRecord(map.donors) ? map.donors : {};
  for (const rawDonor of Object.values(donorMaps)) {
    const donorMap = isRecord(rawDonor) ? rawDonor : {};
    const csvSources = isRecord(donorMap.csvSources) ? donorMap.csvSources : {};
    for (const rawSource of Object.values(csvSources)) {
      const source = isRecord(rawSource) ? rawSource : {};
      for (const rawRow of Array.isArray(source.rows) ? source.rows.filter(isRecord) : []) {
        for (const rawItem of Array.isArray(rawRow.resourceIds) ? rawRow.resourceIds.filter(isRecord) : []) {
          if (rawItem.disposition === 'admitted') mappedIds.add(String(rawItem.id ?? ''));
        }
      }
    }
  }
  for (const id of catalogIds) {
    if (!mappedIds.has(id)) issue(issues, 'CORPUS_RESOURCE_UNMAPPED', `catalog resource ${id} has no admitted corpus map resourceIds entry`, { resource_id: id });
  }
  for (const id of mappedIds) {
    if (id !== '' && !catalogIds.has(id)) issue(issues, 'CORPUS_RESOURCE_UNKNOWN', `corpus map admits unknown catalog resource ${id}`, { resource_id: id });
  }
  if (entries.length > 0) checkResourceRecords(base, entries, issues);
}

function checkCorpusContents(base: string, issues: CorpusIssue[]): void {
  const catalog = readCorpusJson(base, 'catalog.json', issues, 'CORPUS_MANIFEST_INVALID');
  const map = readCorpusJson(base, 'corpus-map.json', issues, 'CORPUS_MAP_INCONSISTENT');
  const catalogSchema = readJson(join(packageRoot, 'config/vpcatalog.v1.schema.json')) as Schema;
  const mapV1Schema = readJson(join(packageRoot, 'config/vpcorpusmap.v1.schema.json')) as Schema;
  const mapV2Schema = readJson(join(packageRoot, 'config/vpcorpusmap.v2.schema.json')) as Schema;
  const mapV3Schema = readJson(join(packageRoot, 'config/vpcorpusmap.v3.schema.json')) as Schema;
  const instructionV12Schema = readJson(join(packageRoot, 'config', FACETED_INSTRUCTION_SCHEMA_NAME)) as Schema;
  const instructionV2Schema = readJson(join(packageRoot, 'config/vpinstruction.v2.schema.json')) as Schema;
  const instructionV3Schema = readJson(join(packageRoot, 'config/vpinstruction.v3.schema.json')) as Schema;
  const instructionModuleV1Schema = readJson(join(packageRoot, 'config/vpinstructionmodule.v1.schema.json')) as Schema;
  checkSchema(catalog, catalogSchema, issues, 'CORPUS_MANIFEST');
  const mapSchema = map.schema === 'VPCorpusMap/v3' ? mapV3Schema : map.schema === 'VPCorpusMap/v2' ? mapV2Schema : mapV1Schema;
  checkSchema(map, mapSchema, issues, 'CORPUS_MAP');
  const donorSet = readDonors(base, issues);
  const entries = Array.isArray(catalog.instructions) ? catalog.instructions.filter(isRecord) : [];
  const files = listMarkdown(join(base, 'instructions'), issues);
  const instructionBytes = validateManifestPaths(base, entries, files, issues);
  const catalogEntryIds = new Set<string>();
  const entryIdsByFile = new Map<string, string>();
  for (const entry of entries) {
    const id = typeof entry.instruction_id === 'string' ? entry.instruction_id : String(entry.instruction_id);
    const entryPath = typeof entry.path === 'string' ? entry.path : '';
    const filename = basename(resolve(base, entryPath), '.md');
    if (!entryPath.startsWith('instructions/') || !entryPath.endsWith('.md')) continue;
    const previous = entryIdsByFile.get(filename);
    if (previous !== undefined && previous !== id) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `manifest path instructions/${filename}.md has instruction ids ${previous} and ${id}`, { path: `instructions/${filename}.md`, instruction_ids: [previous, id] });
    entryIdsByFile.set(filename, id); catalogEntryIds.add(id);
    if (id !== filename) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `manifest instruction_id ${id} does not match path basename ${filename}`, { instruction_id: id, filename });
  }
  const { dictionary, aliases, exemptions } = checkDictionary(catalog, issues);
  const exemptionKeys = new Set<string>();
  for (const exemption of exemptions) {
    const id = String(exemption.instruction_id ?? ''); const dimension = String(exemption.dimension ?? ''); const key = `${id}\0${dimension}`;
    if (exemptionKeys.has(key)) issue(issues, 'CORPUS_TAG_EXEMPTION_INVALID', `duplicate tag exemption for ${id} dimension ${dimension}`, { instruction_id: id, dimension });
    exemptionKeys.add(key);
  }
  const atomicIds = new Set<string>();
  const allIds = new Set<string>(catalogEntryIds);
  const moduleAtomIds = new Set<string>();
  const moduleAtomOwners = new Map<string, string>();
  const seenCarrierIds = new Set<string>();
  const familyVariants = new Map<string, Set<string>>();
  const variantFamilies = new Map<string, string>();
  const variantBodyHashes = new Map<string, string>();
  const frontmatterById = new Map<string, Dict>();
  const donorRoots = new Map<string, DonorRoots>();
  const regularSources = new Set<string>();
  for (const file of files) {
    const path = join(base, 'instructions', file); const front = readInstruction(path, file, issues, instructionBytes.get(file));
    if (front === undefined) continue;
    const filename = file.slice(0, -3); const id = typeof front.instruction_id === 'string' ? front.instruction_id : '';
    if (id !== filename) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `frontmatter instruction_id ${id} does not match file basename ${filename}`, { instruction_id: id, filename, path: `instructions/${file}` });
    if (seenCarrierIds.has(filename)) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `duplicate instruction identity ${filename}`, { filename });
    seenCarrierIds.add(filename);
    const marker = front.schema;
    if (marker === 'VPInstructionModule/v1') {
      const moduleSchemaErrors = validateAgainstSchema(front, instructionModuleV1Schema);
      if (moduleSchemaErrors.length > 0) issue(issues, 'CORPUS_MODULE_INVALID', `module ${filename} schema validation failed: ${moduleSchemaErrors.join('; ')}`, { instruction_id: filename, errors: moduleSchemaErrors });
      const moduleText = instructionBytes.get(file) ?? readFileSync(path, 'utf8');
      let parsedModule: ReturnType<typeof parseModule> | undefined;
      try {
        parseFrontmatter(moduleText);
        validateModuleRecord(front, filename);
        parsedModule = parseModule(front, extractModuleBody(moduleText), filename);
      } catch (error) {
        const moduleError = error instanceof ModuleError ? error : undefined;
        const code = moduleError?.code === 'MODULE_HASH_MISMATCH'
          ? 'CORPUS_MODULE_HASH_MISMATCH'
          : moduleError?.code === 'MODULE_SECTION_INVALID'
            ? 'CORPUS_MODULE_SECTION_INVALID'
            : 'CORPUS_MODULE_INVALID';
        issue(issues, code, `module ${filename} is invalid: ${error instanceof Error ? error.message : String(error)}`, { instruction_id: filename, ...(moduleError === undefined ? {} : { module_code: moduleError.code, details: moduleError.details }) });
      }
      if (parsedModule !== undefined) {
        const members = new Set<string>();
        for (const member of parsedModule.members) {
          const atomId = member.atom_id;
          if (members.has(atomId) || moduleAtomOwners.has(atomId) || catalogEntryIds.has(atomId) || allIds.has(atomId)) {
            issue(issues, 'CORPUS_MODULE_ATOM_COLLISION', `module atom ${atomId} collides with a carrier or another atom`, { instruction_id: filename, atom_id: atomId, previous_module_id: moduleAtomOwners.get(atomId) });
            issue(issues, 'CORPUS_MODULE_BIJECTION', `module atom ${atomId} does not have one unique module owner`, { instruction_id: filename, atom_id: atomId });
          }
          members.add(atomId);
          moduleAtomOwners.set(atomId, filename);
          moduleAtomIds.add(atomId);
          atomicIds.add(atomId);
          allIds.add(atomId);
          variantBodyHashes.set(atomId, member.content_sha256);
          frontmatterById.set(atomId, member.frontmatter);
          const atomSchema = member.frontmatter.schema === 'VPInstruction/v2' ? instructionV2Schema : instructionV12Schema;
          const atomSchemaErrors = validateAgainstSchema(member.frontmatter, atomSchema);
          if (atomSchemaErrors.length > 0) issue(issues, 'CORPUS_MODULE_INVALID', `module atom ${atomId} schema validation failed: ${atomSchemaErrors.join('; ')}`, { instruction_id: filename, atom_id: atomId, errors: atomSchemaErrors });
          if (member.frontmatter.schema === 'VPInstruction/v2' && member.frontmatter.applicability !== undefined) {
            try { parseApplicability(String(member.frontmatter.applicability)); }
            catch (error) { issue(issues, 'CORPUS_INSTRUCTION_APPLICABILITY_INVALID', `module atom ${atomId} has invalid applicability: ${error instanceof Error ? error.message : String(error)}`, { instruction_id: filename, atom_id: atomId }); }
          }
          if (parseFacetClassification(member.frontmatter) === undefined) issue(issues, 'CORPUS_INSTRUCTION_CLASSIFICATION_INVALID', `module atom ${atomId} has an invalid facet classification`, { instruction_id: filename, atom_id: atomId });
          try { parseApproachAssessments({ data: member.frontmatter, body: member.body }, new Map(Object.entries(APPROACH_VOCABULARY))); }
          catch (error) { issue(issues, 'CORPUS_INSTRUCTION_APPROACH_INVALID', `module atom ${atomId} has invalid approach assessments: ${String(error)}`, { instruction_id: filename, atom_id: atomId }); }
          checkInstructionTags(atomId, member.frontmatter, dictionary, aliases, exemptions, issues);
          if (member.frontmatter.artifact_contract_output_type !== 'none' && (typeof member.frontmatter.artifact_contract_verified_by !== 'string' || member.frontmatter.artifact_contract_verified_by.trim() === '')) issue(issues, 'CORPUS_ARTIFACT_CONTRACT_INVALID', `module atom ${atomId} requires artifact_contract_verified_by`, { instruction_id: filename, atom_id: atomId });
          if (member.frontmatter.artifact_contract_output_type === 'none' && stringArray(member.frontmatter.artifact_contract_required_data).length > 0) issue(issues, 'CORPUS_ARTIFACT_CONTRACT_INVALID', `guidance module atom ${atomId} must have empty artifact_contract_required_data`, { instruction_id: filename, atom_id: atomId });
          checkProvenance(atomId, member.frontmatter, donorSet, new Set<string>(), issues, donorRoots, regularSources);
        }
      }
      continue;
    }
    if (allIds.has(filename) && !catalogEntryIds.has(filename)) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `singleton id ${filename} collides with a module atom`, { instruction_id: filename });
    allIds.add(filename);
    if (marker !== 'VPInstruction/v3') {
      atomicIds.add(filename);
      frontmatterById.set(filename, front);
    }
    if (marker !== 'VPInstruction/v1.2' && marker !== 'VPInstruction/v2' && marker !== 'VPInstruction/v3') {
      issue(issues, 'CORPUS_INSTRUCTION_VERSION_UNSUPPORTED', `instruction ${filename} has an unsupported schema marker`, { instruction_id: filename, schema: front.schema });
    } else {
      const schema = marker === 'VPInstruction/v3' ? instructionV3Schema : marker === 'VPInstruction/v2' ? instructionV2Schema : instructionV12Schema;
      checkSchema(front, schema, issues, 'CORPUS_INSTRUCTION', { instruction_id: filename });
      if (marker === 'VPInstruction/v2' && front.applicability !== undefined) {
        try {
          parseApplicability(String(front.applicability));
        } catch (error) {
          issue(issues, 'CORPUS_INSTRUCTION_APPLICABILITY_INVALID', `instruction ${filename} has invalid applicability: ${error instanceof Error ? error.message : String(error)}`, { instruction_id: filename });
        }
      }
      if (parseFacetClassification(front) === undefined) issue(issues, 'CORPUS_INSTRUCTION_CLASSIFICATION_INVALID', `instruction ${filename} has an invalid facet classification`, { instruction_id: filename });
      try {
        const parsedFile = parseFrontmatter(instructionBytes.get(file) ?? readFileSync(path, 'utf8'));
        variantBodyHashes.set(filename, createHash('sha256').update(parsedFile.body).digest('hex'));
        parseApproachAssessments(parsedFile, new Map(Object.entries(APPROACH_VOCABULARY)));
      } catch (error) {
        issue(issues, 'CORPUS_INSTRUCTION_APPROACH_INVALID', `instruction ${filename} has invalid approach assessments: ${String(error)}`, { instruction_id: filename });
      }
      if (marker === 'VPInstruction/v3') {
        const parsed = parseFrontmatter(instructionBytes.get(file) ?? readFileSync(path, 'utf8'));
        try {
          const variants = parseVariantScalar(String(front.instruction_variants), filename);
          const sections = parseVariantSections(parsed.body, variants, filename);
          const ids = new Set<string>();
          const familyProvenance = new Set(stringArray(front.provenance));
          for (const variant of variants) {
            if (allIds.has(variant.variant_id) || variant.variant_id === filename || variantFamilies.has(variant.variant_id)) {
              issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `variant id ${variant.variant_id} collides with a family or singleton id`, { instruction_id: filename, variant_id: variant.variant_id });
            }
            ids.add(variant.variant_id);
            atomicIds.add(variant.variant_id);
            allIds.add(variant.variant_id);
            variantFamilies.set(variant.variant_id, filename);
            const body = sections.get(variant.variant_id) ?? '';
            variantBodyHashes.set(variant.variant_id, variant.contentSha256);
            for (const source of variant.provenance) if (!familyProvenance.has(source)) issue(issues, 'CORPUS_PROVENANCE_MISMATCH', `family ${filename} provenance omits variant ${variant.variant_id} source`, { instruction_id: filename, variant_id: variant.variant_id, source });
            const variantFront: Dict = {
              instruction_id: variant.variant_id, status: variant.status, pattern_tags: variant.pattern_tags,
              capability_tags: variant.capability_tags, compatibility_requires: variant.compatibility_requires,
              compatibility_excludes: variant.compatibility_excludes,
            };
            frontmatterById.set(variant.variant_id, variantFront);
            for (const [dimension, tags] of [['capability', variant.capability_tags], ['pattern', variant.pattern_tags]] as const) {
              const familyTags = stringArray(front[dimension === 'capability' ? 'capability_tags' : 'pattern_tags']);
              for (const tag of tags) if (!familyTags.includes(tag)) issue(issues, 'CORPUS_TAG_UNKNOWN', `variant ${variant.variant_id} tag ${tag} is absent from family ${filename} tag union`, { instruction_id: filename, variant_id: variant.variant_id, dimension, tag });
            }
            checkInstructionTags(filename, variantFront, dictionary, aliases, exemptions, issues);
            try {
              const variantParsed = { ...parsed, data: { ...parsed.data, approach_assessments: variant.approach_assessments, approach_body_sha256: variant.approach_body_sha256 }, body };
              parseApproachAssessments(variantParsed, new Map(Object.entries(APPROACH_VOCABULARY)));
            } catch (error) { issue(issues, 'CORPUS_INSTRUCTION_APPROACH_INVALID', `variant ${variant.variant_id} has invalid approach assessments: ${String(error)}`, { instruction_id: filename, variant_id: variant.variant_id }); }
          }
          familyVariants.set(filename, ids);
        } catch (error) {
          issue(issues, 'CORPUS_INSTRUCTION_VARIANTS_INVALID', `family ${filename} variants or section payloads are invalid: ${String(error)}`, { instruction_id: filename, error: String(error) });
        }
      }
    }
    checkInstructionTags(filename, front, dictionary, aliases, exemptions, issues);
    if (front.artifact_contract_output_type !== 'none' && (typeof front.artifact_contract_verified_by !== 'string' || front.artifact_contract_verified_by.trim() === '')) issue(issues, 'CORPUS_ARTIFACT_CONTRACT_INVALID', `instruction ${filename} requires artifact_contract_verified_by`, { instruction_id: filename });
    if (front.artifact_contract_output_type === 'none' && stringArray(front.artifact_contract_required_data).length > 0) issue(issues, 'CORPUS_ARTIFACT_CONTRACT_INVALID', `guidance instruction ${filename} must have empty artifact_contract_required_data`, { instruction_id: filename });
    const seenSources = new Set<string>();
    checkProvenance(filename, front, donorSet, seenSources, issues, donorRoots, regularSources);
  }
  for (const [id, front] of frontmatterById) {
    for (const field of ['compatibility_requires', 'compatibility_excludes']) for (const ref of stringArray(front[field])) {
      if (!atomicIds.has(ref)) issue(issues, 'CORPUS_COMPATIBILITY_UNKNOWN', `instruction ${id} references unknown compatibility id ${ref}`, { instruction_id: id, compatibility_id: ref });
      if (field === 'compatibility_requires' && ref === id) issue(issues, 'CORPUS_COMPATIBILITY_SELF_REQUIRE', `instruction ${id} requires itself`, { instruction_id: id });
    }
  }
  for (const exemption of exemptions) {
    const id = String(exemption.instruction_id ?? '');
    if (!atomicIds.has(id)) issue(issues, 'CORPUS_TAG_EXEMPTION_INVALID', `tag exemption names unknown atomic instruction ${id}`, { instruction_id: id, dimension: exemption.dimension });
  }
  checkMap(map, donorSet, catalogEntryIds, atomicIds, allIds, moduleAtomIds, familyVariants, variantFamilies, issues);
  const csvBindingIds = new Set([...atomicIds, ...familyVariants.keys()]);
  const catalogResourceIds = new Set((Array.isArray(catalog.resources) ? catalog.resources.filter(isRecord) : []).map((entry) => String(entry.resource_id ?? '')).filter((id) => id !== ''));
  checkCsvSources(base, map, donorSet, csvBindingIds, catalogResourceIds, variantFamilies, new Set(familyVariants.keys()), variantBodyHashes, issues);
  checkResources(base, catalog, map, issues);
  checkDonorCoverage(map, donorSet, issues);
  checkMethodologyProfile(base, catalog, frontmatterById, issues);
}

export function checkCorpus(root: string): CorpusIssue[] {
  const issues: CorpusIssue[] = [];
  try { checkCorpusContents(resolve(root), issues); }
  catch (error) { issue(issues, 'CORPUS_FILESYSTEM_ERROR', `corpus validation could not complete for ${root}: ${String(error)}`, { root, error: String(error) }); }
  return issues;
}

export function corpusCli(args: string[]): { issues: CorpusIssue[]; instructions: number; exitCode: number } {
  let root = packageRoot;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--root' && args[index + 1] !== undefined && !args[index + 1]?.startsWith('--')) {
      root = args[index + 1] as string; index += 1;
      continue;
    }
    throw new Error('usage: check-corpus.ts [--root <dir>]');
  }
  const issues = checkCorpus(root);
  let instructions = 0;
  try { instructions = readdirSync(join(resolve(root), 'instructions')).filter((name) => name.endsWith('.md') && statSync(join(resolve(root), 'instructions', name)).isFile()).length; }
  catch { instructions = 0; }
  return { issues, instructions, exitCode: issues.length === 0 ? 0 : 1 };
}

export function runCorpusCli(args: string[], print: (text: string) => void = console.log): number {
  try {
    const result = corpusCli(args);
    print(JSON.stringify({ issues: result.issues, instructions: result.instructions }, null, 2));
    return result.exitCode;
  } catch (error) {
    print(JSON.stringify({ issues: [{ code: 'CORPUS_ARGUMENT_INVALID', message: String(error) }], instructions: 0 }, null, 2));
    return 1;
  }
}

export function startCorpusCli(
  argv: string[],
  print?: (text: string) => void,
  setExitCode: (code: number) => void = code => { process.exitCode = code; },
): number | undefined {
  if (argv[1] === undefined || resolve(argv[1]) !== resolve(fileURLToPath(import.meta.url))) return undefined;
  const code = runCorpusCli(argv.slice(2), print);
  setExitCode(code);
  return code;
}

startCorpusCli(process.argv);
