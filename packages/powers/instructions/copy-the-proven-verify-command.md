---
instruction_id: copy-the-proven-verify-command
title: Copy the proven verify command
summary: The check that the neighbouring work already ran is reused verbatim instead of being re-derived.
capability_tags:
  - verify-work-results
pattern_tags:
  - project-conventions-first
conditions_applies_when: A neighbouring piece of work already ran the same kind of check.
conditions_does_not_apply_when: No prior run of the same check exists.
artifact_contract_output_type: reused-verify-command
artifact_contract_required_data:
  - the command that was copied
  - the run it came from
artifact_contract_verified_by: the command was copied verbatim and no path was re-derived
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Copy the proven verify command
They resolved from the executor's cwd in a real run, so a path here is grounded evidence, not a guess.
When this phase's build/test story is the same, copy the command verbatim
Do not re-derive a directory.
