---
instruction_id: record-only-the-decisions-two-builders-would-conflict-on
title: Record only the decisions two builders would conflict on
summary: "Write a shared decision only when two units built independently would choose incompatibly, the call is non-obvious, and it is a real trade-off."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Several units will be built separately and must stay compatible with each other.
conditions_does_not_apply_when: The work is one unit in one repository.
artifact_contract_output_type: shared-decision-record
artifact_contract_required_data:
  - the decision
  - the independent-builder test
  - the stable id
artifact_contract_verified_by: "the test answers yes, the call is non-obvious and a real trade-off, and the decision carries a stable id"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/design-ux-and-architecture.md
status: active
revision: 1
---

# Record only the decisions two builders would conflict on
One test decides what belongs.
If two units built this independently, could they choose incompatibly?
A decision goes in the spine only when the answer is yes, the call is non-obvious, and it is a real trade-off.
Everything else is left to the code.
Each decision gets a stable ID so specs and stories can cite it.
Deciding the API style "as we go", documenting every minor choice, and a spine written once and never updated are the three ways this step fails.
