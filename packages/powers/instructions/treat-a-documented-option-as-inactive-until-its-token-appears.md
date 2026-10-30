---
instruction_id: treat-a-documented-option-as-inactive-until-its-token-appears
title: Treat a documented option as inactive until its token appears
summary: "An option that is documented is an available behaviour, not an active one: it becomes active only when its literal token appears in the argument block."
capability_tags:
  - detect-the-run-mode
pattern_tags:
  - strict-argument-parsing
conditions_applies_when: A command or a skill documents options that the caller may pass.
conditions_does_not_apply_when: The run was invoked with the option already resolved by the caller.
artifact_contract_output_type: active-option-set
artifact_contract_required_data:
  - the options the caller passed
  - the documented options that stayed inactive
  - the precedence when two of them were passed together
artifact_contract_verified_by: "every option that was acted on has its literal token in the argument block, and a documented but absent option changed nothing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=commands/gsd/docs-update.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=commands/gsd/execute-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=skills/gsd-docs-update/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=skills/gsd-execute-phase/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a documented option as inactive until its token appears
The optional flags documented below are available behaviors, not implied active behaviors
A flag is active only when its literal token appears in the `<arguments>` block
If a documented flag is absent from the `<arguments>` block, treat it as inactive
Do not infer that a flag is active just because it is documented in this prompt
If `--force` and `--verify-only` both appear in the `<arguments>` block, `--force` takes precedence
