---
instruction_id: record-execution-rulings
title: Record every ruling in the ledger
summary: "Decide conflicts, ambiguities, and plan defects as they arise, and write each decision with its reason and its cost if wrong."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "Executing the plan surfaces a choice, a conflict, or a deviation."
conditions_does_not_apply_when: The plan runs with no deviation or ambiguity.
artifact_contract_output_type: execution-ruling
artifact_contract_required_data:
  - decision
  - reason
  - cost if wrong
  - plan location
artifact_contract_verified_by: every deviation has a matching ledger entry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/executing-plans/SKILL.md
status: active
revision: 2
---

# Record every ruling in the ledger
Conflicts, ambiguities, plan defects — decide them.
The spec is the binding authority, the plan is its argument, and your judgment settles what neither answers.
Record every decision in the ledger as `Ruling: <what you decided> — <why> — <what it costs if wrong>`, and keep going.
Deviating from the plan without a ledgered ruling is a decision made in secret.
Rule on each conflict a row surfaces with the spec as the binding authority, and record the ruling beside its row.
A plan with no reachable spec gets a ledger note saying so — rulings made without one are provisional.
The ruling is carried, not remembered: later tasks that touch the same interface read it from the ledger.
A wrong ruling costs rework your human partner can see and undo; a session parked on a question costs their whole day and buys nothing.
Before you delete anything, collect every ledger line containing `Ruling:` into your final message under "Rulings I made", in the order you made them, each with what it costs if wrong, and every `minor (deferred)` line under "Deferred minors".
Both lists are exhaustive.
Rulings, not stalls.
Final: Ruling: <finding> — <why the code stands> — <cost if wrong>.
A ruling is a decision about a conflict, not a note that you declined a polish suggestion.
Keep the ledger with the task it belongs to.
