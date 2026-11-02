import { z } from 'zod';
import { getWorkItemType, WORK_ITEM_TYPES, type WorkItemCode } from '../work-items/catalog.js';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const PREFIX_PATTERN = /^[A-Z][A-Z0-9]*$/;

function normalizeSafeRelativePath(value: string): string | undefined {
  if (
    !value ||
    /\p{Cc}/u.test(value) ||
    /[<>"|?*]/.test(value) ||
    value.includes('\\') ||
    /^[A-Za-z]:/.test(value) ||
    value.startsWith('/')
  ) {
    return undefined;
  }
  const parts = value === '.' ? [] : value.split('/');
  const unsafeSegment = (segment: string): boolean =>
    !segment ||
    segment === '..' ||
    segment.toLowerCase() === '.git' ||
    segment.includes(':') ||
    /[. ]$/.test(segment) ||
    /~[0-9]+(?:[.][^/]*)?$/i.test(segment) ||
    /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9\u00B9\u00B2\u00B3]|lpt[1-9\u00B9\u00B2\u00B3])(?:\..*)?$/i.test(
      segment,
    );
  if (parts.some(unsafeSegment)) return undefined;
  return parts.join('/') || '.';
}

const safeRelativePathSchema = z
  .string()
  .min(1)
  .transform((value, context) => {
    const normalized = normalizeSafeRelativePath(value);
    if (normalized === undefined) {
      context.addIssue({ code: 'custom', message: 'must be a safe repository-relative path' });
      return value;
    }
    return normalized;
  });

const identifierSchema = z.string().regex(ID_PATTERN);
const prefixSchema = z.string().regex(PREFIX_PATTERN);
const nonemptyStringSchema = z.string().min(1);
const workItemCodeSchema = z
  .string()
  .refine(
    (value): value is WorkItemCode => WORK_ITEM_TYPES.some((entry) => entry.code === value),
    'must be a canonical work item code',
  );

const uniqueArray = <T extends z.ZodType>(schema: T) =>
  z.array(schema).superRefine((values, context) => {
    const seen = new Set<z.output<T>>();
    values.forEach((value, index) => {
      if (seen.has(value)) context.addIssue({ code: 'custom', path: [index], message: 'duplicate entry' });
      seen.add(value);
    });
  });

const hierarchySchema = z.union([
  z.strictObject({ mode: z.literal('any') }),
  z.strictObject({
    mode: z.literal('custom'),
    allowed_children: z.record(z.string(), uniqueArray(workItemCodeSchema)),
  }),
]);

const requirementsAreaSchema = z.strictObject({
  business: safeRelativePathSchema,
  system: safeRelativePathSchema,
  acceptance: safeRelativePathSchema,
  test_cases: safeRelativePathSchema,
});

const productSchema = z
  .strictObject({
    project_id: identifierSchema,
    title: nonemptyStringSchema,
    prefix: prefixSchema,
    project_root: safeRelativePathSchema,
    code_selectors: z.array(nonemptyStringSchema),
    documents: z.strictObject({
      root: safeRelativePathSchema,
      index: safeRelativePathSchema,
      requirements: z.strictObject({
        root: safeRelativePathSchema,
        areas: z.record(identifierSchema, requirementsAreaSchema),
      }),
      research: safeRelativePathSchema,
      decisions: safeRelativePathSchema,
    }),
    work_items: z.strictObject({
      storage_root: safeRelativePathSchema,
      enabled_types: uniqueArray(workItemCodeSchema),
      hierarchy: hierarchySchema,
    }),
  })
  .superRefine((product, context) => {
    const result = validateProductHierarchy(product.work_items.hierarchy, product.work_items.enabled_types);
    if (!result.ok) {
      result.issues.forEach((issue) =>
        context.addIssue({
          code: 'custom',
          path: ['work_items', ...issue.path.split('.').filter(Boolean)],
          message: issue.message,
        }),
      );
    }
  });

export const productModelSchema = z
  .strictObject({
    schema: z.literal('ProductModel/v1'),
    version: z.literal(1),
    repository: z.strictObject({ repository_id: identifierSchema, prefix: prefixSchema }),
    projects: z.array(productSchema).min(1),
  })
  .superRefine((model, context) => {
    const ids = new Set<string>();
    const prefixes = new Set<string>();
    model.projects.forEach((project, index) => {
      if (ids.has(project.project_id))
        context.addIssue({ code: 'custom', path: ['projects', index, 'project_id'], message: 'duplicate project_id' });
      ids.add(project.project_id);
      if (prefixes.has(project.prefix))
        context.addIssue({ code: 'custom', path: ['projects', index, 'prefix'], message: 'duplicate prefix' });
      prefixes.add(project.prefix);
    });
  });

export type ProductModelDefinition = z.infer<typeof productModelSchema>;
export type ProductDefinition = ProductModelDefinition['projects'][number];
export type ProductHierarchyPolicy = z.infer<typeof hierarchySchema>;

export type HierarchyValidationResult =
  | { readonly ok: true; readonly value: ProductHierarchyPolicy }
  | { readonly ok: false; readonly issues: readonly { readonly path: string; readonly message: string }[] };

export function validateProductHierarchy(policy: unknown, enabledTypes: readonly string[]): HierarchyValidationResult {
  const issues: { path: string; message: string }[] = [];
  const enabled = new Set<string>();
  enabledTypes.forEach((code, index) => {
    if (!getWorkItemType(code) || !WORK_ITEM_TYPES.some((entry) => entry.code === code)) {
      issues.push({ path: `enabled_types.${index}`, message: `unknown work item code: ${code}` });
    }
    if (enabled.has(code)) issues.push({ path: `enabled_types.${index}`, message: `duplicate enabled type: ${code}` });
    enabled.add(code);
  });
  const parsed = hierarchySchema.safeParse(policy);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({ path: ['hierarchy', ...issue.path.map(String)].join('.'), message: issue.message });
    }
    return { ok: false, issues };
  }
  if (parsed.data.mode === 'custom') {
    for (const [parent, children] of Object.entries(parsed.data.allowed_children)) {
      if (!WORK_ITEM_TYPES.some((entry) => entry.code === parent)) {
        issues.push({ path: `hierarchy.allowed_children.${parent}`, message: `unknown parent code: ${parent}` });
      } else if (!enabled.has(parent)) {
        issues.push({ path: `hierarchy.allowed_children.${parent}`, message: `parent code is not enabled: ${parent}` });
      }
      children.forEach((child, index) => {
        if (!enabled.has(child)) {
          issues.push({
            path: `hierarchy.allowed_children.${parent}.${index}`,
            message: `child code is not enabled: ${child}`,
          });
        }
      });
    }
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: parsed.data };
}

export function isChildTypeAllowed(
  policy: unknown,
  enabledTypes: readonly string[],
  parentCode: string,
  childCode: string,
): boolean {
  const validation = validateProductHierarchy(policy, enabledTypes);
  if (!validation.ok || !enabledTypes.includes(parentCode) || !enabledTypes.includes(childCode)) return false;
  if (validation.value.mode === 'any') return true;
  const parentType = getWorkItemType(parentCode);
  const childType = getWorkItemType(childCode);
  if (!parentType || parentType.code !== parentCode || !childType || childType.code !== childCode) return false;
  return validation.value.allowed_children[parentType.code]?.includes(childType.code) ?? false;
}
