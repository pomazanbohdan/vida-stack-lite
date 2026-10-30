---
instruction_id: reuse-the-verification-command-a-prior-phase-proved
title: Reuse the verification command a prior phase proved
summary: "When a prior phase already proved a build or test command, that command is reused verbatim instead of a path being re-derived."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The planning context carries the commands an earlier phase already proved.
conditions_does_not_apply_when: The phase runs a different build or test story than the earlier one.
artifact_contract_output_type: reused-command
artifact_contract_required_data:
  - the command that was reused
  - the phase that proved it
artifact_contract_verified_by: "the reused command is the one the earlier phase proved, unaltered"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reuse the verification command a prior phase proved
**Inherit the command that already worked.** The planning context carries `prior_verify_commands` - the `<automated>` commands from the most recent prior phase that had any, surfaced **at every context window**, not only on 1M-class models. When this phase's build or test story is the same one a prior phase already proved, **reuse that command verbatim** rather than re-deriving a path.
