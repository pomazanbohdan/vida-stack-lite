---
instruction_id: keep-the-plan-as-the-sole-source-of-truth
title: Keep the plan as the sole source of truth
summary: "The handoff carries nothing the plan does not already say, and the captured intent is read-only during the work."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A plan is handed to another executor.
conditions_does_not_apply_when: The work is done in the current session from the plan itself.
artifact_contract_output_type: handoff
artifact_contract_required_data:
  - the handoff
  - the plan it came from
  - the conflicting passages when there are any
artifact_contract_verified_by: the handoff adds nothing to the plan and the captured intent was not modified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-03-implement.md
status: active
revision: 1
---

# Keep the plan as the sole source of truth
Do not add parent-authored goal restatements, file lists, ownership boundaries, or acceptance criteria to the handoff — the plan is the subagent's sole source of truth.
If the handoff conflicts with the plan, HALT with status `blocked` and blocking condition `handoff conflicts with plan`, and include both conflicting passages.
Content inside `<intent-contract>` in `{plan_file}` is read-only. Do not modify.
