import { createHash } from 'node:crypto';
import { parseDocument, isSeq } from 'yaml';
import { initializationObservationContext } from './init-core.ts';
import {
  parseRuntimeConfigYaml,
  runtimeConfigDigest,
  assertProjectUpgradeInactive,
} from '../src/config/runtime-config.ts';
import {
  sessionHandoffDatabaseRelativePath,
  sessionBridgeDatabaseRelativePath,
  PROJECT_WORKSPACE_DATABASE_PATH,
  RUNTIME_INITIALIZATION_PATH,
} from '../src/config/project-paths.ts';
import { validateRuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  captureConsumerProjectMoveInventory,
  observeFrozenProjectMove,
  parseConsumerProjectMoves,
  rebaseDocumentationPolicy,
  rebaseProjectPath,
} from './consumer-project-relocation.ts';
import type { ConsumerProjectMove, ConsumerProjectMoveInventory } from './consumer-project-relocation.ts';
import { validateConsumerConfigurationOperation } from './consumer-configuration-operation.ts';

export interface ConsumerConfigurationRequest {
  readonly projectRoot: string;
  readonly repository: string;
  readonly projectMappings: readonly string[];
  readonly teamProjectGrants?: readonly string[];
  readonly projectMoves?: readonly string[];
}

export interface ConsumerConfigurationPlan {
  readonly schema: 'ConsumerConfigurationPlan/v1';
  readonly request: {
    readonly repository: string;
    readonly projects: readonly { readonly id: string; readonly root: string }[];
    readonly team_project_grants: readonly string[];
    readonly project_moves?: readonly ConsumerProjectMove[];
  };
  readonly operation_id: string;
  readonly binding: string;
  readonly changes: {
    readonly added_projects: readonly string[];
    readonly team_project_grants: readonly string[];
    readonly relocation:
      | 'none'
      | {
          readonly files: number;
          readonly directories: number;
          readonly source_directories_retained: number;
          readonly source_empty_directories_retained: number;
          readonly projection: 'plan_only';
        };
  };
}

const outputs = [
  ['templates/AGENTS.template.md', 'AGENTS.md'],
  ['templates/AGENT.sidecar.template.md', 'AGENT.sidecar.md'],
  ['templates/agent-runtime.config.template.v1.yaml', 'agent-runtime.config.v1.yaml'],
  ['templates/documentation-policy.template.v1.json', 'docs/agent-instructions/documentation-policy.v1.json'],
] as const;
const digest = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
const text = (data: Uint8Array): string => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data);

/** Observes current consumer bytes and derives an opaque, non-authoritative plan. */
export function captureConsumerConfiguration(request: ConsumerConfigurationRequest): {
  readonly plan: ConsumerConfigurationPlan;
  readonly targetConfig: string;
  readonly targetPolicy: string;
  readonly relocationInventory: readonly ConsumerProjectMoveInventory[];
  readonly before: readonly Buffer[];
  readonly receipt: Buffer | null;
} {
  return capture(request);
}

export type ConfigurationRecovery = {
  readonly before: readonly Buffer[];
  readonly target: Buffer;
  readonly beforeReceipt: Buffer | null;
  readonly targetReceipt: Buffer | null;
} & ({ readonly pending: Buffer; readonly archived?: false } | { readonly archive: Buffer; readonly archived: true });

/** Internal recovery overlay. The caller validates the exact owned journal first. */
export function captureConsumerConfigurationForRecovery(
  request: ConsumerConfigurationRequest,
  recovery: ConfigurationRecovery,
): ReturnType<typeof captureConsumerConfiguration> {
  return capture(request, recovery);
}

function capture(
  request: ConsumerConfigurationRequest,
  recovery?: ConfigurationRecovery,
): {
  readonly plan: ConsumerConfigurationPlan;
  readonly targetConfig: string;
  readonly targetPolicy: string;
  readonly relocationInventory: readonly ConsumerProjectMoveInventory[];
  readonly before: readonly Buffer[];
  readonly receipt: Buffer | null;
} {
  const ctx = initializationObservationContext(request);
  const physical = ctx.observation;
  const pendingPath = '.agent/runtime-initialization.pending.v1.json';
  const assertRecovery = () => {
    if (!recovery) return;
    const journalBytes = recovery.archived ? recovery.archive : recovery.pending;
    const journal = validateConsumerConfigurationOperation(JSON.parse(text(journalBytes)));
    if (recovery.before.length !== 4) throw new Error('Recovery before images differ');
    if (recovery.archived) {
      const archivePath = `.agent/consumer-configuration-operation.${journal.operation_id}.v1.json`;
      if (
        journal.operation_id !== `config-${journal.binding}` ||
        journal.progress !== 'complete' ||
        journal.root !== ctx.canonicalRoot ||
        requireSafeRepositoryAccess(ctx.canonicalRoot).directoryIdentity('.', 'configuration root') !==
          journal.root_identity ||
        physical.fileExists(pendingPath, 'pending initialization') ||
        !physical.fileExists(archivePath, 'configuration archive') ||
        !physical.readBytes(archivePath, 'configuration archive').equals(journalBytes)
      )
        throw new Error('Recovery archive ownership changed');
    } else if (
      !physical.fileExists(pendingPath, 'pending initialization') ||
      physical.fileExists(
        `.agent/consumer-configuration-operation.${journal.operation_id}.v1.json`,
        'configuration archive',
      ) ||
      !physical.readBytes(pendingPath, 'pending initialization').equals(journalBytes)
    )
      throw new Error('Recovery pending ownership changed');
    const frozen = journal;
    if (
      JSON.stringify(frozen.request) !== JSON.stringify(request) ||
      frozen.before.length !== 4 ||
      frozen.before.some((entry, i) => entry.base64 !== recovery.before[i]?.toString('base64')) ||
      frozen.target?.base64 !== recovery.target.toString('base64') ||
      (recovery.beforeReceipt === null
        ? frozen.receipt !== null
        : frozen.receipt?.before?.base64 !== recovery.beforeReceipt.toString('base64') ||
          frozen.receipt?.target?.base64 !== recovery.targetReceipt?.toString('base64'))
    )
      throw new Error('Recovery overlay differs from journal');
    for (const [i, [, output]] of outputs.entries()) {
      const actual = physical.readBytes(output, 'existing integration output');
      const policy = journal.relocation?.policy;
      const targetPolicy = policy && Buffer.from(policy.target.base64, 'base64');
      if (
        !actual.equals(recovery.before[i] ?? Buffer.alloc(0)) &&
        !(i === 2 && actual.equals(recovery.target)) &&
        !(i === 3 && targetPolicy && actual.equals(targetPolicy))
      )
        throw new Error('Recovery outputs differ');
      if (
        i === 3 &&
        policy &&
        ((policy.state === 'not-started' && !actual.equals(recovery.before[3]!)) ||
          (policy.state === 'completed' && !actual.equals(targetPolicy!)) ||
          (journal.progress !== 'intent' && !actual.equals(targetPolicy!)))
      )
        throw new Error('Recovery policy progress differs');
    }
    if (
      journal.relocation &&
      !recovery.before[2]!.equals(recovery.target) &&
      physical.readBytes(outputs[2][1], 'configuration output').equals(recovery.target) &&
      !physical
        .readBytes(outputs[3][1], 'documentation policy')
        .equals(Buffer.from(journal.relocation.policy.target.base64, 'base64'))
    )
      throw new Error('Recovery configuration precedes policy');
    if (
      journal.relocation &&
      (journal.progress !== 'intent' ||
        physical.readBytes(outputs[2][1], 'configuration output').equals(recovery.target)) &&
      journal.relocation.inventory.some((item) => item.files.some((file) => file.state === 'not-started'))
    )
      throw new Error('Recovery configuration precedes relocation');
    const receiptExists = physical.fileExists(RUNTIME_INITIALIZATION_PATH, 'initialization receipt');
    if (
      receiptExists !== (recovery.beforeReceipt !== null) ||
      (receiptExists &&
        (!recovery.beforeReceipt ||
          !recovery.targetReceipt ||
          ![recovery.beforeReceipt, recovery.targetReceipt].some((candidate) =>
            physical.readBytes(RUNTIME_INITIALIZATION_PATH, 'initialization receipt').equals(candidate),
          )))
    )
      throw new Error('Recovery receipt differs');
    if (
      receiptExists &&
      recovery.beforeReceipt &&
      recovery.targetReceipt &&
      !recovery.beforeReceipt.equals(recovery.targetReceipt) &&
      physical.readBytes(RUNTIME_INITIALIZATION_PATH, 'initialization receipt').equals(recovery.targetReceipt) &&
      !physical.readBytes(outputs[2][1], 'configuration output').equals(recovery.target)
    )
      throw new Error('Recovery receipt precedes configuration');
    if (
      journal.progress !== 'intent' &&
      !physical.readBytes(outputs[2][1], 'configuration output').equals(recovery.target)
    )
      throw new Error('Recovery configuration progress differs');
    if (
      journal.progress === 'intent' &&
      recovery.beforeReceipt &&
      !physical.readBytes(RUNTIME_INITIALIZATION_PATH, 'initialization receipt').equals(recovery.beforeReceipt)
    )
      throw new Error('Recovery receipt progress differs');
    if (
      (journal.progress === 'receipt_applied' || journal.progress === 'complete') &&
      recovery.targetReceipt &&
      !physical.readBytes(RUNTIME_INITIALIZATION_PATH, 'initialization receipt').equals(recovery.targetReceipt)
    )
      throw new Error('Recovery receipt progress differs');
    return journal;
  };
  const recoveryJournal = assertRecovery();
  const view = recovery
    ? {
        ...physical,
        fileExists: (target: string, label: string) =>
          target === pendingPath ? false : physical.fileExists(target, label),
        readBytes: (target: string, label: string) => {
          if (target === RUNTIME_INITIALIZATION_PATH && recovery.beforeReceipt)
            return Buffer.from(recovery.beforeReceipt);
          const index = outputs.findIndex(([, output]) => output === target);
          return index < 0 ? physical.readBytes(target, label) : Buffer.from(recovery.before[index] ?? Buffer.alloc(0));
        },
      }
    : physical;
  assertProjectUpgradeInactive(view);
  if (view.fileExists('.agent/runtime-initialization.pending.v1.json', 'pending initialization'))
    throw new Error('Pending initialization or configuration requires recovery');
  const before = outputs.map(([, output]) => view.readBytes(output, 'existing integration output'));
  if (before.some((entry) => entry.length === 0)) throw new Error('Existing integration output is empty');
  const configBytes = before[2];
  const policyBytes = before[3];
  if (!configBytes || !policyBytes) throw new Error('Existing integration outputs are incomplete');
  let config: ReturnType<typeof parseRuntimeConfigYaml>;
  try {
    config = parseRuntimeConfigYaml(text(configBytes));
  } catch {
    throw new Error('Existing configuration is invalid');
  }
  if (
    config.repository.repository_id !== request.repository ||
    config.repository.policy !== 'AGENTS.md' ||
    config.repository.sidecar !== 'AGENT.sidecar.md'
  )
    throw new Error('Existing repository binding differs');
  try {
    ctx.validatePolicy(config, text(policyBytes));
  } catch {
    throw new Error('Existing documentation policy is invalid');
  }
  const current = new Map(config.projects.map((project) => [project.project_id, project.project_root]));
  const moves = parseConsumerProjectMoves(request.projectMoves, current, ctx.selectedProjects);
  const inventory = recoveryJournal?.relocation
    ? recoveryJournal.relocation.inventory.map((item) => observeFrozenProjectMove(ctx.canonicalRoot, item))
    : moves.map((move) => captureConsumerProjectMoveInventory(ctx.canonicalRoot, move));
  if (request.teamProjectGrants !== undefined && !Array.isArray(request.teamProjectGrants))
    throw new Error('Team grants must be an array of TEAM=PROJECT mappings');
  const grants: string[] = [];
  for (const grant of request.teamProjectGrants ?? []) {
    if (typeof grant !== 'string') throw new Error('Team grants must be unique TEAM=PROJECT mappings');
    grants.push(grant);
  }
  if (new Set(grants).size !== grants.length) throw new Error('Team grants must be unique TEAM=PROJECT mappings');
  grants.sort();
  const parsedGrants = grants.map((grant) => {
    const parts = grant.split('=');
    const team = parts[0];
    const project = parts[1];
    if (
      parts.length !== 2 ||
      !team ||
      !project ||
      !Object.hasOwn(config.teams, team) ||
      !ctx.selectedProjects.some((entry) => entry.id === project)
    )
      throw new Error('Team grant must name an existing team and desired project');
    const existingTeam = config.teams[team];
    if (!existingTeam || existingTeam.allowed_projects.includes(project)) throw new Error('Team grant already exists');
    return { team, project };
  });
  for (const [id, root] of current) {
    const requested = ctx.selectedProjects.find((project) => project.id === id);
    if (!requested) throw new Error('Removing or renaming a project is unsupported');
    if (requested.root !== root && !moves.some((move) => move.id === id))
      throw new Error('Project relocation requires an explicit move');
  }
  const directories = ctx.selectedProjects.map((project) => [project.id, ctx.projectDirectoryIdentity(project.root)]);
  if (
    view.fileExists(config.control.coordination_ledger, 'coordination ledger') ||
    (view.fileExists(config.control.work_root, 'work state') &&
      view.listFiles(config.control.work_root, 'work state').length > 0)
  )
    throw new Error('Existing work or coordination state is not eligible');
  const databasePaths = [
    sessionHandoffDatabaseRelativePath(config),
    sessionBridgeDatabaseRelativePath(config),
    PROJECT_WORKSPACE_DATABASE_PATH,
  ];
  for (const database of databasePaths)
    for (const suffix of ['', '-wal', '-shm', '-journal'])
      if (view.fileExists(database + suffix, 'Host database observation'))
        throw new Error('Host database state is not eligible');
  const rawSchema = text(ctx.readPackageBytes('schemas/runtime-initialization.v1.schema.json'));
  let receiptBytes: Buffer | null = null;
  if (view.fileExists(RUNTIME_INITIALIZATION_PATH, 'initialization receipt')) {
    receiptBytes = view.readBytes(RUNTIME_INITIALIZATION_PATH, 'initialization receipt');
    const receipt = validateRuntimeInitializationReceipt(JSON.parse(text(receiptBytes)), rawSchema);
    const evidence = outputs.map(([template, output], i) => ({
      template,
      template_sha256: digest(ctx.readPackageBytes(template)),
      output,
      output_sha256: digest(before[i] ?? new Uint8Array()),
    }));
    if (
      receipt.templates.some(
        (entry, i) =>
          entry.template !== evidence[i]?.template || entry.template_sha256 !== evidence[i]?.template_sha256,
      )
    )
      throw new Error('Executing templates differ from the receipt; older bundle validation is unsupported');
    if (
      receipt.workspace_binding_status !== 'pending' ||
      receipt.repository_id !== request.repository ||
      receipt.workspace_id !== deriveWorkspaceId(request.repository, ctx.canonicalRoot) ||
      receipt.bundle !== config.runtime.bundle ||
      receipt.config_digest !== runtimeConfigDigest(config) ||
      receipt.integrations_digest !== canonicalJsonDigest(config.integrations) ||
      JSON.stringify(receipt.project_ids) !== JSON.stringify([...current.keys()].sort()) ||
      JSON.stringify(receipt.templates) !== JSON.stringify(evidence)
    )
      throw new Error('Initialization receipt differs or workspace is bound');
  }
  const defaults = ctx.defaultConfig();
  const added = ctx.selectedProjects.filter((project) => !current.has(project.id));
  const document = parseDocument(text(configBytes));
  if (document.errors.length) throw new Error('Existing configuration is invalid');
  const projects = document.get('projects');
  const providers = document.getIn(['integrations', 'providers']);
  if (!isSeq(projects) || !isSeq(providers)) throw new Error('Configuration collections are invalid');
  for (const move of moves) {
    const index = config.projects.findIndex((project) => project.project_id === move.id);
    if (index < 0) throw new Error('Relocation project is missing');
    document.setIn(['projects', index, 'project_root'], move.newRoot);
    for (const field of ['wiki_root', 'wiki_path', 'wiki_output_root', 'internal_root', 'ledger_root'] as const) {
      const value = document.getIn(['projects', index, field]);
      if (typeof value !== 'string') throw new Error('Project path is invalid');
      document.setIn(['projects', index, field], rebaseProjectPath(value, [move]));
    }
    const selectors = config.projects[index]?.code_selectors;
    if (!selectors) throw new Error('Project selectors are invalid');
    for (let i = 0; i < selectors.length; i++)
      document.setIn(['projects', index, 'code_selectors', i], rebaseProjectPath(selectors[i]!, [move]));
    const overrides = config.projects[index]?.path_overrides;
    if (overrides)
      for (const [key, value] of Object.entries(overrides)) {
        if (typeof value !== 'string') throw new Error('Project path override is invalid');
        document.setIn(['projects', index, 'path_overrides', key], rebaseProjectPath(value, [move]));
      }
  }
  for (const project of added) {
    const defaultProject = defaults.projects.find((entry) => entry.project_id === project.id);
    const defaultProvider = defaults.integrations.providers.find((entry) => entry.project_id === project.id);
    if (!defaultProject || !defaultProvider) throw new Error('Executing template lacks project defaults');
    if (config.integrations.providers.some((entry) => entry.id === defaultProvider.id))
      throw new Error('Default integration conflicts with an existing provider');
    projects.add(document.createNode(defaultProject));
    providers.add(document.createNode(defaultProvider));
  }
  for (const { team, project } of parsedGrants) {
    const allowed = document.getIn(['teams', team, 'allowed_projects']);
    if (!isSeq(allowed)) throw new Error('Team project allowlist is invalid');
    allowed.add(project);
  }
  const oldBundlePrefix = config.runtime.bundle + '/';
  if (config.runtime.bundle !== defaults.runtime.bundle) {
    for (const [index, source] of config.knowledge.sources.entries()) {
      if (source.kind === 'local' && source.location.startsWith(oldBundlePrefix))
        document.setIn(
          ['knowledge', 'sources', index, 'location'],
          defaults.runtime.bundle + '/' + source.location.slice(oldBundlePrefix.length),
        );
    }
  }
  for (const key of ['bundle', 'schema_root', 'instruction_root', 'tooling_root'] as const)
    document.setIn(['runtime', key], defaults.runtime[key]);
  const target = String(document);
  const targetPolicy = rebaseDocumentationPolicy(text(policyBytes), moves);
  let targetConfig: ReturnType<typeof parseRuntimeConfigYaml>;
  try {
    targetConfig = parseRuntimeConfigYaml(target);
  } catch {
    throw new Error('Derived target configuration is invalid');
  }
  ctx.validatePolicy(targetConfig, targetPolicy);
  ctx.validateReferences(
    targetConfig,
    inventory.map((entry) => ({ ...entry.move, directories: entry.directories, files: entry.files })),
  );
  const packagePaths = [
    ...new Set([
      ...ctx.packageCodePaths(),
      ...outputs.map(([template]) => template),
      'package.json',
      'schemas/runtime-initialization.v1.schema.json',
      'schemas/documentation-policy.v1.schema.json',
      'schemas/agent-runtime-config.v1.schema.json',
      'schemas/research-result.v1.schema.json',
      'schemas/research-synthesis.v1.schema.json',
    ]),
  ].sort();
  const packageBinding = packagePaths.map((entry) => [entry, digest(ctx.readPackageBytes(entry))]);
  if (
    view.fileExists('.agent/runtime-initialization.pending.v1.json', 'pending initialization') ||
    outputs.some(
      ([, output], i) => !view.readBytes(output, 'existing integration output').equals(before[i] ?? Buffer.alloc(0)),
    ) ||
    databasePaths.some((database) =>
      ['', '-wal', '-shm', '-journal'].some((suffix) =>
        view.fileExists(database + suffix, 'Host database observation'),
      ),
    ) ||
    view.fileExists(RUNTIME_INITIALIZATION_PATH, 'initialization receipt') !== (receiptBytes !== null) ||
    (receiptBytes !== null &&
      !view.readBytes(RUNTIME_INITIALIZATION_PATH, 'initialization receipt').equals(receiptBytes)) ||
    view.fileExists(config.control.coordination_ledger, 'coordination ledger') ||
    (view.fileExists(config.control.work_root, 'work state') &&
      view.listFiles(config.control.work_root, 'work state').length > 0) ||
    ctx.selectedProjects.some((project, i) => ctx.projectDirectoryIdentity(project.root) !== directories[i]?.[1])
  )
    throw new Error('Configuration observations changed during planning');
  for (const item of inventory) {
    const frozen = recoveryJournal?.relocation?.inventory.find((entry) => entry.move.id === item.move.id);
    const fresh = frozen
      ? observeFrozenProjectMove(ctx.canonicalRoot, frozen)
      : captureConsumerProjectMoveInventory(ctx.canonicalRoot, item.move);
    if (JSON.stringify(fresh) !== JSON.stringify(item)) throw new Error('Relocation inventory changed during planning');
  }
  const canonicalRequest = {
    repository: request.repository,
    projects: ctx.selectedProjects,
    team_project_grants: grants,
    ...(moves.length ? { project_moves: moves } : {}),
  };
  const relocationBinding = moves.length
    ? {
        targetPolicy: digest(targetPolicy),
        inventory: inventory.map((item) => ({
          move: item.move,
          rootIdentity: item.rootIdentity,
          destinationIdentity: item.destinationIdentity,
          directories: item.directories,
          files: item.files.map(({ source, destination, identity, sha256 }) => ({
            source,
            destination,
            identity,
            sha256,
          })),
        })),
      }
    : {};
  const binding = digest(
    JSON.stringify({
      canonicalRequest,
      root: ctx.canonicalRoot,
      bundle: ctx.bundle,
      directories,
      before: before.map(digest),
      receipt: receiptBytes && digest(receiptBytes),
      target: digest(target),
      packageBinding,
      ...relocationBinding,
    }),
  );
  const plan: ConsumerConfigurationPlan = {
    schema: 'ConsumerConfigurationPlan/v1',
    request: canonicalRequest,
    operation_id: `config-${binding}`,
    binding,
    changes: {
      added_projects: added.map((entry) => entry.id),
      team_project_grants: grants,
      relocation: moves.length
        ? {
            files: inventory.reduce((n, item) => n + item.files.length, 0),
            directories: inventory.reduce((n, item) => n + item.directories.length, 0),
            source_directories_retained: inventory.reduce((n, item) => n + item.directories.length, 0),
            source_empty_directories_retained: inventory.reduce(
              (n, item) => n + item.directories.filter((dir) => dir.entries.length === 0).length,
              0,
            ),
            projection: 'plan_only',
          }
        : 'none',
    },
  };
  assertRecovery();
  if (
    recovery &&
    (!recoveryJournal ||
      !Buffer.from(target).equals(recovery.target) ||
      plan.binding !== recoveryJournal.binding ||
      plan.operation_id !== recoveryJournal.operation_id ||
      (recoveryJournal.relocation &&
        !Buffer.from(targetPolicy).equals(Buffer.from(recoveryJournal.relocation.policy.target.base64, 'base64'))))
  )
    throw new Error('Recovery target or receipt differs');
  return { plan, targetConfig: target, targetPolicy, relocationInventory: inventory, before, receipt: receiptBytes };
}

export function planConsumerConfiguration(request: ConsumerConfigurationRequest): ConsumerConfigurationPlan {
  return captureConsumerConfiguration(request).plan;
}
