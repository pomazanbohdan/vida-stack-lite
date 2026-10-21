---
instruction_id: resolve-the-configuration-in-a-declared-precedence-order
title: Resolve the configuration in a declared precedence order
summary: "The configuration is resolved in one declared order, and a value that cannot be used falls back to the registry default instead of producing a broken number."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A setting can come from more than one place.
conditions_does_not_apply_when: The setting has exactly one source.
artifact_contract_output_type: config-precedence
artifact_contract_required_data:
  - the declared order of the sources
  - the value that is not usable
  - what the fallback is
artifact_contract_verified_by: the setting was resolved in the declared order and an unusable value fell back to the default
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/long-running-operations.md
status: active
revision: 1
---

# Resolve the configuration in a declared precedence order
- **Precedence: env override > nested config value > registry default.**
- a non-numeric config value falls back to the registry default rather than producing `NaN` (no guessing)
