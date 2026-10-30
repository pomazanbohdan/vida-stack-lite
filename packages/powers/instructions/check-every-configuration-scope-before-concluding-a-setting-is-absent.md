---
instruction_id: check-every-configuration-scope-before-concluding-a-setting-is-absent
title: Check every configuration scope before concluding a setting is absent
summary: "A global setting does not mean there is no project-scoped one, so every configuration scope is checked before a setting is declared missing."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - source-hierarchy
conditions_applies_when: A configuration value is looked for and not found in one place.
conditions_does_not_apply_when: The scope of the setting is known and only one place can hold it.
artifact_contract_output_type: scope-check
artifact_contract_required_data:
  - the scopes that were checked
  - the scope the value was found in
artifact_contract_verified_by: every scope was checked before the setting was declared absent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/research-verification-protocol.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check every configuration scope before concluding a setting is absent
**Trap:** Assuming global configuration means no project-scoping exists
**Prevention:** Verify ALL configuration scopes (global, project, local, workspace)
