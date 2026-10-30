---
instruction_id: hand-the-plan-to-the-implementer-as-the-only-source-of-truth
title: Hand the plan to the implementer as the only source of truth
summary: "The dispatch points at the plan and adds nothing: the goal, the files, the investigation and the acceptance criteria already live in the plan, and the implementation runs one task at a time."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "A written plan is about to be implemented, by another executor or by the same session."
conditions_does_not_apply_when: There is no plan and the work is done directly from a request.
artifact_contract_output_type: implementation-dispatch
artifact_contract_required_data:
  - the plan path
  - the dispatch text
  - the executor that took the work
artifact_contract_verified_by: the dispatch carries no plan content and the executor worked from the plan alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Hand the plan to the implementer as the only source of truth

Sequential execution only.

No push. No remote ops.

Do not add goal restatements, file lists, ownership boundaries, investigation detail, acceptance criteria, or CLAUDE.md/house-style rules to the dispatch — the plan is the subagent's sole source of truth, and that material already lives in it (investigation findings in its Code Map, the rest in the plan body).

One line of sanctioned hedging belongs in the plan at planning time, not in the dispatch.

The handoff directs the subagent to load the plan's `context:` files itself, so never pre-load and paste those files into the dispatch.

Only when you implement directly (no subagent available) do you load a non-empty `context:` list yourself before starting.

If no subagents are available, implement directly from the plan.

If the platform allows, keep the subagent available for re-engagement after it returns

Do not retell the investigation when implementation starts — the plan already has it.
