import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, parse, relative, sep, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseApproachAssessments, APPROACH_VOCABULARY } from '../skills/vp-mode/scripts/instruction-approaches.ts';

const hash = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
const decode = (b: Buffer) => new TextDecoder('utf-8', { fatal: true }).decode(b);
const axes = Object.keys(APPROACH_VOCABULARY);
const states = ['declared', 'unknown', 'not-applicable', 'no-decision'];
const declarations = new Map<string, readonly string[]>(Object.entries(APPROACH_VOCABULARY));
const parserPaths = ['../skills/vp-mode/scripts/frontmatter.ts', '../skills/vp-mode/scripts/instruction-approaches.ts'].map(p => fileURLToPath(new URL(p, import.meta.url)));
type Obj = Record<string, unknown>;
function obj(x: unknown): Obj { if (x === null || typeof x !== 'object' || Array.isArray(x)) throw Error('EXPECTED_OBJECT'); return x as Obj; }
function arr(x: unknown): unknown[] { if (!Array.isArray(x)) throw Error('EXPECTED_ARRAY'); return x; }
function str(x: unknown): string { if (typeof x !== 'string') throw Error('EXPECTED_STRING'); return x; }
function digest(x: unknown): string { const s = str(x); if (!/^[a-f0-9]{64}$/.test(s)) throw Error('EXPECTED_SHA256'); return s; }
function pathCheck(p: string): string {
  if (!isAbsolute(p) || p.split(/[\\/]/).includes('..') || p.includes('\0') || /(^|[\\/])[^\\/]*:/.test(p.slice(2))) throw Error('PATH_INVALID');
  return resolve(p);
}
async function secureRead(path: string): Promise<Buffer> {
  const full = pathCheck(path); let part = parse(full).root;
  for (const name of relative(part, full).split(sep).filter(Boolean)) {
    part = join(part, name);
    if ((await lstat(part)).isSymbolicLink()) throw Error('PATH_REPARSE');
  }
  return readFile(full);
}
type Parsed = { version: 'assignments-v1' | 'rows-v1' | 'proposal-v1'; rows: Obj[]; packet: Obj };
function parsePacket(b: Buffer): Parsed {
  const p = obj(JSON.parse(decode(b)));
  if (p.schema === 'approach-assessment-scale-proposal-v1' && Array.isArray(p.rows)) return { version: 'proposal-v1', rows: arr(p.rows).map(obj), packet: p };
  if (p.schema === 'approach-assessment-scale-proposal-v1') return { version: 'assignments-v1', rows: arr(p.assignments).map(obj), packet: p };
  if (p.kind === 'bounded model proposal; not annotation or publication') return { version: 'rows-v1', rows: arr(p.rows).map(obj), packet: p };
  throw Error('UNSUPPORTED_PACKET');
}
function rowCells(row: Obj, version: Parsed['version']): Obj[] { return arr(version === 'assignments-v1' ? row.cells : version === 'rows-v1' ? row.assessments : row.proposal).map(obj); }
function position(row: Obj, version: Parsed['version']): unknown { return version === 'proposal-v1' ? row.position : row.catalog_position; }
function canonical(c: Obj, version: Parsed['version']): string {
  const d = str(c.dimension), state = str(c.state), evidence = str(version === 'rows-v1' ? c.evidence_span : c.evidence);
  const content = state === 'declared' ? `values=${arr(c.values).map(str).join(',')}` : `reason=${str(version === 'rows-v1' ? c.serialized_reason : c.reason)}`;
  return `dimension=${d}; state=${state}; ${content}; evidence=${evidence}`;
}
function quote(s: string): string { return s.replaceAll('\\', '\\\\').replaceAll('"', '\\"'); }
type Options = { packet: string; root: string; prior?: string; packetSha?: string; priorSha?: string; report?: string; reportSha?: string; offset?: number; limit?: number; r1Basis?: string; afterRead?: () => Promise<void> };
export async function capture(options: Options) {
  const failures: string[] = [], snapshots = new Map<string, string>();
  const read = async (p: string) => { const path = pathCheck(p); const b = await secureRead(path); const h = hash(b); if (snapshots.has(path) && snapshots.get(path) !== h) failures.push(`CHANGED_INPUT:${path}`); else snapshots.set(path, h); return b; };
  const packetPath = pathCheck(options.packet), root = pathCheck(options.root);
  const packetBytes = await read(packetPath), current = parsePacket(packetBytes);
  const r1Bytes = options.r1Basis ? await read(options.r1Basis) : undefined;
  const offset = options.offset ?? 0, limit = options.limit ?? current.rows.length - offset;
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || offset + limit > current.rows.length) throw Error('SLICE_INVALID');
  const sliced = offset !== 0 || limit !== current.rows.length;
  if (sliced && options.prior) throw Error('SLICE_PRIOR_UNSUPPORTED');
  const allCells = new Map<string, Obj>(), allIds = new Set<string>(), allPositions = new Set<number>();
  const fullCounts: Record<string, Record<string, number>> = Object.fromEntries(axes.map(a => [a, Object.fromEntries(states.map(s => [s, 0]))]));
  let fullUncertainty = 0;
  let historicalDrift = 0, savedCatalogDrift = 0;
  const uncertaintyIds: string[] = [];
  for (const row of current.rows) {
    const id = str(row.instruction_id), pos = position(row, current.version);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || typeof pos !== 'number' || !Number.isSafeInteger(pos) || pos < 1) throw Error('IDENTITY');
    if (allIds.has(id) || allPositions.has(pos)) failures.push(`DUPLICATE:${pos}:${id}`);
    allIds.add(id); allPositions.add(pos);
    if (current.version === 'rows-v1') {
      const observed = digest(row.source_file_sha256_observed), savedCatalog = digest(row.catalog_row_sha256);
      const captured = digest(row.source_file_sha256_at_capture); digest(row.catalog_row_sha256_at_capture);
      if (observed !== captured) historicalDrift++;
      if (observed !== savedCatalog) savedCatalogDrift++;
    }
    const list = rowCells(row, current.version); if (list.length !== 3) failures.push(`CELL_COUNT:${pos}:${id}`);
    for (const cell of list) {
      const dimension = str(cell.dimension), state = str(cell.state), key = `${pos}:${id}:${dimension}`;
      if (!axes.includes(dimension) || !states.includes(state)) { failures.push(`CELL_SHAPE:${key}`); continue; }
      if (allCells.has(key)) failures.push(`DUPLICATE_CELL:${key}`);
      allCells.set(key, cell); fullCounts[dimension]![state]!++;
    }
    if (typeof row.uncertainty === 'string' && row.uncertainty.trim()) { fullUncertainty++; uncertaintyIds.push(`${pos}:${id}`); }
  }
  if (options.packetSha !== undefined && digest(options.packetSha) !== hash(packetBytes)) failures.push('PACKET_PIN');
  const priorBytes = options.prior ? await read(options.prior) : undefined;
  if (options.priorSha !== undefined && (!priorBytes || digest(options.priorSha) !== hash(priorBytes))) failures.push('PRIOR_PIN');
  const prior = priorBytes ? parsePacket(priorBytes) : undefined;
  const parserHashes: string[] = []; for (const p of parserPaths) parserHashes.push(hash(await read(p)));
  const catalogBytes = await read(join(root, 'catalog.json'));
  const catalog = obj(JSON.parse(decode(catalogBytes))), entries = arr(catalog.instructions);
  const positions = [...allPositions].sort((a, b) => a - b);
  if (positions.length && positions[positions.length - 1]! - positions[0]! + 1 !== current.rows.length) failures.push('POSITION_GAP');
  const capturedCatalog = current.version === 'proposal-v1' ? obj(current.packet.scope).current_catalog_sha256 ?? null : current.version === 'assignments-v1' ? obj(current.packet.basis).current_catalog_pre_read_sha256 ?? null : obj(obj(current.packet.pins).catalog).sha256 ?? null;
  const counts: Record<string, Record<string, number>> = Object.fromEntries(axes.map(a => [a, Object.fromEntries(states.map(s => [s, 0]))]));
  const observations: Obj[] = [], cells = new Map<string, Obj>(), seenIds = new Set<string>(), seenPositions = new Set<number>();
  let direct = 0, quoted = 0, whole = 0, uncertainty = 0, unknownRows = 0;
  for (const row of current.rows.slice(offset, offset + limit)) {
    let id = '?', pos: number | undefined;
    try {
      id = str(row.instruction_id); const rawPos = position(row, current.version);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || typeof rawPos !== 'number' || !Number.isSafeInteger(rawPos) || rawPos < 1) throw Error('IDENTITY');
      pos = rawPos; const key = `${pos}:${id}`;
      if (seenIds.has(id) || seenPositions.has(pos)) { failures.push(`DUPLICATE:${key}`); continue; } seenIds.add(id); seenPositions.add(pos);
      if (current.version === 'proposal-v1' ? row.path !== `instructions/${id}.md` : row.source_path !== `packages/powers/instructions/${id}.md`) throw Error('SOURCE_PATH');
      const entry = obj(entries[pos - 1]);
      if (entry.instruction_id !== id || entry.path !== `instructions/${id}.md`) failures.push(`CATALOG_ID:${key}`);
      const bytes = await read(join(root, 'instructions', `${id}.md`)), rawHash = hash(bytes), parsed = parseFrontmatter(decode(bytes));
      const body = parsed.body, bodyHash = hash(body), bodyBytes = Buffer.byteLength(body);
      const applies = str(parsed.data.conditions_applies_when), excludes = str(parsed.data.conditions_does_not_apply_when);
      const conditionsHash = hash(JSON.stringify([applies, excludes]));
      if (entry.sha256 !== rawHash) failures.push(`CATALOG_HASH:${key}`);
      for (const field of current.version === 'assignments-v1' ? ['body_sha256', 'pre_read_body_sha256', 'current_pre_read_body_sha256', 'current_post_read_body_sha256'] : ['body_sha256']) if (digest(row[field]) !== bodyHash) failures.push(`BODY_HASH:${key}:${field}`);
      const size = current.version === 'assignments-v1' ? row.current_body_utf8_bytes : current.version === 'proposal-v1' ? row.body_bytes : row.body_utf8_bytes;
      if (size !== bodyBytes || (current.version === 'assignments-v1' && row.pre_read_body_utf8_bytes !== bodyBytes)) failures.push(`BODY_BYTES:${key}`);
      if (row.conditions_applies_when !== applies || row.conditions_does_not_apply_when !== excludes) failures.push(`CONDITIONS:${key}`);
      const capturedRaw = digest(current.version === 'assignments-v1' ? row.current_post_read_wholefile_sha256 : current.version === 'proposal-v1' ? row.current_wholefile_sha256 : row.source_file_sha256_observed);
      if (current.version === 'assignments-v1') {
        for (const field of ['current_pre_read_wholefile_sha256', 'current_catalog_wholefile_sha256', 'catalog_wholefile_sha256_current']) if (digest(row[field]) !== capturedRaw) failures.push(`CAPTURE_RAW:${key}:${field}`);
        for (const when of ['pre', 'post']) for (const [field, value] of [['conditions_applies_when', applies], ['conditions_does_not_apply_when', excludes]]) if (row[`current_${when}_read_${field}`] !== value) failures.push(`CAPTURE_CONDITIONS:${key}:${when}:${field}`);
      } else if (current.version === 'rows-v1' && digest(row.catalog_row_sha256) !== capturedRaw) failures.push(`CAPTURE_CATALOG_HASH:${key}`);
      else if (current.version === 'proposal-v1' && (digest(row.raw_pre_read_sha256) !== digest(row.raw_post_read_sha256) || row.raw_changed_pre_post !== false)) failures.push(`CAPTURE_RAW:${key}`);
      const list = rowCells(row, current.version); if (list.length !== 3) failures.push(`CELL_COUNT:${key}`);
      const rows: string[] = [], directRows: ReturnType<typeof parseApproachAssessments>[number][] = []; let hasUnknown = false;
      for (const cell of list) {
        const dimension = str(cell.dimension), state = str(cell.state), cellKey = `${key}:${dimension}`;
        if (!axes.includes(dimension) || !states.includes(state)) { failures.push(`CELL_SHAPE:${cellKey}`); continue; }
        if (cells.has(cellKey)) failures.push(`DUPLICATE_CELL:${cellKey}`); cells.set(cellKey, cell); counts[dimension]![state]!++;
        if (state === 'unknown') hasUnknown = true;
        const serialized = str(cell.serialized), expected = canonical(cell, current.version); rows.push(serialized);
        if (serialized !== expected) failures.push(`SERIALIZED:${cellKey}`);
        if ((current.version === 'rows-v1' ? cell.evidence_span : cell.evidence) !== `body:0-${bodyBytes}`) failures.push(`SPAN:${cellKey}`);
        let directResult: ReturnType<typeof parseApproachAssessments> | undefined;
        try { const got = parseApproachAssessments({ data: { approach_assessments: [serialized], approach_body_sha256: bodyHash }, body }, declarations); if (got.length !== 1 || got[0]?.dimension !== dimension || got[0]?.state !== state) throw Error('MISMATCH'); directResult = got; directRows.push(got[0]!); direct++; } catch { failures.push(`PARSER_DIRECT:${cellKey}`); }
        try { const synthetic = `---\napproach_assessments:\n  - "${quote(serialized)}"\napproach_body_sha256: ${bodyHash}\n---\n${body}`; const got = parseApproachAssessments(parseFrontmatter(synthetic), declarations); if (!directResult || JSON.stringify(got) !== JSON.stringify(directResult)) throw Error('MISMATCH'); quoted++; } catch { failures.push(`PARSER_QUOTED:${cellKey}`); }
      }
      try { const synthetic = `---\napproach_assessments:\n${rows.map(s => `  - "${quote(s)}"\n`).join('')}approach_body_sha256: ${bodyHash}\n---\n${body}`; const got = parseApproachAssessments(parseFrontmatter(synthetic), declarations); if (got.length !== 3 || JSON.stringify(got) !== JSON.stringify(directRows)) throw Error('MISMATCH'); whole++; } catch { failures.push(`PARSER_WHOLE:${key}`); }
      if (typeof row.uncertainty === 'string' && row.uncertainty.trim()) uncertainty++;
      if (hasUnknown) unknownRows++;
      const historicalRaw = current.version === 'proposal-v1' ? digest(row.catalog_wholefile_sha256) : current.version === 'rows-v1' ? digest(row.source_file_sha256_at_capture) : null;
      const bodyMatches = digest(row.body_sha256) === bodyHash && size === bodyBytes;
      const conditionsMatch = row.conditions_applies_when === applies && row.conditions_does_not_apply_when === excludes;
      observations.push({ position: pos, id, body_sha256: bodyHash, body_bytes: bodyBytes, body_matches: bodyMatches, conditions_sha256: conditionsHash, conditions_match: conditionsMatch, raw_sha256: rawHash, captured_raw_sha256: capturedRaw, raw_drift: rawHash !== capturedRaw, frontmatter_only_drift: rawHash !== capturedRaw && bodyMatches && conditionsMatch, historical_raw_sha256: historicalRaw, historical_catalog_sha256: current.version === 'rows-v1' ? digest(row.catalog_row_sha256_at_capture) : null, saved_catalog_sha256: current.version === 'rows-v1' ? digest(row.catalog_row_sha256) : null, historical_raw_drift: historicalRaw === null ? null : historicalRaw !== capturedRaw, current_vs_historical_raw_drift: historicalRaw === null ? null : historicalRaw !== rawHash, catalog_row_sha256: entry.sha256 });
    } catch (e) { failures.push(`ROW:${pos ?? '?'}:${id}:${e instanceof Error ? e.message : String(e)}`); }
  }
  const declaredCounts = obj(current.packet.counts); const rowsCount = current.version === 'rows-v1' ? declaredCounts.rows : declaredCounts.instructions;
  const declared_counts_status: Record<string, { status: string; reason: string; claimed?: unknown; actual?: unknown }> = {};
  for (const [key, value] of Object.entries(declaredCounts)) declared_counts_status[key] = { status: 'NOT_CHECKED', reason: 'No supported comparison basis for this declaration', claimed: value };
  for (const key of ['disposition_changes_from_r1', 'unchanged_dispositions_from_r1', 'reason_rationale_serialized_fields_rewritten', 'r1_to_current_wholefile_drift', 'r2_to_current_wholefile_drift', 'raw_pre_post_drift', 'raw_drift_vs_r1', 'raw_drift_instruction_ids', 'body_drift_vs_r1', 'condition_drift_vs_r1', 'catalog_order_verified', 'current_raw_catalog_hash_matches', 'current_raw_catalog_hash_mismatches']) if (!(key in declared_counts_status)) declared_counts_status[key] = { status: 'NOT_CHECKED', reason: 'Declaration absent' };
  const checkDeclaration = (key: string, actual: unknown, reason: string) => {
    if (!(key in declaredCounts)) return;
    declared_counts_status[key] = { status: 'CHECKED', reason, claimed: declaredCounts[key], actual };
    if (JSON.stringify(declaredCounts[key]) !== JSON.stringify(actual)) failures.push(`COUNT_DECLARED:${key}`);
  };
  if (current.version === 'assignments-v1') {
    for (const [key, before] of [['r1_to_current_wholefile_drift', 'r1_observed_wholefile_sha256'], ['r2_to_current_wholefile_drift', 'pre_read_wholefile_sha256']] as const) {
      if (current.rows.every(row => typeof row[before] === 'string' && typeof row.current_post_read_wholefile_sha256 === 'string')) checkDeclaration(key, current.rows.filter(row => digest(row[before]) !== digest(row.current_post_read_wholefile_sha256)).length, 'Packet-wide captured hashes; not a live snapshot');
    }
  }
  let r1Ids: string[] | null = null;
  let r2Ids: string[] | null = null;
  if (current.version === 'proposal-v1') {
    if (current.rows.every(row => typeof row.catalog_wholefile_sha256 === 'string' && typeof row.current_wholefile_sha256 === 'string')) r2Ids = current.rows.filter(row => digest(row.catalog_wholefile_sha256) !== digest(row.current_wholefile_sha256)).map(row => str(row.instruction_id));
    if (r1Bytes) {
      const pin = obj(current.packet.pins).r1_assignments_sha256;
      if (typeof pin !== 'string' || digest(pin) !== hash(r1Bytes)) failures.push('R1_BASIS_PIN');
      else {
        const r1 = parsePacket(r1Bytes), previous = new Map<string, Obj>();
        for (const row of r1.rows) { const id = str(row.instruction_id); if (previous.has(id)) failures.push(`R1_DUPLICATE:${id}`); previous.set(id, row); }
        const matched = r1.version === 'proposal-v1' && previous.size === current.rows.length && current.rows.every(row => { const old = previous.get(str(row.instruction_id)); return old && position(old, r1.version) === position(row, current.version) && old.path === row.path; });
        if (!matched) failures.push('R1_BASIS_ROWS');
        else {
          const pairs = current.rows.map(row => ({ row, old: previous.get(str(row.instruction_id))! }));
          r1Ids = pairs.filter(({ row, old }) => digest(old.raw_post_read_sha256) !== digest(row.current_wholefile_sha256)).map(({ row }) => str(row.instruction_id));
          checkDeclaration('raw_drift_vs_r1', r1Ids.length, 'Packet-wide r1 post-read to current capture; r1 SHA pin verified');
          if (declaredCounts.raw_drift_instruction_ids !== undefined) {
            const claimed = arr(declaredCounts.raw_drift_instruction_ids).map(str), actual = [...r1Ids].sort();
            const ok = claimed.length === new Set(claimed).size && JSON.stringify([...claimed].sort()) === JSON.stringify(actual);
            declared_counts_status.raw_drift_instruction_ids = { status: 'CHECKED', reason: 'Packet-wide r1 post-read to current capture; r1 SHA pin verified', claimed, actual };
            if (!ok) failures.push('COUNT_DECLARED:raw_drift_instruction_ids');
          }
          checkDeclaration('body_drift_vs_r1', pairs.filter(({ row, old }) => digest(old.body_sha256) !== digest(row.body_sha256) || old.body_bytes !== row.body_bytes).length, 'Packet-wide body capture compared with pinned r1');
          checkDeclaration('condition_drift_vs_r1', pairs.filter(({ row, old }) => str(old.conditions_applies_when) !== str(row.conditions_applies_when) || str(old.conditions_does_not_apply_when) !== str(row.conditions_does_not_apply_when)).length, 'Packet-wide condition capture compared with pinned r1');
        }
      }
    }
    if (current.rows.every(row => typeof row.raw_pre_read_sha256 === 'string' && typeof row.raw_post_read_sha256 === 'string')) checkDeclaration('raw_pre_post_drift', current.rows.filter(row => digest(row.raw_pre_read_sha256) !== digest(row.raw_post_read_sha256)).length, 'Packet-wide saved pre/post hashes');
    if (capturedCatalog === hash(catalogBytes)) {
      const order = current.rows.every((row, i) => { const p = position(row, current.version); if (typeof p !== 'number') return false; const entry = obj(entries[p - 1]); return entry.instruction_id === row.instruction_id && entry.path === row.path && (i === 0 || p === Number(position(current.rows[i - 1]!, current.version)) + 1); });
      checkDeclaration('catalog_order_verified', order, 'Packet order against matching captured catalog bytes');
      if (current.rows.every(row => typeof row.current_wholefile_sha256 === 'string')) {
        const mismatches = current.rows.filter(row => { const p = Number(position(row, current.version)); return digest(row.current_wholefile_sha256) !== obj(entries[p - 1]).sha256; });
        checkDeclaration('current_raw_catalog_hash_matches', current.rows.length - mismatches.length, 'Saved packet hashes against matching captured catalog, not live file hashes');
        checkDeclaration('current_raw_catalog_hash_mismatches', mismatches.length, 'Saved packet hashes against matching captured catalog, not live file hashes');
        checkDeclaration('current_raw_catalog_hash_mismatch_ids', mismatches.map(row => str(row.instruction_id)), 'Saved packet hashes against matching captured catalog');
      }
    }
  }
  else if (r1Bytes) failures.push('R1_BASIS_UNSUPPORTED');
  if (rowsCount !== current.rows.length) failures.push('COUNT_ROWS');
  if (declaredCounts.cells !== allCells.size) failures.push('COUNT_CELLS');
  const claimedStates = current.version !== 'rows-v1' ? declaredCounts.states : undefined;
  if (claimedStates !== undefined) for (const state of states) if (obj(claimedStates)[state] !== axes.reduce((n, a) => n + fullCounts[a]![state]!, 0)) failures.push(`COUNT_STATE:${state}`);
  if (current.version === 'rows-v1') for (const axis of axes) for (const state of states) if (obj(obj(declaredCounts.states_by_dimension)[axis])[state] !== fullCounts[axis]![state]) failures.push(`COUNT_AXIS:${axis}:${state}`);
  if (current.version === 'rows-v1' && declaredCounts.rows_with_uncertainty !== fullUncertainty) failures.push('COUNT_UNCERTAINTY');
  if (current.version === 'rows-v1') {
    for (const [state, field] of [['declared', 'declared_cells'], ['unknown', 'unknown_cells'], ['not-applicable', 'not_applicable_cells'], ['no-decision', 'no_decision_cells']] as const) if (declaredCounts[field] !== axes.reduce((n, a) => n + fullCounts[a]![state]!, 0)) failures.push(`COUNT_TOTAL:${state}`);
    if (declaredCounts.historical_raw_hash_drift_from_capture !== historicalDrift) failures.push('COUNT_HISTORICAL_RAW_DRIFT');
    if (declaredCounts.source_file_drift_from_catalog !== savedCatalogDrift) failures.push('COUNT_SAVED_CATALOG_DRIFT');
  }
  if (current.version === 'assignments-v1' && current.packet.reason_rewrites_vs_r2 !== undefined && declaredCounts.reason_rewrites_vs_r2 !== arr(current.packet.reason_rewrites_vs_r2).length) failures.push('COUNT_REASON_LIST');
  if (current.version === 'proposal-v1' && declaredCounts.disposition_changes_vs_r1 !== arr(current.packet.disposition_delta_vs_r1).length) failures.push('COUNT_DISPOSITION_DELTA');
  const changed: { id: string; fields: string[] }[] = [];
  if (prior) {
    const previous = new Map<string, Obj>();
    for (const row of prior.rows) for (const cell of rowCells(row, prior.version)) { const key = `${position(row, prior.version)}:${str(row.instruction_id)}:${str(cell.dimension)}`; if (previous.has(key)) failures.push(`PRIOR_DUPLICATE:${key}`); previous.set(key, cell); }
    for (const key of new Set([...previous.keys(), ...cells.keys()])) { const a = previous.get(key), b = cells.get(key); if (!a || !b) { failures.push(`DELTA_MISSING:${key}`); continue; } const fields = ['state', 'values', 'reason', 'rationale', 'serialized', 'evidence', 'evidence_span'].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])); if (fields.length) changed.push({ id: key, fields }); }
    if (current.version === 'assignments-v1' && current.packet.reason_rewrites_vs_r2 !== undefined) {
      const basis = obj(current.packet.basis), priorBound = typeof basis.r2_assignments_sha256 === 'string' && digest(basis.r2_assignments_sha256) === hash(priorBytes!);
      if (basis.r2_assignments_sha256 !== undefined && !priorBound) failures.push('PRIOR_BASIS_R2');
      const declared = arr(current.packet.reason_rewrites_vs_r2).map(obj).map(x => `${x.catalog_position}:${str(x.instruction_id)}:${str(x.dimension)}`).sort();
      const actual = changed.filter(x => x.fields.includes('reason')).map(x => x.id).sort();
      if (JSON.stringify(declared) !== JSON.stringify(actual)) failures.push('DELTA_REASON_LIST');
      if (declaredCounts.reason_rewrites_vs_r2 !== actual.length) failures.push('DELTA_REASON_COUNT');
      if (priorBound) checkDeclaration('reason_rationale_serialized_fields_rewritten', changed.reduce((n, entry) => n + entry.fields.filter(field => ['reason', 'rationale', 'serialized'].includes(field)).length, 0), 'Field differences against packet-pinned r2 prior');
    }
  }
  let report: Obj = { status: 'NOT_CHECKED' };
  if (options.report) {
    const reportBytes = await read(options.report), text = decode(reportBytes), reportHash = hash(reportBytes);
    if (options.reportSha !== undefined && digest(options.reportSha) !== reportHash) failures.push('REPORT_PIN');
    if (current.version === 'proposal-v1') {
      const match = /recomputed r1 comparison contains (\d+) disposition changes/.exec(text);
      if (!match || Number(match[1]) !== arr(current.packet.disposition_delta_vs_r1).length) failures.push('REPORT_DISPOSITION_COUNT');
      report = { status: 'CHECKED_DISPOSITION_COUNT_ONLY', sha256: reportHash, claimed: match ? Number(match[1]) : null, packet_claimed: declaredCounts.disposition_changes_vs_r1, list_length: arr(current.packet.disposition_delta_vs_r1).length };
    } else if (current.version === 'rows-v1') {
      report = { status: 'NOT_APPLICABLE', reason: 'No rows-v1 report contract', sha256: reportHash }; failures.push('REPORT_UNSUPPORTED');
    } else {
    if (!text.includes('## Reason rewrites vs r2')) throw Error('UNSUPPORTED_REPORT');
    const section = text.split('## Reason rewrites vs r2')[1]?.split('\n## ')[0] ?? '';
    const reportKeys: string[] = [];
    for (const line of section.split(/\r?\n/)) {
      const match = /^\| (\d+) \| ([a-z0-9-]+) \| ([a-z-]+) \| (.*?) \|$/.exec(line);
      if (!match) continue;
      const key = `${match[1]}:${match[2]}:${match[3]}`; reportKeys.push(key);
      if (allCells.get(key)?.reason !== match[4]) failures.push(`REPORT_REASON:${key}`);
    }
    const listed = arr(current.packet.reason_rewrites_vs_r2).map(obj).map(x => `${x.catalog_position}:${str(x.instruction_id)}:${str(x.dimension)}`).sort();
    if (JSON.stringify(reportKeys.sort()) !== JSON.stringify(listed)) failures.push('REPORT_REASON_LIST');
    if (!text.includes(`assignments.json SHA-256: ${hash(packetBytes)}`)) failures.push('REPORT_PACKET_HASH');
    if (!text.includes(`Reason rewrites vs r2: ${listed.length} cells.`)) failures.push('REPORT_REASON_COUNT');
    report = { status: 'CHECKED_SELECTED_FIELDS', sha256: reportHash, reason_rows: reportKeys.length };
    }
  } else if (options.reportSha !== undefined) failures.push('REPORT_MISSING');
  const alreadyChecked = current.version === 'rows-v1' ? ['rows', 'cells', 'states_by_dimension', 'rows_with_uncertainty', 'declared_cells', 'unknown_cells', 'not_applicable_cells', 'no_decision_cells', 'historical_raw_hash_drift_from_capture', 'source_file_drift_from_catalog'] : ['instructions', 'cells', 'states', ...(current.version === 'assignments-v1' && current.packet.reason_rewrites_vs_r2 !== undefined ? ['reason_rewrites_vs_r2'] : []), ...(current.version === 'proposal-v1' ? ['disposition_changes_vs_r1'] : [])];
  for (const key of alreadyChecked) if (key in declaredCounts) declared_counts_status[key] = { status: 'CHECKED', reason: 'Packet-wide counts against packet rows or declared list', claimed: declaredCounts[key] };
  for (const key of ['disposition_changes_from_r1', 'unchanged_dispositions_from_r1', 'raw_drift_vs_r1', 'raw_drift_instruction_ids', 'body_drift_vs_r1', 'condition_drift_vs_r1']) if (key in declaredCounts && declared_counts_status[key]?.status === 'NOT_CHECKED') declared_counts_status[key] = { status: 'NOT_CHECKED', reason: 'Exact r1 comparison basis not supplied and bound', claimed: declaredCounts[key] };
  if (declared_counts_status.reason_rationale_serialized_fields_rewritten?.status === 'NOT_CHECKED') declared_counts_status.reason_rationale_serialized_fields_rewritten = { status: 'NOT_CHECKED', reason: 'Exact prior and field rewrite contract not established', claimed: declaredCounts.reason_rationale_serialized_fields_rewritten };
  if (options.afterRead) await options.afterRead();
  for (const [path, h] of snapshots) { try { if (hash(await secureRead(path)) !== h) failures.push(`CHANGED_INPUT:${path}`); } catch { failures.push(`READBACK_FAILED:${path}`); } }
  const captureStatus = capturedCatalog === null ? 'NOT_RECORDED' : capturedCatalog === hash(catalogBytes) ? 'MATCH' : 'DIFFERS_HISTORICAL_SNAPSHOT_NOT_CHECKED';
  return { status: failures.length ? 'MISMATCH' : 'MECHANICAL_MATCH_PARTIAL', packet: { sha256: hash(packetBytes), version: current.version, rows: current.rows.length, selected_offset: offset, selected_rows: limit, full_counts: fullCounts }, prior: priorBytes ? { sha256: hash(priorBytes), version: prior!.version } : null, r1_basis: r1Bytes ? { sha256: hash(r1Bytes), status: r1Ids === null ? 'NOT_CHECKED' : 'PIN_VERIFIED' } : { status: 'NOT_CHECKED', reason: 'R1 basis not supplied' }, historical_capture: { scope: 'PACKET_ROWS', r1_to_current_capture_ids: r1Ids, r2_to_current_capture_ids: r2Ids, r2_basis: r2Ids === null ? 'NOT_CHECKED' : 'SAVED_ROW_HASHES_NOT_INDEPENDENTLY_BOUND' }, report, delta_status: !prior ? 'NOT_CHECKED' : current.version === 'assignments-v1' && current.packet.reason_rewrites_vs_r2 !== undefined ? 'CELL_DIFF_REPORTED_REASON_LIST_CHECKED' : 'CELL_DIFF_REPORTED_REASON_LIST_NOT_DECLARED', declared_scope_status: 'NOT_CHECKED', declared_counts_status, catalog: { sha256: hash(catalogBytes), revision: catalog.revision, captured_sha256: capturedCatalog, capture_status: captureStatus }, parser_sha256: parserHashes, counts, parser: { direct, quoted, whole }, parser_scope: 'SELECTED_ROWS', raw_drift: { scope: 'SELECTED_ROWS', selected_rows: observations.filter(o => o.raw_drift).length, observed_rows: observations.length }, uncertainty: { scope: 'SELECTED_ROWS_AND_PACKET', nonempty: uncertainty, unknown_rows: unknownRows, full_nonempty: fullUncertainty, full_ids: uncertaintyIds, claimed: current.version === 'rows-v1' ? declaredCounts.rows_with_uncertainty : null }, saved_metadata: current.version === 'rows-v1' ? { historical_raw_drift: historicalDrift, observed_vs_saved_catalog_drift: savedCatalogDrift } : { status: 'NOT_CHECKED' }, changed, observations, failures, snapshot: 'NON_ATOMIC', semantic_verdict: 'NOT_EVALUATED' };
}
type CliOutput = { stdout: (text: string) => void; stderr: (text: string) => void };
export async function runPacketCli(args: string[], output: CliOutput): Promise<number> {
  try {
    if (args.length < 2 || args.length > 10) throw Error('USAGE: packet.ts PACKET PRODUCT_ROOT [PRIOR|-] [PACKET_SHA|-] [PRIOR_SHA|-] [REPORT|-] [REPORT_SHA|-] [OFFSET] [LIMIT] [R1_BASIS|-]');
    const options: Options = { packet: args[0]!, root: args[1]! }; if (args[2] && args[2] !== '-') options.prior = args[2]; if (args[3] && args[3] !== '-') options.packetSha = args[3]; if (args[4] && args[4] !== '-') options.priorSha = args[4]; if (args[5] && args[5] !== '-') options.report = args[5]; if (args[6] && args[6] !== '-') options.reportSha = args[6];
    if (args[7] !== undefined) { if (!/^\d+$/.test(args[7])) throw Error('SLICE_INVALID'); options.offset = Number(args[7]); }
    if (args[8] !== undefined) { if (!/^\d+$/.test(args[8])) throw Error('SLICE_INVALID'); options.limit = Number(args[8]); }
    if (args[9] && args[9] !== '-') options.r1Basis = args[9];
    const result = await capture(options); output.stdout(`${JSON.stringify(result)}\n`); return result.failures.length ? 1 : 0;
  } catch (e) { output.stderr(`${JSON.stringify({ status: 'FAILED', error: e instanceof Error ? e.message : String(e) })}\n`); return 1; }
}
export async function startPacketCli(argv: string[], output: CliOutput, setExitCode: (code: number) => void = code => { process.exitCode = code; }): Promise<number | undefined> {
  if (argv[1] === undefined || resolve(argv[1]) !== resolve(fileURLToPath(import.meta.url))) return undefined;
  const code = await runPacketCli(argv.slice(2), output); setExitCode(code); return code;
}
await startPacketCli(process.argv, { stdout: process.stdout.write.bind(process.stdout), stderr: process.stderr.write.bind(process.stderr) });
