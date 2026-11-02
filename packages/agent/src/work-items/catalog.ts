export const WORK_ITEM_TYPES = Object.freeze([
  Object.freeze({ kind: 'epic', code: 'EPIC' }),
  Object.freeze({ kind: 'feature', code: 'FEATURE' }),
  Object.freeze({ kind: 'pbi', code: 'PBI' }),
  Object.freeze({ kind: 'story', code: 'STORY' }),
  Object.freeze({ kind: 'bug', code: 'BUG' }),
  Object.freeze({ kind: 'task', code: 'TASK' }),
  Object.freeze({ kind: 'research', code: 'RESEARCH' }),
] as const);

export type WorkItemKind = (typeof WORK_ITEM_TYPES)[number]['kind'];
export type WorkItemCode = (typeof WORK_ITEM_TYPES)[number]['code'];
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

const workItemTypeByIdentifier: ReadonlyMap<string, WorkItemType> = new Map(
  WORK_ITEM_TYPES.flatMap((entry) => [
    [entry.kind, entry],
    [entry.code, entry],
  ]),
);

export function getWorkItemType(kindOrCode: string): WorkItemType | undefined {
  return workItemTypeByIdentifier.get(kindOrCode);
}
