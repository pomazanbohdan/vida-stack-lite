---
instruction_id: gate-the-plan-on-the-three-facts-of-the-settled-design
title: Gate the plan on the three facts of the settled design
summary: "Report the intent gaps, the irreversible actions and the footprint, then take the light path only when all three are clean."
capability_tags:
  - plan-implementation
pattern_tags:
  - approval-policy-gate
conditions_applies_when: "The intent is settled, the shape of the change is known, and the depth of the plan is still to be decided."
conditions_does_not_apply_when: The work is not understood well enough to settle the design yet.
artifact_contract_output_type: plan-gate-decision
artifact_contract_required_data:
  - intent gaps
  - irreversible actions
  - footprint
  - the path taken
artifact_contract_verified_by: all three facts are reported and every flagged intent gap is answered before approval
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/build-a-change.md
status: active
revision: 1
---

# Gate the plan on the three facts of the settled design
It reports three facts about the settled design: intent gaps (things you did not say that you would notice in the result), irreversible actions, and footprint.
A design clean on all three takes the light path — a minimal plan and implementation in the same session, reviewed afterwards.
Anything flagged gets a full written plan first, with each intent gap recorded as an open question you answer before approval.
Approve the plan when it describes the right thing to build.
Push back if it does not — fixing the plan is cheaper than fixing the code.
