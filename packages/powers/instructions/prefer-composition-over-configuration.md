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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/frontend-ui-engineering/SKILL.md
status: active
revision: 1
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
