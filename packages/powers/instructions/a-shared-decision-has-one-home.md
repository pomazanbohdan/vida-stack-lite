---
instruction_id: a-shared-decision-has-one-home
title: A shared decision has one home
summary: A decision that two or more containers must adopt is recorded in one place — a spine section or an item in the opening container — and the other containers wait on it.
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: More than one container has to adopt the same decision.
conditions_does_not_apply_when: The decision touches only one container.
artifact_contract_output_type: shared-decision-placement
artifact_contract_required_data:
  - the decision
  - the one place it is recorded
  - the containers that wait on it
artifact_contract_verified_by: the decision has one home and every other container reaches it from there
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/set-up-the-ticket-tree.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/plan-inside-an-organization.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# A shared decision has one home
Every decision two or more epics must adopt has one home: a spine section, or an entry in the opening epic (the first `[[epic]]`) that the others wait on.
After the epics are agreed, the skill lists the decisions that more than one epic must adopt, such as a contract, a data format, or a shared value list.
Work in one repo or one unit needs no architecture pass.
It is needed from the second unit that must adopt a decision.
The rows are roles, not headcount. One person can hold several; what matters is that each document has exactly one owner, because each has exactly one skill that writes it.
