// Pure declarations shared by the public dispatcher, command parsers, and help.
export function freezeCliDeclaration<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  for (const child of Object.values(value as Record<string, unknown>)) freezeCliDeclaration(child);
  return Object.freeze(value);
}

export const cliCommandContracts = freezeCliDeclaration({
  run: {
    purpose: 'Run an admitted workflow or one supported task-source operation.',
    syntax: 'vida-agent run <option value>...',
    options: [], // Filled from runScalarOptionFields and runRepeatedOptions by cli-metadata.
  },
  init: {
    purpose: 'Initialize a project from the installed VIDA bundle.',
    syntax:
      'vida-agent init [--product-model SETUP_FILE | --input SETUP_FILE] [--project-root ABSOLUTE_PATH] [--reconcile-existing] | --project-root ABSOLUTE_PATH --repository SLUG --project ID=RELATIVE_ROOT [--project ID=RELATIVE_ROOT] [--reconcile-existing]',
    options: [
      { name: '--project-root', arity: 1, type: 'absolute-path' },
      { name: '--repository', arity: 1, type: 'lowercase-slug' },
      { name: '--project', arity: 1, type: 'project-mapping', repeatable: true },
      { name: '--product-model', arity: 1, type: 'setup-json-or-yaml-file' },
      { name: '--input', arity: 1, type: 'setup-json-or-yaml-file' },
      { name: '--reconcile-existing', arity: 0, type: 'flag', default: false },
    ] as const,
    constraints: [
      '--product-model and --input are mutually exclusive names for one setup JSON/YAML file, at most 32768 bytes: {projectRoot, model, reconcile, legacyProjectIdMap?}.',
      'Complete setup input never prompts. Missing values use TTY prompts; without a TTY, input_required is returned before target observation. Invalid or cancelled input has no init effect.',
      'Explicit CLI/file values must agree. Model input cannot be mixed with legacy --repository/--project flags.',
      'Legacy explicit input requires --project-root, --repository and at least one --project; --reconcile-existing retains its existing meaning.',
    ],
    example: 'vida-agent init --product-model /workspace/setup.yaml',
  },
  configure: {
    purpose: 'Plan, inspect, apply, or resume consumer configuration.',
    syntax: 'vida-agent configure plan|inspect|apply|resume <mode options>',
    options: [
      { name: '--project-root', arity: 1, type: 'absolute-path', requiredIn: 'inspect|apply|legacy' },
      { name: '--repository', arity: 1, type: 'lowercase-slug' },
      { name: '--project', arity: 1, type: 'project-mapping', repeatable: true },
      { name: '--allow-project', arity: 1, type: 'team-project-mapping', repeatable: true },
      { name: '--move-project', arity: 1, type: 'project-id=old-root:new-root', repeatable: true },
      { name: '--plan', arity: 1, type: 'public-json-plan-file' },
      { name: '--operation', arity: 1, type: 'operation-id' },
      { name: '--product-model', arity: 1, type: 'setup-json-or-yaml-file' },
      { name: '--input', arity: 1, type: 'setup-json-or-yaml-file' },
      { name: '--adopt-host-present', arity: 1, type: 'true' },
    ],
    constraints: [
      'plan requires --project-root, --repository, and one or more --project; --allow-project and --move-project may repeat.',
      'Alternatively plan/resume use --product-model SETUP_FILE (or mutually exclusive --input) with the same 32768-byte setup DTO as init; complete model input never prompts and missing no-TTY input returns input_required before target observation.',
      'Model input cannot be mixed with --repository/--project; explicit --project-root must agree with the file. Configure uses the model/map; init-only reconcile does not change configure effects.',
      'plan/resume --adopt-host-present true selects strict v3 pending-receipt Host adoption with complete model input. It cannot grant projects or relocate data; apply requires the exact fresh v3 plan and native maintenance.',
      'inspect requires only --project-root.',
      'apply requires --project-root and --plan containing the public JSON plan.',
      'resume requires --project-root, --repository, one or more --project and --operation; repeat --allow-project and --move-project as in the applied plan. Supply project mappings, grants and moves in plan order.',
    ],
    example: 'vida-agent configure plan --project-root /workspace/app --repository example --project app=.',
  },
  'clean-init': {
    purpose: 'Plan and inspect clean initialization, then apply, resume, or retire exact journaled state.',
    syntax: 'vida-agent clean-init plan|inspect|apply|resume|retire <mode options>',
    options: [
      { name: '--project-root', arity: 1, type: 'canonical-absolute-path', required: true },
      { name: '--repository', arity: 1, type: 'repository-id', requiredIn: 'plan|apply' },
      { name: '--project', arity: 1, type: 'project-mapping', repeatable: true, requiredIn: 'plan|apply' },
      { name: '--operation-id', arity: 1, type: 'operation-id', requiredIn: 'apply|resume|retire' },
      { name: '--approve-plan', arity: 1, type: 'sha256-binding', requiredIn: 'apply|resume|retire' },
      { name: '--pending-sha256', arity: 1, type: 'sha256-pending-bytes', requiredIn: 'resume|retire' },
    ],
    constraints: [
      'plan requires --project-root, --repository and one or more --project; it does not publish pending state.',
      'inspect requires only --project-root and is read-only.',
      'apply re-captures the plan by --operation-id and requires exact --approve-plan consent; it journals and verifies each archive/init effect.',
      'resume and retire require exact current pending bytes from inspect plus matching operation id, immutable plan binding and explicit consent.',
      'retire accepts only verified complete state and moves pending metadata to its history record; archive payload is retained.',
    ],
    example:
      'vida-agent clean-init resume --project-root /workspace/app --operation-id UUID --approve-plan SHA256 --pending-sha256 SHA256',
  },
  install: {
    purpose: 'Check installer inputs or install dependencies and initialize a project.',
    syntax:
      'vida-agent install --check | --project-root ABSOLUTE_PATH --repository SLUG --project ID=RELATIVE_ROOT [--project ID=RELATIVE_ROOT]',
    options: [
      { name: '--check', arity: 0, type: 'flag', default: false },
      { name: '--project-root', arity: 1, type: 'canonical-absolute-path', requiredIn: 'initialize' },
      { name: '--repository', arity: 1, type: 'lowercase-slug', requiredIn: 'initialize' },
      { name: '--project', arity: 1, type: 'project-mapping', requiredIn: 'initialize', repeatable: true },
    ],
    conflicts: ['--check excludes all initialization options'],
    example: 'vida-agent install --check',
  },
  'reconcile-artifacts': {
    purpose: 'Inspect, plan, apply, resume, or restore one supported artifact repair.',
    syntax: 'vida-agent reconcile-artifacts [--kind KIND] --mode MODE <mode options>',
    options: [], // Filled from reconcile-cli-contracts by cli-metadata.
    example:
      'vida-agent reconcile-artifacts --kind work-state --mode inspect --project-root /workspace/project --repair-id repair-example',
  },
  'documentation-clear': {
    purpose: 'Run one documentation CLEAR operation for a work item.',
    syntax:
      'vida-agent documentation-clear --mode baseline|closeout|verify --project-root ABS --repository example --project agent --work-id work-example --source-revision aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    options: [
      { name: '--mode', arity: 1, type: 'enum', values: ['baseline', 'closeout', 'verify'], required: true },
      { name: '--project-root', arity: 1, type: 'absolute-path', required: true },
      { name: '--repository', arity: 1, type: 'repository-id', required: true },
      { name: '--project', arity: 1, type: 'project-id', required: true },
      { name: '--work-id', arity: 1, type: 'work-id', required: true },
      { name: '--source-revision', arity: 1, type: 'source-revision', required: true },
    ],
    example:
      'vida-agent documentation-clear --mode verify --project-root ABS --repository example --project agent --work-id work-example --source-revision aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
  scope: {
    purpose: 'Derive a read-only snapshot of declared source paths.',
    syntax:
      'vida-agent scope --project-root ABS --repository ID --project ID --path RELATIVE [--path RELATIVE] [--repository-path SHARED_RELATIVE]',
    options: [
      { name: '--project-root', arity: 1, type: 'absolute-path', required: true },
      { name: '--repository', arity: 1, type: 'repository-id', required: true },
      { name: '--project', arity: 1, type: 'project-id', required: true, repeatable: true },
      { name: '--path', arity: 1, type: 'project-relative-path', required: true, repeatable: true },
      { name: '--repository-path', arity: 1, type: 'shared-relative-path', repeatable: true },
    ],
    constraints: ['A path value may appear only once across --path and --repository-path.'],
    example:
      'vida-agent scope --project-root /workspace/project --repository example --project agent --path packages/agent/src/index.ts',
  },
  'development-controller': {
    purpose: 'Prepare, inspect, verify, or execute through a qualified development controller.',
    syntax: 'vida-agent development-controller prepare|inspect|verify|exec <mode options>',
    options: [], // Filled from developmentControllerContract.
    example: 'vida-agent development-controller inspect --controller-root /workspace/controller',
  },
  instructions: {
    purpose: 'Resolve a package-owned instruction file.',
    syntax: 'vida-agent instructions --path NAME',
    options: [{ name: '--path', arity: 1, type: 'instruction-name', required: true }],
    example: 'vida-agent instructions --path development-lifecycle',
  },
  version: {
    purpose: 'Print the package name and version.',
    syntax: 'vida-agent version',
    options: [],
    example: 'vida-agent version',
  },
  help: {
    purpose: 'List public commands, compatibility aliases, global options, and command help entrypoints.',
    syntax: 'vida-agent help',
    options: [],
    example: 'vida-agent help',
  },
});

export const cliCommandNames = Object.freeze(Object.keys(cliCommandContracts));
/** Internal argument counts include the leading --help selector. */
export const cliHelpSelectorLimits: Readonly<{
  default: number;
  commands: Readonly<Record<string, number>>;
  routes: Readonly<Record<string, number>>;
}> = freezeCliDeclaration({
  default: 1,
  commands: { 'reconcile-artifacts': 3, run: 2, 'development-controller': 2, 'clean-init': 2 },
  routes: { 'reconcile-artifacts/runtime-code': 4 },
});
const cliCommands = new Set(cliCommandNames.filter((name) => !['help', 'instructions', 'version'].includes(name)));
export const cliCommandSet = Object.freeze({ has: (name: string) => cliCommands.has(name) });

export const developmentControllerContract = freezeCliDeclaration({
  modes: Object.freeze({
    prepare: {
      required: ['--target', '--controller-root'],
      options: ['--target', '--controller-root'],
      optionDetails: [
        { name: '--target', arity: 1, type: 'absolute path', required: true },
        { name: '--controller-root', arity: 1, type: 'new absolute path', required: true },
      ],
      syntax: 'prepare --target ABS --controller-root NEW_ABS',
      example:
        'vida-agent development-controller prepare --target /workspace/project --controller-root /workspace/controller',
    },
    inspect: {
      required: ['--controller-root'],
      options: ['--controller-root'],
      optionDetails: [{ name: '--controller-root', arity: 1, type: 'absolute path', required: true }],
      syntax: 'inspect --controller-root ABS',
      example: 'vida-agent development-controller inspect --controller-root /workspace/controller',
    },
    verify: {
      required: ['--controller-root'],
      options: ['--controller-root'],
      optionDetails: [{ name: '--controller-root', arity: 1, type: 'absolute path', required: true }],
      syntax: 'verify --controller-root ABS',
      example: 'vida-agent development-controller verify --controller-root /workspace/controller',
    },
    exec: {
      required: ['--controller-root'],
      options: ['--controller-root', '--', 'COMMAND [COMMAND_ARGS...]'],
      optionDetails: [
        { name: '--controller-root', arity: 1, type: 'absolute path', required: true },
        { name: '--', arity: 0, type: 'separator', required: true },
        {
          name: 'COMMAND [COMMAND_ARGS...]',
          arity: 'variadic',
          type: 'supported command and arguments',
          required: true,
        },
      ],
      syntax: 'exec --controller-root ABS -- COMMAND --project-root EXACT_TARGET ...',
      example:
        'vida-agent development-controller exec --controller-root /workspace/controller -- scope --project-root /workspace/project --repository example --project agent --path packages/agent/src/index.ts',
    },
  }),
  targetCommands: Object.freeze(['run', 'scope', 'init', 'documentation-clear', 'reconcile-artifacts']),
});
