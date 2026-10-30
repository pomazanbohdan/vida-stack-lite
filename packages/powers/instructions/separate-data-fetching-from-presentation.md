---
instruction_id: separate-data-fetching-from-presentation
title: Separate data fetching from presentation
summary: "One part fetches and decides which state to show, the other part only renders the data it is given."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: A component both loads data and renders it.
conditions_does_not_apply_when: The component receives everything it renders from its caller.
artifact_contract_output_type: component-layering
artifact_contract_required_data:
  - the container
  - the presentation component
  - the state the container owns
artifact_contract_verified_by: "the presentation component renders only and the container owns loading, error and empty states"
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
  - design-ux
---

# Separate data fetching from presentation

**Separate data fetching from presentation:**

```tsx
// Container: handles data
export function TaskListContainer() {
  const { tasks, isLoading, error, refetch } = useTasks();

  if (isLoading) return <TaskListSkeleton />;
  if (error) return <ErrorState message="Failed to load tasks" retry={refetch} />;
  if (tasks.length === 0) return <EmptyState message="No tasks yet" />;

  return <TaskList tasks={tasks} />;
}

// Presentation: handles rendering
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul role="list" className="divide-y">
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
}
```
