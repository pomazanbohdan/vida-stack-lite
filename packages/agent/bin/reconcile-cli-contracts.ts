type ReconcileCliRouteSummaryInput = {
  kind: string;
  mode?: string | undefined;
  basis?: string | undefined;
  options?: string[] | undefined;
  required?: string[] | undefined;
  optional?: string[] | undefined;
  conflicts?: string[] | undefined;
  conditionalGroups?: string[][] | undefined;
  note?: string | undefined;
  example?: string | undefined;
};
import { freezeCliDeclaration } from './cli-command-contracts.ts';

// Pure CLI declarations shared by reconciliation parsers and help rendering.
const common = ['--kind', '--mode', '--project-root'];
const defaultRouteCommon = common.filter((name) => name !== '--kind');
const planning = (extra: string[] = []) => [...common, '--repair-id', '--actor', '--timestamp', ...extra];
const applying = [...common, '--repair-id'];

type ReconcileCliContract = {
  handler?: string;
  modes: string[];
  optionsByMode?: Record<string, string[]>;
  requiredByMode?: Record<string, string[]>;
  optionalByMode?: Record<string, string[]>;
  optionalGroups?: string[][];
  values?: Record<string, string[]>;
  conflicts?: string[];
  note?: string;
  bases?: string[];
  baseOptions?: string[];
  optionsByBasisMode?: Record<string, Record<string, string[]>>;
};
export const reconcileCliContracts: Readonly<Record<string, ReconcileCliContract>> = freezeCliDeclaration({
  'project-upgrade': {
    handler: 'projectUpgrade',
    modes: ['inspect', 'plan', 'apply', 'resume'],
    optionsByMode: {
      inspect: [...common, '--repair-id', '--actor', '--instruction-ref'],
      plan: [...common, '--repair-id', '--actor', '--instruction-ref'],
      apply: [...common, '--repair-id'],
      resume: [...common, '--repair-id', '--reconcile-unknown'],
    },
    requiredByMode: {
      inspect: ['--repair-id', '--actor', '--instruction-ref'],
      plan: ['--repair-id', '--actor', '--instruction-ref'],
      apply: ['--repair-id'],
      resume: ['--repair-id'],
    },
    optionalByMode: { resume: ['--reconcile-unknown'] },
    values: { '--reconcile-unknown': ['true', 'false'] },
    note: 'Fresh storage uses the bundle-owned repair owner. Existing storage remains blocked until old opener exclusion is proved. UNKNOWN permits only exact same-operation afterimage reconciliation.',
  },
  'research-records': {
    modes: ['inspect', 'plan', 'apply', 'resume', 'restore'],
    optionsByMode: {
      inspect: [...defaultRouteCommon, '--repair-id', '--actor', '--timestamp', '--records'],
      plan: [...defaultRouteCommon, '--repair-id', '--actor', '--timestamp', '--records'],
      apply: [...defaultRouteCommon, '--repair-id'],
      resume: [...defaultRouteCommon, '--repair-id'],
      restore: [...defaultRouteCommon, '--repair-id'],
    },
    requiredByMode: {
      inspect: ['--repair-id', '--actor', '--timestamp', '--records'],
      plan: ['--repair-id', '--actor', '--timestamp', '--records'],
      apply: ['--repair-id'],
      resume: ['--repair-id'],
      restore: ['--repair-id'],
    },
    conflicts: ['--actor --timestamp --records are forbidden for apply, resume, and restore'],
  },
  'native-delivery-evidence': {
    handler: 'native',
    modes: ['inspect', 'plan', 'apply', 'resume'],
    optionsByMode: {
      inspect: [...common, '--operation'],
      plan: [...common, '--operation', '--actor'],
      apply: [...common, '--operation'],
      resume: [...common, '--operation'],
    },
    requiredByMode: {
      inspect: ['--operation'],
      plan: ['--operation', '--actor'],
      apply: ['--operation'],
      resume: ['--operation'],
    },
    conflicts: ['--actor is forbidden for inspect, apply, and resume'],
  },
  'delivered-work-continuation': {
    handler: 'delivered',
    modes: ['inspect', 'plan', 'apply', 'resume'],
    optionsByMode: {
      inspect: planning(['--projects', '--work-id', '--attempt', '--action-id']),
      plan: planning(['--projects', '--work-id', '--attempt', '--action-id']),
      apply: applying,
      resume: applying,
    },
    requiredByMode: {
      inspect: ['--repair-id', '--actor', '--timestamp', '--projects', '--work-id', '--attempt', '--action-id'],
      plan: ['--repair-id', '--actor', '--timestamp', '--projects', '--work-id', '--attempt', '--action-id'],
      apply: ['--repair-id'],
      resume: ['--repair-id'],
    },
  },
  'release-retarget': {
    handler: 'retarget',
    modes: ['inspect', 'plan', 'apply', 'resume'],
    optionsByMode: {
      inspect: [...common, '--operation'],
      plan: [...common, '--operation', '--actor'],
      apply: [...common, '--operation'],
      resume: [...common, '--operation'],
    },
    requiredByMode: {
      inspect: ['--operation'],
      plan: ['--operation', '--actor'],
      apply: ['--operation'],
      resume: ['--operation'],
    },
    conflicts: ['--actor is forbidden for inspect, apply, and resume'],
  },
  'release-preparation': {
    handler: 'preparation',
    modes: ['resume'],
    optionsByMode: { resume: common },
    requiredByMode: { resume: [] },
    note: 'This route supports exact resume only; argv must contain exactly --kind, --mode, and --project-root.',
  },
  'work-state': {
    handler: 'workState',
    modes: ['inspect', 'plan', 'apply', 'resume', 'restore'],
    optionsByMode: {
      inspect: [...common, '--repair-id', '--authority'],
      plan: [...common, '--repair-id', '--actor', '--authority'],
      apply: [...common, '--repair-id', '--authority'],
      resume: [...common, '--repair-id', '--authority'],
      restore: [...common, '--repair-id', '--authority'],
    },
    requiredByMode: {
      inspect: [],
      plan: ['--actor'],
      apply: ['--repair-id'],
      resume: ['--repair-id'],
      restore: ['--repair-id'],
    },
    optionalByMode: {
      inspect: ['--repair-id', '--authority'],
      plan: ['--authority'],
      apply: ['--authority'],
      resume: ['--authority'],
      restore: ['--authority'],
    },
    values: { '--authority': ['correction-generation'] },
  },
  'documentation-policy': {
    handler: 'documentationPolicy',
    modes: ['inspect', 'plan', 'apply', 'resume', 'restore'],
    optionsByMode: {
      inspect: [
        ...common,
        '--repository',
        '--project',
        '--work-id',
        '--repair-id',
        '--target-policy',
        '--baseline',
        '--actor',
        '--instruction-ref',
        '--timestamp',
        '--forward-operation',
        '--payload-root',
      ],
      plan: [
        ...common,
        '--repository',
        '--project',
        '--work-id',
        '--repair-id',
        '--target-policy',
        '--baseline',
        '--actor',
        '--instruction-ref',
        '--timestamp',
        '--forward-operation',
        '--payload-root',
      ],
      apply: [
        ...common,
        '--repository',
        '--project',
        '--work-id',
        '--repair-id',
        '--forward-operation',
        '--payload-root',
      ],
      resume: [
        ...common,
        '--repository',
        '--project',
        '--work-id',
        '--repair-id',
        '--forward-operation',
        '--payload-root',
      ],
      restore: [
        ...common,
        '--repository',
        '--project',
        '--work-id',
        '--repair-id',
        '--forward-operation',
        '--payload-root',
      ],
    },
    requiredByMode: {
      inspect: [
        '--repository',
        '--project',
        '--work-id',
        '--repair-id',
        '--target-policy',
        '--baseline',
        '--actor',
        '--instruction-ref',
        '--timestamp',
      ],
      plan: [
        '--repository',
        '--project',
        '--work-id',
        '--repair-id',
        '--target-policy',
        '--baseline',
        '--actor',
        '--instruction-ref',
        '--timestamp',
      ],
      apply: ['--repository', '--project', '--work-id', '--repair-id'],
      resume: ['--repository', '--project', '--work-id', '--repair-id'],
      restore: ['--repository', '--project', '--work-id', '--repair-id'],
    },
    optionalGroups: [['--forward-operation', '--payload-root']],
  },
  'runtime-config': {
    handler: 'runtimeConfig',
    modes: ['inspect', 'plan', 'apply', 'resume', 'restore'],
    optionsByMode: {
      inspect: planning(['--instruction-ref', '--target-config']),
      plan: planning(['--instruction-ref', '--target-config']),
      apply: applying,
      resume: applying,
      restore: applying,
    },
    requiredByMode: {
      inspect: ['--repair-id', '--actor', '--timestamp', '--instruction-ref', '--target-config'],
      plan: ['--repair-id', '--actor', '--timestamp', '--instruction-ref', '--target-config'],
      apply: ['--repair-id'],
      resume: ['--repair-id'],
      restore: ['--repair-id'],
    },
  },
  'runtime-config-delivery': {
    handler: 'runtimeConfig',
    modes: [
      'inspect',
      'plan',
      'apply',
      'resume',
      'restore',
      'repair-inspect',
      'repair-plan',
      'repair-apply',
      'repair-resume',
      'repair-transition',
      'repair-withdraw',
    ],
    optionsByMode: {
      inspect: planning(['--instruction-ref', '--target-config', '--baseline-config']),
      plan: planning(['--instruction-ref', '--target-config', '--baseline-config']),
      apply: applying,
      resume: applying,
      restore: applying,
      'repair-inspect': [
        ...common,
        '--repair-id',
        '--source-beforeimages',
        '--authorized-paths',
        '--prior-system-update',
        '--publish-operation',
      ],
      'repair-plan': [
        ...common,
        '--repair-id',
        '--source-beforeimages',
        '--authorized-paths',
        '--prior-system-update',
        '--publish-operation',
      ],
      'repair-apply': [...common, '--repair-id', '--report'],
      'repair-resume': applying,
      'repair-transition': applying,
      'repair-withdraw': [...common, '--repair-id', '--expected-request'],
    },
    requiredByMode: {
      inspect: ['--repair-id', '--actor', '--timestamp', '--instruction-ref', '--target-config', '--baseline-config'],
      plan: ['--repair-id', '--actor', '--timestamp', '--instruction-ref', '--target-config', '--baseline-config'],
      apply: ['--repair-id'],
      resume: ['--repair-id'],
      restore: ['--repair-id'],
      'repair-inspect': ['--repair-id', '--source-beforeimages', '--authorized-paths', '--prior-system-update'],
      'repair-plan': ['--repair-id', '--source-beforeimages', '--authorized-paths', '--prior-system-update'],
      'repair-apply': ['--repair-id', '--report'],
      'repair-resume': ['--repair-id'],
      'repair-transition': ['--repair-id'],
      'repair-withdraw': ['--repair-id', '--expected-request'],
    },
    optionalByMode: { 'repair-inspect': ['--publish-operation'], 'repair-plan': ['--publish-operation'] },
  },
  'synthesis-qualification': {
    handler: 'synthesisQualification',
    modes: ['inspect', 'plan', 'apply', 'resume'],
    optionsByMode: { inspect: planning(), plan: planning(), apply: applying, resume: applying },
    requiredByMode: {
      inspect: ['--repair-id', '--actor', '--timestamp'],
      plan: ['--repair-id', '--actor', '--timestamp'],
      apply: ['--repair-id'],
      resume: ['--repair-id'],
    },
  },
  'synthesis-observation-correction': {
    handler: 'synthesisObservation',
    modes: ['inspect', 'plan', 'apply', 'resume'],
    optionsByMode: {
      inspect: [
        '--kind',
        '--mode',
        '--project-root',
        '--correction-id',
        '--projects',
        '--work-id',
        '--attempt',
        '--action-id',
        '--issue-id',
        '--native-handle',
        '--owner-correction-pointer',
        '--actor',
        '--timestamp',
      ],
      plan: [
        '--kind',
        '--mode',
        '--project-root',
        '--correction-id',
        '--projects',
        '--work-id',
        '--attempt',
        '--action-id',
        '--issue-id',
        '--native-handle',
        '--owner-correction-pointer',
        '--actor',
        '--timestamp',
      ],
      apply: ['--kind', '--mode', '--project-root', '--correction-id'],
      resume: ['--kind', '--mode', '--project-root', '--correction-id'],
    },
    requiredByMode: {
      inspect: [
        '--correction-id',
        '--projects',
        '--work-id',
        '--attempt',
        '--action-id',
        '--issue-id',
        '--native-handle',
        '--owner-correction-pointer',
        '--actor',
        '--timestamp',
      ],
      plan: [
        '--correction-id',
        '--projects',
        '--work-id',
        '--attempt',
        '--action-id',
        '--issue-id',
        '--native-handle',
        '--owner-correction-pointer',
        '--actor',
        '--timestamp',
      ],
      apply: ['--correction-id'],
      resume: ['--correction-id'],
    },
  },
  'runtime-code': {
    handler: 'runtimeCode',
    modes: ['inspect', 'plan', 'apply', 'resume', 'refresh'],
    bases: [
      'initial-source-frontier',
      'execution-continuation',
      'configured-frontier-continuation',
      'delivered-config-continuation',
      'known-terminal-verify',
      'synthesis-correction',
    ],
    baseOptions: ['--kind', '--basis', '--mode', '--project-root', '--repair-id'],
    optionsByBasisMode: {
      default: {
        inspect: [
          '--kind',
          '--mode',
          '--project-root',
          '--repair-id',
          '--actor',
          '--timestamp',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--issue-id',
          '--native-handle',
          '--forward-operation-id',
          '--owner-no-call-ref',
        ],
        plan: [
          '--kind',
          '--mode',
          '--project-root',
          '--repair-id',
          '--actor',
          '--timestamp',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--issue-id',
          '--native-handle',
          '--forward-operation-id',
          '--owner-no-call-ref',
        ],
        apply: ['--kind', '--mode', '--project-root', '--repair-id'],
        resume: ['--kind', '--mode', '--project-root', '--repair-id'],
      },
      'initial-source-frontier': {
        inspect: [
          '--kind',
          '--basis',
          '--mode',
          '--project-root',
          '--repair-id',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--parent-manifest',
          '--successor-manifest',
          '--system-update',
        ],
        plan: [
          '--kind',
          '--basis',
          '--mode',
          '--project-root',
          '--repair-id',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--parent-manifest',
          '--successor-manifest',
          '--system-update',
        ],
        apply: ['--kind', '--basis', '--mode', '--project-root', '--repair-id'],
      },
      'execution-continuation': {
        inspect: [
          '--kind',
          '--basis',
          '--mode',
          '--project-root',
          '--repair-id',
          '--projects',
          '--work-id',
          '--attempt',
          '--parent-manifest',
          '--parent-install',
          '--successor-manifest',
          '--system-update',
        ],
        plan: [
          '--kind',
          '--basis',
          '--mode',
          '--project-root',
          '--repair-id',
          '--projects',
          '--work-id',
          '--attempt',
          '--parent-manifest',
          '--parent-install',
          '--successor-manifest',
          '--system-update',
        ],
        refresh: [
          '--kind',
          '--basis',
          '--mode',
          '--project-root',
          '--repair-id',
          '--projects',
          '--work-id',
          '--attempt',
          '--parent-manifest',
          '--parent-install',
          '--successor-manifest',
          '--system-update',
          '--expected-request-id',
        ],
        apply: ['--kind', '--basis', '--mode', '--project-root', '--repair-id'],
      },
      'configured-frontier-continuation': {
        inspect: planning([
          '--basis',
          '--projects',
          '--work-id',
          '--attempt',
          '--source-transition-id',
          '--parent-manifest',
          '--successor-manifest',
          '--system-update',
          '--source-correction',
        ]),
        plan: planning([
          '--basis',
          '--projects',
          '--work-id',
          '--attempt',
          '--source-transition-id',
          '--parent-manifest',
          '--successor-manifest',
          '--system-update',
          '--source-correction',
        ]),
        apply: ['--kind', '--basis', '--mode', '--project-root', '--repair-id'],
      },
      'delivered-config-continuation': {
        inspect: planning([
          '--basis',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--issue-id',
          '--native-handle',
          '--forward-operation-id',
          '--owner-no-call-ref',
          '--source-transition-id',
        ]),
        plan: planning([
          '--basis',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--issue-id',
          '--native-handle',
          '--forward-operation-id',
          '--owner-no-call-ref',
          '--source-transition-id',
        ]),
        apply: ['--kind', '--mode', '--project-root', '--repair-id'],
        resume: ['--kind', '--mode', '--project-root', '--repair-id'],
      },
      'known-terminal-verify': {
        inspect: planning([
          '--basis',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--issue-id',
          '--native-handle',
          '--forward-operation-id',
          '--owner-correction-ref',
        ]),
        plan: planning([
          '--basis',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--issue-id',
          '--native-handle',
          '--forward-operation-id',
          '--owner-correction-ref',
        ]),
        apply: ['--kind', '--mode', '--project-root', '--repair-id'],
        resume: ['--kind', '--mode', '--project-root', '--repair-id'],
      },
      'synthesis-correction': {
        inspect: planning([
          '--basis',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--issue-id',
          '--native-handle',
          '--forward-operation-id',
          '--correction-id',
          '--owner-correction-ref',
        ]),
        plan: planning([
          '--basis',
          '--projects',
          '--work-id',
          '--attempt',
          '--action-id',
          '--issue-id',
          '--native-handle',
          '--forward-operation-id',
          '--correction-id',
          '--owner-correction-ref',
        ]),
        apply: ['--kind', '--mode', '--project-root', '--repair-id'],
        resume: ['--kind', '--mode', '--project-root', '--repair-id'],
      },
    },
  },
  'readonly-dispatch': {
    handler: 'readonlyDispatch',
    modes: ['inspect', 'plan', 'apply', 'resume'],
    optionsByMode: {
      inspect: planning(['--projects', '--work-id', '--attempt', '--action-id', '--issue-id', '--native-handle']),
      plan: planning(['--projects', '--work-id', '--attempt', '--action-id', '--issue-id', '--native-handle']),
      apply: applying,
      resume: applying,
    },
    requiredByMode: {
      inspect: [
        '--repair-id',
        '--actor',
        '--timestamp',
        '--projects',
        '--work-id',
        '--attempt',
        '--action-id',
        '--issue-id',
        '--native-handle',
      ],
      plan: [
        '--repair-id',
        '--actor',
        '--timestamp',
        '--projects',
        '--work-id',
        '--attempt',
        '--action-id',
        '--issue-id',
        '--native-handle',
      ],
      apply: ['--repair-id'],
      resume: ['--repair-id'],
    },
  },
});

export const reconcileKinds = Object.freeze(
  Object.keys(reconcileCliContracts).filter((kind) => kind !== 'research-records'),
);

function reconcileOptionNames() {
  const options = Object.values(reconcileCliContracts).flatMap((contract) => [
    ...Object.values(contract.optionsByMode ?? {}).flat(),
    ...Object.values(contract.optionsByBasisMode ?? {}).flatMap((modeSet) => Object.values(modeSet).flat()),
  ]);
  return [...new Set(options)];
}

export function reconcileAllowedOptions(kind: string) {
  const contract = reconcileCliContracts[kind];
  if (!contract) return [];
  return [
    ...new Set([
      ...Object.values(contract.optionsByMode ?? {}).flat(),
      ...Object.values(contract.optionsByBasisMode ?? {}).flatMap((modeSet) => Object.values(modeSet).flat()),
    ]),
  ];
}

function runtimeCodeExpectedOptions(contract: ReconcileCliContract, mode: string, values: Record<string, string>) {
  const byBasis = contract.optionsByBasisMode;
  if (!byBasis) return undefined;
  const basis = values['--basis'];
  const modeOptions = (basis && Object.hasOwn(byBasis, basis) ? byBasis[basis] : byBasis.default)?.[mode];
  return modeOptions ? [...modeOptions] : undefined;
}

function workStateExpectedOptions(
  contract: ReconcileCliContract,
  mode: string,
  values: Record<string, string>,
  options: string[],
) {
  const optional = contract.optionalByMode?.[mode] ?? [];
  return [...options.filter((key) => !optional.includes(key)), ...optional.filter((key) => Object.hasOwn(values, key))];
}

function documentationPolicyExpectedOptions(
  contract: ReconcileCliContract,
  values: Record<string, string>,
  options: string[],
) {
  const hasOptionalGroup = Object.hasOwn(values, '--forward-operation') || Object.hasOwn(values, '--payload-root');
  return hasOptionalGroup ? [...options] : options.filter((key) => !contract.optionalGroups?.flat().includes(key));
}

function runtimeConfigDeliveryExpectedOptions(mode: string, values: Record<string, string>, options: string[]) {
  const repairMode = ['repair-inspect', 'repair-plan'].includes(mode);
  const hasPublishOperation = Object.hasOwn(values, '--publish-operation');
  return repairMode && !hasPublishOperation ? options.filter((key) => key !== '--publish-operation') : [...options];
}

function hasDeclaredOptionalModeOptions(contract: ReconcileCliContract, mode: string) {
  return Boolean(contract.optionalByMode?.[mode]);
}

function modeSpecificExpectedOptions(
  kind: string,
  contract: ReconcileCliContract,
  mode: string,
  values: Record<string, string>,
  options: string[],
) {
  if (hasDeclaredOptionalModeOptions(contract, mode)) return workStateExpectedOptions(contract, mode, values, options);
  if (kind === 'documentation-policy') return documentationPolicyExpectedOptions(contract, values, options);
  if (kind === 'runtime-config-delivery') return runtimeConfigDeliveryExpectedOptions(mode, values, options);
  return [...options];
}

export function reconcileExpectedOptions(kind: string, mode: string | undefined, values: Record<string, string> = {}) {
  const contract = reconcileCliContracts[kind];
  if (!contract || mode === undefined) return undefined;
  if (kind === 'runtime-code') return runtimeCodeExpectedOptions(contract, mode, values);
  const options = contract.optionsByMode?.[mode];
  return options ? modeSpecificExpectedOptions(kind, contract, mode, values, options) : undefined;
}

export function assertReconcileOptionKeys(
  values: Record<string, string>,
  kind: string,
  mode: string | undefined,
  message: string = 'reconciliation option set differs',
) {
  const expected = reconcileExpectedOptions(kind, mode, values);
  if (!expected || JSON.stringify(Object.keys(values).sort()) !== JSON.stringify([...expected].sort()))
    throw new Error(message);
}

const optionTypes: Readonly<Record<string, string>> = freezeCliDeclaration({
  '--kind': 'reconciliation kind',
  '--mode': 'mode enum',
  '--project-root': 'absolute path',
  '--repair-id': 'repair identifier',
  '--actor': 'attribution text',
  '--timestamp': 'RFC3339 timestamp',
  '--records': 'path to record-path JSON',
  '--operation': 'operation identifier',
  '--projects': 'comma-separated project identifiers',
  '--work-id': 'work identifier',
  '--attempt': 'positive integer',
  '--action-id': 'action digest',
  '--issue-id': 'issue identifier',
  '--native-handle': 'opaque native-session handle',
  '--native-session-handle': 'opaque native-session handle',
  '--authority': 'authority enum',
  '--repository': 'repository identifier',
  '--project': 'project identifier',
  '--target-policy': 'path to target policy',
  '--baseline': 'path to baseline',
  '--instruction-ref': 'instruction reference',
  '--forward-operation': 'forward-operation identifier',
  '--payload-root': 'absolute path',
  '--target-config': 'path to target configuration',
  '--baseline-config': 'path to baseline configuration',
  '--correction-id': 'correction identifier',
  '--owner-correction-pointer': 'owner-correction pointer',
  '--expected-request': 'request UUID',
  '--source-beforeimages': 'absolute path',
  '--authorized-paths': 'JSON array of authorized paths',
  '--prior-system-update': 'receipt reference',
  '--publish-operation': 'operation identifier',
  '--report': 'absolute path',
  '--basis': 'runtime-code basis enum',
  '--parent-manifest': 'manifest reference',
  '--parent-install': 'installation reference',
  '--successor-manifest': 'manifest reference',
  '--system-update': 'system-update reference',
  '--source-transition-id': 'transition identifier',
  '--source-correction': 'source-correction reference',
  '--forward-operation-id': 'operation identifier',
  '--owner-no-call-ref': 'owner no-call reference',
  '--owner-correction-ref': 'owner-correction reference',
  '--expected-request-id': 'request identifier',
});
const helpSampleValues: Readonly<Record<string, string>> = freezeCliDeclaration({
  '--project-root': '/workspace/project',
  '--repair-id': 'repair-example',
  '--actor': 'operator',
  '--timestamp': '2026-10-09T00:00:00.000Z',
  '--records': '/workspace/records.json',
  '--operation': 'operation-example',
  '--projects': 'agent',
  '--work-id': 'work-example',
  '--attempt': '1',
  '--action-id': 'a'.repeat(64),
  '--issue-id': 'issue-example',
  '--native-handle': 'native-session-example',
  '--native-session-handle': 'native-session-example',
  '--authority': 'correction-generation',
  '--repository': 'example',
  '--project': 'agent',
  '--target-policy': '/workspace/target-policy.json',
  '--baseline': '.agent/work/work-example/baseline.json',
  '--instruction-ref': 'instruction:example',
  '--forward-operation': 'operation-example',
  '--payload-root': '/workspace/payload',
  '--target-config': '/workspace/target.yaml',
  '--baseline-config': '/workspace/baseline.yaml',
  '--correction-id': 'correction-example',
  '--owner-correction-pointer': 'owner-correction-example',
  '--expected-request': '00000000-0000-4000-8000-000000000000',
  '--source-beforeimages': '/workspace/beforeimages',
  '--authorized-paths': '[]',
  '--prior-system-update': 'receipt-example',
  '--publish-operation': 'publish-example',
  '--report': '/workspace/report.json',
  '--forward-operation-id': 'operation-example',
  '--owner-no-call-ref': 'no-call-example',
  '--owner-correction-ref': 'correction-example',
  '--parent-manifest': 'manifest-example',
  '--parent-install': 'installation-example',
  '--successor-manifest': 'manifest-example',
  '--system-update': 'receipt-example',
  '--source-transition-id': 'transition-example',
  '--source-correction': 'correction-example',
  '--expected-request-id': 'request-example',
});

function reconcileExample(required: string[], kind: string, mode: string) {
  const prefix = `vida-agent reconcile-artifacts${kind === 'research-records' ? '' : ` --kind ${kind}`} --mode ${mode}`;
  return `${prefix}${required
    .filter((name) => !['--kind', '--mode'].includes(name))
    .map((name) => ` ${name} ${helpSampleValues[name] ?? 'VALUE'}`)
    .join('')}`;
}

function reconcileOptionDetails(
  options: string[],
  required: string[],
  optional: string[],
  kind: string,
  modeValues: string[],
  basisValues: string[] = [],
) {
  return options.map((name) => ({
    name,
    arity: 1,
    type: optionTypes[name] ?? 'string',
    ...(name === '--kind' ? { values: [kind] } : {}),
    ...(name === '--mode' ? { values: [...modeValues] } : {}),
    ...(name === '--basis' ? { values: [...basisValues] } : {}),
    ...(reconcileCliContracts[kind]?.values?.[name] ? { values: [...reconcileCliContracts[kind].values[name]] } : {}),
    required: required.includes(name),
    ...(optional.includes(name) ? { default: 'not supplied' } : {}),
  }));
}

function validRuntimeHelpSelection(
  contract: ReconcileCliContract,
  mode: string | undefined,
  basis: string | undefined,
) {
  return (!mode || contract.modes.includes(mode)) && (!basis || contract.bases?.includes(basis));
}

function runtimeHelpModeSet(contract: ReconcileCliContract, basis: string | undefined) {
  const sets = contract.optionsByBasisMode;
  if (!sets) return undefined;
  return (basis ? sets[basis] : undefined) ?? sets.default;
}

function genericRuntimeCodeHelp(kind: string, contract: ReconcileCliContract) {
  return {
    kind,
    purpose: `${kind} artifact reconciliation.`,
    modes: [...contract.modes],
    bases: [...(contract.bases ?? [])],
  };
}

function runtimeCodeHelpDetails(
  kind: string,
  required: string[],
  options: string[],
  modeValues: string[],
  basisValues: string[],
) {
  return options.map((name) => ({
    name,
    arity: 1,
    type: optionTypes[name] ?? 'string',
    required: required.includes(name),
    ...(name === '--mode' ? { values: [...modeValues] } : {}),
    ...(name === '--basis' ? { values: [...basisValues] } : {}),
  }));
}

function runtimeCodeHelpResult(
  kind: string,
  required: string[],
  options: string[],
  modeValues: string[],
  basisValues: string[],
  basis: string | undefined,
  mode: string,
) {
  const details = runtimeCodeHelpDetails(kind, required, options, modeValues, basisValues);
  const samples: Record<string, string | undefined> = {
    ...helpSampleValues,
    '--kind': kind,
    '--basis': basis,
    '--mode': mode,
  };
  const example = `vida-agent reconcile-artifacts${required.map((name) => ` ${name} ${samples[name] ?? 'VALUE'}`).join('')}`;
  return {
    kind,
    purpose: `${kind} artifact reconciliation.`,
    mode,
    ...(basis ? { basis } : {}),
    options: [...options],
    required,
    optional: [],
    optionDetails: details,
    modes: [...modeValues],
    example,
  };
}

function runtimeCodeHelp(
  kind: string,
  contract: ReconcileCliContract,
  mode: string | undefined,
  basis: string | undefined,
) {
  if (!validRuntimeHelpSelection(contract, mode, basis)) return undefined;
  const modeSet = runtimeHelpModeSet(contract, basis);
  if (!modeSet) return undefined;
  const options = mode ? modeSet[mode] : undefined;
  if (basis && mode && !options) return undefined;
  if (!mode || !options) return genericRuntimeCodeHelp(kind, contract);
  const required = options.filter((name) => name !== '--basis' || basis !== undefined);
  const modeValues = Object.keys(modeSet);
  return runtimeCodeHelpResult(kind, required, options, modeValues, contract.bases ?? [], basis, mode);
}

function optionalModeOptions(contract: ReconcileCliContract, mode: string, options: string[]) {
  return [
    ...(contract.optionalByMode?.[mode] ?? []),
    ...(contract.optionalGroups ?? []).flat().filter((name) => options.includes(name)),
  ];
}

function requiredModeOptions(
  kind: string,
  contract: ReconcileCliContract,
  mode: string,
  options: string[],
  optional: string[],
) {
  const common =
    kind === 'research-records' ? ['--mode', '--project-root', '--repair-id'] : ['--kind', '--mode', '--project-root'];
  return [...new Set([...common, ...(contract.requiredByMode?.[mode] ?? [])])].filter(
    (name) => options.includes(name) && !optional.includes(name),
  );
}

function standardReconcileHelpDetails(
  kind: string,
  contract: ReconcileCliContract,
  mode: string,
  basis: string | undefined,
  options: string[],
) {
  const optional = optionalModeOptions(contract, mode, options);
  const required = requiredModeOptions(kind, contract, mode, options, optional);
  const modeValues = Object.keys(contract.optionsByMode ?? {});
  const optionDetails = reconcileOptionDetails(options, required, optional, kind, modeValues, contract.bases);
  return {
    kind,
    purpose: `${kind} artifact reconciliation.`,
    mode,
    ...(basis ? { basis } : {}),
    options: [...options],
    optionDetails,
    required,
    optional,
    conflicts: [...(contract.conflicts ?? [])],
    ...(contract.optionalGroups ? { conditionalGroups: contract.optionalGroups } : {}),
    ...(contract.note ? { note: contract.note } : {}),
    modes: [...contract.modes],
    example: reconcileExample(required, kind, mode),
  };
}

function standardReconcileHelp(
  kind: string,
  contract: ReconcileCliContract,
  mode: string | undefined,
  basis: string | undefined,
) {
  if (mode && !contract.modes.includes(mode)) return undefined;
  const options = mode ? contract.optionsByMode?.[mode] : undefined;
  if (!mode || !options)
    return {
      kind,
      purpose: `${kind} artifact reconciliation.`,
      modes: [...contract.modes],
      ...(contract.bases ? { bases: [...contract.bases] } : {}),
    };
  return standardReconcileHelpDetails(kind, contract, mode, basis, options);
}

export function reconcileHelp(kind: string, mode?: string, basis?: string) {
  const contract = reconcileCliContracts[kind];
  if (!contract) return undefined;
  return kind === 'runtime-code'
    ? runtimeCodeHelp(kind, contract, mode, basis)
    : standardReconcileHelp(kind, contract, mode, basis);
}

function reconcileCommandRoutes(kind: string, contract: ReconcileCliContract) {
  if (kind !== 'runtime-code')
    return contract.modes.flatMap((mode) => {
      const detail = reconcileHelp(kind, mode);
      return detail ? [reconcileRouteSummary(detail)] : [];
    });
  return Object.entries(contract.optionsByBasisMode ?? {}).flatMap(([basis, modes]) =>
    Object.keys(modes).flatMap((mode) => {
      const detail = reconcileHelp(kind, mode, basis === 'default' ? undefined : basis);
      return detail ? [reconcileRouteSummary(detail)] : [];
    }),
  );
}

function reconcileRouteSummary(detail: ReconcileCliRouteSummaryInput) {
  return {
    kind: detail.kind,
    mode: detail.mode,
    ...('basis' in detail && detail.basis ? { basis: detail.basis } : {}),
    ...(detail.options ? { options: detail.options } : {}),
    ...(detail.required ? { required: detail.required } : {}),
    ...(detail.optional ? { optional: detail.optional } : {}),
    ...(detail.conflicts?.length ? { conflicts: detail.conflicts } : {}),
    ...('conditionalGroups' in detail ? { conditionalGroups: detail.conditionalGroups } : {}),
    ...('note' in detail ? { note: detail.note } : {}),
    example: detail.example,
  };
}

/** Build command-level help only from the parser's shared reconcile declarations. */
export function reconcileCommandHelp() {
  const kinds = reconcileKinds.map((kind) => {
    const contract = reconcileCliContracts[kind] as ReconcileCliContract;
    return {
      kind,
      modes: [...contract.modes],
      ...(contract.bases ? { bases: [...contract.bases] } : {}),
      routes: reconcileCommandRoutes(kind, contract),
    };
  });
  const defaultContract = reconcileCliContracts['research-records'] as ReconcileCliContract;
  const options = reconcileOptionNames();
  const modeValues = [...new Set(Object.values(reconcileCliContracts).flatMap((contract) => contract.modes))];
  const basisValues = [...new Set(Object.values(reconcileCliContracts).flatMap((contract) => contract.bases ?? []))];
  const optionDetails = options.map((name) => ({
    name,
    arity: 1,
    type: optionTypes[name] ?? 'string',
    requirement: 'depends on the selected kind and mode',
    ...(name === '--kind' ? { values: [...reconcileKinds] } : {}),
    ...(name === '--mode' ? { values: modeValues } : {}),
    ...(name === '--basis' ? { values: basisValues } : {}),
    ...(() => {
      if (['--kind', '--mode', '--basis'].includes(name)) return {};
      const values = [
        ...new Set(Object.values(reconcileCliContracts).flatMap((contract) => contract.values?.[name] ?? [])),
      ];
      return values.length ? { values } : {};
    })(),
  }));
  return {
    optionDetails,
    kinds,
    defaultRoute: {
      kind: 'research-records',
      modes: [...defaultContract.modes],
      routes: reconcileCommandRoutes('research-records', defaultContract),
      deeperHelp: 'vida-agent reconcile-artifacts --help research-records inspect',
    },
    deeperHelp: 'vida-agent reconcile-artifacts --help KIND MODE [BASIS]',
  };
}
