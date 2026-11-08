import path from 'node:path';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { isPlainRecord } from '../src/contracts/public-ingress.ts';
import {
  validateSetupInput,
  type CompleteInitInput,
  type LegacyProjectIdMap,
  type SetupInputDraft,
  type SetupInputIssue,
  type SetupInputValidation,
} from './init-product-input.ts';
import { resolveSetupInput, type ResolveSetupInputResult, type SetupPromptPort } from './init-prompt.ts';
import { createTerminalSetupPort } from './init-terminal.ts';
import type { initializeProjectFromBundle } from './init-core.ts';
import type { ConsumerConfigurationRequestV2 } from './init-configuration.ts';

const setupFileSchema = z.strictObject({
  projectRoot: z.unknown().optional(),
  model: z.unknown().optional(),
  reconcile: z.unknown().optional(),
  legacyProjectIdMap: z.unknown().optional(),
});

type SetupFileRefusal = {
  status: 'refused';
  reason: 'invalid_input_file' | 'explicit_value_changed';
  issues: readonly SetupInputIssue[];
};

export class SetupInputError extends Error {
  readonly result: SetupFileRefusal;
  constructor(reason: SetupFileRefusal['reason'], pointer: string, message: string) {
    super(message);
    this.result = { status: 'refused', reason, issues: [{ pointer, message }] };
  }
}

export function readSetupInput(file: string): SetupInputDraft {
  try {
    const absolute = path.resolve(file);
    const bytes = requireSafeRepositoryAccess(path.dirname(absolute)).readCapturedBytes(
      path.basename(absolute),
      'setup input',
      32768,
    );
    const document = parseDocument(new TextDecoder('utf-8', { fatal: true }).decode(bytes), {
      uniqueKeys: true,
      merge: false,
    });
    if (document.errors.length || document.warnings.length) throw Error('Invalid setup document');
    const value: unknown = document.toJS({ maxAliasCount: 0 });
    return setupFileSchema.parse(value);
  } catch {
    throw new SetupInputError(
      'invalid_input_file',
      '/input',
      'Setup input must be a safe JSON/YAML object of at most 32768 bytes with only projectRoot, model, reconcile and legacyProjectIdMap.',
    );
  }
}

export function mergeSetupInput(
  draft: SetupInputDraft,
  explicit: Pick<SetupInputDraft, 'projectRoot' | 'reconcile'>,
): SetupInputDraft {
  const merged = { ...draft };
  for (const key of ['projectRoot', 'reconcile'] as const) {
    const value = explicit[key];
    if (value === undefined) continue;
    if (draft[key] !== undefined && !Object.is(draft[key], value))
      throw new SetupInputError('explicit_value_changed', `/${key}`, 'CLI and setup file values conflict.');
    merged[key] = value;
  }
  return merged;
}

export async function resolveCliSetup(
  draft: SetupInputDraft,
  port?: SetupPromptPort,
): Promise<ResolveSetupInputResult> {
  const validation: SetupInputValidation = validateSetupInput(draft);
  if (validation.status !== 'missing') return validation;
  if (port || !process.stdin.isTTY || !process.stderr.isTTY) return resolveSetupInput(draft, port);
  const terminal = createTerminalSetupPort();
  try {
    return await resolveSetupInput(draft, terminal);
  } finally {
    terminal.close();
  }
}

export function initializationRequestForSetup(
  input: CompleteInitInput,
): Parameters<typeof initializeProjectFromBundle>[0] {
  return {
    projectRoot: input.projectRoot,
    repository: input.model.repository.repository_id,
    projectMappings: input.model.projects.map((project) => `${project.project_id}=${project.project_root}`),
    productModel: input.model,
    reconcileExisting: input.reconcile,
    ...(input.legacyProjectIdMap === undefined ? {} : { legacyProjectIdMap: input.legacyProjectIdMap }),
  };
}

type SetupConfigurationRequest = Omit<ConsumerConfigurationRequestV2, 'legacyProjectIdMap'> & {
  readonly legacyProjectIdMap?: LegacyProjectIdMap;
};

export function configurationRequestForSetup(input: CompleteInitInput): SetupConfigurationRequest {
  return {
    schema: 'ConsumerConfigurationRequest/v2',
    version: 2,
    projectRoot: input.projectRoot,
    repository: input.model.repository.repository_id,
    productModel: input.model,
    ...(input.legacyProjectIdMap === undefined ? {} : { legacyProjectIdMap: input.legacyProjectIdMap }),
  };
}

export function setupExitCode(value: unknown): number | undefined {
  if (!isPlainRecord(value)) return undefined;
  if (value.status === 'cancelled') return 130;
  if (value.status === 'input_required' || value.status === 'refused') return 1;
  return undefined;
}
