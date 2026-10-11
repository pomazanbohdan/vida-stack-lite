import { freezeCliDeclaration } from './cli-command-contracts.ts';

type RunScalarOptionField =
  | 'project_root'
  | 'repository'
  | 'work_path'
  | 'team'
  | 'kind'
  | 'intent'
  | 'workflow'
  | 'work_id'
  | 'attempt'
  | 'scope_digest'
  | 'intake'
  | 'continuation'
  | 'inspect'
  | 'issue_wave'
  | 'recover_expired_lease'
  | 'renew_lease'
  | 'rebind_current_bundle'
  | 'native_session_handle'
  | 'lease_generation'
  | 'report'
  | 'correct'
  | 'prepare_assurance'
  | 'reconcile'
  | 'export_staged_witness'
  | 'payload_manifest_sha256'
  | 'expected_revision'
  | 'expected_digest'
  | 'task_source_operation'
  | 'task_source_request'
  | 'task_source_report';
export const runScalarOptionFields: Readonly<Record<string, RunScalarOptionField>> = freezeCliDeclaration({
  '--project-root': 'project_root',
  '--repository': 'repository',
  '--work-path': 'work_path',
  '--team': 'team',
  '--kind': 'kind',
  '--intent': 'intent',
  '--workflow': 'workflow',
  '--work-id': 'work_id',
  '--attempt': 'attempt',
  '--scope-digest': 'scope_digest',
  '--intake': 'intake',
  '--continuation': 'continuation',
  '--inspect': 'inspect',
  '--issue-wave': 'issue_wave',
  '--recover-expired-lease': 'recover_expired_lease',
  '--renew-lease': 'renew_lease',
  '--rebind-current-bundle': 'rebind_current_bundle',
  '--native-session-handle': 'native_session_handle',
  '--lease-generation': 'lease_generation',
  '--report': 'report',
  '--correct': 'correct',
  '--prepare-assurance': 'prepare_assurance',
  '--reconcile': 'reconcile',
  '--export-staged-witness': 'export_staged_witness',
  '--payload-manifest-sha256': 'payload_manifest_sha256',
  '--expected-revision': 'expected_revision',
  '--expected-digest': 'expected_digest',
  '--task-source-operation': 'task_source_operation',
  '--task-source-request': 'task_source_request',
  '--task-source-report': 'task_source_report',
});
export const runRepeatedOptions = freezeCliDeclaration(['--project', '--scope-path']);
export const runTaskSourceOperations = freezeCliDeclaration(['prepare', 'inspect', 'issue', 'report', 'recover']);

// The selector argv is consumed by run.mjs. These describe the delegated argv
// accepted by the selected handler, in the same selector order used for dispatch.
const specialPathLabels: Readonly<Record<string, string>> = Object.freeze({
  '--project-root': 'ABS',
  '--request': 'REL',
  '--native-session-handle': 'HANDLE',
  '--baseline-config': 'REL',
  '--context-history': 'REL',
});
type SpecialModeContract = {
  selector: string;
  options: string[];
  modes?: string[];
  optional?: string[];
  conflicts?: string[];
};
const specialModeContracts: SpecialModeContract[] = [
  {
    selector: '--continue-initial-source',
    options: ['--mode', '--project-root', '--request'],
    modes: ['inspect', 'apply'],
  },
  {
    selector: '--recover-unprepared-work',
    options: ['--mode', '--project-root', '--native-session-handle', '--request'],
    modes: ['inspect', 'apply'],
  },
  {
    selector: '--recover-completed-source-report',
    options: ['--mode', '--project-root', '--request'],
    modes: ['inspect', 'plan', 'apply'],
    conflicts: ['--report', '--issue-wave'],
  },
  {
    selector: '--transition-failed-prewriter',
    options: ['--mode', '--project-root', '--request'],
    modes: ['inspect', 'apply', 'status'],
  },
  {
    selector: '--recover-failed-prewriter-owner',
    options: ['--mode', '--project-root', '--request'],
    modes: ['inspect', 'apply'],
  },
  {
    selector: '--recovery-review',
    options: ['--mode', '--project-root', '--request'],
    modes: ['prepare', 'begin', 'complete', 'inspect'],
  },
  {
    selector: '--release-historical-owner',
    options: [
      '--mode',
      '--project-root',
      '--native-session-handle',
      '--baseline-config',
      '--request',
      '--context-history',
    ],
    modes: ['inspect', 'apply'],
    optional: ['--context-history'],
  },
  {
    selector: '--resume-historical-normalization',
    options: ['--mode', '--project-root', '--native-session-handle', '--baseline-config', '--request'],
    modes: ['inspect', 'apply', 'resume'],
    conflicts: ['--report', '--issue-wave', '--capture-stopped-source'],
  },
  {
    selector: '--capture-historical-terminal-synthesis',
    options: [
      '--mode',
      '--project-root',
      '--native-session-handle',
      '--baseline-config',
      '--request',
      '--context-history',
    ],
    modes: ['inspect', 'apply', 'resume'],
    optional: ['--context-history'],
    conflicts: ['--report', '--issue-wave', '--capture-stopped-source', '--release-completed-readonly'],
  },
  {
    selector: '--release-unissued-owner',
    options: [
      '--mode',
      '--project-root',
      '--native-session-handle',
      '--baseline-config',
      '--request',
      '--context-history',
    ],
    modes: ['inspect', 'apply'],
    optional: ['--context-history'],
  },
  {
    selector: '--release-settled-research-owner',
    options: [
      '--mode',
      '--project-root',
      '--native-session-handle',
      '--baseline-config',
      '--request',
      '--context-history',
    ],
    modes: ['inspect', 'apply'],
    optional: ['--context-history'],
  },
  {
    selector: '--release-readonly-bookkeeping-owner',
    options: [
      '--mode',
      '--project-root',
      '--native-session-handle',
      '--baseline-config',
      '--request',
      '--context-history',
    ],
    modes: ['inspect', 'apply'],
    optional: ['--context-history'],
  },
  {
    selector: '--retire-interrupted-source-owner',
    options: ['--mode', '--project-root', '--native-session-handle', '--request'],
    modes: ['inspect', 'apply'],
    conflicts: ['--report', '--issue-wave', '--capture-stopped-source', '--release-completed-readonly'],
  },
  {
    selector: '--release-completed-readonly',
    options: ['--mode', '--project-root', '--request'],
    modes: ['inspect', 'plan', 'apply', 'resume'],
    conflicts: ['--report', '--issue-wave', '--capture-stopped-source'],
  },
  {
    selector: '--capture-retired-source',
    options: ['--project-root', '--native-session-handle', '--request'],
    conflicts: [
      '--report',
      '--issue-wave',
      '--capture-stopped-source',
      '--retire-interrupted-source-owner',
      '--release-completed-readonly',
    ],
  },
  {
    selector: '--capture-stopped-source',
    options: ['--mode', '--project-root', '--request'],
    modes: ['inspect', 'plan', 'apply', 'resume'],
    conflicts: ['--report', '--issue-wave'],
  },
];
export const runSpecialModeOptions = freezeCliDeclaration(
  specialModeContracts.map((contract) => ({
    ...contract,
    syntax: `${contract.selector} true ${contract.options
      .map((name) => {
        const argument = `${name} ${name === '--mode' ? (contract.modes?.join('|') ?? 'MODE') : (specialPathLabels[name] ?? 'VALUE')}`;
        return contract.optional?.includes(name) ? `[${argument}]` : argument;
      })
      .join(' ')}`,
  })),
);
export const runSpecialSelectors = freezeCliDeclaration(runSpecialModeOptions.map(({ selector }) => selector));

export const runRequiredFields: readonly RunScalarOptionField[] = freezeCliDeclaration([
  'project_root',
  'repository',
  'work_path',
  'work_id',
  'attempt',
  'team',
  'kind',
  'intent',
  'workflow',
]);
export const runRequirementGroups = freezeCliDeclaration([
  ['--project-root'],
  ['--repository'],
  ['--work-path'],
  ['--work-id'],
  ['--attempt'],
  ['--team'],
  ['--kind'],
  ['--intent'],
  ['--workflow'],
  ['--project'],
  ['--scope-digest', '--scope-path'],
]);
export const runChangingFields: readonly RunScalarOptionField[] = freezeCliDeclaration([
  'issue_wave',
  'report',
  'correct',
  'prepare_assurance',
  'reconcile',
  'recover_expired_lease',
  'renew_lease',
]);
type RunOptionDetail = {
  type: string;
  required?: boolean;
  default?: string;
  values?: readonly string[];
  requiredFor?: string;
  repeatable?: boolean;
};
const runOptionDetailsByField: Readonly<Record<string, RunOptionDetail>> = freezeCliDeclaration({
  project_root: { type: 'canonical absolute path', required: true },
  repository: { type: 'lowercase repository identifier', required: true },
  work_path: { type: 'relative path', required: true },
  team: { type: 'team identifier', required: true },
  kind: { type: 'configured action kind', required: true },
  intent: { type: 'intent text', required: true },
  workflow: { type: 'configured workflow identifier', required: true },
  work_id: { type: 'work identifier', required: true },
  attempt: { type: 'positive safe integer', required: true },
  scope_digest: { type: 'SHA-256 digest' },
  intake: { type: 'canonical absolute path to accepted intake JSON' },
  continuation: { type: 'canonical absolute path to continuation JSON' },
  inspect: { type: 'literal true', default: 'not supplied' },
  issue_wave: { type: 'literal true', default: 'not supplied' },
  recover_expired_lease: { type: 'literal true', default: 'not supplied' },
  renew_lease: { type: 'literal true', default: 'not supplied' },
  rebind_current_bundle: { type: 'literal true', default: 'not supplied' },
  native_session_handle: { type: 'opaque native-session handle' },
  lease_generation: { type: 'positive safe integer' },
  report: { type: 'canonical absolute path' },
  correct: { type: 'canonical absolute path' },
  prepare_assurance: { type: 'canonical absolute path' },
  reconcile: { type: 'canonical absolute path' },
  export_staged_witness: { type: 'repair identifier' },
  payload_manifest_sha256: { type: 'SHA-256 digest' },
  expected_revision: { type: 'positive safe integer' },
  expected_digest: { type: 'SHA-256 digest' },
  task_source_operation: { type: 'enum', values: runTaskSourceOperations, requiredFor: 'task-source mode' },
  task_source_request: { type: 'project-relative path', requiredFor: 'task-source mode' },
  task_source_report: { type: 'project-relative path', requiredFor: 'report operation; forbidden otherwise' },
  projects: { type: 'project identifier', repeatable: true },
  scope_paths: { type: 'project-relative path', repeatable: true },
});

export function runOptionDetails() {
  return [
    ...Object.entries(runScalarOptionFields).map(([name, field]) => ({
      name,
      arity: 1,
      ...(runOptionDetailsByField[field] ?? { type: 'string' }),
    })),
    { name: '--project', arity: 1, ...runOptionDetailsByField.projects },
    { name: '--scope-path', arity: 1, ...runOptionDetailsByField.scope_paths },
  ];
}
