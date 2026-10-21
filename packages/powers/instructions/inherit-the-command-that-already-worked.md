---
instruction_id: inherit-the-command-that-already-worked
title: Inherit the command that already worked
summary: The command a prior phase proved is reused verbatim instead of being re-derived.
capability_tags:
  - verify-work-results
pattern_tags:
  - source-hierarchy
conditions_applies_when: The phase repeats a build or test story that a prior phase already proved.
conditions_does_not_apply_when: The phase tests something no prior phase touched.
artifact_contract_output_type: inherited-command
artifact_contract_required_data:
  - the inherited command
  - the phase that proved it
artifact_contract_verified_by: the command was taken from the prior phase instead of re-derived
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 1
---

# Inherit the command that already worked
When this phase's build or test story is the same one a prior phase already proved, reuse that command verbatim rather than re-deriving a path
Re-invention is what produced `cd ../../frontend && npm run lint` against a directory that holds no `package.json`, and cost two revision cycles
