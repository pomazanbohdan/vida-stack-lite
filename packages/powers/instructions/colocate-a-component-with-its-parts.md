---
instruction_id: colocate-a-component-with-its-parts
title: Colocate a component with its parts
summary: "Keep the component, its tests, its stories, its hook and its types in one directory next to each other."
capability_tags:
  - design-user-interface
pattern_tags:
  - structural-design
conditions_applies_when: A component and the files that belong to it are being placed on disk.
conditions_does_not_apply_when: The project keeps a single flat component directory by convention.
artifact_contract_output_type: component-layout
artifact_contract_required_data:
  - the directory of the component
  - the files kept in it
  - the responsibility of each file
artifact_contract_verified_by: the component and everything that belongs to it share one directory
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

# Colocate a component with its parts

Colocate everything related to a component:

```
src/components/
  TaskList/
    TaskList.tsx          # Component implementation
    TaskList.test.tsx     # Tests
    TaskList.stories.tsx  # Storybook stories (if using)
    use-task-list.ts      # Custom hook (if complex state)
    types.ts              # Component-specific types (if needed)
```
