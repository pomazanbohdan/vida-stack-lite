import Ajv2020 from 'ajv/dist/2020.js';
import componentSchema from '../../schemas/execution-catalog-component.schema.json' with { type: 'json' };
import enablementSchema from '../../schemas/execution-catalog-enablement.schema.json' with { type: 'json' };
import projectSchema from '../../schemas/project-configuration.schema.json' with { type: 'json' };
import routingSchema from '../../schemas/execution-routing.schema.json' with { type: 'json' };
import runtimeSchema from '../../schemas/agent-runtime-config.v1.schema.json' with { type: 'json' };
import { canonicalJsonDigest, isPlainRecord } from '../contracts/canonical-json-core.js';
import { freezeJsonValue } from '../contracts/public-ingress.js';
import { RuntimeConfigError, parseRuntimeConfigDocument, snapshotRuntimeConfig } from './runtime-config.js';

const CATALOG_KINDS = ['roles', 'profiles', 'tasks', 'teams', 'workflows'] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];
export type CatalogOrigin = 'package' | 'custom';
export type ExecutionLevel = 'compact' | 'standard' | 'extended';
export type EffectClass = 'read' | 'source_write' | 'test_execute' | 'delivery_prepare' | 'delivery_execute';
export type CompletionProfile = 'source_only' | 'artifact' | 'deployment';
export type QualifiedComponentRef = `${CatalogOrigin}:${'role' | 'profile' | 'task' | 'team' | 'workflow'}/${string}`;
type ExecutionCatalogComponent = Readonly<Record<string, unknown>>;
export type ExecutionCatalog = Readonly<{
  input_digest: string;
  project: Readonly<Record<string, unknown>>;
  routing: Readonly<Record<string, unknown>>;
  enabled: Readonly<Record<string, boolean>>;
  components: Readonly<Record<CatalogOrigin, Readonly<Record<CatalogKind, ExecutionCatalogComponent>>>>;
  file_digests: Readonly<Record<string, string>>;
}>;

type SchemaValidator = ((value: unknown) => boolean) & {
  errors?: readonly { instancePath?: string; message?: string }[] | null;
};
type AjvConstructor = new (options: Record<string, unknown>) => {
  addSchema(schema: object): unknown;
  compile(schema: object): SchemaValidator;
};
const Ajv = Ajv2020 as unknown as AjvConstructor;
const KINDS_BY_ORIGIN: readonly CatalogKind[] = CATALOG_KINDS;
const KIND_SINGULAR: Readonly<Record<CatalogKind, string>> = Object.freeze({
  roles: 'role',
  profiles: 'profile',
  tasks: 'task',
  teams: 'team',
  workflows: 'workflow',
});
const CATALOG_PATHS: Readonly<Record<CatalogOrigin, Readonly<Record<CatalogKind, string>>>> = Object.freeze({
  package: Object.freeze({
    roles: '.vida/catalog/package/roles.yaml',
    profiles: '.vida/catalog/package/profiles.yaml',
    tasks: '.vida/catalog/package/tasks.yaml',
    teams: '.vida/catalog/package/teams.yaml',
    workflows: '.vida/catalog/package/workflows.yaml',
  }),
  custom: Object.freeze({
    roles: '.vida/catalog/custom/roles.yaml',
    profiles: '.vida/catalog/custom/profiles.yaml',
    tasks: '.vida/catalog/custom/tasks.yaml',
    teams: '.vida/catalog/custom/teams.yaml',
    workflows: '.vida/catalog/custom/workflows.yaml',
  }),
});
const MANIFEST_PATH = '.vida/project.yaml';
const ENABLEMENT_PATH = '.vida/catalog/enabled.yaml';
const ROUTING_PATH = '.vida/routing.yaml';
const HEX_DIGEST = /^[a-f0-9]{64}$/;
const REF_PATTERN = /^(package|custom):(role|profile|task|team|workflow)\/([a-z0-9][a-z0-9._-]{0,79})$/;
let validators: Readonly<Record<'project' | 'component' | 'enablement' | 'routing', SchemaValidator>> | undefined;

function fail(message: string): never {
  throw new RuntimeConfigError(message);
}

function compileValidators(): Readonly<Record<'project' | 'component' | 'enablement' | 'routing', SchemaValidator>> {
  if (validators !== undefined) return validators;
  const ajv = new Ajv({ strict: true, allErrors: true, ownProperties: true });
  ajv.addSchema(runtimeSchema);
  validators = Object.freeze({
    project: ajv.compile(projectSchema),
    component: ajv.compile(componentSchema),
    enablement: ajv.compile(enablementSchema),
    routing: ajv.compile(routingSchema),
  });
  return validators;
}

function assertSchema(value: unknown, schema: keyof NonNullable<typeof validators>, label: string): void {
  const validate = compileValidators()[schema];
  if (!validate(value))
    fail(
      label +
        ' does not match its strict schema: ' +
        (validate.errors ?? []).map((error) => error.instancePath + ' ' + error.message).join('; '),
    );
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) fail(label + ' must be a plain object.');
  return value;
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
    fail(label + ' must contain exactly its declared keys.');
}

function componentRef(origin: CatalogOrigin, kind: CatalogKind, id: string): string {
  return origin + ':' + KIND_SINGULAR[kind] + '/' + id;
}

function componentPath(origin: CatalogOrigin, kind: CatalogKind): string {
  return CATALOG_PATHS[origin][kind];
}

function fileSet(): string[] {
  const files = [MANIFEST_PATH, ENABLEMENT_PATH, ROUTING_PATH];
  for (const origin of ['package', 'custom'] as const)
    for (const kind of KINDS_BY_ORIGIN) files.push(componentPath(origin, kind));
  return files.sort();
}

function validFileDigest(digest: unknown): digest is string {
  return typeof digest === 'string' && HEX_DIGEST.test(digest);
}

function assertFileDigest(digests: Record<string, unknown>, path: string, value: unknown): void {
  if (digests[path] !== canonicalJsonDigest(value)) fail('Catalog file digest does not bind exact document: ' + path);
}

function productIds(project: Record<string, unknown>): Set<string> {
  const rows = project.projects;
  if (!Array.isArray(rows)) fail('Project manifest must declare its validated product set.');
  const ids = new Set<string>();
  for (const row of rows) {
    if (!isPlainRecord(row)) fail('Project manifest contains an invalid product.');
    const id = typeof row.project_id === 'string' ? row.project_id : row.id;
    if (typeof id !== 'string' || ids.has(id)) fail('Project manifest product identities must be unique.');
    ids.add(id);
  }
  return ids;
}

function assertScope(scope: unknown, knownProducts: Set<string>): void {
  const value = asRecord(scope, 'Component scope');
  if (value.repository === true && Object.keys(value).length === 1) return;
  const selected = value.product_ids;
  if (!Array.isArray(selected) || selected.length === 0 || new Set(selected).size !== selected.length)
    fail('Component scope must be repository-wide or contain unique product ids.');
  for (const id of selected)
    if (typeof id !== 'string' || !knownProducts.has(id)) fail('Component scope names an unknown product.');
}

function assertTimestamps(meta: Record<string, unknown>, label: string): void {
  const created = meta.created_at;
  const updated = meta.updated_at;
  const createdTime = typeof created === 'string' ? Date.parse(created) : Number.NaN;
  const updatedTime = typeof updated === 'string' ? Date.parse(updated) : Number.NaN;
  if (!Number.isFinite(createdTime) || !Number.isFinite(updatedTime) || createdTime > updatedTime)
    fail(label + ' timestamps are invalid or out of order.');
}

function assertComponentMeta(
  component: Record<string, unknown>,
  project: Record<string, unknown>,
  origin: CatalogOrigin,
): void {
  const meta = asRecord(component.meta, 'Component metadata');
  assertTimestamps(meta, 'Component metadata');
  if (origin !== 'package') return;
  const source = asRecord(meta.source, 'Package source metadata');
  const expected = asRecord(project.catalog_source, 'Catalog package source');
  for (const field of ['package_id', 'package_version', 'source_id'])
    if (source[field] !== expected[field]) fail('Package component provenance source is inconsistent.');
}

function componentDocuments(
  input: Record<string, unknown>,
): Record<CatalogOrigin, Record<CatalogKind, Record<string, unknown>>> {
  const groups = asRecord(input.components, 'Catalog components');
  assertExactKeys(groups, ['package', 'custom'], 'Catalog components');
  const result = {
    package: {} as Record<CatalogKind, Record<string, unknown>>,
    custom: {} as Record<CatalogKind, Record<string, unknown>>,
  };
  for (const origin of ['package', 'custom'] as const) {
    const group = asRecord(groups[origin], origin + ' components');
    assertExactKeys(group, CATALOG_KINDS, origin + ' components');
    for (const kind of KINDS_BY_ORIGIN) {
      const document = asRecord(group[kind], origin + ' ' + kind + ' component');
      assertSchema(document, 'component', origin + ' ' + kind + ' component');
      if (document.kind !== kind || document.origin !== origin)
        fail('Component document identity does not match its manifest slot.');
      result[origin][kind] = document;
    }
  }
  return result;
}

function registerPinnedIdentity(
  path: string,
  pin: Record<string, unknown>,
  seenPaths: Set<string>,
  seenFileIds: Set<string>,
): void {
  if (seenPaths.has(path) || seenFileIds.has(String(pin.file_id))) fail('Catalog file aliases are forbidden.');
  seenPaths.add(path);
  seenFileIds.add(String(pin.file_id));
}

function assertComponentPin(
  origin: CatalogOrigin,
  kind: CatalogKind,
  pinValue: unknown,
  document: Record<string, unknown>,
  digests: Record<string, unknown>,
  seenPaths: Set<string>,
  seenFileIds: Set<string>,
): void {
  const pin = asRecord(pinValue, 'Catalog component pin');
  const path = componentPath(origin, kind);
  const meta = asRecord(document.meta, 'Catalog component metadata');
  if (pin.path !== path || pin.file_id !== meta.file_id || pin.sha256 !== digests[path])
    fail('Catalog component pin does not bind its canonical file identity and bytes.');
  registerPinnedIdentity(path, pin, seenPaths, seenFileIds);
  if (pin.sha256 !== canonicalJsonDigest(document)) fail('Component file digest does not bind metadata and body.');
}

function assertOriginPins(
  origin: CatalogOrigin,
  pinValue: unknown,
  documents: Record<CatalogKind, Record<string, unknown>>,
  digests: Record<string, unknown>,
  seenPaths: Set<string>,
  seenFileIds: Set<string>,
): void {
  const pins = asRecord(pinValue, 'Catalog origin pins');
  assertExactKeys(pins, CATALOG_KINDS, 'Catalog origin pins');
  for (const kind of KINDS_BY_ORIGIN)
    assertComponentPin(origin, kind, pins[kind], documents[kind]!, digests, seenPaths, seenFileIds);
}

function assertAuxiliaryPin(
  pinValue: unknown,
  path: string,
  documentValue: unknown,
  digests: Record<string, unknown>,
  seenPaths: Set<string>,
  seenFileIds: Set<string>,
): void {
  const pin = asRecord(pinValue, 'Catalog auxiliary file pin');
  const document = asRecord(documentValue, 'Catalog auxiliary document');
  const meta = asRecord(document.meta, 'Catalog auxiliary metadata');
  if (
    pin.path !== path ||
    pin.file_id !== meta.file_id ||
    pin.sha256 !== digests[path] ||
    pin.sha256 !== canonicalJsonDigest(document)
  )
    fail('Catalog auxiliary file pin does not bind its canonical identity and bytes.');
  registerPinnedIdentity(path, pin, seenPaths, seenFileIds);
}

function assertManifestPins(
  project: Record<string, unknown>,
  documents: Record<CatalogOrigin, Record<CatalogKind, Record<string, unknown>>>,
  digests: Record<string, unknown>,
  enablement: unknown,
  routing: unknown,
): void {
  const pins = asRecord(project.catalog_components, 'Catalog component pins');
  assertExactKeys(pins, ['package', 'custom', 'enablement', 'routing'], 'Catalog component pins');
  const seenPaths = new Set<string>();
  const seenFileIds = new Set<string>();
  for (const origin of ['package', 'custom'] as const)
    assertOriginPins(origin, pins[origin], documents[origin], digests, seenPaths, seenFileIds);
  assertAuxiliaryPin(pins.enablement, ENABLEMENT_PATH, enablement, digests, seenPaths, seenFileIds);
  assertAuxiliaryPin(pins.routing, ROUTING_PATH, routing, digests, seenPaths, seenFileIds);
}

function assertQualifiedEntries(
  documents: Record<CatalogOrigin, Record<CatalogKind, Record<string, unknown>>>,
  knownProducts: Set<string>,
): Set<string> {
  const refs = new Set<string>();
  const names = new Set<string>();
  for (const origin of ['package', 'custom'] as const) {
    for (const kind of KINDS_BY_ORIGIN) {
      const document = documents[origin][kind]!;
      const entries = asRecord(document.entries, 'Catalog entries');
      for (const [id, entryValue] of Object.entries(entries)) {
        const entry = asRecord(entryValue, 'Catalog entry');
        const ref = componentRef(origin, kind, id);
        const namespace = KIND_SINGULAR[kind] + ':' + id;
        if (refs.has(ref) || names.has(namespace)) fail('Duplicate or shadowing qualified catalog identity.');
        refs.add(ref);
        names.add(namespace);
        assertScope(entry.scope, knownProducts);
      }
    }
  }
  return refs;
}

function assertEnablement(enabledValue: unknown, refs: Set<string>): Readonly<Record<string, boolean>> {
  assertSchema(enabledValue, 'enablement', 'Catalog enablement');
  const enabledDoc = asRecord(enabledValue, 'Catalog enablement');
  assertTimestamps(asRecord(enabledDoc.meta, 'Enablement metadata'), 'Enablement metadata');
  const enabled = asRecord(enabledDoc.enabled, 'Catalog enabled map');
  const actual = Object.keys(enabled).sort();
  const expected = [...refs].sort();
  if (actual.length !== expected.length || actual.some((ref, index) => ref !== expected[index]))
    fail('Catalog enabled map must contain exactly one switch for every component entry.');
  return enabled as Record<string, boolean>;
}

function provenanceRecords(project: Record<string, unknown>): Record<string, unknown> {
  return asRecord(project.catalog_provenance, 'Catalog provenance');
}

function assertDerivedProvenance(
  sourceValue: unknown,
  currentRef: string,
  refs: Set<string>,
  documents: Record<CatalogOrigin, Record<CatalogKind, Record<string, unknown>>>,
): string {
  const source = asRecord(sourceValue, 'Derived provenance');
  const ref = String(source.ref);
  const match = REF_PATTERN.exec(ref);
  if (!match || !refs.has(ref)) fail('Derived catalog provenance references a foreign identity.');
  if (ref === currentRef) fail('Catalog entry provenance cannot derive from itself.');
  const origin = match[1] as CatalogOrigin;
  const kind = CATALOG_KINDS.find((candidate) => KIND_SINGULAR[candidate] === match[2]);
  if (kind === undefined) fail('Derived catalog provenance references a foreign identity.');
  const catalog = asRecord(documents[origin][kind]!.entries, 'Catalog entries');
  const base = catalog[match[3]!];
  if (base === undefined || source.base_body_digest !== canonicalJsonDigest(base))
    fail('Derived catalog provenance does not bind its base body.');
  return ref;
}

function assertProvenanceRecord(
  id: string,
  currentRef: string,
  body: unknown,
  entries: Record<string, unknown>,
  fileId: unknown,
  refs: Set<string>,
  documents: Record<CatalogOrigin, Record<CatalogKind, Record<string, unknown>>>,
  derivations: Map<string, string>,
): void {
  const proof = asRecord(entries[id], 'Catalog entry provenance');
  if (proof.file_id !== fileId || proof.body_digest !== canonicalJsonDigest(body))
    fail('Catalog entry provenance does not bind its component and body.');
  const source = proof.derived_from;
  if (source !== undefined) derivations.set(currentRef, assertDerivedProvenance(source, currentRef, refs, documents));
}

function assertProvenanceComponent(
  origin: CatalogOrigin,
  kind: CatalogKind,
  component: Record<string, unknown>,
  entries: Record<string, unknown>,
  refs: Set<string>,
  documents: Record<CatalogOrigin, Record<CatalogKind, Record<string, unknown>>>,
  derivations: Map<string, string>,
): number {
  const meta = asRecord(component.meta, 'Catalog metadata');
  const bodies = asRecord(component.entries, 'Catalog entries');
  for (const [id, body] of Object.entries(bodies))
    assertProvenanceRecord(
      id,
      componentRef(origin, kind, id),
      body,
      entries,
      meta.file_id,
      refs,
      documents,
      derivations,
    );
  for (const id of Object.keys(entries))
    if (!Object.hasOwn(bodies, id)) fail('Catalog provenance contains a foreign identity.');
  return Object.keys(bodies).length;
}

function assertNoProvenanceCycles(derivations: Map<string, string>): void {
  const resolved = new Set<string>();
  for (const start of derivations.keys()) {
    const path = new Set<string>();
    let current: string | undefined = start;
    while (current !== undefined && !resolved.has(current)) {
      if (path.has(current)) fail('Catalog provenance contains a derivation cycle.');
      path.add(current);
      current = derivations.get(current);
    }
    for (const ref of path) resolved.add(ref);
  }
}

function assertProvenance(
  project: Record<string, unknown>,
  documents: Record<CatalogOrigin, Record<CatalogKind, Record<string, unknown>>>,
  refs: Set<string>,
): void {
  const root = provenanceRecords(project);
  const derivations = new Map<string, string>();
  let count = 0;
  for (const origin of ['package', 'custom'] as const) {
    const originMap = asRecord(root[origin], 'Catalog provenance origin');
    for (const kind of KINDS_BY_ORIGIN) {
      const entries = asRecord(originMap[kind], 'Catalog provenance kind');
      count += assertProvenanceComponent(origin, kind, documents[origin][kind]!, entries, refs, documents, derivations);
    }
  }
  if (count !== refs.size) fail('Catalog provenance closure is incomplete.');
  assertNoProvenanceCycles(derivations);
}

function assertReferences(value: unknown, refs: Set<string>): void {
  if (typeof value === 'string') {
    if (value.startsWith('package:') || value.startsWith('custom:')) {
      if (!REF_PATTERN.test(value) || !refs.has(value))
        fail('Catalog contains a malformed or foreign qualified reference.');
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertReferences(item, refs);
    return;
  }
  if (isPlainRecord(value)) for (const child of Object.values(value)) assertReferences(child, refs);
}

function assertRouteTargetExists(target: unknown, routes: Record<string, unknown>): void {
  if (typeof target !== 'string' || !Object.hasOwn(routes, target))
    fail('Execution routing references a route target that does not exist.');
}

function assertRouteRules(rulesValue: unknown, routes: Record<string, unknown>, knownKinds: Set<string>): void {
  const rules = asRecord(rulesValue, 'Execution route rules');
  for (const [kind, target] of Object.entries(rules)) {
    if (!knownKinds.has(kind)) fail('Execution routing references an unknown work kind.');
    assertRouteTargetExists(target, routes);
  }
}

function assertRoutingClosure(
  value: unknown,
  refs: Set<string>,
  knownProducts: Set<string>,
  knownKinds: Set<string>,
): void {
  const routing = asRecord(value, 'Execution routing document');
  assertTimestamps(asRecord(routing.meta, 'Routing metadata'), 'Routing metadata');
  const routes = asRecord(routing.routes, 'Execution routes');
  for (const routeValue of Object.values(routes)) {
    const route = asRecord(routeValue, 'Execution route');
    const teams = asRecord(route.teams_by_level, 'Execution route teams');
    if (!Object.hasOwn(teams, String(route.default_level))) fail('Execution route default level has no team mapping.');
    assertReferences(route, refs);
  }
  const global = asRecord(routing.global, 'Global execution routes');
  assertRouteTargetExists(global.default_route, routes);
  if (global.by_kind !== undefined) assertRouteRules(global.by_kind, routes, knownKinds);
  const products = routing.products === undefined ? {} : asRecord(routing.products, 'Product execution routes');
  for (const [productId, productValue] of Object.entries(products)) {
    if (!knownProducts.has(productId)) fail('Execution routing references an unknown product.');
    const product = asRecord(productValue, 'Product execution route rules');
    if (product.default_route !== undefined) assertRouteTargetExists(product.default_route, routes);
    if (product.by_kind !== undefined) assertRouteRules(product.by_kind, routes, knownKinds);
  }
}

function assertCatalogFileClosure(
  digestsValue: unknown,
  project: unknown,
  components: Record<CatalogOrigin, Record<CatalogKind, Record<string, unknown>>>,
  enablement: unknown,
  routing: unknown,
): Record<string, unknown> {
  const digests = asRecord(digestsValue, 'Catalog file digests');
  assertExactKeys(digests, fileSet(), 'Catalog file digests');
  for (const [path, digest] of Object.entries(digests))
    if (!validFileDigest(digest)) fail('Catalog file digest is malformed: ' + path);
  assertFileDigest(digests, MANIFEST_PATH, project);
  assertFileDigest(digests, ENABLEMENT_PATH, enablement);
  assertFileDigest(digests, ROUTING_PATH, routing);
  for (const origin of ['package', 'custom'] as const)
    for (const kind of KINDS_BY_ORIGIN)
      assertFileDigest(digests, componentPath(origin, kind), components[origin][kind]);
  return digests;
}

/** Strictly validate the complete final-value catalog. This function performs no I/O. */
export function parseExecutionCatalog(input: unknown): ExecutionCatalog {
  const captured = asRecord(snapshotRuntimeConfig(input), 'Execution catalog input');
  assertExactKeys(captured, ['project', 'routing', 'enabled', 'components', 'file_digests'], 'Execution catalog input');
  const project = snapshotRuntimeConfig(captured.project);
  assertSchema(project, 'project', 'Project manifest');
  const manifest = asRecord(project, 'Project manifest');
  const routing =
    typeof captured.routing === 'string'
      ? parseRuntimeConfigDocument(captured.routing)
      : snapshotRuntimeConfig(captured.routing);
  assertSchema(routing, 'routing', 'Execution routing');
  const enabledValue = snapshotRuntimeConfig(captured.enabled);
  const documents = componentDocuments(captured);
  assertManifestPins(
    manifest,
    documents,
    asRecord(captured.file_digests, 'Catalog file digests'),
    enabledValue,
    routing,
  );
  for (const origin of ['package', 'custom'] as const)
    for (const kind of KINDS_BY_ORIGIN) assertComponentMeta(documents[origin][kind]!, manifest, origin);
  const knownProducts = productIds(manifest);
  const refs = assertQualifiedEntries(documents, knownProducts);
  const enabled = assertEnablement(enabledValue, refs);
  const workItems = asRecord(manifest.work_items, 'Project work item catalog');
  const knownKinds = new Set(Object.keys(asRecord(workItems.types, 'Project work item types')));
  assertRoutingClosure(routing, refs, knownProducts, knownKinds);
  assertProvenance(manifest, documents, refs);
  assertReferences(documents, refs);
  const digests = assertCatalogFileClosure(captured.file_digests, project, documents, enabledValue, routing);
  return freezeJsonValue({
    input_digest: canonicalJsonDigest(Object.entries(digests).sort(([left], [right]) => left.localeCompare(right))),
    project,
    routing: asRecord(routing, 'Execution routing document'),
    enabled,
    components: documents,
    file_digests: digests,
  }) as ExecutionCatalog;
}
