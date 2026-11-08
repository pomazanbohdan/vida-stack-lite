import { isAbsolute } from 'node:path';
import { productModelSchema, type ProductModelDefinition } from '../src/config/product-model.js';

export type LegacyProjectIdMap = Readonly<Record<string, string>>;

export interface CompleteInitInput {
  readonly projectRoot: string;
  readonly model: ProductModelDefinition;
  readonly reconcile: boolean;
  readonly legacyProjectIdMap?: LegacyProjectIdMap;
}

export interface SetupInputDraft {
  readonly projectRoot?: unknown;
  readonly model?: unknown;
  readonly reconcile?: unknown;
  readonly legacyProjectIdMap?: unknown;
}

export interface SetupInputIssue {
  readonly pointer: string;
  readonly message: string;
}

export type SetupInputValidation =
  | { readonly status: 'ready'; readonly input: CompleteInitInput }
  | { readonly status: 'missing'; readonly pointers: readonly string[] }
  | {
      readonly status: 'refused';
      readonly reason: 'invalid_project_root' | 'invalid_model' | 'invalid_legacy_project_id_map';
      readonly issues: readonly SetupInputIssue[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonPointer(path: readonly PropertyKey[]): string {
  if (path.length === 0) return '/model';
  return `/model/${path.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
}

function validateLegacyProjectIdMap(
  value: unknown,
  projectIds: ReadonlySet<string> | undefined,
): { readonly value?: LegacyProjectIdMap; readonly issues: readonly SetupInputIssue[] } {
  if (!isRecord(value)) return { issues: [{ pointer: '/legacyProjectIdMap', message: 'must be an object map' }] };
  const entries = Object.entries(value);
  const seenTargets = new Set<string>();
  const normalized: Record<string, string> = {};
  const issues: SetupInputIssue[] = [];
  for (const [legacyId, projectId] of entries) {
    const pointer = `/legacyProjectIdMap/${legacyId.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(legacyId)) {
      issues.push({ pointer, message: 'legacy project id must be a valid identifier' });
      continue;
    }
    if (typeof projectId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(projectId)) {
      issues.push({ pointer, message: 'mapped project id must be a valid identifier' });
      continue;
    }
    if (projectIds && !projectIds.has(projectId)) {
      issues.push({ pointer, message: 'mapped project id must exist in the product model' });
      continue;
    }
    if (seenTargets.has(projectId)) {
      issues.push({ pointer, message: 'mapped project ids must be unique' });
      continue;
    }
    seenTargets.add(projectId);
    normalized[legacyId] = projectId;
  }
  return issues.length > 0 ? { issues } : { value: normalized, issues };
}

export function validateSetupInput(draft: SetupInputDraft): SetupInputValidation {
  const missing = new Set<string>();
  const issues: SetupInputIssue[] = [];
  let projectRoot: string | undefined;
  let model: ProductModelDefinition | undefined;
  let reconcile: boolean | undefined;
  let legacyProjectIdMap: LegacyProjectIdMap | undefined;

  if (draft.projectRoot === undefined) {
    missing.add('/projectRoot');
  } else if (
    typeof draft.projectRoot !== 'string' ||
    !isAbsolute(draft.projectRoot) ||
    /\p{Cc}/u.test(draft.projectRoot)
  ) {
    return {
      status: 'refused',
      reason: 'invalid_project_root',
      issues: [{ pointer: '/projectRoot', message: 'must be an explicit absolute path without control characters' }],
    };
  } else {
    projectRoot = draft.projectRoot;
  }

  if (draft.model === undefined) {
    missing.add('/model');
  } else {
    const parsed = productModelSchema.safeParse(draft.model, { reportInput: true });
    if (parsed.success) {
      model = parsed.data;
    } else {
      let hasInvalidModelIssue = false;
      for (const issue of parsed.error.issues) {
        if (issue.code === 'invalid_type' && issue.input === undefined) {
          missing.add(jsonPointer(issue.path));
        } else if (
          issue.code === 'too_small' &&
          issue.path.length === 1 &&
          issue.path[0] === 'projects' &&
          isRecord(draft.model) &&
          Array.isArray(draft.model.projects) &&
          draft.model.projects.length === 0
        ) {
          missing.add('/model/projects');
        } else {
          hasInvalidModelIssue = true;
          issues.push({ pointer: jsonPointer(issue.path), message: issue.message });
        }
      }
      if (hasInvalidModelIssue) return { status: 'refused', reason: 'invalid_model', issues };
    }
  }

  if (draft.reconcile === undefined) {
    missing.add('/reconcile');
  } else if (typeof draft.reconcile !== 'boolean') {
    return {
      status: 'refused',
      reason: 'invalid_model',
      issues: [{ pointer: '/reconcile', message: 'must be a boolean' }],
    };
  } else {
    reconcile = draft.reconcile;
  }

  if (draft.legacyProjectIdMap !== undefined) {
    const checkedMap = validateLegacyProjectIdMap(
      draft.legacyProjectIdMap,
      model ? new Set(model.projects.map((project) => project.project_id)) : undefined,
    );
    if (checkedMap.issues.length > 0) {
      return { status: 'refused', reason: 'invalid_legacy_project_id_map', issues: checkedMap.issues };
    }
    legacyProjectIdMap = checkedMap.value;
  }

  if (missing.size > 0) return { status: 'missing', pointers: [...missing] };
  if (!projectRoot || !model || reconcile === undefined) {
    return {
      status: 'refused',
      reason: 'invalid_model',
      issues: [{ pointer: '/', message: 'input did not resolve to a complete model' }],
    };
  }
  return {
    status: 'ready',
    input: {
      projectRoot,
      model,
      reconcile,
      ...(legacyProjectIdMap === undefined ? {} : { legacyProjectIdMap }),
    },
  };
}
