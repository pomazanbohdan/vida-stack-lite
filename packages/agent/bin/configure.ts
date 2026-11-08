import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { productModelSchema } from '../src/config/product-model.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { parseConsumerProjectMoves } from './consumer-project-relocation.ts';
import {
  planConsumerConfiguration,
  type ConsumerConfigurationRequest,
  type VersionedConsumerConfigurationRequest,
} from './init-configuration.ts';
import {
  configurationRequestForSetup,
  mergeSetupInput,
  readSetupInput,
  resolveCliSetup,
  SetupInputError,
  setupExitCode,
} from './init-cli-input.ts';
import { validateSetupInput, type SetupInputDraft } from './init-product-input.ts';
import type { SetupPromptPort } from './init-prompt.ts';
import {
  applyConsumerConfiguration,
  inspectConsumerConfigurationOperation,
  resumeConsumerConfiguration,
} from './consumer-configuration-operation.ts';

type Parsed =
  | { mode: 'inspect'; projectRoot: string }
  | { mode: 'apply'; projectRoot: string; plan: string }
  | ({ mode: 'plan' } & ConsumerConfigurationRequest)
  | ({ mode: 'resume'; operation: string } & ConsumerConfigurationRequest)
  | {
      mode: 'plan' | 'resume';
      setup: { file?: string; projectRoot?: string };
      operation?: string;
      teamProjectGrants: string[];
      projectMoves?: string[];
    };
type Mode = Parsed['mode'];
const repeatableOptions = new Set(['--project', '--allow-project', '--move-project']);
const modeOptions: Record<Mode, readonly string[]> = {
  inspect: ['--project-root'],
  apply: ['--project-root', '--plan'],
  plan: [
    '--project-root',
    '--repository',
    '--project',
    '--allow-project',
    '--move-project',
    '--product-model',
    '--input',
  ],
  resume: [
    '--project-root',
    '--repository',
    '--project',
    '--allow-project',
    '--move-project',
    '--product-model',
    '--input',
    '--operation',
  ],
};

function optionValues(args: readonly string[], mode: Mode): Map<string, string[]> {
  const values = new Map<string, string[]>();
  for (let index = 1; index < args.length; index += 2) {
    const key = args[index],
      value = args[index + 1];
    if (!key || !modeOptions[mode].includes(key) || !value || value.startsWith('--'))
      throw Error('Invalid configure option');
    if (values.has(key) && !repeatableOptions.has(key)) throw Error('Duplicate configure option');
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  return values;
}

function requiredOption(values: Map<string, string[]>, key: string): string {
  const value = values.get(key)?.[0];
  if (value === undefined) throw Error('Missing ' + key);
  return value;
}

function configurationInputFile(values: Map<string, string[]>): string | undefined {
  if (values.has('--product-model') && values.has('--input'))
    throw new SetupInputError('explicit_value_changed', '/input', 'Choose either --product-model or --input.');
  return values.get('--product-model')?.[0] ?? values.get('--input')?.[0];
}

export function configureArguments(args: readonly string[]): Parsed {
  const mode = z.enum(['plan', 'inspect', 'apply', 'resume']).parse(args[0]);
  const values = optionValues(args, mode);
  const projectRoot = values.get('--project-root')?.[0];
  if (projectRoot !== undefined && !path.isAbsolute(projectRoot)) throw Error('Project root must be absolute');
  if (mode === 'inspect') return { mode, projectRoot: requiredOption(values, '--project-root') };
  if (mode === 'apply')
    return { mode, projectRoot: requiredOption(values, '--project-root'), plan: requiredOption(values, '--plan') };
  return configurationRequestArguments(values, mode, projectRoot);
}

function configurationRequestArguments(
  values: Map<string, string[]>,
  mode: 'plan' | 'resume',
  projectRoot?: string,
): Parsed {
  const file = configurationInputFile(values),
    projects = values.get('--project') ?? [];
  const moves = values.get('--move-project');
  const common = {
    teamProjectGrants: values.get('--allow-project') ?? [],
    ...(moves === undefined ? {} : { projectMoves: moves }),
  };
  const operation = mode === 'resume' ? requiredOption(values, '--operation') : undefined;
  if (values.has('--repository') || projects.length) {
    if (file !== undefined)
      throw new SetupInputError(
        'explicit_value_changed',
        '/model',
        'Do not mix legacy repository/project flags with a model input file.',
      );
    const request = { ...legacyConfigurationRequest(values, projects), ...common };
    return mode === 'plan'
      ? { mode, ...request }
      : { mode, ...request, operation: requiredOption(values, '--operation') };
  }
  return {
    mode,
    setup: setupArguments(file, projectRoot),
    ...common,
    ...(operation === undefined ? {} : { operation }),
  };
}

function setupArguments(
  file: string | undefined,
  projectRoot: string | undefined,
): { file?: string; projectRoot?: string } {
  return { ...(file === undefined ? {} : { file }), ...(projectRoot === undefined ? {} : { projectRoot }) };
}

function legacyConfigurationRequest(values: Map<string, string[]>, projects: string[]): ConsumerConfigurationRequest {
  if (!projects.length) throw Error('Missing --project');
  return {
    projectRoot: requiredOption(values, '--project-root'),
    repository: requiredOption(values, '--repository'),
    projectMappings: projects,
  };
}

const nonempty = z.string().min(1);
const mappingPart = nonempty.refine((value) => !value.includes('='));
const projectSchema = z.strictObject({ id: mappingPart, root: mappingPart });
const movePart = nonempty.refine((value) => !/[=:]/.test(value));
const moveSchema = z.strictObject({ id: movePart, oldRoot: movePart, newRoot: movePart });
const planRequestSchema = z.strictObject({
  repository: nonempty,
  projects: z.array(projectSchema).min(1),
  team_project_grants: z.array(nonempty),
  project_moves: z.array(moveSchema).min(1).optional(),
});
const relocationSchema = z.strictObject({
  files: z.number().int().nonnegative(),
  directories: z.number().int().nonnegative(),
  source_directories_retained: z.number().int().nonnegative(),
  source_empty_directories_retained: z.number().int().nonnegative(),
  projection: z.literal('plan_only'),
});
const planFields = {
  binding: z.string().regex(/^[a-f0-9]{64}$/),
  operation_id: nonempty,
  changes: z.strictObject({
    added_projects: z.array(nonempty),
    team_project_grants: z.array(nonempty),
    relocation: z.union([z.literal('none'), relocationSchema]),
  }),
};
const publicPlanSchema = z.discriminatedUnion('schema', [
  z.strictObject({ ...planFields, schema: z.literal('ConsumerConfigurationPlan/v1'), request: planRequestSchema }),
  z.strictObject({
    ...planFields,
    schema: z.literal('ConsumerConfigurationPlan/v2'),
    request: planRequestSchema.extend({
      product_model: productModelSchema,
      legacy_project_id_map: z.record(z.string(), z.string()),
    }),
  }),
]);
type PublicPlan = z.infer<typeof publicPlanSchema>;

function validateRelocation(plan: PublicPlan): string[] | undefined {
  const moves = plan.request.project_moves,
    relocation = plan.changes.relocation;
  if (moves === undefined) {
    if (relocation !== 'none') throw Error('Invalid public configuration plan');
    return undefined;
  }
  if (relocation === 'none') throw Error('Invalid public configuration plan');
  const limit = 10000 * moves.length;
  if (
    relocation.directories < moves.length ||
    relocation.files + relocation.directories > limit ||
    relocation.source_directories_retained !== relocation.directories ||
    relocation.source_empty_directories_retained > relocation.directories
  )
    throw Error('Invalid public configuration plan');
  const current = new Map(plan.request.projects.map((project) => [project.id, project.root]));
  for (const move of moves) current.set(move.id, move.oldRoot);
  const encoded = moves.map((move) => move.id + '=' + move.oldRoot + ':' + move.newRoot);
  parseConsumerProjectMoves(encoded, current, plan.request.projects);
  return encoded;
}

function modelRequestFromPlan(
  plan: Extract<PublicPlan, { schema: 'ConsumerConfigurationPlan/v2' }>,
  projectRoot: string,
): VersionedConsumerConfigurationRequest {
  const checked = validateSetupInput({
    projectRoot,
    model: plan.request.product_model,
    reconcile: false,
    legacyProjectIdMap: plan.request.legacy_project_id_map,
  });
  if (checked.status !== 'ready') throw Error('Invalid public configuration plan');
  const expected = checked.input.model.projects.map((project) => ({
    id: project.project_id,
    root: project.project_root,
  }));
  const sort = (projects: readonly { id: string; root: string }[]) =>
    [...projects].sort((left, right) => left.id.localeCompare(right.id));
  if (
    checked.input.model.repository.repository_id !== plan.request.repository ||
    canonicalJsonDigest(sort(expected)) !== canonicalJsonDigest(sort(plan.request.projects))
  )
    throw Error('Invalid public configuration plan');
  return configurationRequestForSetup(checked.input);
}

export function requestFromPlan(
  value: unknown,
  projectRoot: string,
): { request: VersionedConsumerConfigurationRequest; binding: string; operationId: string } {
  const plan = publicPlanSchema.parse(value);
  if (plan.operation_id !== 'config-' + plan.binding) throw Error('Invalid public configuration plan');
  const projectMoves = validateRelocation(plan);
  const request =
    plan.schema === 'ConsumerConfigurationPlan/v2'
      ? modelRequestFromPlan(plan, projectRoot)
      : {
          projectRoot,
          repository: plan.request.repository,
          projectMappings: plan.request.projects.map((project) => project.id + '=' + project.root),
        };
  return {
    request: {
      ...request,
      teamProjectGrants: plan.request.team_project_grants,
      ...(projectMoves === undefined ? {} : { projectMoves }),
    },
    binding: plan.binding,
    operationId: plan.operation_id,
  };
}

function readPlan(file: string): unknown {
  const absolute = path.resolve(file);
  const bytes = requireSafeRepositoryAccess(path.dirname(absolute)).readCapturedBytes(
    path.basename(absolute),
    'configuration plan',
    32768,
  );
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

async function requestForParsed(parsed: Exclude<Parsed, { mode: 'apply' | 'inspect' }>, port?: SetupPromptPort) {
  if (!('setup' in parsed)) {
    const { mode: _mode, ...request } = parsed;
    if ('operation' in request) {
      const { operation: _operation, ...rest } = request;
      return { status: 'ready' as const, request: rest };
    }
    return { status: 'ready' as const, request };
  }
  const draft: SetupInputDraft = mergeSetupInput(
    parsed.setup.file === undefined ? {} : readSetupInput(parsed.setup.file),
    { projectRoot: parsed.setup.projectRoot },
  );
  const resolved = await resolveCliSetup({ ...draft, reconcile: draft.reconcile ?? false }, port);
  if (resolved.status !== 'ready') return resolved;
  return {
    status: 'ready' as const,
    request: {
      ...configurationRequestForSetup(resolved.input),
      teamProjectGrants: parsed.teamProjectGrants,
      ...(parsed.projectMoves === undefined ? {} : { projectMoves: parsed.projectMoves }),
    },
  };
}

export async function configure(args: readonly string[], port?: SetupPromptPort): Promise<unknown> {
  const parsed = configureArguments(args);
  if (parsed.mode === 'inspect') return inspectConsumerConfigurationOperation(parsed.projectRoot);
  if (parsed.mode === 'apply') {
    const supplied = readPlan(parsed.plan);
    const { request, binding, operationId } = requestFromPlan(supplied, parsed.projectRoot);
    const fresh = planConsumerConfiguration(request);
    if (canonicalJsonDigest(supplied) !== canonicalJsonDigest(fresh)) throw Error('Public configuration plan changed');
    return applyConsumerConfiguration(request, binding, operationId);
  }
  const resolved = await requestForParsed(parsed, port);
  if (resolved.status !== 'ready') return resolved;
  return parsed.mode === 'plan'
    ? planConsumerConfiguration(resolved.request)
    : resumeConsumerConfiguration(resolved.request, z.string().parse(parsed.operation));
}

export async function main(
  args = process.argv.slice(2),
  io: Pick<Console, 'log' | 'error'> = console,
  exit: Pick<NodeJS.Process, 'exitCode'> = process,
  bunRuntime = typeof Bun !== 'undefined',
  run = configure,
): Promise<void> {
  try {
    if (args[0] === '--help') {
      const { cliMetadataResult } = await import('./cli-metadata.ts');
      io.log(JSON.stringify(cliMetadataResult(['configure', ...args], {})));
    } else if (!bunRuntime) {
      const { runPinnedBun } = await import('./bun.ts');
      exit.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...args]);
    } else {
      const result = await run(args);
      io.log(JSON.stringify(result));
      const code = setupExitCode(result);
      if (code !== undefined) exit.exitCode = code;
    }
  } catch (error: unknown) {
    if (error instanceof SetupInputError) io.log(JSON.stringify(error.result));
    else io.error(error instanceof Error ? error.message : 'Configuration failed');
    exit.exitCode = 1;
  }
}

if (import.meta.main) await main();
