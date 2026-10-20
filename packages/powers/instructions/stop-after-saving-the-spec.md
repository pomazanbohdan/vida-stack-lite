---
instruction_id: stop-after-saving-the-spec
title: Stop after saving the spec
summary: "Summarise the spec, ask for approval, and end the turn; planning starts only in a later turn after the approval."
capability_tags:
  - plan-implementation
pattern_tags:
  - specification-gate
conditions_applies_when: A spec has just been written and saved.
conditions_does_not_apply_when: The spec was already approved and the work continues in a later turn.
artifact_contract_output_type: spec-approval-request
artifact_contract_required_data:
  - the spec summary
  - the open questions
  - the approval request
artifact_contract_verified_by: the turn ended with the saved spec and no plan or code was started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/spec-driven-development/SKILL.md
status: active
revision: 1
---

# Stop after saving the spec
**Stop after writing the spec (CRITICAL).** Once the spec is saved:

1. Summarize it and list any Open Questions.
2. Ask the human to approve it or request changes.
3. **STOP YOUR TURN IMMEDIATELY.** Do NOT start the next phase or write code in this turn. Planning starts only after the human approves the spec in a later turn.

## Verification

Before proceeding to implementation, confirm:
- [ ] The spec covers all six core areas
- [ ] The human has reviewed and approved the spec
- [ ] The turn ended after saving the spec; approval came in a later turn
- [ ] Success criteria are specific and testable
- [ ] Boundaries (Always/Ask First/Never) are defined
- [ ] The spec is saved to a file in the repository

## Red Flags

- Writing the spec and starting the plan or code in the same turn
