---
instruction_id: never-reuse-a-setting-from-an-unrelated-component
title: Never reuse a setting from an unrelated component
summary: "A component resolves its setting through its own declared key; when it declares none it emits nothing, because a value borrowed from an unrelated component is worse than no value."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A setting is resolved for a component that runs next to other components.
conditions_does_not_apply_when: The component owns the only instance of that setting.
artifact_contract_output_type: resolved-setting
artifact_contract_required_data:
  - the component
  - its own declared key
  - the value it emitted
artifact_contract_verified_by: the value came from the component own key or nothing was emitted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings-advanced.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never reuse a setting from an unrelated component
Effort in particular is never read from an agent's execution settings
A lane that declares no effort emits no argument at all — a value borrowed from an unrelated agent is worse than no value
the resolution order is inspectable rather than implicit
