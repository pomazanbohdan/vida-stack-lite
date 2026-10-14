import path from 'node:path';
import {
  runScalarOptionFields,
  runSpecialSelectors,
  runSpecialModeOptions,
  runTaskSourceOperations,
  runOptionDetails,
  runChangingFields,
  runRequirementGroups,
} from './run-cli-options.ts';
import {
  reconcileCliContracts,
  reconcileKinds,
  reconcileHelp,
  reconcileCommandHelp,
} from './reconcile-cli-contracts.ts';
import {
  cliCommandContracts,
  cliCommandNames,
  cliCommandSet,
  cliHelpSelectorLimits,
  developmentControllerContract,
} from './cli-command-contracts.ts';

export interface CliManifest {
  name?: string;
  version?: string;
  bin?: Record<string, string>;
}

interface CliCommandDetail {
  purpose?: string;
  syntax?: string;
  options?: readonly unknown[];
  conflicts?: string[];
  constraints?: string[];
  example?: string;
}

interface DevelopmentMode {
  syntax: string;
  example: string;
  optionDetails: Array<{ name: string; arity: number | string; type: string; required?: boolean }>;
}

interface HelpRequest {
  command: string;
  canonical: string;
  args: string[];
  nested: string | undefined;
  modes: string[];
}

export const installerProtectedFiles = [
  'package.json',
  'bun.lock',
  '.bun-version',
  'bin/bun.ts',
  'bin/init.ts',
  'bin/install.ts',
];

/** Dispatcher/install-check local modules; the same exact set selects index and archive members. */
export const standaloneDiscoveryFiles = [
  ...installerProtectedFiles,
  'bin/vida-agent.ts',
  'bin/cli-metadata.ts',
  'bin/cli-command-contracts.ts',
  'bin/run-cli-options.ts',
  'bin/reconcile-cli-contracts.ts',
  'bin/cli-error-properties.ts',
  'bin/project-mapping-contract.ts',
  'bunfig.toml',
];

export const commands = cliCommandSet;

const typescriptCommands = new Set([
  'scope',
  'run',
  'documentation-clear',
  'reconcile-artifacts',
  'init',
  'install',
  'development-controller',
]);

/** Select the maintained filename after the caller validates its command allowlist. */
export function cliCommandEntrypoint(command: string): string {
  return command + (typescriptCommands.has(command) ? '.ts' : '.mjs');
}

const commandDetailsByName: Readonly<Record<string, CliCommandDetail>> = cliCommandContracts;
const developmentModes: Readonly<Record<string, DevelopmentMode>> = developmentControllerContract.modes;
const aliasesFor = (manifest: CliManifest) =>
  Object.entries(manifest?.bin ?? {}).map(([name, target]) => ({
    name,
    target,
    command: name === manifest.name ? 'root' : path.basename(target, path.extname(target)),
    primary: name === manifest.name,
  }));
const commandAliasMap = (manifest: CliManifest) =>
  new Map(
    aliasesFor(manifest)
      .filter((alias) => !alias.primary)
      .map((alias) => [alias.name, alias.command]),
  );

function rootHelp(manifest: CliManifest) {
  return {
    schema: 'VidaAgentCommandResult/v1',
    status: 'help',
    commands: cliCommandNames,
    aliases: aliasesFor(manifest),
    globalOptions: [
      {
        name: '--help',
        arity: 0,
        type: 'flag',
        default: false,
        purpose: 'Print command help without loading project configuration or performing effects.',
      },
    ],
    run: {
      options: runOptionDetails(),
      required: runRequirementGroups,
      taskSourceOperations: runTaskSourceOperations,
      nestedSelectors: runSpecialModeOptions,
      conflicts: [
        'Mutation selectors are exclusive and require the expected revision and digest pair.',
        '--scope-path may repeat and may accompany --scope-digest; supported scope derivation uses those paths when --scope-digest is omitted.',
        'Task-source selectors exclude normal run options and accept only their declared fields.',
      ],
      example:
        'vida-agent run --project-root /workspace/project --repository example --project agent --work-path packages/agent --work-id work-example --attempt 1 --scope-digest aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --team team --kind bug_fix --intent FIX_INTENT --workflow develop_fix',
    },
    reconciliation: { kinds: reconcileKinds, details: reconcileCliContracts },
    commandDetails: { ...cliCommandContracts, run: { ...cliCommandContracts.run, options: runOptionDetails() } },
    authority:
      'Scope inspection derives evidence; intake requires actual attributed work, scope and acceptance. Neither grants approval or authenticates native observations.',
  };
}

function availableModesFor(canonical: string, nested: string | undefined) {
  const modes =
    canonical === 'reconcile-artifacts'
      ? Object.keys(reconcileCliContracts)
      : canonical === 'development-controller'
        ? Object.keys(developmentModes)
        : canonical === 'run'
          ? ['task-source', ...runSpecialSelectors]
          : [];
  if (nested && !modes.includes(nested)) throw Error(`unsupported ${canonical} help mode`);
  return modes;
}

function commandOptions(canonical: string, nested: string | undefined) {
  if (canonical === 'run') return runOptionDetails();
  if (canonical !== 'development-controller') return commandDetailsByName[canonical]?.options ?? [];
  if (nested) return developmentModes[nested]?.optionDetails;
  return [
    ...new Map(
      Object.values(developmentModes).flatMap((mode) => mode.optionDetails.map((option) => [option.name, option])),
    ).values(),
  ];
}

function runSelectorHelp(nested: string) {
  const index = runSpecialSelectors.indexOf(nested);
  const detail = runSpecialModeOptions[index];
  if (index < 0 || !detail) throw Error('unsupported run help mode');
  return {
    schema: 'VidaAgentCommandResult/v1',
    status: 'help',
    command: 'run',
    ...detail,
    options: detail.options.map((name) => ({
      name,
      arity: 1,
      type:
        name === '--mode'
          ? 'enum'
          : name === '--project-root'
            ? 'absolute path'
            : name === '--native-session-handle'
              ? 'opaque native-session handle'
              : 'project-relative path',
      ...(name === '--mode' ? { values: detail.modes } : {}),
      required: !detail.optional?.includes(name),
      ...(detail.optional?.includes(name) ? { default: 'not supplied' } : {}),
    })),
    example: `vida-agent run ${detail.syntax
      .replace(/--mode ([^ ]+)/, (_: string, values: string) => `--mode ${values.split('|')[0]}`)
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\bABS\b/g, '/workspace/project')
      .replace(/\bREL\b/g, 'requests/request.json')
      .replace(/\bHANDLE\b/g, 'native-session-example')}`,
  };
}

function taskSourceHelp() {
  return {
    schema: 'VidaAgentCommandResult/v1',
    status: 'help',
    command: 'run',
    mode: 'task-source',
    syntax:
      'vida-agent run --project-root ABS --task-source-operation prepare|inspect|issue|report|recover --task-source-request REL [--task-source-report REL (report only)]',
    options: runOptionDetails().filter((option) =>
      ['--project-root', '--task-source-operation', '--task-source-request', '--task-source-report'].includes(
        option.name,
      ),
    ),
    required: ['--project-root', '--task-source-operation', '--task-source-request'],
    example:
      'vida-agent run --project-root /workspace/project --task-source-operation inspect --task-source-request requests/request.json',
    conditionalRequired: { '--task-source-report': 'required only for report; forbidden otherwise' },
    modes: runTaskSourceOperations,
  };
}

function reconciliationHelp(kind: string, args: string[]) {
  const detail = reconcileHelp(kind, args[2], args[3]);
  if (!detail) throw Error('unsupported reconcile-artifacts kind');
  const mode = args[2];
  const basis = 'basis' in detail ? detail.basis : undefined;
  const syntax = reconciliationHelpSyntax(kind, mode, basis);
  return { schema: 'VidaAgentCommandResult/v1', status: 'help', command: 'reconcile-artifacts', ...detail, syntax };
}

function reconciliationHelpSyntax(kind: string, mode: string | undefined, basis: string | undefined) {
  if (kind === 'runtime-code')
    return basis
      ? `vida-agent reconcile-artifacts --kind runtime-code --basis ${basis} --mode ${mode ?? '<mode>'} <mode options>`
      : 'vida-agent reconcile-artifacts --kind runtime-code [--basis BASIS] --mode MODE';
  if (kind === 'research-records') return `vida-agent reconcile-artifacts --mode ${mode ?? '<mode>'} <mode options>`;
  return `vida-agent reconcile-artifacts --kind ${kind} --mode ${mode ?? '<mode>'} <mode options>`;
}

function reconcileCommandHelpResult(command: string) {
  const details = cliCommandContracts['reconcile-artifacts'];
  const reconcileDetails = reconcileCommandHelp();
  return {
    schema: 'VidaAgentCommandResult/v1',
    status: 'help',
    command: 'reconcile-artifacts',
    ...(command !== 'reconcile-artifacts' ? { alias: command } : {}),
    purpose: details.purpose,
    syntax: details.syntax,
    options: reconcileDetails.optionDetails,
    example: details.example,
    kinds: reconcileDetails.kinds,
    defaultRoute: reconcileDetails.defaultRoute,
    deeperHelp: reconcileDetails.deeperHelp,
  };
}

function reconcileCommandHelpRequest(request: HelpRequest) {
  return request.nested
    ? reconciliationHelp(request.nested, request.args)
    : reconcileCommandHelpResult(request.command);
}

function runHelpFields() {
  return {
    required: runRequirementGroups,
    changingModes: runChangingFields.map(
      (field) => Object.entries(runScalarOptionFields).find(([, value]) => value === field)?.[0],
    ),
    conflicts: [
      'At most one of --issue-wave, --report, --correct, --prepare-assurance, --reconcile, --recover-expired-lease, and --renew-lease may be supplied.',
      'Changing modes require both --expected-revision and --expected-digest; both are forbidden otherwise.',
      '--inspect true conflicts with changing modes, --intake, --continuation, staged-witness export, and --scope-path.',
      'Staged-witness export requires both --export-staged-witness and --payload-manifest-sha256, and conflicts with changing modes, --intake, and --scope-path.',
      '--recover-expired-lease requires --rebind-current-bundle true, --native-session-handle, and --lease-generation; lease owner fields are otherwise limited to renewal or recovery.',
      'Task-source mode accepts only --project-root, --task-source-operation, --task-source-request, and conditionally --task-source-report.',
    ],
    example:
      'vida-agent run --project-root /workspace/project --repository example --project agent --work-path packages/agent --work-id work-example --attempt 1 --scope-digest aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --team team --kind bug_fix --intent FIX_INTENT --workflow develop_fix',
    default: 'No option defaults; all supplied values are explicit.',
  };
}

function commandHelpDetails(
  canonical: string,
  details: CliCommandDetail,
  modeContract: DevelopmentMode | undefined,
  modes: string[],
) {
  const example = modeContract?.example ?? details.example;
  return {
    ...(details.conflicts ? { conflicts: details.conflicts } : {}),
    ...(canonical === 'run' ? runHelpFields() : {}),
    ...(details.constraints ? { constraints: details.constraints } : {}),
    ...(example ? { example } : {}),
    ...(modeContract?.optionDetails ? { optionDetails: modeContract.optionDetails } : {}),
    ...(modes.length ? { modes } : {}),
  };
}

function standardCommandHelp(canonical: string, command: string, nested: string | undefined, modes: string[]) {
  const details = commandDetailsByName[canonical] ?? {};
  const modeContract = canonical === 'development-controller' && nested ? developmentModes[nested] : undefined;
  return {
    schema: 'VidaAgentCommandResult/v1',
    status: 'help',
    command: canonical,
    ...(command !== canonical ? { alias: command } : {}),
    ...(nested ? { mode: nested } : {}),
    purpose: details.purpose,
    syntax: modeContract?.syntax ?? details.syntax,
    options: commandOptions(canonical, nested),
    ...commandHelpDetails(canonical, details, modeContract, modes),
  };
}

function rootHelpResult(argv: string[], manifest: CliManifest) {
  const [command = '', ...args] = argv;
  if (command !== 'help' && command !== '--help') return undefined;
  if (args.length && !(command === 'help' && args.length === 1 && args[0] === '--help'))
    throw Error('help accepts no arguments');
  return rootHelp(manifest);
}

function resolveHelpRequest(argv: string[], manifest: CliManifest) {
  const [command = '', ...args] = argv;
  if (args[0] !== '--help') return undefined;
  const commandAliases = commandAliasMap(manifest);
  const canonical = commandAliases.get(command) ?? command;
  if (!(commands.has(canonical) || canonical === 'instructions' || canonical === 'version')) return undefined;
  if (args.length > 4) throw Error('help accepts at most three nested selectors');
  const selectorLimit =
    cliHelpSelectorLimits.routes[`${canonical}/${args[1]}`] ??
    cliHelpSelectorLimits.commands[canonical] ??
    cliHelpSelectorLimits.default;
  if (args.length > selectorLimit) throw Error(`${canonical} help accepts no surplus selectors`);
  const nested = args[1];
  return { command, canonical, args, nested, modes: availableModesFor(canonical, nested) };
}

function specializedHelp(canonical: string, nested: string | undefined) {
  if (canonical !== 'run' || !nested) return undefined;
  if (nested === 'task-source') return taskSourceHelp();
  return runSelectorHelp(nested);
}

function helpResult(argv: string[], manifest: CliManifest) {
  const root = rootHelpResult(argv, manifest);
  if (root) return root;
  const request = resolveHelpRequest(argv, manifest);
  if (!request) return undefined;
  if (request.canonical === 'reconcile-artifacts') return reconcileCommandHelpRequest(request);
  const special = specializedHelp(request.canonical, request.nested);
  if (special) return special;
  return standardCommandHelp(request.canonical, request.command, request.nested, request.modes);
}

export function cliMetadataResult(argv: string[], manifest: CliManifest) {
  const [command = '', ...args] = argv;
  const help = helpResult(argv, manifest);
  if (help !== undefined) return help;
  if (command === 'version') {
    if (args.length) throw Error('version accepts no arguments');
    return { schema: 'VidaAgentPackage/v1', name: manifest.name, version: manifest.version };
  }
  return null;
}

function cliErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unknown CLI error.';
}

export const cliErrorResult = (error: unknown) => ({
  schema: 'VidaAgentCommandResult/v1',
  status: 'blocked',
  code: 'GAP-VIDA-CLI-001',
  message: cliErrorMessage(error),
});
