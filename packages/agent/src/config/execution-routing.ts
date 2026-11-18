import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import routingSchema from '../../schemas/execution-routing.schema.json' with { type: 'json' };
import { canonicalJsonDigest, isPlainRecord } from '../contracts/canonical-json-core.js';
import { freezeJsonValue } from '../contracts/public-ingress.js';
import { RuntimeConfigError } from './runtime-config.js';
import type {
  CompletionProfile,
  EffectClass,
  ExecutionCatalog,
  ExecutionLevel,
  QualifiedComponentRef,
} from './execution-catalog.js';

type RouteTier = 'explicit' | 'product_kind' | 'product_default' | 'global_kind' | 'global_default';
export interface ValidatedRoutingInput {
  readonly work_id: string;
  readonly attempt: number;
  readonly canonical_kind: string;
  readonly project_ids: readonly string[];
  readonly requested_route_id?: string;
  readonly requested_level?: ExecutionLevel;
  readonly intent?:
    | 'information_research'
    | 'implementation_new'
    | 'implementation_change'
    | 'bug_fix'
    | 'task_execution';
  readonly risk_flags?: readonly string[];
  readonly labels?: readonly string[];
  readonly catalog: ExecutionCatalog;
}
export interface ResolvedExecutionRoute {
  readonly route_id: string;
  readonly tier: RouteTier;
  readonly product_id: string;
  readonly canonical_kind: string;
  readonly route_digest: string;
  readonly workflow_ref: QualifiedComponentRef;
  readonly teams_by_level: Readonly<Record<string, QualifiedComponentRef>>;
  readonly level: ExecutionLevel;
  readonly team_ref: QualifiedComponentRef;
  readonly completion_profile: CompletionProfile;
  readonly delivery_target?: string;
  readonly per_product: readonly Readonly<{
    product_id: string;
    canonical_kind: string;
    rule_tier: RouteTier;
    rule_key: string;
    route_id: string;
    route_digest: string;
  }>[];
}
type RecordValue = Record<string, unknown>;
type Selection = { route_id: string; tier: RouteTier; rule_key: string; route: RecordValue };
type CatalogComponent = { entry: RecordValue; ref: string };
type SchemaValidator = (value: unknown) => boolean;
type AjvConstructor = new (options: Record<string, unknown>) => { compile(schema: object): ValidateFunction<unknown> };
const Ajv = Ajv2020 as unknown as AjvConstructor;
const INTENTS = new Set([
  'information_research',
  'implementation_new',
  'implementation_change',
  'bug_fix',
  'task_execution',
]);
const LEVELS = new Set<ExecutionLevel>(['compact', 'standard', 'extended']);
const EFFECTS = new Set<EffectClass>(['read', 'source_write', 'test_execute', 'delivery_prepare', 'delivery_execute']);
let routingValidator: SchemaValidator | undefined;

function refuse(message: string): never {
  throw new RuntimeConfigError(message);
}

function record(value: unknown, label: string): RecordValue {
  if (!isPlainRecord(value)) refuse(label + ' must be a plain object.');
  return value;
}

function compiledRoutingValidator(): SchemaValidator {
  if (routingValidator === undefined)
    routingValidator = new Ajv({ strict: true, allErrors: true }).compile(routingSchema) as SchemaValidator;
  return routingValidator;
}

function assertKnownRoutingFields(input: RecordValue): void {
  const allowed = new Set([
    'work_id',
    'attempt',
    'canonical_kind',
    'project_ids',
    'requested_route_id',
    'requested_level',
    'intent',
    'risk_flags',
    'labels',
    'catalog',
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key))) refuse('Routing input contains an unknown or legacy field.');
}

function assertRoutingWorkIdentity(input: RecordValue): void {
  if (
    typeof input.work_id !== 'string' ||
    input.work_id.length === 0 ||
    !Number.isSafeInteger(input.attempt) ||
    Number(input.attempt) < 1
  )
    refuse('Routing work identity is invalid.');
}

function assertProjectIds(value: unknown): void {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((id) => typeof id !== 'string') ||
    new Set(value).size !== value.length
  )
    refuse('Admitted project ids must be nonempty and unique.');
}

function assertRequestedRoute(input: RecordValue): void {
  if (
    input.requested_route_id !== undefined &&
    (typeof input.requested_route_id !== 'string' || input.requested_route_id.length === 0)
  )
    refuse('Requested route id is invalid.');
}

function assertRequestedLevel(input: RecordValue): void {
  if (input.requested_level !== undefined && !LEVELS.has(input.requested_level as ExecutionLevel))
    refuse('Requested execution level is invalid.');
}

function assertIntent(input: RecordValue): void {
  if (input.intent !== undefined && (typeof input.intent !== 'string' || !INTENTS.has(input.intent)))
    refuse('Unknown work intent.');
}

function assertStringMetadata(input: RecordValue, key: 'risk_flags' | 'labels'): void {
  const list = input[key];
  if (list !== undefined && (!Array.isArray(list) || list.some((item) => typeof item !== 'string')))
    refuse('Routing work metadata is invalid.');
}

function assertRoutingInput(value: unknown): asserts value is ValidatedRoutingInput {
  const input = record(value, 'Routing input');
  assertKnownRoutingFields(input);
  assertRoutingWorkIdentity(input);
  if (typeof input.canonical_kind !== 'string' || input.canonical_kind.length === 0)
    refuse('Canonical work kind is invalid.');
  assertProjectIds(input.project_ids);
  assertRequestedRoute(input);
  assertRequestedLevel(input);
  assertIntent(input);
  assertStringMetadata(input, 'risk_flags');
  assertStringMetadata(input, 'labels');
  record(input.catalog, 'Routing catalog');
}

function catalogProjectIds(catalog: ExecutionCatalog): Set<string> {
  const rows = catalog.project.projects;
  if (!Array.isArray(rows)) refuse('Routing catalog has no validated project set.');
  const values = new Set<string>();
  for (const row of rows) {
    const value = record(row, 'Catalog product');
    const id = typeof value.project_id === 'string' ? value.project_id : value.id;
    if (typeof id !== 'string') refuse('Routing catalog contains an invalid product identity.');
    values.add(id);
  }
  return values;
}

function knownKinds(catalog: ExecutionCatalog): Set<string> {
  const workItems = record(catalog.project.work_items, 'Work item catalog');
  const types = record(workItems.types, 'Work item types');
  return new Set(Object.keys(types));
}

function routingDocument(catalog: ExecutionCatalog): RecordValue {
  const routing = record(catalog.routing, 'Execution routing');
  if (!compiledRoutingValidator()(routing)) refuse('Execution routing document does not match its strict schema.');
  return routing;
}

type RouteCandidate = { route_id: unknown; tier: RouteTier; rule_key: string };

function explicitRouteSelection(routes: RecordValue, routeId: string): Selection {
  const route = routes[routeId];
  if (route === undefined) refuse('Requested route does not exist.');
  return { route_id: routeId, tier: 'explicit', rule_key: routeId, route: record(route, 'Selected route') };
}

function routeCandidates(routing: RecordValue, productId: string, kind: string): readonly RouteCandidate[] {
  const products = routing.products === undefined ? {} : record(routing.products, 'Product routes');
  const product = products[productId] === undefined ? {} : record(products[productId], 'Product route rules');
  const productKinds = product.by_kind === undefined ? {} : record(product.by_kind, 'Product kind routes');
  const global = record(routing.global, 'Global route rules');
  const globalKinds = global.by_kind === undefined ? {} : record(global.by_kind, 'Global kind routes');
  return [
    { route_id: productKinds[kind], tier: 'product_kind', rule_key: productId + ':' + kind },
    { route_id: product.default_route, tier: 'product_default', rule_key: productId },
    { route_id: globalKinds[kind], tier: 'global_kind', rule_key: kind },
    { route_id: global.default_route, tier: 'global_default', rule_key: '*' },
  ];
}

function candidateSelection(routes: RecordValue, candidate: RouteCandidate): Selection | undefined {
  if (candidate.route_id === undefined) return undefined;
  if (typeof candidate.route_id !== 'string') refuse('Route rule target is invalid.');
  const route = routes[candidate.route_id];
  if (route === undefined) refuse('Route rule target does not exist.');
  return {
    route_id: candidate.route_id,
    tier: candidate.tier,
    rule_key: candidate.rule_key,
    route: record(route, 'Selected route'),
  };
}

function selectRouteTier(routing: RecordValue, productId: string, kind: string, explicitId?: string): Selection {
  const routes = record(routing.routes, 'Route definitions');
  if (explicitId !== undefined) return explicitRouteSelection(routes, explicitId);
  for (const candidate of routeCandidates(routing, productId, kind)) {
    const selection = candidateSelection(routes, candidate);
    if (selection !== undefined) return selection;
  }
  refuse('No execution route is configured for this product and work kind.');
}

function component(catalog: ExecutionCatalog, ref: unknown, kind: string): CatalogComponent {
  if (typeof ref !== 'string' || (!ref.startsWith('package:') && !ref.startsWith('custom:')))
    refuse('Route contains a malformed component reference.');
  const match = /^(package|custom):(role|profile|task|team|workflow)\/([a-z0-9][a-z0-9._-]{0,79})$/.exec(ref);
  if (!match || match[2] !== kind || catalog.enabled[ref] !== true)
    refuse('Route target is missing, disabled, or has the wrong class.');
  const origin = match[1] as 'package' | 'custom';
  const plural = { role: 'roles', profile: 'profiles', task: 'tasks', team: 'teams', workflow: 'workflows' }[
    kind
  ]! as keyof typeof catalog.components.package;
  const doc = record(catalog.components[origin][plural], 'Catalog component');
  const entries = record(doc.entries, 'Catalog entries');
  return { entry: record(entries[match[3]!], 'Selected catalog entry'), ref };
}

function scopeAllows(entry: RecordValue, productId: string): boolean {
  const scope = record(entry.scope, 'Component scope');
  return scope.repository === true || (Array.isArray(scope.product_ids) && scope.product_ids.includes(productId));
}

function assertScoped(entry: RecordValue, productId: string): void {
  if (!scopeAllows(entry, productId)) refuse('Route target is outside the admitted product scope.');
}

function routeTeamSelection(
  route: RecordValue,
  catalog: ExecutionCatalog,
  productId: string,
  requestedLevel?: ExecutionLevel,
): { level: ExecutionLevel; teamRef: QualifiedComponentRef; team: RecordValue } {
  const teamsByLevel = record(route.teams_by_level, 'Route team map');
  const defaultLevel = route.default_level as ExecutionLevel;
  if (!Object.hasOwn(teamsByLevel, defaultLevel)) refuse('Route default level has no team mapping.');
  const level = requestedLevel ?? defaultLevel;
  if (!Object.hasOwn(teamsByLevel, level)) refuse('Selected route has no team for the requested level.');
  const teamRef = teamsByLevel[level] as QualifiedComponentRef;
  const team = component(catalog, teamRef, 'team').entry;
  assertScoped(team, productId);
  if (team.level !== level) refuse('Selected team class does not match the route level.');
  return { level, teamRef, team };
}

function assertTeamAllowed(team: RecordValue, productId: string, kind: string): void {
  const allowedProjects = team.allowed_projects;
  const allowedKinds = team.allowed_work_kinds;
  if (!Array.isArray(allowedProjects) || (!allowedProjects.includes('*') && !allowedProjects.includes(productId)))
    refuse('Selected team is not allowed for this product.');
  if (!Array.isArray(allowedKinds) || !allowedKinds.includes(kind))
    refuse('Selected team is not allowed for this work kind.');
}

function assertRouteTarget(
  route: RecordValue,
  routeId: string,
  catalog: ExecutionCatalog,
  productId: string,
  kind: string,
  requestedLevel?: ExecutionLevel,
): { level: ExecutionLevel; teamRef: QualifiedComponentRef; workflowRef: QualifiedComponentRef; digest: string } {
  if (route.enabled !== true) refuse('Selected execution route is disabled.');
  const workflowRef = route.workflow_ref as QualifiedComponentRef;
  const workflow = component(catalog, workflowRef, 'workflow').entry;
  assertScoped(workflow, productId);
  const selection = routeTeamSelection(route, catalog, productId, requestedLevel);
  assertTeamAllowed(selection.team, productId, kind);
  assertTeamAssignments(selection.team, workflow, catalog, productId);
  const digest = canonicalJsonDigest({ route_id: routeId, route, level: selection.level, team_ref: selection.teamRef });
  return { level: selection.level, teamRef: selection.teamRef, workflowRef, digest };
}

function assertTeamAssignments(
  team: RecordValue,
  workflow: RecordValue,
  catalog: ExecutionCatalog,
  productId: string,
): void {
  const assignments = record(team.task_assignments, 'Team task assignments');
  const stages = workflow.stages;
  if (!Array.isArray(stages)) refuse('Selected workflow has no stages.');
  for (const stageValue of stages) {
    const stage = record(stageValue, 'Workflow stage');
    if (!Array.isArray(stage.assignments)) refuse('Workflow stage assignments are invalid.');
    for (const assignmentValue of stage.assignments) {
      const assignment = record(assignmentValue, 'Workflow assignment');
      const taskRef = assignment.task as string;
      const roleRef = assignment.role as string;
      const profileRef = assignment.profile as string;
      const binding = record(assignments[taskRef], 'Team task binding');
      if (binding.role !== roleRef || binding.profile !== profileRef)
        refuse('Workflow assignment is outside the selected team contract.');
      assertClassEffect(taskRef, roleRef, profileRef, stage.kind, catalog, productId);
    }
  }
}

function assertClassEffect(
  taskRef: string,
  roleRef: string,
  profileRef: string,
  stageKind: unknown,
  catalog: ExecutionCatalog,
  productId: string,
): void {
  const task = component(catalog, taskRef, 'task').entry;
  const role = component(catalog, roleRef, 'role').entry;
  const profile = component(catalog, profileRef, 'profile').entry;
  assertScoped(task, productId);
  assertScoped(role, productId);
  assertScoped(profile, productId);
  const roleClass = role.actor_class;
  const classForStage: Record<string, readonly string[]> = {
    research: ['analyst'],
    synthesize: ['analyst'],
    develop: ['source_writer'],
    validate: ['independent_validator'],
    test: ['test_executor'],
    deliver: ['delivery_planner', 'delivery_operator'],
  };
  if (
    !Array.isArray(classForStage[String(stageKind)]) ||
    !classForStage[String(stageKind)]!.includes(String(roleClass))
  )
    refuse('Workflow role class is incompatible with its stage.');
  const required = task.required_effects;
  const allowed = role.allowed_effects;
  if (!Array.isArray(required) || !Array.isArray(allowed)) refuse('Task effect contract is malformed.');
  for (const effect of required)
    if (!EFFECTS.has(effect as EffectClass) || !allowed.includes(effect))
      refuse('Workflow role does not allow a required task effect.');
}

function assertMultiProductScope(selections: readonly Selection[], productIds: readonly string[]): void {
  if (selections.length !== productIds.length || selections.length === 0)
    refuse('Routing did not resolve every admitted product.');
  const first = selections[0]!;
  const digest = canonicalJsonDigest(first.route);
  for (const selected of selections)
    if (selected.route_id !== first.route_id || canonicalJsonDigest(selected.route) !== digest)
      refuse('Admitted products resolve to conflicting execution routes.');
}

function resolvedProduct(
  input: ValidatedRoutingInput,
  routing: RecordValue,
  productId: string,
): { selection: Selection; target: ReturnType<typeof assertRouteTarget> } {
  const selection = selectRouteTier(routing, productId, input.canonical_kind, input.requested_route_id);
  const target = assertRouteTarget(
    selection.route,
    selection.route_id,
    input.catalog,
    productId,
    input.canonical_kind,
    input.requested_level,
  );
  return { selection, target };
}

/** Resolve one immutable whole-route target without consulting live configuration or selectors. */
export function resolveExecutionRoute(inputValue: ValidatedRoutingInput): ResolvedExecutionRoute {
  assertRoutingInput(inputValue);
  const knownProducts = catalogProjectIds(inputValue.catalog);
  const validKinds = knownKinds(inputValue.catalog);
  if (!validKinds.has(inputValue.canonical_kind)) refuse('Unknown canonical work kind.');
  for (const productId of inputValue.project_ids)
    if (!knownProducts.has(productId)) refuse('Unknown admitted product.');
  const routing = routingDocument(inputValue.catalog);
  const selected = inputValue.project_ids.map((productId) => resolvedProduct(inputValue, routing, productId));
  assertMultiProductScope(
    selected.map((item) => item.selection),
    inputValue.project_ids,
  );
  const primary = selected[0]!;
  const route = primary.selection.route;
  const result: ResolvedExecutionRoute = {
    route_id: primary.selection.route_id,
    tier: primary.selection.tier,
    product_id: inputValue.project_ids[0]!,
    canonical_kind: inputValue.canonical_kind,
    route_digest: primary.target.digest,
    workflow_ref: primary.target.workflowRef,
    teams_by_level: route.teams_by_level as Record<string, QualifiedComponentRef>,
    level: primary.target.level,
    team_ref: primary.target.teamRef,
    completion_profile: route.completion_profile as CompletionProfile,
    ...(route.delivery_target === undefined ? {} : { delivery_target: route.delivery_target as string }),
    per_product: selected.map(({ selection, target }, index) => ({
      product_id: inputValue.project_ids[index]!,
      canonical_kind: inputValue.canonical_kind,
      rule_tier: selection.tier,
      rule_key: selection.rule_key,
      route_id: selection.route_id,
      route_digest: target.digest,
    })),
  };
  return freezeJsonValue(result) as ResolvedExecutionRoute;
}
