import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import path from 'node:path';
import schema from '../../schemas/documentation-policy.v1.schema.json' with { type: 'json' };
import { freezeJsonValue, rfc3339TimestampMilliseconds } from '../contracts/public-ingress.js';
import { snapshotRuntimeConfig } from '../config/runtime-config.js';

export interface DocumentationPolicy {
  readonly schema: 'DocumentationPolicy/v1';
  readonly policy_id: string;
  readonly project_id: string;
  readonly source_path: string;
  readonly owner: string;
  readonly required: boolean;
  readonly canonical_roots: string[];
  readonly map_paths: string[];
  readonly excluded_roots: string[];
  readonly changelog_required: boolean;
  readonly changelog_path?: string | null;
  readonly relations: string[];
  readonly updated_at: string;
}

type Constructor = new (options: Record<string, unknown>) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const PolicyValidator = Ajv2020 as unknown as Constructor;
const validator = new PolicyValidator({
  strict: true,
  allErrors: false,
  ownProperties: true,
  formats: { 'date-time': true },
}).compile<DocumentationPolicy>(schema);

export function documentationRelativePath(value: string): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('\\') ||
    path.posix.isAbsolute(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..') ||
    /^[A-Za-z]:/u.test(value)
  )
    throw new Error('documentation path is not safe and repository-relative');
  return value;
}

/** Current policy contract only; project admission and selected-project binding remain with the caller. */
export function validateDocumentationPolicy(value: unknown, expectedPath: string): DocumentationPolicy {
  const policy = snapshotRuntimeConfig(value);
  if (!validator(policy)) throw new Error('documentation policy schema invalid');
  if (policy.source_path !== documentationRelativePath(expectedPath))
    throw new Error('documentation policy source path differs from config');
  if (rfc3339TimestampMilliseconds(policy.updated_at) === null)
    throw new Error('documentation policy timestamp invalid');
  for (const key of ['canonical_roots', 'map_paths', 'excluded_roots'] as const)
    policy[key].forEach(documentationRelativePath);
  if (typeof policy.changelog_path === 'string') documentationRelativePath(policy.changelog_path);
  return freezeJsonValue(policy);
}
