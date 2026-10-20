import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

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

function checkSchema(value: unknown, path: string, issues: CorpusIssue[], label: string, details?: Record<string, unknown>): void {
  const errors = validateAgainstSchema(value, readJson(path) as Schema);
  if (errors.length > 0) issue(issues, `${label}_SCHEMA_INVALID`, `${label} schema validation failed: ${errors.join('; ')}`, { ...details, errors });
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

function readInstruction(path: string, file: string, issues: CorpusIssue[]): Dict | undefined {
  try { return parseFrontmatter(readFileSync(path, 'utf8')).data; }
  catch (error) {
    issue(issues, 'CORPUS_FRONTMATTER_INVALID', `instruction ${file} cannot be read or has invalid frontmatter: ${String(error)}`, { path });
    return undefined;
  }
}

function validateManifestPaths(base: string, entries: Dict[], files: string[], issues: CorpusIssue[]): Set<string> {
  const instructionRoot = join(base, 'instructions');
  const diskPaths = new Set<string>();
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
      const digest = createHash('sha256').update(readFileSync(absolute)).digest('hex');
      if (digest !== entry.sha256) issue(issues, 'CORPUS_DIGEST_MISMATCH', `instruction ${entryId} at ${rel} sha256 does not match catalog.json`, { instruction_id: entryId, path: rel, expected: entry.sha256, actual: digest });
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') issue(issues, 'CORPUS_MANIFEST_FILE_MISSING', `manifest entry ${entryId} lists missing path ${rel}`, { instruction_id: entryId, path: rel });
      else issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot inspect manifest path ${rel} for ${entryId}: ${String(error)}`, { instruction_id: entryId, path: rel });
    }
  }
  for (const file of files) if (!diskPaths.has(file)) issue(issues, 'CORPUS_FILE_UNMANIFESTED', `instruction file instructions/${file} has no manifest entry`, { path: `instructions/${file}` });
  return diskPaths;
}

function checkDictionary(catalog: Dict, issues: CorpusIssue[]): { dictionary: Dict; aliases: Dict; exemptions: Dict[] } {
  const dictionary = isRecord(catalog.tag_dictionary) ? catalog.tag_dictionary : {};
  const dimensions = ['capability', 'pattern'] as const;
  for (const dimension of dimensions) {
    const entries = isRecord(dictionary[dimension]) ? dictionary[dimension] as Dict : {};
    for (const [tag, description] of Object.entries(entries)) {
      if (typeof description !== 'string' || description.trim() === '') issue(issues, 'CORPUS_TAG_DESCRIPTION_EMPTY', `${dimension} tag ${tag} has an empty description`, { dimension, tag });
    }
  }
  const aliases = isRecord(catalog.tag_aliases) ? catalog.tag_aliases : {};
  for (const [alias, target] of Object.entries(aliases)) {
    if (typeof target !== 'string' || !dimensions.some((dimension) => isRecord(dictionary[dimension]) && Object.prototype.hasOwnProperty.call(dictionary[dimension], target))) issue(issues, 'CORPUS_TAG_ALIAS_INVALID', `tag alias ${alias} targets unknown canonical tag ${String(target)}`, { alias, target });
    if (dimensions.some((dimension) => isRecord(dictionary[dimension]) && Object.prototype.hasOwnProperty.call(dictionary[dimension], alias))) issue(issues, 'CORPUS_TAG_ALIAS_INVALID', `tag alias ${alias} is also a canonical tag`, { alias });
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

function checkProvenance(id: string, front: Dict, donors: DonorSet, seenSources: Set<string>, issues: CorpusIssue[]): void {
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
    const cloneRoot = resolve(donors.localRoot, String(donor.local_path ?? ''));
    const contentRoot = resolve(cloneRoot, String(donor.content_path ?? ''));
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
    const sourceFile = resolve(contentRoot, sourcePath);
    if (sourceFile === contentRoot || !sourceFile.startsWith(`${contentRoot}${sep}`)) { issue(issues, 'CORPUS_PROVENANCE_PATH_INVALID', `instruction ${id} donor path ${sourcePath} escapes pinned clone ${donorId}`, { instruction_id: id, donor: donorId, path: sourcePath }); continue; }
    try {
      if (!statSync(sourceFile).isFile()) issue(issues, 'CORPUS_PROVENANCE_PATH_INVALID', `instruction ${id} donor path ${donorId}:${sourcePath} is not a regular file`, { instruction_id: id, donor: donorId, path: sourcePath });
    } catch (error) {
      if (isRecord(error) && error.code === 'ENOENT') issue(issues, 'CORPUS_PROVENANCE_PATH_MISSING', `instruction ${id} source ${donorId}:${sourcePath} does not exist in the pinned clone`, { instruction_id: id, donor: donorId, path: sourcePath });
      else issue(issues, 'CORPUS_FILESYSTEM_ERROR', `cannot inspect donor path ${donorId}:${sourcePath}: ${String(error)}`, { instruction_id: id, donor: donorId, path: sourcePath });
    }
  }
}

function checkMap(map: Dict, donors: DonorSet, instructionIds: Set<string>, issues: CorpusIssue[]): void {
  const donorMaps = isRecord(map.donors) ? map.donors : {};
  const mappedIds = new Set<string>();
  for (const [donorId, rawDonor] of Object.entries(donorMaps)) {
    const donorMap = isRecord(rawDonor) ? rawDonor : {};
    const donor = donors.donors.get(donorId);
    if (donor === undefined || donorMap.source_revision !== donor.head_sha) issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map donor ${donorId} source_revision does not match donors.yaml`, { donor: donorId });
    const files = isRecord(donorMap.files) ? donorMap.files : {};
    for (const [sourcePath, rawRecord] of Object.entries(files)) {
      const record = isRecord(rawRecord) ? rawRecord : {}; const named = stringArray(record.instruction_ids);
      for (const id of named) { mappedIds.add(id); if (!instructionIds.has(id)) issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map ${donorId}:${sourcePath} names unknown instruction ${id}`, { donor: donorId, path: sourcePath, instruction_id: id }); }
      const invalid = (record.status === 'converted' && named.length !== 1) || (record.status === 'split' && named.length < 2) || (record.status === 'rejected' && (typeof record.reason !== 'string' || record.reason.trim() === '' || named.length > 0)) || (record.status === 'merged' && (named.length === 0 || stringArray(record.contributed_sources).length === 0));
      if (invalid) issue(issues, 'CORPUS_MAP_INCONSISTENT', `corpus map ${donorId}:${sourcePath} has inconsistent ${String(record.status)} status`, { donor: donorId, path: sourcePath, status: record.status });
    }
  }
  for (const id of instructionIds) if (!mappedIds.has(id)) issue(issues, 'CORPUS_MAP_INCONSISTENT', `instruction ${id} has no corpus map record`, { instruction_id: id });
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

function checkMethodologyProfile(base: string, catalog: Dict, instructionIds: Set<string>, issues: CorpusIssue[]): void {
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
  for (const group of profile.groups.filter(isRecord)) {
    const groupId = String(group.id ?? '');
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
      if (!Object.prototype.hasOwnProperty.call(patterns, alternativeId)) issue(issues, 'CORPUS_PROFILE_TAG_UNKNOWN', `profile alternative ${alternativeId} is not a pattern tag in catalog.json`, { group_id: groupId, alternative_id: alternativeId });
      for (const instructionId of stringArray(alternative.instruction_ids)) {
        if (!instructionIds.has(instructionId)) issue(issues, 'CORPUS_PROFILE_INSTRUCTION_UNKNOWN', `profile alternative ${alternativeId} names unknown instruction ${instructionId}`, { group_id: groupId, alternative_id: alternativeId, instruction_id: instructionId });
        const owner = owners.get(instructionId);
        if (owner !== undefined) issue(issues, 'CORPUS_PROFILE_INSTRUCTION_DUPLICATE', `instruction ${instructionId} belongs to alternatives ${owner} and ${alternativeId}`, { instruction_id: instructionId, alternatives: [owner, alternativeId] });
        else owners.set(instructionId, alternativeId);
      }
    }
  }
}

function checkCorpusContents(base: string, issues: CorpusIssue[]): void {
  const catalog = readCorpusJson(base, 'catalog.json', issues, 'CORPUS_MANIFEST_INVALID');
  const map = readCorpusJson(base, 'corpus-map.json', issues, 'CORPUS_MAP_INCONSISTENT');
  checkSchema(catalog, join(packageRoot, 'config/vpcatalog.v1.schema.json'), issues, 'CORPUS_MANIFEST');
  checkSchema(map, join(packageRoot, 'config/vpcorpusmap.v1.schema.json'), issues, 'CORPUS_MAP');
  const donorSet = readDonors(base, issues);
  const entries = Array.isArray(catalog.instructions) ? catalog.instructions.filter(isRecord) : [];
  const files = listMarkdown(join(base, 'instructions'), issues);
  validateManifestPaths(base, entries, files, issues);
  const manifestIds = new Set<string>();
  const entryIdsByFile = new Map<string, string>();
  for (const entry of entries) {
    const id = typeof entry.instruction_id === 'string' ? entry.instruction_id : String(entry.instruction_id);
    const entryPath = typeof entry.path === 'string' ? entry.path : '';
    const filename = basename(resolve(base, entryPath), '.md');
    if (!entryPath.startsWith('instructions/') || !entryPath.endsWith('.md')) continue;
    const previous = entryIdsByFile.get(filename);
    if (previous !== undefined && previous !== id) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `manifest path instructions/${filename}.md has instruction ids ${previous} and ${id}`, { path: `instructions/${filename}.md`, instruction_ids: [previous, id] });
    entryIdsByFile.set(filename, id); manifestIds.add(id);
    if (id !== filename) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `manifest instruction_id ${id} does not match path basename ${filename}`, { instruction_id: id, filename });
  }
  const { dictionary, aliases, exemptions } = checkDictionary(catalog, issues);
  const exemptionKeys = new Set<string>();
  for (const exemption of exemptions) {
    const id = String(exemption.instruction_id ?? ''); const dimension = String(exemption.dimension ?? ''); const key = `${id}\0${dimension}`;
    if (!manifestIds.has(id)) issue(issues, 'CORPUS_TAG_EXEMPTION_INVALID', `tag exemption names unknown instruction ${id}`, { instruction_id: id, dimension });
    if (exemptionKeys.has(key)) issue(issues, 'CORPUS_TAG_EXEMPTION_INVALID', `duplicate tag exemption for ${id} dimension ${dimension}`, { instruction_id: id, dimension });
    exemptionKeys.add(key);
  }
  const instructionIds = new Set<string>();
  const frontmatterById = new Map<string, Dict>();
  for (const file of files) {
    const path = join(base, 'instructions', file); const front = readInstruction(path, file, issues);
    if (front === undefined) continue;
    const filename = file.slice(0, -3); const id = typeof front.instruction_id === 'string' ? front.instruction_id : '';
    if (id !== filename) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `frontmatter instruction_id ${id} does not match file basename ${filename}`, { instruction_id: id, filename, path: `instructions/${file}` });
    if (instructionIds.has(filename)) issue(issues, 'CORPUS_INSTRUCTION_ID_MISMATCH', `duplicate instruction identity ${filename}`, { filename });
    instructionIds.add(filename); frontmatterById.set(filename, front);
    checkSchema(front, join(packageRoot, 'config/vpinstruction.v1.schema.json'), issues, 'CORPUS_INSTRUCTION', { instruction_id: filename });
    checkInstructionTags(filename, front, dictionary, aliases, exemptions, issues);
    if (front.artifact_contract_output_type !== 'none' && (typeof front.artifact_contract_verified_by !== 'string' || front.artifact_contract_verified_by.trim() === '')) issue(issues, 'CORPUS_ARTIFACT_CONTRACT_INVALID', `instruction ${filename} requires artifact_contract_verified_by`, { instruction_id: filename });
    if (front.artifact_contract_output_type === 'none' && stringArray(front.artifact_contract_required_data).length > 0) issue(issues, 'CORPUS_ARTIFACT_CONTRACT_INVALID', `guidance instruction ${filename} must have empty artifact_contract_required_data`, { instruction_id: filename });
    const seenSources = new Set<string>();
    checkProvenance(filename, front, donorSet, seenSources, issues);
  }
  for (const [id, front] of frontmatterById) {
    for (const field of ['compatibility_requires', 'compatibility_excludes']) for (const ref of stringArray(front[field])) {
      if (!instructionIds.has(ref)) issue(issues, 'CORPUS_COMPATIBILITY_UNKNOWN', `instruction ${id} references unknown compatibility id ${ref}`, { instruction_id: id, compatibility_id: ref });
      if (field === 'compatibility_requires' && ref === id) issue(issues, 'CORPUS_COMPATIBILITY_SELF_REQUIRE', `instruction ${id} requires itself`, { instruction_id: id });
    }
  }
  checkMap(map, donorSet, instructionIds, issues);
  checkDonorCoverage(map, donorSet, issues);
  checkMethodologyProfile(base, catalog, instructionIds, issues);
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
    if (args[index] !== '--root' || args[index + 1] === undefined) throw new Error('usage: check-corpus.ts [--root <dir>]');
    root = args[index + 1] as string; index += 1;
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

process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url)) &&
  (process.exitCode = runCorpusCli(process.argv.slice(2)));
