import { getWorkItemType, type WorkItemCode } from './catalog.js';

const PREFIX = /^[A-Z][A-Z0-9]*$/;

export interface WorkItemKeyParts {
  readonly repository_prefix: string;
  readonly project_prefix: string;
  readonly type_code: WorkItemCode;
  readonly number: number;
}

export function formatWorkItemKey(parts: WorkItemKeyParts): string {
  if (!PREFIX.test(parts.repository_prefix) || !PREFIX.test(parts.project_prefix)) {
    throw new TypeError('repository and project prefixes must use the canonical prefix pattern');
  }
  if (!getWorkItemType(parts.type_code) || getWorkItemType(parts.type_code)?.code !== parts.type_code) {
    throw new TypeError('type_code must be a supported uppercase work item code');
  }
  if (!Number.isSafeInteger(parts.number) || parts.number <= 0) {
    throw new RangeError('number must be a positive safe integer');
  }
  return `${parts.repository_prefix}-${parts.project_prefix}-${parts.type_code}-${parts.number}`;
}
