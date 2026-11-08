import {
  validateSetupInput,
  type CompleteInitInput,
  type SetupInputDraft,
  type SetupInputIssue,
} from './init-product-input.js';

export type SetupPromptRequest =
  | { readonly field: 'projectRoot'; readonly pointer: '/projectRoot'; readonly currentValue?: unknown }
  | {
      readonly field: 'model';
      readonly pointer: '/model';
      readonly missing: readonly string[];
      readonly currentValue?: unknown;
    }
  | { readonly field: 'reconcile'; readonly pointer: '/reconcile'; readonly currentValue?: unknown };

export type SetupPromptResponse = { readonly kind: 'value'; readonly value: unknown } | { readonly kind: 'cancelled' };

export interface SetupPromptPort {
  readonly interactive: boolean;
  prompt(request: SetupPromptRequest): Promise<unknown>;
}

export type ResolveSetupInputResult =
  | { readonly status: 'ready'; readonly input: CompleteInitInput }
  | { readonly status: 'input_required'; readonly missing: readonly string[] }
  | { readonly status: 'cancelled' }
  | {
      readonly status: 'refused';
      readonly reason:
        | 'invalid_project_root'
        | 'invalid_model'
        | 'invalid_legacy_project_id_map'
        | 'invalid_prompt_response'
        | 'explicit_value_changed'
        | 'prompt_failed';
      readonly issues: readonly SetupInputIssue[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function preservesExplicitValues(existing: unknown, completed: unknown): boolean {
  if (existing === undefined) return true;
  if (Array.isArray(existing)) {
    return (
      Array.isArray(completed) &&
      existing.length <= completed.length &&
      existing.every((value, index) => preservesExplicitValues(value, completed[index]))
    );
  }
  if (isRecord(existing)) {
    return (
      isRecord(completed) &&
      Object.keys(existing).every(
        (key) => Object.hasOwn(completed, key) && preservesExplicitValues(existing[key], completed[key]),
      )
    );
  }
  return Object.is(existing, completed);
}

function missingForField(field: SetupPromptRequest['field'], missing: readonly string[]): string[] {
  if (field === 'model') return missing.filter((pointer) => pointer === '/model' || pointer.startsWith('/model/'));
  const pointer = `/${field}`;
  return missing.includes(pointer) ? [pointer] : [];
}

function promptRequest(
  field: SetupPromptRequest['field'],
  draft: SetupInputDraft,
  missing: readonly string[],
): SetupPromptRequest {
  if (field === 'model') {
    return {
      field,
      pointer: '/model',
      missing: missingForField(field, missing),
      ...(draft.model === undefined ? {} : { currentValue: structuredClone(draft.model) }),
    };
  }
  if (field === 'projectRoot') {
    return {
      field,
      pointer: '/projectRoot',
      ...(draft.projectRoot === undefined ? {} : { currentValue: draft.projectRoot }),
    };
  }
  return {
    field,
    pointer: '/reconcile',
    ...(draft.reconcile === undefined ? {} : { currentValue: draft.reconcile }),
  };
}

export async function resolveSetupInput(
  draft: SetupInputDraft,
  port?: SetupPromptPort,
): Promise<ResolveSetupInputResult> {
  let current = draft;
  let validation = validateSetupInput(current);
  if (validation.status === 'ready') return validation;
  if (validation.status === 'refused') return validation;
  if (!port?.interactive) return { status: 'input_required', missing: validation.pointers };

  for (const field of ['projectRoot', 'model', 'reconcile'] as const) {
    validation = validateSetupInput(current);
    if (validation.status === 'ready') return validation;
    if (validation.status === 'refused') return validation;
    if (missingForField(field, validation.pointers).length === 0) continue;

    let response: unknown;
    try {
      response = await port.prompt(promptRequest(field, current, validation.pointers));
    } catch (error) {
      return {
        status: 'refused',
        reason: 'prompt_failed',
        issues: [{ pointer: `/${field}`, message: error instanceof Error ? error.message : 'prompt failed' }],
      };
    }
    if (!isRecord(response) || (response.kind !== 'value' && response.kind !== 'cancelled')) {
      return {
        status: 'refused',
        reason: 'invalid_prompt_response',
        issues: [{ pointer: `/${field}`, message: 'prompt returned an invalid response' }],
      };
    }
    if (response.kind === 'cancelled') return { status: 'cancelled' };
    if (!Object.hasOwn(response, 'value')) {
      return {
        status: 'refused',
        reason: 'invalid_prompt_response',
        issues: [{ pointer: `/${field}`, message: 'prompt value response must include a value' }],
      };
    }

    if (field === 'model' && !preservesExplicitValues(current.model, response.value)) {
      return {
        status: 'refused',
        reason: 'explicit_value_changed',
        issues: [{ pointer: '/model', message: 'prompt completion changed an explicit model value' }],
      };
    }
    current = {
      ...current,
      ...(field === 'projectRoot' ? { projectRoot: response.value } : {}),
      ...(field === 'model' ? { model: response.value } : {}),
      ...(field === 'reconcile' ? { reconcile: response.value } : {}),
    };
  }

  validation = validateSetupInput(current);
  if (validation.status === 'ready') return validation;
  if (validation.status === 'refused') return validation;
  return { status: 'input_required', missing: validation.pointers };
}
