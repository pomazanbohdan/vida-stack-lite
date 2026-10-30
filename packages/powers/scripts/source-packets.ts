import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

export type ArtifactRef = Readonly<{ path: string; sha256: string }>;
export type SourceRef = Readonly<{ donor: string; pinnedRevision: string; canonicalCarrierPath: string; rawSha256: string; rawBytes: number }>;
export const capturePolicy = 'strict-utf8-bom-retained-crlf-lf-cr-codepoints/v1';
export type CapturedSource = Readonly<{
  schema: 'VPMarkdownCapture/v1'; source: SourceRef; policy: typeof capturePolicy;
  producer: ArtifactRef; runtime: ArtifactRef;
  input: { schema: 'scratch-markdown-input/v1'; source: { path: string; sha256: string; bytes: number; lines: readonly Readonly<{ line: number; text: string; length: number; byteStart: number }>[] } };
}>;
type Unit = { id: string; tier: 'H1' | 'H2'; meaning: string; conditions: string[]; alternatives: string[]; note: string };
type Span = { line: number; start: number; end: number; role: 'rule' | 'held' | 'support' | 'context' | 'example' | 'structure'; unitIds: string[]; reason: string };
type Decisions = { schema: 'scratch-markdown-decisions/v1'; sourceSha256: string; admission: false; canonicalIds: null; rightsLineage: 'HOLD'; units: Unit[]; spans: Span[] };
const textSchema = { type: 'string', minLength: 1 } satisfies Schema;
const shaSchema = { type: 'string', pattern: '^[0-9a-f]{64}$' } satisfies Schema;
const stringsSchema = { type: 'array', items: textSchema } satisfies Schema;
function objectSchema(properties: Record<string, Schema>): Schema {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
const sourceSchema = objectSchema({ donor: textSchema, pinnedRevision: { type: 'string', pattern: '^[0-9a-f]{40}$' }, canonicalCarrierPath: textSchema, rawSha256: shaSchema, rawBytes: { type: 'integer', minimum: 0 } });
const decisionsSchema = objectSchema({
  schema: { const: 'scratch-markdown-decisions/v1' }, sourceSha256: shaSchema,
  admission: { const: false }, canonicalIds: { type: 'null' }, rightsLineage: { const: 'HOLD' },
  units: { type: 'array', items: objectSchema({ id: textSchema, tier: { enum: ['H1', 'H2'] }, meaning: textSchema, conditions: stringsSchema, alternatives: stringsSchema, note: textSchema }) },
  spans: { type: 'array', items: objectSchema({ line: { type: 'integer', minimum: 1 }, start: { type: 'integer', minimum: 0 }, end: { type: 'integer', minimum: 1 }, role: { enum: ['rule', 'held', 'support', 'context', 'example', 'structure'] }, unitIds: stringsSchema, reason: textSchema }) },
});
const artifactSchema = objectSchema({ path: textSchema, sha256: shaSchema });
const sha = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
function validate(value: unknown, schema: Schema): void {
  const errors = validateAgainstSchema(value, schema);
  if (errors.length) throw new Error(`SOURCE_PACKET_INVALID: ${errors.join('; ')}`);
}
function check(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`SOURCE_PACKET_INVALID: ${reason}`);
}
function canonicalPath(path: string): string[] {
  const parts = path.split('/');
  check(parts.length > 0 && parts.every(part => part !== '' && part !== '.' && part !== '..' && !/[\\:\x00]/u.test(part)), 'noncanonical relative path');
  return parts;
}
async function safePath(root: string, path: string, createParents = false): Promise<string> {
  const parts = canonicalPath(path);
  const canonicalRoot = await realpath(root);
  let cursor = canonicalRoot;
  for (const [index, part] of parts.entries()) {
    cursor = join(cursor, part);
    let info;
    try { info = await lstat(cursor); } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) throw error;
      if (index === parts.length - 1) return cursor;
      if (!createParents) return join(cursor, ...parts.slice(index + 1));
      await mkdir(cursor); info = await lstat(cursor);
    }
    check(!info.isSymbolicLink(), 'symlink traversal');
    check(index === parts.length - 1 ? info.isFile() : info.isDirectory(), 'nonregular artifact path');
  }
  return cursor;
}
export async function resolveArtifactPath(root: string, path: string, createParents = false): Promise<string> {
  return safePath(root, path, createParents);
}
export async function verifyArtifact(root: string, ref: ArtifactRef): Promise<Buffer> {
  validate(ref, artifactSchema);
  const path = await safePath(root, ref.path);
  const info = await lstat(path);
  check(info.isFile() && info.size <= 32 * 1024 * 1024, 'artifact size or type');
  const bytes = await readFile(path);
  check(bytes.length === info.size && sha(bytes) === ref.sha256, `stale artifact: ${ref.path}`);
  return bytes;
}
export async function sealArtifact(root: string, path: string, value: unknown): Promise<ArtifactRef> {
  const target = await safePath(root, path, true);
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  check(bytes.length <= 32 * 1024 * 1024, 'artifact size');
  await writeFile(target, bytes, { flag: 'wx' });
  return Object.freeze({ path, sha256: sha(bytes) });
}
export async function capturePacket(source: SourceRef, sourceRoot: string): Promise<CapturedSource> {
  validate(source, sourceSchema);
  const bytes = await verifyArtifact(sourceRoot, { path: source.canonicalCarrierPath, sha256: source.rawSha256 });
  check(bytes.length === source.rawBytes, 'raw byte length');
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  let byteStart = 0;
  const lines = text.split(/\r\n|\n|\r/u).map((value, index) => {
    const line = Object.freeze({ line: index + 1, text: value, length: Array.from(value).length, byteStart });
    byteStart += Buffer.byteLength(value);
    if (bytes[byteStart] === 13) { byteStart++; if (bytes[byteStart] === 10) byteStart++; }
    else if (bytes[byteStart] === 10) byteStart++;
    return line;
  });
  const toolPath = fileURLToPath(import.meta.url);
  return Object.freeze({ schema: 'VPMarkdownCapture/v1', source: Object.freeze({ ...source }), policy: capturePolicy,
    producer: Object.freeze({ path: toolPath, sha256: sha(await readFile(toolPath)) }),
    runtime: Object.freeze({ path: process.execPath, sha256: sha(await readFile(process.execPath)) }),
    input: Object.freeze({ schema: 'scratch-markdown-input/v1', source: Object.freeze({ path: source.canonicalCarrierPath, sha256: source.rawSha256, bytes: source.rawBytes, lines: Object.freeze(lines) }) }),
  });
}
export function locateSpan(capture: CapturedSource, line: number, start: number, end: number): { text: string; byteStart: number; byteEnd: number } {
  const row = capture.input.source.lines[line - 1];
  check(Number.isInteger(line) && row !== undefined && Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= row.length, 'span bounds');
  const points = Array.from(row.text);
  const text = points.slice(start, end).join('');
  const byteStart = row.byteStart + Buffer.byteLength(points.slice(0, start).join(''));
  return { text, byteStart, byteEnd: byteStart + Buffer.byteLength(text) };
}
export function sourceInputDigest(capture: CapturedSource): string {
  return sha(JSON.stringify(capture.input));
}
function parseDecisions(capture: CapturedSource, value: unknown): Decisions {
  validate(value, decisionsSchema);
  const decisions = value as Decisions;
  check(decisions.sourceSha256 === capture.source.rawSha256, 'decision source binding');
  return decisions;
}
export function checkDecomposition(capture: CapturedSource, value: unknown) {
  const decisions = parseDecisions(capture, value);
  const ids = new Set(decisions.units.map(unit => unit.id));
  check(ids.size === decisions.units.length, 'duplicate unit');
  const linked = new Set<string>();
  const covered = new Map<number, Set<number>>();
  for (const span of decisions.spans) {
    locateSpan(capture, span.line, span.start, span.end);
    for (const id of span.unitIds) check(ids.has(id), `unknown unit: ${id}`);
    if (span.role === 'rule' || span.role === 'held') {
      check(span.unitIds.length > 0, 'unlinked norm');
      span.unitIds.forEach(id => linked.add(id));
    }
    const points = covered.get(span.line) ?? new Set<number>();
    for (let index = span.start; index < span.end; index++) points.add(index);
    covered.set(span.line, points);
  }
  for (const id of ids) check(linked.has(id), `unit without norm: ${id}`);
  for (const line of capture.input.source.lines) Array.from(line.text).forEach((point, index) => {
    if (point.trim()) check(covered.get(line.line)?.has(index), `uncovered text at ${line.line}:${index}`);
  });
  return { status: 'PASS_MECHANICAL_ONLY', sourceSha256: capture.source.rawSha256, lines: capture.input.source.lines.length, units: ids.size, spans: decisions.spans.length, semanticReview: 'PENDING', admission: false };
}

export type PacketContext = Readonly<{ evidenceRoot: string; sourceRoot: string; allowedSources: readonly SourceRef[]; scope: ArtifactRef; checker: ArtifactRef; configuration: ArtifactRef }>;
type PacketSpec = { artifact: ArtifactRef; unitIds: string[] };
type Packet = { schema: 'VPSourcePacket/v1'; capture: ArtifactRef; decisions: ArtifactRef; selection: ArtifactRef; check: ArtifactRef; reviews: ArtifactRef[]; specs: PacketSpec[] };
type Selection = { schema: 'VPSourceSelection/v1'; source: SourceRef; scope: ArtifactRef; domain: string; disposition: 'selected' | 'excluded' | 'pending-reconsideration'; rationale: string; previousDisposition: string; previousReason: string; exclusion: 'none' | 'journey'; unitIds: string[] };
type CheckReceipt = { schema: 'VPSourceCheck/v1'; captureSha256: string; decisionsSha256: string; checker: ArtifactRef; runtimeSha256: string; configuration: ArtifactRef; command: string[]; exitCode: number; stdout: ArtifactRef; stderr: ArtifactRef };
type Review = { schema: 'VPSourceReview/v1'; source: SourceRef; inputSha256: string; decisionsSha256: string; scopeSha256: string; scope: 'full' | 'delta'; unitIds: string[]; verdict: 'READY'; actor: string; pointer: string };
type GateKind = 'fidelity' | 'rights' | 'admission';
export type HumanGateRefs = Readonly<Record<GateKind, ArtifactRef>>;
type Gate = { schema: 'VPHumanSourceGate/v1'; kind: GateKind; verdict: 'human-approved' | 'cleared' | 'owner-admitted'; source: SourceRef; inputSha256: string; decisionsSha256: string; scopeSha256: string; unitIds: string[]; specs: ArtifactRef[]; actor: string; pointer: string };
export type CandidateSource = Readonly<{ kind: 'candidate'; source: SourceRef; evidence: ArtifactRef }>;
export type AdmissionAssessment = Readonly<{ kind: 'assessed'; candidate: CandidateSource }> | Readonly<{ kind: 'assessment-blocked'; candidate: CandidateSource; reasons: readonly string[] }>;
export type EligibleSource = Readonly<{ kind: 'eligible'; source: SourceRef; evidence: ArtifactRef }>;
export type Eligibility = Readonly<{ kind: 'eligible'; source: EligibleSource }> | Readonly<{ kind: 'blocked'; reasons: readonly string[] }>;
export type AuthorityObserver = (request: Readonly<{ kind: GateKind; record: ArtifactRef; actor: string; pointer: string }>) => Promise<Readonly<{ kind: 'observed'; actor: string; pointer: string }> | Readonly<{ kind: 'unconfirmed' }>>;
type CandidateState = { packet: Packet; context: PacketContext; capture: CapturedSource; selection: Selection };
type AssessmentState = { candidate: CandidateSource; refs: HumanGateRefs; records: Record<GateKind, Gate> };
const candidates = new WeakMap<CandidateSource, CandidateState>();
const assessments = new WeakMap<AdmissionAssessment, AssessmentState>();
const eligible = new WeakMap<EligibleSource, { assessment: AssessmentState; observer: AuthorityObserver }>();
const artifactListSchema = { type: 'array', items: artifactSchema } satisfies Schema;
const packetSchema = objectSchema({ schema: { const: 'VPSourcePacket/v1' }, capture: artifactSchema, decisions: artifactSchema, selection: artifactSchema, check: artifactSchema, reviews: { ...artifactListSchema, minItems: 1 }, specs: { type: 'array', minItems: 1, items: objectSchema({ artifact: artifactSchema, unitIds: { ...stringsSchema, minItems: 1 } }) } });
const selectionSchema = objectSchema({ schema: { const: 'VPSourceSelection/v1' }, source: sourceSchema, scope: artifactSchema, domain: { enum: ['methodology', 'engineering', 'ux', 'product', 'business', 'marketing', 'sales', 'growth', 'analytics', 'organization'] }, disposition: { enum: ['selected', 'excluded', 'pending-reconsideration'] }, rationale: textSchema, previousDisposition: textSchema, previousReason: textSchema, exclusion: { enum: ['none', 'journey'] }, unitIds: { ...stringsSchema, minItems: 1 } });
const checkSchema = objectSchema({ schema: { const: 'VPSourceCheck/v1' }, captureSha256: shaSchema, decisionsSha256: shaSchema, checker: artifactSchema, runtimeSha256: shaSchema, configuration: artifactSchema, command: { ...stringsSchema, minItems: 4 }, exitCode: { const: 0 }, stdout: artifactSchema, stderr: artifactSchema });
const reviewSchema = objectSchema({ schema: { const: 'VPSourceReview/v1' }, source: sourceSchema, inputSha256: shaSchema, decisionsSha256: shaSchema, scopeSha256: shaSchema, scope: { enum: ['full', 'delta'] }, unitIds: { ...stringsSchema, minItems: 1 }, verdict: { const: 'READY' }, actor: textSchema, pointer: textSchema });
const gateSchema = objectSchema({ schema: { const: 'VPHumanSourceGate/v1' }, kind: { enum: ['fidelity', 'rights', 'admission'] }, verdict: { enum: ['human-approved', 'cleared', 'owner-admitted'] }, source: sourceSchema, inputSha256: shaSchema, decisionsSha256: shaSchema, scopeSha256: shaSchema, unitIds: { ...stringsSchema, minItems: 1 }, specs: { ...artifactListSchema, minItems: 1 }, actor: textSchema, pointer: textSchema });
async function readValue(root: string, ref: ArtifactRef, schema: Schema): Promise<unknown> {
  const bytes = await verifyArtifact(root, ref);
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  validate(value, schema);
  return value;
}
const sameRef = (left: ArtifactRef, right: ArtifactRef): boolean => left.path === right.path && left.sha256 === right.sha256;
const sourceKey = (source: SourceRef): string => JSON.stringify([source.donor, source.pinnedRevision, source.canonicalCarrierPath, source.rawSha256, source.rawBytes]);
function sameMembers(left: readonly string[], right: readonly string[]): boolean {
  return new Set(left).size === left.length && new Set(right).size === right.length && left.length === right.length && left.every(item => right.includes(item));
}
function snapshotContext(context: PacketContext): PacketContext {
  return Object.freeze({ ...context, evidenceRoot: resolve(context.evidenceRoot), sourceRoot: resolve(context.sourceRoot), allowedSources: Object.freeze(context.allowedSources.map(source => Object.freeze({ ...source }))), scope: Object.freeze({ ...context.scope }), checker: Object.freeze({ ...context.checker }), configuration: Object.freeze({ ...context.configuration }) });
}
export async function verifyPreparedPacket(ref: ArtifactRef, inputContext: PacketContext): Promise<CandidateSource> {
  const context = snapshotContext(inputContext);
  const root = context.evidenceRoot;
  const packet = await readValue(root, ref, packetSchema) as Packet;
  const captured: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await verifyArtifact(root, packet.capture)));
  check(typeof captured === 'object' && captured !== null && 'source' in captured, 'missing capture source');
  validate(captured.source, sourceSchema);
  const source = captured.source as SourceRef;
  check(context.allowedSources.some(item => sourceKey(item) === sourceKey(source)), 'source not explicitly allowlisted');
  const capture = await capturePacket(source, context.sourceRoot);
  check(JSON.stringify(capture) === JSON.stringify(captured), 'capture source, policy or tool changed');
  const decisions = await readValue(root, packet.decisions, decisionsSchema);
  checkDecomposition(capture, decisions);
  const units = parseDecisions(capture, decisions).units.map(unit => unit.id);
  const selection = await readValue(root, packet.selection, selectionSchema) as Selection;
  check(sourceKey(selection.source) === sourceKey(source) && sameRef(selection.scope, context.scope), 'selection source or scope binding');
  check(selection.unitIds.every(id => units.includes(id)) && new Set(selection.unitIds).size === selection.unitIds.length, 'selection unit scope');
  await verifyArtifact(root, context.scope);
  await verifyArtifact(root, context.checker);
  await verifyArtifact(root, context.configuration);
  const receipt = await readValue(root, packet.check, checkSchema) as CheckReceipt;
  check(receipt.captureSha256 === packet.capture.sha256 && receipt.decisionsSha256 === packet.decisions.sha256 && sameRef(receipt.checker, context.checker) && sameRef(receipt.configuration, context.configuration) && receipt.runtimeSha256 === capture.runtime.sha256, 'check execution binding');
  check(receipt.command[0] === process.execPath && [context.checker.path, packet.capture.path, packet.decisions.path].every(path => receipt.command.includes(path) || receipt.command.includes(resolve(root, path))), 'check command binding');
  const stdout = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await verifyArtifact(root, receipt.stdout))) as unknown;
  check(typeof stdout === 'object' && stdout !== null && 'status' in stdout && stdout.status === 'PASS_MECHANICAL_ONLY' && 'sourceSha256' in stdout && stdout.sourceSha256 === source.rawSha256, 'checker stdout binding');
  check((await verifyArtifact(root, receipt.stderr)).length === 0, 'checker stderr not empty');
  const reviewed = new Set<string>();
  for (const ref of packet.reviews) {
    const review = await readValue(root, ref, reviewSchema) as Review;
    check(sourceKey(review.source) === sourceKey(source) && review.inputSha256 === sourceInputDigest(capture) && review.decisionsSha256 === packet.decisions.sha256 && review.scopeSha256 === context.scope.sha256, 'review input binding');
    check(review.unitIds.every(id => units.includes(id)), 'unknown reviewed unit');
    if (review.scope === 'full') check(sameMembers(review.unitIds, units), 'full review omits units');
    review.unitIds.forEach(id => reviewed.add(id));
  }
  check(selection.unitIds.every(id => reviewed.has(id)), 'selected unit lacks review');
  const mapped = new Set<string>();
  for (const spec of packet.specs) {
    await verifyArtifact(root, spec.artifact);
    check(spec.unitIds.every(id => selection.unitIds.includes(id)), 'spec outside selected units');
    spec.unitIds.forEach(id => mapped.add(id));
  }
  check(selection.unitIds.every(id => mapped.has(id)), 'unmapped selected unit');
  const candidate: CandidateSource = Object.freeze({ kind: 'candidate', source: capture.source, evidence: Object.freeze({ ...ref }) });
  candidates.set(candidate, { packet, context, capture, selection });
  return candidate;
}
export async function evaluateAdmission(candidate: CandidateSource, refs: HumanGateRefs): Promise<AdmissionAssessment> {
  const state = candidates.get(candidate);
  check(state !== undefined, 'candidate lacks verified packet');
  try {
    check(state.selection.disposition === 'selected' && state.selection.exclusion === 'none', 'source remains excluded or pending');
    const records: Partial<Record<GateKind, Gate>> = {};
    const snapshots: Partial<Record<GateKind, ArtifactRef>> = {};
    for (const kind of ['fidelity', 'rights', 'admission'] as const) {
      const ref = refs[kind];
      const gate = await readValue(state.context.evidenceRoot, ref, gateSchema) as Gate;
      const verdict = kind === 'fidelity' ? 'human-approved' : kind === 'rights' ? 'cleared' : 'owner-admitted';
      check(gate.kind === kind && gate.verdict === verdict && /^human:.+/u.test(gate.actor), `invalid ${kind} attribution`);
      check(sourceKey(gate.source) === sourceKey(state.capture.source) && gate.inputSha256 === sourceInputDigest(state.capture) && gate.decisionsSha256 === state.packet.decisions.sha256 && gate.scopeSha256 === state.context.scope.sha256 && sameMembers(gate.unitIds, state.selection.unitIds), `${kind} scope binding`);
      check(sameMembers(gate.specs.map(ref => JSON.stringify([ref.path, ref.sha256])), state.packet.specs.map(spec => JSON.stringify([spec.artifact.path, spec.artifact.sha256]))), `${kind} proposed text binding`);
      records[kind] = gate; snapshots[kind] = Object.freeze({ ...ref });
    }
    check(records.fidelity && records.rights && records.admission && snapshots.fidelity && snapshots.rights && snapshots.admission, 'incomplete human gates');
    const assessment: AdmissionAssessment = Object.freeze({ kind: 'assessed', candidate });
    assessments.set(assessment, { candidate, refs: { fidelity: snapshots.fidelity, rights: snapshots.rights, admission: snapshots.admission }, records: { fidelity: records.fidelity, rights: records.rights, admission: records.admission } });
    return assessment;
  } catch (error) {
    return Object.freeze({ kind: 'assessment-blocked', candidate, reasons: Object.freeze([error instanceof Error ? error.message : String(error)]) });
  }
}
export async function reconcileAdmissionAtRoot(assessment: AdmissionAssessment, observer: AuthorityObserver): Promise<Eligibility> {
  const state = assessments.get(assessment);
  if (state === undefined) return Object.freeze({ kind: 'blocked', reasons: ['Unverified or blocked admission assessment.'] });
  const candidate = candidates.get(state.candidate);
  check(candidate !== undefined, 'missing candidate');
  try {
    await verifyPreparedPacket(state.candidate.evidence, candidate.context);
    for (const kind of ['fidelity', 'rights', 'admission'] as const) {
      await verifyArtifact(candidate.context.evidenceRoot, state.refs[kind]);
      const record = state.records[kind];
      const observation = await observer(Object.freeze({ kind, record: state.refs[kind], actor: record.actor, pointer: record.pointer }));
      check(observation.kind === 'observed' && observation.actor === record.actor && observation.pointer === record.pointer, `Root has not observed ${kind} authority`);
    }
    const source: EligibleSource = Object.freeze({ kind: 'eligible', source: state.candidate.source, evidence: state.candidate.evidence });
    eligible.set(source, { assessment: state, observer });
    return Object.freeze({ kind: 'eligible', source });
  } catch (error) {
    return Object.freeze({ kind: 'blocked', reasons: [error instanceof Error ? error.message : String(error)] });
  }
}
export async function readEligibleSource(source: EligibleSource): Promise<{ source: SourceRef; specs: readonly { path: string; ref: ArtifactRef; unitIds: readonly string[] }[]; evidence: ArtifactRef; context: PacketContext }> {
  const state = eligible.get(source);
  check(state !== undefined, 'eligibility is not a live Root observation');
  const candidate = candidates.get(state.assessment.candidate);
  check(candidate !== undefined, 'missing candidate');
  const assessment = await evaluateAdmission(state.assessment.candidate, state.assessment.refs);
  const reconciled = await reconcileAdmissionAtRoot(assessment, state.observer);
  check(reconciled.kind === 'eligible', 'eligibility became stale or unconfirmed');
  return { source: candidate.capture.source, specs: candidate.packet.specs.map(spec => ({ path: resolve(candidate.context.evidenceRoot, spec.artifact.path), ref: { ...spec.artifact }, unitIds: [...spec.unitIds] })), evidence: source.evidence, context: snapshotContext(candidate.context) };
}
