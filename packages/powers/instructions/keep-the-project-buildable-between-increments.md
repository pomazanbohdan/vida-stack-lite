---
instruction_id: keep-the-project-buildable-between-increments
title: Keep the project buildable between increments
summary: After every increment the project must build and the existing tests must pass; never leave the codebase broken between slices.
capability_tags:
  - execute-plan
pattern_tags:
  - verification-before-completion
conditions_applies_when: Work is delivered as a sequence of increments.
conditions_does_not_apply_when: The work is a single change that is checked once at the end.
artifact_contract_output_type: green-build-state
artifact_contract_required_data:
  - the build result after the increment
  - the existing test result after the increment
artifact_contract_verified_by: the build succeeds and the existing tests pass at the end of every increment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the project buildable between increments

After each increment, the project must build and existing tests must pass. Don't leave the codebase in a broken state between slices.
