---
instruction_id: keep-a-component-focused-on-one-job
title: Keep a component focused on one job
summary: "A component does one thing, and a component that grows past two hundred lines is split instead of extended."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: A component is being written or grown.
conditions_does_not_apply_when: The component is a single leaf with no behaviour of its own.
artifact_contract_output_type: component-scope
artifact_contract_required_data:
  - the single job of the component
  - the line count
  - the split decision
artifact_contract_verified_by: the component does one thing and no component exceeds the size that triggers a split
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep a component focused on one job

**Keep components focused:**

```tsx
// Good: Does one thing
export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <li className="flex items-center gap-3 p-3">
      <Checkbox checked={task.done} onChange={() => onToggle(task.id)} />
      <span className={task.done ? 'line-through text-muted' : ''}>{task.title}</span>
      <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>
        <TrashIcon />
      </Button>
    </li>
  );
}
```

Components with more than 200 lines (split them)
