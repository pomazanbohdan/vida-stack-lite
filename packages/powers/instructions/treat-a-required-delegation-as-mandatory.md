---
instruction_id: treat-a-required-delegation-as-mandatory
title: Treat a required delegation as mandatory
summary: "When a step says to use a subagent, that is not an option: when the capability is missing, the run stops as blocked instead of doing the work itself."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A step requires work to be handed to a subagent.
conditions_does_not_apply_when: The work is done in the current session by the step itself.
artifact_contract_output_type: delegation-block-report
artifact_contract_required_data:
  - the required delegation
  - the missing capability
  - the blocked status
artifact_contract_verified_by: the run stopped as blocked instead of doing the delegated work itself
compatibility_excludes:
  - run-the-discussion-inline-when-the-agents-are-unavailable
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
---

# Treat a required delegation as mandatory
Using subagents when instructed is mandatory. If you cannot, HALT with status `blocked` and blocking condition `no subagents`.
Never absorb these roles inline.
Role separation is required regardless of the options — those options suppress interactive prompts only; they NEVER authorize collapsing plan roles into the orchestrator context.
Only a real tool-unavailable error is a reliable absence signal
