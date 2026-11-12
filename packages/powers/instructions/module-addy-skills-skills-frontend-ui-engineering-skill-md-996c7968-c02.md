---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-frontend-ui-engineering-skill-md-996c7968-c02"
title: "addy-skills: skills/frontend-ui-engineering/SKILL.md module"
summary: "Carrier for 3 atomic instructions from addy-skills:skills/frontend-ui-engineering/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/frontend-ui-engineering/SKILL.md\"}"
atom_ids:
  - prefer-composition-over-configuration
  - separate-data-fetching-from-presentation
  - use-the-design-systems-values
atom_count: 3
atoms: "[{\"atom_id\":\"prefer-composition-over-configuration\",\"file_sha256\":\"abcd441aa663611562423a47e0dae9946c1b716595c2b6484c3f4f21425d5924\",\"content_sha256\":\"6bba760f804aca467651074d72fc32df069b2aea4f83563370b92e50a9d95655\",\"file_bytes\":1496,\"body_bytes\":387},{\"atom_id\":\"separate-data-fetching-from-presentation\",\"file_sha256\":\"f306f81e2b2d73cc6dfd53a12f8f4f9deb9ec3c119de5300ae712b513b2cfb17\",\"content_sha256\":\"e7b8c04215ff78016f1e20a6ff03678aa2e7d83fbca578f2326617d90e104a6b\",\"file_bytes\":1810,\"body_bytes\":697},{\"atom_id\":\"use-the-design-systems-values\",\"file_sha256\":\"f4cbbc29765cc7fc4f77b36de3d3cecb5ea06e389284889a09df168e1ec99abe\",\"content_sha256\":\"a384450d29b8b28dc800e7a0d8f07f1ec0eb3c4ba73f0b1b18609604fd30ea15\",\"file_bytes\":2173,\"body_bytes\":1034}]"
carrier_sha256: 7c2f0ac70d202691cf27d82237477b78fd12fad6c60a7ba7eacc319844fa808d
carrier_bytes: 5864
revision: 1
status: active
---
<!-- vpmodule:atom:begin prefer-composition-over-configuration -->
---
instruction_id: prefer-composition-over-configuration
title: Prefer composition over configuration
summary: Build a component from composable children instead of from a growing set of configuration props.
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: A component is being designed or its configuration surface is growing.
conditions_does_not_apply_when: The component has no children and only one presentation.
artifact_contract_output_type: component-shape-decision
artifact_contract_required_data:
  - the composable form
  - the configuration props avoided
  - the children the caller controls
artifact_contract_verified_by: the caller composes the parts instead of describing them through props
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prefer composition over configuration

**Prefer composition over configuration:**

```tsx
// Good: Composable
<Card>
  <CardHeader>
    <CardTitle>Tasks</CardTitle>
  </CardHeader>
  <CardBody>
    <TaskList tasks={tasks} />
  </CardBody>
</Card>

// Avoid: Over-configured
<Card
  title="Tasks"
  headerVariant="large"
  bodyPadding="md"
  content={<TaskList tasks={tasks} />}
/>
```
<!-- vpmodule:atom:end prefer-composition-over-configuration -->
<!-- vpmodule:atom:begin separate-data-fetching-from-presentation -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
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
<!-- vpmodule:atom:end separate-data-fetching-from-presentation -->
<!-- vpmodule:atom:begin use-the-design-systems-values -->
---
instruction_id: use-the-design-systems-values
title: "Use the design system's values"
summary: "Take spacing, type and color from the design system: its scale, its hierarchy, its semantic tokens and its contrast rules."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "A user interface is being built and values must be chosen for spacing, type and color."
conditions_does_not_apply_when: The screen is a placeholder that will be replaced.
artifact_contract_output_type: design-system-values
artifact_contract_required_data:
  - the spacing values used
  - the heading levels used
  - the color tokens used
  - the contrast checked
artifact_contract_verified_by: "no value is invented outside the design system's scale and tokens"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Use the design system's values

## Spacing and Layout

Use a consistent spacing scale. Don't invent values:

```css
/* Use the scale: 0.25rem increments (or whatever the project uses) */
/* Good */  padding: 1rem;      /* 16px */
/* Good */  gap: 0.75rem;       /* 12px */
/* Bad */   padding: 13px;      /* Not on any scale */
/* Bad */   margin-top: 2.3rem; /* Not on any scale */
```

## Typography

Respect the type hierarchy:

```
h1 → Page title (one per page)
h2 → Section title
h3 → Subsection title
body → Default text
small → Secondary/helper text
```

Don't skip heading levels. Don't use heading styles for non-heading content.

## Color

- Use semantic color tokens: `text-primary`, `bg-surface`, `border-default` — not raw hex values
- Ensure sufficient contrast (4.5:1 for normal text, 3:1 for large text)
- Don't rely solely on color to convey information (use icons, text, or patterns too)

Inline styles or arbitrary pixel values

Color as the sole indicator of state (red/green without text or icons)
<!-- vpmodule:atom:end use-the-design-systems-values -->