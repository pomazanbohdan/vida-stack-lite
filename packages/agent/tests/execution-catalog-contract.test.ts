import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/canonical-json-core.ts';
import { parseRuntimeConfigDocument } from '../src/config/runtime-config.ts';
import { parseExecutionCatalog, type CatalogKind, type CatalogOrigin } from '../src/config/execution-catalog.ts';
import { resolveExecutionRoute, type ValidatedRoutingInput } from '../src/config/execution-routing.ts';
import { deriveWorkflowObligations } from '../src/orchestration/workflow-obligations.ts';
import { sdkCompatibilityManifest } from '../tooling/pack-sdk.ts';
import { standaloneBuildInputInventory } from '../tooling/maintained-source-inventory.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const componentKinds = ['roles', 'profiles', 'tasks', 'teams', 'workflows'] as const;
const levels = ['compact', 'standard', 'extended'] as const;
interface DocumentMeta {
  file_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

interface ComponentMeta extends DocumentMeta {
  source?: { package_id: string; package_version: string; source_id: string };
}

interface ComponentDocument {
  schema: string;
  kind: CatalogKind;
  origin: CatalogOrigin;
  meta: ComponentMeta;
  entries: Record<string, Record<string, unknown>>;
}

interface FilePin {
  path: string;
  file_id: string;
  sha256: string;
}

interface EntryProof {
  file_id: string;
  body_digest: string;
  derived_from?: { ref: string; base_body_digest: string };
}

type Provenance = Record<CatalogOrigin, Record<CatalogKind, Record<string, EntryProof>>>;

interface CatalogPins {
  package: Record<CatalogKind, FilePin>;
  custom: Record<CatalogKind, FilePin>;
  enablement: FilePin;
  routing: FilePin;
}

interface RouteDefinition {
  enabled: boolean;
  workflow_ref: string;
  teams_by_level: Record<string, string>;
  default_level: string;
  completion_profile: string;
}

interface ProductRouteRules {
  default_route?: string;
  by_kind?: Record<string, string>;
}

interface GlobalRouteRules {
  default_route: string;
  by_kind?: Record<string, string>;
}

interface RoutingDocument {
  schema: string;
  meta: DocumentMeta;
  routes: Record<string, RouteDefinition>;
  global: GlobalRouteRules;
  products?: Record<string, ProductRouteRules>;
  [key: string]: unknown;
}

interface EnablementDocument {
  schema: string;
  meta: DocumentMeta;
  enabled: Record<string, boolean>;
}

interface ProjectBase {
  schema: string;
  revision: unknown;
  projects: Record<string, unknown>[];
  work_items: Record<string, unknown>;
  [key: string]: unknown;
}

interface ProjectFixture extends ProjectBase {
  catalog_source: Record<string, unknown>;
  catalog_components: CatalogPins;
  catalog_provenance: Provenance;
}

interface CatalogInput {
  project: ProjectFixture;
  routing: RoutingDocument;
  enabled: EnablementDocument;
  components: Record<CatalogOrigin, Record<CatalogKind, ComponentDocument>>;
  file_digests: Record<string, string>;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new Error(label + ' must be a plain object.');
  return value;
}

function recordArray(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(label + ' must be an array.');
  return value.map((item: unknown, index: number) => requireRecord(item, label + ' entry ' + index));
}

function emptyPin(): FilePin {
  return { path: '', file_id: '', sha256: '' };
}

function emptyKindPins(): Record<CatalogKind, FilePin> {
  return { roles: emptyPin(), profiles: emptyPin(), tasks: emptyPin(), teams: emptyPin(), workflows: emptyPin() };
}

function emptyProofs(): Record<CatalogKind, Record<string, EntryProof>> {
  return { roles: {}, profiles: {}, tasks: {}, teams: {}, workflows: {} };
}

function baseProject(): ProjectBase {
  const raw = readFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'), 'utf8');
  const config = requireRecord(parseRuntimeConfigDocument(raw), 'runtime config');
  const {
    schema: _schema,
    version: _version,
    config_revision,
    agents: _agents,
    teams: _teams,
    workflows: _workflows,
    workflow_bindings: _bindings,
    ...retained
  } = config;
  const workItems = requireRecord(retained.work_items, 'project work items');
  workItems.types = { ...requireRecord(workItems.types, 'project work item types'), task: true };
  return {
    ...retained,
    schema: 'VidaProjectConfig',
    revision: config_revision,
    projects: recordArray(retained.projects, 'project products'),
    work_items: workItems,
  };
}

function component(
  origin: CatalogOrigin,
  kind: CatalogKind,
  entries: Record<string, Record<string, unknown>>,
): ComponentDocument {
  const id = origin + '-' + kind;
  const meta: ComponentMeta = {
    file_id: id,
    revision: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  if (origin === 'package') meta.source = { package_id: 'vida-agent', package_version: '0.1.9', source_id: 'source-1' };
  return { schema: 'ExecutionCatalogComponent', kind, origin, meta, entries };
}

function scoped(body: Record<string, unknown>): Record<string, unknown> {
  return { scope: { repository: true }, ...body };
}

function role(
  actor_class = 'source_writer',
  allowed_effects = ['read', 'source_write', 'test_execute', 'delivery_prepare'],
): Record<string, unknown> {
  return scoped({ actor_class, capabilities: ['execute-work'], allowed_effects });
}

function profile(): Record<string, unknown> {
  return scoped({
    model: 'test-model',
    reasoning: 'high',
    execution_mode: 'standard',
    mutation_scope: 'repository_source',
    tools_policy: 'developer',
    egress_policy: 'none',
  });
}

function task(): Record<string, unknown> {
  return scoped({
    version: 1,
    purpose: 'Implement admitted work',
    inputs: [],
    outputs: [],
    instructions: 'Implement only the approved work.',
    acceptance: ['all contracts pass'],
    required_effects: ['source_write'],
    terminal_outcomes: ['complete'],
  });
}

function team(level: string): Record<string, unknown> {
  return scoped({
    level,
    members: ['package:role/developer'],
    task_assignments: {
      'package:task/implementation-task': {
        role: 'package:role/developer',
        profile: 'package:profile/standard-profile',
      },
    },
    assurance_roles: {},
    independent_of: [],
    allowed_work_kinds: ['task'],
    allowed_projects: ['*'],
  });
}

function workflow(): Record<string, unknown> {
  return scoped({
    assurance_profile: 'task_focused',
    max_attempts: 2,
    entry_stage: 'implement',
    terminal_stages: ['implement'],
    stages: [
      {
        id: 'implement',
        kind: 'develop',
        mode: 'single',
        assignments: [
          {
            task: 'package:task/implementation-task',
            role: 'package:role/developer',
            profile: 'package:profile/standard-profile',
          },
        ],
        consumes: ['WorkItem/v1'],
        produces: ['ImplementationResult/v1'],
        required_after: [],
        context_source_ids: [],
        context_skill_refs: [],
        risk_flags: [],
      },
    ],
    edges: [],
  });
}

function route(): RouteDefinition {
  return {
    enabled: true,
    workflow_ref: 'package:workflow/generic-flow',
    teams_by_level: {
      compact: 'package:team/compact-team',
      standard: 'package:team/standard-team',
      extended: 'package:team/extended-team',
    },
    default_level: 'standard',
    completion_profile: 'source_only',
  };
}

function projectIds(project: unknown): string[] {
  const rows = requireRecord(project, 'project manifest').projects;
  if (!Array.isArray(rows)) throw new Error('project manifest projects must be an array.');
  return rows.map((item: unknown, index: number) => {
    const row = requireRecord(item, 'project manifest product ' + index);
    const id = row.project_id ?? row.id;
    if (typeof id !== 'string') throw new Error('project manifest product ' + index + ' lacks a string id.');
    return id;
  });
}

function makeInput(): CatalogInput {
  const components: CatalogInput['components'] = {
    package: {
      roles: component('package', 'roles', { developer: role() }),
      profiles: component('package', 'profiles', { 'standard-profile': profile() }),
      tasks: component('package', 'tasks', { 'implementation-task': task() }),
      teams: component('package', 'teams', {
        'compact-team': team('compact'),
        'standard-team': team('standard'),
        'extended-team': team('extended'),
      }),
      workflows: component('package', 'workflows', { 'generic-flow': workflow() }),
    },
    custom: {
      roles: component('custom', 'roles', {}),
      profiles: component('custom', 'profiles', {}),
      tasks: component('custom', 'tasks', {}),
      teams: component('custom', 'teams', {}),
      workflows: component('custom', 'workflows', {}),
    },
  };
  const source = {
    source_id: 'source-1',
    package_id: 'vida-agent',
    package_version: '0.1.9',
    artifact_ref: 'vida-agent/0.1.9',
    artifact_sha256: 'a'.repeat(64),
  };
  const provenance: Provenance = { package: emptyProofs(), custom: emptyProofs() };
  const enabled: Record<string, boolean> = {};
  const pins: CatalogPins = {
    package: emptyKindPins(),
    custom: emptyKindPins(),
    enablement: emptyPin(),
    routing: emptyPin(),
  };
  const digests: Record<string, string> = {};
  const routing: RoutingDocument = {
    schema: 'ExecutionRouting',
    meta: {
      file_id: 'routing-file',
      revision: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    routes: { standard: route() },
    global: { default_route: 'standard' },
  };
  const enablement: EnablementDocument = {
    schema: 'ExecutionCatalogEnablement',
    meta: {
      file_id: 'enablement-file',
      revision: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    enabled,
  };
  for (const origin of ['package', 'custom'] as const) {
    for (const kind of componentKinds) {
      const document = components[origin][kind];
      const filePath = `.vida/catalog/${origin}/${kind}.yaml`;
      const fileId = document.meta.file_id;
      const entries = document.entries;
      const kindProof: Record<string, EntryProof> = {};
      for (const [id, body] of Object.entries(entries)) {
        const refKind = (
          { roles: 'role', profiles: 'profile', tasks: 'task', teams: 'team', workflows: 'workflow' } as const
        )[kind];
        enabled[`${origin}:${refKind}/${id}`] = true;
        kindProof[id] = { file_id: fileId, body_digest: canonicalJsonDigest(body) };
      }
      provenance[origin][kind] = kindProof;
      const pin = { path: filePath, file_id: fileId, sha256: canonicalJsonDigest(document) };
      pins[origin][kind] = pin;
      digests[filePath] = pin.sha256;
    }
  }
  pins.enablement = {
    path: '.vida/catalog/enabled.yaml',
    file_id: enablement.meta.file_id,
    sha256: canonicalJsonDigest(enablement),
  };
  pins.routing = { path: '.vida/routing.yaml', file_id: routing.meta.file_id, sha256: canonicalJsonDigest(routing) };
  const project: ProjectFixture = {
    ...baseProject(),
    catalog_source: source,
    catalog_components: pins,
    catalog_provenance: provenance,
  };
  digests['.vida/project.yaml'] = canonicalJsonDigest(project);
  digests['.vida/catalog/enabled.yaml'] = canonicalJsonDigest(enablement);
  digests['.vida/routing.yaml'] = canonicalJsonDigest(routing);
  return { project, routing, enabled: enablement, components, file_digests: digests };
}

function refreshDigests(input: CatalogInput): void {
  for (const origin of ['package', 'custom'] as const) {
    const provenance = input.project.catalog_provenance[origin];
    for (const kind of componentKinds) {
      const document = input.components[origin][kind];
      const filePath = `.vida/catalog/${origin}/${kind}.yaml`;
      const entries = document.entries;
      for (const [id, body] of Object.entries(entries))
        provenance[kind][id] = { file_id: document.meta.file_id, body_digest: canonicalJsonDigest(body) };
      for (const id of Object.keys(provenance[kind])) if (!Object.hasOwn(entries, id)) delete provenance[kind][id];
      const pin = input.project.catalog_components[origin][kind];
      pin.sha256 = canonicalJsonDigest(document);
      pin.file_id = document.meta.file_id;
      input.file_digests[filePath] = pin.sha256;
    }
  }
  for (const origin of ['package', 'custom'] as const)
    for (const kind of componentKinds)
      for (const id of Object.keys(input.components[origin][kind].entries)) {
        const singular = (
          { roles: 'role', profiles: 'profile', tasks: 'task', teams: 'team', workflows: 'workflow' } as const
        )[kind];
        input.enabled.enabled[`${origin}:${singular}/${id}`] = true;
      }
  input.project.catalog_components.enablement = {
    path: '.vida/catalog/enabled.yaml',
    file_id: input.enabled.meta.file_id,
    sha256: canonicalJsonDigest(input.enabled),
  };
  input.project.catalog_components.routing = {
    path: '.vida/routing.yaml',
    file_id: input.routing.meta.file_id,
    sha256: canonicalJsonDigest(input.routing),
  };
  input.file_digests['.vida/project.yaml'] = canonicalJsonDigest(input.project);
  input.file_digests['.vida/catalog/enabled.yaml'] = canonicalJsonDigest(input.enabled);
  input.file_digests['.vida/routing.yaml'] = canonicalJsonDigest(input.routing);
}

function parsed(input = makeInput()) {
  refreshDigests(input);
  return parseExecutionCatalog(input);
}

function routeInput(
  catalog: ReturnType<typeof parseExecutionCatalog>,
  projectId = projectIds(catalog.project)[0]!,
): ValidatedRoutingInput {
  return { work_id: 'work-1', attempt: 1, canonical_kind: 'task', project_ids: [projectId], catalog };
}

function assignRoute(input: CatalogInput, id: string, definition: RouteDefinition = route()): void {
  input.routing.routes[id] = structuredClone(definition);
}

function setProjectRoute(input: CatalogInput, projectId: string, rule: ProductRouteRules): void {
  input.routing.products ??= {};
  input.routing.products[projectId] = rule;
}

test('catalog-t01-parse-all-three-levels', () => {
  for (const level of levels) {
    const input = makeInput();
    input.routing.routes.standard!.default_level = level;
    expect((parsed(input).routing.routes as { standard: { default_level: string } }).standard.default_level).toBe(
      level,
    );
  }
  const incomplete = makeInput();
  delete incomplete.routing.routes.standard!.teams_by_level.standard;
  refreshDigests(incomplete);
  expect(() => parseExecutionCatalog(incomplete)).toThrow(/default level/);
});

test('catalog-t01-reject-unknown-class-contract-field-when-disabled', () => {
  const input = makeInput();
  input.components.package.roles.entries.developer!.actor_class = 'untrusted';
  input.enabled.enabled['package:role/developer'] = false;
  refreshDigests(input);
  expect(() => parseExecutionCatalog(input)).toThrow();
  const extra = makeInput();
  extra.components.package.tasks.entries['implementation-task']!.unregistered_contract = true;
  extra.enabled.enabled['package:task/implementation-task'] = false;
  refreshDigests(extra);
  expect(() => parseExecutionCatalog(extra)).toThrow();
});

test('catalog-t01-preserve-product-paths-metadata-across-json-clone', () => {
  const input = makeInput();
  const cloned = JSON.parse(JSON.stringify(input)) as CatalogInput;
  const catalog = parsed(cloned);
  expect(catalog.project.projects).toEqual(input.project.projects);
  expect(catalog.components.package.roles.meta).toEqual(input.components.package.roles.meta);
  expect(Object.isFrozen(catalog.project)).toBe(true);
  expect(Object.isFrozen((catalog.components.package.roles.entries as { developer: object }).developer)).toBe(true);
});

test('catalog-t01-refuse-malformed-model-foreign-identity', () => {
  const malformed = makeInput();
  malformed.project.schema = 'VidaProjectConfig/v1';
  refreshDigests(malformed);
  expect(() => parseExecutionCatalog(malformed)).toThrow();
  const foreign = makeInput();
  refreshDigests(foreign);
  foreign.project.catalog_provenance.package.roles.foreign = { file_id: 'package-roles', body_digest: 'f'.repeat(64) };
  foreign.file_digests['.vida/project.yaml'] = canonicalJsonDigest(foreign.project);
  expect(() => parseExecutionCatalog(foreign)).toThrow(/foreign identity/);
  const derived = makeInput();
  derived.components.custom.roles.entries.forked = role();
  refreshDigests(derived);
  const baseBody = derived.components.package.roles.entries.developer!;
  derived.project.catalog_provenance.custom.roles.forked!.derived_from = {
    ref: 'package:role/developer',
    base_body_digest: canonicalJsonDigest({ ...baseBody, falsified: true }),
  };
  derived.file_digests['.vida/project.yaml'] = canonicalJsonDigest(derived.project);
  expect(() => parseExecutionCatalog(derived)).toThrow(/does not bind its base body/);

  const selfDerived = makeInput();
  selfDerived.components.custom.roles.entries.forked = role();
  refreshDigests(selfDerived);
  selfDerived.project.catalog_provenance.custom.roles.forked!.derived_from = {
    ref: 'custom:role/forked',
    base_body_digest: canonicalJsonDigest(selfDerived.components.custom.roles.entries.forked),
  };
  selfDerived.file_digests['.vida/project.yaml'] = canonicalJsonDigest(selfDerived.project);
  expect(() => parseExecutionCatalog(selfDerived)).toThrow(/cannot derive from itself/);

  const cyclic = makeInput();
  cyclic.components.custom.roles.entries.first = role();
  cyclic.components.custom.roles.entries.second = role();
  refreshDigests(cyclic);
  cyclic.project.catalog_provenance.custom.roles.first!.derived_from = {
    ref: 'custom:role/second',
    base_body_digest: canonicalJsonDigest(cyclic.components.custom.roles.entries.second),
  };
  cyclic.project.catalog_provenance.custom.roles.second!.derived_from = {
    ref: 'custom:role/first',
    base_body_digest: canonicalJsonDigest(cyclic.components.custom.roles.entries.first),
  };
  cyclic.file_digests['.vida/project.yaml'] = canonicalJsonDigest(cyclic.project);
  expect(() => parseExecutionCatalog(cyclic)).toThrow(/derivation cycle/);
});

test('catalog-t01-pin-all-12-refs-without-aliases', () => {
  const input = makeInput();
  expect(
    Object.keys(input.project.catalog_components.package).length +
      Object.keys(input.project.catalog_components.custom).length +
      2,
  ).toBe(12);
  expect(parsed(input).components.custom.roles.entries).toEqual({});
  const alias = makeInput();
  alias.project.catalog_components.custom.roles.path = alias.project.catalog_components.package.roles.path;
  refreshDigests(alias);
  expect(() => parseExecutionCatalog(alias)).toThrow();
});

test('catalog-t01-reject-qualified-namespace-duplicates-shadowing', () => {
  const input = makeInput();
  input.components.custom.roles.entries.developer = role();
  refreshDigests(input);
  expect(() => parseExecutionCatalog(input)).toThrow(/Duplicate or shadowing/);
});

test('catalog-t01-bind-file-identity-revision-timestamps-to-digest', () => {
  const input = makeInput();
  input.components.package.roles.meta.revision += 1;
  expect(() => parseExecutionCatalog(input)).toThrow(/digest|pin/);
  const invalidDate = makeInput();
  invalidDate.components.package.roles.meta.created_at = '2026-99-90T00:00:00Z';
  refreshDigests(invalidDate);
  expect(() => parseExecutionCatalog(invalidDate)).toThrow(/timestamps/);
  const invalidRoutingDate = makeInput();
  invalidRoutingDate.routing.meta.updated_at = '2026-99-90T00:00:00Z';
  refreshDigests(invalidRoutingDate);
  expect(() => parseExecutionCatalog(invalidRoutingDate)).toThrow();
  expect((parsed(makeInput()).components.package.roles.meta as { revision: number }).revision).toBe(1);
});

test('catalog-t01-strict-manifest-rejects-missing-extra-duplicate-refs', () => {
  const missing = makeInput();
  const missingPins: Partial<Record<CatalogKind, FilePin>> = missing.project.catalog_components.custom;
  delete missingPins.roles;
  expect(() => parseExecutionCatalog(missing)).toThrow();
  const extra = makeInput();
  extra.file_digests['.vida/extra.yaml'] = 'b'.repeat(64);
  expect(() => parseExecutionCatalog(extra)).toThrow();
  const duplicate = makeInput();
  duplicate.project.catalog_components.custom.roles.path = duplicate.project.catalog_components.package.roles.path;
  refreshDigests(duplicate);
  expect(() => parseExecutionCatalog(duplicate)).toThrow();
  const unknownField = makeInput();
  unknownField.routing.unregistered = true;
  refreshDigests(unknownField);
  expect(() => parseExecutionCatalog(unknownField)).toThrow(/strict schema/);
  const missingRoute = makeInput();
  missingRoute.routing.global.default_route = 'absent';
  refreshDigests(missingRoute);
  expect(() => parseExecutionCatalog(missingRoute)).toThrow(/route target/);
  const foreignComponent = makeInput();
  foreignComponent.routing.routes.standard!.workflow_ref = 'package:workflow/absent';
  refreshDigests(foreignComponent);
  expect(() => parseExecutionCatalog(foreignComponent)).toThrow(/qualified reference/);
});

test('catalog-t01-resolve-all-five-route-tiers', () => {
  const expected = [
    ['explicit', 'explicit'],
    ['product_kind', 'product-kind'],
    ['product_default', 'product-default'],
    ['global_kind', 'global-kind'],
    ['global_default', 'global-default'],
  ] as const;
  const productId = projectIds(baseProject())[0]!;
  for (const [tier, routeId] of expected) {
    const input = makeInput();
    for (const [, id] of expected) assignRoute(input, id);
    input.routing.global = { default_route: 'global-default', by_kind: { task: 'global-kind' } };
    setProjectRoute(input, productId, { default_route: 'product-default', by_kind: { task: 'product-kind' } });
    if (tier === 'product_default') delete input.routing.products![productId]!.by_kind;
    if (tier === 'global_kind') delete input.routing.products![productId];
    if (tier === 'global_default') {
      delete input.routing.products![productId];
      delete input.routing.global.by_kind;
    }
    const catalog = parsed(input);
    const result = resolveExecutionRoute({
      ...routeInput(catalog, productId),
      ...(tier === 'explicit' ? { requested_route_id: routeId } : {}),
    });
    expect([result.tier, result.route_id]).toEqual([tier, routeId]);
  }
});

test('catalog-t01-product-default-beats-global-kind', () => {
  const input = makeInput();
  assignRoute(input, 'product-default');
  assignRoute(input, 'global-kind');
  const productId = projectIds(input.project)[0]!;
  input.routing.global = { default_route: 'standard', by_kind: { task: 'global-kind' } };
  setProjectRoute(input, productId, { default_route: 'product-default' });
  expect(resolveExecutionRoute(routeInput(parsed(input), productId)).route_id).toBe('product-default');
});

test('catalog-t01-refuse-disabled-or-missing-route-target', () => {
  const disabled = makeInput();
  disabled.routing.routes.standard!.enabled = false;
  expect(() => resolveExecutionRoute(routeInput(parsed(disabled)))).toThrow(/disabled/);
  const missing = makeInput();
  missing.routing.global.default_route = 'absent';
  expect(() => resolveExecutionRoute(routeInput(parsed(missing)))).toThrow(/does not exist/);
});

test('catalog-t01-resolve-route-as-whole-without-field-merge', () => {
  const input = makeInput();
  assignRoute(input, 'product-route', { ...route(), completion_profile: 'artifact' });
  input.routing.global = { default_route: 'standard', by_kind: { task: 'standard' } };
  const productId = projectIds(input.project)[0]!;
  setProjectRoute(input, productId, { by_kind: { task: 'product-route' } });
  const result = resolveExecutionRoute(routeInput(parsed(input), productId));
  expect(result.route_id).toBe('product-route');
  expect(result.completion_profile).toBe('artifact');
  expect(result.delivery_target).toBeUndefined();
});

test('catalog-t01-refuse-unknown-kind-or-product', () => {
  const catalog = parsed();
  expect(() => resolveExecutionRoute({ ...routeInput(catalog), canonical_kind: 'alien-kind' })).toThrow(
    /Unknown canonical/,
  );
  expect(() => resolveExecutionRoute({ ...routeInput(catalog), project_ids: ['foreign-product'] })).toThrow(
    /Unknown admitted/,
  );
});

test('catalog-t01-refuse-multi-product-route-conflict', () => {
  const input = makeInput();
  const ids = projectIds(input.project);
  if (ids.length < 2) {
    const extra = structuredClone(input.project.projects[0]!);
    if ('project_id' in extra) extra.project_id = 'catalog-extra';
    else extra.id = 'catalog-extra';
    input.project.projects.push(extra);
  }
  const ids2 = projectIds(input.project);
  assignRoute(input, 'alternate');
  setProjectRoute(input, ids2[1]!, { default_route: 'alternate' });
  const catalog = parsed(input);
  expect(() => resolveExecutionRoute({ ...routeInput(catalog, ids2[0]!), project_ids: ids2.slice(0, 2) })).toThrow(
    /conflicting/,
  );
});

test('catalog-t01-enforce-scope-and-class-checks', () => {
  const outOfScope = makeInput();
  const ids = projectIds(outOfScope.project);
  if (ids.length < 2) {
    const extra = structuredClone(outOfScope.project.projects[0]!);
    if ('project_id' in extra) extra.project_id = 'catalog-extra';
    else extra.id = 'catalog-extra';
    outOfScope.project.projects.push(extra);
  }
  outOfScope.components.package.teams.entries['standard-team']!.scope = {
    product_ids: [projectIds(outOfScope.project)[1]],
  };
  refreshDigests(outOfScope);
  expect(() => resolveExecutionRoute(routeInput(parsed(outOfScope), projectIds(outOfScope.project)[0]!))).toThrow(
    /scope/,
  );
  const badClass = makeInput();
  badClass.components.package.roles.entries.developer!.actor_class = 'analyst';
  refreshDigests(badClass);
  expect(() => resolveExecutionRoute(routeInput(parsed(badClass)))).toThrow(/class/);
});

test('catalog-t01-keep-resolved-route-level-team-digest-stable-on-restart', () => {
  const first = parsed();
  const second = parsed(JSON.parse(JSON.stringify(makeInput())) as CatalogInput);
  const a = resolveExecutionRoute(routeInput(first));
  const b = resolveExecutionRoute(routeInput(second));
  expect([a.route_id, a.level, a.team_ref, a.route_digest]).toEqual([b.route_id, b.level, b.team_ref, b.route_digest]);
});

test('catalog-t01-preserve-obligations-across-intent-labels-flags', () => {
  const catalog = parsed();
  const first = resolveExecutionRoute({
    ...routeInput(catalog),
    intent: 'implementation_new',
    labels: ['a'],
    risk_flags: [],
  });
  const second = resolveExecutionRoute({
    ...routeInput(catalog),
    intent: 'implementation_change',
    labels: ['b'],
    risk_flags: ['security'],
  });
  expect([first.route_id, first.workflow_ref, first.route_digest]).toEqual([
    second.route_id,
    second.workflow_ref,
    second.route_digest,
  ]);
  expect(
    deriveWorkflowObligations({ risk: 'high', effects: ['source_write'], completion: 'source_only' }),
  ).toMatchObject({
    security_prewrite: true,
    focused_security: true,
    independent_tester: true,
    independent_review: true,
    source_plan_required: true,
  });
});

test('catalog-t01-refuse-unknown-intent-and-legacy-team-fields', () => {
  const catalog = parsed();
  expect(() => resolveExecutionRoute({ ...routeInput(catalog), intent: 'mystery' } as never)).toThrow(/intent/);
  expect(() => resolveExecutionRoute({ ...routeInput(catalog), team: 'caller-team' } as never)).toThrow(
    /unknown or legacy/,
  );
  expect(() => resolveExecutionRoute({ ...routeInput(catalog), team_id: 'caller-team' } as never)).toThrow(
    /unknown or legacy/,
  );
});

test('catalog-t01-bind-five-schemas-in-sdk-standalone-and-package', () => {
  const names = [
    'execution-catalog-component.schema.json',
    'execution-catalog-enablement.schema.json',
    'execution-routing.schema.json',
    'project-configuration.schema.json',
    'test-plan.v1.schema.json',
  ];
  const sourcePackage = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as { files: string[] };
  const sdk = sdkCompatibilityManifest({ root: packageRoot }).value;
  const standalone = standaloneBuildInputInventory(packageRoot);
  for (const name of names) {
    expect(sourcePackage.files.filter((entry) => entry === `schemas/${name}`)).toHaveLength(1);
    expect(sourcePackage.files.filter((entry) => entry === `dist/schemas/${name}`)).toHaveLength(1);
    expect(sdk.files.filter((entry) => entry === `schemas/${name}`)).toHaveLength(1);
    expect(sdk.files.filter((entry) => entry === `dist/schemas/${name}`)).toHaveLength(1);
    expect(standalone.filter((entry) => entry === `schemas/${name}`)).toHaveLength(1);
    expect(readFileSync(path.join(packageRoot, 'schemas', name), 'utf8')).toContain('"$schema"');
  }
});
