import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import checkpointSchema from '../../schemas/documentation-clear-checkpoint.v1.schema.json' with { type: 'json' };
import eventSchema from '../../schemas/documentation-change-event.v1.schema.json' with { type: 'json' };
import policySchema from '../../schemas/documentation-policy.v1.schema.json' with { type: 'json' };
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { loadRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { loadProjectContext, projectBindingFor } from '../config/project-context.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { documentationPolicyTransitionPreimages } from './policy-transition.js';

type RecordValue = Record<string, unknown>;
type Policy = {
  schema: 'DocumentationPolicy/v1';
  policy_id: string;
  project_id: string;
  source_path: string;
  owner: string;
  required: boolean;
  canonical_roots: string[];
  map_paths: string[];
  excluded_roots: string[];
  changelog_required: boolean;
  changelog_path: string | null;
  relations: string[];
  updated_at: string;
};
type DocumentHash = { path: string; sha256: string; size: number };
export type DocumentationClearCheckpoint = {
  schema: 'DocumentationClearCheckpoint/v1';
  clear_id: string;
  work_id: string;
  source_revision: string;
  repository_id: string;
  project_id: string;
  project_context_digest: string;
  config_digest: string;
  scope_digest: string;
  policy_id: string;
  policy_path: string;
  policy_digest: string;
  inventory_digest: string;
  documents: DocumentHash[];
  baseline_path: string | null;
  baseline_digest: string | null;
  phase: 'baseline' | 'closeout';
  status: 'pass' | 'blocked' | 'not_required';
  required: boolean;
  gaps: string[];
  created_at: string;
  digest: string;
};
export type DocumentationClearInput = {
  repository_root: string;
  repository_id: string;
  project_id: string;
  work_id: string;
  source_revision: string;
  scope_paths: string[];
  phase: 'baseline' | 'closeout';
  baseline?: DocumentationClearCheckpoint;
  baseline_path?: string;
  cycle?: number;
};

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const Ajv2020Constructor = Ajv2020 as unknown as new (options?: Record<string, unknown>) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validCheckpoint = new Ajv2020Constructor({ strict: true, allErrors: true }).compile(checkpointSchema as object);
const validEvent = new Ajv2020Constructor({ strict: true, allErrors: true, formats: { 'date-time': true } }).compile(
  eventSchema as object,
);
const digestPattern = /^[a-f0-9]{64}$/u;
const relative = (value: string): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('\\') ||
    path.posix.isAbsolute(value) ||
    value.split('/').some((segment) => !segment || segment === '.' || segment === '..') ||
    /^[A-Za-z]:/u.test(value)
  )
    throw new Error('documentation path is not safe and repository-relative');
  return value;
};
const within = (file: string, root: string): boolean => file === root || file.startsWith(root + '/');
const asRecord = (value: unknown): RecordValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('documentation record invalid');
  return value as RecordValue;
};
const same = (left: unknown, right: unknown): boolean => canonicalJsonDigest(left) === canonicalJsonDigest(right);
function assertCheckpointDigest(value: DocumentationClearCheckpoint): void {
  if (!validCheckpoint(value)) throw new Error('documentation CLEAR checkpoint schema invalid');
  const { digest, ...body } = value;
  if (!digestPattern.test(digest) || canonicalJsonDigest(body) !== digest)
    throw new Error('documentation CLEAR checkpoint digest invalid');
  if (Number.isNaN(Date.parse(value.created_at))) throw new Error('documentation CLEAR checkpoint timestamp invalid');
}

function loadBoundPolicy(
  repositoryRoot: string,
  configuredPath: string,
  repositoryId: string,
  projectId: string,
  configId: string,
): { policy: Policy; digest: string } {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const policyPath = relative(configuredPath);
  const raw = access.readBytes(policyPath, 'project documentation policy');
  const validator = new Ajv2020Constructor({ strict: true, allErrors: true, formats: { 'date-time': true } }).compile(
    policySchema as object,
  );
  const policy = asRecord(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)));
  if (!validator(policy)) throw new Error('documentation policy schema invalid');
  if (policy.source_path !== policyPath) throw new Error('documentation policy source path differs from config');
  const projectIdentities = [projectId, repositoryId, configId];
  if (!projectIdentities.includes(String(policy.project_id)) && !String(policy.project_id).endsWith('/' + projectId))
    throw new Error('documentation policy project identity differs from current project');
  if (Number.isNaN(Date.parse(String(policy.updated_at)))) throw new Error('documentation policy timestamp invalid');
  for (const key of ['canonical_roots', 'map_paths', 'excluded_roots'] as const)
    for (const entry of policy[key] as string[]) relative(entry);
  if (typeof policy.changelog_path === 'string') relative(policy.changelog_path);
  return { policy: policy as Policy, digest: sha256(raw) };
}

function inventory(repositoryRoot: string, policy: Policy): DocumentHash[] {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const paths = new Set<string>([policy.source_path, ...policy.map_paths]);
  const visit = (directory: string): void => {
    const names = access.listFiles(directory, 'documentation inventory').slice().sort();
    for (const name of names) {
      const file = `${directory}/${name}`;
      const stat = lstatSync(path.join(repositoryRoot, file));
      if (stat.isSymbolicLink()) throw new Error('documentation inventory contains a reparse point');
      if (stat.isDirectory()) visit(file);
      else if (stat.isFile()) paths.add(file);
      else throw new Error('documentation inventory contains an unsupported path');
    }
  };
  for (const root of policy.canonical_roots) {
    access.assertDirectory(root, 'documentation canonical root');
    visit(root);
  }
  const documents: DocumentHash[] = [];
  for (const file of [...paths].sort()) {
    if (file === policy.changelog_path || policy.excluded_roots.some((excluded) => within(file, excluded))) continue;
    const bytes = access.readBytes(file, 'documentation inventory file');
    documents.push({ path: file, sha256: sha256(bytes), size: bytes.byteLength });
  }
  return documents;
}

export function produceDocumentationClearCheckpoint(input: DocumentationClearInput): DocumentationClearCheckpoint {
  const config = loadRuntimeConfig(input.repository_root);
  if (config.repository.repository_id !== input.repository_id)
    throw new Error('documentation repository binding invalid');
  const context = loadProjectContext(input.repository_root, config, input.repository_id, input.project_id);
  const project = projectBindingFor(context, input.project_id);
  if (!project) throw new Error('documentation project binding missing');
  const policyPath = project.path_profile.paths.documentation_policy_path;
  const { policy, digest: policyDigest } = loadBoundPolicy(
    input.repository_root,
    policyPath,
    input.repository_id,
    input.project_id,
    config.config_id,
  );
  const scoped = [...new Set(input.scope_paths.map(relative))].sort();
  const governed = scoped.filter((file) =>
    [...policy.canonical_roots, ...policy.map_paths, policy.source_path].some((root) => within(file, root)),
  );
  const documents = inventory(input.repository_root, policy);
  const gaps: string[] = [];
  if (input.phase === 'closeout')
    for (const file of governed)
      if (!documents.some((document) => document.path === file)) gaps.push('GAP-DOCUMENTATION-SCOPE-001');
  const knownPaths = new Set(documents.map((document) => document.path));
  const access = requireSafeRepositoryAccess(input.repository_root);
  for (const mapPath of policy.map_paths) {
    const body = access.readText(mapPath, 'documentation map');
    for (const match of body.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/gu)) {
      const target = match[1]!;
      if (/^[a-z][a-z0-9+.-]*:/iu.test(target) || target.startsWith('#')) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(mapPath), target));
      if (!policy.canonical_roots.some((root) => within(resolved, root))) continue;
      if (resolved === policy.changelog_path || policy.excluded_roots.some((excluded) => within(resolved, excluded))) {
        try {
          access.readBytes(resolved, 'excluded documentation map target');
        } catch {
          gaps.push('GAP-DOCUMENTATION-MAP-001');
        }
        continue;
      }
      if (!knownPaths.has(resolved)) gaps.push('GAP-DOCUMENTATION-MAP-001');
    }
  }
  if (policy.changelog_required && governed.length && !policy.changelog_path)
    gaps.push('GAP-DOCUMENTATION-CHANGELOG-001');
  if (input.phase === 'closeout') {
    let transitionMaps: { path: string; sha256: string; size: number }[] = [];
    if (!input.baseline || !input.baseline_path || input.baseline.phase !== 'baseline')
      gaps.push('GAP-DOCUMENTATION-BASELINE-001');
    else {
      assertCheckpointDigest(input.baseline);
      const currentPolicyBytes = access.readBytes(policyPath, 'current documentation policy');
      transitionMaps = documentationPolicyTransitionPreimages(
        input,
        input.baseline as unknown as RecordValue,
        currentPolicyBytes,
      );
      if (
        input.baseline.work_id !== input.work_id ||
        input.baseline.source_revision !== input.source_revision ||
        input.baseline.project_context_digest !== context.project_context_digest ||
        (input.baseline.policy_digest !== policyDigest && transitionMaps.length === 0) ||
        input.baseline.config_digest !== runtimeConfigDigest(config) ||
        input.baseline.scope_digest !== canonicalJsonDigest(scoped) ||
        Date.parse(input.baseline.created_at) > Date.now()
      )
        gaps.push('GAP-DOCUMENTATION-BASELINE-STALE-001');
    }
    if (input.baseline && policy.changelog_required && policy.changelog_path) {
      const baseline = input.baseline;
      const access = requireSafeRepositoryAccess(input.repository_root);
      const changelog = access.readText(policy.changelog_path, 'documentation changelog').trim();
      const events = changelog ? changelog.split(/\r?\n/u).map((line) => asRecord(JSON.parse(line))) : [];
      if (!events.every(validEvent)) gaps.push('GAP-DOCUMENTATION-CHANGELOG-001');
      const beforeByPath = new Map(baseline.documents.map((entry) => [entry.path, entry]));
      for (const entry of transitionMaps) {
        if (beforeByPath.has(entry.path)) throw new Error('policy transition map was already governed');
        beforeByPath.set(entry.path, { path: entry.path, sha256: entry.sha256, size: entry.size });
      }
      const afterByPath = new Map(documents.map((entry) => [entry.path, entry]));
      for (const file of new Set([...beforeByPath.keys(), ...afterByPath.keys()])) {
        const before = beforeByPath.get(file);
        const after = afterByPath.get(file);
        if (before?.sha256 === after?.sha256) continue;
        if (
          !events.some(
            (event) =>
              event.schema === 'DocumentationChangeEvent/v1' &&
              (after
                ? before
                  ? ['finalize', 'move', 'rename', 'migrate-links'].includes(String(event.operation))
                  : event.operation === 'init'
                : event.operation === 'delete') &&
              event.work_id === input.work_id &&
              event.source_revision === input.source_revision &&
              event.path_before === (before ? file : null) &&
              event.path_after === (after ? file : null) &&
              event.before_sha256 === (before?.sha256 ?? '0'.repeat(64)) &&
              event.after_sha256 === (after?.sha256 ?? '0'.repeat(64)) &&
              typeof event.actor === 'string' &&
              event.actor.length > 0 &&
              typeof event.pointer === 'string' &&
              event.pointer.length > 0 &&
              typeof event.timestamp === 'string' &&
              Date.parse(event.timestamp) >= Date.parse(baseline.created_at),
          )
        )
          gaps.push('GAP-DOCUMENTATION-CHANGELOG-001');
      }
    }
  }
  const required = policy.required;
  const status: DocumentationClearCheckpoint['status'] = gaps.length ? 'blocked' : required ? 'pass' : 'not_required';
  const body = {
    schema: 'DocumentationClearCheckpoint/v1' as const,
    clear_id: `documentation-clear-${input.work_id}-${input.phase}-${String(input.cycle ?? 1).padStart(4, '0')}`,
    work_id: input.work_id,
    source_revision: input.source_revision,
    repository_id: input.repository_id,
    project_id: input.project_id,
    project_context_digest: context.project_context_digest,
    config_digest: runtimeConfigDigest(config),
    scope_digest: canonicalJsonDigest(scoped),
    policy_id: policy.policy_id,
    policy_path: policyPath,
    policy_digest: policyDigest,
    inventory_digest: canonicalJsonDigest(documents),
    documents,
    baseline_path: input.phase === 'closeout' ? relative(input.baseline_path ?? '') : null,
    baseline_digest: input.phase === 'closeout' ? (input.baseline?.digest ?? null) : null,
    phase: input.phase,
    status,
    required,
    gaps: [...new Set(gaps)].sort(),
    created_at: new Date().toISOString(),
  };
  const checkpoint = { ...body, digest: canonicalJsonDigest(body) };
  assertCheckpointDigest(checkpoint);
  return checkpoint;
}

export function validateDocumentationClearCheckpoint(
  checkpoint: DocumentationClearCheckpoint,
  input: Omit<DocumentationClearInput, 'phase' | 'baseline'>,
): DocumentationClearCheckpoint {
  assertCheckpointDigest(checkpoint);
  if (
    Number.isNaN(Date.parse(checkpoint.created_at)) ||
    checkpoint.phase !== 'closeout' ||
    checkpoint.status === 'blocked'
  )
    throw new Error('documentation CLEAR checkpoint is not ready');
  if (!checkpoint.baseline_path || !checkpoint.baseline_digest) throw new Error('documentation baseline missing');
  const cycleMatch = /\/documentation-baseline-(\d{4})\.v1\.json$/u.exec(checkpoint.baseline_path);
  if (!cycleMatch) throw new Error('documentation baseline cycle invalid');
  const access = requireSafeRepositoryAccess(input.repository_root);
  const baseline = JSON.parse(
    access.readText(relative(checkpoint.baseline_path), 'documentation baseline'),
  ) as DocumentationClearCheckpoint;
  assertCheckpointDigest(baseline);
  if (
    baseline.digest !== checkpoint.baseline_digest ||
    Date.parse(baseline.created_at) > Date.parse(checkpoint.created_at)
  )
    throw new Error('documentation baseline binding stale');
  const current = produceDocumentationClearCheckpoint({
    ...input,
    phase: 'closeout',
    baseline,
    baseline_path: checkpoint.baseline_path,
    cycle: Number(cycleMatch[1]),
  });
  for (const key of [
    'clear_id',
    'work_id',
    'source_revision',
    'repository_id',
    'project_id',
    'project_context_digest',
    'config_digest',
    'scope_digest',
    'policy_id',
    'policy_path',
    'policy_digest',
    'inventory_digest',
    'documents',
    'required',
    'status',
    'baseline_path',
    'baseline_digest',
  ] as const)
    if (!same(checkpoint[key], current[key])) throw new Error(`documentation CLEAR ${key} is stale`);
  return checkpoint;
}

export async function executeDocumentationClearOperation(
  input: Omit<DocumentationClearInput, 'phase' | 'baseline' | 'baseline_path'>,
  mode: 'baseline' | 'closeout' | 'verify',
): Promise<{ status: string; path: string; sha256: string; checkpoint_digest: string }> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(input.work_id)) throw new Error('documentation work id invalid');
  const workPath = `.agent/work/${input.work_id}`;
  const access = requireSafeRepositoryAccess(input.repository_root);
  const names = access.listFiles(workPath, 'documentation checkpoint directory');
  const numbers = (phase: 'baseline' | 'closeout'): number[] =>
    names
      .map((name) => new RegExp(`^documentation-${phase}-(\\d{4})\\.v1\\.json$`, 'u').exec(name))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => Number(match[1]));
  const baselines = numbers('baseline');
  const closeouts = numbers('closeout');
  const cycle =
    mode === 'baseline'
      ? Math.max(0, ...baselines) + 1
      : mode === 'closeout'
        ? Math.max(0, ...baselines.filter((number) => !closeouts.includes(number)))
        : Math.max(0, ...closeouts);
  if (cycle < 1 || cycle > 9999) throw new Error('documentation checkpoint cycle missing or exhausted');
  const suffix = String(cycle).padStart(4, '0');
  const baselinePath = `${workPath}/documentation-baseline-${suffix}.v1.json`;
  const closeoutPath = `${workPath}/documentation-closeout-${suffix}.v1.json`;
  if (mode === 'verify') {
    const bytes = access.readBytes(closeoutPath, 'documentation closeout');
    const checkpoint = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as DocumentationClearCheckpoint;
    validateDocumentationClearCheckpoint(checkpoint, input);
    return { status: 'verified', path: closeoutPath, sha256: sha256(bytes), checkpoint_digest: checkpoint.digest };
  }
  const baseline =
    mode === 'closeout'
      ? (JSON.parse(access.readText(baselinePath, 'documentation baseline')) as DocumentationClearCheckpoint)
      : undefined;
  const checkpoint = produceDocumentationClearCheckpoint({
    ...input,
    cycle,
    phase: mode,
    ...(baseline ? { baseline, baseline_path: baselinePath } : {}),
  });
  if (checkpoint.status === 'blocked') throw new Error(`documentation CLEAR blocked: ${checkpoint.gaps.join(', ')}`);
  const target = mode === 'baseline' ? baselinePath : closeoutPath;
  const content = JSON.stringify(checkpoint, null, 2) + '\n';
  const bytes = Buffer.from(content);
  const creator = await access.prepareExclusiveCreation();
  await creator.ensureDirectory('.agent', 'documentation state root');
  await creator.ensureDirectory('.agent/work', 'documentation work root');
  await creator.ensureDirectory(workPath, 'documentation work');
  await creator.writeExclusive(target, content, 'documentation checkpoint');
  return { status: checkpoint.status, path: target, sha256: sha256(bytes), checkpoint_digest: checkpoint.digest };
}

export async function executeDocumentationClearFromWork(
  input: Omit<DocumentationClearInput, 'phase' | 'baseline' | 'baseline_path' | 'scope_paths'>,
  mode: 'baseline' | 'closeout' | 'verify',
): Promise<{ status: string; path: string; sha256: string; checkpoint_digest: string }> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(input.work_id)) throw new Error('documentation work id invalid');
  const access = requireSafeRepositoryAccess(input.repository_root);
  const scope = asRecord(JSON.parse(access.readText(`.agent/work/${input.work_id}/scope.json`, 'accepted work scope')));
  if (
    scope.schema !== 'ImplementationScope/v1' ||
    scope.work_id !== input.work_id ||
    scope.source_revision !== input.source_revision ||
    !Array.isArray(scope.allowed_paths) ||
    !scope.allowed_paths.every((entry) => typeof entry === 'string')
  )
    throw new Error('documentation work scope binding invalid');
  return executeDocumentationClearOperation({ ...input, scope_paths: scope.allowed_paths as string[] }, mode);
}

export function verifyDocumentationClearReference(
  input: Omit<DocumentationClearInput, 'phase' | 'baseline' | 'baseline_path'> & {
    readonly reference_path: string;
    readonly reference_sha256: string;
    readonly reference_id: string;
    readonly expected_cycle: number;
  },
): DocumentationClearCheckpoint {
  const match = new RegExp(`^\\.agent/work/${input.work_id}/documentation-closeout-(\\d{4})\\.v1\\.json$`, 'u').exec(
    input.reference_path,
  );
  if (!match) throw new Error('documentation CLEAR reference path invalid');
  if (Number(match[1]) !== input.expected_cycle) throw new Error('documentation CLEAR reference generation invalid');
  const access = requireSafeRepositoryAccess(input.repository_root);
  const bytes = access.readBytes(input.reference_path, 'documentation CLEAR reference');
  if (sha256(bytes) !== input.reference_sha256) throw new Error('documentation CLEAR reference bytes changed');
  const checkpoint = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(bytes),
  ) as DocumentationClearCheckpoint;
  if (checkpoint.clear_id !== input.reference_id) throw new Error('documentation CLEAR reference identity invalid');
  if (
    checkpoint.baseline_path !== `.agent/work/${input.work_id}/documentation-baseline-${match[1]}.v1.json` ||
    checkpoint.clear_id !== `documentation-clear-${input.work_id}-closeout-${match[1]}`
  )
    throw new Error('documentation CLEAR reference cycle invalid');
  return validateDocumentationClearCheckpoint(checkpoint, input);
}
